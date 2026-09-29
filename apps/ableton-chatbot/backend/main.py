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
from automation import AUTOMATION_TOOLS, execute_automation, note_density
from production import create_plan, get_plan, link_audition, review_part, replace_audition
from session_context import matching_recordings, context_note
from model_history import bounded_history
import ai_usage
import mixmind_ai
import mixmind_download as mixmind_download_module
import catalog
import references
import chat_store
import song_projects
import chat_tools
from sections import SECTION_TOOL, get_brief, set_brief, source_error
from recordings import ROOT as RECORDINGS_ROOT, save_recording, list_recordings, owned_recording, decide_recording, attach_evidence
from database import init_db, get_user_by_email, get_user_by_id, create_user, is_subscribed, mixmind_access, update_user_password
from beatmind_auth import hash_password, verify_password, create_token, decode_token
from stripe_routes import router as stripe_router
from security import (
    enforce_secrets, rate_limit, get_client_ip,
    validate_password, create_bridge_token, revoke_bridge_token, validate_bridge_token, bridge_token_owner,
    create_mixmind_token, revoke_mixmind_token, mixmind_token_owner, MIXMIND_AI_PATH,
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
        self.capabilities: set[str] = set()
        self.automated_controls: dict[int, set] = {}  # scene -> automated (track, target) this connection

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

    async def local_operation(self, operation, payload, timeout=55):
        request_id = str(uuid.uuid4())
        future = asyncio.get_running_loop().create_future()
        self.pending[request_id] = future
        try:
            await self.ws.send_json({"type": operation, "request_id": request_id, **payload})
            try:
                return await asyncio.wait_for(asyncio.shield(future), timeout=timeout)
            except asyncio.CancelledError:
                # Keep the session locked until the bridge has restored playback state.
                with suppress(asyncio.TimeoutError):
                    await asyncio.wait_for(asyncio.shield(future), timeout=timeout)
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
        self.actions: list[dict] = []
        self.ui_messages: list[dict] = []
        self.project: dict | None = None


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
    await asyncio.to_thread(catalog.resolve)  # Warm the Stripe plan catalog; billing stays unmetered if it fails.
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
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Reference-Name", "X-Rights-Confirmed"],
)


# ---- Auth helpers ----

def bearer_token(authorization: str | None) -> str | None:
    return authorization[7:] if authorization and authorization.startswith("Bearer ") else None


def token_user(token: str | None, allow_mixmind: bool = True) -> dict | None:
    """The user behind a web login JWT or, when allowed, a non-revoked MixMind token. Bridge tokens never qualify."""
    if not token:
        return None
    try:
        claims = decode_token(token)
    except JWTError:
        return None
    kind = claims.get("typ")
    if kind == "mixmind" and allow_mixmind:
        user_id = mixmind_token_owner(token)
    elif kind is None:
        try:
            user_id = int(claims["sub"])
        except (ValueError, KeyError, TypeError):
            return None
    else:
        return None  # Bridge tokens only open the bridge WebSocket; MixMind tokens only the MixMind endpoints.
    return get_user_by_id(user_id) if user_id else None


def get_current_user(authorization: str = Header(None)) -> dict:
    user = token_user(bearer_token(authorization), allow_mixmind=False)
    if not user:
        raise HTTPException(401, "Unauthorized")
    return user


def get_account_user(authorization: str = Header(None)) -> dict:
    """/api/auth/me and /api/auth/verify: a web login JWT or the MixMind app's long-lived token."""
    user = token_user(bearer_token(authorization))
    if not user:
        raise HTTPException(401, "Unauthorized")
    return user


def require_subscription(user: dict = Depends(get_current_user)) -> dict:
    if not is_subscribed(user):
        raise HTTPException(402, "Your free trial has ended. Choose a plan to keep going.")
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
        raise HTTPException(409, "An account with this email already exists. Sign in or reset your password.")

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
        "user": user_payload(user),
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
        "user": user_payload(user),
    }


def user_payload(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "subscription_status": user["subscription_status"],
        "trial_ends_at": user["trial_ends_at"],
        "subscribed": is_subscribed(user),
        "plan": user.get("plan"),
        "mixmind_access": mixmind_access(user),
    }


