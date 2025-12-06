# EatFair/DinDin Platform - Comprehensive Feature Analysis

## Executive Summary

This document provides a complete analysis of the EatFair/DinDin food delivery and rideshare platform across all three iOS apps (Customer, Driver, Restaurant) and the backend system. It identifies missing features, documents all business flows, highlights pricing/financial issues, and outlines potential risks.

**Overall Platform Readiness:** 60-65%
- Core flows implemented
- Critical financial issues need immediate attention
- Several business-critical features missing

---

# PART 1: FEATURE INVENTORY BY APP

## 1.1 Customer App Features

### Implemented Features
| Feature | Status | Notes |
|---------|--------|-------|
| Email/Password Login | ✅ Complete | P2P backend integration |
| Google Sign-In | ✅ Complete | OAuth working |
| Restaurant Browsing | ✅ Complete | Search, filter, sort |
| Menu Viewing | ✅ Complete | Categories, customizations |
| Multi-Restaurant Cart | ✅ Complete | Up to 3 restaurants |
| Order Placement | ⚠️ Partial | Mock payment, Stripe commented out |
| Order Tracking | ✅ Complete | Real-time polling |
| Delivery Tracking | ✅ Complete | Driver location, ETA |
| Ride-Sharing | ✅ Complete | Full Uber-style experience |
| Order History | ✅ Complete | Basic listing |
| Address Management | ✅ Complete | Geocoding, persistence |

### Missing Features (Customer App)
| Feature | Priority | Business Impact |
|---------|----------|-----------------|
| **Payment Processing** | CRITICAL | Can't accept real payments |
| Apple Sign-In | HIGH | iOS requirement for App Store |
| Password Reset | HIGH | Users locked out of accounts |
| Email Verification | HIGH | Spam/fake accounts |
| Order Cancellation | HIGH | Customer stuck with orders |
| Refund Management | CRITICAL | No money back path |
| In-App Chat with Driver | HIGH | Communication gap |
| Rating/Review System | HIGH | No quality feedback |
| Promo Code Entry | MEDIUM | Lost marketing tool |
| Push Notifications | MEDIUM | Framework only, not implemented |
| Scheduled Orders | MEDIUM | No future ordering |
| Reorder from History | LOW | Convenience feature |
| Loyalty Program | LOW | Customer retention |
| Referral System | LOW | Growth feature |

---

## 1.2 Driver App Features

### Implemented Features
| Feature | Status | Notes |
|---------|--------|-------|
| Driver Registration | ✅ Complete | Email/password + Google |
| Document Upload | ✅ Complete | License, insurance, vehicle |
| AI Document Verification | ✅ Complete | Auto-verification |
| Go Online/Offline | ✅ Complete | Session tracking |
| View Available Orders | ✅ Complete | List + Map view |
| Accept Orders | ✅ Complete | Assignment working |
| Navigation to Pickup | ✅ Complete | Google/Apple Maps |
| Mark Picked Up | ✅ Complete | Swipe confirmation |
| Navigation to Delivery | ✅ Complete | Maps integration |
| Mark Delivered | ✅ Complete | Swipe confirmation |
| Earnings Dashboard | ✅ Complete | Daily/weekly/monthly |
| Tips Display | ✅ Complete | Real-time notifications |
| Chat with Customer | ✅ Complete | Text, voice, location |
| Voice Assistant | ⚠️ Partial | Commands work, UI limited |
| Driver Profile | ✅ Complete | Full profile management |
| Bank Account Setup | ⚠️ Partial | Entry only, no verification |

### Missing Features (Driver App)
| Feature | Priority | Business Impact |
|---------|----------|-----------------|
| **Proof of Delivery Photos** | CRITICAL | Can't prove delivery |
| **Background Check Status** | CRITICAL | Unverified drivers operating |
| Order Rejection | HIGH | Can't decline unsuitable orders |
| Rejection Reason Tracking | HIGH | No decline analytics |
| Shift Scheduling | HIGH | No pre-planned shifts |
| Payout History | HIGH | No transaction visibility |
| Tax Documents (1099) | HIGH | Tax compliance issue |
| Multi-Stop Deliveries | MEDIUM | No batch orders |
| Performance Bonuses | MEDIUM | No incentive system |
| Driver Referral Program | LOW | Growth feature |
| Offline Mode | LOW | No order queue when offline |

---

## 1.3 Restaurant App Features

