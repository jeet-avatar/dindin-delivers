---
id: CASE-164
title: "GET /api/health includes license_valid field"
phase: "07"
phase_name: "License System"
category: FEATURE_TEST
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "License status in health check"
test_ref: ""
files:
  - path: src/backend/routers/health.py
    lines: ""
---

## Why This Case Was Created
The health endpoint `GET /api/health` is used by monitoring systems and the frontend status indicator. Including `license_valid: bool` in the health response allows operators and the frontend to quickly check whether the license is active without making a separate license API call. No test verifies this field is present in the health response.

## What Is Wrong
No test exists for this behavior. The `license_valid` field may not be present in the current health response, meaning monitoring systems cannot detect license expiry.

## Why It Was Done This Way (Root Cause)
Phase 07 plans to add `license_valid` to the health endpoint after the license system is implemented. The current health endpoint may return only `{status: "healthy"}`. This PENDING case records the test requirement.

## What Is Done Right
The `GET /api/health` endpoint exists and returns a health status. The license validation logic will be available once Phase 07 is implemented. The health endpoint is a natural place to surface license status.

## How To Fix It
Write the following test in `tests/test_health.py`:

```python
@pytest.mark.asyncio
async def test_health_endpoint_includes_license_valid_field(client):
    """
    Verify GET /api/health includes a license_valid boolean field.
    """
    with patch("src.backend.routers.health.get_cached_license") as mock_license:
        mock_license.return_value = {"valid": True, "plan_type": "professional"}

        resp = await client.get("/api/health")
        assert resp.status_code == 200

        data = resp.json()
        assert "license_valid" in data, (
            f"Expected 'license_valid' field in health response, got: {list(data.keys())}"
        )
        assert isinstance(data["license_valid"], bool)


@pytest.mark.asyncio
async def test_health_endpoint_shows_false_license_valid_when_expired(client):
    """
    Verify GET /api/health shows license_valid: false when license is expired.
    Health endpoint itself should still return 200 (monitoring should see the license status).
    """
    with patch("src.backend.routers.health.get_cached_license") as mock_license:
        mock_license.return_value = {"valid": False, "reason": "expired"}

        resp = await client.get("/api/health")
        assert resp.status_code == 200  # Health endpoint always 200, license_valid shows status
        data = resp.json()
        assert data.get("license_valid") is False
```

## Architecture Mapping

**Layer:** Health Check / License Status (Backend)

**Flow:**
    GET /api/health → get_cached_license() → include license_valid in response ← NO TEST EXISTS HERE

**Upstream:** Monitoring system or frontend status indicator polls health endpoint
**Downstream:** If missing, operators cannot detect license expiry via monitoring

## Verification
- [ ] Write test: `pytest tests/test_health.py::test_health_endpoint_includes_license_valid_field -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for license status in health check. Operators have no monitoring signal for license expiry.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-162, CASE-171
