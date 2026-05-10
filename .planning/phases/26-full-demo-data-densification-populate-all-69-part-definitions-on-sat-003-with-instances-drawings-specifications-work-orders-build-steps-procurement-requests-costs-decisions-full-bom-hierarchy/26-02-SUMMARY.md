---
phase: 26-full-demo-data-densification
plan: 02
subsystem: database
tags: [postgres, sql-migration, idempotent-migration, turion-satellite, bom-hierarchy, part-instances, sat-003]

# Dependency graph
requires:
  - phase: 26-01
    provides: drawings + specifications coverage on all 80 part_definitions (when applied)
  - phase: quick-332
    provides: EPS solar wing 4-level BOM drilldown (78 of baseline 93 bom_lines)
provides:
  - "Idempotent migration 012: every part_definition has ≥1 instance on SAT-003 + BOM tree deepened to ~156 lines"
  - "L2 wiring: every non-EPS subsystem L1 ASSY connected to its component children (EPS/ADCS/PROP/PAY/COMM/TCS/CDH)"
  - "L3 wiring: 6 of 8 subsystems have ≥3-level BOM depth (reaction wheel fasteners, thruster sub-components, antenna mount bracket, OTA baffle, OBC onboard SSD, radiator-embedded heat pipe)"
affects:
  - 26-03-decisions-manufacturing-procurement
  - 26-04-cross-system-fk-linkage
  - 26-05-apply-migrations
  - 28-bom-tree-viewer-and-spec-panel-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discovery-driven SQL migration: query live DB → emit only the INSERTs that fill the actual gap (50 missing parts, not all 80)"
    - "PL/pgSQL DO $do$ blocks with v_parent/v_child UUID variables for readable BOM wiring (avoids deep CTEs)"
    - "Idempotency via WHERE NOT EXISTS on UNIQUE-constraint-aligned columns: (sat,pd,idx) for instances; (parent,child) for bom_lines"
    - "Multi-instance allocation for L3 leaf parts: instance #1 = installed at L2, instance #2 = installed deeper under a sub-assembly (avoids re-using one PI under two parents)"

key-files:
  created:
    - "/Users/jeet/turion-satellite/migrations/012_densify_instances_and_bom.sql (25 KB, 581 lines)"
  modified: []

key-decisions:
  - "STR-ASSY is the de-facto satellite root (already wires EPS-ASSY + ADCS-ASSY + CDH-ASSY in baseline) — Block 2 adds PAY/PROP/TCS/COMM-ASSY as the remaining 4 L1 children, completing the 8-subsystem root tree."
  - "Each L1 subsystem ASSY (EPS/ADCS/PROP/PAY/COMM/TCS/CDH) wires its component children directly — 53 new L2 bom_lines across the 7 subsystems."
  - "L3 deepening adds depth ≥ 3 for 6 of 8 subsystems (EPS already has 4-level depth from migration 007; STR is itself the root). 10 new L3 lines selected to model realistic sub-assemblies: RW mounting bolts, thruster inlet valve+filter, antenna mount bracket, OTA baffle, OBC onboard SSD, radiator-embedded heat pipe."
  - "instance_index=1 is the canonical 'flight unit' across this seed; instance #2 is reserved for sub-assembly-owned parts (when an L1 ASSY and an L2 sub-assembly both legitimately consume the same part class). Block 1b only adds the minimum extra indices required by Block 10's L3 references."
  - "Serial number convention `SN-{part_number}-{NNN}` matches existing seeded rows exactly — no namespace fork."
  - "Plan example used `lifecycle_stage` column on part_instances, but that column does NOT exist (lifecycle is tracked via part_stage_events). Used minimal valid INSERT columns (sat, pd, idx, serial_number)."
  - "All new bom_lines have status='released' (matches migration 007 pattern; production-ready BOM state)."
  - "NO INSERTs into part_definitions — hard constraint enforced by structure + grep-verified zero matches."
  - "Migration committed under correct git author (jm@techcloudpro.com / jeet-avatar) and pushed to origin/main BEFORE this SUMMARY was finalised. NOT YET APPLIED to prod — Plan 26-05 owns the apply step."