### Implemented Features
| Feature | Status | Notes |
|---------|--------|-------|
| Restaurant Login | ✅ Complete | P2P backend |
| Order Reception | ✅ Complete | Real-time polling |
| Order Acceptance/Rejection | ✅ Complete | Status updates |
| Mark Order Ready | ✅ Complete | Driver notification |
| Menu Management | ✅ Complete | Add/edit/delete items |
| Toggle Item Availability | ✅ Complete | Out of stock marking |
| Operating Hours | ✅ Complete | Per-day settings |
| Revenue Dashboard | ✅ Complete | Basic analytics |
| AI Insights | ✅ Complete | Demand forecasting |
| AI Employees | ✅ Complete | Workflow AI integration |
| Promotions/Deals | ✅ Complete | Create/manage promos |
| Settings | ✅ Complete | Notification preferences |

### Missing Features (Restaurant App)
| Feature | Priority | Business Impact |
|---------|----------|-----------------|
| **Menu Item Customizations** | HIGH | No sizes/add-ons/options |
| **Inventory Tracking** | HIGH | No stock quantities |
| **Actual Payout Processing** | CRITICAL | No money transfer |
| Temporary Closures | HIGH | Can't pause orders |
| Multi-Location Support | MEDIUM | Single location only |
| Human Staff Accounts | MEDIUM | Only AI employees |
| Kitchen Printer Integration | MEDIUM | No order printing |
| Tax Configuration | MEDIUM | No tax rate settings |
| Delivery Zone Setup | MEDIUM | No zone configuration |
| POS Integration | LOW | No Square/Toast/etc |

---

# PART 2: BUSINESS FLOW DOCUMENTATION

