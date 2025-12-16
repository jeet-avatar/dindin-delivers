"""
Comprehensive unit tests for document_verification_service.py

Tests cover:
1. Enums: VerificationProvider, VerificationStatus, DocumentType
2. Models: VerificationResult, DocumentVerificationRecord
3. DocumentVerificationService class methods
4. Helper functions

Run with: pytest tests/unit/test_document_verification.py -v
"""

import os
import hmac
import hashlib
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, patch, AsyncMock, MagicMock

# Import the classes and functions we're testing
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from document_verification_service import (
    VerificationProvider,
    VerificationStatus,
    DocumentType,
    VerificationResult,
    DocumentVerificationRecord,
    DocumentVerificationService,
    get_verification_service
)


# =========================================================================
# ENUM TESTS
# =========================================================================

class TestEnums:
    """Test all enum values and their string representations"""

    def test_verification_provider_enum(self):
        """Test VerificationProvider enum values"""
        assert VerificationProvider.PERSONA == "persona"
        assert VerificationProvider.ONFIDO == "onfido"
        assert VerificationProvider.VERIFF == "veriff"
        assert VerificationProvider.MANUAL == "manual"

        # Test all enum members exist
        providers = list(VerificationProvider)
        assert len(providers) == 4
        assert VerificationProvider.PERSONA in providers

    def test_verification_status_enum(self):
        """Test VerificationStatus enum values"""
        assert VerificationStatus.PENDING == "pending"
        assert VerificationStatus.IN_REVIEW == "in_review"
        assert VerificationStatus.VERIFIED == "verified"
        assert VerificationStatus.REJECTED == "rejected"
        assert VerificationStatus.NEEDS_REVIEW == "needs_review"
        assert VerificationStatus.EXPIRED == "expired"

        # Test all enum members exist
        statuses = list(VerificationStatus)
        assert len(statuses) == 6

    def test_document_type_enum(self):
        """Test DocumentType enum values"""
        # Vendor documents
        assert DocumentType.FOOD_LICENSE == "food_license"
        assert DocumentType.HEALTH_PERMIT == "health_permit"
        assert DocumentType.BUSINESS_LICENSE == "business_license"
        assert DocumentType.LIABILITY_INSURANCE == "liability_insurance"
        assert DocumentType.W9_FORM == "w9_form"

        # Driver documents
        assert DocumentType.DRIVERS_LICENSE == "drivers_license"
        assert DocumentType.VEHICLE_INSURANCE == "vehicle_insurance"
        assert DocumentType.VEHICLE_REGISTRATION == "vehicle_registration"
        assert DocumentType.PROFILE_PHOTO == "profile_photo"

        # Test all enum members exist
        doc_types = list(DocumentType)
        assert len(doc_types) == 9

    def test_enum_string_conversion(self):
        """Test that enums can be used as strings"""
        # Enums that inherit from str, Enum return value when using .value
        assert VerificationProvider.PERSONA.value == "persona"
        assert VerificationStatus.VERIFIED.value == "verified"
        assert DocumentType.DRIVERS_LICENSE.value == "drivers_license"


# =========================================================================
# MODEL TESTS
# =========================================================================

