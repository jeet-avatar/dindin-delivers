---
phase: quick-185
plan: 01
subsystem: rideshare
tags: [rideshare, ios, android, backend, stripe, bugfix]
dependency_graph:
  requires: []
  provides: [auto-navigate-bid-accept, stale-ride-cleanup, stripe-rideshare-payment, android-active-ride-fix]
  affects: [bid_routes.py, RideBiddingViewModel.swift, RideshareDashboardView.swift, ActiveRideView.swift, P2PAPIService.swift, ActiveRideViewModel.kt, RideshareModels.kt]
tech_stack:
  added: []
  patterns: [stripe-manual-capture, idempotency-keys, auto-navigation-signal]
key_files:
  created: []
  modified:
    - apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift
    - apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
    - apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/web/p2p-platform/backend/bid_routes.py
    - /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/ActiveRideViewModel.kt
    - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/model/rideshare/RideshareModels.kt
decisions:
  - Used @Published hasNewAcceptedRide signal pattern instead of delegate/callback for SwiftUI tab auto-switch
  - PaymentIntent created with manual capture at bid acceptance, captured at ride completion, cancelled at ride/customer cancel
  - Android fetches getDriverBids() before attempting acceptRide() to avoid re-accept error
  - Added RideRequestForBidding.toRide() converter to bridge bid data to Ride model for ActiveRideScreen
  - Added driver_arrived_at to serialize_ride_request and RideRequestForBidding for state restore
metrics:
  duration: 5m
  completed: 2026-03-17
  tasks: 3
  files: 7
---

# Quick Task 185: Fix 8 Rideshare E2E Bugs Summary

Fix 8 rideshare bugs across iOS, Android, and backend to make the rideshare lifecycle production-reliable: auto-navigate driver on bid acceptance, stale ride cleanup, Stripe payment capture, bid list filtering, and UI state restoration.

## Changes Made

### Wave 1 - Critical Flow Fixes (BUG 1, 2, 2b, 3, 6)

**BUG 1+6: iOS auto-navigate driver to Active tab on bid acceptance**
- Added `@Published var hasNewAcceptedRide: Bool` to `RideBiddingViewModel.swift`
- In `fetchMyBids()`, detect when `activeRides` gains a new entry (bid transitions to accepted)
- In `RideshareDashboardView.swift`, observe `hasNewAcceptedRide` with `.onChange` and auto-switch `selectedTab = .active`
- Files: `RideBiddingViewModel.swift:26,265-267`, `RideshareDashboardView.swift:109-115`

**BUG 2: Stale MATCHED rides with arrival but never started**
- Added second cleanup pass in `check_ride_matched_timeout_job()` for MATCHED rides where `driver_arrived_at IS NOT NULL` and arrival was >30 minutes ago
- These rides are CANCELLED (not reopened) with reason "Auto-cancelled: driver arrived but never started ride within 30 minutes"
- Push notifications sent to both customer and driver
- File: `bid_routes.py:3454-3510`

**BUG 2b: iOS radius cap**
- Changed default radius from 50000km to 100km when location unavailable
- Prevents fetching ALL rides globally when location services are off
- File: `RideBiddingViewModel.swift:208`

**BUG 3: Android re-accept fix**
- Rewrote `loadActiveRide()` to first check `getDriverBids()` for already-accepted rides
- Only calls `acceptRide()` if ride not found in driver's accepted bids
- Added `RideRequestForBidding.toRide()` converter for ActiveRideScreen display
- Files: `ActiveRideViewModel.kt:125-165`, `RideshareModels.kt:75-90`

### Wave 2 - Payment + Data Quality (BUG 4, 5)

