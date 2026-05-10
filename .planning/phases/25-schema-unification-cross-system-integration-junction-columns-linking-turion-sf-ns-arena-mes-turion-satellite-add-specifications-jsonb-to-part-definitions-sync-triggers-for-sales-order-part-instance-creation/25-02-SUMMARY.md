---
phase: 25-schema-unification
plan: 02
subsystem: backend-api
tags: [express, typescript, integration, sync-endpoints, audit-log, jsonb, turion-satellite, cross-schema]

# Dependency graph
requires:
  - phase: 25-schema-unification
    plan: 01
    provides: 6 cross-schema FK columns (TEXT), specifications JSONB on part_definitions, audit_log entity_id widened to TEXT, chk_audit_log_action expanded with 4 sync_* actions
  - phase: 24-turion-satellite-make-buy-cost-module
    provides: requireAuth middleware, pool.connect() transaction pattern, hardened error pattern, audit_log table
provides:
  - "POST /api/integration/sync-sales-order/:salesOrderId — body {satelliteId}, links/creates part_instances by part_number match against SO.source_data.lineItems"
  - "POST /api/integration/sync-ns-invoice/:invoiceId — links matching vendor_orders by part_number"
  - "POST /api/integration/sync-arena-doc — body {docId}, links part_instances by regex-extracted part_number from arena_docs.source_data.linked / whereUsed"
  - "POST /api/integration/sync-mes-work-order — body {woId}, links part_instances by work_orders.source_data.item"
  - "backend/src/lib/spec-keys.ts — CommonSpecKeys interface + COMMON_SPEC_KEYS + SPEC_KEY_LABELS + SUBSYSTEM_SPEC_HINTS (Phase 28 frontend imports for friendly labels)"
  - "GET /api/parts/:id response includes specifications JSONB (defensive {} fallback for null/undefined)"
  - "audit_log row written on every successful sync (action=sync_sales_order|sync_ns_invoice|sync_arena_doc|sync_mes_work_order)"
affects: [25-03-integration-tests, 26-data-densification, 28-ui-overhaul]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pull-only sync: read legacy turion.* + mutate turion_satellite.* FKs in single BEGIN/COMMIT transaction (never auto-create part_definitions)"
    - "Idempotent set-or-skip: SELECT existing → INSERT new OR UPDATE existing OR skipped++ if already linked"
    - "Defensive source-data parsing: Array.isArray(source_data?.lineItems), multi-field part_number probe (partNumber|part_number|itemId|item)"
    - "Body-param style for arena-doc + mes-work-order (legacy IDs contain Unicode middle dot + spaces — fragile in URL paths)"
    - "Regex part-number extraction for arena_docs.source_data.linked with whereUsed fallback (/^([A-Z]+(?:-[A-Z0-9]+)+)/)"
    - "Hardened error pattern enforced: console.error('[integration] sync-X failed:', err) + res.status(500).json({error:'Failed to ...'}) — NO detail leak"
    - "HTTP 200 with {matches:0, reason:'...'} for no-match, HTTP 4xx only for malformed input"
    - "Fully-qualified schema names everywhere (turion.* and turion_satellite.*) — pgbouncer-safe"

key-files:
  created:
    - "/Users/jeet/turion-satellite/backend/src/lib/spec-keys.ts"
    - "/Users/jeet/turion-satellite/backend/src/routes/integration.ts"
  modified:
    - "/Users/jeet/turion-satellite/backend/src/routes/parts.ts"
    - "/Users/jeet/turion-satellite/backend/src/app.ts"

key-decisions:
  - "Single integration.ts router (not 4 files) — 4 small endpoints (~80 lines each) more discoverable as one file than split"
  - "Match by part_number is STRICT case-sensitive equality — locked by CONTEXT.md decision 'no fuzzy matching'; documented in code comments"
  - "sync-ns-invoice v1 matches by part_number ALONE, NOT part_number+vendor pair — invoice.source_data.vendor is free text and vendor_orders.vendor_id is UUID; vendor pair refinement deferred to Phase 26"
  - "audit_log actor_email logs req.user.id (same UUID as actor_user_id) — JWT payload doesn't carry email; Phase 26 can refine"
  - "candidates_tried / candidate_tried / match_via included in no-match responses — debugging aid for Phase 26 densification scripts"
  - "404 for source-row-not-found (e.g. SO doesn't exist) vs 200-with-reason for source-found-but-no-match (lineItems missing) — distinguishes malformed input from valid but empty data"
  - "Defensive `if (part.specifications == null) part.specifications = {}` in parts GET /:id — cheap insurance against legacy rows or degraded paths"

