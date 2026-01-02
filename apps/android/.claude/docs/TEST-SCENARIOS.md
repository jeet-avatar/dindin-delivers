# Test Scenarios - Restaurant & Delivery Workflows

> **Environment**: Staging (`https://d3kuu45w6kl8hr.cloudfront.net`)
> **Last Verified**: 2025-12-23 11:45 UTC
> **Status**: All endpoints VERIFIED

---

## Platform Fee Structure (VERIFIED)

| Source | Fee | Status |
|--------|-----|--------|
| Customer Service Fee | $1.00 | VERIFIED |
| Restaurant Platform Fee | $1.00 | VERIFIED |
| **Platform Total** | **$2.00/order** | |

---

## Test Account Setup

> **Important**: Test accounts require specific database configuration:
> - Vendor role must be uppercase: `VENDOR`
> - Driver role must be uppercase: `DRIVER`
> - Driver status must be uppercase: `APPROVED`
> - Passwords must use bcrypt hashing (not SHA256)

---

## Customer App Test Scenarios

### 1. Authentication Flow

#### TC-C-001: Customer Login (VERIFIED)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Customer app | Splash screen appears |
| 2 | Enter valid credentials | Login button enabled |
| 3 | Tap Login | Home screen loads |

**API**: `POST /api/auth/customer/login` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test.customer@dollor.ai&password=Test123!"

# Response:
# {"access_token":"eyJ...", "customer_id":11, "customer_code":"CUST-95278",
#  "name":"Test Customer", "email":"test.customer@dollor.ai"}
```

#### TC-C-002: Customer Registration (VERIFIED)
**API**: `POST /api/auth/customer/register` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newcustomer@dollor.ai",
    "password": "Test123!",
    "full_name": "New Customer",
    "phone": "+14155559999"
  }'

# Response: {"customer_id":27, "message":"Registration successful. Welcome to Dollor.ai!"}
```

### 2. Order Flow

#### TC-C-003: Create Order (VERIFIED)
**API**: `POST /api/orders/create` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/orders/create" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 7,
    "customer_name": "Test Customer",
    "customer_email": "test.customer@dollor.ai",
    "customer_phone": "+14155551234",
    "items": [{"menu_item_id": 1, "name": "Burger", "quantity": 1, "price": 9.99}],
    "delivery_address": {
      "street": "123 Test St",
      "city": "San Francisco",
      "state": "CA",
      "zip_code": "94102",
      "latitude": "37.7749",
      "longitude": "-122.4194"
    },
    "payment_method": "card",
    "tip": 2.00
  }'

# Response (Order #7):
# {
#   "success": true,
#   "order_id": 7,
#   "order_number": "EF122300007",
#   "subtotal": 9.99,
#   "tax": 0.90,
#   "service_fee": 1.00,
#   "delivery_fee": 4.99,
#   "tip": 2.00,
#   "platform_fee": 1.00,
#   "total": 18.88,
#   "status": "Pending Payment",
#   "processed_by": "OrderBot Alpha",
#   "fee_breakdown": {
#     "customer_pays": {"subtotal": 9.99, "tax": 0.90, "service_fee": 1.00, "delivery_fee": 4.99, "tip": 2.00, "total": 18.88},
#     "restaurant_deduction": {"platform_fee": 1.00},
#     "driver_receives": {"delivery_fee": 4.99, "tip": 2.00, "total": 6.99},
#     "platform_revenue": {"from_customer_service_fee": 1.00, "from_restaurant_fee": 1.00, "total": 2.00}
#   }
# }
```

### 3. Rideshare Flow

#### TC-C-004: Request Ride (VERIFIED)
**API**: `POST /api/rides/request` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/request" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 11,
    "customer_name": "Test Customer",
    "customer_email": "test.customer@dollor.ai",
    "customer_phone": "+14155551234",
    "pickup_address": "123 Market St, San Francisco, CA 94102",
    "pickup_latitude": 37.7749,
    "pickup_longitude": -122.4194,
    "dropoff_address": "456 Mission St, San Francisco, CA 94105",
    "dropoff_latitude": 37.7897,
    "dropoff_longitude": -122.3972,
    "notes": "Meet at lobby",
    "tip": 3.00
  }'

# Response (Ride #5):
# {
#   "success": true,
#   "message": "Ride request created - waiting for driver bids",
#   "ride_request": {
#     "id": 5,
#     "request_id": "RR-20251223-A836CC",
#     "status": "open",
#     "estimated_distance_km": 2.55,
#     "estimated_duration_minutes": 5,
#     "suggested_price": 8.00,
#     "bid_count": 0
#   }
# }
```

