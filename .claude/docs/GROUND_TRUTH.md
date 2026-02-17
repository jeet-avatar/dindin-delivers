# DOLLOR.AI GROUND TRUTH (Backend-Verified)

> Auto-generated from backend source code. Every fact includes file:line reference.
> Last verified: February 16, 2026 (Build 1076/187/158)

---

## 1. REGISTRATION FIELDS (Per User Type)

### Customer Registration
- **Endpoint:** `POST /api/auth/customer/register` (`main_new.py:2622`)
- **Request fields:** `email` (required), `password` (required), `name` OR `full_name` (one required), `phone` (optional)
- **DB storage:** `first_name` + `last_name` (split from name), `email`, `phone`, `is_active=True`
- **Name field:** Single `name` or `full_name` in request, split into `first_name`/`last_name` in DB (`main_new.py:2677`)

### Driver Registration
- **Endpoint:** `POST /api/auth/driver/register` (`main_new.py:2079`)
- **Request fields:** `email`, `password`, `first_name`, `last_name`, `phone` (all required), `vehicle_type`, `license_number`, `date_of_birth` (optional)
- **DB storage:** `first_name` + `last_name` as SEPARATE columns (`models.py:706-707`)
- **IMPORTANT:** Driver uses `first_name`/`last_name` separately - NOT a single `name` field

### Vendor Registration
- **Endpoint:** `POST /api/auth/vendor/register` (`main_new.py:1469`)
- **Request fields:** `email`, `password` (required), `full_name` OR `name` (one required), `restaurant_name` OR `business_name` (one required)
- **DB storage:** `contact_name` (owner name), `restaurant_name`, `company_name` on Vendor table (`main_new.py:1522`)
- **User table:** `full_name` (single field, `models.py:53`)

---

## 2. ACTIVE STATUS (Per User Type)

### Customer
- **Field:** `is_active` Boolean on Customer model (`models.py:624`)
- **Login check:** `if not customer.is_active: raise 403` (`main_new.py:2594`)
- **NOT an enum.** `CustomerStatus` enum exists (`models.py:564`) but is NEVER used on Customer model
- **Default:** `True` at registration (`main_new.py:2695`)

### Driver
- **Field:** `status` using `DriverStatus` enum (`models.py:690-696`)
- **Values:** `pending`, `approved`, `active`, `inactive`, `suspended`, `online`
- **Login blocks:** Only `SUSPENDED` (`main_new.py:2022`)
- **Registration default:** `DriverStatus.PENDING` (`main_new.py:2111`)

### Vendor
- **Field:** `onboarding_status` using `VendorStatus` enum (`models.py:27-32`)
- **Values:** `pending`, `in_review`, `approved`, `rejected`, `suspended`
- **Login blocks:** Any status that is NOT `approved` (`main_new.py:1314`)

---

## 3. VEHICLE FIELDS (Driver)

**Actual DB columns** (`models.py:721-726`):
- `vehicle_type` (car/motorcycle/bicycle)
- `vehicle_make`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `license_plate`

**Does NOT exist:** `vehicle_registration` - no such field anywhere in codebase

---

## 4. PRICING MODEL (Canonical - Model A: Fare-Tiered)

### Food Delivery Fees

| Fee | Amount | Backend Source | iOS Source |
|-----|--------|---------------|-----------|
| Customer service fee | **$1.00 flat** | `order_flow.py:400` | `AppConfig.swift:98` |
| Restaurant platform fee | **$1.00 flat** | `order_flow.py:401` | `AppConfig.swift:99` |
| Driver commission | **$0.00** (keeps 100%) | `main_new.py:6431` | `AppConfig.swift:100` |
| Platform revenue/order | **$2.00** | `main_new.py:8143` | |
| Small order fee | **$2.00** (orders < $10) | | `AppConfig.swift:66-67` |
| Max restaurants/order | **3** | | `AppConfig.swift:64` |
| Extra stop fee | **$2.00** | | `AppConfig.swift:62` |

### Delivery Fee (Paid by customer, 100% to driver)

