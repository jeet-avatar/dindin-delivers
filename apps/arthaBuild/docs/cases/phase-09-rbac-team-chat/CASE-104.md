---
id: CASE-104
title: "DELETE /api/chats/{id} returns 403 when deleting another user's session"
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
feature: "DELETE /api/chats/{id} (ownership check)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_cannot_delete_other_users_chat"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies cross-user isolation for the delete endpoint: User B cannot delete a chat session
owned by User A. The route must return HTTP 403. This prevents any user from erasing
another user's entire conversation history.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `delete_chat()` may be missing the ownership check before calling
  `db.delete(session)`
- Without the guard, any authenticated user knowing a session `id` could permanently destroy
  another user's chat history

## Why It Was Done This Way (Root Cause)
`DELETE /api/chats/{id}` applies the same ownership guard as rename and messages: load
`ChatSession` by `id`, check `session.user_id == current_user.id`, raise
`HTTPException(status_code=403)` on mismatch. The delete call and commit only execute after
ownership is confirmed. This is the most destructive mutation, making the guard especially
critical here.

## What Is Done Right
- Two distinct users registered in the same test
- User A creates a session; User B sends DELETE
- Asserts HTTP 403 — not 204 or 200
- Covers the highest-impact IDOR vector (irreversible data loss)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_cannot_delete_other_users_chat -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    DELETE /api/chats/{id}  [User B Bearer token]
      → routers/chats.py:delete_chat()
        → auth_utils.py:require_user()        ← validates JWT → returns User B
          → select(ChatSession).where(id == session_id)   ← session owned by User A
            → if session.user_id != current_user.id:
                raise HTTPException(403)      ← THIS TEST COVERS THIS
              (db.delete() is never reached)

**Upstream:** Malicious or mistaken DELETE from a different authenticated user
**Downstream:** Session and messages remain intact; 403 returned with no DB write

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_cannot_delete_other_users_chat -v`

## Downstream Impact
**Impact if unfixed:** Any authenticated user could permanently delete any other user's chat
history by guessing a session ID — a critical data-destruction IDOR vulnerability.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-101 (delete happy-path), CASE-102 (cross-user messages block), CASE-103 (cross-user rename block)
