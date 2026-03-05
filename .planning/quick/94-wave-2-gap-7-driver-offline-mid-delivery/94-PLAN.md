---
phase: quick-94
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_stale_driver_reassignment.py
autonomous: true
requirements: [GAP-7]
must_haves:
  truths:
    - "Orders stuck in OUT_FOR_DELIVERY with stale driver location (>10min no GPS update) are auto-reassigned"
    - "Reassigned orders go back to READY_FOR_PICKUP so another driver can claim them"
    - "Customer gets push notification when driver goes offline and reassignment happens"
    - "Original driver gets push notification that delivery was reassigned"
    - "Admin can manually reassign a delivery via POST endpoint"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "check_stale_driver_reassignment_job background job + reassign_delivery helper + READY_FOR_PICKUP added to OUT_FOR_DELIVERY transitions"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "POST /api/deliveries/{order_id}/reassign admin endpoint + READY_FOR_PICKUP in _VALID_ORDER_TRANSITIONS for OUT_FOR_DELIVERY"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_stale_driver_reassignment.py"
      provides: "Unit tests for stale detection + reassignment logic"
  key_links:
    - from: "order_flow.py:check_stale_driver_reassignment_job"
      to: "Driver.location_updated_at"
      via: "10-min cutoff comparison"
      pattern: "location_updated_at.*timedelta.*minutes=10"
    - from: "order_flow.py:reassign_delivery"
      to: "send_push_notification"
      via: "customer + driver notifications"
      pattern: "send_push_notification.*customer.*reassign|send_push_notification.*driver.*reassign"
    - from: "order_flow.py:start_timeout_scheduler"
      to: "check_stale_driver_reassignment_job"
      via: "APScheduler add_job"
      pattern: "add_job.*stale_driver"
---

<objective>
Detect drivers who go offline mid-delivery (no GPS update for 10+ minutes while order is OUT_FOR_DELIVERY) and auto-reassign the order to the driver pool. Also add a manual reassignment endpoint for admin use.

Purpose: Prevent orders from being stuck when a driver's phone dies, they lose connectivity, or they abandon a delivery.
Output: Background job in order_flow.py, admin endpoint in main_new.py, unit tests.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/order_flow.py (background jobs at lines 2060-2430, send_push_notification at line 159, unassign_driver at line 4150)
@apps/web/p2p-platform/backend/main_new.py (status transitions at line 8615-8632, driver location_updated_at at line 3041)
@apps/web/p2p-platform/backend/models.py (Driver.location_updated_at at line 766, Order.driver_id at line 422, OrderStatus at line 386)
@apps/web/p2p-platform/backend/tests/unit/test_order_flow.py (existing test patterns, mock_order fixture)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stale driver detection job + reassignment helper + status transition update</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**In order_flow.py:**

1. Add constant near line 2074 (with other delivery timeout thresholds):
   ```
   STALE_DRIVER_LOCATION_MINUTES = 10  # Reassign if no GPS update in 10 minutes
   STALE_DRIVER_CHECK_INTERVAL_SECONDS = 60  # Check every 60 seconds
   ```

2. Add in-memory dedup set (like `_delivery_warned_orders`):
   ```
   _reassigned_orders: set = set()  # Track reassigned order IDs to avoid duplicate processing
   ```

3. Create `reassign_delivery(order, reason, db)` helper function that:
   - Stores original `driver_id` and `driver_name` before clearing
   - Sets `order.driver_id = None`, `order.driver_name = None`
   - Sets `order.driver_en_route = False`, `order.driver_accepted_at = None`
   - Sets `order.status = OrderStatus.READY_FOR_PICKUP` (back to driver pool)
   - Sets `order.picked_up_at = None` (no longer picked up)
   - Sends push notification to customer: title="Delivery Update", body="Your driver went offline. We're finding a new driver for your order."
     data={"type": "driver_reassigned", "order_id": str(order.id)}
   - Sends push notification to original driver (using stored driver_id): title="Delivery Reassigned", body="Your delivery has been reassigned due to inactivity. Please check your connection."
     data={"type": "delivery_reassigned", "order_id": str(order.id)}
   - Emails support@dollor.ai with details (order number, driver name, elapsed time, reason) using `send_email` with `skip_validation=True`
   - Logs the reassignment: `logger.warning(f"Order {order.order_number} reassigned from driver {original_driver_name} (ID: {original_driver_id}): {reason}")`
   - Returns dict with success, order_id, original_driver_id

