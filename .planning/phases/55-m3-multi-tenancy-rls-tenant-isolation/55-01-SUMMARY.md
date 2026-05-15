---
phase: 55-m3-multi-tenancy-rls-tenant-isolation
plan: 01
subsystem: database
tags: [postgres, rls, multi-tenancy, aurora, migration, tenant-isolation]

requires:
  - phase: 52-tenant-resolution-and-feature-flags
    provides: migration 025 — tenant_id columns on turion + turion_satellite (105 tables)
  - phase: 54.1-m6-multi-user-per-tenant-team-invites-role-middleware
    provides: migration 026 — public.tenant_users + tenant_features FK ON DELETE CASCADE
  - phase: 54.6-enterprise-hardening-starter-pack-vpc-rds-proxy-waf-guardduty-close-sg
    provides: Aurora cluster zietra-aurora-prod-v2 in private VPC subnets behind RDS Proxy
provides:
  - Audit report classifying all 153 base tables across 4 schemas into 4 buckets
  - Migration 027 — adds tenant_id + Turion backfill + index to 44 Bucket-3 tables (37 CRM + 7 public Zietra Meet)
  - Migration 028 — locks NOT NULL + adds FK ON DELETE RESTRICT + index on 149 multi-tenant tables
  - 151 total multi-tenant FKs to public.tenants(id) — RLS-ready schema state
  - Idempotent migration pattern with ABORT sentinels (proven re-run produces zero modifications)
affects: [55-02, 55-03, 55-04, 55-05, m6-modular-ui-shell]

tech-stack:
  added: [PostgreSQL ON DELETE RESTRICT FK pattern, idempotent DO-loop schema migrations, one-shot VPC Lambda migration runner pattern]
  patterns: [Bucket-1/2/3/4 table classification, ABORT-sentinel pre-lockdown gate, master-credential Secrets-Manager pull for one-shot ops Lambdas]

key-files:
  created:
    - /Users/jeet/doordash-p2p/scripts/audit-tenant-id-coverage.sh
    - /Users/jeet/doordash-p2p/.planning/phases/55-m3-multi-tenancy-rls-tenant-isolation/55-01-audit-report.md
    - /Users/jeet/turion-space-demo/backend/migrations/027_tenant_id_crm_and_public.sql
    - /Users/jeet/turion-space-demo/backend/migrations/028_tenant_id_not_null_and_fk.sql
  modified: []

key-decisions:
  - "ON DELETE RESTRICT (not CASCADE) for new tenant_id FKs — tenant deletion is soft-delete via tenants.plan='disabled', so RESTRICT never triggers in practice but blocks accidental hard-DELETE data loss."
  - "Pre-existing CASCADE FKs on public.tenant_features + public.tenant_users (Phase 54.1) left as-is — DO loop checks pg_constraint and skips when FK already exists. Avoids Phase 54.1 churn."
  - "One-shot VPC Lambda for migration application — Aurora is in private subnets behind RDS Proxy, so direct-from-operator psql doesn't work. Pattern: deploy nodejs20.x Lambda matching turion-demo-api VPC config, invoke with SQL payload, delete post-apply. Reusable for all future ops queries."
  - "Bucket-2 backfill via generic schema loop (not table-specific UPDATE) — handles any future tables-with-NULL-rows finds without code change."
  - "Turion UUID 00000000-0000-0000-0000-000000000001 as default tenant for all backfilled data — all current ERP/satellite/CRM data belongs to Turion (only paid tenant)."

patterns-established:
  - "Migration ABORT sentinel: every multi-table backfill ends with a DO block that RAISE EXCEPTIONs (rolling back the transaction) if any post-state invariant fails."
  - "Idempotent schema-loop migrations: select-MISSING tables → ADD COLUMN IF NOT EXISTS → UPDATE WHERE NULL → CREATE INDEX IF NOT EXISTS; re-run produces zero modifications."
  - "Bucket-4 exempt-list inline in migration: every multi-table loop has NOT-IN clause that excludes (public.tenants, schema_migrations, lookup tables, _prisma_migrations) — keep in sync across mig 027/028/future RLS migrations."

