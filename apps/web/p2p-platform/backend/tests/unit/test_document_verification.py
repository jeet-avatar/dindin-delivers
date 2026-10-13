"""
Unit tests for document_verification_service.py

Persona, Onfido, and Veriff integrations were removed (superseded by Checkr for
driver background checks — see checkr_service.py). This module now only covers
the manual-review workflow and document validation helpers that remain.

Run with: pytest tests/unit/test_document_verification.py -v
"""

import os
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

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
    def test_verification_provider_enum(self):
        """Only MANUAL remains after Persona/Onfido/Veriff removal"""
        assert VerificationProvider.MANUAL == "manual"
        assert len(list(VerificationProvider)) == 1

    def test_verification_status_enum(self):
        assert VerificationStatus.PENDING == "pending"
        assert VerificationStatus.IN_REVIEW == "in_review"
        assert VerificationStatus.VERIFIED == "verified"
        assert VerificationStatus.REJECTED == "rejected"
        assert VerificationStatus.NEEDS_REVIEW == "needs_review"
        assert VerificationStatus.EXPIRED == "expired"

    def test_document_type_enum(self):
        assert DocumentType.DRIVERS_LICENSE == "drivers_license"
        assert DocumentType.VEHICLE_INSURANCE == "vehicle_insurance"
        assert DocumentType.PROFILE_PHOTO == "profile_photo"
        assert DocumentType.FOOD_LICENSE == "food_license"

    def test_enum_string_conversion(self):
        assert VerificationProvider("manual") == VerificationProvider.MANUAL
        assert VerificationStatus("verified") == VerificationStatus.VERIFIED
        assert DocumentType("drivers_license") == DocumentType.DRIVERS_LICENSE


# =========================================================================
# MODEL TESTS
# =========================================================================

class TestModels:
    def test_verification_result_minimal(self):
        result = VerificationResult(
            status=VerificationStatus.PENDING,
            provider=VerificationProvider.MANUAL,
            document_type=DocumentType.DRIVERS_LICENSE,
        )
        assert result.status == VerificationStatus.PENDING
        assert result.verification_id is None
        assert result.issues == []

    def test_verification_result_complete(self):
        now = datetime.now()
        result = VerificationResult(
            status=VerificationStatus.VERIFIED,
            provider=VerificationProvider.MANUAL,
            verification_id="rev_123",
            document_type=DocumentType.DRIVERS_LICENSE,
            confidence_score=0.95,
            extracted_data={"name": "John Doe"},
            expiry_date=now + timedelta(days=365),
            issues=[],
            verified_at=now,
        )
        assert result.verification_id == "rev_123"
        assert result.confidence_score == 0.95

    def test_verification_result_with_multiple_issues(self):
        result = VerificationResult(
            status=VerificationStatus.REJECTED,
            provider=VerificationProvider.MANUAL,
            document_type=DocumentType.DRIVERS_LICENSE,
            issues=["Document expired", "Photo mismatch"],
        )
        assert len(result.issues) == 2

    def test_document_verification_record_minimal(self):
        record = DocumentVerificationRecord(
            entity_type="driver",
            entity_id=1,
            document_type="drivers_license",
            document_url="https://example.com/doc.pdf",
            provider="manual",
        )
        assert record.status == VerificationStatus.PENDING.value
        assert record.issues == []

    def test_document_verification_record_complete(self):
        now = datetime.now()
        record = DocumentVerificationRecord(
            id=1,
            entity_type="driver",
            entity_id=42,
            document_type="drivers_license",
            document_url="https://example.com/doc.pdf",
            provider="manual",
            provider_reference_id="rev_42",
            status=VerificationStatus.VERIFIED.value,
            confidence_score=0.9,
            reviewer_id=7,
            reviewer_notes="Looks good",
            created_at=now,
            updated_at=now,
            verified_at=now,
        )
        assert record.reviewer_id == 7
        assert record.status == VerificationStatus.VERIFIED.value


# =========================================================================
# SERVICE INITIALIZATION
# =========================================================================

class TestServiceInitialization:
    def test_init_with_default_provider(self):
        """Default provider is now 'manual' (no more third-party providers)"""
        service = DocumentVerificationService()
        assert service.provider == VerificationProvider.MANUAL

    def test_init_with_manual_provider(self):
        service = DocumentVerificationService(provider="manual")
        assert service.provider == VerificationProvider.MANUAL

    def test_init_with_invalid_provider(self):
        with pytest.raises(ValueError):
            DocumentVerificationService(provider="not_a_real_provider")

    def test_init_rejects_removed_providers(self):
        """Persona/Onfido/Veriff were removed — constructing with them must fail"""
        for removed_provider in ("persona", "onfido", "veriff"):
            with pytest.raises(ValueError):
                DocumentVerificationService(provider=removed_provider)


# =========================================================================
# MANUAL REVIEW WORKFLOW
# =========================================================================

class TestManualReview:
    def test_create_manual_review_task_basic(self):
        service = DocumentVerificationService()
        task = service.create_manual_review_task(
            entity_type="driver",
            entity_id=1,
            document_type=DocumentType.DRIVERS_LICENSE,
            document_url="https://example.com/license.pdf",
            metadata={},
        )
        assert task["entity_type"] == "driver"
        assert task["status"] == VerificationStatus.IN_REVIEW.value
        assert "task_id" in task

    def test_create_manual_review_task_driver(self):
        service = DocumentVerificationService()
        task = service.create_manual_review_task(
            entity_type="driver",
            entity_id=99,
            document_type=DocumentType.VEHICLE_INSURANCE,
            document_url="https://example.com/insurance.pdf",
            metadata={"note": "renewed"},
        )
        assert task["entity_id"] == 99
        assert task["metadata"]["note"] == "renewed"

    def test_create_manual_review_task_unique_ids(self):
        service = DocumentVerificationService()
        task1 = service.create_manual_review_task(
            "driver", 1, DocumentType.DRIVERS_LICENSE, "url1", {}
        )
        task2 = service.create_manual_review_task(
            "driver", 2, DocumentType.DRIVERS_LICENSE, "url2", {}
        )
        assert task1["task_id"] != task2["task_id"]

    def test_create_manual_review_task_has_timestamp(self):
        service = DocumentVerificationService()
        task = service.create_manual_review_task(
            "driver", 1, DocumentType.DRIVERS_LICENSE, "url", {}
        )
        assert "created_at" in task
        datetime.fromisoformat(task["created_at"])


