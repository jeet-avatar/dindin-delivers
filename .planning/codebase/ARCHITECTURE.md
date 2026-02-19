# Architecture

**Analysis Date:** 2026-02-18

## Pattern Overview

**Overall:** Hybrid Monolith-first with aspirational microservices

**Key Characteristics:**
- Primary backend is a **single FastAPI monolith** (`main_new.py`, 22K lines) handling all business logic, routing, and data access
- Backend is split across several "module" files that are `include_router`-ed into the main app: `order_flow.py`, `bid_routes.py`, `stripe_integration.py`, `rideshare_payments.py`, `chat_routes.py`, `matchmaking_routes.py`, `promotions.py`, etc.
- A parallel **microservices layer** exists in `services/core/` (18 services) but is NOT the active production system — the monolith is what runs in ECS
- **Four client platforms** all talk to the same backend REST API: iOS (3 apps), Android (3 apps), React admin portal, React customer/driver/vendor web portal
- Real-time layer uses **WebSockets** (FastAPI + Redis pub/sub for cross-worker broadcast) and Firebase FCM for push notifications
- **Redis** (AWS ElastiCache) provides rate limiting, session caching, response caching, and WebSocket pub/sub

## Layers

**API Layer (Monolith):**
- Purpose: All HTTP routing, auth enforcement, input validation, business logic orchestration
- Location: `apps/web/p2p-platform/backend/main_new.py`
- Contains: FastAPI route handlers, Pydantic request/response models, middleware (CORS, security headers, admin auth), JWT auth, direct DB access via SQLAlchemy
- Depends on: `database.py`, `models.py`, all sub-routers, `cache.py`, `email_service.py`
- Used by: All four client platforms

**Sub-Routers (Business Domain Modules):**
- Purpose: Domain-specific logic carved out of the monolith into FastAPI `APIRouter` instances
- Locations:
  - `apps/web/p2p-platform/backend/order_flow.py` — food delivery order lifecycle (create → restaurant accept → driver assign → deliver)
  - `apps/web/p2p-platform/backend/bid_routes.py` — rideshare price negotiation (request → bid → counter → match → complete)
  - `apps/web/p2p-platform/backend/stripe_integration.py` — Stripe PaymentIntents + webhooks for food orders
  - `apps/web/p2p-platform/backend/rideshare_payments.py` — Stripe PaymentIntents for rides (tiered $1/$2/$3 fees)
  - `apps/web/p2p-platform/backend/chat_routes.py` — driver/customer in-app chat
  - `apps/web/p2p-platform/backend/matchmaking_routes.py` — Wyoming legal matchmaking model (cash/Venmo fares)
  - `apps/web/p2p-platform/backend/accounting_module.py` — double-entry journal entries, payouts
  - `apps/web/p2p-platform/backend/promotions.py` — promo codes, deals
  - `apps/web/p2p-platform/backend/verification_routes.py` — driver document verification
  - `apps/web/p2p-platform/backend/auto_onboarding.py` — vendor onboarding automation
- Depends on: `database.py`, `models.py`, `websocket_server.py`, `email_service.py`

**Data Layer:**
- Purpose: SQLAlchemy ORM models and database session management
- Location: `apps/web/p2p-platform/backend/models.py` (1848 lines), `apps/web/p2p-platform/backend/models_extended.py`
- Contains: `User`, `Customer`, `Driver`, `Vendor`, `Order`, `RideRequest`, `RideBid`, `Cart`, `CartItem`, `DriverPayout`, `VendorPayout`, `JournalEntry`, `AIEmployee`, `InAppNotification`, `RateLimitEntry`, etc.
- Depends on: PostgreSQL (RDS) via `apps/web/p2p-platform/backend/database.py`
- Note: `database.py` configures SQLAlchemy connection pool: 5+7 connections per worker, 4 workers × 2 ECS tasks = 96 connections (under RDS db.t3.micro limit of 112)

