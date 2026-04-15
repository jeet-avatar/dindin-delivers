---
id: CASE-097
title: "GET /api/chats does not return another user's sessions (isolation)"
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
feature: "Chat session listing — user isolation"
test_ref: "tests/test_chats.py::TestChatCRUD::test_list_chats_only_own_isolation"
files:
  - path: src/backend/routers/chats.py
    lines: "47-52"
---

## Why This Case Was Created
Verifies that User B cannot see User A's chat sessions when calling `GET /api/chats`. This is a
tenant-isolation security control: the ORM query must filter strictly by `current_user.id`.
Without this check, any authenticated user could read every other user's session titles.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:47-52` — the `.where(ChatSession.user_id == current_user.id)` clause was
  removed or the filter references the wrong field
- The `require_user` dependency returned the wrong user object (would be a critical auth bug)

## Why It Was Done This Way (Root Cause)
The ORM filter `ChatSession.user_id == current_user.id` at `routers/chats.py:47-52` ensures
only the authenticated user's own rows are returned. If this filter were removed, `SELECT *
FROM chat_sessions` would return all sessions for all users, and User B would see User A's
sessions. The test directly verifies this filter is active by checking the negative case.

## What Is Done Right
- Two separate accounts are registered and each gets its own token
- User A's session title "A's Private Chat" is the canary — specific and unlikely to collide
- The assertion checks the negative: `assert "A's Private Chat" not in b_titles`

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_list_chats_only_own_isolation -v
```
If failing, check:
1. `src/backend/routers/chats.py:47-52` — ensure `.where(ChatSession.user_id == current_user.id)` is present
2. `src/backend/auth_utils.py:124-151` — `require_user` must return the correct user for each token

## Architecture Mapping

**Layer:** Backend Router → ORM Query Filter → SQLite DB

**Flow:**
    User A: POST /api/chats {title: "A's Private Chat"}
    User B: GET /api/chats  [B's token]
      → routers/chats.py:list_chat_sessions()
        → require_user()  → returns User B
          → SELECT * FROM chat_sessions WHERE user_id = B.id  ← ISOLATION FILTER
            → A's sessions are excluded by WHERE clause
              → B's title list does NOT contain "A's Private Chat"  ← THIS TEST COVERS THIS

**Upstream:** Any multi-user chat deployment
**Downstream:** Without this filter, cross-user data leakage would be a P0 security incident

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_list_chats_only_own_isolation -v`

## Downstream Impact
**Impact if unfixed:** Every user's chat session list would be visible to all other
authenticated users — a critical privacy breach exposing conversation topics.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-103 (cross-user message access 403), CASE-104 (cross-user rename 403), CASE-105 (cross-user delete 403)
