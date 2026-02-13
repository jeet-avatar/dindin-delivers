# Comprehensive P2P Rideshare Flow Test Document

**Last Updated:** 2026-02-13
**Apps:** Customer iOS, Driver iOS
**Backend:** bid_routes.py
**Status:** Production Ready

---

## Executive Summary

This document traces the complete P2P rideshare flow showing every screen, UI element, user action, API call, and state change from ride request to completion.

---

# PART 1: CUSTOMER APP FLOW

## Screen-by-Screen Walkthrough

### Step 1: Open Ride Request Screen

| Property | Details |
|----------|---------|
| **Screen** | RideRequestView |
| **File** | `customer/Views/RideRequestView.swift` |
| **Initial State** | `currentStep = .selectPickup` |

**UI Elements:**
- Map background with current location
- Bottom sheet with location inputs
- "PICKUP" input field (empty)
- "DROPOFF" input field (empty)

**User Actions:**
- Grant location permission
- Tap PICKUP field

**API Calls:** None

---

### Step 2: Select Pickup Location

| Property | Details |
|----------|---------|
| **Screen** | RideLocationSearchView (Sheet) |
| **File** | `customer/Views/RideRequestView.swift:855-1000` |

**UI Elements:**
- Search bar with magnifying glass
- "Use Current Location" button (blue pin icon)
- Search results list (as user types)
- Map preview with blue pickup marker

**User Actions:**
- Type address to search
- OR tap "Use Current Location"
- Tap result to select

**State Changes:**
```
pickupAddress = RideAddressInput(...)
currentStep → .selectDropoff
Map adds blue pickup marker
```

---

### Step 3: Select Dropoff Location

| Property | Details |
|----------|---------|
| **Screen** | RideLocationSearchView (Sheet) |
| **State** | `currentStep = .selectDropoff` |

**UI Elements:**
- Same search UI as pickup
- Green dropoff marker on map

**User Actions:**
- Search and select destination

**State Changes:**
```
dropoffAddress = RideAddressInput(...)
currentStep → .confirmRide
Map shows route between markers
```

---

### Step 4: Confirm Ride & View Fare Estimate

| Property | Details |
|----------|---------|
| **Screen** | RideBottomSheet |
| **File** | `customer/Views/RideRequestView.swift:245-599` |
| **State** | `currentStep = .confirmRide` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  Pickup: 123 Main St, City          │
│  Dropoff: 456 Oak Ave, City         │
│  Notes: [optional text field]       │
├─────────────────────────────────────┤
│  FARE ESTIMATE                      │
│  Distance: 5.2 miles                │
│  Duration: ~15 min                  │
│                                     │
│  Base Fare:      $3.00              │
│  Distance Fee:   $7.80              │
│  Time Fee:       $2.25              │
│  ─────────────────────              │
│  Subtotal:       $13.05             │
│  Connection Fee: $1.00              │
│  Tax (8.5%):     $1.11              │
│  ─────────────────────              │
│  TOTAL:          $15.16             │
│                                     │
│  Driver keeps: 96% ($14.16)         │
├─────────────────────────────────────┤
│  [Make Different Offer]             │
│  [  FIND DRIVER - $15.16  ] (green) │
└─────────────────────────────────────┘
```

**User Actions:**
- Add optional notes
- Tap "Find Driver" (use suggested price)
- OR tap "Make Different Offer" (custom price)

**API Calls:**
```
POST /api/rides/estimate
→ Returns: distance, duration, fare breakdown
```

---

### Step 5: Request Ride (Waiting for Bids)

| Property | Details |
|----------|---------|
| **Screen** | RideStatusCard |
| **File** | `customer/Views/RideRequestView.swift:1277-1842` |
| **State** | `currentStep = .waitingForDriver` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  ○ Finding available drivers...     │
│  [spinning indicator]               │
│                                     │
│  0 Driver(s) Available              │
│  [View Bids] (disabled until bids)  │
│                                     │
│  [Cancel Request] (red X)           │
└─────────────────────────────────────┘
```

**API Calls:**
```
POST /api/rides/request
Body: {customer_id, pickup, dropoff, notes, preferred_price}
→ Returns: rideId, rideNumber, status="open"

Then starts polling:
GET /api/rides/request/{id}/bids (every 5 seconds)
→ Returns: array of pending bids
```

