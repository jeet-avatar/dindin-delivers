# Android UI Audit Report -- All 3 Apps

**Date:** 2026-03-05
**Scope:** Every button, onClick handler, navigation item, and API call in the Android Customer, Driver, and Partner apps
**Android Repo:** `/Users/jeet/StudioProjects/eatfair-android/`
**Backend:** `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/`
**Base URL:** `https://api.dollor.ai/api` (all Retrofit paths prefixed with `/api/`)

## Summary Table

| App | Screens | Buttons/Handlers | OK | DEAD | MISSING | WRONG_TARGET | Total Issues |
|-----|---------|-------------------|----|------|---------|--------------|--------------|
| Customer | 35 | 87 | 80 | 2 | 2 | 3 | 7 |
| Driver | 23 | 56 | 53 | 0 | 1 | 2 | 3 |
| Partner | 26 | 48 | 45 | 1 | 0 | 2 | 3 |
| **TOTAL** | **84** | **191** | **178** | **3** | **3** | **7** | **13** |

### Legend
- **OK** -- Handler correctly wired to a working action (navigation, API call, or UI state change)
- **DEAD** -- Handler exists but does nothing (empty lambda `{}`, no-op, or calls non-existent endpoint)
- **MISSING** -- Expected handler is absent (button exists with no onClick or no callback parameter)
- **WRONG_TARGET** -- Handler calls wrong API endpoint or navigates to wrong screen

---

## Android Customer App

**Source:** `app/src/main/java/ai/dollor/customer/`
**API Services:** `shared/.../DollorApiService.kt` (Retrofit), `customer/data/CustomerRideshareApiService.kt` (OkHttp)

### Bottom Navigation (MainScreen.kt)

| Tab | Route | Target Screen | Status |
|-----|-------|---------------|--------|
| Home | `home` | HomeScreen | **OK** |
| Search | `search` | SearchScreen | **OK** |
| Orders | `orders` | MyOrdersScreen | **OK** |
| Profile | `profile` | ProfileScreen | **OK** |

All 4 tabs correctly switch content via `selectedTabIndex`. Tab 2 (Orders) triggers `ordersViewModel.fetchOrders()` on selection. **All OK.**

### Navigation Routes (NavigationGraph.kt, Navigation.kt)

| Route | Screen Composable | Wired In NavGraph | Status |
|-------|-------------------|-------------------|--------|
| `auth_flow` -> `login` | LoginScreen | Yes (line 598) | **OK** |
| `signup` | RegisterScreen | Yes (line 573) | **OK** |
| `forgot_password` | ForgotPasswordScreen | Yes (authGraph) | **OK** |
| `legal_acceptance` | LegalAcceptanceScreen | Yes (authGraph) | **OK** |
| `main` | MainScreen | Yes (line 145) | **OK** |
| `home` | HomeScreen | Yes (line 234) | **OK** |
| `search` | SearchScreen | Yes (line 263) | **OK** |
| `restaurant/{restaurantId}` | RestaurantScreen | Yes (restaurantGraph) | **OK** |
| `cart` | CartScreen | Yes (line 281) | **OK** |
| `order_tracking?orderId={orderId}` | OrderTrackingScreen | Yes (line 311) | **OK** |
| `order_success?...` | OrderSuccessScreen | Yes (line 333) | **OK** |
| `rate_driver?...` | RateDriverScreen | Yes (line 374) | **OK** |
| `rate_restaurant?...` | RateRestaurantScreen | Yes (line 421) | **OK** |
| `tip_driver?...` | TipDriverScreen | Yes (line 479) | **OK** |
| `partial_order?orderId={orderId}` | PartialOrderScreen | Yes (line 525) | **OK** |
| `deals` | DealsScreen | Yes (line 542) | **OK** |
| `ride_request` | RideRequestScreen | Yes (rideshareGraph) | **OK** |
| `driver_chat/{rideRequestId}/{driverName}` | DriverChatScreen | Yes (rideshareGraph) | **OK** |
| `ride_receipt/{rideRequestId}` | RideReceiptScreen | Yes (rideshareGraph) | **OK** |
| `dispute_list` | DisputeScreen | Yes (rideshareGraph) | **OK** |
| `create_dispute/{rideRequestId}` | DisputeScreen | Yes (rideshareGraph) | **OK** |
| `recurring_rides` | RecurringRidesScreen | Yes (rideshareGraph) | **OK** |
| `create_recurring_ride` | RecurringRidesScreen | Yes (rideshareGraph) | **OK** |
| `help_support` | HelpSupportScreen | Yes (profileGraph) | **OK** |
| `live_chat` | LiveChatScreen | Yes (profileGraph) | **OK** |
| `order_chat/{orderId}/{driverName}` | OrderChatScreen | Yes (profileGraph) | **OK** |
| `what_drivers_see` | DriverPrivacyScreens | Yes (profileGraph) | **OK** |
| `your_privacy` | DriverPrivacyScreens | Yes (profileGraph) | **OK** |
| `safety_features` | DriverPrivacyScreens | Yes (profileGraph) | **OK** |
| `edit_profile` | EditProfileScreen | Yes (profileGraph) | **OK** |
| `notification` | NotificationScreen | Yes (profileGraph) | **OK** |
| `settings` | SettingsScreen | Yes (profileGraph) | **OK** |
| `privacy_policy` | PrivacyPolicyScreen | Yes (profileGraph) | **OK** |
| `terms_conditions` | TermsConditionsScreen | Yes (profileGraph) | **OK** |
| `saved_addresses` | SavedAddressesScreen | Yes (addressGraph) | **OK** |
| `location_map` | LocationMapScreen | Yes (addressGraph) | **OK** |
| `add_address_details?addressId={addressId}` | AddAddressDetailsScreen | Yes (addressGraph) | **OK** |
| `payment_methods` | PaymentMethodsScreen | Yes (profileGraph) | **OK** |
| `favorites` | FavoritesScreen | Yes (profileGraph) | **OK** |
| `refer_and_earn` | ReferAndEarnScreen | Yes (profileGraph) | **OK** |

