#!/usr/bin/env python3
"""
Investor Deck Screenshot Capture Tool v2
Captures INTERNAL screens from all Dollor.ai platforms for investor presentations
Includes: Admin Dashboard, Stripe Payouts, Financial Reports, Mobile App Screens
"""

import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Production URLs
BASE_URL = "https://www.dollor.ai"
API_URL = "https://api.dollor.ai"
STAGING_URL = "https://d3kuu45w6kl8hr.cloudfront.net"

# Output directory with timestamp
TIMESTAMP = datetime.now().strftime('%Y%m%d_%H%M%S')
OUTPUT_DIR = f"screenshots/investor_deck_{TIMESTAMP}"

# Credentials
ADMIN_EMAIL = "admin.invoice@dollor.ai"
ADMIN_PASSWORD = "AdminTest123"
CUSTOMER_EMAIL = "demo.customer@dollor.ai"
CUSTOMER_PASSWORD = "DemoCustomer2025!"
DRIVER_EMAIL = "demo.driver@dollor.ai"
DRIVER_PASSWORD = "DemoDriver2025!"
VENDOR_EMAIL = "demo.restaurant@dollor.ai"
VENDOR_PASSWORD = "DemoRestaurant2025!"


async def setup_browser():
    """Initialize browser with appropriate settings"""
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(headless=False)  # Show browser for debugging
    return playwright, browser