**State Changes:**
```
activeRide = RideRequestResponse
isRideActive = true
startBidPolling() // 5-second interval
```

---

### Step 6: Incoming Driver Bids

| Property | Details |
|----------|---------|
| **Screen** | DriverBidsSheet (auto-opens on first bid) |
| **File** | `customer/Views/RideRequestView.swift:2455-2530` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  AVAILABLE DRIVERS (2)              │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ [Photo] John D.  ★4.8       │    │
│  │ Toyota Camry (Black)        │    │
│  │ ETA: 5 min                  │    │
│  │                             │    │
│  │ OFFERED: $14.00 (green)     │    │
│  │ "Happy to help!"            │    │
│  │                             │    │
│  │ [Decline] [Counter] [Accept]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Photo] Sarah M.  ★4.9      │    │
│  │ Honda Accord (White)        │    │
│  │ ETA: 8 min                  │    │
│  │                             │    │
│  │ OFFERED: $16.00 (green)     │    │
│  │                             │    │
│  │ [Decline] [Counter] [Accept]│    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**User Actions:**
- **Accept** → Instantly match with driver
- **Counter** → Send counter-offer
- **Decline** → Remove bid from list

---

### Step 7A: Accept Driver Bid

| Property | Details |
|----------|---------|
| **Action** | Tap green "Accept" button on bid card |

**API Call:**
```
POST /api/rides/bid/{bidId}/respond
Body: {action: "accept"}
→ Returns: driver info, ETA, vehicle details
```

**Backend Changes:**
- Bid status → ACCEPTED
- RideRequest status → MATCHED
- Other bids → REJECTED
- Push notification → Driver

**State Changes:**
```
stopBidPolling()
acceptedDriver = AcceptedDriverInfo
driverETA = estimated_arrival_minutes
currentStep → .driverEnRoute
```

---

### Step 7B: Counter Driver Bid

| Property | Details |
|----------|---------|
| **Screen** | BidCounterSheet |
| **File** | `customer/Views/RideRequestView.swift:2533-2669` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  COUNTER OFFER                      │
├─────────────────────────────────────┤
│  Driver's Offer: $14.00 (green box) │
│                                     │
│  Your Counter: [$ _____ ]           │
│                                     │
│  Message: [optional text field]     │
│                                     │
│  Counters remaining: 2 (orange)     │
│                                     │
│  [Submit Counter Offer] (orange)    │
└─────────────────────────────────────┘
```

**API Call:**
```
POST /api/rides/bid/{bidId}/respond
Body: {action: "counter", counter_price: 12.00, message: "..."}
→ Returns: success, counters_remaining, negotiation_round
```

**Backend Changes:**
- Bid status → COUNTERED
- customer_counter_price = 12.00
- customer_counter_count++
- Push notification → Driver

---

### Step 8: Driver Accepted (En Route to Pickup)

| Property | Details |
|----------|---------|
| **Screen** | RideStatusCard + Map |
| **State** | `currentStep = .driverEnRoute` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  ✓ Driver accepted!                 │
│  On the way to pick you up          │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ [Photo]  JOHN D.  ★4.8      │    │
│  │ Toyota Camry (Black)        │    │
│  │                             │    │
│  │ License: ABC 1234 (yellow)  │    │
│  │                             │    │
│  │ ETA: 5 min                  │    │
│  │                             │    │
│  │ [Phone Icon] Call Driver    │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [Map showing driver location]      │
│  🚗 Driver moving towards pickup    │
└─────────────────────────────────────┘
```

**Polling:**
```
GET /api/rides/{id}/track (every 5 seconds)
→ Returns: driver_latitude, driver_longitude, status
```

**User Actions:**
- Call driver (tap phone icon)
- Watch driver approach on map

---

### Step 9: Ride In Progress

