# Android Driver App API Verification Report

## Build Baseline
- Package: `ai.dollor.driver`
- Last Firebase build: vC=22, v1.0.21 (Feb 23, 2026)
- API Base URL: `https://api.dollor.ai` (production), `https://d34u5ixl0bulv4.cloudfront.net` (staging)
- Retrofit base path: `/api/` (prepended to all paths below)

## Summary
- **Total endpoints verified: 60**
- **OK: 59** (routes exist and match expected method/path)
- **Mismatches: 1** (MEDIUM: document upload POST alias wired to wrong handler)
- **Dead code: 8** (subset of OK -- routes exist but not called by any driver ViewModel)

## Driver App ViewModel-to-API Mapping

### Authentication (LoginViewModel, ForgotPasswordScreen)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| LoginViewModel | `driverLogin()` | `driverLogin()` | `POST auth/driver/login` |
| LoginViewModel | `driverRegister()` | `driverRegister()` | `POST auth/driver/register` |
| LoginViewModel | `driverGoogleAuth()` | `driverGoogleAuth()` | `POST auth/driver/google` |
| LoginViewModel | `registerFcmTokenIfNeeded()` | `registerPushToken()` | `POST notifications/register-token` |
| ForgotPasswordScreen | `driverRequestPasswordReset()` | `requestDriverPasswordReset()` | `POST driver/password-reset/request` |
| ForgotPasswordScreen | `driverConfirmPasswordReset()` | `confirmDriverPasswordReset()` | `POST driver/password-reset/confirm` |

### Profile & Documents (ProfileViewModel, DocumentsViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| ProfileViewModel | `getDriverProfile()` | `getDriverProfile()` | `GET erp/drivers/{driverId}` |
| ProfileViewModel | `getDriverEarnings()` | `getDriverEarnings()` | `GET drivers/{driverId}/earnings` |
| ProfileViewModel | `createDriverStripeAccount()` | `createDriverStripeAccount()` | `POST drivers/{driverId}/stripe/connect` |
| ProfileViewModel | `getDriverStripeOnboardingLink()` | `getDriverStripeOnboardingLink()` | `GET drivers/{driverId}/stripe/onboarding-link` |
| ProfileViewModel | `getDriverStripeStatus()` | `getDriverStripeStatus()` | `GET drivers/{driverId}/stripe/status` |
| ProfileViewModel | `getDriverStripeDashboardLink()` | `getDriverStripeDashboardLink()` | `POST drivers/{driverId}/stripe/dashboard-link` |
| ProfileViewModel | `deleteDriverAccount()` | `deleteDriverAccount()` | `DELETE drivers/{driverId}/delete` |
| DocumentsViewModel | (direct) `apiService.getDriverDocuments()` | `getDriverDocuments()` | `GET drivers/{driverId}/documents` |
| DocumentsViewModel | (direct) `apiService.uploadDriverDocument()` | `uploadDriverDocument()` | `POST drivers/{driverId}/documents` |

### Driver Status (AvailableRidesViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| AvailableRidesViewModel | `getDriverStatus()` | `getDriverStatus()` | `GET drivers/{driverId}/status` |
| AvailableRidesViewModel | `updateDriverStatus()` | `updateDriverStatus()` | `POST drivers/{driverId}/status` |

