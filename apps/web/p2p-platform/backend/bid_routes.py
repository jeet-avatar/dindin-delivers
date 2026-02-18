"""
Ride Bidding API Routes - Matchmaking Platform
Enables price negotiation between riders and drivers
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import math
import uuid

from database import get_db
from models import (
    RideRequest, RideBid, RideRequestStatus, BidStatus,
    Customer, Driver
)
from websocket_server import (
    broadcast_new_ride_request, broadcast_new_bid, broadcast_bid_response,
    broadcast_ride_matched, broadcast_ride_request_cancelled,
    broadcast_bid_update, broadcast_bid_withdrawn, broadcast_counter_offer_response
)
from pricing_config import pricing_engine, get_fare_estimate, get_bid_label
from email_service import (
    send_ride_request_confirmation_email,
    send_ride_bid_received_email,
    send_ride_matched_email,
    send_ride_started_email,
    send_ride_completed_email,
    send_ride_cancelled_email
)
from order_flow import send_push_notification
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rides", tags=["Ride Bidding"])


# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class CreateRideRequestInput(BaseModel):
    customer_id: int
    pickup_address: str
    pickup_latitude: float
    pickup_longitude: float
    pickup_place_name: Optional[str] = None
    dropoff_address: str
    dropoff_latitude: float
    dropoff_longitude: float
    dropoff_place_name: Optional[str] = None
    ride_type: str = "standard"
    customer_max_price: Optional[float] = None
    customer_preferred_price: Optional[float] = None
    special_requests: Optional[str] = None
    bidding_duration_minutes: int = 5  # How long to accept bids


class SubmitBidInput(BaseModel):
    driver_id: int
    proposed_price: float
    message: Optional[str] = None
    estimated_arrival_minutes: Optional[int] = None


class RespondToBidInput(BaseModel):
    action: str  # "accept", "reject", "counter"
    counter_price: Optional[float] = None
    message: Optional[str] = None


class UpdateBidInput(BaseModel):
    proposed_price: float
    message: Optional[str] = None


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def generate_request_id():
    """Generate temporary ride request ID (will be updated after DB insert)"""
    return f"RIDE{datetime.utcnow().strftime('%Y')}000000"


def generate_clean_request_id(db_id: int):
    """Generate clean ride request ID using database ID: RIDE{year}{6-digit-id}"""
    return f"RIDE{datetime.utcnow().strftime('%Y')}{db_id:06d}"


def generate_bid_id():
    """Generate temporary bid ID (will be updated after DB insert)"""
    return f"BID{datetime.utcnow().strftime('%Y')}000000"


def generate_clean_bid_id(db_id: int):
    """Generate clean bid ID using database ID: BID{year}{6-digit-id}"""
    return f"BID{datetime.utcnow().strftime('%Y')}{db_id:06d}"


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c


def calculate_suggested_price(distance_km: float, duration_minutes: int, ride_type: str) -> float:
    """
    Calculate suggested price using competitive market-rate pricing.
    Uses the DollorPricingEngine for consistent pricing across all platforms.
    """
    # Use the centralized pricing engine
    estimate = pricing_engine.calculate_estimate(
        distance_km=distance_km,
        duration_minutes=duration_minutes
    )

    base_price = estimate.subtotal

    # Apply ride type multipliers
    if ride_type == "premium":
        base_price *= 1.5
    elif ride_type == "xl":
        base_price *= 1.25

    return round(base_price, 2)


def estimate_duration_minutes(distance_km: float) -> int:
    """Estimate trip duration based on distance (assuming 30 km/h average)"""
    return max(5, int(distance_km * 2))  # ~30 km/h = 2 min per km


def serialize_ride_request(request: RideRequest, include_bids: bool = False) -> dict:
    """Serialize ride request to dict"""
    data = {
        "id": request.id,
        "request_id": request.request_id,
        "customer_id": request.customer_id,
        "customer_name": request.customer_name,
        "pickup": {
            "address": request.pickup_address,
            "latitude": request.pickup_latitude,
            "longitude": request.pickup_longitude,
            "place_name": request.pickup_place_name
        },
        "dropoff": {
            "address": request.dropoff_address,
            "latitude": request.dropoff_latitude,
            "longitude": request.dropoff_longitude,
            "place_name": request.dropoff_place_name
        },
        "estimated_distance_km": request.estimated_distance_km,
        "estimated_duration_minutes": request.estimated_duration_minutes,
        "ride_type": request.ride_type,
        "suggested_price": request.suggested_price,
        "customer_max_price": request.customer_max_price,
        "customer_preferred_price": request.customer_preferred_price,
        "final_price": request.final_price,
        "status": request.status.value,
        "bidding_expires_at": request.bidding_expires_at.isoformat() if request.bidding_expires_at else None,
        "special_requests": request.special_requests,
        "created_at": request.created_at.isoformat() if request.created_at else None,
        "matched_at": request.matched_at.isoformat() if request.matched_at else None,
        "completed_at": request.completed_at.isoformat() if getattr(request, 'completed_at', None) else None,
        "bid_count": len(request.bids) if request.bids else 0,
        "tip_amount": float(request.tip_amount) if getattr(request, 'tip_amount', None) else 0.0,
        "customer_rating": request.customer_rating if getattr(request, 'customer_rating', None) else None,
        "customer_comment": request.customer_comment if getattr(request, 'customer_comment', None) else None,
        "platform_fee": float(request.platform_fee) if getattr(request, 'platform_fee', None) else None,
        "driver_payout": float(request.driver_payout) if getattr(request, 'driver_payout', None) else None,
    }

    if include_bids and request.bids:
        data["bids"] = [serialize_bid(bid) for bid in request.bids if bid.status == BidStatus.PENDING]

    if request.matched_driver_id:
        data["matched_driver"] = {
            "id": request.matched_driver_id,
            "name": request.matched_driver.first_name + " " + request.matched_driver.last_name if request.matched_driver else None
        }

    return data


def serialize_bid(bid: RideBid) -> dict:
    """Serialize bid to dict"""
    return {
        "id": bid.id,
        "bid_id": bid.bid_id,
        "ride_request_id": bid.ride_request_id,
        "driver_id": bid.driver_id,
        "driver_name": bid.driver_name,
        "driver_rating": bid.driver_rating,
        "driver_photo_url": bid.driver_photo_url,
        "driver_vehicle": bid.driver_vehicle,
        "proposed_price": bid.proposed_price,
        "message": bid.message,
        "estimated_arrival_minutes": bid.estimated_arrival_minutes,
        "is_counter_offer": bid.is_counter_offer,
        "original_price": bid.original_price,
        "status": bid.status.value,
        "customer_response": bid.customer_response,
        "customer_counter_price": bid.customer_counter_price,
        "expires_at": bid.expires_at.isoformat() if bid.expires_at else None,
        "created_at": bid.created_at.isoformat() if bid.created_at else None
    }


# =========================================================================
# CUSTOMER ENDPOINTS
# =========================================================================

@router.post("/request")
async def create_ride_request(data: CreateRideRequestInput, request: Request, db: Session = Depends(get_db)):
    """
    Customer creates a new ride request open for driver bidding.
    SECURITY: Validates customer_id matches the authenticated user's JWT token.
    """
    # SECURITY: If auth token present, enforce customer_id matches JWT
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            import os
            from jose import jwt as _jwt
            _secret = os.getenv("JWT_SECRET_KEY", "")
            payload = _jwt.decode(auth_header[7:], _secret, algorithms=["HS256"])
            jwt_customer_id = payload.get("customer_id")
            if jwt_customer_id and jwt_customer_id != data.customer_id:
                raise HTTPException(
                    status_code=403,
                    detail="customer_id does not match authenticated user"
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Token decode failure handled by endpoint auth if present

    # Get customer
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Calculate distance and duration
    distance_km = calculate_distance_km(
        data.pickup_latitude, data.pickup_longitude,
        data.dropoff_latitude, data.dropoff_longitude
    )
    duration_minutes = estimate_duration_minutes(distance_km)

    # Calculate suggested price
    suggested_price = calculate_suggested_price(distance_km, duration_minutes, data.ride_type)

    # SECURITY: Sanitize user-supplied text to prevent stored XSS
    import re
    _strip_html = lambda t: re.sub(r'<[^>]+>', '', t).strip() if t and isinstance(t, str) else t

    # Create ride request
    ride_request = RideRequest(
        request_id=generate_request_id(),
        customer_id=data.customer_id,
        customer_name=f"{customer.first_name} {customer.last_name}".strip() or customer.email,
        customer_phone=customer.phone,
        pickup_address=_strip_html(data.pickup_address),
        pickup_latitude=data.pickup_latitude,
        pickup_longitude=data.pickup_longitude,
        pickup_place_name=data.pickup_place_name,
        dropoff_address=_strip_html(data.dropoff_address),
        dropoff_latitude=data.dropoff_latitude,
        dropoff_longitude=data.dropoff_longitude,
        dropoff_place_name=_strip_html(data.dropoff_place_name),
        estimated_distance_km=round(distance_km, 2),
        estimated_duration_minutes=duration_minutes,
        ride_type=data.ride_type,
        suggested_price=round(suggested_price, 2),
        customer_max_price=data.customer_max_price,
        customer_preferred_price=data.customer_preferred_price,
        special_requests=_strip_html(data.special_requests),
        status=RideRequestStatus.OPEN,
        bidding_expires_at=datetime.utcnow() + timedelta(minutes=data.bidding_duration_minutes)
    )

    db.add(ride_request)
    db.commit()
    db.refresh(ride_request)

    # Update request_id with clean format: RIDE{year}{6-digit-id}
    ride_request.request_id = generate_clean_request_id(ride_request.id)
    db.commit()

    # Broadcast to nearby drivers via WebSocket
    try:
        asyncio.create_task(broadcast_new_ride_request(
            ride_request_data=serialize_ride_request(ride_request),
            driver_ids=None  # Broadcast to all drivers
        ))
    except Exception as e:
        logger.error(f"WebSocket broadcast error: {e}")

    # Send confirmation email to customer
    try:
        distance_miles = round(distance_km * 0.621371, 1)  # Convert km to miles
        send_ride_request_confirmation_email(
            to_email=customer.email,
            customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
            request_id=ride_request.request_id,
            pickup_address=data.pickup_address,
            dropoff_address=data.dropoff_address,
            estimated_price=suggested_price,
            estimated_distance_miles=distance_miles,
            estimated_duration_minutes=duration_minutes
        )
        logger.info(f"Ride request confirmation email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send ride request confirmation email: {e}")

    return {
        "success": True,
        "message": "Ride request created - waiting for driver bids",
        "ride_request": serialize_ride_request(ride_request)
    }


@router.get("/request/{request_id}")
async def get_ride_request(request_id: int, db: Session = Depends(get_db)):
    """Get ride request details with all bids"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    return {
        "success": True,
        "ride_request": serialize_ride_request(ride_request, include_bids=True)
    }