class TestModels:
    """Test Pydantic models"""

    def test_verification_result_minimal(self):
        """Test VerificationResult with minimal required fields"""
        result = VerificationResult(
            status=VerificationStatus.PENDING,
            provider=VerificationProvider.PERSONA,
            document_type=DocumentType.DRIVERS_LICENSE
        )

        assert result.status == VerificationStatus.PENDING
        assert result.provider == VerificationProvider.PERSONA
        assert result.document_type == DocumentType.DRIVERS_LICENSE
        assert result.verification_id is None
        assert result.confidence_score is None
        assert result.extracted_data is None
        assert result.expiry_date is None
        assert result.issues == []
        assert result.verified_at is None
        assert result.raw_response is None

    def test_verification_result_complete(self):
        """Test VerificationResult with all fields populated"""
        now = datetime.now()
        expiry = now + timedelta(days=365)

        result = VerificationResult(
            status=VerificationStatus.VERIFIED,
            provider=VerificationProvider.PERSONA,
            verification_id="inquiry_123456",
            document_type=DocumentType.DRIVERS_LICENSE,
            confidence_score=0.95,
            extracted_data={"name": "John Doe", "license_number": "D1234567"},
            expiry_date=expiry,
            issues=["Minor OCR warning"],
            verified_at=now,
            raw_response={"data": {"id": "inquiry_123456"}}
        )

        assert result.status == VerificationStatus.VERIFIED
        assert result.verification_id == "inquiry_123456"
        assert result.confidence_score == 0.95
        assert result.extracted_data["name"] == "John Doe"
        assert result.expiry_date == expiry
        assert len(result.issues) == 1
        assert result.verified_at == now
        assert result.raw_response["data"]["id"] == "inquiry_123456"

    def test_verification_result_with_multiple_issues(self):
        """Test VerificationResult with multiple issues"""
        result = VerificationResult(
            status=VerificationStatus.NEEDS_REVIEW,
            provider=VerificationProvider.ONFIDO,
            document_type=DocumentType.BUSINESS_LICENSE,
            issues=[
                "Document quality low",
                "Expiry date unclear",
                "Name mismatch"
            ]
        )

        assert len(result.issues) == 3
        assert "Document quality low" in result.issues

    def test_document_verification_record_minimal(self):
        """Test DocumentVerificationRecord with minimal fields"""
        record = DocumentVerificationRecord(
            entity_type="driver",
            entity_id=123,
            document_type="drivers_license",
            document_url="https://example.com/doc.pdf",
            provider="persona"
        )

        assert record.entity_type == "driver"
        assert record.entity_id == 123
        assert record.document_type == "drivers_license"
        assert record.document_url == "https://example.com/doc.pdf"
        assert record.provider == "persona"
        assert record.status == VerificationStatus.PENDING.value
        assert record.id is None
        assert record.issues == []

    def test_document_verification_record_complete(self):
        """Test DocumentVerificationRecord with all fields"""
        now = datetime.now()
        expiry = now + timedelta(days=365)

        record = DocumentVerificationRecord(
            id=1,
            entity_type="vendor",
            entity_id=456,
            document_type="food_license",
            document_url="https://example.com/license.pdf",
            provider="persona",
            provider_reference_id="inquiry_abc123",
            status=VerificationStatus.VERIFIED.value,
            confidence_score=0.98,
            extracted_data={"business_name": "Test Restaurant", "license_num": "FL-12345"},
            expiry_date=expiry,
            issues=[],
            reviewer_id=789,
            reviewer_notes="Looks good",
            created_at=now,
            updated_at=now,
            verified_at=now
        )

        assert record.id == 1
        assert record.entity_type == "vendor"
        assert record.status == VerificationStatus.VERIFIED.value
        assert record.confidence_score == 0.98
        assert record.extracted_data["business_name"] == "Test Restaurant"
        assert record.reviewer_id == 789
        assert record.reviewer_notes == "Looks good"

    def test_model_validation_with_invalid_data(self):
        """Test that model validation catches invalid data"""
        # This should work - enum values are validated by Pydantic
        with pytest.raises(ValueError):
            VerificationResult(
                status="invalid_status",  # Invalid enum value
                provider=VerificationProvider.PERSONA,
                document_type=DocumentType.DRIVERS_LICENSE
            )


# =========================================================================
# SERVICE INITIALIZATION TESTS
# =========================================================================

