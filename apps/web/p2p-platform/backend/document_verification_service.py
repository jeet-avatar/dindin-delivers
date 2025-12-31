"""
Document Verification Service

Integrates with third-party verification providers for document validation.
Supports multiple providers: Persona, Onfido, Veriff, or custom OCR validation.

Usage:
    from document_verification_service import DocumentVerificationService

    verifier = DocumentVerificationService(provider="persona")
    result = verifier.verify_document(document_url, document_type, metadata)
"""

import os
import httpx
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class VerificationProvider(str, Enum):
    PERSONA = "persona"
    ONFIDO = "onfido"
    VERIFF = "veriff"
    MANUAL = "manual"  # For manual review workflow


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
    Multi-provider document verification service.

    Supports:
    - Persona (recommended for identity + business docs)
    - Onfido (identity verification)
    - Veriff (identity verification)
    - Manual review workflow
    """

    def __init__(self, provider: str = "persona"):
        self.provider = VerificationProvider(provider)
        self._load_credentials()

    def _load_credentials(self):
        """Load API credentials from environment variables"""
        if self.provider == VerificationProvider.PERSONA:
            self.api_key = os.getenv("PERSONA_API_KEY")
            self.api_url = os.getenv("PERSONA_API_URL", "https://withpersona.com/api/v1")
            self.template_id = os.getenv("PERSONA_TEMPLATE_ID")
            self.webhook_secret = os.getenv("PERSONA_WEBHOOK_SECRET")

        elif self.provider == VerificationProvider.ONFIDO:
            self.api_key = os.getenv("ONFIDO_API_KEY")
            self.api_url = os.getenv("ONFIDO_API_URL", "https://api.onfido.com/v3.6")
            self.webhook_secret = os.getenv("ONFIDO_WEBHOOK_SECRET")

        elif self.provider == VerificationProvider.VERIFF:
            self.api_key = os.getenv("VERIFF_API_KEY")
            self.api_url = os.getenv("VERIFF_API_URL", "https://stationapi.veriff.com/v1")
            self.webhook_secret = os.getenv("VERIFF_WEBHOOK_SECRET")

    # =========================================================================
    # PERSONA INTEGRATION
    # =========================================================================

    async def create_persona_inquiry(
        self,
        reference_id: str,
        entity_type: str,  # "vendor" or "driver"
        email: str,
        document_types: List[DocumentType]
    ) -> Dict[str, Any]:
        """
        Create a Persona inquiry for document verification.
        Returns an inquiry URL that the user can use to upload documents.
        """
        if not self.api_key:
            raise ValueError("PERSONA_API_KEY not configured")

        # Map document types to Persona verification types
        verification_types = self._map_to_persona_types(document_types)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/inquiries",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "Persona-Version": "2023-01-05"
                },
                json={
                    "data": {
                        "type": "inquiry",
                        "attributes": {
                            "inquiry-template-id": self.template_id,
                            "reference-id": f"{entity_type}_{reference_id}",
                            "fields": {
                                "email-address": email,
                                "entity-type": entity_type
                            }
                        }
                    }
                }
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "inquiry_id": data["data"]["id"],
                    "inquiry_url": data["data"]["attributes"].get("inquiry-url"),
                    "status": data["data"]["attributes"]["status"]
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }

    async def get_persona_inquiry_status(self, inquiry_id: str) -> VerificationResult:
        """Get the status of a Persona inquiry"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/inquiries/{inquiry_id}",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Persona-Version": "2023-01-05"
                }
            )

            if response.status_code == 200:
                data = response.json()["data"]
                attrs = data["attributes"]

                status = self._map_persona_status(attrs["status"])

                return VerificationResult(
                    status=status,
                    provider=VerificationProvider.PERSONA,
                    verification_id=inquiry_id,
                    document_type=DocumentType.BUSINESS_LICENSE,  # Will be updated based on actual docs
                    confidence_score=attrs.get("score"),
                    extracted_data=attrs.get("fields", {}),
                    issues=self._extract_persona_issues(data),
                    verified_at=datetime.now() if status == VerificationStatus.VERIFIED else None,
                    raw_response=data
                )
            else:
                return VerificationResult(
                    status=VerificationStatus.PENDING,
                    provider=VerificationProvider.PERSONA,
                    document_type=DocumentType.BUSINESS_LICENSE,
                    issues=[f"Failed to get inquiry status: {response.text}"]
                )

    def verify_persona_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify Persona webhook signature"""
        if not self.webhook_secret:
            return False

        expected_sig = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(f"sha256={expected_sig}", signature)

    def _map_persona_status(self, status: str) -> VerificationStatus:
        """Map Persona status to our status"""
        mapping = {
            "created": VerificationStatus.PENDING,
            "pending": VerificationStatus.IN_REVIEW,
            "completed": VerificationStatus.VERIFIED,
            "approved": VerificationStatus.VERIFIED,
            "declined": VerificationStatus.REJECTED,
            "failed": VerificationStatus.REJECTED,
            "needs_review": VerificationStatus.NEEDS_REVIEW,
            "expired": VerificationStatus.EXPIRED
        }
        return mapping.get(status, VerificationStatus.PENDING)

    def _map_to_persona_types(self, doc_types: List[DocumentType]) -> List[str]:
        """Map our document types to Persona verification types"""
        mapping = {
            DocumentType.DRIVERS_LICENSE: "government_id",
            DocumentType.BUSINESS_LICENSE: "document",
            DocumentType.FOOD_LICENSE: "document",
            DocumentType.HEALTH_PERMIT: "document",
            DocumentType.LIABILITY_INSURANCE: "document",
            DocumentType.W9_FORM: "document",
            DocumentType.VEHICLE_INSURANCE: "document",
            DocumentType.PROFILE_PHOTO: "selfie"
        }
        return [mapping.get(dt, "document") for dt in doc_types]

    def _extract_persona_issues(self, data: Dict) -> List[str]:
        """Extract issues/warnings from Persona response"""
        issues = []
        if "included" in data:
            for item in data["included"]:
                if item["type"] == "verification" and item["attributes"].get("checks"):
                    for check in item["attributes"]["checks"]:
                        if check.get("status") != "passed":
                            issues.append(f"{check.get('name')}: {check.get('reasons', [])}")
        return issues

    # =========================================================================
    # ONFIDO INTEGRATION
    # =========================================================================

    async def create_onfido_applicant(
        self,
        first_name: str,
        last_name: str,
        email: str,
        entity_id: str,
        entity_type: str
    ) -> Dict[str, Any]:
        """Create an Onfido applicant for verification"""
        if not self.api_key:
            raise ValueError("ONFIDO_API_KEY not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/applicants",
                headers={
                    "Authorization": f"Token token={self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "location": {
                        "country_of_residence": "USA"
                    }
                }
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "applicant_id": data["id"]
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }

    async def create_onfido_check(
        self,
        applicant_id: str,
        document_ids: List[str]
    ) -> Dict[str, Any]:
        """Create an Onfido check for document verification"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/checks",
                headers={
                    "Authorization": f"Token token={self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "applicant_id": applicant_id,
                    "report_names": ["document", "identity_enhanced"],
                    "document_ids": document_ids
                }
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "check_id": data["id"],
                    "status": data["status"]
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }

    async def generate_onfido_sdk_token(self, applicant_id: str) -> Dict[str, Any]:
        """Generate SDK token for Onfido web/mobile SDK"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/sdk_token",
                headers={
                    "Authorization": f"Token token={self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "applicant_id": applicant_id,
                    "referrer": "*://*/*"  # Configure based on your domains
                }
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "sdk_token": data["token"]
                }
            else:
                return {
                    "success": False,
                    "error": response.text
                }

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
    provider = provider or os.getenv("DOCUMENT_VERIFICATION_PROVIDER", "persona")
    return DocumentVerificationService(provider=provider)
