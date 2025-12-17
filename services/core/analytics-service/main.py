"""
Dollor.ai - Analytics Service
=============================

Phase 4: Analytics Pipeline - Real-time analytics and business intelligence.

Features:
- ClickHouse integration for time-series data
- Kafka consumer for event ingestion
- Real-time dashboard API
- Business intelligence queries
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import enum

# Optional clickhouse import
clickhouse_connect = None
ClickHouseClient = None
CLICKHOUSE_AVAILABLE = False
try:
    import clickhouse_connect as _clickhouse_connect
    from clickhouse_connect.driver.client import Client as _ClickHouseClient
    clickhouse_connect = _clickhouse_connect
    ClickHouseClient = _ClickHouseClient
    CLICKHOUSE_AVAILABLE = True
except ImportError:
    pass

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "analytics-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8016

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.getenv("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "dollor")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "dollor_analytics_pass")
CLICKHOUSE_DATABASE = os.getenv("CLICKHOUSE_DATABASE", "dollor_analytics")
CLICKHOUSE_URL = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "false").lower() == "true"

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


# =============================================================================
# ENUMS
# =============================================================================

class MetricType(str, enum.Enum):
    """Types of analytics metrics"""
    ORDERS = "orders"
    RIDES = "rides"
    REVENUE = "revenue"
    DRIVERS = "drivers"
    CUSTOMERS = "customers"


class TimeRange(str, enum.Enum):
    """Pre-defined time ranges for queries"""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class ExportFormat(str, enum.Enum):
    """Supported export formats"""
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"


# =============================================================================
# CLICKHOUSE CLIENT
# =============================================================================

class ClickHouseManager:
    """Manages ClickHouse connection and queries."""

    def __init__(self):
        self._client = None

    def connect(self):
        """Connect to ClickHouse."""
        if not CLICKHOUSE_AVAILABLE or not clickhouse_connect:
            logger.warning("ClickHouse client not available")
            return

        try:
            self._client = clickhouse_connect.get_client(
                host=CLICKHOUSE_HOST,
                port=CLICKHOUSE_PORT,
                username=CLICKHOUSE_USER,
                password=CLICKHOUSE_PASSWORD,
            )
            logger.info(f"Connected to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
        except Exception as e:
            logger.error(f"Failed to connect to ClickHouse: {e}")
            self._client = None

    @property
    def client(self) -> Optional[ClickHouseClient]:
        return self._client

    def execute(self, query: str, parameters: Dict = None) -> Any:
        """Execute a query and return results."""
        if not self._client:
            raise HTTPException(status_code=503, detail="ClickHouse not available")
        return self._client.query(query, parameters=parameters or {})

    def insert(self, table: str, data: List[Dict], column_names: List[str] = None):
        """Insert data into a table."""
        if not self._client:
            raise HTTPException(status_code=503, detail="ClickHouse not available")
        if column_names:
            self._client.insert(table, data, column_names=column_names)
        else:
            self._client.insert(table, data)

    def close(self):
        """Close ClickHouse connection."""
        if self._client:
            self._client.close()
            logger.info("ClickHouse connection closed")


# Global manager
clickhouse_manager = ClickHouseManager()


def get_clickhouse() -> ClickHouseManager:
    """Dependency to get ClickHouse manager."""
    return clickhouse_manager


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class TimeRangeQuery(BaseModel):
    """Time range for queries."""
    start: datetime = Field(default_factory=lambda: datetime.utcnow() - timedelta(days=7))
    end: datetime = Field(default_factory=datetime.utcnow)


class AnalyticsQuery(BaseModel):
    """Model for analytics query parameters"""
    metric_type: MetricType = MetricType.ORDERS
    time_range: TimeRange = TimeRange.DAY
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    restaurant_id: Optional[int] = None
    driver_id: Optional[int] = None
    customer_id: Optional[int] = None
    limit: int = Field(default=100, ge=1, le=10000)


class ExportRequest(BaseModel):
    """Model for data export request"""
    metric_type: MetricType = MetricType.ORDERS
    start_date: datetime = Field(default_factory=lambda: datetime.utcnow() - timedelta(days=30))
    end_date: datetime = Field(default_factory=datetime.utcnow)
    format: ExportFormat = ExportFormat.JSON
    include_columns: Optional[List[str]] = None


class DashboardMetrics(BaseModel):
    """Real-time dashboard metrics."""
    total_orders_today: int = 0
    total_revenue_today: float = 0.0
    active_drivers: int = 0
    active_customers: int = 0
    avg_delivery_time: float = 0.0
    total_rides_today: int = 0
    surge_areas: int = 0


class OrderMetrics(BaseModel):
    """Order-specific metrics."""
    total_orders: int
    completed_orders: int
    cancelled_orders: int
    completion_rate: float
    total_revenue: float
    avg_order_value: float
    avg_prep_minutes: float
    avg_delivery_minutes: float


class RestaurantPerformance(BaseModel):
    """Restaurant performance metrics."""
    restaurant_id: int
    total_orders: int
    total_revenue: float
    avg_rating: float
    avg_prep_time: float
    completion_rate: float


class DriverPerformance(BaseModel):
    """Driver performance metrics."""
    driver_id: int
    total_deliveries: int
    total_rides: int
    online_hours: float
    avg_rating: float
    total_earnings: float


class H3HeatmapCell(BaseModel):
    """Heatmap cell data."""
    h3_cell: str
    order_count: int = 0
    ride_count: int = 0
    driver_count: int = 0
    avg_surge: float = 1.0
    demand_score: float = 0.0


# =============================================================================
# KAFKA EVENT CONSUMER
# =============================================================================

class AnalyticsEventConsumer:
    """
    Consumes events from Kafka and inserts into ClickHouse.

    Subscribes to:
    - orders.events
    - rides.events
    - payments.events
    - drivers.location
    """

    def __init__(self, clickhouse: ClickHouseManager):
        self.clickhouse = clickhouse
        self._running = False
        self._consumer = None

    async def start(self):
        """Start consuming events."""
        if not ENABLE_KAFKA:
            logger.info("Kafka disabled, skipping event consumer")
            return

        try:
            from events import KafkaConfig, KafkaConsumer, KafkaTopics, EventType

            kafka_config = KafkaConfig(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                client_id="analytics-service",
                group_id="analytics-consumer-group",
            )

            self._consumer = KafkaConsumer(kafka_config)
            self._running = True

            @self._consumer.on(EventType.ORDER_CREATED)
            async def handle_order_created(event):
                await self._insert_order_event(event, "ORDER_CREATED")

            @self._consumer.on(EventType.ORDER_UPDATED)
            async def handle_order_updated(event):
                await self._insert_order_event(event, "ORDER_UPDATED")

            @self._consumer.on(EventType.RIDE_REQUESTED)
            async def handle_ride_requested(event):
                await self._insert_ride_event(event, "RIDE_REQUESTED")

            @self._consumer.on(EventType.RIDE_UPDATED)
            async def handle_ride_updated(event):
                await self._insert_ride_event(event, "RIDE_UPDATED")

            @self._consumer.on(EventType.PAYMENT_COMPLETED)
            async def handle_payment_completed(event):
                await self._insert_payment_event(event, "PAYMENT_COMPLETED")

            @self._consumer.on(EventType.DRIVER_LOCATION_UPDATED)
            async def handle_driver_location(event):
                await self._insert_driver_location(event)

            await self._consumer.start([
                KafkaTopics.ORDERS_EVENTS,
                KafkaTopics.RIDES_EVENTS,
                KafkaTopics.PAYMENTS_EVENTS,
                KafkaTopics.DRIVERS_LOCATION,
            ])

            await self._consumer.consume()

        except ImportError:
            logger.warning("Kafka events module not available")
        except Exception as e:
            logger.error(f"Analytics consumer error: {e}")

    async def _insert_order_event(self, event, event_type: str):
        """Insert order event into ClickHouse."""
        try:
            data = event.data if hasattr(event, "data") else event
            if hasattr(data, "to_dict"):
                data = data.to_dict()

            self.clickhouse.insert(
                "dollor_events.order_events",
                [[
                    event.id if hasattr(event, "id") else str(datetime.utcnow().timestamp()),
                    event_type,
                    datetime.utcnow(),
                    data.get("order_id", 0),
                    data.get("customer_id", 0),
                    data.get("restaurant_id", 0),
                    data.get("driver_id"),
                    data.get("subtotal", 0),
                    data.get("delivery_fee", 0),
                    data.get("service_fee", 0),
                    data.get("tip", 0),
                    data.get("total", 0),
                    data.get("pickup_lat", 0),
                    data.get("pickup_lng", 0),
                    data.get("dropoff_lat", 0),
                    data.get("dropoff_lng", 0),
                    data.get("h3_pickup_cell", ""),
                    data.get("h3_dropoff_cell", ""),
                    data.get("estimated_prep_minutes", 0),
                    data.get("estimated_delivery_minutes", 0),
                    data.get("actual_prep_minutes"),
                    data.get("actual_delivery_minutes"),
                    data.get("old_status", ""),
                    data.get("new_status", ""),
                    data.get("platform", "unknown"),
                    data.get("app_version", ""),
                    str(data.get("metadata", {})),
                ]],
                column_names=[
                    "event_id", "event_type", "event_time", "order_id", "customer_id",
                    "restaurant_id", "driver_id", "subtotal", "delivery_fee", "service_fee",
                    "tip", "total", "pickup_lat", "pickup_lng", "dropoff_lat", "dropoff_lng",
                    "h3_pickup_cell", "h3_dropoff_cell", "estimated_prep_minutes",
                    "estimated_delivery_minutes", "actual_prep_minutes", "actual_delivery_minutes",
                    "old_status", "new_status", "platform", "app_version", "metadata"
                ]
            )
        except Exception as e:
            logger.error(f"Failed to insert order event: {e}")

    async def _insert_ride_event(self, event, event_type: str):
        """Insert ride event into ClickHouse."""
        try:
            data = event.data if hasattr(event, "data") else event
            if hasattr(data, "to_dict"):
                data = data.to_dict()

            self.clickhouse.insert(
                "dollor_events.ride_events",
                [[
                    event.id if hasattr(event, "id") else str(datetime.utcnow().timestamp()),
                    event_type,
                    datetime.utcnow(),
                    data.get("ride_id", 0),
                    data.get("customer_id", 0),
                    data.get("driver_id"),
                    data.get("base_fare", 0),
                    data.get("distance_fare", 0),
                    data.get("time_fare", 0),
                    data.get("surge_multiplier", 1.0),
                    data.get("tip", 0),
                    data.get("total", 0),
                    data.get("pickup_lat", 0),
                    data.get("pickup_lng", 0),
                    data.get("dropoff_lat", 0),
                    data.get("dropoff_lng", 0),
                    data.get("distance_km", 0),
                    data.get("duration_minutes", 0),
                    data.get("h3_pickup_cell", ""),
                    data.get("h3_dropoff_cell", ""),
                    data.get("old_status", ""),
                    data.get("new_status", ""),
                    data.get("ride_type", "standard"),
                    data.get("platform", "unknown"),
                    str(data.get("metadata", {})),
                ]],
                column_names=[
                    "event_id", "event_type", "event_time", "ride_id", "customer_id",
                    "driver_id", "base_fare", "distance_fare", "time_fare", "surge_multiplier",
                    "tip", "total", "pickup_lat", "pickup_lng", "dropoff_lat", "dropoff_lng",
                    "distance_km", "duration_minutes", "h3_pickup_cell", "h3_dropoff_cell",
                    "old_status", "new_status", "ride_type", "platform", "metadata"
                ]
            )
        except Exception as e:
            logger.error(f"Failed to insert ride event: {e}")

    async def _insert_payment_event(self, event, event_type: str):
        """Insert payment event into ClickHouse."""
        try:
            data = event.data if hasattr(event, "data") else event
            if hasattr(data, "to_dict"):
                data = data.to_dict()

            self.clickhouse.insert(
                "dollor_events.payment_events",
                [[
                    event.id if hasattr(event, "id") else str(datetime.utcnow().timestamp()),
                    event_type,
                    datetime.utcnow(),
                    data.get("payment_id", 0),
                    data.get("order_id"),
                    data.get("ride_id"),
                    data.get("customer_id", 0),
                    data.get("amount", 0),
                    data.get("currency", "USD"),
                    data.get("payment_method", "card"),
                    data.get("old_status", ""),
                    data.get("new_status", ""),
                    data.get("provider", "stripe"),
                    data.get("provider_transaction_id", ""),
                    data.get("platform", "unknown"),
                    str(data.get("metadata", {})),
                ]],
                column_names=[
                    "event_id", "event_type", "event_time", "payment_id", "order_id",
                    "ride_id", "customer_id", "amount", "currency", "payment_method",
                    "old_status", "new_status", "provider", "provider_transaction_id",
                    "platform", "metadata"
                ]
            )
        except Exception as e:
            logger.error(f"Failed to insert payment event: {e}")

    async def _insert_driver_location(self, event):
        """Insert driver location into ClickHouse."""
        try:
            data = event.data if hasattr(event, "data") else event
            if hasattr(data, "to_dict"):
                data = data.to_dict()

            self.clickhouse.insert(
                "dollor_events.driver_locations",
                [[
                    data.get("driver_id", 0),
                    datetime.utcnow(),
                    data.get("latitude", 0),
                    data.get("longitude", 0),
                    data.get("h3_cell", ""),
                    data.get("heading", 0),
                    data.get("speed", 0),
                    data.get("accuracy", 0),
                    1 if data.get("is_available") else 0,
                    1 if data.get("is_on_delivery") else 0,
                    data.get("current_order_id"),
                ]],
                column_names=[
                    "driver_id", "timestamp", "latitude", "longitude", "h3_cell",
                    "heading", "speed", "accuracy", "is_available", "is_on_delivery",
                    "current_order_id"
                ]
            )
        except Exception as e:
            logger.error(f"Failed to insert driver location: {e}")

    def stop(self):
        """Stop consuming events."""
        self._running = False
        if self._consumer:
            asyncio.create_task(self._consumer.stop())


# Global consumer
event_consumer: Optional[AnalyticsEventConsumer] = None


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global event_consumer

    # Startup
    clickhouse_manager.connect()

    if ENABLE_KAFKA:
        event_consumer = AnalyticsEventConsumer(clickhouse_manager)
        asyncio.create_task(event_consumer.start())

    yield

    # Shutdown
    if event_consumer:
        event_consumer.stop()
    clickhouse_manager.close()


app = FastAPI(
    title="Dollor.ai Analytics Service",
    description="Phase 4: Real-time analytics and business intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    clickhouse_status = "connected" if clickhouse_manager.client else "disconnected"
    return {
        "status": "healthy",
        "service": "analytics-service",
        "clickhouse": clickhouse_status,
        "kafka_enabled": ENABLE_KAFKA,
        "environment": ENVIRONMENT,
    }


# =============================================================================
# DASHBOARD ENDPOINTS
# =============================================================================

@app.get("/api/dashboard/realtime", response_model=DashboardMetrics)
async def get_realtime_dashboard(
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get real-time dashboard metrics.

    Returns key metrics for the operations dashboard.
    """
    today = datetime.utcnow().date()

    # Orders today
    orders_result = ch.execute(f"""
        SELECT
            count() as total_orders,
            sum(total) as total_revenue
        FROM dollor_events.order_events
        WHERE event_date = '{today}'
        AND event_type = 'ORDER_CREATED'
    """)

    # Rides today
    rides_result = ch.execute(f"""
        SELECT count() as total_rides
        FROM dollor_events.ride_events
        WHERE event_date = '{today}'
        AND event_type = 'RIDE_REQUESTED'
    """)

    # Active drivers (last 5 minutes)
    drivers_result = ch.execute("""
        SELECT uniq(driver_id) as active_drivers
        FROM dollor_events.driver_locations
        WHERE timestamp > now() - INTERVAL 5 MINUTE
        AND is_available = 1
    """)

    # Avg delivery time today
    delivery_result = ch.execute(f"""
        SELECT avg(actual_delivery_minutes) as avg_delivery
        FROM dollor_events.order_events
        WHERE event_date = '{today}'
        AND actual_delivery_minutes > 0
    """)

    orders_data = orders_result.result_rows[0] if orders_result.result_rows else (0, 0)
    rides_data = rides_result.result_rows[0] if rides_result.result_rows else (0,)
    drivers_data = drivers_result.result_rows[0] if drivers_result.result_rows else (0,)
    delivery_data = delivery_result.result_rows[0] if delivery_result.result_rows else (0,)

    return DashboardMetrics(
        total_orders_today=int(orders_data[0] or 0),
        total_revenue_today=float(orders_data[1] or 0),
        total_rides_today=int(rides_data[0] or 0),
        active_drivers=int(drivers_data[0] or 0),
        avg_delivery_time=float(delivery_data[0] or 0),
    )


