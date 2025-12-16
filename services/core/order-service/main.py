"""
Dollor.ai - Order Service (CQRS Architecture)
==============================================

Microservice handling food order operations with CQRS pattern:
- Commands: Create, Update, Cancel orders (write to PostgreSQL + Outbox)
- Queries: Search, Filter, Track orders (read from PostgreSQL/Elasticsearch)
- Events: Published via Kafka for eventual consistency

Port: 8005
Error Prefix: ORD
"""

import os
import sys
import asyncio
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import MicroserviceFactory, create_logger, ErrorResponse
from events import KafkaConfig, KafkaProducer, KafkaConsumer, OutboxProcessor
from events.outbox import Base as OutboxBase, CREATE_OUTBOX_SQL, CREATE_EVENT_STORE_SQL

# Local imports
from models import Base, Order, OrderStatus, PaymentStatus
from cqrs.commands import (
    CreateOrderCommand,
    UpdateOrderCommand,
    UpdateOrderStatusCommand,
    AssignDriverCommand,
    CancelOrderCommand,
    UpdatePaymentStatusCommand,
    UpdateDriverLocationCommand,
    OrderCommandHandler,
)
from cqrs.queries import (
    GetOrderQuery,
    GetCustomerOrdersQuery,
    GetRestaurantOrdersQuery,
    GetDriverOrdersQuery,
    SearchOrdersQuery,
    TrackOrderQuery,
    GetOrderStatsQuery,
    OrderQueryHandler,
)
from cqrs.projections import OrderElasticsearchProjection
from event_projector import OrderEventProjector


# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "order-service"
SERVICE_VERSION = "2.0.0"  # CQRS version
SERVICE_PORT = 8005

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dollor:dollor_dev_password@localhost:5432/dollor")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# =============================================================================
# DATABASE SETUP
# =============================================================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# ELASTICSEARCH CLIENT (Optional)
# =============================================================================

elasticsearch_client = None
try:
    from elasticsearch import Elasticsearch
    elasticsearch_client = Elasticsearch([ELASTICSEARCH_URL])
    if not elasticsearch_client.ping():
        elasticsearch_client = None
except Exception:
    pass  # Elasticsearch not available, will use PostgreSQL for queries


# =============================================================================
# KAFKA PRODUCER (Global)
# =============================================================================

kafka_producer: Optional[KafkaProducer] = None
outbox_processor: Optional[OutboxProcessor] = None
event_projector: Optional[OrderEventProjector] = None
ENABLE_EVENT_PROJECTOR = os.getenv("ENABLE_EVENT_PROJECTOR", "false").lower() == "true"


# =============================================================================
# PYDANTIC MODELS (API Contracts)
# =============================================================================

class OrderItemCreate(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float
    notes: Optional[str] = None


class DeliveryAddress(BaseModel):
    street: str
    apartment: Optional[str] = None
    city: str
    state: str
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OrderCreate(BaseModel):
    customer_id: int
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    vendor_name: str
    items: List[OrderItemCreate]
    delivery_address: DeliveryAddress
    delivery_instructions: Optional[str] = None
    subtotal: float
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    delivery_fee: float = 0.0
    tip: float = 0.0
    platform_fee: float = 0.0
    total_amount: float
    payment_method: Optional[str] = None
    stripe_customer_id: Optional[str] = None


class OrderUpdate(BaseModel):
    delivery_instructions: Optional[str] = None
    tip: Optional[float] = None


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class DriverAssignment(BaseModel):
    driver_id: int
    driver_name: str


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class OrderCancellation(BaseModel):
    reason: str
    cancelled_by: str


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    vendor_name: str
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    items: List[dict]
    subtotal: float
    tax_rate: float
    tax_amount: float
    delivery_fee: float
    tip: float
    platform_fee: float
    total_amount: float
    delivery_address: dict
    delivery_instructions: Optional[str] = None
    status: str
    payment_status: str
    created_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

    class Config:
        from_attributes = True


class OrderTrackingResponse(BaseModel):
    order_number: str
    status: str
    estimated_delivery_time: Optional[str] = None
    driver_name: Optional[str] = None
    driver_location: Optional[dict] = None
    delivery_address: dict
    timeline: List[dict]


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)


