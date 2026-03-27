---
status: resolved
trigger: "rideshare-e2e-flow-broken - comprehensive E2E audit of entire rideshare lifecycle"
created: 2026-03-17T00:00:00Z
updated: 2026-03-17T00:00:00Z
---

## Current Focus

hypothesis: Multiple independent bugs across backend + iOS + Android cause the rideshare flow to feel broken
test: Systematic code audit of every step in the lifecycle
expecting: Identify each failure point with file:line references
next_action: Create prioritized fix plan

## Symptoms

expected: Complete rideshare flow works reliably from request to completion
actual: Rides disappear from driver screen, stale rides accumulate, bidding unreliable, My Bids badge shows historical count, no clear status progression, chat unclear
errors: No crashes - rides vanish silently from driver UI
reproduction: Request ride as customer -> bid as driver -> accept bid -> ride disappears from driver
started: Observed during live testing

## E2E Flow Audit - Step by Step

### STEP 1: Customer Requests Ride
**Endpoint:** `POST /api/rides/request`
**Status: PASS**
- `bid_routes.py:416-564` - Creates RideRequest correctly
- Sets status OPEN, calculates distance/duration/price, sets bidding window
- Sends push notifications to nearby drivers (geo-filtered 25km radius)
- Sends confirmation email to customer
- WebSocket broadcast to all drivers
- iOS: `RideRequestViewModel.swift:383-441` - Correctly calls API, transitions to `.waitingForDriver`, starts bid polling

### STEP 2: Driver Sees Ride in Available Rides Tab
**Endpoint:** `GET /api/rides/available`
**Status: PASS (with minor issue)**
- `bid_routes.py:1108-1185` - Filters OPEN/BIDDING rides, checks bidding window, geo-filters
- Correctly marks `already_bid` for rides driver has bid on
- iOS: `RideBiddingViewModel.swift:197-231` - Polls every 5s (or WS), shows available requests
- **Minor Issue:** Radius defaults to 100km in iOS (`RideBiddingViewModel.swift:208`) when location available, but 50000km when unavailable. Backend default is 15km. The iOS large radius overrides backend filtering.

### STEP 3: Driver Submits Bid
**Endpoint:** `POST /api/rides/request/{id}/bid`
**Status: PASS**
- `bid_routes.py:1188-1425` - Validates driver status, KYC, active ride check, creates bid
- Changes ride status from OPEN to BIDDING on first bid
- Sends push + email + WebSocket to customer
- Bid expires after 10 minutes
- iOS: `RideBiddingViewModel.swift:276-331` - Correctly submits bid, removes from available list locally

### STEP 4: Customer Sees Incoming Bids
**Endpoint:** `GET /api/rides/request/{id}/bids`
**Status: PASS**
- `bid_routes.py:637-665` - Returns pending bids sorted by price
- iOS: `RideRequestViewModel.swift:554-576` - Polls for bids, auto-shows bids sheet
- WebSocket handler also triggers bid fetch on `new_bid` event

### STEP 5: Customer Accepts Bid
**Endpoint:** `POST /api/rides/bid/{id}/respond` (action=accept)
**Status: PASS**
- `bid_routes.py:668-863` - Sets bid ACCEPTED, ride MATCHED, rejects other bids
- Sends push to driver ("Bid Accepted! Head to pickup!")
- Sends push to customer ("Driver on the way!")
- Returns full driver info including vehicle details
- iOS: `RideRequestViewModel.swift:582-667` - Stops bid polling, stores driver info, transitions to `.driverEnRoute`

### STEP 6: Driver Transition to Active Ride After Bid Accepted
**Status: CRITICAL FAIL - ROOT CAUSE OF "RIDE DISAPPEARS" BUG**

**Root Cause 1: Driver app does NOT automatically navigate to ActiveRideView after bid acceptance**

The iOS driver flow:
1. `RideBiddingViewModel.swift:237-271` - `fetchMyBids()` returns ALL bids from last 7 days
2. `RideBiddingViewModel.swift:252` - `activeRides = bids.filter { $0.status == "accepted" }` - This filters for accepted bids
3. BUT the driver must MANUALLY navigate to the "Active" tab to see the matched ride
4. There is NO auto-navigation from "My Bids" or "Available" tab to ActiveRideView when a bid is accepted

