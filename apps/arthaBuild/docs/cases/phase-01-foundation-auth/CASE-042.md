---
id: CASE-042
title: "POST /api/auth/check-user returns {success:false} for unknown email"
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
test_ref: "tests/test_auth.py::test_check_user_unknown_email"
files:
  - path: src/backend/routers/auth.py
    lines: "24-35"
  - path: src/backend/schemas.py
    lines: "22-26"
---

## Why This Case Was Created
Documents the verified behavior of the check-user endpoint when queried with an unregistered email. Part of the ArthaBuild Phase 01 test registry for root-cause traceability.

## What Is Wrong
N/A — this test is PASSING. If this case ever changes to status: FAIL, investigate:
- Whether the `else` branch at `routers/auth.py:34` returns `CheckUserResponse(success=False)` not a 404
- Whether the response still returns HTTP 200 (not 404) for unknown emails — timing attack prevention requires always 200
- Whether `user_id` accidentally appears in the response schema

## Why It Was Done This Way (Root Cause)
`check_user()` at `routers/auth.py:24-35` always returns HTTP 200 regardless of whether the user exists. When the `SELECT` returns no row, the function falls through to `routers/auth.py:34`: `return CheckUserResponse(success=False, message="User not found")`. Returning 404 would let attackers enumerate registered emails via status code differences — this is the anti-enumeration design decision.

## What Is Done Right
This test covers the "user not found" branch with an email that was never registered (`nobody@nowhere.com`), confirms HTTP 200 (not 404), `success: false`, and absence of `user_id` from the response.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_check_user_unknown_email -v
```
If the test fails, check:
1. `routers/auth.py:34` — the `return CheckUserResponse(success=False, ...)` line must be outside any `if user:` block, not raising HTTPException(404)
2. `schemas.py:22-26` — `CheckUserResponse` must not include `user_id` field

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    Frontend (email entry) → POST /api/auth/check-user → routers/auth.py:check_user:31 → SELECT users WHERE email=? → (no row) → CheckUserResponse(success=False)
                                                                    ↑
                                                        THIS TEST COVERS THIS PATH

**Upstream:** Frontend Password.tsx — uses `success: false` to redirect to registration flow
**Downstream:** Nothing persisted; client-side routing decision only

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_check_user_unknown_email -v`
- [ ] Grep proof: `grep -n "success.*False\|success=False" src/backend/routers/auth.py`

## Downstream Impact
**Impact if unfixed:** Frontend always shows login form even for unregistered emails, breaking the registration flow entry point.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-041 (known email), CASE-043 (malformed email 422)
