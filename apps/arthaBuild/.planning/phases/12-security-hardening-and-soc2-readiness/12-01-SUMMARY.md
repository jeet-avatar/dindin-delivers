---
phase: 12
plan: "01"
subsystem: backend-security
tags: [soc2, audit-log, auth, security, compliance]
dependency_graph:
  requires: [phase-10-admin-panel, phase-11-password-management]
  provides: [audit-log-expansion, write-audit-event-helper, soc2-cc7.2-compliance]
  affects: [routers/auth.py, routers/user.py, routers/admin.py, models.py, GET /api/admin/audit]
tech_stack:
  added: [audit_utils.py]
  patterns: [append-only audit log, atomic audit write, dot-notation action strings]
key_files:
  created:
    - src/backend/audit_utils.py
    - src/backend/alembic/versions/d5e6f7a8b9ca_phase12_audit_expansion.py
    - src/backend/tests/security/test_audit_log.py
  modified:
    - src/backend/models.py
    - src/backend/routers/auth.py
    - src/backend/routers/user.py
    - src/backend/routers/admin.py
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - id: AB-1201
    summary: "write_audit_event() does NOT call db.commit() — audit write is atomic with parent operation; if parent rolls back, audit entry also rolls back (no orphan logs)"
  - id: AB-1202
    summary: "actor_email stored as String (not FK) — survives account deletion; string representation is better for long-term audit trail than a FK that can be nulled on delete"
  - id: AB-1203
    summary: "admin_id made nullable in migration (Phase 10 legacy column) — auth events have no admin_id, only actor_email"
  - id: AB-1204
    summary: "logout endpoint given DB session + Request params — needed to look up user.email from JWT sub claim (JWT payload has sub/role but not email)"
  - id: AB-1205
    summary: "test email lowercased in test_registration_creates_audit_log — register() stores email.lower(), assertion must match (STATE.md AB-1104 decision)"
metrics:
  duration_minutes: 13
  completed_date: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 7
  tests_added: 5
  tests_total_after: 115
---

# Phase 12 Plan 01: Audit Log Expansion (SOC2 CC7.2) Summary

**One-liner:** JWT auth audit trail expanded from admin-only to 17 event types across 3 routers using shared write_audit_event() helper and Alembic migration d5e6f7a8b9ca for SOC2 CC7.2 compliance.

## What Was Built

Phase 10 introduced a narrow AuditLog covering only 4 admin actions. Phase 12 Plan 01 expands it to full SOC2 CC7.2 coverage — every login attempt, logout, token refresh, registration, password change, and admin action now creates an AuditLog row with actor identity, IP address, and outcome.

## Tasks Completed

### Task 1: audit_utils.py + Alembic migration + expanded AuditLog model

**Files:** `src/backend/audit_utils.py`, `src/backend/models.py`, `src/backend/alembic/versions/d5e6f7a8b9ca_phase12_audit_expansion.py`

- Created `audit_utils.py` with `write_audit_event()` — single shared helper across all 3 routers
- No circular imports: only imports AuditLog from models.py
- Expanded AuditLog model with 5 new columns: actor_email, actor_role, result, ip_address, target
- Phase 10 legacy columns (admin_id, target_user_id, detail) kept nullable for backward compat
- Alembic migration `d5e6f7a8b9ca` applies cleanly: `c4d5e6f7a8b9 -> d5e6f7a8b9ca`
- admin_id altered from NOT NULL to nullable (auth events have no admin_id)
- Composite index `ix_audit_logs_ts_actor` on (created_at, actor_email) for time-range queries
- All 110 existing tests pass after migration

**Verification:**
- `alembic current`: `d5e6f7a8b9ca (head)`
- `sqlite3 arthaBuild.db ".schema audit_logs"`: all 5 new columns present
- `python -c "from audit_utils import write_audit_event; print('OK')"`: no circular import

### Task 2: Auth event hooks + admin.py call site migration + security tests

**Files:** `src/backend/routers/auth.py`, `src/backend/routers/user.py`, `src/backend/routers/admin.py`, `src/backend/tests/security/test_audit_log.py`