| Property | Details |
|----------|---------|
| **Screen** | RideStatusCard |
| **State** | `currentStep = .rideInProgress` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  🚗 IN TRANSIT                      │
│  Heading to your destination        │
├─────────────────────────────────────┤
│  [Driver card same as before]       │
├─────────────────────────────────────┤
│  [Map showing route to dropoff]     │
│  🚗 → 🏁                            │
└─────────────────────────────────────┘
```

**Trigger:** Driver taps "Start Ride" in their app

**Push Notification Received:**
```
Title: "You're on your way!"
Body: "John picked you up. ETA to destination: ~12 min"
```

---

### Step 10: Ride Completed (Thank You Screen)

| Property | Details |
|----------|---------|
| **Screen** | rideCompletedSection |
| **File** | `customer/Views/RideRequestView.swift:1868-2243` |
| **State** | `currentStep = .completed` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│         ✓ (green checkmark)         │
│      RIDE COMPLETE!                 │
├─────────────────────────────────────┤
│  TRIP SUMMARY                       │
│  ─────────────────────              │
│  📍 123 Main St → 456 Oak Ave       │
│  Ride #RIDE2026000042               │
├─────────────────────────────────────┤
│  FARE BREAKDOWN                     │
│  ─────────────────────              │
│  Ride Fare:       $13.00            │
│  Connection Fee:   $1.00            │
│  ─────────────────────              │
│  TOTAL PAID:      $14.00            │
│                                     │
│  Driver earned: $13.00 (93%)        │
├─────────────────────────────────────┤
│  RATE YOUR DRIVER                   │
│  ─────────────────────              │
│  [Photo] John D.                    │
│  Toyota Camry                       │
│                                     │
│  ☆ ☆ ☆ ☆ ☆  (tap to rate)          │
│                                     │
│  Feedback: [optional text]          │
│                                     │
│  [Submit Rating]                    │
├─────────────────────────────────────┤
│  ADD A TIP                          │
│  ─────────────────────              │
│  100% goes to your driver           │
│                                     │
│  [$2] [$5] [$10] [Custom]           │
│                                     │
│  [Submit Tip]                       │
├─────────────────────────────────────┤
│  [      DONE      ] (green)         │
└─────────────────────────────────────┘
```

**Push Notification Received:**
```
Title: "Ride Complete!"
Body: "You've arrived! Total: $14.00. Rate John and add a tip."
```

**API Calls:**
```
POST /api/rides/{id}/rating
Body: {rating: 5, comment: "Great driver!"}

POST /api/rides/{id}/tip
Body: {amount: 5.00}
```

---

# PART 2: DRIVER APP FLOW

## Screen-by-Screen Walkthrough

### Step 1: Open Available Ride Requests

| Property | Details |
|----------|---------|
| **Screen** | AvailableRideRequestsView |
| **File** | `delivery/Views/Rideshare/AvailableRideRequestsView.swift` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  RIDE REQUESTS          [Refresh]   │
├─────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┐    │
│  │Available│Avg Price│ My Bids │    │
│  │   3     │  $18    │   1     │    │
│  └─────────┴─────────┴─────────┘    │
├─────────────────────────────────────┤
│  Sort: [Nearest ▼]    View: [≡][📍] │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ $15-20 suggested (blue)     │    │
│  │ 📍 0.8 mi away   👥 2 bids  │    │
│  │                             │    │
│  │ 🟢 123 Main St (pickup)     │    │
│  │ 🔴 456 Oak Ave (dropoff)    │    │
│  │                             │    │
│  │ 5.2 mi • ~15 min            │    │
│  │                             │    │
│  │ [    SUBMIT BID    ] (blue) │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Polling:**
```
GET /api/rides/available?driver_id=X&latitude=Y&longitude=Z&radius_km=15
(every 5 seconds)
```

---

### Step 2: Submit Bid Sheet

