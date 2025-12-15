"""
Dollor.ai - Ride Service
========================

Microservice handling rideshare operations:
- Ride request creation
- Driver matching algorithm
- Ride status management
- Ride cancellation
- Ride history
- Scheduled rides
- Ride sharing (pooling)
- Driver ETA calculation
- Ride fare estimation
- Route optimization

Port: 8014
Error Prefix: RIDE
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List
import math
import random

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum, create_engine, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import enum

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "ride-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8014

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# DATABASE MODELS
# =============================================================================

class RideStatus(enum.Enum):
    REQUESTED = "requested"
    SEARCHING = "searching"
    ACCEPTED = "accepted"
    DRIVER_ARRIVING = "driver_arriving"
    DRIVER_ARRIVED = "driver_arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CANCELLED_BY_DRIVER = "cancelled_by_driver"


class RideType(enum.Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    XL = "xl"
    SHARED = "shared"


class CancellationReason(enum.Enum):
    CUSTOMER_REQUEST = "customer_request"
    DRIVER_REQUEST = "driver_request"
    NO_DRIVER_FOUND = "no_driver_found"
    PAYMENT_FAILED = "payment_failed"
    SYSTEM_ERROR = "system_error"
    OTHER = "other"


class Ride(Base):
    """Ride requests and tracking"""
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(String(50), unique=True, nullable=False, index=True)

    # Customer
    customer_id = Column(Integer, index=True)
    customer_name = Column(String(255))
    customer_phone = Column(String(50))

    # Driver (assigned when accepted)
    driver_id = Column(Integer, index=True, nullable=True)
    driver_name = Column(String(255))
    driver_phone = Column(String(50))
    driver_photo_url = Column(String(500))
    driver_rating = Column(Float)

    # Vehicle Info
    vehicle_make = Column(String(100))
    vehicle_model = Column(String(100))
    vehicle_color = Column(String(50))
    vehicle_plate = Column(String(20))

    # Ride Details
    ride_type = Column(SQLEnum(RideType), default=RideType.STANDARD)
    status = Column(SQLEnum(RideStatus), default=RideStatus.REQUESTED)

    # Pickup Location
    pickup_address = Column(String(500))
    pickup_latitude = Column(Float)
    pickup_longitude = Column(Float)
    pickup_instructions = Column(Text)

    # Dropoff Location
    dropoff_address = Column(String(500))
    dropoff_latitude = Column(Float)
    dropoff_longitude = Column(Float)
    dropoff_instructions = Column(Text)

    # Scheduling
    is_scheduled = Column(Boolean, default=False)
    scheduled_pickup_time = Column(DateTime, nullable=True)

    # Pooling
    is_shared = Column(Boolean, default=False)
    shared_ride_group_id = Column(String(50), nullable=True)
    max_passengers = Column(Integer, default=1)
    current_passengers = Column(Integer, default=1)

    # Distance and Time
    estimated_distance_km = Column(Float)
    estimated_duration_min = Column(Integer)
    actual_distance_km = Column(Float, nullable=True)
    actual_duration_min = Column(Integer, nullable=True)

    # Pricing
    base_fare = Column(Float)
    distance_fare = Column(Float)
    time_fare = Column(Float)
    surge_multiplier = Column(Float, default=1.0)
    discount_amount = Column(Float, default=0.0)
    tip_amount = Column(Float, default=0.0)
    total_fare = Column(Float)
    currency = Column(String(3), default="USD")

    # Driver ETA
    driver_eta_minutes = Column(Integer, nullable=True)
    driver_current_latitude = Column(Float, nullable=True)
    driver_current_longitude = Column(Float, nullable=True)

    # Route
    route_polyline = Column(Text, nullable=True)  # Encoded polyline
    waypoints = Column(JSON, nullable=True)  # For shared rides

    # Timing
    requested_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    driver_arrived_at = Column(DateTime, nullable=True)
    pickup_at = Column(DateTime, nullable=True)
    dropoff_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Cancellation
    cancellation_reason = Column(String(100), nullable=True)
    cancellation_notes = Column(Text, nullable=True)
    cancelled_by = Column(String(50), nullable=True)  # customer, driver, system

    # Payment
    payment_method_id = Column(String(100))
    payment_status = Column(String(50), default="pending")
    payment_transaction_id = Column(String(100), nullable=True)

    # Rating
    customer_rating = Column(Float, nullable=True)
    customer_feedback = Column(Text, nullable=True)
    driver_rating_for_customer = Column(Float, nullable=True)

    # Metadata
    promo_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduledRide(Base):
    """Scheduled rides for future pickup"""
    __tablename__ = "scheduled_rides"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(String(50), unique=True, index=True)

    customer_id = Column(Integer, index=True)
    scheduled_time = Column(DateTime, index=True)

    pickup_address = Column(String(500))
    pickup_latitude = Column(Float)
    pickup_longitude = Column(Float)

    dropoff_address = Column(String(500))
    dropoff_latitude = Column(Float)
    dropoff_longitude = Column(Float)

    ride_type = Column(SQLEnum(RideType))
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)  # daily, weekly, etc

    status = Column(String(50), default="scheduled")  # scheduled, confirmed, cancelled

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RidePool(Base):
    """Shared ride pools"""
    __tablename__ = "ride_pools"

    id = Column(Integer, primary_key=True, index=True)
    pool_id = Column(String(50), unique=True, index=True)

    driver_id = Column(Integer, index=True)
    vehicle_capacity = Column(Integer, default=4)
    current_passengers = Column(Integer, default=0)

    status = Column(String(50), default="active")  # active, full, completed

    # Route optimization
    optimized_route = Column(JSON)  # Array of waypoints
    total_distance_km = Column(Float)
    estimated_duration_min = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class Location(BaseModel):
    address: str
    latitude: float
    longitude: float
    instructions: Optional[str] = None


class RideRequest(BaseModel):
    customer_id: int
    customer_name: str
    customer_phone: str
    pickup: Location
    dropoff: Location
    ride_type: str = "standard"
    payment_method_id: str
    is_scheduled: bool = False
    scheduled_time: Optional[datetime] = None
    is_shared: bool = False
    max_passengers: int = 1
    promo_code: Optional[str] = None
    notes: Optional[str] = None


class RideResponse(BaseModel):
    id: int
    ride_id: str
    customer_id: int
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_rating: Optional[float] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_plate: Optional[str] = None
    ride_type: str
    status: str
    pickup_address: str
    pickup_latitude: float
    pickup_longitude: float
    dropoff_address: str
    dropoff_latitude: float
    dropoff_longitude: float
    estimated_distance_km: Optional[float] = None
    estimated_duration_min: Optional[int] = None
    driver_eta_minutes: Optional[int] = None
    total_fare: Optional[float] = None
    currency: str = "USD"
    requested_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FareEstimate(BaseModel):
    ride_type: str
    distance_km: float
    duration_min: int
    base_fare: float
    distance_fare: float
    time_fare: float
    surge_multiplier: float
    subtotal: float
    discount: float
    total: float
    currency: str = "USD"


class DriverLocation(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    heading: Optional[float] = None


class RideCancellation(BaseModel):
    reason: str
    notes: Optional[str] = None


class RideRating(BaseModel):
    rating: float
    feedback: Optional[str] = None


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Rideshare operations and driver matching service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_ride_id(db: Session) -> str:
    """Generate unique ride ID"""
    while True:
        ride_id = f"RIDE-{random.randint(100000, 999999)}"
        existing = db.query(Ride).filter(Ride.ride_id == ride_id).first()
        if not existing:
            return ride_id


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


def estimate_duration(distance_km: float) -> int:
    """
    Estimate ride duration in minutes based on distance.
    Assumes average speed of 40 km/h in city traffic.
    """
    average_speed = 40  # km/h
    hours = distance_km / average_speed
    minutes = hours * 60
    return max(int(minutes), 5)  # Minimum 5 minutes


def calculate_fare(
    distance_km: float,
    duration_min: int,
    ride_type: str,
    surge_multiplier: float = 1.0
) -> dict:
    """
    Calculate ride fare based on distance, time, and ride type.

    Pricing structure:
    - Standard: $2.50 base + $1.20/km + $0.30/min
    - Premium: $5.00 base + $2.00/km + $0.50/min
    - XL: $4.00 base + $1.80/km + $0.40/min
    - Shared: $1.50 base + $0.80/km + $0.20/min
    """
    pricing = {
        "standard": {"base": 2.50, "per_km": 1.20, "per_min": 0.30},
        "premium": {"base": 5.00, "per_km": 2.00, "per_min": 0.50},
        "xl": {"base": 4.00, "per_km": 1.80, "per_min": 0.40},
        "shared": {"base": 1.50, "per_km": 0.80, "per_min": 0.20},
    }

    rates = pricing.get(ride_type.lower(), pricing["standard"])

    base_fare = rates["base"]
    distance_fare = distance_km * rates["per_km"]
    time_fare = duration_min * rates["per_min"]

    subtotal = (base_fare + distance_fare + time_fare) * surge_multiplier

    return {
        "base_fare": round(base_fare, 2),
        "distance_fare": round(distance_fare, 2),
        "time_fare": round(time_fare, 2),
        "surge_multiplier": surge_multiplier,
        "subtotal": round(subtotal, 2),
    }


def get_current_surge_multiplier() -> float:
    """
    Get current surge pricing multiplier.
    In production, this would check real-time demand/supply.
    """
    # For demo, return random surge between 1.0 and 2.0
    return round(random.uniform(1.0, 1.5), 2)


def find_available_driver(
    pickup_lat: float,
    pickup_lon: float,
    ride_type: str,
    db: Session
) -> Optional[dict]:
    """
    Find available driver near pickup location.
    In production, this would query driver-service for available drivers.

    For now, returns mock driver data.
    """
    # Mock driver data
    drivers = [
        {
            "driver_id": 1,
            "driver_name": "John Smith",
            "driver_phone": "+1234567890",
            "driver_photo_url": "https://example.com/drivers/1.jpg",
            "driver_rating": 4.8,
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_color": "Black",
            "vehicle_plate": "ABC123",
            "latitude": pickup_lat + 0.01,
            "longitude": pickup_lon + 0.01,
        },
        {
            "driver_id": 2,
            "driver_name": "Sarah Johnson",
            "driver_phone": "+1234567891",
            "driver_photo_url": "https://example.com/drivers/2.jpg",
            "driver_rating": 4.9,
            "vehicle_make": "Honda",
            "vehicle_model": "Accord",
            "vehicle_color": "Silver",
            "vehicle_plate": "XYZ789",
            "latitude": pickup_lat + 0.02,
            "longitude": pickup_lon + 0.02,
        },
    ]

    # Simulate 80% success rate
    if random.random() < 0.8:
        driver = random.choice(drivers)
        # Calculate ETA
        distance = calculate_distance(
            pickup_lat, pickup_lon,
            driver["latitude"], driver["longitude"]
        )
        driver["eta_minutes"] = max(int(distance * 2), 3)  # Rough ETA
        return driver

    return None


# =============================================================================
# FARE ESTIMATION ENDPOINTS
# =============================================================================

@app.post("/api/rides/estimate-fare", response_model=FareEstimate)
async def estimate_fare(
    pickup_lat: float = Query(...),
    pickup_lon: float = Query(...),
    dropoff_lat: float = Query(...),
    dropoff_lon: float = Query(...),
    ride_type: str = Query(default="standard"),
    promo_code: Optional[str] = Query(default=None),
):
    """Estimate fare for a ride"""
    # Calculate distance and duration
    distance_km = calculate_distance(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    duration_min = estimate_duration(distance_km)

    # Get surge multiplier
    surge_multiplier = get_current_surge_multiplier()

    # Calculate fare
    fare = calculate_fare(distance_km, duration_min, ride_type, surge_multiplier)

    # Apply promo code discount (mock)
    discount = 0.0
    if promo_code:
        discount = fare["subtotal"] * 0.10  # 10% discount

    total = fare["subtotal"] - discount

    return FareEstimate(
        ride_type=ride_type,
        distance_km=round(distance_km, 2),
        duration_min=duration_min,
        base_fare=fare["base_fare"],
        distance_fare=fare["distance_fare"],
        time_fare=fare["time_fare"],
        surge_multiplier=fare["surge_multiplier"],
        subtotal=fare["subtotal"],
        discount=round(discount, 2),
        total=round(total, 2),
    )


# =============================================================================
# RIDE REQUEST ENDPOINTS
# =============================================================================

@app.post("/api/rides", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def create_ride(ride_request: RideRequest, db: Session = Depends(get_db)):
    """Create a new ride request"""

    # Calculate distance and duration
    distance_km = calculate_distance(
        ride_request.pickup.latitude,
        ride_request.pickup.longitude,
        ride_request.dropoff.latitude,
        ride_request.dropoff.longitude
    )
    duration_min = estimate_duration(distance_km)

    # Get surge multiplier
    surge_multiplier = get_current_surge_multiplier()

    # Calculate fare
    fare = calculate_fare(distance_km, duration_min, ride_request.ride_type, surge_multiplier)

    # Apply promo code discount
    discount = 0.0
    if ride_request.promo_code:
        discount = fare["subtotal"] * 0.10

    total_fare = fare["subtotal"] - discount

    # Create ride
    ride = Ride(
        ride_id=generate_ride_id(db),
        customer_id=ride_request.customer_id,
        customer_name=ride_request.customer_name,
        customer_phone=ride_request.customer_phone,
        ride_type=RideType[ride_request.ride_type.upper()],
        status=RideStatus.REQUESTED if not ride_request.is_scheduled else RideStatus.REQUESTED,
        pickup_address=ride_request.pickup.address,
        pickup_latitude=ride_request.pickup.latitude,
        pickup_longitude=ride_request.pickup.longitude,
        pickup_instructions=ride_request.pickup.instructions,
        dropoff_address=ride_request.dropoff.address,
        dropoff_latitude=ride_request.dropoff.latitude,
        dropoff_longitude=ride_request.dropoff.longitude,
        dropoff_instructions=ride_request.dropoff.instructions,
        is_scheduled=ride_request.is_scheduled,
        scheduled_pickup_time=ride_request.scheduled_time,
        is_shared=ride_request.is_shared,
        max_passengers=ride_request.max_passengers,
        estimated_distance_km=round(distance_km, 2),
        estimated_duration_min=duration_min,
        base_fare=fare["base_fare"],
        distance_fare=fare["distance_fare"],
        time_fare=fare["time_fare"],
        surge_multiplier=surge_multiplier,
        discount_amount=round(discount, 2),
        total_fare=round(total_fare, 2),
        payment_method_id=ride_request.payment_method_id,
        promo_code=ride_request.promo_code,
        notes=ride_request.notes,
    )

    db.add(ride)
    db.commit()
    db.refresh(ride)

    # If not scheduled, try to find a driver immediately
    if not ride_request.is_scheduled:
        driver = find_available_driver(
            ride_request.pickup.latitude,
            ride_request.pickup.longitude,
            ride_request.ride_type,
            db
        )

        if driver:
            # Assign driver
            ride.status = RideStatus.ACCEPTED
            ride.driver_id = driver["driver_id"]
            ride.driver_name = driver["driver_name"]
            ride.driver_phone = driver["driver_phone"]
            ride.driver_photo_url = driver["driver_photo_url"]
            ride.driver_rating = driver["driver_rating"]
            ride.vehicle_make = driver["vehicle_make"]
            ride.vehicle_model = driver["vehicle_model"]
            ride.vehicle_color = driver["vehicle_color"]
            ride.vehicle_plate = driver["vehicle_plate"]
            ride.driver_eta_minutes = driver["eta_minutes"]
            ride.driver_current_latitude = driver["latitude"]
            ride.driver_current_longitude = driver["longitude"]
            ride.accepted_at = datetime.utcnow()
            db.commit()
            db.refresh(ride)

            logger.info(f"Ride {ride.ride_id} accepted by driver {driver['driver_id']}")
        else:
            ride.status = RideStatus.SEARCHING
            db.commit()
            db.refresh(ride)
            logger.info(f"Ride {ride.ride_id} searching for driver")

    logger.info(f"Created ride: {ride.ride_id}")
    return ride


@app.get("/api/rides/{ride_id}", response_model=RideResponse)
async def get_ride(ride_id: str, db: Session = Depends(get_db)):
    """Get ride details"""
    ride = db.query(Ride).filter(Ride.ride_id == ride_id).first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RIDE-301",
                message="Ride not found",
                details={"ride_id": ride_id}
            ).model_dump()
        )

    return ride


@app.get("/api/rides/customer/{customer_id}", response_model=List[RideResponse])
async def get_customer_rides(
    customer_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get rides for a customer"""
    query = db.query(Ride).filter(Ride.customer_id == customer_id)

    if status:
        query = query.filter(Ride.status == status)

    rides = query.order_by(Ride.created_at.desc()).offset(offset).limit(limit).all()
    return rides


