"""
Dollor.ai - Location Service
=============================

Microservice handling location and geospatial operations:
- Driver location updates and real-time tracking
- Geocoding (address to coordinates)
- Reverse geocoding (coordinates to address)
- Distance and ETA calculations
- Nearby driver search (within radius)
- Geofencing for delivery zones

Port: 8007
Error Prefix: LOC
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import math
import json

from fastapi import Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, create_engine, Index
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import redis
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

# Add shared library to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))

from common import (
    MicroserviceFactory,
    create_logger,
    LocationErrors,
    ErrorResponse,
)

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "location-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8007

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")

# Redis for caching and real-time tracking
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_TTL = int(os.getenv("REDIS_TTL", "300"))  # 5 minutes default

# Geocoding
GEOCODING_USER_AGENT = os.getenv("GEOCODING_USER_AGENT", "dollor-ai-location-service")

# Service area bounds (example: San Francisco Bay Area)
SERVICE_AREA_CENTER_LAT = float(os.getenv("SERVICE_AREA_CENTER_LAT", "37.7749"))
SERVICE_AREA_CENTER_LON = float(os.getenv("SERVICE_AREA_CENTER_LON", "-122.4194"))
SERVICE_AREA_RADIUS_KM = float(os.getenv("SERVICE_AREA_RADIUS_KM", "50"))

# Delivery settings
MAX_DELIVERY_RADIUS_KM = float(os.getenv("MAX_DELIVERY_RADIUS_KM", "10"))
AVERAGE_SPEED_KMH = float(os.getenv("AVERAGE_SPEED_KMH", "40"))  # Average delivery speed

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
# REDIS SETUP
# =============================================================================

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


def get_redis():
    """Redis client dependency"""
    return redis_client


# =============================================================================
# DATABASE MODELS
# =============================================================================

class DriverLocation(Base):
    """Real-time driver location tracking"""
    __tablename__ = "driver_locations"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, nullable=False, index=True)

    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    heading = Column(Float)  # Direction in degrees (0-360)
    speed = Column(Float)  # Speed in km/h
    accuracy = Column(Float)  # GPS accuracy in meters

    # Status
    is_available = Column(Boolean, default=True)
    is_on_delivery = Column(Boolean, default=False)
    current_order_id = Column(Integer)

    # Timestamps
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_driver_location_active', 'driver_id', 'is_available', 'recorded_at'),
        Index('idx_driver_location_coords', 'latitude', 'longitude'),
    )


class DeliveryZone(Base):
    """Geofencing zones for delivery coverage"""
    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    city = Column(String(100), index=True)
    state = Column(String(100))

    # Center point
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)

    # Zone definition
    radius_km = Column(Float, nullable=False)  # Circular zone radius
    polygon_coordinates = Column(JSON)  # Optional: Custom polygon boundary

    # Pricing
    base_delivery_fee = Column(Float, default=0.0)
    per_km_fee = Column(Float, default=0.0)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LocationCache(Base):
    """Cache for geocoding results"""
    __tablename__ = "location_cache"

    id = Column(Integer, primary_key=True, index=True)

    # Address
    address = Column(String(500), unique=True, index=True)

    # Coordinates
    latitude = Column(Float)
    longitude = Column(Float)

    # Formatted address from geocoder
    formatted_address = Column(String(500))

    # Additional data
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))

    # Metadata
    geocoder_used = Column(String(50))
    cache_hits = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class LocationUpdate(BaseModel):
    driver_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    heading: Optional[float] = Field(None, ge=0, lt=360)
    speed: Optional[float] = Field(None, ge=0)
    accuracy: Optional[float] = Field(None, ge=0)
    is_available: bool = True
    is_on_delivery: bool = False
    current_order_id: Optional[int] = None


class LocationResponse(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    heading: Optional[float] = None
    speed: Optional[float] = None
    accuracy: Optional[float] = None
    is_available: bool
    is_on_delivery: bool
    current_order_id: Optional[int] = None
    recorded_at: datetime
    age_seconds: Optional[int] = None

    class Config:
        from_attributes = True


class GeocodeRequest(BaseModel):
    address: str = Field(..., min_length=5, max_length=500)


class GeocodeResponse(BaseModel):
    address: str
    formatted_address: str
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    from_cache: bool = False


class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ReverseGeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None


class DistanceRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)


class DistanceResponse(BaseModel):
    distance_km: float
    distance_miles: float
    estimated_duration_minutes: int
    origin: Dict[str, float]
    destination: Dict[str, float]


class NearbyDriversRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, gt=0, le=50)
    available_only: bool = True
    limit: int = Field(default=10, ge=1, le=100)


class NearbyDriver(BaseModel):
    driver_id: int
    latitude: float
    longitude: float
    distance_km: float
    eta_minutes: int
    is_available: bool
    is_on_delivery: bool


class NearbyDriversResponse(BaseModel):
    location: Dict[str, float]
    radius_km: float
    drivers: List[NearbyDriver]
    total_found: int


class DeliveryZoneCreate(BaseModel):
    name: str
    city: str
    state: Optional[str] = None
    center_latitude: float = Field(..., ge=-90, le=90)
    center_longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(..., gt=0)
    base_delivery_fee: float = Field(default=0.0, ge=0)
    per_km_fee: float = Field(default=0.0, ge=0)


class DeliveryZoneResponse(BaseModel):
    id: int
    name: str
    city: str
    state: Optional[str] = None
    center_latitude: float
    center_longitude: float
    radius_km: float
    base_delivery_fee: float
    per_km_fee: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# CREATE MICROSERVICE
# =============================================================================

logger = create_logger(SERVICE_NAME)

app = MicroserviceFactory.create(
    name=SERVICE_NAME,
    version=SERVICE_VERSION,
    description="Location and geospatial services for Dollor.ai platform"
)

# Initialize geocoder
geocoder = Nominatim(user_agent=GEOCODING_USER_AGENT)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using geodesic distance.
    Returns distance in kilometers.
    """
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    return geodesic(point1, point2).kilometers


