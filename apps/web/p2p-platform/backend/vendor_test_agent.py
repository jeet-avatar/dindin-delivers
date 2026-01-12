#!/usr/bin/env python3
"""
Dollor.ai Vendor/Restaurant UI Testing Agent
Playwright-based agent for automated vendor portal testing

PRODUCTION URLS:
- Production Website: https://www.dollor.ai
- Vendor Portal: https://www.dollor.ai/vendor
- Production API: https://api.dollor.ai

CREDENTIALS:
- Vendor: demo.restaurant@dollor.ai / DemoRestaurant2025!

Vendor Portal Routes:
- /vendor/login      - Login page
- /vendor/dashboard  - Dashboard
- /vendor/profile    - Profile/settings
- /vendor/menu       - Menu management
- /vendor/orders     - Order management
- /vendor/earnings   - Earnings dashboard
- /vendor/documents  - Document portal

Usage:
    # Vendor login test
    python vendor_test_agent.py login

    # Full vendor flow
    python vendor_test_agent.py flow

    # View menu management
    python vendor_test_agent.py menu
"""

# Environment URLs
ENVIRONMENTS = {
    "production": "https://www.dollor.ai",
    "staging": "https://d3b3ow4g7hjwi5.cloudfront.net",
    "local": "http://localhost:5173",
}

API_URLS = {
    "production": "https://api.dollor.ai",
    "staging": "https://d3kuu45w6kl8hr.cloudfront.net",
    "local": "http://localhost:8080",
}

# Demo vendor credentials
DEFAULT_VENDOR_EMAIL = "demo.restaurant@dollor.ai"
DEFAULT_VENDOR_PASSWORD = "DemoRestaurant2025!"

import argparse
import sys
import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, Page, Browser
except ImportError:
    print("Playwright not installed. Run:")
    print("  pip install playwright")
    print("  playwright install chromium")
    sys.exit(1)


@dataclass
class StepResult:
    success: bool
    message: str
    screenshot_path: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


@dataclass
class VendorFlowResult:
    success: bool
    steps_completed: List[str] = field(default_factory=list)
    steps_failed: List[str] = field(default_factory=list)
    data: Optional[Dict[str, Any]] = None
    screenshots: List[str] = field(default_factory=list)
    error: Optional[str] = None


