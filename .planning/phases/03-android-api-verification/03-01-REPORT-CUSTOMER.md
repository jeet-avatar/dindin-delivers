# Android Customer App API Verification Report

## Build Baseline
- Package: `ai.dollor.customer`
- Last Firebase build: vC=25, v1.0.24 (Feb 23, 2026)
- API Base URL: `https://api.dollor.ai/api` (from `AppConfig.kt:50`)
- Retrofit base: `AppConfig.apiBaseUrl` which defaults to `PRODUCTION_API_URL = "https://api.dollor.ai/api"`
- OkHttp base: `$BASE_URL/api/...` where `BASE_URL = AppConfig.apiBaseUrl.removeSuffix("/api")` = `https://api.dollor.ai`

## Summary

- **Total endpoint rows verified: 83** (59 Retrofit + 24 OkHttp)
- **Unique endpoints (after removing 7 duplicates): 76**
- **OK: 74**
- **Mismatches: 2** (0 critical, 0 medium, 2 low)
- **Dead code: 0**

## Verification Results

### Public Endpoints (DollorApiService.kt lines 24-32)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 1 | GET | `vendors/published` | `@app.get("/api/vendors/published")` main_new.py:10229 | OK | Platform query param supported |
| 2 | GET | `public/restaurants/{id}` | `@app.get("/api/public/restaurants/{vendor_id}")` main_new.py:13783 | OK | |

### Customer Authentication (DollorApiService.kt lines 38-96)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 3 | POST | `auth/customer/login` | `@app.post("/api/auth/customer/login")` main_new.py:3052 | OK | FormUrlEncoded, also aliased at `/auth/customer/login` (line 20951) |
| 4 | POST | `auth/customer/register` | `@app.post("/api/auth/customer/register")` main_new.py:3100 | OK | Also aliased at `/auth/customer/register` (line 20952) |
| 5 | POST | `auth/customer/google` | `@app.post("/api/auth/customer/google")` main_new.py:3208 | OK | Also aliased at `/auth/customer/google` (line 20953) |
| 6 | POST | `auth/customer/apple-auth` | `app.add_api_route("/api/auth/customer/apple-auth", ...)` main_new.py:20969 | OK | Also aliased at `/auth/customer/apple-auth` (line 20970) |
| 7 | POST | `customer/password-reset/request` | `@app.post("/api/customer/password-reset/request")` main_new.py:6127 | OK | |
| 8 | POST | `customer/password-reset/confirm` | `@app.post("/api/customer/password-reset/confirm")` main_new.py:6160 | OK | |
| 9 | PUT | `customer/{customerId}/profile` | `app.add_api_route("/api/customer/{customer_id}/profile", ..., methods=["PUT"])` main_new.py:20954 | OK | |
| 10 | POST | `customer/demo-login` | `@app.post("/api/customer/demo-login")` main_new.py:1912 | OK | Requires ADMIN_SECRET_KEY |
| 11 | DELETE | `customers/{customerId}/delete` | `@app.delete("/api/customers/{customer_id}/delete")` main_new.py:3343 | OK | Also aliased at `/customers/{customer_id}/delete` (line 20956) |

