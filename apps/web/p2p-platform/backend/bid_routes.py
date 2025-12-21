"""
Ride Bidding API Routes - Matchmaking Platform
Enables price negotiation between riders and drivers
"""

from fastapi import APIRouter, Depends, HTTPException
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
    """Generate unique ride request ID"""
    date_str = datetime.utcnow().strftime("%Y%m%d")
    unique = str(uuid.uuid4())[:6].upper()
    return f"RR-{date_str}-{unique}"


def generate_bid_id():
    """Generate unique bid ID"""
    date_str = datetime.utcnow().strftime("%Y%m%d")
    unique = str(uuid.uuid4())[:6].upper()
    return f"BID-{date_str}-{unique}"


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
    """Calculate suggested price based on distance, duration, and ride type"""
    # Base fare
    base_fare = 2.50

    # Per km rate
    per_km_rate = 1.50
    if ride_type == "premium":
        per_km_rate = 2.50
    elif ride_type == "xl":
        per_km_rate = 2.00

    # Per minute rate (for traffic)
    per_minute_rate = 0.20

    # Calculate
    distance_cost = distance_km * per_km_rate
    time_cost = duration_minutes * per_minute_rate

    suggested = base_fare + distance_cost + time_cost

    # Minimum fare
    min_fare = 5.00
    if ride_type == "premium":
        min_fare = 10.00
    elif ride_type == "xl":
        min_fare = 8.00

    return max(suggested, min_fare)


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
        "bid_count": len(request.bids) if request.bids else 0
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
async def create_ride_request(data: CreateRideRequestInput, db: Session = Depends(get_db)):
    """
    Customer creates a new ride request open for driver bidding
    """
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

    # Create ride request
    ride_request = RideRequest(
        request_id=generate_request_id(),
        customer_id=data.customer_id,
        customer_name=f"{customer.first_name} {customer.last_name}".strip() or customer.email,
        customer_phone=customer.phone,
        pickup_address=data.pickup_address,
        pickup_latitude=data.pickup_latitude,
        pickup_longitude=data.pickup_longitude,
        pickup_place_name=data.pickup_place_name,
        dropoff_address=data.dropoff_address,
        dropoff_latitude=data.dropoff_latitude,
        dropoff_longitude=data.dropoff_longitude,
        dropoff_place_name=data.dropoff_place_name,
        estimated_distance_km=round(distance_km, 2),
        estimated_duration_minutes=duration_minutes,
        ride_type=data.ride_type,
        suggested_price=round(suggested_price, 2),
        customer_max_price=data.customer_max_price,
        customer_preferred_price=data.customer_preferred_price,
        special_requests=data.special_requests,
        status=RideRequestStatus.OPEN,
        bidding_expires_at=datetime.utcnow() + timedelta(minutes=data.bidding_duration_minutes)
    )

    db.add(ride_request)
    db.commit()
    db.refresh(ride_request)

    # TODO: Broadcast to nearby drivers via WebSocket

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

    return {
        "success": True,
        "ride_request": serialize_ride_request(ride_request),
        "bids": [serialize_bid(b) for b in bids],
        "bid_count": len(bids)
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

        # TODO: Send push notification to matched driver
        # TODO: Send WebSocket update to all drivers

        return {
            "success": True,
            "message": f"Bid accepted! Ride matched with {bid.driver_name}",
            "ride_request": serialize_ride_request(ride_request),
            "accepted_bid": serialize_bid(bid)
        }

    elif data.action == "reject":
        bid.status = BidStatus.REJECTED
        bid.rejected_at = now
        bid.responded_at = now
        bid.customer_response = data.message or "Bid rejected by customer"

        db.commit()

        # TODO: Send push notification to driver

        return {
            "success": True,
            "message": "Bid rejected",
            "bid": serialize_bid(bid)
        }

    elif data.action == "counter":
        if not data.counter_price:
            raise HTTPException(status_code=400, detail="Counter price required")

        bid.status = BidStatus.COUNTERED
        bid.responded_at = now
        bid.customer_response = data.message
        bid.customer_counter_price = data.counter_price

        db.commit()

        # TODO: Send push notification to driver with counter-offer

        return {
            "success": True,
            "message": f"Counter-offer of ${data.counter_price:.2f} sent to driver",
            "bid": serialize_bid(bid)
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use: accept, reject, or counter")


@router.post("/request/{request_id}/cancel")
async def cancel_ride_request(request_id: int, db: Session = Depends(get_db)):
    """Customer cancels their ride request"""
    ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_request.status in [RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Cannot cancel ride that is in progress or completed")

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

    return {
        "success": True,
        "message": "Ride request cancelled"
    }


# =========================================================================
# DRIVER ENDPOINTS
# =========================================================================

@router.get("/available")
async def get_available_ride_requests(
    driver_id: int,
    latitude: float,
    longitude: float,
    radius_km: float = 15.0,
    db: Session = Depends(get_db)
):
    """
    Get available ride requests near the driver for bidding
    """
    # Get driver
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Get open ride requests
    now = datetime.utcnow()
    open_requests = db.query(RideRequest).filter(
        and_(
            RideRequest.status == RideRequestStatus.OPEN,
            or_(
                RideRequest.bidding_expires_at > now,
                RideRequest.bidding_expires_at == None
            )
        )
    ).all()

    # Filter by distance from driver
    nearby_requests = []
    for request in open_requests:
        distance = calculate_distance_km(
            latitude, longitude,
            request.pickup_latitude, request.pickup_longitude
        )
        if distance <= radius_km:
            # Check if driver already bid on this request
            existing_bid = db.query(RideBid).filter(
                and_(
                    RideBid.ride_request_id == request.id,
                    RideBid.driver_id == driver_id,
                    RideBid.status.in_([BidStatus.PENDING, BidStatus.COUNTERED])
                )
            ).first()

            request_data = serialize_ride_request(request)
            request_data["distance_to_pickup_km"] = round(distance, 2)
            request_data["already_bid"] = existing_bid is not None
            if existing_bid:
                request_data["my_bid"] = serialize_bid(existing_bid)

            nearby_requests.append(request_data)

    # Sort by distance (closest first)
    nearby_requests.sort(key=lambda x: x["distance_to_pickup_km"])

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

    if ride_request.status != RideRequestStatus.OPEN:
        raise HTTPException(status_code=400, detail=f"Ride request is {ride_request.status.value}, not accepting bids")

    # Check if bidding expired
    if ride_request.bidding_expires_at and datetime.utcnow() > ride_request.bidding_expires_at:
        raise HTTPException(status_code=400, detail="Bidding window has closed")

    # Get driver
    driver = db.query(Driver).filter(Driver.id == data.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

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

    # TODO: Send push notification to customer about new bid
    # TODO: Send WebSocket update

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

    return {
        "success": True,
        "message": "Bid withdrawn"
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

    now = datetime.utcnow()

    # Accept the counter-offer price
    bid.status = BidStatus.ACCEPTED
    bid.proposed_price = bid.customer_counter_price
    bid.is_counter_offer = True
    bid.original_price = bid.proposed_price
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
    db.commit()

    return {
        "success": True,
        "message": "Ride completed",
        "ride_request": serialize_ride_request(ride_request),
        "final_price": ride_request.final_price
    }
