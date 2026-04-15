---
id: CASE-124
title: "POST /api/auth/check-user response never includes user_id (enumeration prevention)"
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
feature: "POST /api/auth/check-user (anti-enumeration)"
test_ref: "tests/test_security.py::test_no_user_id_in_check_user_response"
files:
  - path: src/backend/routers/auth.py
    lines: ""
  - path: src/backend/schemas.py
    lines: ""
---

## Why This Case Was Created
Verifies that the `POST /api/auth/check-user` endpoint never returns a `user_id` field in
its response body. Exposing primary keys in this pre-auth probe endpoint would allow an
attacker to enumerate valid accounts and harvest their database IDs for targeted attacks.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `schemas.py` — `CheckUserResponse` Pydantic model may have had `user_id` added to it
- `routers/auth.py` — the check-user handler may be returning a raw user dict (which
  includes `id`) instead of the filtered `CheckUserResponse` schema
- A refactor may have replaced `response_model=CheckUserResponse` with a generic dict return

## Why It Was Done This Way (Root Cause)
The `CheckUserResponse` Pydantic schema deliberately omits `id` (and other sensitive fields).
The endpoint uses `response_model=CheckUserResponse` in the FastAPI route decorator, which
ensures FastAPI serialises the response through the schema, stripping any extra fields even
if the handler accidentally returns them. The test POSTs to check-user and asserts
`"user_id"` (and `"id"`) are absent from the JSON response body.

## What Is Done Right
- Calls the endpoint with a known email and asserts `"user_id" not in response.json()`
- Also checks for `"id"` as an alternative field name
- Covers the most common IDOR vector on pre-auth endpoints (account enumeration via primary key)

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_no_user_id_in_check_user_response -v
```

## Architecture Mapping

**Layer:** Backend Router → Pydantic Schema → HTTP Response

**Flow:**
    POST /api/auth/check-user {email: "user@example.com"}
      → routers/auth.py:check_user()
        → query DB for user by email
          → serialize via CheckUserResponse (excludes id/user_id)
            → return {exists: bool, ...}  ← THIS TEST COVERS THIS (asserts no user_id)

**Upstream:** Frontend login form checking if an email is registered before showing password field
**Downstream:** Response safely indicates email existence without leaking primary key

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_no_user_id_in_check_user_response -v`

## Downstream Impact
**Impact if unfixed:** Attackers can harvest all registered user IDs from a public endpoint,
enabling targeted IDOR attacks on any endpoint that accepts a user ID parameter.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-125 (login no enumeration), CASE-126 (forgot-password no enumeration)
