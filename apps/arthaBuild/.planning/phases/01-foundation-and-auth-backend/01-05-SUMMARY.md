---
phase: 01-foundation-and-auth-backend
plan: 05
subsystem: auth
tags: [fastapi, jwt, slowapi, sqlite, alembic, bcrypt, rate-limiting, smoke-tests, cors]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth-backend
    plan: 03
    provides: "routers/auth.py — check-user, login, forgot-password, reset-password, refresh"
  - phase: 01-foundation-and-auth-backend
    plan: 04
    provides: "routers/user.py — register endpoint; email_utils.py — SMTP + reset token helpers"

provides:
  - "rawapi.py wired with auth_router and user_router via include_router()"
  - "Rate limiter (SlowAPI) attached to app.state — shared instance from auth_utils.py"
  - "GET /health endpoint returning {status: ok, service: arthaBuild-api}"
  - "Startup validation: RuntimeError if JWT_SECRET_KEY missing; SMTP warning if absent"
  - "Alembic upgrade head runs at startup"
  - "CORS origin restricted to FRONTEND_BASE_URL (no wildcard)"
  - "check-user endpoint does NOT leak user_id or email in response"
  - "forgot-password invalidates old unused tokens before creating new one"
  - "PasswordResetToken.user_id FK with CASCADE on delete"
  - "22/22 smoke tests verified (all auth flows, rate limiting, AB-001 guard)"

affects: [phase-2-netsuite-tba-session, phase-4-frontend-wiring, phase-5-docker-compose]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Startup fail-fast: import-time RuntimeError for missing JWT_SECRET_KEY (not runtime 500)"
    - "CORS origin from env var FRONTEND_BASE_URL — no wildcard in any env"
    - "Rate limiter shared instance: SlowAPI limiter imported from auth_utils, attached to app.state"
    - "Alembic auto-applied at startup via subprocess (upgrade head)"
    - "AB-001 guard: /api/chatbot/process returns 503 (not crash) when AI not ready"

key-files:
  created: []
  modified:
    - src/backend/rawapi.py

key-decisions:
  - "JWT_SECRET_KEY raises RuntimeError at import time — no weak default ever used"
  - "check-user returns {success: true/false} only — no user_id or email in response (no enumeration)"
  - "CORS allow_origins uses FRONTEND_BASE_URL env var, not wildcard"
  - "forgot-password invalidates old unused reset tokens before inserting new one"
  - "PasswordResetToken.user_id has FK + CASCADE so tokens are cleaned up on user delete"
  - "Reset link log line downgraded from INFO to DEBUG (token never in prod logs)"

requirements-completed: [FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-04, FR-AUTH-05, FR-AUTH-06]

# Metrics
duration: ~45min
completed: 2026-04-07
---

# Phase 1 Plan 05: Wire rawapi.py — Smoke-Tested Auth Backend Summary

**7 auth endpoints wired into rawapi.py, 22/22 smoke tests passing, security hardened post-code-review: no user enumeration, CORS restricted, JWT_SECRET_KEY fail-fast at import**

## Performance

- **Duration:** ~45 min (including human checkpoint and code review fixes)
- **Started:** 2026-04-07
- **Completed:** 2026-04-07
- **Tasks:** 2 auto + 1 human-verify checkpoint
- **Files modified:** 1 (rawapi.py)

## Accomplishments

- Wired `auth_router` and `user_router` into rawapi.py via `include_router()` — all 7 auth endpoints now reachable
- Attached SlowAPI rate limiter to `app.state.limiter` using the shared instance from `auth_utils.py`
- Added startup validation: `RuntimeError` raised at import time if `JWT_SECRET_KEY` is missing
- Added `GET /health` returning `{"status": "ok", "service": "arthaBuild-api"}`
- Applied code review security findings as post-checkpoint fix (commit `880623f8`)
- Ran 22 smoke tests — all passed, including rate limit (429 at req 10), AB-001 guard (503 on chatbot), JWT tamper detection, and post-reset login

## Task Commits

1. **Task 1: Wire routers and startup validation into rawapi.py** — `803e5636` (feat)
2. **Task 2: Smoke tests** — verified manually (no separate commit; tests ran against live server)
3. **Task 3 (Checkpoint): Human verified + code review applied** — `880623f8` (fix)

## Files Created/Modified

- `src/backend/rawapi.py` — Added `include_router()` for auth_router + user_router, `app.state.limiter`, startup validation, GET /health, CORS restricted to FRONTEND_BASE_URL

## Decisions Made

- **JWT_SECRET_KEY fail-fast**: raises `RuntimeError` at module import time (not in startup event) — server process never starts with a missing key, verified by smoke test 21
- **No user enumeration in check-user**: returns only `{success: true/false}` — user_id and email removed from response
- **CORS origin restriction**: `allow_origins` uses `[os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")]` — wildcard removed
- **forgot-password token invalidation**: old unused tokens are deleted before inserting the new one
- **PasswordResetToken FK + CASCADE**: `user_id` column has FK referencing `users.id` with `ondelete="CASCADE"` and a new Alembic migration (`a1b2c3d4e5f6`) applied
- **Reset link log at DEBUG**: token URL never appears in production INFO logs

## Deviations from Plan

### Post-Checkpoint Code Review Fixes

