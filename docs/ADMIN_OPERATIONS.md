# DOLLOR.AI - ADMIN OPERATIONS & BACKEND FLOWS
## Complete Operations Manual for AI Employee Bots

> **Document Version**: 1.0
> **Last Updated**: December 16, 2025
> **Platform**: Dollor.ai (Matchmaking Service - Phase 1)

---

## OVERVIEW

This document covers all administrative operations and backend flows for the Dollor.ai platform. Each operation includes the API endpoints, decision logic, and accounting impact.

---

## 1. CUSTOMER OPERATIONS

### 1.1 Customer Registration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER REGISTRATION FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1: User submits registration                                              │
│  ├── Email validation                                                           │
│  ├── Password strength check (min 8 chars, 1 number, 1 special)                │
│  ├── Phone number validation                                                    │
│  └── Duplicate check                                                            │
│                                                                                  │
│  Step 2: Account creation                                                       │
│  ├── Create user record                                                         │
│  ├── Generate verification token                                                │
│  ├── Send verification email                                                    │
│  └── Create Stripe customer                                                     │
│                                                                                  │
│  Step 3: Email verification                                                     │
│  ├── User clicks verification link                                              │
│  ├── Token validated                                                            │
│  ├── Account activated                                                          │
│  └── Welcome email sent                                                         │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/auth/customer/register                                               │
│  POST /api/auth/verify-email                                                    │
│  POST /api/auth/customer/login                                                  │
│                                                                                  │
│  Accounting Impact: None (no transaction)                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Customer Payment Method Management

```
API Endpoints:
POST /api/customers/{id}/payment-methods     # Add payment method
GET  /api/customers/{id}/payment-methods     # List payment methods
DELETE /api/customers/{id}/payment-methods/{pm_id}  # Remove payment method

Flow:
1. Customer enters card details
2. Card tokenized via Stripe.js (PCI compliant)
3. Token sent to backend
4. Backend attaches to Stripe customer
5. Card verified with $0 auth (released immediately)

Accounting Impact: None (no transaction until order placed)
```

### 1.3 Customer Account Deletion (GDPR/CCPA)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ACCOUNT DELETION FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1: Customer requests deletion                                             │
│  ├── Verify identity (re-authenticate)                                          │
│  ├── Check for pending orders                                                   │
│  └── Check for outstanding balance                                              │
│                                                                                  │
│  Step 2: Pending items resolution                                               │
│  ├── If pending orders: Must complete or cancel first                          │
│  ├── If credits > $0: Offer to use or forfeit                                  │
│  └── If balance owed: Must pay first                                           │
│                                                                                  │
│  Step 3: Data handling                                                          │
│  ├── Delete personal data (name, email, phone, address)                        │
│  ├── Anonymize transaction history (keep for 7 years, anonymized)              │
│  ├── Delete from Stripe                                                        │
│  ├── Delete from marketing lists                                               │
│  └── Send confirmation email (to old email before deletion)                    │
│                                                                                  │
│  Step 4: Retention (legal requirement)                                          │
│  ├── Transaction records: 7 years (anonymized)                                 │
│  ├── Tax records: 7 years                                                      │
│  └── Dispute records: Until resolved + 1 year                                  │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/customers/{id}/delete-request                                        │
│  POST /api/customers/{id}/confirm-deletion                                      │
│                                                                                  │
│  Accounting Impact:                                                             │
│  - Forfeit credits: DR Customer Deposits, CR Other Income                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DRIVER OPERATIONS

