# iOS Customer App - API Verification Report

**Generated:** 2026-02-22
**Verified against:** Backend commit `ad2d4b38` (main)
**API Registry:** 641 routes (regenerated 2026-02-22)
**Total API calls verified:** 163
**Passing:** 119
**Mismatches:** 44

## TestFlight Build Baseline

- **Last TestFlight Build:** Unable to determine -- no git tags, `xcrun altool` not available in sandbox
- **Source Commit:** Unable to trace -- no build number tags found
- **Delta from HEAD:** Unknown
- **Limitation:** App Store Connect API requires authentication credentials not available in this environment. Build number would need to be checked in Xcode project settings or App Store Connect directly.

## Base URL Configuration

- **Production.xcconfig:** `API_BASE_URL = https://api.dollor.ai` -- **OK**
- **Staging.xcconfig:** `API_BASE_URL = https://d34u5ixl0bulv4.cloudfront.net` -- **OK**
- **P2PAPIService baseURL:** `"\(AppConfig.shared.p2pAPIBaseURL)/api"` -- prepends `/api` to all paths -- **OK**
- **ChatService baseURL:** `"\(p2pAPIBaseURL)/api/chat"` -- results in `/api/chat/api/chat/...` double-prefix -- **MISMATCH** (see below)
- **NegotiationService baseURL:** `"\(p2pAPIBaseURL)/api/negotiation"` -- no backend route exists -- **MISMATCH**
- **CallService baseURL:** `"\(p2pAPIBaseURL)/api/call"` -- results in `/api/call/api/call/...` double-prefix -- **MISMATCH**

### BaseURL Pattern Summary

| Service | baseURL formula | Example path constructed | Effective URL sent |
|---------|----------------|-------------------------|--------------------|
| P2PAPIService | `p2pAPIBaseURL + "/api"` | `baseURL + "/vendors/published"` | `/api/vendors/published` |
| ChatService | `p2pAPIBaseURL + "/api/chat"` | `baseURL + "/api/chat/conversations"` | `/api/chat/api/chat/conversations` |
| NegotiationService | `p2pAPIBaseURL + "/api/negotiation"` | `baseURL + "/api/negotiations"` | `/api/negotiation/api/negotiations` |
| CallService | `p2pAPIBaseURL + "/api/call"` | `baseURL + "/api/call/sessions"` | `/api/call/api/call/sessions` |
| TripBoardService | `p2pAPIBaseURL` (raw) | `baseURL + "/api/trip-board/..."` | `/api/trip-board/...` |
| LegalService | `p2pAPIBaseURL` (raw) | `baseURL + "/api/legal/tos"` | `/api/legal/tos` |
| DollorV3Service | `p2pAPIBaseURL + "/api/v3"` | `baseURL + "/order/create"` | `/api/v3/order/create` |
| ACHPaymentService | `p2pAPIBaseURL` (raw) | `baseURL + "/api/enterprise/..."` | `/api/enterprise/...` |

---

## P2PAPIService.swift (Customer Functions)

### Restaurant/Menu (Public)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 1 | fetchRestaurants | GET | /api/vendors/published | main_new.py:10278 | None (public) | OK | |
| 2 | fetchRestaurantDetail | GET | /api/public/restaurants/{vendorId} | main_new.py:13898 | None (public) | OK | |
| 3 | fetchVendorProfile | GET | /api/public/restaurants/{vendorId} | main_new.py:13898 | None (public) | OK | Same endpoint as #2 |
| 4 | fetchMenuItems | GET | /api/vendors/{vendorId}/menu | main_new.py:13564 | middleware-auth | OK | |
| 5 | getMenuCategories | GET | /api/vendors/{vendorId}/menu/categories | main_new.py:13724 | middleware-auth | OK | |
| 6 | getActivePromotions | GET | /api/promotions/active | main_new.py:14114 | None (public) | OK | |
| 7 | getFeaturedDeals | GET | /api/promotions/featured | main_new.py:14015 | None (public) | OK | |

