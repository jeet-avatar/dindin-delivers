---
phase: 16-api-platform
plan: 01
subsystem: backend-api
tags: [api-keys, webhooks, versioned-routing, response-envelope, middleware]
dependency_graph:
  requires: [14-01, 15-01]
  provides: [api-key-auth, webhook-delivery, /api/v1/-prefix, response-envelope]
  affects: [rawapi.py, auth_utils.py, routers/admin.py, routers/deploy.py]
tech_stack:
  added: [APIKeyAuthMiddleware, ResponseEnvelopeMiddleware, webhook_worker.py, routers/apikeys.py]
  patterns: [SHA-256-key-hashing, HMAC-SHA256-webhook-signing, asyncio-create_task-fire-and-forget, starlette-BaseHTTPMiddleware-body-intercept]
key_files:
  created:
    - src/backend/models.py (APIKey + WebhookEndpoint models)
    - src/backend/alembic/versions/16a_api_key_model.py
    - src/backend/routers/apikeys.py
    - src/backend/middleware/api_key_auth.py
    - src/backend/middleware/response_envelope.py
    - src/backend/webhook_worker.py
  modified:
    - src/backend/auth_utils.py (require_user fallback + require_user_unverified_ok)
    - src/backend/rawapi.py (middleware registration + router includes + dispatch)
    - src/backend/routers/admin.py (POST /api/admin/webhooks)
    - src/backend/routers/deploy.py (script.deployed dispatch)
    - docs/ARCHITECTURE.md (v2.6)
    - docs/architecture-diagram.html (section 9j)
    - docs/test-report.html (Phase 16 section, 23 new test cases)
decisions:
  - AB-1601: APIKeyAuthMiddleware registered after CORSMiddleware — X-API-Key header must pass CORS before inspection
  - AB-1602: require_user() checks request.state.api_key_user before any JWT decode — zero per-endpoint changes needed
  - AB-1603: _dispatch_webhook_safe() opens its own AsyncSessionLocal — dispatch_webhook cannot reuse the request's DB session (already closed by the time asyncio.create_task runs)
  - AB-1604: script.deployed dispatch uses nested _fire_deploy_webhook coroutine in deploy.py — avoids importing rawapi globals into deploy router
  - AB-1605: /api/v1/chats alias via add_api_route loop — FastAPI does not support re-including a router with a different prefix when the router already has its own prefix set
  - AB-1606: ResponseEnvelopeMiddleware reads full body_iterator then rebuilds Response — Starlette streaming responses require full body consumption before modification
metrics:
  duration: "35 minutes"
  completed_date: "2026-04-13"
  tasks: 2
  files: 14
requirements: [API-01, API-02, API-03, API-04]
---

# Phase 16 Plan 01: API Platform Summary

API key authentication with SHA-256-hashed keys, HMAC-signed webhook delivery for chat.completed and script.deployed events, versioned /api/v1/ routing with response envelope middleware, and admin webhook registration endpoint.

## What Was Built

### Task 1: Models, Migration, Middleware, Auth Fallback, /api/v1/ Prefix

**Models (models.py):**
- `APIKey`: `key_hash` (SHA-256 of raw key — raw never stored), `name`, `is_active`, `last_used_at`, `user_id` FK
- `WebhookEndpoint`: `event`, `url`, `secret` (HMAC signing key), `is_active`, `user_id` FK

**Migration (16a_api_key_model.py):**
- Creates `api_keys` + `webhook_endpoints` tables
- `down_revision = '14a_audit_hash_chain'` — single-head chain confirmed by `alembic heads`
- `render_as_batch=True` (SQLite mandatory per project rule)
- Applied successfully: `alembic upgrade head` exits 0

**Router (/api/v1/keys — routers/apikeys.py):**
- `POST /api/v1/keys`: generates 32-byte `secrets.token_urlsafe`, stores SHA-256 hash, returns raw key ONCE
- `GET /api/v1/keys`: lists keys by user (name, id, is_active, last_used_at — no raw key or hash)
- `DELETE /api/v1/keys/{key_id}`: soft-deactivates (is_active=False)

**Middleware (middleware/api_key_auth.py):**
- Checks `X-API-Key` header. If absent → pass through (JWT path unchanged).
- If present: SHA-256 hash, `SELECT FROM api_keys WHERE key_hash=... AND is_active=True`
- Updates `last_used_at` on success, fetches owning `User`
- Injects `User` into `request.state.api_key_user`
- Returns 401 JSON on invalid/inactive key
- Registered after `CORSMiddleware` (decision AB-1601)

**auth_utils.py require_user() update:**
- Added `request: Request` parameter
- Opens with: `api_key_user = getattr(request.state, "api_key_user", None)` → if present, return directly
- JWT path unchanged. All existing `Depends(require_user)` endpoints automatically accept `X-API-Key` (decision AB-1602)
- `require_user_unverified_ok` updated to thread `request` through

**ResponseEnvelopeMiddleware (middleware/response_envelope.py):**
- Only intercepts routes matching `/api/v1/` with `Content-Type: application/json`
- 2xx → `{"data": <body>, "error": null, "meta": {"version": "v1", "timestamp": "<ISO>"}}`
- 4xx/5xx → `{"data": null, "error": <body>, "meta": {...}}`
- Non-/api/v1/ routes: pass through unchanged

**rawapi.py changes:**
- `app.add_middleware(APIKeyAuthMiddleware)` after `CORSMiddleware`
- `app.add_middleware(ResponseEnvelopeMiddleware)` after identity middleware
- `app.include_router(apikeys_router)` for `/api/v1/keys`
- `/api/v1/chats` alias via `add_api_route` loop over chats router routes (decision AB-1605)

