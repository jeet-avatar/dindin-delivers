---
id: CASE-055
title: "POST /api/auth/reset-password returns 400 for already-used token"
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
feature: "POST /api/auth/reset-password (one-time use guard)"
test_ref: "tests/test_auth.py::test_reset_password_already_used_token"
files:
  - path: src/backend/routers/auth.py
    lines: "175-180"
---

## Why This Case Was Created
Verifies that the reset-password endpoint rejects a token that has already been consumed by a previous successful reset, returning HTTP 400 with an appropriate error message.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:175-180` — confirm `if token_record.used: raise HTTPException(400, "Link already used")` (or similar wording) is present and executed before the password update logic

## Why It Was Done This Way (Root Cause)
After a successful reset, the token's `used` field is `True` (see CASE-054). On any subsequent attempt with the same raw token, the handler at `routers/auth.py:175-180` finds the token record, checks `if token_record.used` and raises `HTTPException(400)` before performing any password update. This guard prevents replay attacks using previously consumed tokens.

## What Is Done Right
The test first completes a successful reset (setting `used=True`), then submits the same token again and asserts the response is 400. This tests the guard in a realistic sequence, not against a synthetically constructed DB state.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_already_used_token -v
```
If failing, check:
1. Is the `used` check performed before or after the `expires_at` check? Order matters — an already-used token should be rejected even if it hasn't expired yet.
2. Has the error message changed from what the test asserts? Update the test assertion if wording changed intentionally.

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/reset-password {previously_used_token, new_password}]
      → routers/auth.py:reset_password()
        → hash_token(raw) → token_hash
        → select(PasswordResetToken) → found, used=True
        → if token_record.used: raise HTTPException(400, "Link already used")
          → HTTP 400 ← THIS TEST COVERS THIS

**Upstream:** User (or attacker) re-submits a reset link that was already successfully used
**Downstream:** No password change occurs; the user's current (post-reset) password is preserved.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_already_used_token -v`

## Downstream Impact
**Impact if unfixed:** A captured reset URL can be used to change a user's password at any time within the 1-hour expiry window after the original reset, enabling account takeover.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-054, CASE-056, CASE-057
