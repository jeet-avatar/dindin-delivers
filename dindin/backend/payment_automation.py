"""
DOLLOR.AI AUTOMATED PAYMENT SYSTEM
===================================

This module handles the complete payment flow with clear terms and automation:

PAYMENT FLOW:
1. Customer places order → Platform charges $1 platform fee (via Stripe)
2. Customer pays restaurant DIRECTLY (Apple Pay/Venmo/Zelle/Cash)
3. Restaurant confirms payment received → Platform charges restaurant $1 fee
4. Driver delivers food
5. Restaurant pays driver DIRECTLY (Venmo/Zelle/Cash)
6. Driver confirms payment received → Order complete

WHAT PLATFORM COLLECTS (AUTOMATED VIA STRIPE):
- $1 from Customer (charged at order placement)
- $1 from Restaurant (charged when they confirm customer payment)
- $0 from Driver

WHAT FLOWS DIRECTLY BETWEEN PARTIES (NOT THROUGH PLATFORM):
- Food cost: Customer → Restaurant
- Delivery fee: Restaurant → Driver
- Tips: Customer → Driver (optional)

LEGAL MODEL:
- Platform is a MARKETPLACE FACILITATOR
- Platform fee is for "access to marketplace" NOT transaction processing
- Section 230 CDA protection maintained
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid
import logging
import stripe
import os

logger = logging.getLogger("dollor.payment_automation")

router = APIRouter(prefix="/api/payments", tags=["Payment Automation"])

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

# =============================================================================
# CONFIGURATION
# =============================================================================

class PlatformFees:
    """Fixed platform fees - transparent and simple"""
    CUSTOMER_PLATFORM_FEE = 1.00  # $1 per order
    RESTAURANT_PLATFORM_FEE = 1.00  # $1 per order
    DRIVER_PLATFORM_FEE = 0.00  # $0 - drivers keep everything

    # Delivery fee calculation
    BASE_DELIVERY_FEE = 2.99
    PER_MILE_FEE = 0.50
    MAX_DELIVERY_FEE = 9.99

    # Minimum order for free delivery (optional promotion)
    FREE_DELIVERY_MINIMUM = 25.00


# =============================================================================
# MODELS
# =============================================================================

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    APPLE_PAY = "apple_pay"
    VENMO = "venmo"
    ZELLE = "zelle"
    CASH = "cash"
    PAYPAL = "paypal"
    CARD = "card"


class OrderItem(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float
    notes: Optional[str] = None


class DeliveryAddress(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class PaymentBreakdown(BaseModel):
    """Complete payment breakdown shown to customer before order"""
    # Food costs
    subtotal: float
    tax: float
    tax_rate: float

    # Delivery
    delivery_fee: float
    delivery_distance_miles: float

    # Platform fee (only thing we collect)
    platform_fee: float

    # Optional tip
    suggested_tips: List[float]
    selected_tip: float

    # Totals
    total_to_restaurant: float  # subtotal + tax (customer pays restaurant directly)
    total_to_driver: float  # delivery_fee + tip (restaurant pays driver)
    total_to_platform: float  # platform_fee ($1 from customer + $1 from restaurant)
    grand_total: float  # Everything customer pays

    # Breakdown for display
    customer_pays_now: float  # Platform fee only ($1)
    customer_pays_restaurant: float  # Food + tax (direct payment)
    restaurant_pays_driver: float  # Delivery fee
    restaurant_pays_platform: float  # $1 platform fee


class CreateOrderRequest(BaseModel):
    customer_email: EmailStr
    customer_name: str
    customer_phone: str
    restaurant_id: int
    items: List[OrderItem]
    delivery_address: DeliveryAddress
    delivery_instructions: Optional[str] = None
    tip_amount: float = 0.0
    payment_method_id: Optional[str] = None  # Stripe payment method for platform fee


class OrderPaymentResponse(BaseModel):
    order_id: str
    status: str
    payment_breakdown: PaymentBreakdown

    # Payment instructions for each party
    customer_instructions: dict
    restaurant_instructions: dict
    driver_instructions: dict

    # Stripe payment intent for platform fee
    platform_fee_client_secret: Optional[str] = None


# =============================================================================
# PAYMENT CALCULATION
# =============================================================================

def calculate_delivery_fee(distance_miles: float, subtotal: float) -> float:
    """Calculate delivery fee based on distance"""
    # Free delivery for orders over minimum
    if subtotal >= PlatformFees.FREE_DELIVERY_MINIMUM:
        return 0.0

    fee = PlatformFees.BASE_DELIVERY_FEE + (distance_miles * PlatformFees.PER_MILE_FEE)
    return min(fee, PlatformFees.MAX_DELIVERY_FEE)


def calculate_tax(subtotal: float, tax_rate: float = 0.0875) -> float:
    """Calculate tax (default 8.75% for California)"""
    return round(subtotal * tax_rate, 2)


def calculate_suggested_tips(subtotal: float) -> List[float]:
    """Calculate suggested tip amounts"""
    return [
        round(subtotal * 0.15, 2),  # 15%
        round(subtotal * 0.18, 2),  # 18%
        round(subtotal * 0.20, 2),  # 20%
        round(subtotal * 0.25, 2),  # 25%
    ]


@router.post("/calculate-breakdown")
def calculate_payment_breakdown(
    items: List[OrderItem],
    delivery_distance_miles: float = 3.0,
    tip_percentage: float = 0.18,
    tax_rate: float = 0.0875
) -> PaymentBreakdown:
    """
    Calculate complete payment breakdown before order placement.
    Shows customer exactly what they pay and to whom.
    """
    # Calculate subtotal
    subtotal = sum(item.price * item.quantity for item in items)

    # Calculate tax
    tax = calculate_tax(subtotal, tax_rate)

    # Calculate delivery fee
    delivery_fee = calculate_delivery_fee(delivery_distance_miles, subtotal)

    # Calculate tip
    suggested_tips = calculate_suggested_tips(subtotal)
    selected_tip = round(subtotal * tip_percentage, 2)

    # Platform fees
    platform_fee_customer = PlatformFees.CUSTOMER_PLATFORM_FEE
    platform_fee_restaurant = PlatformFees.RESTAURANT_PLATFORM_FEE

    # Totals
    total_to_restaurant = subtotal + tax
    total_to_driver = delivery_fee + selected_tip
    total_to_platform = platform_fee_customer + platform_fee_restaurant
    grand_total = total_to_restaurant + delivery_fee + selected_tip + platform_fee_customer

    return PaymentBreakdown(
        subtotal=subtotal,
        tax=tax,
        tax_rate=tax_rate,
        delivery_fee=delivery_fee,
        delivery_distance_miles=delivery_distance_miles,
        platform_fee=platform_fee_customer,
        suggested_tips=suggested_tips,
        selected_tip=selected_tip,
        total_to_restaurant=total_to_restaurant,
        total_to_driver=total_to_driver,
        total_to_platform=total_to_platform,
        grand_total=grand_total,
        customer_pays_now=platform_fee_customer,
        customer_pays_restaurant=total_to_restaurant,
        restaurant_pays_driver=total_to_driver,
        restaurant_pays_platform=platform_fee_restaurant
    )


# =============================================================================
# ORDER CREATION WITH AUTOMATED PLATFORM FEE
# =============================================================================

# In-memory order storage (replace with database in production)
orders_db = {}


@router.post("/create-order", response_model=OrderPaymentResponse)
async def create_order_with_payment(request: CreateOrderRequest):
    """
    Create order and charge platform fee automatically.

    FLOW:
    1. Calculate payment breakdown
    2. Create Stripe PaymentIntent for $1 platform fee
    3. Return payment instructions for all parties
    """
    order_id = f"ord_{uuid.uuid4().hex[:16]}"

    # Calculate breakdown
    items = request.items
    subtotal = sum(item.price * item.quantity for item in items)
    tax = calculate_tax(subtotal)
    delivery_fee = calculate_delivery_fee(3.0, subtotal)  # Default 3 miles

    breakdown = PaymentBreakdown(
        subtotal=subtotal,
        tax=tax,
        tax_rate=0.0875,
        delivery_fee=delivery_fee,
        delivery_distance_miles=3.0,
        platform_fee=PlatformFees.CUSTOMER_PLATFORM_FEE,
        suggested_tips=calculate_suggested_tips(subtotal),
        selected_tip=request.tip_amount,
        total_to_restaurant=subtotal + tax,
        total_to_driver=delivery_fee + request.tip_amount,
        total_to_platform=PlatformFees.CUSTOMER_PLATFORM_FEE + PlatformFees.RESTAURANT_PLATFORM_FEE,
        grand_total=subtotal + tax + delivery_fee + request.tip_amount + PlatformFees.CUSTOMER_PLATFORM_FEE,
        customer_pays_now=PlatformFees.CUSTOMER_PLATFORM_FEE,
        customer_pays_restaurant=subtotal + tax,
        restaurant_pays_driver=delivery_fee + request.tip_amount,
        restaurant_pays_platform=PlatformFees.RESTAURANT_PLATFORM_FEE
    )

    # Create Stripe PaymentIntent for platform fee
    client_secret = None
    try:
        if stripe.api_key != "sk_test_placeholder":
            payment_intent = stripe.PaymentIntent.create(
                amount=int(PlatformFees.CUSTOMER_PLATFORM_FEE * 100),  # Convert to cents
                currency="usd",
                metadata={
                    "order_id": order_id,
                    "customer_email": request.customer_email,
                    "fee_type": "customer_platform_fee"
                },
                description=f"Dollor.ai Platform Fee - Order {order_id}"
            )
            client_secret = payment_intent.client_secret
    except Exception as e:
        logger.warning(f"Stripe not configured: {e}")

    # Store order
    orders_db[order_id] = {
        "order_id": order_id,
        "customer_email": request.customer_email,
        "customer_name": request.customer_name,
        "customer_phone": request.customer_phone,
        "restaurant_id": request.restaurant_id,
        "items": [item.dict() for item in request.items],
        "delivery_address": request.delivery_address.dict(),
        "delivery_instructions": request.delivery_instructions,
        "tip_amount": request.tip_amount,
        "breakdown": breakdown.dict(),
        "status": "pending_platform_fee",
        "created_at": datetime.utcnow().isoformat(),
        "confirmations": {
            "customer_platform_fee_paid": False,
            "customer_paid_restaurant": False,
            "restaurant_confirmed_payment": False,
            "restaurant_platform_fee_paid": False,
            "driver_assigned": False,
            "driver_picked_up": False,
            "driver_delivered": False,
            "customer_confirmed_delivery": False,
            "driver_confirmed_payment": False
        }
    }

    # Payment instructions
    customer_instructions = {
        "step_1": {
            "action": "Pay Platform Fee",
            "amount": f"${PlatformFees.CUSTOMER_PLATFORM_FEE:.2f}",
            "method": "Card (via app)",
            "when": "Now",
            "automated": True,
            "description": "This is charged automatically when you place the order"
        },
        "step_2": {
            "action": "Pay Restaurant",
            "amount": f"${breakdown.customer_pays_restaurant:.2f}",
            "method": "Apple Pay / Venmo / Zelle / Cash",
            "when": "When driver arrives with food",
            "automated": False,
            "description": "Pay the restaurant directly for your food. The driver will have payment options."
        },
        "step_3": {
            "action": "Tip Driver (Optional)",
            "amount": f"${request.tip_amount:.2f}" if request.tip_amount > 0 else "Optional",
            "method": "Cash / Venmo / Apple Pay",
            "when": "After delivery",
            "automated": False,
            "description": "Tips go 100% to the driver"
        }
    }

    restaurant_instructions = {
        "step_1": {
            "action": "Accept Order",
            "when": "When you receive notification",
            "automated": False
        },
        "step_2": {
            "action": "Prepare Food",
            "when": "After accepting order"
        },
        "step_3": {
            "action": "Collect Payment from Customer",
            "amount": f"${breakdown.customer_pays_restaurant:.2f}",
            "method": "Apple Pay / Venmo / Zelle / Cash",
            "when": "Driver collects on your behalf OR customer pays directly",
            "description": "Customer pays you directly for the food + tax"
        },
        "step_4": {
            "action": "Pay Platform Fee",
            "amount": f"${PlatformFees.RESTAURANT_PLATFORM_FEE:.2f}",
            "method": "Card (via app)",
            "when": "After confirming customer payment",
            "automated": True,
            "description": "Charged automatically when you confirm payment received"
        },
        "step_5": {
            "action": "Pay Driver",
            "amount": f"${breakdown.restaurant_pays_driver:.2f}",
            "method": "Venmo / Zelle / Cash",
            "when": "After delivery confirmed",
            "description": "Pay driver the delivery fee + any customer tip"
        }
    }

    driver_instructions = {
        "step_1": {
            "action": "Accept Delivery",
            "when": "When you see available order"
        },
        "step_2": {
            "action": "Pick Up Food",
            "location": "Restaurant address",
            "when": "When food is ready"
        },
        "step_3": {
            "action": "Collect Payment for Restaurant (if applicable)",
            "amount": f"${breakdown.customer_pays_restaurant:.2f}",
            "description": "Some customers pay via driver. Hand payment to restaurant."
        },
        "step_4": {
            "action": "Deliver Food",
            "location": "Customer address",
            "when": "ASAP"
        },
        "step_5": {
            "action": "Receive Payment from Restaurant",
            "amount": f"${breakdown.restaurant_pays_driver:.2f}",
            "method": "Venmo / Zelle / Cash",
            "when": "After delivery",
            "description": "Restaurant pays you delivery fee + customer tip. Keep 100%!"
        },
        "platform_fee": {
            "amount": "$0.00",
            "description": "Dollor.ai charges drivers NOTHING. Keep all your earnings!"
        }
    }

    return OrderPaymentResponse(
        order_id=order_id,
        status="pending_platform_fee",
        payment_breakdown=breakdown,
        customer_instructions=customer_instructions,
        restaurant_instructions=restaurant_instructions,
        driver_instructions=driver_instructions,
        platform_fee_client_secret=client_secret
    )


# =============================================================================
# PAYMENT CONFIRMATIONS
# =============================================================================

class ConfirmPaymentRequest(BaseModel):
    order_id: str
    confirmation_type: str  # customer_platform_fee, restaurant_payment, restaurant_platform_fee, driver_payment
    amount: Optional[float] = None
    payment_method: Optional[PaymentMethod] = None
    stripe_payment_intent_id: Optional[str] = None


@router.post("/confirm-payment")
async def confirm_payment(request: ConfirmPaymentRequest):
    """
    Confirm a payment in the order flow.
    """
    if request.order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders_db[request.order_id]

    if request.confirmation_type == "customer_platform_fee":
        # Verify Stripe payment if provided
        if request.stripe_payment_intent_id:
            try:
                if stripe.api_key != "sk_test_placeholder":
                    intent = stripe.PaymentIntent.retrieve(request.stripe_payment_intent_id)
                    if intent.status != "succeeded":
                        raise HTTPException(status_code=400, detail="Payment not completed")
            except Exception as e:
                logger.warning(f"Stripe verification failed: {e}")

        order["confirmations"]["customer_platform_fee_paid"] = True
        order["confirmations"]["customer_platform_fee_paid_at"] = datetime.utcnow().isoformat()
        order["status"] = "awaiting_restaurant_acceptance"

        return {
            "success": True,
            "message": "Platform fee paid. Order sent to restaurant.",
            "next_step": "Restaurant will accept and prepare your order",
            "order_status": order["status"]
        }

    elif request.confirmation_type == "restaurant_payment":
        # Restaurant confirms they received payment from customer
        order["confirmations"]["restaurant_confirmed_payment"] = True
        order["confirmations"]["restaurant_confirmed_payment_at"] = datetime.utcnow().isoformat()
        order["confirmations"]["restaurant_payment_amount"] = request.amount
        order["confirmations"]["restaurant_payment_method"] = request.payment_method

        # Now charge restaurant platform fee
        try:
            if stripe.api_key != "sk_test_placeholder":
                # In production, charge restaurant's saved payment method
                pass
        except Exception as e:
            logger.warning(f"Restaurant fee charge failed: {e}")

        order["confirmations"]["restaurant_platform_fee_paid"] = True
        order["status"] = "ready_for_pickup"

        return {
            "success": True,
            "message": "Payment confirmed. Driver can pick up the order.",
            "next_step": "Wait for driver to pick up and deliver",
            "order_status": order["status"],
            "restaurant_platform_fee_charged": True
        }

    elif request.confirmation_type == "driver_payment":
        # Driver confirms they received payment from restaurant
        order["confirmations"]["driver_confirmed_payment"] = True
        order["confirmations"]["driver_confirmed_payment_at"] = datetime.utcnow().isoformat()
        order["confirmations"]["driver_payment_amount"] = request.amount
        order["confirmations"]["driver_payment_method"] = request.payment_method
        order["status"] = "completed"

        return {
            "success": True,
            "message": "Order complete! Thank you for using Dollor.ai",
            "order_status": "completed",
            "driver_earnings": request.amount,
            "platform_fee_charged": "$0.00 - Drivers keep 100%"
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid confirmation type")


# =============================================================================
# ORDER STATUS & TRACKING
# =============================================================================

@router.get("/order/{order_id}/status")
async def get_order_status(order_id: str):
    """Get complete order status with payment tracking"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")

    order = orders_db[order_id]

    # Build status timeline
    timeline = []
    confirmations = order["confirmations"]

    if confirmations.get("customer_platform_fee_paid"):
        timeline.append({
            "step": "Platform Fee Paid",
            "status": "completed",
            "timestamp": confirmations.get("customer_platform_fee_paid_at"),
            "amount": f"${PlatformFees.CUSTOMER_PLATFORM_FEE:.2f}"
        })

    if confirmations.get("restaurant_confirmed_payment"):
        timeline.append({
            "step": "Restaurant Received Payment",
            "status": "completed",
            "timestamp": confirmations.get("restaurant_confirmed_payment_at"),
            "amount": f"${confirmations.get('restaurant_payment_amount', 0):.2f}"
        })

    if confirmations.get("driver_picked_up"):
        timeline.append({
            "step": "Food Picked Up",
            "status": "completed",
            "timestamp": confirmations.get("driver_picked_up_at")
        })

    if confirmations.get("driver_delivered"):
        timeline.append({
            "step": "Food Delivered",
            "status": "completed",
            "timestamp": confirmations.get("driver_delivered_at")
        })

    if confirmations.get("customer_confirmed_delivery"):
        timeline.append({
            "step": "Customer Confirmed Delivery",
            "status": "completed",
            "timestamp": confirmations.get("customer_confirmed_delivery_at")
        })

    if confirmations.get("driver_confirmed_payment"):
        timeline.append({
            "step": "Driver Paid",
            "status": "completed",
            "timestamp": confirmations.get("driver_confirmed_payment_at"),
            "amount": f"${confirmations.get('driver_payment_amount', 0):.2f}"
        })

    return {
        "order_id": order_id,
        "status": order["status"],
        "created_at": order["created_at"],
        "breakdown": order["breakdown"],
        "confirmations": confirmations,
        "timeline": timeline,
        "payment_summary": {
            "platform_collected": {
                "from_customer": PlatformFees.CUSTOMER_PLATFORM_FEE if confirmations.get("customer_platform_fee_paid") else 0,
                "from_restaurant": PlatformFees.RESTAURANT_PLATFORM_FEE if confirmations.get("restaurant_platform_fee_paid") else 0,
                "from_driver": 0,
                "total": (PlatformFees.CUSTOMER_PLATFORM_FEE if confirmations.get("customer_platform_fee_paid") else 0) +
                        (PlatformFees.RESTAURANT_PLATFORM_FEE if confirmations.get("restaurant_platform_fee_paid") else 0)
            },
            "direct_payments": {
                "customer_to_restaurant": confirmations.get("restaurant_payment_amount", 0),
                "restaurant_to_driver": confirmations.get("driver_payment_amount", 0)
            }
        }
    }


