---
id: CASE-059
title: "After reset, user can log in with new password (E2E reset flow)"
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
feature: "POST /api/auth/reset-password (E2E)"
test_ref: "tests/test_auth.py::test_reset_password_can_login_with_new_password"
files:
  - path: src/backend/routers/auth.py
    lines: "195-205"
---

## Why This Case Was Created
Verifies the complete end-to-end password reset flow: after a successful reset, the user can authenticate using the new password and the old password no longer works.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:195-205` — confirm `user.password_hash = hash_password(new_password)` is set and `session.commit()` is called so the new hash is persisted
- Confirm the login handler reads the updated hash from the DB (no stale session cache)

## Why It Was Done This Way (Root Cause)
The `reset_password()` handler at `routers/auth.py:195-205` calls `hash_password(new_password)` (bcrypt 12 rounds) and assigns the result to `user.password_hash` before committing. The subsequent login call goes through the standard `login()` handler which queries the DB fresh, calls `verify_password(submitted, user.password_hash)`, and issues a JWT on success. The chain is: reset commits new hash → login reads new hash → bcrypt verify passes → JWT issued.

## What Is Done Right
This is the most comprehensive test in the reset flow: it chains forgot-password → reset-password → login with new password → assert 200, and additionally asserts that login with the old password returns 401. This dual assertion proves the hash was genuinely replaced, not just that a 200 was returned by the reset endpoint.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_can_login_with_new_password -v
```
If failing, check:
1. Is the DB session properly flushed between the reset and login calls within the same test?
2. Has `hash_password()` been changed to a different algorithm that `verify_password()` does not recognize?

## Architecture Mapping

**Layer:** Backend Router (E2E)

**Flow:**
    [POST /api/auth/reset-password {token, new_password}] → 200
      → user.password_hash updated in DB
    [POST /api/auth/login {email, new_password}]
      → routers/auth.py:login()
        → verify_password(new_password, user.password_hash) → True
        → create_access_token() → JWT
          → HTTP 200 + JWT ← THIS TEST COVERS THIS

**Upstream:** Entire forgot-password → reset-password flow (CASE-049 through CASE-053)
**Downstream:** All authenticated endpoints the user accesses after recovery depend on this working.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_can_login_with_new_password -v`

## Downstream Impact
**Impact if unfixed:** Users cannot access their accounts after a password reset despite completing the reset flow successfully — a complete loss of account recovery functionality.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-053, CASE-058, CASE-060
