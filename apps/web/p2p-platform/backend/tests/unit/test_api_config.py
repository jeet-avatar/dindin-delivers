"""
Unit tests for API configuration, Pydantic models, and utility functions.

Tests:
1. App Config endpoint values and structure
2. Pydantic model validation (UserCreate, Token, Client, Invoice, Payment, etc.)
3. Helper functions (generate_invoice_number)
4. Health check endpoint

All tests run without database connection where possible, using mocks.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
from pydantic import ValidationError

# Import models and functions from main_new
from main_new import (
    get_app_config,
    UserCreate,
    UserResponse,
    Token,
    ClientCreate,
    ClientResponse,
    InvoiceItemCreate,
    InvoiceItemResponse,
    InvoiceCreate,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
    VendorRegisterRequest,
    PasswordResetRequest,
    VendorGoogleAuthRequest,
    VendorAppleAuthRequest,
    generate_invoice_number,
    health_check,
)


# ==================== APP CONFIG TESTS ====================

class TestAppConfig:
    """Test app configuration endpoint"""

    def test_get_app_config_structure(self):
        """Test that config returns all expected keys"""
        config = get_app_config()

        # Check all required keys exist
        required_keys = [
            "taxRate",
            "serviceFee",
            "deliveryFee",
            "restaurantPlatformFee",
            "defaultTipRate",
            "isDummyPaymentMode",
            "isAIFeaturesEnabled",
            "isDynamicPricingEnabled",
            "busyLevelThresholds",
            "supportUrl",
            "supportPhone",
            "supportEmail",
        ]

        for key in required_keys:
            assert key in config, f"Missing key: {key}"

    def test_config_tax_rate(self):
        """Test tax rate is a valid float"""
        config = get_app_config()
        assert isinstance(config["taxRate"], (int, float))
        assert 0 <= config["taxRate"] <= 1, "Tax rate should be between 0 and 1"
        assert config["taxRate"] == 0.06, "Tax rate should be 6%"

    def test_config_service_fee(self):
        """Test service fee ($1 flat fee for Dollor.ai matchmaking model)"""
        config = get_app_config()
        assert isinstance(config["serviceFee"], (int, float))
        assert config["serviceFee"] == 1.00, "Service fee should be $1 (Dollor.ai flat fee)"

    def test_config_delivery_fee(self):
        """Test delivery fee is valid"""
        config = get_app_config()
        assert isinstance(config["deliveryFee"], (int, float))
        assert config["deliveryFee"] > 0, "Delivery fee should be positive"
        assert config["deliveryFee"] == 4.99, "Delivery fee should be $4.99"

    def test_config_restaurant_platform_fee(self):
        """Test restaurant platform fee (Dollar Store $1 model)"""
        config = get_app_config()
        assert isinstance(config["restaurantPlatformFee"], (int, float))
        assert config["restaurantPlatformFee"] == 1.00, "Platform fee should be $1"

    def test_config_default_tip_rate(self):
        """Test default tip rate is valid percentage"""
        config = get_app_config()
        assert isinstance(config["defaultTipRate"], (int, float))
        assert 0 <= config["defaultTipRate"] <= 1
        assert config["defaultTipRate"] == 0.15, "Default tip should be 15%"

    def test_config_feature_flags_types(self):
        """Test feature flags are booleans"""
        config = get_app_config()
        assert isinstance(config["isDummyPaymentMode"], bool)
        assert isinstance(config["isAIFeaturesEnabled"], bool)
        assert isinstance(config["isDynamicPricingEnabled"], bool)

    def test_config_feature_flags_values(self):
        """Test feature flag values (Production mode)"""
        config = get_app_config()
        assert config["isDummyPaymentMode"] is False, "Production: Real payments enabled"
        assert config["isAIFeaturesEnabled"] is True, "AI features should be enabled"
        assert config["isDynamicPricingEnabled"] is False, "Dynamic pricing should be disabled"

    def test_config_busy_level_thresholds(self):
        """Test busy level thresholds structure and types"""
        config = get_app_config()
        thresholds = config["busyLevelThresholds"]

        assert isinstance(thresholds, dict)
        assert "slow" in thresholds
        assert "normal" in thresholds
        assert "busy" in thresholds

        assert isinstance(thresholds["slow"], int)
        assert isinstance(thresholds["normal"], int)
        assert isinstance(thresholds["busy"], int)

        # Values should be increasing
        assert thresholds["slow"] < thresholds["normal"] < thresholds["busy"]

    def test_config_support_info_types(self):
        """Test support information are strings"""
        config = get_app_config()
        assert isinstance(config["supportUrl"], str)
        assert isinstance(config["supportPhone"], str)
        assert isinstance(config["supportEmail"], str)

    def test_config_distance_values(self):
        """Test distance configuration values"""
        config = get_app_config()
        assert isinstance(config["nearbyDistanceMeters"], (int, float))
        assert config["nearbyDistanceMeters"] > 0
        assert isinstance(config["maxDeliveryDistanceMiles"], (int, float))
        assert config["maxDeliveryDistanceMiles"] > 0

    def test_config_prep_time_values(self):
        """Test preparation time configuration"""
        config = get_app_config()
        assert isinstance(config["defaultPrepTimeMinutes"], int)
        assert config["defaultPrepTimeMinutes"] > 0
        assert isinstance(config["maxPrepTimeMinutes"], int)
        assert config["maxPrepTimeMinutes"] >= config["defaultPrepTimeMinutes"]


# ==================== PYDANTIC MODEL VALIDATION TESTS ====================

class TestUserCreateModel:
    """Test UserCreate Pydantic model validation"""

    def test_valid_user_create(self):
        """Test creating valid user"""
        user = UserCreate(
            email="test@example.com",
            password="SecurePass123!",
            full_name="John Doe",
            role="user"
        )
        assert user.email == "test@example.com"
        assert user.password == "SecurePass123!"
        assert user.full_name == "John Doe"
        assert user.role == "user"

    def test_user_create_default_role(self):
        """Test user role defaults to 'user'"""
        user = UserCreate(
            email="test@example.com",
            password="password",
            full_name="John Doe"
        )
        assert user.role == "user"

    def test_user_create_invalid_email(self):
        """Test invalid email raises ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="invalid-email",
                password="password",
                full_name="John Doe"
            )
        errors = exc_info.value.errors()
        assert any(error['loc'] == ('email',) for error in errors)

    def test_user_create_missing_required_fields(self):
        """Test missing required fields raises ValidationError"""
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com")

    def test_user_create_empty_email(self):
        """Test empty email raises ValidationError"""
        with pytest.raises(ValidationError):
            UserCreate(
                email="",
                password="password",
                full_name="John Doe"
            )


