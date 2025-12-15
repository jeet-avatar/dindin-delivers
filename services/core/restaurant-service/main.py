"""
Dollor.ai - Restaurant Service
===============================

Microservice handling restaurant profiles and operations:
- Restaurant registration and profile management
- Restaurant verification and approval workflow
- Operating hours management
- Restaurant search by location/cuisine
- Performance metrics and analytics

Port: 8004
Error Prefix: REST
"""

import os
import sys
from datetime import datetime
from typing import Optional, List
import enum

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum, create_engine, and_, or_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    RestaurantErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "restaurant-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8004

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
# DATABASE MODELS (Based on Vendor model)
# =============================================================================

class VendorStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    ACTIVE = "active"


class OnboardingPhase(enum.Enum):
    NOT_STARTED = "not_started"
    BASIC_INFO = "basic_info"
    DOCUMENTS = "documents"
    VERIFICATION = "verification"
    APPROVAL = "approval"
    COMPLETED = "completed"


class RiskRating(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Restaurant(Base):
    """Restaurant/Vendor accounts for food ordering"""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(String(50), unique=True, nullable=False, index=True)

    # Company Information
    company_name = Column(String(255), nullable=False)
    tax_id = Column(String(50))
    business_type = Column(String(100))
    industry = Column(String(100))
    website = Column(String(255))

    # Restaurant-Specific Fields
    restaurant_name = Column(String(255))
    cuisine_type = Column(String(100))
    operating_hours = Column(Text)
    seating_capacity = Column(Integer)
    delivery_available = Column(Boolean, default=True)
    pickup_available = Column(Boolean, default=True)
    average_prep_time = Column(Integer)  # in minutes

    # Primary Contact
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    contact_title = Column(String(100))

    # Address
    street = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)

    # Status and Ratings
    onboarding_status = Column(SQLEnum(VendorStatus), default=VendorStatus.PENDING)
    onboarding_phase = Column(SQLEnum(OnboardingPhase), default=OnboardingPhase.NOT_STARTED)
    risk_rating = Column(SQLEnum(RiskRating), default=RiskRating.MEDIUM)
    performance_score = Column(Integer, default=0)

    # Contract Information
    contract_status = Column(String(50))
    contract_start_date = Column(DateTime)
    contract_end_date = Column(DateTime)

    # ZIP Integration
    zip_status = Column(String(50))
    zip_vendor_id = Column(String(100))

    # Documents
    w9_form = Column(Boolean, default=False)
    w9_form_url = Column(String(500))
    insurance = Column(Boolean, default=False)
    insurance_url = Column(String(500))
    financial_statements = Column(Boolean, default=False)
    financial_statements_url = Column(String(500))
    compliance_certs = Column(Boolean, default=False)
    compliance_certs_url = Column(String(500))
    security_policy = Column(Boolean, default=False)
    security_policy_url = Column(String(500))
    food_license = Column(Boolean, default=False)
    food_license_url = Column(String(500))
    health_permit = Column(Boolean, default=False)
    health_permit_url = Column(String(500))

    # Mobile App Fields
    app_registered = Column(Boolean, default=False)
    mobile_device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # 'ios' or 'android'

    # Additional Information
    notes = Column(Text)
    onboarding_notes = Column(Text)
    rejection_reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)
    last_activity = Column(DateTime)

    # Document Verification (Third-Party Integration)
    verification_id = Column(String(255))  # Persona/Onfido inquiry ID
    verification_status = Column(String(50), default="not_started")  # pending, verified, rejected, needs_review
    documents_verified = Column(Boolean, default=False)
    documents_verified_at = Column(DateTime)
    verification_notes = Column(Text)
    verification_reviewer_id = Column(Integer)  # Admin who manually reviewed


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class RestaurantCreate(BaseModel):
    company_name: str
    restaurant_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    cuisine_type: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "USA"


class RestaurantUpdate(BaseModel):
    company_name: Optional[str] = None
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    operating_hours: Optional[str] = None
    seating_capacity: Optional[int] = None
    delivery_available: Optional[bool] = None
    pickup_available: Optional[bool] = None
    average_prep_time: Optional[int] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    website: Optional[str] = None


class RestaurantResponse(BaseModel):
    id: int
    vendor_id: str
    company_name: str
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    delivery_available: bool = True
    pickup_available: bool = True
    average_prep_time: Optional[int] = None
    onboarding_status: str
    onboarding_phase: str
    performance_score: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class OperatingHoursUpdate(BaseModel):
    operating_hours: str  # JSON string with schedule


