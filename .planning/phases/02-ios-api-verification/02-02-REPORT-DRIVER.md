# iOS Driver App - API Verification Report

**Generated:** 2026-02-22
**Verified against:** backend commit `7442b61a` (HEAD of main)
**Last TestFlight Build:** Driver build 196 / commit `1297b663` (2026-02-18)
**Delta from HEAD:** 158 commits since last TestFlight build
**Total API calls verified:** 53
**Passing:** 49
**Mismatches:** 4

## Summary

The iOS Driver app (`apps/ios/delivery/eatffairdelivery/`) makes API calls through two mechanisms:
1. **P2PAPIService.shared** (52 function calls) -- shared service in `apps/ios/eatfair-ios-shared/`
2. **Direct URLRequest construction** (1 call) -- in `PayoutDashboardView.swift`

The `baseURL` in P2PAPIService is `"\(AppConfig.shared.p2pAPIBaseURL)/api"`, meaning all calls prepend `/api` to their paths. Backend routes are registered at varying paths -- most include `/api/` prefix, some don't. Backend has `app.add_api_route()` aliases (lines 21026-21060 in main_new.py) that add `/api` prefix versions for routes that originally lacked it.

---

## P2PAPIService.swift (Driver Functions)

### Driver Auth

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 1 | `driverLogin` | POST | `/api/auth/driver/login` | `main_new.py:1956` | None (login) | OK | Returns JWT token |
| 2 | `driverRegister` | POST | `/api/auth/driver/register` | `main_new.py:2009` | None (register) | OK | |
| 3 | `driverAppleAuth` | POST | `/api/auth/driver/apple-auth` | `main_new.py:2895` | None (login) | OK | Login + register combined |
| 4 | `requestDriverPasswordReset` | POST | `/api/driver/password-reset/request` | `main_new.py` | None (public) | OK | |
| 5 | `confirmDriverPasswordReset` | POST | `/api/driver/password-reset/confirm` | `main_new.py` | None (public) | OK | |
| 6 | `refreshDriverToken` | POST | `/api/auth/driver/refresh` | `main_new.py:2618` | Refresh token | OK | |

### Driver Profile & Documents

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 7 | `getDriverProfile` | GET | `/api/erp/drivers/{id}` | `main_new.py:4294` (original at `/erp/drivers/{id}`) + alias at line 21026 (`/api/erp/drivers/{id}`) | `require_driver` | OK | Alias provides `/api` prefix route |
| 8 | `updateDriverProfile` | PUT | `/api/drivers/{id}` | `main_new.py:4414` (original at `/drivers/{id}`) + alias at line 21027 (`/api/drivers/{id}`) | `require_driver` | OK | Alias provides `/api` prefix route |
| 9 | `getDriverDocuments` | GET | `/api/drivers/{id}/documents` | `main_new.py:5714` (original at `/drivers/{id}/documents`) + alias at line 21032 (`/api/drivers/{id}/documents`) | `require_driver` | OK | Alias provides `/api` prefix route |
| 10 | `uploadDriverDocument` | POST | `/api/drivers/{id}/documents` | `main_new.py:5766` (original at `/drivers/{id}/documents`) -- alias at line 21033 routes to WRONG handler (`get_driver_documents` instead of `upload_driver_document_by_id`) | `require_driver` | **MISMATCH** | POST alias maps to GET handler -- upload fails silently |

### Driver Status & Location

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 11 | `setDriverOnlineStatus` | PUT | `/api/auth/driver/online?is_online=` | `main_new.py` | Driver JWT | OK | |
| 12 | `updateDriverLocation` (general) | PUT | `/api/auth/driver/location?lat=&lng=` | `main_new.py` | Driver JWT | OK | |
| 13 | `updateDriverLocation` (driverId) | PUT | `/api/erp/drivers/{id}/location` | `main_new.py:17711` | `require_any_auth` | OK | |

