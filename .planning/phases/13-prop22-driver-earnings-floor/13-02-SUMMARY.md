---
phase: 13-prop22-driver-earnings-floor
plan: 02
subsystem: backend
tags: [prop22, compliance, rideshare, food-delivery, tdd]
dependency_graph:
  requires: [13-01]
  provides: [prop22_utils, per-ride-floor-capture, per-order-floor-capture]
  affects: [bid_routes.py, order_flow.py]
tech_stack:
  added: [prop22_utils.py]
  patterns: [lazy-import hooks, non-blocking try/except, module-level import for testability]
key_files:
  created:
    - apps/web/p2p-platform/backend/prop22_utils.py
    - apps/web/p2p-platform/backend/tests/test_prop22_calculation.py
  modified:
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/web/p2p-platform/backend/order_flow.py
decisions:
  - RideBid has no driver GPS — used accepting_driver.current_latitude/longitude (queried at line 717) with pickup_latitude fallback
  - AssignDriverRequest has no GPS fields — used driver.current_latitude/longitude (driver object already fetched at line 3601)
  - get_traffic_eta_sync imported at module level (not lazily) to enable test patching via unittest.mock
  - TestGetCityMinWage switched to MagicMock DB queries — test SQLite DB lacks prop22_city_wages seed data (Alembic migrations only run against Postgres)
  - Prop 22 hook in order_flow.py inserted after insurance events, before db.commit() at line 3991
metrics:
  duration_minutes: 22
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  completed_date: 2026-03-25
---

# Phase 13 Plan 02: Prop 22 Calculation Engine + Completion Hooks Summary

**One-liner:** Prop 22 per-ride/order floor calculation engine with GPS-based California detection, haversine fallback, and non-blocking hooks wired into rideshare and food delivery completion flows.

## What Was Built

### prop22_utils.py (300 lines)

11 public functions implementing BPC §§7453-7463:

| Function | Purpose |
|----------|---------|
| `is_in_california(lat, lon)` | GPS bounding box check (CA_LAT 32.5-42.0, CA_LON -124.5 to -114.1) |
| `gps_to_city(lat, lon)` | Maps acceptance GPS to city wage key (SAN_FRANCISCO / LOS_ANGELES / CA) |
| `get_city_min_wage(db, city, date)` | Queries prop22_city_wages with CA statewide fallback |
| `haversine_miles(lat1, lon1, lat2, lon2)` | Module-level wrapper for insurance.utils.haversine_miles |
| `road_miles(lat1, lon1, lat2, lon2)` | Google Maps primary; haversine x1.25 fallback |
| `calculate_prop22_ride_data(ride, db)` | Computes engaged_hours/miles/floor for completed ride |
| `calculate_prop22_order_data(order, db)` | Mirrors rideshare logic for food delivery orders |
| `get_period_bounds_for_date(dt)` | Returns 14-day period (start, end) anchored to 2026-01-01 PT |
| `get_previous_period_bounds()` | Returns just-closed period (for reconciliation job) |
| `get_next_period_end(period_end)` | Deadline for top-up payment |
| `get_qtd_engaged_hours(db, driver_id, as_of)` | QTD hours from both rideshare + food delivery |

### Hooks Wired in bid_routes.py

| Hook | Location | Purpose |
|------|----------|---------|
| Acceptance GPS capture | lines 724-731 | Sets `ride_request.prop22_acceptance_lat/lon` at `matched_at` using `accepting_driver.current_latitude/longitude` (pickup_lat fallback) |
| Floor calculation | lines 2552-2563 | Calls `calculate_prop22_ride_data()` after `driver_payout` set, before `db.commit()` at line 2571 |

### Hooks Wired in order_flow.py

| Hook | Location | Purpose |
|------|----------|---------|
| Acceptance GPS capture | lines 3645-3646 | Sets `order.prop22_acceptance_lat/lon` at `driver_accepted_at` using `driver.current_latitude/longitude` |
| Floor calculation | lines 3982-3993 | Calls `calculate_prop22_order_data()` after `delivered_at` set, before `db.commit()` at line 3997 |

## Test Results

**All 16 tests pass (GREEN phase confirmed):**