class DocumentUpload(BaseModel):
    document_type: str  # w9_form, insurance, food_license, health_permit, etc.
    document_url: str


class ApprovalRequest(BaseModel):
    vendor_id: str
    approved: bool
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class PerformanceMetrics(BaseModel):
    vendor_id: str
    performance_score: int
    total_orders: int
    average_rating: float
    on_time_delivery_rate: float
    acceptance_rate: float


class SearchFilters(BaseModel):
    cuisine_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    delivery_available: Optional[bool] = None
    min_performance_score: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_miles: Optional[float] = None


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Restaurant profile and operations management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_vendor_id(db: Session) -> str:
    """Generate unique vendor ID"""
    import random
    while True:
        vendor_id = f"VEND-{random.randint(100000, 999999)}"
        existing = db.query(Restaurant).filter(Restaurant.vendor_id == vendor_id).first()
        if not existing:
            return vendor_id


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in miles using Haversine formula"""
    from math import radians, cos, sin, asin, sqrt

    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))

    # Radius of earth in miles
    r = 3956

    return c * r


# =============================================================================
# RESTAURANT CRUD ENDPOINTS
# =============================================================================

@app.post("/api/restaurants", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurant(restaurant: RestaurantCreate, db: Session = Depends(get_db)):
    """Create a new restaurant profile"""
    # Check if email already exists
    existing = db.query(Restaurant).filter(Restaurant.contact_email == restaurant.contact_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                code="REST-101",
                message="Restaurant email already registered",
                details={"email": restaurant.contact_email}
            ).model_dump()
        )

    db_restaurant = Restaurant(
        vendor_id=generate_vendor_id(db),
        company_name=restaurant.company_name,
        restaurant_name=restaurant.restaurant_name,
        contact_name=restaurant.contact_name,
        contact_email=restaurant.contact_email,
        contact_phone=restaurant.contact_phone,
        cuisine_type=restaurant.cuisine_type,
        street=restaurant.street,
        city=restaurant.city,
        state=restaurant.state,
        zip_code=restaurant.zip_code,
        country=restaurant.country,
        onboarding_status=VendorStatus.PENDING,
        onboarding_phase=OnboardingPhase.BASIC_INFO
    )

    db.add(db_restaurant)
    db.commit()
    db.refresh(db_restaurant)

    logger.info(f"Created restaurant: {db_restaurant.vendor_id}")
    return db_restaurant


@app.get("/api/restaurants/{vendor_id}", response_model=RestaurantResponse)
async def get_restaurant(vendor_id: str, db: Session = Depends(get_db)):
    """Get restaurant by vendor ID"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    return restaurant


@app.get("/api/restaurants/email/{email}", response_model=RestaurantResponse)
async def get_restaurant_by_email(email: str, db: Session = Depends(get_db)):
    """Get restaurant by contact email"""
    restaurant = db.query(Restaurant).filter(Restaurant.contact_email == email).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"email": email}
            ).model_dump()
        )

    return restaurant


@app.put("/api/restaurants/{vendor_id}", response_model=RestaurantResponse)
async def update_restaurant(vendor_id: str, update: RestaurantUpdate, db: Session = Depends(get_db)):
    """Update restaurant profile"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(restaurant, key, value)

    restaurant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(restaurant)

    logger.info(f"Updated restaurant: {restaurant.vendor_id}")
    return restaurant


@app.delete("/api/restaurants/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurant(vendor_id: str, db: Session = Depends(get_db)):
    """Soft delete restaurant (set status to suspended)"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    restaurant.onboarding_status = VendorStatus.SUSPENDED
    restaurant.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Deleted restaurant: {restaurant.vendor_id}")


# =============================================================================
# OPERATING HOURS ENDPOINTS
# =============================================================================

@app.get("/api/restaurants/{vendor_id}/operating-hours")
async def get_operating_hours(vendor_id: str, db: Session = Depends(get_db)):
    """Get restaurant operating hours"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    return {
        "vendor_id": restaurant.vendor_id,
        "operating_hours": restaurant.operating_hours or "{}",
        "average_prep_time": restaurant.average_prep_time
    }


@app.put("/api/restaurants/{vendor_id}/operating-hours")
async def update_operating_hours(vendor_id: str, hours: OperatingHoursUpdate, db: Session = Depends(get_db)):
    """Update restaurant operating hours"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    restaurant.operating_hours = hours.operating_hours
    restaurant.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Updated operating hours for restaurant: {restaurant.vendor_id}")

    return {
        "vendor_id": restaurant.vendor_id,
        "operating_hours": restaurant.operating_hours
    }


