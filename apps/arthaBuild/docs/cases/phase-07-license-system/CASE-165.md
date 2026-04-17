---
id: CASE-165
title: "POST /api/license/refresh re-validates license against license server"
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
feature: "License refresh"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
When a customer renews their subscription, the cached license state may still show expired. A `POST /api/license/refresh` endpoint allows the admin to trigger an immediate re-check against the license server without restarting the container. Without this endpoint, license renewal requires a container restart to take effect. No test verifies this endpoint exists and works.

## What Is Wrong
No test exists for this behavior. Without a refresh endpoint, license renewals require downtime (container restart) to take effect — poor customer experience.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the refresh endpoint as part of the license management system. The endpoint clears the local license cache and re-validates against the remote server. The feature is designed but not yet implemented.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The license caching system (CASE-166) is a prerequisite. The admin-only auth middleware exists.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_license_refresh_re_validates_against_server(client, admin_headers):
    """
    Verify POST /api/license/refresh:
    1. Calls the license server (not cached)
    2. Updates the cached license state
    3. Returns the new license status
    """
    call_count = {"server": 0}

    with patch("src.backend.routers.license.check_license_server") as mock_check, \
         patch("src.backend.routers.license.invalidate_license_cache") as mock_invalidate:

        def count_and_return():
            call_count["server"] += 1
            return {"valid": True, "expiry_date": "2027-01-01", "plan_type": "professional", "seat_count": 10}

        mock_check.side_effect = count_and_return

        resp = await client.post("/api/license/refresh", headers=admin_headers)
        assert resp.status_code == 200

        # Cache should have been invalidated
        mock_invalidate.assert_called_once()

        # License server should have been called
        assert call_count["server"] == 1, "License server not called during refresh"

        data = resp.json()
        assert data.get("valid") is True
```

## Architecture Mapping

**Layer:** License System / Cache Management (Backend)

**Flow:**
    POST /api/license/refresh (admin only) → invalidate_cache() → check_license_server() → update_cache() → return new status ← NO TEST EXISTS HERE

**Upstream:** Customer renews subscription and admin triggers refresh
**Downstream:** If missing, license renewal requires container restart to take effect

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_license_refresh_re_validates_against_server -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for license refresh. Renewals require downtime to take effect.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-166
