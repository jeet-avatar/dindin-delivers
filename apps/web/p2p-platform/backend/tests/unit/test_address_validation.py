"""
Unit Tests for Address Validation and Unreachable Flow (Quick-95 / GAP-15)
==========================================================================

Tests cover:
1. validate_delivery_address function (lat/lng bounds, street, city/zip)
2. POST /orders/{id}/address-unreachable endpoint (driver auth, push notification)
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from models import Order, OrderStatus, Vendor, VendorStatus


# ==================== FIXTURES ====================

@pytest.fixture
def test_order_out_for_delivery(db_session, test_vendor, test_driver):
    """Create an order in OUT_FOR_DELIVERY status assigned to test_driver."""
    order = Order(
        order_number="ORD-ADDR-001",
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
        delivery_address=json.dumps({"street": "123 Main St", "city": "SF", "state": "CA", "latitude": 37.7749, "longitude": -122.4194}),
        status=OrderStatus.OUT_FOR_DELIVERY,
        payment_status="succeeded",
        stripe_payment_intent_id="pi_test_addr_001",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def test_order_pending(db_session, test_vendor, test_driver):
    """Create an order in PENDING status (not out for delivery)."""
    order = Order(
        order_number="ORD-ADDR-002",
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
        tip=1.00,
        platform_fee=1.00,
        total_amount=22.27,
        delivery_address=json.dumps({"street": "456 Oak Ave", "city": "SF", "state": "CA"}),
        status=OrderStatus.PENDING_PAYMENT,
        payment_status="pending",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


# ==================== ADDRESS VALIDATION UNIT TESTS ====================

def test_validate_address_valid():
    """Full address with lat/lng/street/city/zip passes validation."""
    from order_flow import validate_delivery_address
    # Should not raise
    result = validate_delivery_address({
        "latitude": 40.7128,
        "longitude": -74.0060,
        "street": "123 Broadway",
        "city": "New York",
        "zip": "10001",
    })
    assert result is None


def test_validate_address_missing_latitude():
    """Missing latitude raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "longitude": -74.0060,
            "street": "123 Broadway",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "latitude" in exc_info.value.detail.lower()


def test_validate_address_missing_longitude():
    """Missing longitude raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 40.7128,
            "street": "123 Broadway",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "longitude" in exc_info.value.detail.lower()


def test_validate_address_lat_out_of_bounds_low():
    """Latitude too low (20.0) raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 20.0,
            "longitude": -74.0060,
            "street": "123 Broadway",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "out of service area" in exc_info.value.detail.lower()


def test_validate_address_lat_out_of_bounds_high():
    """Latitude too high (55.0) raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 55.0,
            "longitude": -74.0060,
            "street": "123 Broadway",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "out of service area" in exc_info.value.detail.lower()


def test_validate_address_lng_out_of_bounds():
    """Longitude out of range (-130.0) raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 40.7128,
            "longitude": -130.0,
            "street": "123 Broadway",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "out of service area" in exc_info.value.detail.lower()


def test_validate_address_empty_street():
    """Empty street string raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 40.7128,
            "longitude": -74.0060,
            "street": "",
            "city": "New York",
        })
    assert exc_info.value.status_code == 422
    assert "street" in exc_info.value.detail.lower()


def test_validate_address_missing_city_and_zip():
    """Both city and zip missing raises 422."""
    from order_flow import validate_delivery_address
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        validate_delivery_address({
            "latitude": 40.7128,
            "longitude": -74.0060,
            "street": "123 Broadway",
        })
    assert exc_info.value.status_code == 422
    assert "city or zip" in exc_info.value.detail.lower()


def test_validate_address_city_only_valid():
    """Has city but no zip -- passes validation."""
    from order_flow import validate_delivery_address
    result = validate_delivery_address({
        "latitude": 40.7128,
        "longitude": -74.0060,
        "street": "123 Broadway",
        "city": "New York",
    })
    assert result is None


def test_validate_address_zip_only_valid():
    """Has zip but no city -- passes validation."""
    from order_flow import validate_delivery_address
    result = validate_delivery_address({
        "latitude": 40.7128,
        "longitude": -74.0060,
        "street": "123 Broadway",
        "zip": "10001",
    })
    assert result is None


def test_validate_address_alt_keys():
    """Uses 'lat'/'lng' instead of 'latitude'/'longitude' -- passes."""
    from order_flow import validate_delivery_address
    result = validate_delivery_address({
        "lat": 40.7128,
        "lng": -74.0060,
        "street": "123 Broadway",
        "city": "New York",
    })
    assert result is None


# ==================== ADDRESS UNREACHABLE ENDPOINT TESTS ====================

@patch("order_flow.send_push_notification")
def test_address_unreachable_success(mock_push, client, driver_auth_headers, test_order_out_for_delivery):
    """Driver assigned, OUT_FOR_DELIVERY -- returns success and sends push."""
    resp = client.post(
        f"/api/erp/orders/{test_order_out_for_delivery.id}/address-unreachable",
        json={"notes": "Gated community, no access code"},
        headers=driver_auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["order_id"] == test_order_out_for_delivery.id
    assert "expires_at" in data
    assert "5 minutes" in data["message"]
    mock_push.assert_called_once()
    call_kwargs = mock_push.call_args
    assert call_kwargs[1]["user_type"] == "customer" or call_kwargs[0][0] == "customer"


@patch("order_flow.send_push_notification")
def test_address_unreachable_wrong_driver(mock_push, client, db_session, test_order_out_for_delivery, test_vendor):
    """A different driver gets 403."""
    from models import Driver, DriverStatus
    from main_new import create_access_token, get_password_hash
    import uuid

    other_driver = Driver(
        driver_id=f"drv_{uuid.uuid4().hex[:8]}",
        email=f"other_addr_{datetime.now().timestamp()}@test.com",
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
        f"/api/erp/orders/{test_order_out_for_delivery.id}/address-unreachable",
        json={"notes": "Wrong driver attempt"},
        headers=headers,
    )
    assert resp.status_code == 403


@patch("order_flow.send_push_notification")
def test_address_unreachable_wrong_status(mock_push, client, driver_auth_headers, test_order_pending):
    """Order in PENDING status -- returns 400."""
    resp = client.post(
        f"/api/erp/orders/{test_order_pending.id}/address-unreachable",
        json={"notes": "Should fail"},
        headers=driver_auth_headers,
    )
    assert resp.status_code == 400


@patch("order_flow.send_push_notification")
def test_address_unreachable_order_not_found(mock_push, client, driver_auth_headers):
    """Non-existent order returns 404."""
    resp = client.post(
        "/api/erp/orders/999999/address-unreachable",
        json={"notes": "Ghost order"},
        headers=driver_auth_headers,
    )
    assert resp.status_code == 404
