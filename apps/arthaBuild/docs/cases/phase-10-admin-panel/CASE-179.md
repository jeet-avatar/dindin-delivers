---
id: CASE-179
title: "GET /api/admin/license shows current license status and expiry"
phase: "10"
phase_name: "Admin Panel"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-10T21:55:53Z
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "GET /api/admin/license"
test_ref: ""
files:
  - path: src/backend/routers/admin.py
    lines: ""
---

## Why This Case Was Created
The admin panel must display current license status including the plan type, expiry date, seat count, and seats used. This gives the admin visibility into subscription health and allows proactive renewal before expiry. No test verifies this admin license view endpoint.

## What Is Wrong
No test exists for this behavior. The admin license endpoint is a planned feature for Phase 10 with no existing implementation. It depends on the license system from Phase 07.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 10. It requires the license system from Phase 07 (CASE-157 through CASE-166) to be implemented first. The endpoint aggregates cached license data and current user count.

## What Is Done Right
The license validation system is planned (Phase 07). The admin middleware exists. The user count query is straightforward from the `User` model.

## How To Fix It
Write the following test in `tests/test_admin.py`:

```python
@pytest.mark.asyncio
async def test_admin_license_endpoint_shows_status_and_expiry(client, admin_headers):
    """
    Verify GET /api/admin/license returns current license status with
    plan_type, expiry_date, seat_count, and seats_used.
    """
    with patch("src.backend.routers.admin.get_cached_license") as mock_license:
        mock_license.return_value = {
            "valid": True,
            "plan_type": "professional",
            "expiry_date": "2027-01-01",
            "seat_count": 10,
        }

        resp = await client.get("/api/admin/license", headers=admin_headers)
        assert resp.status_code == 200

        data = resp.json()
        assert "plan_type" in data
        assert "expiry_date" in data
        assert "seat_count" in data
        assert "seats_used" in data, "Missing seats_used (current registered user count)"
        assert isinstance(data["seats_used"], int)
        assert data["seats_used"] >= 0


@pytest.mark.asyncio
async def test_admin_license_endpoint_requires_admin_role(client, user_headers):
    """Verify non-admins cannot view license details."""
    resp = await client.get("/api/admin/license", headers=user_headers)
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Admin API / License Management View (Backend)

**Flow:**
    GET /api/admin/license (admin only) → get_cached_license() + count(User) → return {plan_type, expiry_date, seat_count, seats_used} ← NO TEST EXISTS HERE

**Upstream:** Admin checks subscription health in admin panel
**Downstream:** If broken, admin has no visibility into license status — surprised by unexpected expiry

## Verification
- [ ] Write test: `pytest tests/test_admin.py::test_admin_license_endpoint_shows_status_and_expiry -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for admin license view. Admins cannot monitor subscription health.

## Links
- Phase SUMMARY: `.planning/phases/10-admin-panel/10-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-164, CASE-173
