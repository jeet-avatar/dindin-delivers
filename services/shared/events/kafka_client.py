# Dollor.ai Kafka Client
# ======================
# Async Kafka producer and consumer for event-driven architecture

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Awaitable
from contextlib import asynccontextmanager

from .base import CloudEvent, EventType
from .serialization import EventSerializer, deserialize_event
from .topics import KafkaTopics, get_topic_config

logger = logging.getLogger(__name__)


@dataclass
class KafkaConfig:
    """Configuration for Kafka connections."""
    bootstrap_servers: str = "localhost:9092"
    client_id: str = "dollor-service"
    group_id: Optional[str] = None
    auto_offset_reset: str = "earliest"
    enable_auto_commit: bool = True
    max_poll_records: int = 500
    session_timeout_ms: int = 30000
    heartbeat_interval_ms: int = 10000

    # Producer settings
    acks: str = "all"  # Wait for all replicas
    retries: int = 3
    retry_backoff_ms: int = 100
    compression_type: str = "gzip"
    linger_ms: int = 5  # Batch messages for better throughput

    @classmethod
    def from_env(cls) -> KafkaConfig:
        """Create config from environment variables."""
        import os
        return cls(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            client_id=os.getenv("SERVICE_NAME", "dollor-service"),
            group_id=os.getenv("KAFKA_GROUP_ID"),
        )


# Type alias for event handlers
EventHandler = Callable[[CloudEvent], Awaitable[None]]


class KafkaProducer:
    """
    Async Kafka producer for publishing events.

    Usage:
        producer = KafkaProducer(config)
        await producer.start()

        event = CloudEvent(
            type=EventType.ORDER_CREATED,
            source="/services/order-service",
            data={"order_id": "123", ...},
        )
        await producer.publish(KafkaTopics.ORDERS_EVENTS, event)

        await producer.stop()
    """

    def __init__(self, config: KafkaConfig):
        self.config = config
        self._producer = None
        self._started = False

    async def start(self):
        """Start the Kafka producer."""
        try:
            from aiokafka import AIOKafkaProducer
            self._producer = AIOKafkaProducer(
                bootstrap_servers=self.config.bootstrap_servers,
                client_id=self.config.client_id,
                acks=self.config.acks,
                compression_type=self.config.compression_type,
                linger_ms=self.config.linger_ms,
                retries=self.config.retries,
                retry_backoff_ms=self.config.retry_backoff_ms,
            )
            await self._producer.start()
            self._started = True
            logger.info(f"Kafka producer started: {self.config.bootstrap_servers}")
        except ImportError:
            logger.warning("aiokafka not installed, using mock producer")
            self._started = True

    async def stop(self):
        """Stop the Kafka producer."""
        if self._producer:
            await self._producer.stop()
        self._started = False
        logger.info("Kafka producer stopped")

    async def publish(
        self,
        topic: KafkaTopics,
        event: CloudEvent,
        partition_key: Optional[str] = None,
    ) -> bool:
        """
        Publish an event to a Kafka topic.

        Args:
            topic: Target Kafka topic
            event: CloudEvent to publish
            partition_key: Optional key for partitioning (default: event subject)

        Returns:
            True if published successfully
        """
        if not self._started:
            raise RuntimeError("Producer not started. Call start() first.")

        topic_name = topic.value if isinstance(topic, KafkaTopics) else topic
        key = (partition_key or event.subject or event.id).encode("utf-8")
        value = EventSerializer.serialize(event)

        try:
            if self._producer:
                await self._producer.send_and_wait(
                    topic=topic_name,
                    key=key,
                    value=value,
                )
            logger.debug(f"Published event {event.id} to {topic_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish event {event.id}: {e}")
            raise

    async def publish_batch(
        self,
        topic: KafkaTopics,
        events: List[CloudEvent],
    ) -> int:
        """
        Publish multiple events to a topic.

        Args:
            topic: Target Kafka topic
            events: List of CloudEvents to publish

        Returns:
            Number of events published successfully
        """
        count = 0
        for event in events:
            try:
                await self.publish(topic, event)
                count += 1
            except Exception as e:
                logger.error(f"Failed to publish event {event.id}: {e}")
        return count


