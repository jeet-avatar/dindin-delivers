"""
Document Verification Routes - Production Ready

Provides API endpoints for identity and document verification using:
- Persona (recommended for identity + business docs)
- Onfido (identity verification)
- Veriff (identity verification)

Production Safeguards:
- Rate limiting per entity
- Webhook signature verification
- Audit logging
- Environment-aware API endpoints
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Header, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from database import get_db

from document_verification_service import (
    DocumentVerificationService,
    get_verification_service,
    VerificationProvider,
    VerificationStatus,
    DocumentType,
    VerificationResult
)

# Configure logging for audit trail
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verification")

router = APIRouter(prefix="/api/verification", tags=["Document Verification"])

# Environment detection
_ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
_IS_PRODUCTION = _ENVIRONMENT in ("production", "prod")

# Rate limiting — Redis-backed (shared across workers), in-memory fallback
from cache import rate_limit_check as _redis_rate_check, REDIS_AVAILABLE as _REDIS_UP
_rate_limit_cache: Dict[str, Dict[str, Any]] = {}  # in-memory fallback
RATE_LIMIT_WINDOW = 3600  # 1 hour
RATE_LIMIT_MAX_REQUESTS = 10  # Max verification requests per entity per hour


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreateVerificationRequest(BaseModel):
    """Request to create a verification session"""
    entity_type: str = Field(..., pattern="^(driver|vendor)$")
    entity_id: int
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    document_types: List[str] = ["drivers_license"]
    provider: str = Field(default="persona", pattern="^(persona|onfido|veriff)$")


class VerificationStatusResponse(BaseModel):
    """Response for verification status check"""
    verification_id: str
    status: str
    provider: str
    confidence_score: Optional[float] = None
    issues: List[str] = []
    verified_at: Optional[str] = None


class WebhookResponse(BaseModel):
    """Standard webhook response"""
    status: str
    message: str


# =============================================================================
# RATE LIMITING
# =============================================================================

def check_rate_limit(entity_type: str, entity_id: int) -> bool:
    """
    Check if entity has exceeded rate limit for verification requests.
    Returns True if within limit, False if exceeded.
    Uses Redis if available, falls back to in-memory.
    """
    key = f"verify_ratelimit:{entity_type}_{entity_id}"

    # Try Redis first
    if _REDIS_UP:
        is_allowed, _ = _redis_rate_check(key, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW)
        return is_allowed

    # In-memory fallback
    now = datetime.now()
    if key not in _rate_limit_cache:
        _rate_limit_cache[key] = {"count": 0, "window_start": now}

    cache = _rate_limit_cache[key]

    if (now - cache["window_start"]).total_seconds() > RATE_LIMIT_WINDOW:
        cache["count"] = 0
        cache["window_start"] = now

    if cache["count"] >= RATE_LIMIT_MAX_REQUESTS:
        return False

    cache["count"] += 1
    return True


def log_verification_event(
    event_type: str,
    entity_type: str,
    entity_id: int,
    provider: str,
    details: Dict[str, Any]
):
    """Log verification events for audit trail"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "provider": provider,
        "environment": _ENVIRONMENT,
        "details": details
    }
    logger.info(f"VERIFICATION_AUDIT: {json.dumps(log_entry)}")


# =============================================================================
# PERSONA ENDPOINTS
# =============================================================================

