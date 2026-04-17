---
id: CASE-093
title: "POST /api/chats returns 201 with id, title, created_at"
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
feature: "Chat session creation"
test_ref: "tests/test_chats.py::TestChatCRUD::test_create_chat_session"
files:
  - path: src/backend/routers/chats.py
    lines: "22-38"
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies the core happy-path for chat session creation: an authenticated user POSTs to
`/api/chats` with a title, and the API returns HTTP 201 with `id`, `title`, and `created_at`.
Registered as a Phase 09 RBAC + Chat Persistence traceability record.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:22-38` — `create_chat_session()` may not be returning all three fields
- `models.py` — `ChatSession.created_at` column may be missing or not auto-populated
- `auth_utils.py:124-151` — `require_user` dependency may be rejecting the token

## Why It Was Done This Way (Root Cause)
`POST /api/chats` creates a `ChatSession` ORM object with `user_id=current_user.id` and the
provided title, then commits and refreshes to populate `id` and `created_at`. The response
dict is constructed manually so only the three safe fields are returned
(`routers/chats.py:34-38`).

## What Is Done Right
- Status code 201 is asserted (not just 200)
- All three required fields (`id`, `title`, `created_at`) are asserted individually
- Uses a unique-suffix helper `_register_and_login(client, "create1")` to avoid collisions

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_create_chat_session -v
```
If failing, check:
1. `src/backend/routers/chats.py:22-38` — response dict fields
2. `src/backend/models.py` — `ChatSession` model, `created_at` default
3. `src/backend/auth_utils.py:124-151` — `require_user` dependency

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    POST /api/chats {title: "My First Chat"}  [Bearer token]
      → routers/chats.py:create_chat_session()
        → auth_utils.py:require_user()       ← validates JWT, returns User ORM
          → ChatSession(user_id=current_user.id, title=title)
            → db.add() → db.commit() → db.refresh()
              → return {id, title, created_at}   ← THIS TEST COVERS THIS

**Upstream:** Frontend chat sidebar → POST /api/chats
**Downstream:** Session `id` is used for all subsequent message/rename/delete operations

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_create_chat_session -v`

## Downstream Impact
**Impact if unfixed:** Users cannot create chat sessions; the entire chat persistence feature
is blocked. Frontend will receive a non-201 or missing fields, causing runtime errors.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-094 (default title), CASE-095 (empty list), CASE-096 (own sessions)