### Customer Orders (DollorApiService.kt lines 102-213)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 12 | GET | `customer/orders` | `@app.get("/api/customer/orders")` main_new.py:14775 | OK | Explicit auth header in Android |
| 13 | GET | `customer/{customerId}/active-orders` | `@app.get("/api/customer/{customer_id}/active-orders")` main_new.py:15260 | OK | |
| 14 | GET | `customer/orders/{orderId}/track` | `@app.get("/api/customer/orders/{order_id}/track")` main_new.py:15349 | OK | |
| 15 | POST | `erp/orders/create` | `@router.post("/orders/create")` order_flow.py:1243 (prefix `/api/erp`) | OK | Full path: `/api/erp/orders/create` |
| 16 | POST | `erp/orders/{orderId}/confirm-payment` | `@router.post("/orders/{order_id}/confirm-payment")` order_flow.py:1407 (prefix `/api/erp`) | OK | Full path: `/api/erp/orders/{order_id}/confirm-payment` |
| 17 | POST | `orders/{orderId}/tip-driver` | `@app.post("/api/orders/{order_id}/tip-driver")` main_new.py:14956 | OK | |
| 18 | POST | `orders/{orderId}/cancel` | `@app.post("/api/orders/{order_id}/cancel")` main_new.py:14988 | OK | |
| 19 | GET | `orders/{orderId}/refund-status` | `@app.get("/api/orders/{order_id}/refund-status")` main_new.py:15036 | OK | |
| 20 | GET | `orders/{orderId}/modification` | `@app.get("/api/orders/{order_id}/modification")` main_new.py:16788 | OK | |
| 21 | POST | `orders/{orderId}/modification/respond` | `@app.post("/api/orders/{order_id}/modification/respond")` main_new.py:16833 | OK | |
| 22 | POST | `orders/{orderId}/mark-unavailable` | `@app.post("/api/orders/{order_id}/mark-unavailable")` main_new.py:16875 | OK | |
| 23 | POST | `customer/orders/{orderId}/rate-driver` | `@app.post("/api/customer/orders/{order_id}/rate-driver")` main_new.py:17088 | OK | |
| 24 | POST | `customer/orders/{orderId}/rate-restaurant` | `@app.post("/api/customer/orders/{order_id}/rate-restaurant")` main_new.py:17112 | OK | |
| 25 | POST | `customer/orders/{orderId}/chat` | `@app.post("/api/customer/orders/{order_id}/chat")` main_new.py:16414 | OK | |
| 26 | GET | `customer/orders/{orderId}/chat` | `@app.get("/api/customer/orders/{order_id}/chat")` main_new.py:16369 | OK | |

### Customer Addresses (DollorApiService.kt lines 224-264)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 27 | GET | `addresses/{customerId}` | `@app.get("/api/addresses/{customer_id}")` main_new.py:16034 | OK | |
| 28 | GET | `addresses/{customerId}/default` | `@app.get("/api/addresses/{customer_id}/default")` main_new.py:16071 | OK | |
| 29 | POST | `addresses/{customerId}` | `@app.post("/api/addresses/{customer_id}")` main_new.py:16103 | OK | |
| 30 | PUT | `addresses/{customerId}/{addressId}` | `@app.put("/api/addresses/{customer_id}/{address_id}")` main_new.py:16150 | OK | |
| 31 | DELETE | `addresses/{customerId}/{addressId}` | `@app.delete("/api/addresses/{customer_id}/{address_id}")` main_new.py:16200 | OK | |
| 32 | POST | `addresses/{customerId}/{addressId}/set-default` | `@app.post("/api/addresses/{customer_id}/{address_id}/set-default")` main_new.py:16233 | OK | |

### Customer Favorites (DollorApiService.kt lines 270-296)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 33 | GET | `customer/favorites/{customerId}` | `@app.get("/api/customer/favorites/{customer_id}")` main_new.py:16260 | OK | |
| 34 | POST | `customer/favorites/{customerId}/{vendorId}` | `@app.post("/api/customer/favorites/{customer_id}/{vendor_id}")` main_new.py:16293 | OK | |
| 35 | DELETE | `customer/favorites/{customerId}/{vendorId}` | `@app.delete("/api/customer/favorites/{customer_id}/{vendor_id}")` main_new.py:16323 | OK | |
| 36 | GET | `customer/favorites/{customerId}/check/{vendorId}` | `@app.get("/api/customer/favorites/{customer_id}/check/{vendor_id}")` main_new.py:16347 | OK | |

### Customer Rideshare (DollorApiService.kt lines 301-355)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 37 | POST | `rides/request` | `@router.post("/request")` bid_routes.py:300 (prefix `/api/rides`) | OK | Full path: `/api/rides/request` |
| 38 | GET | `customer/rides/history` | `@app.get("/api/customer/rides/history")` main_new.py:6440 | OK | Explicit auth header in Android |
| 39 | GET | `rides/{rideId}/track` | `@app.get("/api/rides/{ride_id}/track")` main_new.py:15063 | OK | |
| 40 | POST | `rides/request/{rideId}/cancel` | `@router.post("/request/{request_id}/cancel")` bid_routes.py:898 (prefix `/api/rides`) | OK | Full path: `/api/rides/request/{request_id}/cancel` |
| 41 | POST | `rides/{rideId}/rate` | `@app.post("/api/rides/{ride_id}/rate")` main_new.py:15424 | OK | |
| 42 | POST | `rides/estimate` | `@router.post("/estimate")` bid_routes.py:2116 (prefix `/api/rides`) | OK | Also: main_new.py:19255. Dual registration. |
| 43 | POST | `erp/rides/{rideId}/customer-negotiate` | `@app.post("/api/erp/rides/{ride_id}/customer-negotiate")` main_new.py:14618 | OK | |
| 44 | POST | `erp/rides/{rideId}/customer-accept-fare` | `@app.post("/api/erp/rides/{ride_id}/customer-accept-fare")` main_new.py:14659 | OK | |

