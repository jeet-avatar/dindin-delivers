---
id: CASE-056
title: "POST /api/auth/reset-password returns 400 for expired token (Link expired)"
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
feature: "POST /api/auth/reset-password (expiry check)"
test_ref: "tests/test_auth.py::test_reset_password_expired_token"
files:
  - path: src/backend/routers/auth.py
    lines: "182-188"
---

## Why This Case Was Created
Verifies that the reset-password endpoint rejects tokens whose `expires_at` timestamp has passed, returning HTTP 400, and that the timezone-aware comparison works correctly with SQLite's naive datetime storage.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `src/backend/routers/auth.py:182-188` — confirm the expiry check uses timezone-aware comparison: if the stored datetime is naive, the code adds `tzinfo=UTC` before comparing to `datetime.now(UTC)`
- Confirm the test fixture sets `expires_at` to a past timestamp (e.g., `utcnow() - timedelta(hours=2)`) to simulate an expired token

## Why It Was Done This Way (Root Cause)
SQLite stores `DATETIME` columns as naive strings. The handler at `routers/auth.py:182-188` reads `token.expires_at`, checks if it is timezone-naive and if so attaches `tzinfo=UTC`, then compares with `datetime.now(UTC)`. If `expires_at < now(UTC)` the handler raises `HTTPException(400, "Link expired")`. Token TTL is 1 hour (set in the forgot-password flow).

## What Is Done Right
The test directly sets `token.expires_at` to a past value in the DB fixture to simulate an expired token without waiting real time. It asserts both the 400 status and the "expired" message, verifying the correct error branch is taken rather than the "used" or "not found" branch.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_auth.py::test_reset_password_expired_token -v
```
If failing, check:
1. Is there a timezone mismatch? `datetime.utcnow()` (naive) vs `datetime.now(UTC)` (aware) can cause comparison errors.
2. Has the expiry check been moved after the `used` check, changing the error message the test expects?

## Architecture Mapping

**Layer:** Backend Router

**Flow:**
    [POST /api/auth/reset-password {expired_token, new_password}]
      → routers/auth.py:reset_password()
        → hash_token(raw) → token_hash
        → select(PasswordResetToken) → found, used=False
        → expires_at + tzinfo=UTC < datetime.now(UTC)
        → raise HTTPException(400, "Link expired")
          → HTTP 400 ← THIS TEST COVERS THIS

**Upstream:** User clicks a reset link more than 1 hour after it was issued
**Downstream:** No password change; user must request a new reset email.

## Verification
- [ ] Test passes: `pytest tests/test_auth.py::test_reset_password_expired_token -v`

## Downstream Impact
**Impact if unfixed:** Stale captured reset URLs remain exploitable indefinitely (no 1-hour TTL enforcement), creating a permanent account-takeover vector.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-055, CASE-057