@app.get("/api/dashboard/orders/hourly")
async def get_hourly_order_metrics(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(hours=24)),
    end: datetime = Query(default_factory=datetime.utcnow),
    restaurant_id: Optional[int] = None,
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get hourly order metrics.

    Returns order counts and revenue by hour for charts.
    """
    restaurant_filter = f"AND restaurant_id = {restaurant_id}" if restaurant_id else ""

    result = ch.execute(f"""
        SELECT
            toStartOfHour(event_time) as hour,
            count() as order_count,
            sum(total) as revenue,
            avg(total) as avg_order_value
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        AND event_type = 'ORDER_CREATED'
        {restaurant_filter}
        GROUP BY hour
        ORDER BY hour
    """)

    return {
        "data": [
            {
                "hour": str(row[0]),
                "order_count": row[1],
                "revenue": float(row[2]),
                "avg_order_value": float(row[3])
            }
            for row in result.result_rows
        ]
    }


@app.get("/api/dashboard/rides/hourly")
async def get_hourly_ride_metrics(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(hours=24)),
    end: datetime = Query(default_factory=datetime.utcnow),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get hourly ride metrics.

    Returns ride counts and revenue by hour.
    """
    result = ch.execute(f"""
        SELECT
            toStartOfHour(event_time) as hour,
            count() as ride_count,
            sum(total) as revenue,
            avg(surge_multiplier) as avg_surge
        FROM dollor_events.ride_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        AND event_type = 'RIDE_REQUESTED'
        GROUP BY hour
        ORDER BY hour
    """)

    return {
        "data": [
            {
                "hour": str(row[0]),
                "ride_count": row[1],
                "revenue": float(row[2]),
                "avg_surge": float(row[3])
            }
            for row in result.result_rows
        ]
    }


