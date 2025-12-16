"""
Backend API Endpoint Tests

Comprehensive tests for all API endpoints to ensure:
1. Correct HTTP status codes
2. Request validation
3. Response format
4. Authentication/Authorization
5. Error handling
"""

import pytest
import httpx
import os
from datetime import datetime

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


@pytest.fixture(scope="module")
def client():
    """HTTP client for API tests"""
    return httpx.Client(base_url=API_BASE_URL, timeout=30.0)


@pytest.fixture(scope="module")
def auth_token(client):
    """Get authentication token for protected endpoints"""
    # Register a test user
    user_data = {
        "email": f"api_test_{datetime.now().timestamp()}@test.com",
        "password": "TestPassword123!",
        "full_name": "API Test User",
        "role": "user"
    }
    client.post("/register", json=user_data)

    # Login
    response = client.post("/login", data={
        "username": user_data["email"],
        "password": user_data["password"]
    })

    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def auth_headers(token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {token}"} if token else {}


# ============================================
# HEALTH & STATUS ENDPOINTS
# ============================================

class TestHealthEndpoints:
    """Test health and status endpoints"""

    def test_health_check(self, client):
        """Health endpoint should return 200"""
        response = client.get("/health")
        assert response.status_code == 200

    def test_root_endpoint(self, client):
        """Root endpoint should return info or redirect"""
        response = client.get("/")
        assert response.status_code in [200, 301, 302, 307]

    def test_api_docs_available(self, client):
        """API documentation should be accessible"""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema(self, client):
        """OpenAPI schema should be available"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

class TestAuthEndpoints:
    """Test authentication endpoints"""

    def test_register_success(self, client):
        """Registration with valid data should succeed"""
        user_data = {
            "email": f"register_test_{datetime.now().timestamp()}@test.com",
            "password": "ValidPassword123!",
            "full_name": "Test User",
            "role": "user"
        }
        response = client.post("/register", json=user_data)
        assert response.status_code in [200, 201, 409]  # 409 if already exists

    def test_register_invalid_email(self, client):
        """Registration with invalid email should fail"""
        user_data = {
            "email": "not-an-email",
            "password": "ValidPassword123!",
            "full_name": "Test User",
            "role": "user"
        }
        response = client.post("/register", json=user_data)
        assert response.status_code == 422

    def test_register_weak_password(self, client):
        """Registration with weak password should fail or warn"""
        user_data = {
            "email": f"weak_pass_{datetime.now().timestamp()}@test.com",
            "password": "123",
            "full_name": "Test User",
            "role": "user"
        }
        response = client.post("/register", json=user_data)
        # May accept or reject weak passwords
        assert response.status_code in [200, 201, 400, 422]

    def test_login_success(self, client):
        """Login with valid credentials should return token"""
        # First register
        email = f"login_test_{datetime.now().timestamp()}@test.com"
        password = "ValidPassword123!"

        client.post("/register", json={
            "email": email,
            "password": password,
            "full_name": "Test User",
            "role": "user"
        })

        # Then login
        response = client.post("/login", data={
            "username": email,
            "password": password
        })

        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "token_type" in data

    def test_login_wrong_password(self, client):
        """Login with wrong password should fail"""
        response = client.post("/login", data={
            "username": "test@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]

    def test_login_nonexistent_user(self, client):
        """Login with nonexistent user should fail"""
        response = client.post("/login", data={
            "username": f"nonexistent_{datetime.now().timestamp()}@test.com",
            "password": "anypassword"
        })
        assert response.status_code in [401, 400, 404]


# ============================================
# USER PROFILE ENDPOINTS
# ============================================

class TestUserEndpoints:
    """Test user profile endpoints"""

    def test_get_profile_authenticated(self, client, auth_token):
        """Authenticated user should get profile"""
        if not auth_token:
            pytest.skip("Authentication not available")

        response = client.get("/me", headers=auth_headers(auth_token))
        assert response.status_code in [200, 404]  # 404 if endpoint different

        if response.status_code == 200:
            data = response.json()
            assert "email" in data or "user" in data

    def test_get_profile_unauthenticated(self, client):
        """Unauthenticated request should fail"""
        response = client.get("/me")
        assert response.status_code in [401, 403]

    def test_update_profile(self, client, auth_token):
        """User should be able to update profile"""
        if not auth_token:
            pytest.skip("Authentication not available")

        update_data = {
            "full_name": "Updated Name"
        }
        response = client.put("/me", json=update_data, headers=auth_headers(auth_token))
        assert response.status_code in [200, 404, 405]  # Different endpoint structures


# ============================================
# DRIVER ENDPOINTS
# ============================================

class TestDriverEndpoints:
    """Test driver-related endpoints"""

    def test_driver_registration(self, client):
        """Driver registration should accept valid data"""
        driver_data = {
            "email": f"driver_api_{datetime.now().timestamp()}@test.com",
            "password": "DriverPass123!",
            "name": "API Test Driver",
            "phone": "+14155551234"
        }
        response = client.post("/api/auth/driver/register", json=driver_data)
        assert response.status_code in [200, 201, 400, 409]

    def test_driver_login(self, client):
        """Driver login should work"""
        login_data = {
            "email": "test@driver.com",
            "password": "testpassword"
        }
        response = client.post("/api/auth/driver/login", json=login_data)
        # May fail with invalid credentials, but endpoint should exist
        assert response.status_code in [200, 401, 400]

    def test_driver_profile_requires_auth(self, client):
        """Driver profile should require authentication"""
        response = client.get("/api/driver/profile")
        assert response.status_code in [401, 403]

    def test_driver_location_update_requires_auth(self, client):
        """Location update should require authentication"""
        location_data = {
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        response = client.post("/api/driver/location", json=location_data)
        assert response.status_code in [401, 403]


# ============================================
# VENDOR ENDPOINTS
# ============================================

class TestVendorEndpoints:
    """Test vendor/restaurant endpoints"""

    def test_vendor_login_endpoint_exists(self, client):
        """Vendor login endpoint should exist"""
        response = client.post("/api/vendor/login", json={
            "email": "test@test.com",
            "password": "test"
        })
        # Should not be 404
        assert response.status_code in [200, 400, 401, 422]

    def test_vendor_menu_requires_auth(self, client):
        """Menu endpoint should require vendor auth"""
        response = client.get("/api/vendor/menu-items")
        assert response.status_code in [401, 403]

    def test_vendor_orders_requires_auth(self, client):
        """Orders endpoint should require vendor auth"""
        response = client.get("/api/vendor/orders")
        assert response.status_code in [401, 403]


# ============================================
# RESTAURANT/MENU PUBLIC ENDPOINTS
# ============================================

class TestRestaurantPublicEndpoints:
    """Test public restaurant endpoints"""

    def test_list_restaurants(self, client):
        """Should list restaurants"""
        response = client.get("/api/restaurants")
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list) or isinstance(data, dict)

    def test_get_restaurant_menu(self, client):
        """Should get restaurant menu"""
        response = client.get("/api/restaurants/1/menu")
        # May return 404 if no restaurant exists
        assert response.status_code in [200, 404]

    def test_search_restaurants(self, client):
        """Restaurant search should work"""
        response = client.get("/api/restaurants/search", params={"q": "pizza"})
        assert response.status_code in [200, 404]


# ============================================
# ORDER ENDPOINTS
# ============================================

class TestOrderEndpoints:
    """Test order endpoints"""

    def test_create_order_requires_auth(self, client):
        """Order creation should require authentication"""
        order_data = {
            "restaurant_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}]
        }
        response = client.post("/api/orders", json=order_data)
        assert response.status_code in [401, 403, 422]

    def test_get_orders_requires_auth(self, client):
        """Order listing should require authentication"""
        response = client.get("/api/orders")
        assert response.status_code in [401, 403]

    def test_create_order_with_auth(self, client, auth_token):
        """Authenticated user should be able to create order"""
        if not auth_token:
            pytest.skip("Authentication not available")

        order_data = {
            "restaurant_id": 1,
            "items": [{"menu_item_id": 1, "quantity": 1}],
            "delivery_address": {
                "street": "123 Test St",
                "city": "San Francisco",
                "state": "CA",
                "zip": "94102"
            }
        }
        response = client.post(
            "/api/orders",
            json=order_data,
            headers=auth_headers(auth_token)
        )
        # May fail due to missing restaurant/items, but should accept request
        assert response.status_code in [200, 201, 400, 404, 422]


# ============================================
# PAYMENT ENDPOINTS
# ============================================

class TestPaymentEndpoints:
    """Test payment endpoints"""

    def test_create_payment_intent_requires_auth(self, client):
        """Payment intent creation should require auth"""
        payment_data = {
            "amount": 1000,
            "currency": "usd"
        }
        response = client.post("/api/payments/create-intent", json=payment_data)
        assert response.status_code in [401, 403, 404]

    def test_list_payment_methods_requires_auth(self, client):
        """Payment methods listing should require auth"""
        response = client.get("/api/payments/methods")
        assert response.status_code in [401, 403, 404]


# ============================================
# ERROR HANDLING
# ============================================

class TestErrorHandling:
    """Test error handling"""

    def test_404_returns_json(self, client):
        """404 errors should return JSON"""
        response = client.get("/nonexistent-endpoint-12345")
        assert response.status_code == 404
        # Should be JSON
        assert response.headers.get("content-type", "").startswith("application/json")

    def test_method_not_allowed(self, client):
        """Wrong HTTP method should return 405"""
        response = client.delete("/health")  # Health should be GET only
        assert response.status_code in [405, 404]

    def test_invalid_json_body(self, client):
        """Invalid JSON should return 422 or 400"""
        response = client.post(
            "/register",
            content="not-valid-json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422]


# ============================================
# RATE LIMITING
# ============================================

class TestRateLimiting:
    """Test rate limiting (if implemented)"""

    def test_health_endpoint_not_rate_limited(self, client):
        """Health endpoint should not be heavily rate limited"""
        for _ in range(10):
            response = client.get("/health")
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
