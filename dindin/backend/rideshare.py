"""
RIDESHARE MODULE - ENTERPRISE-LEVEL UBER-STYLE RIDE SHARING
============================================================
$1 Platform Fee Model - 90%+ goes to drivers!

Pricing Structure (must match iOS RideRequestViewModel.swift):
- Platform Fee: $1.00 flat (only fee to platform)
- Base Fare: $2.00 (goes to driver)
- Per Mile: $1.00 (goes to driver)
- Per Minute: $0.15 (goes to driver)
- Minimum Fare: $5.00 total
- Cancellation Fee: $5.00 (after driver assigned)

All calculations use Haversine formula for distance.
All prices include state-based tax calculations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import math
import secrets

from database import get_db
from pricing_config import (
    RIDESHARE_PRICING_CONFIG,
    STATE_TAX_RATES,
    DEFAULT_TAX_RATE,
    PAYMENT_PROCESSING_CONFIG,
    calculate_distance
)

router = APIRouter(prefix="/api/erp/rides", tags=["rideshare"])


# =============================================================================
# PYDANTIC MODELS - Match iOS Exactly
# =============================================================================

class RideAddressInput(BaseModel):
    """Address input for pickup/dropoff - matches iOS RideAddressInput"""
    street: str
    city: str
    state: str
    zip: str
    lat: float
    lng: float


class RideRequestInput(BaseModel):
    """Request body for ride request - matches iOS requestRide()"""
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_address: RideAddressInput
    dropoff_address: RideAddressInput
    notes: Optional[str] = None
    tip: float = 0.0


class RideRequestResponse(BaseModel):
    """Response for ride request - MUST match iOS RideRequestResponse"""
    success: bool
    ride_id: int
    ride_number: str
    pickup: Optional[Dict[str, Any]] = None
    dropoff: Optional[Dict[str, Any]] = None
    total_fare: float
    driver_earnings: float
    platform_fee: float
    base_fare: float
    distance_fee: float
    time_fee: float
    surge_multiplier: float
    tax_amount: float
    tax_rate: str
    tip: float
    status: str
    processed_by: Optional[str] = None


class RideTrackingResponse(BaseModel):
    """Tracking response - matches iOS RideTrackingInfo"""
    success: bool
    order_id: int
    order_number: str
    status: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_latitude: Optional[float] = None
    driver_longitude: Optional[float] = None
    estimated_arrival: Optional[str] = None


class RideCancelResponse(BaseModel):
    """Cancel response - matches iOS expectations"""
    success: bool
    message: str
    cancellation_fee: float
    refund_amount: float


class FareNegotiationResponse(BaseModel):
    """Fare negotiation response - matches iOS"""
    success: bool
    status: str
    message: Optional[str] = None
    driver_offer: Optional[float] = None
    customer_offer: Optional[float] = None


class PaymentIntentResponse(BaseModel):
    """Stripe payment intent response"""
    success: bool
    client_secret: str
    payment_intent_id: str
    amount: float


class PaymentConfirmationResponse(BaseModel):
    """Payment confirmation response"""
    success: bool
    message: str
    ride_id: int
    paid_amount: float


# =============================================================================
# STATE TAX RATES - US (uses centralized config from pricing_config.py)
# =============================================================================
# NOTE: Using STATE_TAX_RATES imported from pricing_config.py
# This ensures consistency across all platform services (food delivery, rideshare)

# State name to code mapping
STATE_NAME_TO_CODE = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
    "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC"
}


# =============================================================================
# PRICING CONSTANTS - from centralized RIDESHARE_PRICING_CONFIG
# =============================================================================
# NOTE: All pricing now uses RIDESHARE_PRICING_CONFIG imported from pricing_config.py
# This ensures consistency across all platform services and matches iOS RideRequestViewModel
#
# Access values as:
#   RIDESHARE_PRICING_CONFIG.platform_fee   # $1.00 platform fee
#   RIDESHARE_PRICING_CONFIG.base_fare      # $2.00 base fare
#   RIDESHARE_PRICING_CONFIG.per_mile_rate  # $1.00 per mile
#   RIDESHARE_PRICING_CONFIG.per_minute_rate # $0.15 per minute
#   RIDESHARE_PRICING_CONFIG.min_fare       # $5.00 minimum fare
#   RIDESHARE_PRICING_CONFIG.cancellation_fee # $5.00 cancellation fee


# =============================================================================
# IN-MEMORY RIDE STORAGE (Replace with database in production)
# =============================================================================

# In production, use SQLAlchemy models
rides_db: Dict[int, Dict[str, Any]] = {}
ride_counter = 1000  # Starting ride ID


def get_next_ride_id() -> int:
    """Get next ride ID (thread-safe in production)"""
    global ride_counter
    ride_counter += 1
    return ride_counter


def generate_ride_number() -> str:
    """Generate unique ride number like RIDE-XXXXX"""
    return f"RIDE-{secrets.token_hex(3).upper()}"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_state_code(state: str) -> str:
    """Convert state name to 2-letter code"""
    if len(state) == 2:
        return state.upper()
    return STATE_NAME_TO_CODE.get(state.upper(), state.upper()[:2])


def get_tax_rate(state: str) -> float:
    """Get tax rate for state - uses centralized STATE_TAX_RATES from pricing_config.py"""
    state_code = get_state_code(state)
    return STATE_TAX_RATES.get(state_code, DEFAULT_TAX_RATE)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in miles. Matches iOS implementation exactly.
    """
    R = 3959.0  # Earth's radius in miles

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon/2) * math.sin(d_lon/2))

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c


