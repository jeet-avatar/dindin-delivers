# Dollor.ai Platform - 100 Complex Use Cases

> **Reference**: Based on AUDIT_PRODUCTION.md and CLAUDE_PRODUCTION.md
> **Generated**: 2026-01-09
> **Purpose**: Comprehensive testing, development, and QA scenarios

---

## CATEGORY 1: AUTHENTICATION & SECURITY (UC-001 to UC-015)

### UC-001: Distributed Rate Limiting - Brute Force Attack
**Scenario**: Attacker attempts login brute force across multiple ECS containers
**Preconditions**: User account exists, attacker has email
**Steps**:
1. Attacker sends 5 login attempts to Container A
2. Attacker sends 5 more attempts to Container B (different instance)
3. System should recognize cumulative attempts via PostgreSQL
4. 6th attempt should be blocked regardless of container
**Expected**: Rate limit enforced globally (5 attempts/minute), attacker blocked
**Files**: `main_new.py` (DistributedRateLimiter), `models.py` (RateLimitEntry)

### UC-002: JWT Token Refresh During Active Order Tracking
**Scenario**: Customer's JWT expires while tracking live delivery
**Preconditions**: Customer logged in, order in OUT_FOR_DELIVERY status
**Steps**:
1. Customer opens OrderTrackingView
2. JWT expires after 15 minutes
3. WebSocket connection attempts reconnect
4. TokenRefreshInterceptor silently refreshes token
5. Tracking continues without interruption
**Expected**: Seamless token refresh, no user interruption
**Files**: `TokenRefreshInterceptor.kt`, `P2PAPIService.swift`

### UC-003: Concurrent Login Across iOS and Android
**Scenario**: Same customer logs in on iPhone and Android simultaneously
**Preconditions**: Customer account active
**Steps**:
1. Customer logs in on iOS Customer App
2. Customer logs in on Android Customer App (same account)
3. Both sessions should remain active
4. Order placed on Android should reflect on iOS
**Expected**: Multi-device sessions supported, data synced
**Files**: `AuthViewModel.swift`, `auth/LoginScreen.kt`

### UC-004: Password Reset Rate Limit Exhaustion
**Scenario**: User forgets password and exceeds reset attempts
**Preconditions**: Valid customer email
**Steps**:
1. User requests password reset (attempt 1/3)
2. User requests again (attempt 2/3)
3. User requests again (attempt 3/3)
4. User attempts 4th reset within 5 minutes
5. System blocks request with rate limit message
6. After 5 minutes, user can request again
**Expected**: 3 attempts per 5 minutes enforced, clear error message
**Files**: `main_new.py`, `email_service.py`

### UC-005: Google Sign-In Token Validation Failure
**Scenario**: Google OAuth token is expired or invalid
**Preconditions**: User attempts Google Sign-In
**Steps**:
1. User clicks "Sign in with Google"
2. Google returns token
3. Backend validates token with Google API
4. Token validation fails (expired/invalid)
5. System prompts user to re-authenticate
**Expected**: Graceful error handling, no account creation with invalid token
**Files**: `GoogleSignInHelper.kt`, `/api/auth/customer/google`

### UC-006: Apple Sign-In First-Time Registration
**Scenario**: New user registers via Apple Sign-In (email hidden)
**Preconditions**: User has Apple ID with private email relay
**Steps**:
1. User clicks "Sign in with Apple"
2. Apple returns private relay email (xxx@privaterelay.appleid.com)
3. System creates customer account with relay email
4. Welcome email sent to relay address
5. User can update profile with real email later
**Expected**: Account created, relay email works for communications
**Files**: `/api/auth/customer/apple-auth`, `email_service.py`

### UC-007: Session Hijacking Prevention
**Scenario**: Attacker obtains valid JWT token
**Preconditions**: Stolen JWT token
**Steps**:
1. Attacker uses token from different IP/device
2. System logs suspicious activity
3. Original user performs action
4. System detects concurrent usage anomaly
**Expected**: Security logging, potential session invalidation
**Files**: `main_new.py`, JWT validation middleware

### UC-008: Vendor Document Upload with Malicious File
**Scenario**: Vendor attempts to upload malicious file as business license
**Preconditions**: Vendor account in PENDING status
**Steps**:
1. Vendor navigates to document upload
2. Vendor selects .exe file renamed to .pdf
3. System validates file MIME type
4. Upload rejected with security warning
**Expected**: File type validation prevents malicious uploads
**Files**: `s3_service.py`, `verification_routes.py`

### UC-009: Driver Background Check Integration Failure
**Scenario**: Persona API returns error during background check
**Preconditions**: Driver submitted documents
**Steps**:
1. Admin triggers background check
2. Persona API returns 500 error
3. System retries with exponential backoff
4. After 3 failures, marks check as PENDING_MANUAL_REVIEW
5. Admin notified via email
**Expected**: Graceful degradation, manual review fallback
**Files**: `verification_routes.py`, `persona_inquiry_id` field

### UC-010: Multi-Factor Authentication for Admin Portal
**Scenario**: Admin attempts to access sensitive accounting data
**Preconditions**: Admin account exists
**Steps**:
1. Admin logs into web portal
2. Admin navigates to /admin/accounting
3. System requires additional verification
4. Admin enters OTP from authenticator app
5. Access granted to sensitive data
**Expected**: MFA enforced for sensitive operations
**Files**: `frontend/src/app/screens/accounting/`

### UC-011: Rate Limit Cleanup Under High Load
**Scenario**: Probabilistic cleanup runs during traffic spike
**Preconditions**: 10,000+ rate limit entries in database
**Steps**:
1. Traffic spike causes many rate limit entries
2. Cleanup triggers probabilistically (1% chance per request)
3. Old entries (>1 hour) deleted in batches
4. No performance degradation during cleanup
**Expected**: Table stays manageable, queries remain fast
**Files**: `DistributedRateLimiter`, `RateLimitEntry`

### UC-012: Cross-Site Request Forgery Prevention
**Scenario**: Malicious site attempts to place order on behalf of user
**Preconditions**: User logged into Dollor.ai in another tab
**Steps**:
1. User visits malicious site
2. Site attempts POST to /api/orders with user's cookies
3. CORS policy blocks cross-origin request
4. Order not created
**Expected**: CORS prevents unauthorized cross-origin requests
**Files**: `main_new.py` CORS configuration