def calculate_eta(distance_km: float, speed_kmh: float = AVERAGE_SPEED_KMH) -> int:
    """
    Calculate estimated time of arrival in minutes.
    """
    if distance_km <= 0:
        return 0
    hours = distance_km / speed_kmh
    minutes = int(hours * 60)
    return max(1, minutes)  # At least 1 minute


def is_within_service_area(latitude: float, longitude: float) -> bool:
    """Check if coordinates are within service area"""
    distance = calculate_distance(
        SERVICE_AREA_CENTER_LAT,
        SERVICE_AREA_CENTER_LON,
        latitude,
        longitude
    )
    return distance <= SERVICE_AREA_RADIUS_KM


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate coordinate values"""
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


# =============================================================================
# DRIVER LOCATION TRACKING ENDPOINTS
# =============================================================================

@app.post("/api/locations/driver", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def update_driver_location(
    location: LocationUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis_db: redis.Redis = Depends(get_redis)
):
    """Update driver's current location"""

    # Validate coordinates
    if not validate_coordinates(location.latitude, location.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid coordinates",
                details={"latitude": location.latitude, "longitude": location.longitude}
            ).model_dump()
        )

    # Check if within service area
    if not is_within_service_area(location.latitude, location.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-102",
                message="Location outside service area",
                details={"latitude": location.latitude, "longitude": location.longitude}
            ).model_dump()
        )

    # Store in database
    db_location = DriverLocation(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)

    # Cache in Redis for real-time access
    redis_key = f"driver_location:{location.driver_id}"
    location_data = {
        "driver_id": location.driver_id,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "heading": location.heading,
        "speed": location.speed,
        "accuracy": location.accuracy,
        "is_available": location.is_available,
        "is_on_delivery": location.is_on_delivery,
        "current_order_id": location.current_order_id,
        "recorded_at": db_location.recorded_at.isoformat(),
    }
    redis_db.setex(redis_key, REDIS_TTL, json.dumps(location_data))

    # Also store in geospatial index for nearby searches
    if location.is_available and not location.is_on_delivery:
        redis_db.geoadd(
            "available_drivers",
            location.longitude,
            location.latitude,
            location.driver_id
        )
        redis_db.expire("available_drivers", REDIS_TTL)

    logger.info(f"Updated location for driver {location.driver_id}")

    response = LocationResponse.model_validate(db_location)
    response.age_seconds = 0
    return response


