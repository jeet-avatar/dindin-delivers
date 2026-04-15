---
id: CASE-138
title: "GET /api/chats/{id}/messages returns messages in chronological order"
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
feature: "Chat message ordering"
test_ref: ""
files:
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
The chat history endpoint must return messages ordered by `created_at` ASC so the UI renders a coherent conversation. If messages are returned in arbitrary or reverse order, the chat UI shows a scrambled conversation — a confusing user experience. No explicit test verifies the ordering.

## What Is Wrong
No test exists for this behavior. Without an order guarantee in the query, different database backends or query plans could return messages in any order.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented the chat router and message storage. The query likely includes `.order_by(ChatMessage.created_at)` but this was not explicitly verified by a test that inserts messages with known timestamps and checks their returned order.

## What Is Done Right
The `ChatMessage` model has a `created_at` column with a default timestamp. The messages endpoint exists. Messages are persisted per session.

## How To Fix It
Write the following test in `tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_chat_messages_returned_in_chronological_order(client, auth_headers, db_session):
    """
    Verify GET /api/chats/{session_id}/messages returns messages ordered
    by created_at ASC (oldest first).
    Insert 3 messages with explicit timestamps and assert order.
    """
    from datetime import datetime, timedelta
    from src.backend.models import ChatMessage

    session_id = "order-test-session"
    base_time = datetime(2026, 4, 10, 12, 0, 0)

    messages = [
        ChatMessage(session_id=session_id, role="user", content="First", created_at=base_time),
        ChatMessage(session_id=session_id, role="assistant", content="Second", created_at=base_time + timedelta(seconds=1)),
        ChatMessage(session_id=session_id, role="user", content="Third", created_at=base_time + timedelta(seconds=2)),
    ]
    for msg in messages:
        db_session.add(msg)
    db_session.commit()

    resp = await client.get(f"/api/chats/{session_id}/messages", headers=auth_headers)
    assert resp.status_code == 200

    result = resp.json()
    assert len(result) == 3
    assert result[0]["content"] == "First"
    assert result[1]["content"] == "Second"
    assert result[2]["content"] == "Third"
```

## Architecture Mapping

**Layer:** Chat Router → Database Query (Backend)

**Flow:**
    GET /api/chats/{id}/messages → db.query(ChatMessage).filter_by(session_id).order_by(created_at.asc()) → return list ← NO TEST EXISTS HERE

**Upstream:** Frontend chat history sidebar requests messages
**Downstream:** If broken, UI renders conversation out of order — user and assistant turns scrambled

## Verification
- [ ] Write test: `pytest tests/test_chat.py::test_chat_messages_returned_in_chronological_order -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for message ordering. A query refactor could silently break conversation history rendering.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-134, CASE-139, CASE-149
