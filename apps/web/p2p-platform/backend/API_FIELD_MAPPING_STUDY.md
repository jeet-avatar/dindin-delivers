# COMPREHENSIVE API FIELD MAPPING STUDY
> Generated: February 4, 2026
> Purpose: Document all API endpoints, field mappings, and platform expectations before cleanup

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total Backend Endpoints | 170+ |
| Endpoints in main_new.py | 127+ |
| Endpoints in order_flow.py | 45+ |
| **Duplicate Endpoints** | **9 exact duplicates** |
| iOS Endpoints Called | 106 |
| Android Endpoints Called | 98 |
| React Frontend Endpoints | 85+ |

---

## CRITICAL FIELD MAPPING ISSUES FOUND

### Issue #1: Order Items Format (FIXED Feb 5, 2026)
| Platform | Expected | Backend Returned | Status |
|----------|----------|-----------------|--------|
| iOS | `unit_price`, `total_price` | `price` only | ✅ FIXED |
| Android | `unit_price`, `total_price` | `price` only | ✅ FIXED |

### Issue #2: Driver Login Response Fields
| Platform | Expected Field | Backend Field | Match? |
|----------|---------------|---------------|--------|
| iOS | `driver_id` | `driver_id` | ✅ |
| Android | `driver_id`, `driver_code` | `driver_id` | ⚠️ Missing `driver_code` |

### Issue #3: Customer Profile Fields
| Platform | Expected | Backend Returns |
|----------|----------|-----------------|
| iOS | `full_name` | `name` |
| Android | `name` | `name` |
| **Note**: iOS uses CodingKeys to map `full_name` → `name`

---

## DUPLICATE ENDPOINTS - DETAILED ANALYSIS

### 1. POST `/api/erp/rides/estimate`

**main_new.py (Line 3395-3396):**
```python
@app.get("/api/erp/rides/estimate")
@app.post("/api/erp/rides/estimate")
def estimate_fare_frontend(...)
```
Request: `pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, state_code, tip`
Response:
```json
{
  "base_fare": 2.50,
  "distance_fee": "<miles × 1.50>",
  "time_fee": "<minutes × 0.25>",
  "platform_fee": "<$1/$2/$3 tiered>",
  "driver_platform_fee": "<matches customer>",
  "tax": "<state-based>"
}
```

**order_flow.py (Line 717):**
```python
@router.post("/rides/estimate")  # Becomes /api/erp/rides/estimate
def estimate_ride_fare_endpoint(...)
```
Request: `pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, state_code, tip, is_airport`
Response:
```json
{
  "success": true,
  "distance_miles": "<float>",
  "duration_minutes": "<int>",
  "fare_estimate": {
    "base_fare": "<float>",
    "distance_cost": "<float>",
    "time_cost": "<float>",
    "subtotal": "<float>",
    "platform_fee": "<float>",
    "total": "<float>"
  },
  "fare_range": {"low": "<float>", "high": "<float>"},
  "pricing_info": "<human-readable>"
}
```

**iOS Expects (RideFareEstimateResponse):**
```swift
struct RideFareEstimate: Codable {
    let distanceMiles: Double       // distance_miles
    let durationMinutes: Int        // duration_minutes
    let breakdown: FareBreakdown
    let subtotal: Double
    let platformFee: Double         // platform_fee
    let total: Double
    let tier: String
    let tierLabel: String           // tier_label
    let driverInfo: DriverFareInfo  // driver_info
    let suggestedBids: [RideSuggestedBid]  // suggested_bids
}
```

**Android Expects (FareEstimateResponse):**
```kotlin
data class RideFareEstimate(
    @SerializedName("distance_miles") val distanceMiles: Double,
    @SerializedName("duration_minutes") val durationMinutes: Int,
    val breakdown: FareBreakdown,
    val subtotal: Double,
    @SerializedName("platform_fee") val platformFee: Double,
    val total: Double,
    @SerializedName("suggested_bids") val suggestedBids: List<RideSuggestedBid>
)
```

