---
phase: 16-api-platform
verified: 2026-04-13T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "On chat-completed event, webhook dispatch now fires for all 5 intent branches (user_input==yes, fetch_netsuite_data, manage_sdf_project, generate_suitescript, general_chat)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "POST /api/v1/keys with valid JWT, then GET /api/v1/keys"
    expected: "Response body is {data: [...], error: null, meta: {version: 'v1', timestamp: '...'}}"
    why_human: "Confirms ResponseEnvelopeMiddleware is active on the live server and content-type detection works end-to-end under uvicorn/ASGI"
  - test: "Create an API key via POST /api/v1/keys, then call GET /api/chats with X-API-Key header set to the raw key value and no Authorization header"
    expected: "200 response with chat list — proves header captured -> SHA-256 hashed -> DB lookup -> user injected -> require_user() fallback returns user"
    why_human: "Full header-to-auth-to-endpoint trace requires a running server with a populated DB"
  - test: "POST /api/admin/webhooks with event='chat.completed', url pointing to a requestbin, secret='test'. Then send a message that triggers the 'yes' branch (SuiteScript save). Inspect requestbin."
    expected: "requestbin receives POST with X-ArthaBuild-Event: chat.completed and HMAC-signed payload — confirms the previously-missing branch now fires"
    why_human: "Webhook delivery requires an external receiver; newly fixed branches cannot be confirmed without a running server"
  - test: "Register webhook for script.deployed. Trigger a successful SuiteScript deploy. Inspect requestbin."
    expected: "POST arrives with X-ArthaBuild-Event: script.deployed, payload contains script_name, script_type, deploy_target, deploy_log"
    why_human: "Requires external webhook receiver and live NetSuite-connected deploy"
---

# Phase 16: API Platform Verification Report

**Phase Goal:** Third-party integrations can authenticate with API keys (not user JWTs). All endpoints are served under /api/v1/ with backward-compatible versioning. Webhook delivery notifies external systems on key events (chat completed, script deployed). All responses follow a standard envelope: {data, error, meta}.

**Verified:** 2026-04-13
**Status:** human_needed
**Re-verification:** Yes — after gap closure (gap: chat.completed dispatch missing from 3 intent branches)

---

## Gap Closure Verification

The previous verification identified one gap: `asyncio.create_task(_dispatch_webhook_safe("chat.completed", ...))` was only reachable from the general_chat and generate_suitescript paths. The `user_input == "yes"`, `fetch_netsuite_data`, and `manage_sdf_project` branches returned early without dispatching.

The fix added `asyncio.create_task(...)` before each early `return JSONResponse(content=_resp)` in all three branches. Line-by-line confirmation from `rawapi.py`:

| Branch | Dispatch lines | Return line | Order correct |
|--------|---------------|-------------|---------------|
| `user_input == "yes"` | 487-491 | 492 | Yes — dispatch before return |
| `intent == "fetch_netsuite_data"` | 504-508 | 509 | Yes — dispatch before return |
| `intent == "manage_sdf_project"` | 523-527 | 528 | Yes — dispatch before return |
| `intent == "generate_suitescript"` (falls through) | 545-549 | 551 | Yes — was already wired |
| general_chat (falls through) | 545-549 | 551 | Yes — was already wired |

