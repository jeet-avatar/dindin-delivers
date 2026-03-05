---
phase: quick-93
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_delivery_no_customer.py
autonomous: true
requirements: [WAVE2-GAP3]
must_haves:
  truths:
    - "Driver can mark arrival at delivery location, starting a 5-min wait timer"
    - "After 5 minutes, driver can leave food at door (if leave_at_door=true) or cancel with photo proof (if leave_at_door=false)"
    - "Cancel-no-customer endpoint requires photo_url and 5-min timer expiry"
    - "Customer receives push notification when order is cancelled due to no-show"
    - "leave_at_door boolean persists on order and influences driver options after timer"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "leave_at_door + driver_arrived_at_delivery columns on Order"
      contains: "leave_at_door"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "arrived-at-delivery, cancel-no-customer endpoints"
      exports: ["driver_arrived_at_delivery", "cancel_no_customer"]
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "DB migration, transition map updates, ERP aliases"
      contains: "driver_arrived_at_delivery"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_delivery_no_customer.py"
      provides: "Unit tests for new endpoints and timer logic"
      min_lines: 80
  key_links:
    - from: "order_flow.py cancel_no_customer"
      to: "send_push_notification"
      via: "customer notification on delivery_failed"
      pattern: "send_push_notification.*customer.*delivery_failed"
    - from: "order_flow.py driver_arrived_at_delivery"
      to: "Order.driver_arrived_at_delivery"
      via: "timestamp recording"
      pattern: "driver_arrived_at_delivery.*datetime"
---

<objective>
Add "customer not at door" flow for food delivery: driver arrival tracking, 5-minute wait timer, leave-at-door option, and driver cancel with photo proof.

Purpose: When a driver arrives at the delivery location and the customer doesn't come out, the driver needs a structured flow -- wait 5 minutes, then either leave food at door (if customer opted in) or cancel with photo proof. This protects drivers from being stuck indefinitely and provides accountability via photos.

Output: 3 new backend endpoints, 2 new Order columns, updated transition map, unit tests.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/models.py (Order model starts line 410, OrderStatus enum line 386)
@apps/web/p2p-platform/backend/order_flow.py (order_delivered line 3071, upload_delivery_photo line 3936, check_delivery_timeouts_job line 2150)
@apps/web/p2p-platform/backend/main_new.py (_VALID_ORDER_TRANSITIONS line 8613, migration columns line 1330, ERP aliases line 14244)
@apps/web/p2p-platform/backend/auth_utils.py (require_driver, require_any_auth)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add leave_at_door + driver_arrived_at_delivery to Order model and DB migration</name>
  <files>
    apps/web/p2p-platform/backend/models.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
1. In `models.py`, add two new columns to the Order class (after `delivery_photo_uploaded_at` around line 490):
   - `leave_at_door = Column(Boolean, default=False)` -- customer sets at checkout
   - `driver_arrived_at_delivery = Column(DateTime, nullable=True)` -- timestamp when driver taps "arrived"

2. In `main_new.py`, add DB migration entries to the `_COLUMN_MIGRATIONS` list (around line 1348, after the delivery proof photo columns):
   ```python
   ("orders", "leave_at_door", "BOOLEAN DEFAULT FALSE"),
   ("orders", "driver_arrived_at_delivery", "TIMESTAMP"),
   ```

3. In `main_new.py`, update `_VALID_ORDER_TRANSITIONS` (line 8624) to allow `OUT_FOR_DELIVERY` to transition to `PENDING_DELIVERY_PROOF` and `DELIVERY_FAILED`:
   ```python
   "OUT_FOR_DELIVERY": {"DELIVERED", "PENDING_DELIVERY_PROOF", "DELIVERY_FAILED"},
   ```
   Also add `DELIVERY_FAILED` as a terminal state if not already present:
   ```python
   "DELIVERY_FAILED": set(),  # Terminal state
   ```

4. Include `leave_at_door` in the order creation flow. Find the order creation in `order_flow.py` (the `create_order` function) and ensure `leave_at_door` is accepted as an optional field in the `CreateOrderRequest` Pydantic model and stored on the order. Search for `class CreateOrderRequest` in `order_flow.py` to find the model -- add `leave_at_door: Optional[bool] = False`. Then in the create logic, set `order.leave_at_door = request.leave_at_door`.