#### TC-C-005: Accept Driver Bid (VERIFIED)
**API**: `POST /api/rides/bid/{bid_id}/respond` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/bid/4/respond" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# Response:
# {
#   "success": true,
#   "message": "Bid accepted! Ride matched with Test Driver",
#   "ride_request": {"id": 5, "status": "matched", "final_price": 7.50},
#   "accepted_bid": {"id": 4, "bid_id": "BID-20251223-05C0AF", "status": "accepted"}
# }
```

---

## Restaurant (Partner) App Test Scenarios

### 1. Authentication Flow

#### TC-R-001: Vendor Login (VERIFIED)
**API**: `POST /api/auth/vendor/login` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/vendor/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test.vendor@dollor.ai&password=Test123!"

# Response:
# {"access_token":"eyJ...", "vendor_id":7, "business_name":"Test Restaurant", "email":"test.vendor@dollor.ai"}
```

#### TC-R-002: Vendor Registration (VERIFIED)
**API**: `POST /api/auth/vendor/register` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/vendor/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newvendor@dollor.ai",
    "password": "Test123!",
    "business_name": "New Restaurant",
    "full_name": "Owner Name",
    "phone": "+14155558888",
    "cuisine_type": "American"
  }'

# Response: {"vendor_id":17, "status":"PENDING", "message":"Registration successful. Your account is pending approval."}
```

### 2. Order Management

#### TC-R-003: Accept Order (VERIFIED)
**API**: `PATCH /api/orders/{orderId}/status?status=confirmed` ✓ VERIFIED
```bash
curl -X PATCH "https://d3kuu45w6kl8hr.cloudfront.net/api/orders/7/status?status=confirmed" \
  -H "Authorization: Bearer <vendor_token>"

# Response: {"message": "Order status updated", "status": "confirmed"}
```

#### TC-R-004: Mark Order Preparing (VERIFIED)
**API**: `PATCH /api/orders/{orderId}/status?status=preparing` ✓ VERIFIED
```bash
curl -X PATCH "https://d3kuu45w6kl8hr.cloudfront.net/api/orders/7/status?status=preparing" \
  -H "Authorization: Bearer <vendor_token>"

# Response: {"message": "Order status updated", "status": "preparing"}
```

#### TC-R-005: Mark Order Ready for Pickup (VERIFIED)
**API**: `PATCH /api/orders/{orderId}/status?status=ready_for_pickup` ✓ VERIFIED
```bash
curl -X PATCH "https://d3kuu45w6kl8hr.cloudfront.net/api/orders/7/status?status=ready_for_pickup" \
  -H "Authorization: Bearer <vendor_token>"

# Response: {"message": "Order status updated", "status": "ready_for_pickup"}
```

### 3. Valid Order Status Values
- `pending_payment` - Initial state
- `confirmed` - Vendor accepted
- `preparing` - Being prepared
- `ready_for_pickup` - Ready for driver
- `out_for_delivery` - Driver picked up
- `delivered` - Completed
- `cancelled` - Cancelled

---

## Driver App Test Scenarios

### 1. Authentication Flow

#### TC-D-001: Driver Login (VERIFIED)
**API**: `POST /api/auth/driver/login` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test.driver@dollor.ai&password=Test123!"

# Response:
# {"access_token":"eyJ...", "driver_id":10, "driver_code":"DRV-00010", "name":"Test Driver"}
```

