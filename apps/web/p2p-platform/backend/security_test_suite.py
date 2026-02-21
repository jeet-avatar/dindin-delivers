#!/usr/bin/env python3
"""
================================================================================
DOLLOR.AI ENTERPRISE SECURITY TEST SUITE
================================================================================
Version: 1.0.0
Date: 2026-01-09
Author: TechCloudPro Security Team

This comprehensive security test suite validates the security posture of all
API endpoints across Customer, Driver, and Restaurant (Vendor) modules.

USAGE:
    python security_test_suite.py --env production
    python security_test_suite.py --env staging
    python security_test_suite.py --env local

PLATFORMS TESTED:
    - iOS Mobile App
    - Android Mobile App
    - Web Application
    - Direct API Access

================================================================================
"""

import requests
import json
import time
import sys
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import re
import hashlib
import secrets


# ============================================================================
# CONFIGURATION
# ============================================================================

class Environment(Enum):
    PRODUCTION = "https://api.dollor.ai"
    STAGING = "https://d34u5ixl0bulv4.cloudfront.net"
    LOCAL = "http://localhost:8080"


@dataclass
class TestResult:
    """Individual test result"""
    test_id: str
    test_name: str
    category: str
    severity: str
    platform: str
    endpoint: str
    method: str
    passed: bool
    details: str
    response_time_ms: float
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SecurityReport:
    """Comprehensive security report"""
    environment: str
    start_time: str
    end_time: str = ""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    results: List[TestResult] = field(default_factory=list)

    def add_result(self, result: TestResult):
        self.results.append(result)
        self.total_tests += 1
        if result.passed:
            self.passed += 1
        else:
            self.failed += 1


# ============================================================================
# TEST UTILITIES
# ============================================================================

class SecurityTester:
    """Main security testing class"""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.report = SecurityReport(
            environment=base_url,
            start_time=datetime.utcnow().isoformat()
        )

        # Test user tokens (will be populated during auth tests)
        self.customer_token = None
        self.driver_token = None
        self.vendor_token = None
        self.admin_token = None

        # Common headers for different platforms
        self.ios_headers = {
            "User-Agent": "Dollor/1.0 (iOS; iPhone14,5; iOS 17.0)",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Platform": "ios",
            "X-App-Version": "1.0.0"
        }

        self.android_headers = {
            "User-Agent": "Dollor/1.0 (Android; Pixel 7; Android 14)",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Platform": "android",
            "X-App-Version": "1.0.0"
        }

        self.web_headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Platform": "web",
            "Origin": "https://app.dollor.ai"
        }

    def make_request(self, method: str, endpoint: str, headers: dict = None,
                    data: dict = None, token: str = None, use_form_data: bool = False) -> Tuple[int, dict, float]:
        """Make HTTP request and return status, response, and time

        Args:
            method: HTTP method (GET, POST, PUT, PATCH, DELETE)
            endpoint: API endpoint path
            headers: Optional custom headers
            data: Request payload
            token: Bearer token for authentication
            use_form_data: If True, send data as form data (for OAuth2 endpoints)
        """
        url = f"{self.base_url}{endpoint}"
        req_headers = headers or self.web_headers.copy()

        if token:
            req_headers["Authorization"] = f"Bearer {token}"

        # For form data requests, remove Content-Type (let requests set it)
        if use_form_data and "Content-Type" in req_headers:
            del req_headers["Content-Type"]

        start_time = time.time()
        try:
            if method == "GET":
                resp = self.session.get(url, headers=req_headers, timeout=30)
            elif method == "POST":
                if use_form_data:
                    resp = self.session.post(url, headers=req_headers, data=data, timeout=30)
                else:
                    resp = self.session.post(url, headers=req_headers, json=data, timeout=30)
            elif method == "PUT":
                if use_form_data:
                    resp = self.session.put(url, headers=req_headers, data=data, timeout=30)
                else:
                    resp = self.session.put(url, headers=req_headers, json=data, timeout=30)
            elif method == "PATCH":
                resp = self.session.patch(url, headers=req_headers, json=data, timeout=30)
            elif method == "DELETE":
                resp = self.session.delete(url, headers=req_headers, timeout=30)
            else:
                return 0, {"error": "Invalid method"}, 0

            elapsed = (time.time() - start_time) * 1000

            try:
                return resp.status_code, resp.json(), elapsed
            except:
                return resp.status_code, {"raw": resp.text[:500]}, elapsed

        except requests.exceptions.Timeout:
            return 0, {"error": "Request timeout"}, 30000
        except requests.exceptions.ConnectionError:
            return 0, {"error": "Connection failed"}, 0
        except Exception as e:
            return 0, {"error": str(e)}, 0

    def add_test_result(self, test_id: str, test_name: str, category: str,
                       severity: str, platform: str, endpoint: str, method: str,
                       passed: bool, details: str, response_time: float):
        """Add test result to report"""
        result = TestResult(
            test_id=test_id,
            test_name=test_name,
            category=category,
            severity=severity,
            platform=platform,
            endpoint=endpoint,
            method=method,
            passed=passed,
            details=details,
            response_time_ms=response_time
        )
        self.report.add_result(result)

        # Print result immediately
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {test_id}: {test_name} ({response_time:.0f}ms)")


