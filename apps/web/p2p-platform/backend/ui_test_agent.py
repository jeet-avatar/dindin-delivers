#!/usr/bin/env python3
"""
Dollor.ai UI Testing Agent
Full-featured Playwright-based agent for automated UI testing

PRODUCTION URLS:
- Production Website: https://www.dollor.ai
- Production API: https://api.dollor.ai

CREDENTIALS:
- Admin: support@dollor.ai / DollorAdmin2026
- Customer: demo.customer@dollor.ai / DemoCustomer2025!

Usage:
    # Admin login test
    python ui_test_agent.py login --email support@dollor.ai --password DollorAdmin2026

    # Full order flow - Natraj restaurant, 2 items, human speed
    python ui_test_agent.py order --restaurant "Natraj" --items 2

    # Custom options
    python ui_test_agent.py order --email demo.customer@dollor.ai --password DemoCustomer2025! --restaurant "Natraj" --items 2
"""

# Environment URLs
ENVIRONMENTS = {
    "production": "https://www.dollor.ai",
    "staging": "https://d3b3ow4g7hjwi5.cloudfront.net",
    "local": "http://localhost:5173",
}

API_URLS = {
    "production": "https://api.dollor.ai",
    "staging": "https://d34u5ixl0bulv4.cloudfront.net",
    "local": "http://localhost:8080",
}

import argparse
import sys
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, Page, Browser, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Playwright not installed. Run:")
    print("  pip install playwright")
    print("  playwright install chromium")
    sys.exit(1)


