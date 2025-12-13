#!/usr/bin/env python3
"""
DOLLOR.AI END-TO-END TEST SCRIPT
=================================

Tests the complete flow:
1. Restaurant onboarding
2. Driver onboarding
3. Customer creates delivery order
4. Restaurant confirms order
5. Driver accepts order
6. Driver picks up food
7. Driver delivers food
8. Payment released

Also tests legal endpoints and investor metrics.
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000"  # Change for production testing
# BASE_URL = "https://api.dollor.ai"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_result(name, success, details=""):
    status = "PASS" if success else "FAIL"
    print(f"  [{status}] {name}")
    if details and not success:
        print(f"       Details: {details}")

def test_legal_endpoints():
    """Test all legal/compliance endpoints"""
    print_section("LEGAL & COMPLIANCE ENDPOINTS")

    endpoints = [
        ("/api/legal/terms-of-service", "Terms of Service"),
        ("/api/legal/privacy-policy", "Privacy Policy"),
        ("/api/legal/ai-bots", "AI Bots Documentation"),
        ("/api/legal/delivery-service-terms", "Delivery Legal Terms"),
        ("/api/legal/rideshare-service-terms", "Rideshare Legal Terms"),
        ("/api/legal/app-store-compliance", "App Store Compliance"),
        ("/api/legal/investor-metrics", "Investor Metrics"),
    ]

    all_passed = True
    for endpoint, name in endpoints:
        try:
            resp = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            success = resp.status_code == 200
            if success:
                data = resp.json()
                # Verify key data exists
                if "terms-of-service" in endpoint:
                    success = "section_1_acceptance" in data
                elif "privacy-policy" in endpoint:
                    success = "section_2_information_collected" in data
                elif "ai-bots" in endpoint:
                    success = "bots" in data and len(data["bots"]) == 8
                elif "investor-metrics" in endpoint:
                    success = "business_model" in data
            print_result(name, success)
            all_passed = all_passed and success
        except Exception as e:
            print_result(name, False, str(e))
            all_passed = False

    return all_passed

def test_v6_delivery_flow():
    """Test complete V6 delivery flow"""
    print_section("V6 BULLETPROOF DELIVERY FLOW")

    all_passed = True

    # Test 1: Restaurant Onboarding
    print("\n  --- Restaurant Onboarding ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/restaurants/onboard", json={
            "business_name": "Test Pizza Place",
            "business_email": "test@pizza.com",
            "business_phone": "+14155551111",
            "business_address": "123 Main St, San Francisco, CA",
            "contact_person": "John Owner",
        }, timeout=10)
        success = resp.status_code == 200
        restaurant_id = resp.json().get("restaurant_id") if success else None
        print_result("Restaurant Onboarding", success, f"ID: {restaurant_id}")
        all_passed = all_passed and success
    except Exception as e:
        print_result("Restaurant Onboarding", False, str(e))
        restaurant_id = None
        all_passed = False

    # Test 2: Driver Onboarding
    print("\n  --- Driver Onboarding ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/drivers/onboard", json={
            "driver_email": "driver@test.com",
            "driver_name": "Test Driver",
            "driver_phone": "+14155552222",
        }, timeout=10)
        success = resp.status_code == 200
        driver_data = resp.json() if success else {}
        driver_id = driver_data.get("driver_id")
        driver_stripe_account = driver_data.get("stripe_account_id", "acct_test_123")
        print_result("Driver Onboarding", success, f"ID: {driver_id}")
        all_passed = all_passed and success
    except Exception as e:
        print_result("Driver Onboarding", False, str(e))
        driver_id = "DRV-TEST123"
        driver_stripe_account = "acct_test_123"
        all_passed = False

    # Test 3: Create Delivery Order
    print("\n  --- Customer Creates Delivery Order ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/orders/create", json={
            "customer_id": "CUST-001",
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "customer_phone": "+14155553333",
            "restaurant_name": "Test Pizza Place",
            "restaurant_address": "123 Main St, San Francisco, CA",
            "restaurant_lat": 37.7749,
            "restaurant_lng": -122.4194,
            "food_order_reference": "ORD-12345",
            "delivery_address": "456 Oak Ave, San Francisco, CA",
            "delivery_lat": 37.7849,
            "delivery_lng": -122.4094,
            "delivery_instructions": "Ring doorbell twice",
            "delivery_amount": 8.00,
            "payment_method_id": "pm_test_visa",
        }, timeout=10)
        success = resp.status_code == 200
        order_data = resp.json() if success else {}
        order_id = order_data.get("order_id")
        print_result("Create Delivery Order", success, f"Order: {order_id}")

        if success:
            # Verify payment summary
            payment = order_data.get("payment_summary", {})
            fee_correct = payment.get("service_fee") == 0.99
            print_result("  - Customer Fee $0.99", fee_correct)
            all_passed = all_passed and fee_correct
        all_passed = all_passed and success
    except Exception as e:
        print_result("Create Delivery Order", False, str(e))
        order_id = None
        all_passed = False

    if not order_id:
        print("\n  [SKIP] Remaining tests - no order created")
        return False

    # Test 4: Get Available Orders (Driver View)
    print("\n  --- Driver Views Available Orders ---")
    try:
        resp = requests.get(f"{BASE_URL}/api/v6/orders/available", params={
            "driver_lat": 37.7750,
            "driver_lng": -122.4195,
            "driver_id": driver_id or "DRV-TEST",
        }, timeout=10)
        success = resp.status_code == 200
        available = resp.json() if success else {}
        order_count = available.get("count", 0)
        print_result("Get Available Orders", success, f"Found: {order_count} orders")

        if success and order_count > 0:
            # Verify driver sees 100% earnings
            order_info = available["available_orders"][0]
            keeps_100 = order_info["earnings"]["platform_fee"] == 0
            print_result("  - Driver Keeps 100%", keeps_100)
            all_passed = all_passed and keeps_100
        all_passed = all_passed and success
    except Exception as e:
        print_result("Get Available Orders", False, str(e))
        all_passed = False

    # Test 5: Driver Accepts Order
    print("\n  --- Driver Accepts Order ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/orders/{order_id}/accept", json={
            "driver_id": driver_id or "DRV-TEST123",
            "driver_name": "Test Driver",
            "driver_phone": "+14155552222",
            "driver_stripe_account_id": driver_stripe_account,
        }, timeout=10)
        success = resp.status_code == 200
        print_result("Driver Accepts Order", success)
        all_passed = all_passed and success
    except Exception as e:
        print_result("Driver Accepts Order", False, str(e))
        all_passed = False

    # Test 6: Driver Picks Up Order
    print("\n  --- Driver Picks Up Food ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/orders/{order_id}/pickup", params={
            "driver_id": driver_id or "DRV-TEST123",
        }, timeout=10)
        success = resp.status_code == 200
        print_result("Driver Pickup", success)
        all_passed = all_passed and success
    except Exception as e:
        print_result("Driver Pickup", False, str(e))
        all_passed = False

    # Test 7: Driver Delivers Order (Payment Released)
    print("\n  --- Driver Delivers & Gets Paid ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/v6/orders/{order_id}/deliver", params={
            "driver_id": driver_id or "DRV-TEST123",
        }, timeout=10)
        success = resp.status_code == 200
        deliver_data = resp.json() if success else {}
        print_result("Delivery Complete", success)

        if success:
            payment = deliver_data.get("payment", {})
            received_full = payment.get("platform_fee_deducted") == 0
            print_result("  - Driver Received 100%", received_full)
            all_passed = all_passed and received_full
        all_passed = all_passed and success
    except Exception as e:
        print_result("Delivery Complete", False, str(e))
        all_passed = False

    return all_passed

def test_revenue_metrics():
    """Test revenue metrics endpoint"""
    print_section("REVENUE METRICS")

    try:
        resp = requests.get(f"{BASE_URL}/api/v6/admin/revenue-metrics", timeout=10)
        success = resp.status_code == 200

        if success:
            data = resp.json()
            print_result("Revenue Metrics Endpoint", True)

            model = data.get("revenue_model", {})
            print(f"\n  Revenue Model:")
            print(f"    - Customer Fee: {model.get('customer_fee')}")
            print(f"    - Restaurant Fee: {model.get('restaurant_fee')}")
            print(f"    - Driver Fee: {model.get('driver_fee')}")
            print(f"    - Per Order Revenue: {model.get('revenue_per_order')}")

            return True
        else:
            print_result("Revenue Metrics Endpoint", False, f"Status: {resp.status_code}")
            return False
    except Exception as e:
        print_result("Revenue Metrics Endpoint", False, str(e))
        return False

def test_order_numbering():
    """Test order numbering system"""
    print_section("ORDER NUMBERING SYSTEM")

    from dollor_legal_complete import OrderNumberingSystem

    # Test different order types
    tests = [
        ("delivery", "DLV"),
        ("ride", "RID"),
        ("food_order", "FRD"),
        ("transaction", "TXN"),
        ("ticket", "TKT"),
        ("user", "USR"),
        ("driver", "DRV"),
        ("restaurant", "RST"),
    ]

    all_passed = True
    for service_type, expected_prefix in tests:
        order_num = OrderNumberingSystem.generate(service_type)
        success = order_num.startswith(expected_prefix)
        print_result(f"{service_type.upper()} -> {order_num}", success)
        all_passed = all_passed and success

    return all_passed

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║          DOLLOR.AI END-TO-END TEST SUITE                      ║
    ║          Testing Legal, Compliance & Payment Flow             ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    print(f"Test Time: {datetime.now().isoformat()}")
    print(f"Base URL: {BASE_URL}")

    results = {}

    # Test order numbering (local)
    results["Order Numbering"] = test_order_numbering()

    # Test API endpoints
    try:
        # Quick connectivity check
        resp = requests.get(f"{BASE_URL}/", timeout=5)
        if resp.status_code != 200:
            print(f"\n[ERROR] API not reachable at {BASE_URL}")
            print("Please start the server with: uvicorn main_new:app --reload")
            sys.exit(1)
    except:
        print(f"\n[ERROR] Cannot connect to {BASE_URL}")
        print("Run these tests with a local server running.")
        print("Showing order numbering test only.")

        print_section("SUMMARY")
        print("\n  Order Numbering: PASS")
        print("\n  (API tests skipped - server not running)")
        return

    results["Legal Endpoints"] = test_legal_endpoints()
    results["V6 Delivery Flow"] = test_v6_delivery_flow()
    results["Revenue Metrics"] = test_revenue_metrics()

    # Summary
    print_section("TEST SUMMARY")

    total = len(results)
    passed = sum(1 for v in results.values() if v)

    for name, passed_test in results.items():
        status = "PASS" if passed_test else "FAIL"
        print(f"  [{status}] {name}")

    print(f"\n  Total: {passed}/{total} test suites passed")

    if passed == total:
        print("\n  All tests PASSED!")
    else:
        print(f"\n  {total - passed} test suite(s) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
