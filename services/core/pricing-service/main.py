"""
Dollor.ai - Pricing Service
============================

Microservice handling pricing and fare calculation:
- Fare calculation for rides
- Surge pricing based on demand
- Delivery fee calculation
- Promotional codes/discounts
- Price estimation
- Platform fee calculation
- Tax calculation
- Tip suggestions
- Dynamic pricing rules
- Price history/analytics

Port: 8015
Error Prefix: PRICE
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List
from decimal import Decimal

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum, create_engine, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import enum
import math

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

SERVICE_NAME = "pricing-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8015

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# Pricing Configuration - Dollor.ai Matchmaking Platform
# ========================================================
# Dollor.ai is a MATCHMAKING SERVICE, not a delivery/transportation company
#
# FOOD DELIVERY - FLAT $1 PRICING (No tiered pricing):
#   Customer pays: $1 flat per order (regardless of order value)
#   Restaurant pays: $1 flat per restaurant in order
#   Driver pays: $0 (FREE - no commission)
#   Tips: 100% go to driver
#
# RIDESHARE - TIERED PRICING (Based on fare value):
#   Up to $35 fare:     $1 rider + $1 driver
#   $35.01 - $70 fare:  $2 rider + $2 driver
#   Above $70 fare:     $3 rider + $3 driver
#   Tips: 100% go to driver

BASE_DELIVERY_FEE = 2.99
BASE_FARE_PER_MILE = 1.50
BASE_FARE_PER_MINUTE = 0.35
MINIMUM_RIDE_FARE = 5.00

# =============================================================================
# FOOD DELIVERY - FLAT $1 FEES (No tiered pricing)
# =============================================================================
FOOD_CUSTOMER_FEE = 1.00        # $1 flat per order (regardless of order value)
FOOD_RESTAURANT_FEE = 1.00      # $1 flat per restaurant
FOOD_DRIVER_FEE = 0.00          # FREE - drivers keep 100%

# =============================================================================
# RIDESHARE - TIERED PRICING (Based on fare value)
# =============================================================================
# Tier thresholds
RIDESHARE_TIER_1_MAX = 35.00    # Fares up to $35
RIDESHARE_TIER_2_MAX = 70.00    # Fares $35.01 to $70
# Tier 3: Fares above $70

# Platform fees per tier (same for rider and driver)
RIDESHARE_TIER_1_FEE = 1.00     # $1 for fares <= $35
RIDESHARE_TIER_2_FEE = 2.00     # $2 for fares $35.01-$70
RIDESHARE_TIER_3_FEE = 3.00     # $3 for fares > $70

# Legacy constants for backward compatibility
PLATFORM_FEE_FOOD = 1.00  # Same as FOOD_CUSTOMER_FEE
SERVICE_FEE_PERCENTAGE = 0.0  # No additional service fee
PLATFORM_FEE_RIDE_PERCENTAGE = 0.0  # Using tiered fees instead

TAX_RATE = 0.0825  # 8.25% tax (California default)
TIP_PLATFORM_FEE = 0.00  # 0% - 100% of tips go to drivers

# Backward compatibility aliases
BASE_FARE = MINIMUM_RIDE_FARE
PER_MILE_RATE = BASE_FARE_PER_MILE
PER_MINUTE_RATE = BASE_FARE_PER_MINUTE


# =============================================================================
# ENUMS
# =============================================================================

class PricingModel(str, enum.Enum):
    """Pricing model types"""
    MATCHMAKING = "matchmaking"
    COMMISSION = "commission"
    SUBSCRIPTION = "subscription"


class SurgeLevel(str, enum.Enum):
    """Surge pricing levels"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


def get_food_platform_fee(order_value: float) -> float:
    """
    Get FLAT platform fee for food delivery.
    Always $1 regardless of order value - no tiered pricing for food.
    Returns fee for customer (restaurant pays same amount separately).
    """
    return FOOD_CUSTOMER_FEE


def get_food_restaurant_fee(order_value: float) -> float:
    """
    Get FLAT platform fee for restaurant.
    Always $1 per restaurant regardless of order value.
    """
    return FOOD_RESTAURANT_FEE


def get_rideshare_platform_fee(fare_value: float) -> float:
    """
    Calculate TIERED platform fee for rideshare based on fare value.
    Returns fee for BOTH rider AND driver (same amount each).
    """
    if fare_value <= RIDESHARE_TIER_1_MAX:
        return RIDESHARE_TIER_1_FEE
    elif fare_value <= RIDESHARE_TIER_2_MAX:
        return RIDESHARE_TIER_2_FEE
    else:
        return RIDESHARE_TIER_3_FEE


def get_rideshare_tier(fare_value: float) -> int:
    """Get tier number (1, 2, or 3) for rideshare fare."""
    if fare_value <= RIDESHARE_TIER_1_MAX:
        return 1
    elif fare_value <= RIDESHARE_TIER_2_MAX:
        return 2
    else:
        return 3

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