### MainScreen onClick Handlers (MainScreen.kt)

| Handler | Source | Action | Status |
|---------|--------|--------|--------|
| `onCategoryClick` | HomeScreen | Empty lambda `{}` | **DEAD** -- no-op, no categories screen exists |
| `onFoodItemClick` | HomeScreen | Empty lambda `{}` | **DEAD** -- no-op, individual food items not clickable |
| `onProfileClick` | HomeScreen | Tab switch to Profile (index 3) | **OK** |
| `onLocationClick` | HomeScreen | Navigate to LocationMap | **OK** |
| `onSearchClick` | HomeScreen | Tab switch to Search (index 1) | **OK** |
| `onRestaurantClick` | HomeScreen | Navigate to Restaurant/{id} | **OK** |
| `onViewCartClick` | HomeScreen/MainScreen | Navigate to Cart | **OK** |
| `onTrackOrderClick` | HomeScreen/MyOrders | Navigate to OrderTracking | **OK** |
| `onRideshareClick` | HomeScreen | Navigate to RideRequest | **OK** |
| `onAiAssistantClick` | HomeScreen | Tab switch to Search (index 1) | **OK** |
| `onDealClick` | HomeScreen | Navigate to Restaurant by vendorId | **OK** |
| `onMultiRestaurantLearnMore` | HomeScreen | Tab switch to Search (index 1) | **OK** |
| `onSeeAllRestaurantsClick` | HomeScreen | Tab switch to Search (index 1) | **OK** |
| `onBackClick` (Search) | SearchScreen | Tab switch to Home (index 0) | **OK** |
| `onRecentSearchClick` | SearchScreen | searchViewModel.searchByTerm() | **OK** |
| `onCuisineClick` | SearchScreen | searchViewModel.searchByTerm() | **OK** |
| `onSearchResultClick` | SearchScreen | Navigate to Restaurant/{id} | **OK** |
| `onBackClick` (Orders) | MyOrdersScreen | Tab switch to Home (index 0) | **OK** |
| `onCartClick` | MyOrdersScreen | Navigate to Cart | **OK** |
| `onStartOrderingClick` | MyOrdersScreen | Tab switch to Home (index 0) | **OK** |
| `onTrackOrderClick` (Orders) | MyOrdersScreen | Navigate to OrderTracking | **OK** |
| `onRestaurantClick` (Orders) | MyOrdersScreen | Navigate to Restaurant | **OK** |
| `onBackClick` (Profile) | ProfileScreen | Tab switch to Home (index 0) | **OK** |
| `onOrderHistoryClick` | ProfileScreen | Tab switch to Orders (index 2) | **OK** |
| `onEditProfileClick` | ProfileScreen | Navigate to EditProfile | **OK** |
| `onNotificationsClick` | ProfileScreen | Navigate to Notifications | **OK** |
| `onReferAndEarnClick` | ProfileScreen | Navigate to ReferAndEarn | **OK** |
| `onSavedAddressClick` | ProfileScreen | Navigate to SavedAddresses | **OK** |
| `onSettingsClick` | ProfileScreen | Navigate to Settings | **OK** |
| `onPaymentMethodClick` | ProfileScreen | Navigate to PaymentMethods | **OK** |
| `onFavoritesClick` | ProfileScreen | Navigate to Favorites | **OK** |
| `onHelpSupportClick` | ProfileScreen | Navigate to HelpSupport | **OK** |
| `onWhatDriversSeeClick` | ProfileScreen | Navigate to WhatDriversSee | **OK** |
| `onYourPrivacyClick` | ProfileScreen | Navigate to YourPrivacy | **OK** |
| `onSafetyFeaturesClick` | ProfileScreen | Navigate to SafetyFeatures | **OK** |
| `onDeleteAccountClick` | ProfileScreen | Calls authViewModel.deleteAccount() | **OK** |
| `onLogoutClick` | ProfileScreen | Calls authViewModel.logout() | **OK** |

### OrderTrackingScreen Handlers (NavigationGraph.kt line 311)

| Handler | Action | Status |
|---------|--------|--------|
| `onBackClick` | Navigate to Main | **OK** |
| `onCallPartner` | Empty lambda (phone dialer) | **MISSING** -- receives phone string but no Intent launched |
| `onAddInstructions` | Empty lambda (instruction dialog) | **MISSING** -- comment says "Show instruction dialog" but empty |
| `onPartialOrderClick` | Navigate to PartialOrder | **OK** |

### Customer API Endpoint Verification (DollorApiService.kt)

