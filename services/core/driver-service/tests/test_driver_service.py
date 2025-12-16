"""
Unit tests for Driver Service

Tests cover:
1. Pydantic models
2. Enum types
3. Service configuration
4. Edge cases
"""

import pytest
from datetime import datetime, timedelta
import sys
import os

# Add service to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# =============================================================================
# TEST PYDANTIC MODELS
# =============================================================================

class TestPydanticModels:
    """Tests for Pydantic request/response models"""

    def test_driver_profile_update_valid(self):
        """Should create valid DriverProfileUpdate"""
        from main import DriverProfileUpdate

        update = DriverProfileUpdate(
            first_name="John",
            last_name="Doe",
            phone="+14155551234",
            vehicle_make="Toyota",
            vehicle_model="Camry",
            vehicle_year=2020
        )

        assert update.first_name == "John"
        assert update.vehicle_make == "Toyota"
        assert update.vehicle_year == 2020

    def test_driver_profile_update_partial(self):
        """Should create DriverProfileUpdate with partial fields"""
        from main import DriverProfileUpdate

        update = DriverProfileUpdate(first_name="Jane")

        assert update.first_name == "Jane"
        assert update.last_name is None

    def test_location_update_valid(self):
        """Should create valid LocationUpdate"""
        from main import LocationUpdate

        location = LocationUpdate(
            latitude=37.7749,
            longitude=-122.4194,
            heading=90.5,
            speed=30.0,
            accuracy=10.0
        )

        assert location.latitude == 37.7749
        assert location.longitude == -122.4194
        assert location.heading == 90.5

    def test_location_update_minimal(self):
        """Should create LocationUpdate with minimal fields"""
        from main import LocationUpdate

        location = LocationUpdate(
            latitude=40.7128,
            longitude=-74.0060
        )

        assert location.latitude == 40.7128
        assert location.heading is None

    def test_online_status_update(self):
        """Should create valid OnlineStatusUpdate"""
        from main import OnlineStatusUpdate

        status_update = OnlineStatusUpdate(is_online=True)

        assert status_update.is_online is True

    def test_fcm_token_update(self):
        """Should create valid FCMTokenUpdate"""
        from main import FCMTokenUpdate

        token = FCMTokenUpdate(
            fcm_token="test_token_12345",
            device_type="ios"
        )

        assert token.fcm_token == "test_token_12345"
        assert token.device_type == "ios"

    def test_document_upload_valid(self):
        """Should create valid DocumentUpload"""
        from main import DocumentUpload, DocumentType

        doc = DocumentUpload(
            document_type=DocumentType.DRIVERS_LICENSE,
            document_url="https://example.com/license.jpg",
            expiry_date=datetime(2025, 12, 31)
        )

        assert doc.document_type == DocumentType.DRIVERS_LICENSE
        assert doc.document_url.startswith("https://")

    def test_document_upload_no_expiry(self):
        """Should create DocumentUpload without expiry"""
        from main import DocumentUpload, DocumentType

        doc = DocumentUpload(
            document_type=DocumentType.PROFILE_PHOTO,
            document_url="https://example.com/photo.jpg"
        )

        assert doc.expiry_date is None

    def test_nearby_drivers_query(self):
        """Should create valid NearbyDriversQuery"""
        from main import NearbyDriversQuery

        query = NearbyDriversQuery(
            latitude=37.7749,
            longitude=-122.4194,
            radius_km=5.0,
            limit=10
        )

        assert query.latitude == 37.7749
        assert query.radius_km == 5.0
        assert query.limit == 10


# =============================================================================
# TEST ENUMS
# =============================================================================

class TestEnums:
    """Tests for enum types"""

    def test_driver_status_enum(self):
        """Should have all driver status values"""
        from main import DriverStatus

        assert DriverStatus.PENDING.value == "pending"
        assert DriverStatus.APPROVED.value == "approved"
        assert DriverStatus.ACTIVE.value == "active"
        assert DriverStatus.INACTIVE.value == "inactive"
        assert DriverStatus.SUSPENDED.value == "suspended"

    def test_vehicle_type_enum(self):
        """Should have all vehicle type values"""
        from main import VehicleType

        assert VehicleType.CAR.value == "car"
        assert VehicleType.MOTORCYCLE.value == "motorcycle"
        assert VehicleType.BICYCLE.value == "bicycle"
        assert VehicleType.SCOOTER.value == "scooter"
        assert VehicleType.VAN.value == "van"

    def test_document_type_enum(self):
        """Should have all document type values"""
        from main import DocumentType

        assert DocumentType.DRIVERS_LICENSE.value == "drivers_license"
        assert DocumentType.VEHICLE_REGISTRATION.value == "vehicle_registration"
        assert DocumentType.INSURANCE.value == "insurance"
        assert DocumentType.BACKGROUND_CHECK.value == "background_check"
        assert DocumentType.PROFILE_PHOTO.value == "profile_photo"

    def test_document_status_enum(self):
        """Should have all document status values"""
        from main import DocumentStatus

        assert DocumentStatus.PENDING.value == "pending"
        assert DocumentStatus.APPROVED.value == "approved"
        assert DocumentStatus.REJECTED.value == "rejected"
        assert DocumentStatus.EXPIRED.value == "expired"


