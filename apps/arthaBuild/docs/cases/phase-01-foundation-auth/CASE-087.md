---
id: CASE-087
title: "GET /api/health returns 200"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "GET /api/health"
test_ref: "tests/test_health.py::test_health_returns_200"
files:
  - path: src/backend/rawapi.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies the basic liveness of the ArthaBuild backend: GET /api/health must return HTTP 200. This is the first test any deployment pipeline, load balancer health check, or monitoring system runs before asserting anything about business logic.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `rawapi.py` — confirm the `/api/health` route exists and is not accidentally removed or renamed
- Startup validation — `rawapi.py` checks `JWT_SECRET_KEY` at startup and raises `RuntimeError` if missing; if the test environment does not set this env var, the app fails to start and the health endpoint never becomes reachable (covered separately in CASE-089)
- Confirm the health route is not behind an auth dependency — it must be publicly accessible for load balancer checks

## Why It Was Done This Way (Root Cause)
The health endpoint is registered directly in `rawapi.py` without any authentication dependency. It is a standard FastAPI `@app.get("/api/health")` route that returns a simple JSON response. The route is intentionally kept simple and stateless — no DB query, no Ollama check — to ensure maximum reliability. Extended health data (Ollama status, SuiteCloud readiness) is added as optional fields that do not cause the endpoint to return a non-200 status if external services are unavailable.

## What Is Done Right
This test is the canonical liveness probe. It confirms: (1) the app starts successfully (all startup validations pass), (2) the `/api/health` route is registered and routable, and (3) the route returns a 200 HTTP status code. Any test suite that imports and starts the FastAPI test client implicitly runs this check first.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_health_returns_200 -v
```
If the test fails, check:
1. `rawapi.py` — confirm `@app.get("/api/health")` or equivalent router registration exists
2. Confirm `JWT_SECRET_KEY` is set in the test environment (via `conftest.py` or `.env.test`)
3. Confirm no startup error is raised before the route handler is reachable

## Architecture Mapping

**Layer:** Backend Application (liveness)

**Flow:**
    [GET /api/health — no auth required]
      → [rawapi.py health route handler]
        → [return 200 {status: "ok", ...}]
                ↑ THIS TEST COVERS THIS PATH

**Upstream:** Load balancer health check, CI smoke test, deployment pipeline readiness probe
**Downstream:** All other endpoints — if /api/health fails, the service is considered unhealthy and traffic is not routed to it

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_health_returns_200 -v`

## Downstream Impact
**Impact if unfixed:** Load balancer health checks fail. ECS/Docker tasks are marked unhealthy and replaced in a restart loop. The entire backend becomes unreachable.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-088 (health response shape), CASE-089 (startup fails without JWT_SECRET_KEY), CASE-086 (health includes suitecloud_ready)