@app.get("/api/locations/driver/{driver_id}", response_model=LocationResponse)
async def get_driver_location(
    driver_id: int,
    db: Session = Depends(get_db),
    redis_db: redis.Redis = Depends(get_redis)
):
    """Get current location of a driver"""

    # Try Redis cache first
    redis_key = f"driver_location:{driver_id}"
    cached_data = redis_db.get(redis_key)

    if cached_data:
        location_data = json.loads(cached_data)
        recorded_at = datetime.fromisoformat(location_data["recorded_at"])
        age_seconds = int((datetime.utcnow() - recorded_at).total_seconds())

        return LocationResponse(
            driver_id=location_data["driver_id"],
            latitude=location_data["latitude"],
            longitude=location_data["longitude"],
            heading=location_data.get("heading"),
            speed=location_data.get("speed"),
            accuracy=location_data.get("accuracy"),
            is_available=location_data["is_available"],
            is_on_delivery=location_data["is_on_delivery"],
            current_order_id=location_data.get("current_order_id"),
            recorded_at=recorded_at,
            age_seconds=age_seconds
        )

    # Fall back to database
    location = db.query(DriverLocation).filter(
        DriverLocation.driver_id == driver_id
    ).order_by(DriverLocation.recorded_at.desc()).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="LOC-301",
                message="Driver location not found",
                details={"driver_id": driver_id}
            ).model_dump()
        )

    age_seconds = int((datetime.utcnow() - location.recorded_at).total_seconds())
    response = LocationResponse.model_validate(location)
    response.age_seconds = age_seconds
    return response