@app.get("/api/auth/me")
async def me(user: dict = Depends(get_account_user)):
    return user_payload(user)


@app.get("/api/auth/verify")
async def verify_token(user: dict = Depends(get_account_user)):
    """
    Verify a login JWT or MixMind token and return the user's active subscriptions.
    Used by MixMind desktop app on launch.

    Response 200: {"user_id": "...", "email": "...", "subscriptions": ["beatmind"]}
    Response 401: invalid or expired token
    """
    subscriptions = []
    if is_subscribed(user):
        subscriptions.append("beatmind")
    if mixmind_access(user):
        subscriptions.append("mixmind")

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
    from html import escape

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
            <span style="background:#ff6b00;color:#fff;padding:4px 10px;border-radius:6px;margin-right:8px;">B</span>
            beatmind
        </div>
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p style="color:#aaa;margin:0 0 24px;">Click the button below to set a new password. This link expires in 30 minutes.</p>
        <a href="{safe_url}" style="display:inline-block;background:#ff6b00;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password →</a>
        <p style="color:#ccc;font-size:14px;margin-top:24px;">If the button does not work, copy this entire link into your browser:</p>
        <p style="overflow-wrap:anywhere;word-break:break-all;font-size:13px;"><a href="{safe_url}" style="color:#a5b4fc;">{safe_url}</a></p>
        <p style="color:#555;font-size:12px;margin-top:32px;">If you didn't request this, you can ignore this email.</p>
    </div>
    """

    from email_transport import send_email
    message_id = send_email(to_email, "Reset your BeatMind password", plain, html)
    log.warning("Password-reset email accepted: %s", message_id)


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
    """A long-lived Bridge sign-in that survives deploys; the Bridge keeps it in the macOS Keychain."""
    return {"bridge_token": create_bridge_token(user["id"])}


class BridgeSignOut(BaseModel):
    bridge_token: str = Field(min_length=20, max_length=2000)


@app.post("/api/auth/bridge-token/revoke")
async def sign_out_bridge(req: BridgeSignOut):
    revoke_bridge_token(req.bridge_token)
    return {"revoked": True}


@app.post("/api/auth/mixmind-token")
async def get_mixmind_token(user: dict = Depends(get_current_user)):
    """A 365-day MixMind desktop sign-in, issued to any signed-in user; MixMind endpoints check the plan per call."""
    return {"mixmind_token": create_mixmind_token(user["id"])}


class MixMindSignOut(BaseModel):
    mixmind_token: str = Field(min_length=20, max_length=2000)


@app.post("/api/auth/mixmind-token/revoke")
async def sign_out_mixmind(req: MixMindSignOut):
    revoke_mixmind_token(req.mixmind_token)
    return {"revoked": True}


@app.get("/api/mixmind/download")
async def mixmind_download(request: Request, user: dict = Depends(get_current_user)):
    """A presigned, 5-minute link to the MixMind installer. The DMG has no public URL of its own —
    this is the only way to reach it, and only for a signed-in user on a plan that includes MixMind."""
    rate_limit(f"mixmind-download:{get_client_ip(request)}", max_requests=20, window_seconds=3600)
    if not mixmind_access(user):
        raise HTTPException(402, "MixMind isn't included in your current plan.")
    return {"url": await asyncio.to_thread(mixmind_download_module.presigned_url),
            "expires_in": mixmind_download_module.EXPIRES_IN_SECONDS}


@app.post(MIXMIND_AI_PATH)
async def mixmind_ai_messages(request: Request, x_api_key: str = Header(None), authorization: str = Header(None)):
    """Anthropic Messages API for the MixMind app (the SDK sends its api_key as x-api-key). See mixmind_ai.py."""
    return await mixmind_ai.handle(request, token_user(x_api_key or bearer_token(authorization)))


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
    operation: str = Field(pattern="^(activate|save|new|inspect|confirm_current|confirm_new)$")
    session_id: str | None = Field(default=None, pattern=r'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')


@app.post("/api/live-set")
async def live_set_action(req: LiveSetRequest, user: dict = Depends(require_subscription)):
    rate_limit(f"live-set:{user['id']}", max_requests=20, window_seconds=60)
    owned = [bridge for bridge in bridges.values() if bridge.user_id == user["id"]]
    if len(owned) != 1:
        raise HTTPException(409, "Connect exactly one Ableton bridge before setting up a new song.")
    bridge = owned[0]
    if bridge.lock.locked():
        raise HTTPException(409, "Finish or stop the current production request first.")
    async with AsyncExitStack() as stack:
        session = None
        if req.session_id:
            stack.enter_context(chat_store.acquire(user['id'], req.session_id))
            session, saved = saved_project(user['id'], req.session_id)
        stack.enter_context(chat_store.acquire(user['id'], '_production'))
        await stack.enter_async_context(bridge.lock)
        confirming = req.operation.startswith('confirm_')
        if confirming and session is None:
            raise HTTPException(422, 'Choose a song before confirming its Live Set.')
        result = await bridge.local_operation("live_set", {"operation": 'inspect' if confirming else req.operation})
        if confirming:
            if result.get('status') not in {'observed', 'verified'} or not result.get('title'):
                raise HTTPException(409, 'Could not verify the current Live Set. Check Ableton and retry.')
            if req.operation == 'confirm_new' and result.get('new_set_ready') is not True:
                raise HTTPException(409, 'The new set is not confirmed. Complete any save prompt in Ableton and check again.')
            session.project['live_set'] = {'title': result['title'], 'choice': req.operation,
                                           'confirmed_at': datetime.now(timezone.utc).isoformat()}
            chat_store.save(session, saved['status'])
            result['project'] = session.project
        return result


def saved_project(user_id, session_id):
    saved = chat_store.load(user_id, session_id)
    if not saved or not saved.get('project'):
        raise HTTPException(404, 'Song project not found.')
    session = ChatSession(session_id, user_id)
    session.messages = saved['messages']
    session.ui_messages = saved.get('ui_messages', [])
    session.actions = saved.get('actions', [])
    session.reference_id = saved.get('reference_id')
    session.project = saved['project']
    return session, saved


class SongProjectRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=70)
    starting_point: str | None = Field(default=None, pattern='^(reference|idea)$')
    reference_id: str | None = Field(default=None, pattern=r'^[a-f0-9]{32}$')


@app.post('/api/chats')
async def create_song_project(user: dict = Depends(get_current_user)):
    rate_limit(f"new-song:{user['id']}", max_requests=20, window_seconds=60)
    session = ChatSession(str(uuid.uuid4()), user['id'])
    session.project = song_projects.new_project()
    with chat_store.acquire(user['id'], session.session_id):
        chat_store.save(session, 'complete')
    return {'sessionId': session.session_id, 'messages': [], 'referenceId': None, 'project': session.project}


@app.patch('/api/chats/{session_id}/project')
async def update_song_project(session_id: str, req: SongProjectRequest, user: dict = Depends(get_current_user)):
    with chat_store.acquire(user['id'], session_id):
        session, saved = saved_project(user['id'], session_id)
        if req.title is not None:
            if not req.title.strip():
                raise HTTPException(422, 'Give your song a name.')
            session.project['title'] = req.title.strip()
        if req.starting_point is not None:
            session.project['starting_point'] = req.starting_point
            if req.starting_point == 'idea':
                session.reference_id = None
        if 'reference_id' in req.model_fields_set:
            if req.reference_id:
                references.owned(req.reference_id, user['id'])
                session.project['starting_point'] = 'reference'
            session.reference_id = req.reference_id
        chat_store.save(session, saved['status'])
        return {'project': session.project, 'referenceId': session.reference_id}

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    session_id: str | None = Field(default=None, pattern=r'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')
    reference_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")
    planning_only: bool = False


def prepare_chat(req: ChatRequest, user: dict):
    if not claude_client:
        raise HTTPException(500, "Claude API not configured")

    # Rate limit: 30 messages per user per minute
    rate_limit(f"chat:{user['id']}", max_requests=30, window_seconds=60)

    # Block prompt injection attempts
    check_prompt_injection(req.message)

    ai_usage.enforce(user)

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
    saved = chat_store.load(user['id'], session_id)
    if saved:
        session.messages = chat_store.recover_messages(saved)
        session.actions = saved.get('actions', [])
        session.reference_id = saved.get('reference_id')
        session.project = saved.get('project')
    elif not session.messages and not session.project:
        session.project = song_projects.new_project()
    reference_id = req.reference_id if 'reference_id' in req.model_fields_set else getattr(session, 'reference_id', None)
    reference_note = song_projects.reference_note(reference_id, user['id'])
    session.reference_id = reference_id
    session.reference_note = reference_note
    return session, bridge


async def produce_chat(req, session, bridge, emit=None):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(session.lock)
        stack.enter_context(chat_store.acquire(session.user_id, session.session_id))
        # Different chats for the same producer must not write to one set concurrently.
        stack.enter_context(chat_store.acquire(session.user_id, '_production'))
        # Reload after obtaining both leases: another worker may have completed
        # between request preparation and lock acquisition.
        saved = chat_store.load(session.user_id, session.session_id)
        if saved:
            session.messages = chat_store.recover_messages(saved)
            session.ui_messages = chat_store.visible_messages(saved)
            session.reference_id = saved.get('reference_id')
            session.project = saved.get('project')
        elif not session.messages and not session.project:
            # Older clients can send a first message without POST /api/chats.
            session.project = song_projects.new_project()
        if 'reference_id' in req.model_fields_set:
            session.reference_id = req.reference_id
        reference_id = getattr(session, 'reference_id', None)
        session.reference_note = song_projects.reference_note(reference_id, session.user_id)
        session.project_note = song_projects.planning_reason(session.project, reference_id, session.user_id)
        session.planning_only = req.planning_only or bool(session.project_note)
        session.pending_review = False
        session.current_track_names = []
        session.current_recordings = []
        if bridge:
            await stack.enter_async_context(bridge.lock)
            if session.project and not session.planning_only:
                live = await bridge.local_operation('live_set', {'operation': 'inspect'})
                if live.get('status') not in {'observed', 'verified'}:
                    # Say why Ableton could not be checked (for example a locked Mac) instead of blaming the set.
                    raise HTTPException(409, (live.get('summary') or 'Ableton could not be checked.') + ' Nothing was changed.')
                if live.get('title') != session.project['live_set']['title']:
                    raise HTTPException(409, 'The open Ableton set no longer matches this song. Use Choose Live Set before making changes. Nothing was changed.')
            state = await bridge.send_command("/live/song/get/track_names", [], True)
            if state.get("status") != "ok" or not isinstance(state.get("args"), list):
                raise HTTPException(409, "Unable to inspect the current Live Set. Reconnect the bridge before continuing.")
            session.current_track_names = state["args"]
            # A new song's planning must not inherit approvals from the old open set.
            session.current_recordings = [] if session.project and not session.project.get('live_set') else matching_recordings(
                list_recordings(session.user_id, session.session_id) if session.project else list_recordings(session.user_id), state["args"])
            session.pending_review = any(item["decision"] == "pending" for item in session.current_recordings)
        session.messages.append({"role": "user", "content": req.message})
        now = datetime.now(timezone.utc).isoformat()
        session.ui_messages.extend([
            {'id': str(uuid.uuid4()), 'createdAt': now, 'role': 'user', 'content': req.message},
            {'id': str(uuid.uuid4()), 'createdAt': now, 'role': 'assistant', 'content': '', 'pending': True, 'requestStatus': 'running', 'toolCalls': []},
        ])
        session.actions = []
        chat_store.save(session, 'running')
        chat_store.journal(session, {'type': 'request', 'message': req.message})

        async def progress(event):
            if event['type'] in {'action_started', 'action_completed'}:
                action = event['action']
                session.actions = [a for a in session.actions if a['id'] != action['id']] + [action]
                session.ui_messages[-1]['toolCalls'] = session.actions
            chat_store.journal(session, event)
            chat_store.save(session, 'running')
            if emit:
                await emit(event)

        try:
            if emit:
                await emit({"type": "session", "session_id": session.session_id, "bridge_connected": bridge is not None,
                            "project": session.project, "referenceId": reference_id})
            response_text, tool_calls_log = await _run_claude_loop(session, bridge, progress)
            session.messages.append({"role": "assistant", "content": response_text})
            session.actions = tool_calls_log
            session.ui_messages[-1].update(content=response_text, toolCalls=tool_calls_log, pending=False, requestStatus='complete')
            chat_store.save(session, 'complete')
            return {"session_id": session.session_id, "response": response_text,
                    "tool_calls": tool_calls_log, "bridge_connected": bridge is not None,
                    "project": session.project, "referenceId": reference_id}
        except BaseException:
            for action in session.actions:
                if not action.get('result'):
                    action['result'] = {'status': 'unverified', 'summary': 'Interrupted before confirmation. Inspect before retrying.'}
            session.ui_messages[-1]['requestStatus'] = 'interrupted'
            chat_store.save(session, 'interrupted', 'Request interrupted; inspect the saved action log before retrying.')
            raise


@app.get('/api/chats')
async def chats_list(user: dict = Depends(get_current_user)):
    return {'chats': chat_store.listing(user['id'])}


@app.get('/api/chats/{session_id}')
async def chat_details(session_id: str, user: dict = Depends(get_current_user)):
    data = chat_store.load(user['id'], session_id)
    if data is None:
        raise HTTPException(404, 'Conversation not found.')
    visible = chat_store.visible_messages(data)
    return {'sessionId': session_id, 'messages': visible, 'referenceId': data.get('reference_id'),
            'project': data.get('project'),
            'status': data['status'], 'updatedAt': data['updated_at']}


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
MAX_OUTPUT_TOKENS = int(os.getenv("BEATMIND_MAX_OUTPUT_TOKENS", "8192"))

DISCUSSION_TOOLS = {
    tool['name'] for tool in ABLETON_TOOLS
    if tool['name'].startswith('get_') or tool['name'] in {
        'list_browser', 'inspect_track', 'list_sample_packs',
        'search_pack_samples', 'inspect_pack_sample',
    }
} | {'list_reference_sounds'}


def _build_system(bridge_note: str) -> list[dict]:
    return [{"type": "text", "text": SYSTEM_PROMPT + bridge_note, "cache_control": {"type": "ephemeral"}}]


def _build_tools() -> list[dict]:
    tools = [dict(t) for t in ABLETON_TOOLS] + [dict(t) for t in chat_tools.TOOLS] + [dict(SECTION_TOOL)]
    tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


async def _run_claude_loop(session: ChatSession, bridge: BridgeConnection | None, emit=None) -> tuple[str, list]:
    usage_request = uuid.uuid4().hex  # Groups this message's model calls in the usage log.
    tool_calls_log = []
    pack_scoped = False
    track_creation_attempted = False
    section_brief = None
    messages = session.messages
    bridge_note = "" if bridge else "\n\nNOTE: No Ableton bridge connected. No live music changes are possible. Server-side saved-audio discovery and comparison remain available."
    bridge_note += getattr(session, 'reference_note', '')
    bridge_note += '\n' + getattr(session, 'project_note', '')
    planning_only = getattr(session, 'planning_only', False)
    if planning_only:
        bridge_note += "\nThis turn is discussion only. Ask one next question. Do not play, audition, change music or create a production plan; only read-only discovery is available."
    if bridge and (not session.project or session.project.get('live_set')):
        previous_section = get_brief(session.user_id, session.session_id)
        if previous_section:
            bridge_note += "\nPrevious requested section brief (historical intent, not evidence of completed music): " + json.dumps(previous_section) + ". For a section continuation or same-pack request, inspect current scenes and call set_section_brief to confirm the source for this request."
        bridge_note += context_note(getattr(session, "current_track_names", []),
                                    getattr(session, "current_recordings", []),
                                    get_plan(session.user_id, session.session_id))
    if getattr(session, "pending_review", False):
        bridge_note += "\nSome historical previews are pending review. Their decisions are informational, not a lock on this request. Follow the user's explicit edit or continuation request without requiring approval of another sound. Never mark a preview accepted on their behalf. Inspect current devices and clips; do not treat a prior recording as unchanged current audio."

    continued_text = []
    for _ in range(MAX_PRODUCTION_ROUNDS):
        response = await claude_client.messages.create(
            model=MODEL,
            max_tokens=MAX_OUTPUT_TOKENS,
            system=_build_system(bridge_note),
            tools=[tool for tool in _build_tools() if not planning_only or tool['name'] in DISCUSSION_TOOLS],
            messages=bounded_history(messages),
        )
        ai_usage.record(session.user_id, 'chat', provider_name(), MODEL, ai_usage.anthropic_tokens(response), usage_request)

        text_parts = []
        tool_uses = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_uses.append(block)

        if response.stop_reason == "max_tokens" and not tool_uses and len(continued_text) < 3:
            # A long answer (for example a full arrangement plan) was cut off: ask for the rest and join the parts.
            continued_text.append("\n".join(text_parts))
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": "Continue exactly where you stopped. Do not repeat what you already wrote."})
            continue
        if response.stop_reason == "end_turn" or not tool_uses:
            answer = "".join(continued_text) + "\n".join(text_parts)
            if not answer.strip():
                answer = ("I finished checking the set but did not produce an answer. Nothing was changed. "
                          "Please ask again, or ask for one part of the plan at a time.")
            return answer, tool_calls_log

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
                if planning_only and tu.name not in DISCUSSION_TOOLS:
                    result = {"status": "failed", "summary": "Discussion only: no playback or music changes were authorized. Ask for the user's next choice.", "steps": []}
                elif tu.name in chat_tools.NAMES and not blocked and not audition_ready:
                    result = await chat_tools.execute(tu.name, tu.input, session.user_id)
                elif tu.name == "set_section_brief" and not blocked and not audition_ready:
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
                audition_ready = audition_ready or bool(result.get("recording") or result.get('comparison'))
                action["result"] = result
                tool_calls_log.append(action)
                if result.get("recording"):
                    # A full-mix preview belongs to the song, not to one planned part.
                    previous_id = (None if result["recording"].get("kind") == "scene"
                                   else link_audition(session.user_id, session.session_id, result["recording"]))
                    if previous_id:
                        from recordings import link_revision
                        link_revision(result["recording"]["id"], previous_id, session.user_id)
                    result["recording"] = attach_evidence(result["recording"]["id"], session.user_id, tool_calls_log,
                                                          **({'session_id': session.session_id} if session.project else {}))
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

        if any(action['result'].get('comparison') for action in tool_calls_log):
            return 'The saved sounds have been compared. Play A and B below at matched RMS levels. These measurements are not a match percentage. Which difference would you like to refine?', tool_calls_log
        failed = [action for action in tool_calls_log if action['result'].get('status') in {'failed', 'partial'}
                  and not str(action['result'].get('summary', '')).startswith('Skipped after')]
        caveat = (f" Note: {len(failed)} step{'s' if len(failed) != 1 else ''} did not complete "
                  f"({', '.join(sorted({action['tool'].replace('_', ' ') for action in failed}))}); see Production details."
                  if failed else "")
        if audition_ready and any(action['result'].get('recording', {}).get('kind') == 'scene' for action in tool_calls_log):
            return ("Your full-mix preview is ready." + caveat + " Listen to the whole scene together, then accept it or "
                    "request a change to the balance."), tool_calls_log
        if audition_ready:
            revised = any(action.get('result', {}).get('recording', {}).get('supersedes') for action in tool_calls_log)
            if revised:
                added = [a["input"]["effect_uri"].split("/")[-1] for a in tool_calls_log
                         if a["tool"] == "load_effect" and a["result"].get("status") == "verified"]
                for a in tool_calls_log:  # a device added and then removed in the same turn is not "added"
                    if a["tool"] == "delete_device" and a["result"].get("status") == "verified" and a["input"]["expected_name"] in added:
                        added.remove(a["input"]["expected_name"])
                effects = f" Effects added this time: {', '.join(added)}." if added else ""
                return ("Your updated preview is ready." + effects + caveat + " The earlier recording and its decision remain saved. "
                        "Compare before and after, then accept it or request a change."), tool_calls_log
            return ("Your first preview of this part is ready." + caveat + " Listen, then accept the sound or request a change. "
                    "Nothing else will be built until you choose the next step."), tool_calls_log
        if any(action["tool"] in {"audition_part", "audition_scene"} for action in tool_calls_log):
            return "The part remains in Ableton, but its audition did not pass verification. No recording is ready for approval. Review the audition details before retrying; do not recreate the track or notes.", tool_calls_log

    return "Production paused at the action limit. Some requested work may remain; review the action log before continuing.", tool_calls_log


SONG_TOOL_CAPABILITY = {"audition_scene": "scene_audition_v1", "record_arrangement": "arrangement_record_v1"}


async def _mix_tool(tool_name: str, tool_input: dict, bridge: BridgeConnection) -> dict:
    """The engineering checklist and the master chain read and write Ableton through the Bridge's OSC relay."""
    from jsonschema import validate, ValidationError
    import master_chain
    import mix_check
    try:
        validate(tool_input, next(t["input_schema"] for t in ABLETON_TOOLS if t["name"] == tool_name))
    except ValidationError as error:
        return {"status": "failed", "summary": error.message, "steps": []}

    async def query(address, args):
        reply = await bridge.send_command(address, list(args), True)
        if reply.get("status") != "ok":
            raise RuntimeError(f"Ableton did not confirm {address}.")
        return reply.get("args") or []

    async def send(address, args):
        await bridge.send_command(address, list(args))

    try:
        if tool_name == "mix_check":
            return await mix_check.run(bridge.user_id, tool_input["recording_id"], query,
                                       tool_input.get("target_lufs", mix_check.TARGET_LUFS),
                                       tool_input.get("ceiling_dbtp", mix_check.CEILING_DBTP))
        return await master_chain.apply(query, send, tool_input["measured_lufs"],
                                        tool_input.get("target_lufs", -14.0), tool_input.get("ceiling_dbtp", -1.0))
    except (RuntimeError, ValueError, OSError) as error:
        return {"status": "failed", "summary": str(error), "steps": []}


