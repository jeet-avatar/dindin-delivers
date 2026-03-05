---
phase: quick-89
plan: 89
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/rideshare_payments.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/stripe_integration.py
  - apps/web/p2p-platform/backend/matchmaking_routes.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/tests/unit/test_payment_safety.py
autonomous: true
requirements: [GAP-1, GAP-2, GAP-5, GAP-6]

must_haves:
  truths:
    - "Duplicate Stripe API calls with same order/ride ID produce exactly one charge (idempotency)"
    - "Payment failure after food prepared triggers auto-refund and order status rollback"
    - "Checkout rejects order if menu item prices changed since cart was built"
    - "Checkout blocks order placement if vendor is_online=false"
    - "Pending orders auto-cancel when vendor goes offline"
  artifacts:
    - path: "apps/web/p2p-platform/backend/rideshare_payments.py"
      provides: "Idempotency key on ride PaymentIntent.create"
      contains: "idempotency_key"
    - path: "apps/web/p2p-platform/backend/matchmaking_routes.py"
      provides: "Idempotency key on connection fee PaymentIntent.create"
      contains: "idempotency_key"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Price validation, vendor offline check, payment failure rollback"
      contains: "price_changed"
    - path: "apps/web/p2p-platform/backend/stripe_integration.py"
      provides: "Idempotency key on simple PaymentIntent.create"
      contains: "idempotency_key"
    - path: "apps/web/p2p-platform/backend/tests/unit/test_payment_safety.py"
      provides: "Unit tests for all 4 payment safety features"
      min_lines: 150
  key_links:
    - from: "order_flow.py create_order"
      to: "VendorMenuItem.price"
      via: "price comparison at checkout"
      pattern: "price_changed|expected_price|price.*mismatch"
    - from: "order_flow.py create_order"
      to: "Vendor.is_online"
      via: "vendor online check before order creation"
      pattern: "is_online.*False|vendor.*offline"
---

<objective>
Add 4 critical payment safety features from Gap Analysis Wave 1: (1) Stripe idempotency keys on ALL payment calls to prevent double charges, (2) payment failure rollback with auto-refund after food prepared, (3) price change detection at checkout, (4) vendor offline blocking at checkout + auto-cancel.

Purpose: Prevent double charges (chargeback/lawsuit risk), protect restaurants from cooking unpaid food, protect customers from stale pricing, and prevent orders to closed restaurants.
Output: Modified payment files with safety checks + comprehensive unit tests.
</objective>

<context>
@.planning/quick/88-gap-analysis-vs-doordash-swiggy-prioriti/88-SUMMARY.md
@apps/web/p2p-platform/backend/rideshare_payments.py
@apps/web/p2p-platform/backend/order_flow.py
@apps/web/p2p-platform/backend/stripe_integration.py
@apps/web/p2p-platform/backend/matchmaking_routes.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Stripe idempotency keys to all payment calls + payment failure rollback</name>
  <files>
    apps/web/p2p-platform/backend/rideshare_payments.py
    apps/web/p2p-platform/backend/matchmaking_routes.py
    apps/web/p2p-platform/backend/stripe_integration.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
**GAP-1: Stripe Idempotency Keys (prevent double charges)**

There are 7 Stripe API calls across 4 files that lack idempotency keys. Add `idempotency_key` to each:

1. `rideshare_payments.py:131` — `stripe.PaymentIntent.create()` for ride payment
   - Add: `idempotency_key=f"ride_pi_{ride.id}_{ride.request_id}"`
   - Note: This file already has app-level idempotency (checks `ride.stripe_payment_intent_id` at line 88), but Stripe-level idempotency is the real safety net against network retries.

2. `matchmaking_routes.py:415` — `stripe.PaymentIntent.create()` for connection fee
   - Add: `idempotency_key=f"conn_fee_{ride.request_id}_{bid.id}"`

3. `stripe_integration.py:146` — `stripe.PaymentIntent.create()` for simple mobile payments
   - Add: `idempotency_key=f"simple_pi_{request.order_id}_{int(datetime.now().timestamp())}"`
   - Note: This is a generic endpoint; use order_id + timestamp since there's no unique DB row yet.

4. `order_flow.py:976` — `stripe.Transfer.create()` for ride driver payout
   - Add: `idempotency_key=f"ride_driver_xfer_{ride.id}"`

5. `order_flow.py:3211` — `stripe.Transfer.create()` for food vendor payout
   - Add: `idempotency_key=f"vendor_xfer_{order.id}_{order.order_number}"`

6. `order_flow.py:3264` — `stripe.Transfer.create()` for food driver payout
   - Add: `idempotency_key=f"driver_xfer_{order.id}_{order.order_number}"`

7. `bid_routes.py:2022` — `stripe.Transfer.create()` for rideshare driver transfer
   - Add: `idempotency_key=f"bid_driver_xfer_{ride.id}_{bid.id}"`
   - Read file first: `grep -n "stripe.Transfer.create" bid_routes.py` to confirm exact line.

