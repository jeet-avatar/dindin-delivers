"""
Rideshare Payment Routes
========================

Platform Fee Model:
- Customer pays: fare + $1
- Driver receives: fare - $1
- Platform earns: $2 per ride ($1 from each side)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import stripe
import os

from database import get_db
from models import RideRequest, RideRequestStatus, Driver, Customer

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

router = APIRouter(prefix="/api/payments/ride", tags=["Rideshare Payments"])

PLATFORM_FEE = 1.00  # $1 from customer, $1 from driver


class CreatePaymentIntent(BaseModel):
    ride_request_id: int


class PaymentResponse(BaseModel):
    success: bool
    fare: float
    customer_pays: float
    driver_receives: float
    platform_earns: float
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None


@router.post("/create-intent", response_model=PaymentResponse)
async def create_payment_intent(data: CreatePaymentIntent, db: Session = Depends(get_db)):
    """Create Stripe payment for completed ride."""
    ride = db.query(RideRequest).filter(RideRequest.id == data.ride_request_id).first()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.status not in [RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail=f"Invalid status: {ride.status.value}")

    fare = ride.final_price or ride.suggested_price
    customer_pays = fare + PLATFORM_FEE
    driver_receives = fare - PLATFORM_FEE
    platform_earns = PLATFORM_FEE * 2

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(customer_pays * 100),
            currency="usd",
            metadata={
                "ride_id": ride.id,
                "fare": str(fare),
                "platform_fee_customer": str(PLATFORM_FEE),
                "platform_fee_driver": str(PLATFORM_FEE),
                "driver_payout": str(driver_receives)
            }
        )

        ride.stripe_payment_intent_id = payment_intent.id
        ride.platform_fee = platform_earns
        ride.driver_payout = driver_receives
        db.commit()

        return PaymentResponse(
            success=True,
            fare=fare,
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
    """Get driver earnings summary."""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    rides = db.query(RideRequest).filter(
        and_(
            RideRequest.matched_driver_id == driver_id,
            RideRequest.status == RideRequestStatus.COMPLETED
        )
    ).all()

    total_earnings = sum((r.final_price or r.suggested_price or 0) - PLATFORM_FEE for r in rides)

    return {
        "driver_id": driver_id,
        "total_rides": len(rides),
        "total_earnings": round(total_earnings, 2),
        "platform_fee_per_ride": PLATFORM_FEE
    }


@router.get("/pricing-info")
async def get_pricing_info():
    """Platform pricing: $1 from customer + $1 from driver = $2 per ride."""
    return {
        "platform_fee_customer": PLATFORM_FEE,
        "platform_fee_driver": PLATFORM_FEE,
        "platform_total_per_ride": PLATFORM_FEE * 2,
        "example": {
            "fare": 25.00,
            "customer_pays": 26.00,
            "driver_receives": 24.00,
            "platform_earns": 2.00
        }
    }