@app.get("/api/locations/driver/{driver_id}/history")
async def get_driver_location_history(
    driver_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    """Get historical locations for a driver"""

    query = db.query(DriverLocation).filter(DriverLocation.driver_id == driver_id)

    if start_time:
        query = query.filter(DriverLocation.recorded_at >= start_time)
    if end_time:
        query = query.filter(DriverLocation.recorded_at <= end_time)

    locations = query.order_by(DriverLocation.recorded_at.desc()).limit(limit).all()

    return {
        "driver_id": driver_id,
        "total_records": len(locations),
        "locations": [LocationResponse.model_validate(loc) for loc in locations]
    }


# =============================================================================
# NEARBY DRIVER SEARCH ENDPOINTS
# =============================================================================

@app.post("/api/locations/nearby-drivers", response_model=NearbyDriversResponse)
async def find_nearby_drivers(
    request: NearbyDriversRequest,
    db: Session = Depends(get_db),
    redis_db: redis.Redis = Depends(get_redis)
):
    """Find drivers within a specified radius"""

    # Validate coordinates
    if not validate_coordinates(request.latitude, request.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid coordinates",
                details={"latitude": request.latitude, "longitude": request.longitude}
            ).model_dump()
        )

    nearby_drivers = []

    # Try Redis geospatial search first (faster for available drivers)
    if request.available_only:
        try:
            # Search using GEORADIUS
            results = redis_db.georadius(
                "available_drivers",
                request.longitude,
                request.latitude,
                request.radius_km,
                unit="km",
                withdist=True,
                withcoord=True,
                count=request.limit,
                sort="ASC"
            )

            for driver_id, distance, coords in results:
                driver_id = int(driver_id)
                lon, lat = coords
                distance_km = float(distance)
                eta_minutes = calculate_eta(distance_km)

                nearby_drivers.append(NearbyDriver(
                    driver_id=driver_id,
                    latitude=lat,
                    longitude=lon,
                    distance_km=round(distance_km, 2),
                    eta_minutes=eta_minutes,
                    is_available=True,
                    is_on_delivery=False
                ))
        except redis.exceptions.ResponseError:
            # Geospatial index might not exist, fall back to database
            logger.warning("Redis geospatial index not available, falling back to database")

    # If Redis didn't return results or not available_only, query database
    if not nearby_drivers:
        # Query recent locations
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        query = db.query(DriverLocation).filter(
            DriverLocation.recorded_at >= cutoff_time
        )

        if request.available_only:
            query = query.filter(
                DriverLocation.is_available == True,
                DriverLocation.is_on_delivery == False
            )

        # Get unique latest location per driver
        from sqlalchemy import distinct, func
        subquery = db.query(
            DriverLocation.driver_id,
            func.max(DriverLocation.recorded_at).label('max_time')
        ).group_by(DriverLocation.driver_id).subquery()

        locations = query.join(
            subquery,
            (DriverLocation.driver_id == subquery.c.driver_id) &
            (DriverLocation.recorded_at == subquery.c.max_time)
        ).all()

        # Calculate distances and filter by radius
        for location in locations:
            distance_km = calculate_distance(
                request.latitude,
                request.longitude,
                location.latitude,
                location.longitude
            )

            if distance_km <= request.radius_km:
                eta_minutes = calculate_eta(distance_km)

                nearby_drivers.append(NearbyDriver(
                    driver_id=location.driver_id,
                    latitude=location.latitude,
                    longitude=location.longitude,
                    distance_km=round(distance_km, 2),
                    eta_minutes=eta_minutes,
                    is_available=location.is_available,
                    is_on_delivery=location.is_on_delivery
                ))

        # Sort by distance and limit
        nearby_drivers.sort(key=lambda d: d.distance_km)
        nearby_drivers = nearby_drivers[:request.limit]

    logger.info(f"Found {len(nearby_drivers)} drivers within {request.radius_km}km")

    return NearbyDriversResponse(
        location={"latitude": request.latitude, "longitude": request.longitude},
        radius_km=request.radius_km,
        drivers=nearby_drivers,
        total_found=len(nearby_drivers)
    )


# =============================================================================
# GEOCODING ENDPOINTS
# =============================================================================

@app.post("/api/locations/geocode", response_model=GeocodeResponse)
async def geocode_address(
    request: GeocodeRequest,
    db: Session = Depends(get_db)
):
    """Convert address to coordinates (geocoding)"""

    # Check cache first
    cached = db.query(LocationCache).filter(
        LocationCache.address == request.address.strip()
    ).first()

    if cached:
        cached.cache_hits += 1
        cached.last_accessed = datetime.utcnow()
        db.commit()

        logger.info(f"Geocoding cache hit for: {request.address}")

        return GeocodeResponse(
            address=request.address,
            formatted_address=cached.formatted_address or request.address,
            latitude=cached.latitude,
            longitude=cached.longitude,
            city=cached.city,
            state=cached.state,
            country=cached.country,
            postal_code=cached.postal_code,
            from_cache=True
        )

    # Geocode using service
    try:
        location = geocoder.geocode(request.address, timeout=10)

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorResponse(
                    code="LOC-401",
                    message="Cannot calculate route - address not found",
                    details={"address": request.address}
                ).model_dump()
            )

        # Extract address components
        raw_data = location.raw
        address_data = raw_data.get('address', {})

        # Cache the result
        cache_entry = LocationCache(
            address=request.address.strip(),
            latitude=location.latitude,
            longitude=location.longitude,
            formatted_address=location.address,
            city=address_data.get('city') or address_data.get('town') or address_data.get('village'),
            state=address_data.get('state'),
            country=address_data.get('country'),
            postal_code=address_data.get('postcode'),
            geocoder_used="nominatim"
        )
        db.add(cache_entry)
        db.commit()

        logger.info(f"Geocoded address: {request.address}")

        return GeocodeResponse(
            address=request.address,
            formatted_address=location.address,
            latitude=location.latitude,
            longitude=location.longitude,
            city=cache_entry.city,
            state=cache_entry.state,
            country=cache_entry.country,
            postal_code=cache_entry.postal_code,
            from_cache=False
        )

    except GeocoderTimedOut:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=ErrorResponse(
                code="LOC-501",
                message="Maps API unavailable - request timed out",
                details={}
            ).model_dump()
        )
    except GeocoderServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorResponse(
                code="LOC-501",
                message="Maps API unavailable",
                details={"error": str(e)}
            ).model_dump()
        )