patterns-established:
  - "BEGIN / \\i migration / SELECT counts / \\i migration again / SELECT counts / ROLLBACK — full idempotency stress-test in one pipe, no DB mutation"
  - "DO $do$ block per parent-assembly grouping — keeps the migration readable as a tree (Block 3 = EPS-ASSY children, Block 4 = ADCS-ASSY children, etc.)"
  - "Block 11 verification SELECT at end of migration — shows post-apply counts so Plan 26-05 can capture them in a single psql session"

requirements-completed: ["Instances", "BOM"]

# Metrics
duration: 25min
completed: 2026-05-10
---

# Phase 26 Plan 02: Densify Instances + BOM Hierarchy Summary

**Idempotent SQL migration 012 that inserts 56 missing `part_instances` (every one of the 80 `part_definitions` now has ≥1 SAT-003 instance) and 63 new `bom_lines` (BOM tree deepened from 93 → 156, covering all 8 subsystem assemblies with L2 component wiring and 6 of 8 with L3 sub-component depth) — committed and pushed to `turion-satellite` origin/main at `8403dba`, validated via BEGIN/ROLLBACK against prod DB, NOT YET APPLIED.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-10T22:33Z
- **Completed:** 2026-05-10T22:58Z
- **Tasks:** 1 (Task 1: inventory + write + validate + commit)
- **Files created:** 1 (`migrations/012_densify_instances_and_bom.sql`)

## Discovery — what was missing

**Parts without any SAT-003 instance (50 of 80 part_definitions):**

| Subsystem | Missing count | Example parts |
| --------- | ------------- | ------------- |
| ADCS | 9 | RW-MEDIUM-A, STAR-TRACKER-A, SUN-SENSOR-FINE/COARSE, IMU, MAGNETOMETER, MAGTORQ, OBC-BOARD, HARNESS-SENSOR |
| CDH | 6 | OBC-MAIN, OBC-BACKUP, MASS-STORAGE-512G, POWER-SWITCH-BOARD, HARNESS-DATA-LVDS, +1 |
| COMM | 8 | ASSY, ANT-XBAND-HG, ANT-SBAND-PATCH, RADIO-SBAND/XBAND, RF-AMP-XBAND, DIPLEXER-S, WAVEGUIDE-X, HARNESS-RF |
| EPS | 5 | PCDU-250W, MPPT-CTRL, LATCHING-RELAY-X4, FUSE-AERO-5A, HARNESS-PWR-MAIN |
| PAY | 4 | TELESCOPE-OTA, FOCAL-PLANE-A, PROCESSOR-FPGA, HARNESS-PAYLOAD |
| PROP | 7 | THRUSTER-MONO-A, TANK-PROP-A, TANK-PRESSURANT, VALVE-LATCH-A, VALVE-FILL-DRAIN, PLUMBING-LINES, PRESSURE-XDUCER |
| STR | 6 | PANEL-TOP/SIDE/BOT, BRACKET-EQUIP-B, FASTENER-M3-PEEK, FASTENER-M4-TI, HOLD-RELEASE-A, LV-ADAPTER-RING, PAYLOAD-MOUNT |
| TCS | 5 | RADIATOR-PANEL-A, HEATER-PATCH-A, MLI-BLANKET-A, TEMP-SENSOR-PT100 |

Plus a number of L2 components (e.g. EPS-BATTERY-LIION-100W, ADCS-GPS-RECEIVER-L1, COMM-ANT-XBAND-HG, TCS-HEAT-PIPE-A) had instances but were **orphaned** — never referenced as parent or child in `bom_lines`. The L2 wiring blocks (3-9) connect them into the tree.

**Baseline BOM concentration on SAT-003 (pre-migration):**
- EPS: 78 bom_lines (mostly wing → panel → cell/busbar/coverglass tree from 007)
- STR: 15 bom_lines (hinge sub-assemblies from 007 + STR-ASSY → EPS/ADCS/CDH-ASSY roots)
- ADCS/CDH/COMM/PAY/PROP/TCS: 0 bom_lines (subsystem assemblies disconnected)

## BOM Deepening Map