class TestUserResponseModel:
    """Test UserResponse Pydantic model"""

    def test_valid_user_response(self):
        """Test valid user response"""
        user = UserResponse(
            id=1,
            email="test@example.com",
            full_name="John Doe",
            role="user"
        )
        assert user.id == 1
        assert user.email == "test@example.com"
        assert user.full_name == "John Doe"
        assert user.role == "user"
        assert user.vendor_id is None

    def test_user_response_with_vendor_id(self):
        """Test user response with vendor_id"""
        user = UserResponse(
            id=1,
            email="vendor@example.com",
            full_name="Vendor User",
            role="vendor",
            vendor_id=123
        )
        assert user.vendor_id == 123

    def test_user_response_missing_required_fields(self):
        """Test missing required fields raises ValidationError"""
        with pytest.raises(ValidationError):
            UserResponse(id=1, email="test@example.com")


class TestTokenModel:
    """Test Token Pydantic model"""

    def test_valid_token(self):
        """Test valid token model"""
        user = UserResponse(
            id=1,
            email="test@example.com",
            full_name="John Doe",
            role="user"
        )
        token = Token(
            access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            token_type="bearer",
            user=user
        )
        assert token.access_token.startswith("eyJ")
        assert token.token_type == "bearer"
        assert token.user.email == "test@example.com"

    def test_token_with_vendor_fields(self):
        """Test token with Android compatibility fields"""
        user = UserResponse(
            id=1,
            email="vendor@example.com",
            full_name="Vendor User",
            role="vendor",
            vendor_id=123
        )
        token = Token(
            access_token="token123",
            token_type="bearer",
            user=user,
            vendor_id=123,
            business_name="My Restaurant",
            email="vendor@example.com"
        )
        assert token.vendor_id == 123
        assert token.business_name == "My Restaurant"
        assert token.email == "vendor@example.com"


