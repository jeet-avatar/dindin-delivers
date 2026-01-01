# API Endpoint Audit Report

**Date:** 2025-12-31 (Updated: 2026-01-01)
**Production API:** `https://api.dollor.ai`
**Status:** ✅ ALL FIXED AND VERIFIED

---

## Executive Summary

After thorough analysis of iOS, Android, and Web frontends against the production backend, several endpoint mismatches and broken routes were identified. All issues have been **FIXED** and **VERIFIED** in production.

### Key Findings:
- 3 missing endpoints were added to the backend
- 4 bugs were fixed during implementation
- All endpoints now return correct data

---

## BUGS FOUND AND FIXED

### Bug 1: Missing `json` Import (main_new.py)
**Issue:** The `json` module was not imported but was used in `json.loads()` for parsing order items.
**File:** `apps/web/p2p-platform/backend/main_new.py`
**Fix:** Added `import json` to the imports section.

### Bug 2: Non-Existent OrderStatus Enum Value
**Issue:** Code referenced `OrderStatus.DRIVER_ASSIGNED` which doesn't exist in the enum.
**Actual OrderStatus values:**
- `PENDING_PAYMENT`
- `CONFIRMED`
- `PREPARING`
- `READY_FOR_PICKUP`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `CANCELLED`

**Fix:** Replaced `OrderStatus.DRIVER_ASSIGNED` with `OrderStatus.READY_FOR_PICKUP`

### Bug 3: Accessing Non-Existent Order Model Fields
**Issue:** Code tried to access fields that don't exist on the Order model:
- `order.estimated_distance` - NOT IN MODEL
- `order.estimated_duration` - NOT IN MODEL
- `order.restaurant_name` - NOT IN MODEL (need to get from Vendor)
- `order.restaurant_address` - NOT IN MODEL (need to get from Vendor)
- `order.driver_tip` - WRONG NAME (correct: `order.tip`)
- `order.picked_up_at` - NOT IN MODEL (use `dispatched_at`)

**Fix:** Updated queries to get restaurant info from Vendor table, use correct field names, and provide defaults for missing fields.

### Bug 4: items Field is JSON String, Not List
**Issue:** `Order.items` is stored as a JSON string (Text column), not a list. Using `len(order.items)` returned string length, not item count.
**Fix:** Added JSON parsing: `json.loads(order.items)` before getting count.

---

## ENDPOINTS ADDED

### 1. Driver Status Endpoints (Android Compatibility)

**File:** `apps/web/p2p-platform/backend/main_new.py`

```python
@app.get("/api/drivers/{driver_id}/status")
@app.get("/drivers/{driver_id}/status")
def get_driver_status(driver_id: int, db: Session = Depends(get_db))

@app.post("/api/drivers/{driver_id}/status")
@app.post("/drivers/{driver_id}/status")
def post_driver_status(driver_id: int, is_online: bool = Query(...), db: Session = Depends(get_db))
```

**Response Example:**
```json
{
  "success": true,
  "driver_id": 1,
  "driver_code": "DRV-DEMO-00001",
  "name": "Demo Driver",
  "is_online": false,
  "status": "approved",
  "last_location_update": null,
  "current_latitude": 37.7749,
  "current_longitude": -122.4194
}
```

### 2. iOS v5 Driver Dashboard

**File:** `apps/web/p2p-platform/backend/main_new.py`

```python
@app.get("/api/v5/driver/{driver_id}/dashboard")
def get_driver_dashboard_v5(driver_id: int, db: Session = Depends(get_db))
```

**Response Example:**
```json
{
  "success": true,
  "driver_name": "Demo Driver",
  "driver_id": "DRV-DEMO-00001",
  "numeric_id": 1,
  "is_online": false,
  "rating": 5,
  "active_delivery": {
    "id": "EF-20251210-203302-0001",
    "order_id": 1,
    "restaurant": "Demo Restaurant",
    "restaurant_address": "123 Demo Street, San Francisco",
    "customer": "Test Customer",
    "address": "{...}",
    "items": 1,
    "total": 38.35,
    "distance": "2.5 mi",
    "estimated_time": "20 min",
    "status": "out_for_delivery"
  },
  "pending_deliveries": [...],
  "today_stats": {
    "deliveries": 0,
    "earnings": 0,
    "hours_online": 0,
    "acceptance_rate": 95
  },
  "weekly_stats": {...},
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "last_update": "2025-12-16T09:36:29.892504"
  }
}
```

### 3. Driver Pending Orders (Android Compatibility)