# =============================================================================
# BUSINESS INTELLIGENCE ENDPOINTS
# =============================================================================

@app.get("/api/bi/orders/summary", response_model=OrderMetrics)
async def get_order_summary(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=30)),
    end: datetime = Query(default_factory=datetime.utcnow),
    restaurant_id: Optional[int] = None,
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get order summary metrics for BI.

    Comprehensive order analytics for a time period.
    """
    restaurant_filter = f"AND restaurant_id = {restaurant_id}" if restaurant_id else ""

    result = ch.execute(f"""
        SELECT
            countIf(event_type = 'ORDER_CREATED') as total_orders,
            countIf(new_status = 'delivered') as completed_orders,
            countIf(new_status = 'cancelled') as cancelled_orders,
            sumIf(total, event_type = 'ORDER_CREATED') as total_revenue,
            avgIf(total, event_type = 'ORDER_CREATED') as avg_order_value,
            avgIf(actual_prep_minutes, actual_prep_minutes > 0) as avg_prep_minutes,
            avgIf(actual_delivery_minutes, actual_delivery_minutes > 0) as avg_delivery_minutes
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        {restaurant_filter}
    """)

    row = result.result_rows[0] if result.result_rows else (0, 0, 0, 0, 0, 0, 0)

    total = int(row[0] or 0)
    completed = int(row[1] or 0)

    return OrderMetrics(
        total_orders=total,
        completed_orders=completed,
        cancelled_orders=int(row[2] or 0),
        completion_rate=(completed / total * 100) if total > 0 else 0,
        total_revenue=float(row[3] or 0),
        avg_order_value=float(row[4] or 0),
        avg_prep_minutes=float(row[5] or 0),
        avg_delivery_minutes=float(row[6] or 0),
    )


@app.get("/api/bi/restaurants/top", response_model=List[RestaurantPerformance])
async def get_top_restaurants(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=30)),
    end: datetime = Query(default_factory=datetime.utcnow),
    limit: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="revenue", enum=["revenue", "orders", "rating"]),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get top performing restaurants.

    Ranked by revenue, order count, or rating.
    """
    order_by = {
        "revenue": "total_revenue DESC",
        "orders": "total_orders DESC",
        "rating": "avg_rating DESC",
    }.get(sort_by, "total_revenue DESC")

    result = ch.execute(f"""
        SELECT
            restaurant_id,
            countIf(event_type = 'ORDER_CREATED') as total_orders,
            sumIf(total, event_type = 'ORDER_CREATED') as total_revenue,
            4.5 as avg_rating,  -- Placeholder, join with ratings in production
            avgIf(actual_prep_minutes, actual_prep_minutes > 0) as avg_prep_time,
            countIf(new_status = 'delivered') / countIf(event_type = 'ORDER_CREATED') * 100 as completion_rate
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        GROUP BY restaurant_id
        HAVING total_orders > 0
        ORDER BY {order_by}
        LIMIT {limit}
    """)

    return [
        RestaurantPerformance(
            restaurant_id=row[0],
            total_orders=row[1],
            total_revenue=float(row[2]),
            avg_rating=float(row[3]),
            avg_prep_time=float(row[4] or 0),
            completion_rate=float(row[5] or 0),
        )
        for row in result.result_rows
    ]