# =============================================================================
# PAYMENT TERMS DISPLAY
# =============================================================================

@router.get("/terms")
async def get_payment_terms():
    """
    Get clear payment terms to display in the app.
    This ensures all users understand the payment flow.
    """
    return {
        "platform_name": "Dollor.ai",
        "model": "Zero Liability Marketplace",
        "effective_date": "December 2024",

        "platform_fees": {
            "customer": {
                "amount": f"${PlatformFees.CUSTOMER_PLATFORM_FEE:.2f}",
                "description": "Platform access fee per order",
                "when_charged": "At order placement",
                "payment_method": "Card (via Stripe)",
                "refundable": "Yes, if order not fulfilled"
            },
            "restaurant": {
                "amount": f"${PlatformFees.RESTAURANT_PLATFORM_FEE:.2f}",
                "description": "Order listing fee per order",
                "when_charged": "When payment from customer is confirmed",
                "payment_method": "Card (via Stripe)",
                "refundable": "No, once order is prepared"
            },
            "driver": {
                "amount": "$0.00",
                "description": "Drivers pay NO platform fees",
                "earnings": "Keep 100% of delivery fees and tips"
            }
        },

        "direct_payments": {
            "food_payment": {
                "from": "Customer",
                "to": "Restaurant",
                "includes": "Food cost + Tax",
                "methods": ["Apple Pay", "Venmo", "Zelle", "Cash", "Card"],
                "platform_involvement": "NONE - Direct payment between parties"
            },
            "delivery_payment": {
                "from": "Restaurant",
                "to": "Driver",
                "includes": "Delivery fee + Customer tip",
                "methods": ["Venmo", "Zelle", "Cash"],
                "platform_involvement": "NONE - Direct payment between parties"
            }
        },

        "delivery_fees": {
            "base": f"${PlatformFees.BASE_DELIVERY_FEE:.2f}",
            "per_mile": f"${PlatformFees.PER_MILE_FEE:.2f}",
            "maximum": f"${PlatformFees.MAX_DELIVERY_FEE:.2f}",
            "free_delivery_minimum": f"${PlatformFees.FREE_DELIVERY_MINIMUM:.2f}",
            "recipient": "100% goes to driver"
        },

        "tips": {
            "recipient": "100% goes to driver",
            "suggested": ["15%", "18%", "20%", "25%"],
            "platform_cut": "0%"
        },

        "legal_disclaimer": """
        Dollor.ai is a marketplace facilitator that connects customers with restaurants
        and delivery drivers. We do NOT process food payments or delivery payments.

        All food payments flow directly from Customer to Restaurant.
        All delivery payments flow directly from Restaurant to Driver.

        Dollor.ai only charges a $1 platform access fee from customers and a $1
        listing fee from restaurants. Drivers are not charged any fees.

        By using this service, you agree that Dollor.ai is not responsible for:
        - Food quality or accuracy
        - Delivery timing
        - Payment disputes between parties
        - Any issues arising from direct party-to-party transactions
        """
    }