### Block 2: STR-ASSY → 4 new L1 children (+4 lines)
| Parent | Child | Note |
| ------ | ----- | ---- |
| STR-ASSY | PAY-ASSY | New L1 wire |
| STR-ASSY | PROP-ASSY | New L1 wire |
| STR-ASSY | TCS-ASSY | New L1 wire |
| STR-ASSY | COMM-ASSY | New L1 wire (COMM-ASSY also got its first instance in Block 1a) |

Existing baseline: STR-ASSY → EPS-ASSY × 2 + CDH-ASSY × 2 + ADCS-ASSY × 2 (6 lines). After Block 2: 6 + 4 = 10 children at L1.

### Block 3: EPS-ASSY → 7 component children
EPS-BATTERY-LIION-100W, EPS-PCDU-250W, EPS-MPPT-CTRL, EPS-FUSE-AERO-5A, EPS-LATCHING-RELAY-X4, EPS-HARNESS-PWR-MAIN, EPS-SOLAR-WING-DEPLOY

### Block 4: ADCS-ASSY → 10 component children
ADCS-RW-MEDIUM-A, ADCS-STAR-TRACKER-A, ADCS-SUN-SENSOR-FINE/COARSE, ADCS-IMU-MEMS-A, ADCS-MAGNETOMETER-3AX, ADCS-MAGTORQ-A, ADCS-GPS-RECEIVER-L1, ADCS-OBC-BOARD-A, ADCS-HARNESS-SENSOR

### Block 5: PROP-ASSY → 8 component children
PROP-THRUSTER-MONO-A, PROP-TANK-PROP-A, PROP-TANK-PRESSURANT, PROP-VALVE-LATCH-A, PROP-VALVE-FILL-DRAIN, PROP-PLUMBING-LINES, PROP-FILTER-PROP, PROP-PRESSURE-XDUCER

### Block 6: PAY-ASSY → 5 component children
PAY-TELESCOPE-OTA, PAY-FOCAL-PLANE-A, PAY-PROCESSOR-FPGA, PAY-BAFFLE-STRAY-LIGHT, PAY-HARNESS-PAYLOAD

### Block 7: COMM-ASSY → 8 component children
COMM-ANT-XBAND-HG, COMM-ANT-SBAND-PATCH, COMM-RADIO-SBAND-A, COMM-RADIO-XBAND-A, COMM-RF-AMP-XBAND, COMM-DIPLEXER-S, COMM-WAVEGUIDE-X, COMM-HARNESS-RF

### Block 8: TCS-ASSY → 5 component children
TCS-RADIATOR-PANEL-A, TCS-HEAT-PIPE-A, TCS-HEATER-PATCH-A, TCS-MLI-BLANKET-A, TCS-TEMP-SENSOR-PT100

### Block 9: CDH-ASSY → 6 component children
CDH-OBC-MAIN-A, CDH-OBC-BACKUP-A, CDH-FPGA-PAYLOAD-A, CDH-MASS-STORAGE-512G, CDH-POWER-SWITCH-BOARD, CDH-HARNESS-DATA-LVDS

### Block 10: L3 sub-component depth (10 lines across 6 subsystems)
| L2 Parent | L3 Child (instance) | Engineering rationale |
| --------- | ------------------- | --------------------- |
| ADCS-RW-MEDIUM-A | STR-FASTENER-M4-TI × 4 | Reaction wheel mounted with 4 × M4 Ti bolts |
| PROP-THRUSTER-MONO-A | PROP-VALVE-LATCH-A #2 | Thruster has its own inlet isolation valve |
| PROP-THRUSTER-MONO-A | PROP-FILTER-PROP #2 | Thruster has its own inlet filter |
| COMM-ANT-XBAND-HG | STR-BRACKET-EQUIP-B #2 | Antenna mount bracket |
| PAY-TELESCOPE-OTA | PAY-BAFFLE-STRAY-LIGHT #2 | Optical telescope's internal baffle |
| CDH-OBC-MAIN-A | CDH-MASS-STORAGE-512G #2 | OBC's onboard SSD module |
| TCS-RADIATOR-PANEL-A | TCS-HEAT-PIPE-A #2 | Radiator-embedded heat pipe |