### Delivery Operations

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 14 | `fetchAvailableDeliveryOrders` | GET | `/api/erp/orders/available-for-delivery` | `order_flow.py:2580` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 15 | `acceptDeliveryOrder` | POST | `/api/erp/orders/{id}/assign-driver` | `order_flow.py:2644` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 16 | `markOrderPickedUp` | POST | `/api/erp/orders/{id}/picked-up` | `order_flow.py:2841` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 17 | `markOrderDelivered` | POST | `/api/erp/orders/{id}/delivered` | `order_flow.py:2941` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 18 | `fetchMyDeliveries` | GET | `/api/erp/orders/driver/{id}/active` | `order_flow.py:3625` (prefix `/api/erp`) | `require_driver` | OK | |
| 19 | `completeDelivery` | PUT | `/api/erp/orders/{id}/complete-delivery` | `order_flow.py:3790` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 20 | `uploadDeliveryPhoto` | POST | `/api/erp/orders/{id}/delivery-photo` | `order_flow.py:3803` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 21 | `cancelDeliveryAssignment` | PUT | `/api/erp/orders/{id}/unassign-driver` | `order_flow.py` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 22 | `updateDriverLocation` (orderId) | PUT | `/api/erp/orders/{id}/driver-location` | `main_new.py` | `require_any_auth` | OK | |
| 23 | `getDriverDashboard` | GET | `/api/v5/driver/{id}/dashboard` | `main_new.py` | Driver JWT | OK | |

### Ride Operations (ERP)

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 24 | `fetchAvailableRides` | GET | `/api/erp/rides/available` | `order_flow.py:902` (prefix `/api/erp`) + alias main_new.py:14534 | `require_any_auth` | OK | Dual registration |
| 25 | `acceptRide` | POST | `/api/erp/rides/{id}/accept` | `order_flow.py:963` (prefix `/api/erp`) | `require_any_auth` | OK | |
| 26 | `ridePickedUp` | POST | `/api/erp/rides/{id}/picked-up` | `order_flow.py:1006` (prefix `/api/erp`) | `require_any_auth` | OK | |

### Rideshare Bidding Operations

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 27 | `fetchAvailableRideRequests` | GET | `/api/rides/available` | `bid_routes.py:959` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 28 | `submitRideBid` | POST | `/api/rides/request/{id}/bid` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 29 | `fetchDriverBids` | GET | `/api/rides/driver/{id}/bids` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 30 | `withdrawBid` | POST | `/api/rides/bid/{id}/withdraw` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 31 | `driverSubmitCounter` | POST | `/api/rides/bid/{id}/driver-counter` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 32 | `acceptCounterOffer` | POST | `/api/rides/bid/{id}/accept-counter` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 33 | `rejectCounterOffer` | POST | `/api/rides/bid/{id}/reject-counter` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |

### Ride Status & Completion

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 34 | `driverArrivedAtPickup` | POST | `/api/rides/request/{id}/arrived` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 35 | `startRide` | POST | `/api/rides/request/{id}/start` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 36 | `completeRideRequest` | POST | `/api/rides/request/{id}/complete` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 37 | `driverCancelRide` | POST | `/api/rides/request/{id}/driver-cancel` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 38 | `markPassengerNoShow` | POST | `/api/rides/request/{id}/no-show` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |
| 39 | `ratePassenger` | POST | `/api/rides/request/{id}/rate-passenger` | `bid_routes.py` (prefix `/api/rides`) | `require_any_auth` | OK | |

### Fare Negotiation

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 40 | `submitFareNegotiation` | POST | `/api/erp/rides/{id}/negotiate` | `main_new.py:14622` (alias) + `order_flow.py` (router) | `require_any_auth` | OK | |
| 41 | `acceptFareNegotiation` | POST | `/api/erp/rides/{id}/accept-fare` | `main_new.py:14692` (alias) + `order_flow.py` (router) | `require_any_auth` | OK | |

### Rideshare Chat

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 42 | `fetchRideChatMessages` | GET | `/api/p2p/ride-requests/{id}/chat` | `main_new.py:15847` | `require_any_auth` | **MISMATCH** | Uses `customerToken` instead of `driverToken` -- Driver app will send nil token |
| 43 | `sendRideChatMessage` | POST | `/api/p2p/ride-requests/{id}/chat` | `main_new.py:15877` | `require_any_auth` | **MISMATCH** | Uses `customerToken` instead of `driverToken` -- Driver app will send nil token |

### Account Management

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 44 | `deleteDriverAccount` | DELETE | `/api/drivers/{id}/delete` | `main_new.py:3454` | `require_driver` | OK | Apple App Store requirement |

