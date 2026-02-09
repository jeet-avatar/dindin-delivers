# Dollor.ai QA Knowledge Base

> **Last Updated:** February 9, 2026 @ 02:30 PST
> **Backend Version:** 1.0.12
> **Production API:** https://api.dollor.ai
> **Staging API:** https://d3kuu45w6kl8hr.cloudfront.net
> **Source:** All data captured from PRODUCTION API responses

---

## Production API Status (LIVE DATA)

| Metric | Value | Verified |
|--------|-------|----------|
| Status | healthy | ✅ 2026-02-09 02:29 |
| Database | connected | ✅ 2026-02-09 02:29 |
| Version | 1.0.12 | ✅ 2026-02-09 02:29 |
| Build | 2026-02-08-ride-numbers-driver-busy-check | ✅ 2026-02-09 02:29 |

**Raw Production Response:**
```json
{"status":"healthy","service":"p2p-backend","version":"1.0.12","build":"2026-02-08-ride-numbers-driver-busy-check","timestamp":"2026-02-09T02:29:32.626074","database":"connected"}
```

---

## 24 Cross-Platform QA Agents Reference

| # | Agent Name | Purpose | Platforms | Script/File |
|---|------------|---------|-----------|-------------|
| 1 | API Endpoint Validator | Auth, endpoints, status codes | All | `api-endpoint-validator.sh` |
| 2 | UI/Code Quality | Hardcoded values, patterns | iOS/Android | `ios-validator.sh` |
| 3 | E2E Workflow | Customer, driver, restaurant flows | All | `business-analyst-validator.sh` |
| 4 | Dead Code Detection | Unused code scanning | All | grep-based |
| 5 | Security (OWASP) | Secrets, auth, injection | All | `security-validator.sh` |
| 6 | Test Runner | Unit/integration tests | All | pytest/XCTest/JUnit |
| 7 | Database Health | Connectivity, integrity | Backend | SQL validation |
| 8 | Performance | Response times < thresholds | All | curl timing |
| 9 | Dependency Audit | Package versions, vulns | All | pod/pip/gradle |
| 10 | Frontend Data Validation | API response fields present | iOS/Android | JSON parsing |
| 11 | Frontend Display Validation | No hardcoded display values | iOS/Android | grep patterns |
| 12 | Field Mapping Validator | iOS/Android/Backend match | All | struct analysis |
| 13 | Driver App Validator | 4 tabs, all flows | iOS/Android | UI validation |
| 14 | Customer App Validator | 4-5 tabs, all flows | iOS/Android | UI validation |
| 15 | Restaurant App Validator | 4 tabs, order management | iOS/Android | UI validation |
| 16 | Order Lifecycle | Full order status flow | All | E2E test |
| 17 | API Documentation | Endpoints documented | All | OpenAPI check |
| 18 | Driver Details Flow | Photo, vehicle, rating | All | field trace |
| 19 | Deployment Readiness | Health, version, database | Production | health checks |
| 20 | TestFlight/Play Store | Build configs, signing | iOS/Android | fastlane/gradle |
| 21 | API Contract Validator | iOS vs Android vs Backend | All | struct compare |
| 22 | Data Type Validator | Types consistent cross-platform | All | type analysis |
| 23 | QA Challenger (FINAL GATE) | Demands evidence, blocks deploy | All | `qa-challenger-agent.sh` |
| 24 | Cross-Platform Validator | Button actions, timing, paths | All | `agent-24-cross-platform-validator.md` |

**Full Documentation**: `.planning/CROSS_PLATFORM_QA_AGENTS.md`

---

## 1. Complete API Endpoint Reference

### Authentication Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/auth/customer/login` | POST | Customer login | `access_token`, `customer_id`, `name`, `email` |
| `/api/auth/driver/login` | POST | Driver login | `access_token`, `driver_id`, `name`, `email` |
| `/api/auth/vendor/login` | POST | Vendor login | `access_token`, `vendor_id`, `name`, `email` |
| `/api/auth/customer/register` | POST | Customer signup | `access_token`, `customer_id` |
| `/api/auth/google-signin` | POST | Google OAuth | `access_token`, `customer_id` |
| `/api/customer/apple-auth` | POST | Apple Sign-In (iOS) | `access_token`, `customer_id` |

### Customer Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/vendors/published` | GET | List restaurants | Array of vendor objects |
| `/api/vendors/{id}` | GET | Restaurant details | `id`, `name`, `address`, `rating`, `menu` |
| `/api/vendors/{id}/menu` | GET | Restaurant menu | Array of menu items |
| `/api/customer/{id}/orders` | GET | Order history | Array of order objects |
| `/api/customer/orders/{id}/rate-driver` | POST | Rate driver | `success`, `message` |
| `/api/customer/orders/{id}/rate-restaurant` | POST | Rate restaurant | `success`, `message` |
| `/api/customer/favorites` | GET | Favorite restaurants | Array of vendor IDs |

