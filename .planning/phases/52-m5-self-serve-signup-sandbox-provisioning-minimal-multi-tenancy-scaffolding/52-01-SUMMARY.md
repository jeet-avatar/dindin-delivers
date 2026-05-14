---
phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding
plan: 01
subsystem: database

tags: [postgres, supabase, multi-tenancy, migrations, tenants, tenant_features, sql, idempotent]

# Dependency graph
requires:
  - phase: 41-m1-supabase-auth-to-cognito-migration
    provides: Cognito user pool us-east-1_KQuNS85nP with verified anchor user jm@techcloudpro.com (sub 74989438-80d1-7095-47b2-27cf67f2e686) used as owner_cognito_sub for Turion seed
  - phase: 37-qb-to-netsuite-migration-walkthrough
    provides: Migration numbering pattern (prior migration 023-qb-ramp.sql) and direct-port-5432 connection pattern
provides:
  - public.tenants table (UUID PK, slug UNIQUE 3-32 chars, name, owner_cognito_sub, plan, created_at, trial_ends_at)
  - public.tenant_features table (composite PK tenant_id+module_code, 13-value module_code CHECK, FK ON DELETE CASCADE)
  - tenant_id UUID NULL column on all 105 turion.*/turion_satellite.* tables with B-tree index per table
  - Turion seed tenant row id=00000000-0000-0000-0000-000000000001 plan=paid
  - 13 default-on tenant_features rows for Turion
  - Backfill of every existing row in all 105 tables to Turion's UUID (0 NULLs remaining)
affects:
  - 52-02 (signup endpoint — needs tenants/tenant_features tables to exist)
  - 53-* (subdomain routing — needs per-row tenant_id for query filtering)
  - M3 (RLS — will SET NOT NULL on tenant_id and add FK to public.tenants)
  - M4 (Stripe — will flip tenant_features enabled flags per paid plan)

# Tech tracking
tech-stack:
  added:
    - PostgreSQL pgcrypto extension (gen_random_uuid)
  patterns:
    - "DO-LOOP over information_schema.tables for schema-wide ALTER/UPDATE/CREATE INDEX (idempotent via IF NOT EXISTS / WHERE IS NULL guards)"
    - "Fixed UUID 00000000-0000-0000-0000-000000000001 for anchor-tenant seed row (predictable, FK-stable, M3-compatible)"
    - "psql variable substitution :'cognito_sub' for runtime owner_cognito_sub resolution (no hardcoded user IDs in migration files)"
    - "Direct connection port 5432 (NOT pgbouncer 6543) for long DO-LOOPs — Pitfall 7 of 52-RESEARCH.md"

key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/migrations/024_tenants_and_features.sql
    - /Users/jeet/turion-space-demo/backend/migrations/025_tenant_id_columns_and_turion_seed.sql
  modified: []

key-decisions:
  - "Turion seed tenant_id fixed at 00000000-0000-0000-0000-000000000001 (per CONTEXT.md LOCKED DECISIONS) — predictable for FK + backfill ordering"
  - "All 13 modules ON for Turion (paid plan, not trial) — matches CONTEXT.md Turion's tenant row decision"
  - "tenant_id column left NULLABLE with no FK in M5 — M3 (RLS phase) owns SET NOT NULL + FK rollout (Step 6 deferred)"
  - "owner_cognito_sub passed via psql -v cognito_sub variable, NOT hardcoded — Rule 1 (no hardcoded DB-derivable values)"
  - "Idempotency via IF NOT EXISTS (DDL), ON CONFLICT DO UPDATE (seed row), ON CONFLICT DO NOTHING (features), WHERE IS NULL (backfill)"
  - "Direct connection port 5432 enforced via comment header on both migration files — protects against future operator using pgbouncer 6543 (which would kill long DO-LOOPs)"

patterns-established:
  - "Pattern: schema-wide tenant_id rollout via DO-LOOP over information_schema.tables filtered by table_schema IN (...) — reusable for any future multi-schema column add"
  - "Pattern: 3-pass idempotent migration (seed → ALTER → backfill → index) where each pass uses an appropriate idempotency guard"
  - "Pattern: psql variable :'<name>' for shell-injected secrets that must NOT live in the migration file"

requirements-completed: [TenantsTable, TenantFeaturesTable, MinimalTenantIdBackfill]

# Metrics
duration: 2 min
completed: 2026-05-14
---

# Phase 52 Plan 1: Multi-tenancy DB Scaffolding Summary

**Tenants + tenant_features tables created, tenant_id column added to all 105 turion+turion_satellite tables and backfilled to Turion's anchor UUID via DO-LOOP — fully idempotent on Supabase Postgres.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-14T17:55:16Z
- **Completed:** 2026-05-14T17:57:19Z
- **Tasks:** 3
- **Files modified:** 2 (both new)

## Accomplishments