patterns-established:
  - "Pull-only sync skeleton: BEGIN → fetch source (turion.*) → extract candidates → match part_definitions → mutate FK in turion_satellite.* → audit_log → COMMIT"
  - "Cross-schema query pattern: always fully-qualify (FROM turion.X / FROM turion_satellite.Y) — never bare names"
  - "Idempotent sync responses: {created, linked, skipped, matches} where created+linked=mutations, skipped=already-linked no-ops"

requirements-completed: [Linkage, Sync, Specifications, Mutation]

# Metrics
duration: 3 min
completed: 2026-05-10
---

# Phase 25 Plan 02: Backend Integration Sync Endpoints Summary

**4 pull-only sync endpoints, 1 documentation library, and parts API enhancement landed in `turion-satellite` — cross-schema integration surface ready for Phase 26 densification scripts and Phase 28 unified UI.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-10T21:16:10Z
- **Completed:** 2026-05-10T21:18:58Z
- **Tasks:** 3 (auth library + integration router + app mount)
- **Files created:** 2
- **Files modified:** 2

## Accomplishments

- 4 POST endpoints under `/api/integration/*` shipped: sync-sales-order, sync-ns-invoice, sync-arena-doc, sync-mes-work-order
- spec-keys.ts library shipped with `CommonSpecKeys` interface + 3 named constants (COMMON_SPEC_KEYS, SPEC_KEY_LABELS, SUBSYSTEM_SPEC_HINTS) — Phase 28 frontend will import for friendly-label rendering
- `GET /api/parts/:id` now surfaces the `specifications` JSONB field with defensive `{}` fallback
- All 4 sync endpoints use the hardened error pattern (no `detail: err.message` leak)
- All 4 sync endpoints write to `turion_satellite.audit_log` with `action='sync_*'` on success
- Pgbouncer-safe: every SQL query fully-qualifies its schema (turion.* / turion_satellite.*)
- All 4 endpoints idempotent: re-running with same identifiers returns `skipped++` (verified by code path — actual smoke test deferred to plan 25-03 / 25-04)
- Zero regressions: 188 existing tests still pass (1 skipped — pre-existing), tsc --noEmit clean

## Endpoint Summary

| Method + Path | Body | Source Read | Mutation Target | Returns |
|---|---|---|---|---|
| `POST /api/integration/sync-sales-order/:salesOrderId` | `{satelliteId}` | `turion.sales_orders.source_data.lineItems[*].partNumber` | `turion_satellite.part_instances.sales_order_id` (creates or links) | `{created, linked, skipped, matches, reason?}` |
| `POST /api/integration/sync-ns-invoice/:invoiceId` | `{}` | `turion.invoices.source_data.lineItems[*].partNumber` (fallback: `source_data.item`) | `turion_satellite.vendor_orders.ns_invoice_id` | `{linked, skipped, matches, reason?, candidates_tried?}` |
| `POST /api/integration/sync-arena-doc` | `{docId}` | `turion.arena_docs.source_data.linked` (regex `/^([A-Z]+(?:-[A-Z0-9]+)+)/`) → fallback `source_data.whereUsed` | `turion_satellite.part_instances.arena_doc_id` | `{linked, skipped, matches, reason?, match_via?, candidate_tried?}` |
| `POST /api/integration/sync-mes-work-order` | `{woId}` | `turion.work_orders.source_data.item` (clean string) | `turion_satellite.part_instances.mes_work_order_id` | `{linked, skipped, matches, reason?, candidate_tried?}` |

All endpoints: `requireAuth`, hardened errors, audit_log on success, HTTP 200 on no-match with `reason`, HTTP 4xx for malformed input, HTTP 404 if the source row truly doesn't exist.

## Task Commits

| Task | Commit | Files |
|---|---|---|
| 1: spec-keys library + parts GET /:id surfacing | `427d000` | `backend/src/lib/spec-keys.ts` (new, 63 lines), `backend/src/routes/parts.ts` (+3 lines) |
| 2: integration router with 4 sync endpoints | `d70ca6d` | `backend/src/routes/integration.ts` (new, 398 lines) |
| 3: mount /api/integration in app.ts | `b93be0d` | `backend/src/app.ts` (+3 lines: import + mount + comment) |

