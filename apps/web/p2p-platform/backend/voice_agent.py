"""
Twilio Media Streams <-> OpenAI Realtime API bridge for Dollor.ai voice support.

This module provides:
- /api/voice/incoming-call: Twilio webhook that returns TwiML with a WebSocket Stream directive
- /api/voice/media-stream: WebSocket endpoint bridging Twilio audio to OpenAI Realtime API
- /api/support/chat: Text chat endpoint for Live Chat (uses OpenAI Chat Completions)

The voice agent can look up orders, rides, and account information, and log escalation
requests for human follow-up.
"""

import os
import json
import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

import websockets

from database import get_db
from models import Customer, Driver, Vendor
from voice_agent_tools import execute_tool, TOOL_DEFINITIONS

logger = logging.getLogger(__name__)

# ===================== CONFIGURATION =====================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
VOICE = "sage"  # Calm, professional support tone
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime"
MAX_CALL_DURATION_MINUTES = 10  # 5 min buffer before 15-min API limit

# ===================== SYSTEM PROMPT =====================

SUPPORT_AGENT_SYSTEM_PROMPT = """You are Dollor AI Support, an AI assistant for Dollor.ai -- a matchmaking platform connecting customers with drivers for food delivery and rideshare services.

IDENTITY:
- You are an AI assistant, not a human. Be upfront about this if asked.
- You represent Dollor.ai's support team.

CAPABILITIES:
- Look up food delivery orders by order ID or phone number
- Look up rideshare rides by ride ID or phone number
- Check account status for customers, drivers, and restaurant owners
- Log escalation requests for issues that require human follow-up

LIMITATIONS:
- You CANNOT process refunds directly. Log an escalation request and promise follow-up within 24 hours.
- You CANNOT modify orders or rides.
- You CANNOT reset passwords -- direct the caller to the app's "Forgot Password" feature.

TONE:
- Patient, professional, and empathetic.
- Handle frustrated callers calmly. Acknowledge their frustration before solving the problem.
- Keep responses concise -- this is a phone call, not an essay.

ROUTING:
- The caller's phone number will be matched to their account. Use it to identify their role (customer, driver, or restaurant owner).
- If the phone number matches multiple roles, ask the caller which account they need help with.

BUSINESS CONTEXT:
- Food delivery: Customers pay a $1 service fee. Drivers keep 100% of delivery fees and tips. Restaurants pay $1 per order.
- Rideshare: Fare-tiered platform fee. Fares up to $35: $1 fee. $35-$70: $2 fee. Over $70: $3 fee. Drivers keep the rest plus 100% of tips.
- We are a MATCHMAKING SERVICE -- we connect customers with independent drivers. We are not a delivery company or transportation network company.

TIME AWARENESS:
- Keep conversations focused and efficient.
- After 8 minutes, politely suggest the caller email support@dollor.ai for complex issues that need more time.
- For simple lookups, aim to resolve within 2-3 minutes.

GREETING:
- Start with: "Hi, this is Dollor AI Support. How can I help you today?"
- If caller context is available, personalize: "Hi [Name], this is Dollor AI Support. How can I help you today?"
"""

router = APIRouter(tags=["Voice Agent"])


# ===================== INCOMING CALL WEBHOOK =====================

@router.api_route("/api/voice/incoming-call", methods=["GET", "POST"])
async def handle_incoming_call(request: Request):
    """Twilio webhook: returns TwiML XML with Stream directive for WebSocket audio."""
    from twilio.twiml.voice_response import VoiceResponse, Connect

    response = VoiceResponse()
    response.say("This call may be recorded for quality purposes.")
    response.pause(length=1)

    host = request.url.hostname
    caller_phone = request.query_params.get("From", "")
    if not caller_phone:
        # Twilio POSTs form data for voice webhooks
        form_data = await request.form()
        caller_phone = form_data.get("From", "")

    connect = Connect()
    stream_url = f"wss://{host}/api/voice/media-stream?caller={caller_phone}"
    connect.stream(url=stream_url)
    response.append(connect)

    return HTMLResponse(content=str(response), media_type="application/xml")


