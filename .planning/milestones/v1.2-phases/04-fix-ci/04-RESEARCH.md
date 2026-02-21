# Phase 04: Fix CI + API Contract Tests - Research

**Researched:** 2026-02-21
**Domain:** API contract testing, shipped build verification, CI/CD workflow fixes
**Confidence:** HIGH

## Summary

The contract test file (`test_ios_api_contracts.py`) has 19 test methods covering ~15 unique paths, all of which are wrong or outdated. The actual shipped iOS and Android apps call ~160 unique API endpoints. The tests were written before auth hardening (Phase 02 of v1.1) and use endpoints that don't match what the apps actually call.

**Critical discovery: The shipped TestFlight/Firebase builds are NOT the same as current HEAD.** The TestFlight builds (uploaded Feb 18, 2026) are 78-80 commits behind HEAD. Importantly, the shipped iOS builds still call 6 endpoints with OLD paths that were fixed in Phase 02-02 of v1.2 (Feb 20). The shipped Android builds (built Feb 18) still call 4 endpoints with OLD paths that were fixed in Phase 03-01 of v1.2 (Feb 20). The backend has route aliases for most (but not all) of these old paths, so the shipped apps mostly work, but contract tests must cover BOTH the shipped (old) paths AND the current HEAD (new) paths.

The CI integration-tests.yml workflow is **consistently failing** because `database.py` defaults `ENVIRONMENT` to `"production"`, which triggers `sslmode=require` on PostgreSQL connections. The CI PostgreSQL service container does not support SSL. This causes `init_db()` to crash before any tests run.

**Primary recommendation:** (1) Fix `database.py` ENVIRONMENT default from `"production"` to `""` so CI doesn't require SSL. (2) Add `ENVIRONMENT=testing` to the CI contract test job's `Start Backend Server` step. (3) Rewrite `test_ios_api_contracts.py` to cover all ~160 endpoint paths that shipped iOS/Android apps actually call, organized by role. (4) Add missing `customer_auth_headers` fixture to conftest.py.

## Part 1: Shipped Build Verification

### iOS TestFlight Builds (VERIFIED via App Store Connect API)

| App | Bundle ID | Version | Build | Upload Date | Processing State |
|-----|-----------|---------|-------|-------------|------------------|
| Dollor - Food & Rides | com.dollorai.customer | 1.0 | **1088** | 2026-02-18T21:01:45-08:00 | VALID |
| Dollor Delivery | com.dollorai.delivery | 1.0 | **196** | 2026-02-18T21:15:32-08:00 | VALID |
| Dollor Restaurant | com.dollorai.restaurant | 1.0 | **164** | 2026-02-18T21:15:19-08:00 | VALID |

**Source commit:** Customer build 1088 was tagged at commit `7b659947`. Driver/Restaurant builds were tagged at commit `1297b663` (2 commits later, same day). Both are from **Feb 18, 2026**.

**Commits since TestFlight upload:** 78-80 commits on HEAD after the shipped builds, including:
- `ad128e49` - iOS auth headers strengthened from if-let to guard-let
- `58a1dae2` - iOS vendor delete, order chat paths, duplicate completeRide fixed
- Auth hardening (170+ endpoints secured)
- Dead proxy stub deletion (93 stubs removed)
- API endpoint standardization

### Android Firebase/APK Builds (VERIFIED from build outputs)

| App | Package ID | Version Name | Version Code | APK Date | APK Size |
|-----|------------|-------------|-------------|----------|----------|
| Customer | ai.dollor.customer | 1.0.22 | **23** | 2026-02-18 23:56 | 24.1 MB |
| Driver | ai.dollor.driver | 1.0.19 | **20** | 2026-02-18 23:53 | 15.6 MB |
| Partner | ai.dollor.partner | 1.0.15 | **16** | 2026-02-18 23:57 | 15.5 MB |

**Source commit:** APKs built from commit `9c42c21d` (2026-02-18T23:48:26-08:00 "fix: Android driver delivery flow -- match iOS endpoints exactly"). HEAD is 2 commits ahead (`5f816020` + `5e460c1f`, Phase 03 Android fixes from Feb 20).

**Commits since APK build:** 2 commits, both in Phase 03-01:
- `5f816020` - Corrected 5 Android API paths to match backend routes
- `5e460c1f` - Corrected staging URL in tests + photo URL resolution

## Part 2: Shipped vs HEAD Endpoint Differences

### iOS: 6 Paths Changed Since TestFlight Upload

