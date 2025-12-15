"""
Dollor.ai - User Service
========================

Microservice handling customer and rider profiles:
- Customer registration and profile management
- Rider profile management (for rideshare)
- Address management
- Preferences and loyalty
- Customer analytics

Port: 8002
Error Prefix: USER
"""

import os
import sys
from datetime import datetime
from typing import Optional, List

from fastapi import Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import enum

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    UserErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "user-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8002

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

class CustomerStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class LoyaltyTier(enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class Customer(Base):
    """Customer accounts for food ordering and rideshare"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(50), unique=True, nullable=True, index=True)

    # Personal Information
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    profile_photo_url = Column(String(500))

    # Addresses
    default_address = Column(JSON)
    saved_addresses = Column(JSON)  # Array of addresses

    # Preferences
    dietary_preferences = Column(JSON)  # ["vegetarian", "gluten_free"]
    favorite_cuisines = Column(JSON)
    notification_preferences = Column(JSON)

    # Loyalty
    loyalty_points = Column(Integer, default=0)
    loyalty_tier = Column(String(50), default="bronze")

    # Stats
    total_orders = Column(Integer, default=0)
    total_rides = Column(Integer, default=0)  # For rideshare
    total_spent = Column(Float, default=0.0)
    average_order_value = Column(Float, default=0.0)

    # Engagement
    first_order_at = Column(DateTime)
    last_order_at = Column(DateTime)
    first_ride_at = Column(DateTime)
    last_ride_at = Column(DateTime)

    # Mobile App
    device_id = Column(String(255))
    push_token = Column(String(500))
    platform = Column(String(20))  # ios, android
    app_version = Column(String(20))

    # Stripe
    stripe_customer_id = Column(String(255))

    # Status
    status = Column(SQLEnum(CustomerStatus), default=CustomerStatus.ACTIVE)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SavedAddress(Base):
    """Saved addresses for customers"""
    __tablename__ = "saved_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, index=True)

    label = Column(String(50))  # Home, Work, etc.
    street = Column(String(255))
    apartment = Column(String(100))
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100), default="USA")
    latitude = Column(Float)
    longitude = Column(Float)

    is_default = Column(Boolean, default=False)
    delivery_instructions = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CustomerCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    dietary_preferences: Optional[List[str]] = None
    favorite_cuisines: Optional[List[str]] = None
    notification_preferences: Optional[dict] = None


class CustomerResponse(BaseModel):
    id: int
    customer_id: Optional[str] = None
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    loyalty_points: int = 0
    loyalty_tier: str = "bronze"
    total_orders: int = 0
    total_rides: int = 0
    total_spent: float = 0.0
    status: str = "active"
    is_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class AddressCreate(BaseModel):
    label: str
    street: str
    apartment: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "USA"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False
    delivery_instructions: Optional[str] = None


class AddressResponse(BaseModel):
    id: int
    label: str
    street: str
    apartment: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool
    delivery_instructions: Optional[str] = None

    class Config:
        from_attributes = True


class LoyaltyInfo(BaseModel):
    points: int
    tier: str
    points_to_next_tier: int
    benefits: List[str]


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Customer and rider profile management service"
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_customer_id(db: Session) -> str:
    """Generate unique customer ID"""
    import random
    while True:
        customer_id = f"CUST-{random.randint(100000, 999999)}"
        existing = db.query(Customer).filter(Customer.customer_id == customer_id).first()
        if not existing:
            return customer_id


def calculate_loyalty_tier(points: int) -> str:
    """Calculate loyalty tier based on points"""
    if points >= 10000:
        return "platinum"
    elif points >= 5000:
        return "gold"
    elif points >= 1000:
        return "silver"
    return "bronze"


def get_tier_benefits(tier: str) -> List[str]:
    """Get benefits for loyalty tier"""
    benefits = {
        "bronze": ["Free delivery on orders over $50", "Birthday discount 10%"],
        "silver": ["Free delivery on orders over $30", "Birthday discount 15%", "Priority support"],
        "gold": ["Free delivery on all orders", "Birthday discount 20%", "Priority support", "Exclusive offers"],
        "platinum": ["Free delivery on all orders", "Birthday discount 25%", "VIP support", "Exclusive offers", "Early access to new restaurants"]
    }
    return benefits.get(tier, benefits["bronze"])


# =============================================================================
# CUSTOMER ENDPOINTS
# =============================================================================

@app.post("/api/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer profile"""
    # Check if email already exists
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                code="USER-101",
                message="Email already registered",
                details={"email": customer.email}
            ).model_dump()
        )

    db_customer = Customer(
        customer_id=generate_customer_id(db),
        email=customer.email,
        first_name=customer.first_name,
        last_name=customer.last_name,
        phone=customer.phone,
        status=CustomerStatus.ACTIVE
    )

    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)

    logger.info(f"Created customer: {db_customer.customer_id}")
    return db_customer


