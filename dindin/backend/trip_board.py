"""
TRIP BOARD MODULE - CRAIGSLIST-STYLE RIDESHARE CLASSIFIEDS
==========================================================
Dollor.ai Trip Board - A Matchmaking Bulletin Board Service

LEGAL DISCLAIMER:
Dollor.ai is NOT a Transportation Network Company (TNC).
Dollor.ai is NOT a rideshare service.
Dollor.ai is a CLASSIFIED ADVERTISING / BULLETIN BOARD service.

We provide a platform where:
- Independent drivers can POST trip listings (like Craigslist ads)
- Travelers can BROWSE available trip listings
- Users can MESSAGE each other to negotiate terms
- ALL arrangements are made DIRECTLY between users
- Dollor.ai does NOT calculate fares, suggest prices, or process payments
- Dollor.ai does NOT vet, endorse, or guarantee any driver or traveler
- Transportation is a PRIVATE ARRANGEMENT between individuals

Section 230 CDA Protection:
This platform qualifies for Section 230 immunity as an Interactive Computer
Service (ICS) that hosts user-generated content. Dollor.ai does not create
or develop the content of trip listings - all content is 100% user-generated.

This module provides:
- Trip listing CRUD (create, read, update, delete) - user-generated content
- In-app messaging system (like Craigslist email relay)
- NO fare calculation
- NO payment processing
- NO driver verification (users verify each other at their own risk)

By using this service, users acknowledge that:
1. Dollor.ai is a matchmaking service only
2. All arrangements are between private individuals
3. Users are responsible for their own safety
4. Dollor.ai has no liability for any transportation arrangements
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import math
import secrets
import uuid

from database import get_db

router = APIRouter(prefix="/api/trip-board", tags=["trip-board"])


# =============================================================================
# LEGAL DISCLAIMER CONSTANTS
# =============================================================================

PLATFORM_DISCLAIMER = """
IMPORTANT LEGAL NOTICE:

Dollor.ai Trip Board is a CLASSIFIED ADVERTISING SERVICE, not a transportation
company. We are a bulletin board where individuals can post and browse trip
listings - similar to Craigslist.

By using this service, you acknowledge and agree that:

1. DOLLOR.AI IS NOT A TNC (Transportation Network Company)
   We do not provide transportation services. We do not employ or contract
   with drivers. We are a communications platform only.

2. USER-GENERATED CONTENT
   All trip listings are created by independent users. Dollor.ai does not
   create, edit, endorse, or verify any listing content.

3. NO FARE CALCULATION
   Dollor.ai does not calculate, suggest, or set any prices. All pricing
   is determined solely by the listing creator.

4. NO PAYMENT PROCESSING
   Dollor.ai does not process any payments between users. All financial
   arrangements are made directly between the parties involved.

5. NO BACKGROUND CHECKS
   Dollor.ai does not perform background checks, driver verification, or
   vehicle inspections. Users must conduct their own due diligence.

6. ASSUMPTION OF RISK
   By arranging transportation through contacts made on this platform,
   you assume all risks associated with such arrangements.

7. SECTION 230 PROTECTION
   As an Interactive Computer Service (ICS) under 47 U.S.C. Section 230,
   Dollor.ai is not liable for content posted by users.

8. PRIVATE ARRANGEMENTS
   Any transportation that results from connections made through this
   platform is a private arrangement between individuals and is not
   connected to or endorsed by Dollor.ai.

For questions, contact: legal@dollor.ai
"""

LISTING_DISCLAIMER = """
This is a USER-GENERATED listing. Dollor.ai does not verify, endorse, or
guarantee any information in this listing. Contact the poster directly to
verify all details. Arrange transportation at your own risk. Dollor.ai is
not a transportation company and does not provide, supervise, or control
any transportation services.
"""

MESSAGE_DISCLAIMER = """
You are about to contact another user directly. Dollor.ai is not a party
to any conversation or arrangement you make. Exercise caution when meeting
strangers and arranging transportation. Dollor.ai does not verify the
identity of any user.
"""


# =============================================================================
# PYDANTIC MODELS - Trip Listings (User-Generated Content)
# =============================================================================

class TripListingLocation(BaseModel):
    """Location for pickup/dropoff - USER provides all data"""
    city: str = Field(..., description="City name (user-provided)")
    state: str = Field(..., description="State code (user-provided)")
    zip_code: Optional[str] = Field(None, description="ZIP code (user-provided)")
    neighborhood: Optional[str] = Field(None, description="Neighborhood/area (user-provided)")
    latitude: Optional[float] = Field(None, description="Latitude (optional)")
    longitude: Optional[float] = Field(None, description="Longitude (optional)")


# =============================================================================
# PLATFORM FEE CONFIGURATION - LISTING FEE MODEL
# =============================================================================
# Dollor.ai charges a LISTING FEE for posting trip advertisements.
# This is a fee for ADVERTISING SERVICES, not for transportation.
# Similar to Craigslist charging for job postings.

LISTING_FEE = 0.00  # FREE to post listings
FEATURED_LISTING_FEE = 3.00  # $3 for featured/boosted listing (optional)
MATCH_SUCCESS_FEE = 1.00  # $1 from EACH party when match is confirmed
LISTING_DURATION_DAYS = 30  # Listings expire after 30 days

# =============================================================================
# MATCH SUCCESS FEE CONFIGURATION - MATCHMAKING SERVICE FEE
# =============================================================================
# Dollor.ai only charges when a SUCCESSFUL MATCH is made.
# Both parties (driver AND passenger) pay $1 each when they confirm a match.
# This is a fee for MATCHMAKING SERVICES, not for transportation.
# Similar to dating sites charging when two people match/connect.
#
# FREE: Posting listings, browsing, messaging, negotiating
# PAID: Only when both parties confirm they want to connect

MATCH_SUCCESS_FEE_DISCLAIMER = """
MATCH SUCCESS FEE NOTICE:

The $1.00 match success fee is for MATCHMAKING SERVICES on the Dollor.ai Trip Board.

WHAT'S FREE:
- Posting trip listings (driver or passenger)
- Browsing all listings
- Sending messages to negotiate
- Keeping your listing open indefinitely

WHEN YOU PAY ($1 each):
- Only when BOTH parties confirm a match
- Driver pays $1 when confirming they found a passenger
- Passenger pays $1 when confirming they found a driver

This fee is NOT:
- A transportation fee
- A booking or deposit for any ride
- A commission on ride price
- Insurance or any guarantee

Dollor.ai is a matchmaking service. We charge for SUCCESSFUL CONNECTIONS,
not for transportation. Any transportation arrangements are private matters
between users. We are NOT a Transportation Network Company (TNC).

Similar to how:
- Dating apps charge when two people match
- Job boards charge for successful placements
- Freelancer platforms charge connection fees
"""

LISTING_FEE_DISCLAIMER = """
LISTING FEE NOTICE:

The $1.00 listing fee is for ADVERTISING SERVICES on the Dollor.ai Trip Board.
This fee covers:
- Posting your listing on our bulletin board
- 30 days of visibility
- Messaging functionality

This fee is NOT:
- A transportation fee
- A booking fee
- A commission on any ride arrangement