### Deliveries (AvailableOrdersViewModel, ActiveDeliveryViewModel, MyDeliveriesViewModel, ActiveTabViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| AvailableOrdersViewModel | `getAvailableDeliveries()` | `getAvailableDeliveries()` | `GET erp/orders/available-for-delivery` |
| AvailableOrdersViewModel | `acceptDelivery()` | `acceptDelivery()` | `POST erp/orders/{orderId}/assign-driver` |
| AvailableOrdersViewModel | `declineDelivery()` | `cancelDeliveryAssignment()` | `PUT erp/orders/{orderId}/unassign-driver` |
| ActiveDeliveryViewModel | `getPendingDeliveryOrders()` | `getPendingDeliveryOrders()` | `GET erp/orders/driver/{driverId}/pending` |
| ActiveDeliveryViewModel | `markDeliveryPickedUp()` | `markDeliveryPickedUp()` | `POST erp/orders/{orderId}/picked-up` |
| ActiveDeliveryViewModel | `completeDelivery()` | `completeDelivery()` | `POST erp/orders/{orderId}/delivered` |
| ActiveDeliveryViewModel | `uploadDeliveryPhoto()` | `uploadDeliveryPhoto()` | `POST erp/orders/{orderId}/delivery-photo` |
| ActiveDeliveryViewModel | `updateDriverLocation()` | `updateDriverLocation()` | `POST driver/location` |
| ActiveDeliveryViewModel | `updateOrderDriverLocation()` | `updateOrderDriverLocation()` | `PUT erp/orders/{orderId}/driver-location` |
| ActiveDeliveryViewModel | `declineDelivery()` | `cancelDeliveryAssignment()` | `PUT erp/orders/{orderId}/unassign-driver` |
| MyDeliveriesViewModel | `getMyDeliveries()` | `getMyDeliveries()` | `GET erp/driver/{driverId}/deliveries` |
| ActiveTabViewModel | `getPendingDeliveryOrders()` | `getPendingDeliveryOrders()` | `GET erp/orders/driver/{driverId}/pending` |
| ActiveTabViewModel | `getDriverBids("accepted")` | `getDriverBids()` | `GET driver/bids` |

### Rideshare (AvailableRidesViewModel, ActiveRideViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| AvailableRidesViewModel | `getAvailableRides()` | `getAvailableRides()` | `GET rides/available` |
| AvailableRidesViewModel | `acceptRide()` | `acceptRide()` | `POST erp/rides/{rideId}/accept` |
| AvailableRidesViewModel | `submitDriverFareOffer()` | `submitDriverFareOffer()` | `POST erp/rides/{rideId}/negotiate` |
| AvailableRidesViewModel | `driverAcceptFare()` | `driverAcceptFare()` | `POST erp/rides/{rideId}/accept-fare` |
| AvailableRidesViewModel | `submitRideBid()` | `submitRideBid()` | `POST rides/request/{requestId}/bid` |
| ActiveRideViewModel | `acceptRide()` | `acceptRide()` | `POST erp/rides/{rideId}/accept` |
| ActiveRideViewModel | `getAvailableRides()` | `getAvailableRides()` | `GET rides/available` |
| ActiveRideViewModel | `markRideArrived()` | `markRideArrived()` | `POST rides/request/{rideId}/arrived` |
| ActiveRideViewModel | `startRide()` | `startRide()` | `POST rides/request/{rideId}/start` |
| ActiveRideViewModel | `completeRide()` | `completeRide()` | `POST rides/request/{rideId}/complete` |
| ActiveRideViewModel | `markPassengerNoShow()` | `markPassengerNoShow()` | `POST rides/request/{rideId}/no-show` |
| ActiveRideViewModel | `ratePassenger()` | `ratePassenger()` | `POST rides/request/{rideId}/rate-passenger` |
| ActiveRideViewModel | `driverCancelRide()` | `driverCancelRide()` | `POST rides/request/{rideId}/driver-cancel` |
| ActiveRideViewModel | `updateDriverLocation()` | `updateDriverLocation()` | `POST driver/location` |

### Ride Chat (RideChatViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| RideChatViewModel | `getRideChatMessages()` | `getRideChatMessages()` | `GET p2p/ride-requests/{rideRequestId}/chat` |
| RideChatViewModel | `sendRideChatMessage()` | `sendRideChatMessage()` | `POST p2p/ride-requests/{rideRequestId}/chat` |

### Bidding (MyBidsViewModel, NavBadgeViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| MyBidsViewModel | `getDriverBids()` | `getDriverBids()` | `GET driver/bids` |
| MyBidsViewModel | `withdrawBid()` | `withdrawBid()` | `POST rides/bid/{bidId}/withdraw` |
| MyBidsViewModel | `acceptBidCounter()` | `acceptBidCounter()` | `POST rides/bid/{bidId}/accept-counter` |
| MyBidsViewModel | `rejectBidCounter()` | `rejectBidCounter()` | `POST rides/bid/{bidId}/reject-counter` |
| MyBidsViewModel | `submitDriverCounter()` | `submitDriverCounter()` | `POST rides/bid/{bidId}/driver-counter` |
| NavBadgeViewModel | `getDriverBids()` | `getDriverBids()` | `GET driver/bids` |
| NavBadgeViewModel | `getPendingDeliveryOrders()` | `getPendingDeliveryOrders()` | `GET erp/orders/driver/{driverId}/pending` |

