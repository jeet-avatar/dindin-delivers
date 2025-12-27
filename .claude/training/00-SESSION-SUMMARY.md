# Training Data Session Summary

> **Purpose:** This file summarizes all verified patterns for customer app training.
> **Created:** December 26, 2025

---

## VERIFIED PRICING MODEL (From Staging)

### Food Delivery Fees
```
Customer pays: $1 matchmaking fee (flat)
Restaurant pays: $1 platform fee per order (flat)
Driver keeps: 100% of delivery fee + tips
```

### Rideshare Fees (Tiered)
```
Tier 1 (≤$35 fare):   $1 platform fee
Tier 2 ($35-$70):     $2 platform fee
Tier 3 (>$70):        $3 platform fee

Customer pays: Fare + Platform fee
Driver keeps:  Fare - Platform fee + Tips (100%)
```

**Source:** `order_flow.py:76`, `main_new.py:12025-12031`, `bid_routes.py:936-948`

---

## CUSTOMER APP TRAINING FILES CREATED

| File | Content |
|------|---------|
| `01-CUSTOMER-API-ENDPOINTS.md` | All customer app API endpoints from DollorApiService.kt |
| `02-CUSTOMER-DATA-MODELS.md` | All data models from ApiModels.kt with SerializedName mappings |
| `04-MICROSERVICES-DRIVER.md` | Driver service endpoints and models |
| `06-MICROSERVICES-NOTIFICATION.md` | Notification service endpoints and models |

---

## VERIFIED BACKEND MODELS (Critical - Prevents Hallucination)

### Customer Model (`models.py:477`)
```python
# CORRECT fields:
id, customer_id, first_name, last_name, email, phone, password_hash
is_active (Boolean), is_verified (Boolean)  # NOT status enum!
default_address (JSON), saved_addresses (JSON)
loyalty_points, loyalty_tier, total_orders, total_spent
stripe_customer_id, saved_cards (JSON)
push_token, platform, device_id

# WRONG - DO NOT USE:
# status=CustomerStatus.X  ← Use is_active=True instead
```

### Driver Model (`models.py:595`)
```python
# CORRECT fields:
status (DriverStatus enum)  # This one DOES use enum
drivers_license (Boolean)
insurance (Boolean)
background_check (Boolean)

# WRONG - DO NOT USE:
# vehicle_registration  ← DOES NOT EXIST
```

### DriverStatus Enum Values
```python
PENDING = "pending"
APPROVED = "approved"
ACTIVE = "active"
INACTIVE = "inactive"
SUSPENDED = "suspended"
```

---

## MICROSERVICES PORTS

| Service | Port | Prefix |
|---------|------|--------|
| auth-service | 8001 | AUTH |
| driver-service | 8003 | DRV |
| restaurant-service | 8004 | RST |
| order-service | 8005 | ORD |
| payment-service | 8006 | PAY |
| location-service | 8007 | LOC |
| notification-service | 8009 | NTF |
| ride-service | 8014 | RDE |

---

## ANDROID CUSTOMER APP - PRODUCTION READY STATUS

### Completed
- [x] Legal URLs (terms/privacy) - Working via redirect
- [x] Demo account endpoint created (`/api/demo/setup`)
- [x] API endpoints extracted
- [x] Data models extracted

### Pending (Next Session)
- [ ] Remove debug logging (93 Log statements in customer app)
- [ ] Remove staging HTTP allowance from network_security_config.xml
- [ ] Create remaining microservices training files
- [ ] Format as JSONL for Qwen fine-tuning

---

## KEY FILES LOCATION

```
eatfair-ios/
├── .claude/
│   ├── memory/
│   │   └── verified_patterns.md     # Anti-hallucination reference
│   └── training/
│       ├── 00-SESSION-SUMMARY.md    # This file
│       ├── 01-CUSTOMER-API-ENDPOINTS.md
│       ├── 02-CUSTOMER-DATA-MODELS.md
│       ├── 04-MICROSERVICES-DRIVER.md
│       └── 06-MICROSERVICES-NOTIFICATION.md
├── apps/web/p2p-platform/backend/
│   ├── main_new.py                  # Main API server
│   ├── models.py                    # SQLAlchemy models
│   ├── order_flow.py                # Order/ride pricing
│   └── legal/                       # Privacy & Terms HTML
└── eatfair-android/                 # Separate repo
    └── app/                         # Customer app (Kotlin)
```

---

## DEMO ACCOUNT CREDENTIALS

| Account | Email | Password |
|---------|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

**Endpoint:** `POST /api/demo/setup` (creates all accounts)

---

## IMPORTANT LEARNINGS (Session Mistakes Caught)

1. **Customer.status** - Does NOT use CustomerStatus enum. Uses `is_active` Boolean.
2. **Driver.vehicle_registration** - DOES NOT EXIST. Only `drivers_license`, `insurance`, `background_check`.
3. **Platform fee 15%** - WRONG. Uses $1 flat fee (food) or tiered $1/$2/$3 (rideshare).
4. **Legal URLs** - `dollor.ai` redirects to `www.dollor.ai` - No fix needed.

---

*Last Updated: December 26, 2025*
