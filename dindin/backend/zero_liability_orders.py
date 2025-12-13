"""
ZERO LIABILITY ORDER SYSTEM - BULLETIN BOARD MODEL
===================================================

This module implements a legally protected order flow where:
1. Platform is a BULLETIN BOARD / FACILITATOR only
2. Platform NEVER touches food payments (customer pays restaurant directly)
3. Platform NEVER touches delivery payments (restaurant pays driver directly)
4. Platform ONLY collects $1 platform access fee from customer and restaurant
5. All confirmations are timestamped and recorded for integrity

LEGAL MODEL:
- Section 230 CDA Protection (user-generated content)
- Platform is NOT a payment processor for transactions
- Platform is NOT liable for food quality, delivery, or disputes
- Platform fee is for "access to the marketplace" - NOT transaction fee

REVENUE MODEL:
- Customer: $1 per order (platform access fee)
- Restaurant: $1 per order (listing/visibility fee)
- Driver: $0 (free to use)
- Total: $2 per completed order
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid
import logging

logger = logging.getLogger("dollor.zero_liability")

router = APIRouter(prefix="/api/orders/v2", tags=["Zero Liability Orders"])


# =============================================================================
# ENUMS AND MODELS
# =============================================================================

class OrderStatus(str, Enum):
    # Initial
    PENDING = "pending"                    # Customer placed order
    
    # Payment Confirmation Phase
    AWAITING_PAYMENT = "awaiting_payment"  # Waiting for customer to pay restaurant
    PAYMENT_CONFIRMED = "payment_confirmed" # Restaurant confirms payment received
    
    # Preparation Phase
    PREPARING = "preparing"                # Restaurant preparing food
    READY_FOR_PICKUP = "ready_for_pickup"  # Food ready, waiting for driver
    
    # Delivery Phase
    DRIVER_ASSIGNED = "driver_assigned"    # Driver accepted the delivery
    PICKED_UP = "picked_up"                # Driver picked up food
    IN_TRANSIT = "in_transit"              # Driver en route to customer
    ARRIVED = "arrived"                    # Driver at delivery location
    
    # Completion Phase
    DELIVERED = "delivered"                # Driver marks delivered
    CUSTOMER_CONFIRMED = "customer_confirmed"  # Customer confirms receipt
    DRIVER_PAID = "driver_paid"            # Driver confirms payment from restaurant
    COMPLETED = "completed"                # All confirmations done
    
    # Problem States
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
    REFUND_REQUESTED = "refund_requested"


class PaymentMethod(str, Enum):
    APPLE_PAY = "apple_pay"
    VENMO = "venmo"
    ZELLE = "zelle"
    CASH = "cash"
    PAYPAL = "paypal"
    CARD_DIRECT = "card_direct"  # Customer pays restaurant's card reader
    OTHER = "other"


class PlatformFeeStatus(str, Enum):
    PENDING = "pending"
    CHARGED = "charged"
    FAILED = "failed"
    REFUNDED = "refunded"
    WAIVED = "waived"


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class OrderItemCreate(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float
    notes: Optional[str] = None


class CreateOrderRequest(BaseModel):
    """Customer creates an order - platform fee charged upfront"""
    customer_email: str
    customer_name: str
    customer_phone: str
    restaurant_id: int
    items: List[OrderItemCreate]
    delivery_address: str
    delivery_latitude: float
    delivery_longitude: float
    delivery_instructions: Optional[str] = None
    # Payment to restaurant (NOT processed by us)
    payment_method_to_restaurant: PaymentMethod
    # Platform fee payment (processed by us via Stripe)
    platform_fee_payment_method_id: Optional[str] = None  # Stripe payment method


class ConfirmPaymentRequest(BaseModel):
    """Restaurant confirms they received payment from customer"""
    order_id: str
    restaurant_email: str
    amount_received: float
    payment_method: PaymentMethod
    payment_reference: Optional[str] = None  # Venmo ID, Zelle confirmation, etc.


class ConfirmDeliveryRequest(BaseModel):
    """Customer confirms they received the order"""
    order_id: str
    customer_email: str
    rating: Optional[int] = None  # 1-5 stars
    feedback: Optional[str] = None
    photo_proof: Optional[str] = None  # Base64 or URL


class ConfirmDriverPaymentRequest(BaseModel):
    """Driver confirms they received payment from restaurant"""
    order_id: str
    driver_email: str
    amount_received: float
    payment_method: PaymentMethod
    payment_reference: Optional[str] = None


class OrderResponse(BaseModel):
    order_id: str
    status: OrderStatus
    created_at: str
    
    # Customer info
    customer_name: str
    customer_phone: str
    delivery_address: str
    
    # Restaurant info
    restaurant_id: int
    restaurant_name: str
    
    # Order details
    items: List[dict]
    subtotal: float
    
    # Fees (transparent breakdown)
    platform_fee_customer: float  # $1 paid BY customer TO platform
    platform_fee_restaurant: float  # $1 paid BY restaurant TO platform
    delivery_fee: float  # Paid BY customer TO restaurant, then restaurant pays driver
    
    # Confirmation status
    confirmations: dict
    
    # Legal disclaimer
    disclaimer: str


# =============================================================================
# IN-MEMORY STORAGE (Replace with database in production)
# =============================================================================

orders_db = {}
platform_fees_db = {}


# =============================================================================
# PLATFORM FEE CONFIGURATION
# =============================================================================

PLATFORM_FEE_CUSTOMER = 1.00  # $1 from customer
PLATFORM_FEE_RESTAURANT = 1.00  # $1 from restaurant
DRIVER_FEE = 0.00  # Free for drivers

LEGAL_DISCLAIMER = """
IMPORTANT LEGAL NOTICE:
Dollor.ai is a MARKETPLACE FACILITATOR / BULLETIN BOARD service.