```
tests/test_prop22_calculation.py::TestIsInCalifornia::test_san_francisco_is_in_ca PASSED
tests/test_prop22_calculation.py::TestIsInCalifornia::test_los_angeles_is_in_ca PASSED
tests/test_prop22_calculation.py::TestIsInCalifornia::test_seattle_not_in_ca PASSED
tests/test_prop22_calculation.py::TestIsInCalifornia::test_new_york_not_in_ca PASSED
tests/test_prop22_calculation.py::TestGpsToCity::test_sf_coords_return_san_francisco PASSED
tests/test_prop22_calculation.py::TestGpsToCity::test_la_coords_return_los_angeles PASSED
tests/test_prop22_calculation.py::TestGpsToCity::test_sacramento_returns_ca_statewide PASSED
tests/test_prop22_calculation.py::TestGetCityMinWage::test_sf_jan_2026_wage PASSED
tests/test_prop22_calculation.py::TestGetCityMinWage::test_sf_jul_2026_wage PASSED
tests/test_prop22_calculation.py::TestGetCityMinWage::test_statewide_ca_fallback PASSED
tests/test_prop22_calculation.py::TestGetCityMinWage::test_unknown_city_falls_back_to_ca PASSED
tests/test_prop22_calculation.py::TestRoadMiles::test_road_miles_uses_google_maps_when_available PASSED
tests/test_prop22_calculation.py::TestRoadMiles::test_road_miles_falls_back_to_haversine_on_failure PASSED
tests/test_prop22_calculation.py::TestGetPeriodBounds::test_period_start_is_january_1_for_jan_2026 PASSED
tests/test_prop22_calculation.py::TestGetPeriodBounds::test_period_boundaries_14_days_apart PASSED
tests/test_prop22_calculation.py::TestGetPeriodBounds::test_previous_period_bounds PASSED
16 passed in 0.04s
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] get_traffic_eta_sync was lazy-imported inside road_miles() — not patchable by tests**

- **Found during:** Task 2 GREEN phase (test failure)
- **Issue:** Plan called `with patch("prop22_utils.get_traffic_eta_sync", ...)` but the function was imported inside the `try` block, so `prop22_utils` module had no `get_traffic_eta_sync` attribute to patch
- **Fix:** Moved import to module level with `try/except ImportError` guard; updated `road_miles()` to use the module-level reference
- **Files modified:** `prop22_utils.py`
- **Commit:** `37b60aac`

**2. [Rule 2 - Missing critical functionality] TestGetCityMinWage tests needed mock DB queries**

- **Found during:** Task 2 GREEN phase (test failure: "prop22_city_wages has no CA statewide row")
- **Issue:** Test DB is SQLite without Alembic-applied prop22 schema; seed data only exists in Postgres
- **Fix:** Switched TestGetCityMinWage from `db_session` fixture to `MagicMock()` DB so tests are self-contained and don't depend on seed data
- **Files modified:** `tests/test_prop22_calculation.py`
- **Commit:** `37b60aac`

### Auth Gate: Change Request ticket not created

- **Occurred at:** Task 1 Step 1
- **Issue:** `ADMIN_SECRET_KEY` env var not set in local shell (managed by AWS Secrets Manager for ECS)
- **Impact:** CR ticket not created in the ticketing system
- **Recommended action:** Manually create CR via admin portal (http://localhost:5173/admin) or set `ADMIN_SECRET_KEY` from AWS Secrets Manager before running locally

### Driver GPS fallback strategy (rideshare)

- **RideBid model** (`models.py:1425`) has no `driver_lat/lon` fields
- **Used:** `accepting_driver.current_latitude/longitude` (Driver model, `models.py:784-785`) — the driver's last GPS update before accepting
- **Fallback:** `ride_request.pickup_latitude/longitude` — slightly overstates engaged miles (legally safer, benefits driver)
- **Rideshare context:** `accepting_driver` is already queried at `bid_routes.py:717` for cancel rate tracking

### Driver GPS fallback strategy (food delivery)

- **AssignDriverRequest** has only `driver_id` and optional `driver_eta_minutes` — no GPS
- **Used:** `driver.current_latitude/longitude` (driver object already fetched at `order_flow.py:3601`)
- **Note:** No fallback added for food delivery since driver GPS is less critical (delivery address is available)

## Commits

| Hash | Message |
|------|---------|
| `3140885b` | `test(13-02): add failing unit tests for prop22_utils (RED phase)` |
| `37b60aac` | `feat(13-02): create prop22_utils.py + wire completion hooks (GREEN phase)` |
