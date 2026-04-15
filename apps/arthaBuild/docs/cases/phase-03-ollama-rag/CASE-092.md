---
id: CASE-092
title: "POST /api/chat returns session_id in response for chat history tracking"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Rohan"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/chat (session_id in response)"
test_ref: "tests/test_health.py::test_chatbot_session_id_returned"
files:
  - path: src/backend/routers/chat.py
    lines: "1-80"
---

## Why This Case Was Created
Verifies that POST /api/chat returns a `session_id` field in the response. The Phase 04 frontend uses `session_id` to associate follow-up messages with an existing conversation, enabling multi-turn chat history. Without `session_id`, each message starts a new session and the model has no memory of prior context.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chat.py` — confirm the response dict or Pydantic response model includes a `session_id` field
- `session_id` generation — confirm it is a non-empty string (UUID or similar); if `session_id` is `None` or an empty string, the frontend chat history will malfunction
- If the route was refactored to use a streaming response, confirm `session_id` is still included (streaming responses may omit response body fields)

## Why It Was Done This Way (Root Cause)
The chat route generates or retrieves a `session_id` to link messages into conversations. For new conversations (no `session_id` in the request), the route generates a new UUID and returns it in the response. The frontend stores this `session_id` and sends it with subsequent messages to continue the conversation. This enables the SQLite chat history table to group messages by session. The `session_id` is part of the frozen response interface: the test asserts its presence to catch any refactor that removes it from the response body.

## What Is Done Right
This test establishes the three-field response contract for the chat endpoint: `reply` (the LLM text), `session_id` (conversation identifier), and HTTP 200 status code. Together with CASE-090 and CASE-091, it covers the complete response shape. Session continuity is a key product feature — without `session_id`, the RAG pipeline cannot inject conversation history into subsequent prompts.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_chatbot_session_id_returned -v
```
If the test fails, check:
1. `routers/chat.py` — confirm the return statement includes `"session_id": session_id` (or equivalent)
2. Confirm `session_id` is generated before the response is returned (not `None`)
3. Phase 04 frontend `src/frontend/src/services/api.ts` — confirm `sendMessage` reads `response.session_id` and stores it for subsequent calls

## Architecture Mapping

**Layer:** Backend Router (chat response contract)

**Flow:**
    [POST /api/chat — {message: "test"}]
      → [routers/chat.py — new conversation: session_id = uuid4()]
        → [ollama_client.generate(...) — MOCKED → "mocked reply"]
          → [SQLite: INSERT INTO chats (session_id, user_id, message, reply)]
            → [return {reply: "mocked reply", session_id: "<uuid>"}]
                ↑ THIS TEST COVERS THE session_id FIELD

**Upstream:** Phase 04 frontend chat component — stores session_id for multi-turn conversation
**Downstream:** Subsequent POST /api/chat calls send session_id to retrieve conversation history for RAG context injection

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_chatbot_session_id_returned -v`

## Downstream Impact
**Impact if unfixed:** Each chat message starts a fresh session. The Ollama model has no memory of prior messages in the conversation. Multi-turn SuiteScript assistance is impossible — users must re-explain context on every message. Chat history in the sidebar shows disconnected single-message sessions instead of coherent conversations.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-090 (chat returns 200), CASE-091 (chat reads message field)
