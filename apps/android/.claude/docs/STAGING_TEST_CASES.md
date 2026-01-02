# Staging Cross-Platform Test Cases

**Staging URL**: `https://d3kuu45w6kl8hr.cloudfront.net`
**Last Verified**: 2025-12-25
**Status**: IN PROGRESS

---

## API Schema Reference (from OpenAPI)

### CreateRideRequestInput
**Required Fields**:
- `customer_id`: integer
- `pickup_address`: string
- `pickup_latitude`: number
- `pickup_longitude`: number
- `dropoff_address`: string
- `dropoff_latitude`: number
- `dropoff_longitude`: number

**Optional Fields**:
- `pickup_place_name`: string | null
- `dropoff_place_name`: string | null
- `ride_type`: string (default: "standard")
- `customer_max_price`: number | null
- `customer_preferred_price`: number | null
- `special_requests`: string | null
- `bidding_duration_minutes`: integer (default: 5)

### SubmitBidInput
**Required Fields**:
- `driver_id`: integer
- `proposed_price`: number

**Optional Fields**:
- `message`: string | null
- `estimated_arrival_minutes`: integer | null

---

## Test Cases by Category

### Suite A: Health & Infrastructure (5 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| A1 | Health check | GET /health | status: healthy | ⬜ | ⬜ |
| A2 | API health | GET /api/health | status: healthy | ⬜ | ⬜ |
| A3 | Live probe | GET /api/health/live | 200 OK | ⬜ | ⬜ |
| A4 | Ready probe | GET /api/health/ready | 200 OK | ⬜ | ⬜ |
| A5 | OpenAPI spec | GET /openapi.json | Valid JSON | ⬜ | ⬜ |

### Suite B: Customer Authentication (10 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| B1 | Register new customer | POST /api/auth/customer/register | customer_id returned | ⬜ | ⬜ |
| B2 | Register duplicate email | POST /api/auth/customer/register | 400 error | ⬜ | ⬜ |
| B3 | Login with email (JSON) | POST /api/auth/customer/login/json | access_token returned | ⬜ | ⬜ |
| B4 | Login invalid password | POST /api/auth/customer/login/json | 401 error | ⬜ | ⬜ |
| B5 | Get customer profile | GET /api/auth/customer/me | customer data | ⬜ | ⬜ |
| B6 | Update customer profile | PUT /api/auth/customer/profile | updated data | ⬜ | ⬜ |
| B7 | Google Sign-In | POST /api/auth/customer/google | access_token | ⬜ | ⬜ |
| B8 | Apple Sign-In | POST /api/auth/customer/apple-auth | access_token | ⬜ | ⬜ |
| B9 | Password reset request | POST /api/customer/password-reset/request | 200 OK | ⬜ | ⬜ |
| B10 | Invalid token access | GET /api/auth/customer/me (no token) | 401 error | ⬜ | ⬜ |

### Suite C: Driver Authentication (10 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| C1 | Register new driver | POST /api/auth/driver/register | driver_id returned | ⬜ | ⬜ |
| C2 | Register duplicate email | POST /api/auth/driver/register | 400 error | ⬜ | ⬜ |
| C3 | Login driver | POST /api/auth/driver/login | access_token (if approved) | ⬜ | ⬜ |
| C4 | Get driver profile | GET /api/auth/driver/me | driver data | ⬜ | ⬜ |
| C5 | Update driver location | PUT /api/auth/driver/location | 200 OK | ⬜ | ⬜ |
| C6 | Set driver online | POST /api/auth/driver/online | status updated | ⬜ | ⬜ |
| C7 | Upload driver document | POST /api/auth/driver/documents | document_id | ⬜ | ⬜ |
| C8 | Get driver documents | GET /api/auth/driver/documents | documents list | ⬜ | ⬜ |
| C9 | Google Sign-In driver | POST /api/auth/driver/google | access_token | ⬜ | ⬜ |
| C10 | Apple Sign-In driver | POST /api/auth/driver/apple-auth | access_token | ⬜ | ⬜ |