class TestServiceInitialization:
    """Test DocumentVerificationService initialization"""

    def test_init_with_default_provider(self):
        """Test initialization with default provider (persona)"""
        service = DocumentVerificationService()
        assert service.provider == VerificationProvider.PERSONA

    def test_init_with_persona_provider(self):
        """Test initialization with Persona provider"""
        service = DocumentVerificationService(provider="persona")
        assert service.provider == VerificationProvider.PERSONA

    def test_init_with_onfido_provider(self):
        """Test initialization with Onfido provider"""
        service = DocumentVerificationService(provider="onfido")
        assert service.provider == VerificationProvider.ONFIDO

    def test_init_with_veriff_provider(self):
        """Test initialization with Veriff provider"""
        service = DocumentVerificationService(provider="veriff")
        assert service.provider == VerificationProvider.VERIFF

    def test_init_with_manual_provider(self):
        """Test initialization with Manual provider"""
        service = DocumentVerificationService(provider="manual")
        assert service.provider == VerificationProvider.MANUAL

    def test_init_with_invalid_provider(self):
        """Test initialization with invalid provider raises error"""
        with pytest.raises(ValueError):
            DocumentVerificationService(provider="invalid_provider")

    @patch.dict(os.environ, {
        'PERSONA_API_KEY': 'test_persona_key',
        'PERSONA_API_URL': 'https://test.persona.com/api',
        'PERSONA_TEMPLATE_ID': 'tmpl_123',
        'PERSONA_WEBHOOK_SECRET': 'webhook_secret_123'
    })
    def test_load_persona_credentials(self):
        """Test loading Persona credentials from environment"""
        service = DocumentVerificationService(provider="persona")
        assert service.api_key == 'test_persona_key'
        assert service.api_url == 'https://test.persona.com/api'
        assert service.template_id == 'tmpl_123'
        assert service.webhook_secret == 'webhook_secret_123'

    @patch.dict(os.environ, {
        'ONFIDO_API_KEY': 'test_onfido_key',
        'ONFIDO_API_URL': 'https://test.onfido.com/api',
        'ONFIDO_WEBHOOK_SECRET': 'onfido_webhook_secret'
    })
    def test_load_onfido_credentials(self):
        """Test loading Onfido credentials from environment"""
        service = DocumentVerificationService(provider="onfido")
        assert service.api_key == 'test_onfido_key'
        assert service.api_url == 'https://test.onfido.com/api'
        assert service.webhook_secret == 'onfido_webhook_secret'

    @patch.dict(os.environ, {
        'VERIFF_API_KEY': 'test_veriff_key',
        'VERIFF_API_URL': 'https://test.veriff.com/api',
        'VERIFF_WEBHOOK_SECRET': 'veriff_webhook_secret'
    })
    def test_load_veriff_credentials(self):
        """Test loading Veriff credentials from environment"""
        service = DocumentVerificationService(provider="veriff")
        assert service.api_key == 'test_veriff_key'
        assert service.api_url == 'https://test.veriff.com/api'
        assert service.webhook_secret == 'veriff_webhook_secret'

    @patch.dict(os.environ, {}, clear=True)
    def test_load_credentials_with_missing_env_vars(self):
        """Test credential loading when env vars are missing"""
        service = DocumentVerificationService(provider="persona")
        # Should not raise error, but api_key should be None
        assert service.api_key is None

    @patch.dict(os.environ, {
        'PERSONA_API_KEY': 'test_key'
        # PERSONA_API_URL not set, should use default
    })
    def test_load_credentials_with_defaults(self):
        """Test that default URLs are used when not provided"""
        service = DocumentVerificationService(provider="persona")
        assert service.api_url == "https://withpersona.com/api/v1"


# =========================================================================
# STATUS MAPPING TESTS
# =========================================================================

class TestStatusMapping:
    """Test Persona status mapping"""

    def test_map_persona_status_created(self):
        """Test mapping 'created' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("created")
        assert status == VerificationStatus.PENDING

    def test_map_persona_status_pending(self):
        """Test mapping 'pending' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("pending")
        assert status == VerificationStatus.IN_REVIEW

    def test_map_persona_status_completed(self):
        """Test mapping 'completed' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("completed")
        assert status == VerificationStatus.VERIFIED

    def test_map_persona_status_approved(self):
        """Test mapping 'approved' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("approved")
        assert status == VerificationStatus.VERIFIED

    def test_map_persona_status_declined(self):
        """Test mapping 'declined' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("declined")
        assert status == VerificationStatus.REJECTED

    def test_map_persona_status_failed(self):
        """Test mapping 'failed' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("failed")
        assert status == VerificationStatus.REJECTED

    def test_map_persona_status_needs_review(self):
        """Test mapping 'needs_review' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("needs_review")
        assert status == VerificationStatus.NEEDS_REVIEW

    def test_map_persona_status_expired(self):
        """Test mapping 'expired' status"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("expired")
        assert status == VerificationStatus.EXPIRED

    def test_map_persona_status_unknown(self):
        """Test mapping unknown status defaults to PENDING"""
        service = DocumentVerificationService(provider="persona")
        status = service._map_persona_status("unknown_status")
        assert status == VerificationStatus.PENDING

    def test_map_persona_status_all_mappings(self):
        """Test that all expected mappings are covered"""
        service = DocumentVerificationService(provider="persona")

        test_cases = {
            "created": VerificationStatus.PENDING,
            "pending": VerificationStatus.IN_REVIEW,
            "completed": VerificationStatus.VERIFIED,
            "approved": VerificationStatus.VERIFIED,
            "declined": VerificationStatus.REJECTED,
            "failed": VerificationStatus.REJECTED,
            "needs_review": VerificationStatus.NEEDS_REVIEW,
            "expired": VerificationStatus.EXPIRED,
        }

        for persona_status, expected_status in test_cases.items():
            assert service._map_persona_status(persona_status) == expected_status


# =========================================================================
# DOCUMENT TYPE MAPPING TESTS
# =========================================================================

