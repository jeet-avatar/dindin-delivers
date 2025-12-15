# EatFair Data Architecture - Firestore vs RDS

## Overview

The EatFair platform uses a **dual-database architecture**:
- **RDS (PostgreSQL)** via Dollor API - Source of truth for business data
- **Firestore** - Real-time sync and client-side caching

---

## Data Distribution

### RDS (Dollor API Backend) - PostgreSQL

**Base URL:** `https://api.dollor.ai/api`

| Table | Description | Endpoints |
|-------|-------------|-----------|
| `customers` | Customer accounts | `POST /customer/login`, `POST /customer/register` |
| `vendors` | Restaurant profiles | `GET /public/restaurants` |
| `menu_items` | Menu items per vendor | `GET /vendors/{id}/menu` |
| `orders` | All orders (SOURCE OF TRUTH) | `POST /orders/create`, `GET /customer/orders` |
| `order_items` | Items in each order | Embedded in order |
| `deliveries` | Driver assignments | `GET /v2/driver/deliveries` |
| `driver_profiles` | Driver information | `GET /erp/drivers/{id}` |
| `payments` | Stripe transactions | `POST /payments/create-intent` |
| `promotions` | Discount codes | `GET /promotions/vendor/{id}` |
| `addresses` | Saved addresses | `GET /addresses/{customerId}` |
| `favorites` | Favorite restaurants | `GET /customer/favorites/{id}` |

### Firestore (Firebase) - Real-time Sync

| Collection | Purpose | Sync From |
|------------|---------|-----------|
| `orders` | Real-time order tracking | Synced from RDS after order creation |
| `users` | Customer profiles (Android legacy) | Local |
| `users/{id}/addresses` | Saved addresses (Android legacy) | Local |
| `restaurants` | Restaurant cache (iOS) | Seeded from RDS |
| `drivers` | Driver status & location | Real-time updates |
| `driver_sessions` | Work sessions | Created locally |
| `conversations` | Chat messages | Real-time |
| `promotions` | Active promos cache | Synced from RDS |

---

## Critical Issue: Order Creation Flow

### iOS (CORRECT)
```
1. User places order
2. iOS calls: POST /api/v3/order/create
3. Backend creates order in RDS
4. Backend returns orderId + paymentIntentClientSecret
5. iOS processes payment with Stripe
6. Backend syncs order to Firestore for real-time tracking
7. Restaurant/Driver apps see the order
```

### Android (INCORRECT - NEEDS FIX)
```
1. User places order
2. Android writes directly to Firestore  ❌ WRONG
3. Order is NOT in RDS
4. Payment may not be linked correctly
5. Restaurant/Driver apps may NOT see the order
```

---

## The Fix Required

Android CartViewModel should call the API like iOS does:

```kotlin
// BEFORE (Wrong - writes to Firestore only)
firestore.collection("orders").document(orderId).set(orderData)

// AFTER (Correct - calls API, then syncs)
val response = dollorApiService.createOrder(createOrderRequest, authToken)
// Backend handles Firestore sync automatically
```

---

## API Endpoints for Order Flow

### 1. Create Order
```
POST /api/orders/create
Body: {
    "customer_id": 123,
    "vendor_id": 456,
    "items": [
        {"menu_item_id": 1, "quantity": 2}
    ],
    "delivery_address": "123 Main St",
    "delivery_lat": 37.7749,
    "delivery_lng": -122.4194,
    "tip": 5.00
}
Response: {
    "order_id": 789,
    "status": "placed",
    "total": 45.99
}
```

### 2. Track Order (Real-time from Firestore)
```
Firestore: orders/{orderId}
Listen for status changes
```

### 3. Update Order Status (Partner/Driver)
```
POST /api/erp/orders/{orderId}/accept   <- Restaurant accepts
POST /api/erp/orders/{orderId}/ready    <- Food ready
POST /api/v2/driver/deliveries/{id}/pickup   <- Driver picked up
POST /api/v2/driver/deliveries/{id}/complete <- Delivered
```

---

## Data Consistency Rules

| Data Type | Primary Store | Sync Direction |
|-----------|--------------|----------------|
| Orders | RDS | RDS → Firestore |
| Restaurants | RDS | RDS → Cache |
| Menu Items | RDS | RDS → Cache |
| Addresses | RDS | RDS ↔ Firestore |
| Driver Location | Firestore | Firestore → RDS |
| Chat Messages | Firestore | Firestore only |
| Ratings | RDS | RDS → Firestore |

---

## Migration Plan for Android

1. **Phase 1**: Update CartViewModel to call API instead of Firestore
2. **Phase 2**: Update AddressRepo to sync with API
3. **Phase 3**: Update OrderRepo to fetch from API (with Firestore fallback)
4. **Phase 4**: Remove direct Firestore writes for orders

---

## Current Firestore Structure (After Unification)

```
orders/{orderId}
├── orderId: String
├── customerId: String
├── customerName: String
├── customerPhone: String
├── customerEmail: String
├── restaurant: {
│   ├── id: String
│   ├── name: String
│   ├── address: String
│   ├── latitude: Double
│   ├── longitude: Double
│   └── imageUrl: String
│   }
├── deliveryAddress: {
│   ├── fullAddress: String
│   ├── street: String
│   ├── unit: String
│   ├── city: String
│   ├── state: String
│   ├── zipCode: String
│   ├── latitude: Double
│   └── longitude: Double
│   }
├── items: [...]
├── subtotal: Double
├── deliveryFee: Double
├── serviceFee: Double
├── tax: Double
├── tip: Double
├── total: Double
├── status: String ("placed", "accepted", "preparing", "ready", "picked_up", "delivered")
├── placedAt: Long
├── deliveredAt: Long?
├── driverId: String?
└── driverName: String?
```

---

## Summary

| What | Where | Why |
|------|-------|-----|
| **Create orders** | RDS via API | Payment processing, business logic |
| **Track orders** | Firestore | Real-time updates |
| **Restaurant data** | RDS via API | Source of truth |
| **Driver location** | Firestore | Real-time GPS |
| **Chat** | Firestore | Real-time messaging |
| **User auth** | RDS + Firestore Auth | Security |

---

Last Updated: December 12, 2025
