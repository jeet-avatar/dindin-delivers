---
id: CASE-163
title: "Registering more users than seat_count fails with 402"
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
feature: "License seat enforcement"
test_ref: ""
files:
  - path: src/backend/routers/license.py
    lines: ""
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
License plans have a `seat_count` limit (e.g., 5 seats for Starter, 25 for Professional). If N users are already registered and the plan has N seats, registering the N+1th user must fail with 402. Without this enforcement, customers can add unlimited users on a single-seat license — revenue loss for seat-based pricing.

## What Is Wrong
No test exists for this behavior. Without seat limit enforcement, all license tiers effectively become unlimited.

## Why It Was Done This Way (Root Cause)
Phase 07 plans seat enforcement as a check during user registration. The registration endpoint checks the current user count against the license's `seat_count`. The feature is designed but not yet implemented.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 07. The design specifies checking `db.query(User).count()` against the license `seat_count` in the registration flow.

## How To Fix It
Write the following test in `tests/test_license.py`:

```python
@pytest.mark.asyncio
async def test_registration_fails_when_seat_limit_reached(client, db_session):
    """
    Verify that registering a new user when the seat count is already
    at the license limit returns 402 Payment Required.
    """
    from src.backend.models import User

    # Set up: license allows 2 seats, 2 users already exist
    with patch("src.backend.routers.auth.get_license_seat_count") as mock_seats, \
         patch("src.backend.routers.auth.get_current_user_count") as mock_count:

        mock_seats.return_value = 2   # 2-seat license
        mock_count.return_value = 2   # 2 users already registered

        resp = await client.post(
            "/api/auth/register",
            json={
                "email": "new_user@example.com",
                "password": "NewPass123!",
                "first_name": "New",
                "last_name": "User",
            }
        )
        assert resp.status_code == 402, (
            f"Expected 402 when seat limit reached, got {resp.status_code}"
        )
        data = resp.json()
        assert "seat" in str(data).lower() or "license" in str(data).lower()
```

## Architecture Mapping

**Layer:** License System → User Registration (Backend)

**Flow:**
    POST /api/auth/register → check_seat_limit() → count(users) >= seat_count → raise 402 ← NO TEST EXISTS HERE

**Upstream:** Admin attempts to add a new team member
**Downstream:** If missing, unlimited users on any plan — seat-based pricing entirely bypassed

## Verification
- [ ] Write test: `pytest tests/test_license.py::test_registration_fails_when_seat_limit_reached -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for seat limit enforcement. Seat-based pricing is meaningless without enforcement.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-161, CASE-162
