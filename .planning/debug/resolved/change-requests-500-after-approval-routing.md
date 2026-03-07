---
status: resolved
trigger: "/api/admin/change-requests/ returning 500 after quick-118 enterprise approval routing deployment"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T03:05:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: Local simulation of production scenario (table without column + migration)
expecting: N/A — fix verified
next_action: Deploy to staging/production

## Symptoms

expected: GET /api/admin/change-requests/ returns 200 with list of change requests
actual: Returns 500 error on both staging and production
errors: psycopg2.errors.UndefinedColumn: column change_requests.custom_fields_json does not exist
reproduction: curl -H "Authorization: Bearer <admin_jwt>" https://api.dollor.ai/api/admin/change-requests/
started: After quick-118 deployed (quick-119 deploy)

## Eliminated

- hypothesis: New tables (approval_steps, approval_chain_rules, approval_delegations) don't exist
  evidence: create_all(checkfirst=True) creates new tables fine. The error is about a missing COLUMN on an existing table.
  timestamp: 2026-03-07T02:55:00Z

- hypothesis: Relationship or import error
  evidence: Local SQLite test shows all models load and query correctly with fresh DB
  timestamp: 2026-03-07T02:55:00Z

## Evidence

- timestamp: 2026-03-07T02:52:00Z
  checked: Local SQLite test — create tables + list query
  found: Works fine with fresh DB (all 66 tables created, list returns empty [])
  implication: Schema is valid; issue is missing column on existing production table

- timestamp: 2026-03-07T02:54:00Z
  checked: Staging endpoint via Python urllib
  found: GET /api/admin/change-requests/ returns HTTP 500
  implication: Confirmed staging is broken too

- timestamp: 2026-03-07T02:55:00Z
  checked: Production endpoint via Python urllib
  found: GET /api/admin/change-requests/ returns HTTP 500
  implication: Both environments affected

- timestamp: 2026-03-07T02:57:00Z
  checked: CloudWatch logs /ecs/dollor-api after triggering 500
  found: "psycopg2.errors.UndefinedColumn: column change_requests.custom_fields_json does not exist"
  implication: ROOT CAUSE CONFIRMED

- timestamp: 2026-03-07T02:58:00Z
  checked: git diff 91bd91c6..7204643a for ChangeRequest model changes
  found: Only new column on change_requests table is custom_fields_json (Text, nullable=True)
  implication: Single column migration needed

- timestamp: 2026-03-07T03:03:00Z
  checked: Local simulation — table without column + migration on import
  found: Migration adds column successfully, query works with existing data
  implication: Fix verified locally

- timestamp: 2026-03-07T03:05:00Z
  checked: Full test suite (43 passed, 5 skipped, 1 pre-existing error)
  found: No regressions from the migration code
  implication: Safe to deploy

## Resolution

root_cause: quick-118 added `custom_fields_json = Column(Text, nullable=True)` to the ChangeRequest SQLAlchemy model, but `Base.metadata.create_all(checkfirst=True)` only creates NEW tables — it does NOT add new columns to existing tables. The production/staging `change_requests` table was created before quick-118, so the column is missing. Every query on ChangeRequest fails because SQLAlchemy generates SELECT with all model columns including the missing one.
fix: Added column migration block in change_management.py (after create_all) that inspects existing columns and runs ALTER TABLE ADD COLUMN for any missing ones. Uses IF NOT EXISTS on PostgreSQL for safety.
verification: Simulated production scenario locally (created table without column, ran migration, verified query works with existing data). Full test suite passes with no regressions.
files_changed:
- apps/web/p2p-platform/backend/change_management.py