class PricingRuleType(enum.Enum):
    SURGE = "surge"
    DISCOUNT = "discount"
    DELIVERY_FEE = "delivery_fee"
    BASE_FARE = "base_fare"


class PricingRuleStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SCHEDULED = "scheduled"


class PromoCodeType(enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    FREE_DELIVERY = "free_delivery"


class PromoCode(Base):
    """Promotional discount codes"""
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)

    # Type and value
    type = Column(SQLEnum(PromoCodeType), default=PromoCodeType.PERCENTAGE)
    value = Column(Float)  # Percentage (0-100) or fixed amount

    # Limits
    max_discount = Column(Float)  # Maximum discount amount for percentage
    min_order_value = Column(Float, default=0)
    max_uses = Column(Integer)
    max_uses_per_customer = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)

    # Applicability
    applies_to = Column(String(20))  # "food", "ride", "both"
    first_order_only = Column(Boolean, default=False)

    # Validity
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    is_active = Column(Boolean, default=True)

    # Metadata
    description = Column(String(255))
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PricingRule(Base):
    """Dynamic pricing rules for surge pricing and custom rates"""
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rule_type = Column(SQLEnum(PricingRuleType), nullable=False)

    # Conditions
    conditions = Column(JSON)  # Time ranges, locations, demand levels

    # Multiplier or adjustment
    multiplier = Column(Float, default=1.0)  # For surge pricing
    adjustment = Column(Float, default=0.0)  # Fixed adjustment

    # Applicability
    applies_to = Column(String(20))  # "food", "ride", "both"
    geographic_zones = Column(JSON)  # List of zip codes or regions

    # Priority
    priority = Column(Integer, default=0)  # Higher priority rules apply first

    # Status
    status = Column(SQLEnum(PricingRuleStatus), default=PricingRuleStatus.ACTIVE)

    # Validity
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)

    # Metadata
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PriceEstimate(Base):
    """Stored price estimates for tracking and analytics"""
    __tablename__ = "price_estimates"

    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(String(50), unique=True, nullable=False, index=True)

    # Type
    service_type = Column(String(20))  # "food_delivery", "rideshare"

    # Location
    pickup_latitude = Column(Float)
    pickup_longitude = Column(Float)
    dropoff_latitude = Column(Float)
    dropoff_longitude = Column(Float)
    distance_miles = Column(Float)
    duration_minutes = Column(Float)

    # Breakdown
    base_fare = Column(Float, default=0.0)
    distance_fare = Column(Float, default=0.0)
    time_fare = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    surge_multiplier = Column(Float, default=1.0)
    surge_amount = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)

    # Discount
    promo_code = Column(String(50))
    discount_amount = Column(Float, default=0.0)

    # Total
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    # Tip suggestions
    suggested_tips = Column(JSON)  # [15%, 18%, 20%]

    # Validity
    valid_until = Column(DateTime)

    # Metadata
    customer_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class PriceHistory(Base):
    """Historical pricing data for analytics"""
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)

    # Reference
    order_id = Column(String(50), index=True)
    ride_id = Column(String(50), index=True)
    service_type = Column(String(20))

    # Pricing breakdown (same as estimate)
    base_fare = Column(Float, default=0.0)
    distance_fare = Column(Float, default=0.0)
    time_fare = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    surge_multiplier = Column(Float, default=1.0)
    surge_amount = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tip_amount = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    # Context
    promo_code_used = Column(String(50))
    rules_applied = Column(JSON)  # List of pricing rule IDs

    # Location
    pickup_zip = Column(String(20))
    dropoff_zip = Column(String(20))
    distance_miles = Column(Float)

    # Timing
    hour_of_day = Column(Integer)
    day_of_week = Column(Integer)

    # Metadata
    customer_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class PromoCodeCreate(BaseModel):
    code: str
    type: str = "percentage"
    value: float
    max_discount: Optional[float] = None
    min_order_value: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: int = 1
    applies_to: str = "both"
    first_order_only: bool = False
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    description: Optional[str] = None


class PromoCodeResponse(BaseModel):
    id: int
    code: str
    type: str
    value: float
    max_discount: Optional[float] = None
    min_order_value: float
    max_uses: Optional[int] = None
    current_uses: int
    applies_to: str
    is_active: bool
    valid_from: datetime
    valid_until: Optional[datetime] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class PricingRuleCreate(BaseModel):
    name: str
    rule_type: str
    conditions: dict
    multiplier: float = 1.0
    adjustment: float = 0.0
    applies_to: str = "both"
    geographic_zones: Optional[List[str]] = None
    priority: int = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    description: Optional[str] = None


class PricingRuleResponse(BaseModel):
    id: int
    name: str
    rule_type: str
    conditions: dict
    multiplier: float
    adjustment: float
    applies_to: str
    priority: int
    status: str
    valid_from: datetime
    valid_until: Optional[datetime] = None

    class Config:
        from_attributes = True


