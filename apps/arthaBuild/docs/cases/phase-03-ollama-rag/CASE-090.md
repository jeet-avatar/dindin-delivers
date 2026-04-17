---
id: CASE-090
title: "POST /api/chat returns 200 with Ollama mocked response"
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
feature: "POST /api/chat (Ollama inference)"
test_ref: "tests/test_health.py::test_chatbot_returns_200_with_ollama"
files:
  - path: src/backend/routers/chat.py
    lines: "1-80"
---

## Why This Case Was Created
Verifies the core chat endpoint happy path: a user sends a message via POST /api/chat with a valid JWT, Ollama inference is mocked, and the endpoint returns HTTP 200 with a non-empty reply. This is the primary functional test for ArthaBuild's entire purpose — AI-assisted NetSuite SuiteScript chat.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/chat.py` (or `rawapi.py`) — confirm the chat route exists and is registered under `/api/chat` or `/api/chatbot/process`; if the path changed, the frontend `api.ts` would need updating too
- The Ollama mock — confirm the patch target is the fully-qualified module path (e.g., `routers.chat.ollama_client.generate`); a wrong patch target means the real Ollama HTTP call is made, which fails in CI where Ollama is not running
- Confirm the route requires auth (`Depends(get_current_user_id)`) — if auth was removed, CASE-090 would still pass but CASE-091 behavior changes

## Why It Was Done This Way (Root Cause)
The chat route at `routers/chat.py` accepts a JSON body with a `message` field, calls `ollama_client.generate()` (using `llama3.1:8b` per CLAUDE.md), and returns the generated text in the response. In tests, `ollama_client.generate` is patched via `unittest.mock.patch` to return a canned response, isolating the test from the local Ollama daemon. This matches the ArthaBuild CLAUDE.md rule: all inference via local Ollama, never external LLM APIs.

## What Is Done Right
This test exercises the full request-to-response path for the primary chat feature: Pydantic body validation, auth guard, Ollama client call (mocked), and response serialization. It confirms the endpoint is wired and returns 200 in the success case, which is the prerequisite for all chat-level tests (CASE-091, CASE-092).

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_chatbot_returns_200_with_ollama -v
```
If the test fails, check:
1. Confirm the patch target matches the actual import path in `routers/chat.py` (e.g., `from langchain_ollama import ChatOllama` → patch `routers.chat.ChatOllama`)
2. Confirm `JWT_SECRET_KEY` is set in the test environment (auth dependency will reject the token if the key doesn't match)
3. Confirm the mock returns a structure matching what the route expects (string or object with `.content`)

## Architecture Mapping

**Layer:** Backend Router (chat)

**Flow:**
    [POST /api/chat — {message: "How do I create a SuiteScript?"}]
      → [routers/chat.py Depends(get_current_user_id) → user_id]
        → [ollama_client.generate("llama3.1:8b", message) — MOCKED → "Here is how..."]
          → [return 200 {reply: "Here is how...", session_id: "..."}]
                ↑ THIS TEST COVERS THIS PATH

**Upstream:** Phase 04 frontend chat input component
**Downstream:** Chat history stored in SQLite; session_id returned for conversation threading (CASE-092)

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_chatbot_returns_200_with_ollama -v`

## Downstream Impact
**Impact if unfixed:** The entire chat feature is broken. ArthaBuild's core value proposition — AI-assisted SuiteScript development — is non-functional. All Phase 04 frontend chat components fail with network or 4xx errors.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-091 (chat reads message field), CASE-092 (chat returns session_id), CASE-087 (health returns 200)