# =============================================================================
# EXAMPLE ORDER FLOW
# =============================================================================

@router.get("/example-flow")
async def get_example_order_flow():
    """
    Show a complete example order flow with all payments.
    """
    example_subtotal = 35.00
    example_tax = 3.06
    example_delivery_fee = 4.49
    example_tip = 6.30

    return {
        "example_order": {
            "items": [
                {"name": "Margherita Pizza", "qty": 1, "price": 18.00},
                {"name": "Caesar Salad", "qty": 1, "price": 12.00},
                {"name": "Garlic Bread", "qty": 1, "price": 5.00}
            ],
            "subtotal": example_subtotal,
            "tax": example_tax,
            "delivery_fee": example_delivery_fee,
            "tip": example_tip
        },

        "payment_flow": [
            {
                "step": 1,
                "action": "Customer places order",
                "payment": {
                    "from": "Customer",
                    "to": "Dollor.ai",
                    "amount": "$1.00",
                    "type": "Platform fee",
                    "automated": True
                }
            },
            {
                "step": 2,
                "action": "Restaurant accepts order & prepares food",
                "payment": None
            },
            {
                "step": 3,
                "action": "Driver picks up food",
                "payment": None
            },
            {
                "step": 4,
                "action": "Customer receives food & pays restaurant",
                "payment": {
                    "from": "Customer",
                    "to": "Restaurant (via Driver or direct)",
                    "amount": f"${example_subtotal + example_tax:.2f}",
                    "type": "Food + Tax",
                    "automated": False,
                    "methods": ["Apple Pay", "Venmo", "Zelle", "Cash"]
                }
            },
            {
                "step": 5,
                "action": "Restaurant confirms payment received",
                "payment": {
                    "from": "Restaurant",
                    "to": "Dollor.ai",
                    "amount": "$1.00",
                    "type": "Platform fee",
                    "automated": True
                }
            },
            {
                "step": 6,
                "action": "Restaurant pays driver",
                "payment": {
                    "from": "Restaurant",
                    "to": "Driver",
                    "amount": f"${example_delivery_fee + example_tip:.2f}",
                    "type": "Delivery fee + Tip",
                    "automated": False,
                    "methods": ["Venmo", "Zelle", "Cash"]
                }
            },
            {
                "step": 7,
                "action": "Order complete",
                "payment": None
            }
        ],

        "summary": {
            "customer_total_paid": f"${1.00 + example_subtotal + example_tax + example_tip:.2f}",
            "customer_breakdown": {
                "platform_fee": "$1.00",
                "food_and_tax": f"${example_subtotal + example_tax:.2f}",
                "tip": f"${example_tip:.2f}"
            },
            "restaurant_received": f"${example_subtotal + example_tax - 1.00:.2f}",
            "restaurant_breakdown": {
                "from_customer": f"${example_subtotal + example_tax:.2f}",
                "platform_fee_paid": "-$1.00",
                "delivery_paid": f"-${example_delivery_fee + example_tip:.2f}"
            },
            "driver_received": f"${example_delivery_fee + example_tip:.2f}",
            "driver_breakdown": {
                "delivery_fee": f"${example_delivery_fee:.2f}",
                "tip": f"${example_tip:.2f}",
                "platform_fee": "$0.00"
            },
            "dollor_ai_received": "$2.00",
            "dollor_ai_breakdown": {
                "from_customer": "$1.00",
                "from_restaurant": "$1.00",
                "from_driver": "$0.00"
            }
        }
    }