### Customer Payment Cards (DollorApiService.kt lines 366-403)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 45 | GET | `customers/{customerId}/cards` | `@app.get("/api/customers/{customer_id}/cards")` main_new.py:16914 | OK | |
| 46 | POST | `customers/{customerId}/cards` | `@app.post("/api/customers/{customer_id}/cards")` main_new.py:16973 | OK | |
| 47 | DELETE | `customers/{customerId}/cards/{cardId}` | `@app.delete("/api/customers/{customer_id}/cards/{card_id}")` main_new.py:17029 | OK | |
| 48 | POST | `customers/{customerId}/cards/{cardId}/default` | `@app.post("/api/customers/{customer_id}/cards/{card_id}/default")` main_new.py:17057 | OK | |

### Promotions (DollorApiService.kt lines 414-432)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 49 | GET | `promotions/active` | `@app.get("/api/promotions/active")` main_new.py:13999 | OK | |
| 50 | GET | `promotions/featured` | `@app.get("/api/promotions/featured")` main_new.py:13900 | OK | |
| 51 | POST | `promotions/apply` | `@app.post("/api/promotions/apply")` main_new.py:14058 | OK | |

### Payments (DollorApiService.kt line 1319)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 52 | POST | `payments/create-intent` | `@router.post("/payments/create-intent")` stripe_integration.py:124 (prefix `/api`) | OK | Full path: `/api/payments/create-intent` |

### Order Tracking (DollorApiService.kt lines 1329-1335)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 53 | GET | `erp/orders/{orderId}/full-tracking` | `@router.get("/orders/{order_id}/full-tracking")` order_flow.py:4473 (prefix `/api/erp`) | OK | Full path: `/api/erp/orders/{order_id}/full-tracking` |
| 54 | GET | `erp/orders/{orderId}/driver-location` | `@router.get("/orders/{order_id}/driver-location")` order_flow.py:4172 (prefix `/api/erp`) | OK | Full path: `/api/erp/orders/{order_id}/driver-location` |

### Legal (DollorApiService.kt lines 1343-1347)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 55 | GET | `legal/tos` | `@app.get("/api/legal/tos")` main_new.py:19214 | OK | |
| 56 | GET | `legal/privacy-policy` | `@app.get("/api/legal/privacy-policy")` main_new.py:19220 | OK | Android-specific alias for `/api/legal/privacy` |

### Push Notifications (DollorApiService.kt lines 1389-1390)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 57 | POST | `notifications/register-token` | `@app.post("/api/notifications/register-token")` main_new.py:17958 | OK | FormUrlEncoded |

### Tax API (DollorApiService.kt lines 901-915)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 58 | GET | `tax/calculate` | `@app.get("/api/tax/calculate")` main_new.py:21178 | OK | Also registered as POST at 21177 |
| 59 | GET | `tax/estimate/{state}` | `@app.get("/api/tax/estimate/{state}")` main_new.py:21245 | OK | |

---

## CustomerRideshareApiService (OkHttp)

All endpoints use `$BASE_URL/api/...` pattern where `BASE_URL = AppConfig.apiBaseUrl.removeSuffix("/api")`.

