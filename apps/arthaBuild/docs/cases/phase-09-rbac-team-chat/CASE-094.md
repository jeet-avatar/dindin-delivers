---
id: CASE-094
title: "POST /api/chats without title defaults to 'New Chat'"
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
feature: "Chat session default title"
test_ref: "tests/test_chats.py::TestChatCRUD::test_create_chat_session_default_title"
files:
  - path: src/backend/routers/chats.py
    lines: "28-29"
---

## Why This Case Was Created
Verifies that when an authenticated user creates a chat session without providing a `title`
field (empty JSON body `{}`), the API falls back to `"New Chat"` as the default title.
This is the UX-friendly behaviour expected by the frontend when users open a new tab before
typing a message.

## What Is Wrong
N/A — this test PASSES. If it fails, investigate:
- `routers/chats.py:29` — `title = body.get("title", "New Chat") if body else "New Chat"` may
  have been edited and the fallback removed or changed to a different string.

## Why It Was Done This Way (Root Cause)
The endpoint accepts a raw `dict` body. `body.get("title", "New Chat")` provides the fallback
inline (`routers/chats.py:29`). The `if body else "New Chat"` guard handles the edge case where
the body is `None` (e.g., Content-Type not set).

## What Is Done Right
- Sends an empty dict `{}` which is the realistic frontend behaviour (no title until user types)
- Asserts the exact string `"New Chat"` rather than just checking the field exists

## How To Fix It
**This test is passing.** To run:
```bash
cd src/backend
pytest tests/test_chats.py::TestChatCRUD::test_create_chat_session_default_title -v
```
If failing, check:
1. `src/backend/routers/chats.py:29` — verify fallback string is exactly `"New Chat"`

## Architecture Mapping

**Layer:** Backend Router → ORM Model

**Flow:**
    POST /api/chats {}  [Bearer token]
      → routers/chats.py:create_chat_session()
        → body.get("title", "New Chat")    ← THIS TEST COVERS THIS (fallback branch)
          → ChatSession(title="New Chat")
            → return {id, title="New Chat", created_at}

**Upstream:** Frontend new-tab button → POST /api/chats (no title)
**Downstream:** Chat sidebar shows "New Chat" label until user renames it

## Verification
- [ ] `pytest tests/test_chats.py::TestChatCRUD::test_create_chat_session_default_title -v`

## Downstream Impact
**Impact if unfixed:** Sessions created without a title would have `None` or an empty string as
their title, causing the frontend chat list to display a blank label.

## Links
- Phase SUMMARY: `.planning/phases/09-rbac-team-management-and-chat-persistence/09-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-093 (create with title), CASE-101 (rename)
