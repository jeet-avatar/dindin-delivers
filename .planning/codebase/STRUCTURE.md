# Codebase Structure

**Analysis Date:** 2026-02-18

## Directory Layout

```
doordash-p2p/                         # Primary repo (also called eatfair-ios)
├── apps/
│   ├── ios/                          # All iOS apps + shared library
│   │   ├── eatfair-ios-shared/       # Swift Package (shared across all 3 iOS apps)
│   │   ├── customer/                 # Customer iOS app (com.dollorai.customer / Dollor)
│   │   ├── delivery/                 # Driver iOS app (com.dollorai.delivery)
│   │   └── restaurant/               # Restaurant iOS app (com.dollorai.restaurant)
│   ├── android/                      # Android apps (symlinked/mirror of eatfair-android)
│   │   ├── app/                      # Customer Android app (ai.dollor.customer)
│   │   ├── driver/                   # Driver Android app (ai.dollor.driver)
│   │   └── partner/                  # Restaurant Android app (ai.dollor.partner)
│   └── web/p2p-platform/
│       ├── backend/                  # Python FastAPI backend (PRODUCTION — runs in ECS)
│       └── frontend/                 # React + TypeScript admin/web portal
├── services/
│   ├── core/                         # 18 microservices (aspirational, NOT in production)
│   │   ├── auth-service/             # Port 8001 — JWT auth
│   │   ├── driver-service/           # Port 8003 — driver profiles
│   │   ├── restaurant-service/       # Port 8004 — restaurant management
│   │   ├── order-service/            # Port 8005 — CQRS food orders
│   │   ├── payment-service/          # Port 8008 — payments
│   │   ├── notification-service/     # Port 8009 — push/SMS/email
│   │   ├── ride-service/             # Port 8014 — rideshare
│   │   ├── analytics-service/
│   │   ├── call-service/
│   │   ├── chat-service/
│   │   ├── location-service/
│   │   ├── menu-service/
│   │   ├── negotiation-service/
│   │   ├── pricing-service/
│   │   ├── rating-service/
│   │   └── user-service/
│   ├── shared/
│   │   ├── common/                   # Shared Python utilities (errors, logging, health)
│   │   └── events/                   # Kafka event system (producer, consumer, outbox)
│   └── api-gateway/                  # Kong/nginx gateway config (aspirational)
├── infrastructure/
│   ├── ecs/                          # AWS ECS task definitions (PRODUCTION)
│   ├── kubernetes/                   # K8s manifests per service (aspirational)
│   ├── argocd/                       # GitOps ArgoCD apps (dev/staging/production)
│   ├── helm/                         # Helm charts for backend
│   └── terraform/                    # (if present) IaC for AWS resources
├── .claude/
│   ├── docs/                         # Project documentation (GROUND_TRUTH.md etc.)
│   ├── tools/                        # ask-dollor.sh anti-hallucination script
│   └── training/                     # Ollama model training files
├── .planning/
│   ├── codebase/                     # Architecture documents (this directory)
│   ├── quick/                        # Quick-start plans from /gsd:plan-phase
│   ├── qa-reports/                   # Automated QA snapshots
│   └── uat-reports/                  # User acceptance test reports
├── docs/                             # Additional documentation
├── CLAUDE.md                         # AI employee instructions (project-level)
└── .github/workflows/                # CI/CD GitHub Actions
```

## Directory Purposes

