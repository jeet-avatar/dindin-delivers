"""
Dollor.ai - Real-Time Location System Integration
=================================================

This module integrates all Phase 3 components:
- H3 Hexagonal Grid Indexing
- Redis Geo for driver positions
- WebSocket Server for live tracking
- Driver Matching Algorithm

Use this module to add real-time features to the location-service.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import redis

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from h3_index import (
    H3SpatialIndex,
    IndexedDriver,
    lat_lng_to_h3,
    get_h3_neighbors,
    h3_to_lat_lng,
    visualize_h3_coverage,
    DEFAULT_RESOLUTION,
    H3Resolution,
)
from websocket_server import (
    ConnectionManager,
    websocket_endpoint,
    connection_manager,
    LocationEventConsumer,
)
from driver_matching import (
    DriverMatcher,
    MatchRequest,
    MatchResult,
    OrderType,
    SurgePricingCalculator,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "false").lower() == "true"


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class RealTimeLocationUpdate(BaseModel):
    """Real-time location update from driver app."""
    driver_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    heading: Optional[float] = Field(None, ge=0, lt=360)
    speed: Optional[float] = Field(None, ge=0)
    accuracy: Optional[float] = Field(None, ge=0)
    is_available: bool = True
    is_on_delivery: bool = False
    current_order_id: Optional[int] = None
    rating: float = Field(default=5.0, ge=1, le=5)
    acceptance_rate: float = Field(default=1.0, ge=0, le=1)


class MatchDriverRequest(BaseModel):
    """Request to match a driver to an order."""
    order_id: int
    order_type: str = "food_delivery"
    pickup_latitude: float = Field(..., ge=-90, le=90)
    pickup_longitude: float = Field(..., ge=-180, le=180)
    dropoff_latitude: float = Field(..., ge=-90, le=90)
    dropoff_longitude: float = Field(..., ge=-180, le=180)
    max_eta_minutes: int = Field(default=30, ge=5, le=60)
    priority: int = Field(default=1, ge=1, le=10)


class H3CellRequest(BaseModel):
    """Request for H3 cell information."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    resolution: int = Field(default=DEFAULT_RESOLUTION, ge=0, le=15)


