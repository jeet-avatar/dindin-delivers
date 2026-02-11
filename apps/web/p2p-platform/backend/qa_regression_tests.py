#!/usr/bin/env python3
"""
QA Regression Test Suite - Run before every deployment
Ensures critical API endpoints don't break during changes.

Usage:
    python qa_regression_tests.py [--staging|--production]

Add to CI/CD pipeline to run automatically before deploy.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
STAGING_URL = "https://d3kuu45w6kl8hr.cloudfront.net"
PRODUCTION_URL = "https://api.dollor.ai"

# Demo account IDs
DEMO_CUSTOMER_ID = 74
DEMO_DRIVER_ID = 48
DEMO_VENDOR_ID = 40


class QATestSuite:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.passed = 0
        self.failed = 0
        self.errors = []

    def test(self, name: str, endpoint: str, method: str = "GET",
             expected_status: int = 200, expected_keys: list = None,
             data: dict = None):
        """Run a single test"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, timeout=10)

            # Check status code
            if response.status_code != expected_status:
                self.failed += 1
                self.errors.append(f"❌ {name}: Expected {expected_status}, got {response.status_code}")
                return False

            # Check expected keys in response
            if expected_keys:
                try:
                    json_data = response.json()
                    # Handle nested 'orders' or direct response
                    check_data = json_data.get('orders', [json_data])[0] if isinstance(json_data, dict) and 'orders' in json_data else json_data

                    missing_keys = [k for k in expected_keys if k not in check_data]
                    if missing_keys:
                        self.failed += 1
                        self.errors.append(f"❌ {name}: Missing keys: {missing_keys}")
                        return False
                except:
                    pass

            self.passed += 1
            print(f"✅ {name}")
            return True

        except Exception as e:
            self.failed += 1
            self.errors.append(f"❌ {name}: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all regression tests"""
        print(f"\n{'='*60}")
        print(f"QA REGRESSION TESTS - {self.base_url}")
        print(f"Started: {datetime.now().isoformat()}")
        print(f"{'='*60}\n")

        # ==================== HEALTH CHECK ====================
        print("--- Health Check ---")
        self.test("API Health", "/health", expected_keys=["status", "version", "database"])

        # ==================== VENDOR/RESTAURANT APIs ====================
        print("\n--- Restaurant App APIs ---")
        self.test(
            "Vendor List",
            "/api/vendors",
            expected_status=200
        )
        self.test(
            "Vendor Orders",
            f"/api/erp/orders/vendor/{DEMO_VENDOR_ID}",
            expected_keys=["id", "order_number", "status", "customer_id", "vendor_id"]
        )
        self.test(
            "Vendor Orders (iOS alias)",
            f"/erp/orders/vendor/{DEMO_VENDOR_ID}",
            expected_keys=["id", "order_number"]
        )

        # Critical: Verify items format for iOS compatibility (Fix 2026-02-05)
        self.test_vendor_items_format()

        # ==================== DRIVER APIs ====================
        print("\n--- Driver App APIs ---")
        self.test(
            "Driver Dashboard",
            f"/api/v5/driver/{DEMO_DRIVER_ID}/dashboard",
            expected_keys=["driver_id", "today", "this_week", "ratings"]
        )
        self.test(
            "Driver Active Orders",
            f"/api/erp/orders/driver/{DEMO_DRIVER_ID}/active",
            expected_status=200
        )
        self.test(
            "Available Orders for Delivery",
            "/api/erp/orders/available-for-delivery",
            expected_status=200
        )
        self.test(
            "Driver Documents",
            f"/api/drivers/{DEMO_DRIVER_ID}/documents",
            expected_status=200
        )

        # ==================== CUSTOMER APIs ====================
        print("\n--- Customer App APIs ---")
        self.test(
            "Customer Orders (no auth - should fail)",
            "/api/customer/orders",
            expected_status=401  # Should require auth
        )

        # ==================== ORDER TRACKING ====================
        print("\n--- Order Tracking APIs ---")
        # Create a demo order first
        create_response = requests.post(f"{self.base_url}/api/demo/create-order", json={})
        if create_response.status_code == 200:
            order_id = create_response.json().get('order', {}).get('id')
            if order_id:
                self.test(
                    "Order Full Tracking",
                    f"/api/erp/orders/{order_id}/full-tracking",
                    expected_keys=["order", "restaurant", "timeline"]
                )
                self.test(
                    "Debug Order",
                    f"/api/debug/order/{order_id}",
                    expected_keys=["id", "order_number", "customer_id", "vendor_id"]
                )

        # ==================== DEMO SETUP ====================
        print("\n--- Demo Account APIs ---")
        self.test(
            "Demo Setup",
            "/api/demo/setup",
            method="POST",
            expected_status=200,
            expected_keys=["success", "credentials"]
        )

        # ==================== ORDER LIFECYCLE ====================
        print("\n--- Order Lifecycle APIs ---")
        self.test(
            "Create Demo Order",
            "/api/demo/create-order",
            method="POST",
            expected_status=200,
            expected_keys=["success", "order"]
        )

        # ==================== RESULTS ====================
        print(f"\n{'='*60}")
        print(f"RESULTS: {self.passed} passed, {self.failed} failed")
        print(f"{'='*60}")

        if self.errors:
            print("\nFailed Tests:")
            for error in self.errors:
                print(f"  {error}")

        return self.failed == 0


def main():
    # Determine environment
    env = "staging"
    if len(sys.argv) > 1:
        if "--production" in sys.argv:
            env = "production"
        elif "--staging" in sys.argv:
            env = "staging"

    base_url = PRODUCTION_URL if env == "production" else STAGING_URL
    print(f"Running tests against: {env.upper()}")

    # Run tests
    suite = QATestSuite(base_url)
    success = suite.run_all_tests()

    # Exit with appropriate code for CI/CD
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
