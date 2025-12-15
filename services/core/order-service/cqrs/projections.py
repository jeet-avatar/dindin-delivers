"""
Dollor.ai Order Service - Projections
=====================================

Event projections that update read models (Elasticsearch, Redis) when
domain events are consumed from Kafka.

Projections ensure eventual consistency between the write side (PostgreSQL)
and read side (Elasticsearch) in the CQRS architecture.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared'))

from events import CloudEvent, EventType

logger = logging.getLogger(__name__)


# =============================================================================
# ELASTICSEARCH INDEX MAPPINGS
# =============================================================================

ORDERS_INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "analysis": {
            "analyzer": {
                "order_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding"]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "order_number": {"type": "keyword"},
            "customer_id": {"type": "integer"},
            "customer_name": {
                "type": "text",
                "analyzer": "order_analyzer",
                "fields": {"keyword": {"type": "keyword"}}
            },
            "customer_email": {"type": "keyword"},
            "customer_phone": {"type": "keyword"},
            "vendor_id": {"type": "integer"},
            "vendor_name": {
                "type": "text",
                "analyzer": "order_analyzer",
                "fields": {"keyword": {"type": "keyword"}}
            },
            "driver_id": {"type": "integer"},
            "driver_name": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}}
            },
            "items": {
                "type": "nested",
                "properties": {
                    "menu_item_id": {"type": "integer"},
                    "name": {"type": "text", "analyzer": "order_analyzer"},
                    "quantity": {"type": "integer"},
                    "price": {"type": "float"},
                    "notes": {"type": "text"}
                }
            },
            "subtotal": {"type": "float"},
            "tax_rate": {"type": "float"},
            "tax_amount": {"type": "float"},
            "delivery_fee": {"type": "float"},
            "tip": {"type": "float"},
            "platform_fee": {"type": "float"},
            "total_amount": {"type": "float"},
            "delivery_address": {
                "type": "object",
                "properties": {
                    "street": {"type": "text"},
                    "apartment": {"type": "keyword"},
                    "city": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "zip_code": {"type": "keyword"},
                    "latitude": {"type": "float"},
                    "longitude": {"type": "float"}
                }
            },
            "delivery_location": {"type": "geo_point"},
            "delivery_instructions": {"type": "text"},
            "status": {"type": "keyword"},
            "payment_status": {"type": "keyword"},
            "created_at": {"type": "date"},
            "confirmed_at": {"type": "date"},
            "preparing_at": {"type": "date"},
            "ready_at": {"type": "date"},
            "dispatched_at": {"type": "date"},
            "delivered_at": {"type": "date"},
            "cancelled_at": {"type": "date"},
            "cancellation_reason": {"type": "text"},
            "cancelled_by": {"type": "keyword"},
            # Computed fields for analytics
            "delivery_time_minutes": {"type": "integer"},
            "preparation_time_minutes": {"type": "integer"},
        }
    }
}


# =============================================================================
# PROJECTION BASE CLASS
# =============================================================================

class OrderProjection(ABC):
    """Base class for order projections."""

    @abstractmethod
    async def apply(self, event: CloudEvent) -> bool:
        """
        Apply an event to update the read model.

        Returns True if the projection was applied successfully.
        """
        pass

    @abstractmethod
    async def rebuild(self, events: list) -> int:
        """
        Rebuild the entire projection from a list of events.

        Returns the number of events processed.
        """
        pass


# =============================================================================
# ELASTICSEARCH PROJECTION
# =============================================================================

class OrderElasticsearchProjection(OrderProjection):
    """
    Projection that updates Elasticsearch when order events are received.

    This projection maintains a denormalized view of orders optimized for
    search and filtering operations.
    """

    INDEX_NAME = "orders"

    def __init__(self, elasticsearch_client):
        self.es = elasticsearch_client
        self._handlers = {
            EventType.ORDER_CREATED: self._handle_order_created,
            EventType.ORDER_UPDATED: self._handle_order_updated,
            EventType.ORDER_CONFIRMED: self._handle_order_status_changed,
            EventType.ORDER_PREPARING: self._handle_order_status_changed,
            EventType.ORDER_READY: self._handle_order_status_changed,
            EventType.ORDER_PICKED_UP: self._handle_order_status_changed,
            EventType.ORDER_DELIVERED: self._handle_order_delivered,
            EventType.ORDER_CANCELLED: self._handle_order_cancelled,
            EventType.DRIVER_ASSIGNED: self._handle_driver_assigned,
        }

    async def initialize(self):
        """Create the Elasticsearch index if it doesn't exist."""
        try:
            if not self.es.indices.exists(index=self.INDEX_NAME):
                self.es.indices.create(
                    index=self.INDEX_NAME,
                    body=ORDERS_INDEX_MAPPING
                )
                logger.info(f"Created Elasticsearch index: {self.INDEX_NAME}")
        except Exception as e:
            logger.error(f"Failed to create Elasticsearch index: {e}")
            raise

    async def apply(self, event: CloudEvent) -> bool:
        """Apply an event to update Elasticsearch."""
        event_type = event.type if isinstance(event.type, EventType) else EventType(event.type)
        handler = self._handlers.get(event_type)

        if not handler:
            logger.debug(f"No handler for event type: {event_type}")
            return False

        try:
            await handler(event)
            logger.debug(f"Applied event {event.id} to Elasticsearch")
            return True
        except Exception as e:
            logger.error(f"Failed to apply event {event.id}: {e}")
            return False

    async def rebuild(self, events: list) -> int:
        """Rebuild the Elasticsearch index from events."""
        # Delete and recreate index
        try:
            if self.es.indices.exists(index=self.INDEX_NAME):
                self.es.indices.delete(index=self.INDEX_NAME)
            await self.initialize()
        except Exception as e:
            logger.error(f"Failed to recreate index: {e}")
            raise

        # Apply all events
        count = 0
        for event in events:
            if await self.apply(event):
                count += 1

        logger.info(f"Rebuilt projection from {count} events")
        return count

    # =========================================================================
    # EVENT HANDLERS
    # =========================================================================

    async def _handle_order_created(self, event: CloudEvent):
        """Handle ORDER_CREATED event - create new document."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        doc = {
            "order_number": data.get("order_id"),
            "customer_id": int(data.get("customer_id", 0)),
            "customer_name": "",  # Will be updated from full order data
            "customer_email": "",
            "customer_phone": "",
            "vendor_id": int(data.get("restaurant_id", 0)),
            "vendor_name": "",
            "driver_id": None,
            "driver_name": None,
            "items": data.get("items", []),
            "subtotal": data.get("subtotal", 0),
            "tax_rate": 0,
            "tax_amount": 0,
            "delivery_fee": data.get("delivery_fee", 0),
            "tip": 0,
            "platform_fee": data.get("service_fee", 0),
            "total_amount": data.get("total", 0),
            "delivery_address": data.get("delivery_address", {}),
            "delivery_instructions": data.get("special_instructions"),
            "status": "pending",
            "payment_status": "pending",
            "created_at": event.time,
            "confirmed_at": None,
            "preparing_at": None,
            "ready_at": None,
            "dispatched_at": None,
            "delivered_at": None,
            "cancelled_at": None,
        }

        # Add geo_point if coordinates available
        delivery_addr = data.get("delivery_address", {})
        if delivery_addr.get("latitude") and delivery_addr.get("longitude"):
            doc["delivery_location"] = {
                "lat": delivery_addr["latitude"],
                "lon": delivery_addr["longitude"]
            }

        self.es.index(
            index=self.INDEX_NAME,
            id=data.get("order_id"),
            document=doc,
        )

    async def _handle_order_updated(self, event: CloudEvent):
        """Handle ORDER_UPDATED event - update existing document."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")

        # Partial update
        update_doc = {
            "doc": {
                "status": data.get("new_status", data.get("status")),
            },
            "doc_as_upsert": False
        }

        self.es.update(
            index=self.INDEX_NAME,
            id=order_id,
            body=update_doc,
        )

    async def _handle_order_status_changed(self, event: CloudEvent):
        """Handle status change events."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")
        new_status = data.get("new_status")

        update_fields = {"status": new_status}

        # Update timestamp based on status
        timestamp_field_map = {
            "confirmed": "confirmed_at",
            "preparing": "preparing_at",
            "ready_for_pickup": "ready_at",
            "out_for_delivery": "dispatched_at",
        }

        timestamp_field = timestamp_field_map.get(new_status)
        if timestamp_field:
            update_fields[timestamp_field] = event.time

        self.es.update(
            index=self.INDEX_NAME,
            id=order_id,
            body={"doc": update_fields},
        )

    async def _handle_order_delivered(self, event: CloudEvent):
        """Handle ORDER_DELIVERED event."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")

        # Calculate delivery time if we have both created_at and delivered_at
        update_fields = {
            "status": "delivered",
            "delivered_at": event.time,
        }

        # Get current document to calculate times
        try:
            current_doc = self.es.get(index=self.INDEX_NAME, id=order_id)
            source = current_doc["_source"]

            if source.get("created_at") and event.time:
                created = datetime.fromisoformat(source["created_at"].replace("Z", "+00:00"))
                delivered = datetime.fromisoformat(event.time.replace("Z", "+00:00"))
                delivery_minutes = int((delivered - created).total_seconds() / 60)
                update_fields["delivery_time_minutes"] = delivery_minutes

            if source.get("confirmed_at") and source.get("ready_at"):
                confirmed = datetime.fromisoformat(source["confirmed_at"].replace("Z", "+00:00"))
                ready = datetime.fromisoformat(source["ready_at"].replace("Z", "+00:00"))
                prep_minutes = int((ready - confirmed).total_seconds() / 60)
                update_fields["preparation_time_minutes"] = prep_minutes

        except Exception:
            pass  # Continue without computed fields

        self.es.update(
            index=self.INDEX_NAME,
            id=order_id,
            body={"doc": update_fields},
        )

    async def _handle_order_cancelled(self, event: CloudEvent):
        """Handle ORDER_CANCELLED event."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")

        update_fields = {
            "status": "cancelled",
            "cancelled_at": event.time,
            "cancellation_reason": data.get("reason"),
            "cancelled_by": data.get("changed_by"),
        }

        self.es.update(
            index=self.INDEX_NAME,
            id=order_id,
            body={"doc": update_fields},
        )

    async def _handle_driver_assigned(self, event: CloudEvent):
        """Handle DRIVER_ASSIGNED event."""
        data = event.data
        if isinstance(data, dict):
            order_id = data.get("order_id")
            driver_id = data.get("driver_id")
            driver_name = data.get("driver_name")
            dispatched_at = data.get("dispatched_at")
        else:
            order_id = getattr(data, "order_id", None)
            driver_id = getattr(data, "driver_id", None)
            driver_name = getattr(data, "driver_name", None)
            dispatched_at = getattr(data, "dispatched_at", None)

        update_fields = {
            "driver_id": driver_id,
            "driver_name": driver_name,
            "dispatched_at": dispatched_at or event.time,
        }

        self.es.update(
            index=self.INDEX_NAME,
            id=order_id,
            body={"doc": update_fields},
        )

    # =========================================================================
    # QUERY HELPERS
    # =========================================================================

    def search(
        self,
        query: str = None,
        status: str = None,
        customer_id: int = None,
        vendor_id: int = None,
        driver_id: int = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Search orders in Elasticsearch.

        Returns dict with 'hits' and 'total' keys.
        """
        must_clauses = []
        filter_clauses = []

        if query:
            must_clauses.append({
                "multi_match": {
                    "query": query,
                    "fields": [
                        "order_number^3",
                        "customer_name^2",
                        "vendor_name^2",
                        "items.name",
                    ],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            })

        if status:
            filter_clauses.append({"term": {"status": status}})
        if customer_id:
            filter_clauses.append({"term": {"customer_id": customer_id}})
        if vendor_id:
            filter_clauses.append({"term": {"vendor_id": vendor_id}})
        if driver_id:
            filter_clauses.append({"term": {"driver_id": driver_id}})

        es_query = {
            "bool": {
                "must": must_clauses if must_clauses else [{"match_all": {}}],
                "filter": filter_clauses,
            }
        }

        result = self.es.search(
            index=self.INDEX_NAME,
            query=es_query,
            from_=offset,
            size=limit,
            sort=[{"created_at": "desc"}],
        )

        return {
            "hits": [hit["_source"] for hit in result["hits"]["hits"]],
            "total": result["hits"]["total"]["value"],
        }

    def get_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get a single order by ID."""
        try:
            result = self.es.get(index=self.INDEX_NAME, id=order_id)
            return result["_source"]
        except Exception:
            return None


# =============================================================================
# REDIS PROJECTION (for real-time data)
# =============================================================================

class OrderRedisProjection(OrderProjection):
    """
    Projection that caches active orders in Redis for real-time access.

    Only maintains orders that are currently active (not delivered/cancelled).
    """

    KEY_PREFIX = "order:"
    ACTIVE_ORDERS_KEY = "orders:active"
    TTL_SECONDS = 86400  # 24 hours

    def __init__(self, redis_client):
        self.redis = redis_client

    async def apply(self, event: CloudEvent) -> bool:
        """Apply event to Redis cache."""
        event_type = event.type if isinstance(event.type, EventType) else EventType(event.type)

        try:
            if event_type == EventType.ORDER_CREATED:
                await self._cache_order(event)
            elif event_type in [EventType.ORDER_DELIVERED, EventType.ORDER_CANCELLED]:
                await self._remove_order(event)
            else:
                await self._update_order(event)
            return True
        except Exception as e:
            logger.error(f"Redis projection failed: {e}")
            return False

    async def rebuild(self, events: list) -> int:
        """Rebuild Redis cache from events."""
        # Clear existing cache
        keys = self.redis.keys(f"{self.KEY_PREFIX}*")
        if keys:
            self.redis.delete(*keys)
        self.redis.delete(self.ACTIVE_ORDERS_KEY)

        count = 0
        for event in events:
            if await self.apply(event):
                count += 1
        return count

    async def _cache_order(self, event: CloudEvent):
        """Cache a new order."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")
        key = f"{self.KEY_PREFIX}{order_id}"

        self.redis.hset(key, mapping={
            "order_id": order_id,
            "status": "pending",
            "customer_id": str(data.get("customer_id", "")),
            "vendor_id": str(data.get("restaurant_id", "")),
            "created_at": event.time,
        })
        self.redis.expire(key, self.TTL_SECONDS)
        self.redis.sadd(self.ACTIVE_ORDERS_KEY, order_id)

    async def _update_order(self, event: CloudEvent):
        """Update cached order."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")
        key = f"{self.KEY_PREFIX}{order_id}"

        if self.redis.exists(key):
            updates = {"status": data.get("new_status", data.get("status", ""))}
            if data.get("driver_id"):
                updates["driver_id"] = str(data.get("driver_id"))
            self.redis.hset(key, mapping=updates)

    async def _remove_order(self, event: CloudEvent):
        """Remove completed/cancelled order from cache."""
        data = event.data
        if hasattr(data, "to_dict"):
            data = data.to_dict()

        order_id = data.get("order_id")
        key = f"{self.KEY_PREFIX}{order_id}"

        self.redis.delete(key)
        self.redis.srem(self.ACTIVE_ORDERS_KEY, order_id)

    def get_active_orders(self) -> list:
        """Get all active order IDs."""
        return list(self.redis.smembers(self.ACTIVE_ORDERS_KEY))

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get cached order data."""
        key = f"{self.KEY_PREFIX}{order_id}"
        data = self.redis.hgetall(key)
        return data if data else None