| Retrofit Path | Full URL | Backend Route | Status |
|---------------|----------|---------------|--------|
| `vendors/published` | `/api/vendors/published` | `main_new.py:10132` | **OK** |
| `public/restaurants/{id}` | `/api/public/restaurants/{id}` | `main_new.py:13772` | **OK** |
| `auth/customer/login` | `/api/auth/customer/login` | `main_new.py:3099` | **OK** |
| `auth/customer/register` | `/api/auth/customer/register` | `main_new.py:3149` | **OK** |
| `auth/customer/google` | `/api/auth/customer/google` | `main_new.py:3257` | **OK** |
| `auth/customer/apple-auth` | `/api/auth/customer/apple-auth` | Backend has `/api/customer/apple-auth` (line 5893) | **WRONG_TARGET** |
| `customer/password-reset/request` | `/api/customer/password-reset/request` | `main_new.py:6028` | **OK** |
| `customer/password-reset/confirm` | `/api/customer/password-reset/confirm` | `main_new.py:6061` | **OK** |
| `customer/{customerId}/profile` | `/api/customer/{customerId}/profile` | Not found as PUT | **WRONG_TARGET** -- backend profile update is different path |
| `customer/demo-login` | `/api/customer/demo-login` | `main_new.py:1955` | **OK** |
| `customers/{customerId}/delete` | `/api/customers/{customerId}/delete` | `main_new.py:3392` | **OK** |
| `customer/orders` | `/api/customer/orders` | `main_new.py:14824` | **OK** |
| `customer/{customerId}/active-orders` | `/api/customer/{customerId}/active-orders` | `main_new.py:15575` | **OK** |
| `customer/orders/{orderId}/track` | `/api/customer/orders/{orderId}/track` | `main_new.py:15664` | **OK** |
| `erp/orders/create` | `/api/erp/orders/create` | `order_flow.py` router prefix `/api/erp` | **OK** |
| `erp/orders/{orderId}/confirm-payment` | `/api/erp/orders/{orderId}/confirm-payment` | `order_flow.py` | **OK** |
| `orders/{orderId}/tip-driver` | `/api/orders/{orderId}/tip-driver` | `main_new.py:15007` | **OK** |
| `orders/{orderId}/cancel` | `/api/orders/{orderId}/cancel` | `main_new.py:15039` | **OK** |
| `orders/{orderId}/refund-status` | `/api/orders/{orderId}/refund-status` | `main_new.py:15087` | **OK** |
| `orders/{orderId}/modification` | `/api/orders/{orderId}/modification` | `main_new.py:17112` | **OK** |
| `orders/{orderId}/modification/respond` | `/api/orders/{orderId}/modification/respond` | `main_new.py:17157` | **OK** |
| `orders/{orderId}/mark-unavailable` | `/api/orders/{orderId}/mark-unavailable` | `main_new.py:17199` | **OK** |
| `customer/orders/{orderId}/rate-driver` | `/api/customer/orders/{orderId}/rate-driver` | `main_new.py:17412` | **OK** |
| `customer/orders/{orderId}/rate-restaurant` | `/api/customer/orders/{orderId}/rate-restaurant` | `main_new.py:17436` | **OK** |
| `customer/orders/{orderId}/chat` (GET+POST) | `/api/customer/orders/{orderId}/chat` | `main_new.py:16693/16738` | **OK** |
| `support/chat` | `/api/support/chat` | `main_new.py` (allowlisted) | **OK** |
| `addresses/{customerId}` (CRUD) | `/api/addresses/{customerId}` | `main_new.py:16358-16557` | **OK** |
| `customer/favorites/{customerId}` (CRUD) | `/api/customer/favorites/{customerId}` | `main_new.py:16584-16671` | **OK** |
| `rides/request` | `/api/rides/request` | `bid_routes.py:330` (prefix `/api/rides`) | **OK** |
| `rides/estimate` | `/api/rides/estimate` | `bid_routes.py:2146` | **OK** |
| `rides/{rideId}/track` | `/api/rides/{rideId}/track` | `main_new.py:15378` | **OK** |
| `rides/request/{rideId}/cancel` | `/api/rides/request/{rideId}/cancel` | `bid_routes.py:924` | **OK** |
| `rides/{rideId}/rate` | `/api/rides/{rideId}/rate` | `main_new.py:15739` | **OK** |
| `erp/rides/{rideId}/customer-negotiate` | `/api/erp/rides/{rideId}/customer-negotiate` | `main_new.py:14662-14663` | **OK** |
| `erp/rides/{rideId}/customer-accept-fare` | `/api/erp/rides/{rideId}/customer-accept-fare` | `main_new.py:14703-14704` | **OK** |
| `customers/{customerId}/cards` (CRUD) | `/api/customers/{customerId}/cards` | `main_new.py:17238-17381` | **OK** |
| `promotions/active` | `/api/promotions/active` | `main_new.py:13988` | **OK** |
| `promotions/featured` | `/api/promotions/featured` | `main_new.py:13889` | **OK** |
| `promotions/apply` | `/api/promotions/apply` | `promotions.py:518` (prefix `/api/promotions`) | **OK** |
| `customer/rides/history` | `/api/customer/rides/history` | `main_new.py:6341` | **OK** |
| `payments/create-intent` | `/api/payments/create-intent` | `stripe_integration.py:125` (prefix `/api/`) | **OK** |
| `p2p/ride-requests/{id}/chat` (GET+POST) | `/api/p2p/ride-requests/{id}/chat` | `main_new.py:16066/16096` | **OK** |
| `erp/orders/{orderId}/full-tracking` | `/api/erp/orders/{orderId}/full-tracking` | `order_flow.py:5104` (prefix `/api/erp`) | **OK** |
| `erp/orders/{orderId}/driver-location` | `/api/erp/orders/{orderId}/driver-location` | `order_flow.py:4803` | **OK** |
| `legal/tos` | `/api/legal/tos` | `main_new.py:19550` | **OK** |
| `legal/privacy-policy` | `/api/legal/privacy-policy` | `main_new.py:19556` | **OK** |
| `notifications/register-token` | `/api/notifications/register-token` | `main_new.py:18283` | **OK** |
| `tax/calculate` | `/api/tax/calculate` | `main_new.py:21549-21550` | **OK** |
| `tax/estimate/{state}` | `/api/tax/estimate/{state}` | `main_new.py:21617` | **OK** |

### CustomerRideshareApiService.kt Endpoint Verification (OkHttp)

