"""
Dollor.ai - Rating Service
==========================

Microservice handling ratings and reviews:
- Ratings for orders (1-5 stars)
- Ratings for drivers
- Ratings for restaurants
- Ratings for rides (rideshare)
- Reviews with text comments
- Photo reviews
- Rating aggregation (average calculation)
- Report inappropriate reviews
- Response to reviews (by restaurant/driver)
- Rating analytics

Port: 8013
Error Prefix: RATE
"""

import os
import sys
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum, create_engine, func
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

SERVICE_NAME = "rating-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8013

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

class RatingType(enum.Enum):
    ORDER = "order"
    DRIVER = "driver"
    RESTAURANT = "restaurant"
    RIDE = "ride"


class ReviewStatus(enum.Enum):
    ACTIVE = "active"
    HIDDEN = "hidden"
    REPORTED = "reported"
    DELETED = "deleted"


class ReportReason(enum.Enum):
    SPAM = "spam"
    OFFENSIVE = "offensive"
    FAKE = "fake"
    INAPPROPRIATE = "inappropriate"
    OTHER = "other"


class Rating(Base):
    """Ratings for orders, drivers, restaurants, and rides"""
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    rating_id = Column(String(50), unique=True, nullable=True, index=True)

    # Rating details
    rating_type = Column(SQLEnum(RatingType), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars

    # References (can be order_id, driver_id, restaurant_id, or ride_id)
    reference_id = Column(String(100), nullable=False, index=True)

    # Who rated (customer_id)
    customer_id = Column(Integer, nullable=False, index=True)
    customer_name = Column(String(200))

    # Text review (optional)
    review_text = Column(Text)
    review_title = Column(String(200))

    # Photo reviews (array of image URLs)
    photo_urls = Column(Text)  # JSON array stored as text

    # For specific ratings (optional breakdown)
    food_quality = Column(Integer)  # For restaurant/order
    delivery_speed = Column(Integer)  # For driver/order
    service_quality = Column(Integer)  # For restaurant
    cleanliness = Column(Integer)  # For restaurant/vehicle
    communication = Column(Integer)  # For driver

    # Helpful votes
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)

    # Status
    status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.ACTIVE)
    is_verified_purchase = Column(Boolean, default=False)

    # Response from restaurant/driver
    response_text = Column(Text)
    response_by = Column(String(100))  # restaurant_id or driver_id
    response_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RatingAggregate(Base):
    """Aggregated ratings for restaurants and drivers"""
    __tablename__ = "rating_aggregates"

    id = Column(Integer, primary_key=True, index=True)

    # What we're aggregating
    entity_type = Column(String(50), nullable=False, index=True)  # restaurant, driver
    entity_id = Column(String(100), nullable=False, index=True)

    # Overall stats
    average_rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)

    # Star distribution
    star_5_count = Column(Integer, default=0)
    star_4_count = Column(Integer, default=0)
    star_3_count = Column(Integer, default=0)
    star_2_count = Column(Integer, default=0)
    star_1_count = Column(Integer, default=0)

    # Category averages
    avg_food_quality = Column(Float)
    avg_delivery_speed = Column(Float)
    avg_service_quality = Column(Float)
    avg_cleanliness = Column(Float)
    avg_communication = Column(Float)

    # Metadata
    last_rating_at = Column(DateTime)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReviewReport(Base):
    """Reports for inappropriate reviews"""
    __tablename__ = "review_reports"

    id = Column(Integer, primary_key=True, index=True)
    rating_id = Column(Integer, nullable=False, index=True)

    # Who reported
    reported_by = Column(Integer, nullable=False)  # customer_id
    reason = Column(SQLEnum(ReportReason), nullable=False)
    description = Column(Text)

    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))  # admin_id
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class RatingCreate(BaseModel):
    rating_type: str = Field(..., pattern="^(order|driver|restaurant|ride)$")
    rating: int = Field(..., ge=1, le=5)
    reference_id: str
    customer_id: int
    customer_name: Optional[str] = None
    review_text: Optional[str] = Field(None, max_length=2000)
    review_title: Optional[str] = Field(None, max_length=200)
    photo_urls: Optional[List[str]] = None
    food_quality: Optional[int] = Field(None, ge=1, le=5)
    delivery_speed: Optional[int] = Field(None, ge=1, le=5)
    service_quality: Optional[int] = Field(None, ge=1, le=5)
    cleanliness: Optional[int] = Field(None, ge=1, le=5)
    communication: Optional[int] = Field(None, ge=1, le=5)
    is_verified_purchase: bool = False


class RatingUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    review_text: Optional[str] = Field(None, max_length=2000)
    review_title: Optional[str] = Field(None, max_length=200)
    photo_urls: Optional[List[str]] = None
    food_quality: Optional[int] = Field(None, ge=1, le=5)
    delivery_speed: Optional[int] = Field(None, ge=1, le=5)
    service_quality: Optional[int] = Field(None, ge=1, le=5)
    cleanliness: Optional[int] = Field(None, ge=1, le=5)
    communication: Optional[int] = Field(None, ge=1, le=5)


class RatingResponse(BaseModel):
    id: int
    rating_id: Optional[str] = None
    rating_type: str
    rating: int
    reference_id: str
    customer_id: int
    customer_name: Optional[str] = None
    review_text: Optional[str] = None
    review_title: Optional[str] = None
    photo_urls: Optional[str] = None
    food_quality: Optional[int] = None
    delivery_speed: Optional[int] = None
    service_quality: Optional[int] = None
    cleanliness: Optional[int] = None
    communication: Optional[int] = None
    helpful_count: int = 0
    not_helpful_count: int = 0
    status: str
    is_verified_purchase: bool = False
    response_text: Optional[str] = None
    response_by: Optional[str] = None
    response_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewResponseCreate(BaseModel):
    response_text: str = Field(..., max_length=1000)
    response_by: str  # restaurant_id or driver_id


class ReportCreate(BaseModel):
    reason: str = Field(..., pattern="^(spam|offensive|fake|inappropriate|other)$")
    description: Optional[str] = Field(None, max_length=500)


class ReportResponse(BaseModel):
    id: int
    rating_id: int
    reported_by: int
    reason: str
    description: Optional[str] = None
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AggregateResponse(BaseModel):
    entity_type: str
    entity_id: str
    average_rating: float
    total_ratings: int
    star_5_count: int
    star_4_count: int
    star_3_count: int
    star_2_count: int
    star_1_count: int
    avg_food_quality: Optional[float] = None
    avg_delivery_speed: Optional[float] = None
    avg_service_quality: Optional[float] = None
    avg_cleanliness: Optional[float] = None
    avg_communication: Optional[float] = None
    last_rating_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RatingStats(BaseModel):
    average_rating: float
    total_ratings: int
    rating_distribution: dict


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Rating and review management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_rating_id(db: Session) -> str:
    """Generate unique rating ID"""
    import random
    while True:
        rating_id = f"RATE-{random.randint(100000, 999999)}"
        existing = db.query(Rating).filter(Rating.rating_id == rating_id).first()
        if not existing:
            return rating_id


def update_aggregate(db: Session, entity_type: str, entity_id: str):
    """Update aggregated ratings for an entity"""
    # Get or create aggregate
    aggregate = db.query(RatingAggregate).filter(
        RatingAggregate.entity_type == entity_type,
        RatingAggregate.entity_id == entity_id
    ).first()

    if not aggregate:
        aggregate = RatingAggregate(
            entity_type=entity_type,
            entity_id=entity_id
        )
        db.add(aggregate)

    # Map rating type to entity type
    rating_type_map = {
        "restaurant": RatingType.RESTAURANT,
        "driver": RatingType.DRIVER,
    }

    rating_type = rating_type_map.get(entity_type)
    if not rating_type:
        return

    # Calculate aggregates
    ratings = db.query(Rating).filter(
        Rating.rating_type == rating_type,
        Rating.reference_id == entity_id,
        Rating.status == ReviewStatus.ACTIVE
    ).all()

    if not ratings:
        return

    # Overall stats
    total_ratings = len(ratings)
    average_rating = sum(r.rating for r in ratings) / total_ratings

    # Star distribution
    star_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        star_counts[r.rating] += 1

    # Category averages
    def avg(field):
        values = [getattr(r, field) for r in ratings if getattr(r, field) is not None]
        return sum(values) / len(values) if values else None

    aggregate.average_rating = round(average_rating, 2)
    aggregate.total_ratings = total_ratings
    aggregate.star_5_count = star_counts[5]
    aggregate.star_4_count = star_counts[4]
    aggregate.star_3_count = star_counts[3]
    aggregate.star_2_count = star_counts[2]
    aggregate.star_1_count = star_counts[1]
    aggregate.avg_food_quality = avg('food_quality')
    aggregate.avg_delivery_speed = avg('delivery_speed')
    aggregate.avg_service_quality = avg('service_quality')
    aggregate.avg_cleanliness = avg('cleanliness')
    aggregate.avg_communication = avg('communication')
    aggregate.last_rating_at = max(r.created_at for r in ratings)
    aggregate.updated_at = datetime.utcnow()

    db.commit()


