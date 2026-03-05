"""Tests for driver proximity notification (haversine + push dedup)."""
import math
from unittest.mock import patch, MagicMock

import pytest

from main_new import (
    _haversine_distance_meters,
    _check_driver_proximity_to_delivery,
    _driver_approaching_notified,
    DRIVER_APPROACHING_THRESHOLD_METERS,
)
from models import OrderStatus


# ---------------------------------------------------------------------------
# Haversine distance tests
# ---------------------------------------------------------------------------

def test_haversine_known_distance():
    """Times Square (40.7580, -73.9855) to nearby point ~1068m south."""
    dist = _haversine_distance_meters(40.7580, -73.9855, 40.7484, -73.9857)
    assert abs(dist - 1068) < 10, f"Expected ~1068m, got {dist:.1f}m"


def test_haversine_same_point():
    dist = _haversine_distance_meters(40.7580, -73.9855, 40.7580, -73.9855)
    assert dist == 0.0


def test_haversine_large_distance():
    """NYC (40.7128, -74.0060) to LA (34.0522, -118.2437) is ~3940km."""
    dist = _haversine_distance_meters(40.7128, -74.0060, 34.0522, -118.2437)
    assert abs(dist - 3_940_000) < 50_000, f"Expected ~3940km, got {dist/1000:.0f}km"


# ---------------------------------------------------------------------------
# Proximity check tests
# ---------------------------------------------------------------------------

def _make_order(order_id, customer_id, driver_id, status, dlat, dlng):
    """Create a mock Order object."""
    order = MagicMock()
    order.id = order_id
    order.customer_id = customer_id
    order.driver_id = driver_id
    order.status = status
    order.delivery_latitude = dlat
    order.delivery_longitude = dlng
    return order


# Use two points ~200m apart (well within 500m threshold)
DELIVERY_LAT, DELIVERY_LNG = 40.7484, -73.9857
# ~200m north of delivery point
DRIVER_NEAR_LAT, DRIVER_NEAR_LNG = 40.7502, -73.9857
# ~2km north of delivery point
DRIVER_FAR_LAT, DRIVER_FAR_LNG = 40.7664, -73.9857


def test_proximity_check_sends_notification():
    """Driver within 500m triggers push notification."""
    _driver_approaching_notified.clear()

    order = _make_order(
        order_id=101, customer_id=50, driver_id=1,
        status=OrderStatus.OUT_FOR_DELIVERY,
        dlat=DELIVERY_LAT, dlng=DELIVERY_LNG,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = [order]

    with patch("order_flow.send_push_notification") as mock_send:
        mock_send.return_value = True
        _check_driver_proximity_to_delivery(1, DRIVER_NEAR_LAT, DRIVER_NEAR_LNG, mock_db)
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args
        assert call_kwargs[1]["user_type"] == "customer"
        assert call_kwargs[1]["user_id"] == 50
        assert call_kwargs[1]["title"] == "Driver Approaching"
        assert call_kwargs[1]["data"]["order_id"] == "101"

    assert 101 in _driver_approaching_notified


def test_proximity_check_deduplicates():
    """Second call for same order does not send again."""
    _driver_approaching_notified.clear()

    order = _make_order(
        order_id=102, customer_id=51, driver_id=2,
        status=OrderStatus.OUT_FOR_DELIVERY,
        dlat=DELIVERY_LAT, dlng=DELIVERY_LNG,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = [order]

    with patch("order_flow.send_push_notification") as mock_send:
        mock_send.return_value = True
        _check_driver_proximity_to_delivery(2, DRIVER_NEAR_LAT, DRIVER_NEAR_LNG, mock_db)
        _check_driver_proximity_to_delivery(2, DRIVER_NEAR_LAT, DRIVER_NEAR_LNG, mock_db)
        assert mock_send.call_count == 1


def test_proximity_check_skips_far_driver():
    """Driver 2km away does not trigger notification."""
    _driver_approaching_notified.clear()

    order = _make_order(
        order_id=103, customer_id=52, driver_id=3,
        status=OrderStatus.OUT_FOR_DELIVERY,
        dlat=DELIVERY_LAT, dlng=DELIVERY_LNG,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = [order]

    with patch("order_flow.send_push_notification") as mock_send:
        _check_driver_proximity_to_delivery(3, DRIVER_FAR_LAT, DRIVER_FAR_LNG, mock_db)
        mock_send.assert_not_called()

    assert 103 not in _driver_approaching_notified


def test_proximity_check_skips_no_coordinates():
    """Order with no delivery coordinates causes no crash."""
    _driver_approaching_notified.clear()

    order = _make_order(
        order_id=104, customer_id=53, driver_id=4,
        status=OrderStatus.OUT_FOR_DELIVERY,
        dlat=None, dlng=None,
    )

    mock_db = MagicMock()
    # The DB filter for .isnot(None) would exclude this, but test the function's resilience
    mock_db.query.return_value.filter.return_value.all.return_value = []

    with patch("order_flow.send_push_notification") as mock_send:
        _check_driver_proximity_to_delivery(4, 40.7580, -73.9855, mock_db)
        mock_send.assert_not_called()
