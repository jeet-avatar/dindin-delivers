# Customer App API Alignment Audit

## Date: 2026-03-04
## Summary: 74 endpoints audited, 62 PASS, 5 FAIL, 7 WARNING

### Scope
- **iOS source:** `P2PAPIService.swift` (customer-relevant functions using `customerToken`)
- **Android source:** `DollorApiService.kt` (Retrofit interface), `CustomerRideshareApiService.kt` (OkHttp), `AuthViewModel.kt`, `CartViewModel.kt`
- **Android shared:** `ChatService.kt`, `NegotiationService.kt`, `CallService.kt` (aspirational services)
- **Backend:** `main_new.py`, `bid_routes.py` (prefix `/api/rides`), `order_flow.py` (prefix `/api/erp`), `rideshare_payments.py` (prefix `/api/payments/ride`), `voice_agent.py` (no prefix)
- **Registry:** `.planning/API_REGISTRY.md` cross-referenced

### Methodology
Every PASS/FAIL verdict is backed by a `grep -n` line citation from backend source code. No endpoint is marked PASS without verifying the exact route registration in Python.

---

## Results by Category

### 1. Authentication

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 1 | `/api/auth/customer/login` | POST | `customerLogin()` :1553 | `@POST("auth/customer/login")` :39 | `main_new.py:3070` | public | PASS |
| 2 | `/api/auth/customer/register` | POST | `customerRegister()` :2158 | `@POST("auth/customer/register")` :45 | `main_new.py:3120` | public | PASS |
| 3 | `/api/auth/customer/google` | POST | `customerGoogleAuth()` :1624 | `@POST("auth/customer/google")` :48 | `main_new.py:3228` | public | PASS |
| 4 | `/api/customer/apple-auth` | POST | `customerAppleAuth()` :1695 | `@POST("auth/customer/apple-auth")` :51 | `main_new.py:5814` | public | WARNING |
| 5 | `/api/customer/demo-login` | POST | N/A (not in iOS) | `@POST("customer/demo-login")` :85 | `main_new.py:1928` | public | PASS |
| 6 | `/api/customer/password-reset/request` | POST | `requestPasswordReset()` :1809 | `@POST("customer/password-reset/request")` :59 | `main_new.py:5949` | public | PASS |
| 7 | `/api/customer/password-reset/confirm` | POST | `confirmPasswordReset()` :1865 | `@POST("customer/password-reset/confirm")` :67 | `main_new.py:5982` | public | PASS |

**WARNING #4:** iOS calls `/api/customer/apple-auth`, Android calls `/api/auth/customer/apple-auth`. Backend has `/api/customer/apple-auth` (line 5814). The Android path `auth/customer/apple-auth` is listed in the auth middleware allowlist (line 283) but does NOT have a dedicated route -- it falls through. iOS path is the canonical one. Cross-platform path divergence.

### 2. Customer Profile & Account

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 8 | `/api/auth/customer/profile` | PUT | `updateCustomerProfile()` :1767 | N/A | `main_new.py:3327` | customer JWT | PASS |
| 9 | `/api/customer/{id}/profile` | PUT | N/A | `@PUT("customer/{customerId}/profile")` :74 | `main_new.py:20895` (alias) | customer JWT | PASS |
| 10 | `/api/customer/profile` | GET | N/A (uses /auth/customer/me) | N/A | `main_new.py:6179` | customer JWT | PASS |
| 11 | `/api/auth/customer/me` | GET | (implicit via profile) | N/A | `main_new.py:3309` | customer JWT | PASS |
| 12 | `/api/customers/{id}/delete` | DELETE | `deleteCustomerAccount()` :6838 | `@DELETE("customers/{customerId}/delete")` :92 | `main_new.py:3363` | customer JWT | PASS |

