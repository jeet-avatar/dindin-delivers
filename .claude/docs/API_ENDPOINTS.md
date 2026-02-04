# Dollor.ai API Endpoints Reference

> **Single Source of Truth** for API testing and iOS/Android integration
>
> Last Updated: February 3, 2026

---

## Environments

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.dollor.ai` |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` |

---

## Authentication Pattern

**IMPORTANT:** All login endpoints use `application/x-www-form-urlencoded` with `username` field (not `email`).

```bash
# Correct format
curl -X POST "$BASE_URL/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!"

# WRONG - will fail
curl -X POST "$BASE_URL/api/auth/customer/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "demo.customer@dollor.ai", "password": "..."}'
```

---

## Demo Credentials

| App | Email | Password | ID |
|-----|-------|----------|-----|
| Customer | `demo.customer@dollor.ai` | `DemoCustomer2025!` | 74 |
| Driver | `demo.driver@dollor.ai` | `DemoDriver2025!` | 48 |
| Restaurant | `demo.restaurant@dollor.ai` | `DemoRestaurant2025!` | 40 |

---

## Canonical Endpoints (Use These)

### Authentication

| App | Endpoint | Method | Content-Type |
|-----|----------|--------|--------------|
| Customer Login | `/api/auth/customer/login` | POST | form-urlencoded |
| Customer Register | `/api/auth/customer/register` | POST | JSON |
| Customer Google | `/api/auth/customer/google` | POST | JSON |
| Customer Apple | `/api/auth/customer/apple-auth` | POST | JSON |
| Driver Login | `/api/auth/driver/login` | POST | form-urlencoded |
| Driver Register | `/api/auth/driver/register` | POST | JSON |
| Vendor Login | `/api/auth/vendor/login` | POST | form-urlencoded |
| Vendor Register | `/api/auth/vendor/register` | POST | JSON |

### Customer App

| Purpose | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Get Profile | `/api/customer/profile` | GET | Bearer |
| Update Profile | `/api/customer/profile` | PUT | Bearer |
| List Vendors | `/api/vendors/published` | GET | No |
| Vendor Menu | `/api/vendors/{id}/menu` | GET | No |
| My Orders | `/api/customer/orders` | GET | Bearer |
| Order Tracking | `/api/customer/orders/{id}/track` | GET | Bearer |
| Full Tracking | `/api/erp/orders/{id}/full-tracking` | GET | Bearer |
| Addresses | `/api/customer/addresses` | GET | Bearer |
| Payment Methods | `/api/customer/payment-methods` | GET | Bearer |

### Driver App

| Purpose | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Dashboard | `/api/v5/driver/{id}/dashboard` | GET | Bearer |
| Profile | `/api/erp/drivers/{id}/profile` | GET | Bearer |
| Update Profile | `/api/erp/drivers/{id}` | PUT | Bearer |
| Documents | `/api/drivers/{id}/documents` | GET | Bearer |
| Upload Document | `/api/drivers/{id}/documents` | POST | Bearer |
| Status | `/api/drivers/{id}/status` | GET | Bearer |
| Toggle Online | `/api/auth/driver/online` | PUT | Bearer |
| Available Orders | `/api/v2/driver/deliveries/available` | GET | Bearer |
| **Accept Order** | `/api/erp/orders/{id}/assign-driver` | POST | Bearer |
| **Mark Picked Up** | `/api/erp/orders/{id}/picked-up` | POST | Bearer |
| **Mark Delivered** | `/api/erp/orders/{id}/delivered` | POST | Bearer |
| My Deliveries | `/api/erp/orders/driver/{id}/active` | GET | Bearer |
| Delivery History | `/api/drivers/{id}/deliveries` | GET | Bearer |

### Restaurant App

