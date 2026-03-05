---
phase: quick-95
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_address_validation.py
autonomous: true
requirements: [GAP-15]

must_haves:
  truths:
    - "Orders with missing or out-of-bounds lat/lng are rejected at checkout with 422"
    - "Orders with empty or incomplete address strings are rejected at checkout with 422"
    - "Driver can report an unreachable address and customer gets push notification"
    - "If customer does not respond within 5 minutes, order fails with refund"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "validate_delivery_address function + address-unreachable endpoint"
      contains: "def validate_delivery_address"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_address_validation.py"
      provides: "Unit tests for address validation and unreachable flow"
  key_links:
    - from: "order_flow.py create_order"
      to: "validate_delivery_address"
      via: "called before fee calculation"
      pattern: "validate_delivery_address"
    - from: "order_flow.py address_unreachable"
      to: "send_push_notification"
      via: "notifies customer"
      pattern: "send_push_notification.*address"
---

<objective>
Add address validation at order checkout and a driver "address unreachable" reporting endpoint.

Purpose: Prevent orders with invalid addresses from entering the system, and give drivers a way to report unreachable addresses (gated community, wrong address) with a 5-minute customer response window before failing the order.

Output: Two new backend features in order_flow.py with unit tests.
</objective>

<context>
@apps/web/p2p-platform/backend/order_flow.py (lines 477-486: CreateOrderRequest, lines 1137-1270: create_order, lines 4197-4291: cancel_no_customer pattern)
@apps/web/p2p-platform/backend/models.py (lines 438-441: Order.delivery_address/delivery_latitude/delivery_longitude, line 408: DELIVERY_FAILED)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Address validation at checkout + address-unreachable endpoint</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
1. Add `validate_delivery_address(address: Dict[str, Any])` function in order_flow.py (near CreateOrderRequest, ~line 487):
   - Extract lat from `address.get("latitude") or address.get("lat")`
   - Extract lng from `address.get("longitude") or address.get("lng")`
   - Validate lat/lng are provided and numeric, lat in [24.0, 50.0], lng in [-125.0, -66.0] (continental US bounds)
   - Validate `address.get("street")` is non-empty string with len >= 3
   - Validate at least one of: `address.get("city")` or `address.get("zip")` is non-empty
   - Return None if valid, raise HTTPException(422) with descriptive detail if invalid
   - Do NOT reject pickup orders (delivery_address is Optional in stripe_integration.py's CreateOrderRequest but required Dict in order_flow.py's -- only validate when address is provided)

2. Wire validation into `create_order()` at line ~1207 (BEFORE tax/fee calculation):
   - Call `validate_delivery_address(order_data.delivery_address)` right after vendor checks (line 1158) and price change check (line 1204), before state_code extraction

3. Add `AddressUnreachableRequest(BaseModel)` near CancelNoCustomerRequest (~line 4197):
   - `notes: Optional[str] = None` (driver description of issue)