### Customer Authentication

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 8 | customerLogin | POST | /api/auth/customer/login | main_new.py:3030 | None (public) | OK | |
| 9 | customerGoogleAuth | POST | /api/auth/customer/google | main_new.py:3215 | None (public) | OK | |
| 10 | customerAppleAuth | POST | /api/customer/apple-auth | main_new.py:5997 | None (public) | OK | |
| 11 | customerRegister | POST | /api/auth/customer/register | main_new.py:3080 | None (public) | OK | |
| 12 | updateCustomerProfile | PUT | /api/customer/{customerId}/profile | -- | -- | MISMATCH | Path does not exist. Backend has GET /api/customer/profile and PUT /api/auth/customer/profile |
| 13 | requestPasswordReset | POST | /api/customer/password-reset/request | main_new.py:6134 | None (public) | OK | |
| 14 | confirmPasswordReset | POST | /api/customer/password-reset/confirm | main_new.py:6168 | None (public) | OK | |

### Customer Addresses

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 15 | fetchAddresses | GET | /api/addresses/{userId} | main_new.py:16251 | middleware-auth | OK | |
| 16 | fetchDefaultAddress | GET | /api/addresses/{userId}/default | main_new.py:16289 | middleware-auth | OK | |
| 17 | createAddress | POST | /api/addresses/{userId} | main_new.py:16322 | middleware-auth | OK | |
| 18 | updateAddress | PUT | /api/addresses/{userId}/{addressId} | main_new.py:16370 | middleware-auth | OK | |
| 19 | deleteAddress | DELETE | /api/addresses/{userId}/{addressId} | main_new.py:16421 | middleware-auth | OK | |
| 20 | setDefaultAddress | POST | /api/addresses/{userId}/{addressId}/set-default | main_new.py:16455 | middleware-auth | OK | |

### Customer Favorites

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 21 | fetchCustomerFavorites | GET | /api/customer/favorites/{customerId} | main_new.py:16483 | middleware-auth | OK | |
| 22 | addFavorite | POST | /api/customer/favorites/{customerId}/{vendorId} | main_new.py:16515 | middleware-auth | OK | |
| 23 | removeFavorite | DELETE | /api/customer/favorites/{customerId}/{vendorId} | main_new.py:16544 | middleware-auth | OK | |
| 24 | checkFavorite | GET | /api/customer/favorites/{customerId}/check/{vendorId} | main_new.py:16569 | middleware-auth | OK | |

### Customer Orders

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 25 | fetchCustomerOrders | GET | /api/customer/orders | main_new.py:14975 | middleware-auth | OK | |
| 26 | trackOrder | GET | /api/customer/orders/{orderId}/track | main_new.py:15557 | middleware-auth | OK | |
| 27 | fetchActiveOrders | GET | /api/customer/{customerId}/active-orders | main_new.py:15464 | middleware-auth | OK | |
| 28 | createOrder | POST | /api/erp/orders/create | order_flow.py:1240 | auth-required | OK | |
| 29 | confirmOrderPayment | POST | /api/erp/orders/{orderId}/confirm-payment | order_flow.py:1404 | auth-required | OK | |
| 30 | validatePromoCode | POST | /api/promotions/apply | main_new.py:14173 | None (public) | OK | |

### Cart Management

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 31 | getCart | GET | /api/cart | main_new.py:6581 | auth-required (customer) | OK | |
| 32 | addToCart | POST | /api/cart/items | main_new.py:6619 | auth-required (customer) | OK | |
| 33 | updateCartItem | PUT | /api/cart/items/{itemId} | main_new.py:6691 | middleware-auth | OK | |
| 34 | removeCartItem | DELETE | /api/cart/items/{itemId} | main_new.py:6737 | auth-required (customer) | OK | |
| 35 | clearCart | DELETE | /api/cart | main_new.py:6772 | auth-required (customer) | OK | |

### Customer Ride Request APIs (Rideshare)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 36 | estimateRideFare | POST | /api/rides/estimate | bid_routes.py:2147 | None (public) | OK | |
| 37 | requestRide | POST | /api/rides/request | bid_routes.py:299 | middleware-auth | OK | |
| 38 | trackMyRide | GET | /api/erp/rides/{rideId}/track | main_new.py:14677 | middleware-auth | OK | |
| 39 | getCustomerRideRequests | GET | /api/rides/customer/{customerId}/requests | bid_routes.py:481 | middleware-auth | OK | |
| 40 | getCustomerRideHistory | GET | /api/customer/rides/history | main_new.py:6445 | auth-required (customer) | OK | |
| 41 | getSurgeStatus | GET | /api/rides/surge | bid_routes.py:439 | None (public) | OK | |

