---
id: CASE-135
title: "App startup validates that llama3.1:8b model is available in Ollama"
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
feature: "Ollama model startup check"
test_ref: ""
files:
  - path: src/backend/main.py
    lines: ""
  - path: src/backend/rag_pipeline.py
    lines: ""
---

## Why This Case Was Created
ArthaBuild requires `llama3.1:8b` and `nomic-embed-text` models to be available in the Ollama container at startup. If they are not pulled, the first chat or embed call fails with a confusing error. A startup health check should validate model availability and fail fast with a clear message. No test verifies this check exists.

## What Is Wrong
No test exists for this behavior. If the startup model check is absent or broken, the app starts successfully but fails at first use — a poor operator experience.

## Why It Was Done This Way (Root Cause)
Phase 03 assumed the Docker Compose entrypoint script pulls models before FastAPI starts. The FastAPI application itself does not independently verify model availability on startup. This validation was not implemented or tested.

## What Is Done Right
The Ollama container is configured in Docker Compose. The model names (`llama3.1:8b`, `nomic-embed-text`) are referenced in configuration. The `/api/health` endpoint exists.

## How To Fix It
Write the following test in `tests/test_startup.py`:

```python
@pytest.mark.asyncio
async def test_startup_checks_ollama_model_availability():
    """
    Verify that the startup routine calls Ollama to check model availability
    and raises a clear error if llama3.1:8b is not available.
    """
    from src.backend.rag_pipeline import check_ollama_models

    with patch("src.backend.rag_pipeline.requests.get") as mock_get:
        # Simulate Ollama response with models available
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "models": [
                {"name": "llama3.1:8b"},
                {"name": "nomic-embed-text"},
            ]
        }
        # Should not raise
        check_ollama_models()

    with patch("src.backend.rag_pipeline.requests.get") as mock_get:
        # Simulate missing model
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"models": []}

        with pytest.raises(RuntimeError, match="llama3.1:8b"):
            check_ollama_models()
```

## Architecture Mapping

**Layer:** Application Startup (Backend)

**Flow:**
    FastAPI startup event → check_ollama_models() → GET http://ollama:11434/api/tags → validate model list ← NO TEST EXISTS HERE

**Upstream:** Docker Compose `docker compose up`
**Downstream:** If missing, first chat call returns 500 with cryptic Ollama error instead of clear startup failure

## Verification
- [ ] Write test: `pytest tests/test_startup.py::test_startup_checks_ollama_model_availability -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for startup model validation. A misconfigured Ollama container causes silent failures at runtime rather than clear startup errors.

## Links
- Phase SUMMARY: `.planning/phases/03-ollama-rag-pipeline/03-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-136, CASE-154, CASE-164