class SurgeRequest(BaseModel):
    """Request for surge pricing calculation."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    pending_orders: int = Field(default=0, ge=0)


# =============================================================================
# REAL-TIME SERVICE
# =============================================================================

class RealTimeLocationService:
    """
    Real-time location service integrating all Phase 3 components.

    Features:
    - H3 spatial indexing for efficient driver lookups
    - Real-time WebSocket broadcasts
    - Intelligent driver matching
    - Surge pricing calculation
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.h3_index = H3SpatialIndex(redis_client)
        self.matcher = DriverMatcher(self.h3_index)
        self.surge_calculator = SurgePricingCalculator()
        self.event_consumer: Optional[LocationEventConsumer] = None
        self._initialized = False

    async def initialize(self):
        """Initialize the service."""
        if self._initialized:
            return

        # Start Kafka consumer if enabled
        if ENABLE_KAFKA:
            try:
                from events import KafkaConfig, KafkaConsumer

                kafka_config = KafkaConfig(
                    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                    client_id="location-realtime-service",
                    group_id="location-realtime-group",
                )
                kafka_consumer = KafkaConsumer(kafka_config)
                self.event_consumer = LocationEventConsumer(kafka_consumer)
                asyncio.create_task(self.event_consumer.start())
                logger.info("Kafka event consumer started")
            except ImportError:
                logger.warning("Kafka events module not available")
            except Exception as e:
                logger.error(f"Failed to start Kafka consumer: {e}")

        self._initialized = True
        logger.info("Real-time location service initialized")

    async def shutdown(self):
        """Shutdown the service."""
        if self.event_consumer:
            self.event_consumer.stop()
        logger.info("Real-time location service shutdown")

    async def update_driver_location(
        self,
        update: RealTimeLocationUpdate,
    ) -> Dict[str, Any]:
        """
        Update driver location in H3 index and broadcast.

        Args:
            update: Location update data

        Returns:
            Response with H3 cell info
        """
        # Update H3 index
        h3_cell = await self.h3_index.update_driver_location(
            driver_id=update.driver_id,
            latitude=update.latitude,
            longitude=update.longitude,
            is_available=update.is_available,
            is_on_delivery=update.is_on_delivery,
            rating=update.rating,
            acceptance_rate=update.acceptance_rate,
            current_order_id=update.current_order_id,
        )

        # Broadcast via WebSocket
        await connection_manager.broadcast_driver_location(
            driver_id=update.driver_id,
            latitude=update.latitude,
            longitude=update.longitude,
            heading=update.heading,
            speed=update.speed,
        )

        return {
            "driver_id": update.driver_id,
            "h3_cell": h3_cell,
            "latitude": update.latitude,
            "longitude": update.longitude,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def find_match(self, request: MatchDriverRequest) -> MatchResult:
        """
        Find best driver match for an order.

        Args:
            request: Match request

        Returns:
            Match result with candidates
        """
        match_request = MatchRequest(
            order_id=request.order_id,
            order_type=OrderType(request.order_type),
            pickup_latitude=request.pickup_latitude,
            pickup_longitude=request.pickup_longitude,
            dropoff_latitude=request.dropoff_latitude,
            dropoff_longitude=request.dropoff_longitude,
            max_eta_minutes=request.max_eta_minutes,
            priority=request.priority,
        )

        return await self.matcher.find_best_match(match_request)

    async def get_h3_cell_info(
        self,
        latitude: float,
        longitude: float,
        resolution: int = DEFAULT_RESOLUTION,
    ) -> Dict[str, Any]:
        """
        Get H3 cell information for a location.

        Args:
            latitude: Location latitude
            longitude: Location longitude
            resolution: H3 resolution

        Returns:
            H3 cell data
        """
        h3_cell = lat_lng_to_h3(latitude, longitude, resolution)
        center = h3_to_lat_lng(h3_cell)
        neighbors = get_h3_neighbors(h3_cell, k_ring=1)

        # Get cell statistics
        stats = await self.h3_index.get_cell_statistics(h3_cell)

        return {
            "h3_index": h3_cell,
            "center": {"latitude": center[0], "longitude": center[1]},
            "resolution": resolution,
            "neighbors": neighbors,
            "statistics": stats,
        }

    async def calculate_surge(
        self,
        latitude: float,
        longitude: float,
        pending_orders: int = 0,
    ) -> Dict[str, Any]:
        """
        Calculate surge pricing for a location.

        Args:
            latitude: Location latitude
            longitude: Location longitude
            pending_orders: Number of pending orders

        Returns:
            Surge pricing data
        """
        h3_cell = lat_lng_to_h3(latitude, longitude)
        surge = await self.surge_calculator.calculate_surge(
            h3_index=h3_cell,
            h3_spatial_index=self.h3_index,
            pending_orders_count=pending_orders,
        )

        stats = await self.h3_index.get_cell_statistics(h3_cell)

        return {
            "h3_index": h3_cell,
            "surge_multiplier": surge,
            "surge_level": self.surge_calculator._get_surge_level(surge),
            "available_drivers": stats.get("available_drivers", 0),
            "pending_orders": pending_orders,
        }

    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        ws_stats = connection_manager.get_statistics()
        matcher_stats = self.matcher.get_statistics()

        return {
            "websocket": ws_stats,
            "matcher": matcher_stats,
            "kafka_enabled": ENABLE_KAFKA,
            "event_consumer_running": self.event_consumer is not None,
        }


# =============================================================================
# FASTAPI ROUTER FACTORY
# =============================================================================

def create_realtime_router(
    service: RealTimeLocationService,
    prefix: str = "/api/realtime",
):
    """
    Create FastAPI router with real-time endpoints.

    Usage:
        service = RealTimeLocationService(redis_client)
        router = create_realtime_router(service)
        app.include_router(router)

    Args:
        service: RealTimeLocationService instance
        prefix: API prefix

    Returns:
        FastAPI APIRouter
    """
    from fastapi import APIRouter

    router = APIRouter(prefix=prefix, tags=["Real-Time Location"])

    @router.post("/location", summary="Update driver location in real-time")
    async def update_location(update: RealTimeLocationUpdate):
        """
        Update driver location with H3 indexing and WebSocket broadcast.

        Used by driver apps to send GPS updates (every 3-5 seconds).
        """
        return await service.update_driver_location(update)

    @router.post("/match", summary="Find best driver match for order")
    async def match_driver(request: MatchDriverRequest):
        """
        Find the best available driver for an order.

        Uses H3 spatial index and scoring algorithm.
        """
        result = await service.find_match(request)
        return result.to_dict()

    @router.get("/h3/cell", summary="Get H3 cell information")
    async def get_h3_cell(
        latitude: float = Query(..., ge=-90, le=90),
        longitude: float = Query(..., ge=-180, le=180),
        resolution: int = Query(default=DEFAULT_RESOLUTION, ge=0, le=15),
    ):
        """Get H3 cell information for a location."""
        return await service.get_h3_cell_info(latitude, longitude, resolution)

    @router.get("/h3/coverage", summary="Get H3 coverage visualization data")
    async def get_h3_coverage(
        latitude: float = Query(..., ge=-90, le=90),
        longitude: float = Query(..., ge=-180, le=180),
        k_ring: int = Query(default=3, ge=1, le=10),
    ):
        """Get H3 coverage GeoJSON for visualization."""
        return visualize_h3_coverage(latitude, longitude, k_ring)

    @router.get("/h3/drivers/{h3_index}", summary="Get drivers in H3 cell")
    async def get_drivers_in_cell(
        h3_index: str,
        available_only: bool = True,
    ):
        """Get all drivers in a specific H3 cell."""
        drivers = await service.h3_index.get_drivers_in_cell(h3_index, available_only)
        return {
            "h3_index": h3_index,
            "drivers": [d.to_dict() for d in drivers],
            "total": len(drivers),
        }

    @router.post("/surge", summary="Calculate surge pricing")
    async def calculate_surge(request: SurgeRequest):
        """Calculate surge pricing for a location."""
        return await service.calculate_surge(
            request.latitude,
            request.longitude,
            request.pending_orders,
        )

    @router.get("/stats", summary="Get real-time service statistics")
    async def get_stats():
        """Get WebSocket and matcher statistics."""
        return service.get_service_stats()

    @router.delete("/driver/{driver_id}", summary="Remove driver from index")
    async def remove_driver(driver_id: int):
        """Remove driver from H3 index (when going offline)."""
        await service.h3_index.remove_driver(driver_id)
        return {"driver_id": driver_id, "removed": True}

    return router


# =============================================================================
# WEBSOCKET ROUTES
# =============================================================================

async def websocket_route(
    websocket: WebSocket,
    client_id: str,
    user_type: str = "customer",
    user_id: Optional[int] = None,
):
    """
    WebSocket endpoint for real-time updates.

    Path: /ws/{client_id}

    Query params:
    - user_type: customer, driver, admin
    - user_id: Optional authenticated user ID

    Message types (client -> server):
    - subscribe_order: Subscribe to order updates
    - subscribe_driver: Subscribe to driver location
    - unsubscribe: Unsubscribe from topic
    - ping: Keep-alive ping

    Message types (server -> client):
    - location_update: Driver location changed
    - order_status_update: Order status changed
    - driver_assigned: Driver assigned to order
    - eta_update: ETA updated
    - pong: Response to ping
    """
    await websocket_endpoint(websocket, client_id, user_type, user_id)


# =============================================================================
# INTEGRATION EXAMPLE
# =============================================================================

def integrate_with_location_service(app: FastAPI, redis_url: str = REDIS_URL):
    """
    Integrate real-time features with existing location-service.

    Usage:
        from realtime import integrate_with_location_service
        integrate_with_location_service(app)

    Args:
        app: FastAPI application instance
        redis_url: Redis connection URL
    """
    # Create Redis client
    redis_client = redis.from_url(redis_url, decode_responses=True)

    # Create service
    service = RealTimeLocationService(redis_client)

    # Add startup/shutdown hooks
    @app.on_event("startup")
    async def startup():
        await service.initialize()

    @app.on_event("shutdown")
    async def shutdown():
        await service.shutdown()

    # Add router
    router = create_realtime_router(service)
    app.include_router(router)

    # Add WebSocket endpoint
    @app.websocket("/ws/{client_id}")
    async def ws_route(
        websocket: WebSocket,
        client_id: str,
        user_type: str = "customer",
        user_id: Optional[int] = None,
    ):
        await websocket_route(websocket, client_id, user_type, user_id)

    logger.info("Real-time features integrated with location-service")

    return service
