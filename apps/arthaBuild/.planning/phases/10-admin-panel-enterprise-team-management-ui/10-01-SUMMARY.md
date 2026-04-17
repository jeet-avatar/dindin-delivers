---
phase: 10-admin-panel-enterprise-team-management-ui
plan: "01"
subsystem: backend
tags: [admin, audit-log, system-config, rbac, alembic, sqlalchemy]
dependency_graph:
  requires: [09-03]
  provides: [AuditLog model, SystemConfig model, admin stats endpoint, admin users endpoint, role-change endpoint, user-delete endpoint, audit endpoint, config endpoint, license endpoint, teams endpoint]
  affects: [routers/admin.py, models.py, arthaBuild.db]
tech_stack:
  added: []
  patterns: [_write_audit helper, soft-delete pattern (is_active=False + team_id=None), upsert pattern (select then create-or-update)]
key_files:
  created:
    - src/backend/alembic/versions/b3c4d5e6f7a8_phase10_audit_config.py
  modified:
    - src/backend/models.py
    - src/backend/routers/admin.py
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - AB-1001: AuditLog written before commit — _write_audit() adds row to session, caller commits. Non-transactional (if commit fails, audit row is also rolled back — atomicity preserved).
  - AB-1002: SystemConfig uses key as primary key (not id) — config is keyed by name, not row order. Upsert = select + update-or-add pattern (no ON CONFLICT needed for SQLite via SQLAlchemy).
  - AB-1003: GET /api/admin/users delegates to admin_list_team_members() — identical response shape to /api/admin/team. No code duplication.
  - AB-1004: GET /api/admin/license wraps validate_license() in try/except — returns {valid:False, error:str} on exception rather than 500 (non-fatal license check).
metrics:
  duration: "6 minutes"
  completed: "2026-04-10"
  tasks_completed: 2
  files_modified: 5
---

# Phase 10 Plan 01: Admin Backend — AuditLog + SystemConfig + 8 New Endpoints Summary

**One-liner:** AuditLog + SystemConfig SQLAlchemy models with Alembic migration, plus 8 new admin endpoints (CASE-173 to CASE-180) with shared _write_audit() helper.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add AuditLog and SystemConfig models + Alembic migration | b7b9f5c6 | models.py, b3c4d5e6f7a8_phase10_audit_config.py |
| 2 | Implement 8 new admin endpoints in routers/admin.py | 8cb56a78 | routers/admin.py |

## What Was Built

### New Database Models (models.py)

**AuditLog** (`audit_logs` table):
- `id`, `admin_id` (FK users), `action` (role_changed/user_removed/team_created/config_updated), `target_user_id` (FK users nullable), `detail` (JSON string), `created_at`

**SystemConfig** (`system_config` table):
- `key` (PK string), `value` (string), `updated_at`, `updated_by` (FK users nullable)

### Alembic Migration

`b3c4d5e6f7a8` — down_revision: `a2b3c4d5e6f7` — creates both new tables via plain `op.create_table()` (no batch_alter needed — new tables only).

### 8 New Admin Endpoints

| Method | Path | CASE | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/stats` | CASE-173 | Team-scoped usage stats |
| GET | `/api/admin/users` | CASE-174 | Team member list (alias for /api/admin/team) |
| PATCH | `/api/admin/users/{id}/role` | CASE-175 | Role change + audit log |
| DELETE | `/api/admin/users/{id}` | CASE-176 | Soft-delete + audit log |
| GET | `/api/admin/audit` | CASE-177 | 50 most recent audit entries |
| PUT | `/api/admin/config` | CASE-178 | Upsert SystemConfig |
| GET | `/api/admin/license` | CASE-179 | License status via validate_license() |
| POST | `/api/admin/teams` | CASE-180 | Create team, assign admin if teamless |

### _write_audit() Helper

Private async function shared by PATCH role, DELETE user, PUT config, and POST teams. Adds AuditLog to the DB session — caller always commits after.

## Verification

- [x] `alembic current` shows `b3c4d5e6f7a8 (head)`
- [x] `audit_logs` table in DB: columns [id, admin_id, action, target_user_id, detail, created_at]
- [x] `system_config` table in DB: columns [key, value, updated_at, updated_by]
- [x] `from models import AuditLog, SystemConfig` — imports correctly
- [x] All 8 new route paths registered in router.routes
- [x] All 4 Phase 9 endpoints untouched (GET /api/admin/team, GET /api/admin/chats, POST /api/admin/team/invite, DELETE /api/admin/team/{user_id})
- [x] 85/85 pytest pass — no regressions

## Decisions Made

- **AB-1001:** _write_audit() is non-transactional within the session — if the caller's commit fails, the audit row is also rolled back (atomicity preserved by design).
- **AB-1002:** SystemConfig key as primary key (not surrogate id) — config is keyed by semantic name. SQLAlchemy upsert via select-then-add-or-update pattern (no raw ON CONFLICT SQL needed).
- **AB-1003:** GET /api/admin/users delegates directly to `admin_list_team_members()` — no code duplication, identical response shape to /api/admin/team.
- **AB-1004:** GET /api/admin/license wraps validate_license() in try/except returning {valid: False, error} — license check is non-fatal, admin panel should not 500 on license server outage.

## Deviations from Plan

None — plan executed exactly as written.

## Architecture Updates

- ARCHITECTURE.md: Version 1.9 → 2.0, sections 11.4 (new DB tables) and 11.5 (new endpoints) added, changelog entry added.
- architecture-diagram.html: Version badge updated to v2.0, v2.0 changelog entry added.
- test-report.html: 8 new acceptance test rows (TC-ADM-01 through TC-ADM-08), total check count updated to 113.

## Self-Check

### Files created/modified:

- [x] `src/backend/models.py` — AuditLog + SystemConfig classes appended
- [x] `src/backend/alembic/versions/b3c4d5e6f7a8_phase10_audit_config.py` — migration file exists
- [x] `src/backend/routers/admin.py` — 8 new endpoints + _write_audit helper

### Commits verified:

- [x] b7b9f5c6 — Task 1 (models + migration)
- [x] 8cb56a78 — Task 2 (8 admin endpoints)

## Self-Check: PASSED