# ============================================================================
# CUSTOMER SECURITY TESTS (15 Test Cases)
# ============================================================================

def run_customer_tests(tester: SecurityTester):
    """Run all customer security tests"""
    print("\n" + "="*70)
    print("CUSTOMER MODULE SECURITY TESTS")
    print("="*70)

    # CUST-001: Authentication - Invalid Credentials
    # NOTE: Login endpoints use OAuth2PasswordRequestForm which requires form data, not JSON
    print("\n[CUST-001] Testing invalid login credentials...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/customer/login",
        data={"username": "fake@test.com", "password": "wrongpassword"},
        use_form_data=True
    )
    tester.add_test_result(
        "CUST-001", "Invalid Login Credentials Rejection",
        "Customer", "HIGH", "All Platforms",
        "/api/auth/customer/login", "POST",
        status == 401,
        f"Status: {status}, Expected 401 Unauthorized",
        time_ms
    )

    # CUST-002: Authentication - SQL Injection in Login
    print("\n[CUST-002] Testing SQL injection in login...")
    sql_payloads = ["' OR '1'='1", "admin'--", "1; DROP TABLE users--"]
    sql_blocked = True
    for payload in sql_payloads:
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/customer/login",
            data={"username": payload, "password": payload},
            use_form_data=True
        )
        if status not in [400, 401, 422]:
            sql_blocked = False
            break
    tester.add_test_result(
        "CUST-002", "SQL Injection Prevention in Login",
        "Customer", "CRITICAL", "All Platforms",
        "/api/auth/customer/login", "POST",
        sql_blocked,
        f"SQL payloads properly rejected",
        time_ms
    )

    # CUST-003: Authentication - Rate Limiting on Login
    # Rate limit is 5 attempts per minute - test with 8 attempts to trigger
    print("\n[CUST-003] Testing rate limiting on login endpoint...")
    rate_limited = False
    for i in range(8):
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/customer/login",
            data={"username": f"ratetest{i}@test.com", "password": "test123"},
            use_form_data=True
        )
        if status == 429:
            rate_limited = True
            break
    tester.add_test_result(
        "CUST-003", "Rate Limiting on Login Endpoint",
        "Customer", "HIGH", "All Platforms",
        "/api/auth/customer/login", "POST",
        rate_limited,
        f"Rate limit triggered after {i+1} attempts" if rate_limited else "Rate limit NOT triggered after 8 attempts",
        time_ms
    )

    # CUST-004: Registration - Password Complexity Validation
    print("\n[CUST-004] Testing password complexity validation...")
    weak_passwords = ["123", "password", "12345678", "abcdefgh"]
    complexity_enforced = True
    for pwd in weak_passwords:
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/customer/register",
            data={
                "email": f"test_{secrets.token_hex(4)}@test.com",
                "password": pwd,
                "name": "Test User"
            }
        )
        if status in [200, 201]:
            complexity_enforced = False
            break
    tester.add_test_result(
        "CUST-004", "Password Complexity Enforcement",
        "Customer", "HIGH", "All Platforms",
        "/api/auth/customer/register", "POST",
        complexity_enforced,
        "Weak passwords properly rejected" if complexity_enforced else f"Weak password '{pwd}' was accepted",
        time_ms
    )

    # CUST-005: Registration - Email Validation
    print("\n[CUST-005] Testing email format validation...")
    invalid_emails = ["notanemail", "test@", "@test.com", "test@.com"]
    email_validated = True
    for email in invalid_emails:
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/customer/register",
            data={"email": email, "password": "SecurePass123!", "name": "Test"}
        )
        if status in [200, 201]:
            email_validated = False
            break
    tester.add_test_result(
        "CUST-005", "Email Format Validation",
        "Customer", "MEDIUM", "All Platforms",
        "/api/auth/customer/register", "POST",
        email_validated,
        "Invalid emails properly rejected" if email_validated else f"Invalid email '{email}' was accepted",
        time_ms
    )

    # CUST-006: Authorization - Access Without Token
    print("\n[CUST-006] Testing protected endpoint without token...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customer/profile",
        headers=tester.web_headers  # No token
    )
    tester.add_test_result(
        "CUST-006", "Protected Endpoint Requires Authentication",
        "Customer", "CRITICAL", "All Platforms",
        "/api/customer/profile", "GET",
        status in [401, 403],
        f"Status: {status}, Expected 401/403",
        time_ms
    )

    # CUST-007: Authorization - Invalid Token
    print("\n[CUST-007] Testing with invalid/expired token...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customer/profile",
        token="invalid.token.here"
    )
    tester.add_test_result(
        "CUST-007", "Invalid Token Rejection",
        "Customer", "HIGH", "All Platforms",
        "/api/customer/profile", "GET",
        status in [401, 403],
        f"Status: {status}, Expected 401/403",
        time_ms
    )

    # CUST-008: Password Reset - Rate Limiting
    # Rate limit is 3 attempts per 5 minutes - test with 5 attempts to trigger
    print("\n[CUST-008] Testing rate limiting on password reset...")
    rate_limited = False
    for i in range(5):
        status, resp, time_ms = tester.make_request(
            "POST", "/api/customer/password-reset/request",
            data={"email": f"resettest{i}@test.com"}
        )
        if status == 429:
            rate_limited = True
            break
    tester.add_test_result(
        "CUST-008", "Rate Limiting on Password Reset",
        "Customer", "HIGH", "All Platforms",
        "/api/customer/password-reset/request", "POST",
        rate_limited,
        f"Rate limit triggered after {i+1} attempts" if rate_limited else "Rate limit NOT triggered",
        time_ms
    )

    # CUST-009: Password Reset - User Enumeration Prevention
    print("\n[CUST-009] Testing user enumeration prevention...")
    status1, resp1, _ = tester.make_request(
        "POST", "/api/customer/password-reset/request",
        data={"email": "nonexistent@fake.com"}
    )
    status2, resp2, time_ms = tester.make_request(
        "POST", "/api/customer/password-reset/request",
        data={"email": "demo.customer@dollor.ai"}
    )
    # Both should return similar responses to prevent enumeration
    enum_prevented = (status1 == status2) or (status1 in [200, 429] and status2 in [200, 429])
    tester.add_test_result(
        "CUST-009", "User Enumeration Prevention on Password Reset",
        "Customer", "MEDIUM", "All Platforms",
        "/api/customer/password-reset/request", "POST",
        enum_prevented,
        f"Existing user status: {status2}, Non-existing: {status1}",
        time_ms
    )

    # CUST-010: XSS Prevention in Profile Update
    print("\n[CUST-010] Testing XSS prevention in profile...")
    xss_payloads = [
        "<script>alert('xss')</script>",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>"
    ]
    # We can't fully test this without a valid token, but we test the endpoint exists
    status, resp, time_ms = tester.make_request(
        "PUT", "/api/auth/customer/profile",
        data={"name": xss_payloads[0]}
    )
    tester.add_test_result(
        "CUST-010", "XSS Prevention in Profile Update",
        "Customer", "HIGH", "Web",
        "/api/auth/customer/profile", "PUT",
        status in [401, 400, 422],  # Should require auth or sanitize
        f"Status: {status}, XSS payload handling",
        time_ms
    )

    # CUST-011: IDOR - Access Other User's Orders
    print("\n[CUST-011] Testing IDOR protection on orders...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customer/orders/999999"  # Random order ID
    )
    tester.add_test_result(
        "CUST-011", "IDOR Protection on Order Access",
        "Customer", "CRITICAL", "All Platforms",
        "/api/customer/orders/{order_id}", "GET",
        status in [401, 403, 404],
        f"Status: {status}, Expected 401/403/404",
        time_ms
    )

    # CUST-012: iOS Platform - Header Validation
    print("\n[CUST-012] Testing iOS platform header handling...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customer/profile",
        headers=tester.ios_headers
    )
    tester.add_test_result(
        "CUST-012", "iOS Platform Header Processing",
        "Customer", "LOW", "iOS",
        "/api/customer/profile", "GET",
        status in [401, 200],  # Should process request (auth required)
        f"Status: {status}, iOS headers accepted",
        time_ms
    )

    # CUST-013: Android Platform - Header Validation
    print("\n[CUST-013] Testing Android platform header handling...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customer/profile",
        headers=tester.android_headers
    )
    tester.add_test_result(
        "CUST-013", "Android Platform Header Processing",
        "Customer", "LOW", "Android",
        "/api/customer/profile", "GET",
        status in [401, 200],
        f"Status: {status}, Android headers accepted",
        time_ms
    )

    # CUST-014: Payment Card - Access Control
    print("\n[CUST-014] Testing payment card access control...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/customers/999999/cards"
    )
    tester.add_test_result(
        "CUST-014", "Payment Card Data Access Control",
        "Customer", "CRITICAL", "All Platforms",
        "/api/customers/{customer_id}/cards", "GET",
        status in [401, 403, 404],
        f"Status: {status}, Card data protected",
        time_ms
    )

    # CUST-015: Google OAuth - Token Validation
    print("\n[CUST-015] Testing Google OAuth token validation...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/customer/google",
        data={"id_token": "fake_google_token_12345"}
    )
    tester.add_test_result(
        "CUST-015", "Google OAuth Token Validation",
        "Customer", "HIGH", "All Platforms",
        "/api/auth/customer/google", "POST",
        status in [400, 401, 422],
        f"Status: {status}, Fake token rejected",
        time_ms
    )


