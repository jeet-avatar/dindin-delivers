# Order Flow API Documentation
**Date:** 2026-02-01
**Status:** Critical findings documented - status mapping fixes needed

---

## Order Lifecycle Overview

```
PENDING_PAYMENT → PENDING_RESTAURANT → PREPARING →
PENDING_DELIVERY_DECISION → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
```

---

## Complete API Flow

### Step 1: Customer Places Order
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/create` |
| **Alias** | `POST /api/orders/create` (Android) |
| **Caller** | Customer App |
| **Status After** | `PENDING_PAYMENT` |
| **Response** | `{"success": true, "order_id": 42, "order_number": "EF0201000001", "total": 38.53}` |

---

### Step 2: Payment Confirmed
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/confirm-payment` |
| **Caller** | Backend (Stripe webhook) |
| **Status Before** | `PENDING_PAYMENT` |
| **Status After** | `PENDING_RESTAURANT` |
| **Response** | `{"success": true, "message": "Payment confirmed. Order sent to restaurant. They have 3 minutes to accept."}` |
| **Push Notification** | Sent to Restaurant: "🔔 New Order! Order #EF0201000001" |
| **Timeout** | 3 minutes (180 seconds) |

---

### Step 3: Restaurant Accepts Order
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/restaurant-accept` |
| **Caller** | Restaurant App |
| **Status Before** | `PENDING_RESTAURANT` |
| **Status After** | `PREPARING` |
| **Response** | `{"success": true, "message": "Restaurant accepted order. Now preparing."}` |
| **Side Effect** | KOT (Kitchen Order Ticket) printed if enabled |

---

### Step 4: Order Ready for Pickup
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/ready-for-pickup` |
| **Caller** | Restaurant App |
| **Status Before** | `PREPARING` |
| **Status After** | `PENDING_DELIVERY_DECISION` |
| **Response** | `{"success": true, "message": "Order ready! You have 3 minutes to decide: self-deliver or send to drivers."}` |
| **Timeout** | 3 minutes to decide delivery method |

---

### Step 5A: Restaurant Declines Delivery (Wants Driver)
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/restaurant-decline-delivery` |
| **Caller** | Restaurant App |
| **Status Before** | `PENDING_DELIVERY_DECISION` |
| **Status After** | `READY_FOR_PICKUP` |
| **Response** | `{"success": true, "message": "Order is now available for drivers."}` |
| **Push Notification** | Sent to available drivers |

---

### Step 5B: Restaurant Self-Delivers
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/restaurant-accept-delivery` |
| **Caller** | Restaurant App |
| **Status Before** | `PENDING_DELIVERY_DECISION` |
| **Status After** | `RESTAURANT_WILL_DELIVER` |
| **Response** | `{"success": true, "message": "Restaurant will self-deliver this order."}` |

---

### Step 6: Driver Views Available Orders
| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/erp/orders/available-for-delivery` |
| **Caller** | Driver App |
| **Filter** | Status = `READY_FOR_PICKUP`, driver_id = NULL |
| **Response** | List of available orders with earnings info |

---

### Step 7: Driver Accepts Delivery
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/assign-driver` |
| **Caller** | Driver App |
| **Request** | `{"driver_id": 15}` |
| **Status** | Remains `READY_FOR_PICKUP` (driver now assigned) |
| **Response** | `{"success": true, "driver_id": 15, "driver_name": "Alex Johnson"}` |

---

### Step 8: Driver Picks Up Order
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/picked-up` |
| **Caller** | Driver App |
| **Status Before** | `READY_FOR_PICKUP` |
| **Status After** | `OUT_FOR_DELIVERY` |
| **Response** | `{"success": true, "status": "Out for Delivery"}` |
| **Push Notification** | Sent to Customer: "Your order is on the way!" |

---

### Step 9: Order Delivered
| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/erp/orders/{order_id}/delivered` |
| **Caller** | Driver App |
| **Status Before** | `OUT_FOR_DELIVERY` |
| **Status After** | `DELIVERED` |
| **Response** | `{"success": true, "status": "Delivered", "delivered_at": "..."}` |
| **Side Effects** | Accounting entries created, payouts recorded |

---

## ⚠️ CRITICAL BUG: Missing Status Mappings

