---
status: resolved
trigger: "Investigate how long rideshare ride requests stay available to drivers, what happens when a bid is accepted, and whether stale rides are cleaned up."
created: 2026-03-03T00:00:00Z
updated: 2026-03-03T00:00:00Z
---

## Current Focus

hypothesis: N/A - investigation complete
test: N/A
expecting: N/A
next_action: Report findings

## Symptoms

expected: Ride requests should have a clear timeout, other drivers should stop seeing rides after a bid is accepted, stale rides should be cleaned up
actual: Investigation into current design behavior - no bug reported
errors: None
reproduction: N/A
started: Feature has always worked this way

## Evidence

### 1. Ride Request Creation and Bidding Window

- **File**: `bid_routes.py:331-401`
- **Finding**: When a customer creates a ride request via `POST /api/rides/request`, the `bidding_expires_at` field is set to `datetime.utcnow() + timedelta(minutes=data.bidding_duration_minutes)`.
- **Default bidding duration**: 5 minutes (`bid_routes.py:86`), configurable by customer between 1-30 minutes (`bid_routes.py:340`).
- **Initial status**: `RideRequestStatus.OPEN` (`bid_routes.py:394`).
- **Broadcast**: On creation, a WebSocket message `"new_ride_request"` is broadcast to all drivers on the `"ride_requests"` topic (`bid_routes.py:406-409`, `websocket_server.py:396-413`).

### 2. Available Rides Endpoints (3 variants)

**Endpoint A**: `GET /api/rides/request/available` (bid_routes.py:1006-1059) -- FILTERS on bidding_expires_at
- Queries rides with status OPEN or BIDDING
- **Correctly filters**: `RideRequest.bidding_expires_at > now OR bidding_expires_at IS NULL` (`bid_routes.py:1026-1028`)
- Also filters by radius if driver location provided
- Shows whether driver already has a bid on each ride

**Endpoint B**: `GET /api/rides/available` (main_new.py:15497-15586) -- DOES NOT filter on bidding_expires_at
- Queries rides with status OPEN or BIDDING
- **BUG**: No filter on `bidding_expires_at` -- returns expired-but-not-yet-cleaned-up rides
- Filters by distance radius only
- Hardcodes `bidding_expires_at: None` and `already_bid: False` in response

**Endpoint C**: `GET /erp/rides/available` and `/api/erp/rides/available` (order_flow.py:788-846) -- DOES NOT filter on bidding_expires_at
- Legacy iOS alias, queries OPEN/BIDDING rides
- **BUG**: Same issue as Endpoint B -- no expiry filter
- Delegates to `get_available_rides` in order_flow.py

**Additional alias**: `GET /rides/available` (main_new.py:20851) -- maps to bid_routes `get_available_ride_requests`

### 3. What Happens When a Bid is Accepted

**File**: `bid_routes.py:604-732` (`respond_to_bid` with action="accept")

1. Accepted bid status -> `BidStatus.ACCEPTED` (line 606)
2. Ride status -> `RideRequestStatus.MATCHED` (line 611)
3. `matched_driver_id`, `matched_bid_id`, `final_price`, `matched_at` all set (lines 612-615)
4. **All other PENDING bids are REJECTED** immediately (lines 617-629)
   - Status set to `BidStatus.REJECTED`
   - `customer_response` = "Another bid was accepted"
5. **WebSocket broadcast**: `broadcast_ride_matched` sends to:
   - Customer via `customer:{customer_id}` topic
   - Matched driver via `driver:{driver_id}` topic
   - **All subscribed drivers** via `ride_request:{ride_request_id}` topic with type `"ride_request_closed"` and reason `"matched"` (`websocket_server.py:462-466`)
6. Push notifications sent to both driver (bid accepted) and customer (driver en route)
7. Email sent to customer with driver info

**Same flow for counter-offer acceptance**: `bid_routes.py:1476-1526` (`accept_counter_offer`) -- also rejects all other pending bids.

**Result**: After acceptance, the ride status is MATCHED, so it will NOT appear in available rides queries (which filter on OPEN/BIDDING). Other drivers' bids are immediately rejected.

### 4. Stale Ride Cleanup -- Background Jobs

**File**: `bid_routes.py:2985-3177`, registered in `order_flow.py:2348-2394`

Three background scheduler jobs run every **60 seconds** (`RIDE_CLEANUP_CHECK_INTERVAL_SECONDS = 60`):

**Job 1: `check_ride_bidding_expiry_job`** (bid_routes.py:2995-3039)
- Finds OPEN/BIDDING rides where `bidding_expires_at < now`
- Transitions them to `RideRequestStatus.EXPIRED`
- Also expires all PENDING bids on those rides
- **Timeout**: `RIDE_BIDDING_EXPIRY_MINUTES = 5` (but actual window is customer-set, default 5 min)

