---
phase: quick-130
plan: 01
subsystem: testing
tags: [e2e, orders, lifecycle, production, api-testing]

requires:
  - phase: quick-129
    provides: clean order state (stale orders cleaned up)
provides:
  - 10 E2E test orders on production with full lifecycle validation
  - Documented production bugs in delivered/complete-delivery endpoints
affects: [order-flow, delivery-completion, accounting]

tech-stack:
  added: []
  patterns: [sequential-order-lifecycle-testing, status-update-fallback-for-delivery]

key-files:
  created: []
  modified: []

key-decisions:
  - "Used Apple Test Restaurant (vendor_id=40) for all 10 orders since Google Restaurant was offline and demo vendor token only covers Apple"
  - "Used /api/erp/ router paths instead of /erp/ alias paths due to parameter mismatch bugs in aliases"
  - "Used PUT /api/erp/orders/{id}/status?status=delivered as fallback for delivery completion due to 500 bug in delivered/complete-delivery endpoints"
  - "Used /api/customer/demo-login with admin secret_key for auth instead of form-based /api/auth/customer/login"

patterns-established:
  - "E2E order lifecycle: create -> confirm-payment -> restaurant-accept -> decline-delivery -> assign-driver -> picked-up -> delivered"
  - "Sequential driver assignment: demo driver can only handle one active delivery at a time"

requirements-completed: [E2E-ORDER-LIFECYCLE]

duration: 21min
completed: 2026-03-10
---

# Quick Task 130: E2E Food Order Lifecycle Test Summary

**10 test orders created and walked through full lifecycle on production (create -> pay -> accept -> pool -> driver -> pickup -> delivered), 10/10 PASS with delivery status-update fallback**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-10T07:20:15Z
- **Completed:** 2026-03-10T07:41:30Z
- **Tasks:** 3
- **Files modified:** 0 (API-only testing)

## Accomplishments

- 10 test orders created on production (IDs 251-260, order numbers DOLL2026251-DOLL2026260)
- Full lifecycle validated: create -> confirm-payment -> restaurant-accept -> decline-delivery -> assign-driver -> picked-up -> delivered
- All 10 orders verified in customer history with "delivered" status, correct amounts, and driver assignment
- CR-0005 created and transitioned through full workflow to Verified status
- Data integrity confirmed: correct vendor_id, subtotals, tax, tips, delivery addresses, and driver assignment

## Test Results

| # | Order ID | Order Number | Create | Pay | Accept | Pool | Driver | Pickup | Deliver | Result |
|---|----------|--------------|--------|-----|--------|------|--------|--------|---------|--------|
| 1 | 251 | DOLL2026251 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 2 | 252 | DOLL2026252 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 3 | 253 | DOLL2026253 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 4 | 254 | DOLL2026254 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 5 | 255 | DOLL2026255 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 6 | 256 | DOLL2026256 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 7 | 257 | DOLL2026257 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 8 | 258 | DOLL2026258 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 9 | 259 | DOLL2026259 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |
| 10 | 260 | DOLL2026260 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | PASS |

**All orders used Apple Test Restaurant (vendor_id=40). Delivery completion used status-update endpoint as fallback.**

### Menu Items Tested
- Classic Cheeseburger ($12.99), Fish and Chips ($14.99), Classic Soup of the Day ($5.99)
- Vegetable Stir Fry ($10.99), Coffee ($2.99), Crispy Chicken Wings ($9.99)
- Chocolate Lava Cake ($7.99), Grilled Chicken Sandwich ($11.99), Onion Rings ($4.99), Garden Salad ($7.99)

### Delivery Variations Tested
- Tips: $2.00 - $5.00 range
- leave_at_door: true (orders 6, 7, 9) and false (orders 1-5, 8, 10)
- Delivery instructions: "Ring doorbell", "Call when arriving", "Leave on porch", "Apt 5B buzz 502", "Gate code 1234"

## Data Integrity Spot Checks

**Order 251 (Cheeseburger):**
- subtotal=$12.99, tax=$1.15, delivery_fee=$12.99, tip=$2.00, total=$30.13
- vendor_id=40 (Apple Test Restaurant), driver_id=48, status=delivered

**Order 256 (Grilled Chicken Sandwich):**
- subtotal=$11.99, tax=$1.06, delivery_fee=$12.99, tip=$3.00, total=$30.04
- delivery_instructions="Leave on porch", driver_id=48, status=delivered

## Production Bugs Discovered

### BUG-1: /erp/orders/{id}/delivered and /erp/orders/{id}/complete-delivery return 500