### Earnings & Payouts (EarningsViewModel, PayoutDashboardViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| EarningsViewModel | `getDriverEarnings()` | `getDriverEarnings()` | `GET drivers/{driverId}/earnings` |
| PayoutDashboardViewModel | `getDriverEarnings()` | `getDriverEarnings()` | `GET drivers/{driverId}/earnings` |
| PayoutDashboardViewModel | `getPayoutHistory()` | `getPayoutHistory()` | `GET drivers/{driverId}/payout-history` |
| PayoutDashboardViewModel | `getDriverStripeDashboardLink()` | `getDriverStripeDashboardLink()` | `POST drivers/{driverId}/stripe/dashboard-link` |

### Order Chat (MessagesViewModel)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| MessagesViewModel | `getPendingDeliveryOrders()` | `getPendingDeliveryOrders()` | `GET erp/orders/driver/{driverId}/pending` |
| MessagesViewModel | `getDriverOrderChat()` | `getOrderChat()` | `GET customer/orders/{orderId}/chat` |
| MessagesViewModel | `sendDriverOrderChat()` | `sendOrderChat()` | `POST customer/orders/{orderId}/chat` |

### Push Notifications (DriverFirebaseMessagingService)
| ViewModel | Repository Method | DollorApiService Method | Retrofit Path |
|-----------|------------------|------------------------|---------------|
| DriverFirebaseMessagingService | `registerPushToken()` | `registerPushToken()` | `POST notifications/register-token` |

## Verification Results

### Driver Authentication
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 1 | POST | `auth/driver/login` | `main_new.py:2524` + alias `:20941` | OK | Form-encoded, both `/api/` and non-prefix registered |
| 2 | POST | `auth/driver/register` | `main_new.py:2616` + alias `:20943` | OK | JSON body |
| 3 | POST | `auth/driver/google` | `main_new.py:2730` + alias `:20944` | OK | JSON body |
| 4 | POST | `auth/driver/apple-auth` | `main_new.py:2816` + alias `:20945` | OK | Route exists but NOT called by Android driver app (dead code) |
| 5 | POST | `driver/password-reset/request` | `main_new.py:6211` | OK | JSON body |
| 6 | POST | `driver/password-reset/confirm` | `main_new.py:6244` | OK | JSON body |
| 7 | POST | `auth/driver/refresh` | `main_new.py:2590` + alias `:20942` | OK | Route exists but NOT called by Android driver app (dead code) |
| 8 | POST | `auth/driver/demo-login` | `main_new.py:1962` | OK | Route exists but NOT called by Android driver app (dead code) |

### Driver Profile
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 9 | GET | `erp/drivers/{driverId}` | `main_new.py:20961` alias | OK | Returns DriverProfile |
| 10 | PUT | `erp/drivers/{driverId}` | `main_new.py:20964` alias | OK | Route exists but NOT called by Android driver app (dead code) |
| 11 | GET | `drivers/{driverId}/documents` | `main_new.py:20967` alias -> `get_driver_documents_by_id` `:5628` | OK | Returns document list |
| 12 | POST | `drivers/{driverId}/documents` | `main_new.py:20968` alias -> **`get_driver_documents`** `:5847` | **MISMATCH** | Alias wired to wrong handler (GET-like func instead of upload handler). See Mismatches Detail. |
| 13 | GET | `drivers/{driverId}/status` | `main_new.py:4515` | OK | Returns online/offline status |
| 14 | POST | `drivers/{driverId}/status` | `main_new.py:4539` | OK | Updates driver status |
| 15 | DELETE | `drivers/{driverId}/delete` | `main_new.py:3367` | OK | Account deletion |

