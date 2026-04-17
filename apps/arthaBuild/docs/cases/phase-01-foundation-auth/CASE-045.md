---
id: CASE-045
title: "POST /api/auth/login returns 401 with generic error for wrong password"
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
test_ref: "tests/test_auth.py::test_login_wrong_password"
files:
  - path: src/backend/routers/auth.py
    lines: "48-68"
  - path: src/backend/auth_utils.py
    lines: "37-38"
---

## Why This Case Was Created
Documents the verified behavior that a wrong password returns 401 with a generic error message, preventing email enumeration. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether `generic_error` at `routers/auth.py:50` was changed to a different status code or message
- Whether the error message contains "invalid" or "incorrect" (required by the assertion)
- Whether `verify_password()` is raising an exception instead of returning `False`

## Why It Was Done This Way (Root Cause)
`login()` at `routers/auth.py:50` defines `generic_error = HTTPException(status_code=401, detail="Invalid email or password")`. When `verify_password()` at `auth_utils.py:37-38` returns `False`, the route raises `generic_error`. The same `generic_error` object is also raised when the user is not found at `routers/auth.py:52-53`, ensuring both failure modes return identical responses. This is the anti-enumeration pattern — attackers cannot distinguish "wrong password for real user" from "no such user."

## What Is Done Right
This test verifies the wrong-password path: HTTP 401, and that the detail message contains "invalid" or "incorrect" (case-insensitive). It also implicitly confirms that `failed_attempts` is being incremented (the lockout path in CASE-047 depends on this same code path).

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_login_wrong_password -v
```
If the test fails, check:
1. `routers/auth.py:50` — `generic_error` detail must contain "invalid" or "incorrect" (lowercase match)
2. `routers/auth.py:60-68` — the `raise generic_error` at the end of the wrong-password branch
3. `auth_utils.py:37-38` — `verify_password()` must return `bool`, not raise an exception

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    POST /api/auth/login {username, wrong_password} → routers/auth.py:login:60 → verify_password()=False → failed_attempts++ → raise generic_error(401)
                                                                ↑
                                                    THIS TEST COVERS THIS PATH

**Upstream:** Frontend login form — displays "Invalid email or password" error to user
**Downstream:** `failed_attempts` increment here feeds the lockout logic tested in CASE-047

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_login_wrong_password -v`
- [ ] Grep proof: `grep -n "generic_error\|failed_attempts" src/backend/routers/auth.py`

## Downstream Impact
**Impact if unfixed:** Wrong passwords may succeed, or enumeration attack surface opens if error messages differ between "wrong password" and "unknown email."

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-046 (same error for unknown email), CASE-047 (lockout after 5 failures)
