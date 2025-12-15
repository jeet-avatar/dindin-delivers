# Dollor.ai Kafka Topics Configuration
# =====================================
# Centralized topic definitions for event-driven architecture

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any


class KafkaTopics(str, Enum):
    """
    Kafka topic definitions for Dollor.ai event streaming.

    Naming convention: {domain}.{type}
    - domain: orders, rides, drivers, payments, notifications, restaurants
    - type: commands, events, location, status
    """
    # Order Topics
    ORDERS_COMMANDS = "orders.commands"
    ORDERS_EVENTS = "orders.events"

    # Ride Topics
    RIDES_COMMANDS = "rides.commands"
    RIDES_EVENTS = "rides.events"

    # Driver Topics
    DRIVERS_LOCATION = "drivers.location"
    DRIVERS_STATUS = "drivers.status"
    DRIVERS_EVENTS = "drivers.events"

    # Payment Topics
    PAYMENTS_COMMANDS = "payments.commands"
    PAYMENTS_EVENTS = "payments.events"

    # Restaurant Topics
    RESTAURANTS_EVENTS = "restaurants.events"

    # Notification Topics
    NOTIFICATIONS_SEND = "notifications.send"
    NOTIFICATIONS_STATUS = "notifications.status"

    # User Topics
    USERS_EVENTS = "users.events"

    # Dead Letter Queue
    DLQ = "dlq"


@dataclass
class TopicConfig:
    """Configuration for a Kafka topic."""
    name: str
    partitions: int
    replication_factor: int
    retention_ms: int  # Retention period in milliseconds
    cleanup_policy: str = "delete"  # "delete" or "compact"

    @property
    def retention_hours(self) -> int:
        return self.retention_ms // (1000 * 60 * 60)

    @property
    def retention_days(self) -> int:
        return self.retention_ms // (1000 * 60 * 60 * 24)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "partitions": self.partitions,
            "replication_factor": self.replication_factor,
            "retention.ms": self.retention_ms,
            "cleanup.policy": self.cleanup_policy,
        }


# Topic configurations optimized for Uber/DoorDash scale
TOPIC_CONFIGS: Dict[KafkaTopics, TopicConfig] = {
    # Order Topics - High volume, medium retention
    KafkaTopics.ORDERS_COMMANDS: TopicConfig(
        name=KafkaTopics.ORDERS_COMMANDS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,  # 7 days
    ),
    KafkaTopics.ORDERS_EVENTS: TopicConfig(
        name=KafkaTopics.ORDERS_EVENTS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    ),

    # Ride Topics - Similar to orders
    KafkaTopics.RIDES_COMMANDS: TopicConfig(
        name=KafkaTopics.RIDES_COMMANDS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,  # 7 days
    ),
    KafkaTopics.RIDES_EVENTS: TopicConfig(
        name=KafkaTopics.RIDES_EVENTS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    ),

    # Driver Location - Very high volume, short retention
    # This is the most critical topic for real-time tracking
    KafkaTopics.DRIVERS_LOCATION: TopicConfig(
        name=KafkaTopics.DRIVERS_LOCATION.value,
        partitions=24,  # More partitions for higher throughput
        replication_factor=3,
        retention_ms=1 * 60 * 60 * 1000,  # 1 hour (we only care about recent locations)
    ),
    KafkaTopics.DRIVERS_STATUS: TopicConfig(
        name=KafkaTopics.DRIVERS_STATUS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,  # 7 days
    ),
    KafkaTopics.DRIVERS_EVENTS: TopicConfig(
        name=KafkaTopics.DRIVERS_EVENTS.value,
        partitions=12,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    ),

    # Payment Topics - Lower volume, longer retention for compliance
    KafkaTopics.PAYMENTS_COMMANDS: TopicConfig(
        name=KafkaTopics.PAYMENTS_COMMANDS.value,
        partitions=6,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,  # 7 days
    ),
    KafkaTopics.PAYMENTS_EVENTS: TopicConfig(
        name=KafkaTopics.PAYMENTS_EVENTS.value,
        partitions=6,
        replication_factor=3,
        retention_ms=90 * 24 * 60 * 60 * 1000,  # 90 days for compliance
    ),

    # Restaurant Topics
    KafkaTopics.RESTAURANTS_EVENTS: TopicConfig(
        name=KafkaTopics.RESTAURANTS_EVENTS.value,
        partitions=6,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    ),

    # Notification Topics
    KafkaTopics.NOTIFICATIONS_SEND: TopicConfig(
        name=KafkaTopics.NOTIFICATIONS_SEND.value,
        partitions=6,
        replication_factor=3,
        retention_ms=3 * 24 * 60 * 60 * 1000,  # 3 days
    ),
    KafkaTopics.NOTIFICATIONS_STATUS: TopicConfig(
        name=KafkaTopics.NOTIFICATIONS_STATUS.value,
        partitions=6,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,  # 7 days
    ),

    # User Topics
    KafkaTopics.USERS_EVENTS: TopicConfig(
        name=KafkaTopics.USERS_EVENTS.value,
        partitions=6,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    ),

    # Dead Letter Queue - Long retention for debugging
    KafkaTopics.DLQ: TopicConfig(
        name=KafkaTopics.DLQ.value,
        partitions=3,
        replication_factor=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
        cleanup_policy="compact",
    ),
}


def get_topic_config(topic: KafkaTopics) -> TopicConfig:
    """Get configuration for a specific topic."""
    return TOPIC_CONFIGS.get(topic, TopicConfig(
        name=topic.value,
        partitions=6,
        replication_factor=3,
        retention_ms=7 * 24 * 60 * 60 * 1000,
    ))


def get_all_topic_configs() -> Dict[str, Dict[str, Any]]:
    """Get all topic configurations as a dictionary."""
    return {topic.value: config.to_dict() for topic, config in TOPIC_CONFIGS.items()}