@app.post("/api/locations/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode(request: ReverseGeocodeRequest):
    """Convert coordinates to address (reverse geocoding)"""

    # Validate coordinates
    if not validate_coordinates(request.latitude, request.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid coordinates",
                details={"latitude": request.latitude, "longitude": request.longitude}
            ).model_dump()
        )

    try:
        location = geocoder.reverse(
            f"{request.latitude}, {request.longitude}",
            timeout=10
        )

        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorResponse(
                    code="LOC-401",
                    message="Cannot find address for coordinates",
                    details={"latitude": request.latitude, "longitude": request.longitude}
                ).model_dump()
            )

        # Extract address components
        raw_data = location.raw
        address_data = raw_data.get('address', {})

        logger.info(f"Reverse geocoded: ({request.latitude}, {request.longitude})")

        return ReverseGeocodeResponse(
            formatted_address=location.address,
            latitude=request.latitude,
            longitude=request.longitude,
            city=address_data.get('city') or address_data.get('town') or address_data.get('village'),
            state=address_data.get('state'),
            country=address_data.get('country'),
            postal_code=address_data.get('postcode')
        )

    except GeocoderTimedOut:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=ErrorResponse(
                code="LOC-501",
                message="Maps API unavailable - request timed out",
                details={}
            ).model_dump()
        )
    except GeocoderServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorResponse(
                code="LOC-501",
                message="Maps API unavailable",
                details={"error": str(e)}
            ).model_dump()
        )


# =============================================================================
# DISTANCE & ETA CALCULATION ENDPOINTS
# =============================================================================

@app.post("/api/locations/distance", response_model=DistanceResponse)
async def calculate_distance_between_points(request: DistanceRequest):
    """Calculate distance and ETA between two points"""

    # Validate coordinates
    if not validate_coordinates(request.origin_lat, request.origin_lon):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid origin coordinates",
                details={"latitude": request.origin_lat, "longitude": request.origin_lon}
            ).model_dump()
        )

    if not validate_coordinates(request.dest_lat, request.dest_lon):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid destination coordinates",
                details={"latitude": request.dest_lat, "longitude": request.dest_lon}
            ).model_dump()
        )

    # Calculate distance
    distance_km = calculate_distance(
        request.origin_lat,
        request.origin_lon,
        request.dest_lat,
        request.dest_lon
    )

    # Convert to miles
    distance_miles = distance_km * 0.621371

    # Calculate ETA
    eta_minutes = calculate_eta(distance_km)

    logger.info(f"Calculated distance: {distance_km:.2f}km, ETA: {eta_minutes}min")

    return DistanceResponse(
        distance_km=round(distance_km, 2),
        distance_miles=round(distance_miles, 2),
        estimated_duration_minutes=eta_minutes,
        origin={"latitude": request.origin_lat, "longitude": request.origin_lon},
        destination={"latitude": request.dest_lat, "longitude": request.dest_lon}
    )


# =============================================================================
# DELIVERY ZONE ENDPOINTS (GEOFENCING)
# =============================================================================

