"""
Tests for Order Chat endpoints (Phase 10 coverage).

Covers:
- GET /api/customer/orders/{order_id}/chat
- POST /api/customer/orders/{order_id}/chat
- Alias route: /api/orders/{order_id}/chat
- Auth enforcement: wrong customer gets 403
"""

import uuid
import pytest
from models import Order, OrderStatus


def _create_order(db_session, customer, vendor):
    """Helper to create a minimal Order for chat tests."""
    order = Order(
        order_number=f"ORD-{uuid.uuid4().hex[:8].upper()}",
        customer_id=customer.id,
        customer_email=customer.email,
        customer_name=f"{customer.first_name} {customer.last_name}",
        vendor_id=vendor.id,
        items='[{"name": "Test Item", "quantity": 1, "price": 10.0}]',
        subtotal=10.0,
        total_amount=11.0,
        status=OrderStatus.CONFIRMED,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


class TestGetOrderChat:
    """Tests for GET /api/customer/orders/{order_id}/chat"""

    def test_get_order_chat_no_order(self, client, customer_auth_headers):
        """GET chat for non-existent order returns 404."""
        resp = client.get(
            "/api/customer/orders/99999/chat",
            headers=customer_auth_headers,
        )
        assert resp.status_code == 404

    def test_get_order_chat_empty(
        self, client, db_session, test_customer, test_vendor, customer_auth_headers
    ):
        """GET chat for order with no messages returns empty list."""
        order = _create_order(db_session, test_customer, test_vendor)
        resp = client.get(
            f"/api/customer/orders/{order.id}/chat",
            headers=customer_auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_order_chat_wrong_customer(
        self, client, db_session, test_vendor, customer_auth_headers
    ):
        """Accessing another customer's order chat returns 403."""
        from models import Customer
        from main_new import get_password_hash

        other_customer = Customer(
            email=f"other_{uuid.uuid4().hex[:6]}@test.com",
            password_hash=get_password_hash("OtherPass123!"),
            first_name="Other",
            last_name="Person",
            phone="+14155550000",
            is_active=True,
        )
        db_session.add(other_customer)
        db_session.commit()
        db_session.refresh(other_customer)

        order = _create_order(db_session, other_customer, test_vendor)

        resp = client.get(
            f"/api/customer/orders/{order.id}/chat",
            headers=customer_auth_headers,
        )
        assert resp.status_code == 403


class TestSendOrderChat:
    """Tests for POST /api/customer/orders/{order_id}/chat"""

    def test_send_order_chat_message(
        self, client, db_session, test_customer, test_vendor, customer_auth_headers
    ):
        """POST a chat message returns 200 with success response."""
        order = _create_order(db_session, test_customer, test_vendor)
        resp = client.post(
            f"/api/customer/orders/{order.id}/chat",
            json={"message": "Hello driver!", "sender_type": "customer"},
            headers=customer_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "message" in data

    def test_get_order_chat_after_send(
        self, client, db_session, test_customer, test_vendor, customer_auth_headers
    ):
        """After sending a message, GET returns list with the message."""
        order = _create_order(db_session, test_customer, test_vendor)

        # Send a message first
        client.post(
            f"/api/customer/orders/{order.id}/chat",
            json={"message": "Where is my food?", "sender_type": "customer"},
            headers=customer_auth_headers,
        )

        # Now fetch messages
        resp = client.get(
            f"/api/customer/orders/{order.id}/chat",
            headers=customer_auth_headers,
        )
        assert resp.status_code == 200
        messages = resp.json()
        assert len(messages) == 1
        msg = messages[0]
        assert msg["order_id"] == order.id
        assert msg["sender_type"] == "customer"
        assert msg["message"] == "Where is my food?"
        assert "id" in msg
        assert "created_at" in msg


class TestOrderChatAliasRoutes:
    """Tests for /api/orders/{id}/chat alias routes."""

    def test_order_chat_alias_get(
        self, client, db_session, test_customer, test_vendor, customer_auth_headers
    ):
        """GET /api/orders/{id}/chat alias works same as canonical route."""
        order = _create_order(db_session, test_customer, test_vendor)
        resp = client.get(
            f"/api/orders/{order.id}/chat",
            headers=customer_auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_order_chat_alias_post(
        self, client, db_session, test_customer, test_vendor, customer_auth_headers
    ):
        """POST /api/orders/{id}/chat alias works same as canonical route."""
        order = _create_order(db_session, test_customer, test_vendor)
        resp = client.post(
            f"/api/orders/{order.id}/chat",
            json={"message": "Test via alias", "sender_type": "customer"},
            headers=customer_auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
