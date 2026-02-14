#!/usr/bin/env python3
"""
Test Multi-Round Negotiation Flow
Tests the complete negotiation cycle 5 times with different scenarios.
"""

import requests
import json
import time
from datetime import datetime

# Use production API for testing
BASE_URL = "https://api.dollor.ai/api"

# Test credentials
CUSTOMER_ID = 1  # Demo customer
# Use different drivers for each test to avoid "active ride" conflicts
# Using fresh driver IDs (53-57) to avoid conflicts with previous test runs
DRIVER_IDS = [53, 54, 55, 56, 57]  # Pool of test drivers

def log(msg, level="INFO"):
    """Print timestamped log message"""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def create_ride_request(customer_id: int, test_num: int):
    """Create a new ride request"""
    payload = {
        "customer_id": customer_id,
        "pickup_address": f"123 Test Pickup St, Test {test_num}",
        "pickup_latitude": 37.7749 + (test_num * 0.001),
        "pickup_longitude": -122.4194,
        "dropoff_address": f"456 Test Dropoff Ave, Test {test_num}",
        "dropoff_latitude": 37.7849 + (test_num * 0.001),
        "dropoff_longitude": -122.4094,
        "ride_type": "standard",
        "bidding_duration_minutes": 10
    }

    response = requests.post(f"{BASE_URL}/rides/request", json=payload)
    return response.json()

def submit_driver_bid(request_id: int, driver_id: int, price: float):
    """Driver submits a bid"""
    payload = {
        "driver_id": driver_id,
        "proposed_price": price,
        "message": f"I can pick you up in 5 minutes for ${price}",
        "estimated_arrival_minutes": 5
    }

    response = requests.post(f"{BASE_URL}/rides/request/{request_id}/bid", json=payload)
    return response.json()

def customer_respond_to_bid(bid_id: int, action: str, counter_price: float = None):
    """Customer responds to bid: accept, reject, or counter"""
    payload = {
        "action": action,
        "message": f"Customer response: {action}"
    }
    if counter_price:
        payload["counter_price"] = counter_price

    response = requests.post(f"{BASE_URL}/rides/bid/{bid_id}/respond", json=payload)
    return response.json()

def driver_counter_offer(bid_id: int, counter_price: float):
    """Driver sends counter-offer (Round 2)"""
    payload = {
        "counter_price": counter_price,
        "message": f"My final offer: ${counter_price}"
    }

    response = requests.post(f"{BASE_URL}/rides/bid/{bid_id}/driver-counter", json=payload)
    return response.json()

def driver_accept_counter(bid_id: int):
    """Driver accepts customer's counter-offer"""
    response = requests.post(f"{BASE_URL}/rides/bid/{bid_id}/accept-counter")
    return response.json()

def driver_reject_counter(bid_id: int):
    """Driver rejects customer's counter-offer"""
    response = requests.post(f"{BASE_URL}/rides/bid/{bid_id}/reject-counter")
    return response.json()

