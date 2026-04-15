---
id: CASE-157
title: "POST /api/license/validate returns 200 for valid license key"
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
feature: "POST /api/license/validate"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
The license validation endpoint is the gateway to all ArthaBuild functionality. A valid license key must return 200 with license details so the application can unlock full features. No test exists for the happy-path validation flow.

## What Is Wrong
No test exists for this behavior. If the license validation endpoint is broken, all customers are blocked from using the product.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system. The endpoint is designed but may not yet be implemented. This PENDING case records the test requirement so it can be written when the feature is built.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The license system design is documented in `.planning/phases/07-license-system/07-01-PLAN.md`.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_validate_license_returns_200_for_valid_key(client):
    """
    Verify POST /api/license/validate returns 200 with license details
    when provided a valid license key.
    """
    with patch("src.backend.routers.license.check_license_server") as mock_check:
        mock_check.return_value = {
            "valid": True,
            "expiry_date": "2027-01-01",
            "plan_type": "professional",
            "seat_count": 10,
        }

        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-PRO-VALID-KEY-12345"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert "expiry_date" in data
        assert "plan_type" in data
```

## Architecture Mapping

**Layer:** License System (Backend)

**Flow:**
    POST /api/license/validate {license_key} → check_license_server() → return {valid, expiry_date, plan_type, seat_count} ← NO TEST EXISTS HERE

**Upstream:** Application startup or customer activation flow
**Downstream:** If broken, all customers are blocked — complete product unavailability

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_validate_license_returns_200_for_valid_key -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for license validation. A broken endpoint blocks all customers from using the product.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-158, CASE-159, CASE-160, CASE-161, CASE-162
