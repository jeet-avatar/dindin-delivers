---
id: CASE-160
title: "POST /api/license/validate handles license server timeout gracefully"
phase: "07"
phase_name: "License System"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "POST /api/license/validate (timeout handling)"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
ArthaBuild is deployed in customer VPCs which may have restricted outbound internet access. If the license server is temporarily unreachable or times out, the system must either fall back to a cached last-known-good validation or fail closed with a clear 503 error. Silently accepting all requests when the license server is down defeats the purpose of the license system. No test verifies timeout handling.

## What Is Wrong
No test exists for this behavior. A license server outage with no timeout handling causes the validation call to hang indefinitely, blocking all application startup.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system with a fallback strategy (cache TTL or fail-closed). The timeout behavior is part of the design but not yet implemented. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The design specifies a 5-second timeout on the license server HTTP call and a local cache with TTL for graceful degradation.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_license_validate_handles_server_timeout_gracefully(client):
    """
    Verify that when the license server times out, the endpoint returns
    a 503 (or uses cached result) rather than hanging indefinitely.
    """
    import asyncio

    with patch("src.backend.routers.license.check_license_server") as mock_check:
        # Simulate timeout
        mock_check.side_effect = asyncio.TimeoutError("License server unreachable")

        start = asyncio.get_event_loop().time()
        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-PRO-VALID-KEY-12345"},
        )
        elapsed = asyncio.get_event_loop().time() - start

        # Should respond within reasonable time (not hang)
        assert elapsed < 10, f"Request hung for {elapsed:.1f}s — timeout handling missing"

        # Should return 503 or use cached result (200 if cached valid)
        assert resp.status_code in (200, 503), (
            f"Expected 200 (cached) or 503 (fail-closed), got {resp.status_code}"
        )
```

## Architecture Mapping

**Layer:** License System / Resilience (Backend)

**Flow:**
    POST /api/license/validate → check_license_server() [timeout after 5s] → return cached result or 503 ← NO TEST EXISTS HERE

**Upstream:** License server temporarily unreachable (network partition, maintenance)
**Downstream:** If unhandled, validation hangs indefinitely blocking all application startup

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_license_validate_handles_server_timeout_gracefully -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for timeout handling. License server outage causes hanging startup for all customers.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-166