| Constant | Value | Backend Source | iOS Source |
|----------|-------|---------------|-----------|
| Base fee | $2.49 | `order_flow.py:405` | |
| Per mile | $0.50 | `order_flow.py:406` | `AppConfig.swift:237` |
| Minimum | $2.99 | `order_flow.py:407` | `AppConfig.swift:61` |
| Maximum | $12.99 | `order_flow.py:408` | `AppConfig.swift:238` |
| Default (no distance) | $4.99 | `order_flow.py:409` | |
| Surge cap (delivery) | 2.0x | `order_flow.py:442` | |
| Max delivery distance | 15 miles | | `AppConfig.swift:241` |

### Rideshare Fees (CANONICAL: Fare-Tiered, Model A)

| Fare Range | Customer Pays | Driver Pays | Platform Total |
|-----------|--------------|------------|----------------|
| **<= $35** | Fare + **$1** | Fare - **$1** | **$2** |
| **$35.01 - $70** | Fare + **$2** | Fare - **$2** | **$4** |
| **> $70** | Fare + **$3** | Fare - **$3** | **$6** |

**Source:** `rideshare_payments.py:36-43`, `AppConfig.swift:105-112`

### Rideshare Fare Calculation

| Constant | Value | Source |
|----------|-------|--------|
| Base fare | $2.50 | `AppConfig.swift:262`, `pricing_config.py:22` |
| Per mile rate | $1.15 | `AppConfig.swift:263`, `pricing_config.py:23` |
| Per minute rate | $0.18 | `AppConfig.swift:264`, `pricing_config.py:24` |
| Minimum fare | $5.00 | `AppConfig.swift:265` ($8.00 in `pricing_config.py:25`) |
| Surge max (rideshare) | 3.0x | `AppConfig.swift:270` |

**Formula:** `max(minFare, baseFare + (distance × perMile) + (duration × perMinute))`

### Cancellation Fees

| Scenario | Fee | Source |
|----------|-----|--------|
| Base cancellation | $5.00 | `AppConfig.swift:266` |
| Driver en route | $5.00 | `AppConfig.swift:267` |
| Ride in progress | $10.00 | `AppConfig.swift:268` |

### Tips
- **100% to driver, always** - `tipPlatformFee = 0.00` (`AppConfig.swift:101`)
- Stored in `RideRequest.tip_amount` column (`models.py`)
- Rideshare tip options: $0, $2, $5, $10 (`AppConfig.swift:244`)
- Delivery tip percentages: 0%, 15%, 20%, 25% (`AppConfig.swift:245`)
- Default tip rate: 15% (`AppConfig.swift:239`)

### Free Delivery
- **No automatic threshold** - promo code only
- Code: `FREEDELIVERY`, min order $20, max discount $5 (`main_new.py:6083`)

---

## 5. TAX RATES

| Context | Rate | Source |
|---------|------|--------|
| iOS hardcoded default | **6% (0.06)** | `AppConfig.swift:60` |
| Backend /api/config response | **6% (0.06)** | `main_new.py:1071` |
| Backend DEFAULT_TAX_RATE | **6% (0.06)** | `order_flow.py:568` |
| Actual checkout | **Per-state** | `order_flow.py:512-565` |
| iOS state lookup fallback | **0%** | `AppConfig.swift:623` |

**All three default tax sources are ALIGNED at 6% (fixed Feb 15, 2026).**

**Key State Rates:**

| State | Backend | iOS | Source |
|-------|---------|-----|--------|
| California | 7.25% | 7.25% | `order_flow.py:514`, `AppConfig.swift:607` |
| New York | **8.875%** | **8.875%** | `order_flow.py:515`, `AppConfig.swift:613` |
| Texas | 6.25% | 6.25% | `order_flow.py:516`, `AppConfig.swift:616` |
| Florida | 6% | 6% | `order_flow.py`, `AppConfig.swift:608` |

**Zero tax states:** AK, DE, MT, NH, OR

---

## 6. ORDER STATUS VALUES

**Backend enum** (`models.py:383-403`): Always lowercase with underscores in API responses.

| Status | Category |
|--------|----------|
| `pending_payment` | Payment |
| `confirmed` | Payment |
| `pending_restaurant` | Restaurant acceptance |
| `declined_by_restaurant` | Restaurant acceptance |
| `restaurant_timeout` | Restaurant acceptance |
| `preparing` | Preparation |
| `ready_for_pickup` | Preparation |
| `pending_delivery_decision` | Delivery decision |
| `restaurant_will_deliver` | Delivery decision |
| `delivery_decision_timeout` | Delivery decision |
| `out_for_delivery` | Delivery |
| `delivered` | Terminal |
| `cancelled` | Terminal |

