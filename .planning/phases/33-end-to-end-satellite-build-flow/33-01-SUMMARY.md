---
phase: 33-end-to-end-satellite-build-flow
plan: 01
subsystem: turion-satellite-db
tags: [migration, postgres, plpgsql, sales-orders, satellite-spawn]
requires: []
provides:
  - "turion_satellite.sales_orders table (UUID PK)"
  - "satellites.sales_order_id nullable FK column + partial index"
  - "turion_satellite.spawn_satellite_program(p_name,p_designation,p_sales_order_id,p_actor,p_template) plpgsql function"
affects:
  - "Phase 33-02..06 (the POST /api/satellites route + program-new.html wizard call this function)"
tech-stack:
  added: []
  patterns:
    - "Idempotent migration idiom (search_path + current_database guard + CREATE ... IF NOT EXISTS / CREATE OR REPLACE FUNCTION)"
    - "BOM clone via old->new instance id map joined on (part_definition_id, instance_index)"
key-files:
  created:
    - /Users/jeet/turion-satellite/migrations/020_add_sales_orders_and_program_seed.sql
  modified: []
decisions:
  - "Sales order lives in turion_satellite (UUID PK), not the legacy turion.sales_orders TEXT table; part_instances.sales_order_id (legacy TEXT FK) left untouched"
  - "Template = SAT-003/Cygnus read dynamically at call time (stays in sync with densification phases); p_template only accepts 'standard-bus'"
  - "spawn_satellite_program is intentionally NOT idempotent (each call = a new satellite); the migration's DDL is idempotent"
  - "part_stage_events seeded with direction='forward', status='entered' at stage code='drawing' (not 'advance'/'revert')"
  - "p_actor is coerced to a real team_members.id or NULL (actor_id FKs team_members) so an arbitrary auth UUID never breaks the FK"
metrics:
  duration: ~20m
  completed: 2026-05-12
---

# Phase 33 Plan 01: Migration 020 — sales_orders + spawn_satellite_program() Summary

Added the DB foundation for the "New satellite program" wizard: a self-contained `turion_satellite.sales_orders` table, a nullable `satellites.sales_order_id` back-link, and a `spawn_satellite_program()` plpgsql function that transactionally clones SAT-003/Cygnus's full BOM structure (261 part_instances, 241 bom_lines) onto a brand-new satellite and seeds one stage-0 (`drawing`/`forward`/`entered`) `part_stage_events` row per instance. Migration is idempotent and live on production Postgres.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Write migration 020 — sales_orders table + satellites.sales_order_id + spawn_satellite_program() | `0ba09c6` (turion-satellite) | `migrations/020_add_sales_orders_and_program_seed.sql` |
| 2 | Apply migration 020 to production + idempotency double-apply proof | (same commit — same artifact; apply is a runtime action) | — |

## Verification / Proof

**First apply (prod):**
```
SET / DO / BEGIN / CREATE TABLE / ALTER TABLE / CREATE INDEX / CREATE FUNCTION / COMMIT
```
Zero ERROR lines.

**Objects exist on prod:**
- `\d turion_satellite.sales_orders` → 9 columns (id, order_number UNIQUE, customer_name, program_name, contract_value_usd numeric(14,2), status CHECK in ('open','in_build','delivered','cancelled'), source_data jsonb, satellite_id FK→satellites ON DELETE SET NULL, created_at). Reciprocal FK `satellites.sales_order_id → sales_orders` present.
- `\df turion_satellite.spawn_satellite_program` → `(p_name text, p_designation text, p_sales_order_id uuid, p_actor uuid, p_template text DEFAULT 'standard-bus') RETURNS uuid`.
- `information_schema.columns` → `satellites.sales_order_id` uuid, nullable=YES.
- `information_schema.tables` → `turion_satellite.sales_orders` returns a row.

**Double-apply proof (second `psql -f migrations/020...`):** exit 0, output is only `NOTICE: relation "sales_orders" already exists, skipping` / `NOTICE: column "sales_order_id" ... already exists, skipping` / `NOTICE: relation "idx_satellites_sales_order" already exists, skipping` + `CREATE FUNCTION` (CREATE OR REPLACE no-op). `sales_orders` row count unchanged (0).

**Function smoke-test (run inside `BEGIN; ... ROLLBACK;` against prod — nothing persisted):**
```
spawn_satellite_program('Phase33Test','SAT-TEST-DELETEME', NULL, NULL, 'standard-bus') → 4c932785-...
new_instances=261  src_instances=261   (exact match)
new_bom=241        src_bom=241         (exact match)
new_root_lines=0   src_root_lines=0    (SAT-003 has no parent-NULL bom_line; NULL handling preserved)
new_stage_events=261
dangling bom refs (parent/child pointing outside the new satellite) = 0
stage-event breakdown: code=drawing direction=forward status=entered → 261
ROLLBACK → 0 rows persisted, leftover satellites with that designation = 0
```

## Deviations from Plan

None — plan executed as written. (The plan's two tasks operate on the same artifact: Task 1 writes the file, Task 2 applies it to prod. Committed once.)

## Notes for downstream plans

- The function takes `p_actor uuid` — pass the calling user's `team_members.id` from the future `POST /api/satellites` route; if you don't have one, pass NULL (it is coerced to NULL anyway).
- `p_designation` must be UNIQUE on `satellites.designation` — the wizard/route should compute the next free `SAT-00N` or 409 on conflict (per RESEARCH Pitfall 2). The function does not auto-generate it.
- The run-once demo spawn (for E2E walk) is deferred to the Phase 33 deploy plan (33-06), which also cleans it up.

## Self-Check: PASSED

- FOUND: `/Users/jeet/turion-satellite/migrations/020_add_sales_orders_and_program_seed.sql`
- FOUND: commit `0ba09c6` in `/Users/jeet/turion-satellite` (`git log --oneline | grep 0ba09c6`)
- VERIFIED: prod has `turion_satellite.sales_orders`, `satellites.sales_order_id`, `spawn_satellite_program()`; double-apply = clean no-op.