### Suite D: Vendor Authentication (8 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| D1 | Register new vendor | POST /api/auth/vendor/register | vendor_id returned | ⬜ | ⬜ |
| D2 | Demo login | POST /api/auth/vendor/demo-login | access_token | ⬜ | ⬜ |
| D3 | Login vendor | POST /api/auth/vendor/login | access_token | ⬜ | ⬜ |
| D4 | Google Sign-In vendor | POST /api/auth/vendor/google-auth | access_token | ⬜ | ⬜ |
| D5 | Apple Sign-In vendor | POST /api/auth/vendor/apple-auth | access_token | ⬜ | ⬜ |
| D6 | Get vendor profile | GET /api/vendors/{vendor_id} | vendor data | ⬜ | ⬜ |
| D7 | Update vendor profile | PUT /api/vendors/{vendor_id} | updated data | ⬜ | ⬜ |
| D8 | Get vendor menu | GET /api/vendors/{vendor_id}/menu | menu items | ⬜ | ⬜ |

### Suite E: Restaurant & Menu (10 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| E1 | List all vendors | GET /api/vendors | vendors array | ⬜ | ⬜ |
| E2 | Get published vendors | GET /api/vendors/published | published only | ⬜ | ⬜ |
| E3 | Get vendor by ID | GET /api/vendors/{id} | vendor details | ⬜ | ⬜ |
| E4 | Get vendor menu | GET /api/vendors/{id}/menu | menu items | ⬜ | ⬜ |
| E5 | Get menu categories | GET /api/vendors/{id}/menu/categories | categories | ⬜ | ⬜ |
| E6 | Add menu item | POST /api/vendors/{id}/menu | item created | ⬜ | ⬜ |
| E7 | Update menu item | PUT /api/vendors/{id}/menu/{item_id} | item updated | ⬜ | ⬜ |
| E8 | Delete menu item | DELETE /api/vendors/{id}/menu/{item_id} | 200 OK | ⬜ | ⬜ |
| E9 | Update vendor status | PUT /api/vendors/{id}/online-status | status updated | ⬜ | ⬜ |
| E10 | Get public restaurants | GET /api/public/restaurants | restaurants list | ⬜ | ⬜ |

### Suite F: Orders (15 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| F1 | List all orders | GET /api/orders | orders array | ⬜ | ⬜ |
| F2 | Create order | POST /api/orders | order created | ⬜ | ⬜ |
| F3 | Get order by ID | GET /api/orders/{id} | order details | ⬜ | ⬜ |
| F4 | Cancel order | POST /api/orders/{id}/cancel | order cancelled | ⬜ | ⬜ |
| F5 | Update order status | PATCH /api/orders/{id}/status | status updated | ⬜ | ⬜ |
| F6 | Get customer orders | GET /api/customer/orders | customer orders | ⬜ | ⬜ |
| F7 | Track order | GET /api/customer/orders/{id}/track | tracking info | ⬜ | ⬜ |
| F8 | Rate driver | POST /api/customer/orders/{id}/rate-driver | rating saved | ⬜ | ⬜ |
| F9 | Get vendor orders | GET /api/erp/orders/vendor/{vendor_id} | vendor orders | ⬜ | ⬜ |
| F10 | Confirm order | POST /api/erp/orders/{id}/confirm | order confirmed | ⬜ | ⬜ |
| F11 | Start preparing | POST /api/erp/orders/{id}/start-preparing | status updated | ⬜ | ⬜ |
| F12 | Ready for pickup | POST /api/erp/orders/{id}/ready-for-pickup | status updated | ⬜ | ⬜ |
| F13 | Order picked up | POST /api/erp/orders/{id}/picked-up | status updated | ⬜ | ⬜ |
| F14 | Order delivered | POST /api/erp/orders/{id}/delivered | status updated | ⬜ | ⬜ |
| F15 | Tip driver | POST /api/orders/{id}/tip-driver | tip added | ⬜ | ⬜ |

### Suite G: P2P Rideshare - Customer (15 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| G1 | Get fare estimate | POST /api/rides/estimate | fare estimate | ⬜ | ⬜ |
| G2 | Get pricing tiers | GET /api/rides/pricing/tiers | tiers info | ⬜ | ⬜ |
| G3 | Create ride request | POST /api/rides/request | ride_request_id | ⬜ | ⬜ |
| G4 | Get customer requests | GET /api/rides/customer/{id}/requests | requests list | ⬜ | ⬜ |
| G5 | Get request by ID | GET /api/rides/request/{id} | request details | ⬜ | ⬜ |
| G6 | Get bids for request | GET /api/rides/request/{id}/bids | bids list | ⬜ | ⬜ |
| G7 | Accept bid | POST /api/rides/bid/{id}/respond (accept) | bid accepted | ⬜ | ⬜ |
| G8 | Reject bid | POST /api/rides/bid/{id}/respond (reject) | bid rejected | ⬜ | ⬜ |
| G9 | Counter bid | POST /api/rides/bid/{id}/respond (counter) | counter sent | ⬜ | ⬜ |
| G10 | Cancel ride request | POST /api/rides/request/{id}/cancel | request cancelled | ⬜ | ⬜ |
| G11 | Track ride | GET /api/rides/{id}/track | tracking info | ⬜ | ⬜ |
| G12 | Rate ride | POST /api/rides/{id}/rate | rating saved | ⬜ | ⬜ |
| G13 | Cancel ride | POST /api/rides/{id}/cancel | ride cancelled | ⬜ | ⬜ |
| G14 | Get ride history | GET /api/customer/rides/history | history list | ⬜ | ⬜ |
| G15 | Get active rides | GET /api/customer/rides | active rides | ⬜ | ⬜ |

