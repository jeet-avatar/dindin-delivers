"""Tests for insurance/events.py — Core Event Logger."""
import pytest
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, Driver
from insurance.models import InsuranceEvent, InsuranceWebhookConfig, InsuranceApiKey
from insurance.events import log_insurance_event


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def mock_driver(db_session):
    driver = Driver(
        id=1, driver_id="DRV-TEST-001",
        email="test@example.com", password_hash="test",
        first_name="Test", last_name="Driver",
        current_latitude=40.7128, current_longitude=-74.0060,
    )
    db_session.add(driver)
    db_session.commit()
    return driver


class TestLogInsuranceEvent:
    def test_log_period_start(self, db_session, mock_driver):
        session_id = str(uuid.uuid4())
        event = log_insurance_event(
            db=db_session, driver_id=mock_driver.id, trip_type="rideshare",
            trip_id=None, session_id=session_id, period=1, event_type="period_start",
        )
        assert event is not None
        assert event.driver_id == mock_driver.id
        assert event.period == 1
        assert event.event_type == "period_start"
        assert event.latitude == 40.7128
        assert event.longitude == -74.0060
        assert event.session_id == session_id

    def test_log_period_end_computes_segment(self, db_session, mock_driver):
        session_id = str(uuid.uuid4())
        log_insurance_event(
            db=db_session, driver_id=mock_driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=2, event_type="period_start",
        )
        mock_driver.current_latitude = 40.7200
        mock_driver.current_longitude = -74.0060
        db_session.commit()
        event = log_insurance_event(
            db=db_session, driver_id=mock_driver.id, trip_type="rideshare",
            trip_id=100, session_id=session_id, period=2, event_type="period_end",
        )
        assert event.segment_miles is not None
        assert event.segment_miles > 0
        assert event.segment_duration_seconds is not None

    def test_log_event_with_metadata(self, db_session, mock_driver):
        session_id = str(uuid.uuid4())
        event = log_insurance_event(
            db=db_session, driver_id=mock_driver.id, trip_type="delivery",
            trip_id=200, session_id=session_id, period=3, event_type="period_end",
            metadata={"reason": "driver_cancelled"},
        )
        assert event.metadata_json == {"reason": "driver_cancelled"}

    def test_log_event_handles_missing_gps(self, db_session, mock_driver):
        mock_driver.current_latitude = None
        mock_driver.current_longitude = None
        db_session.commit()
        session_id = str(uuid.uuid4())
        event = log_insurance_event(
            db=db_session, driver_id=mock_driver.id, trip_type="rideshare",
            trip_id=None, session_id=session_id, period=1, event_type="period_start",
        )
        assert event.latitude is None
        assert event.longitude is None

    def test_returns_none_for_missing_driver(self, db_session):
        """log_insurance_event must never raise — return None for bad driver_id."""
        session_id = str(uuid.uuid4())
        event = log_insurance_event(
            db=db_session, driver_id=99999, trip_type="rideshare",
            trip_id=None, session_id=session_id, period=1, event_type="period_start",
        )
        assert event is None


class TestAccumulateMileage:
    @patch("insurance.events.redis_client")
    @patch("insurance.events.REDIS_AVAILABLE", True)
    def test_accumulates_distance(self, mock_redis):
        from insurance.events import accumulate_mileage
        mock_redis.get.return_value = "40.7128,-74.0060"
        mock_redis.exists.return_value = True
        accumulate_mileage(driver_id=1, session_id="s1", lat=40.7200, lng=-74.0060)
        mock_redis.incrbyfloat.assert_called_once()

    @patch("insurance.events.redis_client")
    @patch("insurance.events.REDIS_AVAILABLE", True)
    def test_ignores_gps_jitter(self, mock_redis):
        from insurance.events import accumulate_mileage
        mock_redis.get.return_value = "40.7128,-74.0060"
        accumulate_mileage(driver_id=1, session_id="s1", lat=40.7128, lng=-74.0060)
        mock_redis.incrbyfloat.assert_not_called()

    @patch("insurance.events.REDIS_AVAILABLE", False)
    def test_no_op_when_redis_unavailable(self):
        from insurance.events import accumulate_mileage
        # Should not raise even without Redis
        accumulate_mileage(driver_id=1, session_id="s1", lat=40.7128, lng=-74.0060)


class TestGetOrCreateSessionId:
    def test_generates_new_session_if_none(self, db_session, mock_driver):
        from insurance.events import get_or_create_session_id
        result = get_or_create_session_id(db_session, mock_driver.id)
        assert result is not None
        assert len(result) == 36

    def test_returns_existing_session_from_event(self, db_session, mock_driver):
        from insurance.events import get_or_create_session_id
        existing_session = str(uuid.uuid4())
        event = InsuranceEvent(
            driver_id=mock_driver.id,
            trip_type="rideshare",
            trip_id=None,
            session_id=existing_session,
            period=1,
            event_type="period_start",
            timestamp=datetime.utcnow(),
        )
        db_session.add(event)
        db_session.commit()
        result = get_or_create_session_id(db_session, mock_driver.id)
        assert result == existing_session


class TestGetAccumulatedMileage:
    @patch("insurance.events.redis_client")
    @patch("insurance.events.REDIS_AVAILABLE", True)
    def test_returns_float_from_redis(self, mock_redis):
        from insurance.events import get_accumulated_mileage
        mock_redis.get.return_value = "12.5"
        result = get_accumulated_mileage(driver_id=1, session_id="s1")
        assert result == pytest.approx(12.5)

    @patch("insurance.events.REDIS_AVAILABLE", False)
    def test_returns_none_when_redis_unavailable(self):
        from insurance.events import get_accumulated_mileage
        result = get_accumulated_mileage(driver_id=1, session_id="s1")
        assert result is None


class TestResetPeriodMileage:
    @patch("insurance.events.redis_client")
    @patch("insurance.events.REDIS_AVAILABLE", True)
    def test_deletes_redis_keys(self, mock_redis):
        from insurance.events import reset_period_mileage
        reset_period_mileage(driver_id=1, session_id="s1")
        # One delete() call with both keys as positional args
        mock_redis.delete.assert_called_once_with(
            "insurance:mileage:1:s1",
            "insurance:last_gps:1:s1",
        )