class TestDocumentTypeMapping:
    """Test document type mapping to Persona types"""

    def test_map_drivers_license(self):
        """Test mapping driver's license to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.DRIVERS_LICENSE])
        assert result == ["government_id"]

    def test_map_business_license(self):
        """Test mapping business license to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.BUSINESS_LICENSE])
        assert result == ["document"]

    def test_map_food_license(self):
        """Test mapping food license to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.FOOD_LICENSE])
        assert result == ["document"]

    def test_map_health_permit(self):
        """Test mapping health permit to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.HEALTH_PERMIT])
        assert result == ["document"]

    def test_map_liability_insurance(self):
        """Test mapping liability insurance to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.LIABILITY_INSURANCE])
        assert result == ["document"]

    def test_map_w9_form(self):
        """Test mapping W9 form to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.W9_FORM])
        assert result == ["document"]

    def test_map_vehicle_insurance(self):
        """Test mapping vehicle insurance to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.VEHICLE_INSURANCE])
        assert result == ["document"]

    def test_map_profile_photo(self):
        """Test mapping profile photo to Persona type"""
        service = DocumentVerificationService(provider="persona")
        result = service._map_to_persona_types([DocumentType.PROFILE_PHOTO])
        assert result == ["selfie"]

    def test_map_multiple_document_types(self):
        """Test mapping multiple document types"""
        service = DocumentVerificationService(provider="persona")
        doc_types = [
            DocumentType.DRIVERS_LICENSE,
            DocumentType.BUSINESS_LICENSE,
            DocumentType.PROFILE_PHOTO
        ]
        result = service._map_to_persona_types(doc_types)
        assert result == ["government_id", "document", "selfie"]

    def test_map_all_document_types(self):
        """Test mapping all document types"""
        service = DocumentVerificationService(provider="persona")

        test_cases = {
            DocumentType.DRIVERS_LICENSE: "government_id",
            DocumentType.BUSINESS_LICENSE: "document",
            DocumentType.FOOD_LICENSE: "document",
            DocumentType.HEALTH_PERMIT: "document",
            DocumentType.LIABILITY_INSURANCE: "document",
            DocumentType.W9_FORM: "document",
            DocumentType.VEHICLE_INSURANCE: "document",
            DocumentType.VEHICLE_REGISTRATION: "document",
            DocumentType.PROFILE_PHOTO: "selfie"
        }

        for doc_type, expected_persona_type in test_cases.items():
            result = service._map_to_persona_types([doc_type])
            assert result == [expected_persona_type]


# =========================================================================
# PERSONA ISSUES EXTRACTION TESTS
# =========================================================================

class TestPersonaIssuesExtraction:
    """Test extraction of issues from Persona response"""

    def test_extract_issues_empty_data(self):
        """Test extraction with empty data"""
        service = DocumentVerificationService(provider="persona")
        issues = service._extract_persona_issues({})
        assert issues == []

    def test_extract_issues_no_included_section(self):
        """Test extraction when no 'included' section exists"""
        service = DocumentVerificationService(provider="persona")
        data = {"data": {"id": "inquiry_123"}}
        issues = service._extract_persona_issues(data)
        assert issues == []

    def test_extract_issues_with_passed_checks(self):
        """Test extraction when all checks passed"""
        service = DocumentVerificationService(provider="persona")
        data = {
            "included": [
                {
                    "type": "verification",
                    "attributes": {
                        "checks": [
                            {"name": "id_check", "status": "passed"},
                            {"name": "address_check", "status": "passed"}
                        ]
                    }
                }
            ]
        }
        issues = service._extract_persona_issues(data)
        assert issues == []

    def test_extract_issues_with_failed_checks(self):
        """Test extraction when checks failed"""
        service = DocumentVerificationService(provider="persona")
        data = {
            "included": [
                {
                    "type": "verification",
                    "attributes": {
                        "checks": [
                            {
                                "name": "id_check",
                                "status": "failed",
                                "reasons": ["Document expired"]
                            }
                        ]
                    }
                }
            ]
        }
        issues = service._extract_persona_issues(data)
        assert len(issues) == 1
        assert "id_check" in issues[0]

    def test_extract_issues_multiple_failed_checks(self):
        """Test extraction with multiple failed checks"""
        service = DocumentVerificationService(provider="persona")
        data = {
            "included": [
                {
                    "type": "verification",
                    "attributes": {
                        "checks": [
                            {
                                "name": "id_check",
                                "status": "failed",
                                "reasons": ["Document expired"]
                            },
                            {
                                "name": "address_check",
                                "status": "warning",
                                "reasons": ["Address mismatch"]
                            }
                        ]
                    }
                }
            ]
        }
        issues = service._extract_persona_issues(data)
        assert len(issues) == 2

    def test_extract_issues_mixed_item_types(self):
        """Test extraction when included has mixed types"""
        service = DocumentVerificationService(provider="persona")
        data = {
            "included": [
                {
                    "type": "other_type",
                    "attributes": {"foo": "bar"}
                },
                {
                    "type": "verification",
                    "attributes": {
                        "checks": [
                            {
                                "name": "id_check",
                                "status": "failed",
                                "reasons": ["Issue found"]
                            }
                        ]
                    }
                }
            ]
        }
        issues = service._extract_persona_issues(data)
        assert len(issues) == 1


# =========================================================================
# WEBHOOK VERIFICATION TESTS
# =========================================================================

class TestWebhookVerification:
    """Test webhook signature verification"""

    @patch.dict(os.environ, {'PERSONA_WEBHOOK_SECRET': 'test_secret_key'})
    def test_verify_persona_webhook_valid_signature(self):
        """Test webhook verification with valid signature"""
        service = DocumentVerificationService(provider="persona")

        payload = b'{"event": "inquiry.completed", "data": {}}'
        expected_sig = hmac.new(
            b'test_secret_key',
            payload,
            hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        result = service.verify_persona_webhook(payload, signature)
        assert result is True

    @patch.dict(os.environ, {'PERSONA_WEBHOOK_SECRET': 'test_secret_key'})
    def test_verify_persona_webhook_invalid_signature(self):
        """Test webhook verification with invalid signature"""
        service = DocumentVerificationService(provider="persona")

        payload = b'{"event": "inquiry.completed", "data": {}}'
        signature = "sha256=invalid_signature_here"

        result = service.verify_persona_webhook(payload, signature)
        assert result is False

    @patch.dict(os.environ, {'PERSONA_WEBHOOK_SECRET': 'test_secret_key'})
    def test_verify_persona_webhook_tampered_payload(self):
        """Test webhook verification with tampered payload"""
        service = DocumentVerificationService(provider="persona")

        original_payload = b'{"event": "inquiry.completed", "data": {}}'
        tampered_payload = b'{"event": "inquiry.completed", "data": {"hacked": true}}'

        # Generate signature for original payload
        expected_sig = hmac.new(
            b'test_secret_key',
            original_payload,
            hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        # Try to verify with tampered payload
        result = service.verify_persona_webhook(tampered_payload, signature)
        assert result is False

    @patch.dict(os.environ, {}, clear=True)
    def test_verify_persona_webhook_missing_secret(self):
        """Test webhook verification when secret is not configured"""
        service = DocumentVerificationService(provider="persona")

        payload = b'{"event": "inquiry.completed", "data": {}}'
        signature = "sha256=some_signature"

        result = service.verify_persona_webhook(payload, signature)
        assert result is False

    @patch.dict(os.environ, {'PERSONA_WEBHOOK_SECRET': 'test_secret_key'})
    def test_verify_persona_webhook_different_payloads(self):
        """Test that different payloads produce different signatures"""
        service = DocumentVerificationService(provider="persona")

        payload1 = b'{"event": "inquiry.completed", "id": "1"}'
        payload2 = b'{"event": "inquiry.completed", "id": "2"}'

        sig1 = hmac.new(b'test_secret_key', payload1, hashlib.sha256).hexdigest()
        sig2 = hmac.new(b'test_secret_key', payload2, hashlib.sha256).hexdigest()

        assert sig1 != sig2
        assert service.verify_persona_webhook(payload1, f"sha256={sig1}") is True
        assert service.verify_persona_webhook(payload1, f"sha256={sig2}") is False


# =========================================================================
# MANUAL REVIEW TESTS
# =========================================================================

class TestManualReview:
    """Test manual review task creation"""

    def test_create_manual_review_task_basic(self):
        """Test creating a basic manual review task"""
        service = DocumentVerificationService(provider="manual")

        result = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.FOOD_LICENSE,
            document_url="https://example.com/license.pdf",
            metadata={"business_name": "Test Restaurant"}
        )

        assert "task_id" in result
        assert result["entity_type"] == "vendor"
        assert result["entity_id"] == 123
        assert result["document_type"] == "food_license"
        assert result["document_url"] == "https://example.com/license.pdf"
        assert result["status"] == VerificationStatus.IN_REVIEW.value
        assert result["metadata"]["business_name"] == "Test Restaurant"
        assert result["assigned_to"] is None
        assert result["notes"] == []

    def test_create_manual_review_task_driver(self):
        """Test creating manual review task for driver"""
        service = DocumentVerificationService(provider="manual")

        result = service.create_manual_review_task(
            entity_type="driver",
            entity_id=456,
            document_type=DocumentType.DRIVERS_LICENSE,
            document_url="https://example.com/dl.jpg",
            metadata={"driver_name": "John Doe"}
        )

        assert result["entity_type"] == "driver"
        assert result["entity_id"] == 456
        assert result["document_type"] == "drivers_license"

    def test_create_manual_review_task_unique_ids(self):
        """Test that manual review tasks get unique IDs"""
        service = DocumentVerificationService(provider="manual")

        result1 = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.FOOD_LICENSE,
            document_url="https://example.com/license1.pdf",
            metadata={}
        )

        result2 = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.FOOD_LICENSE,
            document_url="https://example.com/license2.pdf",
            metadata={}
        )

        assert result1["task_id"] != result2["task_id"]

    def test_create_manual_review_task_has_timestamp(self):
        """Test that manual review task includes created_at timestamp"""
        service = DocumentVerificationService(provider="manual")

        result = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.BUSINESS_LICENSE,
            document_url="https://example.com/business.pdf",
            metadata={}
        )

        assert "created_at" in result
        # Verify it's a valid ISO format timestamp
        datetime.fromisoformat(result["created_at"])


# =========================================================================
# DOCUMENT EXPIRY VALIDATION TESTS
# =========================================================================

class TestDocumentExpiryValidation:
    """Test document expiry date validation"""

    def test_validate_expired_document(self):
        """Test validation of expired document"""
        service = DocumentVerificationService(provider="persona")

        expired_date = datetime.now() - timedelta(days=30)
        result = service.validate_document_expiry(expired_date)

        assert result["valid"] is False
        assert result["status"] == "expired"
        assert "expired on" in result["message"].lower()

    def test_validate_expiring_soon_document(self):
        """Test validation of document expiring soon (within 30 days)"""
        service = DocumentVerificationService(provider="persona")

        expiring_date = datetime.now() + timedelta(days=15)
        result = service.validate_document_expiry(expiring_date)

        assert result["valid"] is True
        assert result["status"] == "expiring_soon"
        assert "expires in" in result["message"].lower()
        # Allow for time calculation variance (14-15 days)
        assert 14 <= result["days_remaining"] <= 15

    def test_validate_expiring_tomorrow(self):
        """Test validation of document expiring tomorrow"""
        service = DocumentVerificationService(provider="persona")

        expiring_date = datetime.now() + timedelta(days=1)
        result = service.validate_document_expiry(expiring_date)

        assert result["valid"] is True
        assert result["status"] == "expiring_soon"
        # Allow for time calculation variance (0-1 days)
        assert 0 <= result["days_remaining"] <= 1

    def test_validate_expiring_exactly_30_days(self):
        """Test validation of document expiring in 30+ days (boundary)"""
        service = DocumentVerificationService(provider="persona")

        # Use 31 days to ensure we're past the 30-day threshold
        expiring_date = datetime.now() + timedelta(days=31)
        result = service.validate_document_expiry(expiring_date)

        # Should be "valid" since > 30 days
        assert result["valid"] is True
        assert result["status"] == "valid"
        assert result["days_remaining"] >= 30

    def test_validate_valid_document(self):
        """Test validation of document with plenty of time"""
        service = DocumentVerificationService(provider="persona")

        valid_date = datetime.now() + timedelta(days=365)
        result = service.validate_document_expiry(valid_date)

        assert result["valid"] is True
        assert result["status"] == "valid"
        assert result["message"] == "Document is valid"
        # Allow for time calculation variance (364-365 days)
        assert 364 <= result["days_remaining"] <= 365

    def test_validate_document_expired_today(self):
        """Test validation of document that expires today"""
        service = DocumentVerificationService(provider="persona")

        # Document that expired a few hours ago
        expired_date = datetime.now() - timedelta(hours=1)
        result = service.validate_document_expiry(expired_date)

        assert result["valid"] is False
        assert result["status"] == "expired"

    def test_validate_document_expiry_formats(self):
        """Test that validation works with various datetime formats"""
        service = DocumentVerificationService(provider="persona")

        # Far future
        future_date = datetime.now() + timedelta(days=1000)
        result = service.validate_document_expiry(future_date)
        assert result["valid"] is True
        assert result["status"] == "valid"

        # Far past
        past_date = datetime.now() - timedelta(days=1000)
        result = service.validate_document_expiry(past_date)
        assert result["valid"] is False
        assert result["status"] == "expired"


# =========================================================================
# REQUIRED DOCUMENTS TESTS
# =========================================================================

class TestRequiredDocuments:
    """Test getting required documents for different entity types"""

    def test_get_required_documents_vendor(self):
        """Test getting required documents for vendor"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("vendor")

        assert len(docs) == 4

        # Check that all required vendor documents are present
        doc_types = [doc["type"] for doc in docs]
        assert DocumentType.FOOD_LICENSE in doc_types
        assert DocumentType.HEALTH_PERMIT in doc_types
        assert DocumentType.BUSINESS_LICENSE in doc_types
        assert DocumentType.LIABILITY_INSURANCE in doc_types

        # Check that all are marked as required
        for doc in docs:
            assert doc["required"] is True

    def test_get_required_documents_driver(self):
        """Test getting required documents for driver"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("driver")

        assert len(docs) == 3

        # Check that all required driver documents are present
        doc_types = [doc["type"] for doc in docs]
        assert DocumentType.DRIVERS_LICENSE in doc_types
        assert DocumentType.VEHICLE_INSURANCE in doc_types
        assert DocumentType.PROFILE_PHOTO in doc_types

        # Check that all are marked as required
        for doc in docs:
            assert doc["required"] is True

    def test_get_required_documents_invalid_entity(self):
        """Test getting required documents for invalid entity type"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("invalid_entity")

        assert docs == []

    def test_vendor_document_details(self):
        """Test that vendor documents have all required metadata"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("vendor")

        for doc in docs:
            assert "type" in doc
            assert "label" in doc
            assert "description" in doc
            assert "required" in doc
            assert "accepts" in doc
            assert isinstance(doc["accepts"], list)
            assert len(doc["accepts"]) > 0

    def test_driver_document_details(self):
        """Test that driver documents have all required metadata"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("driver")

        for doc in docs:
            assert "type" in doc
            assert "label" in doc
            assert "description" in doc
            assert "required" in doc
            assert "accepts" in doc
            assert isinstance(doc["accepts"], list)
            assert len(doc["accepts"]) > 0

    def test_document_accepted_file_types(self):
        """Test that documents specify accepted file types"""
        service = DocumentVerificationService(provider="persona")

        vendor_docs = service.get_required_documents("vendor")
        for doc in vendor_docs:
            # All vendor docs should accept PDF and image formats
            assert ".pdf" in doc["accepts"]

        driver_docs = service.get_required_documents("driver")
        driver_license_doc = next(d for d in driver_docs if d["type"] == DocumentType.DRIVERS_LICENSE)
        assert ".pdf" in driver_license_doc["accepts"]

        profile_photo_doc = next(d for d in driver_docs if d["type"] == DocumentType.PROFILE_PHOTO)
        # Profile photo should accept image formats but not necessarily PDF
        assert any(ext in profile_photo_doc["accepts"] for ext in [".jpg", ".jpeg", ".png"])

    def test_food_license_document_structure(self):
        """Test specific structure of food license requirement"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("vendor")

        food_license = next(d for d in docs if d["type"] == DocumentType.FOOD_LICENSE)
        assert food_license["label"] == "Food Service License"
        assert "food" in food_license["description"].lower()
        assert food_license["required"] is True

    def test_drivers_license_document_structure(self):
        """Test specific structure of driver's license requirement"""
        service = DocumentVerificationService(provider="persona")
        docs = service.get_required_documents("driver")

        dl = next(d for d in docs if d["type"] == DocumentType.DRIVERS_LICENSE)
        assert "Driver's License" in dl["label"]
        assert "driver's license" in dl["description"].lower()
        assert dl["required"] is True