# =============================================================================
# VERIFICATION & APPROVAL WORKFLOW ENDPOINTS
# =============================================================================

@app.post("/api/restaurants/{vendor_id}/documents")
async def upload_document(vendor_id: str, document: DocumentUpload, db: Session = Depends(get_db)):
    """Upload a document for restaurant verification"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    # Update document based on type
    doc_type = document.document_type
    if doc_type == "w9_form":
        restaurant.w9_form = True
        restaurant.w9_form_url = document.document_url
    elif doc_type == "insurance":
        restaurant.insurance = True
        restaurant.insurance_url = document.document_url
    elif doc_type == "food_license":
        restaurant.food_license = True
        restaurant.food_license_url = document.document_url
    elif doc_type == "health_permit":
        restaurant.health_permit = True
        restaurant.health_permit_url = document.document_url
    elif doc_type == "financial_statements":
        restaurant.financial_statements = True
        restaurant.financial_statements_url = document.document_url
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="REST-102",
                message="Invalid document type",
                details={"document_type": doc_type}
            ).model_dump()
        )

    # Update onboarding phase if all required docs are uploaded
    if restaurant.food_license and restaurant.health_permit:
        restaurant.onboarding_phase = OnboardingPhase.VERIFICATION

    restaurant.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Uploaded {doc_type} for restaurant: {restaurant.vendor_id}")

    return {
        "vendor_id": restaurant.vendor_id,
        "document_type": doc_type,
        "status": "uploaded"
    }


@app.get("/api/restaurants/{vendor_id}/verification-status")
async def get_verification_status(vendor_id: str, db: Session = Depends(get_db)):
    """Get restaurant verification status"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    return {
        "vendor_id": restaurant.vendor_id,
        "onboarding_status": restaurant.onboarding_status.value,
        "onboarding_phase": restaurant.onboarding_phase.value,
        "verification_status": restaurant.verification_status,
        "documents_verified": restaurant.documents_verified,
        "documents": {
            "w9_form": restaurant.w9_form,
            "insurance": restaurant.insurance,
            "food_license": restaurant.food_license,
            "health_permit": restaurant.health_permit,
            "financial_statements": restaurant.financial_statements
        }
    }


@app.post("/api/restaurants/{vendor_id}/approve")
async def approve_restaurant(vendor_id: str, approval: ApprovalRequest, db: Session = Depends(get_db)):
    """Approve or reject a restaurant"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    if approval.approved:
        restaurant.onboarding_status = VendorStatus.APPROVED
        restaurant.onboarding_phase = OnboardingPhase.COMPLETED
        restaurant.approved_at = datetime.utcnow()
        restaurant.documents_verified = True
        restaurant.documents_verified_at = datetime.utcnow()
        restaurant.verification_status = "verified"
    else:
        restaurant.onboarding_status = VendorStatus.REJECTED
        restaurant.rejection_reason = approval.rejection_reason

    if approval.notes:
        restaurant.onboarding_notes = approval.notes

    restaurant.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"{'Approved' if approval.approved else 'Rejected'} restaurant: {restaurant.vendor_id}")

    return {
        "vendor_id": restaurant.vendor_id,
        "status": restaurant.onboarding_status.value,
        "approved": approval.approved
    }


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

@app.get("/api/restaurants", response_model=List[RestaurantResponse])
async def search_restaurants(
    search: Optional[str] = None,
    cuisine_type: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    delivery_available: Optional[bool] = None,
    status: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_miles: Optional[float] = 25.0,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Search restaurants with filters"""
    query = db.query(Restaurant)

    # Text search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Restaurant.restaurant_name.ilike(search_term),
                Restaurant.company_name.ilike(search_term),
                Restaurant.cuisine_type.ilike(search_term)
            )
        )

    # Cuisine filter
    if cuisine_type:
        query = query.filter(Restaurant.cuisine_type.ilike(f"%{cuisine_type}%"))

    # Location filters
    if city:
        query = query.filter(Restaurant.city.ilike(f"%{city}%"))

    if state:
        query = query.filter(Restaurant.state == state)

    # Delivery filter
    if delivery_available is not None:
        query = query.filter(Restaurant.delivery_available == delivery_available)

    # Status filter
    if status:
        query = query.filter(Restaurant.onboarding_status == status)

    restaurants = query.offset(offset).limit(limit).all()

    # Apply distance filter if coordinates provided
    if latitude is not None and longitude is not None:
        filtered_restaurants = []
        for restaurant in restaurants:
            if restaurant.latitude and restaurant.longitude:
                distance = calculate_distance(latitude, longitude, restaurant.latitude, restaurant.longitude)
                if distance <= radius_miles:
                    filtered_restaurants.append(restaurant)
        return filtered_restaurants

    return restaurants


