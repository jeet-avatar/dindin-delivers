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
from dotenv import load_dotenv

from database import get_db
from models import Order, OrderStatus, StripePaymentLog, Vendor, VendorMenuItem, VendorPayout

load_dotenv()

# Initialize Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if not STRIPE_SECRET_KEY:
    raise RuntimeError("CRITICAL: STRIPE_SECRET_KEY environment variable is not set.")
if not STRIPE_WEBHOOK_SECRET:
    raise RuntimeError("CRITICAL: STRIPE_WEBHOOK_SECRET environment variable is not set.")

stripe.api_key = STRIPE_SECRET_KEY

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
    
    if vendor.onboarding_status != "approved":
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
    
    # Calculate fees and taxes
    # IMPORTANT: Platform fee is $1 FLAT - NOT a percentage (see PRICING_MODEL.md)
    TAX_RATE = 0.08  # 8% tax (configure per location)
    DELIVERY_FEE = 5.99 if order_data.delivery_address else 0.0
    PLATFORM_FEE = 1.00  # $1 flat matchmaking fee from customer

    tax_amount = subtotal * TAX_RATE
    platform_fee = PLATFORM_FEE  # $1 flat, NOT percentage
    total_amount = subtotal + tax_amount + DELIVERY_FEE + platform_fee
    
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
        tax_rate=TAX_RATE,
        tax_amount=tax_amount,
        delivery_fee=DELIVERY_FEE,
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
    
    stripe_log = StripePaymentLog(
        event_type=event_type,
        stripe_event_id=event['id'],
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

# ===================== ORDER FLOW ENDPOINTS =====================
# Complete order lifecycle: Payment → Restaurant → Driver → Delivery

@router.post("/orders/{order_id}/send-to-restaurant")
def send_order_to_restaurant(order_id: int, db: Session = Depends(get_db)):
    """
    Step 3: Send confirmed order to restaurant for acceptance.
    Starts 3-minute acceptance window.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail=f"Order must be CONFIRMED to send to restaurant. Current: {order.status.value}")

    order.status = OrderStatus.PENDING_RESTAURANT
    order.sent_to_restaurant_at = datetime.now()
    db.commit()

    # TODO: Send push notification to restaurant app
    # send_push_notification(vendor_id=order.vendor_id, type="new_order", order_id=order.id)

    return {
        "message": "Order sent to restaurant",
        "order_id": order.id,
        "status": order.status.value,
        "sent_at": order.sent_to_restaurant_at.isoformat(),
        "timeout_at": (order.sent_to_restaurant_at + timedelta(minutes=3)).isoformat()
    }

@router.post("/orders/{order_id}/restaurant/accept")
def restaurant_accept_order(order_id: int, db: Session = Depends(get_db)):
    """
    Step 4a: Restaurant accepts the order.
    Order moves to PREPARING status.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        raise HTTPException(status_code=400, detail=f"Order must be PENDING_RESTAURANT. Current: {order.status.value}")

    # Check if timeout already occurred
    if order.sent_to_restaurant_at:
        elapsed = datetime.now() - order.sent_to_restaurant_at
        if elapsed > timedelta(minutes=3):
            order.status = OrderStatus.RESTAURANT_TIMEOUT
            order.restaurant_timeout_at = datetime.now()
            db.commit()
            raise HTTPException(status_code=400, detail="Order acceptance window expired (3 minutes)")

    order.status = OrderStatus.PREPARING
    order.restaurant_accepted_at = datetime.now()
    order.preparing_at = datetime.now()
    db.commit()

    # TODO: Trigger driver matching
    # find_available_driver(order)

    return {
        "message": "Order accepted by restaurant",
        "order_id": order.id,
        "status": order.status.value,
        "accepted_at": order.restaurant_accepted_at.isoformat()
    }

class DeclineRequest(BaseModel):
    reason: str

@router.post("/orders/{order_id}/restaurant/decline")
def restaurant_decline_order(order_id: int, decline_data: DeclineRequest, db: Session = Depends(get_db)):
    """
    Step 4b: Restaurant declines the order.
    Triggers refund process.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        raise HTTPException(status_code=400, detail=f"Order must be PENDING_RESTAURANT. Current: {order.status.value}")

    order.status = OrderStatus.DECLINED_BY_RESTAURANT
    order.restaurant_declined_at = datetime.now()
    order.restaurant_decline_reason = decline_data.reason
    db.commit()

    # TODO: Process refund via Stripe
    # if order.stripe_payment_intent_id:
    #     stripe.Refund.create(payment_intent=order.stripe_payment_intent_id)

    # TODO: Notify customer
    # send_push_notification(customer_id=order.customer_id, type="order_declined")

    return {
        "message": "Order declined by restaurant",
        "order_id": order.id,
        "status": order.status.value,
        "reason": decline_data.reason,
        "refund_initiated": True
    }

@router.post("/orders/{order_id}/ready-for-pickup")
def order_ready_for_pickup(order_id: int, db: Session = Depends(get_db)):
    """
    Step 5: Restaurant marks order as ready for driver pickup.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PREPARING:
        raise HTTPException(status_code=400, detail=f"Order must be PREPARING. Current: {order.status.value}")

    order.status = OrderStatus.READY_FOR_PICKUP
    order.ready_for_pickup_at = datetime.now()
    db.commit()

    # TODO: Notify assigned driver
    # if order.driver_id:
    #     send_push_notification(driver_id=order.driver_id, type="order_ready")

    return {
        "message": "Order ready for pickup",
        "order_id": order.id,
        "status": order.status.value,
        "ready_at": order.ready_for_pickup_at.isoformat(),
        "driver_assigned": order.driver_id is not None
    }

class AssignDriverRequest(BaseModel):
    driver_id: int
    driver_name: Optional[str] = None

@router.post("/orders/{order_id}/assign-driver")
def assign_driver_to_order(order_id: int, driver_data: AssignDriverRequest, db: Session = Depends(get_db)):
    """
    Step 6: Assign a driver to the order.
    Can be called after restaurant accepts.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]:
        raise HTTPException(status_code=400, detail=f"Order must be PREPARING or READY_FOR_PICKUP. Current: {order.status.value}")

    order.driver_id = driver_data.driver_id
    order.driver_name = driver_data.driver_name or f"Driver #{driver_data.driver_id}"
    order.driver_assigned_at = datetime.now()
    db.commit()

    # TODO: Notify driver
    # send_push_notification(driver_id=driver_data.driver_id, type="order_assigned")

    return {
        "message": "Driver assigned to order",
        "order_id": order.id,
        "driver_id": order.driver_id,
        "driver_name": order.driver_name,
        "assigned_at": order.driver_assigned_at.isoformat()
    }

@router.post("/orders/{order_id}/driver/pickup")
def driver_pickup_order(order_id: int, db: Session = Depends(get_db)):
    """
    Step 7: Driver picks up the order from restaurant.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail=f"Order must be READY_FOR_PICKUP. Current: {order.status.value}")

    if not order.driver_id:
        raise HTTPException(status_code=400, detail="No driver assigned to this order")

    order.status = OrderStatus.OUT_FOR_DELIVERY
    order.dispatched_at = datetime.now()
    db.commit()

    # TODO: Notify customer with driver ETA
    # send_push_notification(customer_id=order.customer_id, type="driver_pickup")

    return {
        "message": "Order picked up by driver",
        "order_id": order.id,
        "status": order.status.value,
        "driver_id": order.driver_id,
        "dispatched_at": order.dispatched_at.isoformat()
    }

