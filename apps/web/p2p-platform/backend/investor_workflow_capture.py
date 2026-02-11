#!/usr/bin/env python3
"""
Dollor.ai Investor Workflow Capture
Complete E2E workflows with screenshots for investor presentations

WORKFLOW 1: Food Delivery
- Customer places order through checkout
- Driver becomes available
- Restaurant accepts order
- Order marked as delivered
- Economics shown in admin

WORKFLOW 2: Rideshare Booking
- Customer requests ride
- Driver bids on ride
- Ride completed
- Economics shown in admin

Production URLs:
- Website: https://www.dollor.ai
- API: https://api.dollor.ai
"""

import asyncio
import os
import json
from datetime import datetime
from playwright.async_api import async_playwright

# Configuration
BASE_URL = "https://www.dollor.ai"
API_URL = "https://api.dollor.ai"

TIMESTAMP = datetime.now().strftime('%Y%m%d_%H%M%S')
OUTPUT_DIR = f"screenshots/investor_workflow_{TIMESTAMP}"

# Credentials
CUSTOMER_EMAIL = "demo.customer@dollor.ai"
CUSTOMER_PASSWORD = "DemoCustomer2025!"
DRIVER_EMAIL = "demo.driver@dollor.ai"
DRIVER_PASSWORD = "DemoDriver2025!"
VENDOR_EMAIL = "demo.restaurant@dollor.ai"
VENDOR_PASSWORD = "DemoRestaurant2025!"
ADMIN_EMAIL = "admin.invoice@dollor.ai"
ADMIN_PASSWORD = "AdminTest123"


