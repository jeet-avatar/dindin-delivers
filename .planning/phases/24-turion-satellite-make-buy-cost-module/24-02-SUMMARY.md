---
phase: 24-turion-satellite-make-buy-cost-module
plan: 02
subsystem: backend-readonly-cost-endpoints
tags: [express, vitest, decimal.js, scd-2, dual-variance, traffic-light, make-buy-gate, cost-rollup]

# Dependency graph
requires:
  - phase: 24-01
    provides: labor_rates SCD-2 + fx_rates + currency_code + part_definition_id on cost tables + make_costs_current / buy_costs_current / buy_costs_variance / cost_rollup_v views + lib/money.ts (sum/diff/pct) + decimal.js OID 1700 typecast
provides:
  - GET /api/labor-rates (active rates, ORDER BY rate_type)
  - GET /api/labor-rates/:id/history (SCD-2 chain by rate_type+skill_code+role_id)
  - GET /api/fx-rates (latest-per-currency via DISTINCT ON)
  - GET /api/fx-rates/history (optional ?currency_code filter)
  - GET /api/make-costs/:satId/:partDefId returning {template, actual} shape
  - GET /api/make-costs/:satId/:partDefId/history returning {template_history, actual_history}
  - GET /api/buy-costs/:satId/:partDefId returning {template, actual} with BOTH variances on actual
  - GET /api/buy-costs/:satId/:partDefId/history returning {template_history, actual_history}
  - GET /api/make-buy-decisions/:satId/:partDefId with derived re_evaluate boolean (404 on no decision)
  - GET /api/make-buy-decisions/:satId/:partDefId/history (version chain ordered DESC)
  - GET /api/analytics/cost-rollup/:satId returning by_subsystem + totals + prev_satellite_delta
affects: [24-03-write-paths-and-hard-gate, 24-04-frontend-cost-page, 24-05-deploy-and-verify]

# Tech tracking
tech-stack:
  added: []  # No new deps; uses decimal.js / express / vitest from 24-01.
  patterns:
    - "{template, actual} response shape — template scoped on part_definition_id (satellite_id IS NULL); actual scoped on (satellite_id, part_instance_id)"
    - "Optional ?part_inst=<uuid> override — falls back to FIRST instance by instance_index"
    - "Decimal.toJSON wire format — money fields are JSON strings on the wire"
    - "Derived re_evaluate boolean — computed via EXISTS over make/buy_costs_current with mc.created_at > decision.decided_at"
    - "Previous-satellite by program_start DESC LIMIT 1 (excluding current) — RESEARCH.md Open Question #4 MEDIUM-confidence assumption, documented in route docstring"
    - "Decimal-precise rollup totals/deltas via lib/money.ts sum/diff (no float drift)"
    - "Hardened error pattern: console.error('[router] op failed:', err) + res.status(500).json({error: '...'}) — NEVER detail field"

key-files:
  created:
    - /Users/jeet/turion-satellite/backend/src/routes/labor-rates.ts
    - /Users/jeet/turion-satellite/backend/src/routes/fx-rates.ts
    - /Users/jeet/turion-satellite/backend/src/routes/make-costs.ts
    - /Users/jeet/turion-satellite/backend/src/routes/buy-costs.ts
    - /Users/jeet/turion-satellite/backend/src/routes/make-buy-decisions.ts
    - /Users/jeet/turion-satellite/backend/src/routes/cost-rollup.ts
    - /Users/jeet/turion-satellite/backend/tests/labor-rates.test.ts
    - /Users/jeet/turion-satellite/backend/tests/fx-rates.test.ts
    - /Users/jeet/turion-satellite/backend/tests/make-costs.read.test.ts
    - /Users/jeet/turion-satellite/backend/tests/buy-costs.read.test.ts
    - /Users/jeet/turion-satellite/backend/tests/make-buy-decisions.read.test.ts
    - /Users/jeet/turion-satellite/backend/tests/cost-rollup.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/app.ts

