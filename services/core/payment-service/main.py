"""
Dollor.ai - Payment Service
============================

Microservice handling payment processing:
- Stripe payment intents
- Payment processing
- Refunds
- Vendor payouts
- Driver payouts
- Payment history
- Stripe webhook handling

Port: 8006
Error Prefix: PAY
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List
import hmac
import hashlib

from fastapi import Depends, HTTPException, status, Query, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum, ForeignKey, create_engine, func
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
import enum
import stripe

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    PaymentErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "payment-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8006

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
stripe.api_key = STRIPE_SECRET_KEY

# Platform fees - DOLLOR.AI uses flat $1 fees, NOT percentage
# This value is DEPRECATED - use flat fee calculation instead
PLATFORM_FEE_PERCENTAGE = float(os.getenv("PLATFORM_FEE_PERCENTAGE", "0"))  # 0% - use flat $1 fee
PLATFORM_FLAT_FEE = float(os.getenv("PLATFORM_FLAT_FEE", "1.00"))  # $1 flat fee per order
STRIPE_FEE_PERCENTAGE = float(os.getenv("STRIPE_FEE_PERCENTAGE", "2.9"))  # 2.9% + $0.30
STRIPE_FEE_PERCENT = STRIPE_FEE_PERCENTAGE  # Alias for backward compatibility
STRIPE_FEE_FIXED = float(os.getenv("STRIPE_FEE_FIXED", "0.30"))  # $0.30

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
# DATABASE MODELS (from models.py)
# =============================================================================

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class PaymentMethod(enum.Enum):
    """Payment method types supported by Dollor.ai"""
    CARD = "card"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"  # For cash on delivery


class RefundStatus(enum.Enum):
    """Refund status for payment refunds"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, nullable=True)  # ForeignKey to invoices if needed

    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, nullable=False)
    payment_method = Column(String(50))
    reference_number = Column(String(100))
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.COMPLETED)
    notes = Column(Text)

    # Stripe Integration
    stripe_payment_intent_id = Column(String(255), unique=True, index=True)
    stripe_charge_id = Column(String(255))
    stripe_customer_id = Column(String(255))

    # Order reference
    order_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class StripePaymentLog(Base):
    __tablename__ = "stripe_payment_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, nullable=True)

    # Stripe Event Details
    event_type = Column(String(100))  # payment_intent.succeeded, charge.succeeded, etc.
    stripe_event_id = Column(String(255), unique=True, index=True)
    payment_intent_id = Column(String(255), index=True)
    charge_id = Column(String(255))

    # Payment Details
    amount = Column(Float)
    currency = Column(String(10), default="usd")
    status = Column(String(50))

    # Raw Data
    raw_data = Column(Text)  # Full JSON from Stripe

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)


class VendorPayout(Base):
    __tablename__ = "vendor_payouts"

    id = Column(Integer, primary_key=True, index=True)
    payout_number = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, nullable=False)

    # Payout Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Financial Details
    total_orders = Column(Integer, default=0)
    gross_revenue = Column(Float, default=0.0)  # Total order amounts
    platform_fee = Column(Float, default=0.0)  # Flat $1 platform fee
    stripe_fees = Column(Float, default=0.0)  # Stripe processing fees
    net_payout = Column(Float, default=0.0)  # What vendor receives

    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed

    # Coupa Integration
    coupa_invoice_id = Column(String(100))
    coupa_status = Column(String(50))
    coupa_synced_at = Column(DateTime)

    # Payment Details
    paid_at = Column(DateTime)
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    stripe_transfer_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DriverPayout(Base):
    __tablename__ = "driver_payouts"

    id = Column(Integer, primary_key=True, index=True)
    payout_number = Column(String(50), unique=True, nullable=False, index=True)
    driver_id = Column(Integer, nullable=False)
    order_id = Column(Integer, nullable=True)

    # Payout Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Financial Details
    total_deliveries = Column(Integer, default=0)
    delivery_fee = Column(Float, default=0.0)  # Base delivery fee
    tip = Column(Float, default=0.0)  # Customer tip
    bonus = Column(Float, default=0.0)  # Peak hour bonuses, etc.
    deductions = Column(Float, default=0.0)  # Any deductions
    net_payout = Column(Float, default=0.0)  # What driver receives

    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed

    # Payment Details
    paid_at = Column(DateTime)
    payment_method = Column(String(50))
    payment_reference = Column(String(255))
    stripe_transfer_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class PaymentIntentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in dollars")
    currency: str = Field(default="usd", description="Currency code")
    customer_email: Optional[str] = None
    customer_id: Optional[str] = None
    order_id: Optional[int] = None
    metadata: Optional[dict] = None


