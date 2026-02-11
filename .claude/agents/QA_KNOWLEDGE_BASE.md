# Dollor.ai QA Knowledge Base

> **Last Updated:** February 11, 2026 @ 03:15 PST (29-Agent QA System)
> **Backend Version:** 1.0.18
> **Production API:** https://api.dollor.ai
> **Staging API:** https://d3kuu45w6kl8hr.cloudfront.net
> **Source:** All data captured from PRODUCTION API responses

---

## Production API Status (LIVE DATA)

| Metric | Value | Verified |
|--------|-------|----------|
| Status | healthy | ✅ 2026-02-11 |
| Database | connected | ✅ 2026-02-11 |
| Version | 1.0.18 | ✅ DEPLOYED |
| Build | 2026-02-11-negotiation-round-fix | ✅ DEPLOYED |

**Raw Production Response:**
```json
{"status":"healthy","service":"p2p-backend","version":"1.0.18","build":"2026-02-11-negotiation-round-fix","timestamp":"2026-02-11T03:12:46.527846","database":"connected"}
```

---

## 29 Cross-Platform QA Agents Reference

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
| 13 | Driver App Validator | 5 tabs, all flows | iOS/Android | UI validation |
| 14 | Customer App Validator | 4-5 tabs, all flows | iOS/Android | UI validation |
| 15 | Restaurant App Validator | 5 tabs, order management | iOS/Android | UI validation |
| 16 | Order Lifecycle | Full order status flow | All | E2E test |
| 17 | API Documentation | Endpoints documented | All | OpenAPI check |
| 18 | Driver Details Flow | Photo, vehicle, rating | All | field trace |
| 19 | Deployment Readiness | Health, version, database | Production | health checks |
| 20 | TestFlight/Play Store | Build configs, signing | iOS/Android | fastlane/gradle |
| 21 | API Contract Validator | iOS vs Android vs Backend | All | struct compare |
| 22 | Data Type Validator | Types consistent cross-platform | All | type analysis |
| 23 | QA Challenger (FINAL GATE) | Demands evidence, blocks deploy | All | `qa-challenger-agent.sh` |
| 24 | Cross-Platform Validator | Button actions, timing, paths | All | `agent-24-cross-platform-validator.md` |
| 25 | Error Message Consistency | User-friendly patterns, no raw errors | iOS/Android | pattern audit |
| 26 | Logger Compliance | os.Logger, no print(), subsystem | iOS | grep validation |
| 27 | Bid Negotiation Flow | Multi-round counters, max rounds | All | E2E flow test |
| 28 | Push Notification | Bid/order notifications | All | APNs/FCM test |
| 29 | Smart Error UX | Blocking errors with navigation | iOS/Android | UX validation |

**Full Documentation**: `.planning/CROSS_PLATFORM_QA_AGENTS.md`

---

## Cross-Platform Error Message Consistency (Agent 25)

### Summary (2026-02-11 QA Run)

| App | Total Patterns | User-Friendly | Technical | % User-Friendly | Rating |
|-----|---------------|---------------|-----------|-----------------|--------|
| Customer | 48 | 46 | 2 | 96% | 9.0/10 |
| Driver | 37 | 36 | 1 | 97% | 9.5/10 |
| Restaurant | 30 | 28 | 2 | 93% | 9.0/10 |
| **Total** | **115** | **110** | **5** | **96%** | **9.2/10** |

### Consistent Patterns Across All Apps

| Pattern | Customer | Driver | Restaurant |
|---------|----------|--------|------------|
| `@Published var errorMessage: String?` | ✅ | ✅ | ✅ |
| `@Published var showError = false` | ✅ | ✅ | ✅ |
| `showErrorMessage(_:)` helper | ✅ | ✅ | ✅ |
| Alert presentation pattern | ✅ | ✅ | ✅ |
| Context prefix ("Failed to X:") | ✅ | ✅ | ✅ |

### Error Message Style Guide