### 2.1 Driver Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DRIVER ONBOARDING FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1: Application submission                                                 │
│  ├── Basic info (name, email, phone)                                           │
│  ├── Service type (delivery, rideshare, both)                                  │
│  ├── Vehicle info (make, model, year, color, plate)                            │
│  └── Consent to background check                                               │
│                                                                                  │
│  Step 2: Document upload                                                        │
│  ├── Driver's license (front and back)                                         │
│  ├── Vehicle registration                                                       │
│  ├── Insurance (rideshare only)                                                │
│  ├── Profile photo                                                              │
│  └── Vehicle photo                                                              │
│                                                                                  │
│  Step 3: Document verification (AI Bot)                                         │
│  ├── OCR extraction                                                             │
│  ├── Data validation                                                            │
│  ├── Expiration check                                                           │
│  ├── Photo quality check                                                        │
│  └── Manual review if flagged                                                   │
│                                                                                  │
│  Step 4: Background check                                                       │
│  ├── Initiate via Checkr/Sterling                                              │
│  ├── Wait for completion (24-72 hours)                                         │
│  ├── Review results                                                             │
│  └── Auto-approve if clear, manual review if issues                            │
│                                                                                  │
│  Step 5: Account activation                                                     │
│  ├── Create driver account                                                      │
│  ├── Set up Stripe Connect (payouts)                                           │
│  ├── Send welcome email                                                         │
│  └── Enable in driver app                                                       │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/drivers/apply                                                        │
│  POST /api/drivers/{id}/documents                                               │
│  GET  /api/drivers/{id}/verification-status                                     │
│  POST /api/drivers/{id}/activate                                                │
│                                                                                  │
│  Accounting Impact: None (no transaction)                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Driver Earnings & Payouts

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DRIVER EARNINGS FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Earning Types:                                                                  │
│  ├── Delivery Fee: Set by platform, paid per delivery                          │
│  ├── Ride Fare: Calculated (base + distance + time), less $1 platform fee      │
│  ├── Tips: 100% to driver                                                      │
│  ├── Bonuses: Quest completions, surge, peak hours                             │
│  └── Adjustments: Dispute resolutions, corrections                             │
│                                                                                  │
│  Payout Schedule:                                                               │
│  ├── Weekly (default): Process Monday, available Wednesday                     │
│  ├── Instant Pay: Available anytime, $0.50 fee                                 │
│  └── Minimum: $25 for weekly, $5 for instant                                   │
│                                                                                  │
│  Payout Methods:                                                                │
│  ├── Direct deposit (ACH): Free, 2-3 business days                            │
│  ├── Instant (debit card): $0.50, within minutes                              │
│  └── Check: Not offered                                                        │
│                                                                                  │
│  API Endpoints:                                                                  │
│  GET  /api/drivers/{id}/earnings                                                │
│  GET  /api/drivers/{id}/earnings/summary                                        │
│  POST /api/drivers/{id}/payout/instant                                          │
│  GET  /api/drivers/{id}/payout/history                                          │
│                                                                                  │
│  Accounting Impact:                                                             │
│  - Weekly Payout: DR A/P Drivers, CR Cash                                      │
│  - Instant Pay Fee: DR A/P Drivers $0.50, CR Other Revenue $0.50              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Driver Deactivation

```
Deactivation Reasons:
├── Safety incident (immediate)
├── Fraud detected (immediate)
├── Background check failed (immediate)
├── Low rating (< 4.2 sustained)
├── High cancellation rate (> 20%)
├── Document expired (warning first)
└── Account dormant (> 90 days)

Deactivation Flow:
1. Issue identified
2. If immediate: Deactivate, then notify
3. If warning: Notify, give 7 days to correct
4. Record reason in system
5. Disable app access
6. Final payout processed
7. Appeal process available

API Endpoints:
POST /api/drivers/{id}/deactivate
POST /api/drivers/{id}/appeal
GET  /api/drivers/{id}/deactivation-status

Accounting Impact:
- Final Payout: DR A/P Drivers, CR Cash
```

---

## 3. RESTAURANT OPERATIONS

