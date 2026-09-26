"""
BeatMind Backend — FastAPI server orchestrating Claude AI + AbletonOSC bridge.
"""

import asyncio
import json
import logging
import os
import uuid
from contextlib import AsyncExitStack, asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
load_dotenv()

import anthropic
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field

from claude_tools import ABLETON_TOOLS, SYSTEM_PROMPT
from execution import BAD_STATUSES, MAX_PRODUCTION_ROUNDS, execute_verified
from ai_provider import create_client, failure_message, model_name, provider_name
from automation import AUTOMATION_TOOLS, execute_automation
from production import create_plan, get_plan, link_audition, review_part, replace_audition
from session_context import matching_recordings, context_note
from model_history import bounded_history
import references
from sections import SECTION_TOOL, get_brief, set_brief, source_error
from recordings import ROOT as RECORDINGS_ROOT, save_recording, list_recordings, owned_recording, decide_recording, attach_evidence
from database import init_db, get_user_by_email, get_user_by_id, create_user, is_subscribed, update_user_password
from beatmind_auth import hash_password, verify_password, create_token, decode_token
from stripe_routes import router as stripe_router
from security import (
    enforce_secrets, rate_limit, get_client_ip,
    validate_password, register_bridge_token, validate_bridge_token, bridge_token_owner,
    check_credential_stuffing, check_bot_ua, check_prompt_injection,
    watermark_response, DoSProtectionMiddleware,
)

logging.basicConfig(level=logging.WARNING)
log = logging.getLogger("beatmind")

TRIAL_DAYS = 7
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]


# ---- State ----

class BridgeConnection:
    def __init__(self, ws: WebSocket, session_id: str, user_id: int):
        self.ws = ws
        self.session_id = session_id
        self.user_id = user_id
        self.lock = asyncio.Lock()
        self.connected_at = datetime.now(timezone.utc)
        self.pending: dict[str, asyncio.Future] = {}

    async def send_command(self, address: str, args: list, query: bool = False, timeout: float = 5.0) -> dict:
        request_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self.pending[request_id] = future
        try:
            await self.ws.send_json({
                "type": "osc_query" if query else "osc_send",
                "request_id": request_id,
                "address": address,
                "args": args,
                "timeout": timeout,
            })
            return await asyncio.wait_for(future, timeout=timeout + 2)
        except asyncio.TimeoutError:
            return {"status": "timeout", "address": address}
        finally:
            self.pending.pop(request_id, None)

    async def send_batch(self, commands: list[dict]) -> list[dict]:
        request_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self.pending[request_id] = future
        await self.ws.send_json({"type": "batch", "request_id": request_id, "commands": commands})
        try:
            result = await asyncio.wait_for(future, timeout=30)
            return result.get("results", [])
        except asyncio.TimeoutError:
            self.pending.pop(request_id, None)
            return [{"status": "timeout"}]

    async def capture_part(self, track, scene, seconds):
        return await self.local_operation("capture_part", {"track": track, "scene": scene, "seconds": seconds})

    async def local_operation(self, operation, payload):
        request_id = str(uuid.uuid4())
        future = asyncio.get_running_loop().create_future()
        self.pending[request_id] = future
        try:
            await self.ws.send_json({"type": operation, "request_id": request_id, **payload})
            try:
                return await asyncio.wait_for(asyncio.shield(future), timeout=55)
            except asyncio.CancelledError:
                # Keep the session locked until the bridge has restored playback state.
                with suppress(asyncio.TimeoutError):
                    await asyncio.wait_for(asyncio.shield(future), timeout=55)
                raise
        except asyncio.TimeoutError:
            return {"status": "unverified", "summary": "Local bridge operation timed out. Inspect Ableton before continuing."}
        finally:
            self.pending.pop(request_id, None)

    def handle_response(self, data: dict):
        rid = data.get("request_id")
        if rid and rid in self.pending:
            f = self.pending.pop(rid)
            if not f.done():
                f.set_result(data)


class ChatSession:
    def __init__(self, session_id: str, user_id: int):
        self.session_id = session_id
        self.user_id = user_id
        self.lock = asyncio.Lock()
        self.messages: list[dict] = []
        self.bridge: BridgeConnection | None = None