@app.get("/api/rides/driver/{driver_id}", response_model=List[RideResponse])
async def get_driver_rides(
    driver_id: int,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get rides for a driver"""
    query = db.query(Ride).filter(Ride.driver_id == driver_id)

    if status:
        query = query.filter(Ride.status == status)

    rides = query.order_by(Ride.created_at.desc()).offset(offset).limit(limit).all()
    return rides


# =============================================================================
# RIDE STATUS ENDPOINTS
# =============================================================================

@app.put("/api/rides/{ride_id}/status")
async def update_ride_status(
    ride_id: str,
    new_status: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Update ride status"""
    ride = db.query(Ride).filter(Ride.ride_id == ride_id).first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RIDE-301",
                message="Ride not found",
                details={"ride_id": ride_id}
            ).model_dump()
        )

    # Validate status transition
    valid_transitions = {
        "requested": ["searching", "accepted", "cancelled"],
        "searching": ["accepted", "cancelled"],
        "accepted": ["driver_arriving", "cancelled", "cancelled_by_driver"],
        "driver_arriving": ["driver_arrived", "cancelled", "cancelled_by_driver"],
        "driver_arrived": ["in_progress", "cancelled", "cancelled_by_driver"],
        "in_progress": ["completed"],
        "completed": [],
        "cancelled": [],
        "cancelled_by_driver": [],
    }

    current_status = ride.status.value
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RIDE-401",
                message=f"Invalid status transition from {current_status} to {new_status}",
                details={"current_status": current_status, "new_status": new_status}
            ).model_dump()
        )

    # Update status
    ride.status = RideStatus[new_status.upper()]

    # Update timestamps based on status
    now = datetime.utcnow()
    if new_status == "accepted":
        ride.accepted_at = now
    elif new_status == "driver_arrived":
        ride.driver_arrived_at = now
    elif new_status == "in_progress":
        ride.pickup_at = now
    elif new_status == "completed":
        ride.completed_at = now
        ride.dropoff_at = now

        # Calculate actual duration
        if ride.pickup_at:
            duration = (now - ride.pickup_at).total_seconds() / 60
            ride.actual_duration_min = int(duration)

    # Update driver location if provided
    if latitude and longitude:
        ride.driver_current_latitude = latitude
        ride.driver_current_longitude = longitude

        # Recalculate ETA if driver is arriving
        if new_status in ["driver_arriving", "driver_arrived"]:
            distance = calculate_distance(
                latitude, longitude,
                ride.pickup_latitude, ride.pickup_longitude
            )
            ride.driver_eta_minutes = max(int(distance * 2), 1)

    ride.updated_at = now
    db.commit()
    db.refresh(ride)

    logger.info(f"Updated ride {ride_id} status to {new_status}")

    return {
        "ride_id": ride_id,
        "status": new_status,
        "updated_at": now.isoformat()
    }