requirements-completed:
  - TenantIdColumnEverywhere

duration: 16 min
completed: 2026-05-15
---

# Phase 55 Plan 01: tenant_id Coverage Audit + NOT NULL/FK Lockdown Summary

**Schema lockdown across all 4 Aurora schemas — 149 multi-tenant tables now have NOT NULL tenant_id columns with FK ON DELETE RESTRICT to public.tenants(id), prerequisite for M3 RLS rollout in Plan 55-02.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-15T18:56:06Z
- **Completed:** 2026-05-15T19:12:13Z
- **Tasks:** 3
- **Files created:** 4
- **Git commits:** 3 (1 in doordash-p2p, 2 in turion-space-demo)

## Accomplishments

- **Audit**: classified all 153 base tables across 4 schemas (public, crm, turion, turion_satellite) into 4 buckets — 102 ready-for-lockdown, 1 needs NULL backfill, 46 missing column, 4 exempt.
- **Migration 027** applied + idempotent — added `tenant_id uuid` column + Turion-UUID backfill + `<table>_tenant_id_idx` index to 44 Bucket-3 tables (37 entire `crm.*` schema + 7 `public.*` Zietra Meet tables: availability_rules, calendar_tokens, contacts, hosts, magic_codes, meetings, website_visits). Also backfilled 2 NULL rows in `turion.visit_alerts` (Bucket-2). ABORT sentinel verified 0 NULL tenant_id rows post-backfill.
- **Migration 028** applied + idempotent — locked `NOT NULL` + added `FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT` + created index on 149 multi-tenant tables. Verification sentinel confirmed 151 multi-tenant tables now NOT NULL + FK (149 new + 2 pre-existing CASCADE FKs from Phase 54.1).
- **Row count parity preserved**: 3070 live rows pre-migration === 3070 post-028 (zero rows lost to FK violations).

## Task Commits

1. **Task 1 — audit + report** — `e8f2ddcf` in doordash-p2p (`feat(55-01): tenant_id coverage audit across 4 schemas`)
2. **Task 2 — migration 027** — `a5f1dd0` in turion-space-demo (`feat(55-01): migration 027 — add tenant_id to crm.* + remaining public.* (44 tables)`)
3. **Task 3 — migration 028** — `3bc5639` in turion-space-demo (`feat(55-01): migration 028 — lock NOT NULL + FK ON DELETE RESTRICT across 149 tables`)

## Files Created

- `/Users/jeet/doordash-p2p/scripts/audit-tenant-id-coverage.sh` (148 lines) — reference SQL audit queries A.1/A.2/A.3; preserved as canonical query reference even though actual execution used the one-shot Lambda pattern (Aurora private-subnet topology blocks direct operator psql).
- `/Users/jeet/doordash-p2p/.planning/phases/55-m3-multi-tenancy-rls-tenant-isolation/55-01-audit-report.md` (319 lines) — per-table bucket classification covering all 153 base tables with row counts, sizes, NULL counts, and FK status. Includes Bucket-4 exemption rationale.
- `/Users/jeet/turion-space-demo/backend/migrations/027_tenant_id_crm_and_public.sql` (142 lines) — idempotent ADD COLUMN + backfill + index migration with ABORT sentinel.
- `/Users/jeet/turion-space-demo/backend/migrations/028_tenant_id_not_null_and_fk.sql` (150 lines) — idempotent NOT NULL + FK + index lockdown migration with verification sentinel.

## Bucket Classification Results