## 2.1 Food Delivery Order Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FOOD DELIVERY ORDER FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CUSTOMER APP                    BACKEND                    RESTAURANT APP  │
│  ───────────────                 ───────                    ──────────────  │
│                                                                             │
│  1. Browse Restaurants ──────────► GET /api/public/restaurants              │
│                                                                             │
│  2. View Menu ───────────────────► GET /api/vendors/{id}/menu               │
│                                                                             │
│  3. Add to Cart (local)                                                     │
│                                                                             │
│  4. Checkout ────────────────────► POST /api/erp/orders/create              │
│     │                                    │                                  │
│     │                                    ▼                                  │
│     │                              Order Created                            │
│     │                              Status: "Pending Payment"                │
│     │                              AI: OrderBot Alpha                       │
│                                                                             │
│  5. Payment ─────────────────────► POST /api/erp/orders/{id}/confirm-payment│
│     │                                    │                                  │
│     │                                    ├──► Email: Order Confirmation     │
│     │                                    ├──► Email: Restaurant Notification│
│     │                                    ▼                                  │
│     │                              Status: "Confirmed"      ◄─── New Order  │
│                                                                  Received   │
│                                                                             │
│  6. Wait for Prep ◄──────────────── POST /api/erp/orders/{id}/start-preparing
│     │                                    │                     │            │
│     │                                    ├──► Email: Preparing │            │
│     │                                    ▼                     │            │
│     │                              Status: "Preparing"    Accept Order      │
│                                                                             │
│  7. Ready Notification ◄─────────── POST /api/erp/orders/{id}/ready-for-pickup
│     │                                    │                     │            │
│     │                                    ▼                     │            │
│     │                              Status: "Ready"        Mark Ready        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        DELIVERY ASSIGNMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DRIVER APP                      BACKEND                    CUSTOMER APP    │
│  ──────────                      ───────                    ────────────    │
│                                                                             │
│  1. Go Online ───────────────────► Update driver status                     │
│                                                                             │
│  2. View Available Orders ───────► GET /api/erp/orders/available-for-delivery
│                                                                             │
│  3. Accept Order ────────────────► POST /api/erp/orders/{id}/assign-driver  │
│     │                                    │                                  │
│     │                                    ├──► Email: Driver Assigned ────► 4. See Driver│
│     │                                    ▼                                  │
│     │                              Status: "Assigned"                       │
│     │                              AI: DispatchBot Gamma                    │
│                                                                             │
│  5. Navigate to Restaurant                                                  │
│                                                                             │
│  6. Pick Up Order ───────────────► POST /api/erp/orders/{id}/picked-up      │
│     │                                    │                                  │
│     │                                    ├──► Email: Picked Up ──────────► 7. Track Driver│
│     │                                    ▼                                  │
│     │                              Status: "Out for Delivery"               │
│                                                                             │
│  8. Navigate to Customer                                                    │
│                                                                             │
│  9. Deliver Order ───────────────► POST /api/erp/orders/{id}/delivered      │
│     │                                    │                                  │
│     │                                    ├──► Email: Delivered ──────────► 10. Order Complete│
│     │                                    ├──► Create Journal Entry          │
│     │                                    ├──► Restaurant Payout Record      │
│     │                                    ├──► Driver Payout Record          │
│     │                                    ▼                                  │
│     │                              Status: "Delivered"                      │
│     │                              AI: LedgerBot Delta                      │
│                                                                             │
│  11. View Earnings ◄─────────────── Payout calculated                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Rideshare Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RIDESHARE FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CUSTOMER APP                    BACKEND                    DRIVER APP      │
│  ───────────────                 ───────                    ──────────      │
│                                                                             │
│  1. Enter Pickup Location                                                   │
│                                                                             │
│  2. Enter Dropoff Location                                                  │
│                                                                             │
│  3. Calculate Fare (local)                                                  │
│     - Base Fare: $2.00                                                      │
│     - Distance: $1.00/mile                                                  │
│     - Time: $0.15/minute                                                    │
│     - Platform Fee: $1.00 (ONLY)                                            │
│     - Minimum: $5.00                                                        │
│     - Surge: 1.0x - 3.0x                                                    │
│                                                                             │
│  4. Confirm Ride ────────────────► POST /api/rides/request                  │
│     │                                    │                                  │
│     │                                    ▼                                  │
│     │                              Ride Created                             │
│     │                              Status: "Waiting for Driver"             │
│                                                                             │
│  5. Waiting Screen ◄───────────────────────────────────► Driver Assignment  │
│     │                                                          │            │
│     │                                                          ▼            │
│     │                                                    Accept Ride        │
│                                                                             │
│  6. Driver Accepted ◄────────────── Ride status update                      │
│     │                                    │                                  │
│     │                              Status: "Driver En Route"                │
│                                                                             │
│  7. Track Driver Location                                                   │
│                                                                             │
│  8. Driver Arrived ◄─────────────── Status: "Driver Arrived"                │
│                                                                             │
│  9. Start Ride ◄─────────────────── Status: "In Progress" ◄── Start Trip   │
│                                                                             │
│  10. Live Tracking                                                          │
│                                                                             │
│  11. Ride Complete ◄─────────────── Status: "Completed" ◄──── End Trip     │
│      │                                   │                                  │
│      │                                   ├──► Driver Payout Created         │
│      │                                   ├──► Platform Fee Recorded         │
│      ▼                                   │                                  │
│  12. Rate Driver                         ▼                                  │
│                                    Accounting Entry                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Restaurant Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESTAURANT ONBOARDING FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Account Creation                                                   │
│  ─────────────────────────                                                  │
│  - Email/Password registration                                              │
│  - Business name                                                            │
│  - Contact information                                                      │
│                                                                             │
│  Step 2: Business Information                                               │
│  ────────────────────────────                                               │
│  - Restaurant name                                                          │
│  - Cuisine type                                                             │
│  - Address with geocoding                                                   │
│  - Phone number                                                             │
│                                                                             │
│  Step 3: Document Upload                                                    │
│  ───────────────────────                                                    │
│  - Business License                                                         │
│  - Tax ID (EIN)                                                             │
│  - Food Handler Certificate                                                 │
│  - Health Permit                                                            │
│  - Bank Account Information                                                 │
│                                                                             │
│  Step 4: Menu Setup                                                         │
│  ────────────────────                                                       │
│  - Add menu categories                                                      │
│  - Add menu items with prices                                               │
│  - Upload item images                                                       │
│  - Set availability                                                         │
│                                                                             │
│  Step 5: Operating Hours                                                    │
│  ──────────────────────                                                     │
│  - Set hours for each day                                                   │
│  - Mark closed days                                                         │
│                                                                             │
│  Step 6: Final Setup                                                        │
│  ────────────────────                                                       │
│  - Enable order notifications                                               │
│  - Accept terms of service                                                  │
│  - Go live                                                                  │
│                                                                             │
│  ⚠️  MISSING STEPS:                                                         │
│  - Payment processing setup                                                 │
│  - Delivery zone configuration                                              │
│  - Commission agreement                                                     │
│  - Test order verification                                                  │
│  - Background approval workflow                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 Driver Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DRIVER ONBOARDING FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Account Creation                                                   │
│  ─────────────────────────                                                  │
│  - Email/Password or Google Sign-In                                         │
│  - Phone number verification                                                │
│  - Accept Terms & Conditions                                                │
│                                                                             │
│  Step 2: Personal Information                                               │
│  ────────────────────────────                                               │
│  - Full name                                                                │
│  - Date of birth                                                            │
│  - Address                                                                  │
│  - Profile photo upload                                                     │
│                                                                             │
│  Step 3: Driver's License                                                   │
│  ────────────────────────                                                   │
│  - License front photo                                                      │
│  - License back photo                                                       │
│  - License number, state, class                                             │
│  - Expiration date                                                          │
│  - AI verification                                                          │
│                                                                             │
│  Step 4: Vehicle Information                                                │
│  ──────────────────────────                                                 │
│  - Make, model, year, color                                                 │
│  - License plate                                                            │
│  - Vehicle type (Sedan, SUV, etc.)                                          │
│  - Vehicle photos (front, side, back)                                       │
│                                                                             │
│  Step 5: Insurance                                                          │
│  ─────────────────                                                          │
│  - Insurance card photo                                                     │
│  - Provider name                                                            │
│  - Policy number                                                            │
│  - Expiration date                                                          │
│                                                                             │
│  Step 6: Bank Account                                                       │
│  ────────────────────                                                       │
│  - Bank name                                                                │
│  - Account holder name                                                      │
│  - Account type (checking/savings)                                          │
│  - Routing number                                                           │
│  - Account number                                                           │
│                                                                             │
│  ⚠️  MISSING STEPS:                                                         │
│  - Background check initiation                                              │
│  - Background check status tracking                                         │
│  - Vehicle inspection verification                                          │
│  - Training/orientation completion                                          │
│  - Test delivery requirement                                                │
│  - Account activation approval                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 3: PRICING & FINANCIAL ANALYSIS