# =========================================================================
# FACTORY FUNCTION TESTS
# =========================================================================

class TestFactoryFunction:
    """Test the get_verification_service factory function"""

    def test_factory_with_persona_provider(self):
        """Test factory function with Persona provider"""
        service = get_verification_service("persona")
        assert isinstance(service, DocumentVerificationService)
        assert service.provider == VerificationProvider.PERSONA

    def test_factory_with_onfido_provider(self):
        """Test factory function with Onfido provider"""
        service = get_verification_service("onfido")
        assert isinstance(service, DocumentVerificationService)
        assert service.provider == VerificationProvider.ONFIDO

    def test_factory_with_veriff_provider(self):
        """Test factory function with Veriff provider"""
        service = get_verification_service("veriff")
        assert isinstance(service, DocumentVerificationService)
        assert service.provider == VerificationProvider.VERIFF

    def test_factory_with_manual_provider(self):
        """Test factory function with Manual provider"""
        service = get_verification_service("manual")
        assert isinstance(service, DocumentVerificationService)
        assert service.provider == VerificationProvider.MANUAL

    @patch.dict(os.environ, {'DOCUMENT_VERIFICATION_PROVIDER': 'onfido'})
    def test_factory_with_env_default(self):
        """Test factory function uses env variable when no provider specified"""
        service = get_verification_service()
        assert service.provider == VerificationProvider.ONFIDO

    @patch.dict(os.environ, {}, clear=True)
    def test_factory_with_no_provider_defaults_to_persona(self):
        """Test factory function defaults to Persona when no provider specified"""
        service = get_verification_service()
        assert service.provider == VerificationProvider.PERSONA

    def test_factory_explicit_overrides_env(self):
        """Test that explicit provider parameter overrides env variable"""
        with patch.dict(os.environ, {'DOCUMENT_VERIFICATION_PROVIDER': 'onfido'}):
            service = get_verification_service("persona")
            assert service.provider == VerificationProvider.PERSONA


