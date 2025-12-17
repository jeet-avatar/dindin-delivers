"""
Dollor.ai - Negotiation Service
===============================

MATCHMAKING PLATFORM - NOT A TRANSPORTATION COMPANY

This service facilitates price negotiation between INDEPENDENT drivers
and customers. Dollor.ai is a technology platform that:
- CONNECTS independent service providers with customers
- DOES NOT employ drivers (they are independent businesses)
- DOES NOT set prices (drivers and customers negotiate freely)
- CHARGES a flat matchmaking/connection fee ($1-$3)

Legal Model:
- Drivers are independent contractors who set their own prices
- Customers make offers, drivers accept or counter
- Platform only facilitates the connection
- No employment relationship exists

Port: 8017
WebSocket: /ws/negotiate/{ride_id}
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import enum

# Optional redis import for CI/CD environments
redis = None
REDIS_AVAILABLE = False
try:
    import redis.asyncio as _redis
    redis = _redis
    REDIS_AVAILABLE = True
except ImportError:
    pass

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "negotiation-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8017

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Negotiation settings
NEGOTIATION_TIMEOUT_SECONDS = 120  # 2 minutes to respond
MAX_COUNTER_OFFERS = 5  # Maximum back-and-forth
AUTO_ACCEPT_THRESHOLD = 0.95  # Auto-accept if within 5% of ask

# Platform fee tiers (matchmaking fees)
# Tiered pricing: $1/$2/$3 based on fare value
PLATFORM_FEE_TIER1 = 1.00  # Fare <= $35
PLATFORM_FEE_TIER2 = 2.00  # Fare $35-$70
PLATFORM_FEE_TIER3 = 3.00  # Fare > $70

# Tier thresholds
TIER1_MAX_FARE = 35.00
TIER2_MAX_FARE = 70.00

# =============================================================================
# LEGAL DISCLAIMER - MATCHMAKING MODEL
# =============================================================================

LEGAL_DISCLAIMER = """
DOLLOR.AI MATCHMAKING PLATFORM TERMS:

1. INDEPENDENT CONTRACTORS: All drivers using this platform are independent
   business operators, NOT employees of Dollor.ai. Drivers set their own
   prices, hours, and accept jobs at their sole discretion.

2. MATCHMAKING SERVICE: Dollor.ai provides a technology platform that
   CONNECTS independent drivers with customers seeking transportation or
   delivery services. We do not provide transportation services.

3. PRICE NEGOTIATION: Prices are negotiated directly between the independent
   driver and the customer. Dollor.ai does not set, control, or mandate
   pricing. The platform may suggest prices based on market data, but
   final pricing is determined by the parties.

4. CONNECTION FEE: Dollor.ai charges a flat matchmaking fee ($1-$3) for
   facilitating the connection. This fee is for use of our technology
   platform, not for transportation services.

5. NO AGENCY: Dollor.ai is not an agent for any driver or customer.
   All agreements are directly between the independent parties.