### UC-013: SQL Injection Attempt on Search
**Scenario**: Attacker attempts SQL injection via restaurant search
**Preconditions**: None
**Steps**:
1. Attacker searches for: `'; DROP TABLE vendors; --`
2. SQLAlchemy ORM parameterizes query
3. Search returns no results (literal string match)
4. Database intact
**Expected**: Parameterized queries prevent SQL injection
**Files**: `main_new.py`, SQLAlchemy queries

### UC-014: Expired Stripe Webhook Signature
**Scenario**: Webhook arrives with expired timestamp
**Preconditions**: Stripe webhook configured
**Steps**:
1. Network delay causes webhook to arrive 10 minutes late
2. Stripe signature validation fails (timestamp tolerance exceeded)
3. Webhook rejected with 400 status
4. Stripe retries with fresh signature
**Expected**: Replay attacks prevented, legitimate retries succeed
**Files**: `stripe_integration.py`

### UC-015: Database Connection Pool Exhaustion
**Scenario**: Spike in traffic exhausts database connections
**Preconditions**: Connection pool size = 20
**Steps**:
1. 50 concurrent requests hit API
2. 20 get connections, 30 wait in queue
3. Queue timeout (30s) expires for some
4. 503 Service Unavailable returned
5. Auto-scaling triggers new containers
**Expected**: Graceful degradation, no crashes, auto-scaling response
**Files**: `database.py`, connection pool settings

---

## CATEGORY 2: ORDER FLOW & DELIVERY (UC-016 to UC-035)

### UC-016: Multi-Restaurant Cart Checkout
**Scenario**: Customer orders from 3 different restaurants in one checkout
**Preconditions**: Customer has items from 3 vendors in cart
**Steps**:
1. Customer adds burger from Restaurant A
2. Customer adds sushi from Restaurant B
3. Customer adds pizza from Restaurant C
4. Customer proceeds to checkout
5. System creates 3 separate orders
6. 3 separate Stripe charges ($1 platform fee each)
7. Each restaurant receives notification
**Expected**: 3 orders created, $3 total platform fee, 3 driver assignments needed
**Files**: `MultiRestaurantCartViewModel.swift`, `MultiRestaurantCheckoutScreen.kt`

### UC-017: Order Status Transition - Full Lifecycle
**Scenario**: Order goes through complete status lifecycle
**Preconditions**: Customer places order
**Steps**:
1. Order created: PENDING_PAYMENT
2. Stripe payment succeeds: CONFIRMED
3. Restaurant accepts: PENDING_RESTAURANT
4. Kitchen starts: PREPARING
5. Food ready: READY_FOR_PICKUP
6. Driver picks up: OUT_FOR_DELIVERY
7. Driver delivers: DELIVERED
**Expected**: All status transitions logged, emails sent at each step
**Files**: `order_flow.py`, `OrderStatus` enum

### UC-018: Order Cancellation After Restaurant Accepts
**Scenario**: Customer tries to cancel after restaurant started preparing
**Preconditions**: Order in PREPARING status
**Steps**:
1. Customer requests cancellation via app
2. System checks order status
3. Status is PREPARING (too late for free cancel)
4. Customer shown partial refund option (minus restaurant fee)
5. Customer confirms, partial refund issued
6. Restaurant notified of cancellation
**Expected**: Partial refund, restaurant compensated for prep work
**Files**: `/api/orders/{id}/cancel`, `send_order_cancelled_email`

### UC-019: Driver Assignment Conflict - Two Drivers Accept Simultaneously
**Scenario**: Race condition when two drivers accept same order
**Preconditions**: Order in READY_FOR_PICKUP, 2 drivers viewing it
**Steps**:
1. Driver A taps "Accept" at 12:00:00.000
2. Driver B taps "Accept" at 12:00:00.050
3. Database uses row-level locking
4. Driver A gets assignment (first to acquire lock)
5. Driver B sees "Order already assigned" message
**Expected**: Only one driver assigned, no double-assignment
**Files**: `matchmaking_routes.py`, database locking

### UC-020: Scheduled Delivery for Future Time
**Scenario**: Customer schedules order for 2 hours in future
**Preconditions**: Restaurant supports scheduled orders
**Steps**:
1. Customer selects "Schedule for later"
2. Customer picks time 2 hours ahead
3. Order created with scheduled_for timestamp
4. Restaurant notified immediately
5. Driver matching delayed until 30 min before scheduled time
6. Delivery arrives at scheduled time
**Expected**: Order held until appropriate time, driver matched optimally
**Files**: `ScheduleDeliveryScreen.kt`, `scheduled_for` field

### UC-021: Restaurant Temporarily Closes Mid-Order
**Scenario**: Restaurant goes offline while order is being prepared
**Preconditions**: Order in PREPARING status
**Steps**:
1. Restaurant app crashes or loses connectivity
2. Restaurant marked offline after 10 minutes
3. Order stuck in PREPARING
4. System alerts admin after 30 minutes
5. Admin contacts restaurant or cancels with full refund
**Expected**: Stuck orders detected, customer protected
**Files**: `is_online` field, monitoring alerts

### UC-022: Driver Navigation to Wrong Address
**Scenario**: GPS leads driver to incorrect location
**Preconditions**: Order OUT_FOR_DELIVERY
**Steps**:
1. Driver follows GPS to delivery address
2. Driver arrives but address doesn't match
3. Driver uses in-app chat to contact customer
4. Customer provides corrected directions
5. Driver updates delivery location
6. Delivery completed successfully
**Expected**: Chat enables real-time coordination
**Files**: `ChatService.swift`, `DriverChatScreen.kt`

### UC-023: Payment Failure During Checkout
**Scenario**: Stripe payment fails after order creation
**Preconditions**: Customer at checkout
**Steps**:
1. Customer submits order
2. Order created in PENDING_PAYMENT status
3. Stripe charge attempt fails (insufficient funds)
4. Order remains in PENDING_PAYMENT
5. Customer prompted to try different card
6. After 30 minutes, order auto-cancelled
**Expected**: Failed payments don't create confirmed orders
**Files**: `stripe_integration.py`, `StripePaymentLog`

### UC-024: Tip Adjustment After Delivery
**Scenario**: Customer wants to increase tip after excellent service
**Preconditions**: Order DELIVERED, initial tip $3
**Steps**:
1. Customer rates driver 5 stars
2. Customer taps "Adjust tip"
3. Customer increases tip from $3 to $10
4. Additional $7 charged to customer's card
5. Driver receives notification of tip increase
6. Driver payout updated
**Expected**: Tips can be increased post-delivery
**Files**: `TipDriverScreen.kt`, driver payout calculation