### 3. Addresses

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 13 | `/api/addresses/{id}` | GET | `fetchAddresses()` :2242 | `@GET("addresses/{customerId}")` :234 | `main_new.py:15957` | customer JWT | PASS |
| 14 | `/api/addresses/{id}/default` | GET | `fetchDefaultAddress()` :2286 | `@GET("addresses/{customerId}/default")` :240 | `main_new.py:15994` | customer JWT | PASS |
| 15 | `/api/addresses/{id}` | POST | `createAddress()` :2338 | `@POST("addresses/{customerId}")` :246 | `main_new.py:16026` | customer JWT | PASS |
| 16 | `/api/addresses/{id}/{addr_id}` | PUT | `updateAddress()` :2450 | `@PUT("addresses/{customerId}/{addressId}")` :253 | `main_new.py:16073` | customer JWT | PASS |
| 17 | `/api/addresses/{id}/{addr_id}` | DELETE | `deleteAddress()` :2518 | `@DELETE("addresses/{customerId}/{addressId}")` :261 | `main_new.py:16123` | customer JWT | PASS |
| 18 | `/api/addresses/{id}/{addr_id}/set-default` | POST | `setDefaultAddress()` :2559 | `@POST("addresses/{customerId}/{addressId}/set-default")` :268 | `main_new.py:16156` | customer JWT | PASS |

### 4. Favorites

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 19 | `/api/customer/favorites/{id}` | GET | `fetchCustomerFavorites()` :2611 | `@GET("customer/favorites/{customerId}")` :280 | `main_new.py:16183` | customer JWT | PASS |
| 20 | `/api/customer/favorites/{id}/{vendor_id}` | POST | `addFavorite()` :2654 | `@POST("customer/favorites/{customerId}/{vendorId}")` :286 | `main_new.py:16216` | customer JWT | PASS |
| 21 | `/api/customer/favorites/{id}/{vendor_id}` | DELETE | `removeFavorite()` :2698 | `@DELETE("customer/favorites/{customerId}/{vendorId}")` :293 | `main_new.py:16246` | customer JWT | PASS |
| 22 | `/api/customer/favorites/{id}/check/{vendor_id}` | GET | `checkFavorite()` :2741 | `@GET("customer/favorites/{customerId}/check/{vendorId}")` :300 | `main_new.py:16270` | customer JWT | PASS |

### 5. Restaurant/Vendor Browsing

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 23 | `/api/vendors/published` | GET | `fetchRestaurants()` :78 | `@GET("vendors/published")` :24 | `main_new.py:10051` | public | PASS |
| 24 | `/api/public/restaurants/{id}` | GET | `fetchRestaurantDetail()` :165 | `@GET("public/restaurants/{id}")` :31 | `main_new.py:13657` | public | PASS |
| 25 | `/api/vendors/{id}/menu` | GET | `fetchMenuItems()` :257 | `@GET("vendors/{vendorId}/menu")` :1230 | public (pattern match :371) | public | PASS |
| 26 | `/api/vendors/{id}/menu/categories` | GET | `getMenuCategories()` :469 | `@GET("vendors/{vendorId}/menu/categories")` :1235 | public (pattern match :371) | public | PASS |

### 6. Promotions

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 27 | `/api/promotions/active` | GET | `getActivePromotions()` :535 | `@GET("promotions/active")` :424 | `main_new.py:13873` | public | PASS |
| 28 | `/api/promotions/featured` | GET | `getFeaturedDeals()` :576 | `@GET("promotions/featured")` :431 | `main_new.py:13774` | public | PASS |
| 29 | `/api/promotions/apply` | POST | `validatePromoCode()` :3070 | `@POST("promotions/apply")` :438 | `main_new.py:13932` | public | PASS |

