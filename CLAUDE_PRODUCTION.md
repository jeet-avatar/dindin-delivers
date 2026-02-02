# CLAUDE.md - Dollor.ai Production Development Guide

> **VERIFIED**: All information confirmed from actual codebase inspection on 2026-01-09.
> **PURPOSE**: Anti-hallucination reference for Claude AI. Production-only facts.

---

## BUSINESS MODEL (VERIFIED)

```
DOLLOR.AI = PEER-TO-PEER MATCHMAKING PLATFORM
- We connect customers with independent drivers
- We are NOT an employer (legally critical)
- Drivers set their own rates via bidding
- We charge FLAT FEES only - never percentage cuts

DELIVERY (FOOD):
  Platform Revenue: $1 from customer + $1 from restaurant = $2/order
  Driver Gets: 100% of delivery fee + 100% of tips

RIDESHARE (TIERED FLAT FEE from customer):
  Fare < $35  -> $1.00 platform fee
  Fare $35-70 -> $2.00 platform fee
  Fare > $70  -> $3.00 platform fee
  Driver Gets: 100% of fare + 100% of tips
```

---

## VERIFIED PROJECT STRUCTURE

```
eatfair-ios/                              # PRIMARY REPOSITORY
├── apps/
│   ├── ios/                              # iOS Apps (Swift/SwiftUI)
│   │   ├── customer/eatfaircustomer/     # Customer App
│   │   │   ├── ViewModels/               # 10 ViewModels
│   │   │   │   ├── AuthViewModel.swift
│   │   │   │   ├── CartViewModel.swift
│   │   │   │   ├── HomeViewModel.swift
│   │   │   │   ├── MenuViewModel.swift
│   │   │   │   ├── RideRequestViewModel.swift
│   │   │   │   ├── OrderHistoryViewModel.swift
│   │   │   │   ├── OrderTrackingViewModel.swift
│   │   │   │   ├── AddressViewModel.swift
│   │   │   │   ├── AddressSearchViewModel.swift
│   │   │   │   └── MultiRestaurantCartViewModel.swift
│   │   │   ├── Views/                    # 37 Views
│   │   │   │   ├── HomeView.swift
│   │   │   │   ├── CartView.swift
│   │   │   │   ├── CheckoutView.swift
│   │   │   │   ├── RideRequestView.swift
│   │   │   │   ├── TripBoardView.swift
│   │   │   │   ├── DeliveryTrackingView.swift
│   │   │   │   ├── RestaurantDetailView.swift
│   │   │   │   ├── ProfileView.swift
│   │   │   │   ├── SettingsView.swift
│   │   │   │   └── ... (37 total)
│   │   │   ├── Services/                 # 5 Services
│   │   │   │   ├── PaymentService.swift
│   │   │   │   ├── ACHPaymentService.swift
│   │   │   │   ├── LocationManager.swift
│   │   │   │   ├── VoiceSearchService.swift
│   │   │   │   └── DatabaseSeeder.swift
│   │   │   └── Models/
│   │   │       └── MenuItem.swift
│   │   │
│   │   ├── delivery/eatffairdelivery/    # Driver App
│   │   │   ├── ViewModels/               # 4 ViewModels
│   │   │   │   ├── DeliveryViewModel.swift
│   │   │   │   ├── DriverProfileViewModel.swift
│   │   │   │   ├── EarningsViewModel.swift
│   │   │   │   └── RideBiddingViewModel.swift
│   │   │   └── Views/
│   │   │       ├── AvailableOrdersView.swift
│   │   │       ├── ActiveDeliveryDetailView.swift
│   │   │       ├── DriverProfileView.swift
│   │   │       ├── MyDeliveriesView.swift
│   │   │       └── Rideshare/            # 8 Rideshare Views
│   │   │           ├── RideshareDashboardView.swift
│   │   │           ├── AvailableRideRequestsView.swift
│   │   │           ├── ActiveRideView.swift
│   │   │           ├── SubmitBidSheet.swift
│   │   │           ├── MyBidsView.swift
│   │   │           ├── RiderChatView.swift
│   │   │           └── RideshareComponents.swift
│   │   │
│   │   ├── restaurant/eatffairrestaurant/ # Restaurant App
│   │   │   ├── ViewModels/               # 6 ViewModels
│   │   │   │   ├── RestaurantViewModel.swift
│   │   │   │   ├── RestaurantMenuViewModel.swift
│   │   │   │   ├── OrdersViewModel.swift
│   │   │   │   ├── AnalyticsViewModel.swift
│   │   │   │   ├── PromotionsViewModel.swift
│   │   │   │   └── AddressSearchViewModel.swift
│   │   │   └── Views/                    # 21 Views
│   │   │       ├── RestaurantDashboardView.swift
│   │   │       ├── EnhancedDashboardView.swift
│   │   │       ├── MenuView.swift
│   │   │       ├── EnhancedMenuView.swift
│   │   │       ├── AnalyticsView.swift
│   │   │       ├── PromotionsView.swift
│   │   │       ├── AIEmployeesView.swift
│   │   │       ├── AIInsightsView.swift
│   │   │       └── ... (21 total)
│   │   │
│   │   └── eatfair-ios-shared/           # SHARED iOS PACKAGE
│   │       └── Sources/EatFairShared/
│   │           ├── Models/               # 6 Model Files
│   │           │   ├── Order.swift       # OrderStatus enum, Order struct
│   │           │   ├── Restaurant.swift  # Restaurant struct
│   │           │   ├── Driver.swift      # Driver struct
│   │           │   ├── Address.swift     # Address struct
│   │           │   ├── AIEmployee.swift  # AIEmployeeRole enum
│   │           │   └── EnhancedModels.swift # Rating, DriverSession
│   │           ├── Services/             # 10 Service Files
│   │           │   ├── P2PAPIService.swift      # 361KB - MAIN API CLIENT
│   │           │   ├── DollorV3Service.swift
│   │           │   ├── EnterpriseNetworkLayer.swift
│   │           │   ├── GoogleMapsService.swift
│   │           │   ├── LegalService.swift
│   │           │   ├── TripBoardService.swift
│   │           │   ├── AIEmployeeService.swift
│   │           │   ├── ChatService.swift
│   │           │   ├── CallService.swift
│   │           │   └── NegotiationService.swift
│   │           └── Config/
│   │               └── AppConfig.swift
│   │
│   ├── android/                          # Android Apps (Kotlin/Jetpack Compose)
│   │   ├── app/                          # Customer App (ai.dollor.customer)
│   │   │   └── src/main/java/com/eatfair/app/
│   │   │       ├── ui/                   # 27 UI Packages
│   │   │       │   ├── auth/             # Login, Register, ForgotPassword
│   │   │       │   ├── home/             # HomeScreen, HomeViewModel
│   │   │       │   ├── restaurant/       # RestaurantScreen, RestaurantListScreen
│   │   │       │   ├── cart/             # CartScreen, CartViewModel
│   │   │       │   ├── checkout/         # V3CheckoutScreen, MultiRestaurantCheckoutScreen
│   │   │       │   ├── order/            # OrderTrackingScreen, OrderSuccessScreen
│   │   │       │   ├── rideshare/        # RideRequestScreen, RideRequestViewModel
│   │   │       │   ├── profile/          # ProfileScreen, SettingsScreen
│   │   │       │   ├── address/          # SavedAddressesScreen, LocationMapScreen
│   │   │       │   ├── notification/     # NotificationScreen
│   │   │       │   ├── deals/            # DealsScreen
│   │   │       │   ├── favorites/        # FavoritesScreen
│   │   │       │   ├── search/           # SearchScreen
│   │   │       │   ├── chat/             # DriverChatScreen
│   │   │       │   ├── rating/           # RateDriverScreen
│   │   │       │   ├── tip/              # TipDriverScreen
│   │   │       │   ├── refer/            # ReferAndEarnScreen
│   │   │       │   ├── payment/          # PaymentMethodsScreen
│   │   │       │   ├── delivery/         # ScheduleDeliveryScreen
│   │   │       │   ├── help/             # HelpSupportScreen
│   │   │       │   └── ... (27 total)
│   │   │       ├── data/                 # Repository, API Service
│   │   │       └── model/                # DTOs
│   │   │
│   │   ├── driver/                       # Driver App (ai.dollor.driver)
│   │   │   └── src/main/java/com/eatfair/driver/
│   │   │       ├── ui/
│   │   │       │   ├── home/             # DriverHomeScreen
│   │   │       │   ├── auth/             # LoginScreen
│   │   │       │   ├── orders/           # AvailableOrdersScreen
│   │   │       │   ├── earnings/         # EarningsScreen, EarningsViewModel
│   │   │       │   ├── profile/          # ProfileScreen
│   │   │       │   ├── compliance/       # DriverComplianceScreens
│   │   │       │   └── navigation/       # DriverNavGraph
│   │   │       ├── MainActivity.kt
│   │   │       └── DriverApp.kt
│   │   │
│   │   ├── partner/                      # Restaurant App (ai.dollor.partner)
│   │   │   └── src/main/java/com/eatfair/partner/
│   │   │       ├── ui/
│   │   │       │   ├── home/             # PartnerHomeScreen, PartnerHomeViewModel
│   │   │       │   ├── auth/             # LoginScreen, RegistrationScreen
│   │   │       │   ├── menu/             # MenuScreen
│   │   │       │   ├── analytics/        # AnalyticsScreen
│   │   │       │   ├── promotions/       # PromotionsScreen, CreatePromotionScreen
│   │   │       │   ├── dashboard/        # EnhancedDashboardScreen
│   │   │       │   ├── settings/         # RestaurantSettingsScreen, BusinessHoursScreen
│   │   │       │   └── profile/          # ProfileScreen
│   │   │       └── MainActivity.kt
│   │   │
│   │   └── shared/                       # SHARED Android Module (46 files)
│   │       └── src/main/java/com/eatfair/shared/
│   │           ├── model/                # Data Models
│   │           │   ├── order/            # OrderDto, OrderEntity, MultiRestaurantOrder
│   │           │   ├── restaurant/       # Restaurant, MenuItem, CartItem
│   │           │   ├── driver/           # Driver, DriverSession, DriverEarnings
│   │           │   ├── rideshare/        # RideshareModels.kt
│   │           │   ├── address/          # AddressDto, LocationData
│   │           │   ├── home/             # Category, FeaturedDeal, FoodItem
│   │           │   ├── notification/     # NotificationItem
│   │           │   ├── payment/          # PaymentSheetKeys
│   │           │   ├── rating/           # Rating
│   │           │   ├── search/           # SearchResultDto
│   │           │   └── ApiModels.kt
│   │           ├── data/
│   │           │   ├── remote/           # DollorApiService, ChatService, CallService
│   │           │   ├── repository/       # DollorRepository
│   │           │   ├── repo/             # OrderRepo, RestaurantRepo, AddressRepo
│   │           │   ├── dao/              # AddressDao
│   │           │   └── local/            # SecureStorage, SessionManager
│   │           ├── config/
│   │           │   └── AppConfig.kt
│   │           ├── auth/
│   │           │   └── GoogleSignInHelper.kt
│   │           ├── network/
│   │           │   └── TokenRefreshInterceptor.kt
│   │           ├── ui/
│   │           │   ├── LegalAcceptanceScreen.kt
│   │           │   └── CaliforniaComplianceScreens.kt
│   │           ├── di/
│   │           │   └── SharedModule.kt
│   │           └── notifications/
│   │               └── DollorFirebaseMessagingService.kt
│   │
│   └── web/p2p-platform/
│       ├── backend/                      # PYTHON FASTAPI BACKEND (45 files)
│       │   ├── main_new.py               # 641KB - 454 API endpoints
│       │   │                             # (192 GET, 195 POST, 30 PUT, 9 PATCH, 28 DELETE)
│       │   ├── models.py                 # SQLAlchemy models (36 tables)
│       │   ├── models_extended.py        # Additional models (12 tables)
│       │   ├── database.py               # DB connection & init
│       │   ├── email_service.py          # Email with security, audit, retry
│       │   ├── bid_routes.py             # Rideshare bidding endpoints
│       │   ├── chat_routes.py            # Chat/messaging endpoints
│       │   ├── matchmaking_routes.py     # Driver-order matching
│       │   ├── verification_routes.py    # Document verification
│       │   ├── vibing_routes.py          # Social features
│       │   ├── order_flow.py             # Order processing logic
│       │   ├── promotions.py             # Promotions system
│       │   ├── pricing_config.py         # Pricing rules
│       │   ├── rideshare_payments.py     # Rideshare payment processing
│       │   ├── stripe_integration.py     # Stripe payments
│       │   ├── s3_service.py             # AWS S3 uploads
│       │   ├── websocket_server.py       # Real-time WebSocket
│       │   └── tests/                    # Pytest tests
│       │       ├── unit/
│       │       ├── integration/
│       │       ├── e2e/
│       │       └── api/
│       │
│       └── frontend/                     # REACT ADMIN PORTAL (89+ screens)
│           └── src/
│               ├── App.tsx
│               └── app/screens/
│                   ├── customer/         # 16 screens
│                   ├── driver/           # 8 screens
│                   ├── vendor/           # 7 screens
│                   ├── auth/             # 7 screens
│                   ├── accounting/       # 5 screens
│                   ├── public/           # 8 screens
│                   ├── rideshare/        # 2 screens
│                   └── ... (89+ total)
│
├── services/core/                        # MICROSERVICES (16 services)
│   ├── auth-service/
│   ├── driver-service/
│   ├── order-service/
│   ├── ride-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── location-service/
│   ├── restaurant-service/
│   ├── menu-service/
│   ├── pricing-service/
│   ├── analytics-service/
│   ├── chat-service/
│   ├── call-service/
│   ├── negotiation-service/
│   ├── rating-service/
│   └── user-service/
│
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   ├── helm/
│   ├── argocd/
│   ├── ecs/
│   └── kustomize/
│
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── redis-client/
│   └── firebase-admin/
│
└── .github/workflows/                    # 17 CI/CD workflows
    ├── deploy-dollar-ai.yml
    ├── deploy-staging.yml
    ├── ios-ci.yml
    ├── android-ci.yml
    └── ...
```