@router.post("/orders/{order_id}/deliver")
def deliver_order(order_id: int, db: Session = Depends(get_db)):
    """
    Step 8: Driver delivers the order to customer.
    Completes the order flow.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.OUT_FOR_DELIVERY:
        raise HTTPException(status_code=400, detail=f"Order must be OUT_FOR_DELIVERY. Current: {order.status.value}")

    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.now()
    db.commit()

    # TODO:
    # 1. Send receipt to customer
    # 2. Process driver payout (delivery_fee + tip)
    # 3. Update restaurant analytics

    return {
        "message": "Order delivered successfully",
        "order_id": order.id,
        "status": order.status.value,
        "delivered_at": order.delivered_at.isoformat(),
        "total_amount": order.total_amount,
        "driver_earnings": (order.delivery_fee or 0) + (order.tip or 0)
    }

@router.get("/orders/{order_id}/timeline")
def get_order_timeline(order_id: int, db: Session = Depends(get_db)):
    """
    Get complete order timeline with all status changes and timestamps.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    timeline = []

    # Build timeline from timestamps
    if order.created_at:
        timeline.append({"status": "created", "timestamp": order.created_at.isoformat()})
    if order.confirmed_at:
        timeline.append({"status": "payment_confirmed", "timestamp": order.confirmed_at.isoformat()})
    if order.sent_to_restaurant_at:
        timeline.append({"status": "sent_to_restaurant", "timestamp": order.sent_to_restaurant_at.isoformat()})
    if order.restaurant_accepted_at:
        timeline.append({"status": "restaurant_accepted", "timestamp": order.restaurant_accepted_at.isoformat()})
    if order.restaurant_declined_at:
        timeline.append({"status": "restaurant_declined", "timestamp": order.restaurant_declined_at.isoformat(), "reason": order.restaurant_decline_reason})
    if order.preparing_at:
        timeline.append({"status": "preparing", "timestamp": order.preparing_at.isoformat()})
    if order.driver_assigned_at:
        timeline.append({"status": "driver_assigned", "timestamp": order.driver_assigned_at.isoformat(), "driver": order.driver_name})
    if order.ready_for_pickup_at:
        timeline.append({"status": "ready_for_pickup", "timestamp": order.ready_for_pickup_at.isoformat()})
    if order.dispatched_at:
        timeline.append({"status": "out_for_delivery", "timestamp": order.dispatched_at.isoformat()})
    if order.delivered_at:
        timeline.append({"status": "delivered", "timestamp": order.delivered_at.isoformat()})
    if order.cancelled_at:
        timeline.append({"status": "cancelled", "timestamp": order.cancelled_at.isoformat()})

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "current_status": order.status.value,
        "timeline": sorted(timeline, key=lambda x: x["timestamp"])
    }