def estimate_duration(distance_miles: float) -> float:
    """
    Estimate ride duration in minutes.
    Uses 25 mph average urban speed + 20% buffer (matches iOS).
    """
    return (distance_miles / 25.0) * 60 * 1.2


def calculate_fare(
    distance_miles: float,
    duration_minutes: float,
    state: str,
    tip: float = 0.0,
    surge_multiplier: float = 1.0
) -> Dict[str, Any]:
    """
    Calculate ride fare breakdown - MUST MATCH iOS RideRequestViewModel.

    Formula:
    - Driver earnings = (base + distance + time) × surge + tip
    - Total fare = driver earnings + platform fee + tax
    - Platform gets: $1 flat fee only

    Returns breakdown matching iOS RideRequestResponse fields.
    """
    # Distance and time charges (go to driver) - using centralized config
    distance_fee = round(distance_miles * RIDESHARE_PRICING_CONFIG.per_mile_rate, 2)
    time_fee = round(duration_minutes * RIDESHARE_PRICING_CONFIG.per_minute_rate, 2)

    # Driver earnings before surge (matches iOS driverEarnings calculation)
    driver_base = RIDESHARE_PRICING_CONFIG.base_fare + distance_fee + time_fee

    # Apply surge to driver portion only
    driver_earnings_before_tip = driver_base * surge_multiplier

    # Fare before tax = driver earnings + platform fee
    fare_before_tax = driver_earnings_before_tip + RIDESHARE_PRICING_CONFIG.platform_fee

    # Apply minimum fare
    if fare_before_tax < RIDESHARE_PRICING_CONFIG.min_fare:
        # Adjust driver earnings to meet minimum
        driver_earnings_before_tip = RIDESHARE_PRICING_CONFIG.min_fare - RIDESHARE_PRICING_CONFIG.platform_fee
        fare_before_tax = RIDESHARE_PRICING_CONFIG.min_fare

    # Calculate tax based on pickup state
    tax_rate = get_tax_rate(state)
    tax_amount = round(fare_before_tax * tax_rate, 2)

    # Total fare (subtotal + tax + tip)
    subtotal = round(fare_before_tax + tax_amount, 2)
    total_fare = round(subtotal + tip, 2)

    # Final driver earnings (includes tip)
    driver_earnings = round(driver_earnings_before_tip + tip, 2)

    return {
        "base_fare": round(RIDESHARE_PRICING_CONFIG.base_fare, 2),
        "distance_fee": distance_fee,
        "time_fee": time_fee,
        "surge_multiplier": round(surge_multiplier, 2),
        "driver_earnings": driver_earnings,
        "platform_fee": RIDESHARE_PRICING_CONFIG.platform_fee,
        "tax_rate": f"{tax_rate * 100:.2f}%",
        "tax_rate_decimal": tax_rate,
        "tax_amount": tax_amount,
        "subtotal": subtotal,
        "tip": round(tip, 2),
        "total_fare": total_fare,
        "distance_miles": round(distance_miles, 2),
        "duration_minutes": round(duration_minutes, 0)
    }