@asynccontextmanager
async def lifespan(app):
    """Startup and shutdown events."""
    global kafka_producer, outbox_processor, event_projector

    # Create database tables
    Base.metadata.create_all(bind=engine)
    OutboxBase.metadata.create_all(bind=engine)

    # Create outbox tables manually if needed
    with engine.connect() as conn:
        try:
            conn.execute(CREATE_OUTBOX_SQL)
            conn.execute(CREATE_EVENT_STORE_SQL)
            conn.commit()
        except Exception:
            pass  # Tables may already exist

    # Initialize Kafka producer
    try:
        kafka_config = KafkaConfig(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            client_id=SERVICE_NAME,
        )
        kafka_producer = KafkaProducer(kafka_config)
        await kafka_producer.start()
        logger.info("Kafka producer started")

        # Start outbox processor
        outbox_processor = OutboxProcessor(
            producer=kafka_producer,
            session_factory=SessionLocal,
            poll_interval_seconds=1.0,
        )
        asyncio.create_task(outbox_processor.run())
        logger.info("Outbox processor started")
    except Exception as e:
        logger.warning(f"Kafka not available: {e}")

    # Initialize Elasticsearch projection
    if elasticsearch_client:
        try:
            projection = OrderElasticsearchProjection(elasticsearch_client)
            await projection.initialize()
            logger.info("Elasticsearch projection initialized")
        except Exception as e:
            logger.warning(f"Elasticsearch initialization failed: {e}")

    # Start Event Projector (consumes Kafka events and updates read models)
    if ENABLE_EVENT_PROJECTOR and kafka_producer:
        try:
            redis_client = None
            try:
                import redis
                redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
                redis_client.ping()
            except Exception:
                pass

            kafka_config = KafkaConfig(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                client_id=f"{SERVICE_NAME}-projector",
                group_id=f"{SERVICE_NAME}-projector-group",
            )
            event_projector = OrderEventProjector(
                kafka_config=kafka_config,
                elasticsearch_client=elasticsearch_client,
                redis_client=redis_client,
            )
            await event_projector.start()
            asyncio.create_task(event_projector.run())
            logger.info("Event projector started")
        except Exception as e:
            logger.warning(f"Event projector failed to start: {e}")

    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")

    yield

    # Shutdown
    if event_projector:
        await event_projector.stop()
    if kafka_producer:
        await kafka_producer.stop()
    if outbox_processor:
        outbox_processor.stop()
    logger.info(f"{SERVICE_NAME} shutdown complete")


# Create the FastAPI app directly with our custom CQRS lifespan
app = FastAPI(
    title="Dollor.ai Order Service",
    description="Food order management service with CQRS architecture",
    version=SERVICE_VERSION,
    lifespan=lifespan,
)


# =============================================================================
# HEALTH ENDPOINT
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
    }


# =============================================================================
# COMMAND ENDPOINTS (Write Operations)
# =============================================================================