class RideEstimateRequest(BaseModel):
    pickup_latitude: float
    pickup_longitude: float
    dropoff_latitude: float
    dropoff_longitude: float
    customer_id: Optional[str] = None
    promo_code: Optional[str] = None


class DeliveryEstimateRequest(BaseModel):
    restaurant_latitude: float
    restaurant_longitude: float
    delivery_latitude: float
    delivery_longitude: float
    order_subtotal: float
    customer_id: Optional[str] = None
    promo_code: Optional[str] = None


class PriceBreakdown(BaseModel):
    base_fare: float = 0.0
    distance_fare: float = 0.0
    time_fare: float = 0.0
    delivery_fee: float = 0.0
    surge_multiplier: float = 1.0
    surge_amount: float = 0.0
    service_fee: float = 0.0
    platform_fee: float = 0.0
    tax: float = 0.0
    discount_amount: float = 0.0
    subtotal: float = 0.0
    total: float = 0.0
    suggested_tips: List[dict] = []


class PriceEstimateResponse(BaseModel):
    estimate_id: str
    service_type: str
    distance_miles: float
    duration_minutes: float
    breakdown: PriceBreakdown
    valid_until: datetime
    promo_code_applied: Optional[str] = None


class PromoCodeValidation(BaseModel):
    valid: bool
    code: Optional[str] = None
    discount_amount: float = 0.0
    message: str


# Test-required models (backward compatibility)
class FareEstimate(BaseModel):
    """Fare estimate model for rides"""
    distance_miles: float = Field(..., ge=0, description="Distance in miles")
    duration_minutes: float = Field(..., ge=0, description="Duration in minutes")
    base_fare: float = Field(..., ge=0, description="Base fare amount")
    distance_fare: float = Field(default=0.0, ge=0, description="Distance-based fare")
    time_fare: float = Field(default=0.0, ge=0, description="Time-based fare")
    surge_multiplier: float = Field(default=1.0, ge=1.0, description="Surge pricing multiplier")
    surge_amount: float = Field(default=0.0, ge=0, description="Surge amount added")
    platform_fee: float = Field(default=0.0, ge=0, description="Platform fee")
    tax: float = Field(default=0.0, ge=0, description="Tax amount")
    total_fare: float = Field(..., ge=0, description="Total fare")
    currency: str = Field(default="usd", description="Currency code")


class PricingRequest(BaseModel):
    """Request model for fare calculation"""
    pickup_latitude: float = Field(..., ge=-90, le=90)
    pickup_longitude: float = Field(..., ge=-180, le=180)
    dropoff_latitude: float = Field(..., ge=-90, le=90)
    dropoff_longitude: float = Field(..., ge=-180, le=180)
    service_type: str = Field(default="ride", description="Type of service: ride or delivery")
    customer_id: Optional[str] = None
    promo_code: Optional[str] = None


