"""
Smoke tests for Wave 1+2 endpoints on staging and production.

Wave 1 (Quick-89): Payment safety - idempotency, refund, price change, vendor offline
Wave 2 (Quick-93,94,95,96): Driver-arrived, cancel-no-customer, address-unreachable,
                             reassign delivery, fare estimate

Run with:
    pytest tests/smoke/test_wave1_wave2_smoke.py --env=staging -v
    pytest tests/smoke/test_wave1_wave2_smoke.py --env=production -v
"""

import pytest
import requests

from .conftest import auth_header

TIMEOUT = 10
NONEXISTENT_ORDER_ID = 999999


# ===========================================================================
# Wave 1 Endpoints (Quick-89: Payment Safety)
# ===========================================================================

class TestWave1Endpoints:
    """Smoke tests for Wave 1 payment safety endpoints."""

    def test_refund_endpoint_exists(self, env_url, customer_token):
        """POST /api/erp/orders/{id}/refund - requires auth, 404 for nonexistent order."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/refund",
            headers=auth_header(customer_token),
            timeout=TIMEOUT,
        )
        # 404 = route exists, order not found; 400 = route exists, validation error
        assert resp.status_code in (404, 400), (
            f"Expected 404/400 for nonexistent order refund, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_refund_requires_auth(self, env_url):
        """POST /api/erp/orders/{id}/refund - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/refund",
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated refund, got {resp.status_code}"
        )

    def test_order_create_requires_auth(self, env_url):
        """POST /api/erp/orders/create - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/create",
            json={
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "customer_phone": "+15555550000",
                "vendor_id": 1,
                "items": [],
                "delivery_address": {},
            },
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated order create, got {resp.status_code}"
        )

    def test_order_create_with_auth(self, env_url, customer_token):
        """POST /api/erp/orders/create - route exists (may return 404/422 for bad data)."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/create",
            headers=auth_header(customer_token),
            json={
                "customer_name": "Smoke Test",
                "customer_email": "smoke@test.com",
                "customer_phone": "+15555550000",
                "vendor_id": NONEXISTENT_ORDER_ID,
                "items": [],
                "delivery_address": {"street": "123 Test St", "city": "NY", "state": "NY", "zip": "10001", "latitude": 40.7, "longitude": -74.0},
            },
            timeout=TIMEOUT,
        )
        # 404 = vendor not found (route works); 422 = validation error (route works)
        assert resp.status_code in (404, 422, 400), (
            f"Expected 404/422/400 for order create with bad vendor, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_vendor_online_status_requires_auth(self, env_url):
        """PUT /api/vendors/{id}/online-status - 401 without auth."""
        resp = requests.put(
            f"{env_url}/api/vendors/{NONEXISTENT_ORDER_ID}/online-status",
            params={"is_online": "true"},
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated vendor status, got {resp.status_code}"
        )


# ===========================================================================
# Wave 2 Endpoints (Quick-93,94,95,96)
# ===========================================================================

class TestWave2Endpoints:
    """Smoke tests for Wave 2 delivery/rideshare endpoints."""

    def test_driver_arrived_requires_auth(self, env_url):
        """POST /api/erp/orders/{id}/driver-arrived-at-delivery - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/driver-arrived-at-delivery",
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated driver-arrived, got {resp.status_code}"
        )

    def test_driver_arrived_with_auth(self, env_url, driver_token):
        """POST /api/erp/orders/{id}/driver-arrived-at-delivery - 404 for nonexistent order."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/driver-arrived-at-delivery",
            headers=auth_header(driver_token),
            timeout=TIMEOUT,
        )
        assert resp.status_code in (404, 400, 403), (
            f"Expected 404/400/403 for driver-arrived on nonexistent order, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_cancel_no_customer_requires_auth(self, env_url):
        """POST /api/erp/orders/{id}/cancel-no-customer - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/cancel-no-customer",
            json={"photo_url": "https://example.com/photo.jpg"},
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated cancel-no-customer, got {resp.status_code}"
        )

    def test_cancel_no_customer_with_auth(self, env_url, driver_token):
        """POST /api/erp/orders/{id}/cancel-no-customer - 404 for nonexistent order."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/cancel-no-customer",
            headers=auth_header(driver_token),
            json={"photo_url": "https://example.com/photo.jpg"},
            timeout=TIMEOUT,
        )
        assert resp.status_code in (404, 400, 403), (
            f"Expected 404/400/403 for cancel-no-customer on nonexistent order, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_address_unreachable_requires_auth(self, env_url):
        """POST /api/erp/orders/{id}/address-unreachable - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/address-unreachable",
            json={"notes": "Smoke test"},
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated address-unreachable, got {resp.status_code}"
        )

    def test_address_unreachable_with_auth(self, env_url, driver_token):
        """POST /api/erp/orders/{id}/address-unreachable - 404 for nonexistent order."""
        resp = requests.post(
            f"{env_url}/api/erp/orders/{NONEXISTENT_ORDER_ID}/address-unreachable",
            headers=auth_header(driver_token),
            json={"notes": "Smoke test"},
            timeout=TIMEOUT,
        )
        assert resp.status_code in (404, 400, 403), (
            f"Expected 404/400/403 for address-unreachable on nonexistent order, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_reassign_delivery_requires_auth(self, env_url):
        """POST /api/deliveries/{id}/reassign - 401 without auth."""
        resp = requests.post(
            f"{env_url}/api/deliveries/{NONEXISTENT_ORDER_ID}/reassign",
            timeout=TIMEOUT,
        )
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated reassign, got {resp.status_code}"
        )

    def test_reassign_delivery_with_auth(self, env_url, customer_token):
        """POST /api/deliveries/{id}/reassign - 404 for nonexistent order."""
        resp = requests.post(
            f"{env_url}/api/deliveries/{NONEXISTENT_ORDER_ID}/reassign",
            headers=auth_header(customer_token),
            timeout=TIMEOUT,
        )
        assert resp.status_code in (404, 400), (
            f"Expected 404/400 for reassign on nonexistent order, got {resp.status_code}: {resp.text[:200]}"
        )

    def test_fare_estimate_public(self, env_url):
        """POST /api/rides/estimate - public endpoint, no auth needed."""
        resp = requests.post(
            f"{env_url}/api/rides/estimate",
            json={
                "pickup_latitude": 40.7128,
                "pickup_longitude": -74.0060,
                "dropoff_latitude": 40.7580,
                "dropoff_longitude": -73.9855,
                "ride_type": "standard",
            },
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, (
            f"Expected 200 for public fare estimate, got {resp.status_code}: {resp.text[:200]}"
        )
        data = resp.json()
        assert data.get("success") is True, f"Fare estimate not successful: {data}"
        estimate = data.get("estimate", {})
        assert "subtotal" in estimate, f"Missing subtotal in fare estimate: {estimate.keys()}"
        assert "platform_fee" in estimate, f"Missing platform_fee in fare estimate: {estimate.keys()}"

    def test_fare_estimate_has_suggested_bids(self, env_url):
        """POST /api/rides/estimate - response includes suggested_bids."""
        resp = requests.post(
            f"{env_url}/api/rides/estimate",
            json={
                "pickup_latitude": 40.7128,
                "pickup_longitude": -74.0060,
                "dropoff_latitude": 40.7580,
                "dropoff_longitude": -73.9855,
                "ride_type": "standard",
            },
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200
        data = resp.json()
        estimate = data.get("estimate", {})
        assert "suggested_bids" in estimate, f"Missing suggested_bids: {estimate.keys()}"
        assert len(estimate["suggested_bids"]) > 0, "No suggested bids returned"
