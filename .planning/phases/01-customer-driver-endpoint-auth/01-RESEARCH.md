# Phase 01: Customer + Driver Endpoint Auth - Research

**Researched:** 2026-02-21
**Domain:** FastAPI per-endpoint authentication (Depends-based auth guards)
**Confidence:** HIGH

## Summary

This phase converts customer and driver endpoints from ad-hoc authentication patterns to standardized per-endpoint `Depends(require_customer)` / `Depends(require_driver)` from `auth_utils.py`. The codebase currently uses **four different auth patterns** that need consolidation:

1. **`Depends(require_customer)` / `Depends(require_driver)`** from auth_utils.py -- the TARGET pattern (already on ~18 endpoints)
2. **`Depends(get_current_customer)` / `Depends(get_current_driver)`** -- inline functions in main_new.py that do the same thing but aren't standardized (~12 endpoints)
3. **`Depends(get_current_user)`** -- gets a User object with no role check, meaning a driver JWT can access customer endpoints and vice versa (~30+ endpoints)
4. **`token: str = Depends(oauth2_scheme)` with manual JWT decode** -- scattered throughout, duplicates auth_utils logic (~15 endpoints)

The audit identified **55 customer endpoints** and **27 driver endpoints** across main_new.py that need conversion. Of these, only 2 customer endpoints and 14 driver endpoints already use the target `Depends(require_customer/require_driver)` pattern. Some endpoints are public (registration, password reset) and should remain unauthenticated. Several endpoints are "shared" (used by both customer and driver apps for rides) and need `Depends(require_any_auth)` plus role-based ownership checks.

**Primary recommendation:** Convert all customer/driver endpoints to use `Depends(require_customer)` or `Depends(require_driver)` from auth_utils.py. For endpoints currently using `get_current_customer` (which is functionally identical to `require_customer`), the conversion is a simple parameter swap. For endpoints using `get_current_user`, the conversion also adds role enforcement. For endpoints using manual `oauth2_scheme` + JWT decode, replace with the appropriate auth_utils function.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | All customer endpoints have per-endpoint Depends(require_customer) with ownership checks | Complete audit of 55 customer endpoints with current auth status, exact line numbers, and recommended auth function for each |
| AUTH-02 | All driver endpoints have per-endpoint Depends(require_driver) with ownership checks | Complete audit of 27 driver endpoints with current auth status, exact line numbers, and recommended auth function for each |
</phase_requirements>

## Standard Stack

### Core (Already in codebase)
| Library | Purpose | Location |
|---------|---------|----------|
| auth_utils.py | Standardized auth dependencies | `apps/web/p2p-platform/backend/auth_utils.py` |
| `require_customer` | Returns Customer ORM object from JWT | auth_utils.py:77 |
| `require_driver` | Returns Driver ORM object from JWT | auth_utils.py:123 |
| `require_any_auth` | Returns JWT payload dict (lightweight) | auth_utils.py:43 |
| `get_current_customer` | Inline equivalent of require_customer (REPLACE with require_customer) | main_new.py:1064 |
| `get_current_driver` | Inline equivalent of require_driver (REPLACE with require_driver) | main_new.py:1093 |
| `get_current_user` | Returns User object, NO role check (REPLACE with role-specific) | main_new.py:999 |

### Key Difference: `get_current_customer` vs `require_customer`
Both functions do the same thing: decode JWT, look up Customer by customer_id or email, return Customer ORM object or raise 401. The only difference is `require_customer` lives in auth_utils.py (centralized) while `get_current_customer` is inline in main_new.py. **Replace `get_current_customer` with `require_customer` everywhere.**

### Key Difference: `get_current_user` vs `require_customer`
`get_current_user` (main_new.py:999) returns a `User` object by email lookup. It does NOT verify the user is a customer vs driver vs vendor. A driver JWT will successfully authenticate on customer endpoints using `get_current_user`. **This is the primary security gap** this phase fixes.

## Architecture Patterns

### Pattern 1: Simple Conversion (get_current_customer -> require_customer)

**What:** Replace `Depends(get_current_customer)` with `Depends(require_customer)` in function signature.
**When to use:** Endpoints that already get a Customer object and use customer.id for queries.
**Example:**
```python
# BEFORE (main_new.py:6743)
@app.get("/api/customer/profile")
async def get_customer_profile_v2(customer: Customer = Depends(get_current_customer)):

# AFTER
@app.get("/api/customer/profile")
async def get_customer_profile_v2(customer: Customer = Depends(require_customer)):
```
**Impact:** Near-zero risk. Both functions have identical behavior.

