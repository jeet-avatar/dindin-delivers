---
id: CASE-064
title: "POST /api/user/register returns 201 and confirmation message for valid user"
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
feature: "POST /api/user/register"
test_ref: "tests/test_user.py::test_register_valid_user"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies the happy path of user registration: a payload with a valid email and strong password results in HTTP 201, a `User` row in the database, and a confirmation message containing email-related text.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/user.py:1-50` — confirm `register()` calls `validate_password()`, `hash_password()` (bcrypt 12 rounds), constructs a `User` ORM object, commits it, and returns 201
- `src/backend/auth_utils.py:10-25` — confirm `validate_password()` does not raise on a strong password

## Why It Was Done This Way (Root Cause)
The `register()` handler in `routers/user.py:1-50` processes registration in order: `validate_password(password)` → duplicate-email check → `hash_password(password)` → `User(email=email, password_hash=hash)` → `session.add(); session.commit()` → return `JSONResponse(status_code=201, content={"message": "..."})`. The message wording contains either "email" or "check" to indicate the user should verify their email.

## What Is Done Right
The test submits a complete valid registration payload, asserts status 201, and checks that the response message contains the expected confirmation wording. It also queries the DB to confirm a `User` row was created with the correct email, going beyond HTTP response validation.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_valid_user -v
```
If failing, check:
1. Is the test DB properly isolated (fresh SQLite per test run) so duplicate-email checks don't fail due to leftover state?
2. Has the response status code been changed from 201 to 200 in the handler?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/user/register {"email": "new@example.com", "password": "StrongP@ss1"}]
      → routers/user.py:register()
        → validate_password("StrongP@ss1") → OK
        → duplicate email check → not found
        → hash_password() → bcrypt_hash
        → User(email, password_hash) → session.add(); commit
          → HTTP 201 {"message": "..."} ← THIS TEST COVERS THIS

**Upstream:** Frontend registration form → POST /api/user/register
**Downstream:** Login endpoint (CASE-046) can now authenticate this user; forgot-password flow (CASE-049) can issue resets for this email.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_valid_user -v`

## Downstream Impact
**Impact if unfixed:** No users can be registered; the entire application is inaccessible since all other flows depend on a registered user account.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-063, CASE-065, CASE-066