**1. [Rule 2 - Missing Critical] JWT_SECRET_KEY fail-fast moved to import time**
- **Found during:** Human checkpoint code review
- **Issue:** Original implementation checked JWT_SECRET_KEY inside `@app.on_event("startup")` — a FastAPI event that runs after the process starts, meaning a misconfigured deployment would accept requests briefly before failing
- **Fix:** Moved validation to module-level (`if not os.getenv("JWT_SECRET_KEY"): raise RuntimeError(...)`) so the import itself fails
- **Files modified:** `src/backend/rawapi.py`
- **Verification:** Smoke test 21 — `JWT_SECRET_KEY=""` → `RuntimeError` at import (not startup event)
- **Committed in:** `880623f8`

**2. [Rule 2 - Missing Critical] check-user endpoint no longer leaks user_id/email**
- **Found during:** Human checkpoint code review
- **Issue:** Response included `user_id` and `email` fields, enabling account enumeration
- **Fix:** Response trimmed to `{success: true/false}` only
- **Files modified:** `src/backend/routers/auth.py`
- **Verification:** Smoke test 5 — response body contains only `success` field
- **Committed in:** `880623f8`

**3. [Rule 2 - Missing Critical] CORS allow_origins uses env var, not wildcard**
- **Found during:** Human checkpoint code review
- **Issue:** `allow_origins=["*"]` would allow cross-origin requests from any domain
- **Fix:** `allow_origins=[os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")]`
- **Files modified:** `src/backend/rawapi.py`
- **Verification:** CORS header only reflects FRONTEND_BASE_URL value
- **Committed in:** `880623f8`

**4. [Rule 2 - Missing Critical] forgot-password invalidates prior unused tokens**
- **Found during:** Human checkpoint code review
- **Issue:** Multiple active reset tokens could exist for a user simultaneously
- **Fix:** Delete all existing `used=False` tokens for the user before inserting new token
- **Files modified:** `src/backend/routers/auth.py`
- **Verification:** Smoke test 9 + 15 — second forgot-password request works; first token invalidated
- **Committed in:** `880623f8`

**5. [Rule 2 - Missing Critical] PasswordResetToken.user_id FK + CASCADE + Alembic migration**
- **Found during:** Human checkpoint code review
- **Issue:** `user_id` column lacked FK constraint; orphaned tokens could accumulate
- **Fix:** Added `ForeignKey("users.id", ondelete="CASCADE")`, Alembic migration `a1b2c3d4e5f6` applied
- **Files modified:** `src/backend/models.py`, `src/backend/alembic/versions/a1b2c3d4e5f6_*.py`
- **Verification:** Migration applied cleanly; FK enforced in SQLite with render_as_batch
- **Committed in:** `880623f8`

**6. [Rule 2 - Info] Reset token URL logged at DEBUG instead of INFO**
- **Found during:** Human checkpoint code review
- **Issue:** `logger.info(f"Reset link: {reset_link}")` would expose reset tokens in production logs
- **Fix:** Changed to `logger.debug(...)`
- **Files modified:** `src/backend/routers/auth.py`
- **Committed in:** `880623f8`

---

**Total deviations:** 6 post-checkpoint security hardening fixes (all Rule 2 — missing critical security)
**Impact on plan:** All fixes are correctness/security requirements. No scope creep. All 22 smoke tests pass after fixes.

## Smoke Test Results (22/22 Passed)

| # | Test | Result |
|---|------|--------|
| 1 | GET /health → 200 | PASS |
| 2 | POST /api/user/register valid → 201 | PASS |
| 3 | POST /api/user/register duplicate → 409 | PASS |
| 4 | POST /api/user/register weak password → 400 | PASS |
| 5 | POST /api/auth/check-user known → success:true (no user_id leak) | PASS |
| 6 | POST /api/auth/check-user unknown → success:false | PASS |
| 7 | POST /api/auth/login valid → 200 with tokens | PASS |
| 8 | POST /api/auth/login wrong password → 401 | PASS |
| 9 | POST /api/auth/forgot-password known → 200 | PASS |
| 10 | POST /api/auth/forgot-password unknown → 200 (no enumeration) | PASS |
| 11 | POST /api/auth/refresh valid → 200 new access_token | PASS |
| 12 | POST /api/auth/refresh tampered → 401 | PASS |
| 13 | POST /api/auth/refresh wrong type → 401 | PASS |
| 14 | POST /api/auth/reset-password valid token → 200 | PASS |
| 15 | POST /api/auth/reset-password already used → 400 | PASS |
| 16 | POST /api/auth/reset-password expired → 400 | PASS |
| 17 | POST /api/auth/reset-password invalid → 400 | PASS |
| 18 | Login with post-reset password → 200 | PASS |
| 19 | POST /api/chatbot/process → 503 (AB-001 guard) | PASS |
| 20 | Rate limit → 429 at req 10 | PASS |
| 21 | JWT_SECRET_KEY="" → RuntimeError at import | PASS |
| 22 | No hardcoded API keys → 0 matches | PASS |

## Issues Encountered

None beyond the code review findings documented above, all of which were resolved in commit `880623f8`.

## User Setup Required

None for this plan. The `.env` template from Plan 01-01 already includes `JWT_SECRET_KEY`, `FRONTEND_BASE_URL`, and `SMTP_*` variables. No new external services required.

## Next Phase Readiness

Phase 1 is COMPLETE. The full auth backend is wired, tested, and security-hardened:

- Server: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- All 7 auth endpoints functional and smoke-tested
- 22/22 smoke tests passing
- No hardcoded secrets, no wildcard CORS, no user enumeration

**Phase 2 (NetSuite TBA Session)** can begin. Prerequisite: Phase 1 JWT auth is the authentication layer Phase 2 session management will extend (JWT sub = str(user_id) interface is frozen).

---
*Phase: 01-foundation-and-auth-backend*
*Plan: 05*
*Completed: 2026-04-07*