| Method | URL Built | Backend Route | Status |
|--------|-----------|---------------|--------|
| `createRideRequest()` | `{BASE_URL}/api/rides/request` | `bid_routes.py:330` | **OK** |
| `getMyRideRequests()` | `{BASE_URL}/api/rides/customer/{id}/requests` | `bid_routes.py:519` | **OK** |
| `getBidsForRide()` | `{BASE_URL}/api/rides/request/{id}/bids` | `bid_routes.py:548` | **OK** |
| `acceptBid()` | `{BASE_URL}/api/rides/bid/{id}/respond` | `bid_routes.py:579` | **OK** |
| `rejectBid()` | `{BASE_URL}/api/rides/bid/{id}/respond` | `bid_routes.py:579` | **OK** |
| `counterBid()` | `{BASE_URL}/api/rides/bid/{id}/respond` | `bid_routes.py:579` | **OK** |
| `customerSubmitFareOffer()` | `{BASE_URL}/api/erp/rides/{id}/customer-negotiate` | `main_new.py:14662` | **OK** |
| `customerAcceptDriverFare()` | `{BASE_URL}/api/erp/rides/{id}/customer-accept-fare` | `main_new.py:14703` | **OK** |
| `getRideNegotiationStatus()` | `{BASE_URL}/api/erp/rides/{id}/negotiation-status` | Not found in backend | **WRONG_TARGET** |
| `cancelRideRequest()` | `{BASE_URL}/api/rides/request/{id}/cancel` | `bid_routes.py:924` | **OK** |
| `trackRide()` | `{BASE_URL}/api/rides/{id}/track` | `main_new.py:15378` | **OK** |
| `fetchChatMessages()` | `{BASE_URL}/api/p2p/ride-requests/{id}/chat` | `main_new.py:16066` | **OK** |
| `sendChatMessage()` | `{BASE_URL}/api/p2p/ride-requests/{id}/chat` | `main_new.py:16096` | **OK** |

### Customer App Issues Summary

| # | File | Line | Category | Description |
|---|------|------|----------|-------------|
| C1 | `MainScreen.kt` | 172 | DEAD | `onCategoryClick = {}` -- empty lambda, no categories screen |
| C2 | `MainScreen.kt` | 173 | DEAD | `onFoodItemClick = {}` -- empty lambda, no action |
| C3 | `NavigationGraph.kt` | ~321 | MISSING | `onCallPartner` -- receives phone but no dialer Intent launched |
| C4 | `NavigationGraph.kt` | ~324 | MISSING | `onAddInstructions` -- empty lambda, no instruction dialog |
| C5 | `DollorApiService.kt` | 52 | WRONG_TARGET | `auth/customer/apple-auth` -> backend `/api/customer/apple-auth` (missing `auth/` segment) |
| C6 | `DollorApiService.kt` | 75 | WRONG_TARGET | `customer/{customerId}/profile` PUT -- backend path may differ |
| C7 | `CustomerRideshareApiService.kt` | ~440 | WRONG_TARGET | `erp/rides/{id}/negotiation-status` -- endpoint not found in backend |

---

## Android Driver App

**Source:** `driver/src/main/java/ai/dollor/driver/`
**API Service:** Shared `DollorApiService.kt`

### Bottom Navigation (DriverNavGraph.kt)

| Tab | Route | Target Screen | Status |
|-----|-------|---------------|--------|
| Delivery | `delivery` | AvailableOrdersScreen | **OK** |
| Rideshare | `rideshare` | RideshareTabScreen | **OK** |
| Active | `active` | ActiveTabScreen | **OK** |
| Messages | `messages` | MessagesScreen | **OK** |
| Profile | `profile` | ProfileScreen | **OK** |

All 5 tabs correctly navigate using `NavHostController`. Badge counts wired for Messages (unread) and Rideshare (countered bids). **All OK.**

### Onboarding Flow (DriverNavGraph.kt)

| Step | Screen | Next | Back | Status |
|------|--------|------|------|--------|
| LOGIN | LoginScreen | LegalAcceptance (or COMPLETED if re-login) | N/A | **OK** |
| FORGOT_PASSWORD | ForgotPasswordScreen | LOGIN | N/A | **OK** |
| LEGAL_ACCEPTANCE | LegalAcceptanceScreen | InsuranceDisclosure | N/A | **OK** |
| INSURANCE_DISCLOSURE | InsuranceDisclosureScreen | BackgroundCheck | LegalAcceptance | **OK** |
| BACKGROUND_CHECK | BackgroundCheckConsentScreen | VehicleRequirements | InsuranceDisclosure | **OK** |
| VEHICLE_REQUIREMENTS | VehicleRequirementsScreen | IndependentContractor | BackgroundCheck | **OK** |
| INDEPENDENT_CONTRACTOR | IndependentContractorAgreementScreen | COMPLETED | VehicleRequirements | **OK** |

Auth polling: Every 5s checks `isDriverLoggedIn`. After 2 consecutive failures, redirects to LOGIN. **OK.**

### Nav Routes (DriverNavGraph.kt)

| Route | Screen | Status |
|-------|--------|--------|
| `delivery` | AvailableOrdersScreen | **OK** |
| `rideshare` | RideshareTabScreen | **OK** |
| `active` | ActiveTabScreen | **OK** |
| `messages` | MessagesScreen | **OK** |
| `profile` | ProfileScreen | **OK** |
| `earnings` | EarningsScreen | **OK** |
| `documents` | DocumentsScreen | **OK** |
| `my_deliveries` | MyDeliveriesScreen | **OK** |
| `active_delivery/{orderId}` | ActiveDeliveryScreen | **OK** |
| `active_delivery` | ActiveDeliveryScreen (no args) | **OK** |
| `payout_dashboard` | PayoutDashboardScreen | **OK** |
| `active_ride/{rideId}` | ActiveRideScreen | **OK** |
| `active_ride` | ActiveRideScreen (no args) | **OK** |
| `order_chat/{orderId}/{customerName}` | OrderChatScreen | **OK** |
| `ride_chat/{rideId}/{riderName}?riderPhone={riderPhone}` | RideChatScreen | **OK** |

### ProfileScreen Handlers

