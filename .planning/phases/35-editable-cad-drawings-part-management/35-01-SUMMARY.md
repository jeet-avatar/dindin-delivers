---
phase: 35-editable-cad-drawings-part-management
plan: 01
subsystem: turion-satellite (backend + migrations)
tags: [cad, migration, generator-port, foundation]
requires: [migration-021-audit-log-actions]
provides:
  - part_definitions.drawing_rev + part_definitions.retired_at columns (prod)
  - turion_satellite.part_revisions table (prod, append-only drawing history)
  - widened audit_log.action CHECK (6 new Phase-35 actions)
  - backend/src/cad-templates/* — generateDrawingSvg(part) ships in the Lambda image
affects: [35-02, 35-03, 35-05]
tech-stack:
  added: []
  patterns: [idempotent-migration, pure-template-functions, byte-equality-self-test]
key-files:
  created:
    - /Users/jeet/turion-satellite/migrations/022_part_revisions_and_retire.sql
    - /Users/jeet/turion-satellite/backend/src/cad-templates/index.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/primitives.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/palettes.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/assembly.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/subassembly.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/cylindrical.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/lens-optical.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/antenna-dish.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/solar-cell.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/fastener.ts
    - /Users/jeet/turion-satellite/backend/src/cad-templates/plate.ts
    - /Users/jeet/turion-satellite/backend/tests/cad-generator.test.ts
  modified: []
decisions:
  - "backend tsconfig is module:commonjs — copied scripts/cad-templates/*.ts verbatim but stripped the .js ESM import specifiers (bare ./foo)"
  - "scripts/generate-cad-svgs.ts left untouched — it still owns the one-time migration-017 backfill + uniqueness/determinism gates; only the pure dispatch + 10 template fns are mirrored into backend/src/"
  - "byte-equality self-test parses migration 017 at runtime (extracts the $svg$…$svg$ literal for ADCS-ASSY / ADCS-MAGTORQ-A) rather than pinning an inline literal"
  - "AWS secret id is turion-satellite/production/database-url (plain connection string, not JSON; no -NCbgX6 suffix) — the plan's id was stale"
metrics:
  duration: ~25min
  tasks: 3
  files: 13
  completed: 2026-05-12
---

# Phase 35 Plan 01: CAD-editing foundation (migration 022 + generator port) Summary

Laid the Phase-35 root: migration 022 (drawing_rev / retired_at / part_revisions / widened audit CHECK) applied to prod, and the Phase-27 SVG generator ported into the Lambda-compiled `backend/src/cad-templates/` tree as a pure `generateDrawingSvg(part)`, with a byte-equality self-test proving it reproduces migration-017 drawings exactly.

## What shipped

### Task 1 — migration 022 (commit `23388b4`)
`migrations/022_part_revisions_and_retire.sql` — modeled on migration 021 (idempotent idiom: `SET search_path TO turion_satellite, public;` + `current_database() NOT IN ('postgres')` guard + `BEGIN; … COMMIT;`):
- `ALTER TABLE part_definitions ADD COLUMN IF NOT EXISTS drawing_rev int NOT NULL DEFAULT 1` (DEFAULT 1 covers all existing rows — no backfill).
- `ADD COLUMN IF NOT EXISTS retired_at timestamptz` + `CREATE INDEX IF NOT EXISTS idx_part_definitions_retired_at`.
- `CREATE TABLE IF NOT EXISTS turion_satellite.part_revisions (id uuid PK gen_random_uuid(), part_def_id uuid NOT NULL REFERENCES part_definitions(id) ON DELETE CASCADE, rev int NOT NULL, drawing_svg text NOT NULL, edited_by uuid, edited_at timestamptz NOT NULL DEFAULT now(), UNIQUE(part_def_id, rev))` + `idx_part_revisions_part_def_id`. Lazily populated by the routes in 35-02 — no rows seeded.
- Widened `audit_log.action` CHECK: dropped `audit_log_action_check` + `chk_audit_log_action` (IF EXISTS), re-added `chk_audit_log_action` with the migration-021 action list verbatim + `'create_part_definition','edit_part_definition','retire_part_definition','restore_part_definition','edit_part_drawing','delete_bom_line'`.

Applied to prod (`aws-1-us-east-2.pooler.supabase.com:6543/postgres`, secret `turion-satellite/production/database-url`, `?schema=…` suffix stripped): first apply → `SET / DO / BEGIN / ALTER×2 / CREATE INDEX / CREATE TABLE / CREATE INDEX / ALTER×3 / COMMENT / COMMIT`, 0 ERRORs (one expected NOTICE: `audit_log_action_check` doesn't exist → skipped). Second apply → identical, 0 ERRORs, all "already exists, skipping" NOTICEs. `\d turion_satellite.part_definitions` shows `drawing_rev integer not null default 1` + `retired_at timestamp with time zone`; `\d turion_satellite.part_revisions` shows the 6-col table + PK + UNIQUE(part_def_id,rev) + FK ON DELETE CASCADE + the two indexes.

### Task 2 — port the Phase-27 generator into backend/src/cad-templates/ (commit `1757de7`)
- Copied the 10 PURE template files (`primitives.ts`, `palettes.ts`, `assembly.ts`, `subassembly.ts`, `cylindrical.ts`, `lens-optical.ts`, `antenna-dish.ts`, `solar-cell.ts`, `fastener.ts`, `plate.ts`) from `scripts/cad-templates/` into `backend/src/cad-templates/`, rewriting only the `'./primitives.js'` / `'./palettes.js'` ESM specifiers to bare `'./primitives'` / `'./palettes'` to match `backend/tsconfig.json`'s `module: commonjs`. No DB / `fs` / clock / RNG dependency in any of them.
- New `backend/src/cad-templates/index.ts`: `chooseTemplate(part)` copied verbatim from `scripts/generate-cad-svgs.ts` (incl. the W5 comment — SOLAR-* tested before the `-PANEL-` plate rule), plus `generateDrawingSvg(part: {part_number, subsystem_code?, specifications?}): string` — coerces `subsystem_code: null` → `undefined`, dispatches, invokes the matched template, validates `<svg…</svg>`, returns the string. Re-exports `makePrefix` / `normalizeDims`.
- `scripts/generate-cad-svgs.ts` and `scripts/cad-templates/*` left untouched (the migration-017 backfill is not re-run; the uniqueness/determinism gates stay there).
- `cd backend && npm run build` → clean; `dist/cad-templates/` has `index.js` + 10 template `.js` files (ships in the `npm ci --omit=dev` Lambda image). `npx tsc --noEmit` → clean.

### Task 3 — byte-equality + dispatch + determinism test (commit `469bda7`)
`backend/tests/cad-generator.test.ts` (vitest, 14 cases):
- Byte-equality: a `migration017Svg(partNumber)` helper reads `migrations/017_redraw_cad_phase27.sql` at test time, splits on `UPDATE turion_satellite.part_definitions`, finds the block whose `WHERE part_number = $svg$…$svg$` matches, extracts the `SET drawing_svg = $svg$…$svg$` literal. Asserts `generateDrawingSvg({part_number:'ADCS-ASSY', subsystem_code:'ADCS', specifications:<prod JSONB>})` `.toBe(...)` that literal — and the same for `ADCS-MAGTORQ-A` (cylindrical template). Both pass → the port reproduces migration-017 output byte-for-byte.
- Dispatch: 10 `chooseTemplate({part_number}).name` assertions across all 8 families, incl. the W5 cases (`EPS-SOLAR-PANEL-A` / `EPS-SOLAR-CELL-A` → `solar`, not `plate`).
- Determinism: two `generateDrawingSvg` calls with identical input are byte-identical; output is a well-formed `viewBox="0 0 60 60"` SVG.

`cd backend && npx vitest run tests/cad-generator.test.ts` → 14/14 pass. Full suite `npx vitest run` → **368 passed | 1 skipped** (the 1 skip pre-existing; no regressions). The two prod values for ADCS-ASSY / ADCS-MAGTORQ-A `specifications` were read from `turion_satellite.part_definitions JOIN subsystems` and hard-coded into the test (the same inputs the generator fed the template when it wrote migration 017).

## Deviations from Plan

**1. [Rule 3 — blocking] AWS secret id was stale.** The plan/critical-context said `turion-satellite/production/database-url-NCbgX6` and a JSON payload `{"DATABASE_URL": "..."}`. The actual secret is named `turion-satellite/production/database-url` (no random suffix — `list-secrets` confirms) and stores a **plain connection string**, not JSON. Used `aws secretsmanager get-secret-value --secret-id turion-satellite/production/database-url --query SecretString --output text | sed 's/?.*//'` to strip the `?schema=turion_satellite&pgbouncer=true&connection_limit=1` suffix. No code/migration impact — just the lookup command.

