---
id: CASE-065
title: "POST /api/user/register returns 409 for duplicate email"
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
feature: "POST /api/user/register (duplicate guard)"
test_ref: "tests/test_user.py::test_register_duplicate_email_returns_409"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that attempting to register with an email address already in use returns HTTP 409, preventing duplicate accounts and maintaining email uniqueness as a login identifier.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/user.py:1-50` — confirm there is an explicit pre-insert check (`select(User).where(User.email == email)`) that raises `HTTPException(409)` before attempting the insert
- Confirm the `users.email` column has `unique=True` in the model definition as a secondary enforcement layer

## Why It Was Done This Way (Root Cause)
The handler performs an explicit existence check before the insert: if a `User` with the submitted email already exists the handler raises `HTTPException(409, "Email already registered")` without touching bcrypt or performing any DB write. The `unique=True` constraint on `users.email` provides a secondary enforcement at the DB level if the application check is bypassed (e.g., concurrent requests).

## What Is Done Right
The test registers a user successfully, then immediately submits the same email again and asserts 409 with `detail` containing "already registered". This tests both the guard logic and the error response format, ensuring the frontend can display a meaningful message.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_duplicate_email_returns_409 -v
```
If failing, check:
1. Has the pre-insert check been removed, relying only on the DB unique constraint? If so, the response becomes 500 (IntegrityError) instead of 409.
2. Is the email comparison case-sensitive? If the check uses exact match but the DB normalizes to lowercase, a case variation bypasses the guard.

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/user/register {"email": "existing@example.com", "password": "StrongP@ss1"}]
      → routers/user.py:register()
        → validate_password() → OK
        → select(User).where(User.email == email) → found
        → raise HTTPException(409, "Email already registered")
          → HTTP 409 ← THIS TEST COVERS THIS

**Upstream:** User re-submits registration form with an existing email (or a client bug sends the request twice)
**Downstream:** No duplicate User row is created; the existing user's account is unaffected.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_duplicate_email_returns_409 -v`

## Downstream Impact
**Impact if unfixed:** Multiple accounts can be created for the same email; login becomes ambiguous and the original user may lose account access.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-064, CASE-066