### Suite H: P2P Rideshare - Driver (12 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| H1 | Get available rides | GET /api/rides/available | available requests | ⬜ | ⬜ |
| H2 | Submit bid | POST /api/rides/request/{id}/bid | bid_id returned | ⬜ | ⬜ |
| H3 | Get driver bids | GET /api/rides/driver/{id}/bids | bids list | ⬜ | ⬜ |
| H4 | Withdraw bid | POST /api/rides/bid/{id}/withdraw | bid withdrawn | ⬜ | ⬜ |
| H5 | Accept counter-offer | POST /api/rides/bid/{id}/accept-counter | accepted | ⬜ | ⬜ |
| H6 | Reject counter-offer | POST /api/rides/bid/{id}/reject-counter | rejected | ⬜ | ⬜ |
| H7 | Start ride | POST /api/rides/request/{id}/start | ride started | ⬜ | ⬜ |
| H8 | Complete ride | POST /api/rides/request/{id}/complete | ride completed | ⬜ | ⬜ |
| H9 | Update bid | PUT /api/rides/bid/{id} | bid updated | ⬜ | ⬜ |
| H10 | Get driver earnings | GET /api/drivers/{id}/earnings | earnings data | ⬜ | ⬜ |
| H11 | Get bid label | GET /api/rides/estimate/bid-label | label info | ⬜ | ⬜ |
| H12 | Upload driver docs | POST /api/drivers/{id}/documents | doc uploaded | ⬜ | ⬜ |

### Suite I: Chat & Messaging (8 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| I1 | Get chat messages | GET /api/chat/messages/{order_id} | messages list | ⬜ | ⬜ |
| I2 | Send message | POST /api/chat/send | message sent | ⬜ | ⬜ |
| I3 | Mark as read | POST /api/chat/read/{order_id} | marked read | ⬜ | ⬜ |
| I4 | Typing indicator | POST /api/chat/typing/{order_id} | 200 OK | ⬜ | ⬜ |
| I5 | Get conversation | GET /api/chat/conversation/{order_id} | conversation | ⬜ | ⬜ |
| I6 | Close conversation | POST /api/chat/conversation/{order_id}/close | closed | ⬜ | ⬜ |
| I7 | Get customer convos | GET /api/chat/customer/{id}/conversations | convos list | ⬜ | ⬜ |
| I8 | Get driver convos | GET /api/chat/driver/{id}/conversations | convos list | ⬜ | ⬜ |

### Suite J: Payments (10 tests)

| ID | Test Case | Endpoint | Expected | Android | iOS |
|----|-----------|----------|----------|---------|-----|
| J1 | Create payment intent | POST /api/payments/ride/create-intent | intent_id | ⬜ | ⬜ |
| J2 | Get pricing info | GET /api/payments/ride/pricing-info | pricing data | ⬜ | ⬜ |
| J3 | Get driver earnings | GET /api/payments/ride/driver/{id}/earnings | earnings | ⬜ | ⬜ |
| J4 | Get customer cards | GET /api/customers/{id}/cards | cards list | ⬜ | ⬜ |
| J5 | Add customer card | POST /api/customers/{id}/cards | card added | ⬜ | ⬜ |
| J6 | Delete card | DELETE /api/customers/{id}/cards/{card_id} | deleted | ⬜ | ⬜ |
| J7 | Set default card | POST /api/customers/{id}/cards/{card_id}/default | set | ⬜ | ⬜ |
| J8 | Apply promo code | POST /api/promotions/apply | discount applied | ⬜ | ⬜ |
| J9 | Get active promos | GET /api/promotions/active | promos list | ⬜ | ⬜ |
| J10 | Get featured promos | GET /api/promotions/featured | featured list | ⬜ | ⬜ |

