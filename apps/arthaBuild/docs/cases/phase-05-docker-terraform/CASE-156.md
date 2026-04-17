---
id: CASE-156
title: "Docker Compose passes all required env vars (JWT_SECRET_KEY, DB path) to backend"
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
feature: "Docker env var injection"
test_ref: ""
files:
  - path: docker-compose.yml
    lines: ""
  - path: .env.example
    lines: ""
---

## Why This Case Was Created
The FastAPI backend crashes at startup if `JWT_SECRET_KEY` is not set (raises `RuntimeError`). It also requires the SQLite database path environment variable. Docker Compose must read from the `.env` file and pass these variables to the backend container. If any required variable is missing, the backend container crashes immediately. No test verifies env var injection works correctly.

## What Is Wrong
No test exists for this behavior. A missing `env_file:` directive or incorrect variable name in docker-compose.yml causes backend startup failure with a cryptic `RuntimeError`.

## Why It Was Done This Way (Root Cause)
Phase 05 configured env var injection via `env_file: .env` in docker-compose.yml. The `.env.example` documents required variables. However, no automated test verifies that all required variables are present in `.env.example` and correctly injected into the container.

## What Is Done Right
`docker-compose.yml` has `env_file: .env` for the backend service. `.env.example` lists all required variables. The backend raises `RuntimeError` at startup if `JWT_SECRET_KEY` is missing, which is a fast-fail pattern.

## How To Fix It
Write the following test in `tests/integration/test_env_injection.py`:

```python
import subprocess
import requests
import pytest
import os

@pytest.mark.integration
def test_backend_starts_with_required_env_vars():
    """
    Verify backend container starts successfully when all required env vars
    are provided via .env file. Health check must return 200.
    """
    resp = requests.get("http://localhost:8000/api/health", timeout=10)
    assert resp.status_code == 200, (
        f"Backend health check failed — may indicate missing env vars: {resp.text}"
    )
    data = resp.json()
    assert data.get("status") == "healthy"


def test_env_example_contains_all_required_variables():
    """
    Verify .env.example documents all required environment variables
    so customers know what to set.
    """
    env_example_path = os.path.join(
        os.path.dirname(__file__), "../../.env.example"
    )
    with open(env_example_path) as f:
        content = f.read()

    required_vars = [
        "JWT_SECRET_KEY",
        "DATABASE_URL",
        "JWT_ALGORITHM",
        "ACCESS_TOKEN_EXPIRE_MINUTES",
    ]
    for var in required_vars:
        assert var in content, (
            f"Required env var '{var}' missing from .env.example"
        )
```

## Architecture Mapping

**Layer:** Infrastructure / Environment Configuration

**Flow:**
    .env file → docker-compose env_file → backend container environment → FastAPI startup checks → RuntimeError if missing ← NO TEST EXISTS HERE

**Upstream:** Customer copies .env.example → .env and fills in values
**Downstream:** If injection broken, backend crashes at startup with RuntimeError — system completely non-functional

## Verification
- [ ] Write test: `pytest tests/integration/test_env_injection.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for env var injection. A compose file change could silently prevent all required secrets from reaching the backend.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-151, CASE-155, CASE-169
