# Dollor.ai API Contract - Source of Truth

> **IMPORTANT**: This document is the single source of truth for API contracts between backend and mobile apps.
> All status values, response structures, and endpoints MUST match this specification.
> Any changes require PR review and approval.

**Last Updated**: February 2, 2026
**API Version**: 1.0.7
**Production URL**: `https://api.dollor.ai`
**Staging URL**: `https://d3kuu45w6kl8hr.cloudfront.net`

---

## Table of Contents

1. [Order Status Values](#1-order-status-values)
2. [Ride Status Values](#2-ride-status-values)
3. [Key Endpoints](#3-key-endpoints)
4. [Response Structures](#4-response-structures)
5. [Error Handling](#5-error-handling)
6. [Change Log](#6-change-log)

---

## 1. Order Status Values

### Food Order Statuses (Backend → Mobile)

**CRITICAL**: All status values are **lowercase**. Mobile apps MUST use case-insensitive comparison.

| Status Value | Description | Next Actions |
|--------------|-------------|--------------|
| `pending_payment` | Awaiting payment confirmation | Customer completes payment |
| `confirmed` | Payment confirmed, order created | Goes to restaurant |
| `pending_restaurant` | Waiting for restaurant to accept (3 min window) | Restaurant accepts/declines |
| `declined_by_restaurant` | Restaurant declined the order | Customer refunded |
| `restaurant_timeout` | Restaurant didn't respond in 3 minutes | Auto-cancelled, refund |
| `preparing` | Restaurant accepted, food being prepared | Restaurant marks ready |
| `ready_for_pickup` | Food ready, waiting for pickup | Driver picks up |
| `pending_delivery_decision` | Restaurant decides: self-deliver or driver (3 min) | Restaurant chooses |
| `restaurant_will_deliver` | Restaurant chose to self-deliver | Restaurant delivers |
| `delivery_decision_timeout` | No decision, sent to driver pool | Driver assigned |
| `out_for_delivery` | Driver has food, en route to customer | Driver delivers |
| `delivered` | Order completed | Order finished |
| `cancelled` | Order was cancelled | Order finished |

### iOS/Android Implementation

```swift
// iOS - CORRECT way to check status
if order.status.lowercased() == "preparing" {
    // Show "Mark Ready" button
}

// iOS - WRONG (will fail for lowercase statuses)
if order.status == "Preparing" {  // DON'T DO THIS
    // This won't match "preparing" from backend
}
```

```kotlin
// Android - CORRECT way
if (order.status.equals("preparing", ignoreCase = true)) {
    // Show "Mark Ready" button
}
```

---

## 2. Ride Status Values

### Ride Request Statuses

| Status Value | Description |
|--------------|-------------|
| `open` | Waiting for driver bids |
| `bidding` | Has received bids, customer reviewing |
| `matched` | Customer accepted a bid, driver assigned |
| `in_progress` | Ride is happening |
| `completed` | Ride finished |
| `cancelled` | Customer/driver cancelled |
| `expired` | No bids received in time |

### Bid Statuses

| Status Value | Description |
|--------------|-------------|
| `pending` | Waiting for customer response |
| `accepted` | Customer accepted this bid |
| `rejected` | Customer rejected this bid |
| `countered` | Customer made counter-offer |
| `withdrawn` | Driver withdrew bid |
| `expired` | Bid expired without response |

---

## 3. Key Endpoints

### Health Check
```
GET /health
```
**Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "p2p-backend",
  "version": "1.0.5",
  "timestamp": "2026-02-02T21:08:02.532290",
  "database": "connected"
}
```

### Order Full Tracking (Customer App)
```
GET /api/erp/orders/{order_id}/full-tracking
```
**Used by**: iOS Customer App, Android Customer App
**Auth**: Required (Bearer token)

### Ride Tracking (Customer App)
```
GET /api/rides/{ride_id}/track
```
**Used by**: iOS Customer App, Android Customer App
**Auth**: Required (Bearer token)

### Vendor Orders (Restaurant App)
```
GET /api/vendor/orders?vendor_id={id}
```
**Used by**: iOS Restaurant App, Android Partner App
**Auth**: Required (Vendor token)

### Update Order Status (Restaurant App)
```
PUT /api/erp/orders/{order_id}/status
Body: { "status": "PREPARING" }  // Accepts UPPERCASE
```
**Note**: Backend accepts both cases but stores lowercase

### Delivery Decision (Restaurant App)
```
POST /api/erp/orders/{order_id}/accept-delivery   // Restaurant will deliver
POST /api/erp/orders/{order_id}/decline-delivery  // Send to driver pool
```

### Driver Order Acceptance (Driver App)
```
POST /api/driver/orders/{order_id}/accept
```
**Used by**: iOS Driver App, Android OrderApp
**Auth**: Required (Driver token)

**Client Behavior Requirement**:
On successful acceptance, the mobile app MUST:
1. Immediately remove the order from `availableOrders` list
2. Immediately add the order to `myDeliveries` list (optimistic update)
3. Navigate to the Active Delivery screen
4. Call refresh in background to reconcile with server state

This ensures the driver sees navigation guidance immediately after accepting,
rather than waiting for the async API refresh to complete.

```swift
// iOS - CORRECT implementation
case .success:
    // 1. Optimistic update for instant UI feedback
    self.availableOrders.removeAll { $0.id == orderId }
    if !self.myDeliveries.contains(where: { $0.id == orderId }) {
        self.myDeliveries.insert(order, at: 0)
    }
    // 2. Start location tracking
    LocationManager.shared.startDeliveryTracking(orderId: orderId)
    // 3. Background refresh to reconcile
    self.refreshAllData()
```

```kotlin
// Android - CORRECT implementation
override fun onSuccess() {
    // 1. Optimistic update for instant UI feedback
    availableOrders.removeAll { it.id == orderId }
    if (myDeliveries.none { it.id == orderId }) {
        myDeliveries.add(0, order)
    }
    // 2. Start location tracking
    LocationManager.startDeliveryTracking(orderId)
    // 3. Background refresh to reconcile
    refreshAllData()
}
```

### Driver Order Status Updates (Driver App)
```
PUT /api/driver/orders/{order_id}/picked-up     // Driver picked up from restaurant
PUT /api/driver/orders/{order_id}/delivered     // Driver completed delivery
```

### Customer Rating Endpoints (Customer App)
```
POST /api/customer/orders/{order_id}/rate-driver      // Rate delivery driver
POST /api/customer/orders/{order_id}/rate-restaurant  // Rate restaurant
```
**Used by**: iOS Customer App, Android Customer App
**Auth**: Required (Bearer token)

**Rate Driver Request Body**:
```json
{
  "order_id": 123,
  "driver_id": 5,
  "rating": 5,
  "comment": "Great delivery!",
  "on_time": true,
  "friendly": true,
  "followed_instructions": true,
  "food_quality": true
}
```

**Rate Restaurant Request Body**:
```json
{
  "order_id": 123,
  "restaurant_id": 1,
  "rating": 5,
  "review": "Excellent food!",
  "food_quality": true,
  "portion_size": true,
  "value_for_money": true,
  "accuracy": true
}
```

**Response** (both endpoints):
```json
{
  "success": true,
  "message": "Rating submitted successfully"
}
```

---

## 4. Response Structures

### Order Full Tracking Response

```json
{
  "success": true,
  "order": {
    "id": 123,
    "order_number": "EF-20260202-123456-0001",
    "status": "preparing",           // LOWERCASE
    "items": [...],
    "subtotal": 25.99,
    "tax": 2.34,
    "delivery_fee": 4.99,
    "tip": 5.00,
    "total": 38.32,
    "delivery_address": {
      "street": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip": "78701",
      "latitude": 30.2672,
      "longitude": -97.7431
    },
    "delivery_instructions": "Leave at door"
  },
  "restaurant": {
    "id": 1,
    "name": "Demo Restaurant",
    "address": "456 Restaurant Ave, Austin",
    "phone": "5551234567",
    "latitude": 30.2650,
    "longitude": -97.7400
  },
  "driver": {
    "id": 5,
    "name": "John D.",
    "phone": "5559876543",
    "rating": 4.8,
    "photo_url": null,
    "vehicle": "Toyota Camry",
    "vehicle_color": "Silver",
    "license_plate": "ABC123",
    "location": {
      "latitude": 30.2660,
      "longitude": -97.7420
    }
  },
  "timeline": [
    { "status": "Order Placed", "time": "2026-02-02T12:00:00" },
    { "status": "Confirmed", "time": "2026-02-02T12:01:00" },
    { "status": "Preparing", "time": "2026-02-02T12:02:00" }
  ],
  "estimated_delivery": "15 mins",
  "eta": {
    "minutes": 15,
    "distance_miles": 2.3,
    "is_traffic_aware": true
  }
}
```

### Ride Tracking Response

```json
{
  "success": true,
  "order_id": 3,
  "order_number": "RR-20260202-ABC123",
  "status": "matched",               // LOWERCASE
  "driver_name": "Jane D.",
  "driver_phone": "5551234567",
  "driver_photo_url": null,
  "driver_latitude": 30.2672,
  "driver_longitude": -97.7431,
  "estimated_arrival": "8 min",
  "driver_vehicle": "2022 Honda Accord",
  "driver_vehicle_color": "Blue",
  "driver_license_plate": "XYZ789",
  "driver_rating": 4.9,
  "eta_minutes": 8,
  "driver": {
    "id": 2,
    "name": "Jane D.",
    "phone": "5551234567",
    "rating": 4.9,
    "photo_url": null,
    "latitude": 30.2672,
    "longitude": -97.7431,
    "vehicle_make": "Honda",
    "vehicle_model": "Accord",
    "vehicle_color": "Blue",
    "vehicle_plate": "XYZ789"
  },
  "driver_location": {
    "latitude": 30.2672,
    "longitude": -97.7431
  },
  "pickup": {
    "latitude": 30.2700,
    "longitude": -97.7400,
    "address": "123 Pickup St"
  },
  "dropoff": {
    "latitude": 30.2500,
    "longitude": -97.7300,
    "address": "456 Dropoff Ave"
  },
  "final_price": 25.50
}
```

### Vendor Orders Response

```json
{
  "success": true,
  "orders": [
    {
      "id": 123,
      "order_number": "EF-20260202-123456-0001",
      "status": "pending_restaurant",  // LOWERCASE
      "customer_name": "John Doe",
      "customer_phone": "5551234567",
      "items": [...],
      "subtotal": 25.99,
      "total": 38.32,
      "created_at": "2026-02-02T12:00:00",
      "delivery_address": {...}
    }
  ]
}
```

---

## 5. Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "detail": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## 6. Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-02-02 | 1.0.7 | Fixed iOS rate-driver endpoint URL: /orders/ → /customer/orders/ | Claude |
| 2026-02-02 | 1.0.7 | Documented customer rating endpoints for driver and restaurant | Claude |
| 2026-02-02 | 1.0.6 | Added driver order acceptance optimistic update requirement - fixes "No Active Delivery" bug | Claude |
| 2026-02-02 | 1.0.6 | Documented driver app endpoint contracts for accept/pickup/deliver | Claude |
| 2026-02-02 | 1.0.5 | Fixed route conflict: rides endpoint moved from /api/erp/orders/ to /api/erp/rides/ | Claude |
| 2026-02-02 | 1.0.5 | Added picked_up_at column to Order model | Claude |
| 2026-02-02 | 1.0.5 | Fixed iOS case sensitivity for status checks | Claude |
| 2026-02-01 | 1.0.4 | Added timezone suffix to timestamps | Claude |

---

## Validation Checklist

Before any API change, verify:

- [ ] Status values match this contract (lowercase)
- [ ] Response structure matches documented format
- [ ] iOS app uses `.lowercased()` for status comparison
- [ ] Android app uses `equals(..., ignoreCase = true)`
- [ ] Integration tests pass
- [ ] This document is updated

---

## Contact

- **API Issues**: Create GitHub issue with `api-bug` label
- **Contract Changes**: Require PR with `api-contract` label and 1 approval
