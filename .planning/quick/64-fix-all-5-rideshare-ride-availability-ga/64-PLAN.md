---
phase: quick-64
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift
  - apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift
autonomous: true
requirements: [GAP-1, GAP-2, GAP-3, GAP-5, POLLING-STANDARDIZE, NOTIFICATION-HANDLE]

must_haves:
  truths:
    - "Expired ride requests never appear in any available-rides endpoint response"
    - "When a ride expires with zero bids, customer receives push notification"
    - "Legacy accept endpoint rejects all other PENDING bids and broadcasts ride_request_closed"
    - "Individual bids auto-expire when their expires_at passes"
    - "iOS DeliveryViewModel polls every 5 seconds (not 10)"
    - "Android AvailableRidesViewModel polls every 5 seconds (not 15)"
    - "iOS customer app handles ride_expired notification type"
    - "Android customer app handles ride_expired notification type"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "bidding_expires_at filter on /api/rides/available + legacy accept bid rejection"
      contains: "bidding_expires_at"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "bidding_expires_at filter on /api/erp/rides/available"
      contains: "bidding_expires_at"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "Customer push on ride expiry + individual bid expiry job"
      contains: "ride_expired"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift"
      provides: "rideExpired notification type enum case"
      contains: "rideExpired"
  key_links:
    - from: "bid_routes.py check_ride_bidding_expiry_job"
      to: "order_flow.py send_push_notification"
      via: "send_push_notification('customer', ride.customer_id, ...)"
      pattern: "send_push_notification.*customer.*ride_expired"
    - from: "main_new.py accept_ride_ios_alias"
      to: "models.py RideBid"
      via: "reject other PENDING bids on matched ride"
      pattern: "RideBid.*PENDING.*REJECTED"
---

<objective>
Fix all 5 rideshare ride availability gaps identified in the debug investigation and standardize polling intervals across iOS and Android to 5 seconds.

Purpose: Drivers currently see expired rides for up to 60 seconds between cleanup job runs. Customers get no notification when their ride expires with no bids. Legacy accept leaves orphaned bids. Individual bid expiry is not automated. iOS/Android have mismatched polling (10s/15s vs 5s).

Output: Backend fixes (4 gaps), mobile polling standardization (2 platforms), mobile notification handling (2 platforms).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/debug/ride-availability-for-drivers.md
@.planning/NEXT_SESSION_PROMPT.md
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/order_flow.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all 5 backend ride availability gaps</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/bid_routes.py
  </files>
  <action>
**GAP 1 — Add bidding_expires_at filter to 2 available-rides endpoints:**

1. In `main_new.py:15517` (`GET /api/rides/available`), add import of `datetime` and `or_` from sqlalchemy, then change the query at line 15517-15519 from:
   ```python
   requests = db.query(RideRequest).filter(
       RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING])
   )
   ```
   to:
   ```python
   now = datetime.utcnow()
   requests = db.query(RideRequest).filter(
       RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING]),
       or_(
           RideRequest.bidding_expires_at > now,
           RideRequest.bidding_expires_at.is_(None)
       )
   )
   ```
   Also update the response at line 15573 to return the actual `bidding_expires_at` instead of hardcoded `None`:
   ```python
   "bidding_expires_at": req.bidding_expires_at.isoformat() if req.bidding_expires_at else None,
   ```
   Apply the same filter pattern to the fallback except block (lines 15522-15524).

2. In `order_flow.py:801` (`GET /api/erp/rides/available`), add the same filter. Change lines 801-803 from:
   ```python
   rides = db.query(RideRequestModel).filter(
       RideRequestModel.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING])
   )
   ```
   to:
   ```python
   now = datetime.utcnow()
   rides = db.query(RideRequestModel).filter(
       RideRequestModel.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING]),
       or_(
           RideRequestModel.bidding_expires_at > now,
           RideRequestModel.bidding_expires_at.is_(None)
       )
   )
   ```
   Ensure `from sqlalchemy import or_` and `from datetime import datetime` are available at file top.

**GAP 5 — Add customer push notification on ride expiry with zero bids:**

