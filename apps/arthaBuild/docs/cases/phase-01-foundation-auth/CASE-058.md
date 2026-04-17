---
id: CASE-058
title: "POST /api/auth/reset-password returns 400 for weak new password"
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
feature: "POST /api/auth/reset-password (password policy)"
test_ref: "tests/test_auth.py::test_reset_password_weak_new_password"
files:
  - path: src/backend/routers/auth.py
    lines: "162-165"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that the reset-password endpoint enforces the same password policy as registration and that validation occurs before any token lookup, avoiding unnecessary consumption of a valid token on a bad request.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:162-165` — confirm `validate_password(new_password)` is called as the first substantive step in `reset_password()`, before `hash_token()` or any DB query
- `src/backend/auth_utils.py:10-25` — confirm `validate_password()` checks minimum length, uppercase, lowercase, digit, and special character requirements

## Why It Was Done This Way (Root Cause)
The `reset_password()` handler at `routers/auth.py:162-165` calls `validate_password(new_password)` before hashing the token or touching the database. This ordering is deliberate: if the new password is weak, the endpoint returns 400 immediately without consuming the token. A valid token is preserved for the user to try again with a stronger password.

## What Is Done Right
The test submits a valid (unexpired, unused) reset token paired with a weak password and asserts 400. It also verifies the token remains unused in the DB after the rejection, confirming the "validate-first" ordering is preserved and not just that the validation message is correct.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_weak_new_password -v
```
If failing, check:
1. Has `validate_password()` been moved to after the DB lookup? If so, a valid token is consumed on every bad password attempt.
2. Does `validate_password()` raise an `HTTPException(400)` or return a boolean? The handler must propagate the exception.

## Architecture Mapping

**Layer:** Backend Router + Auth Utilities

**Flow:**
    [POST /api/auth/reset-password {valid_token, "weakpass"}]
      → routers/auth.py:reset_password()
        → validate_password("weakpass") → raises HTTPException(400)
          → DB never queried; token remains unused
            → HTTP 400 ← THIS TEST COVERS THIS

**Upstream:** User submits reset form with a password that fails policy
**Downstream:** Token is preserved; user can retry with a stronger password without requesting a new reset email.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_weak_new_password -v`

## Downstream Impact
**Impact if unfixed:** Weak passwords are accepted post-reset, undermining the password policy; or valid tokens are consumed on bad requests forcing users to repeat the entire forgot-password flow.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-057, CASE-059, CASE-066