## 3.1 Current Pricing Structure

### Food Delivery Pricing

| Component | Current Value | Source File | Configurable? |
|-----------|---------------|-------------|---------------|
| Platform Fee | $1.00 flat | order_flow.py:82 | NO (hardcoded) |
| Delivery Fee | $4.99 flat | order_flow.py:161 | NO (hardcoded) |
| Tax Rate | 9% | order_flow.py:160 | NO (hardcoded) |
| Tip | Customer-set | order creation | YES |

### CONFLICTING Alternative Model (stripe_integration.py)

| Component | Value | Line | Issue |
|-----------|-------|------|-------|
| Platform Fee | 15% of subtotal | 124-127 | **CONFLICTS with $1 flat** |
| Delivery Fee | $5.99 | 123 | **CONFLICTS with $4.99** |
| Tax Rate | 8% | 122 | **CONFLICTS with 9%** |

### Rideshare Pricing

| Component | Value | Notes |
|-----------|-------|-------|
| Base Fare | $2.00 | Goes to driver |
| Per Mile | $1.00 | Goes to driver |
| Per Minute | $0.15 | Goes to driver |
| Platform Fee | $1.00 ONLY | EatFair revenue |
| Minimum Fare | $5.00 | Total minimum |
| Surge Multiplier | 1.0x - 3.0x | Variable |

**Driver Economics:** ~90%+ of fare goes to driver (extremely driver-friendly)

---

## 3.2 Payout Calculations

### Restaurant Payout
```
Restaurant Payout = Subtotal - Platform Fee ($1.00)

Example:
- Order subtotal: $50.00
- Platform fee: $1.00
- Restaurant receives: $49.00

⚠️ ISSUES:
- Tax collected but not remitted
- Stripe fees not deducted
- No commission breakdown
```

### Driver Payout
```
Driver Payout = Delivery Fee + Tip

Example:
- Delivery fee: $4.99
- Customer tip: $5.00
- Driver receives: $9.99

⚠️ ISSUES:
- No distance-based calculation
- Same pay for 1 mile vs 10 miles
- No surge pricing
- No performance bonuses
```

---

## 3.3 Financial Issues & Money Leaks

### CRITICAL ISSUES

| Issue | Impact | Risk Level |
|-------|--------|------------|
| **Conflicting pricing models** | Customer charged different amounts depending on API used | CRITICAL |
| **No refund system** | Customer money trapped after cancellation | CRITICAL |
| **Stripe fees ignored** | $3-$50 per order not accounted | CRITICAL |
| **Journal entries don't balance** | Accounting discrepancy | CRITICAL |
| **Tax rate inconsistent** | 8% vs 9% depending on endpoint | CRITICAL |

