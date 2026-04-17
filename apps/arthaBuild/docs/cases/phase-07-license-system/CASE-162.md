---
id: CASE-162
title: "Expired license prevents access to chat and NetSuite features"
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
feature: "License expiry enforcement"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
  - path: src/backend/routers/chat.py
    lines: ""
  - path: src/backend/routers/netsuite.py
    lines: ""
---

## Why This Case Was Created
When a license expires, the customer should not be able to access the core product features: `/api/chat` and `/api/netsuite/*`. The system should return 402 (Payment Required) or 403 (Forbidden) for these endpoints when the license is expired. This is a revenue-critical feature. No test verifies that feature access is blocked on license expiry.

## What Is Wrong
No test exists for this behavior. Without expiry enforcement, customers can continue using the product after their subscription lapses — revenue loss.

## Why It Was Done This Way (Root Cause)
Phase 07 plans the license system with expiry enforcement middleware. The feature is designed but not yet implemented. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The design specifies a license middleware that checks license validity on every request to protected endpoints.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_expired_license_blocks_chat_endpoint(client, auth_headers):
    """
    Verify POST /api/chat returns 402 or 403 when the license is expired.
    """
    with patch("src.backend.middleware.license.get_cached_license") as mock_license:
        mock_license.return_value = {
            "valid": False,
            "reason": "expired",
            "expiry_date": "2025-01-01",
        }

        resp = await client.post(
            "/api/chat",
            json={"message": "Hello", "session_id": "s1"},
            headers=auth_headers,
        )
        assert resp.status_code in (402, 403), (
            f"Expected 402/403 for expired license on /api/chat, got {resp.status_code}"
        )


@pytest.mark.asyncio
async def test_expired_license_blocks_netsuite_endpoint(client, auth_headers):
    """
    Verify GET /api/netsuite/status returns 402 or 403 when the license is expired.
    """
    with patch("src.backend.middleware.license.get_cached_license") as mock_license:
        mock_license.return_value = {"valid": False, "reason": "expired"}

        resp = await client.get("/api/netsuite/status", headers=auth_headers)
        assert resp.status_code in (402, 403)
```

## Architecture Mapping

**Layer:** License Enforcement Middleware (Backend)

**Flow:**
    POST /api/chat → license_middleware → check expiry → 402/403 if expired ← NO TEST EXISTS HERE

**Upstream:** Customer whose subscription has lapsed
**Downstream:** If missing, expired customers continue using the product — revenue loss

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_expired_license_blocks_chat_endpoint -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for expiry enforcement. Customers can use the product indefinitely after subscription lapses.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-157, CASE-158, CASE-163