| Shipped Path (TestFlight build 1088/196/164) | HEAD Path (current) | Backend Status |
|----------------------------------------------|---------------------|----------------|
| `POST /api/customer/favorites` (body has customer_id/vendor_id) | `POST /api/customer/favorites/{customerId}/{vendorId}` (path params) | Only new path exists -- **SHIPPED APP BROKEN for add favorite** |
| `DELETE /api/vendors/{vendorId}/delete` | `DELETE /api/vendors/{vendorId}` | Only new path exists -- **SHIPPED APP BROKEN for vendor delete** |
| `GET/POST /api/orders/{orderId}/chat` | `GET/POST /api/customer/orders/{orderId}/chat` | **ALIAS EXISTS** at main_new.py:21570-21571 |
| `GET/POST /api/chat/messages/{rideRequestId}` | `GET/POST /api/p2p/ride-requests/{rideRequestId}/chat` | **ALIAS EXISTS** at main_new.py:16410-16420, 21552-21553 |
| `POST /api/erp/rides/{rideId}/cancel` | `POST /api/rides/request/{rideId}/cancel` | **BOTH EXIST** (erp at 15084-15085, rides/request at bid_routes) |
| `POST /api/erp/orders/{rideId}/complete-delivery` (for ride completion) | Removed (use `POST /api/rides/request/{rideRequestId}/complete`) | **ALIAS EXISTS** at main_new.py:14852-14859 |

**Impact:** 2 of 6 shipped paths are actually BROKEN in the shipped TestFlight build (favorites add, vendor delete). The other 4 work via backend aliases.

### Android: 4 Paths Changed Since APK Build

| Shipped Path (APK build from 9c42c21d) | HEAD Path (current) | Backend Status |
|-----------------------------------------|---------------------|----------------|
| `POST orders/create` | `POST erp/orders/create` | **ALIAS EXISTS** at main_new.py:15350 |
| `GET customer/rides` | `GET customer/rides/history` | **ALIAS EXISTS** at main_new.py:15466 |
| `POST rides/{rideId}/cancel` | `POST rides/request/{rideId}/cancel` | **BOTH EXIST** (separate routes) |
| `POST erp/rides/{rideId}/rate` | `POST rides/{rideId}/rate` | **BOTH EXIST** at main_new.py:4399 and 16012 |

**Impact:** All 4 Android shipped old paths work via backend aliases. No broken paths in shipped Android build.

### Android Known Bug (Pre-existing)

| Path | Issue | Status |
|------|-------|--------|
| `DELETE /api/rides/recurring/{id}` | Backend expects `/api/rides/recurring-rides/{id}` | **BROKEN** -- silent 404, documented in MEMORY.md |

## Part 3: Complete Endpoint Inventory from Shipped Builds

### iOS Shipped Build: 157 Unique Path Patterns

Extracted from `P2PAPIService.swift` at commit `1297b663` (the TestFlight build commit).

**Customer Auth & Profile (10 paths):**
- `POST /api/auth/customer/login`
- `POST /api/auth/customer/register`
- `POST /api/auth/customer/google`
- `POST /api/customer/apple-auth`
- `PUT /api/customer/{customerId}/profile`
- `POST /api/customer/password-reset/request`
- `POST /api/customer/password-reset/confirm`
- `DELETE /api/customers/{customerId}/delete`
- `GET /api/customer/orders`
- `GET /api/customer/rides/history`

**Customer Addresses (6 paths):**
- `GET /api/addresses/{userId}`
- `GET /api/addresses/{userId}/default`
- `POST /api/addresses/{userId}`
- `PUT /api/addresses/{userId}/{addressId}`
- `DELETE /api/addresses/{userId}/{addressId}`
- `POST /api/addresses/{userId}/{addressId}/set-default`

**Customer Favorites (4 paths):**
- `GET /api/customer/favorites/{customerId}`
- `POST /api/customer/favorites` **(SHIPPED -- broken, no backend route)**
- `DELETE /api/customer/favorites/{customerId}/{vendorId}`
- `GET /api/customer/favorites/{customerId}/check/{vendorId}`

**Customer Payment Cards (4 paths):**
- `GET /api/customers/{customerId}/cards`
- `POST /api/customers/{customerId}/cards`
- `DELETE /api/customers/{customerId}/cards/{cardId}`
- `POST /api/customers/{customerId}/cards/{cardId}/default`

**Customer Cart (5 paths):**
- `GET /api/cart`
- `POST /api/cart/items`
- `PUT /api/cart/items/{itemId}`
- `DELETE /api/cart/items/{itemId}`
- `DELETE /api/cart`

**Customer Orders (11 paths):**
- `GET /api/customer/orders/{orderId}/track`
- `GET /api/customer/{customerId}/active-orders`
- `POST /api/erp/orders/create`
- `POST /api/erp/orders/{orderId}/confirm-payment`
- `POST /api/orders/{orderId}/tip-driver`
- `POST /api/orders/{orderId}/cancel`
- `GET /api/orders/{orderId}/refund-status`
- `GET /api/orders/{orderId}/modification`
- `POST /api/orders/{orderId}/modification/respond`
- `POST /api/orders/{orderId}/mark-unavailable`
- `POST /api/customer/orders/{orderId}/rate-driver`
- `POST /api/customer/orders/{orderId}/rate-restaurant`