@router.get("/customer/{customer_id}/requests")
async def get_customer_ride_requests(
    customer_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all ride requests for a customer"""
    query = db.query(RideRequest).filter(RideRequest.customer_id == customer_id)

    if status:
        try:
            status_enum = RideRequestStatus(status)
            query = query.filter(RideRequest.status == status_enum)
        except ValueError:
            pass

    requests = query.order_by(RideRequest.created_at.desc()).limit(50).all()

    return {
        "success": True,
        "requests": [serialize_ride_request(r, include_bids=True) for r in requests]
    }


@router.get("/request/{request_id}/bids")
async def get_bids_for_request(request_id: int, db: Session = Depends(get_db)):
    """Get all pending bids for a ride request"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # Get pending bids, sorted by price (lowest first)
    bids = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.status == BidStatus.PENDING
        )
    ).order_by(RideBid.proposed_price.asc()).all()

    # Return iOS-compatible format (CustomerRideBidsResponse)
    return {
        "request_id": request_id,
        "bids": [serialize_bid(b) for b in bids],
        "total_bids": len(bids),
        "bidding_open": ride_request.status == RideRequestStatus.OPEN or ride_request.status == RideRequestStatus.BIDDING,
        "bidding_ends_at": ride_request.bidding_expires_at.isoformat() if ride_request.bidding_expires_at else None
    }


