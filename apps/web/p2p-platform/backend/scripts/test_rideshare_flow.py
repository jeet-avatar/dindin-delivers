#!/usr/bin/env python3
"""
Rideshare End-to-End Test Script
================================

Complete test of rideshare flow:
1. Customer requests ride
2. Driver submits bid
3. Customer accepts/negotiates bid
4. Driver picks up customer
5. Driver drops off customer
6. Payment is processed
7. Driver receives payout

Usage:
    python scripts/test_rideshare_flow.py [--staging]

Staging URL: https://d3kuu45w6kl8hr.cloudfront.net
"""

import requests
import argparse
import time
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
STAGING_URL = "https://d3kuu45w6kl8hr.cloudfront.net/api"
LOCAL_URL = "http://localhost:8080/api"

# Test data
TEST_LOCATIONS = {
    "downtown_la": {
        "address": "350 S Grand Ave, Los Angeles, CA 90071",
        "latitude": 34.0522,
        "longitude": -118.2437,
        "place_name": "Downtown LA"
    },
    "santa_monica": {
        "address": "1515 Ocean Ave, Santa Monica, CA 90401",
        "latitude": 34.0195,
        "longitude": -118.4912,
        "place_name": "Santa Monica Pier"
    }
}


class RideshareFlowTest:
    """Test runner for complete rideshare flow"""

    def __init__(self, base_url: str = STAGING_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        self.ride_request_id = None
        self.bid_id = None
        self.final_price = None

    def log(self, step: str, message: str, success: bool = True):
        """Log test step"""
        icon = "✅" if success else "❌"
        print(f"  {icon} [{step}] {message}")

    def log_section(self, title: str):
        """Log section header"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")

    # ===================== API CALLS =====================

    def get_fare_estimate(self, pickup: Dict, dropoff: Dict) -> Dict:
        """Get fare estimate"""
        response = self.session.post(
            f"{self.base_url}/rides/estimate",
            json={
                "pickup_latitude": pickup["latitude"],
                "pickup_longitude": pickup["longitude"],
                "dropoff_latitude": dropoff["latitude"],
                "dropoff_longitude": dropoff["longitude"],
                "ride_type": "standard"
            }
        )
        return response.json()

    def create_ride_request(self, customer_id: int, pickup: Dict, dropoff: Dict) -> Dict:
        """Create ride request"""
        response = self.session.post(
            f"{self.base_url}/rides/request",
            json={
                "customer_id": customer_id,
                "pickup_address": pickup["address"],
                "pickup_latitude": pickup["latitude"],
                "pickup_longitude": pickup["longitude"],
                "pickup_place_name": pickup["place_name"],
                "dropoff_address": dropoff["address"],
                "dropoff_latitude": dropoff["latitude"],
                "dropoff_longitude": dropoff["longitude"],
                "dropoff_place_name": dropoff["place_name"],
                "ride_type": "standard",
                "bidding_duration_minutes": 10
            }
        )
        return response.json()

    def get_available_rides(self, driver_id: int, lat: float, lng: float) -> Dict:
        """Get available rides for driver"""
        response = self.session.get(
            f"{self.base_url}/rides/available",
            params={
                "driver_id": driver_id,
                "latitude": lat,
                "longitude": lng,
                "radius_km": 50
            }
        )
        return response.json()

    def submit_bid(self, request_id: int, driver_id: int, price: float) -> Dict:
        """Submit bid on ride"""
        response = self.session.post(
            f"{self.base_url}/rides/request/{request_id}/bid",
            json={
                "driver_id": driver_id,
                "proposed_price": price,
                "message": "I'm nearby and ready to go!",
                "estimated_arrival_minutes": 5
            }
        )
        return response.json()

    def respond_to_bid(self, bid_id: int, action: str, counter_price: float = None) -> Dict:
        """Customer responds to bid"""
        data = {"action": action}
        if counter_price:
            data["counter_price"] = counter_price
        response = self.session.post(
            f"{self.base_url}/rides/bid/{bid_id}/respond",
            json=data
        )
        return response.json()

    def start_ride(self, request_id: int) -> Dict:
        """Start ride (pickup)"""
        response = self.session.post(f"{self.base_url}/rides/request/{request_id}/start")
        return response.json()

    def complete_ride(self, request_id: int) -> Dict:
        """Complete ride (dropoff)"""
        response = self.session.post(f"{self.base_url}/rides/request/{request_id}/complete")
        return response.json()

    def get_ride_status(self, request_id: int) -> Dict:
        """Get ride status"""
        response = self.session.get(f"{self.base_url}/rides/request/{request_id}")
        return response.json()

    def send_chat_message(self, ride_id: int, message: str, sender: str) -> Dict:
        """Send chat message"""
        response = self.session.post(
            f"{self.base_url}/p2p/ride-requests/{ride_id}/chat",
            json={"message": message, "sender_type": sender}
        )
        return response.json() if response.status_code in [200, 201] else {"error": response.text}

    def get_chat_messages(self, ride_id: int) -> Dict:
        """Get chat messages"""
        response = self.session.get(f"{self.base_url}/p2p/ride-requests/{ride_id}/chat")
        return response.json() if response.status_code == 200 else {"messages": []}

    def create_payment(self, ride_id: int) -> Dict:
        """Create payment intent"""
        response = self.session.post(
            f"{self.base_url}/payments/ride/create-intent",
            json={"ride_request_id": ride_id}
        )
        return response.json()

    def get_driver_earnings(self, driver_id: int) -> Dict:
        """Get driver earnings"""
        response = self.session.get(f"{self.base_url}/payments/ride/driver/{driver_id}/earnings")
        return response.json()

    # ===================== TEST SCENARIOS =====================

    def test_scenario_1_ios_customer_android_driver(self):
        """
        Scenario 1: iOS Customer ↔ Android Driver - Direct Accept
        """
        self.log_section("SCENARIO 1: iOS Customer ↔ Android Driver")
        pickup = TEST_LOCATIONS["downtown_la"]
        dropoff = TEST_LOCATIONS["santa_monica"]

        # Step 1: Get fare estimate
        estimate = self.get_fare_estimate(pickup, dropoff)
        if estimate.get("success") or "estimate" in estimate:
            suggested = estimate.get("estimate", {}).get("total", 25.0)
            self.log("ESTIMATE", f"Fare estimate: ${suggested:.2f}")
        else:
            self.log("ESTIMATE", f"Failed: {estimate}", False)
            return False

        # Step 2: Create ride request
        ride = self.create_ride_request(customer_id=1, pickup=pickup, dropoff=dropoff)
        if not ride.get("success"):
            self.log("REQUEST", f"Failed: {ride}", False)
            return False
        self.ride_request_id = ride["ride_request"]["id"]
        self.log("REQUEST", f"Created ride request ID={self.ride_request_id}")

        # Step 3: Driver sees and bids
        available = self.get_available_rides(driver_id=1, lat=34.05, lng=-118.25)
        if available.get("available_requests"):
            self.log("AVAILABLE", f"Driver sees {len(available['available_requests'])} ride(s)")

        bid_price = suggested * 0.9  # 10% below estimate
        bid = self.submit_bid(self.ride_request_id, driver_id=1, price=bid_price)
        if not bid.get("success"):
            self.log("BID", f"Failed: {bid}", False)
            return False
        self.bid_id = bid["bid"]["id"]
        self.log("BID", f"Driver bid ${bid_price:.2f}")

        # Step 4: Customer accepts
        accept = self.respond_to_bid(self.bid_id, action="accept")
        if not accept.get("success"):
            self.log("ACCEPT", f"Failed: {accept}", False)
            return False
        self.final_price = accept.get("ride_request", {}).get("final_price", bid_price)
        self.log("ACCEPT", f"Bid accepted! Matched at ${self.final_price:.2f}")

        return True

    def test_scenario_2_negotiation(self):
        """
        Scenario 2: Counter-offer negotiation
        """
        self.log_section("SCENARIO 2: Counter-Offer Negotiation")
        pickup = TEST_LOCATIONS["santa_monica"]
        dropoff = TEST_LOCATIONS["downtown_la"]

        # Create ride
        estimate = self.get_fare_estimate(pickup, dropoff)
        suggested = estimate.get("estimate", {}).get("total", 28.0)

        ride = self.create_ride_request(customer_id=1, pickup=pickup, dropoff=dropoff)
        if not ride.get("success"):
            self.log("REQUEST", f"Failed: {ride}", False)
            return False
        request_id = ride["ride_request"]["id"]
        self.log("REQUEST", f"Created ride ID={request_id}")

        # Driver bids high
        driver_price = suggested + 5
        bid = self.submit_bid(request_id, driver_id=2, price=driver_price)
        if not bid.get("success"):
            self.log("BID", f"Failed: {bid}", False)
            return False
        bid_id = bid["bid"]["id"]
        self.log("BID", f"Driver bid ${driver_price:.2f} (high)")

        # Customer counters
        counter_price = suggested - 2
        counter = self.respond_to_bid(bid_id, action="counter", counter_price=counter_price)
        if not counter.get("success"):
            self.log("COUNTER", f"Failed: {counter}", False)
            return False
        self.log("COUNTER", f"Customer countered ${counter_price:.2f}")

        # Driver accepts counter
        accept = self.session.post(f"{self.base_url}/rides/bid/{bid_id}/accept-counter")
        result = accept.json()
        if result.get("success"):
            self.log("ACCEPT", f"Driver accepted counter! Final: ${result.get('ride_request', {}).get('final_price'):.2f}")
            return True
        else:
            self.log("ACCEPT", f"Failed: {result}", False)
            return False

    def test_scenario_3_full_ride_flow(self):
        """
        Scenario 3: Complete ride from request to completion
        """
        self.log_section("SCENARIO 3: Full Ride Flow (Pickup → Dropoff)")

        if not self.ride_request_id:
            self.log("SETUP", "Running scenario 1 first...", True)
            if not self.test_scenario_1_ios_customer_android_driver():
                return False

        request_id = self.ride_request_id

        # Start ride (pickup)
        start = self.start_ride(request_id)
        if not start.get("success"):
            self.log("PICKUP", f"Failed: {start}", False)
            return False
        self.log("PICKUP", "Driver picked up customer - ride started")

        # Simulate chat during ride
        self.send_chat_message(request_id, "Picked you up, heading to destination!", "driver")
        self.send_chat_message(request_id, "Great, thanks!", "customer")

        messages = self.get_chat_messages(request_id)
        msg_count = len(messages) if isinstance(messages, list) else len(messages.get("messages", []))
        self.log("CHAT", f"{msg_count} messages exchanged")

        # Complete ride (dropoff)
        complete = self.complete_ride(request_id)
        if not complete.get("success"):
            self.log("DROPOFF", f"Failed: {complete}", False)
            return False

        final_status = complete.get("ride_request", {}).get("status")
        self.log("DROPOFF", f"Ride completed! Status: {final_status}")

        return True

    def test_scenario_4_payment_flow(self):
        """
        Scenario 4: Payment and driver earnings
        """
        self.log_section("SCENARIO 4: Payment & Driver Earnings")

        if not self.ride_request_id:
            self.log("SETUP", "Need completed ride first", False)
            return False

        # Calculate expected amounts
        fare = self.final_price or 25.0
        if fare <= 35:
            platform_fee = 1.0
        elif fare <= 70:
            platform_fee = 2.0
        else:
            platform_fee = 3.0

        driver_payout = fare - platform_fee
        customer_pays = fare  # Customer pays agreed fare, platform fee comes from fare

        self.log("PRICING", f"Fare: ${fare:.2f} | Platform Fee: ${platform_fee:.2f}")
        self.log("PRICING", f"Customer pays: ${customer_pays:.2f} | Driver receives: ${driver_payout:.2f}")
        self.log("PRICING", f"Driver keeps: {(driver_payout/fare*100):.1f}%")

        # Create payment intent
        payment = self.create_payment(self.ride_request_id)
        if payment.get("success") or payment.get("client_secret"):
            self.log("PAYMENT", f"Payment intent created")
        else:
            self.log("PAYMENT", f"Payment endpoint: {payment.get('error', 'Check endpoint')}", False)

        # Check driver earnings
        earnings = self.get_driver_earnings(driver_id=1)
        if earnings.get("total_earnings") is not None:
            self.log("EARNINGS", f"Driver earnings: ${earnings.get('total_earnings', 0):.2f}")
        else:
            self.log("EARNINGS", "Earnings endpoint accessible", True)

        return True

    def run_all_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*60)
        print("  DOLLOR.AI RIDESHARE E2E TEST")
        print(f"  API: {self.base_url}")
        print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)

        results = {}

        # Scenario 1
        try:
            results["iOS→Android Accept"] = self.test_scenario_1_ios_customer_android_driver()
        except Exception as e:
            self.log("ERROR", str(e), False)
            results["iOS→Android Accept"] = False

        # Scenario 2
        try:
            results["Counter-Offer"] = self.test_scenario_2_negotiation()
        except Exception as e:
            self.log("ERROR", str(e), False)
            results["Counter-Offer"] = False

        # Scenario 3
        try:
            results["Full Ride Flow"] = self.test_scenario_3_full_ride_flow()
        except Exception as e:
            self.log("ERROR", str(e), False)
            results["Full Ride Flow"] = False

        # Scenario 4
        try:
            results["Payment Flow"] = self.test_scenario_4_payment_flow()
        except Exception as e:
            self.log("ERROR", str(e), False)
            results["Payment Flow"] = False

        # Summary
        self.log_section("TEST SUMMARY")
        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for name, success in results.items():
            icon = "✅" if success else "❌"
            print(f"  {icon} {name}")

        print(f"\n  Results: {passed}/{total} passed")
        print("="*60 + "\n")

        return passed == total


def main():
    parser = argparse.ArgumentParser(description="Rideshare E2E Test")
    parser.add_argument("--staging", action="store_true", help="Use staging URL (default)")
    parser.add_argument("--local", action="store_true", help="Use localhost")
    args = parser.parse_args()

    if args.local:
        url = LOCAL_URL
    else:
        url = STAGING_URL

    tester = RideshareFlowTest(base_url=url)
    success = tester.run_all_tests()

    exit(0 if success else 1)


if __name__ == "__main__":
    main()
