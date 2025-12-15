# Dollor.ai Event Outbox Pattern
# ================================
# Transactional outbox for reliable event publishing
# Ensures exactly-once delivery semantics with atomic database operations

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Callable, Awaitable

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    Index,
    create_engine,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

from .base import CloudEvent, EventType
from .serialization import EventSerializer
from .topics import KafkaTopics

Base = declarative_base()


class OutboxStatus(str, Enum):
    """Status of an outbox entry."""
    PENDING = "pending"
    PUBLISHED = "published"
    FAILED = "failed"


class EventOutbox(Base):
    """
    Transactional outbox table for reliable event publishing.

    The outbox pattern ensures that domain events are published reliably
    by storing them in the same transaction as the business operation.

    Columns:
        id: Unique identifier for the outbox entry
        event_id: CloudEvent ID
        event_type: Type of the event (e.g., "dollor.orders.created")
        aggregate_type: Type of aggregate (e.g., "Order", "Ride")
        aggregate_id: ID of the aggregate that produced the event
        topic: Kafka topic to publish to
        payload: Serialized CloudEvent JSON
        status: Current status (pending, published, failed)
        created_at: When the event was created
        published_at: When the event was published to Kafka
        retry_count: Number of publish attempts
        last_error: Last error message if publishing failed
    """
    __tablename__ = "event_outbox"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    aggregate_type = Column(String(50), nullable=False, index=True)
    aggregate_id = Column(String(36), nullable=False, index=True)
    topic = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False)
    partition_key = Column(String(100), nullable=True)  # For Kafka partitioning
    status = Column(String(20), default=OutboxStatus.PENDING.value, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_outbox_status_created", "status", "created_at"),
        Index("idx_outbox_aggregate", "aggregate_type", "aggregate_id"),
    )


class EventStore(Base):
    """
    Event store for event sourcing.

    Stores all domain events for replay and audit purposes.
    Unlike the outbox (which is temporary), the event store is permanent.
    """
    __tablename__ = "event_store"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), nullable=False, unique=True)
    event_type = Column(String(100), nullable=False, index=True)
    aggregate_type = Column(String(50), nullable=False, index=True)
    aggregate_id = Column(String(36), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)  # Per-aggregate sequence
    payload = Column(JSONB, nullable=False)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_event_store_aggregate_seq", "aggregate_type", "aggregate_id", "sequence_number"),
        Index("idx_event_store_type_time", "event_type", "created_at"),
    )


@dataclass
class OutboxEntry:
    """Data class for outbox entries."""
    event: CloudEvent
    topic: KafkaTopics
    partition_key: Optional[str] = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