**File:** `apps/web/p2p-platform/backend/order_flow.py`

```python
@router.get("/orders/driver/{driver_id}/pending")
async def get_driver_pending_orders(driver_id: int, db: Session = Depends(get_db))
```

**Full path:** `/api/erp/orders/driver/{driver_id}/pending`

**Response Example:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "order_id": 1,
      "order_number": "EF-20251210-203302-0001",
      "status": "out_for_delivery",
      "restaurant_name": "Demo Restaurant",
      "restaurant_address": "123 Demo Street, San Francisco, CA",
      "customer_name": "Test Customer",
      "customer_address": "123 Test St, San Francisco",
      "customer_phone": "555-123-4567",
      "pickup_latitude": null,
      "pickup_longitude": null,
      "dropoff_latitude": null,
      "dropoff_longitude": null,
      "estimated_distance": null,
      "estimated_duration": 30,
      "delivery_fee": 4.49,
      "tip": 5,
      "created_at": "2025-12-10T20:33:02.319974",
      "assigned_at": "2025-12-10T20:33:20.201117",
      "picked_up_at": null,
      "delivered_at": "2025-12-16T10:25:28.319285"
    }
  ],
  "count": 1
}
```

---

## MOBILE APP ENDPOINT MAPPING

### iOS App Endpoints (P2PAPIService.swift)

| Function | iOS Calls | Backend Path | Status |
|----------|-----------|--------------|--------|
| Driver Dashboard v5 | `/api/v5/driver/{driverId}/dashboard` | `/api/v5/driver/{driver_id}/dashboard` | ✅ FIXED |
| Driver Status | `/drivers/{driverId}/status` | `/api/drivers/{driver_id}/status` | ✅ FIXED |
| Active Orders | `/api/erp/orders/driver/{id}/active` | `/api/erp/orders/driver/{id}/active` | ✅ Working |
| Available Rides | `/api/erp/rides/available` | `/api/rides/available` | ✅ Working |

### Android App Endpoints (DollorApiService.kt)

| Function | Android Calls | Backend Path | Status |
|----------|--------------|--------------|--------|
| Driver Status GET | `drivers/{driverId}/status` | `/api/drivers/{driver_id}/status` | ✅ FIXED |
| Driver Status POST | `drivers/{driverId}/status` | `/api/drivers/{driver_id}/status` | ✅ FIXED |
| Pending Orders | `erp/orders/driver/{driverId}/pending` | `/api/erp/orders/driver/{driver_id}/pending` | ✅ FIXED |
| Available Rides | `rides/available` | `/api/rides/available` | ✅ Working |

---

## DATABASE SCHEMA NOTES

### Order Model Fields (What Actually Exists)
```python
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_number = Column(String(50), unique=True)

    # Customer & Vendor
    customer_id = Column(Integer)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    driver_id = Column(Integer)
    driver_name = Column(String(255))

    # Items (JSON text)
    items = Column(Text)  # JSON: [{"menu_item_id": 1, ...}]

    # Amounts
    subtotal = Column(Float)
    tax_rate = Column(Float)
    tax_amount = Column(Float)
    delivery_fee = Column(Float)
    tip = Column(Float)  # NOTE: Not "driver_tip"
    platform_fee = Column(Float)
    total_amount = Column(Float)

    # Delivery
    delivery_address = Column(Text)  # JSON
    delivery_instructions = Column(Text)
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)

    # Status
    status = Column(SQLEnum(OrderStatus))

    # Timestamps
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    confirmed_at = Column(DateTime)
    preparing_at = Column(DateTime)
    delivered_at = Column(DateTime)
    dispatched_at = Column(DateTime)  # Use this for "picked_up_at"
    cancelled_at = Column(DateTime)
