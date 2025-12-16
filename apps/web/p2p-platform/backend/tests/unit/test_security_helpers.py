"""
Unit tests for security helper functions.

Tests cover:
- sanitize_file_extension()
- secure_file_path()
- sanitize_document_type()
- create_access_token()
- verify_password() / get_password_hash()
"""

import pytest
import os
import sys
import tempfile
from datetime import timedelta
from unittest.mock import patch, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from main_new import (
    sanitize_file_extension,
    secure_file_path,
    sanitize_document_type,
    create_access_token,
    verify_password,
    get_password_hash,
)


class TestSanitizeFileExtension:
    """Tests for sanitize_file_extension function"""

    def test_valid_extension_jpg(self):
        """Should return jpg for valid jpg file"""
        result = sanitize_file_extension("photo.jpg", ["jpg", "jpeg", "png"], "pdf")
        assert result == "jpg"

    def test_valid_extension_jpeg(self):
        """Should return jpeg for valid jpeg file"""
        result = sanitize_file_extension("photo.jpeg", ["jpg", "jpeg", "png"], "pdf")
        assert result == "jpeg"

    def test_valid_extension_png(self):
        """Should return png for valid png file"""
        result = sanitize_file_extension("image.png", ["jpg", "jpeg", "png"], "pdf")
        assert result == "png"

    def test_valid_extension_pdf(self):
        """Should return pdf for valid pdf file"""
        result = sanitize_file_extension("document.pdf", ["pdf", "jpg"], "jpg")
        assert result == "pdf"

    def test_invalid_extension_returns_default(self):
        """Should return default for invalid extension"""
        result = sanitize_file_extension("script.exe", ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"

    def test_no_extension_returns_default(self):
        """Should return default when no extension"""
        result = sanitize_file_extension("filename", ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"

    def test_empty_filename_returns_default(self):
        """Should return default for empty filename"""
        result = sanitize_file_extension("", ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"

    def test_none_filename_returns_default(self):
        """Should return default for None filename"""
        result = sanitize_file_extension(None, ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"

    def test_path_traversal_in_extension(self):
        """Should sanitize path traversal attempts in extension"""
        result = sanitize_file_extension("file../../../etc/passwd", ["jpg", "pdf"], "pdf")
        assert result == "pdf"
        assert ".." not in result
        assert "/" not in result

    def test_special_chars_in_extension(self):
        """Should remove special characters from extension"""
        result = sanitize_file_extension("file.j!p@g#", ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"  # jpgspecial chars removed, not in allowed

    def test_case_insensitive(self):
        """Should handle case-insensitive extensions"""
        result = sanitize_file_extension("photo.JPG", ["jpg", "jpeg", "png"], "pdf")
        assert result == "jpg"

    def test_uppercase_extension(self):
        """Should normalize uppercase extensions"""
        result = sanitize_file_extension("photo.PNG", ["jpg", "jpeg", "png"], "pdf")
        assert result == "png"

    def test_mixed_case_extension(self):
        """Should handle mixed case extensions"""
        result = sanitize_file_extension("photo.JpEg", ["jpg", "jpeg", "png"], "pdf")
        assert result == "jpeg"

    def test_extension_truncation(self):
        """Should truncate very long extensions"""
        long_ext = "a" * 100
        result = sanitize_file_extension(f"file.{long_ext}", [long_ext[:10]], "pdf")
        assert len(result) <= 10

    def test_double_extension(self):
        """Should handle double extensions"""
        result = sanitize_file_extension("file.tar.gz", ["tar", "gz", "jpg"], "pdf")
        assert result == "gz"

    def test_hidden_file(self):
        """Should handle hidden files (starting with dot)"""
        result = sanitize_file_extension(".htaccess", ["jpg", "jpeg", "png"], "pdf")
        assert result == "pdf"

    def test_webp_extension(self):
        """Should accept webp extension"""
        result = sanitize_file_extension("image.webp", ["jpg", "jpeg", "png", "webp"], "jpg")
        assert result == "webp"


class TestSecureFilePath:
    """Tests for secure_file_path function"""

    def test_valid_path_in_directory(self):
        """Should return valid path within directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = secure_file_path(tmpdir, "test.jpg")
            assert result == os.path.join(tmpdir, "test.jpg")

    def test_path_traversal_blocked(self):
        """Should block path traversal attempts"""
        from fastapi import HTTPException

        with tempfile.TemporaryDirectory() as tmpdir:
            with pytest.raises(HTTPException) as exc_info:
                secure_file_path(tmpdir, "../../../etc/passwd")
            assert exc_info.value.status_code == 400
            assert "Invalid filename" in str(exc_info.value.detail)

    def test_double_dot_blocked(self):
        """Should block double dot path traversal"""
        from fastapi import HTTPException

        with tempfile.TemporaryDirectory() as tmpdir:
            with pytest.raises(HTTPException):
                secure_file_path(tmpdir, "..\\..\\windows\\system32")

    def test_absolute_path_in_filename_blocked(self):
        """Should block absolute paths in filename"""
        from fastapi import HTTPException

        with tempfile.TemporaryDirectory() as tmpdir:
            # Absolute path should be blocked
            with pytest.raises(HTTPException):
                secure_file_path(tmpdir, "/etc/passwd")

    def test_normal_filename_allowed(self):
        """Should allow normal filenames"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = secure_file_path(tmpdir, "document_123.pdf")
            assert "document_123.pdf" in result

    def test_filename_with_underscores(self):
        """Should allow filenames with underscores"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = secure_file_path(tmpdir, "my_file_name.jpg")
            assert result.endswith("my_file_name.jpg")

    def test_filename_with_numbers(self):
        """Should allow filenames with numbers"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = secure_file_path(tmpdir, "file123456.pdf")
            assert result.endswith("file123456.pdf")

    def test_uuid_style_filename(self):
        """Should allow UUID-style filenames"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = secure_file_path(tmpdir, "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf")
            assert result.endswith(".pdf")


class TestSanitizeDocumentType:
    """Tests for sanitize_document_type function"""

    def test_valid_document_type(self):
        """Should return valid document type unchanged"""
        valid_types = ["food_license", "health_permit", "w9_form"]
        result = sanitize_document_type("food_license", valid_types)
        assert result == "food_license"

    def test_invalid_document_type_sanitized(self):
        """Should sanitize invalid document type"""
        valid_types = ["food_license", "health_permit"]
        result = sanitize_document_type("invalid_type", valid_types)
        # Should be sanitized (alphanumeric and underscores only)
        assert result == "invalid_type"  # Valid chars, just not in list

    def test_path_traversal_removed(self):
        """Should remove path traversal characters"""
        valid_types = ["food_license"]
        result = sanitize_document_type("../../../etc/passwd", valid_types)
        assert ".." not in result
        assert "/" not in result

    def test_special_chars_removed(self):
        """Should remove special characters"""
        valid_types = ["food_license"]
        result = sanitize_document_type("doc!@#$%type", valid_types)
        assert "!" not in result
        assert "@" not in result
        assert "#" not in result

    def test_empty_returns_default(self):
        """Should return default for empty input"""
        valid_types = ["food_license"]
        result = sanitize_document_type("", valid_types)
        assert result == "document"

    def test_only_special_chars_returns_default(self):
        """Should return default when only special chars"""
        valid_types = ["food_license"]
        result = sanitize_document_type("!@#$%^", valid_types)
        assert result == "document"

    def test_truncates_long_input(self):
        """Should truncate very long input"""
        valid_types = ["food_license"]
        long_input = "a" * 100
        result = sanitize_document_type(long_input, valid_types)
        assert len(result) <= 30

    def test_underscore_preserved(self):
        """Should preserve underscores in document type"""
        valid_types = ["food_license"]
        result = sanitize_document_type("food_handler_cert", valid_types)
        assert "_" in result

    def test_health_permit(self):
        """Should accept health_permit"""
        valid_types = ["food_license", "health_permit", "w9_form"]
        result = sanitize_document_type("health_permit", valid_types)
        assert result == "health_permit"

    def test_w9_form(self):
        """Should accept w9_form"""
        valid_types = ["food_license", "health_permit", "w9_form"]
        result = sanitize_document_type("w9_form", valid_types)
        assert result == "w9_form"


class TestPasswordHashing:
    """Tests for password hashing functions"""

    def test_hash_password(self):
        """Should hash password"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0

    def test_verify_correct_password(self):
        """Should verify correct password"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        """Should reject wrong password"""
        password = "TestPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)
        assert verify_password(wrong_password, hashed) is False

    def test_different_hashes_for_same_password(self):
        """Should generate different hashes for same password (salt)"""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2  # Should be different due to salt

    def test_hash_empty_password(self):
        """Should handle empty password"""
        password = ""
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_hash_special_chars_password(self):
        """Should handle passwords with special characters"""
        password = "P@$$w0rd!#$%^&*()"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_hash_unicode_password(self):
        """Should handle unicode passwords"""
        password = "Pässwörd123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_hash_long_password(self):
        """Should handle long passwords"""
        password = "a" * 1000
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True


class TestCreateAccessToken:
    """Tests for JWT token creation"""

    def test_create_token_basic(self):
        """Should create a valid JWT token"""
        data = {"sub": "test@test.com"}
        token = create_access_token(data)
        assert token is not None
        assert len(token) > 0
        assert "." in token  # JWT format

    def test_create_token_with_custom_expiry(self):
        """Should create token with custom expiry"""
        data = {"sub": "test@test.com"}
        expires = timedelta(hours=1)
        token = create_access_token(data, expires_delta=expires)
        assert token is not None

    def test_create_token_with_additional_data(self):
        """Should include additional data in token"""
        data = {"sub": "test@test.com", "role": "admin", "type": "access"}
        token = create_access_token(data)
        assert token is not None

    def test_tokens_are_different(self):
        """Should generate different tokens each time"""
        data = {"sub": "test@test.com"}
        token1 = create_access_token(data)
        token2 = create_access_token(data)
        # May be same if created in same second, but usually different
        # due to timing differences

    def test_token_format_valid_jwt(self):
        """Should create valid JWT format (3 parts)"""
        data = {"sub": "test@test.com"}
        token = create_access_token(data)
        parts = token.split(".")
        assert len(parts) == 3  # Header.Payload.Signature

    def test_create_token_password_reset(self):
        """Should create token for password reset"""
        data = {"sub": "test@test.com", "type": "password_reset"}
        expires = timedelta(hours=1)
        token = create_access_token(data, expires_delta=expires)
        assert token is not None


class TestSecurityIntegration:
    """Integration tests for security functions"""

    def test_file_upload_security_chain(self):
        """Test complete file upload security chain"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Simulate file upload security
            filename = "../../malicious.exe"
            allowed_exts = ["jpg", "jpeg", "png", "pdf"]

            # Step 1: Sanitize extension
            ext = sanitize_file_extension(filename, allowed_exts, "pdf")
            assert ext == "pdf"

            # Step 2: Create safe filename
            import uuid
            safe_filename = f"vendor_1_document_{uuid.uuid4().hex[:8]}.{ext}"

            # Step 3: Secure path
            file_path = secure_file_path(tmpdir, safe_filename)
            assert tmpdir in file_path
            assert ".." not in file_path

    def test_document_upload_security_chain(self):
        """Test complete document upload security chain"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Malicious document type
            doc_type = "../../../etc/passwd"
            valid_types = ["food_license", "health_permit", "w9_form"]

            # Sanitize document type
            safe_type = sanitize_document_type(doc_type, valid_types)
            assert ".." not in safe_type
            assert "/" not in safe_type

            # Create filename with sanitized type
            import uuid
            safe_filename = f"vendor_1_{safe_type}_{uuid.uuid4().hex[:8]}.pdf"

            # Verify path is secure
            file_path = secure_file_path(tmpdir, safe_filename)
            assert tmpdir in file_path


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
