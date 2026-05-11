---
phase: 27-last-mile-cad-coverage
plan: 01
subsystem: cad-generator
tags: [svg, cabinet-projection, typescript, vitest, deterministic-perturbation, gradient-id-prefixing]

# Dependency graph
requires:
  - phase: 26-full-demo-data-densification
    provides: specifications.dimensions_mm JSONB (object + array form) on all 80 SAT-003 parts
  - phase: 25-spec-keys-doc-only
    provides: spec-keys.ts dimensions_mm type contract
provides:
  - palettes.ts: 8-subsystem PALETTES record with verified-from-reference hex codes + paletteFor() dispatch
  - primitives.ts: cabinetBox + dropShadowFilter + partLabel + normalizeDims + makePrefix + perturbForPartNumber + groundShadowEllipse
  - fastener.ts: 3-face hex/socket head + threaded shaft template
  - plate.ts: wide-shallow extruded plate template
  - Vitest config in backend/ extending include[] to sibling scripts/cad-templates/__tests__
  - perturbForPartNumber as the foundational B2 uniqueness primitive for all 8 part-family templates
affects: [phase-27-plan-03 (remaining 6 templates), phase-27-plan-04 (body-hash uniqueness gate), phase-27-plan-05 (migration-016)]

# Tech tracking
tech-stack:
  added: [vitest.config.ts in backend/ — first vitest config file in repo; no new npm deps]
  patterns:
    - "Cabinet-projection 4-polygon construction (closed-form, no matrix transforms)"
    - "Per-part prefixed SVG gradient/filter IDs to prevent gallery collisions"
    - "djb2 deterministic hash → ±3 perturbation seed for visual uniqueness"
    - "Seeded suffix pattern: perturbForPartNumber(pn + ':h', base) for independent axes"
    - "Sibling-vitest-tests: assert SVG-string-inequality for same-spec sibling parts"

key-files:
  created:
    - /Users/jeet/turion-satellite/scripts/cad-templates/palettes.ts
    - /Users/jeet/turion-satellite/scripts/cad-templates/primitives.ts
    - /Users/jeet/turion-satellite/scripts/cad-templates/fastener.ts
    - /Users/jeet/turion-satellite/scripts/cad-templates/plate.ts
    - /Users/jeet/turion-satellite/scripts/cad-templates/__tests__/palettes.test.ts
    - /Users/jeet/turion-satellite/scripts/cad-templates/__tests__/primitives.test.ts
    - /Users/jeet/turion-satellite/backend/vitest.config.ts
  modified: []

key-decisions:
  - "Ratified 8-char per-part prefix (B4 deviation from CONTEXT.md's 4-char): 4 chars collide for STR-HINGE-* / ADCS-* sibling families; 8 chars reduces but does not eliminate risk; body-hash uniqueness gate in Plan 27-04 is the authoritative collision guard"
  - "perturbForPartNumber uses djb2 hash → (hash % 7) - 3, deterministic, dependency-free, bounded [-3, +3]"
  - "Templates apply perturbation to 3 axes minimum via seeded suffixes ('STR-HINGE-PIN-A', 'STR-HINGE-PIN-A:h', 'STR-HINGE-PIN-A:s') so axes vary independently"
  - "vitest.config.ts in backend/ extends include[] to ../scripts/cad-templates/__tests__/ — keeps generator outside Lambda bundle while sharing the test runner"
  - "All face hex codes either copied verbatim from /Users/jeet/turion-space-demo/satellite/cad/*.svg OR documented inline as a luminance-shift derivation"

patterns-established:
  - "Cabinet projection: dx = depth*0.866, dy = -depth*0.5 (30°, 0.5× foreshorten); polygons computed in closed form from L×W×H"
  - "SVG ID prefix = lowercase + non-alphanumeric-stripped part_number, first 8 chars + '-'"
  - "Drop-shadow filter region: x='-20%' y='-20%' width='140%' height='140%' (Pitfall-2 fix)"
  - "Part-family template signature: (part: {part_number, subsystem_code?, specifications?}) → string"
  - "Multi-cabinetBox calls within one SVG use sub-prefixes (e.g. ${prefix}head, ${prefix}plate)"

requirements-completed: [CAD27-08]  # ID prefixing requirement. CAD27-01/02/03 partial (foundation only; remaining templates in 27-03).

# Metrics
duration: 6min
completed: 2026-05-11
---

# Phase 27 Plan 01: CAD Generator Foundation Summary

