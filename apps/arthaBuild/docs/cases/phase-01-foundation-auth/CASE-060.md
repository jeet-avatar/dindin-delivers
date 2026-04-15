---
id: CASE-060
title: "POST /api/auth/refresh returns new access token for valid refresh token"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/auth/refresh"
test_ref: "tests/test_auth.py::test_refresh_valid_token"
files:
  - path: src/backend/routers/auth.py
    lines: "215-240"
  - path: src/backend/auth_utils.py
    lines: "55-80"
---

## Why This Case Was Created
Verifies the happy path of token refresh: a valid, unexpired refresh token is accepted and a new access token is issued, allowing sessions to persist without re-authentication.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:215-240` — confirm `refresh_token()` calls `decode_token(type='refresh')`, extracts `sub` (user_id), and calls `create_access_token(user_id)`
- `src/backend/auth_utils.py:55-80` — confirm `decode_token()` validates the JWT signature and checks `payload['token_type'] == 'refresh'`

## Why It Was Done This Way (Root Cause)
The `refresh_token()` handler at `routers/auth.py:215-240` calls `decode_token(token, expected_type='refresh')` from `auth_utils.py:55-80`. `decode_token()` uses `jwt.decode()` (PyJWT, HMAC-SHA256) with the application `JWT_SECRET_KEY` and then asserts `payload['token_type'] == 'refresh'`. On success it extracts `sub=str(user_id)` and calls `create_access_token(user_id)` to issue a new 24-hour access JWT.

## What Is Done Right
The test logs in to obtain a real refresh token, submits it to the refresh endpoint, and asserts: (1) the response is 200, (2) the response contains an `access_token` field, and (3) the new access token can be used to call a protected endpoint. This three-step assertion proves the full token lifecycle, not just that the endpoint responds.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_refresh_valid_token -v
```
If failing, check:
1. Is `JWT_SECRET_KEY` set in the test environment? The token will decode correctly only with the same key used to sign it.
2. Has the refresh token expiry been set too short in the test fixture, causing an immediate expiry before the refresh call?

## Architecture Mapping

**Layer:** Backend Router + Auth Utilities

**Flow:**
    [POST /api/auth/refresh {"refresh_token": "<valid_jwt>"}]
      → routers/auth.py:refresh_token()
        → auth_utils.py:decode_token(type='refresh')
          → jwt.decode() → payload {sub, token_type='refresh'}
        → create_access_token(user_id)
          → HTTP 200 {"access_token": "<new_jwt>"} ← THIS TEST COVERS THIS

**Upstream:** Frontend detects 401 on expired access token → calls /api/auth/refresh automatically
**Downstream:** All protected API endpoints rely on the refreshed access token; if this fails users must re-login every 24 hours.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_refresh_valid_token -v`

## Downstream Impact
**Impact if unfixed:** User sessions expire every 24 hours with no silent refresh capability, degrading UX significantly and requiring constant re-authentication.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-059, CASE-061, CASE-062, CASE-063
