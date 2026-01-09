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

## ANTI-HALLUCINATION RULES

1. Backend is PYTHON FASTAPI (not Node.js/Kotlin)
2. Models are in SQLAlchemy (not JSON Schema)
3. Android is in `apps/android/` (not separate repo)
4. Always verify file paths with `ls` before editing
5. Run `python3 -m py_compile` before committing Python

---

## DEMO CREDENTIALS

```
Customer: demo.customer@dollor.ai / DemoCustomer2025!
Driver:   demo.driver@dollor.ai / DemoDriver2025!
Vendor:   demo.restaurant@dollor.ai / DemoRestaurant2025!
```

---

*Last Verified: 2026-01-09*
