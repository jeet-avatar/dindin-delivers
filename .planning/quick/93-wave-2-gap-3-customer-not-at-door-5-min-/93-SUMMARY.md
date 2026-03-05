---
phase: quick-93
plan: 01
subsystem: api
tags: [order-flow, delivery, driver, push-notifications, refund]

# Dependency graph
requires:
  - phase: quick-63
    provides: DELIVERY_FAILED OrderStatus and delivery timeout flow
provides:
  - POST /orders/{id}/driver-arrived-at-delivery endpoint with 5-min timer
  - POST /orders/{id}/cancel-no-customer endpoint with leave-at-door / refund logic
  - leave_at_door and driver_arrived_at_delivery Order columns
  - ERP aliases for iOS driver app
affects: [ios-driver-app, android-driver-app, order-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [driver-arrival-tracking, customer-no-show-flow, leave-at-door-delivery]

key-files:
  created:
    - apps/web/p2p-platform/backend/tests/unit/test_delivery_no_customer.py
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/main_new.py

key-decisions:
  - "require_driver auth (not require_any_auth) for both endpoints to ensure only assigned driver can act"
  - "leave-at-door path marks DELIVERED (driver still gets paid), non-leave-at-door path marks DELIVERY_FAILED with refund"
  - "5-minute timer enforced server-side via timestamp comparison, not client-side"

patterns-established:
  - "Customer no-show flow: arrival tracking -> timer enforcement -> leave-at-door or cancel with photo proof"

requirements-completed: [WAVE2-GAP3]

# Metrics
duration: 15min
completed: 2026-03-05
---

# Quick-93: Customer Not At Door Flow Summary

**Driver arrival tracking with 5-min wait timer, leave-at-door delivery, and cancel-with-photo-proof for customer no-show scenarios**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-05T08:53:07Z
- **Completed:** 2026-03-05T09:08:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Two new Order columns: `leave_at_door` (Boolean) and `driver_arrived_at_delivery` (DateTime)
- POST /orders/{id}/driver-arrived-at-delivery: records arrival timestamp, sends push to customer, returns 300s timer
- POST /orders/{id}/cancel-no-customer: enforces 5-min wait, photo proof required, leave-at-door -> DELIVERED, otherwise -> DELIVERY_FAILED + refund
- Updated transition map: OUT_FOR_DELIVERY -> PENDING_DELIVERY_PROOF / DELIVERY_FAILED
- ERP aliases for iOS driver app compatibility
- 9 comprehensive unit tests, 1355 total tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add leave_at_door + driver_arrived_at_delivery to Order model and DB migration** - `9ef10c75` (feat)
2. **Task 2: Add driver-arrived-at-delivery and cancel-no-customer endpoints** - `1fc004a0` (feat)
3. **Task 3: Unit tests for delivery no-customer flow** - `ec4a8607` (test)

## Files Created/Modified
- `apps/web/p2p-platform/backend/models.py` - Added leave_at_door and driver_arrived_at_delivery columns to Order
- `apps/web/p2p-platform/backend/order_flow.py` - Added CreateOrderRequest.leave_at_door, two new endpoints, CancelNoCustomerRequest model
- `apps/web/p2p-platform/backend/main_new.py` - DB migration entries, transition map updates, ERP aliases, order response fields
- `apps/web/p2p-platform/backend/tests/unit/test_delivery_no_customer.py` - 9 unit tests covering all paths

## Decisions Made
- Used `require_driver` from auth_utils (not `require_any_auth`) to ensure only the assigned driver can call these endpoints
- Leave-at-door path marks order as DELIVERED (driver gets paid, customer gets photo proof notification)
- Non-leave-at-door path marks DELIVERY_FAILED and triggers refund via existing trigger_refund
- Timer enforcement is server-side only (elapsed time from driver_arrived_at_delivery timestamp)
- Push notification failures are caught and logged but don't block the endpoint response

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend endpoints ready for iOS/Android driver app integration
- iOS driver app needs UI for: "I've arrived" button, 5-min countdown timer, "Leave at door" / "Cancel - no customer" actions with camera
- Android driver app needs matching UI implementation

---
*Phase: quick-93*
*Completed: 2026-03-05*
