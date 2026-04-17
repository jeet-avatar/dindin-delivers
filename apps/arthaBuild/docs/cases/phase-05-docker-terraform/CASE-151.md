---
id: CASE-151
title: "docker compose up starts all 4 services (backend, frontend, ollama, nginx) successfully"
phase: "05"
phase_name: "Docker & Terraform"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Requires running Docker Compose environment — deferred to M2 staging"
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Docker Compose startup"
test_ref: ""
files:
  - path: docker-compose.yml
    lines: ""
---

## Why This Case Was Created
ArthaBuild runs as 4 Docker Compose services: `backend` (FastAPI), `frontend` (Vite/Nginx serving React), `ollama` (LLM server), and `nginx` (reverse proxy). All 4 must start and pass health checks for the system to be functional. No automated test verifies that `docker compose up` results in all 4 services healthy.

## What Is Wrong
No test exists for this behavior. A broken Dockerfile, missing environment variable, or port conflict causes compose startup failure — discovered only at customer deployment time.

## Why It Was Done This Way (Root Cause)
Phase 05 implemented Docker Compose configuration. Compose startup was manually verified during development. No CI test runs compose and checks service health. Adding a compose integration test to CI would catch Dockerfile regressions early.

## What Is Done Right
`docker-compose.yml` defines all 4 services with health checks. Each service has a Dockerfile. The nginx config routes correctly. The `.env.example` documents required variables.

## How To Fix It
Write the following test in `tests/integration/test_compose_startup.py`:

```python
import subprocess
import time
import requests
import pytest

def test_all_compose_services_start_and_pass_health_checks():
    """
    Verify docker compose up brings all 4 services to healthy state.
    Runs compose up, waits for health checks, then tears down.
    """
    # Start compose
    result = subprocess.run(
        ["docker", "compose", "up", "-d", "--wait"],
        capture_output=True, text=True, timeout=120
    )
    assert result.returncode == 0, f"docker compose up failed:\n{result.stderr}"

    try:
        # Verify backend health
        resp = requests.get("http://localhost:8000/api/health", timeout=10)
        assert resp.status_code == 200, f"Backend health check failed: {resp.status_code}"

        # Verify frontend accessible
        resp = requests.get("http://localhost:80", timeout=10)
        assert resp.status_code == 200, f"Frontend not accessible: {resp.status_code}"

        # Verify ollama accessible
        resp = requests.get("http://localhost:11434/api/tags", timeout=10)
        assert resp.status_code == 200, f"Ollama not accessible: {resp.status_code}"

    finally:
        subprocess.run(["docker", "compose", "down"], capture_output=True, timeout=30)
```

## Architecture Mapping

**Layer:** Infrastructure / Deployment (Docker Compose)

**Flow:**
    docker compose up → backend:8000 healthy → frontend:80 healthy → ollama:11434 healthy → nginx:443 healthy ← NO TEST EXISTS HERE

**Upstream:** Customer runs `docker compose up` during installation
**Downstream:** If any service fails to start, the system is completely non-functional for the customer

## Verification
- [ ] Write test: `pytest tests/integration/test_compose_startup.py::test_all_compose_services_start_and_pass_health_checks -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for compose startup. A Dockerfile change silently breaks installation for new customers.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-152, CASE-153, CASE-154, CASE-156
