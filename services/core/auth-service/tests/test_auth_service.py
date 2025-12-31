"""
Unit tests for Auth Service

Tests cover:
1. Password hashing and verification
2. JWT token creation and validation
3. Pydantic model validation
4. Health endpoint
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import sys
import os

# Add service to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# =============================================================================
# TEST PASSWORD FUNCTIONS
# =============================================================================

class TestPasswordFunctions:
    """Tests for password hashing and verification"""

    def test_get_password_hash_returns_string(self):
        """Should return a hashed string"""
        from main import get_password_hash

        result = get_password_hash("testpassword123")

        assert isinstance(result, str)
        assert result != "testpassword123"
        assert len(result) > 20  # BCrypt hashes are long

    def test_get_password_hash_different_for_same_input(self):
        """Should return different hashes for same input (salt)"""
        from main import get_password_hash

        hash1 = get_password_hash("testpassword")
        hash2 = get_password_hash("testpassword")

        assert hash1 != hash2  # BCrypt uses random salt

    def test_verify_password_correct(self):
        """Should verify correct password"""
        from main import get_password_hash, verify_password

        password = "mysecretpassword"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Should reject incorrect password"""
        from main import get_password_hash, verify_password

        hashed = get_password_hash("correctpassword")

        assert verify_password("wrongpassword", hashed) is False

    def test_verify_password_empty_string(self):
        """Should handle empty password"""
        from main import get_password_hash, verify_password

        hashed = get_password_hash("")

        assert verify_password("", hashed) is True
        assert verify_password("notempty", hashed) is False


# =============================================================================
# TEST JWT TOKEN FUNCTIONS
# =============================================================================

class TestJWTFunctions:
    """Tests for JWT token creation and validation"""

    def test_create_access_token_returns_string(self):
        """Should return a JWT string"""
        from main import create_access_token

        token = create_access_token({"sub": "test@example.com"})

        assert isinstance(token, str)
        assert len(token) > 50  # JWTs are typically long
        assert token.count(".") == 2  # JWT has 3 parts

    def test_create_access_token_with_custom_expiry(self):
        """Should create token with custom expiry"""
        from main import create_access_token

        token = create_access_token(
            {"sub": "test@example.com"},
            expires_delta=timedelta(hours=1)
        )

        assert isinstance(token, str)

    def test_decode_token_valid(self):
        """Should decode valid token"""
        from main import create_access_token, decode_token

        data = {"sub": "test@example.com", "role": "user"}
        token = create_access_token(data)

        decoded = decode_token(token)

        assert decoded["sub"] == "test@example.com"
        assert decoded["role"] == "user"
        assert "exp" in decoded
        assert "iat" in decoded

    def test_decode_token_invalid_raises_exception(self):
        """Should raise HTTPException for invalid token"""
        from main import decode_token
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid.token.here")

        assert exc_info.value.status_code == 401

    def test_decode_token_tampered_raises_exception(self):
        """Should raise HTTPException for tampered token"""
        from main import create_access_token, decode_token
        from fastapi import HTTPException

        token = create_access_token({"sub": "test@example.com"})
        # Tamper with the token
        tampered = token[:-5] + "xxxxx"

        with pytest.raises(HTTPException):
            decode_token(tampered)


# =============================================================================
# TEST PYDANTIC MODELS
# =============================================================================

