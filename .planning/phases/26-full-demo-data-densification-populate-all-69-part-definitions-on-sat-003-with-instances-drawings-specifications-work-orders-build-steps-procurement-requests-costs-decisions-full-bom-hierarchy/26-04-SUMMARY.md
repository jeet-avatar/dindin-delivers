---
phase: 26-full-demo-data-densification
plan: 04
subsystem: database
tags: [postgres, sql-migration, idempotent-migration, turion-satellite, cross-system-fks, audit-log, phase-25-bridge, sat-003]

# Dependency graph
requires:
  - phase: 26-01
    provides: drawings + specifications coverage on all 80 part_definitions (when applied)
  - phase: 26-02
    provides: every part_definition has >=1 SAT-003 instance + BOM tree deepened to 156 lines (when applied)
  - phase: 26-03
    provides: 80/80 approved decisions + 29 work_orders + 26 vendor_orders + cost rollup $6.73M (when applied)
  - phase: 25-cross-system-fks
    provides: Phase 25 mig 008 added sales_order_id/ns_invoice_id/arena_doc_id/mes_work_order_id columns + Phase 25 mig 010 expanded audit_log.action enum
provides:
  - "Idempotent migration 015 (schema): chk_audit_log_action expanded to permit 'densify_seed' action; preserves all 9 existing actions verbatim"
  - "Idempotent migration 014 (data): 24 part_instances linked to turion.sales_orders, 6 vendor_orders linked to turion.invoices, 6 part_instances linked to turion.arena_docs, 5 part_instances linked to turion.work_orders — total 41 cross-system FK populations"
  - "41 audit_log seed entries with action='densify_seed' (one per linkage)"
  - "Apply order: 015 first (schema), 014 second (data) — Plan 26-05's composite apply uses 011 -> 012 -> 013 -> 015 -> 014"
  - "Schema/data separation: NO ALTER TABLE in 014; CHECK constraint expansion lives exclusively in 015"