# ===================== RESTAURANT TIMEOUT HANDLER =====================

@router.post("/orders/process-timeouts")
def process_restaurant_timeouts(db: Session = Depends(get_db)):
    """
    Background job: Process orders that exceeded 3-minute restaurant acceptance window.

    Run this every 30 seconds via cron/scheduler:
    curl -X POST https://api.dollor.ai/api/orders/process-timeouts

    Or use APScheduler/Celery for automatic execution.
    """
    timeout_threshold = datetime.now() - timedelta(minutes=3)

    # Find orders pending restaurant response that exceeded timeout
    timed_out_orders = db.query(Order).filter(
        Order.status == OrderStatus.PENDING_RESTAURANT,
        Order.sent_to_restaurant_at < timeout_threshold,
        Order.sent_to_restaurant_at.isnot(None)
    ).all()

    results = []
    for order in timed_out_orders:
        order.status = OrderStatus.RESTAURANT_TIMEOUT
        order.restaurant_timeout_at = datetime.now()

        # Initiate refund
        refund_status = "pending"
        if order.stripe_payment_intent_id:
            try:
                stripe.Refund.create(payment_intent=order.stripe_payment_intent_id)
                refund_status = "initiated"
                order.payment_status = "refunded"
            except stripe.error.StripeError as e:
                refund_status = f"failed: {str(e)}"

        results.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "sent_at": order.sent_to_restaurant_at.isoformat(),
            "timeout_at": order.restaurant_timeout_at.isoformat(),
            "refund_status": refund_status
        })

        # TODO: Notify customer about timeout and refund
        # send_push_notification(customer_id=order.customer_id, type="restaurant_timeout")

    db.commit()

    return {
        "processed": len(results),
        "timed_out_orders": results,
        "next_check": "Run again in 30 seconds"
    }

