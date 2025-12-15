"""
DRIVER VERIFICATION MODULE
===========================
Comprehensive driver verification, insurance, background check, and legal compliance system.
Required for TNC/rideshare compliance in all US states.

Features:
- Document upload and verification
- Background check integration (Checkr-compatible)
- Insurance verification with coverage tracking
- Vehicle inspection management
- Legal consent tracking with versioning
- Admin verification dashboard endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import secrets
import json
import os

from database import get_db
from models import (
    Driver, DriverStatus, DriverDocument, DriverConsent, DriverVerificationHistory,
    Customer, CustomerConsent, LegalDocument, BackgroundCheckRequest,
    DocumentType, DocumentStatus, ConsentType, BackgroundCheckStatus, InsuranceType
)

router = APIRouter(prefix="/api/driver-verification", tags=["driver-verification"])


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class OnboardingStepResponse(BaseModel):
    """Driver onboarding progress"""
    driver_id: int
    current_step: int
    total_steps: int
    step_name: str
    progress_percentage: float
    steps_completed: List[str]
    steps_remaining: List[str]
    can_accept_rides: bool
    blocking_issues: List[str]


class DriverVerificationStatus(BaseModel):
    """Complete verification status for a driver"""
    driver_id: int
    overall_status: str
    verification_complete: bool
    can_accept_rides: bool

    # Document Status
    drivers_license_status: str
    drivers_license_expiry: Optional[str]
    insurance_status: str
    insurance_expiry: Optional[str]
    insurance_has_rideshare_coverage: bool
    vehicle_registration_status: str
    profile_photo_status: str

    # Background Check
    background_check_status: str
    background_check_clear: bool
    background_check_expiry: Optional[str]

    # Vehicle
    vehicle_meets_requirements: bool
    vehicle_inspection_passed: bool
    vehicle_inspection_expiry: Optional[str]

    # Consent Status
    all_consents_signed: bool
    missing_consents: List[str]

    # Timestamps
    last_updated: str


class DocumentUploadRequest(BaseModel):
    """Request to upload a document"""
    document_type: str
    expiry_date: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentUploadResponse(BaseModel):
    """Response after document upload"""
    success: bool
    document_id: int
    document_type: str
    status: str
    message: str


class ConsentRequest(BaseModel):
    """Request to record consent"""
    consent_type: str
    consent_version: str
    agreed: bool
    electronic_signature: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_id: Optional[str] = None


class ConsentResponse(BaseModel):
    """Response after recording consent"""
    success: bool
    consent_id: int
    consent_type: str
    agreed_at: str
    message: str


class BackgroundCheckInitRequest(BaseModel):
    """Request to initiate background check"""
    package_type: str = "standard"  # basic, standard, premium
    consent_given: bool = True


class BackgroundCheckResponse(BaseModel):
    """Response from background check operations"""
    success: bool
    request_id: Optional[int] = None
    status: str
    message: str
    estimated_completion: Optional[str] = None


class InsuranceVerificationRequest(BaseModel):
    """Request to verify insurance"""
    provider: str
    policy_number: str
    expiry_date: str
    liability_amount: float
    has_rideshare_coverage: bool
    insurance_type: str = "personal"


class VehicleInfoRequest(BaseModel):
    """Request to update vehicle information"""
    vehicle_type: str
    make: str
    model: str
    year: int
    color: str
    license_plate: str
    license_plate_state: str
    vin: Optional[str] = None
    doors: int = 4
    seats: int = 5


class VehicleInspectionRequest(BaseModel):
    """Request to record vehicle inspection"""
    inspection_date: str
    inspection_passed: bool
    inspection_notes: Optional[str] = None


# Admin Models
class AdminDocumentReviewRequest(BaseModel):
    """Admin request to review a document"""
    status: str  # approved, rejected
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None


class AdminDriverStatusUpdateRequest(BaseModel):
    """Admin request to update driver status"""
    new_status: str
    reason: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_driver_or_404(driver_id: int, db: Session) -> Driver:
    """Get driver by ID or raise 404"""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    return driver


def calculate_verification_progress(driver: Driver) -> Dict[str, Any]:
    """Calculate driver's verification progress"""
    steps = {
        1: ("Personal Info", True),  # Always complete after registration
        2: ("Documents", driver.drivers_license_verified and driver.insurance_verified),
        3: ("Vehicle", driver.vehicle_registration_verified and driver.vehicle_meets_requirements),
        4: ("Background Check", driver.background_check_clear),
        5: ("Legal Agreements", driver.tos_accepted and driver.driver_agreement_accepted)
    }

    completed = [name for step, (name, done) in steps.items() if done]
    remaining = [name for step, (name, done) in steps.items() if not done]
    current_step = len(completed) + 1

    return {
        "current_step": min(current_step, 5),
        "total_steps": 5,
        "completed": completed,
        "remaining": remaining,
        "percentage": (len(completed) / 5) * 100
    }


