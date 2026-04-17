---
id: CASE-134
title: "POST /api/chat messages are persisted to ChatMessage table and retrievable"
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
feature: "Chat message persistence"
test_ref: ""
files:
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Why This Case Was Created
Every chat message (user turn and assistant response) should be persisted to the `ChatMessage` table so users can retrieve conversation history. No test verifies that messages are actually written to the database after an API call completes.

## What Is Wrong
No test exists for this behavior. If persistence is broken, chat history is silently lost — users see empty history on next login.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented the ChatMessage model and the chat router. The in-memory response path was tested but the DB write after response generation was not covered by an integration test.

## What Is Done Right
The `ChatMessage` SQLAlchemy model exists with fields for `session_id`, `role` (user/assistant), `content`, and `created_at`. The chat router accepts messages and returns responses. A `GET /api/chats/{id}/messages` endpoint exists to retrieve history.

## How To Fix It
Write the following test in `tests/test_chat.py`:

```python
@pytest.mark.asyncio
async def test_chat_message_persisted_to_db(client, auth_headers, db_session):
    """
    Verify that after POST /api/chat, both the user message and assistant
    response are persisted to the ChatMessage table.
    """
    from src.backend.models import ChatMessage

    with patch("src.backend.routers.chat.ollama_chat") as mock_ollama, \
         patch("src.backend.routers.chat.faiss_search") as mock_search:

        mock_search.return_value = []
        mock_ollama.return_value = {"message": {"content": "Test response"}}

        resp = await client.post(
            "/api/chat",
            json={"message": "Hello NetSuite", "session_id": "persist-test"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    # Verify messages persisted in DB
    messages = db_session.query(ChatMessage).filter_by(
        session_id="persist-test"
    ).order_by(ChatMessage.created_at).all()

    assert len(messages) == 2, f"Expected 2 messages (user + assistant), got {len(messages)}"
    assert messages[0].role == "user"
    assert messages[0].content == "Hello NetSuite"
    assert messages[1].role == "assistant"
    assert messages[1].content == "Test response"
```

## Architecture Mapping

**Layer:** Chat Router → Database (Backend)

**Flow:**
    POST /api/chat → process → ollama_chat() → db.add(ChatMessage user) → db.add(ChatMessage assistant) → db.commit() ← NO TEST EXISTS HERE

**Upstream:** User sends message in chat UI
**Downstream:** If broken, GET /api/chats/{id}/messages returns empty history — users lose all conversation context

## Verification
- [ ] Write test: `pytest tests/test_chat.py::test_chat_message_persisted_to_db -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for chat persistence. A DB session management bug could silently drop all messages.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-138, CASE-139, CASE-149