### 3.1 Restaurant Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RESTAURANT ONBOARDING FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1: Application                                                            │
│  ├── Business info (name, address, type)                                       │
│  ├── Contact info (owner name, email, phone)                                   │
│  ├── Operating hours                                                            │
│  └── Cuisine type, price range                                                 │
│                                                                                  │
│  Step 2: Verification                                                           │
│  ├── Business license verification                                             │
│  ├── Food handler permit (where required)                                      │
│  ├── Tax ID validation                                                         │
│  └── Bank account verification                                                 │
│                                                                                  │
│  Step 3: Menu setup                                                             │
│  ├── Upload menu (photo/PDF for initial)                                       │
│  ├── Menu digitization                                                         │
│  ├── Price verification                                                        │
│  ├── Photo requirements                                                        │
│  └── Category organization                                                     │
│                                                                                  │
│  Step 4: Tablet/Integration setup                                              │
│  ├── Install restaurant app                                                    │
│  ├── Configure printer (optional)                                              │
│  ├── POS integration (if available)                                            │
│  └── Test order flow                                                           │
│                                                                                  │
│  Step 5: Go live                                                                │
│  ├── Final review                                                              │
│  ├── Enable on platform                                                        │
│  ├── Welcome email                                                             │
│  └── First order monitoring                                                    │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/restaurants/apply                                                    │
│  POST /api/restaurants/{id}/documents                                           │
│  POST /api/restaurants/{id}/menu                                                │
│  POST /api/restaurants/{id}/activate                                            │
│                                                                                  │
│  Accounting Impact: None (no transaction until first order)                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Restaurant Menu Management

```
API Endpoints:
GET  /api/restaurants/{id}/menu                    # Get full menu
POST /api/restaurants/{id}/menu/items              # Add item
PUT  /api/restaurants/{id}/menu/items/{item_id}    # Update item
DELETE /api/restaurants/{id}/menu/items/{item_id}  # Remove item
PUT  /api/restaurants/{id}/menu/items/{item_id}/availability  # Toggle availability

Menu Item Fields:
├── name (required)
├── description (required)
├── price (required)
├── category (required)
├── photo_url (recommended)
├── dietary_tags (vegan, vegetarian, gluten-free, etc.)
├── spice_level (optional)
├── customizations (options, add-ons)
├── available (boolean)
└── prep_time_minutes (default: restaurant average)

Real-time 86ing:
- Restaurant marks item unavailable
- Immediately hidden from customer app
- Active carts with item: Notify customer
```

### 3.3 Restaurant Payouts

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RESTAURANT PAYOUT FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Payout Calculation:                                                            │
│  ├── Gross Sales: Sum of order subtotals                                       │
│  ├── Less: Platform Fee ($1 per order)                                         │
│  ├── Less: Refunds (restaurant fault)                                          │
│  ├── Less: Stripe Fees (2.9% + $0.30)                                         │
│  └── Net Payout: Amount to restaurant                                          │
│                                                                                  │
│  Example Weekly Payout:                                                         │
│  ├── Gross Sales: $5,000.00                                                    │
│  ├── Orders: 100                                                               │
│  ├── Platform Fees: -$100.00                                                   │
│  ├── Refunds: -$50.00                                                          │
│  ├── Stripe Fees: -$145.30                                                     │
│  └── Net Payout: $4,704.70                                                     │
│                                                                                  │
│  Payout Schedule:                                                               │
│  ├── Weekly: Process Monday, deposit Wednesday                                 │
│  ├── Daily: Available for high-volume partners                                 │
│  └── Hold: First 2 weeks for new restaurants                                   │
│                                                                                  │
│  API Endpoints:                                                                  │
│  GET  /api/restaurants/{id}/payouts                                             │
│  GET  /api/restaurants/{id}/payouts/{payout_id}                                │
│  GET  /api/restaurants/{id}/statements                                          │
│                                                                                  │
│  Accounting Impact:                                                             │
│  - Weekly Payout: DR A/P Restaurants, CR Cash                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ORDER OPERATIONS

