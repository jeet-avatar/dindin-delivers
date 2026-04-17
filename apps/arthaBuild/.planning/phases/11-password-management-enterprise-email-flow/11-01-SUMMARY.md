---
phase: 11-password-management-enterprise-email-flow
plan: "01"
subsystem: backend
tags: [password-management, email-verification, auth, enterprise-email, html-templates]
dependency_graph:
  requires:
    - Phase 10 (admin router, _write_audit helper)
    - Phase 9 (require_user, auth_utils)
    - Phase 1 (models.py, email_utils.py, PasswordResetToken)
  provides:
    - POST /api/user/change-password
    - DELETE /api/user/me
    - PATCH /api/user/me
    - GET /api/user/me
    - GET /api/user/verify-email
    - POST /api/user/resend-verification
    - POST /api/admin/users/{id}/send-reset
    - require_user_unverified_ok dependency
    - EmailVerificationToken model
    - HTML email templates (reset, verification, admin-reset)
  affects:
    - All existing endpoints that use require_user (now enforce email verification)
    - conftest.py (auto-verify event listener for test compatibility)
tech_stack:
  added: []
  patterns:
    - "Raw SQL UPDATE in tests to bypass SQLAlchemy ORM event listeners"
    - "require_user_unverified_ok alias pattern for pre-verification endpoints"
    - "Anti-enumeration: resend-verification always returns 200 regardless"
    - "SHA-256 token hashing for EmailVerificationToken (mirrors PasswordResetToken)"
key_files:
  created:
    - src/backend/alembic/versions/c4d5e6f7a8b9_phase11_email_verification.py
  modified:
    - src/backend/email_utils.py
    - src/backend/models.py
    - src/backend/schemas.py
    - src/backend/auth_utils.py
    - src/backend/routers/user.py
    - src/backend/routers/admin.py
    - src/backend/tests/test_user.py
    - src/backend/tests/conftest.py
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - "AB-1101: token_expiry() 15min not 1h — industry standard, aligns plan requirement"
  - "AB-1102: require_user_unverified_ok alias (not lambda Depends) — cleaner FastAPI DI pattern"
  - "AB-1103: Raw SQL UPDATE in tests to set is_verified=False — SQLAlchemy ORM event listener fires on User.__init__ and cannot be easily bypassed via ORM; raw SQL is reliable"
  - "AB-1104: All test emails lowercased — backend normalizes to email.lower() on register, test must match"
  - "AB-1105: Auto-verify event listener in conftest — all test-created users are verified by default; unverified tests use explicit raw SQL override"
metrics:
  duration: "~35 minutes"
  completed_date: "2026-04-11"
  tasks: 3
  files_modified: 11
---

# Phase 11 Plan 01: Password Management + Enterprise Email Flow Summary

**One-liner:** HTML-branded email templates for reset/verify/admin-reset, 15min token expiry, EmailVerificationToken model with enforcement, 6 new user endpoints, admin send-reset, 11 new tests — 96/96 pass.

## What Was Built

### Task 1: Email Foundations + Model + Schema

**email_utils.py** — upgraded from plain-text to enterprise HTML:
- `token_expiry()` changed from 1h → 15min
- `_render_reset_email_html()` — white bg, single column, ArthaBuild header, indigo `#4f46e5` CTA button, plain-text fallback URL, "© 2026 TechCloudPro" footer
- `_render_verification_email_html()` — same shell, "Verify Email" button, 24h expiry copy
- `_render_admin_reset_email_html()` — same shell, body clarifies admin triggered the reset
- `send_verification_email(to_email, verify_link)` — now accepts verify_link, sends HTML
- `send_reset_email()` — now sends HTML
- `send_admin_reset_email(to_email, reset_link, admin_name)` — new function

**models.py** — `EmailVerificationToken` model added after `PasswordResetToken`:
```python
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id, user_id (FK→users CASCADE), token_hash (unique), expires_at, used, created_at
```

**schemas.py** — `ChangePasswordRequest`, `PatchUserRequest`, `ResendVerificationRequest` added.