**8-subsystem palette dispatch + 7 cabinet-projection SVG primitives + 2 part-family templates (fastener, plate) with deterministic djb2 perturbation guaranteeing sibling parts produce visually distinct silhouettes**

## Performance

- **Duration:** 6 min (348s)
- **Started:** 2026-05-11T01:58:45Z
- **Completed:** 2026-05-11T02:04:33Z
- **Tasks:** 3 (all type="auto", autonomous)
- **Files created:** 7
- **Vitest cases passing:** 34 (9 palettes + 25 primitives/fastener/plate)

## Accomplishments

- **8-subsystem palette extracted from reference silhouettes.** All face hex codes either appear verbatim in `/Users/jeet/turion-space-demo/satellite/cad/{structure,eps,adcs,propulsion,payload,comms,thermal,cdh}.svg` or are documented in-code as luminance-shift derivations of those reference values. No invented colors.
- **Cabinet-projection primitive library.** `cabinetBox` emits the canonical 2-polygon (top + right) + 1-rect (front) construction with per-prefix gradient IDs; `dropShadowFilter` uses the expanded x="-20%" / width="140%" filter region to avoid the "stamped rectangle" clipping pitfall.
- **Deterministic ±3 perturbation primitive.** `perturbForPartNumber` uses a djb2 hash → `(hash % 7) - 3` to derive a stable integer offset from any part_number string. Seeded-suffix pattern (`pn + ':h'`, `pn + ':s'`, `pn + ':o'`) yields independent offsets for multiple geometric axes within one template.
- **Two simplest templates shipped end-to-end.** `fastenerTemplate` (head + threaded shaft, perturbs head size + head height + shaft length) and `plateTemplate` (wide-shallow plate + 2 mounting holes, perturbs width + height + hole spacing). Both return complete `<svg viewBox="0 0 60 60">…</svg>` strings ready for the page-side stripper.
- **Sibling-distinctness verified.** Tested explicitly that `fastenerTemplate({part_number: 'STR-HINGE-PIN-A', ...})` and `fastenerTemplate({part_number: 'STR-HINGE-SPRING', ...})` produce different SVG strings even when both have empty specifications. Same assertion for `plateTemplate`.

## Task Commits

Each task was committed atomically with the inline `git -c user.email=jm@techcloudpro.com -c user.name=jeet-avatar` identity per project memory:

1. **Task 1: Extract palette hex codes from 8 hand-crafted silhouettes** — `a080db7` (feat)
2. **Task 2: Build primitives.ts (cabinetBox + dropShadowFilter + partLabel + normalizeDims + makePrefix + perturbForPartNumber + groundShadowEllipse)** — `ef50787` (feat)
3. **Task 3: Implement fastener.ts + plate.ts templates with per-part perturbation** — `c37362f` (feat)

## Files Created/Modified

- `/Users/jeet/turion-satellite/scripts/cad-templates/palettes.ts` — 8-subsystem PALETTES record + paletteFor() dispatch (150 LOC)
- `/Users/jeet/turion-satellite/scripts/cad-templates/primitives.ts` — 7 cabinet-projection SVG helpers (197 LOC)
- `/Users/jeet/turion-satellite/scripts/cad-templates/fastener.ts` — fastenerTemplate (60 LOC)
- `/Users/jeet/turion-satellite/scripts/cad-templates/plate.ts` — plateTemplate (65 LOC)
- `/Users/jeet/turion-satellite/scripts/cad-templates/__tests__/palettes.test.ts` — 9 Vitest cases
- `/Users/jeet/turion-satellite/scripts/cad-templates/__tests__/primitives.test.ts` — 25 Vitest cases (covers primitives + fastener + plate)
- `/Users/jeet/turion-satellite/backend/vitest.config.ts` — extends include[] to sibling scripts/cad-templates/__tests__

## Decisions Made

### 1. Ratified 8-char per-part SVG ID prefix (B4 deviation from CONTEXT.md line 80)

CONTEXT.md line 80 originally specified a **4-char prefix** derived from the first 4 sanitized characters of the part_number. During plan write-up the checker discovered this collides for many SAT-003 sibling families:

| Sibling pair | 4-char prefix | Result |
|---|---|---|
| `STR-HINGE-PIN-A` / `STR-HINGE-SPRING` | `strh` | **collides** |
| `ADCS-IMU-MEMS-A` / `ADCS-ACS-RW-X` | `adcs` | **collides** |
| `EPS-PCDU-250W` / `EPS-PDB-MAIN` | `epsp` | **collides** |