class KafkaConsumer:
    """
    Async Kafka consumer for processing events.

    Usage:
        consumer = KafkaConsumer(config)

        @consumer.on(EventType.ORDER_CREATED)
        async def handle_order_created(event: CloudEvent):
            order_data = event.data
            print(f"New order: {order_data['order_id']}")

        await consumer.start([KafkaTopics.ORDERS_EVENTS])

        # Run until stopped
        await consumer.consume()

        await consumer.stop()
    """

    def __init__(self, config: KafkaConfig):
        self.config = config
        self._consumer = None
        self._started = False
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._default_handler: Optional[EventHandler] = None
        self._running = False

    def on(self, event_type: EventType) -> Callable[[EventHandler], EventHandler]:
        """
        Decorator to register an event handler.

        Usage:
            @consumer.on(EventType.ORDER_CREATED)
            async def handle_order(event: CloudEvent):
                pass
        """
        def decorator(handler: EventHandler) -> EventHandler:
            type_key = event_type.value if isinstance(event_type, EventType) else event_type
            if type_key not in self._handlers:
                self._handlers[type_key] = []
            self._handlers[type_key].append(handler)
            return handler
        return decorator

    def default(self, handler: EventHandler) -> EventHandler:
        """Register a default handler for unhandled event types."""
        self._default_handler = handler
        return handler

    async def start(self, topics: List[KafkaTopics]):
        """Start consuming from the specified topics."""
        topic_names = [t.value if isinstance(t, KafkaTopics) else t for t in topics]

        try:
            from aiokafka import AIOKafkaConsumer
            self._consumer = AIOKafkaConsumer(
                *topic_names,
                bootstrap_servers=self.config.bootstrap_servers,
                client_id=self.config.client_id,
                group_id=self.config.group_id,
                auto_offset_reset=self.config.auto_offset_reset,
                enable_auto_commit=self.config.enable_auto_commit,
                max_poll_records=self.config.max_poll_records,
                session_timeout_ms=self.config.session_timeout_ms,
                heartbeat_interval_ms=self.config.heartbeat_interval_ms,
            )
            await self._consumer.start()
            self._started = True
            logger.info(f"Kafka consumer started: {topic_names}")
        except ImportError:
            logger.warning("aiokafka not installed, consumer disabled")
            self._started = True

    async def stop(self):
        """Stop the consumer."""
        self._running = False
        if self._consumer:
            await self._consumer.stop()
        self._started = False
        logger.info("Kafka consumer stopped")

    async def consume(self):
        """
        Start consuming messages and dispatching to handlers.

        This method runs until stop() is called.
        """
        if not self._started:
            raise RuntimeError("Consumer not started. Call start() first.")

        self._running = True
        logger.info("Starting event consumption loop")

        while self._running:
            if self._consumer:
                try:
                    async for msg in self._consumer:
                        if not self._running:
                            break
                        await self._process_message(msg)
                except Exception as e:
                    if self._running:
                        logger.error(f"Error consuming messages: {e}")
                        await asyncio.sleep(1)  # Back off on error
            else:
                await asyncio.sleep(0.1)

    async def _process_message(self, msg):
        """Process a single Kafka message."""
        try:
            event = deserialize_event(msg.value)
            type_key = event.type.value if isinstance(event.type, EventType) else event.type

            handlers = self._handlers.get(type_key, [])
            if handlers:
                for handler in handlers:
                    try:
                        await handler(event)
                    except Exception as e:
                        logger.error(f"Handler error for {type_key}: {e}")
            elif self._default_handler:
                await self._default_handler(event)
            else:
                logger.debug(f"No handler for event type: {type_key}")

        except Exception as e:
            logger.error(f"Failed to process message: {e}")


class OutboxProcessor:
    """
    Background processor that publishes events from the outbox to Kafka.

    This ensures reliable event publishing by reading from the transactional
    outbox and publishing to Kafka with proper retry logic.

    Usage:
        processor = OutboxProcessor(
            producer=kafka_producer,
            session_factory=get_db_session,
        )
        await processor.run()
    """

    def __init__(
        self,
        producer: KafkaProducer,
        session_factory: Callable,
        poll_interval_seconds: float = 1.0,
        batch_size: int = 100,
        max_retries: int = 3,
    ):
        self.producer = producer
        self.session_factory = session_factory
        self.poll_interval = poll_interval_seconds
        self.batch_size = batch_size
        self.max_retries = max_retries
        self._running = False

    async def run(self):
        """
        Start the outbox processor.

        This continuously polls the outbox table and publishes pending events.
        """
        from .outbox import OutboxRepository, OutboxStatus

        self._running = True
        logger.info("Outbox processor started")

        while self._running:
            try:
                with self.session_factory() as session:
                    # Get pending entries
                    entries = OutboxRepository.get_pending(session, self.batch_size)

                    for entry in entries:
                        try:
                            # Reconstruct CloudEvent from payload
                            event = CloudEvent.from_dict(entry.payload)

                            # Publish to Kafka
                            await self.producer.publish(
                                topic=entry.topic,
                                event=event,
                                partition_key=entry.partition_key,
                            )

                            # Mark as published
                            OutboxRepository.mark_published(session, entry.id)
                            logger.debug(f"Published outbox entry: {entry.id}")

                        except Exception as e:
                            OutboxRepository.mark_failed(session, entry.id, str(e))
                            logger.error(f"Failed to publish outbox entry {entry.id}: {e}")

                    # Also retry failed entries
                    failed_entries = OutboxRepository.get_failed(
                        session, self.max_retries, self.batch_size
                    )

                    for entry in failed_entries:
                        try:
                            event = CloudEvent.from_dict(entry.payload)
                            await self.producer.publish(
                                topic=entry.topic,
                                event=event,
                                partition_key=entry.partition_key,
                            )
                            OutboxRepository.mark_published(session, entry.id)
                            logger.info(f"Retry succeeded for outbox entry: {entry.id}")
                        except Exception as e:
                            OutboxRepository.mark_failed(session, entry.id, str(e))

                    session.commit()

            except Exception as e:
                logger.error(f"Outbox processor error: {e}")

            await asyncio.sleep(self.poll_interval)

    def stop(self):
        """Stop the outbox processor."""
        self._running = False
        logger.info("Outbox processor stopping")


@asynccontextmanager
async def kafka_context(config: KafkaConfig):
    """
    Context manager for Kafka producer lifecycle.

    Usage:
        async with kafka_context(config) as producer:
            await producer.publish(topic, event)
    """
    producer = KafkaProducer(config)
    await producer.start()
    try:
        yield producer
    finally:
        await producer.stop()