**Cache Layer:**
- Purpose: Redis-backed response caching, distributed rate limiting, WebSocket pub/sub, password reset tokens
- Location: `apps/web/p2p-platform/backend/cache.py`
- Contains: `cache_get`, `cache_set`, `rate_limit_check`, `store_reset_code`, `get_reset_code`
- Depends on: AWS ElastiCache Redis at `dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379`
- Fallback: Gracefully degrades to no-caching if Redis unavailable

**Real-Time Layer:**
- Purpose: WebSocket connection management and event broadcasting
- Location: `apps/web/p2p-platform/backend/websocket_server.py`
- Contains: `ConnectionManager` class managing subscriptions by topic (`customer:{id}`, `driver:{id}`, `restaurant:{id}`, `order:{id}`, `ride:{id}`)
- Uses Redis pub/sub to broadcast across 4 uvicorn workers

**iOS Shared Library:**
- Purpose: Shared code across all 3 iOS apps (models, API client, config, UI components)
- Location: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/`
- Contains:
  - `Services/P2PAPIService.swift` — central HTTP client (~14K lines), handles all REST calls
  - `AppConfig.swift` — singleton configuration (pricing, URLs, feature flags, fee calculations)
  - `Security/SecureStorage.swift` — Keychain token storage
  - `Services/WebSocketManager.swift` — WebSocket connection management
  - `Models/` — shared response models (Order, Driver, Restaurant, Address)
  - `Views/` — shared SwiftUI views (payment breakdown, order confirmation, Google map)
- Package: Swift Package Manager at `apps/ios/eatfair-ios-shared/Package.swift`, depends on Firebase SDK v12+

**Android Shared Module:**
- Purpose: Shared Kotlin code across 3 Android apps
- Location: `apps/android/shared/` (referenced by all 3 Android modules)
- Contains: `AppConfig` (environment-aware URLs), `SecureStorage` (Android Keychain), shared models, Retrofit service interfaces, Hilt DI providers
- Used by: `:app`, `:driver`, `:partner` Gradle modules

**React Admin Portal (Frontend):**
- Purpose: Operations dashboard for admin, customer/vendor/driver management, accounting, rideshare monitoring
- Location: `apps/web/p2p-platform/frontend/src/`
- Contains: React + TypeScript SPA with Vite, React Router for routing, Tailwind CSS
- Entry: `apps/web/p2p-platform/frontend/src/main.tsx` → `App.tsx` (all routes) → `app/screens/` + `app/components/`
- Roles served: Admin, Customer (web portal), Vendor (restaurant portal), Driver (web portal)

**Aspirational Microservices (NOT in production):**
- Location: `services/core/` — 18 separate FastAPI services
- Services: `auth-service` (8001), `driver-service` (8003), `restaurant-service` (8004), `order-service` (8005), `payment-service` (8008), `notification-service` (8009), `ride-service` (8014), plus `analytics-service`, `call-service`, `chat-service`, `location-service`, `menu-service`, `negotiation-service`, `pricing-service`, `rating-service`, `user-service`
- Status: Scaffolded with proper structure (CQRS in `order-service/cqrs/`, Kafka events in `services/shared/events/`) but the monolith is the live system
- Shared code: `services/shared/common/` (errors, logging, metrics, health, tracing)

## Data Flow

**Food Delivery Order Flow:**
1. Customer adds items to cart → `POST /api/cart/add` (main_new.py, SQLAlchemy Cart/CartItem)
2. Customer checkouts → `POST /api/payments/create-order` (stripe_integration.py) → Stripe PaymentIntent created
3. Payment confirmed → Stripe webhook → `POST /api/payments/stripe-webhook` → Order created in DB with `status=placed`
4. Restaurant receives push (FCM) + WebSocket broadcast (`restaurant:{vendor_id}`) + email
5. Restaurant accepts → `POST /api/erp/orders/{id}/restaurant-accept` (order_flow.py) → status=`preparing`
6. Driver sees available order → `GET /api/erp/orders/available-for-delivery` → claims order
7. Driver assigned → `POST /api/erp/orders/{id}/assign-driver` → status=`assigned`, customer notified via WebSocket + FCM
8. Driver picks up → `POST /api/erp/orders/{id}/picked-up` → status=`picked_up`
9. Driver delivers → `POST /api/erp/orders/{id}/delivered` → status=`delivered` → Stripe auto-transfer to driver's Connect account → JournalEntry created
10. Customer receives delivery confirmation email + receipt

**Rideshare Bidding Flow:**
1. Customer creates ride request → `POST /api/rides/request` (bid_routes.py) → RideRequest in DB, broadcast to all drivers via WebSocket
2. Drivers see request → `GET /api/rides/available` → each driver submits bid → `POST /api/rides/bid` → broadcast to customer
3. Customer accepts bid or counter-offers → `POST /api/rides/bid/{id}/respond` → back-and-forth via WebSocket broadcast
4. Match confirmed → RideRequest status=`matched`, customer creates payment intent → `POST /api/payments/ride/create-intent` (rideshare_payments.py)
5. Driver arrives → `POST /api/erp/rides/{id}/arrive`
6. Customer confirms → `POST /api/erp/rides/{id}/start` → status=`in_progress`
7. Ride completes → `POST /api/erp/rides/{id}/complete-and-pay` → Stripe charge + auto-transfer to driver Stripe Connect account
8. Optional tip → `POST /api/payments/ride/tip`, optional rating → `POST /api/erp/rides/{id}/rate`

**State Management:**
- Backend: SQLAlchemy sessions (per-request, no global state), Redis for ephemeral state (rate limits, reset codes, WebSocket pub/sub)
- iOS: `@ObservedObject` / `@StateObject` pattern, `AppConfig.shared` singleton, `P2PAPIService.shared` singleton
- Android: Hilt DI + ViewModels + Repository pattern (MVVM), Room DB for local address caching
- Frontend: React `Context` (`UserContext.tsx`) + component-local state

## Key Abstractions

**RideRequest + RideBid (Bidding Engine):**
- Purpose: Core matching primitive for rideshare — customer posts a request, multiple drivers bid, price negotiation via counter-offers
- Examples: `apps/web/p2p-platform/backend/models.py` (RideRequest, RideBid models), `apps/web/p2p-platform/backend/bid_routes.py` (all bid logic)
- Pattern: State machine — `RideRequestStatus` enum: `open → matched → in_progress → completed / cancelled`
- `BidStatus` enum: `pending → accepted / rejected / withdrawn / counter_offered`

**Order (Food Delivery):**
- Purpose: Food delivery lifecycle entity
- Examples: `apps/web/p2p-platform/backend/models.py` (Order model at line ~400+), `apps/web/p2p-platform/backend/order_flow.py`
- Pattern: State machine — `OrderStatus` enum: `placed → accepted → preparing → ready → picked_up → delivered / cancelled`

**AppConfig (Mobile Shared):**
- Purpose: Centralized singleton for pricing, URLs, feature flags — prevents hardcoded values across all apps
- iOS: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift`
- Android: `apps/android/shared/` (referenced as `AppConfig.apiBaseUrl`)
- Pattern: Singleton, loads from Info.plist/BuildConfig, fetches live overrides from `GET /api/config`

