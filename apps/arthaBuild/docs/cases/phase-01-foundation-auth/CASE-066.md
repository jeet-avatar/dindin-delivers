---
id: CASE-066
title: "POST /api/user/register returns 400 for weak password (no uppercase)"
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
feature: "POST /api/user/register (password policy)"
test_ref: "tests/test_user.py::test_register_weak_password_returns_400"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that the registration endpoint enforces password policy by rejecting passwords that lack an uppercase character, returning HTTP 400 before any DB write occurs.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/auth_utils.py:10-25` — confirm `validate_password()` checks for at least one uppercase character (e.g., `re.search(r'[A-Z]', password)`) and raises `HTTPException(400)` if missing
- `src/backend/routers/user.py:1-50` — confirm `validate_password()` is the first call in `register()`, executed before the duplicate-email check and before any bcrypt operation

## Why It Was Done This Way (Root Cause)
`validate_password()` in `auth_utils.py:10-25` checks all five password requirements: minimum 8 characters, at least one uppercase letter, at least one lowercase letter, at least one digit, and at least one special character. It is called as the first step in `register()` to fail fast — rejecting weak passwords without spending bcrypt CPU cycles or querying the DB.

## What Is Done Right
The test submits a password that meets all criteria except uppercase (e.g., `"weakpass1!"`) and asserts 400. This specifically targets the uppercase rule in isolation, making the failure mode unambiguous. Pairing with CASE-069 and CASE-070 ensures each individual password rule is tested independently.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_weak_password_returns_400 -v
```
If failing, check:
1. Has the uppercase check been removed or weakened in `validate_password()`?
2. Is `validate_password()` raising `ValueError` instead of `HTTPException(400)`? The handler must convert `ValueError` to an HTTP response if so.

## Architecture Mapping

**Layer:** Backend Router + Auth Utilities

**Flow:**
    [POST /api/user/register {"email": "user@example.com", "password": "weakpass1!"}]
      → routers/user.py:register()
        → auth_utils.py:validate_password("weakpass1!")
          → no uppercase letter found → raise HTTPException(400)
            → HTTP 400 (no DB write) ← THIS TEST COVERS THIS

**Upstream:** Frontend registration form → POST /api/user/register
**Downstream:** No User row is created; no bcrypt computation is performed.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_weak_password_returns_400 -v`

## Downstream Impact
**Impact if unfixed:** Users can register with passwords missing uppercase letters, reducing account security and increasing susceptibility to dictionary attacks.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-065, CASE-067, CASE-069, CASE-070
