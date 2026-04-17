---
id: CASE-098
title: "GET /api/chats/{id}/messages returns empty list for new session"
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
feature: "Chat message retrieval — empty state"
test_ref: "tests/test_chats.py::TestChatCRUD::test_get_chat_messages_empty"
files:
  - path: src/backend/routers/chats.py
    lines: "63-95"
---

## Why This Case Was Created
Verifies that `GET /api/chats/{id}/messages` for a freshly created session (no messages yet)
returns HTTP 200 with an empty array `[]`. This guards the frontend from receiving `null` or
a non-array response when opening a new conversation.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:80-85` — `msg_result.scalars().all()` may be returning something other
  than an empty list when no messages exist
- `routers/chats.py:71-78` — ownership check may be failing for a freshly created session

## Why It Was Done This Way (Root Cause)
`get_chat_messages()` first verifies ownership (`session.user_id != current_user.id` check
at `routers/chats.py:77-78`), then queries all `ChatMessage` rows for the session. For a new
session with no messages, `scalars().all()` returns `[]` and the list comprehension produces
`[]`. The test creates the session via POST and uses the returned `id` immediately.

## What Is Done Right
- Creates the session first and uses the actual returned `id` (not a hardcoded value)
- Asserts `msg_resp.json() == []` (exact equality, not just isinstance)
- Asserts 201 on the POST before proceeding to the GET

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_get_chat_messages_empty -v
```
If failing, check:
1. `src/backend/routers/chats.py:80-85` — message query returns empty list for new session
2. `src/backend/routers/chats.py:71-78` — ownership check passes for the session owner

## Architecture Mapping

**Layer:** Backend Router → ORM Query → SQLite DB

**Flow:**
    POST /api/chats {title: "Empty Session"}  → {id: N}
    GET /api/chats/N/messages
      → routers/chats.py:get_chat_messages()
        → SELECT ChatSession WHERE id=N      ← ownership check (passes)
          → SELECT ChatMessage WHERE session_id=N ORDER BY created_at ASC
            → [] (no messages yet)
              → return []                    ← THIS TEST COVERS THIS

**Upstream:** Frontend chat view on initial open of a new session
**Downstream:** Frontend renders empty message area, ready for first user input

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_get_chat_messages_empty -v`

## Downstream Impact
**Impact if unfixed:** Frontend may crash on `null.map(...)` or show an error state instead of
the message input area.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-099 (messages with content), CASE-102 (delete then 404)