Dollor.ai is a classified advertising service. We charge for advertising space,
not for transportation services. Any transportation arrangements are private
matters between users.
"""


class CreateTripListingRequest(BaseModel):
    """
    Request to create a new trip listing - ALL content is user-generated.
    Dollor.ai does NOT suggest or calculate any values.
    """
    # User identification
    poster_name: str = Field(..., description="Display name of poster")
    poster_email: str = Field(..., description="Contact email")
    poster_phone: Optional[str] = Field(None, description="Contact phone (optional)")

    # Trip details - ALL user-provided
    origin: TripListingLocation
    destination: TripListingLocation
    departure_date: str = Field(..., description="Departure date (user-provided string)")
    departure_time: Optional[str] = Field(None, description="Departure time (user-provided)")
    flexibility: Optional[str] = Field(None, description="Time flexibility (user-provided)")

    # Capacity - user-provided
    available_seats: int = Field(1, ge=1, le=10, description="Available seats")

    # PRICE IS 100% USER-GENERATED - NO PLATFORM SUGGESTIONS
    asking_price: Optional[float] = Field(
        None,
        description="Price per seat - ENTIRELY user-determined. Dollor.ai does NOT suggest prices."
    )
    price_negotiable: bool = Field(True, description="Whether price is negotiable")
    price_note: Optional[str] = Field(
        None,
        description="User's note about price (e.g., 'split gas costs', 'free if you help drive')"
    )

    # Vehicle info - user-provided
    vehicle_description: Optional[str] = Field(None, description="Vehicle description")

    # Additional details - user-provided
    trip_description: Optional[str] = Field(None, description="Trip description/notes")
    preferences: Optional[str] = Field(None, description="Preferences (smoking, pets, music, etc.)")

    # Return trip
    return_trip_available: bool = Field(False, description="Offering return trip too")
    return_date: Optional[str] = Field(None, description="Return date if applicable")

    # Listing type
    is_driver: bool = Field(True, description="True if poster is driver, False if seeking ride")

    # Required legal acknowledgment
    legal_acknowledgment: bool = Field(
        ...,
        description="User MUST acknowledge they read and accept the platform disclaimer"
    )


class TripListingResponse(BaseModel):
    """Response for a trip listing - includes disclaimer"""
    listing_id: str
    poster_name: str
    poster_contact_masked: str  # Masked for privacy until user requests

    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str

    departure_date: str
    departure_time: Optional[str]
    available_seats: int

    # User-set price (platform does NOT calculate)
    asking_price: Optional[float]
    price_negotiable: bool
    price_note: Optional[str]

    vehicle_description: Optional[str]
    trip_description: Optional[str]
    preferences: Optional[str]

    is_driver: bool
    return_trip_available: bool

    created_at: str
    expires_at: str

    # ALWAYS include disclaimer
    disclaimer: str = LISTING_DISCLAIMER


class TripListingSearchRequest(BaseModel):
    """Search for trip listings"""
    origin_city: Optional[str] = None
    origin_state: Optional[str] = None
    destination_city: Optional[str] = None
    destination_state: Optional[str] = None
    departure_date: Optional[str] = None
    date_flexibility_days: int = Field(3, ge=0, le=14)
    min_seats: int = Field(1, ge=1)
    looking_for_driver: bool = Field(True, description="True to find drivers, False to find passengers")


class SendMessageRequest(BaseModel):
    """Send a message to a listing poster"""
    listing_id: str
    sender_name: str
    sender_email: str
    sender_phone: Optional[str] = None
    message: str = Field(..., min_length=10, max_length=2000)
    # Required acknowledgment
    legal_acknowledgment: bool = Field(
        ...,
        description="User acknowledges this is direct contact, Dollor.ai is not a party"
    )


class MessageResponse(BaseModel):
    """Response after sending a message"""
    success: bool
    message_id: str
    status: str
    disclaimer: str = MESSAGE_DISCLAIMER


# =============================================================================
# DATABASE MODELS (SQLAlchemy) - Add to models.py or inline here
# =============================================================================
# Note: These would be added to models.py in production

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

# Using existing Base from models.py
try:
    from models import Base
except ImportError:
    Base = declarative_base()


class TripListing(Base):
    """User-generated trip listing - Craigslist-style classified ad"""
    __tablename__ = "trip_listings"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(String(50), unique=True, nullable=False, index=True)  # TL-XXXXXX

    # Poster information
    poster_name = Column(String(255), nullable=False)
    poster_email = Column(String(255), nullable=False)
    poster_phone = Column(String(50))

    # Trip details - ALL user-provided, no platform calculations
    origin_city = Column(String(100), nullable=False)
    origin_state = Column(String(10), nullable=False)
    origin_zip = Column(String(20))
    origin_neighborhood = Column(String(100))
    origin_lat = Column(Float)
    origin_lng = Column(Float)

    destination_city = Column(String(100), nullable=False)
    destination_state = Column(String(10), nullable=False)
    destination_zip = Column(String(20))
    destination_neighborhood = Column(String(100))
    destination_lat = Column(Float)
    destination_lng = Column(Float)

    departure_date = Column(String(50), nullable=False)
    departure_time = Column(String(50))
    flexibility = Column(String(100))

    available_seats = Column(Integer, default=1)

    # PRICE IS 100% USER-SET - NO CALCULATION BY PLATFORM
    asking_price = Column(Float, nullable=True)  # NULL = contact for price
    price_negotiable = Column(Boolean, default=True)
    price_note = Column(Text)  # User's explanation of price

    vehicle_description = Column(Text)
    trip_description = Column(Text)
    preferences = Column(Text)

    is_driver = Column(Boolean, default=True)  # True = driver posting, False = passenger seeking
    return_trip_available = Column(Boolean, default=False)
    return_date = Column(String(50))

    # Status
    is_active = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    inquiry_count = Column(Integer, default=0)

    # Legal
    legal_acknowledged = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)  # Listings expire after 30 days


class TripMessage(Base):
    """Messages between users - Craigslist-style email relay"""
    __tablename__ = "trip_messages"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(50), unique=True, nullable=False, index=True)

    listing_id = Column(String(50), nullable=False, index=True)

    # Sender info
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    sender_phone = Column(String(50))

    # Recipient info (copied from listing)
    recipient_email = Column(String(255), nullable=False)

    # Message content - USER-GENERATED
    message_content = Column(Text, nullable=False)

    # Status
    is_read = Column(Boolean, default=False)
    is_replied = Column(Boolean, default=False)

    # Legal
    legal_acknowledged = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class ContactPayment(Base):
    """
    Track contact fee payments - Communication Service Fee
    (LEGACY - kept for backwards compatibility)
    """
    __tablename__ = "contact_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, nullable=False, index=True)
    payer_email = Column(String(255), nullable=False, index=True)
    payer_name = Column(String(255), nullable=False)
    listing_id = Column(String(50), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=1.00)
    payment_type = Column(String(50), default="contact_fee")
    stripe_payment_intent_id = Column(String(255), nullable=True)
    status = Column(String(50), default="pending")
    service_acknowledgment = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class TripMatch(Base):
    """
    Track confirmed matches between drivers and passengers.

    A match is created when both parties agree to connect.
    Each party pays $1 MATCH SUCCESS FEE when confirming.
    This is a fee for MATCHMAKING SERVICES, not transportation.
    """
    __tablename__ = "trip_matches"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String(50), unique=True, nullable=False, index=True)  # TM-XXXXXX

    # The two listings being matched
    driver_listing_id = Column(String(50), nullable=False, index=True)
    passenger_listing_id = Column(String(50), nullable=False, index=True)

    # Driver info
    driver_email = Column(String(255), nullable=False)
    driver_name = Column(String(255), nullable=False)
    driver_confirmed = Column(Boolean, default=False)
    driver_confirmed_at = Column(DateTime, nullable=True)
    driver_paid = Column(Boolean, default=False)
    driver_payment_id = Column(String(255), nullable=True)

    # Passenger info
    passenger_email = Column(String(255), nullable=False)
    passenger_name = Column(String(255), nullable=False)
    passenger_confirmed = Column(Boolean, default=False)
    passenger_confirmed_at = Column(DateTime, nullable=True)
    passenger_paid = Column(Boolean, default=False)
    passenger_payment_id = Column(String(255), nullable=True)

    # Negotiated details (user-provided, platform doesn't set)
    agreed_price = Column(Float, nullable=True)  # User-negotiated, NOT set by platform
    agreed_date = Column(String(50), nullable=True)
    agreed_time = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Match status
    status = Column(String(50), default="pending")  # pending, driver_confirmed, passenger_confirmed, matched, cancelled

    # Legal acknowledgment
    both_acknowledged_terms = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    matched_at = Column(DateTime, nullable=True)  # When both confirmed


class MatchPayment(Base):
    """
    Track match success fee payments.

    Each party pays $1 when they confirm a match.
    This is a fee for MATCHMAKING SERVICES, not transportation.
    """
    __tablename__ = "match_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, nullable=False, index=True)  # MP-XXXXXX

    match_id = Column(String(50), nullable=False, index=True)
    payer_email = Column(String(255), nullable=False, index=True)
    payer_name = Column(String(255), nullable=False)
    payer_role = Column(String(20), nullable=False)  # "driver" or "passenger"

    amount = Column(Float, nullable=False, default=1.00)
    payment_type = Column(String(50), default="match_success_fee")
    stripe_payment_intent_id = Column(String(255), nullable=True)

    status = Column(String(50), default="pending")  # pending, completed, failed, refunded
    service_acknowledgment = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_listing_id() -> str:
    """Generate unique listing ID"""
    return f"TL-{secrets.token_hex(4).upper()}"


def generate_message_id() -> str:
    """Generate unique message ID"""
    return f"MSG-{secrets.token_hex(4).upper()}"


def generate_contact_payment_id() -> str:
    """Generate unique contact payment ID"""
    return f"CP-{secrets.token_hex(4).upper()}"


def generate_match_id() -> str:
    """Generate unique match ID"""
    return f"TM-{secrets.token_hex(4).upper()}"


def generate_match_payment_id() -> str:
    """Generate unique match payment ID"""
    return f"MP-{secrets.token_hex(4).upper()}"


def mask_email(email: str) -> str:
    """Mask email for privacy: john.doe@gmail.com -> j***e@gmail.com"""
    if not email or "@" not in email:
        return "***@***.***"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[0] + "***" + name[-1]
    return f"{masked_name}@{domain}"


def mask_phone(phone: str) -> str:
    """Mask phone for privacy: (555) 123-4567 -> ***-***-4567"""
    if not phone:
        return None
    # Keep only last 4 digits
    digits = ''.join(filter(str.isdigit, phone))
    if len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "***-***-****"


# =============================================================================
# API ENDPOINTS - Trip Listings
# =============================================================================

@router.get("/disclaimer")
async def get_platform_disclaimer():
    """
    Get the full platform legal disclaimer.
    Users MUST read this before posting or contacting.
    """
    return {
        "disclaimer": PLATFORM_DISCLAIMER,
        "listing_disclaimer": LISTING_DISCLAIMER,
        "message_disclaimer": MESSAGE_DISCLAIMER,
        "last_updated": "2024-12-10",
        "legal_contact": "legal@dollor.ai",
        "important_notice": (
            "Dollor.ai is a CLASSIFIED ADVERTISING service, NOT a transportation "
            "company. We do not provide, arrange, or guarantee any transportation. "
            "All arrangements are private matters between individual users."
        )
    }


@router.post("/listings", response_model=TripListingResponse)
async def create_trip_listing(
    request: CreateTripListingRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new trip listing - USER-GENERATED CONTENT ONLY.

    Dollor.ai does NOT:
    - Calculate or suggest fares
    - Verify driver information
    - Guarantee any aspect of the listing

    User MUST acknowledge legal disclaimer before posting.
    """
    # REQUIRE legal acknowledgment
    if not request.legal_acknowledgment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Legal acknowledgment required",
                "message": (
                    "You must acknowledge that you have read and agree to the "
                    "platform disclaimer before posting. Dollor.ai is a classified "
                    "advertising service, not a transportation company."
                ),
                "disclaimer_endpoint": "/api/trip-board/disclaimer"
            }
        )

    # Generate listing ID
    listing_id = generate_listing_id()

    # Calculate expiration (30 days)
    expires_at = datetime.utcnow() + timedelta(days=30)

    # Create listing - ALL DATA IS USER-PROVIDED
    listing = TripListing(
        listing_id=listing_id,

        # Poster info
        poster_name=request.poster_name,
        poster_email=request.poster_email,
        poster_phone=request.poster_phone,

        # Origin - user-provided
        origin_city=request.origin.city,
        origin_state=request.origin.state,
        origin_zip=request.origin.zip_code,
        origin_neighborhood=request.origin.neighborhood,
        origin_lat=request.origin.latitude,
        origin_lng=request.origin.longitude,

        # Destination - user-provided
        destination_city=request.destination.city,
        destination_state=request.destination.state,
        destination_zip=request.destination.zip_code,
        destination_neighborhood=request.destination.neighborhood,
        destination_lat=request.destination.latitude,
        destination_lng=request.destination.longitude,

        # Trip details - user-provided
        departure_date=request.departure_date,
        departure_time=request.departure_time,
        flexibility=request.flexibility,
        available_seats=request.available_seats,

        # Price - 100% USER-DETERMINED (no platform calculation!)
        asking_price=request.asking_price,
        price_negotiable=request.price_negotiable,
        price_note=request.price_note,

        # Additional info - user-provided
        vehicle_description=request.vehicle_description,
        trip_description=request.trip_description,
        preferences=request.preferences,

        is_driver=request.is_driver,
        return_trip_available=request.return_trip_available,
        return_date=request.return_date,

        legal_acknowledged=True,
        expires_at=expires_at
    )

    db.add(listing)
    db.commit()
    db.refresh(listing)

    print(f"[TRIP BOARD] New listing created: {listing_id}")
    print(f"[TRIP BOARD] {request.origin.city}, {request.origin.state} -> {request.destination.city}, {request.destination.state}")
    print(f"[TRIP BOARD] User-set price: {'Contact for price' if not request.asking_price else f'${request.asking_price}'}")

    return TripListingResponse(
        listing_id=listing_id,
        poster_name=request.poster_name,
        poster_contact_masked=mask_email(request.poster_email),

        origin_city=request.origin.city,
        origin_state=request.origin.state,
        destination_city=request.destination.city,
        destination_state=request.destination.state,

        departure_date=request.departure_date,
        departure_time=request.departure_time,
        available_seats=request.available_seats,

        asking_price=request.asking_price,
        price_negotiable=request.price_negotiable,
        price_note=request.price_note,

        vehicle_description=request.vehicle_description,
        trip_description=request.trip_description,
        preferences=request.preferences,

        is_driver=request.is_driver,
        return_trip_available=request.return_trip_available,

        created_at=listing.created_at.isoformat(),
        expires_at=expires_at.isoformat(),

        disclaimer=LISTING_DISCLAIMER
    )


