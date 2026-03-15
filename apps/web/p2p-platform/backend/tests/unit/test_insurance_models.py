"""Tests for insurance models."""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from insurance.models import InsuranceEvent, InsuranceWebhookConfig, InsuranceApiKey


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


class TestInsuranceEvent:
    def test_create_event(self, db_session):
        event = InsuranceEvent(
            driver_id=1,
            trip_type="rideshare",
            trip_id=100,
            session_id=uuid.uuid4().hex,
            period=2,
            event_type="period_start",
            timestamp=datetime.utcnow(),
            latitude=40.7128,
            longitude=-74.0060,
        )
        db_session.add(event)
        db_session.commit()
        saved = db_session.query(InsuranceEvent).first()
        assert saved.driver_id == 1
        assert saved.trip_type == "rideshare"
        assert saved.period == 2
        assert saved.event_type == "period_start"
        assert saved.latitude == 40.7128

    def test_nullable_trip_id_for_period_1(self, db_session):
        event = InsuranceEvent(
            driver_id=1,
            trip_type="rideshare",
            trip_id=None,
            session_id=uuid.uuid4().hex,
            period=1,
            event_type="period_start",
            timestamp=datetime.utcnow(),
        )
        db_session.add(event)
        db_session.commit()
        saved = db_session.query(InsuranceEvent).first()
        assert saved.trip_id is None
        assert saved.period == 1

    def test_segment_fields_nullable(self, db_session):
        event = InsuranceEvent(
            driver_id=1,
            trip_type="delivery",
            session_id=uuid.uuid4().hex,
            period=1,
            event_type="period_start",
            timestamp=datetime.utcnow(),
        )
        db_session.add(event)
        db_session.commit()
        saved = db_session.query(InsuranceEvent).first()
        assert saved.segment_miles is None
        assert saved.odometer_miles is None
        assert saved.segment_duration_seconds is None


class TestInsuranceWebhookConfig:
    def test_create_webhook(self, db_session):
        webhook = InsuranceWebhookConfig(
            provider_name="ABI",
            callback_url="https://abi.example.com/events",
            secret_key="test-secret-key-256-bits",
            is_active=True,
        )
        db_session.add(webhook)
        db_session.commit()
        saved = db_session.query(InsuranceWebhookConfig).first()
        assert saved.provider_name == "ABI"
        assert saved.is_active is True


class TestInsuranceApiKey:
    def test_create_api_key(self, db_session):
        api_key = InsuranceApiKey(
            provider_name="SambaSafety",
            api_key_hash="sha256:abc123",
            is_active=True,
        )
        db_session.add(api_key)
        db_session.commit()
        saved = db_session.query(InsuranceApiKey).first()
        assert saved.provider_name == "SambaSafety"
        assert saved.api_key_hash == "sha256:abc123"