@app.get("/api/bi/drivers/top", response_model=List[DriverPerformance])
async def get_top_drivers(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=30)),
    end: datetime = Query(default_factory=datetime.utcnow),
    limit: int = Query(default=10, ge=1, le=100),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get top performing drivers.

    Based on deliveries, rides, and earnings.
    """
    result = ch.execute(f"""
        SELECT
            driver_id,
            countIf(new_status = 'delivered') as total_deliveries,
            0 as total_rides,  -- Combine with ride data
            sum(online_minutes) / 60 as online_hours,
            4.7 as avg_rating,  -- Placeholder
            0 as total_earnings  -- Calculate from orders/rides
        FROM (
            SELECT
                driver_id,
                new_status,
                0 as online_minutes
            FROM dollor_events.order_events
            WHERE event_time >= '{start.isoformat()}'
            AND event_time <= '{end.isoformat()}'
            AND driver_id IS NOT NULL
        )
        GROUP BY driver_id
        ORDER BY total_deliveries DESC
        LIMIT {limit}
    """)

    return [
        DriverPerformance(
            driver_id=row[0],
            total_deliveries=row[1],
            total_rides=row[2],
            online_hours=float(row[3] or 0),
            avg_rating=float(row[4]),
            total_earnings=float(row[5] or 0),
        )
        for row in result.result_rows
    ]


@app.get("/api/bi/revenue/daily")
async def get_daily_revenue(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=30)),
    end: datetime = Query(default_factory=datetime.utcnow),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get daily revenue breakdown.

    Includes orders, rides, and total revenue.
    """
    result = ch.execute(f"""
        SELECT
            toDate(event_time) as day,
            sumIf(total, event_type = 'ORDER_CREATED') as order_revenue,
            sumIf(delivery_fee, event_type = 'ORDER_CREATED') as delivery_revenue,
            sumIf(service_fee, event_type = 'ORDER_CREATED') as service_revenue,
            sumIf(tip, new_status = 'delivered') as tip_revenue
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        GROUP BY day
        ORDER BY day
    """)

    return {
        "data": [
            {
                "day": str(row[0]),
                "order_revenue": float(row[1] or 0),
                "delivery_revenue": float(row[2] or 0),
                "service_revenue": float(row[3] or 0),
                "tip_revenue": float(row[4] or 0),
                "total_revenue": float((row[1] or 0) + (row[2] or 0) + (row[3] or 0)),
            }
            for row in result.result_rows
        ]
    }


