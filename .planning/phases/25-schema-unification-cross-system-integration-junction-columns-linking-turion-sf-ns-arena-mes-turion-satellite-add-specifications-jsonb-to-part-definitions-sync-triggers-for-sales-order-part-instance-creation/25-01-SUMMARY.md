---
phase: 25-schema-unification
plan: 01
subsystem: database
tags: [postgres, migrations, cross-schema-fk, jsonb, audit-log, supabase, turion-satellite]

# Dependency graph
requires:
  - phase: 24-turion-satellite-make-buy-cost-module
    provides: turion_satellite.audit_log table (Phase 24 wiring), part_definitions/part_instances/vendor_orders/procurement_requests tables
provides:
  - "6 nullable TEXT FK columns on turion_satellite tables referencing turion.* (part_instances.{sales_order_id,ns_invoice_id,arena_doc_id,mes_work_order_id}, vendor_orders.ns_invoice_id, procurement_requests.sales_order_id) — all ON DELETE SET NULL"
  - "specifications JSONB NOT NULL DEFAULT '{}'::jsonb on turion_satellite.part_definitions"
  - "turion_satellite.audit_log.entity_id widened UUID -> TEXT"
  - "chk_audit_log_action expanded with 4 sync_* actions (sync_sales_order, sync_ns_invoice, sync_arena_doc, sync_mes_work_order)"
  - "Cross-schema FK enforcement live in production Supabase Postgres 17.6"
affects: [25-02-sync-endpoints, 26-data-densification, 28-ui-overhaul]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent SQL migrations using ADD COLUMN IF NOT EXISTS + drop-then-add named CONSTRAINT"
    - "Cross-schema FK with ON DELETE SET NULL (turion_satellite -> turion, never reverse)"
    - "Partial indexes (WHERE col IS NOT NULL) on nullable cross-schema FK columns to avoid wasted index space"
    - "current_database() guard at top of every migration to prevent accidental non-prod application"

key-files:
  created:
    - "/Users/jeet/turion-satellite/migrations/008_add_cross_system_fks.sql"
    - "/Users/jeet/turion-satellite/migrations/009_add_specifications_to_parts.sql"
    - "/Users/jeet/turion-satellite/migrations/010_expand_audit_log_for_sync.sql"
  modified: []

key-decisions:
  - "FK columns are TEXT (not UUID) — turion legacy id columns are TEXT (e.g., 'SO-2026-0501', 'INV-2025-04-002'). UUID would have failed the ADD CONSTRAINT step with a type-mismatch error."
  - "ON DELETE SET NULL on every cross-schema FK — legacy turion deletions zero out satellite handles but never cascade-destroy production data."
  - "Skipped GIN index on specifications JSONB in v1 — only ~80 part_definitions, no containment queries today; defer to Phase 28 if filtering is added."
  - "Widened audit_log.entity_id to TEXT (rather than adding parallel entity_text_id column) — simpler, single source of truth; backfill is a no-op because audit_log was empty in production."
  - "Expanded chk_audit_log_action in-place rather than introducing a new audit table — reuses Phase 24 infrastructure; sync events go to the same audit_log."

patterns-established:
  - "Cross-schema FK pattern: nullable TEXT column + named drop-then-add constraint + partial index + COMMENT explaining cross-schema intent"
  - "Migration verification ritual: apply -> introspect via information_schema/pg_constraint -> idempotent re-run -> live FK enforcement test (failing UPDATE)"

requirements-completed: [Linkage, Specifications]

# Metrics
duration: 4 min
completed: 2026-05-10
---

# Phase 25 Plan 01: Schema Unification Migrations Summary

**3 idempotent SQL migrations applied to production Supabase Postgres establishing cross-schema FK columns (turion_satellite -> turion), specifications JSONB on part_definitions, and audit_log expansion for sync events.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-10T21:07:59Z
- **Completed:** 2026-05-10T21:12:04Z
- **Tasks:** 4 (3 author + 1 apply/commit/push)
- **Files modified:** 3 (all created)

## Accomplishments