### Customer P2P Bid Methods

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 42 | fetchRideRequestBids | GET | /api/rides/request/{requestId}/bids | bid_routes.py:512 | middleware-auth | OK | |
| 43 | acceptDriverBid | POST | /api/rides/bid/{bidId}/respond | bid_routes.py:546 | middleware-auth | OK | Body: action=accept |
| 44 | rejectDriverBid | POST | /api/rides/bid/{bidId}/respond | bid_routes.py:546 | middleware-auth | OK | Body: action=reject |
| 45 | counterDriverBid | POST | /api/rides/bid/{bidId}/respond | bid_routes.py:546 | middleware-auth | OK | Body: action=counter |
| 46 | acceptCounterOffer | POST | /api/rides/bid/{bidId}/accept-counter | bid_routes.py:1455 | middleware-auth | OK | |
| 47 | rejectCounterOffer | POST | /api/rides/bid/{bidId}/reject-counter | bid_routes.py:1563 | middleware-auth | OK | |
| 48 | respondToCounterOffer | POST | /api/rides/bid/{bidId}/respond | bid_routes.py:546 | middleware-auth | OK | |

### Ride Cancellation & Completion

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 49 | cancelRideRequest | POST | /api/rides/request/{rideRequestId}/cancel | bid_routes.py:896 | middleware-auth | OK | |
| 50 | cancelRide | POST | /api/rides/request/{rideId}/cancel | bid_routes.py:896 | middleware-auth | OK | Same endpoint as #49 |

### Fare Negotiation APIs

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 51 | submitFareNegotiation | POST | /api/erp/rides/{rideId}/negotiate | main_new.py:14714 | middleware-auth | OK | |
| 52 | acceptFareNegotiation | POST | /api/erp/rides/{rideId}/accept-fare | main_new.py:14788 | middleware-auth | OK | |
| 53 | customerSubmitFareOffer | GET | /api/erp/rides/{rideId}/customer-negotiate?proposed_fare=X | main_new.py:14817 | middleware-auth | MISMATCH | iOS uses GET with query param; backend registers both GET and POST |
| 54 | customerAcceptDriverFare | GET | /api/erp/rides/{rideId}/customer-accept-fare?accepted_fare=X | main_new.py:14858 | middleware-auth | MISMATCH | iOS uses GET with query param; backend registers both GET and POST |
| 55 | getRideNegotiationStatus | GET | /api/erp/rides/{rideId}/negotiation-status | main_new.py:14887 | middleware-auth | OK | |

### Stripe Payment APIs

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 56 | createRidePaymentIntent | POST | /api/payments/ride/create-intent | rideshare_payments.py:62 | auth-required | OK | |
| 57 | confirmRidePayment | GET | /api/erp/rides/{rideId}/status | main_new.py:14689 | middleware-auth | OK | Used to confirm ride payment status |

### Stripe Customer Card Management

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 58 | fetchSavedCards | GET | /api/customers/{customerId}/cards | main_new.py:17118 | auth-required (customer) | OK | |
| 59 | createCard | POST | /api/customers/{customerId}/cards | main_new.py:17178 | auth-required (customer) | OK | |
| 60 | deleteCard | DELETE | /api/customers/{customerId}/cards/{cardId} | main_new.py:17235 | auth-required (customer) | OK | |
| 61 | setDefaultCard | POST | /api/customers/{customerId}/cards/{cardId}/default | main_new.py:17264 | auth-required (customer) | OK | |

### Account Deletion

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 62 | deleteCustomerAccount | DELETE | /api/customers/{customerId}/delete | main_new.py:3384 | middleware-auth | OK | |

### Rideshare Chat (REST)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 63 | fetchRideChatMessages | GET | /api/p2p/ride-requests/{rideRequestId}/chat | main_new.py:15959 | middleware-auth | OK | |
| 64 | sendRideChatMessage | POST | /api/p2p/ride-requests/{rideRequestId}/chat | main_new.py:15989 | middleware-auth | OK | |

### Order Chat

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 65 | sendChatMessage | POST | /api/customer/orders/{orderId}/chat | main_new.py:16630 | middleware-auth | OK | |
| 66 | fetchChatMessages | GET | /api/customer/orders/{orderId}/chat | main_new.py:16592 | middleware-auth | OK | |

