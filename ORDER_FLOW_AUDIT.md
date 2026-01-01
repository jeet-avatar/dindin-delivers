# Order Flow Audit - Production Backend

## Current Flow (What EXISTS)

```
Step 1: POST /api/orders          → Creates order + Stripe PaymentIntent
Step 2: POST /api/webhooks/stripe → Payment confirmed → status = CONFIRMED
Step 3: PATCH /api/orders/{id}/status → Manual status updates:
        - "preparing"
        - "out_for_delivery"
        - "delivered"
        - "cancelled"
```

## Order Status Enum (What's DEFINED)

| Status | Endpoint Exists? | Notes |
|--------|------------------|-------|
| PENDING_PAYMENT | YES | Initial state |
| CONFIRMED | YES | Set by Stripe webhook |
| PENDING_RESTAURANT | **NO** | Missing: send to restaurant |
| PENDING_MODIFICATION | **NO** | Missing: modification flow |
| DECLINED_BY_RESTAURANT | **NO** | Missing: decline handling |
| RESTAURANT_TIMEOUT | **NO** | Missing: 3-min timeout |
| PREPARING | YES | Basic status update |
| READY_FOR_PICKUP | **NO** | Missing in status update |
| OUT_FOR_DELIVERY | YES | Basic status update |
| DELIVERED | YES | Basic status update |
| CANCELLED | YES | Basic status update |

## Database Fields (What's TRACKED but NOT USED)

```python
# Restaurant Acceptance Window (3-minute timeout) - FIELDS EXIST, NO ENDPOINTS
sent_to_restaurant_at = Column(DateTime)        # ❌ Never set
restaurant_accepted_at = Column(DateTime)       # ❌ Never set
restaurant_declined_at = Column(DateTime)       # ❌ Never set
restaurant_decline_reason = Column(String)      # ❌ Never set
restaurant_timeout_at = Column(DateTime)        # ❌ Never set
ready_for_pickup_at = Column(DateTime)          # ❌ Never set

# Driver Assignment - FIELDS EXIST, NO ENDPOINTS
driver_id = Column(Integer)                     # ❌ Never set
driver_name = Column(String)                    # ❌ Never set
driver_assigned_at = Column(DateTime)           # ❌ Never set
```

---

## MISSING ENDPOINTS

### 1. Send Order to Restaurant (After Payment)
```
POST /api/orders/{order_id}/send-to-restaurant
- Sets status = PENDING_RESTAURANT
- Sets sent_to_restaurant_at = now()
- Starts 3-minute timeout timer
- Sends push notification to restaurant app
```

### 2. Restaurant Accept Order
```
POST /api/orders/{order_id}/restaurant/accept
- Validates order is PENDING_RESTAURANT
- Sets status = PREPARING
- Sets restaurant_accepted_at = now()
- Sets preparing_at = now()
- Triggers driver matching
```

### 3. Restaurant Decline Order
```
POST /api/orders/{order_id}/restaurant/decline
Body: { "reason": "Out of ingredients" }
- Sets status = DECLINED_BY_RESTAURANT
- Sets restaurant_declined_at = now()
- Sets restaurant_decline_reason
- Triggers refund process
- Notifies customer
```

### 4. Restaurant Ready for Pickup
```
POST /api/orders/{order_id}/ready-for-pickup
- Sets status = READY_FOR_PICKUP
- Sets ready_for_pickup_at = now()
- Notifies assigned driver
```

### 5. Assign Driver to Order
```
POST /api/orders/{order_id}/assign-driver
Body: { "driver_id": 123 }
- Sets driver_id
- Sets driver_name (lookup)
- Sets driver_assigned_at = now()
- Notifies driver
```

### 6. Driver Pickup Order
```
POST /api/orders/{order_id}/driver/pickup
- Validates driver is assigned
- Sets status = OUT_FOR_DELIVERY
- Sets dispatched_at = now()
```

### 7. Restaurant Timeout Handler (Background Job)
```
Cron job every 30 seconds:
- Find orders where status = PENDING_RESTAURANT
- AND sent_to_restaurant_at < now() - 3 minutes
- Set status = RESTAURANT_TIMEOUT
- Set restaurant_timeout_at = now()
- Trigger refund
- Notify customer
```

---

## Complete Order Flow (SHOULD BE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE ORDER FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Customer App                Restaurant App              Driver App          │
│  ───────────                 ──────────────              ──────────          │
│       │                            │                          │              │
│  1. Place Order                    │                          │              │
│       │                            │                          │              │
│       ▼                            │                          │              │
│  [PENDING_PAYMENT]                 │                          │              │
│       │                            │                          │              │
│  2. Pay via Stripe                 │                          │              │
│       │                            │                          │              │
│       ▼                            │                          │              │
│  [CONFIRMED] ──────────────► Push Notification               │              │
│       │                            │                          │              │
│  3. Send to Restaurant             │                          │              │
│       │                            │                          │              │
│       ▼                            ▼                          │              │
│  [PENDING_RESTAURANT] ◄──── Accept/Decline (3 min)           │              │
│       │                            │                          │              │
│       │                            ▼                          │              │
│       │                    [PREPARING] ──────────► Find Driver               │
│       │                            │                          │              │
│       │                            ▼                          ▼              │
│       │                    [READY_FOR_PICKUP] ◄──── Assign Driver            │
│       │                            │                          │              │
│       │                            │                          ▼              │
│       │                            │              [OUT_FOR_DELIVERY]         │
│       │                            │                          │              │
│       ▼                            ▼                          ▼              │
│  Track Order ◄──────────────────────────────────── [DELIVERED]              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Priority Implementation Order

1. **HIGH**: Restaurant accept/decline endpoints
2. **HIGH**: Ready for pickup endpoint
3. **HIGH**: Driver assignment endpoint
4. **MEDIUM**: Send to restaurant (auto after payment)
5. **MEDIUM**: Restaurant timeout background job
6. **LOW**: Push notifications integration

---

*Audit Date: 2025-12-31*