@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order.

    Command: CreateOrderCommand
    Event: ORDER_CREATED → Kafka → Elasticsearch
    """
    command = CreateOrderCommand(
        customer_id=order_data.customer_id,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        vendor_name=order_data.vendor_name,
        items=[item.model_dump() for item in order_data.items],
        delivery_address=order_data.delivery_address.model_dump(),
        delivery_instructions=order_data.delivery_instructions,
        subtotal=order_data.subtotal,
        tax_rate=order_data.tax_rate,
        tax_amount=order_data.tax_amount,
        delivery_fee=order_data.delivery_fee,
        tip=order_data.tip,
        platform_fee=order_data.platform_fee,
        total_amount=order_data.total_amount,
        payment_method=order_data.payment_method,
        stripe_customer_id=order_data.stripe_customer_id,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code=result.error_code,
                message=result.error_message,
            ).model_dump()
        )

    db.commit()
    logger.info(f"Created order: {result.order_number}")

    # Fetch the full order for response
    query_handler = OrderQueryHandler(db, elasticsearch_client)
    query_result = query_handler.handle(GetOrderQuery(order_id=result.order_number))

    return query_result.data


@app.put("/api/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, update: OrderUpdate, db: Session = Depends(get_db)):
    """
    Update order details (before confirmation).

    Command: UpdateOrderCommand
    """
    command = UpdateOrderCommand(
        order_id=order_id,
        delivery_instructions=update.delivery_instructions,
        tip=update.tip,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        status_code = status.HTTP_404_NOT_FOUND if result.error_code == "ORD-301" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()

    query_handler = OrderQueryHandler(db, elasticsearch_client)
    query_result = query_handler.handle(GetOrderQuery(order_id=order_id))
    return query_result.data


@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, db: Session = Depends(get_db)):
    """
    Update order status.

    Command: UpdateOrderStatusCommand
    Events: ORDER_CONFIRMED, ORDER_PREPARING, ORDER_READY, etc.
    """
    command = UpdateOrderStatusCommand(
        order_id=order_id,
        new_status=status_update.status,
        notes=status_update.notes,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        status_code = status.HTTP_404_NOT_FOUND if result.error_code == "ORD-301" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()
    return result.data


@app.post("/api/orders/{order_id}/confirm")
async def confirm_order(order_id: str, db: Session = Depends(get_db)):
    """Confirm order (restaurant accepts)."""
    return await update_order_status(order_id, OrderStatusUpdate(status="confirmed"), db)


@app.post("/api/orders/{order_id}/preparing")
async def start_preparing(order_id: str, db: Session = Depends(get_db)):
    """Mark order as preparing."""
    return await update_order_status(order_id, OrderStatusUpdate(status="preparing"), db)


@app.post("/api/orders/{order_id}/ready")
async def mark_ready(order_id: str, db: Session = Depends(get_db)):
    """Mark order as ready for pickup."""
    return await update_order_status(order_id, OrderStatusUpdate(status="ready_for_pickup"), db)


@app.post("/api/orders/{order_id}/out-for-delivery")
async def mark_out_for_delivery(order_id: str, db: Session = Depends(get_db)):
    """Mark order as out for delivery."""
    return await update_order_status(order_id, OrderStatusUpdate(status="out_for_delivery"), db)


@app.post("/api/orders/{order_id}/delivered")
async def mark_delivered(order_id: str, db: Session = Depends(get_db)):
    """Mark order as delivered."""
    return await update_order_status(order_id, OrderStatusUpdate(status="delivered"), db)


@app.post("/api/orders/{order_id}/assign-driver")
async def assign_driver(order_id: str, assignment: DriverAssignment, db: Session = Depends(get_db)):
    """
    Assign driver to order.

    Command: AssignDriverCommand
    Event: DRIVER_ASSIGNED
    """
    command = AssignDriverCommand(
        order_id=order_id,
        driver_id=assignment.driver_id,
        driver_name=assignment.driver_name,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        status_code = status.HTTP_404_NOT_FOUND if result.error_code == "ORD-301" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()
    return result.data


@app.put("/api/orders/{order_id}/driver-location")
async def update_driver_location(order_id: str, location: DriverLocationUpdate, db: Session = Depends(get_db)):
    """Update driver location for order."""
    command = UpdateDriverLocationCommand(
        order_id=order_id,
        latitude=location.latitude,
        longitude=location.longitude,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()
    return result.data


@app.post("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: str, cancellation: OrderCancellation, db: Session = Depends(get_db)):
    """
    Cancel order.

    Command: CancelOrderCommand
    Event: ORDER_CANCELLED
    """
    command = CancelOrderCommand(
        order_id=order_id,
        reason=cancellation.reason,
        cancelled_by=cancellation.cancelled_by,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        status_code = status.HTTP_404_NOT_FOUND if result.error_code == "ORD-301" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()
    return result.data


@app.put("/api/orders/{order_id}/payment-status")
async def update_payment_status(
    order_id: str,
    payment_status: str,
    stripe_payment_intent_id: Optional[str] = None,
    stripe_charge_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update payment status for order."""
    command = UpdatePaymentStatusCommand(
        order_id=order_id,
        payment_status=payment_status,
        stripe_payment_intent_id=stripe_payment_intent_id,
        stripe_charge_id=stripe_charge_id,
    )

    handler = OrderCommandHandler(db, SERVICE_NAME)
    result = handler.handle(command)

    if not result.success:
        status_code = status.HTTP_404_NOT_FOUND if result.error_code == "ORD-301" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    db.commit()
    return result.data