class TestPydanticModels:
    """Tests for Pydantic request/response models"""

    def test_user_create_valid(self):
        """Should create valid UserCreate model"""
        from main import UserCreate

        user = UserCreate(
            email="test@example.com",
            password="password123",
            full_name="Test User"
        )

        assert user.email == "test@example.com"
        assert user.password == "password123"
        assert user.full_name == "Test User"
        assert user.role == "user"  # Default

    def test_user_create_with_role(self):
        """Should create UserCreate with custom role"""
        from main import UserCreate

        user = UserCreate(
            email="admin@example.com",
            password="adminpass",
            full_name="Admin User",
            role="admin"
        )

        assert user.role == "admin"

    def test_user_create_invalid_email(self):
        """Should reject invalid email"""
        from main import UserCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            UserCreate(
                email="not-an-email",
                password="password123",
                full_name="Test User"
            )

    def test_driver_register_request_valid(self):
        """Should create valid DriverRegisterRequest"""
        from main import DriverRegisterRequest

        request = DriverRegisterRequest(
            email="driver@example.com",
            password="driverpass",
            first_name="John",
            last_name="Driver",
            phone="+14155551234"
        )

        assert request.email == "driver@example.com"
        assert request.first_name == "John"
        assert request.vehicle_type == "car"  # Default

    def test_driver_register_request_with_all_fields(self):
        """Should create DriverRegisterRequest with all optional fields"""
        from main import DriverRegisterRequest

        request = DriverRegisterRequest(
            email="driver@example.com",
            password="driverpass",
            first_name="John",
            last_name="Driver",
            phone="+14155551234",
            vehicle_type="motorcycle",
            license_number="DL12345",
            date_of_birth="1990-01-15"
        )

        assert request.vehicle_type == "motorcycle"
        assert request.license_number == "DL12345"

    def test_customer_register_request_minimal(self):
        """Should create CustomerRegisterRequest with minimal fields"""
        from main import CustomerRegisterRequest

        request = CustomerRegisterRequest(
            email="customer@example.com",
            password="custpass",
            name="Jane Customer"
        )

        assert request.email == "customer@example.com"
        assert request.phone is None

    def test_customer_register_request_with_phone(self):
        """Should create CustomerRegisterRequest with phone"""
        from main import CustomerRegisterRequest

        request = CustomerRegisterRequest(
            email="customer@example.com",
            password="custpass",
            name="Jane Customer",
            phone="+14155559999"
        )

        assert request.phone == "+14155559999"

    def test_token_model(self):
        """Should create valid Token model"""
        from main import Token, UserResponse

        user_response = UserResponse(
            id=1,
            email="test@example.com",
            full_name="Test User",
            role="user"
        )

        token = Token(
            access_token="test.jwt.token",
            token_type="bearer",
            user=user_response
        )

        assert token.access_token == "test.jwt.token"
        assert token.token_type == "bearer"
        assert token.user.id == 1

    def test_password_reset_request(self):
        """Should create valid PasswordResetRequest"""
        from main import PasswordResetRequest

        request = PasswordResetRequest(email="reset@example.com")

        assert request.email == "reset@example.com"

    def test_password_reset_confirm(self):
        """Should create valid PasswordResetConfirm"""
        from main import PasswordResetConfirm

        request = PasswordResetConfirm(
            email="reset@example.com",
            token="reset-token-123",
            new_password="newpassword456"
        )

        assert request.email == "reset@example.com"
        assert request.token == "reset-token-123"
        assert request.new_password == "newpassword456"


# =============================================================================
# TEST SERVICE CONFIGURATION
# =============================================================================

class TestServiceConfiguration:
    """Tests for service configuration"""

    def test_service_name(self):
        """Should have correct service name"""
        from main import SERVICE_NAME

        assert SERVICE_NAME == "auth-service"

    def test_service_port(self):
        """Should have correct service port"""
        from main import SERVICE_PORT

        assert SERVICE_PORT == 8001

    def test_service_version(self):
        """Should have version defined"""
        from main import SERVICE_VERSION

        assert SERVICE_VERSION is not None
        assert len(SERVICE_VERSION) > 0

    def test_jwt_algorithm(self):
        """Should use HS256 algorithm"""
        from main import ALGORITHM

        assert ALGORITHM == "HS256"

    def test_default_token_expiry(self):
        """Should have default token expiry"""
        from main import ACCESS_TOKEN_EXPIRE_MINUTES

        assert ACCESS_TOKEN_EXPIRE_MINUTES > 0
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 1440  # 24 hours


# =============================================================================
# TEST HEALTH ENDPOINT
# =============================================================================

class TestHealthEndpoint:
    """Tests for health check endpoint"""

    @pytest.mark.asyncio
    async def test_auth_health(self):
        """Should return healthy status"""
        from main import auth_health

        result = await auth_health()

        assert result["service"] == "auth-service"
        assert result["status"] == "healthy"
        assert "version" in result
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_auth_health_timestamp_format(self):
        """Should return valid ISO timestamp"""
        from main import auth_health

        result = await auth_health()
        timestamp = result["timestamp"]

        # Should be parseable as ISO format
        datetime.fromisoformat(timestamp)