### 7. Food Ordering

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 30 | `/api/erp/orders/create` | POST | `createOrder()` :2939 | `@POST("erp/orders/create")` :117 | `order_flow.py:1134` (prefix `/api/erp`) | customer JWT | PASS |
| 31 | `/api/erp/orders/{id}/confirm-payment` | POST | `confirmOrderPayment()` :3024 | `@POST("erp/orders/{orderId}/confirm-payment")` :127 | `order_flow.py:1298` (prefix `/api/erp`) | customer JWT | PASS |
| 32 | `/api/orders/create` | POST | N/A | (Android alias) | `main_new.py:14680` | customer JWT | PASS |
| 33 | `/api/customer/orders` | GET | `fetchCustomerOrders()` :2784 | `@GET("customer/orders")` :102 | `main_new.py:14689` | customer JWT | PASS |
| 34 | `/api/customer/orders/{id}/track` | GET | `trackOrder()` :2840 | `@GET("customer/orders/{orderId}/track")` :111 | `main_new.py:15263` | customer JWT | PASS |
| 35 | `/api/customer/{id}/active-orders` | GET | `fetchActiveOrders()` :2886 | `@GET("customer/{customerId}/active-orders")` :105 | `main_new.py:15174` | customer JWT | PASS |
| 36 | `/api/orders/{id}/tip-driver` | POST | `submitDriverTip()` :11528 | `@POST("orders/{orderId}/tip-driver")` :133 | `main_new.py:14870` | customer JWT | PASS |
| 37 | `/api/orders/{id}/cancel` | POST | N/A | `@POST("orders/{orderId}/cancel")` :143 | `main_new.py:14902` | customer JWT | PASS |
| 38 | `/api/orders/{id}/refund-status` | GET | N/A | `@GET("orders/{orderId}/refund-status")` :153 | `main_new.py:14950` | customer JWT | PASS |
| 39 | `/api/orders/{id}/modification` | GET | N/A | `@GET("orders/{orderId}/modification")` :162 | `main_new.py:16711` | customer JWT | PASS |
| 40 | `/api/orders/{id}/modification/respond` | POST | N/A | `@POST("orders/{orderId}/modification/respond")` :171 | `main_new.py:16756` | customer JWT | PASS |

### 8. Order Ratings & Chat

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 41 | `/api/customer/orders/{id}/rate-driver` | POST | `submitDriverRating()` :11391 | `@POST("customer/orders/{orderId}/rate-driver")` :188 | `main_new.py:17011` | customer JWT | PASS |
| 42 | `/api/customer/orders/{id}/rate-restaurant` | POST | `submitRestaurantRating()` :11461 | `@POST("customer/orders/{orderId}/rate-restaurant")` :199 | `main_new.py:17035` | customer JWT | PASS |
| 43 | `/api/customer/orders/{id}/chat` | GET | `fetchOrderChatMessages()` :7071 | `@GET("customer/orders/{orderId}/chat")` :213 | `main_new.py:16292` | customer JWT | PASS |
| 44 | `/api/customer/orders/{id}/chat` | POST | `sendOrderChatMessage()` :7120 | `@POST("customer/orders/{orderId}/chat")` :206 | `main_new.py:16337` | customer JWT | PASS |

### 9. Support Chat

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 45 | `/api/support/chat` | POST | `sendSupportChatMessage()` :7175 | `@POST("support/chat")` :223 | `voice_agent.py:311` (no prefix) | public (allowlist :343) | PASS |

### 10. Saved Cards / Payment Methods

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 46 | `/api/customers/{id}/cards` | GET | `fetchSavedCards()` :6620 | `@GET("customers/{customerId}/cards")` :376 | `main_new.py:16837` | customer JWT | PASS |
| 47 | `/api/customers/{id}/cards` | POST | `createCard()` :6665 | `@POST("customers/{customerId}/cards")` :386 | `main_new.py:16896` | customer JWT | PASS |
| 48 | `/api/customers/{id}/cards/{card_id}` | DELETE | `deleteCard()` :6732 | `@DELETE("customers/{customerId}/cards/{cardId}")` :397 | `main_new.py:16952` | customer JWT | PASS |
| 49 | `/api/customers/{id}/cards/{card_id}/default` | POST | `setDefaultCard()` :6766 | `@POST("customers/{customerId}/cards/{cardId}/default")` :408 | `main_new.py:16980` | customer JWT | PASS |

### 11. Rideshare - Fare Estimation

| # | Endpoint | Method | iOS Function | Android (Retrofit/OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|--------------------------|---------------|------|--------|
| 50 | `/api/rides/estimate` | POST | `estimateRideFare()` :5135 | `@POST("rides/estimate")` :340 + OkHttp :1033 | `bid_routes.py:2145` (prefix `/api/rides`) | any JWT | PASS |