**`apps/web/p2p-platform/backend/`:**
- Purpose: The single production Python backend — ALL business logic lives here
- Contains: FastAPI app, all domain route modules, SQLAlchemy models, helper services
- Key files:
  - `main_new.py` — 22K-line monolith; all routing, auth, middleware
  - `models.py` — SQLAlchemy ORM (1848 lines); all DB tables
  - `models_extended.py` — overflow models (promotions, email templates, etc.)
  - `order_flow.py` — food delivery ERP flow (4664 lines)
  - `bid_routes.py` — rideshare bidding (3203 lines)
  - `stripe_integration.py` — Stripe payments + webhooks for food orders
  - `rideshare_payments.py` — Stripe payments for rides
  - `chat_routes.py` — in-app chat between customer/driver
  - `matchmaking_routes.py` — Wyoming legal matchmaking model
  - `accounting_module.py` — double-entry bookkeeping
  - `websocket_server.py` — WebSocket connection manager + Redis pub/sub
  - `cache.py` — Redis client with graceful fallback
  - `database.py` — SQLAlchemy engine + session factory
  - `email_service.py` — transactional email sending
  - `pricing_config.py` — fare calculation engine
  - `state_config.py` — per-state operating rules
  - `google_maps_service.py` — ETA and distance calculations
  - `s3_service.py` — AWS S3 file uploads (driver documents)
  - `Dockerfile.optimized` — production Docker image (MUST use `--target production`)

**`apps/web/p2p-platform/frontend/src/`:**
- Purpose: React SPA serving admin, customer web portal, vendor portal, driver portal
- Contains: Route definitions in `App.tsx`, screens in `app/screens/`, components in `app/components/`, global context in `app/context/`
- Key files:
  - `main.tsx` — entry point, BrowserRouter + UserProvider
  - `App.tsx` — all route definitions by role
  - `app/screens/` — all page components organized by role/domain
  - `app/components/layout/` — `MainLayout.tsx` (admin), `VendorLayout.tsx`, `DriverLayout.tsx`, `CustomerLayout.tsx`
  - `app/context/UserContext.tsx` — global auth state
  - `app/constants/Apis.tsx` — API base URL and endpoint constants

**`apps/ios/eatfair-ios-shared/Sources/EatFairShared/`:**
- Purpose: Swift Package shared across all 3 iOS apps
- Contains:
  - `Services/P2PAPIService.swift` — complete HTTP client (~14K lines)
  - `AppConfig.swift` — pricing/URL singleton
  - `Security/SecureStorage.swift` — Keychain wrapper
  - `Security/NetworkSecurity.swift` — SSL pinning, cert validation
  - `Services/WebSocketManager.swift` — WebSocket client
  - `Services/ChatService.swift` — in-app chat
  - `Services/NegotiationService.swift` — rideshare price negotiation
  - `Models/` — response models (Order, Driver, Restaurant, Address, EnhancedModels)
  - `Views/` — shared SwiftUI views
  - `Utilities/` — Calculators, DateTimeFormatter, EmailValidator
  - `Config/GoogleMapsConfig.swift` — Google Maps API key config

**`apps/ios/customer/eatfaircustomer/`:**
- Purpose: Customer iOS app source
- Contains: SwiftUI Views in `Views/`, Models in `Models/`, Services in `Services/`
- Key files: `Views/WelcomeView.swift`, `Views/SearchRestaurantsView.swift`, `Views/MenuItemCustomizationView.swift`

**`apps/ios/delivery/eatffairdelivery/`:**
- Purpose: Driver iOS app source
- Contains: SwiftUI Views including rideshare-specific: `Views/Rideshare/MyBidsView.swift`, `Views/ChatView.swift`

**`apps/ios/restaurant/eatffairrestaurant/`:**
- Purpose: Restaurant iOS app source
- Contains: `Views/AIEmployeesView.swift` (AI insights dashboard)

**`apps/android/app/src/main/java/com/eatfair/app/`:**
- Purpose: Android customer app (Kotlin + Jetpack Compose + Hilt)
- Contains:
  - `ui/` — Compose screens organized by feature (auth, home, cart, checkout, order, rideshare, chat, etc.)
  - `data/` — API service clients (`CustomerRideshareApiService.kt`, `AppDatabase.kt`)
  - `di/` — Hilt DI modules (`AppModule.kt`, `RepoModule.kt`)
  - `notifications/` — Firebase Messaging service
  - `constants/` — `Constants.kt` (PricingConfig, AppConstants)
  - `MainActivity.kt` — Compose entry point

**`apps/android/driver/`:**
- Purpose: Android driver app
- Contains: `ui/` screens for home, orders, earnings, auth; `DriverNavGraph.kt`