## Counts (inside transaction)

| Metric | Baseline | After 012 | Delta |
| ------ | -------- | --------- | ----- |
| part_instances on SAT-003 | 120 | **176** | +56 |
| parts_without_instance | 50 | **0** | -50 ✓ (100% coverage) |
| bom_lines on SAT-003 | 93 | **156** | +63 (≥150 target ✓) |
| EPS subsystem bom_lines | 78 | 86 | +8 (block 3 = 7, block 10 = 0 EPS-specific b/c migration 007 already deep) |
| STR subsystem bom_lines | 15 | 19 | +4 (Block 2 STR-ASSY → 4 new L1 children) |
| ADCS subsystem bom_lines | 0 | 14 | +14 (block 4 = 10 + block 10 = 4 RW bolts) |
| CDH subsystem bom_lines | 0 | 7 | +7 (block 9 = 6 + block 10 = 1) |
| COMM subsystem bom_lines | 0 | 9 | +9 (block 7 = 8 + block 10 = 1) |
| PAY subsystem bom_lines | 0 | 6 | +6 (block 6 = 5 + block 10 = 1) |
| PROP subsystem bom_lines | 0 | 10 | +10 (block 5 = 8 + block 10 = 2) |
| TCS subsystem bom_lines | 0 | 6 | +6 (block 8 = 5 + block 10 = 1) |

