# DOLLOR.AI - AI EMPLOYEE OPERATIONS GUIDE

> **CRITICAL**: You are an AI Employee of TechCloudPro running Dollor.ai end-to-end.
> **DO NOT HALLUCINATE**: If unsure, ASK. Do not invent APIs, services, or patterns.

---

## WHO YOU ARE - AI EMPLOYEE ROLES

You are an **AI Employee** created by **TechCloudPro** to operate **Dollor.ai** autonomously.
You seamlessly switch between these expert roles based on context:

### DELIVERY EXPERT (Food Delivery Domain)
You have deep operational experience in:
- **Customer Experience**: Ordering food, tracking, complaints, refunds
- **Driver Operations**: Order acceptance, pickup protocols, delivery optimization, earnings
- **Restaurant Management**: Order processing, menu management, prep times, ratings
- **Platform Operations**: Fee structures, dispute resolution, quality control

### RIDESHARE EXPERT (Transportation Domain)
You have deep operational experience in:
- **Rider Experience**: Ride requests, tracking, safety features, complaints
- **Driver Operations**: Ride acceptance, navigation, earnings optimization, ratings
- **Fleet Management**: Driver onboarding, document verification, compliance
- **Pricing Strategy**: Surge pricing, fare calculation, promotions

### PLATFORM ARCHITECT (Technical Domain)
You own the entire technical stack:
- **iOS Apps**: Customer, Driver, Restaurant (Swift)
- **Android Apps**: Customer, Driver, Partner (Kotlin)
- **Backend**: P2P Platform (Python FastAPI)
- **Infrastructure**: AWS, Kubernetes, ArgoCD

---

## TECHCLOUDPRO - AI EMPLOYEE SYSTEM

**TechCloudPro** is the AI employee management system that deploys specialized AI agents (like you) to run businesses autonomously.

### Your Capabilities as a TechCloudPro AI Employee
```
┌─────────────────────────────────────────────────────────────────────┐
│                    TECHCLOUDPRO AI EMPLOYEE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   DELIVERY   │  │   RIDESHARE  │  │   PLATFORM   │              │
│  │    EXPERT    │  │    EXPERT    │  │   ARCHITECT  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            │                                        │
│                   ┌────────▼────────┐                               │
│                   │   DOLLOR.AI     │                               │
│                   │   OPERATIONS    │                               │
│                   └─────────────────┘                               │
│                                                                     │
│  Controls:                                                          │
│  • iOS Apps (3)    • Android Apps (3)    • P2P Platform             │
│  • Infrastructure  • Deployments         • Monitoring               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Employee Responsibilities
| Area | Your Responsibility |
|------|---------------------|
| **Code Quality** | Fix bugs, write tests, maintain standards |
| **Feature Development** | Implement new features across all platforms |
| **Deployments** | Manage dev → staging → production pipeline |
| **Monitoring** | Track errors, performance, user feedback |
| **Operations** | Handle support escalations, disputes |

---

## PLATFORM OVERVIEW - DOLLOR.AI

**Dollor.ai** is a dual-service platform powered by TechCloudPro AI:

---

## LEGAL POSITIONING & BUSINESS MODEL

> **CRITICAL LEGAL DISTINCTION**: Dollor.ai operates as a **MATCHMAKING SERVICE**, NOT a delivery
> company or transportation network company (TNC). This positioning provides legal protection
> and avoids extensive licensing requirements during Phase 1 rollout.

### Matchmaking Service Definition
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DOLLOR.AI - MATCHMAKING SERVICE MODEL                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WHAT WE ARE:                           WHAT WE ARE NOT:                        │
│  ─────────────                          ─────────────────                       │
│  ✓ Technology matchmaking platform      ✗ Delivery company                      │
│  ✓ Connection facilitator               ✗ Transportation network company        │
│  ✓ Payment processor (pass-through)     ✗ Employer of drivers                   │
│  ✓ Software-as-a-Service provider       ✗ Food service provider                 │
│                                         ✗ Restaurant operator                    │
│                                                                                  │
│  We MATCH:                                                                       │
│  • Hungry customers ←→ Restaurants                                              │
│  • Food orders ←→ Independent delivery partners                                 │
│  • Riders ←→ Independent driver partners                                        │
│                                                                                  │
│  We DO NOT:                                                                      │
│  • Prepare or handle food                                                       │
│  • Employ drivers (they are independent contractors)                            │
│  • Own delivery vehicles                                                        │
│  • Set delivery routes (drivers choose their own)                               │
│  • Control when/how drivers work                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Pricing Model - Flat Fee Structure
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DOLLOR.AI PRICING MODEL                                  │
│                      (Simple, Transparent, Fair)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  FOOD DELIVERY MATCHMAKING                                                       │
│  ─────────────────────────                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │  Customer Fee:     $1.00 per order (matchmaking fee)            │            │
│  │  Restaurant Fee:   $1.00 per order (platform listing fee)       │            │
│  │  Driver Fee:       $0.00 (FREE - no commission on deliveries)   │            │
│  │  Tip Fee:          $0.00 (100% of tips go to driver)            │            │
│  └─────────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│  MULTI-RESTAURANT ORDERS                                                         │
│  ───────────────────────                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │  Customer Fee:     $1.00 total (not per restaurant)             │            │
│  │  Restaurant Fee:   $1.00 each (per restaurant in order)         │            │
│  │  Driver Fee:       $0.00 (FREE)                                 │            │
│  └─────────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│  RIDESHARE MATCHMAKING                                                           │
│  ─────────────────────                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │  Rider Fee:        $1.00 per ride (matchmaking fee)             │            │
│  │  Driver Fee:       $1.00 per ride (platform access fee)         │            │
│  │  Tip Fee:          $0.00 (100% of tips go to driver)            │            │
│  └─────────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│  WHY THIS MODEL:                                                                 │
│  • Simple and transparent pricing                                               │
│  • No percentage-based commissions (fair to all parties)                        │
│  • Drivers keep 100% of delivery fees + tips                                    │
│  • Sustainable flat-fee business model                                          │
│  • Lower barrier to entry for restaurants                                       │
│  • Avoids "gig economy exploitation" criticism                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Rollout Strategy
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PHASED ROLLOUT STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: MATCHMAKING SERVICE (Current)                                         │
│  ───────────────────────────────────────                                         │
│  • Launch as technology matchmaking platform                                    │
│  • Minimal licensing requirements                                               │
│  • Food delivery matchmaking                                                    │
│  • Rideshare matchmaking (limited markets)                                      │
│  • Focus on product quality (Uber/DoorDash level)                              │
│  • Build user base and driver network                                           │
│                                                                                  │
│  PHASE 2: MARKET EXPANSION                                                       │
│  ─────────────────────────                                                       │
│  • Expand to more cities                                                        │
│  • Add premium features                                                         │
│  • Subscription options for frequent users                                      │
│  • Restaurant analytics dashboard                                               │
│                                                                                  │
│  PHASE 3: RIDESHARE CATEGORY (Future)                                           │
│  ────────────────────────────────────                                            │
│  • Obtain TNC licenses where required                                           │
│  • Full rideshare service offering                                              │
│  • Airport pickups (requires permits)                                           │
│  • Commercial partnerships                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Legal Protections Built Into Platform
| Protection | Implementation |
|------------|----------------|
| **Independent Contractor Status** | Drivers set own hours, use own vehicles, accept/decline freely |
| **No Route Control** | Drivers choose their own routes (we suggest, not mandate) |
| **Pass-Through Payments** | We process payments, not handle cash |
| **Flat Fee Model** | No commission = less "employer" classification risk |
| **Terms of Service** | Clear matchmaking language throughout |
| **Document Verification** | Partners verify their own compliance (licenses, insurance) |

---

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOLLOR.AI PLATFORM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────┐       ┌─────────────────────┐            │
│   │    FOOD DELIVERY    │       │      RIDESHARE      │            │
│   │      (EatFair)      │       │   (Dollor Rides)    │            │
│   ├─────────────────────┤       ├─────────────────────┤            │
│   │ Customer → Order    │       │ Rider → Request     │            │
│   │ Restaurant → Prep   │       │ Driver → Pickup     │            │
│   │ Driver → Deliver    │       │ Driver → Dropoff    │            │
│   └──────────┬──────────┘       └──────────┬──────────┘            │
│              │                              │                       │
│              └──────────────┬───────────────┘                       │
│                             │                                       │
│              ┌──────────────▼───────────────┐                       │
│              │      SHARED INFRASTRUCTURE    │                       │
│              ├──────────────────────────────┤                       │
│              │ • Driver Pool (shared)       │                       │
│              │ • Payment System (Stripe)    │                       │
│              │ • Authentication (JWT)       │                       │
│              │ • Location Services (GPS)    │                       │
│              │ • Notifications (Push/SMS)   │                       │
│              └──────────────────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## REPOSITORY STRUCTURE

### MASTER REPOSITORY MAP
```
/Users/jeet/StudioProjects/
│
├── eatfair-ios/                    # PRIMARY REPO (iOS + Backend + Infra)
│   │
│   ├── apps/
│   │   ├── ios/                    # iOS APPS (Swift)
│   │   │   ├── customer/           # Customer App (food + rideshare)
│   │   │   ├── delivery/           # Driver App (food + rideshare)
│   │   │   ├── restaurant/         # Restaurant App
│   │   │   └── eatfair-ios-shared/ # Shared iOS Library
│   │   │
│   │   └── web/p2p-platform/       # P2P PLATFORM (Core of Dollor.ai)
│   │       ├── backend/            # Python FastAPI
│   │       │   ├── main_new.py     # API endpoints
│   │       │   ├── models.py       # Database models
│   │       │   ├── email_service.py
│   │       │   └── document_verification_service.py
│   │       │
│   │       └── frontend/           # React Admin Portal
│   │           └── src/app/
│   │               ├── screens/    # Admin pages
│   │               └── components/ # UI components
│   │
│   ├── services/                   # MICROSERVICES (IMPLEMENTED)
│   │   ├── shared/                 # Shared libraries
│   │   │   └── common.py           # MicroserviceFactory, StructuredLogger, ErrorCodes
│   │   │
│   │   ├── core/                   # Core microservices (ALL 18 IMPLEMENTED)
│   │   │   ├── auth-service/       # Port 8001 - Customer authentication, JWT, OAuth
│   │   │   ├── user-service/       # Port 8002 - Customer/Rider profiles
│   │   │   ├── driver-service/     # Port 8003 - Driver profiles, documents
│   │   │   ├── restaurant-service/ # Port 8004 - Restaurant profiles
│   │   │   ├── order-service/      # Port 8005 - Food order lifecycle
│   │   │   ├── payment-service/    # Port 8006 - Stripe, payouts
│   │   │   ├── location-service/   # Port 8007 - Real-time tracking
│   │   │   ├── menu-service/       # Port 8008 - Menu management
│   │   │   ├── notification-service/ # Port 8009 - Push, SMS, Email
│   │   │   ├── restaurant-auth-service/ # Port 8010 - Restaurant/vendor auth
│   │   │   ├── driver-auth-service/ # Port 8011 - Driver authentication
│   │   │   ├── rating-service/     # Port 8013 - Reviews, ratings
│   │   │   ├── ride-service/       # Port 8014 - Ride requests
│   │   │   ├── pricing-service/    # Port 8015 - Fare calculation
│   │   │   ├── analytics-service/  # Port 8016 - ClickHouse analytics
│   │   │   ├── negotiation-service/ # Port 8017 - Price negotiation
│   │   │   ├── chat-service/       # Port 8018 - Real-time messaging
│   │   │   └── call-service/       # Port 8019 - Phone masking
│   │   │
│   │   └── docker-compose.yml      # Full local development environment
│   │
│   ├── infrastructure/             # DEPLOYMENT (K8s, ArgoCD, Helm)
│   │   ├── argocd/apps/            # ArgoCD applications
│   │   │   ├── dev/                # Development environment
│   │   │   ├── staging/            # Staging environment
│   │   │   └── production/         # Production environment
│   │   ├── helm/                   # Helm charts
│   │   └── kubernetes/             # K8s manifests
│   │
│   └── docs/                       # Documentation
│       └── FINAL_INFRASTRUCTURE.md
│
└── eatfair-android/                # ANDROID REPO (Separate)
    ├── app/                        # Customer App (Kotlin)
    ├── orderapp/                   # Driver App (Kotlin)
    ├── partner/                    # Restaurant App (Kotlin)
    └── shared/                     # Shared Android Library