All 3 commits authored `jeet-avatar <jm@techcloudpro.com>` and pushed to `github.com/jeet-avatar/turion-satellite` (`origin/main..HEAD` empty after push).

## Files Created

- `/Users/jeet/turion-satellite/backend/src/lib/spec-keys.ts` — 63 lines. Exports: `CommonSpecKeys` interface (9 optional fields with JSDoc), `COMMON_SPEC_KEYS` (readonly array of 9 keys), `SPEC_KEY_LABELS` (Record<string,string> with friendly labels for all 9 common keys), `SUBSYSTEM_SPEC_HINTS` (Record<string,string[]> for EPS/STR/ADCS/PROP free-form hints). v1 is convention-only — no Zod, no JSON Schema, no DB CHECK.
- `/Users/jeet/turion-satellite/backend/src/routes/integration.ts` — 398 lines. Exports default Router with 4 POST endpoints. Header comment block documents conventions: requireAuth, BEGIN/COMMIT/ROLLBACK transaction, fully-qualified schemas, hardened errors, audit logging, strict case-sensitive part_number match.

## Files Modified

- `/Users/jeet/turion-satellite/backend/src/routes/parts.ts` — GET `/:id` handler updated: explicit SQL comment that `pd.*` includes specifications JSONB (Phase 25 migration 009), plus defensive `if (part.specifications == null) part.specifications = {}` insurance against legacy rows or degraded paths. Other handlers (list, drawing, process, children) unchanged.
- `/Users/jeet/turion-satellite/backend/src/app.ts` — added `import integrationRouter from './routes/integration'` and `app.use('/api/integration', integrationRouter)` mount.

## Decisions Made

- **Single integration.ts router (not 4 files)** — 4 small endpoints (~80 lines each) are more discoverable as one file than split. RESEARCH.md primary recommendation.
- **Strict case-sensitive part_number matching** — locked by CONTEXT.md decision #5 ("no fuzzy matching"). Documented in 3 places in the code (header comment + endpoint-level comments for sync-arena-doc and sync-mes-work-order). Callers must normalize source data; mismatches surface as `{matches:0, candidates_tried:[...]}` for debugging.
- **sync-ns-invoice v1 matches by part_number ALONE** — vendor pair refinement deferred to Phase 26 because `invoice.source_data.vendor` is free text and `vendor_orders.vendor_id` is a UUID requiring a separate name lookup. Documented explicitly in plan SUMMARY truths and in code comments.
- **audit_log actor_email = req.user.id (UUID, not email)** — JWT payload doesn't carry email; the same UUID is written to both actor_user_id and actor_email columns. Acceptable v1 per Plan 25-02 critical_constraints. Phase 26 may refine if needed.
- **`candidates_tried` / `candidate_tried` / `match_via` in no-match responses** — debugging aid for Phase 26 densification scripts and Phase 28 UI when they encounter zero-match cases.
- **404 vs 200-with-reason boundary** — `404` only when the source row truly doesn't exist (e.g. SO ID has no row in `turion.sales_orders`). `200` with `{matches:0, reason:'...'}` when the request was valid but data didn't match (no lineItems, no part_numbers, no definition matches). Matches CONTEXT.md §Mutation.
- **Defensive `{}` fallback for specifications in parts GET /:id** — migration 009 adds `NOT NULL DEFAULT '{}'::jsonb` so every row has it, but `if (part.specifications == null) part.specifications = {}` is cheap insurance against legacy rows or future-degraded paths that might return null.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks verified against their `<verify>` blocks:

- Task 1: spec-keys.ts has all 4 named exports (CommonSpecKeys interface + COMMON_SPEC_KEYS + SPEC_KEY_LABELS + SUBSYSTEM_SPEC_HINTS); parts.ts has 3 mentions of `specifications` (1 SQL comment + 1 JS comment + 1 defensive coercion).
- Task 2: integration.ts has 1 `router.post('/sync-sales-order/:salesOrderId'`, 1 `router.post('/sync-ns-invoice/:invoiceId'`, 1 `router.post('/sync-arena-doc'`, 1 `router.post('/sync-mes-work-order'`. requireAuth referenced 6 times (1 import + 1 router declaration + 4 endpoint usages — matches expected). 4 `INSERT INTO turion_satellite.audit_log`, 4 `FROM turion.` cross-schema SELECTs, 4 `Failed to sync` hardened errors, 0 `detail:` leaks. 398 lines (≥250 required).
- Task 3: 1 `import integrationRouter`, 1 `app.use('/api/integration'` in app.ts. Full vitest run: 188 passed | 1 skipped (zero regressions). tsc --noEmit clean. Commit `b93be0d` pushed; `origin/main..HEAD` empty.