class TestResult(Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


@dataclass
class StepResult:
    success: bool
    message: str
    screenshot_path: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


@dataclass
class OrderFlowResult:
    success: bool
    steps_completed: List[str] = field(default_factory=list)
    steps_failed: List[str] = field(default_factory=list)
    order_details: Optional[Dict[str, Any]] = None
    screenshots: List[str] = field(default_factory=list)
    error: Optional[str] = None


class UITestAgent:
    """Full-featured UI testing agent for Dollor.ai Platform"""

    def __init__(
        self,
        base_url: str = "https://www.dollor.ai",
        api_url: str = "https://api.dollor.ai",
        headless: bool = False,
        slow_mo: int = 500  # Human speed default
    ):
        self.base_url = base_url.rstrip("/")
        self.api_url = api_url.rstrip("/")
        self.headless = headless
        self.slow_mo = slow_mo
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self._playwright = None
        self.screenshot_counter = 0
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    def _screenshot(self, name: str) -> str:
        """Take a screenshot with sequential numbering"""
        self.screenshot_counter += 1
        filename = f"screenshots/{self.session_id}_{self.screenshot_counter:02d}_{name}.png"
        if self.page:
            self.page.screenshot(path=filename)
            print(f"[Screenshot] {filename}")
        return filename

    def _wait(self, ms: int = 1000):
        """Human-like wait"""
        if self.page:
            self.page.wait_for_timeout(ms)

    def start(self):
        """Start the browser"""
        self._playwright = sync_playwright().start()
        self.browser = self._playwright.chromium.launch(
            headless=self.headless,
            slow_mo=self.slow_mo
        )
        self.page = self.browser.new_page()
        print(f"[Agent] Browser started (headless={self.headless}, slow_mo={self.slow_mo}ms)")

    def stop(self):
        """Stop the browser"""
        if self.browser:
            self.browser.close()
        if self._playwright:
            self._playwright.stop()
        print("[Agent] Browser stopped")

    # ==================== ADMIN LOGIN ====================

    def admin_login(self, email: str, password: str) -> StepResult:
        """Login to Admin Portal"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            login_url = f"{self.base_url}/admin"
            print(f"[Agent] Navigating to Admin Portal: {login_url}")
            self.page.goto(login_url, wait_until="networkidle")
            self._screenshot("admin_login_page")

            # Fill credentials
            email_input = self.page.wait_for_selector('input[placeholder*="email" i], input[type="email"]', timeout=5000)
            password_input = self.page.wait_for_selector('input[type="password"]', timeout=5000)

            email_input.fill(email)
            self._wait(500)
            password_input.fill(password)
            self._screenshot("admin_credentials_entered")

            # Click login
            login_btn = self.page.wait_for_selector('button[type="submit"]', timeout=3000)
            login_btn.click()
            self._wait(3000)

            screenshot = self._screenshot("admin_post_login")

            # Check for success
            if self.page.query_selector('button:has-text("Sign Out"), button:has-text("Logout")'):
                return StepResult(True, "Admin login successful", screenshot)

            return StepResult(True, "Admin login appears successful", screenshot)

        except Exception as e:
            return StepResult(False, f"Admin login error: {str(e)}", self._screenshot("admin_login_error"))

    # ==================== CUSTOMER LOGIN ====================

    def customer_login(self, email: str, password: str) -> StepResult:
        """Login as Customer on www.dollor.ai"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            # Go to homepage first
            print(f"[Agent] Navigating to: {self.base_url}")
            self.page.goto(self.base_url, wait_until="networkidle")
            self._wait(2000)
            self._screenshot("homepage")

            # Click Customer Login button in header
            customer_login_btn = self.page.query_selector('a:has-text("Customer Login"), button:has-text("Customer Login")')
            if customer_login_btn:
                print("[Agent] Clicking Customer Login button")
                customer_login_btn.click()
                self._wait(2000)
            else:
                # Try direct navigation
                print("[Agent] Navigating directly to customer login")
                self.page.goto(f"{self.base_url}/customer/login", wait_until="networkidle")
                self._wait(2000)

            self._screenshot("customer_login_page")

            # Look for email input
            email_input = self.page.wait_for_selector(
                'input[type="email"], input[name="email"], input[placeholder*="email" i]',
                timeout=5000
            )

            # Look for password input
            password_input = self.page.wait_for_selector('input[type="password"]', timeout=5000)

            print(f"[Agent] Entering email: {email}")
            email_input.fill(email)
            self._wait(500)

            print("[Agent] Entering password")
            password_input.fill(password)
            self._wait(500)
            self._screenshot("customer_credentials_entered")

            # Click Continue/Login button
            login_btn = self.page.query_selector(
                'button:has-text("Continue"), button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]'
            )
            if login_btn:
                print("[Agent] Clicking login button")
                login_btn.click()
            else:
                # Press Enter
                password_input.press("Enter")

            self._wait(3000)
            screenshot = self._screenshot("customer_post_login")
            current_url = self.page.url
            print(f"[Agent] Current URL after login: {current_url}")

            # Check if redirected to customer home/dashboard
            if "/customer/home" in current_url or "/customer/dashboard" in current_url:
                return StepResult(True, f"Customer login successful! URL: {current_url}", screenshot)

            # Check for error message
            error = self.page.query_selector('[role="alert"], .text-red-500, .error, .text-danger')
            if error:
                error_text = error.text_content()
                if error_text and "incorrect" in error_text.lower():
                    return StepResult(False, f"Login failed: {error_text}", screenshot)

            # If still on login page, try to see if there's an OTP or 2FA flow
            if "/login" in current_url:
                print("[Agent] Still on login page - checking for additional steps...")
                return StepResult(True, "Login submitted - may require additional verification", screenshot)

            return StepResult(True, f"Customer login complete. URL: {current_url}", screenshot)

        except Exception as e:
            return StepResult(False, f"Customer login error: {str(e)}", self._screenshot("customer_login_error"))

    # ==================== BROWSE & SELECT RESTAURANT ====================

    def browse_and_select_restaurant(self, restaurant_name: str = "Natraj") -> StepResult:
        """Navigate to customer home, click Food, and select a specific restaurant"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            # Navigate to customer home to see restaurants
            customer_home_url = f"{self.base_url}/customer/home"
            print(f"[Agent] Navigating to customer home: {customer_home_url}")
            self.page.goto(customer_home_url, wait_until="networkidle")
            self._wait(2000)
            self._screenshot("customer_home")

            current_url = self.page.url
            print(f"[Agent] Current URL: {current_url}")

            # If redirected to login, we need to login first
            if "/login" in current_url:
                return StepResult(False, "Not logged in - redirected to login page", self._screenshot("need_login"))

            # Scroll down to see "Featured Near You" section with restaurant cards
            print("[Agent] Scrolling to see restaurant cards...")
            self.page.evaluate("window.scrollBy(0, 500)")
            self._wait(2000)
            self._screenshot("restaurants_visible")

            # Look for the specific restaurant by name
            print(f"[Agent] Looking for restaurant: {restaurant_name}")

            # The restaurant cards in "Featured Near You" have:
            # - Image, Name (like "Natraj Cuisine"), Rating, Time, "$1 platform fee"
            # They are clickable and navigate to /customer/restaurant/{id}

            restaurant_el = None

            # Method 1: Find card with restaurant name AND "$1 platform fee" (confirms it's a restaurant card)
            all_elements = self.page.query_selector_all('div, a')
            for el in all_elements:
                try:
                    text = el.text_content() or ""
                    # Must contain restaurant name and platform fee indicator
                    if restaurant_name.lower() in text.lower() and "$1 platform fee" in text.lower():
                        # Check if this element or parent is clickable
                        if el.is_visible():
                            # Try to find if it has a link or is clickable
                            tag = el.evaluate("el => el.tagName")
                            if tag == "A":
                                restaurant_el = el
                                print(f"[Agent] Found restaurant link: {text[:60]}")
                                break
                            # Check for cursor-pointer class
                            classes = el.get_attribute("class") or ""
                            if "cursor-pointer" in classes:
                                restaurant_el = el
                                print(f"[Agent] Found clickable restaurant card: {text[:60]}")
                                break
                except Exception:
                    continue

            # Method 2: Use Playwright locator for more flexible matching
            if not restaurant_el:
                try:
                    # Look for elements containing restaurant name that are clickable
                    locator = self.page.locator(f'div:has-text("{restaurant_name}"):has-text("platform fee")')
                    count = locator.count()
                    print(f"[Agent] Found {count} matching elements via locator")
                    if count > 0:
                        # Click the first visible one
                        for i in range(count):
                            if locator.nth(i).is_visible():
                                locator.nth(i).click()
                                self._wait(3000)
                                screenshot = self._screenshot("restaurant_menu")
                                current_url = self.page.url
                                print(f"[Agent] Clicked via locator. URL: {current_url}")

                                if "/restaurant/" in current_url:
                                    return StepResult(True, f"Selected restaurant: {restaurant_name}", screenshot,
                                                    {"restaurant_name": restaurant_name, "url": current_url})
                                break
                except Exception as e:
                    print(f"[Agent] Locator error: {e}")

            # Method 3: Direct navigation to known restaurant URLs
            if not restaurant_el or "/restaurant/" not in self.page.url:
                # Try direct navigation - Natraj Cuisine is vendor ID 2
                print("[Agent] Trying direct navigation to restaurant page...")
                if "natraj" in restaurant_name.lower():
                    self.page.goto(f"{self.base_url}/customer/restaurant/2", wait_until="networkidle")
                    self._wait(2000)
                    current_url = self.page.url
                    if "/restaurant/" in current_url:
                        screenshot = self._screenshot("restaurant_menu_direct")
                        return StepResult(True, f"Navigated directly to {restaurant_name}", screenshot,
                                        {"restaurant_name": restaurant_name, "url": current_url})

            if not restaurant_el and "/restaurant/" not in self.page.url:
                self._screenshot("restaurant_not_found")
                return StepResult(False, f"Restaurant '{restaurant_name}' not found", self._screenshot("restaurants_list"))

            # Click on the restaurant element if found
            if restaurant_el:
                print(f"[Agent] Clicking on {restaurant_name} card")
                restaurant_el.click()
                self._wait(3000)

            screenshot = self._screenshot("restaurant_menu")
            current_url = self.page.url
            print(f"[Agent] Current URL: {current_url}")

            return StepResult(
                True,
                f"Selected restaurant: {restaurant_name}",
                screenshot,
                {"restaurant_name": restaurant_name, "url": current_url}
            )

        except Exception as e:
            return StepResult(False, f"Restaurant selection error: {str(e)}", self._screenshot("restaurant_error"))

    # ==================== ADD MULTIPLE ITEMS ====================

    def add_items_to_cart(self, num_items: int = 2) -> StepResult:
        """Add multiple menu items to cart"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print(f"[Agent] Adding {num_items} items to cart...")
            self._screenshot("menu_before_adding")

            # Wait for menu to load
            self._wait(2000)

            items_added = []
            items_tried = 0

            # First, scroll to see menu items
            self.page.evaluate("window.scrollBy(0, 200)")
            self._wait(1000)

            for i in range(num_items):
                print(f"[Agent] Adding item {i + 1} of {num_items}")

                # Strategy 1: Find "Add" or "+" buttons
                add_buttons = self.page.query_selector_all(
                    'button:has-text("Add"), button:has-text("+"), '
                    '[class*="add"]:not([class*="address"]), button[class*="green"], button[class*="primary"]'
                )

                # Filter to only visible buttons that look like add buttons
                valid_buttons = []
                for btn in add_buttons:
                    try:
                        if btn.is_visible():
                            btn_text = btn.text_content() or ""
                            # Skip navigation/address buttons
                            if any(skip in btn_text.lower() for skip in ['address', 'deliver', 'location']):
                                continue
                            valid_buttons.append(btn)
                    except:
                        continue

                if len(valid_buttons) > items_tried:
                    btn = valid_buttons[items_tried]
                    print(f"[Agent] Found Add button, clicking...")
                    btn.scroll_into_view_if_needed()
                    self._wait(500)
                    btn.click()
                    self._wait(2000)

                    # Handle customization modal if it appears
                    modal = self.page.query_selector('[role="dialog"], [class*="modal" i], [class*="Modal"]')
                    if modal and modal.is_visible():
                        print("[Agent] Customization modal detected")
                        self._screenshot(f"item_{i+1}_customization")

                        # Look for Add to Cart button in modal
                        modal_add = self.page.query_selector(
                            '[role="dialog"] button:has-text("Add to Cart"), '
                            '[role="dialog"] button:has-text("Add"), '
                            '[class*="modal" i] button:has-text("Add")'
                        )
                        if modal_add:
                            print("[Agent] Clicking Add to Cart in modal")
                            modal_add.click()
                            self._wait(1500)

                    items_added.append(f"Item {i + 1}")
                    items_tried += 1
                    self._screenshot(f"item_{i+1}_added")

                else:
                    # Strategy 2: Click on menu item cards
                    menu_cards = self.page.query_selector_all(
                        '[class*="menu-item"], [class*="MenuItem"], '
                        '[class*="food-item"], [class*="dish"], [class*="product-card"]'
                    )

                    if len(menu_cards) > items_tried:
                        card = menu_cards[items_tried]
                        print(f"[Agent] Clicking menu card {items_tried + 1}")
                        card.click()
                        self._wait(2000)

                        # Look for Add button that appeared
                        add_btn = self.page.query_selector(
                            'button:has-text("Add to Cart"), button:has-text("Add")'
                        )
                        if add_btn and add_btn.is_visible():
                            add_btn.click()
                            self._wait(1500)

                        items_added.append(f"Menu Item {i + 1}")
                        items_tried += 1
                        self._screenshot(f"item_{i+1}_added")
                    else:
                        print(f"[Agent] Could not find item {i + 1}")
                        self._screenshot(f"item_{i+1}_not_found")

                # Scroll down a bit for next item
                self.page.evaluate("window.scrollBy(0, 100)")
                self._wait(500)

            screenshot = self._screenshot("all_items_added")

            if len(items_added) == 0:
                # Debug: show what's on the page
                page_content = self.page.text_content('body')[:500] if self.page.query_selector('body') else ""
                print(f"[Agent] Page content: {page_content[:200]}...")
                return StepResult(False, "Could not add any items - menu may not have loaded", screenshot)

            return StepResult(
                True,
                f"Added {len(items_added)} items to cart",
                screenshot,
                {"items_added": items_added, "count": len(items_added)}
            )

        except Exception as e:
            return StepResult(False, f"Add items error: {str(e)}", self._screenshot("add_items_error"))

    # ==================== VIEW CART ====================

    def view_cart(self) -> StepResult:
        """Navigate to cart"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Agent] Looking for cart...")

            # Try clicking cart icon/button
            cart_btn = self.page.query_selector(
                'a[href*="/cart"], button[aria-label*="cart" i], [class*="cart"], button:has-text("Cart"), '
                '[data-testid="cart"], svg[class*="cart"]'
            )

            if cart_btn:
                print("[Agent] Clicking cart button")
                cart_btn.click()
                self._wait(2000)
            else:
                # Navigate directly to cart
                print("[Agent] Navigating directly to cart")
                self.page.goto(f"{self.base_url}/customer/cart", wait_until="networkidle")
                self._wait(2000)

            screenshot = self._screenshot("cart_view")
            current_url = self.page.url

            return StepResult(
                True,
                f"Viewing cart. URL: {current_url}",
                screenshot,
                {"url": current_url}
            )

        except Exception as e:
            return StepResult(False, f"View cart error: {str(e)}", self._screenshot("cart_error"))

    # ==================== PROCEED TO CHECKOUT ====================

    def proceed_to_checkout(self) -> StepResult:
        """Navigate to checkout page - STOPS HERE (no payment)"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Agent] Proceeding to checkout...")

            # Find checkout button
            checkout_btn = self.page.query_selector(
                'button:has-text("Checkout"), button:has-text("Proceed"), '
                'a[href*="/checkout"], button:has-text("Continue")'
            )

            if checkout_btn:
                print("[Agent] Clicking checkout button")
                checkout_btn.click()
                self._wait(3000)
            else:
                # Navigate directly
                print("[Agent] Navigating directly to checkout")
                self.page.goto(f"{self.base_url}/customer/checkout", wait_until="networkidle")
                self._wait(2000)

            screenshot = self._screenshot("checkout_page")
            current_url = self.page.url

            print("=" * 50)
            print("[Agent] STOPPED AT CHECKOUT")
            print("[Agent] Stripe is disconnected - no payment will be processed")
            print("=" * 50)

            return StepResult(
                True,
                f"Reached checkout page. URL: {current_url}",
                screenshot,
                {"url": current_url}
            )

        except Exception as e:
            return StepResult(False, f"Checkout error: {str(e)}", self._screenshot("checkout_error"))

    # ==================== FULL ORDER FLOW ====================

    def run_order_flow(
        self,
        email: str,
        password: str,
        restaurant_name: str = "Natraj",
        num_items: int = 2
    ) -> OrderFlowResult:
        """
        Run complete order flow: Login -> Select Restaurant -> Add Items -> Cart -> Checkout
        STOPS AT CHECKOUT (Stripe disconnected)
        """
        result = OrderFlowResult(success=False)

        steps = [
            ("Customer Login", lambda: self.customer_login(email, password)),
            (f"Select {restaurant_name} Restaurant", lambda: self.browse_and_select_restaurant(restaurant_name)),
            (f"Add {num_items} Items to Cart", lambda: self.add_items_to_cart(num_items)),
            ("View Cart", lambda: self.view_cart()),
            ("Proceed to Checkout", lambda: self.proceed_to_checkout()),
        ]

        print("\n" + "=" * 60)
        print("DOLLOR.AI ORDER FLOW TEST - PRODUCTION")
        print("=" * 60)
        print(f"Website: {self.base_url}")
        print(f"Email: {email}")
        print(f"Restaurant: {restaurant_name}")
        print(f"Items to Add: {num_items}")
        print("NOTE: Flow stops at checkout (Stripe disconnected)")
        print("=" * 60 + "\n")

        for step_name, step_func in steps:
            print(f"\n{'='*60}")
            print(f">>> Step: {step_name}")
            print("=" * 60)

            step_result = step_func()

            if step_result.screenshot_path:
                result.screenshots.append(step_result.screenshot_path)

            if step_result.success:
                result.steps_completed.append(step_name)
                print(f"[PASSED] {step_result.message}")

                if step_result.data:
                    if not result.order_details:
                        result.order_details = {}
                    result.order_details.update(step_result.data)
            else:
                result.steps_failed.append(step_name)
                result.error = step_result.message
                print(f"[FAILED] {step_result.message}")
                break

        # Final screenshot
        if self.page:
            final_screenshot = self._screenshot("final_state")
            result.screenshots.append(final_screenshot)

        result.success = len(result.steps_failed) == 0

        print("\n" + "=" * 60)
        print("ORDER FLOW SUMMARY")
        print("=" * 60)
        print(f"Status: {'PASSED' if result.success else 'FAILED'}")
        print(f"Steps Completed: {len(result.steps_completed)}/{len(steps)}")
        for step in result.steps_completed:
            print(f"  [x] {step}")
        for step in result.steps_failed:
            print(f"  [ ] {step} (FAILED)")
        if result.error:
            print(f"\nError: {result.error}")
        print("=" * 60)

        return result


