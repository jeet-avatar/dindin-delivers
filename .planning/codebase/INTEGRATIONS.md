# External Integrations Documentation

This document details all external APIs, SDKs, and services integrated into the eatfair-ios platform.

---

## Overview

The platform uses a hybrid architecture where:
- **iOS Apps** communicate primarily with the P2P backend (Dollor.ai)
- **Firebase** is used only for authentication (not data storage)
- **External services** are integrated for payments, maps, and communication

---

## Authentication Providers

### 1. Google Sign-In

**SDK**: `GoogleSignIn-iOS` (via Swift Package Manager)

**Usage**: Customer, Driver, and Restaurant apps support Google OAuth

**Implementation** (`AuthViewModel.swift`):
```swift
import GoogleSignIn

// Client ID loaded from GoogleService-Info.plist - no hardcoded credentials
private var googleClientID: String {
    guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
          let plist = NSDictionary(contentsOfFile: path),
          let clientID = plist["CLIENT_ID"] as? String else {
        return ""
    }
    return clientID
}

func signInWithGoogle() {
    let config = GIDConfiguration(clientID: googleClientID)
    GIDSignIn.sharedInstance.configuration = config

    GIDSignIn.sharedInstance.signIn(withPresenting: viewController) { result, error in
        // Extract user info and authenticate with P2P backend
        let googleEmail = result?.user.profile?.email
        let googleName = result?.user.profile?.name
        let idToken = result?.user.idToken?.tokenString

        // Send to P2P backend for verification
        p2pService.customerGoogleAuth(idToken: idToken, ...)
    }
}
```

**Configuration File**: `GoogleService-Info.plist` (per app)
- `/apps/ios/customer/eatfaircustomer/GoogleService-Info.plist`
- `/apps/ios/delivery/eatffairdelivery/GoogleService-Info.plist`
- `/apps/ios/restaurant/eatffairrestaurant/GoogleService-Info.plist`

### 2. Apple Sign-In

**SDK**: `AuthenticationServices` (native iOS framework)

**Usage**: Native Sign in with Apple for all iOS apps

**Implementation**:
```swift
import AuthenticationServices
import CryptoKit

// Generate cryptographic nonce for security
private var currentNonce: String?

func signInWithApple() {
    let nonce = randomNonceString()
    currentNonce = nonce
    let hashedNonce = sha256(nonce)

    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.fullName, .email]
    request.nonce = hashedNonce

    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.performRequests()
}
```

### 3. Firebase Authentication

**SDK**: `firebase-ios-sdk` (v12.0.0+)

**Purpose**: Authentication backbone (NOT used for data storage)

**Dependencies** (`Package.swift`):
```swift
dependencies: [
    .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.0.0")
],
targets: [
    .target(
        name: "EatFairShared",
        dependencies: [
            .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
            .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),
            .product(name: "FirebaseFirestore", package: "firebase-ios-sdk")
        ]
    )
]
```

---

## Payment Integration

### Stripe

**SDK**: `stripe-ios-spm` (via Swift Package Manager)

**Usage**: All payment processing (card, ACH bank transfers, Apple Pay)

**Services**:

#### 1. Standard Card Payments
```swift
import StripePaymentSheet
import Stripe

// Payment sheet configuration
var configuration = PaymentSheet.Configuration()
configuration.merchantDisplayName = "Dollor"
configuration.allowsDelayedPaymentMethods = true

paymentSheet = PaymentSheet(
    paymentIntentClientSecret: clientSecret,
    configuration: configuration
)

paymentSheet?.present(from: viewController) { paymentResult in
    switch paymentResult {
    case .completed: // Success
    case .canceled:  // User cancelled
    case .failed(let error): // Error
    }
}
```

#### 2. ACH Bank Transfers (`ACHPaymentService.swift`)
```swift
class ACHPaymentService {
    static let shared = ACHPaymentService()

    // Calculate fee comparison (ACH vs Card)
    func calculateFees(amountCents: Int, completion: @escaping (Result<Fees, Error>) -> Void) {
        let cardURL = "\(baseURL)/api/enterprise/fees/calculate?payment_method=card"
        let achURL = "\(baseURL)/api/enterprise/fees/calculate?payment_method=ach"
        // Fetch and compare fees
    }

    // Create ACH payment with idempotency protection
    func createACHPayment(amountCents: Int, customerEmail: String?, orderId: String?) {
        let idempotencyKey = "\(orderId ?? "ach")-\(amountCents)-\(timestamp)"
        // POST to /api/enterprise/payments/create
    }

    // Present Stripe payment sheet for bank account
    func presentACHPaymentSheet(amountCents: Int, customerEmail: String) {
        // Uses StripePaymentSheet with bank account enabled
    }
}
```

**Backend Endpoints** (Stripe Integration):
| Endpoint | Purpose |
|----------|---------|
| `POST /api/orders/create` | Create order + payment intent |
| `POST /webhook/stripe` | Handle payment webhooks |
| `POST /api/enterprise/fees/calculate` | Calculate payment fees |
| `POST /api/enterprise/payments/create` | Create payment intent |