**P2PAPIService (iOS) / DollorApiService (Android):**
- Purpose: Single point of all HTTP calls to backend — no direct URLSession/OkHttp calls in UI code
- iOS: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
- Android: `apps/android/shared/` (Retrofit-based service)
- Pattern: Singleton with Combine/coroutines async, auth token from `SecureStorage`

**AI Employees:**
- Purpose: Named backend "agents" that appear in audit logs and reports (OrderBot Alpha, KitchenBot Beta, DispatchBot Gamma, LedgerBot Delta, QualityBot Epsilon)
- Examples: `apps/web/p2p-platform/backend/models.py` (AIEmployee, AIEmployeeActivity), `apps/web/p2p-platform/backend/order_flow.py` (AI_EMPLOYEES dict)
- Pattern: Metadata tagging — actual logic is regular Python functions, AI employee IDs appear in journal entries and activity logs

## Entry Points

**Backend (Primary):**
- Location: `apps/web/p2p-platform/backend/main_new.py`
- Triggers: `uvicorn main_new:app --workers 4` in ECS Fargate task (via `Dockerfile.optimized`)
- Responsibilities: Creates FastAPI app, registers all middleware, mounts all sub-routers, serves static uploads, runs startup DB migrations

**iOS Customer App:**
- Location: `apps/ios/customer/eatfaircustomer/` (Xcode project)
- Entry: Standard SwiftUI `@main` App struct
- Responsibilities: Customer food ordering + rideshare booking