---

## VERIFIED TECH STACK

### Backend (Python FastAPI)
```
Language:       Python 3.11+
Framework:      FastAPI
ORM:            SQLAlchemy
Database:       PostgreSQL (RDS)
Auth:           JWT
Email:          AWS SES
Payments:       Stripe
Storage:        AWS S3
```

### iOS Apps (Swift/SwiftUI)
```
Language:       Swift 5.9+
UI:             SwiftUI
Architecture:   MVVM
Auth:           Google Sign-In, Apple Sign-In
Maps:           MapKit + Google Maps SDK
Payments:       Stripe iOS SDK
```

### Android Apps (Kotlin/Compose)
```
Language:       Kotlin
UI:             Jetpack Compose
Architecture:   MVVM + Clean Architecture
DI:             Hilt
Auth:           Google Sign-In
Payments:       Stripe Android SDK
```

### Web Frontend (React)
```
Framework:      React 18 + TypeScript
Build:          Vite
UI Library:     Ant Design 5.x
HTTP:           Axios
```

---

## DATABASE MODELS (48 Total)

### models.py (36 tables):
```
User, Client, Invoice, InvoiceItem, Payment
Vendor, VendorPurchaseOrder, VendorMenuItem
Order, StripePaymentLog, VendorPayout
Customer, Cart, CartItem, Driver, DriverPayout
JournalEntry, JournalEntryLine
AIEmployee, AIEmployeeActivity, AIEmployeeHourlyReport, AIEmployeeDailyReport
DashboardMetric, SupportTicket, TicketComment
ChatConversation, ChatMessage, RideRequest, RideBid
CoupaSupplier, CoupaDepartment, CoupaCostCenter, CoupaCommodity
CoupaPurchaseOrder, CoupaPurchaseOrderLine, CoupaRequisition
```

