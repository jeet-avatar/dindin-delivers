---
phase: 14-compliance-data
plan: 01
subsystem: backend-compliance
tags: [gdpr, soc2, audit-chain, data-export, data-erasure, csv-export]
dependency_graph:
  requires: [phase-12-audit-logs, phase-13-identity-access]
  provides: [gdpr-export-endpoint, gdpr-erase-endpoint, audit-hash-chain, admin-csv-export, soc2-evidence-generator]
  affects: [audit_utils.py, models.py, routers/admin.py, rawapi.py]
tech_stack:
  added: [hashlib (stdlib), csv (stdlib), io (stdlib)]
  patterns: [sha256-hash-chain, streaming-response, gdpr-anonymisation, soc2-evidence-cli]
key_files:
  created:
    - src/backend/routers/compliance.py
    - src/backend/alembic/versions/14a_audit_hash_chain.py
    - src/backend/scripts/generate_soc2_evidence.py
    - docs/soc2-evidence/CC6.1-access-control.md
    - docs/soc2-evidence/CC6.2-least-privilege.md
    - docs/soc2-evidence/CC7.2-audit-log-sample.md
    - docs/soc2-evidence/CC9.2-incident-response.md
    - docs/soc2-evidence/A1.2-backup-schedule.md
  modified:
    - src/backend/models.py
    - src/backend/audit_utils.py
    - src/backend/routers/admin.py
    - src/backend/rawapi.py
    - docs/ARCHITECTURE.md
    - docs/architecture-diagram.html
    - docs/test-report.html
decisions:
  - "AB-1401: erased_at added to User model (same Alembic migration as audit chain — one migration per phase boundary)"
  - "AB-1402: GDPR erase hard-deletes ChatMessages first, then ChatSessions (foreign key order) — no ORM cascade relies on session-level lazy loading"
  - "AB-1403: write_audit_event() fetches prev row_hash via SELECT MAX(id) before insert — no locking needed (SQLite single-writer guarantees sequential row IDs)"
  - "AB-1404: SOC2 evidence generator uses f-string with {{}} escaping for markdown table cell values containing {braces} — avoids Python NameError"
  - "AB-1405: audit/export endpoint added before /users/{id}/send-reset in admin.py to keep route specificity correct (FastAPI matches /audit/export before /audit)"
metrics:
  duration_minutes: 10
  tasks_completed: 2
  files_created: 11
  files_modified: 7
  tests_added: 20
  tests_passing: 138
  completed_date: "2026-04-13"
---

# Phase 14 Plan 01: Compliance & Data Governance Summary

GDPR data rights (export + erasure) + immutable SOC2 audit hash chain + admin CSV export + 5-file SOC2 evidence package generator.

## What Was Built

### Task 1: GDPR Export/Erase Endpoints + Audit Hash Chain

**1. AuditLog model** (`src/backend/models.py`): Added `prev_hash` (String, nullable) and `row_hash` (String, nullable) columns for tamper-evident chain.

**2. User model** (`src/backend/models.py`): Added `erased_at` (DateTime, nullable) column set during GDPR erasure.

**3. Alembic migration** (`14a_audit_hash_chain.py`): Adds prev_hash + row_hash to `audit_logs`, erased_at to `users` using `batch_alter_table` (SQLite mandatory). Chains from `13a_identity_access`.

**4. `write_audit_event()` upgraded** (`audit_utils.py`): Before each insert, SELECTs the last `row_hash` as `prev_hash`, then computes `row_hash = sha256(f"{prev_hash or ''}|{action}|{actor_email}|{created_at.isoformat()}".encode())`. Both values stored on the new row.

**5. GDPR compliance router** (`routers/compliance.py`, prefix `/api/user`):
- `POST /export-data` — requires valid user JWT, queries User + ChatSessions + ChatMessages + AuditLog (actor_email match), serializes to JSON, returns as `StreamingResponse` with `Content-Disposition: attachment; filename="data-export-{user_id}.json"`
- `POST /erase` — captures original email, hard-deletes ChatMessages + ChatSessions, anonymises User fields (email → `erased-{id}@deleted.local`, name → "Deleted User", password_hash → unusable `!sha256(...)`), sets is_active=False + erased_at=now(), writes `user.data_erased` audit event, commits atomically.

**6. Router registered** in `rawapi.py` under Phase 14 comment block.

### Task 2: Audit CSV Export + SOC2 Evidence Generator

**7. `GET /api/admin/audit/export`** added to `routers/admin.py`:
- Admin JWT required
- Accepts `?start=ISO8601&end=ISO8601` query params for date-range filtering
- Returns `StreamingResponse` with `media_type="text/csv"`, `Content-Disposition: attachment; filename="audit-export-{date}.csv"`
- Columns: `id, created_at, actor_email, actor_role, action, result, ip_address, prev_hash, row_hash`

**8. SOC2 evidence generator** (`src/backend/scripts/generate_soc2_evidence.py`):
- Standalone CLI: `python3 generate_soc2_evidence.py --db-path /path/to/arthaBuild.db --out-dir docs/soc2-evidence/`
- Produces 5 control files:
  - `CC6.1-access-control.md` — RBAC roles, auth endpoints, MFA policy, session controls
  - `CC6.2-least-privilege.md` — all 15 admin-only endpoints with require_admin() guard listed
  - `CC7.2-audit-log-sample.md` — last 50 audit events from live DB (13 rows from arthaBuild.db), hash chain explanation
  - `CC9.2-incident-response.md` — inlines docs/security/INCIDENT_RESPONSE.md content (or fallback summary)
  - `A1.2-backup-schedule.md` — reads OPS_BACKUP_S3_BUCKET env, documents RTO/RPO targets, recovery procedure

## Test Results

138/138 pytest tests pass (excluding 4 pre-existing failures unchanged since Phase 13):
- `test_nginx_dev_conf_unchanged` — nginx.conf has HTTPS redirect (was modified in Phase 8.1 for staging)
- `test_alembic_current_shows_head` — subprocess CWD issue (pre-existing)
- 2 Ollama chatbot tests — Ollama not running in test environment (pre-existing)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] f-string variable collision in SOC2 generator**
- **Found during:** Task 2 (first run of generate_soc2_evidence.py)
- **Issue:** `gen_cc62_least_privilege()` used f-string with `{user_id}` in markdown table cells — Python interpreted as variable reference, raised `NameError: name 'user_id' is not defined`
- **Fix:** Escaped all URL path parameters with `{{` and `}}` (e.g., `/api/admin/team/{{user_id}}`)
- **Files modified:** `src/backend/scripts/generate_soc2_evidence.py`
- **Commit:** included in Task 2 commit `808ad18f`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | c9b8fb1b | feat(phase-14-01): GDPR export/erase endpoints + audit hash chain |
| Task 2 | 808ad18f | feat(phase-14-01): audit CSV export endpoint + SOC2 evidence generator |

## Self-Check: PASSED

All required files verified present:
- `src/backend/routers/compliance.py` — FOUND
- `src/backend/alembic/versions/14a_audit_hash_chain.py` — FOUND
- `src/backend/scripts/generate_soc2_evidence.py` — FOUND
- `docs/soc2-evidence/CC6.1-access-control.md` — FOUND
- `docs/soc2-evidence/CC6.2-least-privilege.md` — FOUND
- `docs/soc2-evidence/CC7.2-audit-log-sample.md` — FOUND
- `docs/soc2-evidence/CC9.2-incident-response.md` — FOUND
- `docs/soc2-evidence/A1.2-backup-schedule.md` — FOUND

All commits verified in git log.
