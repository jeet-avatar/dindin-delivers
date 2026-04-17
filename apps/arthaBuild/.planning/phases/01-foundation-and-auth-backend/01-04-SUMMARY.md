---
phase: 01-foundation-and-auth-backend
plan: 04
subsystem: auth-backend
tags: [auth, email, smtp, password-reset, jwt, fastapi-mail, slowapi]
dependency_graph:
  requires: [01-02, 01-03]
  provides: [email_utils, routers/auth-forgot-reset-refresh]
  affects: [phase-4-frontend-wiring]
tech_stack:
  added: [fastapi-mail==1.4.1]
  patterns: [SHA-256 token hashing, SUPPRESS_SEND fallback, FRONTEND_BASE_URL for reset links, BackgroundTasks for async email]
key_files:
  created:
    - src/backend/email_utils.py
  modified:
    - src/backend/routers/auth.py
decisions:
  - "MAIL_FROM falls back to noreply@example.com when SMTP_USER not set (Pydantic validates email addresses)"
  - "APP_BASE_URL must NOT be used in reset link — FRONTEND_BASE_URL only (React Router route, not FastAPI endpoint) [AB-004]"
  - "Reset token: secrets.token_urlsafe(32) raw, SHA-256 hash stored in DB — raw never written to disk"
  - "forgot-password always returns 200 regardless of email existence (no enumeration)"
  - "reset-password checks: password policy → token exists → not used → not expired → update password"
  - "refresh endpoint uses decode_token(token, expected_type='refresh') to prevent access tokens being used"
  - "SUPPRESS_SEND=True when SMTP_HOST absent — non-fatal startup, warning logged only"
metrics:
  duration: "~6 minutes"
  completed: "2026-04-07"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 1 Plan 4: Email Utils and Password Reset / Refresh Endpoints Summary

**One-liner:** SMTP email with SHA-256 reset token, forgot-password/reset-password/refresh endpoints completing FR-AUTH-04/05/06, all rate-limited 10/min with no-enumeration security.

## What Was Built

### Task 1: email_utils.py

**email_utils.py** provides:
- `generate_reset_token()`: returns `(raw_token, sha256_hash)` — raw for email URL, hash for DB storage
- `hash_token(raw)`: SHA-256 for DB lookup of a raw token
- `token_expiry()`: returns `now(UTC) + 1 hour`
- `send_reset_email(to_email, reset_link)`: async SMTP send via FastMail; silently no-ops if `SMTP_HOST` not configured
- `mail_conf`: `ConnectionConfig` with `SUPPRESS_SEND=True` when SMTP absent; `MAIL_FROM` always a valid email (fallback `noreply@example.com`)

**Security properties:**
- Raw token: never stored — only SHA-256 hash lives in `password_reset_tokens` table
- Non-fatal: missing SMTP logs a warning only, app starts clean

### Task 2: Three new endpoints appended to routers/auth.py

**POST /api/auth/forgot-password:**
- Rate limited 10/minute per IP
- Looks up user by email — creates `PasswordResetToken` record if found
- Reset link uses `FRONTEND_BASE_URL` (React Router `/reset-password` page) — NOT `APP_BASE_URL`
- Sends email via `background_tasks.add_task()` — non-blocking
- Always returns `200` with generic message (no enumeration)

**POST /api/auth/reset-password:**
- Rate limited 10/minute per IP
- Validates new password policy first (8+ chars, upper/lower/digit/special)
- Hashes submitted token, looks up `PasswordResetToken` by hash
- Returns 400 `"Link already used"` if `token_record.used == True`
- Returns 400 `"Link expired"` if `expires_at < now(UTC)` (handles SQLite naive datetime)
- On success: updates `user.password_hash`, resets `failed_attempts=0`, `locked_until=None`, sets `token_record.used=True`

**POST /api/auth/refresh:**
- Rate limited 10/minute per IP
- Decodes token with `decode_token(token, expected_type="refresh")` — prevents access tokens being used
- Returns 401 on `ExpiredSignatureError` or `InvalidTokenError`
- Returns new `access_token` + `token_type: "bearer"`

## Verification Results

| Check | Expected | Actual |
|-------|----------|--------|
| email_utils imports without SMTP_HOST | Warning logged, no crash | PASS |
| generate_reset_token() raw/hash consistency | hash_token(raw) == stored hash | PASS |
| router imports cleanly | No import errors | PASS |
| All 5 auth routes present | check-user, login, forgot-password, reset-password, refresh | PASS |
| FRONTEND_BASE_URL used in reset link | os.getenv("FRONTEND_BASE_URL", "http://localhost:5173") | PASS |
| APP_BASE_URL not in functional code | Zero non-comment matches | PASS |
| 5x @limiter.limit decorators | 5 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ConnectionConfig MAIL_FROM validation error when SMTP_USER not set**
- **Found during:** Task 1 first import test
- **Issue:** When `SMTP_USER` env var is absent, `os.getenv("SMTP_USER", "noreply@example.com")` returns the fallback but `os.getenv("SMTP_FROM", os.getenv("SMTP_USER", ...))` could collapse to empty string `""` if `SMTP_FROM=""` in env. Pydantic's `ConnectionConfig` validates `MAIL_FROM` as a valid email address and raises `ValidationError` on empty string.
- **Fix:** Added `_FALLBACK_EMAIL = "noreply@example.com"` and explicit `or _FALLBACK_EMAIL` guard so `MAIL_FROM` is always a valid email even when all SMTP env vars are unset.
- **Files modified:** `src/backend/email_utils.py`
- **Commit:** fb3dbc80

## Self-Check: PASSED

**Files verified:**
- FOUND: src/backend/email_utils.py
- FOUND: src/backend/routers/auth.py (modified — 5 routes present)

**Commits verified:**
- fb3dbc80: feat(01-04): create email_utils.py with SMTP config and reset token helpers
- 90b34b33: feat(01-04): add forgot-password, reset-password, refresh endpoints to auth router
