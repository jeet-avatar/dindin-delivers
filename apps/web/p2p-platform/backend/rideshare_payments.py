"""
Rideshare Payment Routes - Driver Payouts via Stripe
====================================================

Handles payment processing for rideshare trips:
- Customer payment collection
- Driver payout calculation (fare - platform fee)
- Stripe Connect for driver payouts

Platform Fee Structure (from AppConfig):
- Tier 1: $1 for fares <= $35
- Tier 2: $2 for fares $35.01 - $70
- Tier 3: $3 for fares > $70

Driver keeps 96-97% of fare (vs industry 70-75%)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import stripe
import os
from dotenv import load_dotenv

from database import get_db
from models import RideRequest, RideRequestStatus, Driver, Customer

load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key_here")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_webhook_secret")

router = APIRouter(prefix="/api/payments/ride", tags=["Rideshare Payments"])


# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class CreateRidePaymentIntent(BaseModel):
    """Request to create payment intent for a completed ride"""
    ride_request_id: int
    customer_email: Optional[str] = None


class RidePaymentResponse(BaseModel):
    """Response with payment details"""
    success: bool
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None
    amount: float
    currency: str = "usd"
    platform_fee: float
    driver_payout: float
    message: Optional[str] = None


class DriverEarningsResponse(BaseModel):
    """Driver earnings summary"""
    driver_id: int
    total_rides: int
    total_earnings: float
    total_platform_fees: float
    pending_payout: float
    last_payout_date: Optional[str] = None


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def calculate_platform_fee(fare_amount: float) -> float:
    """
    Calculate tiered platform fee.

    Tier 1: $1 for fares <= $35
    Tier 2: $2 for fares $35.01 - $70
    Tier 3: $3 for fares > $70
    """
    if fare_amount <= 35.00:
        return 1.00
    elif fare_amount <= 70.00:
        return 2.00
    else:
        return 3.00


def calculate_driver_payout(fare_amount: float) -> float:
    """Calculate driver's earnings after platform fee"""
    platform_fee = calculate_platform_fee(fare_amount)
    return max(0, fare_amount - platform_fee)


# =========================================================================
# PAYMENT ENDPOINTS
# =========================================================================

@router.post("/create-intent", response_model=RidePaymentResponse)
async def create_ride_payment_intent(
    data: CreateRidePaymentIntent,
    db: Session = Depends(get_db)
):
    """
    Create Stripe Payment Intent for a completed ride.

    Called by mobile apps after ride is matched/completed.
    Returns client_secret for Stripe SDK to complete payment.
    """
    # Get ride request
    ride_request = db.query(RideRequest).filter(
        RideRequest.id == data.ride_request_id
    ).first()

    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status not in [RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED]:
        raise HTTPException(
            status_code=400,
            detail=f"Payment only available for matched/completed rides. Current status: {ride_request.status.value}"
        )

    # Calculate amounts
    fare_amount = ride_request.final_price or ride_request.suggested_price
    platform_fee = calculate_platform_fee(fare_amount)
    driver_payout = calculate_driver_payout(fare_amount)
    total_charge = fare_amount + platform_fee  # Customer pays fare + platform fee

    # Get customer email
    customer_email = data.customer_email
    if not customer_email:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        customer_email = customer.email if customer else None

    # Get driver info for metadata
    driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()

    try:
        # Create Stripe Payment Intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(total_charge * 100),  # Stripe uses cents
            currency="usd",
            receipt_email=customer_email,
            metadata={
                "ride_request_id": ride_request.id,
                "request_id": ride_request.request_id,
                "customer_id": ride_request.customer_id,
                "driver_id": ride_request.matched_driver_id,
                "driver_name": driver.first_name + " " + driver.last_name if driver else "Unknown",
                "fare_amount": str(fare_amount),
                "platform_fee": str(platform_fee),
                "driver_payout": str(driver_payout),
                "pickup": ride_request.pickup_address,
                "dropoff": ride_request.dropoff_address
            },
            description=f"Ride {ride_request.request_id}: {ride_request.pickup_place_name or ride_request.pickup_address} → {ride_request.dropoff_place_name or ride_request.dropoff_address}"
        )

        # Store payment intent ID on ride request
        ride_request.stripe_payment_intent_id = payment_intent.id
        db.commit()

        return RidePaymentResponse(
            success=True,
            payment_intent_id=payment_intent.id,
            client_secret=payment_intent.client_secret,
            amount=total_charge,
            currency="usd",
            platform_fee=platform_fee,
            driver_payout=driver_payout,
            message=f"Payment of ${total_charge:.2f} ready. Driver will receive ${driver_payout:.2f}"
        )

    except stripe.error.StripeError as e:
        import logging
        logging.error(f"Stripe error for ride {ride_request.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Payment processing failed. Please try again."
        )