### 4.1 Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ORDER STATE MACHINE                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PENDING ──► CONFIRMED ──► PREPARING ──► READY ──► PICKED_UP ──► DELIVERED     │
│     │           │              │           │           │             │          │
│     │           │              │           │           │             │          │
│     └───────────┴──────────────┴───────────┴───────────┴─────────────┘          │
│                              │                                                   │
│                              ▼                                                   │
│                          CANCELLED                                               │
│                                                                                  │
│  State Transitions:                                                              │
│  ├── PENDING: Order placed, awaiting restaurant acceptance                      │
│  ├── CONFIRMED: Restaurant accepted, preparing                                  │
│  ├── PREPARING: Kitchen working on order                                        │
│  ├── READY: Food ready for pickup                                              │
│  ├── PICKED_UP: Driver has the order                                           │
│  ├── DELIVERED: Customer received order                                         │
│  └── CANCELLED: Order cancelled (any stage)                                    │
│                                                                                  │
│  Who can change state:                                                          │
│  ├── PENDING → CONFIRMED: Restaurant                                           │
│  ├── CONFIRMED → PREPARING: Restaurant (auto or manual)                        │
│  ├── PREPARING → READY: Restaurant                                             │
│  ├── READY → PICKED_UP: Driver (GPS verified at restaurant)                   │
│  ├── PICKED_UP → DELIVERED: Driver (GPS verified at customer)                 │
│  └── Any → CANCELLED: Customer (limits), Restaurant, Admin                     │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/orders                                                               │
│  GET  /api/orders/{id}                                                          │
│  PUT  /api/orders/{id}/status                                                   │
│  POST /api/orders/{id}/cancel                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Order Dispatch & Driver Assignment

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DRIVER ASSIGNMENT ALGORITHM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Matching Criteria (weighted):                                                  │
│  ├── Distance to restaurant: 40% weight                                        │
│  ├── ETA to customer: 25% weight                                               │
│  ├── Driver rating: 15% weight                                                 │
│  ├── Acceptance rate: 10% weight                                               │
│  └── Current load (orders in progress): 10% weight                             │
│                                                                                  │
│  Assignment Flow:                                                               │
│  1. Order confirmed by restaurant                                              │
│  2. Find available drivers within 5km (H3 spatial index)                       │
│  3. Score each driver using algorithm                                          │
│  4. Send offer to best match                                                   │
│  5. Driver has 30 seconds to accept                                            │
│  6. If declined/timeout: Move to next driver                                   │
│  7. If no driver after 3 attempts: Expand radius                               │
│  8. If still no driver: Notify customer, offer cancel option                   │
│                                                                                  │
│  Driver Batching (Multi-order):                                                 │
│  ├── Same restaurant: Always batch                                             │
│  ├── Different restaurants: Only if route efficient                            │
│  ├── Max orders per driver: 3                                                  │
│  └── Customer notification: Inform if batched                                  │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/orders/{id}/assign                                                   │
│  POST /api/drivers/{id}/accept-order                                            │
│  POST /api/drivers/{id}/decline-order                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Order Issues & Refunds

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ORDER ISSUE RESOLUTION                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Issue Types & Auto-Resolution:                                                 │
│                                                                                  │
│  MISSING_ITEM:                                                                  │
│  ├── Customer reports within 24 hours                                          │
│  ├── Item value < $20: Auto-refund                                            │
│  ├── Item value ≥ $20: Review required                                        │
│  ├── Accounting: DR A/P Restaurant, CR Stripe Balance                          │
│  └── Restaurant notified for improvement                                       │
│                                                                                  │
│  WRONG_ITEM:                                                                    │
│  ├── Customer reports with photo                                               │
│  ├── Auto-refund item + $3 credit                                             │
│  ├── Accounting: DR A/P Restaurant (item), DR Credits Expense ($3)            │
│  └── Restaurant notified                                                       │
│                                                                                  │
│  QUALITY_ISSUE:                                                                 │
│  ├── Cold food, damaged, etc.                                                  │
│  ├── Photo required                                                            │
│  ├── Partial refund (25-100% based on severity)                               │
│  ├── Accounting: Split between restaurant/platform based on fault             │
│  └── Investigate root cause                                                    │
│                                                                                  │
│  NEVER_DELIVERED:                                                               │
│  ├── GPS verified driver never reached customer                                │
│  ├── Full refund to customer                                                   │
│  ├── Investigate driver                                                        │
│  ├── Accounting: DR Refund Expense, CR Stripe Balance                         │
│  └── Possible driver deactivation                                              │
│                                                                                  │
│  LATE_DELIVERY:                                                                 │
│  ├── > 30 min late: $5 credit                                                  │
│  ├── > 60 min late: Full refund                                               │
│  ├── Accounting: DR Credits Expense / Refund Expense                          │
│  └── Review: Restaurant prep time or driver issue?                            │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/orders/{id}/issue                                                    │
│  GET  /api/orders/{id}/issues                                                   │
│  POST /api/orders/{id}/refund                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. RIDE OPERATIONS

