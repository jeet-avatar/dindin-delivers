---
id: CASE-069
title: "POST /api/user/register returns 400 when password missing digit"
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
feature: "POST /api/user/register (password policy — digit)"
test_ref: "tests/test_user.py::test_register_password_no_number_returns_400"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that the registration endpoint enforces the digit requirement in the password policy by rejecting passwords containing no numeric character, returning HTTP 400 before any DB write.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/auth_utils.py:10-25` — confirm `validate_password()` checks for at least one digit using `re.search(r'\d', password)` and raises `HTTPException(400)` if the pattern does not match
- `src/backend/routers/user.py:1-50` — confirm `validate_password()` is called before any DB operation

## Why It Was Done This Way (Root Cause)
`validate_password()` in `auth_utils.py:10-25` applies all five password rules sequentially: length ≥ 8, uppercase present, lowercase present, digit present (`\d` pattern), special character present. Each failing rule raises `HTTPException(400)` with a descriptive message. The digit check fires when the submitted password contains only letters and special characters but no numeric digit.

## What Is Done Right
The test submits a password that meets all requirements except the digit rule (e.g., `"StrongPass!"`) and asserts a 400 response. Testing each rule independently (CASE-066 for uppercase, CASE-069 for digit, CASE-070 for special char) ensures each `re.search` check is separately exercised rather than relying on one "catch-all" weak password that might satisfy some rules accidentally.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_password_no_number_returns_400 -v
```
If failing, check:
1. Has the digit check (`r'\d'`) been removed from `validate_password()`?
2. Does the test password accidentally contain a digit? Verify the exact test fixture value.

## Architecture Mapping

**Layer:** Backend Router + Auth Utilities

**Flow:**
    [POST /api/user/register {"email": "user@example.com", "password": "StrongPass!"}]
      → routers/user.py:register()
        → auth_utils.py:validate_password("StrongPass!")
          → re.search(r'\d', "StrongPass!") → None
          → raise HTTPException(400, "Password must contain at least one digit")
            → HTTP 400 (no DB write) ← THIS TEST COVERS THIS

**Upstream:** Frontend registration form → POST /api/user/register
**Downstream:** No User row is created; bcrypt is never called.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_password_no_number_returns_400 -v`

## Downstream Impact
**Impact if unfixed:** Users can register with passwordless-digit passwords, reducing entropy and increasing susceptibility to brute-force attacks that target letter-only password spaces.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-068, CASE-070