| Property | Details |
|----------|---------|
| **Screen** | SubmitBidSheet |
| **File** | `delivery/Views/Rideshare/SubmitBidSheet.swift` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  SUBMIT YOUR BID           [X]      │
├─────────────────────────────────────┤
│  [Map preview with route]           │
├─────────────────────────────────────┤
│  ROUTE SUMMARY                      │
│  🟢 123 Main St                     │
│  🔴 456 Oak Ave                     │
│  5.2 mi • ~15 min                   │
├─────────────────────────────────────┤
│  YOUR BID PRICE                     │
│                                     │
│  Suggested: $17.00                  │
│                                     │
│  [Quick Accept] [Fair Price] [Prem] │
│     $15.64        $17.00      $18.36│
│      -8%          100%         +8%  │
│                                     │
│  Custom: [$ 17.00 ]                 │
├─────────────────────────────────────┤
│  YOUR EARNINGS                      │
│  ─────────────────────              │
│  You keep:     $16.00               │
│  Per mile:      $3.08               │
│  Per hour:     $64.00               │
│  Platform fee:  $1.00               │
├─────────────────────────────────────┤
│  ESTIMATED ARRIVAL                  │
│  [3min] [5min] [10min] [15min]      │
│           ✓                         │
├─────────────────────────────────────┤
│  Message: [Hello! Happy to help]    │
├─────────────────────────────────────┤
│  [  SUBMIT BID - $17.00  ] (blue)   │
└─────────────────────────────────────┘
```

**API Call:**
```
POST /api/rides/request/{id}/bid
Body: {
  driver_id: 123,
  proposed_price: 17.00,
  estimated_arrival_minutes: 5,
  message: "Hello! Happy to help"
}
```

---

### Step 3: My Bids - Pending

| Property | Details |
|----------|---------|
| **Screen** | MyBidsView (Pending Tab) |
| **File** | `delivery/Views/Rideshare/MyBidsView.swift` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  MY BIDS                            │
├─────────────────────────────────────┤
│  [Pending(1)] [Countered] [Accepted]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ ⏳ PENDING (orange badge)   │    │
│  │                             │    │
│  │ Your Bid: $17.00            │    │
│  │                             │    │
│  │ 🟢 123 Main St              │    │
│  │ 🔴 456 Oak Ave              │    │
│  │ 5.2 mi • ~15 min            │    │
│  │                             │    │
│  │ [Withdraw Bid] (red)        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

### Step 4: Counter-Offer Received

| Property | Details |
|----------|---------|
| **Screen** | MyBidsView (Countered Tab) |
| **Push Notification** | "Counter Offer Received! Customer offered $15.00 (Round 1/2)" |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  [Pending] [Countered(1)] [Accepted]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 🔄 COUNTERED (blue badge)   │    │
│  │                             │    │
│  │ Your Bid:    $17.00         │    │
│  │ Their Offer: $15.00 ↓       │    │
│  │              (orange arrow)  │    │
│  │                             │    │
│  │ 🟢 123 Main St              │    │
│  │ 🔴 456 Oak Ave              │    │
│  │                             │    │
│  │ [    RESPOND    ] (blue)    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

### Step 5: Respond to Counter-Offer

| Property | Details |
|----------|---------|
| **Screen** | CounterOfferResponseSheet |
| **File** | `delivery/Views/Rideshare/CounterOfferResponseSheet.swift` |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  COUNTER-OFFER              [X]     │
├─────────────────────────────────────┤
│         🔄 (blue icon)              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Your Bid    →    Their Offer│   │
│  │   $17.00          $15.00    │    │
│  │            -$2.00 (orange)  │    │
│  └─────────────────────────────┘    │
│                                     │
│  If you accept: You earn $14.00     │
├─────────────────────────────────────┤
│  TRIP DETAILS                       │
│  🟢 123 Main St → 🔴 456 Oak Ave    │
│  5.2 mi • ~15 min                   │
├─────────────────────────────────────┤
│  Platform fee: $1.00                │
│  You keep: 93% of fare              │
├─────────────────────────────────────┤
│  [ Accept $15.00 ] (green)          │
│                                     │
│  [ Counter with Different Price ]   │
│           (blue, expandable)        │
│                                     │
│  [ Reject Offer ] (red)             │
└─────────────────────────────────────┘
```

**Actions:**
- **Accept** → `POST /api/rides/bid/{id}/accept-counter`
- **Counter** → `POST /api/rides/bid/{id}/driver-counter`
- **Reject** → `POST /api/rides/bid/{id}/reject-counter`

---

### Step 6: Bid Accepted - Active Ride

| Property | Details |
|----------|---------|
| **Screen** | ActiveRideView |
| **File** | `delivery/Views/Rideshare/ActiveRideView.swift` |

**Push Notification Received:**
```
Title: "Bid Accepted!"
Body: "Sarah accepted your $15.00 bid. Head to pickup!"
```

**UI Elements:**
```
┌─────────────────────────────────────┐
│  [Map showing pickup location]      │
│                                     │
│  🚗 (driver) ──────→ 🟢 (pickup)    │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ ✓ MATCHED (green badge)     │    │
│  │                             │    │
│  │ Earnings: $14.00            │    │
│  │                             │    │
│  │ [S] Sarah M.                │    │
│  │ Passenger                   │    │
│  │                             │    │
│  │ [💬 Message] [📞 Call]      │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  HEADING TO PICKUP                  │
│  🟢 123 Main St                     │
│                                     │
│  [Navigate] (opens Apple Maps)      │
│                                     │
│  [  I'VE ARRIVED  ] (green)         │
└─────────────────────────────────────┘
```