### HIGH-RISK ISSUES

| Issue | Impact | Risk Level |
|-------|--------|------------|
| No distance-based delivery fee | Unfair driver compensation | HIGH |
| No surge pricing | Drivers won't deliver during peak | HIGH |
| BOGO promotion logic flawed | Can give away expensive items | HIGH |
| Free delivery amount hardcoded | Doesn't match actual delivery fee | HIGH |
| No minimum order validation | Loss-making orders accepted | HIGH |

### Money Leak Scenarios

**Scenario 1: Stripe Fees**
- Customer pays: $100
- Restaurant gets: $99 (after $1 platform fee)
- Driver gets: $4.99
- Stripe charges: $3.20 (2.9% + $0.30)
- **Platform absorbs: $3.20 loss per order**

**Scenario 2: Tax Inconsistency**
- Customer A (endpoint A): 9% tax = $109 total
- Customer B (endpoint B): 8% tax = $108 total
- Same restaurant, different taxes charged

**Scenario 3: Promotion Mismatch**
- FREE_DELIVERY promotion: $4.99 discount
- Actual delivery fee: $5.99
- **$1.00 gap per promotion use**

---

# PART 4: RISK ASSESSMENT

## 4.1 Legal & Compliance Risks

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **No background checks** | Unverified drivers delivering | CRITICAL | Implement Checkr integration |
| **Tax remittance unclear** | Who pays state sales tax? | CRITICAL | Tax accounting clarification |
| **No delivery proof** | Can't prove delivery occurred | HIGH | Add photo/signature capture |
| **Driver classification** | 1099 vs W2 status | HIGH | Legal review required |
| **PCI compliance** | Payment handling | MEDIUM | Stripe handles, but verify |

## 4.2 Business Risks

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **No customer support** | Users can't get help | HIGH | Implement support chat |
| **No refund path** | Customers can't get money back | CRITICAL | Build refund system |
| **No driver rejection** | Drivers can't decline orders | HIGH | Add rejection feature |
| **Single pricing model** | Can't adjust per market | MEDIUM | Make fees configurable |
| **No promotions system** | Can't run marketing campaigns | MEDIUM | Complete promo integration |

## 4.3 Technical Risks

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **Float precision** | Currency stored as Float | HIGH | Use Decimal/Numeric |
| **No pagination** | Restaurant list loads all | MEDIUM | Add pagination |
| **No caching** | Repeated API calls | MEDIUM | Implement caching |
| **No offline mode** | App unusable without internet | LOW | Add offline queue |
| **No rate limiting** | API vulnerable to abuse | MEDIUM | Add rate limits |

---

# PART 5: FEATURE PRIORITY MATRIX

## 5.1 Must-Have Before Launch (P0)

| Feature | App | Effort | Business Impact |
|---------|-----|--------|-----------------|
| Payment Processing (Stripe) | Customer | 2 weeks | Can't make money |
| Refund System | Backend | 1 week | Customer protection |
| Background Checks | Driver | 2 weeks | Legal requirement |
| Proof of Delivery Photos | Driver | 1 week | Dispute resolution |
| Fix Pricing Conflicts | Backend | 3 days | Financial accuracy |
| Tax by Location | Backend | 1 week | Legal compliance |

## 5.2 Should-Have for MVP (P1)

| Feature | App | Effort | Business Impact |
|---------|-----|--------|-----------------|
| Order Cancellation | Customer | 3 days | Customer experience |
| Driver Rejection | Driver | 2 days | Driver experience |
| Distance-Based Delivery Fee | Backend | 1 week | Fair compensation |
| Push Notifications | All | 1 week | Engagement |
| Rating/Review System | Customer | 1 week | Quality control |
| Password Reset | Customer | 2 days | Account recovery |
| Payout History | Driver | 3 days | Transparency |

## 5.3 Nice-to-Have (P2)

| Feature | App | Effort | Business Impact |
|---------|-----|--------|-----------------|
| Scheduled Orders | Customer | 1 week | Convenience |
| Shift Scheduling | Driver | 2 weeks | Planning |
| Multi-Location | Restaurant | 3 weeks | Scale |
| Surge Pricing | Backend | 1 week | Supply/demand balance |
| Loyalty Program | Customer | 2 weeks | Retention |
| Menu Customizations | Restaurant | 2 weeks | Order accuracy |

