# DOLLOR.AI - COMPREHENSIVE PROJECT REPORT
## Matchmaking Platform for Food Delivery & Rideshare

**Version:** 1.0.0
**Last Updated:** December 15, 2025
**Status:** Phase 5 Complete - Production Ready
**All Backend Tests:** 21/21 Passing

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Business Model & Legal Positioning](#2-business-model--legal-positioning)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Models](#4-database-models)
5. [P2P Backend API Endpoints](#5-p2p-backend-api-endpoints)
6. [Microservices Architecture](#6-microservices-architecture)
7. [iOS Applications](#7-ios-applications)
8. [Android Applications](#8-android-applications)
9. [Shared Libraries](#9-shared-libraries)
10. [Real-time Features](#10-real-time-features)
11. [Test Cases & Results](#11-test-cases--results)
12. [Deployment & CI/CD](#12-deployment--cicd)
13. [Security & Compliance](#13-security--compliance)
14. [Next Steps & Roadmap](#14-next-steps--roadmap)

---

## 1. EXECUTIVE SUMMARY

### Platform Overview
Dollor.ai is a **dual-service matchmaking platform** that connects:
- **Food Delivery**: Customers with restaurants and independent delivery partners
- **Rideshare**: Riders with independent driver partners

### Key Differentiators
- **$1+$1 Flat Fee Model** - No percentage-based commissions
- **100% Tips to Drivers** - Platform takes zero from tips
- **Matchmaking Service** - Legal positioning as technology platform, not employer
- **Multi-Platform** - iOS, Android, Web applications

### Technical Stack
| Component | Technology |
|-----------|------------|
| **Backend** | Python FastAPI, SQLAlchemy |
| **Databases** | PostgreSQL, Redis, ClickHouse, Elasticsearch |
| **Event Streaming** | Apache Kafka |
| **iOS** | Swift, SwiftUI |
| **Android** | Kotlin, Jetpack Compose |
| **Frontend** | React, TypeScript |
| **Infrastructure** | AWS EKS, ArgoCD, Terraform |

---

## 2. BUSINESS MODEL & LEGAL POSITIONING

### 2.1 Matchmaking Service Definition

```
WHAT WE ARE:                           WHAT WE ARE NOT:
─────────────                          ─────────────────
✓ Technology matchmaking platform      ✗ Delivery company
✓ Connection facilitator               ✗ Transportation network company
✓ Payment processor (pass-through)     ✗ Employer of drivers
✓ Software-as-a-Service provider       ✗ Food service provider
```

### 2.2 Pricing Model - $1+$1 Flat Fees

#### Food Delivery Matchmaking
| Party | Fee | Description |
|-------|-----|-------------|
| **Customer** | $1.00 | Matchmaking fee per order |
| **Restaurant** | $1.00 | Platform listing fee per order |
| **Driver** | $0.00 | FREE - No commission on deliveries |
| **Tips** | $0.00 | 100% goes to driver |
| **Platform Revenue** | $2.00 | Total per order |

#### Rideshare Matchmaking
| Party | Fee | Description |
|-------|-----|-------------|
| **Rider** | $1.00 | Matchmaking fee per ride |
| **Driver** | $1.00 | Platform access fee per ride |
| **Tips** | $0.00 | 100% goes to driver |
| **Platform Revenue** | $2.00 | Total per ride |

### 2.3 Legal Protections

| Protection | Implementation |
|------------|----------------|
| **Independent Contractor Status** | Drivers set own hours, use own vehicles, accept/decline freely |
| **No Route Control** | Drivers choose their own routes (suggest, not mandate) |
| **Pass-Through Payments** | Process payments, not handle cash |
| **Flat Fee Model** | No commission = less "employer" classification risk |
| **Terms of Service** | Clear matchmaking language throughout |
| **Document Verification** | Partners verify their own compliance |

---

## 3. ARCHITECTURE OVERVIEW

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOLLOR.AI PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐│
│  │    iOS APPS (3)     │   │   ANDROID APPS (3)  │   │     WEB PORTAL      ││
│  │  Customer/Driver/   │   │  Customer/Driver/   │   │    Admin/Partner    ││
│  │    Restaurant       │   │    Restaurant       │   │                     ││
│  └──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘│
│             │                         │                         │           │
│             └─────────────────────────┼─────────────────────────┘           │
│                                       ▼                                      │
│                         ┌─────────────────────────┐                         │
│                         │      API GATEWAY        │                         │
│                         │    (NGINX / Kong)       │                         │
│                         └────────────┬────────────┘                         │
│                                      │                                       │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         │                            │                            │         │
│         ▼                            ▼                            ▼         │
│  ┌─────────────┐            ┌─────────────────┐           ┌─────────────┐   │
│  │ P2P Backend │            │  MICROSERVICES  │           │  WebSocket  │   │
│  │   (8080)    │            │  (8001-8016)    │           │   Server    │   │
│  └──────┬──────┘            └────────┬────────┘           └──────┬──────┘   │
│         │                            │                           │          │
│         └────────────────────────────┼───────────────────────────┘          │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                         DATA LAYER                                        ││
│  │  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌───────────┐││
│  │  │PostgreSQL │  │  Redis   │  │ClickHouse  │  │  Kafka  │  │Elasticsearch│
│  │  │   (DB)    │  │ (Cache)  │  │(Analytics) │  │(Events) │  │  (Search) │││
│  │  └───────────┘  └──────────┘  └────────────┘  └─────────┘  └───────────┘││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Repository Structure

```
/Users/jeet/StudioProjects/
│
├── eatfair-ios/                    # PRIMARY REPO (iOS + Backend + Infra)
│   ├── apps/
│   │   ├── ios/                    # iOS Apps (Swift)
│   │   │   ├── customer/           # Customer App (food + rideshare)
│   │   │   ├── delivery/           # Driver App (food + rideshare)
│   │   │   ├── restaurant/         # Restaurant App
│   │   │   └── eatfair-ios-shared/ # Shared iOS Library
│   │   │
│   │   └── web/p2p-platform/       # P2P Platform
│   │       ├── backend/            # Python FastAPI
│   │       └── frontend/           # React Admin Portal
│   │
│   ├── services/                   # Microservices
│   │   ├── shared/common/          # Shared libraries
│   │   └── core/                   # Core microservices
│   │
│   ├── infrastructure/             # Deployment
│   │   ├── argocd/apps/            # ArgoCD applications
│   │   ├── helm/                   # Helm charts
│   │   └── kubernetes/             # K8s manifests
│   │
│   └── docs/                       # Documentation
│
└── eatfair-android/                # ANDROID REPO
    ├── app/                        # Customer App
    ├── orderapp/                   # Driver App
    ├── partner/                    # Restaurant App
    └── shared/                     # Shared Android Library
```

---

## 4. DATABASE MODELS

### 4.1 Core Models Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE MODELS (28 Tables)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER MANAGEMENT           BUSINESS ENTITIES          FINANCIAL             │
│  ─────────────────         ─────────────────         ─────────              │
│  • User                    • Vendor                  • Invoice              │
│  • Customer                • VendorMenuItem          • InvoiceItem          │
│  • Driver                  • Order                   • Payment              │
│                            • VendorPurchaseOrder     • VendorPayout         │
│                                                      • DriverPayout         │
│                                                      • JournalEntry         │
│                                                      • JournalEntryLine     │
│                                                      • StripePaymentLog     │
│                                                                              │
│  AI EMPLOYEES              INFRASTRUCTURE                                    │
│  ─────────────             ──────────────                                    │
│  • AIEmployee              • Client                                          │
│  • AIEmployeeActivity      • DashboardMetric                                │
│  • AIEmployeeHourlyReport                                                    │
│  • AIEmployeeDailyReport                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 User Model

```python
class User(Base):
    __tablename__ = "users"

    id              # Integer, Primary Key
    email           # String(255), Unique, Indexed
    password_hash   # String(255)
    full_name       # String(255)
    role            # Enum: ADMIN, USER, VENDOR, DRIVER
    vendor_id       # ForeignKey -> vendors.id
    driver_id       # ForeignKey -> drivers.id
    created_at      # DateTime
```

### 4.3 Customer Model

```python
class Customer(Base):
    __tablename__ = "customers"

    # Identity
    id               # Integer, Primary Key
    customer_id      # String(50), Unique, Format: CUST-00001
    email            # String(255), Unique, Indexed
    password_hash    # String(255)

    # Personal Info
    first_name       # String(100)
    last_name        # String(100)
    phone            # String(50)

    # Addresses
    default_address      # JSON
    saved_addresses      # JSON Array

    # Preferences
    dietary_preferences      # JSON: ["vegetarian", "gluten_free"]
    favorite_cuisines        # JSON
    notification_preferences # JSON

    # Loyalty
    loyalty_points       # Integer, Default: 0
    loyalty_tier         # String: bronze, silver, gold, platinum

    # Stats
    total_orders         # Integer
    total_spent          # Float
    average_order_value  # Float

    # Mobile
    device_id        # String(255)
    push_token       # String(500)
    platform         # String: ios, android

    # Stripe
    stripe_customer_id   # String(255)

    # Status
    is_active        # Boolean
    is_verified      # Boolean

    # Timestamps
    created_at       # DateTime
    updated_at       # DateTime
```

### 4.4 Driver Model

```python
class Driver(Base):
    __tablename__ = "drivers"

    # Identity
    id                   # Integer, Primary Key
    driver_id            # String(50), Unique, Format: DRV-00001
    email                # String(255), Unique
    password_hash        # String(255)

    # Personal
    first_name           # String(100)
    last_name            # String(100)
    phone                # String(50)
    date_of_birth        # String(20), YYYY-MM-DD
    license_number       # String(50)

    # Address
    street               # Text
    city                 # String(100)
    state                # String(100)
    zip_code             # String(20)

    # Vehicle
    vehicle_type         # String: car, motorcycle, bicycle
    vehicle_make         # String(100)
    vehicle_model        # String(100)
    vehicle_year         # Integer
    vehicle_color        # String(50)
    license_plate        # String(20)

    # Documents
    drivers_license          # Boolean
    drivers_license_url      # String(500)
    drivers_license_expiry   # DateTime
    insurance                # Boolean
    insurance_url            # String(500)
    insurance_expiry         # DateTime
    background_check         # Boolean
    background_check_date    # DateTime
    photo_url                # String(500)

    # Status & Performance
    status               # Enum: PENDING, APPROVED, ACTIVE, INACTIVE, SUSPENDED
    rating               # Float, Default: 5.0
    total_deliveries     # Integer

    # Real-time Tracking
    current_latitude         # Float
    current_longitude        # Float
    is_online                # Boolean
    last_location_update     # DateTime
    location_updated_at      # DateTime
    went_online_at           # DateTime
    went_offline_at          # DateTime

    # Mobile
    device_id            # String(255)
    push_token           # String(500)
    platform             # String: ios, android
    fcm_token            # String(500)

    # Stripe Connect
    stripe_account_id    # String(255)
    stripe_onboarded     # Boolean

    # Verification
    verification_id          # String(255), Persona/Onfido ID
    verification_status      # String: not_started, pending, verified, rejected
    documents_verified       # Boolean
    documents_verified_at    # DateTime

    # Timestamps
    created_at           # DateTime
    updated_at           # DateTime
    approved_at          # DateTime
```

### 4.5 Vendor (Restaurant) Model

```python
class Vendor(Base):
    __tablename__ = "vendors"

    # Identity
    id                   # Integer, Primary Key
    vendor_id            # Computed from id

    # Company
    company_name         # String(255)
    tax_id               # String(50)
    business_type        # String(100)
    industry             # String(100)
    website              # String(255)

    # Restaurant-Specific
    restaurant_name          # String(255)
    cuisine_type             # String(100)
    operating_hours          # Text
    seating_capacity         # Integer
    delivery_available       # Boolean
    pickup_available         # Boolean
    average_prep_time        # Integer (minutes)

    # Contact
    contact_name         # String(255)
    contact_email        # String(255)
    contact_phone        # String(50)
    contact_title        # String(100)

    # Address
    street               # Text
    city                 # String(100)
    state                # String(100)
    zip_code             # String(20)
    country              # String(100)
    latitude             # Float
    longitude            # Float

    # Status
    onboarding_status        # Enum: PENDING, IN_REVIEW, APPROVED, REJECTED, SUSPENDED
    onboarding_phase         # Enum: NOT_STARTED, DOCUMENTS_PENDING, UNDER_REVIEW, etc.
    risk_rating              # Enum: LOW, MEDIUM, HIGH, CRITICAL
    performance_score        # Integer

    # Documents
    w9_form                  # Boolean
    w9_form_url              # String(500)
    insurance                # Boolean
    insurance_url            # String(500)
    food_license             # Boolean
    food_license_url         # String(500)
    health_permit            # Boolean
    health_permit_url        # String(500)

    # Mobile
    app_registered           # Boolean
    mobile_device_id         # String(255)
    push_token               # String(500)
    platform                 # String: ios, android

    # Verification
    verification_id          # String(255)
    verification_status      # String
    documents_verified       # Boolean

    # Timestamps
    created_at           # DateTime
    updated_at           # DateTime
    approved_at          # DateTime
```

### 4.6 Order Model

```python
class Order(Base):
    __tablename__ = "orders"

    # Identity
    id                   # Integer, Primary Key
    order_number         # String(50), Unique, Format: ORD-YYYYMM-0001

    # Parties
    customer_id          # Integer
    customer_name        # String(255)
    customer_email       # String(255)
    customer_phone       # String(50)
    vendor_id            # ForeignKey -> vendors.id
    driver_id            # Integer
    driver_name          # String(255)

    # Order Items
    items                # Text (JSON Array)

    # Amounts
    subtotal             # Float
    tax_rate             # Float
    tax_amount           # Float
    delivery_fee         # Float
    tip                  # Float (100% to driver)
    platform_fee         # Float ($1 flat)
    total_amount         # Float

    # Delivery
    delivery_address         # Text (JSON)
    delivery_instructions    # Text
    delivery_latitude        # Float
    delivery_longitude       # Float
    driver_location          # Text (JSON)

    # Status
    status               # Enum: PENDING_PAYMENT, CONFIRMED, PREPARING,
                         #       READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    payment_status       # String: pending, processing, succeeded, failed, refunded

    # Stripe
    stripe_payment_intent_id     # String(255)
    stripe_charge_id             # String(255)
    stripe_customer_id           # String(255)
    payment_method               # String(50)

    # Auto-Dispatch
    auto_dispatched          # Boolean
    broadcast_to_drivers     # Boolean
    broadcast_at             # DateTime
    broadcast_radius_km      # Float

    # Timestamps
    created_at           # DateTime
    updated_at           # DateTime
    confirmed_at         # DateTime
    preparing_at         # DateTime
    delivered_at         # DateTime
    dispatched_at        # DateTime
```

### 4.7 VendorMenuItem Model

```python
class VendorMenuItem(Base):
    __tablename__ = "vendor_menu_items"

    id               # Integer, Primary Key
    vendor_id        # ForeignKey -> vendors.id

    # Item Details
    item_name        # String(255)
    description      # Text
    category         # String(100): Appetizers, Main Course, etc.
    price            # Float

    # Dietary
    is_available     # Boolean
    is_vegetarian    # Boolean
    is_vegan         # Boolean
    is_gluten_free   # Boolean
    is_spicy         # Boolean
    spice_level      # Integer (0-5)

    # Additional
    prep_time        # Integer (minutes)
    calories         # Integer
    image_url        # String(500)

    # Inventory
    in_stock         # Boolean
    daily_limit      # Integer
    items_sold_today # Integer

    # Customizations
    customizations   # JSON: [{"name": "Size", "options": [{"name": "Large", "price": 2.00}]}]

    # Timestamps
    created_at       # DateTime
    updated_at       # DateTime
```

### 4.8 AI Employee Models (Automation)

```python
class AIEmployee(Base):
    __tablename__ = "ai_employees"

    id                   # Integer, Primary Key
    employee_id          # String(20), Format: AI_EMP_001
    name                 # String(100), e.g., "OrderBot Alpha"
    role                 # String(50), e.g., "order_orchestrator"
    department           # String(50), e.g., "logistics"
    avatar               # String(10), emoji

    # Status
    status               # Enum: ACTIVE, IDLE, PROCESSING, ERROR, OFFLINE
    is_online            # Boolean
    last_active          # DateTime

    # Lifetime Metrics
    total_tasks_completed    # Integer
    total_errors             # Integer
    total_hours_active       # Float
    average_task_time_seconds    # Float
    success_rate             # Float (percentage)

    # Session
    session_start            # DateTime
    tasks_this_session       # Integer
    errors_this_session      # Integer

    # Config
    model_version        # String: gpt-4
    config_json          # Text
```

---

## 5. P2P BACKEND API ENDPOINTS

### 5.1 Authentication Endpoints

#### Admin/User Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin/User login (OAuth2 form) |
| `/api/auth/me` | GET | Get current user info |
| `/register` | POST | Register new user |

#### Customer Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/customer/register` | POST | Register new customer |
| `/api/auth/customer/login` | POST | Customer login |
| `/api/customer/login` | POST | iOS-compatible customer login |
| `/api/auth/customer/google` | POST | Google OAuth for customers |
| `/api/auth/customer/me` | GET | Get customer profile |
| `/api/auth/customer/profile` | PUT | Update customer profile |

#### Driver Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/driver/register` | POST | Register new driver |
| `/api/auth/driver/login` | POST | Driver login |
| `/api/auth/driver/google` | POST | Google OAuth for drivers |
| `/api/auth/driver/apple-auth` | POST | Apple OAuth for drivers |
| `/api/auth/driver/me` | GET | Get driver profile |
| `/api/auth/driver/online` | PUT | Toggle online status |
| `/api/auth/driver/location` | PUT | Update GPS location |
| `/api/auth/driver/documents` | POST | Upload documents |

#### Vendor Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/vendor/register` | POST | Register new vendor |
| `/api/auth/vendor/login` | POST | Vendor login |
| `/api/auth/vendor/google-auth` | POST | Google OAuth for vendors |
| `/api/auth/vendor/apple-auth` | POST | Apple OAuth for vendors |

#### Password Reset
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/password-reset/request` | POST | Request password reset |
| `/api/auth/password-reset/confirm` | POST | Confirm password reset |

### 5.2 Rideshare Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/erp/rides/estimate` | GET/POST | Get fare estimate |
| `/api/erp/rides/estimate-fare` | POST | Detailed fare estimate |
| `/api/erp/rides/request` | POST | Request a new ride |
| `/api/erp/rides/{ride_id}/status` | GET | Get ride status |
| `/api/erp/rides/{ride_id}/rate` | POST | Rate completed ride |
| `/api/erp/rides` | GET | List rides (proxy) |
| `/api/erp/rides/{ride_id}/eta` | GET | Get ride ETA (proxy) |
| `/api/erp/rides/active-count` | GET | Count active rides (proxy) |

### 5.3 Restaurant Endpoints (Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/erp/restaurants` | GET | List restaurants |
| `/api/erp/restaurants/nearby` | GET | Get nearby restaurants |
| `/api/erp/restaurants/{id}` | GET | Get restaurant details |
| `/api/erp/restaurants/{id}/menu` | GET | Get restaurant menu |

### 5.4 Order Tracking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/erp/orders/{order_id}/full-tracking` | GET | Full order tracking |

### 5.5 Driver Management (iOS Compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/erp/drivers/{driver_id}` | GET | Get driver by ID |
| `/drivers/{driver_id}` | PUT | Update driver profile |
| `/drivers/{driver_id}/status` | PATCH | Update driver status |
| `/drivers/{driver_id}/documents` | GET | Get driver documents |
| `/drivers/{driver_id}/documents` | POST | Upload driver document |

### 5.6 Legal & Compliance

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/legal/terms` | GET | Terms of Service summary |
| `/api/legal/privacy` | GET | Privacy Policy summary |

### 5.7 Demo Accounts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/demo/setup` | POST | Create demo accounts for App Store |

### 5.8 Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | App configuration (fees, features) |
| `/health` | GET | Health check |
| `/api/websocket/stats` | GET | WebSocket connection stats |

### 5.9 Push Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/register-token` | POST | Register push token |

---

## 6. MICROSERVICES ARCHITECTURE

### 6.1 Service Catalog

| Service | Port | Domain | Responsibility |
|---------|------|--------|----------------|
| **auth-service** | 8001 | Both | Authentication, JWT, OAuth |
| **user-service** | 8002 | Both | Customer/Rider profiles |
| **driver-service** | 8003 | Both | Driver profiles, documents, location |
| **restaurant-service** | 8004 | Food | Restaurant profiles, hours, settings |
| **order-service** | 8005 | Food | Food order lifecycle |
| **payment-service** | 8006 | Both | Stripe, payouts, refunds |
| **location-service** | 8007 | Both | Real-time GPS tracking, H3 indexing |
| **menu-service** | 8008 | Food | Menu management, availability |
| **notification-service** | 8009 | Both | Push (FCM/APNs), SMS, Email |
| **rating-service** | 8013 | Both | Reviews, ratings, feedback |
| **ride-service** | 8014 | Rideshare | Ride requests, matching |
| **pricing-service** | 8015 | Rideshare | Fare calculation, surge pricing |
| **analytics-service** | 8016 | Both | Dashboard, BI, reporting |

### 6.2 Service Files

All microservices located at: `/Users/jeet/StudioProjects/eatfair-ios/services/core/`

```
services/core/
├── auth-service/main.py
├── user-service/main.py
├── driver-service/main.py
├── restaurant-service/main.py
├── order-service/main.py
├── payment-service/main.py
├── location-service/main.py
├── menu-service/main.py
├── notification-service/main.py
├── rating-service/main.py
├── ride-service/main.py
├── pricing-service/main.py
└── analytics-service/main.py
```

### 6.3 API Gateway Routing

Location: `/infrastructure/kubernetes/api-gateway/nginx.conf`

```nginx
# Route mapping
/api/auth/*        → auth-service:8001
/api/rides/*       → ride-service:8014
/api/restaurants/* → restaurant-service:8004
/api/orders/*      → order-service:8005
/api/payments/*    → payment-service:8006
/api/locations/*   → location-service:8007
/api/menus/*       → menu-service:8008
/api/notifications/* → notification-service:8009
/api/ratings/*     → rating-service:8013
/api/pricing/*     → pricing-service:8015
/api/drivers/*     → driver-service:8003
/ws/*              → p2p-backend:8080 (WebSocket)
/api/legal/*       → p2p-backend:8080
/api/erp/*         → p2p-backend:8080 (proxy)
```

### 6.4 Rate Limiting

| Zone | Rate | Burst | Description |
|------|------|-------|-------------|
| api_limit | 100 req/s | 100 | General API endpoints |
| auth_limit | 10 req/s | 20 | Authentication endpoints |

---

## 7. iOS APPLICATIONS

### 7.1 App Overview

| App | Path | Bundle ID | Purpose |
|-----|------|-----------|---------|
| **Customer** | `apps/ios/customer/eatfaircustomer/` | com.eatfair.customer | Order food, Request rides |
| **Driver** | `apps/ios/delivery/eatffairdelivery/` | com.eatfair.delivery | Deliver food, Drive riders |
| **Restaurant** | `apps/ios/restaurant/eatffairrestaurant/` | com.eatfair.restaurant | Manage orders, menus |

### 7.2 Customer App Features

- Browse nearby restaurants
- View restaurant menus
- Add items to cart
- Multi-restaurant ordering
- Address search and management
- Order placement with Stripe payment
- Real-time order tracking
- Push notifications
- Order history
- Request rideshare
- Track driver location
- Rate drivers and restaurants

### 7.3 Driver App Features

- Registration and document upload
- Online/offline toggle
- Accept/decline orders
- Turn-by-turn navigation
- Order pickup confirmation
- Delivery confirmation
- Real-time earnings tracking
- Push notifications
- Earnings history
- Document management

### 7.4 Restaurant App Features

- Dashboard with order overview
- Real-time order notifications
- Order acceptance/rejection
- Prep time management
- Menu management
- Promotions and discounts
- Reviews and ratings
- Delivery tracking map
- Business hours management

### 7.5 Shared iOS Library

Location: `apps/ios/eatfair-ios-shared/`

```
eatfair-ios-shared/
├── Package.swift
├── Package.resolved
└── Sources/
    └── (Swift Package for shared code)
```

**Contains:**
- Networking layer
- API models
- Authentication utilities
- Common UI components
- Location services
- Push notification handling

---

## 8. ANDROID APPLICATIONS

### 8.1 App Overview

| Module | Package | Purpose |
|--------|---------|---------|
| **app** | ai.dollor.customer | Order food, Request rides |
| **orderapp** | ai.dollor.driver | Deliver food, Drive riders |
| **partner** | ai.dollor.restaurant | Manage orders |

### 8.2 Structure

```
eatfair-android/
├── app/                    # Customer App
│   └── src/main/java/com/eatfair/app/
│       └── ui/navigation/  # Navigation components
├── orderapp/               # Driver App
├── partner/                # Restaurant App
└── shared/                 # Shared Android Library
```

---

## 9. SHARED LIBRARIES

### 9.1 Backend Shared Library

Location: `services/shared/common/`

```
shared/common/
├── errors/     # Error codes (SERVICE-CATEGORY-NUMBER format)
├── logging/    # Structured logging utilities
├── tracing/    # OpenTelemetry integration
├── metrics/    # Prometheus metrics
└── health/     # Health check endpoints
```

### 9.2 Error Code Format

```
{SERVICE}-{CATEGORY}{NUMBER}

Categories:
1xx - Validation errors
2xx - Authentication errors
3xx - Not found errors
4xx - Business logic errors
5xx - External service errors

Examples:
AUTH-201  - Invalid credentials
ORD-101   - Invalid order items
DRV-301   - Driver not found
PAY-501   - Stripe error
```

---

## 10. REAL-TIME FEATURES

### 10.1 WebSocket Server

Location: `apps/web/p2p-platform/backend/websocket_server.py`

**Connection Types:**
```
customer_{id}    # Customer app connections
driver_{id}      # Driver app connections
restaurant_{id}  # Restaurant app connections
```

**Topics for Subscription:**
```
order:{order_id}       # Track specific order
ride:{ride_id}         # Track specific ride
driver:{driver_id}     # Track driver location
chat:{conversation_id} # Chat messages
```

**Events:**

| Event | Direction | Purpose |
|-------|-----------|---------|
| `order_status_update` | Server→Client | Order status changed |
| `driver_location_update` | Server→Client | Driver GPS update |
| `ride_status_update` | Server→Client | Ride status changed |
| `eta_update` | Server→Client | ETA recalculated |
| `chat_message` | Bidirectional | Chat messaging |
| `subscribe` | Client→Server | Subscribe to topic |
| `ping/pong` | Bidirectional | Keep-alive |

### 10.2 Push Notification Service

Location: `apps/web/p2p-platform/backend/push_notification_service.py`

**Notification Types:**

```python
# Order Notifications
ORDER_PLACED, ORDER_CONFIRMED, ORDER_PREPARING, ORDER_READY,
ORDER_PICKED_UP, ORDER_DELIVERED, ORDER_CANCELLED

# Ride Notifications
RIDE_REQUESTED, RIDE_ACCEPTED, DRIVER_ARRIVING,
RIDE_STARTED, RIDE_COMPLETED, RIDE_CANCELLED

# Driver Notifications
NEW_DELIVERY_AVAILABLE, NEW_RIDE_REQUEST, EARNINGS_UPDATED,
DOCUMENT_APPROVED, DOCUMENT_REJECTED

# Restaurant Notifications
NEW_ORDER, ORDER_ACCEPTED_BY_DRIVER
```

**Supported Platforms:**
- FCM (Firebase Cloud Messaging) - Android
- APNs (Apple Push Notification service) - iOS

### 10.3 H3 Hexagonal Grid (Location Service)

Resolution 9 cells (~0.1 km²) for:
- Driver position indexing
- Efficient neighbor lookups
- Surge zone calculation
- Demand/supply heatmaps

---

## 11. TEST CASES & RESULTS

### 11.1 Test Summary

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND TEST RESULTS: 21/21 PASSING                     │
├────────────────────────────────────────────────────────────────────────────┤
│  Success Rate: 100%                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Test Categories

#### Core Infrastructure (2 tests)
| Test | Status | Description |
|------|--------|-------------|
| API Health Check | ✓ PASS | `/health` endpoint responds |
| WebSocket Stats | ✓ PASS | `/api/websocket/stats` returns stats |

#### Legal & Compliance (2 tests)
| Test | Status | Description |
|------|--------|-------------|
| Terms of Service | ✓ PASS | Returns matchmaking platform terms |
| Privacy Policy | ✓ PASS | Returns privacy policy summary |

#### Demo Accounts (1 test)
| Test | Status | Description |
|------|--------|-------------|
| Create Demo Accounts | ✓ PASS | Creates customer, driver, restaurant demos |

#### Customer Authentication (3 tests)
| Test | Status | Description |
|------|--------|-------------|
| Register Customer | ✓ PASS | Creates new customer account |
| iOS Login | ✓ PASS | `/api/customer/login` works |
| Standard Login | ✓ PASS | `/api/auth/customer/login` works |

#### Driver Authentication (1 test)
| Test | Status | Description |
|------|--------|-------------|
| Register Driver | ✓ PASS | Creates new driver account |

#### Vendor Authentication (1 test)
| Test | Status | Description |
|------|--------|-------------|
| Register Vendor | ✓ PASS | Creates new vendor account |

#### Rideshare Matchmaking (4 tests)
| Test | Status | Description |
|------|--------|-------------|
| Fare Estimate | ✓ PASS | Returns $1 platform fee, driver earnings |
| List Rides | ✓ PASS | Proxy to ride-service works |
| Active Rides Count | ✓ PASS | Returns count of active rides |
| Get Ride ETA | ✓ PASS | Returns ETA for ride |

#### Food Delivery (4 tests)
| Test | Status | Description |
|------|--------|-------------|
| List Restaurants | ✓ PASS | Proxy to restaurant-service |
| Nearby Restaurants | ✓ PASS | Location-based search works |
| Restaurant Details | ✓ PASS | Returns restaurant info |
| Restaurant Menu | ✓ PASS | Returns menu items |

#### Order Tracking & Rating (2 tests)
| Test | Status | Description |
|------|--------|-------------|
| Full Order Tracking | ✓ PASS | Returns order status + driver |
| Rate Ride/Delivery | ✓ PASS | Rating endpoint works |

#### Push Notifications (1 test)
| Test | Status | Description |
|------|--------|-------------|
| Register Push Token | ✓ PASS | Token registration works |

### 11.3 Test Script Location

`/tmp/test_comprehensive.py`

### 11.4 Running Tests

```bash
# Start backend
cd apps/web/p2p-platform/backend
docker-compose up -d
uvicorn main_new:app --host 0.0.0.0 --port 8080

# Run tests
python3 /tmp/test_comprehensive.py
```

---

## 12. DEPLOYMENT & CI/CD

### 12.1 Environment Pipeline

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│     DEV     │─────►│   STAGING   │─────►│ PRODUCTION  │
│  (feature)  │      │  (testing)  │      │   (live)    │
└─────────────┘      └─────────────┘      └─────────────┘
     │                     │                     │
     ▼                     ▼                     ▼
  Auto-deploy         Manual gate           Manual gate
  on PR merge        + QA approval        + Exec approval
```

### 12.2 ArgoCD Applications

Location: `infrastructure/argocd/apps/`

```
argocd/apps/
├── dev/         # Development environment
├── staging/     # Staging environment
└── production/  # Production environment
```

### 12.3 Kubernetes Configuration

Location: `infrastructure/kubernetes/`

```
kubernetes/
├── api-gateway/
│   ├── nginx.conf
│   ├── deployment.yaml
│   └── kustomization.yaml
└── services/
    ├── auth-service/overlays/
    └── ...
```

### 12.4 Helm Charts

Location: `infrastructure/helm/`

```
helm/
├── backend/templates/
└── frontend/templates/
```

### 12.5 Docker Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | dollor-postgres | 5432 | Primary database |
| Redis | dollor-redis | 6379 | Cache, sessions, Geo |
| Zookeeper | dollor-zookeeper | 2181 | Kafka coordination |
| Kafka | dollor-kafka | 9093/29092 | Event streaming |
| Kafka UI | dollor-kafka-ui | 8088 | Kafka monitoring |
| ClickHouse | dollor-clickhouse | 8123/9000 | Analytics |

### 12.6 CI/CD Pipelines

- `.github/workflows/microservices-ci.yml` - Build, test, deploy microservices
- `.github/workflows/terraform-ci.yml` - Infrastructure deployment
- `.github/workflows/ci-security.yml` - Security scanning

---

## 13. SECURITY & COMPLIANCE

### 13.1 Security Scanning Tools

| Tool | Purpose | Stage |
|------|---------|-------|
| **Semgrep** | SAST - Static code analysis | Staging+ |
| **SonarQube** | Code quality + security | Staging+ |
| **Trivy** | Container vulnerability scan | Staging+ |
| **OWASP ZAP** | DAST - Dynamic testing | QA |
| **Bandit** | Python security linter | All |
| **tfsec** | Terraform security | All |

### 13.2 App Store Compliance

#### Apple App Store Requirements
- Privacy Policy URL
- Terms of Service URL
- Location permission strings (NSLocationWhenInUseUsageDescription, NSLocationAlwaysUsageDescription)
- Push notification permission explanation
- App Privacy Labels (Contact Info, Location, Payment Info, Usage Data)
- Demo accounts for review

#### Google Play Store Requirements
- Privacy Policy URL
- Data safety section
- Background location policy declaration
- Content rating questionnaire
- Financial features declaration

### 13.3 Demo Accounts

| Account | Email | Password |
|---------|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

---

## 14. NEXT STEPS & ROADMAP

### 14.1 Phase 6: App Store Submission
- [ ] Submit Customer iOS app
- [ ] Submit Driver iOS app
- [ ] Submit Restaurant iOS app
- [ ] Submit Android apps to Play Store
- [ ] Respond to App Store review feedback

### 14.2 Phase 7: Production Monitoring
- [ ] Set up production Kubernetes cluster
- [ ] Configure production database (RDS)
- [ ] Set up CloudWatch monitoring
- [ ] Configure alerts and PagerDuty
- [ ] Load testing and optimization

### 14.3 Phase 8: Feature Expansion
- [ ] Multi-city expansion
- [ ] Premium features
- [ ] Restaurant analytics dashboard
- [ ] Driver performance bonuses
- [ ] Subscription options

---

## APPENDIX A: ENVIRONMENT VARIABLES

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET_KEY=your-secret-key

# Microservices
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

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## APPENDIX B: QUICK COMMANDS

```bash
# Start P2P Backend
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080

# Start Frontend
cd /Users/jeet/StudioProjects/eatfair-ios/apps/web/p2p-platform/frontend
npm run dev

# iOS Development
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios
open EatFair.xcworkspace

# Android Development
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:installDebug

# Docker Services
cd /Users/jeet/StudioProjects/eatfair-ios/services
docker-compose up -d postgres redis kafka

# Run Tests
python3 /tmp/test_comprehensive.py
```

---

**Document prepared by TechCloudPro AI Employee**
**Platform: Dollor.ai**
**Last Updated: December 15, 2025**