- 6 cross-schema TEXT FK columns wired to legacy turion tables with ON DELETE SET NULL — Phase 26 densification can now populate sales_order_id, ns_invoice_id, arena_doc_id, mes_work_order_id handles on satellite production data
- specifications JSONB NOT NULL DEFAULT '{}' available on all 80+ part_definitions — Phase 26 can seed structured spec sheets without further schema changes
- audit_log expanded to log sync events — Plan 25-02 can write `INSERT INTO turion_satellite.audit_log (entity_id, action) VALUES ('SO-2026-0501', 'sync_sales_order')` without constraint violations
- Cross-schema FK enforcement proven live — bogus UPDATE rejected with `violates foreign key constraint fk_pi_sales_order`
- All 3 migrations idempotent — second-run produced only NOTICE-level skip messages

## Task Commits

All three migrations were authored and applied together; the plan called for a single commit at Task 4 (Step 7) covering all three files:

1. **Tasks 1+2+3+4 (combined commit):** `e41c212` — `feat(phase-25-01): add cross-schema FKs, specifications JSONB, expand audit_log for sync` (turion-satellite repo, github.com/jeet-avatar/turion-satellite)
   - migrations/008_add_cross_system_fks.sql (115 lines)
   - migrations/009_add_specifications_to_parts.sql (22 lines)
   - migrations/010_expand_audit_log_for_sync.sql (45 lines)

**Plan metadata commit:** _(planning repo, this commit added below)_

## Files Created

- `/Users/jeet/turion-satellite/migrations/008_add_cross_system_fks.sql` — 6 cross-schema TEXT FK columns + 6 named ON DELETE SET NULL constraints + 6 partial indexes + 6 column comments. 9 ADD COLUMN IF NOT EXISTS (6 FK + 3 cross_links_updated_at), 6 ADD CONSTRAINT fk_pi_*/fk_vo_*/fk_pr_*, 6 REFERENCES turion.{sales_orders,invoices,arena_docs,work_orders}.
- `/Users/jeet/turion-satellite/migrations/009_add_specifications_to_parts.sql` — Single ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb on part_definitions, plus column comment pointing to spec-keys.ts convention. Deliberately no GIN index in v1.
- `/Users/jeet/turion-satellite/migrations/010_expand_audit_log_for_sync.sql` — ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT, defensive DROP CONSTRAINT IF EXISTS for both `audit_log_action_check` (Postgres-named) and `chk_audit_log_action` (manual-named), then ADD CONSTRAINT chk_audit_log_action with 9 actions (5 original + 4 sync_*).

## Files Modified

None — Phase 25 Plan 01 is migration-only. No source code changed; only schema.

## Decisions Made

- **TEXT not UUID for FK columns** — legacy `turion.{sales_orders,invoices,arena_docs,work_orders}.id` are TEXT primary keys (verified live in RESEARCH §Pitfall 1). UUID columns would have failed `ADD CONSTRAINT` with a confusing type-mismatch error.
- **ON DELETE SET NULL on every cross-schema FK** — locked by 25-CONTEXT.md. Legacy turion deletions must never cascade-destroy satellite production data.
- **Partial indexes (`WHERE col IS NOT NULL`)** — most rows will have NULL FKs (Phase 26 will populate selectively); full indexes would waste space.
- **Drop-then-add named constraint pattern** — pure ADD CONSTRAINT errors on second run. Drop-then-add (mirroring migration 004) makes migrations re-runnable.
- **No GIN index on specifications in v1** — 80 rows, zero containment queries today. Add `CREATE INDEX ... USING GIN (specifications jsonb_path_ops)` only if Phase 28 introduces filtering.
- **Widen entity_id to TEXT in-place (not parallel column)** — simpler. audit_log was empty in production so the cast is a no-op.
- **Expand audit_log action CHECK in same migration as entity_id widening** — both changes are required to log sync events; bundling them keeps Plan 25-02 unblocked.

## Deviations from Plan

None — plan executed exactly as written. Every task verified against its `<verify>` block:

- Migration 008: 9 ADD COLUMN, 6 ADD CONSTRAINT fk_, 6 REFERENCES turion., 6 partial CREATE INDEX (matches expected counts).
- Migration 009: 1 ADD COLUMN IF NOT EXISTS specifications JSONB, 1 DEFAULT '{}'::jsonb, 0 CREATE INDEX (v1 deliberately skips).
- Migration 010: 1 ALTER COLUMN entity_id TYPE TEXT, 2 DROP CONSTRAINT IF EXISTS (defensive for both possible old names), 1 ADD CONSTRAINT chk_audit_log_action with 9 actions.
- Production DB: 6 FK constraints with `ON DELETE SET NULL`, 9 new columns (6 FK + 3 cross_links_updated_at) all TEXT/timestamptz/nullable, specifications jsonb NOT NULL DEFAULT '{}', entity_id text NOT NULL.
- Idempotence: all three migrations re-ran with only NOTICE-level "already exists / does not exist, skipping" messages.
- FK enforcement: `UPDATE turion_satellite.part_instances SET sales_order_id = 'SO-DOES-NOT-EXIST'` rejected with `ERROR: insert or update on table "part_instances" violates foreign key constraint "fk_pi_sales_order"`.

