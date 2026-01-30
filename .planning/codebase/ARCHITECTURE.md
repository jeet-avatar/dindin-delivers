# Dollor.ai Architecture Documentation

> Comprehensive documentation of architecture patterns, data flow, and system design across the Dollor.ai platform.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [iOS Architecture (MVVM)](#ios-architecture-mvvm)
3. [Shared Code Architecture](#shared-code-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Architecture](#database-architecture)
6. [API Communication Patterns](#api-communication-patterns)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)

---

## High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Customer App    |     |    Driver App     |     |  Restaurant App   |
|    (iOS/Swift)    |     |    (iOS/Swift)    |     |    (iOS/Swift)    |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         +-------------------------+-------------------------+
                                   |
                    +-----------------------------+
                    |      EatFairShared          |
                    |   (Swift Package Library)   |
                    +-------------+---------------+
                                  |
                    +-------------v---------------+
                    |        P2P Backend          |
                    |     (FastAPI/Python)        |
                    +-------------+---------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
+--------v--------+    +----------v---------+    +---------v---------+
|   PostgreSQL    |    |  Firebase (Auth)   |    |    Stripe API     |
|   (Primary DB)  |    |  Push Notifications|    |    (Payments)     |
+-----------------+    +--------------------+    +-------------------+
```

---

## iOS Architecture (MVVM)

All three iOS apps follow the **Model-View-ViewModel (MVVM)** architecture pattern with SwiftUI.

### Directory Structure

```
eatfaircustomer/
├── eatfaircustomerApp.swift    # App entry point, AppDelegate
├── ContentView.swift           # Root view controller
├── Models/                     # Local data models
├── ViewModels/                 # Business logic (ObservableObject)
│   ├── AuthViewModel.swift
│   ├── HomeViewModel.swift
│   ├── MenuViewModel.swift
│   ├── MultiRestaurantCartViewModel.swift
│   ├── OrderHistoryViewModel.swift
│   ├── OrderTrackingViewModel.swift
│   ├── RideRequestViewModel.swift
│   └── AddressViewModel.swift
├── Views/                      # SwiftUI views
│   ├── HomeView.swift
│   ├── LoginView.swift
│   ├── MainAppView.swift
│   ├── RestaurantDetailView.swift
│   ├── MultiRestaurantCartView.swift
│   ├── MultiRestaurantCheckoutView.swift
│   └── ... (35+ view files)
├── Services/                   # API & external services
│   ├── PaymentService.swift
│   ├── ACHPaymentService.swift
│   ├── LocationManager.swift
│   └── VoiceSearchService.swift
└── Theme/                      # UI styling
```

### MVVM Pattern Implementation

```
+------------------+     +------------------+     +------------------+
|       View       |<--->|    ViewModel     |<--->|      Model       |
|   (SwiftUI)      |     | (ObservableObject)|    |   (Codable)      |
+------------------+     +------------------+     +------------------+
        |                        |                       ^
        | @StateObject           | Calls Services        |
        | @ObservedObject        v                       |
        | @EnvironmentObject  +------------------+       |
        +-------------------->|    P2PAPIService |-------+
                              |    (Singleton)   |
                              +------------------+
```

### Key Architecture Decisions

1. **SwiftUI-First**: Pure SwiftUI views (no UIKit bridging except for Google Maps)
2. **Singleton Services**: `P2PAPIService.shared`, `AppConfig.shared` for app-wide state
3. **Keychain Security**: Tokens stored via `SecureStorage` in iOS Keychain
4. **Environment Objects**: Cart and address state shared across view hierarchy
5. **Combine Framework**: Async operations using `@Published` and `Combine` publishers

### ViewModel Responsibilities

| ViewModel | Responsibilities |
|-----------|------------------|
| `AuthViewModel` | Login, registration, Google/Apple Sign-In, password reset |
| `HomeViewModel` | Restaurant list, search, filtering, featured items |
| `MenuViewModel` | Menu items, categories, customization options |
| `MultiRestaurantCartViewModel` | Multi-vendor cart, item management |
| `OrderTrackingViewModel` | Real-time order status, driver location |
| `RideRequestViewModel` | Rideshare requests, fare estimation, bidding |
| `AddressViewModel` | Saved addresses, delivery location management |

---

## Shared Code Architecture

### EatFairShared Package

**Location:** `/apps/ios/eatfair-ios-shared/`

The `EatFairShared` Swift Package provides shared functionality across all three iOS apps.

```
EatFairShared/
├── Package.swift               # SPM manifest
└── Sources/EatFairShared/
    ├── AppConfig.swift         # Centralized configuration
    ├── DollorTheme.swift       # UI theme constants
    ├── ErrorHandler.swift      # Error handling utilities
    ├── NotificationManager.swift
    ├── Theme.swift
    ├── Config/
    │   └── GoogleMapsConfig.swift
    ├── Models/
    │   ├── Address.swift
    │   ├── AIEmployee.swift
    │   ├── Driver.swift
    │   ├── EnhancedModels.swift
    │   ├── Order.swift
    │   └── Restaurant.swift
    ├── Services/
    │   ├── P2PAPIService.swift       # Main API client (386KB!)
    │   ├── EnterpriseNetworkLayer.swift
    │   ├── DollorV3Service.swift
    │   ├── GoogleMapsService.swift
    │   ├── LegalService.swift
    │   ├── AIEmployeeService.swift
    │   ├── TripBoardService.swift
    │   ├── CallService.swift
    │   ├── ChatService.swift
    │   └── NegotiationService.swift
    ├── Security/
    │   └── SecureStorage.swift       # Keychain wrapper
    └── Utilities/
        └── ...
```

### Code Sharing Strategy

| Component | Shared via EatFairShared | App-Specific |
|-----------|-------------------------|--------------|
| API Client | P2PAPIService | - |
| Models | Order, Restaurant, Driver, Address | Local ViewModels |
| Configuration | AppConfig, Theme | Bundle-specific plist |
| Security | SecureStorage (Keychain) | - |
| Notifications | NotificationManager | App-specific handlers |
| Services | Chat, Call, Negotiation | Payment (app-specific keys) |

### AppConfig Pattern

`AppConfig` provides centralized, environment-aware configuration:

```swift
public class AppConfig: ObservableObject {
    public static let shared = AppConfig()

    // Environment-specific URL (from Info.plist via xcconfig)
    @Published public var p2pAPIBaseURL: String = {
        if let url = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String {
            return url
        }
        return "https://api.dollor.ai"  // Production fallback
    }()

    // Pricing model constants
    @Published public var foodCustomerFee: Double = 1.00      // $1 flat
    @Published public var foodRestaurantFee: Double = 1.00    // $1 flat
    @Published public var rideshareTier1Fee: Double = 1.00    // $1 for fares <= $35
    @Published public var rideshareTier2Fee: Double = 2.00    // $2 for fares $35-$70
    @Published public var rideshareTier3Fee: Double = 3.00    // $3 for fares > $70
}
```

---

## Backend Architecture

### Main Backend (`main_new.py`)

**Location:** `/apps/web/p2p-platform/backend/`

The main backend is a **monolithic FastAPI application** (~632KB) that handles all API endpoints.

```
backend/
├── main_new.py           # Main FastAPI app (all routes)
├── database.py           # SQLAlchemy session factory
├── models.py             # SQLAlchemy ORM models
├── models_extended.py    # Additional models
├── order_flow.py         # Order lifecycle management
├── bid_routes.py         # Rideshare bidding
├── chat_routes.py        # Real-time chat
├── matchmaking_routes.py # Driver-customer matching
├── stripe_integration.py # Payment processing
├── email_service.py      # Transactional emails
├── pricing_config.py     # Pricing engine
├── promotions.py         # Discount codes
├── realtime_events.py    # WebSocket events
└── migrations/           # Alembic migrations
```

### FastAPI Application Structure

```python
# main_new.py structure
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Invoice Management System")

# CORS Configuration (environment-aware)
app.add_middleware(CORSMiddleware, ...)

# Route groups:
# - /api/auth/*           - Authentication
# - /api/customers/*      - Customer management
# - /api/vendors/*        - Restaurant/vendor management
# - /api/drivers/*        - Driver management
# - /api/orders/*         - Order lifecycle
# - /api/menu/*           - Menu items
# - /api/rides/*          - Rideshare
# - /api/payments/*       - Stripe payments
# - /api/chat/*           - Real-time messaging
# - /api/negotiation/*    - Price negotiation
```

### Microservices Architecture (Planned)

Located in `/services/core/`, these are designed for future decomposition:

| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 8001 | Customer/driver authentication |
| user-service | 8002 | User profile management |
| driver-service | 8003 | Driver profiles, documents, status |
| restaurant-service | 8004 | Restaurant/vendor management |
| order-service | 8005 | Order lifecycle (CQRS) |
| menu-service | 8006 | Menu items, categories |
| rating-service | 8007 | Reviews and ratings |
| payment-service | 8008 | Stripe integration |
| notification-service | 8009 | Push notifications, email |
| location-service | 8010 | H3 geolocation |
| pricing-service | 8011 | Dynamic pricing |
| analytics-service | 8012 | Business intelligence |
| chat-service | 8013 | Real-time messaging |
| ride-service | 8014 | Rideshare requests |
| call-service | 8015 | Privacy-masked calls |
| negotiation-service | 8016 | Price negotiation |

### CQRS Pattern (Order Service)

The order-service implements **Command Query Responsibility Segregation**:

```
+-------------+     +----------+     +-------------+
|   Command   |---->|  Kafka   |---->|   Event     |
|   Handler   |     |  Events  |     |   Store     |
+-------------+     +----------+     +------+------+
                                            |
                                            v
                                    +-------+-------+
                                    | Elasticsearch |
                                    |  (Read Model) |
                                    +---------------+
```

---

## Database Architecture

### ORM: SQLAlchemy 2.0

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
```

### Key Database Models

```python
# models.py - Core entities

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    is_active = Column(Boolean, default=True)  # NOT an enum!
    # ...

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    company_name = Column(String(255))
    status = Column(SQLEnum(VendorStatus))
    # ...

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True)
    status = Column(SQLEnum(DriverStatus))
    # ...

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    status = Column(SQLEnum(OrderStatus))
    # ...
```

### Entity Relationships

```
Customer (1) ----< (N) Order >---- (1) Vendor
                      |
                      +---- (0..1) Driver

Vendor (1) ----< (N) MenuItem

Order (1) ----< (N) OrderItem >---- (1) MenuItem

Driver (1) ----< (N) DriverDocument
```

### Database Migrations

Using **Alembic** for schema migrations:

```bash
cd apps/web/p2p-platform/backend
alembic upgrade head       # Apply migrations
alembic revision --autogenerate -m "Add new table"  # Generate migration
```

---

## API Communication Patterns

### iOS to Backend Flow

```
+---------------+
|   ViewModel   |
+-------+-------+
        |
        | Calls async method
        v
+-------+-------+
| P2PAPIService |  (Singleton)
+-------+-------+
        |
        | URLSession.dataTask
        v
+-------+-------+
|   Backend     |  (FastAPI)
|   /api/*      |
+-------+-------+
        |
        | JSON Response
        v
+-------+-------+
| Decode to     |
| Swift Model   |
+---------------+
```

### Authentication Flow

1. **Email/Password Login:**
   ```
   iOS App -> POST /api/auth/customer/login
           <- { access_token, customer_id, email, full_name }
           -> Store token in Keychain
   ```

2. **Google Sign-In:**
   ```
   iOS App -> GIDSignIn SDK -> Google OAuth
           -> POST /api/auth/google/customer { id_token }
           <- { access_token, customer_id }
   ```

3. **Apple Sign-In:**
   ```
   iOS App -> AuthenticationServices -> Apple OAuth
           -> POST /api/auth/apple/customer { identity_token }
           <- { access_token, customer_id }
   ```

### Token Management

```swift
// SecureStorage.swift - Keychain wrapper
class SecureStorage {
    static let shared = SecureStorage()

    var customerAccessToken: String? {
        get { keychain.get("customer_access_token") }
        set { keychain.set(newValue, forKey: "customer_access_token") }
    }
}
```

---

## State Management

### iOS State Management

| State Type | Implementation | Scope |
|------------|----------------|-------|
| **View State** | `@State` | Single view |
| **ViewModel State** | `@StateObject`, `@ObservedObject` | View + children |
| **App-Wide State** | `@EnvironmentObject` | Entire view hierarchy |
| **Persistent State** | UserDefaults, Keychain | Between sessions |
| **Singleton State** | `P2PAPIService.shared` | Global access |

### Environment Object Pattern

```swift
// App entry point
@main
struct eatfaircustomerApp: App {
    @StateObject private var cartViewModel = MultiRestaurantCartViewModel()
    @StateObject private var addressViewModel = AddressViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(cartViewModel)
                .environmentObject(addressViewModel)
        }
    }
}

// Any child view can access:
struct RestaurantDetailView: View {
    @EnvironmentObject var cart: MultiRestaurantCartViewModel
}
```

### Backend State Management

- **Session State:** JWT tokens (stateless)
- **Request State:** SQLAlchemy session per request
- **Cache State:** Redis for frequently accessed data
- **Event State:** Kafka for event sourcing (microservices)

---

## Data Flow

### Order Placement Flow

```
Customer App                 Backend                    External Services
     |                          |                              |
     |-- 1. Add items to cart --|                              |
     |                          |                              |
     |-- 2. POST /api/orders -->|                              |
     |                          |-- 3. Validate order          |
     |                          |-- 4. Create PaymentIntent -->|-- Stripe
     |                          |<-- PaymentIntent.client_secret|
     |<-- Payment required -----|                              |
     |                          |                              |
     |-- 5. Stripe confirm ---->|------------------------------>|
     |                          |<-- Payment success -----------|
     |                          |                              |
     |                          |-- 6. Create Order            |
     |                          |-- 7. Notify Restaurant ----->|-- FCM
     |                          |-- 8. Send confirmation ----->|-- Email
     |<-- Order confirmed ------|                              |
```

### Real-Time Updates

```
Backend                    Firebase Cloud Messaging           iOS App
   |                              |                              |
   |-- Order status change        |                              |
   |-- Send FCM notification ---->|                              |
   |                              |-- Push notification -------->|
   |                              |                              |-- Display alert
   |                              |                              |-- Update UI
```

### WebSocket Events (Chat/Negotiation)

```
Driver App <-----> WebSocket Server <-----> Customer App
                         |
                   /api/ws/chat/{order_id}
                   /api/ws/negotiation/{ride_id}
```

---

## Security Architecture

### Authentication

- **JWT Tokens:** `python-jose` with HS256
- **Password Hashing:** bcrypt via `passlib`
- **Token Storage:** iOS Keychain (never UserDefaults)

### API Security

- **CORS:** Environment-specific allowed origins
- **Rate Limiting:** `RateLimitEntry` model for distributed limiting
- **Input Validation:** Pydantic models for all requests
- **File Upload:** Path traversal prevention, extension whitelist

### Secure Communication

- **HTTPS:** All API calls over TLS
- **Firebase:** Secure token verification
- **Stripe:** PCI-compliant payment handling

---

## Environment Architecture

| Environment | iOS Config | Backend URL | Features |
|-------------|------------|-------------|----------|
| Development | Development.xcconfig | dev-api.dollor.ai | Mock data, debug logging |
| Staging | Staging.xcconfig | d3kuu45w6kl8hr.cloudfront.net | Real payments, debug logging |
| Production | Production.xcconfig | api.dollor.ai | Full features, analytics |

---

*Last Updated: January 2026*
