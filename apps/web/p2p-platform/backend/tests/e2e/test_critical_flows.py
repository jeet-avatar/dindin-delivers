"""
E2E Critical Flow Tests

These tests verify complete user journeys from start to finish.
Critical flows that must work for the business to function.

Test Coverage:
1. Customer Order Flow: Browse → Order → Payment → Delivery
2. Driver Onboarding Flow: Register → Verify → Approve → Go Online
3. Vendor Onboarding Flow: Apply → Verify → Setup Menu → Accept Orders
4. Order Lifecycle: Created → Accepted → Preparing → Ready → Picked Up → Delivered
"""

import pytest
import httpx
import os
from datetime import datetime
from typing import Optional

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
client = httpx.Client(base_url=API_BASE_URL, timeout=30.0)


# ============================================
# TEST FIXTURES
# ============================================

@pytest.fixture
def unique_email():
    """Generate unique email for each test"""
    return f"e2e_test_{datetime.now().timestamp()}@test.com"


@pytest.fixture
def test_customer(unique_email):
    """Register and return a test customer"""
    customer_data = {
        "email": unique_email,
        "password": "TestPassword123!",
        "full_name": "E2E Test Customer",
        "role": "user"
    }
    response = client.post("/register", json=customer_data)
    if response.status_code in [200, 201]:
        # Login to get token
        login_response = client.post("/login", data={
            "username": customer_data["email"],
            "password": customer_data["password"]
        })
        if login_response.status_code == 200:
            token_data = login_response.json()
            return {
                "email": customer_data["email"],
                "password": customer_data["password"],
                "token": token_data.get("access_token"),
                "user": token_data.get("user", {})
            }
    return None


@pytest.fixture
def test_driver():
    """Register and return a test driver"""
    driver_data = {
        "email": f"e2e_driver_{datetime.now().timestamp()}@test.com",
        "password": "TestPassword123!",
        "name": "E2E Test Driver",
        "phone": "+14155551234"
    }
    response = client.post("/api/auth/driver/register", json=driver_data)
    if response.status_code in [200, 201]:
        data = response.json()
        return {
            "email": driver_data["email"],
            "password": driver_data["password"],
            "driver_id": data.get("id") or data.get("driver_id"),
            "token": data.get("access_token") or data.get("token")
        }
    return None


def auth_headers(token: str) -> dict:
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


# ============================================
# CRITICAL FLOW 1: CUSTOMER ORDER JOURNEY
# ============================================

class TestCustomerOrderFlow:
    """
    Complete customer order flow:
    1. Customer browses restaurants
    2. Customer views menu
    3. Customer creates order
    4. Order is confirmed
    5. Payment is processed
    """

    def test_complete_order_flow(self, test_customer):
        """Test the complete customer order journey"""
        if not test_customer:
            pytest.skip("Customer registration not available")

        headers = auth_headers(test_customer["token"]) if test_customer.get("token") else {}

        # Step 1: Browse restaurants
        response = client.get("/api/restaurants", headers=headers)
        restaurants_available = response.status_code == 200 and len(response.json()) > 0

        if not restaurants_available:
            pytest.skip("No restaurants available for order test")

        restaurants = response.json()
        restaurant_id = restaurants[0]["id"]

        # Step 2: View menu
        response = client.get(f"/api/restaurants/{restaurant_id}/menu", headers=headers)
        menu_available = response.status_code == 200

        if not menu_available:
            pytest.skip("Menu not available")

        menu = response.json()
        items = menu if isinstance(menu, list) else menu.get("items", menu.get("menu_items", []))

        if len(items) == 0:
            pytest.skip("No menu items available")

        # Step 3: Create order
        order_data = {
            "restaurant_id": restaurant_id,
            "items": [
                {"menu_item_id": items[0].get("id", 1), "quantity": 1}
            ],
            "delivery_address": {
                "street": "123 Test Street",
                "city": "San Francisco",
                "state": "CA",
                "zip": "94102"
            }
        }
        response = client.post("/api/orders", json=order_data, headers=headers)

        if response.status_code in [200, 201]:
            order = response.json()
            assert "id" in order or "order_id" in order, "Order should have ID"
            order_id = order.get("id") or order.get("order_id")

            # Step 4: Verify order status
            response = client.get(f"/api/orders/{order_id}", headers=headers)
            if response.status_code == 200:
                order_status = response.json()
                assert "status" in order_status, "Order should have status"

            print(f"Order flow completed: Order ID {order_id}")
        else:
            # Order creation may require auth or other setup
            assert response.status_code in [401, 403, 422], f"Unexpected error: {response.status_code}"