### Pattern 2: Role Enforcement (get_current_user -> require_customer)

**What:** Replace `Depends(get_current_user)` with `Depends(require_customer)` and adapt code that references `current_user.email` to use `customer.email` or `customer.id`.
**When to use:** Customer endpoints that currently accept any authenticated user.
**Example:**
```python
# BEFORE (main_new.py:15360)
@app.get("/api/customer/orders")
def get_customer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order).filter(Order.customer_email == current_user.email)

# AFTER
@app.get("/api/customer/orders")
def get_customer_orders(
    db: Session = Depends(get_db),
    customer: Customer = Depends(require_customer)
):
    query = db.query(Order).filter(Order.customer_email == customer.email)
```
**Impact:** Medium -- requires updating all references from `current_user` to `customer` and property names may differ (User has `email`, Customer also has `email` -- this one is safe).

### Pattern 3: Manual JWT Decode -> require_driver

**What:** Replace `token: str = Depends(oauth2_scheme)` + inline JWT decode with `Depends(require_driver)`.
**When to use:** Endpoints with manual `jwt.decode(token, SECRET_KEY, ...)` blocks.
**Example:**
```python
# BEFORE (main_new.py:4860)
@app.post("/api/drivers/{driver_id}/stripe/connect")
def create_driver_stripe_account(
    driver_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin" and payload.get("driver_id") != driver_id:
            raise HTTPException(status_code=403, ...)
    except JWTError:
        raise HTTPException(status_code=401, ...)

# AFTER
@app.post("/api/drivers/{driver_id}/stripe/connect")
def create_driver_stripe_account(
    driver_id: int,
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db)
):
    if driver.id != driver_id:
        raise HTTPException(status_code=403, detail="You can only manage your own Stripe account")
```
**Impact:** Higher -- removes 5-8 lines of boilerplate per endpoint, but logic must be carefully preserved (especially admin-or-owner checks).

### Pattern 4: Authorization Header Body Pattern -> require_customer

**What:** Replace `authorization: Optional[str] = Header(None)` + `get_current_customer_from_token(authorization, db)` with `Depends(require_customer)`.
**When to use:** Cart endpoints and similar that use the Header-based pattern.
**Example:**
```python
# BEFORE (main_new.py:6962)
@app.get("/api/cart")
def get_cart(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    customer = get_current_customer_from_token(authorization, db)
    if not customer:
        raise HTTPException(status_code=401, detail="Authentication required")

# AFTER
@app.get("/api/cart")
def get_cart(
    customer: Customer = Depends(require_customer),
    db: Session = Depends(get_db)
):
    # customer is guaranteed authenticated; use customer.id for cart lookup
```
**Impact:** Medium -- eliminates the manual null check, but the function body references `customer` differently.

### Pattern 5: Ownership Check with Path Parameter

**What:** Endpoints with `{customer_id}` or `{driver_id}` in path must verify the authenticated user owns that resource.
**When to use:** All endpoints like `/api/customer/favorites/{customer_id}`, `/api/addresses/{customer_id}`, `/api/drivers/{driver_id}/...`
**Example:**
```python
@app.get("/api/customer/favorites/{customer_id}")
async def get_customer_favorites(
    customer_id: int,
    customer: Customer = Depends(require_customer),
    db: Session = Depends(get_db),
):
    if customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    # ... proceed with customer_id
```

### Pattern 6: Shared Ride Endpoints (Customer + Driver both call)

**What:** Endpoints like `/api/rides/{ride_id}/track`, `/api/erp/rides/{ride_id}/status` are called by BOTH customer and driver apps. Use `require_any_auth` + participant check.
**When to use:** Ride tracking, ride status, negotiation endpoints.
**Example:**
```python
@app.get("/api/rides/{ride_id}/track")
async def track_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    # Verify caller is a participant (customer or driver of this ride)
```
**Note:** These shared endpoints are OUT OF SCOPE for AUTH-01/AUTH-02 conversion to role-specific Depends. They should use `require_any_auth` since both roles call them. The per-endpoint Depends still satisfies the "explicit auth" requirement.

### Anti-Patterns to Avoid
- **Breaking `get_current_user` for non-customer/driver endpoints:** Many admin, vendor, and ERP endpoints also use `get_current_user`. Only convert endpoints in the customer/driver path lists below. Leave other endpoints for Phase 02.
- **Removing admin-or-owner checks:** Some driver endpoints (Stripe, payout) allow admin access. When converting from manual JWT decode, preserve the admin fallback or plan for it.
- **Changing function return types:** `require_customer` returns `Customer`, `get_current_user` returns `User`. The Customer and User models have different attributes. Must update all property references.
- **Breaking tests that use `auth_headers`:** Existing tests create `auth_headers` with `Depends(get_current_user)` pattern (User email only). Converting endpoints to `require_customer` will require tests to use `customer_auth_headers` (which includes `customer_id` in JWT). The conftest.py already has `customer_auth_headers` and `driver_auth_headers` fixtures.

