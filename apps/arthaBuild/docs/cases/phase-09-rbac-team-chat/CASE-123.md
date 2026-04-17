---
id: CASE-123
title: "POST /api/auth/logout without Bearer token returns 401"
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
feature: "POST /api/auth/logout (auth required)"
test_ref: "tests/test_rbac.py::TestTokenBlacklist::test_logout_without_token_returns_401"
files:
  - path: src/backend/routers/auth.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies that the logout endpoint itself requires authentication: calling
`POST /api/auth/logout` without an `Authorization` header returns HTTP 401 (or 403).
This prevents anonymous callers from polluting the blacklist or triggering side-effects.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — `require_user` dependency may have been removed from the logout route
- The logout route may have been made public to allow "fire-and-forget" logout from clients
  that already discarded the token — but this would violate the auth requirement
- The status code returned may be 422 (validation error) instead of 401/403

## Why It Was Done This Way (Root Cause)
`POST /api/auth/logout` declares `current_user: User = Depends(require_user)`. When no
`Authorization` header is present, `HTTPBearer` raises an exception (401 or 403) before the
handler body runs. This also means a caller cannot manufacture a fake `jti` and add it to
the blacklist — they must present a valid token first.

## What Is Done Right
- Sends POST to logout with no Authorization header
- Asserts status code is in `{401, 403}` — not 200 or 422
- Completes the auth coverage triangle: happy-path (CASE-121), blacklist (CASE-122), no-token (CASE-123)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_rbac.py::TestTokenBlacklist::test_logout_without_token_returns_401 -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    POST /api/auth/logout  [no Authorization header]
      → routers/auth.py:logout()
        → Depends(require_user)
          → HTTPBearer() → no token
            → raise HTTPException(401/403)  ← THIS TEST COVERS THIS
              (blacklist.add() never called)

**Upstream:** Misconfigured client or unauthenticated caller hitting the logout endpoint
**Downstream:** 401/403 returned; blacklist not modified

## Verification
- [ ] Test passes: `pytest tests/test_rbac.py::TestTokenBlacklist::test_logout_without_token_returns_401 -v`

## Downstream Impact
**Impact if unfixed:** Anonymous callers could call logout repeatedly, but since no jti is
extracted, it is low-impact. The main risk is unclear API contract — clients need a clear
401 to know they must present a token.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-121 (logout happy-path), CASE-122 (blacklisted token rejected), CASE-105 (unauth chat list)