4. Create `check_stale_driver_reassignment_job()` background job that:
   - Opens SessionLocal() with try/except/finally (same pattern as `check_delivery_timeouts_job`)
   - Queries orders WHERE `status == OUT_FOR_DELIVERY` AND `driver_id IS NOT NULL`
   - For each order, loads the Driver by `order.driver_id`
   - Checks if `driver.location_updated_at` is None OR older than 10 minutes from `datetime.now()`
   - If stale AND `order.id not in _reassigned_orders`:
     - Calls `reassign_delivery(order, f"Driver location stale for {elapsed}+ minutes", db)`
     - Adds `order.id` to `_reassigned_orders`
   - Commits after processing all stale orders
   - Cleans up `_reassigned_orders` by removing IDs for orders no longer in READY_FOR_PICKUP (they got re-claimed or cancelled)

5. Register the job in the scheduler section (near line 2366, after the stale_order_cleanup job):
   ```python
   restaurant_timeout_scheduler.add_job(
       check_stale_driver_reassignment_job,
       IntervalTrigger(seconds=STALE_DRIVER_CHECK_INTERVAL_SECONDS),
       id="stale_driver_reassignment",
       name="Auto-reassign deliveries with stale driver location (10min+)",
       replace_existing=True
   )
   ```

6. Update the `start_timeout_scheduler` log message (around line 2420) to include the new job description.

**In main_new.py:**

7. Update `_VALID_ORDER_TRANSITIONS` at line 8627 to add `READY_FOR_PICKUP` as valid target from `OUT_FOR_DELIVERY`:
   ```python
   "OUT_FOR_DELIVERY": {"DELIVERED", "PENDING_DELIVERY_PROOF", "DELIVERY_FAILED", "READY_FOR_PICKUP"},
   ```

8. Add admin reassignment endpoint near the other delivery endpoints (around line 20210):
   ```python
   @app.post("/api/deliveries/{order_id}/reassign")
   def reassign_delivery_endpoint(
       order_id: int,
       _auth: dict = Depends(require_any_auth),
       db: Session = Depends(get_db)
   ):
       """Admin/system endpoint to manually reassign a delivery to the driver pool."""
       order = db.query(Order).filter(Order.id == order_id).first()
       if not order:
           raise HTTPException(status_code=404, detail="Order not found")
       if order.status != OrderStatus.OUT_FOR_DELIVERY:
           raise HTTPException(status_code=400, detail=f"Order must be OUT_FOR_DELIVERY to reassign. Current: {order.status.value}")
       if not order.driver_id:
           raise HTTPException(status_code=400, detail="Order has no assigned driver")

       from order_flow import reassign_delivery
       result = reassign_delivery(order, "Manual reassignment via admin endpoint", db)
       db.commit()
       return result
   ```