**Customer Order Chat (2 paths -- SHIPPED uses old paths):**
- `GET /api/orders/{orderId}/chat` **(SHIPPED -- alias exists)**
- `POST /api/orders/{orderId}/chat` **(SHIPPED -- alias exists)**

**Customer Rideshare (28 paths):**
- `POST /api/rides/estimate`
- `POST /api/rides/request`
- `POST /api/rides/request/{requestId}/bid`
- `GET /api/rides/request/{requestId}/bids`
- `POST /api/rides/bid/{bidId}/respond`
- `POST /api/rides/bid/{bidId}/withdraw`
- `POST /api/rides/bid/{bidId}/driver-counter`
- `POST /api/rides/bid/{bidId}/accept-counter`
- `POST /api/rides/bid/{bidId}/reject-counter`
- `GET /api/rides/bid/{bidId}`
- `GET /api/rides/customer/{customerId}/requests`
- `POST /api/rides/request/{rideRequestId}/cancel` **(HEAD -- shipped uses erp/rides/{id}/cancel)**
- `POST /api/rides/request/{rideRequestId}/arrived`
- `POST /api/rides/request/{rideRequestId}/start`
- `POST /api/rides/request/{rideRequestId}/complete`
- `POST /api/rides/request/{rideRequestId}/no-show`
- `POST /api/rides/request/{rideRequestId}/driver-cancel`
- `POST /api/rides/request/{rideRequestId}/rate-passenger`
- `POST /api/rides/{rideId}/rate`
- `POST /api/rides/{rideId}/tip`
- `GET /api/rides/request/{rideId}/receipt`
- `POST /api/rides/request/{rideId}/email-receipt`
- `GET /api/rides/surge`
- `GET /api/rides/available`
- `POST /api/erp/rides/{rideId}/negotiate`
- `POST /api/erp/rides/{rideId}/accept-fare`
- `POST /api/erp/rides/{rideId}/customer-negotiate`
- `POST /api/erp/rides/{rideId}/customer-accept-fare`
- `GET /api/erp/rides/{rideId}/negotiation-status`
- `GET /api/erp/rides/{rideId}/track`
- `GET /api/erp/rides/{rideId}/status`
- `POST /api/payments/ride/create-intent`

**Customer Ride Chat (2 paths -- SHIPPED uses old paths):**
- `GET /api/chat/messages/{rideRequestId}` **(SHIPPED -- alias exists)**
- `POST /api/chat/messages/{rideRequestId}` **(SHIPPED -- alias exists)**

**Customer Disputes & Recurring (5 paths):**
- `POST /api/rides/dispute`
- `GET /api/rides/customer/{customerId}/disputes`
- `GET /api/rides/dispute/{disputeId}`
- `GET /api/rides/customer/{customerId}/recurring-rides`
- `POST /api/rides/customer/{customerId}/recurring-rides`
- `DELETE /api/rides/recurring-rides/{recurringRideId}`

**Vendor Auth (8 paths):**
- `POST /api/auth/vendor/login`
- `POST /api/auth/vendor/register`
- `POST /api/auth/vendor/google-auth`
- `POST /api/auth/vendor/apple-auth`
- `POST /api/vendors/public`
- `POST /api/vendor/password-reset/request`
- `POST /api/vendor/password-reset/confirm`

**Vendor Profile & Menu (12 paths):**
- `GET /api/vendors/{vendorId}/menu`
- `POST /api/vendors/{vendorId}/menu`
- `PUT /api/vendors/{vendorId}/menu/{itemId}`
- `DELETE /api/vendors/{vendorId}/menu/{itemId}`
- `GET /api/vendors/{vendorId}/menu/categories`
- `POST /api/vendors/{vendorId}/menu/assign-stock-images`
- `PUT /api/vendors/{vendorId}/online-status`
- `DELETE /api/vendors/{vendorId}/delete` **(SHIPPED -- broken, no backend route)**
- `GET /api/vendors/{vendorId}/documents`
- `POST /api/vendors/{vendorId}/documents`
- `DELETE /api/vendors/{vendorId}/documents/{documentId}`

**Vendor Orders (7 paths):**
- `GET /api/erp/orders/vendor/{vendorId}`
- `PATCH /api/erp/orders/{orderId}/status`
- `POST /api/erp/orders/{orderId}/restaurant-accept`
- `POST /api/erp/orders/{orderId}/restaurant-decline`
- `POST /api/erp/orders/{orderId}/restaurant-accept-delivery`
- `POST /api/erp/orders/{orderId}/restaurant-decline-delivery`
- `POST /api/erp/orders/{orderId}/delivered` (vendor marks ready)

