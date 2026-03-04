---
phase: quick-60
plan: 01
subsystem: ui
tags: [ios, android, error-handling, delivery-decision, restaurant-app]

# Dependency graph
requires:
  - phase: n/a
    provides: existing P2PErrorResponse pattern in P2PAPIService.swift
provides:
  - Backend error messages surfaced verbatim in iOS and Android restaurant delivery buttons
affects: [restaurant-app, delivery-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "P2PErrorResponse parsing for all delivery decision API methods"
    - "Direct error.localizedDescription display instead of fragile string matching"

key-files:
  created: []
  modified:
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift
    - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt

key-decisions:
  - "Use existing P2PErrorResponse decode pattern from deleteVendorMenu for delivery decision methods"
  - "Remove fragile string pattern matching in OrdersViewModel; rely on backend-provided error text"

patterns-established:
  - "All delivery decision API methods parse response body for detail message on 400+ responses"

requirements-completed: [QUICK-60]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Quick Task 60: Fix Delivery Button Error Handling Summary

**Backend error messages (expired window, wrong status) now surface verbatim in iOS and Android restaurant apps instead of generic fallbacks**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T03:36:30Z
- **Completed:** 2026-03-04T03:41:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- iOS P2PAPIService now parses `{"detail": "..."}` from 400+ responses in both `restaurantAcceptDelivery` and `restaurantDeclineDelivery`
- iOS OrdersViewModel removed fragile string matching (expired/timeout/window/already/assigned) and displays backend error directly
- Android OrderDetailsScreen shows `error.message` directly without redundant "Failed to accept delivery:" prefix
- Both platforms retain generic fallback messages only when response body cannot be parsed

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix iOS error body parsing + simplify OrdersViewModel** - `7786c5b7` (fix)
2. **Task 2: Clean up Android error display** - `4c12cb4a` (fix, in eatfair-android repo)

## Files Created/Modified
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - Added P2PErrorResponse parsing to restaurantAcceptDelivery and restaurantDeclineDelivery
- `apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift` - Simplified error handlers to display backend message directly
- `partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt` (Android) - Removed redundant error prefixes, show backend message directly

## Decisions Made
- Used existing P2PErrorResponse decode pattern (same as deleteVendorMenu line 440-458) for consistency
- Removed all fragile string matching in OrdersViewModel -- the backend already provides clear, user-friendly error messages
- Android Log.e lines retain "Failed to..." prefix for debug context; only user-facing error field changed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- iPhone 16 simulator not available (only iPhone 17 series installed); used iPhone 17 Pro instead for build verification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Error handling pattern is consistent across both platforms
- Same P2PErrorResponse parsing pattern can be applied to any other API methods that still use generic error messages

---
*Phase: quick-60*
*Completed: 2026-03-04*
