import asyncio
import os
import logging
import shutil
import signal
import time
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
import uvicorn
import re
import requests as _requests
from collections import defaultdict

load_dotenv()
logger = logging.getLogger(__name__)

# ============================================================
# Phase 15 OPS-02: Sentry error monitoring
# Initialise only when SENTRY_DSN is provided — never crashes on missing config.
# sentry-sdk is optional: install via requirements.txt; if not installed, the app
# starts normally and Sentry is simply not active.
# Set SENTRY_DSN in .env or environment to enable.
# ============================================================
try:
    import sentry_sdk as _sentry_sdk
    _SENTRY_DSN = os.getenv("SENTRY_DSN", "")
    if _SENTRY_DSN:
        _sentry_sdk.init(
            dsn=_SENTRY_DSN,
            traces_sample_rate=0.1,
            environment=os.getenv("ENVIRONMENT", "production"),
        )
        logger.info("Sentry initialized")
except ImportError:
    logger.debug("sentry-sdk not installed — error monitoring disabled. Run: pip install sentry-sdk>=2.0.0")

# ============================================================
# Phase 15 OPS-03: Graceful shutdown — SIGTERM / SIGINT handler
# Docker stop sends SIGTERM. We set _shutdown_event so any long-running
# coroutine can check it. Uvicorn handles actual connection draining via
# --timeout-graceful-shutdown=30 (set in docker-compose CMD or uvicorn args).
# Registering here ensures the signal is caught even when uvicorn forks.
# ============================================================
_shutdown_event = asyncio.Event()


def _handle_sigterm(sig, frame):
    logger.info("SIGTERM received — draining requests (graceful shutdown)")
    _shutdown_event.set()


signal.signal(signal.SIGTERM, _handle_sigterm)
signal.signal(signal.SIGINT, _handle_sigterm)

# ============================================================
# Phase 1 startup guard — AB-001
# AI/LLM components wired in Phase 3. SuiteCloud wired in Phase 2.
# These try/except blocks make the server start cleanly even when
# FAISS vectorstore (1.2GB) or SuiteCloud CLI are not installed.
# DO NOT delete — the guarded code is live product functionality.
# ============================================================
import logging as _startup_logger
_log = _startup_logger.getLogger(__name__)

_ai_ready = False
_suitecloud_ready = False
_license_valid: bool = True   # optimistic default — startup check updates this
_license_plan: str = "unknown"
graph = None


def _check_ollama_available() -> bool:
    """Return True if Ollama is running and both required models are available."""
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        resp = _requests.get(f"{ollama_url}/api/tags", timeout=5)
        if resp.status_code != 200:
            return False
        models = [m["name"] for m in resp.json().get("models", [])]
        has_llm = any("llama3.1" in m for m in models)
        has_embed = any("nomic" in m for m in models)
        if not has_llm:
            _log.warning("llama3.1:8b not pulled. Run: ollama pull llama3.1:8b")
        if not has_embed:
            _log.warning("nomic-embed-text not pulled. Run: ollama pull nomic-embed-text")
        return has_llm and has_embed
    except Exception as e:
        _log.warning(f"Ollama not available at {ollama_url}: {e}")
        return False


try:
    if _check_ollama_available():
        from model_utils import infer_intent, build_graph
        graph = build_graph()
        _ai_ready = True
        _log.info("AI pipeline ready (Ollama + FAISS loaded)")
    else:
        _log.warning("AI pipeline unavailable: Ollama not running or models not pulled.")
        from model_utils import infer_intent
except Exception as _e:
    _log.warning(f"AI pipeline failed to initialize: {_e}")
    _ai_ready = False

try:
    from tester import create_project, deploy_project, setup_account_ci
    from sdf_utils import handle_sdf_project
    from suitescripts_utils import handle_netsuite_data_request, save_generated_files
    create_project()
    setup_account_ci()
    deploy_project()
    _suitecloud_ready = True
    _log.info("SuiteCloud CLI loaded successfully")