@app.get("/api/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: Session = Depends(get_db)):
    """Get customer by ID"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    return customer


@app.get("/api/customers/email/{email}", response_model=CustomerResponse)
async def get_customer_by_email(email: str, db: Session = Depends(get_db)):
    """Get customer by email"""
    customer = db.query(Customer).filter(Customer.email == email).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"email": email}
            ).model_dump()
        )

    return customer


@app.put("/api/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, update: CustomerUpdate, db: Session = Depends(get_db)):
    """Update customer profile"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)

    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)

    logger.info(f"Updated customer: {customer.customer_id}")
    return customer


@app.delete("/api/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    """Soft delete customer (set status to inactive)"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    customer.status = CustomerStatus.INACTIVE
    customer.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Deleted customer: {customer.customer_id}")


# =============================================================================
# ADDRESS ENDPOINTS
# =============================================================================

@app.get("/api/customers/{customer_id}/addresses", response_model=List[AddressResponse])
async def get_customer_addresses(customer_id: str, db: Session = Depends(get_db)):
    """Get all addresses for a customer"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    addresses = db.query(SavedAddress).filter(SavedAddress.customer_id == customer.id).all()
    return addresses


@app.post("/api/customers/{customer_id}/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def add_customer_address(customer_id: str, address: AddressCreate, db: Session = Depends(get_db)):
    """Add a new address for customer"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    # If this is default, unset other defaults
    if address.is_default:
        db.query(SavedAddress).filter(
            SavedAddress.customer_id == customer.id
        ).update({"is_default": False})

    db_address = SavedAddress(
        customer_id=customer.id,
        **address.model_dump()
    )

    db.add(db_address)
    db.commit()
    db.refresh(db_address)

    logger.info(f"Added address for customer: {customer.customer_id}")
    return db_address


@app.put("/api/customers/{customer_id}/addresses/{address_id}", response_model=AddressResponse)
async def update_customer_address(customer_id: str, address_id: int, address: AddressCreate, db: Session = Depends(get_db)):
    """Update a customer address"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    db_address = db.query(SavedAddress).filter(
        SavedAddress.id == address_id,
        SavedAddress.customer_id == customer.id
    ).first()

    if not db_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-302",
                message="Address not found",
                details={"address_id": address_id}
            ).model_dump()
        )

    # If this is default, unset other defaults
    if address.is_default:
        db.query(SavedAddress).filter(
            SavedAddress.customer_id == customer.id,
            SavedAddress.id != address_id
        ).update({"is_default": False})

    for key, value in address.model_dump().items():
        setattr(db_address, key, value)

    db_address.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_address)

    return db_address


@app.delete("/api/customers/{customer_id}/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_address(customer_id: str, address_id: int, db: Session = Depends(get_db)):
    """Delete a customer address"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    db_address = db.query(SavedAddress).filter(
        SavedAddress.id == address_id,
        SavedAddress.customer_id == customer.id
    ).first()

    if not db_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-302",
                message="Address not found",
                details={"address_id": address_id}
            ).model_dump()
        )

    db.delete(db_address)
    db.commit()


# =============================================================================
# LOYALTY ENDPOINTS
# =============================================================================