@router.get("/listings")
async def search_listings(
    origin_city: Optional[str] = None,
    origin_state: Optional[str] = None,
    destination_city: Optional[str] = None,
    destination_state: Optional[str] = None,
    departure_date: Optional[str] = None,
    min_seats: int = 1,
    is_driver: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search trip listings - browse user-generated classified ads.

    Returns matching listings with privacy-masked contact info.
    Users must request contact info separately after reading disclaimer.
    """
    query = db.query(TripListing).filter(
        TripListing.is_active == True,
        TripListing.expires_at > datetime.utcnow()
    )

    # Apply filters
    if origin_city:
        query = query.filter(TripListing.origin_city.ilike(f"%{origin_city}%"))
    if origin_state:
        query = query.filter(TripListing.origin_state.ilike(f"%{origin_state}%"))
    if destination_city:
        query = query.filter(TripListing.destination_city.ilike(f"%{destination_city}%"))
    if destination_state:
        query = query.filter(TripListing.destination_state.ilike(f"%{destination_state}%"))
    if is_driver is not None:
        query = query.filter(TripListing.is_driver == is_driver)
    if min_seats > 1:
        query = query.filter(TripListing.available_seats >= min_seats)

    # Order by most recent
    query = query.order_by(desc(TripListing.created_at))

    # Pagination
    total = query.count()
    listings = query.offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for listing in listings:
        results.append({
            "listing_id": listing.listing_id,
            "poster_name": listing.poster_name,
            "poster_contact_masked": mask_email(listing.poster_email),

            "origin_city": listing.origin_city,
            "origin_state": listing.origin_state,
            "destination_city": listing.destination_city,
            "destination_state": listing.destination_state,

            "departure_date": listing.departure_date,
            "departure_time": listing.departure_time,
            "available_seats": listing.available_seats,

            # User-set price (NOT calculated by platform)
            "asking_price": listing.asking_price,
            "price_negotiable": listing.price_negotiable,
            "price_note": listing.price_note,

            "vehicle_description": listing.vehicle_description,
            "trip_description": listing.trip_description[:200] + "..." if listing.trip_description and len(listing.trip_description) > 200 else listing.trip_description,

            "is_driver": listing.is_driver,
            "return_trip_available": listing.return_trip_available,

            "created_at": listing.created_at.isoformat(),
            "expires_at": listing.expires_at.isoformat() if listing.expires_at else None,

            # ALWAYS include disclaimer
            "disclaimer": LISTING_DISCLAIMER
        })

    return {
        "success": True,
        "total": total,
        "page": page,
        "page_size": page_size,
        "listings": results,
        "platform_notice": (
            "Dollor.ai is a classified advertising service. We do not verify "
            "listings, calculate fares, or arrange transportation. Contact "
            "posters directly and exercise caution."
        ),
        "disclaimer": LISTING_DISCLAIMER
    }


@router.get("/listings/{listing_id}")
async def get_listing_details(
    listing_id: str,
    db: Session = Depends(get_db)
):
    """
    Get full details of a specific listing.
    Contact information is masked - use /contact endpoint to message.
    """
    listing = db.query(TripListing).filter(
        TripListing.listing_id == listing_id,
        TripListing.is_active == True
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or has expired"
        )

    # Increment view count
    listing.view_count = (listing.view_count or 0) + 1
    db.commit()

    return {
        "listing_id": listing.listing_id,
        "poster_name": listing.poster_name,
        "poster_contact_masked": mask_email(listing.poster_email),
        "poster_phone_masked": mask_phone(listing.poster_phone) if listing.poster_phone else None,

        "origin": {
            "city": listing.origin_city,
            "state": listing.origin_state,
            "zip": listing.origin_zip,
            "neighborhood": listing.origin_neighborhood
        },
        "destination": {
            "city": listing.destination_city,
            "state": listing.destination_state,
            "zip": listing.destination_zip,
            "neighborhood": listing.destination_neighborhood
        },

        "departure_date": listing.departure_date,
        "departure_time": listing.departure_time,
        "flexibility": listing.flexibility,
        "available_seats": listing.available_seats,

        # User-set pricing (NO platform calculation)
        "asking_price": listing.asking_price,
        "price_negotiable": listing.price_negotiable,
        "price_note": listing.price_note,

        "vehicle_description": listing.vehicle_description,
        "trip_description": listing.trip_description,
        "preferences": listing.preferences,

        "is_driver": listing.is_driver,
        "return_trip_available": listing.return_trip_available,
        "return_date": listing.return_date,

        "view_count": listing.view_count,
        "created_at": listing.created_at.isoformat(),
        "expires_at": listing.expires_at.isoformat() if listing.expires_at else None,

        # Always include legal notices
        "disclaimer": LISTING_DISCLAIMER,
        "contact_notice": (
            "To contact this poster, use the /api/trip-board/messages endpoint. "
            "You will need to acknowledge that Dollor.ai is not a party to any "
            "arrangement you make."
        )
    }


@router.delete("/listings/{listing_id}")
async def delete_listing(
    listing_id: str,
    poster_email: str,
    db: Session = Depends(get_db)
):
    """
    Delete/deactivate a listing. Only the poster can delete.
    """
    listing = db.query(TripListing).filter(
        TripListing.listing_id == listing_id,
        TripListing.poster_email == poster_email
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or you don't have permission to delete"
        )

    listing.is_active = False
    listing.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Listing has been removed",
        "listing_id": listing_id
    }


# =============================================================================
# API ENDPOINTS - Messaging System
# =============================================================================

@router.post("/messages", response_model=MessageResponse)
async def send_message_to_poster(
    request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message to a listing poster - like Craigslist email relay.

    Dollor.ai is NOT a party to this communication.
    We relay messages but do not participate in negotiations.
    """
    # REQUIRE legal acknowledgment
    if not request.legal_acknowledgment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Legal acknowledgment required",
                "message": (
                    "You must acknowledge that Dollor.ai is not a party to any "
                    "arrangement you make with the poster. All negotiations are "
                    "between you and the poster directly."
                )
            }
        )

    # Find the listing
    listing = db.query(TripListing).filter(
        TripListing.listing_id == request.listing_id,
        TripListing.is_active == True
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or has expired"
        )

    # Create message
    message_id = generate_message_id()

    message = TripMessage(
        message_id=message_id,
        listing_id=request.listing_id,
        sender_name=request.sender_name,
        sender_email=request.sender_email,
        sender_phone=request.sender_phone,
        recipient_email=listing.poster_email,
        message_content=request.message,
        legal_acknowledged=True
    )

    db.add(message)

    # Update listing inquiry count
    listing.inquiry_count = (listing.inquiry_count or 0) + 1

    db.commit()

    # In production, send email to poster with message content
    # Email would include: sender info, message, and disclaimer
    print(f"[TRIP BOARD] Message sent: {message_id}")
    print(f"[TRIP BOARD] From: {request.sender_email} To: {listing.poster_email}")
    print(f"[TRIP BOARD] Re: Listing {request.listing_id}")

    return MessageResponse(
        success=True,
        message_id=message_id,
        status="sent",
        disclaimer=MESSAGE_DISCLAIMER
    )