### UC-025: Restaurant Rejects Order Due to Out-of-Stock
**Scenario**: Restaurant can't fulfill order due to missing ingredient
**Preconditions**: Order in PENDING_RESTAURANT status
**Steps**:
1. Restaurant receives order notification
2. Restaurant checks inventory - key item out of stock
3. Restaurant rejects order with reason "Item unavailable"
4. Customer notified immediately
5. Full refund issued automatically
6. Customer prompted to reorder with different items
**Expected**: Quick rejection, full refund, good UX
**Files**: `OrdersViewModel.swift`, order rejection flow

### UC-026: Delivery to Gated Community
**Scenario**: Driver can't access gated community
**Preconditions**: Order OUT_FOR_DELIVERY
**Steps**:
1. Driver arrives at gate
2. Gate requires access code not provided
3. Driver uses app to call customer
4. Customer provides gate code via call
5. Driver enters, completes delivery
6. Gate code saved to customer's address for future orders
**Expected**: Call feature resolves access issues
**Files**: `CallService.swift`, address metadata

### UC-027: Order Split Between Two Drivers
**Scenario**: Large catering order requires multiple drivers
**Preconditions**: Order contains 50+ items from one restaurant
**Steps**:
1. Restaurant marks order as "Large - requires 2 drivers"
2. System creates 2 delivery assignments
3. Driver A picks up half the items
4. Driver B picks up other half
5. Both drivers deliver to same address
6. Order marked DELIVERED when both complete
**Expected**: Large orders properly split, coordinated delivery
**Files**: Order splitting logic, driver matching

### UC-028: Real-Time Order Tracking WebSocket Disconnect
**Scenario**: Customer loses internet during delivery tracking
**Preconditions**: Order OUT_FOR_DELIVERY, customer tracking
**Steps**:
1. Customer watching live tracking on DeliveryTrackingView
2. Phone enters tunnel, loses connectivity
3. WebSocket disconnects
4. Phone exits tunnel, regains connectivity
5. WebSocket auto-reconnects
6. Tracking resumes with current driver location
**Expected**: Automatic reconnection, no data loss
**Files**: `websocket_server.py`, `DeliveryTrackingView.swift`

### UC-029: Refund for Missing Item
**Scenario**: Order arrives but one item is missing
**Preconditions**: Order DELIVERED
**Steps**:
1. Customer opens order in app
2. Customer reports "Missing item: Large Fries"
3. Support ticket created automatically
4. AI Employee reviews order and receipt
5. Partial refund issued for missing item
6. Restaurant notified of issue
**Expected**: Quick resolution, partial refund, vendor feedback
**Files**: `SupportTicket` model, `AIEmployee` processing

### UC-030: Promotion Code with Minimum Order
**Scenario**: Customer applies promo code that requires $25 minimum
**Preconditions**: Cart total $20, promo code "SAVE10" (10% off, $25 min)
**Steps**:
1. Customer applies code "SAVE10"
2. System checks cart total ($20) < minimum ($25)
3. Error shown: "Add $5 more to use this code"
4. Customer adds items, total now $27
5. Code applied successfully, $2.70 discount
**Expected**: Clear minimum requirement messaging
**Files**: `promotions.py`, `PromotionRedemption`

### UC-031: Driver Earnings Calculation with Multiple Orders
**Scenario**: Driver completes 5 deliveries in one shift
**Preconditions**: Driver online for 4 hours
**Steps**:
1. Order 1: $8 delivery fee + $3 tip = $11
2. Order 2: $6 delivery fee + $5 tip = $11
3. Order 3: $10 delivery fee + $0 tip = $10
4. Order 4: $7 delivery fee + $4 tip = $11
5. Order 5: $9 delivery fee + $6 tip = $15
6. Total earnings: $58 (driver keeps 100%)
7. Platform fee: $5 (already charged to customers)
**Expected**: Driver gets 100% of delivery fees + tips
**Files**: `EarningsViewModel.swift`, `DriverEarnings.kt`

### UC-032: Order Handoff Between Drivers
**Scenario**: Original driver has emergency, order reassigned
**Preconditions**: Order OUT_FOR_DELIVERY
**Steps**:
1. Driver A reports emergency via app
2. Order status reverts to READY_FOR_PICKUP
3. Driver A marked as unavailable
4. New driver matching initiated
5. Driver B accepts order
6. Customer notified of driver change
7. Delivery completed by Driver B
**Expected**: Smooth handoff, customer informed
**Files**: Driver assignment logic, notifications

### UC-033: Restaurant Menu Update During Active Order
**Scenario**: Restaurant updates price while order is pending
**Preconditions**: Order in PENDING_RESTAURANT
**Steps**:
1. Customer ordered item at $12
2. Restaurant updates price to $15 in menu
3. Existing order retains $12 price
4. New orders show $15 price
5. Order completes at original $12 price
**Expected**: Price locked at order time
**Files**: `Order` model, price snapshot

### UC-034: Delivery Address Change After Order Placed
**Scenario**: Customer realizes wrong address selected
**Preconditions**: Order in CONFIRMED status (not yet picked up)
**Steps**:
1. Customer taps "Change delivery address"
2. System checks order status - allowed before pickup
3. Customer selects new address (same delivery zone)
4. Address updated, driver notified
5. If new address outside zone, additional fee shown
**Expected**: Address change allowed before pickup, fees adjusted
**Files**: Address change endpoint, delivery zone calculation

### UC-035: Contactless Delivery Request
**Scenario**: Customer requests contactless delivery
**Preconditions**: Order placed
**Steps**:
1. Customer enables "Leave at door" option
2. Instructions saved: "Leave at door, ring doorbell"
3. Driver sees contactless instructions
4. Driver places order at door
5. Driver takes photo as proof of delivery
6. Driver marks DELIVERED
7. Customer notified with photo
**Expected**: Photo proof for contactless deliveries
**Files**: Delivery instructions, photo upload to S3

---

## CATEGORY 3: RIDESHARE & BIDDING (UC-036 to UC-055)

### UC-036: Rideshare Bid Submission with Counter-Offer
**Scenario**: Driver submits bid, rider counter-offers
**Preconditions**: Ride request created (RR-20260109-001)
**Steps**:
1. Rider requests ride, estimated fare $45
2. Driver A bids $40
3. Driver B bids $38
4. Rider counter-offers Driver A: $35
5. Driver A accepts counter-offer
6. Ride matched at $35
7. Platform fee: $2 (fare $35-70 tier)
**Expected**: Negotiation flow works, correct tier fee applied
**Files**: `bid_routes.py`, `NegotiationService.swift`

