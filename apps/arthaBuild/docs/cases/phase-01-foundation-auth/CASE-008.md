---
id: CASE-008
title: "No test for account lockout counter reset on successful login"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: TEST_GAP
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/tests/test_auth.py
    lines: "163-203"
  - path: src/backend/routers/auth.py
    lines: "70-73"
---

## Why This Case Was Created
Triggered by the TEST_GAP audit dimension. The lockout mechanism is tested for triggering (5 failures → 429), but the reset behavior — clearing `failed_attempts` and `locked_until` after a successful login — is not tested. This reset is a critical security property: without it, a user could be permanently locked out after someone else fat-fingers their password 5 times, even after the 15-minute window expires and they successfully log in.

## What Is Wrong
`src/backend/tests/test_auth.py` lines 163–203 (`test_login_lockout_after_5_failures`) tests that the 5th wrong attempt triggers a 429. There is no test that verifies:

1. After a successful login, `user.failed_attempts` is reset to `0`
2. After a successful login, `user.locked_until` is reset to `None`
3. A user who had 3 failed attempts can still log in on the 4th attempt, and after success their counter resets to 0

The reset logic exists in `src/backend/routers/auth.py` lines 70–73:
```python
# Successful login — reset lockout counters
user.failed_attempts = 0
user.locked_until = None
await db.commit()
```

This code is correct but untested. If a future refactor removes or moves this block, the test suite will not catch the regression.

## Why It Was Done This Way (Root Cause)
The lockout test was written to cover the primary failure case (triggering lockout), which was the functional requirement. The reset behavior is a secondary property that was implemented correctly in the same commit but its test was deferred and not written.

## What Is Done Right
The lockout implementation itself is correct: `failed_attempts` increments on each failure, lockout triggers at exactly 5, and the reset to 0 + `None` on success is implemented. The existing lockout trigger test is comprehensive and uses a dedicated user to avoid state contamination.

## How To Fix It
Add the following tests to `src/backend/tests/test_auth.py`:

```python
@pytest.mark.asyncio
async def test_login_success_resets_failed_attempts(client, db_session):
    """
    TC-AUTH-12b: Successful login after failed attempts resets the counter to 0.

    Architecture: login() sets user.failed_attempts=0, user.locked_until=None on success.
    Verifies the reset is committed to DB — not just an in-memory change.
    """
    reset_email = "lockout-reset@arthaBuild-test.com"
    reset_pw = "LockReset1!"
    # Register
    await client.post("/api/user/register", json={
        "first_name": "Lock", "last_name": "Reset",
        "email": reset_email, "password": reset_pw, "organization": "Org",
    })
    # 3 wrong attempts
    for _ in range(3):
        await client.post("/api/auth/login", json={
            "username": reset_email, "password": "WrongPass99!",
        })
    # Successful login
    resp = await client.post("/api/auth/login", json={
        "username": reset_email, "password": reset_pw,
    })
    assert resp.status_code == 200

    # Check DB: failed_attempts must be 0
    import sqlalchemy
    db_session.expire_all()
    result = await db_session.execute(
        sqlalchemy.select(User).where(User.email == reset_email.lower())
    )
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.failed_attempts == 0, f"Expected 0, got {user.failed_attempts}"
    assert user.locked_until is None, f"Expected None, got {user.locked_until}"
```

Run the new test:
```bash
pytest tests/test_auth.py::test_login_success_resets_failed_attempts -v
```

## Architecture Mapping

**Layer:** Backend Router → DB Model (User.failed_attempts, User.locked_until)

**Flow:**

    POST /api/auth/login
      → verify_password() → success
        → user.failed_attempts = 0    ← THIS CASE LIVES HERE (reset tested by this gap)
        → user.locked_until = None
        → await db.commit()
        → return TokenResponse(...)

**Upstream:** Frontend login form triggers POST /api/auth/login

**Downstream:** Subsequent login attempts check `user.failed_attempts` and `is_locked(user)` — if counter is not reset, the lockout threshold may trigger prematurely

## Verification
- [ ] Grep proof: `grep -n "failed_attempts.*0\|locked_until.*None" src/backend/routers/auth.py` → shows lines 71-72 (reset logic exists)
- [ ] Grep proof: `grep -n "failed_attempts.*0\|reset.*counter\|resets" src/backend/tests/test_auth.py` → empty (confirms gap)
- [ ] Test proof: `pytest tests/test_auth.py::test_login_success_resets_failed_attempts -v` → PASSED after fix

## Downstream Impact
**Impact if unfixed:** Test Gap — low direct risk, regression risk if refactored

Without this test, removing the reset lines (`user.failed_attempts = 0`, `user.locked_until = None`) from the login route would not be caught by the test suite. A user who experiences 4 failed logins before a successful one would have their counter carry over to future sessions, reaching lockout after only 1 additional failure instead of 5.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-007 (adjacent test gap in registration), CASE-009 (conftest architecture gap)