All 5 branches confirmed in actual file. Dispatch fires before return in every case. Gap is closed.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | POST /api/v1/keys creates an API key for the authenticated user | VERIFIED | `routers/apikeys.py:64-96` — POST / on router with prefix `/api/v1/keys`, generates `secrets.token_urlsafe(32)`, stores SHA-256 hash, returns raw key ONCE |
| 2 | Requests bearing X-API-Key header are authenticated without a JWT | VERIFIED | `middleware/api_key_auth.py:37-95` — BaseHTTPMiddleware hashes header, queries `api_keys WHERE key_hash=hash AND is_active=True`, injects `User` into `request.state.api_key_user`; `auth_utils.py:144-146` — `require_user()` returns `api_key_user` before JWT decode |
| 3 | All /api/v1/ prefixed endpoints return the standard envelope: {data, error, meta} | VERIFIED | `middleware/response_envelope.py:28-92` — registered in `rawapi.py:242-243`; intercepts paths starting with `/api/v1/`, wraps 2xx as `{data, error:null, meta:{version,timestamp}}` and 4xx/5xx as `{data:null, error, meta}` |
| 4 | POST /api/admin/webhooks registers a webhook URL for a named event | VERIFIED | `routers/admin.py` — `@router.post("/webhooks")` (prefix `/api/admin`), validates event against `_VALID_WEBHOOK_EVENTS`, calls `register_webhook()` from `webhook_worker` |
| 5 | On chat-completed event, the webhook worker POSTs a signed payload to the registered URL | VERIFIED | `rawapi.py:487-491, 504-508, 523-527, 545-549` — all 5 intent branches (yes, fetch_netsuite_data, manage_sdf_project, generate_suitescript, general_chat) now call `asyncio.create_task(_dispatch_webhook_safe("chat.completed", {...}))` before their return statement |
| 6 | On script-deployed event, the webhook worker POSTs a signed payload to the registered URL | VERIFIED | `routers/deploy.py` — `_fire_deploy_webhook()` coroutine called via `asyncio.create_task()` inside `if success:` branch only; opens its own `AsyncSessionLocal`, calls `dispatch_webhook(db, "script.deployed", {...})` |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/backend/models.py` | APIKey model, WebhookEndpoint model | VERIFIED | `APIKey` (key_hash, name, is_active, last_used_at, user_id FK) and `WebhookEndpoint` (event, url, secret, is_active, user_id FK) both present |
| `src/backend/alembic/versions/16a_api_key_model.py` | Migration: api_keys + webhook_endpoints tables | VERIFIED | down_revision='14a_audit_hash_chain', creates both tables, render_as_batch pattern used per project rule |
| `src/backend/routers/apikeys.py` | CRUD endpoints for API key management | VERIFIED | POST / (create), GET / (list — no raw key returned), DELETE /{key_id} (soft-deactivate); all guarded by `Depends(require_user)` |
| `src/backend/middleware/api_key_auth.py` | Middleware: X-API-Key resolve and inject | VERIFIED | SHA-256 hash lookup (`api_key_auth.py:49`), `last_used_at` update (`api_key_auth.py:83`), `request.state.api_key_user = user` injection (`api_key_auth.py:94`), 401 on invalid/inactive key |
| `src/backend/auth_utils.py` | require_user() falls back to api_key_user | VERIFIED | `auth_utils.py:144-146`: `api_key_user = getattr(request.state, "api_key_user", None); if api_key_user is not None: return api_key_user` — executes before JWT path |
| `src/backend/middleware/response_envelope.py` | Middleware: wrap /api/v1/ responses | VERIFIED | Only intercepts `/api/v1/` + `application/json`; full body read, JSON parse, envelope wrap, Content-Length update (`response_envelope.py:84`) |
| `src/backend/webhook_worker.py` | dispatch_webhook + register_webhook | VERIFIED | `dispatch_webhook` queries `WebhookEndpoint` by event+is_active, signs with `hmac.new(..., hashlib.sha256)`, POSTs with `httpx.AsyncClient(timeout=10.0)`; `register_webhook` creates `WebhookEndpoint` row |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware/api_key_auth.py` | `models.py APIKey` | `SELECT FROM api_keys WHERE key_hash=sha256(header) AND is_active` | WIRED | `api_key_auth.py:54-60`: `select(APIKey).where(APIKey.key_hash == key_hash, APIKey.is_active == True)` |
| `auth_utils.py require_user()` | `request.state.api_key_user` | fallback branch when credentials is None | WIRED | `auth_utils.py:144-146`: executes before Bearer check — returns early on API key path |
| `rawapi.py /api/chatbot/process` | webhook worker | `asyncio.create_task(_dispatch_webhook_safe("chat.completed", payload))` | WIRED | All 5 branches confirmed: lines 487-491, 504-508, 523-527, 545-549 |
| `routers/deploy.py deploy endpoint` | webhook worker | `asyncio.create_task(_fire_deploy_webhook(...))` in `if success:` only | WIRED | Nested coroutine opens own `AsyncSessionLocal`, calls `dispatch_webhook(db, "script.deployed", {...})` |
| `rawapi.py` | `APIKeyAuthMiddleware` | `app.add_middleware(APIKeyAuthMiddleware)` after CORSMiddleware | WIRED | `rawapi.py:238-239` |
| `rawapi.py` | `ResponseEnvelopeMiddleware` | `app.add_middleware(ResponseEnvelopeMiddleware)` | WIRED | `rawapi.py:242-243` |
| `rawapi.py` | `apikeys_router` | `app.include_router(apikeys_router)` | WIRED | `rawapi.py:277-278` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| API-01 | 16-01-PLAN.md | API key authentication for third-party integrations | SATISFIED | APIKeyAuthMiddleware + require_user fallback fully implemented and wired |
| API-02 | 16-01-PLAN.md | /api/v1/ versioned routing with backward compatibility | SATISFIED | /api/v1/keys router + /api/v1/chats alias via add_api_route loop in rawapi.py; legacy /api/chats unchanged |
| API-03 | 16-01-PLAN.md | Webhook delivery on key events | SATISFIED | script.deployed wired in deploy.py; chat.completed now wired in all 5 branches of /api/chatbot/process |
| API-04 | 16-01-PLAN.md | Standard response envelope {data, error, meta} on /api/v1/ | SATISFIED | ResponseEnvelopeMiddleware verified at response_envelope.py:28-92, registered rawapi.py:242-243 |