### UC-037: Multiple Bids Comparison
**Scenario**: Rider receives 5 bids for a ride
**Preconditions**: Ride request active
**Steps**:
1. Driver A: $42, 4.8 rating, 3 min away
2. Driver B: $38, 4.5 rating, 8 min away
3. Driver C: $45, 4.9 rating, 2 min away
4. Driver D: $40, 4.2 rating, 5 min away
5. Driver E: $39, 4.7 rating, 4 min away
6. Rider compares bids on price, rating, ETA
7. Rider accepts Driver C (best rating, closest)
**Expected**: All bids visible, clear comparison UI
**Files**: `RideRequestView.swift`, `AvailableRideRequestsView.swift`

### UC-038: Bid Expiration and Withdrawal
**Scenario**: Bid expires before rider responds
**Preconditions**: Driver submitted bid
**Steps**:
1. Driver submits bid with 10-minute expiry
2. 10 minutes pass, no rider response
3. Bid automatically marked EXPIRED
4. Driver notified bid expired
5. Driver can submit new bid if still interested
**Expected**: Bids auto-expire, drivers can rebid
**Files**: `RideBid` model, bid expiration job

### UC-039: Ride Cancellation with Fee
**Scenario**: Rider cancels after driver is en route
**Preconditions**: Ride MATCHED, driver en route
**Steps**:
1. Rider taps "Cancel ride"
2. System shows cancellation fee ($5)
3. Rider confirms cancellation
4. Driver notified, receives cancellation fee
5. Rider charged $5
6. Ride marked CANCELLED
**Expected**: Fair compensation for driver's time
**Files**: `send_ride_cancelled_email`, cancellation fee logic

### UC-040: Driver Arrives at Wrong Pickup Location
**Scenario**: GPS inaccuracy leads to wrong location
**Preconditions**: Ride MATCHED
**Steps**:
1. Driver navigates to pickup location
2. Driver arrives but rider not visible
3. Driver uses chat to contact rider
4. Rider shares pin drop of actual location
5. Driver navigates to correct location
6. Pickup completed
**Expected**: In-app communication resolves location issues
**Files**: `RiderChatView.swift`, location sharing

### UC-041: Long-Distance Ride Pricing
**Scenario**: Rider requests 100-mile ride
**Preconditions**: None
**Steps**:
1. Rider enters pickup and destination (100 miles apart)
2. System estimates fare: $150
3. Platform fee calculated: $3 (>$70 tier)
4. Driver bids $140
5. Rider accepts
6. Ride completed, driver receives $137 + tips
**Expected**: Correct tier pricing for long rides
**Files**: Tiered pricing logic, fare calculation

### UC-042: Ride Request During Surge (High Demand)
**Scenario**: Many ride requests, few available drivers
**Preconditions**: Friday night, 10 PM
**Steps**:
1. 50 ride requests in area
2. Only 10 drivers online
3. Drivers see high-demand indicator
4. Drivers bid higher due to demand
5. Riders see "High demand - expect higher bids"
6. Market-driven pricing through bidding
**Expected**: Supply/demand reflected in bids
**Files**: Demand indicators, driver notifications

### UC-043: Rider No-Show After Driver Arrives
**Scenario**: Rider doesn't appear at pickup location
**Preconditions**: Ride MATCHED, driver at pickup
**Steps**:
1. Driver arrives and marks "Arrived"
2. 5-minute wait timer starts
3. Driver calls rider - no answer
4. Timer expires
5. Driver marks "Rider no-show"
6. Rider charged no-show fee ($5)
7. Driver receives compensation
**Expected**: Drivers protected from no-shows
**Files**: No-show handling, wait timer

### UC-044: Ride Route Change Mid-Trip
**Scenario**: Rider wants to add a stop during ride
**Preconditions**: Ride in progress
**Steps**:
1. Ride started to destination A
2. Rider requests additional stop at location B
3. Driver accepts route change
4. New fare calculated (original + additional distance)
5. Rider shown updated fare
6. Rider confirms, ride continues
**Expected**: Dynamic route changes with fare adjustment
**Files**: Route change endpoint, fare recalculation

### UC-045: Driver Vehicle Change
**Scenario**: Driver switches from sedan to SUV
**Preconditions**: Driver has multiple registered vehicles
**Steps**:
1. Driver goes offline
2. Driver selects different vehicle in profile
3. System validates new vehicle documents
4. Driver goes online with SUV
5. Bids now show "SUV" vehicle type
6. Riders can filter for SUV rides
**Expected**: Vehicle flexibility for drivers
**Files**: Driver vehicle management

### UC-046: Shared Ride Request (Carpool)
**Scenario**: Two riders heading same direction
**Preconditions**: Ride matching enabled for route
**Steps**:
1. Rider A requests ride from A to C
2. Rider B requests ride from B to C (same direction)
3. System identifies match opportunity
4. Both riders offered shared ride discount (30% off)
5. Both accept, driver picks up sequentially
6. Each rider pays reduced fare
**Expected**: Cost savings for shared rides
**Files**: Ride matching algorithm

### UC-047: Driver Rating Drops Below Threshold
**Scenario**: Driver's rating falls to 4.0 (threshold 4.2)
**Preconditions**: Driver has completed 100+ rides
**Steps**:
1. Driver receives 3-star rating
2. Average drops to 4.0
3. System sends warning notification
4. Driver given 2 weeks to improve
5. If not improved, driver deactivated
6. Appeals process available
**Expected**: Quality enforcement with fair warning
**Files**: Rating calculation, driver status management

### UC-048: Ride Payment with Saved Card Decline
**Scenario**: Rider's saved card declined at ride end
**Preconditions**: Ride completed
**Steps**:
1. Ride ends, system charges saved card
2. Card declined (expired)
3. Rider prompted to update payment method
4. Rider has 24 hours to pay
5. If unpaid, account restricted
6. Driver still paid from platform escrow
**Expected**: Drivers always paid, riders accountable
**Files**: Payment failure handling

### UC-049: Accessibility Ride Request
**Scenario**: Rider needs wheelchair-accessible vehicle
**Preconditions**: WAV drivers available
**Steps**:
1. Rider selects "Wheelchair accessible" option
2. Only WAV-certified drivers see request
3. Driver with accessible vehicle bids
4. Rider accepts
5. Driver confirms vehicle has ramp
6. Ride completed with accessibility support
**Expected**: Accessibility needs matched properly
**Files**: Vehicle type filters, accessibility flags