# =========================================================================
# ERROR HANDLING TESTS
# =========================================================================

class TestErrorHandling:
    """Test error handling scenarios"""

    @patch.dict(os.environ, {}, clear=True)
    @pytest.mark.asyncio
    async def test_create_persona_inquiry_missing_api_key(self):
        """Test creating Persona inquiry without API key raises error"""
        service = DocumentVerificationService(provider="persona")

        with pytest.raises(ValueError, match="PERSONA_API_KEY not configured"):
            await service.create_persona_inquiry(
                reference_id="test_123",
                entity_type="driver",
                email="test@example.com",
                document_types=[DocumentType.DRIVERS_LICENSE]
            )

    @patch.dict(os.environ, {}, clear=True)
    @pytest.mark.asyncio
    async def test_create_onfido_applicant_missing_api_key(self):
        """Test creating Onfido applicant without API key raises error"""
        service = DocumentVerificationService(provider="onfido")

        with pytest.raises(ValueError, match="ONFIDO_API_KEY not configured"):
            await service.create_onfido_applicant(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                entity_id="123",
                entity_type="driver"
            )


# =========================================================================
# INTEGRATION SCENARIO TESTS
# =========================================================================

class TestIntegrationScenarios:
    """Test complete integration scenarios"""

    @patch.dict(os.environ, {'PERSONA_WEBHOOK_SECRET': 'test_secret'})
    def test_complete_verification_workflow(self):
        """Test a complete verification workflow"""
        service = DocumentVerificationService(provider="persona")

        # 1. Get required documents
        docs = service.get_required_documents("driver")
        assert len(docs) > 0

        # 2. Map document types
        doc_types = [DocumentType.DRIVERS_LICENSE, DocumentType.PROFILE_PHOTO]
        persona_types = service._map_to_persona_types(doc_types)
        assert "government_id" in persona_types
        assert "selfie" in persona_types

        # 3. Validate a document expiry
        expiry = datetime.now() + timedelta(days=365)
        validation = service.validate_document_expiry(expiry)
        assert validation["valid"] is True

        # 4. Verify webhook
        payload = b'{"event": "inquiry.completed"}'
        sig = hmac.new(b'test_secret', payload, hashlib.sha256).hexdigest()
        webhook_valid = service.verify_persona_webhook(payload, f"sha256={sig}")
        assert webhook_valid is True

    def test_vendor_onboarding_scenario(self):
        """Test complete vendor onboarding document flow"""
        service = DocumentVerificationService(provider="persona")

        # Get all required vendor documents
        required_docs = service.get_required_documents("vendor")

        # Verify we have all expected vendor documents
        assert len(required_docs) == 4

        # Map all vendor document types
        vendor_doc_types = [doc["type"] for doc in required_docs]
        persona_types = service._map_to_persona_types(vendor_doc_types)

        # All vendor docs should map to "document" type in Persona
        # (except if we had profile photo which would be "selfie")
        for ptype in persona_types:
            assert ptype in ["document", "government_id", "selfie"]

        # Validate expiry for a license
        license_expiry = datetime.now() + timedelta(days=180)
        validation = service.validate_document_expiry(license_expiry)
        assert validation["valid"] is True
        assert validation["status"] == "valid"

    def test_manual_review_workflow(self):
        """Test manual review workflow"""
        service = DocumentVerificationService(provider="manual")

        # Create manual review task
        task = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.FOOD_LICENSE,
            document_url="https://example.com/license.pdf",
            metadata={"business_name": "Test Restaurant"}
        )

        assert task["status"] == VerificationStatus.IN_REVIEW.value
        assert task["entity_type"] == "vendor"
        assert "task_id" in task

    def test_expiry_warning_scenario(self):
        """Test scenario where document is expiring soon"""
        service = DocumentVerificationService(provider="persona")

        # Document expiring in 15 days
        expiry = datetime.now() + timedelta(days=15)
        validation = service.validate_document_expiry(expiry)

        assert validation["valid"] is True
        assert validation["status"] == "expiring_soon"
        # Allow for time calculation variance (14-15 days)
        assert 14 <= validation["days_remaining"] <= 15
        assert "expires in" in validation["message"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
