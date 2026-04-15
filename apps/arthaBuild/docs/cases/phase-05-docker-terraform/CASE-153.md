---
id: CASE-153
title: "SQLite DB and FAISS vectorstore survive Docker Compose restart"
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
feature: "Docker volume persistence"
test_ref: ""
files:
  - path: docker-compose.yml
    lines: ""
---

## Why This Case Was Created
ArthaBuild stores the SQLite database and FAISS vectorstore on a Docker named volume (`/app/data`). After `docker compose restart` or `docker compose down && up`, all data must persist. If the volume is not properly mounted, a restart wipes all users, chat history, and embeddings — data loss for the customer. No test verifies persistence across a compose restart.

## What Is Wrong
No test exists for this behavior. A volume misconfiguration causes silent data loss on every container restart.

## Why It Was Done This Way (Root Cause)
Phase 05 defined the `arthabuild_data` volume in `docker-compose.yml` and mounted it to `/app/data`. Persistence was verified manually during development. No automated test performs a restart and checks data survives.

## What Is Done Right
`docker-compose.yml` defines a named volume `arthabuild_data` mounted to `/app/data` in the backend service. The SQLite DB path and FAISS vectorstore path both point to `/app/data/`. Docker named volumes persist across container restarts by default.

## How To Fix It
Write the following test in `tests/integration/test_volume_persistence.py`:

```python
import subprocess
import requests
import pytest

BASE_URL = "http://localhost:8000"

@pytest.mark.integration
def test_data_persists_across_compose_restart():
    """
    Verify SQLite DB and FAISS vectorstore survive docker compose restart.
    Steps:
    1. Create a user (writes to SQLite)
    2. Restart compose
    3. Verify user still exists (reads from SQLite)
    """
    # 1. Create a user
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "persist_test@example.com",
        "password": "TestPass123!",
        "first_name": "Persist",
        "last_name": "Test",
    })
    assert resp.status_code == 201, f"Registration failed: {resp.text}"

    # 2. Restart compose
    result = subprocess.run(
        ["docker", "compose", "restart", "backend"],
        capture_output=True, text=True, timeout=60
    )
    assert result.returncode == 0, f"Restart failed: {result.stderr}"

    # Wait for backend to be healthy
    import time
    for _ in range(10):
        try:
            health = requests.get(f"{BASE_URL}/api/health", timeout=3)
            if health.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)

    # 3. Verify user still exists
    resp = requests.post(f"{BASE_URL}/api/auth/check-user", json={"email": "persist_test@example.com"})
    assert resp.status_code == 200, f"User not found after restart: {resp.text}"
    assert resp.json().get("exists") is True
```

## Architecture Mapping

**Layer:** Infrastructure / Data Persistence (Docker Volume)

**Flow:**
    docker compose up → /app/data (named volume) → SQLite DB + FAISS index
    docker compose restart → volume reattached → data intact ← NO TEST EXISTS HERE

**Upstream:** Container restart during maintenance or deployment
**Downstream:** If broken, all users, chat history, and embeddings lost on every restart

## Verification
- [ ] Write test: `pytest tests/integration/test_volume_persistence.py::test_data_persists_across_compose_restart -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for volume persistence. A compose config change could cause data loss in production.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-132, CASE-151, CASE-170