**Total deviations:** 0
**Impact on plan:** None — plan was already complete and accurate.

## Authentication Gates

None — `aws secretsmanager get-secret-value` worked first try with existing AWS credentials.

## Issues Encountered

**Database URL secret format quirk (resolved automatically):** The `turion-satellite/production/database-url` secret in AWS Secrets Manager is stored as a raw string (the URL itself), not as a JSON object with a `DATABASE_URL` key. The plan's command `... | jq -r .DATABASE_URL` would have failed. Worked around by reading the secret as a raw string and stripping query params with `sed`. Did not require any plan deviation — just a different parse strategy. Documented here in case Plan 25-02 re-uses the same secret-fetch pattern.

## Verification Proof

Per CLAUDE.md Verification Protocol (mandatory):

- **Grep proof:** Migration files contain expected counts (009: 1 ADD COLUMN; 008: 6 ADD CONSTRAINT, 6 REFERENCES turion., 6 ON DELETE SET NULL on actual constraints; 010: 1 ALTER COLUMN entity_id TYPE TEXT, 2 DROP CONSTRAINT IF EXISTS).
- **Run proof (DB schema):**
  ```sql
  -- 6 FK constraints
  SELECT count(*) FROM pg_constraint WHERE conname IN
    ('fk_pi_sales_order','fk_pi_ns_invoice','fk_pi_arena_doc',
     'fk_pi_mes_work_order','fk_vo_ns_invoice','fk_pr_sales_order');
  -- => 6
  -- specifications column present
  SELECT count(*) FROM information_schema.columns
   WHERE table_schema='turion_satellite' AND table_name='part_definitions'
     AND column_name='specifications';
  -- => 1
  -- entity_id is TEXT
  SELECT data_type FROM information_schema.columns
   WHERE table_schema='turion_satellite' AND table_name='audit_log' AND column_name='entity_id';
  -- => text
  ```
- **Run proof (FK enforcement):**
  ```
  ERROR: insert or update on table "part_instances" violates foreign key constraint "fk_pi_sales_order"
  DETAIL: Key (sales_order_id)=(SO-DOES-NOT-EXIST) is not present in table "sales_orders".
  ```
- **E2E proof:** Each migration applied successfully (`psql -v ON_ERROR_STOP=1 -f ...` exit 0, no ERROR lines), then re-applied successfully (NOTICE-only skip messages on second run).

## User Setup Required

None — all changes are server-side schema. No env vars or external service configuration changed.

## Next Phase Readiness

**Plan 25-02 (sync endpoints) is unblocked:**
- `backend/src/routes/integration.ts` can write `INSERT/UPDATE` against the 6 new FK columns.
- `backend/src/lib/spec-keys.ts` can be authored; `parts.ts` GET handlers can surface `specifications` in responses.
- Audit logging on sync ops (`INSERT INTO turion_satellite.audit_log (entity_id, action) VALUES ('SO-2026-0501', 'sync_sales_order')`) will succeed without constraint violations.

**No blockers.** Production DB is in the correct shape; turion-satellite repo HEAD is `e41c212` on origin/main; cross-schema FKs are live and enforced.

---

*Phase: 25-schema-unification-cross-system-integration*
*Completed: 2026-05-10*

## Self-Check: PASSED

- SUMMARY.md exists at expected path
- migrations/008_add_cross_system_fks.sql exists
- migrations/009_add_specifications_to_parts.sql exists
- migrations/010_expand_audit_log_for_sync.sql exists
- turion-satellite commit e41c212 present in git log
- origin/main..HEAD is empty (commit pushed)
- Production schema queries return expected counts (6 FK, 1 specifications col, entity_id text, chk_audit_log_action with 9 actions)
- Cross-schema FK enforcement live (failing UPDATE confirmed)