### models_extended.py (12 tables):
```
Promotion, PromotionRedemption, RestaurantInvitation
OnboardingLog, ScrapedMenuItem, RealTimeEvent
Communication, CustomerFavorite, VendorAnalytics
EmailTemplate, EmailSchedule, EmailABTest
```

---

## API ENDPOINTS (454 Total)

```
GET:    192 endpoints
POST:   195 endpoints
PUT:     30 endpoints
PATCH:    9 endpoints
DELETE:  28 endpoints
```

### Key Endpoints:
```
Health:     GET /health, /api/health
Auth:       POST /api/auth/customer/login, /api/auth/driver/login, /api/auth/vendor/login
Rideshare:  POST /api/rideshare/request, /api/rideshare/bid
Orders:     POST /api/orders, GET /api/orders/{id}
```

---

## ENVIRONMENTS

| Environment | URL |
|-------------|-----|
| Local | http://localhost:8080 |
| Staging | https://d3kuu45w6kl8hr.cloudfront.net |
| Production | https://api.dollor.ai |

---

## COMMANDS

### Start Backend
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080
```

### Start Frontend
```bash
cd apps/web/p2p-platform/frontend
npm run dev
```

### Build Android
```bash
cd apps/android
./gradlew :app:assembleRelease      # Customer
./gradlew :driver:assembleRelease   # Driver
./gradlew :partner:assembleRelease  # Restaurant
```

---

## DATABASE INDEXING CONVENTIONS (VERIFIED)

### Primary Key Pattern
```python
id = Column(Integer, primary_key=True, index=True)
```

### Indexed Fields (Always Index These):
```python
# Unique identifiers - ALWAYS index
email = Column(String(255), unique=True, index=True, nullable=False)
order_number = Column(String(50), unique=True, nullable=False, index=True)
invoice_number = Column(String(50), unique=True, nullable=False, index=True)
driver_id = Column(String(50), unique=True, nullable=False, index=True)
customer_id = Column(String(50), unique=True, nullable=True, index=True)