def check_can_accept_rides(driver: Driver) -> tuple[bool, List[str]]:
    """Check if driver can accept rides and return blocking issues"""
    issues = []

    # Check driver's license
    if not driver.drivers_license_verified:
        issues.append("Driver's license not verified")
    elif driver.drivers_license_expiry and driver.drivers_license_expiry < datetime.utcnow():
        issues.append("Driver's license expired")

    # Check insurance
    if not driver.insurance_verified:
        issues.append("Insurance not verified")
    elif driver.insurance_expiry and driver.insurance_expiry < datetime.utcnow():
        issues.append("Insurance expired")

    # For rideshare, require rideshare coverage
    if not driver.insurance_has_rideshare_coverage:
        issues.append("Rideshare insurance coverage required")

    # Check background check
    if not driver.background_check_clear:
        issues.append("Background check not cleared")
    elif driver.background_check_expiry and driver.background_check_expiry < datetime.utcnow():
        issues.append("Background check expired (renewal required)")

    # Check vehicle
    if not driver.vehicle_meets_requirements:
        issues.append("Vehicle does not meet requirements")
    if driver.vehicle_inspection_required and not driver.vehicle_inspection_passed:
        issues.append("Vehicle inspection required")

    # Check legal agreements
    if not driver.tos_accepted:
        issues.append("Terms of Service not accepted")
    if not driver.driver_agreement_accepted:
        issues.append("Driver Agreement not signed")
    if not driver.background_check_consent:
        issues.append("Background check consent not given")

    # Check status
    if driver.status in [DriverStatus.SUSPENDED, DriverStatus.DEACTIVATED]:
        issues.append(f"Account {driver.status.value}")

    can_accept = len(issues) == 0
    return can_accept, issues


def log_verification_change(
    db: Session,
    driver_id: int,
    change_type: str,
    field_changed: str,
    old_value: Any,
    new_value: Any,
    reason: str,
    changed_by: str,
    changed_by_type: str = "system"
):
    """Log a verification status change for audit trail"""
    history = DriverVerificationHistory(
        driver_id=driver_id,
        change_type=change_type,
        field_changed=field_changed,
        old_value=str(old_value) if old_value else None,
        new_value=str(new_value) if new_value else None,
        reason=reason,
        changed_by=changed_by,
        changed_by_type=changed_by_type
    )
    db.add(history)
    db.commit()


def check_vehicle_requirements(driver: Driver) -> tuple[bool, List[str]]:
    """Check if vehicle meets TNC requirements"""
    issues = []

    # Year requirement (typically 10-15 years max)
    current_year = datetime.utcnow().year
    if driver.vehicle_year and (current_year - driver.vehicle_year) > 15:
        issues.append(f"Vehicle too old ({driver.vehicle_year}). Must be {current_year - 15} or newer.")

    # Door requirement
    if driver.vehicle_doors and driver.vehicle_doors < 4:
        issues.append("Vehicle must have 4 doors")

    # Seat requirement
    if driver.vehicle_seats and driver.vehicle_seats < 4:
        issues.append("Vehicle must seat at least 4 passengers")

    meets_requirements = len(issues) == 0
    return meets_requirements, issues


# =============================================================================
# DRIVER ONBOARDING ENDPOINTS
# =============================================================================