### UC-050: International Phone Number for Ride
**Scenario**: Tourist uses international phone number
**Preconditions**: User from another country
**Steps**:
1. Tourist downloads app
2. Enters international phone (+44 xxx)
3. SMS verification sent internationally
4. Tourist verifies and creates account
5. Tourist can request rides
6. Driver sees local contact format
**Expected**: International phone support
**Files**: Phone validation, SMS service

### UC-051: Ride Request Cancel Before Any Bids
**Scenario**: Rider cancels immediately after requesting
**Preconditions**: Just created ride request
**Steps**:
1. Rider submits ride request
2. 30 seconds pass, no bids yet
3. Rider cancels request
4. No cancellation fee (no driver affected)
5. Request marked CANCELLED
**Expected**: Free cancellation if no driver committed
**Files**: Cancellation policy logic

### UC-052: Driver Cash-Out Request
**Scenario**: Driver wants instant earnings transfer
**Preconditions**: Driver has $150 available balance
**Steps**:
1. Driver opens earnings screen
2. Driver taps "Cash out now"
3. System initiates instant transfer via Stripe
4. Driver's bank account credited within minutes
5. Balance updated to $0
6. Transaction logged
**Expected**: Instant payouts work correctly
**Files**: `DriverPayout`, Stripe Connect

### UC-053: Ride Dispute - Fare Disagreement
**Scenario**: Rider disputes charged fare vs quoted fare
**Preconditions**: Ride completed, charged $52, bid was $45
**Steps**:
1. Rider sees charge $52, expected $45
2. Rider opens dispute
3. System checks: route change added $7
4. Detailed breakdown shown to rider
5. Rider accepts explanation
6. Dispute resolved
**Expected**: Transparent fare breakdowns
**Files**: Fare calculation audit trail

### UC-054: Driver Background Check Expiration
**Scenario**: Driver's background check expires (annual renewal)
**Preconditions**: Background check older than 1 year
**Steps**:
1. System flags expiring background checks (30 days warning)
2. Driver notified to renew
3. If not renewed by expiration, driver goes offline
4. Driver submits new background check
5. Once approved, driver can go online again
**Expected**: Compliance maintained automatically
**Files**: Background check expiration job

### UC-055: Rideshare During Major Event
**Scenario**: Concert ends, 5000 people need rides
**Preconditions**: Large venue, event ending
**Steps**:
1. System detects surge of requests from one area
2. Push notification sent to nearby offline drivers
3. "High demand at Venue X" alert
4. More drivers come online
5. Bidding reflects high demand
6. All riders eventually matched
**Expected**: Dynamic driver recruitment for events
**Files**: Demand detection, push notifications

---

## CATEGORY 4: VENDOR/RESTAURANT OPERATIONS (UC-056 to UC-070)

### UC-056: New Vendor Onboarding - Complete Flow
**Scenario**: Restaurant owner registers and gets approved
**Preconditions**: None
**Steps**:
1. Owner downloads Restaurant App
2. Completes registration with business details
3. Uploads: business license, health permit, W9, food handler cert
4. Submits application (status: PENDING)
5. Admin reviews documents
6. Documents verified (status: IN_REVIEW)
7. Admin approves (status: APPROVED)
8. Welcome email sent, vendor can publish menu
**Expected**: Full onboarding tracked, emails at each stage
**Files**: `VendorStatus` enum, `send_vendor_approval_email`

### UC-057: Menu Item Availability Toggle
**Scenario**: Restaurant runs out of popular item
**Preconditions**: Menu published with items
**Steps**:
1. Restaurant notices chicken wings sold out
2. Manager opens Menu screen in app
3. Toggles "Chicken Wings" to unavailable
4. Item immediately hidden from customer apps
5. Item restored when back in stock
**Expected**: Real-time menu availability updates
**Files**: `is_available` field, `RestaurantMenuViewModel.swift`

### UC-058: Dynamic Pricing - Happy Hour
**Scenario**: Restaurant offers 20% off during 3-5 PM
**Preconditions**: Restaurant on platform
**Steps**:
1. Restaurant creates promotion: "Happy Hour"
2. Sets 20% discount, 3 PM - 5 PM daily
3. Customer browses at 4 PM
4. Menu shows discounted prices
5. Order placed with discount applied
6. Restaurant revenue reflects promotion
**Expected**: Time-based promotions work automatically
**Files**: `promotions.py`, `Promotion` model

### UC-059: Vendor Payout Calculation
**Scenario**: Weekly payout to restaurant
**Preconditions**: Restaurant completed 50 orders this week
**Steps**:
1. Week ends, payout job runs
2. Calculate: Total order value - $1 per order platform fee
3. 50 orders × ($25 avg - $1) = $1,200 payout
4. Stripe transfer initiated to restaurant's bank
5. Payout email sent with breakdown
6. VendorPayout record created
**Expected**: Accurate weekly payouts, clear breakdown
**Files**: `VendorPayout`, payout calculation

### UC-060: Restaurant Temporarily Pauses Orders
**Scenario**: Kitchen overwhelmed, needs to pause
**Preconditions**: Restaurant receiving orders
**Steps**:
1. Kitchen backed up with 15 active orders
2. Manager taps "Pause new orders"
3. Restaurant hidden from customer search
4. Existing orders continue processing
5. After 30 minutes, manager resumes
6. Restaurant visible again
**Expected**: Temporary pause without affecting active orders
**Files**: `is_published` toggle, order queue

### UC-061: Menu Category Reorganization
**Scenario**: Restaurant restructures menu categories
**Preconditions**: Existing menu with 5 categories
**Steps**:
1. Manager opens Menu management
2. Renames "Starters" to "Appetizers"
3. Moves 3 items from "Mains" to new "Specials" category
4. Deletes empty "Seasonal" category
5. Changes reflected in customer apps
**Expected**: Flexible menu organization
**Files**: `EnhancedMenuView.swift`, menu management APIs

### UC-062: Vendor Document Expiration Warning
**Scenario**: Health permit expires in 30 days
**Preconditions**: Document uploaded 11 months ago
**Steps**:
1. System scans for expiring documents daily
2. Finds health permit expiring in 30 days
3. Email sent to vendor with renewal reminder
4. Dashboard shows expiration warning
5. If not renewed, vendor suspended at expiration
**Expected**: Proactive compliance management
**Files**: Document expiration scanning, notifications

