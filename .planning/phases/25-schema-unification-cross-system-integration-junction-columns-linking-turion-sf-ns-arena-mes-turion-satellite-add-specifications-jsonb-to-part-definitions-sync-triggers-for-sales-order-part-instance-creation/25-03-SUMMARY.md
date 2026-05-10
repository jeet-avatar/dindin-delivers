---
phase: 25-schema-unification
plan: 03
subsystem: backend-tests
tags: [vitest, supertest, integration-tests, sync-endpoints, audit-log, hardened-errors, mock-pool, turion-satellite]

# Dependency graph
requires:
  - phase: 25-schema-unification
    plan: 02
    provides: 4 POST /api/integration/* sync endpoints + GET /api/parts/:id surfacing specifications JSONB
  - phase: 24-turion-satellite-make-buy-cost-module
    provides: vitest + supertest + ES256 JWT mocking pattern, vi.mock('../src/db') skeleton, hardened error assertion convention
provides:
  - "tests/integration.sales-order.test.ts — 11 cases covering POST /api/integration/sync-sales-order/:salesOrderId (401, 400 missing satelliteId, 404, 200 no-lineItems, 200 lineItems-without-partNumber, happy create, happy link, idempotent skipped, no-definition-matches with candidates_tried, hardened 500, audit_log assertion)"
  - "tests/integration.ns-invoice.test.ts — 9 cases covering POST /api/integration/sync-ns-invoice/:invoiceId (401, 404, no-part-numbers, top-level item fallback, no-vendor-order-matches, happy link, idempotent skipped, hardened 500, audit_log assertion)"
  - "tests/integration.arena-doc.test.ts — 10 cases covering POST /api/integration/sync-arena-doc (401, 400 missing docId, 404, no-part-number-extracted, happy via linked regex, fallback via whereUsed, no-part-instance-matches with candidate_tried+match_via, idempotent skipped, hardened 500, audit_log assertion)"
  - "tests/integration.mes-wo.test.ts — 9 cases covering POST /api/integration/sync-mes-work-order (401, 400 missing woId, 404, no-item-in-source-data, happy link, idempotent skipped, no-part-instance-matches with candidate_tried, hardened 500, audit_log assertion)"
  - "tests/parts.test.ts — extended GET /api/parts/:id describe block with 3 new cases asserting specifications JSONB surfacing (default {}, populated common keys, defensive null coercion)"
affects: [25-04-deploy, 26-data-densification, 28-ui-overhaul]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transaction-aware mock client: vi.mock('../src/db') exposes pool.connect()→mockClient {query, release}; mockClient.query.mockImplementation switches on SQL prefix (BEGIN/SELECT/INSERT/UPDATE/COMMIT/ROLLBACK)"
    - "Explicit unmocked SQL: any query string the impl doesn't recognise throws 'unmocked: <sql>' — silent test failures become impossible"
    - "Hardened-error assertion enforced in every integration test: expect(res.body.error).toBe('Failed to ...') + expect(res.body.detail).toBeUndefined()"
    - "Audit-log INSERT assertion: filter mockClient.query.mock.calls for SQL containing 'INSERT INTO turion_satellite.audit_log', assert exactly 1 call, check entity_id param + action/entity_type SQL literals"
    - "Happy-path + idempotent-rerun + no-match coverage triple for every sync endpoint — locks the contract against Plan 25-04 deploy and future Phase 26 modifications"

key-files:
  created:
    - "/Users/jeet/turion-satellite/backend/tests/integration.sales-order.test.ts"
    - "/Users/jeet/turion-satellite/backend/tests/integration.ns-invoice.test.ts"
    - "/Users/jeet/turion-satellite/backend/tests/integration.arena-doc.test.ts"
    - "/Users/jeet/turion-satellite/backend/tests/integration.mes-wo.test.ts"
  modified:
    - "/Users/jeet/turion-satellite/backend/tests/parts.test.ts"

key-decisions:
  - "Audit-log action assertion via SQL literal (not parameter) — action and entity_type are hardcoded in the INSERT VALUES clause in integration.ts (e.g. `VALUES ('sales_order', $1, 'sync_sales_order', ...)`). Tests assert auditCalls[0][0].toContain(\"'sync_sales_order'\") rather than checking params[1] which is the payload JSON."
  - "Per-test mockClient.query.mockImplementation (not module-level) — every test sets its own SQL-prefix switch so the test self-documents the exact mutation sequence (BEGIN, source SELECT, match SELECT, mutation, audit, COMMIT). beforeEach resets all mocks."
  - "Defensive null-coercion test added to parts.test.ts — Phase 25 migration 009 sets NOT NULL DEFAULT '{}'::jsonb so production rows should never be null, but the route handler defensively coerces (parts.ts:52 `if (part.specifications == null) part.specifications = {}`) and the test locks this safety net."
  - "Body-param tests for arena-doc + mes-wo include explicit 400 case for missing key (docId / woId) — even though the endpoints aren't user-facing today, this asserts the input-validation contract Phase 26 densification scripts will rely on."
  - "Top-level source_data.item fallback test for ns-invoice — both code path (lineItems → fallback to top-level item/itemId) covered in dedicated test to lock the dual-shape parsing contract."

patterns-established:
  - "Integration-endpoint test scaffold: vi.mock pool→mockClient + per-test mockImplementation + explicit unmocked-SQL throw + audit-log assertion + hardened-error assertion. Phase 26 densification scripts can copy this pattern for any new integration endpoint."
  - "Coverage matrix per sync endpoint: 401 / 400-where-applicable / 404 / clean-exit-with-reason / happy-create / happy-link / idempotent-skipped / no-match-with-debug-fields / hardened-500 / audit-log-issued. Future planners can reuse this matrix."

requirements-completed: [Linkage, Sync, Specifications]

# Metrics
duration: 4 min
completed: 2026-05-10
---

# Phase 25 Plan 03: Integration Sync Endpoint Tests Summary

**42 new vitest cases covering all 4 cross-schema sync endpoints + the specifications JSONB surfacing in `GET /api/parts/:id`. Test count 188 → 230. Zero regressions. Tests are the safety net for Plan 25-04 deploy and any future Phase 26 modifications.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-10T21:23:48Z
- **Completed:** 2026-05-10T21:27:52Z
- **Tasks:** 3 (sales-order+ns-invoice tests / arena-doc+mes-wo tests+parts.test.ts extension / full-suite verification + push)
- **Files created:** 4
- **Files modified:** 1

## Accomplishments

- **42 new test cases** locked into the suite (11 + 9 + 10 + 9 + 3 = 42); total now 230 passed (was 188), 1 skipped unchanged
- **4 new integration test files**, each ≥150 lines (sales-order 244, ns-invoice 187, arena-doc 210, mes-wo 186 — all exceed plan's min_lines thresholds)
- **All 4 integration test files** assert the hardened-error pattern (`res.body.detail === undefined`) — verified by grep
- **All 4 integration test files** assert the audit_log INSERT with matching action + entity_type — verified by grep + assertion
- **parts.test.ts extended** with 3 specifications cases (default {}, populated, defensive null coercion); 10 mentions of `specifications` now in the file (≥6 required)
- **Mock pattern locked**: `vi.mock('../src/db')` exposes `pool.connect()` returning `mockClient {query, release}`; per-test `mockClient.query.mockImplementation` switches on SQL prefix; any unhandled SQL throws `unmocked: <sql>` so silent test failures are impossible
- **Zero regressions**: every existing test still passes
- **tsc --noEmit clean** (zero TS errors)
- **2 commits pushed** to `github.com/jeet-avatar/turion-satellite`; `origin/main..HEAD` is empty after push

## Test Count Delta

| File | Before | After | Delta |
|---|---|---|---|
| tests/integration.sales-order.test.ts | (didn't exist) | 11 | +11 |
| tests/integration.ns-invoice.test.ts | (didn't exist) | 9 | +9 |
| tests/integration.arena-doc.test.ts | (didn't exist) | 10 | +10 |
| tests/integration.mes-wo.test.ts | (didn't exist) | 9 | +9 |
| tests/parts.test.ts | 21 | 24 | +3 |
| **Suite total** | **188** | **230** | **+42** |

(1 skipped test — `supersede-on-write CTE against live Postgres` — unchanged from Phase 24; it's gated on `INTEGRATION_DATABASE_URL` env var being set.)

## Coverage Matrix per Endpoint

| Case | sales-order | ns-invoice | arena-doc | mes-wo |
|---|---|---|---|---|
| 401 no-auth | yes | yes | yes | yes |
| 400 missing body param | yes (satelliteId) | n/a (no body) | yes (docId) | yes (woId) |
| 404 source row not found | yes | yes | yes | yes |
| 200 no-input-data clean exit | yes (no_line_items + no_part_numbers) | yes (no_part_numbers) | yes (no_part_number_extracted) | yes (no_item_in_source_data) |
| Happy path: create new instance | yes | n/a (no create path) | n/a (no create path) | n/a (no create path) |
| Happy path: link existing unlinked | yes | yes | yes | yes |
| Idempotent re-run: skipped | yes | yes | yes | yes |
| 200 no-match-but-input-valid (debug fields) | yes (no_definition_matches + candidates_tried) | yes (no_vendor_order_matches + candidates_tried) | yes (no_part_instance_matches + candidate_tried + match_via) | yes (no_part_instance_matches + candidate_tried) |
| Hardened 500 (no detail leak) | yes | yes | yes | yes |
| Audit_log INSERT issued (action+entity_type) | yes ('sync_sales_order'/'sales_order') | yes ('sync_ns_invoice'/'invoice') | yes ('sync_arena_doc'/'arena_doc') | yes ('sync_mes_work_order'/'work_order') |
| Endpoint-specific extras | n/a | top-level item fallback as candidate | match_via='whereUsed' fallback when linked has no match | n/a |

## Task Commits

| Task | Commit | Files |
|---|---|---|
| 1: sales-order + ns-invoice tests | `e564a2f` | `tests/integration.sales-order.test.ts` (new, 244 lines), `tests/integration.ns-invoice.test.ts` (new, 187 lines) |
| 2: arena-doc + mes-wo tests + parts.test.ts extension | `aebfec1` | `tests/integration.arena-doc.test.ts` (new, 210 lines), `tests/integration.mes-wo.test.ts` (new, 186 lines), `tests/parts.test.ts` (+47 lines for 3 new specifications cases) |
| 3: full suite + tsc + push | (no source changes — orchestration only; all commits already on origin) | n/a |

Both commits authored `jeet-avatar <jm@techcloudpro.com>` and pushed to `github.com/jeet-avatar/turion-satellite` (`origin/main..HEAD` empty after push). HEAD = `aebfec1`.

## Files Created

- `/Users/jeet/turion-satellite/backend/tests/integration.sales-order.test.ts` — 244 lines, 11 test cases covering POST /api/integration/sync-sales-order/:salesOrderId. Includes the full 9-step mutation sequence mock (BEGIN → source SELECT → match SELECT → instance SELECT → INSERT-or-UPDATE-or-skip → audit INSERT → COMMIT) plus failure paths (404, no-lineItems, no-part-numbers, no-definition-matches, hardened 500).
- `/Users/jeet/turion-satellite/backend/tests/integration.ns-invoice.test.ts` — 187 lines, 9 test cases. Includes top-level `source_data.item` fallback case (the dual-shape parsing path in integration.ts:177-180) and vendor-orders match-by-part_number-alone path (vendor pair refinement deferred to Phase 26).
- `/Users/jeet/turion-satellite/backend/tests/integration.arena-doc.test.ts` — 210 lines, 10 test cases. Includes regex-extraction happy path (`STR-ASSY · used by MES Stage 4` → `STR-ASSY`), whereUsed fallback case (linked has no match but whereUsed does), and the no-part-instance-matches case with full `candidate_tried` + `match_via` surfacing.
- `/Users/jeet/turion-satellite/backend/tests/integration.mes-wo.test.ts` — 186 lines, 9 test cases. Uses `source_data.item` clean-string parsing (no regex, per CONTEXT.md mes-wo is the simplest of the 4).

## Files Modified

- `/Users/jeet/turion-satellite/backend/tests/parts.test.ts` — extended `describe('GET /api/parts/:id', ...)` block with 3 new `it()` cases: (1) `returns specifications field with default {} when not set`, (2) `returns specifications field with populated common keys` (asserts weight_grams + material + flight_heritage shape), (3) `coerces null specifications to {} (defensive fallback)` (asserts the `if (part.specifications == null) part.specifications = {}` in routes/parts.ts:52). All 3 use `vi.mocked(queryOne).mockImplementation` with `{ ...mockPart, specifications: <value> }`. Lines 21-29 `mockPart` constant unchanged (no `specifications` field on the base mock — each test adds it as needed). +47 lines total.

## Decisions Made

- **Audit-log action assertion via SQL literal (not parameter)** — `action` and `entity_type` are hardcoded in the INSERT VALUES clause in `integration.ts` (e.g. `VALUES ('sales_order', $1, 'sync_sales_order', $2::jsonb, $3, $4)`). Tests assert `auditCalls[0][0]` (the SQL string) contains `"'sync_sales_order'"` and `"'sales_order'"` rather than checking `auditCalls[0][1][1]` which is the payload JSON. This locks the exact action string used in the DB; if a future refactor accidentally changed it to `sync_so` or `salesorder`, the test would fail.
- **Per-test mockClient.query.mockImplementation, not module-level** — every test sets its own SQL-prefix switch. This makes each test self-document the exact mutation sequence it expects (e.g., the happy-create-instance test shows BEGIN → SO SELECT → part_definitions SELECT → part_instances SELECT → INSERT instance → INSERT audit → COMMIT). `beforeEach(() => { vi.resetAllMocks(); mockClient.query.mockReset(); mockClient.release.mockReset(); })` resets between tests.
- **Explicit `unmocked: <sql>` throw on fall-through** — the last `throw new Error('unmocked: ' + sql)` in every mockImplementation makes silent test failures impossible. If integration.ts adds a new SELECT, the test will immediately fail with the exact unmocked SQL, not pass silently with wrong behavior.
- **3 specifications cases instead of 2** — the plan suggested 2 cases (default {} + populated). I added a third for defensive null coercion because routes/parts.ts:52 has explicit `if (part.specifications == null) part.specifications = {}` — that line deserves its own test. Plan's `min_lines: 0` for parts.test.ts modifications doesn't constrain it; grep count check (`>= 6 specifications mentions`) is satisfied (final count: 10).
- **Top-level `source_data.item` fallback test for ns-invoice** — integration.ts:177-180 has a dual-shape parsing fallback: lineItems empty → top-level `source_data.item` / `source_data.itemId`. The plan didn't explicitly call this out, but I added a dedicated test because legacy NS invoices in `turion.invoices` may use either shape, and the test locks the contract for both.
- **No-match `candidates_tried` / `candidate_tried` / `match_via` assertions** — each no-match test asserts these debug fields are surfaced (not just `{matches: 0, reason: '...'}`). Phase 26 densification scripts will rely on these fields to diagnose zero-match cases.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks verified against their `<verify>` blocks:

- Task 1: both files created (244 + 187 = 431 lines added); `npx vitest run` on the 2 files showed 20 passed; both files have `expect(res.body.detail).toBeUndefined()` (1 occurrence each); both files have audit_log assertion (1 occurrence each).
- Task 2: 2 new files + parts.test.ts extension; `npx vitest run` on the 3 files showed 43 passed (10 + 9 + 24); parts.test.ts has 10 `specifications` mentions (≥6 required); both new files have hardened-error assertion and audit_log assertion.
- Task 3: full vitest run = 230 passed | 1 skipped (was 188 passed | 1 skipped); tsc --noEmit clean; both commits pushed; `origin/main..HEAD` empty.

**Total deviations:** 0
**Impact on plan:** None — plan was already accurate and complete.

## Authentication Gates

None — no auth required for this plan (purely local test authoring + git push to an already-configured remote).

## Issues Encountered

None — every `<verify>` block passed first try. The stderr noise in the test run (`[integration] sync-sales-order failed: Error: connection refused` etc.) is the hardened-error `console.error` call firing during the deliberately-failing 500-case tests — that's expected behavior, not an issue.

## Verification Proof

Per CLAUDE.md Verification Protocol (mandatory):

- **Grep proof (file existence):** All 4 new test files exist; ls confirmed; parts.test.ts exists with 10 `specifications` mentions (was 0 before plan).
- **Grep proof (hardened-error pattern):** 1 occurrence of `expect(res.body.detail).toBeUndefined()` in each of the 4 integration test files.
- **Grep proof (audit_log assertion):** 1 occurrence of `INSERT INTO turion_satellite.audit_log` in each of the 4 integration test files (inside the assertion, plus mocks).
- **Run proof (tsc):** `cd /Users/jeet/turion-satellite/backend && npx tsc --noEmit` exit 0, zero errors.
- **Run proof (vitest):** Final `Test Files 32 passed | 1 skipped (33)` / `Tests 230 passed | 1 skipped (231)`. Baseline 188 → 230 = +42 new tests (matches plan estimate of +37 with my 5-test buffer).
- **Run proof (commits + push):** 2 `phase-25-03` commits in `git log --oneline -3` (e564a2f, aebfec1). `git log --oneline origin/main..HEAD` returns empty. HEAD = `aebfec1`. Author = `jeet-avatar <jm@techcloudpro.com>`.
- **E2E proof:** Endpoint-level smoke testing (curl against deployed API) is deferred to plan 25-04 (deploy). Plan 25-03 scope is "vitest coverage with mocked pool/client for all 4 endpoints + specifications surfacing" — fully satisfied.

Final vitest output (last 5 lines):
```
 ✓ tests/lifecycle-stages.test.ts (3 tests) 20ms
 ✓ tests/health.test.ts (2 tests) 14ms

 Test Files  32 passed | 1 skipped (33)
      Tests  230 passed | 1 skipped (231)
   Start at  14:27:25
   Duration  2.71s (transform 882ms, setup 0ms, collect 12.04s, tests 1.35s, environment 13ms, prepare 2.63s)
```

## User Setup Required

None — all changes are local test files + git push. No env vars or external service configuration changed.

## Next Phase Readiness

**Plan 25-04 (deploy to AWS Lambda) is unblocked:**
- All 4 integration endpoints have vitest coverage with hardened-error + audit_log assertions — regression risk is locked down before deploy.
- Full vitest suite passes; tsc clean; commits pushed.
- Lambda handler will pick up the existing routes (no infrastructure changes needed; same APIGW route catches `/api/integration/*`).
- Smoke test plan for 25-04 should curl each of the 4 endpoints against the deployed Lambda after the deploy completes, plus a GET /api/parts/:id to verify specifications surfacing.

**Phase 26 (data densification) is unblocked but waits on 25-04 deploy:**
- Densification scripts will call the 4 sync endpoints to populate the new FK columns.
- The vitest coverage matrix locks the endpoint contract so Phase 26 scripts can rely on stable response shapes (`{created, linked, skipped, matches, reason?}`).

**Phase 28 (UI overhaul) unblocked once Phase 26 ships:**
- `GET /api/parts/:id` now surfaces `specifications` JSONB; Phase 28 frontend can map common keys (weight_grams, material, flight_heritage, etc.) to friendly labels using `backend/src/lib/spec-keys.ts` exports.

**No blockers.** turion-satellite repo HEAD is `aebfec1` on origin/main; backend builds cleanly; full test suite (230 passed) green; Plan 25-04 deploy can ship immediately.

---

*Phase: 25-schema-unification-cross-system-integration*
*Completed: 2026-05-10*

## Self-Check: PASSED

- SUMMARY.md exists at expected path
- tests/integration.sales-order.test.ts exists (244 lines, 11 cases, audit_log + hardened-error assertions)
- tests/integration.ns-invoice.test.ts exists (187 lines, 9 cases, audit_log + hardened-error assertions)
- tests/integration.arena-doc.test.ts exists (210 lines, 10 cases, audit_log + hardened-error assertions)
- tests/integration.mes-wo.test.ts exists (186 lines, 9 cases, audit_log + hardened-error assertions)
- tests/parts.test.ts modified (24 tests, 10 `specifications` mentions, was 21 tests)
- turion-satellite commits e564a2f, aebfec1 present in git log
- origin/main..HEAD is empty (all commits pushed)
- tsc --noEmit clean (zero errors)
- vitest run: 230 passed | 1 skipped (was 188 passed | 1 skipped — +42 new tests, zero regressions)
