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
# PLATFORM FEE CONFIGURATION - TIERED DISTANCE-BASED PRICING
# =============================================================================
# Dollor.ai Matchmaking Platform - Tiered Distance Pricing
# Both rider AND driver pay the SAME fee based on trip distance:
#   - Trips 0-10 miles:   $1
#   - Trips 10-20 miles:  $2
#   - Trips 20+ miles:    $3
#
# Distance tier thresholds (in miles)
DISTANCE_TIER_1_MAX = 10.0   # Trips up to 10 miles
DISTANCE_TIER_2_MAX = 20.0   # Trips 10.01 to 20 miles
# Tier 3: Trips above 20 miles

# Platform fees per distance tier
DISTANCE_TIER_1_FEE = 1.00   # $1 for trips ≤ 10 miles
DISTANCE_TIER_2_FEE = 2.00   # $2 for trips 10.01-20 miles
DISTANCE_TIER_3_FEE = 3.00   # $3 for trips > 20 miles


def calculate_platform_fee(distance_km: float) -> float:
    """
    Calculate platform fee based on trip distance (TIERED).

    Pricing Model (Distance-Based Tiers):
    - Trips 0-10 miles:   $1
    - Trips 10-20 miles:  $2
    - Trips 20+ miles:    $3

    Both rider AND driver pay this same fee amount.

    Args:
        distance_km: Trip distance in kilometers

    Returns:
        Platform fee amount
    """
    # Convert km to miles (1 km = 0.621371 miles)
    distance_miles = distance_km * 0.621371

    # Apply tiered pricing based on distance
    if distance_miles <= DISTANCE_TIER_1_MAX:
        return DISTANCE_TIER_1_FEE
    elif distance_miles <= DISTANCE_TIER_2_MAX:
        return DISTANCE_TIER_2_FEE
    else:
        return DISTANCE_TIER_3_FEE


def get_distance_tier(distance_miles: float) -> int:
    """Get the tier number based on trip distance."""
    if distance_miles <= DISTANCE_TIER_1_MAX:
        return 1
    elif distance_miles <= DISTANCE_TIER_2_MAX:
        return 2
    else:
        return 3


def get_platform_fee_description(distance_miles: float) -> str:
    """Get human-readable description of platform fee."""
    tier = get_distance_tier(distance_miles)
    fee = calculate_platform_fee(distance_miles / 0.621371)  # Convert to km for function
    return f"${fee:.2f} (Tier {tier}: {'≤10' if tier == 1 else '10-20' if tier == 2 else '>20'} miles)"

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


class VehicleType(enum.Enum):
    """Vehicle types available for rides - requires valid registration"""
    CAR = "car"           # Requires: Valid registration, insurance, inspection
    SUV = "suv"           # Requires: Valid registration, insurance, inspection
    VAN = "van"           # Requires: Valid registration, insurance, inspection, commercial if 9+ seats
    MOTORCYCLE = "motorcycle"  # Requires: Valid registration, motorcycle license endorsement
    BICYCLE = "bicycle"   # No vehicle registration required
    ELECTRIC = "electric"  # Requires: Valid registration, insurance


class DriverLicenseStatus(enum.Enum):
    """Driver license verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class VehicleRegistrationStatus(enum.Enum):
    """Vehicle registration verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    REJECTED = "rejected"


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
    platform_fee = Column(Float, default=1.0)  # $1 per 10 miles, min $1
    driver_platform_fee = Column(Float, default=1.0)  # Driver pays same rate
    driver_earnings = Column(Float, default=0.0)  # Fare - platform fee
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