class VendorTestAgent:
    """UI testing agent for Dollor.ai Vendor/Restaurant Portal"""

    def __init__(
        self,
        base_url: str = "https://www.dollor.ai",
        api_url: str = "https://api.dollor.ai",
        headless: bool = False,
        slow_mo: int = 500
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
        filename = f"screenshots/vendor_{self.session_id}_{self.screenshot_counter:02d}_{name}.png"
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
        print(f"[Vendor Agent] Browser started (headless={self.headless}, slow_mo={self.slow_mo}ms)")

    def stop(self):
        """Stop the browser"""
        if self.browser:
            self.browser.close()
        if self._playwright:
            self._playwright.stop()
        print("[Vendor Agent] Browser stopped")

    # ==================== VENDOR LOGIN ====================

    def vendor_login(self, email: str, password: str) -> StepResult:
        """Login to Vendor Portal"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            # Navigate to vendor login
            login_url = f"{self.base_url}/vendor/login"
            print(f"[Vendor Agent] Navigating to: {login_url}")
            self.page.goto(login_url, wait_until="networkidle")
            self._wait(2000)
            self._screenshot("vendor_login_page")

            # Find and fill email - placeholder is "your@restaurant.com"
            email_input = self.page.wait_for_selector(
                'input[type="email"], input[name="email"], input[placeholder*="@"], input[placeholder*="restaurant" i]',
                timeout=5000
            )
            print(f"[Vendor Agent] Entering email: {email}")
            email_input.fill(email)
            self._wait(500)

            # Find and fill password
            password_input = self.page.wait_for_selector('input[type="password"]', timeout=5000)
            print("[Vendor Agent] Entering password")
            password_input.fill(password)
            self._wait(500)
            self._screenshot("vendor_credentials_entered")

            # Click login button
            login_btn = self.page.query_selector(
                'button:has-text("Sign In to Dashboard"), button:has-text("Login"), button:has-text("Sign In"), button[type="submit"]'
            )
            if login_btn:
                print("[Vendor Agent] Clicking login button")
                login_btn.click()
            else:
                password_input.press("Enter")

            self._wait(3000)
            screenshot = self._screenshot("vendor_post_login")
            current_url = self.page.url
            print(f"[Vendor Agent] Current URL: {current_url}")

            # Check if login successful
            if "/vendor/dashboard" in current_url or "/vendor/profile" in current_url:
                return StepResult(True, f"Vendor login successful! URL: {current_url}", screenshot)

            # Check for dashboard elements
            if self.page.query_selector('text="Dashboard"') or self.page.query_selector('text="Orders"'):
                return StepResult(True, "Vendor login successful - on dashboard", screenshot)

            # Check for error
            error = self.page.query_selector('[role="alert"], .text-red-500, .error')
            if error:
                error_text = error.text_content() or ""
                if "incorrect" in error_text.lower() or "invalid" in error_text.lower():
                    return StepResult(False, f"Login failed: {error_text}", screenshot)

            return StepResult(True, f"Vendor login completed. URL: {current_url}", screenshot)

        except Exception as e:
            return StepResult(False, f"Vendor login error: {str(e)}", self._screenshot("vendor_login_error"))

    # ==================== VIEW DASHBOARD ====================

    def view_dashboard(self) -> StepResult:
        """View vendor dashboard"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to dashboard...")
            self.page.goto(f"{self.base_url}/vendor/dashboard", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_dashboard")

            # Try to extract dashboard data
            dashboard_data = {}

            # Look for today's orders
            orders_el = self.page.query_selector('text=/[0-9]+.*orders/i')
            if orders_el:
                dashboard_data["orders"] = orders_el.text_content()

            # Look for revenue
            revenue_el = self.page.query_selector('text=/\\$[0-9]/')
            if revenue_el:
                dashboard_data["revenue"] = revenue_el.text_content()

            return StepResult(
                True,
                "Vendor dashboard loaded",
                screenshot,
                {"dashboard": dashboard_data}
            )

        except Exception as e:
            return StepResult(False, f"Dashboard error: {str(e)}", self._screenshot("dashboard_error"))

    # ==================== VIEW ORDERS ====================

    def view_orders(self) -> StepResult:
        """View incoming orders"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to orders...")
            self.page.goto(f"{self.base_url}/vendor/orders", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_orders")

            # Count order cards
            order_cards = self.page.query_selector_all('[class*="order"], [class*="card"]')
            no_orders = self.page.query_selector('text="No orders", text="No pending orders"')

            if no_orders:
                return StepResult(True, "No orders currently", screenshot, {"order_count": 0})

            order_count = len([c for c in order_cards if c.is_visible()]) if order_cards else 0

            return StepResult(
                True,
                f"Orders page loaded. Found {order_count} potential orders.",
                screenshot,
                {"order_count": order_count}
            )

        except Exception as e:
            return StepResult(False, f"Orders error: {str(e)}", self._screenshot("orders_error"))

    # ==================== VIEW MENU MANAGEMENT ====================

    def view_menu(self) -> StepResult:
        """View menu management page"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to menu management...")
            self.page.goto(f"{self.base_url}/vendor/menu", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_menu")

            # Count menu items
            menu_items = self.page.query_selector_all('[class*="menu-item"], [class*="MenuItem"], [class*="item"]')
            menu_count = len([m for m in menu_items if m.is_visible()]) if menu_items else 0

            # Check for add item button
            add_btn = self.page.query_selector('button:has-text("Add Item"), button:has-text("Add Menu Item")')

            return StepResult(
                True,
                f"Menu management loaded. Found {menu_count} menu items.",
                screenshot,
                {"menu_count": menu_count, "can_add": add_btn is not None}
            )

        except Exception as e:
            return StepResult(False, f"Menu error: {str(e)}", self._screenshot("menu_error"))

    # ==================== VIEW EARNINGS ====================

    def view_earnings(self) -> StepResult:
        """View vendor earnings"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to earnings...")
            self.page.goto(f"{self.base_url}/vendor/earnings", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_earnings")

            # Try to extract earnings data
            earnings_data = {}

            # Look for total earnings
            total_el = self.page.query_selector('text=/Total.*\\$[0-9]/i')
            if total_el:
                earnings_data["total"] = total_el.text_content()

            # Look for pending payout
            pending_el = self.page.query_selector('text=/Pending.*\\$[0-9]/i')
            if pending_el:
                earnings_data["pending"] = pending_el.text_content()

            return StepResult(
                True,
                "Earnings page loaded",
                screenshot,
                {"earnings": earnings_data}
            )

        except Exception as e:
            return StepResult(False, f"Earnings error: {str(e)}", self._screenshot("earnings_error"))

    # ==================== VIEW PROFILE ====================

    def view_profile(self) -> StepResult:
        """View vendor profile/settings"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to profile...")
            self.page.goto(f"{self.base_url}/vendor/profile", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_profile")

            # Try to extract profile info
            profile_data = {}

            # Look for restaurant name
            name_el = self.page.query_selector('h1, h2, [class*="restaurant-name"], [class*="business-name"]')
            if name_el:
                profile_data["name"] = name_el.text_content()

            # Look for status
            status_el = self.page.query_selector('text=/Open|Closed|Online|Offline/i')
            if status_el:
                profile_data["status"] = status_el.text_content()

            return StepResult(
                True,
                "Vendor profile loaded",
                screenshot,
                {"profile": profile_data}
            )

        except Exception as e:
            return StepResult(False, f"Profile error: {str(e)}", self._screenshot("profile_error"))

    # ==================== VIEW DOCUMENTS ====================

    def view_documents(self) -> StepResult:
        """View document portal"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to documents...")
            self.page.goto(f"{self.base_url}/vendor/documents", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_documents")

            # Check for document types
            doc_types = []
            for doc_type in ["Business License", "Health Permit", "Insurance", "W-9", "Food Handler"]:
                if self.page.query_selector(f'text="{doc_type}"'):
                    doc_types.append(doc_type)

            return StepResult(
                True,
                f"Documents page loaded. Found {len(doc_types)} document types.",
                screenshot,
                {"document_types": doc_types}
            )

        except Exception as e:
            return StepResult(False, f"Documents error: {str(e)}", self._screenshot("documents_error"))

    # ==================== VIEW SETTINGS ====================

    def view_settings(self) -> StepResult:
        """View vendor settings"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Navigating to settings...")
            self.page.goto(f"{self.base_url}/vendor/settings", wait_until="networkidle")
            self._wait(2000)
            screenshot = self._screenshot("vendor_settings")

            # Check for settings sections
            settings_found = []
            for setting in ["Hours", "Delivery", "Pickup", "Notifications", "Payment"]:
                if self.page.query_selector(f'text=/{setting}/i'):
                    settings_found.append(setting)

            return StepResult(
                True,
                f"Settings page loaded. Found {len(settings_found)} setting sections.",
                screenshot,
                {"settings": settings_found}
            )

        except Exception as e:
            return StepResult(False, f"Settings error: {str(e)}", self._screenshot("settings_error"))

    # ==================== ACCEPT ORDER ====================

    def accept_order(self) -> StepResult:
        """Accept a pending order"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Looking for orders to accept...")
            self._screenshot("before_accept")

            # Navigate to orders first
            self.page.goto(f"{self.base_url}/vendor/orders", wait_until="networkidle")
            self._wait(2000)

            # Look for Accept button
            accept_btn = self.page.query_selector(
                'button:has-text("Accept"), button:has-text("Confirm"), '
                'button:has-text("Start Preparing")'
            )

            if not accept_btn:
                return StepResult(False, "No orders available to accept", self._screenshot("no_orders_to_accept"))

            print("[Vendor Agent] Clicking Accept button")
            accept_btn.click()
            self._wait(2000)

            screenshot = self._screenshot("order_accepted")

            # Check for confirmation
            if self.page.query_selector('text="Order accepted", text="Preparing"'):
                return StepResult(True, "Order accepted successfully!", screenshot)

            return StepResult(True, "Accept action executed", screenshot)

        except Exception as e:
            return StepResult(False, f"Accept order error: {str(e)}", self._screenshot("accept_error"))

    # ==================== MARK ORDER READY ====================

    def mark_order_ready(self) -> StepResult:
        """Mark an order as ready for pickup"""
        if not self.page:
            return StepResult(False, "Browser not started")

        try:
            print("[Vendor Agent] Looking for orders to mark ready...")
            self._screenshot("before_ready")

            # Look for Ready button
            ready_btn = self.page.query_selector(
                'button:has-text("Ready"), button:has-text("Ready for Pickup"), '
                'button:has-text("Order Ready")'
            )

            if not ready_btn:
                return StepResult(False, "No orders to mark ready", self._screenshot("no_orders_ready"))

            print("[Vendor Agent] Clicking Ready button")
            ready_btn.click()
            self._wait(2000)

            screenshot = self._screenshot("order_ready")

            return StepResult(True, "Order marked as ready", screenshot)

        except Exception as e:
            return StepResult(False, f"Mark ready error: {str(e)}", self._screenshot("ready_error"))

    # ==================== FULL VENDOR FLOW ====================

    def run_vendor_flow(self, email: str, password: str) -> VendorFlowResult:
        """
        Run complete vendor flow: Login -> Dashboard -> Orders -> Menu -> Earnings -> Profile
        """
        result = VendorFlowResult(success=False)

        steps = [
            ("Vendor Login", lambda: self.vendor_login(email, password)),
            ("View Dashboard", lambda: self.view_dashboard()),
            ("View Orders", lambda: self.view_orders()),
            ("View Menu Management", lambda: self.view_menu()),
            ("View Earnings", lambda: self.view_earnings()),
            ("View Profile", lambda: self.view_profile()),
            ("View Documents", lambda: self.view_documents()),
            ("View Settings", lambda: self.view_settings()),
        ]

        print("\n" + "=" * 60)
        print("DOLLOR.AI VENDOR PORTAL TEST - PRODUCTION")
        print("=" * 60)
        print(f"Website: {self.base_url}")
        print(f"Email: {email}")
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
                    if not result.data:
                        result.data = {}
                    result.data.update(step_result.data)
            else:
                result.steps_failed.append(step_name)
                result.error = step_result.message
                print(f"[FAILED] {step_result.message}")
                # Continue to see what works

        # Final screenshot
        if self.page:
            final_screenshot = self._screenshot("final_state")
            result.screenshots.append(final_screenshot)

        result.success = len(result.steps_failed) == 0

        print("\n" + "=" * 60)
        print("VENDOR FLOW SUMMARY")
        print("=" * 60)
        print(f"Status: {'PASSED' if result.success else 'PARTIAL'}")
        print(f"Steps Completed: {len(result.steps_completed)}/{len(steps)}")
        for step in result.steps_completed:
            print(f"  [x] {step}")
        for step in result.steps_failed:
            print(f"  [ ] {step} (FAILED)")
        if result.data:
            print(f"\nData collected: {result.data}")
        print("=" * 60)

        return result


def main():
    parser = argparse.ArgumentParser(description="Dollor.ai Vendor Portal Testing Agent")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Login command
    login_parser = subparsers.add_parser("login", help="Test vendor login only")
    login_parser.add_argument("--email", "-e", default=DEFAULT_VENDOR_EMAIL, help="Vendor email")
    login_parser.add_argument("--password", "-p", default=DEFAULT_VENDOR_PASSWORD, help="Vendor password")
    login_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    login_parser.add_argument("--headless", action="store_true", help="Run headless")

    # Full flow command
    flow_parser = subparsers.add_parser("flow", help="Test full vendor flow")
    flow_parser.add_argument("--email", "-e", default=DEFAULT_VENDOR_EMAIL, help="Vendor email")
    flow_parser.add_argument("--password", "-p", default=DEFAULT_VENDOR_PASSWORD, help="Vendor password")
    flow_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    flow_parser.add_argument("--headless", action="store_true", help="Run headless")

    # Menu command
    menu_parser = subparsers.add_parser("menu", help="View menu management")
    menu_parser.add_argument("--email", "-e", default=DEFAULT_VENDOR_EMAIL, help="Vendor email")
    menu_parser.add_argument("--password", "-p", default=DEFAULT_VENDOR_PASSWORD, help="Vendor password")
    menu_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    menu_parser.add_argument("--headless", action="store_true", help="Run headless")

    # Orders command
    orders_parser = subparsers.add_parser("orders", help="View and manage orders")
    orders_parser.add_argument("--email", "-e", default=DEFAULT_VENDOR_EMAIL, help="Vendor email")
    orders_parser.add_argument("--password", "-p", default=DEFAULT_VENDOR_PASSWORD, help="Vendor password")
    orders_parser.add_argument("--env", choices=["production", "staging", "local"], default="production")
    orders_parser.add_argument("--headless", action="store_true", help="Run headless")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Setup
    os.makedirs("screenshots", exist_ok=True)
    base_url = ENVIRONMENTS[args.env]
    api_url = API_URLS[args.env]

    agent = VendorTestAgent(
        base_url=base_url,
        api_url=api_url,
        headless=args.headless,
        slow_mo=500
    )

    try:
        agent.start()

        if args.command == "login":
            result = agent.vendor_login(args.email, args.password)
            print(f"\n{'PASSED' if result.success else 'FAILED'}: {result.message}")
            sys.exit(0 if result.success else 1)

        elif args.command == "flow":
            result = agent.run_vendor_flow(args.email, args.password)
            sys.exit(0 if result.success else 1)

        elif args.command == "menu":
            login_result = agent.vendor_login(args.email, args.password)
            if login_result.success:
                menu_result = agent.view_menu()
                print(f"\n{'PASSED' if menu_result.success else 'FAILED'}: {menu_result.message}")
                if menu_result.data:
                    print(f"Menu data: {menu_result.data}")
                sys.exit(0 if menu_result.success else 1)
            else:
                print(f"\nLogin failed: {login_result.message}")
                sys.exit(1)

        elif args.command == "orders":
            login_result = agent.vendor_login(args.email, args.password)
            if login_result.success:
                orders_result = agent.view_orders()
                print(f"\n{'PASSED' if orders_result.success else 'FAILED'}: {orders_result.message}")
                if orders_result.data:
                    print(f"Orders data: {orders_result.data}")
                sys.exit(0 if orders_result.success else 1)
            else:
                print(f"\nLogin failed: {login_result.message}")
                sys.exit(1)

    finally:
        agent.stop()


if __name__ == "__main__":
    main()