### 5.1 Ride Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RIDE STATE MACHINE                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REQUESTED ──► MATCHED ──► ARRIVING ──► WAITING ──► IN_PROGRESS ──► COMPLETED  │
│       │           │            │           │             │             │        │
│       │           │            │           │             │             │        │
│       └───────────┴────────────┴───────────┴─────────────┴─────────────┘        │
│                              │                                                   │
│                              ▼                                                   │
│                          CANCELLED                                               │
│                                                                                  │
│  State Transitions:                                                              │
│  ├── REQUESTED: Rider submitted ride request                                   │
│  ├── MATCHED: Driver accepted, en route to pickup                              │
│  ├── ARRIVING: Driver within 2 min of pickup                                   │
│  ├── WAITING: Driver at pickup, waiting for rider                              │
│  ├── IN_PROGRESS: Rider in vehicle, trip started                               │
│  ├── COMPLETED: Rider dropped off, fare calculated                             │
│  └── CANCELLED: Ride cancelled (any stage)                                     │
│                                                                                  │
│  Auto-triggers:                                                                  │
│  ├── ARRIVING: GPS within 300m of pickup                                       │
│  ├── WAITING: GPS at pickup for 30 seconds                                     │
│  ├── IN_PROGRESS: Driver swipes "Start Trip"                                   │
│  └── COMPLETED: Driver swipes "End Trip" at destination                        │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/rides                                                                │
│  GET  /api/rides/{id}                                                           │
│  PUT  /api/rides/{id}/status                                                    │
│  POST /api/rides/{id}/cancel                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Fare Calculation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FARE CALCULATION (Matchmaking Model)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Base Components:                                                               │
│  ├── Base Fare: $5.00 (fixed)                                                  │
│  ├── Distance Rate: $1.50/mile                                                 │
│  ├── Time Rate: $0.175/minute                                                  │
│  └── Minimum Fare: $8.00                                                       │
│                                                                                  │
│  Surge Pricing (High Demand):                                                   │
│  ├── 1.0x: Normal (demand matches supply)                                      │
│  ├── 1.25x: Moderate demand                                                    │
│  ├── 1.5x: High demand                                                         │
│  ├── 2.0x: Very high demand                                                    │
│  └── 2.5x: Maximum surge (cap)                                                 │
│                                                                                  │
│  Platform Fee (Our Revenue):                                                    │
│  ├── Rider: $1.00 matchmaking fee                                             │
│  ├── Driver: $1.00 platform access fee                                        │
│  └── Total Platform Revenue: $2.00/ride                                        │
│                                                                                  │
│  Calculation Example:                                                           │
│  ├── Trip: 8.3 miles, 20 minutes, 1.0x surge                                  │
│  │                                                                              │
│  │   Base Fare:              $5.00                                             │
│  │   Distance (8.3 × $1.50): $12.45                                           │
│  │   Time (20 × $0.175):     $3.50                                            │
│  │   ─────────────────────────────                                             │
│  │   Subtotal:               $20.95                                            │
│  │   Platform Fee (rider):   $1.00                                             │
│  │   Tax (8%):               $1.76                                             │
│  │   ─────────────────────────────                                             │
│  │   RIDER PAYS:             $23.71                                            │
│  │                                                                              │
│  │   Driver receives:                                                          │
│  │   Fare:                   $20.95                                            │
│  │   Platform Fee (driver):  -$1.00                                            │
│  │   ─────────────────────────────                                             │
│  │   DRIVER EARNINGS:        $19.95 (+ tips)                                  │
│  │                                                                              │
│  └── Note: Driver keeps 95% of fare (vs ~75% at Uber)                         │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/rides/estimate                                                       │
│  GET  /api/rides/{id}/fare                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Ride Safety Features