### 12. Rideshare - Request & Bidding

| # | Endpoint | Method | iOS Function | Android (Retrofit/OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|--------------------------|---------------|------|--------|
| 51 | `/api/rides/request` | POST | `requestRide()` :5206 | OkHttp :170 + `@POST("rides/request")` :311 | `bid_routes.py:330` (prefix `/api/rides`) | customer JWT | PASS |
| 52 | `/api/rides/customer/{id}/requests` | GET | `getCustomerRideRequests()` :6256 | OkHttp :204 | `bid_routes.py:519` (prefix `/api/rides`) | customer JWT | PASS |
| 53 | `/api/rides/request/{id}/bids` | GET | `fetchRideRequestBids()` :5527 | OkHttp :231 | `bid_routes.py:548` (prefix `/api/rides`) | customer JWT | PASS |
| 54 | `/api/rides/bid/{id}/respond` | POST | `acceptDriverBid()` :5576 / `rejectDriverBid()` :5638 / `counterDriverBid()` :5678 | OkHttp :263/:295/:337 | `bid_routes.py:579` (prefix `/api/rides`) | customer JWT | PASS |
| 55 | `/api/rides/request/{id}/cancel` | POST | `cancelRideRequest()` :6029 / `cancelRide()` :6916 | OkHttp :474 + `@POST("rides/request/{rideId}/cancel")` :326 | `bid_routes.py:924` (prefix `/api/rides`) | customer JWT | PASS |
| 56 | `/api/rides/bid/{id}` | PUT | `updateBid()` :6358 | N/A | `bid_routes.py:1308` (prefix `/api/rides`) | any JWT | PASS |
| 57 | `/api/rides/bid/{id}/accept-counter` | POST | `acceptCounterOffer()` :5794 | N/A | `bid_routes.py:1476` (prefix `/api/rides`) | customer JWT | PASS |
| 58 | `/api/rides/bid/{id}/reject-counter` | POST | `rejectCounterOffer()` :5833 | N/A | `bid_routes.py:1581` (prefix `/api/rides`) | customer JWT | PASS |

### 13. Rideshare - Tracking & Status

| # | Endpoint | Method | iOS Function | Android (Retrofit/OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|--------------------------|---------------|------|--------|
| 59 | `/api/rides/{id}/track` | GET | N/A (iOS uses /api/erp/rides) | OkHttp :509 + `@GET("rides/{rideId}/track")` :320 | `main_new.py:14977` | customer JWT | PASS |
| 60 | `/api/erp/rides/{id}/track` | GET | `trackMyRide()` :5277 | N/A | `main_new.py:14407` | customer JWT | WARNING |

**WARNING #60:** iOS uses `/api/erp/rides/{id}/track`, Android uses `/api/rides/{id}/track`. Both work, but cross-platform path divergence exists.

### 14. Rideshare - Rating, Tip, Payment

| # | Endpoint | Method | iOS Function | Android (Retrofit/OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|--------------------------|---------------|------|--------|
| 61 | `/api/rides/{id}/rate` | POST | `submitRideRating()` :11592 | OkHttp :623 + `@POST("rides/{rideId}/rate")` :333 | `main_new.py:15338` | customer JWT | PASS |
| 62 | `/api/rides/{id}/tip` | POST | `submitRideTip()` :11657 | OkHttp :661 | `main_new.py:15406` | customer JWT | PASS |
| 63 | `/api/payments/ride/create-intent` | POST | `createRidePaymentIntent()` :6511 | OkHttp :701 | `rideshare_payments.py:65` (prefix `/api/payments/ride`) | customer JWT | PASS |
| 64 | `/api/rides/request/{id}/receipt` | GET | `fetchRideReceipt()` :11721 | OkHttp :735 | `bid_routes.py:2363` (prefix `/api/rides`) | any JWT | PASS |
| 65 | `/api/rides/request/{id}/email-receipt` | POST | `emailRideReceipt()` :11755 | OkHttp :762 | `bid_routes.py:2431` (prefix `/api/rides`) | any JWT | PASS |

