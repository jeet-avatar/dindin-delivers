---
phase: quick-31
plan: 01
subsystem: android-notifications
tags: [android, notifications, firebase, case-mismatch, bidding]

requires:
  - phase: quick-30
    provides: "Live E2E test confirming notification type case mismatch"
  - phase: quick-29
    provides: "E2E verification report documenting Android notification issues"
provides:
  - "All Android notification type constants aligned to lowercase (match backend)"
  - "5 new bidding/negotiation notification handlers added"
  - "driver_en_route and driver_arrived separated into distinct types"
affects: [android-customer, android-driver, android-partner]

key-files:
  modified:
    - "shared/notifications/DollorFirebaseMessagingService.kt (constants)"
    - "app/customer/notifications/CustomerFirebaseMessagingService.kt (handlers)"
    - "driver/notifications/DriverFirebaseMessagingService.kt (handlers)"
    - "partner/notifications/PartnerFirebaseMessagingService.kt (TYPE_DRIVER_ARRIVED)"

key-decisions:
  - "Kept deprecated aliases for TYPE_RIDE_ACCEPTED and TYPE_DRIVER_ARRIVING for backward compatibility"
  - "Order-related types also lowercased for consistency even though not yet verified against backend food order notifications"
  - "Partner app: TYPE_DRIVER_ARRIVING renamed to TYPE_DRIVER_ARRIVED since restaurant context means driver has arrived for pickup"

duration: 5min
completed: 2026-02-23
---

# Quick Task 31: Fix Android Notification Type Case Mismatch

**Changed all Android notification type constants from UPPERCASE to lowercase to match backend. Added 5 missing bidding/negotiation handlers. Split DRIVER_ARRIVING into DRIVER_EN_ROUTE + DRIVER_ARRIVED. Build successful across all 4 modules.**

## Changes

### Base Service (DollorFirebaseMessagingService.kt)
- 23 TYPE_* constants changed from UPPERCASE to lowercase (e.g., `"NEW_RIDE_REQUEST"` → `"new_ride_request"`)
- `TYPE_RIDE_ACCEPTED` renamed to `TYPE_BID_ACCEPTED` (value: `"bid_accepted"`)
- `TYPE_DRIVER_ARRIVING` split into `TYPE_DRIVER_EN_ROUTE` (`"driver_en_route"`) and `TYPE_DRIVER_ARRIVED` (`"driver_arrived"`)
- 5 new constants added: `TYPE_NEW_BID`, `TYPE_BID_REJECTED`, `TYPE_COUNTER_OFFER`, `TYPE_DRIVER_COUNTER`, `TYPE_COUNTER_ACCEPTED`
- Channel routing updated to include all new ride types in `CHANNEL_RIDES`
- Deprecated aliases kept for `TYPE_RIDE_ACCEPTED` and `TYPE_DRIVER_ARRIVING`

### Customer Service (CustomerFirebaseMessagingService.kt)
- `TYPE_RIDE_ACCEPTED` → `TYPE_BID_ACCEPTED`
- `TYPE_DRIVER_ARRIVING` split into `TYPE_DRIVER_EN_ROUTE` + `TYPE_DRIVER_ARRIVED`
- Added handlers for: `TYPE_NEW_BID`, `TYPE_DRIVER_COUNTER`, `TYPE_COUNTER_ACCEPTED`, `TYPE_PAYMENT_PROCESSED`

### Driver Service (DriverFirebaseMessagingService.kt)
- `TYPE_RIDE_ACCEPTED` → `TYPE_BID_ACCEPTED`
- Added handlers for: `TYPE_BID_REJECTED`, `TYPE_COUNTER_OFFER`, `TYPE_COUNTER_ACCEPTED`
- Navigation intent updated to route new types to "rides" screen

### Partner Service (PartnerFirebaseMessagingService.kt)
- `TYPE_DRIVER_ARRIVING` → `TYPE_DRIVER_ARRIVED`

## Verification
- `./gradlew :shared:compileDebugKotlin :app:compileDebugKotlin :driver:compileDebugKotlin :partner:compileDebugKotlin` — BUILD SUCCESSFUL
- No references to old constants outside deprecated aliases
- Commit: `378987c8` in eatfair-android repo

## Issues Resolved (from quick-29/30)
| Issue | Status |
|-------|--------|
| Android UPPERCASE constants vs lowercase backend | FIXED |
| Android missing new_bid handler | FIXED |
| Android missing counter_offer handler | FIXED |
| Android missing bid_rejected handler | FIXED |
| Android DRIVER_ARRIVING used for both en_route and arrived | FIXED (split) |

---
*Quick Task: 31*
*Completed: 2026-02-23*