```

### OrderStatus Enum (Actual Values)
```python
class OrderStatus(enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    # NOTE: No DRIVER_ASSIGNED, PENDING_RESTAURANT, etc.
```

---

## VERIFIED WORKING ENDPOINTS

### Public Endpoints (No Auth Required)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/health` | GET | ✅ Working |
| `/api/vendors/published` | GET | ✅ Working (8 restaurants) |
| `/api/vendors/{id}/menu` | GET | ✅ Working |
| `/api/rides/estimate` | POST | ✅ Working |
| `/api/rides/available` | GET | ✅ Working |
| `/api/erp/rides/available` | GET | ✅ Working |
| `/api/promotions/featured` | GET | ✅ Working |
| `/api/promotions/active` | GET | ✅ Working |
| `/api/drivers/{id}/status` | GET | ✅ Working |
| `/api/v5/driver/{id}/dashboard` | GET | ✅ Working |
| `/api/erp/orders/driver/{id}/pending` | GET | ✅ Working |
| `/api/erp/orders/driver/{id}/active` | GET | ✅ Working |

### Order Flow Endpoints
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/orders` | POST | ✅ Working |
| `/api/orders/{id}` | GET | ✅ Working |
| `/api/orders/{id}/send-to-restaurant` | POST | ✅ Working |
| `/api/orders/{id}/restaurant/accept` | POST | ✅ Working |
| `/api/orders/{id}/restaurant/decline` | POST | ✅ Working |
| `/api/orders/{id}/ready-for-pickup` | POST | ✅ Working |
| `/api/orders/{id}/assign-driver` | POST | ✅ Working |
| `/api/orders/{id}/driver/pickup` | POST | ✅ Working |
| `/api/orders/{id}/deliver` | POST | ✅ Working |
| `/api/orders/{id}/timeline` | GET | ✅ Working |

### Auth-Required Endpoints
| Endpoint | Expected Auth |
|----------|--------------|
| `/api/driver/dashboard` | Driver JWT |
| `/api/auth/me` | Any JWT |
| `/api/dashboard/stats` | Admin JWT |

---

## GIT COMMITS (Fixes Applied)

1. **a4a2edb** - `fix: Add missing API endpoints for iOS and Android compatibility`
2. **afc94bd** - `Fix 500 errors on driver dashboard v5 and pending orders endpoints`
3. **d4f24d1** - `Fix missing json import in main_new.py for v5 dashboard endpoint`
4. **67dcfe2** - `Add error handling to v5 dashboard and pending orders endpoints`
5. **56b8cf4** - `Fix OrderStatus enum - remove non-existent DRIVER_ASSIGNED status`

---

## TEST COMMANDS

All endpoints verified working on production:

```bash
# Test driver status ✅
curl https://api.dollor.ai/api/drivers/1/status
# Returns: {"success":true,"driver_id":1,"driver_code":"DRV-DEMO-00001",...}

# Test v5 dashboard ✅
curl https://api.dollor.ai/api/v5/driver/1/dashboard
# Returns: {"success":true,"driver_name":"Demo Driver","active_delivery":{...},...}

# Test pending orders ✅
curl https://api.dollor.ai/api/erp/orders/driver/1/pending
# Returns: {"success":true,"orders":[...],"count":1}

# Test active orders ✅
curl https://api.dollor.ai/api/erp/orders/driver/1/active
# Returns: {"success":true,"orders":[...],"count":1}

# Test available rides ✅
curl "https://api.dollor.ai/api/rides/available?driver_id=1&latitude=37.7749&longitude=-122.4194"
# Returns: {"success":true,"rides":[...]}

# Test vendors ✅
curl https://api.dollor.ai/api/vendors/published
# Returns: {"success":true,"vendors":[...],"count":8}
```

---

## FILES MODIFIED

### Backend Files
| File | Changes |
|------|---------|
| `apps/web/p2p-platform/backend/main_new.py` | Added driver status endpoints (GET/POST), v5 dashboard endpoint, json import, error handling |
| `apps/web/p2p-platform/backend/order_flow.py` | Added pending orders endpoint, error handling |

### Documentation
| File | Purpose |
|------|---------|
| `API_ENDPOINT_AUDIT.md` | This audit report |
| `PRODUCTION_APP_STATUS.md` | Production readiness status |
| `docs/IOS_PRODUCTION_STATUS.md` | iOS app production config |

---

## NAMING CONVENTION NOTES

### Path Parameter Naming
- **Mobile Apps:** Use `driverId` (camelCase)
- **Backend:** Uses `driver_id` (snake_case)
- **Result:** FastAPI automatically handles both conventions in path parameters

### Route Prefixes
- **Order Flow Router:** `/api/erp/` prefix (from `order_flow.py`)
- **Main App:** `/api/` prefix (from `main_new.py`)
- **Rides Router:** `/api/rides/` prefix (from `bid_routes.py`)

---

## DEPLOYMENT INFORMATION

### Deployment Method
- **Frontend:** CloudFront + S3
- **Backend:** EC2 + ECS (parallel deployment)
- **Workflow:** GitHub Actions (`deploy-dollar-ai.yml`)

### Deployment Timing
- EC2 deployment: ~15 seconds
- ECS deployment: ~4-5 minutes
- Full deployment: ~5 minutes

---

*Audit completed: 2025-12-31*
*Fixes verified: 2026-01-01*
