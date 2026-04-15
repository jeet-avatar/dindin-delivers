---
id: CASE-044
title: "POST /api/auth/login returns 200 with access and refresh tokens for valid credentials"
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
feature: "POST /api/auth/login"
test_ref: "tests/test_auth.py::test_login_valid_credentials"
files:
  - path: src/backend/routers/auth.py
    lines: "38-82"
  - path: src/backend/auth_utils.py
    lines: "58-80"
  - path: src/backend/schemas.py
    lines: "13-16"
---

## Why This Case Was Created
Documents the verified happy-path login behavior: bcrypt verification, JWT creation, and correct response shape. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether bcrypt round count changed from 12 (`auth_utils.py:22` — `bcrypt__rounds=12`)
- Whether `JWT_SECRET_KEY` in the test environment's `.env` matches the key used for token creation
- Whether the `username` field name changed in `LoginRequest` (`schemas.py:14`)
- Whether `user.email` is being stored lowercased at registration time (`routers/user.py:51`)

## Why It Was Done This Way (Root Cause)
`login()` at `routers/auth.py:38-82` looks up the user by `data.username.lower()` (the frontend sends email as the `username` field — `schemas.py:14`). It calls `verify_password()` at `auth_utils.py:37-38` which delegates to passlib bcrypt. On success, it calls `create_access_token()` at `auth_utils.py:58-66` (24h expiry, `type="access"`, `sub=str(user_id)`) and `create_refresh_token()` at `auth_utils.py:74-80` (7d expiry, `type="refresh"`). The response is a flat `TokenResponse` object — no nested user object (frozen interface per CLAUDE.md).

## What Is Done Right
This test covers the complete login happy path: correct credentials, HTTP 200, presence of `access_token` and `refresh_token`, `token_type: "bearer"`, and that the returned email is lowercase-normalized.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_login_valid_credentials -v
```
If the test fails, check:
1. `auth_utils.py:22` — bcrypt rounds must be 12; changing this invalidates all stored hashes
2. `auth_utils.py:58-66` — `create_access_token()` must set `"token_type": "access"` in payload
3. `routers/auth.py:46` — `data.username.lower()` must match lowercase email stored at registration
4. `schemas.py:28-36` — `TokenResponse` must include `access_token`, `refresh_token`, `token_type`

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    Frontend login form → POST /api/auth/login {username, password} → routers/auth.py:login:46 → SELECT users WHERE email=? → auth_utils.py:verify_password → auth_utils.py:create_access_token + create_refresh_token → TokenResponse
                                                            ↑
                                                THIS TEST COVERS THIS PATH

**Upstream:** Frontend `authService.ts` — sends `{username: email, password}` and stores tokens
**Downstream:** All authenticated endpoints depend on access tokens issued here; refresh endpoint depends on refresh tokens issued here

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_login_valid_credentials -v`
- [ ] Grep proof: `grep -n "def login\|generic_error\|create_access_token" src/backend/routers/auth.py`

## Downstream Impact
**Impact if unfixed:** All authenticated features are inaccessible; users cannot log in.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-045 (wrong password), CASE-046 (unknown email same error), CASE-047 (lockout)