sessions: dict[str, ChatSession] = {}
bridges: dict[str, BridgeConnection] = {}
claude_client: anthropic.AsyncAnthropic | anthropic.AsyncAnthropicBedrock | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global claude_client
    # Crash early if secrets missing (skip in dev when JWT_SECRET not set)
    if os.getenv("ENV", "development") == "production":
        enforce_secrets()
    init_db()
    references.recover_interrupted()
    claude_client = create_client()
    if not claude_client:
        log.warning("AI provider is not configured")
    log.info("BeatMind backend started. Allowed origins: %s", ALLOWED_ORIGINS)
    yield
    await references.shutdown()
    if claude_client:
        await claude_client.close()


app = FastAPI(title="BeatMind", lifespan=lifespan, docs_url=None, redoc_url=None)
app.include_router(stripe_router)

# DoS middleware must be added FIRST (outermost layer)
app.add_middleware(DoSProtectionMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Reference-Name", "X-Rights-Confirmed"],
)


# ---- Auth helpers ----

def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    token = authorization[7:]
    try:
        payload = decode_token(token)
        user = get_user_by_id(int(payload["sub"]))
        if not user:
            raise HTTPException(401, "Unauthorized")
        return user
    except JWTError:
        raise HTTPException(401, "Unauthorized")
    except (ValueError, KeyError):
        raise HTTPException(401, "Unauthorized")


def require_subscription(user: dict = Depends(get_current_user)) -> dict:
    if not is_subscribed(user):
        raise HTTPException(402, "Subscription required")
    return user


# ---- Auth endpoints ----

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/api/auth/register")
async def register(req: RegisterRequest, request: Request):
    check_bot_ua(request)
    rate_limit(f"register:{get_client_ip(request)}", max_requests=5, window_seconds=3600)
    validate_password(req.password)

    if get_user_by_email(req.email):
        raise HTTPException(409, "Email already registered")

    trial_ends = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()
    user = create_user(
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        trial_ends_at=trial_ends,
    )
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "subscription_status": user["subscription_status"],
            "trial_ends_at": user["trial_ends_at"],
            "subscribed": is_subscribed(user),
        },
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    ip = get_client_ip(request)
    check_bot_ua(request)
    rate_limit(f"login:{ip}", max_requests=10, window_seconds=900)
    check_credential_stuffing(ip, req.email)

    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "subscription_status": user["subscription_status"],
            "trial_ends_at": user["trial_ends_at"],
            "subscribed": is_subscribed(user),
        },
    }


@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "subscription_status": user["subscription_status"],
        "trial_ends_at": user["trial_ends_at"],
        "subscribed": is_subscribed(user),
    }


