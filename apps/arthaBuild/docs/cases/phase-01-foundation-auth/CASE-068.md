---
id: CASE-068
title: "POST /api/user/register returns 422 for invalid email format"
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
feature: "POST /api/user/register (EmailStr validation)"
test_ref: "tests/test_user.py::test_register_invalid_email_format_returns_422"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that Pydantic's `EmailStr` type enforces RFC-compliant email format validation on the registration payload, returning HTTP 422 before the route handler is invoked.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/user.py:1-50` — confirm `RegisterRequest.email` is typed as `EmailStr` (from `pydantic`) rather than plain `str`; only `EmailStr` triggers format validation automatically
- Confirm `pydantic[email]` (the `email-validator` package) is installed, as `EmailStr` requires it at runtime

## Why It Was Done This Way (Root Cause)
Pydantic's `EmailStr` type uses the `email-validator` library to perform RFC 5321/5322 format validation at parse time. When the submitted email string is malformed (e.g., `"notanemail"`, `"@noDomain"`, `"missing@"`), Pydantic raises `ValidationError` before the route handler runs. FastAPI converts this to an HTTP 422 response with a structured validation error body pointing to the `email` field.

## What Is Done Right
The test submits a payload with a syntactically invalid email string and asserts a 422 response with an error referencing the `email` field. This confirms that format validation is handled by the type system rather than requiring custom validator code in the handler.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_invalid_email_format_returns_422 -v
```
If failing, check:
1. Has `email: EmailStr` been changed to `email: str`? Plain `str` accepts any string including malformed emails.
2. Is `email-validator` installed? Run `pip show email-validator` to confirm.

## Architecture Mapping

**Layer:** FastAPI Framework (Pydantic validation layer)

**Flow:**
    [POST /api/user/register {"email": "notanemail", "password": "StrongP@ss1"}]
      → FastAPI request body parsing
        → RegisterRequest(email="notanemail", ...)
        → EmailStr validation → "notanemail" fails RFC format check
        → ValidationError → HTTP 422 {"detail": [{"loc": ["body", "email"], ...}]}
          → route handler never called
            → HTTP 422 ← THIS TEST COVERS THIS

**Upstream:** Frontend form with client-side validation disabled, or a direct API call with a malformed email
**Downstream:** No User row is created; the invalid email is never stored in the DB.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_invalid_email_format_returns_422 -v`

## Downstream Impact
**Impact if unfixed:** Malformed email addresses are stored in the DB; password reset emails cannot be sent, login is broken for those accounts, and data integrity is violated.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-067, CASE-069