**VERDICT:** Keep `order_flow.py` - has richer response structure matching mobile apps.

---

### 2. POST `/api/erp/rides/request`

**main_new.py (Line 3230):**
Request Model (RideRequestModel):
```python
customer_name: Optional[str]
customer_email: Optional[str]
customer_phone: Optional[str]
pickup_address: dict
dropoff_address: dict
tip: Optional[float] = 0.0
ride_type: Optional[str] = "standard"
```

**order_flow.py (Line 766):**
Request Model (RideRequest):
```python
customer_name: str  # REQUIRED
customer_email: str  # REQUIRED
customer_phone: str  # REQUIRED
pickup_address: Dict[str, Any]
dropoff_address: Dict[str, Any]
notes: Optional[str]
tip: float = 0.0
# Missing: ride_type
```

**iOS Sends:**
```swift
struct RideRequestParams: Encodable {
    let customerId: Int              // customer_id
    let pickupAddress: RideAddress   // pickup_address
    let pickupLatitude: Double       // pickup_latitude
    let pickupLongitude: Double      // pickup_longitude
    let dropoffAddress: RideAddress  // dropoff_address
    let dropoffLatitude: Double      // dropoff_latitude
    let dropoffLongitude: Double     // dropoff_longitude
    let rideType: String             // ride_type
    let biddingDurationMinutes: Int  // bidding_duration_minutes
    let specialRequests: String?     // special_requests
    let customerPreferredPrice: Double? // customer_preferred_price
}
```

**Android Sends:**
```kotlin
data class RideRequestBody(
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("pickup_address") val pickupAddress: RideLocation,
    @SerializedName("pickup_latitude") val pickupLatitude: Double,
    @SerializedName("pickup_longitude") val pickupLongitude: Double,
    @SerializedName("dropoff_address") val dropoffAddress: RideLocation,
    @SerializedName("dropoff_latitude") val dropoffLatitude: Double,
    @SerializedName("dropoff_longitude") val dropoffLongitude: Double,
    @SerializedName("ride_type") val rideType: String,
    @SerializedName("special_requests") val specialRequests: String?,
    @SerializedName("customer_preferred_price") val customerPreferredPrice: Double?
)
```

**FIELD MISMATCH:**
| Field | main_new.py | order_flow.py | iOS | Android |
|-------|------------|---------------|-----|---------|
| `customer_id` | ❌ Missing | ❌ Missing | ✅ Sends | ✅ Sends |
| `customer_name` | Optional | Required | ❌ Not sent | ❌ Not sent |
| `ride_type` | ✅ Has | ❌ Missing | ✅ Sends | ✅ Sends |
| `bidding_duration_minutes` | ❌ Missing | ❌ Missing | ✅ Sends | ❌ Not sent |
| `customer_preferred_price` | ❌ Missing | ❌ Missing | ✅ Sends | ✅ Sends |
| `notes` | ❌ Missing | ✅ Has | ❌ Not sent | ❌ Not sent |

**ACTION REQUIRED:** Consolidate both into single endpoint accepting all fields.

---

### 3. PUT `/api/erp/orders/{order_id}/status`

**main_new.py (Line 15074):**
Type: Proxy endpoint
```python
return await proxy_request(ORDER_SERVICE_URL, f"/api/orders/{order_id}/status", method="PUT")
```

**order_flow.py (Line 2236):**
Type: Full implementation
```python
class UpdateStatusRequest(BaseModel):
    status: str

# Status mapping with timestamps:
# pending_payment → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered → cancelled
```

**iOS Sends:**
```swift
// PUT request with status string
struct OrderStatusUpdate: Encodable {
    let status: String  // e.g., "preparing", "ready_for_pickup"
}
```

**Android Sends:**
```kotlin
// PATCH /api/orders/{orderId}/status
data class StatusUpdateRequest(
    val status: String  // "confirmed", "preparing", "ready_for_pickup", "cancelled"
)
```