3. In `bid_routes.py`, inside `check_ride_bidding_expiry_job()` (line 2995), after the ride is set to EXPIRED (line 3015-3016) and pending bids are expired (lines 3023-3030), add push notification to customer. Use the NEW `send_push_notification` signature (user_type, user_id, title, body, data) -- NOT the old raw-token pattern used at lines 3100 and 3160:
   ```python
   # Notify customer that ride expired with no match
   try:
       from order_flow import send_push_notification
       send_push_notification(
           "customer",
           ride.customer_id,
           "No Drivers Available",
           "No drivers were available for your ride. Please try again.",
           {"type": "ride_expired", "ride_id": str(ride.id), "ride_request_id": ride.request_id or ""}
       )
   except Exception as push_err:
       logger.warning(f"Failed to send expiry push for ride {ride.request_id}: {push_err}")
   ```
   IMPORTANT: `send_push_notification` is a sync function (order_flow.py:159). Do NOT wrap in `asyncio.run()`. Call it directly.

   Also fix the existing broken push calls at lines 3099-3105 and 3158-3165 which use the OLD signature pattern. Replace `asyncio.run(send_push_notification(customer.push_token, title, body, data))` with the direct sync call `send_push_notification("customer", ride.customer_id, title, body, data)`. Remove the customer lookup since the new API handles token resolution internally.

**GAP 3 — Fix legacy accept to reject other bids + broadcast:**

4. In `main_new.py:14303-14320` (`accept_ride_ios_alias`), after setting ride to MATCHED (line 14316-14318), add:
   ```python
   # Reject all other PENDING bids on this ride (match bid_routes.py:617-629 behavior)
   from models import RideBid, BidStatus
   other_bids = db.query(RideBid).filter(
       RideBid.ride_request_id == ride_id,
       RideBid.status == BidStatus.PENDING
   ).all()
   for other_bid in other_bids:
       other_bid.status = BidStatus.REJECTED
       other_bid.rejected_at = datetime.utcnow()
       other_bid.customer_response = "Ride accepted via legacy endpoint"

   # Broadcast ride_request_closed via WebSocket
   try:
       from websocket_server import broadcast_ride_status
       import asyncio
       asyncio.ensure_future(broadcast_ride_status(
           str(ride.id), "matched",
           {"ride_id": ride.id, "driver_id": request.driver_id, "reason": "legacy_accept"}
       ))
   except Exception as ws_err:
       logger.warning(f"Failed to broadcast ride matched for legacy accept: {ws_err}")
   ```

**GAP 2 — Add individual bid expiry to background job:**

5. In `bid_routes.py`, add a new function `check_individual_bid_expiry_job()` below `check_ride_in_progress_timeout_job()` (after line 3177):
   ```python
   def check_individual_bid_expiry_job():
       """Auto-expire individual bids whose expires_at has passed while still PENDING."""
       db = SessionLocal()
       try:
           now = datetime.utcnow()
           expired_bids = db.query(RideBid).filter(
               RideBid.status == BidStatus.PENDING,
               RideBid.expires_at.isnot(None),
               RideBid.expires_at < now
           ).all()

           if not expired_bids:
               return

           expired_count = 0
           for bid in expired_bids:
               bid.status = BidStatus.EXPIRED
               bid.updated_at = now
               expired_count += 1
               logger.info(f"Bid {bid.id} on ride {bid.ride_request_id} auto-expired (expires_at: {bid.expires_at.isoformat()})")

           db.commit()
           logger.info(f"Individual bid expiry check: {expired_count} bids expired")

       except Exception as e:
           logger.error(f"Error in individual bid expiry check: {e}")
           db.rollback()
       finally:
           db.close()
   ```

6. Register the new job in `order_flow.py` where the other ride jobs are registered. Find the scheduler registration block (around line 2348-2394 per investigation) and add:
   ```python
   from bid_routes import check_individual_bid_expiry_job
   scheduler.add_job(check_individual_bid_expiry_job, 'interval', seconds=60, id='individual_bid_expiry')
   ```
  </action>
  <verify>