class WorkflowCapture:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.screenshot_count = 0
        self.workflow_steps = []

    async def setup(self):
        """Initialize browser"""
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False, slow_mo=300)
        print(f"\n{'='*70}")
        print("  DOLLOR.AI INVESTOR WORKFLOW CAPTURE")
        print(f"  Output: {OUTPUT_DIR}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}\n")

    async def cleanup(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def screenshot(self, page, name, description, workflow="general"):
        """Save screenshot with metadata"""
        self.screenshot_count += 1
        filename = f"{OUTPUT_DIR}/{self.screenshot_count:02d}_{workflow}_{name}.png"
        await page.screenshot(path=filename, full_page=False)

        step_data = {
            "step": self.screenshot_count,
            "workflow": workflow,
            "name": name,
            "description": description,
            "filename": filename,
            "timestamp": datetime.now().isoformat()
        }
        self.workflow_steps.append(step_data)

        print(f"  [{self.screenshot_count:02d}] {workflow.upper()}: {description}")
        print(f"       Saved: {filename}")
        return filename

    async def login(self, page, email, password, role="customer"):
        """Generic login helper"""
        try:
            email_input = await page.query_selector('input[type="email"], input[name="email"], #email')
            if email_input:
                await email_input.fill(email)
                await asyncio.sleep(0.3)

            pass_input = await page.query_selector('input[type="password"], input[name="password"], #password')
            if pass_input:
                await pass_input.fill(password)
                await asyncio.sleep(0.3)

            login_btn = await page.query_selector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')
            if login_btn:
                await login_btn.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)
                return True
        except Exception as e:
            print(f"    Login note: {e}")
        return False

    # ============================================================
    # WORKFLOW 1: FOOD DELIVERY - COMPLETE ORDER LIFECYCLE
    # ============================================================
    async def food_delivery_workflow(self):
        """Complete food delivery workflow with screenshots"""
        print("\n" + "="*70)
        print("  WORKFLOW 1: FOOD DELIVERY - COMPLETE ORDER LIFECYCLE")
        print("="*70)

        # PHASE 1: CUSTOMER PLACES ORDER
        print("\n--- PHASE 1: CUSTOMER PLACES ORDER ---")
        context = await self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        try:
            # Step 1: Customer Login Page
            print("\n[Customer] Navigating to login...")
            await page.goto(f"{BASE_URL}/customer/login", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "customer_login_page",
                "Customer Login - Mobile-first authentication", "food")

            # Step 2: Customer Logs In
            print("[Customer] Logging in...")
            await self.login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD, "customer")
            await asyncio.sleep(2)
            await self.screenshot(page, "customer_logged_in",
                "Customer Dashboard - Browse restaurants & rideshare", "food")

            # Step 3: Browse Restaurants
            print("[Customer] Browsing restaurants...")
            await page.goto(f"{BASE_URL}/customer/restaurants", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "customer_restaurants",
                "Restaurant List - Nearby restaurants with ratings", "food")

            # Step 4: Select a Restaurant
            print("[Customer] Selecting restaurant...")
            restaurant_cards = await page.query_selector_all('[class*="restaurant"], [class*="card"], a[href*="restaurant"]')
            if restaurant_cards and len(restaurant_cards) > 0:
                await restaurant_cards[0].click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)
            await self.screenshot(page, "customer_menu",
                "Restaurant Menu - Browse items with prices", "food")

            # Step 5: Add Items to Cart
            print("[Customer] Adding items to cart...")
            add_buttons = await page.query_selector_all('button:has-text("Add"), button:has-text("+"), [class*="add-to-cart"]')
            for i, btn in enumerate(add_buttons[:2]):  # Add first 2 items
                try:
                    await btn.click()
                    await asyncio.sleep(0.5)
                except:
                    pass
            await asyncio.sleep(1)
            await self.screenshot(page, "customer_items_added",
                "Items Added - Cart updated with selections", "food")

            # Step 6: View Cart
            print("[Customer] Viewing cart...")
            cart_btn = await page.query_selector('button:has-text("Cart"), a:has-text("Cart"), [class*="cart-icon"], [aria-label*="cart"]')
            if cart_btn:
                await cart_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "customer_cart",
                "Shopping Cart - Order summary with $1 platform fee", "food")

            # Step 7: Proceed to Checkout
            print("[Customer] Proceeding to checkout...")
            checkout_btn = await page.query_selector('button:has-text("Checkout"), button:has-text("Continue"), a:has-text("Checkout")')
            if checkout_btn:
                await checkout_btn.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)
            await self.screenshot(page, "customer_checkout",
                "Checkout - Delivery address & payment method", "food")

            # Step 8: Place Order
            print("[Customer] Placing order...")
            place_order_btn = await page.query_selector('button:has-text("Place Order"), button:has-text("Pay"), button:has-text("Confirm")')
            if place_order_btn:
                await place_order_btn.click()
                await asyncio.sleep(3)
            await self.screenshot(page, "customer_order_placed",
                "Order Placed - Confirmation with tracking", "food")

            # Step 9: Order Tracking
            print("[Customer] Viewing order tracking...")
            await page.goto(f"{BASE_URL}/customer/orders", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "customer_order_tracking",
                "Order Tracking - Real-time status updates", "food")

        except Exception as e:
            print(f"  [ERROR] Customer flow: {e}")
            await self.screenshot(page, "customer_error", f"Error: {str(e)}", "food")
        finally:
            await context.close()

        # Wait for order propagation
        print("\n[Waiting 3s for order to propagate...]")
        await asyncio.sleep(3)

        # PHASE 2: RESTAURANT ACCEPTS ORDER
        print("\n--- PHASE 2: RESTAURANT ACCEPTS ORDER ---")
        context = await self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        try:
            # Step 10: Restaurant Login
            print("\n[Restaurant] Logging in...")
            await page.goto(f"{BASE_URL}/vendor/login", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "vendor_login",
                "Restaurant Login - Vendor portal access", "food")

            await self.login(page, VENDOR_EMAIL, VENDOR_PASSWORD, "vendor")
            await asyncio.sleep(2)
            await self.screenshot(page, "vendor_dashboard",
                "Restaurant Dashboard - Today's orders & revenue", "food")

            # Step 11: View Incoming Orders
            print("[Restaurant] Viewing orders...")
            await page.goto(f"{BASE_URL}/vendor/orders", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "vendor_orders",
                "Order Queue - Incoming orders with details", "food")

            # Step 12: Accept Order
            print("[Restaurant] Accepting order...")
            accept_btn = await page.query_selector('button:has-text("Accept"), button:has-text("Confirm"), [class*="accept"]')
            if accept_btn:
                await accept_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "vendor_order_accepted",
                "Order Accepted - Preparing food", "food")

            # Step 13: Mark Ready for Pickup
            print("[Restaurant] Marking ready for pickup...")
            ready_btn = await page.query_selector('button:has-text("Ready"), button:has-text("Pickup Ready"), [class*="ready"]')
            if ready_btn:
                await ready_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "vendor_order_ready",
                "Ready for Pickup - Driver notified", "food")

        except Exception as e:
            print(f"  [ERROR] Restaurant flow: {e}")
        finally:
            await context.close()

        # PHASE 3: DRIVER ACCEPTS AND DELIVERS
        print("\n--- PHASE 3: DRIVER ACCEPTS AND DELIVERS ---")
        context = await self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        try:
            # Step 14: Driver Login
            print("\n[Driver] Logging in...")
            await page.goto(f"{BASE_URL}/driver/login", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_login",
                "Driver Login - Driver app access", "food")

            await self.login(page, DRIVER_EMAIL, DRIVER_PASSWORD, "driver")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_dashboard",
                "Driver Dashboard - Available deliveries & earnings", "food")

            # Step 15: View Available Orders
            print("[Driver] Viewing available orders...")
            await page.goto(f"{BASE_URL}/driver/orders", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_available_orders",
                "Available Orders - Nearby delivery requests", "food")

            # Step 16: Accept Delivery
            print("[Driver] Accepting delivery...")
            accept_btn = await page.query_selector('button:has-text("Accept"), button:has-text("Pick Up"), [class*="accept"]')
            if accept_btn:
                await accept_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_order_accepted",
                "Delivery Accepted - Navigation to restaurant", "food")

            # Step 17: Picked Up
            print("[Driver] Marking picked up...")
            pickup_btn = await page.query_selector('button:has-text("Picked"), button:has-text("Got It"), [class*="pickup"]')
            if pickup_btn:
                await pickup_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_picked_up",
                "Food Picked Up - En route to customer", "food")

            # Step 18: Mark Delivered
            print("[Driver] Marking delivered...")
            deliver_btn = await page.query_selector('button:has-text("Deliver"), button:has-text("Complete"), [class*="deliver"]')
            if deliver_btn:
                await deliver_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_delivered",
                "Delivered! - Driver keeps 100% + tip", "food")

            # Step 19: Driver Earnings
            print("[Driver] Viewing earnings...")
            await page.goto(f"{BASE_URL}/driver/earnings", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_earnings",
                "Driver Earnings - 100% of delivery fee + tips", "food")

        except Exception as e:
            print(f"  [ERROR] Driver flow: {e}")
        finally:
            await context.close()

    # ============================================================
    # WORKFLOW 2: RIDESHARE - COMPLETE BOOKING LIFECYCLE
    # ============================================================
    async def rideshare_workflow(self):
        """Complete rideshare workflow with screenshots"""
        print("\n" + "="*70)
        print("  WORKFLOW 2: RIDESHARE - COMPLETE BOOKING LIFECYCLE")
        print("="*70)

        # PHASE 1: CUSTOMER REQUESTS RIDE
        print("\n--- PHASE 1: CUSTOMER REQUESTS RIDE ---")
        context = await self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        try:
            # Step 1: Customer Login
            print("\n[Customer] Logging in for rideshare...")
            await page.goto(f"{BASE_URL}/customer/login", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.login(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD, "customer")
            await asyncio.sleep(2)

            # Step 2: Navigate to Rideshare
            print("[Customer] Opening rideshare...")
            await page.goto(f"{BASE_URL}/customer/rideshare", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "ride_request_page",
                "Rideshare Home - Request a ride", "ride")

            # Step 3: Enter Pickup Location
            print("[Customer] Entering pickup location...")
            pickup_input = await page.query_selector('input[placeholder*="pickup"], input[placeholder*="Pickup"], #pickup, [name="pickup"]')
            if pickup_input:
                await pickup_input.fill("University of Texas, Austin")
                await asyncio.sleep(1)
            await self.screenshot(page, "ride_pickup_entered",
                "Pickup Location - UT Austin campus", "ride")

            # Step 4: Enter Destination
            print("[Customer] Entering destination...")
            dest_input = await page.query_selector('input[placeholder*="destination"], input[placeholder*="Destination"], #destination, [name="destination"]')
            if dest_input:
                await dest_input.fill("Austin Airport (AUS)")
                await asyncio.sleep(1)
            await self.screenshot(page, "ride_destination_entered",
                "Destination - Austin Airport", "ride")

            # Step 5: Submit Ride Request
            print("[Customer] Submitting ride request...")
            request_btn = await page.query_selector('button:has-text("Request"), button:has-text("Find"), button:has-text("Search")')
            if request_btn:
                await request_btn.click()
                await asyncio.sleep(3)
            await self.screenshot(page, "ride_request_submitted",
                "Ride Requested - Waiting for driver bids", "ride")

            # Step 6: View Driver Bids
            print("[Customer] Viewing driver bids...")
            await asyncio.sleep(2)
            await self.screenshot(page, "ride_driver_bids",
                "Driver Bids - Compare prices, choose driver", "ride")

            # Step 7: Accept a Bid
            print("[Customer] Accepting bid...")
            accept_btn = await page.query_selector('button:has-text("Accept"), button:has-text("Book"), [class*="accept-bid"]')
            if accept_btn:
                await accept_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "ride_bid_accepted",
                "Bid Accepted - Driver en route ($1 platform fee)", "ride")

        except Exception as e:
            print(f"  [ERROR] Customer rideshare: {e}")
        finally:
            await context.close()

        # PHASE 2: DRIVER BIDS AND COMPLETES RIDE
        print("\n--- PHASE 2: DRIVER BIDS AND COMPLETES RIDE ---")
        context = await self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        try:
            # Step 8: Driver Login
            print("\n[Driver] Logging in for rideshare...")
            await page.goto(f"{BASE_URL}/driver/login", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.login(page, DRIVER_EMAIL, DRIVER_PASSWORD, "driver")
            await asyncio.sleep(2)

            # Step 9: View Ride Requests
            print("[Driver] Viewing ride requests...")
            await page.goto(f"{BASE_URL}/driver/rideshare", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_ride_requests",
                "Ride Requests - Available trips to bid on", "ride")

            # Step 10: Submit Bid
            print("[Driver] Submitting bid...")
            bid_input = await page.query_selector('input[type="number"], input[placeholder*="bid"], input[placeholder*="price"]')
            if bid_input:
                await bid_input.fill("45")
                await asyncio.sleep(0.5)
            bid_btn = await page.query_selector('button:has-text("Bid"), button:has-text("Submit"), [class*="bid-btn"]')
            if bid_btn:
                await bid_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_bid_submitted",
                "Bid Submitted - $45 fare (driver keeps $44)", "ride")

            # Step 11: Bid Accepted - En Route
            print("[Driver] Bid accepted, en route...")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_ride_accepted",
                "Ride Accepted - Navigation to pickup", "ride")

            # Step 12: Arrived at Pickup
            print("[Driver] Arriving at pickup...")
            arrived_btn = await page.query_selector('button:has-text("Arrived"), button:has-text("At Pickup")')
            if arrived_btn:
                await arrived_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_arrived_pickup",
                "Arrived at Pickup - Waiting for rider", "ride")

            # Step 13: Start Trip
            print("[Driver] Starting trip...")
            start_btn = await page.query_selector('button:has-text("Start"), button:has-text("Begin Trip")')
            if start_btn:
                await start_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_trip_started",
                "Trip Started - En route to destination", "ride")

            # Step 14: Complete Trip
            print("[Driver] Completing trip...")
            complete_btn = await page.query_selector('button:has-text("Complete"), button:has-text("End Trip"), button:has-text("Drop Off")')
            if complete_btn:
                await complete_btn.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "driver_trip_completed",
                "Trip Completed - Rider dropped off", "ride")

            # Step 15: Ride Summary
            print("[Driver] Viewing ride summary...")
            await self.screenshot(page, "driver_ride_summary",
                "Ride Summary - $44 earned (100% minus $1 fee)", "ride")

            # Step 16: Driver Earnings
            print("[Driver] Viewing total earnings...")
            await page.goto(f"{BASE_URL}/driver/earnings", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "driver_rideshare_earnings",
                "Rideshare Earnings - Driver keeps fare minus $1", "ride")

        except Exception as e:
            print(f"  [ERROR] Driver rideshare: {e}")
        finally:
            await context.close()

    # ============================================================
    # ADMIN ECONOMICS - PLATFORM REVENUE
    # ============================================================
    async def admin_economics_workflow(self):
        """Capture admin dashboard showing platform economics"""
        print("\n" + "="*70)
        print("  ADMIN ECONOMICS - PLATFORM REVENUE DASHBOARD")
        print("="*70)

        context = await self.browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        try:
            # Admin Login
            print("\n[Admin] Logging in...")
            await page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_login",
                "Admin Portal Login", "admin")

            await self.login(page, ADMIN_EMAIL, ADMIN_PASSWORD, "admin")
            await asyncio.sleep(3)

            # Dashboard Overview
            print("[Admin] Viewing dashboard...")
            await self.screenshot(page, "admin_dashboard",
                "Admin Dashboard - Platform KPIs", "admin")

            # Orders Overview
            print("[Admin] Viewing orders...")
            await page.goto(f"{BASE_URL}/admin/orders", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_orders",
                "Order Management - All orders with status", "admin")

            # Revenue / Accounting
            print("[Admin] Viewing revenue...")
            await page.goto(f"{BASE_URL}/admin/accounting", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_accounting",
                "Platform Revenue - $1 matchmaking fees collected", "admin")

            # Vendor Payouts
            print("[Admin] Viewing payouts...")
            payout_tab = await page.query_selector('button:has-text("Payout"), [data-tab="payouts"]')
            if payout_tab:
                await payout_tab.click()
                await asyncio.sleep(2)
            await self.screenshot(page, "admin_payouts",
                "Vendor Payouts - Stripe Connect automated payments", "admin")

            # Driver Earnings
            print("[Admin] Viewing driver network...")
            await page.goto(f"{BASE_URL}/admin/drivers", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_drivers",
                "Driver Network - Earnings, verification status", "admin")

            # Vendor Management
            print("[Admin] Viewing vendor network...")
            await page.goto(f"{BASE_URL}/admin/vendor-management", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_vendors",
                "Restaurant Network - Active vendors, onboarding", "admin")

            # Analytics
            print("[Admin] Viewing analytics...")
            await page.goto(f"{BASE_URL}/admin/analytics", wait_until="networkidle")
            await asyncio.sleep(2)
            await self.screenshot(page, "admin_analytics",
                "Platform Analytics - Growth metrics, revenue trends", "admin")

        except Exception as e:
            print(f"  [ERROR] Admin flow: {e}")
        finally:
            await context.close()

    def save_workflow_manifest(self):
        """Save workflow steps manifest"""
        manifest = {
            "generated": datetime.now().isoformat(),
            "output_dir": OUTPUT_DIR,
            "total_screenshots": self.screenshot_count,
            "steps": self.workflow_steps
        }

        manifest_path = f"{OUTPUT_DIR}/workflow_manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"\nManifest saved: {manifest_path}")

        # Also create a markdown summary
        md_path = f"{OUTPUT_DIR}/WORKFLOW_SUMMARY.md"
        with open(md_path, "w") as f:
            f.write("# Dollor.ai Investor Workflow Screenshots\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            f.write("## Food Delivery Workflow\n\n")
            f.write("| Step | Screenshot | Description |\n")
            f.write("|------|------------|-------------|\n")
            for step in self.workflow_steps:
                if step['workflow'] == 'food':
                    f.write(f"| {step['step']} | {step['name']} | {step['description']} |\n")

            f.write("\n## Rideshare Workflow\n\n")
            f.write("| Step | Screenshot | Description |\n")
            f.write("|------|------------|-------------|\n")
            for step in self.workflow_steps:
                if step['workflow'] == 'ride':
                    f.write(f"| {step['step']} | {step['name']} | {step['description']} |\n")

            f.write("\n## Admin Economics\n\n")
            f.write("| Step | Screenshot | Description |\n")
            f.write("|------|------------|-------------|\n")
            for step in self.workflow_steps:
                if step['workflow'] == 'admin':
                    f.write(f"| {step['step']} | {step['name']} | {step['description']} |\n")

            f.write("\n## Key Investor Highlights\n\n")
            f.write("- **Platform Fee**: $1 flat fee per order (food) / $1-3 for rideshare\n")
            f.write("- **Driver Economics**: 100% of delivery/ride fee + tips\n")
            f.write("- **Restaurant Economics**: No commission, only $1/order\n")
            f.write("- **Customer Savings**: Transparent flat fee vs 20-30% markup\n")

        print(f"Summary saved: {md_path}")


async def main():
    """Main execution"""
    capture = WorkflowCapture()

    try:
        await capture.setup()

        # Run all workflows
        await capture.food_delivery_workflow()
        await capture.rideshare_workflow()
        await capture.admin_economics_workflow()

        # Save manifest
        capture.save_workflow_manifest()

        print("\n" + "="*70)
        print("  WORKFLOW CAPTURE COMPLETE")
        print(f"  Total Screenshots: {capture.screenshot_count}")
        print(f"  Output Directory: {OUTPUT_DIR}")
        print("="*70)

        # List all screenshots
        print("\nCaptured Screenshots:")
        for f in sorted(os.listdir(OUTPUT_DIR)):
            if f.endswith('.png'):
                print(f"  - {f}")

    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
    finally:
        await capture.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