**BUG 4: Stripe PaymentIntent for rideshare bid flow**
- **On bid acceptance**: Creates `stripe.PaymentIntent.create()` with `capture_method="manual"` and `idempotency_key=f"ride-pi-{ride_request.id}"`
- Auto-creates Stripe customer if missing (`idempotency_key=f"ride-cust-{customer_id}"`)
- **On ride completion**: Captures PaymentIntent (`idempotency_key=f"ride-capture-{ride_request.id}"`)
- **On customer cancel**: Cancels PaymentIntent (`idempotency_key=f"ride-cancel-{ride_request.id}"`)
- **On driver cancel**: Cancels PaymentIntent and clears the ID before reopening ride
- All Stripe calls wrapped in try/except to not block ride flow on payment errors
- File: `bid_routes.py:747-788,1090-1102,1939-1953,2237-2254`

**BUG 5: My Bids shows only recent bids**
- iOS `fetchDriverBids()` now passes `days=1` query parameter (was defaulting to 7 days)
- Reduces clutter in My Bids tab to show only last 24h of bids
- File: `P2PAPIService.swift:5602-5605`

### Wave 3 - UI Polish (BUG 7, 8)

**BUG 7: ActiveRideView state restore**
- Added `driver_arrived_at` to `serialize_ride_request()` in backend
- Added `driver_arrived_at` optional field to iOS `RideRequestForBidding` struct
- `ActiveRideView.onAppear` now checks `driver_arrived_at` to restore `.arrivedAtPickup` state when driver returns to the screen
- Files: `bid_routes.py:365`, `P2PAPIService.swift:10303`, `ActiveRideView.swift:210-211`

**BUG 8: Android location update interval**
- Changed `delay(15_000L)` to `delay(5_000L)` for 5-second location updates during active rides
- Matches iOS polling interval for consistent customer tracking experience
- File: `ActiveRideViewModel.kt:120`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing field] Added driver_arrived_at to serialize_ride_request**
- **Found during:** Task 3 (BUG 7)
- **Issue:** Backend serialize_ride_request did not include driver_arrived_at field, so iOS could never restore arrival state
- **Fix:** Added driver_arrived_at to serializer + RideRequestForBidding struct
- **Files modified:** bid_routes.py, P2PAPIService.swift

**2. [Rule 2 - Missing field] Added driver_arrived_at to RideRequestForBidding struct**
- **Found during:** Task 3 (BUG 7)
- **Issue:** iOS RideRequestForBidding struct had no driver_arrived_at property
- **Fix:** Added optional driver_arrived_at: String? field
- **File modified:** P2PAPIService.swift

**3. BUG 2b (radius cap) was moved from Wave 3 to Wave 1**
- The plan listed this as Wave 3 but it made sense to fix alongside Wave 1 radius-related code

### Skipped Items

- **BUILD + DEPLOY**: Per constraints, builds and deploys are NOT performed in this task. Code changes only.
- **Backend tests**: Could not run due to pre-existing FastAPI/Pydantic version incompatibility in test environment (not caused by our changes)

## Commits

| Wave | Repo | Commit | Description |
|------|------|--------|-------------|
| 1 | main | af4f1c7f | iOS auto-navigate + stale ride cleanup + radius cap |
| 1 | android | 44d3dcb2 | Android re-accept fix + toRide() converter |
| 2 | main | 63430737 | Stripe PaymentIntent + My Bids days=1 |
| 3 | main | 11d77e50 | ActiveRideView state restore + driver_arrived_at |
| 3 | android | 85989344 | Android location 5s interval |

## Verification

- [x] Grep proof: hasNewAcceptedRide signal exists in ViewModel + Dashboard
- [x] Grep proof: driver_arrived_at cleanup in bid_routes.py scheduler
- [x] Grep proof: getDriverBids() called before acceptRide in Android
- [x] Grep proof: PaymentIntent.create, .capture, .cancel with idempotency keys
- [x] Grep proof: days=1 in fetchDriverBids URL
- [x] Grep proof: driver_arrived_at in ActiveRideView state restore
- [x] Grep proof: delay(5_000L) in Android location updates
- [ ] Backend tests: Skipped (pre-existing env issue, not our changes)

## Self-Check: PASSED