### Driver Deliveries
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 16 | GET | `erp/orders/available-for-delivery` | `order_flow.py:2580` (prefix `/api/erp`) | OK | Returns available orders |
| 17 | GET | `erp/driver/{driverId}/deliveries` | `main_new.py:19426` | OK | Returns driver's delivery history |
| 18 | POST | `erp/orders/{orderId}/assign-driver` | `order_flow.py:2644` (prefix `/api/erp`) | OK | Assign driver to order |
| 19 | POST | `erp/orders/{orderId}/picked-up` | `order_flow.py:2841` (prefix `/api/erp`) | OK | Mark order picked up |
| 20 | POST | `erp/orders/{orderId}/delivered` | `order_flow.py:2941` (prefix `/api/erp`) | OK | Mark order delivered |
| 21 | POST | `erp/orders/{orderId}/delivery-photo` | `order_flow.py:3803` (prefix `/api/erp`) | OK | Multipart photo upload |
| 22 | POST | `driver/location` | `main_new.py:19317` | OK | Update driver GPS location |
| 23 | PUT | `erp/orders/{orderId}/driver-location` | `order_flow.py:3904` (prefix `/api/erp`) | OK | Update order-specific driver location |

### Driver Delivery Decision
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 24 | POST | `erp/orders/{orderId}/start-delivery-decision` | `main_new.py:15845` + alias `:20988` | OK | Route exists but NOT called by Android driver app (dead code) |
| 25 | POST | `erp/orders/{orderId}/restaurant-delivery-decision` | `main_new.py:15883` + alias `:20989` | OK | Route exists but NOT called by Android driver app (dead code -- restaurant-side) |
| 26 | GET | `erp/orders/{orderId}/delivery-decision-status` | `main_new.py:15983` + alias `:20990` | OK | Route exists but NOT called by Android driver app (dead code) |

### Pending & Unassign
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 27 | GET | `erp/orders/driver/{driverId}/pending` | `order_flow.py:3704` (prefix `/api/erp`) | OK | Returns pending delivery orders |
| 28 | PUT | `erp/orders/{orderId}/unassign-driver` | `order_flow.py:3869` (prefix `/api/erp`) | OK | Unassign driver from delivery |

### Driver Rideshare
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 29 | GET | `rides/available` | `main_new.py:15641` | OK | Returns available ride requests |
| 30 | POST | `erp/rides/{rideId}/accept` | `main_new.py:14444` | OK | Accept a ride request |
| 31 | POST | `rides/request/{rideId}/arrived` | `bid_routes.py:1618` (prefix `/api/rides`) | OK | Mark driver arrived at pickup |
| 32 | POST | `rides/request/{rideId}/start` | `bid_routes.py:1853` (prefix `/api/rides`) | OK | Start the ride |
| 33 | POST | `rides/request/{rideId}/complete` | `bid_routes.py:1940` (prefix `/api/rides`) | OK | Complete the ride |
| 34 | POST | `rides/request/{rideId}/no-show` | `bid_routes.py:1769` (prefix `/api/rides`) | OK | Mark passenger as no-show |
| 35 | POST | `rides/request/{rideId}/rate-passenger` | `bid_routes.py:2255` (prefix `/api/rides`) | OK | Rate the passenger |
| 36 | POST | `rides/request/{rideId}/driver-cancel` | `bid_routes.py:1690` (prefix `/api/rides`) | OK | Driver cancels ride |
| 37 | POST | `erp/rides/{rideId}/negotiate` | `main_new.py:14518` | OK | Submit fare counter-offer |
| 38 | POST | `erp/rides/{rideId}/accept-fare` | `main_new.py:14588` | OK | Accept negotiated fare |

### Driver Ride Chat
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 39 | GET | `p2p/ride-requests/{rideRequestId}/chat` | `main_new.py:15742` + alias `:20984` | OK | Correct path (matches iOS fix from Phase 02) |
| 40 | POST | `p2p/ride-requests/{rideRequestId}/chat` | `main_new.py:15772` + alias `:20985` | OK | Correct path (matches iOS fix from Phase 02) |