@app.put("/api/rides/{ride_id}/driver-location")
async def update_driver_location(
    ride_id: str,
    location: DriverLocation,
    db: Session = Depends(get_db)
):
    """Update driver's current location"""
    ride = db.query(Ride).filter(Ride.ride_id == ride_id).first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RIDE-301",
                message="Ride not found",
                details={"ride_id": ride_id}
            ).model_dump()
        )

    # Update location
    ride.driver_current_latitude = location.latitude
    ride.driver_current_longitude = location.longitude

    # Recalculate ETA based on current status
    if ride.status in [RideStatus.ACCEPTED, RideStatus.DRIVER_ARRIVING]:
        distance = calculate_distance(
            location.latitude, location.longitude,
            ride.pickup_latitude, ride.pickup_longitude
        )
        ride.driver_eta_minutes = max(int(distance * 2), 1)

    ride.updated_at = datetime.utcnow()
    db.commit()

    return {
        "ride_id": ride_id,
        "driver_eta_minutes": ride.driver_eta_minutes,
        "updated_at": ride.updated_at.isoformat()
    }


# =============================================================================
# RIDE CANCELLATION ENDPOINTS
# =============================================================================

@app.post("/api/rides/{ride_id}/cancel")
async def cancel_ride(
    ride_id: str,
    cancellation: RideCancellation,
    cancelled_by: str = Query(...),  # customer, driver, system
    db: Session = Depends(get_db)
):
    """Cancel a ride"""
    ride = db.query(Ride).filter(Ride.ride_id == ride_id).first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RIDE-301",
                message="Ride not found",
                details={"ride_id": ride_id}
            ).model_dump()
        )

    # Check if ride can be cancelled
    if ride.status in [RideStatus.COMPLETED, RideStatus.CANCELLED, RideStatus.CANCELLED_BY_DRIVER]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RIDE-402",
                message="Ride cannot be cancelled",
                details={"status": ride.status.value}
            ).model_dump()
        )

    # Update ride
    if cancelled_by == "driver":
        ride.status = RideStatus.CANCELLED_BY_DRIVER
    else:
        ride.status = RideStatus.CANCELLED

    ride.cancelled_at = datetime.utcnow()
    ride.cancelled_by = cancelled_by
    ride.cancellation_reason = cancellation.reason
    ride.cancellation_notes = cancellation.notes
    ride.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(ride)

    logger.info(f"Cancelled ride {ride_id} by {cancelled_by}")

    return {
        "ride_id": ride_id,
        "status": ride.status.value,
        "cancelled_by": cancelled_by,
        "cancelled_at": ride.cancelled_at.isoformat()
    }


