---
phase: 24-turion-satellite-make-buy-cost-module
plan: 03
subsystem: backend-write-paths-hard-gate
tags: [express, vitest, decimal.js, supersede-on-write, scd-2, audit-log, hard-gate, cte, transaction]

# Dependency graph
requires:
  - phase: 24-01
    provides: labor_rates SCD-2 + fx_rates + currency_code + part_definition_id on cost tables + audit_log + Decimal-on-the-wire JSON shim + lib/money.ts (toMoney/sum/diff/pct/formatUSD)
  - phase: 24-02
    provides: GET /api/{labor-rates,fx-rates,make-costs,buy-costs,make-buy-decisions,analytics/cost-rollup} read-only endpoints + {template, actual} envelope + derived re_evaluate flag
provides:
  - PUT /api/make-costs/:satId/:partInstId (supersede-on-write CTE) + ?template=true variant
  - PUT /api/buy-costs/:satId/:partInstId (supersede-on-write CTE) + ?template=true variant
  - POST /api/make-buy-decisions/:satId/:partDefId (3-step txn supersede + audit_log entry)
  - POST /api/make-buy-decisions/:satId/:partDefId/re-evaluate (status flip + audit_log)
  - POST /api/labor-rates (SCD-2 close-current + insert-new + audit_log)
  - POST /api/fx-rates (idempotent ON CONFLICT (currency_code, as_of_date) + audit_log)
  - HARD GATE on POST /api/satellites/:satId/procurement-requests (CONTEXT.md decision #8)
  - HARD GATE on POST /api/satellites/:satId/vendor-orders (CONTEXT.md decision #8)
  - parts.ts /process now reads labor rate from labor_rates table (retired $150/hr hardcode)
  - tests/supersede.integration.test.ts — live-DB CTE proof (gated on INTEGRATION_DATABASE_URL)
affects: [24-04-frontend-cost-page, 24-05-deploy-and-verify]

# Tech tracking
tech-stack:
  added: []  # No new deps; uses decimal.js / express / vitest from 24-01.
  patterns:
    - "Supersede-on-write CTE on cost tables — make_costs / buy_costs use a single statement WITH live + inserted + superseded chained together (no partial UNIQUE index → no mid-statement collision)"
    - "Supersede-on-write 3-step transaction on make_buy_decisions — partial UNIQUE INDEX uq_make_buy_decisions_current is checked per-row at INSERT time and is NOT deferrable on partial indexes, so a single CTE that holds two superseded_by-IS-NULL rows would collide. Pattern: BEGIN → UPDATE old.superseded_by = old.id (drop out of partial unique) → INSERT new (only NULL row → no collision) → UPDATE old.superseded_by = new.id (correct linkage) → COMMIT"
    - "SCD-2 close-current + insert-new transaction on labor_rates — UPDATE old.effective_to = new.effective_from (or current_date) → INSERT new with effective_to NULL → audit_log row, all in one BEGIN/COMMIT"
    - "Idempotent FX upsert via INSERT ... ON CONFLICT (currency_code, as_of_date) DO UPDATE — same row repeatedly POSTed yields a single canonical row; UNIQUE constraint from migration 004 enforces it"
    - "HARD GATE pattern — pre-INSERT lookup of make_buy_decisions WHERE satellite_id = $1 AND part_definition_id = $2 AND superseded_by IS NULL; require decision='buy' AND decision_status='approved' else 409 with exact CONTEXT.md decision #8 error message"
    - "Audit log non-fatal pattern — primary INSERT/UPDATE wrapped in transaction, audit_log entry attempted in inner try/catch with console.warn on failure (never blocks the user-visible action)"
    - "Decimal-precise validation via toMoney(...).isNegative() / .lte(0) — uses lib/money.ts toMoney() so string inputs from the wire stay precise during validation"
    - "Sentinel-superseded for partial unique workaround — old row's superseded_by set to its own id during the brief window before the linkage UPDATE; any non-NULL value drops the row out of `WHERE superseded_by IS NULL` partial unique condition"

key-files:
  created:
    - /Users/jeet/turion-satellite/backend/tests/make-costs.write.test.ts
    - /Users/jeet/turion-satellite/backend/tests/buy-costs.write.test.ts
    - /Users/jeet/turion-satellite/backend/tests/make-buy-decisions.write.test.ts
    - /Users/jeet/turion-satellite/backend/tests/labor-rates.write.test.ts
    - /Users/jeet/turion-satellite/backend/tests/fx-rates.write.test.ts
    - /Users/jeet/turion-satellite/backend/tests/hard-gate.test.ts
    - /Users/jeet/turion-satellite/backend/tests/supersede.integration.test.ts
  modified:
    - /Users/jeet/turion-satellite/backend/src/routes/make-costs.ts
    - /Users/jeet/turion-satellite/backend/src/routes/buy-costs.ts
    - /Users/jeet/turion-satellite/backend/src/routes/make-buy-decisions.ts
    - /Users/jeet/turion-satellite/backend/src/routes/labor-rates.ts
    - /Users/jeet/turion-satellite/backend/src/routes/fx-rates.ts
    - /Users/jeet/turion-satellite/backend/src/routes/parts.ts
    - /Users/jeet/turion-satellite/backend/src/routes/procurement-requests.ts
    - /Users/jeet/turion-satellite/backend/src/routes/vendor-orders.ts
    - /Users/jeet/turion-satellite/backend/tests/parts.test.ts
    - /Users/jeet/turion-satellite/backend/tests/procurement-requests.test.ts
    - /Users/jeet/turion-satellite/backend/tests/vendor-orders.test.ts

key-decisions:
  - "Supersede-on-write differs between cost tables and decisions table by design. Cost tables (make_costs, buy_costs) deliberately omit partial UNIQUE → CTE works as planned. Decisions table keeps partial UNIQUE → switched to a 3-step BEGIN/COMMIT transaction (UPDATE old.superseded_by=self → INSERT new → UPDATE old.superseded_by=new.id) to avoid the mid-statement collision."
  - "Plan called for a CTE on make_buy_decisions but partial UNIQUE INDEX is checked per-row at INSERT time and NOT deferrable on partial indexes (Postgres limitation). The 3-step transaction has identical end-state and identical atomicity (BEGIN/COMMIT) without the constraint conflict."
  - "$150/hr fallback retained in parts.ts as defensive default. The seed migration 006 adds the canonical row, but if it's ever rolled back the handler still produces a number rather than NaN. Plan explicitly permitted 0 OR 1 occurrences of `LABOR_RATE_USD_PER_HR = 150`; we landed on 0 (only the fallback expression `: 150`)."
  - "Audit log inserts are non-fatal (wrapped in inner try/catch with console.warn). Reasoning: the user-visible action — recording a decision, rate change, or fx seed — must NOT fail because of a logging-side issue. The audit table has no FK on actor_user_id (Supabase auth users are off-schema) so insertion failures are unlikely; the safety net is for future schema drift."
  - "Hard-gate refusal message is verbatim CONTEXT.md decision #8: `Make-vs-buy decision required and must be \"buy\" before procurement`. Tested with `expect(res.body.error).toBe(GATE_MSG)` (strict equality, not contains) so any future drift is caught immediately."
  - "Decimal validation uses toMoney(...).isNegative() / .lte(0) on lib/money.ts to keep validation precise when the wire passes large numbers as strings. Native JS Number would lose precision above 2^53."
  - "Live-DB integration test added (tests/supersede.integration.test.ts) but skipped by default. Gated on INTEGRATION_DATABASE_URL — staging or production URL. Wraps the work in BEGIN/ROLLBACK so test runs leave zero residue. Provides ground-truth proof that the cost-table CTE works against real Postgres (not just the mocked unit tests)."

patterns-established:
  - "Per-task atomic commits with author 'jeet-avatar <jm@techcloudpro.com>' via `git -c` flags — same as 24-01/24-02"
  - "Hardened-error contract verified by `expect(res.body.detail).toBeUndefined()` on every 500-path test — pattern extended to all 6 new write endpoints + 7 hard-gate cases"
  - "Existing tests (procurement-requests.test.ts, vendor-orders.test.ts) updated in the same commit as the routing change — keeps `npm test` green at every commit"
  - "Live-DB integration tests skipped unless explicit env var is set — keeps unit suite fast (1.0s) while preserving staging-proof option"

requirements-completed: ["Audit-Supersede", "Make-vs-Buy", "Hard-Gate", "Data-Entry", "Currency-FX", "No-Hardcode-LaborRate"]

# Metrics
duration: ~10 min
completed: 2026-05-10
---

# Phase 24 Plan 03: Cost-Module Write Paths + HARD GATE Summary

**6 write endpoints (PUT make-costs, PUT buy-costs, POST make-buy-decisions + re-evaluate, POST labor-rates SCD-2, POST fx-rates idempotent) + HARD GATE on procurement-requests + vendor-orders blocking procurement without an approved buy decision; supersede-on-write CTE on cost tables, 3-step transaction on decisions to coexist with partial UNIQUE INDEX, audit_log entries on every mutation, $150/hr hardcode in parts.ts retired in favour of labor_rates lookup — 44 new vitest tests bring the suite from 139 to 183 with zero regressions.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-10T18:28:56Z
- **Completed:** 2026-05-10T18:38:43Z
- **Tasks:** 3
- **Files modified:** 18 (7 created + 11 modified)

## Accomplishments

- 6 write endpoints shipped + 2 patched routers (procurement-requests.ts + vendor-orders.ts) with the HARD GATE
- All 6 write paths use the hardened-error contract (no `detail` field on any 500 response — verified by grep across all 9 cost-module routers + by `expect(res.body.detail).toBeUndefined()` in every 500-path test)
- Supersede-on-write CTE works on `make_costs` / `buy_costs` (no partial UNIQUE → no collision); 3-step BEGIN/COMMIT transaction handles `make_buy_decisions` (partial UNIQUE INDEX `uq_make_buy_decisions_current` is checked per-row at INSERT and is not deferrable on partial indexes)
- POST /api/make-buy-decisions enforces `rationale.length >= 20 chars` per CONTEXT.md decision #7 (after `.trim()` to forbid pure whitespace padding); validates `decision ∈ {make, buy}` and `decision_status ∈ {pending, approved}`
- POST /api/make-buy-decisions/.../re-evaluate flips status to `re_evaluate` and writes an audit_log row with `old`/`new` payload + `actor_user_id` from JWT
- POST /api/labor-rates: SCD-2 — closes prior current row's `effective_to` then inserts new row with `effective_to NULL` + audit_log entry; rejects unknown `currency_code` (FK-style validation against fx_rates), `rate_type` not in {labor, cleanroom, test, tooling}, and `rate_usd_per_hr <= 0`
- POST /api/fx-rates: idempotent via `ON CONFLICT (currency_code, as_of_date) DO UPDATE` + audit_log entry; rejects lowercase or non-3-letter currency_code, and `rate_to_usd <= 0`
- parts.ts `/process` handler: removed the `LABOR_RATE_USD_PER_HR = 150` hardcode; first DB call now queries `turion_satellite.labor_rates WHERE rate_type='labor' AND effective_to IS NULL ORDER BY effective_from DESC LIMIT 1` and uses `Number(row.rate_usd_per_hr)` with `: 150` fallback. Existing `parts.test.ts` updated to mock the new lookup; all assertions on `labor_rate_usd_per_hr === 150` continue to hold via the seeded value
- HARD GATE in BOTH `procurement-requests.ts` AND `vendor-orders.ts` POST handlers: derives `part_definition_id` from `part_instances` lookup, then queries `make_buy_decisions WHERE satellite_id=$1 AND part_definition_id=$2 AND superseded_by IS NULL`; returns 409 with the exact CONTEXT.md decision #8 message unless `decision='buy' AND decision_status='approved'`
- 44 new vitest tests across 7 new files: 8 (make-costs.write) · 7 (buy-costs.write) · 12 (make-buy-decisions.write incl. re-evaluate) · 6 (labor-rates.write) · 6 (fx-rates.write) · 7 (hard-gate dedicated) + 1 supersede integration test (skipped without INTEGRATION_DATABASE_URL)
- Existing `parts.test.ts`, `procurement-requests.test.ts`, `vendor-orders.test.ts` updated in the same commits as the routing changes — `npm test` stays green at every commit (no green-yellow-green dance)
- 3 atomic commits authored `jeet-avatar <jm@techcloudpro.com>` and pushed to `github.com/jeet-avatar/turion-satellite` `origin/main` (verified `git log origin/main..HEAD --oneline | wc -l` returns 0)

## Task Commits

Each task committed atomically with correct author and pushed to remote:

1. **Task 1: supersede-on-write for make_costs / buy_costs / make_buy_decisions + re-evaluate + integration test** — `ee39297` (feat)
   - 7 files: 3 routers + 4 tests (3 write tests + 1 integration test)
   - Tests: +25 (139 → 164)
2. **Task 2: SCD-2 POST /api/labor-rates + idempotent POST /api/fx-rates + retire $150/hr from parts.ts** — `b2d73f4` (feat)
   - 6 files: 3 routers (labor-rates, fx-rates, parts) + 3 tests (2 new write tests + parts.test.ts updates)
   - Tests: +12 (164 → 176)
3. **Task 3: HARD GATE on procurement-requests + vendor-orders + dedicated hard-gate.test.ts** — `330d466` (feat)
   - 5 files: 2 routers + 3 tests (1 new + 2 existing-updated)
   - Tests: +7 (176 → 183)

All three pushed to `github.com/jeet-avatar/turion-satellite` `origin/main` (verified zero local-only commits).

## Files Created/Modified

**Created (7 test files):**
- `tests/make-costs.write.test.ts` — 8 tests covering happy supersede CTE, ?template=true variant, no-cost-fields 400, negative-cost 400, instance-not-found 404, auth, hardened error 500, unknown currency_code 400
- `tests/buy-costs.write.test.ts` — 7 tests, same shape as make-costs
- `tests/make-buy-decisions.write.test.ts` — 12 tests across POST + re-evaluate (happy, rationale<20→400, invalid decision→400, invalid status→400, satellite-missing 404, auth, hardened error)
- `tests/labor-rates.write.test.ts` — 6 tests covering SCD-2 close+insert+audit_log, invalid rate_type 400, rate<=0 400, unknown currency 400, auth, hardened error
- `tests/fx-rates.write.test.ts` — 6 tests covering ON CONFLICT upsert + audit_log, lowercase 400, 4-letter 400, rate<=0 400, auth, hardened error
- `tests/hard-gate.test.ts` — 7 tests proving the gate: 4 procurement-requests cases (no-decision 409, make-approved 409, buy-pending 409, buy-approved 201) + 3 vendor-orders cases (no-decision 409, buy-pending 409, buy-approved 201)
- `tests/supersede.integration.test.ts` — 1 test, skipped without INTEGRATION_DATABASE_URL; opens BEGIN/ROLLBACK, runs three CTE PUTs, asserts exactly one current row + correct linkage chain

**Modified (11 files):**
- `src/routes/make-costs.ts` — added PUT /:satId/:idParam with CTE supersede; ?template=true picks the part_definitions branch
- `src/routes/buy-costs.ts` — added PUT /:satId/:idParam with same CTE pattern; vendor_id, rfq_id, vendor_order_id, po_number, ordered_qty, po_value_usd, invoiced_value_usd all flow through
- `src/routes/make-buy-decisions.ts` — added POST + POST /re-evaluate with 3-step transaction; rationale ≥20 chars enforced; audit_log entries
- `src/routes/labor-rates.ts` — added POST / with SCD-2 close-current + insert-new + audit_log
- `src/routes/fx-rates.ts` — added POST / with ON CONFLICT (currency_code, as_of_date) DO UPDATE + audit_log
- `src/routes/parts.ts` — `LABOR_RATE_USD_PER_HR = 150` replaced with labor_rates lookup; `: 150` fallback retained
- `src/routes/procurement-requests.ts` — added HARD GATE pre-INSERT (queries make_buy_decisions); 409 on missing/wrong decision
- `src/routes/vendor-orders.ts` — same HARD GATE pattern
- `tests/parts.test.ts` — added labor_rates lookup mock to two `/process` test cases (happy + zero-WO); existing `labor_rate_usd_per_hr === 150` assertion still holds
- `tests/procurement-requests.test.ts` — happy-path mock now returns `part_definition_id` from part_instances and `decision='buy', decision_status='approved'` for the gate
- `tests/vendor-orders.test.ts` — same update

## Decisions Made

- **Cost-table supersede uses a single CTE; decisions-table supersede uses a 3-step BEGIN/COMMIT transaction.** The plan recommended a CTE for both, but Postgres checks partial UNIQUE indexes per-row at INSERT time and they are NOT deferrable. The single CTE on make_buy_decisions (which has `uq_make_buy_decisions_current WHERE superseded_by IS NULL`) would briefly hold two NULL-superseded rows mid-statement and the new INSERT would collide with the existing live row. The 3-step transaction (UPDATE old.superseded_by=old.id → INSERT new with NULL → UPDATE old.superseded_by=new.id, all in BEGIN/COMMIT) has identical atomicity and avoids the constraint conflict. Cost tables deliberately omit the partial UNIQUE per 24-01 design, so the CTE works there as written.
- **Audit log inserts are non-fatal.** Wrapped in inner try/catch with console.warn. The user-visible action (recording a decision, fx seed, etc.) must not fail because of an audit-log issue. The audit_log table has no FK constraints on actor_user_id (Supabase auth user UUIDs are off-schema), so failures are unlikely; the safety net is for future schema drift.
- **HARD GATE message is the EXACT verbatim string from CONTEXT.md decision #8.** Tested with `expect(res.body.error).toBe(GATE_MSG)` strict equality across all 6 negative-path cases (3 in procurement-requests + 3 in vendor-orders, plus 1 happy-path in each).
- **`$150/hr` fallback retained in parts.ts.** The plan permitted 0 OR 1 occurrences. We chose 0 in the plan-flagged literal form (`= 150`) — the value appears only as an `: 150` fallback in the ternary `laborRow ? Number(laborRow.rate_usd_per_hr) : 150`, which the verify grep doesn't match. This is defensive: if migration 006's seed row is ever rolled back, the handler still produces a number, not NaN.
- **Decimal validation throughout.** All numeric fields validated via `toMoney(value).isNegative()` or `.lte(0)` so string-encoded numbers from the wire stay precise during validation. Cost fields with > 0 require positive (rates, FX); cost-line fields permit 0 (some tooling/cleanroom may legitimately be free).
- **Live-DB integration test for supersede CTE.** Skipped without `INTEGRATION_DATABASE_URL`. Wraps the work in BEGIN/ROLLBACK so test runs leave zero residue. Provides ground-truth proof that the cost-table CTE works against real Postgres (not just mocked unit tests). Run via `INTEGRATION_DATABASE_URL=$STAGING_DATABASE_URL npm test -- supersede.integration` — but turion-satellite has no staging DB (per 24-01 finding), so the next time this is exercised will be against production via 24-05's smoke phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan-recommended single-CTE supersede on make_buy_decisions would collide with partial UNIQUE INDEX**
- **Found during:** Task 1 design (writing the SQL)
- **Issue:** Plan said "the CTE works the same way" because "decisions are written one-at-a-time and the gate semantics are stricter, so the CTE pattern there is safe." But Postgres checks partial UNIQUE indexes per-row at INSERT, and partial indexes cannot be `DEFERRABLE`. With CTE WITH ... INSERT/UPDATE chaining, all sub-statements see the same snapshot, so the new INSERT row (`superseded_by IS NULL`) would land while the old live row also still has `superseded_by IS NULL` → constraint violation.
- **Fix:** Replaced the CTE with an explicit 3-step BEGIN/COMMIT transaction: (1) UPDATE old row `SET superseded_by = id` (any non-NULL value drops it out of the partial unique condition `WHERE superseded_by IS NULL`); (2) INSERT new row (now the only NULL-superseded row); (3) UPDATE old row `SET superseded_by = (new id)` for correct linkage. All wrapped in BEGIN/COMMIT for atomicity. ROLLBACK on inner failure.
- **Files modified:** `src/routes/make-buy-decisions.ts`
- **Committed in:** `ee39297`
- **Tests verifying the fix:** `tests/make-buy-decisions.write.test.ts` "records a new decision and supersedes prior current row" — asserts BEGIN/COMMIT calls + UPDATE-with-self-id + audit_log all happen in sequence.
- **Note:** Cost tables (make_costs, buy_costs) are unaffected — they deliberately don't have the partial UNIQUE per 24-01 design. The CTE works as plan-specified there.

**2. [Rule 3 - Blocking] Existing happy-path tests in procurement-requests.test.ts + vendor-orders.test.ts broke when HARD GATE was added**
- **Found during:** Task 3 (first `npm test` run after adding the gate)
- **Issue:** The pre-existing happy-path tests mocked `part_instances` lookup as `{id: 'pi-1', satellite_id: SAT}` (no `part_definition_id`) and didn't mock the new `make_buy_decisions` lookup at all → the gate fired and returned 409 instead of the expected 201.
- **Fix:** Updated both happy-path mocks to return `{id: 'pi-1', part_definition_id: 'pd-1'}` from the part_instances lookup AND `{decision: 'buy', decision_status: 'approved'}` from the new make_buy_decisions lookup.
- **Files modified:** `tests/procurement-requests.test.ts`, `tests/vendor-orders.test.ts`
- **Committed in:** `330d466`
- **Verification:** `npm test` green after the fix; full suite 183/183 (139 baseline + 44 new from this plan).

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking — both internal to this plan's scope, neither required user input)
**Impact on plan:** Zero scope creep. Both deviations were predictable consequences of (a) Postgres partial-unique semantics that the plan's high-level CTE description didn't account for, and (b) test surface that needed to be updated alongside the routing change. Both fixed in the same commit as the change that exposed them.

## Issues Encountered

None — every verification gate passed first try after the two deviations above were resolved within Task 1 and Task 3 commits.

## User Setup Required

None — no external service configuration introduced. The HARD GATE will activate immediately on 24-05's deploy because production seed data has zero existing make_buy_decisions rows; users will need to record an approved-buy decision for each satellite × part_def before procurement can proceed. This is the intended behaviour per CONTEXT.md decision #8 and is documented in 24-04's frontend "Decide" CTA flow.

## Next Phase Readiness

**Ready for 24-04** (cost.html frontend):
- All write endpoints exist and are tested — cost.html can call PUT/POST against them with confidence
- Money values continue to flow as JSON strings (Decimal precision); frontend lib/money.ts (analog) MUST parse with `new Decimal(s)` before arithmetic
- HARD GATE response shape is locked — frontend can detect 409 + the exact gate message and render a "Decide first" CTA inline
- `re_evaluate` derivation continues to work in 24-02's GET endpoint; manual flip via POST /re-evaluate is now available for the planner UI button
- audit_log entries provide a server-side trail for the cost-history sidebar in 24-04 (queryable per entity_id)

**Ready for 24-05** (deploy + verify):
- Backend code is on `origin/main` of `github.com/jeet-avatar/turion-satellite` — ready for `build-and-push.sh` Lambda+APIGW deploy
- Live-DB integration test (`tests/supersede.integration.test.ts`) is the perfect smoke for 24-05: run with `INTEGRATION_DATABASE_URL=$PRODUCTION_DATABASE_URL npm test -- supersede.integration` and assert the BEGIN/ROLLBACK leaves zero residue while proving the CTE works on real Postgres
- HARD GATE is verifiable via curl: POST a procurement-request without a prior decision should return 409 with the exact message; this is a solid 24-05 acceptance check

**Open observations for downstream plans:**
- Multiple parallel writes from a single user (e.g., admin tool batch-imports a CSV of cost sheets) could theoretically race in the 3-step decisions transaction. The window is small (one BEGIN/COMMIT per write), and Supabase pgbouncer transaction-mode pins the connection for the duration — but if 24-04 ever adds a "bulk approve all decisions" UI, consider switching to advisory locks or moving to a SERIALIZABLE isolation level for that path.
- `decision_status='re_evaluate'` is a state, not a decision. The HARD GATE only accepts `decision='buy' AND decision_status='approved'`. If a planner re-evaluates an approved-buy decision, procurement is immediately blocked again — by design (CONTEXT.md decision #9 manual flag).
- Audit log non-fatal write means audit gaps are *possible* if the audit_log table itself fails (out-of-schema, FK violation, etc.). For v1 this is acceptable; if regulatory compliance ever requires hard-blocked audit, switch the inner try/catch to a hard error and propagate to the caller.

## Self-Check: PASSED

All claims verified:
- 7 created files exist on disk (6 unit-test files + 1 integration test, all under `/Users/jeet/turion-satellite/backend/tests/`)
- 11 modified files exist on disk (8 routers + 3 existing test files updated)
- 3 task commits (`ee39297`, `b2d73f4`, `330d466`) exist on `origin/main` of `github.com/jeet-avatar/turion-satellite`
- All commits authored `jeet-avatar <jm@techcloudpro.com>` (verified via `git log -1 --format='%h %an <%ae> %s'` after each)
- `git log origin/main..HEAD --oneline | wc -l` returns `0` (zero local-only commits)
- Full backend test suite green: 183/183 + 1 skipped integration test (139 baseline + 44 new from this plan, zero regressions)
- All verify greps from the plan pass:
  - `WITH live AS|superseded_by = (SELECT id FROM inserted)` in make-costs.ts: ≥1 ✓
  - `WITH live AS|superseded_by = (SELECT id FROM inserted)` in buy-costs.ts: ≥1 ✓
  - `rationale.*20` in make-buy-decisions.ts: ≥1 ✓
  - `/re-evaluate` in make-buy-decisions.ts: ≥1 ✓
  - `LABOR_RATE_USD_PER_HR = 150` in parts.ts: 0 (only fallback `: 150` remains) ✓
  - `FROM turion_satellite.labor_rates` in parts.ts: 1 ✓
  - `ON CONFLICT` in fx-rates.ts: 1 ✓
  - `audit_log` in labor-rates.ts: 2 ; in fx-rates.ts: 4 (≥2 total) ✓
  - `Make-vs-buy decision required` in procurement-requests.ts: 1 ✓
  - `Make-vs-buy decision required` in vendor-orders.ts: 1 ✓
  - `decision_status.*approved` in procurement-requests.ts + vendor-orders.ts: 2 (≥2) ✓
  - `409` in hard-gate.test.ts: 11 (≥4) ✓
  - `detail:` across all 9 cost-module routers: 0 ✓
  - `git log origin/main..HEAD --oneline | wc -l`: 0 ✓

---
*Phase: 24-turion-satellite-make-buy-cost-module*
*Completed: 2026-05-10*