| Handler | Action | Status |
|---------|--------|--------|
| `onLogout` | clearDriverAuth(), reset onboarding, back to LOGIN | **OK** |
| Navigate to earnings | `navController.navigate("earnings")` | **OK** |
| Navigate to documents | `navController.navigate("documents")` | **OK** |
| Navigate to payout_dashboard | `navController.navigate("payout_dashboard")` | **OK** |

### Driver API Endpoint Verification (DollorApiService.kt)

| Retrofit Path | Full URL | Backend Route | Status |
|---------------|----------|---------------|--------|
| `auth/driver/login` | `/api/auth/driver/login` | `main_new.py:2567` | **OK** |
| `auth/driver/register` | `/api/auth/driver/register` | `main_new.py:2661` | **OK** |
| `auth/driver/google` | `/api/auth/driver/google` | `main_new.py:2775` | **OK** |
| `auth/driver/apple-auth` | `/api/auth/driver/apple-auth` | `main_new.py:2861` | **OK** |
| `auth/driver/refresh` | `/api/auth/driver/refresh` | `main_new.py:2635` | **OK** |
| `auth/driver/demo-login` | `/api/auth/driver/demo-login` | `main_new.py:2005` | **OK** |
| `driver/password-reset/request` | `/api/driver/password-reset/request` | `main_new.py:6112` | **OK** |
| `driver/password-reset/confirm` | `/api/driver/password-reset/confirm` | `main_new.py:6145` | **OK** |
| `erp/drivers/{driverId}` | `/api/erp/drivers/{driverId}` | Backend has `/erp/drivers/{id}` (no `/api/`) | **WRONG_TARGET** |
| `erp/drivers/{driverId}` (PUT) | `/api/erp/drivers/{driverId}` | No PUT at `/api/erp/drivers/{id}` | **WRONG_TARGET** |
| `drivers/{driverId}/documents` (GET) | `/api/drivers/{driverId}/documents` | Backend `/drivers/{id}/documents` (no `/api/`) | **OK** -- middleware likely redirects |
| `drivers/{driverId}/documents` (POST) | `/api/drivers/{driverId}/documents` | Backend `/drivers/{id}/documents` (no `/api/`) | **OK** -- same note |
| `drivers/{driverId}/status` (GET) | `/api/drivers/{driverId}/status` | `main_new.py:4415` | **OK** |
| `drivers/{driverId}/status` (POST) | `/api/drivers/{driverId}/status` | `main_new.py:4439` | **OK** |
| `drivers/{driverId}/delete` | `/api/drivers/{driverId}/delete` | `main_new.py:3416` | **OK** |
| `erp/orders/available-for-delivery` | `/api/erp/orders/available-for-delivery` | `order_flow.py:3001` (prefix `/api/erp`) | **OK** |
| `erp/driver/{driverId}/deliveries` | `/api/erp/driver/{driverId}/deliveries` | `main_new.py:19772` | **OK** |
| `erp/orders/{orderId}/assign-driver` | `/api/erp/orders/{orderId}/assign-driver` | `order_flow.py:3065` | **OK** |
| `erp/orders/{orderId}/picked-up` | `/api/erp/orders/{orderId}/picked-up` | `order_flow.py:3262` | **OK** |
| `erp/orders/{orderId}/delivered` | `/api/erp/orders/{orderId}/delivered` | `order_flow.py:3362` | **OK** |
| `erp/orders/{orderId}/delivery-photo` | `/api/erp/orders/{orderId}/delivery-photo` | `order_flow.py:4228` | **OK** |
| `driver/location` | `/api/driver/location` | `main_new.py:19660` | **OK** |
| `erp/orders/{orderId}/driver-location` | `/api/erp/orders/{orderId}/driver-location` | `order_flow.py:4535` | **OK** |
| `erp/orders/{orderId}/start-delivery-decision` | `/api/erp/orders/{orderId}/start-delivery-decision` | `main_new.py:16169` | **OK** |
| `erp/orders/{orderId}/restaurant-delivery-decision` | `/api/erp/orders/{orderId}/restaurant-delivery-decision` | `main_new.py:16207` | **OK** |
| `erp/orders/{orderId}/delivery-decision-status` | `/api/erp/orders/{orderId}/delivery-decision-status` | `main_new.py:16307` | **OK** |
| `erp/orders/driver/{driverId}/pending` | `/api/erp/orders/driver/{driverId}/pending` | `order_flow.py:4129` | **OK** |
| `erp/orders/{orderId}/unassign-driver` | `/api/erp/orders/{orderId}/unassign-driver` | `order_flow.py:4500` | **OK** |
| `rides/available` | `/api/rides/available` | `main_new.py:15956` | **OK** |
| `erp/rides/{rideId}/accept` | `/api/erp/rides/{rideId}/accept` | `main_new.py:14473` | **OK** |
| `rides/request/{rideId}/arrived` | `/api/rides/request/{rideId}/arrived` | `bid_routes.py:1647` | **OK** |
| `rides/request/{rideId}/start` | `/api/rides/request/{rideId}/start` | `bid_routes.py:1882` | **OK** |
| `rides/request/{rideId}/complete` | `/api/rides/request/{rideId}/complete` | `bid_routes.py:1969` | **OK** |
| `rides/request/{rideId}/no-show` | `/api/rides/request/{rideId}/no-show` | `bid_routes.py:1798` | **OK** |
| `rides/request/{rideId}/rate-passenger` | `/api/rides/request/{rideId}/rate-passenger` | `bid_routes.py:2285` | **OK** |
| `rides/request/{rideId}/driver-cancel` | `/api/rides/request/{rideId}/driver-cancel` | `bid_routes.py:1719` | **OK** |
| `erp/rides/{rideId}/negotiate` | `/api/erp/rides/{rideId}/negotiate` | `main_new.py:14563` | **OK** |
| `erp/rides/{rideId}/accept-fare` | `/api/erp/rides/{rideId}/accept-fare` | `main_new.py:14633` | **OK** |
| `p2p/ride-requests/{id}/chat` (GET+POST) | `/api/p2p/ride-requests/{id}/chat` | `main_new.py:16066/16096` | **OK** |
| `rides/request/{requestId}/bid` | `/api/rides/request/{requestId}/bid` | `bid_routes.py:1079` | **OK** |
| `driver/bids` | `/api/driver/bids` | `main_new.py:15903` | **OK** |
| `rides/bid/{bidId}/withdraw` | `/api/rides/bid/{bidId}/withdraw` | `bid_routes.py:1336` | **OK** |
| `rides/bid/{bidId}/accept-counter` | `/api/rides/bid/{bidId}/accept-counter` | `bid_routes.py:1476` | **OK** |
| `rides/bid/{bidId}/reject-counter` | `/api/rides/bid/{bidId}/reject-counter` | `bid_routes.py:1581` | **OK** |
| `rides/bid/{bidId}/driver-counter` | `/api/rides/bid/{bidId}/driver-counter` | `bid_routes.py:1379` | **OK** |
| `drivers/{driverId}/earnings` | `/api/drivers/{driverId}/earnings` | `main_new.py:19957` | **OK** |
| `drivers/{driverId}/bank-account` | `/api/drivers/{driverId}/bank-account` | `main_new.py:5114` | **OK** |
| `drivers/{driverId}/payout-history` | `/api/drivers/{driverId}/payout-history` | `main_new.py:5467` | **OK** |
| `drivers/{driverId}/payouts` | `/api/drivers/{driverId}/payouts` | `main_new.py:5163` | **OK** |
| `drivers/{driverId}/balance` | `/api/drivers/{driverId}/balance` | `main_new.py:5075` | **OK** |
| `drivers/{driverId}/stripe/connect` | `/api/drivers/{driverId}/stripe/connect` | `main_new.py:4472` | **OK** |
| `drivers/{driverId}/stripe/onboarding-link` | `/api/drivers/{driverId}/stripe/onboarding-link` | `main_new.py:4537` | **OK** |
| `drivers/{driverId}/stripe/status` | `/api/drivers/{driverId}/stripe/status` | `main_new.py:4608` | **OK** |
| `drivers/{driverId}/stripe/dashboard-link` | `/api/drivers/{driverId}/stripe/dashboard-link` | `main_new.py:4684` | **OK** |

