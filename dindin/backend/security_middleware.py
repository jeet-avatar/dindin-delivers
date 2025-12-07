"""
Security Middleware for Dollor.ai Backend
==========================================

Implements:
1. Rate Limiting (per IP and per user)
2. Security Headers (HSTS, CSP, X-Frame-Options, etc.)
3. Request Validation
4. DDoS Protection
5. IP Blocking
6. Brute Force Protection
7. Request Size Limits

Usage:
    from security_middleware import add_security_middleware
    add_security_middleware(app)
"""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
from datetime import datetime, timedelta
from typing import Dict, Optional, Set, Callable
from collections import defaultdict
import time
import hashlib
import os
import re
import asyncio
from functools import wraps

# ===================== CONFIGURATION =====================

class SecurityConfig:
    """Security configuration - override with environment variables"""

    # Rate Limiting
    RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # requests per window
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds

    # Auth Rate Limiting (stricter for login endpoints)
    AUTH_RATE_LIMIT_REQUESTS = int(os.getenv("AUTH_RATE_LIMIT_REQUESTS", "5"))
    AUTH_RATE_LIMIT_WINDOW = int(os.getenv("AUTH_RATE_LIMIT_WINDOW", "60"))

    # Brute Force Protection
    MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_DURATION = int(os.getenv("LOCKOUT_DURATION", "900"))  # 15 minutes

    # Request Size Limits
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))  # 10MB

    # IP Blocking
    BLOCKED_IPS: Set[str] = set()

    # Allowed Origins (for CORS) - Production origins always allowed
    ALLOWED_ORIGINS = [
        "https://dollor.ai",
        "https://www.dollor.ai",
        "https://api.dollor.ai",
        "https://admin.dollor.ai",
    ]

    # Development origins only in non-production
    _IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if not _IS_PRODUCTION:
        ALLOWED_ORIGINS.extend([
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
        ])

    # Paths exempt from rate limiting
    RATE_LIMIT_EXEMPT_PATHS = {
        "/health",
        "/ready",
        "/metrics",
        "/docs",
        "/openapi.json",
    }

    # Auth paths (stricter rate limiting)
    AUTH_PATHS = {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/vendor/login",
        "/api/auth/vendor/register",
        "/api/auth/driver/login",
        "/api/auth/driver/register",
        "/api/auth/password/reset",
        "/api/auth/password/reset-confirm",
    }


# ===================== RATE LIMITER =====================

