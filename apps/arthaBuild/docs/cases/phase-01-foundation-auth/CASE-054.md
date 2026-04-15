---
id: CASE-054
title: "POST /api/auth/reset-password marks token used=True in DB after success"
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
feature: "POST /api/auth/reset-password (one-time use)"
test_ref: "tests/test_auth.py::test_reset_password_marks_token_used"
files:
  - path: src/backend/routers/auth.py
    lines: "195-200"
---

## Why This Case Was Created
Verifies that after a successful password reset the `PasswordResetToken.used` field is set to `True` in the database, ensuring the token cannot be replayed.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:195-200` — confirm `token_record.used = True` is set and `session.commit()` is called after the password hash update

## Why It Was Done This Way (Root Cause)
After updating the user's password hash, the handler at `routers/auth.py:195-200` sets `token_record.used = True` in the same transaction before calling `session.commit()`. This atomically commits both the new password hash and the token invalidation, so there is no window where the password is updated but the token remains reusable.

## What Is Done Right
The test directly queries the `PasswordResetToken` table after a successful reset and asserts `token.used == True`. It is a DB-level assertion rather than a behavioral one, providing a stronger guarantee than simply calling the endpoint a second time.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_marks_token_used -v
```
If failing, check:
1. Has `token_record.used = True` been accidentally removed or placed outside the transaction?
2. Is `session.refresh(token_record)` needed before the assertion if the session cache returns stale data?

## Architecture Mapping

**Layer:** Backend Router + Database

**Flow:**
    [POST /api/auth/reset-password {valid_token, new_password}]
      → routers/auth.py:reset_password()
        → password update committed
        → token_record.used = True
        → session.commit()
          → PasswordResetToken.used == True in DB ← THIS TEST COVERS THIS

**Upstream:** Successful reset flow (CASE-053)
**Downstream:** CASE-055 (already-used token guard) depends on `used=True` being set here.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_marks_token_used -v`

## Downstream Impact
**Impact if unfixed:** A valid reset link can be used multiple times; anyone who observes the reset URL (e.g., from browser history or email logs) can change the password again.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-053, CASE-055
