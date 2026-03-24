---
phase: quick-208
plan: "02"
subsystem: backend-order-flow
tags: [restaurant, self-delivery, erp-aliases, push-notifications, gap-fix]
dependency_graph:
  requires: []
  provides:
    - "POST /erp/orders/{id}/vendor-arrived-at-delivery (GAP-2)"
    - "POST /erp/orders/{id}/vendor-delivered + order_delivered_for_vendor() (GAP-4)"
    - "Delivery decision timeout push notifications to drivers + restaurant (GAP-5)"
  affects:
    - "apps/web/p2p-platform/backend/main_new.py"
    - "apps/web/p2p-platform/backend/order_flow.py"
tech_stack:
  added: []
  patterns:
    - "ERP alias pattern: @app.post('/erp/...') with require_vendor Depends, delegates to order_flow function"
    - "Vendor-auth delivered path: skips driver_id ownership check, same accounting/payout logic"
    - "Timeout job notifications: both calls wrapped in try/except with logger.warning"
key_files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/main_new.py (lines 15481-15482 import, 15595-15611 two new aliases)"
    - "apps/web/p2p-platform/backend/order_flow.py (lines 2268-2286 timeout job, 4332-4536 order_delivered_for_vendor)"
decisions:
  - "Used require_vendor Depends on both new ERP aliases (not require_any_auth) for proper IDOR protection"
  - "order_delivered_for_vendor() skips delivery_fee/tip DriverPayout since driver_id is null for self-delivery"
  - "Timeout job: load vendor via db.query() inside loop (not order.vendor eager-load) per anti-hallucination correction"
  - "Timeout notifications each wrapped independently in try/except so driver notify failure does not block restaurant notify"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 2
---

# Phase quick-208 Plan 02: Restaurant Flow Backend Gap Fixes Summary

**One-liner:** Three backend gaps closed — vendor-arrived-at-delivery ERP alias (GAP-2), vendor-auth self-delivery mark-delivered with full accounting (GAP-4), and delivery decision timeout push notifications to drivers and restaurant (GAP-5).

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add vendor-arrived-at-delivery ERP alias (GAP-2) | `7d2f6507` | `main_new.py` (import + alias) |
| 2 | Fix self-delivery Mark Delivered auth mismatch (GAP-4) + timeout notifications (GAP-5) | `7d2f6507` | `main_new.py` (alias), `order_flow.py` (function + timeout job) |

---

## What Was Built

### GAP-2: vendor-arrived-at-delivery ERP alias

Added to `main_new.py:15595`:
```python
@app.post("/erp/orders/{order_id}/vendor-arrived-at-delivery")
async def vendor_arrived_alias(order_id: int, vendor: Vendor = Depends(require_vendor), db: Session = Depends(get_db)):
```
Delegates to `order_flow.vendor_arrived_at_delivery()` (line 4943) which sends customer push notification "Your Order Has Arrived". Previously caused 404 when the iOS restaurant app called this endpoint.

### GAP-4: vendor-delivered ERP alias + order_delivered_for_vendor()

Added to `main_new.py:15604`:
```python
@app.post("/erp/orders/{order_id}/vendor-delivered")
async def vendor_delivered_alias(order_id: int, vendor: Vendor = Depends(require_vendor), db: Session = Depends(get_db)):
```

Added `order_delivered_for_vendor()` to `order_flow.py:4332` — a vendor-auth variant of `order_delivered()` that:
- Skips the `order.driver_id != driver.id` check (driver_id is null for self-delivery)
- Verifies `order.vendor_id == vendor.id` and `order.restaurant_will_deliver == True`
- Runs the same delivery proof photo gate, DELIVERED status transition, JournalEntry, VendorPayout, Stripe auto-transfer, and push notification logic
- Omits DriverPayout (no driver on self-delivery orders)

Previously, the generic `/erp/orders/{id}/delivered` alias would hit `order_delivered()` which enforced `order.driver_id != driver.id`, causing 403 or TypeError for self-delivery orders.

### GAP-5: Delivery decision timeout push notifications

Replaced two `# TODO` comments in `check_delivery_decision_timeouts_job()` (`order_flow.py:2268`) with:
1. `notify_drivers_new_order(order, prep_minutes, vendor, db)` — notifies nearby drivers that a previously-held order is now available in the driver pool
2. `send_push_notification("vendor", order.vendor_id, "Delivery Decision Expired", ...)` — notifies restaurant that their 3-minute self-delivery window expired and the order was sent to the driver pool

Both calls are wrapped in try/except with `logger.warning()` so timeout job failures are non-blocking.

---

## Verification

```
grep -n "vendor-arrived-at-delivery\|vendor-delivered" main_new.py
# 15595: @app.post("/erp/orders/{order_id}/vendor-arrived-at-delivery")
# 15604: @app.post("/erp/orders/{order_id}/vendor-delivered")

grep -n "def order_delivered_for_vendor" order_flow.py
# 4332: async def order_delivered_for_vendor(

grep -n "notify_drivers_new_order" order_flow.py | grep -v "^282:"
# 1752: (inside restaurant_accept — pre-existing)
# 2272: (inside check_delivery_decision_timeouts_job — NEW)

python -m py_compile order_flow.py && python -m py_compile main_new.py
# order_flow.py: syntax OK
# main_new.py: syntax OK
```

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Anti-hallucination correction] Used correct push notification pattern for GAP-5**
- **Found during:** Task 2, pre-execution
- **Issue:** Plan's inline GAP-5 code used `order.vendor.fcm_token` (Vendor has no `fcm_token` field — it has `push_token`) and used wrong `send_push_notification` signature
- **Fix:** Used the verified `send_push_notification("vendor", order.vendor_id, title, body, data=..., db=db)` pattern per anti_hallucination_corrections. Loaded vendor via explicit `db.query(Vendor)` inside the loop
- **Files modified:** `order_flow.py`

**2. [Rule 2 - Missing critical functionality] Added vendor import to timeout job section**
- **Found during:** Task 2
- **Issue:** The timeout job uses `order.vendor_id` but does not eager-load vendor. Required explicit DB query for `notify_drivers_new_order()` signature
- **Fix:** Added `vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()` inside the timeout loop per corrected pattern
- **Files modified:** `order_flow.py`

---

## Self-Check: PASSED

- `grep "vendor-arrived-at-delivery" main_new.py` → line 15595: `@app.post` decorator confirmed
- `grep "vendor-delivered" main_new.py` → line 15604: `@app.post` decorator confirmed
- `grep "def order_delivered_for_vendor" order_flow.py` → line 4332 confirmed
- `grep "notify_drivers_new_order" order_flow.py | grep 2272` → call inside timeout job confirmed
- `python -m py_compile order_flow.py` → syntax OK
- `python -m py_compile main_new.py` → syntax OK
- Commit `7d2f6507` exists: `git log --oneline -1` confirms