class RateLimiter:
    """In-memory rate limiter with sliding window"""

    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.login_attempts: Dict[str, list] = defaultdict(list)
        self.lockouts: Dict[str, datetime] = {}
        self._cleanup_task = None

    def _get_key(self, request: Request) -> str:
        """Get unique key for rate limiting (IP + optional user)"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"

        # Add user ID if authenticated
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
            return f"{ip}:{token_hash}"

        return ip

    def _cleanup_old_requests(self, key: str, window: int):
        """Remove requests older than the window"""
        cutoff = time.time() - window
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        self.login_attempts[key] = [t for t in self.login_attempts[key] if t > cutoff]

    def is_blocked(self, ip: str) -> bool:
        """Check if IP is in blocklist"""
        return ip in SecurityConfig.BLOCKED_IPS

    def is_locked_out(self, key: str) -> bool:
        """Check if account/IP is locked out due to brute force"""
        if key in self.lockouts:
            if datetime.now() < self.lockouts[key]:
                return True
            else:
                del self.lockouts[key]
        return False

    def check_rate_limit(self, request: Request, is_auth: bool = False) -> tuple[bool, int]:
        """
        Check if request is within rate limit.
        Returns (allowed: bool, retry_after: int)
        """
        key = self._get_key(request)

        # Check IP blocklist
        ip = key.split(":")[0]
        if self.is_blocked(ip):
            return False, 3600  # 1 hour

        # Check lockout
        if self.is_locked_out(key):
            remaining = (self.lockouts[key] - datetime.now()).seconds
            return False, remaining

        # Use stricter limits for auth endpoints
        if is_auth:
            limit = SecurityConfig.AUTH_RATE_LIMIT_REQUESTS
            window = SecurityConfig.AUTH_RATE_LIMIT_WINDOW
        else:
            limit = SecurityConfig.RATE_LIMIT_REQUESTS
            window = SecurityConfig.RATE_LIMIT_WINDOW

        # Cleanup and count
        self._cleanup_old_requests(key, window)

        if len(self.requests[key]) >= limit:
            return False, window

        # Record request
        self.requests[key].append(time.time())
        return True, 0

    def record_login_attempt(self, key: str, success: bool):
        """Record login attempt for brute force protection"""
        if success:
            # Clear failed attempts on successful login
            self.login_attempts[key] = []
            if key in self.lockouts:
                del self.lockouts[key]
        else:
            self.login_attempts[key].append(time.time())

            # Check if should lockout
            recent = [t for t in self.login_attempts[key]
                     if t > time.time() - SecurityConfig.AUTH_RATE_LIMIT_WINDOW]

            if len(recent) >= SecurityConfig.MAX_LOGIN_ATTEMPTS:
                self.lockouts[key] = datetime.now() + timedelta(
                    seconds=SecurityConfig.LOCKOUT_DURATION
                )


# Global rate limiter instance
rate_limiter = RateLimiter()


# ===================== SECURITY HEADERS MIDDLEWARE =====================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Strict-Transport-Security (HSTS)
        # Only add in production to avoid issues with local development
        if os.getenv("ENVIRONMENT", "development") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com https://maps.googleapis.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
            "frame-ancestors 'none';"
        )

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # XSS Protection (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(self), "
            "gyroscope=(), magnetometer=(), microphone=(), "
            "payment=(self), usb=()"
        )

        # Remove server identification
        if "server" in response.headers:
            del response.headers["server"]

        # Add request ID for tracing
        request_id = request.headers.get("X-Request-ID", hashlib.sha256(
            f"{time.time()}{request.client.host if request.client else ''}".encode()
        ).hexdigest()[:16])
        response.headers["X-Request-ID"] = request_id

        return response


# ===================== RATE LIMITING MIDDLEWARE =====================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip exempt paths
        if path in SecurityConfig.RATE_LIMIT_EXEMPT_PATHS:
            return await call_next(request)

        # Check if auth endpoint (stricter limits)
        is_auth = any(path.startswith(auth_path) for auth_path in SecurityConfig.AUTH_PATHS)

        # Check rate limit
        allowed, retry_after = rate_limiter.check_rate_limit(request, is_auth)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please slow down.",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(
                        SecurityConfig.AUTH_RATE_LIMIT_REQUESTS if is_auth
                        else SecurityConfig.RATE_LIMIT_REQUESTS
                    ),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after)
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        key = rate_limiter._get_key(request)
        limit = SecurityConfig.AUTH_RATE_LIMIT_REQUESTS if is_auth else SecurityConfig.RATE_LIMIT_REQUESTS
        window = SecurityConfig.AUTH_RATE_LIMIT_WINDOW if is_auth else SecurityConfig.RATE_LIMIT_WINDOW
        remaining = max(0, limit - len(rate_limiter.requests.get(key, [])))

        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)

        return response


# ===================== REQUEST VALIDATION MIDDLEWARE =====================

class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Validate incoming requests for security issues"""

    # Patterns that indicate potential attacks
    SUSPICIOUS_PATTERNS = [
        r"<script",  # XSS
        r"javascript:",  # XSS
        r"on\w+\s*=",  # Event handlers
        r"union\s+select",  # SQL injection
        r";\s*drop\s+",  # SQL injection
        r"\.\./",  # Path traversal
        r"\.\.\\",  # Path traversal (Windows)
        r"%00",  # Null byte injection
        r"0x",  # Hex encoding
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > SecurityConfig.MAX_CONTENT_LENGTH:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"error": "Request body too large"}
            )

        # Check for suspicious patterns in URL
        url_str = str(request.url).lower()
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, url_str, re.IGNORECASE):
                # Log potential attack
                print(f"[SECURITY] Suspicious request blocked: {request.url} from {request.client.host if request.client else 'unknown'}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid request"}
                )

        # Check for suspicious query parameters
        for key, value in request.query_params.items():
            value_lower = value.lower()
            for pattern in self.SUSPICIOUS_PATTERNS:
                if re.search(pattern, value_lower, re.IGNORECASE):
                    print(f"[SECURITY] Suspicious query parameter blocked: {key}={value}")
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={"error": "Invalid request parameters"}
                    )

        return await call_next(request)