**Job 2: `check_ride_matched_timeout_job`** (bid_routes.py:3042-3116)
- Finds MATCHED rides where `matched_at` is >10 minutes ago AND `driver_arrived_at` is NULL
- **Reopens the ride**: Resets to OPEN, clears matched driver/bid/price, extends bidding by 5 more minutes
- Marks the accepted bid as EXPIRED
- Sends push notification to customer: "Your driver didn't respond in time"
- **Timeout**: `RIDE_MATCHED_TIMEOUT_MINUTES = 10`

**Job 3: `check_ride_in_progress_timeout_job`** (bid_routes.py:3119-3177)
- Finds IN_PROGRESS rides where `updated_at` is >2 hours ago
- Cancels them with auto-cancellation note
- Sends push notification to customer
- **Timeout**: `RIDE_IN_PROGRESS_TIMEOUT_HOURS = 2`

### 5. Driver App Polling Behavior

**iOS (DeliveryViewModel)**: `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift:120-132`
- Polls every **10 seconds** via Timer
- Calls `fetchAvailableRides()` which hits the backend endpoint
- No client-side expiry filtering

**iOS (RideBiddingViewModel)**: `apps/ios/delivery/eatffairdelivery/ViewModels/RideBiddingViewModel.swift:131-139`
- Polls every **5 seconds** via Timer
- **Only polls when WebSocket is disconnected** (line 137: `if self.wsManager.isConnected { return }`)
- WebSocket provides real-time updates for new rides, bid responses, ride status changes

**Android (AvailableRidesViewModel)**: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/AvailableRidesViewModel.kt:50-96`
- Polls every **15 seconds** (`pollingInterval = 15_000L`)
- No WebSocket integration for ride availability
- Uses Firebase push for `TYPE_NEW_RIDE_REQUEST` notifications

### 6. Bid Expiry

- Individual bids have an `expires_at` field (`models.py:1405`)
- There's an admin endpoint for expiring bids (`main_new.py:18886-18908`) but it's manual, not automated
- The background job `check_ride_bidding_expiry_job` expires bids when the RIDE expires, not when individual bids expire
- **Gap**: No background job auto-expires individual bids based on `RideBid.expires_at`

### 7. Legacy Direct Accept (No Bid System)

**File**: `main_new.py:14303-14320` (`accept_ride_ios_alias`)
- `POST /api/erp/rides/{rideId}/accept` bypasses the bid system entirely
- Sets ride to MATCHED directly with a driver_id from the request body
- **Does NOT reject other bids** on the same ride
- **Does NOT send WebSocket broadcasts** or push notifications
- Legacy endpoint for backward compatibility

## Resolution

### Summary of Current Behavior

| Phase | Timeout | Mechanism | Cleanup |
|-------|---------|-----------|---------|
| OPEN/BIDDING (waiting for bids) | Customer-set, default 5 min (1-30 min range) | `bidding_expires_at` field | Background job every 60s -> EXPIRED |
| MATCHED (driver accepted, heading to pickup) | 10 minutes | `matched_at` + `driver_arrived_at IS NULL` | Background job every 60s -> reopens as OPEN |
| IN_PROGRESS (ride happening) | 2 hours | `updated_at` | Background job every 60s -> CANCELLED |

### Identified Gaps / Issues

**GAP 1: Inconsistent available rides filtering (MEDIUM)**
- `GET /api/rides/available` (main_new.py:15517) does NOT filter on `bidding_expires_at`
- `GET /erp/rides/available` (order_flow.py:801) does NOT filter on `bidding_expires_at`
- Between the background job runs (up to 60 seconds), these endpoints return expired rides
- Only `GET /api/rides/request/available` (bid_routes.py:1023) correctly filters

**GAP 2: No individual bid expiry background job (LOW)**
- `RideBid.expires_at` field exists but no automated job expires individual bids
- The admin endpoint at `main_new.py:18886` does this manually
- Bids are only expired when the entire ride expires

**GAP 3: Legacy accept endpoint skips bid rejection (LOW)**
- `POST /api/erp/rides/{rideId}/accept` (main_new.py:14303) doesn't reject other bids or broadcast
- Could leave orphaned PENDING bids on matched rides

**GAP 4: Android lacks WebSocket for ride availability (LOW)**
- Android relies on 15-second polling only
- iOS has both WebSocket (real-time) + 5-second fallback polling
- Android uses Firebase push for new ride notifications, which partially compensates

**GAP 5: No customer notification when ride expires with no bids (LOW)**
- `check_ride_bidding_expiry_job` (bid_routes.py:2995) does NOT send push notification to customer
- Customer just sees the ride sit there until they manually check

### What Works Well

1. Bid acceptance immediately rejects all other pending bids
2. WebSocket broadcasts `ride_request_closed` to all subscribed drivers when ride is matched
3. MATCHED timeout (10 min) auto-reopens rides for other drivers if driver is a no-show
4. IN_PROGRESS timeout (2 hours) catches abandoned rides
5. Self-bidding prevention via email cross-check
6. Concurrent ride limit (max 3 open per customer)
7. Bidding window enforcement at bid submission time (bid_routes.py:1110)