1. PAYMENTS: All food and delivery payments occur DIRECTLY between you and the 
   restaurant/driver. Dollor.ai does NOT process, hold, or guarantee these payments.

2. PLATFORM FEE: The $1 platform fee is for ACCESS to the Dollor.ai marketplace.
   It is NOT a transaction fee, delivery fee, or service charge for the food order.

3. LIABILITY: Dollor.ai is NOT responsible for food quality, delivery timing,
   payment disputes, or any issues between customers, restaurants, and drivers.

4. DISPUTES: Any disputes regarding food, delivery, or payments must be resolved
   directly between the parties involved. Dollor.ai provides confirmation records
   for reference but does NOT mediate or guarantee resolution.

By using this service, you acknowledge and accept these terms.
"""


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/create", response_model=OrderResponse)
async def create_order(request: CreateOrderRequest):
    """
    Create a new order (Zero Liability Model)
    
    Flow:
    1. Customer selects items and submits order
    2. Customer's $1 platform fee is charged via Stripe
    3. Order is created with AWAITING_PAYMENT status
    4. Customer must pay restaurant DIRECTLY (Venmo, Apple Pay to restaurant, etc.)
    5. Restaurant confirms payment received
    6. Order proceeds to preparation
    """
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    
    # Calculate totals
    subtotal = sum(item.quantity * item.price for item in request.items)
    
    # Create order record
    order = {
        "order_id": order_id,
        "status": OrderStatus.AWAITING_PAYMENT,
        "created_at": datetime.utcnow().isoformat(),
        
        # Customer
        "customer_email": request.customer_email,
        "customer_name": request.customer_name,
        "customer_phone": request.customer_phone,
        "delivery_address": request.delivery_address,
        "delivery_latitude": request.delivery_latitude,
        "delivery_longitude": request.delivery_longitude,
        "delivery_instructions": request.delivery_instructions,
        
        # Restaurant
        "restaurant_id": request.restaurant_id,
        "restaurant_name": "Restaurant Name",  # Would fetch from DB
        
        # Items
        "items": [item.dict() for item in request.items],
        "subtotal": subtotal,
        
        # Fees
        "platform_fee_customer": PLATFORM_FEE_CUSTOMER,
        "platform_fee_restaurant": PLATFORM_FEE_RESTAURANT,
        "delivery_fee": 4.99,  # Set by restaurant, NOT platform
        
        # Payment tracking
        "payment_method_to_restaurant": request.payment_method_to_restaurant,
        
        # Confirmations (all start as None/False)
        "confirmations": {
            "customer_platform_fee_paid": False,
            "restaurant_platform_fee_paid": False,
            "restaurant_payment_confirmed": False,
            "restaurant_payment_confirmed_at": None,
            "restaurant_payment_amount": None,
            "restaurant_payment_method": None,
            "driver_assigned": False,
            "driver_email": None,
            "driver_picked_up": False,
            "driver_picked_up_at": None,
            "driver_delivered": False,
            "driver_delivered_at": None,
            "customer_confirmed_delivery": False,
            "customer_confirmed_at": None,
            "driver_payment_confirmed": False,
            "driver_payment_confirmed_at": None,
            "driver_payment_amount": None,
        },
        
        # Timestamps
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    orders_db[order_id] = order
    
    # TODO: Charge customer's $1 platform fee via Stripe
    # stripe.PaymentIntent.create(amount=100, currency='usd', ...)
    order["confirmations"]["customer_platform_fee_paid"] = True
    
    logger.info(f"[ORDER] Created order {order_id} - Awaiting restaurant payment confirmation")
    
    return OrderResponse(
        order_id=order_id,
        status=OrderStatus.AWAITING_PAYMENT,
        created_at=order["created_at"],
        customer_name=order["customer_name"],
        customer_phone=order["customer_phone"],
        delivery_address=order["delivery_address"],
        restaurant_id=order["restaurant_id"],
        restaurant_name=order["restaurant_name"],
        items=order["items"],
        subtotal=subtotal,
        platform_fee_customer=PLATFORM_FEE_CUSTOMER,
        platform_fee_restaurant=PLATFORM_FEE_RESTAURANT,
        delivery_fee=order["delivery_fee"],
        confirmations=order["confirmations"],
        disclaimer=LEGAL_DISCLAIMER
    )


@router.post("/restaurant/confirm-payment")
async def restaurant_confirm_payment(request: ConfirmPaymentRequest):
    """
    Restaurant confirms they received payment from customer.
    
    This is the KEY step that moves the order forward.
    Platform does NOT verify this - it's the restaurant's responsibility.
    """
    if request.order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[request.order_id]
    
    # Update confirmations
    order["confirmations"]["restaurant_payment_confirmed"] = True
    order["confirmations"]["restaurant_payment_confirmed_at"] = datetime.utcnow().isoformat()
    order["confirmations"]["restaurant_payment_amount"] = request.amount_received
    order["confirmations"]["restaurant_payment_method"] = request.payment_method
    
    # Update status
    order["status"] = OrderStatus.PAYMENT_CONFIRMED
    order["updated_at"] = datetime.utcnow().isoformat()
    
    # TODO: Charge restaurant's $1 platform fee via Stripe
    order["confirmations"]["restaurant_platform_fee_paid"] = True
    
    logger.info(f"[ORDER] {request.order_id} - Restaurant confirmed ${request.amount_received} via {request.payment_method}")
    
    return {
        "success": True,
        "order_id": request.order_id,
        "status": OrderStatus.PAYMENT_CONFIRMED,
        "message": "Payment confirmed. You can now start preparing the order.",
        "next_step": "Mark order as 'Preparing' when you start cooking",
        "confirmations": order["confirmations"],
        "disclaimer": "Platform recorded your confirmation. Dollor.ai is not responsible for payment disputes."
    }


@router.post("/restaurant/update-status")
async def restaurant_update_status(order_id: str, new_status: str, restaurant_email: str):
    """Restaurant updates order status (preparing, ready for pickup)"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[order_id]
    
    valid_transitions = {
        OrderStatus.PAYMENT_CONFIRMED: [OrderStatus.PREPARING],
        OrderStatus.PREPARING: [OrderStatus.READY_FOR_PICKUP],
    }
    
    current = OrderStatus(order["status"])
    new = OrderStatus(new_status)
    
    if new not in valid_transitions.get(current, []):
        raise HTTPException(status_code=400, detail=f"Cannot transition from {current} to {new}")
    
    order["status"] = new
    order["updated_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"[ORDER] {order_id} - Status updated to {new}")
    
    return {
        "success": True,
        "order_id": order_id,
        "status": new,
        "message": f"Order status updated to {new}"
    }


@router.post("/driver/accept")
async def driver_accept_order(order_id: str, driver_email: str):
    """Driver accepts a delivery"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[order_id]
    
    if order["status"] != OrderStatus.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail="Order not ready for pickup")
    
    order["status"] = OrderStatus.DRIVER_ASSIGNED
    order["confirmations"]["driver_assigned"] = True
    order["confirmations"]["driver_email"] = driver_email
    order["updated_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"[ORDER] {order_id} - Driver {driver_email} assigned")
    
    return {
        "success": True,
        "order_id": order_id,
        "status": OrderStatus.DRIVER_ASSIGNED,
        "pickup_address": "Restaurant Address",  # Would fetch from DB
        "delivery_address": order["delivery_address"],
        "delivery_instructions": order["delivery_instructions"],
        "customer_phone": order["customer_phone"],
        "items": order["items"],
        "delivery_fee": order["delivery_fee"],
        "disclaimer": "Delivery fee will be paid by restaurant after delivery confirmation. Platform is not responsible for driver payments."
    }


@router.post("/driver/picked-up")
async def driver_picked_up(order_id: str, driver_email: str):
    """Driver confirms pickup from restaurant"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[order_id]
    
    order["status"] = OrderStatus.PICKED_UP
    order["confirmations"]["driver_picked_up"] = True
    order["confirmations"]["driver_picked_up_at"] = datetime.utcnow().isoformat()
    order["updated_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"[ORDER] {order_id} - Driver picked up order")
    
    return {
        "success": True,
        "order_id": order_id,
        "status": OrderStatus.PICKED_UP,
        "message": "Pickup confirmed. Head to delivery address.",
        "delivery_address": order["delivery_address"]
    }


@router.post("/driver/delivered")
async def driver_delivered(order_id: str, driver_email: str, photo_proof: Optional[str] = None):
    """Driver marks order as delivered"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[order_id]
    
    order["status"] = OrderStatus.DELIVERED
    order["confirmations"]["driver_delivered"] = True
    order["confirmations"]["driver_delivered_at"] = datetime.utcnow().isoformat()
    if photo_proof:
        order["confirmations"]["delivery_photo"] = photo_proof
    order["updated_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"[ORDER] {order_id} - Driver marked as delivered")
    
    return {
        "success": True,
        "order_id": order_id,
        "status": OrderStatus.DELIVERED,
        "message": "Delivery marked complete. Waiting for customer confirmation.",
        "next_step": "Customer will confirm receipt. Then contact restaurant for your delivery fee payment."
    }


@router.post("/customer/confirm-delivery")
async def customer_confirm_delivery(request: ConfirmDeliveryRequest):
    """
    Customer confirms they received the order.
    
    This is crucial for platform integrity.
    """
    if request.order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[request.order_id]
    
    order["status"] = OrderStatus.CUSTOMER_CONFIRMED
    order["confirmations"]["customer_confirmed_delivery"] = True
    order["confirmations"]["customer_confirmed_at"] = datetime.utcnow().isoformat()
    if request.rating:
        order["confirmations"]["customer_rating"] = request.rating
    if request.feedback:
        order["confirmations"]["customer_feedback"] = request.feedback
    order["updated_at"] = datetime.utcnow().isoformat()
    
    logger.info(f"[ORDER] {request.order_id} - Customer confirmed delivery")
    
    return {
        "success": True,
        "order_id": request.order_id,
        "status": OrderStatus.CUSTOMER_CONFIRMED,
        "message": "Thank you for confirming your delivery!",
        "confirmations": order["confirmations"],
        "disclaimer": "Order complete on customer side. Driver payment is between restaurant and driver."
    }


@router.post("/driver/confirm-payment")
async def driver_confirm_payment(request: ConfirmDriverPaymentRequest):
    """
    Driver confirms they received payment from restaurant.
    
    This completes the order flow.
    """
    if request.order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[request.order_id]
    
    order["confirmations"]["driver_payment_confirmed"] = True
    order["confirmations"]["driver_payment_confirmed_at"] = datetime.utcnow().isoformat()
    order["confirmations"]["driver_payment_amount"] = request.amount_received
    order["confirmations"]["driver_payment_method"] = request.payment_method
    
    # Check if all confirmations are complete
    all_confirmed = (
        order["confirmations"]["customer_platform_fee_paid"] and
        order["confirmations"]["restaurant_platform_fee_paid"] and
        order["confirmations"]["restaurant_payment_confirmed"] and
        order["confirmations"]["customer_confirmed_delivery"] and
        order["confirmations"]["driver_payment_confirmed"]
    )
    
    if all_confirmed:
        order["status"] = OrderStatus.COMPLETED
        logger.info(f"[ORDER] {request.order_id} - FULLY COMPLETED with all confirmations")
    else:
        order["status"] = OrderStatus.DRIVER_PAID
    
    order["updated_at"] = datetime.utcnow().isoformat()
    
    return {
        "success": True,
        "order_id": request.order_id,
        "status": order["status"],
        "message": "Payment confirmed. Order complete!" if all_confirmed else "Payment confirmed.",
        "all_confirmations_complete": all_confirmed,
        "confirmations": order["confirmations"]
    }


@router.get("/status/{order_id}")
async def get_order_status(order_id: str):
    """Get full order status with all confirmations"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = orders_db[order_id]
    
    return {
        "order_id": order_id,
        "status": order["status"],
        "created_at": order["created_at"],
        "updated_at": order["updated_at"],
        
        "customer_name": order["customer_name"],
        "delivery_address": order["delivery_address"],
        "restaurant_id": order["restaurant_id"],
        
        "items": order["items"],
        "subtotal": order["subtotal"],
        
        "fees": {
            "platform_fee_customer": order["platform_fee_customer"],
            "platform_fee_restaurant": order["platform_fee_restaurant"],
            "delivery_fee": order["delivery_fee"],
            "total_platform_revenue": order["platform_fee_customer"] + order["platform_fee_restaurant"]
        },
        
        "confirmations": order["confirmations"],
        
        "integrity_check": {
            "customer_paid_platform": order["confirmations"]["customer_platform_fee_paid"],
            "restaurant_paid_platform": order["confirmations"]["restaurant_platform_fee_paid"],
            "restaurant_received_food_payment": order["confirmations"]["restaurant_payment_confirmed"],
            "customer_received_food": order["confirmations"]["customer_confirmed_delivery"],
            "driver_received_payment": order["confirmations"]["driver_payment_confirmed"],
            "all_complete": order["status"] == OrderStatus.COMPLETED
        },
        
        "disclaimer": LEGAL_DISCLAIMER
    }


@router.get("/available-for-drivers")
async def get_available_orders_for_drivers():
    """Get orders ready for pickup (for driver app)"""
    available = [
        {
            "order_id": order["order_id"],
            "restaurant_name": order["restaurant_name"],
            "pickup_address": "Restaurant Address",  # Would fetch from DB
            "delivery_address": order["delivery_address"],
            "delivery_fee": order["delivery_fee"],
            "items_count": len(order["items"]),
            "created_at": order["created_at"]
        }
        for order in orders_db.values()
        if order["status"] == OrderStatus.READY_FOR_PICKUP
    ]
    
    return {
        "available_orders": available,
        "count": len(available),
        "disclaimer": "Delivery fees are paid by restaurants AFTER delivery. Platform does not guarantee driver payments."
    }


# =============================================================================
# LEGAL SUMMARY ENDPOINT
# =============================================================================

@router.get("/legal/zero-liability-model")
async def get_zero_liability_model():
    """Explain the zero liability order model"""
    return {
        "model_name": "Zero Liability Bulletin Board / Marketplace Facilitator",
        
        "what_platform_does": [
            "Displays restaurant menus and listings",
            "Allows customers to create order requests",
            "Facilitates communication between parties",
            "Records confirmation timestamps",
            "Charges $1 platform access fee to customers",
            "Charges $1 listing fee to restaurants",
            "Provides confirmation/integrity tracking"
        ],
        
        "what_platform_does_NOT_do": [
            "Process food payments (customer pays restaurant directly)",
            "Process delivery payments (restaurant pays driver directly)",
            "Hold or escrow any transaction funds",
            "Guarantee food quality or delivery",
            "Employ or contract drivers",
            "Set food prices or delivery fees",
            "Mediate or resolve disputes",
            "Provide insurance coverage"
        ],
        
        "payment_flow": {
            "step_1": "Customer places order request",
            "step_2": "Customer pays $1 platform fee to Dollor.ai (via Stripe)",
            "step_3": "Customer pays restaurant DIRECTLY (Venmo, Apple Pay, Cash, etc.)",
            "step_4": "Restaurant confirms payment received (in app)",
            "step_5": "Restaurant pays $1 platform fee to Dollor.ai",
            "step_6": "Restaurant prepares food, driver delivers",
            "step_7": "Customer confirms delivery received (in app)",
            "step_8": "Restaurant pays driver DIRECTLY (Venmo, Cash, etc.)",
            "step_9": "Driver confirms payment received (in app)",
            "step_10": "Order marked COMPLETE with all confirmations"
        },
        
        "legal_protections": {
            "section_230_cda": "Platform is facilitator of user-generated content",
            "not_a_payment_processor": "We don't touch food/delivery money",
            "not_an_employer": "Drivers are not our contractors or employees",
            "clear_disclaimers": "All parties acknowledge terms before use"
        },
        
        "platform_revenue": {
            "per_order": "$2 ($1 from customer + $1 from restaurant)",
            "driver_cost": "$0 (free for drivers)",
            "payment_processing": "Only for $1 platform fees via Stripe (~$0.03 fee)"
        },
        
        "disclaimer": LEGAL_DISCLAIMER
    }