| # | Method | OkHttp Path | Backend Route | Status | Notes |
|---|--------|------------|---------------|--------|-------|
| 60 | POST | `/api/rides/request` | `@router.post("/request")` bid_routes.py:300 (prefix `/api/rides`) | OK | |
| 61 | GET | `/api/rides/customer/{customerId}/requests` | `@router.get("/customer/{customer_id}/requests")` bid_routes.py:491 (prefix `/api/rides`) | OK | |
| 62 | GET | `/api/rides/request/{rideRequestId}/bids` | `@router.get("/request/{request_id}/bids")` bid_routes.py:520 (prefix `/api/rides`) | OK | |
| 63 | POST | `/api/rides/bid/{bidId}/respond` (accept) | `@router.post("/bid/{bid_id}/respond")` bid_routes.py:551 (prefix `/api/rides`) | OK | Body: `{"action":"accept"}` |
| 64 | POST | `/api/rides/bid/{bidId}/respond` (reject) | `@router.post("/bid/{bid_id}/respond")` bid_routes.py:551 (prefix `/api/rides`) | OK | Body: `{"action":"reject"}` |
| 65 | POST | `/api/rides/bid/{bidId}/respond` (counter) | `@router.post("/bid/{bid_id}/respond")` bid_routes.py:551 (prefix `/api/rides`) | OK | Body: `{"action":"counter","counter_amount":...}` |
| 66 | POST | `/api/erp/rides/{rideId}/customer-negotiate?proposed_fare=...` | `@app.post("/api/erp/rides/{ride_id}/customer-negotiate")` main_new.py:14618 | LOW | Query param `proposed_fare` -- backend may expect body. See Mismatches #1. |
| 67 | POST | `/api/erp/rides/{rideId}/customer-accept-fare?accepted_fare=...` | `@app.post("/api/erp/rides/{ride_id}/customer-accept-fare")` main_new.py:14659 | LOW | Query param `accepted_fare` -- backend may expect body. See Mismatches #2. |
| 68 | GET | `/api/erp/rides/{rideId}/negotiation-status` | `@app.get("/api/erp/rides/{ride_id}/negotiation-status")` main_new.py:14687 | OK | |
| 69 | POST | `/api/rides/request/{rideRequestId}/cancel` | `@router.post("/request/{request_id}/cancel")` bid_routes.py:898 (prefix `/api/rides`) | OK | |
| 70 | GET | `/api/rides/{rideRequestId}/track` | `@app.get("/api/rides/{ride_id}/track")` main_new.py:15063 | OK | |
| 71 | GET | `/api/p2p/ride-requests/{rideRequestId}/chat` | `@app.get("/api/p2p/ride-requests/{ride_request_id}/chat")` main_new.py:15742 | OK | |
| 72 | POST | `/api/p2p/ride-requests/{rideRequestId}/chat` | `@app.post("/api/p2p/ride-requests/{ride_request_id}/chat")` main_new.py:15772 | OK | |
| 73 | POST | `/api/rides/{rideId}/rate` | `@app.post("/api/rides/{ride_id}/rate")` main_new.py:15424 | OK | |
| 74 | POST | `/api/rides/{rideId}/tip` | `@app.post("/api/rides/{ride_id}/tip")` main_new.py:15492 | OK | |
| 75 | POST | `/api/payments/ride/create-intent` | `@router.post("/create-intent")` rideshare_payments.py:65 (prefix `/api/payments/ride`) | OK | |
| 76 | GET | `/api/rides/request/{rideRequestId}/receipt` | `@router.get("/request/{request_id}/receipt")` bid_routes.py:2334 (prefix `/api/rides`) | OK | |
| 77 | POST | `/api/rides/request/{rideRequestId}/email-receipt` | `@router.post("/request/{request_id}/email-receipt")` bid_routes.py:2402 (prefix `/api/rides`) | OK | |
| 78 | POST | `/api/rides/dispute` | `@router.post("/dispute")` bid_routes.py:2558 (prefix `/api/rides`) | OK | |
| 79 | GET | `/api/rides/customer/{customerId}/disputes` | `@router.get("/customer/{customer_id}/disputes")` bid_routes.py:2650 (prefix `/api/rides`) | OK | |
| 80 | POST | `/api/rides/customer/{customerId}/recurring-rides` | `@router.post("/customer/{customer_id}/recurring-rides")` bid_routes.py:2808 (prefix `/api/rides`) | OK | |
| 81 | GET | `/api/rides/customer/{customerId}/recurring-rides` | `@router.get("/customer/{customer_id}/recurring-rides")` bid_routes.py:2877 (prefix `/api/rides`) | OK | |
| 82 | DELETE | `/api/rides/recurring-rides/{id}` | `@router.delete("/recurring-rides/{ride_id}")` bid_routes.py:2940 (prefix `/api/rides`) | OK | |
| 83 | POST | `/api/rides/estimate` | `@router.post("/estimate")` bid_routes.py:2116 (prefix `/api/rides`) | OK | Also: main_new.py:19255 |

