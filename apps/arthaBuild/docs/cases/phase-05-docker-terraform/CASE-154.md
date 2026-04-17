---
id: CASE-154
title: "Ollama container has llama3.1:8b and nomic-embed-text models pulled on startup"
phase: "05"
phase_name: "Docker & Terraform"
category: FEATURE_TEST
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Ollama model availability"
test_ref: ""
files:
  - path: docker-compose.yml
    lines: ""
  - path: scripts/ollama-entrypoint.sh
    lines: ""
---

## Why This Case Was Created
The Ollama container must have both `llama3.1:8b` (chat) and `nomic-embed-text` (embeddings) models available before the backend starts accepting requests. An entrypoint script pulls the models on first boot. If models are not pulled (e.g., network failure, missing pull command), the first chat or ingest call fails with a confusing model-not-found error. No test verifies models are available after compose startup.

## What Is Wrong
No test exists for this behavior. If the entrypoint script fails silently, the backend starts but every LLM call fails at runtime.

## Why It Was Done This Way (Root Cause)
Phase 05 added an Ollama entrypoint script that runs `ollama pull llama3.1:8b && ollama pull nomic-embed-text` before serving. The compose health check waits for Ollama to be ready. However, "ready" does not guarantee models are pulled — no test checks model availability specifically.

## What Is Done Right
The `scripts/ollama-entrypoint.sh` script pulls models on startup. The compose health check waits for Ollama API to respond at `/api/tags`. The backend depends on the Ollama service being healthy.

## How To Fix It
Write the following test in `tests/integration/test_ollama_models.py`:

```python
import requests
import pytest

OLLAMA_URL = "http://localhost:11434"

@pytest.mark.integration
def test_ollama_has_required_models_after_startup():
    """
    Verify that after compose startup, the Ollama container has both
    llama3.1:8b and nomic-embed-text models available.
    """
    resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
    assert resp.status_code == 200, f"Ollama not accessible: {resp.status_code}"

    models = resp.json().get("models", [])
    model_names = [m.get("name", "") for m in models]

    required_models = ["llama3.1:8b", "nomic-embed-text"]
    for required in required_models:
        assert any(required in name for name in model_names), (
            f"Required model '{required}' not found in Ollama. Available: {model_names}"
        )


@pytest.mark.integration
def test_ollama_can_generate_embedding():
    """
    Verify nomic-embed-text model actually produces a 768-dim embedding.
    """
    resp = requests.post(f"{OLLAMA_URL}/api/embeddings", json={
        "model": "nomic-embed-text",
        "prompt": "test embedding"
    }, timeout=30)
    assert resp.status_code == 200
    embedding = resp.json().get("embedding", [])
    assert len(embedding) == 768, f"Expected 768-dim embedding, got {len(embedding)}"
```

## Architecture Mapping

**Layer:** Infrastructure / Ollama Container (Docker Compose)

**Flow:**
    docker compose up → ollama container starts → entrypoint.sh pulls models → health check passes → backend service starts ← NO TEST EXISTS HERE

**Upstream:** Customer installs ArthaBuild with docker compose
**Downstream:** If models not pulled, every chat and embed call fails at runtime with cryptic errors

## Verification
- [ ] Write test: `pytest tests/integration/test_ollama_models.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for model availability. Network issues during first pull are silently swallowed.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-135, CASE-151