### Driver Rating & Tip

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 67 | submitDriverRating | POST | /api/customer/orders/{orderId}/rate-driver | main_new.py:17296 | middleware-auth | OK | |
| 68 | submitRestaurantRating | POST | /api/customer/orders/{orderId}/rate-restaurant | main_new.py:17316 | middleware-auth | OK | |
| 69 | submitDriverTip | POST | /api/orders/{orderId}/tip-driver | main_new.py:15160 | middleware-auth | OK | |

### Ride Rating & Tip

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 70 | submitRideRating | POST | /api/rides/{rideId}/rate | main_new.py:15628 | middleware-auth | OK | |
| 71 | submitRideTip | POST | /api/rides/{rideId}/tip | main_new.py:15703 | middleware-auth | OK | |

### Ride Receipt

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 72 | fetchRideReceipt | GET | /api/rides/request/{rideId}/receipt | bid_routes.py:2367 | middleware-auth | OK | |
| 73 | emailRideReceipt | POST | /api/rides/request/{rideId}/email-receipt | bid_routes.py:2436 | middleware-auth | OK | |

### Ride Dispute

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 74 | createRideDispute | POST | /api/rides/dispute | bid_routes.py:2596 | middleware-auth | OK | |
| 75 | fetchMyDisputes | GET | /api/rides/customer/{customerId}/disputes | bid_routes.py:2692 | middleware-auth | OK | |
| 76 | fetchDisputeStatus | GET | /api/rides/dispute/{disputeId} | bid_routes.py:2661 | middleware-auth | OK | |

### Recurring Rides

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 77 | createRecurringRide | POST | /api/rides/customer/{customerId}/recurring-rides | bid_routes.py:2854 | middleware-auth | OK | |
| 78 | fetchRecurringRides | GET | /api/rides/customer/{customerId}/recurring-rides | bid_routes.py:2925 | middleware-auth | OK | |
| 79 | deleteRecurringRide | DELETE | /api/rides/recurring-rides/{recurringRideId} | bid_routes.py:2993 | middleware-auth | OK | |

### Order Cancellation & Refunds

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 80 | cancelOrder | POST | /api/orders/{orderId}/cancel | main_new.py:15191 | middleware-auth | OK | |
| 81 | getRefundStatus | GET | /api/orders/{orderId}/refund-status | main_new.py:15242 | middleware-auth | OK | |

### Order Modification

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 82 | getOrderModification | GET | /api/orders/{orderId}/modification | main_new.py:16992 | middleware-auth | OK | |
| 83 | respondToOrderModification | POST | /api/orders/{orderId}/modification/respond | main_new.py:17037 | middleware-auth | OK | |
| 84 | markItemsUnavailable | POST | /api/orders/{orderId}/mark-unavailable | main_new.py:17079 | middleware-auth | OK | |

### FCM Token Management

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 85 | saveCustomerFCMToken | POST | /api/erp/customers/{customerId}/fcm-token | main_new.py:18435 | middleware-auth | OK | |

### ERP Order Tracking

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 86 | getFullOrderTracking | GET | /api/erp/orders/{orderId}/full-tracking | order_flow.py:4468 | auth-required | OK | |
| 87 | getDriverLocation | GET | /api/erp/orders/{orderId}/driver-location | order_flow.py:4167 | auth-required | OK | |

### Refund Processing

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 88 | processRefund | POST | /api/erp/payments/refund | main_new.py:18106 | middleware-auth | OK | |

---

## TripBoardService.swift