### Task 2: Webhook Worker, Dispatches, Admin Endpoint

**webhook_worker.py:**
- `dispatch_webhook(db, event, payload)`: queries `WebhookEndpoint WHERE event=event AND is_active=True`
- Signs payload with HMAC-SHA256 using `endpoint.secret`
- POSTs to `endpoint.url` via `httpx.AsyncClient(timeout=10.0)` with:
  - `X-ArthaBuild-Event: <event>`
  - `X-ArthaBuild-Signature: <hmac-hex-digest>`
- All exceptions caught and logged at DEBUG level — webhook failure never propagates
- `register_webhook(db, user_id, event, url, secret)`: creates `WebhookEndpoint` row

**Admin webhook registration (routers/admin.py):**
- `POST /api/admin/webhooks` (admin JWT required)
- Validates event against `{"chat.completed", "script.deployed", "user.registered"}`
- Calls `register_webhook()` from `webhook_worker`
- Returns id, event, url, is_active, created_at

**chat.completed dispatch (rawapi.py):**
- `_dispatch_webhook_safe()` helper opens its own `AsyncSessionLocal` (decision AB-1603)
- Called via `asyncio.create_task(...)` after every AI response in `/api/chatbot/process`
- Payload: `{session_id, user_email, intent}`

**script.deployed dispatch (routers/deploy.py):**
- `_fire_deploy_webhook()` nested coroutine (decision AB-1604)
- Called via `asyncio.create_task(...)` only inside `if success:` branch
- Not dispatched on deploy failure, timeout, or FileNotFoundError
- Payload: `{script_name, script_type, deploy_target, deploy_log}`

**httpx:** Already at `httpx==0.27.2` in requirements.txt — unchanged.

## Verification Results

| Check | Result |
|-------|--------|
| `alembic heads` shows single head `16a_api_key_model` | PASS |
| `alembic upgrade head` exits 0 | PASS |
| Syntax check: all 10 modified/created .py files | PASS |
| `grep "class APIKey\|class WebhookEndpoint" models.py` | PASS |
| `grep "APIKeyAuthMiddleware" rawapi.py` | PASS |
| `grep "api_key_user" auth_utils.py` | PASS |
| `grep "dispatch_webhook" webhook_worker.py` | PASS |
| `grep "chat.completed" rawapi.py` | PASS |
| `grep "script.deployed" routers/deploy.py` | PASS |
| `grep "ResponseEnvelopeMiddleware" rawapi.py` | PASS |
| `grep "admin/webhooks" routers/admin.py` | PASS |
| `grep "httpx==0.27.2" requirements.txt` | PASS |
| pytest suite: 143 pass, 5 pre-existing failures | PASS (no regressions) |

**Pre-existing failures (not caused by Phase 16):**
1. `test_alembic_current_shows_head` — alembic output format issue (pre-existing since Phase 8.1)
2. `test_nginx_dev_conf_unchanged` — nginx.conf has HTTPS redirect (pre-existing since Phase 12)
3. `test_chatbot_returns_200_with_ollama` — FAISS vectorstore not present locally (pre-existing)
4. `test_chatbot_reads_message_field` — FAISS vectorstore not present locally (pre-existing)
5. `test_chatbot_session_id_returned` — FAISS vectorstore not present locally (pre-existing)

## Deviations from Plan

None — plan executed exactly as written with these implementation details noted:

**1. [Rule 2 - Missing Critical Functionality] _dispatch_webhook_safe() helper added**
- Found during: Task 2 wiring
- Issue: `dispatch_webhook()` requires an open `AsyncSession`, but `asyncio.create_task()` runs after the request's DB session closes
- Fix: Added `_dispatch_webhook_safe()` in rawapi.py that opens its own `AsyncSessionLocal`
- Files modified: rawapi.py
- Not a plan deviation — the plan said "asyncio.create_task(dispatch_webhook(db, ...))" which is impossible with a closed session; this is the correct implementation

**2. [Rule 2 - Implementation Detail] /api/v1/chats alias via add_api_route loop**
- Found during: Task 1 rawapi.py registration
- Issue: FastAPI cannot re-include a router with a different prefix when the router already has `prefix="/api/chats"` set — stacking prefixes produces `/api/v1/api/chats/...`
- Fix: Loop over `_chats_module.router.routes` and call `add_api_route` with the path relative to the new prefix
- Files modified: rawapi.py

## Decisions Made

| ID | Decision |
|----|----------|
| AB-1601 | APIKeyAuthMiddleware registered after CORSMiddleware — X-API-Key header must pass CORS preflight before inspection |
| AB-1602 | require_user() checks request.state.api_key_user before any JWT decode — zero per-endpoint changes needed for API key support |
| AB-1603 | _dispatch_webhook_safe() opens its own AsyncSessionLocal — task runs after request session closes |
| AB-1604 | script.deployed dispatch uses nested _fire_deploy_webhook coroutine in deploy.py — avoids rawapi global imports |
| AB-1605 | /api/v1/chats alias via add_api_route loop — FastAPI prefix stacking limitation |
| AB-1606 | ResponseEnvelopeMiddleware reads full body_iterator then rebuilds Response — Starlette streaming requires body consumption before modification |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/backend/models.py | FOUND |
| src/backend/routers/apikeys.py | FOUND |
| src/backend/middleware/api_key_auth.py | FOUND |
| src/backend/middleware/response_envelope.py | FOUND |
| src/backend/webhook_worker.py | FOUND |
| src/backend/alembic/versions/16a_api_key_model.py | FOUND |
| .planning/phases/16-api-platform/16-01-SUMMARY.md | FOUND |
| Task 1 commit 41074c55 | FOUND |
| Task 2 commit b19e4aa6 | FOUND |