**ISSUE:** iOS uses PUT, Android uses PATCH, main_new proxies to external service.

**VERDICT:** Keep `order_flow.py` - has complete business logic.

---

### 4. POST `/api/erp/orders/{order_id}/assign-driver`

**main_new.py (Line 15101):**
Type: Proxy endpoint
```python
return await proxy_request(ORDER_SERVICE_URL, f"/api/orders/{order_id}/assign-driver", method="POST")
```

**order_flow.py (Line 2369):**
Type: Full implementation
Request Model:
```python
class AssignDriverRequest(BaseModel):
    driver_id: int
    driver_eta_minutes: Optional[int] = None
```
Response:
```json
{
  "success": true,
  "order_id": 123,
  "order_number": "DOLL2026123",
  "driver_name": "John Smith",
  "status": "out_for_delivery",
  "estimated_pickup_time": "2026-02-04T15:30:00Z"
}
```

**iOS Sends:**
```swift
struct AssignDriverRequest: Encodable {
    let driverId: Int  // driver_id
}
```

**Android Sends:**
```kotlin
data class AssignDriverRequest(
    @SerializedName("driver_id") val driverId: Int
)
```

**VERDICT:** Keep `order_flow.py` - has full implementation with notifications.

---

### 5. GET `/api/erp/drivers`

**main_new.py (Line 15398):**
Type: Proxy with filtering
```python
# Supports: status, is_online, limit query params
return await proxy_request(DRIVER_SERVICE_URL, "/api/drivers", params=params)
```

**order_flow.py (Line 2966):**
Type: Full implementation (no filtering)
Response:
```json
{
  "success": true,
  "drivers": [
    {
      "id": 1,
      "driver_id": "DRV-001",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "555-1234",
      "status": "active",
      "rating": 4.8,
      "total_deliveries": 150,
      "is_online": true
    }
  ]
}
```

**iOS Expects:**
```swift
struct P2PDriver: Codable {
    let id: Int
    let driverId: String      // driver_id
    let name: String
    let email: String
    let phone: String
    let status: String
    let rating: Double
    let totalDeliveries: Int  // total_deliveries
    let isOnline: Bool        // is_online
}
```

**VERDICT:** Enhance `order_flow.py` to add filtering parameters.

---

### 6. PUT `/api/erp/drivers/{driver_id}/location`

**main_new.py (Line 15435):**
Type: Proxy
```python
# Proxies to: /api/driver/location (different path!)
```

**order_flow.py (Line 3660):**
Type: Full implementation
Request:
```python
class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float
```
Response:
```json
{
  "success": true,
  "driver_id": 48,
  "location_updated": true,
  "active_order_updated": 123  // or null
}
```

**iOS Sends:**
```swift
struct DriverLocationUpdate: Encodable {
    let latitude: Double
    let longitude: Double
    let accuracy: Double?  // optional
}
```

**Android Sends:**
```kotlin
data class LocationUpdate(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null
)
```

**VERDICT:** Keep `order_flow.py` - main_new has wrong proxy path.

---

### 7. PUT `/api/erp/drivers/{driver_id}/status`

**main_new.py (Line 15426):**
Type: Proxy
```python
# HTTP Method mismatch: Uses PATCH downstream but endpoint is PUT
```

**order_flow.py (Line 3700):**
Type: Full implementation
```python
# Parameter: is_online (boolean)
# Sets: went_online_at or went_offline_at timestamp
```

**iOS Sends:**
```swift
struct DriverStatusUpdate: Encodable {
    let isOnline: Bool  // is_online
}
```

**Android Sends:**
```kotlin
data class DriverStatusRequest(
    val status: String,  // "online" or "offline"
    val location: LocationUpdate? = null
)
```

**ISSUE:** iOS sends boolean `is_online`, Android sends string `status`.

**VERDICT:** Keep `order_flow.py`, fix HTTP method consistency.

