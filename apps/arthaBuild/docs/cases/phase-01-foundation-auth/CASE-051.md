---
id: CASE-051
title: "POST /api/auth/forgot-password persists PasswordResetToken to DB"
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
feature: "POST /api/auth/forgot-password (DB persistence)"
test_ref: "tests/test_auth.py::test_forgot_password_creates_token_in_db"
files:
  - path: src/backend/routers/auth.py
    lines: "130-150"
  - path: src/backend/models.py
    lines: "90-105"
---

## Why This Case Was Created
Verifies that after a successful forgot-password request the system persists a `PasswordResetToken` row in the database with the correct structure — hashed token, expiry, and unused status.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:130-150` — confirm a `PasswordResetToken` row is inserted and committed
- `src/backend/models.py:90-105` — confirm the model has `user_id`, `token_hash` (64-char SHA-256 hex), `expires_at` (1 hour from now), and `used=False` fields

## Why It Was Done This Way (Root Cause)
The `forgot_password()` handler at `routers/auth.py:130-150` generates a cryptographically random raw token, hashes it with SHA-256 (producing a 64-char hex string), and inserts a `PasswordResetToken` record (`models.py:90-105`) with `user_id` FK, `token_hash`, `expires_at = utcnow() + timedelta(hours=1)`, and `used=False`. The raw token is placed in the reset URL email — never stored — so database exposure only reveals hashes.

## What Is Done Right
The test performs a DB-level assertion: after calling the endpoint it queries the `PasswordResetToken` table directly and confirms a row exists for the test user's `user_id`, that `used` is `False`, and that `expires_at` is approximately one hour in the future. This goes beyond response-code checking to validate persistence.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_forgot_password_creates_token_in_db -v
```
If failing, check:
1. Is `session.commit()` called after the `PasswordResetToken` insert in the handler?
2. Has the `PasswordResetToken` model's `expires_at` default been removed or changed?

## Architecture Mapping

**Layer:** Backend Router + Database Model

**Flow:**
    [POST /api/auth/forgot-password {"email": "user@example.com"}]
      → routers/auth.py:forgot_password()
        → generate_reset_token() → raw_token, token_hash
        → PasswordResetToken(user_id, token_hash, expires_at, used=False)
        → session.add(); session.commit()
          → DB row persisted ← THIS TEST COVERS THIS

**Upstream:** Frontend "Forgot Password" form → POST /api/auth/forgot-password
**Downstream:** POST /api/auth/reset-password reads this row; if the row is missing all reset attempts return 400 (CASE-057).

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_forgot_password_creates_token_in_db -v`

## Downstream Impact
**Impact if unfixed:** No token row is stored, so the reset-password endpoint cannot find any token and all password resets fail with "Invalid or expired reset link."

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-050, CASE-052, CASE-053