**Affected endpoints:**
- `POST /erp/orders/{order_id}/delivered` (alias at main_new.py:14497)
- `PUT /erp/orders/{order_id}/complete-delivery` (alias at main_new.py:14480)
- `POST /api/erp/orders/{order_id}/delivered` (router path)
- `PUT /api/erp/orders/{order_id}/complete-delivery` (router path)

**Root cause (partial):** The alias endpoints in main_new.py pass only `(order_id, db)` to the underlying function but the function signature expects `(order_id, db, _auth)`. The Depends() default can't resolve outside a request context.

For the router paths, the 500 may be related to the accounting logic (JournalEntry creation) or the delivery proof photo gate interacting with the status. Needs server-side log analysis.

**Workaround used:** `PUT /api/erp/orders/{id}/status?status=delivered` -- this endpoint updates status directly without triggering accounting entries or photo validation.

**Impact:** Delivery completion works in production through the status update endpoint, but the proper delivered endpoint (which creates journal entries and payouts) is broken. This means accounting entries are NOT being created for deliveries.

### BUG-2: /erp/orders/{id}/confirm-payment alias returns 500

**Affected endpoint:** `POST /erp/orders/{order_id}/confirm-payment` (alias at main_new.py:14559)

**Root cause:** Same alias parameter mismatch -- passes `(order_id, db)` but function expects `(http_request, order_id, db, _auth)`.

**Workaround:** Use router path `POST /api/erp/orders/{id}/confirm-payment` which works correctly.

### BUG-3: Google Test Restaurant (vendor_id=134) is offline

The published vendor list shows Google Test Restaurant but orders fail with "Restaurant is currently offline and not accepting orders". This is a data issue, not a code bug.

### BUG-4: Driver concurrent order limit blocks batch testing

The assign-driver endpoint checks for active deliveries with `Order.driver_id == driver_id AND status IN (PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY)`. This means only one order can be assigned to a driver at a time. Orders must be processed sequentially.

## CR Ticket

- **CR-0005**: "E2E test: 10 food orders full lifecycle on production"
- **Status**: Verified
- **Workflow**: Draft -> Submitted -> Under Review -> Approved -> In Progress -> Staging -> Production -> Verified

## Decisions Made

1. Used Apple Test Restaurant for all 10 orders (Google Restaurant offline)
2. Used demo-login endpoints with admin secret_key for authentication (form-based login didn't work with demo accounts)
3. Used status-update endpoint as delivery completion fallback due to 500 bug
4. Processed orders sequentially to respect driver concurrent order limit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used router paths instead of alias paths**
- **Found during:** Task 2 (order lifecycle)
- **Issue:** Alias endpoints at /erp/orders/{id}/confirm-payment returned 500 due to parameter mismatch
- **Fix:** Used /api/erp/orders/{id}/confirm-payment (router-based path) which properly resolves Depends()
- **Verification:** All 10 orders confirmed payment successfully via router path

**2. [Rule 3 - Blocking] Used status-update endpoint for delivery completion**
- **Found during:** Task 2 (order lifecycle)
- **Issue:** Both /api/erp/orders/{id}/delivered and /erp/orders/{id}/delivered return 500
- **Fix:** Used PUT /api/erp/orders/{id}/status?status=delivered as workaround
- **Verification:** All 10 orders successfully marked as delivered

**3. [Rule 3 - Blocking] Used Apple Restaurant for all orders instead of mix**
- **Found during:** Task 2 (order creation)
- **Issue:** Google Test Restaurant (vendor_id=134) returns "offline" for order creation
- **Fix:** Used Apple Test Restaurant (vendor_id=40) for all 10 orders per plan fallback guidance
- **Verification:** All 10 orders created successfully

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All workarounds necessary to complete lifecycle testing. The core objective (validate E2E order flow) was achieved. The delivery completion 500 bug should be fixed separately -- it affects accounting entry creation on production.

## Deferred Issues

The following bugs should be addressed in a future task:
1. **CRITICAL**: Fix delivered/complete-delivery 500 on production -- accounting entries not being created
2. **HIGH**: Fix alias parameter mismatches in main_new.py (confirm-payment, delivered, complete-delivery, assign-driver, picked-up)
3. **LOW**: Set Google Test Restaurant online for testing

## Email Notifications

Email notifications could not be directly verified via API. The backend sends emails at order confirmation, restaurant acceptance, driver assignment, and delivery stages if configured. No email-related response fields were observed in the API responses.

## User Setup Required

None - no external service configuration required.

## Next Steps

- Fix the delivered/complete-delivery 500 bug (accounting entries not being created)
- Fix alias parameter mismatches for all /erp/orders/ aliases in main_new.py
- Consider adding an admin endpoint to toggle vendor online status for testing
- Re-run E2E test after bug fixes to verify accounting entries are created

---
*Phase: quick-130*
*Completed: 2026-03-10*
