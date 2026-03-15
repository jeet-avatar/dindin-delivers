---
phase: quick-176
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements:
  - DEMO-PAYMENT-BYPASS
must_haves:
  truths:
    - "Demo customer placing an order at a demo vendor skips Stripe and proceeds directly to PENDING_RESTAURANT"
    - "The 'I Will Deliver' button on the restaurant app works for demo orders without requiring Stripe webhook"
    - "Non-demo orders are unaffected — they still follow the normal PENDING_PAYMENT -> Stripe -> confirm-payment flow"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Demo payment bypass logic"
      contains: "demo.customer@dollor.ai"
  key_links:
    - from: "order creation (line ~1393)"
      to: "OrderStatus.PENDING_RESTAURANT"
      via: "inline bypass after db.commit()"
      pattern: "demo\\.customer@dollor\\.ai"
---

<objective>
Add a demo payment bypass in the order creation flow so that orders from `demo.customer@dollor.ai` at vendor IDs 1, 40, or 134 are auto-advanced to `PENDING_RESTAURANT` (payment_status="succeeded") without going through Stripe.

Purpose: App Store review uses the demo account to test the full ordering flow. The "I Will Deliver" button in the restaurant app requires the order to be in PENDING_RESTAURANT status, but demo orders stall at PENDING_PAYMENT because no real Stripe payment is triggered.

Output: Modified `order_flow.py` with a 6-line bypass block inserted after the order is committed.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add demo payment bypass after order creation in order_flow.py</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
    In `order_flow.py`, locate the block immediately after the order is committed and refreshed (around line 1393, after `db.refresh(new_order)`). Insert the following bypass block BEFORE the promo redemption tracking block (before the `if applied_promo_code` check at line ~1396):

    ```python
    # Demo payment bypass: skip Stripe for demo orders at known demo vendors
    DEMO_CUSTOMER_EMAIL = "demo.customer@dollor.ai"
    DEMO_VENDOR_IDS = {1, 40, 134}
    if (order_data.customer_email == DEMO_CUSTOMER_EMAIL and
            order_data.vendor_id in DEMO_VENDOR_IDS):
        new_order.payment_status = "succeeded"
        new_order.status = OrderStatus.PENDING_RESTAURANT
        new_order.sent_to_restaurant_at = datetime.now()
        db.commit()
        db.refresh(new_order)
        logging.info(f"Demo payment bypass applied for order {new_order.order_number}")
    ```

    The insertion point is between `db.refresh(new_order)` (line ~1393) and the line `if applied_promo_code and discount_amount > 0:` (line ~1396).

    Do NOT touch the return block — the response already reads from `new_order` fields so `status` returned will still say "Pending Payment" in the response text (cosmetic only; the DB row now has the correct status). The response `status` field is a display string — the app uses the order ID to poll actual status, so this is acceptable. No other files need changes.

    Use `OrderStatus.PENDING_RESTAURANT` which is already imported at the top of the file. `datetime` is also already imported.
  </action>
  <verify>
    Run the backend test suite to confirm no regressions:
    ```
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -x -q --timeout=60 2>&1 | tail -20
    ```
    Then verify the bypass logic is present:
    ```
    grep -n "demo.customer@dollor.ai\|DEMO_VENDOR_IDS\|Demo payment bypass" apps/web/p2p-platform/backend/order_flow.py
    ```
  </verify>
  <done>
    - `grep` returns the 3 lines confirming bypass code is present in order_flow.py
    - Test suite passes (same count as before, no new failures)
    - A manual curl to POST /api/orders/create with customer_email="demo.customer@dollor.ai" and vendor_id=40 would return a new order that has status=PENDING_RESTAURANT in the database (not PENDING_PAYMENT)
  </done>
</task>

</tasks>

<verification>
After task completes:
1. `grep -n "demo.customer@dollor.ai" apps/web/p2p-platform/backend/order_flow.py` — should show the bypass check
2. `python -m pytest tests/ -x -q` — should pass with zero new failures
3. Logic check: order_data.customer_email comparison is case-sensitive (email is stored lowercase by registration flow, demo account uses lowercase — correct)
</verification>

<success_criteria>
- Demo customer orders at vendor IDs 1, 40, 134 are auto-advanced to PENDING_RESTAURANT at creation time
- All other orders (non-demo email OR non-demo vendor) remain on PENDING_PAYMENT flow unchanged
- Backend test suite passes without regression
</success_criteria>

<output>
After completion, create `.planning/quick/176-implement-demo-payment-bypass-for-demo-o/176-SUMMARY.md`
</output>
