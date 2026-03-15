"""Tests for insurance utility functions."""
import pytest
from insurance.utils import haversine_miles


class TestHaversineMiles:
    def test_same_point_returns_zero(self):
        assert haversine_miles(40.7128, -74.0060, 40.7128, -74.0060) == 0.0

    def test_known_distance_nyc_to_la(self):
        result = haversine_miles(40.7128, -74.0060, 34.0522, -118.2437)
        assert 2440 < result < 2460

    def test_short_distance_one_block(self):
        result = haversine_miles(40.7128, -74.0060, 40.7136, -74.0060)
        assert 0.04 < result < 0.07

    def test_none_coordinates_returns_none(self):
        assert haversine_miles(None, -74.0, 40.7, -74.0) is None
        assert haversine_miles(40.7, None, 40.7, -74.0) is None
        assert haversine_miles(40.7, -74.0, None, -74.0) is None
        assert haversine_miles(40.7, -74.0, 40.7, None) is None
