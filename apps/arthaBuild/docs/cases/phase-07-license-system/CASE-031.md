---
id: CASE-031
title: "/health endpoint leaks ai_ready + suitecloud_ready + license_plan unauthenticated"
phase: "07"
phase_name: "License System"
category: ARCH_VIOLATION
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "224-233"
---

## Why This Case Was Created
Health endpoint audit for information disclosure. The `/health` endpoint is designed to be public — Docker Compose liveness probes, nginx upstreams, and load balancers all call it without credentials. However, the current response includes `ai_ready`, `suitecloud_ready`, `license_valid`, and `license_plan` fields. These reveal the internal state of the AI pipeline, the SuiteCloud CLI installation status, and the license tier to any unauthenticated caller — the same class of information leak as CASE-030 but via a different endpoint.

## What Is Wrong
`src/backend/rawapi.py:224-233`:
```python
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "arthaBuild-api",
        "ai_ready": _ai_ready,
        "suitecloud_ready": _suitecloud_ready,
        "license_valid": _license_valid,
        "license_plan": _license_plan,
    }
```

A load balancer health check only needs `{"status": "ok"}` to determine the service is alive. The additional fields serve no liveness purpose:
- `ai_ready: false` reveals that Ollama is not running — useful for attackers knowing the AI pipeline is degraded
- `suitecloud_ready: false` reveals the SuiteCloud CLI is not installed — useful for knowing NetSuite integration is absent
- `license_plan: "starter"` leaks the license tier (same issue as CASE-030)
- `license_valid: false` reveals the instance is running unlicensed

The test `test_health.py:test_health_response_shape` at line 32 currently asserts `body.get("service") == "arthaBuild-api"`, which will still pass after this fix. No tests assert the presence of `ai_ready` from the health endpoint.

## Why It Was Done This Way (Root Cause)
During development, having all service readiness flags in the health response is convenient — a single `curl /health` tells the developer everything about the server's state. This is appropriate for a dev-mode response but was not split into public vs. authenticated variants before Phase 6 hardening.

## What Is Done Right
The basic `{status: "ok", service: "arthaBuild-api"}` structure is correct. The `_ai_ready` and `_suitecloud_ready` global flags are correctly computed at startup and reflect actual system state. The test `test_health_returns_200` correctly verifies the liveness signal.

## How To Fix It
**Step 1 — Slim down the public `/health` endpoint in `rawapi.py:224-233`:**

```python
@app.get("/health")
async def health():
    """
    Public liveness probe — used by Docker Compose, nginx, and load balancers.
    Returns minimal data: only what is needed to confirm the service is alive.
    For detailed system state, use GET /api/system/status (requires auth).
    """
    return {
        "status": "ok",
        "service": "arthaBuild-api",
    }
```

**Step 2 — Add an authenticated `/api/system/status` endpoint for ops visibility:**

```python
@app.get("/api/system/status")
async def system_status(user_id: int = Depends(get_current_user_id)):
    """
    Authenticated readiness summary for admin dashboard.
    Returns full internal state including AI pipeline and license status.
    """
    return {
        "status": "ok",
        "service": "arthaBuild-api",
        "ai_ready": _ai_ready,
        "suitecloud_ready": _suitecloud_ready,
        "license_valid": _license_valid,
        "license_plan": _license_plan,
    }
```

**Step 3 — Update `test_health.py`:** The existing tests `test_health_returns_200` and `test_health_response_shape` continue to pass. Add a new test verifying that `ai_ready` is NOT in the public health response:

```python
async def test_health_does_not_leak_internal_state(client):
    """Health endpoint must not return ai_ready, license_plan, or suitecloud_ready."""
    resp = await client.get("/health")
    body = resp.json()
    assert "ai_ready" not in body, "Health endpoint leaks ai_ready"
    assert "license_plan" not in body, "Health endpoint leaks license_plan"
    assert "suitecloud_ready" not in body, "Health endpoint leaks suitecloud_ready"
```

## Architecture Mapping

**Layer:** Backend App (rawapi.py — root health endpoint)

**Flow:**

    [Docker Compose liveness probe]        → [GET /health] → {status, service} ← CORRECT
    [nginx upstream health check]          → [GET /health] → same
    [Unauthenticated external scanner]     → [GET /health] → {status, service, ai_ready,
                                                               suitecloud_ready, license_valid,
                                                               license_plan}  ← LEAKS STATE
                                                                          ↑
                                                             PROBLEM LIVES HERE

**Upstream:** Docker Compose `healthcheck`, nginx, AWS ELB health probes, unauthenticated callers
**Downstream:** `_ai_ready`, `_suitecloud_ready`, `_license_valid`, `_license_plan` global vars (set at startup)

## Verification
- [ ] Grep proof: `grep -n "ai_ready\|suitecloud_ready\|license_plan" src/backend/rawapi.py`
- [ ] Test proof: `pytest src/backend/tests/test_health.py -v` — existing tests pass; new test verifies no leakage
- [ ] Runtime proof: `curl http://localhost:8000/health | python3 -m json.tool` — currently shows all fields; after fix, should show only `{status, service}`

## Downstream Impact
**Impact if unfixed:** Security Risk (information disclosure)

Reveals AI pipeline state (Ollama status), license tier, and SuiteCloud CLI installation status to unauthenticated callers. Combined with CASE-030, a full picture of the deployment's capabilities and license status is publicly accessible. Low individual severity but compounds with other information disclosure issues.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-030
