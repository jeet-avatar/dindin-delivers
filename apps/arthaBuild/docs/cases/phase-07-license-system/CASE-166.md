---
id: CASE-166
title: "Valid license is cached locally to survive brief license server outages"
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
feature: "License caching"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
ArthaBuild is deployed in customer VPCs where internet connectivity may be intermittent. A valid license should be cached locally (e.g., in memory or a local file) with a TTL so the system continues operating during brief license server outages. Without caching, any network hiccup causes immediate license failure and product downtime. No test verifies the caching behavior.

## What Is Wrong
No test exists for this behavior. Without caching, the system fails during license server maintenance windows even for customers with valid subscriptions.

## Why It Was Done This Way (Root Cause)
Phase 07 plans a license cache with a configurable TTL (default: 24 hours). After a successful validation, the result is stored locally. On subsequent requests, the cached result is returned without a server call. The feature is designed but not yet implemented.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The cache design uses an in-memory dict or local SQLite record with a timestamp. The TTL approach allows the system to function during brief outages while still enforcing license expiry on a daily basis.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_license_cache_used_when_server_unavailable(client):
    """
    Verify that when the license server is unavailable, the system uses
    the cached license result from the previous successful validation.
    """
    with patch("src.backend.routers.license.check_license_server") as mock_check, \
         patch("src.backend.routers.license.get_cached_license") as mock_cache:

        # Cache has a valid recent license
        mock_cache.return_value = {
            "valid": True,
            "expiry_date": "2027-01-01",
            "plan_type": "professional",
            "seat_count": 10,
            "cached_at": "2026-04-10T10:00:00",
        }

        # Server is unavailable
        import asyncio
        mock_check.side_effect = asyncio.TimeoutError("License server unreachable")

        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-PRO-VALID-KEY-12345"},
        )
        # Should use cached result
        assert resp.status_code == 200, (
            f"Expected 200 using cached license, got {resp.status_code}"
        )
        data = resp.json()
        assert data["valid"] is True


@pytest.mark.asyncio
async def test_license_cache_respects_ttl(client):
    """
    Verify that stale cached licenses (past TTL) trigger a fresh server check.
    """
    from datetime import datetime, timedelta

    with patch("src.backend.routers.license.check_license_server") as mock_check, \
         patch("src.backend.routers.license.get_cached_license") as mock_cache:

        # Cache is expired (25 hours old with 24h TTL)
        stale_time = (datetime.utcnow() - timedelta(hours=25)).isoformat()
        mock_cache.return_value = {
            "valid": True,
            "expiry_date": "2027-01-01",
            "cached_at": stale_time,
        }
        mock_check.return_value = {"valid": True, "expiry_date": "2027-01-01", "plan_type": "professional", "seat_count": 10}

        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-PRO-VALID-KEY-12345"},
        )
        assert resp.status_code == 200
        # Server should have been called (cache expired)
        mock_check.assert_called_once()
```

## Architecture Mapping

**Layer:** License System / Caching (Backend)

**Flow:**
    POST /api/license/validate → get_cached_license() → if fresh and valid: return cached → else: check_server() → update_cache() ← NO TEST EXISTS HERE

**Upstream:** Any validation call during license server outage
**Downstream:** If missing, brief network issues cause product downtime for all valid customers

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_license_cache_used_when_server_unavailable -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for license caching. Network blips cause product downtime even for customers with active licenses.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-160, CASE-165
