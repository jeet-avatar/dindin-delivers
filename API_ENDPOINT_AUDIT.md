# API Endpoint Audit Report

**Date:** 2025-12-31
**Production API:** `https://api.dollor.ai`
**Status:** FIXED

---

## Summary

After thorough analysis of iOS, Android, and Web frontends against the production backend, several endpoint mismatches and broken routes were identified and **FIXED**.

---

## FIXES APPLIED

### 1. Added Driver Status Endpoints (Android)
**File:** `apps/web/p2p-platform/backend/main_new.py`
```python
@app.get("/api/drivers/{driver_id}/status")
@app.post("/api/drivers/{driver_id}/status")
```
- Returns driver online/offline status, location, etc.
- Updates driver online status

### 2. Added v5 Driver Dashboard (iOS)
**File:** `apps/web/p2p-platform/backend/main_new.py`
```python
@app.get("/api/v5/driver/{driver_id}/dashboard")
```
- Returns full driver dashboard with active delivery, pending orders, stats
- Uses real order data from database

### 3. Added Pending Orders Endpoint (Android)
**File:** `apps/web/p2p-platform/backend/order_flow.py`
```python
@router.get("/orders/driver/{driver_id}/pending")
```
- Full path: `/api/erp/orders/driver/{driver_id}/pending`
- Returns driver's pending and assigned orders

---

## CRITICAL ISSUES (Previously Broken - Now Fixed)

### 1. iOS: Driver Dashboard v5 Endpoint - FIXED

| Platform | Calls | Backend Has | Status |
|----------|-------|-------------|--------|
| iOS | `/api/v5/driver/{driverId}/dashboard` | `/api/v5/driver/{driver_id}/dashboard` | **FIXED** |

**Location:** `P2PAPIService.swift:3653`
```swift
guard let url = URL(string: "\(baseURL)/v5/driver/\(driverId)/dashboard") else {
```

**Impact:** iOS Driver app dashboard will fail to load.

**Fix Required:** Either:
- Add `/api/v5/driver/{driver_id}/dashboard` endpoint to backend, OR
- Update iOS to use `/api/driver/dashboard` (requires auth)

---

### 2. Android: Driver Status Endpoints - FIXED

| Platform | Calls | Backend Has | Status |
|----------|-------|-------------|--------|
| Android | `GET drivers/{driverId}/status` | `/api/drivers/{driver_id}/status` | **FIXED** |
| Android | `POST drivers/{driverId}/status` | `/api/drivers/{driver_id}/status` | **FIXED** |

**Location:** `DollorApiService.kt:489-495`
```kotlin
@GET("drivers/{driverId}/status")
suspend fun getDriverStatus(...)

@POST("drivers/{driverId}/status")
suspend fun updateDriverStatus(...)
```

**Backend Has:** `PUT /api/erp/drivers/{driver_id}/status`

**Impact:** Android Driver app cannot get/update driver status.

**Fix Options:**
- Add `GET/POST /api/drivers/{driver_id}/status` endpoints, OR
- Update Android to use `PUT /api/erp/drivers/{driver_id}/status`

---

### 3. Android: Driver Pending Orders - FIXED

| Platform | Calls | Backend Has | Status |
|----------|-------|-------------|--------|
| Android | `/api/erp/orders/driver/{driverId}/pending` | `/api/erp/orders/driver/{driver_id}/pending` | **FIXED** |

**Location:** `DollorApiService.kt:595`
```kotlin
@GET("erp/orders/driver/{driverId}/pending")
suspend fun getPendingDeliveryOrders(...)
```

**Backend Has:** `/api/erp/orders/driver/{driver_id}/active`

**Impact:** Android Driver app cannot fetch pending orders.

**Fix Required:** Either:
- Add `/api/erp/orders/driver/{driver_id}/pending` endpoint, OR
- Update Android to use `/api/erp/orders/driver/{driver_id}/active`

---

## NAMING CONVENTION MISMATCHES

### Parameter Naming: `driverId` vs `driver_id`

| Platform | Uses | Backend Expects |
|----------|------|-----------------|
| iOS | `driverId` | `driver_id` |
| Android | `driverId` | `driver_id` |
| Web | `driverId` | `driver_id` |

**Backend Routes:**
```python
@router.get("/orders/driver/{driver_id}/active")  # snake_case
```

**Impact:** May cause 404 errors if path parameter parsing is strict.

---

### Endpoint Path Inconsistencies

| Function | iOS Path | Android Path | Backend Path |
|----------|----------|--------------|--------------|
| Driver Dashboard | `/api/v5/driver/{id}/dashboard` | `drivers/{id}/dashboard` | `/api/driver/dashboard` |
| Driver Status | `drivers/{id}/status` | `drivers/{id}/status` | `/api/erp/drivers/{id}/status` |
| Available Rides | `/api/erp/rides/available` | `rides/available` | `/api/rides/available` |
| Driver Active Orders | `/api/erp/orders/driver/{id}/active` | `erp/orders/driver/{id}/pending` | `/api/erp/orders/driver/{id}/active` |

