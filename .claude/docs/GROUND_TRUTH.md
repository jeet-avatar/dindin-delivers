# DOLLOR.AI GROUND TRUTH (Backend-Verified)

> Auto-generated from backend source code. Every fact includes file:line reference.
> Last verified: February 15, 2026

---

## 1. REGISTRATION FIELDS (Per User Type)

### Customer Registration
- **Endpoint:** `POST /api/auth/customer/register` (`main_new.py:2619`)
- **Request fields:** `email` (required), `password` (required), `name` OR `full_name` (one required), `phone` (optional)
- **DB storage:** `first_name` + `last_name` (split from name), `email`, `phone`, `is_active=True`
- **Name field:** Single `name` or `full_name` in request, split into `first_name`/`last_name` in DB (`main_new.py:2684`)

### Driver Registration
- **Endpoint:** `POST /api/auth/driver/register` (`main_new.py:2079`)
- **Request fields:** `email`, `password`, `first_name`, `last_name`, `phone` (all required), `vehicle_type`, `license_number`, `date_of_birth` (optional)
- **DB storage:** `first_name` + `last_name` as SEPARATE columns (`models.py:706-707`)
- **IMPORTANT:** Driver uses `first_name`/`last_name` separately - NOT a single `name` field

### Vendor Registration
- **Endpoint:** `POST /api/auth/vendor/register` (`main_new.py:1469`)
- **Request fields:** `email`, `password` (required), `full_name` OR `name` (one required), `restaurant_name` OR `business_name` (one required)
- **DB storage:** `contact_name` (owner name), `restaurant_name`, `company_name` on Vendor table (`main_new.py:1522`)
- **User table:** `full_name` (single field, `models.py:53`)

---

## 2. ACTIVE STATUS (Per User Type)

### Customer
- **Field:** `is_active` Boolean on Customer model (`models.py:624`)
- **Login check:** `if not customer.is_active: raise 403` (`main_new.py:2594`)
- **NOT an enum.** `CustomerStatus` enum exists (`models.py:564`) but is NEVER used on Customer model
- **Default:** `True` at registration (`main_new.py:2691`)

### Driver
- **Field:** `status` using `DriverStatus` enum (`models.py:690-696`)
- **Values:** `pending`, `approved`, `active`, `inactive`, `suspended`, `online`
- **Login blocks:** Only `SUSPENDED` (`main_new.py:2022`)
- **Registration default:** `DriverStatus.PENDING` (`main_new.py:2111`)

### Vendor
- **Field:** `onboarding_status` using `VendorStatus` enum (`models.py:27-32`)
- **Values:** `pending`, `in_review`, `approved`, `rejected`, `suspended`
- **Login blocks:** Any status that is NOT `approved` (`main_new.py:1314`)

---

## 3. VEHICLE FIELDS (Driver)

**Actual DB columns** (`models.py:721-726`):
- `vehicle_type` (car/motorcycle/bicycle)
- `vehicle_make`, `vehicle_model`, `vehicle_year`, `vehicle_color`, `license_plate`

**Does NOT exist:** `vehicle_registration` - no such field anywhere in codebase

---

## 4. PRICING MODEL (Canonical - Model A: Fare-Tiered)

### Food Delivery Fees

| Fee | Amount | Variable | Source |
|-----|--------|----------|--------|
| Customer service fee | **$1.00 flat** | `CUSTOMER_SERVICE_FEE` | `order_flow.py:400` |
| Restaurant platform fee | **$1.00 flat** (deducted at settlement) | `RESTAURANT_PLATFORM_FEE` | `order_flow.py:401` |
| Driver commission | **$0.00** (driver keeps 100%) | hardcoded | `main_new.py:6431` |
| Platform revenue per order | **$2.00** ($1 customer + $1 restaurant) | | `main_new.py:8143` |

### Delivery Fee (Paid by customer, 100% to driver)

| Constant | Value | Source |
|----------|-------|--------|
| Base fee | $2.49 | `order_flow.py:405` |
| Per mile | $0.50 | `order_flow.py:406` |
| Minimum | $2.99 | `order_flow.py:407` |
| Maximum | $12.99 | `order_flow.py:408` |
| Default (no distance) | $4.99 | `order_flow.py:409` |
| Surge cap | 2.0x | `order_flow.py:442` |

### Rideshare Fees (CANONICAL: Fare-Tiered, Model A)