### Order Endpoints (Customer)

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/erp/orders/create` | POST | Create order (iOS) | `order_id`, `status`, `total` |
| `/api/orders/create` | POST | Create order (Android) | `order_id`, `status`, `total` |
| `/api/erp/orders/{id}` | GET | Order details | Full order object |
| `/api/erp/orders/{id}/full-tracking` | GET | Order tracking | `order`, `driver`, `eta` |
| `/api/erp/orders/{id}/cancel` | PUT | Cancel order | `success`, `message` |

### Driver Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/v5/driver/{id}/dashboard` | GET | Earnings dashboard | `today`, `this_week`, `this_month` |
| `/api/drivers/{id}/documents` | GET | Document status | Array of document objects |
| `/api/drivers/{id}/status` | GET | Online status | `is_online`, `location` |
| `/api/drivers/{id}/active-order` | GET | Current delivery | Order object or null |
| `/api/orders/available` | GET | Available orders | Array of available orders |
| `/api/erp/orders/{id}/accept-delivery` | POST | Accept delivery | `success`, `order` |
| `/api/erp/orders/{id}/mark-picked-up` | POST | Mark picked up | `success`, `order` |
| `/api/erp/orders/{id}/mark-delivered` | POST | Mark delivered | `success`, `order` |

### Rideshare Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/rides/request` | POST | Create ride request | `request_id`, `status` |
| `/api/rides/request/{id}` | GET | Ride request details | Full ride request object |
| `/api/rides/request/{id}/bids` | GET | Get bids (Customer) | `request_id`, `bids[]`, `total_bids`, `bidding_open` |
| `/api/rides/request/{id}/bid` | POST | Submit bid (Driver) | `bid_id`, `status` |
| `/api/rides/bid/{id}/respond` | POST | Accept/reject bid | `success`, `status`, `driver` |
| `/api/rides/available` | GET | Available rides (Driver) | Array of ride requests |
| `/api/erp/rides/{id}/customer-negotiate` | GET/POST | Fare negotiation | `success`, `status`, `customer_offer`, `driver_offer`, `platform_fee_driver`, `platform_fee_customer` |
| `/api/erp/rides/{id}/customer-accept-fare` | GET/POST | Accept fare | `success`, `status`, `final_fare`, `platform_fee` |

### Vendor (Restaurant) Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/erp/orders/vendor/{id}` | GET | Restaurant orders | Array of orders with driver info |
| `/api/erp/orders/{id}/accept` | POST | Accept order | `success`, `order` |
| `/api/erp/orders/{id}/mark-ready` | POST | Mark ready | `success`, `order` |
| `/api/vendor/{id}/profile` | GET | Vendor profile | Vendor details |
| `/api/vendor/{id}/menu/items` | GET | Menu items | Array of items |

---

## 2. iOS App Functions by Tab

### Customer App (4 Tabs)

#### Home Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Load restaurants | `/api/vendors/published` | Display restaurant cards |
| Load categories | `/api/categories` | Show filter chips |
| Search restaurants | `/api/vendors/search?q=` | Filter results |
| View restaurant | `/api/vendors/{id}` | Navigate to menu |
| Add to cart | Local state | Update cart badge |

#### Search Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Search query | `/api/vendors/search` | Show matching results |
| Filter by cuisine | Local filter | Refine results |
| Sort by rating | Local sort | Reorder list |
| Recent searches | Local storage | Show history |

#### Orders Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Load orders | `/api/customer/{id}/orders` | Show order history |
| Order details | `/api/erp/orders/{id}` | Show full order |
| Track order | `/api/erp/orders/{id}/full-tracking` | Show map, driver, ETA |
| Rate driver | `/api/customer/orders/{id}/rate-driver` | Submit rating |
| Reorder | Local + create order | Add items to cart |

#### Profile Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Load profile | `/api/customer/{id}` | Show user info |
| Update profile | PUT `/api/customer/{id}` | Save changes |
| Payment methods | `/api/customer/{id}/payment-methods` | List cards |
| Addresses | `/api/customer/{id}/addresses` | List addresses |
| Logout | Clear tokens | Navigate to login |

### Driver App (4 Tabs)