class OutboxRepository:
    """
    Repository for managing the event outbox.

    Usage:
        async with session.begin():
            # Business operation
            order = Order(...)
            session.add(order)

            # Add event to outbox (same transaction)
            event = CloudEvent(
                type=EventType.ORDER_CREATED,
                source="/services/order-service",
                data=order.to_dict(),
                subject=order.id,
            )
            outbox_repo.add(session, event, KafkaTopics.ORDERS_EVENTS)
    """

    @staticmethod
    def add(
        session: Session,
        event: CloudEvent,
        topic: KafkaTopics,
        partition_key: Optional[str] = None,
    ) -> EventOutbox:
        """
        Add an event to the outbox within the current transaction.

        Args:
            session: SQLAlchemy session (must be within a transaction)
            event: CloudEvent to publish
            topic: Kafka topic to publish to
            partition_key: Optional key for Kafka partitioning

        Returns:
            Created outbox entry
        """
        # Extract aggregate info from event data
        aggregate_type = "Unknown"
        aggregate_id = event.subject or ""

        if hasattr(event.data, "aggregate_type"):
            aggregate_type = event.data.aggregate_type
        if hasattr(event.data, "aggregate_id"):
            aggregate_id = event.data.aggregate_id

        outbox_entry = EventOutbox(
            event_id=event.id,
            event_type=event.type.value if isinstance(event.type, EventType) else event.type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            topic=topic.value if isinstance(topic, KafkaTopics) else topic,
            payload=event.to_dict(),
            partition_key=partition_key or aggregate_id,
            status=OutboxStatus.PENDING.value,
        )

        session.add(outbox_entry)
        return outbox_entry

    @staticmethod
    def add_to_event_store(
        session: Session,
        event: CloudEvent,
        sequence_number: int,
    ) -> EventStore:
        """
        Add an event to the permanent event store.

        Args:
            session: SQLAlchemy session
            event: CloudEvent to store
            sequence_number: Sequence number within the aggregate

        Returns:
            Created event store entry
        """
        aggregate_type = "Unknown"
        aggregate_id = event.subject or ""

        if hasattr(event.data, "aggregate_type"):
            aggregate_type = event.data.aggregate_type
        if hasattr(event.data, "aggregate_id"):
            aggregate_id = event.data.aggregate_id

        store_entry = EventStore(
            event_id=event.id,
            event_type=event.type.value if isinstance(event.type, EventType) else event.type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            sequence_number=sequence_number,
            payload=event.to_dict(),
            metadata=event.metadata.to_dict(),
        )

        session.add(store_entry)
        return store_entry

    @staticmethod
    def get_pending(session: Session, limit: int = 100) -> List[EventOutbox]:
        """Get pending outbox entries ordered by creation time."""
        return (
            session.query(EventOutbox)
            .filter(EventOutbox.status == OutboxStatus.PENDING.value)
            .order_by(EventOutbox.created_at)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_failed(session: Session, max_retries: int = 3, limit: int = 100) -> List[EventOutbox]:
        """Get failed entries that can be retried."""
        return (
            session.query(EventOutbox)
            .filter(
                EventOutbox.status == OutboxStatus.FAILED.value,
                EventOutbox.retry_count < max_retries,
            )
            .order_by(EventOutbox.created_at)
            .limit(limit)
            .all()
        )

    @staticmethod
    def mark_published(session: Session, entry_id: str) -> None:
        """Mark an outbox entry as published."""
        session.query(EventOutbox).filter(EventOutbox.id == entry_id).update({
            "status": OutboxStatus.PUBLISHED.value,
            "published_at": datetime.now(timezone.utc),
        })

    @staticmethod
    def mark_failed(session: Session, entry_id: str, error: str) -> None:
        """Mark an outbox entry as failed and increment retry count."""
        entry = session.query(EventOutbox).filter(EventOutbox.id == entry_id).first()
        if entry:
            entry.status = OutboxStatus.FAILED.value
            entry.retry_count += 1
            entry.last_error = error

    @staticmethod
    def cleanup_published(session: Session, older_than_hours: int = 24) -> int:
        """
        Delete published entries older than specified hours.

        Returns:
            Number of entries deleted
        """
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(hours=older_than_hours)

        result = (
            session.query(EventOutbox)
            .filter(
                EventOutbox.status == OutboxStatus.PUBLISHED.value,
                EventOutbox.published_at < cutoff,
            )
            .delete()
        )
        return result

    @staticmethod
    def get_events_for_aggregate(
        session: Session,
        aggregate_type: str,
        aggregate_id: str,
    ) -> List[EventStore]:
        """Get all events for a specific aggregate from the event store."""
        return (
            session.query(EventStore)
            .filter(
                EventStore.aggregate_type == aggregate_type,
                EventStore.aggregate_id == aggregate_id,
            )
            .order_by(EventStore.sequence_number)
            .all()
        )

    @staticmethod
    def get_next_sequence_number(
        session: Session,
        aggregate_type: str,
        aggregate_id: str,
    ) -> int:
        """Get the next sequence number for an aggregate."""
        from sqlalchemy import func
        result = (
            session.query(func.max(EventStore.sequence_number))
            .filter(
                EventStore.aggregate_type == aggregate_type,
                EventStore.aggregate_id == aggregate_id,
            )
            .scalar()
        )
        return (result or 0) + 1


# SQL for creating the tables (useful for migrations)
CREATE_OUTBOX_SQL = """
CREATE TABLE IF NOT EXISTS event_outbox (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    partition_key VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON event_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON event_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_id ON event_outbox(event_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type ON event_outbox(event_type);
"""

CREATE_EVENT_STORE_SQL = """
CREATE TABLE IF NOT EXISTS event_store (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    sequence_number INTEGER NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_store_aggregate_seq ON event_store(aggregate_type, aggregate_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_event_store_type_time ON event_store(event_type, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_store_event_id ON event_store(event_id);
"""