## Complete Endpoint Inventory

### Customer Endpoints -- ALREADY DONE (2 endpoints with require_customer)

| Line | Path | Method | Current Auth |
|------|------|--------|-------------|
| 3922 | `/api/erp/rides/request` | POST | `Depends(require_customer)` |
| 17350 | `/api/chat/customer/{customer_id}/conversations` | GET | `Depends(require_customer)` + ownership check |

### Customer Endpoints -- PUBLIC (keep unauthenticated, 6 endpoints)

| Line | Path | Method | Why Public |
|------|------|--------|-----------|
| 1899 | `/api/customer/demo-login` | POST | Login endpoint |
| 6255 | `/api/customer/register` | POST | Registration |
| 6377 | `/api/customer/apple-auth` | POST | Apple OAuth login/register |
| 6514 | `/api/customer/password-reset/request` | POST | Unauthenticated by design |
| 6548 | `/api/customer/password-reset/confirm` | POST | Unauthenticated by design |

### Customer Endpoints -- NEED CONVERSION (31 endpoints)

#### Group A: get_current_customer -> require_customer (LOW risk, 9 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 6743 | `/api/customer/profile` | GET | `Depends(get_current_customer)` | No (uses own customer) |
| 6767 | `/api/customer/dashboard` | GET | `Depends(get_current_customer)` | No |
| 6829 | `/api/customer/rides/history` | GET | `Depends(get_current_customer)` | No |
| 17514 | `/api/customers/{customer_id}/cards` | GET | `Depends(get_current_customer)` | Yes (already has `current_customer.id != customer_id` check) |
| 17575 | `/api/customers/{customer_id}/cards` | POST | `Depends(get_current_customer)` | Yes (already has check) |
| 17632 | `/api/customers/{customer_id}/cards/{card_id}` | DELETE | `Depends(get_current_customer)` | Yes (already has check) |
| 17661 | `/api/customers/{customer_id}/cards/{card_id}/default` | POST | `Depends(get_current_customer)` | Yes (already has check) |
| 18559 | `/api/customer/notifications` | GET | `Depends(get_current_customer)` | No |
| 18588 | `/api/customer/notifications/{notification_id}/read` | PUT | `Depends(get_current_customer)` | No (queries by customer.id) |
| 18606 | `/api/customer/notifications` | DELETE | `Depends(get_current_customer)` | No |

#### Group B: get_current_user -> require_customer (MEDIUM risk, 15 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 15362 | `/api/customer/orders` | GET | `Depends(get_current_user)` | No (filters by email) |
| 15471 | `/api/customer/rides` | GET | `Depends(get_current_user)` | No (looks up customer by email) |
| 15549 | `/api/orders/{order_id}/tip-driver` | POST | `Depends(get_current_user)` | Yes (must verify customer placed order) |
| 15580 | `/api/orders/{order_id}/cancel` | POST | `Depends(get_current_user)` | Yes (must verify customer placed order) |
| 15630 | `/api/orders/{order_id}/refund-status` | GET | `Depends(get_current_user)` | Yes (must verify customer placed order) |
| 15852 | `/api/customer/{customer_id}/active-orders` | GET | `Depends(get_current_user)` | Yes (customer_id in path) |
| 15945 | `/api/customer/orders/{order_id}/track` | GET | `Depends(get_current_user)` | Yes (must verify owns order) |
| 16872 | `/api/customer/favorites/{customer_id}` | GET | `Depends(get_current_user)` | Yes (customer_id in path) |
| 16905 | `/api/customer/favorites/{customer_id}/{vendor_id}` | POST | `Depends(get_current_user)` | Yes (customer_id in path) |
| 16934 | `/api/customer/favorites/{customer_id}/{vendor_id}` | DELETE | `Depends(get_current_user)` | Yes (customer_id in path) |
| 16959 | `/api/customer/favorites/{customer_id}/check/{vendor_id}` | GET | `Depends(get_current_user)` | Yes (customer_id in path) |
| 16981 | `/api/customer/orders/{order_id}/chat` | GET | `Depends(get_current_user)` | Yes (must verify owns order) |
| 17020 | `/api/customer/orders/{order_id}/chat` | POST | `Depends(get_current_user)` | Yes (must verify owns order) |
| 17695 | `/api/customer/orders/{order_id}/rate-driver` | POST | `Depends(get_current_user)` | Yes (must verify owns order) |
| 17714 | `/api/customer/orders/{order_id}/rate-restaurant` | POST | `Depends(get_current_user)` | Yes (must verify owns order) |