### iOS Status Mapping (`P2PAPIService.swift:9444-9467`)
```
pending/pending_payment → "Placed"
confirmed → "Accepted"
preparing → "Preparing"
ready/ready_for_pickup → "Ready"
picked_up → "PickedUp"
out_for_delivery → "OnTheWay"
delivered → "Delivered"
cancelled → "Cancelled"
```

### Known iOS Bug: Restaurant App Case Mismatch
- `Theme.swift:72-80` uses Capitalized rawValues ("Placed", "Preparing")
- Backend sends lowercase ("preparing", "delivered")
- `OrderStatus(rawValue:)` always returns nil, falls back to `.placed`
- `todayRevenue` at `OrdersViewModel.swift:147` compares capitalized → always $0

---

## 7. RIDE REQUEST STATUS

**Backend enum** (`models.py:1248-1255`):
`open` → `bidding` → `matched` → `in_progress` → `completed`
Also: `cancelled`, `expired`

---

## 8. BID STATUS

**Backend enum** (`models.py:1258-1264`):
`pending` → `accepted` | `rejected` | `countered` | `withdrawn` | `expired`

---

## 9. LOGIN ENDPOINTS

| Platform | Customer | Driver | Vendor |
|----------|----------|--------|--------|
| iOS/Android | `/auth/customer/login` | `/auth/driver/login` | `/auth/vendor/login` |
| WebApp | `/api/auth/customer/login` | `/api/auth/driver/login` | `/api/auth/vendor/login` |
| Admin | `/api/auth/login` or `/api/admin/login` | | |

All use OAuth2 form-based auth (`username` + `password` fields).

---

## 10. RIDESHARE BIDDING FLOW

### Full Lifecycle
1. **Estimate:** `POST /api/rides/estimate` with pickup/dropoff coords (`bid_routes.py:1438`)
2. **Request:** `POST /api/rides/request` → status=`open`, request_id=`RIDE-...` (`bid_routes.py:222`)
3. **Available:** `GET /api/rides/available?driver_id=X&latitude=Y&longitude=Z` (`main_new.py:14495`, also `bid_routes.py:709`)
4. **Bid:** `POST /api/rides/request/{id}/bid` with proposed_price (no floor for drivers; 40% floor only applies to customer counter-offers at `bid_routes.py:574`) (`bid_routes.py:772`)
5. **View Bids:** `GET /api/rides/request/{id}/bids`
6. **Respond:** `POST /api/rides/bid/{bid_id}/respond` action=`accept`/`reject`/`counter` (`bid_routes.py:370`)
7. **Driver Counter:** `POST /api/rides/bid/{bid_id}/driver-counter` (`bid_routes.py:1034`)
8. **Max 3 counters** tracked by `customer_counter_count`
9. **Start:** `POST /api/rides/request/{id}/start` matched→in_progress (`bid_routes.py:1276`)
10. **Complete:** `POST /api/rides/request/{id}/complete` in_progress→completed (`bid_routes.py:1342`)
11. **Payment:** `POST /api/payments/ride/create-intent` (`rideshare_payments.py:61`)
12. **Complete+Pay:** `POST /api/rides/{ride_id}/complete-and-pay` (`main_new.py:4618`)
13. **Tip:** `POST /api/rides/{ride_id}/tip` with tip_amount → `RideRequest.tip_amount`
14. **Rate:** `POST /api/rides/{ride_id}/rate` rating (1-5), comment (`main_new.py:14373`)

### Communication
- **Get:** `GET /api/p2p/ride-requests/{id}/chat` (`main_new.py:14595`)
- **Send:** `POST /api/p2p/ride-requests/{id}/chat` message + sender_type (`main_new.py:14609`)
- **Alias:** `POST/GET /api/chat/messages/{ride_id}`

### Driver Location
- **Auth:** `PUT /api/auth/driver/location?latitude=X&longitude=Z` (`main_new.py:2498`)
- **Android:** `POST /api/driver/location` JSON body (`main_new.py:19066`)

