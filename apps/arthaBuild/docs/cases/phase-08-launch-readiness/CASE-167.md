---
id: CASE-167
title: "Smoke test suite covers all 6 critical API paths in production config"
phase: "08"
phase_name: "Launch Readiness"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Smoke test suite"
test_ref: ""
files:
  - path: tests/smoke/test_smoke.py
    lines: ""
---

## Why This Case Was Created
Before any production deployment, a smoke test suite must verify all 6 critical API paths respond correctly: `/api/health`, `/api/auth/check-user`, `/api/auth/login`, `/api/netsuite/status`, `/api/chats`, and `/api/chat`. These tests run in production config (with real env vars, no mocks) and serve as the final gate before declaring the system ready. No automated smoke test suite exists.

## What Is Wrong
No test exists for this behavior. Without smoke tests, production regressions are discovered by customers rather than by pre-deployment checks.

## Why It Was Done This Way (Root Cause)
Phase 08 is the launch readiness phase. A smoke test suite is the primary deliverable. These tests are planned but not yet written. This PENDING case records the requirement so it can be tracked to completion before launch.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 08. All 6 API endpoints exist in the codebase. Individual endpoint tests exist in the unit test suite. The smoke test suite is a production-config integration test layer.

## How To Fix It
Write the following test in `tests/smoke/test_smoke.py`:

```python
import requests
import pytest

BASE_URL = "http://localhost:8000"  # Or configurable via env var

@pytest.mark.smoke
def test_smoke_health():
    resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert resp.status_code == 200
    assert resp.json().get("status") == "healthy"

@pytest.mark.smoke
def test_smoke_check_user():
    resp = requests.post(f"{BASE_URL}/api/auth/check-user",
                         json={"email": "smoke@example.com"}, timeout=5)
    assert resp.status_code in (200, 404)  # User may or may not exist

@pytest.mark.smoke
def test_smoke_login():
    resp = requests.post(f"{BASE_URL}/api/auth/login",
                         data={"username": "admin@example.com", "password": "AdminPass123!"},
                         timeout=5)
    assert resp.status_code in (200, 401)  # 401 ok — confirms endpoint works

@pytest.mark.smoke
def test_smoke_netsuite_status(smoke_auth_headers):
    resp = requests.get(f"{BASE_URL}/api/netsuite/status",
                        headers=smoke_auth_headers, timeout=5)
    assert resp.status_code == 200

@pytest.mark.smoke
def test_smoke_chats(smoke_auth_headers):
    resp = requests.get(f"{BASE_URL}/api/chats", headers=smoke_auth_headers, timeout=5)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.smoke
def test_smoke_chat_endpoint(smoke_auth_headers):
    resp = requests.post(f"{BASE_URL}/api/chat",
                         json={"message": "ping", "session_id": "smoke-test"},
                         headers=smoke_auth_headers, timeout=30)
    assert resp.status_code == 200
```

## Architecture Mapping

**Layer:** End-to-End / Smoke Tests (Production Config)

**Flow:**
    smoke test runner → real backend (no mocks) → all 6 critical paths → PASS = production ready ← NO TEST EXISTS HERE

**Upstream:** Pre-deployment check before every production release
**Downstream:** If missing, production regressions discovered by customers

## Verification
- [ ] Write test: `pytest tests/smoke/test_smoke.py -m smoke -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated smoke test gate before production deployments. First indication of a regression is a customer complaint.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-151, CASE-152, CASE-164