**2. [in-plan, noted]** Migration 022's `BEGIN/COMMIT` commits to prod even when run inside an idempotency check — that's fine for an idempotent migration (per the critical context). Double-apply proven clean.

Otherwise the plan executed as written. No bugs, no auth gates, no architectural changes, no fix-attempt retries.

## NOT done (owned by other plans)
- `git push` + `./build-and-push.sh` Lambda redeploy — owned by 35-07. The migration 022 is already live on prod, but the new `backend/src/cad-templates/` code is committed-only (not in the deployed Lambda image yet).
- The CRUD/edit/retire routes that populate `part_revisions` and bump `drawing_rev` — 35-02.

## Self-Check: PASSED
- `migrations/022_part_revisions_and_retire.sql` — FOUND
- `backend/src/cad-templates/index.ts` + 10 template files — FOUND; `dist/cad-templates/index.js` + 10 `.js` — FOUND
- `backend/tests/cad-generator.test.ts` — FOUND; 14/14 pass; full suite 368 pass / 1 skip
- commits `23388b4`, `1757de7`, `469bda7` — FOUND on turion-satellite main (`jeet-avatar <jm@techcloudpro.com>`)
- prod: `\d turion_satellite.part_definitions` shows drawing_rev + retired_at; `\d turion_satellite.part_revisions` exists — VERIFIED