#### TC-D-002: Driver Registration (VERIFIED)
**API**: `POST /api/auth/driver/register` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newdriver@dollor.ai",
    "password": "Test123!",
    "first_name": "New",
    "last_name": "Driver",
    "phone": "+14155557777",
    "vehicle_type": "car",
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_year": "2022",
    "license_plate": "TEST123"
  }'

# Response: {"driver_id":14, "driver_code":"DRV-00014", "status":"pending"}
```

### 2. Food Delivery Flow

#### TC-D-003: Accept Delivery Order (VERIFIED)
**API**: `POST /api/v2/driver/deliveries/{orderId}/accept` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/v2/driver/deliveries/7/accept" \
  -H "Authorization: Bearer <driver_token>"

# Response: {"success": true, "message": "Delivery accepted", "order_id": 7, "order_number": "EF122300007"}
```

#### TC-D-004: Pickup Order (VERIFIED)
**API**: `POST /api/erp/orders/{orderId}/picked-up` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/erp/orders/7/picked-up" \
  -H "Authorization: Bearer <driver_token>"

# Response: {"success": true, "order_id": 7, "status": "Out for Delivery", "processed_by": "DispatchBot Gamma"}
```

#### TC-D-005: Complete Delivery (VERIFIED)
**API**: `POST /api/erp/orders/{orderId}/delivered` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/erp/orders/7/delivered" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{"deliveryProof": "photo_url", "notes": "Left at door"}'

# Response:
# {
#   "success": true,
#   "order_id": 7,
#   "order_number": "EF122300007",
#   "status": "Delivered",
#   "delivered_at": "2025-12-23T11:42:39",
#   "processed_by": ["DispatchBot Gamma", "LedgerBot Delta"],
#   "accounting": {
#     "journal_entry": "JE-20251223-00002",
#     "restaurant_payout": 8.99,
#     "driver_payout": 6.99,
#     "platform_revenue": 2.00,
#     "tax_collected": 0.90
#   }
# }
```

### 3. P2P Rideshare Flow

#### TC-D-006: Submit Bid on Ride Request (VERIFIED)
**API**: `POST /api/rides/request/{requestId}/bid` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/request/5/bid" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 10,
    "proposed_price": 7.50,
    "estimated_arrival_minutes": 4
  }'

# Response:
# {
#   "success": true,
#   "message": "Bid submitted successfully",
#   "bid": {
#     "id": 4,
#     "bid_id": "BID-20251223-05C0AF",
#     "proposed_price": 7.50,
#     "status": "pending"
#   }
# }
```

#### TC-D-007: Start Ride (VERIFIED)
**API**: `POST /api/rides/request/{requestId}/start` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/request/5/start" \
  -H "Authorization: Bearer <driver_token>"

# Response: {"success": true, "message": "Ride started", "status": "in_progress"}
```

#### TC-D-008: Complete Ride (VERIFIED)
**API**: `POST /api/rides/request/{requestId}/complete` ✓ VERIFIED
```bash
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/request/5/complete" \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{"end_latitude": 37.7897, "end_longitude": -122.3972}'

# Response: {"success": true, "message": "Ride completed", "final_price": 7.50, "status": "completed"}
```

---

## End-to-End Scenarios (VERIFIED)

### E2E-001: Complete Food Delivery Cycle ✓ VERIFIED

```
Customer Order → Vendor Accept → Ready → Driver Pickup → Delivered
```

| Step | Actor | API Endpoint | Status |
|------|-------|--------------|--------|
| 1 | Customer | `POST /api/orders/create` | ✓ |
| 2 | Vendor | `PATCH /api/orders/{id}/status?status=confirmed` | ✓ |
| 3 | Vendor | `PATCH /api/orders/{id}/status?status=ready_for_pickup` | ✓ |
| 4 | Driver | `POST /api/v2/driver/deliveries/{id}/accept` | ✓ |
| 5 | Driver | `POST /api/erp/orders/{id}/picked-up` | ✓ |
| 6 | Driver | `POST /api/erp/orders/{id}/delivered` | ✓ |