# ===================== MEDIA STREAM WEBSOCKET =====================

@router.websocket("/api/voice/media-stream")
async def handle_media_stream(websocket: WebSocket):
    """Bridge Twilio Media Stream <-> OpenAI Realtime API."""
    await websocket.accept()

    caller_phone = websocket.query_params.get("caller", "")
    logger.info("Voice call started from %s", caller_phone)

    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not set -- cannot connect to Realtime API")
        await websocket.close(code=1011, reason="Server configuration error")
        return

    openai_ws = None
    try:
        openai_ws = await websockets.connect(
            OPENAI_REALTIME_URL,
            additional_headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1",
            },
        )

        # Get a DB session for caller lookup and tool calls
        db_gen = get_db()
        db = next(db_gen)

        try:
            await _initialize_session(openai_ws, caller_phone, db)

            stream_sid = None

            async def receive_from_twilio():
                """Forward Twilio audio to OpenAI Realtime API."""
                nonlocal stream_sid
                try:
                    async for message in websocket.iter_text():
                        data = json.loads(message)
                        event = data.get("event")

                        if event == "media":
                            audio_payload = data["media"]["payload"]
                            await openai_ws.send(json.dumps({
                                "type": "input_audio_buffer.append",
                                "audio": audio_payload,
                            }))
                        elif event == "start":
                            stream_sid = data["start"]["streamSid"]
                            logger.info("Twilio stream started: %s", stream_sid)
                        elif event == "stop":
                            logger.info("Twilio stream stopped")
                except WebSocketDisconnect:
                    logger.info("Twilio WebSocket disconnected")
                except Exception as e:
                    logger.error("Error receiving from Twilio: %s", e)

            async def send_to_twilio():
                """Forward OpenAI audio back to Twilio, handle tool calls."""
                nonlocal stream_sid
                try:
                    async for openai_message in openai_ws:
                        resp = json.loads(openai_message)
                        resp_type = resp.get("type", "")

                        if resp_type == "response.audio.delta":
                            # Forward audio to Twilio
                            if stream_sid:
                                await websocket.send_json({
                                    "event": "media",
                                    "streamSid": stream_sid,
                                    "media": {"payload": resp["delta"]},
                                })

                        elif resp_type == "response.function_call_arguments.done":
                            # Execute tool call and send result back to OpenAI
                            tool_name = resp.get("name", "")
                            call_id = resp.get("call_id", "")
                            try:
                                arguments = json.loads(resp.get("arguments", "{}"))
                            except json.JSONDecodeError:
                                arguments = {}

                            logger.info("Tool call: %s(%s)", tool_name, arguments)
                            result = execute_tool(tool_name, arguments, db)

                            # Send tool result back to OpenAI
                            await openai_ws.send(json.dumps({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": call_id,
                                    "output": result,
                                },
                            }))
                            # Trigger a new response after tool result
                            await openai_ws.send(json.dumps({
                                "type": "response.create",
                            }))

                        elif resp_type == "error":
                            logger.error("OpenAI error: %s", resp.get("error", {}))

                        elif resp_type in ("session.created", "session.updated"):
                            logger.info("OpenAI session event: %s", resp_type)

                except websockets.exceptions.ConnectionClosed:
                    logger.info("OpenAI WebSocket closed")
                except Exception as e:
                    logger.error("Error in send_to_twilio: %s", e)

            await asyncio.gather(receive_from_twilio(), send_to_twilio())

        finally:
            # Clean up DB session
            try:
                next(db_gen, None)
            except StopIteration:
                pass

    except Exception as e:
        logger.error("Voice media stream error: %s", e)
    finally:
        if openai_ws and not openai_ws.closed:
            await openai_ws.close()
        logger.info("Voice call ended for %s", caller_phone)


# ===================== SESSION INITIALIZATION =====================

