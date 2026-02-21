# Phase 04: Fix CI + API Contract Tests - Research

**Researched:** 2026-02-21
**Domain:** API contract testing, pytest infrastructure, CI/CD workflows
**Confidence:** HIGH

## Summary

The current API contract test file (`test_ios_api_contracts.py`) has **19 test methods** covering only **~15 unique API paths**. The actual shipped iOS and Android apps call **~160 unique API endpoints** across customer, driver, vendor, and rideshare domains. The contract tests are massively outdated -- they cover less than 10% of the real API surface. Additionally, the tests were written before the Phase 02 auth hardening, so many tests that do exist hit auth middleware and return 401 instead of expected responses.

The CI infrastructure has two layers: (1) the production deploy workflow (`deploy-dollar-ai.yml`) gates on `tests/unit/` only and is GREEN, (2) the integration test workflow (`integration-tests.yml`) runs the contract tests plus API/e2e tests on push and nightly schedule -- this is FAILING due to auth middleware interception, missing `ENVIRONMENT=testing` env var (causes SSL requirement in CI's PostgreSQL), and stale test assertions.

**Primary recommendation:** Rewrite `test_ios_api_contracts.py` from scratch to validate every endpoint that iOS and Android apps actually call, organized by app role (customer, driver, vendor, rideshare). Fix CI workflow env vars so integration tests can run. Keep tests lightweight -- verify endpoint existence, HTTP method, auth requirement, and basic response structure rather than full business logic.

## Endpoint Gap Analysis

### Current Contract Tests (19 tests, ~15 paths)

| Class | Tests | Paths Covered |
|-------|-------|---------------|
| `TestAuthAPIContracts` | 4 | `/health`, `/api/auth/login`, `/register` |
| `TestDriverAPIContracts` | 4 | `/api/auth/driver/register`, `/api/auth/driver/login`, `/api/auth/driver/me`, `/api/auth/driver/location` |
| `TestVendorAPIContracts` | 3 | `/api/auth/vendor/login`, `/api/vendors/{id}/menu`, `/api/orders` |
| `TestCustomerAPIContracts` | 3 | `/api/restaurants`, `/api/restaurants/{id}/menu`, `/api/orders` |
| `TestCommonAPIContracts` | 4 | `/api/nonexistent-endpoint-12345`, `/health` (2x), `/api/restaurants` |
| `TestPushNotificationContracts` | 1 | `/api/device/register` |

**Critical problems with current tests:**
1. Tests use **wrong endpoints** (e.g., `/api/restaurants` -- app calls `/api/vendors/published`)
2. Tests use **nonexistent endpoints** (e.g., `/api/device/register` -- app calls `/api/notifications/register-token`)
3. No auth headers passed -- all protected endpoints now return 401
4. No rideshare coverage at all
5. No cart, payment card, address, favorites, or document endpoints
6. Tests `/register` which is not the customer register path (should be `/api/auth/customer/register`)

### Actual iOS App Endpoints (P2PAPIService.swift -- ~120 unique paths)

**Customer Auth & Profile (9 paths):**
- POST `/api/auth/customer/login`, POST `/api/auth/customer/register`
- POST `/api/auth/customer/google`, POST `/api/customer/apple-auth`
- PUT `/api/customer/{customerId}/profile`
- POST `/api/customer/password-reset/request`, POST `/api/customer/password-reset/confirm`
- DELETE `/api/customers/{customerId}/delete`
- GET `/api/customer/orders`

**Customer Orders (11 paths):**
- POST `/api/erp/orders/create`, POST `/api/erp/orders/{orderId}/confirm-payment`
- GET `/api/customer/orders/{orderId}/track`, GET `/api/customer/{customerId}/active-orders`
- POST `/api/orders/{orderId}/tip-driver`, POST `/api/orders/{orderId}/cancel`
- GET `/api/orders/{orderId}/refund-status`, GET `/api/orders/{orderId}/modification`
- POST `/api/orders/{orderId}/modification/respond`, POST `/api/orders/{orderId}/mark-unavailable`
- POST `/api/customer/orders/{orderId}/rate-driver`, POST `/api/customer/orders/{orderId}/rate-restaurant`

**Customer Order Chat (2 paths):**
- GET `/api/customer/orders/{orderId}/chat`, POST `/api/customer/orders/{orderId}/chat`

**Customer Addresses (6 paths):**
- GET `/api/addresses/{userId}`, GET `/api/addresses/{userId}/default`
- POST `/api/addresses/{userId}`, PUT `/api/addresses/{userId}/{addressId}`
- DELETE `/api/addresses/{userId}/{addressId}`, POST `/api/addresses/{userId}/{addressId}/set-default`

**Customer Favorites (4 paths):**
- GET `/api/customer/favorites/{customerId}`, POST `/api/customer/favorites/{customerId}/{vendorId}`
- DELETE `/api/customer/favorites/{customerId}/{vendorId}`, GET `/api/customer/favorites/{customerId}/check/{vendorId}`

**Customer Payment Cards (4 paths):**
- GET `/api/customers/{customerId}/cards`, POST `/api/customers/{customerId}/cards`
- DELETE `/api/customers/{customerId}/cards/{cardId}`, POST `/api/customers/{customerId}/cards/{cardId}/default`

**Customer Cart (5 paths):**
- GET `/api/cart`, POST `/api/cart/items`, PUT `/api/cart/items/{itemId}`
- DELETE `/api/cart/items/{itemId}`, DELETE `/api/cart`

**Customer Rideshare (24 paths):**
- POST `/api/rides/request`, POST `/api/rides/estimate`, GET `/api/customer/rides/history`
- GET `/api/rides/{rideId}/track` (used by both driver and customer via different paths)
- POST `/api/rides/request/{requestId}/cancel`, POST `/api/rides/request/{requestId}/bid`
- GET `/api/rides/request/{requestId}/bids`, GET `/api/rides/customer/{customerId}/requests`
- POST `/api/rides/bid/{bidId}/respond` (accept/reject/counter)
- POST `/api/rides/bid/{bidId}/withdraw`, POST `/api/rides/bid/{bidId}/driver-counter`
- POST `/api/rides/bid/{bidId}/accept-counter`, POST `/api/rides/bid/{bidId}/reject-counter`
- GET `/api/rides/bid/{bidId}` (single bid detail)
- POST `/api/rides/request/{rideRequestId}/arrived`, POST `/api/rides/request/{rideRequestId}/start`
- POST `/api/rides/request/{rideRequestId}/complete`, POST `/api/rides/request/{rideRequestId}/no-show`
- POST `/api/rides/request/{rideRequestId}/driver-cancel`, POST `/api/rides/request/{rideRequestId}/rate-passenger`
- POST `/api/rides/{rideId}/rate`, POST `/api/rides/{rideId}/tip`
- GET `/api/rides/request/{rideId}/receipt`, POST `/api/rides/request/{rideId}/email-receipt`
- GET `/api/rides/surge`, GET `/api/rides/available`
- POST `/api/erp/rides/{rideId}/negotiate`, POST `/api/erp/rides/{rideId}/accept-fare`
- POST `/api/erp/rides/{rideId}/customer-negotiate`, POST `/api/erp/rides/{rideId}/customer-accept-fare`
- GET `/api/erp/rides/{rideId}/negotiation-status`, GET `/api/erp/rides/{rideId}/track`
- GET `/api/erp/rides/{rideId}/status`, POST `/api/payments/ride/create-intent`
- GET `/api/p2p/ride-requests/{rideRequestId}/chat`, POST `/api/p2p/ride-requests/{rideRequestId}/chat`

**Customer Disputes & Recurring (5 paths):**
- POST `/api/rides/dispute`, GET `/api/rides/customer/{customerId}/disputes`
- GET `/api/rides/dispute/{disputeId}`
- GET `/api/rides/customer/{customerId}/recurring-rides`, POST `/api/rides/customer/{customerId}/recurring-rides`
- DELETE `/api/rides/recurring-rides/{recurringRideId}`

**Driver Auth (7 paths):**
- POST `/api/auth/driver/login`, POST `/api/auth/driver/register`
- POST `/api/auth/driver/apple-auth`, POST `/api/auth/driver/refresh`
- POST `/api/driver/password-reset/request`, POST `/api/driver/password-reset/confirm`
- DELETE `/api/drivers/{driverId}/delete`

**Driver Profile & Status (7 paths):**
- GET `/api/erp/drivers/{driverId}`, PUT `/api/erp/drivers/{driverId}` (profile update via ERP)
- GET `/api/drivers/{driverId}` (profile via direct path)
- GET `/api/drivers/{driverId}/documents`, POST `/api/drivers/{driverId}/documents` (upload)
- PUT `/api/auth/driver/location?latitude=&longitude=`, PUT `/api/auth/driver/online?is_online=`

**Driver Deliveries (10 paths):**
- GET `/api/erp/orders/available-for-delivery`, POST `/api/erp/orders/{orderId}/assign-driver`
- POST `/api/erp/orders/{orderId}/picked-up`, POST `/api/erp/orders/{orderId}/delivered`
- POST `/api/erp/orders/{orderId}/complete-delivery`, POST `/api/erp/orders/{orderId}/delivery-photo`
- PUT `/api/erp/orders/{orderId}/unassign-driver`, PUT `/api/erp/orders/{orderId}/driver-location`
- GET `/api/erp/orders/driver/{driverId}/active`, GET `/api/v5/driver/{driverId}/dashboard`

**Driver Earnings & Payouts (5 paths):**
- GET `/api/drivers/{driverId}/earnings?period=`, GET `/api/drivers/{driverId}/payout-history?limit=`
- GET `/api/rides/driver/{driverId}/payout-history?period=`
- POST `/api/drivers/{driverId}/stripe/connect`, GET `/api/drivers/{driverId}/stripe/onboarding-link`
- GET `/api/drivers/{driverId}/stripe/status`, POST `/api/drivers/{driverId}/stripe/dashboard-link`

**Driver Rideshare (via iOS shared service, duplicated above):**
- GET `/api/erp/rides/available`, POST `/api/erp/rides/{rideId}/accept`
- POST `/api/erp/rides/{rideId}/picked-up`

**Vendor Auth (8 paths):**
- POST `/api/auth/vendor/login`, POST `/api/auth/vendor/register`
- POST `/api/auth/vendor/google-auth`, POST `/api/auth/vendor/apple-auth`
- POST `/api/vendors/public` (public registration)
- POST `/api/vendor/password-reset/request`, POST `/api/vendor/password-reset/confirm`
- POST `/api/auth/vendor/demo-login`

**Vendor Profile & Settings (3 paths):**
- GET `/api/vendor/profile`, GET `/api/vendors/{vendorId}`, DELETE `/api/vendors/{vendorId}`

**Vendor Orders & Restaurant Flow (8 paths):**
- GET `/api/erp/orders/vendor/{vendorId}`, PATCH `/api/erp/orders/{orderId}/status?status=`
- POST `/api/erp/orders/{orderId}/restaurant-accept`, POST `/api/erp/orders/{orderId}/restaurant-decline`
- POST `/api/erp/orders/{orderId}/restaurant-accept-delivery`, POST `/api/erp/orders/{orderId}/restaurant-decline-delivery`
- PUT `/api/vendors/{vendorId}/online-status?is_online=`

**Vendor Delivery Decision (3 paths):**
- POST `/api/erp/orders/{orderId}/start-delivery-decision`
- POST `/api/erp/orders/{orderId}/restaurant-delivery-decision`
- GET `/api/erp/orders/{orderId}/delivery-decision-status`

**Vendor Menu (7 paths):**
- GET `/api/vendors/{vendorId}/menu`, POST `/api/vendors/{vendorId}/menu`
- PUT `/api/vendors/{vendorId}/menu/{itemId}`, DELETE `/api/vendors/{vendorId}/menu/{itemId}`
- PATCH `/api/vendors/{vendorId}/menu/{itemId}/customizations`
- GET `/api/vendors/{vendorId}/menu/categories`
- POST `/api/vendors/{vendorId}/menu/assign-stock-images`

**Vendor Documents (3 paths):**
- GET `/api/vendors/{vendorId}/documents`, POST `/api/vendors/{vendorId}/documents`
- DELETE `/api/vendors/{vendorId}/documents/{documentId}`

**Vendor Promotions (7 paths):**
- GET `/api/promotions/active`, GET `/api/promotions/featured`
- POST `/api/promotions/create?vendor_id=`, GET `/api/promotions/vendor/{vendorId}`
- PUT `/api/promotions/{promotionId}`, DELETE `/api/promotions/{promotionId}`
- GET `/api/promotions/suggestions/{vendorId}`, GET `/api/promotions/analytics/{vendorId}`
- POST `/api/promotions/apply`, POST `/api/promotions/quick-create/{vendorId}/{promoType}`

**Vendor KOT & Analytics (5 paths):**
- GET `/api/vendor/kot-config`, PUT `/api/vendor/kot-config`
- POST `/api/vendor/kot-test`, POST `/api/erp/orders/{orderId}/print-kot`
- GET `/api/vendors/{vendorId}/ai-insights?period=`, GET `/api/menu-verification/status/{vendorId}`
- POST `/api/menu-verification/approve-all/{vendorId}`

**Shared/Cross-App (9 paths):**
- GET `/api/vendors/published` (customer browse restaurants)
- GET `/api/public/restaurants/{vendorId}` (restaurant detail)
- POST `/api/erp/customers/{customerId}/fcm-token`, POST `/api/erp/drivers/{driverId}/fcm-token`
- POST `/api/erp/vendors/{vendorId}/fcm-token`
- PUT `/api/erp/drivers/{driverId}/location`, PUT `/api/erp/drivers/{driverId}/status?is_online=`
- GET `/api/erp/orders/{orderId}/full-tracking`, GET `/api/erp/orders/{orderId}/driver-location`
- GET `/api/erp/analytics/realtime`, GET `/api/erp/analytics/ai-employees`
- POST `/api/payments/create-intent`, POST `/api/erp/payments/refund`

### Android-Only Endpoints (in DollorApiService.kt, not in iOS)

| Path | Purpose |
|------|---------|
| `POST auth/driver/demo-login` | Driver demo login |
| `POST auth/driver/google` | Driver Google auth (iOS doesn't have this) |
| `POST customer/demo-login` | Customer demo login |
| `POST auth/vendor/demo-login` | Vendor demo login |
| `GET drivers/{driverId}/balance` | Driver balance |
| `POST drivers/{driverId}/bank-account` | Link bank account |
| `POST drivers/{driverId}/payouts` | Request payout |
| `POST drivers/{driverId}/status` | Update driver status (iOS uses ERP path) |
| `GET drivers/{driverId}/status` | Get driver status |
| `POST driver/location` | Driver location (iOS uses `auth/driver/location`) |
| `GET erp/driver/{driverId}/deliveries` | My deliveries |
| `GET erp/orders/driver/{driverId}/pending` | Pending delivery orders |
| `GET erp/payouts/vendor/{vendorId}` | Vendor payouts |
| `POST vendors/{vendorId}/bank-account` | Vendor bank account |
| `GET vendors/{vendorId}/reviews` | Vendor reviews |
| `GET legal/tos` | Terms of service |
| `GET legal/privacy-policy` | Privacy policy |
| `GET tax/calculate` | Tax calculation |
| `GET tax/estimate/{state}` | Tax estimate |
| `POST notifications/register-token` | FCM push token (different path than iOS) |
| `POST erp/orders/{orderId}/start-delivery-decision` | Delivery decision flow |
| `POST erp/orders/{orderId}/restaurant-delivery-decision` | Delivery decision |
| `GET erp/orders/{orderId}/delivery-decision-status` | Delivery decision status |

### Android CustomerRideshareApiService (OkHttp-based, ~20 unique paths)

These overlap with DollorApiService.kt rideshare section and iOS rideshare paths. Notable unique ones:
- `GET /api/rides/request/{id}/bids` (get bids for ride)
- `POST /api/rides/bid/{bidId}/respond` (accept/reject/counter)
- `GET /api/rides/request/{id}/receipt`, `POST /api/rides/request/{id}/email-receipt`
- `POST /api/rides/dispute`, `GET /api/rides/customer/{id}/disputes`
- `GET/POST /api/rides/customer/{id}/recurring-rides`, `DELETE /api/rides/recurring-rides/{id}`
- `GET /api/erp/rides/{id}/negotiation-status`

### Gap Summary

| Category | Current Tests | Real iOS Paths | Real Android Paths | Coverage |
|----------|--------------|---------------|-------------------|----------|
| Auth endpoints | 4 (wrong paths) | 24 | 28 | ~0% correct |
| Customer orders | 1 (wrong path) | 13 | 13 | ~0% |
| Addresses | 0 | 6 | 6 | 0% |
| Favorites | 0 | 4 | 4 | 0% |
| Payment cards | 0 | 4 | 4 | 0% |
| Cart | 0 | 5 | 5 | 0% |
| Rideshare | 0 | 28 | 30 | 0% |
| Driver deliveries | 0 | 10 | 12 | 0% |
| Driver earnings/payouts | 0 | 7 | 10 | 0% |
| Vendor menu | 1 (partial) | 7 | 7 | ~5% |
| Vendor orders | 1 (wrong path) | 8 | 8 | ~0% |
| Vendor profile | 0 | 3 | 5 | 0% |
| Vendor documents | 0 | 3 | 3 | 0% |
| Vendor promotions | 0 | 10 | 8 | 0% |
| Vendor KOT/analytics | 0 | 5 | 2 | 0% |
| Push notifications | 1 (wrong path) | 3 | 1 | 0% |
| Shared/public | 1 (wrong path) | 4 | 4 | 0% |
| **TOTAL** | **~15 paths** | **~120 unique** | **~141 unique** | **<10%** |

## Standard Stack

### Core
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| pytest | 8.3.4 | Test runner | Matches requirements.txt |
| httpx | 0.27.2 | FastAPI TestClient backend | CI installs from requirements.txt |
| fastapi | 0.115.0 | Web framework (TestClient) | CI uses this version |
| sqlalchemy | 2.0.36 | ORM / test DB | Matches |
| pytest-asyncio | 0.25.0 | Async test support | In requirements.txt |

### Test Infrastructure
| Component | Location | Purpose |
|-----------|----------|---------|
| conftest.py | `tests/conftest.py` | Shared fixtures: client, auth_headers, factories |
| TestClient | FastAPI built-in | HTTP client for testing without server |
| SQLite in-memory | conftest.py:44 | Test DB for unit/integration tests |
| PostgreSQL service | integration-tests.yml | CI test DB for integration tests |

## Architecture Patterns

### Recommended Contract Test Structure

The contract test file should be reorganized by **app role** (matching how real apps call the API):

```
tests/integration/test_ios_api_contracts.py   -- rewrite with all endpoints
tests/integration/test_android_api_contracts.py  -- optional, Android-specific paths
```

Or a single comprehensive file organized by domain:

```python
class TestPublicEndpoints:           # No auth needed (~15 paths)
class TestCustomerAuthContracts:     # Customer auth + profile (~9 paths)
class TestCustomerOrderContracts:    # Orders, tracking, rating (~13 paths)
class TestCustomerAddressContracts:  # Addresses (~6 paths)
class TestCustomerFavoriteContracts: # Favorites (~4 paths)
class TestCustomerCardContracts:     # Payment cards (~4 paths)
class TestCustomerCartContracts:     # Cart (~5 paths)
class TestRideshareContracts:        # Rideshare (~28 paths)
class TestDriverAuthContracts:       # Driver auth (~7 paths)
class TestDriverDeliveryContracts:   # Driver deliveries (~10 paths)
class TestDriverEarningsContracts:   # Earnings, payouts, Stripe (~7 paths)
class TestVendorAuthContracts:       # Vendor auth (~8 paths)
class TestVendorMenuContracts:       # Menu management (~7 paths)
class TestVendorOrderContracts:      # Vendor orders, accept/decline (~8 paths)
class TestVendorDocumentContracts:   # Documents (~3 paths)
class TestVendorPromotionContracts:  # Promotions (~10 paths)
class TestVendorKOTContracts:        # KOT, analytics (~5 paths)
class TestSharedEndpointContracts:   # FCM, tracking (~9 paths)
```

### Auth Fixture Pattern (from conftest.py)

```python
# Available fixtures (conftest.py):
auth_headers         # User JWT: {"sub": user.email}
admin_auth_headers   # Admin JWT: {"sub": admin.email}
vendor_auth_headers  # Vendor JWT: {"sub": vendor.email, "vendor_id": vendor.id}
driver_auth_headers  # Driver JWT: {"sub": driver.email, "driver_id": driver.id}

# MISSING -- need to add:
customer_auth_headers  # Customer JWT: {"sub": customer.email, "customer_id": customer.id}
test_customer          # Customer ORM object
```

### Contract Test Design Pattern

Each test should verify:
1. **Endpoint exists** (not 404/405)
2. **Auth required or not** (401 without auth, 200/422/etc with auth)
3. **HTTP method accepted** (GET/POST/PUT/DELETE/PATCH)
4. **Basic response structure** (has expected fields)

```python
# Pattern for authenticated endpoint:
def test_customer_orders(self, client, customer_auth_headers):
    response = client.get("/api/customer/orders", headers=customer_auth_headers)
    assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"

# Pattern for public endpoint:
def test_vendors_published(self, client):
    response = client.get("/api/vendors/published")
    assert response.status_code == 200

# Pattern for endpoint existence check:
def test_ride_request_exists(self, client, customer_auth_headers):
    response = client.post("/api/rides/request", json={}, headers=customer_auth_headers)
    # 422 (validation error) means endpoint exists and accepts POST
    assert response.status_code in [200, 201, 400, 422], f"Endpoint missing: {response.status_code}"
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth tokens for tests | Manual JWT per test | conftest.py fixtures + new `customer_auth_headers` | Consistent, DRY |
| Endpoint path list | Manual enumeration | Extract from iOS/Android source (grep) | Single source of truth |
| Full response validation | Assert every field | Assert endpoint exists + basic structure | Contract tests, not unit tests |
| Test DB setup | Custom per-test DB | conftest.py `test_db` + `db_session` fixtures | Already handles SQLite/PostgreSQL |

## Common Pitfalls

### Pitfall 1: Auth Middleware Intercepts Before Route Matching
**What goes wrong:** Tests expecting 404 for missing endpoints get 401 from auth middleware.
**Why it happens:** `require_auth_middleware` at `main_new.py:367` runs before FastAPI route matching.
**How to avoid:** For public endpoints, test without auth. For protected endpoints, always pass auth headers. For "does endpoint exist" tests, always send auth headers and accept 200/400/422.
**Confidence:** HIGH

### Pitfall 2: database.py Defaults ENVIRONMENT to "production"
**What goes wrong:** CI PostgreSQL doesn't support SSL, but database.py adds `sslmode=require`.
**Why it happens:** `database.py:18`: `_is_prod = os.getenv("ENVIRONMENT", "production").lower() in ("production", "prod")`
**How to avoid:** Set `ENVIRONMENT=testing` in CI workflow env, OR change default to empty string.
**Confidence:** HIGH

### Pitfall 3: Missing customer_auth_headers Fixture
**What goes wrong:** Customer-specific endpoints need a JWT with `customer_id` claim, but conftest.py only has `auth_headers` (generic user).
**Why it happens:** `require_customer` in `auth_utils.py` looks for `customer_id` in JWT payload.
**How to avoid:** Add `test_customer` and `customer_auth_headers` fixtures to conftest.py.
**Confidence:** HIGH

### Pitfall 4: iOS Uses Different URL Patterns Than Android
**What goes wrong:** Contract tests pass for one platform but not the other.
**Why it happens:** iOS calls `customer/apple-auth`, Android calls `auth/customer/apple-auth` -- backend has route aliases for both.
**How to avoid:** Test the canonical backend paths. Both platforms' paths should work via aliases.
**Confidence:** HIGH

### Pitfall 5: Tests Must Not Test Business Logic
**What goes wrong:** Contract tests become brittle when business logic changes.
**Why it happens:** Over-asserting on response body content instead of structure.
**How to avoid:** Assert endpoint existence, auth requirement, and response shape -- not specific values.
**Confidence:** HIGH

### Pitfall 6: vendor_auth_headers May Not Work for Vendor Endpoints
**What goes wrong:** Vendor endpoints may require additional data (e.g., vendor record with specific status).
**Why it happens:** `require_vendor` in `auth_utils.py` looks up vendor by `vendor_id` from JWT.
**How to avoid:** Use `test_vendor` fixture which creates a vendor with `APPROVED` status, and `vendor_auth_headers` which includes `vendor_id` in the JWT.
**Confidence:** HIGH

## CI Workflow Fixes Needed

### integration-tests.yml Issues

1. **Missing ENVIRONMENT=testing** in `api-contract-tests` job (line 67-71 has env but no ENVIRONMENT)
2. **Missing ENVIRONMENT=testing** in `backend-api-tests` job (line 134-137)
3. **Missing ENVIRONMENT=testing** in `e2e-critical-flows` job (line 270-274)
4. **Missing ENVIRONMENT=testing** in `frontend-integration-tests` backend start (line 196-199)
5. **Missing JWT_SECRET_KEY** in `api-contract-tests` job `Run API Contract Tests` step (line 82-84 has API_BASE_URL and DATABASE_URL but not JWT_SECRET_KEY or TESTING)
6. All jobs use `|| echo "... completed"` which masks failures -- consider removing for actual failure detection

### deploy-dollar-ai.yml Status

Already GREEN. Only runs `pytest tests/unit/ -v --tb=short`. No changes needed unless we want to add contract tests to the deploy gate (not recommended initially).

## Code Examples

### Fix 1: Add customer fixtures to conftest.py

```python
# Add to conftest.py after test_driver fixture:

@pytest.fixture(scope="function")
def test_customer(db_session) -> Customer:
    """Create a test customer"""
    customer = Customer(
        email=f"customer_{datetime.now().timestamp()}@test.com",
        password_hash=get_password_hash("CustomerPassword123!"),
        name="Test Customer",
        phone="+14155551234",
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

### Fix 2: Contract test pattern for public endpoints

```python
class TestPublicEndpointContracts:
    """Test endpoints that should be accessible without authentication"""

    def test_vendors_published(self, client):
        """GET /api/vendors/published -- Customer browsing restaurants"""
        response = client.get("/api/vendors/published")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_restaurant_detail(self, client):
        """GET /api/public/restaurants/{id} -- Restaurant detail"""
        response = client.get("/api/public/restaurants/1")
        assert response.status_code in [200, 404]

    def test_promotions_active(self, client):
        """GET /api/promotions/active -- Active promotions"""
        response = client.get("/api/promotions/active")
        assert response.status_code in [200, 404]

    def test_promotions_featured(self, client):
        """GET /api/promotions/featured -- Featured deals"""
        response = client.get("/api/promotions/featured")
        assert response.status_code in [200, 404]

    def test_ride_estimate(self, client):
        """POST /api/rides/estimate -- Fare estimate (public)"""
        response = client.post("/api/rides/estimate", json={
            "pickup_latitude": 37.7749,
            "pickup_longitude": -122.4194,
            "dropoff_latitude": 37.7849,
            "dropoff_longitude": -122.4094,
            "ride_type": "standard"
        })
        assert response.status_code in [200, 422]

    def test_vendor_menu_public(self, client, test_vendor):
        """GET /api/vendors/{id}/menu -- Public menu view"""
        response = client.get(f"/api/vendors/{test_vendor.id}/menu")
        assert response.status_code in [200, 404]
```

### Fix 3: Contract test pattern for authenticated endpoints

```python
class TestCustomerOrderContracts:
    """Test customer order endpoints"""

    def test_customer_orders_requires_auth(self, client):
        """GET /api/customer/orders -- must return 401 without auth"""
        response = client.get("/api/customer/orders")
        assert response.status_code == 401

    def test_customer_orders_with_auth(self, client, customer_auth_headers):
        """GET /api/customer/orders -- returns orders list with auth"""
        response = client.get("/api/customer/orders", headers=customer_auth_headers)
        assert response.status_code in [200, 404]

    def test_create_order_accepts_format(self, client, customer_auth_headers):
        """POST /api/erp/orders/create -- accepts iOS/Android order format"""
        response = client.post("/api/erp/orders/create", json={
            "vendor_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}],
            "delivery_address": "123 Test St"
        }, headers=customer_auth_headers)
        assert response.status_code in [200, 201, 400, 422]

    def test_order_tracking(self, client, customer_auth_headers):
        """GET /api/customer/orders/{id}/track -- order tracking"""
        response = client.get("/api/customer/orders/1/track", headers=customer_auth_headers)
        assert response.status_code in [200, 404]
```

### Fix 4: CI workflow ENVIRONMENT fix

```yaml
# integration-tests.yml -- add to ALL job env blocks:
env:
  DATABASE_URL: postgresql://test:test@localhost:5432/testdb
  JWT_SECRET_KEY: test-secret-key-for-ci
  TESTING: "true"
  ENVIRONMENT: "testing"  # Prevents SSL requirement in database.py
```

### Fix 5: database.py default fix

```python
# database.py line 18 -- change default from "production" to empty string:
# BEFORE:
_is_prod = os.getenv("ENVIRONMENT", "production").lower() in ("production", "prod")

# AFTER:
_is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
```

## State of the Art

| Old State | Current State | When Changed | Impact |
|-----------|--------------|--------------|--------|
| No auth middleware | Global auth middleware + per-endpoint Depends() | v1.1 Phase 02 (Feb 2026) | All contract tests need auth headers |
| 15 contract test paths | 15 contract test paths (unchanged) | Original creation | Tests haven't been updated since auth hardening |
| Apps called ~50 endpoints | iOS: ~120, Android: ~141 endpoints | Ongoing app development | Massive gap between tested and actual |
| `test_vendor_endpoints.py` 112 errors | Rewritten, 33/33 pass | v1.1 Phase 01 | Resolved |
| CI deploy gate: unit tests only | Still unit tests only | Unchanged | Deploy CI is green |

## Previous Research Findings (Still Valid)

From the Feb 20 research, the following **still apply**:

### 18 Integration Test Failures (3 root causes)

| Category | Count | Root Cause | Fix |
|----------|-------|-----------|-----|
| Auth middleware (401s) | 10 | Phase 02 auth hardening | Add auth headers to tests |
| Missing SQLite tables | 7 | Model imports not triggered before `create_all` | Import `models_extended.py` in conftest |
| Document count mismatch | 1 | Backend document_type collision | Debug document upload logic |

### CI Workflow Issues

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| SSL error in CI PostgreSQL | `database.py` defaults ENVIRONMENT to "production" | Set `ENVIRONMENT=testing` or change default |
| Missing env vars in test steps | Some CI steps lack `JWT_SECRET_KEY` or `TESTING` | Add to all relevant `env:` blocks |

## Scope Recommendation

**Plan 1: Rewrite contract tests + fix conftest**
- Add `test_customer` and `customer_auth_headers` fixtures to conftest.py
- Import `models_extended.py` in conftest to fix missing table errors
- Rewrite `test_ios_api_contracts.py` with all ~160 endpoint paths organized by role
- Each test verifies: endpoint exists, correct auth requirement, basic response structure
- Expected: ~100-150 individual test methods covering all app-called endpoints

**Plan 2: Fix CI workflow + database.py**
- Fix `database.py` ENVIRONMENT default (empty string instead of "production")
- Add `ENVIRONMENT=testing` to all integration-tests.yml job env blocks
- Add missing `JWT_SECRET_KEY` and `TESTING` to all CI steps
- Remove `|| echo "completed"` to surface real failures
- Verify all tests pass in CI

## Open Questions

1. **Should we split iOS vs Android contract tests?**
   - Most endpoints overlap. Android has ~20 extra endpoints (demo-login, tax, legal, balance).
   - Recommendation: Single file with all endpoints. Add comments noting which platform(s) call each path.

2. **Should contract tests go in the deploy gate?**
   - Currently deploy only runs `tests/unit/`. Adding contract tests would slow deploys.
   - Recommendation: Keep contract tests in integration-tests.yml for now. Consider adding to deploy gate after they're stable.

3. **Document type collision (test_android_restaurant_e2e_workflow)**
   - 5 documents uploaded, only 4 returned. `business_license` stored as `w9_form`.
   - May be a real backend bug. Separate from contract test scope.
   - Recommendation: Note as known issue, don't block on it.

4. **iOS endpoint `erp/orders/pending-restaurant-delivery` does NOT exist in backend**
   - iOS calls `AppConfig.shared.p2pAPIBaseURL + "/api/erp/orders/pending-restaurant-delivery"`
   - No backend route found. This is a dead endpoint in iOS code.
   - Recommendation: Do NOT add to contract tests. Flag as iOS dead code.

## Sources

### Primary (HIGH confidence)
- iOS source: `P2PAPIService.swift` -- all URL patterns extracted via grep
- Android source: `DollorApiService.kt` -- all Retrofit annotations extracted
- Android source: `CustomerRideshareApiService.kt` -- all OkHttp URL patterns extracted
- Backend test: `tests/integration/test_ios_api_contracts.py` -- current state (19 tests)
- Backend test: `tests/conftest.py` -- fixture definitions
- CI workflow: `.github/workflows/integration-tests.yml` -- full definition
- CI workflow: `.github/workflows/deploy-dollar-ai.yml` -- deploy gate
- Backend source: `database.py:18` -- ENVIRONMENT default behavior
- Backend source: `auth_utils.py` -- require_customer/driver/vendor/admin functions

### Secondary (MEDIUM confidence)
- Previous research: `04-RESEARCH.md` from 2026-02-20 (CI failure analysis)
- Error pattern analysis from previous test runs

## Metadata

**Confidence breakdown:**
- Endpoint gap analysis: HIGH -- extracted directly from iOS/Android/backend source code
- Auth middleware impact: HIGH -- verified from source code and previous test runs
- CI workflow fixes: HIGH -- verified from workflow YAML and previous CI run logs
- Contract test structure: HIGH -- based on existing conftest.py patterns and FastAPI TestClient docs
- database.py fix: HIGH -- line 18 verified, root cause confirmed

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- test infrastructure doesn't change rapidly)
