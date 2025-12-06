"""
Stripe Payment Integration for DoorDash P2P
Handles payment intents, webhooks, and invoice generation
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import stripe
import json
import os
import uuid
from dotenv import load_dotenv

from database import get_db
from models import Order, OrderStatus, StripePaymentLog, Vendor, VendorMenuItem, VendorPayout

# Import centralized pricing config
try:
    from pricing_config import (
        PLATFORM_FEE_CONFIG,
        DELIVERY_FEE_CONFIG,
        DRIVER_PAYOUT_CONFIG,
        RESTAURANT_COMMISSION_CONFIG,
        PAYMENT_PROCESSING_CONFIG,
        ORDER_VALIDATION_CONFIG,
        get_tax_rate,
        calculate_distance
    )
    PRICING_CONFIG_LOADED = True
except ImportError as e:
    print(f"[STRIPE] Warning: pricing_config not found, using fallback values: {e}")
    PRICING_CONFIG_LOADED = False
    # Fallback values - should match pricing_config.py defaults
    FALLBACK_TAX_RATE = 0.08       # Matches DEFAULT_TAX_RATE
    FALLBACK_DELIVERY_FEE = 2.99   # Matches DELIVERY_FEE_CONFIG.min_fee
    FALLBACK_PLATFORM_FEE = 1.00   # Matches PLATFORM_FEE_CONFIG.flat_fee

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key_here")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# CRITICAL: Environment detection for webhook validation
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

def validate_stripe_configuration():
    """
    Validate Stripe configuration on startup.
    CRITICAL: In production, webhook secret MUST be set to prevent payment fraud.
    """
    if IS_PRODUCTION:
        if not STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET == "whsec_your_webhook_secret":
            raise RuntimeError(
                "CRITICAL SECURITY ERROR: STRIPE_WEBHOOK_SECRET must be set in production! "
                "Without webhook signature validation, attackers can forge payment confirmations. "
                "Set the STRIPE_WEBHOOK_SECRET environment variable with your Stripe webhook signing secret."
            )
        if stripe.api_key == "sk_test_your_key_here":
            raise RuntimeError(
                "CRITICAL ERROR: Stripe API key not configured for production! "
                "Set the STRIPE_SECRET_KEY environment variable."
            )
        print("[STRIPE] Production configuration validated successfully")
    else:
        if not STRIPE_WEBHOOK_SECRET:
            print("[STRIPE WARNING] Webhook secret not set - running in development mode with reduced security")
        print("[STRIPE] Development mode - webhook validation may be skipped for testing")

# Run validation on module import
validate_stripe_configuration()

router = APIRouter(prefix="/api", tags=["payments"])

# Pydantic Models
class OrderItem(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    items: List[OrderItem]
    delivery_address: Dict[str, str]
    delivery_instructions: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None

class PaymentIntentResponse(BaseModel):
    order_id: int
    order_number: str
    client_secret: str
    amount: float
    currency: str

class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_name: str
    vendor_id: int
    vendor_name: Optional[str]
    items: List[Dict]
    subtotal: float
    tax_amount: float
    delivery_fee: float
    platform_fee: float
    total_amount: float
    status: str
    payment_status: str
    created_at: datetime

# ===================== ORDER CREATION =====================

@router.post("/orders", response_model=PaymentIntentResponse)
async def create_order(
    order_data: CreateOrderRequest,
    db: Session = Depends(get_db)
):
    """
    Step 1: Create order and Stripe Payment Intent
    Called from mobile app when user places order
    """
    
    # Verify vendor exists
    vendor = db.query(Vendor).filter(Vendor.id == order_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # CRITICAL: Compare enum value properly (onboarding_status is an enum, not string)
    # Using hasattr to safely handle both enum and string cases
    vendor_status = vendor.onboarding_status.value if hasattr(vendor.onboarding_status, 'value') else str(vendor.onboarding_status)
    if vendor_status != "approved":
        raise HTTPException(status_code=400, detail="Vendor is not approved")
    
    # Verify menu items exist and calculate totals
    subtotal = 0.0
    items_data = []
    
    for item in order_data.items:
        menu_item = db.query(VendorMenuItem).filter(
            VendorMenuItem.id == item.menu_item_id,
            VendorMenuItem.vendor_id == order_data.vendor_id
        ).first()
        
        if not menu_item:
            raise HTTPException(
                status_code=404, 
                detail=f"Menu item {item.menu_item_id} not found"
            )
        
        if not menu_item.is_available or not menu_item.in_stock:
            raise HTTPException(
                status_code=400,
                detail=f"{menu_item.item_name} is not available"
            )
        
        item_total = menu_item.price * item.quantity
        subtotal += item_total
        
        items_data.append({
            "menu_item_id": item.menu_item_id,
            "name": menu_item.item_name,
            "quantity": item.quantity,
            "unit_price": menu_item.price,
            "total_price": item_total
        })
    
    # Calculate fees and taxes using centralized pricing config
    if PRICING_CONFIG_LOADED:
        # Get state from delivery address for tax rate
        delivery_state = order_data.delivery_address.get("state", "CA") if order_data.delivery_address else "CA"
        tax_rate = get_tax_rate(delivery_state)

        # Calculate distance for delivery fee (if coordinates provided)
        distance_miles = 3.0  # Default
        if (order_data.delivery_latitude and order_data.delivery_longitude and
            vendor.latitude and vendor.longitude):
            distance_miles = calculate_distance(
                vendor.latitude, vendor.longitude,
                order_data.delivery_latitude, order_data.delivery_longitude
            )

        # Check delivery range
        if order_data.delivery_address and not DELIVERY_FEE_CONFIG.is_deliverable(distance_miles):
            raise HTTPException(
                status_code=400,
                detail=f"Delivery address is too far ({distance_miles:.1f} miles). Max distance: {DELIVERY_FEE_CONFIG.max_delivery_distance} miles."
            )

        # Validate order amount
        is_valid, validation_msg = ORDER_VALIDATION_CONFIG.validate_order(subtotal)
        if not is_valid:
            raise HTTPException(status_code=400, detail=validation_msg)

        # Calculate all fees using centralized config
        tax_amount = round(subtotal * tax_rate, 2)
        delivery_fee = DELIVERY_FEE_CONFIG.calculate(subtotal, distance_miles) if order_data.delivery_address else 0.0
        platform_fee = PLATFORM_FEE_CONFIG.calculate(subtotal)
        total_amount = subtotal + tax_amount + delivery_fee + platform_fee
    else:
        # Fallback to hardcoded values
        tax_rate = FALLBACK_TAX_RATE
        tax_amount = round(subtotal * tax_rate, 2)
        delivery_fee = FALLBACK_DELIVERY_FEE if order_data.delivery_address else 0.0
        platform_fee = FALLBACK_PLATFORM_FEE
        total_amount = subtotal + tax_amount + delivery_fee + platform_fee
        distance_miles = 3.0
    
    # Generate order number
    order_count = db.query(Order).count()
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{order_count + 1:05d}"
    
    # Create order
    new_order = Order(
        order_number=order_number,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        items=json.dumps(items_data),
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        delivery_fee=delivery_fee,
        platform_fee=platform_fee,
        total_amount=total_amount,
        delivery_address=json.dumps(order_data.delivery_address),
        delivery_instructions=order_data.delivery_instructions,
        delivery_latitude=order_data.delivery_latitude,
        delivery_longitude=order_data.delivery_longitude,
        status=OrderStatus.PENDING_PAYMENT,
        payment_status="pending"
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # Create Stripe Payment Intent
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(total_amount * 100),  # Stripe uses cents
            currency="usd",
            customer_email=order_data.customer_email,
            metadata={
                "order_id": new_order.id,
                "order_number": order_number,
                "vendor_id": order_data.vendor_id,
                "customer_name": order_data.customer_name
            },
            description=f"Order {order_number} from {vendor.restaurant_name or vendor.company_name}"
        )
        
        # Update order with Stripe info
        new_order.stripe_payment_intent_id = payment_intent.id
        db.commit()
        
        return PaymentIntentResponse(
            order_id=new_order.id,
            order_number=order_number,
            client_secret=payment_intent.client_secret,
            amount=total_amount,
            currency="usd"
        )
        
    except stripe.error.StripeError as e:
        # Rollback order if Stripe fails
        db.delete(new_order)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")

# ===================== STRIPE WEBHOOK =====================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Step 2: Handle Stripe webhook events
    This is the SOURCE OF TRUTH for payment confirmation
    """
    
    payload = await request.body()
    
    # Verify webhook signature (CRITICAL for security)
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Log the event
    event_type = event['type']
    event_data = event['data']['object']
    stripe_event_id = event['id']

    # CRITICAL: Check for duplicate webhook events (idempotency)
    # Stripe can send the same event multiple times - we must only process once
    existing_log = db.query(StripePaymentLog).filter(
        StripePaymentLog.stripe_event_id == stripe_event_id
    ).first()

    if existing_log:
        print(f"[STRIPE WEBHOOK] Duplicate event detected: {stripe_event_id}, skipping")
        return {"status": "success", "event_type": event_type, "message": "duplicate event ignored"}

    stripe_log = StripePaymentLog(
        event_type=event_type,
        stripe_event_id=stripe_event_id,
        payment_intent_id=event_data.get('id'),
        amount=event_data.get('amount', 0) / 100,
        currency=event_data.get('currency'),
        status=event_data.get('status'),
        raw_data=json.dumps(event.data.object, default=str)
    )
    db.add(stripe_log)
    db.commit()

    # Handle payment_intent.succeeded event
    if event_type == 'payment_intent.succeeded':
        payment_intent = event_data
        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if order:
            # Update order status
            order.payment_status = "succeeded"
            order.status = OrderStatus.CONFIRMED
            order.confirmed_at = datetime.now()
            
            # Store charge info
            if payment_intent.get('charges', {}).get('data'):
                charge = payment_intent['charges']['data'][0]
                order.stripe_charge_id = charge['id']
                order.payment_method = charge.get('payment_method_details', {}).get('type')
            
            # Update Stripe log with order reference
            stripe_log.order_id = order.id
            
            db.commit()
            
            # Generate invoice asynchronously
            try:
                generate_customer_invoice(order, db)
            except Exception as e:
                print(f"Invoice generation error: {e}")
            
            # Send confirmation notifications (implement later)
            # send_order_confirmation_email(order)
            # send_vendor_notification(order)
            # send_push_notification(order)
    
    elif event_type == 'payment_intent.payment_failed':
        payment_intent = event_data
        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if order:
            order.payment_status = "failed"
            order.status = OrderStatus.CANCELLED
            db.commit()
    
    return {"status": "success", "event_type": event_type}

