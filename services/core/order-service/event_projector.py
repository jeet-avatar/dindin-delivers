"""
Dollor.ai Order Service - Event Projector
==========================================

Background service that consumes order events from Kafka and updates
read models (Elasticsearch, Redis) for the CQRS query side.

This service ensures eventual consistency between the write side (PostgreSQL)
and read side (Elasticsearch/Redis).

Usage:
    # Run standalone
    python event_projector.py

    # Or import and run with order-service
    from event_projector import start_projector
    await start_projector()
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import Optional

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from events import (
    CloudEvent,
    EventType,
    KafkaConfig,
    KafkaConsumer,
    KafkaTopics,
)
from cqrs.projections import (
    OrderElasticsearchProjection,
    OrderRedisProjection,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "order-projector"
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "order-projector-group")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(SERVICE_NAME)


# =============================================================================
# PROJECTOR CLASS
# =============================================================================

class OrderEventProjector:
    """
    Consumes order events from Kafka and updates read models.

    Projections:
    - Elasticsearch: Full-text search, filtering, aggregations
    - Redis: Real-time active order cache

    Events handled:
    - ORDER_CREATED
    - ORDER_UPDATED
    - ORDER_CONFIRMED
    - ORDER_PREPARING
    - ORDER_READY
    - ORDER_PICKED_UP
    - ORDER_DELIVERED
    - ORDER_CANCELLED
    - DRIVER_ASSIGNED
    """

    def __init__(
        self,
        kafka_config: KafkaConfig,
        elasticsearch_client=None,
        redis_client=None,
    ):
        self.kafka_config = kafka_config
        self.consumer: Optional[KafkaConsumer] = None
        self.es_projection: Optional[OrderElasticsearchProjection] = None
        self.redis_projection: Optional[OrderRedisProjection] = None
        self._running = False
        self._events_processed = 0
        self._errors = 0

        # Initialize projections
        if elasticsearch_client:
            self.es_projection = OrderElasticsearchProjection(elasticsearch_client)
            logger.info("Elasticsearch projection enabled")

        if redis_client:
            self.redis_projection = OrderRedisProjection(redis_client)
            logger.info("Redis projection enabled")

    async def start(self):
        """Start the event projector."""
        logger.info("Starting Order Event Projector...")

        # Initialize Elasticsearch index
        if self.es_projection:
            try:
                await self.es_projection.initialize()
                logger.info("Elasticsearch index initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Elasticsearch: {e}")

        # Create Kafka consumer
        self.consumer = KafkaConsumer(self.kafka_config)

        # Register event handlers
        self._register_handlers()

        # Start consuming
        await self.consumer.start([
            KafkaTopics.ORDERS_EVENTS,
            KafkaTopics.PAYMENTS_EVENTS,
        ])

        self._running = True
        logger.info("Order Event Projector started successfully")

    def _register_handlers(self):
        """Register event handlers with the Kafka consumer."""
        if not self.consumer:
            return

        # Order events
        @self.consumer.on(EventType.ORDER_CREATED)
        async def handle_order_created(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_UPDATED)
        async def handle_order_updated(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_CONFIRMED)
        async def handle_order_confirmed(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_PREPARING)
        async def handle_order_preparing(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_READY)
        async def handle_order_ready(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_PICKED_UP)
        async def handle_order_picked_up(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_DELIVERED)
        async def handle_order_delivered(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.ORDER_CANCELLED)
        async def handle_order_cancelled(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.DRIVER_ASSIGNED)
        async def handle_driver_assigned(event: CloudEvent):
            await self._project_event(event)

        @self.consumer.on(EventType.PAYMENT_PROCESSED)
        async def handle_payment_processed(event: CloudEvent):
            await self._project_event(event)

        # Default handler for unknown events
        @self.consumer.default
        async def handle_unknown(event: CloudEvent):
            logger.debug(f"Unhandled event type: {event.type}")

    async def _project_event(self, event: CloudEvent):
        """Apply event to all projections."""
        try:
            # Apply to Elasticsearch
            if self.es_projection:
                es_success = await self.es_projection.apply(event)
                if es_success:
                    logger.debug(f"ES projection applied: {event.id}")

            # Apply to Redis
            if self.redis_projection:
                redis_success = await self.redis_projection.apply(event)
                if redis_success:
                    logger.debug(f"Redis projection applied: {event.id}")

            self._events_processed += 1

            if self._events_processed % 100 == 0:
                logger.info(f"Processed {self._events_processed} events")

        except Exception as e:
            self._errors += 1
            logger.error(f"Failed to project event {event.id}: {e}")

    async def run(self):
        """Run the event consumption loop."""
        if not self.consumer:
            raise RuntimeError("Projector not started. Call start() first.")

        logger.info("Starting event consumption...")
        await self.consumer.consume()

    async def stop(self):
        """Stop the event projector."""
        self._running = False
        if self.consumer:
            await self.consumer.stop()
        logger.info(f"Projector stopped. Processed: {self._events_processed}, Errors: {self._errors}")

    def get_stats(self) -> dict:
        """Get projector statistics."""
        return {
            "running": self._running,
            "events_processed": self._events_processed,
            "errors": self._errors,
            "elasticsearch_enabled": self.es_projection is not None,
            "redis_enabled": self.redis_projection is not None,
        }


# =============================================================================
# STANDALONE RUNNER
# =============================================================================

async def main():
    """Run the event projector as a standalone service."""
    logger.info("=" * 60)
    logger.info("Dollor.ai Order Event Projector")
    logger.info("=" * 60)

    # Initialize clients
    elasticsearch_client = None
    redis_client = None

    # Try to connect to Elasticsearch
    try:
        from elasticsearch import Elasticsearch
        elasticsearch_client = Elasticsearch([ELASTICSEARCH_URL])
        if elasticsearch_client.ping():
            logger.info(f"Connected to Elasticsearch: {ELASTICSEARCH_URL}")
        else:
            logger.warning("Elasticsearch not responding")
            elasticsearch_client = None
    except ImportError:
        logger.warning("elasticsearch package not installed")
    except Exception as e:
        logger.warning(f"Elasticsearch connection failed: {e}")

    # Try to connect to Redis
    try:
        import redis
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        logger.info(f"Connected to Redis: {REDIS_URL}")
    except ImportError:
        logger.warning("redis package not installed")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")

    if not elasticsearch_client and not redis_client:
        logger.warning("No projection backends available. Events will be consumed but not projected.")

    # Create Kafka config
    kafka_config = KafkaConfig(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        client_id=SERVICE_NAME,
        group_id=KAFKA_GROUP_ID,
    )

    # Create and start projector
    projector = OrderEventProjector(
        kafka_config=kafka_config,
        elasticsearch_client=elasticsearch_client,
        redis_client=redis_client,
    )

    try:
        await projector.start()
        await projector.run()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await projector.stop()


async def start_projector(elasticsearch_client=None, redis_client=None):
    """
    Start the projector as part of another service.

    Returns the projector instance for management.
    """
    kafka_config = KafkaConfig(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        client_id=f"{SERVICE_NAME}-embedded",
        group_id=KAFKA_GROUP_ID,
    )

    projector = OrderEventProjector(
        kafka_config=kafka_config,
        elasticsearch_client=elasticsearch_client,
        redis_client=redis_client,
    )

    await projector.start()

    # Start consumption in background
    asyncio.create_task(projector.run())

    return projector


if __name__ == "__main__":
    asyncio.run(main())
