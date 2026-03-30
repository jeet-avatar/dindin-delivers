---
quick_task: 252
description: "Fix BUG-1: prop22_engaged_miles uses driver home location instead of actual ride distance"
date: 2026-03-30
---

# Plan: Fix Prop 22 Engaged Miles

## Root Cause

`prop22_engaged_miles` is calculated in `prop22_utils.py:144` as:
```python
engaged_miles = road_miles(lat, lon, ride.dropoff_latitude, ride.dropoff_longitude)
```
where `lat, lon` = `ride.prop22_acceptance_lat/lon`.

These acceptance coordinates are set in `bid_routes.py:730` to `accepting_driver.current_latitude/longitude` — the driver's last GPS update. When the GPS is stale (driver hasn't updated location near the ride pickup), the engaged miles calculation uses a location hundreds of miles away.

**This is actually BUG-1 AND BUG-2 combined** — fixing the acceptance location also fixes the miles.

## Fix

Add a staleness/sanity check: if driver's current GPS is more than 50 miles from the ride pickup, use the pickup location instead. A driver accepting a ride must be in the vicinity of the pickup. 50 miles is generous enough to allow suburban-to-city acceptance while catching obviously stale GPS.

## Task 1: Fix `bid_routes.py` — rideshare acceptance GPS

- **file**: `apps/web/p2p-platform/backend/bid_routes.py:727-737`
- **action**: Add haversine distance check between driver GPS and ride pickup. If >50mi, use pickup coordinates
- **verify**: grep shows the new logic, no syntax errors

## Task 2: Fix `order_flow.py` — food delivery acceptance GPS

- **file**: `apps/web/p2p-platform/backend/order_flow.py:4227-4231`
- **action**: Same staleness check + fallback to restaurant location
- **verify**: grep shows the new logic

## Task 3: Verify no breaking changes

- **action**: Run backend tests to ensure nothing else broke
- **verify**: `pytest` passes
