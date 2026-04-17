---
id: CASE-099
title: "GET /api/chats/{id}/messages returns saved messages with role and content"
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
feature: "GET /api/chats/{id}/messages"
test_ref: "tests/test_chats.py::TestChatCRUD::test_get_chat_messages_returns_messages"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies that messages inserted directly into the database are correctly returned by
`GET /api/chats/{id}/messages`. The test inserts records with known `role` and `content`
values, then asserts both fields appear in the response list.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `get_chat_messages()` may not be querying `ChatMessage` by `session_id`
- `models.py` — `ChatMessage.role` or `ChatMessage.content` column may be missing
- The response serialisation may be omitting `role` or `content` from the output dict

## Why It Was Done This Way (Root Cause)
The endpoint queries `ChatMessage` rows filtered by `session_id` (which equals the path
`{id}`) and the ownership check via `ChatSession.user_id == current_user.id`. Messages are
returned as a list of dicts containing at minimum `role` and `content`. Inserting directly to
the DB in the test bypasses the chat route so that the read path is tested in isolation.

## What Is Done Right
- Pre-inserts messages at known `role`/`content` values to verify the exact DB→response path
- Asserts `role` and `content` are present on each returned message object
- Implicitly verifies the session ownership check is not applied so strictly that it breaks
  the user's own message retrieval

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_get_chat_messages_returns_messages -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    GET /api/chats/{id}/messages  [Bearer token]
      → routers/chats.py:get_chat_messages()
        → auth_utils.py:require_user()        ← validates JWT
          → select(ChatSession).where(id == session_id, user_id == current_user.id)
            → select(ChatMessage).where(session_id == session_id)
              → return [{role, content, ...}]  ← THIS TEST COVERS THIS

**Upstream:** Chat bubble submitted by user → POST /api/chats/{id}/messages
**Downstream:** Frontend renders message history in the chat panel

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_get_chat_messages_returns_messages -v`

## Downstream Impact
**Impact if unfixed:** Chat history would not reload on page refresh or session resume.
Users would lose all prior conversation context.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-098 (empty messages), CASE-100 (rename), CASE-102 (cross-user block)