**Last Tested**: Order #7 (EF122300007) - 2025-12-23 11:42 UTC

### E2E-002: Complete P2P Rideshare Cycle ✓ VERIFIED

```
Customer Request → Driver Bid → Customer Accept → Start Ride → Complete
```

| Step | Actor | API Endpoint | Status |
|------|-------|--------------|--------|
| 1 | Customer | `POST /api/rides/request` | ✓ |
| 2 | Driver | `POST /api/rides/request/{id}/bid` | ✓ |
| 3 | Customer | `POST /api/rides/bid/{id}/respond` | ✓ |
| 4 | Driver | `POST /api/rides/request/{id}/start` | ✓ |
| 5 | Driver | `POST /api/rides/request/{id}/complete` | ✓ |

**Last Tested**: Ride #5 (RR-20251223-A836CC) - 2025-12-23 11:45 UTC

---

## Test Data

### Test Customer Account
```
Email: test.customer@dollor.ai
Password: Test123!
Customer ID: 11
Customer Code: CUST-95278
```

### Test Vendor Account
```
Email: test.vendor@dollor.ai
Password: Test123!
Vendor ID: 7
Business Name: Test Restaurant
DB Role: VENDOR (uppercase required)
```

### Test Driver Account
```
Email: test.driver@dollor.ai
Password: Test123!
Driver ID: 10
Driver Code: DRV-00010
DB Role: DRIVER (uppercase required)
DB Status: APPROVED (uppercase required)
```

---

## API Health Check Commands

```bash
# Check API health
curl https://d3kuu45w6kl8hr.cloudfront.net/health
# Response: {"status":"healthy","service":"p2p-backend","version":"1.0.1","database":"connected"}

# Check published vendors
curl https://d3kuu45w6kl8hr.cloudfront.net/api/vendors/published
# Response: {"success":true,"count":14}

# Check fare estimate
curl -X POST "https://d3kuu45w6kl8hr.cloudfront.net/api/rides/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_latitude": 37.7749,
    "pickup_longitude": -122.4194,
    "dropoff_latitude": 37.7897,
    "dropoff_longitude": -122.3972
  }'

# Check active promotions
curl https://d3kuu45w6kl8hr.cloudfront.net/api/promotions/active
# Response: {"promotions":[...], "count":3}
```

---

## Summary

| Category | Endpoints Tested | Status |
|----------|------------------|--------|
| Customer Auth | 2 | ✓ All Verified |
| Vendor Auth | 2 | ✓ All Verified |
| Driver Auth | 2 | ✓ All Verified |
| Order Flow | 4 | ✓ All Verified |
| Delivery Flow | 3 | ✓ All Verified |
| Rideshare Flow | 5 | ✓ All Verified |
| **Total** | **18** | **✓ All Verified** |

---

## Troubleshooting

### Test Account Login Fails
If test accounts return "Incorrect email or password":

1. **Check user role case**: Vendor must be `VENDOR`, Driver must be `DRIVER` (uppercase)
2. **Check driver status**: Must be `APPROVED` (uppercase)
3. **Check password hash**: Must be bcrypt format (starts with `$2b$`)

### Re-seed Test Users via kubectl
```bash
kubectl exec -n dollor-staging <pod-name> -- python3 -c "
from passlib.context import CryptContext
import psycopg2
import os

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
password_hash = pwd_context.hash('Test123!')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Fix vendor
cursor.execute(\"UPDATE users SET password_hash = %s, role = 'VENDOR', is_active = true WHERE email = 'test.vendor@dollor.ai'\", (password_hash,))

# Fix driver
cursor.execute(\"UPDATE users SET password_hash = %s, role = 'DRIVER', is_active = true WHERE email = 'test.driver@dollor.ai'\", (password_hash,))
cursor.execute(\"UPDATE drivers SET password_hash = %s, status = 'APPROVED' WHERE email = 'test.driver@dollor.ai'\", (password_hash,))

conn.commit()
print('Done!')
"
```
