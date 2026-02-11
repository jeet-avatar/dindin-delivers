#!/usr/bin/env python3
"""
Dollor.ai Restaurant Self-Delivery Flow Test
Complete workflow: Customer order → Restaurant accepts → Restaurant self-delivers

Flow:
1. Customer places order (with payment)
2. Restaurant receives order notification
3. Restaurant accepts order (within acceptance window)
4. Restaurant prepares order
5. Restaurant marks order ready
6. Restaurant starts delivery decision window (3 minutes)
7. Restaurant chooses to self-deliver (within 3 min window)
8. Restaurant marks out for delivery
9. Restaurant completes delivery

Key: Restaurant has 3-minute window to decide on delivery method
- If restaurant chooses "self_deliver" → they deliver themselves
- If restaurant chooses "pass_to_driver" → order goes to driver pool
- If timeout → order automatically goes to driver pool

Production URLs:
- API: https://api.dollor.ai
- Website: https://www.dollor.ai
"""

import sys
import time
import json
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

# Configuration
API_URL = "https://api.dollor.ai"

# Demo credentials
CUSTOMER_EMAIL = "demo.customer@dollor.ai"
CUSTOMER_PASSWORD = "DemoCustomer2025!"
VENDOR_EMAIL = "demo.restaurant@dollor.ai"
VENDOR_PASSWORD = "DemoRestaurant2025!"

# Real address in 92688 area
DELIVERY_ADDRESS = {
    "street": "22352 El Paseo",
    "city": "Rancho Santa Margarita",
    "state": "CA",
    "zip_code": "92688",
    "lat": 33.641,
    "lng": -117.6028,
    "formatted": "22352 El Paseo, Rancho Santa Margarita, CA 92688"
}

# Delivery decision window (from order_flow.py)
DELIVERY_DECISION_WINDOW_SECONDS = 180  # 3 minutes


@dataclass
class StepResult:
    """Result of a test step"""
    success: bool
    message: str
    data: Optional[Dict] = None