async def _song_tool(tool_name: str, tool_input: dict, bridge: BridgeConnection) -> dict:
    """Full-mix scene previews and Arrangement recording run inside the Bridge (1.3.0 and later)."""
    from jsonschema import validate, ValidationError
    try:
        validate(tool_input, next(t["input_schema"] for t in ABLETON_TOOLS if t["name"] == tool_name))
    except ValidationError as error:
        return {"status": "failed", "summary": error.message, "steps": []}
    if SONG_TOOL_CAPABILITY[tool_name] not in bridge.capabilities:
        message = ("This needs BeatMind Bridge 1.3 or later. Click Install update in the Bridge window "
                   "(your Ableton set stays open), then ask again.")
        return {"status": "failed", "error": message, "summary": message, "steps": []}
    if tool_name == "audition_scene":
        request = {"scene": tool_input["scene"], "seconds": tool_input.get("seconds", 12)}
        if "then_scene" in tool_input:
            if "scene_transition_v1" not in bridge.capabilities:
                message = ("Transition previews need BeatMind Bridge 1.3.3 or later. Click Install update in the Bridge "
                           "window (your Ableton set stays open), or preview each scene on its own.")
                return {"status": "failed", "error": message, "summary": message, "steps": []}
            request["then_scene"] = tool_input["then_scene"]
        elif request["seconds"] > 16:
            return {"status": "failed", "summary": "A single-scene preview is at most 16 seconds.", "steps": []}
        result = await bridge.local_operation("capture_scene", request)
        return save_recording(bridge.user_id, result)
    tempo = await bridge.send_command("/live/song/get/tempo", [], True)
    bpm = float((tempo.get("args") or [60])[-1]) if tempo.get("status") == "ok" else 60.0
    bars = sum(section["bars"] for section in tool_input["sections"])
    return await bridge.local_operation("record_arrangement", {"sections": tool_input["sections"]},
                                        timeout=bars * 4 * 60 / max(bpm, 20) + 90)


