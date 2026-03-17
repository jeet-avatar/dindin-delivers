"""
Security utilities: rate limiting, DoS protection, identity theft detection,
prompt injection blocking, bot detection.
"""

import hashlib
import logging
import os
import re
import time
from collections import defaultdict

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

log = logging.getLogger("beatmind.security")

# ---- Startup enforcement ----

def enforce_secrets():
    errors = []
    if not os.getenv("JWT_SECRET"):
        errors.append("JWT_SECRET env var is required")
    if not os.getenv("ANTHROPIC_API_KEY"):
        errors.append("ANTHROPIC_API_KEY env var is required")
    if os.getenv("STRIPE_SECRET_KEY") and not os.getenv("STRIPE_WEBHOOK_SECRET"):
        errors.append("STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set")
    if errors:
        raise RuntimeError("Missing required env vars:\n" + "\n".join(f"  - {e}" for e in errors))


# ---- Rate limiter (sliding window, in-memory) ----

_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_STORE_MAX_KEYS = 50_000  # Prevent unbounded memory growth


def rate_limit(key: str, max_requests: int, window_seconds: int):
    """Raise 429 if key exceeds max_requests within window_seconds."""
    now = time.time()
    cutoff = now - window_seconds
    hits = [t for t in _rate_store[key] if t > cutoff]
    if len(hits) >= max_requests:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    hits.append(now)
    _rate_store[key] = hits
    # Evict oldest entries if store is too large
    if len(_rate_store) > _RATE_STORE_MAX_KEYS:
        oldest = sorted(_rate_store.keys(), key=lambda k: min(_rate_store[k]) if _rate_store[k] else 0)
        for old_key in oldest[:1000]:
            del _rate_store[old_key]


def get_client_ip(request: Request) -> str:
    # CloudFront sends real IP in X-Forwarded-For[-2]; take last trusted hop
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",")]
        # Behind CloudFront: second-to-last is real client IP
        return parts[-2] if len(parts) >= 2 else parts[0]
    return request.client.host if request.client else "unknown"


# ---- Credential stuffing detection ----

_login_email_tracker: dict[str, set[str]] = defaultdict(set)  # ip → set of emails tried
_login_email_timestamps: dict[str, float] = {}  # ip → window start

def check_credential_stuffing(ip: str, email: str):
    """Block IPs trying many different email addresses (credential stuffing)."""
    now = time.time()
    window = 3600  # 1 hour
    if now - _login_email_timestamps.get(ip, 0) > window:
        _login_email_tracker[ip] = set()
        _login_email_timestamps[ip] = now
    _login_email_tracker[ip].add(email.lower())
    if len(_login_email_tracker[ip]) > 15:  # >15 distinct emails from same IP in 1hr
        log.warning("Credential stuffing detected from IP: %s (%d emails)", ip, len(_login_email_tracker[ip]))
        raise HTTPException(429, "Too many requests. Please try again later.")


# ---- Bot / scraper detection ----

_BOT_UA_PATTERNS = [
    r"python-requests", r"curl/", r"wget/", r"scrapy", r"httpx",
    r"go-http-client", r"okhttp", r"java/", r"apache-httpclient",
    r"bot\b", r"crawler", r"spider", r"scraper", r"headless",
    r"phantomjs", r"selenium", r"playwright", r"puppeteer",
]
_BOT_UA_RE = re.compile("|".join(_BOT_UA_PATTERNS), re.IGNORECASE)

def check_bot_ua(request: Request):
    """Block obvious bots and scrapers on auth endpoints."""
    ua = request.headers.get("User-Agent", "")
    if not ua:
        raise HTTPException(400, "Invalid request")
    if _BOT_UA_RE.search(ua):
        log.warning("Bot UA blocked: %s", ua[:80])
        raise HTTPException(403, "Forbidden")


# ---- Prompt injection detection ----

