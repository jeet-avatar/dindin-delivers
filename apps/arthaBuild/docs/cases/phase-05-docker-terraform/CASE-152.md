---
id: CASE-152
title: "Nginx routes /api/* to backend:8000 and /* to frontend:5173"
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
feature: "Nginx routing"
test_ref: ""
files:
  - path: nginx/nginx.conf
    lines: ""
---

## Why This Case Was Created
Nginx acts as the single entry point for ArthaBuild, routing `/api/*` requests to the FastAPI backend at `backend:8000` and all other requests (`/*`) to the React frontend. If the routing rules are misconfigured, API calls hit the frontend (returning HTML instead of JSON) or frontend routes serve 404. No integration test verifies the Nginx routing rules.

## What Is Wrong
No test exists for this behavior. An Nginx config change could silently break all API calls by routing them to the frontend.

## Why It Was Done This Way (Root Cause)
Phase 05 configured Nginx as a reverse proxy. The configuration was manually tested. No automated test validates routing rules against a running Nginx instance.

## What Is Done Right
`nginx/nginx.conf` defines location blocks for `/api/` (proxy_pass to backend) and `/` (serve frontend static files or proxy to Vite dev server). The configuration follows standard reverse proxy patterns.

## How To Fix It
Write the following test in `tests/integration/test_nginx_routing.py`:

```python
import requests
import pytest

BASE_URL = "http://localhost:80"  # Nginx entry point in compose

@pytest.mark.integration
def test_nginx_routes_api_to_backend():
    """
    Verify /api/* requests are proxied to the FastAPI backend.
    Response must be JSON (not HTML).
    """
    resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert resp.status_code == 200
    assert resp.headers.get("content-type", "").startswith("application/json"), (
        f"Expected JSON from /api/health, got content-type: {resp.headers.get('content-type')}"
    )
    data = resp.json()
    assert "status" in data


@pytest.mark.integration
def test_nginx_routes_frontend_to_react_app():
    """
    Verify /* requests serve the React frontend (HTML).
    """
    resp = requests.get(f"{BASE_URL}/", timeout=5)
    assert resp.status_code == 200
    content_type = resp.headers.get("content-type", "")
    assert "text/html" in content_type, (
        f"Expected HTML from /, got content-type: {content_type}"
    )
    assert "<div id=\"root\"" in resp.text or "<!DOCTYPE html>" in resp.text
```

## Architecture Mapping

**Layer:** Infrastructure / Nginx Routing

**Flow:**
    client → nginx:80 → /api/* → backend:8000 (JSON)
                                → /* → frontend:80 (HTML) ← NO TEST EXISTS HERE

**Upstream:** Any request to the ArthaBuild URL
**Downstream:** If routing broken, all API calls return HTML 404 — system completely non-functional

## Verification
- [ ] Write test: `pytest tests/integration/test_nginx_routing.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for Nginx routing. A location block ordering error silently routes all API calls to the wrong upstream.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-151, CASE-188