**Vendor Promotions (10 paths):**
- `GET /api/promotions/active`
- `GET /api/promotions/featured`
- `POST /api/promotions/create`
- `GET /api/promotions/vendor/{vendorId}`
- `PUT /api/promotions/{promotionId}`
- `DELETE /api/promotions/{promotionId}`
- `GET /api/promotions/suggestions/{vendorId}`
- `GET /api/promotions/analytics/{vendorId}`
- `POST /api/promotions/apply`
- `POST /api/promotions/quick-create/{vendorId}/{promoType}`

**Vendor KOT & Analytics (5 paths):**
- `GET /api/vendor/kot-config`
- `PUT /api/vendor/kot-config`
- `POST /api/vendor/kot-test`
- `POST /api/erp/orders/{orderId}/print-kot`
- `GET /api/vendors/{vendorId}/ai-insights`
- `GET /api/menu-verification/status/{vendorId}`
- `POST /api/menu-verification/approve-all/{vendorId}`

**Driver Auth (7 paths):**
- `POST /api/auth/driver/login`
- `POST /api/auth/driver/register`
- `POST /api/auth/driver/apple-auth`
- `POST /api/auth/driver/refresh`
- `POST /api/driver/password-reset/request`
- `POST /api/driver/password-reset/confirm`
- `DELETE /api/drivers/{driverId}/delete`

**Driver Profile & Status (8 paths):**
- `GET /api/erp/drivers/{driverId}`
- `PUT /api/erp/drivers/{driverId}`
- `GET /api/drivers/{driverId}`
- `GET /api/drivers/{driverId}/documents`
- `POST /api/drivers/{driverId}/documents`
- `PUT /api/auth/driver/location`
- `PUT /api/auth/driver/online`

**Driver Deliveries (10 paths):**
- `GET /api/erp/orders/available-for-delivery`
- `POST /api/erp/orders/{orderId}/assign-driver`
- `POST /api/erp/orders/{orderId}/picked-up`
- `POST /api/erp/orders/{orderId}/delivered`
- `POST /api/erp/orders/{orderId}/complete-delivery`
- `POST /api/erp/orders/{orderId}/delivery-photo`
- `PUT /api/erp/orders/{orderId}/unassign-driver`
- `PUT /api/erp/orders/{orderId}/driver-location`
- `GET /api/erp/orders/driver/{driverId}/active`
- `GET /api/v5/driver/{driverId}/dashboard`

**Driver Earnings & Stripe (7 paths):**
- `GET /api/drivers/{driverId}/earnings`
- `GET /api/drivers/{driverId}/payout-history`
- `GET /api/rides/driver/{driverId}/payout-history`
- `POST /api/drivers/{driverId}/stripe/connect`
- `GET /api/drivers/{driverId}/stripe/onboarding-link`
- `GET /api/drivers/{driverId}/stripe/status`
- `POST /api/drivers/{driverId}/stripe/dashboard-link`

**Driver Rideshare (3 paths):**
- `GET /api/erp/rides/available`
- `POST /api/erp/rides/{rideId}/accept`
- `POST /api/erp/rides/{rideId}/picked-up`

**Shared/Cross-App (9 paths):**
- `GET /api/vendors/published`
- `GET /api/public/restaurants/{vendorId}`
- `POST /api/erp/customers/{customerId}/fcm-token`
- `POST /api/erp/drivers/{driverId}/fcm-token`
- `POST /api/erp/vendors/{vendorId}/fcm-token`
- `PUT /api/erp/drivers/{driverId}/location`
- `PUT /api/erp/drivers/{driverId}/status`
- `GET /api/erp/orders/{orderId}/full-tracking`
- `GET /api/erp/orders/{orderId}/driver-location`
- `GET /api/erp/analytics/realtime`
- `GET /api/erp/analytics/ai-employees`
- `POST /api/payments/create-intent`
- `POST /api/erp/payments/refund`
- `POST /api/promotions/apply`

### Android Shipped Build: ~145 Unique Path Patterns

Extracted from `DollorApiService.kt` + `CustomerRideshareApiService.kt` at commit `9c42c21d`.

