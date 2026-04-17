---
id: CASE-136
title: "System raises clear error when FAISS index dimension (768) doesn't match new embedding dim"
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
feature: "FAISS dimension guard"
test_ref: ""
files:
  - path: src/backend/rag_pipeline.py
    lines: ""
---

## Why This Case Was Created
ArthaBuild migrated from OpenAI embeddings (1536-dim) to nomic-embed-text via Ollama (768-dim). If an old 1536-dim FAISS index is loaded, adding 768-dim vectors will cause a silent FAISS dimension mismatch error or corrupt results. The system should detect this mismatch at load time and raise a clear, actionable error. No test verifies this guard exists.

## What Is Wrong
No test exists for this behavior. A customer who somehow has an old vectorstore on disk could get cryptic FAISS errors or silently wrong search results.

## Why It Was Done This Way (Root Cause)
The migration from OpenAI to Ollama embeddings was completed in Phase 03. Backward compatibility with old indexes was not explicitly handled. The dimension guard was not implemented or tested.

## What Is Done Right
The system uses 768-dim embeddings consistently via nomic-embed-text. FAISS index creation uses `faiss.IndexFlatL2(768)`. The vectorstore save/load functions exist.

## How To Fix It
Write the following test in `tests/test_rag_pipeline.py`:

```python
@pytest.mark.asyncio
async def test_faiss_dimension_mismatch_raises_clear_error(tmp_path):
    """
    Verify that loading a FAISS index with wrong dimension (e.g., 1536 from
    old OpenAI embeddings) raises a clear ValueError before the system accepts it.
    """
    import faiss
    import numpy as np
    from src.backend.rag_pipeline import load_vectorstore

    old_dim = 1536  # OpenAI embedding dimension
    old_index = faiss.IndexFlatL2(old_dim)
    old_vector = np.random.rand(1, old_dim).astype("float32")
    old_index.add(old_vector)

    old_index_path = tmp_path / "old_vectorstore"
    faiss.write_index(old_index, str(old_index_path))

    # System should detect dimension mismatch and raise
    with pytest.raises((ValueError, RuntimeError), match="dimension"):
        load_vectorstore(str(old_index_path), expected_dim=768)
```

## Architecture Mapping

**Layer:** RAG Pipeline / Startup Safety (Backend)

**Flow:**
    load_vectorstore(path) → read_index → check index.d == 768 → raise ValueError if mismatch ← NO TEST EXISTS HERE

**Upstream:** Container restart loads persisted FAISS index from disk
**Downstream:** If missing, 1536-dim index loaded silently → all embedding adds fail or return garbage search results

## Verification
- [ ] Write test: `pytest tests/test_rag_pipeline.py::test_faiss_dimension_mismatch_raises_clear_error -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for dimension guard. Migration or misconfiguration causes cryptic FAISS errors that are hard to diagnose in production.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-132, CASE-135
