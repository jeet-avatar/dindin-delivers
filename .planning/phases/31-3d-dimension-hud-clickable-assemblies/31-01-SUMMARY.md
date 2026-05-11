---
phase: 31-3d-dimension-hud-clickable-assemblies
plan: 01
subsystem: api
tags: [express, postgres, jsonb, bom, turion-satellite, vitest]

requires:
  - phase: 25-part-specifications
    provides: "specifications JSONB column on part_definitions (migration 009, DEFAULT '{}'::jsonb)"
  - phase: 30-3d-cad-viewer
    provides: "GET /api/parts/:partDefId/children?sat= BOM-children endpoint feeding the 3D viewer"
provides:
  - "GET /api/parts/:partDefId/children now returns each child's specifications JSONB (dimensions_mm / weight_grams / material) inline — no N+1 fetches"
affects: [31-02-multi-mesh-assembly-viewer, 31-03-dimension-hud, 31-04-deploy]

tech-stack:
  added: []
  patterns: ["Extend an existing read endpoint by adding a single SELECT column rather than a new route"]

key-files:
  created: []
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    - /Users/jeet/turion-satellite/backend/tests/parts.test.ts

key-decisions:
  - "No DB migration — the specifications JSONB has existed on part_definitions since Phase 25 migration 009; this is purely a SELECT-column addition"
  - "No Lambda redeploy in this plan — Plan 31-04 owns the push + build-and-push.sh"
  - "Mock-row data-shape change only in parts.test.ts (query() is mocked, so the new SELECT column is invisible to the mock) + one toMatchObject assertion"

patterns-established:
  - "Add new BOM-child columns immediately after subsystem_label, as the last column before FROM, in the /children SELECT"

requirements-completed: [ChildrenSpecsAPI]

duration: 6min
completed: 2026-05-11
---

# Phase 31 Plan 01: Children-Specs API Surfacing Summary

**`GET /api/parts/:partDefId/children?sat=` now returns each BOM child's `specifications` JSONB inline (`dimensions_mm` / `weight_grams` / `material`), so the Phase-31 multi-mesh assembly viewer + dimension HUD can render without N+1 part fetches.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-11T14:38:00Z
- **Completed:** 2026-05-11T14:39:30Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Added `c_pd.specifications AS specifications` as the last SELECT column (after `s.label AS subsystem_label`) in the `GET /api/parts/:partDefId/children` handler in `parts.ts`. Nothing else in that query changed — the `WITH parent` CTE, the `?sat=` 400 guard, `bl.status = 'released'`, the JOINs, `ORDER BY c_pd.part_number`, the auth, and the 500-no-leak catch are byte-identical otherwise. No other route in the file (`/`, `/:id`, `/:id/drawing`, `/:id/process`) touched.
- Updated `parts.test.ts`'s `describe('GET /api/parts/:partDefId/children')` block: both hardcoded mock child rows now carry a `specifications` object (`{ dimensions_mm, weight_grams, material }`), and the success-path test gained one new assertion: `expect(res.body[0].specifications).toMatchObject({ dimensions_mm: { length: 18 }, weight_grams: 4, material: 'Stainless 302' })`. All pre-existing assertions (the `toEqual(['pd-parent-1','sat-uuid-1'])` param check, the empty-array case, the 400-without-`sat` case, the auth case, the 500-no-leak case) are unchanged and green. `bom-tree.test.ts` untouched.
- Verified: `npx tsc --noEmit` exits 0; `npx vitest run` → 39 files passed / 1 skipped, 326 tests passed / 1 skipped (the skip is pre-existing); `grep -n "c_pd.specifications" src/routes/parts.ts` → exactly one match inside the `/children` SELECT.
- Committed the two edited files to `turion-satellite` main as `feat(31-01): add specifications to GET /api/parts/:partDefId/children SELECT`, authored `jeet-avatar <jm@techcloudpro.com>` (commit `15df18d`). Not pushed; Lambda not redeployed (deferred to Plan 31-04).

## Verification

- [x] Grep proof: `grep -n "c_pd.specifications AS specifications" src/routes/parts.ts` → 1 match, line 311, inside `/children` SELECT
- [x] Run proof: `npx vitest run` → `Test Files 39 passed | 1 skipped (40)` / `Tests 326 passed | 1 skipped (327)`; `npx tsc --noEmit` → exit 0
- [x] Commit proof: `git log -1 --format='%an <%ae> %s'` → `jeet-avatar <jm@techcloudpro.com> feat(31-01): add specifications to GET /api/parts/:partDefId/children SELECT`; `git show --stat HEAD` → only `backend/src/routes/parts.ts` + `backend/tests/parts.test.ts`; `git log origin/main..HEAD --oneline` → the new commit is local-only
- [x] No DB migration created; no `./build-and-push.sh` run; commit not pushed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `31-01-SUMMARY.md` exists at `.planning/phases/31-3d-dimension-hud-clickable-assemblies/`
- Commit `15df18d` exists on `turion-satellite` main

## Notes for Future Phases

- Plan 31-02 (multi-mesh assembly viewer) and 31-03 (dimension HUD) can now read `child.specifications.dimensions_mm` / `.weight_grams` / `.material` straight off the `/children` response array — no per-child `GET /api/parts/:id` round-trip.
- Plan 31-04 owns: push `turion-satellite` commit `15df18d` to `origin/main` + run `./build-and-push.sh` to redeploy the Lambda so the deployed `/children` endpoint actually returns the new column. Until then the change is code-only.
- The `specifications` column is `DEFAULT '{}'::jsonb` (migration 009), so every child row will have at minimum `{}` — the frontend should treat missing `dimensions_mm` etc. as "no data", not as an error.
