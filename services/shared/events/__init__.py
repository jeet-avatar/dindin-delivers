# Dollor.ai Event Infrastructure
# ================================
# CloudEvents-compatible event system for CQRS/Event Sourcing

from .base import (
    DomainEvent,
    CloudEvent,
    EventMetadata,
    EventType,
    # Domain Events
    OrderCreatedEvent,
    OrderStatusChangedEvent,
    RideRequestedEvent,
    RideMatchedEvent,
    DriverLocationUpdatedEvent,
    DriverStatusChangedEvent,
    PaymentProcessedEvent,
)
from .topics import KafkaTopics, TopicConfig, get_topic_config
from .serialization import EventSerializer, register_event_type, deserialize_event
from .outbox import (
    EventOutbox,
    EventStore,
    OutboxStatus,
    OutboxRepository,
    CREATE_OUTBOX_SQL,
    CREATE_EVENT_STORE_SQL,
)
from .kafka_client import (
    KafkaConfig,
    KafkaProducer,
    KafkaConsumer,
    OutboxProcessor,
    kafka_context,
)

__all__ = [
    # Base Classes
    "DomainEvent",
    "CloudEvent",
    "EventMetadata",
    "EventType",
    # Domain Events
    "OrderCreatedEvent",
    "OrderStatusChangedEvent",
    "RideRequestedEvent",
    "RideMatchedEvent",
    "DriverLocationUpdatedEvent",
    "DriverStatusChangedEvent",
    "PaymentProcessedEvent",
    # Topics
    "KafkaTopics",
    "TopicConfig",
    "get_topic_config",
    # Serialization
    "EventSerializer",
    "register_event_type",
    "deserialize_event",
    # Outbox Pattern
    "EventOutbox",
    "EventStore",
    "OutboxStatus",
    "OutboxRepository",
    "CREATE_OUTBOX_SQL",
    "CREATE_EVENT_STORE_SQL",
    # Kafka Client
    "KafkaConfig",
    "KafkaProducer",
    "KafkaConsumer",
    "OutboxProcessor",
    "kafka_context",
]