@app.get("/api/customers/{customer_id}/loyalty", response_model=LoyaltyInfo)
async def get_customer_loyalty(customer_id: str, db: Session = Depends(get_db)):
    """Get customer loyalty information"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    tier = calculate_loyalty_tier(customer.loyalty_points)

    # Calculate points to next tier
    tier_thresholds = {"bronze": 1000, "silver": 5000, "gold": 10000, "platinum": float('inf')}
    next_tier_threshold = tier_thresholds.get(tier, 1000)
    points_to_next = max(0, next_tier_threshold - customer.loyalty_points) if next_tier_threshold != float('inf') else 0

    return LoyaltyInfo(
        points=customer.loyalty_points,
        tier=tier,
        points_to_next_tier=int(points_to_next),
        benefits=get_tier_benefits(tier)
    )


@app.post("/api/customers/{customer_id}/loyalty/add-points")
async def add_loyalty_points(customer_id: str, points: int = Query(..., gt=0), db: Session = Depends(get_db)):
    """Add loyalty points to customer"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    customer.loyalty_points += points
    customer.loyalty_tier = calculate_loyalty_tier(customer.loyalty_points)
    customer.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Added {points} points to customer: {customer.customer_id}")

    return {
        "customer_id": customer.customer_id,
        "points_added": points,
        "total_points": customer.loyalty_points,
        "tier": customer.loyalty_tier
    }


# =============================================================================
# STATS ENDPOINTS
# =============================================================================

@app.post("/api/customers/{customer_id}/stats/order-completed")
async def record_order_completed(
    customer_id: str,
    order_total: float = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Record a completed order for customer stats"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    customer.total_orders += 1
    customer.total_spent += order_total
    customer.average_order_value = customer.total_spent / customer.total_orders
    customer.last_order_at = datetime.utcnow()

    if not customer.first_order_at:
        customer.first_order_at = datetime.utcnow()

    # Add loyalty points (1 point per dollar)
    points_earned = int(order_total)
    customer.loyalty_points += points_earned
    customer.loyalty_tier = calculate_loyalty_tier(customer.loyalty_points)

    customer.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Recorded order for customer: {customer.customer_id}, total: ${order_total}")

    return {
        "customer_id": customer.customer_id,
        "total_orders": customer.total_orders,
        "total_spent": customer.total_spent,
        "points_earned": points_earned,
        "total_points": customer.loyalty_points
    }


@app.post("/api/customers/{customer_id}/stats/ride-completed")
async def record_ride_completed(
    customer_id: str,
    ride_total: float = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Record a completed ride for customer stats"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    customer.total_rides += 1
    customer.total_spent += ride_total
    customer.last_ride_at = datetime.utcnow()

    if not customer.first_ride_at:
        customer.first_ride_at = datetime.utcnow()

    # Add loyalty points (1 point per dollar)
    points_earned = int(ride_total)
    customer.loyalty_points += points_earned
    customer.loyalty_tier = calculate_loyalty_tier(customer.loyalty_points)

    customer.updated_at = datetime.utcnow()
    db.commit()

    logger.info(f"Recorded ride for customer: {customer.customer_id}, total: ${ride_total}")

    return {
        "customer_id": customer.customer_id,
        "total_rides": customer.total_rides,
        "points_earned": points_earned,
        "total_points": customer.loyalty_points
    }


# =============================================================================
# MOBILE APP ENDPOINTS
# =============================================================================

@app.put("/api/customers/{customer_id}/device")
async def update_device_info(
    customer_id: str,
    device_id: Optional[str] = None,
    push_token: Optional[str] = None,
    platform: Optional[str] = None,
    app_version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update customer device information"""
    customer = db.query(Customer).filter(
        (Customer.customer_id == customer_id) | (Customer.id == int(customer_id) if customer_id.isdigit() else False)
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="USER-301",
                message="Customer not found",
                details={"customer_id": customer_id}
            ).model_dump()
        )

    if device_id:
        customer.device_id = device_id
    if push_token:
        customer.push_token = push_token
    if platform:
        customer.platform = platform
    if app_version:
        customer.app_version = app_version

    customer.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "updated", "customer_id": customer.customer_id}


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

@app.get("/api/customers", response_model=List[CustomerResponse])
async def search_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Search customers with filters"""
    query = db.query(Customer)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Customer.email.ilike(search_term)) |
            (Customer.first_name.ilike(search_term)) |
            (Customer.last_name.ilike(search_term)) |
            (Customer.phone.ilike(search_term))
        )

    if status:
        query = query.filter(Customer.status == status)

    if tier:
        query = query.filter(Customer.loyalty_tier == tier)

    customers = query.offset(offset).limit(limit).all()
    return customers


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