# =============================================================================
# HEATMAP ENDPOINTS
# =============================================================================

@app.get("/api/heatmap/demand", response_model=List[H3HeatmapCell])
async def get_demand_heatmap(
    hours: int = Query(default=1, ge=1, le=24),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get demand heatmap by H3 cells.

    Shows order/ride density for the past N hours.
    """
    result = ch.execute(f"""
        SELECT
            h3_pickup_cell as h3_cell,
            count() as order_count,
            0 as ride_count,
            0 as driver_count,
            1.0 as avg_surge,
            count() / 10.0 as demand_score
        FROM dollor_events.order_events
        WHERE event_time > now() - INTERVAL {hours} HOUR
        AND event_type = 'ORDER_CREATED'
        AND h3_pickup_cell != ''
        GROUP BY h3_cell
        ORDER BY order_count DESC
        LIMIT 100
    """)

    return [
        H3HeatmapCell(
            h3_cell=row[0],
            order_count=row[1],
            ride_count=row[2],
            driver_count=row[3],
            avg_surge=float(row[4]),
            demand_score=float(row[5]),
        )
        for row in result.result_rows
    ]


@app.get("/api/heatmap/drivers")
async def get_driver_heatmap(
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get driver distribution heatmap.

    Shows current driver positions by H3 cell.
    """
    result = ch.execute("""
        SELECT
            h3_cell,
            uniq(driver_id) as driver_count,
            countIf(is_available = 1) as available_count
        FROM dollor_events.driver_locations
        WHERE timestamp > now() - INTERVAL 5 MINUTE
        AND h3_cell != ''
        GROUP BY h3_cell
        ORDER BY driver_count DESC
        LIMIT 100
    """)

    return {
        "data": [
            {
                "h3_cell": row[0],
                "driver_count": row[1],
                "available_count": row[2],
            }
            for row in result.result_rows
        ]
    }


# =============================================================================
# FUNNEL ANALYSIS
# =============================================================================

@app.get("/api/bi/funnel/orders")
async def get_order_funnel(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=7)),
    end: datetime = Query(default_factory=datetime.utcnow),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get order funnel analysis.

    Shows conversion through order stages.
    """
    result = ch.execute(f"""
        SELECT
            countIf(event_type = 'ORDER_CREATED') as created,
            countIf(new_status = 'confirmed') as confirmed,
            countIf(new_status = 'preparing') as preparing,
            countIf(new_status = 'ready') as ready,
            countIf(new_status = 'picked_up') as picked_up,
            countIf(new_status = 'delivered') as delivered,
            countIf(new_status = 'cancelled') as cancelled
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
    """)

    row = result.result_rows[0] if result.result_rows else (0, 0, 0, 0, 0, 0, 0)
    created = row[0] or 1

    return {
        "funnel": [
            {"stage": "created", "count": row[0], "percentage": 100},
            {"stage": "confirmed", "count": row[1], "percentage": round(row[1] / created * 100, 1)},
            {"stage": "preparing", "count": row[2], "percentage": round(row[2] / created * 100, 1)},
            {"stage": "ready", "count": row[3], "percentage": round(row[3] / created * 100, 1)},
            {"stage": "picked_up", "count": row[4], "percentage": round(row[4] / created * 100, 1)},
            {"stage": "delivered", "count": row[5], "percentage": round(row[5] / created * 100, 1)},
        ],
        "cancelled": row[6],
        "cancellation_rate": round(row[6] / created * 100, 1),
    }


# =============================================================================
# COHORT ANALYSIS
# =============================================================================

@app.get("/api/bi/cohort/retention")
async def get_retention_cohort(
    months: int = Query(default=6, ge=1, le=12),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Get customer retention cohort analysis.

    Shows monthly retention rates by signup cohort.
    """
    result = ch.execute(f"""
        WITH first_orders AS (
            SELECT
                customer_id,
                toStartOfMonth(min(event_time)) as cohort_month
            FROM dollor_events.order_events
            WHERE event_type = 'ORDER_CREATED'
            GROUP BY customer_id
        )
        SELECT
            fo.cohort_month,
            toStartOfMonth(oe.event_time) as activity_month,
            uniq(oe.customer_id) as active_customers
        FROM dollor_events.order_events oe
        JOIN first_orders fo ON oe.customer_id = fo.customer_id
        WHERE oe.event_type = 'ORDER_CREATED'
        AND fo.cohort_month >= toStartOfMonth(now() - INTERVAL {months} MONTH)
        GROUP BY fo.cohort_month, activity_month
        ORDER BY fo.cohort_month, activity_month
    """)

    # Process into cohort matrix
    cohorts = {}
    for row in result.result_rows:
        cohort = str(row[0])
        month = str(row[1])
        count = row[2]

        if cohort not in cohorts:
            cohorts[cohort] = {"cohort": cohort, "months": {}}
        cohorts[cohort]["months"][month] = count

    return {"cohorts": list(cohorts.values())}