5. Include `leave_at_door` and `driver_arrived_at_delivery` in order detail responses. Find where `delivery_photo_url` is returned in order tracking responses (order_flow.py around line 3820 and line 14846 in main_new.py) and add:
   ```python
   "leave_at_door": getattr(order, 'leave_at_door', False),
   "driver_arrived_at_delivery": (order.driver_arrived_at_delivery.isoformat() + "Z") if getattr(order, 'driver_arrived_at_delivery', None) else None,
   ```
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && python -c "from models import Order; print([c.name for c in Order.__table__.columns if 'leave' in c.name or 'arrived_at_delivery' in c.name])"`
    Expected: `['leave_at_door', 'driver_arrived_at_delivery']`
  </verify>
  <done>Order model has leave_at_door (Boolean) and driver_arrived_at_delivery (DateTime) columns. Migration entries exist. Transition map updated. Fields included in order responses and creation request.</done>
</task>

<task type="auto">
  <name>Task 2: Add driver-arrived-at-delivery and cancel-no-customer endpoints</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
1. In `order_flow.py`, add two new endpoints AFTER the `upload_delivery_photo` function (around line 3999):

**Endpoint A: POST /orders/{order_id}/driver-arrived-at-delivery**
```python
@router.post("/orders/{order_id}/driver-arrived-at-delivery")
async def driver_arrived_at_delivery(
    order_id: int,
    db: Session = Depends(get_db),
    driver: Driver = Depends(require_driver),
):
```
- Validate order exists, order.driver_id == driver.id (403 if not), status is OUT_FOR_DELIVERY (400 otherwise)
- If `driver_arrived_at_delivery` already set, return 400 "Already marked as arrived"
- Set `order.driver_arrived_at_delivery = datetime.now()`, commit
- Send push notification to customer: title="Driver Has Arrived", body="Your driver has arrived at your delivery location. Please come out to receive your order.", data={"type": "driver_arrived", "order_id": str(order.id)}
- Return `{"success": True, "order_id": order.id, "arrived_at": order.driver_arrived_at_delivery.isoformat() + "Z", "wait_timer_seconds": 300, "leave_at_door": order.leave_at_door}`

**Endpoint B: POST /orders/{order_id}/cancel-no-customer**
```python
class CancelNoCustomerRequest(BaseModel):
    photo_url: str  # URL of proof photo (already uploaded via /orders/{id}/delivery-photo)

@router.post("/orders/{order_id}/cancel-no-customer")
async def cancel_no_customer(
    order_id: int,
    request_body: CancelNoCustomerRequest,
    db: Session = Depends(get_db),
    driver: Driver = Depends(require_driver),
):
```
- Validate order exists, order.driver_id == driver.id (403 if not)
- Validate status is OUT_FOR_DELIVERY or PENDING_DELIVERY_PROOF (400 otherwise)
- Validate `order.driver_arrived_at_delivery` is set (400 "Must mark arrival first")
- Calculate elapsed = (datetime.now() - order.driver_arrived_at_delivery).total_seconds()
- If elapsed < 300 (5 min), return 400 with `{"detail": "Must wait 5 minutes after arrival", "seconds_remaining": int(300 - elapsed)}`
- Set `order.delivery_photo_url = request_body.photo_url` (photo proof of food left / no customer)
- Set `order.delivery_photo_uploaded_at = datetime.now()`
- If `order.leave_at_door` is True:
  - Set status to DELIVERED, set delivered_at, process payout (call the same payout logic from order_delivered -- extract into helper or call order_delivered directly)
  - Return `{"success": True, "status": "delivered", "message": "Food left at door with photo proof"}`
- If `order.leave_at_door` is False:
  - Set status to DELIVERY_FAILED
  - Trigger refund if stripe_payment_intent_id exists (use `trigger_refund(order, reason="Customer not available at delivery location")`)
  - Set `order.payment_status = "refunded"`
  - Return `{"success": True, "status": "delivery_failed", "message": "Order cancelled - customer not available"}`
- In BOTH cases, send push notification to customer:
  - If leave_at_door: title="Order Left at Door", body="Your driver left your order at the door. A photo has been taken for confirmation."
  - If not leave_at_door: title="Order Could Not Be Delivered", body="Your driver waited 5 minutes but could not reach you. The order has been cancelled and a refund will be issued."
  - data={"type": "delivery_no_customer", "order_id": str(order.id), "left_at_door": str(order.leave_at_door).lower()}
- Commit and return

2. In `main_new.py`, add ERP aliases for the new endpoints (after the existing ERP aliases around line 14320):
```python
@app.post("/erp/orders/{order_id}/driver-arrived-at-delivery")
async def driver_arrived_alias(order_id: int, driver: Driver = Depends(require_driver), db: Session = Depends(get_db)):
    """Alias for iOS Driver app - mark arrived at delivery"""
    return await driver_arrived_at_delivery(order_id, db, driver)

@app.post("/erp/orders/{order_id}/cancel-no-customer")
async def cancel_no_customer_alias(order_id: int, request_body: CancelNoCustomerRequest, driver: Driver = Depends(require_driver), db: Session = Depends(get_db)):
    """Alias for iOS Driver app - cancel due to no customer"""
    return await cancel_no_customer(order_id, request_body, db, driver)
```
Add the necessary imports at the top of the ERP aliases section: `from order_flow import driver_arrived_at_delivery, cancel_no_customer, CancelNoCustomerRequest`

3. Use `from order_flow import send_push_notification` pattern (same as quick-64) for all push notifications in these endpoints. Use `require_driver` from `auth_utils.py` (NOT require_any_auth) to ensure only the assigned driver can call these endpoints.

4. Import `trigger_refund` from the same module where it's used in `check_delivery_timeouts_job` (it's in order_flow.py itself -- just use it directly since we're in the same file).
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && grep -n "driver-arrived-at-delivery\|cancel-no-customer" order_flow.py main_new.py`
    Expected: Both endpoint definitions in order_flow.py and both aliases in main_new.py
  </verify>
  <done>Two new endpoints exist: POST /orders/{id}/driver-arrived-at-delivery (records arrival, starts 5-min timer, notifies customer) and POST /orders/{id}/cancel-no-customer (validates 5-min wait, handles leave-at-door vs cancel with refund, requires photo proof, notifies customer). ERP aliases exist for iOS driver app.</done>
