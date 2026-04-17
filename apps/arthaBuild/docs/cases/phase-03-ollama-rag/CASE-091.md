---
id: CASE-091
title: "POST /api/chat reads 'message' field from request body"
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
feature: "POST /api/chat (request schema)"
test_ref: "tests/test_health.py::test_chatbot_reads_message_field"
files:
  - path: src/backend/routers/chat.py
    lines: "1-80"
  - path: src/backend/schemas.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies that the chat endpoint reads the user's input from the `message` field of the JSON request body, and that this field name matches what the Phase 04 frontend sends. A field name mismatch between the backend Pydantic schema and the frontend `api.ts` call would cause all chat requests to silently fail or return empty replies.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `schemas.py` — confirm the chat request Pydantic model has a field named `message` (not `query`, `input`, `text`, or `prompt`)
- `routers/chat.py` — confirm the handler accesses `request.message` (not a renamed alias)
- Phase 04 frontend `api.ts` — confirm the POST body is `{message: userInput}` (not `{query: ...}` or `{input: ...}`)
- If Pydantic aliases are used, confirm `by_alias=True` is set on `.model_validate()` or the field alias matches what the frontend sends

## Why It Was Done This Way (Root Cause)
The `ChatRequest` Pydantic model in `schemas.py` was defined with a `message: str` field to match the natural language of the frontend component ("send a message"). The field name `message` is the frozen interface contract between Phase 03 backend and Phase 04 frontend. The test sends `{"message": "test question"}` and asserts the response contains a non-empty reply, proving the field was read and passed to the Ollama mock correctly.

## What Is Done Right
This test isolates the field name contract as an independent assertion, separate from the 200 status code check in CASE-090. It catches the class of regression where the Pydantic model is renamed during refactoring but the frontend is not updated — or vice versa. The test is deliberately minimal: it only needs a non-empty reply to confirm the input was processed.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_chatbot_reads_message_field -v
```
If the test fails, check:
1. `schemas.py` — find the chat request model and confirm the field is named `message`
2. `routers/chat.py` — confirm `request.message` is passed to the Ollama client call
3. Phase 04 frontend `src/frontend/src/services/api.ts` — confirm `sendMessage` (or equivalent) sends `{message: text}`

## Architecture Mapping

**Layer:** Backend Schema + Router (request body contract)

**Flow:**
    [POST /api/chat — body: {"message": "test question"}]
      → [schemas.py ChatRequest.message = "test question"]
        → [routers/chat.py handler reads request.message]
          → [ollama_client.generate(request.message) — MOCKED]
            → [return {reply: "mocked response", session_id: "..."}]
                ↑ THIS TEST COVERS THE FIELD NAME CONTRACT

**Upstream:** Phase 04 frontend chat input — sends `{message: value}` in POST body
**Downstream:** Ollama prompt construction — `request.message` is the user turn in the LLM prompt

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_chatbot_reads_message_field -v`

## Downstream Impact
**Impact if unfixed:** All chat requests return empty replies or 422 Unprocessable Entity errors. If the Pydantic model accepts unknown fields silently, the message is `None` and the Ollama prompt contains no user input — the LLM returns a generic or empty response, breaking the entire chat UX.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-090 (chat returns 200), CASE-092 (chat returns session_id)