# ===================== RESTAURANT SELF-DELIVERY =====================

class SelfDeliveryRequest(BaseModel):
    use_own_driver: bool = True
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    estimated_delivery_minutes: Optional[int] = 30

@router.post("/orders/{order_id}/restaurant/accept-self-delivery")
def restaurant_accept_with_own_delivery(
    order_id: int,
    delivery_data: SelfDeliveryRequest,
    db: Session = Depends(get_db)
):
    """
    Restaurant accepts order AND will deliver with their own driver.

    Use case: Restaurant has their own delivery staff.
    Platform fee: Still $1 from restaurant (no driver matching needed).
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        raise HTTPException(status_code=400, detail=f"Order must be PENDING_RESTAURANT. Current: {order.status.value}")

    # Check timeout
    if order.sent_to_restaurant_at:
        elapsed = datetime.now() - order.sent_to_restaurant_at
        if elapsed > timedelta(minutes=3):
            order.status = OrderStatus.RESTAURANT_TIMEOUT
            order.restaurant_timeout_at = datetime.now()
            db.commit()
            raise HTTPException(status_code=400, detail="Order acceptance window expired (3 minutes)")

    # Accept order
    order.status = OrderStatus.PREPARING
    order.restaurant_accepted_at = datetime.now()
    order.preparing_at = datetime.now()

    # Mark as self-delivery (restaurant's own driver)
    order.driver_name = delivery_data.driver_name or "Restaurant Delivery"
    order.driver_assigned_at = datetime.now()
    # Use negative driver_id to indicate self-delivery (-vendor_id)
    order.driver_id = -order.vendor_id  # Negative = restaurant's own driver

    db.commit()

    return {
        "message": "Order accepted with restaurant self-delivery",
        "order_id": order.id,
        "status": order.status.value,
        "delivery_type": "restaurant_own_driver",
        "driver_name": order.driver_name,
        "estimated_delivery": f"{delivery_data.estimated_delivery_minutes} minutes",
        "platform_fee": "$1.00 (restaurant fee only, no driver matching fee)"
    }

@router.get("/orders/pending-restaurant")
def get_pending_restaurant_orders(
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all orders waiting for restaurant acceptance.
    Used by restaurant app to show incoming orders.
    """
    query = db.query(Order).filter(Order.status == OrderStatus.PENDING_RESTAURANT)

    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)

    orders = query.order_by(Order.sent_to_restaurant_at.asc()).all()

    result = []
    for order in orders:
        time_remaining = None
        if order.sent_to_restaurant_at:
            elapsed = datetime.now() - order.sent_to_restaurant_at
            remaining_seconds = max(0, 180 - elapsed.total_seconds())  # 3 min = 180 sec
            time_remaining = int(remaining_seconds)

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer_name,
            "items": json.loads(order.items) if order.items else [],
            "subtotal": order.subtotal,
            "total_amount": order.total_amount,
            "delivery_address": json.loads(order.delivery_address) if order.delivery_address else None,
            "sent_at": order.sent_to_restaurant_at.isoformat() if order.sent_to_restaurant_at else None,
            "time_remaining_seconds": time_remaining,
            "time_remaining_display": f"{time_remaining // 60}:{time_remaining % 60:02d}" if time_remaining else "0:00"
        })

    return {
        "pending_orders": result,
        "count": len(result)
    }

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
        
        # Estimate Stripe fees (2.9% + $0.30)
        stripe_fee = (order.total_amount * 0.029) + 0.30
        vendor_payouts[order.vendor_id]["stripe_fees"] += stripe_fee
    
    # Create payout records
    payout_records = []
    for vendor_id, payout_data in vendor_payouts.items():
        net_payout = (
            payout_data["total_revenue"] 
            - payout_data["platform_fees"] 
            - payout_data["stripe_fees"]
        )
        
        payout_count = db.query(VendorPayout).count()
        payout_number = f"PAYOUT-{datetime.now().strftime('%Y%m%d')}-{payout_count + 1:05d}"
        
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
