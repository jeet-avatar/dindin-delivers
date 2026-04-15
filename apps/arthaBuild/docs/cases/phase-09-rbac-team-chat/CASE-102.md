---
id: CASE-102
title: "GET /api/chats/{id}/messages returns 403 when session belongs to another user"
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
feature: "GET /api/chats/{id}/messages (ownership check)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_cannot_access_other_users_chat_messages"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies cross-user isolation for the messages endpoint: User B cannot read the messages
belonging to a chat session owned by User A. The route must return HTTP 403 in this case.
This is a critical privacy boundary for the chat persistence feature.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — the ownership check `session.user_id == current_user.id` may be missing
  or may be checking the wrong field
- The query may be joining by `session_id` without verifying the session owner, leaking all
  messages to any authenticated user who guesses the session id

## Why It Was Done This Way (Root Cause)
`GET /api/chats/{id}/messages` first loads the `ChatSession` row. If
`session.user_id != current_user.id` it raises `HTTPException(status_code=403)` before any
message data is returned. This pattern ensures the ownership check cannot be bypassed even
if the caller knows a valid session `id` belonging to another user.

## What Is Done Right
- Registers two independent users (User A and User B) in the same test
- User A creates a session; User B attempts to read its messages
- Asserts HTTP 403 is returned (not 200 or 404)
- Covers the most common IDOR vector for chat data

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_cannot_access_other_users_chat_messages -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    GET /api/chats/{id}/messages  [User B Bearer token]
      → routers/chats.py:get_chat_messages()
        → auth_utils.py:require_user()         ← validates JWT → returns User B
          → select(ChatSession).where(id == session_id)   ← session owned by User A
            → if session.user_id != current_user.id:
                raise HTTPException(403)        ← THIS TEST COVERS THIS

**Upstream:** Attacker or confused UI routing to another user's session URL
**Downstream:** 403 prevents message data from being serialised and returned

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_cannot_access_other_users_chat_messages -v`

## Downstream Impact
**Impact if unfixed:** Any authenticated user could read any other user's full chat history
by guessing or brute-forcing session IDs — a critical IDOR vulnerability.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-097 (own isolation list), CASE-103 (cross-user rename block), CASE-104 (cross-user delete block)
