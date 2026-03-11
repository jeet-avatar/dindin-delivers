---
phase: quick-145
plan: 01
subsystem: api, ui
tags: [push-notification, eta, haversine, self-delivery, order-card, ios, android]

requires:
  - phase: quick-144
    provides: test order DOLL2026270 for self-delivery testing
provides:
  - "Haversine ETA calculation in self-delivery push notification to customer"
  - "Order placed date/time on iOS restaurant order cards"
  - "Order placed date/time on Android partner order cards"
affects: [customer-app, restaurant-app, partner-app]

tech-stack:
  added: []
  patterns:
    - "Self-delivery ETA uses _haversine_eta (25mph + 2min buffer) from google_maps_service.py"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt

key-decisions:
  - "Used existing _haversine_eta function rather than Google Maps API for ETA -- simpler, no API cost, sufficient accuracy for self-delivery"
  - "Default 20-minute fallback when coordinates unavailable"

patterns-established:
  - "Self-delivery push includes estimated_delivery_minutes in both body text and data payload"

requirements-completed: [QUICK-145]

duration: 5min
completed: 2026-03-11
---

# Quick-145: Self-Delivery ETA to Customer + Order Time on Cards Summary

**Haversine-based delivery ETA in self-delivery push notifications, plus order placed timestamps on iOS/Android restaurant order cards**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T02:23:44Z
- **Completed:** 2026-03-11T02:29:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Customer receives push notification with "Estimated arrival in X minutes" when restaurant starts self-delivery
- ETA calculated from vendor-to-customer haversine distance at 25mph + 2min buffer, with 20min fallback
- iOS restaurant order cards now show "X items * M/D/YY, H:MM AM/PM * Xm ago"
- Android partner order cards now show "X items * M/D H:MM AM/PM * Xm ago"

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend -- Calculate ETA and include in self-delivery push notification** - `45740dda` (feat)
2. **Task 2: iOS Restaurant -- Show order placed date/time on order cards** - `e6d78252` (feat)
3. **Task 3: Android Partner -- Show order placed date/time on order cards** - `c76ae466` (feat, in eatfair-android repo)

## Files Created/Modified
- `apps/web/p2p-platform/backend/order_flow.py` - ETA calculation via _haversine_eta, included in push body/data and API response
- `apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` - orderDateFormatted computed property, displayed in card header
- `partner/src/main/java/ai/dollor/partner/ui/orders/OrdersScreen.kt` - formatOrderDate helper, displayed in EnhancedOrderCard subtitle

## Decisions Made
- Used existing `_haversine_eta` from `google_maps_service.py` rather than calling Google Maps API -- no API cost, sufficient accuracy for local self-delivery
- Default ETA of 20 minutes when vendor or customer coordinates are unavailable
- iOS uses `DateFormatter` with `.short` dateStyle/timeStyle; Android uses `SimpleDateFormat("M/d h:mm a")`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Steps
- Deploy backend to staging/production for push notification changes to take effect
- Build and upload iOS restaurant app to TestFlight
- Build and distribute Android partner APK to Firebase

---
*Phase: quick-145*
*Completed: 2026-03-11*
