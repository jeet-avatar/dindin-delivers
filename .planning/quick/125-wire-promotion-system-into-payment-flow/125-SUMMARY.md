---
phase: quick-125
plan: 01
subsystem: payments
tags: [promo-codes, discount, email, featured-deals, order-flow]

requires:
  - phase: quick-87
    provides: Promotion model and CRUD endpoints in models_extended.py
provides:
  - Promo code validation and discount in create_order flow
  - Vendor absorbs discount, platform keeps $2 flat regardless
  - Customer receipt email with discount line
  - Driver earnings email after food delivery completion
  - Featured deals endpoint querying real Promotion table
  - Startup migration for discount columns on orders table
affects: [ios-customer-app, android-customer-app, admin-portal]

tech-stack:
  added: []
  patterns:
    - "Built-in promo codes dict + DB lookup fallback for vendor promos"
    - "Vendor absorbs discount: restaurant_payout = subtotal - discount - platform_fee"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/email_service.py
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/stripe_integration.py
    - apps/web/p2p-platform/backend/tests/unit/test_order_flow.py

key-decisions:
  - "Built-in promo codes (WELCOME20, SAVE5, FREEDELIVERY, APPLE15, DOLLOR10, FIRST5) always available, DB promos for vendor-specific"
  - "Vendor absorbs discount -- platform revenue unchanged at $2/order"
  - "Driver earnings $0 platform fee for food delivery -- reinforced in earnings email"

patterns-established:
  - "Promo discount math: total = subtotal + tax + service_fee + delivery_fee + tip - discount"
  - "Vendor payout math: subtotal - discount_amount - platform_fee ($1)"

requirements-completed: [PROMO-WIRE]

duration: 20min
completed: 2026-03-10
---

# Quick Task 125: Wire Promotion System into Payment Flow Summary

**Promo code validation in order flow, discount in totals (vendor absorbs), receipt/driver/vendor emails with discount lines, featured deals from real DB**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-10T04:25:06Z
- **Completed:** 2026-03-10T04:45:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Promo code support wired into CreateOrderRequest with built-in codes + DB Promotion table lookup
- Discount subtracted from customer total, vendor absorbs discount (platform keeps $2 flat)
- Customer receipt email shows discount line when promo applied
- Driver earnings email sent after delivery completion ($0 platform fee for food delivery)
- Vendor notification email includes full payout breakdown with discount absorbed
- Featured deals endpoint returns real promotions from DB (verified on production)
- Startup migration adds discount_amount, promo_code, promo_type columns
- Sample email endpoint at /api/promotions/send-samples for testing
- All 1489 tests pass, 0 failures

## Task Commits

1. **Task 1: Verify promotion changes, fix tests, run full suite** - `c4b60252` (feat)
2. **Task 2: Deploy to staging + production** - deployed via CI/CD (push-triggered run 22887314353)

**Plan metadata:** (pending)

## Files Created/Modified
- `apps/web/p2p-platform/backend/models.py` - Added discount_amount, promo_code, promo_type to Order model
- `apps/web/p2p-platform/backend/order_flow.py` - Promo validation, discount math, vendor payout adjustment, driver earnings email call
- `apps/web/p2p-platform/backend/email_service.py` - Customer receipt discount line, driver earnings email function, vendor payout breakdown
- `apps/web/p2p-platform/backend/main_new.py` - Featured deals from real DB, startup migration, send-samples endpoint
- `apps/web/p2p-platform/backend/stripe_integration.py` - Vendor email passes discount/payout params in webhook
- `apps/web/p2p-platform/backend/tests/unit/test_order_flow.py` - Added discount_amount/promo_code/promo_type to 3 mock Order fixtures

## Decisions Made
- Built-in promo codes are hardcoded for reliability; vendor-specific promos come from DB Promotion table
- Vendor absorbs discount to keep platform revenue constant at $2/order ($1 customer + $1 restaurant)
- Driver food delivery platform fee is $0 -- highlighted in earnings email

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 5 test failures from MagicMock discount_amount comparison**
- **Found during:** Task 1 (test suite run)
- **Issue:** Mock Order objects (spec=Order) returned MagicMock for discount_amount, causing TypeError on `(order.discount_amount or 0)` comparison
- **Fix:** Added `discount_amount=0.0`, `promo_code=None`, `promo_type=None` to 3 mock fixtures (global mock_order, mock_order_no_photo, mock_order_with_photo)
- **Files modified:** tests/unit/test_order_flow.py
- **Verification:** All 5 previously failing tests pass, full suite 1489 passed
- **Committed in:** c4b60252

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix for test compatibility. No scope creep.

## Issues Encountered
None beyond the test fixture fix documented above.

## User Setup Required
None - no external service configuration required.

## Deployment Verification
- **Staging:** `https://d34u5ixl0bulv4.cloudfront.net/api/promotions/featured` returns fallback deals (no active promos in staging DB)
- **Production:** `https://api.dollor.ai/api/promotions/featured` returns real DB promotions with promo_code, restaurant_id, min_order fields
- **CI/CD runs:** Staging deploy 22887315343 (success), Production deploy 22887314353 (success)

## Next Phase Readiness
- iOS and Android apps can now pass promo_code in CreateOrderRequest
- Client-side promo code input UI can be built for checkout screens
- Featured deals can show real promo_code for one-tap apply

---
*Phase: quick-125*
*Completed: 2026-03-10*