Run backend tests:
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && JWT_SECRET_KEY=test-secret-key ADMIN_SECRET_KEY=test-admin-key pytest tests/ -v --tb=short 2>&1 | tail -30
```
Verify all tests pass. Grep to confirm filters are in place:
```bash
grep -n "bidding_expires_at" apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/order_flow.py
grep -n "ride_expired" apps/web/p2p-platform/backend/bid_routes.py
grep -n "check_individual_bid_expiry_job" apps/web/p2p-platform/backend/bid_routes.py apps/web/p2p-platform/backend/order_flow.py
grep -n "BidStatus.REJECTED" apps/web/p2p-platform/backend/main_new.py
```
  </verify>
  <done>
- Both `/api/rides/available` and `/api/erp/rides/available` (order_flow) filter on `bidding_expires_at > now OR IS NULL`
- `check_ride_bidding_expiry_job` sends "ride_expired" push notification to customer using `send_push_notification("customer", ride.customer_id, ...)`
- Existing broken push calls at lines ~3100 and ~3160 fixed to use new signature
- Legacy `accept_ride_ios_alias` rejects all other PENDING bids and broadcasts via WebSocket
- New `check_individual_bid_expiry_job` expires individual bids and is registered in scheduler
- All backend tests pass
  </done>
</task>

<task type="auto">
  <name>Task 2: Standardize polling to 5s and handle ride_expired notification on iOS/Android</name>
  <files>
    apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift
    apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift
  </files>
  <action>
**POLLING STANDARDIZATION:**

1. In `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift:121`, change polling interval from 10 to 5:
   ```swift
   refreshTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
   ```
   Update the comment on line 120 to say "Poll every 5 seconds" instead of "Poll every 10 seconds".

2. In `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/AvailableRidesViewModel.kt:51`, change:
   ```kotlin
   private val pollingInterval = 5_000L  // 5 seconds (standardized with iOS)
   ```

3. In `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/orders/AvailableOrdersViewModel.kt:40`, change:
   ```kotlin
   private val pollingInterval = 5_000L  // 5 seconds (standardized with iOS)
   ```

**iOS RIDE_EXPIRED NOTIFICATION HANDLING:**

4. In `apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift`, add a new case to the `NotificationType` enum (after `case paymentProcessed = "payment_processed"` at line 177):
   ```swift
   case rideExpired = "ride_expired"
   ```
   In the `soundName` computed property, add `rideExpired` to the default sound cases (it will be caught by the existing `default` case returning "default", which is fine).

5. In `apps/ios/customer/eatfaircustomer/eatfaircustomerApp.swift`, inside `handleNotificationAction(_ payload:)`, add a case before the `default:` at line 199:
   ```swift
   case .rideExpired:
       // Show ride expired — no need to navigate, just post notification for any listening view
       NotificationCenter.default.post(
           name: NSNotification.Name("RideRequestExpired"),
           object: nil,
           userInfo: payload.rideRequestId.map { ["rideRequestId": $0] } ?? [:]
       )
   ```

**ANDROID RIDE_EXPIRED NOTIFICATION HANDLING:**

6. In `/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/notifications/DollorFirebaseMessagingService.kt`, add the constant:
   ```kotlin
   const val TYPE_RIDE_EXPIRED = "ride_expired"
   ```
   Add it to the CHANNEL_RIDES grouping in `getNotificationChannel()`.

7. In `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/notifications/CustomerFirebaseMessagingService.kt`, add handling in the `when` block after the ride cancellation line (after line 57):
   ```kotlin
   TYPE_RIDE_EXPIRED -> handleRideUpdate(data, "No drivers available. Please try again.")
   ```
  </action>
  <verify>
Verify iOS builds:
```bash
cd /Users/jeet/doordash-p2p && xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Staging -destination 'generic/platform=iOS' build 2>&1 | tail -5
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Staging -destination 'generic/platform=iOS' build 2>&1 | tail -5
```
Verify Android builds:
```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleDebug :driver:assembleDebug 2>&1 | tail -10
```
Grep to confirm changes:
```bash
grep -n "withTimeInterval: 5" apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
grep -n "5_000L" /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/AvailableRidesViewModel.kt
grep -n "rideExpired" apps/ios/eatfair-ios-shared/Sources/EatFairShared/NotificationManager.swift
grep -n "RIDE_EXPIRED" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/notifications/DollorFirebaseMessagingService.kt
```
  </verify>
  <done>
- iOS DeliveryViewModel polls every 5s (was 10s)
- Android AvailableRidesViewModel polls every 5s (was 15s)
- Android AvailableOrdersViewModel polls every 5s (was 15s)
- iOS NotificationType enum has `rideExpired` case
- iOS customer app handles `.rideExpired` push notification and posts `RideRequestExpired` NSNotification
- Android shared module has `TYPE_RIDE_EXPIRED` constant in correct channel
- Android customer app handles `ride_expired` push with "No drivers available" message
- All 4 apps build successfully (iOS customer + driver, Android customer + driver)
  </done>
</task>

<task type="auto">
  <name>Task 3: Run backend tests, build and distribute all 6 apps</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj
    apps/ios/delivery/eatffairdelivery.xcodeproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj
  </files>
  <action>
1. Run full backend test suite:
   ```bash
   cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
   JWT_SECRET_KEY=test-secret-key ADMIN_SECRET_KEY=test-admin-key pytest tests/ -v --tb=short
   ```
   All tests must pass. Fix any regressions before proceeding.

2. Bump iOS build numbers in all 3 xcconfig files under `apps/ios/Config/`:
   - Customer: 1104 -> 1105
   - Driver: 209 -> 210
   - Restaurant: 179 -> 180

3. Build, archive, and upload all 3 iOS apps to TestFlight using xcodebuild archive + exportArchive with ExportOptions.plist (see CLAUDE.md for exact commands). Use `-configuration Release`.

4. Bump Android build versions in all 3 module `build.gradle.kts` files:
   - Customer: versionCode 31, versionName "1.0.30"
   - Driver: versionCode 28, versionName "1.0.27"
   - Partner: versionCode 24, versionName "1.0.23"

5. Build all 3 Android release APKs:
   ```bash
   cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew assembleRelease
   ```

6. Distribute all 3 Android APKs to Firebase App Distribution (see CLAUDE.md for exact commands) with release notes: "Fix ride availability gaps + 5s polling"

7. Commit all changes with descriptive message.
  </action>
  <verify>
```bash
# Verify backend tests pass
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && JWT_SECRET_KEY=test-secret-key ADMIN_SECRET_KEY=test-admin-key pytest tests/ -v --tb=short 2>&1 | tail -5
# Verify iOS uploads succeeded (check TestFlight)
# Verify Android APKs built
ls -la /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/ /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/ /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/
```
  </verify>
  <done>
- All backend tests pass with zero regressions
- iOS builds 1105/210/180 uploaded to TestFlight
- Android builds vC=31/28/24 distributed via Firebase App Distribution
- All changes committed
  </done>
</task>

</tasks>

<verification>
1. `grep -n "bidding_expires_at" apps/web/p2p-platform/backend/main_new.py` shows filter in `/api/rides/available`
2. `grep -n "bidding_expires_at" apps/web/p2p-platform/backend/order_flow.py` shows filter in `/api/erp/rides/available`
3. `grep -n "ride_expired" apps/web/p2p-platform/backend/bid_routes.py` shows push notification in expiry job
4. `grep -n "BidStatus.REJECTED" apps/web/p2p-platform/backend/main_new.py` shows legacy accept rejects bids
5. `grep -n "check_individual_bid_expiry_job" apps/web/p2p-platform/backend/bid_routes.py` shows new job exists
6. `grep -n "withTimeInterval: 5" apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift` confirms 5s polling
7. `grep -n "5_000L" /Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/AvailableRidesViewModel.kt` confirms 5s polling
8. Backend test suite passes: `JWT_SECRET_KEY=test-secret-key ADMIN_SECRET_KEY=test-admin-key pytest tests/ -v --tb=short`
</verification>

<success_criteria>
- All 5 ride availability gaps from investigation are fixed
- Expired rides never returned by any available-rides endpoint
- Customer gets "ride_expired" push when ride expires with no bids
- Legacy accept rejects other pending bids
- Individual bids auto-expire on schedule
- iOS and Android driver apps both poll at 5-second intervals
- Both customer apps handle ride_expired notification
- All backend tests pass
- All 6 apps built and distributed
</success_criteria>

<output>
After completion, create `.planning/quick/64-fix-all-5-rideshare-ride-availability-ga/64-SUMMARY.md`
</output>