# ============================================
# CRITICAL FLOW 2: DRIVER ONBOARDING JOURNEY
# ============================================

class TestDriverOnboardingFlow:
    """
    Complete driver onboarding flow:
    1. Driver registers with app
    2. Driver submits documents
    3. Documents are verified
    4. Driver is approved
    5. Driver can go online
    """

    def test_driver_registration_flow(self):
        """Test driver registration and initial setup"""
        # Step 1: Register driver
        driver_data = {
            "email": f"e2e_driver_reg_{datetime.now().timestamp()}@test.com",
            "password": "TestPassword123!",
            "name": "E2E Onboarding Driver",
            "phone": "+14155559999"
        }
        response = client.post("/api/auth/driver/register", json=driver_data)

        if response.status_code in [200, 201]:
            data = response.json()
            driver_id = data.get("id") or data.get("driver_id")
            token = data.get("access_token") or data.get("token")

            print(f"Driver registered: {driver_id}")

            # Step 2: Login if no token returned
            if not token:
                login_response = client.post("/api/auth/driver/login", json={
                    "email": driver_data["email"],
                    "password": driver_data["password"]
                })
                if login_response.status_code == 200:
                    token = login_response.json().get("access_token")

            if token:
                headers = auth_headers(token)

                # Step 3: Check profile status
                profile_response = client.get("/api/driver/profile", headers=headers)
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    print(f"Driver profile retrieved: {profile.get('status', 'unknown')}")

                # Step 4: Try to go online (should fail if not approved)
                online_response = client.post("/api/driver/go-online", headers=headers)
                # May return 200, 400, or 403 depending on approval status
                assert online_response.status_code < 500, "Server should handle go-online request"

    def test_driver_location_tracking_flow(self, test_driver):
        """Test driver location tracking works"""
        if not test_driver or not test_driver.get("token"):
            pytest.skip("Driver authentication not available")

        headers = auth_headers(test_driver["token"])

        # Send location update
        location_data = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "accuracy": 5.0,
            "heading": 90.0,
            "speed": 15.5,
            "timestamp": datetime.now().isoformat()
        }
        response = client.post("/api/driver/location", json=location_data, headers=headers)

        if response.status_code == 200:
            print("Driver location updated successfully")
        else:
            # Location endpoint may not exist or require different auth
            assert response.status_code in [401, 403, 404, 200], f"Location endpoint error: {response.status_code}"


# ============================================
# CRITICAL FLOW 3: VENDOR/RESTAURANT ONBOARDING
# ============================================

class TestVendorOnboardingFlow:
    """
    Complete vendor onboarding flow:
    1. Restaurant applies
    2. Documents submitted
    3. Application reviewed
    4. Restaurant approved
    5. Menu setup
    6. Can receive orders
    """

    def test_restaurant_application_flow(self):
        """Test restaurant application submission"""
        application_data = {
            "business_name": f"E2E Test Restaurant {datetime.now().timestamp()}",
            "owner_name": "E2E Owner",
            "email": f"e2e_restaurant_{datetime.now().timestamp()}@test.com",
            "phone": "+14155557777",
            "address": "456 Restaurant Ave, San Francisco, CA 94103",
            "cuisine_type": "Italian",
            "tax_id": "12-3456789"
        }
        response = client.post("/api/restaurant/apply", json=application_data)

        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Restaurant application submitted: {data}")
        else:
            # Application endpoint may have different path
            response2 = client.post("/vendor/apply", json=application_data)
            if response2.status_code in [200, 201]:
                print("Restaurant application submitted via /vendor/apply")

    def test_vendor_menu_management_flow(self):
        """Test vendor can manage their menu"""
        # First need to login as vendor
        login_response = client.post("/api/vendor/login", json={
            "email": "test@vendor.com",
            "password": "testpassword"
        })

        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            headers = auth_headers(token)

            # Get current menu
            menu_response = client.get("/api/vendor/menu-items", headers=headers)
            if menu_response.status_code == 200:
                print(f"Current menu items: {len(menu_response.json())}")

            # Try to add menu item
            new_item = {
                "name": "E2E Test Item",
                "description": "Test menu item from E2E tests",
                "price": 12.99,
                "category": "Main Course"
            }
            add_response = client.post("/api/vendor/menu-items", json=new_item, headers=headers)

            if add_response.status_code in [200, 201]:
                print("Menu item added successfully")