class PaymentCreate(BaseModel):
    """Model for creating a payment record"""
    amount: float = Field(..., gt=0, description="Payment amount")
    order_id: Optional[int] = None
    customer_id: Optional[int] = None
    payment_method: Optional[str] = Field(default="card", description="Payment method")
    currency: str = Field(default="usd", description="Currency code")
    description: Optional[str] = None
    metadata: Optional[dict] = None


class PaymentIntentResponse(BaseModel):
    payment_intent_id: str
    client_secret: str
    amount: float
    currency: str
    status: str


class PaymentResponse(BaseModel):
    id: int
    amount: float
    payment_date: datetime
    payment_method: Optional[str]
    reference_number: Optional[str]
    status: str
    stripe_payment_intent_id: Optional[str]
    order_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[float] = None  # If None, full refund
    reason: Optional[str] = None


class RefundResponse(BaseModel):
    refund_id: str
    payment_intent_id: str
    amount: float
    status: str
    reason: Optional[str]


class VendorPayoutCreate(BaseModel):
    vendor_id: int
    period_start: datetime
    period_end: datetime


class VendorPayoutResponse(BaseModel):
    id: int
    payout_number: str
    vendor_id: int
    period_start: datetime
    period_end: datetime
    total_orders: int
    gross_revenue: float
    platform_fee: float
    stripe_fees: float
    net_payout: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DriverPayoutCreate(BaseModel):
    driver_id: int
    period_start: datetime
    period_end: datetime


class DriverPayoutResponse(BaseModel):
    id: int
    payout_number: str
    driver_id: int
    period_start: datetime
    period_end: datetime
    total_deliveries: int
    delivery_fee: float
    tip: float
    bonus: float
    deductions: float
    net_payout: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    total_payments: int
    total_amount: float
    payments: List[PaymentResponse]


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Payment processing and payout management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_payout_number(prefix: str, db: Session) -> str:
    """Generate unique payout number"""
    import random
    while True:
        payout_number = f"{prefix}-{random.randint(100000, 999999)}"
        if prefix == "VND":
            existing = db.query(VendorPayout).filter(VendorPayout.payout_number == payout_number).first()
        else:
            existing = db.query(DriverPayout).filter(DriverPayout.payout_number == payout_number).first()
        if not existing:
            return payout_number


def calculate_stripe_fee(amount: float) -> float:
    """Calculate Stripe processing fee"""
    return (amount * STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FEE_FIXED


def calculate_platform_fee(amount: float) -> float:
    """
    Calculate platform fee - DOLLOR.AI FLAT FEE MODEL
    Returns $1 flat fee per order (not percentage-based)
    """
    # DEPRECATED: percentage-based calculation
    # return amount * PLATFORM_FEE_PERCENTAGE / 100

    # Dollor.ai uses flat $1 fee model
    return PLATFORM_FLAT_FEE


# =============================================================================
# PAYMENT INTENT ENDPOINTS
# =============================================================================

@app.post("/api/payments/intent", response_model=PaymentIntentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_intent(intent_req: PaymentIntentCreate, db: Session = Depends(get_db)):
    """
    Create a Stripe payment intent for processing payment
    """
    try:
        # Convert amount to cents for Stripe
        amount_cents = int(intent_req.amount * 100)

        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=intent_req.currency,
            metadata=intent_req.metadata or {},
            receipt_email=intent_req.customer_email,
        )

        # Log the payment intent creation
        logger.info(f"Created payment intent: {payment_intent.id} for ${intent_req.amount}")

        # Store in database
        payment = Payment(
            amount=intent_req.amount,
            payment_date=datetime.utcnow(),
            stripe_payment_intent_id=payment_intent.id,
            stripe_customer_id=intent_req.customer_id,
            order_id=intent_req.order_id,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()

        return PaymentIntentResponse(
            payment_intent_id=payment_intent.id,
            client_secret=payment_intent.client_secret,
            amount=intent_req.amount,
            currency=intent_req.currency,
            status=payment_intent.status
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="PAY-101",
                message="Failed to create payment intent",
                details={"error": str(e)}
            ).model_dump()
        )
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                code="PAY-500",
                message="Internal server error",
                details={"error": str(e)}
            ).model_dump()
        )


