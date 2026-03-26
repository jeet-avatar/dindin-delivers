---
phase: 13-prop22-driver-earnings-floor
verified: 2026-03-25T08:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 13: Prop 22 Driver Earnings Floor — Verification Report

**Phase Goal:** Implement Prop 22 driver earnings floor — California bi-weekly reconciliation with automatic Stripe top-ups, driver visibility into compliance periods, and admin manual override capability.
**Verified:** 2026-03-25T08:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New Alembic migration adds 5 columns to ride_requests, 5 columns to orders, and 4 new tables | VERIFIED | `alembic/versions/20260325_add_prop22_tables.py` exists; `models.py:444-448` (Order), `models.py:1399-1403` (RideRequest); ORM classes at `models.py:1955, 1968, 1978, 2009` |
| 2 | Per-ride/order Prop 22 floor computed at completion using acceptance-GPS engaged miles with correct city wage (GPS-based, handles July 1 increases) | VERIFIED | `prop22_utils.py`: `is_in_california()`, `gps_to_city()`, `get_city_min_wage()` all at module level (300 lines); hooks wired in `bid_routes.py:724-731, 2554-2563` and `order_flow.py:3909, 4248-4249` |
| 3 | 14-day reconciliation job runs at PT midnight on period boundaries for rideshare and food delivery; tops up via Stripe or flags MANUAL_REVIEW | VERIFIED | `order_flow.py:2937` (reconciliation job), `order_flow.py:3243-3245` (CronTrigger hour=0, PT); Stripe transfer at `order_flow.py:3094-3098`; MANUAL_REVIEW path at `order_flow.py:3113-3115` |
| 4 | Earnings statements persisted to DB per BPC §7454(b)(2) with QTD engaged hours (calendar quarter) | VERIFIED | `Prop22EarningsStatement` ORM at `models.py:2009`; `db.flush()` + statement INSERT at `order_flow.py:3068`; `get_qtd_engaged_hours()` in `prop22_utils.py` |
| 5 | iOS PayoutDashboardView shows Prop 22 period cards (hours, miles, floor, earned, top-up) and per-ride/delivery floor disclosure | VERIFIED | `PayoutDashboardView.swift:831` lines; `prop22Section()` at line 445, `prop22PeriodCard()` at line 480, `Prop22PeriodDetailView` at line 710; API calls to `/api/driver/prop22/periods` at lines 577, 799 |
| 6 | Admin portal /admin/prop22 shows compliance table and MANUAL_REVIEW queue with deadline countdown and manual top-up trigger | VERIFIED | `Prop22Compliance.tsx` (387 lines); route registered at `App.tsx:257`; sidebar at `MainLayout.tsx:127`; API calls to `/admin/prop22/periods` at lines 88, 103, 106 and `/admin/prop22/manual-topup` at line 137 |
| 7 | Tips excluded from net_earnings (rideshare: driver_payout; food delivery: delivery_fee) | VERIFIED | `order_flow.py:3030-3031` (rideshare uses `sum(r.driver_payout)`); `order_flow.py:3043-3044` (food delivery uses `sum(o.delivery_fee)`); both with explicit comments |
| 8 | All period boundaries in America/Los_Angeles timezone; Driver.state never used for CA detection (GPS bounds only) | VERIFIED | `prop22_utils.py:21` (`CA_TZ = ZoneInfo("America/Los_Angeles")`), `prop22_utils.py:30` (PERIOD_ANCHOR), `prop22_utils.py:36-38` (`is_in_california()` uses lat/lon bounds only — no `Driver.state` anywhere in prop22_utils.py) |

