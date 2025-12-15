#!/usr/bin/env python3
"""
RIDESHARE END-TO-END TEST
=========================
Tests the complete rideshare flow from ordering a ride to driver getting paid.

Flow being tested:
1. Customer requests a ride
2. Driver views available rides
3. Driver accepts the ride
4. Driver picks up customer
5. Driver completes the ride
6. Customer pays for the ride
7. Driver receives payout

Run against production: python3 test_rideshare_e2e.py --api https://api.dollor.ai
Run locally: python3 test_rideshare_e2e.py --api http://localhost:8000
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
API_BASE = "https://api.dollor.ai"

# Test data
TEST_CUSTOMER = {
    "name": "John E2E Test",
    "email": "john.e2e.test@example.com",
    "phone": "+14155551234"
}

TEST_DRIVER = {
    "id": 1,  # Using existing driver ID
    "name": "Test Driver E2E",
    "phone": "+14155559999",
    "lat": 37.7749,
    "lng": -122.4194
}

TEST_PICKUP = {
    "street": "1 Market Street",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "lat": 37.7939,
    "lng": -122.3956
}

TEST_DROPOFF = {
    "street": "550 Geary Street",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "lat": 37.7868,
    "lng": -122.4138
}

# Results tracking
results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}


def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step_num, title):
    print(f"\n[STEP {step_num}] {title}")
    print("-" * 40)


def print_result(success, message, data=None):
    global results
    if success:
        print(f"  ✅ {message}")
        results["passed"] += 1
    else:
        print(f"  ❌ {message}")
        results["failed"] += 1
        results["errors"].append(message)
    if data:
        print(f"     Data: {json.dumps(data, default=str)[:200]}...")


def test_health_check():
    """Test 0: Verify API is healthy"""
    print_step(0, "Health Check")
    try:
        resp = requests.get(f"{API_BASE}/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "healthy":
                print_result(True, f"API is healthy - {data.get('version', 'unknown')}")
                return True
            else:
                print_result(False, f"API unhealthy: {data}")
                return False
        else:
            print_result(False, f"Health check failed: HTTP {resp.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Health check error: {e}")
        return False


def test_request_ride():
    """Test 1: Customer requests a ride"""
    print_step(1, "Customer Requests Ride")

    payload = {
        "customer_name": TEST_CUSTOMER["name"],
        "customer_email": TEST_CUSTOMER["email"],
        "customer_phone": TEST_CUSTOMER["phone"],
        "pickup_address": TEST_PICKUP,
        "dropoff_address": TEST_DROPOFF,
        "notes": "E2E Test - please ignore",
        "tip": 5.00
    }

    try:
        resp = requests.post(
            f"{API_BASE}/api/erp/rides/request",
            json=payload,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Ride created: {data.get('ride_number')}")
                print(f"     Ride ID: {data.get('ride_id')}")
                print(f"     Total Fare: ${data.get('total_fare', 0):.2f}")
                print(f"     Driver Earnings: ${data.get('driver_earnings', 0):.2f}")
                print(f"     Platform Fee: ${data.get('platform_fee', 0):.2f}")
                print(f"     Tax: ${data.get('tax_amount', 0):.2f}")
                return data
            else:
                print_result(False, f"Ride request failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_get_available_rides():
    """Test 2: Driver views available rides"""
    print_step(2, "Driver Views Available Rides")

    try:
        params = {
            "driver_lat": TEST_DRIVER["lat"],
            "driver_lng": TEST_DRIVER["lng"],
            "max_distance": 50
        }

        resp = requests.get(
            f"{API_BASE}/api/erp/rides/available",
            params=params,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            print_result(True, f"Found {len(data)} available rides")
            if data:
                print(f"     First ride: {data[0].get('ride_number', 'N/A')} - ${data[0].get('driver_earnings', 0):.2f}")
            return data
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_driver_accept_ride(ride_id):
    """Test 3: Driver accepts the ride"""
    print_step(3, "Driver Accepts Ride")

    try:
        # Send as JSON body (not query params)
        body = {
            "driver_id": TEST_DRIVER["id"],
            "driver_name": TEST_DRIVER["name"],
            "driver_phone": TEST_DRIVER["phone"],
            "driver_lat": TEST_DRIVER["lat"],
            "driver_lng": TEST_DRIVER["lng"]
        }

        resp = requests.post(
            f"{API_BASE}/api/erp/rides/{ride_id}/accept",
            json=body,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Driver accepted ride {ride_id}")
                print(f"     Earnings: ${data.get('earnings', 0):.2f}")
                return data
            else:
                print_result(False, f"Accept failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_track_ride(ride_id):
    """Test 4: Track the ride"""
    print_step(4, "Track Ride")

    try:
        resp = requests.get(
            f"{API_BASE}/api/erp/rides/{ride_id}/track",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Tracking ride: {data.get('status')}")
                print(f"     Driver: {data.get('driver_name', 'N/A')}")
                print(f"     ETA: {data.get('estimated_arrival', 'N/A')}")
                return data
            else:
                print_result(False, f"Track failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_update_driver_location(ride_id):
    """Test 5: Update driver location"""
    print_step(5, "Update Driver Location")

    try:
        # Simulate driver moving towards pickup
        new_lat = TEST_PICKUP["lat"] - 0.001  # Closer to pickup
        new_lng = TEST_PICKUP["lng"] + 0.001

        params = {
            "driver_lat": new_lat,
            "driver_lng": new_lng
        }

        resp = requests.put(
            f"{API_BASE}/api/erp/rides/{ride_id}/location",
            params=params,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Location updated: ({new_lat:.4f}, {new_lng:.4f})")
                return data
            else:
                print_result(False, f"Location update failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_pickup_customer(ride_id):
    """Test 6: Driver picks up customer"""
    print_step(6, "Driver Picks Up Customer")

    try:
        resp = requests.put(
            f"{API_BASE}/api/erp/rides/{ride_id}/pickup",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Customer picked up - Status: {data.get('status')}")
                return data
            else:
                print_result(False, f"Pickup failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_complete_ride(ride_id):
    """Test 7: Driver completes the ride"""
    print_step(7, "Driver Completes Ride")

    try:
        resp = requests.put(
            f"{API_BASE}/api/erp/rides/{ride_id}/complete",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Ride completed! Payout: ${data.get('driver_payout', 0):.2f}")
                print(f"     Ride Number: {data.get('ride_number')}")
                return data
            else:
                print_result(False, f"Complete failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_create_payment_intent(ride_id, amount):
    """Test 8: Create payment intent for the ride"""
    print_step(8, "Create Payment Intent")

    try:
        params = {"amount": amount}

        resp = requests.post(
            f"{API_BASE}/api/erp/rides/{ride_id}/payment-intent",
            params=params,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Payment intent created")
                print(f"     Intent ID: {data.get('payment_intent_id', 'N/A')[:30]}...")
                print(f"     Amount: ${data.get('amount', 0):.2f}")
                return data
            else:
                print_result(False, f"Payment intent failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_confirm_payment(ride_id, payment_intent_id):
    """Test 9: Confirm payment"""
    print_step(9, "Confirm Payment")

    try:
        params = {"payment_intent_id": payment_intent_id}

        resp = requests.post(
            f"{API_BASE}/api/erp/rides/{ride_id}/confirm-payment",
            params=params,
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Payment confirmed! ${data.get('paid_amount', 0):.2f}")
                print(f"     Message: {data.get('message', 'N/A')}")
                return data
            else:
                print_result(False, f"Payment confirm failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_get_ride_journal(ride_id):
    """Test 10: Get journal entries (accounting)"""
    print_step(10, "Get Journal Entries (Accounting)")

    try:
        resp = requests.get(
            f"{API_BASE}/api/erp/rides/{ride_id}/journal",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            print_result(True, f"Journal entries retrieved")
            if data.get("fare_breakdown"):
                fb = data["fare_breakdown"]
                print(f"     Total Fare: ${fb.get('total_fare', 0):.2f}")
                print(f"     Driver Earnings: ${fb.get('driver_earnings', 0):.2f}")
                print(f"     Platform Fee: ${fb.get('platform_fee', 0):.2f}")
            return data
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_get_rideshare_stats():
    """Test 11: Get rideshare statistics"""
    print_step(11, "Get Rideshare Statistics")

    try:
        resp = requests.get(
            f"{API_BASE}/api/erp/rides/stats/summary",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            print_result(True, f"Stats retrieved")
            print(f"     Total Rides: {data.get('total_rides', 0)}")
            print(f"     Completed: {data.get('completed_rides', 0)}")
            print(f"     Total Revenue: ${data.get('total_revenue', 0):.2f}")
            print(f"     Platform Revenue: ${data.get('platform_revenue', 0):.2f}")
            print(f"     Driver Payouts: ${data.get('driver_payouts', 0):.2f}")
            return data
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Request error: {e}")
        return None


def test_driver_payout():
    """Test 12: Check driver payout endpoint"""
    print_step(12, "Check Driver Payout System")

    # First, check if there's a driver payout endpoint
    try:
        # Try to get driver earnings
        resp = requests.get(
            f"{API_BASE}/api/drivers/{TEST_DRIVER['id']}/earnings",
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            print_result(True, f"Driver earnings endpoint works")
            print(f"     Data: {json.dumps(data, default=str)[:150]}...")
            return data
        elif resp.status_code == 404:
            print_result(False, "Driver earnings endpoint not found (/api/drivers/{id}/earnings)")
            return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Driver earnings endpoint error: {e}")
        return None


def test_cancel_flow():
    """Test cancellation flow"""
    print_step("C", "Test Cancellation Flow")

    # First create a ride
    payload = {
        "customer_name": "Cancel Test User",
        "customer_email": "cancel.test@example.com",
        "customer_phone": "+14155550000",
        "pickup_address": TEST_PICKUP,
        "dropoff_address": TEST_DROPOFF,
        "notes": "E2E Cancel Test",
        "tip": 0.0
    }

    try:
        # Create ride
        resp = requests.post(f"{API_BASE}/api/erp/rides/request", json=payload, timeout=30)
        if resp.status_code != 200:
            print_result(False, f"Could not create test ride for cancellation")
            return None

        ride_data = resp.json()
        ride_id = ride_data.get("ride_id")

        # Cancel it
        resp = requests.post(
            f"{API_BASE}/api/erp/rides/{ride_id}/cancel",
            params={"reason": "E2E test cancellation"},
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                print_result(True, f"Cancellation works!")
                print(f"     Fee: ${data.get('cancellation_fee', 0):.2f}")
                print(f"     Refund: ${data.get('refund_amount', 0):.2f}")
                return data
            else:
                print_result(False, f"Cancel failed: {data}")
                return None
        else:
            print_result(False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            return None

    except Exception as e:
        print_result(False, f"Cancel test error: {e}")
        return None


def run_all_tests():
    """Run the complete end-to-end test"""

    print_header("RIDESHARE END-TO-END TEST")
    print(f"API: {API_BASE}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Test 0: Health check
    if not test_health_check():
        print("\n⛔ API is not healthy. Aborting tests.")
        return

    # Test 1: Request a ride
    ride_data = test_request_ride()
    if not ride_data:
        print("\n⛔ Could not create ride. Aborting tests.")
        return

    ride_id = ride_data.get("ride_id")
    total_fare = ride_data.get("total_fare", 0)

    # Test 2: Get available rides
    test_get_available_rides()

    # Test 3: Driver accepts ride
    accept_data = test_driver_accept_ride(ride_id)

    # Test 4: Track ride
    test_track_ride(ride_id)

    # Test 5: Update driver location
    test_update_driver_location(ride_id)

    # Test 6: Pickup customer
    test_pickup_customer(ride_id)

    # Test 7: Complete ride
    complete_data = test_complete_ride(ride_id)

    # Test 8: Create payment intent
    payment_data = test_create_payment_intent(ride_id, total_fare)

    # Test 9: Confirm payment
    if payment_data:
        test_confirm_payment(ride_id, payment_data.get("payment_intent_id"))
    else:
        print_step(9, "Confirm Payment")
        print_result(False, "Skipped - no payment intent")

    # Test 10: Get journal entries
    test_get_ride_journal(ride_id)

    # Test 11: Get stats
    test_get_rideshare_stats()

    # Test 12: Driver payout
    test_driver_payout()

    # Test C: Cancellation flow
    test_cancel_flow()

    # Print summary
    print_header("TEST SUMMARY")
    print(f"  Passed: {results['passed']}")
    print(f"  Failed: {results['failed']}")
    print(f"  Total:  {results['passed'] + results['failed']}")

    if results['errors']:
        print("\n  FAILURES:")
        for error in results['errors']:
            print(f"    ❌ {error}")

    if results['failed'] == 0:
        print("\n  🎉 ALL TESTS PASSED!")
    else:
        print(f"\n  ⚠️  {results['failed']} test(s) failed")

    print("\n" + "=" * 60)
    return results


if __name__ == "__main__":
    # Allow API override from command line
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--api" and i + 1 < len(sys.argv):
                API_BASE = sys.argv[i + 1]

    run_all_tests()
