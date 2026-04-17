---
id: CASE-103
title: "PATCH /api/chats/{id} returns 403 when renaming another user's session"
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
feature: "PATCH /api/chats/{id} (ownership check)"
test_ref: "tests/test_chats.py::TestChatCRUD::test_cannot_rename_other_users_chat"
files:
  - path: src/backend/routers/chats.py
    lines: ""
  - path: src/backend/auth_utils.py
    lines: "124-151"
---

## Why This Case Was Created
Verifies cross-user isolation for the rename endpoint: User B cannot rename a chat session
owned by User A. The route must return HTTP 403. This guards against session hijacking via
the rename action.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chats.py` — `rename_chat()` may be missing the ownership check before updating
  the title
- The ownership check may be present but using the wrong field (e.g., comparing `id` instead
  of `user_id`)
- A silent 200 return (no check) would allow any user to rename any session

## Why It Was Done This Way (Root Cause)
`PATCH /api/chats/{id}` applies the same ownership pattern as the messages endpoint: load
`ChatSession` by `id`, then if `session.user_id != current_user.id` raise
`HTTPException(status_code=403)`. The title update only proceeds when ownership is confirmed.
Using the same guard consistently across all mutating endpoints prevents partial IDOR exposure.

## What Is Done Right
- Two distinct users registered in the same test
- User A creates a session; User B sends PATCH with a new title
- Asserts HTTP 403 — not 200, 404, or 422
- Verifies the rename guard is symmetric with the messages-read guard

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_cannot_rename_other_users_chat -v
```

## Architecture Mapping

**Layer:** Backend Router → ORM Model → SQLite DB

**Flow:**
    PATCH /api/chats/{id} {title: "Stolen Name"}  [User B Bearer token]
      → routers/chats.py:rename_chat()
        → auth_utils.py:require_user()            ← validates JWT → returns User B
          → select(ChatSession).where(id == session_id)   ← session owned by User A
            → if session.user_id != current_user.id:
                raise HTTPException(403)          ← THIS TEST COVERS THIS

**Upstream:** Malicious or mistaken PATCH from a different authenticated user
**Downstream:** Title remains unchanged; 403 returned before any DB write

## Verification
- [ ] Test passes: `pytest tests/test_chats.py::TestChatCRUD::test_cannot_rename_other_users_chat -v`

## Downstream Impact
**Impact if unfixed:** Any authenticated user could rename any other user's chat session,
causing confusion and enabling subtle data tampering across team accounts.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-100 (rename happy-path), CASE-102 (cross-user messages block), CASE-104 (cross-user delete block)