</task>

<task type="auto">
  <name>Task 3: Unit tests for delivery no-customer flow</name>
  <files>
    apps/web/p2p-platform/backend/tests/unit/test_delivery_no_customer.py
  </files>
  <action>
Create `tests/unit/test_delivery_no_customer.py` with the following tests. Use the same mock/patch pattern as `test_order_flow.py` -- mock db sessions, create mock Order objects with the right attributes.

Tests to write:

1. **test_driver_arrived_at_delivery_success** -- Mock order with status OUT_FOR_DELIVERY, driver_id matches. Verify driver_arrived_at_delivery is set, returns 200 with wait_timer_seconds=300.

2. **test_driver_arrived_at_delivery_wrong_driver** -- Mock order with different driver_id. Verify 403 returned.

3. **test_driver_arrived_at_delivery_wrong_status** -- Mock order with status PREPARING. Verify 400 returned.

4. **test_driver_arrived_at_delivery_already_arrived** -- Mock order with driver_arrived_at_delivery already set. Verify 400 returned.

5. **test_cancel_no_customer_before_5_min** -- Mock order with driver_arrived_at_delivery set to 2 minutes ago. Verify 400 with seconds_remaining.

6. **test_cancel_no_customer_leave_at_door_true** -- Mock order with leave_at_door=True, driver_arrived_at_delivery set to 6 minutes ago. Verify status becomes DELIVERED (not DELIVERY_FAILED), push notification sent.

7. **test_cancel_no_customer_leave_at_door_false** -- Mock order with leave_at_door=False, driver_arrived_at_delivery set to 6 minutes ago. Verify status becomes DELIVERY_FAILED, refund triggered, push notification sent.

8. **test_cancel_no_customer_must_arrive_first** -- Mock order without driver_arrived_at_delivery. Verify 400 "Must mark arrival first".

9. **test_cancel_no_customer_wrong_driver** -- Mock order with different driver_id. Verify 403.

Use `unittest.mock.patch` for `send_push_notification` and `trigger_refund`. Use `from datetime import datetime, timedelta` to create timestamps in the past. Import from `order_flow` directly and test the async functions using `pytest.mark.asyncio` or by using the test client pattern from conftest.

Follow the project test convention: use `conftest.client` fixture (never define local client fixtures). Use `@pytest.fixture` for mock orders. Check `tests/conftest.py` for the test DB setup pattern.

Run `pytest tests/unit/test_delivery_no_customer.py -v` at the end to verify all pass.
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_delivery_no_customer.py -v`
    Expected: All 9 tests pass
  </verify>
  <done>9 unit tests cover: arrival marking (success, wrong driver, wrong status, duplicate), cancel-no-customer (timer enforcement, leave-at-door delivered path, no-leave-at-door failed path, must-arrive-first, wrong driver). All tests pass.</done>
</task>

</tasks>

<verification>
1. `cd apps/web/p2p-platform/backend && python -c "from models import Order; print('leave_at_door' in [c.name for c in Order.__table__.columns])"` returns True
2. `grep -c "driver-arrived-at-delivery\|cancel-no-customer" apps/web/p2p-platform/backend/order_flow.py` returns 2+
3. `grep -c "driver-arrived-at-delivery\|cancel-no-customer" apps/web/p2p-platform/backend/main_new.py` returns 2+ (ERP aliases)
4. `grep "DELIVERY_FAILED" apps/web/p2p-platform/backend/main_new.py | grep -c "Terminal\|OUT_FOR_DELIVERY"` returns 2 (transition + terminal)
5. `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_delivery_no_customer.py -v` -- all pass
6. `cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --timeout=120` -- no regressions (all existing tests still pass)
</verification>

<success_criteria>
- Order model has `leave_at_door` (Boolean, default False) and `driver_arrived_at_delivery` (DateTime, nullable) columns
- POST /orders/{id}/driver-arrived-at-delivery records timestamp, notifies customer, returns 300s timer
- POST /orders/{id}/cancel-no-customer enforces 5-min wait, handles leave-at-door (DELIVERED) vs no-leave-at-door (DELIVERY_FAILED + refund)
- Both endpoints require driver auth and verify driver owns the order
- ERP aliases exist for iOS driver app compatibility
- _VALID_ORDER_TRANSITIONS allows OUT_FOR_DELIVERY -> PENDING_DELIVERY_PROOF and DELIVERY_FAILED
- 9 unit tests pass, no regressions in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/93-wave-2-gap-3-customer-not-at-door-5-min-/93-SUMMARY.md`
</output>
