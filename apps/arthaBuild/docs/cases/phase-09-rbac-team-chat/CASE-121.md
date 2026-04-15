---
id: CASE-121
title: "POST /api/auth/logout returns 200 with Bearer token"
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
feature: "POST /api/auth/logout"
test_ref: "tests/test_rbac.py::TestTokenBlacklist::test_logout_endpoint_returns_200"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies the logout happy-path: an authenticated user sends `POST /api/auth/logout` with a
valid Bearer token and receives HTTP 200 (or 204) with a success message. This is the
prerequisite for the token blacklist tests (CASE-122).

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — the logout route may be missing or returning a non-2xx status
- `require_user` dependency may not be wired to the logout route, causing 401/403 unexpectedly
- The route path may differ from `POST /api/auth/logout` (e.g., `/api/auth/sign-out`)

## Why It Was Done This Way (Root Cause)
`POST /api/auth/logout` requires a valid Bearer token via `Depends(require_user)`. The
handler extracts the `jti` from the decoded token payload and adds it to an in-memory
blacklist set (or Redis set in production). It then returns `{"message": "logged out"}` with
HTTP 200. The blacklist addition is the side-effect that makes CASE-122 work.

## What Is Done Right
- Registers a user, logs in, and immediately calls logout with the access token
- Asserts HTTP 200 (or 204) is returned
- Verifies the endpoint exists and requires authentication (not open to anonymous callers)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestTokenBlacklist::test_logout_endpoint_returns_200 -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency → In-Memory Blacklist

**Flow:**
    POST /api/auth/logout  [Bearer token]
      → routers/auth.py:logout()
        → Depends(require_user)           ← validates JWT, returns user
          → jti = payload["jti"]
            → blacklist.add(jti)
              → return 200 {"message": "logged out"}  ← THIS TEST COVERS THIS

**Upstream:** User clicks "Sign Out" in the UI
**Downstream:** jti added to blacklist; subsequent requests with same token rejected (CASE-122)

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestTokenBlacklist::test_logout_endpoint_returns_200 -v`

## Downstream Impact
**Impact if unfixed:** Users cannot log out; sessions persist indefinitely until token
expiry, with no way to invalidate a compromised or shared token.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-120 (jti in payload), CASE-122 (blacklisted token rejected), CASE-123 (logout without token)