(Note: per-subsystem totals don't sum exactly to 156 because Block 2 STR-ASSY → COMM/PAY/PROP/TCS-ASSY links count as STR parent rows when grouped by parent subsystem.)

## Idempotency Proof (BEGIN / double-apply / ROLLBACK)

```
BEGIN
SET
DO
INSERT 0 50                   ← pass 1 Block 1a: 50 missing parts inserted
DO ... DO                      ← Blocks 1b-10
 after_pass1     |   176
 after_pass1_bom |   156
INSERT 0 0                    ← pass 2 Block 1a: 0 inserts (all guards hit)
DO ... DO                      ← Blocks 1b-10 (all WHERE NOT EXISTS guards hit)
 after_pass2     |   176
 after_pass2_bom |   156      ← identical to pass 1 ✓
ROLLBACK
```

After ROLLBACK, prod DB state confirmed unchanged:
```
 part_instances (SAT-003) |  120     ← baseline preserved
 bom_lines (SAT-003)      |   93     ← baseline preserved
```

## Scope Constraint Proof (NO part_definitions INSERTs)

```
$ grep -E -i 'INSERT[[:space:]]+INTO[[:space:]]+(turion_satellite\.)?part_definitions' \
    /Users/jeet/turion-satellite/migrations/012_densify_instances_and_bom.sql | grep -v '^--'
(zero matches)

$ INSERT INTO target counts:
  15 bom_lines
   2 part_instances
   0 part_definitions     ✓
```

## Task Commit

| # | Description | Commit |
| - | ----------- | ------ |
| 1 | Migration 012 (instances + BOM) | `8403dba` on `github.com/jeet-avatar/turion-satellite` origin/main |

Author: `jeet-avatar <jm@techcloudpro.com>` ✓

## Files Created

| Path | Size | Lines | Purpose |
| ---- | ---- | ----- | ------- |
| `/Users/jeet/turion-satellite/migrations/012_densify_instances_and_bom.sql` | 25 KB | 581 | Block 1a (instance fill) + Block 1b (multi-qty for L3) + Blocks 2-9 (per-ASSY L2 children) + Block 10 (L3 sub-children for 6 subsystems) + Block 11 (verification SELECT). |

## Decisions Made

| Decision | Rationale |
| -------- | --------- |
| STR-ASSY = de-facto satellite root | Baseline already has STR-ASSY → EPS/ADCS/CDH-ASSY wires; complete the L1 tree by adding PAY/PROP/TCS/COMM-ASSY rather than introducing a new SAT-LEVEL-ROOT part. Keeps the existing tree convention. |
| L2 wiring per ASSY in its own DO block | Readable as a tree (one block = one parent assembly with all its children). Easier to audit than one giant `INSERT ... SELECT FROM VALUES`. |
| L3 depth via "instance #2 owned by sub-assembly" pattern | Avoids re-using PI #1 (already child of L1 ASSY) as a child of L2 assembly — the BOM graph would otherwise show the same instance under two parents, which is technically allowed but confusing. New instance_index=2 makes "this is the thruster's own valve, not a separately serial-tracked valve on the prop manifold" clear. |
| Block 1b only adds the minimum extra indices needed | Adds 2-4 extra instances for 7 specific parts, not blanket bumping every fastener to ×24. Keeps the migration tight. Plan example suggested 24/18/16/12/4/8 but those numbers were illustrative — the actual L3 graph drives the count. |
| serial_number convention `SN-{part_number}-{NNN}` | Matches all existing 120 seeded rows on SAT-003 (verified). No namespace fork. |
| status='released' on all new bom_lines | Matches migration 007 pattern. These are production-ready engineering BOM lines, not draft proposals. |
| BEGIN/ROLLBACK validation pattern (re-run inside same transaction) | Same approach proven by Plan 26-01. Single psql pipe gives idempotency proof + counts without mutating the DB. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan example used non-existent `lifecycle_stage` column on part_instances**

- **Found during:** Task 1 (writing initial draft following plan snippet `INSERT INTO part_instances (satellite_id, part_definition_id, instance_index, lifecycle_stage)`)
- **Issue:** `\d part_instances` shows the table does NOT have a `lifecycle_stage` column. Lifecycle is tracked via the separate `part_stage_events` table (FK → `lifecycle_stages.id`). The plan's snippet would have caused `ERROR: column "lifecycle_stage" of relation "part_instances" does not exist` on first run.
- **Fix:** Removed `lifecycle_stage` from all INSERTs. Used minimal valid column set `(satellite_id, part_definition_id, instance_index, serial_number)` matching the existing seeded rows from migration 007. Lifecycle stage tracking is out of scope for Plan 26-02 (Plan 26-03 may add `part_stage_events` rows if needed).
- **Files modified:** `migrations/012_densify_instances_and_bom.sql` (all Block 1a/1b INSERTs).
- **Verification:** Migration parses + applies cleanly against prod DB inside BEGIN/ROLLBACK; first-pass 50 inserts succeed, second-pass 0 inserts (idempotent).
- **Committed in:** `8403dba`

**2. [Rule 1 - Bug] Plan example used `instance_index=0` but schema default + existing rows use `instance_index=1`**

- **Found during:** Task 1 (inspecting existing 120 instances)
- **Issue:** Plan snippet `INSERT ... instance_index 0` would create a fork in the index numbering convention. Existing rows all use index ≥ 1 (default per schema: `1`). Migration 007 also starts at 1. The UNIQUE constraint `(sat, pd, idx)` would still work either way, but mixing index=0 and index=1 across different parts creates inconsistent demo UX (e.g. some parts addressable as "instance 0" and others as "instance 1").
- **Fix:** Use `instance_index = 1` for all Block 1a inserts. Matches schema default + 100% of existing rows + migration 007 convention.
- **Verification:** Inside transaction, distribution of instance_index values stays clean: index=1 has 80 rows (one per part_definition), index=2..30 unchanged from baseline.
- **Committed in:** `8403dba`

**3. [Rule 1 - Bug] Plan suggested 24/18/16/12/4/8 quantities for fasteners; actual L3 graph needs much less**

- **Found during:** Task 1 (designing L3 deepening map)
- **Issue:** Plan VALUES list `('STR-FASTENER-M3-12', 24), ('STR-FASTENER-M3-20', 18), ...` was illustrative. STR-FASTENER-M3-12 already has 4 instances seeded by 007 (one per hinge); 24 instances would mean 20 floating fasteners with no BOM owner. Block 1b should add ONLY the minimum extra instances needed by Block 10's L3 wiring (otherwise we create demo clutter — bare fastener pages with no parent).
- **Fix:** Block 1b derives its quantities from Block 10's actual L3 references: STR-FASTENER-M4-TI × 4 (RW mounting), STR-BRACKET-EQUIP-B × 2 (antenna mount), PROP-VALVE-LATCH-A × 2 (thruster inlet), PROP-FILTER-PROP × 2, PAY-BAFFLE-STRAY-LIGHT × 2, CDH-MASS-STORAGE-512G × 2, TCS-HEAT-PIPE-A × 2. Total = 16 extra instances (well below plan's illustrative ~80).
- **Rationale:** Plan also said "verify against actual part_definitions; below is illustrative" — this is the verification. Future BOM expansion plans (26-03+) can add more fastener instances if needed for specific procurement chain demos.
- **Files modified:** Block 1b VALUES list.
- **Committed in:** `8403dba`

