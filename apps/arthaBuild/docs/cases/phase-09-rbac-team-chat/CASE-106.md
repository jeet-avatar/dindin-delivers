---
id: CASE-106
title: "POST /api/chats returns 401 or 403 without Bearer token"
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
feature: "POST /api/chats (auth required)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_create_chat"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies that the create-chat endpoint rejects unauthenticated requests. Sending
`POST /api/chats` without an `Authorization: Bearer` header must result in HTTP 401 or 403.
Without this guard, anonymous callers could create chat sessions and consume storage.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `require_user` dependency may have been removed from the POST route
- `auth_utils.py:124-151` — `require_user` may be silently returning a stub user when no
  token is provided instead of raising an exception

## Why It Was Done This Way (Root Cause)
`POST /api/chats` declares `current_user: User = Depends(require_user)`. FastAPI's
`HTTPBearer` security scheme raises an exception when the `Authorization` header is absent.
`require_user` then validates the JWT; if either step fails, the handler body never executes
and no `ChatSession` row is created.

## What Is Done Right
- Sends a well-formed POST body `{title: "Test"}` but omits the Authorization header
- Asserts the status code is in `{401, 403}`, not 201 or 422
- Confirms the auth guard is applied to the write path, not just the read path

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_create_chat -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Dependency

**Flow:**
    POST /api/chats {title: "Test"}  [no Authorization header]
      → routers/chats.py:create_chat_session()
        → Depends(require_user)
          → HTTPBearer() → no token found
            → raise HTTPException(401/403)   ← THIS TEST COVERS THIS
              (no ChatSession row created)

**Upstream:** Anonymous browser tab or API client without credentials
**Downstream:** 401/403 response; no DB write occurs

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_unauthenticated_cannot_create_chat -v`

## Downstream Impact
**Impact if unfixed:** Anonymous callers could create unlimited chat sessions, consuming
database storage and potentially enumerating the system's session ID space.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-105 (unauth list), CASE-093 (create happy-path), CASE-094 (default title)