@app.get("/api/restaurants/search/nearby", response_model=List[RestaurantResponse])
async def search_nearby_restaurants(
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_miles: float = Query(default=10.0, le=50.0),
    cuisine_type: Optional[str] = None,
    delivery_available: Optional[bool] = True,
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db)
):
    """Search for nearby restaurants by location"""
    query = db.query(Restaurant).filter(
        Restaurant.onboarding_status == VendorStatus.APPROVED,
        Restaurant.latitude.isnot(None),
        Restaurant.longitude.isnot(None)
    )

    if delivery_available is not None:
        query = query.filter(Restaurant.delivery_available == delivery_available)

    if cuisine_type:
        query = query.filter(Restaurant.cuisine_type.ilike(f"%{cuisine_type}%"))

    all_restaurants = query.all()

    # Calculate distances and filter
    nearby_restaurants = []
    for restaurant in all_restaurants:
        distance = calculate_distance(latitude, longitude, restaurant.latitude, restaurant.longitude)
        if distance <= radius_miles:
            nearby_restaurants.append((restaurant, distance))

    # Sort by distance
    nearby_restaurants.sort(key=lambda x: x[1])

    # Return top N results
    return [r[0] for r in nearby_restaurants[:limit]]


# =============================================================================
# PERFORMANCE METRICS ENDPOINTS
# =============================================================================

@app.get("/api/restaurants/{vendor_id}/metrics")
async def get_restaurant_metrics(vendor_id: str, db: Session = Depends(get_db)):
    """Get restaurant performance metrics"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    return {
        "vendor_id": restaurant.vendor_id,
        "performance_score": restaurant.performance_score,
        "risk_rating": restaurant.risk_rating.value,
        "last_activity": restaurant.last_activity,
        "created_at": restaurant.created_at
    }


@app.put("/api/restaurants/{vendor_id}/metrics")
async def update_restaurant_metrics(
    vendor_id: str,
    performance_score: int = Query(..., ge=0, le=100),
    db: Session = Depends(get_db)
):
    """Update restaurant performance metrics"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    restaurant.performance_score = performance_score
    restaurant.last_activity = datetime.utcnow()

    # Update risk rating based on performance
    if performance_score >= 80:
        restaurant.risk_rating = RiskRating.LOW
    elif performance_score >= 50:
        restaurant.risk_rating = RiskRating.MEDIUM
    else:
        restaurant.risk_rating = RiskRating.HIGH

    restaurant.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Updated metrics for restaurant: {restaurant.vendor_id}, score: {performance_score}")

    return {
        "vendor_id": restaurant.vendor_id,
        "performance_score": restaurant.performance_score,
        "risk_rating": restaurant.risk_rating.value
    }


# =============================================================================
# MOBILE APP ENDPOINTS
# =============================================================================

@app.put("/api/restaurants/{vendor_id}/device")
async def update_device_info(
    vendor_id: str,
    device_id: Optional[str] = None,
    push_token: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update restaurant mobile device information"""
    restaurant = db.query(Restaurant).filter(
        (Restaurant.vendor_id == vendor_id) | (Restaurant.id == int(vendor_id) if vendor_id.isdigit() else False)
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="REST-301",
                message="Restaurant not found",
                details={"vendor_id": vendor_id}
            ).model_dump()
        )

    if device_id:
        restaurant.mobile_device_id = device_id
        restaurant.app_registered = True
    if push_token:
        restaurant.push_token = push_token
    if platform:
        restaurant.platform = platform

    restaurant.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "updated", "vendor_id": restaurant.vendor_id}


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@app.get("/api/restaurants/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Get overall restaurant analytics summary"""
    total_restaurants = db.query(Restaurant).count()
    approved = db.query(Restaurant).filter(Restaurant.onboarding_status == VendorStatus.APPROVED).count()
    pending = db.query(Restaurant).filter(Restaurant.onboarding_status == VendorStatus.PENDING).count()
    rejected = db.query(Restaurant).filter(Restaurant.onboarding_status == VendorStatus.REJECTED).count()

    avg_performance = db.query(Restaurant).filter(
        Restaurant.onboarding_status == VendorStatus.APPROVED
    ).with_entities(Restaurant.performance_score).all()

    avg_score = sum([r[0] for r in avg_performance if r[0]]) / len(avg_performance) if avg_performance else 0

    return {
        "total_restaurants": total_restaurants,
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "average_performance_score": round(avg_score, 2)
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