# =============================================================================
# EXPORT ENDPOINTS
# =============================================================================

@app.get("/api/export/orders")
async def export_orders(
    start: datetime = Query(default_factory=lambda: datetime.utcnow() - timedelta(days=30)),
    end: datetime = Query(default_factory=datetime.utcnow),
    format: str = Query(default="json", enum=["json", "csv"]),
    ch: ClickHouseManager = Depends(get_clickhouse)
):
    """
    Export order data for analysis.

    Supports JSON and CSV formats.
    """
    result = ch.execute(f"""
        SELECT
            order_id,
            customer_id,
            restaurant_id,
            driver_id,
            total,
            delivery_fee,
            tip,
            new_status as status,
            event_time,
            actual_prep_minutes,
            actual_delivery_minutes,
            platform
        FROM dollor_events.order_events
        WHERE event_time >= '{start.isoformat()}'
        AND event_time <= '{end.isoformat()}'
        AND event_type = 'ORDER_CREATED'
        ORDER BY event_time DESC
        LIMIT 10000
    """)

    columns = [
        "order_id", "customer_id", "restaurant_id", "driver_id",
        "total", "delivery_fee", "tip", "status", "event_time",
        "actual_prep_minutes", "actual_delivery_minutes", "platform"
    ]

    if format == "csv":
        import io
        import csv
        from fastapi.responses import StreamingResponse

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)
        for row in result.result_rows:
            writer.writerow(row)

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=orders_export.csv"}
        )

    return {
        "columns": columns,
        "data": [dict(zip(columns, row)) for row in result.result_rows],
        "total_rows": len(result.result_rows),
    }


# =============================================================================
# RUN SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8016,
        reload=ENVIRONMENT == "development",
    )