### Phase 10 Features (Driver)

| Feature | File | Status |
|---------|------|--------|
| OrderChatScreen | `driver/ui/deliveries/OrderChatScreen.kt` | **OK** -- wired in NavGraph at `order_chat/{orderId}/{customerName}` |
| RideChatScreen | `driver/ui/rides/RideChatScreen.kt` | **OK** -- wired in NavGraph at `ride_chat/{rideId}/{riderName}` |

### Driver App Issues Summary

| # | File | Line | Category | Description |
|---|------|------|----------|-------------|
| D1 | `DollorApiService.kt` | 499 | WRONG_TARGET | `GET erp/drivers/{id}` -- backend is `/erp/drivers/{id}` (no `/api/` prefix), Android calls `/api/erp/drivers/{id}` |
| D2 | `DollorApiService.kt` | 505 | WRONG_TARGET | `PUT erp/drivers/{id}` -- same prefix mismatch as D1 |
| D3 | N/A | N/A | MISSING | No delete account button visible in Driver ProfileScreen (Play Store requirement) -- needs verification |

---

## Android Partner App

**Source:** `partner/src/main/java/ai/dollor/partner/`
**API Service:** Shared `DollorApiService.kt`

### Bottom Navigation (MainScreen.kt)

| Tab | Route | Target Content | Visible | Status |
|-----|-------|----------------|---------|--------|
| Orders | `orders` | OrdersScreen | Always | **OK** |
| Menu | `menu` | MenuScreen | Always | **OK** |
| Analytics | `analytics` | AnalyticsScreen | Always | **OK** |
| AI | `ai` | AIInsightsScreen | `SHOW_AI_FEATURES=false` | **OK** -- hidden correctly |
| Settings | `settings` | RestaurantSettingsScreen | Always | **OK** |

Route-based tab mapping using `bottomNavItems.getOrNull(selectedTabIndex)?.route`. When `SHOW_AI_FEATURES=false`, the AI tab is filtered out and tabs correctly map Orders/Menu/Analytics/Settings. **All OK.**

### Navigation Routes (PartnerNavGraph.kt)

| Route | Screen | Status |
|-------|--------|--------|
| `login` | LoginScreen | **OK** |
| `registration` | RegistrationScreen | **OK** |
| `main` | MainScreen (5 tabs) | **OK** |
| `order_details/{orderId}` | OrderDetailsScreen | **OK** |
| `edit_profile` | EditProfileScreen | **OK** |
| `business_hours` | BusinessHoursScreen | **OK** |
| `payment_settings` | PaymentSettingsScreen | **OK** |
| `notification_settings` | NotificationSettingsScreen | **OK** |
| `documents` | DocumentsScreen | **OK** |
| `kot_settings` | KOTSettingsScreen | **OK** |
| `faq` | FAQScreen | **OK** |
| `legal` | LegalDocumentScreen | **OK** |
| `ai_employees` | AIEmployeesScreen | **OK** |
| `promotions` | PromotionsScreen | **OK** |
| `create_promotion` | CreatePromotionScreen | **OK** |
| `earnings` | EarningsScreen | **OK** |

### PartnerNavGraph onClick Handlers

