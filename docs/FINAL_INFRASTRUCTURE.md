# DOLLOR.AI - FINAL INFRASTRUCTURE ARCHITECTURE

> **Version:** 1.0.0
> **Last Updated:** December 2024
> **Status:** Production Ready

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [Application Ecosystem](#2-application-ecosystem)
3. [Microservices Architecture](#3-microservices-architecture)
4. [Infrastructure Components](#4-infrastructure-components)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Observability Stack](#6-observability-stack)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Strategy](#8-deployment-strategy)
9. [Auto-Scaling Configuration](#9-auto-scaling-configuration)
10. [Error Codes & Debugging](#10-error-codes--debugging)
11. [File Reference](#11-file-reference)

---

## 1. PLATFORM OVERVIEW

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────────┤
│  iOS        │  iOS        │  iOS        │  Web        │  TechCloudPro      │
│  Customer   │  Delivery   │  Restaurant │  P2P Portal │  AI Portal         │
│  App        │  App        │  App        │  (React)    │  (React)           │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────────┬──────────┘
       │             │             │             │                │
       └─────────────┴─────────────┴─────────────┴────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       API GATEWAY           │
                    │   (Kong / AWS API Gateway)  │
                    │   - Rate Limiting           │
                    │   - Authentication          │
                    │   - Load Balancing          │
                    │   - Request Routing         │
                    └──────────────┬──────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
┌──────▼──────┐  ┌────────────────▼────────────────┐  ┌───────▼───────┐
│   SHARED    │  │      CORE MICROSERVICES         │  │   SUPPORT     │
│  SERVICES   │  │                                  │  │  SERVICES     │
├─────────────┤  ├──────────────────────────────────┤  ├───────────────┤
│ Auth        │  │ User Service                     │  │ Notification  │
│ Service     │  │ Driver Service                   │  │ Service       │
│             │  │ Restaurant Service               │  │               │
│ Config      │  │ Order Service                    │  │ Email         │
│ Service     │  │ Payment Service                  │  │ Service       │
│             │  │ Location Service                 │  │               │
│ Discovery   │  │ Menu Service                     │  │ Document      │
│ Service     │  │ Rating Service                   │  │ Service       │
│             │  │ Analytics Service                │  │               │
└──────┬──────┘  └─────────────────┬────────────────┘  └───────┬───────┘
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
      ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
      │   PostgreSQL  │   │     Redis     │   │  Elasticsearch│
      │   (Primary)   │   │   (Cache)     │   │   (Search)    │
      └───────────────┘   └───────────────┘   └───────────────┘
```

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| **Mobile** | Swift (iOS), SwiftUI |
| **Web Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **API Gateway** | Kong / AWS API Gateway |
| **Backend Services** | Python 3.11, FastAPI |
| **Message Queue** | RabbitMQ / AWS SQS |
| **Cache** | Redis 7 |
| **Database** | PostgreSQL 15 |
| **Search** | Elasticsearch 8 |
| **Container Runtime** | Docker, containerd |
| **Orchestration** | Kubernetes (EKS) |
| **Service Mesh** | Istio (optional) |
| **CI/CD** | GitHub Actions |
| **GitOps** | ArgoCD |
| **Observability** | OpenTelemetry, Prometheus, Grafana, Loki |

---

## 2. APPLICATION ECOSYSTEM

### 2.1 Applications Overview

```
apps/
├── ios/
│   ├── customer/              # iOS Customer App
│   │   └── Features: Browse, Order, Track, Pay, Rate
│   │
│   ├── delivery/              # iOS Delivery App
│   │   └── Features: Accept orders, Navigate, Deliver, Earnings
│   │
│   ├── restaurant/            # iOS Restaurant App
│   │   └── Features: Manage orders, Menu, Analytics
│   │
│   └── eatfair-ios-shared/    # Shared iOS Library
│       └── Features: Auth, Networking, Models, Utils
│
├── web/
│   └── p2p-platform/
│       ├── frontend/          # P2P Web Portal (React)
│       │   └── Features: Admin, Restaurant Portal, Driver Portal
│       │
│       └── backend/           # Backend API (to be split into microservices)
│
└── techcloudpro/              # TechCloudPro Website (AI Employees)
    └── Features: AI Agent Management, Analytics, Workflows
```

### 2.2 App-to-Service Mapping

| Application | Primary Services Used |
|-------------|----------------------|
| **iOS Customer** | Auth, User, Restaurant, Menu, Order, Payment, Location, Rating |
| **iOS Delivery** | Auth, Driver, Order, Location, Payment, Notification |
| **iOS Restaurant** | Auth, Restaurant, Menu, Order, Analytics |
| **P2P Web Portal** | All Services (Admin) |
| **TechCloudPro** | Auth, AI Agent Service, Analytics |

---

## 3. MICROSERVICES ARCHITECTURE

### 3.1 Service Catalog

```
services/
├── shared/
│   ├── auth-service/          # Authentication & Authorization
│   ├── config-service/        # Centralized Configuration
│   └── discovery-service/     # Service Discovery
│
├── core/
│   ├── user-service/          # Customer Management
│   ├── driver-service/        # Driver Management
│   ├── restaurant-service/    # Restaurant Management
│   ├── order-service/         # Order Lifecycle
│   ├── payment-service/       # Payment Processing
│   ├── location-service/      # Real-time Tracking
│   ├── menu-service/          # Menu & Catalog
│   └── rating-service/        # Reviews & Ratings
│
├── support/
│   ├── notification-service/  # Push, SMS, In-App
│   ├── email-service/         # Email Delivery
│   ├── document-service/      # Document Processing
│   └── analytics-service/     # Metrics & Reporting
│
└── ai/
    └── ai-agent-service/      # TechCloudPro AI Agents
```

### 3.2 Service Details

#### AUTH-SERVICE (Shared)
```yaml
# SERVICE: auth-service
# PORT: 8001
# ERROR_CODE_PREFIX: AUTH

Responsibilities:
  - User authentication (email/password, OAuth, Apple Sign-In)
  - JWT token management
  - Role-based access control (RBAC)
  - Session management
  - Multi-tenant support

Endpoints:
  POST /auth/register           # AUTH-001 to AUTH-010
  POST /auth/login              # AUTH-011 to AUTH-020
  POST /auth/logout             # AUTH-021 to AUTH-025
  POST /auth/refresh            # AUTH-026 to AUTH-030
  POST /auth/forgot-password    # AUTH-031 to AUTH-040
  POST /auth/reset-password     # AUTH-041 to AUTH-050
  POST /auth/verify-email       # AUTH-051 to AUTH-060
  POST /auth/oauth/google       # AUTH-061 to AUTH-070
  POST /auth/oauth/apple        # AUTH-071 to AUTH-080
  GET  /auth/me                 # AUTH-081 to AUTH-090

Database: auth_db (PostgreSQL)
Cache: Redis (sessions, tokens)
Dependencies: Email Service
```

#### USER-SERVICE (Core)
```yaml
# SERVICE: user-service
# PORT: 8002
# ERROR_CODE_PREFIX: USR

Responsibilities:
  - Customer profile management
  - Address management
  - Preferences & settings
  - Favorite restaurants

Endpoints:
  GET    /users/{id}            # USR-001 to USR-010
  PUT    /users/{id}            # USR-011 to USR-020
  DELETE /users/{id}            # USR-021 to USR-030
  GET    /users/{id}/addresses  # USR-031 to USR-040
  POST   /users/{id}/addresses  # USR-041 to USR-050
  GET    /users/{id}/favorites  # USR-051 to USR-060
  POST   /users/{id}/favorites  # USR-061 to USR-070

Database: user_db (PostgreSQL)
Dependencies: Auth Service
```

#### DRIVER-SERVICE (Core)
```yaml
# SERVICE: driver-service
# PORT: 8003
# ERROR_CODE_PREFIX: DRV

Responsibilities:
  - Driver profile management
  - Document verification
  - Vehicle management
  - Availability status
  - Earnings tracking

Endpoints:
  GET    /drivers/{id}                    # DRV-001 to DRV-010
  PUT    /drivers/{id}                    # DRV-011 to DRV-020
  POST   /drivers/register                # DRV-021 to DRV-030
  GET    /drivers/{id}/documents          # DRV-031 to DRV-040
  POST   /drivers/{id}/documents          # DRV-041 to DRV-050
  PUT    /drivers/{id}/documents/{docId}  # DRV-051 to DRV-060
  GET    /drivers/{id}/vehicle            # DRV-061 to DRV-070
  PUT    /drivers/{id}/vehicle            # DRV-071 to DRV-080
  PUT    /drivers/{id}/status             # DRV-081 to DRV-090
  GET    /drivers/{id}/earnings           # DRV-091 to DRV-100

Database: driver_db (PostgreSQL)
Dependencies: Auth, Document, Location Service
```

#### RESTAURANT-SERVICE (Core)
```yaml
# SERVICE: restaurant-service
# PORT: 8004
# ERROR_CODE_PREFIX: RST

Responsibilities:
  - Restaurant profile management
  - Business hours
  - Service areas
  - Restaurant verification

Endpoints:
  GET    /restaurants                     # RST-001 to RST-010
  GET    /restaurants/{id}                # RST-011 to RST-020
  POST   /restaurants                     # RST-021 to RST-030
  PUT    /restaurants/{id}                # RST-031 to RST-040
  GET    /restaurants/{id}/hours          # RST-041 to RST-050
  PUT    /restaurants/{id}/hours          # RST-051 to RST-060
  GET    /restaurants/nearby              # RST-061 to RST-070
  PUT    /restaurants/{id}/status         # RST-071 to RST-080

Database: restaurant_db (PostgreSQL)
Dependencies: Auth, Location, Menu Service
```

#### ORDER-SERVICE (Core)
```yaml
# SERVICE: order-service
# PORT: 8005
# ERROR_CODE_PREFIX: ORD

Responsibilities:
  - Order creation & management
  - Order status lifecycle
  - Order history
  - Order assignment to drivers

Endpoints:
  POST   /orders                          # ORD-001 to ORD-010
  GET    /orders/{id}                     # ORD-011 to ORD-020
  PUT    /orders/{id}/status              # ORD-021 to ORD-030
  GET    /orders/user/{userId}            # ORD-031 to ORD-040
  GET    /orders/driver/{driverId}        # ORD-041 to ORD-050
  GET    /orders/restaurant/{restaurantId}# ORD-051 to ORD-060
  PUT    /orders/{id}/assign              # ORD-061 to ORD-070
  PUT    /orders/{id}/cancel              # ORD-071 to ORD-080
  GET    /orders/{id}/track               # ORD-081 to ORD-090

Database: order_db (PostgreSQL)
Message Queue: RabbitMQ (order events)
Dependencies: User, Driver, Restaurant, Payment, Location, Notification Service
```

#### PAYMENT-SERVICE (Core)
```yaml
# SERVICE: payment-service
# PORT: 8006
# ERROR_CODE_PREFIX: PAY

Responsibilities:
  - Payment processing (Stripe)
  - Payment methods management
  - Driver payouts
  - Refunds
  - Transaction history

Endpoints:
  POST   /payments/process                # PAY-001 to PAY-010
  GET    /payments/{id}                   # PAY-011 to PAY-020
  POST   /payments/methods                # PAY-021 to PAY-030
  GET    /payments/methods/{userId}       # PAY-031 to PAY-040
  DELETE /payments/methods/{id}           # PAY-041 to PAY-050
  POST   /payments/refund                 # PAY-051 to PAY-060
  POST   /payments/payout                 # PAY-061 to PAY-070
  GET    /payments/history/{userId}       # PAY-071 to PAY-080

Database: payment_db (PostgreSQL)
External: Stripe API
Dependencies: Order Service
```

#### LOCATION-SERVICE (Core)
```yaml
# SERVICE: location-service
# PORT: 8007
# ERROR_CODE_PREFIX: LOC

Responsibilities:
  - Real-time driver location tracking
  - Geofencing
  - Distance calculation
  - ETA estimation
  - Nearby search

Endpoints:
  PUT    /location/driver/{id}            # LOC-001 to LOC-010
  GET    /location/driver/{id}            # LOC-011 to LOC-020
  GET    /location/order/{orderId}        # LOC-021 to LOC-030
  GET    /location/nearby/drivers         # LOC-031 to LOC-040
  GET    /location/nearby/restaurants     # LOC-041 to LOC-050
  GET    /location/distance               # LOC-051 to LOC-060
  GET    /location/eta                    # LOC-061 to LOC-070
  WebSocket /location/track/{orderId}     # LOC-071 to LOC-080

Database: location_db (PostgreSQL + PostGIS)
Cache: Redis (real-time locations)
Dependencies: None (standalone)
```

#### MENU-SERVICE (Core)
```yaml
# SERVICE: menu-service
# PORT: 8008
# ERROR_CODE_PREFIX: MNU

Responsibilities:
  - Menu management
  - Item catalog
  - Categories
  - Modifiers & customizations
  - Pricing

Endpoints:
  GET    /menus/restaurant/{id}           # MNU-001 to MNU-010
  POST   /menus/restaurant/{id}           # MNU-011 to MNU-020
  PUT    /menus/{id}                      # MNU-021 to MNU-030
  GET    /menus/{id}/items                # MNU-031 to MNU-040
  POST   /menus/{id}/items                # MNU-041 to MNU-050
  PUT    /menus/items/{itemId}            # MNU-051 to MNU-060
  GET    /menus/{id}/categories           # MNU-061 to MNU-070
  PUT    /menus/items/{itemId}/available  # MNU-071 to MNU-080

Database: menu_db (PostgreSQL)
Cache: Redis (menu cache)
Dependencies: Restaurant Service
```

#### NOTIFICATION-SERVICE (Support)
```yaml
# SERVICE: notification-service
# PORT: 8009
# ERROR_CODE_PREFIX: NTF

Responsibilities:
  - Push notifications (APNs, FCM)
  - SMS notifications (Twilio)
  - In-app notifications
  - Notification preferences

Endpoints:
  POST   /notifications/push              # NTF-001 to NTF-010
  POST   /notifications/sms               # NTF-011 to NTF-020
  POST   /notifications/in-app            # NTF-021 to NTF-030
  GET    /notifications/user/{id}         # NTF-031 to NTF-040
  PUT    /notifications/{id}/read         # NTF-041 to NTF-050
  GET    /notifications/preferences/{id}  # NTF-051 to NTF-060
  PUT    /notifications/preferences/{id}  # NTF-061 to NTF-070

Database: notification_db (PostgreSQL)
External: APNs, FCM, Twilio
Message Queue: RabbitMQ (async delivery)
Dependencies: User, Driver Service
```

#### EMAIL-SERVICE (Support)
```yaml
# SERVICE: email-service
# PORT: 8010
# ERROR_CODE_PREFIX: EML

Responsibilities:
  - Transactional emails
  - Email templates
  - Email verification
  - Marketing emails (with consent)

Endpoints:
  POST   /email/send                      # EML-001 to EML-010
  POST   /email/template                  # EML-011 to EML-020
  GET    /email/templates                 # EML-021 to EML-030
  POST   /email/verify                    # EML-031 to EML-040
  GET    /email/status/{id}               # EML-041 to EML-050

Database: email_db (PostgreSQL)
External: AWS SES / SendGrid
Message Queue: RabbitMQ (async delivery)
Dependencies: None
```

#### DOCUMENT-SERVICE (Support)
```yaml
# SERVICE: document-service
# PORT: 8011
# ERROR_CODE_PREFIX: DOC

Responsibilities:
  - Document upload & storage
  - Document verification
  - OCR processing
  - ID verification

Endpoints:
  POST   /documents/upload                # DOC-001 to DOC-010
  GET    /documents/{id}                  # DOC-011 to DOC-020
  GET    /documents/driver/{driverId}     # DOC-021 to DOC-030
  PUT    /documents/{id}/verify           # DOC-031 to DOC-040
  DELETE /documents/{id}                  # DOC-041 to DOC-050
  POST   /documents/ocr                   # DOC-051 to DOC-060

Database: document_db (PostgreSQL)
Storage: AWS S3
External: ID verification API
Dependencies: Driver Service
```

#### ANALYTICS-SERVICE (Support)
```yaml
# SERVICE: analytics-service
# PORT: 8012
# ERROR_CODE_PREFIX: ANL

Responsibilities:
  - Business metrics
  - Real-time dashboards
  - Reports generation
  - Data aggregation

Endpoints:
  GET    /analytics/orders                # ANL-001 to ANL-010
  GET    /analytics/revenue               # ANL-011 to ANL-020
  GET    /analytics/drivers               # ANL-021 to ANL-030
  GET    /analytics/restaurants           # ANL-031 to ANL-040
  GET    /analytics/dashboard             # ANL-041 to ANL-050
  POST   /analytics/report                # ANL-051 to ANL-060

Database: analytics_db (PostgreSQL / ClickHouse)
Dependencies: Order, Payment, User, Driver, Restaurant Service
```

#### RATING-SERVICE (Core)
```yaml
# SERVICE: rating-service
# PORT: 8013
# ERROR_CODE_PREFIX: RTG

Responsibilities:
  - Customer ratings for restaurants
  - Customer ratings for drivers
  - Reviews management
  - Rating aggregation

Endpoints:
  POST   /ratings                         # RTG-001 to RTG-010
  GET    /ratings/{id}                    # RTG-011 to RTG-020
  GET    /ratings/restaurant/{id}         # RTG-021 to RTG-030
  GET    /ratings/driver/{id}             # RTG-031 to RTG-040
  GET    /ratings/user/{id}               # RTG-041 to RTG-050
  PUT    /ratings/{id}                    # RTG-051 to RTG-060

Database: rating_db (PostgreSQL)
Dependencies: User, Driver, Restaurant, Order Service
```

### 3.3 Service Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMUNICATION PATTERNS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SYNCHRONOUS (REST/gRPC)           ASYNCHRONOUS (Message Queue) │
│  ─────────────────────────         ──────────────────────────── │
│                                                                  │
│  ┌─────────┐     HTTP      ┌─────────┐                          │
│  │ Service │ ───────────► │ Service │                           │
│  │    A    │ ◄─────────── │    B    │                           │
│  └─────────┘    Response   └─────────┘                          │
│                                                                  │
│  Use for:                                                        │
│  - Real-time queries                                             │
│  - CRUD operations                                               │
│  - User-facing requests                                          │
│                                                                  │
│                            ┌──────────────┐                      │
│  ┌─────────┐    Publish   │   RabbitMQ   │   Consume  ┌────────┐│
│  │ Service │ ───────────► │    Queue     │ ─────────► │Service ││
│  │    A    │              │              │            │   B    ││
│  └─────────┘              └──────────────┘            └────────┘│
│                                                                  │
│  Use for:                                                        │
│  - Notifications                                                 │
│  - Email sending                                                 │
│  - Analytics events                                              │
│  - Background processing                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Event-Driven Architecture

```yaml
# Events published by services

ORDER_EVENTS:
  - order.created      # → Notification, Analytics
  - order.confirmed    # → Notification, Driver matching
  - order.assigned     # → Notification (driver, customer)
  - order.picked_up    # → Notification, Location tracking
  - order.delivered    # → Notification, Payment, Rating
  - order.cancelled    # → Notification, Payment (refund)

DRIVER_EVENTS:
  - driver.registered  # → Email, Document Service
  - driver.verified    # → Notification, Email
  - driver.online      # → Location Service
  - driver.offline     # → Location Service

PAYMENT_EVENTS:
  - payment.processed  # → Order, Notification
  - payment.failed     # → Order, Notification
  - payout.completed   # → Driver, Notification

USER_EVENTS:
  - user.registered    # → Email, Analytics
  - user.verified      # → Notification
```

---

## 4. INFRASTRUCTURE COMPONENTS

### 4.1 Directory Structure

```
infrastructure/
├── argocd/
│   ├── app-of-apps.yaml           # Root ArgoCD application
│   ├── projects.yaml              # ArgoCD projects definition
│   └── apps/
│       ├── dev/
│       │   └── backend.yaml       # Dev environment app
│       ├── staging/
│       │   └── backend.yaml       # Staging environment app
│       └── production/
│           └── backend.yaml       # Production environment app
│
├── helm/
│   └── backend/
│       ├── Chart.yaml             # Helm chart definition
│       ├── values.yaml            # Default values
│       ├── values-dev.yaml        # Dev overrides
│       ├── values-staging.yaml    # Staging overrides
│       ├── values-production.yaml # Production overrides
│       └── templates/
│           ├── rollout.yaml       # Argo Rollout
│           ├── service.yaml       # Kubernetes Service
│           ├── ingress.yaml       # Ingress configuration
│           ├── configmap.yaml     # ConfigMaps
│           ├── hpa.yaml           # HorizontalPodAutoscaler
│           └── analysistemplate.yaml # Canary analysis
│
├── kustomize/
│   ├── base/
│   │   ├── kustomization.yaml     # Base kustomization
│   │   ├── deployment.yaml        # Base deployment
│   │   ├── service.yaml           # Base service
│   │   ├── ingress.yaml           # Base ingress
│   │   ├── configmap.yaml         # Base configmap
│   │   ├── hpa.yaml               # Base HPA
│   │   ├── pdb.yaml               # Pod Disruption Budget
│   │   └── serviceaccount.yaml    # Service Account
│   └── overlays/
│       ├── dev/
│       │   ├── kustomization.yaml # Dev overlay
│       │   └── namespace.yaml     # Dev namespace
│       ├── staging/
│       │   ├── kustomization.yaml # Staging overlay
│       │   ├── namespace.yaml     # Staging namespace
│       │   ├── rollout.yaml       # Canary rollout config
│       │   └── analysistemplate.yaml
│       └── production/
│           ├── kustomization.yaml # Production overlay
│           ├── namespace.yaml     # Production namespace
│           ├── rollout.yaml       # Blue-green rollout
│           ├── analysistemplate.yaml
│           └── networkpolicy.yaml # Network policies
│
├── kubernetes/
│   ├── namespaces/
│   │   ├── dev.yaml
│   │   ├── staging.yaml
│   │   └── production.yaml
│   └── autoscaling/
│       ├── cluster-autoscaler.yaml  # EKS node scaling
│       ├── hpa-enhanced.yaml        # Enhanced HPA
│       ├── vpa.yaml                 # Vertical Pod Autoscaler
│       ├── keda-scaledobject.yaml   # Event-driven scaling
│       └── prometheus-adapter.yaml  # Custom metrics
│
└── terraform/                       # (Optional) IaC
    ├── modules/
    │   ├── eks/
    │   ├── rds/
    │   ├── elasticache/
    │   └── s3/
    └── environments/
        ├── dev/
        ├── staging/
        └── production/
```

### 4.2 Kubernetes Resources Per Service

```yaml
# Each microservice will have:
service-name/
├── deployment.yaml          # Or rollout.yaml for Argo Rollouts
├── service.yaml             # ClusterIP service
├── ingress.yaml             # Ingress rules
├── configmap.yaml           # Configuration
├── secret.yaml              # Secrets (sealed)
├── hpa.yaml                 # Auto-scaling
├── pdb.yaml                 # Pod Disruption Budget
├── serviceaccount.yaml      # RBAC
└── networkpolicy.yaml       # Network isolation
```

---

## 5. CI/CD PIPELINE

### 5.1 Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD PIPELINE FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  DEVELOPER                    CI PIPELINE                     CD PIPELINE
  ─────────                    ───────────                     ───────────
      │
      │ Push to feature/*
      ▼
  ┌───────┐
  │  PR   │──────────────────┐
  └───────┘                  │
                             ▼
                    ┌─────────────────┐
                    │  STAGE 1: LINT  │
                    │  - Ruff (Python)│
                    │  - ESLint (JS)  │
                    │  - TypeScript   │
                    └────────┬────────┘
                             │ Pass
                             ▼
                    ┌─────────────────┐
                    │ STAGE 2: SECURITY│
                    │  - Semgrep SAST │
                    │  - Bandit       │
                    │  - Safety       │
                    │  - npm audit    │
                    └────────┬────────┘
                             │ Pass
                             ▼
                    ┌─────────────────┐
                    │ STAGE 3: TESTS  │
                    │  - pytest       │
                    │  - vitest       │
                    │  - Coverage 70% │
                    └────────┬────────┘
                             │ Pass
                             ▼
                    ┌─────────────────┐
                    │ STAGE 4: SONAR  │
                    │  - Code smells  │
                    │  - Duplication  │
                    │  - Quality Gate │
                    └────────┬────────┘
                             │ Pass
                             ▼
                    ┌─────────────────┐
                    │    PR READY     │◄─── 2 Approvals Required
                    └────────┬────────┘
                             │ Merge
                             ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │   develop branch                    main branch                          │
  │        │                                 │                               │
  │        ▼                                 ▼                               │
  │   ┌──────────┐                     ┌──────────┐                         │
  │   │ STAGE 5  │                     │ STAGE 5  │                         │
  │   │  BUILD   │                     │  BUILD   │                         │
  │   │ - Docker │                     │ - Docker │                         │
  │   │ - Trivy  │                     │ - Trivy  │                         │
  │   └────┬─────┘                     └────┬─────┘                         │
  │        │                                 │                               │
  │        ▼                                 ▼                               │
  │   ┌──────────┐                     ┌──────────┐     ┌──────────────┐    │
  │   │   DEV    │                     │ STAGING  │────►│  PRODUCTION  │    │
  │   │ Rolling  │                     │  Canary  │     │  Blue-Green  │    │
  │   │ Update   │                     │ 10→30→50 │     │   Manual     │    │
  │   │          │                     │ →80→100% │     │  Approval    │    │
  │   └──────────┘                     └──────────┘     └──────────────┘    │
  │                                                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Pipeline Stages Detail

| Stage | Tools | Pass Criteria | Blocks PR? |
|-------|-------|---------------|------------|
| **1. Code Quality** | Ruff, ESLint, TypeScript | No errors | Yes |
| **2. Security** | Semgrep, Bandit, Safety | No high/critical | Yes |
| **3. Tests** | pytest, vitest | 70% coverage | Yes |
| **4. SonarQube** | SonarCloud | Quality gate | Yes |
| **5. Build** | Docker, Trivy | No critical vulns | Yes |

### 5.3 GitHub Actions Workflows

```
.github/workflows/
├── ci-pipeline.yml          # Main CI/CD pipeline
├── ci-security.yml          # Security scanning
├── ci-build.yml             # Docker build
├── promote-production.yml   # Manual production promotion
├── ci-complete.yml          # Complete pipeline
└── ios-ci.yml               # iOS app CI
```

---

## 6. OBSERVABILITY STACK

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OBSERVABILITY STACK                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
  │   Service   │      │   Service   │      │   Service   │
  │      A      │      │      B      │      │      C      │
  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
         │                    │                    │
         │ OpenTelemetry SDK  │                    │
         │ (Traces, Metrics,  │                    │
         │  Logs)             │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  OpenTelemetry  │
                    │    Collector    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │   Jaeger    │   │ Prometheus  │   │    Loki     │
  │  (Traces)   │   │  (Metrics)  │   │   (Logs)    │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Grafana   │
                    │ Dashboards  │
                    └─────────────┘
```

### 6.2 Logging Standards

```python
# LOGGING FORMAT FOR ALL SERVICES
# File: shared/logging_config.py

import structlog
from opentelemetry import trace

def configure_logging(service_name: str, environment: str):
    """
    Configure structured logging for a microservice.

    Log Format:
    {
        "timestamp": "2024-12-14T10:30:00Z",
        "level": "INFO",
        "service": "order-service",
        "environment": "staging",
        "trace_id": "abc123",
        "span_id": "def456",
        "correlation_id": "request-xyz",
        "message": "Order created",
        "order_id": "ORD-12345",
        "user_id": "USR-67890",
        "error_code": null
    }
    """

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            add_trace_context,  # Add OpenTelemetry trace context
            add_service_context(service_name, environment),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def add_trace_context(logger, method_name, event_dict):
    """Add OpenTelemetry trace context to logs."""
    span = trace.get_current_span()
    if span.is_recording():
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict

def add_service_context(service_name: str, environment: str):
    """Add service context to logs."""
    def processor(logger, method_name, event_dict):
        event_dict["service"] = service_name
        event_dict["environment"] = environment
        return event_dict
    return processor
```

### 6.3 Request Tracing

```python
# REQUEST TRACING MIDDLEWARE
# File: shared/tracing_middleware.py

from fastapi import Request
from opentelemetry import trace
from opentelemetry.trace import SpanKind
import uuid

tracer = trace.get_tracer(__name__)

async def tracing_middleware(request: Request, call_next):
    """
    Middleware to add correlation ID and create trace spans.

    Headers propagated:
    - X-Correlation-ID: Unique request identifier
    - X-Request-ID: Same as correlation ID (alias)
    - traceparent: W3C Trace Context
    - tracestate: W3C Trace Context state
    """

    # Get or create correlation ID
    correlation_id = request.headers.get(
        "X-Correlation-ID",
        request.headers.get("X-Request-ID", str(uuid.uuid4()))
    )

    # Create span with service context
    with tracer.start_as_current_span(
        name=f"{request.method} {request.url.path}",
        kind=SpanKind.SERVER,
        attributes={
            "http.method": request.method,
            "http.url": str(request.url),
            "http.route": request.url.path,
            "correlation_id": correlation_id,
            "service.name": SERVICE_NAME,
            "environment": ENVIRONMENT,
        }
    ) as span:
        # Add correlation ID to response headers
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id

        # Add response attributes to span
        span.set_attribute("http.status_code", response.status_code)

        return response
```

### 6.4 Metrics Collection

```python
# PROMETHEUS METRICS
# File: shared/metrics.py

from prometheus_client import Counter, Histogram, Gauge
from functools import wraps
import time

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["service", "method", "endpoint", "status", "environment"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["service", "method", "endpoint", "environment"],
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

# Business metrics
ORDERS_CREATED = Counter(
    "orders_created_total",
    "Total orders created",
    ["service", "environment", "status"]
)

ACTIVE_DRIVERS = Gauge(
    "active_drivers_count",
    "Number of active drivers",
    ["service", "environment", "city"]
)

# Error metrics
ERROR_COUNT = Counter(
    "errors_total",
    "Total errors",
    ["service", "error_code", "environment"]
)

def track_request(service_name: str, environment: str):
    """Decorator to track request metrics."""
    def decorator(func):
        @wraps(func)
        async def wrapper(request, *args, **kwargs):
            start_time = time.time()
            try:
                response = await func(request, *args, **kwargs)
                status = response.status_code
            except Exception as e:
                status = 500
                raise
            finally:
                duration = time.time() - start_time
                REQUEST_COUNT.labels(
                    service=service_name,
                    method=request.method,
                    endpoint=request.url.path,
                    status=status,
                    environment=environment
                ).inc()
                REQUEST_LATENCY.labels(
                    service=service_name,
                    method=request.method,
                    endpoint=request.url.path,
                    environment=environment
                ).observe(duration)
            return response
        return wrapper
    return decorator
```

---

## 7. SECURITY ARCHITECTURE

### 7.1 Security Tools Matrix

| Tool | Type | Stage | Severity Blocked |
|------|------|-------|------------------|
| **Semgrep** | SAST | CI | High, Critical |
| **Bandit** | Python Security | CI | High, Critical |
| **Safety** | Dependency CVE | CI | High, Critical |
| **npm audit** | JS Dependency | CI | High, Critical |
| **Trivy** | Container Scan | CI/CD | Critical |
| **SonarCloud** | Code Quality | CI | Quality Gate |
| **OWASP ZAP** | DAST | CD (optional) | High, Critical |

### 7.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  CLIENT                      API GATEWAY                    AUTH SERVICE
    │                              │                              │
    │  1. Login Request            │                              │
    │  (email, password)           │                              │
    │ ────────────────────────────►│                              │
    │                              │  2. Forward to Auth          │
    │                              │ ────────────────────────────►│
    │                              │                              │
    │                              │  3. Validate credentials     │
    │                              │     Generate JWT pair        │
    │                              │     - Access Token (15min)   │
    │                              │     - Refresh Token (7days)  │
    │                              │◄────────────────────────────│
    │  4. Return tokens            │                              │
    │◄────────────────────────────│                              │
    │                              │                              │
    │  5. API Request              │                              │
    │  Authorization: Bearer xxx   │                              │
    │ ────────────────────────────►│                              │
    │                              │  6. Validate JWT             │
    │                              │     (signature, expiry,      │
    │                              │      permissions)            │
    │                              │                              │
    │                              │  7. Forward to Service       │
    │                              │     X-User-ID: xxx           │
    │                              │     X-User-Role: xxx         │
    │                              │ ────────────────────────────►│
    │                              │                              │

JWT Payload:
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "customer|driver|restaurant|admin",
  "permissions": ["read:orders", "write:orders"],
  "iat": 1702500000,
  "exp": 1702500900,
  "iss": "dollor-auth-service",
  "aud": "dollor-api"
}
```

### 7.3 Network Security

```yaml
# Network Policy Example (Production)
# File: infrastructure/kustomize/overlays/production/networkpolicy.yaml

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from API Gateway only
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
    # Allow from other services for internal communication
    - from:
        - podSelector:
            matchLabels:
              app: payment-service
        - podSelector:
            matchLabels:
              app: notification-service
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow to PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow to RabbitMQ
    - to:
        - podSelector:
            matchLabels:
              app: rabbitmq
      ports:
        - protocol: TCP
          port: 5672
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

---

## 8. DEPLOYMENT STRATEGY

### 8.1 Environment Configuration

| Environment | Strategy | Trigger | Approval | URL |
|-------------|----------|---------|----------|-----|
| **DEV** | Rolling Update | Push to `develop` | Auto | dev-api.dollor.ai |
| **STAGING** | Canary (10→30→50→80→100%) | Push to `main` | Auto | staging-api.dollor.ai |
| **PRODUCTION** | Blue-Green | Manual dispatch | Required | api.dollor.ai |

### 8.2 Canary Deployment (Staging)

```yaml
# Canary Steps for Staging
steps:
  - setWeight: 10      # 10% traffic to canary
  - pause: { duration: 3m }
  - analysis:          # Check success rate, latency
      templates:
        - templateName: staging-success-rate
        - templateName: staging-latency

  - setWeight: 30      # 30% traffic
  - pause: { duration: 3m }
  - analysis:
      templates:
        - templateName: staging-success-rate

  - setWeight: 50      # 50% traffic
  - pause: { duration: 5m }
  - analysis:
      templates:
        - templateName: staging-success-rate
        - templateName: staging-error-rate

  - setWeight: 80      # 80% traffic
  - pause: { duration: 5m }
  - analysis:
      templates:
        - templateName: staging-success-rate

  - setWeight: 100     # Full rollout

# Auto-rollback if:
# - Success rate < 99%
# - P99 latency > 500ms
# - Error rate > 1%
```

### 8.3 Blue-Green Deployment (Production)

```yaml
# Blue-Green for Production
strategy:
  blueGreen:
    activeService: prod-dollor-backend-active
    previewService: prod-dollor-backend-preview

    # Manual promotion required
    autoPromotionEnabled: false

    # Keep old version for 30 minutes for instant rollback
    scaleDownDelaySeconds: 1800

    # Pre-promotion analysis
    prePromotionAnalysis:
      templates:
        - templateName: prod-success-rate
        - templateName: prod-latency
        - templateName: prod-error-rate

    # Post-promotion analysis
    postPromotionAnalysis:
      templates:
        - templateName: prod-success-rate

# Rollback command:
# kubectl argo rollouts undo prod-dollor-backend -n production
```

---

## 9. AUTO-SCALING CONFIGURATION

### 9.1 Scaling Matrix

| Environment | Min Pods | Max Pods | CPU Target | Memory Target | Custom Metrics |
|-------------|----------|----------|------------|---------------|----------------|
| **DEV** | 1 | 3 | 80% | - | - |
| **STAGING** | 2 | 10 | 70% | 80% | RPS: 100 |
| **PRODUCTION** | 3 | 50 | 60% | 70% | RPS: 50, P99: 200ms |

### 9.2 Auto-Scaling Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTO-SCALING ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                            CLUSTER LEVEL                                  │
  │                                                                          │
  │    ┌────────────────────────┐                                            │
  │    │   Cluster Autoscaler   │ ◄─── Scales EKS nodes (1-20 nodes)        │
  │    │   (AWS EKS)            │                                            │
  │    └────────────────────────┘                                            │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                            POD LEVEL                                      │
  │                                                                          │
  │    ┌────────────────────────┐    ┌────────────────────────┐              │
  │    │          HPA           │    │          VPA           │              │
  │    │ (Horizontal Scaling)   │    │ (Vertical Scaling)     │              │
  │    │                        │    │                        │              │
  │    │ Scales pod count       │    │ Adjusts CPU/Memory     │              │
  │    │ based on:              │    │ requests based on      │              │
  │    │ - CPU utilization      │    │ actual usage           │              │
  │    │ - Memory utilization   │    │                        │              │
  │    │ - Custom metrics       │    │                        │              │
  │    └────────────────────────┘    └────────────────────────┘              │
  │                                                                          │
  │    ┌────────────────────────┐    ┌────────────────────────┐              │
  │    │         KEDA           │    │   Prometheus Adapter   │              │
  │    │ (Event-Driven Scaling) │    │ (Custom Metrics)       │              │
  │    │                        │    │                        │              │
  │    │ Scales based on:       │    │ Exposes metrics for    │              │
  │    │ - SQS queue depth      │    │ HPA:                   │              │
  │    │ - RabbitMQ messages    │    │ - http_requests_per_sec│              │
  │    │ - Cron schedules       │    │ - p99_latency          │              │
  │    └────────────────────────┘    └────────────────────────┘              │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## 10. ERROR CODES & DEBUGGING

### 10.1 Error Code Format

```
ERROR CODE FORMAT: {SERVICE_PREFIX}-{CATEGORY}{NUMBER}

SERVICE_PREFIX:
  AUTH = Authentication Service
  USR  = User Service
  DRV  = Driver Service
  RST  = Restaurant Service
  ORD  = Order Service
  PAY  = Payment Service
  LOC  = Location Service
  MNU  = Menu Service
  NTF  = Notification Service
  EML  = Email Service
  DOC  = Document Service
  ANL  = Analytics Service
  RTG  = Rating Service
  GW   = API Gateway
  SYS  = System/Infrastructure

CATEGORY (first digit):
  0xx = Success/Info
  1xx = Validation errors
  2xx = Authentication/Authorization errors
  3xx = Resource not found
  4xx = Business logic errors
  5xx = External service errors
  6xx = Database errors
  7xx = Cache errors
  8xx = Queue errors
  9xx = System errors
```

### 10.2 Error Code Reference

```yaml
# AUTH SERVICE ERRORS
AUTH-101: "Invalid email format"
AUTH-102: "Password too weak - minimum 8 characters, 1 uppercase, 1 number"
AUTH-103: "Email already registered"
AUTH-201: "Invalid credentials"
AUTH-202: "Account not verified"
AUTH-203: "Account suspended"
AUTH-204: "Token expired"
AUTH-205: "Invalid refresh token"
AUTH-206: "Insufficient permissions"
AUTH-301: "User not found"
AUTH-501: "OAuth provider unavailable"
AUTH-601: "Database connection failed"

# ORDER SERVICE ERRORS
ORD-101: "Invalid order items"
ORD-102: "Restaurant closed"
ORD-103: "Item unavailable"
ORD-104: "Delivery address out of range"
ORD-105: "Minimum order amount not met"
ORD-201: "User not authorized to view this order"
ORD-301: "Order not found"
ORD-401: "Cannot cancel - order already picked up"
ORD-402: "Cannot modify - order already confirmed"
ORD-403: "No drivers available"
ORD-501: "Payment processing failed"
ORD-502: "Restaurant service unavailable"
ORD-601: "Failed to save order"

# PAYMENT SERVICE ERRORS
PAY-101: "Invalid card number"
PAY-102: "Card expired"
PAY-103: "Invalid CVV"
PAY-104: "Invalid billing address"
PAY-201: "Card declined"
PAY-202: "Insufficient funds"
PAY-203: "Card blocked"
PAY-301: "Payment not found"
PAY-401: "Refund amount exceeds original payment"
PAY-402: "Refund window expired"
PAY-501: "Stripe API error"
PAY-502: "Payment gateway timeout"

# DRIVER SERVICE ERRORS
DRV-101: "Invalid license number"
DRV-102: "Invalid vehicle registration"
DRV-103: "Invalid insurance document"
DRV-201: "Driver not verified"
DRV-202: "Driver suspended"
DRV-301: "Driver not found"
DRV-401: "Already on active delivery"
DRV-402: "Cannot go offline with active orders"
DRV-501: "Document verification service unavailable"

# LOCATION SERVICE ERRORS
LOC-101: "Invalid coordinates"
LOC-102: "Location outside service area"
LOC-301: "Driver location not found"
LOC-401: "Cannot calculate route"
LOC-501: "Maps API unavailable"

# SYSTEM ERRORS
SYS-901: "Service temporarily unavailable"
SYS-902: "Rate limit exceeded"
SYS-903: "Request timeout"
SYS-904: "Circuit breaker open"
SYS-905: "Database failover in progress"
```

### 10.3 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ORD-401",
    "message": "Cannot cancel - order already picked up",
    "details": {
      "order_id": "ORD-12345",
      "current_status": "picked_up",
      "picked_up_at": "2024-12-14T10:30:00Z"
    },
    "trace_id": "abc123def456",
    "correlation_id": "req-xyz-789",
    "timestamp": "2024-12-14T10:35:00Z",
    "environment": "production",
    "service": "order-service"
  },
  "debug": {
    "request_id": "req-xyz-789",
    "endpoint": "PUT /orders/ORD-12345/cancel",
    "duration_ms": 45
  }
}
```

### 10.4 Debugging Guide by Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEBUGGING BY ENVIRONMENT                            │
└─────────────────────────────────────────────────────────────────────────────┘

DEV ENVIRONMENT
───────────────
• Full debug logs enabled (LOG_LEVEL=DEBUG)
• Stack traces in error responses
• Detailed error messages
• No rate limiting
• Access: kubectl logs -n dev -l app=order-service -f

STAGING ENVIRONMENT
───────────────────
• Info level logs (LOG_LEVEL=INFO)
• Sanitized error messages
• Canary comparison logs
• Moderate rate limiting
• Access: kubectl logs -n staging -l app=order-service -f

Debugging canary issues:
1. Check analysis results:
   kubectl argo rollouts get rollout staging-dollor-backend -n staging
2. Compare stable vs canary metrics in Grafana
3. Check canary-specific logs:
   kubectl logs -n staging -l rollouts-pod-template-hash=<canary-hash>

PRODUCTION ENVIRONMENT
──────────────────────
• Warn level logs (LOG_LEVEL=WARN)
• Generic error messages (no internal details)
• Strict rate limiting
• Access restricted to ops team

Debugging production issues:
1. Get trace_id from user/error report
2. Search in Grafana/Loki: {trace_id="abc123"}
3. View trace in Jaeger: https://jaeger.dollor.ai/trace/abc123
4. Check metrics: https://grafana.dollor.ai/d/production
5. Check rollout status:
   kubectl argo rollouts get rollout prod-dollor-backend -n production
```

---

## 11. FILE REFERENCE

### 11.1 Infrastructure Files

```
infrastructure/
├── argocd/
│   ├── app-of-apps.yaml
│   ├── projects.yaml
│   └── apps/{dev,staging,production}/backend.yaml
│
├── helm/backend/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-{dev,staging,production}.yaml
│   └── templates/*.yaml
│
├── kustomize/
│   ├── base/*.yaml
│   └── overlays/{dev,staging,production}/*.yaml
│
└── kubernetes/
    ├── namespaces/*.yaml
    └── autoscaling/*.yaml
```

### 11.2 CI/CD Files

```
.github/
├── workflows/
│   ├── ci-pipeline.yml          # Main pipeline
│   ├── ci-security.yml          # Security scans
│   ├── ci-build.yml             # Docker build
│   ├── promote-production.yml   # Prod promotion
│   └── ios-ci.yml               # iOS builds
├── CODEOWNERS
└── branch-protection.md
```

### 11.3 Application Files

```
apps/
├── ios/
│   ├── customer/
│   ├── delivery/
│   ├── restaurant/
│   └── eatfair-ios-shared/
│
└── web/p2p-platform/
    ├── frontend/
    │   ├── vitest.config.ts
    │   └── package.json
    └── backend/
        ├── Dockerfile.optimized
        └── requirements.txt
```

### 11.4 Config Files

```
Root:
├── sonar-project.properties     # SonarCloud config
├── .semgrep.yml                 # Semgrep rules
├── .pre-commit-config.yaml      # Pre-commit hooks
└── docs/
    └── FINAL_INFRASTRUCTURE.md  # This document
```

---

## QUICK REFERENCE COMMANDS

```bash
# ===== DEPLOYMENT COMMANDS =====

# Deploy to dev (GitOps - push to develop)
git checkout develop && git push

# Deploy to staging (GitOps - push to main)
git checkout main && git merge develop && git push

# Promote to production (manual)
kubectl argo rollouts promote prod-dollor-backend -n production

# Rollback production
kubectl argo rollouts undo prod-dollor-backend -n production

# ===== MONITORING COMMANDS =====

# Check rollout status
kubectl argo rollouts get rollout staging-dollor-backend -n staging --watch

# View logs
kubectl logs -n staging -l app=order-service -f

# View metrics
kubectl top pods -n production

# ===== DEBUGGING COMMANDS =====

# Get pod details
kubectl describe pod -n production -l app=order-service

# Execute into pod
kubectl exec -it -n staging deployment/order-service -- /bin/sh

# Port forward for local debugging
kubectl port-forward -n staging svc/order-service 8080:80

# ===== SCALING COMMANDS =====

# Manual scale
kubectl scale deployment order-service -n staging --replicas=5

# View HPA status
kubectl get hpa -n production

# View VPA recommendations
kubectl get vpa -n production -o yaml
```

---

**Document Version:** 1.0.0
**Last Updated:** December 2024
**Maintainer:** Platform Engineering Team