#### Group C: Authorization Header body pattern -> require_customer (MEDIUM risk, 6 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 6962 | `/api/cart` | GET | `get_current_customer_from_token(authorization, db)` | No (uses customer.id) |
| 7000 | `/api/cart/items` | POST | `get_current_customer_from_token(authorization, db)` | No |
| 7072 | `/api/cart/items/{item_id}` | PUT | `get_current_customer_from_token(authorization, db)` | No (verifies cart ownership) |
| 7118 | `/api/cart/items/{item_id}` | DELETE | `get_current_customer_from_token(authorization, db)` | No |
| 7153 | `/api/cart` | DELETE | `get_current_customer_from_token(authorization, db)` | No |
| 7184 | `/api/cart/apply-promo` | POST | `get_current_customer_from_token(authorization, db)` | No |

#### Group D: get_current_user -> require_customer (for customer-owned endpoints, 1 endpoint)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 7247 | `/api/cart/promo` | DELETE | `Depends(get_current_user)` | No (looks up customer by email) |

#### Group E: Manual oauth2_scheme -> require_customer (HIGH risk, 3 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 3509 | `/api/customers/{customer_id}/delete` | DELETE | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies customer_id match) |
| 3622 | `/api/customer/email/send-verification` | POST | `Depends(oauth2_scheme)` + manual JWT | No (uses token customer_id) |
| 3685 | `/api/customer/email/verify` | POST | `Depends(oauth2_scheme)` + manual JWT | No (uses token customer_id) |
| 3761 | `/api/customer/email/status` | GET | `Depends(oauth2_scheme)` + manual JWT | No (uses token customer_id) |

### Customer Endpoints -- SHARED (Customer + Driver both call, use require_any_auth, 13 endpoints)

These endpoints are called by BOTH customer and driver apps. They should use `Depends(require_any_auth)` rather than a role-specific guard. Some already have manual JWT decode or `get_current_user`.

| Line | Path | Method | Current Auth | Role |
|------|------|--------|-------------|------|
| 15653 | `/api/rides/{ride_id}/track` | GET | `Depends(get_current_user)` | Both |
| 15801 | `/api/rides/{ride_id}/cancel` | POST | `Depends(get_current_user)` | Customer (but cancel might be allowed by driver too) |
| 16018 | `/api/rides/{ride_id}/rate` | POST | `Depends(get_current_user)` | Customer |
| 16093 | `/api/rides/{ride_id}/tip` | POST | `Depends(get_current_user)` | Customer |
| 15090 | `/api/erp/rides/{ride_id}/cancel` | POST | `Depends(get_current_user)` | Both |
| 15177 | `/api/erp/rides/{ride_id}/accept-fare` | POST | `Depends(get_current_user)` | Both |
| 15209 | `/api/rides/{ride_id}/negotiate` | POST/GET | `Depends(get_current_user)` | Customer |
| 15248 | `/api/erp/rides/{ride_id}/customer-accept-fare` | POST/GET | `Depends(get_current_user)` | Customer |
| 15275 | `/api/erp/rides/{ride_id}/negotiation-status` | GET | `Depends(get_current_user)` | Both |
| 14990 | `/api/erp/rides/available` | GET | `Depends(oauth2_scheme)` | Driver |
| 15005 | `/api/erp/rides/{ride_id}/accept` | POST | `Depends(oauth2_scheme)` | Driver |
| 15028 | `/api/erp/rides/{ride_id}/picked-up` | POST | `Depends(oauth2_scheme)` | Driver |
| 15041 | `/api/erp/rides/{ride_id}/start` | POST | `Depends(oauth2_scheme)` | Driver |
| 15062 | `/api/erp/rides/{ride_id}/track` (ERP) | GET | `Depends(oauth2_scheme)` | Both |
| 15074 | `/api/erp/rides/{ride_id}/status` (ERP) | GET | `Depends(oauth2_scheme)` | Both |
| 15098 | `/api/erp/rides/{ride_id}/negotiate` (ERP) | POST | `Depends(oauth2_scheme)` | Driver |

**Recommendation for shared endpoints:** Convert to `Depends(require_any_auth)` for now. Do NOT use role-specific guards because both customer and driver apps call these paths. The `require_any_auth` still gives explicit per-endpoint auth (satisfying AUTH-05/AUTH-06 requirement). Phase 02 can add ownership checks if desired.

