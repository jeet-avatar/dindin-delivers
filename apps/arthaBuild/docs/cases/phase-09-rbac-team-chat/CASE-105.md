---
id: CASE-105
title: "GET /api/chats returns 401 or 403 without Bearer token"
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
feature: "GET /api/chats (auth required)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_list_chats"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies that the list-chats endpoint rejects unauthenticated requests. Sending
`GET /api/chats` without an `Authorization: Bearer` header must result in HTTP 401 or 403
(not 200 or 422). This ensures the `require_user` dependency is wired to the route.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `require_user` may have been removed from the route's Depends()
- The route may have been accidentally moved to a public router without auth middleware
- `auth_utils.py:124-151` — `require_user` may be returning a default/anonymous user
  instead of raising an exception when no token is present

## Why It Was Done This Way (Root Cause)
`GET /api/chats` declares `current_user: User = Depends(require_user)`. FastAPI's
`HTTPBearer` security scheme raises `HTTPException(status_code=403)` (or 401 depending on
configuration) when the `Authorization` header is absent. The `require_user` function adds
the JWT validation layer on top. No token → exception before the handler body runs.

## What Is Done Right
- Sends request with no Authorization header (simulating a logged-out or anonymous caller)
- Asserts the status code is in `{401, 403}` rather than checking an exact code, which
  handles both HTTPBearer default (403) and custom 401 configurations

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_list_chats -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    GET /api/chats  [no Authorization header]
      → routers/chats.py:list_chats()
        → Depends(require_user)
          → HTTPBearer() → no token found
            → raise HTTPException(401/403)   ← THIS TEST COVERS THIS
              (handler body never executes)

**Upstream:** Unauthenticated browser tab, expired session, or API client without credentials
**Downstream:** 401/403 response; frontend redirects to login page

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_list_chats -v`

## Downstream Impact
**Impact if unfixed:** Any unauthenticated caller could list all chat sessions belonging to
whichever user the handler defaults to, leaking session titles and IDs.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-106 (unauth create), CASE-095 (empty list for auth user), CASE-096 (own sessions)