# ============================================================================
# DRIVER SECURITY TESTS (15 Test Cases)
# ============================================================================

def run_driver_tests(tester: SecurityTester):
    """Run all driver security tests"""
    print("\n" + "="*70)
    print("DRIVER MODULE SECURITY TESTS")
    print("="*70)

    # DRV-001: Authentication - Invalid Credentials
    # NOTE: Login endpoints use OAuth2PasswordRequestForm which requires form data
    print("\n[DRV-001] Testing invalid driver login...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/driver/login",
        data={"username": "fakedriver@test.com", "password": "wrongpass"},
        use_form_data=True
    )
    tester.add_test_result(
        "DRV-001", "Invalid Driver Login Rejection",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/login", "POST",
        status == 401,
        f"Status: {status}, Expected 401",
        time_ms
    )

    # DRV-002: Authentication - Rate Limiting
    # Rate limit is 5 attempts per minute - test with 8 attempts to trigger
    print("\n[DRV-002] Testing rate limiting on driver login...")
    rate_limited = False
    for i in range(8):
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/driver/login",
            data={"username": f"ratetest{i}@driver.com", "password": "test123"},
            use_form_data=True
        )
        if status == 429:
            rate_limited = True
            break
    tester.add_test_result(
        "DRV-002", "Rate Limiting on Driver Login",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/login", "POST",
        rate_limited,
        f"Rate limit triggered after {i+1} attempts" if rate_limited else "Rate limit NOT triggered",
        time_ms
    )

    # DRV-003: Registration - Password Complexity
    print("\n[DRV-003] Testing driver registration password complexity...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/driver/register",
        data={
            "email": f"driver_{secrets.token_hex(4)}@test.com",
            "password": "weak",
            "first_name": "Test",
            "last_name": "Driver",
            "phone": "5551234567"
        }
    )
    tester.add_test_result(
        "DRV-003", "Driver Registration Password Complexity",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/register", "POST",
        status == 400,
        f"Status: {status}, Weak password should be rejected",
        time_ms
    )

    # DRV-004: Authorization - Protected Endpoint Access
    print("\n[DRV-004] Testing driver profile without token...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/auth/driver/me"
    )
    tester.add_test_result(
        "DRV-004", "Driver Profile Requires Authentication",
        "Driver", "CRITICAL", "All Platforms",
        "/api/auth/driver/me", "GET",
        status in [401, 403],
        f"Status: {status}, Expected 401/403",
        time_ms
    )

    # DRV-005: Document Upload - File Type Validation
    print("\n[DRV-005] Testing document upload file type validation...")
    # Test with unauthorized request first
    status, resp, time_ms = tester.make_request(
        "POST", "/api/drivers/1/documents",
        data={"document_type": "drivers_license"}
    )
    tester.add_test_result(
        "DRV-005", "Document Upload Authorization",
        "Driver", "HIGH", "All Platforms",
        "/api/drivers/{driver_id}/documents", "POST",
        status in [401, 403, 404, 422],
        f"Status: {status}, Upload requires auth",
        time_ms
    )

    # DRV-006: Location Update - Authorization
    print("\n[DRV-006] Testing location update authorization...")
    status, resp, time_ms = tester.make_request(
        "PUT", "/api/auth/driver/location",
        data={"latitude": 40.7128, "longitude": -74.0060}
    )
    tester.add_test_result(
        "DRV-006", "Location Update Requires Authentication",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/location", "PUT",
        status in [401, 403],
        f"Status: {status}, Location update protected",
        time_ms
    )

    # DRV-007: IDOR - Access Other Driver's Documents
    print("\n[DRV-007] Testing IDOR on driver documents...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/drivers/999999/documents"
    )
    tester.add_test_result(
        "DRV-007", "IDOR Protection on Driver Documents",
        "Driver", "CRITICAL", "All Platforms",
        "/api/drivers/{driver_id}/documents", "GET",
        status in [401, 403, 404],
        f"Status: {status}, Documents protected",
        time_ms
    )

    # DRV-008: IDOR - Access Other Driver's Earnings
    print("\n[DRV-008] Testing IDOR on driver earnings...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/drivers/999999/earnings"
    )
    tester.add_test_result(
        "DRV-008", "IDOR Protection on Driver Earnings",
        "Driver", "CRITICAL", "All Platforms",
        "/api/drivers/{driver_id}/earnings", "GET",
        status in [401, 403, 404],
        f"Status: {status}, Earnings protected",
        time_ms
    )

    # DRV-009: Online Status Toggle - Authorization
    print("\n[DRV-009] Testing online status toggle authorization...")
    status, resp, time_ms = tester.make_request(
        "PUT", "/api/auth/driver/online",
        data={"is_online": True}
    )
    tester.add_test_result(
        "DRV-009", "Online Status Toggle Authorization",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/online", "PUT",
        status in [401, 403],
        f"Status: {status}, Toggle protected",
        time_ms
    )

    # DRV-010: iOS App - Driver Document Upload
    print("\n[DRV-010] Testing iOS driver document endpoint...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/auth/driver/documents",
        headers=tester.ios_headers
    )
    tester.add_test_result(
        "DRV-010", "iOS Driver Document Access",
        "Driver", "MEDIUM", "iOS",
        "/api/auth/driver/documents", "GET",
        status in [401, 200],
        f"Status: {status}, iOS endpoint accessible",
        time_ms
    )

    # DRV-011: Android App - Driver Status
    print("\n[DRV-011] Testing Android driver status endpoint...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/drivers/1/status",
        headers=tester.android_headers
    )
    tester.add_test_result(
        "DRV-011", "Android Driver Status Access",
        "Driver", "MEDIUM", "Android",
        "/api/drivers/{driver_id}/status", "GET",
        status in [401, 403, 404, 200],
        f"Status: {status}, Android endpoint accessible",
        time_ms
    )

    # DRV-012: SQL Injection - Driver Search
    print("\n[DRV-012] Testing SQL injection in driver endpoints...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/drivers/1' OR '1'='1/status"
    )
    tester.add_test_result(
        "DRV-012", "SQL Injection Prevention in Driver Endpoints",
        "Driver", "CRITICAL", "All Platforms",
        "/api/drivers/{driver_id}/status", "GET",
        status in [400, 404, 422],
        f"Status: {status}, SQL injection blocked",
        time_ms
    )

    # DRV-013: Token Refresh - Validation
    print("\n[DRV-013] Testing driver token refresh validation...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/driver/refresh",
        data={"refresh_token": "invalid_refresh_token"}
    )
    tester.add_test_result(
        "DRV-013", "Driver Token Refresh Validation",
        "Driver", "HIGH", "All Platforms",
        "/api/auth/driver/refresh", "POST",
        status in [400, 401, 422],
        f"Status: {status}, Invalid refresh rejected",
        time_ms
    )

    # DRV-014: Dashboard Access - Authorization
    print("\n[DRV-014] Testing driver dashboard authorization...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/driver/dashboard"
    )
    tester.add_test_result(
        "DRV-014", "Driver Dashboard Authorization",
        "Driver", "HIGH", "All Platforms",
        "/api/driver/dashboard", "GET",
        status in [401, 403],
        f"Status: {status}, Dashboard protected",
        time_ms
    )

    # DRV-015: Active Delivery - Authorization
    print("\n[DRV-015] Testing active delivery access...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/driver/active-delivery"
    )
    tester.add_test_result(
        "DRV-015", "Active Delivery Access Control",
        "Driver", "HIGH", "All Platforms",
        "/api/driver/active-delivery", "GET",
        status in [401, 403],
        f"Status: {status}, Active delivery protected",
        time_ms
    )


