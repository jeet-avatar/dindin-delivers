---
phase: quick-31
type: quick
description: "Fix Android notification type case mismatch and add missing handlers"
---

# Quick Task 31: Fix Android Notification Type Case Mismatch

## Goal

Change Android notification type constants from UPPERCASE to lowercase to match backend. Add missing rideshare notification handlers (new_bid, counter_offer, bid_rejected, driver_counter, counter_accepted). Distinguish driver_en_route from driver_arrived.

## Backend Notification Types (Source of Truth: bid_routes.py)

| Backend sends | Android currently has | Fix |
|---------------|----------------------|-----|
| `new_ride_request` | `NEW_RIDE_REQUEST` | Change to lowercase |
| `bid_accepted` | `RIDE_ACCEPTED` (wrong name!) | Rename + lowercase |
| `driver_en_route` | `DRIVER_ARRIVING` (wrong name!) | Rename + lowercase |
| `driver_arrived` | `DRIVER_ARRIVING` (shared!) | Add new constant |
| `ride_started` | `RIDE_STARTED` | Change to lowercase |
| `ride_completed` | `RIDE_COMPLETED` | Change to lowercase |
| `ride_cancelled` | `RIDE_CANCELLED` | Change to lowercase |
| `payment_processed` | `payment_processed` | Already correct |
| `new_bid` | MISSING | Add new |
| `counter_offer` | MISSING | Add new |
| `bid_rejected` | MISSING | Add new |
| `driver_counter` | MISSING | Add new |
| `counter_accepted` | MISSING | Add new |

## Tasks

### Task 1: Fix base DollorFirebaseMessagingService.kt constants
- **file:** `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/notifications/DollorFirebaseMessagingService.kt`
- **action:**
  1. Change all UPPERCASE ride constants to lowercase to match backend
  2. Rename `TYPE_RIDE_ACCEPTED` → value `bid_accepted`
  3. Rename `TYPE_DRIVER_ARRIVING` → value `driver_en_route` and add `TYPE_DRIVER_ARRIVED` = `driver_arrived`
  4. Add 5 new constants: `TYPE_NEW_BID`, `TYPE_COUNTER_OFFER`, `TYPE_BID_REJECTED`, `TYPE_DRIVER_COUNTER`, `TYPE_COUNTER_ACCEPTED`
  5. Update channel routing `when` block to include new types
- **verify:** All constants lowercase, all backend types have a matching constant

### Task 2: Update CustomerFirebaseMessagingService.kt handlers
- **file:** `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/notifications/CustomerFirebaseMessagingService.kt`
- **action:**
  1. Add handlers for: `TYPE_NEW_BID` (new bid from driver), `TYPE_COUNTER_OFFER` (not needed for customer — customer sends counters), `TYPE_DRIVER_COUNTER` (driver counter-offer), `TYPE_COUNTER_ACCEPTED` (driver accepted customer's counter), `TYPE_DRIVER_ARRIVED` (separate from en_route)
  2. Update renamed constants in when block
- **verify:** Customer app handles all customer-facing rideshare notification types

### Task 3: Update DriverFirebaseMessagingService.kt handlers
- **file:** `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/notifications/DriverFirebaseMessagingService.kt`
- **action:**
  1. Add handlers for: `TYPE_BID_REJECTED` (customer rejected bid), `TYPE_COUNTER_OFFER` (customer counter-offer to driver), `TYPE_COUNTER_ACCEPTED` (customer accepted driver's counter)
  2. Update renamed constants in when block + navigation intent
- **verify:** Driver app handles all driver-facing rideshare notification types