# =============================================================================
# RIDE RATING ENDPOINTS
# =============================================================================

@app.post("/api/rides/{ride_id}/rate")
async def rate_ride(
    ride_id: str,
    rating: RideRating,
    rated_by: str = Query(...),  # customer or driver
    db: Session = Depends(get_db)
):
    """Rate a completed ride"""
    ride = db.query(Ride).filter(Ride.ride_id == ride_id).first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RIDE-301",
                message="Ride not found",
                details={"ride_id": ride_id}
            ).model_dump()
        )

    if ride.status != RideStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RIDE-403",
                message="Can only rate completed rides",
                details={"status": ride.status.value}
            ).model_dump()
        )

    # Validate rating
    if rating.rating < 1.0 or rating.rating > 5.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RIDE-101",
                message="Rating must be between 1.0 and 5.0",
                details={"rating": rating.rating}
            ).model_dump()
        )

    # Update rating
    if rated_by == "customer":
        ride.customer_rating = rating.rating
        ride.customer_feedback = rating.feedback
    else:
        ride.driver_rating_for_customer = rating.rating

    ride.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Ride {ride_id} rated {rating.rating} by {rated_by}")

    return {
        "ride_id": ride_id,
        "rating": rating.rating,
        "rated_by": rated_by
    }


# =============================================================================
# SCHEDULED RIDES ENDPOINTS
# =============================================================================

