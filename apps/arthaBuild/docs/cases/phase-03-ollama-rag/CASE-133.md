---
id: CASE-133
title: "SuiteScript files are chunked and embedded into FAISS on /api/deploy/suitescript"
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
feature: "SuiteScript → FAISS embedding"
test_ref: ""
files:
  - path: src/backend/routers/deploy.py
    lines: ""
  - path: src/backend/rag_pipeline.py
    lines: ""
---

## Why This Case Was Created
After a SuiteScript deploy, the uploaded script content should be chunked, embedded via nomic-embed-text, and stored in FAISS so it becomes searchable context for future chat queries. No test verifies this embed-to-store pipeline actually runs after `/api/deploy/suitescript`.

## What Is Wrong
No test exists for this behavior. If the embedding pipeline is skipped or fails silently after deploy, SuiteScript content will never appear in RAG context — but no error is surfaced.

## Why It Was Done This Way (Root Cause)
Phase 03 wired the embedding pipeline to the deploy endpoint, but integration testing between the deploy step and the FAISS store was deferred. The deploy endpoint has tests for the NetSuite API call but not for the downstream embedding step.

## What Is Done Right
The deploy endpoint exists and calls the NetSuite TBA-authenticated SuiteScript upload. The FAISS embedding functions exist as separate utilities. The chunking logic for script files is implemented.

## How To Fix It
Write the following test in `tests/test_deploy.py`:

```python
@pytest.mark.asyncio
async def test_suitescript_deploy_embeds_into_faiss(client, auth_headers):
    """
    Verify that after a successful SuiteScript deploy, the script content
    is chunked and embedded into the FAISS vectorstore.
    Mock NetSuite TBA and the embedding call. Assert FAISS was called with
    content derived from the script.
    """
    script_content = "// SuiteScript 2.x\ndefine(['N/record'], function(record) {});"

    with patch("src.backend.routers.deploy.netsuite_deploy_script") as mock_ns, \
         patch("src.backend.rag_pipeline.embed_and_store") as mock_embed:

        mock_ns.return_value = {"status": "deployed", "script_id": "customscript_test"}
        mock_embed.return_value = True

        resp = await client.post(
            "/api/deploy/suitescript",
            json={"script_content": script_content, "script_name": "test_script"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # Assert embed pipeline was invoked with the script content
        mock_embed.assert_called_once()
        call_args = mock_embed.call_args
        assert script_content in str(call_args), (
            "Expected script content to be passed to embed_and_store"
        )
```

## Architecture Mapping

**Layer:** Deploy Pipeline → RAG Pipeline (Backend)

**Flow:**
    POST /api/deploy/suitescript → NetSuite upload → chunk_text() → embed(nomic-embed-text) → faiss_add() ← NO TEST EXISTS HERE

**Upstream:** User uploads SuiteScript via frontend deploy panel
**Downstream:** If broken, deployed scripts are not searchable in chat — RAG context missing all custom scripts

## Verification
- [ ] Write test: `pytest tests/test_deploy.py::test_suitescript_deploy_embeds_into_faiss -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for the SuiteScript → FAISS embedding pipeline. Refactoring the deploy endpoint could silently stop embedding scripts.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-131, CASE-137, CASE-145
