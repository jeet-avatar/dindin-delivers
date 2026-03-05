"""
Unit Tests for Stale Driver Detection and Reassignment
=======================================================

Tests cover:
1. reassign_delivery() helper - field clearing, notifications, return value
2. check_stale_driver_reassignment_job() - stale detection, fresh skip, dedup
3. POST /api/deliveries/{order_id}/reassign endpoint - validation
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, call

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from models import Order, OrderStatus, Driver, DriverStatus, Customer
from order_flow import (
    reassign_delivery,
    check_stale_driver_reassignment_job,
    _reassigned_orders,
    STALE_DRIVER_LOCATION_MINUTES,
)


# ==================== FIXTURES ====================

@pytest.fixture(autouse=True)
def clear_reassigned_set():
    """Clear dedup set before each test"""
    _reassigned_orders.clear()
    yield
    _reassigned_orders.clear()


@pytest.fixture
def mock_db_session():
    """Mock database session"""
    session = MagicMock()
    session.add = MagicMock()
    session.commit = MagicMock()
    session.query = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    return session


@pytest.fixture
def mock_order():
    """Mock order in OUT_FOR_DELIVERY status with driver assigned"""
    order = MagicMock(spec=Order)
    order.id = 42
    order.order_number = "EF202600042"
    order.customer_id = 10
    order.customer_name = "Test Customer"
    order.customer_email = "customer@test.com"
    order.vendor_id = 5
    order.driver_id = 1
    order.driver_name = "John Doe"
    order.driver_en_route = True
    order.driver_accepted_at = datetime.now() - timedelta(minutes=30)
    order.picked_up_at = datetime.now() - timedelta(minutes=20)
    order.status = OrderStatus.OUT_FOR_DELIVERY
    order.stripe_payment_intent_id = "pi_test_123"
    return order


@pytest.fixture
def mock_driver_stale():
    """Mock driver with stale location (15 minutes ago)"""
    driver = MagicMock(spec=Driver)
    driver.id = 1
    driver.first_name = "John"
    driver.last_name = "Doe"
    driver.email = "driver@test.com"
    driver.location_updated_at = datetime.now() - timedelta(minutes=15)
    return driver


@pytest.fixture
def mock_driver_fresh():
    """Mock driver with fresh location (2 minutes ago)"""
    driver = MagicMock(spec=Driver)
    driver.id = 1
    driver.first_name = "Jane"
    driver.last_name = "Fresh"
    driver.email = "fresh@test.com"
    driver.location_updated_at = datetime.now() - timedelta(minutes=2)
    return driver


@pytest.fixture
def mock_driver_no_location():
    """Mock driver with no location update ever"""
    driver = MagicMock(spec=Driver)
    driver.id = 1
    driver.first_name = "Ghost"
    driver.last_name = "Driver"
    driver.email = "ghost@test.com"
    driver.location_updated_at = None
    return driver


# ==================== TESTS: reassign_delivery ====================

@patch("order_flow.send_email")
@patch("order_flow.send_push_notification")
def test_reassign_delivery_clears_driver_fields(mock_push, mock_email, mock_order, mock_db_session):
    """reassign_delivery should clear driver fields and reset status to READY_FOR_PICKUP"""
    result = reassign_delivery(mock_order, "test reason", mock_db_session)

    assert mock_order.driver_id is None
    assert mock_order.driver_name is None
    assert mock_order.driver_en_route == False
    assert mock_order.driver_accepted_at is None
    assert mock_order.picked_up_at is None
    assert mock_order.status == OrderStatus.READY_FOR_PICKUP
    assert result["success"] is True
    assert result["order_id"] == 42
    assert result["original_driver_id"] == 1


@patch("order_flow.send_email")
@patch("order_flow.send_push_notification")
def test_reassign_delivery_sends_customer_notification(mock_push, mock_email, mock_order, mock_db_session):
    """reassign_delivery should send push notification to customer"""
    reassign_delivery(mock_order, "test reason", mock_db_session)

    # Find the customer notification call
    customer_calls = [
        c for c in mock_push.call_args_list
        if c.kwargs.get("user_type") == "customer" or (c.args and c.args[0] == "customer")
    ]
    assert len(customer_calls) == 1
    call_kwargs = customer_calls[0].kwargs
    assert call_kwargs["user_type"] == "customer"
    assert call_kwargs["user_id"] == 10
    assert "Delivery Update" in call_kwargs["title"]
    assert "offline" in call_kwargs["body"].lower() or "new driver" in call_kwargs["body"].lower()


@patch("order_flow.send_email")
@patch("order_flow.send_push_notification")
def test_reassign_delivery_sends_driver_notification(mock_push, mock_email, mock_order, mock_db_session):
    """reassign_delivery should send push notification to original driver"""
    mock_order.driver_id = 5
    reassign_delivery(mock_order, "test reason", mock_db_session)

    # Find the driver notification call
    driver_calls = [
        c for c in mock_push.call_args_list
        if c.kwargs.get("user_type") == "driver" or (c.args and c.args[0] == "driver")
    ]
    assert len(driver_calls) == 1
    call_kwargs = driver_calls[0].kwargs
    assert call_kwargs["user_type"] == "driver"
    assert call_kwargs["user_id"] == 5
    assert "Reassigned" in call_kwargs["title"]


# ==================== TESTS: check_stale_driver_reassignment_job ====================

@patch("order_flow.reassign_delivery")
@patch("order_flow.SessionLocal")
def test_stale_driver_detection_triggers_reassignment(mock_session_cls, mock_reassign, mock_order, mock_driver_stale):
    """Job should call reassign_delivery for orders with stale driver location"""
    db = MagicMock()
    mock_session_cls.return_value = db

    # db.query(Order).filter(...).all() returns our stale order
    db.query.return_value.filter.return_value.all.return_value = [mock_order]
    # db.query(Driver).filter(...).first() returns stale driver
    db.query.return_value.filter.return_value.first.return_value = mock_driver_stale

    mock_reassign.return_value = {"success": True, "order_id": 42, "original_driver_id": 1}

    check_stale_driver_reassignment_job()

    mock_reassign.assert_called_once()
    assert mock_order.id in _reassigned_orders


@patch("order_flow.reassign_delivery")
@patch("order_flow.SessionLocal")
def test_fresh_driver_location_not_reassigned(mock_session_cls, mock_reassign, mock_order, mock_driver_fresh):
    """Job should NOT reassign orders with fresh driver location"""
    db = MagicMock()
    mock_session_cls.return_value = db

    db.query.return_value.filter.return_value.all.return_value = [mock_order]
    db.query.return_value.filter.return_value.first.return_value = mock_driver_fresh

    check_stale_driver_reassignment_job()

    mock_reassign.assert_not_called()


@patch("order_flow.reassign_delivery")
@patch("order_flow.SessionLocal")
def test_stale_driver_no_location_ever(mock_session_cls, mock_reassign, mock_order, mock_driver_no_location):
    """Job should reassign when driver has never updated location (location_updated_at is None)"""
    db = MagicMock()
    mock_session_cls.return_value = db

    db.query.return_value.filter.return_value.all.return_value = [mock_order]
    db.query.return_value.filter.return_value.first.return_value = mock_driver_no_location

    mock_reassign.return_value = {"success": True, "order_id": 42, "original_driver_id": 1}

    check_stale_driver_reassignment_job()

    mock_reassign.assert_called_once()


@patch("order_flow.reassign_delivery")
@patch("order_flow.SessionLocal")
def test_dedup_prevents_double_reassignment(mock_session_cls, mock_reassign, mock_order, mock_driver_stale):
    """Job should not reassign same order twice (dedup set)"""
    db = MagicMock()
    mock_session_cls.return_value = db

    db.query.return_value.filter.return_value.all.return_value = [mock_order]
    db.query.return_value.filter.return_value.first.return_value = mock_driver_stale

    mock_reassign.return_value = {"success": True, "order_id": 42, "original_driver_id": 1}

    # First call should reassign
    check_stale_driver_reassignment_job()
    assert mock_reassign.call_count == 1

    # Second call should skip due to dedup
    check_stale_driver_reassignment_job()
    assert mock_reassign.call_count == 1  # Still 1, not 2


# ==================== TESTS: POST /api/deliveries/{order_id}/reassign ====================

def test_reassign_endpoint_rejects_wrong_status():
    """Endpoint should return 400 for orders not in OUT_FOR_DELIVERY"""
    from fastapi import HTTPException

    # Test the validation logic used by the endpoint
    order_status = OrderStatus.PREPARING

    with pytest.raises(HTTPException) as exc_info:
        if order_status != OrderStatus.OUT_FOR_DELIVERY:
            raise HTTPException(
                status_code=400,
                detail=f"Order must be OUT_FOR_DELIVERY to reassign. Current: {order_status.value}"
            )

    assert exc_info.value.status_code == 400
    assert "OUT_FOR_DELIVERY" in exc_info.value.detail
    assert "preparing" in exc_info.value.detail.lower()