### Customer Endpoints -- ADDRESS ENDPOINTS (customer-scoped but generic path, 6 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 16640 | `/api/addresses/{customer_id}` | GET | `Depends(get_current_user)` | Yes |
| 16678 | `/api/addresses/{customer_id}/default` | GET | `Depends(get_current_user)` | Yes |
| 16712 | `/api/addresses/{customer_id}` | POST | `Depends(get_current_user)` | Yes |
| 16761 | `/api/addresses/{customer_id}/{address_id}` | PUT | `Depends(get_current_user)` | Yes |
| 16811 | `/api/addresses/{customer_id}/{address_id}` | DELETE | `Depends(get_current_user)` | Yes |
| 16845 | `/api/addresses/{customer_id}/{address_id}/set-default` | POST | `Depends(get_current_user)` | Yes |

### Customer Endpoints -- FCM TOKEN (customer-scoped, 2 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 18217 | `/api/erp/customers/{customer_id}/fcm-token` | POST | `Depends(get_current_user)` | Yes |
| 18298 | `/api/erp/customers/{customer_id}/fcm-token` | DELETE | `Depends(get_current_user)` | Yes |

### Customer Endpoints -- ORDER CREATE (customer action, 1 endpoint)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 15351 | `/api/orders/create` | POST | `Depends(get_current_user)` | No (creates new) |

---

### Driver Endpoints -- ALREADY DONE (14 endpoints with require_driver)

| Line | Path | Method | Current Auth |
|------|------|--------|-------------|
| 4717 | (internal endpoint) | - | `Depends(require_driver)` |
| 5525 | `/api/drivers/{driver_id}/balance` | GET | `Depends(require_driver)` |
| 5565 | `/api/drivers/{driver_id}/bank-account` | POST | `Depends(require_driver)` |
| 5614 | `/api/drivers/{driver_id}/payouts` | POST | `Depends(require_driver)` |
| 5787 | `/api/rides/{ride_id}/complete-and-pay` | POST | `Depends(require_driver)` |
| 7276 | `/api/driver/dashboard` | GET | `Depends(require_driver)` |
| 7407 | `/api/v5/driver/{driver_id}/dashboard` | GET | `Depends(require_driver)` |
| 16250 | `/api/rides/available` | GET | `Depends(require_driver)` |
| 17314 | `/api/chat/driver/{driver_id}/conversations` | GET | `Depends(require_driver)` + ownership |
| 20030 | `/api/driver/active-delivery` | GET | `Depends(require_driver)` |
| 20101 | `/api/driver/messages` | GET | `Depends(require_driver)` |
| 20350 | `/api/v2/driver/deliveries/{delivery_id}/accept` | POST | `Depends(require_driver)` |
| 20454 | `/api/v2/driver/deliveries/{delivery_id}/pickup` | POST | `Depends(require_driver)` |
| 20472 | `/api/v2/driver/deliveries/{delivery_id}/complete` | POST | `Depends(require_driver)` |

### Driver Endpoints -- PUBLIC (keep unauthenticated, 2 endpoints)

| Line | Path | Method | Why Public |
|------|------|--------|-----------|
| 6598 | `/api/driver/password-reset/request` | POST | Unauthenticated by design |
| 6631 | `/api/driver/password-reset/confirm` | POST | Unauthenticated by design |

### Driver Endpoints -- NEED CONVERSION (11 endpoints)

#### Group A: get_current_user -> require_driver (MEDIUM risk, 4 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 16192 | `/api/driver/bids` | GET | `Depends(get_current_user)` | No (derives driver_id from user) |
| 19851 | `/api/driver/location` | POST | `Depends(get_current_user)` | Yes (driver_id in request body) |
| 19879 | `/api/v2/driver/deliveries/available` | GET | `Depends(get_current_user)` | No |
| 19969 | `/api/erp/driver/{driver_id}/deliveries` | GET | `Depends(get_current_user)` | Yes (driver_id in path) |

#### Group B: get_current_driver -> require_driver (LOW risk, 1 endpoint)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 7527 | `/api/driver/earnings` | GET | `Depends(get_current_driver)` | No |