### Duplicates Between DollorApiService and CustomerRideshareApiService

The following endpoints exist in **both** files. Both files point to the same backend route -- no conflict:

| Endpoint | DollorApiService (Retrofit) | CustomerRideshareApiService (OkHttp) |
|----------|---------------------------|--------------------------------------|
| Create ride request | `@POST("rides/request")` #37 | `POST /api/rides/request` #60 |
| Track ride | `@GET("rides/{rideId}/track")` #39 | `GET /api/rides/{rideRequestId}/track` #70 |
| Cancel ride | `@POST("rides/request/{rideId}/cancel")` #40 | `POST /api/rides/request/{rideRequestId}/cancel` #69 |
| Rate ride | `@POST("rides/{rideId}/rate")` #41 | `POST /api/rides/{rideId}/rate` #73 |
| Fare estimate | `@POST("rides/estimate")` #42 | `POST /api/rides/estimate` #83 |
| Customer negotiate | `@POST("erp/rides/{rideId}/customer-negotiate")` #43 | `POST /api/erp/rides/{rideId}/customer-negotiate` #66 |
| Customer accept fare | `@POST("erp/rides/{rideId}/customer-accept-fare")` #44 | `POST /api/erp/rides/{rideId}/customer-accept-fare` #67 |

**Note:** The OkHttp service is the one actually used at runtime for rideshare. The Retrofit declarations exist for completeness/future migration but the `CustomerRideshareApiService` OkHttp implementation is what ViewModels call.

---

## Mismatches Detail

### Mismatch #1: customer-negotiate query param vs body (LOW)

- **Severity:** LOW
- **Android:** `POST /api/erp/rides/{rideId}/customer-negotiate?proposed_fare=$proposedFare` with empty body
- **Backend:** `@app.post("/api/erp/rides/{ride_id}/customer-negotiate")` main_new.py:14618
- **Impact:** Works today -- FastAPI reads `proposed_fare` from query params. The route uses `Query()` parameter, not `Body()`.
- **Fix approach:** No fix needed. Backend accepts query params. Both Retrofit version (uses `@Query`) and OkHttp version (appends to URL) work correctly.

### Mismatch #2: customer-accept-fare query param vs body (LOW)

- **Severity:** LOW
- **Android:** `POST /api/erp/rides/{rideId}/customer-accept-fare?accepted_fare=$acceptedFare` with empty body
- **Backend:** `@app.post("/api/erp/rides/{ride_id}/customer-accept-fare")` main_new.py:14659
- **Impact:** Works today -- FastAPI reads `accepted_fare` from query params. The route uses `Query()` parameter, not `Body()`.
- **Fix approach:** No fix needed. Backend accepts query params. Both versions work correctly.

---

## Dead Code

No dead code endpoints found in the customer-facing sections of DollorApiService.kt or in CustomerRideshareApiService.kt. All Retrofit and OkHttp endpoints map to live backend routes.

**Note:** DollorApiService.kt also contains Driver, Vendor, and Restaurant sections (lines 438-1398) which are NOT customer-facing and are NOT included in this audit. Those will be covered in Plans 03-02 (Driver) and 03-03 (Restaurant/Vendor).

---

## Verification Methodology

1. Every `@GET`, `@POST`, `@PUT`, `@DELETE`, `@PATCH` annotation in customer-facing sections of DollorApiService.kt was extracted
2. Every `.url("$BASE_URL/api/...")` call in CustomerRideshareApiService.kt was extracted
3. Each path was prepended with `/api/` (for Retrofit) or verified as-is (for OkHttp)
4. Each endpoint was verified via `grep -rn` against `apps/web/p2p-platform/backend/*.py`
5. Router-based routes (bid_routes.py prefix `/api/rides`, order_flow.py prefix `/api/erp`, rideshare_payments.py prefix `/api/payments/ride`, chat_routes.py prefix `/api/chat`, stripe_integration.py prefix `/api`) were resolved to their full paths
6. API base URL confirmed via AppConfig.kt: `PRODUCTION_API_URL = "https://api.dollor.ai/api"`

---

*Generated: 2026-02-24*
*Auditor: Claude Opus 4.6 (GSD Phase 03, Plan 01)*
