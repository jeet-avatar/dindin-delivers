---
id: CASE-183
title: "Users with password older than 90 days receive 403 with 'password expired' error"
phase: "11"
phase_name: "Password Management"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
created: 2026-04-10
updated: 2026-04-10
deferred_reason: "Out of scope for Phase 11 per CONTEXT.md locked decisions. Planned for a future security phase."
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Password expiry"
test_ref: ""
files:
  - path: src/backend/routers/user.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Deferral Note

**DEFERRED:** 90-day password expiry is out of scope for Phase 11 per CONTEXT.md locked decisions. Planned for a future security phase.

## Why This Case Was Created
For enterprise security compliance, passwords must expire after 90 days. When a user with an expired password attempts to access protected endpoints, they should receive a 403 with a specific `password_expired` error code so the frontend can redirect them to the change-password flow. No test verifies this enforcement.

## What Is Wrong
No test exists for this behavior. The password expiry feature is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. A `password_last_changed_at` field on the `User` model will track password age. The auth middleware checks this field on every request.

## What Is Done Right
The JWT auth middleware exists and is the right place to add password expiry checks. The `User` model can be extended with a timestamp field. The bcrypt password update already updates the user record.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_expired_password_blocks_api_access(client, db_session, test_user, auth_headers):
    """
    Verify that a user whose password is older than 90 days receives 403
    with error code 'password_expired' on protected endpoints.
    """
    from datetime import datetime, timedelta

    # Set password_last_changed_at to 91 days ago
    test_user.password_last_changed_at = datetime.utcnow() - timedelta(days=91)
    db_session.commit()

    resp = await client.get("/api/chats", headers=auth_headers)
    assert resp.status_code == 403, (
        f"Expected 403 for expired password, got {resp.status_code}"
    )
    data = resp.json()
    assert "password_expired" in str(data).lower() or \
           data.get("error_code") == "password_expired", (
        f"Expected password_expired error, got: {data}"
    )


@pytest.mark.asyncio
async def test_change_password_allowed_even_with_expired_password(client, db_session, test_user, auth_headers):
    """
    Verify the change-password endpoint is accessible even with expired password
    (so users can fix the problem without logging out).
    """
    from datetime import datetime, timedelta
    test_user.password_last_changed_at = datetime.utcnow() - timedelta(days=91)
    db_session.commit()

    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": "CurrentPass123!", "new_password": "NewPass456!"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
```

## Architecture Mapping

**Layer:** Auth Middleware / Password Expiry (Backend)

**Flow:**
    request → JWT verify → check password_last_changed_at → if > 90 days → 403 password_expired (except /api/user/change-password) ← NO TEST EXISTS HERE

**Upstream:** User who has not changed password in 90+ days
**Downstream:** If missing, passwords never expire — long-lived credential exposure

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_expired_password_blocks_api_access -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for password expiry. Stale credentials remain valid indefinitely.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-181, CASE-182