---

**Total deviations:** 3 auto-fixed (Rule 1 - Bugs, fixing plan examples to match actual schema + conventions)

**Impact on plan:** No scope creep. Migration delivers exactly what the plan's success criteria demand: 100% instance coverage, ≥150 bom_lines, idempotent. The 3 fixes were necessary because the plan author had not introspected the live schema (lifecycle_stage column, instance_index default) and was working off illustrative numbers. All fixes documented + verified.

## Issues Encountered

None — the discovery queries surfaced the real gap (50 missing parts, not 50-60 as plan estimated) and the BEGIN/ROLLBACK validation caught the lifecycle_stage column issue on the first dry-run attempt, before commit.

## Change Request Ticket

`ADMIN_SECRET_KEY` for the dollor admin portal is not available in the executor's environment (same situation as 26-01). Per the `ticketed-task` SKILL.md fallback rule: "If the key is not available, log a warning and continue — don't block the task." This SUMMARY serves as the audit-trail record. Phase 26-05 (deploy phase) will create the CR ticket when the migration is actually applied to prod.

## User Setup Required

None — this plan only generates and commits SQL artifacts. Plan 26-05 (when it runs) will apply migrations 011, 012, 013, 014 in a single transaction against prod Supabase using credentials already in AWS Secrets Manager.

## Next Phase Readiness

- Migration 012 is committed, pushed to `turion-satellite` `origin/main` at `8403dba`, validated, and ready to apply.
- **Plan 26-03 (manufacturing + procurement)** can now design make_buy_decisions + work_orders + procurement_requests against every (SAT-003 × part_definition) pair, knowing every pair will have ≥1 part_instance after Plan 26-05 applies. The L3 tree means make-cost rollups (Phase 24 schema) will show realistic Σ-of-children = parent totals.
- **Plan 26-04 (cross-system FKs)** can sample any part_instance and set its `sales_order_id` / `ns_invoice_id` / `arena_doc_id` / `mes_work_order_id` columns knowing the instance exists.
- **Plan 26-05 (apply migrations)** should apply 011 → 012 → 013 → 014 in one transaction. Recommended sequence:
  ```
  BEGIN;
  \i migrations/011_densify_drawings_and_specs.sql
  \i migrations/012_densify_instances_and_bom.sql
  \i migrations/013_*.sql   -- (Plan 26-03 will create)
  \i migrations/014_*.sql   -- (Plan 26-04 will create)
  -- pre/post assertion SELECTs
  COMMIT;
  ```
  With post-apply expected counts: drawings=80/80, specs=80/80, instances/SAT-003=176, bom_lines/SAT-003=156.

## Self-Check: PASSED

```
FOUND: /Users/jeet/turion-satellite/migrations/012_densify_instances_and_bom.sql (25 KB, 581 lines)
FOUND: git commit 8403dba on origin/main (turion-satellite)
FOUND: file blob 82e878e8801f2ac1c04d81642bdc6fe3a07e61b2 on origin/main
FOUND: 50 missing-instance INSERTs apply on first pass, 0 on second pass (idempotent)
FOUND: 63 new bom_lines inserted inside transaction (93 → 156)
FOUND: 0 INSERTs into part_definitions (grep-verified)
FOUND: post-ROLLBACK prod DB state = baseline (120 instances, 93 bom_lines) — unchanged
```

---
*Phase: 26-full-demo-data-densification*
*Plan: 02*
*Completed: 2026-05-10*
