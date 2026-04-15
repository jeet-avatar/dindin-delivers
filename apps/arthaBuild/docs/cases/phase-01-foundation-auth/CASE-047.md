---
id: CASE-047
title: "POST /api/auth/login triggers 429 after 5 consecutive wrong passwords"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/auth/login (lockout)"
test_ref: "tests/test_auth.py::test_login_lockout_after_5_failures"
files:
  - path: src/backend/routers/auth.py
    lines: "70-110"
  - path: src/backend/auth_utils.py
    lines: "28-40"
---

## Why This Case Was Created
Verifies that the login endpoint enforces brute-force protection by locking an account after 5 consecutive failed password attempts and returning HTTP 429.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:70-110` — confirm `user.failed_attempts` is incremented on each bad password and `user.locked_until` is set after the 5th failure
- `src/backend/auth_utils.py:28-40` — confirm `is_locked()` is called at the top of the login handler before password verification

## Why It Was Done This Way (Root Cause)
The login handler in `routers/auth.py:70-110` follows two steps: (1) it calls `is_locked()` (`auth_utils.py:28-40`) at the very start to short-circuit locked accounts, and (2) on each failed `verify_password()` call it increments `user.failed_attempts`; once the counter reaches 5 it sets `user.locked_until = utcnow() + timedelta(minutes=15)` and immediately raises `HTTPException(429)`.

## What Is Done Right
The test exercises the exact boundary: it sends exactly 5 wrong passwords and asserts the 5th response is 429. It also validates that the lockout mechanism does not fire prematurely on the 4th attempt.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_login_lockout_after_5_failures -v
```
If failing, check:
1. `routers/auth.py` — is `failed_attempts` incremented and committed after each bad password?
2. `auth_utils.py` — does `is_locked()` compare `locked_until > utcnow()` with timezone-aware datetimes?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/login {wrong password ×5}]
      → routers/auth.py:login()
        → auth_utils.py:is_locked() → False (first 4 attempts)
        → verify_password() → False
        → user.failed_attempts += 1; commit
        → [5th failure] user.locked_until = now+15min; raise HTTP 429
          → HTTP 429 Locked ← THIS TEST COVERS THIS

**Upstream:** Frontend login form → POST /api/auth/login
**Downstream:** Authenticated session tokens (JWT) cannot be issued while account is locked; all protected routes remain inaccessible.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_login_lockout_after_5_failures -v`

## Downstream Impact
**Impact if unfixed:** Brute-force dictionary attacks against registered accounts become feasible; any user's account can be compromised without rate limiting.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-046, CASE-048
