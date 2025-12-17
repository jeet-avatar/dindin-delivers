"""
Dollor.ai - Driver Service
===========================

Microservice handling all driver operations:
- Profile management
- Real-time location tracking
- Online/offline status
- Document verification
- Earnings and payouts

Port: 8003
Error Prefix: DRV
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import Depends, HTTPException, status, BackgroundTasks, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import text
import enum

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    DriverErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "driver-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8003

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8009")

# Location settings
MAX_LOCATION_AGE_SECONDS = 300  # 5 minutes
NEARBY_DRIVER_RADIUS_KM = 10  # Search radius for nearby drivers

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# ENUMS
# =============================================================================

class DriverStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class VehicleType(str, Enum):
    CAR = "car"
    MOTORCYCLE = "motorcycle"
    BICYCLE = "bicycle"
    SCOOTER = "scooter"
    VAN = "van"


class DocumentType(str, Enum):
    DRIVERS_LICENSE = "drivers_license"
    VEHICLE_REGISTRATION = "vehicle_registration"
    INSURANCE = "insurance"
    BACKGROUND_CHECK = "background_check"
    PROFILE_PHOTO = "profile_photo"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


# =============================================================================
# PYDANTIC MODELS - REQUESTS
# =============================================================================

class DriverProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    vehicle_type: Optional[VehicleType] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    license_plate: Optional[str] = None
    photo_url: Optional[str] = None


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    heading: Optional[float] = None
    speed: Optional[float] = None
    accuracy: Optional[float] = None


class OnlineStatusUpdate(BaseModel):
    is_online: bool


class FCMTokenUpdate(BaseModel):
    fcm_token: str
    device_type: str  # ios, android


class DocumentUpload(BaseModel):
    document_type: DocumentType
    document_url: str
    expiry_date: Optional[datetime] = None


class NearbyDriversQuery(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = NEARBY_DRIVER_RADIUS_KM
    vehicle_type: Optional[VehicleType] = None
    limit: int = 20


# =============================================================================
# PYDANTIC MODELS - RESPONSES
# =============================================================================

class DriverProfileResponse(BaseModel):
    id: int
    driver_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    status: str
    rating: float
    total_deliveries: int
    vehicle_type: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    license_plate: Optional[str]
    is_online: bool
    photo_url: Optional[str]
    stripe_onboarded: bool
    documents_verified: bool
    created_at: datetime


class DriverLocationResponse(BaseModel):
    driver_id: str
    latitude: float
    longitude: float
    is_online: bool
    last_updated: datetime


class NearbyDriverResponse(BaseModel):
    driver_id: str
    first_name: str
    rating: float
    vehicle_type: Optional[str]
    latitude: float
    longitude: float
    distance_km: float


class DriverEarningsResponse(BaseModel):
    driver_id: str
    period: str
    total_deliveries: int
    delivery_earnings: float
    tips: float
    bonuses: float
    deductions: float
    net_earnings: float


class DocumentResponse(BaseModel):
    id: int
    document_type: str
    document_url: str
    status: str
    expiry_date: Optional[datetime]
    uploaded_at: datetime
    verified_at: Optional[datetime]


# =============================================================================
# CREATE SERVICE
# =============================================================================

factory = MicroserviceFactory(
    service_name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Driver management service for Dollor.ai platform",
    port=SERVICE_PORT,
)

app = factory.create_app()
logger = factory.logger


# =============================================================================
# ROUTES - PROFILE
# =============================================================================

@app.get("/api/driver/profile", response_model=DriverProfileResponse, tags=["Profile"])
async def get_driver_profile(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver profile by ID.

    Error Codes:
    - DRV-101: Driver not found
    """
    result = db.execute(
        text("""
            SELECT id, driver_id, first_name, last_name, email, phone, status,
                   rating, total_deliveries, vehicle_type, vehicle_make, vehicle_model,
                   license_plate, is_online, photo_url, stripe_onboarded, documents_verified,
                   created_at
            FROM drivers
            WHERE id = :driver_id
        """),
        {"driver_id": driver_id}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    return DriverProfileResponse(
        id=result[0],
        driver_id=result[1],
        first_name=result[2],
        last_name=result[3],
        email=result[4],
        phone=result[5],
        status=result[6],
        rating=result[7] or 5.0,
        total_deliveries=result[8] or 0,
        vehicle_type=result[9],
        vehicle_make=result[10],
        vehicle_model=result[11],
        license_plate=result[12],
        is_online=result[13] or False,
        photo_url=result[14],
        stripe_onboarded=result[15] or False,
        documents_verified=result[16] or False,
        created_at=result[17]
    )


@app.put("/api/driver/profile", tags=["Profile"])
async def update_driver_profile(
    driver_id: int,
    profile: DriverProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver profile.

    Error Codes:
    - DRV-101: Driver not found
    - DRV-102: Invalid profile data
    """
    # Check if driver exists
    driver = db.execute(
        text("SELECT id FROM drivers WHERE id = :id"),
        {"id": driver_id}
    ).fetchone()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    # Build update query
    updates = []
    params = {"driver_id": driver_id}

    if profile.first_name:
        updates.append("first_name = :first_name")
        params["first_name"] = profile.first_name
    if profile.last_name:
        updates.append("last_name = :last_name")
        params["last_name"] = profile.last_name
    if profile.phone:
        updates.append("phone = :phone")
        params["phone"] = profile.phone
    if profile.street:
        updates.append("street = :street")
        params["street"] = profile.street
    if profile.city:
        updates.append("city = :city")
        params["city"] = profile.city
    if profile.state:
        updates.append("state = :state")
        params["state"] = profile.state
    if profile.zip_code:
        updates.append("zip_code = :zip_code")
        params["zip_code"] = profile.zip_code
    if profile.vehicle_type:
        updates.append("vehicle_type = :vehicle_type")
        params["vehicle_type"] = profile.vehicle_type.value
    if profile.vehicle_make:
        updates.append("vehicle_make = :vehicle_make")
        params["vehicle_make"] = profile.vehicle_make
    if profile.vehicle_model:
        updates.append("vehicle_model = :vehicle_model")
        params["vehicle_model"] = profile.vehicle_model
    if profile.vehicle_year:
        updates.append("vehicle_year = :vehicle_year")
        params["vehicle_year"] = profile.vehicle_year
    if profile.vehicle_color:
        updates.append("vehicle_color = :vehicle_color")
        params["vehicle_color"] = profile.vehicle_color
    if profile.license_plate:
        updates.append("license_plate = :license_plate")
        params["license_plate"] = profile.license_plate
    if profile.photo_url:
        updates.append("photo_url = :photo_url")
        params["photo_url"] = profile.photo_url

    if updates:
        updates.append("updated_at = :updated_at")
        params["updated_at"] = datetime.utcnow()

        # Safe: Column names are hardcoded, all values are parameterized
        query = f"UPDATE drivers SET {', '.join(updates)} WHERE id = :driver_id"
        db.execute(text(query), params)  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text
        db.commit()

    logger.info("Driver profile updated", driver_id=driver_id)
    return {"success": True, "message": "Profile updated successfully"}


# =============================================================================
# ROUTES - LOCATION
# =============================================================================

@app.put("/api/driver/location", tags=["Location"])
async def update_driver_location(
    driver_id: int,
    location: LocationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver's real-time location.

    Error Codes:
    - DRV-101: Driver not found
    - DRV-201: Invalid location coordinates
    """
    # Validate coordinates
    if not (-90 <= location.latitude <= 90) or not (-180 <= location.longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DRV-201", "message": "Invalid location coordinates"}
        )

    now = datetime.utcnow()
    db.execute(
        text("""
            UPDATE drivers
            SET current_latitude = :lat,
                current_longitude = :lng,
                last_location_update = :now,
                location_updated_at = :now
            WHERE id = :driver_id
        """),
        {
            "lat": location.latitude,
            "lng": location.longitude,
            "now": now,
            "driver_id": driver_id
        }
    )
    db.commit()

    return {"success": True, "timestamp": now.isoformat()}


@app.get("/api/driver/location", response_model=DriverLocationResponse, tags=["Location"])
async def get_driver_location(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver's current location.

    Error Codes:
    - DRV-101: Driver not found
    - DRV-202: Location not available
    """
    result = db.execute(
        text("""
            SELECT driver_id, current_latitude, current_longitude, is_online, location_updated_at
            FROM drivers
            WHERE id = :driver_id
        """),
        {"driver_id": driver_id}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    if not result[1] or not result[2]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-202", "message": "Location not available"}
        )

    return DriverLocationResponse(
        driver_id=result[0],
        latitude=result[1],
        longitude=result[2],
        is_online=result[3] or False,
        last_updated=result[4] or datetime.utcnow()
    )


@app.post("/api/driver/nearby", response_model=List[NearbyDriverResponse], tags=["Location"])
async def find_nearby_drivers(
    query: NearbyDriversQuery,
    db: Session = Depends(get_db)
):
    """
    Find nearby online drivers.
    Uses Haversine formula for distance calculation.

    Error Codes:
    - DRV-201: Invalid location coordinates
    """
    if not (-90 <= query.latitude <= 90) or not (-180 <= query.longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DRV-201", "message": "Invalid location coordinates"}
        )

    # Haversine formula in SQL
    sql = """
        SELECT
            driver_id, first_name, rating, vehicle_type,
            current_latitude, current_longitude,
            (
                6371 * acos(
                    cos(radians(:lat)) * cos(radians(current_latitude))
                    * cos(radians(current_longitude) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(current_latitude))
                )
            ) AS distance_km
        FROM drivers
        WHERE is_online = true
          AND status = 'active'
          AND current_latitude IS NOT NULL
          AND current_longitude IS NOT NULL
          AND location_updated_at > :min_time
    """

    params = {
        "lat": query.latitude,
        "lng": query.longitude,
        "min_time": datetime.utcnow() - timedelta(seconds=MAX_LOCATION_AGE_SECONDS)
    }

    if query.vehicle_type:
        sql += " AND vehicle_type = :vehicle_type"
        params["vehicle_type"] = query.vehicle_type.value

    sql += " HAVING distance_km <= :radius_km ORDER BY distance_km LIMIT :limit"
    params["radius_km"] = query.radius_km
    params["limit"] = query.limit

    # Safe: All values are parameterized, no user input in SQL structure
    results = db.execute(text(sql), params).fetchall()  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text

    return [
        NearbyDriverResponse(
            driver_id=r[0],
            first_name=r[1],
            rating=r[2] or 5.0,
            vehicle_type=r[3],
            latitude=r[4],
            longitude=r[5],
            distance_km=round(r[6], 2)
        )
        for r in results
    ]


# =============================================================================
# ROUTES - ONLINE STATUS
# =============================================================================

@app.put("/api/driver/online", tags=["Status"])
async def update_online_status(
    driver_id: int,
    status_update: OnlineStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver's online/offline status.

    Error Codes:
    - DRV-101: Driver not found
    - DRV-301: Driver not approved (cannot go online)
    """
    # Check driver status
    driver = db.execute(
        text("SELECT status FROM drivers WHERE id = :id"),
        {"id": driver_id}
    ).fetchone()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    if driver[0] not in ['active', 'approved'] and status_update.is_online:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DRV-301", "message": "Driver not approved to go online"}
        )

    now = datetime.utcnow()
    if status_update.is_online:
        db.execute(
            text("""
                UPDATE drivers
                SET is_online = true, went_online_at = :now
                WHERE id = :driver_id
            """),
            {"now": now, "driver_id": driver_id}
        )
    else:
        db.execute(
            text("""
                UPDATE drivers
                SET is_online = false, went_offline_at = :now
                WHERE id = :driver_id
            """),
            {"now": now, "driver_id": driver_id}
        )

    db.commit()
    logger.info("Driver online status updated", driver_id=driver_id, is_online=status_update.is_online)

    return {
        "success": True,
        "is_online": status_update.is_online,
        "timestamp": now.isoformat()
    }


@app.get("/api/driver/status", tags=["Status"])
async def get_driver_status(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver's current status (approval status, online status, etc.)
    """
    result = db.execute(
        text("""
            SELECT status, is_online, rating, total_deliveries,
                   documents_verified, stripe_onboarded,
                   went_online_at, went_offline_at
            FROM drivers
            WHERE id = :driver_id
        """),
        {"driver_id": driver_id}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    return {
        "driver_id": driver_id,
        "approval_status": result[0],
        "is_online": result[1] or False,
        "rating": result[2] or 5.0,
        "total_deliveries": result[3] or 0,
        "documents_verified": result[4] or False,
        "stripe_onboarded": result[5] or False,
        "went_online_at": result[6].isoformat() if result[6] else None,
        "went_offline_at": result[7].isoformat() if result[7] else None
    }


# =============================================================================
# ROUTES - FCM TOKEN
# =============================================================================

@app.put("/api/driver/fcm-token", tags=["Notifications"])
async def update_fcm_token(
    driver_id: int,
    token_update: FCMTokenUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver's FCM token for push notifications.
    """
    db.execute(
        text("""
            UPDATE drivers
            SET fcm_token = :token,
                device_type = :device_type,
                fcm_token_updated_at = :now
            WHERE id = :driver_id
        """),
        {
            "token": token_update.fcm_token,
            "device_type": token_update.device_type,
            "now": datetime.utcnow(),
            "driver_id": driver_id
        }
    )
    db.commit()

    return {"success": True, "message": "FCM token updated"}


# =============================================================================
# ROUTES - DOCUMENTS
# =============================================================================

@app.get("/api/driver/documents", response_model=List[DocumentResponse], tags=["Documents"])
async def get_driver_documents(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all documents for a driver.
    """
    results = db.execute(
        text("""
            SELECT id, document_type, document_url, status, expiry_date, uploaded_at, verified_at
            FROM driver_documents
            WHERE driver_id = :driver_id
            ORDER BY uploaded_at DESC
        """),
        {"driver_id": driver_id}
    ).fetchall()

    return [
        DocumentResponse(
            id=r[0],
            document_type=r[1],
            document_url=r[2],
            status=r[3],
            expiry_date=r[4],
            uploaded_at=r[5],
            verified_at=r[6]
        )
        for r in results
    ]


@app.post("/api/driver/documents", tags=["Documents"])
async def upload_driver_document(
    driver_id: int,
    document: DocumentUpload,
    db: Session = Depends(get_db)
):
    """
    Upload a driver document.

    Error Codes:
    - DRV-101: Driver not found
    - DRV-401: Invalid document type
    """
    # Check if driver exists
    driver = db.execute(
        text("SELECT id FROM drivers WHERE id = :id"),
        {"id": driver_id}
    ).fetchone()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    # Insert document
    db.execute(
        text("""
            INSERT INTO driver_documents (driver_id, document_type, document_url, status, expiry_date, uploaded_at)
            VALUES (:driver_id, :doc_type, :doc_url, 'pending', :expiry, :now)
        """),
        {
            "driver_id": driver_id,
            "doc_type": document.document_type.value,
            "doc_url": document.document_url,
            "expiry": document.expiry_date,
            "now": datetime.utcnow()
        }
    )
    db.commit()

    logger.info("Driver document uploaded", driver_id=driver_id, doc_type=document.document_type.value)

    return {"success": True, "message": "Document uploaded for review"}


# =============================================================================
# ROUTES - EARNINGS
# =============================================================================

@app.get("/api/driver/earnings", response_model=DriverEarningsResponse, tags=["Earnings"])
async def get_driver_earnings(
    driver_id: int,
    period: str = Query("today", regex="^(today|week|month|all)$"),
    db: Session = Depends(get_db)
):
    """
    Get driver earnings summary.

    Period options: today, week, month, all

    Error Codes:
    - DRV-101: Driver not found
    """
    # Determine date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:  # all
        start_date = datetime(2020, 1, 1)

    # Get earnings from payouts
    result = db.execute(
        text("""
            SELECT
                COUNT(*) as total_deliveries,
                COALESCE(SUM(delivery_fee), 0) as delivery_earnings,
                COALESCE(SUM(tip), 0) as tips,
                COALESCE(SUM(bonus), 0) as bonuses,
                COALESCE(SUM(deductions), 0) as deductions,
                COALESCE(SUM(net_payout), 0) as net_earnings
            FROM driver_payouts
            WHERE driver_id = :driver_id
              AND period_start >= :start_date
        """),
        {"driver_id": driver_id, "start_date": start_date}
    ).fetchone()

    # Get driver_id string
    driver = db.execute(
        text("SELECT driver_id FROM drivers WHERE id = :id"),
        {"id": driver_id}
    ).fetchone()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    return DriverEarningsResponse(
        driver_id=driver[0],
        period=period,
        total_deliveries=result[0] or 0,
        delivery_earnings=result[1] or 0.0,
        tips=result[2] or 0.0,
        bonuses=result[3] or 0.0,
        deductions=result[4] or 0.0,
        net_earnings=result[5] or 0.0
    )


@app.get("/api/driver/earnings/history", tags=["Earnings"])
async def get_earnings_history(
    driver_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get detailed earnings history (individual payouts).
    """
    results = db.execute(
        text("""
            SELECT payout_number, period_start, period_end, total_deliveries,
                   delivery_fee, tip, bonus, deductions, net_payout, status, paid_at
            FROM driver_payouts
            WHERE driver_id = :driver_id
            ORDER BY period_end DESC
            LIMIT :limit OFFSET :offset
        """),
        {"driver_id": driver_id, "limit": limit, "offset": offset}
    ).fetchall()

    return {
        "payouts": [
            {
                "payout_number": r[0],
                "period_start": r[1].isoformat() if r[1] else None,
                "period_end": r[2].isoformat() if r[2] else None,
                "total_deliveries": r[3],
                "delivery_fee": r[4],
                "tip": r[5],
                "bonus": r[6],
                "deductions": r[7],
                "net_payout": r[8],
                "status": r[9],
                "paid_at": r[10].isoformat() if r[10] else None
            }
            for r in results
        ],
        "limit": limit,
        "offset": offset
    }


# =============================================================================
# ROUTES - ADMIN/ERP
# =============================================================================

@app.get("/erp/drivers", tags=["ERP"])
async def list_drivers(
    status_filter: Optional[str] = None,
    is_online: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List all drivers (ERP/Admin endpoint).
    """
    sql = """
        SELECT id, driver_id, first_name, last_name, email, phone, status,
               is_online, rating, total_deliveries, vehicle_type, created_at
        FROM drivers
        WHERE 1=1
    """
    params = {"limit": limit, "offset": offset}

    if status_filter:
        sql += " AND status = :status"
        params["status"] = status_filter
    if is_online is not None:
        sql += " AND is_online = :is_online"
        params["is_online"] = is_online

    sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

    # Safe: All values are parameterized, no user input in SQL structure
    results = db.execute(text(sql), params).fetchall()  # nosemgrep: python.sqlalchemy.security.audit.avoid-sqlalchemy-text.avoid-sqlalchemy-text

    return {
        "drivers": [
            {
                "id": r[0],
                "driver_id": r[1],
                "first_name": r[2],
                "last_name": r[3],
                "email": r[4],
                "phone": r[5],
                "status": r[6],
                "is_online": r[7],
                "rating": r[8],
                "total_deliveries": r[9],
                "vehicle_type": r[10],
                "created_at": r[11].isoformat() if r[11] else None
            }
            for r in results
        ],
        "limit": limit,
        "offset": offset
    }


@app.patch("/erp/drivers/{driver_id}/status", tags=["ERP"])
async def update_driver_approval_status(
    driver_id: int,
    new_status: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Update driver approval status (Admin action).
    """
    valid_statuses = ["pending", "approved", "active", "inactive", "suspended"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DRV-302", "message": f"Invalid status. Must be one of: {valid_statuses}"}
        )

    # Get driver info for notification
    driver = db.execute(
        text("SELECT email, first_name, driver_id FROM drivers WHERE id = :id"),
        {"id": driver_id}
    ).fetchone()

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DRV-101", "message": "Driver not found"}
        )

    # Update status
    now = datetime.utcnow()
    db.execute(
        text("""
            UPDATE drivers
            SET status = :status, updated_at = :now, approved_at = CASE WHEN :status = 'approved' THEN :now ELSE approved_at END
            WHERE id = :driver_id
        """),
        {"status": new_status, "now": now, "driver_id": driver_id}
    )
    db.commit()

    logger.info("Driver status updated", driver_id=driver_id, new_status=new_status)

    return {
        "success": True,
        "driver_id": driver_id,
        "new_status": new_status,
        "updated_at": now.isoformat()
    }


# =============================================================================
# HEALTH
# =============================================================================

@app.get("/api/driver/health", tags=["Health"])
async def driver_health(db: Session = Depends(get_db)):
    """Driver service health check"""
    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    # Count online drivers
    online_count = db.execute(
        text("SELECT COUNT(*) FROM drivers WHERE is_online = true")
    ).scalar() or 0

    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "online_drivers": online_count,
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
