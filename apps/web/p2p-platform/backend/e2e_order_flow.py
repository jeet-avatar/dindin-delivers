#!/usr/bin/env python3
"""
Dollor.ai End-to-End Order Flow Test
Coordinates Customer, Vendor, and Driver agents for complete order lifecycle

Flow:
1. Customer places order (checkout with payment)
2. Vendor confirms order and marks ready for pickup
3. Driver accepts and picks up order

Production URLs:
- Website: https://www.dollor.ai
- API: https://api.dollor.ai

Demo Credentials:
- Customer: demo.customer@dollor.ai / DemoCustomer2025!
- Vendor: demo.restaurant@dollor.ai / DemoRestaurant2025!
- Driver: demo.driver@dollor.ai / DemoDriver2025!
"""

import sys
import time
from datetime import datetime

# Import the agents
from ui_test_agent import UITestAgent
from vendor_test_agent import VendorTestAgent
from driver_test_agent import DriverTestAgent

# Production configuration
BASE_URL = "https://www.dollor.ai"
API_URL = "https://api.dollor.ai"

# Demo credentials
CUSTOMER_EMAIL = "demo.customer@dollor.ai"
CUSTOMER_PASSWORD = "DemoCustomer2025!"
VENDOR_EMAIL = "demo.restaurant@dollor.ai"
VENDOR_PASSWORD = "DemoRestaurant2025!"
DRIVER_EMAIL = "demo.driver@dollor.ai"
DRIVER_PASSWORD = "DemoDriver2025!"