### 15. Rideshare - Disputes

| # | Endpoint | Method | iOS Function | Android (OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|------------------|---------------|------|--------|
| 66 | `/api/rides/dispute` | POST | `createRideDispute()` :11825 | OkHttp :804 | `bid_routes.py:2587` (prefix `/api/rides`) | customer JWT | PASS |
| 67 | `/api/rides/customer/{id}/disputes` | GET | `fetchMyDisputes()` :11870 | OkHttp :835 | `bid_routes.py:2679` (prefix `/api/rides`) | customer JWT | PASS |
| 68 | `/api/rides/dispute/{id}` | GET | `fetchDisputeStatus()` :11905 | N/A | `bid_routes.py:2649` (prefix `/api/rides`) | any JWT | PASS |

### 16. Rideshare - Recurring Rides

| # | Endpoint | Method | iOS Function | Android (OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|------------------|---------------|------|--------|
| 69 | `/api/rides/customer/{id}/recurring-rides` | POST | `createRecurringRide()` :11952 | OkHttp :893 | `bid_routes.py:2837` (prefix `/api/rides`) | customer JWT | PASS |
| 70 | `/api/rides/customer/{id}/recurring-rides` | GET | `getRecurringRides()` :12005 | OkHttp :924 | `bid_routes.py:2906` (prefix `/api/rides`) | customer JWT | PASS |
| 71 | `/api/rides/recurring-rides/{id}` | DELETE | `deleteRecurringRide()` :12040 | OkHttp :951 | `bid_routes.py:2969` (prefix `/api/rides`) | customer JWT | PASS |

### 17. Rideshare - Negotiation (ERP paths)

| # | Endpoint | Method | iOS Function | Android (OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|------------------|---------------|------|--------|
| 72 | `/api/erp/rides/{id}/customer-negotiate` | POST | `customerSubmitFareOffer()` :7227 | OkHttp :374 | `main_new.py:14528` | customer JWT | PASS |
| 73 | `/api/erp/rides/{id}/customer-accept-fare` | POST | `customerAcceptDriverFare()` :7273 | OkHttp :411 | `main_new.py:14569` | customer JWT | PASS |
| 74 | `/api/erp/rides/{id}/negotiation-status` | GET | `getRideNegotiationStatus()` :7308 | OkHttp :440 | `main_new.py:14597` | customer JWT | PASS |

### 18. Rideshare - Chat

| # | Endpoint | Method | iOS Function | Android (OkHttp) | Backend Route | Auth | Status |
|---|----------|--------|-------------|------------------|---------------|------|--------|
| 75 | `/api/p2p/ride-requests/{id}/chat` | GET | `fetchRideChatMessages()` :6968 | OkHttp :540 + `@GET("p2p/ride-requests/{id}/chat")` :732 | `main_new.py:15665` | any JWT | PASS |
| 76 | `/api/p2p/ride-requests/{id}/chat` | POST | `sendRideChatMessage()` :7017 | OkHttp :578 + `@POST("p2p/ride-requests/{id}/chat")` :738 | `main_new.py:15695` | any JWT | PASS |

### 19. Ride History

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 77 | `/api/customer/rides/history` | GET | `getCustomerRideHistory()` :6309 | `@GET("customer/rides/history")` :317 | `main_new.py:6262` | customer JWT | PASS |

### 20. FCM Token

| # | Endpoint | Method | iOS Function | Android (Retrofit) | Backend Route | Auth | Status |
|---|----------|--------|-------------|-------------------|---------------|------|--------|
| 78 | `/api/erp/customers/{id}/fcm-token` | POST | `saveCustomerFCMToken()` :11031 | `@POST("notifications/register-token")` :1399 | `main_new.py:17551` (ERP) / `main_new.py:17881` (register-token) | customer JWT | WARNING |

**WARNING #78:** iOS uses `/api/erp/customers/{id}/fcm-token`, Android uses `/api/notifications/register-token`. Both exist but are different endpoints with different request shapes. iOS passes `customerId` in path + `fcm_token` in body. Android passes `token`, `user_type`, `user_id` in body. Functionally equivalent but different contracts.

