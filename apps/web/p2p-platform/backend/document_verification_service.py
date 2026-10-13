"""
Document Verification Service

Driver background checks are handled by Checkr (see checkr_service.py), which is the
provider named in Zietra's CPUC TNC permit and the live enforced gate.

This module now provides only the generic, provider-agnostic pieces that survive
on top of that: the manual-review workflow for document uploads, and document
expiry validation. Persona, Onfido, and Veriff integrations were removed — they
were superseded by Checkr and had zero live callers.

Usage:
    from document_verification_service import DocumentVerificationService

    verifier = DocumentVerificationService()
    task = verifier.create_manual_review_task(...)
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class VerificationProvider(str, Enum):
    MANUAL = "manual"  # Manual review workflow (Persona/Onfido/Veriff removed — see Checkr)


class VerificationStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"  # AI flagged for manual review
    EXPIRED = "expired"


class DocumentType(str, Enum):
    # Vendor documents
    FOOD_LICENSE = "food_license"
    HEALTH_PERMIT = "health_permit"
    BUSINESS_LICENSE = "business_license"
    LIABILITY_INSURANCE = "liability_insurance"
    W9_FORM = "w9_form"

    # Driver documents
    DRIVERS_LICENSE = "drivers_license"
    VEHICLE_INSURANCE = "vehicle_insurance"
    VEHICLE_REGISTRATION = "vehicle_registration"
    PROFILE_PHOTO = "profile_photo"


class VerificationResult(BaseModel):
    status: VerificationStatus
    provider: VerificationProvider
    verification_id: Optional[str] = None
    document_type: DocumentType
    confidence_score: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None
    expiry_date: Optional[datetime] = None
    issues: List[str] = []
    verified_at: Optional[datetime] = None
    raw_response: Optional[Dict[str, Any]] = None


class DocumentVerificationService:
    """
    Document verification helper: manual-review workflow + document validation.

    Third-party identity/document providers (Persona, Onfido, Veriff) were removed;
    driver background checks go through Checkr (checkr_service.py) instead.
    """

    def __init__(self, provider: str = "manual"):
        self.provider = VerificationProvider(provider)

    # =========================================================================
    # MANUAL REVIEW WORKFLOW
    # =========================================================================

    def create_manual_review_task(
        self,
        entity_type: str,
        entity_id: int,
        document_type: DocumentType,
        document_url: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a manual review task for documents that need human verification.
        This creates a task in the ZIP dashboard for admin review.
        """
        return {
            "task_id": f"review_{entity_type}_{entity_id}_{document_type.value}_{datetime.now().timestamp()}",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "document_type": document_type.value,
            "document_url": document_url,
            "status": VerificationStatus.IN_REVIEW.value,
            "created_at": datetime.now().isoformat(),
            "metadata": metadata,
            "assigned_to": None,
            "notes": []
        }

    # =========================================================================
    # DOCUMENT VALIDATION HELPERS
    # =========================================================================

    def validate_document_expiry(self, expiry_date: datetime) -> Dict[str, Any]:
        """Check if document is expired or expiring soon"""
        now = datetime.now()

        if expiry_date < now:
            return {
                "valid": False,
                "status": "expired",
                "message": f"Document expired on {expiry_date.strftime('%Y-%m-%d')}"
            }

        days_until_expiry = (expiry_date - now).days

        if days_until_expiry < 30:
            return {
                "valid": True,
                "status": "expiring_soon",
                "message": f"Document expires in {days_until_expiry} days",
                "days_remaining": days_until_expiry
            }

        return {
            "valid": True,
            "status": "valid",
            "message": "Document is valid",
            "days_remaining": days_until_expiry
        }

    def get_required_documents(self, entity_type: str) -> List[Dict[str, Any]]:
        """Get list of required documents for entity type"""
        if entity_type == "vendor":
            return [
                {
                    "type": DocumentType.FOOD_LICENSE,
                    "label": "Food Service License",
                    "description": "Valid food service/handling license from local health department",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                },
                {
                    "type": DocumentType.HEALTH_PERMIT,
                    "label": "Health Department Permit",
                    "description": "Current health inspection certificate",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                },
                {
                    "type": DocumentType.BUSINESS_LICENSE,
                    "label": "Business License / W-9",
                    "description": "Valid business operating license or W-9 tax form",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                },
                {
                    "type": DocumentType.LIABILITY_INSURANCE,
                    "label": "Liability Insurance Certificate",
                    "description": "Proof of general liability insurance coverage (min $1M)",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                }
            ]

        elif entity_type == "driver":
            return [
                {
                    "type": DocumentType.DRIVERS_LICENSE,
                    "label": "Driver's License",
                    "description": "Valid government-issued driver's license",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                },
                {
                    "type": DocumentType.VEHICLE_INSURANCE,
                    "label": "Vehicle Insurance",
                    "description": "Current auto insurance policy",
                    "required": True,
                    "accepts": [".pdf", ".jpg", ".jpeg", ".png"]
                },
                {
                    "type": DocumentType.PROFILE_PHOTO,
                    "label": "Profile Photo",
                    "description": "Clear photo of your face for customer identification",
                    "required": True,
                    "accepts": [".jpg", ".jpeg", ".png"]
                }
            ]

        return []


# =========================================================================
# VERIFICATION DATABASE MODELS (for tracking verification status)
# =========================================================================

class DocumentVerificationRecord(BaseModel):
    """Record of a document verification attempt"""
    id: Optional[int] = None
    entity_type: str  # "vendor" or "driver"
    entity_id: int
    document_type: str
    document_url: str
    provider: str
    provider_reference_id: Optional[str] = None
    status: str = VerificationStatus.PENDING.value
    confidence_score: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None
    expiry_date: Optional[datetime] = None
    issues: List[str] = []
    reviewer_id: Optional[int] = None
    reviewer_notes: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    verified_at: Optional[datetime] = None


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def get_verification_service(provider: str = None) -> DocumentVerificationService:
    """Factory function to get verification service instance"""
    provider = provider or os.getenv("DOCUMENT_VERIFICATION_PROVIDER", "manual")
    return DocumentVerificationService(provider=provider)