| Fare Range | Customer Pays | Driver Pays | Platform Total |
|-----------|--------------|------------|----------------|
| **<= $35** | Fare + **$1** | Fare - **$1** | **$2** |
| **$35.01 - $70** | Fare + **$2** | Fare - **$2** | **$4** |
| **> $70** | Fare + **$3** | Fare - **$3** | **$6** |

**Source:** `rideshare_payments.py:36-43` (`get_tier_fee()`), `rideshare_payments.py:76-80`
**Config mirror:** `pricing_config.py:24-28`

### Tips
- **100% to driver, always** (`main_new.py:17890`)
- Never taxed to platform

### Free Delivery
- **No automatic threshold** - promo code only
- Code: `FREEDELIVERY`, min order $20, max discount $5 (`main_new.py:6083`)

---

## 5. TAX RATES

| Context | Rate | Source |
|---------|------|--------|
| App config (sent to iOS) | 9% (0.09) | `main_new.py:1070` |
| Backend default (food) | 6% (0.06) | `order_flow.py:568` |
| Actual checkout | Per-state lookup | `order_flow.py:512-565` |
| California | 7.25% | `order_flow.py:514` |
| New York | 8.875% | `order_flow.py:515` |
| Texas | 6.25% | `order_flow.py:516` |

**KNOWN DISCREPANCY:** App config sends 9% to clients, backend uses 6% default when no state provided, actual checkout uses per-state rates.

---

## 6. ORDER STATUS VALUES

**Backend enum** (`models.py:383-403`): Always lowercase with underscores in API responses.

| Status | Category |
|--------|----------|
| `pending_payment` | Payment |
| `confirmed` | Payment |
| `pending_restaurant` | Restaurant acceptance |
| `declined_by_restaurant` | Restaurant acceptance |
| `restaurant_timeout` | Restaurant acceptance |
| `preparing` | Preparation |
| `ready_for_pickup` | Preparation |
| `pending_delivery_decision` | Delivery decision |
| `restaurant_will_deliver` | Delivery decision |
| `delivery_decision_timeout` | Delivery decision |
| `out_for_delivery` | Delivery |
| `delivered` | Terminal |
| `cancelled` | Terminal |

### iOS Status Mapping (`P2PAPIService.swift:9444-9467`)
```
pending/pending_payment → "Placed"
confirmed → "Accepted"
preparing → "Preparing"
ready/ready_for_pickup → "Ready"
picked_up → "PickedUp"
out_for_delivery → "OnTheWay"
delivered → "Delivered"
cancelled → "Cancelled"
```

### Known iOS Bug: Restaurant App Case Mismatch
- `Theme.swift:72-80` uses Capitalized rawValues ("Placed", "Preparing")
- Backend sends lowercase ("preparing", "delivered")
- `OrderStatus(rawValue:)` always returns nil, falls back to `.placed`
- `todayRevenue` at `OrdersViewModel.swift:147` compares capitalized → always $0

---

## 7. RIDE REQUEST STATUS

**Backend enum** (`models.py:1248-1255`):
`open` → `bidding` → `matched` → `in_progress` → `completed`
Also: `cancelled`, `expired`

---

## 8. BID STATUS

**Backend enum** (`models.py:1258-1264`):
`pending` → `accepted` | `rejected` | `countered` | `withdrawn` | `expired`

---

## 9. LOGIN ENDPOINTS

| Platform | Customer | Driver | Vendor |
|----------|----------|--------|--------|
| iOS/Android | `/auth/customer/login` | `/auth/driver/login` | `/auth/vendor/login` |
| WebApp | `/api/auth/customer/login` | `/api/auth/driver/login` | `/api/auth/vendor/login` |
| Admin | `/api/auth/login` or `/api/admin/login` | | |

All use OAuth2 form-based auth (`username` + `password` fields).

---

## 10. KNOWN BACKEND INCONSISTENCIES

1. **Three rideshare fee models coexist:** Model A (fare-tiered, `rideshare_payments.py`), Model B (distance-tiered, `main_new.py:3193`), Model C (flat $1, `order_flow.py:489`). Model A is canonical.
2. **Tax rate mismatch:** App config 9%, backend default 6%, checkout uses per-state.
3. **order_flow.py status map incomplete:** Missing 6 newer statuses (`pending_restaurant`, `pending_delivery_decision`, etc.) at line 2270-2278.
4. **Restaurant `todayRevenue` bug:** Case-sensitive comparison against backend lowercase values.