class SurgePricing(BaseModel):
    """Surge pricing information"""
    level: SurgeLevel = Field(default=SurgeLevel.NONE, description="Surge level")
    multiplier: float = Field(default=1.0, ge=1.0, le=5.0, description="Surge multiplier")
    reason: Optional[str] = Field(default=None, description="Reason for surge")
    expires_at: Optional[datetime] = None


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Pricing and fare calculation service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.
    Returns distance in miles.
    """
    from math import radians, sin, cos, sqrt, atan2

    R = 3959.0  # Earth's radius in miles

    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return round(distance, 2)


def estimate_duration(distance_miles: float) -> float:
    """
    Estimate duration in minutes based on distance.
    Assumes average speed of 30 mph in city.
    """
    avg_speed = 30.0
    duration = (distance_miles / avg_speed) * 60
    return round(duration, 1)


def calculate_surge_multiplier(service_type: str, current_time: datetime, location: dict, db: Session) -> float:
    """
    Calculate surge multiplier based on active pricing rules.
    """
    # Get active surge rules
    rules = db.query(PricingRule).filter(
        PricingRule.rule_type == PricingRuleType.SURGE,
        PricingRule.status == PricingRuleStatus.ACTIVE,
        PricingRule.valid_from <= current_time
    ).filter(
        (PricingRule.valid_until.is_(None)) | (PricingRule.valid_until >= current_time)
    ).filter(
        (PricingRule.applies_to == service_type) | (PricingRule.applies_to == "both")
    ).order_by(PricingRule.priority.desc()).all()

    max_multiplier = 1.0

    for rule in rules:
        # Check time conditions
        conditions = rule.conditions or {}
        if "hours" in conditions:
            hour = current_time.hour
            if hour not in conditions["hours"]:
                continue

        if "days_of_week" in conditions:
            day = current_time.weekday()
            if day not in conditions["days_of_week"]:
                continue

        # Apply multiplier
        if rule.multiplier > max_multiplier:
            max_multiplier = rule.multiplier

    return max_multiplier


def generate_estimate_id() -> str:
    """Generate unique estimate ID"""
    import random
    return f"EST-{random.randint(100000, 999999)}"


def calculate_tip_suggestions(subtotal: float) -> List[dict]:
    """Calculate tip suggestions at 15%, 18%, and 20%"""
    tips = []
    for percentage in [15, 18, 20]:
        amount = round(subtotal * (percentage / 100), 2)
        tips.append({
            "percentage": percentage,
            "amount": amount
        })
    return tips


# Test-required helper functions
def calculate_base_fare(distance_miles: float = 0.0, service_type: str = "ride") -> float:
    """
    Calculate base fare for a ride or delivery.

    Args:
        distance_miles: Distance in miles (not used for base fare, but included for interface consistency)
        service_type: Type of service ("ride" or "delivery")

    Returns:
        Base fare amount
    """
    if service_type == "delivery":
        return BASE_DELIVERY_FEE
    return BASE_FARE  # MINIMUM_RIDE_FARE


def calculate_distance_fare(distance_miles: float, rate_per_mile: float = None) -> float:
    """
    Calculate distance-based fare component.

    Args:
        distance_miles: Distance in miles
        rate_per_mile: Rate per mile (defaults to PER_MILE_RATE)

    Returns:
        Distance-based fare amount
    """
    if rate_per_mile is None:
        rate_per_mile = PER_MILE_RATE
    return round(distance_miles * rate_per_mile, 2)


def calculate_time_fare(duration_minutes: float, rate_per_minute: float = None) -> float:
    """
    Calculate time-based fare component.

    Args:
        duration_minutes: Duration in minutes
        rate_per_minute: Rate per minute (defaults to PER_MINUTE_RATE)

    Returns:
        Time-based fare amount
    """
    if rate_per_minute is None:
        rate_per_minute = PER_MINUTE_RATE
    return round(duration_minutes * rate_per_minute, 2)


def apply_surge(base_amount: float, surge_multiplier: float = 1.0) -> tuple:
    """
    Apply surge pricing multiplier to a base amount.

    Args:
        base_amount: Base fare amount before surge
        surge_multiplier: Surge multiplier (1.0 = no surge, 2.0 = 2x surge)

    Returns:
        Tuple of (surged_amount, surge_difference)
    """
    if surge_multiplier < 1.0:
        surge_multiplier = 1.0

    surged_amount = round(base_amount * surge_multiplier, 2)
    surge_difference = round(surged_amount - base_amount, 2)

    return (surged_amount, surge_difference)


# =============================================================================
# PROMO CODE ENDPOINTS
# =============================================================================

@app.post("/api/promo-codes", response_model=PromoCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_promo_code(promo: PromoCodeCreate, db: Session = Depends(get_db)):
    """Create a new promotional code"""
    # Check if code already exists
    existing = db.query(PromoCode).filter(PromoCode.code == promo.code.upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                code="PRICE-101",
                message="Promo code already exists",
                details={"code": promo.code}
            ).model_dump()
        )

    db_promo = PromoCode(
        code=promo.code.upper(),
        type=PromoCodeType[promo.type.upper()],
        value=promo.value,
        max_discount=promo.max_discount,
        min_order_value=promo.min_order_value,
        max_uses=promo.max_uses,
        max_uses_per_customer=promo.max_uses_per_customer,
        applies_to=promo.applies_to,
        first_order_only=promo.first_order_only,
        valid_from=promo.valid_from or datetime.utcnow(),
        valid_until=promo.valid_until,
        description=promo.description
    )

    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)

    logger.info(f"Created promo code: {db_promo.code}")
    return db_promo


@app.get("/api/promo-codes/{code}", response_model=PromoCodeResponse)
async def get_promo_code(code: str, db: Session = Depends(get_db)):
    """Get promo code details"""
    promo = db.query(PromoCode).filter(PromoCode.code == code.upper()).first()

    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PRICE-301",
                message="Promo code not found",
                details={"code": code}
            ).model_dump()
        )

    return promo


@app.post("/api/promo-codes/{code}/validate")
async def validate_promo_code(
    code: str,
    order_value: float = Query(..., gt=0),
    customer_id: Optional[str] = None,
    service_type: str = Query(..., regex="^(food|ride)$"),
    db: Session = Depends(get_db)
) -> PromoCodeValidation:
    """Validate a promo code for an order"""
    promo = db.query(PromoCode).filter(PromoCode.code == code.upper()).first()

    if not promo:
        return PromoCodeValidation(
            valid=False,
            message="Promo code not found"
        )

    # Check if active
    if not promo.is_active:
        return PromoCodeValidation(
            valid=False,
            message="Promo code is not active"
        )

    # Check validity dates
    now = datetime.utcnow()
    if promo.valid_from > now:
        return PromoCodeValidation(
            valid=False,
            message="Promo code is not yet valid"
        )

    if promo.valid_until and promo.valid_until < now:
        return PromoCodeValidation(
            valid=False,
            message="Promo code has expired"
        )

    # Check max uses
    if promo.max_uses and promo.current_uses >= promo.max_uses:
        return PromoCodeValidation(
            valid=False,
            message="Promo code has reached maximum uses"
        )

    # Check min order value
    if order_value < promo.min_order_value:
        return PromoCodeValidation(
            valid=False,
            message=f"Minimum order value of ${promo.min_order_value:.2f} required"
        )

    # Check service type
    if promo.applies_to not in [service_type, "both"]:
        return PromoCodeValidation(
            valid=False,
            message=f"Promo code not valid for {service_type} orders"
        )

    # Calculate discount
    if promo.type == PromoCodeType.PERCENTAGE:
        discount = order_value * (promo.value / 100)
        if promo.max_discount:
            discount = min(discount, promo.max_discount)
    elif promo.type == PromoCodeType.FIXED:
        discount = min(promo.value, order_value)
    elif promo.type == PromoCodeType.FREE_DELIVERY:
        discount = BASE_DELIVERY_FEE
    else:
        discount = 0.0

    return PromoCodeValidation(
        valid=True,
        code=promo.code,
        discount_amount=round(discount, 2),
        message="Promo code is valid"
    )


@app.put("/api/promo-codes/{code}/deactivate")
async def deactivate_promo_code(code: str, db: Session = Depends(get_db)):
    """Deactivate a promo code"""
    promo = db.query(PromoCode).filter(PromoCode.code == code.upper()).first()

    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PRICE-301",
                message="Promo code not found",
                details={"code": code}
            ).model_dump()
        )

    promo.is_active = False
    promo.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Deactivated promo code: {code}")
    return {"status": "deactivated", "code": promo.code}


# =============================================================================
# PRICING RULE ENDPOINTS
# =============================================================================

@app.post("/api/pricing-rules", response_model=PricingRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_pricing_rule(rule: PricingRuleCreate, db: Session = Depends(get_db)):
    """Create a new pricing rule"""
    db_rule = PricingRule(
        name=rule.name,
        rule_type=PricingRuleType[rule.rule_type.upper()],
        conditions=rule.conditions,
        multiplier=rule.multiplier,
        adjustment=rule.adjustment,
        applies_to=rule.applies_to,
        geographic_zones=rule.geographic_zones,
        priority=rule.priority,
        valid_from=rule.valid_from or datetime.utcnow(),
        valid_until=rule.valid_until,
        description=rule.description,
        status=PricingRuleStatus.ACTIVE
    )

    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)

    logger.info(f"Created pricing rule: {db_rule.name}")
    return db_rule


@app.get("/api/pricing-rules", response_model=List[PricingRuleResponse])
async def list_pricing_rules(
    rule_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all pricing rules with filters"""
    query = db.query(PricingRule)

    if rule_type:
        query = query.filter(PricingRule.rule_type == rule_type)

    if status:
        query = query.filter(PricingRule.status == status)

    rules = query.order_by(PricingRule.priority.desc()).all()
    return rules