#### Delivery Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Toggle online | POST `/api/drivers/{id}/status` | Update status |
| Available orders | `/api/orders/available` | Show delivery requests |
| Accept order | `/api/erp/orders/{id}/accept-delivery` | Claim delivery |
| Navigate to restaurant | Local maps | Open navigation |
| Mark picked up | `/api/erp/orders/{id}/mark-picked-up` | Update status |
| Mark delivered | `/api/erp/orders/{id}/mark-delivered` | Complete delivery |

#### Rideshare Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Available rides | `/api/rides/available` | Show ride requests |
| Submit bid | `/api/rides/request/{id}/bid` | Place bid |
| View accepted ride | `/api/rides/{id}` | Show ride details |
| Navigate to pickup | Local maps | Open navigation |
| Start ride | `/api/rides/{id}/start` | Begin trip |
| Complete ride | `/api/rides/{id}/complete` | End trip |

#### Active Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Current order | `/api/drivers/{id}/active-order` | Show active delivery |
| Order details | `/api/erp/orders/{id}` | Full order info |
| Customer contact | Local dialer | Call customer |
| Restaurant contact | Local dialer | Call restaurant |

#### Earnings Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Dashboard | `/api/v5/driver/{id}/dashboard` | Show earnings |
| Today earnings | `dashboard.today` | Today's stats |
| Weekly earnings | `dashboard.this_week` | Week stats |
| Monthly earnings | `dashboard.this_month` | Month stats |
| Ratings | `dashboard.ratings` | Show rating |

### Restaurant App (4 Tabs)

#### Orders Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Incoming orders | `/api/erp/orders/vendor/{id}` | Show new orders |
| Accept order | `/api/erp/orders/{id}/accept` | Move to preparing |
| Mark ready | `/api/erp/orders/{id}/mark-ready` | Ready for pickup |
| View driver | Order.driver | Show driver info |

#### Menu Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Menu items | `/api/vendor/{id}/menu/items` | List items |
| Add item | POST `/api/vendor/{id}/menu/items` | Create item |
| Edit item | PUT `/api/vendor/menu/items/{id}` | Update item |
| Toggle availability | PATCH item | Set available |

#### Analytics Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Dashboard | `/api/vendor/{id}/analytics` | Show stats |
| Revenue | Analytics.revenue | Show earnings |
| Orders count | Analytics.orders | Order metrics |
| Popular items | Analytics.popular | Top sellers |

#### Settings Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Profile | `/api/vendor/{id}/profile` | Vendor info |
| Hours | `/api/vendor/{id}/hours` | Operating hours |
| Notifications | Local settings | Push preferences |

---

## 3. Critical Field Mappings (iOS ↔ Backend)

### FareNegotiationResponse (CRITICAL - FIXED 2026-02-06)

**Production Response (VERIFIED):**
```json
{"success":true,"status":"counter_offer_sent","customer_offer":25.0,"driver_offer":null,"platform_fee_driver":1.0,"platform_fee_customer":1.0,"message":"Your counter-offer has been sent to the driver"}
```

**iOS Struct Must Match:**
```swift
struct FareNegotiationResponse: Codable {
    let success: Bool                // ✅ "success": true
    let status: String               // ✅ "status": "counter_offer_sent"
    let customerOffer: Double        // ✅ "customer_offer": 25.0
    let driverOffer: Double?         // ✅ "driver_offer": null
    let platformFeeDriver: Double    // ✅ "platform_fee_driver": 1.0 (REQUIRED!)
    let platformFeeCustomer: Double  // ✅ "platform_fee_customer": 1.0 (REQUIRED!)
    let message: String?             // ✅ "message": "Your counter-offer..."
}
```

**QA Validation Rule:** If `platform_fee_driver` or `platform_fee_customer` is missing, iOS will crash with "data couldn't be read".

### CustomerRideBidsResponse (CRITICAL)

**Production Response (VERIFIED):**
```json
{"request_id":1,"bids":[],"total_bids":0,"bidding_open":false,"bidding_ends_at":"2026-01-04T15:09:47.514000"}
```

**iOS Struct Must Match:**
```swift
struct CustomerRideBidsResponse: Codable {
    let requestId: Int              // ✅ "request_id": 1
    let bids: [RideBid]             // ✅ "bids": []
    let totalBids: Int              // ✅ "total_bids": 0
    let biddingOpen: Bool           // ✅ "bidding_open": false
    let biddingEndsAt: String?      // ✅ "bidding_ends_at": "2026-01-04T15:09:47.514000"
}
```

**QA Validation Rule:** All 5 fields must be present. Missing any field causes decode failure.

### Driver Earnings Dashboard

