---
id: CASE-061
title: "POST /api/auth/refresh returns 401 for expired refresh token"
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
feature: "POST /api/auth/refresh (expiry check)"
test_ref: "tests/test_auth.py::test_refresh_expired_token_returns_401"
files:
  - path: src/backend/routers/auth.py
    lines: "220-228"
---

## Why This Case Was Created
Verifies that an expired refresh token is rejected with HTTP 401, forcing the user to re-authenticate rather than silently accepting stale credentials.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:220-228` — confirm `jwt.ExpiredSignatureError` (raised by PyJWT when `exp` is in the past) is caught and re-raised as `HTTPException(401)`
- Confirm the `jwt.decode()` call does NOT pass `options={"verify_exp": False}` which would bypass expiry checks

## Why It Was Done This Way (Root Cause)
PyJWT's `jwt.decode()` automatically validates the `exp` claim and raises `jwt.ExpiredSignatureError` if the token is past its expiry. The handler at `routers/auth.py:220-228` catches this exception and raises `HTTPException(401, "Token has expired")`. This terminates the refresh attempt cleanly without exposing internal exception details.

## What Is Done Right
The test creates a refresh token with a past `exp` claim (by directly encoding a JWT with a backdated expiry using the test secret key) and asserts a 401 response. This avoids time-dependent sleeping in tests and directly exercises the expiry code path.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_refresh_expired_token_returns_401 -v
```
If failing, check:
1. Is `jwt.ExpiredSignatureError` being caught separately from `jwt.InvalidTokenError`? Both should result in 401.
2. Has `options={"verify_exp": False}` been accidentally added to the `jwt.decode()` call?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/refresh {"refresh_token": "<expired_jwt>"}]
      → routers/auth.py:refresh_token()
        → auth_utils.py:decode_token()
          → jwt.decode() → raises ExpiredSignatureError
        → except ExpiredSignatureError: raise HTTPException(401)
          → HTTP 401 ← THIS TEST COVERS THIS

**Upstream:** Frontend refresh call with a 7-day-old refresh token that was never renewed
**Downstream:** Frontend must redirect user to login page on 401 from refresh endpoint.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_refresh_expired_token_returns_401 -v`

## Downstream Impact
**Impact if unfixed:** Expired refresh tokens remain valid indefinitely; a stolen refresh token grants permanent access without any expiry enforcement.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-060, CASE-062