#### Group C: Manual oauth2_scheme -> require_driver (HIGH risk, 6 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 3546 | `/api/drivers/{driver_id}/delete` | DELETE | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id match) |
| 4817 | `/api/drivers/{driver_id}/status` | POST | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 4860 | `/api/drivers/{driver_id}/stripe/connect` | POST | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 4933 | `/api/drivers/{driver_id}/stripe/onboarding-link` | GET | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 5012 | `/api/drivers/{driver_id}/stripe/status` | GET | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 5096 | `/api/drivers/{driver_id}/stripe/dashboard-link` | POST | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 5912 | `/api/drivers/{driver_id}/payout-history` | GET | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 14815 | `/api/drivers/{driver_id}/active-order` | GET | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |
| 20148 | `/api/drivers/{driver_id}/earnings` | GET | `Depends(oauth2_scheme)` + manual JWT | Yes (verifies driver_id or admin) |

#### Group D: require_any_auth -> require_driver (LOW risk, 1 endpoint)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 4795 | `/api/drivers/{driver_id}/status` | GET | `Depends(require_any_auth)` | No (public info) -- **Keep as require_any_auth? Or upgrade to require_driver?** |

### Driver Endpoints -- ERP PROXY (2 endpoints, used by iOS driver app)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 18185 | `/api/erp/drivers/{driver_id}/status` | PUT | `Depends(require_any_auth)` | Yes |
| 18194 | `/api/erp/drivers/{driver_id}/location` | PUT | `Depends(require_any_auth)` | Yes |

### Driver Endpoints -- FCM TOKEN (2 endpoints)

| Line | Path | Method | Current Auth | Ownership Check Needed |
|------|------|--------|-------------|----------------------|
| 18240 | `/api/erp/drivers/{driver_id}/fcm-token` | POST | `Depends(get_current_user)` | Yes |
| 18312 | `/api/erp/drivers/{driver_id}/fcm-token` | DELETE | `Depends(get_current_user)` | Yes |

---

### bid_routes.py Endpoints (separate file, 30+ endpoints)

bid_routes.py is mounted via `app.include_router(bid_router)` at main_new.py:15323 **without** router-level `dependencies`. The global middleware covers it. Customer-specific and driver-specific endpoints here should get per-endpoint auth in a future phase or this one.

Key customer endpoints in bid_routes.py:
- `/api/rides/customer/{customer_id}/requests` (GET, line 481)
- `/api/rides/customer/{customer_id}/disputes` (GET, line 2692)
- `/api/rides/customer/{customer_id}/recurring-rides` (POST/GET, lines 2854/2925)
- `/api/rides/request` (POST, line 299) -- ride request creation (customer action)
- `/api/rides/request/{request_id}/cancel` (POST, line 896) -- customer cancels ride

Key driver endpoints in bid_routes.py:
- `/api/rides/driver/{driver_id}/bids` (GET, line 1590)
- `/api/rides/driver/{driver_id}/payout-history` (GET, line 2485)
- `/api/rides/request/{request_id}/bid` (POST, line 1051) -- driver bids
- `/api/rides/request/{request_id}/arrived` (POST, line 1634)
- `/api/rides/request/{request_id}/start` (POST, line 1878)
- `/api/rides/request/{request_id}/complete` (POST, line 1968)
- `/api/rides/request/{request_id}/driver-cancel` (POST, line 1709)

**Recommendation:** bid_routes.py endpoints MUST also be converted since AUTH-01 and AUTH-02 say "ALL customer/driver endpoints." These endpoints have NO auth at all -- they accept any caller, authenticated or not (beyond global middleware). This is the HIGHEST PRIORITY conversion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT decode + Customer lookup | Inline `jwt.decode()` + DB query | `Depends(require_customer)` | Centralized error handling, consistent 401 format |
| JWT decode + Driver lookup | Inline `jwt.decode()` + DB query | `Depends(require_driver)` | Same reason |
| Header extraction + token parse | `authorization: Optional[str] = Header(None)` + manual parse | `Depends(require_customer)` | FastAPI's OAuth2 scheme handles Bearer extraction |
| Ownership verification | Ad-hoc `payload.get("customer_id") != customer_id` | `customer.id != customer_id` after Depends | Consistent, ORM-validated |

**Key insight:** auth_utils.py already handles every edge case (missing token, expired token, invalid token, user not found). Hand-rolling JWT decode in each endpoint duplicates this logic and risks inconsistent error responses.

## Common Pitfalls

### Pitfall 1: User vs Customer Property Mismatch
**What goes wrong:** Replacing `current_user: User = Depends(get_current_user)` with `customer: Customer = Depends(require_customer)` then using `current_user.email` which no longer exists (variable renamed).
**Why it happens:** Mechanical find-replace without updating references.
**How to avoid:** For each endpoint, grep the function body for all references to the old variable name and update them.
**Warning signs:** NameError at runtime; the endpoint returns 500.

