"""
Dollor.ai - Order Service
=========================

Microservice handling food order operations:
- Order creation and management
- Order status updates (pending -> confirmed -> preparing -> ready -> out_for_delivery -> delivered)
- Order cancellation
- Driver assignment
- Order history by customer/restaurant
- Real-time order tracking status

Port: 8005
Error Prefix: ORD
"""

import os
import sys
import json
from datetime import datetime
from typing import Optional, List
import random

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum, create_engine, ForeignKey, desc
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    OrderErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "order-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8005

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
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
# DATABASE MODELS
# =============================================================================

class OrderStatus(enum.Enum):
    PENDING = "pending"
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class Order(Base):
    """Food orders"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)

    # Customer & Vendor & Driver
    customer_id = Column(Integer)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    vendor_id = Column(Integer, nullable=False)
    vendor_name = Column(String(255))
    driver_id = Column(Integer, nullable=True)
    driver_name = Column(String(255), nullable=True)

    # Order Items (JSON array)
    items = Column(Text)  # JSON: [{"menu_item_id": 1, "name": "...", "quantity": 2, "price": 15.99}]

    # Amounts
    subtotal = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)

    # Delivery Details
    delivery_address = Column(Text)  # JSON: {"street": "...", "city": "...", ...}
    delivery_instructions = Column(Text)
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)
    driver_location = Column(Text)  # JSON: {"latitude": ..., "longitude": ..., "updated_at": ...}

    # Status
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)

    # Stripe Integration
    stripe_payment_intent_id = Column(String(255))
    stripe_charge_id = Column(String(255))
    stripe_customer_id = Column(String(255))
    payment_method = Column(String(50))

    # Invoice Reference
    invoice_number = Column(String(50))
    invoice_generated = Column(Boolean, default=False)
    invoice_pdf_url = Column(String(500))

    # Coupa Integration (for accounting)
    coupa_synced = Column(Boolean, default=False)
    coupa_invoice_id = Column(String(100))
    coupa_status = Column(String(50))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    preparing_at = Column(DateTime)
    ready_at = Column(DateTime)
    delivered_at = Column(DateTime)
    dispatched_at = Column(DateTime)

    # Auto-Dispatch System
    auto_dispatched = Column(Boolean, default=False)
    broadcast_to_drivers = Column(Boolean, default=False)
    broadcast_at = Column(DateTime)
    broadcast_radius_km = Column(Float)

    # Cancellation
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)
    cancelled_by = Column(String(50))  # customer, restaurant, driver, system


# =============================================================================
# PYDANTIC MODELS
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
    cancelled_by: str  # customer, restaurant, driver, system


class OrderItemResponse(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float
    notes: Optional[str] = None


class DeliveryAddressResponse(BaseModel):
    street: str
    apartment: Optional[str] = None
    city: str
    state: str
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


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
    created_at: datetime
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

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Food order management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_order_number(db: Session) -> str:
    """Generate unique order number"""
    while True:
        order_number = f"ORD-{random.randint(100000, 999999)}"
        existing = db.query(Order).filter(Order.order_number == order_number).first()
        if not existing:
            return order_number


def validate_status_transition(current_status: OrderStatus, new_status: str) -> bool:
    """Validate if status transition is allowed"""
    allowed_transitions = {
        OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
        OrderStatus.READY_FOR_PICKUP: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
        OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        OrderStatus.DELIVERED: [],  # Terminal state
        OrderStatus.CANCELLED: []  # Terminal state
    }

    try:
        new_status_enum = OrderStatus[new_status.upper().replace(" ", "_")]
        return new_status_enum in allowed_transitions.get(current_status, [])
    except (KeyError, AttributeError):
        return False


def create_order_timeline(order: Order) -> List[dict]:
    """Create timeline of order events"""
    timeline = [
        {
            "status": "created",
            "timestamp": order.created_at.isoformat() if order.created_at else None,
            "description": "Order placed"
        }
    ]

    if order.confirmed_at:
        timeline.append({
            "status": "confirmed",
            "timestamp": order.confirmed_at.isoformat(),
            "description": "Order confirmed by restaurant"
        })

    if order.preparing_at:
        timeline.append({
            "status": "preparing",
            "timestamp": order.preparing_at.isoformat(),
            "description": "Restaurant is preparing your order"
        })

    if order.ready_at:
        timeline.append({
            "status": "ready",
            "timestamp": order.ready_at.isoformat(),
            "description": "Order ready for pickup"
        })

    if order.dispatched_at:
        timeline.append({
            "status": "dispatched",
            "timestamp": order.dispatched_at.isoformat(),
            "description": f"Driver {order.driver_name} assigned"
        })

    if order.delivered_at:
        timeline.append({
            "status": "delivered",
            "timestamp": order.delivered_at.isoformat(),
            "description": "Order delivered"
        })

    if order.cancelled_at:
        timeline.append({
            "status": "cancelled",
            "timestamp": order.cancelled_at.isoformat(),
            "description": f"Order cancelled: {order.cancellation_reason}"
        })

    return timeline


# =============================================================================
# ORDER ENDPOINTS
# =============================================================================

@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    """Create a new order"""
    # Validate items
    if not order_data.items or len(order_data.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-101",
                message="Invalid order items",
                details={"reason": "Order must have at least one item"}
            ).model_dump()
        )

    # Validate amounts
    if order_data.total_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-101",
                message="Invalid order items",
                details={"reason": "Total amount must be greater than 0"}
            ).model_dump()
        )

    # Create order
    db_order = Order(
        order_number=generate_order_number(db),
        customer_id=order_data.customer_id,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        vendor_name=order_data.vendor_name,
        items=json.dumps([item.model_dump() for item in order_data.items]),
        subtotal=order_data.subtotal,
        tax_rate=order_data.tax_rate,
        tax_amount=order_data.tax_amount,
        delivery_fee=order_data.delivery_fee,
        tip=order_data.tip,
        platform_fee=order_data.platform_fee,
        total_amount=order_data.total_amount,
        delivery_address=json.dumps(order_data.delivery_address.model_dump()),
        delivery_instructions=order_data.delivery_instructions,
        delivery_latitude=order_data.delivery_address.latitude,
        delivery_longitude=order_data.delivery_address.longitude,
        status=OrderStatus.PENDING_PAYMENT if order_data.payment_method else OrderStatus.PENDING,
        payment_method=order_data.payment_method,
        stripe_customer_id=order_data.stripe_customer_id
    )

    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    logger.info(f"Created order: {db_order.order_number}")

    # Parse JSON fields for response
    order_dict = {
        **db_order.__dict__,
        'items': json.loads(db_order.items),
        'delivery_address': json.loads(db_order.delivery_address),
        'status': db_order.status.value,
        'payment_status': db_order.payment_status.value
    }

    return order_dict


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: Session = Depends(get_db)):
    """Get order by ID or order number"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Parse JSON fields for response
    order_dict = {
        **order.__dict__,
        'items': json.loads(order.items),
        'delivery_address': json.loads(order.delivery_address),
        'status': order.status.value,
        'payment_status': order.payment_status.value
    }

    return order_dict


