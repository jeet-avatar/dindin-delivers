---
id: CASE-100
title: "PATCH /api/chats/{id} updates session title"
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
feature: "PATCH /api/chats/{id} (rename)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_rename_chat"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies the rename happy-path: an authenticated user sends `PATCH /api/chats/{id}` with
`{title: "New Name"}`, receives HTTP 200, and the updated title is reflected in both the
response body and the database record.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `rename_chat()` may not be committing the title update to the DB
- The response dict may not include the updated `title` field
- `auth_utils.py:124-151` — `require_user` may be rejecting the token

## Why It Was Done This Way (Root Cause)
`PATCH /api/chats/{id}` loads the `ChatSession` by `id`, verifies `session.user_id ==
current_user.id` (raises 403 otherwise), then sets `session.title = new_title`, commits,
and returns the updated session fields. Using PATCH rather than PUT signals a partial update
— only the title field is touched.

## What Is Done Right
- Asserts HTTP 200 on success
- Asserts the returned body contains the new title value
- Implicitly verifies ownership check passes for the session owner

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_rename_chat -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    PATCH /api/chats/{id} {title: "New Name"}  [Bearer token]
      → routers/chats.py:rename_chat()
        → auth_utils.py:require_user()          ← validates JWT
          → select(ChatSession).where(id == session_id)
            → if session.user_id != current_user.id: raise 403
              → session.title = new_title
                → db.commit() → return {id, title, ...}  ← THIS TEST COVERS THIS

**Upstream:** User clicks "Rename" in the chat sidebar → PATCH call
**Downstream:** Sidebar re-renders with the updated session title

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_rename_chat -v`

## Downstream Impact
**Impact if unfixed:** Users cannot rename chat sessions; the sidebar always shows the
original auto-generated title, degrading organisation of conversation history.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-099 (get messages), CASE-101 (delete), CASE-103 (cross-user rename block)