@app.delete("/api/pricing-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pricing_rule(rule_id: int, db: Session = Depends(get_db)):
    """Delete a pricing rule"""
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PRICE-302",
                message="Pricing rule not found",
                details={"rule_id": rule_id}
            ).model_dump()
        )

    db.delete(rule)
    db.commit()

    logger.info(f"Deleted pricing rule: {rule_id}")


# =============================================================================
# PRICE ESTIMATION ENDPOINTS
# =============================================================================

@app.post("/api/estimate/ride", response_model=PriceEstimateResponse)
async def estimate_ride_price(request: RideEstimateRequest, db: Session = Depends(get_db)):
    """Estimate price for a rideshare trip"""
    # Calculate distance and duration
    distance = calculate_distance(
        request.pickup_latitude,
        request.pickup_longitude,
        request.dropoff_latitude,
        request.dropoff_longitude
    )
    duration = estimate_duration(distance)

    # Calculate base components
    base_fare = MINIMUM_RIDE_FARE
    distance_fare = distance * BASE_FARE_PER_MILE
    time_fare = duration * BASE_FARE_PER_MINUTE

    # Calculate surge
    surge_multiplier = calculate_surge_multiplier(
        "ride",
        datetime.utcnow(),
        {"lat": request.pickup_latitude, "lon": request.pickup_longitude},
        db
    )

    # Subtotal before surge (driver earnings base)
    pre_surge_subtotal = base_fare + distance_fare + time_fare
    surge_amount = pre_surge_subtotal * (surge_multiplier - 1.0)

    # Driver fare (what rider pays to driver)
    driver_fare = pre_surge_subtotal + surge_amount

    # Platform fee - TIERED based on fare value (rider pays this)
    # Note: Driver also pays matching platform fee, but that's separate
    platform_fee = get_rideshare_platform_fee(driver_fare)

    # No service fee in matchmaking model (platform fee covers it)
    service_fee = 0.0

    # Subtotal (driver fare + platform fee)
    subtotal = driver_fare + platform_fee

    # Tax
    tax = subtotal * TAX_RATE

    # Apply promo code if provided
    discount_amount = 0.0
    promo_code_applied = None
    if request.promo_code:
        validation = await validate_promo_code(
            request.promo_code,
            subtotal,
            request.customer_id,
            "ride",
            db
        )
        if validation.valid:
            discount_amount = validation.discount_amount
            promo_code_applied = request.promo_code

    # Total
    total = subtotal + tax - discount_amount
    total = max(total, MINIMUM_RIDE_FARE)  # Enforce minimum

    # Generate estimate
    estimate_id = generate_estimate_id()

    # Create estimate record
    db_estimate = PriceEstimate(
        estimate_id=estimate_id,
        service_type="rideshare",
        pickup_latitude=request.pickup_latitude,
        pickup_longitude=request.pickup_longitude,
        dropoff_latitude=request.dropoff_latitude,
        dropoff_longitude=request.dropoff_longitude,
        distance_miles=distance,
        duration_minutes=duration,
        base_fare=round(base_fare, 2),
        distance_fare=round(distance_fare, 2),
        time_fare=round(time_fare, 2),
        surge_multiplier=surge_multiplier,
        surge_amount=round(surge_amount, 2),
        service_fee=round(service_fee, 2),
        platform_fee=round(platform_fee, 2),
        tax=round(tax, 2),
        promo_code=promo_code_applied,
        discount_amount=round(discount_amount, 2),
        subtotal=round(subtotal, 2),
        total=round(total, 2),
        suggested_tips=calculate_tip_suggestions(subtotal),
        valid_until=datetime.utcnow() + timedelta(minutes=15),
        customer_id=request.customer_id
    )

    db.add(db_estimate)
    db.commit()

    logger.info(f"Generated ride estimate: {estimate_id}, distance: {distance}mi, total: ${total:.2f}")

    return PriceEstimateResponse(
        estimate_id=estimate_id,
        service_type="rideshare",
        distance_miles=distance,
        duration_minutes=duration,
        breakdown=PriceBreakdown(
            base_fare=round(base_fare, 2),
            distance_fare=round(distance_fare, 2),
            time_fare=round(time_fare, 2),
            surge_multiplier=surge_multiplier,
            surge_amount=round(surge_amount, 2),
            service_fee=round(service_fee, 2),
            platform_fee=round(platform_fee, 2),
            tax=round(tax, 2),
            discount_amount=round(discount_amount, 2),
            subtotal=round(subtotal, 2),
            total=round(total, 2),
            suggested_tips=calculate_tip_suggestions(subtotal)
        ),
        valid_until=db_estimate.valid_until,
        promo_code_applied=promo_code_applied
    )


