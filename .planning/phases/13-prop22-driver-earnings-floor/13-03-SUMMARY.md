---
phase: 13-prop22-driver-earnings-floor
plan: 03
subsystem: payments
tags: [prop22, apscheduler, stripe, cron, compliance, bpc7454]

# Dependency graph
requires:
  - phase: 13-01
    provides: Prop22EarningPeriod + Prop22EarningsStatement ORM models, Alembic migration, prop22_earning_periods + prop22_earnings_statement tables
  - phase: 13-02
    provides: prop22_utils.py (get_previous_period_bounds, get_next_period_end, get_qtd_engaged_hours, CA bounding box constants, calculate_prop22_ride_data, calculate_prop22_order_data)

provides:
  - prop22_period_reconciliation_job() in order_flow.py — nightly PT midnight APScheduler job (CronTrigger hour=0)
  - prop22_manual_review_escalation_job() in order_flow.py — daily 9 AM PT APScheduler job (CronTrigger hour=9)
  - Both jobs registered inside start_timeout_scheduler() _should_run_scheduler() guard
  - 10 TDD tests in test_prop22_reconciliation.py (all passing)

affects:
  - 13-04 (admin endpoint)
  - 13-05 (iOS/Android statement UI)
  - 13-06 (deploy + smoke test)

# Tech tracking
tech-stack:
  added:
    - apscheduler.triggers.cron.CronTrigger (new import in order_flow.py:103)
  patterns:
    - Per-driver db.commit() isolation: Stripe failure for driver A does not roll back driver B
    - SELECT-before-INSERT double-insert protection via filter_by(driver_id, period_start).first()
    - File lock guard (/tmp/prop22_reconciliation.lock) for belt-and-suspenders dedup beyond APScheduler
    - db.flush() after period INSERT to get period.id FK for earnings statement

key-files:
  created:
    - apps/web/p2p-platform/backend/tests/test_prop22_reconciliation.py
  modified:
    - apps/web/p2p-platform/backend/order_flow.py

key-decisions:
  - "Module-level job functions (not nested inside start_timeout_scheduler) so they are importable for testing and introspection"
  - "CronTrigger(hour=0) for reconciliation (midnight PT) and CronTrigger(hour=9) for escalation (9 AM PT)"
  - "Rideshare net_earnings = sum(driver_payout) — tips already excluded in driver_payout per models.py:1379; Food delivery net_earnings = sum(delivery_fee) — delivery_fee excludes tip column per models.py:438-439"
  - "send_admin_alert() not used — does not exist. Used logger.warning() per RESEARCH.md pitfall #6"
  - "CR creation skipped in task commit — ADMIN_SECRET_KEY not available in local env; stored in AWS Secrets Manager for production"
  - "Rideshare takes precedence for dual-service drivers (same driver_id in both rideshare_ids and food_ids)"

patterns-established:
  - "Per-driver commit isolation: wrap each driver in try/except + db.commit(); db.rollback() on error to protect other drivers"
  - "Prop22 boundary guard: get_previous_period_bounds() + check now.date() == prev_end.date() before processing"

requirements-completed: [PROP22-03, PROP22-04, PROP22-07, PROP22-08]

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 13 Plan 03: Prop 22 Reconciliation and Escalation APScheduler Jobs Summary

**Two APScheduler CronTrigger jobs added to order_flow.py: nightly BPC §7454 reconciliation with per-driver Stripe top-up isolation and daily MANUAL_REVIEW escalation with OVERDUE transition**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-25T04:38:05Z
- **Completed:** 2026-03-25T04:47:55Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2 (order_flow.py, tests/test_prop22_reconciliation.py)

## Accomplishments

- `prop22_period_reconciliation_job` registered at midnight PT — processes just-closed 14-day period for all CA-active rideshare and food delivery drivers, creates Prop22EarningPeriod + Prop22EarningsStatement records per driver, pays via Stripe Transfer or flags MANUAL_REVIEW
- `prop22_manual_review_escalation_job` registered at 9 AM PT — checks MANUAL_REVIEW periods, transitions OVERDUE when deadline passed, logs 3-day warnings
- Both jobs wired inside `start_timeout_scheduler()` / `_should_run_scheduler()` guard using `CronTrigger` pattern (previously only `IntervalTrigger` was used)
- 10 TDD tests covering: boundary guard, importability, status transitions (RECONCILED/PAID/MANUAL_REVIEW), deadline calculation, tips exclusion, double-insert protection

## Task Commits

1. **Task 1: Create failing tests (RED phase)** - `534382ed` (test)
2. **Task 2: Add reconciliation jobs to order_flow.py (GREEN phase)** - `40d4e8c3` (feat)

## Files Created/Modified

- `apps/web/p2p-platform/backend/tests/test_prop22_reconciliation.py` — 10 TDD tests for reconciliation job logic
- `apps/web/p2p-platform/backend/order_flow.py` — Two module-level job functions (lines 2937–3180) + scheduler registration + CronTrigger import + Prop22EarningPeriod/Prop22EarningsStatement model imports

## Key Implementation Details

### Job Registration Locations in order_flow.py