# =============================================================================
# QUERY ENDPOINTS (Read Operations)
# =============================================================================

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: Session = Depends(get_db)):
    """
    Get order by ID or order number.

    Query: GetOrderQuery
    Source: PostgreSQL (primary) or Elasticsearch (if available)
    """
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(GetOrderQuery(order_id=order_id))

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    return result.data


@app.get("/api/orders/{order_id}/track", response_model=OrderTrackingResponse)
async def track_order(order_id: str, db: Session = Depends(get_db)):
    """
    Get real-time tracking information for order.

    Query: TrackOrderQuery
    """
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(TrackOrderQuery(order_id=order_id))

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(code=result.error_code, message=result.error_message).model_dump()
        )

    return result.data


@app.get("/api/orders/customer/{customer_id}", response_model=List[OrderResponse])
async def get_customer_orders(
    customer_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for customer."""
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(GetCustomerOrdersQuery(
        customer_id=customer_id,
        status=status,
        limit=limit,
        offset=offset,
    ))

    return result.data


@app.get("/api/orders/restaurant/{vendor_id}", response_model=List[OrderResponse])
async def get_restaurant_orders(
    vendor_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for restaurant."""
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(GetRestaurantOrdersQuery(
        vendor_id=vendor_id,
        status=status,
        limit=limit,
        offset=offset,
    ))

    return result.data


@app.get("/api/orders/driver/{driver_id}", response_model=List[OrderResponse])
async def get_driver_orders(
    driver_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for driver."""
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(GetDriverOrdersQuery(
        driver_id=driver_id,
        status=status,
        limit=limit,
        offset=offset,
    ))

    return result.data


@app.get("/api/orders", response_model=List[OrderResponse])
async def search_orders(
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Search orders with filters.

    Query: SearchOrdersQuery
    Source: Elasticsearch (if search term provided and ES available), otherwise PostgreSQL
    """
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(SearchOrdersQuery(
        search=search,
        status=status,
        customer_id=customer_id,
        vendor_id=vendor_id,
        driver_id=driver_id,
        limit=limit,
        offset=offset,
    ))

    return result.data


@app.get("/api/orders/stats")
async def get_order_stats(
    vendor_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get order statistics."""
    handler = OrderQueryHandler(db, elasticsearch_client)
    result = handler.handle(GetOrderStatsQuery(
        vendor_id=vendor_id,
        customer_id=customer_id,
        driver_id=driver_id,
    ))

    return result.data


# =============================================================================
# HEALTH & INFO ENDPOINTS
# =============================================================================

@app.get("/api/orders/health/cqrs")
async def cqrs_health():
    """Check CQRS infrastructure health."""
    health = {
        "postgresql": "healthy",
        "elasticsearch": "not_configured",
        "kafka": "not_configured",
        "outbox_processor": "not_configured",
        "event_projector": "not_configured",
    }

    if elasticsearch_client:
        try:
            if elasticsearch_client.ping():
                health["elasticsearch"] = "healthy"
            else:
                health["elasticsearch"] = "unhealthy"
        except Exception:
            health["elasticsearch"] = "unhealthy"

    if kafka_producer and kafka_producer._started:
        health["kafka"] = "healthy"

    if outbox_processor and outbox_processor._running:
        health["outbox_processor"] = "healthy"

    if event_projector and event_projector._running:
        health["event_projector"] = "healthy"
        health["event_projector_stats"] = event_projector.get_stats()

    return health


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