def print_header(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_step(step_num: int, text: str):
    print(f"\n>>> STEP {step_num}: {text}")
    print("-" * 50)


def run_e2e_order_flow():
    """Run complete end-to-end order flow"""
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    results = {
        "customer": {"success": False, "steps": []},
        "vendor": {"success": False, "steps": []},
        "driver": {"success": False, "steps": []},
    }

    print_header("DOLLOR.AI END-TO-END ORDER FLOW TEST")
    print(f"Session: {session_id}")
    print(f"Website: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # ==================== CUSTOMER ORDER ====================
    print_header("PHASE 1: CUSTOMER PLACES ORDER")

    customer_agent = UITestAgent(base_url=BASE_URL, headless=False, slow_mo=500)

    try:
        customer_agent.start()

        print_step(1, "Customer Login")
        login_result = customer_agent.customer_login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        results["customer"]["steps"].append(("Login", login_result.success))
        print(f"[{'PASS' if login_result.success else 'FAIL'}] {login_result.message}")
        if not login_result.success:
            raise Exception("Customer login failed")

        print_step(2, "Select Restaurant (Natraj)")
        restaurant_result = customer_agent.browse_and_select_restaurant("Natraj")
        results["customer"]["steps"].append(("Select Restaurant", restaurant_result.success))
        print(f"[{'PASS' if restaurant_result.success else 'FAIL'}] {restaurant_result.message}")
        if not restaurant_result.success:
            raise Exception("Restaurant selection failed")

        print_step(3, "Add Items to Cart")
        cart_result = customer_agent.add_items_to_cart(2)
        results["customer"]["steps"].append(("Add Items", cart_result.success))
        print(f"[{'PASS' if cart_result.success else 'FAIL'}] {cart_result.message}")
        if not cart_result.success:
            raise Exception("Adding items failed")

        print_step(4, "View Cart")
        view_cart_result = customer_agent.view_cart()
        results["customer"]["steps"].append(("View Cart", view_cart_result.success))
        print(f"[{'PASS' if view_cart_result.success else 'FAIL'}] {view_cart_result.message}")

        print_step(5, "Proceed to Checkout")
        checkout_result = customer_agent.proceed_to_checkout()
        results["customer"]["steps"].append(("Checkout", checkout_result.success))
        print(f"[{'PASS' if checkout_result.success else 'FAIL'}] {checkout_result.message}")

        print_step(6, "Place Order (Complete Payment)")
        order_result = customer_agent.complete_checkout()
        results["customer"]["steps"].append(("Place Order", order_result.success))
        print(f"[{'PASS' if order_result.success else 'FAIL'}] {order_result.message}")

        results["customer"]["success"] = all(step[1] for step in results["customer"]["steps"])
        print(f"\n[CUSTOMER PHASE] {'PASSED' if results['customer']['success'] else 'PARTIAL'}")

    except Exception as e:
        print(f"[CUSTOMER ERROR] {str(e)}")
    finally:
        customer_agent.stop()

    # Wait for order to propagate
    print("\n[Waiting 3 seconds for order to propagate to vendor...]")
    time.sleep(3)

    # ==================== VENDOR CONFIRMATION ====================
    print_header("PHASE 2: VENDOR CONFIRMS ORDER")

    vendor_agent = VendorTestAgent(base_url=BASE_URL, headless=False, slow_mo=500)

    try:
        vendor_agent.start()

        print_step(7, "Vendor Login")
        vendor_login = vendor_agent.vendor_login(VENDOR_EMAIL, VENDOR_PASSWORD)
        results["vendor"]["steps"].append(("Login", vendor_login.success))
        print(f"[{'PASS' if vendor_login.success else 'FAIL'}] {vendor_login.message}")
        if not vendor_login.success:
            raise Exception("Vendor login failed")

        print_step(8, "View Orders")
        orders_result = vendor_agent.view_orders()
        results["vendor"]["steps"].append(("View Orders", orders_result.success))
        print(f"[{'PASS' if orders_result.success else 'FAIL'}] {orders_result.message}")

        print_step(9, "Confirm Order")
        confirm_result = vendor_agent.confirm_order()
        results["vendor"]["steps"].append(("Confirm Order", confirm_result.success))
        print(f"[{'PASS' if confirm_result.success else 'FAIL'}] {confirm_result.message}")

        print_step(10, "Mark Ready for Pickup")
        ready_result = vendor_agent.mark_ready_for_pickup()
        results["vendor"]["steps"].append(("Mark Ready", ready_result.success))
        print(f"[{'PASS' if ready_result.success else 'FAIL'}] {ready_result.message}")

        results["vendor"]["success"] = all(step[1] for step in results["vendor"]["steps"])
        print(f"\n[VENDOR PHASE] {'PASSED' if results['vendor']['success'] else 'PARTIAL'}")

    except Exception as e:
        print(f"[VENDOR ERROR] {str(e)}")
    finally:
        vendor_agent.stop()

    # Wait for order status to update
    print("\n[Waiting 2 seconds for order status to update...]")
    time.sleep(2)

    # ==================== DRIVER ACCEPTANCE ====================
    print_header("PHASE 3: DRIVER ACCEPTS ORDER")

    driver_agent = DriverTestAgent(base_url=BASE_URL, headless=False, slow_mo=500)

    try:
        driver_agent.start()

        print_step(11, "Driver Login")
        driver_login = driver_agent.driver_login(DRIVER_EMAIL, DRIVER_PASSWORD)
        results["driver"]["steps"].append(("Login", driver_login.success))
        print(f"[{'PASS' if driver_login.success else 'FAIL'}] {driver_login.message}")
        if not driver_login.success:
            raise Exception("Driver login failed")

        print_step(12, "View Available Orders")
        available_result = driver_agent.view_available_orders()
        results["driver"]["steps"].append(("View Orders", available_result.success))
        print(f"[{'PASS' if available_result.success else 'FAIL'}] {available_result.message}")

        print_step(13, "Accept Order")
        accept_result = driver_agent.accept_order()
        results["driver"]["steps"].append(("Accept Order", accept_result.success))
        print(f"[{'PASS' if accept_result.success else 'FAIL'}] {accept_result.message}")

        print_step(14, "View Active Delivery")
        active_result = driver_agent.view_active_delivery()
        results["driver"]["steps"].append(("Active Delivery", active_result.success))
        print(f"[{'PASS' if active_result.success else 'FAIL'}] {active_result.message}")

        results["driver"]["success"] = all(step[1] for step in results["driver"]["steps"])
        print(f"\n[DRIVER PHASE] {'PASSED' if results['driver']['success'] else 'PARTIAL'}")

    except Exception as e:
        print(f"[DRIVER ERROR] {str(e)}")
    finally:
        driver_agent.stop()

    # ==================== SUMMARY ====================
    print_header("END-TO-END FLOW SUMMARY")

    total_steps = 0
    passed_steps = 0

    for phase, data in results.items():
        phase_passed = sum(1 for step in data["steps"] if step[1])
        phase_total = len(data["steps"])
        total_steps += phase_total
        passed_steps += phase_passed

        status = "PASSED" if data["success"] else "PARTIAL" if phase_passed > 0 else "FAILED"
        print(f"\n{phase.upper()} ({status}): {phase_passed}/{phase_total} steps")
        for step_name, step_success in data["steps"]:
            print(f"  [{'x' if step_success else ' '}] {step_name}")

    overall_success = all(data["success"] for data in results.values())
    print(f"\n{'=' * 70}")
    print(f"OVERALL: {'PASSED' if overall_success else 'PARTIAL'} ({passed_steps}/{total_steps} steps)")
    print(f"{'=' * 70}")

    return overall_success


if __name__ == "__main__":
    success = run_e2e_order_flow()
    sys.exit(0 if success else 1)