---

### 8. GET `/api/erp/analytics/realtime`

**main_new.py (Line 15768-15770):**
Type: Proxy
Response (minimal):
```json
{
  "orders": 0,
  "rides": 0,
  "revenue": 0,
  "message": "Analytics service unavailable"
}
```

**order_flow.py (Line 3730):**
Type: Full implementation
Response (rich):
```json
{
  "success": true,
  "timestamp": "2026-02-04T10:30:00Z",
  "processed_by": "Analytics AI",
  "orders": {
    "by_status": {...},
    "total_today": 45,
    "active": 12
  },
  "drivers": {
    "total_active": 25,
    "online_now": 18,
    "utilization_rate": 0.72
  },
  "restaurants": {
    "active": 40
  },
  "revenue": {
    "total_today": 1234.56,
    "platform_fees": 89.00,
    "delivery_fees": 234.50,
    "tips_collected": 156.00,
    "orders_completed": 38
  },
  "performance": {
    "avg_prep_time_minutes": 18,
    "avg_delivery_time_minutes": 25
  }
}
```

**VERDICT:** Keep `order_flow.py` - much richer data.

---

### 9. GET `/api/erp/analytics/ai-employees`

**main_new.py (Line 15779-15780):**
Type: Hardcoded response
```python
# Returns static array with all metrics = 0
```

**order_flow.py (Line 3825):**
Type: Database query
```python
# Returns actual AI employee statistics from database
```

**VERDICT:** Keep `order_flow.py` - has real data.

---

## VENDOR ORDERS ENDPOINT - CRITICAL FIX APPLIED

### GET `/api/erp/orders/vendor/{vendor_id}`

**order_flow.py (Line 2124):** ✅ FIXED
```python
# Now returns items with unit_price and total_price
items_data = []
for item in raw_items:
    price = item.get("price") or item.get("unit_price") or 0
    quantity = item.get("quantity") or 1
    items_data.append({
        "menu_item_id": item.get("menu_item_id"),
        "name": item.get("name", "Item"),
        "quantity": quantity,
        "price": price,
        "unit_price": price,      # iOS expects this
        "total_price": round(price * quantity, 2)  # iOS expects this
    })
```

**iOS Expects (P2PVendorOrderItem):**
```swift
public struct P2PVendorOrderItem: Codable {
    public let name: String
    public let quantity: Int
    public let unitPrice: Double    // unit_price - REQUIRED
    public let totalPrice: Double   // total_price - REQUIRED

    enum CodingKeys: String, CodingKey {
        case name, quantity
        case unitPrice = "unit_price"
        case totalPrice = "total_price"
    }
}
```

**Android Expects (OrderItem):**
```kotlin
data class OrderItem(
    val name: String,
    val quantity: Int,
    @SerializedName("unit_price") val unitPrice: Double,
    @SerializedName("total_price") val totalPrice: Double,
    @SerializedName("menu_item_id") val menuItemId: Int?
)
```

**STATUS:** ✅ FIXED - Both platforms now receive correct fields.

---

## AUTHENTICATION ENDPOINTS - COMPLETE MAPPING

### Customer Login

| Field | Backend Response | iOS Expects | Android Expects |
|-------|-----------------|-------------|-----------------|
| `access_token` | ✅ | ✅ accessToken | ✅ access_token |
| `token_type` | ✅ | ✅ tokenType | ✅ token_type |
| `customer_id` | ✅ | ✅ customerId | ✅ customer_id |
| `name` | ✅ | ✅ name | ✅ name |
| `email` | ✅ | ✅ email | ✅ email |
| `phone` | ✅ | ✅ phone | ❌ Not expected |

### Driver Login