_INJECTION_PATTERNS = [
    r"ignore (previous|all|above|prior) instructions",
    r"disregard (your|the) (system|previous) (prompt|instructions)",
    r"you are now",
    r"new (role|persona|instructions|system prompt)",
    r"act as (a|an) (different|new|unrestricted)",
    r"jailbreak",
    r"dan (mode|prompt)",
    r"pretend (you|that) (are|have no|don't have)",
    r"forget (everything|all|your|previous)",
    r"override (safety|system|instructions)",
    r"reveal (your|the) (system prompt|instructions|training)",
    r"print (your|the) (system prompt|instructions)",
    r"what (are|were) (your|the) (exact|original) instructions",
]
_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)

def check_prompt_injection(message: str):
    """Detect and block prompt injection attempts."""
    if _INJECTION_RE.search(message):
        log.warning("Prompt injection attempt blocked: %s", message[:100])
        raise HTTPException(400, "Invalid message content.")


# ---- Response watermarking ----

def watermark_response(text: str, user_id: int) -> str:
    """
    Embed an invisible watermark in AI responses.
    Uses zero-width Unicode characters to encode user ID — undetectable visually
    but recoverable forensically if someone leaks/scrapes responses.
    """
    if not text:
        return text
    # Encode user_id as binary using zero-width joiner (ZWJ=1) and zero-width non-joiner (ZWNJ=0)
    binary = format(user_id % 65536, '016b')  # 16-bit encoding
    mark = "".join('\u200d' if b == '1' else '\u200c' for b in binary)
    # Insert watermark after first paragraph break, or at end
    if '\n\n' in text:
        idx = text.index('\n\n')
        return text[:idx] + mark + text[idx:]
    return text + mark


def decode_watermark(text: str) -> int | None:
    """Recover user_id from a watermarked response (for forensics)."""
    bits = ""
    for char in text:
        if char == '\u200d':
            bits += '1'
        elif char == '\u200c':
            bits += '0'
    if len(bits) >= 16:
        return int(bits[:16], 2)
    return None


# ---- Password strength ----

def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(400, "Password must contain at least one uppercase letter")
    if not re.search(r"[0-9]", password):
        raise HTTPException(400, "Password must contain at least one number")


# ---- Bridge token store ----

_bridge_tokens: set[str] = set()

def register_bridge_token(token: str):
    _bridge_tokens.add(token)

def validate_bridge_token(token: str) -> bool:
    return token in _bridge_tokens

def revoke_bridge_token(token: str):
    _bridge_tokens.discard(token)


# ---- Global DoS protection middleware ----

class DoSProtectionMiddleware(BaseHTTPMiddleware):
    """
    Global middleware that runs before any endpoint.
    Enforces:
    - Max request body size (prevents memory exhaustion)
    - Global IP rate limit (prevents flooding)
    - Security headers on every response
    """
    MAX_BODY_BYTES = 64 * 1024  # 64KB max body — chat messages don't need more
    GLOBAL_RATE = 120           # requests per minute per IP (global ceiling)
    GLOBAL_WINDOW = 60

    async def dispatch(self, request: Request, call_next):
        ip = get_client_ip(request)

        # 1. Block obviously oversized bodies early (before parsing)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_BYTES:
            return JSONResponse({"detail": "Request too large"}, status_code=413)

        # 2. Global IP rate limit (all endpoints combined)
        key = f"global:{ip}"
        now = time.time()
        cutoff = now - self.GLOBAL_WINDOW
        hits = [t for t in _rate_store.get(key, []) if t > cutoff]
        if len(hits) >= self.GLOBAL_RATE:
            log.warning("Global rate limit hit from IP: %s", ip)
            return JSONResponse({"detail": "Too many requests"}, status_code=429)
        hits.append(now)
        _rate_store[key] = hits

        # 3. Call the actual endpoint
        response = await call_next(request)

        # 4. Security headers on every response
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "  # Next.js needs inline scripts
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' https://api.beatmind.io wss://api.beatmind.io; "
            "frame-ancestors 'none';"
        )
        # Remove fingerprinting headers
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]

        return response
