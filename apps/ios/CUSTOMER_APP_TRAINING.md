# iOS Customer App - Subject Matter Expert Training Guide

> **App Name:** Dollor Customer App
> **Bundle ID:** com.dollorai.customer
> **Current Build:** 1008
> **Last Updated:** January 29, 2026

---

## Quick Reference

| Component | Technology |
|-----------|-----------|
| UI Framework | SwiftUI |
| Architecture | MVVM |
| Backend | P2P REST API (source of truth) |
| Payments | Stripe + Apple Pay |
| Maps | Google Maps SDK |
| Auth | Google Sign-In, Apple Sign-In, Email/Password |

---

## 1. App Architecture

### File Structure
```
eatfaircustomer/
├── eatfaircustomerApp.swift     # Entry point
├── ViewModels/                   # Business logic (7 main ViewModels)
│   ├── AuthViewModel.swift
│   ├── HomeViewModel.swift
│   ├── MultiRestaurantCartViewModel.swift
│   ├── AddressViewModel.swift
│   ├── OrderHistoryViewModel.swift
│   ├── OrderTrackingViewModel.swift
│   └── MenuViewModel.swift
├── Views/                        # UI components (~34 views)
│   ├── MainAppView.swift         # Tab navigation root
│   ├── HomeView.swift
│   ├── LoginView.swift
│   ├── OrderHistoryView.swift
│   └── ...
├── Services/                     # External integrations
│   ├── PaymentService.swift
│   └── LocationManager.swift
└── Theme/
    └── Theme.swift               # Brand colors
```

### Navigation Flow
```
App Launch
    ↓
AuthViewModel.isAuthenticated?
    ├── NO  → LoginView (Google/Apple/Email)
    └── YES → MainAppView
                ↓
            TabView (4 tabs)
            ├── Home (HomeView)
            ├── Search (SearchRestaurantsView)
            ├── Orders (OrderHistoryView)
            └── Profile (ProfileView)
```

---

## 2. Core ViewModels

### AuthViewModel.swift
**Responsibility:** Customer authentication

| Method | Purpose |
|--------|---------|
| `login(email:password:)` | Email login via P2P |
| `register(email:password:fullName:phone:)` | New customer registration |
| `signInWithGoogle()` | Google OAuth |
| `signInWithApple()` | Apple Sign-In with identity token |
| `requestPasswordReset(email:)` | Send reset code |
| `confirmPasswordReset()` | Complete password reset |
| `logout()` | Clear session |

**Key Properties:**
- `isAuthenticated: Bool` - Auth gate for app
- `customerName/Email: String` - Profile info
- `isLoading: Bool` - Loading state

---

### HomeViewModel.swift
**Responsibility:** Restaurant feed and active orders

| Method | Purpose |
|--------|---------|
| `fetchRestaurants()` | Load from P2P backend |
| `checkActiveOrders()` | Check for in-progress deliveries |
| `searchRestaurants(query:)` | Client-side search |
| `filterByCuisine(:)` | Category filtering |

**Key Properties:**
- `p2pRestaurants: [P2PRestaurant]` - Restaurant list
- `hasActiveOrder: Bool` - Shows active order banner
- `activeOrder: Order?` - Current delivery

**Data Source:** P2P Backend (Build 1008+)

---

### MultiRestaurantCartViewModel.swift
**Responsibility:** Shopping cart (up to 3 restaurants)

| Method | Purpose |
|--------|---------|
| `addToCart(item:from:)` | Add item with customizations |
| `updateQuantity(for:quantity:)` | Change quantity |
| `removeItem(withId:)` | Remove item |
| `clearCart()` | Empty cart |
| `placeOrder(deliveryAddress:tip:...)` | Create order |

**Pricing Logic:**
```swift
subtotal = sum of (item.price * quantity)
platformFee = restaurantCount * $1.00
deliveryFee = $5.00 + (restaurantCount - 1) * $2.00
tax = subtotal * 0.10
total = subtotal + platformFee + deliveryFee + tax + tip
```

**Key Properties:**
- `items: [CartItem]` - Cart contents
- `restaurants: [String: Restaurant]` - Restaurants in cart
- `orderPlaced: Bool` - Triggers success screen
- `lastOrderNumber/Items/Total` - Saved for success screen

---

### OrderHistoryViewModel.swift
**Responsibility:** Order history and cancellation

| Method | Purpose |
|--------|---------|
| `fetchOrders()` | Load customer orders |
| `cancelOrder(_:reason:)` | Cancel with refund |
| `fetchRefundStatus(for:)` | Get refund details |
| `canCancelOrder(_:)` | Check if cancellable |

**Key Properties:**
- `orders: [Order]` - Order history
- `refundStatuses: [String: P2PRefundStatusResponse]` - Refund info

---

### OrderTrackingViewModel.swift
**Responsibility:** Real-time order tracking

| Method | Purpose |
|--------|---------|
| `trackOrder(orderId:)` | Start tracking |
| `fetchFullOrderTracking(orderId:)` | Get timeline + driver |
| `startPolling()` | 10-second updates |
| `stopPolling()` | Stop updates |

**Key Properties:**
- `currentOrder: Order?` - Order being tracked
- `driverLocation: CLLocationCoordinate2D?` - Live location
- `timelineEvents: [P2PTimelineEvent]` - Status history
- `estimatedTime: String` - ETA display

---

## 3. Order Status Mapping (Build 1008)

**Critical for order display:**