### Driver Bidding
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 41 | POST | `rides/request/{requestId}/bid` | `bid_routes.py:1048` (prefix `/api/rides`) | OK | Submit a bid |
| 42 | GET | `driver/bids` | `main_new.py:15588` + alias `:20982` | OK | Get driver's bids |
| 43 | POST | `rides/bid/{bidId}/withdraw` | `bid_routes.py:1307` (prefix `/api/rides`) | OK | Withdraw a bid |
| 44 | POST | `rides/bid/{bidId}/accept-counter` | `bid_routes.py:1447` (prefix `/api/rides`) | OK | Accept customer counter-offer |
| 45 | POST | `rides/bid/{bidId}/reject-counter` | `bid_routes.py:1552` (prefix `/api/rides`) | OK | Reject customer counter-offer |
| 46 | POST | `rides/bid/{bidId}/driver-counter` | `bid_routes.py:1350` (prefix `/api/rides`) | OK | Submit driver counter-offer |

### Driver Earnings
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 47 | GET | `drivers/{driverId}/earnings` | `main_new.py:19611` | OK | Returns earnings summary |

### Driver Payouts
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 48 | POST | `drivers/{driverId}/bank-account` | `main_new.py:5214` | OK | Route exists but NOT called by driver app (dead code) |
| 49 | GET | `drivers/{driverId}/payout-history` | `main_new.py:5566` | OK | Returns payout history |
| 50 | POST | `drivers/{driverId}/payouts` | `main_new.py:5263` | OK | Route exists but NOT called by driver app (dead code) |
| 51 | GET | `drivers/{driverId}/balance` | `main_new.py:5175` | OK | Route exists but NOT called by driver app (dead code) |

### Driver Stripe Connect
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 52 | POST | `drivers/{driverId}/stripe/connect` | `main_new.py:4572` | OK | Create Stripe Connect account |
| 53 | GET | `drivers/{driverId}/stripe/onboarding-link` | `main_new.py:4637` | OK | Get Stripe onboarding URL |
| 54 | GET | `drivers/{driverId}/stripe/status` | `main_new.py:4708` | OK | Check Stripe account status |
| 55 | POST | `drivers/{driverId}/stripe/dashboard-link` | `main_new.py:4784` | OK | Get Stripe Express dashboard URL |

### Push Notifications
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 56 | POST | `notifications/register-token` | `main_new.py:17958` | OK | Form-encoded, POST method (correct, not PUT) |

### Legal
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 57 | GET | `legal/tos` | `main_new.py:19214` | OK | Terms of service |
| 58 | GET | `legal/privacy-policy` | `main_new.py:19220` | OK | Privacy policy |

### Order Chat (shared endpoints used by driver)
| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 59 | GET | `customer/orders/{orderId}/chat` | `main_new.py:16369` | OK | Driver uses customer-prefixed chat endpoint; backend accepts any authenticated user |
| 60 | POST | `customer/orders/{orderId}/chat` | `main_new.py:16414` | OK | Driver passes `sender_type: "driver"` in request body |

## Mismatches Detail

### MISMATCH #1 (MEDIUM): Document upload POST alias wired to wrong handler

- **Endpoint:** `POST /api/drivers/{driverId}/documents`
- **Android code:** `DollorApiService.kt:508` -- `@Multipart @POST("drivers/{driverId}/documents")`
- **Backend issue:** `main_new.py:20968` registers `POST /api/drivers/{driver_id}/documents` mapped to `get_driver_documents` (line 5847), which is a GET-style function that returns document status -- NOT the upload handler.
- **Correct handler:** `upload_driver_document_by_id` at `main_new.py:5679`, registered at `/drivers/{driver_id}/documents` (without `/api/` prefix).
- **Impact:** Android driver document upload POSTs to `/api/drivers/{id}/documents`, which hits the wrong handler. The multipart file data will not be processed. Document uploads will fail silently or return unexpected responses.
- **Fix:** Change line 20968 from `get_driver_documents` to `upload_driver_document_by_id`:
  ```python
  # main_new.py:20968
  # BEFORE:
  app.add_api_route("/api/drivers/{driver_id}/documents", get_driver_documents, methods=["POST"])
  # AFTER:
  app.add_api_route("/api/drivers/{driver_id}/documents", upload_driver_document_by_id, methods=["POST"])
  ```