**File:** `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
**Location:** Lines 8804-8826 (`displayStatus` property)

### Current Mappings (Working)

| Backend Status | Display Status | ✅ |
|----------------|----------------|---|
| `pending`, `pending_payment` | "Placed" | ✅ |
| `confirmed` | "Accepted" | ✅ |
| `restaurant_timeout` | "Accepted" | ✅ |
| `preparing` | "Preparing" | ✅ |
| `ready`, `ready_for_pickup` | "Ready" | ✅ |
| `out_for_delivery` | "OnTheWay" | ✅ |
| `delivered` | "Delivered" | ✅ |
| `cancelled` | "Cancelled" | ✅ |

### Missing Mappings (BUG - Shows raw status)

| Backend Status | Current Display | Should Be |
|----------------|-----------------|-----------|
| `pending_restaurant` | "Pending_restaurant" ❌ | "Confirming" |
| `pending_delivery_decision` | "Pending_delivery_decision" ❌ | "Ready" |
| `restaurant_will_deliver` | "Restaurant_will_deliver" ❌ | "OnTheWay" |
| `declined_by_restaurant` | "Declined_by_restaurant" ❌ | "Cancelled" |

### Fix Required

Add these cases to the `displayStatus` switch statement:

```swift
case "pending_restaurant":
    // Order sent to restaurant, waiting for acceptance (3-min window)
    return "Confirming"
case "pending_delivery_decision":
    // Order ready, restaurant deciding delivery method (3-min window)
    return "Ready"
case "restaurant_will_deliver":
    // Restaurant is self-delivering
    return "OnTheWay"
case "declined_by_restaurant":
    return "Cancelled"
```

---

## Polling Intervals

| App | Interval | File |
|-----|----------|------|
| Customer | 10 seconds | `OrderTrackingViewModel.swift:215` |
| Restaurant | 30 seconds | `OrdersViewModel.swift:193` |
| Driver | 10 seconds | `DeliveryViewModel.swift:111` |

---

## Timeout Windows

| Window | Duration | What Happens on Timeout |
|--------|----------|------------------------|
| Restaurant Acceptance | 180 sec (3 min) | → `RESTAURANT_TIMEOUT` → Auto-refund |
| Delivery Decision | 180 sec (3 min) | → `DELIVERY_DECISION_TIMEOUT` → `READY_FOR_PICKUP` |

---

## Push Notifications Sent

| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| Payment Confirmed | Restaurant | 🔔 New Order! | Order #{number} - {items} items |
| Driver Assigned | Customer | Driver Assigned | {DriverName} will deliver |
| Picked Up | Customer | On The Way | Your order is on the way! |
| Delivered | Customer | Order Delivered | Rate & review |
| Timeout | Customer | Order Cancelled | Full refund issued |

---

## Financial Breakdown (Example $38.53 order)

| Recipient | Amount | Calculation |
|-----------|--------|-------------|
| **Restaurant** | $24.50 | Subtotal ($25.50) - Platform fee ($1.00) |
| **Driver** | $9.99 | Delivery fee ($4.99) + Tip ($5.00) |
| **Platform** | $2.00 | Service fee ($1.00) + Restaurant fee ($1.00) |
| **Tax** | $2.04 | Collected, held in liability |

---

## API Summary Table

| Step | Endpoint | Caller | Status After |
|------|----------|--------|--------------|
| 1 | `POST /api/erp/orders/create` | Customer | `PENDING_PAYMENT` |
| 2 | `POST /api/erp/orders/{id}/confirm-payment` | Backend | `PENDING_RESTAURANT` |
| 3 | `POST /api/erp/orders/{id}/restaurant-accept` | Restaurant | `PREPARING` |
| 4 | `POST /api/erp/orders/{id}/ready-for-pickup` | Restaurant | `PENDING_DELIVERY_DECISION` |
| 5a | `POST /api/erp/orders/{id}/restaurant-decline-delivery` | Restaurant | `READY_FOR_PICKUP` |
| 5b | `POST /api/erp/orders/{id}/restaurant-accept-delivery` | Restaurant | `RESTAURANT_WILL_DELIVER` |
| 6 | `GET /api/erp/orders/available-for-delivery` | Driver | - |
| 7 | `POST /api/erp/orders/{id}/assign-driver` | Driver | (driver assigned) |
| 8 | `POST /api/erp/orders/{id}/picked-up` | Driver | `OUT_FOR_DELIVERY` |
| 9 | `POST /api/erp/orders/{id}/delivered` | Driver | `DELIVERED` |

---

## Key Files

| Purpose | File Path |
|---------|-----------|
| Order Flow Logic | `apps/web/p2p-platform/backend/order_flow.py` |
| Main API | `apps/web/p2p-platform/backend/main_new.py` |
| Status Mapping (iOS) | `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift:8804` |
| Customer Tracking | `apps/ios/customer/eatfaircustomer/ViewModels/OrderTrackingViewModel.swift` |
| Restaurant Orders | `apps/ios/restaurant/eatffairrestaurant/ViewModels/OrdersViewModel.swift` |
| Driver Deliveries | `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift` |

---

*Generated: 2026-02-01*