@app.get("/api/auth/verify")
async def verify_token(user: dict = Depends(get_current_user)):
    """
    Verify JWT and return user's active subscriptions.
    Used by MixMind desktop app on launch.

    Response 200: {"user_id": "...", "email": "...", "subscriptions": ["beatmind"]}
    Response 401: invalid or expired token
    """
    subscriptions = []
    if is_subscribed(user):
        subscriptions.append("beatmind")

    return {
        "user_id": str(user["id"]),
        "email": user["email"],
        "subscriptions": subscriptions,
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _create_reset_token(user_id: int, email: str) -> str:
    from jose import jwt as jose_jwt
    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    secret = os.getenv("JWT_SECRET", "")
    return jose_jwt.encode(payload, secret, algorithm="HS256")


def _send_reset_email(to_email: str, reset_url: str) -> None:
    import smtplib
    from html import escape
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_user = os.getenv("SMTP_USER", "support@beatmind.io")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    safe_url = escape(reset_url, quote=True)
    plain = (
        "Reset your BeatMind password\n\n"
        "Open the following link in your browser to set a new password. "
        "This link expires in 30 minutes.\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px;">
        <div style="font-size:20px;font-weight:900;margin-bottom:24px;">
            <span style="background:#7c3aed;color:#fff;padding:4px 10px;border-radius:6px;margin-right:8px;">B</span>
            beatmind
        </div>
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p style="color:#aaa;margin:0 0 24px;">Click the button below to set a new password. This link expires in 30 minutes.</p>
        <a href="{safe_url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password →</a>
        <p style="color:#ccc;font-size:14px;margin-top:24px;">If the button does not work, copy this entire link into your browser:</p>
        <p style="overflow-wrap:anywhere;word-break:break-all;font-size:13px;"><a href="{safe_url}" style="color:#a5b4fc;">{safe_url}</a></p>
        <p style="color:#555;font-size:12px;margin-top:32px;">If you didn't request this, you can ignore this email.</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your BeatMind password"
    msg["From"] = f"BeatMind <{smtp_user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    provider = os.getenv("BEATMIND_EMAIL_PROVIDER", "smtp")
    if provider == "ses":
        import boto3
        result = boto3.client("ses", region_name=os.getenv("AWS_REGION", "us-east-1")).send_raw_email(
            Source=smtp_user, Destinations=[to_email], RawMessage={"Data": msg.as_bytes()})
        log.warning("Password-reset email accepted by SES: %s", result["MessageId"])
        return
    if provider != "smtp":
        raise RuntimeError("Unsupported email provider")
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())


@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    ip = get_client_ip(request)
    rate_limit(f"{ip}:forgot_password", max_requests=5, window_seconds=3600)
    user = get_user_by_email(req.email)
    # Always return 200 to prevent email enumeration
    if user:
        token = _create_reset_token(user["id"], user["email"])
        frontend_url = os.getenv("FRONTEND_URL", "https://www.beatmind.io")
        reset_url = f"{frontend_url}/reset-password?token={token}"
        try:
            await asyncio.to_thread(_send_reset_email, user["email"], reset_url)
        except Exception as e:
            log.error(f"Failed to send reset email: {e}")
    return {"message": "If that email exists, a reset link has been sent."}


@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    from jose import jwt as jose_jwt, JWTError as JoseJWTError
    try:
        secret = os.getenv("JWT_SECRET", "")
        payload = jose_jwt.decode(req.token, secret, algorithms=["HS256"])
    except JoseJWTError:
        raise HTTPException(400, "Reset link is invalid or has expired.")
    if payload.get("purpose") != "password_reset":
        raise HTTPException(400, "Invalid reset token.")
    validate_password(req.new_password)
    user_id = int(payload["sub"])
    update_user_password(user_id, hash_password(req.new_password))
    return {"message": "Password updated. You can now sign in."}


@app.post("/api/auth/bridge-token")
async def get_bridge_token(user: dict = Depends(require_subscription)):
    """Generate a short-lived token for the local bridge agent."""
    token = str(uuid.uuid4())
    register_bridge_token(token, user["id"])
    return {"bridge_token": token}


@app.get("/api/bridge/install-script")
async def bridge_install_script(token: str):
    """Serve a self-contained Python install script that downloads bridge.py and runs it."""
    from starlette.responses import Response

    ws_url = os.getenv("WS_URL", "ws://localhost:8000/ws/bridge")
    server_url = os.getenv("SERVER_URL", "http://localhost:8000")

    script = f'''#!/usr/bin/env python3
"""BeatMind Bridge — one-command installer. Downloads, installs deps, and connects."""
import subprocess, sys, os, urllib.request, tempfile

print()
print("  BeatMind Bridge Setup")
print("  " + "=" * 30)
print()

# Install websockets
print("  Installing dependencies...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "websockets"],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("  Done.")
print()

# Download bridge.py
bridge_dir = os.path.join(os.path.expanduser("~"), ".beatmind")
os.makedirs(bridge_dir, exist_ok=True)
bridge_path = os.path.join(bridge_dir, "bridge.py")

print("  Downloading bridge agent...")
urllib.request.urlretrieve("{server_url}/bridge.py", bridge_path)
print("  Saved to: " + bridge_path)
print()
print("  Connecting to Ableton Live...")
print("  Make sure Ableton Live is open!")
print("  Press Ctrl+C to disconnect.")
print("  " + "-" * 30)
print()

# Run bridge
os.execl(sys.executable, sys.executable, bridge_path, "--server", "{ws_url}", "--token", "{token}")
'''
    return Response(content=script, media_type="text/plain")


# ---- Chat endpoint ----

class LiveSetRequest(BaseModel):
    operation: str = Field(pattern="^(activate|save|new|inspect)$")


@app.post("/api/live-set")
async def live_set_action(req: LiveSetRequest, user: dict = Depends(require_subscription)):
    rate_limit(f"live-set:{user['id']}", max_requests=20, window_seconds=60)
    owned = [bridge for bridge in bridges.values() if bridge.user_id == user["id"]]
    if len(owned) != 1:
        raise HTTPException(409, "Connect exactly one Ableton bridge before setting up a new song.")
    bridge = owned[0]
    if bridge.lock.locked():
        raise HTTPException(409, "Finish or stop the current production request first.")
    async with bridge.lock:
        return await bridge.local_operation("live_set", {"operation": req.operation})

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    session_id: str | None = None
    reference_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")


def prepare_chat(req: ChatRequest, user: dict):
    if not claude_client:
        raise HTTPException(500, "Claude API not configured")

    # Rate limit: 30 messages per user per minute
    rate_limit(f"chat:{user['id']}", max_requests=30, window_seconds=60)

    # Block prompt injection attempts
    check_prompt_injection(req.message)

    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = ChatSession(session_id, user["id"])
    session = sessions[session_id]
    if session.user_id != user["id"]:
        raise HTTPException(404, "Session not found")
    owned = [b for b in bridges.values() if b.user_id == user["id"]]
    if len(owned) > 1:
        raise HTTPException(409, "Multiple bridges connected. Keep only the bridge for the Ableton session you intend to edit.")
    bridge = owned[0] if owned else None
    if session.lock.locked() or (bridge and bridge.lock.locked()):
        raise HTTPException(409, "A production request is already running for this Ableton session.")
    session.bridge = bridge
    reference_id = req.reference_id if 'reference_id' in req.model_fields_set else getattr(session, 'reference_id', None)
    reference_note = references.reference_context(reference_id, user['id']) if reference_id else ''
    session.reference_id = reference_id
    session.reference_note = reference_note
    return session, bridge


async def produce_chat(req, session, bridge, emit=None):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(session.lock)
        session.pending_review = False
        session.current_track_names = []
        session.current_recordings = []
        if bridge:
            await stack.enter_async_context(bridge.lock)
            state = await bridge.send_command("/live/song/get/track_names", [], True)
            if state.get("status") != "ok" or not isinstance(state.get("args"), list):
                raise HTTPException(409, "Unable to inspect the current Live Set. Reconnect the bridge before continuing.")
            session.current_track_names = state["args"]
            session.current_recordings = matching_recordings(list_recordings(session.user_id), state["args"])
            session.pending_review = any(item["decision"] == "pending" for item in session.current_recordings)
        session.messages.append({"role": "user", "content": req.message})
        if emit:
            await emit({"type": "session", "session_id": session.session_id, "bridge_connected": bridge is not None})
        response_text, tool_calls_log = await _run_claude_loop(session, bridge, emit)
        session.messages.append({"role": "assistant", "content": response_text})
        return {"session_id": session.session_id, "response": response_text,
                "tool_calls": tool_calls_log, "bridge_connected": bridge is not None}


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request, user: dict = Depends(require_subscription)):
    session, bridge = prepare_chat(req, user)
    try:
        return await produce_chat(req, session, bridge)
    except anthropic.APIError:
        raise HTTPException(502, "AI service unavailable. Some actions may already have run; inspect Ableton before retrying.")


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, user: dict = Depends(require_subscription)):
    session, bridge = prepare_chat(req, user)

    async def events():
        queue = asyncio.Queue()
        actions_started = False

        async def emit(event):
            nonlocal actions_started
            if event["type"] == "action_started":
                actions_started = True
            await queue.put(event)

        async def produce():
            try:
                result = await produce_chat(req, session, bridge, emit)
                await queue.put({"type": "complete", **result})
            except HTTPException as error:
                await queue.put({"type": "error", "message": error.detail})
            except Exception as error:
                log.exception("Production stream interrupted")
                await queue.put({"type": "error", "message": failure_message(error, actions_started)})

        task = asyncio.create_task(produce())
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    event = {"type": "heartbeat"}
                yield json.dumps(event) + "\n"
                if event["type"] in {"complete", "error"}:
                    break
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