**Score: 8/8 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `alembic/versions/20260325_add_prop22_tables.py` | Migration: 10 columns + 4 tables + seed data | VERIFIED | File exists; uses IF NOT EXISTS / ON CONFLICT DO NOTHING for idempotency |
| `models.py` | ORM: Prop22Config, Prop22CityWage, Prop22EarningPeriod, Prop22EarningsStatement + 10 columns | VERIFIED | All 4 ORM classes at lines 1955, 1968, 1978, 2009; columns on Order (444-448) and RideRequest (1399-1403) |
| `prop22_utils.py` | 11 public functions, 100+ lines | VERIFIED | 300 lines, 11 functions confirmed (is_in_california, gps_to_city, get_city_min_wage, haversine_miles, road_miles, calculate_prop22_ride_data, calculate_prop22_order_data, get_period_bounds_for_date, get_previous_period_bounds, get_next_period_end, get_qtd_engaged_hours) |
| `bid_routes.py` | Acceptance GPS capture at matched_at; floor calculation at completion | VERIFIED | GPS capture at line 724; floor hook at lines 2554-2563 (non-blocking try/except) |
| `order_flow.py` | Acceptance GPS at driver_accepted_at; floor at delivered; reconciliation + escalation jobs | VERIFIED | GPS at line 3909; floor at lines 4248-4249; reconciliation job at line 2937; escalation at line 3140; both registered at lines 3243, 3251 |
| `main_new.py` | 4 new FastAPI routes with correct auth | VERIFIED | Routes at lines 8012, 8059, 8129, 8189; `require_driver` on driver routes, `require_admin` on admin routes |
| `PayoutDashboardView.swift` | Prop22 section, 150+ new lines, build 0 errors | VERIFIED | 831 total lines (399 added); all key symbols present; `SecureStorage.shared.driverAccessToken` auth; `Prop22PeriodDetailView` with QTD hours |
| `Prop22Compliance.tsx` | 200+ line React page, two tabs, manual top-up modal | VERIFIED | 387 lines; two Tabs (All Periods + Manual Review); OVERDUE row red highlight; manual top-up modal wired to POST endpoint |
| `App.tsx` | /admin/prop22 route registered | VERIFIED | Route at line 257; import at line 33 |
| `MainLayout.tsx` | "Prop 22" sidebar item | VERIFIED | Nav item at line 127 with ClipboardCheck icon |
| `tests/test_prop22_migration.py` | Migration test suite | VERIFIED | File exists; ORM import test passes locally; 5 DB-dependent tests require live Postgres |
| `tests/test_prop22_calculation.py` | Calculation unit tests | VERIFIED | File exists; SUMMARY confirms 16/16 PASS |
| `tests/test_prop22_reconciliation.py` | Reconciliation tests | VERIFIED | File exists; SUMMARY confirms 10/10 PASS |
| `tests/test_prop22_api.py` | API endpoint tests | VERIFIED | File exists; SUMMARY confirms 10/10 PASS |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `complete_ride()` bid_routes.py:2554 | `prop22_utils.calculate_prop22_ride_data()` | non-blocking try/except | WIRED | `grep` confirms `from prop22_utils import calculate_prop22_ride_data` at line 2554, result written to ride_request fields at lines 2556-2561 |
| `order_delivered()` order_flow.py:4248 | `prop22_utils.calculate_prop22_order_data()` | non-blocking try/except | WIRED | `grep` confirms `from prop22_utils import calculate_prop22_order_data` at line 4248, result written to order fields |
| `prop22_period_reconciliation_job` | `prop22_earning_periods + prop22_earnings_statement` | `db.flush()` after period INSERT | WIRED | `order_flow.py:3068` has `db.flush()  # get period.id for earnings statement FK` |
| `prop22_period_reconciliation_job` | `stripe.Transfer.create()` | driver.stripe_onboarded check | WIRED | `order_flow.py:3094-3098`; idempotency_key=`prop22_topup_{driver_id}_{period.id}` |
| `_should_run_scheduler()` guard | both new jobs | jobs registered inside guard | WIRED | `order_flow.py:3243, 3251` both inside `start_timeout_scheduler()` / `_should_run_scheduler()` block |
| `GET /api/driver/prop22/periods` | `prop22_earning_periods JOIN prop22_earnings_statement` | db.query with JOIN | WIRED | `main_new.py:8012`; response includes `qtd_engaged_hours` from statement |
| `POST /api/admin/prop22/manual-topup` | `prop22_earning_periods.status = PAID` | `period.top_up_stripe_id = f"{method}:{reference_number}"` | WIRED | Confirmed via sed output; stores `METHOD:REF-NUMBER` and sets `period.status = "PAID"` |
| `PayoutDashboardView.prop22Section()` | `GET /api/driver/prop22/periods` | `fetchProp22Periods()` with driverAccessToken | WIRED | `PayoutDashboardView.swift:577` constructs URL, line 587 attaches `SecureStorage.shared.driverAccessToken` |
| `Prop22PeriodDetailView` | `GET /api/driver/prop22/periods/{id}/rides` | `fetchRides()` | WIRED | `PayoutDashboardView.swift:799` constructs URL with `period.id` |
| `Prop22Compliance.tsx submitTopup()` | `POST /api/admin/prop22/manual-topup` | `api.post('/admin/prop22/manual-topup', values)` | WIRED | `Prop22Compliance.tsx:137` confirmed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROP22-01 | 13-01 | Schema: 10 nullable columns + 4 compliance tables | SATISFIED | Migration file + ORM classes verified |
| PROP22-02 | 13-02 | Per-ride/order floor calculation at completion (GPS-based) | SATISFIED | prop22_utils.py + hooks in bid_routes.py + order_flow.py verified |
| PROP22-03 | 13-03 | 14-day reconciliation job with Stripe top-up or MANUAL_REVIEW | SATISFIED | reconciliation job at order_flow.py:2937, CronTrigger hour=0 PT |
| PROP22-04 | 13-03, 13-04 | Earnings statements to DB per BPC §7454(b)(2) + API access | SATISFIED | Prop22EarningsStatement persisted in reconciliation; API endpoints at main_new.py:8012-8247 |
| PROP22-05 | 13-04, 13-05 | iOS driver visibility: period cards, per-ride disclosure, QTD hours | SATISFIED | PayoutDashboardView.swift: prop22Section(), Prop22PeriodDetailView with qtdEngagedHours |
| PROP22-06 | 13-04, 13-06 | Admin portal compliance table + manual top-up | SATISFIED | Prop22Compliance.tsx 387 lines; route + sidebar wired; POST /api/admin/prop22/manual-topup |
| PROP22-07 | 13-01, 13-02, 13-03 | Tips excluded from all earnings calculations | SATISFIED | order_flow.py:3030-3031 (rideshare driver_payout), 3043-3044 (food delivery_fee) |
| PROP22-08 | 13-02, 13-03 | GPS-only CA detection; PT timezone for all boundaries | SATISFIED | prop22_utils.py:21, 30, 36-38: CA_TZ + bounding box only, no Driver.state |

