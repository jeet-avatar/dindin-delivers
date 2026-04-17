---
id: CASE-172
title: "System handles 50 concurrent requests to /api/chat within 5 second p99"
phase: "08"
phase_name: "Launch Readiness"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Requires AWS infrastructure or load testing tool — deferred to M2"
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Load test baseline"
test_ref: ""
files:
  - path: tests/load/locustfile.py
    lines: ""
---

## Why This Case Was Created
Before launch, ArthaBuild needs a load test baseline to verify the system handles concurrent users within acceptable response time limits. The chat endpoint is the most expensive operation (FAISS search + Ollama inference). The target is 50 concurrent requests with p99 latency under 5 seconds. Without a baseline, performance regressions are invisible until customers complain.

## What Is Wrong
No test exists for this behavior. No load test baseline means no performance budget to regress against.

## Why It Was Done This Way (Root Cause)
Phase 08 plans a load test using Locust or k6. The target metrics (50 concurrent, 5s p99) are defined based on expected customer team sizes (5-25 users). The load test is planned but not yet written.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 08. FastAPI with uvicorn handles async requests efficiently. The FAISS search is CPU-bound but fast (< 100ms for 768-dim index). Ollama inference is the bottleneck (1-3s for llama3.1:8b).

## How To Fix It
Write the following test in `tests/load/locustfile.py`:

```python
from locust import HttpUser, task, between
import json

class ArthaBuildUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Login and get auth token."""
        resp = self.client.post("/api/auth/login", data={
            "username": "loadtest@example.com",
            "password": "LoadTest123!",
        })
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")

    @task(3)
    def chat(self):
        if not self.token:
            return
        self.client.post(
            "/api/chat",
            json={"message": "What are my top 10 customers?", "session_id": "load-test"},
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=10,
        )

    @task(1)
    def health(self):
        self.client.get("/api/health")
```

And a pytest wrapper in `tests/load/test_load_baseline.py`:

```python
import subprocess
import pytest

@pytest.mark.load
def test_load_baseline_50_concurrent_users():
    """
    Run Locust load test: 50 concurrent users, 60 second run.
    Assert p99 < 5000ms and failure rate < 1%.
    """
    result = subprocess.run([
        "locust", "-f", "tests/load/locustfile.py",
        "--headless", "--users", "50", "--spawn-rate", "10",
        "--run-time", "60s", "--host", "http://localhost:8000",
        "--csv", "/tmp/locust_results",
        "--exit-code-on-error", "1",
    ], capture_output=True, text=True, timeout=120)

    assert result.returncode == 0, f"Load test failed:\n{result.stdout}\n{result.stderr}"
    # Parse CSV for p99 and failure rate
    # (parse /tmp/locust_results_stats.csv for detailed assertions)
```

## Architecture Mapping

**Layer:** Performance / Load Testing

**Flow:**
    50 concurrent users → /api/chat (FAISS + Ollama) → p99 < 5s, failure rate < 1% ← NO TEST EXISTS HERE

**Upstream:** Customer teams of 5-25 users during peak usage
**Downstream:** If system cannot handle load, users experience timeouts and abandon the product

## Verification
- [ ] Write test: `pytest tests/load/test_load_baseline.py::test_load_baseline_50_concurrent_users -m load -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no performance baseline. A dependency change or configuration tweak could degrade p99 from 2s to 30s without detection.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-140, CASE-167
