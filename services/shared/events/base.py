# Dollor.ai Domain Events
# ========================
# Base classes for event-driven architecture following CloudEvents spec v1.0
# https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Generic, Optional, TypeVar

T = TypeVar("T")


class EventType(str, Enum):
    """
    Domain event types following the pattern: dollor.{domain}.{action}
    """
    # Order Events
    ORDER_CREATED = "dollor.orders.created"
    ORDER_UPDATED = "dollor.orders.updated"
    ORDER_CONFIRMED = "dollor.orders.confirmed"
    ORDER_PREPARING = "dollor.orders.preparing"
    ORDER_READY = "dollor.orders.ready"
    ORDER_PICKED_UP = "dollor.orders.picked_up"
    ORDER_DELIVERED = "dollor.orders.delivered"
    ORDER_CANCELLED = "dollor.orders.cancelled"
    ORDER_REFUNDED = "dollor.orders.refunded"

    # Ride Events
    RIDE_REQUESTED = "dollor.rides.requested"
    RIDE_MATCHED = "dollor.rides.matched"
    RIDE_DRIVER_ARRIVED = "dollor.rides.driver_arrived"
    RIDE_STARTED = "dollor.rides.started"
    RIDE_COMPLETED = "dollor.rides.completed"
    RIDE_CANCELLED = "dollor.rides.cancelled"

    # Driver Events
    DRIVER_ONLINE = "dollor.drivers.online"
    DRIVER_OFFLINE = "dollor.drivers.offline"
    DRIVER_LOCATION_UPDATED = "dollor.drivers.location_updated"
    DRIVER_STATUS_CHANGED = "dollor.drivers.status_changed"
    DRIVER_ASSIGNED = "dollor.drivers.assigned"

    # Payment Events
    PAYMENT_INITIATED = "dollor.payments.initiated"
    PAYMENT_PROCESSED = "dollor.payments.processed"
    PAYMENT_FAILED = "dollor.payments.failed"
    PAYMENT_REFUNDED = "dollor.payments.refunded"
    PAYOUT_INITIATED = "dollor.payouts.initiated"
    PAYOUT_COMPLETED = "dollor.payouts.completed"

    # Restaurant Events
    RESTAURANT_OPENED = "dollor.restaurants.opened"
    RESTAURANT_CLOSED = "dollor.restaurants.closed"
    RESTAURANT_ORDER_ACCEPTED = "dollor.restaurants.order_accepted"
    RESTAURANT_ORDER_REJECTED = "dollor.restaurants.order_rejected"

    # Notification Events
    NOTIFICATION_REQUESTED = "dollor.notifications.requested"
    NOTIFICATION_SENT = "dollor.notifications.sent"
    NOTIFICATION_FAILED = "dollor.notifications.failed"

    # User Events
    USER_REGISTERED = "dollor.users.registered"
    USER_VERIFIED = "dollor.users.verified"
    USER_PROFILE_UPDATED = "dollor.users.profile_updated"


@dataclass
class EventMetadata:
    """
    Metadata for tracking and debugging events.
    """
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    causation_id: Optional[str] = None
    user_id: Optional[str] = None
    service_name: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "correlation_id": self.correlation_id,
            "causation_id": self.causation_id,
            "user_id": self.user_id,
            "service_name": self.service_name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> EventMetadata:
        return cls(
            correlation_id=data.get("correlation_id", str(uuid.uuid4())),
            causation_id=data.get("causation_id"),
            user_id=data.get("user_id"),
            service_name=data.get("service_name"),
            trace_id=data.get("trace_id"),
            span_id=data.get("span_id"),
        )


