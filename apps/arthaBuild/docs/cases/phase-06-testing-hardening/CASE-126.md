---
id: CASE-126
title: "POST /api/auth/forgot-password returns identical 200 for known vs unknown email"
phase: "06"
phase_name: "Testing & Hardening"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kiran"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/auth/forgot-password (anti-enumeration)"
test_ref: "tests/test_security.py::test_forgot_password_no_enumeration"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that the forgot-password endpoint returns HTTP 200 with an identical response body
whether the submitted email belongs to a registered user or not. Returning a different
status code or message for unknown emails would allow attackers to enumerate valid accounts
through the password-reset flow.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — the forgot-password handler may return 404 or a different `message`
  for emails that are not registered
- A logging statement may be the only difference — but the HTTP response itself must be
  identical
- If email sending fails for a non-existent email and the exception propagates as a 500,
  the status code difference would constitute enumeration

## Why It Was Done This Way (Root Cause)
The `forgot_password()` handler always returns `{"message": "If that email is registered, a reset link has been sent."}` with HTTP 200, regardless of whether the email exists in the DB. If the user exists, a password reset token is generated and an email is dispatched (or queued); if not, the handler exits silently after the DB lookup returns None. The test calls the endpoint twice — once with a registered email and once with a random unknown email — and asserts both responses have status 200 and identical body text.

## What Is Done Right
- Calls endpoint with known email (registered user) and unknown email
- Asserts HTTP 200 for both
- Asserts the response body message is identical for both paths
- Covers the most commonly overlooked enumeration vector in auth systems

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_forgot_password_no_enumeration -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Logic

**Flow:**
    POST /api/auth/forgot-password {email: "registered@x.com"}
      → routers/auth.py:forgot_password()
        → user = query by email → found
          → generate reset token → (send email or queue)
            → return 200 {"message": "If that email..."}  ← Path A

    POST /api/auth/forgot-password {email: "unknown@x.com"}
      → routers/auth.py:forgot_password()
        → user = query by email → None
          → (no token, no email)
            → return 200 {"message": "If that email..."}  ← Path B
              (THIS TEST COVERS BOTH — asserts same 200 + same body)

**Upstream:** User (or attacker) submitting emails to the password reset form
**Downstream:** Both paths return identical 200 — no email existence leakage

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_forgot_password_no_enumeration -v`

## Downstream Impact
**Impact if unfixed:** Attackers use the password reset form as an oracle to enumerate all
registered email addresses, achieving the same result as CASE-125 via a different endpoint.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-124 (check-user no user_id), CASE-125 (login no enumeration)
