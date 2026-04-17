---
id: CASE-062
title: "POST /api/auth/refresh returns 401 for tampered/fake refresh token"
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
feature: "POST /api/auth/refresh (signature verification)"
test_ref: "tests/test_auth.py::test_refresh_tampered_token_returns_401"
files:
  - path: src/backend/auth_utils.py
    lines: "55-80"
---

## Why This Case Was Created
Verifies that a JWT with an invalid signature — either fabricated or tampered — is rejected with HTTP 401, confirming that HMAC-SHA256 signature verification is enforced.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/auth_utils.py:55-80` — confirm `jwt.decode()` is called with the application `JWT_SECRET_KEY` and algorithm `HS256`; the `algorithms` parameter must be an explicit list (not `None`) to prevent algorithm confusion attacks
- Confirm `jwt.InvalidSignatureError` (or the parent `jwt.InvalidTokenError`) is caught and re-raised as `HTTPException(401)`

## Why It Was Done This Way (Root Cause)
PyJWT recomputes the HMAC-SHA256 signature of the received header+payload using the application `JWT_SECRET_KEY` and compares it to the signature in the token. If they differ (because the token was forged with a different key or the payload was modified), `jwt.InvalidSignatureError` is raised. `decode_token()` in `auth_utils.py:55-80` catches `jwt.InvalidTokenError` (parent class) and raises `HTTPException(401)`.

## What Is Done Right
The test submits a token whose payload has been base64-decoded, modified (e.g., user_id changed), and re-encoded without a valid signature. It asserts a 401 response, confirming that payload tampering is detected rather than silently accepted. This specifically tests the cryptographic integrity check rather than just format validation.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_refresh_tampered_token_returns_401 -v
```
If failing, check:
1. Has `jwt.decode()` been called with `algorithms=None` or `options={"verify_signature": False}`?
2. Is the correct `JWT_SECRET_KEY` being passed to `jwt.decode()` in the test environment?

## Architecture Mapping

**Layer:** Auth Utilities

**Flow:**
    [POST /api/auth/refresh {"refresh_token": "<tampered_jwt>"}]
      → routers/auth.py:refresh_token()
        → auth_utils.py:decode_token()
          → jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            → signature mismatch → raises InvalidSignatureError
        → except InvalidTokenError: raise HTTPException(401)
          → HTTP 401 ← THIS TEST COVERS THIS

**Upstream:** Attacker who obtained a valid token and tried to escalate privileges by changing the user_id in the payload
**Downstream:** No access token is issued; the attacker cannot impersonate another user.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_refresh_tampered_token_returns_401 -v`

## Downstream Impact
**Impact if unfixed:** Any user can forge a JWT claiming to be any other user (including admins) by modifying the payload without a valid signature, leading to complete authorization bypass.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-061, CASE-063
