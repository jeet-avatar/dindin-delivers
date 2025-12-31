"""
Unit tests for User Service

Tests cover:
1. Helper functions (generate_customer_id, calculate_loyalty_tier, get_tier_benefits)
2. Pydantic models
3. Configuration constants
4. Edge cases
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock
import sys
import os

# Add service to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# =============================================================================
# TEST HELPER FUNCTIONS
# =============================================================================

class TestHelperFunctions:
    """Tests for helper functions"""

    def test_generate_customer_id_format(self):
        """Should generate customer ID with correct format"""
        from main import generate_customer_id

        mock_db = MagicMock()
        mock_db.query().filter().first.return_value = None

        customer_id = generate_customer_id(mock_db)

        assert customer_id.startswith("CUST-")
        assert len(customer_id) == 11  # CUST- + 6 digits
        assert customer_id[5:].isdigit()

    def test_calculate_loyalty_tier_bronze(self):
        """Should return bronze for points < 1000"""
        from main import calculate_loyalty_tier

        assert calculate_loyalty_tier(0) == "bronze"
        assert calculate_loyalty_tier(500) == "bronze"
        assert calculate_loyalty_tier(999) == "bronze"

    def test_calculate_loyalty_tier_silver(self):
        """Should return silver for points 1000-4999"""
        from main import calculate_loyalty_tier

        assert calculate_loyalty_tier(1000) == "silver"
        assert calculate_loyalty_tier(3000) == "silver"
        assert calculate_loyalty_tier(4999) == "silver"

    def test_calculate_loyalty_tier_gold(self):
        """Should return gold for points 5000-9999"""
        from main import calculate_loyalty_tier

        assert calculate_loyalty_tier(5000) == "gold"
        assert calculate_loyalty_tier(7500) == "gold"
        assert calculate_loyalty_tier(9999) == "gold"

    def test_calculate_loyalty_tier_platinum(self):
        """Should return platinum for points >= 10000"""
        from main import calculate_loyalty_tier

        assert calculate_loyalty_tier(10000) == "platinum"
        assert calculate_loyalty_tier(50000) == "platinum"
        assert calculate_loyalty_tier(999999) == "platinum"

    def test_get_tier_benefits_bronze(self):
        """Should return bronze tier benefits"""
        from main import get_tier_benefits

        benefits = get_tier_benefits("bronze")

        assert isinstance(benefits, list)
        assert len(benefits) >= 2
        assert any("Free delivery" in b for b in benefits)

    def test_get_tier_benefits_silver(self):
        """Should return silver tier benefits"""
        from main import get_tier_benefits

        benefits = get_tier_benefits("silver")

        assert isinstance(benefits, list)
        assert len(benefits) >= 3
        assert any("Priority support" in b for b in benefits)

    def test_get_tier_benefits_gold(self):
        """Should return gold tier benefits"""
        from main import get_tier_benefits

        benefits = get_tier_benefits("gold")

        assert isinstance(benefits, list)
        assert len(benefits) >= 4
        assert any("Exclusive offers" in b for b in benefits)

    def test_get_tier_benefits_platinum(self):
        """Should return platinum tier benefits"""
        from main import get_tier_benefits

        benefits = get_tier_benefits("platinum")

        assert isinstance(benefits, list)
        assert len(benefits) >= 5
        assert any("VIP support" in b for b in benefits)
        assert any("Early access" in b for b in benefits)

    def test_get_tier_benefits_invalid_defaults_to_bronze(self):
        """Should default to bronze for invalid tier"""
        from main import get_tier_benefits

        benefits = get_tier_benefits("invalid_tier")
        bronze_benefits = get_tier_benefits("bronze")

        assert benefits == bronze_benefits


# =============================================================================
# TEST PYDANTIC MODELS
# =============================================================================

class TestPydanticModels:
    """Tests for Pydantic request/response models"""

    def test_customer_create_valid(self):
        """Should create valid CustomerCreate model"""
        from main import CustomerCreate

        customer = CustomerCreate(
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            phone="+14155551234"
        )

        assert customer.email == "test@example.com"
        assert customer.first_name == "John"
        assert customer.last_name == "Doe"
        assert customer.phone == "+14155551234"

    def test_customer_create_minimal(self):
        """Should create CustomerCreate with minimal fields"""
        from main import CustomerCreate

        customer = CustomerCreate(
            email="minimal@example.com",
            first_name="Jane",
            last_name="Smith"
        )

        assert customer.email == "minimal@example.com"
        assert customer.phone is None

    def test_customer_create_invalid_email(self):
        """Should reject invalid email"""
        from main import CustomerCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CustomerCreate(
                email="not-an-email",
                first_name="Test",
                last_name="User"
            )

    def test_customer_update_partial(self):
        """Should create CustomerUpdate with partial fields"""
        from main import CustomerUpdate

        update = CustomerUpdate(first_name="Updated")

        assert update.first_name == "Updated"
        assert update.last_name is None

    def test_customer_update_all_fields(self):
        """Should create CustomerUpdate with all fields"""
        from main import CustomerUpdate

        update = CustomerUpdate(
            first_name="John",
            last_name="Doe",
            phone="+14155551234",
            profile_photo_url="https://example.com/photo.jpg",
            dietary_preferences=["vegetarian", "gluten_free"],
            favorite_cuisines=["italian", "japanese"],
            notification_preferences={"email": True, "push": True}
        )

        assert update.first_name == "John"
        assert len(update.dietary_preferences) == 2
        assert len(update.favorite_cuisines) == 2
        assert update.notification_preferences["email"] is True

    def test_customer_response_model(self):
        """Should create valid CustomerResponse"""
        from main import CustomerResponse

        response = CustomerResponse(
            id=1,
            customer_id="CUST-123456",
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            phone="+14155551234",
            loyalty_points=1500,
            loyalty_tier="silver",
            total_orders=10,
            total_rides=5,
            total_spent=500.50,
            status="active",
            is_verified=True,
            created_at=datetime.utcnow()
        )

        assert response.id == 1
        assert response.loyalty_tier == "silver"

    def test_address_create_valid(self):
        """Should create valid AddressCreate"""
        from main import AddressCreate

        address = AddressCreate(
            label="Home",
            street="123 Main St",
            apartment="Apt 4B",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            country="USA",
            latitude=37.7749,
            longitude=-122.4194,
            is_default=True,
            delivery_instructions="Ring doorbell"
        )

        assert address.label == "Home"
        assert address.city == "San Francisco"
        assert address.is_default is True

    def test_address_create_minimal(self):
        """Should create AddressCreate with minimal fields"""
        from main import AddressCreate

        address = AddressCreate(
            label="Work",
            street="456 Oak Ave",
            city="Oakland",
            state="CA",
            zip_code="94601"
        )

        assert address.country == "USA"  # Default
        assert address.is_default is False
        assert address.apartment is None

    def test_address_response_model(self):
        """Should create valid AddressResponse"""
        from main import AddressResponse

        response = AddressResponse(
            id=1,
            label="Home",
            street="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            country="USA",
            is_default=True
        )

        assert response.id == 1
        assert response.is_default is True

    def test_loyalty_info_model(self):
        """Should create valid LoyaltyInfo"""
        from main import LoyaltyInfo

        info = LoyaltyInfo(
            points=1500,
            tier="silver",
            points_to_next_tier=3500,
            benefits=["Free delivery", "Priority support"]
        )

        assert info.points == 1500
        assert info.tier == "silver"
        assert len(info.benefits) == 2


# =============================================================================
# TEST SERVICE CONFIGURATION
# =============================================================================

class TestServiceConfiguration:
    """Tests for service configuration"""

    def test_service_name(self):
        """Should have correct service name"""
        from main import SERVICE_NAME

        assert SERVICE_NAME == "user-service"

    def test_service_port(self):
        """Should have correct service port"""
        from main import SERVICE_PORT

        assert SERVICE_PORT == 8002

    def test_service_version(self):
        """Should have version defined"""
        from main import SERVICE_VERSION

        assert SERVICE_VERSION is not None
        assert len(SERVICE_VERSION) > 0


# =============================================================================
# TEST ENUMS
# =============================================================================

class TestEnums:
    """Tests for enum types"""

    def test_customer_status_enum(self):
        """Should have all customer status values"""
        from main import CustomerStatus

        assert hasattr(CustomerStatus, 'ACTIVE')
        assert hasattr(CustomerStatus, 'INACTIVE')
        assert hasattr(CustomerStatus, 'SUSPENDED')

        assert CustomerStatus.ACTIVE.value == "active"

    def test_loyalty_tier_enum(self):
        """Should have all loyalty tier values"""
        from main import LoyaltyTier

        assert hasattr(LoyaltyTier, 'BRONZE')
        assert hasattr(LoyaltyTier, 'SILVER')
        assert hasattr(LoyaltyTier, 'GOLD')
        assert hasattr(LoyaltyTier, 'PLATINUM')

        assert LoyaltyTier.BRONZE.value == "bronze"


# =============================================================================
# TEST EDGE CASES
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_calculate_loyalty_tier_boundary_values(self):
        """Should handle boundary values correctly"""
        from main import calculate_loyalty_tier

        # Just before threshold
        assert calculate_loyalty_tier(999) == "bronze"
        # Exactly at threshold
        assert calculate_loyalty_tier(1000) == "silver"
        # Just after threshold
        assert calculate_loyalty_tier(1001) == "silver"

    def test_calculate_loyalty_tier_negative_points(self):
        """Should handle negative points"""
        from main import calculate_loyalty_tier

        # Should default to bronze
        result = calculate_loyalty_tier(-100)
        assert result == "bronze"

    def test_calculate_loyalty_tier_very_large_points(self):
        """Should handle very large point values"""
        from main import calculate_loyalty_tier

        result = calculate_loyalty_tier(9999999)
        assert result == "platinum"

    def test_customer_create_with_international_phone(self):
        """Should accept international phone numbers"""
        from main import CustomerCreate

        customer = CustomerCreate(
            email="intl@example.com",
            first_name="Test",
            last_name="User",
            phone="+44 20 1234 5678"
        )

        assert customer.phone == "+44 20 1234 5678"

    def test_address_create_with_long_delivery_instructions(self):
        """Should accept long delivery instructions"""
        from main import AddressCreate

        long_instructions = "A" * 500

        address = AddressCreate(
            label="Home",
            street="123 Main St",
            city="City",
            state="ST",
            zip_code="12345",
            delivery_instructions=long_instructions
        )

        assert len(address.delivery_instructions) == 500

    def test_customer_update_with_empty_preferences(self):
        """Should accept empty preference lists"""
        from main import CustomerUpdate

        update = CustomerUpdate(
            dietary_preferences=[],
            favorite_cuisines=[]
        )

        assert update.dietary_preferences == []
        assert update.favorite_cuisines == []

    def test_address_create_with_extreme_coordinates(self):
        """Should accept valid extreme coordinates"""
        from main import AddressCreate

        # North pole
        address = AddressCreate(
            label="North Pole",
            street="1 Santa Claus Lane",
            city="North Pole",
            state="AK",
            zip_code="99705",
            latitude=90.0,
            longitude=0.0
        )

        assert address.latitude == 90.0

        # South pole
        address2 = AddressCreate(
            label="South Pole",
            street="1 Research Station",
            city="Antarctica",
            state="AQ",
            zip_code="00000",
            latitude=-90.0,
            longitude=0.0
        )

        assert address2.latitude == -90.0

    def test_customer_response_with_zero_stats(self):
        """Should handle customers with zero stats"""
        from main import CustomerResponse

        response = CustomerResponse(
            id=1,
            email="new@example.com",
            loyalty_points=0,
            total_orders=0,
            total_rides=0,
            total_spent=0.0,
            created_at=datetime.utcnow()
        )

        assert response.loyalty_points == 0
        assert response.total_spent == 0.0
