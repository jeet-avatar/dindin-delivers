---
phase: quick-96
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_driver_proximity.py
autonomous: true
requirements: [PROXIMITY-01]
must_haves:
  truths:
    - "When driver location updates within 500m of delivery address, customer gets push notification"
    - "Push notification fires only once per order (deduplicated)"
    - "Orders without delivery coordinates are silently skipped"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Haversine helper + proximity check in both location update endpoints"
      contains: "_haversine_distance_meters"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_driver_proximity.py"
      provides: "Unit tests for haversine + proximity notification logic"
      min_lines: 40
  key_links:
    - from: "update_driver_location (PUT /api/auth/driver/location)"
      to: "send_push_notification"
      via: "proximity check after location commit"
      pattern: "_check_driver_proximity_to_delivery"
    - from: "update_driver_location_android (POST /api/driver/location)"
      to: "send_push_notification"
      via: "same proximity check function"
      pattern: "_check_driver_proximity_to_delivery"
---

<objective>
Add "Driver approaching" push notification when a driver updates their location within 500m of the delivery address.

Purpose: Customers get a timely heads-up ("Your driver is about 2 minutes away!") so they can prepare for delivery.
Output: Modified main_new.py with haversine helper + proximity check wired into both driver location endpoints, plus unit tests.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 3033-3044 — PUT /api/auth/driver/location)
@apps/web/p2p-platform/backend/main_new.py (lines 19608-19629 — POST /api/driver/location)
@apps/web/p2p-platform/backend/models.py (lines 386-408 — OrderStatus enum)
@apps/web/p2p-platform/backend/models.py (lines 410-442 — Order model: driver_id, delivery_latitude, delivery_longitude)
@apps/web/p2p-platform/backend/order_flow.py (line 159 — send_push_notification signature)
@apps/web/p2p-platform/backend/order_flow.py (lines 2134-2135 — _delivery_warned_orders in-memory set pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add haversine helper and proximity check function</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
1. Add a module-level in-memory deduplication set near the top of main_new.py (after imports, similar to `_delivery_warned_orders` in order_flow.py):
   ```python
   # Track orders where "driver approaching" notification already sent (in-memory, resets on restart)
   _driver_approaching_notified: set = set()
   ```

2. Add a pure haversine helper function (no DB, no side effects) near the utility functions area:
   ```python
   import math

   def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
       """Calculate distance between two GPS points in meters using Haversine formula."""
       R = 6371000  # Earth radius in meters
       phi1, phi2 = math.radians(lat1), math.radians(lat2)
       dphi = math.radians(lat2 - lat1)
       dlambda = math.radians(lon2 - lon1)
       a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
       return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
   ```

3. Add a proximity check function that queries active deliveries for this driver and sends push if within 500m:
   ```python
   DRIVER_APPROACHING_THRESHOLD_METERS = 500

   def _check_driver_proximity_to_delivery(driver_id: int, driver_lat: float, driver_lng: float, db: Session):
       """Check if driver is within 500m of any active delivery address. Send one-time push to customer."""
       global _driver_approaching_notified
       try:
           active_orders = db.query(Order).filter(
               Order.driver_id == driver_id,
               Order.status == OrderStatus.OUT_FOR_DELIVERY,
               Order.delivery_latitude.isnot(None),
               Order.delivery_longitude.isnot(None)
           ).all()

           for order in active_orders:
               if order.id in _driver_approaching_notified:
                   continue
               distance = _haversine_distance_meters(
                   driver_lat, driver_lng,
                   order.delivery_latitude, order.delivery_longitude
               )
               if distance <= DRIVER_APPROACHING_THRESHOLD_METERS:
                   from order_flow import send_push_notification
                   send_push_notification(
                       user_type="customer",
                       user_id=order.customer_id,
                       title="Driver Approaching",
                       body="Your driver is about 2 minutes away!",
                       data={"type": "driver_approaching", "order_id": str(order.id)},
                       db=db
                   )
                   _driver_approaching_notified.add(order.id)
                   logger.info(f"Driver approaching notification sent for order {order.id} (distance: {distance:.0f}m)")
       except Exception as e:
           logger.warning(f"Driver proximity check failed: {e}")
   ```

4. Wire the proximity check into BOTH driver location update endpoints:

   a. In `update_driver_location` (PUT /api/auth/driver/location, line ~3042 after `db.commit()`):
      Add: `_check_driver_proximity_to_delivery(driver.id, latitude, longitude, db)`

   b. In `update_driver_location_android` (POST /api/driver/location, line ~19621 after `db.commit()`):
      Add: `_check_driver_proximity_to_delivery(driver.id, latitude, longitude, db)`

IMPORTANT: The proximity check runs AFTER the commit so the driver location is persisted even if the notification fails. The try/except inside the function ensures location updates are never blocked by notification errors.
  </action>
  <verify>
    grep -n "_haversine_distance_meters\|_check_driver_proximity_to_delivery\|_driver_approaching_notified\|DRIVER_APPROACHING_THRESHOLD" apps/web/p2p-platform/backend/main_new.py
  </verify>
  <done>Both driver location endpoints call proximity check after commit. Haversine function exists. In-memory dedup set prevents duplicate notifications. Only OUT_FOR_DELIVERY orders are checked.</done>
</task>

<task type="auto">
  <name>Task 2: Unit tests for haversine and proximity notification</name>
  <files>apps/web/p2p-platform/backend/tests/unit/test_driver_proximity.py</files>
  <action>
Create `tests/unit/test_driver_proximity.py` with these test cases:

1. **test_haversine_known_distance** — Verify haversine returns correct distance for a known pair of coordinates. Use NYC Times Square (40.7580, -73.9855) to Empire State Building (40.7484, -73.9857) which is ~107m. Assert within 5m tolerance.

2. **test_haversine_same_point** — Same lat/lng returns 0.0.

3. **test_haversine_large_distance** — Two distant cities return distance in expected range (e.g., NYC to LA ~3,940km). Assert within 50km tolerance.

4. **test_proximity_check_sends_notification** — Mock `db.query` to return an Order with OUT_FOR_DELIVERY status, delivery_latitude/longitude set, driver within 500m. Mock `send_push_notification`. Assert notification sent with correct user_type="customer", title="Driver Approaching", and order_id in data. Clear `_driver_approaching_notified` set in setup.

5. **test_proximity_check_deduplicates** — Call proximity check twice for same order within range. Assert `send_push_notification` called exactly once (second call is deduped).

6. **test_proximity_check_skips_far_driver** — Driver is 2km away from delivery address. Assert `send_push_notification` NOT called.

7. **test_proximity_check_skips_no_coordinates** — Order has delivery_latitude=None. Assert no crash, no notification.

Import `_haversine_distance_meters`, `_check_driver_proximity_to_delivery`, `_driver_approaching_notified`, `DRIVER_APPROACHING_THRESHOLD_METERS` from `main_new`. Use `unittest.mock.patch` for send_push_notification and DB queries.

Use pytest style (functions, not classes). Add `import math` for tolerance checks.

Before each test that touches `_driver_approaching_notified`, clear the set to avoid cross-test contamination:
```python
from main_new import _driver_approaching_notified
_driver_approaching_notified.clear()
```
  </action>
  <verify>cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_driver_proximity.py -v</verify>
  <done>All 7 tests pass. Haversine accuracy verified. Notification send/dedup/skip logic covered.</done>
</task>

</tasks>

<verification>
1. `grep -n "_check_driver_proximity" apps/web/p2p-platform/backend/main_new.py` shows the function defined AND called in both location endpoints
2. `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_driver_proximity.py -v` — all tests pass
3. `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x --timeout=120` — no regressions in existing tests
</verification>

<success_criteria>
- Haversine distance function returns accurate distances (verified by known-coordinate test)
- Both PUT /api/auth/driver/location and POST /api/driver/location trigger proximity check after commit
- Customer receives "Driver Approaching" push when driver is within 500m of delivery address
- Notification sent only once per order (in-memory set deduplication)
- No impact on location update latency (async-safe, try/except wrapped)
- All 7 new tests pass, no regressions in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/96-wave-2-gap-17-driver-approaching-notific/96-SUMMARY.md`
</output>
