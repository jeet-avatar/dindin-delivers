# Dollor.ai Codebase Structure

## iOS Customer App

**Path:** `apps/ios/customer/eatfaircustomer/`

### ViewModels (Business Logic)

| File | Responsibility | Key Methods |
|------|---------------|-------------|
| `AuthViewModel.swift` | Authentication | `login()`, `signInWithGoogle()`, `signInWithApple()` |
| `HomeViewModel.swift` | Restaurant feed, active orders | `fetchRestaurants()`, `checkActiveOrders()` |
| `MultiRestaurantCartViewModel.swift` | Shopping cart (max 3 restaurants) | `addToCart()`, `placeOrder()`, `clearCart()` |
| `AddressViewModel.swift` | Delivery addresses | `fetchAddresses()`, `addAddress()`, `setDefault()` |
| `OrderHistoryViewModel.swift` | Past orders | `fetchOrders()`, `cancelOrder()` |
| `OrderTrackingViewModel.swift` | Real-time tracking | `trackOrder()`, `startPolling()` |
| `MenuViewModel.swift` | Restaurant menu | `fetchMenu()` |

### Views (UI)

| File | Purpose |
|------|---------|
| `MainAppView.swift` | Tab navigation root |
| `HomeView.swift` | Restaurant feed, categories, active order banner |
| `LoginView.swift` | Auth (Google, Apple, Email) |
| `RestaurantDetailView.swift` | Menu display |
| `MultiRestaurantCartView.swift` | Cart review |
| `MultiRestaurantCheckoutView.swift` | Payment, address, promo |
| `OrderSuccessView.swift` | Confirmation |
| `OrderHistoryView.swift` | Order list (Active/Completed) |
| `DeliveryTrackingView.swift` | Live tracking with map |
| `ProfileView.swift` | Account settings |

### Services

| File | Purpose |
|------|---------|
| `PaymentService.swift` | Stripe payment integration |
| `LocationManager.swift` | CoreLocation wrapper |

## Shared Package (EatFairShared)

**Path:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/`

### Key Files

| File | Purpose |
|------|---------|
| `Services/P2PAPIService.swift` | ALL backend API calls (~9000 lines) |
| `Models/Order.swift` | Order data model |
| `Models/Restaurant.swift` | Restaurant data model |
| `Models/Address.swift` | Address data model |
| `Theme.swift` | Brand colors |

### P2PAPIService Methods

**Authentication:**
- `customerLogin(email:password:)`
- `customerRegister(email:password:fullName:phone:)`
- `customerGoogleAuth(email:name:googleId:)`
- `customerAppleAuth(email:name:appleId:identityToken:)`

**Orders:**
- `createOrder(vendorId:items:address:tip:...)`
- `fetchCustomerOrders()`
- `fetchActiveOrders()`
- `trackOrder(orderId:)`
- `getFullOrderTracking(orderId:)`
- `cancelOrder(orderId:reason:)`

**Restaurants:**
- `fetchRestaurants()`
- `fetchRestaurantDetail(vendorId:)`
- `validatePromoCode(code:)`

**Addresses:**
- `fetchAddresses(userId:)`
- `createAddress(userId:address:)`
- `updateAddress(userId:addressId:address:)`
- `deleteAddress(userId:addressId:)`

## Backend (P2P)

**Path:** `apps/web/p2p-platform/backend/`

### Key Files

| File | Purpose |
|------|---------|
| `main_new.py` | FastAPI entry point, all routes |
| `models.py` | SQLAlchemy models |
| `models_extended.py` | Extended models (Promotion, etc.) |
| `config.py` | Environment configuration |

### API Routes Structure

```
/api
├── /customer
│   ├── /login (POST)
│   ├── /register (POST)
│   ├── /google-auth (POST)
│   ├── /apple-auth (POST)
│   ├── /orders (GET)
│   └── /{id}/active-orders (GET)
├── /erp
│   ├── /orders/create (POST)
│   ├── /orders/{id}/tracking (GET)
│   ├── /orders/{id}/cancel (POST)
│   └── /payments/intent (POST)
├── /vendors (GET)
│   └── /{id}/menu (GET)
├── /drivers
│   └── /{id}/location (PUT)
└── /promotions
    └── /validate (POST)
```

## iOS Driver App

**Path:** `apps/ios/delivery/`

### Key ViewModels
- `DriverAuthViewModel` - Driver authentication
- `DriverOrdersViewModel` - Available/active deliveries
- `DriverLocationViewModel` - Location broadcasting

## iOS Restaurant App

**Path:** `apps/ios/restaurant/`

### Key ViewModels
- `RestaurantAuthViewModel` - Restaurant login
- `RestaurantOrdersViewModel` - Incoming orders
- `MenuManagementViewModel` - Menu editing

## Configuration Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI employee instructions |
| `.claude/docs/` | Detailed AI documentation |
| `apps/ios/customer/GoogleService-Info.plist` | Firebase config |
| `apps/ios/fastlane/Fastfile` | Build automation |
| `apps/ios/customer/ExportOptions.plist` | Archive export config |