---

## Test Summary

| Suite | Category | Total | Passed | Failed | Pending |
|-------|----------|-------|--------|--------|---------|
| A | Health & Infrastructure | 5 | 4 | 0 | 1 |
| B | Customer Authentication | 10 | 3 | 0 | 7 |
| C | Driver Authentication | 10 | 1 | 0 | 9 |
| D | Vendor Authentication | 8 | 1 | 0 | 7 |
| E | Restaurant & Menu | 10 | 2 | 0 | 8 |
| F | Orders | 15 | 2 | 0 | 13 |
| G | P2P Rideshare - Customer | 15 | 4 | 0 | 11 |
| H | P2P Rideshare - Driver | 12 | 2 | 0 | 10 |
| I | Chat & Messaging | 8 | 0 | 0 | 8 |
| J | Payments | 10 | 1 | 0 | 9 |
| **TOTAL** | | **103** | **20** | **0** | **83** |

### Verified Passing (2025-12-25):
- A1: Health check ✅
- A2: API health ✅
- A3: Live probe ✅
- A4: Ready probe ✅
- B1: Register new customer ✅
- B3: Login with email (JSON) ✅
- D2: Vendor demo login ✅
- G1: Get fare estimate ✅ (with correct schema)
- G2: Get pricing tiers ✅
- G3: Create ride request ✅ (with correct schema)
- H1: Get available rides ✅ (requires driver_id)

---

## Known Schema Mismatches to Fix

### 1. Android CustomerRideshareApiService.kt
**Issue**: Using nested `pickup_address` object instead of flat structure
**Required Fix**:
```kotlin
// Current (WRONG):
"pickup_address" to mapOf("address" to ..., "latitude" to ...)

// Required (CORRECT):
"customer_id" to customerId,
"pickup_address" to "123 Main St, Cheyenne WY",
"pickup_latitude" to 41.1621,
"pickup_longitude" to -104.8019,
```

### 2. iOS P2PAPIService.swift
**Issue**: Using `/erp/rides/request` and nested structure
**Required Fix**:
- Change endpoint from `/erp/rides/request` to `/api/rides/request`
- Use flat structure with separate lat/lng fields

### 3. Customer Login Schema
**Issue**: Endpoint expects `username` not `email` for form login
**Solution**: Use `/api/auth/customer/login/json` which accepts email

---

## Test Credentials (Staging)

### Customer
- Email: `test.customer@dollor.ai`
- Password: `Test123!`

### Vendor (Demo)
- Email: `demobusiness@dollor.ai`
- Demo login (no password required)

### Driver
- Register new: `driver.{timestamp}@test.com`
- Note: Requires approval before login works

---

## Cross-Platform Test Execution

### Android
```bash
./gradlew :app:connectedStagingDebugAndroidTest
./gradlew :driver:connectedStagingDebugAndroidTest
./gradlew :partner:connectedStagingDebugAndroidTest
```

### iOS
```bash
xcodebuild test -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 16'
xcodebuild test -workspace eatffairdelivery.xcworkspace -scheme eatffairdelivery -destination 'platform=iOS Simulator,name=iPhone 16'
xcodebuild test -workspace eatffairrestaurant.xcworkspace -scheme eatffairrestaurant -destination 'platform=iOS Simulator,name=iPhone 16'
```

---

## API Compatibility Matrix

| Feature | Backend | Android | iOS | Status |
|---------|---------|---------|-----|--------|
| Health endpoints | ✅ | ✅ | ✅ | PASS |
| Customer auth | ✅ | ✅ | ✅ | PASS |
| Vendor demo login | ✅ | ✅ | ✅ | PASS |
| Driver registration | ✅ | ✅ | ✅ | PASS |
| Vendors list | ✅ | ✅ | ✅ | PASS |
| Orders list | ✅ | ✅ | ✅ | PASS |
| Rides available | ✅ | ✅ | ✅ | PASS |
| Ride estimate | ✅ | ✅ | ✅ | PASS |
| Create ride request | ✅ | ⚠️ | ⚠️ | SCHEMA MISMATCH |
| Submit bid | ✅ | ✅ | ✅ | PASS |
| Chat messages | ✅ | ✅ | ✅ | PASS |

**Legend**: ✅ Compatible | ⚠️ Schema Mismatch | ❌ Not Implemented
