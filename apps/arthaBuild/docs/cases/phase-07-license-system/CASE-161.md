---
id: CASE-161
title: "Valid license response includes expiry_date, plan_type, and seat_count"
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
feature: "License metadata"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
The license validation response must include `expiry_date`, `plan_type`, and `seat_count` so the frontend can display license details and the backend can enforce seat limits. If any field is missing, the frontend cannot show license expiry warnings and the seat enforcement logic has no seat limit to check against. No test verifies the response shape.

## What Is Wrong
No test exists for this behavior. A missing field in the response schema breaks downstream license enforcement features.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system with a defined response schema. The `LicenseValidateResponse` Pydantic model includes these fields. The feature is designed but not yet implemented.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The design document specifies the response shape: `{valid: bool, expiry_date: date, plan_type: str, seat_count: int}`.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_valid_license_response_includes_all_metadata_fields(client):
    """
    Verify that a valid license response includes expiry_date, plan_type,
    and seat_count fields with correct types.
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

        # Required metadata fields
        assert "expiry_date" in data, "Missing expiry_date in license response"
        assert "plan_type" in data, "Missing plan_type in license response"
        assert "seat_count" in data, "Missing seat_count in license response"

        # Type checks
        assert isinstance(data["seat_count"], int), "seat_count must be an integer"
        assert data["seat_count"] > 0, "seat_count must be positive"
        assert data["plan_type"] in ("starter", "professional", "enterprise"), (
            f"Unknown plan_type: {data['plan_type']}"
        )
```

## Architecture Mapping

**Layer:** License System / Response Schema (Backend)

**Flow:**
    POST /api/license/validate → valid → return LicenseValidateResponse {valid, expiry_date, plan_type, seat_count} ← NO TEST EXISTS HERE

**Upstream:** Application startup or customer activation
**Downstream:** If fields missing, seat enforcement (CASE-163) and expiry warnings (CASE-162) have no data to work with

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_valid_license_response_includes_all_metadata_fields -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for response schema completeness. Missing fields silently break downstream license enforcement features.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-162, CASE-163