MODEL = model_name()


def _build_system(bridge_note: str) -> list[dict]:
    return [{"type": "text", "text": SYSTEM_PROMPT + bridge_note, "cache_control": {"type": "ephemeral"}}]


def _build_tools() -> list[dict]:
    tools = [dict(t) for t in ABLETON_TOOLS] + [dict(SECTION_TOOL)]
    tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


async def _run_claude_loop(session: ChatSession, bridge: BridgeConnection | None, emit=None) -> tuple[str, list]:
    tool_calls_log = []
    pack_scoped = False
    track_creation_attempted = False
    section_brief = None
    messages = session.messages
    bridge_note = "" if bridge else "\n\nNOTE: No Ableton bridge connected. Describe what you would do but cannot execute."
    bridge_note += getattr(session, 'reference_note', '')
    if bridge:
        previous_section = get_brief(session.user_id, session.session_id)
        if previous_section:
            bridge_note += "\nPrevious requested section brief (historical intent, not evidence of completed music): " + json.dumps(previous_section) + ". For a section continuation or same-pack request, inspect current scenes and call set_section_brief to confirm the source for this request."
        bridge_note += context_note(getattr(session, "current_track_names", []),
                                    getattr(session, "current_recordings", []),
                                    get_plan(session.user_id, session.session_id))
    if getattr(session, "pending_review", False):
        bridge_note += "\nSome historical previews are pending review. Their decisions are informational, not a lock on this request. Follow the user's explicit edit or continuation request without requiring approval of another sound. Never mark a preview accepted on their behalf. Inspect current devices and clips; do not treat a prior recording as unchanged current audio."

    for _ in range(MAX_PRODUCTION_ROUNDS):
        response = await claude_client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=_build_system(bridge_note),
            tools=_build_tools(),
            messages=bounded_history(messages),
        )

        text_parts = []
        tool_uses = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_uses.append(block)

        if response.stop_reason == "end_turn" or not tool_uses:
            return "\n".join(text_parts), tool_calls_log

        messages.append({"role": "assistant", "content": response.content})
        if emit and text_parts:
            await emit({"type": "narration", "text": "\n".join(text_parts)})

        tool_results = []
        blocked = False
        audition_ready = False
        try:
            for tu in tool_uses:
                pack_scoped = pack_scoped or tu.name in {"search_pack_samples", "inspect_pack_sample", "load_pack_sample"}
                action = {"id": tu.id, "tool": tu.name, "input": tu.input}
                if emit:
                    await emit({"type": "action_started", "action": action})
                constraint = source_error(section_brief, tu.name, tu.input)
                if tu.name == "set_section_brief" and not blocked and not audition_ready:
                    result = await set_brief(session.user_id, session.session_id, tu.input, bridge)
                    if result.get("status") == "observed":
                        section_brief = result["section_brief"]
                elif constraint:
                    result = {"status": "failed", "summary": constraint, "steps": []}
                elif tu.name == "create_production_plan" and not blocked and not audition_ready:
                    result = create_plan(session.user_id, session.session_id, tu.input)
                elif tu.name in {"create_midi_track", "create_audio_track"} and not get_plan(session.user_id, session.session_id):
                    result = {"status": "failed", "summary": "Save a production brief with create_production_plan before creating music.", "steps": []}
                elif tu.name in {"create_midi_track", "create_audio_track"} and track_creation_attempted:
                    result = {"status": "failed", "summary": "One part at a time: verify and audition the current part before creating another track.", "steps": []}
                elif pack_scoped and (tu.name in {"load_sample", "load_instrument"} or (tu.name == "load_library_item" and tu.input.get("kind") == "instrument")):
                    result = {"status": "failed", "summary": "A pack-scoped source was selected. Global filename or synth fallback is disabled; use load_pack_sample.", "steps": []}
                else:
                    result = ({"status": "failed", "summary": "Skipped after an earlier failure or while awaiting audition review.", "steps": []}
                              if blocked or audition_ready else await _execute_tool(tu.name, tu.input, bridge))
                    if tu.name in {"create_midi_track", "create_audio_track"} and not blocked and not audition_ready:
                        track_creation_attempted = True
                blocked = blocked or result.get("status") in {"failed", "partial"}
                audition_ready = audition_ready or bool(result.get("recording"))
                action["result"] = result
                tool_calls_log.append(action)
                if result.get("recording"):
                    link_audition(session.user_id, session.session_id, result["recording"])
                    result["recording"] = attach_evidence(result["recording"]["id"], session.user_id, tool_calls_log)
                tool_results.append({"type": "tool_result", "tool_use_id": tu.id,
                                     "content": json.dumps(result), "is_error": result.get("status") in BAD_STATUSES})
                if emit:
                    await emit({"type": "action_completed", "action": action})
        finally:
            # Preserve a valid conversation even when a stream is cancelled mid-write.
            for tu in tool_uses[len(tool_results):]:
                tool_results.append({"type": "tool_result", "tool_use_id": tu.id, "is_error": True,
                                     "content": "Execution interrupted; state may have changed. Inspect Ableton before making further changes."})
            messages.append({"role": "user", "content": tool_results})

        if audition_ready:
            return "Your actual Ableton recording is ready below. Listen and accept it, or request changes before building the next part.", tool_calls_log
        if any(action["tool"] == "audition_part" for action in tool_calls_log):
            return "The part remains in Ableton, but its audition did not pass verification. No recording is ready for approval. Review the audition details before retrying; do not recreate the track or notes.", tool_calls_log

    return "Production paused at the action limit. Some requested work may remain; review the action log before continuing.", tool_calls_log