@router.post("/persona/create-inquiry")
async def create_persona_inquiry(
    request: CreateVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Persona verification inquiry.

    Returns an inquiry URL that the user can use to complete verification.
    Includes liveness check and document verification.
    """
    # Rate limit check
    if not check_rate_limit(request.entity_type, request.entity_id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 10 verification requests per hour."
        )

    try:
        service = get_verification_service("persona")

        # Map document types
        doc_types = [DocumentType(dt) for dt in request.document_types]

        result = await service.create_persona_inquiry(
            reference_id=str(request.entity_id),
            entity_type=request.entity_type,
            email=request.email,
            document_types=doc_types
        )

        if result["success"]:
            log_verification_event(
                event_type="inquiry_created",
                entity_type=request.entity_type,
                entity_id=request.entity_id,
                provider="persona",
                details={"inquiry_id": result.get("inquiry_id")}
            )

            return {
                "success": True,
                "inquiry_id": result["inquiry_id"],
                "inquiry_url": result["inquiry_url"],
                "status": result["status"],
                "message": "Please complete verification at the provided URL"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to create inquiry"))

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/persona/status/{inquiry_id}")
async def get_persona_status(inquiry_id: str):
    """Get the status of a Persona verification inquiry"""
    try:
        service = get_verification_service("persona")
        result = await service.get_persona_inquiry_status(inquiry_id)

        return {
            "verification_id": result.verification_id,
            "status": result.status.value,
            "provider": result.provider.value,
            "confidence_score": result.confidence_score,
            "issues": result.issues,
            "verified_at": result.verified_at.isoformat() if result.verified_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: Persona webhook is implemented in main_new.py at /api/verification/webhook/persona
# That implementation handles vendor/driver verification with AI auto-processing.
# Do not duplicate here to avoid route conflicts.


# =============================================================================
# ONFIDO ENDPOINTS
# =============================================================================

@router.post("/onfido/create-applicant")
async def create_onfido_applicant(
    request: CreateVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Create an Onfido applicant and return SDK token.

    The SDK token is used to initialize the Onfido SDK in the mobile app
    for document capture and liveness check.
    """
    # Rate limit check
    if not check_rate_limit(request.entity_type, request.entity_id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 10 verification requests per hour."
        )

    try:
        service = get_verification_service("onfido")

        # Create applicant
        applicant_result = await service.create_onfido_applicant(
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            entity_id=str(request.entity_id),
            entity_type=request.entity_type
        )

        if not applicant_result["success"]:
            raise HTTPException(status_code=400, detail=applicant_result.get("error", "Failed to create applicant"))

        applicant_id = applicant_result["applicant_id"]

        # Generate SDK token
        token_result = await service.generate_onfido_sdk_token(applicant_id)

        if not token_result["success"]:
            raise HTTPException(status_code=400, detail=token_result.get("error", "Failed to generate SDK token"))

        log_verification_event(
            event_type="applicant_created",
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            provider="onfido",
            details={"applicant_id": applicant_id}
        )

        return {
            "success": True,
            "applicant_id": applicant_id,
            "sdk_token": token_result["sdk_token"],
            "message": "Use the SDK token to initialize Onfido SDK"
        }

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onfido/create-check")
async def create_onfido_check(
    applicant_id: str,
    document_ids: List[str],
    db: Session = Depends(get_db)
):
    """
    Create an Onfido verification check after documents are uploaded.
    """
    try:
        service = get_verification_service("onfido")

        result = await service.create_onfido_check(
            applicant_id=applicant_id,
            document_ids=document_ids
        )

        if result["success"]:
            log_verification_event(
                event_type="check_created",
                entity_type="unknown",
                entity_id=0,
                provider="onfido",
                details={"check_id": result.get("check_id"), "applicant_id": applicant_id}
            )

            return {
                "success": True,
                "check_id": result["check_id"],
                "status": result["status"]
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to create check"))

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: Onfido webhook is implemented in main_new.py at /api/verification/webhook/onfido
# That implementation actually updates Driver verification status.
# Do not duplicate here to avoid route conflicts.


# =============================================================================
# VERIFF ENDPOINTS
# =============================================================================

@router.post("/veriff/create-session")
async def create_veriff_session(
    request: CreateVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Create a Veriff verification session.

    Returns a session URL that opens the Veriff verification flow.
    Supports identity documents and liveness check.
    """
    # Rate limit check
    if not check_rate_limit(request.entity_type, request.entity_id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 10 verification requests per hour."
        )

    try:
        service = get_verification_service("veriff")

        # Determine document type
        doc_type = DocumentType.DRIVERS_LICENSE
        if request.document_types and len(request.document_types) > 0:
            try:
                doc_type = DocumentType(request.document_types[0])
            except ValueError:
                pass

        result = await service.create_veriff_session(
            reference_id=str(request.entity_id),
            entity_type=request.entity_type,
            first_name=request.first_name,
            last_name=request.last_name,
            document_type=doc_type
        )

        if result["success"]:
            log_verification_event(
                event_type="session_created",
                entity_type=request.entity_type,
                entity_id=request.entity_id,
                provider="veriff",
                details={"session_id": result.get("session_id")}
            )

            return {
                "success": True,
                "session_id": result["session_id"],
                "session_url": result["session_url"],
                "status": result["status"],
                "message": "Please complete verification at the provided URL"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to create session"))

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/veriff/status/{session_id}")
async def get_veriff_status(session_id: str):
    """Get the status of a Veriff verification session"""
    try:
        service = get_verification_service("veriff")
        result = await service.get_veriff_session_status(session_id)

        return {
            "verification_id": result.verification_id,
            "status": result.status.value,
            "provider": result.provider.value,
            "confidence_score": result.confidence_score,
            "issues": result.issues,
            "verified_at": result.verified_at.isoformat() if result.verified_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/veriff/decision/{session_id}")
async def get_veriff_decision(session_id: str):
    """Get the verification decision for a completed Veriff session"""
    try:
        service = get_verification_service("veriff")
        result = await service.get_veriff_decision(session_id)

        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to get decision"))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: Veriff webhook is implemented in main_new.py at /api/verification/webhook/veriff
# That implementation handles actual Driver/Vendor status updates.
# Do not duplicate here to avoid route conflicts.


# =============================================================================
# GENERIC ENDPOINTS
# =============================================================================

@router.get("/providers")
async def list_verification_providers():
    """
    List available verification providers and their configuration status.
    """
    providers = []

    # Check Persona
    persona_key = os.getenv("PERSONA_API_KEY")
    providers.append({
        "provider": "persona",
        "name": "Persona",
        "configured": bool(persona_key),
        "recommended_for": ["identity", "business_documents"],
        "features": ["document_verification", "selfie_verification", "address_verification"]
    })

    # Check Onfido
    onfido_key = os.getenv("ONFIDO_API_KEY")
    providers.append({
        "provider": "onfido",
        "name": "Onfido",
        "configured": bool(onfido_key),
        "recommended_for": ["identity"],
        "features": ["document_verification", "liveness_check", "facial_similarity"]
    })

    # Check Veriff
    veriff_key = os.getenv("VERIFF_API_KEY")
    providers.append({
        "provider": "veriff",
        "name": "Veriff",
        "configured": bool(veriff_key),
        "recommended_for": ["identity"],
        "features": ["document_verification", "video_verification", "biometric_check"]
    })

    return {
        "providers": providers,
        "environment": _ENVIRONMENT,
        "default_provider": os.getenv("DOCUMENT_VERIFICATION_PROVIDER", "persona")
    }


@router.get("/required-documents/{entity_type}")
async def get_required_documents(entity_type: str):
    """
    Get the list of required documents for a given entity type.
    """
    if entity_type not in ["driver", "vendor"]:
        raise HTTPException(status_code=400, detail="Invalid entity type. Must be 'driver' or 'vendor'")

    service = get_verification_service()
    documents = service.get_required_documents(entity_type)

    return {
        "entity_type": entity_type,
        "documents": [
            {
                "type": doc["type"].value,
                "label": doc["label"],
                "description": doc["description"],
                "required": doc["required"],
                "accepted_formats": doc["accepts"]
            }
            for doc in documents
        ]
    }


# =============================================================================
# BACKGROUND TASKS
# =============================================================================
# NOTE: Webhook processing is handled in main_new.py which has the complete
# implementation for updating Driver/Vendor verification status.
