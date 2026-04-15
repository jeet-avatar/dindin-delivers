---
id: CASE-182
title: "Password change rejects new password matching any of last 5 passwords"
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
feature: "Password history enforcement"
test_ref: ""
files:
  - path: src/backend/routers/user.py
    lines: ""
  - path: src/backend/models.py
    lines: ""
---

## Deferral Note

**DEFERRED:** Password history enforcement is out of scope for Phase 11 per CONTEXT.md locked decisions. Planned for a future security phase.

## Why This Case Was Created
Password history enforcement prevents users from reusing recent passwords. If a user's password was compromised, they should not be able to change back to it. The last 5 passwords must be stored (as hashed values) and checked against any new password. No test verifies this enforcement.

## What Is Wrong
No test exists for this behavior. The password history feature is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. A `PasswordHistory` model will store the last N hashed passwords per user. This is a common enterprise security requirement (often mandated by SOC2 and NIST 800-63B).

## What Is Done Right
bcrypt is used for password hashing — making it safe to store history hashes. The `User` model exists. The password change endpoint is planned (CASE-181).

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_password_history_prevents_reuse_of_last_5_passwords(client, auth_headers, db_session, test_user):
    """
    Verify that changing password to one of the last 5 used passwords returns 400.
    """
    original_password = "CurrentPass123!"

    # Change password 5 times
    passwords = [f"TempPass{i}456!" for i in range(1, 6)]
    for i, pw in enumerate(passwords):
        old = original_password if i == 0 else passwords[i - 1]
        resp = await client.post(
            "/api/user/change-password",
            json={"old_password": old, "new_password": pw},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    # Try to reuse the original password (should be in history)
    resp = await client.post(
        "/api/user/change-password",
        json={"old_password": passwords[-1], "new_password": original_password},
        headers=auth_headers,
    )
    assert resp.status_code == 400, (
        f"Expected 400 for password reuse, got {resp.status_code}"
    )
    data = resp.json()
    assert "history" in str(data).lower() or "reuse" in str(data).lower()
```

## Architecture Mapping

**Layer:** User Management / Password History (Backend)

**Flow:**
    POST /api/user/change-password → check PasswordHistory[last 5] → reject if match → update + add to history ← NO TEST EXISTS HERE

**Upstream:** User attempting to rotate back to a known-compromised password
**Downstream:** If missing, users can immediately reuse compromised passwords

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_password_history_prevents_reuse_of_last_5_passwords -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for password history. Password rotation policies are ineffective without reuse prevention.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-181, CASE-183