Also check `main_new.py:5359` and `main_new.py:17775` for any additional PaymentIntent/Transfer calls and add idempotency keys there too. Use `grep -n "stripe\.\(PaymentIntent\|Transfer\|Charge\|Refund\)\.create" main_new.py` to find all.

**GAP-2: Payment failure after food prepared — rollback + auto-refund**

In `order_flow.py`, find the delivery completion flow (the function that calls `stripe.Transfer.create` for vendor/driver payouts around lines 3102-3284). Add a try/except around the Stripe Transfer calls that:

1. If `stripe.Transfer.create` fails for vendor payout:
   - Log error with order_number
   - Set `vendor_payout.status = "failed"`
   - Do NOT block order completion (payout can be retried manually)

2. If `stripe.Transfer.create` fails for driver payout:
   - Log error with order_number
   - Set `driver_payout_record.status = "failed"`
   - Do NOT block order completion

3. Add a new endpoint `POST /api/orders/{order_id}/refund` in `order_flow.py`:
   - Requires `require_any_auth` (admin or customer who owns the order)
   - Checks order has `stripe_payment_intent_id`
   - Calls `stripe.Refund.create(payment_intent=order.stripe_payment_intent_id, idempotency_key=f"refund_{order.id}")`
   - Updates `order.payment_status = "refunded"` and `order.status = OrderStatus.CANCELLED`
   - Returns `{"success": True, "refund_id": refund.id}`
   - If order status is already DELIVERED or COMPLETED, return 400 "Cannot refund completed order"
   - If payment_status is already "refunded", return 400 "Order already refunded"

This covers the "food prepared but payment fails" scenario — the payment intent was already authorized, but if confirmation/capture fails, the order gets refunded automatically.
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && grep -c "idempotency_key" rideshare_payments.py matchmaking_routes.py stripe_integration.py order_flow.py bid_routes.py main_new.py`
    Expected: Every file with stripe.PaymentIntent.create or stripe.Transfer.create has at least one idempotency_key.
    Run: `grep -n "def.*refund" order_flow.py` to confirm refund endpoint exists.
  </verify>
  <done>
    All 7+ Stripe API calls have idempotency_key parameters. Refund endpoint exists at POST /api/orders/{order_id}/refund with proper auth, status checks, and Stripe Refund.create call.
  </done>
</task>

<task type="auto">
  <name>Task 2: Price change detection + vendor offline blocking at checkout</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/stripe_integration.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**GAP-5: Price change detection at checkout**

In `order_flow.py` `create_order()` (line 1135), the code already fetches `menu_item.price` and uses it for calculation. But the client sent an expected price that might differ from current DB price. Add validation:

1. In the `for item in order_data.items:` loop (line 1158), after fetching `menu_item`:
   - Check if the item dict has an `expected_price` or `price` field (the client-side cart price)
   - If present AND `abs(menu_item.price - item.get("expected_price", item.get("price", menu_item.price))) > 0.01`:
     - Collect into a `price_changes` list: `{"item": menu_item.item_name, "expected": expected_price, "current": menu_item.price}`
   - After the loop, if `price_changes` is non-empty:
     - Return HTTP 409 with `{"detail": "Menu prices have changed", "price_changes": price_changes}`
     - This forces the client to refresh cart and re-submit

2. Do the same in `stripe_integration.py` `create_order()` (line 171) — same pattern. The item model there uses `item.menu_item_id` and `item.quantity`. Add `expected_price` check after fetching the menu_item at line 195.

3. Also update `CreateOrderRequest` (find it with `grep -n "class CreateOrderRequest" order_flow.py stripe_integration.py`) — if the items field is a list of dicts, ensure it accepts an optional `expected_price` float field. If it's a Pydantic model, add `expected_price: Optional[float] = None` to the item schema.

**GAP-6: Vendor offline blocking at checkout + auto-cancel on go-offline**

1. In BOTH `create_order()` functions (`order_flow.py:1135` and `stripe_integration.py:171`):
   - After fetching the vendor and checking `onboarding_status`, add:
   ```python
   if not vendor.is_online:
       raise HTTPException(status_code=400, detail="Restaurant is currently offline and not accepting orders")
   ```
   - This uses `Vendor.is_online` (models.py:252, Boolean, default=False)

2. In `main_new.py`, find the vendor go-offline endpoint. Search with:
   `grep -n "is_online" main_new.py | head -20`

   At the endpoint where vendors toggle `is_online = False`, add logic to auto-cancel pending orders:
   - Query: `pending_orders = db.query(Order).filter(Order.vendor_id == vendor.id, Order.status.in_([OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING])).all()`
   - For each pending order:
     - Set `order.status = OrderStatus.CANCELLED`
     - Set `order.payment_status = "refunded"` if it had a payment intent
     - If `order.stripe_payment_intent_id`, call `stripe.PaymentIntent.cancel(order.stripe_payment_intent_id)` (wrapped in try/except, non-blocking)
     - Log: `f"Auto-cancelled order {order.order_number} — vendor went offline"`
   - Return the count of cancelled orders in the response: `"auto_cancelled_orders": len(pending_orders)`
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && grep -n "price_change\|price_changes\|expected_price" order_flow.py stripe_integration.py`
    Expected: Price validation logic present in both create_order functions.
    Run: `grep -n "is_online" order_flow.py stripe_integration.py`
    Expected: Vendor online check in both create_order functions.
    Run: `grep -n "auto_cancelled\|auto.cancel" main_new.py`
    Expected: Auto-cancel logic in vendor go-offline endpoint.
  </verify>
  <done>
    Checkout returns 409 with price_changes array when menu prices differ from cart. Checkout returns 400 when vendor is offline. Vendor going offline auto-cancels all PENDING/PENDING_PAYMENT orders with Stripe PaymentIntent cancellation.
  </done>