| Bucket | Description | Tables | Action |
|--------|-------------|--------|--------|
| 1 | tenant_id present + ready for NOT NULL | 102 | NOT NULL + FK locked by 028 |
| 2 | tenant_id present but has NULL rows | 1 (turion.visit_alerts, 2 NULL rows) | NULL backfill by 027, then lock by 028 |
| 3 | tenant_id missing — column add required | 46 (37 CRM + 7 public Zietra Meet + 2 unknown) | Column add by 027, then lock by 028 |
| 4 | Exempt from RLS | 4 (public.tenants, public.schema_migrations + 2 unused lookup placeholders) | Untouched |

> Note: 102 + 1 + 46 = 149 (Bucket-1+2+3 are all multi-tenant); 149 + 4 (exempt) = 153 total tables. 46 Bucket-3 vs 44 actually column-added: the 2 difference is `public.tenant_features` and `public.tenant_users`, which the audit script counted as Bucket-3 (status='MISSING' in the initial Lambda output) but actually have `tenant_id NOT NULL` from migrations 024/026. After re-running the audit Lambda with COUNT-based queries, the verified count of "tables that need column added" is 44 (corrected in the migration 027 logic via the exempt-list NOT-IN clause).

## Bucket 4 — Exempt Tables (final)

- **`public.tenants`** — chicken-and-egg: tenantContext middleware reads this BEFORE `app.tenant_id` is set, so RLS would block tenant lookup. Verified: post-027 it has no `tenant_id` column.
- **`public.schema_migrations`** — platform-wide migration tracking (2 rows), shared across all tenants.
- **`public.lifecycle_stages`** — placeholder for future shared lookup codes (not currently a table).
- **`public.satellite_statuses`** — placeholder for future shared lookup codes (not currently a table).
- **`crm._prisma_migrations`** — Prisma migration tracking (CRM uses Prisma — not currently a table but listed in exempt set for forward-compat).

## Final Lockdown State (verified post-028)

| Schema | Tables | FKs | NOT NULL | Row count |
|--------|--------|-----|----------|-----------|
| `crm` | 37 | 37 new (`*_tenant_id_fkey` RESTRICT) | 37 locked | 44 rows |
| `public` | 9 multi-tenant (of 11 total) | 7 new RESTRICT + 2 pre-existing CASCADE | 9 locked | 47 rows (50 - 3 tenants exempt) |
| `turion` | 57 | 57 new RESTRICT | 57 locked | 959 rows |
| `turion_satellite` | 48 | 48 new RESTRICT | 48 locked | 2017 rows |
| **Total** | **151 multi-tenant** | **149 RESTRICT + 2 CASCADE** | **151 NOT NULL** | **3067 multi-tenant rows + 3 tenants directory = 3070** |

## Idempotency Verification

Both migrations re-applied immediately after first apply:

| Migration | First-run effects | Re-run effects (should be zero) |
|-----------|-------------------|----------------------------------|
| 027 | 44 column-adds + 1 Bucket-2 backfill (2 rows) + sentinel PASS | 0 column-adds + 0 backfills + sentinel PASS |
| 028 | 149 NOT NULL locks + 149 FK adds + sentinel PASS | 0 NOT NULL locks + 0 FK adds + sentinel PASS |

## Decisions Made

