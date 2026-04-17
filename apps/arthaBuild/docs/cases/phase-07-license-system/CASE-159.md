---
id: CASE-159
title: "POST /api/license/validate returns 422 for malformed license key"
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
feature: "POST /api/license/validate (format check)"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
---

## Why This Case Was Created
The license key has a defined format (e.g., `ARTHABUILD-PLAN-XXXXXXXX-NNNNN`). The Pydantic schema should validate the format before making any remote license server call, returning 422 for malformed keys. This prevents unnecessary network calls and gives clear validation errors. No test verifies format validation.

## What Is Wrong
No test exists for this behavior. Without format validation, malformed keys hit the license server causing confusing errors or timeouts.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system including a Pydantic schema with key format validation via regex. The feature is designed but not yet implemented. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. Pydantic v2 supports `@field_validator` for regex-based string validation, which is the intended implementation approach.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_validate_license_returns_422_for_malformed_key(client):
    """
    Verify POST /api/license/validate returns 422 for a license key
    that does not match the expected format, without calling the license server.
    """
    malformed_keys = [
        "",                        # Empty
        "not-a-valid-key",         # Wrong format
        "ARTHABUILD",              # Incomplete
        "A" * 200,                 # Too long
        "arthabuild-pro-key-1",    # Wrong case
    ]

    for key in malformed_keys:
        resp = await client.post(
            "/api/license/validate",
            json={"license_key": key},
        )
        assert resp.status_code == 422, (
            f"Expected 422 for malformed key '{key}', got {resp.status_code}"
        )
```

## Architecture Mapping

**Layer:** License System / Input Validation (Backend)

**Flow:**
    POST /api/license/validate → Pydantic LicenseKeyRequest → @field_validator(regex) → 422 if invalid format ← NO TEST EXISTS HERE

**Upstream:** Customer enters license key in UI
**Downstream:** If missing, malformed keys cause unnecessary license server calls and confusing errors

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_validate_license_returns_422_for_malformed_key -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for format validation. Malformed keys cause unnecessary external calls and poor error messages.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-158
