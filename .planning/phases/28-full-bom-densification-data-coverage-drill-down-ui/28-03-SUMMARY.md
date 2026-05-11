---
phase: 28-full-bom-densification-data-coverage-drill-down-ui
plan: 03
subsystem: api
tags: [express, postgres, recursive-cte, decimal.js, vitest, supertest, bom, cost-rollup]

# Dependency graph
requires:
  - phase: 24-cost-module
    provides: make_costs_current / buy_costs_current views (mig 005), make_buy_decisions table, lib/money.ts Decimal helpers
  - phase: 28-02
    provides: P3 preflight confirming both *_current views exist in production
provides:
  - "GET /api/satellites/:satId/bom/tree — recursive hierarchical BOM tree (drawing_svg inline per node)"
  - "GET /api/analytics/cost-rollup/instance/:instId?sat=<satId> — decision-aware recursive subtree cost rollup"
affects: [28-04, 28-05, 28-06, drill-down-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WITH RECURSIVE CTE + path-array cycle guard (c_pi.id <> ALL(path)) for many-to-many BOM safety"
    - "Cost JOINs read *_current views (supersession encapsulated in view) — routes never know superseded_by IS NULL"
    - "Decision-aware cost selection: make→make_cost, buy→buy_cost, null→$0 (fail-safe, no buy fallback) per RESEARCH Pitfall 9"
    - "Param-collision-prone routes (/instance/:instId) registered BEFORE catch-all param routes (/:satId)"

key-files:
  created:
    - /Users/jeet/turion-satellite/backend/tests/bom-tree.test.ts
    - /Users/jeet/turion-satellite/backend/tests/cost-rollup-instance.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/bom.ts
    - /Users/jeet/turion-satellite/backend/src/routes/cost-rollup.ts

key-decisions:
  - "Route path inside bom router is '/tree' (not '/:satId/tree') — :satId is inherited via mergeParams from the satellites.ts mount at /api/satellites/:satId/bom; '/:satId/tree' would have produced /api/satellites/:satId/bom/:satId/tree (unreachable)"
  - "Null make_buy_decision contributes cost_usd='0' (skip), never an implicit buy fallback — keeps cost gaps loud/discoverable rather than hiding them"
  - "Both new endpoints use the *_current views (mig 005), not base make_costs/buy_costs tables — supersession filter stays in one place"
  - "GET /instance/:instId registered before GET /:satId in cost-rollup.ts so Express matches the literal 'instance' segment first"

patterns-established:
  - "Pattern: recursive BOM walk with depth column + ARRAY path + cycle guard, then one-pass tree assembly in JS via Map<id, node>"
  - "Pattern: decision-table-driven cost selection (the make_buy_decisions row is the source of truth, not COALESCE over both cost rows)"

requirements-completed: [DrillDownUI, CostRollup]

# Metrics
duration: 4min
completed: 2026-05-11
---

# Phase 28 Plan 03: Backend BOM tree + instance cost-rollup endpoints Summary

**Two read-only endpoints added to the Turion Satellite API: a recursive `GET /api/satellites/:satId/bom/tree` (drawing_svg inline per node, cycle-guarded WITH RECURSIVE CTE) and a decision-aware `GET /api/analytics/cost-rollup/instance/:instId` that rolls up subtree cost using make_buy_decisions to switch between make_costs_current and buy_costs_current — null decisions contribute $0 (no buy fallback).**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-11T05:14:32Z
- **Completed:** 2026-05-11T05:18:12Z
- **Tasks:** 2
- **Files modified:** 4 (2 routes modified, 2 test files created)

## Accomplishments
- `GET /api/satellites/:satId/bom/tree` — WITH RECURSIVE CTE rooted at instances with no parent in `bom_lines`, recursing through `status='released'` BOM lines, cycle guard `c_pi.id <> ALL(t.path)`, returns `{satellite_id, node_count, root_count, max_depth, roots[]}` with each node carrying `instance_id, part_definition_id, instance_index, serial_number, part_number, description, drawing_svg, default_make_buy, itar_flag, subsystem_code, subsystem_label, parent_instance_id, qty, ref_designator, depth, children[]`.
- `GET /api/analytics/cost-rollup/instance/:instId?sat=<satId>` — recursive subtree CTE rooted at `:instId`, cycle guard `c_pi.id <> ALL(st.path)`, decision-aware cost selection via `make_buy_decisions.decision` (make→`make_costs_current.total_cost_usd`, buy→`COALESCE(invoiced_value_usd, po_value_usd, quoted_unit_cost_usd * COALESCE(ordered_qty,1))` from `buy_costs_current`, null→`'0'`), Decimal-precise sums via `lib/money.ts`, returns `{instance_id, satellite_id, self_cost_usd, descendants_cost_usd, subtree_cost_usd, descendants_count, by_descendant[]}` (all money values JSON strings).
- Both endpoints gated by `requireAuth`; both use fully-qualified `turion_satellite.<table>` names in the new SQL.
- 16 new Vitest cases (7 + 9), all passing; full backend suite 325 passed / 1 skipped (pre-existing), zero regressions.

## Task Commits

1. **Task 1: GET /api/satellites/:satId/bom/tree recursive endpoint + tests** — `a67110d` (feat)
2. **Task 2: GET /api/analytics/cost-rollup/instance/:instId recursive subtree endpoint + tests** — `db27995` (feat)

**Plan metadata:** _(see final docs commit)_

## Files Created/Modified
- `backend/src/routes/bom.ts` — appended `GET /tree` handler (recursive CTE + cycle guard + one-pass JS tree assembly + `TreeNode` interface)
- `backend/src/routes/cost-rollup.ts` — inserted `GET /instance/:instId` handler before `GET /:satId`; added `toMoney` to the `lib/money` import; `InstanceRollupResponse` interface
- `backend/tests/bom-tree.test.ts` — 7 cases: 401 no-auth, tree shape (3-level nested), every-node shape incl. drawing_svg/default_make_buy/itar_flag, cycle-guard path-uniqueness walk, empty-satellite 200, SQL invariants (cycle guard / FQ table names / `status='released'`), 500-no-leak
- `backend/tests/cost-rollup-instance.test.ts` — 9 cases: 401 no-auth, 400 missing `sat`, 404 not-in-subtree, self+descendants+subtree decimal sums, exact `Decimal` equality, decision switching (make uses make_cost / buy uses buy_cost / null=$0 with no fallback), make-with-null-make_cost=$0, SQL invariants (`WITH RECURSIVE subtree` / cycle guard / `*_current` views / no base-table JOIN / `make_buy_decisions` / `superseded_by IS NULL` / `status='released'`), 500-no-leak

## Vitest Cases (one line each)

**bom-tree.test.ts:**
1. returns 401 without auth
2. returns tree with roots/node_count/root_count/max_depth (3-level nested assembly verified)
3. every node has required shape (instance_id, part_number, depth, children[], drawing_svg, default_make_buy, itar_flag, subsystem_code)
4. cycle guard — no instance_id appears twice in any root-to-leaf path
5. returns 200 with empty roots for a satellite with no instances
6. SQL contains cycle guard, fully-qualified table names, `bl.status = 'released'`
7. returns 500 without leaking error detail when DB fails

**cost-rollup-instance.test.ts:**
1. returns 401 without auth
2. returns 400 without `sat` query param
3. returns 404 when instance not in subtree (no rows)
4. returns self_cost + descendants_cost + subtree_cost for a parent instance (1000 / 380.5 / 1380.5)
5. subtree_cost_usd = self_cost_usd + descendants_cost_usd (exact decimal sum via Decimal)
6. decision-aware switching: make→make_cost, buy→buy_cost, null→$0 (both-present rows: make/buy wins correctly; null gives $0, not buy fallback)
7. make decision with no make_costs row contributes $0 (not buy fallback)
8. SQL uses recursive subtree CTE with cycle guard, `*_current` views, no base-table JOIN, decision-aware `make_buy_decisions` JOIN with `superseded_by IS NULL`, `bl.status='released'`
9. returns 500 without leaking error detail when DB fails

## Test Run Results
- `npm test -- bom-tree.test.ts` → 7 passed
- `npm test -- cost-rollup-instance.test.ts` → 9 passed
- `npm test` (full suite) → **325 passed | 1 skipped** (1 skipped is pre-existing; baseline was ~309 → +16 = the new cases). Zero regressions.
- `npx tsc -p tsconfig.json --noEmit` → clean

## Decisions Made
- See `key-decisions` in frontmatter. Most consequential: the bom-router route path is `/tree` not `/:satId/tree` (the plan's literal text was wrong — `:satId` is already inherited via `mergeParams`), and the cost-rollup `/instance/:instId` route is registered before `/:satId` to win Express's order-sensitive matching.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] bom router route path corrected from `/:satId/tree` to `/tree`**
- **Found during:** Task 1
- **Issue:** The plan's action block (and the `must_haves` artifact check `contains: "router.get('/:satId/tree'"`) said to register `router.get('/:satId/tree', ...)`. But the bom router is mounted at `/api/satellites/:satId/bom` in `satellites.ts` with `mergeParams: true`, so registering `/:satId/tree` would resolve to `/api/satellites/:satId/bom/:satId/tree` — unreachable at the documented path `/api/satellites/:satId/bom/tree`.
- **Fix:** Registered `router.get('/tree', requireAuth, ...)` instead; `req.params.satId` is still available via `mergeParams`. Added an inline comment explaining the mount/path relationship.
- **Files modified:** `backend/src/routes/bom.ts`
- **Verification:** `bom-tree.test.ts` hits `GET /api/satellites/<uuid>/bom/tree` and gets 200 with the expected shape; SQL-invariant test confirms `$1` (the inherited satId) is used. Full suite green.
- **Committed in:** `a67110d` (Task 1 commit)

**2. [Rule 1 - Bug] cost-rollup `/instance/:instId` registered before `/:satId`**
- **Found during:** Task 2
- **Issue:** The plan appended `/instance/:instId` after the existing `/:satId` handler. Express matches in registration order, so `GET /api/analytics/cost-rollup/instance/<uuid>` would be captured by `/:satId` (treating `"instance"` as `satId`) and the new handler would be dead code.
- **Fix:** Inserted the `/instance/:instId` handler before `router.get('/:satId', ...)` with an inline comment noting the ordering constraint. (Note: in practice a bare `<uuid>` at `/cost-rollup/<uuid>` still resolves to `/:satId` because the literal `instance` segment is absent — no regression to the existing endpoint.)
- **Files modified:** `backend/src/routes/cost-rollup.ts`
- **Verification:** `cost-rollup-instance.test.ts` hits `GET /api/analytics/cost-rollup/instance/<uuid>?sat=<uuid>` and gets the rollup shape; existing `cost-rollup.test.ts` (`GET /:satId`) still passes. Full suite green.
- **Committed in:** `db27995` (Task 2 commit)

**3. [Rule 3 - Blocking] Test path adjusted to repo convention (`backend/tests/`, `vi.mock('../src/db')`)**
- **Found during:** Task 1
- **Issue:** The plan put tests at `backend/src/tests/*.test.ts` hitting a real DB via a non-existent `tests/helpers/auth` helper. The repo's actual convention is `backend/tests/*.test.ts` with `vi.mock('../src/db', ...)` (fully mocked) and an inline ES256 keypair for JWTs (see `tests/bom.test.ts`, `tests/cost-rollup.test.ts`).
- **Fix:** Created `backend/tests/bom-tree.test.ts` and `backend/tests/cost-rollup-instance.test.ts` following the established mock pattern; added explicit "SQL invariants" cases (capture the SQL string passed to `query`) to substitute for the lost integration coverage of CTE structure / cycle guard / view usage.
- **Files modified:** new test files only
- **Verification:** Both test files pass; full suite 325/326.
- **Committed in:** `a67110d`, `db27995`

**4. [Rule 1 - Bug] `req.query.sat` / `req.params.instId` typed to `string` to satisfy strict tsc**
- **Found during:** Task 2
- **Issue:** `req.query.sat` is `string | string[] | ParsedQs | ParsedQs[]` and `req.params.instId` came through as `string | string[]` under this repo's `@types/express@5` + strict config — the plan's `(req.query.sat as string)` left a `string[]` path and `tsc` failed.
- **Fix:** `const satId = typeof req.query.sat === 'string' ? req.query.sat : '';` and `const instId = req.params.instId as string;`.
- **Files modified:** `backend/src/routes/cost-rollup.ts`
- **Verification:** `npx tsc -p tsconfig.json --noEmit` clean.
- **Committed in:** `db27995`

---

**Total deviations:** 4 auto-fixed (3 bug fixes, 1 blocking). All necessary for the endpoints to be reachable, compile under strict TS, and have working tests. No scope creep — both endpoints deliver exactly the documented shapes.
**Impact on plan:** The `must_haves` artifact check `contains: "router.get('/:satId/tree'"` will NOT match (the literal string is `router.get('/tree'`) — this is the corrected, working form. Treat that check as superseded by deviation #1.

## Issues Encountered
- The plan's verify check 3 for Task 1 (`grep -cE "(FROM|JOIN)\s+(part_definitions|...)\b" bom.ts` returns 0) returns 8 — but all 8 unqualified table refs are in the **pre-existing** `GET /` handler in `bom.ts`, not the new `/tree` handler. Per the executor scope boundary, the pre-existing handler is out of scope; the new `/tree` SQL is fully qualified throughout (verified by `sed`-extracting the `/tree` block and grepping FROM/JOIN — all `turion_satellite.*`).

## User Setup Required
None — no external service configuration required. (Lambda redeploy of these routes is Plan 28-06; code is committed locally on `turion-satellite` `main`.)

## Next Phase Readiness
- Plan 28-04 / 28-05 (drill-down UI) now have their two data sources.
- Plan 28-06 must `git push origin main` then redeploy the Lambda (these routes are NOT yet live in production).
- Note for 28-06 deploy verification: `GET /api/satellites/<SAT-003-id>/bom/tree` and `GET /api/analytics/cost-rollup/instance/<inst-id>?sat=<SAT-003-id>` should both return 200 with the documented shapes once deployed.

---
*Phase: 28-full-bom-densification-data-coverage-drill-down-ui*
*Completed: 2026-05-11*

## Self-Check: PASSED

- FOUND: backend/src/routes/bom.ts
- FOUND: backend/src/routes/cost-rollup.ts
- FOUND: backend/tests/bom-tree.test.ts
- FOUND: backend/tests/cost-rollup-instance.test.ts
- FOUND: .planning/phases/28-full-bom-densification-data-coverage-drill-down-ui/28-03-SUMMARY.md
- FOUND commit: a67110d (Task 1)
- FOUND commit: db27995 (Task 2)
