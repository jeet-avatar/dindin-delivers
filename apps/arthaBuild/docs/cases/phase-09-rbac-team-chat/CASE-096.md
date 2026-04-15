---
id: CASE-096
title: "GET /api/chats returns all sessions belonging to the authenticated user"
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
feature: "Chat session listing — own sessions"
test_ref: "tests/test_chats.py::TestChatCRUD::test_list_chats_returns_own_sessions"
files:
  - path: src/backend/routers/chats.py
    lines: "41-60"
---

## Why This Case Was Created
Verifies that `GET /api/chats` returns all sessions the authenticated user created. A user
creates two sessions ("Session A" and "Session B"), then lists them — both titles must appear
in the response. This is the primary happy-path for the chat sidebar.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:47-52` — the `WHERE user_id == current_user.id` filter may be wrong
- `routers/chats.py:53-60` — the list comprehension may be omitting the `title` field
- The two `POST /api/chats` calls returned non-201, meaning sessions were never created

## Why It Was Done This Way (Root Cause)
`list_chat_sessions()` queries with `.where(ChatSession.user_id == current_user.id)` and
orders by `updated_at DESC` (`routers/chats.py:47-52`). All sessions for this user are
returned; the test checks that both created titles appear in the title list.

## What Is Done Right
- Creates two sessions before listing, verifying the list reflects real DB state
- Checks both titles are `in` the titles list (order-independent assertion)
- Asserts intermediate 201 status on both POSTs before checking the GET

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_list_chats_returns_own_sessions -v
```
If failing, check:
1. `src/backend/routers/chats.py:47-52` — `WHERE user_id == current_user.id` filter
2. `src/backend/routers/chats.py:53-60` — `title` key in list comprehension

## Architecture Mapping

**Layer:** Backend Router → ORM Query → SQLite DB

**Flow:**
    POST /api/chats {title: "Session A"}  → 201
    POST /api/chats {title: "Session B"}  → 201
    GET /api/chats
      → routers/chats.py:list_chat_sessions()
        → SELECT * FROM chat_sessions WHERE user_id=? ORDER BY updated_at DESC
          → [{id, title:"Session A", ...}, {id, title:"Session B", ...}]
            → titles include "Session A" and "Session B"  ← THIS TEST COVERS THIS

**Upstream:** Frontend sidebar refresh after creating a session
**Downstream:** Session IDs from this list are used to navigate to individual chat views

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_list_chats_returns_own_sessions -v`

## Downstream Impact
**Impact if unfixed:** Users' sessions would not appear in the chat sidebar, forcing them to
restart every conversation.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-095 (empty list), CASE-097 (isolation)