---

# PART 6: RECOMMENDED IMMEDIATE ACTIONS

## 6.1 Week 1: Critical Fixes

1. **Standardize Pricing Model**
   - Remove conflicting stripe_integration.py pricing
   - Use single source of truth in order_flow.py
   - Make all fees configurable via database

2. **Fix Stripe Fee Calculation**
   - Deduct Stripe fees from payouts
   - Track fees in accounting entries
   - Balance journal entries

3. **Implement Basic Refund**
   - Add refund endpoint
   - Process Stripe refunds
   - Update accounting

## 6.2 Week 2: Payment Integration

1. **Complete Stripe Integration**
   - Uncomment and test payment code
   - Add card management
   - Test payment flows end-to-end

2. **Add Proof of Delivery**
   - Camera integration in driver app
   - Photo upload to backend
   - Photo storage and retrieval

## 6.3 Week 3: Safety & Compliance

1. **Background Check Integration**
   - Integrate Checkr or similar
   - Status tracking in driver app
   - Block unverified drivers

2. **Tax by Location**
   - Implement state tax lookup
   - Use delivery address for tax calculation
   - Remove hardcoded tax rates

## 6.4 Week 4: Customer Experience

1. **Order Cancellation**
   - Add cancel button (with time limits)
   - Refund processing
   - Restaurant notification

2. **Rating System**
   - Post-delivery rating prompt
   - Store ratings in database
   - Display ratings on restaurants/drivers

---

# APPENDIX A: API Endpoints Reference

## Order Flow Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/erp/orders/create | Create new order |
| POST | /api/erp/orders/{id}/confirm-payment | Confirm payment |
| POST | /api/erp/orders/{id}/start-preparing | Restaurant starts prep |
| POST | /api/erp/orders/{id}/ready-for-pickup | Order ready |
| GET | /api/erp/orders/available-for-delivery | Get available orders |
| POST | /api/erp/orders/{id}/assign-driver | Assign driver |
| POST | /api/erp/orders/{id}/picked-up | Driver picked up |
| POST | /api/erp/orders/{id}/delivered | Order delivered |

## Restaurant Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/public/restaurants | List restaurants |
| GET | /api/public/restaurants/{id} | Restaurant details |
| GET | /api/vendors/{id}/menu | Get menu items |
| POST | /api/vendors/{id}/menu | Add menu item |
| PUT | /api/vendors/{id}/menu/{itemId} | Update menu item |
| DELETE | /api/vendors/{id}/menu/{itemId} | Delete menu item |

## Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/erp/drivers/register | Register driver |
| POST | /api/erp/drivers/login | Driver login |
| GET | /api/erp/drivers/{id} | Get driver profile |
| PUT | /api/erp/drivers/{id} | Update driver profile |
| POST | /api/erp/drivers/{id}/documents | Upload document |

---

# APPENDIX B: Email Notifications

## Implemented Emails

| Trigger | Email | Recipient |
|---------|-------|-----------|
| Payment Confirmed | Order Confirmation | Customer |
| Payment Confirmed | New Order Notification | Restaurant |
| Start Preparing | Order Preparing | Customer |
| Driver Assigned | Driver Assigned | Customer |
| Order Picked Up | Order Picked Up | Customer |
| Order Delivered | Order Delivered | Customer |

## Missing Emails

| Trigger | Email | Recipient |
|---------|-------|-----------|
| Order Cancelled | Cancellation Confirmation | Customer |
| Refund Processed | Refund Confirmation | Customer |
| Driver Document Expiring | Document Expiry Warning | Driver |
| Payout Processed | Payout Confirmation | Driver/Restaurant |

---

# APPENDIX C: Database Schema Issues

## Tables with Float Currency (Should be Decimal)

- `orders.subtotal`
- `orders.tax_amount`
- `orders.delivery_fee`
- `orders.total_amount`
- `orders.tip`
- `driver_payouts.amount`
- `restaurant_payouts.amount`

## Missing Indexes

- `orders.customer_email` (for lookups)
- `orders.vendor_id` (for restaurant queries)
- `orders.driver_id` (for driver queries)
- `orders.status` (for filtering)
- `orders.created_at` (for date ranges)

---

**Document Version:** 1.0
**Last Updated:** December 6, 2025
**Generated By:** Claude Code Analysis
