#!/usr/bin/env python3
"""
Investor Deck Screenshot Capture Tool
Captures key screens from all Dollor.ai platforms for investor presentations
"""

import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Production URLs
BASE_URL = "https://www.dollor.ai"
API_URL = "https://api.dollor.ai"

# Output directory
OUTPUT_DIR = "screenshots/investor_deck"

# Credentials
ADMIN_EMAIL = "support@dollor.ai"
ADMIN_PASSWORD = "DollorAdmin2026"
CUSTOMER_EMAIL = "demo.customer@dollor.ai"
CUSTOMER_PASSWORD = "DemoCustomer2025!"
DRIVER_EMAIL = "demo.driver@dollor.ai"
DRIVER_PASSWORD = "DemoDriver2025!"
VENDOR_EMAIL = "demo.restaurant@dollor.ai"
VENDOR_PASSWORD = "DemoRestaurant2025!"


async def setup_browser():
    """Initialize browser with appropriate settings"""
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(headless=True)
    return playwright, browser


async def save_screenshot(page, name, description=""):
    """Save screenshot with timestamp"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{OUTPUT_DIR}/{name}.png"
    await page.screenshot(path=filename, full_page=False)
    print(f"  Saved: {filename} - {description}")
    return filename


async def try_login(page, email, password):
    """Try various login form selectors"""
    selectors = [
        ('input[type="email"]', 'input[type="password"]'),
        ('input[name="email"]', 'input[name="password"]'),
        ('input[placeholder*="email" i]', 'input[placeholder*="password" i]'),
        ('input#email', 'input#password'),
        ('#email', '#password'),
    ]

    for email_sel, pass_sel in selectors:
        try:
            email_input = await page.query_selector(email_sel)
            pass_input = await page.query_selector(pass_sel)
            if email_input and pass_input:
                await email_input.fill(email)
                await pass_input.fill(password)
                # Find submit button
                submit = await page.query_selector('button[type="submit"]') or \
                         await page.query_selector('button:has-text("Login")') or \
                         await page.query_selector('button:has-text("Sign In")')
                if submit:
                    await submit.click()
                    await page.wait_for_load_state("networkidle")
                    await asyncio.sleep(2)
                    return True
        except Exception:
            continue
    return False


async def capture_admin_screenshots(browser):
    """Capture Admin Panel screenshots"""
    print("\n=== ADMIN PANEL SCREENSHOTS ===")
    context = await browser.new_context(viewport={"width": 1920, "height": 1080})
    page = await context.new_page()

    try:
        # Login
        print("Logging in to Admin...")
        await page.goto(f"{BASE_URL}/admin/login", wait_until="networkidle")
        await asyncio.sleep(2)

        # Try login
        success = await try_login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
        if not success:
            # Take screenshot of login page for debugging
            await save_screenshot(page, "00_admin_login", "Admin login page")
            print("  Could not find login form, saved login page screenshot")

        await asyncio.sleep(2)

        # Dashboard - try to navigate regardless
        print("Capturing Dashboard...")
        await page.goto(f"{BASE_URL}/admin", wait_until="networkidle")
        await asyncio.sleep(3)
        await save_screenshot(page, "01_admin_dashboard", "Platform metrics & KPIs")

        # Restaurant/Vendor Management
        print("Capturing Vendor Management...")
        await page.goto(f"{BASE_URL}/admin/vendor-management", wait_until="networkidle")
        await asyncio.sleep(3)
        await save_screenshot(page, "02_admin_restaurants", "Partner restaurant network")

        # Orders
        print("Capturing Orders...")
        await page.goto(f"{BASE_URL}/admin/orders", wait_until="networkidle")
        await asyncio.sleep(3)
        await save_screenshot(page, "03_admin_orders", "Order transaction volume")

        # Accounting/Revenue
        print("Capturing Revenue...")
        await page.goto(f"{BASE_URL}/admin/accounting", wait_until="networkidle")
        await asyncio.sleep(3)
        await save_screenshot(page, "04_admin_revenue", "Platform revenue & payouts")

        # Drivers
        print("Capturing Drivers...")
        await page.goto(f"{BASE_URL}/admin/drivers", wait_until="networkidle")
        await asyncio.sleep(3)
        await save_screenshot(page, "05_admin_drivers", "Driver network")

    except Exception as e:
        print(f"  Error in admin screenshots: {e}")
    finally:
        await context.close()


async def capture_customer_web_screenshots(browser):
    """Capture Customer Web App screenshots"""
    print("\n=== CUSTOMER WEB SCREENSHOTS ===")
    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Homepage
        print("Capturing Homepage...")
        await page.goto(f"{BASE_URL}", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "06_customer_homepage", "Landing page & value prop")

        # Restaurant Discovery
        print("Capturing Restaurant Discovery...")
        await page.goto(f"{BASE_URL}/customer/restaurants", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "07_customer_restaurants", "Restaurant discovery")

        # Rideshare booking
        print("Capturing Rideshare...")
        await page.goto(f"{BASE_URL}/customer/rideshare", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "08_customer_rideshare", "Rideshare booking")

    except Exception as e:
        print(f"  Error in customer web screenshots: {e}")
    finally:
        await context.close()


async def capture_driver_web_screenshots(browser):
    """Capture Driver Portal screenshots"""
    print("\n=== DRIVER PORTAL SCREENSHOTS ===")
    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Driver login page
        print("Capturing Driver Login...")
        await page.goto(f"{BASE_URL}/driver/login", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "09_driver_login", "Driver portal login")

        # Driver application page
        print("Capturing Driver Application...")
        await page.goto(f"{BASE_URL}/driver/apply", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "10_driver_apply", "Become a driver")

    except Exception as e:
        print(f"  Error in driver screenshots: {e}")
    finally:
        await context.close()


async def capture_vendor_web_screenshots(browser):
    """Capture Vendor/Restaurant Portal screenshots"""
    print("\n=== VENDOR PORTAL SCREENSHOTS ===")
    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    page = await context.new_page()

    try:
        # Vendor login page
        print("Capturing Vendor Login...")
        await page.goto(f"{BASE_URL}/vendor/login", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "11_vendor_login", "Restaurant portal login")

        # Restaurant application page
        print("Capturing Restaurant Application...")
        await page.goto(f"{BASE_URL}/restaurant/apply", wait_until="networkidle")
        await asyncio.sleep(2)
        await save_screenshot(page, "12_restaurant_apply", "Partner with us")

    except Exception as e:
        print(f"  Error in vendor screenshots: {e}")
    finally:
        await context.close()


async def capture_mobile_mockup_info():
    """Print information about mobile app screenshots"""
    print("\n=== MOBILE APP SCREENSHOTS (Manual) ===")
    print("""
