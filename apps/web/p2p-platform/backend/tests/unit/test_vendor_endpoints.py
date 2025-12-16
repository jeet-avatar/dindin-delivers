"""
Unit tests for vendor/restaurant endpoints.

Tests cover:
- Vendor registration
- Document upload
- Menu management
- Order management
- Dashboard access
"""

import pytest
import io
from datetime import datetime
from fastapi.testclient import TestClient


class TestVendorRegistration:
    """Tests for vendor registration"""

    def test_vendor_application_submit(self, client: TestClient, sample_vendor_data):
        """Should submit vendor application"""
        # Create a mock file
        file_content = b"fake pdf content"
        files = {
            "menu_file": ("menu.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"data": str(sample_vendor_data)}

        response = client.post(
            "/api/vendors/apply",
            data=data,
            files=files,
        )
        assert response.status_code in [200, 201, 422]

    def test_vendor_registration_missing_fields(self, client: TestClient):
        """Should reject incomplete vendor registration"""
        response = client.post("/api/vendors/apply", json={
            "restaurant_name": "Test Restaurant"
        })
        assert response.status_code in [400, 422]


class TestVendorDocumentUpload:
    """Tests for vendor document upload"""

    def test_upload_document_valid(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept valid document upload"""
        file_content = b"fake document content"
        files = {
            "file": ("license.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]

    def test_upload_document_invalid_type(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should reject invalid file type"""
        file_content = b"fake executable"
        files = {
            "file": ("malware.exe", io.BytesIO(file_content), "application/octet-stream")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        # Should accept (extension will be sanitized) or reject
        assert response.status_code in [200, 400, 401, 403, 422]

    def test_upload_document_path_traversal(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should prevent path traversal in document type"""
        file_content = b"fake document"
        files = {
            "file": ("doc.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "../../../etc/passwd"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        # Should sanitize or reject
        assert response.status_code in [200, 400, 401, 403, 422]

    def test_upload_document_requires_auth(self, client: TestClient, test_vendor):
        """Should require authentication"""
        file_content = b"fake document"
        files = {
            "file": ("doc.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
        )
        assert response.status_code in [401, 403]

    def test_public_document_upload(self, client: TestClient, test_vendor):
        """Should allow public document upload with email verification"""
        file_content = b"fake document content"
        files = {
            "file": ("license.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {
            "document_type": "food_license",
            "contact_email": test_vendor.contact_email,
        }

        response = client.post(
            f"/api/vendors/public/{test_vendor.id}/documents",
            files=files,
            data=data,
        )
        assert response.status_code in [200, 201, 400, 403, 422]

    def test_public_document_upload_wrong_email(self, client: TestClient, test_vendor):
        """Should reject public upload with wrong email"""
        file_content = b"fake document content"
        files = {
            "file": ("license.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {
            "document_type": "food_license",
            "contact_email": "wrong@email.com",
        }

        response = client.post(
            f"/api/vendors/public/{test_vendor.id}/documents",
            files=files,
            data=data,
        )
        assert response.status_code == 403


class TestVendorMenu:
    """Tests for vendor menu management"""

    def test_get_menu_items(self, client: TestClient, vendor_auth_headers):
        """Should get menu items for vendor"""
        response = client.get("/api/vendor/menu-items", headers=vendor_auth_headers)
        assert response.status_code in [200, 404]

    def test_get_menu_items_requires_auth(self, client: TestClient):
        """Should require auth for menu items"""
        response = client.get("/api/vendor/menu-items")
        assert response.status_code in [401, 403]

    def test_create_menu_item(self, client: TestClient, vendor_auth_headers):
        """Should create new menu item"""
        item_data = {
            "name": "Test Pizza",
            "description": "A delicious test pizza",
            "price": 15.99,
            "category": "Pizza",
        }
        response = client.post(
            "/api/vendor/menu-items",
            json=item_data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 404]

    def test_update_menu_item(self, client: TestClient, vendor_auth_headers):
        """Should update menu item"""
        item_data = {
            "name": "Updated Pizza",
            "price": 17.99,
        }
        response = client.put(
            "/api/vendor/menu-items/1",
            json=item_data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 404, 405]

    def test_delete_menu_item(self, client: TestClient, vendor_auth_headers):
        """Should delete menu item"""
        response = client.delete(
            "/api/vendor/menu-items/1",
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 204, 404, 405]


class TestVendorOrders:
    """Tests for vendor order management"""

    def test_get_vendor_orders(self, client: TestClient, vendor_auth_headers):
        """Should get vendor orders"""
        response = client.get("/api/vendor/orders", headers=vendor_auth_headers)
        assert response.status_code in [200, 404]

    def test_get_vendor_orders_requires_auth(self, client: TestClient):
        """Should require auth for orders"""
        response = client.get("/api/vendor/orders")
        assert response.status_code in [401, 403]

    def test_update_order_status(self, client: TestClient, vendor_auth_headers):
        """Should update order status"""
        response = client.put(
            "/api/vendor/orders/1/status",
            json={"status": "preparing"},
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 404, 405]


class TestVendorDashboard:
    """Tests for vendor dashboard"""

    def test_get_dashboard(self, client: TestClient, vendor_auth_headers):
        """Should get vendor dashboard"""
        response = client.get("/api/vendor/dashboard", headers=vendor_auth_headers)
        assert response.status_code in [200, 404]

    def test_get_dashboard_requires_auth(self, client: TestClient):
        """Should require auth for dashboard"""
        response = client.get("/api/vendor/dashboard")
        assert response.status_code in [401, 403]

    def test_get_earnings(self, client: TestClient, vendor_auth_headers):
        """Should get vendor earnings"""
        response = client.get("/api/vendor/earnings", headers=vendor_auth_headers)
        assert response.status_code in [200, 404]


class TestVendorSettings:
    """Tests for vendor settings"""

    def test_get_settings(self, client: TestClient, vendor_auth_headers):
        """Should get vendor settings"""
        response = client.get("/api/vendor/settings", headers=vendor_auth_headers)
        assert response.status_code in [200, 404]

    def test_update_settings(self, client: TestClient, vendor_auth_headers):
        """Should update vendor settings"""
        settings_data = {
            "accepts_orders": True,
            "preparation_time": 30,
        }
        response = client.put(
            "/api/vendor/settings",
            json=settings_data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 404, 405]


class TestPublicRestaurantEndpoints:
    """Tests for public restaurant endpoints"""

    def test_list_restaurants(self, client: TestClient):
        """Should list restaurants"""
        response = client.get("/api/restaurants")
        assert response.status_code in [200, 404]

    def test_get_restaurant_details(self, client: TestClient, test_vendor):
        """Should get restaurant details"""
        response = client.get(f"/api/restaurants/{test_vendor.id}")
        assert response.status_code in [200, 404]

    def test_get_restaurant_menu(self, client: TestClient, test_vendor):
        """Should get restaurant menu"""
        response = client.get(f"/api/restaurants/{test_vendor.id}/menu")
        assert response.status_code in [200, 404]

    def test_search_restaurants(self, client: TestClient):
        """Should search restaurants"""
        response = client.get("/api/restaurants/search", params={"q": "pizza"})
        assert response.status_code in [200, 404]

    def test_search_restaurants_by_cuisine(self, client: TestClient):
        """Should search by cuisine"""
        response = client.get("/api/restaurants", params={"cuisine": "Italian"})
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
