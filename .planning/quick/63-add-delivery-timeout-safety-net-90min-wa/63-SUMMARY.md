---
phase: quick-63
plan: 01
subsystem: backend, ui
tags: [scheduler, timeout, refund, push-notification, order-lifecycle]

requires:
  - phase: quick-59
    provides: "passing backend test suite"
provides:
  - "delivery_failed OrderStatus enum value"
  - "check_delivery_timeouts_job (90-min warn, 120-min auto-refund)"
  - "cleanup_stale_orders_job (24-hour stale order cancellation)"
  - "iOS/Android delivery_failed status handling in customer apps"
affects: [order-flow, customer-app, support-emails]

tech-stack:
  added: []
  patterns:
    - "In-memory set for idempotent notification firing in scheduler jobs"
    - "send_email with skip_validation=True for support escalation from background jobs"

key-files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/models.py"
    - "apps/web/p2p-platform/backend/order_flow.py"
    - "apps/web/p2p-platform/backend/tests/unit/test_models.py"
    - "apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift"
    - "apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift"
    - "/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrdersViewModel.kt"
    - "/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/order/OrderTrackingScreen.kt"

key-decisions:
  - "In-memory set for 90-min warning deduplication (process-scoped, restart-safe since re-firing is harmless)"
  - "120-min check runs before 90-min in loop to avoid double notification on same tick"

patterns-established:
  - "Delivery timeout pattern: warn at 90 min, fail at 120 min, cleanup at 24 hours"
  - "Background job escalation: push notification to customer + email to support@dollor.ai"

requirements-completed: [QUICK-63]

duration: 8min
completed: 2026-03-04
---

# Quick Task 63: Delivery Timeout Safety Net Summary

**90-min delivery warning + 120-min auto-refund + 24-hour stale order cleanup with iOS/Android delivery_failed status handling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T04:41:13Z
- **Completed:** 2026-03-04T04:49:30Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added `DELIVERY_FAILED` enum value to OrderStatus for orders that fail due to delivery timeout
- Created `check_delivery_timeouts_job` that warns customers at 90 min (once only via in-memory set) and auto-refunds at 120 min
- Created `cleanup_stale_orders_job` that cancels any active order older than 24 hours with refund
- Both jobs send push notifications to customers and escalation emails to support@dollor.ai
- iOS customer app shows delivery_failed in Completed tab with red "Delivery Failed" banner and refund message
- Android customer app shows delivery_failed in Completed tab with red error banner and refund message
- Both scheduler jobs registered on BackgroundScheduler (60s and 300s check intervals)

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend - Add delivery_failed status, timeout job, stale cleanup job** - `781ab4bc` (feat)
2. **Task 2: iOS - Handle delivery_failed in order filters and tracking UI** - `f6c5f491` (feat)
3. **Task 3: Android - Handle delivery_failed in order filters and tracking UI** - `d3deeeef` (feat, android repo)

## Files Created/Modified
- `apps/web/p2p-platform/backend/models.py` - Added DELIVERY_FAILED to OrderStatus enum
- `apps/web/p2p-platform/backend/order_flow.py` - Added check_delivery_timeouts_job, cleanup_stale_orders_job, scheduler registrations
- `apps/web/p2p-platform/backend/tests/unit/test_models.py` - Updated enum count assertion from 14 to 15
- `apps/ios/customer/eatfaircustomer/Views/OrderHistoryView.swift` - Added delivery_failed to completed filter
- `apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift` - Added isDeliveryFailed flag, stage 5 failure state, red refund banner
- `(android) app/.../OrdersViewModel.kt` - Added delivery_failed to isCompletedOrder()
- `(android) app/.../OrderTrackingScreen.kt` - Added delivery_failed to formatStatus(), red error banner in DeliveryStatusCard

## Decisions Made
- Used in-memory set (`_delivery_warned_orders`) for 90-min warning deduplication instead of a DB column -- process-scoped is acceptable since re-firing after restart is harmless (just another push/email)
- Check 120-min threshold before 90-min in the loop to prevent double notification when elapsed is >= 120

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated enum count in test_order_status_enum_values**
- **Found during:** Task 1 (backend changes)
- **Issue:** Test hardcodes `assert len(statuses) == 14` which fails after adding DELIVERY_FAILED (now 15)
- **Fix:** Updated assertion to 15 and added explicit `assert OrderStatus.DELIVERY_FAILED.value == "delivery_failed"`
- **Files modified:** `tests/unit/test_models.py`
- **Verification:** Test passes
- **Committed in:** 781ab4bc (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test fix was necessary for correctness. No scope creep.

## Issues Encountered
- 2 pre-existing test failures (test_get_realtime_analytics MagicMock comparison, test_ios_customer_android_driver_accept auth issue) -- not caused by this task, not addressed

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend delivery timeout safety net is active once deployed
- iOS and Android apps need TestFlight/Firebase distribution to reach users
- No DB migration needed -- enum value auto-maps via SQLAlchemy string column

---
*Phase: quick-63*
*Completed: 2026-03-04*
