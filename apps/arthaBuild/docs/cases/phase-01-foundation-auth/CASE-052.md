---
id: CASE-052
title: "Second POST /api/auth/forgot-password invalidates all previous unused tokens"
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
feature: "POST /api/auth/forgot-password (token invalidation)"
test_ref: "tests/test_auth.py::test_forgot_password_invalidates_old_tokens"
files:
  - path: src/backend/routers/auth.py
    lines: "132-138"
---

## Why This Case Was Created
Verifies that requesting a second password reset invalidates all previously issued, still-unused reset tokens for the same user, preventing replay attacks via old intercepted emails.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:132-138` — confirm an `UPDATE PasswordResetToken SET used=True WHERE user_id=? AND used=False` (or equivalent ORM statement) fires before the new token is inserted

## Why It Was Done This Way (Root Cause)
Before inserting the new `PasswordResetToken`, the handler at `routers/auth.py:132-138` issues an ORM update that sets `used=True` on all existing unused tokens for the user. This ensures that only the most recently issued token is valid, even if an attacker captured an earlier reset email from a previous session.

## What Is Done Right
The test issues two consecutive forgot-password requests for the same user, then attempts to use the first token via the reset-password endpoint and asserts it returns 400 ("already used" or "invalid"). This directly tests the replay-prevention guarantee rather than just checking DB state.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_forgot_password_invalidates_old_tokens -v
```
If failing, check:
1. Has the invalidation `UPDATE` statement been removed or placed after the new insert instead of before?
2. Is `session.commit()` called after the invalidation update before the new token is inserted?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/forgot-password ×2 for same user]
      → routers/auth.py:forgot_password() [second call]
        → UPDATE PasswordResetToken SET used=True WHERE user_id=? AND used=False
        → insert new PasswordResetToken(token_hash_2, ...)
        → commit
          → old token_hash_1 is used=True → rejected on reset attempt ← THIS TEST COVERS THIS

**Upstream:** User re-clicks "Forgot Password" after first email
**Downstream:** POST /api/auth/reset-password (CASE-055) will find the old token with `used=True` and return 400.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_forgot_password_invalidates_old_tokens -v`

## Downstream Impact
**Impact if unfixed:** Old reset links captured by an attacker (e.g., via email forwarding rules) remain valid indefinitely until the 1-hour expiry, creating a window for account takeover.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-051, CASE-053, CASE-055
