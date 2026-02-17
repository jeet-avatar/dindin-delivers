"""
Rideshare Payment Routes - Tiered Platform Fee
===============================================

Tiered Fee Model (based on fare):
- Tier 1 (fare <= $35):  $1 from customer + $1 from driver = $2 platform
- Tier 2 ($35 < fare <= $70): $2 from customer + $2 from driver = $4 platform
- Tier 3 (fare > $70): $3 from customer + $3 from driver = $6 platform
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import Optional
import stripe
import os
import logging

from database import get_db
from models import RideRequest, RideRequestStatus, Driver, Customer

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")  # SECURITY: No hardcoded fallback
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments/ride", tags=["Rideshare Payments"])

# Demo account emails for App Store review
DEMO_CUSTOMER_EMAILS = [
    "demo.customer@dollor.ai",
    "demo.driver@dollor.ai",
    "demo.restaurant@dollor.ai"
]


def get_tier_fee(fare: float) -> float:
    """Get platform fee based on fare tier."""
    if fare <= 35.00:
        return 1.00
    elif fare <= 70.00:
        return 2.00
    else:
        return 3.00


class CreatePaymentIntent(BaseModel):
    ride_request_id: int


class PaymentResponse(BaseModel):
    success: bool
    fare: float
    tier_fee: float
    customer_pays: float
    driver_receives: float
    platform_earns: float
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None


@router.post("/create-intent", response_model=PaymentResponse)
async def create_payment_intent(data: CreatePaymentIntent, db: Session = Depends(get_db)):
    """Create Stripe payment for completed ride with tiered pricing.

    For demo accounts (App Store review), returns a demo payment response
    that bypasses actual Stripe processing.
    """
    ride = db.query(RideRequest).filter(RideRequest.id == data.ride_request_id).first()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.status not in [RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail=f"Invalid status: {ride.status.value}")

    # Idempotency: if payment already exists, return existing data
    if ride.stripe_payment_intent_id and ride.stripe_payment_intent_id != "demo_pi_appstore_review":
        fare = ride.final_price or ride.suggested_price
        tier_fee = get_tier_fee(fare)
        return PaymentResponse(
            success=True,
            fare=fare,
            tier_fee=tier_fee,
            customer_pays=fare + tier_fee,
            driver_receives=fare - tier_fee,
            platform_earns=tier_fee * 2,
            payment_intent_id=ride.stripe_payment_intent_id,
            client_secret=None  # Cannot retrieve secret after creation
        )

    fare = ride.final_price or ride.suggested_price
    tier_fee = get_tier_fee(fare)
    customer_pays = fare + tier_fee
    driver_receives = fare - tier_fee
    platform_earns = tier_fee * 2

    # Check for demo account - bypass Stripe for App Store review
    if ride.customer_id:
        customer = db.query(Customer).filter(Customer.id == ride.customer_id).first()
        if customer and customer.email and customer.email.lower() in [e.lower() for e in DEMO_CUSTOMER_EMAILS]:
            logger.info(f"Demo account detected for ride {ride.id}: {customer.email} - bypassing Stripe payment")
            # Mark ride as demo paid
            ride.stripe_payment_intent_id = "demo_pi_appstore_review"
            ride.platform_fee = platform_earns
            ride.driver_payout = driver_receives
            db.commit()

            return PaymentResponse(
                success=True,
                fare=fare,
                tier_fee=tier_fee,
                customer_pays=customer_pays,
                driver_receives=driver_receives,
                platform_earns=platform_earns,
                payment_intent_id="demo_pi_appstore_review",
                client_secret="demo_pi_appstore_review_secret"
            )

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(customer_pays * 100),
            currency="usd",
            metadata={
                "ride_id": ride.id,
                "fare": str(fare),
                "tier_fee": str(tier_fee),
                "customer_pays": str(customer_pays),
                "driver_payout": str(driver_receives),
                "platform_earns": str(platform_earns)
            }
        )

        ride.stripe_payment_intent_id = payment_intent.id
        ride.platform_fee = platform_earns
        ride.driver_payout = driver_receives
        db.commit()

        return PaymentResponse(
            success=True,
            fare=fare,
            tier_fee=tier_fee,
            customer_pays=customer_pays,
            driver_receives=driver_receives,
            platform_earns=platform_earns,
            payment_intent_id=payment_intent.id,
            client_secret=payment_intent.client_secret
        )
    except stripe.error.StripeError:
        raise HTTPException(status_code=500, detail="Payment failed")


@router.get("/driver/{driver_id}/earnings")
async def get_driver_earnings(driver_id: int, db: Session = Depends(get_db)):
    """Get driver earnings summary with tiered fees."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    rides = db.query(RideRequest).filter(
        and_(
            RideRequest.matched_driver_id == driver_id,
            RideRequest.status == RideRequestStatus.COMPLETED
        )
    ).all()

    total_earnings = 0.0
    for r in rides:
        fare = r.final_price or r.suggested_price or 0
        tier_fee = get_tier_fee(fare)
        total_earnings += fare - tier_fee

    return {
        "driver_id": driver_id,
        "total_rides": len(rides),
        "total_earnings": round(total_earnings, 2)
    }


@router.get("/pricing-info")
async def get_pricing_info():
    """Platform tiered pricing info."""
    return {
        "tiers": [
            {"max_fare": 35.00, "fee": 1.00, "platform_total": 2.00},
            {"min_fare": 35.01, "max_fare": 70.00, "fee": 2.00, "platform_total": 4.00},
            {"min_fare": 70.01, "fee": 3.00, "platform_total": 6.00}
        ],
        "examples": [
            {"fare": 25.00, "tier_fee": 1.00, "customer_pays": 26.00, "driver_receives": 24.00, "platform_earns": 2.00},
            {"fare": 50.00, "tier_fee": 2.00, "customer_pays": 52.00, "driver_receives": 48.00, "platform_earns": 4.00},
            {"fare": 100.00, "tier_fee": 3.00, "customer_pays": 103.00, "driver_receives": 97.00, "platform_earns": 6.00}
        ]
    }
