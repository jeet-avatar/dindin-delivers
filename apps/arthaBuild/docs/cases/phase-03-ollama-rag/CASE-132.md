---
id: CASE-132
title: "FAISS vectorstore survives container restart (persisted to /app/data/vectorstore_ollama)"
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
feature: "FAISS persistence"
test_ref: ""
files:
  - path: src/backend/rag_pipeline.py
    lines: ""
  - path: src/backend/main.py
    lines: ""
---

## Why This Case Was Created
The FAISS vectorstore is saved to disk at `/app/data/vectorstore_ollama`. On restart, the application is expected to reload from disk rather than starting with an empty index. If persistence is broken, all embedded SuiteScript and NetSuite data is lost on every container restart — requiring full re-ingestion before the system is usable.

## What Is Wrong
No test exists for this behavior. If the save/load cycle is broken, the test suite will not catch it.

## Why It Was Done This Way (Root Cause)
Phase 03 implemented persistence using FAISS's native `write_index`/`read_index` methods. The disk path is `/app/data/vectorstore_ollama`. The test suite covers in-memory search but not the persistence round-trip.

## What Is Done Right
FAISS index is created and populated in-memory. A save path is configured. The startup code attempts to load from disk if the file exists.

## How To Fix It
Write the following test in `tests/test_rag_pipeline.py`:

```python
@pytest.mark.asyncio
async def test_faiss_vectorstore_persists_across_restart(tmp_path):
    """
    Verify FAISS index save/load round-trip returns same search results.
    Simulates container restart by saving index, clearing in-memory state,
    reloading from disk, and asserting search results match.
    """
    import faiss
    import numpy as np
    from src.backend.rag_pipeline import save_vectorstore, load_vectorstore, search_vectorstore

    index_path = tmp_path / "vectorstore_ollama"

    # Create and populate index
    dim = 768
    index = faiss.IndexFlatL2(dim)
    vector = np.random.rand(1, dim).astype("float32")
    index.add(vector)

    # Save to disk
    save_vectorstore(index, str(index_path))

    # Simulate restart: reload from disk
    loaded_index = load_vectorstore(str(index_path))
    assert loaded_index is not None, "Vectorstore failed to reload from disk"
    assert loaded_index.ntotal == 1, (
        f"Expected 1 vector after reload, got {loaded_index.ntotal}"
    )

    # Assert search returns same result
    result_distances, result_ids = loaded_index.search(vector, k=1)
    assert result_ids[0][0] == 0, "Search after reload did not return correct vector"
```

## Architecture Mapping

**Layer:** RAG Pipeline / Persistence (Backend)

**Flow:**
    FAISS in-memory index → write_index(path) → [restart] → read_index(path) → in-memory index ← NO TEST EXISTS HERE

**Upstream:** SuiteScript embed or NetSuite ingest populates the index
**Downstream:** If broken, container restart wipes all embeddings — system silently returns empty context on every chat query

## Verification
- [ ] Write test: `pytest tests/test_rag_pipeline.py::test_faiss_vectorstore_persists_across_restart -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for vectorstore persistence. A deploy or container restart would silently break all RAG context until re-ingestion.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-131, CASE-136, CASE-153