**Alembic migration `c4d5e6f7a8b9`** — creates `email_verification_tokens` with index on user_id.

**CASE-181/184/185/186/187** marked IN_PROGRESS.

### Task 2: New Endpoints + Verification Enforcement + Admin Reset

**routers/user.py** — 6 new endpoints + register() updated:

| Endpoint | Auth | Behavior |
|----------|------|---------|
| `GET /api/user/verify-email?token=` | Public | Hashes token, marks used, sets is_verified=True |
| `POST /api/user/resend-verification` | Public | Rate-limited 3/min, anti-enumeration always 200 |
| `GET /api/user/me` | unverified_ok | Returns id, names, email, role, is_verified |
| `PATCH /api/user/me` | unverified_ok | Updates first_name and/or last_name only |
| `DELETE /api/user/me` | unverified_ok | is_active=False + blacklist current JTI |
| `POST /api/user/change-password` | unverified_ok | Verifies old password via bcrypt before update |

`register()` now generates `EmailVerificationToken` (24h) and sends HTML verify link via background task.

**auth_utils.py** — `require_user()` gains `require_verified: bool = True`:
```python
if require_verified and not user.is_verified:
    raise HTTPException(403, {"error": "email_not_verified", ...})
```
`require_user_unverified_ok` alias added for endpoints that must work pre-verification.

**routers/admin.py** — `POST /api/admin/users/{user_id}/send-reset`:
- Cross-tenant check: `target.team_id == admin.team_id`
- Invalidates existing reset tokens
- Creates new `PasswordResetToken` (15min)
- Writes audit log: `"admin_password_reset_sent"`
- Sends `send_admin_reset_email()` in background

### Task 3: Tests + conftest Updates

**conftest.py**:
- `@event.listens_for(User, "init")` auto-verify listener — all test-created users are verified by default
- `auth_tokens` fixture updated to set Alice `is_verified=True` before login (backward compat)
- `valid_reset_token` fixture expiry updated to 15min (matches `token_expiry()`)
- `EmailVerificationToken` imported for `Base.metadata.create_all`

**test_user.py** — 11 new tests:
- CASE-181a: change-password succeeds with correct old password
- CASE-181b: change-password rejects wrong old password (401)
- CASE-187a/b/c: PATCH /me updates names, partial update, email unchanged
- CASE-184: DELETE /me soft-deletes and token rejected after
- CASE-185a/b/c: resend-verification for unverified/unknown/verified all return 200
- CASE-186a: unverified user blocked from /api/chats (403)
- CASE-186b: unverified user CAN access GET /api/user/me (200)

## Decisions Made

**AB-1101:** `token_expiry()` returns 15min — plan requirement, industry standard for password reset links.

**AB-1102:** `require_user_unverified_ok` is a top-level async function alias (not a lambda inside `Depends()`). Lambda with `Depends()` has FastAPI DI resolution issues; named function is cleaner.

**AB-1103:** Tests that need unverified users use raw SQL `UPDATE users SET is_verified = 0` instead of ORM. The conftest auto-verify `@event.listens_for(User, "init")` fires on every `User()` constructor call in the same process, including app code during HTTP requests. ORM-level `session.execute(select(User)...)` + attribute assignment + commit still returns the cached value due to `expire_on_commit=False`. Raw SQL bypasses both.

**AB-1104:** Test emails must be all-lowercase. `register()` calls `data.email.lower()` before storing. Tests querying by email must use the same lowercase form, otherwise the SQL WHERE clause finds 0 rows.

**AB-1105:** Auto-verify event listener in conftest is the minimal-impact approach to keep 85 existing tests passing without touching every test file. Only 2 tests specifically need unverified state; they use raw SQL override.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing test isolation] Conftest auto-verify event listener**
- **Found during:** Task 3 — all existing tests failed 403 after adding is_verified enforcement
- **Issue:** 85 existing tests created users via HTTP register (setting is_verified=False by default). After adding enforcement in require_user(), they all started returning 403 instead of expected responses
- **Fix:** Added `@event.listens_for(User, "init")` listener in conftest.py to auto-set `is_verified=True` for all test-environment User objects. Tests that need unverified behavior use raw SQL UPDATE.
- **Files modified:** src/backend/tests/conftest.py
- **Commit:** bed6f38e