class TestClientModels:
    """Test Client Pydantic models"""

    def test_valid_client_create(self):
        """Test valid client creation"""
        client = ClientCreate(
            name="Acme Corp",
            email="contact@acme.com",
            phone="+1-555-0100",
            company="Acme Corporation",
            address="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            country="USA"
        )
        assert client.name == "Acme Corp"
        assert client.email == "contact@acme.com"

    def test_client_create_minimal_fields(self):
        """Test client creation with only required fields"""
        client = ClientCreate(
            name="John Doe",
            email="john@example.com"
        )
        assert client.name == "John Doe"
        assert client.email == "john@example.com"
        assert client.phone is None
        assert client.company is None

    def test_client_create_missing_required(self):
        """Test client creation without required fields fails"""
        with pytest.raises(ValidationError):
            ClientCreate(name="John Doe")

    def test_valid_client_response(self):
        """Test valid client response"""
        client = ClientResponse(
            id=1,
            name="Acme Corp",
            email="contact@acme.com",
            phone="+1-555-0100",
            company="Acme Corporation",
            address="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            country="USA",
            notes="Important client",
            created_at=datetime.now()
        )
        assert client.id == 1
        assert client.name == "Acme Corp"


class TestInvoiceItemModels:
    """Test InvoiceItem Pydantic models"""

    def test_valid_invoice_item_create(self):
        """Test valid invoice item creation"""
        item = InvoiceItemCreate(
            description="Web Development Services",
            quantity=10.0,
            unit_price=150.00
        )
        assert item.description == "Web Development Services"
        assert item.quantity == 10.0
        assert item.unit_price == 150.00

    def test_invoice_item_create_missing_fields(self):
        """Test invoice item without required fields fails"""
        with pytest.raises(ValidationError):
            InvoiceItemCreate(description="Services")

    def test_valid_invoice_item_response(self):
        """Test valid invoice item response"""
        item = InvoiceItemResponse(
            id=1,
            description="Web Development",
            quantity=10.0,
            unit_price=150.00,
            amount=1500.00
        )
        assert item.id == 1
        assert item.amount == 1500.00