---

### Step 7: Arrived at Pickup

| Property | Details |
|----------|---------|
| **Screen** | ActiveRideView |
| **State** | Arrived at pickup |

**UI Elements:**
```
┌─────────────────────────────────────┐
│  ✓ ARRIVED                          │
│  🟢 123 Main St                     │
│                                     │
│  [  START RIDE  ] (purple)          │
└─────────────────────────────────────┘
```

---

### Step 8: Start Ride (Passenger Picked Up)

| Property | Details |
|----------|---------|
| **Action** | Tap "Start Ride" |

**API Call:**
```
POST /api/rides/request/{id}/start
→ Backend sends push to customer: "You're on your way!"
```

**UI Changes:**
```
┌─────────────────────────────────────┐
│  🚗 IN PROGRESS (purple badge)      │
├─────────────────────────────────────┤
│  HEADING TO DROPOFF                 │
│  🔴 456 Oak Ave                     │
│                                     │
│  [Navigate]                         │
│                                     │
│  [  COMPLETE RIDE  ] (green)        │
└─────────────────────────────────────┘
```

---

### Step 9: Complete Ride (Passenger Dropped Off)

| Property | Details |
|----------|---------|
| **Action** | Tap "Complete Ride" |
| **Confirmation** | Alert: "Confirm that you have dropped off the passenger" |

**API Call:**
```
POST /api/rides/request/{id}/complete
→ Backend sends push to customer: "Ride Complete! Rate and tip."
```

**UI Elements (Completion):**
```
┌─────────────────────────────────────┐
│         ✓ (green checkmark)         │
│                                     │
│      RIDE COMPLETED!                │
│                                     │
│      $14.00 earned                  │
│                                     │
│  [Back to Available Rides]          │
└─────────────────────────────────────┘
```

---

# PART 3: BACKEND API FLOW

## Complete API Sequence

```
CUSTOMER                           BACKEND                            DRIVER
   │                                  │                                  │
   │  POST /rides/request             │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │  Create RideRequest              │
   │                                  │  Status: OPEN                    │
   │                                  │  WebSocket: broadcast to drivers │
   │                                  │                                  │
   │  <─ ride_id, request_id ─────────│                                  │
   │                                  │                                  │
   │                                  │  GET /rides/available            │
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │                                  │  ─ available_requests[] ─────────>
   │                                  │                                  │
   │                                  │  POST /rides/request/{id}/bid    │
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │                                  │  Create RideBid                  │
   │                                  │  Status: PENDING                 │
   │                                  │  Push: "New bid from John!"      │
   │  <─ push notification ───────────│                                  │
   │                                  │                                  │
   │  GET /rides/request/{id}/bids    │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │                                  │
   │  <─ bids[] ──────────────────────│                                  │
   │                                  │                                  │
   │  POST /rides/bid/{id}/respond    │                                  │
   │  {action: "accept"}              │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │  Bid.status = ACCEPTED           │
   │                                  │  RideRequest.status = MATCHED    │
   │                                  │  Push: "Bid accepted!"           │
   │                                  │ ─────────────────────────────────>
   │  <─ driver_info, ETA ────────────│                                  │
   │                                  │                                  │
   │  GET /rides/{id}/track (poll)    │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │                                  │
   │  <─ driver_location ─────────────│                                  │
   │                                  │                                  │
   │                                  │  POST /rides/request/{id}/start  │
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │                                  │  RideRequest.status = IN_PROGRESS│
   │  <─ push: "You're on your way!" ─│                                  │
   │                                  │                                  │
   │                                  │  POST /rides/request/{id}/complete
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │                                  │  RideRequest.status = COMPLETED  │
   │  <─ push: "Ride Complete!" ──────│                                  │
   │                                  │                                  │
   │  POST /rides/{id}/rating         │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │                                  │
   │  POST /rides/{id}/tip            │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │  100% tip to driver              │
   │                                  │                                  │
```

---

# PART 4: NEGOTIATION FLOW (DETAILED)

## Multi-Round Counter-Offer Sequence