**Android-Only Endpoints (not in iOS):**
- `POST auth/customer/apple-auth` (iOS has /api/customer/apple-auth -- different prefix)
- `POST auth/driver/demo-login`
- `POST auth/driver/google`
- `POST customer/demo-login`
- `POST auth/vendor/demo-login`
- `GET drivers/{driverId}/balance`
- `POST drivers/{driverId}/bank-account`
- `POST drivers/{driverId}/payouts`
- `POST drivers/{driverId}/status`
- `GET drivers/{driverId}/status`
- `POST driver/location`
- `GET erp/driver/{driverId}/deliveries`
- `GET erp/orders/driver/{driverId}/pending`
- `GET erp/payouts/vendor/{vendorId}`
- `POST vendors/{vendorId}/bank-account`
- `GET vendors/{vendorId}/reviews`
- `GET legal/tos`
- `GET legal/privacy-policy`
- `GET tax/calculate`
- `GET tax/estimate/{state}`
- `POST notifications/register-token`
- `GET driver/bids`
- `POST erp/orders/{orderId}/start-delivery-decision`
- `POST erp/orders/{orderId}/restaurant-delivery-decision`
- `GET erp/orders/{orderId}/delivery-decision-status`
- `POST vendors/{vendorId}/stripe/connect`
- `GET vendors/{vendorId}/stripe/onboarding-link`
- `GET vendors/{vendorId}/stripe/status`
- `POST vendors/{vendorId}/stripe/dashboard-link`

**Android Shipped Wrong Paths (backend has aliases):**
- `POST orders/create` (should be `erp/orders/create`) -- alias exists
- `GET customer/rides` (should be `customer/rides/history`) -- alias exists
- `POST rides/{rideId}/cancel` (should be `rides/request/{rideId}/cancel`) -- both exist
- `POST erp/rides/{rideId}/rate` (should be `rides/{rideId}/rate`) -- both exist
- `DELETE rides/recurring/{id}` (should be `rides/recurring-rides/{id}`) -- **NO ALIAS, BROKEN**

## Part 4: Current Contract Test Analysis

### Existing Tests (19 methods, ~15 paths)

| Class | # Tests | Paths Tested | Problems |
|-------|---------|--------------|----------|
| `TestAuthAPIContracts` | 4 | `/health`, `/api/auth/login`, `/register` | `/register` is not the customer register path |
| `TestDriverAPIContracts` | 4 | `/api/auth/driver/register`, `/login`, `/me`, `/location` | `/me` doesn't exist as endpoint |
| `TestVendorAPIContracts` | 3 | `/api/auth/vendor/login`, vendor menu, `/api/orders` | `/api/orders` is admin endpoint, not vendor |
| `TestCustomerAPIContracts` | 3 | `/api/restaurants`, restaurant menu, `/api/orders` | `/api/restaurants` -- apps use `/api/vendors/published` |
| `TestCommonAPIContracts` | 4 | Nonexistent endpoint, health, CORS, pagination | Uses `/api/restaurants` which isn't the app path |
| `TestPushNotificationContracts` | 1 | `/api/device/register` | **DOES NOT EXIST** -- apps use FCM token endpoints |

**Every single test** uses wrong endpoints, no auth headers, or tests endpoints the apps don't call.

### Gap Summary

| Category | Current Tests | Real Shipped Paths | Coverage |
|----------|--------------|-------------------|----------|
| Auth (all roles) | 4 (wrong paths) | ~25 | 0% |
| Customer orders | 1 (wrong path) | ~13 | 0% |
| Customer addresses | 0 | 6 | 0% |
| Customer favorites | 0 | 4 | 0% |
| Customer cards | 0 | 4 | 0% |
| Customer cart | 0 | 5 | 0% |
| Rideshare | 0 | ~30 | 0% |
| Driver deliveries | 0 | ~12 | 0% |
| Driver earnings/Stripe | 0 | ~10 | 0% |
| Vendor menu | 1 (partial) | 7 | ~5% |
| Vendor orders | 1 (wrong path) | ~8 | 0% |
| Vendor promotions | 0 | ~10 | 0% |
| Push notifications | 1 (wrong endpoint) | 3 | 0% |
| Shared/public | 1 (wrong path) | ~9 | 0% |
| **TOTAL** | **~15 paths** | **~160 unique** | **<1% correct** |

## Part 5: CI Infrastructure Analysis

### CI Failure Root Cause (VERIFIED from CI logs)

The `api-contract-tests` job in `integration-tests.yml` fails at the **"Start Backend Server"** step:

```
python -c "from database import init_db; init_db()"
```

**Root cause chain:**
1. `database.py:18`: `_is_prod = os.getenv("ENVIRONMENT", "production").lower() in ("production", "prod")`
2. Default `"production"` means `_is_prod = True`
3. `database.py:27-28`: `if _is_prod and "sslmode" not in DATABASE_URL: _connect_args["sslmode"] = "require"`
4. CI PostgreSQL service container does NOT support SSL
5. Connection fails with SSL error, `init_db()` crashes, backend never starts

**Fix:** Change `database.py:18` default from `"production"` to `""`:
```python
_is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
```

AND add `ENVIRONMENT=testing` to the CI workflow `env:` block.

### CI Workflow Missing Environment Variables