---

## VERIFIED WORKING ENDPOINTS

### Public Endpoints (No Auth)
| Endpoint | Status |
|----------|--------|
| `GET /health` | Working |
| `GET /api/vendors/published` | Working (8 restaurants) |
| `GET /api/vendors/{id}/menu` | Working |
| `POST /api/rides/estimate` | Working |
| `GET /api/rides/available` | Working |
| `GET /api/erp/rides/available` | Working |
| `GET /api/promotions/featured` | Working |
| `GET /api/promotions/active` | Working |

### Order Flow Endpoints
| Endpoint | Status |
|----------|--------|
| `POST /api/orders` | Working |
| `GET /api/orders/{id}` | Working |
| `POST /api/orders/{id}/send-to-restaurant` | Working |
| `POST /api/orders/{id}/restaurant/accept` | Working |
| `POST /api/orders/{id}/restaurant/decline` | Working |
| `POST /api/orders/{id}/ready-for-pickup` | Working |
| `POST /api/orders/{id}/assign-driver` | Working |
| `POST /api/orders/{id}/driver/pickup` | Working |
| `POST /api/orders/{id}/deliver` | Working |
| `GET /api/orders/{id}/timeline` | Working |

### ERP Endpoints
| Endpoint | Status |
|----------|--------|
| `GET /api/erp/orders/driver/{id}/active` | Working |
| `GET /api/erp/restaurants` | Working |
| `GET /api/erp/orders/{id}/full-tracking` | Working |

---

## AUTHENTICATION ISSUES

### Endpoints Requiring Auth (Return 401 without token)
| Endpoint | Expected |
|----------|----------|
| `GET /api/driver/dashboard` | Needs driver JWT |
| `GET /api/auth/me` | Needs any JWT |
| `GET /api/dashboard/stats` | Needs admin JWT |

---

## RECOMMENDED FIXES

### Priority 1: Critical (Blocking Features)

1. **Add Driver Status Endpoints**
```python
@app.get("/api/drivers/{driver_id}/status")
async def get_driver_status(driver_id: int, db: Session = Depends(get_db)):
    # Return driver online/offline status

@app.post("/api/drivers/{driver_id}/status")
async def update_driver_status(driver_id: int, ...):
    # Update driver status
```

2. **Add Driver Dashboard v5 Alias**
```python
@app.get("/api/v5/driver/{driver_id}/dashboard")
async def get_driver_dashboard_v5(driver_id: int, ...):
    # Alias to existing dashboard endpoint
```

3. **Add Pending Orders Alias**
```python
@app.get("/api/erp/orders/driver/{driver_id}/pending")
async def get_driver_pending_orders(driver_id: int, db: Session = Depends(get_db)):
    # Alias to /active endpoint or filter for pending only
```

### Priority 2: Consistency Updates

1. Standardize all mobile apps to use `/api/erp/` prefix for ERP endpoints
2. Update iOS to remove `/v5/` versioning - use standard `/api/` prefix
3. Ensure parameter names match (`driverId` -> `driver_id` in routes)

---

## FILES TO UPDATE

### Backend (Add Missing Endpoints)
- `/apps/web/p2p-platform/backend/main_new.py`
  - Add: `/api/drivers/{driver_id}/status` (GET/POST)
  - Add: `/api/v5/driver/{driver_id}/dashboard` (alias)
  - Add: `/api/erp/orders/driver/{driver_id}/pending` (alias)

### iOS (Optional - Use Correct Endpoints)
- `/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
  - Line 3653: Change `/v5/driver/` to `/driver/dashboard`

### Android (Optional - Use Correct Endpoints)
- `/shared/src/main/java/com/eatfair/shared/data/remote/DollorApiService.kt`
  - Line 489-495: Change to `/api/erp/drivers/{driverId}/status`
  - Line 595: Change `pending` to `active`

---

## TEST COMMANDS

```bash
# Test driver status (FAILS)
curl https://api.dollor.ai/api/drivers/1/status

# Test v5 dashboard (FAILS)
curl https://api.dollor.ai/api/v5/driver/1/dashboard

# Test pending orders (FAILS)
curl https://api.dollor.ai/api/erp/orders/driver/1/pending

# Test active orders (WORKS)
curl https://api.dollor.ai/api/erp/orders/driver/1/active

# Test rides available (WORKS)
curl "https://api.dollor.ai/api/rides/available?driver_id=1&latitude=37.7749&longitude=-122.4194"
```

---

*Audit completed: 2025-12-31*