- **Severity:** MEDIUM -- Document upload is required for driver onboarding. Drivers cannot complete verification without uploading documents.

## Dead Code Analysis

The following DollorApiService endpoints are defined in the driver-facing sections but NOT called by any driver ViewModel or service:

| # | Method | Retrofit Path | DollorApiService Method | Reason |
|---|--------|--------------|------------------------|--------|
| 1 | POST | `auth/driver/apple-auth` | `driverAppleAuth()` | Apple Sign-In is iOS-only; Android uses Google Sign-In |
| 2 | POST | `auth/driver/refresh` | `refreshDriverToken()` | Token refresh not implemented in driver app (no interceptor) |
| 3 | POST | `auth/driver/demo-login` | `driverDemoLogin()` | Demo login not wired into driver login UI |
| 4 | PUT | `erp/drivers/{driverId}` | `updateDriverProfile()` | Profile editing not implemented in driver UI |
| 5 | POST | `erp/orders/{orderId}/start-delivery-decision` | `startDeliveryDecision()` | Restaurant-side delivery decision; driver doesn't initiate |
| 6 | POST | `erp/orders/{orderId}/restaurant-delivery-decision` | `makeDeliveryDecision()` | Restaurant-side only |
| 7 | GET | `erp/orders/{orderId}/delivery-decision-status` | `getDeliveryDecisionStatus()` | Not polled by driver app |
| 8 | POST | `drivers/{driverId}/bank-account` | `linkBankAccount()` | Bank linking done through Stripe Connect onboarding flow instead |

**Note:** `requestPayout()` and `getDriverBalance()` are in the repository but not called by any driver ViewModel. They are available for future payout features. The driver currently uses Stripe Express Dashboard for payout management.

## Edge Cases Verified

### 1. DocumentsViewModel Direct API Calls
- **Pattern:** Uses `DollorApiService` directly (not via `DollorRepository`)
- **Auth:** Uses `secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)` which produces `"Bearer {token}"` -- correct format
- **GET documents:** `apiService.getDriverDocuments(driverId, authToken)` -> `GET /api/drivers/{driverId}/documents` -> hits `get_driver_documents_by_id` at line 5628 -- OK
- **POST upload:** `apiService.uploadDriverDocument(driverId, file, documentType, authToken)` -> `POST /api/drivers/{driverId}/documents` -> **hits wrong handler** (see Mismatch #1)

### 2. Auth Header Patterns
All driver ViewModels consistently use `secureStorage.getAuthHeader(SecureStorage.UserType.DRIVER)` which returns `"Bearer {token}"`. The DollorApiService uses `@Header("Authorization") token: String` pattern throughout. No auth header issues found -- Android driver app is clean.

### 3. iOS Phase 02 Cross-Check
| iOS Issue | Android Status | Notes |
|-----------|---------------|-------|
| Broken doc upload alias | **SAME BUG** on Android | POST `/api/drivers/{id}/documents` wired to wrong handler (Mismatch #1) |
| Wrong chat auth token format | **NOT AFFECTED** | Android uses `@Header("Authorization")` consistently; no separate chat-token pattern |
| PUT vs POST FCM token | **CORRECT** | Android uses `POST notifications/register-token` which matches backend (line 17958) |

### 4. Delivery Decision Flow
All 3 endpoints exist in backend (both in main_new.py and order_flow.py router). However, the driver app does NOT call any of them -- these are restaurant-side operations. The driver receives notifications about delivery decisions instead.

### 5. Pending Orders & Unassign
- `GET erp/orders/driver/{driverId}/pending` -> `order_flow.py:3704` (prefix `/api/erp`) -- EXISTS and matches
- `PUT erp/orders/{orderId}/unassign-driver` -> `order_flow.py:3869` (prefix `/api/erp`) -- EXISTS and matches

### 6. Order Chat Path
The driver app uses `customer/orders/{orderId}/chat` (shared endpoint) for order chat. This works because:
- The backend endpoint at `main_new.py:16369/16414` accepts any authenticated user (doesn't check role)
- The driver sends `sender_type: "driver"` in the chat message request body
- This is a design choice, not a bug -- the same chat thread serves both customer and driver
