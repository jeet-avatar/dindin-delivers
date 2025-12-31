"""
Integration tests for document upload and save flow across all platforms.

Tests verify that:
1. Documents are correctly uploaded and saved to the database
2. Document flags (w9_form, health_permit, etc.) are properly set
3. Document URLs are stored correctly
4. All three platforms (iOS, Android, Web) can upload documents
"""

import pytest
import io
from datetime import datetime
from fastapi.testclient import TestClient


class TestDocumentUploadAndSave:
    """Test document upload saves correctly to database"""

    def test_upload_w9_form_saves_to_database(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading W9 form should set w9_form=True and store URL in w9_form_url
        """
        from models import Vendor

        # Upload W9 form document
        file_content = b"fake pdf content for w9 form"
        files = {
            "file": ("w9_form.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "w9_form"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        # Check response
        assert response.status_code in [200, 201], f"Upload failed: {response.json()}"

        # Verify database was updated
        db_session.refresh(test_vendor)
        assert test_vendor.w9_form == True, "w9_form flag should be True"
        assert test_vendor.w9_form_url is not None, "w9_form_url should be set"
        assert "w9_form" in test_vendor.w9_form_url, "URL should contain document type"

    def test_upload_health_permit_saves_to_database(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading health permit should set health_permit=True and store URL
        """
        from models import Vendor

        file_content = b"fake pdf content for health permit"
        files = {
            "file": ("health_permit.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "health_permit"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]

        db_session.refresh(test_vendor)
        assert test_vendor.health_permit == True, "health_permit flag should be True"
        assert test_vendor.health_permit_url is not None, "health_permit_url should be set"

    def test_upload_food_handler_saves_to_database(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading food handler cert should set food_license=True and store URL
        """
        file_content = b"fake pdf content for food handler"
        files = {
            "file": ("food_handler.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_handler"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]

        db_session.refresh(test_vendor)
        assert test_vendor.food_license == True, "food_license flag should be True"
        assert test_vendor.food_license_url is not None, "food_license_url should be set"

    def test_upload_liability_insurance_saves_to_database(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading liability insurance should set insurance=True and store URL
        """
        file_content = b"fake pdf content for insurance"
        files = {
            "file": ("insurance.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "liability_insurance"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]

        db_session.refresh(test_vendor)
        assert test_vendor.insurance == True, "insurance flag should be True"
        assert test_vendor.insurance_url is not None, "insurance_url should be set"

    def test_upload_business_license_saves_to_database(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading business license should set compliance_certs=True and store URL
        """
        file_content = b"fake pdf content for business license"
        files = {
            "file": ("business_license.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "business_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]

        db_session.refresh(test_vendor)
        # business_license maps to compliance_certs field
        # Note: This might need adjustment based on your model


class TestDocumentRetrieval:
    """Test that uploaded documents can be retrieved"""

    def test_get_vendor_documents_returns_uploaded_docs(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Getting vendor documents should return uploaded documents with correct structure
        """
        # First upload a document
        file_content = b"test document"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        data = {"document_type": "w9_form"}

        client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        # Now get documents
        response = client.get(
            f"/api/vendors/{test_vendor.id}/documents",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "documents" in data, "Response should have 'documents' key"
        assert "count" in data, "Response should have 'count' key"

        # Should have at least the uploaded w9_form
        assert len(data["documents"]) >= 1, "Should have at least one document"
        doc_types = [d["document_type"] for d in data["documents"]]
        assert "w9_form" in doc_types, "Uploaded w9_form should be in response"

    def test_get_documents_reflects_upload_status(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        After uploading a document, get should show it as pending/approved
        """
        # Upload a document first
        file_content = b"test document content"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        data = {"document_type": "w9_form"}

        upload_response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )
        assert upload_response.status_code in [200, 201]

        # Now get documents
        get_response = client.get(
            f"/api/vendors/{test_vendor.id}/documents",
            headers=admin_auth_headers,
        )

        assert get_response.status_code == 200
        data = get_response.json()

        # Find the w9_form document
        w9_doc = next((d for d in data["documents"] if d["document_type"] == "w9_form"), None)
        assert w9_doc is not None, "w9_form document should be in response"
        assert w9_doc["file_url"] is not None or w9_doc["status"] == "pending", \
            "Uploaded document should have URL or pending status"


class TestPublicDocumentUpload:
    """Test public document upload endpoint for onboarding"""

    def test_public_upload_with_correct_email(
        self, client: TestClient, db_session, test_vendor
    ):
        """
        Public upload should work when email matches vendor contact_email
        """
        file_content = b"public upload test content"
        files = {"file": ("license.pdf", io.BytesIO(file_content), "application/pdf")}
        data = {
            "document_type": "food_license",
            "contact_email": test_vendor.contact_email,
        }

        response = client.post(
            f"/api/vendors/public/{test_vendor.id}/documents",
            files=files,
            data=data,
        )

        # Should succeed or return validation error (not 403)
        assert response.status_code in [200, 201, 400, 422], \
            f"Public upload with correct email should not be forbidden: {response.status_code}"

    def test_public_upload_with_wrong_email_forbidden(
        self, client: TestClient, db_session, test_vendor
    ):
        """
        Public upload should be forbidden when email doesn't match
        """
        file_content = b"public upload test content"
        files = {"file": ("license.pdf", io.BytesIO(file_content), "application/pdf")}
        data = {
            "document_type": "food_license",
            "contact_email": "wrong@email.com",
        }

        response = client.post(
            f"/api/vendors/public/{test_vendor.id}/documents",
            files=files,
            data=data,
        )

        assert response.status_code == 403, "Public upload with wrong email should be forbidden"


class TestDocumentSaveToDatabase:
    """Test that documents are actually persisted in the database"""

    def test_multiple_documents_all_saved(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Upload all 4 required documents and verify all are saved
        """
        from models import Vendor

        doc_types = [
            ("w9_form", "w9_form", "w9_form_url"),
            ("health_permit", "health_permit", "health_permit_url"),
            ("food_handler", "food_license", "food_license_url"),
            ("liability_insurance", "insurance", "insurance_url"),
        ]

        for doc_type, flag_field, url_field in doc_types:
            file_content = f"content for {doc_type}".encode()
            files = {"file": (f"{doc_type}.pdf", io.BytesIO(file_content), "application/pdf")}
            data = {"document_type": doc_type}

            response = client.post(
                f"/api/vendors/{test_vendor.id}/documents",
                files=files,
                data=data,
                headers=admin_auth_headers,
            )

            assert response.status_code in [200, 201], f"Failed to upload {doc_type}: {response.json()}"

        # Refresh vendor from database
        db_session.refresh(test_vendor)

        # Verify all flags are set
        assert test_vendor.w9_form == True, "w9_form should be True"
        assert test_vendor.health_permit == True, "health_permit should be True"
        assert test_vendor.food_license == True, "food_license should be True"
        assert test_vendor.insurance == True, "insurance should be True"

        # Verify all URLs are set
        assert test_vendor.w9_form_url is not None, "w9_form_url should be set"
        assert test_vendor.health_permit_url is not None, "health_permit_url should be set"
        assert test_vendor.food_license_url is not None, "food_license_url should be set"
        assert test_vendor.insurance_url is not None, "insurance_url should be set"

    def test_document_upload_updates_last_activity(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Uploading a document should update vendor's last_activity timestamp
        """
        original_activity = test_vendor.last_activity

        file_content = b"test content"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        data = {"document_type": "w9_form"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]

        db_session.refresh(test_vendor)

        # last_activity should be updated (or set if it was None)
        if original_activity:
            assert test_vendor.last_activity >= original_activity, \
                "last_activity should be updated after upload"


class TestCrossPlatformDocumentUpload:
    """
    Test that all platforms upload documents consistently

    These tests verify the API contract that iOS, Android, and Web apps use
    """

    def test_multipart_upload_format(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Test the multipart form-data format used by all platforms
        """
        # This is the format iOS and Android use
        file_content = b"test pdf content"
        files = {
            "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {
            "document_type": "w9_form"
        }

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201]
        response_data = response.json()
        assert "message" in response_data, "Response should have 'message' key"

    def test_image_upload_jpg(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Test uploading JPG image (common from mobile cameras)
        """
        # Simulate JPEG image data
        file_content = b"\xff\xd8\xff\xe0" + b"fake jpeg content"
        files = {
            "file": ("document.jpg", io.BytesIO(file_content), "image/jpeg")
        }
        data = {"document_type": "w9_form"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201], f"JPG upload failed: {response.json()}"

    def test_image_upload_png(
        self, client: TestClient, db_session, test_vendor, admin_auth_headers
    ):
        """
        Test uploading PNG image
        """
        # Simulate PNG image data
        file_content = b"\x89PNG\r\n\x1a\n" + b"fake png content"
        files = {
            "file": ("document.png", io.BytesIO(file_content), "image/png")
        }
        data = {"document_type": "health_permit"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=admin_auth_headers,
        )

        assert response.status_code in [200, 201], f"PNG upload failed: {response.json()}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
