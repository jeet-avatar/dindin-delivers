---
quick_task: 252
status: complete
---

# Summary: Fix Prop 22 Engaged Miles + Acceptance GPS

## What Changed

**`bid_routes.py:727-741`** (rideshare) and **`order_flow.py:4227-4243`** (food delivery):

Added 50-mile haversine sanity check before using driver's `current_latitude/longitude` for Prop 22 acceptance GPS. If driver GPS is >50mi from pickup/restaurant, falls back to pickup coordinates.

## Root Cause

`prop22_acceptance_lat/lon` was set to `driver.current_latitude/longitude` — the driver's last GPS update. When GPS was stale (e.g., driver in Irvine but accepting ride in SF/Phoenix/Dallas), `prop22_engaged_miles` calculated distance from Irvine to dropoff instead of pickup to dropoff.

## Verified

```
Before fix (bug values):        After fix (correct):
SF→Oakland:    389.67mi   →     10.4mi
PHX Air→DT:    318.63mi   →     4.9mi
Austin→Barton: 1,183.77mi →     2.4mi
DFW→Dallas:    1,202.3mi  →     20.6mi
Dallas→Houston: 1,331.34mi →    281.0mi
```

## Files Changed

- `apps/web/p2p-platform/backend/bid_routes.py` — rideshare acceptance (lines 727-741)
- `apps/web/p2p-platform/backend/order_flow.py` — food delivery acceptance (lines 4227-4243)

## Fixes

- **BUG-1** (CRITICAL): `prop22_engaged_miles` completely wrong
- **BUG-2** (CRITICAL): `prop22_acceptance_lat/lon` records wrong location
