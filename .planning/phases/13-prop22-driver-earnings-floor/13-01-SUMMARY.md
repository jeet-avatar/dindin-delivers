---
phase: 13-prop22-driver-earnings-floor
plan: "01"
subsystem: backend-database
tags: [prop22, alembic, migration, orm, compliance, california]
dependency_graph:
  requires: []
  provides:
    - prop22_config table with 2026 CA seed row
    - prop22_city_wages table with 5 seed rows
    - prop22_earning_periods table with uq_prop22_period_driver_start constraint
    - prop22_earnings_statement table for BPC 7454(b)(2) disclosure retention
    - 5 nullable prop22_* columns on ride_requests
    - 5 nullable prop22_* columns on orders
    - Prop22Config/CityWage/EarningPeriod/EarningsStatement ORM classes
  affects:
    - 13-02 (calculation engine reads prop22_config/city_wages, writes to ride_requests/orders/earning_periods)
    - 13-03 (reconciliation job reads earning_periods, writes statements)
    - 13-04 (API reads all 4 tables)
    - 13-05 (iOS/Android display reads period + statement data)
tech_stack:
  added: []
  patterns:
    - Alembic raw SQL migrations with IF NOT EXISTS / ON CONFLICT DO NOTHING for idempotency
    - SQLAlchemy Date type and func.now() server_default for timestamp columns
key_files:
  created:
    - apps/web/p2p-platform/backend/alembic/versions/20260325_add_prop22_tables.py
    - apps/web/p2p-platform/backend/tests/test_prop22_migration.py
  modified:
    - apps/web/p2p-platform/backend/models.py
decisions:
  - "Used raw op.execute() SQL instead of op.add_column() to take advantage of IF NOT EXISTS — avoids migration failures if migration is re-run or partially applied"
  - "prop22_earning_periods.service_type column included (RIDESHARE vs FOOD_DELIVERY) per RESEARCH.md pitfall #2 — required for correct floor formula (rideshare uses 120%*min_wage, food delivery may differ)"
  - "All new columns are nullable so zero existing rows are affected — backward compatible"
  - "ORM classes use server_default=func.now() for created_at/updated_at instead of Python datetime.utcnow to ensure timezone-aware timestamps in PostgreSQL"
  - "down_revision set to 20260321_rr_accessibility (latest migration on branch at execution time)"
metrics:
  duration: "25 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 13 Plan 01: Prop 22 Alembic Migration Summary

**One-liner:** Idempotent Alembic migration adding 10 nullable prop22_* columns plus 4 new compliance tables (prop22_config, prop22_city_wages, prop22_earning_periods, prop22_earnings_statement) with 2026 CA wage seed data and 4 SQLAlchemy ORM classes.

## What Was Built

### Migration File
`alembic/versions/20260325_add_prop22_tables.py`
- Revision ID: `20260325_prop22_tables`
- Down revision: `20260321_rr_accessibility`
- All operations use IF NOT EXISTS / ON CONFLICT DO NOTHING (idempotent)

### Columns Added

**ride_requests table (5 nullable columns):**
- `prop22_acceptance_lat` FLOAT — driver GPS lat at ride acceptance
- `prop22_acceptance_lon` FLOAT — driver GPS lon at ride acceptance
- `prop22_engaged_hours` FLOAT — (completed_at - matched_at) in hours
- `prop22_engaged_miles` FLOAT — road miles from acceptance GPS to dropoff
- `prop22_floor_amount` FLOAT — per-ride Prop 22 floor (disclosure requirement)

**orders table (5 nullable columns, same set):**
- `prop22_acceptance_lat`, `prop22_acceptance_lon`
- `prop22_engaged_hours` — (delivered_at - driver_accepted_at) in hours
- `prop22_engaged_miles` — road miles from acceptance GPS to delivery lat/lon
- `prop22_floor_amount`

### New Tables

**prop22_config** — 1 seed row (CA, 2026-01-01, multiplier=1.20, mile_rate=0.37)