async def _missing_instrument(track: int, bridge: BridgeConnection) -> str | None:
    """A MIDI track with no devices cannot make sound; say so instead of recording silence."""
    def value(reply):
        args = reply.get("args") or []
        return args[-1] if reply.get("status") == "ok" and args else None
    midi = value(await bridge.send_command("/live/track/get/has_midi_input", [track], True))
    devices = value(await bridge.send_command("/live/track/get/num_devices", [track], True))
    if midi and devices == 0:
        return (f"Track {track + 1} has no instrument, so it cannot make sound yet. Discover an instrument or kit "
                "with list_browser, load it with load_instrument, then audition again. The notes are kept.")
    return None


async def _execute_tool(tool_name: str, tool_input: dict, bridge: BridgeConnection | None) -> dict:
    if not bridge:
        return {"status": "failed", "error": "No Ableton bridge connected.", "summary": "No Ableton bridge connected.", "steps": []}
    if tool_name in {item["name"] for item in AUTOMATION_TOOLS}:
        track_name = ""
        if tool_input.get("mixer") in ("send", "pan") and isinstance(tool_input.get("track"), int):
            names = await bridge.send_command("/live/song/get/track_names", [], True)
            if names.get("status") == "ok" and tool_input["track"] < len(names.get("args") or []):
                track_name = str(names["args"][tool_input["track"]])
        result = await execute_automation(tool_name, tool_input, bridge.send_command, track_name)
        if tool_name == "write_clip_automation" and result.get("status") in ("verified", "partial"):
            result = note_density(bridge.automated_controls, tool_input, result)
        return result
    if tool_name in {"audition_scene", "record_arrangement"}:
        return await _song_tool(tool_name, tool_input, bridge)
    if tool_name in {"mix_check", "apply_master_chain"}:
        return await _mix_tool(tool_name, tool_input, bridge)
    if tool_name in {"audition_part", "list_sample_packs", "search_pack_samples", "inspect_pack_sample", "load_pack_sample"}:
        from jsonschema import validate, ValidationError
        try:
            schema = next(t["input_schema"] for t in ABLETON_TOOLS if t["name"] == tool_name)
            validate(tool_input, schema)
        except ValidationError as error:
            return {"status": "failed", "summary": error.message, "steps": []}
        if tool_name != "audition_part":
            return await bridge.local_operation("sample_library", {"operation": tool_name, "data": tool_input})
        missing = await _missing_instrument(tool_input["track"], bridge)
        if missing:
            return {"status": "failed", "error": missing, "summary": missing, "steps": []}
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
            if data.get("type") == "bridge_hello":
                bridge.capabilities = {str(c) for c in data.get("capabilities") or []}
                bridge.version = str(data.get("version") or "")[:32]
            elif data.get("type") == "local_reference_event":
                references.local_event(bridge.user_id, data)
            else:
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


