# Dollor.ai Architecture

## Repository Structure

```
eatfair-ios/                          # PRIMARY REPO
├── apps/
│   ├── ios/                          # iOS Apps (Swift/SwiftUI)
│   │   ├── customer/                 # Customer App (eatfaircustomer)
│   │   ├── delivery/                 # Driver App
│   │   ├── restaurant/               # Restaurant App
│   │   └── eatfair-ios-shared/       # Shared Swift Package
│   └── web/p2p-platform/
│       ├── backend/                  # Python FastAPI (main_new.py)
│       └── frontend/                 # React Admin Portal
├── services/core/                    # Microservices (future)
├── infrastructure/                   # K8s, Terraform, ArgoCD
└── .claude/docs/                     # AI Employee documentation
```

## iOS Apps Architecture

### Pattern: MVVM + SwiftUI

```
┌─────────────────────────────────────────────────────┐
│                     Views (SwiftUI)                  │
│  HomeView, OrderHistoryView, CheckoutView, etc.     │
└─────────────────────┬───────────────────────────────┘
                      │ @StateObject / @EnvironmentObject
┌─────────────────────▼───────────────────────────────┐
│                   ViewModels                         │
│  HomeViewModel, CartViewModel, AuthViewModel, etc.  │
└─────────────────────┬───────────────────────────────┘
                      │ API calls
┌─────────────────────▼───────────────────────────────┐
│              EatFairShared Package                   │
│         P2PAPIService.shared (singleton)            │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────┐
│              P2P Backend (FastAPI)                   │
│           /api/customer/*, /api/erp/*               │
└─────────────────────────────────────────────────────┘
```

### Shared Package (EatFairShared)

**Location:** `apps/ios/eatfair-ios-shared/`

**Contains:**
- `P2PAPIService` - All backend API calls
- Data models (Order, Restaurant, Address, etc.)
- Theme and styling
- Shared utilities

**Used by:** All 3 iOS apps (Customer, Driver, Restaurant)

## Backend Architecture

### P2P Backend (Main)

**Location:** `apps/web/p2p-platform/backend/`
**Entry point:** `main_new.py`
**Framework:** FastAPI (Python)

**Key Endpoints:**

| Route | Purpose |
|-------|---------|
| `/api/customer/*` | Customer auth, orders, addresses |
| `/api/erp/*` | Order management, payments |
| `/api/vendors/*` | Restaurant management |
| `/api/drivers/*` | Driver management |
| `/api/rides/*` | Rideshare |

### Database

**Type:** PostgreSQL
**ORM:** SQLAlchemy

**Key Tables:**
- `customers` - Customer accounts
- `orders` - Food orders
- `vendors` - Restaurants
- `drivers` - Delivery drivers
- `addresses` - Customer addresses
- `promotions` - Promo codes

## Data Flow

### Order Placement Flow

```
Customer App                    Backend                     Restaurant App
     │                            │                              │
     │ POST /api/erp/orders/create│                              │
     ├───────────────────────────►│                              │
     │                            │ Insert into orders table     │
     │                            │ Create Stripe PaymentIntent  │
     │◄───────────────────────────┤                              │
     │ { order_id, client_secret }│                              │
     │                            │                              │
     │ Stripe Payment Confirmed   │                              │
     ├───────────────────────────►│                              │
     │                            │ POST notification to restaurant
     │                            ├─────────────────────────────►│
     │                            │                              │
     │                            │ Restaurant accepts/prepares  │
     │                            │◄─────────────────────────────┤
     │                            │                              │
     │ GET /api/erp/orders/{id}/tracking                        │
     ├───────────────────────────►│                              │
     │◄───────────────────────────┤                              │
     │ { status, driver, ETA }    │                              │
```

## Environments

| Environment | API URL | Usage |
|-------------|---------|-------|
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net` | Development/Testing |
| Production | `https://api.dollor.ai` | Live users |

## Authentication

### Customer Auth (P2P Backend)

1. **Email/Password** → `/api/customer/login`
2. **Google OAuth** → `/api/customer/google-auth`
3. **Apple Sign-In** → `/api/customer/apple-auth` (sends identity_token)

**Token Storage:** UserDefaults (customerToken, customerId)

### No Firebase Auth

Build 1006+ removed Firebase Auth dependency. P2P backend is sole auth source.

## Payments

### Stripe Integration

**Flow:**
1. App calls `/api/erp/payments/intent` to create PaymentIntent
2. Backend returns `client_secret`
3. App presents Stripe PaymentSheet or Apple Pay
4. On success, app calls `/api/erp/orders/{id}/confirm`

**Supported Methods:**
- Apple Pay
- Credit/Debit cards
- Saved cards (Stripe Customer)