**Webhook Events Handled**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

## Maps Integration

### Google Maps

**SDK**: Google Maps REST APIs (via `GoogleMapsService.swift`)

**Base URL**: `https://maps.googleapis.com/maps/api`

**APIs Used**:

#### 1. Directions API
```swift
func getDirections(origin: CLLocationCoordinate2D, destination: CLLocationCoordinate2D) {
    let url = "\(baseURL)/directions/json?origin=\(origin)&destination=\(destination)&mode=driving&departure_time=now&traffic_model=best_guess&key=\(apiKey)"
    // Returns: distance, duration, polyline, turn-by-turn steps
}
```

#### 2. Distance Matrix API
```swift
func getDistanceMatrix(origins: [CLLocationCoordinate2D], destinations: [CLLocationCoordinate2D]) {
    let url = "\(baseURL)/distancematrix/json?origins=\(origins)&destinations=\(destinations)&mode=driving&departure_time=now"
    // Returns: distance/duration matrix for multiple origin/destination pairs
}
```

#### 3. Geocoding API
```swift
// Address to coordinates
func geocodeAddress(address: String) -> GoogleGeocodingResult

// Coordinates to address (reverse)
func reverseGeocode(coordinate: CLLocationCoordinate2D) -> GoogleGeocodingResult
```

#### 4. Places Autocomplete API
```swift
func getPlaceAutocomplete(input: String, location: CLLocationCoordinate2D?, radius: Int = 50000) {
    let url = "\(baseURL)/place/autocomplete/json?input=\(input)&types=address&key=\(apiKey)"
    // Returns: place predictions for address autocompletion
}

func getPlaceDetails(placeId: String) -> GooglePlaceDetail {
    // Returns: full address details including street, city, state, zip
}
```

**Configuration** (`GoogleMapsConfig`):
- API key loaded from configuration
- Key varies by environment (staging/production)

---

## Push Notifications

### Firebase Cloud Messaging (FCM)

**SDK**: `FirebaseMessaging` (part of firebase-ios-sdk)

**Usage**: Push notifications for orders, rides, driver updates

**Implementation**:
```swift
import FirebaseMessaging

// Register device token with backend
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
}

// Send FCM token to P2P backend
func registerDeviceToken(fcmToken: String) {
    // POST /api/device/register
}
```

**Backend Integration**:
```python
# notification-service handles FCM
POST /api/notifications/send
{
    "device_token": "fcm_token",
    "title": "Order Update",
    "body": "Your order is ready for pickup"
}
```

---

## Cloud Services

### AWS CloudFront

**Purpose**: CDN for API and static assets

**Environments**:
| Environment | URL |
|-------------|-----|
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net` |
| Production | `https://api.dollor.ai` |

**Configuration** (`AppConfig.swift`):
```swift
@Published public var p2pAPIBaseURL: String = {
    if let url = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String, !url.isEmpty {
        return url
    }
    // Fallback to production
    return "https://api.dollor.ai"
}()
```

---

## P2P Backend API

### Base Configuration

**API Base URLs** (set via xcconfig):
- Development: `https://dev-api.dollor.ai`
- Staging: `https://d3kuu45w6kl8hr.cloudfront.net`
- Production: `https://api.dollor.ai`

### Microservice URLs

All derived from base URL via `AppConfig`:

```swift
public var negotiationServiceURL: String { "\(p2pAPIBaseURL)/api/negotiation" }
public var chatServiceURL: String { "\(p2pAPIBaseURL)/api/chat" }
public var callServiceURL: String { "\(p2pAPIBaseURL)/api/call" }
```

### Customer API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customer/google-auth` | POST | Google OAuth authentication |
| `/api/customer/apple-auth` | POST | Apple Sign-In authentication |
| `/api/customer/register` | POST | Email/password registration |
| `/api/customer/login` | POST | Email/password login |
| `/api/customer/orders` | GET | List customer orders |
| `/api/erp/restaurants` | GET | List restaurants |
| `/api/erp/restaurants/{id}/menu` | GET | Get restaurant menu |
| `/api/erp/orders/create` | POST | Create new order |
| `/api/erp/orders/{id}/status` | GET | Get order status |

### Driver API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/erp/drivers/register` | POST | Driver registration |
| `/api/erp/drivers/login` | POST | Driver login |
| `/api/erp/drivers/{id}/location` | PUT | Update driver location |
| `/api/erp/orders/available-for-delivery` | GET | Get available orders |
| `/api/erp/orders/{id}/assign-driver` | POST | Accept delivery |
| `/api/erp/orders/driver/{id}/active` | GET | Get active deliveries |

### Vendor/Restaurant API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vendors/google-auth` | POST | Vendor Google authentication |
| `/api/vendors/login` | POST | Vendor login |
| `/api/vendors/orders` | GET | List vendor orders |
| `/api/vendors/menu` | GET/PUT | Manage menu items |
| `/api/vendors/{id}/settings` | GET/PUT | Restaurant settings |

