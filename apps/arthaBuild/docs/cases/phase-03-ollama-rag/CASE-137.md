---
id: CASE-137
title: "GET /api/netsuite/ingest populates FAISS with NetSuite record embeddings"
phase: "03"
phase_name: "Ollama RAG Pipeline"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Rohan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "NetSuite → FAISS ingestion"
test_ref: ""
files:
  - path: src/backend/routers/netsuite.py
    lines: ""
  - path: src/backend/rag_pipeline.py
    lines: ""
---

## Why This Case Was Created
The ingest endpoint fetches live NetSuite records (customers, transactions, items), converts them to text, embeds them via nomic-embed-text, and stores in FAISS. This is the primary way customer data becomes searchable context. No test verifies the full pipeline from ingest call to FAISS population.

## What Is Wrong
No test exists for this behavior. If the ingest pipeline is broken, NetSuite records are never embedded — chat answers lack live business data context.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented the ingest endpoint and embedding pipeline, but the integration test between NetSuite API fetch, text conversion, embedding, and FAISS store was not written. Individual steps may be tested in isolation.

## What Is Done Right
The NetSuite TBA authentication layer exists. The FAISS embedding utilities exist. The ingest endpoint exists and is auth-protected. NetSuite record-to-text conversion logic exists.

## How To Fix It
Write the following test in `tests/test_netsuite.py`:

```python
@pytest.mark.asyncio
async def test_netsuite_ingest_populates_faiss(client, auth_headers):
    """
    Verify that GET /api/netsuite/ingest fetches NetSuite records,
    converts them to text, and populates FAISS with embeddings.
    Mock NetSuite TBA and Ollama embed. Assert FAISS index grows.
    """
    from src.backend.rag_pipeline import get_vectorstore

    mock_ns_records = [
        {"type": "customer", "id": "1001", "name": "Acme Corp", "email": "acme@example.com"},
        {"type": "transaction", "id": "TRX-500", "amount": 5000.00},
    ]

    with patch("src.backend.routers.netsuite.fetch_netsuite_records") as mock_fetch, \
         patch("src.backend.rag_pipeline.embed_text") as mock_embed:

        mock_fetch.return_value = mock_ns_records
        mock_embed.side_effect = lambda text: [0.1] * 768  # 768-dim stub

        initial_count = get_vectorstore().ntotal

        resp = await client.get("/api/netsuite/ingest", headers=auth_headers)
        assert resp.status_code == 200

        final_count = get_vectorstore().ntotal
        assert final_count > initial_count, (
            f"Expected FAISS to grow after ingest, got {initial_count} → {final_count}"
        )
        data = resp.json()
        assert data.get("embedded_count", 0) == len(mock_ns_records)
```

## Architecture Mapping

**Layer:** NetSuite Integration → RAG Pipeline (Backend)

**Flow:**
    GET /api/netsuite/ingest → fetch_netsuite_records() → record_to_text() → embed_text() → faiss_add() ← NO TEST EXISTS HERE

**Upstream:** User triggers ingest from admin panel or scheduled job
**Downstream:** If broken, FAISS contains only SuiteScript context — no live NetSuite business data in chat responses

## Verification
- [ ] Write test: `pytest tests/test_netsuite.py::test_netsuite_ingest_populates_faiss -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for the NetSuite → FAISS pipeline. Business data silently absent from RAG context.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-131, CASE-133, CASE-132