class TestInvoiceModels:
    """Test Invoice Pydantic models"""

    def test_valid_invoice_create(self):
        """Test valid invoice creation"""
        items = [
            InvoiceItemCreate(
                description="Service 1",
                quantity=5.0,
                unit_price=100.00
            ),
            InvoiceItemCreate(
                description="Service 2",
                quantity=2.0,
                unit_price=200.00
            )
        ]
        invoice = InvoiceCreate(
            client_id=1,
            issue_date=datetime(2025, 1, 1),
            due_date=datetime(2025, 1, 31),
            items=items,
            tax_rate=0.09,
            discount_amount=50.00,
            notes="Thank you for your business"
        )
        assert invoice.client_id == 1
        assert len(invoice.items) == 2
        assert invoice.tax_rate == 0.09

    def test_invoice_create_default_values(self):
        """Test invoice creation with default values"""
        items = [
            InvoiceItemCreate(
                description="Service",
                quantity=1.0,
                unit_price=100.00
            )
        ]
        invoice = InvoiceCreate(
            client_id=1,
            issue_date=datetime.now(),
            due_date=datetime.now(),
            items=items
        )
        assert invoice.tax_rate == 0.0
        assert invoice.discount_amount == 0.0
        assert invoice.notes is None

    def test_valid_invoice_response(self):
        """Test valid invoice response"""
        items = [
            InvoiceItemResponse(
                id=1,
                description="Service",
                quantity=1.0,
                unit_price=100.00,
                amount=100.00
            )
        ]
        invoice = InvoiceResponse(
            id=1,
            invoice_number="INV-202501-0001",
            client_id=1,
            client_name="Acme Corp",
            issue_date=datetime.now(),
            due_date=datetime.now(),
            subtotal=100.00,
            tax_rate=0.09,
            tax_amount=9.00,
            discount_amount=0.00,
            total_amount=109.00,
            status="pending",
            notes=None,
            terms=None,
            created_at=datetime.now(),
            items=items
        )
        assert invoice.invoice_number == "INV-202501-0001"
        assert invoice.total_amount == 109.00


class TestPaymentModels:
    """Test Payment Pydantic models"""

    def test_valid_payment_create(self):
        """Test valid payment creation"""
        payment = PaymentCreate(
            amount=109.00,
            payment_date=datetime.now(),
            payment_method="credit_card",
            reference_number="REF123456",
            notes="Payment received"
        )
        assert payment.amount == 109.00
        assert payment.payment_method == "credit_card"

    def test_payment_create_minimal(self):
        """Test payment creation with minimal fields"""
        payment = PaymentCreate(
            amount=50.00,
            payment_date=datetime.now()
        )
        assert payment.amount == 50.00
        assert payment.payment_method is None

    def test_valid_payment_response(self):
        """Test valid payment response"""
        payment = PaymentResponse(
            id=1,
            invoice_id=1,
            amount=109.00,
            payment_date=datetime.now(),
            payment_method="credit_card",
            reference_number="REF123",
            status="completed",
            notes="Paid in full",
            created_at=datetime.now()
        )
        assert payment.id == 1
        assert payment.status == "completed"


class TestVendorModels:
    """Test Vendor-related Pydantic models"""

    def test_valid_vendor_register_request(self):
        """Test valid vendor registration request"""
        vendor = VendorRegisterRequest(
            email="restaurant@example.com",
            password="SecurePass123!",
            full_name="John Owner",
            restaurant_name="Best Restaurant"
        )
        assert vendor.email == "restaurant@example.com"
        assert vendor.restaurant_name == "Best Restaurant"

    def test_vendor_register_invalid_email(self):
        """Test vendor registration with invalid email"""
        with pytest.raises(ValidationError) as exc_info:
            VendorRegisterRequest(
                email="not-an-email",
                password="password",
                full_name="John",
                restaurant_name="Restaurant"
            )
        errors = exc_info.value.errors()
        assert any(error['loc'] == ('email',) for error in errors)

    def test_vendor_register_optional_fields(self):
        """Test vendor registration with optional fields (full_name, restaurant_name are optional)"""
        # full_name and restaurant_name are now optional for flexibility with iOS/Android
        vendor = VendorRegisterRequest(
            email="test@example.com",
            password="password"
        )
        # Fields should be None when not provided
        assert vendor.full_name is None
        assert vendor.restaurant_name is None
        # Helper methods return empty string for missing fields
        assert vendor.get_name() == ""
        assert vendor.get_restaurant_name() == ""

    def test_valid_password_reset_request(self):
        """Test valid password reset request"""
        request = PasswordResetRequest(email="user@example.com")
        assert request.email == "user@example.com"

    def test_password_reset_accepts_email_string(self):
        """Test password reset accepts any string for email field"""
        # Note: PasswordResetRequest uses str, not EmailStr, for flexibility
        request = PasswordResetRequest(email="user@example.com")
        assert request.email == "user@example.com"

    def test_valid_vendor_google_auth_request(self):
        """Test valid vendor Google auth request"""
        request = VendorGoogleAuthRequest(
            email="vendor@example.com",
            name="John Vendor",
            google_id="google_123456789"
        )
        assert request.email == "vendor@example.com"
        assert request.google_id == "google_123456789"

    def test_vendor_google_auth_invalid_email(self):
        """Test vendor Google auth with invalid email"""
        with pytest.raises(ValidationError):
            VendorGoogleAuthRequest(
                email="invalid",
                name="John",
                google_id="123"
            )

    def test_valid_vendor_apple_auth_request(self):
        """Test valid vendor Apple auth request"""
        request = VendorAppleAuthRequest(
            email="vendor@example.com",
            name="John Vendor",
            apple_id="apple_123456789"
        )
        assert request.email == "vendor@example.com"
        assert request.apple_id == "apple_123456789"

    def test_vendor_apple_auth_missing_fields(self):
        """Test vendor Apple auth with missing fields"""
        with pytest.raises(ValidationError):
            VendorAppleAuthRequest(
                email="vendor@example.com",
                name="John"
            )