affects:
  - 26-05-apply-migrations
  - 28-bom-tree-viewer-and-spec-panel-ui (cross-system side panel renders these FKs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema-first separation: schema migrations (015) live in their own file separate from data migrations (014); apply order documented in header comments"
    - "Per-block 'already linked' idempotency gate (SELECT COUNT(*) ... IF v_already_linked > 0 THEN CONTINUE/RETURN END IF) — guards against re-runs picking different rows when the original WHERE NULL filter shrinks the candidate pool"
    - "audit_log row inserts gated on FOUND (PL/pgSQL diagnostic) to skip ghost audit rows when UPDATE was a no-op"
    - "FK target ID discovery via JOIN against turion.* — no hardcoded legacy IDs; migration is portable across environments"
    - "Rank-pairing CTE (invoice_rank x vo_rank ON rnk=rnk) for high-value pairings without hardcoded id-to-id mapping"
    - "Subsystem rotation via CASE v_so_seq WHEN 1 THEN 'EPS' ... — deterministic ordering produces stable linkages across re-applies"
    - "Mandatory Task 0 schema introspection (psql \\d on all 7 target tables + chk_audit_log_action constraint definition) BEFORE writing any UPDATE/INSERT SQL"

key-files:
  created:
    - "/Users/jeet/turion-satellite/migrations/015_extend_audit_log_actions.sql (69 lines, 3.5 KB, schema-only, runs FIRST)"
    - "/Users/jeet/turion-satellite/migrations/014_seed_cross_system_fks.sql (325 lines, 14 KB, data-only, runs SECOND)"
  modified: []

key-decisions:
  - "Task 0 schema introspection caught 5 column-name mismatches between plan example SQL and actual schema (turion.* uses customer/total/amount/item, NOT customer_name/total_amount/customer_name/wo_number-description; arena_docs has NO title column; audit_log has payload/actor_email NOT changes/actor). All 5 documented in 014's header comment block."
  - "arena_docs has NO title column — used the 'type' column for thematic subsystem mapping ('Drawing · Thermal layout'->TCS, 'Work Instruction · RW install'->ADCS, 'Drawing · Sub-assembly GA'->STR, etc.). Pattern matching via ILIKE on type instead of plan's title."
  - "Per-block 'already linked' idempotency gate added after first dry-run pass2 doubled every count (pass1=24, pass2=48). Root cause: WHERE sales_order_id IS NULL filter shrinks the candidate pool on each run, so LIMIT 4 picks 4 DIFFERENT parts on re-run. Fix: skip whole SO/arena_doc/wo iteration if any linkage already exists. Now pass1=pass2=24/6/6/5."
  - "Block 2 (vendor_orders) uses a different idempotency strategy: skip the ENTIRE block via RAISE NOTICE if any vendor_order on SAT-003 already has ns_invoice_id set. Rank-pairing CTE would otherwise re-pair invoice rank 1 with a different VO rank 1 on re-run."
  - "audit_log INSERT has NO ON CONFLICT clause — table has no unique constraint other than id PK. Idempotency comes entirely from the UPDATE...WHERE IS NULL guards plus the FOUND gate (PL/pgSQL diagnostic) that prevents an audit row when UPDATE was a no-op."
  - "Migration 015 separated from 014 (schema vs data) so re-running 014 doesn't re-execute ALTER TABLE — and so ROLLBACK semantics inside 014 don't fight schema lock acquisition."
  - "All cross-system FK targets resolved via JOIN against turion.* tables (no hardcoded legacy IDs like 'SO-2026-0501'). Makes the migration portable across staging/prod where legacy IDs may differ."
  - "Subsystem rotation for sales_orders: SO[1]->EPS, SO[2]->STR, SO[3]->ADCS, SO[4]->PROP, SO[5]->COMM, SO[6]->PAY. Deterministic across re-applies — same SO always maps to same subsystem."
  - "Migration committed under correct git author (jm@techcloudpro.com / jeet-avatar) and pushed to origin/main. NOT YET APPLIED to prod — Plan 26-05 owns the apply step."

patterns-established:
  - "Per-loop-iteration 'already linked' gate is mandatory when ORDER BY + LIMIT + WHERE NULL produces a shrinking candidate pool — otherwise re-applies pick different rows. Note this pattern in any future seed migration that uses LIMIT in a loop."
  - "Schema migrations belong in their own file when the schema change exists to support a data change — keeps both files focused, allows separate ROLLBACK semantics, and prevents schema lock fights with data DML."
  - "audit_log inserts inside a DO loop should always be gated on FOUND (PL/pgSQL ROW_COUNT proxy) — prevents ghost audit rows when the preceding UPDATE was a no-op."

requirements-completed: ["CrossSystem"]

# Metrics
duration: 6min
completed: 2026-05-10
---

# Phase 26 Plan 04: Cross-System FK Linkage Summary

**Two new idempotent migrations (015 schema + 014 data, 394 lines total, committed at `084a06c` on `turion-satellite` `origin/main`) that bridge `turion_satellite.*` (Phase 21+ strict schema) to `turion.*` (legacy demo data). Inside the composite dry-run transaction (011 -> 012 -> 013 -> 015 -> 014), Plan 26-04 produces 24 part_instance->sales_order linkages (4 per SO × 6 SOs via subsystem rotation), 6 vendor_order->invoice linkages (rank-paired by amount/qty), 6 part_instance->arena_doc linkages (subsystem-themed via `type` pattern matching, since arena_docs has NO title column), and 5 part_instance->mes_work_order linkages (make-parts only, via item prefix matching). 41 audit_log rows with new action='densify_seed'. Zero broken FKs (every linked ID references a real row in turion.*). Pass1 = Pass2 row counts confirm idempotency. NOT YET APPLIED — Plan 26-05 owns the apply step.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-10T22:55Z
- **Completed:** 2026-05-10T23:01Z
- **Tasks:** 3 (Task 0 schema introspection + Task 1a migration 015 + Task 1 migration 014)
- **Files created:** 2 (`migrations/015_extend_audit_log_actions.sql`, `migrations/014_seed_cross_system_fks.sql`)

## Task 0 — Pre-Write Schema Introspection

Ran `psql \d` on 7 target tables + queried `chk_audit_log_action` constraint definition BEFORE writing any SQL. Snapshot saved to `/tmp/phase26-04-schema-introspection.txt` and current constraint definition saved to `/tmp/phase26-04-current-chk.txt`. Schema reference embedded in migration 014's header comment block (lines 21-37) and migration 015's header (lines 16-30).

### Schema-vs-Plan Column-Name Mismatches Caught (5 total)

| Table | Plan assumed | Actual schema | Resolution |
|-------|--------------|---------------|------------|
| `turion.sales_orders` | `customer_name`, `total_amount` | `customer`, `total` | Adapted Block 1 — no SQL change needed (we only SELECT `id`; mapping uses subsystem rotation, not customer text) |
| `turion.invoices` | `customer_name`, `amount` | `customer`, `amount` | Block 2 ORDER BY `amount` is correct; `customer_name` not used |
| `turion.arena_docs` | `doc_number`, `title` (for ILIKE pattern matching) | NO `title` column — only `id`, `type`, `source_data` | Block 3 rewritten to ILIKE-match on `type` column (e.g., 'Drawing · Thermal layout', 'Work Instruction · RW install'). Subsystem mapping table updated. |
| `turion.work_orders` | `wo_number`, `description` | `item`, `status` | Block 4 rewritten to prefix-match against `item` (e.g., 'STR-ASSY', 'EPS-HARNESS-PWR-MAIN', 'ADCS-RW-MEDIUM-A') — gives BETTER subsystem mapping than the original description-keyword approach. |
| `turion_satellite.audit_log` | columns `changes`, `actor` | columns `payload`, `actor_user_id`, `actor_email` | All audit INSERTs updated to use `payload` (jsonb) + `actor_email` (text). `actor_user_id` left NULL (no team_member to attribute seed to). |

### Discovered Legacy Turion IDs

**turion.sales_orders (6 rows):**
- `SO-2022-0998` — Internal R&D · IR&D 8210 — $1.2M, Closed
- `SO-2024-0214` — U.S. Space Force · Phase A study — $280K, Closed (led to EM-001 award)
- `SO-2026-0341` — U.S. Space Force · SSC — $6.8M, Closed (accepted)
- `SO-2026-0501` — U.S. Space Force · SSC — $47.8M, Active (in build)
- `SO-AGT-001` — CUST-USSF-001 — $2.4M, Open
- `SO-TEST-1778135982` — test row, no customer/total

**turion.invoices (9 rows, top by amount DESC):**
INV-AGT-001 (null) / INV-2025-09-006 ($12.5M Paid) / INV-2025-04-002 ($8M Paid) / INV-2026-04-014 ($6.8M Paid) / INV-2026-05-022 ($2.4M Posted) / INV-2026-04-018 ($1.9M Paid) / INV-2026-05-024 ($1.6M Draft) / INV-2026-02-012 ($1.5M Paid) / INV-2025-12-008 ($1.2M Paid)

**turion.arena_docs (12 rows):**
5318-A (Sub-assembly GA) / 5318-T (Thermal layout) / EVMS milestone tracker / REQ-001 (Torque schedule) / REQ-014 (Cleanliness) / SAT-001-GA-Rev-A.pdf (General Arrangement) / SAT-001-ICD-Rev-A.pdf (ICD) / SAT-001-MB.xlsx (Mass Budget) / SAT-001-PB.xlsx (Power Budget) / TP-003 (Mass props test) / WI-104 (ESD handling) / WI-201 (RW install)

**turion.work_orders (5 rows):**
WO-2027-001 (SAT-001-FLIGHT) / WO-2027-001-001 (STR-ASSY) / WO-2027-001-002 (EPS-HARNESS-PWR-MAIN) / WO-2027-001-003 (ADCS-RW-MEDIUM-A) / WO-2027-001-005 (EPS-ASSY)

## Subsystem-to-Sales-Order Mapping

Plan 26-04 uses deterministic subsystem rotation by SO ordinal position (ORDER BY id):

| SO seq | sales_order_id (ORDER BY id) | Subsystem | Parts linked |
|--------|------------------------------|-----------|--------------|
| 1 | SO-2022-0998 | EPS | 4 |
| 2 | SO-2024-0214 | STR | 4 |
| 3 | SO-2026-0341 | ADCS | 4 |
| 4 | SO-2026-0501 | PROP | 4 |
| 5 | SO-AGT-001 | COMM | 4 |
| 6 | SO-TEST-1778135982 | PAY | 4 |

24 total linkages (= 4 × 6 SOs, the maximum target for "3-5 per SO").

## Linkage Counts (Inside Composite Dry-Run Transaction)

Apply sequence: `BEGIN; 011 -> 012 -> 013 -> 015 -> 014; <count>; ROLLBACK;`

| Metric | Count | Plan target | Status |
|--------|-------|-------------|--------|
| part_instances with sales_order_id (SAT-003) | 24 | 15-25 | PASS |
| vendor_orders with ns_invoice_id (SAT-003) | 6 | 5-8 | PASS |
| part_instances with arena_doc_id (SAT-003) | 6 | 3-5 | EXCEEDS (acceptable — all 6 are real type-matched) |
| part_instances with mes_work_order_id (SAT-003) | 5 | 3-5 | PASS |
| audit_log rows with action='densify_seed' | 41 | ~28-40 | PASS (= 24+6+6+5) |
| broken_so_fks | 0 | 0 | PASS |
| broken_invoice_fks | 0 | 0 | PASS |
| broken_arena_fks | 0 | 0 | PASS |
| broken_mes_wo_fks | 0 | 0 | PASS |

## Idempotency Proof (Pass1 vs Pass2)

```
=== Pass 1 (014 first apply) ===
pass1_pi_so    | 24
pass1_vo_inv   |  6
pass1_pi_arena |  6
pass1_pi_mes   |  5
pass1_audit    | 41

=== Pass 2 (014 re-apply, no migrations between) ===
NOTICE:  Block 2 skipped: 6 vendor_orders already linked
pass2_pi_so    | 24   <- identical to pass1 PASS
pass2_vo_inv   |  6   <- identical to pass1 PASS
pass2_pi_arena |  6   <- identical to pass1 PASS
pass2_pi_mes   |  5   <- identical to pass1 PASS
pass2_audit    | 41   <- identical to pass1 PASS
```

The first idempotency test (before the gate fix) showed pass2 doubling every count (pass1=24, pass2=48). Root cause: `WHERE sales_order_id IS NULL` shrinks the candidate pool each run, so `LIMIT 4` picks 4 *different* parts on re-run. Fixed by adding per-iteration "already linked" gates that `CONTINUE` past any SO/arena_doc/work_order with existing linkage. Block 2's gate is a global `RETURN` since the rank-pair logic is non-iterative.

Migration 015 also verified idempotent independently (`IF NOT EXISTS LIKE '%densify_seed%'` guard prevents DROP/ADD on re-run).

## Files Created

| Path | Size | Lines | Purpose |
|------|------|-------|---------|
| `/Users/jeet/turion-satellite/migrations/015_extend_audit_log_actions.sql` | 3.5 KB | 69 | Schema migration. Adds `'densify_seed'` to `chk_audit_log_action` CHECK constraint. Preserves all 9 existing actions (5 from Phase 24 + 4 sync_* from Phase 25). Idempotency via `IF NOT EXISTS LIKE '%densify_seed%'`. Runs FIRST in Phase 26-04 apply order. |
| `/Users/jeet/turion-satellite/migrations/014_seed_cross_system_fks.sql` | 14 KB | 325 | Data migration. 4 PL/pgSQL DO blocks: Block 1 (sales_orders via subsystem rotation), Block 2 (invoices via rank-pairing), Block 3 (arena_docs via type pattern matching), Block 4 (work_orders via item prefix matching). 41 audit_log inserts. Idempotent via per-iteration "already linked" gates. Runs SECOND. |

## Apply Order (for Plan 26-05)

```
BEGIN;
\i migrations/011_densify_drawings_and_specs.sql            -- drawings + specs
\i migrations/012_densify_instances_and_bom.sql             -- part_instances + bom_lines
\i migrations/013_densify_decisions_manufacturing_procurement.sql  -- decisions + WOs + PRs + VOs + costs
\i migrations/015_extend_audit_log_actions.sql              -- audit_log CHECK constraint (schema)
\i migrations/014_seed_cross_system_fks.sql                 -- cross-system FK linkages (data)
COMMIT;
```

Note: 013 and 014 have inner `BEGIN; ... COMMIT;` wrappers that must be stripped via `sed -e '/^BEGIN;$/d' -e '/^COMMIT;$/d'` to nest inside a parent BEGIN/COMMIT — same pattern documented in Plan 26-03 SUMMARY.

## Audit Log Sample (inside dry-run transaction)

Each linkage produces one audit_log row:
```sql
INSERT INTO turion_satellite.audit_log
  (action, entity_type, entity_id, payload, actor_email, created_at)
VALUES
  ('densify_seed', 'part_instance', '<uuid>',
   jsonb_build_object('field', 'sales_order_id', 'sales_order_id', 'SO-2022-0998'),
   'phase26@turion-space.com', NOW());
```

41 rows total (24 sales_order + 6 ns_invoice + 6 arena_doc + 5 mes_work_order). actor_user_id intentionally NULL (no team_member to attribute the seed event to).

## Task Commit

| # | Description | Commit |
|---|-------------|--------|
| 0+1a+1 | Migrations 015 + 014 (both committed together) | `084a06c` on `github.com/jeet-avatar/turion-satellite` `origin/main` |

Author: `jeet-avatar <jm@techcloudpro.com>` PASS
Branch: `main` (turion-satellite — Phase 26 happens on backend repo's main, not on the GSD branch)
GSD branch: `gsd/phase-26-data-densification` (dindin repo — STATE.md + SUMMARY.md commits land here)
Push status: pushed to origin/main; `git log origin/main..HEAD --oneline | wc -l` = 0

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Schema migration 015 separated from data migration 014 | Schema and data concerns shouldn't mix — re-running data migration shouldn't re-execute ALTER TABLE, and ROLLBACK in 014 shouldn't fight schema locks. Two-file pattern is cleaner. |
| Migration 015 runs FIRST in apply order | 014 writes audit_log rows with `action='densify_seed'` which must already be permitted by the CHECK constraint. Sequence enforced by Plan 26-05's apply list. |
| FK targets resolved by JOIN against turion.* (no hardcoded IDs) | Plan example hardcoded `'SO-2026-0501'` but turion IDs may differ across environments. Discovery-by-JOIN makes the migration portable. |
| Subsystem rotation by SO ordinal (ORDER BY id LIMIT 4 per subsystem) | Deterministic ordering produces stable linkages across re-applies. Same SO always maps to same subsystem. |
| Block 3 (arena_docs) uses `type` column instead of `title` | arena_docs has NO title column (Task 0 finding). The `type` column (e.g., 'Drawing · Thermal layout') is actually MORE specific than a hypothetical title — ILIKE pattern matching is robust. |
| Block 4 (work_orders) uses `item` prefix matching | item carries the part_number prefix (STR-/EPS-/ADCS-) which directly maps to subsystem. Cleaner than fuzzy description matching. |
| Make-parts only for Block 4 (`pd.default_make_buy = 'make'`) | MES work_orders represent in-house manufacturing. Pairing buy-only parts to MES WOs would be semantically wrong. |
| Per-iteration "already linked" idempotency gate (not per-row) | Per-row WHERE NULL guard alone doesn't prevent re-runs from picking different rows. Per-SO/per-arena_doc/per-wo gate (skip whole iteration if any linkage exists) does. Critical fix found via pass1/pass2 dry-run. |
| Block 2 uses RETURN (not CONTINUE) on already-linked | Block 2's rank-pairing logic is non-iterative (one CTE → loop) — a single "skip block entirely" gate is cleaner than per-pair gates. |
| audit_log INSERT gated on FOUND | PL/pgSQL ROW_COUNT proxy. If UPDATE didn't fire (e.g., no rows matched), we skip the audit row. Prevents ghost audit rows on re-runs even when our outer gates would skip the LOOP. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan example assumed `customer_name` + `total_amount` on turion.sales_orders; actual columns are `customer` + `total`**
- **Found during:** Task 0 (schema introspection)
- **Issue:** Plan's ORDER-BY hint and customer-text matching would have failed.
- **Fix:** SELECT only `id` from sales_orders; subsystem mapping uses ordinal rotation, not customer text.
- **Files modified:** `migrations/014_seed_cross_system_fks.sql` Block 1 header comment + SELECT clause.
- **Committed in:** `084a06c`

**2. [Rule 1 - Bug] Plan example assumed `customer_name` on turion.invoices; actual column is `customer`**
- **Found during:** Task 0
- **Issue:** Plan's example hint referenced `customer_name`. Block 2 doesn't actually need customer text (rank by amount only), but the header comment was misleading.
- **Fix:** Updated header comment + ORDER BY uses `amount DESC` only.
- **Committed in:** `084a06c`

**3. [Rule 1 - Bug] turion.arena_docs has NO `title` column — plan's `ad.title ~* 'solar|power'` ILIKE pattern would have failed at parse time**
- **Found during:** Task 0
- **Issue:** Plan's Block 3 SQL used `WHERE ad.title ~* 'solar|power|eps' THEN 'EPS' ...`. The arena_docs table only has columns `id`, `type`, `source_data`, `created_at`, `updated_at`.
- **Fix:** Rewrote Block 3 to ILIKE-match on `type` column. Pattern map: `'thermal'`->TCS, `'RW'|'reaction'`->ADCS, `'bus integ'|'sub-assembly'|'GA'|'torque'`->STR, `'mass'`->STR, `'power'`->EPS, `'cleanliness'|'ESD'`->PAY, `'ICD'|'EVMS'`->CDH, fallback STR. Yields 6 thematic linkages.
- **Files modified:** `migrations/014_seed_cross_system_fks.sql` Block 3 entirely.
- **Committed in:** `084a06c`

**4. [Rule 1 - Bug] Plan example assumed `wo_number` + `description` on turion.work_orders; actual columns are `item` + `status`**
- **Found during:** Task 0
- **Issue:** Plan's Block 4 referenced these non-existent columns.
- **Fix:** Block 4 uses `item ILIKE 'STR%' THEN 'STR' ...` prefix matching against the 8 subsystem codes (STR/EPS/ADCS/PROP/COMM/PAY/TCS/CDH) plus a `SAT%` -> STR rule for bus-level WOs.
- **Files modified:** `migrations/014_seed_cross_system_fks.sql` Block 4 entirely.
- **Committed in:** `084a06c`

**5. [Rule 1 - Bug] turion_satellite.audit_log has `payload` + `actor_email` (NOT `changes` + `actor` as plan example assumed)**
- **Found during:** Task 0
- **Issue:** Plan's example INSERT used `changes jsonb_build_object(...)` and `actor 'phase26@turion-space.com'`. Real columns are `payload jsonb`, `actor_user_id uuid`, `actor_email text`.
- **Fix:** All 4 audit INSERTs use `payload` + `actor_email`. actor_user_id left NULL.
- **Committed in:** `084a06c`

**6. [Rule 2 - Missing Critical] audit_log has NO unique constraint other than id PK — plan's `ON CONFLICT DO NOTHING` clauses had no target**
- **Found during:** Task 0 (audit_log `\d` output showed only `audit_log_pkey` and one non-unique index)
- **Issue:** `INSERT ... ON CONFLICT DO NOTHING` requires a target constraint. With only id PK (always gen_random_uuid()), there's nothing to conflict on.
- **Fix:** Removed all `ON CONFLICT DO NOTHING` clauses. Idempotency now comes from (a) the per-iteration "already linked" gates which prevent re-entering the LOOP, and (b) the `IF FOUND THEN INSERT` guard which skips audit rows when UPDATE was a no-op.
- **Committed in:** `084a06c`

**7. [Rule 1 - Bug] Initial idempotency dry-run showed pass2 doubling every count (24->48, 6->12, 6->12, 5->10, 41->82)**
- **Found during:** Task 1 verification (pass1/pass2 dry-run check)
- **Issue:** Each block's `WHERE <fk_col> IS NULL` guard correctly prevented re-update of already-linked rows, BUT the surrounding `LIMIT 4` LOOP picked the NEXT 4 unlinked rows on re-run. Result: each SO accumulated 4 new linkages per pass.
- **Fix:** Added per-iteration "already linked" gate in Blocks 1, 3, 4 (`SELECT COUNT(*) ... IF v_already_linked > 0 THEN CONTINUE END IF`). Block 2 gets a global block-level RETURN gate (rank-pair logic is non-iterative). After fix: pass1 = pass2 exactly.
- **Files modified:** `migrations/014_seed_cross_system_fks.sql` all 4 DO blocks.
- **Committed in:** `084a06c`

---

**Total deviations:** 7 auto-fixed (6 × Rule 1 - Bugs from plan/schema mismatches caught by Task 0; 1 × Rule 2 - Missing Critical for the ON CONFLICT removal). Plus 1 critical idempotency bug caught at validation time (the 7th item above, technically a Rule 1 fix found via dry-run rather than introspection).

**Impact on plan:** No scope creep. All 7 fixes were necessary because (a) the plan author had not introspected turion.* legacy tables before writing example SQL — Task 0 was specifically designed to catch this and did; and (b) the idempotency design required a stronger gate than the original `WHERE IS NULL` filter to handle a shrinking candidate pool. Migration delivers exactly what the plan's success criteria demand: 24 sales_order + 6 invoice + 6 arena + 5 mes_wo linkages, zero broken FKs, audit trail seeded, idempotent.

## Issues Encountered

- **Idempotency bug at first dry-run (pass2 doubled counts):** Root cause was a shrinking-candidate-pool issue — `WHERE IS NULL` + `LIMIT 4` LOOP picks 4 new parts each run. Fixed by adding per-iteration gates. Caught at validation time, not in production. Pattern lesson now documented under `patterns-established`.
- **arena_docs `type` ILIKE matching robustness:** The actual `type` values are messier than expected ('Drawing · Thermal layout', 'Work Instruction · RW install', 'Live spreadsheet · EVMS'). Pattern mapping handles the 12 real rows correctly but is fragile if turion seeds new arena_docs with novel type strings. Acceptable for demo seed; production sync (Phase 25's `/api/integration/sync-arena-doc`) should not rely on this pattern.
- **DATABASE_URL format trap:** AWS Secrets Manager stores the URL as `postgresql://...?schema=turion_satellite&pgbouncer=true&connection_limit=1`. psql rejects the `schema=` query parameter with "invalid URI query parameter". Stripped via `sed 's/?.*$//'` to get a clean psql-compatible URL. Plan 26-05's apply automation must do the same.

## Change Request Ticket

`ADMIN_SECRET_KEY` for the dollor admin portal is not available in the executor's environment (same as 26-01/02/03). Per the `ticketed-task` SKILL.md fallback rule: "If the key is not available, log a warning and continue — don't block the task." This SUMMARY serves as the audit-trail record. Phase 26-05 (deploy phase) will create the CR ticket when migrations are actually applied to prod.

## User Setup Required

None — this plan only generates and commits the SQL artifacts. Plan 26-05 (when it runs) will apply migrations 011, 012, 013, 015, 014 in a single atomic transaction against prod Supabase using credentials already in AWS Secrets Manager (`turion-satellite/production/database-url`).

## Next Phase Readiness

- **Plan 26-05 (apply migrations)** should apply 011 → 012 → 013 → 015 → 014 in the order specified above, inside one composite BEGIN/COMMIT, stripping inner BEGIN/COMMIT from 013 and 014 via sed. Apply automation must also strip `?schema=...&pgbouncer=...&connection_limit=...` query params from the AWS Secrets DATABASE_URL before passing to psql.
- Post-apply expected SAT-003 cross-system state: 24 part_instances with sales_order_id, 6 vendor_orders with ns_invoice_id, 6 part_instances with arena_doc_id, 5 part_instances with mes_work_order_id. Plus 41 new audit_log rows with action='densify_seed'. All inside the single composite transaction.
- **Phase 28 (UI bridge)** can now wire cross-system side panels reading `pi.sales_order_id JOIN turion.sales_orders` etc. The data bridge is complete after 26-05.

## Self-Check

Verified before STATE.md update:

```
FOUND: /Users/jeet/turion-satellite/migrations/015_extend_audit_log_actions.sql (3.5 KB, 69 lines)
FOUND: /Users/jeet/turion-satellite/migrations/014_seed_cross_system_fks.sql (14 KB, 325 lines)
FOUND: git commit 084a06c on origin/main (turion-satellite) — author jm@techcloudpro.com / jeet-avatar
FOUND: 0 unpushed commits (origin/main..HEAD count = 0)
FOUND: Migration 015 idempotent — second apply in same transaction produced identical constraint definition (no DROP/ADD)
FOUND: Migration 014 idempotent — pass1 = pass2 row counts (24/6/6/5/41) confirmed
FOUND: Inside composite dry-run (011+012+013+015+014): 24 pi-so + 6 vo-inv + 6 pi-arena + 5 pi-mes + 41 audit_densify
FOUND: Zero broken FKs (all 4 broken_*_fks counts = 0; the Phase 25 FK constraints would have prevented invalid UPDATEs)
FOUND: SCHEMA INTROSPECTION SNAPSHOT comment block in both migration headers
FOUND: 4 per-iteration "already linked" idempotency gates (1 per Block); plus 1 global gate in Block 2; plus 1 IF NOT EXISTS gate in migration 015
FOUND: Audit log INSERT pattern uses payload (NOT changes) + actor_email (NOT actor) — schema mismatch from plan caught
```

## Self-Check: PASSED

---
*Phase: 26-full-demo-data-densification*
*Plan: 04*
*Completed: 2026-05-10*