### UC-063: Restaurant Analytics - Peak Hours
**Scenario**: Restaurant analyzes order patterns
**Preconditions**: 1000+ orders completed
**Steps**:
1. Owner opens Analytics screen
2. Views "Orders by Hour" chart
3. Identifies peak: 6-8 PM (40% of orders)
4. Views "Popular Items" list
5. Sees average order value trend
6. Uses insights for staffing decisions
**Expected**: Actionable analytics dashboard
**Files**: `AnalyticsViewModel.swift`, `VendorAnalytics`

### UC-064: Multi-Location Restaurant Chain
**Scenario**: Chain with 5 locations manages all from one account
**Preconditions**: Enterprise vendor account
**Steps**:
1. Chain admin logs into web portal
2. Views all 5 locations on dashboard
3. Updates menu item price across all locations
4. Views consolidated analytics
5. Manages payouts per location
**Expected**: Multi-location management support
**Files**: Vendor hierarchy, location management

### UC-065: Restaurant Receives High-Value Catering Order
**Scenario**: $500 catering order comes in
**Preconditions**: Restaurant accepts large orders
**Steps**:
1. Customer places $500 catering order
2. Restaurant receives special notification "Large order!"
3. Restaurant confirms capacity
4. Restaurant accepts order
5. Additional prep time factored into ready time
6. Delivery coordinated with 2 drivers
**Expected**: Large orders handled appropriately
**Files**: Large order handling, driver assignment

### UC-066: Vendor Tax Document Generation
**Scenario**: Year-end tax document needed
**Preconditions**: Vendor earned $50,000+ in year
**Steps**:
1. January arrives, tax period begins
2. System generates 1099-K for vendor
3. Document available in vendor portal
4. Email notification sent
5. Vendor downloads for tax filing
**Expected**: Automated tax document generation
**Files**: Tax reporting, document generation

### UC-067: Restaurant Menu Import from PDF
**Scenario**: New restaurant wants to import existing menu
**Preconditions**: Restaurant has PDF menu
**Steps**:
1. Vendor uploads PDF menu
2. AI Employee parses menu items
3. Extracted items shown for review
4. Vendor corrects any errors
5. Items imported to platform menu
6. Vendor adds photos manually
**Expected**: Streamlined menu onboarding
**Files**: `AIEmployee`, menu parsing

### UC-068: Special Instructions Handling
**Scenario**: Customer has complex dietary requirements
**Preconditions**: Order placed
**Steps**:
1. Customer adds note: "No onions, extra sauce, gluten-free bun"
2. Instructions attached to order
3. Restaurant sees prominently displayed instructions
4. Kitchen follows special instructions
5. Order packed with instruction label
6. Driver delivers, customer confirms correctness
**Expected**: Special instructions clearly communicated
**Files**: Order special instructions field

### UC-069: Restaurant Responds to Review
**Scenario**: Restaurant receives 2-star review
**Preconditions**: Customer left negative review
**Steps**:
1. Customer leaves review: "Order was cold"
2. Restaurant receives notification
3. Manager writes response apologizing
4. Offers discount code for next order
5. Response visible under review
6. Customer receives notification of response
**Expected**: Two-way review communication
**Files**: Review system, vendor responses

### UC-070: Menu Photo Guidelines Enforcement
**Scenario**: Vendor uploads low-quality food photo
**Preconditions**: Vendor adding menu item
**Steps**:
1. Vendor uploads blurry 200x200 photo
2. System checks image quality
3. Warning: "Photo resolution too low (min 800x600)"
4. Vendor uploads better photo
5. Photo accepted, item published
**Expected**: Quality standards for menu photos
**Files**: Image validation, S3 upload

---

## CATEGORY 5: DRIVER OPERATIONS (UC-071 to UC-085)

### UC-071: Driver Onboarding - Document Verification
**Scenario**: New driver submits all required documents
**Preconditions**: None
**Steps**:
1. Driver downloads Driver App
2. Registers with personal info
3. Uploads: driver's license, insurance, vehicle registration
4. Submits for verification
5. Persona background check initiated
6. Documents reviewed by AI + manual
7. Driver approved, can go online
**Expected**: Thorough verification process
**Files**: `verification_routes.py`, driver onboarding

### UC-072: Driver Goes Online/Offline
**Scenario**: Driver starts and ends shift
**Preconditions**: Approved driver
**Steps**:
1. Driver opens app at 11 AM
2. Taps "Go Online"
3. Location sharing enabled
4. Driver visible to order matching
5. Completes 5 deliveries over 4 hours
6. Driver taps "Go Offline" at 3 PM
7. Session logged for analytics
**Expected**: Accurate shift tracking
**Files**: `DriverSession`, `is_online` field

### UC-073: Driver Declines Order with Reason
**Scenario**: Driver can't accept specific order
**Preconditions**: Order offered to driver
**Steps**:
1. Driver receives order notification
2. Order is 15 miles away (too far)
3. Driver taps "Decline"
4. Selects reason: "Too far"
5. Order offered to next driver
6. Decline logged for analytics
**Expected**: Decline reasons tracked for optimization
**Files**: Order matching, decline analytics

### UC-074: Driver Navigation Integration
**Scenario**: Driver uses in-app navigation
**Preconditions**: Order accepted
**Steps**:
1. Driver accepts order
2. Taps "Navigate to restaurant"
3. App opens Google Maps with destination
4. Driver picks up order
5. Taps "Navigate to customer"
6. Delivers successfully
**Expected**: Seamless navigation handoff
**Files**: `GoogleMapsService.swift`, navigation intents

### UC-075: Driver Emergency SOS
**Scenario**: Driver feels unsafe during delivery
**Preconditions**: Order in progress
**Steps**:
1. Driver encounters threatening situation
2. Driver taps emergency SOS button
3. Location shared with emergency contacts
4. Support team notified immediately
5. Option to call 911 directly
6. Incident logged for follow-up
**Expected**: Safety features work instantly
**Files**: Emergency SOS feature

### UC-076: Driver Insurance Verification
**Scenario**: Driver's insurance document needs verification
**Preconditions**: Driver uploaded insurance
**Steps**:
1. Driver uploads insurance PDF
2. AI extracts: provider, policy number, expiration
3. Manual reviewer validates
4. Insurance confirmed valid
5. Driver profile updated
6. 30-day warning before expiration
**Expected**: Insurance compliance maintained
**Files**: Document verification, expiration tracking

