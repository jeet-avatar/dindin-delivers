# Dollor.ai Enterprise API Documentation

**Version:** 1.0
**Last Updated:** December 7, 2025
**Platform:** Dollor.ai - AI-Powered Food Delivery & Rideshare
**Production URL:** https://dollor.ai/api

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [API Endpoints by Category](#api-endpoints-by-category)
4. [iOS App Integration Map](#ios-app-integration-map)
5. [Database Schema](#database-schema)
6. [Authentication Flows](#authentication-flows)
7. [AI Employees](#ai-employees)
8. [Fee Structure](#fee-structure)
9. [Environment Configuration](#environment-configuration)

---

## Executive Summary

### Platform Overview

Dollor.ai is an enterprise-grade food delivery and rideshare platform featuring:

- **$1 Flat Platform Fee Model** - Revolutionary pricing for restaurants and drivers
- **AI-Powered Operations** - 10 AI employees managing order flow, dispatch, accounting
- **Multi-App Ecosystem** - Customer, Restaurant, and Driver iOS applications
- **Enterprise Integrations** - Stripe, AWS SES, Plaid, Coupa, NetSuite

### Key Metrics

| Metric | Value |
|--------|-------|
| Total API Endpoints | ~200 |
| Database Tables | 30+ |
| AI Employees | 10 |
| iOS Apps | 3 |
| Authentication Methods | 5 (Email/Password, Google, Apple, OAuth2, JWT) |

### Backend Technology Stack

- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Payments:** Stripe (Cards, ACH, Connect)
- **Email:** AWS SES
- **Authentication:** JWT tokens, OAuth2
- **Deployment:** AWS EC2 + CloudFront

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         iOS Applications                             │
├──────────────────┬──────────────────┬───────────────────────────────┤
│  Customer App    │   Restaurant App │      Delivery App             │
│  - Browse menus  │   - Manage orders│      - Accept deliveries      │
│  - Place orders  │   - Update menu  │      - GPS tracking           │
│  - Track delivery│   - View earnings│      - Earnings dashboard     │
│  - Request rides │   - AI insights  │      - Document upload        │
└────────┬─────────┴────────┬─────────┴───────────────┬───────────────┘
         │                  │                         │
         ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    P2PAPIService (Shared)                           │
│              Base URL: https://dollor.ai/api                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                                  │
├─────────────────────────────────────────────────────────────────────┤
│  main_new.py       │ Primary API (Auth, Vendors, Orders, Drivers)   │
│  order_flow.py     │ ERP Order Management + AI Employees            │
│  stripe_integration│ Payment Processing                             │
│  accounting.py     │ Financial Statements                           │
│  rideshare.py      │ Uber-style Ride Requests                       │
│  enterprise_payments│ ACH, Plaid, Stripe Connect                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌───────────────────┐
│   PostgreSQL    │    │      Stripe         │    │     AWS SES       │
│   Database      │    │   Payment Gateway   │    │   Email Service   │
└─────────────────┘    └─────────────────────┘    └───────────────────┘
```

---

## API Endpoints by Category

### 1. Authentication Endpoints (21 total)

#### Customer Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/customer/login` | Email/password login | No |
| POST | `/customer/register` | Create customer account | No |
| POST | `/customer/google-auth` | Google OAuth | No |
| POST | `/customer/apple-auth` | Apple Sign-In | No |
| POST | `/customer/password-reset/request` | Request reset code | No |
| POST | `/customer/password-reset/confirm` | Confirm with 6-digit code | No |

#### Vendor Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/vendor/login` | Vendor login (form-urlencoded) | No |
| POST | `/api/auth/vendor/register` | Register vendor account | No |

#### Driver Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/driver/login` | Driver login | No |
| POST | `/api/auth/driver/register` | Register driver account | No |
| POST | `/api/auth/driver/refresh` | Refresh expired token | Yes |
| GET | `/api/auth/driver/me` | Get driver profile | Yes |
| PUT | `/api/auth/driver/online` | Set online/offline status | Yes |
| PUT | `/api/auth/driver/location` | Update GPS location | Yes |

#### Admin Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register admin user | No |
| POST | `/api/auth/login` | Admin OAuth2 login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/password-reset/request` | Request password reset | No |
| POST | `/api/auth/password-reset/confirm` | Confirm reset | No |

---

### 2. Customer Endpoints (8 total)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/public/restaurants` | List approved restaurants | No |
| GET | `/api/public/restaurants/{id}` | Get restaurant with menu | No |
| GET | `/api/customer/orders` | Customer order history | Yes |
| GET | `/api/customer/orders/{id}/track` | Track order status | Yes |
| GET | `/api/customer/{id}/active-orders` | Get active orders | Yes |

---

### 3. Vendor/Restaurant Endpoints (26 total)

#### Vendor Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/vendors/public` | Public registration | No |
| POST | `/api/vendors` | Create vendor (admin) | Yes |
| GET | `/api/vendors` | List all vendors | Yes |
| GET | `/api/vendors/{id}` | Get vendor details | Yes |
| GET | `/api/vendor/profile` | Get current vendor profile | Yes |
| PUT | `/api/vendors/{id}` | Full vendor update | Yes |
| PATCH | `/api/vendors/{id}` | Partial update | Yes |
| PATCH | `/api/vendors/{id}/status` | Update onboarding status | Yes |
| DELETE | `/api/vendors/{id}` | Delete vendor | Yes |
| POST | `/api/vendors/{id}/create-account` | Create vendor login | No |
| POST | `/api/vendors/{id}/register-app` | Mobile app registration | No |

#### Vendor Documents
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/vendors/{id}/documents` | Get documents | Yes |
| POST | `/api/vendors/{id}/documents` | Upload document | Yes |
| DELETE | `/api/vendors/{id}/documents/{doc_id}` | Delete document | Yes |

#### Menu Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/vendors/{id}/menu` | Add menu item | Yes |
| GET | `/api/vendors/{id}/menu` | Get all menu items | Yes |
| PUT | `/api/vendors/{id}/menu/{item_id}` | Update menu item | Yes |
| PATCH | `/api/vendors/{id}/menu/{item_id}/customizations` | Update customizations | Yes |
| DELETE | `/api/vendors/{id}/menu/{item_id}` | Delete menu item | Yes |
| GET | `/api/vendors/{id}/menu/categories` | Get categories | Yes |
| POST | `/api/vendors/{id}/menu/assign-stock-images` | AI assign images | Yes |

---

### 4. Driver Endpoints (11 total)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/erp/drivers/{id}` | Get driver profile | Yes |
| PUT | `/api/drivers/{id}` | Update driver profile | Yes |
| GET | `/api/drivers/{id}/documents` | Get documents status | Yes |
| POST | `/api/drivers/{id}/documents` | Upload document | Yes |
| PATCH | `/api/drivers/{id}/approve` | Approve driver | Yes |
| GET | `/api/erp/drivers` | List all drivers | Yes |
| POST | `/api/erp/drivers/create` | Create driver | Yes |
| POST | `/api/erp/drivers/login` | ERP driver login | No |
| POST | `/api/erp/drivers/register` | ERP registration | No |
| GET | `/api/erp/orders/driver/{id}/active` | Driver's active orders | Yes |
| POST | `/api/drivers/ai-webhook` | AI verification webhook | No |

---

### 5. Order Endpoints (28 total)

#### Order Creation & Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Create order + payment intent | No |
| GET | `/api/orders` | List orders | No |
| GET | `/api/orders/{id}` | Get order details | No |
| PATCH | `/api/orders/{id}/status` | Update status | Yes |

#### ERP Order Flow
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/erp/orders/create` | Create ERP order | No |
| POST | `/api/erp/orders/{id}/confirm-payment` | Confirm payment | No |
| POST | `/api/erp/orders/{id}/start-preparing` | Start preparation | Yes |
| POST | `/api/erp/orders/{id}/ready-for-pickup` | Mark ready | Yes |
| GET | `/api/erp/orders/available-for-delivery` | Available for drivers | Yes |
| GET | `/api/erp/orders/vendor/{id}` | Vendor's orders | Yes |
| PUT | `/api/erp/orders/{id}/status` | Update status | Yes |
| POST | `/api/erp/orders/{id}/assign-driver` | Assign driver | Yes |
| POST | `/api/erp/orders/{id}/picked-up` | Mark picked up | Yes |
| POST | `/api/erp/orders/{id}/delivered` | Mark delivered | Yes |
| PUT | `/api/erp/orders/{id}/complete-delivery` | Complete delivery | Yes |
| PUT | `/api/erp/orders/{id}/unassign-driver` | Unassign driver | Yes |
| PUT | `/api/erp/orders/{id}/driver-location` | Update driver location | Yes |
| GET | `/api/erp/orders/stuck` | Get stuck orders | Yes |
| POST | `/api/erp/orders/cleanup-stuck` | Cleanup stuck orders | Yes |
| GET | `/api/erp/orders/state-machine-info` | Order state rules | No |

#### Refunds & Invoices
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders/{id}/cancel` | Cancel with refund | Yes |
| POST | `/api/orders/{id}/restaurant-reject` | Restaurant rejection | Yes |
| POST | `/api/orders/{id}/generate-invoice` | Generate PDF | Yes |
| POST | `/api/orders/{id}/send-invoice` | Email invoice | Yes |
| GET | `/api/orders/{id}/refund-status` | Refund status | Yes |
| GET | `/api/orders/{id}/invoice` | Invoice details | Yes |
| GET | `/api/refunds` | List all refunds | Yes |

---

### 6. Payment Endpoints (18 total)

#### Stripe Integration
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/webhooks/stripe` | Stripe webhook | No* |
| POST | `/api/payments/create-intent` | Create payment intent | No |

#### Enterprise Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/enterprise/payments/create` | Create card/ACH payment | No |
| POST | `/api/enterprise/payments/ach/setup` | Setup ACH | No |
| POST | `/api/enterprise/plaid/link-token` | Get Plaid token | No |
| POST | `/api/enterprise/plaid/exchange` | Exchange Plaid token | No |
| POST | `/api/enterprise/connect/onboard` | Create Connect account | Yes |
| GET | `/api/enterprise/connect/status/{id}` | Connect status | No |
| POST | `/api/enterprise/connect/dashboard-link/{id}` | Express dashboard | No |
| POST | `/api/enterprise/payouts/create` | Create payout | Yes |
| GET | `/api/enterprise/payouts/balance/{type}/{id}` | Get balance | Yes |
| GET | `/api/enterprise/payouts/history/{type}/{id}` | Payout history | Yes |
| POST | `/api/enterprise/payouts/batch` | Batch payouts | Yes |
| GET | `/api/enterprise/fees/calculate` | Calculate fees | No |
| POST | `/api/enterprise/webhooks/stripe-connect` | Connect webhook | No* |

*Verified by Stripe signature

---

### 7. Rideshare Endpoints (16 total)

#### Customer Side
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/erp/rides/request` | Request ride | No |
| GET | `/api/erp/rides/{id}/track` | Track ride | No |
| POST | `/api/erp/rides/{id}/cancel` | Cancel ride | No |
| POST | `/api/erp/rides/{id}/customer-negotiate` | Counter-offer | No |
| POST | `/api/erp/rides/{id}/customer-accept-fare` | Accept fare | No |
| GET | `/api/erp/rides/{id}/negotiation-status` | Negotiation status | No |
| POST | `/api/erp/rides/{id}/payment-intent` | Create payment | No |
| POST | `/api/erp/rides/{id}/confirm-payment` | Confirm payment | No |

#### Driver Side
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/erp/rides/available` | Available rides | Yes |
| POST | `/api/erp/rides/{id}/accept` | Accept ride | Yes |
| PUT | `/api/erp/rides/{id}/location` | Update location | Yes |
| PUT | `/api/erp/rides/{id}/pickup` | Confirm pickup | Yes |
| PUT | `/api/erp/rides/{id}/complete` | Complete ride | Yes |
| POST | `/api/erp/rides/{id}/driver-counter-offer` | Counter-offer | Yes |

#### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/erp/rides/stats/summary` | Statistics | Yes |
| GET | `/api/erp/rides/{id}/journal` | Accounting entries | Yes |

---

### 8. Accounting Endpoints (12 total)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/accounting/income-statement` | Income statement | Yes |
| GET | `/api/accounting/balance-sheet` | Balance sheet | Yes |
| GET | `/api/accounting/cash-flow-statement` | Cash flow | Yes |
| GET | `/api/accounting/dashboard` | Dashboard metrics | Yes |
| POST | `/api/accounting/process-payouts` | Process payouts | Yes |
| POST | `/api/accounting/simulate/delivery-orders` | Simulate orders | Yes |
| POST | `/api/accounting/simulate/rideshare-orders` | Simulate rides | Yes |
| POST | `/api/accounting/create-test-orders` | Create test orders | Yes |
| POST | `/api/accounting/test-all-order-scenarios` | Test all scenarios | Yes |
| POST | `/api/accounting/sync-vendor-payouts` | Sync payouts | Yes |
| GET | `/api/accounting/vendor-payouts` | Payout history | Yes |
| GET | `/api/erp/journal-entries` | Journal entries | Yes |

---

### 9. Additional Endpoints

#### Promotions (9 endpoints)
- `/api/promotions/*` - Create, manage, apply promotions

#### Realtime Events (6 endpoints)
- `/api/realtime/*` - Publish events, notifications

#### AI Dashboard (9 endpoints)
- `/api/ai-employees/*` - AI employee status, reports

#### Menu Verification (10 endpoints)
- `/api/menu-verification/*` - AI menu verification

#### Food Image AI (10 endpoints)
- `/api/vibing/*` - AI image generation

#### Auto-Onboarding (6 endpoints)
- `/api/onboarding/*` - Vendor onboarding automation

---

## iOS App Integration Map

### Customer App Endpoints

```
LoginView.swift
├── POST /customer/login
├── POST /customer/register
├── POST /customer/google-auth
├── POST /customer/apple-auth
└── POST /customer/password-reset/*

HomeView.swift
└── GET /api/public/restaurants

OrderHistoryView.swift
└── GET /api/customer/orders

DeliveryTrackingView.swift
├── GET /api/customer/orders/{id}/track
├── GET /api/erp/orders/{id}/full-tracking
└── GET /api/erp/orders/{id}/driver-location

RideRequestView.swift
├── POST /api/erp/rides/request
├── POST /api/erp/rides/{id}/cancel
├── POST /api/erp/rides/{id}/customer-negotiate
├── POST /api/erp/rides/{id}/customer-accept-fare
├── GET /api/erp/rides/{id}/negotiation-status
└── POST /api/erp/rides/{id}/payment-intent

CheckoutView.swift
├── POST /api/erp/orders/create
├── POST /api/payments/create-intent
└── POST /api/enterprise/payments/create (ACH)
```

### Restaurant App Endpoints

```
LoginView.swift
├── POST /api/auth/vendor/login
└── POST /api/auth/vendor/register

OrdersViewModel.swift
├── GET /api/erp/orders/vendor/{vendorId}
├── PUT /api/erp/orders/{id}/status
├── POST /api/erp/orders/{id}/start-preparing
└── POST /api/erp/orders/{id}/ready-for-pickup

RestaurantMenuViewModel.swift
├── GET /api/vendors/{id}/menu
├── PATCH /api/vendors/{id}/menu/{itemId}
├── POST /api/vendors/{id}/menu/assign-stock-images
├── GET /api/menu-verification/status/{id}
└── POST /api/menu-verification/approve-all/{id}

RestaurantSettingsView.swift
├── GET /api/vendor/profile
└── PUT /api/vendors/{id}/status
```

### Delivery App Endpoints

```
DriverLoginView.swift
├── POST /api/auth/driver/login
├── POST /api/auth/driver/register
└── POST /api/auth/driver/refresh

DeliveryViewModel.swift
├── GET /api/erp/orders/available-for-delivery
├── POST /api/erp/orders/{id}/assign-driver
├── POST /api/erp/orders/{id}/picked-up
├── POST /api/erp/orders/{id}/delivered
├── PUT /api/erp/orders/{id}/driver-location
└── GET /api/erp/orders/driver/{id}/active

DriverProfileView.swift
├── GET /api/erp/drivers/{id}
├── PUT /api/drivers/{id}
├── GET /api/drivers/{id}/documents
└── POST /api/drivers/{id}/documents

AvailableOrdersView.swift (Rideshare)
├── GET /api/erp/rides/available
├── POST /api/erp/rides/{id}/accept
├── PUT /api/erp/rides/{id}/location
├── PUT /api/erp/rides/{id}/pickup
└── PUT /api/erp/rides/{id}/complete
```

---

## Database Schema

### Core Tables (30+)

#### User Management
| Table | Description |
|-------|-------------|
| `users` | Admin/staff users |
| `vendors` | Restaurant accounts |
| `drivers` | Driver accounts |
| `clients` | B2B clients |

#### Order System
| Table | Description |
|-------|-------------|
| `orders` | Food delivery orders |
| `order_invoices` | Customer invoices |
| `refunds` | Refund tracking |
| `stripe_payment_logs` | Payment audit |

#### Menu System
| Table | Description |
|-------|-------------|
| `vendor_menu_items` | Menu items with customizations |

#### Financial
| Table | Description |
|-------|-------------|
| `invoices` | B2B invoices |
| `invoice_items` | Invoice line items |
| `payments` | Payment records |
| `vendor_payouts` | Restaurant payouts |
| `driver_payouts` | Driver payouts |
| `journal_entries` | Double-entry accounting |
| `journal_entry_lines` | Journal line items |

#### AI System
| Table | Description |
|-------|-------------|
| `ai_employees` | AI employee records |
| `ai_employee_activities` | Activity logs |
| `ai_employee_hourly_reports` | Hourly reports |
| `ai_employee_daily_reports` | Daily summaries |
| `dashboard_metrics` | Real-time metrics |

### Key Enums

```python
OrderStatus: PENDING_PAYMENT, CONFIRMED, PREPARING,
             READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

VendorStatus: PENDING, IN_REVIEW, APPROVED, REJECTED, SUSPENDED

DriverStatus: PENDING, APPROVED, ACTIVE, INACTIVE, SUSPENDED

RefundReason: CUSTOMER_CANCELLED, RESTAURANT_REJECTED, ITEM_UNAVAILABLE,
              DELIVERY_ISSUE, QUALITY_ISSUE, WRONG_ORDER, LATE_DELIVERY
```

---

## Authentication Flows

### Customer JWT Flow
```
1. POST /customer/login {email, password}
2. Server validates credentials
3. Returns {access_token, customer_id, name, email}
4. Client stores token in Keychain (SecureStorage)
5. All requests include: Authorization: Bearer {token}
```

### Vendor JWT Flow (Form-Encoded)
```
1. POST /api/auth/vendor/login (form-urlencoded)
   Content-Type: application/x-www-form-urlencoded
   Body: username={email}&password={password}
2. Returns {access_token, vendor_id}
3. Token stored in Keychain
```

### Driver JWT Flow
```
1. POST /api/auth/driver/login (form-urlencoded)
2. Returns {access_token, driver_id, driver_code, name}
3. Token refresh via POST /api/auth/driver/refresh
4. Location updates via PUT /api/auth/driver/location
```

### Token Expiration
- Access Token: 60 minutes (configurable)
- Refresh Token: 7 days

### Secure Storage Keys
```swift
SecureStorage.shared.customerAccessToken
SecureStorage.shared.driverAccessToken
SecureStorage.shared.vendorAccessToken
```

---

## AI Employees

| ID | Name | Role | Module | Responsibilities |
|----|------|------|--------|------------------|
| AI_EMP_001 | OrderBot Alpha | Order Orchestrator | order_flow.py | Order creation, validation, routing |
| AI_EMP_002 | KitchenBot Beta | Restaurant Coordinator | order_flow.py | Kitchen notifications, prep timing |
| AI_EMP_003 | DispatchBot Gamma | Delivery Dispatcher | order_flow.py | Driver assignment, route optimization |
| AI_EMP_004 | LedgerBot Delta | Accounting Specialist | accounting.py | Journal entries, financial statements |
| AI_EMP_005 | QualityBot Epsilon | Quality Monitor | order_flow.py | Order quality, customer feedback |
| AI_EMP_006 | AuditBot Zeta | Financial Auditor | accounting.py | Audit trails, compliance |
| - | Nova | Onboarding Specialist | auto_onboarding.py | Vendor onboarding automation |
| - | Sierra | Promotions Manager | promotions.py | AI-powered promotion suggestions |
| - | Phoenix | Events Coordinator | realtime_events.py | Real-time notifications |
| - | Aria | Menu Verification | menu_verification.py | Menu QA, pricing verification |

---

## Fee Structure

### Customer Fees
| Fee Type | Amount | Description |
|----------|--------|-------------|
| Card Processing | 2.9% + $0.30 | Stripe card fees |
| ACH Processing | 0.8% (max $5) | Bank transfer |
| ACH Discount | -$0.50 | Customer incentive |

### Platform Fees
| Fee Type | Amount | Description |
|----------|--------|-------------|
| Delivery Platform | $1.00 flat | Per delivery order |
| Rideshare Platform | $1.00 flat | Per ride |

### Vendor Payout Fees
| Fee Type | Amount | Description |
|----------|--------|-------------|
| Standard Payout | $1.00 | Weekly ACH |
| Fast Payout | $0.50/day | Daily transfers |
| Instant Payout | 1.5% | Immediate |

### Driver Payout Fees
| Fee Type | Amount | Description |
|----------|--------|-------------|
| Instant Payout | 1% (min $0.50) | Immediate transfer |

### Rideshare Pricing
| Component | Amount |
|-----------|--------|
| Base Fare | $2.00 |
| Per Mile | $1.00 |
| Per Minute | $0.15 |
| Minimum Fare | $5.00 |
| Cancellation | $5.00 |

---

## Environment Configuration

### Required Environment Variables

```bash
# Environment
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40

# Authentication
JWT_SECRET_KEY=<32+ char random string>
ADMIN_SECRET_KEY=<32+ char random string>
ADMIN_PASSWORD=<secure password>
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# AWS
AWS_REGION=us-east-1
EMAIL_FROM=noreply@dollor.ai
EMAIL_FROM_NAME=Dollor.ai

# OAuth (Optional)
OAUTH_REDIRECT_URI=https://dollor.ai/auth/callback
OKTA_CLIENT_ID=xxx
OKTA_CLIENT_SECRET=xxx
OKTA_DOMAIN=xxx.okta.com

# Optional Integrations
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
GOOGLE_PLACES_API_KEY=xxx
```

### Security Configuration

```bash
# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
AUTH_RATE_LIMIT_REQUESTS=5
AUTH_RATE_LIMIT_WINDOW=60

# Brute Force Protection
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900

# Request Limits
MAX_CONTENT_LENGTH=10485760
```

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

### Error Response
```json
{
  "detail": "Error description",
  "status_code": 400
}
```

### Paginated Response
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "pages": 5
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-07 | Initial enterprise documentation |

---

*This documentation is auto-generated and maintained by the Dollor.ai engineering team.*