# =============================================================================
# RATING ENDPOINTS
# =============================================================================

@app.post("/api/ratings", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(rating: RatingCreate, db: Session = Depends(get_db)):
    """
    Create a new rating/review

    Error Codes:
    - RATE-101: Invalid rating value
    - RATE-102: Duplicate rating for same reference
    """
    # Check for duplicate
    existing = db.query(Rating).filter(
        Rating.rating_type == rating.rating_type,
        Rating.reference_id == rating.reference_id,
        Rating.customer_id == rating.customer_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                code="RATE-102",
                message="Rating already exists for this reference",
                details={
                    "rating_type": rating.rating_type,
                    "reference_id": rating.reference_id
                }
            ).model_dump()
        )

    # Create rating
    db_rating = Rating(
        rating_id=generate_rating_id(db),
        rating_type=rating.rating_type,
        rating=rating.rating,
        reference_id=rating.reference_id,
        customer_id=rating.customer_id,
        customer_name=rating.customer_name,
        review_text=rating.review_text,
        review_title=rating.review_title,
        photo_urls=",".join(rating.photo_urls) if rating.photo_urls else None,
        food_quality=rating.food_quality,
        delivery_speed=rating.delivery_speed,
        service_quality=rating.service_quality,
        cleanliness=rating.cleanliness,
        communication=rating.communication,
        is_verified_purchase=rating.is_verified_purchase,
        status=ReviewStatus.ACTIVE
    )

    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)

    # Update aggregates
    if rating.rating_type in ["restaurant", "driver"]:
        update_aggregate(db, rating.rating_type, rating.reference_id)

    logger.info(f"Created rating: {db_rating.rating_id}")
    return db_rating


@app.get("/api/ratings/{rating_id}", response_model=RatingResponse)
async def get_rating(rating_id: str, db: Session = Depends(get_db)):
    """
    Get rating by ID

    Error Codes:
    - RATE-301: Rating not found
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    return rating


@app.put("/api/ratings/{rating_id}", response_model=RatingResponse)
async def update_rating(rating_id: str, update: RatingUpdate, db: Session = Depends(get_db)):
    """
    Update an existing rating

    Error Codes:
    - RATE-301: Rating not found
    - RATE-401: Cannot update rating after 24 hours
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    # Check if rating is too old to update (24 hours)
    hours_since_creation = (datetime.utcnow() - rating.created_at).total_seconds() / 3600
    if hours_since_creation > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RATE-401",
                message="Cannot update rating after 24 hours",
                details={"created_at": rating.created_at.isoformat()}
            ).model_dump()
        )

    update_data = update.model_dump(exclude_unset=True)
    if "photo_urls" in update_data and update_data["photo_urls"]:
        update_data["photo_urls"] = ",".join(update_data["photo_urls"])

    for key, value in update_data.items():
        setattr(rating, key, value)

    rating.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rating)

    # Update aggregates
    if rating.rating_type.value in ["restaurant", "driver"]:
        update_aggregate(db, rating.rating_type.value, rating.reference_id)

    logger.info(f"Updated rating: {rating.rating_id}")
    return rating


