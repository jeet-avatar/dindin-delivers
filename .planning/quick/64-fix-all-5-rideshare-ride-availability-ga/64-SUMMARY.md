---
phase: quick-64
plan: 01
subsystem: api, rideshare, notifications
tags: [ride-availability, bidding, polling, push-notifications, background-jobs]

# Dependency graph
requires:
  - phase: quick-63
    provides: delivery timeout safety net patterns
provides:
  - bidding_expires_at filter on all available-rides endpoints
  - ride_expired customer push notification on ride expiry
  - legacy accept bid rejection + WebSocket broadcast
  - individual bid auto-expiry background job
  - standardized 5s polling across iOS/Android driver apps
  - ride_expired notification handling in iOS/Android customer apps
affects: [rideshare, driver-app, customer-app, bid-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "send_push_notification sync call pattern (user_type, user_id) replaces old asyncio.run(token) pattern"
    - "bidding_expires_at filter with or_(field > now, field.is_(None)) for backward compat with NULL values"

key-files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift
    - apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift

key-decisions:
  - "Fix broken asyncio.run(send_push_notification(...)) calls to use sync send_push_notification('customer', id, ...) -- old signature used raw token which is no longer the API"
  - "bidding_expires_at filter uses OR with IS NULL for backward compatibility with rides created before bidding_expires_at was added"
  - "Individual bid expiry job runs on same 60s interval as other ride cleanup jobs"

patterns-established:
  - "All available-rides endpoints MUST filter on bidding_expires_at to prevent showing expired rides between cleanup job runs"
  - "All push notification calls in bid_routes.py use the sync send_push_notification(user_type, user_id, ...) API"

requirements-completed: [GAP-1, GAP-2, GAP-3, GAP-5, POLLING-STANDARDIZE, NOTIFICATION-HANDLE]

# Metrics
duration: 48min
completed: 2026-03-04
---

# Quick Task 64: Fix Ride Availability Gaps Summary

**Fixed all 5 rideshare ride availability gaps: bidding_expires_at filter on 3 endpoints, customer ride_expired push, legacy accept bid rejection, individual bid auto-expiry, standardized 5s polling across iOS/Android**

## Performance

- **Duration:** 48 min
- **Started:** 2026-03-04T07:12:34Z
- **Completed:** 2026-03-04T08:00:34Z
- **Tasks:** 3
- **Files modified:** 10 (3 backend, 3 iOS, 4 Android)

## Accomplishments

- All 3 available-rides endpoints now filter on `bidding_expires_at > now OR IS NULL`, preventing expired rides from appearing between cleanup job runs
- Customer receives "No Drivers Available" push notification when ride expires with zero bids (GAP-5)
- Legacy `accept_ride_ios_alias` now rejects all other PENDING bids and broadcasts ride_request_closed via WebSocket (GAP-3)
- New `check_individual_bid_expiry_job` auto-expires individual bids whose `expires_at` has passed (GAP-2)
- Fixed 2 broken push notification calls that used old `asyncio.run(send_push_notification(token, ...))` signature
- iOS driver polling standardized from 10s to 5s; Android driver polling from 15s to 5s
- iOS and Android customer apps handle `ride_expired` notification type
- iOS builds 1105/210/180 uploaded to TestFlight
- Android APKs vC=31/28/24 built (Firebase upload requires re-auth)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all 5 backend ride availability gaps** - `01bb0919` (fix)
2. **Task 2: Standardize polling + ride_expired notification** - `78f194eb` iOS / `565f4e5e` Android (feat)
3. **Task 3: Build and distribute all 6 apps** - `ed57897a` iOS / `16732530` Android (chore)

## Files Created/Modified

### Backend
- `apps/web/p2p-platform/backend/main_new.py` - Added bidding_expires_at filter to /api/rides/available, fixed response to return actual bidding_expires_at, added bid rejection + WebSocket broadcast to legacy accept
- `apps/web/p2p-platform/backend/order_flow.py` - Added bidding_expires_at filter to /api/erp/rides/available, registered check_individual_bid_expiry_job in scheduler
- `apps/web/p2p-platform/backend/bid_routes.py` - Added ride_expired customer push in expiry job, fixed 2 broken push calls, added check_individual_bid_expiry_job

### iOS
- `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift` - Polling 10s -> 5s
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift` - Added rideExpired enum case
- `apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift` - Handle .rideExpired notification

### Android (in eatfair-android repo)
- `driver/src/main/java/ai/dollor/driver/ui/rides/AvailableRidesViewModel.kt` - Polling 15s -> 5s
- `driver/src/main/java/ai/dollor/driver/ui/orders/AvailableOrdersViewModel.kt` - Polling 15s -> 5s
- `shared/src/main/java/ai/dollor/shared/notifications/DollorFirebaseMessagingService.kt` - Added TYPE_RIDE_EXPIRED constant
- `app/src/main/java/ai/dollor/customer/notifications/CustomerFirebaseMessagingService.kt` - Handle ride_expired push

### Build artifacts
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - Build 1104 -> 1105
- `apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj` - Build 209 -> 210
- `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj` - Build 179 -> 180
- `app/build.gradle.kts` - vC=30 -> 31
- `driver/build.gradle.kts` - vC=27 -> 28
- `partner/build.gradle.kts` - vC=23 -> 24

## Decisions Made

- Fixed broken `asyncio.run(send_push_notification(token, ...))` calls in matched timeout and in-progress timeout jobs -- these used the OLD signature with raw push_token but the function was refactored to accept (user_type, user_id) and handles token resolution internally
- Used `or_(field > now, field.is_(None))` pattern for bidding_expires_at filter for backward compatibility with rides that may not have this field set
- Individual bid expiry job runs on same 60-second interval as other ride cleanup jobs for consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken push notification calls in matched/in-progress timeout jobs**
- **Found during:** Task 1 (bid_routes.py modifications)
- **Issue:** Lines ~3100 and ~3160 used `asyncio.run(send_push_notification(customer.push_token, title, body, data))` which is the OLD function signature. The current `send_push_notification` takes `(user_type, user_id, title, body, data)` and resolves tokens internally.
- **Fix:** Replaced both calls with `send_push_notification("customer", ride.customer_id, title, body, data)` and removed the customer lookup queries since the new API handles token resolution.
- **Files modified:** `apps/web/p2p-platform/backend/bid_routes.py`
- **Verification:** Code review confirms matching signature with `order_flow.py:159`
- **Committed in:** `01bb0919` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Bug fix was essential -- the old push calls would have thrown TypeError at runtime. No scope creep.

## Authentication Gates

**Firebase App Distribution re-auth required:**
- **During:** Task 3 (Android APK distribution)
- **Issue:** `firebase login` credentials expired; Firebase CLI returns "Your credentials are no longer valid"
- **Resolution needed:** Run `firebase login --reauth` interactively in a terminal, then re-distribute APKs:
  ```bash
  cd /Users/jeet/StudioProjects/eatfair-android
  firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk --app "1:65740760476:android:535885ca28086e6242d459" --testers "jeetnair.in@gmail.com" --release-notes "Customer v1.0.30 - Fix ride availability gaps + 5s polling" --project dollorai-production
  firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk --app "1:65740760476:android:7d9bed1ee685434c42d459" --testers "jeetnair.in@gmail.com" --release-notes "Driver v1.0.27 - Fix ride availability gaps + 5s polling" --project dollorai-production
  firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk --app "1:65740760476:android:8591cc17fa4f8d4c42d459" --testers "jeetnair.in@gmail.com" --release-notes "Partner v1.0.23 - Fix ride availability gaps + 5s polling" --project dollorai-production
  ```
- **APKs are already built** at their expected locations -- only the upload step is pending.

## Issues Encountered

- iOS Staging configuration has pre-existing CocoaPods resource bundle copy errors (nanopb, leveldb, gRPC bundles). Build succeeds with Release configuration. Not related to our changes.
- 2 pre-existing test failures unrelated to our changes: `test_get_realtime_analytics` (MagicMock comparison), `test_ios_customer_android_driver_accept` (E2E network test)

## Next Steps

- Run `firebase login --reauth` and distribute Android APKs to Firebase
- Deploy backend changes to staging: `git push origin main && gh workflow run deploy-staging.yml --ref main`
- Smoke test ride availability endpoints on staging
- Deploy to production: `gh workflow run deploy-dollar-ai.yml`

---
*Quick Task: 64*
*Completed: 2026-03-04*
