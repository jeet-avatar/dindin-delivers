"""TDD: Prop 22 calculation logic — tests written BEFORE implementation"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, date
from zoneinfo import ZoneInfo

CA_TZ = ZoneInfo("America/Los_Angeles")


class TestIsInCalifornia:
    def test_san_francisco_is_in_ca(self):
        from prop22_utils import is_in_california
        assert is_in_california(37.7749, -122.4194) is True

    def test_los_angeles_is_in_ca(self):
        from prop22_utils import is_in_california
        assert is_in_california(34.0522, -118.2437) is True

    def test_seattle_not_in_ca(self):
        from prop22_utils import is_in_california
        assert is_in_california(47.6062, -122.3321) is False

    def test_new_york_not_in_ca(self):
        from prop22_utils import is_in_california
        assert is_in_california(40.7128, -74.0060) is False


class TestGpsToCity:
    def test_sf_coords_return_san_francisco(self):
        from prop22_utils import gps_to_city
        assert gps_to_city(37.7749, -122.4194) == "SAN_FRANCISCO"

    def test_la_coords_return_los_angeles(self):
        from prop22_utils import gps_to_city
        assert gps_to_city(34.0522, -118.2437) == "LOS_ANGELES"

    def test_sacramento_returns_ca_statewide(self):
        from prop22_utils import gps_to_city
        assert gps_to_city(38.5816, -121.4944) == "CA"


class TestGetCityMinWage:
    """Tests use mock DB queries to avoid dependency on seed data in test DB."""

    def _make_wage_row(self, city, effective_date, min_wage):
        row = MagicMock()
        row.city = city
        row.effective_date = effective_date
        row.min_wage = min_wage
        return row

    def test_sf_jan_2026_wage(self):
        from prop22_utils import get_city_min_wage
        mock_db = MagicMock()
        sf_row = self._make_wage_row("SAN_FRANCISCO", date(2026, 1, 1), 18.67)
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = sf_row
        wage = get_city_min_wage(mock_db, "SAN_FRANCISCO", date(2026, 3, 15))
        assert wage == 18.67  # Jan 2026 rate

    def test_sf_jul_2026_wage(self):
        from prop22_utils import get_city_min_wage
        mock_db = MagicMock()
        sf_row = self._make_wage_row("SAN_FRANCISCO", date(2026, 7, 1), 19.61)
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = sf_row
        wage = get_city_min_wage(mock_db, "SAN_FRANCISCO", date(2026, 7, 15))
        assert wage == 19.61  # Jul 2026 rate (mid-year increase)

    def test_statewide_ca_fallback(self):
        from prop22_utils import get_city_min_wage
        mock_db = MagicMock()
        ca_row = self._make_wage_row("CA", date(2026, 1, 1), 16.90)
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = ca_row
        wage = get_city_min_wage(mock_db, "CA", date(2026, 3, 15))
        assert wage == 16.90

    def test_unknown_city_falls_back_to_ca(self):
        from prop22_utils import get_city_min_wage
        mock_db = MagicMock()
        ca_row = self._make_wage_row("CA", date(2026, 1, 1), 16.90)
        # First call (BAKERSFIELD) returns None; second call (CA) returns row
        mock_db.query.return_value.filter.return_value.order_by.return_value.first.side_effect = [None, ca_row]
        wage = get_city_min_wage(mock_db, "BAKERSFIELD", date(2026, 3, 15))
        assert wage == 16.90  # falls back to CA statewide


class TestRoadMiles:
    def test_road_miles_uses_google_maps_when_available(self):
        from prop22_utils import road_miles
        mock_result = MagicMock()
        mock_result.distance_miles = 5.2
        with patch("prop22_utils.get_traffic_eta_sync", return_value=mock_result):
            miles = road_miles(37.77, -122.41, 37.80, -122.40)
            assert miles == 5.2

    def test_road_miles_falls_back_to_haversine_on_failure(self):
        from prop22_utils import road_miles
        with patch("prop22_utils.get_traffic_eta_sync", side_effect=Exception("API down")):
            with patch("prop22_utils.haversine_miles", return_value=4.0):
                miles = road_miles(37.77, -122.41, 37.80, -122.40)
                assert miles == 4.0 * 1.25  # haversine x correction factor


class TestGetPeriodBounds:
    def test_period_start_is_january_1_for_jan_2026(self):
        from prop22_utils import get_period_bounds_for_date
        dt = datetime(2026, 1, 10, 12, 0, tzinfo=CA_TZ)
        start, end = get_period_bounds_for_date(dt)
        assert start == datetime(2026, 1, 1, tzinfo=CA_TZ)
        assert end == datetime(2026, 1, 15, tzinfo=CA_TZ)

    def test_period_boundaries_14_days_apart(self):
        from prop22_utils import get_period_bounds_for_date
        from datetime import timedelta
        dt = datetime(2026, 2, 20, tzinfo=CA_TZ)
        start, end = get_period_bounds_for_date(dt)
        assert (end - start).days == 14

    def test_previous_period_bounds(self):
        from prop22_utils import get_period_bounds_for_date
        from datetime import timedelta
        dt = datetime(2026, 1, 16, tzinfo=CA_TZ)  # second period
        start, end = get_period_bounds_for_date(dt)
        assert start == datetime(2026, 1, 15, tzinfo=CA_TZ)