| Purpose | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Get Orders | `/api/erp/orders/vendor/{id}` | GET | No* |
| Update Status | `/api/erp/orders/{id}/status?status=X` | PUT | Bearer |
| Accept Order | `/api/erp/orders/{id}/restaurant-accept` | POST | Bearer |
| Decline Order | `/api/erp/orders/{id}/restaurant-decline` | POST | Bearer |
| Menu Items | `/api/vendors/{id}/menu` | GET | No |
| Update Menu Item | `/api/vendors/{id}/menu/{item_id}` | PUT | Bearer |
| Vendor Profile | `/api/vendors/{id}` | GET | No |
| Update Profile | `/api/vendors/{id}` | PUT | Bearer |
| Analytics | `/api/vendors/{id}/analytics` | GET | Bearer |

*Note: Vendor orders endpoint returns enriched driver details (phone, rating, vehicle)

---

## Alias Pattern (Legacy Support)

Many endpoints exist with and without `/api/` prefix for mobile compatibility:

```
/api/drivers/{id}/status  ← Canonical (use this)
/drivers/{id}/status      ← Alias (works, but prefer canonical)
```

**Pattern:**
- iOS apps: May use either
- Android apps: May use either
- Admin portal: Uses `/api/` prefix
- Tests: Use canonical `/api/` paths

---

## Response Formats

### Login Response (All Apps)

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "customer_id": 74,      // or driver_id, vendor_id
  "name": "Demo Customer",
  "email": "demo.customer@dollor.ai"
}
```

### Driver Login (Additional Fields)

```json
{
  "access_token": "eyJ...",
  "driver_id": 48,
  "status": "approved",
  "is_approved": true,
  "name": "Demo Driver"
}
```

### Order with Driver Details (Vendor Orders)

```json
{
  "id": 123,
  "status": "preparing",
  "driver_id": 48,
  "driver_name": "Demo Driver",
  "driver_phone": "+1234567890",
  "driver_rating": 4.8,
  "driver": {
    "id": 48,
    "name": "Demo Driver",
    "phone": "+1234567890",
    "rating": 4.8,
    "photo_url": "...",
    "vehicle": "Silver Toyota Camry",
    "license_plate": "ABC123"
  }
}
```

---

## Order Status Flow

```
pending_payment → confirmed → preparing → ready_for_pickup → picked_up → out_for_delivery → delivered
                                    ↓
                           (cancelled at any point)
```

**Status Update Endpoint:** `PUT /api/erp/orders/{id}/status?status=PREPARING`

| Status | Uppercase for API |
|--------|-------------------|
| Confirmed | `CONFIRMED` |
| Preparing | `PREPARING` |
| Ready | `READY_FOR_PICKUP` |
| Picked Up | `PICKED_UP` |
| Delivered | `DELIVERED` |
| Cancelled | `CANCELLED` |

---

## Known Duplicates (For Reference)

These endpoints are intentionally duplicated for compatibility:

| Canonical | Alias | Notes |
|-----------|-------|-------|
| `/api/auth/driver/login` | `/auth/driver/login` | Both work |
| `/api/drivers/{id}/status` | `/drivers/{id}/status` | Both work |
| `/api/erp/orders/vendor/{id}` | `/erp/orders/vendor/{id}` | Both work |

---

## Deprecated Endpoints (Do Not Use)

| Endpoint | Replacement |
|----------|-------------|
| `/api/customer/register` | Use `/api/auth/customer/register` |
| `/api/rides/estimate` | Use `/api/erp/rides/estimate` |

---

## Testing Commands

```bash
# Health check
curl "$BASE_URL/api/health"

# Customer login
curl -X POST "$BASE_URL/api/auth/customer/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!"

# Driver login
curl -X POST "$BASE_URL/api/auth/driver/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.driver@dollor.ai&password=DemoDriver2025!"

# Vendor login
curl -X POST "$BASE_URL/api/auth/vendor/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.restaurant@dollor.ai&password=DemoRestaurant2025!"

# Get vendors (no auth)
curl "$BASE_URL/api/vendors/published"

# Get customer orders (with auth)
TOKEN="..."
curl "$BASE_URL/api/customer/orders" \
  -H "Authorization: Bearer $TOKEN"
```

---

*Generated by Dollor.ai API Documentation*
*This file is checked by QA Agent 17*