def calculate_cancellation_fee(ride: Dict[str, Any]) -> float:
    """
    Calculate cancellation fee based on ride status.

    - Free: Within 2 minutes or no driver assigned
    - $5: Driver assigned but not picked up
    - $10: Driver en route or ride in progress
    """
    status = ride.get("status", "").lower()
    created_at = ride.get("created_at", datetime.now())

    # Check if within 2 minute grace period
    time_since_request = (datetime.now() - created_at).total_seconds()
    if time_since_request < 120:  # 2 minutes
        return 0.0

    # No driver assigned - free cancellation
    if not ride.get("driver_id"):
        return 0.0

    # Status-based fee
    if status in ["waiting_for_driver", "preparing"]:
        return 0.0
    elif status in ["driver_assigned", "driver_accepted"]:
        return 5.0
    elif status in ["driver_en_route", "out_for_delivery"]:
        return 7.50
    elif status in ["picked_up", "in_progress"]:
        return 10.0

    return 0.0


# =============================================================================
# JOURNAL ENTRY / ACCOUNTING FUNCTIONS
# =============================================================================

def create_rideshare_journal_entry(ride: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """
    Create double-entry accounting journal entries for a rideshare transaction.

    Journal entries for a $15 ride with $2 tip:

    DR  Cash/Receivable                $17.00  (total collected)
        CR  Driver Payable                     $12.00  (driver earnings)
        CR  Platform Revenue                   $1.00   (platform fee)
        CR  Sales Tax Payable                  $1.20   (tax liability)
        CR  Customer Tip Clearing              $2.00   (tip pass-through)

    When driver is paid:
    DR  Driver Payable                 $14.00  (earnings + tip)
        CR  Cash/Bank                          $14.00
    """
    fare = ride.get("fare_breakdown", {})

    entries = []
    ride_number = ride.get("ride_number", "UNKNOWN")
    timestamp = datetime.now().isoformat()

    # Entry 1: Collect payment from customer
    entries.append({
        "entry_id": f"JE-{ride_number}-001",
        "date": timestamp,
        "description": f"Rideshare payment collected - {ride_number}",
        "debit_account": "1100 - Cash/Stripe Receivable",
        "debit_amount": fare.get("total_fare", 0),
        "credit_account": None,
        "credit_amount": 0,
        "reference": ride_number
    })

    # Entry 2: Record driver payable (earnings before tip)
    driver_earnings_before_tip = fare.get("driver_earnings", 0) - fare.get("tip", 0)
    entries.append({
        "entry_id": f"JE-{ride_number}-002",
        "date": timestamp,
        "description": f"Driver earnings payable - {ride_number}",
        "debit_account": None,
        "debit_amount": 0,
        "credit_account": "2100 - Driver Payable",
        "credit_amount": driver_earnings_before_tip,
        "reference": ride_number
    })

    # Entry 3: Record platform revenue ($1 flat fee)
    entries.append({
        "entry_id": f"JE-{ride_number}-003",
        "date": timestamp,
        "description": f"Platform fee revenue - {ride_number}",
        "debit_account": None,
        "debit_amount": 0,
        "credit_account": "4100 - Rideshare Platform Revenue",
        "credit_amount": fare.get("platform_fee", RIDESHARE_PRICING_CONFIG.platform_fee),
        "reference": ride_number
    })

    # Entry 4: Record sales tax liability
    if fare.get("tax_amount", 0) > 0:
        entries.append({
            "entry_id": f"JE-{ride_number}-004",
            "date": timestamp,
            "description": f"Sales tax payable - {ride_number}",
            "debit_account": None,
            "debit_amount": 0,
            "credit_account": "2200 - Sales Tax Payable",
            "credit_amount": fare.get("tax_amount", 0),
            "reference": ride_number
        })

    # Entry 5: Record tip pass-through
    if fare.get("tip", 0) > 0:
        entries.append({
            "entry_id": f"JE-{ride_number}-005",
            "date": timestamp,
            "description": f"Customer tip for driver - {ride_number}",
            "debit_account": None,
            "debit_amount": 0,
            "credit_account": "2150 - Tips Payable to Driver",
            "credit_amount": fare.get("tip", 0),
            "reference": ride_number
        })

    # Entry 6: Record Stripe processing fee (platform absorbs)
    total = fare.get("total_fare", 0)
    stripe_fee = round(total * 0.029 + 0.30, 2)  # 2.9% + $0.30
    entries.append({
        "entry_id": f"JE-{ride_number}-006",
        "date": timestamp,
        "description": f"Stripe processing fee - {ride_number}",
        "debit_account": "6100 - Payment Processing Expense",
        "debit_amount": stripe_fee,
        "credit_account": "1100 - Cash/Stripe Receivable",
        "credit_amount": stripe_fee,
        "reference": ride_number
    })

    # Calculate net platform profit
    net_profit = RIDESHARE_PRICING_CONFIG.platform_fee - stripe_fee

    return {
        "ride_number": ride_number,
        "total_collected": fare.get("total_fare", 0),
        "driver_payout": fare.get("driver_earnings", 0),
        "platform_fee": RIDESHARE_PRICING_CONFIG.platform_fee,
        "tax_collected": fare.get("tax_amount", 0),
        "stripe_fee": stripe_fee,
        "net_platform_profit": round(net_profit, 2),
        "journal_entries": entries,
        "created_at": timestamp
    }


def create_cancellation_journal_entry(
    ride: Dict[str, Any],
    cancellation_fee: float,
    refund_amount: float
) -> Dict[str, Any]:
    """
    Create journal entries for ride cancellation.

    If cancellation fee applies:
    DR  Cash/Receivable          $5.00  (cancellation fee collected)
        CR  Cancellation Fee Revenue     $5.00

    If refund:
    DR  Refund Expense           $X.XX
        CR  Cash/Receivable              $X.XX
    """
    entries = []
    ride_number = ride.get("ride_number", "UNKNOWN")
    timestamp = datetime.now().isoformat()

    if cancellation_fee > 0:
        entries.append({
            "entry_id": f"JE-{ride_number}-CANCEL-001",
            "date": timestamp,
            "description": f"Cancellation fee - {ride_number}",
            "debit_account": "1100 - Cash/Stripe Receivable",
            "debit_amount": cancellation_fee,
            "credit_account": "4200 - Cancellation Fee Revenue",
            "credit_amount": cancellation_fee,
            "reference": ride_number
        })

    if refund_amount > 0:
        entries.append({
            "entry_id": f"JE-{ride_number}-REFUND-001",
            "date": timestamp,
            "description": f"Customer refund - {ride_number}",
            "debit_account": "6200 - Customer Refunds",
            "debit_amount": refund_amount,
            "credit_account": "1100 - Cash/Stripe Receivable",
            "credit_amount": refund_amount,
            "reference": ride_number
        })

    return {
        "ride_number": ride_number,
        "cancellation_fee": cancellation_fee,
        "refund_amount": refund_amount,
        "net_effect": cancellation_fee - refund_amount,
        "journal_entries": entries,
        "created_at": timestamp
    }


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/request", response_model=RideRequestResponse)
async def request_ride(
    request: RideRequestInput,
    db: Session = Depends(get_db)
):
    """
    Request a new ride - Main endpoint for customer app.

    Calculates fare using Haversine distance and returns
    response matching iOS RideRequestResponse exactly.
    """
    pickup = request.pickup_address
    dropoff = request.dropoff_address

    # Calculate distance using Haversine formula
    distance_miles = haversine_distance(
        pickup.lat, pickup.lng,
        dropoff.lat, dropoff.lng
    )

    # Estimate duration
    duration_minutes = estimate_duration(distance_miles)

    # Calculate fare breakdown
    fare = calculate_fare(
        distance_miles=distance_miles,
        duration_minutes=duration_minutes,
        state=pickup.state,
        tip=request.tip,
        surge_multiplier=1.0  # Can add surge logic later
    )

    # Create ride record
    ride_id = get_next_ride_id()
    ride_number = generate_ride_number()

    ride_data = {
        "ride_id": ride_id,
        "ride_number": ride_number,
        "customer_name": request.customer_name,
        "customer_email": request.customer_email,
        "customer_phone": request.customer_phone,
        "pickup": {
            "street": pickup.street,
            "city": pickup.city,
            "state": pickup.state,
            "zip": pickup.zip,
            "lat": pickup.lat,
            "lng": pickup.lng
        },
        "dropoff": {
            "street": dropoff.street,
            "city": dropoff.city,
            "state": dropoff.state,
            "zip": dropoff.zip,
            "lat": dropoff.lat,
            "lng": dropoff.lng
        },
        "notes": request.notes,
        "fare_breakdown": fare,
        "status": "waiting_for_driver",
        "driver_id": None,
        "driver_name": None,
        "driver_phone": None,
        "driver_latitude": None,
        "driver_longitude": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }

    # Store ride (in production, save to database)
    rides_db[ride_id] = ride_data

    # Create journal entries (in production, save to accounting table)
    journal = create_rideshare_journal_entry(ride_data, db)
    ride_data["journal_entries"] = journal

    print(f"[RIDESHARE] New ride request: {ride_number}")
    print(f"[RIDESHARE] Distance: {distance_miles:.2f} mi, Duration: {duration_minutes:.0f} min")
    print(f"[RIDESHARE] Total fare: ${fare['total_fare']:.2f}, Driver: ${fare['driver_earnings']:.2f}, Platform: ${fare['platform_fee']:.2f}")

    return RideRequestResponse(
        success=True,
        ride_id=ride_id,
        ride_number=ride_number,
        pickup=ride_data["pickup"],
        dropoff=ride_data["dropoff"],
        total_fare=fare["total_fare"],
        driver_earnings=fare["driver_earnings"],
        platform_fee=fare["platform_fee"],
        base_fare=fare["base_fare"],
        distance_fee=fare["distance_fee"],
        time_fee=fare["time_fee"],
        surge_multiplier=fare["surge_multiplier"],
        tax_amount=fare["tax_amount"],
        tax_rate=fare["tax_rate"],
        tip=fare["tip"],
        status="waiting_for_driver",
        processed_by="Dollor.ai AI Dispatch"
    )


@router.get("/{ride_id}/track", response_model=RideTrackingResponse)
async def track_ride(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Track a ride - Returns driver location and status.
    Called periodically by iOS app.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Calculate ETA if driver is assigned
    estimated_arrival = None
    if ride.get("driver_latitude") and ride.get("dropoff"):
        # Calculate remaining distance to dropoff
        remaining_distance = haversine_distance(
            ride["driver_latitude"], ride["driver_longitude"],
            ride["dropoff"]["lat"], ride["dropoff"]["lng"]
        )
        eta_minutes = estimate_duration(remaining_distance)
        arrival_time = datetime.now() + timedelta(minutes=eta_minutes)
        estimated_arrival = arrival_time.strftime("%I:%M %p")

    return RideTrackingResponse(
        success=True,
        order_id=ride_id,
        order_number=ride.get("ride_number", ""),
        status=ride.get("status", "waiting_for_driver"),
        driver_name=ride.get("driver_name"),
        driver_phone=ride.get("driver_phone"),
        driver_latitude=ride.get("driver_latitude"),
        driver_longitude=ride.get("driver_longitude"),
        estimated_arrival=estimated_arrival
    )


@router.post("/{ride_id}/cancel", response_model=RideCancelResponse)
async def cancel_ride(
    ride_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Cancel a ride - Calculates cancellation fee based on status.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Check if already cancelled or completed
    if ride.get("status") in ["cancelled", "completed", "delivered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ride cannot be cancelled"
        )

    # Calculate cancellation fee
    cancellation_fee = calculate_cancellation_fee(ride)

    # Calculate refund (if payment was already made)
    total_paid = ride.get("fare_breakdown", {}).get("total_fare", 0)
    refund_amount = max(0, total_paid - cancellation_fee)

    # Update ride status
    ride["status"] = "cancelled"
    ride["cancelled_at"] = datetime.now()
    ride["cancellation_reason"] = reason
    ride["cancellation_fee"] = cancellation_fee
    ride["refund_amount"] = refund_amount

    # Create journal entries for cancellation
    cancel_journal = create_cancellation_journal_entry(ride, cancellation_fee, refund_amount)
    ride["cancellation_journal"] = cancel_journal

    print(f"[RIDESHARE] Ride cancelled: {ride.get('ride_number')}")
    print(f"[RIDESHARE] Fee: ${cancellation_fee:.2f}, Refund: ${refund_amount:.2f}")

    message = "Ride cancelled successfully"
    if cancellation_fee > 0:
        message = f"Ride cancelled. Cancellation fee: ${cancellation_fee:.2f}"

    return RideCancelResponse(
        success=True,
        message=message,
        cancellation_fee=cancellation_fee,
        refund_amount=refund_amount
    )


@router.post("/{ride_id}/customer-negotiate", response_model=FareNegotiationResponse)
async def customer_negotiate_fare(
    ride_id: int,
    proposed_fare: float,
    db: Session = Depends(get_db)
):
    """
    Customer submits a counter-offer for fare negotiation.

    In the $1 platform model, negotiations only affect driver earnings.
    Platform fee remains $1 flat regardless.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Validate proposed fare meets minimum
    if proposed_fare < MINIMUM_FARE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proposed fare must be at least ${MINIMUM_FARE:.2f}"
        )

    # Store negotiation
    ride["customer_offer"] = proposed_fare
    ride["negotiation_status"] = "pending_driver_response"

    # Calculate what driver would earn from this offer
    driver_would_earn = proposed_fare - PLATFORM_FEE - ride.get("fare_breakdown", {}).get("tax_amount", 0)

    return FareNegotiationResponse(
        success=True,
        status="pending_driver_response",
        message=f"Your offer of ${proposed_fare:.2f} has been sent. Driver would earn ${driver_would_earn:.2f}.",
        customer_offer=proposed_fare,
        driver_offer=None
    )


@router.post("/{ride_id}/customer-accept-fare", response_model=FareNegotiationResponse)
async def customer_accept_driver_fare(
    ride_id: int,
    accepted_fare: float,
    db: Session = Depends(get_db)
):
    """
    Customer accepts the driver's counter-offer.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Update fare and status
    ride["agreed_fare"] = accepted_fare
    ride["negotiation_status"] = "accepted"
    ride["status"] = "driver_assigned"

    # Recalculate fare breakdown with agreed amount
    original_fare = ride.get("fare_breakdown", {})
    tax_rate_decimal = original_fare.get("tax_rate_decimal", 0.08)

    # Platform fee stays $1
    driver_earnings = accepted_fare - PLATFORM_FEE - (accepted_fare * tax_rate_decimal)

    ride["fare_breakdown"]["total_fare"] = accepted_fare
    ride["fare_breakdown"]["driver_earnings"] = round(driver_earnings + original_fare.get("tip", 0), 2)

    return FareNegotiationResponse(
        success=True,
        status="accepted",
        message="Fare accepted! Your driver is on the way.",
        customer_offer=None,
        driver_offer=accepted_fare
    )


class NegotiationStatusResponse(BaseModel):
    """Negotiation status for polling - matches iOS RideNegotiationStatus"""
    success: bool
    ride_id: int
    negotiation_status: str  # "none", "customer_offered", "driver_countered", "accepted", "rejected"
    customer_offer: Optional[float] = None
    driver_offer: Optional[float] = None
    agreed_fare: Optional[float] = None
    platform_fee: float = RIDESHARE_PRICING_CONFIG.platform_fee
    driver_earnings: Optional[float] = None
    message: Optional[str] = None
    last_updated: Optional[str] = None


@router.get("/{ride_id}/negotiation-status", response_model=NegotiationStatusResponse)
async def get_negotiation_status(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current negotiation status for a ride.

    Used by customer app to poll for driver counter-offers.
    Returns current negotiation state including any driver counter-offers.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Determine negotiation status
    nego_status = ride.get("negotiation_status", "none")

    # Map internal status to client-facing status
    status_map = {
        "pending_driver_response": "customer_offered",
        "driver_countered": "driver_countered",
        "accepted": "accepted",
        "rejected": "rejected"
    }

    client_status = status_map.get(nego_status, "none")

    # Calculate driver earnings if we have an agreed or offered fare
    driver_earnings = None
    fare_breakdown = ride.get("fare_breakdown", {})

    if ride.get("agreed_fare"):
        # Use agreed fare
        agreed = ride["agreed_fare"]
        tax_rate = fare_breakdown.get("tax_rate_decimal", 0.08)
        driver_earnings = round(agreed - RIDESHARE_PRICING_CONFIG.platform_fee - (agreed * tax_rate), 2)
    elif ride.get("driver_offer"):
        # Use driver's offer
        driver_offer = ride["driver_offer"]
        tax_rate = fare_breakdown.get("tax_rate_decimal", 0.08)
        driver_earnings = round(driver_offer - RIDESHARE_PRICING_CONFIG.platform_fee - (driver_offer * tax_rate), 2)

    # Generate appropriate message
    message = None
    if client_status == "customer_offered":
        message = "Waiting for driver's response..."
    elif client_status == "driver_countered":
        driver_offer = ride.get("driver_offer", 0)
        message = f"Driver counter-offered ${driver_offer:.2f}"
    elif client_status == "accepted":
        agreed = ride.get("agreed_fare", 0)
        message = f"Fare agreed at ${agreed:.2f}! Driver is on the way."
    elif client_status == "rejected":
        message = "Driver declined the offer. Try a higher amount."

    return NegotiationStatusResponse(
        success=True,
        ride_id=ride_id,
        negotiation_status=client_status,
        customer_offer=ride.get("customer_offer"),
        driver_offer=ride.get("driver_offer"),
        agreed_fare=ride.get("agreed_fare"),
        platform_fee=RIDESHARE_PRICING_CONFIG.platform_fee,
        driver_earnings=driver_earnings,
        message=message,
        last_updated=ride.get("updated_at", datetime.now()).isoformat() if isinstance(ride.get("updated_at"), datetime) else str(ride.get("updated_at"))
    )


@router.post("/{ride_id}/driver-counter-offer")
async def driver_submit_counter_offer(
    ride_id: int,
    counter_fare: float,
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver submits a counter-offer to customer's proposed fare.

    Platform fee stays $1 regardless of negotiated fare.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Validate counter offer meets minimum
    if counter_fare < RIDESHARE_PRICING_CONFIG.min_fare:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Counter offer must be at least ${RIDESHARE_PRICING_CONFIG.min_fare:.2f}"
        )

    # Store driver's counter offer
    ride["driver_offer"] = counter_fare
    ride["driver_id"] = driver_id
    ride["negotiation_status"] = "driver_countered"
    ride["updated_at"] = datetime.now()

    # Calculate driver earnings from this offer
    fare_breakdown = ride.get("fare_breakdown", {})
    tax_rate = fare_breakdown.get("tax_rate_decimal", 0.08)
    driver_earnings = round(counter_fare - RIDESHARE_PRICING_CONFIG.platform_fee - (counter_fare * tax_rate), 2)

    print(f"[RIDESHARE] Driver {driver_id} counter-offered ${counter_fare:.2f} for ride {ride.get('ride_number')}")
    print(f"[RIDESHARE] Driver would earn: ${driver_earnings:.2f} (after $1 platform fee)")

    return {
        "success": True,
        "message": f"Counter-offer of ${counter_fare:.2f} sent to customer",
        "ride_id": ride_id,
        "driver_offer": counter_fare,
        "driver_earnings": driver_earnings,
        "platform_fee": RIDESHARE_PRICING_CONFIG.platform_fee,
        "status": "driver_countered"
    }


@router.post("/{ride_id}/payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    ride_id: int,
    amount: float,
    db: Session = Depends(get_db)
):
    """
    Create Stripe payment intent for ride payment.

    In production, this would call Stripe API.
    For now, returns mock response.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Generate mock payment intent (in production, call Stripe)
    payment_intent_id = f"pi_{secrets.token_hex(12)}"
    client_secret = f"{payment_intent_id}_secret_{secrets.token_hex(12)}"

    ride["payment_intent_id"] = payment_intent_id
    ride["payment_amount"] = amount

    return PaymentIntentResponse(
        success=True,
        client_secret=client_secret,
        payment_intent_id=payment_intent_id,
        amount=amount
    )


@router.post("/{ride_id}/confirm-payment", response_model=PaymentConfirmationResponse)
async def confirm_payment(
    ride_id: int,
    payment_intent_id: str,
    db: Session = Depends(get_db)
):
    """
    Confirm ride payment was successful.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    # Verify payment intent matches
    if ride.get("payment_intent_id") != payment_intent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment intent mismatch"
        )

    # Update ride as paid
    ride["payment_status"] = "paid"
    ride["paid_at"] = datetime.now()

    return PaymentConfirmationResponse(
        success=True,
        message="Payment successful! Thank you for riding with Dollor.ai",
        ride_id=ride_id,
        paid_amount=ride.get("payment_amount", 0)
    )


# =============================================================================
# DRIVER ENDPOINTS
# =============================================================================

@router.get("/available", response_model=List[Dict[str, Any]])
async def get_available_rides(
    driver_lat: Optional[float] = None,
    driver_lng: Optional[float] = None,
    max_distance: float = 10.0,  # miles
    db: Session = Depends(get_db)
):
    """
    Get available rides for drivers.
    Optionally filters by distance from driver location.
    """
    available = []

    for ride_id, ride in rides_db.items():
        if ride.get("status") == "waiting_for_driver":
            ride_info = {
                "ride_id": ride_id,
                "ride_number": ride.get("ride_number"),
                "pickup_address": ride.get("pickup", {}).get("street", ""),
                "dropoff_address": ride.get("dropoff", {}).get("street", ""),
                "distance_miles": ride.get("fare_breakdown", {}).get("distance_miles", 0),
                "duration_minutes": ride.get("fare_breakdown", {}).get("duration_minutes", 0),
                "driver_earnings": ride.get("fare_breakdown", {}).get("driver_earnings", 0),
                "tip": ride.get("fare_breakdown", {}).get("tip", 0),
                "created_at": ride.get("created_at", datetime.now()).isoformat()
            }

            # Filter by distance if driver location provided
            if driver_lat and driver_lng:
                pickup = ride.get("pickup", {})
                distance_to_pickup = haversine_distance(
                    driver_lat, driver_lng,
                    pickup.get("lat", 0), pickup.get("lng", 0)
                )
                if distance_to_pickup <= max_distance:
                    ride_info["distance_to_pickup"] = round(distance_to_pickup, 2)
                    available.append(ride_info)
            else:
                available.append(ride_info)

    # Sort by earnings (highest first)
    available.sort(key=lambda x: x.get("driver_earnings", 0), reverse=True)

    return available


@router.post("/{ride_id}/accept")
async def driver_accept_ride(
    ride_id: int,
    driver_id: int,
    driver_name: str,
    driver_phone: str,
    driver_lat: float,
    driver_lng: float,
    db: Session = Depends(get_db)
):
    """
    Driver accepts a ride.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    if ride.get("status") != "waiting_for_driver":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ride is no longer available"
        )

    # Assign driver
    ride["driver_id"] = driver_id
    ride["driver_name"] = driver_name
    ride["driver_phone"] = driver_phone
    ride["driver_latitude"] = driver_lat
    ride["driver_longitude"] = driver_lng
    ride["status"] = "driver_assigned"
    ride["driver_accepted_at"] = datetime.now()

    return {
        "success": True,
        "message": f"Ride {ride.get('ride_number')} accepted",
        "ride_id": ride_id,
        "pickup": ride.get("pickup"),
        "dropoff": ride.get("dropoff"),
        "earnings": ride.get("fare_breakdown", {}).get("driver_earnings", 0)
    }


@router.put("/{ride_id}/location")
async def update_driver_location(
    ride_id: int,
    driver_lat: float,
    driver_lng: float,
    db: Session = Depends(get_db)
):
    """
    Update driver location for tracking.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]
    ride["driver_latitude"] = driver_lat
    ride["driver_longitude"] = driver_lng
    ride["location_updated_at"] = datetime.now()

    return {"success": True}


@router.put("/{ride_id}/pickup")
async def mark_customer_picked_up(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver marks customer as picked up.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]
    ride["status"] = "in_progress"
    ride["picked_up_at"] = datetime.now()

    return {
        "success": True,
        "message": "Customer picked up",
        "status": "in_progress"
    }


@router.put("/{ride_id}/complete")
async def complete_ride(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver completes the ride.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]
    ride["status"] = "completed"
    ride["completed_at"] = datetime.now()

    # Calculate final driver payout
    driver_payout = ride.get("fare_breakdown", {}).get("driver_earnings", 0)

    return {
        "success": True,
        "message": "Ride completed! Great job!",
        "status": "completed",
        "driver_payout": driver_payout,
        "ride_number": ride.get("ride_number")
    }


# =============================================================================
# ADMIN / REPORTING ENDPOINTS
# =============================================================================

@router.get("/stats/summary")
async def get_rideshare_stats(db: Session = Depends(get_db)):
    """
    Get summary statistics for rideshare operations.
    """
    total_rides = len(rides_db)
    completed = sum(1 for r in rides_db.values() if r.get("status") == "completed")
    cancelled = sum(1 for r in rides_db.values() if r.get("status") == "cancelled")
    active = sum(1 for r in rides_db.values() if r.get("status") not in ["completed", "cancelled"])

    total_revenue = sum(
        r.get("fare_breakdown", {}).get("total_fare", 0)
        for r in rides_db.values()
        if r.get("status") == "completed"
    )

    platform_revenue = sum(
        r.get("fare_breakdown", {}).get("platform_fee", PLATFORM_FEE)
        for r in rides_db.values()
        if r.get("status") == "completed"
    )

    driver_payouts = sum(
        r.get("fare_breakdown", {}).get("driver_earnings", 0)
        for r in rides_db.values()
        if r.get("status") == "completed"
    )

    return {
        "total_rides": total_rides,
        "completed_rides": completed,
        "cancelled_rides": cancelled,
        "active_rides": active,
        "total_revenue": round(total_revenue, 2),
        "platform_revenue": round(platform_revenue, 2),
        "driver_payouts": round(driver_payouts, 2),
        "average_fare": round(total_revenue / max(completed, 1), 2)
    }


@router.get("/{ride_id}/journal")
async def get_ride_journal_entries(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Get journal entries for a specific ride.
    For accounting/audit purposes.
    """
    if ride_id not in rides_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    ride = rides_db[ride_id]

    return {
        "ride_id": ride_id,
        "ride_number": ride.get("ride_number"),
        "journal_entries": ride.get("journal_entries", {}),
        "cancellation_journal": ride.get("cancellation_journal"),
        "fare_breakdown": ride.get("fare_breakdown", {})
    }