### Pitfall 2: Tests Using Wrong Auth Fixture
**What goes wrong:** Existing tests use `auth_headers` (User-based JWT) which no longer works with `require_customer` (needs `customer_id` in JWT payload).
**Why it happens:** `auth_headers` fixture creates a token with `{"sub": email}` only. `require_customer` tries `customer_id` first, then falls back to email. But if the email doesn't match any Customer record, it returns 401.
**How to avoid:** Use `customer_auth_headers` fixture for customer endpoints and `driver_auth_headers` for driver endpoints. Both already exist in conftest.py.
**Warning signs:** Tests that passed before now return 401.

### Pitfall 3: Admin-or-Owner Checks Lost
**What goes wrong:** Driver Stripe endpoints currently allow admin access (`if payload.get("role") != "admin"`). Converting to `Depends(require_driver)` means admins can no longer call these endpoints.
**Why it happens:** `require_driver` only returns Driver objects. Admin users don't have Driver records.
**How to avoid:** For these endpoints, either (a) keep `require_any_auth` + manual ownership check allowing admin, or (b) accept that admin access is removed (admin can use the admin middleware path). **Recommendation:** Remove admin-or-owner check. Admins should use admin-specific endpoints. This simplifies security.
**Warning signs:** Admin panel breaks when managing driver Stripe accounts.

### Pitfall 4: Optional Auth Patterns
**What goes wrong:** Some endpoints use `authorization: Optional[str] = Header(None)` which allows unauthenticated access (returns None instead of 401). Converting to `require_customer` makes auth mandatory.
**Why it happens:** The Header-based pattern was designed to be optional.
**How to avoid:** Verify that all cart/address endpoints SHOULD require auth (they should -- cart is customer-specific). If any endpoint truly needs optional auth, use a different approach.
**Warning signs:** Client apps that don't send auth tokens start getting 401s on cart endpoints.

### Pitfall 5: get_current_customer_from_token Returns None vs 401
**What goes wrong:** `get_current_customer_from_token()` returns `None` on auth failure (soft fail). `require_customer` raises HTTPException 401 (hard fail). Endpoints that have custom error handling for the None case need adjustment.
**Why it happens:** Different error handling philosophy.
**How to avoid:** When converting from `get_current_customer_from_token`, remove the `if not customer: raise HTTPException(401, ...)` block since `require_customer` handles it.
**Warning signs:** Duplicate 401 responses or unreachable code.

### Pitfall 6: bid_routes.py Has No Imports
**What goes wrong:** bid_routes.py doesn't import auth_utils. Adding `Depends(require_customer)` requires adding the import.
**Why it happens:** bid_routes.py was written before auth_utils.py existed.
**How to avoid:** Add `from auth_utils import require_customer, require_driver, require_any_auth` at the top of bid_routes.py.
**Warning signs:** ImportError at startup.

## Code Examples

### Converting get_current_customer to require_customer

```python
# Source: auth_utils.py already provides this pattern

# BEFORE
from main_new import get_current_customer
@app.get("/api/customer/profile")
async def get_customer_profile_v2(customer: Customer = Depends(get_current_customer)):
    return {"id": customer.id, "email": customer.email}

# AFTER
from auth_utils import require_customer
@app.get("/api/customer/profile")
async def get_customer_profile_v2(customer: Customer = Depends(require_customer)):
    return {"id": customer.id, "email": customer.email}
```

### Converting get_current_user to require_customer (with property adaptation)

```python
# BEFORE
@app.get("/api/customer/orders")
def get_customer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order).filter(Order.customer_email == current_user.email)
    # ... uses current_user.email

# AFTER
@app.get("/api/customer/orders")
def get_customer_orders(
    db: Session = Depends(get_db),
    customer: Customer = Depends(require_customer)
):
    query = db.query(Order).filter(Order.customer_email == customer.email)
    # ... Customer model also has .email attribute
```

### Converting oauth2_scheme + manual JWT to require_driver with ownership

```python
# BEFORE
@app.post("/api/drivers/{driver_id}/stripe/connect")
def create_driver_stripe_account(
    driver_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin" and payload.get("driver_id") != driver_id:
            raise HTTPException(status_code=403, detail="You can only manage your own Stripe account")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    # ... 8 lines of boilerplate removed

# AFTER
@app.post("/api/drivers/{driver_id}/stripe/connect")
def create_driver_stripe_account(
    driver_id: int,
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db)
):
    if driver.id != driver_id:
        raise HTTPException(status_code=403, detail="You can only manage your own Stripe account")
    # driver is already loaded from DB by require_driver -- no need to re-query
    # ... proceed with driver object directly
```

### Adding auth to bid_routes.py endpoint