@app.put("/api/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, update: OrderUpdate, db: Session = Depends(get_db)):
    """Update order details (before confirmation)"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Check if order can be modified
    if order.status not in [OrderStatus.PENDING, OrderStatus.PENDING_PAYMENT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-402",
                message="Cannot modify - order already confirmed",
                details={"order_id": order_id, "status": order.status.value}
            ).model_dump()
        )

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    logger.info(f"Updated order: {order.order_number}")

    # Parse JSON fields for response
    order_dict = {
        **order.__dict__,
        'items': json.loads(order.items),
        'delivery_address': json.loads(order.delivery_address),
        'status': order.status.value,
        'payment_status': order.payment_status.value
    }

    return order_dict


# =============================================================================
# ORDER STATUS ENDPOINTS
# =============================================================================

@app.put("/api/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update order status"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Validate status transition
    if not validate_status_transition(order.status, status_update.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-405",
                message="Invalid order status transition",
                details={
                    "current_status": order.status.value,
                    "requested_status": status_update.status
                }
            ).model_dump()
        )

    # Update status
    try:
        new_status = OrderStatus[status_update.status.upper().replace(" ", "_")]
        order.status = new_status
        order.updated_at = datetime.utcnow()

        # Update timestamp fields
        if new_status == OrderStatus.CONFIRMED:
            order.confirmed_at = datetime.utcnow()
        elif new_status == OrderStatus.PREPARING:
            order.preparing_at = datetime.utcnow()
        elif new_status == OrderStatus.READY_FOR_PICKUP:
            order.ready_at = datetime.utcnow()
        elif new_status == OrderStatus.DELIVERED:
            order.delivered_at = datetime.utcnow()

        db.commit()

        logger.info(f"Updated order {order.order_number} status to {new_status.value}")

        return {
            "order_number": order.order_number,
            "status": new_status.value,
            "updated_at": order.updated_at.isoformat()
        }
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-101",
                message="Invalid status value",
                details={"status": status_update.status}
            ).model_dump()
        )


@app.post("/api/orders/{order_id}/confirm")
async def confirm_order(order_id: str, db: Session = Depends(get_db)):
    """Confirm order (restaurant accepts)"""
    return await update_order_status(
        order_id,
        OrderStatusUpdate(status="confirmed"),
        db
    )


@app.post("/api/orders/{order_id}/preparing")
async def start_preparing(order_id: str, db: Session = Depends(get_db)):
    """Mark order as preparing"""
    return await update_order_status(
        order_id,
        OrderStatusUpdate(status="preparing"),
        db
    )


@app.post("/api/orders/{order_id}/ready")
async def mark_ready(order_id: str, db: Session = Depends(get_db)):
    """Mark order as ready for pickup"""
    return await update_order_status(
        order_id,
        OrderStatusUpdate(status="ready_for_pickup"),
        db
    )


@app.post("/api/orders/{order_id}/out-for-delivery")
async def mark_out_for_delivery(order_id: str, db: Session = Depends(get_db)):
    """Mark order as out for delivery"""
    return await update_order_status(
        order_id,
        OrderStatusUpdate(status="out_for_delivery"),
        db
    )


@app.post("/api/orders/{order_id}/delivered")
async def mark_delivered(order_id: str, db: Session = Depends(get_db)):
    """Mark order as delivered"""
    return await update_order_status(
        order_id,
        OrderStatusUpdate(status="delivered"),
        db
    )


# =============================================================================
# DRIVER ASSIGNMENT ENDPOINTS
# =============================================================================

@app.post("/api/orders/{order_id}/assign-driver")
async def assign_driver(
    order_id: str,
    assignment: DriverAssignment,
    db: Session = Depends(get_db)
):
    """Assign driver to order"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Check if order can be assigned
    if order.status not in [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-405",
                message="Order not ready for driver assignment",
                details={"status": order.status.value}
            ).model_dump()
        )

    # Check if already assigned
    if order.driver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-404",
                message="Order already assigned to a driver",
                details={"driver_id": order.driver_id}
            ).model_dump()
        )

    order.driver_id = assignment.driver_id
    order.driver_name = assignment.driver_name
    order.dispatched_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Assigned driver {assignment.driver_id} to order {order.order_number}")

    return {
        "order_number": order.order_number,
        "driver_id": order.driver_id,
        "driver_name": order.driver_name,
        "dispatched_at": order.dispatched_at.isoformat()
    }