**`apps/android/partner/`:**
- Purpose: Android restaurant app
- Contains: Restaurant-specific Compose screens

**`services/core/`:**
- Purpose: Scaffolded microservices architecture (not production)
- Contains: 18 separate FastAPI apps, each with their own `main.py`, `models.py`, `tests/`
- Note: `order-service/` has full CQRS pattern with `cqrs/commands.py`, `cqrs/queries.py`, `cqrs/projections.py`
- Generated: No. Committed: Yes.

**`services/shared/`:**
- Purpose: Shared Python utilities for microservices
- Contains: `common/` (MicroserviceFactory, error codes, logging), `events/` (Kafka producer/consumer/outbox)
- Used by: All services in `services/core/` via `sys.path.insert`

## Key File Locations

**Entry Points:**
- `apps/web/p2p-platform/backend/main_new.py` — Backend FastAPI app creation + all route registration
- `apps/web/p2p-platform/frontend/src/main.tsx` — React SPA entry
- `apps/ios/eatfair-ios-shared/Package.swift` — iOS shared library package definition
- `apps/android/app/src/main/java/com/eatfair/app/DollorApp.kt` — Android customer app Application class
- `apps/android/driver/src/main/java/com/eatfair/driver/DriverApp.kt` — Android driver Application class

**Configuration:**
- `apps/web/p2p-platform/backend/.env` — Backend environment variables (DATABASE_URL, JWT secrets, Stripe keys)
- `apps/ios/Config/` — xcconfig files for iOS build environments (Development/Staging/Production)
- `apps/android/app/src/staging/` + `apps/android/app/src/production/` — Android build variant configs
- `apps/web/p2p-platform/frontend/vite.config.ts` — Vite build config

**Core Logic:**
- `apps/web/p2p-platform/backend/models.py` — All SQLAlchemy ORM models
- `apps/web/p2p-platform/backend/order_flow.py` — Food delivery business logic + ERP routes
- `apps/web/p2p-platform/backend/bid_routes.py` — Rideshare bidding engine
- `apps/web/p2p-platform/backend/rideshare_payments.py` — Tiered payment logic (`get_tier_fee()`)
- `apps/web/p2p-platform/backend/pricing_config.py` — Fare calculation engine
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` — iOS pricing + URL config
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` — iOS API client

**Testing:**
- `apps/web/p2p-platform/backend/tests/` — Pytest test suite
- `apps/web/p2p-platform/backend/qa_regression_tests.py` — Full regression suite
- `apps/ios/customer/eatfaircustomerTests/CustomerAppStagingAPITests.swift` — iOS staging API tests
- `apps/android/app/src/test/` + `apps/android/app/src/androidTest/` — Android unit + instrumented tests

## Naming Conventions

**Backend Python Files:**
- `snake_case.py` for all modules: `order_flow.py`, `bid_routes.py`, `rideshare_payments.py`
- Route files end in `_routes.py` or are named by domain: `chat_routes.py`, `bid_routes.py`, `verification_routes.py`
- Service files end in `_service.py`: `email_service.py`, `google_maps_service.py`, `s3_service.py`

**Backend Endpoints:**
- Customer API: `/api/customer/*` or `/api/customers/*`
- Vendor API: `/api/vendors/*`
- Driver API: `/api/erp/drivers/*` or `/api/erp/orders/driver/*`
- Order flow: `/api/erp/orders/*`
- Rideshare: `/api/rides/*`
- Payments: `/api/payments/*`
- Admin: `/api/admin/*`
- Matchmaking (Wyoming): `/api/matchmaking/*`

**iOS Swift Files:**
- `PascalCase.swift` for all Swift files
- Views end in `View.swift`: `SearchRestaurantsView.swift`, `GoogleMapView.swift`
- Services end in `Service.swift`: `P2PAPIService.swift`, `ChatService.swift`
- Models named after entity: `Order.swift`, `Driver.swift`, `Restaurant.swift`