### Cancellation & Guards
- `POST /api/rides/request/{id}/cancel` - only `open`/`bidding` rides (`bid_routes.py:656`)
- Driver cannot bid with active ride (in_progress/matched) → 400
- Customer counter-offer rejected if `counter_price < 40%` of suggested fare (`bid_routes.py:574`). No price floor on driver initial bids.
- Max 3 counter-offers → 400

---

## 11. RIDEREQUEST MODEL FIELDS

`RideRequest` (`models.py:1267`):
- **IDs:** `id`, `request_id` (RIDE-...), `customer_id`, `matched_bid_id`, `matched_driver_id`
- **Customer info:** `customer_name`, `customer_phone`
- **Pickup:** `pickup_address`, `pickup_latitude`, `pickup_longitude`, `pickup_place_name`
- **Dropoff:** `dropoff_address`, `dropoff_latitude`, `dropoff_longitude`, `dropoff_place_name`
- **Estimates:** `estimated_distance_km`, `estimated_duration_minutes`
- **Pricing:** `suggested_price`, `customer_max_price`, `customer_preferred_price`, `final_price`, `platform_fee`, `driver_payout`
- **Status:** `status` (RideRequestStatus enum), `ride_type`
- **Bidding:** `bidding_expires_at`, `max_bids`, `customer_counter_count`
- **Tip:** `tip_amount` (Float, default=0.0) - **NOT** a `tip` column
- **Payment:** `stripe_payment_intent_id`, `payment_status`, `stripe_transfer_id`
- **Timestamps:** `created_at`, `updated_at`, `matched_at`, `completed_at`, `cancelled_at`

---

## 12. FIREBASE CONFIGURATION

| App | Bundle ID | Google App ID | OAuth Client ID |
|-----|-----------|---------------|-----------------|
| Customer | `com.dollorai.customer` | `1:65740760476:ios:973eaffa167f09b142d459` | `65740760476-0cnsrucn1tvadbf193cgio2siosnjg02` |
| Driver | `com.dollorai.delivery` | `1:65740760476:ios:c030082ee8edb97742d459` | `65740760476-q3k21qkra9rm84de8eehsjsc42uo2lun` |
| Restaurant | `com.dollorai.restaurant` | `1:65740760476:ios:17093713b66b4d8e42d459` | `65740760476-notp45u35afmee902jqkrkqhkp9lo1t2` |

- **Project:** `dollorai-production` (number `65740760476`)
- **Owner:** `support@dollor.ai` (ONLY authorized email)
- **Storage:** `dollorai-production.firebasestorage.app`
- **Android Client ID:** `65740760476-7t1cvgv5h86s6qhncmgbori9a060no1u` (shared)

---

## 13. iOS APP CONFIGURATION

### Build Numbers (Feb 16, 2026)
| App | Build | Version | Display Name |
|-----|-------|---------|-------------|
| Customer | 1076 | 1.0 | Dollor / Dollor - $1 Delivery |
| Driver | 187 | 1.0 | Dollor Driver / Dollor Driver - Earn More |
| Restaurant | 158 | 1.0 | Dollor Business / Dollor for Restaurants |

### Environment URLs (xcconfig)
| Env | API | WebSocket | CDN |
|-----|-----|-----------|-----|
| Production | `https://api.dollor.ai` | `wss://ws.dollor.ai` | `https://cdn.dollor.ai` |
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net` | `wss://d3kuu45w6kl8hr.cloudfront.net` | `https://d3kuu45w6kl8hr.cloudfront.net` |

### Entitlements
- **Push:** `production` (Release), `development` (Debug)
- **Apple Pay:** `merchant.com.dolloraiai`
- **Sign in with Apple:** Enabled
- **Team ID:** `PRKZ4UVCD7`

### Feature Flags (`AppConfig.swift:345-347`)
- `isDummyPaymentMode`: **false** (real Stripe in Release)
- `isAIFeaturesEnabled`: **true**
- `isDynamicPricingEnabled`: **false**

### Background Modes
- Customer: `remote-notification`
- Driver: `location`, `audio`, `remote-notification`
- Restaurant: `remote-notification`

---

## 14. STRIPE INTEGRATION

