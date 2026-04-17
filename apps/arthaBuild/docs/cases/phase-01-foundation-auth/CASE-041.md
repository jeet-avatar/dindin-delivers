---
id: CASE-041
title: "POST /api/auth/check-user returns {success:true} for known email"
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
feature: "POST /api/auth/check-user"
test_ref: "tests/test_auth.py::test_check_user_known_email"
files:
  - path: src/backend/routers/auth.py
    lines: "24-35"
  - path: src/backend/schemas.py
    lines: "18-26"
---

## Why This Case Was Created
Documents the verified behavior of the check-user endpoint when queried with a registered email. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether the `registered_user` fixture successfully inserted a user into the test DB
- Whether `User.email` is being compared with `.lower()` normalization (routers/auth.py:31)
- Whether `CheckUserResponse` is excluding `user_id` from its field list (schemas.py:22-26)
- Whether the rate limiter (10/minute) is interfering in the test environment

## Why It Was Done This Way (Root Cause)
`check_user()` at `routers/auth.py:24-35` performs a `SELECT` on the `users` table filtered by `data.email.lower()`. When the user is found it returns `CheckUserResponse(success=True)`. The `CheckUserResponse` model at `schemas.py:22-26` deliberately omits `user_id` to prevent email enumeration via primary key disclosure. The `@limiter.limit("10/minute")` decorator at `routers/auth.py:25` uses SlowAPI with `get_remote_address`.

## What Is Done Right
This test covers the happy path for email presence detection: fixture-created user, correct HTTP method, correct JSON body shape, 200 status code assertion, `success: true` assertion, and explicit check that `user_id` is absent from the response body (enumeration prevention).

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_check_user_known_email -v
```
If the test fails, check:
1. `registered_user` fixture — does it `POST /api/user/register` and commit before the test runs? (`tests/conftest.py`)
2. Email normalization — `data.email.lower()` at `routers/auth.py:31` must match the fixture's stored email
3. `CheckUserResponse` fields at `schemas.py:22-26` — `user_id` must not be added to this schema

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    Frontend (email entry) → POST /api/auth/check-user → routers/auth.py:check_user:31 → SELECT users WHERE email=? → CheckUserResponse(success=True)
                                                                    ↑
                                                        THIS TEST COVERS THIS PATH

**Upstream:** Frontend Password.tsx — calls check-user to decide whether to show Login or Register form
**Downstream:** Nothing depends on this response beyond the client's routing decision

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_check_user_known_email -v`
- [ ] Grep proof: `grep -n "check.user\|check_user\|CheckUserResponse" src/backend/routers/auth.py`

## Downstream Impact
**Impact if unfixed:** Frontend cannot distinguish registered from unregistered users, breaking the email-first login UX flow.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-042 (unknown email), CASE-043 (malformed email 422)