| Job | Step | Missing Variables |
|-----|------|-------------------|
| `api-contract-tests` | "Start Backend Server" (line 66-71) | Has JWT_SECRET_KEY + TESTING, but **missing ENVIRONMENT=testing** |
| `api-contract-tests` | "Run API Contract Tests" (line 81-84) | **Missing JWT_SECRET_KEY, TESTING, ENVIRONMENT** -- tests import main_new.py which needs JWT_SECRET_KEY |
| `backend-api-tests` | "Run Backend API Tests" (line 134-137) | Has JWT_SECRET_KEY + TESTING, but **missing ENVIRONMENT** |
| `e2e-critical-flows` | "Start Backend Server" (line 270-274) | Has JWT_SECRET_KEY + TESTING, but **missing ENVIRONMENT** |
| `frontend-integration-tests` | "Start Backend Server" (line 196-199) | Has JWT_SECRET_KEY + TESTING, but **missing ENVIRONMENT** |

### Failure Masking: `|| echo "completed"`

Lines 85, 143, 221, 285 all use `|| echo "... completed"` which prevents test failures from failing the CI job. These should be removed so real failures are surfaced.

### Deploy Workflow (deploy-dollar-ai.yml) -- GREEN

The deploy workflow only runs `pytest tests/unit/ -v` and is GREEN. No changes needed here unless we want to add contract tests to the deploy gate (not recommended initially).

## Part 6: conftest.py Fixture Gaps

### Missing Fixtures

The existing `conftest.py` has:
- `test_user` + `auth_headers` (generic User with UserRole.USER)
- `test_admin` + `admin_auth_headers` (User with UserRole.ADMIN)
- `test_vendor` + `vendor_auth_headers` (Vendor with VendorStatus.APPROVED)
- `test_driver` + `driver_auth_headers` (Driver with DriverStatus.APPROVED)

**Missing:**
- `test_customer` (Customer ORM object)
- `customer_auth_headers` (JWT with `customer_id` claim)

**Why needed:** `require_customer` in `auth_utils.py` (line 77-120) looks for `customer_id` in JWT payload, then falls back to email lookup. Without `customer_id` in the token, it tries email match against the `customers` table, which won't find a User record.

**Customer model fields (from models.py:578):**
- `first_name` (String), `last_name` (String), `email` (String, unique), `phone` (String)
- `password_hash` (String), `is_active` (Boolean, default=True)

### conftest.py Fix

```python
@pytest.fixture(scope="function")
def test_customer(db_session) -> Customer:
    """Create a test customer"""
    customer = Customer(
        first_name="Test",
        last_name="Customer",
        email=f"customer_{datetime.now().timestamp()}@test.com",
        phone="+14155551234",
        password_hash=get_password_hash("CustomerPassword123!"),
        is_active=True,
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer

@pytest.fixture(scope="function")
def customer_auth_headers(test_customer) -> Dict[str, str]:
    """Get authentication headers for customer"""
    token = create_access_token(data={
        "sub": test_customer.email,
        "customer_id": test_customer.id
    })
    return {"Authorization": f"Bearer {token}"}
```

## Part 7: Public vs Auth-Required Path Classification

Based on `_PUBLIC_EXACT_PATHS` (main_new.py:257-333), `_PUBLIC_PREFIXES` (335-352), and `_PUBLIC_PATTERN_PATHS` (354-371):

### Public Endpoints (no auth needed in tests)

| Path | How Public |
|------|-----------|
| `/health` | Exact match |
| `/api/auth/customer/login`, `/register`, `/google`, `/apple-auth` | Exact match |
| `/api/auth/driver/login`, `/register`, `/google`, `/apple-auth` | Exact match |
| `/api/auth/vendor/login`, `/register`, `/google-auth`, `/apple-auth`, `/demo-login` | Exact match |
| `/api/customer/demo-login`, `/api/auth/driver/demo-login` | Exact match |
| `/api/vendors/published` | Exact match |
| `/api/promotions/featured`, `/active` | Exact match |
| `/api/rides/estimate`, `/surge` | Exact match |
| `/api/promotions/apply` | Exact match |
| `/api/public/*` | Prefix match |
| `/api/customer/password-reset/*` | Prefix match |
| `/api/driver/password-reset/*` | Prefix match |
| `/api/vendor/password-reset/*` | Prefix match |
| `/api/restaurants*` | Prefix match |
| `/api/vendors/public*` | Prefix match |
| `GET /api/vendors/{id}/menu*` | Pattern match (GET only) |
| `GET /api/vendors/{id}/reviews` | Pattern match (GET only) |
| `GET /api/tax/*` | Pattern match |
| `GET /api/legal/*` | Prefix match |

### Auth-Required (all other paths)

All endpoints not listed above require a valid JWT Bearer token. Contract tests for these MUST pass `customer_auth_headers`, `driver_auth_headers`, `vendor_auth_headers`, or `auth_headers`.

## Architecture Patterns

### Recommended Contract Test Structure

Rewrite `test_ios_api_contracts.py` as a single comprehensive file:

```python
class TestPublicEndpoints:           # No auth needed (~20 paths)
class TestCustomerAuthContracts:     # Customer auth/profile (~10 paths)
class TestCustomerOrderContracts:    # Orders, tracking, rating (~13 paths)
class TestCustomerAddressContracts:  # Addresses (~6 paths)
class TestCustomerFavoriteContracts: # Favorites (~4 paths)
class TestCustomerCardContracts:     # Payment cards (~4 paths)
class TestCustomerCartContracts:     # Cart (~5 paths)
class TestRideshareContracts:        # All rideshare (~30 paths)
class TestDriverAuthContracts:       # Driver auth (~7 paths)
class TestDriverDeliveryContracts:   # Deliveries (~10 paths)
class TestDriverEarningsContracts:   # Earnings, Stripe (~7 paths)
class TestVendorAuthContracts:       # Vendor auth (~8 paths)
class TestVendorMenuContracts:       # Menu management (~7 paths)
class TestVendorOrderContracts:      # Vendor orders (~7 paths)
class TestVendorPromotionContracts:  # Promotions (~10 paths)
class TestVendorDocumentContracts:   # Documents (~3 paths)
class TestVendorKOTContracts:        # KOT, analytics (~5 paths)
class TestShippedPathAliases:        # Old paths that shipped apps still call (~10 paths)
class TestAndroidOnlyContracts:      # Android-specific paths (~25 paths)
class TestSharedEndpoints:           # FCM, tracking, payments (~9 paths)
```

### Contract Test Design Pattern

```python
# Public endpoint -- verify returns 200 (or valid response)
def test_vendors_published(self, client):
    response = client.get("/api/vendors/published")
    assert response.status_code == 200

# Auth-required -- verify 401 without auth
def test_customer_orders_requires_auth(self, client):
    response = client.get("/api/customer/orders")
    assert response.status_code == 401

# Auth-required -- verify works with auth
def test_customer_orders_with_auth(self, client, customer_auth_headers):
    response = client.get("/api/customer/orders", headers=customer_auth_headers)
    assert response.status_code in [200, 404]

# POST with body -- verify endpoint accepts format (422 = valid, endpoint exists)
def test_create_order_endpoint_exists(self, client, customer_auth_headers):
    response = client.post("/api/erp/orders/create", json={}, headers=customer_auth_headers)
    assert response.status_code in [200, 201, 400, 422]

# Shipped old path alias -- verify backend still handles it
def test_shipped_order_chat_alias(self, client, customer_auth_headers):
    """Shipped iOS build uses /api/orders/{id}/chat, backend has alias"""
    response = client.get("/api/orders/1/chat", headers=customer_auth_headers)
    assert response.status_code in [200, 404]  # Not 401 (auth works), not 405 (method exists)
```

## Common Pitfalls

### Pitfall 1: database.py SSL Default Crashes CI
**What goes wrong:** `init_db()` fails before any tests run because `sslmode=require` fails on CI PostgreSQL.
**Root cause:** `database.py:18` defaults ENVIRONMENT to `"production"`.
**Fix:** Change default to `""`. Also add `ENVIRONMENT=testing` to all CI env blocks.
**Confidence:** HIGH (verified from CI failure logs)

### Pitfall 2: Auth Middleware Returns 401 Before Route Matching
**What goes wrong:** Tests expecting 404 for missing endpoints get 401 from auth middleware.
**How to avoid:** For protected endpoints, ALWAYS send auth headers. Accept 200/400/422/404 as "endpoint exists."
**Confidence:** HIGH

### Pitfall 3: Missing customer_auth_headers Fixture
**What goes wrong:** Customer endpoints return 401 because require_customer needs customer_id in JWT.
**Fix:** Add test_customer and customer_auth_headers fixtures to conftest.py.
**Confidence:** HIGH

### Pitfall 4: Shipped Apps Call Different Paths Than HEAD
**What goes wrong:** Contract tests pass for HEAD paths but miss the actual paths shipped apps use.
**How to avoid:** Test BOTH the current (correct) paths AND the shipped (old) alias paths. Add a `TestShippedPathAliases` class.
**Confidence:** HIGH

### Pitfall 5: `|| echo` Masks Real Failures in CI
**What goes wrong:** CI shows "success" even when tests fail.
**Fix:** Remove `|| echo "... completed"` from all test run steps.
**Confidence:** HIGH