@app.post("/api/estimate/delivery", response_model=PriceEstimateResponse)
async def estimate_delivery_price(request: DeliveryEstimateRequest, db: Session = Depends(get_db)):
    """Estimate price for food delivery"""
    # Calculate distance and duration
    distance = calculate_distance(
        request.restaurant_latitude,
        request.restaurant_longitude,
        request.delivery_latitude,
        request.delivery_longitude
    )
    duration = estimate_duration(distance)

    # Calculate delivery fee (base + distance)
    delivery_fee = BASE_DELIVERY_FEE + (max(0, distance - 2) * 0.50)  # Extra $0.50 per mile over 2 miles

    # Calculate surge
    surge_multiplier = calculate_surge_multiplier(
        "food",
        datetime.utcnow(),
        {"lat": request.restaurant_latitude, "lon": request.restaurant_longitude},
        db
    )

    surge_amount = delivery_fee * (surge_multiplier - 1.0)

    # Platform fee - TIERED based on order value (customer pays this)
    # Note: Restaurant also pays matching platform fee, but that's separate
    platform_fee = get_food_platform_fee(request.order_subtotal)

    # No service fee in matchmaking model (platform fee covers it)
    service_fee = 0.0

    # Subtotal (delivery fees + platform fee, NOT including food cost)
    subtotal = delivery_fee + surge_amount + platform_fee

    # Tax (on delivery fees only)
    tax = subtotal * TAX_RATE

    # Apply promo code if provided
    discount_amount = 0.0
    promo_code_applied = None
    if request.promo_code:
        validation = await validate_promo_code(
            request.promo_code,
            request.order_subtotal,
            request.customer_id,
            "food",
            db
        )
        if validation.valid:
            discount_amount = validation.discount_amount
            promo_code_applied = request.promo_code

    # Total
    total = subtotal + tax - discount_amount
    total = max(total, 0)  # Can't be negative

    # Generate estimate
    estimate_id = generate_estimate_id()

    # Create estimate record
    db_estimate = PriceEstimate(
        estimate_id=estimate_id,
        service_type="food_delivery",
        pickup_latitude=request.restaurant_latitude,
        pickup_longitude=request.restaurant_longitude,
        dropoff_latitude=request.delivery_latitude,
        dropoff_longitude=request.delivery_longitude,
        distance_miles=distance,
        duration_minutes=duration,
        delivery_fee=round(delivery_fee, 2),
        surge_multiplier=surge_multiplier,
        surge_amount=round(surge_amount, 2),
        service_fee=round(service_fee, 2),
        platform_fee=round(platform_fee, 2),
        tax=round(tax, 2),
        promo_code=promo_code_applied,
        discount_amount=round(discount_amount, 2),
        subtotal=round(subtotal, 2),
        total=round(total, 2),
        suggested_tips=calculate_tip_suggestions(request.order_subtotal),
        valid_until=datetime.utcnow() + timedelta(minutes=15),
        customer_id=request.customer_id
    )

    db.add(db_estimate)
    db.commit()

    logger.info(f"Generated delivery estimate: {estimate_id}, distance: {distance}mi, total: ${total:.2f}")

    return PriceEstimateResponse(
        estimate_id=estimate_id,
        service_type="food_delivery",
        distance_miles=distance,
        duration_minutes=duration,
        breakdown=PriceBreakdown(
            delivery_fee=round(delivery_fee, 2),
            surge_multiplier=surge_multiplier,
            surge_amount=round(surge_amount, 2),
            service_fee=round(service_fee, 2),
            platform_fee=round(platform_fee, 2),
            tax=round(tax, 2),
            discount_amount=round(discount_amount, 2),
            subtotal=round(subtotal, 2),
            total=round(total, 2),
            suggested_tips=calculate_tip_suggestions(request.order_subtotal)
        ),
        valid_until=db_estimate.valid_until,
        promo_code_applied=promo_code_applied
    )


