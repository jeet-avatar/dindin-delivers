---
id: CASE-139
title: "Two users chatting simultaneously don't interfere with each other's context"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: FEATURE_TEST
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Chat session isolation"
test_ref: ""
files:
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
In a multi-user deployment, two users chatting simultaneously must have completely isolated session contexts. If any global or shared state holds chat history or FAISS search context between sessions, User A's messages could appear in User B's context — a data isolation bug and potential security issue. No concurrency test verifies this isolation.

## What Is Wrong
No test exists for this behavior. If session state bleeds between concurrent users, the test suite will not catch it.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented session-keyed message storage using `session_id`. However, if any middleware, cache, or in-memory state is shared globally (e.g., a module-level list of recent messages), concurrent requests could interfere. No concurrency integration test exists.

## What Is Done Right
Each chat message is stored with a `session_id` foreign key. DB queries filter by `session_id`. JWT auth ties each request to a specific user. Messages are not stored in global process state by design.

## How To Fix It
Write the following test in `tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_concurrent_chat_sessions_are_isolated(client, auth_headers_user1, auth_headers_user2):
    """
    Verify that two concurrent chat sessions don't share context.
    Send messages from two different users simultaneously and assert
    each user's history only contains their own messages.
    """
    import asyncio

    session_1 = "session-user-1"
    session_2 = "session-user-2"

    with patch("src.backend.routers.chat.ollama_chat") as mock_ollama, \
         patch("src.backend.routers.chat.faiss_search") as mock_search:

        mock_search.return_value = []
        mock_ollama.return_value = {"message": {"content": "response"}}

        # Send concurrent requests
        results = await asyncio.gather(
            client.post("/api/chat", json={"message": "User1 msg", "session_id": session_1}, headers=auth_headers_user1),
            client.post("/api/chat", json={"message": "User2 msg", "session_id": session_2}, headers=auth_headers_user2),
        )

    assert all(r.status_code == 200 for r in results)

    # Fetch history for each session
    hist1 = await client.get(f"/api/chats/{session_1}/messages", headers=auth_headers_user1)
    hist2 = await client.get(f"/api/chats/{session_2}/messages", headers=auth_headers_user2)

    msgs1 = [m["content"] for m in hist1.json()]
    msgs2 = [m["content"] for m in hist2.json()]

    assert "User2 msg" not in msgs1, "User1 session contains User2 message — context bleed detected"
    assert "User1 msg" not in msgs2, "User2 session contains User1 message — context bleed detected"
```

## Architecture Mapping

**Layer:** Chat Router → Session Isolation (Backend)

**Flow:**
    concurrent POST /api/chat (user1, user2) → session_id keyed DB writes → isolated per-session reads ← NO TEST EXISTS HERE

**Upstream:** Multiple simultaneous users in a team deployment
**Downstream:** If broken, cross-user context contamination — potential data leak between team members

## Verification
- [ ] Write test: `pytest tests/test_chat.py::test_concurrent_chat_sessions_are_isolated -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for session isolation. A refactor introducing shared state could cause cross-user data leaks.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-134, CASE-138, CASE-140