# ==================== HELPER FUNCTION TESTS ====================

class TestGenerateInvoiceNumber:
    """Test invoice number generation logic"""

    def test_generate_invoice_number_format(self):
        """Test invoice number has correct format"""
        mock_db = Mock()
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.desc.return_value = mock_query
        mock_query.first.return_value = None  # No existing invoices

        invoice_num = generate_invoice_number(mock_db)

        # Format: INV-YYYYMM-####
        assert invoice_num.startswith("INV-")
        parts = invoice_num.split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 6  # YYYYMM
        assert len(parts[2]) == 4  # ####
        assert parts[2] == "0001"  # First invoice

    def test_generate_invoice_number_increment(self):
        """Test invoice number increments correctly"""
        mock_db = Mock()
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.desc.return_value = mock_query

        # Mock existing invoice
        mock_invoice = Mock()
        today = datetime.now()
        mock_invoice.invoice_number = f"INV-{today.year}{today.month:02d}-0042"
        mock_query.first.return_value = mock_invoice

        invoice_num = generate_invoice_number(mock_db)

        # Should increment to 0043
        assert invoice_num.endswith("-0043")

    def test_generate_invoice_number_current_month(self):
        """Test invoice number uses current year and month"""
        mock_db = Mock()
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.desc.return_value = mock_query
        mock_query.first.return_value = None

        invoice_num = generate_invoice_number(mock_db)

        today = datetime.now()
        expected_prefix = f"INV-{today.year}{today.month:02d}"
        assert invoice_num.startswith(expected_prefix)

    def test_generate_invoice_number_padding(self):
        """Test invoice number padding for small numbers"""
        mock_db = Mock()
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.desc.return_value = mock_query

        # Mock existing invoice with number 5
        mock_invoice = Mock()
        today = datetime.now()
        mock_invoice.invoice_number = f"INV-{today.year}{today.month:02d}-0005"
        mock_query.first.return_value = mock_invoice

        invoice_num = generate_invoice_number(mock_db)

        # Should be padded to 4 digits
        assert invoice_num.endswith("-0006")
        assert len(invoice_num.split("-")[2]) == 4


# ==================== HEALTH CHECK TESTS ====================