def print_header(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_step(step_num: int, text: str):
    print(f"\n>>> STEP {step_num}: {text}")
    print("-" * 50)


def print_result(result: StepResult):
    status = "PASS" if result.success else "FAIL"
    print(f"[{status}] {result.message}")
    if result.data and result.success:
        for key in ['order_id', 'order_number', 'status', 'decision', 'remaining_seconds']:
            if key in result.data:
                print(f"    {key}: {result.data[key]}")


class RestaurantSelfDeliveryOrchestrator:
    """Orchestrates restaurant self-delivery flow"""

    def __init__(self):
        self.session = requests.Session()
        self.customer_token: Optional[str] = None
        self.vendor_token: Optional[str] = None
        self.customer_id: Optional[int] = None
        self.vendor_id: Optional[int] = None
        self.order_id: Optional[int] = None
        self.order_number: Optional[str] = None

    # ==================== AUTHENTICATION ====================

    def customer_login(self) -> StepResult:
        """Login as customer"""
        try:
            response = self.session.post(
                f"{API_URL}/api/auth/customer/login",
                data={
                    "username": CUSTOMER_EMAIL,
                    "password": CUSTOMER_PASSWORD
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if response.status_code == 200:
                data = response.json()
                self.customer_token = data.get("access_token")
                self.customer_id = data.get("customer_id")
                return StepResult(True, f"Customer logged in (ID: {self.customer_id})", data)
            return StepResult(False, f"Login failed: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def vendor_login(self) -> StepResult:
        """Login as vendor/restaurant"""
        try:
            response = self.session.post(
                f"{API_URL}/api/auth/vendor/login",
                data={
                    "username": VENDOR_EMAIL,
                    "password": VENDOR_PASSWORD
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if response.status_code == 200:
                data = response.json()
                self.vendor_token = data.get("access_token")
                self.vendor_id = data.get("vendor_id")
                return StepResult(True, f"Vendor logged in (ID: {self.vendor_id})", data)
            return StepResult(False, f"Login failed: {response.status_code} - {response.text[:100]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    # ==================== CUSTOMER ORDER ====================

    def create_order(self) -> StepResult:
        """Customer creates a food order"""
        try:
            if not self.customer_id:
                return StepResult(False, "Customer ID not available - login first")

            # Create order with test items
            response = self.session.post(
                f"{API_URL}/api/orders",
                json={
                    "customer_id": self.customer_id,
                    "customer_name": "Demo Customer",
                    "customer_email": CUSTOMER_EMAIL,
                    "customer_phone": "9498881234",
                    "vendor_id": self.vendor_id or 1,  # Demo restaurant
                    "delivery_address": DELIVERY_ADDRESS["formatted"],
                    "delivery_lat": DELIVERY_ADDRESS["lat"],
                    "delivery_lng": DELIVERY_ADDRESS["lng"],
                    "items": [
                        {
                            "name": "Chicken Tikka Masala",
                            "quantity": 1,
                            "price": 15.99,
                            "notes": "Medium spicy"
                        },
                        {
                            "name": "Garlic Naan",
                            "quantity": 2,
                            "price": 3.99
                        }
                    ],
                    "subtotal": 23.97,
                    "delivery_fee": 4.99,
                    "platform_fee": 1.00,
                    "tip": 5.00,
                    "total_amount": 34.96,
                    "payment_method": "card",
                    "payment_status": "succeeded",  # Simulated successful payment
                    "special_instructions": "Please ring doorbell"
                },
                headers={
                    "Authorization": f"Bearer {self.customer_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code in [200, 201]:
                data = response.json()
                self.order_id = data.get("id") or data.get("order_id")
                self.order_number = data.get("order_number")
                return StepResult(True,
                    f"Order created: #{self.order_number} (ID: {self.order_id})",
                    {"order_id": self.order_id, "order_number": self.order_number})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    # ==================== VENDOR ORDER MANAGEMENT ====================

    def get_vendor_orders(self) -> StepResult:
        """Vendor views incoming orders"""
        try:
            if not self.vendor_id:
                return StepResult(False, "Vendor ID not available - login first")

            response = self.session.get(
                f"{API_URL}/api/vendors/{self.vendor_id}/orders",
                params={"status": "pending_restaurant,confirmed"},
                headers={"Authorization": f"Bearer {self.vendor_token}"}
            )

            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", data) if isinstance(data, dict) else data
                count = len(orders) if isinstance(orders, list) else 0

                # Find our order if we have one
                our_order = None
                if self.order_id and isinstance(orders, list):
                    for order in orders:
                        if order.get("id") == self.order_id:
                            our_order = order
                            break

                return StepResult(True, f"Found {count} orders",
                    {"count": count, "our_order_found": our_order is not None, "orders": orders})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def accept_order(self) -> StepResult:
        """Restaurant accepts the order (PENDING_RESTAURANT → PREPARING)"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available - create order first")

            response = self.session.patch(
                f"{API_URL}/api/orders/{self.order_id}/status",
                json={"status": "preparing"},
                headers={
                    "Authorization": f"Bearer {self.vendor_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                data = response.json()
                return StepResult(True, "Order accepted - now PREPARING",
                    {"order_id": self.order_id, "status": "preparing"})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def mark_ready_for_pickup(self) -> StepResult:
        """Restaurant marks order as ready (PREPARING → READY_FOR_PICKUP)"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.patch(
                f"{API_URL}/api/orders/{self.order_id}/status",
                json={"status": "ready_for_pickup"},
                headers={
                    "Authorization": f"Bearer {self.vendor_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                return StepResult(True, "Order ready for pickup",
                    {"order_id": self.order_id, "status": "ready_for_pickup"})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    # ==================== DELIVERY DECISION ====================

    def start_delivery_decision(self) -> StepResult:
        """Start the 3-minute delivery decision window"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.post(
                f"{API_URL}/api/erp/orders/{self.order_id}/start-delivery-decision",
                headers={"Authorization": f"Bearer {self.vendor_token}"}
            )

            if response.status_code == 200:
                data = response.json()
                window_seconds = data.get("window_seconds", DELIVERY_DECISION_WINDOW_SECONDS)
                return StepResult(True,
                    f"Delivery decision window started ({window_seconds // 60} minutes)",
                    {"order_id": self.order_id, "status": "pending_delivery_decision",
                     "window_seconds": window_seconds})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def check_delivery_decision_status(self) -> StepResult:
        """Check remaining time in delivery decision window"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.get(
                f"{API_URL}/api/erp/orders/{self.order_id}/delivery-decision-status",
                headers={"Authorization": f"Bearer {self.vendor_token}"}
            )

            if response.status_code == 200:
                data = response.json()
                remaining = data.get("remaining_seconds", 0)
                return StepResult(True,
                    f"Decision window: {remaining:.0f} seconds remaining",
                    {"remaining_seconds": remaining, "status": data.get("status")})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def choose_self_deliver(self) -> StepResult:
        """Restaurant chooses to self-deliver (within 3 min window)"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.post(
                f"{API_URL}/api/erp/orders/{self.order_id}/restaurant-delivery-decision",
                json={"decision": "self_deliver"},
                headers={
                    "Authorization": f"Bearer {self.vendor_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                data = response.json()
                return StepResult(True, "Restaurant will SELF-DELIVER this order",
                    {"order_id": self.order_id, "decision": "self_deliver",
                     "status": data.get("status")})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    # ==================== DELIVERY EXECUTION ====================

    def mark_out_for_delivery(self) -> StepResult:
        """Restaurant marks order as out for delivery"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.patch(
                f"{API_URL}/api/orders/{self.order_id}/status",
                json={"status": "out_for_delivery"},
                headers={
                    "Authorization": f"Bearer {self.vendor_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                return StepResult(True, "Order OUT FOR DELIVERY by restaurant",
                    {"order_id": self.order_id, "status": "out_for_delivery"})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def complete_delivery(self) -> StepResult:
        """Restaurant completes the delivery"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.patch(
                f"{API_URL}/api/orders/{self.order_id}/status",
                json={"status": "delivered"},
                headers={
                    "Authorization": f"Bearer {self.vendor_token}",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code == 200:
                return StepResult(True, "Order DELIVERED by restaurant!",
                    {"order_id": self.order_id, "status": "delivered"})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")

    def get_order_status(self) -> StepResult:
        """Get current order status"""
        try:
            if not self.order_id:
                return StepResult(False, "Order ID not available")

            response = self.session.get(
                f"{API_URL}/api/orders/{self.order_id}",
                headers={"Authorization": f"Bearer {self.vendor_token}"}
            )

            if response.status_code == 200:
                data = response.json()
                status = data.get("status", "unknown")
                return StepResult(True, f"Order status: {status}",
                    {"order_id": self.order_id, "status": status, "order": data})
            return StepResult(False, f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            return StepResult(False, f"Error: {str(e)}")


def run_restaurant_self_delivery_flow():
    """Run complete restaurant self-delivery flow"""
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    results = []

    print_header("DOLLOR.AI RESTAURANT SELF-DELIVERY FLOW")
    print(f"Session: {session_id}")
    print(f"API: {API_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\nDelivery Decision Window: {DELIVERY_DECISION_WINDOW_SECONDS // 60} minutes")
    print(f"Delivery Address: {DELIVERY_ADDRESS['formatted']}")

    orchestrator = RestaurantSelfDeliveryOrchestrator()
    step = 0

    # ==================== PHASE 1: AUTHENTICATION ====================
    print_header("PHASE 1: AUTHENTICATION")

    step += 1
    print_step(step, "Customer Login")
    result = orchestrator.customer_login()
    print_result(result)
    results.append(("Customer Login", result.success))

    step += 1
    print_step(step, "Vendor Login")
    result = orchestrator.vendor_login()
    print_result(result)
    results.append(("Vendor Login", result.success))

    # ==================== PHASE 2: ORDER CREATION ====================
    print_header("PHASE 2: CUSTOMER PLACES ORDER")

    step += 1
    print_step(step, "Create Order (with payment)")
    result = orchestrator.create_order()
    print_result(result)
    results.append(("Create Order", result.success))

    if not result.success:
        print("\n[ERROR] Order creation failed - cannot continue")
        return False

    # ==================== PHASE 3: RESTAURANT ACCEPTS ====================
    print_header("PHASE 3: RESTAURANT RECEIVES & ACCEPTS ORDER")

    step += 1
    print_step(step, "View Incoming Orders")
    result = orchestrator.get_vendor_orders()
    print_result(result)
    results.append(("View Orders", result.success))

    step += 1
    print_step(step, "Accept Order (Start Preparing)")
    result = orchestrator.accept_order()
    print_result(result)
    results.append(("Accept Order", result.success))

    # Simulate preparation time
    print("\n[Simulating preparation time... 2 seconds]")
    time.sleep(2)

    step += 1
    print_step(step, "Mark Order Ready for Pickup")
    result = orchestrator.mark_ready_for_pickup()
    print_result(result)
    results.append(("Ready for Pickup", result.success))

    # ==================== PHASE 4: DELIVERY DECISION (3 MIN WINDOW) ====================
    print_header("PHASE 4: DELIVERY DECISION (3-MINUTE WINDOW)")

    step += 1
    print_step(step, "Start Delivery Decision Window")
    result = orchestrator.start_delivery_decision()
    print_result(result)
    results.append(("Start Decision Window", result.success))

    step += 1
    print_step(step, "Check Time Remaining")
    result = orchestrator.check_delivery_decision_status()
    print_result(result)
    results.append(("Check Time", result.success))

    step += 1
    print_step(step, "Restaurant Chooses: SELF-DELIVER")
    result = orchestrator.choose_self_deliver()
    print_result(result)
    results.append(("Self-Deliver Decision", result.success))

    # ==================== PHASE 5: RESTAURANT DELIVERS ====================
    print_header("PHASE 5: RESTAURANT SELF-DELIVERY")

    step += 1
    print_step(step, "Mark Out for Delivery")
    result = orchestrator.mark_out_for_delivery()
    print_result(result)
    results.append(("Out for Delivery", result.success))

    # Simulate delivery time
    print("\n[Simulating delivery time... 2 seconds]")
    time.sleep(2)

    step += 1
    print_step(step, "Complete Delivery")
    result = orchestrator.complete_delivery()
    print_result(result)
    results.append(("Complete Delivery", result.success))

    # ==================== PHASE 6: VERIFICATION ====================
    print_header("PHASE 6: FINAL VERIFICATION")

    step += 1
    print_step(step, "Verify Final Order Status")
    result = orchestrator.get_order_status()
    print_result(result)
    results.append(("Final Status", result.success))

    # ==================== SUMMARY ====================
    print_header("RESTAURANT SELF-DELIVERY FLOW SUMMARY")

    passed = sum(1 for _, s in results if s)
    total = len(results)

    print(f"\nResults: {passed}/{total} steps passed")
    print("-" * 40)

    for step_name, success in results:
        print(f"  [{'x' if success else ' '}] {step_name}")

    print(f"\n{'=' * 70}")
    status = "PASSED" if passed == total else f"PARTIAL ({passed}/{total})"
    print(f"OVERALL: {status}")
    print(f"{'=' * 70}")

    if orchestrator.order_number:
        print(f"\nOrder Number: #{orchestrator.order_number}")
    print(f"Delivery Method: Restaurant Self-Delivery")

    return passed == total


if __name__ == "__main__":
    success = run_restaurant_self_delivery_flow()
    sys.exit(0 if success else 1)
