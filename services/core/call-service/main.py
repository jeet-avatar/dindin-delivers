"""
Dollor.ai - Call Service
========================

MATCHMAKING PLATFORM - Privacy-Protected Communication

This service provides phone masking and call facilitation between
INDEPENDENT drivers and customers while protecting privacy.

Features:
- Phone number masking (neither party sees real numbers)
- Twilio Proxy for call routing
- Call logging (with consent)
- Emergency escalation

Dollor.ai does NOT:
- Record calls without consent
- Monitor call content
- Direct conversations

Port: 8019
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import enum

# Twilio (optional - uses mock if not configured)
try:
    from twilio.rest import Client as TwilioClient
    from twilio.twiml.voice_response import VoiceResponse, Dial
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

# =============================================================================
# CONFIGURATION
# =============================================================================

SERVICE_NAME = "call-service"
SERVICE_VERSION = "1.0.0"
SERVICE_PORT = 8019

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dollor")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_PROXY_SERVICE_SID = os.getenv("TWILIO_PROXY_SERVICE_SID", "")

# Call settings
MAX_CALL_DURATION_MINUTES = 30
PROXY_SESSION_DURATION_HOURS = 4  # How long masked numbers remain valid

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
# TWILIO CLIENT
# =============================================================================

twilio_client = None
if TWILIO_AVAILABLE and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized")
    except Exception as e:
        logger.warning(f"Twilio initialization failed: {e}")

# =============================================================================
# ENUMS
# =============================================================================

class CallStatus(str, enum.Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    CANCELLED = "cancelled"

class ParticipantType(str, enum.Enum):
    CUSTOMER = "customer"
    DRIVER = "driver"

# =============================================================================
# DATABASE MODELS
# =============================================================================

class CallSession(Base):
    """Phone masking session for a ride/delivery"""
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), unique=True, nullable=False, index=True)

    # Related entities
    ride_id = Column(String(50), nullable=True, index=True)
    order_id = Column(String(50), nullable=True, index=True)

    # Participants (real phone numbers - encrypted in production)
    customer_id = Column(String(50), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    driver_id = Column(String(50), nullable=True)
    driver_phone = Column(String(20), nullable=True)

    # Masked numbers (what each party sees)
    masked_number_for_customer = Column(String(20), nullable=True)  # Driver's masked number
    masked_number_for_driver = Column(String(20), nullable=True)    # Customer's masked number

    # Twilio Proxy Session (if using Twilio)
    twilio_proxy_session_sid = Column(String(100), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CallLog(Base):
    """Individual call records"""
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String(50), unique=True, nullable=False, index=True)
    session_id = Column(String(50), nullable=False, index=True)

    # Call details
    caller_type = Column(String(20), nullable=False)  # customer or driver
    caller_id = Column(String(50), nullable=False)
    recipient_type = Column(String(20), nullable=False)
    recipient_id = Column(String(50), nullable=False)

    # Twilio call SID
    twilio_call_sid = Column(String(100), nullable=True)

    # Status and duration
    status = Column(String(20), default=CallStatus.INITIATED.value)
    duration_seconds = Column(Integer, nullable=True)

    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CreateSessionRequest(BaseModel):
    ride_id: Optional[str] = None
    order_id: Optional[str] = None
    customer_id: str
    customer_phone: str
    driver_id: Optional[str] = None
    driver_phone: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    driver_id: str
    driver_phone: str

class InitiateCallRequest(BaseModel):
    session_id: str
    caller_type: ParticipantType
    caller_id: str

class CallSessionResponse(BaseModel):
    session_id: str
    ride_id: Optional[str]
    order_id: Optional[str]
    customer_id: str
    driver_id: Optional[str]
    masked_number_for_customer: Optional[str]
    masked_number_for_driver: Optional[str]
    is_active: bool
    expires_at: Optional[str]
    privacy_notice: str = "Phone numbers are masked for privacy. Neither party can see the other's real number."

class CallLogResponse(BaseModel):
    call_id: str
    caller_type: str
    status: str
    duration_seconds: Optional[int]
    started_at: str
    ended_at: Optional[str]

# =============================================================================
# PHONE MASKING HELPERS
# =============================================================================

def generate_masked_number():
    """
    Generate a masked phone number.
    In production with Twilio, this returns a Twilio Proxy number.
    In dev/mock mode, returns a placeholder.
    """
    if twilio_client and TWILIO_PHONE_NUMBER:
        return TWILIO_PHONE_NUMBER
    else:
        # Mock masked number for development
        return f"+1555{uuid.uuid4().hex[:7].upper()}"

async def create_twilio_proxy_session(
    session_id: str,
    customer_phone: str,
    driver_phone: str
) -> Optional[str]:
    """
    Create a Twilio Proxy session for phone masking.
    Returns the Twilio session SID if successful.
    """
    if not twilio_client or not TWILIO_PROXY_SERVICE_SID:
        logger.info("Twilio not configured - using mock masking")
        return None

    try:
        # Create proxy session
        session = twilio_client.proxy.v1.services(
            TWILIO_PROXY_SERVICE_SID
        ).sessions.create(
            unique_name=session_id,
            ttl=PROXY_SESSION_DURATION_HOURS * 3600
        )

        # Add customer participant
        twilio_client.proxy.v1.services(
            TWILIO_PROXY_SERVICE_SID
        ).sessions(session.sid).participants.create(
            friendly_name="customer",
            identifier=customer_phone
        )

        # Add driver participant
        twilio_client.proxy.v1.services(
            TWILIO_PROXY_SERVICE_SID
        ).sessions(session.sid).participants.create(
            friendly_name="driver",
            identifier=driver_phone
        )

        logger.info(f"Created Twilio Proxy session: {session.sid}")
        return session.sid

    except Exception as e:
        logger.error(f"Twilio Proxy error: {e}")
        return None

# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {SERVICE_NAME} v{SERVICE_VERSION} on port {SERVICE_PORT}")
    logger.info(f"Twilio configured: {twilio_client is not None}")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info(f"Shutting down {SERVICE_NAME}")

app = FastAPI(
    title="Dollor.ai Call Service",
    description="Privacy-protected phone communication for matchmaking platform",
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
        "twilio_configured": twilio_client is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

# =============================================================================
# SESSION ENDPOINTS
# =============================================================================

@app.post("/api/call/sessions", response_model=CallSessionResponse)
async def create_call_session(
    request: CreateSessionRequest,
    db: Session = Depends(get_db)
):
    """
    Create a phone masking session for a ride/delivery.
    Each party gets a masked number to call the other.
    """
    session_id = f"call_{uuid.uuid4().hex[:12]}"

    # Generate masked numbers
    masked_for_customer = generate_masked_number()
    masked_for_driver = generate_masked_number()

    session = CallSession(
        session_id=session_id,
        ride_id=request.ride_id,
        order_id=request.order_id,
        customer_id=request.customer_id,
        customer_phone=request.customer_phone,
        driver_id=request.driver_id,
        driver_phone=request.driver_phone,
        masked_number_for_customer=masked_for_customer,
        masked_number_for_driver=masked_for_driver,
        expires_at=datetime.utcnow() + timedelta(hours=PROXY_SESSION_DURATION_HOURS)
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    # Create Twilio Proxy session if driver phone is available
    if request.driver_phone and twilio_client:
        twilio_sid = await create_twilio_proxy_session(
            session_id,
            request.customer_phone,
            request.driver_phone
        )
        if twilio_sid:
            session.twilio_proxy_session_sid = twilio_sid
            db.commit()

    return CallSessionResponse(
        session_id=session.session_id,
        ride_id=session.ride_id,
        order_id=session.order_id,
        customer_id=session.customer_id,
        driver_id=session.driver_id,
        masked_number_for_customer=session.masked_number_for_customer,
        masked_number_for_driver=session.masked_number_for_driver,
        is_active=session.is_active,
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )

@app.put("/api/call/sessions/{session_id}")
async def update_call_session(
    session_id: str,
    request: UpdateSessionRequest,
    db: Session = Depends(get_db)
):
    """Add driver to an existing session"""
    session = db.query(CallSession).filter(
        CallSession.session_id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.driver_id = request.driver_id
    session.driver_phone = request.driver_phone

    # Create Twilio Proxy session now that we have both phones
    if twilio_client and not session.twilio_proxy_session_sid:
        twilio_sid = await create_twilio_proxy_session(
            session_id,
            session.customer_phone,
            request.driver_phone
        )
        if twilio_sid:
            session.twilio_proxy_session_sid = twilio_sid

    db.commit()
    db.refresh(session)

    return CallSessionResponse(
        session_id=session.session_id,
        ride_id=session.ride_id,
        order_id=session.order_id,
        customer_id=session.customer_id,
        driver_id=session.driver_id,
        masked_number_for_customer=session.masked_number_for_customer,
        masked_number_for_driver=session.masked_number_for_driver,
        is_active=session.is_active,
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )

@app.get("/api/call/sessions/{session_id}", response_model=CallSessionResponse)
async def get_call_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get call session details"""
    session = db.query(CallSession).filter(
        CallSession.session_id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return CallSessionResponse(
        session_id=session.session_id,
        ride_id=session.ride_id,
        order_id=session.order_id,
        customer_id=session.customer_id,
        driver_id=session.driver_id,
        masked_number_for_customer=session.masked_number_for_customer,
        masked_number_for_driver=session.masked_number_for_driver,
        is_active=session.is_active,
        expires_at=session.expires_at.isoformat() if session.expires_at else None
    )

@app.get("/api/call/masked-number")
async def get_masked_number(
    session_id: str = Query(...),
    caller_type: ParticipantType = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get the masked number to call the other party.
    Customer gets driver's masked number, driver gets customer's masked number.
    """
    session = db.query(CallSession).filter(
        CallSession.session_id == session_id,
        CallSession.is_active == True
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    # Check expiration
    if session.expires_at and datetime.utcnow() > session.expires_at:
        raise HTTPException(status_code=400, detail="Session expired")

    if caller_type == ParticipantType.CUSTOMER:
        masked_number = session.masked_number_for_customer
        recipient = "driver"
    else:
        masked_number = session.masked_number_for_driver
        recipient = "customer"

    return {
        "session_id": session_id,
        "caller_type": caller_type.value,
        "masked_number": masked_number,
        "recipient": recipient,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        "privacy_notice": "This is a masked number. Your real phone number is never shared."
    }

# =============================================================================
# CALL LOG ENDPOINTS
# =============================================================================

@app.post("/api/call/initiate")
async def initiate_call(
    request: InitiateCallRequest,
    db: Session = Depends(get_db)
):
    """Log when a call is initiated"""
    session = db.query(CallSession).filter(
        CallSession.session_id == request.session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Determine recipient
    if request.caller_type == ParticipantType.CUSTOMER:
        recipient_type = ParticipantType.DRIVER.value
        recipient_id = session.driver_id
    else:
        recipient_type = ParticipantType.CUSTOMER.value
        recipient_id = session.customer_id

    call_id = f"call_{uuid.uuid4().hex[:12]}"

    call_log = CallLog(
        call_id=call_id,
        session_id=request.session_id,
        caller_type=request.caller_type.value,
        caller_id=request.caller_id,
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        status=CallStatus.INITIATED.value
    )

    db.add(call_log)
    db.commit()

    return {
        "call_id": call_id,
        "status": "initiated",
        "message": "Call initiated through masked number"
    }

@app.post("/api/call/status")
async def update_call_status(
    call_id: str = Query(...),
    status: CallStatus = Query(...),
    duration_seconds: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Update call status (webhook for Twilio)"""
    call_log = db.query(CallLog).filter(
        CallLog.call_id == call_id
    ).first()

    if not call_log:
        raise HTTPException(status_code=404, detail="Call not found")

    call_log.status = status.value

    if status == CallStatus.IN_PROGRESS:
        call_log.answered_at = datetime.utcnow()
    elif status in [CallStatus.COMPLETED, CallStatus.FAILED, CallStatus.NO_ANSWER]:
        call_log.ended_at = datetime.utcnow()
        if duration_seconds:
            call_log.duration_seconds = duration_seconds

    db.commit()

    return {"call_id": call_id, "status": status.value}

@app.get("/api/call/logs/{session_id}")
async def get_call_logs(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get call history for a session"""
    logs = db.query(CallLog).filter(
        CallLog.session_id == session_id
    ).order_by(CallLog.started_at.desc()).all()

    return {
        "session_id": session_id,
        "calls": [
            {
                "call_id": log.call_id,
                "caller_type": log.caller_type,
                "recipient_type": log.recipient_type,
                "status": log.status,
                "duration_seconds": log.duration_seconds,
                "started_at": log.started_at.isoformat(),
                "ended_at": log.ended_at.isoformat() if log.ended_at else None
            }
            for log in logs
        ]
    }

# =============================================================================
# TWILIO WEBHOOKS
# =============================================================================

@app.post("/api/call/twilio/voice")
async def twilio_voice_webhook(request: Request):
    """
    Twilio webhook for incoming voice calls.
    Routes calls through the proxy.
    """
    form_data = await request.form()
    from_number = form_data.get("From", "")
    to_number = form_data.get("To", "")

    logger.info(f"Twilio voice webhook: {from_number} -> {to_number}")

    response = VoiceResponse()

    # Simple connect - Twilio Proxy handles the routing
    dial = Dial()
    dial.number(to_number)
    response.append(dial)

    return str(response)

@app.post("/api/call/twilio/status")
async def twilio_status_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Twilio webhook for call status updates"""
    form_data = await request.form()

    call_sid = form_data.get("CallSid", "")
    status = form_data.get("CallStatus", "")
    duration = form_data.get("CallDuration")

    logger.info(f"Twilio status: {call_sid} -> {status}")

    # Find and update call log
    call_log = db.query(CallLog).filter(
        CallLog.twilio_call_sid == call_sid
    ).first()

    if call_log:
        status_map = {
            "queued": CallStatus.INITIATED,
            "ringing": CallStatus.RINGING,
            "in-progress": CallStatus.IN_PROGRESS,
            "completed": CallStatus.COMPLETED,
            "failed": CallStatus.FAILED,
            "busy": CallStatus.BUSY,
            "no-answer": CallStatus.NO_ANSWER,
            "canceled": CallStatus.CANCELLED
        }

        call_log.status = status_map.get(status, CallStatus.FAILED).value

        if duration:
            call_log.duration_seconds = int(duration)

        if status in ["completed", "failed", "busy", "no-answer", "canceled"]:
            call_log.ended_at = datetime.utcnow()

        db.commit()

    return {"status": "ok"}

# =============================================================================
# SESSION CLEANUP
# =============================================================================

@app.delete("/api/call/sessions/{session_id}")
async def end_call_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """End a call session (ride completed)"""
    session = db.query(CallSession).filter(
        CallSession.session_id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = False
    db.commit()

    # Close Twilio Proxy session if exists
    if session.twilio_proxy_session_sid and twilio_client:
        try:
            twilio_client.proxy.v1.services(
                TWILIO_PROXY_SERVICE_SID
            ).sessions(session.twilio_proxy_session_sid).delete()
            logger.info(f"Closed Twilio Proxy session: {session.twilio_proxy_session_sid}")
        except Exception as e:
            logger.warning(f"Error closing Twilio session: {e}")

    return {"status": "closed", "session_id": session_id}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