# Business codes - ALWAYS index
ticket_id = Column(String(20), unique=True, nullable=False, index=True)  # DOLLOR-123
request_id = Column(String(50), unique=True, nullable=False, index=True)  # RR-20241221-001
bid_id = Column(String(50), unique=True, nullable=False, index=True)  # BID-20241221-001
template_id = Column(String(100), unique=True, nullable=False, index=True)

# Foreign keys for frequent queries - index for performance
customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True)
order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False, index=True)
conversation_id = Column(Integer, ForeignKey("chat_conversations.id"), nullable=False, index=True)

# Scheduled/time-based queries - index for filtering
scheduled_for = Column(DateTime, nullable=False, index=True)
```

### DO NOT Index:
- Boolean fields (low cardinality)
- Text/JSON columns
- Rarely queried fields
- Fields already part of composite unique constraints

---

## FIELD NAMING CONVENTIONS (VERIFIED)

### Boolean Fields - Use `is_` or `has_` Prefix
```python
# Status booleans
is_active = Column(Boolean, default=True)
is_online = Column(Boolean, default=False)
is_published = Column(Boolean, default=False)
is_verified = Column(Boolean, default=False)
is_read = Column(Boolean, default=False)
is_delivered = Column(Boolean, default=False)
is_recurring = Column(Boolean, default=False)
is_counter_offer = Column(Boolean, default=False)
is_internal = Column(Boolean, default=False)

