---
id: CASE-048
title: "POST /api/auth/login rejects SQL injection attempts (401 or 422)"
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
feature: "POST /api/auth/login (SQL injection prevention)"
test_ref: "tests/test_auth.py::test_login_sql_injection_sanitized"
files:
  - path: src/backend/routers/auth.py
    lines: "90-110"
---

## Why This Case Was Created
Verifies that the login endpoint is immune to SQL injection by relying on SQLAlchemy ORM parameterized queries rather than raw SQL interpolation.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:90-110` — confirm the user lookup uses `select(User).where(User.email == data.username)` (ORM expression), not a raw `text()` or f-string query
- Confirm the response status is 401 or 422 and never 200 when the payload contains `' OR '1'='1`

## Why It Was Done This Way (Root Cause)
SQLAlchemy's ORM compiles `User.email == data.username` into a parameterized SQL statement (`WHERE email = ?` with the value bound separately). The injection string `' OR '1'='1` is treated as a literal email address value, not SQL syntax, so no user record matches and the handler returns 401 (or 422 if schema validation rejects the malformed string first).

## What Is Done Right
The test sends a classic boolean-based injection payload as the username and asserts the response status is in `{401, 422}` — it correctly accepts either because schema validation may reject the value before the ORM query runs. The test never asserts the specific error message, keeping it resilient to wording changes.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_login_sql_injection_sanitized -v
```
If failing, check:
1. Has any developer replaced the ORM query with a raw `text()` call or string formatting?
2. Is the Pydantic schema for `LoginRequest.username` typed as `str` with appropriate max-length to prevent oversized payloads?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/login {"username": "' OR '1'='1", "password": "x"}]
      → routers/auth.py:login()
        → Pydantic LoginRequest validation → may raise 422
        → select(User).where(User.email == "' OR '1'='1") [parameterized]
          → No user found → raise HTTP 401
            → HTTP 401 or 422 (never 200) ← THIS TEST COVERS THIS

**Upstream:** Frontend login form → POST /api/auth/login
**Downstream:** All downstream JWT issuance and session management assumes the authenticated user identity was verified correctly; SQL injection here would allow impersonation.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_login_sql_injection_sanitized -v`

## Downstream Impact
**Impact if unfixed:** An attacker could authenticate as any registered user (or as the first user in the database) by bypassing the password check via SQL injection.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-047, CASE-049