"""

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(SERVICE_NAME)

# =============================================================================
# DATABASE SETUP
# =============================================================================

Base = declarative_base()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
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

class NegotiationStatus(str, enum.Enum):
    NONE = "none"
    CUSTOMER_OFFERED = "customer_offered"
    DRIVER_COUNTERED = "driver_countered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PartyType(str, enum.Enum):
    CUSTOMER = "customer"
    DRIVER = "driver"


class OfferType(str, enum.Enum):
    """Type of offer in negotiation"""
    INITIAL = "initial"
    COUNTER = "counter"
    FINAL = "final"
    QUICK = "quick"


# =============================================================================
# DATABASE MODELS
# =============================================================================

class NegotiationSession(Base):
    """Tracks negotiation between customer and driver"""
    __tablename__ = "negotiation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(String(50), nullable=False, index=True)
    driver_id = Column(String(50), nullable=True, index=True)

    # Platform suggested price (based on distance/time)
    suggested_fare = Column(Float, nullable=False)

    # Negotiation state
    status = Column(String(20), default=NegotiationStatus.NONE.value)
    customer_offer = Column(Float, nullable=True)
    driver_offer = Column(Float, nullable=True)
    agreed_fare = Column(Float, nullable=True)

    # Counter tracking
    counter_count = Column(Integer, default=0)
    last_offer_by = Column(String(20), nullable=True)  # "customer" or "driver"

    # Platform fees (matchmaking fee, NOT transportation fee)
    platform_fee_customer = Column(Float, default=1.0)
    platform_fee_driver = Column(Float, default=1.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Metadata
    pickup_address = Column(String(500), nullable=True)
    dropoff_address = Column(String(500), nullable=True)
    distance_miles = Column(Float, nullable=True)
    duration_minutes = Column(Float, nullable=True)

class NegotiationOffer(Base):
    """Individual offers in negotiation history"""
    __tablename__ = "negotiation_offers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    ride_id = Column(String(50), nullable=False, index=True)

    offered_by = Column(String(20), nullable=False)  # "customer" or "driver"
    offer_amount = Column(Float, nullable=False)

    # Calculated fields at time of offer
    platform_fee = Column(Float, nullable=False)
    driver_earnings = Column(Float, nullable=False)
    customer_total = Column(Float, nullable=False)

    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class StartNegotiationRequest(BaseModel):
    ride_id: str
    customer_id: str
    suggested_fare: float
    pickup_address: str
    dropoff_address: str
    distance_miles: float = 0.0
    duration_minutes: float = 0.0
    initial_offer: Optional[float] = None  # Customer's first offer

class SubmitOfferRequest(BaseModel):
    ride_id: str
    party_type: PartyType
    party_id: str
    offer_amount: float
    message: Optional[str] = None

class AcceptOfferRequest(BaseModel):
    ride_id: str
    party_type: PartyType
    party_id: str
    accepted_fare: float

class NegotiationResponse(BaseModel):
    ride_id: str
    status: str
    suggested_fare: float
    customer_offer: Optional[float]
    driver_offer: Optional[float]
    agreed_fare: Optional[float]
    platform_fee_customer: float
    platform_fee_driver: float
    driver_earnings: Optional[float]
    customer_total: Optional[float]
    counter_count: int
    expires_at: Optional[str]
    message: Optional[str]
    legal_notice: str = "Prices negotiated between independent parties. Platform fee is for matchmaking service only."

class QuickOfferOptions(BaseModel):
    suggested_fare: float
    offer_60_percent: float
    offer_70_percent: float
    offer_80_percent: float
    offer_90_percent: float
    minimum_fare: float = 5.0


# Model aliases for backward compatibility / test requirements
NegotiationCreate = StartNegotiationRequest
CounterOffer = SubmitOfferRequest


# =============================================================================
# REDIS CONNECTION MANAGER
# =============================================================================

class ConnectionManager:
    """Manages WebSocket connections for real-time negotiation"""

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.redis_client = None

    async def connect_redis(self):
        if not self.redis_client and REDIS_AVAILABLE and redis:
            self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)

    async def connect(self, websocket: WebSocket, ride_id: str, party_type: str):
        await websocket.accept()
        if ride_id not in self.active_connections:
            self.active_connections[ride_id] = {}
        self.active_connections[ride_id][party_type] = websocket
        logger.info(f"WebSocket connected: {ride_id} - {party_type}")

    def disconnect(self, ride_id: str, party_type: str):
        if ride_id in self.active_connections:
            self.active_connections[ride_id].pop(party_type, None)
            if not self.active_connections[ride_id]:
                del self.active_connections[ride_id]
        logger.info(f"WebSocket disconnected: {ride_id} - {party_type}")

    async def send_to_party(self, ride_id: str, party_type: str, message: dict):
        if ride_id in self.active_connections:
            ws = self.active_connections[ride_id].get(party_type)
            if ws:
                await ws.send_json(message)

    async def broadcast_to_ride(self, ride_id: str, message: dict):
        if ride_id in self.active_connections:
            for party_type, ws in self.active_connections[ride_id].items():
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {party_type}: {e}")

    async def publish_update(self, ride_id: str, data: dict):
        """Publish to Redis for cross-instance communication"""
        if self.redis_client:
            await self.redis_client.publish(f"negotiation:{ride_id}", json.dumps(data))

manager = ConnectionManager()

# =============================================================================
# PRICING HELPERS (Matchmaking model)
# =============================================================================

def calculate_platform_fee(fare: float) -> float:
    """
    Calculate matchmaking/connection fee (NOT transportation fee).
    This is what Dollor.ai charges for facilitating the connection.

    Tiered pricing:
    - Fare ≤ $35: $1 connection fee
    - Fare $35-$70: $2 connection fee
    - Fare > $70: $3 connection fee
    """
    if fare <= 35:
        return 1.0
    elif fare <= 70:
        return 2.0
    else:
        return 3.0

def calculate_driver_earnings(fare: float) -> float:
    """Driver earnings = Fare - Platform fee"""
    return fare - calculate_platform_fee(fare)

def calculate_customer_total(fare: float) -> float:
    """Customer total = Fare + Platform fee"""
    return fare + calculate_platform_fee(fare)

def get_quick_offer_options(suggested_fare: float) -> QuickOfferOptions:
    """Generate quick offer buttons for customer"""
    minimum = 5.0
    return QuickOfferOptions(
        suggested_fare=suggested_fare,
        offer_60_percent=max(suggested_fare * 0.60, minimum),
        offer_70_percent=max(suggested_fare * 0.70, minimum),
        offer_80_percent=max(suggested_fare * 0.80, minimum),
        offer_90_percent=max(suggested_fare * 0.90, minimum),
        minimum_fare=minimum
    )


def calculate_quick_offer(suggested_fare: float, percentage: float = 0.80) -> float:
    """
    Calculate a quick offer amount based on percentage of suggested fare.

    Args:
        suggested_fare: The platform suggested fare
        percentage: Percentage of suggested fare (default 80%)

    Returns:
        Quick offer amount (minimum $5.00)
    """
    minimum = 5.0
    offer = suggested_fare * percentage
    return max(offer, minimum)


# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {SERVICE_NAME} v{SERVICE_VERSION} on port {SERVICE_PORT}")
    Base.metadata.create_all(bind=engine)
    await manager.connect_redis()
    logger.info(LEGAL_DISCLAIMER)
    yield
    # Shutdown
    if manager.redis_client:
        await manager.redis_client.close()
    logger.info(f"Shutting down {SERVICE_NAME}")

app = FastAPI(
    title="Dollor.ai Negotiation Service",
    description="Matchmaking platform for price negotiation between independent drivers and customers",
    version=SERVICE_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "model": "MATCHMAKING_PLATFORM",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/legal")
async def get_legal_disclaimer():
    """Returns legal disclaimer about matchmaking model"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "model": "MATCHMAKING_PLATFORM",
        "key_points": [
            "Drivers are independent contractors, not employees",
            "Prices are negotiated between parties, not set by platform",
            "Platform fee is for matchmaking/connection service only",
            "No employment or agency relationship exists"
        ]
    }