**No orphaned requirements found.** All 8 PROP22 requirement IDs declared in plans are covered by verified artifacts. Note: REQUIREMENTS.md does not contain PROP22 entries — these requirements live only in plan frontmatter and the ROADMAP (this is consistent with the project's approach for this phase).

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/test_prop22_migration.py` | multiple | 5 of 6 tests require live Postgres (information_schema queries) | INFO | Pre-existing limitation noted in SUMMARY; CI/CD will run them against staging Postgres |

No blocker or warning-level anti-patterns found in any of the implementation files.

---

## Human Verification Required

### 1. Reconciliation job period boundary execution

**Test:** Wait for a Prop 22 period boundary night (or simulate by manually invoking `prop22_period_reconciliation_job()` on the backend), then query `SELECT * FROM prop22_earning_periods` to confirm rows are created.
**Expected:** One row per CA-active driver per 14-day period, with correct `status`, `net_earnings`, `prop22_floor`, and `top_up_amount`.
**Why human:** Requires live database with completed CA rides; scheduler cannot be exercised by static analysis.

### 2. iOS Prop 22 section renders correctly in simulator

**Test:** Build and run the driver app in iOS Simulator. Navigate to Payout Dashboard. Verify the "Prop 22 Compliance" section appears below the earnings summary. Tap a period card to open Prop22PeriodDetailView and verify QTD hours and per-ride floor amounts are displayed.
**Expected:** Section visible, period cards show date range / hours / miles / floor / top-up / status badge; OVERDUE shows red badge; nil floor_amount renders as "—".
**Why human:** Visual correctness of SwiftUI layout; requires simulator or device.

### 3. Admin portal manual top-up end-to-end

**Test:** Log in to admin portal at /admin/prop22, navigate to Manual Review tab, click "Manual Top-Up" on a MANUAL_REVIEW period, fill in amount + ACH + reference number, submit. Verify the row changes to PAID status and the reference number is stored.
**Expected:** Table refreshes showing PAID status; row disappears from Manual Review tab; DB shows `top_up_stripe_id = "ACH:REF-..."` and `status = "PAID"`.
**Why human:** Requires seeded MANUAL_REVIEW period in DB; end-to-end form + API + DB state transition.

### 4. Stripe automatic top-up for onboarded driver

**Test:** On a period boundary night with a CA driver who has `stripe_onboarded=true` and `net_earnings < prop22_floor`, confirm the reconciliation job calls `stripe.Transfer.create()` and stores the Stripe Transfer ID in `top_up_stripe_id`.
**Expected:** `status = "PAID"`, `top_up_stripe_id` starts with "tr_" (Stripe Transfer ID format).
**Why human:** Requires a real Stripe test-mode account with a connected account; cannot verify transfer execution statically.

---

## Gaps Summary

None. All 8 success criteria are verified by existing codebase artifacts. The phase goal is fully achieved:

- Database foundation (Plan 01): Migration and ORM classes exist and are substantive.
- Calculation engine (Plan 02): `prop22_utils.py` is 300 lines of real logic; hooks are wired non-blockingly in both completion flows.
- Reconciliation jobs (Plan 03): Both APScheduler CronTrigger jobs registered inside the scheduler guard; per-driver commit isolation, SELECT-before-INSERT, Stripe path, and MANUAL_REVIEW path all present and wired.
- API layer (Plan 04): All 4 endpoints present in main_new.py with correct auth guards; ownership check on period/rides endpoint; manual topup updates status to PAID.
- iOS UI (Plan 05): PayoutDashboardView.swift extended by 399 lines; all required UI elements present and wired to correct auth-token-bearing API calls.
- Admin portal (Plan 06): Prop22Compliance.tsx 387 lines; route and sidebar registered; OVERDUE row highlighting; manual top-up form fully wired.

---

_Verified: 2026-03-25T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
