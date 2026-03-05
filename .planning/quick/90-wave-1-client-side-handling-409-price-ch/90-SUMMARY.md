---
phase: quick-90
plan: 90
subsystem: ui, payments, notifications
tags: [ios, android, push-notifications, error-handling, 409, 400]

# Dependency graph
requires:
  - phase: quick-89
    provides: "Backend 409 price change, 400 vendor offline, auto-cancel, refund endpoints"
provides:
  - "iOS/Android 409 price change error display with item-level details"
  - "iOS/Android 400 vendor offline error display"
  - "Push notifications on auto-cancel (vendor goes offline)"
  - "Push notifications on refund issued"
affects: [wave-2-payment-safety, ios-customer, android-customer]

# Tech tracking
tech-stack:
  added: []
  patterns: ["P2PAPIError enum extension for typed error handling", "PriceChangedException/VendorOfflineException for Android typed errors"]

key-files:
  created: []
  modified:
    - "apps/web/p2p-platform/backend/main_new.py"
    - "apps/web/p2p-platform/backend/order_flow.py"
    - "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
    - "apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift"
    - "apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift"
    - "/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt"
    - "/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/cart/CartViewModel.kt"

key-decisions:
  - "Used typed error enums/exceptions rather than string parsing for 409/400 handling"
  - "Push notifications wrapped in try/except to never block cancel/refund flows"

patterns-established:
  - "iOS: P2PAPIError.priceChanged and .vendorOffline for typed createOrder error handling"
  - "Android: PriceChangedException and VendorOfflineException in safeApiCall for typed error propagation"

requirements-completed: [GAP-CLIENT-409, GAP-CLIENT-400, GAP-PUSH-CANCEL, GAP-PUSH-REFUND]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Quick Task 90: Client-Side 409/400 Handling + Push Notifications Summary

**iOS and Android show item-level price change details on 409 and vendor-offline messages on 400, with backend push notifications on auto-cancel and refund**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T07:07:49Z
- **Completed:** 2026-03-05T07:15:55Z
- **Tasks:** 3
- **Files modified:** 7 (2 backend, 3 iOS, 2 Android)

## Accomplishments
- Backend sends push notification to customer when order auto-cancelled due to vendor going offline
- Backend sends push notification to customer when refund is issued with dollar amount and estimated timeline
- iOS customer app parses 409 with price_changes array and shows item-level price diffs
- iOS customer app detects 400 vendor offline and shows "restaurant is currently closed"
- Android customer app has PriceChangedException/VendorOfflineException with same UX parity

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend push notifications for auto-cancel and refund** - `fe4fba8e` (feat)
2. **Task 2: iOS client-side handling for 409 price change and 400 vendor offline** - `4c3acd40` (feat)
3. **Task 3: Android client-side handling for 409 price change and 400 vendor offline** - `39758703` (feat, android repo)

## Files Created/Modified
- `apps/web/p2p-platform/backend/main_new.py` - Push notification on vendor go-offline auto-cancel
- `apps/web/p2p-platform/backend/order_flow.py` - Push notification on refund issued
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` - P2PAPIError.priceChanged/.vendorOffline + 409/400 parsing in createOrder
- `apps/ios/customer/eatfaircustomer/ViewModels/MultiRestaurantCartViewModel.swift` - Item-level price change details in failure messages
- `apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift` - User-facing error messages for price change and vendor offline
- `(android) shared/.../DollorRepository.kt` - PriceChangedException, VendorOfflineException, 409/400 parsing in safeApiCall
- `(android) app/.../CartViewModel.kt` - Specific error messages for price change and vendor offline

## Decisions Made
- Used typed error enums (iOS) and exception classes (Android) rather than string matching for reliable error differentiation
- Push notifications wrapped in try/except so notification failures never block the cancel/refund flow
- Refund notification includes dollar amount and "5-10 business days" timeline for customer clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Backend tests require DATABASE_URL and JWT_SECRET_KEY env vars to run locally (not available in this environment). Verified syntax correctness via `py_compile` instead.
- iOS build succeeded (BUILD SUCCEEDED) confirming all Swift changes compile correctly.
- Android build succeeded (BUILD SUCCESSFUL) confirming all Kotlin changes compile correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 1 client-side handling complete for both iOS and Android
- Ready for Wave 2 payment safety features (duplicate payment prevention, payment timeout handling)
- Push notification infrastructure already in place for future notification needs

---
*Phase: quick-90*
*Completed: 2026-03-05*