### Stripe Connect Accounts
| User Type | Account Type | Business Type | MCC | Source |
|-----------|-------------|---------------|-----|--------|
| Driver | Express | individual | 4121 (Taxicabs) | `main_new.py:4091` |
| Vendor | Express | company | 5812 (Restaurants) | `main_new.py:4412` |

### Stripe Endpoints
| Endpoint | Purpose | Source |
|----------|---------|--------|
| `POST /api/payments/create-intent` | Simple payment intent | `stripe_integration.py:111` |
| `POST /api/orders` | Order payment intent (Apple/Google Pay) | `stripe_integration.py:156` |
| `POST /api/payments/ride/create-intent` | Rideshare payment | `rideshare_payments.py:61` |
| `POST /api/erp/payments/intent` | Main payment intent (w/ customer) | `main_new.py:16654` |
| `GET /api/drivers/{id}/stripe/create-account` | Create driver Stripe | `main_new.py:4091` |
| `GET /api/drivers/{id}/stripe/onboarding-link` | Driver Stripe onboarding | `main_new.py:4117` |
| `GET /api/drivers/{id}/stripe/status` | Driver Stripe status | `main_new.py:4179` |
| `POST /api/vendors/{id}/stripe/create-account` | Create vendor Stripe | `main_new.py:4412` |
| `GET /api/vendors/{id}/stripe/onboarding-link` | Vendor Stripe onboarding | `main_new.py:4438` |

### Webhooks
| Endpoint | Events | Source |
|----------|--------|--------|
| `POST /api/webhooks/stripe` | `payment_intent.succeeded`, `payment_intent.payment_failed` | `stripe_integration.py:323` |
| `POST /api/webhooks/stripe-connect` | `account.updated`, `payout.paid`, `payout.failed` | `main_new.py:4288` |

### Stripe Fees & Limits
- Processing fee: **2.9% + $0.30** per transaction (`stripe_integration.py:550-640`)
- Payment intent min: **$0.50**, max: **$999,999.99**
- Invoice format: `INV-{YYYYMMDD}-{sequence:05d}` (`stripe_integration.py:435`)
- Stripe API version: `2023-10-16` (`main_new.py`)

### Stripe DB Columns
| Model | Columns |
|-------|---------|
| Customer | `stripe_customer_id` |
| Driver | `stripe_account_id`, `stripe_onboarded`, `stripe_customer_id` |
| Vendor | `stripe_account_id`, `stripe_onboarding_complete` |
| Order | `stripe_payment_intent_id`, `stripe_charge_id`, `payment_status` |
| RideRequest | `stripe_payment_intent_id`, `platform_fee`, `driver_payout`, `stripe_transfer_id` |

### Demo Bypass
- `demo.customer@dollor.ai`, `demo.driver@dollor.ai`, `demo.restaurant@dollor.ai` bypass Stripe (`main_new.py:16654`)

---

## 15. ADMIN SECURITY (Feb 16, 2026)

### Admin Auth Middleware
All `/api/admin/*` endpoints are secured by `admin_auth_middleware` (`main_new.py:167`).

| Auth Method | How It Works | Source |
|-------------|-------------|--------|
| JWT Bearer token | `Authorization: Bearer <token>`, must be `UserRole.ADMIN` | `main_new.py:182-199` |
| ADMIN_SECRET_KEY | `?secret_key=<key>` query param | `main_new.py:204-208` |

### Exempt Paths (No Auth Required)
| Path | Reason | Source |
|------|--------|--------|
| `/api/admin/login` | Login must be accessible | `main_new.py:165` |
| `/api/admin/set-document-status` | Has own body-based auth | `main_new.py:166` |
| `OPTIONS` requests | CORS preflight | `main_new.py:175` |

### Secured Admin Endpoints (13 total)
All return `401 Unauthorized` without valid auth:
- `GET /api/admin/drivers` — Driver list with PII
- `DELETE /api/admin/customers/by-email/{email}` — Customer deletion
- `GET /api/admin/database/schema` — Full DB schema
- `GET /api/admin/rideshare/requests` — Ride request PII
- `GET /api/admin/rideshare/active` — Active ride PII
- `POST /api/admin/cleanup-expired-bids` — Bid cleanup
- `POST /api/admin/cleanup/pending-orders` — Order cleanup
- `POST /api/admin/cleanup/all-incomplete` — Full cleanup
- `GET /api/admin/api/routes` — API route listing
- `GET /api/admin/api/duplicates` — Duplicate route detection
- `POST /api/admin/drivers/{id}/set-documents` — Document status
- `POST /api/admin/drivers/{id}/verify` — Driver verification
- `POST /api/admin/migrate` — Database migration