@app.put("/api/orders/{order_id}/driver-location")
async def update_driver_location(
    order_id: str,
    location: DriverLocationUpdate,
    db: Session = Depends(get_db)
):
    """Update driver location for order"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    location_data = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "updated_at": datetime.utcnow().isoformat()
    }

    order.driver_location = json.dumps(location_data)
    order.updated_at = datetime.utcnow()
    db.commit()

    return {
        "order_number": order.order_number,
        "driver_location": location_data
    }


# =============================================================================
# CANCELLATION ENDPOINTS
# =============================================================================

@app.post("/api/orders/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    cancellation: OrderCancellation,
    db: Session = Depends(get_db)
):
    """Cancel order"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Check if order can be cancelled
    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-401",
                message="Cannot cancel - order already delivered",
                details={"order_id": order_id}
            ).model_dump()
        )

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-401",
                message="Order already cancelled",
                details={"order_id": order_id}
            ).model_dump()
        )

    if order.status == OrderStatus.OUT_FOR_DELIVERY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-401",
                message="Cannot cancel - order already picked up",
                details={"order_id": order_id}
            ).model_dump()
        )

    order.status = OrderStatus.CANCELLED
    order.cancelled_at = datetime.utcnow()
    order.cancellation_reason = cancellation.reason
    order.cancelled_by = cancellation.cancelled_by
    order.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Cancelled order {order.order_number} by {cancellation.cancelled_by}")

    return {
        "order_number": order.order_number,
        "status": "cancelled",
        "cancelled_at": order.cancelled_at.isoformat(),
        "cancelled_by": cancellation.cancelled_by,
        "reason": cancellation.reason
    }


# =============================================================================
# HISTORY ENDPOINTS
# =============================================================================