**iOS Driver App:**
- Location: `apps/ios/delivery/eatffairdelivery/`
- Entry: Standard SwiftUI `@main` App struct
- Responsibilities: Food delivery acceptance + rideshare bidding

**iOS Restaurant App:**
- Location: `apps/ios/restaurant/eatffairrestaurant/`
- Entry: Standard SwiftUI `@main` App struct
- Responsibilities: Menu management + order acceptance + analytics

**Android Customer App:**
- Location: `apps/android/app/src/main/java/com/eatfair/app/`
- Entry: `DollorApp.kt` (Application class), `MainActivity.kt`
- Responsibilities: Same as iOS customer app; uses Jetpack Compose

**Android Driver App:**
- Location: `apps/android/driver/src/main/java/com/eatfair/driver/`
- Entry: `DriverApp.kt`, `MainActivity.kt`

**Android Restaurant App:**
- Location: `apps/android/partner/` (Gradle module `:partner`)

**React Admin/Portal:**
- Location: `apps/web/p2p-platform/frontend/src/main.tsx`
- Entry: Vite + React, `BrowserRouter` wraps `App.tsx`
- Responsibilities: Admin operations, vendor onboarding, rideshare monitoring, accounting, customer/driver management

## Error Handling

**Strategy:** Raise `HTTPException` at the route handler level for client errors; Python exceptions propagate as 500s (FastAPI's default). Email/push notification failures are always silent (try/except swallowed).

**Patterns:**
- Route handlers use `raise HTTPException(status_code=4xx, detail="message")` directly
- `database.py:get_db()` does `db.rollback()` on exception before re-raising
- Redis/cache failures are fully swallowed — app continues without caching
- Firebase FCM failures are logged but never raised
- `bid_routes.py` helper `_notify_customer()` fails silently: `logger.warning(...)` only
- Microservices in `services/core/` use `from common import ErrorResponse` with structured error codes (AUTH001, ORD001, etc.) — not yet used in production monolith

## Cross-Cutting Concerns

**Logging:** Python `logging` module at `INFO` level. `logger = logging.getLogger(__name__)` in each module. No structured logging format in the monolith; microservices use `from common import create_logger`.

**Validation:** Pydantic `BaseModel` on all request bodies. Field validators (`@field_validator`) used for security-sensitive fields (price bounds, quantity limits). XSS prevention via HTML tag stripping on user-facing string fields.

**Authentication:** JWT (HS256, 24h expiry) stored in HTTP `Authorization: Bearer` header. Three separate token namespaces (customer, driver, vendor) stored in Keychain (iOS) / Android Keystore (Android). Admin endpoints protected by additional middleware (`admin_auth_middleware`) that runs before route handlers as defense-in-depth.

**Rate Limiting:** Redis-backed rate limiting via `cache.rate_limit_check()`. Applied to all 4 login endpoints (10 req/min per IP). Distributed across all uvicorn workers via shared Redis.

---

*Architecture analysis: 2026-02-18*