@app.get("/api/estimate/{estimate_id}", response_model=PriceEstimateResponse)
async def get_estimate(estimate_id: str, db: Session = Depends(get_db)):
    """Get a previously created price estimate"""
    estimate = db.query(PriceEstimate).filter(PriceEstimate.estimate_id == estimate_id).first()

    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PRICE-303",
                message="Estimate not found",
                details={"estimate_id": estimate_id}
            ).model_dump()
        )

    # Check if expired
    if estimate.valid_until < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=ErrorResponse(
                code="PRICE-401",
                message="Estimate has expired",
                details={"estimate_id": estimate_id}
            ).model_dump()
        )

    return PriceEstimateResponse(
        estimate_id=estimate.estimate_id,
        service_type=estimate.service_type,
        distance_miles=estimate.distance_miles,
        duration_minutes=estimate.duration_minutes,
        breakdown=PriceBreakdown(
            base_fare=estimate.base_fare,
            distance_fare=estimate.distance_fare,
            time_fare=estimate.time_fare,
            delivery_fee=estimate.delivery_fee,
            surge_multiplier=estimate.surge_multiplier,
            surge_amount=estimate.surge_amount,
            service_fee=estimate.service_fee,
            platform_fee=estimate.platform_fee,
            tax=estimate.tax,
            discount_amount=estimate.discount_amount,
            subtotal=estimate.subtotal,
            total=estimate.total,
            suggested_tips=estimate.suggested_tips
        ),
        valid_until=estimate.valid_until,
        promo_code_applied=estimate.promo_code
    )


# =============================================================================
# PRICE HISTORY ENDPOINTS
# =============================================================================

@app.post("/api/price-history", status_code=status.HTTP_201_CREATED)
async def record_price_history(
    order_id: Optional[str] = None,
    ride_id: Optional[str] = None,
    estimate_id: Optional[str] = None,
    tip_amount: float = 0.0,
    db: Session = Depends(get_db)
):
    """Record actual pricing for analytics"""
    if not estimate_id and not (order_id or ride_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="PRICE-102",
                message="Either estimate_id or order_id/ride_id is required",
                details={}
            ).model_dump()
        )

    # Get estimate if provided
    estimate = None
    if estimate_id:
        estimate = db.query(PriceEstimate).filter(PriceEstimate.estimate_id == estimate_id).first()

    if not estimate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="PRICE-303",
                message="Estimate not found",
                details={"estimate_id": estimate_id}
            ).model_dump()
        )

    # Create history record
    now = datetime.utcnow()
    history = PriceHistory(
        order_id=order_id,
        ride_id=ride_id,
        service_type=estimate.service_type,
        base_fare=estimate.base_fare,
        distance_fare=estimate.distance_fare,
        time_fare=estimate.time_fare,
        delivery_fee=estimate.delivery_fee,
        surge_multiplier=estimate.surge_multiplier,
        surge_amount=estimate.surge_amount,
        service_fee=estimate.service_fee,
        platform_fee=estimate.platform_fee,
        tax=estimate.tax,
        discount_amount=estimate.discount_amount,
        tip_amount=tip_amount,
        subtotal=estimate.subtotal,
        total=estimate.total + tip_amount,
        promo_code_used=estimate.promo_code,
        distance_miles=estimate.distance_miles,
        hour_of_day=now.hour,
        day_of_week=now.weekday(),
        customer_id=estimate.customer_id
    )

    db.add(history)

    # Increment promo code usage if used
    if estimate.promo_code:
        promo = db.query(PromoCode).filter(PromoCode.code == estimate.promo_code).first()
        if promo:
            promo.current_uses += 1
            promo.updated_at = datetime.utcnow()

    db.commit()

    logger.info(f"Recorded price history for {order_id or ride_id}")
    return {"status": "recorded", "id": history.id}