### UC-077: Driver Heat Map - High Demand Areas
**Scenario**: Driver seeks busy areas
**Preconditions**: Driver online
**Steps**:
1. Driver views demand heat map
2. Red zones indicate high order density
3. Driver moves to red zone area
4. Receives order within 5 minutes
5. Heat map updates in real-time
**Expected**: Drivers can find orders efficiently
**Files**: Heat map visualization, demand analytics

### UC-078: Driver Completes Multiple Stacked Orders
**Scenario**: Driver handles 3 orders simultaneously
**Preconditions**: High-efficiency driver
**Steps**:
1. Driver picks up Order A from Restaurant 1
2. Restaurant 2 nearby, Order B ready
3. Driver picks up Order B
4. Restaurant 3 on route, Order C ready
5. Driver picks up Order C
6. Delivers A, B, C in optimal route order
7. All customers within time estimates
**Expected**: Efficient order stacking
**Files**: Multi-order management, route optimization

### UC-079: Driver Rating Appeal
**Scenario**: Driver disputes unfair 1-star rating
**Preconditions**: Driver received 1-star
**Steps**:
1. Driver sees new 1-star rating
2. Believes it's unfair (delivered on time)
3. Driver submits appeal with evidence
4. Support reviews delivery data
5. Rating removed if unfair
6. Driver notified of decision
**Expected**: Fair rating dispute process
**Files**: Appeal system, rating management

### UC-080: Driver Vehicle Inspection Due
**Scenario**: Annual vehicle inspection required
**Preconditions**: Inspection older than 1 year
**Steps**:
1. System flags upcoming inspection requirement
2. Driver notified 30 days before due
3. Driver gets vehicle inspected
4. Uploads new inspection document
5. Document verified
6. Compliance updated
**Expected**: Vehicle safety compliance
**Files**: Inspection tracking, document upload

### UC-081: Driver Earnings Statement Download
**Scenario**: Driver needs earnings record for taxes
**Preconditions**: Driver has earning history
**Steps**:
1. Driver opens Earnings screen
2. Selects date range (2025 tax year)
3. Taps "Download Statement"
4. PDF generated with all trips, earnings, fees
5. Statement downloaded to device
6. Driver uses for tax filing
**Expected**: Comprehensive earnings documentation
**Files**: `EarningsViewModel.swift`, statement generation

### UC-082: Driver Location Accuracy Issue
**Scenario**: GPS shows driver in wrong location
**Preconditions**: Driver on delivery
**Steps**:
1. Customer tracking shows driver 2 miles away
2. Driver is actually at door
3. Driver rings doorbell
4. Customer checks tracking - still shows wrong
5. Driver takes photo as proof
6. GPS eventually corrects
7. Delivery confirmed via photo
**Expected**: Photo proof mitigates GPS issues
**Files**: Location tracking, photo proof

### UC-083: Driver Referral Bonus
**Scenario**: Driver refers friend who becomes active
**Preconditions**: Referral program active
**Steps**:
1. Driver A shares referral code with friend
2. Friend (Driver B) signs up with code
3. Driver B completes 25 deliveries
4. Driver A receives $100 referral bonus
5. Driver B receives $50 new driver bonus
6. Both notified of bonus
**Expected**: Referral bonuses paid correctly
**Files**: Referral tracking, bonus payouts

### UC-084: Driver Batch Order from Same Restaurant
**Scenario**: Multiple orders ready at same restaurant
**Preconditions**: 3 orders ready at one restaurant
**Steps**:
1. Restaurant has 3 orders ready simultaneously
2. System offers all 3 to nearby driver as batch
3. Driver accepts batch (higher earnings)
4. Picks up all 3 orders
5. Delivers in optimized route
6. Earns 3x delivery fees
**Expected**: Batch orders maximize efficiency
**Files**: Batch order matching

### UC-085: Driver Account Deactivation Appeal
**Scenario**: Driver deactivated for low rating
**Preconditions**: Driver rating fell below 4.2
**Steps**:
1. Driver rating at 4.0 for 2 weeks
2. Warning period expired
3. Driver deactivated
4. Driver submits appeal
5. Reviews shows pattern of unfair ratings
6. Account reinstated with warning
7. Driver improves rating
**Expected**: Fair deactivation process with appeals
**Files**: Deactivation logic, appeal handling

---

## CATEGORY 6: PLATFORM ADMINISTRATION (UC-086 to UC-100)

### UC-086: Admin Dashboard Overview
**Scenario**: Admin checks daily platform health
**Preconditions**: Admin logged in
**Steps**:
1. Admin logs into web portal
2. Views dashboard: 1,523 orders today
3. Revenue: $3,046 (platform fees)
4. Active drivers: 89
5. Active vendors: 156
6. Pending vendor approvals: 5
7. Open support tickets: 12
**Expected**: Real-time platform metrics
**Files**: `DashboardMetric`, admin dashboard

### UC-087: Vendor Approval Workflow
**Scenario**: Admin reviews and approves new vendor
**Preconditions**: Vendor application pending
**Steps**:
1. Admin sees pending vendor in queue
2. Opens application, reviews documents
3. Checks business license validity
4. Verifies health permit
5. Confirms W9 information
6. Approves vendor
7. Approval email sent automatically
**Expected**: Efficient approval workflow
**Files**: `/api/admin/vendors/{id}/approve`

### UC-088: Support Ticket Escalation
**Scenario**: Complex issue requires escalation
**Preconditions**: Ticket created by customer
**Steps**:
1. Customer submits ticket: "Charged twice for order"
2. AI Employee reviews, identifies duplicate charge
3. AI can't auto-resolve (payment issue)
4. Ticket escalated to human support
5. Human reviews Stripe logs
6. Refund issued for duplicate
7. Customer notified, ticket closed
**Expected**: AI + human support collaboration
**Files**: `SupportTicket`, `AIEmployeeActivity`

### UC-089: Platform-Wide Promotion Creation
**Scenario**: Marketing creates holiday promotion
**Preconditions**: Admin has marketing role
**Steps**:
1. Admin creates promotion "HOLIDAY20"
2. Sets: 20% off, max $10, valid Dec 20-31
3. Applies to all restaurants
4. Promotion published
5. Push notification sent to all customers
6. Usage tracked in real-time
**Expected**: Platform-wide promotions
**Files**: `Promotion`, push notifications