For mobile app screenshots, use the iOS/Android simulators:

iOS CUSTOMER APP:
  1. Open Xcode > Open apps/ios/customer/eatfaircustomer.xcworkspace
  2. Run on iPhone 15 Pro simulator
  3. Key screens to capture:
     - Home/Restaurant Discovery
     - Restaurant Detail with Menu
     - Cart & Checkout
     - Order Tracking
     - Profile/Settings

iOS DRIVER APP:
  1. Open Xcode > Open apps/ios/delivery/eatffairdelivery.xcworkspace
  2. Run on iPhone 15 Pro simulator
  3. Key screens to capture:
     - Dashboard with earnings
     - Available deliveries/rides
     - Active delivery navigation
     - Earnings history

ANDROID CUSTOMER APP:
  1. Open Android Studio > Open apps/android
  2. Run 'app' module on Pixel 7 emulator
  3. Same screens as iOS

ANDROID DRIVER APP:
  1. Run 'orderapp' module on Pixel 7 emulator
  2. Same screens as iOS driver

Use CMD+S (Mac) or Ctrl+S (Windows) in simulator to save screenshots.
""")


async def main():
    """Main function to capture all screenshots"""
    print("=" * 60)
    print("DOLLOR.AI INVESTOR DECK SCREENSHOT CAPTURE")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    playwright, browser = await setup_browser()

    try:
        # Capture web screenshots
        await capture_admin_screenshots(browser)
        await capture_customer_web_screenshots(browser)
        await capture_driver_web_screenshots(browser)
        await capture_vendor_web_screenshots(browser)

        # Print mobile instructions
        await capture_mobile_mockup_info()

        print("\n" + "=" * 60)
        print("SCREENSHOT CAPTURE COMPLETE")
        print(f"Output directory: {OUTPUT_DIR}/")
        print("=" * 60)

    finally:
        await browser.close()
        await playwright.stop()


if __name__ == "__main__":
    asyncio.run(main())