| Backend Status | Display Status | Tab |
|----------------|----------------|-----|
| `pending_payment` | Placed | Active |
| `confirmed` | Accepted | Active |
| `restaurant_timeout` | Accepted | Active |
| `preparing` | Preparing | Active |
| `ready_for_pickup` | Ready | Active |
| `out_for_delivery` | OnTheWay | Active |
| `delivered` | Delivered | Completed |
| `cancelled` | Cancelled | Completed |

**Filter Logic (OrderHistoryView):**
```swift
Active: ["Placed", "Accepted", "Preparing", "Ready", "PickedUp", "OnTheWay"]
Completed: ["Delivered", "Cancelled"]
```

---

## 4. Data Flow Examples

### Placing an Order
```
User taps "Pay" in CheckoutView
    ↓
MultiRestaurantCartViewModel.placeOrder()
    ↓
P2PAPIService.createOrder(vendorId, items, address, tip...)
    ↓
POST /api/erp/orders/create
    ↓
Response: { order_id, order_number, total }
    ↓
Save to lastOrderNumber, lastOrderItems, etc.
    ↓
clearCart() + set orderPlaced = true
    ↓
MainAppView shows OrderSuccessView
```

### Fetching Active Orders (Build 1008)
```
HomeView appears
    ↓
HomeViewModel.checkActiveOrders()
    ↓
p2pAPI.fetchActiveOrders()
    ↓
GET /api/customer/{id}/active-orders
    ↓
Filter by displayStatus in ["Placed", "Accepted", ...]
    ↓
Set activeOrder and hasActiveOrder
    ↓
HomeView shows active order banner
```

---

## 5. P2P API Endpoints Used

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customer/login` | POST | Email login |
| `/api/customer/register` | POST | Registration |
| `/api/customer/google-auth` | POST | Google OAuth |
| `/api/customer/apple-auth` | POST | Apple Sign-In |

### Orders
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/erp/orders/create` | POST | Create order |
| `/api/customer/orders` | GET | Order history |
| `/api/customer/{id}/active-orders` | GET | Active deliveries |
| `/api/erp/orders/{id}/tracking` | GET | Full tracking |
| `/api/erp/orders/{id}/cancel` | POST | Cancel order |

### Restaurants
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vendors` | GET | Restaurant list |
| `/api/vendors/{id}/menu` | GET | Menu items |
| `/api/promotions/validate` | POST | Promo code |

### Addresses
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/customers/{id}/addresses` | GET/POST | List/Create |
| `/api/customers/{id}/addresses/{aid}` | PUT/DELETE | Update/Delete |

---

## 6. Key Features

### Multi-Restaurant Cart
- Maximum 3 restaurants per order
- Extra $2 delivery fee per additional restaurant
- $1 platform fee per restaurant
- Items grouped by restaurant in cart view
- Orange cart button when multiple restaurants

### Payment Methods
1. **Apple Pay** - PKPaymentAuthorizationController
2. **Stripe Payment Sheet** - Saved cards + new card
3. **Card selection** - Choose from saved cards

### Real-Time Tracking
- 10-second polling interval
- Driver location on map
- Status timeline with timestamps
- ETA calculation based on distance

### Promo Codes
- Validated via `/api/promotions/validate`
- Shows discount in checkout
- Promo name displayed in success screen

---

## 7. Build 1008 Changes

| Change | File | Impact |
|--------|------|--------|
| Status mapping fix | P2PAPIService.swift | Orders show correctly |
| P2P active orders | HomeViewModel.swift | Home banner works |
| Build number | project.pbxproj | 1007 → 1008 |

**Status Fixes:**
- `restaurant_timeout` → "Accepted" (was unmapped)
- `confirmed` → "Accepted" (was "Confirmed")
- `out_for_delivery` → "OnTheWay" (was "Out for Delivery")

---

## 8. Testing Checklist

### Order History
- [ ] Active tab shows orders with Placed/Accepted/Preparing status
- [ ] Completed tab shows Delivered/Cancelled orders
- [ ] All tab shows everything
- [ ] Cancel button works for cancellable orders
- [ ] Refund status displays after cancellation

### Home Active Order
- [ ] Banner appears when order in progress
- [ ] ETA displays correctly
- [ ] Tap navigates to tracking

### Cart & Checkout
- [ ] Items from multiple restaurants allowed (max 3)
- [ ] Pricing shows correct fees
- [ ] Apple Pay works
- [ ] Stripe payment works
- [ ] Promo codes apply discount
- [ ] Success screen shows order details

---

## 9. Common Issues & Solutions

### Orders Not Showing
**Cause:** Status mismatch between backend and filter
**Solution:** Check `P2PCustomerOrder.displayStatus` mapping

### Active Order Not Appearing
**Cause:** Using Firebase instead of P2P
**Solution:** Use `p2pAPI.fetchActiveOrders()` (Build 1008+)

### Payment Fails
**Cause:** Invalid Stripe client secret
**Solution:** Check PaymentService.createPaymentIntent()

### Cart Clears Unexpectedly
**Cause:** `clearCart()` called at wrong time
**Solution:** Only clear after successful `placeOrder()`

---

## 10. Environment Configuration

### Staging (Testing)
```
API: https://d3kuu45w6kl8hr.cloudfront.net/api
```

### Production
```
API: https://api.dollor.ai
```

### Demo Credentials
```
Email: demo.customer@dollor.ai
Password: DemoCustomer2025!
```

---

*Document generated for Build 1008 - January 29, 2026*
