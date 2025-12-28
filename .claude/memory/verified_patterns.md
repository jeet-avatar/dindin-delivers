# VERIFIED PATTERNS - DO NOT HALLUCINATE

> **RULE:** Before writing code, verify field names exist in this file.
> If not listed here, READ THE ACTUAL FILE first.

---

## Backend Models (apps/web/p2p-platform/backend/models.py)

### Customer (line 477)
```python
# CORRECT fields:
id, customer_id, first_name, last_name, email, phone, password_hash
default_address (JSON), saved_addresses (JSON)
loyalty_points (Integer), loyalty_tier (String)
total_orders (Integer), total_spent (Float)
is_active (Boolean), is_verified (Boolean)
created_at (DateTime), updated_at (DateTime)
stripe_customer_id, saved_cards (JSON)
push_token, platform, device_id

# WRONG - DO NOT USE:
# status=CustomerStatus.X  ← Use is_active=True instead
```

### CustomerStatus Enum (line 471)
```python
ACTIVE = "active"
INACTIVE = "inactive"
SUSPENDED = "suspended"
# Note: Customer model uses is_active Boolean, NOT this enum directly
```

### Driver (line 595)
```python
# CORRECT fields:
id, driver_id, first_name, last_name, email, phone, password_hash
date_of_birth, license_number
street, city, state, zip_code
vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate
drivers_license (Boolean), drivers_license_url, drivers_license_expiry
insurance (Boolean), insurance_url, insurance_expiry
background_check (Boolean), background_check_date
status (DriverStatus enum), rating (Float), total_deliveries (Integer)
is_online (Boolean), current_latitude, current_longitude
push_token, fcm_token, platform, device_type
created_at (DateTime)

# WRONG - DO NOT USE:
# vehicle_registration  ← DOES NOT EXIST
```

### DriverStatus Enum (line 587)
```python
PENDING = "pending"
APPROVED = "approved"
ACTIVE = "active"
INACTIVE = "inactive"
SUSPENDED = "suspended"
```

### Vendor (check actual file for fields)
```python
# Key fields verified:
restaurant_name, company_name, contact_email, contact_phone, contact_name
street, city, state, zip_code
cuisine_type, onboarding_status, is_online
created_at
```

### User (for vendor login)
```python
email, password_hash, full_name, role (UserRole enum), vendor_id
created_at
```

---

## Imports Already in main_new.py (line 24)
```python
from models import User, Client, Invoice, InvoiceItem, Payment,
    UserRole, InvoiceStatus, PaymentStatus, Vendor, Driver,
    DriverStatus, Customer, CustomerStatus, Order, OrderStatus
```

---

## API Endpoints Verified Working

| Endpoint | Method | Status |
|----------|--------|--------|
| `https://dollor.ai/terms` | GET | 200 (redirects to www) |
| `https://dollor.ai/privacy` | GET | 200 (redirects to www) |
| `https://api.dollor.ai/api/health` | GET | 200 |
| `https://api.dollor.ai/api/customer/login` | POST | 200 (auth works) |

---

## Demo Account Credentials (from 06-APP_STORE.md)

| Account | Email | Password |
|---------|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

**Status:** Accounts do NOT exist yet on production/staging

---

## Android App Verified

| Item | Location | Status |
|------|----------|--------|
| Legal URLs | AppConfig.kt:601-602 | Points to dollor.ai (WORKING) |
| API Base URL | build.gradle.kts | Staging/Production configured correctly |
| Firebase | src/production/google-services.json | Separate from staging |

---

## Session Learnings (Mistakes Caught)

1. **Customer.status** - Does NOT use CustomerStatus enum. Uses `is_active` Boolean.
2. **Driver.vehicle_registration** - DOES NOT EXIST. Only `drivers_license`, `insurance`, `background_check`.
3. **Legal URLs** - `dollor.ai` redirects to `www.dollor.ai` which has the pages. No fix needed.

---

*Last Updated: December 26, 2025*