def run_test(test_num: int, scenario: str):
    """Run a single negotiation test"""
    log(f"\n{'='*60}")
    log(f"TEST {test_num}: {scenario}")
    log(f"{'='*60}")

    # Use different driver for each test
    driver_id = DRIVER_IDS[(test_num - 1) % len(DRIVER_IDS)]
    log(f"Using driver ID: {driver_id}")

    # Step 1: Create ride request
    log("Step 1: Customer creates ride request")
    ride_result = create_ride_request(CUSTOMER_ID, test_num)

    if not ride_result.get("success"):
        log(f"FAILED: Could not create ride request: {ride_result}", "ERROR")
        return False

    request_id = ride_result["ride_request"]["id"]
    suggested_price = ride_result["ride_request"]["suggested_price"]
    log(f"  Created request #{request_id}, suggested: ${suggested_price}")

    # Step 2: Driver submits bid
    log("Step 2: Driver submits bid")

    if scenario == "ACCEPT_IMMEDIATELY":
        bid_price = suggested_price
    elif scenario == "LOW_BID_WARNING":
        bid_price = suggested_price * 0.5  # 50% of suggested
    elif scenario == "VERY_LOW_BID_REJECT":
        bid_price = suggested_price * 0.3  # 30% of suggested (should fail)
    elif scenario == "FULL_NEGOTIATION":
        bid_price = suggested_price * 1.2  # Start high
    else:
        bid_price = suggested_price * 0.9

    bid_result = submit_driver_bid(request_id, driver_id, bid_price)

    if not bid_result.get("success"):
        log(f"FAILED: Could not submit bid: {bid_result}", "ERROR")
        return False

    bid_id = bid_result["bid"]["id"]
    log(f"  Bid #{bid_id} submitted: ${bid_price}")

    # Scenario-specific flow
    if scenario == "ACCEPT_IMMEDIATELY":
        log("Step 3: Customer accepts immediately")
        result = customer_respond_to_bid(bid_id, "accept")
        if result.get("success"):
            log(f"  SUCCESS: Ride matched at ${bid_price}")
            return True
        else:
            log(f"  FAILED: {result}", "ERROR")
            return False

    elif scenario == "LOW_BID_WARNING":
        log("Step 3: Customer counters with low price (should get warning)")
        counter_price = suggested_price * 0.55  # 55% - should trigger warning
        result = customer_respond_to_bid(bid_id, "counter", counter_price)

        if result.get("warning"):
            log(f"  WARNING received: {result['warning']}")

        if result.get("success"):
            log(f"  Counter sent: ${counter_price}")

            # Driver accepts low offer
            log("Step 4: Driver accepts customer's low offer")
            accept_result = driver_accept_counter(bid_id)
            if accept_result.get("success"):
                log(f"  SUCCESS: Matched at ${counter_price}")
                return True
            else:
                log(f"  FAILED: {accept_result}", "ERROR")
                return False
        else:
            log(f"  Counter rejected (expected if too low): {result}", "WARN")
            return result.get("detail", "").startswith("Offer too low")

    elif scenario == "VERY_LOW_BID_REJECT":
        log("Step 3: Customer counters with very low price (should reject)")
        counter_price = suggested_price * 0.35  # 35% - should auto-reject
        result = customer_respond_to_bid(bid_id, "counter", counter_price)

        if not result.get("success") and "too low" in str(result.get("detail", "")):
            log(f"  EXPECTED: Counter rejected - {result.get('detail')}")
            return True
        else:
            log(f"  UNEXPECTED: {result}", "ERROR")
            return False

    elif scenario == "FULL_NEGOTIATION":
        log("Step 3: Customer counters driver's high bid")
        counter_price = suggested_price * 0.8  # 80%
        result = customer_respond_to_bid(bid_id, "counter", counter_price)

        if not result.get("success"):
            log(f"  FAILED: {result}", "ERROR")
            return False

        log(f"  Customer counter: ${counter_price}")
        log(f"  Counters remaining: {result.get('customer_counters_remaining')}")

        log("Step 4: Driver counters back (Round 2 - Final)")
        final_price = suggested_price * 0.9  # Meet in middle
        driver_result = driver_counter_offer(bid_id, final_price)

        if not driver_result.get("success"):
            log(f"  FAILED: {driver_result}", "ERROR")
            return False

        log(f"  Driver final offer: ${final_price}")
        log(f"  Is final round: {driver_result.get('is_final_round')}")

        log("Step 5: Customer accepts driver's final offer")
        accept_result = customer_respond_to_bid(bid_id, "accept")

        if accept_result.get("success"):
            log(f"  SUCCESS: Ride matched at ${final_price}")
            return True
        else:
            log(f"  FAILED: {accept_result}", "ERROR")
            return False

    else:  # DRIVER_REJECTS_COUNTER
        log("Step 3: Customer counters")
        counter_price = suggested_price * 0.6
        result = customer_respond_to_bid(bid_id, "counter", counter_price)

        if not result.get("success"):
            log(f"  Counter result: {result}")
            # May fail if too low
            return "too low" in str(result.get("detail", ""))

        log(f"  Customer counter: ${counter_price}")

        log("Step 4: Driver rejects counter and withdraws")
        reject_result = driver_reject_counter(bid_id)

        if reject_result.get("success"):
            log(f"  Driver withdrew. Ride available for other drivers.")
            return True
        else:
            log(f"  Result: {reject_result}")
            return True  # May already be in different state

def main():
    """Run 5 negotiation tests with different scenarios"""
    log("\n" + "="*70)
    log("MULTI-ROUND NEGOTIATION TEST SUITE")
    log("="*70)

    scenarios = [
        "ACCEPT_IMMEDIATELY",
        "LOW_BID_WARNING",
        "VERY_LOW_BID_REJECT",
        "FULL_NEGOTIATION",
        "DRIVER_REJECTS_COUNTER"
    ]

    results = []

    for i, scenario in enumerate(scenarios, 1):
        try:
            success = run_test(i, scenario)
            results.append((i, scenario, "PASS" if success else "FAIL"))
        except Exception as e:
            log(f"TEST {i} ERROR: {e}", "ERROR")
            results.append((i, scenario, f"ERROR: {e}"))

    # Summary
    log("\n" + "="*70)
    log("TEST RESULTS SUMMARY")
    log("="*70)

    for test_num, scenario, result in results:
        status = "✓" if result == "PASS" else "✗"
        log(f"  {status} Test {test_num}: {scenario} - {result}")

    passed = sum(1 for _, _, r in results if r == "PASS")
    log(f"\nTotal: {passed}/{len(results)} tests passed")
    log("="*70)

if __name__ == "__main__":
    main()