async def _execute_tool(tool_name: str, tool_input: dict, bridge: BridgeConnection | None) -> dict:
    if not bridge:
        return {"status": "failed", "error": "No Ableton bridge connected.", "summary": "No Ableton bridge connected.", "steps": []}
    if tool_name in {item["name"] for item in AUTOMATION_TOOLS}:
        return await execute_automation(tool_name, tool_input, bridge.send_command)
    if tool_name in {"audition_part", "list_sample_packs", "search_pack_samples", "inspect_pack_sample", "load_pack_sample"}:
        from jsonschema import validate, ValidationError
        try:
            schema = next(t["input_schema"] for t in ABLETON_TOOLS if t["name"] == tool_name)
            validate(tool_input, schema)
        except ValidationError as error:
            return {"status": "failed", "summary": error.message, "steps": []}
        if tool_name != "audition_part":
            return await bridge.local_operation("sample_library", {"operation": tool_name, "data": tool_input})
        result = await bridge.capture_part(tool_input["track"], tool_input["scene"], tool_input.get("seconds", 12))
        return save_recording(bridge.user_id, result)
    return await execute_verified(tool_name, tool_input, bridge.send_command)


@app.get("/api/recordings")
async def recordings_list(user: dict = Depends(get_current_user)):
    return {"recordings": list_recordings(user["id"])}


