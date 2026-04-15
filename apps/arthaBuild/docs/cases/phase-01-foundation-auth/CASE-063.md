---
id: CASE-063
title: "POST /api/auth/refresh rejects access token used as refresh (wrong type)"
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
feature: "POST /api/auth/refresh (token_type check)"
test_ref: "tests/test_auth.py::test_refresh_access_token_as_refresh_rejected"
files:
  - path: src/backend/auth_utils.py
    lines: "60-70"
---

## Why This Case Was Created
Verifies that submitting a valid access token to the refresh endpoint is rejected with HTTP 401, preventing access tokens (24-hour lifetime) from being used in place of refresh tokens (7-day lifetime).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/auth_utils.py:60-70` — confirm `decode_token()` checks `payload.get('token_type') == expected_type` and raises `HTTPException(401)` if the type does not match

## Why It Was Done This Way (Root Cause)
`decode_token()` in `auth_utils.py:60-70` accepts an `expected_type` parameter. After successful JWT signature verification, it reads `payload['token_type']` and compares it to `expected_type`. The refresh endpoint passes `expected_type='refresh'`; access tokens have `token_type='access'`. A mismatch raises `HTTPException(401, "Invalid token type")`. This prevents a token type confusion attack where the shorter-lived access token is submitted to obtain a new access token, effectively making it immortal.

## What Is Done Right
The test logs in to obtain a real access token (with a valid signature), submits it to the refresh endpoint, and asserts 401. This is the most realistic form of this attack — using a legitimately issued but wrong-type token — rather than a synthetically crafted one.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_refresh_access_token_as_refresh_rejected -v
```
If failing, check:
1. Has the `token_type` field been removed from the JWT payload when creating access tokens?
2. Is `decode_token()` being called with `expected_type='refresh'` in the refresh endpoint?

## Architecture Mapping

**Layer:** Auth Utilities

**Flow:**
    [POST /api/auth/refresh {"refresh_token": "<valid_access_token_jwt>"}]
      → routers/auth.py:refresh_token()
        → auth_utils.py:decode_token(expected_type='refresh')
          → jwt.decode() → payload {token_type='access', sub=user_id}
          → payload['token_type'] != 'refresh'
          → raise HTTPException(401, "Invalid token type")
            → HTTP 401 ← THIS TEST COVERS THIS

**Upstream:** Client code that mistakenly uses the access token field in the refresh request body
**Downstream:** No new access token is issued; the client must use the correct refresh token.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_refresh_access_token_as_refresh_rejected -v`

## Downstream Impact
**Impact if unfixed:** Access tokens become effectively permanent — once obtained they can be continuously refreshed with themselves, bypassing the 24-hour expiry entirely.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-062, CASE-064
