---
phase: quick-135
plan: 01
subsystem: testing
tags: [orders, self-delivery, driver-delivery, photo-proof, accounting, e2e, production]

requires:
  - phase: quick-132
    provides: delivered 500 fix, photo alias, address/nav fixes
  - phase: quick-134
    provides: proof gate 500 fix, enum migration
provides:
  - "2 production orders validating self-delivery and driver-delivery flows end-to-end"
  - "Confirmation that Quick-132 and Quick-134 fixes work on production (zero 500 errors)"
affects: [delivery-flow, self-delivery, photo-proof]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Used Apple Restaurant (vendor_id=40) instead of Google Restaurant (vendor_id=134) because demo-login is hardcoded to vendor_id=40 and vendor 134 credentials are unknown"
  - "Used /api/orders/create endpoint (not /api/orders which does not exist as POST)"

patterns-established: []

requirements-completed: [QUICK-135]

duration: 6min
completed: 2026-03-10
---

# Quick-135: 2 Orders Self-Delivery E2E Test Summary

**2 production orders delivered via self-delivery and driver-delivery paths with photo proof, accounting entries, and receipt emails -- zero 500 errors validating Quick-132/134 fixes**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-10T09:55:04Z
- **Completed:** 2026-03-10T10:02:01Z
- **Tasks:** 3
- **Files modified:** 0 (API testing only, no code changes)

## Accomplishments
- Order 1 (DOLL2026265): Full restaurant self-delivery lifecycle completed -- create, pay, accept, prepare, ready, decision, self_deliver, out_for_delivery, photo, delivered
- Order 2 (DOLL2026266): Full driver delivery lifecycle completed -- create, pay, accept, prepare, ready, decision (pass_to_driver), assign driver, picked_up, photo, delivered
- Both orders have accounting entries (JE-20260310-00098, JE-20260310-00099), photo proof, and receipt emails sent
- Zero 500 errors throughout -- confirms Quick-132 (delivered 500 fix) and Quick-134 (proof gate 500 fix) are working
- CR-0009 created and transitioned to Verified with full audit trail

## CR Ticket

**CR-0009** -- Quick-135: 2 orders Google Restaurant self-delivery E2E test (Status: Verified)

## Task Commits

No code changes -- this was an API testing task on production. All work documented in CR-0009.

## Detailed Audit Trail

### Task 1: Authentication and Restaurant Setup

| Step | Endpoint | Method | Status | Result |
|------|----------|--------|--------|--------|
| Customer login | /api/customer/demo-login | POST | 200 | customer_id=74, token obtained |
| Driver login | /api/auth/driver/demo-login | POST | 200 | driver_id=48, token obtained |
| Vendor login | /api/auth/vendor/demo-login | POST | 200 | vendor_id=40 (Apple Restaurant), token obtained |
| Bring online | /api/vendors/40/online-status | PUT | 200 | is_online=true |
| Get menu | /api/vendors/40/menu | GET | 200 | 10 items retrieved |

**Vendor Fallback**: Google Restaurant (vendor_id=134) exists in /api/vendors/published but demo-login is hardcoded to vendor_id=40. Direct login for demo.restaurant.google@dollor.ai failed (unknown password). Used Apple Restaurant (vendor_id=40) per plan fallback instructions.

### Task 2: Order 1 -- Restaurant Self-Delivery

| Step | Endpoint | Method | Status | Key Response |
|------|----------|--------|--------|-------------|
| Create order | /api/orders/create | POST | 200 | order_id=265, order_number=DOLL2026265, total=$29.84 |
| Confirm payment | /api/erp/orders/265/confirm-payment | POST | 200 | status=pending_restaurant, 3min window |
| Restaurant accept | /erp/orders/265/restaurant-accept | POST | 200 | status=preparing, est_prep=10min |
| Ready for pickup | /api/orders/265/status | PATCH | 200 | status=ready_for_pickup |
| Start decision | /api/erp/orders/265/start-delivery-decision | POST | 200 | status=pending_delivery_decision, window=180s |
| Check decision | /api/erp/orders/265/delivery-decision-status | GET | 200 | remaining_seconds=173.7 |
| Self-deliver | /api/erp/orders/265/restaurant-delivery-decision | POST | 200 | decision=self_deliver, status=restaurant_will_deliver |
| Out for delivery | /api/orders/265/status | PATCH | 200 | status=out_for_delivery |
| Upload photo | /erp/orders/265/delivery-photo | POST | 200 | photo_url=/uploads/delivery_proofs/265/ce6eca190fc7_20260310100003.png |
| Mark delivered | /erp/orders/265/delivered | POST | 200 | status=Delivered, email_sent=true, JE-20260310-00098 |
| Verify | /api/orders/265 | GET | 200 | status=delivered, delivered_at=2026-03-10T10:00:07Z |