```
Safety Features:
├── Share Trip: Rider can share live location with contacts
├── Emergency Button: Direct 911 call + notify Dollor safety team
├── Driver Verification: Photo/name must match before trip
├── Trip Recording: Audio recording option (consent required)
├── Route Monitoring: Deviation alerts
└── Safety Check: "Are you OK?" prompt if trip takes unusual route

API Endpoints:
POST /api/rides/{id}/share
POST /api/rides/{id}/emergency
GET  /api/rides/{id}/safety-status
```

---

## 6. SUPPORT OPERATIONS

### 6.1 Support Ticket Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SUPPORT TICKET FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Ticket Categories:                                                             │
│  ├── ORDER: Missing item, wrong item, quality, never delivered                 │
│  ├── RIDE: Driver issue, fare dispute, safety concern                          │
│  ├── ACCOUNT: Login, payment, profile                                          │
│  ├── DRIVER_SUPPORT: Earnings, documents, deactivation                         │
│  ├── RESTAURANT_SUPPORT: Menu, payouts, orders                                 │
│  └── OTHER: General inquiries                                                  │
│                                                                                  │
│  Priority Levels:                                                               │
│  ├── P1 (Immediate): Safety, fraud, active order issues                        │
│  ├── P2 (High): Refund requests, account access                                │
│  ├── P3 (Medium): General complaints, suggestions                              │
│  └── P4 (Low): Inquiries, feature requests                                     │
│                                                                                  │
│  Resolution Flow:                                                               │
│  1. Ticket created (app, email, chat)                                          │
│  2. Auto-categorize (AI)                                                       │
│  3. Auto-resolve if possible (rule-based)                                      │
│  4. If not auto-resolved: Route to appropriate bot                             │
│  5. Bot attempts resolution                                                    │
│  6. If bot can't resolve: Escalate to human                                    │
│  7. Resolution documented                                                       │
│  8. Follow-up survey                                                            │
│                                                                                  │
│  SLAs:                                                                          │
│  ├── P1: First response < 5 min, resolution < 1 hour                          │
│  ├── P2: First response < 15 min, resolution < 4 hours                        │
│  ├── P3: First response < 1 hour, resolution < 24 hours                       │
│  └── P4: First response < 4 hours, resolution < 72 hours                      │
│                                                                                  │
│  API Endpoints:                                                                  │
│  POST /api/support/tickets                                                      │
│  GET  /api/support/tickets/{id}                                                 │
│  PUT  /api/support/tickets/{id}                                                 │
│  POST /api/support/tickets/{id}/message                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Refund Authority Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    REFUND AUTHORITY LEVELS                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  AI Bot (Customer Support):                                                     │
│  ├── Single item refund ≤ $20: Auto-approve                                   │
│  ├── Full order refund ≤ $50: Auto-approve (first time customer)              │
│  ├── Credit issuance ≤ $10: Auto-approve                                      │
│  └── Total per customer per month ≤ $100: Auto-approve                        │
│                                                                                  │
│  Senior Bot / Supervisor:                                                       │
│  ├── Full order refund ≤ $100: Approve                                        │
│  ├── Credit issuance ≤ $25: Approve                                           │
│  └── Repeat customer refunds: Review pattern                                   │
│                                                                                  │
│  Human Review Required:                                                         │
│  ├── Refund > $100: Always                                                     │
│  ├── Customer has > 3 refunds in 30 days: Always                              │
│  ├── Suspected fraud: Always                                                   │
│  ├── Legal mention: Always                                                     │
│  └── Safety incident: Always                                                   │
│                                                                                  │
│  Accounting Impact:                                                             │
│  - All refunds logged with authority level                                     │
│  - Monthly audit of auto-approved refunds                                      │
│  - Variance analysis vs expected refund rate                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. ADMIN DASHBOARD OPERATIONS

### 7.1 Real-Time Monitoring