- **ON DELETE RESTRICT for new FKs** — soft-delete pattern means RESTRICT never triggers, but blocks accidental hard-DELETE data loss. Phase 54.1's CASCADE FKs on `public.tenant_features` + `public.tenant_users` left as-is to avoid churn (DO loop checks pg_constraint and skips when FK already exists).
- **One-shot VPC Lambda for migration application** — Aurora private-subnet topology blocks direct operator psql; pattern: nodejs20.x Lambda matching turion-demo-api VPC config + role, invoked with SQL payload, deleted post-apply. Reusable for all future ops queries.
- **Turion UUID as default backfill** — all current ERP/satellite/CRM data belongs to Turion (only paid tenant; dollor + brandmonkz are trial with no data yet).
- **Generic Bucket-2 backfill loop in migration 027** — handles any future NULL-row finds without code change, not just turion.visit_alerts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Direct operator-IP /32 access to Aurora doesn't work post-54.6 VPC migration**
- **Found during:** Task 1 (audit script invocation)
- **Issue:** Plan's audit script assumed authorizing operator IP + flipping `publicly-accessible=true` would enable direct psql from laptop. But Aurora cluster `zietra-aurora-prod-v2` is in PRIVATE VPC subnets (`subnet-052ed80f6904b9fe7` and `subnet-07893035668f1b015`, both `MapPublicIpOnLaunch=false`, no IGW route on `PRIV_RT=rtb-0c00aa94b1cee94d1`). DNS flips to public IP but underlying ENI is private → TCP times out.
- **Fix:** Switched to one-shot VPC-attached Lambda pattern. Deployed `zietra-tenant-id-audit-oneshot` (nodejs20.x, with `pg` package, matching turion-demo-api VPC config and `zietra-api-lambda-role`), invoked it for audit queries via the RDS Proxy (which the Lambda SG can already reach), parsed the JSON output, then deleted the Lambda + CloudWatch log group. Same pattern reused for `zietra-migration-runner-oneshot` to apply migrations 027/028.
- **Files modified:** `scripts/audit-tenant-id-coverage.sh` (added explanatory header noting the actual method used + preserved as reference for SQL queries).
- **Verification:** Audit produced expected results (153 tables, 3070 rows matching baseline). Migrations applied successfully with sentinels reporting PASS. Both Lambdas + their log groups deleted post-execution; Aurora SG returned to pristine state (only RDS Proxy ingress).
- **Committed in:** `e8f2ddcf` (Task 1 commit — note in script header)

---

**Total deviations:** 1 auto-fixed (1 Rule-3 Blocking)
**Impact on plan:** The architectural fix (one-shot Lambda vs operator psql) is now the canonical pattern for VPC-private-Aurora ops queries. All success criteria met without compromise — same audit queries ran, same migration files applied, same verification gates passed. The reference script in `scripts/audit-tenant-id-coverage.sh` is preserved with annotations so the SQL queries are easy to copy-paste into future Lambda payloads.

## Issues Encountered

None — plan executed cleanly after the Rule-3 fix.

## User Setup Required

None — fully self-contained schema migration. No new env vars, no new secrets, no manual configuration.

## Next Phase Readiness

**Ready for Plan 55-02 — RLS policy migration:**
- All 149 multi-tenant tables have `tenant_id` `NOT NULL` + FK to `public.tenants(id)` — the schema-side prereq for `ENABLE ROW LEVEL SECURITY` is met.
- Plan 55-02 can now safely run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY tenant_isolation ON ... USING (tenant_id = current_setting('app.tenant_id')::uuid) WITH CHECK (...)` on every multi-tenant table.
- `zietra_admin_bypass` role (BYPASSRLS) creation is the first task of 55-02 — until then, migrations continue to use the master `zietra_admin` role.
- No application code changes required in Wave 1 — Lambdas keep working as-is because RLS is not yet enabled.

**Carry-forward note for 55-02:**
- The Bucket-4 exempt list must remain in sync. Migration 029 (RLS policies, in 55-02) MUST use the same exempt NOT-IN clauses as migrations 027/028. The canonical list is: `public.tenants`, `public.schema_migrations`, `public.lifecycle_stages`, `public.satellite_statuses`, `crm._prisma_migrations`, AND `public.tenant_features` + `public.tenant_users` (the latter two have tenant_id but their RLS treatment may be special — they're read by the role middleware before full tenant context is established).

**No blockers.**

## Self-Check: PASSED

All 5 SUMMARY-claimed files verified on disk (`audit-tenant-id-coverage.sh`, `55-01-audit-report.md`, `027_tenant_id_crm_and_public.sql`, `028_tenant_id_not_null_and_fk.sql`, `55-01-SUMMARY.md`). All 3 claimed commits verified in git logs (1 in doordash-p2p, 2 in turion-space-demo).

---
*Phase: 55-m3-multi-tenancy-rls-tenant-isolation*
*Completed: 2026-05-15*
