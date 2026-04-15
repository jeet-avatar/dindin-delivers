---
id: CASE-057
title: "POST /api/auth/reset-password returns 400 for fake/unknown token"
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
feature: "POST /api/auth/reset-password (DB miss)"
test_ref: "tests/test_auth.py::test_reset_password_invalid_token"
files:
  - path: src/backend/routers/auth.py
    lines: "170-175"
---

## Why This Case Was Created
Verifies that the reset-password endpoint returns HTTP 400 when the submitted token does not match any record in the database, preventing unhandled exceptions or information leakage.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:170-175` — confirm `if not token_record: raise HTTPException(400, "Invalid or expired reset link")` is present immediately after the DB lookup

## Why It Was Done This Way (Root Cause)
The handler at `routers/auth.py:170-175` hashes the submitted raw token with SHA-256 and queries `PasswordResetToken` by the resulting hash. If no row matches — because the token is fabricated, corrupted, or from a different environment — `token_record` is `None` and the handler raises `HTTPException(400)`. This prevents a `NoneType` attribute error that would produce a 500 and expose a stack trace.

## What Is Done Right
The test submits a completely fabricated token string that has never been inserted into the DB and asserts a clean 400 response with an appropriate error message. This guards against the "null pointer equivalent" failure mode and confirms the error message does not reveal whether the token format was valid (preventing oracle attacks).

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_invalid_token -v
```
If failing, check:
1. Is the DB lookup returning `None` correctly (i.e., using `.first()` or `.scalar_one_or_none()` rather than `.one()` which raises an exception)?
2. Has the guard check been removed, causing a `NoneType` error that returns 500 instead of 400?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/reset-password {"token": "fakexyz123", "new_password": "..."}]
      → routers/auth.py:reset_password()
        → hash_token("fakexyz123") → unknown_hash
        → select(PasswordResetToken).where(hash == unknown_hash) → None
        → if not token_record: raise HTTPException(400, "Invalid or expired reset link")
          → HTTP 400 ← THIS TEST COVERS THIS

**Upstream:** Attacker submitting random tokens, or user with a corrupted/malformed reset link
**Downstream:** No DB mutation occurs; the error response leaks no information about token structure.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_invalid_token -v`

## Downstream Impact
**Impact if unfixed:** A missing guard produces a 500 Internal Server Error which may expose a stack trace, or worse — if the guard is replaced with an unsafe fallback — allows partial token matching.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-056, CASE-058