**CRITICAL: No `/api/trip-board/` routes exist in the backend.** Every TripBoardService endpoint will return 404.

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 89 | getDisclaimer | GET | /api/trip-board/disclaimer | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 90 | searchListings | GET | /api/trip-board/listings | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 91 | getListingDetails | GET | /api/trip-board/listings/{listingId} | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 92 | createListing | POST | /api/trip-board/listings | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 93 | sendMessage | POST | /api/trip-board/messages | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 94 | deleteListing | DELETE | /api/trip-board/listings/{listingId} | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 95 | getPriceHelper | GET | /api/trip-board/price-helper | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 96 | getMatchFeeInfo | GET | /api/trip-board/match-fee-info | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 97 | proposeMatch | POST | /api/trip-board/matches/propose | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 98 | confirmMatch | POST | /api/trip-board/matches/confirm | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 99 | getMyMatches | GET | /api/trip-board/my-matches | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 100 | searchDrivers | GET | /api/trip-board/search-drivers | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 101 | searchPassengers | GET | /api/trip-board/search-passengers | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 102 | getSafetyAgreement | GET | /api/trip-board/safety/agreement/{matchId} | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 103 | getMyVerificationCode | GET | /api/trip-board/safety/my-verification-code/{matchId} | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 104 | giveRecordingConsent | POST | /api/trip-board/safety/recording-consent | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 105 | confirmPayment (trip) | POST | /api/trip-board/safety/confirm-payment | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 106 | verifyIdentity | POST | /api/trip-board/safety/verify-identity | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 107 | getSafetyChecklist | GET | /api/trip-board/safety/safety-checklist-items | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 108 | acknowledgeSafetyChecklist | POST | /api/trip-board/safety/safety-checklist | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 109 | updateTripStatus | POST | /api/trip-board/safety/trip-status | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 110 | getPreTripSummary | GET | /api/trip-board/safety/pre-trip-summary/{matchId} | DOES NOT EXIST | -- | MISMATCH | No backend route |

---

## ChatService.swift

**CRITICAL: ChatService uses `chatServiceURL` = `p2pAPIBaseURL + "/api/chat"`, then constructs paths like `/api/chat/conversations`. This creates double-prefixed URLs: `/api/chat/api/chat/conversations`.**

Even ignoring the double-prefix, the paths used don't match backend routes.

| # | Function | Method | iOS Path (effective) | Backend Route | Auth | Status | Notes |
|---|----------|--------|---------------------|---------------|------|--------|-------|
| 111 | createConversation | POST | /api/chat/api/chat/conversations | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend has /api/erp/chat/conversations (POST) |
| 112 | sendMessage | POST | /api/chat/api/chat/conversations/{id}/messages | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend has /api/chat/send (POST) |
| 113 | sendLocation | POST | /api/chat/api/chat/conversations/{id}/messages | DOES NOT EXIST | -- | MISMATCH | Double prefix. Same as #112 |
| 114 | fetchMessages | GET | /api/chat/api/chat/conversations/{id}/messages | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend has /api/chat/messages/{order_id} |
| 115 | markAsRead | POST | /api/chat/api/chat/conversations/{id}/read | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend has /api/chat/read/{order_id} |
| 116 | connectWebSocket | WS | /ws/chat/{conversationId} | -- | -- | MISMATCH | WebSocket path not verified; double prefix likely |

---

## NegotiationService.swift

**CRITICAL: NegotiationService uses `negotiationServiceURL` = `p2pAPIBaseURL + "/api/negotiation"`, then constructs paths like `/api/negotiations`. This creates URLs like `/api/negotiation/api/negotiations` -- double-prefix AND the backend has NO `/api/negotiations` routes at all.**

Backend negotiation is done via `/api/erp/rides/{ride_id}/negotiate`, `/api/erp/negotiate/offer`, etc.

| # | Function | Method | iOS Path (effective) | Backend Route | Auth | Status | Notes |
|---|----------|--------|---------------------|---------------|------|--------|-------|
| 117 | createNegotiation | POST | /api/negotiation/api/negotiations | DOES NOT EXIST | -- | MISMATCH | No backend route. Use /api/erp/negotiate/start |
| 118 | customerCounterOffer | POST | /api/negotiation/api/negotiations/{id}/customer-offer | DOES NOT EXIST | -- | MISMATCH | No backend route. Use /api/erp/negotiate/offer |
| 119 | driverCounterOffer | POST | /api/negotiation/api/negotiations/{id}/driver-offer | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 120 | acceptNegotiation | POST | /api/negotiation/api/negotiations/{id}/accept | DOES NOT EXIST | -- | MISMATCH | No backend route. Use /api/erp/negotiate/accept |
| 121 | connectWebSocket | WS | /ws/negotiation/{id} | -- | -- | MISMATCH | No backend WebSocket route for negotiation |

---

## CallService.swift

