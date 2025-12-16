"""
Dollor.ai - WebSocket Server for Real-Time Location Tracking
============================================================

Real-time WebSocket server for:
- Live driver location updates to customers
- Order tracking updates
- Driver availability notifications
- ETA updates

Architecture:
- Customers subscribe to specific order/driver tracking
- Drivers publish location updates
- Server broadcasts updates to interested parties
- Kafka integration for cross-service events
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import os
import sys

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

logger = logging.getLogger(__name__)


# =============================================================================
# MESSAGE TYPES
# =============================================================================

class MessageType(str, Enum):
    """WebSocket message types."""
    # Client -> Server
    SUBSCRIBE_ORDER = "subscribe_order"
    SUBSCRIBE_DRIVER = "subscribe_driver"
    UNSUBSCRIBE = "unsubscribe"
    PING = "ping"

    # Server -> Client
    LOCATION_UPDATE = "location_update"
    ORDER_STATUS_UPDATE = "order_status_update"
    ETA_UPDATE = "eta_update"
    DRIVER_ASSIGNED = "driver_assigned"
    ERROR = "error"
    PONG = "pong"
    SUBSCRIBED = "subscribed"


class WSMessage(BaseModel):
    """WebSocket message structure."""
    type: str
    payload: Dict[str, Any] = {}
    timestamp: Optional[str] = None


# =============================================================================
# CONNECTION MANAGER
# =============================================================================

@dataclass
class WebSocketConnection:
    """Represents a WebSocket connection."""
    websocket: WebSocket
    client_id: str
    user_type: str  # customer, driver, admin
    user_id: Optional[int] = None
    subscriptions: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_ping: datetime = field(default_factory=datetime.utcnow)


class ConnectionManager:
    """
    Manages WebSocket connections and message routing.

    Subscription Keys:
    - order:{order_id} - Subscribe to order updates
    - driver:{driver_id} - Subscribe to driver location
    - zone:{h3_index} - Subscribe to zone activity (admin)
    """

    def __init__(self):
        # Active connections by client_id
        self.connections: Dict[str, WebSocketConnection] = {}

        # Subscription index: subscription_key -> Set[client_id]
        self.subscriptions: Dict[str, Set[str]] = {}

        # Driver connections (for quick lookup)
        self.driver_connections: Dict[int, str] = {}  # driver_id -> client_id

        # Statistics
        self.total_messages_sent = 0
        self.total_messages_received = 0

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str,
        user_type: str = "customer",
        user_id: Optional[int] = None,
    ):
        """
        Accept new WebSocket connection.

        Args:
            websocket: FastAPI WebSocket instance
            client_id: Unique client identifier
            user_type: Type of user (customer, driver, admin)
            user_id: Optional user ID from authentication
        """
        await websocket.accept()

        connection = WebSocketConnection(
            websocket=websocket,
            client_id=client_id,
            user_type=user_type,
            user_id=user_id,
        )

        self.connections[client_id] = connection

        # Track driver connections
        if user_type == "driver" and user_id:
            self.driver_connections[user_id] = client_id

        logger.info(f"WebSocket connected: {client_id} ({user_type})")

        # Send welcome message
        await self.send_to_client(client_id, WSMessage(
            type="connected",
            payload={
                "client_id": client_id,
                "server_time": datetime.utcnow().isoformat(),
            }
        ))

    def disconnect(self, client_id: str):
        """
        Handle client disconnection.

        Args:
            client_id: Client identifier to disconnect
        """
        if client_id not in self.connections:
            return

        connection = self.connections[client_id]

        # Remove from all subscriptions
        for sub_key in connection.subscriptions:
            if sub_key in self.subscriptions:
                self.subscriptions[sub_key].discard(client_id)
                if not self.subscriptions[sub_key]:
                    del self.subscriptions[sub_key]

        # Remove from driver connections
        if connection.user_type == "driver" and connection.user_id:
            self.driver_connections.pop(connection.user_id, None)

        del self.connections[client_id]
        logger.info(f"WebSocket disconnected: {client_id}")

    async def subscribe(self, client_id: str, subscription_key: str):
        """
        Subscribe client to a topic.

        Args:
            client_id: Client identifier
            subscription_key: Topic key (e.g., "order:123", "driver:456")
        """
        if client_id not in self.connections:
            return

        connection = self.connections[client_id]
        connection.subscriptions.add(subscription_key)

        if subscription_key not in self.subscriptions:
            self.subscriptions[subscription_key] = set()
        self.subscriptions[subscription_key].add(client_id)

        logger.debug(f"Client {client_id} subscribed to {subscription_key}")

        await self.send_to_client(client_id, WSMessage(
            type=MessageType.SUBSCRIBED,
            payload={"subscription": subscription_key}
        ))

    async def unsubscribe(self, client_id: str, subscription_key: str):
        """
        Unsubscribe client from a topic.

        Args:
            client_id: Client identifier
            subscription_key: Topic key
        """
        if client_id not in self.connections:
            return

        connection = self.connections[client_id]
        connection.subscriptions.discard(subscription_key)

        if subscription_key in self.subscriptions:
            self.subscriptions[subscription_key].discard(client_id)

        logger.debug(f"Client {client_id} unsubscribed from {subscription_key}")

    async def send_to_client(self, client_id: str, message: WSMessage):
        """
        Send message to specific client.

        Args:
            client_id: Target client identifier
            message: WSMessage to send
        """
        if client_id not in self.connections:
            return

        connection = self.connections[client_id]
        message.timestamp = datetime.utcnow().isoformat()

        try:
            await connection.websocket.send_json(message.model_dump())
            self.total_messages_sent += 1
        except Exception as e:
            logger.error(f"Failed to send to {client_id}: {e}")
            self.disconnect(client_id)

    async def broadcast_to_subscription(self, subscription_key: str, message: WSMessage):
        """
        Broadcast message to all subscribers of a topic.

        Args:
            subscription_key: Topic key
            message: WSMessage to broadcast
        """
        if subscription_key not in self.subscriptions:
            return

        message.timestamp = datetime.utcnow().isoformat()
        data = message.model_dump()

        for client_id in list(self.subscriptions[subscription_key]):
            if client_id in self.connections:
                try:
                    await self.connections[client_id].websocket.send_json(data)
                    self.total_messages_sent += 1
                except Exception as e:
                    logger.error(f"Broadcast failed to {client_id}: {e}")
                    self.disconnect(client_id)

    async def broadcast_driver_location(
        self,
        driver_id: int,
        latitude: float,
        longitude: float,
        heading: Optional[float] = None,
        speed: Optional[float] = None,
        eta_minutes: Optional[int] = None,
    ):
        """
        Broadcast driver location update to all subscribers.

        Args:
            driver_id: Driver identifier
            latitude: Current latitude
            longitude: Current longitude
            heading: Direction in degrees
            speed: Speed in km/h
            eta_minutes: Estimated time of arrival
        """
        subscription_key = f"driver:{driver_id}"

        message = WSMessage(
            type=MessageType.LOCATION_UPDATE,
            payload={
                "driver_id": driver_id,
                "latitude": latitude,
                "longitude": longitude,
                "heading": heading,
                "speed": speed,
                "eta_minutes": eta_minutes,
            }
        )

        await self.broadcast_to_subscription(subscription_key, message)

    async def broadcast_order_update(
        self,
        order_id: int,
        status: str,
        driver_id: Optional[int] = None,
        eta_minutes: Optional[int] = None,
        message_text: Optional[str] = None,
    ):
        """
        Broadcast order status update.

        Args:
            order_id: Order identifier
            status: New order status
            driver_id: Assigned driver ID
            eta_minutes: Estimated arrival time
            message_text: Optional status message
        """
        subscription_key = f"order:{order_id}"

        message = WSMessage(
            type=MessageType.ORDER_STATUS_UPDATE,
            payload={
                "order_id": order_id,
                "status": status,
                "driver_id": driver_id,
                "eta_minutes": eta_minutes,
                "message": message_text,
            }
        )

        await self.broadcast_to_subscription(subscription_key, message)

    async def notify_driver_assigned(
        self,
        order_id: int,
        driver_id: int,
        driver_name: str,
        driver_photo: Optional[str] = None,
        vehicle_info: Optional[str] = None,
        eta_minutes: Optional[int] = None,
    ):
        """
        Notify customer that driver has been assigned.

        Args:
            order_id: Order identifier
            driver_id: Assigned driver ID
            driver_name: Driver's name
            driver_photo: Driver's photo URL
            vehicle_info: Vehicle description
            eta_minutes: Initial ETA
        """
        subscription_key = f"order:{order_id}"

        message = WSMessage(
            type=MessageType.DRIVER_ASSIGNED,
            payload={
                "order_id": order_id,
                "driver_id": driver_id,
                "driver_name": driver_name,
                "driver_photo": driver_photo,
                "vehicle_info": vehicle_info,
                "eta_minutes": eta_minutes,
            }
        )

        await self.broadcast_to_subscription(subscription_key, message)

        # Also notify anyone tracking the driver
        driver_sub_key = f"driver:{driver_id}"
        await self.broadcast_to_subscription(driver_sub_key, message)

    async def handle_message(self, client_id: str, data: dict):
        """
        Handle incoming WebSocket message.

        Args:
            client_id: Source client identifier
            data: Message data
        """
        self.total_messages_received += 1

        message_type = data.get("type", "")
        payload = data.get("payload", {})

        if message_type == MessageType.PING:
            await self.send_to_client(client_id, WSMessage(
                type=MessageType.PONG,
                payload={"server_time": datetime.utcnow().isoformat()}
            ))

        elif message_type == MessageType.SUBSCRIBE_ORDER:
            order_id = payload.get("order_id")
            if order_id:
                await self.subscribe(client_id, f"order:{order_id}")

        elif message_type == MessageType.SUBSCRIBE_DRIVER:
            driver_id = payload.get("driver_id")
            if driver_id:
                await self.subscribe(client_id, f"driver:{driver_id}")

        elif message_type == MessageType.UNSUBSCRIBE:
            subscription = payload.get("subscription")
            if subscription:
                await self.unsubscribe(client_id, subscription)

        else:
            await self.send_to_client(client_id, WSMessage(
                type=MessageType.ERROR,
                payload={"error": f"Unknown message type: {message_type}"}
            ))

    def get_statistics(self) -> dict:
        """Get WebSocket server statistics."""
        return {
            "total_connections": len(self.connections),
            "drivers_online": len(self.driver_connections),
            "active_subscriptions": len(self.subscriptions),
            "total_subscription_count": sum(len(s) for s in self.subscriptions.values()),
            "messages_sent": self.total_messages_sent,
            "messages_received": self.total_messages_received,
        }


# =============================================================================
# GLOBAL CONNECTION MANAGER
# =============================================================================

connection_manager = ConnectionManager()


# =============================================================================
# WEBSOCKET ENDPOINT HANDLER
# =============================================================================

async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    user_type: str = "customer",
    user_id: Optional[int] = None,
):
    """
    Handle WebSocket connection lifecycle.

    Usage in FastAPI:
        @app.websocket("/ws/{client_id}")
        async def websocket_route(websocket: WebSocket, client_id: str):
            await websocket_endpoint(websocket, client_id)

    Args:
        websocket: FastAPI WebSocket instance
        client_id: Unique client identifier
        user_type: Type of user
        user_id: Optional authenticated user ID
    """
    await connection_manager.connect(websocket, client_id, user_type, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            await connection_manager.handle_message(client_id, data)
    except WebSocketDisconnect:
        connection_manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        connection_manager.disconnect(client_id)


# =============================================================================
# KAFKA CONSUMER FOR LOCATION EVENTS
# =============================================================================

class LocationEventConsumer:
    """
    Consumes location events from Kafka and broadcasts via WebSocket.

    Listens to:
    - drivers.location - Real-time driver positions
    - orders.events - Order status changes
    """

    def __init__(self, kafka_consumer=None):
        self.kafka_consumer = kafka_consumer
        self._running = False

    async def start(self):
        """Start consuming location events."""
        if not self.kafka_consumer:
            logger.warning("Kafka consumer not configured")
            return

        self._running = True
        logger.info("Location event consumer started")

        try:
            from events import EventType, KafkaTopics

            @self.kafka_consumer.on(EventType.DRIVER_LOCATION_UPDATED)
            async def handle_location_update(event):
                data = event.data
                if hasattr(data, "to_dict"):
                    data = data.to_dict()

                await connection_manager.broadcast_driver_location(
                    driver_id=data.get("driver_id"),
                    latitude=data.get("latitude"),
                    longitude=data.get("longitude"),
                    heading=data.get("heading"),
                    speed=data.get("speed"),
                    eta_minutes=data.get("eta_minutes"),
                )

            @self.kafka_consumer.on(EventType.ORDER_UPDATED)
            async def handle_order_update(event):
                data = event.data
                if hasattr(data, "to_dict"):
                    data = data.to_dict()

                await connection_manager.broadcast_order_update(
                    order_id=data.get("order_id"),
                    status=data.get("new_status") or data.get("status"),
                    driver_id=data.get("driver_id"),
                    eta_minutes=data.get("eta_minutes"),
                )

            @self.kafka_consumer.on(EventType.DRIVER_ASSIGNED)
            async def handle_driver_assigned(event):
                data = event.data
                if hasattr(data, "to_dict"):
                    data = data.to_dict()

                await connection_manager.notify_driver_assigned(
                    order_id=data.get("order_id"),
                    driver_id=data.get("driver_id"),
                    driver_name=data.get("driver_name", ""),
                    driver_photo=data.get("driver_photo"),
                    vehicle_info=data.get("vehicle_info"),
                    eta_minutes=data.get("eta_minutes"),
                )

            await self.kafka_consumer.start([
                KafkaTopics.DRIVERS_LOCATION,
                KafkaTopics.ORDERS_EVENTS,
            ])

            await self.kafka_consumer.consume()

        except ImportError:
            logger.warning("Kafka events module not available")
        except Exception as e:
            logger.error(f"Kafka consumer error: {e}")

    def stop(self):
        """Stop consuming events."""
        self._running = False
        if self.kafka_consumer:
            asyncio.create_task(self.kafka_consumer.stop())
