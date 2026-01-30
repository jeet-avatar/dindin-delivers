# Dollor.ai (EatFair) Codebase Structure

This document provides a comprehensive map of the eatfair-ios repository, detailing the directory layout, key files, and where different features are implemented.

---

## Repository Overview

```
eatfair-ios/                              # Primary monorepo
├── .claude/                              # Claude AI configuration and training
├── .github/                              # GitHub Actions workflows
├── .planning/                            # Project planning documentation
├── apps/                                 # All applications
│   ├── ios/                              # iOS applications (Swift/SwiftUI)
│   └── web/p2p-platform/                 # Web platform (Python backend + React frontend)
├── backend/                              # Shared backend utilities
├── docs/                                 # Project documentation
├── frontend/                             # Legacy frontend (deprecated)
├── infrastructure/                       # Kubernetes, Terraform, ArgoCD configs
├── packages/                             # Shared npm packages
├── scripts/                              # Automation and deployment scripts
└── services/                             # Microservices architecture
```

---

## iOS Applications (`/apps/ios/`)

### Directory Structure

```
apps/ios/
├── Config/                               # Environment configurations
│   ├── Development.xcconfig              # Dev environment settings
│   ├── Staging.xcconfig                  # Staging (TestFlight) settings
│   └── Production.xcconfig               # Production settings
├── customer/                             # Customer App
├── delivery/                             # Driver App
├── restaurant/                           # Restaurant/Vendor App
├── eatfair-ios-shared/                   # Shared Swift Package
├── EatFair.xcworkspace                   # Xcode workspace (all apps)
├── fastlane/                             # Fastlane deployment configuration
└── legal/                                # Legal documents (Terms, Privacy)
```

---

### Customer App (`/apps/ios/customer/`)

The main consumer-facing application for ordering food and requesting rides.

```
customer/
├── eatfaircustomer/                      # Source code
│   ├── eatfaircustomerApp.swift          # App entry point, AppDelegate
│   ├── ContentView.swift                 # Root content view
│   ├── Info.plist                        # App configuration
│   ├── GoogleService-Info.plist          # Firebase configuration
│   ├── Assets.xcassets/                  # Images, colors, app icons
│   ├── Models/                           # Local data models
│   │   └── MenuItem.swift                # Local menu item model
│   ├── ViewModels/                       # MVVM ViewModels
│   │   ├── AuthViewModel.swift           # Authentication logic
│   │   ├── HomeViewModel.swift           # Home screen data
│   │   ├── AddressViewModel.swift        # Address management
│   │   ├── MenuViewModel.swift           # Restaurant menu data
│   │   ├── MultiRestaurantCartViewModel.swift  # Multi-restaurant cart
│   │   ├── OrderTrackingViewModel.swift  # Order tracking
│   │   ├── OrderHistoryViewModel.swift   # Past orders
│   │   └── RideRequestViewModel.swift    # Rideshare logic
│   ├── Views/                            # SwiftUI Views
│   │   ├── MainAppView.swift             # Tab navigation container
│   │   ├── HomeView.swift                # Main home screen
│   │   ├── LoginView.swift               # Login/Register
│   │   ├── RegisterView.swift            # Registration form
│   │   ├── ProfileView.swift             # User profile
│   │   ├── RestaurantDetailView.swift    # Restaurant menu display
│   │   ├── MultiRestaurantCartView.swift # Shopping cart
│   │   ├── MultiRestaurantCheckoutView.swift  # Checkout flow
│   │   ├── OrderHistoryView.swift        # Order history
│   │   ├── OrderSuccessView.swift        # Order confirmation
│   │   ├── DeliveryTrackingView.swift    # Live order tracking
│   │   ├── RideRequestView.swift         # Rideshare booking
│   │   ├── TripBoardView.swift           # Rideshare trip board
│   │   ├── SearchRestaurantsView.swift   # Restaurant search
│   │   ├── SettingsView.swift            # App settings
│   │   ├── PaymentMethodsView.swift      # Payment management
│   │   ├── AddressListView.swift         # Saved addresses
│   │   ├── LocationPickerView.swift      # Address picker
│   │   └── HelpSupportView.swift         # Help & support
│   ├── Services/                         # Local services
│   │   ├── PaymentService.swift          # Stripe payment integration
│   │   ├── ACHPaymentService.swift       # ACH bank payments
│   │   ├── LocationManager.swift         # Core Location wrapper
│   │   ├── VoiceSearchService.swift      # Voice search
│   │   └── DatabaseSeeder.swift          # Debug data seeding
│   └── Theme/                            # Local theme overrides
├── eatfaircustomer.xcodeproj/            # Xcode project
├── eatfaircustomerTests/                 # Unit tests
├── eatfaircustomerUITests/               # UI tests
├── Pods/                                 # CocoaPods dependencies
├── fastlane/                             # App-specific fastlane config
└── ExportOptions.plist                   # Archive export settings
```