9. Add `/api/deliveries/` path prefix to the auth middleware allowlist check if needed (verify first -- it likely needs auth, so DON'T add to allowlist; require_any_auth Depends handles it).

**IMPORTANT:** Use `from order_flow import send_push_notification` pattern (already imported in main_new.py at line 10998). In order_flow.py, `send_push_notification` is defined locally at line 159. Use `from models import Driver, Order, OrderStatus, Customer` (already imported). Use `send_email` from the existing import (verify import exists in order_flow.py).
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -c "from order_flow import check_stale_driver_reassignment_job, reassign_delivery; print('Imports OK')"
    cd apps/web/p2p-platform/backend && python -c "from main_new import app; print('App loads OK')"
    grep -n "READY_FOR_PICKUP" apps/web/p2p-platform/backend/main_new.py | grep "OUT_FOR_DELIVERY"
    grep -n "stale_driver_reassignment" apps/web/p2p-platform/backend/order_flow.py
    grep -n "reassign_delivery_endpoint\|/api/deliveries/.*/reassign" apps/web/p2p-platform/backend/main_new.py
  </verify>
  <done>
    - `reassign_delivery()` helper exists and clears driver, resets to READY_FOR_PICKUP, sends 2 push notifications + email
    - `check_stale_driver_reassignment_job()` runs every 60s, detects OUT_FOR_DELIVERY orders with driver location_updated_at >10min stale
    - Job registered in APScheduler alongside existing delivery timeout jobs
    - `_VALID_ORDER_TRANSITIONS["OUT_FOR_DELIVERY"]` includes "READY_FOR_PICKUP"
    - `POST /api/deliveries/{order_id}/reassign` endpoint exists with auth requirement
    - In-memory dedup set prevents duplicate reassignment notifications
  </done>
</task>

<task type="auto">
  <name>Task 2: Unit tests for stale driver detection and reassignment</name>
  <files>
    apps/web/p2p-platform/backend/tests/unit/test_stale_driver_reassignment.py
  </files>
  <action>
Create `tests/unit/test_stale_driver_reassignment.py` with tests following the existing patterns in `tests/unit/test_order_flow.py` (MagicMock for db, order, driver objects).

**Test cases:**

1. `test_reassign_delivery_clears_driver_fields` -- Create mock order with driver_id=1, driver_name="John Doe", status=OUT_FOR_DELIVERY. Call `reassign_delivery(order, "test", db)`. Assert order.driver_id is None, order.driver_name is None, order.status == OrderStatus.READY_FOR_PICKUP, order.picked_up_at is None.

2. `test_reassign_delivery_sends_customer_notification` -- Mock `send_push_notification`, call reassign_delivery. Assert send_push_notification called with user_type="customer", title containing "Delivery Update".

3. `test_reassign_delivery_sends_driver_notification` -- Mock `send_push_notification`, call reassign_delivery with order.driver_id=5. Assert send_push_notification called with user_type="driver", user_id=5, title containing "Reassigned".

4. `test_stale_driver_detection_triggers_reassignment` -- Mock order with status=OUT_FOR_DELIVERY, driver with location_updated_at = 15 minutes ago. Mock db.query to return the order and driver. Patch `reassign_delivery`. Call `check_stale_driver_reassignment_job()`. Assert reassign_delivery was called.

5. `test_fresh_driver_location_not_reassigned` -- Mock order with driver whose location_updated_at = 2 minutes ago. Call check_stale_driver_reassignment_job. Assert reassign_delivery was NOT called.

6. `test_stale_driver_no_location_ever` -- Mock order with driver whose location_updated_at is None. Call check_stale_driver_reassignment_job. Assert reassign_delivery IS called (no location update at all = stale).

7. `test_dedup_prevents_double_reassignment` -- Call check_stale_driver_reassignment_job twice with same stale order. Assert reassign_delivery called only once.

8. `test_reassign_endpoint_rejects_wrong_status` -- Test the admin endpoint returns 400 for orders not in OUT_FOR_DELIVERY.

**Imports needed:** pytest, MagicMock, patch from unittest.mock, datetime/timedelta, OrderStatus from models. Use `@pytest.fixture` for mock_order, mock_driver, mock_db_session following patterns in test_order_flow.py.

**Pattern notes:**
- Mock `SessionLocal` for background jobs (they create their own db session)
- Use `patch("order_flow.SessionLocal")` for job tests
- Use `patch("order_flow.send_push_notification")` and `patch("order_flow.send_email")`
- Clear `_reassigned_orders` set between tests: `from order_flow import _reassigned_orders; _reassigned_orders.clear()`
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_stale_driver_reassignment.py -v
  </verify>
  <done>
    - All 8 test cases pass
    - Stale detection logic verified for >10min, <10min, and None location_updated_at
    - Reassignment helper verified to clear fields, send notifications, return result
    - Dedup logic verified
    - No regressions in existing tests: `python -m pytest tests/unit/test_order_flow.py -v --tb=short`
  </done>
</task>

</tasks>

<verification>
- `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_stale_driver_reassignment.py -v` -- all pass
- `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_order_flow.py -v --tb=short` -- no regressions
- `cd apps/web/p2p-platform/backend && python -c "from order_flow import check_stale_driver_reassignment_job, reassign_delivery; print('OK')"` -- imports clean
- `grep "READY_FOR_PICKUP" apps/web/p2p-platform/backend/main_new.py | grep OUT_FOR_DELIVERY` -- transition exists
- `grep "stale_driver_reassignment" apps/web/p2p-platform/backend/order_flow.py` -- job registered
</verification>

<success_criteria>
- Background job detects OUT_FOR_DELIVERY orders with driver.location_updated_at >10 minutes stale
- Detected orders are reassigned: driver cleared, status reset to READY_FOR_PICKUP, picked_up_at cleared
- Customer and driver both receive push notifications
- Support gets email with reassignment details
- Admin can manually trigger reassignment via POST /api/deliveries/{order_id}/reassign
- Dedup prevents duplicate notifications for same order
- All unit tests pass, no regressions in existing tests
- Status transition map updated to allow OUT_FOR_DELIVERY -> READY_FOR_PICKUP
</success_criteria>

<output>
After completion, create `.planning/quick/94-wave-2-gap-7-driver-offline-mid-delivery/94-SUMMARY.md`
</output>