@app.get("/api/recordings/{recording_id}/audio")
async def recording_audio(recording_id: str, user: dict = Depends(get_current_user)):
    if not owned_recording(recording_id, user["id"]):
        raise HTTPException(404, "Recording not found")
    return FileResponse(RECORDINGS_ROOT / f"{recording_id}.m4a", media_type="audio/mp4",
                        headers={"Cache-Control": "private, no-store"})


@app.get("/api/recordings/{recording_id}")
async def recording_details(recording_id: str, user: dict = Depends(get_current_user)):
    item = owned_recording(recording_id, user["id"])
    if item is None:
        raise HTTPException(404, "Recording not found")
    return item


class RecordingDecision(BaseModel):
    decision: str = Field(pattern="^(accepted|revise)$")


class MixerRequest(BaseModel):
    operation: str = Field(pattern="^(inspect|record)$")
    map_id: str | None = Field(default=None, pattern="^[a-f0-9]{64}$")
    expected_value: float | None = Field(default=None, ge=0, le=1, allow_inf_nan=False)
    value: float | None = Field(default=None, ge=0, le=1, allow_inf_nan=False)


@app.post("/api/recordings/{recording_id}/mixer")
async def recording_mixer(recording_id: str, req: MixerRequest, user: dict = Depends(require_subscription)):
    item = owned_recording(recording_id, user["id"])
    if item is None:
        raise HTTPException(404, "Recording not found")
    source = item.get("sample_source", {})
    if not source.get("sha256"):
        raise HTTPException(409, "This recording has no exact sample identity. Inspect it through chat before changing its level.")
    if req.operation == "record" and any(value is None for value in (req.map_id, req.expected_value, req.value)):
        raise HTTPException(422, "Refresh the fader map before applying a value.")
    owned = [bridge for bridge in bridges.values() if bridge.user_id == user["id"]]
    if len(owned) != 1 or owned[0].lock.locked():
        raise HTTPException(409, "Connect one bridge and wait for the current production request to finish.")
    rate_limit(f"mixer:{user['id']}", max_requests=30, window_seconds=60)
    bridge = owned[0]
    async with bridge.lock:
        result = await bridge.local_operation("mixer_preview", {"operation": req.operation, "data": {
            "track": item["track"], "track_name": item["track_name"], "scene": item["scene"], "sha256": source["sha256"],
            "map_id": req.map_id, "expected_value": req.expected_value, "value": req.value}})
        if req.operation == "record" and result.get("status") == "verified":
            result = save_recording(user["id"], result)
            recording = result["recording"]
            recording.update(sample_source=source, supersedes=recording_id, mixer=result["mixer"])
            (RECORDINGS_ROOT / f"{recording['id']}.json").write_text(json.dumps(recording))
            actions = [{"id": str(uuid.uuid4()), "tool": "set_track_volume", "input": {"track": item["track"], "volume": req.value},
                        "result": {"status": "verified", "summary": "Live fader readback: " + result["mixer"]["display"]}},
                       {"id": str(uuid.uuid4()), "tool": "audition_part", "input": {"track": item["track"], "scene": item["scene"], "seconds": 8},
                        "result": {"status": "verified", "summary": "Fresh level audition recorded; exact sample SHA-256 verified.", "recording": recording}}]
            recording = attach_evidence(recording["id"], user["id"], actions)
            replace_audition(user["id"], recording_id, recording["id"])
            if item["decision"] == "pending":
                decide_recording(recording_id, user["id"], "revise")
            return {"status": "verified", "recording": recording, "tool_calls": actions}
        return result