# Feature flags
is_vegetarian = Column(Boolean, default=False)
is_vegan = Column(Boolean, default=False)
is_gluten_free = Column(Boolean, default=False)
is_spicy = Column(Boolean, default=False)
is_available = Column(Boolean, default=True)

# Document/verification booleans (no prefix - legacy pattern)
w9_form = Column(Boolean, default=False)
insurance = Column(Boolean, default=False)
background_check = Column(Boolean, default=False)
documents_verified = Column(Boolean, default=False)
```

### Timestamp Fields - Use `_at` Suffix
```python
created_at = Column(DateTime, default=datetime.utcnow)
updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
approved_at = Column(DateTime)
delivered_at = Column(DateTime)
cancelled_at = Column(DateTime)
sent_at = Column(DateTime)
read_at = Column(DateTime)
matched_at = Column(DateTime)
published_at = Column(DateTime)
verified_at = Column(DateTime)
```

### ID Fields
```python
# Database primary key
id = Column(Integer, primary_key=True, index=True)

# Business identifiers (string format)
driver_id = Column(String(50))  # DRV-00001
order_number = Column(String(50))  # ORD-20241221-001
request_id = Column(String(50))  # RR-20241221-001

# External system IDs
stripe_customer_id = Column(String(255))
stripe_account_id = Column(String(255))
persona_inquiry_id = Column(String(255))
coupa_invoice_id = Column(String(100))
```

### URL Fields - Use `_url` Suffix
```python
image_url = Column(String(500))
photo_url = Column(String(500))
drivers_license_url = Column(String(500))
insurance_url = Column(String(500))
w9_form_url = Column(String(500))
```

---

## API ROUTING CONVENTIONS (VERIFIED)

### URL Structure
```
/api/{resource}                    # Collection
/api/{resource}/{id}               # Single item
/api/{resource}/{id}/{action}      # Action on item
/api/{resource}/{id}/{sub-resource} # Nested resource
```

### Auth Routes
```python
# Customer auth
@app.post("/api/auth/customer/login")
@app.post("/api/auth/customer/register")
@app.post("/api/auth/customer/google")
@app.get("/api/auth/customer/me")