@app.get("/api/payments/intent/{payment_intent_id}")
async def get_payment_intent(payment_intent_id: str):
    """
    Retrieve a payment intent from Stripe
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        return {
            "payment_intent_id": payment_intent.id,
            "amount": payment_intent.amount / 100,
            "currency": payment_intent.currency,
            "status": payment_intent.status,
            "metadata": payment_intent.metadata,
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving payment intent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PAY-301",
                message="Payment intent not found",
                details={"error": str(e)}
            ).model_dump()
        )


# =============================================================================
# REFUND ENDPOINTS
# =============================================================================

@app.post("/api/payments/refund", response_model=RefundResponse)
async def create_refund(refund_req: RefundRequest, db: Session = Depends(get_db)):
    """
    Create a refund for a payment
    """
    try:
        # Get payment intent
        payment_intent = stripe.PaymentIntent.retrieve(refund_req.payment_intent_id)

        # Calculate refund amount
        refund_amount = None
        if refund_req.amount:
            refund_amount = int(refund_req.amount * 100)

        # Create refund
        refund = stripe.Refund.create(
            payment_intent=refund_req.payment_intent_id,
            amount=refund_amount,
            reason=refund_req.reason or "requested_by_customer"
        )

        # Update payment status in database
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == refund_req.payment_intent_id
        ).first()

        if payment:
            payment.status = PaymentStatus.FAILED
            payment.notes = f"Refunded: {refund.id}"
            db.commit()

        logger.info(f"Created refund: {refund.id} for payment intent: {refund_req.payment_intent_id}")

        return RefundResponse(
            refund_id=refund.id,
            payment_intent_id=refund_req.payment_intent_id,
            amount=refund.amount / 100,
            status=refund.status,
            reason=refund.reason
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating refund: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="PAY-102",
                message="Failed to create refund",
                details={"error": str(e)}
            ).model_dump()
        )


# =============================================================================
# PAYMENT HISTORY ENDPOINTS
# =============================================================================

@app.get("/api/payments", response_model=List[PaymentResponse])
async def get_payments(
    order_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get payment history with filters
    """
    query = db.query(Payment)

    if order_id:
        query = query.filter(Payment.order_id == order_id)

    if status_filter:
        query = query.filter(Payment.status == status_filter)

    payments = query.order_by(Payment.created_at.desc()).offset(offset).limit(limit).all()
    return payments