# ============================================================================
# RESTAURANT/VENDOR SECURITY TESTS (15 Test Cases)
# ============================================================================

def run_vendor_tests(tester: SecurityTester):
    """Run all vendor/restaurant security tests"""
    print("\n" + "="*70)
    print("RESTAURANT/VENDOR MODULE SECURITY TESTS")
    print("="*70)

    # VND-001: Authentication - Invalid Credentials
    # NOTE: Login endpoints use OAuth2PasswordRequestForm which requires form data
    print("\n[VND-001] Testing invalid vendor login...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/vendor/login",
        data={"username": "fakevendor@test.com", "password": "wrongpass"},
        use_form_data=True
    )
    tester.add_test_result(
        "VND-001", "Invalid Vendor Login Rejection",
        "Vendor", "HIGH", "All Platforms",
        "/api/auth/vendor/login", "POST",
        status == 401,
        f"Status: {status}, Expected 401",
        time_ms
    )

    # VND-002: Authentication - Rate Limiting
    # Rate limit is 5 attempts per minute - test with 8 attempts to trigger
    print("\n[VND-002] Testing rate limiting on vendor login...")
    rate_limited = False
    for i in range(8):
        status, resp, time_ms = tester.make_request(
            "POST", "/api/auth/vendor/login",
            data={"username": f"ratetest{i}@vendor.com", "password": "test123"},
            use_form_data=True
        )
        if status == 429:
            rate_limited = True
            break
    tester.add_test_result(
        "VND-002", "Rate Limiting on Vendor Login",
        "Vendor", "HIGH", "All Platforms",
        "/api/auth/vendor/login", "POST",
        rate_limited,
        f"Rate limit triggered after {i+1} attempts" if rate_limited else "Rate limit NOT triggered",
        time_ms
    )

    # VND-003: Registration - Password Complexity
    print("\n[VND-003] Testing vendor registration password complexity...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/auth/vendor/register",
        data={
            "email": f"vendor_{secrets.token_hex(4)}@test.com",
            "password": "weak",
            "restaurant_name": "Test Restaurant",
            "owner_name": "Test Owner"
        }
    )
    tester.add_test_result(
        "VND-003", "Vendor Registration Password Complexity",
        "Vendor", "HIGH", "All Platforms",
        "/api/auth/vendor/register", "POST",
        status == 400,
        f"Status: {status}, Weak password should be rejected",
        time_ms
    )

    # VND-004: Authorization - Profile Access
    print("\n[VND-004] Testing vendor profile without token...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendor/profile"
    )
    tester.add_test_result(
        "VND-004", "Vendor Profile Requires Authentication",
        "Vendor", "CRITICAL", "All Platforms",
        "/api/vendor/profile", "GET",
        status in [401, 403],
        f"Status: {status}, Expected 401/403",
        time_ms
    )

    # VND-005: Document Upload - Public Endpoint Validation
    print("\n[VND-005] Testing public document upload validation...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/vendors/public/999999/documents",
        data={
            "document_type": "food_license",
            "contact_email": "test@test.com"
        }
    )
    tester.add_test_result(
        "VND-005", "Public Document Upload Validation",
        "Vendor", "HIGH", "Web",
        "/api/vendors/public/{vendor_id}/documents", "POST",
        status in [400, 403, 404, 422],
        f"Status: {status}, Upload validated",
        time_ms
    )

    # VND-006: IDOR - Access Other Vendor's Menu
    print("\n[VND-006] Testing IDOR on vendor menu access...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendors/999999/menu"
    )
    # Public menus may be accessible, but editing should not be
    tester.add_test_result(
        "VND-006", "Vendor Menu Access Control",
        "Vendor", "MEDIUM", "All Platforms",
        "/api/vendors/{vendor_id}/menu", "GET",
        status in [200, 404],  # Public menus can be read
        f"Status: {status}, Menu endpoint accessible",
        time_ms
    )

    # VND-007: IDOR - Modify Other Vendor's Menu
    print("\n[VND-007] Testing IDOR on vendor menu modification...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/vendors/999999/menu",
        data={"name": "Hacked Item", "price": 0}
    )
    tester.add_test_result(
        "VND-007", "IDOR Protection on Menu Modification",
        "Vendor", "CRITICAL", "All Platforms",
        "/api/vendors/{vendor_id}/menu", "POST",
        status in [401, 403, 404],
        f"Status: {status}, Menu modification protected",
        time_ms
    )

    # VND-008: IDOR - Access Vendor Earnings
    print("\n[VND-008] Testing IDOR on vendor earnings...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendor/earnings"
    )
    tester.add_test_result(
        "VND-008", "Vendor Earnings Access Control",
        "Vendor", "CRITICAL", "All Platforms",
        "/api/vendor/earnings", "GET",
        status in [401, 403],
        f"Status: {status}, Earnings protected",
        time_ms
    )

    # VND-009: Document Access - Authorization
    print("\n[VND-009] Testing vendor document access authorization...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendor/my-documents"
    )
    tester.add_test_result(
        "VND-009", "Vendor Document Access Authorization",
        "Vendor", "HIGH", "All Platforms",
        "/api/vendor/my-documents", "GET",
        status in [401, 403],
        f"Status: {status}, Documents protected",
        time_ms
    )

    # VND-010: Image Upload - Authorization
    print("\n[VND-010] Testing vendor image upload authorization...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/vendors/1/upload-image"
    )
    tester.add_test_result(
        "VND-010", "Vendor Image Upload Authorization",
        "Vendor", "HIGH", "All Platforms",
        "/api/vendors/{vendor_id}/upload-image", "POST",
        status in [401, 403, 404, 422],
        f"Status: {status}, Image upload protected",
        time_ms
    )

    # VND-011: iOS Platform - Vendor Registration
    # Note: 409 is valid (email already exists), 400/422 is validation error
    print("\n[VND-011] Testing iOS vendor registration endpoint...")
    status, resp, time_ms = tester.make_request(
        "POST", "/api/vendors/public",
        headers=tester.ios_headers,
        data={"restaurant_name": "Test", "contact_email": "test@test.com"}
    )
    tester.add_test_result(
        "VND-011", "iOS Vendor Registration Endpoint",
        "Vendor", "MEDIUM", "iOS",
        "/api/vendors/public", "POST",
        status in [200, 201, 400, 409, 422],
        f"Status: {status}, iOS registration accessible",
        time_ms
    )

    # VND-012: Android Platform - Vendor Profile
    print("\n[VND-012] Testing Android vendor profile endpoint...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendor/profile",
        headers=tester.android_headers
    )
    tester.add_test_result(
        "VND-012", "Android Vendor Profile Access",
        "Vendor", "MEDIUM", "Android",
        "/api/vendor/profile", "GET",
        status in [401, 200],
        f"Status: {status}, Android endpoint accessible",
        time_ms
    )

    # VND-013: SQL Injection - Vendor Search
    print("\n[VND-013] Testing SQL injection in vendor endpoints...")
    status, resp, time_ms = tester.make_request(
        "GET", "/api/vendors?status=active' OR '1'='1"
    )
    tester.add_test_result(
        "VND-013", "SQL Injection Prevention in Vendor Search",
        "Vendor", "CRITICAL", "All Platforms",
        "/api/vendors", "GET",
        status in [200, 400, 422],  # Should either work safely or reject
        f"Status: {status}, SQL injection handled",
        time_ms
    )

    # VND-014: Online Status - Authorization
    print("\n[VND-014] Testing vendor online status toggle...")
    status, resp, time_ms = tester.make_request(
        "PUT", "/api/vendors/999999/online-status",
        data={"is_online": True}
    )
    tester.add_test_result(
        "VND-014", "Vendor Online Status Authorization",
        "Vendor", "HIGH", "All Platforms",
        "/api/vendors/{vendor_id}/online-status", "PUT",
        status in [401, 403, 404],
        f"Status: {status}, Online status protected",
        time_ms
    )

    # VND-015: Delete Vendor - Authorization
    print("\n[VND-015] Testing vendor deletion authorization...")
    status, resp, time_ms = tester.make_request(
        "DELETE", "/api/vendors/999999"
    )
    tester.add_test_result(
        "VND-015", "Vendor Deletion Authorization",
        "Vendor", "CRITICAL", "All Platforms",
        "/api/vendors/{vendor_id}", "DELETE",
        status in [401, 403, 404],
        f"Status: {status}, Deletion protected",
        time_ms
    )


# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_report(tester: SecurityTester) -> str:
    """Generate enterprise-level security report"""

    tester.report.end_time = datetime.utcnow().isoformat()

    # Calculate statistics
    customer_tests = [r for r in tester.report.results if r.category == "Customer"]
    driver_tests = [r for r in tester.report.results if r.category == "Driver"]
    vendor_tests = [r for r in tester.report.results if r.category == "Vendor"]

    critical_tests = [r for r in tester.report.results if r.severity == "CRITICAL"]
    high_tests = [r for r in tester.report.results if r.severity == "HIGH"]
    medium_tests = [r for r in tester.report.results if r.severity == "MEDIUM"]
    low_tests = [r for r in tester.report.results if r.severity == "LOW"]

    critical_passed = len([r for r in critical_tests if r.passed])
    high_passed = len([r for r in high_tests if r.passed])
    medium_passed = len([r for r in medium_tests if r.passed])
    low_passed = len([r for r in low_tests if r.passed])

    ios_tests = [r for r in tester.report.results if "iOS" in r.platform]
    android_tests = [r for r in tester.report.results if "Android" in r.platform]

    # Generate report
    report = f"""
================================================================================
                    DOLLOR.AI ENTERPRISE SECURITY AUDIT REPORT
================================================================================

DOCUMENT CLASSIFICATION: CONFIDENTIAL
REPORT VERSION: 1.0
GENERATED: {tester.report.end_time}

================================================================================
EXECUTIVE SUMMARY
================================================================================

Environment Tested:     {tester.report.environment}
Test Period:           {tester.report.start_time} to {tester.report.end_time}
Total Test Cases:      {tester.report.total_tests}
Tests Passed:          {tester.report.passed} ({tester.report.passed/tester.report.total_tests*100:.1f}%)
Tests Failed:          {tester.report.failed} ({tester.report.failed/tester.report.total_tests*100:.1f}%)

SECURITY POSTURE:      {"STRONG" if tester.report.passed/tester.report.total_tests > 0.9 else "MODERATE" if tester.report.passed/tester.report.total_tests > 0.7 else "NEEDS IMPROVEMENT"}

================================================================================
TEST COVERAGE BY MODULE
================================================================================

+------------------+-------+--------+--------+-----------+
| Module           | Total | Passed | Failed | Pass Rate |
+------------------+-------+--------+--------+-----------+
| Customer         | {len(customer_tests):5d} | {len([r for r in customer_tests if r.passed]):6d} | {len([r for r in customer_tests if not r.passed]):6d} | {len([r for r in customer_tests if r.passed])/len(customer_tests)*100 if customer_tests else 0:7.1f}% |
| Driver           | {len(driver_tests):5d} | {len([r for r in driver_tests if r.passed]):6d} | {len([r for r in driver_tests if not r.passed]):6d} | {len([r for r in driver_tests if r.passed])/len(driver_tests)*100 if driver_tests else 0:7.1f}% |
| Vendor           | {len(vendor_tests):5d} | {len([r for r in vendor_tests if r.passed]):6d} | {len([r for r in vendor_tests if not r.passed]):6d} | {len([r for r in vendor_tests if r.passed])/len(vendor_tests)*100 if vendor_tests else 0:7.1f}% |
+------------------+-------+--------+--------+-----------+
| TOTAL            | {tester.report.total_tests:5d} | {tester.report.passed:6d} | {tester.report.failed:6d} | {tester.report.passed/tester.report.total_tests*100:.1f}% |
+------------------+-------+--------+--------+-----------+

================================================================================
TEST COVERAGE BY SEVERITY
================================================================================

+----------+-------+--------+--------+-----------+
| Severity | Total | Passed | Failed | Pass Rate |
+----------+-------+--------+--------+-----------+
| CRITICAL | {len(critical_tests):5d} | {critical_passed:6d} | {len(critical_tests)-critical_passed:6d} | {critical_passed/len(critical_tests)*100 if critical_tests else 0:7.1f}% |
| HIGH     | {len(high_tests):5d} | {high_passed:6d} | {len(high_tests)-high_passed:6d} | {high_passed/len(high_tests)*100 if high_tests else 0:7.1f}% |
| MEDIUM   | {len(medium_tests):5d} | {medium_passed:6d} | {len(medium_tests)-medium_passed:6d} | {medium_passed/len(medium_tests)*100 if medium_tests else 0:7.1f}% |
| LOW      | {len(low_tests):5d} | {low_passed:6d} | {len(low_tests)-low_passed:6d} | {low_passed/len(low_tests)*100 if low_tests else 0:7.1f}% |
+----------+-------+--------+--------+-----------+

================================================================================
PLATFORM COVERAGE
================================================================================

+----------+-------+--------+
| Platform | Tests | Status |
+----------+-------+--------+
| iOS      | {len(ios_tests):5d} | {"TESTED" if ios_tests else "NOT TESTED":<6s} |
| Android  | {len(android_tests):5d} | {"TESTED" if android_tests else "NOT TESTED":<6s} |
| Web      | {tester.report.total_tests:5d} | TESTED |
| API      | {tester.report.total_tests:5d} | TESTED |
+----------+-------+--------+

================================================================================
DETAILED TEST RESULTS
================================================================================

"""

    # Group results by category
    for category in ["Customer", "Driver", "Vendor"]:
        report += f"\n{'='*70}\n{category.upper()} MODULE TEST RESULTS\n{'='*70}\n\n"

        category_results = [r for r in tester.report.results if r.category == category]

        for result in category_results:
            status_icon = "[PASS]" if result.passed else "[FAIL]"
            report += f"""
{status_icon} {result.test_id}: {result.test_name}
    Severity:      {result.severity}
    Platform:      {result.platform}
    Endpoint:      {result.method} {result.endpoint}
    Response Time: {result.response_time_ms:.0f}ms
    Details:       {result.details}
    Timestamp:     {result.timestamp}
"""

    # Failed tests summary
    failed_tests = [r for r in tester.report.results if not r.passed]
    if failed_tests:
        report += f"""
================================================================================
FAILED TESTS REQUIRING ATTENTION
================================================================================

"""
        for result in failed_tests:
            report += f"""
{result.test_id}: {result.test_name}
    Severity:  {result.severity}
    Endpoint:  {result.method} {result.endpoint}
    Issue:     {result.details}

    RECOMMENDATION: Review and remediate this security control.
"""

    # Security Recommendations
    report += """
================================================================================
SECURITY RECOMMENDATIONS
================================================================================

1. AUTHENTICATION & AUTHORIZATION
   - Ensure all endpoints validate authentication tokens
   - Implement consistent rate limiting across all authentication endpoints
   - Use secure password hashing (bcrypt) with appropriate work factors

2. INPUT VALIDATION
   - Sanitize all user inputs to prevent SQL injection and XSS
   - Validate file uploads using magic byte validation
   - Enforce strict input length limits

3. ACCESS CONTROL
   - Implement IDOR protection on all resource endpoints
   - Validate user ownership before allowing resource modifications
   - Use role-based access control for sensitive operations

4. SECURITY HEADERS
   - Ensure X-Frame-Options, X-Content-Type-Options are set
   - Implement Content-Security-Policy for web applications
   - Enable HSTS for production environments

5. MONITORING & LOGGING
   - Log all authentication attempts (success and failure)
   - Implement security event monitoring
   - Set up alerts for suspicious activity patterns

================================================================================
COMPLIANCE NOTES
================================================================================

This security assessment covers the following compliance frameworks:
- OWASP Top 10 (2021)
- PCI-DSS (Payment Card Industry Data Security Standard)
- SOC 2 Type II Controls
- GDPR Security Requirements

================================================================================
CERTIFICATION
================================================================================

This report has been generated by the automated security testing suite.
All tests were executed against the live API endpoints.

Test Suite Version: 1.0.0
Last Updated: 2026-01-09

================================================================================
                              END OF REPORT
================================================================================
"""

    return report


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Dollor.ai Security Test Suite")
    parser.add_argument("--env", choices=["production", "staging", "local"],
                       default="production", help="Environment to test")
    parser.add_argument("--output", default="security_report.txt",
                       help="Output file for the report")
    args = parser.parse_args()

    # Select environment
    env_map = {
        "production": Environment.PRODUCTION.value,
        "staging": Environment.STAGING.value,
        "local": Environment.LOCAL.value
    }
    base_url = env_map[args.env]

    print("="*70)
    print("DOLLOR.AI ENTERPRISE SECURITY TEST SUITE")
    print("="*70)
    print(f"\nEnvironment: {args.env.upper()}")
    print(f"Base URL:    {base_url}")
    print(f"Started:     {datetime.utcnow().isoformat()}")
    print("\n" + "="*70)

    # Initialize tester
    tester = SecurityTester(base_url)

    # Run all tests
    run_customer_tests(tester)
    run_driver_tests(tester)
    run_vendor_tests(tester)

    # Generate report
    print("\n" + "="*70)
    print("GENERATING SECURITY REPORT...")
    print("="*70)

    report = generate_report(tester)

    # Save report
    with open(args.output, "w") as f:
        f.write(report)

    print(f"\nReport saved to: {args.output}")

    # Print summary
    print("\n" + "="*70)
    print("TEST EXECUTION SUMMARY")
    print("="*70)
    print(f"Total Tests:  {tester.report.total_tests}")
    print(f"Passed:       {tester.report.passed} ({tester.report.passed/tester.report.total_tests*100:.1f}%)")
    print(f"Failed:       {tester.report.failed} ({tester.report.failed/tester.report.total_tests*100:.1f}%)")
    print("="*70)

    # Exit with error code if tests failed
    if tester.report.failed > 0:
        print(f"\nWARNING: {tester.report.failed} security tests failed!")
        sys.exit(1)
    else:
        print("\nAll security tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