@router.post("/bid/{bid_id}/respond")
async def respond_to_bid(bid_id: int, data: RespondToBidInput, db: Session = Depends(get_db)):
    """
    Customer responds to a driver's bid
    Actions: accept, reject, counter
    """
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status != BidStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Bid is already {bid.status.value}")

    ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status == RideRequestStatus.MATCHED:
        raise HTTPException(status_code=400, detail="Ride already matched with a driver")

    now = datetime.utcnow()

    if data.action == "accept":
        # Accept this bid - match the ride
        bid.status = BidStatus.ACCEPTED
        bid.accepted_at = now
        bid.responded_at = now

        # Update ride request
        ride_request.status = RideRequestStatus.MATCHED
        ride_request.matched_bid_id = bid.id
        ride_request.matched_driver_id = bid.driver_id
        ride_request.final_price = bid.proposed_price
        ride_request.matched_at = now

        # Reject all other pending bids
        other_bids = db.query(RideBid).filter(
            and_(
                RideBid.ride_request_id == ride_request.id,
                RideBid.id != bid.id,
                RideBid.status == BidStatus.PENDING
            )
        ).all()

        for other_bid in other_bids:
            other_bid.status = BidStatus.REJECTED
            other_bid.rejected_at = now
            other_bid.customer_response = "Another bid was accepted"

        db.commit()

        # Send WebSocket update - ride matched
        try:
            asyncio.create_task(broadcast_ride_matched(
                ride_request_id=ride_request.id,
                customer_id=ride_request.customer_id,
                driver_id=bid.driver_id,
                match_details=serialize_bid(bid)
            ))
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")

        # Get driver for response and email
        driver = db.query(Driver).filter(Driver.id == bid.driver_id).first()

        # Build driver info for iOS AcceptedDriverInfo format
        driver_info = None
        if driver:
            driver_info = {
                "id": driver.id,
                "name": f"{driver.first_name} {driver.last_name}" if driver.first_name else driver.email,
                "phone": driver.phone,
                "rating": driver.rating,
                "photo_url": driver.photo_url,
                "vehicle_make": driver.vehicle_make,
                "vehicle_model": driver.vehicle_model,
                "vehicle_color": driver.vehicle_color,
                "vehicle_year": driver.vehicle_year,
                "license_plate": driver.license_plate,
                "vehicle_photo_url": driver.vehicle_photo_url
            }

        # Send ride matched email to customer
        try:
            customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
            if customer and customer.email and driver:
                send_ride_matched_email(
                    to_email=customer.email,
                    customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                    request_id=ride_request.request_id,
                    driver_name=f"{driver.first_name} {driver.last_name}",
                    driver_phone=driver.phone or "",
                    driver_vehicle=bid.driver_vehicle or "",
                    final_price=ride_request.final_price,
                    eta_minutes=bid.estimated_arrival_minutes or 10,
                    pickup_address=ride_request.pickup_address
                )
                logger.info(f"Ride matched email sent to {customer.email}")
        except Exception as e:
            logger.error(f"Failed to send ride matched email: {e}")

        # Send push notification to driver - BID ACCEPTED
        try:
            customer_name = "Customer"
            if customer:
                customer_name = f"{customer.first_name} {customer.last_name}".strip() or "Customer"

            send_push_notification(
                user_type="driver",
                user_id=bid.driver_id,
                title="Bid Accepted!",
                body=f"{customer_name} accepted your ${bid.proposed_price:.0f} bid. Head to pickup!",
                data={
                    "type": "bid_accepted",
                    "ride_request_id": str(ride_request.id),
                    "request_id": ride_request.request_id,
                    "pickup_address": ride_request.pickup_address,
                    "final_price": str(bid.proposed_price)
                },
                db=db
            )
            logger.info(f"Push notification sent to driver {bid.driver_id} - bid accepted")
        except Exception as e:
            logger.error(f"Failed to send push notification to driver: {e}")

        # Return iOS AcceptedRideDetails format + backward compatible fields
        return {
            "success": True,
            "message": f"Bid accepted! Ride matched with {bid.driver_name}",
            # iOS AcceptedRideDetails fields
            "ride_id": ride_request.id,
            "driver": driver_info,
            "pickup": {
                "address": ride_request.pickup_address,
                "latitude": ride_request.pickup_latitude,
                "longitude": ride_request.pickup_longitude
            },
            "dropoff": {
                "address": ride_request.dropoff_address,
                "latitude": ride_request.dropoff_latitude,
                "longitude": ride_request.dropoff_longitude
            },
            "estimated_arrival_minutes": bid.estimated_arrival_minutes,
            "fare": bid.proposed_price,
            "status": "accepted",
            # Backward compatible fields
            "ride_request": serialize_ride_request(ride_request),
            "accepted_bid": serialize_bid(bid)
        }

    elif data.action == "reject":
        bid.status = BidStatus.REJECTED
        bid.rejected_at = now
        bid.responded_at = now
        bid.customer_response = data.message or "Bid rejected by customer"

        db.commit()

        # Send WebSocket update to driver
        try:
            asyncio.create_task(broadcast_bid_response(
                driver_id=bid.driver_id,
                bid_id=bid.id,
                action="rejected",
                details={"message": bid.customer_response}
            ))
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")

        return {
            "success": True,
            "message": "Bid rejected",
            "bid": serialize_bid(bid)
        }

    elif data.action == "counter":
        if not data.counter_price:
            raise HTTPException(status_code=400, detail="Counter price required")

        # Multi-round negotiation: Check customer counter limit (max 3 total)
        MAX_CUSTOMER_COUNTERS = 3
        current_counter_count = ride_request.customer_counter_count or 0

        if current_counter_count >= MAX_CUSTOMER_COUNTERS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {MAX_CUSTOMER_COUNTERS} counter-offers reached. Please accept a bid or request a new ride."
            )

        # Check negotiation round for this bid (max 2 rounds per bid)
        MAX_ROUNDS_PER_BID = 2
        current_round = bid.negotiation_round or 1

        if current_round >= MAX_ROUNDS_PER_BID and bid.last_offer_by == "customer":
            raise HTTPException(
                status_code=400,
                detail="Maximum negotiation rounds reached for this bid. Accept, reject, or try another driver."
            )

        # Price validation
        suggested_price = ride_request.suggested_price or 15.0
        counter_price = data.counter_price
        warning_message = None

        # Counter must be positive
        if counter_price <= 0:
            raise HTTPException(status_code=400, detail="Counter price must be greater than $0")

        # Customer counter should be lower than driver's bid (negotiating down)
        if counter_price >= bid.proposed_price:
            raise HTTPException(
                status_code=400,
                detail=f"Counter must be less than driver's bid of ${bid.proposed_price:.2f}"
            )

        # Very low bid (< 40% of suggested) - reject with message
        if counter_price < suggested_price * 0.4:
            min_acceptable = round(suggested_price * 0.5, 2)
            raise HTTPException(
                status_code=400,
                detail=f"Offer too low. Minimum acceptable: ${min_acceptable:.2f}. Suggested fare: ${suggested_price:.2f}"
            )

        # Low bid (< 60% of suggested) - allow but warn
        elif counter_price < suggested_price * 0.6:
            warning_message = f"Warning: Your offer is {int((1 - counter_price/suggested_price) * 100)}% below market rate. Drivers may not accept."
            ride_request.low_bid_warning_shown = True

        # Update bid with counter
        # Note: negotiation_round only increments when DRIVER makes a new offer
        # Customer counter is still part of current round (responding to driver's offer)
        bid.status = BidStatus.COUNTERED
        bid.responded_at = now
        bid.customer_response = data.message
        bid.customer_counter_price = data.counter_price
        # Don't increment negotiation_round here - customer is responding, not starting new round
        bid.last_offer_by = "customer"
        bid.round_counter = (bid.round_counter or 0) + 1

        # Update ride request counter count
        ride_request.customer_counter_count = current_counter_count + 1

        db.commit()

        # Send push notification to driver about counter-offer
        try:
            send_push_notification(
                user_type="driver",
                user_id=bid.driver_id,
                title="Counter Offer Received!",
                body=f"Customer offered ${data.counter_price:.2f} (Round {current_round}/2)",
                data={
                    "type": "counter_offer",
                    "bid_id": str(bid.id),
                    "ride_request_id": str(ride_request.id),
                    "counter_price": str(data.counter_price),
                    "round": str(current_round)
                },
                db=db
            )
        except Exception as e:
            logger.error(f"Failed to send counter-offer push notification: {e}")

        # Send WebSocket update to driver with counter-offer
        try:
            asyncio.create_task(broadcast_bid_response(
                driver_id=bid.driver_id,
                bid_id=bid.id,
                action="countered",
                details={
                    "counter_price": data.counter_price,
                    "message": data.message,
                    "negotiation_round": current_round,
                    "rounds_remaining": MAX_ROUNDS_PER_BID - current_round
                }
            ))
        except Exception as e:
            logger.error(f"WebSocket broadcast error: {e}")

        response = {
            "success": True,
            "message": f"Counter-offer of ${data.counter_price:.2f} sent to driver",
            "bid": serialize_bid(bid),
            "negotiation_round": current_round,
            "customer_counters_remaining": MAX_CUSTOMER_COUNTERS - ride_request.customer_counter_count,
            "rounds_remaining_this_bid": MAX_ROUNDS_PER_BID - current_round
        }

        if warning_message:
            response["warning"] = warning_message

        return response

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use: accept, reject, or counter")