@app.api_route("/api/email/unsubscribe", methods=["GET", "POST"])
async def email_unsubscribe(token: str = ""):
    """One-click unsubscribe from product-update emails (GET from the link, POST from mail clients)."""
    import product_updates
    from fastapi.responses import HTMLResponse
    done = product_updates.unsubscribe(token)
    message = ("You are unsubscribed from BeatMind product updates. Account and billing emails still arrive."
               if done else "This unsubscribe link is not valid. Email support@beatmind.io and we will remove you.")
    return HTMLResponse(f'<!doctype html><meta name="viewport" content="width=device-width"><title>BeatMind</title>'
                        f'<body style="font-family:sans-serif;background:#0d0d0d;color:#eee;padding:48px;max-width:560px;margin:auto">'
                        f'<h2>BeatMind</h2><p>{message}</p></body>', status_code=200 if done else 400)


@app.get("/api/bridge/status")
async def bridge_status(user: dict = Depends(get_current_user)):
    mine = [b for b in bridges.values() if b.user_id == user["id"]]
    return {"bridge_connected": bool(mine), "bridge_version": getattr(mine[0], "version", "") if mine else None}


def bridge_for(user_id, capability):
    return next((b for b in bridges.values() if b.user_id == user_id and capability in b.capabilities), None)


app.include_router(references.router_for(get_current_user, require_subscription, bridge_for))

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