- Created `public.tenants` table with locked schema (UUID PK, slug UNIQUE w/ 3-32 char regex, name, owner_cognito_sub, plan CHECK trial/paid/disabled, created_at, trial_ends_at default now+30d) + 2 B-tree indexes
- Created `public.tenant_features` table with composite PK (tenant_id, module_code), 13-value module_code CHECK, FK ON DELETE CASCADE to tenants
- Seeded Turion anchor tenant: `id=00000000-0000-0000-0000-000000000001`, `slug=turion`, `name=Turion Space`, `owner_cognito_sub=74989438-80d1-7095-47b2-27cf67f2e686` (jm@techcloudpro.com's Cognito sub), `plan=paid`
- Seeded 13 default-on tenant_features rows for Turion: crm, sales, purchase, items, plm, mes, quality, lean-erp-pro, asc606, royalty, dropship, ai-agents, qb-migration (all `enabled=true`)
- Added `tenant_id UUID NULL` column to **all 105** `turion.*` (57 tables) + `turion_satellite.*` (48 tables) tables via DO-LOOP over `information_schema.tables`
- Backfilled `tenant_id` to Turion's UUID on every row in all 105 tables — verified DO-block confirms **0 NULLs remaining**
- Created B-tree index on `tenant_id` for all 105 tables (named `<table>_tenant_id_idx`)
- Idempotency proven: re-applied both migrations — produced "already exists, skipping" NOTICEs only, zero CREATE/INSERT side effects, counts unchanged

## Task Commits

Each task was committed atomically and pushed to `github.com/jeet-avatar/turion-space-demo` main:

1. **Task 1: Write migration 024 — tenants + tenant_features tables** — `e097194` (feat)
2. **Task 2: Write migration 025 — Turion seed + tenant_id columns + backfill + indexes** — `299f1a4` (feat)
3. **Task 3: Apply both migrations to live Supabase + verify counts** — no code (DB-only changes; verified live counts)

## Live DB Verification

### Cognito sub resolution
```
$ aws cognito-idp admin-get-user --user-pool-id us-east-1_KQuNS85nP --username jm@techcloudpro.com --query 'UserAttributes[?Name==`sub`].Value' --output text
74989438-80d1-7095-47b2-27cf67f2e686
```

### Migration 024 apply
```
CREATE EXTENSION
CREATE TABLE          (public.tenants)
CREATE INDEX          (tenants_owner_cognito_sub_idx)
CREATE INDEX          (tenants_plan_idx)
CREATE TABLE          (public.tenant_features)
```

### Migration 025 apply
```
INSERT 0 1            (Turion seed row → public.tenants)
INSERT 0 13           (13 Turion tenant_features rows)
DO                    (105 ADD COLUMN IF NOT EXISTS tenant_id)
DO                    (105 UPDATE ... SET tenant_id WHERE IS NULL)
DO                    (105 CREATE INDEX IF NOT EXISTS ... ON ... (tenant_id))
```

### Count verification (post-apply)
```
tenants                      | 1
tenant_features              | 13
turion_tables_with_tenant_id | 105
```

### NULL-row sweep across all 105 tables
```
NOTICE:  rows with tenant_id IS NULL across 105 tables: 0
```

### Turion row contents
```sql
SELECT slug, plan, owner_cognito_sub FROM public.tenants WHERE id='00000000-0000-0000-0000-000000000001';
-- turion|paid|74989438-80d1-7095-47b2-27cf67f2e686
```

### 13 Turion module_codes (alphabetical, all hyphens preserved)
```
ai-agents
asc606
crm
dropship
items
lean-erp-pro
mes
plm
purchase
qb-migration
quality
royalty
sales
```

### Idempotency proof (re-apply pass)
- 024 re-apply: every CREATE TABLE/INDEX returned NOTICE "already exists, skipping"
- 025 re-apply: `INSERT 0 1` (ON CONFLICT DO UPDATE refresh — same row), `INSERT 0 0` (all 13 features ON CONFLICT DO NOTHING), all column-adds and indexes "already exists, skipping"
- Post-reapply counts: `tenants=1, tenant_features=13, tenant_id_cols=105` (unchanged)

## Decisions Made

None - followed plan exactly as specified. All schema decisions were already LOCKED in CONTEXT.md.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migrations apply directly via psql with operator credentials already known.

## Next Phase Readiness

- **Ready for Plan 52-02:** Backend signup endpoint (`POST /api/tenants/signup`) — the `public.tenants` and `public.tenant_features` tables exist with locked schemas; signup INSERT can reference them. `gen_random_uuid()` available for new tenant IDs.
- **Ready for Phase 53 (subdomain routing):** Every row in every turion+turion_satellite table has `tenant_id` set, so a tenant-aware query filter can be added at the router or DAL level without backfill ordering concerns.
- **Deferred to M3 (RLS phase):** `tenant_id` is currently NULLABLE with no FK to `public.tenants(id)`. M3 will SET NOT NULL and add the FK as part of the RLS rollout. This is intentional per CONTEXT.md Rule 6 (no premature RLS).
- **Deferred to M4 (Stripe):** All 13 modules currently `enabled=true` for Turion (and will be for every signup until M4 flips this to base-only + paid add-ons).

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/backend/migrations/024_tenants_and_features.sql` exists (1678 bytes)
- File `/Users/jeet/turion-space-demo/backend/migrations/025_tenant_id_columns_and_turion_seed.sql` exists (3266 bytes)
- Commits `e097194` + `299f1a4` exist on turion-space-demo main (pushed to github.com/jeet-avatar/turion-space-demo)
- Live DB confirms `tenants=1, tenant_features=13, tenant_id_cols=105, NULL-rows=0`
- Idempotency proven by clean re-apply

---
*Phase: 52-m5-self-serve-signup-sandbox-provisioning-minimal-multi-tenancy-scaffolding*
*Completed: 2026-05-14*