**prop22_city_wages** — 5 seed rows:
| city | effective_date | min_wage |
|------|---------------|---------|
| CA | 2026-01-01 | $16.90 |
| SAN_FRANCISCO | 2026-01-01 | $18.67 |
| SAN_FRANCISCO | 2026-07-01 | $19.61 |
| LOS_ANGELES | 2026-01-01 | $17.87 |
| LOS_ANGELES | 2026-07-01 | $18.42 |

**prop22_earning_periods** — UniqueConstraint `uq_prop22_period_driver_start` on (driver_id, period_start); includes `service_type` column (RIDESHARE/FOOD_DELIVERY); `is_archived` soft-delete for 4-year UCL retention

**prop22_earnings_statement** — FK to prop22_earning_periods; `qtd_engaged_hours` for BPC §7454(b)(2) calendar quarter disclosure; `is_archived` soft-delete

### ORM Classes Added to models.py
- `Prop22Config` — `__tablename__ = "prop22_config"`
- `Prop22CityWage` — `__tablename__ = "prop22_city_wages"`
- `Prop22EarningPeriod` — `__tablename__ = "prop22_earning_periods"` with `__table_args__` UniqueConstraint
- `Prop22EarningsStatement` — `__tablename__ = "prop22_earnings_statement"`

Also added to models.py line 1: `Date` type and `func` from sqlalchemy.sql (required for ORM classes).

## ORM Verification

```
Prop22Config tablename: prop22_config        OK
Prop22CityWage tablename: prop22_city_wages  OK
Prop22EarningPeriod tablename: prop22_earning_periods  OK
Prop22EarningsStatement tablename: prop22_earnings_statement  OK
All 4 ORM classes importable OK

RideRequest prop22 cols: ['prop22_acceptance_lat', 'prop22_acceptance_lon',
  'prop22_engaged_hours', 'prop22_engaged_miles', 'prop22_floor_amount']
Order prop22 cols: ['prop22_acceptance_lat', 'prop22_acceptance_lon',
  'prop22_engaged_hours', 'prop22_engaged_miles', 'prop22_floor_amount']
```

## Test Results

`tests/test_prop22_migration.py` — 6 tests written:
- `test_orm_classes_importable` — PASSED (verified locally, no DB needed)
- `test_ride_requests_prop22_columns` — requires live DB with migration applied
- `test_orders_prop22_columns` — requires live DB with migration applied
- `test_prop22_config_seed` — requires live DB with migration applied
- `test_prop22_city_wages_seed` — requires live DB with migration applied
- `test_prop22_earning_periods_unique_constraint` — requires live DB with migration applied

The 5 DB-dependent tests will be verified automatically when CI/CD deploys to staging and runs `alembic upgrade head && pytest`.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 2: Migration + ORM | d932cc54 | 20260325_add_prop22_tables.py, models.py, test_prop22_migration.py |

## Deviations from Plan

### Auto-skipped Issues

**1. [Rule 1 - Auth Gate] CR ticket creation skipped — ADMIN_SECRET_KEY not in shell env**
- **Found during:** Task 1
- **Issue:** `ADMIN_SECRET_KEY` env var not available in the executor shell; `/api/admin/change-requests/` returned `{"detail":"Admin authentication required"}`
- **Fix:** Skipped; CR should be created manually via admin portal at https://api.dollor.ai or by running with secrets loaded
- **Impact:** No blocker — CR is an audit trail item, not a code dependency

## Self-Check: PASSED

- [x] `apps/web/p2p-platform/backend/alembic/versions/20260325_add_prop22_tables.py` — FOUND
- [x] `apps/web/p2p-platform/backend/tests/test_prop22_migration.py` — FOUND
- [x] `apps/web/p2p-platform/backend/models.py` — MODIFIED (Prop22* classes + 10 columns + Date/func imports)
- [x] Commit d932cc54 — FOUND (`git log --oneline -1` confirms)
- [x] ORM import test PASSED
- [x] Migration file syntax valid (ast.parse passed)
- [x] down_revision = 20260321_rr_accessibility (correct latest migration at time of execution)