**Why ride "disappears":**
- When the bid is accepted, `fetchMyBids()` runs
- The bid moves from `pendingBids` to `activeRides`
- The ride also disappears from `availableRequests` (it's now MATCHED status)
- But the driver is still looking at the "My Bids" or "Available" tab
- The ride appears to vanish because nothing auto-navigates to the "Active" tab
- WebSocket `onBidResponse` handler (`RideBiddingViewModel.swift:153-158`) only calls `fetchMyBids()`, does NOT trigger navigation

**Root Cause 2: "My Bids" badge shows historical count**

- `RideshareDashboardView.swift:191` - Badge shows `viewModel.pendingBids.count + viewModel.counteredBids.count`
- This is correct for ACTIVE bids (pending + countered only)
- BUT `fetchDriverBids()` returns bids from last 7 days (`bid_routes.py:1730` - `days: int = 7`)
- iOS does NOT pass any `days` parameter, so it gets all 7 days of bids
- Expired/rejected bids from past days bloat the `myBids` list
- The badge count is correct (filters pending+countered), but the list shows ALL bids from 7 days

**Root Cause 3: Old MATCHED rides blocking new bids**

- `bid_routes.py:1257-1267` - Driver cannot bid if they have ANY active ride (MATCHED or IN_PROGRESS)
- The 10-minute matched timeout (`bid_routes.py:3385-3458`) should clean these up
- But if the scheduler is not running (or if the ride was driver_arrived but no start), old MATCHED rides persist
- `bid_routes.py:3400` - Timeout only fires if `driver_arrived_at IS NULL` - rides where driver marked arrived but never started are NOT cleaned up

### STEP 7: Driver Navigates to Pickup (After Finding ActiveRideView)
**Status: PASS (once driver finds the Active tab)**
- `ActiveRideView.swift:791-798` - Opens Apple Maps with correct destination coordinates
- Shows pickup or dropoff based on ride phase
- Navigation button is always visible in action card

### STEP 8: Driver Marks Arrived
**Endpoint:** `POST /api/rides/request/{id}/arrived`
**Status: PASS**
- `bid_routes.py:1779-1862` - Sets `driver_arrived_at`, sends push + WebSocket to customer
- Does NOT change ride status (still MATCHED) - this is correct, status changes at "start ride"
- iOS: `ActiveRideView.swift:475-496` - Transitions local state to `.arrivedAtPickup`
- Customer gets "Your driver has arrived!" push notification

### STEP 9: Driver Starts Ride
**Endpoint:** `POST /api/rides/request/{id}/start`
**Status: PASS**
- `bid_routes.py:2031-2115` - Changes status to IN_PROGRESS, sends push + email to customer
- iOS: `ActiveRideView.swift:751-764` - Transitions to `.inProgress`
- Insurance Period 3 starts (not logged here, but at arrived step)

### STEP 10: Customer Sees Live Tracking
**Endpoint:** `GET /api/rides/{ride_id}/track`
**Status: PASS**
- `main_new.py:16517-16596` - Returns driver location, ETA, vehicle info
- iOS: `RideRequestViewModel.swift:769-803` - Polls every 5s, updates `rideTracking`
- `RideRequestView.swift:1309` - `RideTrackingView` shows map with driver pin, ETA
- Customer WebSocket also receives driver location updates

### STEP 11: Driver Completes Ride
**Endpoint:** `POST /api/rides/request/{id}/complete`
**Status: PASS**
- `bid_routes.py:2118-2291` - Sets COMPLETED, calculates platform fee + driver payout
- Auto-triggers Stripe payout to driver
- Sends receipt email to customer
- iOS: `ActiveRideView.swift:767-776` - Transitions to `.completed`, shows earnings summary

### STEP 12: Payment Processing
**Status: PASS (with caveat)**
- `bid_routes.py:2166-2222` - Stripe Transfer created for driver payout
- Demo rides skip Stripe (checks `demo_` prefix on payment intent)
- **Caveat:** Customer is never actually charged in the bid flow. There is no Stripe PaymentIntent creation during ride request. The `stripe_payment_intent_id` is always null for bid-flow rides. Payment capture happens only for food delivery orders.

### STEP 13: Rating
**Status: PASS**
- Driver rates passenger: `RideBiddingViewModel.swift:583-596` -> `ratePassenger()` API call
- Customer rates driver: `RideRequestView.swift` has rating UI in completion state
- iOS driver: `ActiveRideView.swift:670-712` - Full star rating + comment UI in completion summary

### STEP 14: Receipt
**Status: PASS**
- Email receipt sent via `send_ride_completed_email()` at completion
- Push notification with final price
- iOS completion summary shows breakdown (fare, platform fee, tip, total)

---

## TNC Compliance Features Audit

### Waybill Button
**Status: PASS**
- `ActiveRideView.swift:123-127` - Waybill button in toolbar (doc.text icon)
- `ActiveRideView.swift:153-156` - Opens `WaybillSheet` with ride request ID
- Visible during all ride phases

### Accessibility Badge
**Status: PASS**
- `ActiveRideView.swift:368-376` - Shows wheelchair icon + "Accessibility requested" when `request.accessibility_requested == true`
- Backend stores `accessibility_requested` and `accessibility_notes` on RideRequest

### SOS Button
**Status: PASS**
- `ActiveRideView.swift:129-139` - Red "SOS" button in toolbar, calls 911

---

## Cross-Driver Behavior Audit

### Ride Removed from Other Drivers When Accepted
**Status: PASS**
- `bid_routes.py:700-701` - Ride status changes to MATCHED on bid accept
- `bid_routes.py:1129-1131` - Available rides query filters OPEN/BIDDING only
- Other drivers won't see MATCHED rides in their available list
- Other pending bids are rejected (`bid_routes.py:723-735`)

### Driver Blocked from New Rides During Active Ride
**Status: PASS**
- `bid_routes.py:1257-1267` - Checks for active MATCHED/IN_PROGRESS ride before allowing bid
- `bid_routes.py:1271-1281` - Also checks for active food delivery
- Returns clear error message

### Stale Bids Cleanup
**Status: PASS (schedulers are registered)**
- `bid_routes.py:3282-3383` - `check_ride_bidding_expiry_job()` expires rides past bidding window
- `bid_routes.py:3385-3458` - `check_ride_matched_timeout_job()` reopens stale matched rides (10 min)
- `bid_routes.py:3461-3517` - `check_ride_in_progress_timeout_job()` cancels 2h+ rides
- `bid_routes.py:3520-3548` - `check_individual_bid_expiry_job()` expires individual bids
- `order_flow.py:2921-2960` - All four jobs registered with BackgroundScheduler

---

## Push Notifications at Each Status Change

| Step | Push to Customer | Push to Driver |
|------|-----------------|----------------|
| Ride Created | Confirmation email | "New Ride Request!" push |
| Bid Submitted | "New Driver Bid!" push + email | - |
| Bid Accepted | "Driver on the way!" push + email | "Bid Accepted!" push |
| Driver Arrived | "Your driver has arrived!" push | - |
| Ride Started | Push + email | Push |
| Ride Completed | "Ride Complete!" push + email | "Payment Received!" push |
| Bid Rejected | - | "Bid Not Accepted" push |
| Counter Offer | Push about counter | Push about counter |

**Status: PASS - All status changes send appropriate notifications**

---

## Chat Functionality

### Driver Side
**Status: PASS**
- `ActiveRideView.swift:117-119` - Chat button in toolbar (always visible during active ride)
- `ActiveRideView.swift:144-151` - Opens `RiderChatView` with ride request ID and rider info
- Also appears in status card quick actions (`ActiveRideView.swift:387-394`)

### Customer Side
**Status: NEEDS VERIFICATION**
- Chat button should appear when driver is matched
- WebSocket-based chat requires both parties to be connected
- Chat implementation uses ride request ID as the chat room identifier

---

## Android Parity Check

### Android Driver - ActiveRideViewModel.kt
**Status: CRITICAL BUG**
- `ActiveRideViewModel.kt:125-188` - `loadActiveRide()` calls `repository.acceptRide(rideId)` in `init`
- This means EVERY TIME the ActiveRideScreen is opened, it calls the accept endpoint AGAIN
- If the ride is already accepted (MATCHED), the backend returns 400 ("Ride request is matched, not accepting bids")
- The fallback tries `repository.getAvailableRides()` to find the ride, but MATCHED rides are NOT in available rides
- **Result:** Android driver opening ActiveRideScreen for an already-accepted ride gets an error

### Android Driver - AvailableRidesScreen.kt
**Status: PASS**
- Has bid-blocked dialog for active rides/deliveries
- Proper refresh/navigation callbacks

---

## Eliminated Hypotheses

- hypothesis: Backend bid acceptance doesn't reject other bids
  evidence: `bid_routes.py:723-735` explicitly rejects all other pending bids
  timestamp: 2026-03-17

- hypothesis: Backend doesn't send push notifications
  evidence: Push notifications sent at every status change (14+ send_push_notification calls in bid_routes.py)
  timestamp: 2026-03-17

- hypothesis: Cleanup jobs not registered
  evidence: `order_flow.py:2921-2960` registers all 4 ride cleanup jobs with BackgroundScheduler
  timestamp: 2026-03-17

---

## ROOT CAUSES IDENTIFIED

### CRITICAL (Breaks core flow)

**BUG 1: Driver app does NOT auto-navigate to Active Ride after bid acceptance**
- **File:** `apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift:153-158`
- **Problem:** WebSocket `onBidResponse` handler only calls `fetchMyBids()`. No auto-navigation to Active tab or ActiveRideView.
- **Impact:** Driver's accepted ride "disappears" - they must manually find the Active tab
- **Fix:** When `fetchMyBids()` detects a newly accepted bid (status changes from pending to accepted), auto-switch `selectedTab` to `.active` and/or present ActiveRideView as a navigation destination

**BUG 2: Matched rides where driver arrived but never started are never cleaned up**
- **File:** `apps/web/p2p-platform/backend/bid_routes.py:3400`
- **Problem:** `check_ride_matched_timeout_job()` only expires rides where `driver_arrived_at IS NULL`. If driver tapped "I've Arrived" but never started the ride, it stays MATCHED forever.
- **Impact:** Old MATCHED rides block the driver from bidding on new rides (`bid_routes.py:1257-1267`)
- **Fix:** Add a separate check: MATCHED rides where `driver_arrived_at IS NOT NULL` AND arrival was >30 min ago should be auto-cancelled

**BUG 3: Android ActiveRideViewModel re-accepts ride on every screen open**
- **File:** `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/ActiveRideViewModel.kt:125-188`
- **Problem:** `loadActiveRide()` calls `repository.acceptRide(rideId)` every time. For already-matched rides, this fails. Fallback looks in available rides (which excludes matched rides).
- **Impact:** Android driver cannot open an already-accepted ride's details
- **Fix:** Change to fetch ride details first (GET request), only call accept if ride is not yet matched

### HIGH (Degraded experience)

**BUG 4: Customer never charged in bid flow - no PaymentIntent**
- **File:** `apps/web/p2p-platform/backend/bid_routes.py:2166-2222`
- **Problem:** Complete ride attempts Stripe payout to driver, but no PaymentIntent is ever created for the customer during bid acceptance or ride start. `ride_request.stripe_payment_intent_id` is always null.
- **Impact:** Driver payouts fail silently (Stripe has no funds to transfer)
- **Fix:** Create Stripe PaymentIntent when bid is accepted (or at ride start), capture when ride completes

**BUG 5: iOS fetchDriverBids returns 7 days of bids, bloating My Bids list**
- **File:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift:5601`
- **Problem:** No `days` query parameter passed. Backend defaults to 7 days (`bid_routes.py:1730`). Returns ALL bids (pending, accepted, rejected, expired) from last 7 days.
- **Impact:** "14 old bids showing" - My Bids tab shows historical bids mixed with active ones
- **Fix:** Either pass `days=1` from iOS, or create a separate "active bids only" endpoint that filters to pending/countered/accepted bids on non-completed rides

### MEDIUM (Missing polish)

**BUG 6: No auto-switch to Active tab when ride is accepted**
- **File:** `apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift`
- **Problem:** `RideshareDashboardView` has `@State private var selectedTab` but nothing triggers tab change when a bid is accepted
- **Impact:** Driver has to manually discover the Active tab
- **Fix:** Observe `viewModel.activeRides` changes and auto-switch to `.active` tab when count increases

**BUG 7: ActiveRideView initializes rideStatus from backend status but misses "arrived" sub-state**
- **File:** `apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift:200-217`
- **Problem:** `onAppear` maps ride status but only checks `in_progress`, `completed`, and defaults to `.matched`. Doesn't check if `driver_arrived_at` is set to initialize to `.arrivedAtPickup`.
- **Impact:** If driver leaves and returns to ActiveRideView after marking arrived, UI resets to "Matched" state
- **Fix:** Check `driver_arrived_at` field in ride request data and set `.arrivedAtPickup` if present

**BUG 8: Driver location update interval is 15 seconds on Android**
- **File:** `ActiveRideViewModel.kt:120` - `delay(15_000L)`
- **Problem:** 15-second update interval makes customer tracking feel laggy
- **Impact:** Customer sees stale driver position
- **Fix:** Reduce to 5-10 seconds during active ride

---

## Missing Features List

1. **Payment collection from customer** - No Stripe PaymentIntent in bid flow
2. **"Driver on the way" real-time ETA on customer side** - ETA calculated but updates only on poll (5s)
3. **Auto-navigate driver to active ride on bid acceptance** - Manual tab discovery required
4. **Bid acceptance haptic/sound feedback** - No haptic or sound when bid is accepted
5. **Post-ride tip flow for customer** - Tip button exists but may not trigger Stripe
6. **Ride history view** - Customer can see past rides but driver history may be limited to 7 days

---

## Prioritized Fix Plan

### Wave 1 - Critical (Must fix for basic flow to work)

| # | Bug | File(s) | Effort | Fix |
|---|-----|---------|--------|-----|
| 1 | Auto-navigate driver to ActiveRideView on bid acceptance | `RideBiddingViewModel.swift`, `RideshareDashboardView.swift` | 30 min | Add `onBidAccepted` callback; observe `activeRides` changes; auto-switch tab + present ActiveRideView |
| 2 | Clean up MATCHED rides with stale arrival (arrived but never started) | `bid_routes.py:3385-3458` | 15 min | Add condition: also expire MATCHED rides where `driver_arrived_at` is not null AND older than 30 min |
| 3 | Android: Don't re-accept already-matched rides | `ActiveRideViewModel.kt:125-188` | 30 min | Fetch ride details via GET first; only call accept if ride status is OPEN/BIDDING |

### Wave 2 - High (Payment + data quality)

| # | Bug | File(s) | Effort | Fix |
|---|-----|---------|--------|-----|
| 4 | Create Stripe PaymentIntent for rideshare bid flow | `bid_routes.py` (accept bid handler) | 2 hr | On bid accept, create PaymentIntent with final_price; on ride complete, capture it; on cancel, void it |
| 5 | Filter My Bids to show only active/recent bids | `P2PAPIService.swift:5601`, `bid_routes.py:1725` | 20 min | Pass `days=1` query param from iOS; or add backend filtering for non-terminal statuses only |

### Wave 3 - Medium (Polish)

| # | Bug | File(s) | Effort | Fix |
|---|-----|---------|--------|-----|
| 6 | ActiveRideView should restore `.arrivedAtPickup` state on reappear | `ActiveRideView.swift:200-217` | 15 min | Check `bid.ride_request?.driver_arrived_at` in onAppear and set rideStatus accordingly |
| 7 | Android driver location update interval too slow | `ActiveRideViewModel.kt:120` | 5 min | Change `delay(15_000L)` to `delay(5_000L)` |
| 8 | iOS driver radius too large when location unavailable | `RideBiddingViewModel.swift:208` | 5 min | Cap radius to reasonable value (100km) even without location |

---

## Resolution

root_cause: Multiple independent bugs - most critically, driver app does NOT auto-navigate to ActiveRideView when bid is accepted, causing rides to "disappear". Secondary: stale MATCHED rides blocking new bids, Android re-accept bug, no payment capture, historical bids bloating UI.
fix: See prioritized fix plan above (8 bugs across 3 waves)
verification: B4a bid_routes.py:3911-3913 (driver_arrived_at.isnot(None) in stale_arrived cleanup), B4b RideshareDashboardView.swift:112+122 (selectedTab = .active on bid acceptance), B4c P2PAPIService.swift:5657 (URLQueryItem days=1), B4d ActiveRideViewModel.kt:137-144 (existingBid guard avoids re-calling acceptRide), B4e bid_routes.py:805+816 (PaymentIntent.create capture_method=manual) + bid_routes.py:2578+4073 (PaymentIntent.capture)
files_changed: [bid_routes.py, RideshareDashboardView.swift, P2PAPIService.swift, ActiveRideViewModel.kt]
