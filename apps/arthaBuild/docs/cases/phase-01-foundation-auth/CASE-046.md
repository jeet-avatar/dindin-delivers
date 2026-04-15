---
id: CASE-046
title: "POST /api/auth/login returns identical 401 for unknown email and wrong password (no enumeration)"
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
test_ref: "tests/test_auth.py::test_login_unknown_email_same_error_as_wrong_password"
files:
  - path: src/backend/routers/auth.py
    lines: "48-68"
---

## Why This Case Was Created
Documents the verified anti-enumeration security property: unknown email and wrong password produce byte-identical error responses. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether two separate `HTTPException` objects with different `detail` strings were introduced for the two failure paths (user-not-found vs wrong-password) in `routers/auth.py:50-68`
- Whether `generic_error` at `routers/auth.py:50` is being modified between the two code paths

## Why It Was Done This Way (Root Cause)
`login()` at `routers/auth.py:50` creates a single `generic_error = HTTPException(status_code=401, detail="Invalid email or password")` object. Both the "user not found" path (`routers/auth.py:52-53`) and the "wrong password" path (`routers/auth.py:68`) raise this same object. This design guarantees that the `detail` string is identical for both cases, preventing an attacker from determining which emails are registered by comparing response bodies.

## What Is Done Right
This test makes two live API calls — one with a non-existent email and one with an existing email but wrong password — and asserts that `r_unknown.json()["detail"] == r_wrong.json()["detail"]`. This is a strict byte-equality check, not just a status-code check.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_login_unknown_email_same_error_as_wrong_password -v
```
If the test fails, check:
1. `routers/auth.py:50-68` — both `raise generic_error` calls must reference the same `HTTPException` with identical `detail`; do not introduce a second HTTPException with different wording
2. Compare exact strings: `"Invalid email or password"` must match between both code paths

## Architecture Mapping

**Layer:** Backend Router (security property)

**Flow:**
    POST /api/auth/login (unknown email) → routers/auth.py:52 → raise generic_error(401, "Invalid email or password")
    POST /api/auth/login (wrong password) → routers/auth.py:68 → raise generic_error(401, "Invalid email or password")
                                                    ↑
                                        THIS TEST COVERS BOTH PATHS AND ASSERTS THEY ARE EQUAL

**Upstream:** Frontend login form
**Downstream:** Security audit — enumeration prevention is a SOC2 requirement

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_login_unknown_email_same_error_as_wrong_password -v`
- [ ] Grep proof: `grep -n "generic_error\|raise HTTPException" src/backend/routers/auth.py`

## Downstream Impact
**Impact if unfixed:** Attackers can enumerate registered email addresses by comparing error messages, enabling targeted phishing.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-045 (wrong password 401), CASE-047 (lockout)
