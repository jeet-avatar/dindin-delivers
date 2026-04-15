---
id: CASE-095
title: "GET /api/chats returns empty list for user with no sessions"
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
feature: "Chat session listing — empty state"
test_ref: "tests/test_chats.py::TestChatCRUD::test_list_chats_empty"
files:
  - path: src/backend/routers/chats.py
    lines: "41-60"
---

## Why This Case Was Created
Verifies that `GET /api/chats` for a freshly registered user (no sessions yet) returns
HTTP 200 with a JSON array (possibly empty). This guards against the API returning `null`,
a 404, or an object instead of a list, which would break frontend array-rendering logic.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:41-60` — `list_chat_sessions()` may be returning `None` or a non-list
- The ORM query may be raising an exception on an empty result set instead of returning `[]`

## Why It Was Done This Way (Root Cause)
`list_chat_sessions()` uses `result.scalars().all()` which always returns a list (empty list
when no rows match). The list comprehension at `routers/chats.py:53-60` then maps to dicts.
An empty DB result produces `[]` naturally without any special-case code.

## What Is Done Right
- Asserts `isinstance(data, list)` — catches both `None` and object responses
- Uses a unique suffix `"list-empty"` to ensure a fresh user with no pre-existing sessions

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_list_chats_empty -v
```
If failing, check:
1. `src/backend/routers/chats.py:53-60` — ensure return is always a list
2. SQLAlchemy `scalars().all()` behaviour with empty result

## Architecture Mapping

**Layer:** Backend Router → ORM Query → SQLite DB

**Flow:**
    GET /api/chats  [Bearer token, fresh user]
      → routers/chats.py:list_chat_sessions()
        → SELECT * FROM chat_sessions WHERE user_id=? ORDER BY updated_at DESC
          → result.scalars().all()  → []
            → return []             ← THIS TEST COVERS THIS (empty branch)

**Upstream:** Frontend chat sidebar initial load
**Downstream:** Frontend renders empty state UI (no sessions listed)

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_list_chats_empty -v`

## Downstream Impact
**Impact if unfixed:** Frontend may crash trying to iterate over `null` or an object, showing
an error page instead of the empty-state chat prompt.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-096 (list own sessions), CASE-097 (isolation)