# Driver auth
@app.post("/api/auth/driver/login")
@app.post("/api/auth/driver/register")
@app.post("/api/auth/driver/google")
@app.post("/api/auth/driver/apple-auth")
@app.get("/api/auth/driver/me")

# Vendor auth
@app.post("/api/auth/vendor/login")
@app.post("/api/auth/vendor/register")
@app.post("/api/auth/vendor/google-auth")
@app.post("/api/auth/vendor/apple-auth")
```

### Resource Routes (CRUD)
```python
# Standard pattern
@app.get("/api/vendors")                    # List
@app.post("/api/vendors")                   # Create
@app.get("/api/vendors/{vendor_id}")        # Read
@app.put("/api/vendors/{vendor_id}")        # Update (full)
@app.patch("/api/vendors/{vendor_id}")      # Update (partial)
@app.delete("/api/vendors/{vendor_id}")     # Delete

# Nested resources
@app.get("/api/vendors/{vendor_id}/menu")
@app.get("/api/vendors/{vendor_id}/documents")
@app.post("/api/vendors/{vendor_id}/documents")
```

### Action Routes
```python
@app.patch("/api/vendors/{vendor_id}/status")
@app.post("/api/orders/{order_id}/assign-driver")
@app.post("/api/orders/{order_id}/picked-up")
@app.post("/api/orders/{order_id}/delivered")
@app.post("/api/rides/bid/{bid_id}/accept")
@app.post("/api/rides/bid/{bid_id}/withdraw")
```

### Mobile Aliases (Support Both)
```python
# Some mobile apps use routes without /api prefix
@app.post("/api/auth/driver/login")
@app.post("/auth/driver/login")  # Alias for mobile apps

@app.post("/api/auth/customer/login")
@app.post("/auth/customer/login")  # Alias for mobile apps
```

---

## AXIOS / HTTP CLIENT CONVENTIONS (VERIFIED)

### Frontend (React/TypeScript)
```typescript
// api.ts - Centralized API client
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Request interceptor for auth
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("token")
    || localStorage.getItem("id_token")
    || localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Export named functions
export const getOrders = async (params?: Record<string, unknown>) => {
  const response = await api.get('/orders', { params });
  return response.data;
};
```

### iOS (Swift/URLSession)
```swift
// P2PAPIService.swift - Native URLSession
private var baseURL: String {
    return "\(AppConfig.shared.p2pAPIBaseURL)/api"
}

// Tokens in Keychain via SecureStorage
private var customerToken: String? {
    return SecureStorage.shared.customerAccessToken
}

// HTTP calls with URLSession
URLSession.shared.dataTask(with: url) { data, response, error in
    // Handle response
}.resume()
```

### Android (Kotlin/Retrofit)
```kotlin
// DollorApiService.kt - Retrofit interface
interface DollorApiService {
    @GET("vendors/published")
    suspend fun getPublishedVendors(@Query("platform") platform: String): List<Vendor>

    @POST("auth/customer/login")
    suspend fun customerLogin(@Body request: LoginRequest): LoginResponse
}