```
CUSTOMER                           BACKEND                            DRIVER
   │                                  │                                  │
   │                                  │  Initial bid: $17.00             │
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │  POST /bid/{id}/respond          │                                  │
   │  {action:"counter", price:$15}   │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │  Bid.status = COUNTERED          │
   │                                  │  customer_counter_price = $15    │
   │                                  │  customer_counter_count = 1      │
   │                                  │  Push: "Counter offer $15"       │
   │                                  │ ─────────────────────────────────>
   │                                  │                                  │
   │                                  │  POST /bid/{id}/driver-counter   │
   │                                  │  {counter_price: $16}            │
   │                                  │ <─────────────────────────────────
   │                                  │                                  │
   │                                  │  Bid.proposed_price = $16        │
   │                                  │  negotiation_round = 2 (FINAL)   │
   │  <─ push: "Driver offered $16" ──│                                  │
   │                                  │                                  │
   │  POST /bid/{id}/respond          │                                  │
   │  {action:"accept"}               │                                  │
   │ ─────────────────────────────────>                                  │
   │                                  │  MATCHED at $16.00               │
   │                                  │ ─────────────────────────────────>
```

---

## Negotiation Rules

| Rule | Limit | Enforcement |
|------|-------|-------------|
| Customer counters per ride | Max 3 | `customer_counter_count` |
| Rounds per bid | Max 2 | `negotiation_round` |
| Low bid warning | < 60% of suggested | Warning message |
| Low bid reject | < 40% of suggested | HTTP 400 error |
| Bid expiry | 10 minutes | Auto-expire on next poll |

---

# PART 5: PUSH NOTIFICATIONS

## Complete Notification Map

| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| New bid received | Customer | "New Driver Bid!" | "{driver} bid ${price} for your ride" |
| Bid accepted | Driver | "Bid Accepted!" | "{customer} accepted your ${price} bid. Head to pickup!" |
| Counter-offer | Driver | "Counter Offer Received!" | "Customer offered ${price} (Round X/2)" |
| Driver counters | Customer | "Driver Counter Offer!" | "Driver offered ${price} - Final offer" |
| Counter accepted | Customer | "Driver Accepted Your Offer!" | "{driver} accepted ${price}. Pickup in ~X min" |
| Ride started | Customer | "You're on your way!" | "{driver} picked you up. ETA: ~X min" |
| Ride completed | Customer | "Ride Complete!" | "You've arrived! Total: ${price}. Rate {driver} and add a tip." |

---

# PART 6: STATE MACHINE

## Customer States

```
┌──────────────┐
│ selectPickup │
└──────┬───────┘
       │ pickup selected
       ▼
┌───────────────┐
│ selectDropoff │
└──────┬────────┘
       │ dropoff selected
       ▼
┌─────────────┐
│ confirmRide │
└──────┬──────┘
       │ "Find Driver" tapped
       ▼
┌──────────────────┐    ┌──────────────────┐
│ waitingForDriver │◄───│   (bid polling)  │
└──────┬───────────┘    └──────────────────┘
       │ bid accepted
       ▼
┌──────────────┐
│ driverEnRoute│ ◄── tracking every 5s
└──────┬───────┘
       │ driver starts ride
       ▼
┌────────────────┐
│ rideInProgress │ ◄── tracking every 5s
└──────┬─────────┘
       │ driver completes ride
       ▼
┌───────────┐
│ completed │ → Rating/Tip → Reset
└───────────┘
```

---

# PART 7: VERIFIED FIXES

## Issues Fixed in This Session

| Issue | Component | Fix Applied |
|-------|-----------|-------------|
| Rating/tip ignore API result | Customer iOS | Added switch on result |
| Missing null check accept-counter | Backend | Added HTTPException 404 |
| original_price overwritten | Backend | Preserve before update |
| Missing customer notification | Backend | Added push + email |
| Hardcoded 1s loading delay | Driver iOS | ProgressView + disabled |
| Missing onDisappear | Driver iOS | Added stopRefreshTimer() |
| @StateObject with singleton | Driver iOS | Changed to @ObservedObject |
| Silent tracking failures | Customer iOS | Track + warning after 3 |
| WebSocket uses print() | Backend | Changed to logger.error() |
| showSuccess not reset | Driver iOS | Reset after dismiss |
| Missing cancelRideRequest() | API | Added method |
| Missing ride history API | API | Added getCustomerRideRequests() |
| Missing updateBid() | API | Added method |

---

**Document Version:** 1.0
**Commits:** `037fc4a2`, `1a41d8ba`, `6f4ed24d`