# =============================================================================
# NEGOTIATION ENDPOINTS
# =============================================================================

@app.post("/api/negotiate/start", response_model=NegotiationResponse)
async def start_negotiation(
    request: StartNegotiationRequest,
    db: Session = Depends(get_db)
):
    """
    Start a new negotiation session.
    Platform suggests a fare, customer can make initial offer.
    """
    # Check if session already exists
    existing = db.query(NegotiationSession).filter(
        NegotiationSession.ride_id == request.ride_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Negotiation already exists for this ride")

    # Calculate platform fees
    platform_fee = calculate_platform_fee(request.suggested_fare)

    # Create session
    session = NegotiationSession(
        ride_id=request.ride_id,
        customer_id=request.customer_id,
        suggested_fare=request.suggested_fare,
        platform_fee_customer=platform_fee,
        platform_fee_driver=platform_fee,
        pickup_address=request.pickup_address,
        dropoff_address=request.dropoff_address,
        distance_miles=request.distance_miles,
        duration_minutes=request.duration_minutes,
        expires_at=datetime.utcnow() + timedelta(seconds=NEGOTIATION_TIMEOUT_SECONDS)
    )

    # If customer made initial offer
    if request.initial_offer:
        session.customer_offer = request.initial_offer
        session.status = NegotiationStatus.CUSTOMER_OFFERED.value
        session.last_offer_by = PartyType.CUSTOMER.value

        # Record the offer
        offer = NegotiationOffer(
            session_id=0,  # Will update after commit
            ride_id=request.ride_id,
            offered_by=PartyType.CUSTOMER.value,
            offer_amount=request.initial_offer,
            platform_fee=calculate_platform_fee(request.initial_offer),
            driver_earnings=calculate_driver_earnings(request.initial_offer),
            customer_total=calculate_customer_total(request.initial_offer)
        )
        db.add(offer)

    db.add(session)
    db.commit()
    db.refresh(session)

    # Broadcast to connected parties
    await manager.broadcast_to_ride(request.ride_id, {
        "type": "negotiation_started",
        "ride_id": request.ride_id,
        "suggested_fare": request.suggested_fare,
        "customer_offer": request.initial_offer,
        "status": session.status
    })

    return NegotiationResponse(
        ride_id=session.ride_id,
        status=session.status,
        suggested_fare=session.suggested_fare,
        customer_offer=session.customer_offer,
        driver_offer=session.driver_offer,
        agreed_fare=session.agreed_fare,
        platform_fee_customer=session.platform_fee_customer,
        platform_fee_driver=session.platform_fee_driver,
        driver_earnings=calculate_driver_earnings(session.customer_offer) if session.customer_offer else None,
        customer_total=calculate_customer_total(session.customer_offer) if session.customer_offer else None,
        counter_count=session.counter_count,
        expires_at=session.expires_at.isoformat() if session.expires_at else None,
        message="Negotiation started. Waiting for driver response."
    )

@app.post("/api/negotiate/offer", response_model=NegotiationResponse)
async def submit_offer(
    request: SubmitOfferRequest,
    db: Session = Depends(get_db)
):
    """
    Submit an offer (customer or driver).
    Independent parties negotiate directly - platform facilitates.
    """
    session = db.query(NegotiationSession).filter(
        NegotiationSession.ride_id == request.ride_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    if session.status in [NegotiationStatus.ACCEPTED.value, NegotiationStatus.REJECTED.value]:
        raise HTTPException(status_code=400, detail="Negotiation already concluded")

    if session.counter_count >= MAX_COUNTER_OFFERS:
        raise HTTPException(status_code=400, detail="Maximum counter-offers reached")

    # Validate minimum fare
    if request.offer_amount < 5.0:
        raise HTTPException(status_code=400, detail="Offer must be at least $5.00")

    # Update session based on who's offering
    platform_fee = calculate_platform_fee(request.offer_amount)

    if request.party_type == PartyType.CUSTOMER:
        session.customer_offer = request.offer_amount
        session.status = NegotiationStatus.CUSTOMER_OFFERED.value
        # Assign driver if first driver interaction
        if not session.driver_id and request.party_id:
            session.driver_id = request.party_id
    else:
        session.driver_offer = request.offer_amount
        session.status = NegotiationStatus.DRIVER_COUNTERED.value
        if not session.driver_id:
            session.driver_id = request.party_id

    session.last_offer_by = request.party_type.value
    session.counter_count += 1
    session.platform_fee_customer = platform_fee
    session.platform_fee_driver = platform_fee
    session.expires_at = datetime.utcnow() + timedelta(seconds=NEGOTIATION_TIMEOUT_SECONDS)

    # Record offer history
    offer = NegotiationOffer(
        session_id=session.id,
        ride_id=request.ride_id,
        offered_by=request.party_type.value,
        offer_amount=request.offer_amount,
        platform_fee=platform_fee,
        driver_earnings=calculate_driver_earnings(request.offer_amount),
        customer_total=calculate_customer_total(request.offer_amount),
        message=request.message
    )
    db.add(offer)
    db.commit()
    db.refresh(session)

    # Broadcast update
    await manager.broadcast_to_ride(request.ride_id, {
        "type": "offer_received",
        "ride_id": request.ride_id,
        "offered_by": request.party_type.value,
        "offer_amount": request.offer_amount,
        "platform_fee": platform_fee,
        "driver_earnings": calculate_driver_earnings(request.offer_amount),
        "customer_total": calculate_customer_total(request.offer_amount),
        "counter_count": session.counter_count,
        "status": session.status,
        "message": request.message
    })

    current_offer = session.driver_offer if request.party_type == PartyType.DRIVER else session.customer_offer

    return NegotiationResponse(
        ride_id=session.ride_id,
        status=session.status,
        suggested_fare=session.suggested_fare,
        customer_offer=session.customer_offer,
        driver_offer=session.driver_offer,
        agreed_fare=session.agreed_fare,
        platform_fee_customer=session.platform_fee_customer,
        platform_fee_driver=session.platform_fee_driver,
        driver_earnings=calculate_driver_earnings(current_offer) if current_offer else None,
        customer_total=calculate_customer_total(current_offer) if current_offer else None,
        counter_count=session.counter_count,
        expires_at=session.expires_at.isoformat() if session.expires_at else None,
        message=f"Offer of ${request.offer_amount:.2f} submitted. Waiting for response."
    )

@app.post("/api/negotiate/accept", response_model=NegotiationResponse)
async def accept_offer(
    request: AcceptOfferRequest,
    db: Session = Depends(get_db)
):
    """
    Accept the current offer - negotiation complete.
    Agreement reached between independent parties.
    """
    session = db.query(NegotiationSession).filter(
        NegotiationSession.ride_id == request.ride_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Negotiation session not found")

    if session.status == NegotiationStatus.ACCEPTED.value:
        raise HTTPException(status_code=400, detail="Offer already accepted")

    # Set agreed fare
    session.agreed_fare = request.accepted_fare
    session.status = NegotiationStatus.ACCEPTED.value
    session.completed_at = datetime.utcnow()

    platform_fee = calculate_platform_fee(request.accepted_fare)
    session.platform_fee_customer = platform_fee
    session.platform_fee_driver = platform_fee

    db.commit()
    db.refresh(session)

    # Broadcast acceptance
    await manager.broadcast_to_ride(request.ride_id, {
        "type": "offer_accepted",
        "ride_id": request.ride_id,
        "accepted_by": request.party_type.value,
        "agreed_fare": request.accepted_fare,
        "platform_fee": platform_fee,
        "driver_earnings": calculate_driver_earnings(request.accepted_fare),
        "customer_total": calculate_customer_total(request.accepted_fare),
        "status": NegotiationStatus.ACCEPTED.value,
        "message": "Price agreed! Ride confirmed."
    })

    return NegotiationResponse(
        ride_id=session.ride_id,
        status=session.status,
        suggested_fare=session.suggested_fare,
        customer_offer=session.customer_offer,
        driver_offer=session.driver_offer,
        agreed_fare=session.agreed_fare,
        platform_fee_customer=session.platform_fee_customer,
        platform_fee_driver=session.platform_fee_driver,
        driver_earnings=calculate_driver_earnings(session.agreed_fare),
        customer_total=calculate_customer_total(session.agreed_fare),
        counter_count=session.counter_count,
        expires_at=None,
        message="Price agreed between independent parties. Ride confirmed."
    )

@app.post("/api/negotiate/reject")
async def reject_negotiation(
    ride_id: str,
    party_type: PartyType,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Reject negotiation - no agreement reached"""
    session = db.query(NegotiationSession).filter(
        NegotiationSession.ride_id == ride_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = NegotiationStatus.REJECTED.value
    session.completed_at = datetime.utcnow()
    db.commit()

    await manager.broadcast_to_ride(ride_id, {
        "type": "negotiation_rejected",
        "ride_id": ride_id,
        "rejected_by": party_type.value,
        "reason": reason,
        "status": NegotiationStatus.REJECTED.value
    })

    return {"status": "rejected", "message": "Negotiation ended - no agreement"}

@app.get("/api/negotiate/status/{ride_id}", response_model=NegotiationResponse)
async def get_negotiation_status(
    ride_id: str,
    db: Session = Depends(get_db)
):
    """Get current negotiation status (for polling fallback)"""
    session = db.query(NegotiationSession).filter(
        NegotiationSession.ride_id == ride_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check expiration
    if session.expires_at and datetime.utcnow() > session.expires_at:
        if session.status not in [NegotiationStatus.ACCEPTED.value, NegotiationStatus.REJECTED.value]:
            session.status = NegotiationStatus.EXPIRED.value
            db.commit()

    current_offer = session.agreed_fare or session.driver_offer or session.customer_offer

    return NegotiationResponse(
        ride_id=session.ride_id,
        status=session.status,
        suggested_fare=session.suggested_fare,
        customer_offer=session.customer_offer,
        driver_offer=session.driver_offer,
        agreed_fare=session.agreed_fare,
        platform_fee_customer=session.platform_fee_customer,
        platform_fee_driver=session.platform_fee_driver,
        driver_earnings=calculate_driver_earnings(current_offer) if current_offer else None,
        customer_total=calculate_customer_total(current_offer) if current_offer else None,
        counter_count=session.counter_count,
        expires_at=session.expires_at.isoformat() if session.expires_at else None,
        message=None
    )

@app.get("/api/negotiate/quick-offers")
async def get_quick_offer_options(suggested_fare: float = Query(..., gt=0)):
    """Get quick offer buttons for customer UI"""
    return get_quick_offer_options(suggested_fare)

@app.get("/api/negotiate/history/{ride_id}")
async def get_negotiation_history(
    ride_id: str,
    db: Session = Depends(get_db)
):
    """Get full negotiation history for a ride"""
    offers = db.query(NegotiationOffer).filter(
        NegotiationOffer.ride_id == ride_id
    ).order_by(NegotiationOffer.created_at).all()

    return {
        "ride_id": ride_id,
        "offers": [
            {
                "offered_by": o.offered_by,
                "amount": o.offer_amount,
                "platform_fee": o.platform_fee,
                "driver_earnings": o.driver_earnings,
                "customer_total": o.customer_total,
                "message": o.message,
                "timestamp": o.created_at.isoformat()
            }
            for o in offers
        ]
    }

# =============================================================================
# WEBSOCKET ENDPOINT
# =============================================================================

@app.websocket("/ws/negotiate/{ride_id}")
async def websocket_negotiate(
    websocket: WebSocket,
    ride_id: str,
    party_type: str = Query(...)
):
    """
    Real-time WebSocket for negotiation updates.
    Customers and drivers connect to receive instant offer notifications.
    """
    await manager.connect(websocket, ride_id, party_type)

    try:
        # Send current status on connect
        async with SessionLocal() as db:
            session = db.query(NegotiationSession).filter(
                NegotiationSession.ride_id == ride_id
            ).first()

            if session:
                await websocket.send_json({
                    "type": "connected",
                    "ride_id": ride_id,
                    "status": session.status,
                    "suggested_fare": session.suggested_fare,
                    "customer_offer": session.customer_offer,
                    "driver_offer": session.driver_offer,
                    "agreed_fare": session.agreed_fare
                })

        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_json()

            # Handle ping/pong for connection health
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

            # Handle offer submission via WebSocket
            elif data.get("type") == "offer":
                # Process offer (would call submit_offer logic)
                pass

    except WebSocketDisconnect:
        manager.disconnect(ride_id, party_type)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(ride_id, party_type)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