@app.delete("/api/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(rating_id: str, db: Session = Depends(get_db)):
    """
    Delete a rating (soft delete)

    Error Codes:
    - RATE-301: Rating not found
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    rating.status = ReviewStatus.DELETED
    rating.updated_at = datetime.utcnow()
    db.commit()

    # Update aggregates
    if rating.rating_type.value in ["restaurant", "driver"]:
        update_aggregate(db, rating.rating_type.value, rating.reference_id)

    logger.info(f"Deleted rating: {rating.rating_id}")


# =============================================================================
# QUERY ENDPOINTS
# =============================================================================

@app.get("/api/ratings", response_model=List[RatingResponse])
async def get_ratings(
    rating_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    customer_id: Optional[int] = None,
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    status: str = "active",
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get ratings with filters

    Query Parameters:
    - rating_type: Filter by type (order, driver, restaurant, ride)
    - reference_id: Filter by reference ID
    - customer_id: Filter by customer
    - min_rating: Minimum star rating
    - max_rating: Maximum star rating
    - status: Filter by status (default: active)
    """
    query = db.query(Rating)

    if rating_type:
        query = query.filter(Rating.rating_type == rating_type)

    if reference_id:
        query = query.filter(Rating.reference_id == reference_id)

    if customer_id:
        query = query.filter(Rating.customer_id == customer_id)

    if min_rating:
        query = query.filter(Rating.rating >= min_rating)

    if max_rating:
        query = query.filter(Rating.rating <= max_rating)

    if status:
        query = query.filter(Rating.status == status)

    ratings = query.order_by(Rating.created_at.desc()).offset(offset).limit(limit).all()
    return ratings


@app.get("/api/ratings/reference/{reference_id}", response_model=List[RatingResponse])
async def get_ratings_by_reference(
    reference_id: str,
    rating_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all ratings for a specific reference (order, driver, restaurant, etc)"""
    query = db.query(Rating).filter(
        Rating.reference_id == reference_id,
        Rating.status == ReviewStatus.ACTIVE
    )

    if rating_type:
        query = query.filter(Rating.rating_type == rating_type)

    ratings = query.order_by(Rating.created_at.desc()).offset(offset).limit(limit).all()
    return ratings


# =============================================================================
# REVIEW RESPONSE ENDPOINTS
# =============================================================================

@app.post("/api/ratings/{rating_id}/response", response_model=RatingResponse)
async def respond_to_review(
    rating_id: str,
    response: ReviewResponseCreate,
    db: Session = Depends(get_db)
):
    """
    Add response to a review (by restaurant or driver)

    Error Codes:
    - RATE-301: Rating not found
    - RATE-402: Review already has a response
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    if rating.response_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RATE-402",
                message="Review already has a response",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    rating.response_text = response.response_text
    rating.response_by = response.response_by
    rating.response_at = datetime.utcnow()
    rating.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rating)

    logger.info(f"Added response to rating: {rating.rating_id}")
    return rating


@app.put("/api/ratings/{rating_id}/response", response_model=RatingResponse)
async def update_review_response(
    rating_id: str,
    response: ReviewResponseCreate,
    db: Session = Depends(get_db)
):
    """
    Update response to a review

    Error Codes:
    - RATE-301: Rating not found
    - RATE-403: No response exists to update
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    if not rating.response_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="RATE-403",
                message="No response exists to update",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    rating.response_text = response.response_text
    rating.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rating)

    logger.info(f"Updated response for rating: {rating.rating_id}")
    return rating


# =============================================================================
# HELPFUL VOTING ENDPOINTS
# =============================================================================

@app.post("/api/ratings/{rating_id}/helpful")
async def mark_helpful(rating_id: str, helpful: bool = True, db: Session = Depends(get_db)):
    """
    Mark a review as helpful or not helpful

    Error Codes:
    - RATE-301: Rating not found
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    if helpful:
        rating.helpful_count += 1
    else:
        rating.not_helpful_count += 1

    db.commit()

    return {
        "rating_id": rating.rating_id,
        "helpful_count": rating.helpful_count,
        "not_helpful_count": rating.not_helpful_count
    }


# =============================================================================
# REPORT ENDPOINTS
# =============================================================================

@app.post("/api/ratings/{rating_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_review(
    rating_id: str,
    report: ReportCreate,
    reported_by: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Report a review as inappropriate

    Error Codes:
    - RATE-301: Rating not found
    - RATE-404: Already reported by this user
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    # Check for duplicate report
    existing = db.query(ReviewReport).filter(
        ReviewReport.rating_id == rating.id,
        ReviewReport.reported_by == reported_by
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                code="RATE-404",
                message="Already reported by this user",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    db_report = ReviewReport(
        rating_id=rating.id,
        reported_by=reported_by,
        reason=report.reason,
        description=report.description
    )

    db.add(db_report)

    # Update rating status
    rating.status = ReviewStatus.REPORTED

    db.commit()
    db.refresh(db_report)

    logger.info(f"Reported rating: {rating.rating_id}")
    return db_report


@app.get("/api/ratings/{rating_id}/reports", response_model=List[ReportResponse])
async def get_rating_reports(rating_id: str, db: Session = Depends(get_db)):
    """
    Get all reports for a rating

    Error Codes:
    - RATE-301: Rating not found
    """
    rating = db.query(Rating).filter(
        (Rating.rating_id == rating_id) | (Rating.id == int(rating_id) if rating_id.isdigit() else False)
    ).first()

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="RATE-301",
                message="Rating not found",
                details={"rating_id": rating_id}
            ).model_dump()
        )

    reports = db.query(ReviewReport).filter(ReviewReport.rating_id == rating.id).all()
    return reports


# =============================================================================
# AGGREGATION ENDPOINTS
# =============================================================================

@app.get("/api/aggregates/{entity_type}/{entity_id}", response_model=AggregateResponse)
async def get_aggregate_rating(entity_type: str, entity_id: str, db: Session = Depends(get_db)):
    """
    Get aggregated ratings for an entity (restaurant or driver)

    Error Codes:
    - RATE-302: Aggregate not found
    """
    aggregate = db.query(RatingAggregate).filter(
        RatingAggregate.entity_type == entity_type,
        RatingAggregate.entity_id == entity_id
    ).first()

    if not aggregate:
        # Create empty aggregate
        aggregate = RatingAggregate(
            entity_type=entity_type,
            entity_id=entity_id
        )
        db.add(aggregate)
        db.commit()
        db.refresh(aggregate)

    return aggregate


@app.post("/api/aggregates/{entity_type}/{entity_id}/refresh")
async def refresh_aggregate(entity_type: str, entity_id: str, db: Session = Depends(get_db)):
    """Manually refresh aggregated ratings for an entity"""
    update_aggregate(db, entity_type, entity_id)

    aggregate = db.query(RatingAggregate).filter(
        RatingAggregate.entity_type == entity_type,
        RatingAggregate.entity_id == entity_id
    ).first()

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "average_rating": aggregate.average_rating if aggregate else 0,
        "total_ratings": aggregate.total_ratings if aggregate else 0,
        "updated_at": aggregate.updated_at if aggregate else None
    }


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@app.get("/api/analytics/ratings/stats")
async def get_rating_stats(
    rating_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    days: int = Query(default=30, le=365),
    db: Session = Depends(get_db)
):
    """
    Get rating statistics

    Query Parameters:
    - rating_type: Filter by type
    - reference_id: Filter by reference
    - days: Number of days to analyze (default: 30)
    """
    from datetime import timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    query = db.query(Rating).filter(
        Rating.created_at >= start_date,
        Rating.status == ReviewStatus.ACTIVE
    )

    if rating_type:
        query = query.filter(Rating.rating_type == rating_type)

    if reference_id:
        query = query.filter(Rating.reference_id == reference_id)

    ratings = query.all()

    if not ratings:
        return {
            "average_rating": 0,
            "total_ratings": 0,
            "rating_distribution": {
                "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
            },
            "with_reviews": 0,
            "with_photos": 0,
            "average_review_length": 0
        }

    # Calculate stats
    total_ratings = len(ratings)
    average_rating = sum(r.rating for r in ratings) / total_ratings

    distribution = {str(i): 0 for i in range(1, 6)}
    for r in ratings:
        distribution[str(r.rating)] += 1

    with_reviews = sum(1 for r in ratings if r.review_text)
    with_photos = sum(1 for r in ratings if r.photo_urls)

    review_lengths = [len(r.review_text) for r in ratings if r.review_text]
    avg_review_length = sum(review_lengths) / len(review_lengths) if review_lengths else 0

    return {
        "period_days": days,
        "average_rating": round(average_rating, 2),
        "total_ratings": total_ratings,
        "rating_distribution": distribution,
        "with_reviews": with_reviews,
        "with_photos": with_photos,
        "average_review_length": int(avg_review_length)
    }


@app.get("/api/analytics/ratings/trending")
async def get_trending_reviews(
    rating_type: Optional[str] = None,
    min_helpful: int = Query(default=5),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """
    Get trending reviews (most helpful)

    Query Parameters:
    - rating_type: Filter by type
    - min_helpful: Minimum helpful votes
    - limit: Number of results
    """
    query = db.query(Rating).filter(
        Rating.status == ReviewStatus.ACTIVE,
        Rating.helpful_count >= min_helpful
    )

    if rating_type:
        query = query.filter(Rating.rating_type == rating_type)

    ratings = query.order_by(Rating.helpful_count.desc()).limit(limit).all()

    return [
        {
            "rating_id": r.rating_id,
            "rating": r.rating,
            "review_title": r.review_title,
            "review_text": r.review_text,
            "customer_name": r.customer_name,
            "helpful_count": r.helpful_count,
            "created_at": r.created_at
        }
        for r in ratings
    ]


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