**Key Files:**
- `eatfaircustomerApp.swift` - App lifecycle, Firebase/Google SDK init, push notifications
- `ViewModels/AuthViewModel.swift` - Google Sign-In, Apple Sign-In, email/password auth
- `Views/HomeView.swift` - Main dashboard with restaurants, categories, active orders
- `Views/RideRequestView.swift` - Full rideshare booking UI

---

### Driver App (`/apps/ios/delivery/`)

The driver application for accepting deliveries and rideshare trips.

```
delivery/
├── eatffairdelivery/                     # Source code
│   ├── eatffairdeliveryApp.swift         # App entry point
│   ├── DriverDashboardView.swift         # Main dashboard
│   ├── DriverLoginView.swift             # Login with Google/Apple/Email
│   ├── Theme.swift                       # Driver app theme
│   ├── ViewModels/
│   │   ├── DeliveryViewModel.swift       # Delivery operations
│   │   ├── DriverProfileViewModel.swift  # Profile, documents
│   │   ├── EarningsViewModel.swift       # Earnings tracking
│   │   └── RideBiddingViewModel.swift    # Rideshare bidding
│   ├── Views/
│   │   ├── AvailableOrdersView.swift     # Available deliveries
│   │   ├── ActiveDeliveryDetailView.swift # Active delivery tracking
│   │   ├── PickupDropoffView.swift       # Pickup/dropoff workflow
│   │   ├── MyDeliveriesView.swift        # Delivery history
│   │   ├── DriverProfileView.swift       # Profile management
│   │   ├── DriverStatsCard.swift         # Statistics display
│   │   ├── ChatView.swift                # Customer chat
│   │   ├── OrderMapDetailView.swift      # Map navigation
│   │   ├── TermsAndConditionsView.swift  # Legal agreements
│   │   ├── VoiceAssistantButton.swift    # Voice commands
│   │   └── Rideshare/                    # Rideshare-specific views
│   │       ├── RideshareOrdersView.swift
│   │       ├── BiddingView.swift
│   │       └── TripDetailView.swift
│   └── Services/
│       ├── AuthManager.swift             # Authentication
│       ├── LocationManager.swift         # GPS tracking
│       ├── ChatManager.swift             # Real-time chat
│       └── VoiceAssistantManager.swift   # Voice commands
├── eatffairdelivery.xcodeproj/
├── eatffairdeliveryTests/
└── eatffairdeliveryUITests/
```

**Key Files:**
- `DriverLoginView.swift` - Comprehensive auth with Keychain storage
- `ViewModels/DeliveryViewModel.swift` - Core delivery state management
- `Views/AvailableOrdersView.swift` - Order selection and acceptance

---

### Restaurant App (`/apps/ios/restaurant/`)

The vendor application for managing orders, menu, and analytics.

```
restaurant/
├── eatffairrestaurant/                   # Source code
│   ├── eatffairrestaurantApp.swift       # App entry point
│   ├── ContentView.swift                 # Navigation controller
│   ├── Persistence.swift                 # Core Data setup
│   ├── Theme.swift                       # Restaurant theme
│   ├── ViewModels/
│   │   ├── OrdersViewModel.swift         # Order management
│   │   ├── AnalyticsViewModel.swift      # Business analytics
│   │   └── AIInsightsViewModel.swift     # AI-powered insights
│   └── Views/
│       ├── DashboardView.swift           # Main dashboard
│       ├── OrdersView.swift              # Active orders
│       ├── MenuManagementView.swift      # Menu CRUD
│       ├── AIEmployeesView.swift         # AI employee management
│       ├── AnalyticsView.swift           # Business analytics
│       ├── SettingsView.swift            # Restaurant settings
│       └── ImagePicker.swift             # Photo selection
├── eatffairrestaurant.xcodeproj/
├── eatffairrestaurantTests/
└── Pods/
```

**Key Files:**
- `ViewModels/OrdersViewModel.swift` - Real-time order management
- `Views/AIEmployeesView.swift` - AI workforce management feature