### CORS Security
| Header | Behavior | Source |
|--------|----------|--------|
| `Vary: Origin` | Always set (fixes CloudFront caching) | `main_new.py:155` |
| `access-control-allow-credentials` | Stripped when no `allow-origin` present | `main_new.py:157` |

### Deployment
- ECS task-def: `dollor-api:309` (commit `4244c77a`)
- All changes verified against `api.dollor.ai` in production

---

## 16. COMPANY & LEGAL

| Field | Value | Source |
|-------|-------|--------|
| Company name | Zietra Technologies Inc | `AppConfig.swift:586` |
| Contact email | `support@dollor.ai` | `AppConfig.swift:587` |
| Support phone | `+1-800-365-5671` | `AppConfig.swift:336` |
| Support URL | `https://api.dollor.ai/support` | `AppConfig.swift:335` |
| Terms of Service | `https://api.dollor.ai/terms` | `AppConfig.swift:592` |
| Privacy Policy | `https://api.dollor.ai/privacy` | `AppConfig.swift:593` |
| Driver Terms | `https://dollor.ai/driver-terms` | `AppConfig.swift:594` |
| Restaurant Terms | `https://dollor.ai/restaurant-terms` | `AppConfig.swift:595` |
| Driver Application | `https://dollor.ai/driver-application` | `AppConfig.swift:596` |
| Admin Panel | `https://admin.dollor.ai` | `AppConfig.swift:597` |
| App Download | `https://dollor.ai/app` | `AppConfig.swift:598` |
| Terms version | 1.1 | `AppConfig.swift:583` |
| Default location | Irvine, CA (33.6846, -117.8265) | `AppConfig.swift:533-534` |
| Nearby radius | ~2 miles (3218.69m) | `AppConfig.swift:240` |
| Driver earnings display | 96% | `AppConfig.swift:248` |

---

## 17. KNOWN INCONSISTENCIES

1. **Three rideshare fee models coexist:** Model A (fare-tiered, `rideshare_payments.py`), Model B (distance-tiered, `main_new.py:3193`), Model C (flat $1, `order_flow.py:489`). Model A is canonical.
2. ~~**Tax rate mismatch**~~ **RESOLVED (Feb 15, 2026):** All three sources aligned at 6% (iOS AppConfig.swift:60, backend /api/config main_new.py:1071, DEFAULT_TAX_RATE order_flow.py:568). NY aligned at 8.875% on both backend and iOS.
3. **Surge cap mismatch:** Backend delivery 2.0x vs iOS rideshare 3.0x (different services).
4. **order_flow.py status map incomplete:** Missing 6 newer statuses at line 2270-2278.
5. **Restaurant `todayRevenue` bug:** Case-sensitive comparison against backend lowercase values.
6. **EnterpriseNetworkLayer.swift** hardcodes `eatfair-p2p` Firebase project ID (legacy fallback).
7. **GoogleMapsConfig.swift** lists `com.dollorai.driver` as bundle ID restriction but actual driver bundle ID is `com.dollorai.delivery`.
8. **UT (Utah) tax rate mismatch:** iOS `AppConfig.swift:616` has 0.061 (6.1%), backend `order_flow.py:542` has 0.0485 (4.85%). Backend is authoritative.
9. **Three fare rate sets coexist:** iOS+`pricing_config.py` ($2.50/$1.15/$0.18), `main_new.py:3239` estimate endpoint ($2.50/$1.50/$0.25), `order_flow.py:492` legacy ($2.00/$1.00/$0.15). `pricing_config.py` is canonical for bid suggested prices.
10. **Dynamic pricing flag conflict:** `Production.xcconfig` has `ENABLE_DYNAMIC_PRICING = YES` but `AppConfig.swift` defaults `isDynamicPricingEnabled = false`. Runtime `/api/config` response controls actual behavior.
