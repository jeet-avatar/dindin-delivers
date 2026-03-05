"""
Unit tests for food order dispute flow.

Tests the OrderDispute endpoints:
- POST /api/orders/{order_id}/dispute (create)
- GET /api/orders/{order_id}/dispute (get status)
- GET /api/orders/customer/{customer_id}/disputes (list)
- POST /api/orders/dispute/{dispute_id}/resolve (admin resolve)
"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

from models import Order, OrderStatus, OrderDispute, OrderDisputeReason, DisputeStatus
from main_new import create_access_token


@pytest.fixture
def test_order(db_session, test_customer, test_vendor):
    """Create a delivered test order."""
    order = Order(
        order_number=f"ORD-{datetime.now().timestamp()}",
        customer_id=test_customer.id,
        customer_email=test_customer.email,
        customer_name="Test Customer",
        vendor_id=test_vendor.id,
        items=json.dumps([{"name": "Burger", "quantity": 1, "price": 12.99}]),
        subtotal=12.99,
        tax_amount=1.04,
        delivery_fee=3.00,
        platform_fee=1.00,
        total_amount=18.03,
        status=OrderStatus.DELIVERED,
        stripe_payment_intent_id="pi_test_123",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def pending_order(db_session, test_customer, test_vendor):
    """Create a non-delivered (pending) test order."""
    order = Order(
        order_number=f"ORD-PEND-{datetime.now().timestamp()}",
        customer_id=test_customer.id,
        customer_email=test_customer.email,
        customer_name="Test Customer",
        vendor_id=test_vendor.id,
        items=json.dumps([{"name": "Pizza", "quantity": 1, "price": 15.99}]),
        subtotal=15.99,
        tax_amount=1.28,
        delivery_fee=3.00,
        platform_fee=1.00,
        total_amount=21.27,
        status=OrderStatus.PREPARING,
        stripe_payment_intent_id="pi_test_456",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def admin_token(test_admin):
    """Admin JWT token."""
    return create_access_token(data={
        "sub": test_admin.email,
        "role": "admin",
        "admin_id": test_admin.id
    })


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestCreateDispute:
    """Tests for POST /api/orders/{order_id}/dispute"""

    def test_create_dispute_success(self, client, test_order, customer_auth_headers):
        """Customer creates dispute on delivered order."""
        resp = client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "wrong_items", "description": "Got tacos instead of burger", "affected_items": ["Burger"]},
            headers=customer_auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["dispute"]["order_id"] == test_order.id
        assert data["dispute"]["reason"] == "wrong_items"
        assert data["dispute"]["status"] == "submitted"
        assert data["dispute"]["affected_items"] == ["Burger"]

    def test_create_dispute_not_delivered(self, client, pending_order, customer_auth_headers):
        """Cannot dispute non-delivered orders."""
        resp = client.post(
            f"/api/orders/{pending_order.id}/dispute",
            json={"reason": "wrong_items"},
            headers=customer_auth_headers
        )
        assert resp.status_code == 400
        assert "delivered" in resp.json()["detail"].lower()

    def test_create_dispute_not_owner(self, client, test_order, db_session):
        """Customer cannot dispute another customer's order."""
        from models import Customer, User, UserRole
        from main_new import get_password_hash
        # Create a different customer
        other_email = f"other_{datetime.now().timestamp()}@test.com"
        other_user = User(
            email=other_email,
            password_hash=get_password_hash("OtherPassword123!"),
            full_name="Other Customer",
            role=UserRole.USER,
        )
        db_session.add(other_user)
        db_session.flush()
        other_customer = Customer(
            email=other_email,
            password_hash=get_password_hash("OtherPassword123!"),
            first_name="Other",
            last_name="Customer",
            phone="+14155559999",
            is_active=True,
        )
        db_session.add(other_customer)
        db_session.commit()
        db_session.refresh(other_customer)

        other_token = create_access_token(data={
            "sub": other_customer.email,
            "customer_id": other_customer.id
        })
        resp = client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "wrong_items"},
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert resp.status_code == 403

    def test_create_dispute_duplicate(self, client, test_order, customer_auth_headers):
        """Cannot create two disputes for the same order."""
        # First dispute
        resp1 = client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "wrong_items", "description": "First dispute"},
            headers=customer_auth_headers
        )
        assert resp1.status_code == 200

        # Second dispute on same order
        resp2 = client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "missing_items", "description": "Second dispute"},
            headers=customer_auth_headers
        )
        assert resp2.status_code == 400
        assert "already exists" in resp2.json()["detail"].lower()

    def test_create_dispute_invalid_reason(self, client, test_order, customer_auth_headers):
        """Invalid reason string returns error."""
        resp = client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "i_dont_like_it"},
            headers=customer_auth_headers
        )
        assert resp.status_code == 400
        assert "Invalid reason" in resp.json()["detail"]