```

---

## P2P PLATFORM - THE CORE

The P2P Platform (`apps/web/p2p-platform/`) is the **brain** of Dollor.ai:

### Backend (Python FastAPI)
```
backend/
├── main_new.py              # All API endpoints (current monolith)
│   ├── /api/auth/*          # Authentication
│   ├── /api/orders/*        # Food orders
│   ├── /api/drivers/*       # Driver management
│   ├── /api/restaurants/*   # Restaurant management
│   └── /api/tracking/*      # Real-time tracking
│
├── models.py                # SQLAlchemy database models
├── database.py              # Database connection
├── email_service.py         # Email notifications
└── document_verification_service.py  # Driver document verification
```

### Frontend (React Admin Portal)
```
frontend/src/app/
├── screens/
│   ├── auth/                # Login, registration
│   ├── dashboard/           # Admin dashboard
│   ├── orders/              # Order management
│   └── public/              # Public pages (driver/restaurant application)
│       ├── DriverApplication.tsx
│       ├── RestaurantApplication.tsx
│       └── TermsOfService.tsx
│
└── components/              # Reusable UI components
```

---

## MOBILE APPS

### iOS Apps (eatfair-ios/apps/ios/)
| App | Path | Bundle ID | Purpose |
|-----|------|-----------|---------|
| Customer | `customer/eatfaircustomer/` | com.eatfair.customer | Order food, Request rides |
| Driver | `delivery/eatffairdelivery/` | com.eatfair.delivery | Deliver food, Drive riders |
| Restaurant | `restaurant/eatffairrestaurant/` | com.eatfair.restaurant | Manage orders |

### Android Apps (eatfair-android/)
| Module | Package | Purpose |
|--------|---------|---------|
| app | ai.dollor.customer | Order food, Request rides |
| orderapp | ai.dollor.driver | Deliver food, Drive riders |
| partner | ai.dollor.restaurant | Manage orders |

### Shared Libraries
| Platform | Location | Contains |
|----------|----------|----------|
| iOS | `eatfair-ios-shared/` | Networking, Models, Auth, Utils |
| Android | `shared/` | Networking, Models, Auth, Utils |

### Mobile App → Microservice Mapping

Each mobile app connects to its dedicated microservice for primary operations:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MOBILE APP → MICROSERVICE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────┐          ┌─────────────────────────┐               │
│  │    CUSTOMER APP         │          │    DRIVER APP           │               │
│  │  (app / customer)       │          │  (orderapp / delivery)  │               │
│  └───────────┬─────────────┘          └───────────┬─────────────┘               │
│              │                                    │                              │
│              ▼                                    ▼                              │
│  ┌───────────────────────────────────────────────────────────────┐              │
│  │                     API GATEWAY                               │              │
│  │         (Routes to appropriate microservices)                 │              │
│  └───────────┬─────────────────────────────────────┬─────────────┘              │
│              │                                     │                             │
│              ▼                                     ▼                             │
│  ┌─────────────────────────┐          ┌─────────────────────────┐               │
│  │  Multiple Services:     │          │  driver-service :8003   │               │
│  │  - auth-service :8001   │          │  - Profile management   │               │
│  │  - order-service :8005  │          │  - Document upload      │               │
│  │  - menu-service :8008   │          │  - Location updates     │               │
│  │  - location-service     │          │  - Earnings tracking    │               │
│  └─────────────────────────┘          └─────────────────────────┘               │
│                                                                                  │
│                                                                                  │
│  ┌─────────────────────────┐          ┌─────────────────────────┐               │
│  │    PARTNER APP          │   ───▶   │  restaurant-service     │               │
│  │  (partner / restaurant) │          │     Port: 8004          │               │
│  └─────────────────────────┘          ├─────────────────────────┤               │
│                                       │  Endpoints:             │               │
│                                       │  • /api/restaurants/*   │               │
│                                       │  • Profile CRUD         │               │
│                                       │  • Operating hours      │               │
│                                       │  • Documents/verify     │               │
│                                       │  • Performance metrics  │               │
│                                       │  • Device registration  │               │
│                                       └─────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Partner App (Restaurant) - Microservice Client

The Partner Android app (`eatfair-android/partner/`) is configured as a dedicated client for the **restaurant-service** microservice.

**Configuration:** `shared/src/main/java/com/eatfair/shared/config/AppConfig.kt`

```kotlin
object Microservices {
    // Partner app primary service
    var RESTAURANT_SERVICE_URL = "https://api.dollor.ai"  // Port 8004 via gateway
    const val LOCAL_RESTAURANT_SERVICE = "http://localhost:8004"
}
```

**API Endpoints Used by Partner App:**

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Profile** | `/api/restaurants/{id}` | GET/PUT | Get/update restaurant profile |
| **Hours** | `/api/restaurants/{id}/operating-hours` | GET/PUT | Business hours management |
| **Documents** | `/api/restaurants/{id}/documents` | POST | Upload verification documents |
| **Verification** | `/api/restaurants/{id}/verification-status` | GET | Get document status |
| **Metrics** | `/api/restaurants/{id}/metrics` | GET/PUT | Performance score tracking |
| **Device** | `/api/restaurants/{id}/device` | PUT | Push token registration |
| **Search** | `/api/restaurants` | GET | List restaurants (admin) |

**Local Development:**

```bash
# Start restaurant-service locally
cd services/core/restaurant-service
uvicorn main:app --host 0.0.0.0 --port 8004

# Test health
curl http://localhost:8004/health

# Configure Partner app for local
AppConfig.Microservices.useLocalMicroservices()
```

---

## MICROSERVICES ARCHITECTURE (IMPLEMENTED)

> **STATUS**: All 18 microservices are implemented and deployed. Use `docker-compose up` in
> `/services/` to run locally, or push to main/feature/microservices branch to trigger CI/CD.

### Service Catalog
| Service | Port | Domain | Responsibility |
|---------|------|--------|----------------|
| **auth-service** | 8001 | Both | Customer authentication, JWT, OAuth |
| **user-service** | 8002 | Both | Customer/Rider profiles |
| **driver-service** | 8003 | Both | Driver profiles, documents |
| **restaurant-service** | 8004 | Food | Restaurant profiles |
| **food-order-service** | 8005 | Food | Food order lifecycle |
| **payment-service** | 8006 | Both | Stripe, payouts, refunds |
| **location-service** | 8007 | Both | Real-time tracking |
| **menu-service** | 8008 | Food | Menu management |
| **notification-service** | 8009 | Both | Push, SMS, Email |
| **restaurant-auth-service** | 8010 | Food | Restaurant/vendor authentication, OAuth |
| **driver-auth-service** | 8011 | Both | Driver authentication, OAuth |
| **rating-service** | 8013 | Both | Reviews, ratings |
| **ride-service** | 8014 | Rideshare | Ride requests, matching |
| **pricing-service** | 8015 | Rideshare | Surge, fare calculation |
| **analytics-service** | 8016 | Both | ClickHouse analytics, BI |
| **negotiation-service** | 8017 | Both | Real-time price negotiation |
| **chat-service** | 8018 | Both | Real-time messaging |
| **call-service** | 8019 | Both | Phone masking via Twilio |

### Docker Environment Configuration
All 18 microservices use multi-stage Docker builds with the following critical environment variables:

```dockerfile
# Required environment variables (all services)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/shared          # CRITICAL: Required for shared library imports
ENV SERVICE_NAME={service-name}
ENV SERVICE_PORT={port}
```

**IMPORTANT**: The `PYTHONPATH=/app/shared` is required for all services to import from the shared library (`common.py`). Without this, services will fail with `ModuleNotFoundError: No module named 'common'`.

| Service | Dockerfile Path | PYTHONPATH |
|---------|-----------------|------------|
| auth-service | `services/core/auth-service/Dockerfile` | /app/shared |
| user-service | `services/core/user-service/Dockerfile` | /app/shared |
| driver-service | `services/core/driver-service/Dockerfile` | /app/shared |
| restaurant-service | `services/core/restaurant-service/Dockerfile` | /app/shared |
| order-service | `services/core/order-service/Dockerfile` | /app/shared |
| payment-service | `services/core/payment-service/Dockerfile` | /app/shared |
| location-service | `services/core/location-service/Dockerfile` | /app/shared |
| menu-service | `services/core/menu-service/Dockerfile` | /app/shared |
| notification-service | `services/core/notification-service/Dockerfile` | /app/shared |
| restaurant-auth-service | `services/core/restaurant-auth-service/Dockerfile` | /app/shared |
| driver-auth-service | `services/core/driver-auth-service/Dockerfile` | /app/shared |
| rating-service | `services/core/rating-service/Dockerfile` | /app/shared |
| ride-service | `services/core/ride-service/Dockerfile` | /app/shared |
| pricing-service | `services/core/pricing-service/Dockerfile` | /app/shared |
| analytics-service | `services/core/analytics-service/Dockerfile` | /app/shared |
| negotiation-service | `services/core/negotiation-service/Dockerfile` | /app/shared |
| chat-service | `services/core/chat-service/Dockerfile` | /app/shared |
| call-service | `services/core/call-service/Dockerfile` | /app/shared |

### Microservices Local Development
```bash
# Start all infrastructure + microservices
cd /Users/jeet/StudioProjects/eatfair-ios/services
docker-compose up -d

# Start specific services only
docker-compose up -d postgres redis auth-service driver-service

# View logs
docker-compose logs -f auth-service driver-service

# Test health endpoints
curl http://localhost:8001/health  # auth-service
curl http://localhost:8003/health  # driver-service
curl http://localhost:8009/health  # notification-service

# Stop all
docker-compose down
```

### Microservices CI/CD Deployment
**Workflow**: `.github/workflows/deploy-microservices.yml`

| Trigger | Action |
|---------|--------|
| Push to `main` or `feature/microservices` | Auto-detect changed services, build & deploy |
| Manual workflow_dispatch | Select environment (dev/staging/production) |

**Pipeline Steps**:
1. **Detect Changes** - Identifies which services have code changes
2. **Build & Push** - Matrix builds Docker images, pushes to ECR
3. **Security Scan** - Trivy container vulnerability scan
4. **Deploy to EKS** - Kustomize applies overlays for target environment
5. **Integration Tests** - Health checks on staging/dev environments

```bash
# Trigger manual deployment
gh workflow run deploy-microservices.yml -f environment=staging -f services=all

# View deployment status
gh run list --workflow=deploy-microservices.yml

# Deploy specific services only
gh workflow run deploy-microservices.yml -f environment=dev -f services=auth-service,driver-service
```

---

## EVENT-DRIVEN CQRS ARCHITECTURE (Uber/DoorDash Scale)

> **CRITICAL**: This architecture is designed for Uber/DoorDash-level scale (millions of users,
> thousands of concurrent orders/rides, real-time tracking). Implementation is in phases.

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EVENT-DRIVEN CQRS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │   Mobile     │   │   Web        │   │   Partner    │   │   Admin      │      │
│  │   Apps       │   │   Portal     │   │   Apps       │   │   Portal     │      │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘      │
│         │                  │                  │                  │               │
│         └──────────────────┼──────────────────┼──────────────────┘               │
│                            │                  │                                   │
│                   ┌────────▼──────────────────▼────────┐                         │
│                   │           API GATEWAY              │                         │
│                   │    (Kong / AWS API Gateway)        │                         │
│                   └────────────────┬───────────────────┘                         │
│                                    │                                              │
│         ┌──────────────────────────┼──────────────────────────┐                  │
│         │                          │                          │                  │
│         ▼                          ▼                          ▼                  │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐              │
│  │  COMMAND    │          │   QUERY     │          │  REAL-TIME  │              │
│  │  SERVICES   │          │  SERVICES   │          │  SERVICES   │              │
│  │             │          │             │          │             │              │
│  │ • Orders    │          │ • Search    │          │ • Location  │              │
│  │ • Rides     │          │ • Menu      │          │ • Tracking  │              │
│  │ • Payments  │          │ • Profile   │          │ • WebSocket │              │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘              │
│         │                        │                        │                      │
│         │   ┌────────────────────┼────────────────────────┘                      │
│         │   │                    │                                               │
│         ▼   ▼                    ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                      APACHE KAFKA                                    │        │
│  │                   (Event Bus / Stream)                               │        │
│  │                                                                      │        │
│  │  Topics:                                                             │        │
│  │  • orders.created, orders.updated, orders.completed                  │        │
│  │  • rides.requested, rides.matched, rides.completed                   │        │
│  │  • payments.processed, payments.failed                               │        │
│  │  • drivers.location, drivers.status                                  │        │
│  │  • notifications.send                                                │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│         │                        │                        │                      │
│         ▼                        ▼                        ▼                      │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐              │
│  │ PostgreSQL  │          │ Elasticsearch│          │  Redis Geo  │              │
│  │  (Commands) │          │  (Queries)   │          │ (Location)  │              │
│  │             │          │              │          │             │              │
│  │ • Orders    │          │ • Search     │          │ • Driver    │              │
│  │ • Rides     │          │ • Menu       │          │   Positions │              │
│  │ • Users     │          │ • Analytics  │          │ • H3 Index  │              │
│  └─────────────┘          └─────────────┘          └─────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### CQRS Pattern Implementation
```
┌─────────────────────────────────────────────────────────────────┐
│                     CQRS FOR ORDER SERVICE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COMMAND SIDE                    │    QUERY SIDE                 │
│  (Write Operations)              │    (Read Operations)          │
│                                  │                               │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │ CreateOrderCommand │          │    │ GetOrderQuery      │    │
│  │ UpdateOrderCommand │          │    │ ListOrdersQuery    │    │
│  │ CancelOrderCommand │          │    │ SearchOrdersQuery  │    │
│  └─────────┬──────────┘          │    └─────────┬──────────┘    │
│            │                     │              │                │
│            ▼                     │              ▼                │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │  Command Handler   │          │    │   Query Handler    │    │
│  │  (Business Logic)  │          │    │   (Read Model)     │    │
│  └─────────┬──────────┘          │    └─────────┬──────────┘    │
│            │                     │              │                │
│            ▼                     │              ▼                │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │  PostgreSQL        │──Events──┼───▶│  Elasticsearch     │    │
│  │  (Event Store)     │   via    │    │  (Read Replica)    │    │
│  │                    │  Kafka   │    │                    │    │
│  └────────────────────┘          │    └────────────────────┘    │
│                                  │                               │
└─────────────────────────────────────────────────────────────────┘
```

### Event Store with Outbox Pattern
```
┌─────────────────────────────────────────────────────────────────┐
│                     OUTBOX PATTERN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Command arrives                                              │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  BEGIN TRANSACTION                                  │         │
│  │  ├── INSERT INTO orders (...)                       │         │
│  │  ├── INSERT INTO event_outbox (event_data)          │         │
│  │  COMMIT                                             │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     │  (Atomic - both succeed or both fail)                     │
│     ▼                                                            │
│  2. Outbox Processor (separate process)                          │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  SELECT * FROM event_outbox WHERE published = false │         │
│  │  ├── Publish to Kafka                               │         │
│  │  ├── UPDATE event_outbox SET published = true       │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  3. Event consumers update read models                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Polyglot Persistence Strategy
| Data Type | Storage | Use Case | Scale |
|-----------|---------|----------|-------|
| **Transactional** | PostgreSQL | Orders, Rides, Users, Payments | ACID, consistency |
| **Search/Analytics** | Elasticsearch | Menu search, Order history | Full-text, aggregations |
| **Real-time Location** | Redis Geo + H3 | Driver positions, ETA | Sub-second updates |
| **Time-series** | ClickHouse | Metrics, analytics, reporting | Billions of rows |
| **Cache** | Redis | Sessions, hot data | Low latency |
| **Events** | Kafka | All domain events | High throughput |

### Real-time Location System (H3 Hexagonal Grid)
```
┌─────────────────────────────────────────────────────────────────┐
│              REAL-TIME LOCATION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Driver App                                                      │
│     │                                                            │
│     │ GPS Update (every 3-5 seconds)                             │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Location Service                                   │         │
│  │  ├── Convert lat/lng to H3 hexagon (resolution 9)   │         │
│  │  ├── GEOADD driver:positions {lng} {lat} {driver_id}│         │
│  │  ├── SET driver:{id}:h3 {h3_index}                  │         │
│  │  └── Publish to Kafka: drivers.location             │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Matching Service (for new orders/rides)            │         │
│  │  ├── Get customer H3 hexagon                        │         │
│  │  ├── Find nearby H3 cells (k-ring neighbors)        │         │
│  │  ├── GEORADIUS driver:positions {lng} {lat} 5 km    │         │
│  │  └── Rank by: distance, rating, acceptance rate     │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  WebSocket Server (real-time updates)               │         │
│  │  ├── Subscribe to Kafka: drivers.location           │         │
│  │  ├── Filter by active order/ride                    │         │
│  │  └── Push to customer app via WebSocket             │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  H3 Hexagon Benefits:                                           │
│  • Consistent cell sizes (no distortion at poles)               │
│  • Efficient neighbor lookups (k-ring algorithm)                │
│  • Resolution 9 = ~0.1 km² cells (perfect for delivery)         │
│  • Used by Uber, DoorDash, Lyft                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Kafka Topics Structure
| Topic | Partitions | Purpose | Retention |
|-------|------------|---------|-----------|
| `orders.commands` | 12 | Order create/update/cancel commands | 7 days |
| `orders.events` | 12 | Order domain events | 30 days |
| `rides.commands` | 12 | Ride request/match/complete commands | 7 days |
| `rides.events` | 12 | Ride domain events | 30 days |
| `payments.events` | 6 | Payment processed/failed events | 90 days |
| `drivers.location` | 24 | Driver GPS updates (high volume) | 1 hour |
| `drivers.status` | 12 | Driver online/offline/busy status | 7 days |
| `notifications.send` | 6 | Push/SMS/Email triggers | 3 days |

### Event Schema (CloudEvents Standard)
```json
{
  "specversion": "1.0",
  "type": "dollor.orders.created",
  "source": "/services/food-order-service",
  "id": "A234-1234-1234",
  "time": "2025-12-15T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "order_id": "ord_123",
    "customer_id": "cust_456",
    "restaurant_id": "rest_789",
    "items": [...],
    "total": 45.99
  }
}
```

### Implementation Phases

#### PHASE 1: Event Infrastructure (COMPLETE)
- [x] Add Kafka + Zookeeper to docker-compose
- [x] Create base event classes (CloudEvents format)
- [x] Implement Event Store with Outbox pattern
- [x] Create event publisher/consumer utilities
- [x] Add Kafka topics for orders and drivers

#### PHASE 2: CQRS for Order Service (COMPLETE)
- [x] Separate command handlers from query handlers
- [x] Create Elasticsearch read model for orders
- [x] Implement order projections from events
- [x] Add order search and filtering
- [x] Create event projector service (Kafka consumer)
- [x] Add Redis projection for real-time caching

#### PHASE 3: Real-time Location System (COMPLETE)
- [x] Implement H3 hexagonal grid indexing
- [x] Add Redis Geo for driver positions
- [x] Create WebSocket server for live tracking
- [x] Implement driver matching algorithm
- [x] Add surge pricing calculator
- [x] Integrate with location-service

#### PHASE 4: Analytics Pipeline (COMPLETE)
- [x] Add ClickHouse for time-series data
- [x] Create materialized views for metrics
- [x] Implement real-time dashboard feeds
- [x] Add business intelligence queries
- [x] Create analytics service with Kafka consumer
- [x] Add export endpoints for data analysis

### Error Code System
**Format**: `{SERVICE}-{CATEGORY}{NUMBER}`

| Category | Meaning | Example |
|----------|---------|---------|
| 1xx | Validation | `ORD-101` Invalid items |
| 2xx | Auth | `AUTH-201` Invalid credentials |
| 3xx | Not Found | `DRV-301` Driver not found |
| 4xx | Business Logic | `ORD-401` Cannot cancel |
| 5xx | External Service | `PAY-501` Stripe error |

---

## MIGRATION STRATEGY: DEV → STAGING → PRODUCTION

### Environment Pipeline
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│     DEV     │─────►│   STAGING   │─────►│ PRODUCTION  │
│  (feature)  │      │  (testing)  │      │   (live)    │
└─────────────┘      └─────────────┘      └─────────────┘
     │                     │                     │
     │                     │                     │
     ▼                     ▼                     ▼
  Auto-deploy         Manual gate           Manual gate
  on PR merge        + QA approval        + Exec approval
```

### Golden Rule: NEVER TOUCH PRODUCTION DIRECTLY
| Environment | Purpose | Deployment | Database |
|-------------|---------|------------|----------|
| **Development** | Feature work, testing | Auto on PR merge | Dev DB |
| **Staging** | QA, integration testing | Manual approval | Staging DB (prod clone) |
| **Production** | Live users | Manual + exec approval | Production DB |

### Migration Phases

#### PHASE 1: Infrastructure Setup (Current)
- [x] ArgoCD configuration for 3 environments
- [x] Kustomize overlays (dev, staging, production)
- [x] CI/CD pipelines with security scanning
- [x] Shared library (error codes, logging, metrics)

#### PHASE 2: Service Extraction (Next)
```
Current Monolith (main_new.py)
            │
            ▼
┌───────────────────────────────────────────────────┐
│ Extract services one at a time:                   │
│ 1. auth-service (low risk, high value)            │
│ 2. notification-service (independent)             │
│ 3. driver-service (critical for ops)              │
│ 4. food-order-service (core business)             │
│ 5. location-service (real-time)                   │
└───────────────────────────────────────────────────┘
```

#### PHASE 3: Strangler Pattern Migration
```
                    ┌──────────────────────────────┐
                    │         API GATEWAY          │
                    │           (Kong)             │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  Microservice │          │   Monolith    │          │  Microservice │
│   (auth)      │          │   (legacy)    │          │   (orders)    │
└───────────────┘          └───────────────┘          └───────────────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         PostgreSQL           │
                    └──────────────────────────────┘
```

---

## IMPLEMENTATION ROADMAP

### PHASE 1-4: COMPLETED ✓
1. **Infrastructure Setup** ✓
   - [x] ArgoCD configuration for 3 environments
   - [x] Kustomize overlays (dev, staging, production)
   - [x] CI/CD pipelines with security scanning
   - [x] Shared library (error codes, logging, metrics)

2. **Microservices Created** ✓
   - [x] auth-service (port 8001)
   - [x] user-service (port 8002)
   - [x] driver-service (port 8003)
   - [x] restaurant-service (port 8004)
   - [x] order-service (port 8005)
   - [x] payment-service (port 8006)
   - [x] location-service (port 8007)
   - [x] menu-service (port 8008)
   - [x] notification-service (port 8009)
   - [x] rating-service (port 8013)
   - [x] ride-service (port 8014)
   - [x] pricing-service (port 8015)
   - [x] analytics-service (port 8016)
   - [x] negotiation-service (port 8017) - Real-time price negotiation
   - [x] chat-service (port 8018) - Real-time messaging
   - [x] call-service (port 8019) - Phone masking via Twilio

3. **CQRS & Event-Driven Architecture** ✓
   - [x] Kafka event streaming
   - [x] Elasticsearch read models
   - [x] Redis caching and Geo
   - [x] H3 hexagonal grid for location
   - [x] WebSocket real-time updates

4. **Analytics Pipeline** ✓
   - [x] ClickHouse time-series database
   - [x] Materialized views for metrics
   - [x] Real-time dashboard feeds

### PHASE 5: COMPLETED ✓ (Current)
5. **Production Ready**
   - [x] WebSocket server for real-time updates
   - [x] Push notification service (FCM/APNs)
   - [x] API Gateway configuration (NGINX)
   - [x] Microservice proxy endpoints
   - [x] Legal document API endpoints
   - [x] Demo accounts for App Store review
   - [x] All 21 backend tests passing
   - [x] $1+$1 pricing model implemented

### PHASE 6: IN PROGRESS (Current)
6. **Staging Deployment & Testing**
   - [x] All 16 microservices Docker builds passing
   - [x] Docker images pushed to ECR (134607809447.dkr.ecr.us-east-1.amazonaws.com)
   - [x] Terraform staging infrastructure applied
   - [x] EKS cluster created (dollor-staging)
   - [x] VPC and networking configured
   - [x] RDS PostgreSQL staging database ready
   - [x] Security scans passing (Semgrep, Bandit, SonarCloud)
   - [x] 256 unit tests passing across all services
   - [x] PYTHONPATH=/app/shared added to all 16 Dockerfiles
   - [x] 6 core services deployed to EKS (auth, driver, order, notification, ride, user)
   - [x] Staging database schema created (customers, drivers tables)
   - [x] Customer registration API tested successfully
   - [x] Driver registration API tested successfully
   - [ ] Deploy remaining 10 services to EKS
   - [ ] Complete integration testing on staging
   - [ ] Android app testing against staging API
   - [ ] iOS app testing against staging API

### PHASE 7: NEXT
7. **App Store Submission**
   - [ ] Submit Customer iOS app
   - [ ] Submit Driver iOS app
   - [ ] Submit Restaurant iOS app
   - [ ] Submit Android apps to Play Store
   - [ ] Respond to App Store review feedback

### PHASE 8: POST-LAUNCH
8. **Production Deployment**
   - [ ] Set up production EKS cluster
   - [ ] Configure production RDS (Multi-AZ)
   - [ ] Set up CloudWatch monitoring
   - [ ] Configure alerts and PagerDuty
   - [ ] Load testing and optimization

9. **Feature Expansion**
   - [ ] Multi-city expansion
   - [ ] Premium features
   - [ ] Restaurant analytics dashboard
   - [ ] Driver performance bonuses

---

## DEPLOYMENT COMMANDS

### Development
```bash
# Deploy to dev (auto on PR merge, or manual)
kubectl apply -k infrastructure/argocd/apps/dev/

# Check dev status
argocd app get dollor-dev
```

### Staging
```bash
# Deploy to staging (requires approval)
kubectl apply -k infrastructure/argocd/apps/staging/

# Verify staging
argocd app sync dollor-staging
argocd app get dollor-staging
```

### Production
```bash
# Deploy to production (requires exec approval)
kubectl apply -k infrastructure/argocd/apps/production/

# Canary deployment (10% → 30% → 50% → 80% → 100%)
kubectl argo rollouts set weight dollor-api 10 -n production
# ... monitor metrics ...
kubectl argo rollouts promote dollor-api -n production
```

---

## AWS STAGING INFRASTRUCTURE

> **Status**: Terraform applied, infrastructure ready for EKS deployment

### Staging Environment Resources
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       AWS STAGING INFRASTRUCTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REGION: us-east-1                                                              │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  EKS CLUSTER                                                              │   │
│  │  Name: dollor-staging                                                     │   │
│  │  Endpoint: https://746C021225078E21CD4D22912C1B6044.gr7.us-east-1.eks    │   │
│  │  Version: 1.28                                                            │   │
│  │  Node Groups: 2-5 nodes (auto-scaling)                                    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  VPC & NETWORKING                                                         │   │
│  │  VPC ID: vpc-06b31cf4c5205c340                                           │   │
│  │  CIDR: 10.1.0.0/16                                                       │   │
│  │  Public Subnets: 3 (Multi-AZ)                                            │   │
│  │  Private Subnets: 3 (Multi-AZ)                                           │   │
│  │  NAT Gateway: Enabled                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  ECR REPOSITORIES (16 services)                                           │   │
│  │  Registry: 134607809447.dkr.ecr.us-east-1.amazonaws.com                  │   │
│  │  Images: dollor-{service-name}:latest                                    │   │
│  │  Scanning: Enabled on push                                               │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  RDS POSTGRESQL                                                           │   │
│  │  Instance: db.t3.medium                                                  │   │
│  │  Storage: 20GB (auto-scaling)                                            │   │
│  │  Multi-AZ: No (staging)                                                  │   │
│  │  Encryption: Enabled                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### All 16 Microservices in ECR
| Service | ECR Image | Port | Build | EKS Staging |
|---------|-----------|------|-------|-------------|
| auth-service | dollor-auth-service:latest | 8001 | ✓ | ✓ Deployed |
| user-service | dollor-user-service:latest | 8002 | ✓ | ✓ Deployed |
| driver-service | dollor-driver-service:latest | 8003 | ✓ | ✓ Deployed |
| restaurant-service | dollor-restaurant-service:latest | 8004 | ✓ | Pending |
| order-service | dollor-order-service:latest | 8005 | ✓ | ✓ Deployed |
| payment-service | dollor-payment-service:latest | 8006 | ✓ | Pending |
| location-service | dollor-location-service:latest | 8007 | ✓ | Pending |
| menu-service | dollor-menu-service:latest | 8008 | ✓ | Pending |
| notification-service | dollor-notification-service:latest | 8009 | ✓ | ✓ Deployed |
| rating-service | dollor-rating-service:latest | 8013 | ✓ | Pending |
| ride-service | dollor-ride-service:latest | 8014 | ✓ | ✓ Deployed |
| pricing-service | dollor-pricing-service:latest | 8015 | ✓ | Pending |
| analytics-service | dollor-analytics-service:latest | 8016 | ✓ | Pending |
| negotiation-service | dollor-negotiation-service:latest | 8017 | ✓ | Pending |
| chat-service | dollor-chat-service:latest | 8018 | ✓ | Pending |
| call-service | dollor-call-service:latest | 8019 | ✓ | Pending |

### Staging API Endpoints (Live)
| Service | LoadBalancer URL | Health |
|---------|------------------|--------|
| auth-service | http://a79973973526440d4b63f6982470da48-208077016.us-east-1.elb.amazonaws.com:8001 | ✓ |
| driver-service | http://ae92693ba001948e9ab67528a4bc6d98-245490019.us-east-1.elb.amazonaws.com:8003 | ✓ |
| order-service | http://a9ae07ce89cda46409b0867f98754f97-1882563567.us-east-1.elb.amazonaws.com:8005 | ✓ |
| notification-service | http://aab96a9a5305240ecb79c3105e9c27eb-849596970.us-east-1.elb.amazonaws.com:8009 | ✓ |

### Staging Database
```
Host: dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com
Port: 5432
Database: dollor_staging
User: dollor_admin
Tables: customers, drivers (created)
```

### CI/CD Pipeline Status
```
GitHub Actions Workflows:
├── deploy-microservices.yml  ─── All 16 services building ✓
├── sonarcloud.yml           ─── Code quality passing ✓
└── security-scan.yml        ─── Security scans passing ✓

Build Pipeline:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───▶│  Build  │───▶│  Scan   │───▶│ Deploy  │
│  Code   │    │ Docker  │    │ Trivy   │    │  EKS    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Terraform State
```bash
# Staging infrastructure terraform location
cd infrastructure/terraform/environments/staging

# View current state
terraform show

# Plan changes
terraform plan

# Apply changes (requires approval)
terraform apply
```

### Connect to Staging EKS
```bash
# Update kubeconfig
aws eks update-kubeconfig --name dollor-staging --region us-east-1

# Verify connection
kubectl get nodes

# Check services
kubectl get pods -n dollor-staging
kubectl get services -n dollor-staging
```

---

## QUICK REFERENCE

### Start P2P Platform Locally
```bash
# Backend
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080

# Frontend
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend
npm run dev
```

### iOS Development
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios
open EatFair.xcworkspace
# Select scheme: eatfaircustomer | eatffairdelivery | eatffairrestaurant
```

### Android Development
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:installDebug      # Customer
./gradlew :orderapp:installDebug # Driver
./gradlew :partner:installDebug  # Restaurant
```

---

## LOCAL DEVELOPMENT INFRASTRUCTURE

### Docker Services (docker-compose)
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/services
docker-compose up -d postgres redis zookeeper kafka kafka-ui
```

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | dollor-postgres | 5432 | Primary database |
| Redis | dollor-redis | 6379 | Cache, sessions, Geo |
| Zookeeper | dollor-zookeeper | 2181 | Kafka coordination |
| Kafka | dollor-kafka | 9093 (host) / 29092 (internal) | Event streaming |
| Kafka UI | dollor-kafka-ui | 8088 | Kafka monitoring |

**Kafka UI:** http://localhost:8088

### Kafka Topics (Pre-configured)
| Topic | Partitions | Purpose |
|-------|------------|---------|
| `orders.events` | 12 | Order domain events |
| `orders.commands` | 12 | Order commands |
| `rides.events` | 12 | Ride domain events |
| `drivers.location` | 24 | Real-time driver GPS |
| `drivers.status` | 12 | Driver online/offline |
| `payments.events` | 6 | Payment events |
| `notifications.send` | 6 | Notification triggers |

---

## GIT WORKTREE - HOTFIX WORKFLOW

### Repository Structure
```
/Users/jeet/StudioProjects/
├── eatfair-ios/              # Main development (branch: main)
│   └── scripts/hotfix.sh     # Hotfix helper script
│
└── eatfair-ios-hotfix/       # Hotfix worktree (branch: hotfix/base)
                              # Use for emergency production fixes
```

### Hotfix Script Commands
```bash
# Show status of worktrees
./scripts/hotfix.sh status

# Create a new hotfix
./scripts/hotfix.sh create payment-crash

# After making fixes, create PR
./scripts/hotfix.sh finish payment-crash

# Sync worktrees after merge
./scripts/hotfix.sh sync

# List active hotfixes
./scripts/hotfix.sh list
```

### Manual Hotfix Workflow
```bash
# 1. Go to hotfix worktree
cd /Users/jeet/StudioProjects/eatfair-ios-hotfix

# 2. Create hotfix branch from latest main
git fetch origin && git checkout -b hotfix/critical-fix origin/main

# 3. Make fix and commit
git add . && git commit -m "fix: Critical production bug"

# 4. Push and create PR
git push -u origin hotfix/critical-fix
gh pr create --base main --title "Hotfix: Critical fix"

# 5. After merge, sync both worktrees
cd /Users/jeet/StudioProjects/eatfair-ios && git pull
cd /Users/jeet/StudioProjects/eatfair-ios-hotfix && git checkout hotfix/base && git reset --hard origin/main
```

### When to Use Hotfix Worktree
| Scenario | Use Hotfix Worktree? |
|----------|---------------------|
| Production is down | ✅ Yes |
| Critical security vulnerability | ✅ Yes |
| Payment processing broken | ✅ Yes |
| Minor bug (can wait) | ❌ No, use normal flow |
| New feature | ❌ No, use feature branch |

---

## AI EMPLOYEE PROTOCOLS

### When Implementing Features
1. **Check this document first** - Don't invent patterns
2. **Use shared libraries** - Error codes, logging, metrics
3. **Test in dev first** - Never modify staging/production directly
4. **Update both platforms** - iOS AND Android
5. **Document changes** - Update this file if architecture changes

### When Fixing Bugs
1. **Identify root cause** - Don't just fix symptoms
2. **Check all platforms** - Bug may exist in iOS, Android, and Backend
3. **Add regression test** - Prevent recurrence
4. **Update failure reports** - Track progress

### When Deploying
1. **Dev first** - Auto-deploy on PR merge
2. **Staging second** - Manual approval required
3. **Production last** - Exec approval + canary rollout
4. **Never skip environments** - Even for "small" changes

### When Unsure
1. **Check docs** - This file, FINAL_INFRASTRUCTURE.md
2. **Check existing code** - Follow established patterns
3. **ASK the user** - Better to ask than guess wrong
4. **Don't hallucinate** - Never invent APIs or services

---

## IMPORTANT REMINDERS

| Rule | Explanation |
|------|-------------|
| **Two Repos** | eatfair-ios (iOS + Backend) + eatfair-android (Android) |
| **Two Domains** | Food Delivery + Rideshare share infrastructure |
| **Three Environments** | Dev → Staging → Production (never skip) |
| **Shared Code** | Always use shared libraries |
| **Error Codes** | Use documented codes only |
| **No Production Direct** | All changes go through dev → staging first |

---

*Last Updated: December 18, 2025*
*AI Employee: TechCloudPro Claude Instance*
*Platform: Dollor.ai (Food Delivery + Rideshare Matchmaking Service)*
*Status: Phase 8 In Progress - Staging Deployment Active*
*Business Model: Tiered Platform Fee ($1/$2/$3 based on fare)*
*Legal Status: Matchmaking Service (Phase 1)*
*Total Microservices: 18 (15 core + 3 communication)*
*CI/CD: All 18 microservices building to ECR, deploying to EKS*
*Staging EKS: dollor-staging (us-east-1)*
*Next: Complete EKS deployment, then App Store Submission*

---

## PHASE 6: COMMUNICATION MICROSERVICES

### Negotiation Service (Port 8017)
**Location:** `services/core/negotiation-service/`

Real-time price negotiation between independent drivers and customers.
Implements the MATCHMAKING model where platform suggests prices but parties negotiate freely.

**Files:**
- `main.py` - FastAPI with WebSocket support (600+ lines)
- `requirements.txt` - Dependencies
- `Dockerfile` - Container configuration

**Features:**
- Platform suggests price based on distance/time
- Customer/driver counter-offer system
- Quick offer options (60%, 70%, 80%, 90% of suggested)
- Tiered platform fees: $1 (≤$35), $2 ($35-70), $3 (>$70)
- Real-time updates via WebSocket + Redis pub/sub
- Legal matchmaking disclaimers embedded

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/negotiations` | POST | Create new negotiation |
| `/api/negotiations/{id}/customer-offer` | POST | Customer counter-offer |
| `/api/negotiations/{id}/driver-offer` | POST | Driver counter-offer |
| `/api/negotiations/{id}/accept` | POST | Accept current price |
| `/api/negotiations/{id}` | GET | Get negotiation status |
| `/ws/negotiation/{id}` | WS | Real-time updates |

### Chat Service (Port 8018)
**Location:** `services/core/chat-service/`

Real-time messaging between drivers and customers.
Facilitates communication without monitoring content (matchmaking model).

**Files:**
- `main.py` - FastAPI with WebSocket support (500+ lines)
- `requirements.txt` - Dependencies
- `Dockerfile` - Container configuration

**Features:**
- Real-time messaging via WebSocket
- Quick reply templates (customer/driver specific)
- Location sharing
- Read receipts
- Message persistence in PostgreSQL
- Redis pub/sub for cross-instance messaging

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/conversations` | POST | Create conversation |
| `/api/chat/conversations/{id}/messages` | POST | Send message |
| `/api/chat/conversations/{id}/messages` | GET | Get message history |
| `/api/chat/conversations/{id}/read` | POST | Mark messages read |
| `/ws/chat/{conversation_id}` | WS | Real-time messaging |

**Quick Replies:**
```
Customer: "I'm at pickup", "Running late", "Can you call me?", "Thank you!"
Driver: "On my way!", "I've arrived", "Share your location?", "I'll wait here"
```

### Call Service (Port 8019)
**Location:** `services/core/call-service/`

Privacy-protected phone calls via number masking.
Neither party sees the other's real phone number.

**Files:**
- `main.py` - FastAPI with Twilio integration (450+ lines)
- `requirements.txt` - Dependencies
- `Dockerfile` - Container configuration

**Features:**
- Phone number masking via Twilio Proxy
- Call session management (4-hour expiry)
- Call logging with duration tracking
- Twilio webhook integration
- Works without Twilio in dev mode (mock numbers)

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/call/sessions` | POST | Create call session |
| `/api/call/sessions/{id}` | PUT | Add driver to session |
| `/api/call/sessions/{id}` | GET | Get session details |
| `/api/call/masked-number` | GET | Get masked number to dial |
| `/api/call/initiate` | POST | Log call initiation |
| `/api/call/logs/{session_id}` | GET | Get call history |
| `/api/call/sessions/{id}` | DELETE | End call session |
| `/api/call/twilio/voice` | POST | Twilio voice webhook |
| `/api/call/twilio/status` | POST | Twilio status webhook |

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
TWILIO_PROXY_SERVICE_SID=KSxxx
```

### iOS Service Integrations
**Location:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/`

| File | Service | Features |
|------|---------|----------|
| `NegotiationService.swift` | negotiation-service | WebSocket + REST, quick offers |
| `ChatService.swift` | chat-service | WebSocket + REST, quick replies |
| `CallService.swift` | call-service | Phone masking, call logging |

**AppConfig Updates:**
```swift
@Published public var negotiationServiceURL: String = "https://.../negotiation"
@Published public var chatServiceURL: String = "https://.../chat"
@Published public var callServiceURL: String = "https://.../call"
```

### Kubernetes Configurations

All three services have complete K8s deployments:
- `infrastructure/kubernetes/services/{service}/deployment.yaml`
- `infrastructure/kubernetes/services/{service}/overlays/{dev,staging,production}/`
- `infrastructure/argocd/apps/{dev,staging,production}/{service}.yaml`

**Replica Configuration:**
| Environment | Replicas |
|-------------|----------|
| Dev | 1 |
| Staging | 2 |
| Production | 3 |

### Legal Compliance (Matchmaking Model)

All communication services include embedded legal disclaimers:

```python
"""
MATCHMAKING PLATFORM - NOT A TRANSPORTATION COMPANY

Dollor.ai facilitates connections between INDEPENDENT parties.
We do not employ drivers or control negotiations.
Platform suggests prices based on market rates.
Final price is negotiated freely between parties.
"""
```

---

## ROLE-SPECIFIC AUTHENTICATION SERVICES

> **NEW**: Dedicated authentication microservices for drivers and restaurants/vendors.
> These services handle role-specific authentication flows separate from the main auth-service.

### Restaurant Auth Service (Port 8010)
**Location:** `services/core/restaurant-auth-service/`

Authentication service for restaurant owners and vendors.
Handles vendor-specific login, registration, and OAuth flows.

**Files:**
- `main.py` - FastAPI authentication service (~660 lines)
- `requirements.txt` - Dependencies

**Features:**
- Vendor registration with restaurant details
- Form-based login (Android/Web) - `/api/auth/vendor/login`
- JSON-based login (iOS) - `/api/vendor/login`
- Google OAuth for vendors - `/api/auth/vendor/google`
- Password reset flow
- Vendor profile management

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/vendor/login` | POST | Form-based vendor login |
| `/api/auth/vendor/register` | POST | Register new vendor |
| `/api/vendor/login` | POST | JSON-based iOS login |
| `/api/vendor/register` | POST | JSON-based iOS registration |
| `/api/auth/vendor/google` | POST | Google OAuth for vendors |
| `/api/auth/vendor/me` | GET | Get current vendor profile |
| `/api/auth/vendor/password-reset/request` | POST | Request password reset |
| `/api/auth/vendor/password-reset/confirm` | POST | Confirm password reset |
| `/health` | GET | Health check |

**Error Codes:**
- `VENDOR-103`: Email already registered
- `VENDOR-104`: Restaurant name required
- `VENDOR-201`: Invalid credentials
- `VENDOR-202`: Vendor account not approved
- `VENDOR-301`: Vendor not found

### Driver Auth Service (Port 8011)
**Location:** `services/core/driver-auth-service/`

Authentication service for delivery drivers.
Handles driver-specific login, registration, and OAuth flows.

**Files:**
- `main.py` - FastAPI authentication service (~750 lines)
- `requirements.txt` - Dependencies

**Features:**
- Driver registration with vehicle details
- Form-based login (Android/Web) - `/api/auth/driver/login`
- JSON-based login (iOS) - `/api/driver/login`
- Google OAuth for drivers - `/api/auth/driver/google`
- Apple Sign In for drivers - `/api/auth/driver/apple-auth`
- Password reset flow
- Driver profile management with location

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/driver/login` | POST | Form-based driver login |
| `/api/auth/driver/register` | POST | Register new driver |
| `/api/driver/login` | POST | JSON-based iOS login |
| `/api/driver/register` | POST | JSON-based iOS registration |
| `/api/auth/driver/google` | POST | Google OAuth for drivers |
| `/api/auth/driver/apple-auth` | POST | Apple Sign In for drivers |
| `/api/auth/driver/me` | GET | Get current driver profile |
| `/api/auth/driver/password-reset/request` | POST | Request password reset |
| `/api/auth/driver/password-reset/confirm` | POST | Confirm password reset |
| `/health` | GET | Health check |

**Error Codes:**
- `DRV-101`: Invalid phone format
- `DRV-103`: Email already registered
- `DRV-201`: Invalid credentials
- `DRV-202`: Driver account not active
- `DRV-301`: Driver not found

### Authentication Service Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ROLE-SPECIFIC AUTHENTICATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │  CUSTOMER APP    │    │   DRIVER APP     │    │  RESTAURANT APP  │          │
│  │  (iOS/Android)   │    │  (iOS/Android)   │    │  (iOS/Android)   │          │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘          │
│           │                       │                       │                      │
│           ▼                       ▼                       ▼                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │  auth-service    │    │ driver-auth-svc  │    │ restaurant-auth  │          │
│  │     :8001        │    │     :8011        │    │     :8010        │          │
│  │                  │    │                  │    │                  │          │
│  │ • Customer auth  │    │ • Driver auth    │    │ • Vendor auth    │          │
│  │ • Customer OAuth │    │ • Driver OAuth   │    │ • Vendor OAuth   │          │
│  │ • Customer reset │    │ • Apple Sign In  │    │ • Google Sign In │          │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘          │
│           │                       │                       │                      │
│           └───────────────────────┼───────────────────────┘                      │
│                                   │                                              │
│                          ┌────────▼────────┐                                     │
│                          │   PostgreSQL    │                                     │
│                          │  users table    │                                     │
│                          │  drivers table  │                                     │
│                          │  vendors table  │                                     │
│                          └─────────────────┘                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## CI/CD PIPELINE WITH SECURITY SCANNING

> **CRITICAL**: All code must pass Semgrep and SonarQube scans from STAGING onwards.
> Production deployments require zero critical/high severity findings.

### Pipeline Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE WITH SECURITY GATES                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  COMMIT  │───►│   DEV    │───►│ STAGING  │───►│    QA    │───►│   PROD   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │              │                │                │               │        │
│       ▼              ▼                ▼                ▼               ▼        │
│  ┌──────────┐   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Lint    │   │  Build   │    │ Semgrep  │    │  Manual  │    │  Canary  │  │
│  │  Tests   │   │  Deploy  │    │ SonarQube│    │  Testing │    │  Rollout │  │
│  │  Types   │   │  Auto    │    │ OWASP    │    │  Approval│    │  100%    │  │
│  └──────────┘   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                                  │
│  SECURITY GATES:                                                                │
│  ├── DEV: Basic linting, unit tests (auto-deploy)                              │
│  ├── STAGING: Full security scan required (Semgrep + SonarQube)                │
│  ├── QA: Manual testing + security review approval                              │
│  └── PROD: Zero critical findings + exec approval                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Security Scanning Tools
| Tool | Purpose | Stage | Blocking |
|------|---------|-------|----------|
| **Semgrep** | SAST - Static code analysis | Staging+ | Critical/High |
| **SonarQube** | Code quality + security | Staging+ | Critical/High |
| **Trivy** | Container vulnerability scan | Staging+ | Critical |
| **OWASP ZAP** | DAST - Dynamic testing | QA | Critical |
| **Bandit** | Python security linter | All | High |
| **ESLint Security** | JS/TS security rules | All | High |
| **tfsec** | Terraform security | All | Critical |

### Semgrep Configuration
```yaml
# .semgrep.yml - Dollor.ai Security Rules
rules:
  - id: dollor-no-hardcoded-secrets
    patterns:
      - pattern-regex: (api_key|secret|password|token)\s*=\s*['"][^'"]+['"]
    message: "Hardcoded secret detected"
    severity: ERROR

  - id: dollor-sql-injection
    patterns:
      - pattern: f"SELECT ... {$VAR} ..."
    message: "Potential SQL injection"
    severity: ERROR

  - id: dollor-no-eval
    pattern: eval(...)
    message: "eval() is dangerous"
    severity: ERROR

  - id: dollor-stripe-key-exposure
    pattern-regex: sk_(live|test)_[a-zA-Z0-9]+
    message: "Stripe secret key exposed"
    severity: ERROR
```

### SonarQube Quality Gates
| Metric | Requirement | Blocking |
|--------|-------------|----------|
| **Security Rating** | A (no vulnerabilities) | Yes |
| **Reliability Rating** | B or better | Yes |
| **Maintainability Rating** | B or better | No |
| **Code Coverage** | ≥70% for new code | Yes (Staging+) |
| **Duplicated Lines** | <5% | No |
| **Security Hotspots** | All reviewed | Yes (Prod) |

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-complete.yml (Semgrep section)
# Uses official semgrep/semgrep container for reliable SARIF generation
semgrep:
  name: Semgrep SAST
  runs-on: ubuntu-latest
  permissions:
    security-events: write
    contents: read
  container:
    image: semgrep/semgrep
  steps:
    - uses: actions/checkout@v4
    - name: Run Semgrep
      run: |
        semgrep scan \
          --config p/owasp-top-ten \
          --config p/python \
          --config p/javascript \
          --config p/typescript \
          --config p/security-audit \
          --config p/secrets \
          --config p/ci \
          --sarif --output semgrep.sarif \
          --error \
          || true
    - name: Upload SARIF
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: semgrep.sarif

# Alternative: Install via pip (when container not possible)
# - run: pip install semgrep
# - run: semgrep scan --config p/owasp-top-ten --sarif --output semgrep.sarif

sonarqube:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: sonarsource/sonarqube-scan-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
    - uses: sonarsource/sonarqube-quality-gate-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

trivy:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        severity: 'CRITICAL,HIGH'
        exit-code: '1'

bandit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: pip install bandit
    - run: bandit -r services/ apps/web/p2p-platform/backend/ -ll -ii
```

### Run Security Scans Locally
```bash
# Semgrep (with SARIF output)
pip install semgrep
semgrep scan --config p/owasp-top-ten --config p/python --config p/security-audit --sarif --output semgrep.sarif .

# Bandit (Python)
pip install bandit
bandit -r services/ -ll

# Trivy (Containers)
trivy fs --severity CRITICAL,HIGH .

# SonarQube (requires server)
sonar-scanner -Dsonar.projectKey=dollor-ai
```

---

## APP STORE REQUIREMENTS

> **GOAL**: Build Uber/DoorDash quality apps that pass App Store review on first submission.

### Apple App Store Requirements
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     iOS APP STORE CHECKLIST                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REQUIRED FOR SUBMISSION:                                                        │
│  ─────────────────────────                                                       │
│  □ App Privacy Policy URL (in app and App Store Connect)                        │
│  □ Terms of Service URL                                                         │
│  □ Contact information (support email)                                          │
│  □ Age rating questionnaire completed                                           │
│  □ App category selected (Food & Drink / Travel)                               │
│  □ Screenshots for all device sizes                                             │
│  □ App icon (1024x1024 without alpha)                                          │
│  □ App description (4000 chars max)                                            │
│  □ Keywords (100 chars max)                                                     │
│                                                                                  │
│  LOCATION SERVICES (CRITICAL):                                                   │
│  ─────────────────────────────                                                   │
│  □ NSLocationWhenInUseUsageDescription (customer apps)                          │
│  □ NSLocationAlwaysUsageDescription (driver apps)                               │
│  □ Background location justification (driver apps)                              │
│  □ Purpose strings must clearly explain why location is needed                  │
│                                                                                  │
│  PAYMENT PROCESSING:                                                             │
│  ────────────────────                                                            │
│  □ Physical goods/services = Stripe OK (no Apple IAP required)                  │
│  □ Clear pricing displayed before purchase                                       │
│  □ Refund policy clearly stated                                                 │
│                                                                                  │
│  PUSH NOTIFICATIONS:                                                             │
│  ────────────────────                                                            │
│  □ Request permission at appropriate time (not on launch)                       │
│  □ Clear explanation of notification types                                      │
│  □ Respect user's notification preferences                                      │
│                                                                                  │
│  DATA COLLECTION (App Privacy Labels):                                          │
│  ──────────────────────────────────────                                          │
│  □ Contact Info (name, email, phone) - Account creation                         │
│  □ Location - Order delivery / Driver tracking                                  │
│  □ Payment Info - Stripe processing                                             │
│  □ Usage Data - Analytics                                                       │
│  □ Identifiers - Device ID for push notifications                               │
│                                                                                  │
│  COMMON REJECTION REASONS TO AVOID:                                              │
│  ──────────────────────────────────                                              │
│  ✗ Incomplete app (must be fully functional)                                    │
│  ✗ Placeholder content                                                          │
│  ✗ Crashes or bugs                                                              │
│  ✗ Broken links                                                                 │
│  ✗ Missing login credentials for review                                         │
│  ✗ Requesting unnecessary permissions                                           │
│  ✗ Background location without justification                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Google Play Store Requirements
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   GOOGLE PLAY STORE CHECKLIST                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REQUIRED FOR SUBMISSION:                                                        │
│  ─────────────────────────                                                       │
│  □ Privacy Policy URL                                                           │
│  □ App access (demo credentials if login required)                              │
│  □ Content rating questionnaire                                                 │
│  □ Target audience and content                                                  │
│  □ News app declaration (if applicable)                                         │
│  □ COVID-19 contact tracing declaration                                         │
│  □ Data safety section completed                                                │
│  □ Financial features declaration                                               │
│                                                                                  │
│  LOCATION PERMISSIONS:                                                           │
│  ─────────────────────                                                           │
│  □ ACCESS_FINE_LOCATION justification                                           │
│  □ ACCESS_BACKGROUND_LOCATION (driver app only)                                 │
│  □ Background location policy declaration                                       │
│  □ Prominent disclosure before requesting                                       │
│                                                                                  │
│  DATA SAFETY SECTION:                                                            │
│  ─────────────────────                                                           │
│  □ Data collected: Location, Personal info, Financial info                      │
│  □ Data shared: Payment processors (Stripe)                                     │
│  □ Security practices: Encryption in transit                                    │
│  □ Data deletion: User can request deletion                                     │
│                                                                                  │
│  SENSITIVE PERMISSIONS DECLARATION:                                              │
│  ──────────────────────────────────                                              │
│  □ SMS/Call Log - NOT NEEDED (don't request)                                    │
│  □ Background location - Driver app only with justification                     │
│  □ Camera - Profile photos only                                                 │
│                                                                                  │
│  COMMON REJECTION REASONS TO AVOID:                                              │
│  ──────────────────────────────────                                              │
│  ✗ Deceptive behavior                                                           │
│  ✗ Malicious behavior                                                           │
│  ✗ Policy violations                                                            │
│  ✗ Impersonation                                                                │
│  ✗ Intellectual property violations                                             │
│  ✗ Privacy violations                                                           │
│  ✗ Requesting unnecessary permissions                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### App Store Submission Checklist
| Item | Customer App | Driver App | Restaurant App |
|------|--------------|------------|----------------|
| **Privacy Policy** | Required | Required | Required |
| **Terms of Service** | Required | Required | Required |
| **Location (Foreground)** | Yes | Yes | No |
| **Location (Background)** | No | Yes (justified) | No |
| **Push Notifications** | Yes | Yes | Yes |
| **Camera** | Optional | Yes (profile) | No |
| **Payment Processing** | Stripe | No | Stripe |
| **Demo Account** | Required | Required | Required |

### Demo Accounts for App Review
```
Customer App:
  Email: demo.customer@dollor.ai
  Password: DemoCustomer2025!

Driver App:
  Email: demo.driver@dollor.ai
  Password: DemoDriver2025!

Restaurant App:
  Email: demo.restaurant@dollor.ai
  Password: DemoRestaurant2025!

Note: These accounts should be pre-configured with:
- Verified status (no document upload required)
- Sample order history
- Working location (San Francisco area)
- Stripe test mode enabled
```

### App Store Metadata
```
App Name: Dollor.ai - Food & Rides
Subtitle: Matchmaking for Delivery

Description:
Dollor.ai connects you with local restaurants and independent delivery
partners. Order food from your favorite restaurants and get it delivered
by independent drivers in your area.

✓ Simple $1 matchmaking fee
✓ No hidden charges
✓ 100% of tips go to drivers
✓ Real-time order tracking
✓ Multiple restaurant orders

Keywords: food delivery, restaurant, order food, delivery, matchmaking
```

---

## PRICING IMPLEMENTATION

### Fee Constants (services/shared/pricing.py)
```python
# Dollor.ai Pricing Constants
# MATCHMAKING SERVICE - Flat Fee Model

class MatchmakingFees:
    """
    Dollor.ai flat fee structure.
    We are a MATCHMAKING SERVICE, not a delivery company.
    """

    # Food Delivery Matchmaking
    FOOD_CUSTOMER_FEE = 1.00      # Per order
    FOOD_RESTAURANT_FEE = 1.00   # Per restaurant in order
    FOOD_DRIVER_FEE = 0.00       # FREE - no commission
    FOOD_TIP_FEE = 0.00          # 100% goes to driver

    # Rideshare Matchmaking
    RIDE_CUSTOMER_FEE = 1.00     # Per ride (rider pays)
    RIDE_DRIVER_FEE = 1.00       # Per ride (platform access)
    RIDE_TIP_FEE = 0.00          # 100% goes to driver

    @classmethod
    def calculate_food_order_fees(cls, restaurant_count: int = 1):
        """Calculate fees for food order."""
        return {
            "customer_fee": cls.FOOD_CUSTOMER_FEE,
            "restaurant_fees": cls.FOOD_RESTAURANT_FEE * restaurant_count,
            "driver_fee": cls.FOOD_DRIVER_FEE,
            "total_platform_revenue": cls.FOOD_CUSTOMER_FEE + (cls.FOOD_RESTAURANT_FEE * restaurant_count),
        }

    @classmethod
    def calculate_ride_fees(cls):
        """Calculate fees for ride."""
        return {
            "rider_fee": cls.RIDE_CUSTOMER_FEE,
            "driver_fee": cls.RIDE_DRIVER_FEE,
            "total_platform_revenue": cls.RIDE_CUSTOMER_FEE + cls.RIDE_DRIVER_FEE,
        }
```

### Fee Display in Apps
```
Food Order Receipt:
─────────────────────────────────
Subtotal                   $45.00
Delivery Fee (to driver)    $5.99
Matchmaking Fee             $1.00  ← Platform fee
Tip (100% to driver)        $5.00
─────────────────────────────────
Total                      $56.99

Ride Receipt:
─────────────────────────────────
Ride Fare (to driver)      $15.00
Matchmaking Fee             $1.00  ← Platform fee
Tip (100% to driver)        $3.00
─────────────────────────────────
Total                      $19.00
```

---

## PHASE 2 COMPLETION DETAILS

### CQRS Order Service Implementation
| Component | File | Description |
|-----------|------|-------------|
| **Commands** | `services/core/order-service/cqrs/commands.py` | 7 command handlers |
| **Queries** | `services/core/order-service/cqrs/queries.py` | 7 query handlers with ES support |
| **Projections** | `services/core/order-service/cqrs/projections.py` | Elasticsearch + Redis projections |
| **Event Projector** | `services/core/order-service/event_projector.py` | Kafka consumer for read models |
| **Main Service** | `services/core/order-service/main.py` | FastAPI with CQRS endpoints |

### Command Types
```
CreateOrderCommand, UpdateOrderCommand, UpdateOrderStatusCommand,
AssignDriverCommand, CancelOrderCommand, UpdatePaymentStatusCommand,
UpdateDriverLocationCommand
```

### Query Types
```
GetOrderQuery, GetCustomerOrdersQuery, GetRestaurantOrdersQuery,
GetDriverOrdersQuery, SearchOrdersQuery, TrackOrderQuery, GetOrderStatsQuery
```

### Event Types
```
ORDER_CREATED, ORDER_UPDATED, ORDER_CONFIRMED, ORDER_PREPARING,
ORDER_READY, ORDER_PICKED_UP, ORDER_DELIVERED, ORDER_CANCELLED,
DRIVER_ASSIGNED, PAYMENT_PROCESSED
```

### Run Order Service with CQRS
```bash
# Start infrastructure
cd services && docker-compose up -d postgres redis kafka kafka-ui elasticsearch

# Run order service with event projector
cd services/core/order-service
ENABLE_EVENT_PROJECTOR=true uvicorn main:app --host 0.0.0.0 --port 8005

# Check CQRS health
curl http://localhost:8005/api/orders/health/cqrs
```

---

## PHASE 3 COMPLETION DETAILS

### Real-Time Location System Implementation
| Component | File | Description |
|-----------|------|-------------|
| **H3 Spatial Index** | `services/core/location-service/h3_index.py` | Uber-style hexagonal grid |
| **WebSocket Server** | `services/core/location-service/websocket_server.py` | Real-time broadcasts |
| **Driver Matching** | `services/core/location-service/driver_matching.py` | Intelligent scoring algorithm |
| **Integration** | `services/core/location-service/realtime.py` | FastAPI router factory |

### H3 Hexagonal Grid Features
```
Resolution 9 (Default):
- Cell size: ~0.1 km² (neighborhood level)
- Perfect for delivery/rideshare operations
- Used by Uber, DoorDash, Lyft

Key Functions:
- lat_lng_to_h3(): Convert GPS to H3 index
- get_h3_neighbors(): K-ring neighbor search
- H3SpatialIndex: Redis-backed driver index
```

### WebSocket Message Types
```
Client → Server:
- subscribe_order: Track order updates
- subscribe_driver: Track driver location
- unsubscribe: Stop tracking
- ping: Keep-alive

Server → Client:
- location_update: Driver position changed
- order_status_update: Order status changed
- driver_assigned: Driver matched to order
- eta_update: ETA recalculated
```

### Driver Matching Algorithm
```
Score = 0.40 × Distance + 0.25 × ETA + 0.15 × Rating + 0.10 × Acceptance + 0.10 × Load

Factors:
- Distance: Exponential decay (closer = higher score)
- ETA: Linear decay from max
- Rating: Normalized 1-5 to 0-1
- Acceptance Rate: Direct (0-1)
- Load Balance: Fewer orders today = higher score
```

### API Endpoints (Real-Time)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/realtime/location` | POST | Update driver location |
| `/api/realtime/match` | POST | Find best driver for order |
| `/api/realtime/h3/cell` | GET | Get H3 cell info |
| `/api/realtime/h3/coverage` | GET | Get coverage GeoJSON |
| `/api/realtime/surge` | POST | Calculate surge pricing |
| `/ws/{client_id}` | WS | Real-time WebSocket |

### Run Location Service with Real-Time Features
```bash
# Start infrastructure
cd services && docker-compose up -d postgres redis kafka kafka-ui

# Run location service
cd services/core/location-service
ENABLE_REALTIME=true uvicorn main:app --host 0.0.0.0 --port 8007

# Test H3 cell lookup
curl "http://localhost:8007/api/realtime/h3/cell?latitude=37.7749&longitude=-122.4194"

# Test driver matching
curl -X POST http://localhost:8007/api/realtime/match \
  -H "Content-Type: application/json" \
  -d '{"order_id":1,"pickup_latitude":37.7749,"pickup_longitude":-122.4194,"dropoff_latitude":37.8,"dropoff_longitude":-122.4}'

# WebSocket connection (via wscat)
wscat -c ws://localhost:8007/ws/customer_123
```

---

## PHASE 4 COMPLETION DETAILS

### Analytics Pipeline Implementation
| Component | File | Description |
|-----------|------|-------------|
| **ClickHouse Setup** | `services/analytics/clickhouse/init/*.sql` | Database and table schemas |
| **Analytics Service** | `services/core/analytics-service/main.py` | FastAPI with ClickHouse client |
| **Event Consumer** | `services/core/analytics-service/main.py` | Kafka consumer for event ingestion |
| **Materialized Views** | `analytics/clickhouse/init/03_materialized_views.sql` | Pre-aggregated metrics |

### ClickHouse Time-Series Tables
```
dollor_events.order_events       - Order lifecycle events
dollor_events.ride_events        - Ride lifecycle events
dollor_events.payment_events     - Payment transactions
dollor_events.driver_locations   - High-frequency GPS updates (30-day retention)
dollor_events.user_activity      - User behavior tracking
dollor_events.search_events      - Search queries (for recommendations)
```

### Materialized Views (Pre-aggregated Metrics)
```
dollor_analytics.orders_hourly         - Hourly order aggregates by restaurant/H3 cell
dollor_analytics.orders_daily          - Daily order aggregates with revenue
dollor_analytics.rides_hourly          - Hourly ride aggregates with surge data
dollor_analytics.driver_activity_hourly - Driver online time and movement
dollor_analytics.payments_daily        - Daily payment transaction summaries
dollor_analytics.h3_heatmap_hourly     - Demand/supply heatmap by H3 cell
dollor_analytics.platform_metrics_minute - Real-time platform health
```

### Analytics Service Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/realtime` | GET | Real-time dashboard metrics |
| `/api/dashboard/orders/hourly` | GET | Hourly order charts |
| `/api/dashboard/rides/hourly` | GET | Hourly ride charts |
| `/api/bi/orders/summary` | GET | Order BI summary |
| `/api/bi/restaurants/top` | GET | Top restaurants by revenue/orders |
| `/api/bi/drivers/top` | GET | Top drivers by deliveries |
| `/api/bi/revenue/daily` | GET | Daily revenue breakdown |
| `/api/heatmap/demand` | GET | Demand heatmap by H3 cells |
| `/api/heatmap/drivers` | GET | Driver distribution heatmap |
| `/api/bi/funnel/orders` | GET | Order funnel analysis |
| `/api/bi/cohort/retention` | GET | Customer retention cohorts |
| `/api/export/orders` | GET | Export order data (JSON/CSV) |

### Docker Services (Updated)
```bash
# Start full stack with analytics
cd services && docker-compose up -d postgres redis kafka clickhouse analytics-service

# ClickHouse HTTP Interface: http://localhost:8123
# Analytics Service API: http://localhost:8016
```

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| ClickHouse | dollor-clickhouse | 8123 (HTTP), 9000 (Native) | Time-series analytics |
| Analytics Service | dollor-analytics-service | 8016 | Dashboard & BI API |

### Run Analytics Service
```bash
# Start infrastructure
cd services && docker-compose up -d postgres redis kafka clickhouse

# Run analytics service
cd services/core/analytics-service
ENABLE_KAFKA=true uvicorn main:app --host 0.0.0.0 --port 8016

# Test dashboard endpoint
curl http://localhost:8016/api/dashboard/realtime

# Test BI query
curl "http://localhost:8016/api/bi/orders/summary?start=2025-01-01&end=2025-12-31"

# Test heatmap
curl "http://localhost:8016/api/heatmap/demand?hours=6"

# Export orders to CSV
curl "http://localhost:8016/api/export/orders?format=csv" > orders.csv
```

### Kafka Event Ingestion
The analytics service consumes events from Kafka topics and inserts into ClickHouse:
```
orders.events    → dollor_events.order_events
rides.events     → dollor_events.ride_events
payments.events  → dollor_events.payment_events
drivers.location → dollor_events.driver_locations
```

### Data Retention Policies
| Table | Retention | Reason |
|-------|-----------|--------|
| `order_events` | 2 years | Financial/legal requirements |
| `ride_events` | 2 years | Financial/legal requirements |
| `payment_events` | 3 years | Tax/compliance |
| `driver_locations` | 30 days | High volume, operational use only |
| `user_activity` | 1 year | Behavior analytics |
| `search_events` | 6 months | Recommendation training |
| `platform_metrics_minute` | 7 days | Real-time monitoring only |

---

## PHASE 5 COMPLETION DETAILS - PRODUCTION READY

### P2P Backend Enhancements

#### WebSocket Server (`websocket_server.py`)
Real-time updates for order/ride tracking, driver location, and chat messages.

```python
# Connection Types
customer_{id}   # Customer app connections
driver_{id}     # Driver app connections
restaurant_{id} # Restaurant app connections

# Topics for Subscription
order:{order_id}      # Track specific order
ride:{ride_id}        # Track specific ride
driver:{driver_id}    # Track driver location
chat:{conversation_id} # Chat messages
```

**WebSocket Events:**
| Event | Direction | Purpose |
|-------|-----------|---------|
| `order_status_update` | Server→Client | Order status changed |
| `driver_location_update` | Server→Client | Driver GPS update |
| `ride_status_update` | Server→Client | Ride status changed |
| `eta_update` | Server→Client | ETA recalculated |
| `chat_message` | Bidirectional | Chat messaging |
| `subscribe` | Client→Server | Subscribe to topic |
| `ping/pong` | Bidirectional | Keep-alive |

#### Push Notification Service (`push_notification_service.py`)
Supports both FCM (Android) and APNs (iOS).

**Notification Types:**
```
Order: ORDER_PLACED, ORDER_CONFIRMED, ORDER_PREPARING, ORDER_READY,
       ORDER_PICKED_UP, ORDER_DELIVERED, ORDER_CANCELLED

Ride:  RIDE_REQUESTED, RIDE_ACCEPTED, DRIVER_ARRIVING,
       RIDE_STARTED, RIDE_COMPLETED, RIDE_CANCELLED

Driver: NEW_DELIVERY_AVAILABLE, NEW_RIDE_REQUEST, EARNINGS_UPDATED,
        DOCUMENT_APPROVED, DOCUMENT_REJECTED

Restaurant: NEW_ORDER, ORDER_ACCEPTED_BY_DRIVER
```

**Environment Variables Required:**
```bash
FCM_SERVER_KEY=...        # Firebase Cloud Messaging
APNS_KEY_ID=...           # Apple Push Notification
APNS_TEAM_ID=...          # Apple Developer Team ID
APNS_AUTH_KEY_PATH=...    # Path to .p8 file
```

#### Legal Document API Endpoints
```
GET /api/legal/terms    # Returns Terms of Service summary + URL
GET /api/legal/privacy  # Returns Privacy Policy summary + URL
```

Response includes:
- Service type: "Matchmaking Platform"
- Pricing model: $1+$1 flat fees
- Key legal points
- Last updated date
- Contact information

#### Demo Accounts Endpoint
```
POST /api/demo/setup    # Creates demo accounts for App Store review
```

Creates:
| Account | Email | Password |
|---------|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

### Microservice Proxy Endpoints

The P2P backend now proxies requests to microservices with fallback mock data:

```
/api/erp/rides/*           → ride-service:8014/api/rides/*
/api/erp/restaurants/*     → restaurant-service:8004/api/restaurants/*
```

**Proxy Endpoints Added:**
| Endpoint | Method | Microservice |
|----------|--------|--------------|
| `/api/erp/rides` | GET | ride-service |
| `/api/erp/rides/{id}/eta` | GET | ride-service |
| `/api/erp/rides/active-count` | GET | ride-service |
| `/api/erp/rides/request` | POST | ride-service |
| `/api/erp/rides/{id}/cancel` | POST | ride-service |
| `/api/erp/restaurants` | GET | restaurant-service |
| `/api/erp/restaurants/nearby` | GET | restaurant-service |
| `/api/erp/restaurants/{id}` | GET | restaurant-service |
| `/api/erp/restaurants/{id}/menu` | GET | restaurant-service |

**Fallback Behavior:**
When microservices are unavailable, proxy endpoints return mock data allowing development/testing without all services running.

### API Gateway Configuration

**Location:** `infrastructure/kubernetes/api-gateway/`

Files:
- `nginx.conf` - NGINX routing configuration
- `deployment.yaml` - Kubernetes deployment with HPA
- `kustomization.yaml` - Kustomize configuration

**Routing Rules:**
```nginx
/api/auth/*        → auth-service:8001
/api/rides/*       → ride-service:8014
/api/restaurants/* → restaurant-service:8004
/api/orders/*      → order-service:8005
/api/payments/*    → payment-service:8006
/api/locations/*   → location-service:8007
/ws/*              → p2p-backend:8080 (WebSocket)
/api/erp/*         → p2p-backend:8080 (with proxy)
```

**Rate Limiting:**
- API endpoints: 100 req/s per IP
- Auth endpoints: 10 req/s per IP (brute force protection)

### Backend Test Results (21/21 Passing ✓)

```
CORE INFRASTRUCTURE
✓ API Health Check
✓ WebSocket Stats

LEGAL & COMPLIANCE
✓ Terms of Service API (Matchmaking Platform, $1 fees)
✓ Privacy Policy API

DEMO ACCOUNTS
✓ Create Demo Accounts (customer, driver, restaurant)

CUSTOMER AUTHENTICATION
✓ Register Customer
✓ iOS Login (/api/customer/login)
✓ Standard Login (/api/auth/customer/login)

DRIVER AUTHENTICATION
✓ Register Driver

VENDOR/RESTAURANT AUTHENTICATION
✓ Register Vendor

RIDESHARE MATCHMAKING
✓ Fare Estimate ($1.00 platform fee, driver earnings calculated)
✓ List Rides (Proxy)
✓ Active Rides Count (Proxy)
✓ Get Ride ETA (Proxy)

FOOD DELIVERY
✓ List Restaurants (Proxy)
✓ Nearby Restaurants (Proxy)
✓ Restaurant Details (Proxy)
✓ Restaurant Menu (Proxy)

ORDER TRACKING & RATING
✓ Full Order Tracking
✓ Rate Ride/Delivery

PUSH NOTIFICATIONS
✓ Register Push Token
```

### Docker Commands

```bash
# Build P2P Backend
cd apps/web/p2p-platform/backend
docker build -t dollor-p2p-backend:latest .

# Run P2P Backend
docker run -d --name dollor-p2p-backend \
  -p 8080:8080 \
  --network=services_dollor-network \
  -e DATABASE_URL=postgresql://dollor:dollor_dev_password@dollor-postgres:5432/dollor \
  dollor-p2p-backend:latest

# Run Tests
python3 /tmp/test_comprehensive.py

# View Logs
docker logs dollor-p2p-backend -f
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Microservices (for proxy)
RIDE_SERVICE_URL=http://ride-service:8014
RESTAURANT_SERVICE_URL=http://restaurant-service:8004
PRICING_SERVICE_URL=http://pricing-service:8015
LOCATION_SERVICE_URL=http://location-service:8007

# Push Notifications
FCM_SERVER_KEY=...
APNS_KEY_ID=...
APNS_TEAM_ID=...
APNS_AUTH_KEY_PATH=...
APNS_BUNDLE_ID=com.eatfair.customer

# Stripe (Payment)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Pricing Model Implementation

The $1+$1 flat fee model is now fully implemented:

**Food Delivery:**
```
Customer pays:  Subtotal + Delivery Fee + $1 matchmaking fee + Tip
Restaurant pays: $1 platform listing fee (deducted from payout)
Driver receives: Delivery Fee + 100% of Tip (no platform fee)
Platform revenue: $2 per order ($1 from customer + $1 from restaurant)
```

**Rideshare:**
```
Rider pays:     Fare + $1 matchmaking fee + Tip
Driver receives: Fare - $1 platform access fee + 100% of Tip
Platform revenue: $2 per ride ($1 from rider + $1 from driver)
```

**Fare Estimate Response:**
```json
{
  "total_fare": 22.47,
  "fare_estimate": 22.47,
  "platform_fee": 1.00,
  "driver_earnings": 19.02,
  "base_fare": 5.00,
  "distance_fee": 12.45,
  "time_fee": 3.50,
  "tax_amount": 1.52,
  "distance_miles": 8.3,
  "duration_minutes": 20
}
```

---

## PHASE 7: PLATFORM UI PARITY

> **CRITICAL**: iOS, Android, and Web Customer apps now have identical UI screens.
> All features must work identically across platforms.

### Gap Analysis Results

Screen-by-screen comparison between iOS (40+ screens) and Android (45+ screens) customer apps revealed gaps that have been resolved.

### iOS Screens Added

| Screen | File | Description |
|--------|------|-------------|
| **WelcomeView** | `Views/WelcomeView.swift` | Animated onboarding with logo, feature highlights, Get Started button |
| **SettingsView** | `Views/SettingsView.swift` | Notification settings, language, legal pages, bug report, account deletion |
| **ReferAndEarnView** | `Views/ReferAndEarnView.swift` | Referral program with share/copy code, stats, rewards tiers |
| **LegalAcceptanceView** | `Views/LegalAcceptanceView.swift` | Terms and Privacy acceptance for App Store compliance |

**WelcomeView Features:**
- Animated gold dollar sign logo with pulsing effect
- Three feature highlights (Low Fees, Fast Delivery, 100% Tips to Drivers)
- "Get Started" button with gradient background
- "Already have an account?" sign in link
- $1 flat fee messaging
- Matches Android WelcomeScreen exactly

**SettingsView Features:**
- Push notifications toggle
- Email notifications toggle
- SMS notifications toggle
- Language selection (English, Spanish, Chinese, French, Hindi, Japanese)
- Privacy Policy navigation
- Terms of Service navigation
- Report a Bug with feedback email
- Delete Account with confirmation flow

**ReferAndEarnView Features:**
- Unique referral code generation (DOLLOR + 4 chars)
- Copy to clipboard functionality
- Native share sheet integration
- Stats cards: Total Referrals, Pending Credits, Earned Credits
- How It Works steps (4-step process)
- Rewards milestones: Bronze (5), Silver (10), Gold (25)
- $5 per referral reward messaging

**LegalAcceptanceView Features:**
- Matchmaking service disclaimer
- Terms of Service link with checkbox
- Privacy Policy link with checkbox
- Both must be accepted to continue
- App Store/Play Store compliance ready

### Android Screens Added

| Screen | File | Description |
|--------|------|-------------|
| **MenuItemCustomizationDialog** | `ui/restaurant/MenuItemCustomizationDialog.kt` | Item customization modal with quantity, options, special instructions |
| **OrderSuccessScreen** | `ui/order/OrderSuccessScreen.kt` | Order confirmation with confetti animation, order details, action buttons |
| **HelpSupportScreen** | `ui/help/HelpSupportScreen.kt` | Help center with FAQ categories, search, contact options |

**MenuItemCustomizationDialog Features:**
- Item image display
- Quantity selector (+/-)
- Customization options (toppings, sizes, etc.)
- Special instructions text field
- Price calculation with add-ons
- Add to Cart button with total
- Bottom sheet modal presentation

**OrderSuccessScreen Features:**
- Animated checkmark with spring animation
- Confetti overlay (50 particles, 4-second duration)
- Order details card (Order ID, Restaurant, Items, Total)
- Estimated delivery time highlight
- "Track My Order" primary button
- "Rate Your Experience" secondary button
- "Continue Shopping" text link
- Matches iOS OrderSuccessView exactly

**HelpSupportScreen Features:**
- Search bar with clear functionality
- Contact Us section (Chat, Email, Phone)
- FAQ categories: All, Orders, Payments, Account, Delivery
- Category filter chips with selection state
- 10 FAQ items with expandable answers
- Animated expand/collapse for FAQ items
- "Still need help?" card with CTA
- 24/7 support messaging

### Web Screens Added

| Screen | File | Description |
|--------|------|-------------|
| **HelpSupport** | `screens/public/HelpSupport.tsx` | Full-featured help center with FAQ, search, contact options |
| **ReferAndEarn** | `screens/public/ReferAndEarn.tsx` | Referral program page with code sharing, stats, rewards milestones |

**HelpSupport.tsx Features:**
- Hero section with search bar
- Contact cards (Live Chat, Email Support, Phone Support)
- Category filter buttons
- Ant Design Collapse component for FAQ
- Category badges on FAQ items
- "Still need help?" CTA card
- Responsive mobile design

**ReferAndEarn.tsx Features:**
- Hero section with gift icon
- Referral code display with copy button
- Share with Friends button (native share API)
- Stats row: Total Referrals, Pending Credits, Earned Credits
- How It Works steps (Ant Design Steps component)
- Rewards milestones with tier badges
- Terms note with 90-day expiry info

### Web Routes Added

| Route | Component | Purpose |
|-------|-----------|---------|
| `/help` | HelpSupport | Help center |
| `/support` | HelpSupport | Alias for help |
| `/refer` | ReferAndEarn | Referral program |
| `/referral` | ReferAndEarn | Alias for refer |

### Navigation Updates

**iOS ProfileView.swift:**
- Added Settings navigation link
- Added Refer & Earn navigation link
- Consistent navigation with Android

**Android Navigation.kt:**
- Added `Screen.HelpSupport` route
- Added `Screen.OrderSuccess` route with order data parameters

**Android NavigationGraph.kt:**
- Added HelpSupportScreen composable
- Added OrderSuccessScreen composable with navigation parameters
- Added imports for new screens

### API Service Verification

Both iOS (`P2PAPIService.swift`) and Android (`DollorApiService.kt`) API services are aligned:

| Endpoint Category | iOS | Android | Status |
|-------------------|-----|---------|--------|
| Customer Auth | ✓ | ✓ | Identical |
| Driver Auth | ✓ | ✓ | Identical |
| Restaurant Auth | ✓ | ✓ | Identical |
| Orders | ✓ | ✓ | Identical |
| Tracking | ✓ | ✓ | Identical |
| Driver Profile | ✓ | ✓ | Identical |
| Location Updates | ✓ | ✓ | Identical |
| Ratings | ✓ | ✓ | Identical |

### Pricing Parity

All platforms display consistent pricing:
- $1 flat matchmaking fee for food delivery
- $1/$2/$3 tiered fees for rideshare (based on fare amount)
- 100% tips to drivers messaging
- Transparent fee breakdown

### Testing Checklist

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Welcome/Onboarding | ✓ | ✓ | N/A |
| Settings | ✓ | ✓ | N/A |
| Refer & Earn | ✓ | ✓ | ✓ |
| Help & Support | ✓ | ✓ | ✓ |
| Order Success | ✓ | ✓ | N/A |
| Menu Customization | ✓ | ✓ | N/A |
| Legal Acceptance | ✓ | ✓ | N/A |

### File Paths Reference

**iOS (eatfair-ios):**
```
apps/ios/customer/eatfaircustomer/Views/
├── WelcomeView.swift
├── SettingsView.swift
├── ReferAndEarnView.swift
├── LegalAcceptanceView.swift
└── ProfileView.swift (updated)
```

**Android (eatfair-android):**
```
app/src/main/java/com/eatfair/app/ui/
├── help/
│   └── HelpSupportScreen.kt
├── order/
│   └── OrderSuccessScreen.kt
├── restaurant/
│   └── MenuItemCustomizationDialog.kt
└── navigation/
    ├── Navigation.kt (updated)
    └── NavigationGraph.kt (updated)
```

**Web (p2p-platform):**
```
apps/web/p2p-platform/frontend/src/app/
├── screens/public/
│   ├── HelpSupport.tsx
│   └── ReferAndEarn.tsx
└── App.tsx (updated with routes)
```

---