| Field | Backend Response | iOS Expects | Android Expects |
|-------|-----------------|-------------|-----------------|
| `access_token` | ✅ | ✅ accessToken | ✅ access_token |
| `token_type` | ✅ | ✅ tokenType | ✅ token_type |
| `driver_id` | ✅ | ✅ driverId | ✅ driver_id |
| `name` | ✅ | ✅ name | ✅ name |
| `email` | ✅ | ✅ email | ✅ email |
| `driver_code` | ❌ Missing | ❌ Not expected | ⚠️ Expected but optional |

### Vendor Login

| Field | Backend Response | iOS Expects | Android Expects |
|-------|-----------------|-------------|-----------------|
| `access_token` | ✅ | ✅ accessToken | ✅ access_token |
| `token_type` | ✅ | ✅ tokenType | ✅ token_type |
| `vendor_id` | ✅ | ✅ vendorId | ✅ vendor_id |
| `name` | ✅ | ✅ name | ✅ business_name |
| `email` | ✅ | ✅ email | ✅ email |

---

## RECOMMENDED CLEANUP ACTIONS

### Phase 1: Remove Duplicates from main_new.py (SAFE)
These endpoints in main_new.py are proxies that should be removed:

| Line | Endpoint | Reason |
|------|----------|--------|
| 15074 | PUT `/api/erp/orders/{order_id}/status` | Proxy - order_flow has full impl |
| 15101 | POST `/api/erp/orders/{order_id}/assign-driver` | Proxy - order_flow has full impl |
| 15398 | GET `/api/erp/drivers` | Proxy - order_flow has impl (add filtering) |
| 15426 | PUT `/api/erp/drivers/{driver_id}/status` | HTTP mismatch - order_flow correct |
| 15435 | PUT `/api/erp/drivers/{driver_id}/location` | Wrong proxy path - order_flow correct |
| 15768-70 | GET `/api/erp/analytics/realtime` | Minimal data - order_flow has rich data |
| 15779-80 | GET `/api/erp/analytics/ai-employees` | Hardcoded - order_flow has real data |

### Phase 2: Consolidate Request Models (REQUIRES TESTING)
| Endpoint | Action |
|----------|--------|
| `/api/erp/rides/estimate` | Keep order_flow, remove main_new |
| `/api/erp/rides/request` | Merge: add `customer_id`, `ride_type`, `customer_preferred_price` to order_flow |

### Phase 3: Add iOS Aliases (SAFE)
Ensure these aliases exist for iOS (without /api prefix):
- `/erp/orders/vendor/{vendor_id}` ✅ Already exists
- `/erp/drivers/{driver_id}` ✅ Already exists
- `/erp/analytics/realtime` ✅ Already exists
- `/erp/analytics/ai-employees` ✅ Already exists

---

## FIELD NAMING CONVENTIONS

### Backend → iOS (CodingKeys)
| Backend (snake_case) | iOS (camelCase) |
|---------------------|-----------------|
| `access_token` | `accessToken` |
| `customer_id` | `customerId` |
| `driver_id` | `driverId` |
| `vendor_id` | `vendorId` |
| `unit_price` | `unitPrice` |
| `total_price` | `totalPrice` |
| `order_number` | `orderNumber` |
| `delivery_fee` | `deliveryFee` |
| `platform_fee` | `platformFee` |
| `is_online` | `isOnline` |

### Backend → Android (@SerializedName)
| Backend (snake_case) | Android (camelCase) |
|---------------------|---------------------|
| `access_token` | `accessToken` via @SerializedName |
| `customer_id` | `customerId` via @SerializedName |
| Same pattern for all fields... |

---

## TESTING CHECKLIST

Before removing any duplicate endpoints, verify:

- [ ] Restaurant app can fetch orders with items showing correctly
- [ ] Driver app can accept/pickup/deliver orders
- [ ] Customer app can track orders with driver location
- [ ] Rideshare fare estimates return all expected fields
- [ ] Analytics dashboard shows real data
- [ ] All authentication flows work (email, Google, Apple)

---

*Document Created: February 4, 2026*
*Last Updated: February 4, 2026*
*Author: Claude AI Employee*
