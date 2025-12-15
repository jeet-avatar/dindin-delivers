"""
DOLLOR.AI V5 - PAYMENT GUARANTEE SYSTEM
========================================

THE PROBLEM:
- Driver delivers food
- Customer doesn't pay (scam, forgot, disputes)
- Driver is out time + gas with nothing

SOLUTIONS (Multiple Options):
=============================

OPTION 1: PREPAID ESCROW (Recommended)
--------------------------------------
Customer pre-authorizes payment BEFORE driver accepts.
Money is held in escrow (Stripe/PayPal).
Released to driver upon delivery confirmation.

Flow:
1. Customer posts request + pre-authorizes $8
2. $8 is HELD (not charged yet) on customer's card
3. Driver sees "Payment Guaranteed ✓"
4. Driver delivers
5. Customer confirms delivery
6. $8 is captured and sent to driver instantly

If customer doesn't confirm within 30 min:
- Auto-release to driver
- Customer can dispute (but burden is on them)


OPTION 2: UPFRONT PAYMENT
-------------------------
Customer pays the $8 upfront when posting request.
Money goes to driver's connected account upon delivery.

Simpler but:
- We touch the money (more legal complexity)
- Need money transmitter license in some states


OPTION 3: CASH DEPOSIT
----------------------
For cash-preferred customers:
- Customer deposits cash with restaurant when ordering
- Restaurant holds it
- Driver picks up food + cash from restaurant
- No trust issue (driver has cash before leaving)


OPTION 4: REPUTATION + PROTECTION FUND
--------------------------------------
- Both parties have ratings
- Low-rated customers must prepay
- Platform maintains "Driver Protection Fund"
- If customer doesn't pay, fund covers driver (up to $X)
- Platform recovers from customer later


RECOMMENDED: HYBRID SYSTEM
==========================
- Default: Prepaid escrow (Option 1)
- Cash option: Through restaurant (Option 3)
- Backup: Protection fund (Option 4)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
import uuid
import stripe
import os

router = APIRouter(prefix="/api/v5/payments", tags=["V5 Payment Guarantee"])

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")


# =============================================================================
# PAYMENT STATUS
# =============================================================================

class PaymentStatus(str, Enum):
    PENDING = "pending"              # Request posted, no payment yet
    AUTHORIZED = "authorized"        # Payment pre-authorized (held)
    CAPTURED = "captured"            # Payment captured (driver paid)
    RELEASED = "released"            # Released to driver
    REFUNDED = "refunded"            # Refunded to customer
    DISPUTED = "disputed"            # Under dispute


class PaymentMethod(str, Enum):
    CARD_ESCROW = "card_escrow"      # Card with escrow hold
    VENMO_PREPAID = "venmo_prepaid"  # Venmo prepaid
    CASH_VIA_RESTAURANT = "cash_via_restaurant"
    TRUST_BASED = "trust_based"      # For high-rated customers


# =============================================================================
# MODELS
# =============================================================================

class CreatePaymentHold(BaseModel):
    """Customer creates payment hold when posting delivery request"""
    customer_id: str
    amount: float
    payment_method_id: str  # Stripe payment method
    delivery_request_id: str


class PaymentHoldResponse(BaseModel):
    hold_id: str
    status: PaymentStatus
    amount: float
    expires_at: str
    driver_guarantee: str


# =============================================================================
# ESCROW STORAGE (Use database in production)
# =============================================================================

escrow_holds: Dict[str, Dict] = {}
driver_protection_fund = 10000.00  # Platform protection fund


# =============================================================================
# OPTION 1: PREPAID ESCROW SYSTEM (RECOMMENDED)
# =============================================================================

@router.post("/escrow/create-hold")
async def create_payment_hold(request: CreatePaymentHold) -> PaymentHoldResponse:
    """
    STEP 1: Customer creates payment hold when posting delivery request.

    This GUARANTEES driver will be paid.

    How it works:
    1. We create a Stripe PaymentIntent with capture_method='manual'
    2. This AUTHORIZES (holds) the amount on customer's card
    3. Card is NOT charged yet - just held
    4. Driver sees "Payment Guaranteed ✓"
    5. Upon delivery, we CAPTURE the held amount
    6. Money goes to driver
    """
    hold_id = f"HOLD-{uuid.uuid4().hex[:8].upper()}"

    try:
        # Create Stripe PaymentIntent with manual capture
        # This holds the money without charging
        if stripe.api_key != "sk_test_placeholder":
            payment_intent = stripe.PaymentIntent.create(
                amount=int(request.amount * 100),  # Cents
                currency="usd",
                payment_method=request.payment_method_id,
                capture_method="manual",  # KEY: Don't capture yet, just hold
                confirm=True,  # Confirm the hold immediately
                metadata={
                    "hold_id": hold_id,
                    "delivery_request_id": request.delivery_request_id,
                    "customer_id": request.customer_id,
                    "type": "delivery_payment_hold"
                },
                description="Dollor.ai Delivery Payment Hold"
            )
            stripe_payment_intent_id = payment_intent.id
        else:
            stripe_payment_intent_id = f"pi_test_{hold_id}"

        # Store hold info
        expires_at = datetime.utcnow() + timedelta(hours=2)  # Hold expires in 2 hours

        escrow_holds[hold_id] = {
            "hold_id": hold_id,
            "stripe_payment_intent_id": stripe_payment_intent_id,
            "customer_id": request.customer_id,
            "delivery_request_id": request.delivery_request_id,
            "amount": request.amount,
            "status": PaymentStatus.AUTHORIZED,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "captured_at": None,
            "driver_id": None,
        }

        return PaymentHoldResponse(
            hold_id=hold_id,
            status=PaymentStatus.AUTHORIZED,
            amount=request.amount,
            expires_at=expires_at.isoformat(),
            driver_guarantee="Payment is guaranteed. Funds are held on customer's card."
        )

    except stripe.error.CardError as e:
        raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/{hold_id}/assign-driver")
async def assign_driver_to_hold(hold_id: str, driver_id: str):
    """
    STEP 2: When driver accepts, link them to the payment hold.
    """
    if hold_id not in escrow_holds:
        raise HTTPException(status_code=404, detail="Hold not found")

    hold = escrow_holds[hold_id]

    if hold["status"] != PaymentStatus.AUTHORIZED:
        raise HTTPException(status_code=400, detail="Hold is not in authorized state")

    hold["driver_id"] = driver_id
    hold["driver_assigned_at"] = datetime.utcnow().isoformat()

    return {
        "hold_id": hold_id,
        "driver_id": driver_id,
        "amount": hold["amount"],
        "status": "Driver assigned - payment guaranteed upon delivery",
        "message": f"${hold['amount']:.2f} is held and will be released to you upon delivery confirmation"
    }


@router.post("/escrow/{hold_id}/release-to-driver")
async def release_payment_to_driver(
    hold_id: str,
    driver_id: str,
    confirmation_method: str = "customer_confirmed"  # or "auto_release" or "photo_proof"
):
    """
    STEP 3: Release payment to driver upon delivery.

    Triggers:
    1. Customer confirms delivery in app
    2. Auto-release after 30 minutes (if customer doesn't respond)
    3. Driver uploads photo proof + GPS confirmation
    """
    if hold_id not in escrow_holds:
        raise HTTPException(status_code=404, detail="Hold not found")

    hold = escrow_holds[hold_id]

    if hold["driver_id"] != driver_id:
        raise HTTPException(status_code=403, detail="Not your delivery")

    if hold["status"] != PaymentStatus.AUTHORIZED:
        raise HTTPException(status_code=400, detail="Payment already processed")

    try:
        # Capture the held payment
        if stripe.api_key != "sk_test_placeholder":
            stripe.PaymentIntent.capture(hold["stripe_payment_intent_id"])

        hold["status"] = PaymentStatus.CAPTURED
        hold["captured_at"] = datetime.utcnow().isoformat()
        hold["confirmation_method"] = confirmation_method

        # In production: Transfer to driver's connected account or
        # send via Venmo/Zelle API

        return {
            "hold_id": hold_id,
            "status": "Payment released to driver",
            "amount": hold["amount"],
            "driver_id": driver_id,
            "confirmation_method": confirmation_method,
            "message": f"${hold['amount']:.2f} has been sent to your payment method",
            "next_step": "Check your Venmo/bank for the transfer"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/escrow/{hold_id}/auto-release")
async def auto_release_payment(hold_id: str, background_tasks: BackgroundTasks):
    """
    AUTO-RELEASE: If customer doesn't confirm within 30 minutes,
    automatically release payment to driver.

    This protects drivers from customers who:
    - Forget to confirm
    - Try to get free delivery by not confirming
    - Are unresponsive
    """
    if hold_id not in escrow_holds:
        return {"status": "Hold not found"}

    hold = escrow_holds[hold_id]

    # Check if 30 minutes have passed since delivery
    if hold.get("delivery_completed_at"):
        delivery_time = datetime.fromisoformat(hold["delivery_completed_at"])
        time_since_delivery = datetime.utcnow() - delivery_time

        if time_since_delivery >= timedelta(minutes=30):
            if hold["status"] == PaymentStatus.AUTHORIZED:
                # Auto-release to driver
                await release_payment_to_driver(
                    hold_id=hold_id,
                    driver_id=hold["driver_id"],
                    confirmation_method="auto_release_30min"
                )
                return {"status": "Auto-released to driver after 30 min timeout"}

    return {"status": "Not yet eligible for auto-release"}


# =============================================================================
# OPTION 3: CASH VIA RESTAURANT
# =============================================================================

@router.post("/cash/deposit-with-restaurant")
async def deposit_cash_with_restaurant(
    customer_id: str,
    restaurant_id: str,
    order_id: str,
    delivery_amount: float
):
    """
    CASH OPTION: Customer deposits delivery payment with restaurant.

    Flow:
    1. Customer orders food at restaurant (in person or phone)
    2. Customer says "I'm using Dollor for delivery, here's $8 for the driver"
    3. Restaurant holds the $8 in an envelope with the order
    4. Driver picks up food + cash envelope
    5. Driver has payment BEFORE leaving restaurant

    Zero trust issues - driver has cash in hand.
    """
    deposit_id = f"CASH-{uuid.uuid4().hex[:8].upper()}"

    return {
        "deposit_id": deposit_id,
        "status": "Cash deposit registered",
        "amount": delivery_amount,
        "instructions_for_customer": [
            f"Tell restaurant: 'I'm using Dollor delivery, here's ${delivery_amount:.2f} for the driver'",
            "Restaurant will hold cash with your order",
            "Driver will pick up food + cash together"
        ],
        "instructions_for_restaurant": [
            f"Hold ${delivery_amount:.2f} cash with order #{order_id}",
            "Give to delivery person when they pick up",
            "This is the driver's payment, not food payment"
        ],
        "driver_sees": f"Cash payment ${delivery_amount:.2f} - pickup from restaurant",
        "trust_level": "Highest - driver has cash before leaving"
    }


# =============================================================================
# OPTION 4: DRIVER PROTECTION FUND
# =============================================================================

@router.get("/protection-fund/status")
async def get_protection_fund_status():
    """
    Driver Protection Fund - backup for unpaid deliveries.
    """
    return {
        "fund_balance": driver_protection_fund,
        "coverage_per_incident": 25.00,  # Max claim per delivery
        "how_it_works": {
            "step_1": "Driver completes delivery",
            "step_2": "Customer doesn't pay (card fails, dispute, etc.)",
            "step_3": "Driver files claim with delivery proof",
            "step_4": "Fund pays driver within 24 hours",
            "step_5": "Platform pursues customer for repayment",
        },
        "eligibility": {
            "min_deliveries": 5,  # Must have 5+ completed deliveries
            "min_rating": 4.0,    # Must have 4.0+ rating
            "claim_limit": "3 per month",
        },
        "funded_by": "Platform revenue (not driver fees)",
    }


@router.post("/protection-fund/claim")
async def file_protection_claim(
    driver_id: str,
    delivery_request_id: str,
    amount: float,
    reason: str,
    proof_photo_url: Optional[str] = None,
    gps_confirmation: Optional[Dict] = None
):
    """
    Driver files claim when customer doesn't pay.
    """
    global driver_protection_fund

    claim_id = f"CLAIM-{uuid.uuid4().hex[:8].upper()}"

    # Verify driver eligibility (would check database)
    # Verify delivery was completed
    # Verify amount is reasonable

    max_coverage = 25.00
    payout = min(amount, max_coverage)

    if driver_protection_fund >= payout:
        driver_protection_fund -= payout

        return {
            "claim_id": claim_id,
            "status": "approved",
            "payout_amount": payout,
            "original_amount": amount,
            "message": f"${payout:.2f} will be sent to your payment method within 24 hours",
            "fund_remaining": driver_protection_fund,
            "customer_action": "Customer will be charged and/or banned from platform"
        }
    else:
        return {
            "claim_id": claim_id,
            "status": "pending_review",
            "message": "Claim submitted for manual review",
        }


# =============================================================================
# TRUST SCORES & PAYMENT REQUIREMENTS
# =============================================================================

@router.get("/customer/{customer_id}/trust-score")
async def get_customer_trust_score(customer_id: str):
    """
    Determine payment requirements based on customer trust score.

    High trust = More payment options
    Low trust = Must prepay
    """
    # Would calculate from database
    # Mock data:
    completed_deliveries = 23
    payment_success_rate = 1.0  # 100%
    rating = 4.8
    account_age_days = 180

    # Calculate trust score
    trust_score = min(100, (
        (completed_deliveries * 2) +
        (payment_success_rate * 30) +
        (rating * 5) +
        (min(account_age_days, 365) / 10)
    ))

    # Determine payment options
    if trust_score >= 80:
        payment_options = ["card_escrow", "venmo_prepaid", "cash_via_restaurant", "trust_based"]
        prepay_required = False
    elif trust_score >= 50:
        payment_options = ["card_escrow", "venmo_prepaid", "cash_via_restaurant"]
        prepay_required = False
    else:
        payment_options = ["card_escrow", "cash_via_restaurant"]
        prepay_required = True

    return {
        "customer_id": customer_id,
        "trust_score": round(trust_score),
        "trust_level": "High" if trust_score >= 80 else "Medium" if trust_score >= 50 else "New/Low",
        "completed_deliveries": completed_deliveries,
        "payment_success_rate": f"{payment_success_rate * 100:.0f}%",
        "rating": rating,
        "payment_options": payment_options,
        "prepay_required": prepay_required,
        "driver_sees": {
            "badge": "Trusted Customer ✓" if trust_score >= 80 else "Verified" if trust_score >= 50 else "New Customer",
            "payment_status": "Payment Guaranteed" if not prepay_required else "Prepaid ✓"
        }
    }


# =============================================================================
# COMPLETE DELIVERY REQUEST WITH GUARANTEED PAYMENT
# =============================================================================

@router.post("/delivery-request/create-with-guarantee")
async def create_delivery_request_with_payment(
    customer_id: str,
    customer_name: str,
    restaurant_name: str,
    restaurant_address: str,
    delivery_address: str,
    delivery_amount: float,
    payment_method_id: str,  # Stripe payment method
    payment_type: PaymentMethod = PaymentMethod.CARD_ESCROW
):
    """
    CREATE DELIVERY REQUEST WITH GUARANTEED PAYMENT

    This is the main endpoint customers use.
    It creates both the delivery request AND the payment guarantee.
    """
    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"

    # Step 1: Create payment hold
    hold_response = await create_payment_hold(CreatePaymentHold(
        customer_id=customer_id,
        amount=delivery_amount,
        payment_method_id=payment_method_id,
        delivery_request_id=request_id
    ))

    return {
        "request_id": request_id,
        "status": "Posted with payment guarantee",

        "delivery_details": {
            "pickup": restaurant_name,
            "pickup_address": restaurant_address,
            "delivery_address": delivery_address,
        },

        "payment_guarantee": {
            "hold_id": hold_response.hold_id,
            "amount": delivery_amount,
            "status": "HELD on your card (not charged yet)",
            "charged_when": "Only when delivery is confirmed",
            "expires": hold_response.expires_at,
        },

        "what_drivers_see": {
            "amount": delivery_amount,
            "payment_status": "✓ GUARANTEED",
            "badge": "Payment Secured",
            "note": "Funds are held - you WILL be paid upon delivery"
        },

        "flow": [
            "1. Your card has been pre-authorized (not charged)",
            "2. Drivers see 'Payment Guaranteed' badge",
            "3. Driver delivers your food",
            "4. You confirm delivery (or auto-confirms in 30 min)",
            "5. Payment is released to driver",
        ]
    }


# =============================================================================
# WHAT DRIVER SEES
# =============================================================================

@router.get("/driver/{driver_id}/available-guaranteed")
async def get_guaranteed_deliveries(driver_id: str):
    """
    Show driver ONLY deliveries with guaranteed payment.

    Driver confidence is key to the platform working.
    """
    # Mock data - would query real deliveries
    deliveries = [
        {
            "request_id": "REQ-ABC123",
            "payment": {
                "amount": 8.50,
                "status": "GUARANTEED ✓",
                "hold_id": "HOLD-XYZ789",
                "method": "Card (pre-authorized)",
                "you_keep": 8.50,
                "platform_fee": 0.00,
            },
            "guarantee_details": {
                "funds_status": "Held on customer's card",
                "release_trigger": "Upon delivery confirmation",
                "auto_release": "30 minutes after delivery if customer doesn't respond",
                "protection": "Driver Protection Fund backup if any issues",
            },
            "customer": {
                "name": "John S.",
                "trust_score": 85,
                "badge": "Trusted Customer ✓",
                "completed_deliveries": 23,
                "payment_success_rate": "100%",
            },
            "pickup": {
                "restaurant": "Tony's Pizza",
                "address": "123 Main St",
            },
            "delivery": {
                "area": "Downtown",
                "distance": 2.3,
            }
        },
        {
            "request_id": "REQ-DEF456",
            "payment": {
                "amount": 12.00,
                "status": "CASH AT PICKUP ✓",
                "method": "Cash via restaurant",
                "you_keep": 12.00,
                "platform_fee": 0.00,
            },
            "guarantee_details": {
                "funds_status": "Cash waiting at restaurant",
                "pickup_note": "Collect cash envelope with food",
                "zero_risk": "You have cash before leaving restaurant",
            },
            "customer": {
                "name": "Sarah M.",
                "trust_score": 72,
                "badge": "Verified",
            },
            "pickup": {
                "restaurant": "Sushi Palace",
                "address": "456 Oak Ave",
                "cash_note": "$12 cash envelope with order",
            },
            "delivery": {
                "area": "Westside",
                "distance": 4.1,
            }
        }
    ]

    return {
        "available_count": len(deliveries),
        "all_payments_guaranteed": True,
        "deliveries": deliveries,
        "driver_assurance": {
            "promise": "Every delivery shown has guaranteed payment",
            "methods": [
                "Card pre-authorization (funds held)",
                "Cash at restaurant (you get cash first)",
                "Protection fund backup (if anything goes wrong)"
            ],
            "you_will_be_paid": "100% of the time, guaranteed"
        }
    }