@app.get("/api/price-history/analytics")
async def get_pricing_analytics(
    service_type: Optional[str] = None,
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """Get pricing analytics"""
    from sqlalchemy import func

    cutoff_date = datetime.utcnow() - timedelta(days=days)

    query = db.query(PriceHistory).filter(PriceHistory.created_at >= cutoff_date)

    if service_type:
        query = query.filter(PriceHistory.service_type == service_type)

    records = query.all()

    if not records:
        return {
            "period_days": days,
            "service_type": service_type or "all",
            "total_transactions": 0,
            "analytics": {}
        }

    # Calculate analytics
    total = len(records)
    avg_subtotal = sum(r.subtotal for r in records) / total
    avg_total = sum(r.total for r in records) / total
    avg_discount = sum(r.discount_amount for r in records) / total
    avg_surge = sum(r.surge_multiplier for r in records) / total

    # Promo code usage
    promo_usage = {}
    for r in records:
        if r.promo_code_used:
            promo_usage[r.promo_code_used] = promo_usage.get(r.promo_code_used, 0) + 1

    return {
        "period_days": days,
        "service_type": service_type or "all",
        "total_transactions": total,
        "analytics": {
            "average_subtotal": round(avg_subtotal, 2),
            "average_total": round(avg_total, 2),
            "average_discount": round(avg_discount, 2),
            "average_surge_multiplier": round(avg_surge, 2),
            "total_revenue": round(sum(r.total for r in records), 2),
            "total_discounts": round(sum(r.discount_amount for r in records), 2),
            "promo_code_usage": promo_usage
        }
    }


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/api/pricing/config")
async def get_pricing_config():
    """Get current pricing configuration - Dollor.ai Matchmaking Model"""
    return {
        # Base delivery/ride configuration
        "base_delivery_fee": BASE_DELIVERY_FEE,
        "base_fare_per_mile": BASE_FARE_PER_MILE,
        "base_fare_per_minute": BASE_FARE_PER_MINUTE,
        "minimum_ride_fare": MINIMUM_RIDE_FARE,
        "tax_rate": TAX_RATE,

        # Food Delivery Tiered Platform Fees
        "food_delivery": {
            "tier1": {
                "max_order_value": FOOD_DELIVERY_THRESHOLD_TIER1,
                "customer_fee": FOOD_DELIVERY_FEE_TIER1,
                "restaurant_fee": FOOD_DELIVERY_FEE_TIER1
            },
            "tier2": {
                "max_order_value": FOOD_DELIVERY_THRESHOLD_TIER2,
                "customer_fee": FOOD_DELIVERY_FEE_TIER2,
                "restaurant_fee": FOOD_DELIVERY_FEE_TIER2
            },
            "tier3": {
                "min_order_value": FOOD_DELIVERY_THRESHOLD_TIER2,
                "customer_fee": FOOD_DELIVERY_FEE_TIER3,
                "restaurant_fee": FOOD_DELIVERY_FEE_TIER3
            }
        },

        # Rideshare Tiered Platform Fees
        "rideshare": {
            "tier1": {
                "max_fare_value": RIDESHARE_THRESHOLD_TIER1,
                "rider_fee": RIDESHARE_FEE_TIER1,
                "driver_fee": RIDESHARE_FEE_TIER1
            },
            "tier2": {
                "max_fare_value": RIDESHARE_THRESHOLD_TIER2,
                "rider_fee": RIDESHARE_FEE_TIER2,
                "driver_fee": RIDESHARE_FEE_TIER2
            },
            "tier3": {
                "min_fare_value": RIDESHARE_THRESHOLD_TIER2,
                "rider_fee": RIDESHARE_FEE_TIER3,
                "driver_fee": RIDESHARE_FEE_TIER3
            }
        },

        # Tip handling - 100% goes to drivers
        "tips": {
            "platform_fee_percentage": TIP_PLATFORM_FEE,
            "driver_percentage": 100.0,
            "message": "100% of tips go directly to drivers"
        },

        # Model type
        "pricing_model": "matchmaking",
        "model_description": "Flat tiered fees - no percentage commission"
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