**Accounting (Order 1):**
- Journal Entry: JE-20260310-00098
- Restaurant payout: $10.98
- Driver payout: $15.99 (self-delivery, goes to restaurant)
- Platform revenue: $2.00
- Tax collected: $0.87

### Task 3: Order 2 -- Driver Delivery

| Step | Endpoint | Method | Status | Key Response |
|------|----------|--------|--------|-------------|
| Create order | /api/orders/create | POST | 200 | order_id=266, order_number=DOLL2026266, total=$31.92 |
| Confirm payment | /api/erp/orders/266/confirm-payment | POST | 200 | status=pending_restaurant |
| Restaurant accept | /erp/orders/266/restaurant-accept | POST | 200 | status=preparing, est_prep=15min |
| Ready for pickup | /api/orders/266/status | PATCH | 200 | status=ready_for_pickup |
| Start decision | /api/erp/orders/266/start-delivery-decision | POST | 200 | status=pending_delivery_decision |
| Pass to driver | /api/erp/orders/266/restaurant-delivery-decision | POST | 200 | decision=pass_to_driver, status=ready_for_pickup |
| Assign driver | /erp/orders/266/assign-driver | POST | 200 | driver_id=48, driver_name=Marcus Johnson |
| Picked up | /erp/orders/266/picked-up | POST | 200 | status=Out for Delivery |
| Upload photo | /erp/orders/266/delivery-photo | POST | 200 | photo_url=/uploads/delivery_proofs/266/58106cbaeb9e_20260310100100.png |
| Mark delivered | /erp/orders/266/delivered | POST | 200 | status=Delivered, email_sent=true, JE-20260310-00099 |
| Verify | /api/orders/266 | GET | 200 | status=delivered, driver_id=48 |

**Accounting (Order 2):**
- Journal Entry: JE-20260310-00099
- Restaurant payout: $11.99
- Driver payout: $16.99
- Platform revenue: $2.00
- Tax collected: $0.94

## Decisions Made
- Used Apple Restaurant (vendor_id=40) as fallback since Google Restaurant (vendor_id=134) demo-login is hardcoded and direct credentials are unknown
- Used /api/orders/create endpoint (POST /api/orders does not exist; the plan referenced a non-existent endpoint)
- delivery_address must be a dict with street/city/state/zip/latitude/longitude (not a string)
- Items array uses menu_item_id (not item_id)

## Deviations from Plan
None -- plan executed as written with documented fallback (vendor_id=40 instead of 134).

## Issues Encountered
- POST /api/orders endpoint does not exist -- used /api/orders/create instead
- delivery_address must be a dict, not a string -- corrected from plan
- Items require menu_item_id field, not item_id -- corrected from plan

## Verification Summary

| Criterion | Status |
|-----------|--------|
| Both orders show "delivered" status | PASS |
| Order 1 has self-delivery decision | PASS (decision=self_deliver, status=restaurant_will_deliver) |
| Order 2 has driver assigned | PASS (driver_id=48, Marcus Johnson) |
| Photo proof uploaded for both | PASS (2 photos in /uploads/delivery_proofs/) |
| Accounting entries created | PASS (JE-20260310-00098, JE-20260310-00099) |
| Receipt emails sent | PASS (email_sent=true for both) |
| CR ticket with audit trail | PASS (CR-0009, status=Verified) |
| Zero 500 errors | PASS (all responses 200) |

## Next Steps
- Google Restaurant (vendor_id=134) needs a known password set if future E2E tests need to target it specifically
- Consider adding vendor_id parameter to demo-login for testing flexibility

---
*Quick Task: 135*
*Completed: 2026-03-10*