# =============================================================================
# TEST PASSWORD RESET ENDPOINTS
# =============================================================================

class TestPasswordResetEndpoints:
    """Tests for password reset flow"""

    @pytest.mark.asyncio
    async def test_request_password_reset_always_succeeds(self):
        """Should always return success to prevent email enumeration"""
        from main import request_password_reset, PasswordResetRequest

        # Mock database
        with patch('main.get_db'):
            mock_db = MagicMock()

            request = PasswordResetRequest(email="nonexistent@example.com")
            result = await request_password_reset(request, mock_db)

            assert result["success"] is True
            assert "password reset link" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_confirm_password_reset(self):
        """Should confirm password reset"""
        from main import confirm_password_reset, PasswordResetConfirm

        with patch('main.get_db'):
            mock_db = MagicMock()

            request = PasswordResetConfirm(
                email="test@example.com",
                token="valid-token",
                new_password="newpassword123"
            )
            result = await confirm_password_reset(request, mock_db)

            assert result["success"] is True


# =============================================================================
# TEST EDGE CASES
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_password_with_special_characters(self):
        """Should handle passwords with special characters"""
        from main import get_password_hash, verify_password

        password = "p@$$w0rd!#$%^&*()"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_password_with_unicode(self):
        """Should handle passwords with unicode characters"""
        from main import get_password_hash, verify_password

        password = "密码пароль🔐"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_very_long_password(self):
        """Should handle very long passwords"""
        from main import get_password_hash, verify_password

        password = "a" * 1000
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_token_with_many_claims(self):
        """Should handle token with many claims"""
        from main import create_access_token, decode_token

        data = {
            "sub": "test@example.com",
            "role": "admin",
            "permissions": ["read", "write", "delete"],
            "metadata": {"key": "value"},
            "user_id": 12345
        }
        token = create_access_token(data)
        decoded = decode_token(token)

        assert decoded["sub"] == "test@example.com"
        assert decoded["role"] == "admin"
        assert decoded["permissions"] == ["read", "write", "delete"]


# =============================================================================
# TEST DRIVER GOOGLE AUTH MODEL
# =============================================================================

class TestDriverGoogleAuthRequest:
    """Tests for DriverGoogleAuthRequest model"""

    def test_driver_google_auth_valid(self):
        """Should create valid DriverGoogleAuthRequest"""
        from main import DriverGoogleAuthRequest

        request = DriverGoogleAuthRequest(
            email="driver@gmail.com",
            name="Google Driver",
            google_id="google_123456789"
        )

        assert request.email == "driver@gmail.com"
        assert request.name == "Google Driver"
        assert request.google_id == "google_123456789"

    def test_driver_google_auth_invalid_email(self):
        """Should reject invalid email"""
        from main import DriverGoogleAuthRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            DriverGoogleAuthRequest(
                email="not-valid",
                name="Test",
                google_id="123"
            )


# =============================================================================
# TEST USER RESPONSE MODEL
# =============================================================================

class TestUserResponse:
    """Tests for UserResponse model"""

    def test_user_response_minimal(self):
        """Should create UserResponse with minimal fields"""
        from main import UserResponse

        response = UserResponse(
            id=1,
            email="test@example.com",
            full_name="Test User",
            role="user"
        )

        assert response.id == 1
        assert response.vendor_id is None
        assert response.driver_id is None
        assert response.customer_id is None

    def test_user_response_vendor(self):
        """Should create UserResponse for vendor"""
        from main import UserResponse

        response = UserResponse(
            id=1,
            email="vendor@example.com",
            full_name="Vendor User",
            role="vendor",
            vendor_id=100
        )

        assert response.vendor_id == 100

    def test_user_response_driver(self):
        """Should create UserResponse for driver"""
        from main import UserResponse

        response = UserResponse(
            id=2,
            email="driver@example.com",
            full_name="Driver User",
            role="driver",
            driver_id=200
        )

        assert response.driver_id == 200

    def test_user_response_customer(self):
        """Should create UserResponse for customer"""
        from main import UserResponse

        response = UserResponse(
            id=3,
            email="customer@example.com",
            full_name="Customer User",
            role="customer",
            customer_id=300
        )

        assert response.customer_id == 300