4. Add `POST /orders/{order_id}/address-unreachable` endpoint in order_flow.py router (after cancel-no-customer):
   - Require driver auth: `driver: Driver = Depends(require_driver)`
   - Verify order exists, driver is assigned (`order.driver_id != driver.id` -> 403)
   - Verify order status is OUT_FOR_DELIVERY (else 400)
   - Record report: set `order.delivery_notes = f"ADDRESS UNREACHABLE: {request_body.notes or 'No details provided'}"` (delivery_notes is a Text column if it exists; if not, store in order's existing fields)
   - Send push notification to customer: `send_push_notification(user_type="customer", user_id=order.customer_id, title="Driver Cannot Reach Address", body="Your driver cannot reach your delivery address. Please update your address or contact support. If no response in 5 minutes, your order will be cancelled with a refund.", data={"type": "address_unreachable", "order_id": str(order.id)})`
   - Set `order.address_unreachable_reported_at = datetime.now()` -- add this as a transient tracking field. If column doesn't exist on Order model, store it in `order.driver_location` JSON field as `{"address_unreachable_at": ISO timestamp, ...existing}` or use an in-memory dict keyed by order_id (simpler).
   - Return `{"success": True, "order_id": order.id, "message": "Address unreachable reported. Customer notified. Order will be cancelled in 5 minutes if no response.", "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()}`

5. Add address-unreachable timeout check to the existing background delivery monitoring loop in order_flow.py (the same loop that handles 90-min/120-min delivery warnings from quick-63). Find the periodic check function and add: if order has address_unreachable marker and 5 min elapsed with no status change, set `order.status = OrderStatus.DELIVERY_FAILED`, trigger refund if payment exists, notify customer.

6. Add iOS alias in main_new.py near the other `/erp/orders/{order_id}/` aliases (~line 14344):
   ```python
   @app.post("/erp/orders/{order_id}/address-unreachable")
   async def address_unreachable_alias(order_id: int, request_body: AddressUnreachableRequest, driver: Driver = Depends(require_driver), db: Session = Depends(get_db)):
       """Alias for iOS Driver app - report address unreachable"""
       return await report_address_unreachable(order_id, request_body, db, driver)
   ```
   Import AddressUnreachableRequest and report_address_unreachable from order_flow at the top of main_new.py where other order_flow imports exist.

IMPORTANT: Check if Order model has `delivery_notes` column (grep models.py). If not, use an in-memory dict `_address_unreachable_orders: Dict[int, datetime] = {}` at module level in order_flow.py to track the 5-min timer. This avoids a DB migration.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -c "from order_flow import validate_delivery_address, AddressUnreachableRequest; print('imports OK')"
  </verify>
  <done>
    - validate_delivery_address rejects: missing lat/lng, out-of-bounds coords, empty street, missing city+zip
    - POST /orders/{id}/address-unreachable exists and sends push notification
    - iOS alias /erp/orders/{id}/address-unreachable wired up
    - 5-min timeout logic added to background loop
  </done>
</task>

<task type="auto">
  <name>Task 2: Unit tests for address validation and unreachable flow</name>
  <files>apps/web/p2p-platform/backend/tests/unit/test_address_validation.py</files>
  <action>
Create test file following the pattern from test_delivery_no_customer.py (uses conftest.client fixture, NOT local client).

**Address validation tests:**
- `test_validate_address_valid` -- full address with lat/lng/street/city/zip passes
- `test_validate_address_missing_latitude` -- raises 422
- `test_validate_address_missing_longitude` -- raises 422
- `test_validate_address_lat_out_of_bounds_low` -- lat=20.0 raises 422
- `test_validate_address_lat_out_of_bounds_high` -- lat=55.0 raises 422
- `test_validate_address_lng_out_of_bounds` -- lng=-130.0 raises 422
- `test_validate_address_empty_street` -- street="" raises 422
- `test_validate_address_missing_city_and_zip` -- both missing raises 422
- `test_validate_address_city_only_valid` -- has city but no zip, passes
- `test_validate_address_zip_only_valid` -- has zip but no city, passes
- `test_validate_address_alt_keys` -- uses "lat"/"lng" instead of "latitude"/"longitude", passes

**Address unreachable tests (mock send_push_notification):**
- `test_address_unreachable_success` -- driver assigned, OUT_FOR_DELIVERY, returns success
- `test_address_unreachable_wrong_driver` -- returns 403
- `test_address_unreachable_wrong_status` -- order in PENDING, returns 400
- `test_address_unreachable_order_not_found` -- returns 404

Import validate_delivery_address directly for unit tests. For endpoint tests, use client fixture with proper auth fixtures from conftest (driver_auth_headers).

IMPORTANT: Use `from order_flow import validate_delivery_address` for direct function tests. For endpoint tests, follow conftest patterns -- never create local test client fixtures.
  </action>
  <verify>
    cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_address_validation.py -v
  </verify>
  <done>
    - All address validation unit tests pass
    - All address-unreachable endpoint tests pass
    - No regressions in existing tests
  </done>
</task>

</tasks>

<verification>
1. `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_address_validation.py -v` -- all tests pass
2. `cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --timeout=60` -- no regressions
3. `grep -n "validate_delivery_address" apps/web/p2p-platform/backend/order_flow.py` -- function exists and is called in create_order
4. `grep -n "address-unreachable" apps/web/p2p-platform/backend/order_flow.py apps/web/p2p-platform/backend/main_new.py` -- endpoint + alias exist
</verification>

<success_criteria>
- Invalid addresses rejected with 422 before order creation
- Driver can POST address-unreachable and customer gets push notification
- 5-minute timeout auto-fails order with DELIVERY_FAILED + refund
- All new tests pass, no regressions in existing test suite
</success_criteria>

<output>
After completion, create `.planning/quick/95-wave-2-gap-15-address-validation-geocode/95-SUMMARY.md`
</output>
