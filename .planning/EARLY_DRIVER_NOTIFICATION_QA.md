# Early Driver Notification Feature - QA Knowledge Transfer

## Feature Overview

When a restaurant accepts an order, drivers are notified immediately with "ready in X minutes" ETA. Drivers can accept early and head to the restaurant while food is being prepared, reducing overall delivery time.

## New Database Columns (orders table)

| Column | Type | Description |
|--------|------|-------------|
| `estimated_prep_minutes` | INTEGER | Prep time in minutes (e.g., 15) |
| `estimated_ready_at` | TIMESTAMP | Calculated timestamp when food will be ready |
| `driver_en_route` | BOOLEAN | True when driver accepted but food not ready |
| `driver_accepted_at` | TIMESTAMP | When driver accepted the order |
| `driver_eta_to_restaurant` | INTEGER | Driver's ETA to restaurant in minutes |

## API Endpoints Updated

### 1. Customer Orders - `/api/customer/orders`
**New fields returned:**
- `driver_en_route` (bool)
- `driver_eta_text` (string, e.g., "~8 min")
- `estimated_prep_minutes` (int)
- `minutes_until_ready` (int)
- `is_ready` (bool)
- `driver_phone` (string)
- `driver_rating` (float)

### 2. Order Tracking - `/api/customer/orders/{id}/track`
**New fields returned:**
- `driver_en_route` (bool)
- `driver_eta_text` (string)
- `driver_eta_to_restaurant` (int)
- `estimated_prep_minutes` (int)
- `minutes_until_ready` (int)
- `is_ready` (bool)
- `driver` (object with full driver details)

### 3. Vendor Orders - `/api/erp/orders/vendor/{vendor_id}`
**New fields returned:**
- `driver_en_route` (bool)
- `driver_eta_text` (string)
- `driver_eta_to_restaurant` (int)
- `estimated_prep_minutes` (int)
- `estimated_ready_at` (ISO timestamp)
- `driver_accepted_at` (ISO timestamp)

### 4. Available Orders - `/api/erp/orders/available-for-delivery`
**New fields returned:**
- `estimated_prep_minutes` (int)
- `estimated_ready_at` (ISO timestamp)
- `minutes_until_ready` (int)
- `is_ready` (bool)

### 5. Restaurant Accept - `/api/erp/orders/{id}/restaurant-accept`
**New request body (optional):**
```json
{
  "estimated_prep_minutes": 15
}
```
**Response includes:** `estimated_prep_minutes`, `estimated_ready_at`

### 6. Driver Accept - `/api/erp/orders/{id}/assign-driver`
**New request body:**
```json
{
  "driver_id": 123,
  "driver_eta_minutes": 10
}
```
**Response includes:** `driver_en_route`, `driver_eta_to_restaurant`, `driver_accepted_at`

## iOS UI Changes

### Customer App (DeliveryTrackingView.swift)
- **New Banner**: "Driver heading to restaurant" appears when `driverEnRoute=true`
- Shows driver's ETA to restaurant
- Shows food ready time countdown

### Driver App (AvailableOrdersView.swift)
- **ETA Badge**: Order cards show "Ready ~15m" or "Ready Now!"
- Based on `minutesUntilReady` and `isReady` fields

### Restaurant App (EnhancedDashboardView.swift)
- **Driver Info for PREPARING orders**: When driver accepts early, restaurant sees:
  - Driver name and photo
  - Driver phone with call button
  - "Arriving in ~X min" ETA
  - Driver rating

## Test Scenarios

### Scenario 1: Early Driver Acceptance
1. Customer places order
2. Restaurant accepts with 15 min prep time
3. Driver sees order with "Ready ~15m" badge
4. Driver accepts while food is PREPARING
5. **Expected:** `driver_en_route=true`, order stays in PREPARING status
6. Customer sees "Driver heading to restaurant" banner
7. Restaurant sees driver info during PREPARING

### Scenario 2: Ready Pickup (Normal Flow)
1. Customer places order
2. Restaurant accepts and marks ready
3. Driver sees order with "Ready Now!" badge
4. Driver accepts
5. **Expected:** `driver_en_route=false`, order transitions to OUT_FOR_DELIVERY

### Scenario 3: Driver Arrives Before Food Ready
1. Same as Scenario 1
2. Driver arrives at restaurant (ETA counts down to 0)
3. Driver waits for food
4. Restaurant marks ready
5. **Expected:** Notification sent to driver "Food is ready!"

## Validation Checklist

### Backend
- [ ] Database columns exist in orders table
- [ ] `/api/customer/orders` returns all new fields
- [ ] `/api/customer/orders/{id}/track` returns all new fields
- [ ] `/api/erp/orders/vendor/{id}` returns all new fields
- [ ] `/api/erp/orders/available-for-delivery` returns ETA fields
- [ ] Restaurant accept stores `estimated_prep_minutes` and `estimated_ready_at`
- [ ] Driver accept sets `driver_en_route=true` for PREPARING orders
- [ ] Driver accept sets `driver_en_route=false` for READY orders
- [ ] Order pickup resets `driver_en_route=false`

### Customer App
- [ ] DeliveryTrackingView shows driver en-route banner
- [ ] Banner shows driver ETA to restaurant
- [ ] Banner shows food ready countdown
- [ ] Banner hides when driver is not en-route

### Driver App
- [ ] AvailableOrdersView shows ETA badge on order cards
- [ ] Badge shows "Ready ~Xm" for preparing orders
- [ ] Badge shows "Ready Now!" for ready orders
- [ ] Order details show prep time info

### Restaurant App
- [ ] EnhancedDashboardView shows driver info for PREPARING orders
- [ ] Driver info includes name, phone, ETA, rating
- [ ] Call button works
- [ ] Driver info hides when no driver assigned

## Files Modified

### Backend
- `apps/web/p2p-platform/backend/models.py` - Added 5 columns to Order
- `apps/web/p2p-platform/backend/order_flow.py` - Updated restaurant_accept, assign_driver, get_vendor_orders, get_available_orders
- `apps/web/p2p-platform/backend/main_new.py` - Updated /api/customer/orders, /api/customer/orders/{id}/track, startup migrations

### iOS Shared Library
- `apps/ios/eatfair-ios-shared/.../Models/Order.swift` - Added 8 new fields
- `apps/ios/eatfair-ios-shared/.../Services/P2PAPIService.swift` - Updated P2PCustomerOrder, P2PVendorOrder, P2PDeliveryOrder

### iOS Apps
- `apps/ios/customer/.../Views/DeliveryTrackingView.swift` - Added driver en-route banner
- `apps/ios/delivery/.../Views/AvailableOrdersView.swift` - Added ETA badge
- `apps/ios/delivery/.../ViewModels/DeliveryViewModel.swift` - Updated convertToOrder()
- `apps/ios/restaurant/.../Views/EnhancedDashboardView.swift` - Added driver info for PREPARING

## Deployment Notes

1. Database migration runs automatically on backend startup
2. Migration uses `ADD COLUMN IF NOT EXISTS` for idempotency
3. No breaking changes - all new fields are optional
4. Existing orders will have NULL values for new fields
