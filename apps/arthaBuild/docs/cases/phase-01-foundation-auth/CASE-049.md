---
id: CASE-049
title: "POST /api/auth/forgot-password returns 200 for registered email"
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
feature: "POST /api/auth/forgot-password"
test_ref: "tests/test_auth.py::test_forgot_password_known_email_returns_200"
files:
  - path: src/backend/routers/auth.py
    lines: "120-155"
---

## Why This Case Was Created
Verifies that the forgot-password endpoint successfully accepts a known registered email address and returns HTTP 200 with a confirmation message, triggering the password reset flow.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:120-155` — confirm the handler finds the user, calls `generate_reset_token()`, inserts a `PasswordResetToken` row, and enqueues a `BackgroundTask` for email delivery
- Confirm SMTP is suppressed in the test environment (mock or override) so the test does not depend on a live mail server

## Why It Was Done This Way (Root Cause)
The `forgot_password()` handler at `routers/auth.py:120-155` performs: user lookup by email → `generate_reset_token()` to produce a cryptographically random raw token → hash storage in `PasswordResetToken` → `BackgroundTasks.add_task(send_reset_email, ...)`. The email send is backgrounded so the HTTP response is immediate regardless of SMTP latency. In test environments the SMTP call is suppressed.

## What Is Done Right
The test registers a user, calls the endpoint with that user's email, and asserts a 200 response — confirming the happy path of the full initiation flow. Pairing with CASE-050 (unknown email also returns 200) ensures both sides of the anti-enumeration guarantee are covered.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_forgot_password_known_email_returns_200 -v
```
If failing, check:
1. Is the user fixture correctly committed before the endpoint is called?
2. Has `PasswordResetToken` model definition changed (e.g., required field added without a default)?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/forgot-password {"email": "user@example.com"}]
      → routers/auth.py:forgot_password()
        → select(User).where(User.email == email) → found
        → generate_reset_token() → raw_token
        → insert PasswordResetToken(hash, expires_at, used=False)
        → BackgroundTasks.add_task(send_reset_email)
          → HTTP 200 {"message": "..."} ← THIS TEST COVERS THIS

**Upstream:** Frontend "Forgot Password" form → POST /api/auth/forgot-password
**Downstream:** PasswordResetToken row consumed by POST /api/auth/reset-password (CASE-053).

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_forgot_password_known_email_returns_200 -v`

## Downstream Impact
**Impact if unfixed:** Users cannot initiate password recovery; the entire password reset flow is broken from the first step.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-048, CASE-050, CASE-051
