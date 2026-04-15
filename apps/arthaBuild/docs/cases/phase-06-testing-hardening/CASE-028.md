---
id: CASE-028
title: "No test for 404 on non-existent chat session GET"
phase: "06"
phase_name: "Testing & Hardening"
category: TEST_GAP
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Kiran"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/test_chats.py
    lines: "99-108"
  - path: src/backend/routers/chats.py
    lines: "63-95"
---

## Why This Case Was Created
Test coverage gap audit for error paths in the chat session API. The `GET /api/chats/{session_id}/messages` endpoint has explicit 404 handling (`chats.py:76`) when the session does not exist and 403 handling (`chats.py:77-78`) when the session belongs to another user. The test suite in `test_chats.py` covers 403 (cross-user access) but does not cover 404 (non-existent session ID). If a regression causes the 404 guard to be removed or the query to be rewritten incorrectly, CI would not catch it.

## What Is Wrong
`src/backend/routers/chats.py:71-78` contains:
```python
sess_result = await db.execute(
    select(ChatSession).where(ChatSession.id == session_id)
)
session = sess_result.scalar_one_or_none()
if not session:
    raise HTTPException(status_code=404, detail="Chat session not found")
if session.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Access denied")
```

In `test_chats.py`, the tests cover:
- `test_get_chat_messages_empty` (line 99): 200 for an existing empty session
- `test_get_chat_messages_returns_messages` (line 110): 200 with messages
- `test_cannot_access_other_users_chat_messages` (line 161): 403 for wrong owner

There is no test for:
- `GET /api/chats/99999/messages` where `99999` does not exist → should return 404

Additionally, `PATCH /api/chats/{session_id}` (rename) and `DELETE /api/chats/{session_id}` also have 404 guards (`chats.py:109`, `chats.py:131`) with no test coverage for the non-existent-ID path.

## Why It Was Done This Way (Root Cause)
The Phase 9 test suite was written to cover the happy path and the most important security boundary (cross-user isolation). The 404 path was considered self-evidently correct and was deferred. Test coverage for error paths on CRUD endpoints is commonly underprioritized when the happy path and auth paths are covered.

## What Is Done Right
The 403 cross-user isolation test exists and is correct (`test_cannot_access_other_users_chat_messages`). The delete test at line 146-159 does indirectly test 404 — after deletion, it checks that `GET /api/chats/{session_id}/messages` returns 404. This is a useful regression anchor but tests the post-delete state, not the never-existed state.

## How To Fix It
Add the following tests to `src/backend/tests/test_chats.py` inside the `TestChatCRUD` class:

```python
async def test_get_messages_nonexistent_session_returns_404(self, client):
    """GET /api/chats/{id}/messages for a non-existent session_id must return 404."""
    token = await _register_and_login(client, "404-messages")
    resp = await client.get("/api/chats/999999/messages", headers=_auth(token))
    assert resp.status_code == 404, (
        f"Expected 404 for non-existent session, got {resp.status_code}: {resp.text}"
    )

async def test_rename_nonexistent_session_returns_404(self, client):
    """PATCH /api/chats/{id} for a non-existent session_id must return 404."""
    token = await _register_and_login(client, "404-rename")
    resp = await client.patch(
        "/api/chats/999999",
        json={"title": "Ghost Title"},
        headers=_auth(token),
    )
    assert resp.status_code == 404, (
        f"Expected 404 for non-existent session, got {resp.status_code}: {resp.text}"
    )

async def test_delete_nonexistent_session_returns_404(self, client):
    """DELETE /api/chats/{id} for a non-existent session_id must return 404."""
    token = await _register_and_login(client, "404-delete")
    resp = await client.delete("/api/chats/999999", headers=_auth(token))
    assert resp.status_code == 404, (
        f"Expected 404 for non-existent session, got {resp.status_code}: {resp.text}"
    )
```

**Run the tests:**
```bash
pytest src/backend/tests/test_chats.py::TestChatCRUD::test_get_messages_nonexistent_session_returns_404 -v
pytest src/backend/tests/test_chats.py::TestChatCRUD::test_rename_nonexistent_session_returns_404 -v
pytest src/backend/tests/test_chats.py::TestChatCRUD::test_delete_nonexistent_session_returns_404 -v
```

## Architecture Mapping

**Layer:** Backend Router (chats.py) + Test layer

**Flow:**

    [GET /api/chats/999999/messages] → [chats.py:71-75 DB query]
                                                ↓
                                    session = scalar_one_or_none() → None
                                                ↓
                                    raise HTTPException(404)   ← NO TEST COVERS THIS PATH
                                                ↓
                                    [Client receives 404]

**Upstream:** Frontend chat history sidebar clicking on a session ID that no longer exists (e.g., after race condition during delete)
**Downstream:** 404 response handled by frontend to show "Session not found" toast

## Verification
- [ ] Grep proof: `grep -n "404\|not found" src/backend/routers/chats.py`
- [ ] Test proof: After adding the tests: `pytest src/backend/tests/test_chats.py -k "404" -v` — all three should pass
- [ ] Runtime proof: `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/chats/999999/messages` — should return `{"detail":"Chat session not found"}` with status 404

## Downstream Impact
**Impact if unfixed:** None (currently)

The 404 guards exist and work correctly. This is a test coverage gap, not a bug. Impact if the guard is accidentally removed in a future refactor: frontend requests for a deleted or non-existent session would receive a 500 or a 200 with empty data instead of a clean 404, causing confusing UX or a JavaScript crash.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-029