@app.get("/api/rides/scheduled/customer/{customer_id}")
async def get_scheduled_rides(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """Get scheduled rides for a customer"""
    rides = db.query(Ride).filter(
        Ride.customer_id == customer_id,
        Ride.is_scheduled == True,
        Ride.status.in_([RideStatus.REQUESTED, RideStatus.SEARCHING])
    ).order_by(Ride.scheduled_pickup_time).all()

    return rides


# =============================================================================
# RIDE STATISTICS ENDPOINTS
# =============================================================================

@app.get("/api/rides/stats/customer/{customer_id}")
async def get_customer_ride_stats(customer_id: int, db: Session = Depends(get_db)):
    """Get ride statistics for a customer"""
    from sqlalchemy import func

    total_rides = db.query(func.count(Ride.id)).filter(
        Ride.customer_id == customer_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0

    total_spent = db.query(func.sum(Ride.total_fare)).filter(
        Ride.customer_id == customer_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0.0

    total_distance = db.query(func.sum(Ride.actual_distance_km)).filter(
        Ride.customer_id == customer_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0.0

    avg_rating = db.query(func.avg(Ride.customer_rating)).filter(
        Ride.customer_id == customer_id,
        Ride.customer_rating.isnot(None)
    ).scalar() or 0.0

    return {
        "customer_id": customer_id,
        "total_rides": total_rides,
        "total_spent": round(float(total_spent), 2),
        "total_distance_km": round(float(total_distance), 2),
        "average_rating": round(float(avg_rating), 2) if avg_rating else None
    }


@app.get("/api/rides/stats/driver/{driver_id}")
async def get_driver_ride_stats(driver_id: int, db: Session = Depends(get_db)):
    """Get ride statistics for a driver"""
    from sqlalchemy import func

    total_rides = db.query(func.count(Ride.id)).filter(
        Ride.driver_id == driver_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0

    total_earnings = db.query(func.sum(Ride.total_fare)).filter(
        Ride.driver_id == driver_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0.0

    total_distance = db.query(func.sum(Ride.actual_distance_km)).filter(
        Ride.driver_id == driver_id,
        Ride.status == RideStatus.COMPLETED
    ).scalar() or 0.0

    avg_rating = db.query(func.avg(Ride.driver_rating_for_customer)).filter(
        Ride.driver_id == driver_id,
        Ride.driver_rating_for_customer.isnot(None)
    ).scalar() or 0.0

    cancellation_rate = db.query(func.count(Ride.id)).filter(
        Ride.driver_id == driver_id,
        Ride.status == RideStatus.CANCELLED_BY_DRIVER
    ).scalar() or 0

    return {
        "driver_id": driver_id,
        "total_rides": total_rides,
        "total_earnings": round(float(total_earnings), 2),
        "total_distance_km": round(float(total_distance), 2),
        "average_rating": round(float(avg_rating), 2) if avg_rating else None,
        "cancellations": cancellation_rate
    }


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