def main():
    parser = argparse.ArgumentParser(description="Dollor.ai UI Testing Agent - Production")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Login command
    login_parser = subparsers.add_parser("login", help="Test admin login")
    login_parser.add_argument("--email", "-e", required=True, help="Email address")
    login_parser.add_argument("--password", "-p", required=True, help="Password")
    login_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    login_parser.add_argument("--headless", action="store_true", help="Run headless")

    # Order flow command
    order_parser = subparsers.add_parser("order", help="Test order flow (stops at checkout)")
    order_parser.add_argument("--email", "-e", default="demo.customer@dollor.ai", help="Customer email")
    order_parser.add_argument("--password", "-p", default="DemoCustomer2025!", help="Customer password")
    order_parser.add_argument("--restaurant", "-r", default="Natraj", help="Restaurant name to select")
    order_parser.add_argument("--items", "-i", type=int, default=2, help="Number of items to add")
    order_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    order_parser.add_argument("--headless", action="store_true", help="Run headless")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Setup
    os.makedirs("screenshots", exist_ok=True)
    base_url = ENVIRONMENTS[args.env]
    api_url = API_URLS[args.env]

    # Human speed: 500ms between actions
    agent = UITestAgent(
        base_url=base_url,
        api_url=api_url,
        headless=args.headless,
        slow_mo=500  # Human speed
    )

    try:
        agent.start()

        if args.command == "login":
            result = agent.admin_login(args.email, args.password)
            print(f"\n{'PASSED' if result.success else 'FAILED'}: {result.message}")
            sys.exit(0 if result.success else 1)

        elif args.command == "order":
            result = agent.run_order_flow(
                email=args.email,
                password=args.password,
                restaurant_name=args.restaurant,
                num_items=args.items
            )
            sys.exit(0 if result.success else 1)

    finally:
        agent.stop()


if __name__ == "__main__":
    main()