### FCM Token

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 45 | `saveDriverFCMToken` (token:) | POST | `/api/erp/drivers/{id}/fcm-token` | `main_new.py:17761` | `require_any_auth` | OK | Not called from Driver app |
| 46 | `saveDriverFCMToken` (fcmToken:) | PUT | `/api/erp/drivers/{id}/fcm-token` | `main_new.py:17761` (POST only) | `require_any_auth` | **MISMATCH** | PUT method -- backend only accepts POST. Called from `eatffairdeliveryApp.swift:217` |

### Earnings & Payouts

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 47 | `getDriverEarnings` | GET | `/api/drivers/{id}/earnings?period=` | `main_new.py:19676` | Driver JWT | OK | |
| 48 | `getPayoutHistory` | GET | `/api/drivers/{id}/payout-history?limit=` | `main_new.py:5653` | Driver JWT | OK | |

### Stripe Connect

| # | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|----------|--------|----------|---------------|------|--------|-------|
| 49 | `createStripeConnectAccount` | POST | `/api/drivers/{id}/stripe/connect` | `main_new.py:4659` | Driver JWT | OK | |
| 50 | `getStripeOnboardingLink` | GET | `/api/drivers/{id}/stripe/onboarding-link` | `main_new.py:4724` | Driver JWT | OK | |
| 51 | `getStripeAccountStatus` | GET | `/api/drivers/{id}/stripe/status` | `main_new.py:4795` | Driver JWT | OK | |
| 52 | `getStripeDashboardLink` | POST | `/api/drivers/{id}/stripe/dashboard-link` | `main_new.py:4871` | Driver JWT | OK | |

---

## Direct API Calls in Driver App

### Views

| # | File | Function | Method | iOS Path | Backend Route | Auth | Status | Notes |
|---|------|----------|--------|----------|---------------|------|--------|-------|
| 53 | `PayoutDashboardView.swift:383` | `fetchPayoutHistory` | GET | `/api/rides/driver/{id}/payout-history?period=` | `bid_routes.py:2426` (prefix `/api/rides`) | `driverAccessToken` | OK | Uses `AppConfig.shared.p2pAPIBaseURL` directly (not P2PAPIService.baseURL) |

### ViewModels (No Direct API Calls)

All Driver app ViewModels exclusively use `P2PAPIService.shared` for API calls:
- `DeliveryViewModel.swift` -- uses P2PAPIService for all delivery + ride operations
- `EarningsViewModel.swift` -- uses P2PAPIService + Firebase Firestore fallback
- `RideBiddingViewModel.swift` -- uses P2PAPIService + WebSocketManager for real-time
- `DriverProfileViewModel.swift` -- uses P2PAPIService + Firebase fallback

### Services (No Direct API Calls)

- `LocationManager.swift` -- uses P2PAPIService for location updates
- `ChatManager.swift` -- Firebase Firestore only (no REST API calls)
- `AuthManager.swift` -- local state only (no API calls)
- `VoiceAssistantManager.swift` -- local speech recognition only (no API calls)

### Views (No Direct API Calls)

These Views delegate all API calls to their respective ViewModels:
- `DriverLoginView.swift` -- uses P2PAPIService directly (all auth functions)
- `DriverDashboardView.swift` -- orchestrates ViewModels
- `DriverProfileView.swift` -- uses P2PAPIService (deleteDriverAccount) + DriverProfileViewModel
- `DriverStatsCard.swift` -- uses P2PAPIService (getDriverDashboard) + Firebase fallback
- `AvailableOrdersView.swift` -- delegates to DeliveryViewModel
- `ActiveDeliveryDetailView.swift` -- delegates to DeliveryViewModel
- `MyDeliveriesView.swift` -- delegates to DeliveryViewModel
- `DeliveryProofSheet.swift` -- delegates to DeliveryViewModel
- `RideshareDashboardView.swift` -- delegates to RideBiddingViewModel
- `ActiveRideView.swift` -- delegates to RideBiddingViewModel
- `SubmitBidSheet.swift` -- delegates to RideBiddingViewModel
- `CounterOfferResponseSheet.swift` -- delegates to RideBiddingViewModel
- `RiderChatView.swift` -- uses P2PAPIService (fetchRideChatMessages, sendRideChatMessage)
- `TermsAndConditionsView.swift` -- local storage only (no API call)
- `eatffairdeliveryApp.swift` -- uses P2PAPIService (saveDriverFCMToken)

---

## Mismatches Found

### Critical (App Crash / Data Loss / Feature Broken)