---

### Shared Package (`/apps/ios/eatfair-ios-shared/`)

Swift Package providing shared code across all iOS apps.

```
eatfair-ios-shared/
├── Package.swift                         # SPM manifest
└── Sources/EatFairShared/
    ├── AppConfig.swift                   # Centralized configuration
    ├── DollorTheme.swift                 # Unified color system
    ├── Theme.swift                       # Theme helpers
    ├── ErrorHandler.swift                # Standardized error handling
    ├── NotificationManager.swift         # Push notification handling
    ├── Models/
    │   ├── Restaurant.swift              # Restaurant model
    │   ├── Order.swift                   # Order model
    │   ├── Driver.swift                  # Driver model
    │   ├── Address.swift                 # Address model
    │   ├── AIEmployee.swift              # AI employee model
    │   └── EnhancedModels.swift          # Additional models
    ├── Services/
    │   ├── P2PAPIService.swift           # Main API client (~386KB)
    │   ├── EnterpriseNetworkLayer.swift  # Network infrastructure
    │   ├── GoogleMapsService.swift       # Maps integration
    │   ├── TripBoardService.swift        # Trip board for rideshare
    │   ├── DollorV3Service.swift         # V3 API features
    │   ├── AIEmployeeService.swift       # AI employee API
    │   ├── LegalService.swift            # Legal document service
    │   ├── ChatService.swift             # Real-time chat
    │   ├── CallService.swift             # Privacy-masked calls
    │   └── NegotiationService.swift      # Price negotiation
    ├── Security/
    │   ├── SecureStorage.swift           # Keychain wrapper
    │   └── NetworkSecurity.swift         # SSL pinning, etc.
    ├── Utilities/
    │   ├── Calculators.swift             # Tax, distance, price calculations
    │   ├── DateTimeFormatter.swift       # Date formatting
    │   └── EmailValidator.swift          # Email validation
    ├── Views/
    │   ├── GoogleMapView.swift           # Maps component
    │   ├── GooglePlacesSearchView.swift  # Places autocomplete
    │   ├── V3CheckoutView.swift          # Checkout component
    │   ├── PaymentBreakdownView.swift    # Price breakdown
    │   ├── LegalAcceptanceView.swift     # Terms acceptance
    │   ├── OrderConfirmationViews.swift  # Confirmation screens
    │   └── ViralFeaturesView.swift       # Sharing/referral features
    └── Config/
        └── GoogleMapsConfig.swift        # Maps API config
```

**Key Files:**
- `AppConfig.swift` - All environment URLs, pricing configuration
- `Services/P2PAPIService.swift` - Complete API client (largest file in codebase)
- `Security/SecureStorage.swift` - Keychain token storage
- `DollorTheme.swift` - Unified design system colors

---

## Backend (`/apps/web/p2p-platform/backend/`)

Python FastAPI backend serving all mobile and web clients.

```
backend/
├── main_new.py                           # Primary API (~630KB, all endpoints)
├── database.py                           # SQLAlchemy database setup
├── models.py                             # SQLAlchemy ORM models
├── email_service.py                      # Transactional email sending
├── document_verification_service.py      # Document verification
├── pricing_config.py                     # Pricing configuration
├── image_service.py                      # Image processing
├── accounting_module.py                  # Financial accounting
├── bid_routes.py                         # Rideshare bidding API
├── chat_routes.py                        # Chat API
├── matchmaking_routes.py                 # Driver-order matching
├── auto_onboarding.py                    # Automated vendor onboarding
├── menu_verification.py                  # Menu verification service
├── menu_importer.py                      # Menu import utilities
├── investor_tracking.py                  # Investor demo features
├── alembic/                              # Database migrations
├── documents/                            # Document templates
├── legal/                                # Legal document storage
├── uploads/                              # File uploads
│   └── vendor_documents/                 # Vendor document uploads
├── tests/                                # Test suite
├── .env                                  # Environment variables
├── .env.example                          # Environment template
├── Dockerfile                            # Container build
└── requirements.txt                      # Python dependencies
```

**Key Files:**
- `main_new.py` - All API endpoints (authentication, orders, vendors, drivers, etc.)
- `models.py` - Database schema (User, Vendor, Driver, Customer, Order, etc.)
- `email_service.py` - Email templates and sending via SES

---

## Microservices (`/services/core/`)

Modular microservices architecture (18 services).