@app.get("/api/orders/customer/{customer_id}", response_model=List[OrderResponse])
async def get_customer_orders(
    customer_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for customer"""
    query = db.query(Order).filter(Order.customer_id == customer_id)

    if status:
        try:
            status_enum = OrderStatus[status.upper().replace(" ", "_")]
            query = query.filter(Order.status == status_enum)
        except KeyError:
            pass

    orders = query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

    # Parse JSON fields for response
    orders_list = []
    for order in orders:
        order_dict = {
            **order.__dict__,
            'items': json.loads(order.items),
            'delivery_address': json.loads(order.delivery_address),
            'status': order.status.value,
            'payment_status': order.payment_status.value
        }
        orders_list.append(order_dict)

    return orders_list


@app.get("/api/orders/restaurant/{vendor_id}", response_model=List[OrderResponse])
async def get_restaurant_orders(
    vendor_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for restaurant"""
    query = db.query(Order).filter(Order.vendor_id == vendor_id)

    if status:
        try:
            status_enum = OrderStatus[status.upper().replace(" ", "_")]
            query = query.filter(Order.status == status_enum)
        except KeyError:
            pass

    orders = query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

    # Parse JSON fields for response
    orders_list = []
    for order in orders:
        order_dict = {
            **order.__dict__,
            'items': json.loads(order.items),
            'delivery_address': json.loads(order.delivery_address),
            'status': order.status.value,
            'payment_status': order.payment_status.value
        }
        orders_list.append(order_dict)

    return orders_list


@app.get("/api/orders/driver/{driver_id}", response_model=List[OrderResponse])
async def get_driver_orders(
    driver_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get order history for driver"""
    query = db.query(Order).filter(Order.driver_id == driver_id)

    if status:
        try:
            status_enum = OrderStatus[status.upper().replace(" ", "_")]
            query = query.filter(Order.status == status_enum)
        except KeyError:
            pass

    orders = query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

    # Parse JSON fields for response
    orders_list = []
    for order in orders:
        order_dict = {
            **order.__dict__,
            'items': json.loads(order.items),
            'delivery_address': json.loads(order.delivery_address),
            'status': order.status.value,
            'payment_status': order.payment_status.value
        }
        orders_list.append(order_dict)

    return orders_list


# =============================================================================
# TRACKING ENDPOINTS
# =============================================================================

@app.get("/api/orders/{order_id}/track", response_model=OrderTrackingResponse)
async def track_order(order_id: str, db: Session = Depends(get_db)):
    """Get real-time tracking information for order"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    # Calculate estimated delivery time (simplified)
    estimated_delivery = None
    if order.status == OrderStatus.PREPARING:
        estimated_delivery = "30-40 minutes"
    elif order.status == OrderStatus.READY_FOR_PICKUP:
        estimated_delivery = "20-30 minutes"
    elif order.status == OrderStatus.OUT_FOR_DELIVERY:
        estimated_delivery = "10-15 minutes"

    # Parse driver location
    driver_location = None
    if order.driver_location:
        driver_location = json.loads(order.driver_location)

    return OrderTrackingResponse(
        order_number=order.order_number,
        status=order.status.value,
        estimated_delivery_time=estimated_delivery,
        driver_name=order.driver_name,
        driver_location=driver_location,
        delivery_address=json.loads(order.delivery_address),
        timeline=create_order_timeline(order)
    )


# =============================================================================
# PAYMENT STATUS ENDPOINTS
# =============================================================================

@app.put("/api/orders/{order_id}/payment-status")
async def update_payment_status(
    order_id: str,
    payment_status: str,
    stripe_payment_intent_id: Optional[str] = None,
    stripe_charge_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update payment status for order"""
    order = db.query(Order).filter(
        (Order.order_number == order_id) |
        (Order.id == int(order_id) if order_id.isdigit() else False)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="ORD-301",
                message="Order not found",
                details={"order_id": order_id}
            ).model_dump()
        )

    try:
        payment_status_enum = PaymentStatus[payment_status.upper()]
        order.payment_status = payment_status_enum

        if stripe_payment_intent_id:
            order.stripe_payment_intent_id = stripe_payment_intent_id
        if stripe_charge_id:
            order.stripe_charge_id = stripe_charge_id

        # If payment succeeded and order is pending_payment, move to confirmed
        if payment_status_enum == PaymentStatus.SUCCEEDED and order.status == OrderStatus.PENDING_PAYMENT:
            order.status = OrderStatus.CONFIRMED
            order.confirmed_at = datetime.utcnow()

        order.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Updated payment status for order {order.order_number} to {payment_status}")

        return {
            "order_number": order.order_number,
            "payment_status": payment_status_enum.value,
            "order_status": order.status.value,
            "updated_at": order.updated_at.isoformat()
        }
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="ORD-101",
                message="Invalid payment status value",
                details={"payment_status": payment_status}
            ).model_dump()
        )


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

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
    """Search orders with filters"""
    query = db.query(Order)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Order.order_number.ilike(search_term)) |
            (Order.customer_name.ilike(search_term)) |
            (Order.customer_email.ilike(search_term)) |
            (Order.vendor_name.ilike(search_term))
        )

    if status:
        try:
            status_enum = OrderStatus[status.upper().replace(" ", "_")]
            query = query.filter(Order.status == status_enum)
        except KeyError:
            pass

    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)

    if driver_id:
        query = query.filter(Order.driver_id == driver_id)

    orders = query.order_by(desc(Order.created_at)).offset(offset).limit(limit).all()

    # Parse JSON fields for response
    orders_list = []
    for order in orders:
        order_dict = {
            **order.__dict__,
            'items': json.loads(order.items),
            'delivery_address': json.loads(order.delivery_address),
            'status': order.status.value,
            'payment_status': order.payment_status.value
        }
        orders_list.append(order_dict)

    return orders_list


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