| Symbol | Line | Detail |
|--------|------|--------|
| `CronTrigger` import | 103 | Added alongside existing `IntervalTrigger` import |
| `Prop22EarningPeriod, Prop22EarningsStatement` import | 372 | Added to existing `from models import (...)` block |
| `prop22_period_reconciliation_job` definition | 2937 | Module-level function |
| `prop22_manual_review_escalation_job` definition | 3140 | Module-level function |
| Reconciliation scheduler registration | ~3243 | `CronTrigger(hour=0, minute=0, timezone="America/Los_Angeles")` |
| Escalation scheduler registration | ~3251 | `CronTrigger(hour=9, minute=0, timezone="America/Los_Angeles")` |

### Scheduler Variable

`restaurant_timeout_scheduler` (BackgroundScheduler, order_flow.py:2837). Uses `scheduler.add_job()` pattern, not `@scheduler.scheduled_job` decorator.

### Test Results

```
tests/test_prop22_reconciliation.py::TestPeriodBoundaryGuard::test_job_exits_early_on_non_boundary_night PASSED
tests/test_prop22_reconciliation.py::TestPeriodBoundaryGuard::test_job_processes_on_period_boundary_night PASSED
tests/test_prop22_reconciliation.py::TestReconciliationJobFunctions::test_reconciliation_job_importable PASSED
tests/test_prop22_reconciliation.py::TestReconciliationJobFunctions::test_escalation_job_importable PASSED
tests/test_prop22_reconciliation.py::TestStatusTransitions::test_reconciled_when_earnings_exceed_floor PASSED
tests/test_prop22_reconciliation.py::TestStatusTransitions::test_paid_when_earnings_below_floor_and_stripe_onboarded PASSED
tests/test_prop22_reconciliation.py::TestStatusTransitions::test_manual_review_when_stripe_not_onboarded PASSED
tests/test_prop22_reconciliation.py::TestDeadlineCalculation::test_deadline_is_next_period_close PASSED
tests/test_prop22_reconciliation.py::TestTipsExclusion::test_net_earnings_uses_driver_payout_not_total PASSED
tests/test_prop22_reconciliation.py::TestDoubleInsertProtection::test_select_before_insert_prevents_duplicate PASSED
10 passed in 0.02s
```

## Decisions Made

- **Module-level job functions**: Placed as module-level functions (not nested inside `start_timeout_scheduler`) so they are importable for testing and future introspection. This is the correct pattern for testable APScheduler jobs.
- **CronTrigger vs IntervalTrigger**: Used CronTrigger for time-of-day precision (midnight / 9 AM PT). Added `from apscheduler.triggers.cron import CronTrigger` import.
- **Tips exclusion strategy**: `driver_payout` in RideRequest already excludes tips (it is fare minus platform_fee). `delivery_fee` in Order also excludes `tip` column. No extra subtraction needed.
- **send_admin_alert() not used**: Per RESEARCH.md pitfall #6, `send_admin_alert()` does not exist in the codebase. Used `logger.warning()` for all escalation alerts.
- **CR creation**: ADMIN_SECRET_KEY not available in local environment (stored in AWS Secrets Manager). CR creation was attempted but returned 401. This is the standard auth gate for production API calls from local env.
- **Dual-service driver precedence**: Drivers who work both rideshare and food delivery are assigned RIDESHARE service type (rideshare takes precedence). This simplifies financial statement reconciliation.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one noted behavioral difference:

**CR creation gate**: The plan included a Change Request creation step via `POST /api/admin/change-requests/`. The ADMIN_SECRET_KEY environment variable is not available in the local dev environment (production secret in AWS Secrets Manager). The CR endpoint returned 401. This is an expected auth gate per the deploy rules — production API calls from local env require AWS secrets that aren't checked into the codebase. The core implementation work (test file + job functions) was not affected.

## Issues Encountered

- **test_prop22_migration.py**: 5 pre-existing failures using PostgreSQL-specific `information_schema` queries that don't work with the SQLite in-memory test DB. Verified pre-existing by running with git stash before my changes — same 5 failures existed. Not caused by plan 03 changes.
- **Scheduler pattern discovery**: The plan referenced `@scheduler.scheduled_job` decorator pattern, but the actual codebase uses `scheduler.add_job()`. Adapted to match the actual pattern.

## Next Phase Readiness

- Plan 13-04 (admin endpoint `/api/admin/prop22/periods`) can now query `Prop22EarningPeriod` records created by the reconciliation job
- Plan 13-05 (iOS/Android statement screen) will display the `Prop22EarningsStatement` records
- Plan 13-06 (deploy) will activate both jobs on ECS production containers via the existing `start_timeout_scheduler()` mechanism

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/tests/test_prop22_reconciliation.py` — FOUND
- `.planning/phases/13-prop22-driver-earnings-floor/13-03-SUMMARY.md` — FOUND
- Commit `534382ed` (test RED) — FOUND
- Commit `40d4e8c3` (feat GREEN) — FOUND
- Commit `e65aebb1` (docs metadata) — FOUND
- `prop22_period_reconciliation_job` at order_flow.py:2937 — FOUND
- `prop22_manual_review_escalation_job` at order_flow.py:3140 — FOUND
- 10/10 test_prop22_reconciliation.py tests PASS
- 26/26 combined Prop22 test suite (reconciliation + calculation) PASS

---
*Phase: 13-prop22-driver-earnings-floor*
*Completed: 2026-03-25*