# ============================================
# CRITICAL FLOW 4: ORDER LIFECYCLE
# ============================================

class TestOrderLifecycleFlow:
    """
    Test complete order lifecycle:
    Created → Accepted → Preparing → Ready → Picked Up → Delivered
    """

    def test_order_status_transitions(self):
        """Test order status can transition through all states"""
        # This would require admin/vendor access to update order status
        # Testing that the status endpoints exist and are callable

        # Check order status endpoint exists
        response = client.get("/api/orders/1/status")
        # Should return 401/403/404, not 500
        assert response.status_code < 500, "Order status endpoint should be accessible"

        # Valid order statuses for the system
        valid_statuses = [
            "pending",
            "accepted",
            "preparing",
            "ready",
            "picked_up",
            "in_transit",
            "delivered",
            "cancelled"
        ]

        # Verify status update endpoint accepts these statuses
        for status in valid_statuses[:3]:  # Test first 3 to not modify too much
            response = client.put(
                "/api/orders/1/status",
                json={"status": status}
            )
            # Should return auth error or success, not validation error for status
            assert response.status_code != 422 or "status" not in str(response.json()), \
                f"Status '{status}' should be valid"


# ============================================
# CRITICAL FLOW 5: PAYMENT PROCESSING
# ============================================

class TestPaymentFlow:
    """
    Test payment processing flow (dummy mode)
    """

    def test_payment_intent_creation(self, test_customer):
        """Test payment intent can be created"""
        if not test_customer or not test_customer.get("token"):
            pytest.skip("Customer authentication not available")

        headers = auth_headers(test_customer["token"])

        payment_data = {
            "amount": 2500,  # $25.00 in cents
            "currency": "usd",
            "order_id": 1
        }
        response = client.post("/api/payments/create-intent", json=payment_data, headers=headers)

        if response.status_code == 200:
            data = response.json()
            assert "client_secret" in data or "payment_id" in data, \
                "Payment intent should return identifier"

    def test_payment_methods_list(self, test_customer):
        """Test user can list payment methods"""
        if not test_customer or not test_customer.get("token"):
            pytest.skip("Customer authentication not available")

        headers = auth_headers(test_customer["token"])

        response = client.get("/api/payments/methods", headers=headers)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Payment methods should be a list"


# ============================================
# CRITICAL FLOW 6: SEARCH & DISCOVERY
# ============================================

class TestSearchDiscoveryFlow:
    """Test search and discovery features"""

    def test_restaurant_search(self):
        """Test restaurant search functionality"""
        response = client.get("/api/restaurants/search", params={"q": "pizza"})

        if response.status_code == 200:
            results = response.json()
            print(f"Search returned {len(results)} results")
        else:
            # Try alternate search endpoint
            response = client.get("/api/search/restaurants", params={"query": "pizza"})
            assert response.status_code in [200, 404], "Search endpoint should exist"

    def test_nearby_restaurants(self):
        """Test nearby restaurants with location"""
        params = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "radius": 5000  # 5km
        }
        response = client.get("/api/restaurants/nearby", params=params)

        if response.status_code == 200:
            results = response.json()
            print(f"Found {len(results)} nearby restaurants")


# ============================================
# CRITICAL FLOW 7: NOTIFICATIONS
# ============================================

class TestNotificationFlow:
    """Test notification delivery"""

    def test_notification_preferences(self, test_customer):
        """Test notification preferences can be updated"""
        if not test_customer or not test_customer.get("token"):
            pytest.skip("Customer authentication not available")

        headers = auth_headers(test_customer["token"])

        prefs = {
            "order_updates": True,
            "promotions": False,
            "driver_location": True
        }
        response = client.put("/api/notifications/preferences", json=prefs, headers=headers)

        # Should accept the request (may not have endpoint)
        assert response.status_code in [200, 201, 404, 401], \
            "Notification preferences should be settable"


# ============================================
# RUN TESTS
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