### Configuration API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Fetch app configuration (fees, rates, flags) |

---

## Communication Services

### Chat Service (`ChatService.swift`)

**Purpose**: Real-time messaging between drivers and customers

**Features**:
- REST API for message history
- WebSocket for real-time updates
- Quick reply templates
- Location sharing

```swift
public class ChatService: ObservableObject {
    // Create conversation
    func createConversation(customerId: String, driverId: String?, rideId: String?, orderId: String?)

    // Send message
    func sendMessage(conversationId: String, senderId: String, senderType: String, content: String)

    // Share location
    func sendLocation(conversationId: String, senderId: String, latitude: Double, longitude: Double)

    // WebSocket connection for real-time
    func connectWebSocket(conversationId: String, participantType: String, participantId: String)
}
```

**Endpoints**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/conversations` | POST | Create conversation |
| `/api/chat/conversations/{id}/messages` | GET/POST | Get/send messages |
| `/api/chat/conversations/{id}/read` | POST | Mark as read |
| `/ws/chat/{conversationId}` | WebSocket | Real-time updates |

### Call Service (`CallService.swift`)

**Purpose**: Privacy-protected phone calls via number masking

**Features**:
- Phone number masking
- Call session management
- Call logging

```swift
public class CallService: ObservableObject {
    // Create call session with masked numbers
    func createCallSession(
        customerId: String,
        customerPhone: String,
        rideId: String?,
        driverId: String?,
        driverPhone: String?
    )

    // Get masked number to call
    func getMaskedNumber(sessionId: String, callerType: ParticipantType)

    // Initiate call via system phone app
    func callMaskedNumber(_ maskedNumber: String) {
        if let url = URL(string: "tel://\(cleanNumber)") {
            UIApplication.shared.open(url)
        }
    }
}
```

**Endpoints**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/call/sessions` | POST | Create call session |
| `/api/call/sessions/{id}` | PUT/DELETE | Update/end session |
| `/api/call/masked-number` | GET | Get masked phone number |
| `/api/call/initiate` | POST | Log call initiation |
| `/api/call/logs/{sessionId}` | GET | Get call history |

---

## Viral/Growth Features (V3 API)

### DollorV3Service

**Purpose**: Investor-ready viral features

**Features**:
- Referral system
- Group orders
- Pricing transparency

```swift
public class DollorV3Service {
    let baseURL = AppConfig.shared.p2pAPIBaseURL + "/api/v3"

    // Create order with automatic payment splitting
    func createOrder(_ request: V3CreateOrderRequest) async throws -> V3OrderResponse

    // Get referral code for sharing
    func getReferralCode(userEmail: String) async throws -> V3ReferralResponse

    // Create group order
    func createGroupOrder(hostEmail: String, restaurantId: String, groupName: String) async throws -> V3GroupOrderResponse
}
```

**Response Models Include Transparency**:
```swift
public struct V3OrderResponse: Codable {
    public let orderId: String
    public let total: Double

    // Who gets what (transparency)
    public let restaurantReceives: Double
    public let driverReceives: Double
    public let platformReceives: Double
}
```

---

## Third-Party SDK Summary

| SDK | Version | Purpose | Package Manager |
|-----|---------|---------|-----------------|
| Firebase iOS SDK | 12.0.0+ | Auth, Messaging | SPM |
| GoogleSignIn-iOS | Latest | Google OAuth | SPM |
| Stripe iOS SPM | Latest | Payments | SPM |
| GTMAppAuth | Latest | OAuth helper | SPM (Firebase dep) |
| swift-protobuf | Latest | gRPC support | SPM (Firebase dep) |

---

## Security Considerations

1. **API Keys**: Loaded from plist/xcconfig files, never hardcoded
2. **OAuth Nonces**: Cryptographic nonces for Apple Sign-In security
3. **Token Storage**: Access tokens stored securely via `SecureStorage`
4. **Phone Privacy**: Call service uses number masking, never exposes real numbers
5. **Idempotency**: Payment service uses idempotency keys to prevent duplicates
6. **HTTPS**: All API communication over HTTPS

---

## Environment Configuration

**xcconfig Files**:
- `Development.xcconfig` - Dev environment URLs
- `Staging.xcconfig` - Staging environment URLs
- `Production.xcconfig` - Production environment URLs

**Info.plist Keys**:
- `API_BASE_URL` - Backend API base URL
- `CLIENT_ID` - Google OAuth client ID (from GoogleService-Info.plist)

---

## Data Flow Architecture

```
┌─────────────┐
│   iOS App   │
└─────┬───────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│              P2P Backend API                │
│         (FastAPI / Python)                  │
│  ┌─────────────────────────────────────┐   │
│  │  /api/customer/*  /api/vendors/*    │   │
│  │  /api/erp/*       /api/v3/*         │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│ Stripe │  │  Google  │  │ Firebase │
│  API   │  │ Maps API │  │   FCM    │
└────────┘  └──────────┘  └──────────┘
```