```
Dashboard Metrics (Real-time):
├── Active Orders: Count by status
├── Active Rides: Count by status
├── Online Drivers: Count by area (H3 cells)
├── Average Wait Time: Orders pending > 5 min
├── Average ETA: Current orders
├── Issue Rate: Orders with issues / total orders
└── Platform Health: All services status

API Endpoints:
GET /api/admin/dashboard/realtime
GET /api/admin/dashboard/orders
GET /api/admin/dashboard/rides
GET /api/admin/dashboard/drivers
GET /api/admin/health
```

### 7.2 Manual Interventions

```
Admin Actions Available:
├── Force-assign driver to order
├── Cancel order/ride (with reason)
├── Issue refund (any amount)
├── Issue credit (any amount)
├── Adjust fare (with documentation)
├── Activate/deactivate driver
├── Activate/deactivate restaurant
├── Override document verification
├── Unlock customer account
└── Generate reports

All Actions:
├── Require admin authentication
├── Logged with admin ID and timestamp
├── Require reason/justification
└── Trigger accounting entries if financial
```

---

## 8. REPORTING OPERATIONS

### 8.1 Scheduled Reports

| Report | Frequency | Recipients | Purpose |
|--------|-----------|------------|---------|
| Daily Operations | Daily 6am | Ops team | Previous day summary |
| Revenue Summary | Daily 8am | Finance | Revenue, refunds, payouts |
| Driver Payouts | Weekly Mon | Finance | Pending payouts |
| Restaurant Payouts | Weekly Mon | Finance | Pending payouts |
| KPI Dashboard | Real-time | Management | Business health |
| Safety Incidents | Immediate | Safety team | Safety events |
| Fraud Alerts | Immediate | Security | Suspicious activity |

### 8.2 Compliance Reports

| Report | Frequency | Requirement |
|--------|-----------|-------------|
| 1099-K Summary | Annual | IRS requirement |
| Sales Tax | Monthly/Quarterly | State tax filing |
| Driver Background | On-request | Regulatory audit |
| Data Privacy | On-request | GDPR/CCPA compliance |
| Transaction Audit | Quarterly | Financial audit |

---

## 9. INTEGRATION ENDPOINTS SUMMARY

### Customer API
```
POST   /api/auth/customer/register
POST   /api/auth/customer/login
GET    /api/customers/{id}
PUT    /api/customers/{id}
DELETE /api/customers/{id}
POST   /api/customers/{id}/payment-methods
GET    /api/customers/{id}/orders
GET    /api/customers/{id}/rides
```

### Driver API
```
POST   /api/drivers/apply
POST   /api/drivers/{id}/documents
GET    /api/drivers/{id}/earnings
POST   /api/drivers/{id}/payout/instant
PUT    /api/drivers/{id}/location
PUT    /api/drivers/{id}/status
POST   /api/drivers/{id}/accept-order
POST   /api/drivers/{id}/accept-ride
```

### Restaurant API
```
POST   /api/restaurants/apply
GET    /api/restaurants/{id}/orders
PUT    /api/restaurants/{id}/orders/{order_id}/status
GET    /api/restaurants/{id}/menu
PUT    /api/restaurants/{id}/menu
GET    /api/restaurants/{id}/payouts
```

### Order API
```
POST   /api/orders
GET    /api/orders/{id}
PUT    /api/orders/{id}/status
POST   /api/orders/{id}/cancel
POST   /api/orders/{id}/issue
POST   /api/orders/{id}/refund
GET    /api/orders/{id}/tracking
```

### Ride API
```
POST   /api/rides
GET    /api/rides/{id}
PUT    /api/rides/{id}/status
POST   /api/rides/{id}/cancel
POST   /api/rides/estimate
GET    /api/rides/{id}/tracking
```

### Admin API
```
GET    /api/admin/dashboard/*
POST   /api/admin/refunds
POST   /api/admin/credits
PUT    /api/admin/drivers/{id}/status
PUT    /api/admin/restaurants/{id}/status
GET    /api/admin/reports/*
```

---

*Document End*
*For questions: Contact DevOps Bot (dollor-devops)*
