---
id: CASE-053
title: "POST /api/auth/reset-password updates password for valid token"
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
feature: "POST /api/auth/reset-password"
test_ref: "tests/test_auth.py::test_reset_password_valid_token"
files:
  - path: src/backend/routers/auth.py
    lines: "160-205"
---

## Why This Case Was Created
Verifies the complete happy path of password reset: a valid, unexpired, unused token results in the user's password being updated and the token being consumed.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:160-205` — confirm the handler hashes the raw token, queries `PasswordResetToken`, checks expiry, checks `used`, updates `user.password_hash`, and sets `token.used=True` before commit

## Why It Was Done This Way (Root Cause)
The `reset_password()` handler at `routers/auth.py:160-205` executes the following sequence: `hash_token(raw_token)` → DB lookup of `PasswordResetToken` by hash → `expires_at` check → `used` check → `validate_password(new_password)` → `hash_password(new_password)` → `user.password_hash = new_hash` → `token.used = True` → `session.commit()`. Each guard is ordered to fail fast before any DB mutation.

## What Is Done Right
The test performs an end-to-end assertion: after a successful reset it attempts to log in with the new password and asserts HTTP 200. This proves not just that the endpoint returns 200 but that the password hash was actually persisted correctly (complementing CASE-059).

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_valid_token -v
```
If failing, check:
1. Is the DB session from the forgot-password step shared correctly with the reset-password handler so it can find the token?
2. Is `session.commit()` called after both the password update and token invalidation?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/reset-password {token, new_password}]
      → routers/auth.py:reset_password()
        → hash_token(raw) → token_hash
        → select(PasswordResetToken).where(hash == token_hash) → found
        → expiry check → valid
        → used check → False
        → validate_password(new_password) → OK
        → user.password_hash = hash_password(new_password)
        → token.used = True; commit
          → HTTP 200 ← THIS TEST COVERS THIS

**Upstream:** User clicks reset link in email → submits new password form
**Downstream:** Login endpoint (CASE-059) can now authenticate with the new password.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_valid_token -v`

## Downstream Impact
**Impact if unfixed:** Users cannot complete password recovery; they remain locked out of their accounts after initiating a reset.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-052, CASE-054, CASE-055, CASE-059
