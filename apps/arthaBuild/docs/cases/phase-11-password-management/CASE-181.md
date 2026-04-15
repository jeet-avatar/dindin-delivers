---
id: CASE-181
title: "POST /api/user/change-password validates old password before updating to new"
phase: "11"
phase_name: "Password Management"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "POST /api/user/change-password"
test_ref: "tests/test_user.py"
files:
  - path: src/backend/routers/user.py
    lines: ""
---

## Why This Case Was Created
The password change endpoint must verify the user's current password before accepting the new one. Without this check, any authenticated session could change the password without knowing the current one — allowing an attacker with a stolen token to permanently lock out the real user. No test verifies this validation.

## What Is Wrong
No test exists for this behavior. The password change endpoint is a planned feature for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. The endpoint uses `bcrypt.checkpw(old_password, user.hashed_password)` before updating. This PENDING case records the test requirement.

## What Is Done Right
bcrypt password hashing is used throughout the auth system. The `User.hashed_password` field exists. The auth token provides user identity without needing a re-login.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_change_password_validates_old_password(client, auth_headers):
    """
    Verify POST /api/user/change-password succeeds with correct old password.
    """
    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": "CurrentPass123!", "new_password": "NewSecurePass456!"},
        headers=auth_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_old_password(client, auth_headers):
    """
    Verify POST /api/user/change-password returns 401 with wrong old password.
    """
    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": "WrongPass999!", "new_password": "NewSecurePass456!"},
        headers=auth_headers,
    )
    assert resp.status_code in (400, 401), (
        f"Expected 400/401 for wrong old password, got {resp.status_code}"
    )
```

## Architecture Mapping

**Layer:** User Management / Password Security (Backend)

**Flow:**
    POST /api/user/change-password → verify old_password (bcrypt) → update hashed_password → invalidate existing tokens ← NO TEST EXISTS HERE

**Upstream:** Authenticated user changes their password
**Downstream:** If old password not checked, stolen token = permanent account takeover

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_change_password_validates_old_password -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for password change validation. Stolen tokens could be used to permanently lock out real users.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-182, CASE-183, CASE-184