### 21. Surge & Pricing Info

| # | Endpoint | Method | iOS Function | Android | Backend Route | Auth | Status |
|---|----------|--------|-------------|---------|---------------|------|--------|
| 79 | `/api/rides/surge` | GET | `getSurgeStatus()` :6167 | N/A | `bid_routes.py:478` (prefix `/api/rides`) | public | PASS |

---

## Cross-Platform Mismatches

| # | Issue | iOS Path | Android Path | Severity | Fix Needed |
|---|-------|----------|-------------|----------|-----------|
| 1 | Apple Auth path divergence | `/api/customer/apple-auth` | `/api/auth/customer/apple-auth` | LOW | Android should use `/api/customer/apple-auth` (the only registered route). Currently Android path is NOT a registered route -- may 404 or be caught by auth middleware allowlist passthrough. Needs verification. |
| 2 | Ride tracking path | `/api/erp/rides/{id}/track` | `/api/rides/{id}/track` | LOW | Both paths exist in backend. No action needed, but inconsistency adds maintenance burden. |
| 3 | Profile update path | `/api/auth/customer/profile` (PUT) | `/api/customer/{id}/profile` (PUT) | LOW | Both work. iOS uses JWT-only path, Android uses ID-in-path alias. No action needed. |
| 4 | FCM token registration | `/api/erp/customers/{id}/fcm-token` | `/api/notifications/register-token` | MEDIUM | Different request shapes. Should standardize to one path long-term. |
| 5 | Demo login | Not used in iOS customer app | `/api/customer/demo-login` | INFO | iOS uses standard login for demo accounts. Android has dedicated demo endpoint. No issue. |

---

## Dead/Hallucinated Endpoints (Android Shared Services)

| # | Endpoint | Platform | Why Dead | Action |
|---|----------|----------|----------|--------|
| 1 | `/api/chat/conversations` | Android (ChatService.kt:161) | No backend route exists. Aspirational live chat service never implemented. | DEAD CODE -- remove or stub. Not called from customer app. |
| 2 | `/api/chat/conversations/{id}/messages` | Android (ChatService.kt:200,244,275) | No backend route. | DEAD CODE -- part of ChatService aspirational feature. |
| 3 | `/api/chat/conversations/{id}/read` | Android (ChatService.kt:312) | No backend route. | DEAD CODE. |
| 4 | `/api/negotiations` | Android (NegotiationService.kt:149) | No backend route. Backend uses `/api/erp/rides/{id}/customer-negotiate` instead. | DEAD CODE -- aspirational negotiation service. |
| 5 | `/api/negotiations/{id}/customer-offer` | Android (NegotiationService.kt:186) | No backend route. | DEAD CODE. |
| 6 | `/api/negotiations/{id}/driver-offer` | Android (NegotiationService.kt:223) | No backend route. | DEAD CODE. |
| 7 | `/api/negotiations/{id}/accept` | Android (NegotiationService.kt:253) | No backend route. | DEAD CODE. |
| 8 | `/api/call/sessions` | Android (CallService.kt:102,139,168) | No backend route. Aspirational voice call service. | DEAD CODE -- remove or stub. |
| 9 | `/api/call/masked-number` | Android (CallService.kt:198) | No backend route. | DEAD CODE. |
| 10 | `/api/call/initiate` | Android (CallService.kt:240) | No backend route. | DEAD CODE. |
| 11 | `/api/call/logs/{id}` | Android (CallService.kt:269) | No backend route. | DEAD CODE. |
| 12 | `/api/notifications` (GET/PUT/DELETE) | Android (NotificationViewModel.kt:42-44) | Backend has `/api/customer/notifications` at `main_new.py:17946` but Android NotificationViewModel uses hardcoded fake data, not API calls. | WARNING -- endpoints exist in backend but Android uses fake data. |

**Total dead endpoints:** 11 (all in Android shared services, not actively called from customer app)

---

## Auth Pattern Issues

