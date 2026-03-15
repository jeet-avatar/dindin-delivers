---
phase: quick-142
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [QUICK-142]

must_haves:
  truths:
    - "GET /api/vendors/{id}/orders response includes payment_status for each order"
    - "GET /api/vendors/{id}/orders response includes delivery_decision_sent_at for each order"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "get_vendor_orders result dict with two new fields"
      contains: "payment_status"
  key_links:
    - from: "order_flow.py result.append()"
      to: "Order model"
      via: "order.payment_status, order.delivery_decision_sent_at"
      pattern: "payment_status.*order\\.payment_status"
---

<objective>
Add `payment_status` and `delivery_decision_sent_at` to the `result.append()` dict in `get_vendor_orders` (order_flow.py ~line 3191).

Purpose: These fields exist on the Order model but are absent from the vendor orders response, causing iOS/Android restaurant apps to lack payment and delivery-decision state.
Output: Both fields present in every order object returned by GET /api/vendors/{id}/orders.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add payment_status and delivery_decision_sent_at to get_vendor_orders result dict</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
In order_flow.py at the `result.append({...})` block ending at line 3191, insert two new fields immediately before the closing `})` (after the `"delivered_at"` line):

```python
            "payment_status": order.payment_status.value if getattr(order, 'payment_status', None) else None,
            "delivery_decision_sent_at": (order.delivery_decision_sent_at.isoformat() + "Z") if getattr(order, 'delivery_decision_sent_at', None) else None,
```

Use `getattr` with None fallback (same defensive pattern as `driver_en_route`, `picked_up_at` etc. already used in this block) so the endpoint does not break if either column is absent from a legacy row.

If `payment_status` is an enum, call `.value` to serialize it as a string. If it is already a plain string, use `getattr(order, 'payment_status', None)` directly without `.value`.

Verify the actual type by checking the Order model definition before writing:
```bash
grep -n "payment_status\|delivery_decision_sent_at" apps/web/p2p-platform/backend/models.py | head -20
```
Adjust `.value` usage based on what the grep returns (Column(Enum(...)) → use .value; Column(String) → omit .value).
  </action>
  <verify>
1. Confirm field types: `grep -n "payment_status\|delivery_decision_sent_at" apps/web/p2p-platform/backend/models.py`
2. Syntax check: `python -c "import ast; ast.parse(open('apps/web/p2p-platform/backend/order_flow.py').read()); print('OK')`
3. Run related tests: `cd apps/web/p2p-platform/backend && python -m pytest tests/test_vendor_endpoints.py -v -x 2>&1 | tail -20`
  </verify>
  <done>
Both fields appear in the result.append() dict. Syntax check passes. Vendor endpoint tests pass (32/32 or equivalent).
  </done>
</task>

</tasks>

<verification>
- `grep -n "payment_status\|delivery_decision_sent_at" apps/web/p2p-platform/backend/order_flow.py` shows both new lines in the result.append() block
- `python -m pytest tests/test_vendor_endpoints.py -v` passes
</verification>

<success_criteria>
GET /api/vendors/{id}/orders response dict for each order contains:
- `payment_status`: string (enum value) or null
- `delivery_decision_sent_at`: ISO-8601 timestamp string + "Z" suffix, or null
</success_criteria>

<output>
After completion, create `.planning/quick/142-add-payment-status-and-delivery-decision/142-SUMMARY.md`
</output>