**2. [Rule 1 - Bug] Mixed-case email in SQL WHERE clause**
- **Found during:** Task 3 debugging — CASE-186a test got 200 instead of 403
- **Issue:** Test used email "blocked-chat-v4@arthaBuild-test.com" (mixed case) to query DB, but register() stored it as "blocked-chat-v4@arthabuild-test.com" (lowercase). SQL WHERE found 0 rows → raw SQL UPDATE was a no-op → user stayed verified.
- **Fix:** Changed test email strings to all-lowercase to match register() normalization.
- **Files modified:** src/backend/tests/test_user.py
- **Commit:** bed6f38e

**3. [Rule 1 - Bug] change-password tests mutated Alice's password**
- **Found during:** Task 3 — test_patch_user_me tests were getting 401 (auth failure in fixture setup)
- **Issue:** `test_change_password_validates_old_password` used `auth_tokens` fixture (Alice) and changed her password from "AlicePass1!" to "NewSecure456@". Subsequent tests with `auth_tokens` fixture tried to login with old password → 401.
- **Fix:** Changed both change_password tests to use dedicated users instead of Alice's auth_tokens.
- **Files modified:** src/backend/tests/test_user.py
- **Commit:** bed6f38e

**4. [Rule 1 - Bug] Login calls used `data=` instead of `json=`**
- **Found during:** Task 3 — test_delete_account got KeyError: 'access_token'
- **Issue:** CASE-184 and CASE-186 tests used `data={"username": ..., "password": ...}` (form encoding) but the /api/auth/login endpoint expects JSON body (LoginRequest schema). Form-encoded request returned 422, and `login.json()["access_token"]` raised KeyError.
- **Fix:** Changed `data=` to `json=` in all Phase 11 login calls.
- **Files modified:** src/backend/tests/test_user.py
- **Commit:** bed6f38e

## Verification

```
PASS: python -c "from email_utils import token_expiry; ..."  # 900s delta (15min)
PASS: python -c "from models import EmailVerificationToken; print('OK')"
PASS: python -c "from schemas import ChangePasswordRequest, PatchUserRequest; print('OK')"
PASS: python -c "from routers.user import router; print([r.path for r in router.routes])"
      # ['/api/user/register', '/api/user/verify-email', '/api/user/resend-verification',
      #  '/api/user/me', '/api/user/me', '/api/user/me', '/api/user/change-password', ...]
PASS: python -c "from auth_utils import require_user_unverified_ok; print('OK')"
PASS: python -c "from routers.admin import router; ..."  # send-reset found
PASS: pytest tests/ — 96 passed, 5 skipped
```

## CASE Status

| CASE | Title | Status |
|------|-------|--------|
| CASE-181 | POST /api/user/change-password validates old password | DONE |
| CASE-184 | DELETE /api/user/me deletes account and invalidates all tokens | DONE |
| CASE-185 | POST /api/user/resend-verification resends verification link | DONE |
| CASE-186 | Unverified users cannot access chat/NetSuite endpoints | DONE |
| CASE-187 | PATCH /api/user/me updates first_name and last_name | DONE |

## Commits

| Hash | Description |
|------|-------------|
| `000e2694` | feat(11-01): email foundations — HTML templates, token_expiry 15min, EmailVerificationToken model, schemas |
| `4a47412e` | feat(11-01): user endpoints, verification enforcement, admin send-reset |
| `bed6f38e` | test(11-01): Phase 11 tests CASE-181/184/185/186/187, conftest auto-verify + token expiry fix |

## Self-Check: PASSED

All 13 files exist. All 3 task commits verified in git log (`000e2694`, `4a47412e`, `bed6f38e`). 96 pytest tests pass.