Note: API-01 through API-04 are plan-internal requirement IDs. They have no corresponding entries in `.planning/REQUIREMENTS.md` (the product PRD predates the API platform phase). No orphaned REQUIREMENTS.md entries map to Phase 16.

---

### Anti-Patterns Found

None. The three previously-flagged early-return-without-dispatch instances at lines 487, 499, 513 have been resolved. No placeholder/TODO/stub anti-patterns found in any Phase 16 artifact.

---

### Human Verification Required

All automated checks pass. The following items require a running server to confirm end-to-end behavior.

#### 1. Response Envelope End-to-End

**Test:** Authenticate via POST /api/auth/login. POST to /api/v1/keys with `{"name": "test"}`. GET /api/v1/keys with the returned JWT.
**Expected:** Response body is `{"data": [...], "error": null, "meta": {"version": "v1", "timestamp": "...ISO..."}}`.
**Why human:** Confirms ResponseEnvelopeMiddleware activates under real uvicorn/ASGI stack and content-type routing logic functions correctly.

#### 2. X-API-Key Header Auth Flow

**Test:** Create an API key (JWT auth). Copy the raw key from the response. Send GET /api/chats with header `X-API-Key: <raw_key>` and no Authorization header.
**Expected:** 200 response with chat list — proves the full chain: header captured -> SHA-256 hashed -> DB lookup -> user injected -> require_user() fallback returns user.
**Why human:** Requires a running server with a populated DB; cannot trace dynamically resolved request.state statically.

#### 3. Webhook Delivery: chat.completed (previously missing branches)

**Test:** Register a webhook via POST /api/admin/webhooks (admin JWT, event=chat.completed, url=requestbin, secret=testsecret). Send a message that results in the `"yes"` branch (first generate a SuiteScript, then reply "yes"). Inspect the requestbin.
**Expected:** POST arrives with `X-ArthaBuild-Event: chat.completed` and `X-ArthaBuild-Signature` headers. Confirms the previously-missing branch now fires.
**Why human:** The fixed dispatch calls are in branches that require SuiteCloud-ready environment or specific input patterns; cannot be triggered statically.

#### 4. Webhook Delivery: script.deployed

**Test:** Register a webhook for script.deployed. Trigger a successful SuiteScript deploy via the deploy endpoint. Inspect the requestbin.
**Expected:** POST arrives with `X-ArthaBuild-Event: script.deployed`. Payload contains `script_name`, `script_type`, `deploy_target`, `deploy_log`.
**Why human:** Requires external webhook receiver and a live NetSuite-connected deploy.

---

### Gaps Summary

No automated gaps remain. The one gap from the initial verification (chat.completed webhook missing from 3 of 5 intent branches) is confirmed closed. All 5 branches of `/api/chatbot/process` now call `asyncio.create_task(_dispatch_webhook_safe("chat.completed", {...}))` before returning. Ordering is correct in each case: dispatch fires before the `return JSONResponse(...)` statement.

Phase goal is fully achieved at the code level. Four human verification items remain to confirm live-server behavior but none represent code defects.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