**Total deviations:** 0
**Impact on plan:** None — plan was already complete and accurate.

## Authentication Gates

None — no auth required for this plan (purely local code authoring + git push to an already-configured remote).

## Issues Encountered

None — every `<verify>` block passed first try. The stderr noise in the test run (`stderr | tests/parts.test.ts > GET /api/parts/:partDefId/children > returns 500 without leaking error detail`) is the hardened-error console.error call firing during a deliberately-failing test path — that's expected behavior, not an issue.

## Verification Proof

Per CLAUDE.md Verification Protocol (mandatory):

- **Grep proof:** All expected counts confirmed (1 CommonSpecKeys interface, 1 COMMON_SPEC_KEYS, 1 SPEC_KEY_LABELS, 1 SUBSYSTEM_SPEC_HINTS, 3 `specifications` mentions in parts.ts, 1 of each `router.post('/sync-*` declaration, 6 requireAuth references, 4 `INSERT INTO turion_satellite.audit_log`, 4 `FROM turion.`, 4 `Failed to sync`, 0 `detail:` leaks, 1 `import integrationRouter`, 1 `app.use('/api/integration'`).
- **Run proof (tsc):** `cd /Users/jeet/turion-satellite/backend && npx tsc --noEmit` exits 0 with zero errors after every task.
- **Run proof (tests):** `npx vitest run` final pass = `Test Files  28 passed | 1 skipped (29)` / `Tests  188 passed | 1 skipped (189)`. Zero regressions from Phase 24 baseline.
- **Run proof (commits + push):** 3 `phase-25-02` commits in `git log --oneline -4`. `git log --oneline origin/main..HEAD` empty (everything pushed). HEAD = `b93be0d`. Author = `jeet-avatar <jm@techcloudpro.com>`.
- **E2E proof:** Endpoint-level smoke testing (curl against deployed API) deferred to plan 25-04 (deploy). Plan 25-03 (tests) will add Vitest coverage with mocked pool/client for all 4 endpoints. Plan 25-02 scope is "code lands, typechecks, doesn't regress existing tests" — all 3 satisfied.

## User Setup Required

None — all changes are server-side TypeScript + Express routing. No env vars or external service configuration changed.

## Next Phase Readiness

**Plan 25-03 (integration sync endpoint tests) is unblocked:**
- 4 endpoints mounted under `/api/integration/*`; supertest+vitest can exercise them.
- Mock pattern from `tests/parts.test.ts` (vi.mock('../src/db') with `pool.connect()` returning a `{query, release}` mock client) maps directly to the new endpoints.
- Recommended coverage: 3 cases per endpoint (happy path, no-match, idempotent re-run) + auth gate + hardened error → ~20 tests total.

**Plan 25-04 (deploy to AWS Lambda) is unblocked but waits on plan 25-03 tests:**
- Lambda handler `turion-satellite-api` will pick up the new router automatically (mounted in app.ts → exported app → Mangum wrapper).
- No infrastructure changes needed; same APIGW route catches `/api/integration/*`.

**No blockers.** turion-satellite repo HEAD is `b93be0d` on origin/main; backend builds cleanly; existing tests still pass; cross-schema FK columns + audit_log capacity from Plan 25-01 are live and ready for the new sync handlers to write to.

---

*Phase: 25-schema-unification-cross-system-integration*
*Completed: 2026-05-10*

## Self-Check: PASSED

- SUMMARY.md exists at expected path
- backend/src/lib/spec-keys.ts exists (63 lines, 4 named exports)
- backend/src/routes/integration.ts exists (398 lines, 4 POST endpoints)
- backend/src/routes/parts.ts present with 3 `specifications` mentions
- backend/src/app.ts mounts `/api/integration`
- turion-satellite commits 427d000, d70ca6d, b93be0d present in git log
- origin/main..HEAD is empty (all commits pushed)
- tsc --noEmit clean (zero errors)
- vitest run: 188 passed | 1 skipped (zero regressions)