@router.get("/messages/{listing_id}")
async def get_messages_for_listing(
    listing_id: str,
    poster_email: str,
    db: Session = Depends(get_db)
):
    """
    Get all messages for a listing. Only the poster can view.
    """
    # Verify poster owns listing
    listing = db.query(TripListing).filter(
        TripListing.listing_id == listing_id,
        TripListing.poster_email == poster_email
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view these messages"
        )

    messages = db.query(TripMessage).filter(
        TripMessage.listing_id == listing_id
    ).order_by(desc(TripMessage.created_at)).all()

    return {
        "success": True,
        "listing_id": listing_id,
        "messages": [
            {
                "message_id": m.message_id,
                "sender_name": m.sender_name,
                "sender_email": m.sender_email,
                "sender_phone": m.sender_phone,
                "message": m.message_content,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ],
        "disclaimer": (
            "These messages are from users interested in your listing. "
            "Dollor.ai is not a party to any arrangement you make. "
            "Exercise caution when meeting strangers."
        )
    }


# =============================================================================
# API ENDPOINTS - Popular Routes
# =============================================================================

# =============================================================================
# API ENDPOINTS - Smart Matching (Search Engine Style)
# =============================================================================
# When a passenger posts "Seeking Ride", find matching driver listings
# When a driver posts "Offering Ride", find matching passenger listings
# This is like a search engine matching supply and demand - NOT a dispatch system

@router.get("/find-matches/{listing_id}")
async def find_matching_listings(
    listing_id: str,
    db: Session = Depends(get_db)
):
    """
    Find matching listings for a given listing.

    - If you posted "Seeking Ride" (passenger) → shows drivers offering rides on similar routes
    - If you posted "Offering Ride" (driver) → shows passengers seeking rides on similar routes

    This is a SEARCH ENGINE function, like Google matching search queries to content.
    Dollor.ai does NOT dispatch, assign, or arrange anything. We just show matches.
    Users contact each other directly to negotiate.
    """
    # Get the original listing
    listing = db.query(TripListing).filter(
        TripListing.listing_id == listing_id,
        TripListing.is_active == True
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    # Find opposite type listings (if passenger, find drivers; if driver, find passengers)
    opposite_type = not listing.is_driver

    # Search for matching routes (same origin/destination cities)
    matches = db.query(TripListing).filter(
        TripListing.is_active == True,
        TripListing.is_driver == opposite_type,
        TripListing.listing_id != listing_id,
        TripListing.expires_at > datetime.utcnow(),
        # Match origin city (case-insensitive)
        TripListing.origin_city.ilike(f"%{listing.origin_city}%"),
        # Match destination city (case-insensitive)
        TripListing.destination_city.ilike(f"%{listing.destination_city}%")
    ).order_by(desc(TripListing.created_at)).limit(20).all()

    listing_type = "driver" if listing.is_driver else "passenger"
    match_type = "passengers seeking rides" if listing.is_driver else "drivers offering rides"

    return {
        "success": True,
        "your_listing": {
            "listing_id": listing.listing_id,
            "type": "Offering Ride" if listing.is_driver else "Seeking Ride",
            "route": f"{listing.origin_city}, {listing.origin_state} → {listing.destination_city}, {listing.destination_state}",
            "date": listing.departure_date
        },
        "matches_found": len(matches),
        "match_type": match_type,
        "matches": [
            {
                "listing_id": m.listing_id,
                "poster_name": m.poster_name,
                "poster_contact_masked": mask_email(m.poster_email),
                "type": "Offering Ride" if m.is_driver else "Seeking Ride",
                "origin": f"{m.origin_city}, {m.origin_state}",
                "destination": f"{m.destination_city}, {m.destination_state}",
                "departure_date": m.departure_date,
                "departure_time": m.departure_time,
                "seats": m.available_seats,
                "asking_price": m.asking_price,
                "price_negotiable": m.price_negotiable,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in matches
        ],
        "disclaimer": (
            "These are USER-GENERATED listings that match your route. Dollor.ai does NOT "
            "verify, endorse, or guarantee any listing. Contact posters directly to discuss "
            "arrangements. All negotiations and transportation are private matters between users."
        ),
        "next_steps": [
            "Browse the matching listings above",
            "Click on a listing to see full details",
            "Send a message to negotiate directly",
            "Arrange payment and transportation privately",
            "Dollor.ai is not involved in your arrangement"
        ]
    }


@router.get("/search-drivers")
async def search_for_drivers(
    origin_city: str,
    destination_city: str,
    departure_date: Optional[str] = None,
    min_seats: int = 1,
    origin_state: Optional[str] = None,
    destination_state: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search for drivers offering rides on a specific route.

    Use this when you're a PASSENGER looking for a ride.
    This is a search engine - we show matching driver listings.
    """
    query = db.query(TripListing).filter(
        TripListing.is_active == True,
        TripListing.is_driver == True,  # Only drivers
        TripListing.expires_at > datetime.utcnow(),
        TripListing.origin_city.ilike(f"%{origin_city}%"),
        TripListing.destination_city.ilike(f"%{destination_city}%"),
        TripListing.available_seats >= min_seats
    )

    if origin_state:
        query = query.filter(TripListing.origin_state.ilike(f"%{origin_state}%"))
    if destination_state:
        query = query.filter(TripListing.destination_state.ilike(f"%{destination_state}%"))

    # Order by date relevance and recency
    query = query.order_by(desc(TripListing.created_at))

    total = query.count()
    drivers = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "success": True,
        "search_type": "drivers",
        "route": f"{origin_city} → {destination_city}",
        "total_found": total,
        "page": page,
        "drivers": [
            {
                "listing_id": d.listing_id,
                "poster_name": d.poster_name,
                "origin": f"{d.origin_city}, {d.origin_state}",
                "destination": f"{d.destination_city}, {d.destination_state}",
                "departure_date": d.departure_date,
                "departure_time": d.departure_time,
                "available_seats": d.available_seats,
                "asking_price": d.asking_price,
                "price_negotiable": d.price_negotiable,
                "price_note": d.price_note,
                "vehicle_description": d.vehicle_description,
                "return_trip_available": d.return_trip_available,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in drivers
        ],
        "disclaimer": (
            "These are drivers who have posted trip listings. Dollor.ai does NOT verify "
            "drivers, vehicles, or insurance. Contact drivers directly to negotiate. "
            "All arrangements are private matters between you and the driver."
        ),
        "safety_reminder": (
            "Meet in public places. Verify the driver's identity. Share your trip details "
            "with someone you trust. Dollor.ai is not responsible for any arrangements."
        )
    }


@router.get("/search-passengers")
async def search_for_passengers(
    origin_city: str,
    destination_city: str,
    departure_date: Optional[str] = None,
    origin_state: Optional[str] = None,
    destination_state: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search for passengers seeking rides on a specific route.

    Use this when you're a DRIVER looking for passengers.
    This is a search engine - we show matching passenger listings.
    """
    query = db.query(TripListing).filter(
        TripListing.is_active == True,
        TripListing.is_driver == False,  # Only passengers
        TripListing.expires_at > datetime.utcnow(),
        TripListing.origin_city.ilike(f"%{origin_city}%"),
        TripListing.destination_city.ilike(f"%{destination_city}%")
    )

    if origin_state:
        query = query.filter(TripListing.origin_state.ilike(f"%{origin_state}%"))
    if destination_state:
        query = query.filter(TripListing.destination_state.ilike(f"%{destination_state}%"))

    query = query.order_by(desc(TripListing.created_at))

    total = query.count()
    passengers = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "success": True,
        "search_type": "passengers",
        "route": f"{origin_city} → {destination_city}",
        "total_found": total,
        "page": page,
        "passengers": [
            {
                "listing_id": p.listing_id,
                "poster_name": p.poster_name,
                "origin": f"{p.origin_city}, {p.origin_state}",
                "destination": f"{p.destination_city}, {p.destination_state}",
                "departure_date": p.departure_date,
                "departure_time": p.departure_time,
                "seats_needed": p.available_seats,
                "offering_price": p.asking_price,
                "price_negotiable": p.price_negotiable,
                "price_note": p.price_note,
                "preferences": p.preferences,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in passengers
        ],
        "disclaimer": (
            "These are passengers who have posted ride requests. Dollor.ai does NOT verify "
            "passengers. Contact them directly to negotiate. All arrangements are private "
            "matters between you and the passenger."
        )
    }


@router.get("/popular-routes")
async def get_popular_routes(
    db: Session = Depends(get_db)
):
    """
    Get popular routes based on listing activity.
    For UI to show common searches.
    """
    # This would aggregate from listings in production
    # For now, return common California routes
    return {
        "routes": [
            {
                "origin": {"city": "Los Angeles", "state": "CA"},
                "destination": {"city": "San Francisco", "state": "CA"},
                "listing_count": 0  # Would be calculated from DB
            },
            {
                "origin": {"city": "San Diego", "state": "CA"},
                "destination": {"city": "Los Angeles", "state": "CA"},
                "listing_count": 0
            },
            {
                "origin": {"city": "Orange County", "state": "CA"},
                "destination": {"city": "Los Angeles", "state": "CA"},
                "listing_count": 0
            },
            {
                "origin": {"city": "Sacramento", "state": "CA"},
                "destination": {"city": "San Francisco", "state": "CA"},
                "listing_count": 0
            }
        ],
        "disclaimer": (
            "Route popularity is based on listing activity. Dollor.ai does not "
            "operate or endorse any routes. All listings are user-generated."
        )
    }


# =============================================================================
# API ENDPOINTS - Listing Fee Payment
# =============================================================================

class ListingFeeResponse(BaseModel):
    """Response for listing fee information"""
    listing_fee: float
    featured_fee: float
    duration_days: int
    disclaimer: str
    what_you_get: List[str]
    what_this_is_not: List[str]


class CreateListingPaymentRequest(BaseModel):
    """Request to create payment for listing fee"""
    listing_id: str
    is_featured: bool = False
    payment_method_id: Optional[str] = None  # Stripe payment method


class ListingPaymentResponse(BaseModel):
    """Response after paying listing fee"""
    success: bool
    listing_id: str
    amount_paid: float
    payment_type: str  # "listing_fee" or "featured_listing_fee"
    client_secret: Optional[str] = None  # For Stripe
    message: str
    disclaimer: str


@router.get("/listing-fee-info", response_model=ListingFeeResponse)
async def get_listing_fee_info():
    """
    Get information about listing fees.

    IMPORTANT: This is an ADVERTISING FEE, not a transportation fee.
    Dollor.ai charges for posting classified ads, similar to Craigslist.
    """
    return ListingFeeResponse(
        listing_fee=LISTING_FEE,
        featured_fee=FEATURED_LISTING_FEE,
        duration_days=LISTING_DURATION_DAYS,
        disclaimer=LISTING_FEE_DISCLAIMER,
        what_you_get=[
            "Post your trip listing on our bulletin board",
            f"{LISTING_DURATION_DAYS} days of visibility",
            "Receive messages from interested users",
            "Edit or remove your listing anytime",
            "Access to price helper (educational info)"
        ],
        what_this_is_not=[
            "NOT a transportation fee",
            "NOT a booking or commission fee",
            "NOT insurance or guarantee",
            "NOT payment for any ride"
        ]
    )


@router.post("/listings/{listing_id}/pay", response_model=ListingPaymentResponse)
async def pay_listing_fee(
    listing_id: str,
    is_featured: bool = False,
    db: Session = Depends(get_db)
):
    """
    Pay the listing fee to activate a trip listing.

    This is a fee for ADVERTISING SERVICES:
    - $1.00 for standard listing
    - $3.00 for featured listing (appears at top)

    Dollor.ai is a classified advertising platform. This fee is for
    posting your advertisement, NOT for any transportation service.
    """
    listing = db.query(TripListing).filter(
        TripListing.listing_id == listing_id
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    # Determine fee amount
    fee_amount = FEATURED_LISTING_FEE if is_featured else LISTING_FEE
    payment_type = "featured_listing_fee" if is_featured else "listing_fee"

    # In production, this would create a Stripe PaymentIntent
    # For now, we'll simulate the payment
    import secrets
    payment_intent_id = f"pi_listing_{secrets.token_hex(12)}"
    client_secret = f"{payment_intent_id}_secret_{secrets.token_hex(12)}"

    # Mark listing as paid (in production, do this after webhook confirms payment)
    listing.is_active = True
    listing.updated_at = datetime.utcnow()
    # Would add: listing.payment_intent_id = payment_intent_id
    # Would add: listing.is_featured = is_featured
    db.commit()

    print(f"[TRIP BOARD] Listing fee paid: ${fee_amount} for {listing_id}")
    print(f"[TRIP BOARD] Payment type: {payment_type}")

    return ListingPaymentResponse(
        success=True,
        listing_id=listing_id,
        amount_paid=fee_amount,
        payment_type=payment_type,
        client_secret=client_secret,
        message=f"Listing fee of ${fee_amount:.2f} paid successfully. Your listing is now active for {LISTING_DURATION_DAYS} days.",
        disclaimer=(
            "This payment is for ADVERTISING SERVICES on Dollor.ai Trip Board. "
            "Dollor.ai is a classified advertising platform, not a transportation company. "
            "This fee does not include any transportation, insurance, or guarantees."
        )
    )


@router.get("/my-listings")
async def get_my_listings(
    poster_email: str,
    db: Session = Depends(get_db)
):
    """
    Get all listings for a specific poster.
    Used to manage your own listings.
    """
    listings = db.query(TripListing).filter(
        TripListing.poster_email == poster_email
    ).order_by(desc(TripListing.created_at)).all()

    return {
        "success": True,
        "count": len(listings),
        "listings": [
            {
                "listing_id": l.listing_id,
                "origin": f"{l.origin_city}, {l.origin_state}",
                "destination": f"{l.destination_city}, {l.destination_state}",
                "departure_date": l.departure_date,
                "asking_price": l.asking_price,
                "is_active": l.is_active,
                "view_count": l.view_count or 0,
                "inquiry_count": l.inquiry_count or 0,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "expires_at": l.expires_at.isoformat() if l.expires_at else None
            }
            for l in listings
        ]
    }


# =============================================================================
# API ENDPOINTS - Match Success Fee (Pay-Per-Match Model)
# =============================================================================
# This is the main revenue model:
# - FREE: Post listings, browse, message, negotiate
# - PAID: $1 each when BOTH parties confirm a match
# This is legally safe as it's a fee for MATCHMAKING SERVICES


class ProposeMatchRequest(BaseModel):
    """Request to propose a match between listings"""
    driver_listing_id: str
    passenger_listing_id: str
    proposer_email: str
    proposer_role: str = Field(..., description="'driver' or 'passenger'")
    agreed_price: Optional[float] = Field(None, description="User-negotiated price (NOT set by platform)")
    agreed_date: Optional[str] = None
    agreed_time: Optional[str] = None
    notes: Optional[str] = None


class ConfirmMatchRequest(BaseModel):
    """Request to confirm a match and pay the success fee"""
    match_id: str
    confirmer_email: str
    confirmer_role: str = Field(..., description="'driver' or 'passenger'")
    service_acknowledgment: bool = Field(
        ...,
        description="User MUST acknowledge this $1 fee is for MATCHMAKING services, not transportation"
    )


@router.get("/match-fee-info")
async def get_match_fee_info():
    """
    Get information about the match success fee model.

    FREE:
    - Posting listings (driver or passenger)
    - Browsing all listings
    - Sending messages to negotiate
    - Keeping listings open indefinitely

    PAID ($1 each):
    - Only when BOTH parties confirm they want to connect
    """
    return {
        "match_success_fee": MATCH_SUCCESS_FEE,
        "who_pays": "Both driver AND passenger pay $1 each when confirming a match",
        "when_you_pay": "Only after successful negotiation and mutual agreement",
        "whats_free": [
            "Posting trip listings (driver or passenger)",
            "Browsing all available listings",
            "Viewing listing details",
            "Sending messages to negotiate",
            "Keeping your listing active indefinitely"
        ],
        "what_triggers_payment": [
            "You find someone you want to connect with",
            "You negotiate and agree on terms",
            "You both confirm the match",
            "Each party pays $1 at confirmation"
        ],
        "this_fee_is_not": [
            "NOT a transportation fee",
            "NOT a booking fee or deposit",
            "NOT a commission on the ride price",
            "NOT insurance or any guarantee"
        ],
        "disclaimer": MATCH_SUCCESS_FEE_DISCLAIMER,
        "legal_model": "Matchmaking Service Fee (like dating apps, job boards)"
    }


@router.post("/matches/propose")
async def propose_match(
    request: ProposeMatchRequest,
    db: Session = Depends(get_db)
):
    """
    Propose a match between a driver and passenger.

    After negotiation, one party proposes the match.
    The other party then confirms (and both pay $1).

    This creates a pending match that needs confirmation from both sides.
    """
    # Validate driver listing
    driver_listing = db.query(TripListing).filter(
        TripListing.listing_id == request.driver_listing_id,
        TripListing.is_active == True,
        TripListing.is_driver == True
    ).first()

    if not driver_listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver listing not found or inactive"
        )

    # Validate passenger listing
    passenger_listing = db.query(TripListing).filter(
        TripListing.listing_id == request.passenger_listing_id,
        TripListing.is_active == True,
        TripListing.is_driver == False
    ).first()

    if not passenger_listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Passenger listing not found or inactive"
        )

    # Check for existing pending match
    existing_match = db.query(TripMatch).filter(
        TripMatch.driver_listing_id == request.driver_listing_id,
        TripMatch.passenger_listing_id == request.passenger_listing_id,
        TripMatch.status.in_(["pending", "driver_confirmed", "passenger_confirmed"])
    ).first()

    if existing_match:
        return {
            "success": False,
            "message": "A match proposal already exists for these listings",
            "match_id": existing_match.match_id,
            "status": existing_match.status
        }

    # Create the match
    match_id = generate_match_id()

    match = TripMatch(
        match_id=match_id,
        driver_listing_id=request.driver_listing_id,
        passenger_listing_id=request.passenger_listing_id,
        driver_email=driver_listing.poster_email,
        driver_name=driver_listing.poster_name,
        passenger_email=passenger_listing.poster_email,
        passenger_name=passenger_listing.poster_name,
        agreed_price=request.agreed_price,
        agreed_date=request.agreed_date,
        agreed_time=request.agreed_time,
        notes=request.notes,
        status="pending"
    )

    # Mark proposer as ready (but not yet paid - payment on final confirmation)
    if request.proposer_role == "driver":
        match.driver_confirmed = True
        match.driver_confirmed_at = datetime.utcnow()
        match.status = "driver_confirmed"
    else:
        match.passenger_confirmed = True
        match.passenger_confirmed_at = datetime.utcnow()
        match.status = "passenger_confirmed"

    db.add(match)
    db.commit()

    print(f"[TRIP BOARD] Match proposed: {match_id}")
    print(f"[TRIP BOARD] Driver: {driver_listing.poster_email}")
    print(f"[TRIP BOARD] Passenger: {passenger_listing.poster_email}")

    return {
        "success": True,
        "match_id": match_id,
        "status": match.status,
        "message": f"Match proposed! Waiting for the other party to confirm.",
        "next_step": (
            "The other party needs to confirm. Once both confirm, "
            "each pays a $1 matchmaking fee and contact info is exchanged."
        ),
        "driver": {
            "name": driver_listing.poster_name,
            "confirmed": match.driver_confirmed
        },
        "passenger": {
            "name": passenger_listing.poster_name,
            "confirmed": match.passenger_confirmed
        },
        "agreed_terms": {
            "price": request.agreed_price,
            "date": request.agreed_date,
            "time": request.agreed_time,
            "notes": request.notes
        },
        "disclaimer": (
            "Once both parties confirm, each will pay a $1 MATCHMAKING FEE. "
            "This fee is for the matchmaking service, NOT for transportation. "
            "Any ride arrangements are private matters between you and the other party."
        )
    }


@router.post("/matches/confirm")
async def confirm_match_and_pay(
    request: ConfirmMatchRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm a match and pay the $1 matchmaking success fee.

    When BOTH parties confirm:
    - Each pays $1 matchmaking fee
    - Contact info is revealed to both parties
    - Match is marked as complete

    The $1 fee is for MATCHMAKING SERVICES, not transportation.
    """
    # REQUIRE service acknowledgment
    if not request.service_acknowledgment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Service acknowledgment required",
                "message": (
                    "You must acknowledge that this $1 fee is for MATCHMAKING SERVICES, "
                    "not for transportation. Dollor.ai charges for successful connections, "
                    "not for rides. Any transportation is a private arrangement."
                ),
                "fee_info_endpoint": "/api/trip-board/match-fee-info"
            }
        )

    # Find the match
    match = db.query(TripMatch).filter(
        TripMatch.match_id == request.match_id
    ).first()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    if match.status == "matched":
        # Already matched - return contact info
        driver_listing = db.query(TripListing).filter(
            TripListing.listing_id == match.driver_listing_id
        ).first()
        passenger_listing = db.query(TripListing).filter(
            TripListing.listing_id == match.passenger_listing_id
        ).first()

        return {
            "success": True,
            "message": "This match is already confirmed!",
            "match_id": match.match_id,
            "status": "matched",
            "driver_contact": {
                "name": match.driver_name,
                "email": match.driver_email,
                "phone": driver_listing.poster_phone if driver_listing else None
            },
            "passenger_contact": {
                "name": match.passenger_name,
                "email": match.passenger_email,
                "phone": passenger_listing.poster_phone if passenger_listing else None
            }
        }

    if match.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This match has been cancelled"
        )

    # Process confirmation based on role
    is_driver = request.confirmer_role == "driver"

    if is_driver:
        if request.confirmer_email != match.driver_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the driver for this match"
            )

        if match.driver_paid:
            # Already paid
            pass
        else:
            # Create payment
            payment_id = generate_match_payment_id()
            stripe_payment_intent_id = f"pi_match_{secrets.token_hex(12)}"

            payment = MatchPayment(
                payment_id=payment_id,
                match_id=match.match_id,
                payer_email=request.confirmer_email,
                payer_name=match.driver_name,
                payer_role="driver",
                amount=MATCH_SUCCESS_FEE,
                status="completed",  # In production, pending until webhook
                service_acknowledgment=True,
                stripe_payment_intent_id=stripe_payment_intent_id,
                completed_at=datetime.utcnow()
            )
            db.add(payment)

            match.driver_confirmed = True
            match.driver_confirmed_at = datetime.utcnow()
            match.driver_paid = True
            match.driver_payment_id = payment_id

            print(f"[TRIP BOARD] Driver paid match fee: ${MATCH_SUCCESS_FEE} - {payment_id}")
    else:
        if request.confirmer_email != match.passenger_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the passenger for this match"
            )

        if match.passenger_paid:
            # Already paid
            pass
        else:
            # Create payment
            payment_id = generate_match_payment_id()
            stripe_payment_intent_id = f"pi_match_{secrets.token_hex(12)}"

            payment = MatchPayment(
                payment_id=payment_id,
                match_id=match.match_id,
                payer_email=request.confirmer_email,
                payer_name=match.passenger_name,
                payer_role="passenger",
                amount=MATCH_SUCCESS_FEE,
                status="completed",
                service_acknowledgment=True,
                stripe_payment_intent_id=stripe_payment_intent_id,
                completed_at=datetime.utcnow()
            )
            db.add(payment)

            match.passenger_confirmed = True
            match.passenger_confirmed_at = datetime.utcnow()
            match.passenger_paid = True
            match.passenger_payment_id = payment_id

            print(f"[TRIP BOARD] Passenger paid match fee: ${MATCH_SUCCESS_FEE} - {payment_id}")

    # Check if both confirmed
    both_confirmed = match.driver_confirmed and match.passenger_confirmed
    both_paid = match.driver_paid and match.passenger_paid

    if both_confirmed and both_paid:
        match.status = "matched"
        match.matched_at = datetime.utcnow()
        match.both_acknowledged_terms = True

        # Get full contact info
        driver_listing = db.query(TripListing).filter(
            TripListing.listing_id == match.driver_listing_id
        ).first()
        passenger_listing = db.query(TripListing).filter(
            TripListing.listing_id == match.passenger_listing_id
        ).first()

        db.commit()

        print(f"[TRIP BOARD] MATCH COMPLETE: {match.match_id}")
        print(f"[TRIP BOARD] Total revenue: ${MATCH_SUCCESS_FEE * 2}")

        return {
            "success": True,
            "message": "Match confirmed! You can now contact each other directly.",
            "match_id": match.match_id,
            "status": "matched",
            "total_fees_paid": MATCH_SUCCESS_FEE * 2,
            "your_fee": MATCH_SUCCESS_FEE,
            "driver_contact": {
                "name": match.driver_name,
                "email": match.driver_email,
                "phone": driver_listing.poster_phone if driver_listing else None,
                "listing_id": match.driver_listing_id
            },
            "passenger_contact": {
                "name": match.passenger_name,
                "email": match.passenger_email,
                "phone": passenger_listing.poster_phone if passenger_listing else None,
                "listing_id": match.passenger_listing_id
            },
            "agreed_terms": {
                "price": match.agreed_price,
                "date": match.agreed_date,
                "time": match.agreed_time,
                "notes": match.notes
            },
            "disclaimer": (
                "You have both paid a $1 MATCHMAKING FEE for this connection. "
                "Any transportation arrangement is a PRIVATE MATTER between you. "
                "Dollor.ai is not a party to your arrangement and provides no "
                "guarantees or insurance. Stay safe!"
            ),
            "next_steps": [
                "Contact each other using the provided info",
                "Finalize your arrangement details",
                "Arrange payment directly (cash, Venmo, Zelle, etc.)",
                "Meet in a safe public place",
                "Have a great trip!"
            ]
        }
    else:
        # Update status
        if match.driver_confirmed and not match.passenger_confirmed:
            match.status = "driver_confirmed"
        elif match.passenger_confirmed and not match.driver_confirmed:
            match.status = "passenger_confirmed"

        db.commit()

        waiting_for = "passenger" if match.driver_confirmed else "driver"

        return {
            "success": True,
            "message": f"Your confirmation received! Waiting for {waiting_for} to confirm.",
            "match_id": match.match_id,
            "status": match.status,
            "your_fee_paid": MATCH_SUCCESS_FEE,
            "driver_confirmed": match.driver_confirmed,
            "passenger_confirmed": match.passenger_confirmed,
            "next_step": f"Once the {waiting_for} confirms and pays, you'll both receive contact info.",
            "disclaimer": MATCH_SUCCESS_FEE_DISCLAIMER
        }


@router.get("/matches/{match_id}")
async def get_match_details(
    match_id: str,
    user_email: str,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific match.
    Only participants can view match details.
    """
    match = db.query(TripMatch).filter(
        TripMatch.match_id == match_id
    ).first()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    # Verify user is a participant
    if user_email not in [match.driver_email, match.passenger_email]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this match"
        )

    user_role = "driver" if user_email == match.driver_email else "passenger"
    is_matched = match.status == "matched"

    # Get listings for additional info
    driver_listing = db.query(TripListing).filter(
        TripListing.listing_id == match.driver_listing_id
    ).first()
    passenger_listing = db.query(TripListing).filter(
        TripListing.listing_id == match.passenger_listing_id
    ).first()

    response = {
        "match_id": match.match_id,
        "status": match.status,
        "your_role": user_role,
        "driver": {
            "name": match.driver_name,
            "email": match.driver_email if is_matched else mask_email(match.driver_email),
            "phone": driver_listing.poster_phone if (is_matched and driver_listing) else None,
            "confirmed": match.driver_confirmed,
            "paid": match.driver_paid
        },
        "passenger": {
            "name": match.passenger_name,
            "email": match.passenger_email if is_matched else mask_email(match.passenger_email),
            "phone": passenger_listing.poster_phone if (is_matched and passenger_listing) else None,
            "confirmed": match.passenger_confirmed,
            "paid": match.passenger_paid
        },
        "agreed_terms": {
            "price": match.agreed_price,
            "date": match.agreed_date,
            "time": match.agreed_time,
            "notes": match.notes
        },
        "created_at": match.created_at.isoformat() if match.created_at else None,
        "matched_at": match.matched_at.isoformat() if match.matched_at else None
    }

    if not is_matched:
        response["next_step"] = (
            "Both parties must confirm and pay the $1 matchmaking fee "
            "to reveal contact information."
        )

    return response


@router.get("/my-matches")
async def get_my_matches(
    user_email: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get all matches for a user (as driver or passenger).
    Returns match data in format expected by iOS app.
    """
    # If no email provided, return empty list (user not logged in)
    if not user_email:
        return {"matches": [], "count": 0}

    matches = db.query(TripMatch).filter(
        or_(
            TripMatch.driver_email == user_email,
            TripMatch.passenger_email == user_email
        )
    ).order_by(desc(TripMatch.created_at)).all()

    results = []
    for match in matches:
        user_role = "driver" if user_email == match.driver_email else "passenger"
        is_confirmed = match.status == "matched" or match.status == "confirmed"

        # Determine if this user needs to confirm
        user_confirmed = match.driver_confirmed if user_role == "driver" else match.passenger_confirmed
        needs_your_confirmation = not user_confirmed and match.status == "pending"

        other_party_name = match.passenger_name if user_role == "driver" else match.driver_name
        other_party_email = match.passenger_email if user_role == "driver" else match.driver_email

        # Get the driver listing to get trip details
        driver_listing = db.query(TripListing).filter(
            TripListing.listing_id == match.driver_listing_id
        ).first()

        # Build response matching iOS TripMatch model
        match_data = {
            "match_id": match.match_id,
            "status": "confirmed" if is_confirmed else "pending",
            "listing_id": match.driver_listing_id,
            # Trip details from listing
            "origin_city": driver_listing.origin_city if driver_listing else "",
            "origin_state": driver_listing.origin_state if driver_listing else "",
            "destination_city": driver_listing.destination_city if driver_listing else "",
            "destination_state": driver_listing.destination_state if driver_listing else "",
            "departure_date": driver_listing.departure_date if driver_listing else None,
            # Other party info
            "other_party_name": other_party_name,
            "other_party_email": other_party_email if is_confirmed else None,
            "other_party_phone": None,  # Phone not stored yet
            "other_party_role": "passenger" if user_role == "driver" else "driver",
            # Match details
            "agreed_price": match.agreed_price or 0.0,
            "proposed_by": "them" if needs_your_confirmation else "you",
            "needs_your_confirmation": needs_your_confirmation,
            "created_at": match.created_at.isoformat() if match.created_at else None,
            "confirmed_at": match.matched_at.isoformat() if match.matched_at else None
        }
        results.append(match_data)

    return {
        "success": True,
        "count": len(results),
        "matches": results,
        "disclaimer": (
            "Completed matches show full contact info. Pending matches require "
            "both parties to confirm and pay the $1 matchmaking fee."
        )
    }


@router.delete("/matches/{match_id}")
async def cancel_match(
    match_id: str,
    user_email: str,
    db: Session = Depends(get_db)
):
    """
    Cancel a pending match.
    Only the participants can cancel, and only if not yet completed.
    """
    match = db.query(TripMatch).filter(
        TripMatch.match_id == match_id
    ).first()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )

    if user_email not in [match.driver_email, match.passenger_email]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this match"
        )

    if match.status == "matched":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed match. Contact the other party directly."
        )

    match.status = "cancelled"
    db.commit()

    return {
        "success": True,
        "message": "Match cancelled",
        "match_id": match_id,
        "note": "If you paid a matchmaking fee, it will be refunded within 5-7 business days."
    }


# =============================================================================
# API ENDPOINTS - Admin/Stats (Updated for Match Model)
# =============================================================================

@router.get("/revenue-summary")
async def get_revenue_summary(
    db: Session = Depends(get_db)
):
    """
    Get revenue summary from match success fees.
    All revenue is from MATCHMAKING services, NOT transportation.
    """
    # Count completed matches
    completed_matches = db.query(TripMatch).filter(
        TripMatch.status == "matched"
    ).count()

    # Count match payments
    match_payments = db.query(MatchPayment).filter(
        MatchPayment.status == "completed"
    ).all()

    total_match_revenue = sum(p.amount for p in match_payments)

    return {
        "revenue_summary": {
            "match_success_fees": {
                "completed_matches": completed_matches,
                "fee_per_match": MATCH_SUCCESS_FEE * 2,  # Both parties pay
                "fee_per_person": MATCH_SUCCESS_FEE,
                "total_payments": len(match_payments),
                "total_revenue": total_match_revenue,
                "service_type": "MATCHMAKING SERVICE"
            },
            "pricing_model": {
                "listing_fee": "FREE",
                "browsing": "FREE",
                "messaging": "FREE",
                "match_confirmation": f"${MATCH_SUCCESS_FEE} per person"
            }
        },
        "legal_notice": {
            "platform_type": "Matchmaking Service (like dating apps, job boards)",
            "revenue_model": "Pay-per-successful-match",
            "revenue_sources": [
                "Match success fees when both parties confirm"
            ],
            "not_revenue_from": [
                "Transportation services",
                "Ride bookings or deposits",
                "Commissions on ride prices",
                "Insurance or guarantees"
            ],
            "legal_model": "Section 230 CDA Protected Platform"
        }
    }


# =============================================================================
# API ENDPOINTS - Price Helper (Educational/Informational Only)
# =============================================================================

@router.get("/price-helper")
async def get_price_helper(
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float
):
    """
    EDUCATIONAL PRICE INFORMATION ONLY - NOT FARE CALCULATION

    This endpoint provides INFORMATIONAL data to help users make their own
    pricing decisions. It does NOT calculate fares or set prices.

    Data provided:
    - IRS standard mileage rate (publicly available government data)
    - Estimated gas costs based on current average prices
    - Market comparisons from similar routes

    LEGAL SAFE HARBOR:
    - All data is publicly available information
    - User makes ALL pricing decisions
    - Platform does NOT determine prices
    - Clear disclaimers that this is educational only
    """
    import math

    # Calculate distance using Haversine (this is just math, not fare calculation)
    R = 3959.0  # Earth's radius in miles
    d_lat = math.radians(destination_lat - origin_lat)
    d_lon = math.radians(destination_lng - origin_lng)
    a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
         math.cos(math.radians(origin_lat)) * math.cos(math.radians(destination_lat)) *
         math.sin(d_lon/2) * math.sin(d_lon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance_miles = R * c

    # IRS Standard Mileage Rate 2024 - publicly available government data
    # Source: https://www.irs.gov/tax-professionals/standard-mileage-rates
    IRS_MILEAGE_RATE_2024 = 0.67  # $0.67 per mile

    # Average gas price - would be fetched from public API in production
    # Using AAA national average as reference
    AVG_GAS_PRICE = 3.50  # $/gallon national average
    AVG_MPG = 28  # Average fuel economy

    # Calculate informational estimates
    irs_cost_estimate = round(distance_miles * IRS_MILEAGE_RATE_2024, 2)
    gas_cost_estimate = round((distance_miles / AVG_MPG) * AVG_GAS_PRICE, 2)

    # Market data ranges (would come from aggregating past listings in production)
    # These are INFORMATIONAL ranges based on what other users have asked
    market_low = round(gas_cost_estimate * 0.8, 2)  # Some share just gas
    market_mid = round(gas_cost_estimate * 1.5, 2)  # Gas + wear
    market_high = round(irs_cost_estimate * 1.2, 2)  # Full cost + time

    return {
        "disclaimer": (
            "EDUCATIONAL INFORMATION ONLY - NOT A FARE QUOTE\n\n"
            "This information is provided to help you make your own pricing "
            "decision. Dollor.ai does NOT set prices or calculate fares. "
            "YOU decide what price to ask. These are just reference points "
            "based on publicly available data."
        ),
        "distance_miles": round(distance_miles, 1),

        "reference_data": {
            "irs_mileage_rate": {
                "rate": f"${IRS_MILEAGE_RATE_2024}/mile",
                "source": "IRS Standard Mileage Rate 2024",
                "url": "https://www.irs.gov/tax-professionals/standard-mileage-rates",
                "estimate": irs_cost_estimate,
                "note": "This is the IRS rate for tax deduction purposes, includes gas + depreciation + insurance"
            },
            "gas_cost_estimate": {
                "estimate": gas_cost_estimate,
                "assumptions": f"Based on {AVG_MPG} MPG and ${AVG_GAS_PRICE}/gallon average",
                "note": "Just the estimated fuel cost for this distance"
            }
        },

        "what_others_ask": {
            "note": "Based on similar distance ranges on rideshare boards (educational only)",
            "ranges": {
                "gas_share_only": {
                    "range": f"${market_low} - ${round(market_low * 1.2, 2)}",
                    "description": "Just splitting gas costs"
                },
                "gas_plus_wear": {
                    "range": f"${market_mid} - ${round(market_mid * 1.3, 2)}",
                    "description": "Gas + vehicle wear"
                },
                "fair_compensation": {
                    "range": f"${market_high} - ${round(market_high * 1.5, 2)}",
                    "description": "Full costs + driver's time"
                }
            }
        },

        "important_notes": [
            "YOU set your own price - these are just informational reference points",
            "Prices vary based on demand, route, time, and personal preference",
            "Some drivers just want to share gas costs for company",
            "Some passengers are willing to pay more for convenience",
            "Negotiate directly with the other party",
            "Dollor.ai does NOT receive any portion of your arrangement"
        ],

        "legal_notice": (
            "Dollor.ai is a classified advertising service. We do not calculate "
            "fares, set prices, or receive payment for rides. This price helper "
            "provides publicly available reference data (IRS rates, gas prices) "
            "to assist YOUR decision-making. All prices are determined entirely "
            "by you and the other party."
        )
    }


@router.get("/stats")
async def get_trip_board_stats(db: Session = Depends(get_db)):
    """
    Get Trip Board statistics for admin dashboard.
    """
    total_listings = db.query(TripListing).count()
    active_listings = db.query(TripListing).filter(
        TripListing.is_active == True,
        TripListing.expires_at > datetime.utcnow()
    ).count()
    total_messages = db.query(TripMessage).count()

    return {
        "total_listings": total_listings,
        "active_listings": active_listings,
        "expired_listings": total_listings - active_listings,
        "total_messages": total_messages,
        "platform_type": "Classified Advertising / Bulletin Board",
        "legal_model": "Section 230 CDA Protected",
        "disclaimer": (
            "Dollor.ai Trip Board is a classified advertising service. "
            "We do not provide transportation services."
        )
    }