# ===================== INVOICE GENERATION =====================

def generate_customer_invoice(order: Order, db: Session):
    """
    Generate customer invoice/receipt after successful payment
    This is NOT for vendor accounting (that's Coupa)
    """
    
    # Generate invoice number
    invoice_count = db.query(Order).filter(Order.invoice_generated == True).count()
    invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_count + 1:05d}"
    
    order.invoice_number = invoice_number
    order.invoice_generated = True
    
    # TODO: Generate PDF invoice (implement with reportlab/weasyprint)
    # invoice_pdf = generate_pdf_invoice(order)
    # upload_to_s3(invoice_pdf)
    # order.invoice_pdf_url = s3_url
    
    db.commit()
    
    return invoice_number

# ===================== ORDER TRACKING =====================

@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """
    Get order details for mobile app tracking
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        customer_name=order.customer_name,
        vendor_id=order.vendor_id,
        vendor_name=vendor.restaurant_name or vendor.company_name if vendor else None,
        items=json.loads(order.items),
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        delivery_fee=order.delivery_fee,
        platform_fee=order.platform_fee,
        total_amount=order.total_amount,
        status=order.status.value,
        payment_status=order.payment_status,
        created_at=order.created_at
    )

@router.get("/orders")
def list_orders(
    vendor_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List orders with filters (admin dashboard)
    """
    query = db.query(Order)
    
    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).limit(limit).all()
    
    return [{
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "vendor_id": order.vendor_id,
        "total_amount": order.total_amount,
        "status": order.status.value,
        "payment_status": order.payment_status,
        "created_at": order.created_at
    } for order in orders]