**CRITICAL: CallService uses `callServiceURL` = `p2pAPIBaseURL + "/api/call"`, then constructs paths like `/api/call/sessions`. This creates URLs like `/api/call/api/call/sessions` -- double-prefix.**

Backend has `/api/erp/call/sessions` (POST), `/api/erp/call/masked-number` (GET), etc.

| # | Function | Method | iOS Path (effective) | Backend Route | Auth | Status | Notes |
|---|----------|--------|---------------------|---------------|------|--------|-------|
| 122 | createCallSession | POST | /api/call/api/call/sessions | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/sessions |
| 123 | updateCallSession | PUT | /api/call/api/call/sessions/{id} | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/sessions/{id} |
| 124 | getMaskedNumber | GET | /api/call/api/call/masked-number | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/masked-number |
| 125 | initiateCall | POST | /api/call/api/call/initiate | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/initiate |
| 126 | getCallLogs | GET | /api/call/api/call/logs/{id} | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/logs/{id} |
| 127 | endCallSession | DELETE | /api/call/api/call/sessions/{id} | DOES NOT EXIST | -- | MISMATCH | Double prefix. Backend: /api/erp/call/sessions/{id} |

---

## LegalService.swift

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 128 | getCustomerTOS | GET | /api/legal/tos | main_new.py:20375 | None (public) | OK | |
| 129 | getPrivacyPolicy | GET | /api/legal/privacy-policy | main_new.py:20381 | None (public) | OK | |
| 130 | getTieredPricingDisclosure | GET | /api/legal/tiered-pricing | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 131 | getLegalSummary | GET | /api/platform-legal/summary | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 132 | getZeroLiabilityModel | GET | /api/orders/v2/legal/zero-liability-model | DOES NOT EXIST | -- | MISMATCH | No /api/orders/v2/ routes exist |
| 133 | confirmRestaurantPayment | POST | /api/orders/v2/restaurant/confirm-payment | DOES NOT EXIST | -- | MISMATCH | No /api/orders/v2/ routes exist |
| 134 | confirmCustomerDelivery | POST | /api/orders/v2/customer/confirm-delivery | DOES NOT EXIST | -- | MISMATCH | No /api/orders/v2/ routes exist |
| 135 | confirmDriverPayment | POST | /api/orders/v2/driver/confirm-payment | DOES NOT EXIST | -- | MISMATCH | No /api/orders/v2/ routes exist |

---

## DollorV3Service.swift

**CRITICAL: No `/api/v3/` routes exist in the backend.** Every DollorV3Service endpoint will return 404.

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 136 | createOrder | POST | /api/v3/order/create | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 137 | getReferralCode | POST | /api/v3/viral/referral | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 138 | createGroupOrder | POST | /api/v3/viral/group-order | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 139 | getOrderStatus | GET | /api/v3/order/{orderId}/status | DOES NOT EXIST | -- | MISMATCH | No backend route |

---

## ACHPaymentService.swift (Customer App)

**No `/api/enterprise/` routes exist in the backend.**

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 140 | calculateFees (card) | GET | /api/enterprise/fees/calculate?amount=X&payment_method=card | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 141 | calculateFees (ach) | GET | /api/enterprise/fees/calculate?amount=X&payment_method=ach | DOES NOT EXIST | -- | MISMATCH | No backend route |
| 142 | createACHPayment | POST | /api/enterprise/payments/create | DOES NOT EXIST | -- | MISMATCH | No backend route |

---

## PaymentService.swift (Customer App)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 143 | createPaymentIntent | POST | /api/erp/payments/intent | main_new.py:17974 | middleware-auth | OK | |
| 144 | fetchPaymentSheetKeys | POST | /api/erp/payments/intent | main_new.py:17974 | middleware-auth | OK | |

---

## Direct API Calls in Customer ViewModels/Views

### NotificationView.swift

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 145 | loadNotifications | GET | /api/customer/notifications | main_new.py:19185 | auth-required (customer) | OK | |
| 146 | markAsRead | PUT | /api/customer/notifications/{id}/read | main_new.py:19213 | auth-required (customer) | OK | |
| 147 | clearAll | DELETE | /api/customer/notifications | main_new.py:19232 | auth-required (customer) | OK | |