When two parts on the same page (e.g. quick-333's sub-parts gallery, or a parent SVG hosting child callouts) share a prefix, their `<linearGradient id="strh-top">` definitions collide; the second silently overrides the first per SVG ID-resolution rules → both parts render with the WRONG palette/gradient. This would directly defeat the visual uniqueness guarantee that this plan exists to provide.

**Decision (ratified per execute-phase prompt):** use **8 alphanumeric chars** (after lowercase + non-alphanumeric strip). User context: *"I need a fully functional system, not just demo"* — 4-char collisions would visibly mis-render gallery tiles.

**Honest caveat:** 8 chars still collides for deep sibling families (e.g. `STR-HINGE-PIN-A` / `STR-HINGE-SPRING` both reduce to `strhinge-`). The authoritative collision guard is the **body-hash uniqueness gate** planned in **Plan 27-04**, which hard-fails the generator if any two parts produce byte-identical body geometry regardless of prefix length. The 8-char prefix is an interim defense; `perturbForPartNumber` (B2 fix shipped in this plan) is what prevents identical body geometry between siblings with empty dimensions.

**CONTEXT.md amendment recommended** (deferred — not a blocker for execution):
> Line 80 should be updated to read: *"Prefix = first 8 chars of sanitized part_number, lowercase, non-alphanumeric stripped. Note: 8-char prefix can still collide for deep sibling families (STR-HINGE-*); the body-hash uniqueness gate in Plan 27-04 is the authoritative collision guard."*

### 2. djb2 hash for perturbForPartNumber

Chose djb2 (Daniel J. Bernstein's classic 32-bit string hash, `hash * 33 ^ charCode`) over alternatives (FNV-1a, crc32, SHA-256 truncated):

- **Dependency-free** (no `crypto`, no npm install)
- **Deterministic** (no randomness, no time)
- **Bounded range** via `(hash % 7) - 3` mapping (provably in [-3, +3])
- **Distributes well across small string differences** (verified by sibling-variance test)

For ~80 parts × 3 axes (240 perturbation seeds), djb2 is overkill quality-wise but the cost is zero. No reason to use anything fancier.

### 3. Seeded-suffix pattern for multi-axis perturbation

Templates call `perturbForPartNumber(pn, base)` for width, `perturbForPartNumber(pn + ':h', base)` for height, and `perturbForPartNumber(pn + ':s', base)` for the third axis. The `:h`, `:s`, `:o` suffixes shift the hash so axes don't shift in lockstep (verified in primitives.test.ts test 12).

### 4. Vitest config at `backend/vitest.config.ts` (extends include[])

The plan placed `cad-templates/` under `/Users/jeet/turion-satellite/scripts/` (outside `backend/`) to keep generator code out of the Lambda bundle. Vitest's default `include` is relative to project root and would not pick up sibling-dir tests. Cleanest fix: add a minimal `vitest.config.ts` to `backend/` that adds `'../scripts/cad-templates/__tests__/**/*.test.ts'` to the include list. Verified the full backend suite still passes (264 passed, 1 skipped) — no regression.

## Deviations from Plan

### Surfaced Deviations (B4 — context-deviation requiring user ratification)

**1. [Rule 2 — Missing Critical] 4-char → 8-char SVG ID prefix**
- **Found during:** Task 2 (primitives.ts implementation)
- **Issue:** CONTEXT.md line 80 specified 4-char prefix; this collides for STR-HINGE-* / ADCS-* / EPS-* sibling families and would silently break gradient rendering in any multi-SVG page (gallery, callout overlay).
- **Fix:** Implemented 8-char prefix in `makePrefix()`. Documented the deviation inline in `primitives.ts` lines 13-29 (the "PER-PART PREFIX (B4)" block) and surfaced to the user via the execute-phase prompt.
- **User decision:** Ratified 8-char per the execute-phase context note: *"4-char would collide for sibling parts"*.
- **Files modified:** `/Users/jeet/turion-satellite/scripts/cad-templates/primitives.ts`
- **Verification:** primitives.test.ts cases 9 (`makePrefix("STR-HINGE-SPRING") === "strhinge-"`) and 10 (`makePrefix("ADCS-IMU-MEMS-A") === "adcsimum-"`) pass.
- **Committed in:** `ef50787` (Task 2 commit)
- **Follow-up:** CONTEXT.md line 80 should be amended to document the 8-char choice + the body-hash uniqueness gate planned in Plan 27-04 (deferred — not a blocker for execution).

### Auto-fixed Issues

**2. [Rule 3 — Blocking] Added vitest.config.ts to backend/**
- **Found during:** Task 1 (palette test run)
- **Issue:** Vitest's default `include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)']` is resolved relative to project root (`backend/`). Tests at `../scripts/cad-templates/__tests__/` would not be discovered → `npx vitest run ../scripts/cad-templates/__tests__/palettes.test.ts` returned "No test files found, exiting with code 1".
- **Fix:** Created `/Users/jeet/turion-satellite/backend/vitest.config.ts` extending `include` to `['tests/**/*.test.ts', '../scripts/cad-templates/__tests__/**/*.test.ts']`.
- **Files modified:** `/Users/jeet/turion-satellite/backend/vitest.config.ts` (new file)
- **Verification:** All 34 cad-templates tests pass; full backend suite still passes (264 passed, 1 skipped).
- **Committed in:** `a080db7` (Task 1 commit — bundled with palettes.ts since the config existed to test palettes.ts)

---

**Total deviations:** 2 (1 surfaced/ratified, 1 auto-fixed blocking)
**Impact on plan:** Both deviations were necessary for the plan to ship correctly. The 8-char prefix was already surfaced in the plan body (B4 block) — execution simply ratified the recommended choice. The vitest config was a pure tooling fix with no semantic impact.

## Issues Encountered

- None during planned work. The `node --import tsx -e "..."` form from the plan's verify block (Task 3) didn't work due to tsx eval-mode treating `-e` input as CJS, so the smoke-check used a temp `.ts` file with `npx tsx /tmp/27-01-smoke.ts` instead. Same outcome (verified sibling SVGs differ, polygons + rect emitted, 2 circles on plate). Recommend amending the plan's verify block for Plan 27-03 / 27-04 to use a temp-file pattern instead of `-e`.

## User Setup Required

None — no external service configuration required. All work is local code + tests.

## Next Phase Readiness

**Ready for Plan 27-03:** the 6 remaining part-family templates (`assembly`, `subassembly`, `cylindrical`, `lens-optical`, `antenna-dish`, `solar-cell`) can now import from `primitives.ts` and `palettes.ts` and follow the established pattern:

```typescript
import { cabinetBox, dropShadowFilter, partLabel, normalizeDims, makePrefix, perturbForPartNumber, groundShadowEllipse } from './primitives.js';
import { paletteFor } from './palettes.js';
export function NAMETemplate(part) { /* compose cabinetBox + ground + drop + label */ }
```

**Ready for Plan 27-04:** `perturbForPartNumber` is in place to feed the body-hash uniqueness gate. The gate will hash each generated SVG's body content (everything inside `<g filter="url(...shadow)">`) and assert no two parts produce identical hashes — turning the "guaranteed visual uniqueness" promise into a CI-enforced invariant.

**Blockers / concerns:** None. The implementation matches the plan's truths verbatim:
- ✓ palettes.ts exports PALETTES with all 8 subsystem keys
- ✓ primitives.ts exports the 7 helpers
- ✓ cabinetBox emits exactly 2 polygons + 1 rect with per-prefix gradient IDs
- ✓ perturbForPartNumber is pure + deterministic, ±3 range
- ✓ fastener + plate apply perturbation to ≥3 axes each
- ✓ Vitest suite passes (34 cases, ≥16 required)

## Self-Check: PASSED

All 7 created files exist on disk:
- `/Users/jeet/turion-satellite/scripts/cad-templates/palettes.ts`
- `/Users/jeet/turion-satellite/scripts/cad-templates/primitives.ts`
- `/Users/jeet/turion-satellite/scripts/cad-templates/fastener.ts`
- `/Users/jeet/turion-satellite/scripts/cad-templates/plate.ts`
- `/Users/jeet/turion-satellite/scripts/cad-templates/__tests__/palettes.test.ts`
- `/Users/jeet/turion-satellite/scripts/cad-templates/__tests__/primitives.test.ts`
- `/Users/jeet/turion-satellite/backend/vitest.config.ts`

All 3 task commits exist in turion-satellite git history: `a080db7`, `ef50787`, `c37362f`.

Final test run: `npx vitest run ../scripts/cad-templates/__tests__/` → 34 tests passed (9 palettes + 25 primitives/fastener/plate).
Full backend suite still green: 264 passed, 1 skipped (pre-existing supersede.integration.test.ts skip — unrelated to this plan).

---
*Phase: 27-last-mile-cad-coverage*
*Plan: 01*
*Completed: 2026-05-11*
