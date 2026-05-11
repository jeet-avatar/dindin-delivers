---
phase: 28-full-bom-densification-data-coverage-drill-down-ui
plan: 01
subsystem: database
tags: [postgres, sql-migration, bom, idempotent, sat-003, turion-satellite, cabinet-projection-svg, phase-27-protection]

# Dependency graph
requires:
  - phase: 26-full-demo-data-densification
    provides: SAT-003 part_instances for all 14 parent assemblies (mig 012), make_buy_decisions / cost layer base (mig 013)
  - phase: 27-cad-coverage-hotspots
    provides: Phase 27 generator drawings on all 14 target parents (mig 017) — the work this plan must NOT overwrite
provides:
  - "migrations/018_bom_densification_mid_tier_subcomponents.sql — 14 mid-tier parents on SAT-003 each get internal sub-component part_definitions (78 total) + part_instances (78) + bom_lines (78)"
  - "BOM now drillable below 14 previously-leaf mid-tier assemblies (battery, MPPT, latching relay, star tracker, IMU, ADCS OBC, prop tank, latch valve, focal plane, payload FPGA, S-band radio, X-band radio, CDH backup OBC, heater patch)"
affects: [28-02, 28-03, 28-04, 28-05, 28-06, bom-densification, data-coverage-backfill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration 018 mirrors migration 016 (PCDU) — 4 blocks per parent: Block 1 drawing UPDATE (OMITTED when parent already Phase 27-drawn), Block 2 child part_definitions INSERT ON CONFLICT, Block 3 part_instances WHERE NOT EXISTS, Block 4 bom_lines wiring in a DO loop with NOT EXISTS guard"
    - "Phase 27 protection: a parent whose drawing_svg matches the Phase 27 generator fingerprint (regex '-shadow\"') has its drawing UPDATE skipped entirely; defence-in-depth dual guard (v=018/017/016 sentinel negative + '-shadow\"' negative) would refuse the overwrite even if the skip flag were wrong"
    - "Sub-component drawing_svg payloads NEVER contain the substring '-shadow\"' (Phase 27's exclusive fingerprint) — keeps the Phase 27 detector unambiguous for any future re-pull"
    - "All table references fully-qualified turion_satellite.<table> (pgbouncer transaction mode strips search_path mid-transaction)"
    - "default_make_buy is NEVER NULL on any new row (Phase 24 procurement gate violates on NULL)"
    - "specifications JSONB carries all 9 COMMON_SPEC_KEYS from backend/src/lib/spec-keys.ts plus 1-3 subsystem-specific keys"

key-files:
  created:
    - /Users/jeet/turion-satellite/migrations/018_bom_densification_mid_tier_subcomponents.sql
  modified: []

key-decisions:
  - "All 14 valid target parents turned out to be Phase 27-drawn → Block 1 (drawing UPDATE) is OMITTED for EVERY parent in mig 018; only Blocks 2/3/4 (children) run. Zero Block 1 UPDATEs in the file."
  - "7 of the 21 RESEARCH candidates were DROPPED because they already had children at preflight time (overlap with mig 012 / mig 016): ADCS-RW-MEDIUM-A (4), CDH-OBC-MAIN-A (1), COMM-ANT-XBAND-HG (1), EPS-SOLAR-WING-DEPLOY (10), PAY-TELESCOPE-OTA (1), PROP-THRUSTER-MONO-A (2), TCS-RADIATOR-PANEL-A (1)"
  - "Single-file migration (1672 lines) rather than the 3-file split RESEARCH floated — mirrors mig 011 (173KB single file) and keeps idempotency provable in one BEGIN/ROLLBACK pass"
  - "Sub-component SVGs use 12 reusable cabinet-projection templates (pcb / chip / cyl / cube / harn / conn / heatsink / lens / baffle / tank / coil / motor) parameterized by an inline <text> callout — no per-part hand-crafting, no '-shadow' filter"
  - "Production NOT modified by this plan — Plan 28-06 owns the actual apply. The local proof ran inside a BEGIN ... ROLLBACK transaction."

patterns-established:
  - "Migration 016 4-block layout is the blueprint for all future BOM-densification migrations"
  - "Phase 27 protection guard ('-shadow\"' negative-match on drawing UPDATEs) is the standard belt-and-suspenders for any migration that touches drawing_svg after Phase 27"

requirements-completed: [BOMDensity]

# Metrics
duration: 7min
completed: 2026-05-11
---

# Phase 28 Plan 01: Migration 018 BOM Densification (Mid-Tier Parents) Summary

**Migration 018 adds 78 internal sub-component part_definitions + 78 part_instances + 78 bom_lines under 14 previously-leaf mid-tier parent assemblies on SAT-003, mirroring the PCDU pattern from migration 016 — with Block 1 drawing UPDATE omitted for all 14 parents because each already carries a Phase 27 generator drawing.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-11T05:13:16Z
- **Completed:** 2026-05-11T05:20:00Z
- **Tasks:** 2 (preflight audit; write + prove migration)
- **Files modified:** 1 created (`migrations/018_bom_densification_mid_tier_subcomponents.sql`)

## Accomplishments
- Preflight audit of 21 RESEARCH candidate parents against production Postgres → 14 valid targets (12-21 range satisfied), 7 dropped for already having children
- Confirmed ALL 14 valid targets carry the Phase 27 generator fingerprint (`drawing_svg ~ '-shadow"'`) → mig 018 emits ZERO Block 1 drawing UPDATEs; only Blocks 2/3/4 (children) per parent
- Authored `migrations/018_bom_densification_mid_tier_subcomponents.sql` (1672 lines): 14 parent sections, 78 new sub-component part_definitions with full 9-key specifications JSONB + `<!-- v=018 -->`-sentinel cabinet-projection SVGs + non-NULL default_make_buy, 78 part_instances on SAT-003 (serial `SN-<pn>-001`), 78 bom_lines (status='released') wiring children under their parent instance #1
- Local idempotency double-apply proof inside a `BEGIN ... ROLLBACK` transaction: first apply = 78 part_defs / 78 instances / 78 bom_lines inserted; second apply = `INSERT 0 0` everywhere (zero rows changed)
- Phase 27 preservation proven: `drawing_svg ~ '-shadow"'` count was 79 before, 79 after first apply, 79 after second apply — Phase 27's work is untouched; production left untouched by the ROLLBACK

## Task Commits

1. **Task 1: Pre-flight audit (candidate parents, no-children check, Phase 27 fingerprint detection)** — no commit (analysis only; outputs in `/tmp/phase28-01-preflight.txt`, `/tmp/phase28-01-targets.txt`, `/tmp/phase28-01-skip-flags.txt`)
2. **Task 2: Write migration 018 + local idempotency proof** — `a253902` (feat) — `migrations/018_bom_densification_mid_tier_subcomponents.sql`, 1672 insertions

**Plan metadata:** (this SUMMARY + STATE/ROADMAP update committed separately on dindin)

## Files Created/Modified
- `/Users/jeet/turion-satellite/migrations/018_bom_densification_mid_tier_subcomponents.sql` — 14-parent BOM densification migration, idempotent, Phase 27-safe (committed `a253902` on `turion-satellite` main, NOT pushed — Plan 28-06 owns push + apply)

## Preflight Audit Results

### Valid targets (14 — all included in mig 018, all Phase 27-drawn so Block 1 omitted)

| # | Parent PN | Subsystem | default_make_buy | Children seeded | Existing children at preflight | Phase 27 drawn? |
|---|-----------|-----------|------------------|-----------------|--------------------------------|-----------------|
| 1 | `EPS-BATTERY-LIION-100W` | EPS | buy | 6 | 0 | yes (skip Block 1) |
| 2 | `EPS-MPPT-CTRL` | EPS | buy | 6 | 0 | yes (skip Block 1) |
| 3 | `EPS-LATCHING-RELAY-X4` | EPS | buy | 4 | 0 | yes (skip Block 1) |
| 4 | `ADCS-STAR-TRACKER-A` | ADCS | buy | 6 | 0 | yes (skip Block 1) |
| 5 | `ADCS-IMU-MEMS-A` | ADCS | buy | 6 | 0 | yes (skip Block 1) |
| 6 | `ADCS-OBC-BOARD-A` | ADCS | buy | 6 | 0 | yes (skip Block 1) |
| 7 | `PROP-TANK-PROP-A` | PROP | buy | 5 | 0 | yes (skip Block 1) |
| 8 | `PROP-VALVE-LATCH-A` | PROP | buy | 6 | 0 | yes (skip Block 1) |
| 9 | `PAY-FOCAL-PLANE-A` | PAY | buy | 6 | 0 | yes (skip Block 1) |
| 10 | `PAY-PROCESSOR-FPGA` | PAY | buy | 5 | 0 | yes (skip Block 1) |
| 11 | `COMM-RADIO-SBAND-A` | COMM | buy | 6 | 0 | yes (skip Block 1) |
| 12 | `COMM-RADIO-XBAND-A` | COMM | buy | 6 | 0 | yes (skip Block 1) |
| 13 | `CDH-OBC-BACKUP-A` | CDH | buy | 6 | 0 | yes (skip Block 1) |
| 14 | `TCS-HEATER-PATCH-A` | TCS | buy | 4 | 0 | yes (skip Block 1) |

**Totals: 78 new part_definitions, 78 new part_instances, 78 new bom_lines.**

### Dropped candidates (7 — already had children, would overlap mig 012/016)

| Parent PN | Existing children at preflight | Reason |
|-----------|--------------------------------|--------|
| `ADCS-RW-MEDIUM-A` | 4 | mig 012 reaction-wheel kit already wired |
| `CDH-OBC-MAIN-A` | 1 | already has a child |
| `COMM-ANT-XBAND-HG` | 1 | already has a child |
| `EPS-SOLAR-WING-DEPLOY` | 10 | mig 012 solar-wing kit already wired |
| `PAY-TELESCOPE-OTA` | 1 | already has a child |
| `PROP-THRUSTER-MONO-A` | 2 | already has children |
| `TCS-RADIATOR-PANEL-A` | 1 | already has a child |

### Phase 27 skip manifest

All 14 valid targets are flagged skip=`t` (drawing_svg already carries the Phase 27 generator fingerprint `-shadow"`). Therefore **Block 1 (parent drawing UPDATE) is OMITTED for every parent** in mig 018. Each parent gets a `-- Block 1 OMITTED — Phase 27 generator drew this part` comment; Blocks 2/3/4 run. Zero `UPDATE turion_satellite.part_definitions` statements appear in the file.

## Per-parent child counts

- `EPS-BATTERY-LIION-100W`: 6 (CELL-18650 ×8, BMS-PCB, HOUSING-AL, HARNESS, CONNECTOR, THERMAL-PAD)
- `EPS-MPPT-CTRL`: 6 (PCB-MAIN, MOSFET-PAIR ×2, INDUCTOR, CAPACITOR, HEATSINK, CONNECTOR)
- `EPS-LATCHING-RELAY-X4`: 4 (COIL ×4, CONTACTS ×4, HOUSING, DIODE-SUPP)
- `ADCS-STAR-TRACKER-A`: 6 (CMOS-SENSOR, LENS-ASSY, BAFFLE, PROCESSOR, HARNESS, HOUSING) — 3 ITAR (CMOS-SENSOR, LENS-ASSY, PROCESSOR)
- `ADCS-IMU-MEMS-A`: 6 (GYRO-CHIP, ACCEL-CHIP, DSP, PCB, HOUSING, CONNECTOR)
- `ADCS-OBC-BOARD-A`: 6 (FPGA, DRAM, IO-CONN, PWR-REG, PCB, HARNESS) — 1 ITAR (FPGA)
- `PROP-TANK-PROP-A`: 5 (TANK-SHELL, BLADDER, FILL-PORT, TEMP-SENSOR, BRACKET-MOUNT)
- `PROP-VALVE-LATCH-A`: 6 (COIL, ARMATURE, HOUSING, SPRING, CONNECTOR, SEAL)
- `PAY-FOCAL-PLANE-A`: 6 (CCD-SENSOR, PELTIER-COOLER, HEATSINK, FILTER-WHEEL, HARNESS, HOUSING) — 1 ITAR (CCD-SENSOR)
- `PAY-PROCESSOR-FPGA`: 5 (FPGA-CHIP, DRAM ×2, PCB, CONN-LVDS, HARNESS) — 1 ITAR (FPGA-CHIP)
- `COMM-RADIO-SBAND-A`: 6 (RF-BOARD, POWER-AMP, LO-FILTER, XTAL-OSC, HOUSING, CONNECTOR)
- `COMM-RADIO-XBAND-A`: 6 (RF-BOARD, POWER-AMP, WAVEGUIDE-STUB, XTAL-OSC, HOUSING, CONNECTOR)
- `CDH-OBC-BACKUP-A`: 6 (FPGA, DRAM, FLASH, PCB, CONN-LVDS, HARNESS) — 1 ITAR (FPGA)
- `TCS-HEATER-PATCH-A`: 4 (HEATING-ELEMENT, KAPTON-LAYER ×2, HARNESS, THERMOSTAT)

## Idempotency double-apply test results

Run inside a single `psql ... BEGIN; \i mig018; ... \i mig018; ... ROLLBACK;` transaction:

| Metric | Pre | After 1st apply | After 2nd apply |
|--------|-----|-----------------|-----------------|
| new part_definitions (14 prefixes) | 0 | 78 | 78 |
| new part_instances on SAT-003 | 0 | 78 | 78 |
| new bom_lines on SAT-003 | 0 | 78 | 78 |
| Phase 27 drawings (`drawing_svg ~ '-shadow"'`) total | 79 | 79 | 79 |
| Phase 27 drawings on the 9 known parents | 9 | 9 | 9 |

Second apply emitted `INSERT 0 0` for every Block 2 and Block 3, and every Block 4 DO loop was a no-op. Re-applying the migration changes 0 rows. **ROLLBACK confirmed — production was not modified** (post-rollback queries: 0 `EPS-BATTERY-LIION-100W-%` rows, 79 Phase 27 drawings).

## Phase 27 preservation proof

`SELECT COUNT(*) FROM turion_satellite.part_definitions WHERE drawing_svg ~ '-shadow"'` returned **79** before mig 018, **79** after the 1st apply, and **79** after the 2nd apply. The 9 specifically-named Phase 27 parents (ADCS-STAR-TRACKER-A, ADCS-RW-MEDIUM-A, ADCS-IMU-MEMS-A, ADCS-OBC-BOARD-A, CDH-OBC-MAIN-A, CDH-OBC-BACKUP-A, COMM-RADIO-SBAND-A, COMM-RADIO-XBAND-A, COMM-ANT-XBAND-HG) all still carry the `-shadow"` fingerprint. Phase 27's work is fully preserved.

## Git commit

- `turion-satellite` main: `a253902` — `feat(28-01): migration 018 BOM densification for 14 mid-tier parents (Phase 27 drawings protected)` — committed under `jm@techcloudpro.com / jeet-avatar`, NOT pushed. Plan 28-06 owns the push + production apply.

## Static verification (all pass)

1. File ≥600 lines — 1672 ✓
2. PARENT section count = target count — 14 = 14 ✓
3. Zero unqualified table references — `grep -E "(UPDATE|FROM|JOIN|INSERT INTO)\s+(part_definitions|part_instances|bom_lines|subsystems|make_buy_decisions)\b"` returns 0 ✓
4. Zero NULL `default_make_buy` in VALUES — 78 well-formed `'make'|'buy', TRUE|FALSE,` rows; no NULL literal ✓
5. `<!-- v=018 -->` sentinels — 78 (one per child SVG) + 2 header comment refs ✓
6. Block 1 UPDATE count = 0 (all 14 parents Phase 27-skipped) ✓
7. `Block 1 OMITTED` comments — 14 (one per parent, ≥9 required) ✓
8. Idempotency double-apply — second apply changes 0 rows ✓
9. Phase 27 drawing count unchanged (79 = 79 = 79) ✓
10. Local commit landed, working tree clean (except pre-existing untracked `scripts/seed-demo-data.sql`), commit NOT pushed ✓

## Decisions Made
- All 14 valid targets were Phase 27-drawn → mig 018 has zero Block 1 drawing UPDATEs (only children Blocks 2/3/4). This is the maximally-conservative outcome for Phase 27 protection.
- Single 1672-line migration file rather than a 3-file split — keeps the BEGIN/ROLLBACK idempotency proof a single pass and mirrors the long-standing `mig 011` single-file precedent.
- Sub-component SVGs use 12 reusable cabinet-projection templates parameterized by an inline `<text>` callout — no per-part hand-crafting, and crucially no `-shadow` filter so the Phase 27 detector stays unambiguous.
- Production not touched — Plan 28-06 owns the apply; this plan's proof ran inside a transaction that was rolled back.

## Deviations from Plan

None — plan executed exactly as written. The plan anticipated "≥9" Phase 27-skip parents; the actual count came out at 14 (all targets), which the plan explicitly allows ("Expected `skip_block_1=t` count: ≥9"). No bugs, no blocking issues, no architectural changes.

## Issues Encountered
None. The preflight query and the BEGIN/ROLLBACK proof ran clean on the first attempt. (One internal Python codegen typo — `svg_pcb(label, sub)` had an unused second arg — was caught and fixed before any SQL was written; it never affected the migration file.)

## User Setup Required
None — no external service configuration required. Production apply is deferred to Plan 28-06.

## Next Phase Readiness
- Migration 018 is committed locally on `turion-satellite` main and ready for Plan 28-06 to apply + push.
- Plan 28-02 (mig 019 data-coverage backfill) can proceed — the 78 new sub-components from mig 018 will be picked up by mig 019's `WHERE NOT EXISTS` set-difference once mig 018 is applied (Plan 28-06).
- No blockers.

---
*Phase: 28-full-bom-densification-data-coverage-drill-down-ui*
*Completed: 2026-05-11*

## Self-Check: PASSED

- SUMMARY.md exists ✓
- `migrations/018_bom_densification_mid_tier_subcomponents.sql` exists, 1672 lines (≥600) ✓
- Commit `a253902` present in `turion-satellite` git log ✓
- Preflight artifacts present: `/tmp/phase28-01-preflight.txt` (26 lines), `/tmp/phase28-01-targets.txt` (14), `/tmp/phase28-01-skip-flags.txt` (14) ✓