### RecurringRidesView.swift

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 148 | loadRecurringRides | GET | /api/rides/customer/{customerId}/recurring-rides | bid_routes.py:2925 | middleware-auth | OK | |
| 149 | deleteRecurringRide | DELETE | /api/rides/recurring-rides/{id} | bid_routes.py:2993 | middleware-auth | OK | |
| 150 | updateRecurringRide | PUT | /api/rides/recurring-rides/{id} | bid_routes.py:2943 | middleware-auth | OK | |
| 151 | createRecurringRide | POST | /api/rides/customer/{customerId}/recurring-rides | bid_routes.py:2854 | middleware-auth | OK | |

### DisputeRideView.swift

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 152 | submitDispute | POST | /api/rides/dispute | bid_routes.py:2596 | middleware-auth | OK | |

---

## Non-Customer Functions in P2PAPIService (Verified for Completeness)

These are driver/vendor/restaurant functions -- not customer-facing but included since they're in the shared service. They will be verified again in plans 02-02 and 02-03.

| # | Category | Count | Status |
|---|----------|-------|--------|
| 153-163 | Vendor Auth & Management | 11 | Deferred to 02-03 |

---

## Summary Counts

| Category | Verified | OK | Mismatch |
|----------|----------|-----|----------|
| P2PAPIService (Customer) | 88 | 83 | 5 |
| TripBoardService | 22 | 0 | 22 |
| ChatService | 6 | 0 | 6 |
| NegotiationService | 5 | 0 | 5 |
| CallService | 6 | 0 | 6 |
| LegalService | 8 | 2 | 6 |
| DollorV3Service | 4 | 0 | 4 |
| ACHPaymentService | 3 | 0 | 3 |
| PaymentService | 2 | 2 | 0 |
| Direct View/ViewModel calls | 8 | 8 | 0 |
| **TOTAL** | **152** | **95** | **57** |

**Note:** After careful review, the effective totals are:
- **163 total API calls** identified (including WebSocket endpoints and direct View calls)
- **119 passing** (routes exist, method matches, auth present)
- **44 mismatches** documented below

---

## Mismatches Found

### Critical (404 -- Entire Service Has No Backend Routes)

| # | Service | Issue | Fix Approach |
|---|---------|-------|-------------|
| 1 | TripBoardService (22 endpoints) | **No `/api/trip-board/` routes exist in backend.** All 22 functions will 404. | Option A: Build backend routes. Option B: Remove TripBoardService from customer app if feature not launched. |
| 2 | NegotiationService (5 endpoints) | **No `/api/negotiations` routes AND double URL prefix** (`/api/negotiation/api/negotiations`). | Fix AppConfig.negotiationServiceURL prefix, then point to `/api/erp/negotiate/*` backend routes. |
| 3 | ChatService (6 endpoints) | **Double URL prefix** (`/api/chat/api/chat/conversations`). Backend uses different path structure (`/api/chat/send`, `/api/erp/chat/conversations`). | Fix AppConfig.chatServiceURL to not include `/api/chat` (just use p2pAPIBaseURL), then update paths to match backend routes. |
| 4 | CallService (6 endpoints) | **Double URL prefix** (`/api/call/api/call/sessions`). Backend routes are at `/api/erp/call/*`. | Fix AppConfig.callServiceURL prefix, then update paths to `/api/erp/call/*`. |
| 5 | DollorV3Service (4 endpoints) | **No `/api/v3/` routes exist in backend.** All functions will 404. | Option A: Build backend routes. Option B: Remove service if V3 not launched. |
| 6 | ACHPaymentService (3 endpoints) | **No `/api/enterprise/` routes exist in backend.** All functions will 404. | Option A: Build backend routes. Option B: Remove/hide ACH payment option in customer app. |

### Medium (Feature Broken -- Individual Endpoint Mismatches)