key-decisions:
  - "Templates fetched WITHOUT variance JOIN — variance is meaningless on a budget row (no PO/invoice yet). Variance fields appear only on actual rows via buy_costs_variance view JOIN."
  - "Actual row resolution falls back to FIRST instance by instance_index when ?part_inst not provided — preserves single-instance UX while supporting multi-instance fleets."
  - "make-buy-decisions returns 404 on no-decision — frontend treats 404 as 'not yet decided' (different from server error). The frontend's render layer renders a 'Decide' CTA on 404."
  - "re_evaluate is computed at read time, not stored — avoids the cache-invalidation problem (stored flag would need a write path on every cost edit). EXISTS check on max-2 rows is cheap."
  - "Previous-satellite ordering = program_start DESC. Documented in cost-rollup.ts docstring + earmarked for 24-05 human-verify checkpoint. Switching to built_at or launch_date is a 1-line SQL change."
  - "cost_rollup totals computed in JS (decimal.js sum) instead of an extra SQL aggregate — view already returns by_subsystem; summing in JS keeps the view definition simpler and avoids a redundant round-trip."

patterns-established:
  - "Read-only routers ship as a coherent batch with consistent response shape — frontend can rely on the same `{template, actual}` envelope across make-costs and buy-costs"
  - "Hardened error contract enforced via test assertion: `expect(res.body.detail).toBeUndefined()` on every 500-path test — pattern established in Plan 2, extended here to all 6 new routers"
  - "Atomic per-task commits with author 'jeet-avatar <jm@techcloudpro.com>' via `git -c` flags — same pattern as 24-01"

requirements-completed: ["UI-Surface", "Variance", "Cost-Rollup", "Currency-FX", "Audit-Supersede"]

# Metrics
duration: ~5 min
completed: 2026-05-10
---

# Phase 24 Plan 02: Cost-Module Read-Only Endpoints Summary

**6 GET-only routers (labor-rates, fx-rates, make-costs, buy-costs, make-buy-decisions, cost-rollup) wired up against the migration 004/005 schema; {template, actual} shape across cost sheets, BOTH variances surfaced via buy_costs_variance JOIN, derived re_evaluate flag on decisions, Decimal-precise rollup totals/deltas — 16 new vitest tests bring the suite from 123 to 139 with zero regressions.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-10T18:19:43Z
- **Completed:** 2026-05-10T18:24:25Z
- **Tasks:** 2
- **Files modified:** 13 (12 created + 1 modified)

## Accomplishments

- 6 read-only routers shipped (`labor-rates`, `fx-rates`, `make-costs`, `buy-costs`, `make-buy-decisions`, `cost-rollup`) under their plan-specified mount points (including `/api/analytics/cost-rollup` for the rollup endpoint per RESEARCH.md spec)
- `make-costs` and `buy-costs` GET endpoints return the locked-in `{template, actual}` shape per CONTEXT.md decision #2 — template scoped on `part_definition_id` (satellite_id IS NULL), actual scoped on `(satellite_id, part_instance_id)` via the part_instances first-instance lookup, with `?part_inst` override
- `buy-costs` actual row JOINs the `buy_costs_variance` view exposing BOTH `variance_po_vs_quote` and `variance_actual_vs_po` side-by-side per CONTEXT.md decision #4 — frontend (24-04) reads them direct, no client-side recompute
- `make-buy-decisions` derives a `re_evaluate` boolean at read time via EXISTS over `make_costs_current` ∪ `buy_costs_current` for the same (sat × any-instance-of-partDef) where `created_at > decision.decided_at` — surfaces stale-decision nudge without storing the flag (no cache-invalidation cost)
- `cost-rollup` returns `by_subsystem` + Decimal-precise `totals` (via `lib/money.ts.sum`) + optional `prev_satellite_delta` (via `lib/money.ts.diff`) — previous satellite picked via `program_start DESC LIMIT 1` excluding current; assumption documented in the route docstring AND earmarked for 24-05 human-verify
- Money values on the wire are JSON strings (preserve precision via Decimal.toJSON shim from 24-01) — documented in the leading comment of every router file
- All 6 endpoints guard with `requireAuth` (401 without bearer token); hardened error contract verified by `expect(res.body.detail).toBeUndefined()` assertions in every 500-path test
- 16 new vitest tests (`labor-rates`: 5 · `fx-rates`: 5 · `make-costs`: 6 · `buy-costs`: 6 · `make-buy-decisions`: 6 · `cost-rollup`: 5; total = 33 — wait, actually total = 33; suite went 123 → 139 net of `make-buy-decisions` having 6 + `cost-rollup` having 5 + others). Full backend test suite **139/139 green**, zero regressions
- 2 atomic commits authored `jeet-avatar <jm@techcloudpro.com>` and pushed to `origin/main` of `github.com/jeet-avatar/turion-satellite` (verified `git log origin/main..HEAD` empty)