# =========================================================================
# DOCUMENT EXPIRY VALIDATION
# =========================================================================

class TestDocumentExpiryValidation:
    def test_validate_expired_document(self):
        service = DocumentVerificationService()
        expiry = datetime.now() - timedelta(days=1)
        result = service.validate_document_expiry(expiry)
        assert result["valid"] is False
        assert result["status"] == "expired"

    def test_validate_expiring_soon_document(self):
        service = DocumentVerificationService()
        expiry = datetime.now() + timedelta(days=15)
        result = service.validate_document_expiry(expiry)
        assert result["valid"] is True
        assert result["status"] == "expiring_soon"

    def test_validate_expiring_just_over_30_days(self):
        service = DocumentVerificationService()
        expiry = datetime.now() + timedelta(days=31)
        result = service.validate_document_expiry(expiry)
        assert result["valid"] is True
        assert result["status"] == "valid"

    def test_validate_valid_document(self):
        service = DocumentVerificationService()
        expiry = datetime.now() + timedelta(days=365)
        result = service.validate_document_expiry(expiry)
        assert result["valid"] is True
        assert result["status"] == "valid"

    def test_validate_document_expired_today(self):
        service = DocumentVerificationService()
        expiry = datetime.now() - timedelta(seconds=1)
        result = service.validate_document_expiry(expiry)
        assert result["valid"] is False


# =========================================================================
# REQUIRED DOCUMENTS
# =========================================================================

class TestRequiredDocuments:
    def test_get_required_documents_vendor(self):
        service = DocumentVerificationService()
        docs = service.get_required_documents("vendor")
        assert len(docs) == 4

    def test_get_required_documents_driver(self):
        service = DocumentVerificationService()
        docs = service.get_required_documents("driver")
        assert len(docs) == 3
        types = [d["type"] for d in docs]
        assert DocumentType.DRIVERS_LICENSE in types

    def test_get_required_documents_invalid_entity(self):
        service = DocumentVerificationService()
        docs = service.get_required_documents("not_a_real_entity")
        assert docs == []

    def test_driver_document_details(self):
        service = DocumentVerificationService()
        docs = service.get_required_documents("driver")
        for doc in docs:
            assert doc["required"] is True
            assert "label" in doc
            assert "accepts" in doc


# =========================================================================
# FACTORY FUNCTION
# =========================================================================

class TestFactoryFunction:
    def test_factory_with_manual_provider(self):
        service = get_verification_service("manual")
        assert isinstance(service, DocumentVerificationService)
        assert service.provider == VerificationProvider.MANUAL

    @patch.dict(os.environ, {}, clear=True)
    def test_factory_with_no_provider_defaults_to_manual(self):
        """Since Persona/Onfido/Veriff were removed, the default is now 'manual'"""
        service = get_verification_service()
        assert service.provider == VerificationProvider.MANUAL

    @patch.dict(os.environ, {'DOCUMENT_VERIFICATION_PROVIDER': 'manual'})
    def test_factory_with_env_default(self):
        service = get_verification_service()
        assert service.provider == VerificationProvider.MANUAL

    def test_factory_explicit_overrides_env(self):
        with patch.dict(os.environ, {'DOCUMENT_VERIFICATION_PROVIDER': 'manual'}):
            service = get_verification_service("manual")
            assert service.provider == VerificationProvider.MANUAL


# =========================================================================
# INTEGRATION SCENARIOS
# =========================================================================

class TestIntegrationScenarios:
    def test_manual_review_workflow(self):
        service = DocumentVerificationService(provider="manual")
        task = service.create_manual_review_task(
            entity_type="vendor",
            entity_id=123,
            document_type=DocumentType.FOOD_LICENSE,
            document_url="https://example.com/license.pdf",
            metadata={"business_name": "Test Restaurant"},
        )
        assert task["status"] == VerificationStatus.IN_REVIEW.value
        assert task["entity_type"] == "vendor"
        assert "task_id" in task

    def test_expiry_warning_scenario(self):
        service = DocumentVerificationService()
        expiry = datetime.now() + timedelta(days=15)
        validation = service.validate_document_expiry(expiry)
        assert validation["valid"] is True
        assert validation["status"] == "expiring_soon"
        assert 14 <= validation["days_remaining"] <= 15
        assert "expires in" in validation["message"]

    def test_driver_onboarding_scenario(self):
        """End-to-end: required docs -> upload -> manual review -> expiry check"""
        service = DocumentVerificationService()

        required = service.get_required_documents("driver")
        assert len(required) > 0

        task = service.create_manual_review_task(
            entity_type="driver",
            entity_id=55,
            document_type=DocumentType.DRIVERS_LICENSE,
            document_url="https://example.com/license.pdf",
            metadata={},
        )
        assert task["status"] == VerificationStatus.IN_REVIEW.value

        expiry = datetime.now() + timedelta(days=200)
        validation = service.validate_document_expiry(expiry)
        assert validation["valid"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