class TestGetDispute:
    """Tests for GET /api/orders/{order_id}/dispute"""

    def test_get_dispute_status(self, client, test_order, customer_auth_headers):
        """Retrieve dispute by order_id."""
        # Create dispute first
        client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "quality_issue", "description": "Food was cold"},
            headers=customer_auth_headers
        )

        resp = client.get(
            f"/api/orders/{test_order.id}/dispute",
            headers=customer_auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["dispute"]["order_id"] == test_order.id
        assert data["dispute"]["reason"] == "quality_issue"
        assert data["dispute"]["status"] == "submitted"
        assert "admin_notes" not in data["dispute"]  # Not admin

    def test_get_customer_disputes(self, client, test_order, customer_auth_headers, test_customer):
        """List all disputes for a customer."""
        # Create dispute
        client.post(
            f"/api/orders/{test_order.id}/dispute",
            json={"reason": "never_delivered"},
            headers=customer_auth_headers
        )

        resp = client.get(
            f"/api/orders/customer/{test_customer.id}/disputes",
            headers=customer_auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["count"] >= 1
        assert len(data["disputes"]) >= 1


class TestResolveDispute:
    """Tests for POST /api/orders/dispute/{dispute_id}/resolve"""

    def _create_dispute(self, client, order_id, customer_auth_headers):
        """Helper to create a dispute and return its ID."""
        resp = client.post(
            f"/api/orders/{order_id}/dispute",
            json={"reason": "wrong_items", "description": "Wrong food received"},
            headers=customer_auth_headers
        )
        assert resp.status_code == 200
        return resp.json()["dispute"]["id"]

    @patch("stripe.Refund.create")
    def test_resolve_dispute_refund(self, mock_refund_create, client, test_order, customer_auth_headers, admin_headers):
        """Admin resolves with full refund."""
        mock_refund_create.return_value = MagicMock(id="re_test_full_123")
        dispute_id = self._create_dispute(client, test_order.id, customer_auth_headers)

        import os
        os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
        resp = client.post(
            f"/api/orders/dispute/{dispute_id}/resolve",
            json={"resolution": "refund", "admin_notes": "Verified wrong items delivered"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["dispute"]["status"] == "resolved_refund"
        assert data["dispute"]["refund_amount"] == test_order.total_amount

    @patch("stripe.Refund.create")
    def test_resolve_dispute_partial_refund(self, mock_refund_create, client, test_order, customer_auth_headers, admin_headers):
        """Admin resolves with partial refund."""
        mock_refund_create.return_value = MagicMock(id="re_test_partial_123")
        dispute_id = self._create_dispute(client, test_order.id, customer_auth_headers)

        import os
        os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
        resp = client.post(
            f"/api/orders/dispute/{dispute_id}/resolve",
            json={"resolution": "partial_refund", "refund_amount": 5.00, "admin_notes": "Partial refund for missing side"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["dispute"]["status"] == "resolved_refund"
        assert data["dispute"]["refund_amount"] == 5.00

    def test_resolve_dispute_no_refund(self, client, test_order, customer_auth_headers, admin_headers):
        """Admin resolves with no refund."""
        dispute_id = self._create_dispute(client, test_order.id, customer_auth_headers)

        resp = client.post(
            f"/api/orders/dispute/{dispute_id}/resolve",
            json={"resolution": "no_refund", "admin_notes": "Order verified as correct"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["dispute"]["status"] == "resolved_no_refund"
        assert data["dispute"]["refund_amount"] is None

    def test_resolve_dispute_not_admin(self, client, test_order, customer_auth_headers):
        """Non-admin cannot resolve disputes."""
        dispute_id = self._create_dispute(client, test_order.id, customer_auth_headers)

        resp = client.post(
            f"/api/orders/dispute/{dispute_id}/resolve",
            json={"resolution": "refund"},
            headers=customer_auth_headers
        )
        assert resp.status_code == 403