```swift
// iOS expects nested structure:
{
    "driver_id": "48",
    "today": {
        "deliveries": 0,
        "gross_earnings": 0.0,
        "base_pay": 0,
        "tips": 0,
        "bonuses": 0.0,
        "active_hours": 0.0
    },
    "this_week": { ... },
    "this_month": { ... },
    "ratings": {
        "average": 4.9,
        "overall": 4.9,
        "total_ratings": 155
    }
}
```

### Order Items Field Type

| Context | Field | Type | Notes |
|---------|-------|------|-------|
| Customer Orders | `items` | String (JSON) | Backend returns JSON string |
| Vendor Orders | `items` | Array | Backend returns array of objects |

---

## 4. Order Status Flow

```
pending_payment
    ↓
confirmed
    ↓
pending_restaurant
    ↓
preparing
    ↓
ready_for_pickup
    ↓
pending_delivery_decision
    ↓
[restaurant_will_deliver OR assigned_to_driver]
    ↓
out_for_delivery
    ↓
delivered
```

### Status Display Mapping

| Backend Status | Customer Display | Driver Display | Restaurant Display |
|----------------|------------------|----------------|-------------------|
| pending_payment | Processing... | - | - |
| confirmed | Order Confirmed | - | New Order |
| pending_restaurant | Sent to Restaurant | - | Incoming |
| preparing | Being Prepared | - | Preparing |
| ready_for_pickup | Ready for Pickup | Available | Ready |
| pending_delivery_decision | Finding Driver | Available | Waiting for Driver |
| assigned_to_driver | Driver Assigned | Your Delivery | Driver Assigned |
| out_for_delivery | On the Way | Delivering | Out for Delivery |
| delivered | Delivered | Completed | Completed |

---

## 5. Demo Credentials (App Store Review)

| App | Email | Password | User ID |
|-----|-------|----------|---------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! | 74 |
| Driver | demo.driver@dollor.ai | DemoDriver2025! | 48 |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! | 40 |

---

## 6. Pricing Model Validation

| Fee Type | Amount | Who Pays | Notes |
|----------|--------|----------|-------|
| Platform Fee (Food) | $1.00 | Customer | Per restaurant |
| Platform Fee (Ride ≤$35) | $1.00 | Customer | Tiered |
| Platform Fee (Ride $35-70) | $2.00 | Customer | Tiered |
| Platform Fee (Ride >$70) | $3.00 | Customer | Tiered |
| Restaurant Fee | $1.00 | Restaurant | Per restaurant |
| Driver Commission | 0% | - | Driver keeps 100% |

**Anti-Pattern Check:** Code should NOT contain:
- `commission = 0.15` or `15%`
- `platform_fee = subtotal * X`

---

## 7. TestFlight Build Numbers (PRODUCTION)

| App | Bundle ID | Build | Version | Uploaded |
|-----|-----------|-------|---------|----------|
| Customer | com.dollorai.customer | 1055 | 1.0 | 2026-02-08 15:31 |
| Driver | com.dollorai.delivery | **156** | 1.0 | 2026-02-08 15:33 |
| Restaurant | com.dollorai.restaurant | 130 | 1.0 | 2026-02-08 15:37 |

**QA Gate:** Build 156 includes:
- Smart error handling for driver bid blocking
- Logger fixes across all ViewModels
- Clean ride number format (RIDE2026000XXX)
- Driver busy check (prevents bidding with active ride/delivery)

---

## 7.5. Driver Bid Blocking Error Messages (NEW - 2026-02-09)

### Backend Error Messages (bid_routes.py)

| Condition | HTTP Code | Error Message |
|-----------|-----------|---------------|
| Active Ride (MATCHED/IN_PROGRESS) | 400 | "You have an active ride in progress. Complete your current ride before bidding on new requests." |
| Active Delivery (OUT_FOR_DELIVERY) | 400 | "You have an active delivery in progress. Complete your current delivery before bidding on rides." |

### iOS Smart Error Handling (RideBiddingViewModel.swift)

```swift
// Lines 200-205: Intelligent error categorization
let message = error.localizedDescription
if message.contains("active ride") || message.contains("active delivery") {
    // Backend message is clear and actionable
    self?.showErrorMessage(message)
} else {
    self?.showErrorMessage("Failed to submit bid: \(message)")
}
```

### Smart Alert Pattern (AvailableRideRequestsView.swift)

| Error Type | Alert Title | Primary Button | Secondary Button |
|------------|-------------|----------------|------------------|
| Active Ride | "Complete Active Ride First" | "View Active Work" | "OK" |
| Active Delivery | "Complete Delivery First" | "View Active Work" | "OK" |
| Other Errors | "Error" | "OK" | - |

