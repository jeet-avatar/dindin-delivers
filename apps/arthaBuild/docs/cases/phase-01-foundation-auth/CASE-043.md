---
id: CASE-043
title: "POST /api/auth/check-user returns 422 for malformed email"
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
test_ref: "tests/test_auth.py::test_check_user_malformed_email_returns_422"
files:
  - path: src/backend/schemas.py
    lines: "18-20"
  - path: src/backend/routers/auth.py
    lines: "24-35"
---

## Why This Case Was Created
Documents the verified Pydantic validation behavior that rejects malformed emails before the route handler executes. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether `CheckUserRequest.email` is typed as `EmailStr` in `schemas.py:19` — if changed to `str`, Pydantic will not validate email format
- Whether the `email-validator` Python package is installed (required by Pydantic `EmailStr`)
- Whether FastAPI's 422 handler is being overridden somewhere in `rawapi.py`

## Why It Was Done This Way (Root Cause)
`CheckUserRequest` at `schemas.py:18-20` declares `email: EmailStr`. Pydantic's `EmailStr` type performs RFC 5322 email format validation before the body is passed to the route handler. When validation fails, FastAPI automatically returns HTTP 422 Unprocessable Entity with a detailed error body. The route handler at `routers/auth.py:26-35` never runs for invalid input.

## What Is Done Right
This test confirms that input validation is enforced at the schema layer (not inside the route handler), using `"not-an-email"` as the payload. It verifies the HTTP 422 status code, ensuring that the DB is never queried with malformed data.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_check_user_malformed_email_returns_422 -v
```
If the test fails, check:
1. `schemas.py:19` — `email: EmailStr` (not `email: str`)
2. `pip show email-validator` — must be installed; `EmailStr` requires it
3. No custom exception handler overriding FastAPI's default 422 response in `rawapi.py`

## Architecture Mapping

**Layer:** Backend Router (Pydantic schema validation — pre-handler)

**Flow:**
    POST /api/auth/check-user (malformed body) → FastAPI Pydantic validation → schemas.py:CheckUserRequest:19 → ValidationError → 422 response
                                                            ↑
                                                THIS TEST COVERS THIS PATH
    (route handler at routers/auth.py:26 never executes)

**Upstream:** Any caller sending a non-email string to check-user
**Downstream:** DB query is never made — no performance or injection risk

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_check_user_malformed_email_returns_422 -v`
- [ ] Grep proof: `grep -n "EmailStr" src/backend/schemas.py`

## Downstream Impact
**Impact if unfixed:** Malformed strings reach the DB query, wasting a connection and potentially exposing internal error messages.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-041 (known email), CASE-042 (unknown email)