```
services/core/
├── auth-service/           # Customer authentication (Port 8001)
├── driver-service/         # Driver profiles, documents (Port 8003)
├── restaurant-service/     # Restaurant management (Port 8004)
├── order-service/          # Food order lifecycle (Port 8005)
├── ride-service/           # Rideshare requests (Port 8014)
├── notification-service/   # Push, SMS, Email (Port 8009)
├── payment-service/        # Stripe integration (Port 8006)
├── pricing-service/        # Dynamic pricing (Port 8007)
├── location-service/       # Real-time GPS (Port 8008)
├── menu-service/           # Menu management (Port 8010)
├── analytics-service/      # Business analytics (Port 8011)
├── rating-service/         # Reviews and ratings (Port 8012)
├── chat-service/           # Real-time messaging (Port 8013)
├── call-service/           # Privacy-masked calls (Port 8015)
├── negotiation-service/    # Price negotiation (Port 8016)
├── user-service/           # User profiles (Port 8017)
└── ai/                     # AI/ML services
```

Each microservice follows:
```
service-name/
├── main.py                 # FastAPI application
├── models.py               # Service-specific models
├── routes/                 # API route handlers
├── services/               # Business logic
├── tests/                  # Unit tests
├── Dockerfile              # Container definition
└── requirements.txt        # Dependencies
```

---

## Configuration Files

### Environment Configuration
- `/apps/ios/Config/*.xcconfig` - iOS build configurations
- `/apps/web/p2p-platform/backend/.env` - Backend environment variables

### Build Configuration
- `/.github/workflows/` - CI/CD pipelines
- `/apps/ios/fastlane/` - iOS deployment automation
- `/infrastructure/` - Kubernetes, Terraform configs

### Project Configuration
- `/.swiftlint.yml` - Swift linting rules
- `/.semgrep.yml` - Security scanning rules
- `/sonar-project.properties` - SonarQube analysis

---

## Feature Location Map

| Feature | iOS Location | Backend Location |
|---------|--------------|------------------|
| Authentication | `customer/ViewModels/AuthViewModel.swift` | `main_new.py` (customer_login, customer_register) |
| Restaurant List | `customer/ViewModels/HomeViewModel.swift` | `main_new.py` (/api/vendors/published) |
| Menu Display | `customer/ViewModels/MenuViewModel.swift` | `main_new.py` (/api/vendors/{id}/menu) |
| Shopping Cart | `customer/ViewModels/MultiRestaurantCartViewModel.swift` | N/A (client-side only) |
| Checkout | `customer/Views/MultiRestaurantCheckoutView.swift` | `main_new.py` (/api/orders/create) |
| Order Tracking | `customer/ViewModels/OrderTrackingViewModel.swift` | `main_new.py` (/api/orders/{id}/status) |
| Rideshare | `customer/ViewModels/RideRequestViewModel.swift` | `bid_routes.py`, `ride-service/` |
| Driver Delivery | `delivery/ViewModels/DeliveryViewModel.swift` | `main_new.py` (/api/drivers/*) |
| Payments | `shared/Services/P2PAPIService.swift` | `payment-service/`, Stripe |
| Push Notifications | `shared/NotificationManager.swift` | `notification-service/` |
| Chat | `shared/Services/ChatService.swift` | `chat_routes.py`, `chat-service/` |

---

## Data Flow

```
iOS App                    Backend                     External
   │                          │                           │
   ├─► P2PAPIService.swift ──►├─► main_new.py ───────────►├─► PostgreSQL
   │                          │                           │
   ├─► GoogleMapsService ────►├─►                        ─►├─► Google Maps API
   │                          │                           │
   ├─► PaymentService ───────►├─► payment-service ───────►├─► Stripe
   │                          │                           │
   ├─► NotificationManager ──►├─► notification-service ──►├─► Firebase/APNS
   │                          │                           │
   └─► SecureStorage (local)  └─► email_service ─────────►└─► AWS SES
```

---

## Build & Deployment

### iOS Build Commands
```bash
# Open workspace in Xcode
open /Users/jeet/StudioProjects/eatfair-ios/apps/ios/EatFair.xcworkspace

# Fastlane builds
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios
bundle exec fastlane customer_staging    # Customer app to TestFlight
bundle exec fastlane driver_staging      # Driver app to TestFlight
bundle exec fastlane restaurant_staging  # Restaurant app to TestFlight
```

### Backend Commands
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080
```

---

*Last Updated: January 29, 2026*