@router.post("/confirm")
async def confirm_ride_payment(
    payment_intent_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm payment was successful (called after Stripe webhook or manual confirmation).

    Updates ride request with payment status.
    Triggers driver payout calculation.
    """
    # Find ride by payment intent
    ride_request = db.query(RideRequest).filter(
        RideRequest.stripe_payment_intent_id == payment_intent_id
    ).first()

    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride not found for this payment")

    try:
        # Verify payment with Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if payment_intent.status == "succeeded":
            # Update ride request
            ride_request.payment_status = "completed"
            ride_request.payment_completed_at = datetime.utcnow()

            # Calculate driver payout
            fare_amount = ride_request.final_price or ride_request.suggested_price
            platform_fee = calculate_platform_fee(fare_amount)
            driver_payout = calculate_driver_payout(fare_amount)

            ride_request.platform_fee = platform_fee
            ride_request.driver_payout = driver_payout

            db.commit()

            return {
                "success": True,
                "message": "Payment confirmed",
                "ride_request_id": ride_request.id,
                "payment_status": "completed",
                "driver_payout": driver_payout
            }
        else:
            return {
                "success": False,
                "message": f"Payment status: {payment_intent.status}",
                "payment_status": payment_intent.status
            }

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe verification failed: {str(e)}")


@router.get("/driver/{driver_id}/earnings", response_model=DriverEarningsResponse)
async def get_driver_earnings(
    driver_id: int,
    period_days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get driver's earnings summary.

    Returns:
    - Total rides completed
    - Total earnings (after platform fee)
    - Total platform fees paid
    - Pending payout amount
    """
    # Verify driver exists
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Get completed rides in period
    period_start = datetime.utcnow() - timedelta(days=period_days)

    completed_rides = db.query(RideRequest).filter(
        and_(
            RideRequest.matched_driver_id == driver_id,
            RideRequest.status == RideRequestStatus.COMPLETED,
            RideRequest.completed_at >= period_start
        )
    ).all()

    # Calculate totals
    total_rides = len(completed_rides)
    total_earnings = 0.0
    total_platform_fees = 0.0
    pending_payout = 0.0

    for ride in completed_rides:
        fare = ride.final_price or ride.suggested_price or 0
        platform_fee = ride.platform_fee if ride.platform_fee else calculate_platform_fee(fare)
        driver_payout = ride.driver_payout if ride.driver_payout else calculate_driver_payout(fare)

        total_earnings += driver_payout
        total_platform_fees += platform_fee

        # Pending if not paid out yet
        if ride.payment_status == "completed" and not ride.driver_paid_at:
            pending_payout += driver_payout

    return DriverEarningsResponse(
        driver_id=driver_id,
        total_rides=total_rides,
        total_earnings=round(total_earnings, 2),
        total_platform_fees=round(total_platform_fees, 2),
        pending_payout=round(pending_payout, 2),
        last_payout_date=None  # TODO: Track last payout
    )


@router.get("/driver/{driver_id}/rides")
async def get_driver_ride_history(
    driver_id: int,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get driver's ride history with earnings breakdown.
    """
    query = db.query(RideRequest).filter(RideRequest.matched_driver_id == driver_id)

    if status:
        try:
            status_enum = RideRequestStatus(status)
            query = query.filter(RideRequest.status == status_enum)
        except ValueError:
            pass

    rides = query.order_by(RideRequest.created_at.desc()).limit(limit).all()

    result = []
    for ride in rides:
        fare = ride.final_price or ride.suggested_price or 0
        platform_fee = ride.platform_fee if ride.platform_fee else calculate_platform_fee(fare)
        driver_payout = ride.driver_payout if ride.driver_payout else calculate_driver_payout(fare)

        result.append({
            "id": ride.id,
            "request_id": ride.request_id,
            "pickup": ride.pickup_place_name or ride.pickup_address,
            "dropoff": ride.dropoff_place_name or ride.dropoff_address,
            "distance_km": ride.estimated_distance_km,
            "fare": fare,
            "platform_fee": platform_fee,
            "your_earnings": driver_payout,
            "status": ride.status.value,
            "payment_status": ride.payment_status or "pending",
            "completed_at": ride.completed_at.isoformat() if ride.completed_at else None
        })

    return {
        "success": True,
        "driver_id": driver_id,
        "rides": result,
        "count": len(result)
    }


@router.post("/driver/{driver_id}/payout")
async def initiate_driver_payout(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Initiate payout to driver via Stripe Connect.

    Requires driver to have Stripe Connect account set up.
    """
    # Verify driver exists and has Stripe account
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if not driver.stripe_account_id:
        raise HTTPException(
            status_code=400,
            detail="Driver must set up Stripe Connect account to receive payouts"
        )

    # Get unpaid completed rides
    unpaid_rides = db.query(RideRequest).filter(
        and_(
            RideRequest.matched_driver_id == driver_id,
            RideRequest.status == RideRequestStatus.COMPLETED,
            RideRequest.payment_status == "completed",
            RideRequest.driver_paid_at == None
        )
    ).all()

    if not unpaid_rides:
        return {
            "success": True,
            "message": "No pending payouts",
            "amount": 0
        }

    # Calculate total payout
    total_payout = 0.0
    ride_ids = []

    for ride in unpaid_rides:
        payout = ride.driver_payout or calculate_driver_payout(ride.final_price or ride.suggested_price or 0)
        total_payout += payout
        ride_ids.append(ride.id)

    try:
        # Create Stripe Transfer to driver's Connect account
        transfer = stripe.Transfer.create(
            amount=int(total_payout * 100),
            currency="usd",
            destination=driver.stripe_account_id,
            metadata={
                "driver_id": driver_id,
                "ride_count": len(ride_ids),
                "ride_ids": ",".join(map(str, ride_ids))
            },
            description=f"Dollor.ai payout for {len(ride_ids)} rides"
        )

        # Mark rides as paid
        now = datetime.utcnow()
        for ride in unpaid_rides:
            ride.driver_paid_at = now
            ride.stripe_transfer_id = transfer.id

        db.commit()

        return {
            "success": True,
            "message": f"Payout of ${total_payout:.2f} initiated",
            "transfer_id": transfer.id,
            "amount": total_payout,
            "ride_count": len(ride_ids)
        }

    except stripe.error.StripeError as e:
        import logging
        logging.error(f"Stripe payout error for driver {driver_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Payout processing failed. Please try again or contact support."
        )


# =========================================================================
# PRICING INFO ENDPOINT
# =========================================================================

@router.get("/pricing-info")
async def get_pricing_info():
    """
    Get platform pricing information for customers and drivers.

    Dollor.ai uses flat fees instead of percentage-based commissions.
    """
    return {
        "success": True,
        "platform_fees": {
            "tier_1": {"max_fare": 35.00, "fee": 1.00, "driver_keeps_percent": "97%+"},
            "tier_2": {"min_fare": 35.01, "max_fare": 70.00, "fee": 2.00, "driver_keeps_percent": "97%+"},
            "tier_3": {"min_fare": 70.01, "fee": 3.00, "driver_keeps_percent": "96%+"}
        },
        "comparison": {
            "dollor_ai": {
                "model": "Flat fee ($1-3)",
                "driver_keeps": "96-97% of fare",
                "transparent": True
            },
            "uber_lyft": {
                "model": "Percentage (25-30%)",
                "driver_keeps": "70-75% of fare",
                "transparent": False
            }
        },
        "examples": [
            {"fare": 20.00, "platform_fee": 1.00, "driver_receives": 19.00, "driver_percent": "95%"},
            {"fare": 35.00, "platform_fee": 1.00, "driver_receives": 34.00, "driver_percent": "97%"},
            {"fare": 50.00, "platform_fee": 2.00, "driver_receives": 48.00, "driver_percent": "96%"},
            {"fare": 100.00, "platform_fee": 3.00, "driver_receives": 97.00, "driver_percent": "97%"}
        ],
        "messaging": {
            "customer": "Fair prices. 96%+ of your fare goes directly to your driver.",
            "driver": "Keep 96%+ of every fare. No percentage cuts. Your ride, your earnings."
        }
    }
