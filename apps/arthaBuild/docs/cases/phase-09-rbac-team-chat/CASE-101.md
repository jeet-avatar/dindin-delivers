---
id: CASE-101
title: "DELETE /api/chats/{id} removes session and returns 204"
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
feature: "DELETE /api/chats/{id}"
test_ref: "tests/test_chats.py::TestChatCRUD::test_delete_chat"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Verifies the delete happy-path: an authenticated user sends `DELETE /api/chats/{id}`, the
session is removed from the database, and the response status is HTTP 204 (No Content).
A subsequent `GET /api/chats` should not include the deleted session.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `delete_chat()` may not be calling `db.delete(session)` and committing
- HTTP status code returned may be 200 instead of 204 (test asserts 204)
- Cascade delete may not remove associated `ChatMessage` rows (causing FK constraint errors)

## Why It Was Done This Way (Root Cause)
`DELETE /api/chats/{id}` loads the `ChatSession` by `id`, verifies ownership
(`session.user_id == current_user.id`), calls `db.delete(session)` and `db.commit()`.
HTTP 204 is returned with no body, following REST convention for successful deletions.
Cascade delete on `ChatMessage.session_id` FK ensures child rows are removed automatically.

## What Is Done Right
- Asserts HTTP 204 (not just any 2xx)
- Verifies the session no longer appears in `GET /api/chats` after deletion
- Implicitly covers cascade delete of associated messages

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_delete_chat -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    DELETE /api/chats/{id}  [Bearer token]
      → routers/chats.py:delete_chat()
        → auth_utils.py:require_user()       ← validates JWT
          → select(ChatSession).where(id == session_id)
            → if session.user_id != current_user.id: raise 403
              → db.delete(session) → db.commit()
                → return Response(status_code=204)  ← THIS TEST COVERS THIS

**Upstream:** User clicks "Delete" in the chat sidebar → DELETE call
**Downstream:** Session removed from sidebar list; associated messages cascade-deleted

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_delete_chat -v`

## Downstream Impact
**Impact if unfixed:** Users cannot remove old chat sessions; the sidebar accumulates stale
history indefinitely, and storage grows unbounded.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-100 (rename), CASE-102 (cross-user messages block), CASE-104 (cross-user delete block)