@app.get("/api/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, db: Session = Depends(get_db)):
    """
    Get payment by ID
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PAY-301",
                message="Payment not found",
                details={"payment_id": payment_id}
            ).model_dump()
        )

    return payment


@app.get("/api/payments/order/{order_id}/history", response_model=PaymentHistoryResponse)
async def get_order_payment_history(order_id: int, db: Session = Depends(get_db)):
    """
    Get all payments for a specific order
    """
    payments = db.query(Payment).filter(Payment.order_id == order_id).all()

    total_amount = sum(p.amount for p in payments)

    return PaymentHistoryResponse(
        total_payments=len(payments),
        total_amount=total_amount,
        payments=payments
    )


# =============================================================================
# VENDOR PAYOUT ENDPOINTS
# =============================================================================

@app.post("/api/payouts/vendor", response_model=VendorPayoutResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_payout(payout_req: VendorPayoutCreate, db: Session = Depends(get_db)):
    """
    Create a payout for a vendor for a specific period
    """
    # This would typically query the orders table to calculate totals
    # For now, we'll create a basic payout record

    payout = VendorPayout(
        payout_number=generate_payout_number("VND", db),
        vendor_id=payout_req.vendor_id,
        period_start=payout_req.period_start,
        period_end=payout_req.period_end,
        total_orders=0,
        gross_revenue=0.0,
        platform_fee=0.0,
        stripe_fees=0.0,
        net_payout=0.0,
        status="pending"
    )

    db.add(payout)
    db.commit()
    db.refresh(payout)

    logger.info(f"Created vendor payout: {payout.payout_number} for vendor: {payout_req.vendor_id}")

    return payout


@app.get("/api/payouts/vendor/{vendor_id}", response_model=List[VendorPayoutResponse])
async def get_vendor_payouts(
    vendor_id: int,
    status_filter: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get all payouts for a vendor
    """
    query = db.query(VendorPayout).filter(VendorPayout.vendor_id == vendor_id)

    if status_filter:
        query = query.filter(VendorPayout.status == status_filter)

    payouts = query.order_by(VendorPayout.created_at.desc()).offset(offset).limit(limit).all()
    return payouts


@app.put("/api/payouts/vendor/{payout_id}/status")
async def update_vendor_payout_status(
    payout_id: int,
    new_status: str,
    payment_reference: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update vendor payout status
    """
    payout = db.query(VendorPayout).filter(VendorPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PAY-302",
                message="Payout not found",
                details={"payout_id": payout_id}
            ).model_dump()
        )

    payout.status = new_status
    payout.updated_at = datetime.utcnow()

    if new_status == "completed":
        payout.paid_at = datetime.utcnow()
        if payment_reference:
            payout.payment_reference = payment_reference

    db.commit()

    logger.info(f"Updated vendor payout {payout.payout_number} status to: {new_status}")

    return {"payout_id": payout_id, "status": new_status}


# =============================================================================
# DRIVER PAYOUT ENDPOINTS
# =============================================================================

@app.post("/api/payouts/driver", response_model=DriverPayoutResponse, status_code=status.HTTP_201_CREATED)
async def create_driver_payout(payout_req: DriverPayoutCreate, db: Session = Depends(get_db)):
    """
    Create a payout for a driver for a specific period
    """
    payout = DriverPayout(
        payout_number=generate_payout_number("DRV", db),
        driver_id=payout_req.driver_id,
        period_start=payout_req.period_start,
        period_end=payout_req.period_end,
        total_deliveries=0,
        delivery_fee=0.0,
        tip=0.0,
        bonus=0.0,
        deductions=0.0,
        net_payout=0.0,
        status="pending"
    )

    db.add(payout)
    db.commit()
    db.refresh(payout)

    logger.info(f"Created driver payout: {payout.payout_number} for driver: {payout_req.driver_id}")

    return payout


@app.get("/api/payouts/driver/{driver_id}", response_model=List[DriverPayoutResponse])
async def get_driver_payouts(
    driver_id: int,
    status_filter: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get all payouts for a driver
    """
    query = db.query(DriverPayout).filter(DriverPayout.driver_id == driver_id)

    if status_filter:
        query = query.filter(DriverPayout.status == status_filter)

    payouts = query.order_by(DriverPayout.created_at.desc()).offset(offset).limit(limit).all()
    return payouts


@app.put("/api/payouts/driver/{payout_id}/status")
async def update_driver_payout_status(
    payout_id: int,
    new_status: str,
    payment_reference: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update driver payout status
    """
    payout = db.query(DriverPayout).filter(DriverPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PAY-302",
                message="Payout not found",
                details={"payout_id": payout_id}
            ).model_dump()
        )

    payout.status = new_status
    payout.updated_at = datetime.utcnow()

    if new_status == "completed":
        payout.paid_at = datetime.utcnow()
        if payment_reference:
            payout.payment_reference = payment_reference

    db.commit()

    logger.info(f"Updated driver payout {payout.payout_number} status to: {new_status}")

    return {"payout_id": payout_id, "status": new_status}


# =============================================================================
# STRIPE WEBHOOK ENDPOINTS
# =============================================================================

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Log the webhook event
    event_log = StripePaymentLog(
        event_type=event['type'],
        stripe_event_id=event['id'],
        raw_data=str(event),
        created_at=datetime.utcnow()
    )

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']

        # Update payment status in database
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()

        if payment:
            payment.status = PaymentStatus.COMPLETED
            payment.stripe_charge_id = payment_intent.get('latest_charge')
            db.commit()

        event_log.payment_intent_id = payment_intent['id']
        event_log.amount = payment_intent['amount'] / 100
        event_log.status = payment_intent['status']
        event_log.processed_at = datetime.utcnow()

        logger.info(f"Payment intent succeeded: {payment_intent['id']}")

    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']

        # Update payment status in database
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()

        if payment:
            payment.status = PaymentStatus.FAILED
            db.commit()

        event_log.payment_intent_id = payment_intent['id']
        event_log.amount = payment_intent['amount'] / 100
        event_log.status = payment_intent['status']
        event_log.processed_at = datetime.utcnow()

        logger.warning(f"Payment intent failed: {payment_intent['id']}")

    elif event['type'] == 'charge.refunded':
        charge = event['data']['object']

        # Handle refund
        event_log.charge_id = charge['id']
        event_log.payment_intent_id = charge.get('payment_intent')
        event_log.amount = charge['amount_refunded'] / 100
        event_log.status = 'refunded'
        event_log.processed_at = datetime.utcnow()

        logger.info(f"Charge refunded: {charge['id']}")

    # Save event log
    db.add(event_log)
    db.commit()

    return {"status": "success"}


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@app.get("/api/analytics/revenue")
async def get_revenue_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Get revenue analytics for a period
    """
    query = db.query(
        func.count(Payment.id).label('total_payments'),
        func.sum(Payment.amount).label('total_revenue')
    ).filter(Payment.status == PaymentStatus.COMPLETED)

    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)

    result = query.first()

    return {
        "total_payments": result.total_payments or 0,
        "total_revenue": float(result.total_revenue or 0),
        "period_start": start_date.isoformat() if start_date else None,
        "period_end": end_date.isoformat() if end_date else None
    }


@app.get("/api/analytics/payouts/vendor")
async def get_vendor_payout_analytics(
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get vendor payout analytics
    """
    query = db.query(
        func.count(VendorPayout.id).label('total_payouts'),
        func.sum(VendorPayout.gross_revenue).label('total_gross_revenue'),
        func.sum(VendorPayout.platform_fee).label('total_platform_fees'),
        func.sum(VendorPayout.net_payout).label('total_net_payout')
    )

    if vendor_id:
        query = query.filter(VendorPayout.vendor_id == vendor_id)
    if status_filter:
        query = query.filter(VendorPayout.status == status_filter)

    result = query.first()

    return {
        "total_payouts": result.total_payouts or 0,
        "total_gross_revenue": float(result.total_gross_revenue or 0),
        "total_platform_fees": float(result.total_platform_fees or 0),
        "total_net_payout": float(result.total_net_payout or 0)
    }


@app.get("/api/analytics/payouts/driver")
async def get_driver_payout_analytics(
    driver_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get driver payout analytics
    """
    query = db.query(
        func.count(DriverPayout.id).label('total_payouts'),
        func.sum(DriverPayout.total_deliveries).label('total_deliveries'),
        func.sum(DriverPayout.delivery_fee).label('total_delivery_fees'),
        func.sum(DriverPayout.tip).label('total_tips'),
        func.sum(DriverPayout.net_payout).label('total_net_payout')
    )

    if driver_id:
        query = query.filter(DriverPayout.driver_id == driver_id)
    if status_filter:
        query = query.filter(DriverPayout.status == status_filter)

    result = query.first()

    return {
        "total_payouts": result.total_payouts or 0,
        "total_deliveries": result.total_deliveries or 0,
        "total_delivery_fees": float(result.total_delivery_fees or 0),
        "total_tips": float(result.total_tips or 0),
        "total_net_payout": float(result.total_net_payout or 0)
    }


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")
    logger.info(f"Stripe integration enabled: {bool(STRIPE_SECRET_KEY)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