</task>

<task type="auto">
  <name>Task 3: Unit tests for all 4 payment safety features</name>
  <files>
    apps/web/p2p-platform/backend/tests/unit/test_payment_safety.py
  </files>
  <action>
Create `tests/unit/test_payment_safety.py` with comprehensive tests. Use the same patterns as existing tests in `tests/unit/test_stripe_integration.py` (mock Stripe with `@patch`).

**Test structure:**

```python
import pytest
from unittest.mock import patch, MagicMock
# Follow import patterns from test_stripe_integration.py
```

**Test cases (minimum 15 tests):**

GAP-1 Idempotency (4 tests):
1. `test_ride_payment_includes_idempotency_key` — Mock stripe.PaymentIntent.create, verify `idempotency_key` kwarg is passed with format `ride_pi_{ride_id}_{request_id}`
2. `test_connection_fee_includes_idempotency_key` — Same for matchmaking connection fee
3. `test_order_payment_includes_idempotency_key` — Same for stripe_integration.py order creation (already has one at line 313, verify it's there)
4. `test_transfer_includes_idempotency_key` — Mock stripe.Transfer.create in order_flow delivery completion, verify idempotency_key present

GAP-2 Payment failure rollback (4 tests):
5. `test_refund_endpoint_success` — POST /api/orders/{id}/refund with valid order returns 200 + refund_id
6. `test_refund_already_refunded_returns_400` — Order with payment_status="refunded" returns 400
7. `test_refund_completed_order_returns_400` — DELIVERED order returns 400
8. `test_vendor_transfer_failure_does_not_block_completion` — Mock stripe.Transfer.create to raise StripeError, verify order still completes (payout status = "failed")

GAP-5 Price change detection (4 tests):
9. `test_checkout_rejects_stale_prices` — Submit order with expected_price=10.99, menu_item.price=12.99, expect 409 with price_changes
10. `test_checkout_accepts_matching_prices` — Submit with matching prices, expect 200/201
11. `test_checkout_accepts_no_expected_price` — Backward compat: no expected_price field, expect normal flow
12. `test_price_change_response_includes_item_details` — Verify 409 body has item name, expected price, current price

GAP-6 Vendor offline (3 tests):
13. `test_checkout_blocks_offline_vendor` — Set vendor.is_online=False, expect 400 "currently offline"
14. `test_checkout_allows_online_vendor` — Set vendor.is_online=True, expect normal flow
15. `test_vendor_going_offline_cancels_pending_orders` — Call vendor toggle-offline endpoint, verify pending orders get cancelled

Use `TestClient` from FastAPI for endpoint tests, or mock the DB session directly depending on the patterns in existing test files. Check `test_order_flow.py` and `test_stripe_integration.py` for setup patterns.

Run full test suite after writing: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q` to confirm no regressions in the 1331 existing tests.
  </action>
  <verify>
    Run: `cd apps/web/p2p-platform/backend && python -m pytest tests/unit/test_payment_safety.py -v`
    Expected: All 15+ tests pass.
    Run: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q --tb=short`
    Expected: All 1331+ tests pass (no regressions).
  </verify>
  <done>
    15+ unit tests covering idempotency keys, refund endpoint, price change detection, and vendor offline blocking all pass. Full test suite (1331+ tests) still passes with zero regressions.
  </done>
</task>

</tasks>

<verification>
1. `grep -rn "idempotency_key" apps/web/p2p-platform/backend/*.py | grep -v test | grep -v __pycache__` — should show 7+ occurrences across payment files
2. `grep -n "price_change" apps/web/p2p-platform/backend/order_flow.py apps/web/p2p-platform/backend/stripe_integration.py` — price validation in both create_order functions
3. `grep -n "is_online" apps/web/p2p-platform/backend/order_flow.py apps/web/p2p-platform/backend/stripe_integration.py` — vendor online check in both
4. `python -m pytest tests/ -x -q` from backend dir — all tests pass
</verification>

<success_criteria>
- All Stripe PaymentIntent.create and Transfer.create calls have idempotency_key parameters
- POST /api/orders/{id}/refund endpoint exists with proper auth and status checks
- Checkout returns 409 when menu prices changed since cart was built
- Checkout returns 400 when vendor is offline
- Vendor going offline auto-cancels pending orders
- 15+ new unit tests pass
- 1331+ existing tests still pass (zero regressions)
</success_criteria>

<output>
After completion, create `.planning/quick/89-wave-1-payment-safety-stripe-idempotency/89-SUMMARY.md`
</output>