# ===================== SECURE CORS CONFIGURATION =====================

def get_secure_cors_middleware():
    """Get CORS middleware with secure configuration"""

    # In production, use strict origins
    if os.getenv("ENVIRONMENT", "development") == "production":
        origins = [
            "https://dollor.ai",
            "https://www.dollor.ai",
            "https://api.dollor.ai",
            "https://admin.dollor.ai",
        ]
    else:
        origins = SecurityConfig.ALLOWED_ORIGINS

    return CORSMiddleware(
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-CSRF-Token",
            "Stripe-Signature",
        ],
        expose_headers=[
            "X-Request-ID",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Retry-After",
        ],
        max_age=600,  # 10 minutes
    )


# ===================== MAIN SETUP FUNCTION =====================

def add_security_middleware(app: FastAPI):
    """
    Add all security middleware to FastAPI app.

    Call this BEFORE adding routes:
        app = FastAPI()
        add_security_middleware(app)
        # Then add routes...
    """

    # Order matters! Add in reverse order (last added = first executed)

    # 1. Request validation (first line of defense)
    app.add_middleware(RequestValidationMiddleware)

    # 2. Rate limiting
    app.add_middleware(RateLimitMiddleware)

    # 3. Security headers (added to all responses)
    app.add_middleware(SecurityHeadersMiddleware)

    # 4. CORS (must be last to ensure headers are set correctly)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=SecurityConfig.ALLOWED_ORIGINS if os.getenv("ENVIRONMENT") != "production"
                      else ["https://dollor.ai", "https://www.dollor.ai", "https://api.dollor.ai"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Stripe-Signature"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
        max_age=600,
    )

    print("[SECURITY] All security middleware enabled:")
    print("  - Request validation (SQL injection, XSS protection)")
    print("  - Rate limiting (100 req/min general, 5 req/min auth)")
    print("  - Security headers (HSTS, CSP, X-Frame-Options)")
    print("  - Secure CORS configuration")


# ===================== BRUTE FORCE PROTECTION DECORATOR =====================

def brute_force_protected(func):
    """
    Decorator for login endpoints to add brute force protection.

    Usage:
        @router.post("/login")
        @brute_force_protected
        async def login(request: Request, ...):
            ...
    """
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        key = rate_limiter._get_key(request)

        # Check if locked out
        if rate_limiter.is_locked_out(key):
            remaining = (rate_limiter.lockouts[key] - datetime.now()).seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked. Try again in {remaining} seconds.",
                headers={"Retry-After": str(remaining)}
            )

        try:
            result = await func(request, *args, **kwargs)
            # Success - clear failed attempts
            rate_limiter.record_login_attempt(key, success=True)
            return result
        except HTTPException as e:
            if e.status_code in [401, 403]:
                # Failed login attempt
                rate_limiter.record_login_attempt(key, success=False)
            raise

    return wrapper


# ===================== IP BLOCKING UTILITIES =====================

def block_ip(ip: str, reason: str = ""):
    """Add IP to blocklist"""
    SecurityConfig.BLOCKED_IPS.add(ip)
    print(f"[SECURITY] IP blocked: {ip} - {reason}")

def unblock_ip(ip: str):
    """Remove IP from blocklist"""
    SecurityConfig.BLOCKED_IPS.discard(ip)
    print(f"[SECURITY] IP unblocked: {ip}")

def get_blocked_ips() -> Set[str]:
    """Get set of blocked IPs"""
    return SecurityConfig.BLOCKED_IPS.copy()
