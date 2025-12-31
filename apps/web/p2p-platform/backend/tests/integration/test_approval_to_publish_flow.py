"""
Integration test for the complete vendor approval-to-publish flow.

Tests the entire flow:
1. Vendor registration
2. Document upload
3. Admin approval
4. Automatic publishing to all platforms
5. Visibility in customer apps (iOS, Android, Web)

This test ensures that:
- iOS, Android, and Web customer apps see the same published restaurants
- Approval in ZIP Dashboard immediately publishes to all platforms
- Rejection unpublishes from all platforms
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient


class TestApprovalToPublishFlow:
    """End-to-end test for vendor approval to publishing flow"""

    def test_complete_approval_to_publish_flow(
        self, client: TestClient, db_session, test_admin, admin_auth_headers
    ):
        """
        Complete flow: Register -> Documents -> Approve -> Published on all platforms
        """
        from models import Vendor, VendorStatus, OnboardingPhase

        # Step 1: Create a new vendor (simulating vendor registration)
        vendor = Vendor(
            company_name="Test Integration Restaurant",
            restaurant_name="Integration Test Cafe",
            contact_email=f"integration_test_{datetime.now().timestamp()}@test.com",
            contact_phone="+14155559999",
            street="789 Integration Blvd",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            cuisine_type="American",
            onboarding_status=VendorStatus.PENDING,
            onboarding_phase=OnboardingPhase.NOT_STARTED,
            # Documents already uploaded (simulated) - Boolean flags + URLs
            food_license=True,
            food_license_url="https://storage.example.com/food_license.pdf",
            health_permit=True,
            health_permit_url="https://storage.example.com/health_permit.pdf",
            w9_form=True,
            w9_form_url="https://storage.example.com/w9.pdf",
            insurance=True,
            insurance_url="https://storage.example.com/insurance.pdf",
        )
        db_session.add(vendor)
        db_session.commit()
        db_session.refresh(vendor)

        vendor_id = vendor.id

        # Step 2: Verify vendor is NOT visible on published endpoint yet
        response = client.get("/api/vendors/published")
        assert response.status_code == 200
        data = response.json()
        published_ids = [v["id"] for v in data["restaurants"]]
        assert vendor_id not in published_ids, "Vendor should NOT be published before approval"

        # Step 3: Approve the vendor via admin endpoint
        response = client.patch(
            f"/api/vendors/{vendor_id}/status",
            params={"status": "approved", "skip_document_check": True},
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        approval_data = response.json()

        # Verify approval response
        assert approval_data.get("is_published") == True, "Vendor should be published after approval"
        assert approval_data.get("published_at") is not None, "published_at should be set"
        assert "ios" in (approval_data.get("published_platforms") or ""), "Should be published on iOS"
        assert "android" in (approval_data.get("published_platforms") or ""), "Should be published on Android"
        assert "web" in (approval_data.get("published_platforms") or ""), "Should be published on Web"

        # Step 4: Verify vendor IS visible on published endpoint for ALL platforms
        for platform in ["ios", "android", "web", "all"]:
            response = client.get(f"/api/vendors/published?platform={platform}")
            assert response.status_code == 200
            data = response.json()

            # Check response structure matches what iOS/Android expect
            assert "restaurants" in data, f"Response should have 'restaurants' key for {platform}"
            assert "success" in data, "Response should have 'success' key for iOS"
            assert "total" in data, "Response should have 'total' key for Android"

            published_ids = [v["id"] for v in data["restaurants"]]
            assert vendor_id in published_ids, f"Vendor should be visible on {platform} platform"

            # Verify restaurant format is correct for mobile apps
            vendor_data = next(v for v in data["restaurants"] if v["id"] == vendor_id)
            assert "name" in vendor_data, "Should have 'name' field"
            assert "address" in vendor_data, "Should have 'address' field"
            assert "rating" in vendor_data, "Should have 'rating' field"
            assert "is_open" in vendor_data, "Should have 'is_open' field"
            assert "delivery_time" in vendor_data, "Should have 'delivery_time' field"
            assert "location" in vendor_data, "Should have 'location' object"

    def test_rejection_unpublishes_vendor(
        self, client: TestClient, db_session, test_admin, admin_auth_headers
    ):
        """
        Rejecting an approved vendor should unpublish from all platforms
        """
        from models import Vendor, VendorStatus, OnboardingPhase

        # Create and approve a vendor first
        vendor = Vendor(
            company_name="Rejection Test Restaurant",
            restaurant_name="Rejection Test Cafe",
            contact_email=f"rejection_test_{datetime.now().timestamp()}@test.com",
            contact_phone="+14155558888",
            street="123 Rejection St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            onboarding_status=VendorStatus.APPROVED,
            onboarding_phase=OnboardingPhase.COMPLETED,
            is_published=True,
            published_at=datetime.utcnow(),
            published_platforms='["ios", "android", "web"]',
        )
        db_session.add(vendor)
        db_session.commit()
        db_session.refresh(vendor)
        vendor_id = vendor.id

        # Verify vendor is visible on published endpoint
        response = client.get("/api/vendors/published")
        assert response.status_code == 200
        data = response.json()
        published_ids = [v["id"] for v in data["restaurants"]]
        assert vendor_id in published_ids, "Vendor should be published initially"

        # Reject the vendor
        response = client.patch(
            f"/api/vendors/{vendor_id}/status",
            params={"status": "rejected"},
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        rejection_data = response.json()
        assert rejection_data.get("is_published") == False, "Vendor should be unpublished after rejection"

        # Verify vendor is NOT visible on any platform
        for platform in ["ios", "android", "web", "all"]:
            response = client.get(f"/api/vendors/published?platform={platform}")
            assert response.status_code == 200
            data = response.json()
            published_ids = [v["id"] for v in data["restaurants"]]
            assert vendor_id not in published_ids, f"Rejected vendor should NOT be visible on {platform}"

    def test_platform_specific_filtering(
        self, client: TestClient, db_session, test_admin, admin_auth_headers
    ):
        """
        Test that platform filter correctly filters vendors
        """
        from models import Vendor, VendorStatus, OnboardingPhase

        # Create vendor published only on iOS
        vendor_ios_only = Vendor(
            company_name="iOS Only Restaurant",
            restaurant_name="iOS Exclusive Cafe",
            contact_email=f"ios_only_{datetime.now().timestamp()}@test.com",
            contact_phone="+14155557777",
            street="123 iOS St",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            onboarding_status=VendorStatus.APPROVED,
            onboarding_phase=OnboardingPhase.COMPLETED,
            is_published=True,
            published_at=datetime.utcnow(),
            published_platforms='["ios"]',  # Only iOS
        )
        db_session.add(vendor_ios_only)
        db_session.commit()
        db_session.refresh(vendor_ios_only)
        ios_vendor_id = vendor_ios_only.id

        # Verify visible on iOS
        response = client.get("/api/vendors/published?platform=ios")
        assert response.status_code == 200
        data = response.json()
        published_ids = [v["id"] for v in data["restaurants"]]
        assert ios_vendor_id in published_ids, "iOS-only vendor should be visible on iOS"

        # Verify NOT visible on Android
        response = client.get("/api/vendors/published?platform=android")
        assert response.status_code == 200
        data = response.json()
        published_ids = [v["id"] for v in data["restaurants"]]
        assert ios_vendor_id not in published_ids, "iOS-only vendor should NOT be visible on Android"

        # Verify visible on "all" (no platform filter)
        response = client.get("/api/vendors/published?platform=all")
        assert response.status_code == 200
        data = response.json()
        published_ids = [v["id"] for v in data["restaurants"]]
        assert ios_vendor_id in published_ids, "iOS-only vendor should be visible on 'all' filter"

    def test_response_format_compatibility(self, client: TestClient, db_session):
        """
        Verify response format is compatible with iOS and Android apps
        """
        from models import Vendor, VendorStatus, OnboardingPhase

        # Create a published vendor
        vendor = Vendor(
            company_name="Format Test Restaurant",
            restaurant_name="Format Test Cafe",
            contact_email=f"format_test_{datetime.now().timestamp()}@test.com",
            contact_phone="+14155556666",
            street="456 Format Ave",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            cuisine_type="Italian",
            latitude=37.7749,
            longitude=-122.4194,
            delivery_available=True,
            pickup_available=True,
            average_prep_time=25,
            performance_score=4.7,
            onboarding_status=VendorStatus.APPROVED,
            onboarding_phase=OnboardingPhase.COMPLETED,
            is_published=True,
            published_at=datetime.utcnow(),
            published_platforms='["ios", "android", "web"]',
        )
        db_session.add(vendor)
        db_session.commit()
        db_session.refresh(vendor)
        vendor_id = vendor.id

        # Get published vendors
        response = client.get("/api/vendors/published")
        assert response.status_code == 200
        data = response.json()

        # Verify iOS expected fields
        assert data.get("success") == True, "iOS expects 'success' field"
        assert "count" in data, "iOS expects 'count' field"
        assert "restaurants" in data, "iOS expects 'restaurants' array"

        # Verify Android expected fields
        assert "total" in data, "Android expects 'total' field"
        assert "restaurants" in data, "Android expects 'restaurants' array"

        # Get the vendor from response
        vendor_data = next(v for v in data["restaurants"] if v["id"] == vendor_id)

        # Verify restaurant fields for iOS
        assert vendor_data.get("vendor_id") is not None, "iOS expects 'vendor_id' field"
        assert vendor_data.get("name") is not None, "iOS expects 'name' field"
        assert vendor_data.get("cuisine_type") is not None, "iOS expects 'cuisine_type' field"
        assert vendor_data.get("location") is not None, "iOS expects 'location' object"
        assert vendor_data.get("delivery_available") is not None, "iOS expects 'delivery_available'"
        assert vendor_data.get("pickup_available") is not None, "iOS expects 'pickup_available'"
        assert vendor_data.get("rating") is not None, "iOS expects 'rating' field"

        # Verify restaurant fields for Android
        assert vendor_data.get("address") is not None, "Android expects 'address' field"
        assert vendor_data.get("is_open") is not None, "Android expects 'is_open' field"
        assert vendor_data.get("is_active") is not None, "Android expects 'is_active' field"
        assert vendor_data.get("delivery_time") is not None, "Android expects 'delivery_time' field"
        assert vendor_data.get("delivery_fee") is not None, "Android expects 'delivery_fee' field"

        # Verify location object structure (iOS expects nested object)
        location = vendor_data.get("location")
        assert location.get("latitude") is not None, "Location should have 'latitude'"
        assert location.get("longitude") is not None, "Location should have 'longitude'"


class TestCrossAppConsistency:
    """Test that all customer apps see the same data"""

    def test_ios_android_web_see_same_restaurants(self, client: TestClient, db_session):
        """
        All platforms should see the same set of published restaurants
        when using platform='all'
        """
        from models import Vendor, VendorStatus, OnboardingPhase

        # Create several published vendors
        vendor_ids = []
        for i in range(3):
            vendor = Vendor(
                company_name=f"Consistency Test Restaurant {i}",
                restaurant_name=f"Consistency Cafe {i}",
                contact_email=f"consistency_{i}_{datetime.now().timestamp()}@test.com",
                contact_phone=f"+1415555000{i}",
                street=f"{i}00 Consistency St",
                city="San Francisco",
                state="CA",
                zip_code="94102",
                onboarding_status=VendorStatus.APPROVED,
                onboarding_phase=OnboardingPhase.COMPLETED,
                is_published=True,
                published_at=datetime.utcnow(),
                published_platforms='["ios", "android", "web"]',
            )
            db_session.add(vendor)
            db_session.commit()
            db_session.refresh(vendor)
            vendor_ids.append(vendor.id)

        # Get restaurants for each platform
        ios_response = client.get("/api/vendors/published?platform=ios")
        android_response = client.get("/api/vendors/published?platform=android")
        web_response = client.get("/api/vendors/published?platform=web")

        assert ios_response.status_code == 200
        assert android_response.status_code == 200
        assert web_response.status_code == 200

        ios_ids = set(v["id"] for v in ios_response.json()["restaurants"])
        android_ids = set(v["id"] for v in android_response.json()["restaurants"])
        web_ids = set(v["id"] for v in web_response.json()["restaurants"])

        # All platforms should see the same vendors that are published on all platforms
        for vendor_id in vendor_ids:
            assert vendor_id in ios_ids, f"Vendor {vendor_id} should be visible on iOS"
            assert vendor_id in android_ids, f"Vendor {vendor_id} should be visible on Android"
            assert vendor_id in web_ids, f"Vendor {vendor_id} should be visible on Web"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