@dataclass
class CloudEvent(Generic[T]):
    """
    CloudEvents v1.0 compliant event envelope.

    Attributes:
        specversion: CloudEvents specification version (always "1.0")
        type: Event type (e.g., "dollor.orders.created")
        source: Event source URI (e.g., "/services/order-service")
        id: Unique event identifier
        time: Event timestamp in ISO 8601 format
        datacontenttype: Content type of the data field
        data: Event payload
        subject: Optional subject identifier (e.g., order_id)
        metadata: Custom metadata for tracing and correlation
    """
    type: EventType
    source: str
    data: T
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    specversion: str = "1.0"
    time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    datacontenttype: str = "application/json"
    subject: Optional[str] = None
    metadata: EventMetadata = field(default_factory=EventMetadata)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to CloudEvents JSON format."""
        result = {
            "specversion": self.specversion,
            "type": self.type.value if isinstance(self.type, EventType) else self.type,
            "source": self.source,
            "id": self.id,
            "time": self.time,
            "datacontenttype": self.datacontenttype,
            "data": self.data if isinstance(self.data, dict) else (
                self.data.to_dict() if hasattr(self.data, "to_dict") else self.data
            ),
            "metadata": self.metadata.to_dict(),
        }
        if self.subject:
            result["subject"] = self.subject
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any], data_class: type = dict) -> CloudEvent:
        """Deserialize from CloudEvents JSON format."""
        event_type = data.get("type")
        if isinstance(event_type, str):
            try:
                event_type = EventType(event_type)
            except ValueError:
                pass  # Keep as string if not in enum

        event_data = data.get("data", {})
        if data_class != dict and hasattr(data_class, "from_dict"):
            event_data = data_class.from_dict(event_data)

        return cls(
            specversion=data.get("specversion", "1.0"),
            type=event_type,
            source=data.get("source", ""),
            id=data.get("id", str(uuid.uuid4())),
            time=data.get("time", datetime.now(timezone.utc).isoformat()),
            datacontenttype=data.get("datacontenttype", "application/json"),
            data=event_data,
            subject=data.get("subject"),
            metadata=EventMetadata.from_dict(data.get("metadata", {})),
        )


class DomainEvent(ABC):
    """
    Base class for domain event data payloads.

    All domain events should inherit from this class and implement
    the required abstract methods.
    """

    @property
    @abstractmethod
    def aggregate_id(self) -> str:
        """Returns the aggregate ID this event belongs to."""
        pass

    @property
    @abstractmethod
    def aggregate_type(self) -> str:
        """Returns the type of aggregate (e.g., 'Order', 'Ride', 'Driver')."""
        pass

    @property
    @abstractmethod
    def event_version(self) -> int:
        """Returns the schema version for this event type."""
        pass

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the event data to a dictionary."""
        pass

    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> DomainEvent:
        """Deserialize the event data from a dictionary."""
        pass


# =============================================================================
# ORDER DOMAIN EVENTS
# =============================================================================

@dataclass
class OrderCreatedEvent(DomainEvent):
    """Event fired when a new food order is created."""
    order_id: str
    customer_id: str
    restaurant_id: str
    items: list
    subtotal: float
    delivery_fee: float
    service_fee: float
    total: float
    delivery_address: Dict[str, Any]
    special_instructions: Optional[str] = None

    @property
    def aggregate_id(self) -> str:
        return self.order_id

    @property
    def aggregate_type(self) -> str:
        return "Order"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "customer_id": self.customer_id,
            "restaurant_id": self.restaurant_id,
            "items": self.items,
            "subtotal": self.subtotal,
            "delivery_fee": self.delivery_fee,
            "service_fee": self.service_fee,
            "total": self.total,
            "delivery_address": self.delivery_address,
            "special_instructions": self.special_instructions,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> OrderCreatedEvent:
        return cls(
            order_id=data["order_id"],
            customer_id=data["customer_id"],
            restaurant_id=data["restaurant_id"],
            items=data["items"],
            subtotal=data["subtotal"],
            delivery_fee=data["delivery_fee"],
            service_fee=data["service_fee"],
            total=data["total"],
            delivery_address=data["delivery_address"],
            special_instructions=data.get("special_instructions"),
        )


@dataclass
class OrderStatusChangedEvent(DomainEvent):
    """Event fired when an order status changes."""
    order_id: str
    previous_status: str
    new_status: str
    changed_by: Optional[str] = None
    reason: Optional[str] = None

    @property
    def aggregate_id(self) -> str:
        return self.order_id

    @property
    def aggregate_type(self) -> str:
        return "Order"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "changed_by": self.changed_by,
            "reason": self.reason,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> OrderStatusChangedEvent:
        return cls(
            order_id=data["order_id"],
            previous_status=data["previous_status"],
            new_status=data["new_status"],
            changed_by=data.get("changed_by"),
            reason=data.get("reason"),
        )


# =============================================================================
# RIDE DOMAIN EVENTS
# =============================================================================