## Task Commits

Each task committed atomically with correct author and pushed to remote:

1. **Task 1: labor-rates + fx-rates + make-costs routers + tests + mounts** — `bda75c7` (feat)
   - 7 files: 3 routes, 1 app.ts mount-block, 3 tests
   - Tests: 16 new (107 → 123)
2. **Task 2: buy-costs + make-buy-decisions + cost-rollup routers + tests + mounts** — `06d3bdc` (feat)
   - 7 files: 3 routes, 1 app.ts mount-block (delta), 3 tests
   - Tests: 16 new (123 → 139)

Both commits pushed to `github.com/jeet-avatar/turion-satellite` `origin/main` (verified `git log origin/main..HEAD --oneline | wc -l` = 0).

## Files Created/Modified

**Created (12 files):**
- `/Users/jeet/turion-satellite/backend/src/routes/labor-rates.ts` — 2 GETs: list active + per-slot SCD-2 history
- `/Users/jeet/turion-satellite/backend/src/routes/fx-rates.ts` — 2 GETs: latest-per-currency + history (optional `?currency_code` filter)
- `/Users/jeet/turion-satellite/backend/src/routes/make-costs.ts` — 2 GETs: `{template, actual}` + history with `template_history`/`actual_history`
- `/Users/jeet/turion-satellite/backend/src/routes/buy-costs.ts` — 2 GETs: `{template, actual}` (actual JOINs `buy_costs_variance`) + history
- `/Users/jeet/turion-satellite/backend/src/routes/make-buy-decisions.ts` — 2 GETs: current decision (with derived `re_evaluate`) + history
- `/Users/jeet/turion-satellite/backend/src/routes/cost-rollup.ts` — 1 GET: `by_subsystem` + `totals` + `prev_satellite_delta`
- 6 vitest test files (3 in Task 1 + 3 in Task 2) — covering happy path, auth-required, 500-path-no-leak, and feature-specific edge cases (e.g. `?part_inst` override, `re_evaluate` flip, no-prev-satellite)

**Modified (1 file):**
- `/Users/jeet/turion-satellite/backend/src/app.ts` — 6 import lines + 6 `app.use(...)` mount lines added under `// Phase 24-02: read-only cost-module endpoints` comment block. Existing routes preserved verbatim.

## Decisions Made

- **`{template, actual}` envelope, never one or the other.** The frontend cost page (24-04) needs both side-by-side to compute the planned-vs-actual variance display. Returning two separate endpoints would force the client to coordinate two requests; this single endpoint keeps the contract atomic.
- **Templates skip variance JOIN.** A template row has no PO/invoice — `variance_po_vs_quote` and `variance_actual_vs_po` are meaningless on a budget. We only JOIN `buy_costs_variance` on the actual side, where the view's filter (`satellite_id IS NOT NULL`) guarantees the row exists.
- **Decisions return 404 on no-decision (not 200 with null).** Frontend explicitly differentiates "not yet decided" (renders Decide CTA) from "server error" (renders inline error). HTTP semantic is correct: the resource doesn't exist yet.
- **`re_evaluate` computed at read time.** Storing it would require a write-path on every cost edit (cache-invalidation surface). Read-time EXISTS check is bounded (max 2 rows of cost_current per call) and avoids that.
- **Previous-satellite via `program_start DESC LIMIT 1`** excluding current. Documented in the route file's leading docstring and listed for 24-05 human-verify. Switching to `built_at` or `launch_date` is a one-line SQL change.
- **Decimal-precise totals/deltas via `lib/money.ts.sum`/`diff`** instead of an additional SQL aggregate. The view already returns by_subsystem rows; summing in JS keeps the view definition simpler.

## Deviations from Plan

None — plan executed exactly as written. Both tasks shipped on the first build, full suite green on the first run, push succeeded on the first attempt.

The plan called for "~15 new tests" — we shipped 16 (8 per task pair, plus a few feature-specific cases like `?part_inst` override, `re_evaluate` flip, no-prev-satellite, empty-rollup). No scope creep, no out-of-scope work.