```python
# BEFORE (bid_routes.py:481)
@router.get("/customer/{customer_id}/requests")
async def get_customer_ride_requests(customer_id: int, db: Session = Depends(get_db)):
    # No auth at all -- anyone can read any customer's ride history!
    requests = db.query(RideRequest).filter(RideRequest.customer_id == customer_id).all()
    return {"requests": [...]}

# AFTER
from auth_utils import require_customer
@router.get("/customer/{customer_id}/requests")
async def get_customer_ride_requests(
    customer_id: int,
    customer: Customer = Depends(require_customer),
    db: Session = Depends(get_db)
):
    if customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    requests = db.query(RideRequest).filter(RideRequest.customer_id == customer_id).all()
    return {"requests": [...]}
```

## Endpoint Count Summary

| Category | Count | Action |
|----------|-------|--------|
| Customer - already has require_customer | 2 | None |
| Customer - public (keep unauthenticated) | 5 | None |
| Customer - needs conversion to require_customer | 31 | Convert |
| Customer - shared ride endpoints (require_any_auth) | ~16 | Convert to require_any_auth |
| Customer - address endpoints | 6 | Convert to require_customer |
| Customer - FCM token endpoints | 2 | Convert to require_customer |
| Customer - order create | 1 | Convert to require_customer |
| **Customer total needing work** | **~56** | |
| Driver - already has require_driver | 14 | None |
| Driver - public (keep unauthenticated) | 2 | None |
| Driver - needs conversion to require_driver | 11 | Convert |
| Driver - ERP proxy endpoints | 2 | Convert to require_driver |
| Driver - FCM token endpoints | 2 | Convert to require_driver |
| **Driver total needing work** | **~15** | |
| bid_routes.py - customer endpoints | ~5 | Add require_customer |
| bid_routes.py - driver endpoints | ~7 | Add require_driver |
| bid_routes.py - shared endpoints | ~18 | Add require_any_auth |
| **bid_routes.py total needing work** | **~30** | |

**Grand total endpoints needing modification: ~101**

## Open Questions

1. **Admin-or-Owner pattern on driver Stripe endpoints**
   - What we know: Currently 6 driver Stripe endpoints allow both driver and admin access via manual JWT check
   - What's unclear: Should admins lose direct access to these endpoints after conversion?
   - Recommendation: Convert to `require_driver` only. Admin access to driver Stripe accounts should go through admin-specific endpoints (which exist via admin middleware). This is cleaner and more secure.

2. **GET /api/drivers/{driver_id}/status (line 4795)**
   - What we know: Currently uses `require_any_auth` -- any authenticated user can check any driver's status
   - What's unclear: Should this be `require_driver` (only driver can see own status) or remain `require_any_auth` (customer app might check driver status during ride)?
   - Recommendation: Keep as `require_any_auth` since customer apps may need to see driver status during active rides.

3. **bid_routes.py scope**
   - What we know: 30+ endpoints in bid_routes.py have NO per-endpoint auth at all
   - What's unclear: Should all bid_routes.py conversions be in this phase or split?
   - Recommendation: Include bid_routes.py customer and driver endpoints in this phase since AUTH-01/AUTH-02 say "ALL" customer/driver endpoints.

4. **Test updates scope**
   - What we know: Converting `get_current_user` endpoints to `require_customer` will break tests using `auth_headers` fixture
   - What's unclear: How many tests need updating?
   - Recommendation: The planner should include a test update task. Use `customer_auth_headers` and `driver_auth_headers` fixtures that already exist in conftest.py.

## Sources

### Primary (HIGH confidence)
- `auth_utils.py` -- read in full, all 5 auth functions verified
- `main_new.py` -- all customer/driver endpoints audited with line numbers
- `bid_routes.py` -- all endpoints listed, auth status confirmed (no auth imports)
- `conftest.py` -- test fixtures verified (customer_auth_headers, driver_auth_headers exist)

### Secondary (HIGH confidence)
- `REQUIREMENTS.md` -- AUTH-01, AUTH-02 requirements confirmed
- `ROADMAP.md` -- Phase 01 scope and success criteria confirmed
- `STATE.md` -- v1.2 context confirmed (32 endpoints already done)

## Metadata

**Confidence breakdown:**
- Endpoint inventory: HIGH -- every endpoint audited with line numbers from actual code
- Auth patterns: HIGH -- all 4 patterns identified with code examples
- Pitfalls: HIGH -- based on actual code analysis, not speculation
- bid_routes.py: HIGH -- full endpoint list verified
- Test impact: MEDIUM -- know the fixtures exist, but haven't counted affected tests

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable codebase, no external dependencies)