@dataclass
class RideRequestedEvent(DomainEvent):
    """Event fired when a new ride is requested."""
    ride_id: str
    rider_id: str
    pickup_location: Dict[str, Any]  # {lat, lng, address}
    dropoff_location: Dict[str, Any]  # {lat, lng, address}
    ride_type: str  # "standard", "premium", "xl"
    estimated_fare: float
    estimated_distance_km: float
    estimated_duration_minutes: int

    @property
    def aggregate_id(self) -> str:
        return self.ride_id

    @property
    def aggregate_type(self) -> str:
        return "Ride"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ride_id": self.ride_id,
            "rider_id": self.rider_id,
            "pickup_location": self.pickup_location,
            "dropoff_location": self.dropoff_location,
            "ride_type": self.ride_type,
            "estimated_fare": self.estimated_fare,
            "estimated_distance_km": self.estimated_distance_km,
            "estimated_duration_minutes": self.estimated_duration_minutes,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RideRequestedEvent:
        return cls(
            ride_id=data["ride_id"],
            rider_id=data["rider_id"],
            pickup_location=data["pickup_location"],
            dropoff_location=data["dropoff_location"],
            ride_type=data["ride_type"],
            estimated_fare=data["estimated_fare"],
            estimated_distance_km=data["estimated_distance_km"],
            estimated_duration_minutes=data["estimated_duration_minutes"],
        )


@dataclass
class RideMatchedEvent(DomainEvent):
    """Event fired when a driver is matched to a ride."""
    ride_id: str
    driver_id: str
    driver_location: Dict[str, Any]
    eta_minutes: int
    vehicle_info: Dict[str, Any]

    @property
    def aggregate_id(self) -> str:
        return self.ride_id

    @property
    def aggregate_type(self) -> str:
        return "Ride"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ride_id": self.ride_id,
            "driver_id": self.driver_id,
            "driver_location": self.driver_location,
            "eta_minutes": self.eta_minutes,
            "vehicle_info": self.vehicle_info,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RideMatchedEvent:
        return cls(
            ride_id=data["ride_id"],
            driver_id=data["driver_id"],
            driver_location=data["driver_location"],
            eta_minutes=data["eta_minutes"],
            vehicle_info=data["vehicle_info"],
        )


# =============================================================================
# DRIVER DOMAIN EVENTS
# =============================================================================

@dataclass
class DriverLocationUpdatedEvent(DomainEvent):
    """Event fired when a driver's location is updated (high frequency)."""
    driver_id: str
    latitude: float
    longitude: float
    heading: Optional[float] = None  # Direction in degrees
    speed: Optional[float] = None  # Speed in km/h
    accuracy: Optional[float] = None  # GPS accuracy in meters
    h3_index: Optional[str] = None  # H3 hexagon index (resolution 9)

    @property
    def aggregate_id(self) -> str:
        return self.driver_id

    @property
    def aggregate_type(self) -> str:
        return "Driver"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "driver_id": self.driver_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "heading": self.heading,
            "speed": self.speed,
            "accuracy": self.accuracy,
            "h3_index": self.h3_index,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> DriverLocationUpdatedEvent:
        return cls(
            driver_id=data["driver_id"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            heading=data.get("heading"),
            speed=data.get("speed"),
            accuracy=data.get("accuracy"),
            h3_index=data.get("h3_index"),
        )


@dataclass
class DriverStatusChangedEvent(DomainEvent):
    """Event fired when a driver's status changes."""
    driver_id: str
    previous_status: str
    new_status: str  # "online", "offline", "busy", "on_delivery", "on_ride"

    @property
    def aggregate_id(self) -> str:
        return self.driver_id

    @property
    def aggregate_type(self) -> str:
        return "Driver"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "driver_id": self.driver_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> DriverStatusChangedEvent:
        return cls(
            driver_id=data["driver_id"],
            previous_status=data["previous_status"],
            new_status=data["new_status"],
        )


# =============================================================================
# PAYMENT DOMAIN EVENTS
# =============================================================================

@dataclass
class PaymentProcessedEvent(DomainEvent):
    """Event fired when a payment is successfully processed."""
    payment_id: str
    order_id: Optional[str] = None
    ride_id: Optional[str] = None
    customer_id: str = ""
    amount: float = 0.0
    currency: str = "USD"
    payment_method: str = ""  # "card", "wallet", "cash"
    stripe_payment_intent_id: Optional[str] = None

    @property
    def aggregate_id(self) -> str:
        return self.payment_id

    @property
    def aggregate_type(self) -> str:
        return "Payment"

    @property
    def event_version(self) -> int:
        return 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "payment_id": self.payment_id,
            "order_id": self.order_id,
            "ride_id": self.ride_id,
            "customer_id": self.customer_id,
            "amount": self.amount,
            "currency": self.currency,
            "payment_method": self.payment_method,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PaymentProcessedEvent:
        return cls(
            payment_id=data["payment_id"],
            order_id=data.get("order_id"),
            ride_id=data.get("ride_id"),
            customer_id=data.get("customer_id", ""),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "USD"),
            payment_method=data.get("payment_method", ""),
            stripe_payment_intent_id=data.get("stripe_payment_intent_id"),
        )