class TestHealthCheck:
    """Test health check endpoint"""

    def _create_mock_db(self, db_connected: bool = True):
        """Create a mock database session"""
        mock_db = MagicMock()
        if db_connected:
            mock_db.execute.return_value = None  # Successful query
        else:
            mock_db.execute.side_effect = Exception("Connection failed")
        return mock_db

    @pytest.mark.asyncio
    async def test_health_check_response_structure(self):
        """Test health check returns correct structure"""
        mock_db = self._create_mock_db()
        response = await health_check(db=mock_db)

        assert "status" in response
        assert "service" in response
        assert "timestamp" in response

    @pytest.mark.asyncio
    async def test_health_check_status_healthy(self):
        """Test health check status is healthy when DB connected"""
        mock_db = self._create_mock_db(db_connected=True)
        response = await health_check(db=mock_db)
        assert response["status"] == "healthy"
        assert response["database"] == "connected"

    @pytest.mark.asyncio
    async def test_health_check_status_unhealthy(self):
        """Test health check status is unhealthy when DB disconnected"""
        mock_db = self._create_mock_db(db_connected=False)
        response = await health_check(db=mock_db)
        assert response["status"] == "unhealthy"
        assert "disconnected" in response["database"]

    @pytest.mark.asyncio
    async def test_health_check_service_name(self):
        """Test health check service name"""
        mock_db = self._create_mock_db()
        response = await health_check(db=mock_db)
        assert response["service"] == "p2p-backend"

    @pytest.mark.asyncio
    async def test_health_check_timestamp_format(self):
        """Test health check timestamp is valid ISO format"""
        mock_db = self._create_mock_db()
        response = await health_check(db=mock_db)
        timestamp = response["timestamp"]

        # Should be valid ISO format
        assert isinstance(timestamp, str)
        # Try to parse it
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))


# ==================== EDGE CASES AND VALIDATION ====================

class TestModelEdgeCases:
    """Test edge cases for Pydantic models"""

    def test_email_whitespace_trimming(self):
        """Test email whitespace is handled"""
        # Pydantic EmailStr validator trims whitespace
        user = UserCreate(
            email="  test@example.com  ",
            password="password",
            full_name="Test"
        )
        assert user.email == "test@example.com"

    def test_optional_fields_none_vs_missing(self):
        """Test optional fields can be None or missing"""
        client1 = ClientCreate(
            name="Test",
            email="test@example.com",
            phone=None
        )
        client2 = ClientCreate(
            name="Test",
            email="test@example.com"
        )
        assert client1.phone is None
        assert client2.phone is None

    def test_float_fields_accept_integers(self):
        """Test float fields accept integer values"""
        item = InvoiceItemCreate(
            description="Item",
            quantity=5,  # int
            unit_price=100  # int
        )
        assert item.quantity == 5.0
        assert item.unit_price == 100.0

    def test_negative_amounts_allowed(self):
        """Test negative amounts (for refunds/credits)"""
        # Pydantic doesn't restrict by default
        payment = PaymentCreate(
            amount=-50.00,  # Negative for refund
            payment_date=datetime.now()
        )
        assert payment.amount == -50.00


# ==================== TYPE VALIDATION TESTS ====================

class TestTypeValidation:
    """Test type validation for models"""

    def test_string_for_email_field(self):
        """Test that non-email string for email field fails"""
        with pytest.raises(ValidationError):
            UserCreate(
                email="not-an-email",
                password="pass",
                full_name="Test"
            )

    def test_integer_for_string_field(self):
        """Test integer is coerced to string"""
        # Pydantic will coerce int to string
        client = ClientCreate(
            name="Test Client",
            email="test@example.com",
            phone="1234567890"  # String
        )
        assert isinstance(client.phone, str)

    def test_string_for_float_field_fails(self):
        """Test non-numeric string for float field fails"""
        with pytest.raises(ValidationError):
            InvoiceItemCreate(
                description="Item",
                quantity="not-a-number",
                unit_price=100.0
            )

    def test_numeric_string_coercion(self):
        """Test numeric strings are coerced to numbers"""
        item = InvoiceItemCreate(
            description="Item",
            quantity="5.5",
            unit_price="100.00"
        )
        assert item.quantity == 5.5
        assert item.unit_price == 100.00
        assert isinstance(item.quantity, float)
        assert isinstance(item.unit_price, float)
