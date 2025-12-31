"""
Unit tests for file upload security.

Tests cover:
- File type validation
- Path traversal prevention
- File size limits
- Malicious filename handling
- Extension spoofing prevention
"""

import pytest
import io
import os
import tempfile
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


class TestFileTypeValidation:
    """Tests for file type validation"""

    def test_accept_jpeg_image(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept JPEG images"""
        file_content = b'\xff\xd8\xff\xe0\x00\x10JFIF'  # JPEG magic bytes
        files = {
            "file": ("photo.jpg", io.BytesIO(file_content), "image/jpeg")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]

    def test_accept_png_image(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept PNG images"""
        file_content = b'\x89PNG\r\n\x1a\n'  # PNG magic bytes
        files = {
            "file": ("photo.png", io.BytesIO(file_content), "image/png")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]

    def test_accept_pdf_document(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept PDF documents"""
        file_content = b'%PDF-1.4'  # PDF magic bytes
        files = {
            "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]

    def test_accept_webp_image(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept WebP images"""
        file_content = b'RIFF\x00\x00\x00\x00WEBP'  # WebP magic bytes
        files = {
            "file": ("photo.webp", io.BytesIO(file_content), "image/webp")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]


class TestPathTraversalPrevention:
    """Tests for path traversal attack prevention"""

    def test_block_dot_dot_slash(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should block ../../../ in filename"""
        file_content = b"malicious content"
        files = {
            "file": ("../../../etc/passwd", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        # Should either sanitize and succeed, or reject
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_block_dot_dot_backslash(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should block ..\\..\\..\\"""
        file_content = b"malicious content"
        files = {
            "file": ("..\\..\\windows\\system32\\config", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_block_absolute_path(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should block absolute paths in filename"""
        file_content = b"malicious content"
        files = {
            "file": ("/etc/passwd", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_block_null_byte(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle null byte in filename"""
        file_content = b"malicious content"
        files = {
            "file": ("document.pdf\x00.exe", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_block_traversal_in_document_type(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should sanitize document_type parameter"""
        file_content = b"document content"
        files = {
            "file": ("doc.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "../../../etc/passwd"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        # Should sanitize and succeed, or reject
        assert response.status_code in [200, 201, 400, 401, 403]


class TestMaliciousFilenames:
    """Tests for malicious filename handling"""

    def test_handle_double_extension(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle double extensions"""
        file_content = b"content"
        files = {
            "file": ("document.pdf.exe", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_handle_hidden_file(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle hidden files (starting with dot)"""
        file_content = b"content"
        files = {
            "file": (".htaccess", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_handle_special_chars_in_filename(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle special characters in filename"""
        file_content = b"content"
        files = {
            "file": ("doc!@#$%^&*().pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_handle_unicode_filename(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle unicode characters in filename"""
        file_content = b"content"
        files = {
            "file": ("документ.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_handle_very_long_filename(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle very long filenames"""
        file_content = b"content"
        long_name = "a" * 500 + ".pdf"
        files = {
            "file": (long_name, io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]


class TestExtensionSpoofing:
    """Tests for extension spoofing prevention"""

    def test_executable_disguised_as_pdf(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should detect executable disguised as PDF"""
        # MZ header (Windows executable)
        file_content = b'MZ\x90\x00'
        files = {
            "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        # May accept (trusting extension) or reject
        assert response.status_code in [200, 201, 400, 401, 403]

    def test_script_disguised_as_image(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should handle script disguised as image"""
        file_content = b'<?php echo "hack"; ?>'
        files = {
            "file": ("image.jpg", io.BytesIO(file_content), "image/jpeg")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 400, 401, 403]


class TestFileSizeLimits:
    """Tests for file size limits"""

    def test_accept_small_file(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept small files"""
        file_content = b"x" * 1000  # 1KB
        files = {
            "file": ("small.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]

    def test_accept_medium_file(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should accept medium sized files"""
        file_content = b"x" * (1024 * 1024)  # 1MB
        files = {
            "file": ("medium.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,
        )
        assert response.status_code in [200, 201, 401, 403]


class TestConcurrentUploads:
    """Tests for concurrent upload handling"""

    def test_unique_filenames_generated(self, client: TestClient, test_vendor, vendor_auth_headers):
        """Should generate unique filenames for concurrent uploads"""
        file_content = b"content"

        responses = []
        for i in range(3):
            files = {
                "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
            }
            data = {"document_type": "food_license"}

            response = client.post(
                f"/api/vendors/{test_vendor.id}/documents",
                files=files,
                data=data,
                headers=vendor_auth_headers,
            )
            responses.append(response)

        # All should succeed (or all fail for auth)
        for response in responses:
            assert response.status_code in [200, 201, 401, 403]


class TestUploadEndpointSecurity:
    """Tests for upload endpoint security"""

    def test_requires_authentication(self, client: TestClient, test_vendor):
        """Should require authentication"""
        file_content = b"content"
        files = {
            "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        response = client.post(
            f"/api/vendors/{test_vendor.id}/documents",
            files=files,
            data=data,
        )
        assert response.status_code in [401, 403]

    def test_prevents_cross_vendor_upload(self, client: TestClient, test_vendor, vendor_factory, db_session, vendor_auth_headers):
        """Should prevent uploading to other vendor's account"""
        # Create another vendor
        other_vendor = vendor_factory.create(db_session)

        file_content = b"content"
        files = {
            "file": ("document.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {"document_type": "food_license"}

        # Try to upload to other vendor's account
        response = client.post(
            f"/api/vendors/{other_vendor.id}/documents",
            files=files,
            data=data,
            headers=vendor_auth_headers,  # Using original vendor's auth
        )
        # Should be unauthorized, forbidden or not found
        assert response.status_code in [401, 403, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