@router.get("/{driver_id}/status", response_model=DriverVerificationStatus)
async def get_driver_verification_status(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get complete verification status for a driver.
    Used by driver app to show onboarding progress.
    """
    driver = get_driver_or_404(driver_id, db)
    can_accept, issues = check_can_accept_rides(driver)

    # Calculate missing consents
    missing_consents = []
    if not driver.tos_accepted:
        missing_consents.append("terms_of_service")
    if not driver.privacy_policy_accepted:
        missing_consents.append("privacy_policy")
    if not driver.driver_agreement_accepted:
        missing_consents.append("driver_agreement")
    if not driver.background_check_consent:
        missing_consents.append("background_check_authorization")
    if not driver.insurance_disclosure_accepted:
        missing_consents.append("insurance_disclosure")
    if not driver.safety_guidelines_accepted:
        missing_consents.append("safety_guidelines")

    return DriverVerificationStatus(
        driver_id=driver.id,
        overall_status=driver.status.value if driver.status else "pending",
        verification_complete=driver.verification_complete or False,
        can_accept_rides=can_accept,

        drivers_license_status=driver.drivers_license_status.value if driver.drivers_license_status else "pending",
        drivers_license_expiry=driver.drivers_license_expiry.isoformat() if driver.drivers_license_expiry else None,
        insurance_status=driver.insurance_status.value if driver.insurance_status else "pending",
        insurance_expiry=driver.insurance_expiry.isoformat() if driver.insurance_expiry else None,
        insurance_has_rideshare_coverage=driver.insurance_has_rideshare_coverage or False,
        vehicle_registration_status=driver.vehicle_registration_status.value if driver.vehicle_registration_status else "pending",
        profile_photo_status=driver.profile_photo_status.value if driver.profile_photo_status else "pending",

        background_check_status=driver.background_check_status.value if driver.background_check_status else "not_started",
        background_check_clear=driver.background_check_clear or False,
        background_check_expiry=driver.background_check_expiry.isoformat() if driver.background_check_expiry else None,

        vehicle_meets_requirements=driver.vehicle_meets_requirements or False,
        vehicle_inspection_passed=driver.vehicle_inspection_passed or False,
        vehicle_inspection_expiry=driver.vehicle_inspection_expiry.isoformat() if driver.vehicle_inspection_expiry else None,

        all_consents_signed=len(missing_consents) == 0,
        missing_consents=missing_consents,

        last_updated=driver.updated_at.isoformat() if driver.updated_at else datetime.utcnow().isoformat()
    )


@router.get("/{driver_id}/onboarding-progress", response_model=OnboardingStepResponse)
async def get_onboarding_progress(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver's onboarding progress for step-by-step UI.
    """
    driver = get_driver_or_404(driver_id, db)
    progress = calculate_verification_progress(driver)
    can_accept, issues = check_can_accept_rides(driver)

    step_names = ["Personal Info", "Documents", "Vehicle", "Background Check", "Legal Agreements"]
    current_step_name = step_names[progress["current_step"] - 1] if progress["current_step"] <= 5 else "Complete"

    return OnboardingStepResponse(
        driver_id=driver.id,
        current_step=progress["current_step"],
        total_steps=progress["total_steps"],
        step_name=current_step_name,
        progress_percentage=progress["percentage"],
        steps_completed=progress["completed"],
        steps_remaining=progress["remaining"],
        can_accept_rides=can_accept,
        blocking_issues=issues
    )


# =============================================================================
# DOCUMENT MANAGEMENT
# =============================================================================

@router.post("/{driver_id}/documents/upload")
async def upload_document(
    driver_id: int,
    document_type: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document for verification.
    In production, this would upload to S3/CloudFront.
    """
    driver = get_driver_or_404(driver_id, db)

    # Validate document type
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: {document_type}"
        )

    # In production: Upload to S3 and get URL
    # For now, we'll simulate with a placeholder URL
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()[:16]
    document_url = f"https://docs.dollor.ai/drivers/{driver_id}/{document_type}_{file_hash}.{file.filename.split('.')[-1]}"

    # Parse expiry date
    expiry_datetime = None
    if expiry_date:
        try:
            expiry_datetime = datetime.fromisoformat(expiry_date.replace('Z', '+00:00'))
        except:
            pass

    # Create document record
    doc = DriverDocument(
        driver_id=driver_id,
        document_type=doc_type,
        document_url=document_url,
        document_name=file.filename,
        file_size=len(file_content),
        mime_type=file.content_type,
        status=DocumentStatus.PENDING,
        expiry_date=expiry_datetime
    )
    db.add(doc)

    # Update driver based on document type
    if doc_type == DocumentType.DRIVERS_LICENSE:
        driver.drivers_license = True
        driver.drivers_license_url = document_url
        driver.drivers_license_expiry = expiry_datetime
        driver.drivers_license_status = DocumentStatus.PENDING
    elif doc_type == DocumentType.INSURANCE_CARD:
        driver.insurance = True
        driver.insurance_url = document_url
        driver.insurance_expiry = expiry_datetime
        driver.insurance_status = DocumentStatus.PENDING
    elif doc_type == DocumentType.VEHICLE_REGISTRATION:
        driver.vehicle_registration_url = document_url
        driver.vehicle_registration_expiry = expiry_datetime
        driver.vehicle_registration_status = DocumentStatus.PENDING
    elif doc_type == DocumentType.PROFILE_PHOTO:
        driver.profile_photo_url = document_url
        driver.profile_photo_status = DocumentStatus.PENDING
    elif doc_type == DocumentType.VEHICLE_INSPECTION:
        driver.vehicle_inspection_url = document_url

    # Update status if this is first document
    if driver.status == DriverStatus.PENDING:
        driver.status = DriverStatus.DOCUMENTS_REQUIRED

    db.commit()
    db.refresh(doc)

    # Log the change
    log_verification_change(
        db, driver_id, "document_uploaded", document_type,
        None, document_url, f"Document uploaded: {file.filename}",
        "driver", "driver"
    )

    return {
        "success": True,
        "document_id": doc.id,
        "document_type": document_type,
        "status": "pending",
        "message": "Document uploaded successfully. Pending verification."
    }


@router.get("/{driver_id}/documents")
async def get_driver_documents(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """Get all documents for a driver"""
    driver = get_driver_or_404(driver_id, db)

    documents = db.query(DriverDocument).filter(
        DriverDocument.driver_id == driver_id
    ).order_by(DriverDocument.created_at.desc()).all()

    return {
        "driver_id": driver_id,
        "documents": [
            {
                "id": doc.id,
                "type": doc.document_type.value,
                "status": doc.status.value,
                "url": doc.document_url,
                "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                "rejection_reason": doc.rejection_reason,
                "uploaded_at": doc.created_at.isoformat(),
                "verified_at": doc.verified_at.isoformat() if doc.verified_at else None
            }
            for doc in documents
        ]
    }


# =============================================================================
# CONSENT MANAGEMENT
# =============================================================================

@router.post("/{driver_id}/consent", response_model=ConsentResponse)
async def record_consent(
    driver_id: int,
    request: ConsentRequest,
    db: Session = Depends(get_db)
):
    """
    Record driver's consent to a legal agreement.
    """
    driver = get_driver_or_404(driver_id, db)

    # Validate consent type
    try:
        consent_type = ConsentType(request.consent_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid consent type: {request.consent_type}"
        )

    if not request.agreed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent must be agreed to"
        )

    # Get the legal document hash
    legal_doc = db.query(LegalDocument).filter(
        and_(
            LegalDocument.document_type == consent_type,
            LegalDocument.version == request.consent_version,
            LegalDocument.is_current == True
        )
    ).first()

    content_hash = legal_doc.content_hash if legal_doc else hashlib.sha256(
        f"{consent_type.value}_{request.consent_version}".encode()
    ).hexdigest()

    # Create consent record
    consent = DriverConsent(
        driver_id=driver_id,
        consent_type=consent_type,
        consent_version=request.consent_version,
        consent_text_hash=content_hash,
        agreed=True,
        agreed_at=datetime.utcnow(),
        ip_address=request.ip_address,
        user_agent=request.user_agent,
        device_id=request.device_id,
        electronic_signature=request.electronic_signature
    )
    db.add(consent)

    # Update driver consent fields
    now = datetime.utcnow()
    if consent_type == ConsentType.TERMS_OF_SERVICE:
        driver.tos_accepted = True
        driver.tos_accepted_at = now
        driver.tos_version = request.consent_version
    elif consent_type == ConsentType.PRIVACY_POLICY:
        driver.privacy_policy_accepted = True
        driver.privacy_policy_accepted_at = now
        driver.privacy_policy_version = request.consent_version
    elif consent_type == ConsentType.DRIVER_AGREEMENT:
        driver.driver_agreement_accepted = True
        driver.driver_agreement_accepted_at = now
        driver.driver_agreement_version = request.consent_version
    elif consent_type == ConsentType.BACKGROUND_CHECK_AUTH:
        driver.background_check_consent = True
        driver.background_check_consent_at = now
    elif consent_type == ConsentType.INSURANCE_DISCLOSURE:
        driver.insurance_disclosure_accepted = True
        driver.insurance_disclosure_accepted_at = now
    elif consent_type == ConsentType.SAFETY_GUIDELINES:
        driver.safety_guidelines_accepted = True
        driver.safety_guidelines_accepted_at = now

    db.commit()
    db.refresh(consent)

    # Log the change
    log_verification_change(
        db, driver_id, "consent_given", request.consent_type,
        False, True, f"Consent given for {request.consent_type} v{request.consent_version}",
        "driver", "driver"
    )

    return ConsentResponse(
        success=True,
        consent_id=consent.id,
        consent_type=consent_type.value,
        agreed_at=consent.agreed_at.isoformat(),
        message=f"Consent recorded for {consent_type.value}"
    )


@router.get("/{driver_id}/consents")
async def get_driver_consents(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """Get all consents for a driver"""
    driver = get_driver_or_404(driver_id, db)

    consents = db.query(DriverConsent).filter(
        DriverConsent.driver_id == driver_id
    ).order_by(DriverConsent.created_at.desc()).all()

    # Also return required consents and their status
    required_consents = [
        {"type": "terms_of_service", "signed": driver.tos_accepted, "signed_at": driver.tos_accepted_at},
        {"type": "privacy_policy", "signed": driver.privacy_policy_accepted, "signed_at": driver.privacy_policy_accepted_at},
        {"type": "driver_agreement", "signed": driver.driver_agreement_accepted, "signed_at": driver.driver_agreement_accepted_at},
        {"type": "background_check_authorization", "signed": driver.background_check_consent, "signed_at": driver.background_check_consent_at},
        {"type": "insurance_disclosure", "signed": driver.insurance_disclosure_accepted, "signed_at": driver.insurance_disclosure_accepted_at},
        {"type": "safety_guidelines", "signed": driver.safety_guidelines_accepted, "signed_at": driver.safety_guidelines_accepted_at},
    ]

    return {
        "driver_id": driver_id,
        "required_consents": [
            {
                **c,
                "signed_at": c["signed_at"].isoformat() if c["signed_at"] else None
            }
            for c in required_consents
        ],
        "consent_history": [
            {
                "id": c.id,
                "type": c.consent_type.value,
                "version": c.consent_version,
                "agreed": c.agreed,
                "agreed_at": c.agreed_at.isoformat() if c.agreed_at else None,
                "revoked": c.revoked,
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None
            }
            for c in consents
        ]
    }


# =============================================================================
# BACKGROUND CHECK
# =============================================================================

@router.post("/{driver_id}/background-check/initiate", response_model=BackgroundCheckResponse)
async def initiate_background_check(
    driver_id: int,
    request: BackgroundCheckInitRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate a background check for a driver.
    In production, this would call Checkr or similar API.
    """
    driver = get_driver_or_404(driver_id, db)

    # Verify consent is given
    if not driver.background_check_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Background check consent must be given before initiating check"
        )

    # Check if there's already a pending check
    existing = db.query(BackgroundCheckRequest).filter(
        and_(
            BackgroundCheckRequest.driver_id == driver_id,
            BackgroundCheckRequest.status.in_([
                BackgroundCheckStatus.PENDING,
                BackgroundCheckStatus.IN_PROGRESS
            ])
        )
    ).first()

    if existing:
        return BackgroundCheckResponse(
            success=False,
            request_id=existing.id,
            status=existing.status.value,
            message="Background check already in progress"
        )

    # Create background check request
    # In production, this would call Checkr API
    check_request = BackgroundCheckRequest(
        driver_id=driver_id,
        provider="checkr",  # Or configurable
        package_type=request.package_type,
        checks_requested=json.dumps(["criminal", "mvr", "ssn", "sex_offender"]),
        status=BackgroundCheckStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(days=365)  # 1 year expiry
    )
    db.add(check_request)

    # Update driver status
    driver.background_check_status = BackgroundCheckStatus.PENDING
    driver.background_check_requested_at = datetime.utcnow()

    if driver.status == DriverStatus.DOCUMENTS_REQUIRED:
        driver.status = DriverStatus.BACKGROUND_CHECK_PENDING

    db.commit()
    db.refresh(check_request)

    # Log the change
    log_verification_change(
        db, driver_id, "background_check_initiated", "background_check_status",
        "not_started", "pending", f"Background check initiated ({request.package_type})",
        "system", "system"
    )

    return BackgroundCheckResponse(
        success=True,
        request_id=check_request.id,
        status="pending",
        message="Background check initiated. You will be notified when complete.",
        estimated_completion=(datetime.utcnow() + timedelta(days=3)).isoformat()
    )


@router.get("/{driver_id}/background-check/status")
async def get_background_check_status(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """Get the latest background check status"""
    driver = get_driver_or_404(driver_id, db)

    latest_check = db.query(BackgroundCheckRequest).filter(
        BackgroundCheckRequest.driver_id == driver_id
    ).order_by(BackgroundCheckRequest.created_at.desc()).first()

    return {
        "driver_id": driver_id,
        "has_background_check": driver.background_check,
        "status": driver.background_check_status.value if driver.background_check_status else "not_started",
        "clear": driver.background_check_clear,
        "expiry": driver.background_check_expiry.isoformat() if driver.background_check_expiry else None,
        "latest_request": {
            "id": latest_check.id,
            "provider": latest_check.provider,
            "status": latest_check.status.value,
            "overall_result": latest_check.overall_result,
            "requested_at": latest_check.requested_at.isoformat() if latest_check.requested_at else None,
            "completed_at": latest_check.completed_at.isoformat() if latest_check.completed_at else None
        } if latest_check else None
    }


# =============================================================================
# INSURANCE VERIFICATION
# =============================================================================

@router.post("/{driver_id}/insurance")
async def submit_insurance_info(
    driver_id: int,
    request: InsuranceVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Submit insurance information for verification.
    """
    driver = get_driver_or_404(driver_id, db)

    # Parse expiry date
    try:
        expiry_date = datetime.fromisoformat(request.expiry_date.replace('Z', '+00:00'))
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid expiry date format"
        )

    # Check if expired
    if expiry_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insurance has already expired"
        )

    # Validate insurance type
    try:
        ins_type = InsuranceType(request.insurance_type)
    except ValueError:
        ins_type = InsuranceType.PERSONAL

    # Update driver insurance info
    driver.insurance_provider = request.provider
    driver.insurance_policy_number = request.policy_number
    driver.insurance_expiry = expiry_date
    driver.insurance_liability_amount = request.liability_amount
    driver.insurance_has_rideshare_coverage = request.has_rideshare_coverage
    driver.insurance_type = ins_type
    driver.insurance_status = DocumentStatus.PENDING  # Pending verification

    # Check minimum liability (typically $1M for rideshare)
    min_liability = 1000000.0  # $1M
    if request.liability_amount < min_liability and request.has_rideshare_coverage:
        db.commit()
        return {
            "success": True,
            "status": "pending",
            "warning": f"Liability coverage (${request.liability_amount:,.0f}) is below recommended minimum (${min_liability:,.0f})",
            "message": "Insurance information submitted. Pending verification."
        }

    db.commit()

    # Log the change
    log_verification_change(
        db, driver_id, "insurance_updated", "insurance",
        None, f"{request.provider} - {request.policy_number}",
        "Insurance information submitted",
        "driver", "driver"
    )

    return {
        "success": True,
        "status": "pending",
        "message": "Insurance information submitted. Pending verification.",
        "has_rideshare_coverage": request.has_rideshare_coverage,
        "expiry": expiry_date.isoformat()
    }


# =============================================================================
# VEHICLE MANAGEMENT
# =============================================================================

@router.post("/{driver_id}/vehicle")
async def update_vehicle_info(
    driver_id: int,
    request: VehicleInfoRequest,
    db: Session = Depends(get_db)
):
    """
    Update vehicle information.
    """
    driver = get_driver_or_404(driver_id, db)

    # Update vehicle info
    driver.vehicle_type = request.vehicle_type
    driver.vehicle_make = request.make
    driver.vehicle_model = request.model
    driver.vehicle_year = request.year
    driver.vehicle_color = request.color
    driver.license_plate = request.license_plate
    driver.license_plate_state = request.license_plate_state
    driver.vehicle_vin = request.vin
    driver.vehicle_doors = request.doors
    driver.vehicle_seats = request.seats

    # Check if vehicle meets requirements
    meets_requirements, issues = check_vehicle_requirements(driver)
    driver.vehicle_meets_requirements = meets_requirements

    db.commit()

    return {
        "success": True,
        "vehicle_meets_requirements": meets_requirements,
        "issues": issues if not meets_requirements else [],
        "message": "Vehicle information updated" if meets_requirements else "Vehicle does not meet all requirements"
    }


@router.post("/{driver_id}/vehicle/inspection")
async def record_vehicle_inspection(
    driver_id: int,
    request: VehicleInspectionRequest,
    db: Session = Depends(get_db)
):
    """
    Record a vehicle inspection result.
    """
    driver = get_driver_or_404(driver_id, db)

    try:
        inspection_date = datetime.fromisoformat(request.inspection_date.replace('Z', '+00:00'))
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid inspection date format"
        )

    driver.vehicle_inspection_date = inspection_date
    driver.vehicle_inspection_passed = request.inspection_passed
    driver.vehicle_inspection_notes = request.inspection_notes

    # Set expiry (typically 1 year)
    driver.vehicle_inspection_expiry = inspection_date + timedelta(days=365)

    db.commit()

    return {
        "success": True,
        "passed": request.inspection_passed,
        "expiry": driver.vehicle_inspection_expiry.isoformat(),
        "message": "Vehicle inspection passed" if request.inspection_passed else "Vehicle inspection failed"
    }


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get("/admin/pending-reviews")
async def get_pending_reviews(
    db: Session = Depends(get_db)
):
    """
    Get all documents and drivers pending admin review.
    """
    # Get pending documents
    pending_docs = db.query(DriverDocument).filter(
        DriverDocument.status == DocumentStatus.PENDING
    ).order_by(DriverDocument.created_at).all()

    # Get drivers pending verification
    pending_drivers = db.query(Driver).filter(
        Driver.status.in_([
            DriverStatus.DOCUMENTS_REQUIRED,
            DriverStatus.BACKGROUND_CHECK_PENDING,
            DriverStatus.UNDER_REVIEW
        ])
    ).all()

    return {
        "pending_documents": [
            {
                "id": doc.id,
                "driver_id": doc.driver_id,
                "type": doc.document_type.value,
                "url": doc.document_url,
                "uploaded_at": doc.created_at.isoformat()
            }
            for doc in pending_docs
        ],
        "pending_drivers": [
            {
                "id": d.id,
                "name": f"{d.first_name} {d.last_name}",
                "email": d.email,
                "status": d.status.value,
                "created_at": d.created_at.isoformat()
            }
            for d in pending_drivers
        ],
        "total_pending_documents": len(pending_docs),
        "total_pending_drivers": len(pending_drivers)
    }


@router.post("/admin/documents/{document_id}/review")
async def admin_review_document(
    document_id: int,
    request: AdminDocumentReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Admin reviews and approves/rejects a document.
    """
    doc = db.query(DriverDocument).filter(DriverDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate status
    try:
        new_status = DocumentStatus(request.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'approved' or 'rejected'"
        )

    if new_status == DocumentStatus.REJECTED and not request.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason required"
        )

    # Update document
    old_status = doc.status.value
    doc.status = new_status
    doc.verified_at = datetime.utcnow() if new_status == DocumentStatus.APPROVED else None
    doc.verified_by = "admin"  # In production, use actual admin username
    doc.rejection_reason = request.rejection_reason if new_status == DocumentStatus.REJECTED else None

    # Update driver based on document type
    driver = db.query(Driver).filter(Driver.id == doc.driver_id).first()
    if driver:
        if doc.document_type == DocumentType.DRIVERS_LICENSE:
            driver.drivers_license_verified = (new_status == DocumentStatus.APPROVED)
            driver.drivers_license_verified_at = datetime.utcnow() if new_status == DocumentStatus.APPROVED else None
            driver.drivers_license_status = new_status
            driver.drivers_license_rejection_reason = request.rejection_reason
        elif doc.document_type == DocumentType.INSURANCE_CARD:
            driver.insurance_verified = (new_status == DocumentStatus.APPROVED)
            driver.insurance_verified_at = datetime.utcnow() if new_status == DocumentStatus.APPROVED else None
            driver.insurance_status = new_status
            driver.insurance_rejection_reason = request.rejection_reason
        elif doc.document_type == DocumentType.VEHICLE_REGISTRATION:
            driver.vehicle_registration_verified = (new_status == DocumentStatus.APPROVED)
            driver.vehicle_registration_status = new_status
        elif doc.document_type == DocumentType.PROFILE_PHOTO:
            driver.profile_photo_verified = (new_status == DocumentStatus.APPROVED)
            driver.profile_photo_status = new_status

        # Check if all required docs are approved
        can_accept, issues = check_can_accept_rides(driver)
        driver.can_accept_rides = can_accept

        if can_accept and driver.status != DriverStatus.ACTIVE:
            driver.status = DriverStatus.APPROVED
            driver.verification_complete = True
            driver.verification_completed_at = datetime.utcnow()

    db.commit()

    # Log the change
    log_verification_change(
        db, doc.driver_id, "document_reviewed", doc.document_type.value,
        old_status, new_status.value,
        request.rejection_reason or "Document approved",
        "admin", "admin"
    )

    return {
        "success": True,
        "document_id": document_id,
        "new_status": new_status.value,
        "message": f"Document {new_status.value}"
    }


@router.post("/admin/drivers/{driver_id}/status")
async def admin_update_driver_status(
    driver_id: int,
    request: AdminDriverStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Admin updates driver status (approve, suspend, deactivate).
    """
    driver = get_driver_or_404(driver_id, db)

    # Validate status
    try:
        new_status = DriverStatus(request.new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {request.new_status}"
        )

    old_status = driver.status.value if driver.status else "pending"
    driver.status = new_status
    driver.status_reason = request.reason
    driver.reviewed_by = "admin"  # In production, use actual admin username
    driver.reviewed_at = datetime.utcnow()

    if new_status == DriverStatus.APPROVED:
        driver.approved_at = datetime.utcnow()
    elif new_status == DriverStatus.ACTIVE:
        driver.can_accept_rides = True
    elif new_status in [DriverStatus.SUSPENDED, DriverStatus.DEACTIVATED]:
        driver.can_accept_rides = False
        driver.is_online = False
        if new_status == DriverStatus.DEACTIVATED:
            driver.deactivated_at = datetime.utcnow()

    db.commit()

    # Log the change
    log_verification_change(
        db, driver_id, "status_change", "status",
        old_status, new_status.value, request.reason,
        "admin", "admin"
    )

    return {
        "success": True,
        "driver_id": driver_id,
        "new_status": new_status.value,
        "message": f"Driver status updated to {new_status.value}"
    }


@router.get("/admin/drivers/{driver_id}/history")
async def get_driver_verification_history(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get complete verification history for a driver.
    """
    driver = get_driver_or_404(driver_id, db)

    history = db.query(DriverVerificationHistory).filter(
        DriverVerificationHistory.driver_id == driver_id
    ).order_by(DriverVerificationHistory.created_at.desc()).all()

    return {
        "driver_id": driver_id,
        "driver_name": f"{driver.first_name} {driver.last_name}",
        "current_status": driver.status.value if driver.status else "pending",
        "history": [
            {
                "id": h.id,
                "change_type": h.change_type,
                "field_changed": h.field_changed,
                "old_value": h.old_value,
                "new_value": h.new_value,
                "reason": h.reason,
                "changed_by": h.changed_by,
                "changed_by_type": h.changed_by_type,
                "timestamp": h.created_at.isoformat()
            }
            for h in history
        ]
    }


# =============================================================================
# LEGAL DOCUMENTS
# =============================================================================

@router.get("/legal-documents")
async def get_legal_documents(
    db: Session = Depends(get_db)
):
    """
    Get all current legal documents for display.
    """
    documents = db.query(LegalDocument).filter(
        LegalDocument.is_current == True,
        LegalDocument.is_published == True
    ).all()

    return {
        "documents": [
            {
                "type": doc.document_type.value,
                "version": doc.version,
                "title": doc.title,
                "effective_date": doc.effective_date.isoformat() if doc.effective_date else None,
                "content_url": doc.content_url
            }
            for doc in documents
        ]
    }


@router.get("/legal-documents/{document_type}")
async def get_legal_document(
    document_type: str,
    version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get a specific legal document.
    """
    try:
        doc_type = ConsentType(document_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: {document_type}"
        )

    query = db.query(LegalDocument).filter(LegalDocument.document_type == doc_type)

    if version:
        query = query.filter(LegalDocument.version == version)
    else:
        query = query.filter(LegalDocument.is_current == True)

    doc = query.first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "type": doc.document_type.value,
        "version": doc.version,
        "title": doc.title,
        "content": doc.content_text,
        "content_hash": doc.content_hash,
        "effective_date": doc.effective_date.isoformat() if doc.effective_date else None
    }
