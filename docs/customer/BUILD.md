# Dollor iOS Customer App - Complete Build Documentation

> **SOURCE OF TRUTH** - This document captures every detail of the Customer app.
> Last Updated: January 28, 2026

---

## Table of Contents
1. [App Identity](#app-identity)
2. [Build History](#build-history)
3. [Architecture](#architecture)
4. [Authentication Flows](#authentication-flows)
5. [API Endpoints](#api-endpoints)
6. [Data Storage](#data-storage)
7. [UI Screens & Navigation](#ui-screens--navigation)
8. [Payment System](#payment-system)
9. [Order Flow](#order-flow)
10. [Push Notifications](#push-notifications)
11. [Configuration (AppConfig)](#configuration-appconfig)
12. [Pricing Model](#pricing-model)
13. [Dependencies](#dependencies)
14. [Security](#security)
15. [Known Issues](#known-issues)
16. [Next Build Changes](#next-build-changes)
17. [Testing](#testing)
18. [Deployment](#deployment)

---

## App Identity

| Field | Value |
|-------|-------|
| **App Name** | Dollor |
| **Display Name** | Dollor |
| **Subtitle** | $1 Delivery |
| **Bundle ID** | `com.dollorai.customer` |
| **Current Version** | 1.0 |
| **Current Build** | 33 |
| **Submitted Build** | 32 |
| **Minimum iOS** | 17.0 |
| **Team ID** | PRKZ4UVCD7 |
| **App Store ID** | Pending |

---

## Build History

| Build | Date | Key Changes | Status |
|-------|------|-------------|--------|
| **33** | Jan 28, 2026 | Multi-restaurant checkout improvements | Local |
| **32** | Jan 27, 2026 | App Store submission build | Submitted |
| **21** | Jan 2026 | Restaurant fee transparency | TestFlight |
| **20** | Jan 2026 | Apple Pay merchant ID fix | TestFlight |
| **17** | Jan 2026 | Address picker, legal docs, signing fixes | TestFlight |
| **8** | Jan 2026 | Rebrand from EatFair to Dollor | TestFlight |
| **7** | Jan 2026 | Firebase bundle ID mismatch fix | TestFlight |
| **5** | Dec 2025 | API key injection verification | TestFlight |

### Uncommitted Changes for Build 34

```
apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj  (build settings)
apps/ios/customer/eatfaircustomer/Views/MultiRestaurantCheckoutView.swift (+15 lines)
```

---

## Architecture

### Project Structure

```
apps/ios/customer/
├── eatfaircustomer/
│   ├── eatfaircustomerApp.swift          # App entry point + AppDelegate
│   ├── Persistence.swift                  # CoreData (unused)
│   │
│   ├── Models/
│   │   └── MenuItem.swift                 # Local menu item model
│   │
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift            # Authentication (471 lines)
│   │   ├── HomeViewModel.swift            # Restaurant list
│   │   ├── MenuViewModel.swift            # Restaurant menu
│   │   ├── CartViewModel.swift            # Single restaurant cart
│   │   ├── MultiRestaurantCartViewModel.swift  # Multi-restaurant cart (550 lines)
│   │   ├── AddressViewModel.swift         # Address management
│   │   ├── AddressSearchViewModel.swift   # Google Places search
│   │   ├── OrderHistoryViewModel.swift    # Order history
│   │   ├── OrderTrackingViewModel.swift   # Live order tracking
│   │   └── RideRequestViewModel.swift     # Rideshare feature
│   │
│   ├── Views/
│   │   ├── MainAppView.swift              # Tab bar container
│   │   ├── HomeView.swift                 # Home screen (48KB)
│   │   ├── LoginView.swift                # Login screen
│   │   ├── RegisterView.swift             # Registration
│   │   ├── RestaurantDetailView.swift     # Restaurant menu view
│   │   ├── MenuItemCustomizationView.swift # Item customization
│   │   ├── CartView.swift                 # Cart view
│   │   ├── CheckoutView.swift             # Single restaurant checkout (59KB)
│   │   ├── MultiRestaurantCartView.swift  # Multi-restaurant cart
│   │   ├── MultiRestaurantCheckoutView.swift # Multi checkout (44KB)
│   │   ├── OrderHistoryView.swift         # Order history
│   │   ├── DeliveryTrackingView.swift     # Live tracking
│   │   ├── PaymentMethodsView.swift       # Saved cards
│   │   ├── ProfileView.swift              # User profile
│   │   ├── SettingsView.swift             # App settings
│   │   ├── AddressListView.swift          # Address list
│   │   ├── AddressSearchView.swift        # Address search
│   │   ├── LocationPickerView.swift       # Map picker
│   │   ├── RideRequestView.swift          # Rideshare (66KB)
│   │   ├── TripBoardView.swift            # Trip board (77KB)
│   │   ├── SearchRestaurantsView.swift    # Search
│   │   ├── DealsView.swift                # Promotions
│   │   ├── FavoritesView.swift            # Favorites
│   │   ├── NotificationView.swift         # Notifications
│   │   ├── HelpSupportView.swift          # Help/support
│   │   ├── LegalAcceptanceView.swift      # Terms acceptance
│   │   ├── ReferAndEarnView.swift         # Referral
│   │   ├── ScheduleDeliveryView.swift     # Scheduled orders
│   │   ├── OrderSuccessView.swift         # Order confirmation
│   │   ├── RateDriverView.swift           # Driver rating
│   │   ├── TipDriverView.swift            # Tipping
│   │   ├── DriverChatView.swift           # Chat with driver
│   │   ├── DriverPrivacyViews.swift       # Privacy notices
│   │   ├── WelcomeView.swift              # Onboarding
│   │   └── PlaceholderViews.swift         # Empty states
│   │
│   └── Theme/
│       └── Theme.swift                    # App theming
│
├── eatfaircustomer.xcodeproj/
├── eatfaircustomer.xcworkspace/
├── Podfile
├── Podfile.lock
├── GoogleService-Info.plist               # Firebase config
└── ExportOptions.plist                    # Archive export config
```

### Shared Library (EatFairShared)

Location: `apps/ios/eatfair-ios-shared/`

| File | Size | Purpose |
|------|------|---------|
| `P2PAPIService.swift` | 374KB | All backend API calls (~9000 lines) |
| `AppConfig.swift` | 31KB | Firebase Remote Config + pricing |
| `NotificationManager.swift` | 7KB | Push notification handling |
| `GoogleMapsService.swift` | 25KB | Maps integration |
| `ChatService.swift` | 14KB | Real-time chat |
| `CallService.swift` | 15KB | Privacy-protected calling |
| `NegotiationService.swift` | 13KB | Fare negotiation |
| `LegalService.swift` | 25KB | Terms & privacy |
| `TripBoardService.swift` | 65KB | Trip/ride management |
| `DollorV3Service.swift` | 13KB | V3 API support |
| `EnterpriseNetworkLayer.swift` | 27KB | Network utilities |
| `SecureStorage.swift` | (Security/) | Keychain storage |
| `DollorTheme.swift` | 11KB | UI theming |
| `ErrorHandler.swift` | 11KB | Error handling |

---

## Authentication Flows

### 1. Email/Password Login

```
User → LoginView → AuthViewModel.login()
    → P2PAPIService.customerLogin()
    → POST /auth/customer/login
    → Response: { customer_id, email, full_name, token }
    → Store in UserDefaults + SecureStorage
    → isAuthenticated = true
```

**API Endpoint:** `POST /auth/customer/login`
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "customer_id": 123,
  "email": "user@example.com",
  "full_name": "John Doe",
  "token": "jwt_token_here"
}
```

### 2. Email/Password Registration

```
User → RegisterView → AuthViewModel.register()
    → P2PAPIService.customerRegister()
    → POST /auth/customer/register
    → Response: { customer_id, email, full_name, token }
    → Store in UserDefaults + SecureStorage
    → isAuthenticated = true
```

**API Endpoint:** `POST /auth/customer/register`
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "1234567890"
}
```

**Validation Rules:**
- Email: Standard email format regex
- Password: Min 8 chars, at least 1 letter + 1 number
- Phone: Min 10 digits

### 3. Google Sign-In

```
User → LoginView → AuthViewModel.signInWithGoogle()
    → GIDSignIn.sharedInstance.signIn()
    → Google OAuth popup
    → Get Google user info (email, name, googleId)
    → P2PAPIService.customerGoogleAuth()
    → POST /auth/customer/google
    → Response: { customer_id, email, full_name, token }
    → isAuthenticated = true
```

**API Endpoint:** `POST /auth/customer/google`
```json
Request:
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "google_id": "google_user_id_123"
}
```

**Configuration:**
- Client ID loaded from `GoogleService-Info.plist` → `CLIENT_ID`
- URL Scheme: `com.googleusercontent.apps.65740760476-0cnsrucn1tvadbf193cgio2siosnjg02`

### 4. Apple Sign-In

```
User → LoginView → AuthViewModel.signInWithApple()
    → Generate nonce + SHA256 hash
    → ASAuthorizationController.performRequests()
    → Apple Sign-In sheet
    → authorizationController(didCompleteWithAuthorization:)
    → Extract: appleUserId, email, fullName
    → IMPORTANT: Apple only provides name on FIRST sign-in
    → Save name to UserDefaults for subsequent logins
    → P2PAPIService.customerAppleAuth()
    → POST /customer/apple-auth
    → Response: { customer_id, email, full_name, token }
    → isAuthenticated = true
```

**API Endpoint:** `POST /customer/apple-auth`
```json
Request:
{
  "email": "user@privaterelay.appleid.com",
  "name": "John Doe",
  "apple_id": "apple_user_id_123"
}
```

**Apple Name Storage:**
```swift
// Keys in UserDefaults
"apple_signin_user_name"  // Full name from first sign-in
"apple_signin_user_id"    // Apple user ID to match
```

### 5. Password Reset

```
Step 1: Request reset code
    → AuthViewModel.requestPasswordReset(email:)
    → POST /customer/password-reset/request
    → Email with code sent to user

Step 2: Confirm reset
    → AuthViewModel.confirmPasswordReset()
    → POST /customer/password-reset/confirm
    → Password updated
```

### 6. Logout

```
AuthViewModel.logout()
    → GIDSignIn.sharedInstance.signOut()
    → P2PAPIService.customerLogout()
    → SecureStorage.shared.clearAuthTokens(type: .customer)
    → Clear UserDefaults customer keys
    → isAuthenticated = false
```

---

## API Endpoints

### Base URL
```
Production: https://api.dollor.ai
Staging: https://d3kuu45w6kl8hr.cloudfront.net
Development: https://dev-api.dollor.ai
```

### Customer Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/customer/login` | Email login |
| POST | `/auth/customer/register` | Registration |
| POST | `/auth/customer/google` | Google Sign-In |
| POST | `/customer/apple-auth` | Apple Sign-In |
| POST | `/customer/password-reset/request` | Request password reset |
| POST | `/customer/password-reset/confirm` | Confirm password reset |
| PUT | `/customer/{id}/profile` | Update profile |
| DELETE | `/customer/{id}` | Delete account |

### Restaurants & Menus

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/vendors/published` | List published restaurants |
| GET | `/public/restaurants/{id}` | Restaurant detail |
| GET | `/vendors/{id}/menu` | Restaurant menu items |
| GET | `/vendors/{id}/menu/categories` | Menu categories |

### Orders

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/erp/orders/create` | Create order |
| GET | `/customer/orders` | Customer order history |
| GET | `/erp/orders/{id}/full-tracking` | Full order tracking |
| GET | `/erp/orders/{id}/driver-location` | Driver location |
| POST | `/erp/orders/{id}/cancel` | Cancel order |

### Addresses

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/addresses/{userId}` | List addresses |
| GET | `/addresses/{userId}/default` | Get default address |
| POST | `/addresses/{userId}` | Create address |
| PUT | `/addresses/{userId}/{addressId}` | Update address |
| DELETE | `/addresses/{userId}/{addressId}` | Delete address |
| POST | `/addresses/{userId}/{addressId}/set-default` | Set default |

### Favorites

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/customer/favorites/{customerId}` | List favorites |
| POST | `/customer/favorites` | Add favorite |
| DELETE | `/customer/favorites/{customerId}/{vendorId}` | Remove favorite |
| GET | `/customer/favorites/{customerId}/check/{vendorId}` | Check if favorite |

### Promotions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/promotions/active` | Active promotions |
| GET | `/promotions/featured` | Featured deals |
| POST | `/erp/orders/validate-promo` | Validate promo code |

### Push Notifications (FCM)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/erp/customers/{id}/fcm-token` | Register FCM token |
| DELETE | `/erp/customers/{id}/fcm-token` | Unregister token |

**FCM Token Request Format (SOURCE OF TRUTH):**
```json
{
  "fcm_token": "<firebase_fcm_token>",
  "platform": "ios"
}
```

### Payments

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/create-intent` | Create Stripe PaymentIntent |
| GET | `/api/payments/cards/{customerId}` | Get saved cards |
| POST | `/api/payments/cards` | Save card |
| DELETE | `/api/payments/cards/{cardId}` | Delete card |

### Rides (Rideshare Feature)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/rides/request` | Request ride |
| GET | `/api/rides/{id}/status` | Ride status |
| POST | `/api/rides/{id}/cancel` | Cancel ride |
| POST | `/api/rides/{id}/fare-offer` | Submit fare offer |
| POST | `/api/rides/{id}/accept-driver-fare` | Accept driver fare |
| POST | `/api/payments/ride/create-intent` | Create ride payment |

---

## Data Storage

### UserDefaults Keys

| Key | Type | Purpose | Set By |
|-----|------|---------|--------|
| `p2p_customer_id` | Int | Customer ID from backend | Login success |
| `p2p_customer_name` | String | Customer name | Login success |
| `p2p_customer_email` | String | Customer email | Login success |
| `selectedAddressId` | String | Current delivery address | AddressViewModel |
| `apple_signin_user_name` | String | Apple user's name (first sign-in only) | Apple Sign-In |
| `apple_signin_user_id` | String | Apple user ID | Apple Sign-In |
| `legal_terms_accepted` | Bool | Terms acceptance flag | LegalAcceptanceView |
| `legal_acceptance_date` | Date | When terms accepted | LegalAcceptanceView |
| `multiRestaurantCart_items` | Data | Cart items (JSON) | MultiRestaurantCartViewModel |
| `multiRestaurantCart_restaurants` | Data | Cart restaurants (JSON) | MultiRestaurantCartViewModel |

### SecureStorage (Keychain)

| Key | Purpose |
|-----|---------|
| `customer_auth_token` | JWT authentication token |
| `customer_refresh_token` | Refresh token (if applicable) |

### Firebase Firestore

| Collection | Purpose |
|------------|---------|
| `users` | FCM tokens + user metadata |
| `orders` | Order backup (fallback when P2P unavailable) |

---

## UI Screens & Navigation

### Tab Bar Structure

```
MainAppView (TabView)
├── Tab 1: Home
│   └── HomeView
│       ├── Featured restaurants
│       ├── Categories
│       ├── Nearby restaurants
│       └── → RestaurantDetailView
│           └── → MenuItemCustomizationView
│               └── → Add to Cart
│
├── Tab 2: Search
│   └── SearchRestaurantsView
│
├── Tab 3: Orders
│   └── OrderHistoryView
│       └── → DeliveryTrackingView
│
├── Tab 4: Rides (Rideshare)
│   └── RideRequestView
│       └── → TripBoardView
│
└── Tab 5: Profile
    └── ProfileView
        ├── → SettingsView
        ├── → AddressListView
        ├── → PaymentMethodsView
        ├── → FavoritesView
        ├── → HelpSupportView
        └── → LegalAcceptanceView
```

### Authentication Flow

```
App Launch
└── Check isCustomerLoggedIn
    ├── YES → MainAppView
    └── NO → LoginView
        ├── Email Login
        ├── Google Sign-In Button
        ├── Apple Sign-In Button
        ├── → RegisterView
        └── → Forgot Password Flow
```

### Checkout Flow

```
CartView / MultiRestaurantCartView
└── → CheckoutView / MultiRestaurantCheckoutView
    ├── Delivery Address Selection
    │   └── → AddressListView / AddressSearchView
    ├── Delivery Instructions
    ├── Promo Code
    ├── Tip Selection
    ├── Payment Method
    │   ├── Apple Pay
    │   ├── Saved Card
    │   └── New Card (Stripe PaymentSheet)
    └── Place Order
        └── → OrderSuccessView
            └── → DeliveryTrackingView
```

---

## Payment System

### Stripe Integration

**Publishable Key:** Loaded from backend via payment intent response
**Merchant ID:** `merchant.com.dollorai.payments`

### Payment Flow

```
1. User taps "Place Order"
2. Calculate final total (subtotal + fees + tax + tip)
3. Call PaymentService.shared.createPaymentIntent(amount:)
4. Backend creates Stripe PaymentIntent
5. Return: { clientSecret, publishableKey, ephemeralKey, customerId }
6. Configure STPPaymentSheet with returned keys
7. Present PaymentSheet
8. User completes payment
9. On success → Create order via API
```

### Apple Pay Flow

```
1. Check Apple Pay availability
2. Call PaymentService.shared.createPaymentIntent(amount:)
3. Configure StripeApplePayHandler
4. Present Apple Pay sheet
5. On success → Create order
```

### Saved Cards

- Cards stored in Stripe (PCI compliant)
- Fetched via `/api/payments/cards/{customerId}`
- Customer can select saved card or add new

---

## Order Flow

### Single Restaurant Order

```
1. Browse restaurant menu
2. Add items to CartViewModel
3. Go to CheckoutView
4. Select delivery address
5. Apply promo code (optional)
6. Select tip amount
7. Choose payment method
8. Complete payment
9. CartViewModel.placeOrder()
   → P2PAPIService.createOrder()
   → POST /erp/orders/create
10. Save backup to Firebase (fallback)
11. Clear cart
12. Show OrderSuccessView
13. Navigate to DeliveryTrackingView
```

### Multi-Restaurant Order

```
1. Browse multiple restaurants (max 3)
2. Add items to MultiRestaurantCartViewModel
3. Go to MultiRestaurantCheckoutView
4. Platform fee: $1 per restaurant
5. Delivery fee: $2.99 + $2 per extra stop
6. Complete payment for total
7. MultiRestaurantCartViewModel.placeOrder()
   → Create order in P2P for FIRST restaurant only
   → Save full order to Firebase
8. Known Issue: Only first restaurant order goes to P2P
```

### Order States

```
pending → confirmed → preparing → ready_for_pickup
    → picked_up → out_for_delivery → delivered

    OR

pending → cancelled (with reason)
```

---

## Push Notifications

### FCM Token Registration

```swift
// In AppDelegate - messaging(:didReceiveRegistrationToken:)
1. Receive FCM token from Firebase
2. NotificationManager.shared.updateFCMToken(token)
3. Save to Firestore: users/{userId}/fcmToken
4. Save to P2P Backend:
   P2PAPIService.shared.saveCustomerFCMToken(
       customerId: customerId,
       token: token
   )
   → POST /erp/customers/{id}/fcm-token
   → Body: {"fcm_token": token, "platform": "ios"}
```

### Notification Types

| Type | Trigger | Action |
|------|---------|--------|
| `order_status` | Order status change | Navigate to order |
| `order_ready` | Order ready for pickup | Navigate to order |
| `order_picked_up` | Driver picked up | Navigate to tracking |
| `order_delivered` | Order delivered | Navigate to order |
| `driver_assigned` | Driver assigned | Navigate to tracking |
| `promotion` | New promotion | Navigate to deals |
| `system` | System message | Show alert |

### Notification Handling

```swift
// Foreground - show banner
userNotificationCenter(_:willPresent:) → [.banner, .sound, .badge]

// Background tap - navigate
userNotificationCenter(_:didReceive:) → handleNotificationAction()
    → Post NSNotification("NavigateToOrder") with orderId
```

---

## Configuration (AppConfig)

### URL Configuration

```swift
// Loaded from Info.plist → API_BASE_URL
p2pAPIBaseURL = "https://api.dollor.ai"  // Production

// Derived URLs
negotiationServiceURL = "{baseURL}/api/negotiation"
chatServiceURL = "{baseURL}/api/chat"
callServiceURL = "{baseURL}/api/call"
```

### Fee Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `taxRate` | 0.08 (8%) | Sales tax |
| `baseDeliveryFee` | $2.99 | Base delivery (to driver) |
| `extraStopFee` | $2.00 | Per additional restaurant |
| `platformFeePerRestaurant` | $1.00 | Customer platform fee |
| `smallOrderThreshold` | $10.00 | Below this = small order fee |
| `smallOrderFee` | $2.00 | Small order surcharge |
| `maxRestaurantsPerOrder` | 3 | Max restaurants in one order |

---

## Pricing Model

### Dollor.ai Philosophy
> **We are a matchmaking service, not a delivery company.**
> Flat $1 fees - no percentage cuts!

### Food Delivery Pricing

| Fee | Amount | Who Pays | Who Receives |
|-----|--------|----------|--------------|
| Platform Fee | $1.00 flat | Customer | Dollor.ai |
| Restaurant Fee | $1.00 flat | Restaurant | Dollor.ai |
| Driver Fee | $0.00 | N/A | N/A |
| Delivery Fee | $2.99+ | Customer | Driver (100%) |
| Tips | Variable | Customer | Driver (100%) |

**Total Dollor.ai Revenue per Order: $2.00**
(vs competitors charging 25-30% of order value)

### Multi-Restaurant Pricing

| Restaurants | Platform Fee | Delivery Fee | Driver Bonus |
|-------------|--------------|--------------|--------------|
| 1 | $1.00 | $2.99 | $0 |
| 2 | $2.00 | $4.99 | $2.00 |
| 3 | $3.00 | $6.99 | $4.00 |

### Rideshare Pricing (Tiered)

| Fare Range | Platform Fee (Each) |
|------------|---------------------|
| ≤ $35 | $1.00 rider + $1.00 driver |
| $35.01 - $70 | $2.00 rider + $2.00 driver |
| > $70 | $3.00 rider + $3.00 driver |

---

## Dependencies

### CocoaPods (Podfile)

| Pod | Purpose |
|-----|---------|
| Firebase/Core | Firebase SDK core |
| Firebase/Auth | Authentication (backup) |
| Firebase/Firestore | Database (backup) |
| Firebase/Messaging | Push notifications |
| GoogleSignIn | Google OAuth |
| GoogleMaps | Maps display |
| GooglePlaces | Address autocomplete |
| Stripe | Payment processing |

### Swift Package Manager

| Package | Purpose |
|---------|---------|
| EatFairShared | Shared code library (local) |

### System Frameworks

- SwiftUI
- Combine
- AuthenticationServices (Apple Sign-In)
- CryptoKit (Nonce hashing)
- UserNotifications
- MapKit
- CoreLocation

---

## Security

### Authentication Security

| Aspect | Implementation |
|--------|----------------|
| Password Storage | Server-side hashed (not stored locally) |
| JWT Token | Stored in iOS Keychain |
| Apple Sign-In | Nonce + SHA256 for replay protection |
| Google Sign-In | OAuth 2.0 via Google SDK |

### Network Security

| Aspect | Implementation |
|--------|----------------|
| Transport | HTTPS only (TLS 1.2+) |
| ATS | Enabled (exception for amazonaws.com) |
| Certificate Pinning | Not implemented |

### Data Security

| Data | Storage | Protection |
|------|---------|------------|
| Auth Token | Keychain | iOS Keychain encryption |
| Customer ID | UserDefaults | None (non-sensitive) |
| Cart Data | UserDefaults | None |
| Payment Cards | Stripe servers | PCI DSS compliant |

### Privacy Permissions

| Permission | Usage |
|------------|-------|
| Location (When In Use) | Nearby restaurants, delivery |
| Location (Always) | Background tracking (optional) |
| Camera | Profile photos, card scanning |
| Photos | Profile photo upload |
| Contacts | Address import |
| Microphone | Voice search |
| Speech Recognition | Voice commands |
| Notifications | Order updates |

---

## Known Issues

### Critical

1. **Multi-Restaurant Order Sync**
   - Only first restaurant order sent to P2P backend
   - Other restaurants saved to Firebase only
   - Restaurant apps won't see orders from restaurants 2-3
   - Location: `MultiRestaurantCartViewModel.swift:369-375`

### Medium

2. **FCM Token Re-registration**
   - Token may need re-registration after app reinstall
   - No automatic retry on failure

### Low

3. **Cart Persistence**
   - Cart saved to UserDefaults (not cloud synced)
   - Lost if app data cleared

---

## Next Build Changes

### Build 34 (Pending)

**Files Modified:**
1. `MultiRestaurantCheckoutView.swift` (+15 lines)
   - Minor checkout flow improvements

**To Include:**
- [ ] Fix multi-restaurant order sync issue
- [ ] Add retry logic for FCM registration
- [ ] Improve error handling for payment failures

---

## Testing

### Test Credentials

| Account | Email | Password |
|---------|-------|----------|
| Demo Customer | demo.customer@dollor.ai | DemoCustomer2025! |

### Test Scenarios

1. **Authentication**
   - [ ] Email login
   - [ ] Email registration
   - [ ] Google Sign-In
   - [ ] Apple Sign-In
   - [ ] Password reset
   - [ ] Logout

2. **Restaurant Browsing**
   - [ ] Home screen loads restaurants
   - [ ] Search works
   - [ ] Favorites add/remove
   - [ ] Restaurant detail loads menu

3. **Ordering**
   - [ ] Add item to cart
   - [ ] Customize item
   - [ ] Checkout flow
   - [ ] Apply promo code
   - [ ] Payment (card)
   - [ ] Payment (Apple Pay)
   - [ ] Order confirmation

4. **Order Tracking**
   - [ ] Order appears in history
   - [ ] Status updates received
   - [ ] Push notifications work
   - [ ] Driver location shows

5. **Profile**
   - [ ] View profile
   - [ ] Edit name
   - [ ] Manage addresses
   - [ ] View saved cards
   - [ ] Delete account

---

## Deployment

### Archive & Upload

```bash
cd apps/ios/customer

# Build archive
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -configuration Release \
  -archivePath build/eatfaircustomer.xcarchive \
  archive

# Export & upload to TestFlight
xcodebuild -exportArchive \
  -archivePath build/eatfaircustomer.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/export
```

### ExportOptions.plist

```xml
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>teamID</key>
    <string>PRKZ4UVCD7</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
```

### App Store Status

- **Build 32**: Submitted for review
- **Review Status**: Check App Store Connect

---

## Contact & Support

| Resource | Value |
|----------|-------|
| Support Email | support@dollor.ai |
| Backend API | https://api.dollor.ai |
| Web App | https://dollor.ai |
| Firebase Console | console.firebase.google.com |
| App Store Connect | appstoreconnect.apple.com |

---

*Document Version: 2.0*
*Last Updated: January 28, 2026*
*Build: 33 | Version: 1.0*