| # | Function | Issue | Fix Approach |
|---|----------|-------|--------------|
| 1 | `uploadDriverDocument` (P2PAPIService.swift:5766) | POST alias at `main_new.py:21033` maps `POST /api/drivers/{id}/documents` to `get_driver_documents` (a GET-semantics function that returns document status) instead of `upload_driver_document_by_id` (the actual upload handler). Driver document uploads silently fail -- the response returns document status instead of processing the uploaded file. | **Backend fix:** Change line 21033 from `get_driver_documents` to `upload_driver_document_by_id`. One-line change. |
| 2 | `fetchRideChatMessages` (P2PAPIService.swift:6798) | Uses `customerToken` (line 6798) instead of `driverToken`. In the Driver app, `customerToken` is nil (drivers don't log in as customers). Calls will be sent without auth header. Global middleware returns 401. **Rideshare chat completely broken for drivers.** | **iOS fix:** Add a `driverToken` parameter path or create a driver-specific `fetchRideChatMessages` that uses `driverToken`. Backend already accepts any valid JWT via `require_any_auth`. |
| 3 | `sendRideChatMessage` (P2PAPIService.swift:6847) | Same issue as #2 -- uses `customerToken` instead of `driverToken`. Driver app cannot send chat messages. **Rideshare chat send completely broken for drivers.** | **iOS fix:** Same as #2 -- use `driverToken` for auth header when called from Driver app context. |

### Medium (Feature Degraded)

| # | Function | Issue | Fix Approach |
|---|----------|-------|--------------|
| 4 | `saveDriverFCMToken(fcmToken:)` (P2PAPIService.swift:10812) | Uses HTTP `PUT` method but backend endpoint `POST /api/erp/drivers/{id}/fcm-token` only accepts `POST`. The Driver app calls this variant from `eatffairdeliveryApp.swift:217`. Results in 405 Method Not Allowed. **Push notifications not registered for drivers.** | **iOS fix:** Change line 10812 from `request.httpMethod = "PUT"` to `request.httpMethod = "POST"`. Or **backend fix:** add `PUT` to the route's allowed methods. |

### Low (Cosmetic / Non-Breaking)

None found.

---

## Dead/Unused API Calls

| # | Function | Evidence | Impact if Used | Impact if Deleted |
|---|----------|----------|----------------|-------------------|
| 1 | `saveDriverFCMToken(token:)` (POST variant, line 10680) | No call sites in Driver app -- only the `fcmToken:` variant (line 10801) is called from `eatffairdeliveryApp.swift` | Would work correctly (POST matches backend) | None -- unused by Driver app. May be used by other apps. |

---

## Route Alias Architecture Notes

The backend has two layers of route registration for Driver app endpoints:

1. **Primary routes** (registered via `@app.get/post/put/delete` decorators) -- some lack `/api/` prefix:
   - `GET /erp/drivers/{driver_id}` (line 4294)
   - `PUT /drivers/{driver_id}` (line 4414)
   - `GET /drivers/{driver_id}/documents` (line 5714)
   - `POST /drivers/{driver_id}/documents` (line 5766)

2. **Aliases** (registered via `app.add_api_route()` at lines 21026-21060) -- add `/api/` prefix versions:
   - `GET /api/erp/drivers/{driver_id}` -> `get_driver_profile_by_id` (line 21026) -- OK
   - `PUT /api/drivers/{driver_id}` -> `update_driver_profile_by_id` (line 21027) -- OK
   - `GET /api/drivers/{driver_id}/documents` -> `get_driver_documents_by_id` (line 21032) -- OK
   - `POST /api/drivers/{driver_id}/documents` -> `get_driver_documents` (line 21033) -- **BUG: wrong handler**

The alias system was added in v1.2 to bridge the gap between iOS's `/api` prefix and some backend routes that lack it. Most aliases are correct, but the document upload alias (line 21033) maps to the wrong function.

---

## Verification Methodology

1. Scanned all 35+ Swift files in `apps/ios/delivery/eatffairdelivery/` for `P2PAPIService.shared`, `URLRequest`, `URL(string:`, and `baseURL` references
2. Traced each P2PAPIService function call to its definition in `P2PAPIService.swift` (14,103 lines)
3. Extracted the URL path each function constructs
4. Verified path existence in backend via `grep` against `main_new.py`, `order_flow.py`, `bid_routes.py`, `chat_routes.py`
5. Checked HTTP method, auth dependency, and request/response contract
6. Cross-referenced `API_REGISTRY.md` (641 routes) for completeness