async def _initialize_session(openai_ws, caller_phone: str, db: Session):
    """Configure OpenAI Realtime session with tools, system prompt, and caller context."""
    # Look up caller by phone number
    caller_context = _lookup_caller(caller_phone, db)

    # Build personalized system prompt
    system_prompt = SUPPORT_AGENT_SYSTEM_PROMPT
    if caller_context:
        system_prompt += f"\n\nCALLER CONTEXT:\n{caller_context}"
    else:
        system_prompt += f"\n\nCALLER CONTEXT:\nThe caller's phone number is {caller_phone}. No matching account was found -- they may be a new user or calling from an unregistered number."

    session_update = {
        "type": "session.update",
        "session": {
            "instructions": system_prompt,
            "voice": VOICE,
            "input_audio_format": "pcmu",
            "output_audio_format": "pcmu",
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {"type": "server_vad"},
            "tools": TOOL_DEFINITIONS,
            "tool_choice": "auto",
        },
    }
    await openai_ws.send(json.dumps(session_update))
    logger.info("OpenAI session initialized for caller %s", caller_phone)


def _lookup_caller(phone: str, db: Session) -> str:
    """Look up caller by phone number across all user tables."""
    if not phone:
        return ""

    # Normalize phone for matching (strip common prefixes)
    normalized = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    parts = []

    # Check customers
    customer = db.query(Customer).filter(
        (Customer.phone == phone) | (Customer.phone == normalized)
    ).first()
    if customer:
        name = f"{customer.first_name or ''} {customer.last_name or ''}".strip() or "Unknown"
        parts.append(f"- Customer account: {name} (email: {customer.email}, active: {customer.is_active})")

    # Check drivers
    driver = db.query(Driver).filter(
        (Driver.phone == phone) | (Driver.phone == normalized)
    ).first()
    if driver:
        name = f"{driver.first_name} {driver.last_name}".strip()
        parts.append(f"- Driver account: {name} (email: {driver.email}, status: {driver.status.value if driver.status else 'unknown'})")

    # Check vendors (contact_phone)
    vendor = db.query(Vendor).filter(
        (Vendor.contact_phone == phone) | (Vendor.contact_phone == normalized)
    ).first()
    if vendor:
        name = vendor.restaurant_name or vendor.company_name or "Unknown Restaurant"
        parts.append(f"- Restaurant account: {name} (contact: {vendor.contact_name}, status: {vendor.onboarding_status.value if vendor.onboarding_status else 'unknown'})")

    if parts:
        return f"The caller ({phone}) has the following accounts:\n" + "\n".join(parts)
    return ""


# ===================== TEXT CHAT ENDPOINT =====================

@router.post("/api/support/chat", tags=["Support"])
async def support_text_chat(request: Request, db: Session = Depends(get_db)):
    """AI text chat endpoint for Live Chat feature. Uses OpenAI Chat Completions (not Realtime)."""
    import httpx

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"detail": "Invalid JSON body"})

    message = body.get("message", "").strip()
    phone = body.get("phone", "")

    if not message:
        return JSONResponse(status_code=400, content={"detail": "Message is required"})

    if not OPENAI_API_KEY:
        return JSONResponse(
            status_code=503,
            content={"detail": "AI support is temporarily unavailable"},
        )

    # Build system prompt with caller context
    system_prompt = SUPPORT_AGENT_SYSTEM_PROMPT
    if phone:
        caller_context = _lookup_caller(phone, db)
        if caller_context:
            system_prompt += f"\n\nUSER CONTEXT:\n{caller_context}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message},
                    ],
                    "max_tokens": 500,
                },
            )

        if response.status_code != 200:
            logger.error("OpenAI Chat API error: %s %s", response.status_code, response.text)
            return JSONResponse(
                status_code=503,
                content={"detail": "AI support is temporarily unavailable"},
            )

        data = response.json()
        ai_reply = data["choices"][0]["message"]["content"]

        return {"success": True, "response": ai_reply}

    except httpx.TimeoutException:
        logger.error("OpenAI Chat API timeout")
        return JSONResponse(
            status_code=503,
            content={"detail": "AI support is temporarily unavailable. Please try again."},
        )
    except Exception as e:
        logger.error("Text chat error: %s", e)
        return JSONResponse(
            status_code=500,
            content={"detail": "An error occurred. Please try again."},
        )
