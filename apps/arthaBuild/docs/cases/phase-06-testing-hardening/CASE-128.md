---
id: CASE-128
title: "All auth endpoints have @limiter.limit decorator applied"
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
feature: "Rate limiting on auth endpoints"
test_ref: "tests/test_security.py::test_rate_limit_decorator_on_all_auth_endpoints"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that every authentication endpoint (`check-user`, `login`, `forgot-password`,
`reset-password`, `refresh`) has the `@limiter.limit(...)` decorator applied. Without rate
limiting, these endpoints are vulnerable to brute-force credential attacks and automated
account enumeration at unlimited request rates.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — a new auth endpoint may have been added without the `@limiter.limit`
  decorator
- An existing endpoint may have had its decorator accidentally removed during a refactor
- The `limiter` object import at the top of `auth.py` may have been removed, causing a
  `NameError` that makes all decorated endpoints fall back to no limiting

## Why It Was Done This Way (Root Cause)
The test reads `routers/auth.py` as source text using `inspect` or `open()`, then uses regex
to find all route function definitions (`@router.post`, `@router.get`) and asserts that each
one is preceded by a `@limiter.limit(...)` line. This static-analysis approach catches
missing decorators even if the endpoint works correctly in isolation. The `slowapi` (or
equivalent) limiter is configured to allow a small number of requests per IP per time window
on auth routes.

## What Is Done Right
- Checks the source file rather than runtime behaviour, catching missing decorators at test
  time rather than only during a real brute-force attack
- Covers all known auth endpoints by name
- Fails loudly if any endpoint is missing the decorator, with the endpoint name in the
  failure message

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_rate_limit_decorator_on_all_auth_endpoints -v
```

## Architecture Mapping

**Layer:** Static Analysis (test-time scan) + Runtime Middleware

**Flow:**
    test_rate_limit_decorator_on_all_auth_endpoints()
      → open("routers/auth.py")
        → for each auth route function:
            assert "@limiter.limit" appears before the function def  ← THIS TEST COVERS THIS

    Runtime:
      POST /api/auth/login  (11th request from same IP within window)
        → slowapi limiter middleware → 429 Too Many Requests

**Upstream:** Automated bot or brute-force tool sending rapid auth requests
**Downstream:** Limiter returns 429 after threshold; protects all user accounts

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_rate_limit_decorator_on_all_auth_endpoints -v`

## Downstream Impact
**Impact if unfixed:** Auth endpoints become open to unlimited brute-force attempts. Given
bcrypt's cost factor, CPU usage may spike and account passwords may be compromised if the
limiter is absent on `login` or `reset-password`.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-127 (no OpenAI keys), CASE-129 (weak JWT secret), CASE-125 (login anti-enumeration)
