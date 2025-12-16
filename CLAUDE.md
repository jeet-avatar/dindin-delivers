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
│   ├── services/                   # MICROSERVICES (Migration Target)
│   │   ├── shared/common/          # Shared libraries
│   │   │   ├── errors/             # Error codes
│   │   │   ├── logging/            # Structured logging
│   │   │   ├── tracing/            # OpenTelemetry
│   │   │   ├── metrics/            # Prometheus
│   │   │   └── health/             # Health checks
│   │   │
│   │   └── core/                   # Core microservices (to be implemented)
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

---

## MICROSERVICES ARCHITECTURE (Target State)

### Service Catalog
| Service | Port | Domain | Responsibility |
|---------|------|--------|----------------|
| **auth-service** | 8001 | Both | Authentication, JWT, OAuth |
| **user-service** | 8002 | Both | Customer/Rider profiles |
| **driver-service** | 8003 | Both | Driver profiles, documents |
| **restaurant-service** | 8004 | Food | Restaurant profiles |
| **food-order-service** | 8005 | Food | Food order lifecycle |
| **payment-service** | 8006 | Both | Stripe, payouts, refunds |
| **location-service** | 8007 | Both | Real-time tracking |
| **menu-service** | 8008 | Food | Menu management |
| **notification-service** | 8009 | Both | Push, SMS, Email |
| **rating-service** | 8013 | Both | Reviews, ratings |
| **ride-service** | 8014 | Rideshare | Ride requests, matching |
| **pricing-service** | 8015 | Rideshare | Surge, fare calculation |

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

### PHASE 6: NEXT
6. **App Store Submission**
   - [ ] Submit Customer iOS app
   - [ ] Submit Driver iOS app
   - [ ] Submit Restaurant iOS app
   - [ ] Submit Android apps to Play Store
   - [ ] Respond to App Store review feedback

### PHASE 7: POST-LAUNCH
7. **Production Monitoring**
   - [ ] Set up production Kubernetes cluster
   - [ ] Configure production database (RDS)
   - [ ] Set up CloudWatch monitoring
   - [ ] Configure alerts and PagerDuty
   - [ ] Load testing and optimization

8. **Feature Expansion**
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

*Last Updated: December 15, 2025*
*AI Employee: TechCloudPro Claude Instance*
*Platform: Dollor.ai (Food Delivery + Rideshare Matchmaking Service)*
*Status: Phase 5 Complete - Production Ready*
*Business Model: Flat $1 Matchmaking Fee (No Commission)*
*Legal Status: Matchmaking Service (Phase 1)*
*All Backend Tests: 21/21 Passing ✓*
*Next: App Store Submission*

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
# .github/workflows/security-scan.yml
name: Security Scan Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: .semgrep.yml p/security-audit p/owasp-top-ten
          generateSarif: true
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: semgrep.sarif

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
# Semgrep
pip install semgrep
semgrep --config .semgrep.yml --config p/security-audit .

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