async def save_screenshot(page, name, description=""):
    """Save screenshot with proper naming"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{OUTPUT_DIR}/{name}.png"
    await page.screenshot(path=filename, full_page=False)
    print(f"  [OK] Saved: {filename}")
    print(f"       Description: {description}")
    return filename


async def wait_and_screenshot(page, name, description, wait_time=3):
    """Wait for content to load then screenshot"""
    await asyncio.sleep(wait_time)
    await save_screenshot(page, name, description)


# ============================================================
# ADMIN PORTAL - Internal Dashboard & Financial Screens
# ============================================================
async def capture_admin_internal_screenshots(browser):
    """Capture Admin Panel INTERNAL screenshots with actual data"""
    print("\n" + "=" * 60)
    print("ADMIN PORTAL - INTERNAL SCREENS")
    print("=" * 60)

    context = await browser.new_context(viewport={"width": 1920, "height": 1080})
    page = await context.new_page()

    try:
        # Navigate to admin login
        print("\n[1] Logging in to Admin Portal...")
        await page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
        await asyncio.sleep(2)

        # Check if already on dashboard or need to login
        current_url = page.url
        print(f"    Current URL: {current_url}")

        # Try to find and fill login form
        try:
            email_input = await page.query_selector('input[type="email"], input[name="email"], #email')
            if email_input:
                await email_input.fill(ADMIN_EMAIL)
                pass_input = await page.query_selector('input[type="password"], input[name="password"], #password')
                if pass_input:
                    await pass_input.fill(ADMIN_PASSWORD)

                # Click login button
                login_btn = await page.query_selector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')
                if login_btn:
                    await login_btn.click()
                    await page.wait_for_load_state("networkidle")
                    await asyncio.sleep(3)
                    print("    Login submitted, waiting for dashboard...")
        except Exception as e:
            print(f"    Note: {e}")

        # Capture Admin Dashboard
        print("\n[2] Capturing Admin Dashboard...")
        await page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
        await wait_and_screenshot(page, "01_admin_dashboard",
            "Main dashboard with KPIs: Total Orders, Revenue, Active Users, Growth Metrics")

        # Capture Orders Management
        print("\n[3] Capturing Orders Management...")
        await page.goto(f"{BASE_URL}/admin/orders", wait_until="networkidle")
        await wait_and_screenshot(page, "02_admin_orders",
            "Real-time order management: Order list, status tracking, delivery assignments")

        # Capture Accounting/Revenue Dashboard
        print("\n[4] Capturing Financial Dashboard...")
        await page.goto(f"{BASE_URL}/admin/accounting", wait_until="networkidle")
        await wait_and_screenshot(page, "03_admin_accounting",
            "Platform revenue: $1 matchmaking fees, vendor payouts, driver earnings")

        # Capture Vendor Payouts (Stripe Connect)
        print("\n[5] Capturing Vendor Payouts (Stripe)...")
        await page.goto(f"{BASE_URL}/admin/accounting", wait_until="networkidle")
        await asyncio.sleep(2)
        # Try to click on payouts tab if exists
        payout_tab = await page.query_selector('button:has-text("Payout"), a:has-text("Payout"), [data-tab="payouts"]')
        if payout_tab:
            await payout_tab.click()
            await asyncio.sleep(2)
        await wait_and_screenshot(page, "04_admin_stripe_payouts",
            "Stripe Connect payouts: Automated vendor payments, payout history")

        # Capture Invoice Management
        print("\n[6] Capturing Invoice Management...")
        await page.goto(f"{BASE_URL}/admin/invoices", wait_until="networkidle")
        await wait_and_screenshot(page, "05_admin_invoices",
            "Invoice management: Automated invoicing, payment tracking")

        # Capture Vendor/Restaurant Management
        print("\n[7] Capturing Restaurant Network...")
        await page.goto(f"{BASE_URL}/admin/vendor-management", wait_until="networkidle")
        await wait_and_screenshot(page, "06_admin_vendors",
            "Partner restaurant network: Active vendors, verification status, onboarding")

        # Capture Driver Management
        print("\n[8] Capturing Driver Network...")
        await page.goto(f"{BASE_URL}/admin/drivers", wait_until="networkidle")
        await wait_and_screenshot(page, "07_admin_drivers",
            "Driver network: Active drivers, earnings, verification status")

        # Capture Customer Management
        print("\n[9] Capturing Customer Base...")
        await page.goto(f"{BASE_URL}/admin/customers", wait_until="networkidle")
        await wait_and_screenshot(page, "08_admin_customers",
            "Customer base: User growth, retention metrics, order history")

        # Try to capture Stripe Dashboard link
        print("\n[10] Capturing Analytics...")
        await page.goto(f"{BASE_URL}/admin/analytics", wait_until="networkidle")
        await wait_and_screenshot(page, "09_admin_analytics",
            "Platform analytics: Growth charts, revenue trends, user acquisition")

    except Exception as e:
        print(f"  [ERROR] Admin screenshots: {e}")
        await save_screenshot(page, "admin_error", f"Error state: {e}")
    finally:
        await context.close()


# ============================================================
# CUSTOMER WEB APP - Internal Screens
# ============================================================
async def capture_customer_internal_screenshots(browser):
    """Capture Customer App INTERNAL screenshots"""
    print("\n" + "=" * 60)
    print("CUSTOMER APP - INTERNAL SCREENS")
    print("=" * 60)

    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Login as customer
        print("\n[1] Logging in as Customer...")
        await page.goto(f"{BASE_URL}/customer/login", wait_until="networkidle")
        await asyncio.sleep(2)

        try:
            email_input = await page.query_selector('input[type="email"], input[name="email"]')
            if email_input:
                await email_input.fill(CUSTOMER_EMAIL)
                pass_input = await page.query_selector('input[type="password"]')
                if pass_input:
                    await pass_input.fill(CUSTOMER_PASSWORD)
                    login_btn = await page.query_selector('button[type="submit"]')
                    if login_btn:
                        await login_btn.click()
                        await page.wait_for_load_state("networkidle")
                        await asyncio.sleep(3)
        except Exception as e:
            print(f"    Note: {e}")

        # Homepage/Restaurant Discovery
        print("\n[2] Capturing Restaurant Discovery...")
        await page.goto(f"{BASE_URL}/customer", wait_until="networkidle")
        await wait_and_screenshot(page, "10_customer_home",
            "Customer home: Restaurant discovery, featured deals, AI recommendations")

        # Restaurant Listing
        print("\n[3] Capturing Restaurant List...")
        await page.goto(f"{BASE_URL}/customer/restaurants", wait_until="networkidle")
        await wait_and_screenshot(page, "11_customer_restaurants",
            "Restaurant listing: Browse restaurants, ratings, delivery time estimates")

        # Rideshare Booking
        print("\n[4] Capturing Rideshare...")
        await page.goto(f"{BASE_URL}/customer/rideshare", wait_until="networkidle")
        await wait_and_screenshot(page, "12_customer_rideshare",
            "Rideshare: Request ride, negotiate price, driver bidding system")

        # Orders History
        print("\n[5] Capturing Order History...")
        await page.goto(f"{BASE_URL}/customer/orders", wait_until="networkidle")
        await wait_and_screenshot(page, "13_customer_orders",
            "Order history: Past orders, reorder, delivery tracking")

        # Profile/Account
        print("\n[6] Capturing Profile...")
        await page.goto(f"{BASE_URL}/customer/profile", wait_until="networkidle")
        await wait_and_screenshot(page, "14_customer_profile",
            "Customer profile: Account settings, payment methods, saved addresses")

    except Exception as e:
        print(f"  [ERROR] Customer screenshots: {e}")
    finally:
        await context.close()


# ============================================================
# DRIVER PORTAL - Internal Screens
# ============================================================
async def capture_driver_internal_screenshots(browser):
    """Capture Driver App INTERNAL screenshots"""
    print("\n" + "=" * 60)
    print("DRIVER APP - INTERNAL SCREENS")
    print("=" * 60)

    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Login as driver
        print("\n[1] Logging in as Driver...")
        await page.goto(f"{BASE_URL}/driver/login", wait_until="networkidle")
        await asyncio.sleep(2)

        try:
            email_input = await page.query_selector('input[type="email"], input[name="email"]')
            if email_input:
                await email_input.fill(DRIVER_EMAIL)
                pass_input = await page.query_selector('input[type="password"]')
                if pass_input:
                    await pass_input.fill(DRIVER_PASSWORD)
                    login_btn = await page.query_selector('button[type="submit"]')
                    if login_btn:
                        await login_btn.click()
                        await page.wait_for_load_state("networkidle")
                        await asyncio.sleep(3)
        except Exception as e:
            print(f"    Note: {e}")

        # Driver Dashboard
        print("\n[2] Capturing Driver Dashboard...")
        await page.goto(f"{BASE_URL}/driver", wait_until="networkidle")
        await wait_and_screenshot(page, "15_driver_dashboard",
            "Driver dashboard: Today's earnings, online status, delivery stats")

        # Available Orders
        print("\n[3] Capturing Available Deliveries...")
        await page.goto(f"{BASE_URL}/driver/orders", wait_until="networkidle")
        await wait_and_screenshot(page, "16_driver_available_orders",
            "Available orders: Delivery requests, pickup locations, estimated earnings")

        # Earnings
        print("\n[4] Capturing Earnings...")
        await page.goto(f"{BASE_URL}/driver/earnings", wait_until="networkidle")
        await wait_and_screenshot(page, "17_driver_earnings",
            "Driver earnings: Weekly summary, tips, instant payout option")

        # Rideshare Requests
        print("\n[5] Capturing Rideshare...")
        await page.goto(f"{BASE_URL}/driver/rideshare", wait_until="networkidle")
        await wait_and_screenshot(page, "18_driver_rideshare",
            "Rideshare: Bid on rides, negotiation system, driver keeps 100%")

        # Profile/Documents
        print("\n[6] Capturing Driver Profile...")
        await page.goto(f"{BASE_URL}/driver/profile", wait_until="networkidle")
        await wait_and_screenshot(page, "19_driver_profile",
            "Driver profile: Documents, vehicle info, verification status")

    except Exception as e:
        print(f"  [ERROR] Driver screenshots: {e}")
    finally:
        await context.close()


# ============================================================
# RESTAURANT/VENDOR PORTAL - Internal Screens
# ============================================================
async def capture_vendor_internal_screenshots(browser):
    """Capture Restaurant Portal INTERNAL screenshots"""
    print("\n" + "=" * 60)
    print("RESTAURANT PORTAL - INTERNAL SCREENS")
    print("=" * 60)

    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Login as vendor
        print("\n[1] Logging in as Restaurant...")
        await page.goto(f"{BASE_URL}/vendor/login", wait_until="networkidle")
        await asyncio.sleep(2)

        try:
            email_input = await page.query_selector('input[type="email"], input[name="email"]')
            if email_input:
                await email_input.fill(VENDOR_EMAIL)
                pass_input = await page.query_selector('input[type="password"]')
                if pass_input:
                    await pass_input.fill(VENDOR_PASSWORD)
                    login_btn = await page.query_selector('button[type="submit"]')
                    if login_btn:
                        await login_btn.click()
                        await page.wait_for_load_state("networkidle")
                        await asyncio.sleep(3)
        except Exception as e:
            print(f"    Note: {e}")

        # Restaurant Dashboard
        print("\n[2] Capturing Restaurant Dashboard...")
        await page.goto(f"{BASE_URL}/vendor", wait_until="networkidle")
        await wait_and_screenshot(page, "20_vendor_dashboard",
            "Restaurant dashboard: Today's orders, revenue, order queue")

        # Order Management
        print("\n[3] Capturing Order Management...")
        await page.goto(f"{BASE_URL}/vendor/orders", wait_until="networkidle")
        await wait_and_screenshot(page, "21_vendor_orders",
            "Order management: Incoming orders, preparation status, driver assignment")

        # Menu Management
        print("\n[4] Capturing Menu Management...")
        await page.goto(f"{BASE_URL}/vendor/menu", wait_until="networkidle")
        await wait_and_screenshot(page, "22_vendor_menu",
            "Menu management: Items, pricing, availability, categories")

        # Analytics
        print("\n[5] Capturing Analytics...")
        await page.goto(f"{BASE_URL}/vendor/analytics", wait_until="networkidle")
        await wait_and_screenshot(page, "23_vendor_analytics",
            "Restaurant analytics: Sales trends, popular items, peak hours")

        # Payouts/Earnings
        print("\n[6] Capturing Payouts...")
        await page.goto(f"{BASE_URL}/vendor/payouts", wait_until="networkidle")
        await wait_and_screenshot(page, "24_vendor_payouts",
            "Vendor payouts: Stripe Connect earnings, payout schedule, transaction history")

        # Settings
        print("\n[7] Capturing Settings...")
        await page.goto(f"{BASE_URL}/vendor/settings", wait_until="networkidle")
        await wait_and_screenshot(page, "25_vendor_settings",
            "Restaurant settings: Hours, delivery zones, self-delivery toggle")

    except Exception as e:
        print(f"  [ERROR] Vendor screenshots: {e}")
    finally:
        await context.close()


# ============================================================
# MAIN EXECUTION
# ============================================================
async def main():
    """Main function to capture all investor screenshots"""
    print("\n" + "=" * 70)
    print("    DOLLOR.AI INVESTOR SCREENSHOT CAPTURE v2")
    print("    Capturing Internal Platform Screens")
    print(f"    Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    playwright, browser = await setup_browser()

    try:
        # Capture all internal screenshots
        await capture_admin_internal_screenshots(browser)
        await capture_customer_internal_screenshots(browser)
        await capture_driver_internal_screenshots(browser)
        await capture_vendor_internal_screenshots(browser)

        print("\n" + "=" * 70)
        print("    SCREENSHOT CAPTURE COMPLETE")
        print(f"    Output: {OUTPUT_DIR}/")
        print("=" * 70)

        # List all captured screenshots
        print("\nCaptured Screenshots:")
        for f in sorted(os.listdir(OUTPUT_DIR)):
            if f.endswith('.png'):
                print(f"  - {f}")

        print(f"\nTotal: {len([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.png')])} screenshots")
        print("\nKey Investor Highlights:")
        print("  - Admin Dashboard: Platform metrics, KPIs, growth")
        print("  - Financial: Revenue ($1 matchmaking fees), Stripe payouts")
        print("  - Customer App: Restaurant discovery, ordering, rideshare")
        print("  - Driver App: Earnings (100% of delivery + tips), available orders")
        print("  - Restaurant: Order management, menu, analytics, payouts")

    finally:
        await browser.close()
        await playwright.stop()


if __name__ == "__main__":
    asyncio.run(main())