### Error Flow Chain

```
Backend (bid_routes.py:702-719)
    ↓ HTTP 400 + detail message
P2PAPIService (5176-5177)
    ↓ P2PAPIError.serverError(detail)
RideBiddingViewModel (200-205)
    ↓ Detect blocking keywords
AvailableRideRequestsView (80-96)
    ↓ Smart alert with navigation
User Action: "View Active Work" button
```

### QA Validation Rules
- Backend MUST return `detail` field containing "active ride" or "active delivery" substring
- iOS MUST use `.contains()` check, NOT exact string match
- Alert MUST provide navigation option to active work
- User MUST be able to complete active work before retrying bid

---

## 8. Agent-Specific Validation Rules

### Agent 1: API Testing
```bash
# Test all auth endpoints return correct fields
curl -X POST $API/api/auth/customer/login | jq '.access_token, .customer_id'
curl -X POST $API/api/auth/driver/login | jq '.access_token, .driver_id'
curl -X POST $API/api/auth/vendor/login | jq '.access_token, .vendor_id'
```

### Agent 5: Security (OWASP)
```bash
# Check for secrets in code
grep -rn "sk_live_\|pk_live_\|AIza" --include="*.swift"
# Check for insecure storage
grep -rn "UserDefaults.*token" --include="*.swift"
# Check for HTTP (not HTTPS)
grep -rn '"http://' --include="*.swift" | grep -v "https"
```

### Agent 12: Field Mapping
```swift
// Required fields that MUST exist in backend response:
// FareNegotiationResponse: platform_fee_driver, platform_fee_customer
// CustomerRideBidsResponse: request_id, bids, total_bids, bidding_open
// AcceptedDriverInfo: vehicle_photo_url, license_plate, rating
```

### Agent 16: Order Lifecycle
```bash
# Full order flow test
1. Customer login
2. Get restaurants
3. Get menu
4. Create order (verify demo payment bypass)
5. Check order status = confirmed
6. Vendor accept order
7. Vendor mark ready
8. Driver accept delivery
9. Driver mark picked up
10. Driver mark delivered
11. Customer rate driver
```

### Agent 21: API Contract
```
# Known iOS vs Android differences:
| Endpoint | iOS Path | Android Path |
|----------|----------|--------------|
| Apple Auth | /customer/apple-auth | /auth/customer/apple-auth |
| Create Order | /erp/orders/create | /orders/create |
| Track Ride | /erp/rides/{id}/track | /rides/{id}/track |
| Cancel Ride | /erp/rides/{id}/cancel | /rides/request/{id}/cancel |
```

---

## 9. Quick Validation Commands

```bash
# Health check
curl -s https://api.dollor.ai/health | jq '.version, .status'

# Customer login test
curl -s -X POST https://api.dollor.ai/api/auth/customer/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!" | jq '.access_token'

# Negotiate endpoint test (CRITICAL)
curl -s "https://api.dollor.ai/erp/rides/1/customer-negotiate?proposed_fare=25" | jq '.platform_fee_driver, .platform_fee_customer'

# Bids endpoint test
curl -s "https://api.dollor.ai/api/rides/request/1/bids" | jq '.request_id, .total_bids, .bidding_open'

# Driver dashboard test
curl -s "https://api.dollor.ai/api/v5/driver/48/dashboard" | jq '.today, .this_week, .this_month'
```

---

## 10. Common Failure Patterns

| Error | Root Cause | Fix |
|-------|------------|-----|
| "data couldn't be read" | Missing required field in JSON | Add missing field to backend response |
| "keyNotFound" | Field name mismatch (camelCase vs snake_case) | Use CodingKeys in Swift struct |
| "typeMismatch" | Int returned as String or vice versa | Match exact types |
| "404 Not Found" | Wrong endpoint path | Check iOS vs Android path differences |
| "401 Unauthorized" | Missing or invalid token | Verify token format: "Bearer {token}" |

---

## 11. File Locations

| Component | Path |
|-----------|------|
| iOS API Service | `/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` |
| Backend Main | `/apps/web/p2p-platform/backend/main_new.py` |
| Backend Bid Routes | `/apps/web/p2p-platform/backend/bid_routes.py` |
| Customer App | `/apps/ios/customer/` |
| Driver App | `/apps/ios/delivery/` |
| Restaurant App | `/apps/ios/restaurant/` |
| QA Agents | `/.claude/agents/` |
| TestFlight Guide | `/apps/ios/TESTFLIGHT_BUILD_GUIDE.md` |

---

*Generated for Dollor.ai QA Team - Updated February 6, 2026*
