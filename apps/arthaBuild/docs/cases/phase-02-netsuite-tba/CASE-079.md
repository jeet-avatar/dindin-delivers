---
id: CASE-079
title: "GET /api/netsuite/status returns 401 for expired JWT"
phase: "02"
phase_name: "NetSuite TBA Session"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kavya"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "GET /api/netsuite/status (JWT expiry check)"
test_ref: "tests/test_netsuite.py::test_tc_ns_09_expired_jwt_returns_401"
files:
  - path: src/backend/auth_utils.py
    lines: "55-80"
---

## Why This Case Was Created
Verifies that the JWT expiry check is enforced on the NetSuite status endpoint: a token with `exp` set in the past must be rejected with a 401 response, not silently accepted. Part of the Phase 02 traceability registry (TC-NS-09).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `auth_utils.py:55-80` — `decode_token()` must not pass `options={"verify_exp": False}` to `jwt.decode()`; if expiry verification is disabled, all expired tokens are accepted
- PyJWT version — `jwt.decode()` in PyJWT ≥ 2.x raises `ExpiredSignatureError` automatically; if the project is accidentally using `python-jose`, behavior may differ
- The `get_current_user_id` dependency — confirm it calls `decode_token()` and re-raises the exception as `HTTPException(status_code=401)`

## Why It Was Done This Way (Root Cause)
The `get_current_user_id` dependency at `auth_utils.py:55-80` calls `jwt.decode(token, SECRET_KEY, algorithms=["HS256"])` via PyJWT (the only permitted JWT library per CLAUDE.md). PyJWT raises `jwt.ExpiredSignatureError` when the token's `exp` claim is in the past. The dependency catches this exception and raises `HTTPException(status_code=401, detail="Token expired")`. The test creates a token with `exp=datetime.utcnow() - timedelta(seconds=60)` to simulate a past-expired token.

## What Is Done Right
This test proves that the expiry guard is active and properly wired into the FastAPI dependency chain for NetSuite routes specifically — not just for auth routes. It uses a genuine PyJWT-signed expired token (same signing key and algorithm), so the test does not bypass any signature check.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_tc_ns_09_expired_jwt_returns_401 -v
```
If the test fails, check:
1. `auth_utils.py:55-80` — confirm `jwt.decode()` does NOT include `options={"verify_exp": False}`
2. Confirm `ExpiredSignatureError` is caught and re-raised as `HTTPException(401)`, not swallowed silently
3. Confirm the test token was signed with the same `JWT_SECRET_KEY` used by the running app (set via env var in the test fixture)

## Architecture Mapping

**Layer:** Auth Dependency (JWT decode)

**Flow:**
    [GET /api/netsuite/status — Authorization: Bearer <expired_token>]
      → [routers/netsuite.py:270 Depends(get_current_user_id)]
        → [auth_utils.py:55-80 jwt.decode() → raises ExpiredSignatureError]
          → [HTTPException(status_code=401)]
                ↑ THIS TEST COVERS THIS PATH

**Upstream:** Any client holding a stale access token (e.g., left the browser tab open overnight)
**Downstream:** Client must re-authenticate; prevents stale token reuse for NetSuite credential access

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_tc_ns_09_expired_jwt_returns_401 -v`

## Downstream Impact
**Impact if unfixed:** Expired tokens accepted for NetSuite status and deploy endpoints. An attacker who captures a token can use it indefinitely after it should have expired, accessing TBA session state and triggering SuiteScript deployments.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-082 (status requires auth — missing token), CASE-083 (authenticate requires auth), CASE-084 (deploy requires auth)
