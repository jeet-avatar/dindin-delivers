---
id: CASE-050
title: "POST /api/auth/forgot-password returns identical 200 for unknown email (no enumeration)"
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
feature: "POST /api/auth/forgot-password (anti-enumeration)"
test_ref: "tests/test_auth.py::test_forgot_password_unknown_email_same_response"
files:
  - path: src/backend/routers/auth.py
    lines: "120-155"
---

## Why This Case Was Created
Verifies that the forgot-password endpoint returns the exact same 200 status and response body whether the submitted email is registered or not, preventing email enumeration attacks.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:120-155` — confirm the handler returns the same JSON message string for both the "user found" and "user not found" branches
- Confirm the handler does NOT raise a 404 or any error when the email is unknown

## Why It Was Done This Way (Root Cause)
The `forgot_password()` handler uses an early-return pattern: if the user is not found it still returns `{"message": "If this email is registered..."}` without performing any DB write or email send. The response is structurally identical to the success path. This prevents an attacker from probing which emails are registered by observing response differences.

## What Is Done Right
The test calls the endpoint with a completely unregistered email address and asserts both a 200 status code and that the response body matches the same message returned for a known email (verified by pairing with CASE-049). This dual assertion prevents a subtle regression where the status code is 200 but the message wording differs.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_forgot_password_unknown_email_same_response -v
```
If failing, check:
1. Has the "user not found" branch been changed to raise an HTTPException instead of returning the generic message?
2. Do both branches return the exact same `message` string?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/forgot-password {"email": "notregistered@example.com"}]
      → routers/auth.py:forgot_password()
        → select(User).where(User.email == email) → not found
        → return {"message": "If this email is registered..."} [no DB write, no email]
          → HTTP 200 (same as known email) ← THIS TEST COVERS THIS

**Upstream:** Frontend "Forgot Password" form → POST /api/auth/forgot-password
**Downstream:** No PasswordResetToken is created for unknown emails; only the HTTP response shape matters here.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_forgot_password_unknown_email_same_response -v`

## Downstream Impact
**Impact if unfixed:** Attackers can enumerate registered email addresses by comparing response bodies or status codes, enabling targeted phishing or credential stuffing.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-049, CASE-051
