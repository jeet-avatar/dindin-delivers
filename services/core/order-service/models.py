"""
Dollor.ai Order Service - Database Models
=========================================

SQLAlchemy models for the order service.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


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
