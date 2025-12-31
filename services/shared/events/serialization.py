# Dollor.ai Event Serialization
# ==============================
# JSON serialization for CloudEvents with schema validation

from __future__ import annotations

import json
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional, Type, TypeVar
from uuid import UUID

from .base import CloudEvent, DomainEvent, EventType, EventMetadata

T = TypeVar("T", bound=DomainEvent)


class EventEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles common Python types.
    """

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, Enum):
            return obj.value
        if isinstance(obj, bytes):
            return obj.decode("utf-8")
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)


class EventSerializer:
    """
    Serializer for CloudEvents following the JSON format specification.
    """

    @staticmethod
    def serialize(event: CloudEvent) -> bytes:
        """
        Serialize a CloudEvent to JSON bytes for Kafka.

        Args:
            event: CloudEvent to serialize

        Returns:
            UTF-8 encoded JSON bytes
        """
        return json.dumps(
            event.to_dict(),
            cls=EventEncoder,
            ensure_ascii=False,
        ).encode("utf-8")

    @staticmethod
    def deserialize(
        data: bytes,
        data_class: Type[T] = None,
    ) -> CloudEvent:
        """
        Deserialize JSON bytes to a CloudEvent.

        Args:
            data: UTF-8 encoded JSON bytes
            data_class: Optional class to deserialize the data field into

        Returns:
            CloudEvent instance
        """
        json_data = json.loads(data.decode("utf-8"))
        return CloudEvent.from_dict(json_data, data_class or dict)

    @staticmethod
    def serialize_dict(data: Dict[str, Any]) -> bytes:
        """Serialize a dictionary to JSON bytes."""
        return json.dumps(
            data,
            cls=EventEncoder,
            ensure_ascii=False,
        ).encode("utf-8")

    @staticmethod
    def deserialize_dict(data: bytes) -> Dict[str, Any]:
        """Deserialize JSON bytes to a dictionary."""
        return json.loads(data.decode("utf-8"))


# Registry of event types to data classes for automatic deserialization
EVENT_TYPE_REGISTRY: Dict[EventType, Type[DomainEvent]] = {}


def register_event_type(event_type: EventType, data_class: Type[DomainEvent]):
    """
    Register a data class for automatic deserialization of events.

    Usage:
        register_event_type(EventType.ORDER_CREATED, OrderCreatedEvent)
    """
    EVENT_TYPE_REGISTRY[event_type] = data_class


def get_event_class(event_type: EventType) -> Optional[Type[DomainEvent]]:
    """Get the registered data class for an event type."""
    return EVENT_TYPE_REGISTRY.get(event_type)


def deserialize_event(data: bytes) -> CloudEvent:
    """
    Deserialize an event with automatic type detection.

    If the event type is registered, the data field will be
    deserialized into the appropriate class.
    """
    json_data = json.loads(data.decode("utf-8"))
    event_type_str = json_data.get("type")

    try:
        event_type = EventType(event_type_str)
        data_class = get_event_class(event_type)
    except (ValueError, KeyError):
        event_type = event_type_str
        data_class = None

    return CloudEvent.from_dict(json_data, data_class or dict)


# Auto-register known event types
def _auto_register_events():
    """Automatically register all known event types from base module."""
    from . import base

    # Order events
    if hasattr(base, "OrderCreatedEvent"):
        register_event_type(EventType.ORDER_CREATED, base.OrderCreatedEvent)
    if hasattr(base, "OrderStatusChangedEvent"):
        register_event_type(EventType.ORDER_UPDATED, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_CONFIRMED, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_PREPARING, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_READY, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_PICKED_UP, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_DELIVERED, base.OrderStatusChangedEvent)
        register_event_type(EventType.ORDER_CANCELLED, base.OrderStatusChangedEvent)

    # Ride events
    if hasattr(base, "RideRequestedEvent"):
        register_event_type(EventType.RIDE_REQUESTED, base.RideRequestedEvent)
    if hasattr(base, "RideMatchedEvent"):
        register_event_type(EventType.RIDE_MATCHED, base.RideMatchedEvent)

    # Driver events
    if hasattr(base, "DriverLocationUpdatedEvent"):
        register_event_type(EventType.DRIVER_LOCATION_UPDATED, base.DriverLocationUpdatedEvent)
    if hasattr(base, "DriverStatusChangedEvent"):
        register_event_type(EventType.DRIVER_STATUS_CHANGED, base.DriverStatusChangedEvent)
        register_event_type(EventType.DRIVER_ONLINE, base.DriverStatusChangedEvent)
        register_event_type(EventType.DRIVER_OFFLINE, base.DriverStatusChangedEvent)

    # Payment events
    if hasattr(base, "PaymentProcessedEvent"):
        register_event_type(EventType.PAYMENT_PROCESSED, base.PaymentProcessedEvent)


# Run auto-registration on module load
_auto_register_events()