# =============================================================================
# TEST SERVICE CONFIGURATION
# =============================================================================

class TestServiceConfiguration:
    """Tests for service configuration"""

    def test_service_name(self):
        """Should have correct service name"""
        from main import SERVICE_NAME

        assert SERVICE_NAME == "driver-service"

    def test_service_port(self):
        """Should have correct service port"""
        from main import SERVICE_PORT

        assert SERVICE_PORT == 8003

    def test_service_version(self):
        """Should have version defined"""
        from main import SERVICE_VERSION

        assert SERVICE_VERSION is not None
        assert len(SERVICE_VERSION) > 0

    def test_max_location_age_seconds(self):
        """Should have location age limit configured"""
        from main import MAX_LOCATION_AGE_SECONDS

        assert MAX_LOCATION_AGE_SECONDS > 0
        assert MAX_LOCATION_AGE_SECONDS == 300  # 5 minutes

    def test_nearby_driver_radius(self):
        """Should have nearby driver radius configured"""
        from main import NEARBY_DRIVER_RADIUS_KM

        assert NEARBY_DRIVER_RADIUS_KM > 0
        assert NEARBY_DRIVER_RADIUS_KM == 10


# =============================================================================
# TEST EDGE CASES
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_location_update_extreme_coordinates(self):
        """Should accept extreme valid coordinates"""
        from main import LocationUpdate

        # North pole
        location = LocationUpdate(latitude=90.0, longitude=0.0)
        assert location.latitude == 90.0

        # South pole
        location2 = LocationUpdate(latitude=-90.0, longitude=0.0)
        assert location2.latitude == -90.0

    def test_location_update_with_negative_speed(self):
        """Should accept negative speed values"""
        from main import LocationUpdate

        location = LocationUpdate(
            latitude=0.0,
            longitude=0.0,
            speed=-5.0  # Some GPS systems report negative for reverse
        )

        assert location.speed == -5.0

    def test_driver_profile_update_with_very_old_vehicle(self):
        """Should accept old vehicle years"""
        from main import DriverProfileUpdate

        update = DriverProfileUpdate(vehicle_year=1990)

        assert update.vehicle_year == 1990

    def test_driver_profile_update_with_future_vehicle(self):
        """Should accept future vehicle years (for new models)"""
        from main import DriverProfileUpdate

        update = DriverProfileUpdate(vehicle_year=2026)

        assert update.vehicle_year == 2026

    def test_nearby_drivers_query_with_zero_radius(self):
        """Should accept zero radius (exact location)"""
        from main import NearbyDriversQuery

        query = NearbyDriversQuery(
            latitude=0.0,
            longitude=0.0,
            radius_km=0.0
        )

        assert query.radius_km == 0.0

    def test_nearby_drivers_query_with_large_radius(self):
        """Should accept large radius values"""
        from main import NearbyDriversQuery

        query = NearbyDriversQuery(
            latitude=0.0,
            longitude=0.0,
            radius_km=100.0
        )

        assert query.radius_km == 100.0

    def test_fcm_token_with_very_long_token(self):
        """Should accept very long FCM tokens"""
        from main import FCMTokenUpdate

        long_token = "a" * 500

        token = FCMTokenUpdate(
            fcm_token=long_token,
            device_type="android"
        )

        assert len(token.fcm_token) == 500

    def test_document_upload_with_special_characters_in_url(self):
        """Should accept URLs with special characters"""
        from main import DocumentUpload, DocumentType

        doc = DocumentUpload(
            document_type=DocumentType.INSURANCE,
            document_url="https://example.com/docs/insurance_2024-12-31_(copy).jpg"
        )

        assert "(" in doc.document_url

    def test_location_update_with_zero_accuracy(self):
        """Should accept zero accuracy"""
        from main import LocationUpdate

        location = LocationUpdate(
            latitude=0.0,
            longitude=0.0,
            accuracy=0.0
        )

        assert location.accuracy == 0.0

    def test_driver_profile_update_with_empty_strings(self):
        """Should accept empty strings for optional fields"""
        from main import DriverProfileUpdate

        update = DriverProfileUpdate(
            vehicle_make="",
            vehicle_model=""
        )

        assert update.vehicle_make == ""
