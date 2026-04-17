---
id: CASE-070
title: "POST /api/user/register returns 400 when password missing special character"
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
feature: "POST /api/user/register (password policy — special char)"
test_ref: "tests/test_user.py::test_register_password_no_special_char_returns_400"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that the registration endpoint enforces the special character requirement in the password policy by rejecting passwords containing only alphanumeric characters, returning HTTP 400 before any DB write.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/auth_utils.py:10-25` — confirm `validate_password()` checks for at least one special character using a pattern such as `re.search(r'[!@#$%^&*(),.?":{}|<>]', password)` (or equivalent) and raises `HTTPException(400)` if absent
- `src/backend/routers/user.py:1-50` — confirm `validate_password()` is called before any DB operation

## Why It Was Done This Way (Root Cause)
`validate_password()` in `auth_utils.py:10-25` is the single authoritative enforcement point for all password rules. The special character check uses a regex pattern matching common special characters. Any password composed entirely of letters and digits fails this check and `HTTPException(400)` is raised immediately, before the duplicate-email query or bcrypt computation are reached.

## What Is Done Right
The test submits a password that satisfies length, uppercase, lowercase, and digit requirements but contains no special character (e.g., `"StrongPass1"`) and asserts a 400 response. This isolates the special character rule from all other rules and confirms it is enforced independently. Together with CASE-066 and CASE-069 this completes the per-rule coverage of all five password policy checks.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_password_no_special_char_returns_400 -v
```
If failing, check:
1. Has the special character regex been removed or narrowed to exclude common special characters?
2. Does the test password accidentally include a character matched by the regex? Verify the exact fixture value has no special chars.

## Architecture Mapping

**Layer:** Backend Router + Auth Utilities

**Flow:**
    [POST /api/user/register {"email": "user@example.com", "password": "StrongPass1"}]
      → routers/user.py:register()
        → auth_utils.py:validate_password("StrongPass1")
          → re.search(r'[special chars pattern]', "StrongPass1") → None
          → raise HTTPException(400, "Password must contain at least one special character")
            → HTTP 400 (no DB write) ← THIS TEST COVERS THIS

**Upstream:** Frontend registration form → POST /api/user/register
**Downstream:** No User row is created; bcrypt is never called.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_password_no_special_char_returns_400 -v`

## Downstream Impact
**Impact if unfixed:** Users can register with purely alphanumeric passwords, reducing entropy and making accounts more vulnerable to dictionary and brute-force attacks that exclude special characters from their search space.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-069, CASE-066