@router.post("/request/{request_id}/cancel")
async def cancel_ride_request(request_id: int, db: Session = Depends(get_db)):
    """Customer cancels their ride request"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status in [RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED, RideRequestStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel ride with status: {ride_request.status.value}")

    ride_request.status = RideRequestStatus.CANCELLED
    ride_request.cancelled_at = datetime.utcnow()

    # Expire all pending bids
    pending_bids = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.status == BidStatus.PENDING
        )
    ).all()

    for bid in pending_bids:
        bid.status = BidStatus.EXPIRED
        bid.customer_response = "Ride request cancelled by customer"

    db.commit()

    # Send cancellation email to customer
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        if customer and customer.email:
            send_ride_cancelled_email(
                to_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                request_id=ride_request.request_id,
                cancelled_by="Customer",
                reason="Cancelled by customer request",
                refund_amount=ride_request.final_price if ride_request.final_price else None
            )
            logger.info(f"Ride cancellation email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send ride cancellation email: {e}")

    return {
        "success": True,
        "message": "Ride request cancelled"
    }


# =========================================================================
# DRIVER ENDPOINTS
# =========================================================================

@router.get("/available")
async def get_available_ride_requests(
    driver_id: Optional[int] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: float = 15.0,
    db: Session = Depends(get_db)
):
    """
    Get available ride requests near the driver for bidding.
    If driver_id/latitude/longitude not provided, returns all open rides.
    """
    # Get open and bidding ride requests (BIDDING = at least one driver has bid)
    now = datetime.utcnow()
    open_requests = db.query(RideRequest).filter(
        and_(
            RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING]),
            or_(
                RideRequest.bidding_expires_at > now,
                RideRequest.bidding_expires_at.is_(None)
            )
        )
    ).all()

    nearby_requests = []
    for request in open_requests:
        # Calculate distance if driver location provided
        distance = None
        if latitude is not None and longitude is not None and request.pickup_latitude and request.pickup_longitude:
            distance = calculate_distance_km(
                latitude, longitude,
                request.pickup_latitude, request.pickup_longitude
            )
            if distance > radius_km:
                continue

        # Check if driver already bid on this request
        existing_bid = None
        if driver_id is not None:
            existing_bid = db.query(RideBid).filter(
                and_(
                    RideBid.ride_request_id == request.id,
                    RideBid.driver_id == driver_id,
                    RideBid.status.in_([BidStatus.PENDING, BidStatus.COUNTERED])
                )
            ).first()

        request_data = serialize_ride_request(request)
        request_data["distance_to_pickup_km"] = round(distance, 2) if distance is not None else None
        request_data["already_bid"] = existing_bid is not None
        if existing_bid:
            request_data["my_bid"] = serialize_bid(existing_bid)

        nearby_requests.append(request_data)

    # Sort by distance if available (closest first)
    nearby_requests.sort(key=lambda x: x.get("distance_to_pickup_km") or 999)

    return {
        "success": True,
        "available_requests": nearby_requests,
        "count": len(nearby_requests)
    }


@router.post("/request/{request_id}/bid")
async def submit_bid(request_id: int, data: SubmitBidInput, db: Session = Depends(get_db)):
    """
    Driver submits a bid on a ride request
    """
    # Get ride request
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # Allow bidding when status is OPEN or BIDDING (status becomes BIDDING after first bid)
    if ride_request.status not in [RideRequestStatus.OPEN, RideRequestStatus.BIDDING]:
        raise HTTPException(status_code=400, detail=f"Ride request is {ride_request.status.value}, not accepting bids")

    # Check if bidding expired
    if ride_request.bidding_expires_at and datetime.utcnow() > ride_request.bidding_expires_at:
        raise HTTPException(status_code=400, detail="Bidding window has closed")

    # Get driver
    driver = db.query(Driver).filter(Driver.id == data.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Check if driver has an active ride or delivery
    active_ride = db.query(RideRequest).filter(
        and_(
            RideRequest.matched_driver_id == data.driver_id,
            RideRequest.status.in_([RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS])
        )
    ).first()
    if active_ride:
        raise HTTPException(
            status_code=400,
            detail="You have an active ride in progress. Complete your current ride before bidding on new requests."
        )

    # Check if driver has an active delivery order (any status where driver is assigned)
    from models import Order, OrderStatus
    active_delivery = db.query(Order).filter(
        and_(
            Order.driver_id == data.driver_id,
            Order.status.in_([OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY])
        )
    ).first()
    if active_delivery:
        raise HTTPException(
            status_code=400,
            detail="You have an active delivery in progress. Complete your current delivery before bidding on rides."
        )

    # Check if driver already has a pending bid
    existing_bid = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.driver_id == data.driver_id,
            RideBid.status == BidStatus.PENDING
        )
    ).first()

    if existing_bid:
        raise HTTPException(status_code=400, detail="You already have a pending bid on this request. Update or withdraw it first.")

    # Check max bids limit (default 10)
    # First, auto-expire old pending bids (older than 10 minutes)
    now = datetime.utcnow()
    expired_bids = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.status == BidStatus.PENDING,
            RideBid.expires_at < now
        )
    ).all()

    for expired_bid in expired_bids:
        expired_bid.status = BidStatus.EXPIRED
        expired_bid.customer_response = "Bid expired (no response within 10 minutes)"

    if expired_bids:
        db.commit()

    # Count only active (non-expired) pending bids
    current_bid_count = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request_id,
            RideBid.status == BidStatus.PENDING,
            or_(
                RideBid.expires_at > now,
                RideBid.expires_at.is_(None)
            )
        )
    ).count()

    max_bids = ride_request.max_bids or 10
    if current_bid_count >= max_bids:
        raise HTTPException(
            status_code=400,
            detail=f"This ride has reached the maximum of {max_bids} active bids. Try another ride request."
        )

    # Create bid
    vehicle_info = f"{driver.vehicle_make} {driver.vehicle_model}"
    if driver.vehicle_year:
        vehicle_info += f" {driver.vehicle_year}"
    if driver.vehicle_color:
        vehicle_info += f" - {driver.vehicle_color}"

    bid = RideBid(
        bid_id=generate_bid_id(),
        ride_request_id=request_id,
        driver_id=data.driver_id,
        driver_name=f"{driver.first_name} {driver.last_name}",
        driver_rating=driver.rating,
        driver_photo_url=driver.photo_url,
        driver_vehicle=vehicle_info,
        proposed_price=data.proposed_price,
        message=data.message,
        estimated_arrival_minutes=data.estimated_arrival_minutes,
        status=BidStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(minutes=10)  # Bid valid for 10 minutes
    )

    db.add(bid)

    # Update ride request status to BIDDING if first bid
    if ride_request.status == RideRequestStatus.OPEN:
        ride_request.status = RideRequestStatus.BIDDING

    db.commit()
    db.refresh(bid)

    # Update bid_id with clean format: BID{year}{6-digit-id}
    bid.bid_id = generate_clean_bid_id(bid.id)
    db.commit()

    # Send WebSocket update to customer about new bid
    try:
        asyncio.create_task(broadcast_new_bid(
            ride_request_id=request_id,
            customer_id=ride_request.customer_id,
            bid_data=serialize_bid(bid)
        ))
    except Exception as e:
        logger.error(f"WebSocket broadcast error: {e}")

    # Send email notification to customer about new bid
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        if customer and customer.email:
            # Count total pending bids
            total_bids = db.query(RideBid).filter(
                RideBid.ride_request_id == request_id,
                RideBid.status == BidStatus.PENDING
            ).count()

            send_ride_bid_received_email(
                to_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                request_id=ride_request.request_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                driver_rating=driver.rating or 0.0,
                proposed_price=data.proposed_price,
                eta_minutes=data.estimated_arrival_minutes or 10,
                total_bids=total_bids
            )
            logger.info(f"Bid notification email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send bid notification email: {e}")

    # Send push notification to customer about new bid
    try:
        driver_name = f"{driver.first_name} {driver.last_name}".strip()
        send_push_notification(
            user_type="customer",
            user_id=ride_request.customer_id,
            title="New Driver Bid!",
            body=f"{driver_name} bid ${data.proposed_price:.2f} for your ride",
            data={
                "type": "new_bid",
                "ride_request_id": str(request_id),
                "bid_id": str(bid.id),
                "driver_name": driver_name,
                "proposed_price": str(data.proposed_price),
                "eta_minutes": str(data.estimated_arrival_minutes or 10)
            },
            db=db
        )
        logger.info(f"Push notification sent to customer {ride_request.customer_id} for new bid")
    except Exception as e:
        logger.error(f"Failed to send push notification for new bid: {e}")

    return {
        "success": True,
        "message": "Bid submitted successfully",
        "bid": serialize_bid(bid)
    }


@router.put("/bid/{bid_id}")
async def update_bid(bid_id: int, data: UpdateBidInput, db: Session = Depends(get_db)):
    """Driver updates their bid (only if still pending)"""
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status != BidStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot update bid that is {bid.status.value}")

    bid.proposed_price = data.proposed_price
    if data.message:
        bid.message = data.message
    bid.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(bid)

    return {
        "success": True,
        "message": "Bid updated",
        "bid": serialize_bid(bid)
    }


@router.post("/bid/{bid_id}/withdraw")
async def withdraw_bid(bid_id: int, db: Session = Depends(get_db)):
    """Driver withdraws their bid"""
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status not in [BidStatus.PENDING, BidStatus.COUNTERED]:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw bid that is {bid.status.value}")

    bid.status = BidStatus.WITHDRAWN
    bid.updated_at = datetime.utcnow()

    db.commit()

    # Keep ride request open for other drivers
    ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
    if ride_request and ride_request.status == RideRequestStatus.BIDDING:
        # Check if there are other pending bids
        other_pending = db.query(RideBid).filter(
            and_(
                RideBid.ride_request_id == ride_request.id,
                RideBid.status == BidStatus.PENDING
            )
        ).count()
        if other_pending == 0:
            ride_request.status = RideRequestStatus.OPEN  # Reopen for new bids
            db.commit()

    return {
        "success": True,
        "message": "Bid withdrawn. Ride is available for other drivers."
    }


class DriverCounterInput(BaseModel):
    counter_price: float
    message: Optional[str] = None


@router.post("/bid/{bid_id}/driver-counter")
async def driver_counter_offer(bid_id: int, data: DriverCounterInput, db: Session = Depends(get_db)):
    """
    Driver responds to customer's counter-offer with their own counter (Round 2).
    This is the final round - customer must accept or reject.
    """
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status != BidStatus.COUNTERED:
        raise HTTPException(status_code=400, detail="Can only counter a bid that has been countered by customer")

    if bid.last_offer_by != "customer":
        raise HTTPException(status_code=400, detail="Waiting for customer response")

    ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # Validate counter price
    if data.counter_price <= 0:
        raise HTTPException(status_code=400, detail="Counter price must be greater than $0")

    # Driver counter should be higher than customer's counter (negotiating up)
    if bid.customer_counter_price and data.counter_price <= bid.customer_counter_price:
        raise HTTPException(
            status_code=400,
            detail=f"Counter must be more than customer's offer of ${bid.customer_counter_price:.2f}"
        )

    MAX_ROUNDS_PER_BID = 2
    if bid.negotiation_round >= MAX_ROUNDS_PER_BID:
        raise HTTPException(
            status_code=400,
            detail="Maximum negotiation rounds reached. Accept customer's offer or withdraw."
        )

    now = datetime.utcnow()

    # Update bid with driver's counter
    bid.proposed_price = data.counter_price
    bid.message = data.message
    bid.negotiation_round = (bid.negotiation_round or 1) + 1
    bid.last_offer_by = "driver"
    bid.round_counter = (bid.round_counter or 0) + 1
    bid.updated_at = now
    bid.status = BidStatus.PENDING  # Back to pending for customer decision

    db.commit()

    # Send push notification to customer about driver's counter
    try:
        send_push_notification(
            user_type="customer",
            user_id=ride_request.customer_id,
            title="Driver Counter Offer!",
            body=f"Driver offered ${data.counter_price:.2f} - Final offer (Round {bid.negotiation_round}/2)",
            data={
                "type": "driver_counter",
                "bid_id": str(bid.id),
                "ride_request_id": str(ride_request.id),
                "counter_price": str(data.counter_price),
                "round": str(bid.negotiation_round),
                "is_final": "true"
            },
            db=db
        )
    except Exception as e:
        logger.error(f"Failed to send driver counter push notification: {e}")

    # WebSocket broadcast
    try:
        asyncio.create_task(broadcast_bid_update(
            ride_request_id=ride_request.id,
            customer_id=ride_request.customer_id,
            bid_data={
                **serialize_bid(bid),
                "is_driver_counter": True,
                "is_final_round": bid.negotiation_round >= MAX_ROUNDS_PER_BID
            }
        ))
    except Exception as e:
        logger.error(f"WebSocket broadcast error: {e}")

    return {
        "success": True,
        "message": f"Counter-offer of ${data.counter_price:.2f} sent to customer. This is the final round.",
        "bid": serialize_bid(bid),
        "negotiation_round": bid.negotiation_round,
        "is_final_round": True
    }


@router.post("/bid/{bid_id}/accept-counter")
async def accept_counter_offer(bid_id: int, db: Session = Depends(get_db)):
    """Driver accepts customer's counter-offer"""
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status != BidStatus.COUNTERED:
        raise HTTPException(status_code=400, detail="This bid doesn't have a counter-offer")

    ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    now = datetime.utcnow()

    # Save original price before updating (for history tracking)
    original_driver_price = bid.proposed_price

    # Accept the counter-offer price
    bid.status = BidStatus.ACCEPTED
    bid.proposed_price = bid.customer_counter_price
    bid.is_counter_offer = True
    if not bid.original_price:  # Only set if not already set
        bid.original_price = original_driver_price
    bid.accepted_at = now

    # Match the ride
    ride_request.status = RideRequestStatus.MATCHED
    ride_request.matched_bid_id = bid.id
    ride_request.matched_driver_id = bid.driver_id
    ride_request.final_price = bid.customer_counter_price
    ride_request.matched_at = now

    # Reject other pending bids
    other_bids = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == ride_request.id,
            RideBid.id != bid.id,
            RideBid.status == BidStatus.PENDING
        )
    ).all()

    for other_bid in other_bids:
        other_bid.status = BidStatus.REJECTED
        other_bid.customer_response = "Another bid was accepted"

    db.commit()

    # Send push notification to customer - COUNTER ACCEPTED
    try:
        driver = db.query(Driver).filter(Driver.id == bid.driver_id).first()
        driver_name = "Your driver"
        if driver:
            driver_name = f"{driver.first_name}".strip() or "Your driver"

        send_push_notification(
            user_type="customer",
            user_id=ride_request.customer_id,
            title="Driver Accepted Your Offer!",
            body=f"{driver_name} accepted ${bid.customer_counter_price:.0f}. Pickup in ~{bid.estimated_arrival_minutes or 10} min",
            data={
                "type": "counter_accepted",
                "ride_request_id": str(ride_request.id),
                "request_id": ride_request.request_id,
                "final_price": str(bid.customer_counter_price),
                "driver_name": driver_name
            },
            db=db
        )
        logger.info(f"Push notification sent to customer {ride_request.customer_id} - counter accepted")
    except Exception as e:
        logger.error(f"Failed to send push notification to customer: {e}")

    # Send ride matched email to customer
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == bid.driver_id).first()
        if customer and customer.email and driver:
            send_ride_matched_email(
                to_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                request_id=ride_request.request_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                driver_phone=driver.phone or "",
                driver_vehicle=bid.driver_vehicle or "",
                final_price=ride_request.final_price,
                eta_minutes=bid.estimated_arrival_minutes or 10,
                pickup_address=ride_request.pickup_address
            )
            logger.info(f"Ride matched email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send ride matched email: {e}")

    return {
        "success": True,
        "message": f"Counter-offer accepted! Ride matched at ${bid.customer_counter_price:.2f}",
        "ride_request": serialize_ride_request(ride_request),
        "bid": serialize_bid(bid)
    }