| Handler | Source | Action | Status |
|---------|--------|--------|--------|
| `onLoginSuccess` | LoginScreen | Navigate to Main, clear backstack | **OK** |
| `onNeedsLegalAcceptance` | LoginScreen | `authViewModel.acceptTermsAndPrivacy()` | **OK** |
| `onSignUpClick` | LoginScreen | Navigate to Registration | **OK** |
| `onRegistrationSuccess` | RegistrationScreen | Navigate to Main, clear backstack | **OK** |
| `onBackClick` (Registration) | RegistrationScreen | `navigateUp()` | **OK** |
| `onOrderClick` | OrdersScreen | Navigate to OrderDetails/{id} | **OK** |
| `onBackClick` (OrderDetails) | OrderDetailsScreen | `navigateUp()` | **OK** |
| `onEditProfile` | RestaurantSettingsScreen | Navigate to EditProfile | **OK** |
| `onBusinessHours` | RestaurantSettingsScreen | Navigate to BusinessHours | **OK** |
| `onPaymentSettings` | RestaurantSettingsScreen | Navigate to PaymentSettings | **OK** |
| `onNotifications` | RestaurantSettingsScreen | Navigate to NotificationSettings | **OK** |
| `onDocuments` | RestaurantSettingsScreen | Navigate to Documents | **OK** |
| `onKOTSettings` | RestaurantSettingsScreen | Navigate to KOTSettings | **OK** |
| `onFAQ` | RestaurantSettingsScreen | Navigate to FAQ | **OK** |
| `onLegal` | RestaurantSettingsScreen | Navigate to Legal | **OK** |
| `onAIEmployees` | RestaurantSettingsScreen | Navigate to AIEmployees | **OK** |
| `onPromotions` | RestaurantSettingsScreen | Navigate to Promotions | **OK** |
| `onEarnings` | RestaurantSettingsScreen | Navigate to Earnings | **OK** |
| `onSignOut` | RestaurantSettingsScreen | `authViewModel.logout()` | **OK** |
| `onCreatePromotion` | PromotionsScreen | Navigate to CreatePromotion | **OK** |
| `onEditPromotion` | PromotionsScreen | Empty lambda `{ /* Edit not implemented yet */ }` | **DEAD** |
| `onSave` | CreatePromotionScreen | `navigateUp()` | **OK** |
| All `onBackClick` (settings sub-screens) | Various | `navigateUp()` | **OK** |

### Partner API Endpoint Verification (DollorApiService.kt)

| Retrofit Path | Full URL | Backend Route | Status |
|---------------|----------|---------------|--------|
| `auth/vendor/login` | `/api/auth/vendor/login` | `main_new.py:1797` | **OK** |
| `auth/vendor/register` | `/api/auth/vendor/register` | `main_new.py:2097` | **OK** |
| `auth/vendor/google-auth` | `/api/auth/vendor/google-auth` | `main_new.py:2251` | **OK** |
| `auth/vendor/apple-auth` | `/api/auth/vendor/apple-auth` | `main_new.py:2347` | **OK** |
| `auth/vendor/demo-login` | `/api/auth/vendor/demo-login` | `main_new.py:1863` | **OK** |
| `vendor/password-reset/request` | `/api/vendor/password-reset/request` | `main_new.py:6193` | **OK** |
| `vendor/password-reset/confirm` | `/api/vendor/password-reset/confirm` | `main_new.py:6222` | **OK** |
| `vendors/public` | `/api/vendors/public` | `main_new.py:9586` | **OK** |
| `vendors/{vendorId}` (DELETE) | `/api/vendors/{vendorId}` | Exists as vendor profile endpoint | **OK** |
| `vendor/profile` | `/api/vendor/profile` | `main_new.py:10315` | **OK** |
| `vendors/{vendorId}` (GET) | `/api/vendors/{vendorId}` | Exists | **OK** |
| `vendors/{vendorId}` (PATCH x4) | `/api/vendors/{vendorId}` | `main_new.py` (multiple PATCH handlers) | **OK** |
| `vendors/{vendorId}/documents` (GET/POST/DELETE) | `/api/vendors/{vendorId}/documents` | `main_new.py:11135/11182/11243` | **OK** |
| `erp/payouts/vendor/{vendorId}` | `/api/erp/payouts/vendor/{vendorId}` | `main_new.py:5264` | **OK** |
| `vendors/{vendorId}/bank-account` | `/api/vendors/{vendorId}/bank-account` | `main_new.py:5215` | **OK** |
| `erp/orders/vendor/{vendorId}` | `/api/erp/orders/vendor/{vendorId}` | `order_flow.py:2810` (prefix `/api/erp`) | **OK** |
| `orders/{orderId}/status` (PATCH) | `/api/orders/{orderId}/status` | `main_new.py:8686` | **OK** |
| `erp/orders/{orderId}/restaurant-accept` | `/api/erp/orders/{orderId}/restaurant-accept` | `main_new.py:14363` + `order_flow.py` | **OK** |
| `erp/orders/{orderId}/restaurant-decline` | `/api/erp/orders/{orderId}/restaurant-decline` | `main_new.py:14371` + `order_flow.py` | **OK** |
| `erp/orders/{orderId}/restaurant-accept-delivery` | `/api/erp/orders/{orderId}/restaurant-accept-delivery` | `main_new.py:14379` + `order_flow.py` | **OK** |
| `erp/orders/{orderId}/restaurant-decline-delivery` | `/api/erp/orders/{orderId}/restaurant-decline-delivery` | `main_new.py:14386` + `order_flow.py` | **OK** |
| `vendors/{vendorId}/menu` (GET/POST) | `/api/vendors/{vendorId}/menu` | `main_new.py:13436/13377` | **OK** |
| `vendors/{vendorId}/menu/{itemId}` (PUT/DELETE) | `/api/vendors/{vendorId}/menu/{itemId}` | `main_new.py:13521/13581` | **OK** |
| `vendors/{vendorId}/menu/{itemId}/customizations` | `/api/vendors/{vendorId}/menu/{itemId}/customizations` | `main_new.py:13549` | **OK** |
| `vendors/{vendorId}/menu/categories` | `/api/vendors/{vendorId}/menu/categories` | `main_new.py:13605` | **OK** |
| `vendors/{vendorId}/reviews` | `/api/vendors/{vendorId}/reviews` | `main_new.py:17538` | **OK** |
| `promotions/vendor/{vendorId}` | `/api/promotions/vendor/{vendorId}` | `promotions.py:397` | **OK** |
| `promotions/create` | `/api/promotions/create` | `promotions.py:98` | **OK** |
| `promotions/{promotionId}` (PUT/DELETE) | `/api/promotions/{promotionId}` | `promotions.py:442/796` | **OK** |
| `promotions/analytics/{vendorId}` | `/api/promotions/analytics/{vendorId}` | `promotions.py:706` | **OK** |
| `promotions/suggestions/{vendorId}` | `/api/promotions/suggestions/{vendorId}` | `promotions.py:263` | **OK** |
| `vendors/{vendorId}/stripe/connect` | `/api/vendors/{vendorId}/stripe/connect` | `main_new.py:4802` | **OK** |
| `vendors/{vendorId}/stripe/onboarding-link` | `/api/vendors/{vendorId}/stripe/onboarding-link` | `main_new.py:4873` | **OK** |
| `vendors/{vendorId}/stripe/status` | `/api/vendors/{vendorId}/stripe/status` | `main_new.py:4944` | **OK** |
| `vendors/{vendorId}/stripe/dashboard-link` | `/api/vendors/{vendorId}/stripe/dashboard-link` | `main_new.py:5023` | **OK** |
| `vendor/kot-config` (GET/PUT) | `/api/vendor/kot-config` | `main_new.py:10443/10470` | **OK** |
| `erp/analytics/ai-employees` | `/api/erp/analytics/ai-employees` | `main_new.py:18094` | **OK** |
| `menu-verification/status/{vendorId}` | `/api/menu-verification/status/{vendorId}` | `menu_verification.py:94` (prefix `/api/menu-verification`) | **OK** |

