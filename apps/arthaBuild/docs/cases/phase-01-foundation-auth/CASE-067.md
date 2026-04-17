---
id: CASE-067
title: "POST /api/user/register returns 422 when email field missing"
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
feature: "POST /api/user/register (schema validation)"
test_ref: "tests/test_user.py::test_register_missing_email_returns_422"
files:
  - path: src/backend/routers/user.py
    lines: "1-50"
  - path: src/backend/auth_utils.py
    lines: "10-25"
---

## Why This Case Was Created
Verifies that FastAPI's automatic Pydantic schema validation rejects a registration payload missing the required `email` field with HTTP 422 (Unprocessable Entity) before the route handler is invoked.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/user.py:1-50` — confirm the route accepts a Pydantic `RegisterRequest` model (not raw `dict`) so FastAPI enforces schema validation automatically
- Confirm `email` is declared as a required field in `RegisterRequest` with no default value

## Why It Was Done This Way (Root Cause)
FastAPI validates request bodies against the declared Pydantic model before calling the route handler. `RegisterRequest` declares `email` as a required field (no `Optional`, no `= None`). When the `email` key is absent from the request body, Pydantic raises a `ValidationError` which FastAPI converts to an HTTP 422 response with a structured error body. The route handler never executes.

## What Is Done Right
The test sends a request body containing only `password` (no `email`) and asserts a 422 response. This confirms that required-field enforcement happens at the framework level — no custom guard code is needed in the handler — and that the validation fires correctly for this specific field.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_user.py::test_register_missing_email_returns_422 -v
```
If failing, check:
1. Has `RegisterRequest.email` been given a default value (`Optional[str] = None`)? If so, the field is no longer required and 422 won't trigger.
2. Has the route been changed to accept `request: Request` (raw) instead of `body: RegisterRequest` (Pydantic)? Raw request bodies skip Pydantic validation.

## Architecture Mapping

**Layer:** FastAPI Framework (Pydantic validation layer)

**Flow:**
    [POST /api/user/register {"password": "StrongP@ss1"}]
      → FastAPI request body parsing
        → RegisterRequest(**body) → ValidationError: "email field required"
        → FastAPI converts to HTTP 422 {"detail": [...]}
          → route handler never called
            → HTTP 422 ← THIS TEST COVERS THIS

**Upstream:** Client sends malformed request (missing field, wrong key name, etc.)
**Downstream:** No handler logic executes; the DB is never touched.

## Verification
- [ ] Test passes: `pytest tests/test_user.py::test_register_missing_email_returns_422 -v`

## Downstream Impact
**Impact if unfixed:** Missing email field causes either a 500 (KeyError in handler) or silently registers a user with a null email, breaking login and all email-dependent flows.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-066, CASE-068