except BaseException as _e:
    # BaseException catches SystemExit from tester.py run_command() when suitecloud CLI is missing
    _log.warning(f"SuiteCloud CLI not available (Phase 2 will wire this): {_e}")

# Phase 2: detect SuiteCloud CLI availability using subprocess (no side-effects)
import subprocess as _subprocess
try:
    _sc_result = _subprocess.run(
        ["suitecloud", "--version"],
        capture_output=True,
        timeout=10,
    )
    _suitecloud_ready = _sc_result.returncode == 0
    if _suitecloud_ready:
        _log.info("SuiteCloud CLI detected")
    else:
        _log.warning("SuiteCloud CLI found but returned non-zero. Phase 2 deploy will fail.")
except FileNotFoundError:
    _log.warning("SuiteCloud CLI not found. Install: npm install -g @oracle/suitecloud-cli")
    _suitecloud_ready = False
except Exception as _sc_e:
    _log.warning(f"SuiteCloud check failed: {_sc_e}")
    _suitecloud_ready = False
# ============================================================

chat_sessions = defaultdict(list)

# === FastAPI App Setup ===
from auth_utils import limiter, require_user, SECRET_KEY
from routers import auth as auth_router_module
from routers import user as user_router_module

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: runs startup checks in order, then yields for the app lifetime."""
    # --- JWT_SECRET_KEY strength check (FIX 7) ---
    _insecure_defaults = (
        "changeme-use-a-32-char-random-string",
        "changeme",
        "secret",
        "",
    )
    if SECRET_KEY in _insecure_defaults:
        raise RuntimeError(
            "JWT_SECRET_KEY is set to an insecure default. Set a secure random value in .env"
        )
    if len(SECRET_KEY) < 32:
        raise RuntimeError(
            f"JWT_SECRET_KEY is too short ({len(SECRET_KEY)} chars). Minimum 32 characters required."
        )

    # --- Startup: required configuration validation ---
    if not os.getenv("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY is required but not set. Add it to .env")
    if not os.getenv("SMTP_HOST"):
        logger.warning("SMTP_HOST not configured — password reset emails will be disabled")
    if not os.getenv("FRONTEND_BASE_URL"):
        logger.warning("FRONTEND_BASE_URL not configured — password reset links will use fallback")

    # Run Alembic migrations on startup
    result = _subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=os.path.dirname(__file__),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error(f"Alembic migration failed: {result.stderr}")
    else:
        logger.info("Database migrations applied")

    # --- Startup: license check (non-fatal) ---
    global _license_valid, _license_plan
    try:
        async with AsyncSessionLocal() as db:
            _lic_result = await license_module.validate_license(db)
            _license_valid = _lic_result.get("valid", False)
            _license_plan = _lic_result.get("plan", "unknown")
            mode = _lic_result.get("mode", "unknown")
            logger.info(f"License: {mode}, plan={_license_plan}, valid={_license_valid}")
    except Exception as e:
        logger.warning(f"License startup check failed (non-fatal): {e}")

    yield
    # No shutdown logic required currently


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# CORS: In production, set ALLOWED_ORIGINS to a comma-separated list of allowed origins.
# Falls back to FRONTEND_BASE_URL (single origin) then dev localhost list.
# Use CORS_EXTRA_ORIGINS to append additional origins to the base list.
# No wildcard origin is permitted — CASE-190.
_origins_env = os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_BASE_URL", ""))
if _origins_env:
    _allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    # Dev: allow all localhost ports 5173-5180 (Vite picks first available) + 127.0.0.1
    _allowed_origins = [f"http://localhost:{p}" for p in range(5173, 5181)] + ["http://127.0.0.1:5173"]
_extra_origins_env = os.getenv("CORS_EXTRA_ORIGINS", "")
if _extra_origins_env:
    _allowed_origins += [o.strip() for o in _extra_origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,  # JWT in Authorization header (not cookies) — no CSRF vector
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 13: Identity controls — idle session timeout + IP allowlist
from middleware.idle_timeout import IdleTimeoutMiddleware
from middleware.ip_allowlist import IPAllowlistMiddleware
app.add_middleware(IdleTimeoutMiddleware)
app.add_middleware(IPAllowlistMiddleware)

# Phase 16: API key authentication — must be registered AFTER CORSMiddleware so
# X-API-Key header passes CORS preflight before we inspect it.
from middleware.api_key_auth import APIKeyAuthMiddleware
app.add_middleware(APIKeyAuthMiddleware)

# Phase 16: Response envelope — wraps /api/v1/ responses in {data, error, meta}
from middleware.response_envelope import ResponseEnvelopeMiddleware
app.add_middleware(ResponseEnvelopeMiddleware)

# Auth and user routers
app.include_router(auth_router_module.router)
app.include_router(user_router_module.router)

# Phase 2: NetSuite TBA session + deploy routers
from routers.netsuite import router as netsuite_router
from routers.deploy import router as deploy_router
app.include_router(netsuite_router)
app.include_router(deploy_router)

# Phase 7: License system
from routers import license as license_module
from database import AsyncSessionLocal
app.include_router(license_module.router)

# Phase 9: RBAC + chat persistence + admin team management
from routers.chats import router as chats_router
from routers.admin import router as admin_router
app.include_router(chats_router)
app.include_router(admin_router)

# Phase 13: SSO + MFA identity controls
from routers.sso import router as sso_router
from routers.mfa import router as mfa_router
app.include_router(sso_router)
app.include_router(mfa_router)

# Phase 14: GDPR compliance + data governance
from routers.compliance import router as compliance_router
app.include_router(compliance_router)

# Phase 16: API key management (versioned /api/v1/ prefix)
from routers.apikeys import router as apikeys_router
app.include_router(apikeys_router)

# Phase 19: Customer knowledge base management
from routers.knowledge import router as knowledge_router
app.include_router(knowledge_router)

# Phase 19: Analytics (public collect endpoint + admin summary)
from routers.analytics import router as analytics_router
app.include_router(analytics_router)

# Phase 16: /api/v1/ prefix alias for chats router — same handler functions, versioned prefix.
# The chats router already has prefix="/api/chats". We create a second APIRouter with
# prefix="/api/v1/chats" that re-registers the identical endpoint callables so both
# /api/chats/* and /api/v1/chats/* resolve to the same handlers.
from routers import chats as _chats_module
from fastapi import APIRouter as _APIRouter
_v1_chats_router = _APIRouter(prefix="/api/v1/chats", tags=["chats-v1"])
for _rt in _chats_module.router.routes:
    if hasattr(_rt, "endpoint") and hasattr(_rt, "methods"):
        # _rt.path is relative to the router prefix, e.g. "" or "/{session_id}/messages"
        _v1_chats_router.add_api_route(
            path=_rt.path,
            endpoint=_rt.endpoint,
            methods=list(_rt.methods),
            name=f"v1_{_rt.name}",
            response_model=getattr(_rt, "response_model", None),
            status_code=getattr(_rt, "status_code", 200),
        )
app.include_router(_v1_chats_router)

# Phase 9: DB model refs for chatbot persistence
from models import ChatMessage, ChatSession, User
from sqlalchemy import update as _sa_update
from sqlalchemy.ext.asyncio import async_sessionmaker as _async_sessionmaker
from database import engine as _db_engine

# Phase 16: Webhook dispatch worker
from webhook_worker import dispatch_webhook as _dispatch_webhook


async def _dispatch_webhook_safe(event: str, payload: dict) -> None:
    """
    Fire-and-forget wrapper for dispatch_webhook that opens its own DB session.
    Called via asyncio.create_task() — never raises exceptions to the caller.
    """
    try:
        _db_session_factory = _async_sessionmaker(_db_engine, expire_on_commit=False)
        async with _db_session_factory() as db_sess:
            await _dispatch_webhook(db_sess, event, payload)
    except Exception as _wh_err:
        logger.debug(f"webhook dispatch failed (non-fatal): {_wh_err}")


async def _persist_chat_to_db(
    chat_session_id: int,
    user_input: str,
    response_text: str,
    intent: str,
):
    """
    Non-fatal helper: persist user + assistant messages to DB when chat_session_id is provided.
    Falls back silently — in-memory context still works even if DB write fails.
    """
    try:
        _db_session_factory = _async_sessionmaker(_db_engine, expire_on_commit=False)
        async with _db_session_factory() as db_sess:
            db_sess.add(ChatMessage(
                session_id=int(chat_session_id),
                role="user",
                content=user_input,
            ))
            db_sess.add(ChatMessage(
                session_id=int(chat_session_id),
                role="assistant",
                content=response_text,
                intent=intent,
            ))
            await db_sess.execute(
                _sa_update(ChatSession)
                .where(ChatSession.id == int(chat_session_id))
                .values(updated_at=__import__("sqlalchemy", fromlist=["func"]).func.now())
            )
            await db_sess.commit()
        return True
    except Exception as _e:
        logger.warning(f"Failed to persist chat message to DB (non-fatal): {_e}")
        return False


@app.get("/health")
async def health():
    """Public health check — returns status only."""
    return {"status": "ok"}


@app.get("/health/detail")
async def health_detail(current_user: User = Depends(require_user)):
    """Detailed diagnostics — requires authentication.

    Frozen fields (AB-081-004): ai_ready, license_valid, license_plan — do not rename.
    Phase 15 additions: db_latency_ms, disk_free_gb, ollama_status, ollama_model,
                        sentry_active, backup_bucket_configured.
    """
    from sqlalchemy import text as _sa_text

    # --- DB latency: run SELECT 1 and measure round-trip ---
    db_latency_ms: float = -1.0
    try:
        _t0 = time.perf_counter()
        async with AsyncSessionLocal() as _hdb:
            await _hdb.execute(_sa_text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - _t0) * 1000, 1)
    except Exception as _db_err:
        logger.warning(f"DB latency check failed: {_db_err}")

    # --- Disk free space (where DB lives) ---
    _db_path = os.getenv("DATABASE_URL", "").replace("sqlite+aiosqlite:///", "")
    _disk_dir = os.path.dirname(_db_path) if _db_path else "/tmp"
    if not _disk_dir or not os.path.exists(_disk_dir):
        _disk_dir = "/tmp"
    try:
        _disk = shutil.disk_usage(_disk_dir)
        disk_free_gb = round(_disk.free / (1024 ** 3), 2)
    except Exception:
        disk_free_gb = -1.0

    # --- Ollama availability ---
    try:
        _ollama_ok = _check_ollama_available()
        ollama_status = "ok" if _ollama_ok else "unavailable"
    except Exception:
        ollama_status = "unavailable"
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:14b")

    # --- Ops flags ---
    sentry_active = bool(os.getenv("SENTRY_DSN", ""))
    backup_bucket_configured = bool(os.getenv("OPS_BACKUP_S3_BUCKET", ""))

    return {
        # Frozen interface fields (AB-081-004)
        "status": "ok",
        "service": "arthaBuild-api",
        "ai_ready": _ai_ready,
        "suitecloud_ready": _suitecloud_ready,
        "license_valid": _license_valid,
        "license_plan": _license_plan,
        # Phase 15 additions
        "db_latency_ms": db_latency_ms,
        "disk_free_gb": disk_free_gb,
        "ollama_status": ollama_status,
        "ollama_model": ollama_model,
        "sentry_active": sentry_active,
        "backup_bucket_configured": backup_bucket_configured,
    }


# === FastAPI Route ===
@app.post("/api/chatbot/process")
@limiter.limit("10/minute")
async def ask(request: Request, current_user: User = Depends(require_user)):
    start_time = time.time()
    async with AsyncSessionLocal() as _lic_db:
        _lic = await license_module.validate_license(_lic_db)
    if not _lic.get("valid"):
        raise HTTPException(status_code=402, detail=f"License required. Contact {license_module.SALES_EMAIL}")
    if not _ai_ready:
        return JSONResponse(
            content={"response": "AI service not yet configured. Phase 3 wires the LLM.",
                     "latency_ms": round((time.time() - start_time) * 1000)},
            status_code=503,
        )
    try:
        data = await request.json()
        # Accept "message" (Phase 4 frontend field) or legacy "prompt" field
        user_input = data.get("message") or data.get("prompt", "")
        intent = infer_intent(user_input)
        session_id = data.get("session_id", "default")
        chat_session_id = data.get("chat_session_id")  # Phase 9: DB persistence

        # Grab history BEFORE appending current message so follow-ups work
        history_snapshot = list(chat_sessions[session_id][-6:])

        # Pass intent + history into RAG state — generate_node uses them for
        # intent-aware prompts and follow-up awareness (no augmentation needed here)
        input_data = {
            "question": user_input,
            "documents": [],
            "generation": "",
            "rewrite_count": 0,
            "intent": intent,
            "history": history_snapshot,
        }

        result = await asyncio.to_thread(graph.invoke, input_data)
        response_text = (result.get("generation", "") if isinstance(result, dict) else "") or "I could not find a relevant answer. Please try rephrasing."

        # Track session history BEFORE "yes" check so we can look back at prior messages
        chat_sessions[session_id].append({"role": "user", "content": user_input})
        chat_sessions[session_id].append({"role": "assistant", "content": response_text})

        if user_input.strip().lower() == "yes":
            # Search backwards for the last assistant message containing code blocks (the SuiteScript)
            suitescript_msg = ""
            history = chat_sessions[session_id]
            for msg in reversed(history[:-2]):  # exclude the just-appended "yes" exchange
                if msg["role"] == "assistant" and "```" in msg["content"]:
                    suitescript_msg = msg["content"]
                    break
            if not suitescript_msg:
                response_text = "❌ No SuiteScript found to save. Please generate a script first, then type 'yes'."
            else:
                saved = save_generated_files(suitescript_msg, history[0]["content"])
                response_text = saved if saved else "❌ Failed to save files — no valid code blocks found."
            _resp = {"response": response_text, "intent": intent, "session_id": session_id, "latency_ms": round((time.time() - start_time) * 1000)}
            if chat_session_id:
                if not await _persist_chat_to_db(chat_session_id, user_input, response_text, intent):
                    _resp["persistence_warning"] = "Chat could not be saved to database"
            asyncio.create_task(_dispatch_webhook_safe("chat.completed", {
                "session_id": session_id,
                "user_email": current_user.email,
                "intent": intent,
            }))
            return JSONResponse(content=_resp)

        if intent == "fetch_netsuite_data":
            if not _suitecloud_ready:
                response_text = "❌ NetSuite data fetch requires SuiteCloud CLI to be configured. Please set up your NetSuite TBA credentials first."
            else:
                fetched = handle_netsuite_data_request(user_input)
                response_text = fetched if fetched else "❌ Could not retrieve NetSuite data. Please specify if you want to download a file or list SuiteScript metadata."
            _resp = {"response": response_text, "intent": intent, "session_id": session_id, "latency_ms": round((time.time() - start_time) * 1000)}
            if chat_session_id:
                if not await _persist_chat_to_db(chat_session_id, user_input, response_text, intent):
                    _resp["persistence_warning"] = "Chat could not be saved to database"
            asyncio.create_task(_dispatch_webhook_safe("chat.completed", {
                "session_id": session_id,
                "user_email": current_user.email,
                "intent": intent,
            }))
            return JSONResponse(content=_resp)

        if intent == "manage_sdf_project":
            if _suitecloud_ready:
                try:
                    handle_sdf_project(user_input)
                    response_text = "✅ SDF project operation executed based on your input."
                except BaseException as _sdf_err:
                    response_text = f"⚠️ SDF operation failed: {_sdf_err}"
            # If SuiteCloud not available, fall through and return the RAG answer
            _resp = {"response": response_text, "intent": intent, "session_id": session_id, "latency_ms": round((time.time() - start_time) * 1000)}
            if chat_session_id:
                if not await _persist_chat_to_db(chat_session_id, user_input, response_text, intent):
                    _resp["persistence_warning"] = "Chat could not be saved to database"
            asyncio.create_task(_dispatch_webhook_safe("chat.completed", {
                "session_id": session_id,
                "user_email": current_user.email,
                "intent": intent,
            }))
            return JSONResponse(content=_resp)

        if intent == "generate_suitescript":
            # Free-tier gate: check quota before serving the script
            from routers.license import validate_license, check_script_quota, record_script_generation
            async with AsyncSessionLocal() as _quota_db:
                _license_info = await validate_license(_quota_db)
                _plan = _license_info.get("plan") or "dev"
                _quota = await check_script_quota(_quota_db, current_user.id, _plan)
            if not _quota["allowed"]:
                _upgrade_msg = (
                    f"\U0001f6ab You've used all {_quota['limit']} free script generations this month. "
                    f"Upgrade to a paid plan \u2014 contact {os.getenv('SALES_EMAIL', 'sales@techcloudpro.com')} to get started."
                )
                _resp = {"response": _upgrade_msg, "intent": "generate_suitescript", "session_id": session_id, "latency_ms": round((time.time() - start_time) * 1000)}
                if chat_session_id:
                    await _persist_chat_to_db(chat_session_id, user_input, _upgrade_msg, "generate_suitescript")
                return JSONResponse(content=_resp, status_code=429)
            # Quota OK — record generation before returning the script
            async with AsyncSessionLocal() as _record_db:
                await record_script_generation(_record_db, current_user.id)

            # Send quota warning email when user has used limit-1 scripts (e.g. 4/5)
            try:
                _warn_used = _quota["used"] + 1  # +1 because we just recorded
                _warn_limit = _quota["limit"]
                if _warn_limit and _warn_used == _warn_limit - 1:
                    from email_utils import send_quota_warning_email
                    import asyncio as _warn_aio
                    _warn_aio.create_task(send_quota_warning_email(
                        current_user.email,
                        current_user.first_name or "there",
                        _warn_used,
                        _warn_limit,
                    ))
            except Exception as _qw_err:
                import logging as _log_qw
                _log_qw.getLogger(__name__).debug(f"quota warning email failed (non-fatal): {_qw_err}")

            if re.search(r"```(javascript|js|xml)", response_text, re.IGNORECASE):
                response_text += (
                "\n\n✅ Please review the generated SuiteScript and .xml file(s) above.\n"
                "If everything looks good, type 'yes' to save these files automatically.\n"
                "If you want any changes, describe them and I will regenerate the files."
            )

        # Phase 9: DB persistence — persist user + assistant messages when chat_session_id provided
        _resp = {"response": response_text, "intent": intent, "session_id": session_id, "latency_ms": round((time.time() - start_time) * 1000)}
        if chat_session_id:
            if not await _persist_chat_to_db(chat_session_id, user_input, response_text, intent):
                _resp["persistence_warning"] = "Chat could not be saved to database"

        # Phase 16: Dispatch chat.completed webhook (fire-and-forget — never crashes main request)
        asyncio.create_task(_dispatch_webhook_safe("chat.completed", {
            "session_id": session_id,
            "user_email": current_user.email,
            "intent": intent,
        }))

        return JSONResponse(content=_resp)

    except BaseException as e:
        logger.error("Error in /api/chatbot/process", exc_info=True)
        return JSONResponse(content={"detail": str(e)}, status_code=500)


# === Run ===
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_graceful_shutdown=30)