### Pitfall 6: The `init_db` Step Uses database.py Engine (Not Test Engine)
**What goes wrong:** The CI "Start Backend Server" step runs `from database import init_db; init_db()` which uses the production database.py engine (with SSL requirement).
**How to avoid:** The `ENVIRONMENT=testing` env var must be set on the step that runs `init_db`, not just the test step.
**Confidence:** HIGH

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth tokens for tests | Manual JWT creation per test | conftest.py fixtures | DRY, consistent |
| Endpoint path inventory | Manual listing | Extract from iOS/Android source (this research) | Verified against shipped builds |
| Full response validation | Assert every field | Assert endpoint exists + auth + basic shape | Contract tests, not integration tests |
| Test DB setup | Custom per-test DB | conftest.py `test_db` + `db_session` fixtures | Already handles SQLite/PostgreSQL |

## Scope Recommendation

### Plan 1: Fix CI Infrastructure + Rewrite Contract Tests (~150 test methods)

**Tasks:**
1. Fix `database.py:18` -- change default from `"production"` to `""` (1-line fix)
2. Add `ENVIRONMENT=testing` to ALL env blocks in `integration-tests.yml`
3. Add missing `JWT_SECRET_KEY` and `TESTING` to "Run API Contract Tests" env block
4. Remove `|| echo "completed"` from all test run steps
5. Add `test_customer` and `customer_auth_headers` fixtures to `conftest.py`
6. Rewrite `test_ios_api_contracts.py` with all ~160 endpoint paths
7. Include `TestShippedPathAliases` class for old shipped paths that have backend aliases
8. Run locally to verify all tests pass

### Plan 2: Push + Verify CI Green

**Tasks:**
1. Commit changes from Plan 1
2. Push to trigger CI
3. Monitor integration-tests.yml run
4. If failures, debug and fix
5. Verify all 4 CI jobs pass (api-contract-tests, backend-api-tests, e2e-critical-flows, frontend-integration-tests)

**Note:** ios-integration-tests job runs on macos-14 and may have its own issues (CocoaPods, Xcode version). This is out of scope for Phase 04.

## Open Questions

1. **Should we add backend route aliases for the 2 broken shipped iOS paths?**
   - `POST /api/customer/favorites` (no path params) -- shipped app broken
   - `DELETE /api/vendors/{vendorId}/delete` -- shipped app broken
   - Recommendation: YES, add aliases in Plan 1 since these are in the SHIPPED TestFlight build. Users hitting these paths get 404s/405s right now.

2. **Should we add contract tests to the deploy gate?**
   - Recommendation: NO, not yet. Keep in integration-tests.yml until stable. Add to deploy gate in a future phase.

3. **Should we fix the Android `rides/recurring/{id}` bug?**
   - This is a pre-existing Android bug (documented in MEMORY.md). Out of scope for Phase 04 unless bundled.
   - Recommendation: Note as known issue, add to contract test as an expected-failure.

4. **How many of the 157 iOS paths should become individual test methods?**
   - Not every path needs its own test method. Group related paths (e.g., all 6 address endpoints can be 2-3 tests).
   - Recommendation: ~100-120 test methods covering all ~160 paths, with grouping where appropriate.

## Sources

### Primary (HIGH confidence)
- **App Store Connect API** -- TestFlight build data retrieved live for all 3 iOS apps
- **Android APK output-metadata.json** -- version/build info read from build artifacts
- **P2PAPIService.swift at commit 1297b663** -- all URL patterns extracted from shipped iOS build
- **DollorApiService.kt at commit 9c42c21d** -- all Retrofit annotations extracted from shipped Android build
- **CustomerRideshareApiService.kt at commit 9c42c21d** -- all OkHttp URL patterns extracted
- **tests/integration/test_ios_api_contracts.py** -- current test file read in full (19 tests)
- **tests/conftest.py** -- fixture definitions read in full
- **.github/workflows/integration-tests.yml** -- CI workflow read in full
- **.github/workflows/deploy-dollar-ai.yml** -- deploy gate read in full
- **database.py:18** -- ENVIRONMENT default verified
- **auth_utils.py** -- require_customer/driver/vendor/admin verified
- **main_new.py:257-371** -- public path allowlist verified
- **main_new.py route aliases** -- old path aliases verified for each shipped path
- **CI run 22249001231** -- failure logs verified (SSL error in init_db)
- **git diff 1297b663..HEAD** -- iOS path changes since TestFlight upload
- **git diff 9c42c21d..HEAD** -- Android path changes since APK build

### Secondary (MEDIUM confidence)
- models.py Customer class definition (fields verified)
- API_REGISTRY.md (552 total backend endpoints)

## Metadata

**Confidence breakdown:**
- Shipped build verification: HIGH -- retrieved from App Store Connect API and build artifacts
- Endpoint inventory: HIGH -- extracted from exact shipped git commits
- CI failure root cause: HIGH -- verified from CI failure logs
- Contract test structure: HIGH -- based on existing conftest.py patterns
- Path alias verification: HIGH -- grep against backend source code
- Fixture requirements: HIGH -- verified against auth_utils.py and models.py

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- test infrastructure doesn't change rapidly; rebuild of iOS/Android would change shipped builds)