@router.post("/bid/{bid_id}/reject-counter")
async def reject_counter_offer(bid_id: int, db: Session = Depends(get_db)):
    """Driver rejects customer's counter-offer"""
    bid = db.query(RideBid).filter(RideBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid.status != BidStatus.COUNTERED:
        raise HTTPException(status_code=400, detail="This bid doesn't have a counter-offer")

    bid.status = BidStatus.WITHDRAWN
    bid.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": "Counter-offer rejected, bid withdrawn"
    }


@router.get("/driver/{driver_id}/bids")
async def get_driver_bids(
    driver_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all bids for a driver"""
    query = db.query(RideBid).filter(RideBid.driver_id == driver_id)

    if status:
        try:
            status_enum = BidStatus(status)
            query = query.filter(RideBid.status == status_enum)
        except ValueError:
            pass

    bids = query.order_by(RideBid.created_at.desc()).limit(50).all()

    # Include ride request info
    result = []
    for bid in bids:
        bid_data = serialize_bid(bid)
        if bid.ride_request:
            bid_data["ride_request"] = serialize_ride_request(bid.ride_request)
        result.append(bid_data)

    return {
        "success": True,
        "bids": result
    }


# =========================================================================
# RIDE LIFECYCLE
# =========================================================================

@router.post("/request/{request_id}/arrived")
async def driver_arrived(request_id: int, db: Session = Depends(get_db)):
    """Mark that the driver has arrived at pickup location"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status != RideRequestStatus.MATCHED:
        raise HTTPException(status_code=400, detail=f"Ride must be matched first (current: {ride_request.status.value})")

    ride_request.driver_arrived_at = datetime.utcnow()
    db.commit()

    # Send push notification to customer - DRIVER ARRIVED
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
        if customer:
            driver_name = "Your driver"
            if driver:
                driver_name = f"{driver.first_name}".strip() or "Your driver"

            send_push_notification(
                user_type="customer",
                user_id=ride_request.customer_id,
                title="Your driver has arrived!",
                body=f"{driver_name} is at the pickup location. Head out to meet them.",
                data={
                    "type": "driver_arrived",
                    "ride_request_id": str(ride_request.id),
                    "request_id": ride_request.request_id,
                    "pickup_address": ride_request.pickup_address
                },
                db=db
            )
            logger.info(f"Push notification sent to customer {ride_request.customer_id} - driver arrived")
    except Exception as e:
        logger.error(f"Failed to send driver arrived notification: {e}")

    return {
        "success": True,
        "message": "Driver arrived at pickup",
        "ride_request": serialize_ride_request(ride_request)
    }


@router.post("/request/{request_id}/start")
async def start_ride(request_id: int, db: Session = Depends(get_db)):
    """Start the matched ride (driver picked up customer)"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status != RideRequestStatus.MATCHED:
        raise HTTPException(status_code=400, detail=f"Ride must be matched first (current: {ride_request.status.value})")

    ride_request.status = RideRequestStatus.IN_PROGRESS
    db.commit()

    # Send ride started email to customer
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
        if customer and customer.email and driver:
            send_ride_started_email(
                to_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                request_id=ride_request.request_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address=ride_request.pickup_address,
                dropoff_address=ride_request.dropoff_address,
                estimated_duration_minutes=ride_request.estimated_duration_minutes or 15,
                final_price=ride_request.final_price
            )
            logger.info(f"Ride started email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send ride started email: {e}")

    # Send push notification to customer - RIDE STARTED
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
        if customer:
            driver_name = "Your driver"
            if driver:
                driver_name = f"{driver.first_name}".strip() or "Your driver"

            eta_minutes = ride_request.estimated_duration_minutes or 15
            send_push_notification(
                user_type="customer",
                user_id=ride_request.customer_id,
                title="You're on your way!",
                body=f"{driver_name} picked you up. ETA to destination: ~{eta_minutes} min",
                data={
                    "type": "ride_started",
                    "ride_request_id": str(ride_request.id),
                    "request_id": ride_request.request_id,
                    "dropoff_address": ride_request.dropoff_address
                },
                db=db
            )
            logger.info(f"Push notification sent to customer {ride_request.customer_id} - ride started")
    except Exception as e:
        logger.error(f"Failed to send push notification to customer: {e}")

    return {
        "success": True,
        "message": "Ride started",
        "ride_request": serialize_ride_request(ride_request)
    }


@router.post("/request/{request_id}/complete")
async def complete_ride(request_id: int, db: Session = Depends(get_db)):
    """Complete the ride (driver dropped off customer)"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status != RideRequestStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail=f"Ride must be in progress first (current: {ride_request.status.value})")

    ride_request.status = RideRequestStatus.COMPLETED
    ride_request.completed_at = datetime.utcnow()

    # Calculate and persist platform fee + driver payout (fare-tiered Model A)
    final_price = float(ride_request.final_price or ride_request.suggested_price or 0)
    if final_price <= 35:
        platform_fee = 1.00
    elif final_price <= 70:
        platform_fee = 2.00
    else:
        platform_fee = 3.00
    ride_request.platform_fee = platform_fee
    ride_request.driver_payout = round(final_price - platform_fee, 2)

    db.commit()

    # Auto-trigger driver payout via Stripe Connect (non-blocking)
    try:
        import stripe
        import os
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

        # Demo rides: skip Stripe, just mark payment status
        if ride_request.stripe_payment_intent_id and ride_request.stripe_payment_intent_id.startswith("demo_"):
            ride_request.payment_status = "demo"
            ride_request.payment_completed_at = datetime.utcnow()
            db.commit()
            logger.info(f"Ride {ride_request.id} is demo — skipping Stripe payout")
        else:
            driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
            if driver and getattr(driver, 'stripe_account_id', None) and getattr(driver, 'stripe_onboarded', False):
                payout_cents = int(ride_request.driver_payout * 100)
                if payout_cents > 0:
                    transfer = stripe.Transfer.create(
                        amount=payout_cents,
                        currency="usd",
                        destination=driver.stripe_account_id,
                        description=f"Ride {ride_request.request_id} payout",
                        metadata={
                            "ride_id": str(ride_request.id),
                            "ride_request_id": ride_request.request_id,
                            "driver_id": str(driver.id),
                            "fare": str(final_price),
                            "platform_fee": str(platform_fee),
                        }
                    )
                    ride_request.stripe_transfer_id = transfer.id
                    ride_request.driver_paid_at = datetime.utcnow()
                    db.commit()
                    logger.info(f"Ride {ride_request.id} auto-payout ${ride_request.driver_payout:.2f} to driver {driver.id}")
            else:
                logger.info(f"Ride {ride_request.id} driver not Stripe-onboarded, skipping auto-payout")
    except Exception as e:
        logger.error(f"Ride {ride_request.id} auto-payout failed (non-blocking): {e}")

    # Send ride completed email with receipt to customer
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
        if customer and customer.email and driver:
            # Convert km to miles for receipt
            distance_miles = (ride_request.estimated_distance_km or 0) * 0.621371

            send_ride_completed_email(
                to_email=customer.email,
                customer_name=f"{customer.first_name} {customer.last_name}".strip() or "Customer",
                request_id=ride_request.request_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                pickup_address=ride_request.pickup_address,
                dropoff_address=ride_request.dropoff_address,
                final_price=final_price,
                platform_fee=platform_fee,
                distance_miles=round(distance_miles, 1),
                duration_minutes=ride_request.estimated_duration_minutes or 15
            )
            logger.info(f"Ride completed email sent to {customer.email}")
    except Exception as e:
        logger.error(f"Failed to send ride completed email: {e}")

    # Send push notification to customer - RIDE COMPLETED
    try:
        customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
        driver = db.query(Driver).filter(Driver.id == ride_request.matched_driver_id).first()
        if customer:
            driver_name = "Your driver"
            if driver:
                driver_name = f"{driver.first_name} {driver.last_name}".strip() or "Your driver"

            final_price = ride_request.final_price or 0
            send_push_notification(
                user_type="customer",
                user_id=ride_request.customer_id,
                title="Ride Complete!",
                body=f"You've arrived! Total: ${final_price:.2f}. Rate {driver_name} and add a tip.",
                data={
                    "type": "ride_completed",
                    "ride_request_id": str(ride_request.id),
                    "request_id": ride_request.request_id,
                    "final_price": str(final_price),
                    "driver_name": driver_name
                },
                db=db
            )
            logger.info(f"Push notification sent to customer {ride_request.customer_id} - ride completed")
    except Exception as e:
        logger.error(f"Failed to send push notification to customer: {e}")

    return {
        "success": True,
        "message": "Ride completed",
        "ride_request": serialize_ride_request(ride_request),
        "final_price": ride_request.final_price
    }


# =========================================================================
# FARE ESTIMATE ENDPOINTS - Competitive Pricing
# =========================================================================

class FareEstimateInput(BaseModel):
    """Input for fare estimate calculation"""
    pickup_latitude: float
    pickup_longitude: float
    dropoff_latitude: float
    dropoff_longitude: float
    ride_type: str = "standard"


@router.post("/estimate")
async def get_fare_estimate_endpoint(data: FareEstimateInput):
    """
    Get fare estimate with full breakdown and driver suggestions.

    Returns competitive market-rate pricing with:
    - Detailed fare breakdown
    - Platform fee (transparent, $1-3 flat)
    - Suggested bid prices for drivers
    - Driver earnings information
    - Bid comparison labels for customers
    """
    # Calculate distance
    distance_km = calculate_distance_km(
        data.pickup_latitude, data.pickup_longitude,
        data.dropoff_latitude, data.dropoff_longitude
    )

    # Estimate duration
    duration_minutes = estimate_duration_minutes(distance_km)

    # Get full fare estimate
    estimate = get_fare_estimate(
        distance_km=distance_km,
        duration_minutes=duration_minutes
    )

    # Apply ride type multiplier to suggested bids
    multiplier = 1.0
    if data.ride_type == "premium":
        multiplier = 1.5
    elif data.ride_type == "xl":
        multiplier = 1.25

    if multiplier != 1.0:
        estimate["subtotal"] = round(estimate["subtotal"] * multiplier, 2)
        estimate["total"] = round(estimate["total"] * multiplier, 2)
        estimate["driver_info"]["earnings"] = round(estimate["driver_info"]["earnings"] * multiplier, 2)
        for bid in estimate["suggested_bids"]:
            bid["price"] = round(bid["price"] * multiplier, 2)
            bid["driver_earnings"] = round(bid["driver_earnings"] * multiplier, 2)

    estimate["ride_type"] = data.ride_type
    estimate["distance_km"] = round(distance_km, 2)

    return {
        "success": True,
        "estimate": estimate
    }


@router.get("/estimate/bid-label")
async def get_bid_label_endpoint(bid_price: float, fare_estimate: float):
    """
    Get comparison label for a bid price vs fare estimate.

    Returns:
    - label: "Great Deal", "Good Value", "Fair Price", "Above Average", "Premium"
    - description: Explanation of the label
    - color: Suggested UI color (green, blue, orange, gray)
    """
    label_info = get_bid_label(bid_price, fare_estimate)
    return {
        "success": True,
        **label_info
    }


@router.get("/pricing/tiers")
async def get_pricing_tiers():
    """
    Get current pricing tier information.

    Dollor.ai uses flat platform fees ($1-3) instead of percentage-based
    commissions (unlike industry-standard 25-30%).

    This means:
    - Riders pay less
    - Drivers earn more
    - Transparent pricing
    """
    return {
        "success": True,
        "tiers": [
            {
                "tier": 1,
                "fare_range": "Up to $35",
                "platform_fee": 1.00,
                "driver_keeps": "97%+"
            },
            {
                "tier": 2,
                "fare_range": "$35.01 - $70",
                "platform_fee": 2.00,
                "driver_keeps": "97%+"
            },
            {
                "tier": 3,
                "fare_range": "Above $70",
                "platform_fee": 3.00,
                "driver_keeps": "96%+"
            }
        ],
        "comparison": {
            "dollor_ai": {
                "fee_type": "Flat fee ($1-3)",
                "driver_keeps": "96-97%",
                "transparent": True
            },
            "industry_average": {
                "fee_type": "Percentage (25-30%)",
                "driver_keeps": "70-75%",
                "transparent": False
            }
        },
        "messaging": {
            "customer": "Pay fair market rates. 96% goes directly to your driver.",
            "driver": "Keep 96%+ of every fare. No commission cuts. Your price, your earnings."
        }
    }