### UC-090: Fraud Detection Alert
**Scenario**: System detects suspicious activity
**Preconditions**: Fraud detection enabled
**Steps**:
1. Customer creates account
2. Places 10 orders in 1 hour
3. All orders to different addresses
4. All cancelled after restaurant accepts
5. System flags as potential fraud
6. Admin reviews and confirms fraud
7. Account banned, restaurants compensated
**Expected**: Proactive fraud prevention
**Files**: Fraud detection rules, ban system

### UC-091: Driver Document Bulk Review
**Scenario**: Admin reviews multiple driver documents
**Preconditions**: 20 drivers awaiting document review
**Steps**:
1. Admin opens document review queue
2. Filters by document type: "Insurance"
3. Reviews 20 insurance documents
4. Approves 18, rejects 2 (expired)
5. Rejected drivers notified to resubmit
6. Approved drivers' status updated
**Expected**: Efficient bulk document review
**Files**: Admin document review interface

### UC-092: System Health Monitoring Alert
**Scenario**: Database connection issues detected
**Preconditions**: Monitoring configured
**Steps**:
1. CloudWatch detects high DB latency
2. Alert sent to on-call engineer
3. Engineer investigates via dashboard
4. Identifies slow query pattern
5. Adds missing index
6. Latency returns to normal
7. Incident documented
**Expected**: Proactive monitoring and response
**Files**: Infrastructure monitoring, alerts

### UC-093: Feature Flag Toggle
**Scenario**: Admin enables new feature for subset of users
**Preconditions**: Feature developed but not released
**Steps**:
1. Admin opens feature flags dashboard
2. Creates flag: "new_checkout_flow"
3. Enables for 10% of customers
4. Monitors error rates and feedback
5. Gradually increases to 50%
6. No issues, enables for 100%
**Expected**: Safe feature rollouts
**Files**: Feature flag system

### UC-094: Revenue Reconciliation Report
**Scenario**: Finance needs monthly revenue breakdown
**Preconditions**: Month ended
**Steps**:
1. Admin generates January 2026 report
2. Report shows:
   - Food orders: 45,000 × $1 = $45,000
   - Rideshare fees: $12,000
   - Total platform revenue: $57,000
3. Vendor payouts: $890,000
4. Driver payouts: $210,000
5. Report exported to CSV
**Expected**: Accurate financial reporting
**Files**: Revenue reporting, accounting screens

### UC-095: User Data Export (GDPR)
**Scenario**: Customer requests data export
**Preconditions**: Customer account with history
**Steps**:
1. Customer requests data export via settings
2. System compiles: profile, orders, addresses, preferences
3. Export generated as ZIP file
4. Download link emailed to customer
5. Link expires in 7 days
6. Export logged for compliance
**Expected**: GDPR-compliant data export
**Files**: Data export functionality

### UC-096: Platform Announcement Broadcast
**Scenario**: Admin sends important announcement
**Preconditions**: System update scheduled
**Steps**:
1. Admin creates announcement
2. Title: "Scheduled Maintenance"
3. Message: "Brief downtime Saturday 2-4 AM"
4. Select audiences: Customers, Drivers, Vendors
5. Schedule for Thursday 5 PM
6. Push notifications sent to all users
**Expected**: Effective communication system
**Files**: Announcement system, push notifications

### UC-097: API Rate Limit Adjustment
**Scenario**: Partner integration needs higher limits
**Preconditions**: Enterprise partner account
**Steps**:
1. Partner requests higher API limits
2. Admin reviews partner's usage patterns
3. Current limit: 100 req/min
4. Admin increases to 500 req/min
5. Custom rate limit applied to partner's API key
6. Partner notified of change
**Expected**: Flexible rate limits for partners
**Files**: Rate limiting configuration

### UC-098: Incident Post-Mortem
**Scenario**: Production outage requires analysis
**Preconditions**: Outage occurred and resolved
**Steps**:
1. 30-minute outage affected orders
2. Team creates post-mortem document
3. Timeline: what happened, when
4. Root cause: memory leak in new deployment
5. Impact: 200 orders delayed
6. Action items: add memory monitoring
7. Post-mortem shared with stakeholders
**Expected**: Systematic incident learning
**Files**: Incident documentation

### UC-099: Vendor Performance Review
**Scenario**: Quarterly vendor quality assessment
**Preconditions**: Vendor has 90 days of data
**Steps**:
1. Admin runs vendor performance report
2. Metrics: order accuracy, prep time, rating
3. Vendor X: 92% accuracy, 18 min avg, 4.7 rating
4. Compared to platform average
5. Low performers flagged for outreach
6. High performers featured in app
**Expected**: Data-driven vendor management
**Files**: `VendorAnalytics`, performance metrics

### UC-100: Blue-Green Deployment Verification
**Scenario**: New release deployed to production
**Preconditions**: New version ready
**Steps**:
1. New version deployed to "green" environment
2. Health checks pass on green
3. 5% traffic routed to green (canary)
4. Metrics monitored for 30 minutes
5. No errors, traffic increased to 50%
6. Full cutover to green
7. Blue environment kept as rollback
8. Deployment logged with commit hash
**Expected**: Zero-downtime deployments
**Files**: ECS blue-green, ArgoCD

---

## INDEX BY COMPONENT

### Backend Files
- `main_new.py`: UC-001, UC-004, UC-012, UC-013, UC-015
- `models.py`: UC-001, UC-017, UC-059
- `email_service.py`: UC-004, UC-006, UC-056
- `bid_routes.py`: UC-036, UC-037, UC-038
- `stripe_integration.py`: UC-014, UC-023, UC-048
- `order_flow.py`: UC-017, UC-018
- `verification_routes.py`: UC-008, UC-071

### iOS Files
- `P2PAPIService.swift`: UC-002, UC-003
- `AuthViewModel.swift`: UC-003, UC-005
- `OrderTrackingViewModel.swift`: UC-002, UC-028
- `RideRequestViewModel.swift`: UC-037, UC-040
- `EarningsViewModel.swift`: UC-031, UC-081

### Android Files
- `TokenRefreshInterceptor.kt`: UC-002
- `DollorApiService.kt`: UC-003
- `RideRequestScreen.kt`: UC-037
- `EarningsScreen.kt`: UC-031, UC-081

### Infrastructure
- `database.py`: UC-015
- ECS/K8s: UC-001, UC-100
- CloudWatch: UC-092

---

*Generated: 2026-01-09*
*Based on: AUDIT_PRODUCTION.md, CLAUDE_PRODUCTION.md*
*Total Use Cases: 100*
