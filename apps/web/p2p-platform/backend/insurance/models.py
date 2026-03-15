"""SQLAlchemy models for Usage-Based Insurance tracking."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, JSON, Text,
    Index, UniqueConstraint, text
)
from models import Base


def _uuid():
    return str(uuid.uuid4())


class InsuranceEvent(Base):
    __tablename__ = "insurance_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    driver_id = Column(Integer, nullable=False, index=True)
    trip_type = Column(String(20), nullable=False)  # "rideshare", "delivery", or "available"
    trip_id = Column(Integer, nullable=True)
    session_id = Column(String(36), nullable=False)
    period = Column(Integer, nullable=False)  # 1, 2, or 3
    event_type = Column(String(20), nullable=False)  # "period_start" or "period_end"
    timestamp = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    odometer_miles = Column(Float, nullable=True)
    segment_miles = Column(Float, nullable=True)
    segment_duration_seconds = Column(Integer, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_insurance_events_trip", "trip_type", "trip_id"),
        Index("ix_insurance_events_timestamp", "timestamp"),
        Index("ix_insurance_events_session", "session_id"),
        UniqueConstraint("trip_type", "trip_id", "period", "event_type",
                         name="uq_insurance_event_trip_period"),
        Index("uq_insurance_event_session_period", "session_id", "period", "event_type",
              unique=True, postgresql_where=text("trip_id IS NULL")),
    )


class InsuranceWebhookConfig(Base):
    __tablename__ = "insurance_webhook_configs"

    id = Column(String(36), primary_key=True, default=_uuid)
    provider_name = Column(String(100), nullable=False)
    callback_url = Column(String(500), nullable=False)
    secret_key = Column(String(256), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    event_types = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InsuranceApiKey(Base):
    __tablename__ = "insurance_api_keys"

    id = Column(String(36), primary_key=True, default=_uuid)
    provider_name = Column(String(100), nullable=False)
    api_key_hash = Column(String(256), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