@app.post("/api/locations/zones", response_model=DeliveryZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_delivery_zone(zone: DeliveryZoneCreate, db: Session = Depends(get_db)):
    """Create a new delivery zone"""

    db_zone = DeliveryZone(**zone.model_dump())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)

    logger.info(f"Created delivery zone: {db_zone.name}")
    return db_zone


@app.get("/api/locations/zones", response_model=List[DeliveryZoneResponse])
async def get_delivery_zones(
    city: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all delivery zones"""

    query = db.query(DeliveryZone)

    if city:
        query = query.filter(DeliveryZone.city.ilike(f"%{city}%"))

    if active_only:
        query = query.filter(DeliveryZone.is_active == True)

    zones = query.all()
    return zones


@app.get("/api/locations/zones/{zone_id}", response_model=DeliveryZoneResponse)
async def get_delivery_zone(zone_id: int, db: Session = Depends(get_db)):
    """Get a specific delivery zone"""

    zone = db.query(DeliveryZone).filter(DeliveryZone.id == zone_id).first()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                code="LOC-301",
                message="Delivery zone not found",
                details={"zone_id": zone_id}
            ).model_dump()
        )

    return zone


@app.post("/api/locations/zones/check")
async def check_delivery_zone(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """Check if a location is within any delivery zone"""

    # Validate coordinates
    if not validate_coordinates(latitude, longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                code="LOC-101",
                message="Invalid coordinates",
                details={"latitude": latitude, "longitude": longitude}
            ).model_dump()
        )

    zones = db.query(DeliveryZone).filter(DeliveryZone.is_active == True).all()

    covered_zones = []
    for zone in zones:
        distance_km = calculate_distance(
            latitude,
            longitude,
            zone.center_latitude,
            zone.center_longitude
        )

        if distance_km <= zone.radius_km:
            covered_zones.append({
                "zone_id": zone.id,
                "zone_name": zone.name,
                "city": zone.city,
                "distance_from_center_km": round(distance_km, 2),
                "base_delivery_fee": zone.base_delivery_fee,
                "per_km_fee": zone.per_km_fee,
                "estimated_delivery_fee": round(
                    zone.base_delivery_fee + (distance_km * zone.per_km_fee), 2
                )
            })

    if not covered_zones:
        return {
            "is_covered": False,
            "location": {"latitude": latitude, "longitude": longitude},
            "zones": [],
            "message": "Location is not within any active delivery zone"
        }

    return {
        "is_covered": True,
        "location": {"latitude": latitude, "longitude": longitude},
        "zones": covered_zones,
        "message": f"Location is covered by {len(covered_zones)} zone(s)"
    }


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@app.get("/api/locations/service-area")
async def get_service_area():
    """Get service area configuration"""
    return {
        "center": {
            "latitude": SERVICE_AREA_CENTER_LAT,
            "longitude": SERVICE_AREA_CENTER_LON
        },
        "radius_km": SERVICE_AREA_RADIUS_KM,
        "max_delivery_radius_km": MAX_DELIVERY_RADIUS_KM,
        "average_speed_kmh": AVERAGE_SPEED_KMH
    }


@app.delete("/api/locations/driver/{driver_id}/clear-cache")
async def clear_driver_location_cache(
    driver_id: int,
    redis_db: redis.Redis = Depends(get_redis)
):
    """Clear cached location for a driver"""

    redis_key = f"driver_location:{driver_id}"
    deleted = redis_db.delete(redis_key)

    # Also remove from geospatial index
    redis_db.zrem("available_drivers", driver_id)

    logger.info(f"Cleared location cache for driver {driver_id}")

    return {
        "driver_id": driver_id,
        "cache_cleared": deleted > 0
    }


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    Base.metadata.create_all(bind=engine)
    logger.info(f"{SERVICE_NAME} v{SERVICE_VERSION} started on port {SERVICE_PORT}")
    logger.info(f"Service area: ({SERVICE_AREA_CENTER_LAT}, {SERVICE_AREA_CENTER_LON}) radius {SERVICE_AREA_RADIUS_KM}km")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