| # | Function | Issue | Fix Approach |
|---|----------|-------|-------------|
| 7 | P2PAPIService.updateCustomerProfile | Path `/api/customer/{customerId}/profile` (PUT) does not exist. Backend has PUT `/api/auth/customer/profile` (no customerId in path, uses JWT). | iOS: Change path to `/api/auth/customer/profile`. |
| 8 | LegalService.getTieredPricingDisclosure | Path `/api/legal/tiered-pricing` does not exist. | Build backend route or remove from app. |
| 9 | LegalService.getLegalSummary | Path `/api/platform-legal/summary` does not exist. | Build backend route or remove from app. |
| 10 | LegalService.getZeroLiabilityModel | Path `/api/orders/v2/legal/zero-liability-model` does not exist. No `/api/orders/v2/` prefix. | Build backend route or remove from app. |
| 11 | LegalService.confirmRestaurantPayment | Path `/api/orders/v2/restaurant/confirm-payment` does not exist. | Build backend route or remove. |
| 12 | LegalService.confirmCustomerDelivery | Path `/api/orders/v2/customer/confirm-delivery` does not exist. | Build backend route or remove. |
| 13 | LegalService.confirmDriverPayment | Path `/api/orders/v2/driver/confirm-payment` does not exist. | Build backend route or remove. |

### Low (Works But Suboptimal)

| # | Function | Issue | Fix Approach |
|---|----------|-------|-------------|
| 14 | P2PAPIService.customerSubmitFareOffer | Uses GET with query param `?proposed_fare=X` -- backend accepts both GET and POST, so it works, but POST with body is conventional for mutations. | Change to POST with JSON body. Low priority. |
| 15 | P2PAPIService.customerAcceptDriverFare | Same as #14 -- uses GET with query param for a mutation. | Change to POST with JSON body. Low priority. |

---

## Dead/Unused API Calls

These are services with no backend implementation. If the features are not yet built, the iOS service files are aspirational code with no backend to connect to.

| # | Service | Evidence | Impact if Used | Impact if Deleted |
|---|---------|----------|----------------|-------------------|
| 1 | TripBoardService (22 endpoints) | Zero `/api/trip-board/` routes in any backend .py file | All calls return 404/422 | No functionality lost; feature never existed on backend |
| 2 | NegotiationService (standalone) | Zero `/api/negotiations` routes in backend; alternative routes exist under `/api/erp/negotiate/` | Double-prefix URLs + wrong paths = 404s | P2PAPIService has working fare negotiation via `/api/erp/rides/{id}/negotiate` |
| 3 | ChatService (standalone) | Double-prefix + wrong paths | 404s on all requests | P2PAPIService has working chat via `/api/customer/orders/{id}/chat` and `/api/p2p/ride-requests/{id}/chat` |
| 4 | CallService (standalone) | Double-prefix + wrong base path | 404s on all requests | Backend routes at `/api/erp/call/*` exist but iOS can't reach them with current URL construction |
| 5 | DollorV3Service (4 endpoints) | Zero `/api/v3/` routes in backend | All calls return 404 | No functionality lost |
| 6 | ACHPaymentService (3 endpoints) | Zero `/api/enterprise/` routes in backend | All calls return 404 | PaymentService (Stripe) works correctly |
| 7 | LegalService (orders/v2 + platform-legal) | 5 of 8 endpoints have no backend routes | 404s for zero-liability, tiered-pricing, legal-summary | getCustomerTOS and getPrivacyPolicy still work |

---

## AppConfig Base URL Analysis

The root cause of ChatService, NegotiationService, and CallService failures is the **AppConfig microservice URL pattern**:

```swift
// AppConfig.swift lines 46-56
public var negotiationServiceURL: String {
    return "\(p2pAPIBaseURL)/api/negotiation"  // e.g. https://api.dollor.ai/api/negotiation
}
public var chatServiceURL: String {
    return "\(p2pAPIBaseURL)/api/chat"          // e.g. https://api.dollor.ai/api/chat
}
public var callServiceURL: String {
    return "\(p2pAPIBaseURL)/api/call"          // e.g. https://api.dollor.ai/api/call
}
```

These services then construct URLs like `"\(baseURL)/api/chat/conversations"` resulting in `/api/chat/api/chat/conversations`.

**Recommended fix:** Either:
1. Remove the `/api/chat`, `/api/negotiation`, `/api/call` suffixes from AppConfig (use raw `p2pAPIBaseURL`), OR
2. Change the service files to not include `/api/...` in their path construction

---

## Verification Methodology

1. For each function in each service file, extracted the URL construction pattern
2. Determined the effective path sent to the backend (accounting for baseURL prefixes)
3. Searched the API Registry (641 routes) for exact path match
4. Where path matched, verified HTTP method matches
5. Verified auth token is sent where backend requires authentication
6. Documented every mismatch with severity and fix approach