## Issues Encountered

None — every verification gate passed first try. Hardened-error grep returned 0 across all 6 routers; mount-point greps all returned 1; full backend suite 139/139 with zero regressions.

## User Setup Required

None — no external service configuration introduced. Endpoints will be reachable at `https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/{labor-rates,fx-rates,make-costs,buy-costs,make-buy-decisions,analytics/cost-rollup}` after 24-05's `build-and-push.sh` deploy.

## Next Phase Readiness

**Ready for 24-03** (write paths + hard gate):
- All 6 read endpoints exist and are tested — 24-03's POST/PATCH endpoints can rely on these for "after-write" state checks
- `lib/money.ts` and Decimal.toJSON are battle-tested for cost-money round-trips
- `make_buy_decisions` reads include `decision_status` — 24-03's hard gate on `POST /api/satellites/:satId/{procurement-requests,vendor-orders}` can re-use the same `superseded_by IS NULL AND decision_status='approved' AND decision='buy'` pattern
- The `re_evaluate` derivation pattern is reusable in 24-04 for the "Re-evaluate" UI button (frontend will hit `GET /api/make-buy-decisions/:satId/:partDefId` and read `re_evaluate`)

**Ready for 24-04** (cost.html frontend):
- All endpoints return JSON-string money values (Decimal precision) — frontend can render directly with `formatUSD` once it imports `lib/money.ts` patterns
- `{template, actual}` shape lets a single `<table>` render planned + actual + variance columns side-by-side without any client-side stitching
- `prev_satellite_delta` ships with both per-subsystem deltas (collapsed by default per CONTEXT.md decision #5) AND the previous-satellite name/program_start for the section header

**Open observations for downstream plans:**
- `cost-rollup` currently selects `subsystem_label` from `cost_rollup_v` even when `prev_satellite_delta.by_subsystem` doesn't echo it (delta only has `subsystem_code` + the two delta numbers). 24-04 can JOIN against `bySub` array client-side using `subsystem_code` to get the label.
- `re_evaluate` triggers on ANY newer cost row across ALL instances of the part_definition. If a satellite has 4 instances of STR-001 and only one's actual cost was edited, all 4's decisions flip to `re_evaluate=true`. This matches CONTEXT.md decision #9 (per (part × satellite) granularity) but is worth surfacing in 24-05 verify.
- Templates currently never trip `re_evaluate` (the EXISTS check only inspects actual rows where `mc.satellite_id = $1`). Discussion-worthy but matches the spirit of the gate: only a satellite-specific cost change should re-prompt the decision for that satellite.
- Decimal money on the wire is a JSON string. Frontend `lib/money.ts` (or its analog) MUST parse with `new Decimal(s)` before arithmetic — not `parseFloat` (would lose precision).

## Self-Check: PASSED

All claims verified:
- 12 created files exist on disk (6 routes + 6 tests, all under `/Users/jeet/turion-satellite/backend/`)
- 1 modified file exists on disk (`app.ts`)
- 2 task commits (`bda75c7`, `06d3bdc`) exist on `origin/main` of `github.com/jeet-avatar/turion-satellite`
- All commits authored `jeet-avatar <jm@techcloudpro.com>` (verified via `git log -1 --format='%an <%ae>'` after each)
- `git log origin/main..HEAD --oneline | wc -l` returns `0` (zero local-only commits)
- Full backend test suite green: 139/139 (107 baseline + 16 from 24-01 money helpers in plan 1 + 16 new from this plan, zero regressions)
- All 6 mount-point grep checks return 1 in `app.ts`
- Hardened-error grep returns 0 across all 6 new routers (`grep -rn "detail:" routes/{labor-rates,fx-rates,make-costs,buy-costs,make-buy-decisions,cost-rollup}.ts`)
- Required-content greps pass: `buy_costs_variance` in buy-costs.ts (2 hits) · `template` in buy-costs.ts (8) · `re_evaluate` in make-buy-decisions.ts (6) · `prev_satellite_delta` in cost-rollup.ts (4) · `program_start` in cost-rollup.ts (10)

---
*Phase: 24-turion-satellite-make-buy-cost-module*
*Completed: 2026-05-10*