@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_update: dict,
    db: Session = Depends(get_db)
):
    """
    Update order status (vendor app or admin)
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_status = status_update.get("status")
    
    if new_status == "preparing":
        order.status = OrderStatus.PREPARING
        order.preparing_at = datetime.now()
    elif new_status == "out_for_delivery":
        order.status = OrderStatus.OUT_FOR_DELIVERY
    elif new_status == "delivered":
        order.status = OrderStatus.DELIVERED
        order.delivered_at = datetime.now()
    elif new_status == "cancelled":
        order.status = OrderStatus.CANCELLED
    
    db.commit()
    
    return {"message": "Order status updated", "order_id": order.id, "status": order.status.value}

# ===================== COUPA INTEGRATION =====================

@router.post("/accounting/sync-vendor-payouts")
def sync_vendor_payouts(
    period_start: str,
    period_end: str,
    db: Session = Depends(get_db)
):
    """
    Calculate and sync vendor payouts to Coupa
    Run this weekly/monthly for vendor accounting
    """
    
    start_date = datetime.fromisoformat(period_start)
    end_date = datetime.fromisoformat(period_end)
    
    # Get all successful orders in period
    orders = db.query(Order).filter(
        Order.payment_status == "succeeded",
        Order.created_at >= start_date,
        Order.created_at <= end_date
    ).all()
    
    # Group by vendor
    vendor_payouts = {}
    for order in orders:
        if order.vendor_id not in vendor_payouts:
            vendor_payouts[order.vendor_id] = {
                "orders": [],
                "total_revenue": 0.0,
                "platform_fees": 0.0,
                "stripe_fees": 0.0
            }
        
        vendor_payouts[order.vendor_id]["orders"].append(order.id)
        vendor_payouts[order.vendor_id]["total_revenue"] += order.subtotal
        vendor_payouts[order.vendor_id]["platform_fees"] += order.platform_fee
        
        # Calculate Stripe fees using centralized config
        if PRICING_CONFIG_LOADED:
            stripe_fee = PAYMENT_PROCESSING_CONFIG.calculate_fee(order.total_amount)
        else:
            stripe_fee = (order.total_amount * 0.029) + 0.30  # Fallback
        vendor_payouts[order.vendor_id]["stripe_fees"] += stripe_fee
    
    # Create payout records
    payout_records = []
    for vendor_id, payout_data in vendor_payouts.items():
        net_payout = (
            payout_data["total_revenue"] 
            - payout_data["platform_fees"] 
            - payout_data["stripe_fees"]
        )
        
        # Generate unique payout number using vendor_id + UUID (avoids race condition with count())
        payout_uuid = str(uuid.uuid4())[:8].upper()
        payout_number = f"PAYOUT-{datetime.now().strftime('%Y%m%d')}-V{vendor_id}-{payout_uuid}"
        
        payout = VendorPayout(
            payout_number=payout_number,
            vendor_id=vendor_id,
            period_start=start_date,
            period_end=end_date,
            total_orders=len(payout_data["orders"]),
            gross_revenue=payout_data["total_revenue"],
            platform_fee=payout_data["platform_fees"],
            stripe_fees=payout_data["stripe_fees"],
            net_payout=net_payout,
            status="pending"
        )
        
        db.add(payout)
        payout_records.append({
            "vendor_id": vendor_id,
            "payout_number": payout_number,
            "net_payout": net_payout
        })
    
    db.commit()
    
    # TODO: Sync to Coupa API
    # for payout in payout_records:
    #     coupa_invoice_id = create_coupa_invoice(payout)
    #     update payout record with coupa_invoice_id
    
    return {
        "message": "Vendor payouts calculated",
        "payouts": payout_records,
        "total_vendors": len(payout_records)
    }

@router.get("/accounting/vendor-payouts")
def get_vendor_payouts(
    vendor_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get vendor payout history
    """
    query = db.query(VendorPayout)
    
    if vendor_id:
        query = query.filter(VendorPayout.vendor_id == vendor_id)
    
    if status:
        query = query.filter(VendorPayout.status == status)
    
    payouts = query.order_by(VendorPayout.created_at.desc()).all()
    
    return [{
        "id": payout.id,
        "payout_number": payout.payout_number,
        "vendor_id": payout.vendor_id,
        "period_start": payout.period_start,
        "period_end": payout.period_end,
        "total_orders": payout.total_orders,
        "gross_revenue": payout.gross_revenue,
        "platform_fee": payout.platform_fee,
        "stripe_fees": payout.stripe_fees,
        "net_payout": payout.net_payout,
        "status": payout.status,
        "coupa_status": payout.coupa_status,
        "created_at": payout.created_at
    } for payout in payouts]
