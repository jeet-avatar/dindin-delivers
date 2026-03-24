"""
BeatMind Backend — FastAPI server orchestrating Claude AI + AbletonOSC bridge.
"""

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
load_dotenv()

import anthropic
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError
from pydantic import BaseModel, EmailStr

from claude_tools import ABLETON_TOOLS, SYSTEM_PROMPT, tool_to_osc
from database import init_db, get_user_by_email, get_user_by_id, create_user, is_subscribed, update_user_password
from musai_auth import hash_password, verify_password, create_token, decode_token
from stripe_routes import router as stripe_router
from security import (
    enforce_secrets, rate_limit, get_client_ip,
    validate_password, register_bridge_token, validate_bridge_token,
    check_credential_stuffing, check_bot_ua, check_prompt_injection,
    watermark_response, DoSProtectionMiddleware,
)

logging.basicConfig(level=logging.WARNING)
log = logging.getLogger("beatmind")

TRIAL_DAYS = 7
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]


# ---- State ----

class BridgeConnection:
    def __init__(self, ws: WebSocket, session_id: str):
        self.ws = ws
        self.session_id = session_id
        self.connected_at = datetime.now(timezone.utc)
        self.pending: dict[str, asyncio.Future] = {}

    async def send_command(self, address: str, args: list, query: bool = False, timeout: float = 5.0) -> dict:
        request_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self.pending[request_id] = future
        await self.ws.send_json({
            "type": "osc_query" if query else "osc_send",
            "request_id": request_id,
            "address": address,
            "args": args,
            "timeout": timeout,
        })
        try:
            return await asyncio.wait_for(future, timeout=timeout + 2)
        except asyncio.TimeoutError:
            self.pending.pop(request_id, None)
            return {"status": "timeout", "address": address}

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

    def handle_response(self, data: dict):
        rid = data.get("request_id")
        if rid and rid in self.pending:
            f = self.pending.pop(rid)
            if not f.done():
                f.set_result(data)


class ChatSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: list[dict] = []
        self.bridge: BridgeConnection | None = None


sessions: dict[str, ChatSession] = {}
bridges: dict[str, BridgeConnection] = {}
claude_client: anthropic.Anthropic | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global claude_client
    # Crash early if secrets missing (skip in dev when JWT_SECRET not set)
    if os.getenv("ENV", "development") == "production":
        enforce_secrets()
    init_db()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.warning("ANTHROPIC_API_KEY not set — Claude API calls will fail")
    claude_client = anthropic.Anthropic(api_key=api_key) if api_key else None
    log.info("BeatMind backend started. Allowed origins: %s", ALLOWED_ORIGINS)
    yield


app = FastAPI(title="BeatMind", lifespan=lifespan, docs_url=None, redoc_url=None)
app.include_router(stripe_router)

# DoS middleware must be added FIRST (outermost layer)
app.add_middleware(DoSProtectionMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
    import boto3
    ses = boto3.client("ses", region_name="us-east-1")
    ses.send_email(
        Source="BeatMind <support@dollor.ai>",
        Destination={"ToAddresses": [to_email]},
        Message={
            "Subject": {"Data": "Reset your BeatMind password"},
            "Body": {
                "Html": {
                    "Data": f"""
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d0d;color:#fff;border-radius:12px;">
                        <div style="font-size:20px;font-weight:900;margin-bottom:24px;">
                            <span style="background:#7c3aed;color:#fff;padding:4px 10px;border-radius:6px;margin-right:8px;">B</span>
                            beatmind
                        </div>
                        <h2 style="margin:0 0 12px;">Reset your password</h2>
                        <p style="color:#aaa;margin:0 0 24px;">Click the button below to set a new password. This link expires in 30 minutes.</p>
                        <a href="{reset_url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password →</a>
                        <p style="color:#555;font-size:12px;margin-top:32px;">If you didn't request this, you can ignore this email.</p>
                    </div>
                    """
                }
            },
        },
    )


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
            _send_reset_email(user["email"], reset_url)
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
    register_bridge_token(token)
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

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request, user: dict = Depends(require_subscription)):
    if not claude_client:
        raise HTTPException(500, "Claude API not configured")

    # Rate limit: 30 messages per user per minute
    rate_limit(f"chat:{user['id']}", max_requests=30, window_seconds=60)

    session_id = req.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = ChatSession(session_id)
    session = sessions[session_id]

    bridge = session.bridge or (list(bridges.values())[0] if bridges else None)
    session.bridge = bridge

    session.messages.append({"role": "user", "content": req.message})

    tool_calls_log = []
    response_text = ""
    try:
        response_text, tool_calls_log = await _run_claude_loop(session, bridge)
    except anthropic.APIError as e:
        log.error("Claude API error (status=%s)", getattr(e, 'status_code', 'unknown'))
        raise HTTPException(502, "AI service temporarily unavailable")
    except Exception as e:
        log.exception("Unexpected chat error")
        raise HTTPException(500, "Internal error")

    session.messages.append({"role": "assistant", "content": response_text})

    return {
        "session_id": session_id,
        "response": response_text,
        "tool_calls": tool_calls_log,
        "bridge_connected": bridge is not None,
    }


MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")


def _build_system(bridge_note: str) -> list[dict]:
    return [{"type": "text", "text": SYSTEM_PROMPT + bridge_note, "cache_control": {"type": "ephemeral"}}]


def _build_tools() -> list[dict]:
    tools = [dict(t) for t in ABLETON_TOOLS]
    tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


async def _run_claude_loop(session: ChatSession, bridge: BridgeConnection | None) -> tuple[str, list]:
    tool_calls_log = []
    messages = list(session.messages)
    bridge_note = "" if bridge else "\n\nNOTE: No Ableton bridge connected. Describe what you would do but cannot execute."

    for _ in range(20):
        response = claude_client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=_build_system(bridge_note),
            tools=_build_tools(),
            messages=messages,
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
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

        tool_results = []
        for tu in tool_uses:
            result = await _execute_tool(tu.name, tu.input, bridge)
            tool_calls_log.append({"tool": tu.name, "input": tu.input, "result": result})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result),
            })
        messages.append({"role": "user", "content": tool_results})

    return "\n".join(text_parts) if text_parts else "Reached max iterations.", tool_calls_log


async def _execute_tool(tool_name: str, tool_input: dict, bridge: BridgeConnection | None) -> dict:
    if not bridge:
        return {"error": "No Ableton bridge connected."}
    try:
        osc_commands = tool_to_osc(tool_name, tool_input)
    except ValueError as e:
        return {"error": str(e)}

    if len(osc_commands) == 1:
        cmd = osc_commands[0]
        return await bridge.send_command(cmd["address"], cmd.get("args", []), cmd.get("query", False))
    return {"results": await bridge.send_batch(osc_commands)}


# ---- WebSocket: Bridge (requires auth token) ----

@app.websocket("/ws/bridge")
async def bridge_ws(ws: WebSocket):
    token = ws.query_params.get("token", "")
    if not validate_bridge_token(token):
        await ws.close(code=4001)
        return

    await ws.accept()
    session_id = str(uuid.uuid4())[:8]
    bridge = BridgeConnection(ws, session_id)
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
        log.info("Bridge disconnected: %s", session_id)


# ---- Health ----

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "bridges_connected": len(bridges),
        "active_sessions": len(sessions),
        "claude_configured": claude_client is not None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