// AppConfig.kt
object AppConfig {
    const val API_BASE_URL = "https://api.dollor.ai/api/"
}
```

---

## ENUM PATTERNS (VERIFIED)

### Status Enums
```python
class OrderStatus(enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PENDING_RESTAURANT = "pending_restaurant"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class VendorStatus(enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class DriverStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
```

### Column Definition with Enum
```python
status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING_PAYMENT)
onboarding_status = Column(SQLEnum(VendorStatus), default=VendorStatus.PENDING)
```

---

## ANTI-HALLUCINATION RULES

1. Backend is PYTHON FASTAPI (not Node.js/Kotlin)
2. Models are in SQLAlchemy (not JSON Schema)
3. Android is in `apps/android/` (not separate repo)
4. Always verify file paths with `ls` before editing
5. Run `python3 -m py_compile` before committing Python
6. Boolean fields use `is_` prefix (except legacy document fields)
7. Timestamps use `_at` suffix
8. Always index: primary keys, unique identifiers, foreign keys for frequent queries
9. API routes follow `/api/{resource}/{id}/{action}` pattern
10. Mobile apps may use routes with or without `/api` prefix

---

## SECURITY AUDIT - DISTRIBUTED RATE LIMITING (January 9, 2026)

### Implementation Summary

Successfully implemented database-backed distributed rate limiting to replace the previous in-memory rate limiting system. This ensures consistent rate limiting across all ECS/K8s container instances in production.

### Test Results

| Metric | Before | After |
|--------|--------|-------|
| Total Tests | 60 | 60 |
| Passed | 53 (88.3%) | **60 (100%)** |
| Failed | 7 | **0** |

### What Was Implemented

1. **Database-Backed Rate Limiting (PostgreSQL)**
   - Replaced in-memory storage with PostgreSQL for distributed consistency

2. **New Components:**
   - `RateLimitEntry` model in `models.py` - Database model to track rate limit attempts
   - `DistributedRateLimiter` class in `main_new.py` - Core rate limiting logic

3. **DistributedRateLimiter Features:**
   | Feature | Description |
   |---------|-------------|
   | Distributed Support | Works across ECS/K8s container instances |
   | Sliding Window Algorithm | Accurate rate tracking over time windows |
   | Auto Table Creation | Creates rate_limit_entries table on startup |
   | Fail-Closed Security | Denies requests on errors (secure default) |
   | Probabilistic Cleanup | Auto-removes expired entries to prevent table bloat |

### Rate Limits Enforced

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 1 minute |
| Registration | 3 attempts | 5 minutes |
| Password Reset | 3 attempts | 5 minutes |

### Issues Fixed

**F-String Syntax Error (email_service.py:152)**
- Problem: Escaped quotes inside f-string expression causing container startup failures
- Resolution: Fixed f-string syntax to properly format the email footer
- Commit: `009332a0` - fix(email): Fix f-string syntax error in email footer

### Deployment History

| Commit | Description |
|--------|-------------|
| `361d4891` | fix(security): Implement distributed rate limiting with PostgreSQL |
| `469d8aaa` | chore(production): update image - blue-green deployment |
| `2e656dd6` | fix(security): Add explicit table creation and error handling for rate limiter |
| `ee2c19e1` | chore(production): update image - blue-green deployment |
| `009332a0` | fix(email): Fix f-string syntax error in email footer |

### Security Improvements

**Before (Vulnerable):**
- In-memory rate limiting only worked per-container
- Attackers could bypass limits by hitting different container instances
- No persistence of rate limit data across container restarts

**After (Secure):**
- Centralized rate limit tracking in PostgreSQL
- Consistent enforcement across all container instances
- Rate limit data persists through container restarts/deployments
- Fail-closed behavior ensures security even on database errors

### Files Modified

| File | Changes |
|------|---------|
| `apps/web/p2p-platform/backend/models.py` | Added RateLimitEntry model |
| `apps/web/p2p-platform/backend/main_new.py` | Added DistributedRateLimiter class |
| `apps/web/p2p-platform/backend/email_service.py` | Fixed f-string syntax error |

---

## DEMO CREDENTIALS

```
Customer: demo.customer@dollor.ai / DemoCustomer2025!
Driver:   demo.driver@dollor.ai / DemoDriver2025!
Vendor:   demo.restaurant@dollor.ai / DemoRestaurant2025!
```

---

*Last Verified: 2026-01-09*
*Security Audit Completed: 2026-01-09*