All apps follow these patterns:
1. **Validation errors**: "Please [action]" (e.g., "Please enter a valid email")
2. **State errors**: "[State]. [Suggestion]" (e.g., "No active ride to cancel")
3. **API failures**: "Failed to [action]: [error]" (e.g., "Failed to submit bid: ...")
4. **Auth errors**: "Please log in to [action]" (e.g., "Please login to request a ride")

**Cross-App Consistency Score: 9.5/10**

---

## Logger Compliance Summary (Agent 26)

| App | Files with Logger | Files with print() | Subsystem | Compliance |
|-----|-------------------|-------------------|-----------|------------|
| Customer | 22 | 0 | com.dollorai.customer | 100% |
| Driver | 12 | 3 (19 prints, DEBUG-only) | com.dollorai.delivery | 95% |
| Restaurant | 12 | 0 | com.dollorai.restaurant | 100% |

**Standard Pattern:**
```swift
import os
private let logger = Logger(subsystem: "com.dollorai.{app}", category: "{FileName}")
```

**Minor Issues (P3):**
- Driver app: 19 print() statements in 3 files (all #if DEBUG wrapped)
- Some Services use Bundle.main.bundleIdentifier fallback

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

### Rideshare Bidding Rules (v1.0.14)

| Rule | Value | Enforcement |
|------|-------|-------------|
| Max bids per ride | 10 | ✅ Backend enforced |
| Bid expiry | 10 minutes | ✅ Auto-expired on next bid |
| Same driver duplicate bid | 1 per ride | ✅ Backend enforced |
| Driver can bid while busy | No | ✅ Backend enforced |

**Bid Lifecycle:**
```
PENDING (10 min) → ACCEPTED (customer accepts)
                → REJECTED (customer rejects)
                → COUNTERED (customer counter-offers)
                → EXPIRED (no response in 10 min)
```

**Error Messages (Driver App):**
| Scenario | Message |
|----------|---------|
| Max bids reached | `"This ride has reached the maximum of 10 active bids. Try another ride request."` |
| Bid expired | `"Bid expired (no response within 10 minutes)"` |
| Already has bid | `"You already have a pending bid on this request. Update or withdraw it first."` |
| Driver busy (ride) | `"You have an active ride in progress. Complete your current ride before bidding."` |
| Driver busy (delivery) | `"You have an active delivery in progress. Complete your current delivery before bidding on rides."` |
| Bidding closed | `"Bidding window has closed"` |

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

### Driver App (5 Tabs) - Updated 2026-02-10

**Bundle ID:** `com.dollorai.delivery`
**Current Build:** 165
**Main Entry:** `DriverDashboardView.swift`

#### Tab Structure (DriverDashboardView.swift lines 15-55)

| Tab | Index | Icon | View | ViewModel |
|-----|-------|------|------|-----------|
| Delivery | 0 | `bag.fill` | `AvailableOrdersView` | `DeliveryViewModel` |
| Rideshare | 1 | `car.fill` | `RideshareDashboardView` | `RideBiddingViewModel` |
| Active | 2 | `location.fill` | `PickupDropoffView` | `DeliveryViewModel` |
| Messages | 3 | `message.fill` | `ConversationsListView` | `ChatManager` |
| Profile | 4 | `person.crop.circle.fill` | `DriverProfileView` | `DriverProfileViewModel` |

#### Tab 0: Delivery Tab (Food Orders)
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Fetch available orders | `GET /api/orders/available` | Show orders with status `ready_for_pickup` |
| Accept order | `POST /api/erp/orders/{id}/accept-delivery` | Claim delivery, calculates driver ETA |
| Mark picked up | `POST /api/erp/orders/{id}/mark-picked-up` | Status → `out_for_delivery` |
| Mark delivered | `POST /api/erp/orders/{id}/mark-delivered` | Status → `delivered`, stops tracking |
| Cancel delivery | `DELETE /api/erp/orders/{id}/cancel-delivery` | Unassign driver |
| Update location | `PUT /api/erp/orders/{id}/driver-location` | Real-time tracking (throttled 3s) |
| Toggle online | `POST /api/drivers/{id}/status` | Update driver availability |

**DeliveryViewModel Key Properties (line 12-38):**
- `availableOrders: [Order]` - Orders ready for pickup
- `myDeliveries: [Order]` - Driver's active deliveries
- `todayEarnings: Double` - Today's gross earnings
- `isOnline: Bool` - Driver availability status

#### Tab 1: Rideshare Tab (P2P Bidding)
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Fetch available rides | `GET /api/rides/available` | Show ride requests open for bidding |
| Submit bid | `POST /api/rides/request/{id}/bid` | Place competitive bid |
| Fetch my bids | `GET /api/drivers/{id}/bids` | Show pending/accepted/countered bids |
| Accept counter-offer | `POST /api/rides/bid/{id}/respond` (action: accept) | Accept customer's price |
| Reject counter-offer | `POST /api/rides/bid/{id}/respond` (action: reject) | Decline and remove bid |
| Counter customer | `POST /api/rides/bid/{id}/respond` (action: counter) | Send new price |
| Start ride | `POST /api/rides/{id}/start` | Begin trip, start tracking |
| Complete ride | `POST /api/rides/{id}/complete` | End trip, calculate earnings |
| Withdraw bid | `DELETE /api/rides/bid/{id}` | Cancel pending bid |

**RideBiddingViewModel Key Properties (line 12-43):**
- `availableRequests: [RideRequestForBidding]` - Rides open for bidding
- `myBids: [RideBid]` - Driver's submitted bids
- `pendingBids` - Bids with status "pending"
- `counteredBids` - Bids with status "countered" (shows badge on Rideshare tab)

**Smart Error Handling (line 197-208):**
```swift
if message.contains("active ride") || message.contains("active delivery") {
    self?.showErrorMessage(message)  // Backend message is clear
} else {
    self?.showErrorMessage("Failed to submit bid: \(message)")
}
```

#### Tab 2: Active Tab (Current Work)
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| View active delivery | `DeliveryViewModel.myDeliveries` | Show orders in progress |
| Full screen map | `ActiveDeliveryFullScreen` | Status-aware pickup/delivery view |
| Navigate to location | Apple Maps deeplink | Open directions |
| Chat with customer | `ChatManager` | In-app messaging |
| Call customer | `tel://` URL scheme | Phone call |

**CRITICAL FIX - Build 165: isPickedUp Pattern (MyDeliveriesView.swift line 766-768)**
```swift
private var isPickedUp: Bool {
    let status = OrderStatus.from(order.status)
    return status == .outForDelivery || status == .restaurantWillDeliver
}
```

**Status-Aware UI Behavior:**
| isPickedUp | Header Text | ETA To | Map Highlight | Action Button |
|------------|-------------|--------|---------------|---------------|
| `false` | "Picking up from" + Restaurant | Restaurant | Restaurant (orange, large) | "Confirm Pickup" |
| `true` | "Delivering to" + Customer | Customer | Customer (green, large) | "Complete Delivery" |

**Before Fix:** Always showed "Delivering to Customer" even during pickup phase
**After Fix:** Shows correct destination based on order status

#### Tab 3: Messages Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| List conversations | `ChatManager` | Show all customer chats |
| Unread badge | `ChatManager.unreadCount` | Badge on Messages tab |
| Send message | Real-time chat | Deliver to customer |
| Order context | Order ID in chat | Link to related order |

#### Tab 4: Profile Tab
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| View profile | `GET /api/drivers/{id}` | Driver info |
| Upload documents | `POST /api/drivers/{id}/documents` | License, insurance |
| Update vehicle | `PUT /api/drivers/{id}/vehicle` | Vehicle info |
| View earnings | `GET /api/v5/driver/{id}/dashboard` | Stats summary |
| Logout | Clear tokens | Return to login |

**Earnings Dashboard Response (from `/api/v5/driver/{id}/dashboard`):**
```json
{
    "driver_id": "48",
    "today": {
        "deliveries": 5,
        "gross_earnings": 87.50,
        "tips": 25.00,
        "active_hours": 4.5
    },
    "this_week": { "deliveries": 23, "gross_earnings": 412.00 },
    "this_month": { "deliveries": 89, "gross_earnings": 1650.00 },
    "ratings": { "average": 4.9, "total_ratings": 155 }
}
```

#### Driver App File Structure
```
apps/ios/delivery/eatffairdelivery/
├── DriverDashboardView.swift          # Main tab container (5 tabs)
├── DriverLoginView.swift              # Authentication
├── Views/
│   ├── AvailableOrdersView.swift      # Tab 0: Food delivery orders
│   ├── MyDeliveriesView.swift         # Tab 2: Active deliveries + ActiveDeliveryFullScreen
│   ├── PickupDropoffView.swift        # Pickup/dropoff workflow
│   ├── DriverProfileView.swift        # Tab 4: Profile
│   ├── ChatView.swift                 # Messaging
│   └── Rideshare/
│       ├── RideshareDashboardView.swift       # Tab 1: Rideshare home
│       ├── AvailableRideRequestsView.swift    # Browse ride requests
│       ├── SubmitBidSheet.swift               # Bid submission
│       └── MyBidsView.swift                   # My bids list
├── ViewModels/
│   ├── DeliveryViewModel.swift        # Food delivery logic (763 lines)
│   ├── RideBiddingViewModel.swift     # Rideshare bidding (466 lines)
│   ├── EarningsViewModel.swift        # Earnings dashboard
│   └── DriverProfileViewModel.swift   # Profile management
└── Services/
    ├── AuthManager.swift              # Authentication
    ├── ChatManager.swift              # Real-time messaging
    └── LocationManager.swift          # GPS tracking
```

#### Driver App Critical Fixes (Build 165)

| Issue | File | Lines | Fix |
|-------|------|-------|-----|
| Wrong header during pickup | MyDeliveriesView.swift | 766-768 | Added `isPickedUp` computed property |
| ETA to wrong location | MyDeliveriesView.swift | 801-825 | Calculate ETA to restaurant OR customer |
| Map highlighting wrong dest | MyDeliveriesView.swift | 976-1018 | Dynamic marker sizing based on status |
| Wrong action button | MyDeliveriesView.swift | 899-925 | "Confirm Pickup" vs "Complete Delivery" |
| Driver accepting while busy | Backend bid_routes.py | 702-719 | Busy check for ALL active statuses |

#### Driver Busy Check Protection Matrix (Backend v1.0.13)

| Current Status | Can Accept Food Order | Can Submit Ride Bid |
|----------------|----------------------|---------------------|
| PREPARING | ❌ Blocked | ❌ Blocked |
| READY_FOR_PICKUP | ❌ Blocked | ❌ Blocked |
| OUT_FOR_DELIVERY | ❌ Blocked | ❌ Blocked |
| MATCHED (ride) | ❌ Blocked | ❌ Blocked |
| IN_PROGRESS (ride) | ❌ Blocked | ❌ Blocked |
| None active | ✅ Allowed | ✅ Allowed |

#### Driver App Dead Code Analysis (2026-02-10)

**Total Driver App Code:** 18,474 lines
**Dead Code Identified:** ~764 lines (4.1%)
**Backup Location:** `apps/ios/delivery/.dead-code-backup/`

| File | Dead Lines | Status | Reason |
|------|-----------|--------|--------|
| DriverDashboardView.swift | 89-494 (~385) | ⚠️ DEAD | HomeTabView never used |
| DriverStatsCard.swift | Entire (181) | ⚠️ DEAD | Only used by HomeTabView |
| TipNotificationView.swift | Entire (173) | ⚠️ DEAD | Only used by HomeTabView |

**Dead Components in DriverDashboardView.swift:**

| Component | Lines | Used By |
|-----------|-------|---------|
| HomeTabView | 89-215 | ❌ Nothing (was 6th tab, replaced) |
| PendingApprovalBanner | 218-277 | ❌ Only HomeTabView |
| OnlineStatusCard | 280-314 | ❌ Only HomeTabView |
| TodaysEarningsCard | 317-356 | ❌ Only HomeTabView |
| StatBubble | 358-377 | ❌ Only TodaysEarningsCard |
| ActiveDeliveryCard | 380-438 | ❌ Only HomeTabView |
| CompactOrderCard | 441-469 | ❌ Only HomeTabView |
| EmptyStateView | 472-494 | ❌ Only HomeTabView |

**Duplicate Code Found:**

| Function | File | Lines | Issue |
|----------|------|-------|-------|
| openInMaps() | MyDeliveriesView.swift | 428-433, 678-683 | Identical 6-line function duplicated |
| formatDistance() | RideBiddingViewModel.swift + LocationManager.swift | Multiple | Duplicate utility |
| formatETA() | RideBiddingViewModel.swift + LocationManager.swift | Multiple | Duplicate utility |

**Verification Completed:**
- [x] No EatFairShared dependencies
- [x] No Customer/Restaurant app dependencies
- [x] No test file dependencies
- [x] No dynamic string references
- [x] Current 5-tab structure verified working

#### Driver App QA Audit Results (2026-02-10)

**24-Agent QA Run:** PASSED (9.0/10 quality score)
**Full Report:** `.planning/quick/006-driver-app-24-agent-qa/006-REPORT.md`

| Focus Area | Result | Rating |
|------------|--------|--------|
| Error Message Consistency | 98% user-friendly (125/127) | 9.5/10 |
| Driver Bid Blocking Flow | World-class smart UX | 10/10 |
| Logger Pattern Compliance | 4/4 ViewModels (100%) | 9/10 |
| API Contract Alignment | 21/21 endpoints verified | 10/10 |

**Smart Error Detection Pattern (RideBiddingViewModel.swift:197-208):**
```swift
if message.contains("active ride") || message.contains("active delivery") {
    self?.showErrorMessage(message)  // Backend message passes through
} else {
    self?.showErrorMessage("Failed to submit bid: \(message)")
}
```

**Smart Alert UX (RideshareDashboardView.swift:153-180):**
- `hasActiveRide` → Alert title: "Complete Active Ride First"
- `hasActiveDelivery` → Alert title: "Complete Delivery First"
- "View Active Work" button → Navigates to Active tab

**Logger Compliance:**
| ViewModel | Logger | Subsystem | Status |
|-----------|--------|-----------|--------|
| RideBiddingViewModel | ✅ | com.dollorai.delivery | COMPLIANT |
| DeliveryViewModel | ✅ | com.dollorai.delivery | COMPLIANT |
| EarningsViewModel | ✅ | com.dollorai.delivery | COMPLIANT |
| DriverProfileViewModel | ✅ | com.dollorai.delivery | COMPLIANT |

**P3 Minor Items (Non-Blocking):**
- 18 print() statements in DeliveryViewModel (all DEBUG-only)
- 4 raw error.localizedDescription in DriverProfileViewModel

**Backend Contract Dependency:**
iOS smart alerts depend on backend error messages containing "active ride" or "active delivery". Changes to these strings in bid_routes.py or order_flow.py require iOS coordination.

### Restaurant App (5 Tabs) - Updated 2026-02-10

**Total Lines:** 11,411
**Build:** 140 (on TestFlight)
**Main File:** `EnhancedDashboardView.swift` (1,691 lines)

#### 5-Tab Structure (EnhancedDashboardView.swift:15-50)
```swift
TabView(selection: $selectedTab) {
    OrdersDashboardView(ordersVM: ordersVM)     // Tab 0: Orders
    EnhancedMenuView()                           // Tab 1: Menu
    AnalyticsView(ordersVM: ordersVM)           // Tab 2: Analytics
    AIInsightsView(ordersVM: ordersVM)          // Tab 3: AI
    RestaurantSettingsView()                     // Tab 4: Settings
}
```

#### Restaurant App File Structure

| File | Lines | Purpose |
|------|-------|---------|
| EnhancedDashboardView.swift | 1,691 | Main 5-tab container + OrdersDashboard |
| RestaurantSettingsView.swift | 1,419 | Settings, payout config |
| AIEmployeesView.swift | 1,152 | AI employee configuration |
| LoginView.swift | 1,079 | Vendor login/registration |
| RestaurantRegistrationView.swift | 1,072 | New vendor registration |
| EnhancedMenuView.swift | 1,053 | Menu management |
| AIInsightsView.swift | 686 | AI-powered insights |
| KOTSettingsView.swift | 605 | Kitchen Order Ticket settings |
| OrdersViewModel.swift | 600 | Order state management |
| RestaurantDocumentsView.swift | 574 | Document uploads |
| AnalyticsView.swift | 523 | Business analytics |
| AnalyticsViewModel.swift | 374 | Analytics state |

#### Logger Compliance (12 files - 100%)

| File | Logger | Subsystem | Status |
|------|--------|-----------|--------|
| EnhancedDashboardView | ✅ | com.dollorai.restaurant | COMPLIANT |
| OrdersViewModel | ✅ | com.dollorai.restaurant | COMPLIANT |
| AnalyticsViewModel | ✅ | com.dollorai.restaurant | COMPLIANT |
| AIInsightsViewModel | ✅ | com.dollorai.restaurant | COMPLIANT |
| LoginView | ✅ | com.dollorai.restaurant | COMPLIANT |
| RestaurantSettingsView | ✅ | com.dollorai.restaurant | COMPLIANT |
| EnhancedMenuView | ✅ | com.dollorai.restaurant | COMPLIANT |
| KOTSettingsView | ✅ | com.dollorai.restaurant | COMPLIANT |
| RestaurantDocumentsView | ✅ | com.dollorai.restaurant | COMPLIANT |
| ContentView | ✅ | com.dollorai.restaurant | COMPLIANT |
| Persistence | ✅ | com.dollorai.restaurant | COMPLIANT |
| eatffairrestaurantApp | ✅ | com.dollorai.restaurant | COMPLIANT |

#### Orders Tab (Tab 0)
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Incoming orders | `/api/erp/orders/vendor/{id}` | Show new orders |
| Accept order | `/api/erp/orders/{id}/accept` | Move to preparing |
| Mark ready | `/api/erp/orders/{id}/mark-ready` | Ready for pickup |
| Self-deliver | `/api/erp/orders/{id}/accept-delivery` | Restaurant delivers |
| Send to driver | `/api/erp/orders/{id}/decline-delivery` | Driver pool delivery |
| Mark delivered | `/api/erp/orders/{id}/delivered` | Complete self-delivery |
| View driver | Order.driver | Show driver info |

#### Menu Tab (Tab 1)
| Function | API Endpoint | Expected Behavior |
|----------|--------------|-------------------|
| Menu items | `/api/vendor/{id}/menu/items` | List items |
| Add item | POST `/api/vendor/{id}/menu/items` | Create item |
| Edit item | PUT `/api/vendor/menu/items/{id}` | Update item |
| Toggle availability | PATCH item | Set available |

#### Analytics Tab (Tab 2)
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
| Customer | com.dollorai.customer | 1060 | 1.0 | 2026-02-10 |
| Driver | com.dollorai.delivery | **168** | 1.0 | 2026-02-11 |
| Restaurant | com.dollorai.restaurant | 140 | 1.0 | 2026-02-10 |

**QA Gate:** Build 168 includes:
- Smart error handling for driver bid blocking
- Logger fixes across all ViewModels
- Clean ride number format (RIDE2026000XXX)
- Driver busy check (prevents bidding with active ride/delivery)
- **ActiveDeliveryFullScreen fix** - isPickedUp pattern for status-aware UI

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

*Generated for Dollor.ai QA Team - Updated February 11, 2026*
*29-Agent QA System v4.2.0*
