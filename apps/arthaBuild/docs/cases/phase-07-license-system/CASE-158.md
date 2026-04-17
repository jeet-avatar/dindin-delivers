---
id: CASE-158
title: "POST /api/license/validate returns 403 for invalid/expired license key"
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
feature: "POST /api/license/validate (invalid key)"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
The license system must reject invalid and expired license keys with a 403 response. If invalid keys are accepted, the product is accessible without payment. If the error response is wrong (e.g., 500 instead of 403), the frontend cannot display a helpful "license expired" message to the customer.

## What Is Wrong
No test exists for this behavior. If the invalid key rejection path is broken, the test suite will not catch it.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system. The invalid key rejection path is part of the design but not yet implemented. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The license system design specifies that invalid/expired keys return 403 with a `reason` field.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_validate_license_returns_403_for_invalid_key(client):
    """
    Verify POST /api/license/validate returns 403 when the key is invalid.
    """
    with patch("src.backend.routers.license.check_license_server") as mock_check:
        mock_check.return_value = {"valid": False, "reason": "invalid_key"}

        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-INVALID-KEY-99999"},
        )
        assert resp.status_code == 403
        data = resp.json()
        assert data.get("valid") is False or "detail" in data


@pytest.mark.asyncio
async def test_validate_license_returns_403_for_expired_key(client):
    """
    Verify POST /api/license/validate returns 403 when the key is expired.
    """
    with patch("src.backend.routers.license.check_license_server") as mock_check:
        mock_check.return_value = {"valid": False, "reason": "expired"}

        resp = await client.post(
            "/api/license/validate",
            json={"license_key": "ARTHABUILD-PRO-EXPIRED-KEY-00001"},
        )
        assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** License System (Backend)

**Flow:**
    POST /api/license/validate {invalid_key} → check_license_server() → {valid: false} → raise 403 ← NO TEST EXISTS HERE

**Upstream:** Customer with expired subscription attempts to use the product
**Downstream:** If broken, expired licenses allow continued product use without payment

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_validate_license_returns_403_for_invalid_key -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for license rejection. A bug could allow unauthorized product access.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-162