class DriverVerification(Base):
    """
    Driver verification records - LEGAL COMPLIANCE

    All rideshare drivers must be verified before accepting rides.
    This includes license, vehicle registration, insurance, and background check.

    MATCHMAKING DISCLAIMER: Dollor.ai facilitates connections between riders
    and independent driver partners. Drivers are independent contractors
    responsible for maintaining their own compliance with local regulations.
    """
    __tablename__ = "driver_verifications"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, unique=True, index=True)

    # Driver License
    license_number = Column(String(50))
    license_state = Column(String(10))
    license_expiry = Column(DateTime)
    license_class = Column(String(20))  # A, B, C, CDL, etc.
    license_status = Column(SQLEnum(DriverLicenseStatus), default=DriverLicenseStatus.PENDING)
    license_verified_at = Column(DateTime, nullable=True)

    # Vehicle Registration
    vehicle_registration_number = Column(String(50))
    vehicle_registration_state = Column(String(10))
    vehicle_registration_expiry = Column(DateTime)
    vehicle_vin = Column(String(20))  # Vehicle Identification Number
    vehicle_type = Column(SQLEnum(VehicleType), default=VehicleType.CAR)
    registration_status = Column(SQLEnum(VehicleRegistrationStatus), default=VehicleRegistrationStatus.PENDING)
    registration_verified_at = Column(DateTime, nullable=True)

    # Insurance
    insurance_provider = Column(String(100))
    insurance_policy_number = Column(String(50))
    insurance_expiry = Column(DateTime)
    insurance_coverage_amount = Column(Float)  # Minimum varies by state
    insurance_verified = Column(Boolean, default=False)
    insurance_verified_at = Column(DateTime, nullable=True)

    # Background Check
    background_check_consent = Column(Boolean, default=False)
    background_check_date = Column(DateTime, nullable=True)
    background_check_passed = Column(Boolean, nullable=True)
    background_check_provider = Column(String(100), nullable=True)

    # Overall Status
    is_eligible_to_drive = Column(Boolean, default=False)
    eligibility_notes = Column(Text, nullable=True)

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
    # Pricing with platform fees
    base_fare: Optional[float] = None
    distance_fare: Optional[float] = None
    time_fare: Optional[float] = None
    platform_fee: Optional[float] = 1.0  # $1 per 10 miles, min $1
    driver_platform_fee: Optional[float] = 1.0  # Driver pays same rate
    driver_earnings: Optional[float] = None  # Driver's take-home
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
    distance_miles: float = 0.0  # Distance in miles for platform fee calculation
    duration_min: int
    base_fare: float
    distance_fare: float
    time_fare: float
    surge_multiplier: float
    subtotal: float
    platform_fee: float = 0.0  # Platform fee (tiered by distance)
    driver_platform_fee: float = 0.0  # Driver pays same platform fee
    driver_earnings: float = 0.0  # Driver's take-home (subtotal - driver_platform_fee)
    discount: float
    total: float  # Rider pays: subtotal + platform_fee - discount
    currency: str = "USD"
    platform_fee_description: str = "$1 (≤10mi) / $2 (10-20mi) / $3 (>20mi)"
    distance_tier: int = 1  # Distance tier (1, 2, or 3)


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


class RideUpdate(BaseModel):
    """Model for updating ride details"""
    status: Optional[str] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    # Vehicle info (requires verified registration)
    vehicle_plate: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_type: Optional[str] = None
    # Driver verification status
    driver_license_verified: Optional[bool] = None
    vehicle_registration_verified: Optional[bool] = None
    insurance_verified: Optional[bool] = None
    # Real-time location
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    estimated_arrival_minutes: Optional[int] = None
    notes: Optional[str] = None


class DriverVerificationRequest(BaseModel):
    """
    Request model for driver verification - LEGAL REQUIREMENTS

    All rideshare drivers MUST provide:
    1. Valid government-issued driver's license
    2. Vehicle registration in their name or authorized use
    3. Valid auto insurance meeting state minimums
    4. Background check consent
    """
    driver_id: int
    # License info
    license_number: str
    license_state: str
    license_expiry: str  # ISO format date
    license_class: str  # A, B, C, CDL, etc.
    # Vehicle registration
    vehicle_registration_number: str
    vehicle_registration_state: str
    vehicle_registration_expiry: str  # ISO format date
    vehicle_vin: str  # Vehicle Identification Number
    # Insurance
    insurance_provider: str
    insurance_policy_number: str
    insurance_expiry: str  # ISO format date
    insurance_coverage_amount: float  # Minimum required varies by state
    # Background check
    background_check_consent: bool
    background_check_date: Optional[str] = None


