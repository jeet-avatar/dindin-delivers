---
id: CASE-119
title: "Admin JWT payload includes role='admin' claim"
phase: "09"
phase_name: "RBAC & Team Management"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "JWT role claim"
test_ref: "tests/test_rbac.py::TestRequireAdmin::test_admin_role_in_jwt_payload"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that the JWT issued to an admin user contains `role="admin"` in its decoded
payload. This is distinct from CASE-115 (which checks the HTTP response body) — here the
test decodes the token directly using PyJWT and inspects the payload claims.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — `create_access_token()` may not be passing `role` to the payload dict
- The PyJWT `decode()` call may be using the wrong algorithm (must be `HS256`)
- The `role` key may have been renamed in the payload (e.g., to `user_role` or `r`)

## Why It Was Done This Way (Root Cause)
`create_access_token()` constructs a payload dict that includes at minimum `sub` (user ID
as string), `role` (user's role string), `jti` (UUID), and `exp` (expiry timestamp). PyJWT
signs this with `JWT_SECRET_KEY` using HS256. The test decodes the access token returned
at login using the same secret and algorithm, then asserts `payload["role"] == "admin"`.

## What Is Done Right
- Decodes the raw JWT string from the login response
- Verifies the `role` claim at the token level (not just the response envelope)
- Confirms the role is baked into the token for stateless authorisation

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestRequireAdmin::test_admin_role_in_jwt_payload -v
```

## Architecture Mapping

**Layer:** JWT Token → Payload Claim

**Flow:**
    POST /api/auth/login → {access_token: "eyJ..."}
      → jwt.decode(access_token, JWT_SECRET_KEY, algorithms=["HS256"])
        → payload["role"] == "admin"  ← THIS TEST COVERS THIS

**Upstream:** `create_access_token()` in auth.py includes role in payload
**Downstream:** `require_admin` reads `payload["role"]` from decoded token to enforce RBAC

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestRequireAdmin::test_admin_role_in_jwt_payload -v`

## Downstream Impact
**Impact if unfixed:** RBAC enforcement breaks silently — tokens don't carry role information,
so `require_admin` cannot distinguish admin from regular users without an extra DB lookup per
request (or would fail entirely if it reads the claim).

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-115 (role in response body), CASE-120 (jti in payload), CASE-116 (require_admin passes)