**Android Kotlin Files:**
- `PascalCase.kt` for all Kotlin files
- Screens end in `Screen.kt`: `HomeScreen.kt`, `CartScreen.kt`, `RideRequestScreen.kt`
- ViewModels end in `ViewModel.kt`: `HomeViewModel.kt`, `CartViewModel.kt`
- DI modules end in `Module.kt`: `AppModule.kt`, `RepoModule.kt`

**React/TypeScript Files:**
- Screens/components: `PascalCase.tsx`
- Organized by role: `screens/admin/`, `screens/customer/`, `screens/vendor/`, `screens/driver/`, `screens/public/`

## Where to Add New Code

**New Backend API Endpoint:**
- If food-delivery related: Add to `apps/web/p2p-platform/backend/order_flow.py` (under the `router = APIRouter(prefix="/api/erp")` router)
- If rideshare related: Add to `apps/web/p2p-platform/backend/bid_routes.py`
- If payment related: Add to `apps/web/p2p-platform/backend/stripe_integration.py` or `rideshare_payments.py`
- If general (auth, profile, admin): Add to `apps/web/p2p-platform/backend/main_new.py` near related endpoints
- New standalone domain: Create `{domain}_routes.py`, define `router = APIRouter(prefix="/api/{domain}")`, add `app.include_router(router)` at the bottom of `main_new.py` (near line 14750+)

**New DB Table:**
- Add SQLAlchemy model to `apps/web/p2p-platform/backend/models.py` (or `models_extended.py` for auxiliary models)
- Add `CREATE INDEX IF NOT EXISTS` in `_run_startup_migrations()` in `main_new.py` if needed
- SQLAlchemy creates tables on startup via `Base.metadata.create_all(bind=engine, checkfirst=True)`

**New iOS Feature:**
- Shared API method: Add to `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
- Shared model: Add to `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/`
- App-specific view: Add to appropriate app's `Views/` directory

**New Android Screen:**
- Customer: `apps/android/app/src/main/java/com/eatfair/app/ui/{feature}/`
- Driver: `apps/android/driver/src/main/java/com/eatfair/driver/ui/{feature}/`
- Restaurant: `apps/android/partner/` equivalent
- Shared API call: Add to shared module's API service (`CustomerRideshareApiService.kt` pattern, or shared Retrofit service)

**New React Admin Screen:**
- Page component: `apps/web/p2p-platform/frontend/src/app/screens/{role}/`
- Route: Register in `apps/web/p2p-platform/frontend/src/App.tsx`
- Reusable component: `apps/web/p2p-platform/frontend/src/app/components/`

**New Test:**
- Backend: Add pytest test in `apps/web/p2p-platform/backend/tests/`
- iOS: Add to `eatfaircustomerTests/` (or equivalent for delivery/restaurant app)
- Android: Add to `app/src/test/` (unit) or `app/src/androidTest/` (instrumented)

## Special Directories

**`apps/web/p2p-platform/backend/uploads/`:**
- Purpose: Stores uploaded vendor documents (insurance, licenses, menus)
- Generated: Yes (at runtime via `os.makedirs`)
- Committed: No (git-ignored). Served via `app.mount("/uploads", StaticFiles(...))`.

**`apps/web/p2p-platform/backend/migrations/`:**
- Purpose: Alembic migration scripts
- Generated: Via `alembic revision`
- Committed: Yes

**`apps/web/p2p-platform/frontend/dist/`:**
- Purpose: Vite build output
- Generated: Yes (`npm run build`)
- Committed: No

**`.planning/`:**
- Purpose: GSD workflow plans, QA reports, architecture docs
- Generated: Partially (QA reports auto-generated, plans written by Claude)
- Committed: Yes

**`.claude/training/`:**
- Purpose: JSONL training data for Ollama `dollor-customer` model (anti-hallucination)
- Generated: Manually maintained
- Committed: Yes

**`apps/ios/eatfair-ios-shared/.build/`:**
- Purpose: Swift Package Manager build artifacts
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-02-18*