class DriverComplianceStatus(BaseModel):
    """Driver legal compliance status"""
    driver_id: int
    license_status: str  # DriverLicenseStatus value
    license_expiry: Optional[str] = None
    vehicle_registration_status: str  # VehicleRegistrationStatus value
    vehicle_registration_expiry: Optional[str] = None
    insurance_status: str
    insurance_expiry: Optional[str] = None
    background_check_status: str
    background_check_date: Optional[str] = None
    is_eligible_to_drive: bool  # True only if ALL requirements met
    compliance_notes: Optional[str] = None


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

    Pricing structure (driver earns this):
    - Standard: $2.50 base + $1.20/km + $0.30/min
    - Premium: $5.00 base + $2.00/km + $0.50/min
    - XL: $4.00 base + $1.80/km + $0.40/min
    - Shared: $1.50 base + $0.80/km + $0.20/min

    Platform Fee (Dollor.ai Matchmaking Model):
    - $1 per 10 miles ($0.10/mile), minimum $1
    - Both rider AND driver pay this fee
    - Driver earnings = subtotal - platform_fee
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

    # Calculate distance-based platform fee ($1 per 10 miles)
    platform_fee = calculate_platform_fee(distance_km)

    # Driver earns subtotal minus their platform fee
    driver_earnings = subtotal - platform_fee

    # Convert km to miles for display
    distance_miles = distance_km * 0.621371

    return {
        "base_fare": round(base_fare, 2),
        "distance_fare": round(distance_fare, 2),
        "time_fare": round(time_fare, 2),
        "surge_multiplier": surge_multiplier,
        "subtotal": round(subtotal, 2),
        "platform_fee": round(platform_fee, 2),
        "driver_platform_fee": round(platform_fee, 2),  # Driver pays same rate
        "driver_earnings": round(driver_earnings, 2),
        "distance_miles": round(distance_miles, 2),
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
    """
    Estimate fare for a ride.

    Dollor.ai Matchmaking Platform Pricing:
    - Fare goes to driver (based on distance/time/ride type)
    - Platform fee: $1 per 10 miles (minimum $1) - rider pays this
    - Driver also pays $1 per 10 miles platform fee (deducted from earnings)
    - 100% of tips go directly to driver
    """
    # Calculate distance and duration
    distance_km = calculate_distance(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    duration_min = estimate_duration(distance_km)

    # Get surge multiplier
    surge_multiplier = get_current_surge_multiplier()

    # Calculate fare (includes platform fee calculation)
    fare = calculate_fare(distance_km, duration_min, ride_type, surge_multiplier)

    # Apply promo code discount (mock)
    discount = 0.0
    if promo_code:
        discount = fare["subtotal"] * 0.10  # 10% discount

    # Rider pays: subtotal + platform_fee - discount
    total = fare["subtotal"] + fare["platform_fee"] - discount

    # Get tier info for display
    distance_tier = get_distance_tier(fare["distance_miles"])
    tier_desc = "≤10mi" if distance_tier == 1 else "10-20mi" if distance_tier == 2 else ">20mi"

    return FareEstimate(
        ride_type=ride_type,
        distance_km=round(distance_km, 2),
        distance_miles=fare["distance_miles"],
        duration_min=duration_min,
        base_fare=fare["base_fare"],
        distance_fare=fare["distance_fare"],
        time_fare=fare["time_fare"],
        surge_multiplier=fare["surge_multiplier"],
        subtotal=fare["subtotal"],
        platform_fee=fare["platform_fee"],
        driver_platform_fee=fare["driver_platform_fee"],
        driver_earnings=fare["driver_earnings"],
        discount=round(discount, 2),
        total=round(total, 2),
        platform_fee_description=f"${fare['platform_fee']:.2f} platform fee (Tier {distance_tier}: {tier_desc})",
        distance_tier=distance_tier
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

    # Rider pays: subtotal + platform_fee - discount
    total_fare = fare["subtotal"] + fare["platform_fee"] - discount

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
        platform_fee=fare["platform_fee"],
        driver_platform_fee=fare["driver_platform_fee"],
        driver_earnings=fare["driver_earnings"],
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
# DRIVER VERIFICATION ENDPOINTS
# =============================================================================

@app.post("/api/drivers/verification")
async def submit_driver_verification(
    verification: DriverVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Submit driver verification documents

    LEGAL REQUIREMENTS (per matchmaking model):
    - Valid driver's license
    - Vehicle registration
    - Auto insurance meeting state minimums
    - Background check consent

    Drivers are independent contractors responsible for maintaining
    compliance with local regulations.
    """
    # Check if verification already exists
    existing = db.query(DriverVerification).filter(
        DriverVerification.driver_id == verification.driver_id
    ).first()

    if existing:
        # Update existing verification
        existing.license_number = verification.license_number
        existing.license_state = verification.license_state
        existing.license_expiry = datetime.fromisoformat(verification.license_expiry)
        existing.license_class = verification.license_class
        existing.license_status = DriverLicenseStatus.PENDING

        existing.vehicle_registration_number = verification.vehicle_registration_number
        existing.vehicle_registration_state = verification.vehicle_registration_state
        existing.vehicle_registration_expiry = datetime.fromisoformat(verification.vehicle_registration_expiry)
        existing.vehicle_vin = verification.vehicle_vin
        existing.registration_status = VehicleRegistrationStatus.PENDING

        existing.insurance_provider = verification.insurance_provider
        existing.insurance_policy_number = verification.insurance_policy_number
        existing.insurance_expiry = datetime.fromisoformat(verification.insurance_expiry)
        existing.insurance_coverage_amount = verification.insurance_coverage_amount
        existing.insurance_verified = False

        existing.background_check_consent = verification.background_check_consent
        existing.is_eligible_to_drive = False

        db.commit()
        db.refresh(existing)

        logger.info(f"Driver {verification.driver_id} verification updated")
        return {"message": "Verification documents updated", "driver_id": verification.driver_id}

    # Create new verification
    new_verification = DriverVerification(
        driver_id=verification.driver_id,
        license_number=verification.license_number,
        license_state=verification.license_state,
        license_expiry=datetime.fromisoformat(verification.license_expiry),
        license_class=verification.license_class,
        license_status=DriverLicenseStatus.PENDING,
        vehicle_registration_number=verification.vehicle_registration_number,
        vehicle_registration_state=verification.vehicle_registration_state,
        vehicle_registration_expiry=datetime.fromisoformat(verification.vehicle_registration_expiry),
        vehicle_vin=verification.vehicle_vin,
        registration_status=VehicleRegistrationStatus.PENDING,
        insurance_provider=verification.insurance_provider,
        insurance_policy_number=verification.insurance_policy_number,
        insurance_expiry=datetime.fromisoformat(verification.insurance_expiry),
        insurance_coverage_amount=verification.insurance_coverage_amount,
        insurance_verified=False,
        background_check_consent=verification.background_check_consent,
        is_eligible_to_drive=False
    )

    db.add(new_verification)
    db.commit()

    logger.info(f"Driver {verification.driver_id} verification submitted")
    return {"message": "Verification documents submitted", "driver_id": verification.driver_id}


@app.get("/api/drivers/{driver_id}/verification")
async def get_driver_verification_status(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """Get driver verification/compliance status"""
    verification = db.query(DriverVerification).filter(
        DriverVerification.driver_id == driver_id
    ).first()

    if not verification:
        return DriverComplianceStatus(
            driver_id=driver_id,
            license_status="not_submitted",
            vehicle_registration_status="not_submitted",
            insurance_status="not_submitted",
            background_check_status="not_submitted",
            is_eligible_to_drive=False,
            compliance_notes="No verification documents on file"
        )

    return DriverComplianceStatus(
        driver_id=driver_id,
        license_status=verification.license_status.value,
        license_expiry=verification.license_expiry.isoformat() if verification.license_expiry else None,
        vehicle_registration_status=verification.registration_status.value,
        vehicle_registration_expiry=verification.vehicle_registration_expiry.isoformat() if verification.vehicle_registration_expiry else None,
        insurance_status="verified" if verification.insurance_verified else "pending",
        insurance_expiry=verification.insurance_expiry.isoformat() if verification.insurance_expiry else None,
        background_check_status="passed" if verification.background_check_passed else ("pending" if verification.background_check_consent else "not_consented"),
        background_check_date=verification.background_check_date.isoformat() if verification.background_check_date else None,
        is_eligible_to_drive=verification.is_eligible_to_drive,
        compliance_notes=verification.eligibility_notes
    )


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
