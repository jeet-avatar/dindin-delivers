---
id: CASE-131
title: "POST /api/chat injects FAISS-retrieved context into Ollama prompt"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Requires running Ollama + FAISS vectorstore — deferred to M2 integration test phase"
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "RAG pipeline (context injection)"
test_ref: ""
files:
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/rag_pipeline.py
    lines: ""
---

## Why This Case Was Created
The RAG pipeline is the core value proposition of ArthaBuild: user query → embed → FAISS search → inject context → Ollama response. No test verifies that the context retrieved from FAISS is actually included in the prompt sent to Ollama. If context injection is silently dropped, the LLM answers from training data only, not from the customer's NetSuite data.

## What Is Wrong
No test exists for this behavior. If the FAISS-to-Ollama context injection is broken, the test suite will not catch it.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented the RAG pipeline end-to-end, but test coverage focused on the embedding and retrieval steps in isolation. The integration between FAISS retrieval results and Ollama prompt construction was not tested as a unit.

## What Is Done Right
The embedding pipeline (nomic-embed-text → FAISS) and the Ollama chat call exist as separate components. FAISS similarity search returns top-K chunks. The chat router exists at `/api/chat`.

## How To Fix It
Write the following test in `tests/test_rag_pipeline.py`:

```python
@pytest.mark.asyncio
async def test_chat_injects_faiss_context_into_ollama_prompt(client, auth_headers):
    """
    Verify that FAISS-retrieved chunks are injected into the Ollama system prompt.
    Mock FAISS to return a specific chunk. Mock Ollama. Assert the Ollama call
    includes the chunk text in its messages payload.
    """
    test_chunk = "SuiteScript API: nlapiLoadRecord('customer', 12345)"

    with patch("src.backend.rag_pipeline.faiss_search") as mock_search, \
         patch("src.backend.rag_pipeline.ollama_chat") as mock_ollama:

        mock_search.return_value = [{"text": test_chunk, "score": 0.95}]
        mock_ollama.return_value = {"message": {"content": "Here is the answer."}}

        resp = await client.post(
            "/api/chat",
            json={"message": "How do I load a customer record?", "session_id": "test-session"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # Assert Ollama was called with the chunk in the prompt
        call_args = mock_ollama.call_args
        prompt_text = str(call_args)
        assert test_chunk in prompt_text, (
            f"Expected FAISS chunk to appear in Ollama prompt, got: {prompt_text}"
        )
```

## Architecture Mapping

**Layer:** RAG Pipeline (Backend)

**Flow:**
    POST /api/chat → embed query (nomic-embed-text) → faiss_search() → inject chunks → ollama_chat() ← NO TEST EXISTS HERE

**Upstream:** User sends message via chat UI
**Downstream:** If broken, Ollama answers without customer NetSuite context — silently wrong answers

## Verification
- [ ] Write test: `pytest tests/test_rag_pipeline.py::test_chat_injects_faiss_context_into_ollama_prompt -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for context injection. A refactor could silently break RAG and all chat answers would degrade to generic LLM responses with no NetSuite context.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-132, CASE-133, CASE-137