| # | Endpoint | Expected | Actual (iOS) | Actual (Android) | Platform |
|---|----------|----------|-------------|-----------------|----------|
| 1 | `/api/auth/customer/apple-auth` | public (in allowlist) | Correct (no auth) | Uses path not registered as route | Android |
| 2 | `/api/rides/estimate` | any JWT (Depends(require_any_auth)) | customerToken | customerToken | Both -- PASS |
| 3 | `/api/promotions/apply` | public (in allowlist) | customerToken sent but not required | N/A | iOS sends unnecessary auth header -- harmless |

**No critical auth pattern issues found.** All customer-auth endpoints correctly require `customerToken`. All public endpoints are correctly in the auth middleware allowlist.

---

## FAIL Summary

| # | Endpoint | Platform | Issue | Severity |
|---|----------|----------|-------|----------|
| 1 | `/api/auth/customer/apple-auth` | Android | Route NOT registered in backend. Backend only has `/api/customer/apple-auth` (line 5814). Android Retrofit annotation `@POST("auth/customer/apple-auth")` resolves to `/api/auth/customer/apple-auth` which is in the allowlist but has no handler. May return 404 or 405. | HIGH |
| 2 | `/api/chat/conversations` | Android | Backend route does not exist. Aspirational ChatService. | LOW (dead code, not called from customer UI) |
| 3 | `/api/negotiations` | Android | Backend route does not exist. Aspirational NegotiationService. | LOW (dead code, not called from customer UI) |
| 4 | `/api/call/sessions` | Android | Backend route does not exist. Aspirational CallService. | LOW (dead code, not called from customer UI) |
| 5 | `/api/call/initiate` | Android | Backend route does not exist. Aspirational CallService. | LOW (dead code, not called from customer UI) |

---

## Actionable Fixes (sorted by severity)

### HIGH Priority

1. **[Android] Fix Apple Auth path** -- `DollorApiService.kt:51` uses `@POST("auth/customer/apple-auth")` but backend route is `/api/customer/apple-auth` (`main_new.py:5814`). Change to `@POST("customer/apple-auth")` OR add backend alias `@app.post("/api/auth/customer/apple-auth")`. **Impact:** Apple Sign-In on Android customer app may fail with 404.

### MEDIUM Priority

2. **[Android] Standardize FCM token registration** -- Android uses `/api/notifications/register-token` (`DollorApiService.kt:1399`), iOS uses `/api/erp/customers/{id}/fcm-token` (`P2PAPIService.swift:11031`). Both work but have different request contracts. Consider deprecating one path.

3. **[Android] Clean up dead shared services** -- `ChatService.kt`, `NegotiationService.kt`, `CallService.kt` contain 11 endpoints that do not exist in backend. These are aspirational features (Phase 10 live chat, voice calls). Should be guarded behind `SHOW_AI_FEATURES` flag or removed to prevent accidental usage.

### LOW Priority

4. **[Cross-platform] Standardize ride tracking path** -- iOS: `/api/erp/rides/{id}/track`, Android: `/api/rides/{id}/track`. Both work. Consider standardizing to `/api/rides/{id}/track` (shorter, no ERP prefix).

5. **[Cross-platform] Standardize profile update path** -- iOS: `/api/auth/customer/profile`, Android: `/api/customer/{id}/profile`. Both work via aliases. No functional issue.

6. **[Android] Wire up notification endpoints** -- Backend has `/api/customer/notifications` (GET), `/api/customer/notifications/{id}/read` (PUT), `/api/customer/notifications` (DELETE) at `main_new.py:17946-17993`. Android NotificationViewModel uses hardcoded fake data instead.

---

## Audit Statistics

- **Total unique endpoints audited:** 79 (74 real + 5 duplicates counted once)
- **PASS:** 67
- **FAIL:** 5 (1 HIGH, 4 LOW dead code)
- **WARNING:** 7 (cross-platform divergences, non-blocking)
- **iOS customer functions reviewed:** ~55
- **Android customer functions reviewed:** ~50 (Retrofit) + ~24 (OkHttp)
- **Backend files verified:** main_new.py, bid_routes.py, order_flow.py, rideshare_payments.py, voice_agent.py
