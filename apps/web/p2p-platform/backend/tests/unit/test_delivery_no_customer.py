"""
Unit Tests for Customer Not At Door Flow (Quick-93)
====================================================

Tests cover:
1. Driver arrival marking (success, wrong driver, wrong status, duplicate)
2. Cancel-no-customer (timer enforcement, leave-at-door, no-leave-at-door, must-arrive-first, wrong driver)
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from models import Order, OrderStatus, Vendor, VendorStatus


@pytest.fixture
def test_order_for_delivery(db_session, test_vendor, test_driver):
    """Create an order in OUT_FOR_DELIVERY status assigned to test_driver."""
    order = Order(
        order_number="ORD-NOSHOW-001",
        customer_id=1,
        customer_name="Test Customer",
        customer_email="customer@test.com",
        customer_phone="+14155551234",
        vendor_id=test_vendor.id,
        driver_id=test_driver.id,
        driver_name="Test Driver",
        items=json.dumps([{"name": "Burger", "quantity": 1, "price": 12.99}]),
        subtotal=12.99,
        tax_rate=0.08,
        tax_amount=1.04,
        delivery_fee=3.00,
        tip=2.00,
        platform_fee=1.00,
        total_amount=20.03,
        delivery_address=json.dumps({"street": "123 Main St", "city": "SF", "state": "CA"}),
        status=OrderStatus.OUT_FOR_DELIVERY,
        payment_status="succeeded",
        stripe_payment_intent_id="pi_test_123",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def test_order_leave_at_door(db_session, test_vendor, test_driver):
    """Create an order with leave_at_door=True, arrived 6 min ago."""
    order = Order(
        order_number="ORD-NOSHOW-002",
        customer_id=1,
        customer_name="Test Customer",
        customer_email="customer@test.com",
        customer_phone="+14155551234",
        vendor_id=test_vendor.id,
        driver_id=test_driver.id,
        driver_name="Test Driver",
        items=json.dumps([{"name": "Pizza", "quantity": 1, "price": 15.99}]),
        subtotal=15.99,
        tax_rate=0.08,
        tax_amount=1.28,
        delivery_fee=3.00,
        tip=3.00,
        platform_fee=1.00,
        total_amount=24.27,
        delivery_address=json.dumps({"street": "456 Oak Ave", "city": "SF", "state": "CA"}),
        status=OrderStatus.OUT_FOR_DELIVERY,
        payment_status="succeeded",
        stripe_payment_intent_id="pi_test_456",
        leave_at_door=True,
        driver_arrived_at_delivery=datetime.now() - timedelta(minutes=6),
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def test_order_no_leave_at_door(db_session, test_vendor, test_driver):
    """Create an order with leave_at_door=False, arrived 6 min ago."""
    order = Order(
        order_number="ORD-NOSHOW-003",
        customer_id=1,
        customer_name="Test Customer",
        customer_email="customer@test.com",
        customer_phone="+14155551234",
        vendor_id=test_vendor.id,
        driver_id=test_driver.id,
        driver_name="Test Driver",
        items=json.dumps([{"name": "Sushi", "quantity": 2, "price": 22.00}]),
        subtotal=22.00,
        tax_rate=0.08,
        tax_amount=1.76,
        delivery_fee=3.00,
        tip=4.00,
        platform_fee=1.00,
        total_amount=31.76,
        delivery_address=json.dumps({"street": "789 Elm St", "city": "SF", "state": "CA"}),
        status=OrderStatus.OUT_FOR_DELIVERY,
        payment_status="succeeded",
        stripe_payment_intent_id="pi_test_789",
        leave_at_door=False,
        driver_arrived_at_delivery=datetime.now() - timedelta(minutes=6),
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


# ==================== DRIVER ARRIVED AT DELIVERY TESTS ====================

@patch("order_flow.send_push_notification")
def test_driver_arrived_at_delivery_success(mock_push, client, driver_auth_headers, test_order_for_delivery):
    """Test successful arrival marking returns 200 with 300s timer."""
    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/driver-arrived-at-delivery",
        headers=driver_auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["wait_timer_seconds"] == 300
    assert data["arrived_at"] is not None
    assert "leave_at_door" in data
    mock_push.assert_called_once()


@patch("order_flow.send_push_notification")
def test_driver_arrived_at_delivery_wrong_driver(mock_push, client, db_session, test_order_for_delivery, test_vendor):
    """Test that a different driver gets 403."""
    from models import Driver, DriverStatus
    from main_new import create_access_token, get_password_hash
    import uuid

    other_driver = Driver(
        driver_id=f"drv_{uuid.uuid4().hex[:8]}",
        email=f"other_{datetime.now().timestamp()}@test.com",
        password_hash=get_password_hash("OtherDriver123!"),
        first_name="Other",
        last_name="Driver",
        phone="+14155559999",
        status=DriverStatus.APPROVED,
    )
    db_session.add(other_driver)
    db_session.commit()
    db_session.refresh(other_driver)

    token = create_access_token(data={"sub": other_driver.email, "driver_id": other_driver.id})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/driver-arrived-at-delivery",
        headers=headers,
    )
    assert resp.status_code == 403
    mock_push.assert_not_called()


@patch("order_flow.send_push_notification")
def test_driver_arrived_at_delivery_wrong_status(mock_push, client, db_session, driver_auth_headers, test_order_for_delivery):
    """Test that arriving on an order not OUT_FOR_DELIVERY returns 400."""
    test_order_for_delivery.status = OrderStatus.PREPARING
    db_session.commit()

    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/driver-arrived-at-delivery",
        headers=driver_auth_headers,
    )
    assert resp.status_code == 400
    assert "OUT_FOR_DELIVERY" in resp.json()["detail"]


@patch("order_flow.send_push_notification")
def test_driver_arrived_at_delivery_already_arrived(mock_push, client, db_session, driver_auth_headers, test_order_for_delivery):
    """Test that double arrival returns 400."""
    test_order_for_delivery.driver_arrived_at_delivery = datetime.now()
    db_session.commit()

    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/driver-arrived-at-delivery",
        headers=driver_auth_headers,
    )
    assert resp.status_code == 400
    assert "Already marked as arrived" in resp.json()["detail"]


# ==================== CANCEL NO CUSTOMER TESTS ====================

@patch("order_flow.send_push_notification")
def test_cancel_no_customer_before_5_min(mock_push, client, db_session, driver_auth_headers, test_order_for_delivery):
    """Test that cancelling before 5 minutes returns 400 with seconds remaining."""
    test_order_for_delivery.driver_arrived_at_delivery = datetime.now() - timedelta(minutes=2)
    db_session.commit()

    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/cancel-no-customer",
        headers=driver_auth_headers,
        json={"photo_url": "https://s3.example.com/proof.jpg"},
    )
    assert resp.status_code == 400
    assert "Must wait 5 minutes" in resp.json()["detail"]


@patch("order_flow.trigger_refund", return_value=True)
@patch("order_flow.send_push_notification")
def test_cancel_no_customer_leave_at_door_true(mock_push, mock_refund, client, db_session, driver_auth_headers, test_order_leave_at_door):
    """Test leave-at-door order becomes DELIVERED with photo proof."""
    resp = client.post(
        f"/api/erp/orders/{test_order_leave_at_door.id}/cancel-no-customer",
        headers=driver_auth_headers,
        json={"photo_url": "https://s3.example.com/door-proof.jpg"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "delivered"
    assert "left at door" in data["message"].lower()
    mock_push.assert_called_once()
    # Refund should NOT be called for leave-at-door
    mock_refund.assert_not_called()

    # Verify order status in DB
    db_session.refresh(test_order_leave_at_door)
    assert test_order_leave_at_door.status == OrderStatus.DELIVERED
    assert test_order_leave_at_door.delivery_photo_url == "https://s3.example.com/door-proof.jpg"


@patch("order_flow.trigger_refund", return_value=True)
@patch("order_flow.send_push_notification")
def test_cancel_no_customer_leave_at_door_false(mock_push, mock_refund, client, db_session, driver_auth_headers, test_order_no_leave_at_door):
    """Test non-leave-at-door order becomes DELIVERY_FAILED with refund."""
    resp = client.post(
        f"/api/erp/orders/{test_order_no_leave_at_door.id}/cancel-no-customer",
        headers=driver_auth_headers,
        json={"photo_url": "https://s3.example.com/no-customer-proof.jpg"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["status"] == "delivery_failed"
    assert "cancelled" in data["message"].lower()
    mock_push.assert_called_once()
    mock_refund.assert_called_once()

    # Verify order status in DB
    db_session.refresh(test_order_no_leave_at_door)
    assert test_order_no_leave_at_door.status == OrderStatus.DELIVERY_FAILED
    assert test_order_no_leave_at_door.payment_status == "refunded"
    assert test_order_no_leave_at_door.delivery_photo_url == "https://s3.example.com/no-customer-proof.jpg"


@patch("order_flow.send_push_notification")
def test_cancel_no_customer_must_arrive_first(mock_push, client, driver_auth_headers, test_order_for_delivery):
    """Test that cancel without arrival marking returns 400."""
    resp = client.post(
        f"/api/erp/orders/{test_order_for_delivery.id}/cancel-no-customer",
        headers=driver_auth_headers,
        json={"photo_url": "https://s3.example.com/proof.jpg"},
    )
    assert resp.status_code == 400
    assert "Must mark arrival first" in resp.json()["detail"]


@patch("order_flow.send_push_notification")
def test_cancel_no_customer_wrong_driver(mock_push, client, db_session, test_order_no_leave_at_door, test_vendor):
    """Test that a different driver gets 403 on cancel."""
    from models import Driver, DriverStatus
    from main_new import create_access_token, get_password_hash
    import uuid

    other_driver = Driver(
        driver_id=f"drv_{uuid.uuid4().hex[:8]}",
        email=f"other2_{datetime.now().timestamp()}@test.com",
        password_hash=get_password_hash("OtherDriver123!"),
        first_name="Other2",
        last_name="Driver",
        phone="+14155558888",
        status=DriverStatus.APPROVED,
    )
    db_session.add(other_driver)
    db_session.commit()
    db_session.refresh(other_driver)

    token = create_access_token(data={"sub": other_driver.email, "driver_id": other_driver.id})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/erp/orders/{test_order_no_leave_at_door.id}/cancel-no-customer",
        headers=headers,
        json={"photo_url": "https://s3.example.com/proof.jpg"},
    )
    assert resp.status_code == 403