@app.post("/api/recordings/{recording_id}/decision")
async def recording_decision(recording_id: str, req: RecordingDecision, user: dict = Depends(get_current_user)):
    item = decide_recording(recording_id, user["id"], req.decision)
    if item is None:
        raise HTTPException(404, "Recording not found")
    item["continuation"] = review_part(user["id"], recording_id, req.decision)
    return item


# ---- WebSocket: Bridge (requires auth token) ----

@app.websocket("/ws/bridge")
async def bridge_ws(ws: WebSocket):
    token = ws.query_params.get("token", "")
    if not validate_bridge_token(token):
        await ws.close(code=4001)
        return

    await ws.accept()
    session_id = str(uuid.uuid4())[:8]
    bridge = BridgeConnection(ws, session_id, bridge_token_owner(token))
    bridges[session_id] = bridge
    log.info("Bridge connected: %s", session_id)

    try:
        async for message in ws.iter_text():
            data = json.loads(message)
            if data.get("type") != "bridge_hello":
                bridge.handle_response(data)
    except WebSocketDisconnect:
        pass
    finally:
        bridges.pop(session_id, None)
        for future in bridge.pending.values():
            if not future.done():
                future.set_result({"status": "disconnected"})
        bridge.pending.clear()
        log.info("Bridge disconnected: %s", session_id)


@app.get("/api/bridge/status")
async def bridge_status(user: dict = Depends(get_current_user)):
    return {"bridge_connected": any(b.user_id == user["id"] for b in bridges.values())}


app.include_router(references.router_for(get_current_user, require_subscription))

# ---- Health ----

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "bridges_connected": len(bridges),
        "active_sessions": len(sessions),
        "claude_configured": claude_client is not None,
        "ai_provider": provider_name(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