### Phase 10 Features (Partner)

| Feature | File | Status |
|---------|------|--------|
| `SHOW_AI_FEATURES=false` | `MainScreen.kt:40` | **OK** -- AI tab hidden, route-based mapping ensures correct tab selection |
| AIInsightsScreen | `partner/ui/ai/AIInsightsScreen.kt` | **OK** -- exists, hidden behind flag |
| AIEmployeesScreen | `partner/ui/ai/AIEmployeesScreen.kt` | **OK** -- accessible via Settings > AI Employees nav |

### Partner App Issues Summary

| # | File | Line | Category | Description |
|---|------|------|----------|-------------|
| P1 | `PartnerNavGraph.kt` | 287 | DEAD | `onEditPromotion = { /* Edit not implemented yet */ }` -- empty lambda |
| P2 | `DollorApiService.kt` | ~1128 | WRONG_TARGET | `getVendorOrdersAlt` duplicates `getVendorOrders` (same endpoint, different return type name) -- harmless but redundant |
| P3 | `DollorApiService.kt` | ~1150 | WRONG_TARGET | `acceptOrder`, `rejectOrder`, `markOrderReady` all alias `PATCH orders/{orderId}/status` with default status -- these are Retrofit-level convenience wrappers, but if the backend changed the status values, all 3 would break silently. Currently OK but fragile. |

---

## Cross-App Issues

### 1. API Path Prefix Inconsistency (SYSTEMIC)

Backend has two styles of route registration:
- **Old-style (main_new.py):** `/erp/drivers/{id}` (no `/api/` prefix)
- **New-style (order_flow.py):** Router prefix `/api/erp` + `/orders/...`

Android Retrofit base URL is `https://api.dollor.ai/api`, so all Retrofit paths get `/api/` prepended. This means:
- Endpoints registered at `/erp/orders/...` in main_new.py (without `/api/`) are NOT reachable via Retrofit
- **However**, most of these old-style endpoints have `/api/` aliases OR are duplicated in order_flow.py (which has prefix `/api/erp`)

**Affected endpoint:** `GET /erp/drivers/{id}` at main_new.py:4107 has NO `/api/` alias. Android calls `/api/erp/drivers/{id}` which does not exist. This could cause driver profile fetch failures.

### 2. Customer Apple Auth Path Mismatch

Android: `auth/customer/apple-auth` -> `/api/auth/customer/apple-auth`
Backend: `/api/customer/apple-auth` (no `auth/` prefix)
**Impact:** Apple Sign-In for customers will fail on Android with 404.

### 3. Negotiation Status Endpoint Missing

`CustomerRideshareApiService.getRideNegotiationStatus()` calls `/api/erp/rides/{id}/negotiation-status` but no such backend endpoint exists. The endpoint may have been planned but never implemented.

---

## Recommendations for Follow-up Quick Task

**Priority 1 (WRONG_TARGET -- will cause 404s):**
1. Fix `auth/customer/apple-auth` -> `customer/apple-auth` in DollorApiService.kt
2. Add `/api/erp/drivers/{driver_id}` aliases in main_new.py (GET + PUT)
3. Remove or fix `getRideNegotiationStatus()` call in CustomerRideshareApiService.kt

**Priority 2 (MISSING -- incomplete UX):**
4. Implement phone dialer Intent in OrderTrackingScreen `onCallPartner`
5. Implement delivery instruction dialog in OrderTrackingScreen `onAddInstructions`

**Priority 3 (DEAD -- no-ops, low impact):**
6. Remove or implement `onCategoryClick` and `onFoodItemClick` empty lambdas
7. Implement `onEditPromotion` in Partner PromotionsScreen

**No action needed:**
- `getVendorOrdersAlt` duplicate (P2) -- harmless
- Order status aliases (P3) -- currently correct, just fragile