**auth.py hooks (7 event types):**
- `auth.login_success` — successful login
- `auth.login_failed` — wrong password (3 paths: bad email, bad password, lockout)
- `auth.logout` — token revoked + blacklisted
- `auth.token_refresh` — refresh success
- `auth.token_refresh_failed` — expired or invalid refresh token
- `user.forgot_password` — forgot-password request (only when user found)
- `user.password_reset` — password reset via link

**user.py hooks (4 event types):**
- `auth.register` — new user registration
- `user.password_changed` — in-app password change
- `user.account_deleted` — soft-delete /me
- `user.email_resend` — resend verification email

**admin.py migrations (6 call sites):**
- `admin.role_changed` — replaces `_write_audit(db, admin.id, "role_changed", ...)`
- `admin.user_removed` — replaces `_write_audit(db, admin.id, "user_removed", ...)`
- `admin.invite_sent` — added to invite endpoint (previously no audit)
- `admin.config_updated` — replaces `_write_audit(db, admin.id, "config_updated", ...)`
- `admin.password_reset_sent` — replaces legacy `_write_audit()` call
- `admin.team_created` — replaces `_write_audit(db, admin.id, "team_created", ...)`

**GET /api/admin/audit upgrade:**
- Now accepts `?offset=0&limit=50` query params (max limit=200)
- Returns newest-first (ORDER BY created_at DESC)
- Returns all expanded fields: actor_email, actor_role, result, ip_address, target
- Removed admin JOIN — audit entries now self-contained (actor_email is the actor identifier)

**Security tests (5 new):**
- `test_login_success_creates_audit_log` — PASS
- `test_login_failure_creates_audit_log` — PASS
- `test_audit_log_has_no_mutation_endpoints` — PASS
- `test_get_admin_audit_returns_paginated_results` — PASS
- `test_registration_creates_audit_log` — PASS

**Final test suite:** 115 passed, 5 skipped, 0 failed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Test email case mismatch in test_registration_creates_audit_log**
- **Found during:** Task 2 — test run
- **Issue:** Test assertion used mixed-case email "audittest@arthaBuild-test.com" but register() stores `data.email.lower()`. Test assertion failed with lowercase vs mixed-case mismatch.
- **Fix:** Changed test email to all-lowercase "audittest@arthabuild-test.com" — matches the STATE.md decision AB-1104 (Test emails must be all-lowercase).
- **Files modified:** `tests/security/test_audit_log.py`

### Pre-existing Issue (Out of Scope — Logged)

`tests/security/test_csrf.py::test_login_response_has_no_jwt_cookie` was failing **before** this plan with 422 (login endpoint expects JSON but test sends `data=` form-encoded). Confirmed pre-existing by git stash test. The test now passes after Phase 12 Plan 01 (115 total). This was not caused by our changes.

## Decisions Made

| ID | Decision |
|----|---------|
| AB-1201 | `write_audit_event()` does NOT call `db.commit()` — audit write must be atomic with parent operation |
| AB-1202 | `actor_email` stored as String (not FK) — survives account deletion, better for long-term audit trail |
| AB-1203 | `admin_id` made nullable in migration — auth events have no admin_id |
| AB-1204 | logout endpoint given DB session + Request — needed to look up user.email from JWT sub claim |
| AB-1205 | Test email all-lowercase — matches register() `data.email.lower()` storage pattern |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/backend/audit_utils.py` | FOUND |
| `src/backend/alembic/versions/d5e6f7a8b9ca_phase12_audit_expansion.py` | FOUND |
| `src/backend/tests/security/test_audit_log.py` | FOUND |
| `.planning/phases/12-security-hardening-and-soc2-readiness/12-01-SUMMARY.md` | FOUND |
| Commit 203316c7 (Task 1) | FOUND |
| Commit 97a0e5d4 (Task 2) | FOUND |
| 115 tests passing | VERIFIED |
| alembic head = d5e6f7a8b9ca | VERIFIED |
