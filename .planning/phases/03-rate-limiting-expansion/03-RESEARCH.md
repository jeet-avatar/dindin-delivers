# Phase 03: Rate Limiting Expansion - Research

**Researched:** 2026-02-21
**Domain:** Redis-based rate limiting for FastAPI endpoints
**Confidence:** HIGH

## Summary

Phase 03 extends the existing Redis-backed rate limiting infrastructure to cover password reset, payment/checkout, admin mutation, and registration endpoints. The foundation is already solid: `cache.py` provides a production-grade `rate_limit_check()` using Redis sorted sets (sliding window algorithm), and `main_new.py:433-457` wraps it in a `RateLimiter` class + `check_rate_limit()` helper that extracts client IP and raises 429 with `Retry-After` header.

The current implementation covers 5 endpoints: 4 logins (10 req/min per IP) and 1 customer registration (5 req/5min per IP). This phase needs to expand to ~25+ additional endpoints across 4 categories. The primary challenge is not building new infrastructure (it exists) but: (1) extending the key strategy beyond IP-only to support per-email and per-user-ID keys, (2) adding `check_rate_limit` calls to every target endpoint without missing any, and (3) ensuring the router-based endpoints (`bid_routes.py`, `stripe_integration.py`, `order_flow.py`, `matchmaking_routes.py`, `rideshare_payments.py`) can access the rate limiting utilities.

**Primary recommendation:** Extend `check_rate_limit()` in `main_new.py` with an optional `identifier` parameter for email/user-ID-based keys, create 4 new `RateLimiter` instances (password_reset, payment, admin_mutation, registration), and add `check_rate_limit()` calls to each target endpoint. No new libraries needed -- everything uses existing Redis infrastructure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Registration: 5 requests/hour per IP (locked by user)
- Existing pattern: login rate limiting already uses Redis (ElastiCache) -- follow established patterns
- Retry-After header required (from RATE-05 success criteria)
- Admin endpoints: leave rate limiting as-is (user decision) -- NOTE: this refers to the existing admin login rate limit, not the new admin mutation rate limit which IS in scope (RATE-03)
- Demo accounts: leave as-is

### Claude's Discretion
- All threshold values except registration (5/hr per IP)
- Rate limit scoping strategy (per IP vs per user vs per email)
- 429 response body format
- Whether to add client-side 429 handling in iOS/Android apps
- Redis key naming and TTL patterns
- Whether to reuse existing rate limiting middleware or create new

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RATE-01 | Password reset endpoint rate-limited (prevent abuse) | 8 password reset endpoints identified across 3 user types + generic. Extend `check_rate_limit()` with email-based key. Use 5 req/hr per email (matches `PasswordResetService.max_attempts_per_hour`). |
| RATE-02 | Payment/checkout endpoints rate-limited (prevent duplicate charges) | ~10 payment endpoints identified across `main_new.py`, `stripe_integration.py`, `rideshare_payments.py`, `matchmaking_routes.py`, `order_flow.py`. Use 10 req/min per authenticated user ID. |
| RATE-03 | Admin mutation endpoints rate-limited (prevent accidental mass operations) | ~22 admin POST/PUT/DELETE endpoints in `main_new.py`. Use 30 req/min per admin (IP-based since admin already authenticated). |
| RATE-04 | Registration endpoints rate-limited (prevent bot signups) | 5 registration endpoints + 5 OAuth registration endpoints identified. Only customer register has rate limiting currently. Extend to all 10. Use 5 req/hr per IP (user locked). |
| RATE-05 | Rate limit responses return proper 429 with Retry-After header | Already implemented in existing `check_rate_limit()` at `main_new.py:452-457`. All new rate-limited endpoints automatically get this behavior. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `redis` (Python) | Already in requirements.txt | Redis sorted set operations for sliding window | Already used in `cache.py`, production-proven with ElastiCache |
| FastAPI `HTTPException` | Already imported | 429 responses with `Retry-After` header | Already the pattern used by `check_rate_limit()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ElastiCache Redis | `dollor-redis.uwva3u.0001.use1.cache.amazonaws.com:6379` | Shared rate limit state across workers/tasks | Already provisioned and connected |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled sorted-set limiter | `slowapi` (FastAPI rate limiting library) | slowapi adds dependency + different pattern. Existing sorted-set approach is already working, shared across ECS tasks, and well-understood. Stick with existing. |
| Per-endpoint `check_rate_limit()` calls | FastAPI middleware-based rate limiting | Middleware approach would be cleaner but harder to customize per-endpoint (different keys, different thresholds). Current per-endpoint approach is explicit and matches existing pattern. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Current Rate Limiting Architecture
```
main_new.py
├── RateLimiter class          # Config container (max_requests, window_seconds)
├── auth_rate_limiter          # 10 req/min (login endpoints)
├── registration_rate_limiter  # 5 req/5min (customer register only)
├── check_rate_limit()         # IP-based key builder + HTTPException raiser
│   └── calls cache.rate_limit_check()
│
cache.py
└── rate_limit_check()         # Redis sorted set sliding window
    └── redis_client (ElastiCache)
```

### Target Architecture (after Phase 03)
```
main_new.py
├── RateLimiter class          # Config container (unchanged)
├── auth_rate_limiter          # 10 req/min per IP (login -- existing)
├── registration_rate_limiter  # 5 req/hr per IP (all registration -- expanded)
├── password_reset_limiter     # 5 req/hr per email (NEW)
├── payment_limiter            # 10 req/min per user (NEW)
├── admin_mutation_limiter     # 30 req/min per IP (NEW)
├── check_rate_limit()         # Extended: optional `identifier` param for non-IP keys
│   └── calls cache.rate_limit_check()
│
cache.py
└── rate_limit_check()         # Redis sorted set sliding window (unchanged)
    └── redis_client (ElastiCache)
```

### Pattern 1: IP-Based Rate Limiting (Existing)
**What:** Rate limit by client IP extracted from `X-Forwarded-For` or `request.client.host`
**When to use:** Registration, admin mutations, login (unauthenticated or IP-is-sufficient)
**Example:**
```python
# Source: main_new.py:444-457 (existing code)
def check_rate_limit(request, limiter: RateLimiter, key_prefix: str = ""):
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    key = f"ratelimit:{key_prefix}:{client_ip}"
    is_allowed, retry_after = rate_limit_check(key, limiter.max_requests, limiter.window_seconds)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
```

### Pattern 2: Email-Based Rate Limiting (New for Password Reset)
**What:** Rate limit by email address in request body (prevents password reset abuse per email)
**When to use:** Password reset request endpoints
**Example:**
```python
# New helper -- extend check_rate_limit with optional identifier
def check_rate_limit(request, limiter: RateLimiter, key_prefix: str = "", identifier: str = None):
    if identifier:
        key = f"ratelimit:{key_prefix}:{identifier}"
    else:
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        key = f"ratelimit:{key_prefix}:{client_ip}"
    is_allowed, retry_after = rate_limit_check(key, limiter.max_requests, limiter.window_seconds)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
```

### Pattern 3: User-ID-Based Rate Limiting (New for Payment)
**What:** Rate limit by authenticated user/customer/driver ID
**When to use:** Payment endpoints where the user is authenticated
**Example:**
```python
# In a payment endpoint:
check_rate_limit(request, payment_limiter, "payment", identifier=str(customer.id))
```

### Anti-Patterns to Avoid
- **Global rate limit on all endpoints:** Would break legitimate high-frequency operations (WebSocket, polling, health checks)
- **Only IP-based keys for authenticated endpoints:** Behind NAT/proxy, many users share IPs. Use user ID when available.
- **Database-backed rate limiting:** The `RateLimitEntry` model exists in `models.py:1650` but is NOT used anywhere. Redis is the correct choice (faster, TTL-native, shared across workers). Do NOT start using the DB model.
- **Separate rate limit middleware:** Adding a new middleware layer would conflict with the existing per-endpoint approach and make debugging harder.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sliding window rate limiting | Custom counter logic | Existing `cache.rate_limit_check()` (Redis sorted sets) | Already handles edge cases: pipeline atomicity, TTL cleanup, retry-after calculation |
| Cross-worker rate limit sharing | In-memory dict with timestamps | Redis via ElastiCache | 4 uvicorn workers + 2 ECS tasks = 8 processes. In-memory fails silently. |
| Retry-After header calculation | Manual timestamp math | Existing `rate_limit_check()` returns `retry_after` | Already calculates from oldest entry in window |

**Key insight:** The entire rate limiting infrastructure is already built and production-tested. This phase is purely about calling `check_rate_limit()` in more places with appropriate keys and thresholds.

## Common Pitfalls

### Pitfall 1: Missing Router-Based Endpoints
**What goes wrong:** Rate limiting is only added to `main_new.py` endpoints but not to router endpoints in `stripe_integration.py`, `bid_routes.py`, `order_flow.py`, `matchmaking_routes.py`, `rideshare_payments.py`
**Why it happens:** Routers are in separate files and the `check_rate_limit()` function is defined in `main_new.py`, not importable
**How to avoid:** Either (a) move `check_rate_limit` and `RateLimiter` to `cache.py` so all routers can import it, or (b) import it from `main_new` (risk of circular imports), or (c) duplicate the small function in each router file. Option (a) is cleanest.
**Warning signs:** Payment endpoints in `stripe_integration.py` and `rideshare_payments.py` not returning 429

### Pitfall 2: Registration Limiter Window Mismatch
**What goes wrong:** Current `registration_rate_limiter` is 5 req/5min (300s). User locked decision is 5 req/hr (3600s). If not updated, registration allows 5 per 5 minutes instead of 5 per hour.
**Why it happens:** Existing limiter was set before this requirement
**How to avoid:** Update `registration_rate_limiter` from `window_seconds=300` to `window_seconds=3600`
**Warning signs:** Test shows registration still allowed after 5 attempts within the hour

### Pitfall 3: Password Reset Has Two Rate Limiting Layers
**What goes wrong:** `PasswordResetService.create_reset_token()` (line 173-182) already has its own DB-based rate limiting (5 attempts per hour per email). Adding Redis rate limiting could create confusing double-rejection.
**Why it happens:** The password_reset_service.py was built independently with its own rate limiting
**How to avoid:** The role-specific endpoints (`/api/customer/password-reset/request`, `/api/driver/password-reset/request`, `/api/vendor/password-reset/request`) do NOT use `PasswordResetService` -- they use inline code. Only the generic `/api/auth/password-reset/request` endpoint is a stub. So Redis rate limiting on the role-specific endpoints is non-conflicting. Leave `PasswordResetService` as-is (defense in depth).
**Warning signs:** Users getting rate limited at different thresholds depending on which code path they hit

### Pitfall 4: OAuth Registration Endpoints Also Need Rate Limiting
**What goes wrong:** Rate limiting is added to form-based registration but not OAuth (Google/Apple) endpoints that also create accounts
**Why it happens:** OAuth endpoints are named `*-auth` not `*-register` so they're missed in search
**How to avoid:** Include all 10 registration pathways (listed in Endpoint Inventory below)
**Warning signs:** Bot signups via fake Google tokens bypass rate limiting

### Pitfall 5: ERP Alias Endpoints Double-Counting
**What goes wrong:** Some endpoints are aliases (e.g., `POST /api/orders/create` calls `erp_create_order`). If rate limiting is on both, a single request consumes 2 rate limit tokens.
**Why it happens:** Alias endpoints forward to the same function
**How to avoid:** Apply rate limiting only at the outermost endpoint (the alias), not on the inner function. Or use the same Redis key for both aliases so they share the window.
**Warning signs:** Users getting rate limited at half the expected threshold

### Pitfall 6: Stripe Webhooks Must NOT Be Rate Limited
**What goes wrong:** `/api/webhooks/stripe-connect` (line 4911) or `/api/webhooks/stripe` (stripe_integration.py:326) get rate limited, causing payment events to be dropped
**Why it happens:** They match the "payment endpoint" category
**How to avoid:** Explicitly exclude webhook endpoints from rate limiting. Webhooks are server-to-server from Stripe and have their own signature validation.
**Warning signs:** Stripe dashboard shows webhook failures

## Code Examples

### Example 1: Extending check_rate_limit with identifier support
```python
# Source: Recommended modification to main_new.py:444-457
def check_rate_limit(request, limiter: RateLimiter, key_prefix: str = "", identifier: str = None):
    """Check rate limit and raise HTTPException if exceeded.

    Args:
        request: FastAPI Request object
        limiter: RateLimiter config
        key_prefix: Redis key prefix (e.g., "password_reset")
        identifier: Optional override for key suffix (email, user_id).
                    If None, uses client IP from X-Forwarded-For or direct connection.
    """
    if identifier:
        key = f"ratelimit:{key_prefix}:{identifier}"
    else:
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        key = f"ratelimit:{key_prefix}:{client_ip}"

    is_allowed, retry_after = rate_limit_check(key, limiter.max_requests, limiter.window_seconds)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
```

### Example 2: Adding rate limiting to a password reset endpoint
```python
# Source: main_new.py:6222 (customer password reset request)
@app.post("/api/customer/password-reset/request")
def customer_request_password_reset(
    request: CustomerPasswordResetRequest,
    http_request: Request,  # Need to add Request param
    db: Session = Depends(get_db)
):
    # Rate limit by email (5 per hour)
    check_rate_limit(http_request, password_reset_limiter, "pwd_reset", identifier=request.email.lower())
    # ... existing code ...
```

### Example 3: Adding rate limiting to a payment endpoint
```python
# Source: main_new.py:5529 (ride complete-and-pay)
@app.post("/api/rides/{ride_id}/complete-and-pay")
async def complete_ride_and_pay_driver(
    ride_id: int,
    request: Request,  # Need to add for rate limiting
    _auth_driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db)
):
    check_rate_limit(request, payment_limiter, "payment", identifier=str(_auth_driver.id))
    # ... existing code ...
```

### Example 4: Making rate limiting importable from cache.py
```python
# Move to cache.py to avoid circular imports
class RateLimiter:
    """Redis-backed rate limiter config"""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds

def check_rate_limit(request, limiter: RateLimiter, key_prefix: str = "", identifier: str = None):
    """Check rate limit. Raises HTTPException(429) if exceeded."""
    from fastapi import HTTPException  # Local import to keep cache.py lightweight
    if identifier:
        key = f"ratelimit:{key_prefix}:{identifier}"
    else:
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        key = f"ratelimit:{key_prefix}:{client_ip}"
    is_allowed, retry_after = rate_limit_check(key, limiter.max_requests, limiter.window_seconds)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
```

## Endpoint Inventory

### Password Reset Endpoints (RATE-01) -- 8 endpoints
| Endpoint | File | Line | Current Rate Limit | Key Strategy |
|----------|------|------|--------------------|--------------|
| `POST /api/auth/password-reset/request` | main_new.py | 2459 | NONE | per email |
| `POST /api/auth/password-reset/confirm` | main_new.py | 2484 | NONE | per email |
| `POST /api/customer/password-reset/request` | main_new.py | 6222 | NONE | per email |
| `POST /api/customer/password-reset/confirm` | main_new.py | 6256 | NONE | per email |
| `POST /api/driver/password-reset/request` | main_new.py | 6306 | NONE | per email |
| `POST /api/driver/password-reset/confirm` | main_new.py | 6339 | NONE | per email |
| `POST /api/vendor/password-reset/request` | main_new.py | 6386 | NONE | per email |
| `POST /api/vendor/password-reset/confirm` | main_new.py | 6415 | NONE | per email |

### Payment/Checkout Endpoints (RATE-02) -- 10 endpoints
| Endpoint | File | Line | Current Rate Limit | Key Strategy |
|----------|------|------|--------------------|--------------|
| `POST /api/rides/{ride_id}/complete-and-pay` | main_new.py | 5529 | NONE | per driver ID |
| `POST /api/invoices/{invoice_id}/payments` | main_new.py | 7570 | NONE | per admin IP |
| `POST /api/orders/{order_id}/tip-driver` | main_new.py | 15036 | NONE | per customer ID |
| `POST /api/rides/{ride_id}/tip` | main_new.py | 15570 | NONE | per customer ID |
| `POST /api/erp/payments/intent` | main_new.py | 17534 | NONE | per user ID |
| `POST /api/erp/payments/refund` | main_new.py | 17658 | NONE | per user ID |
| `POST /api/payments/create-intent` | stripe_integration.py | 112 | NONE | per user ID |
| `POST /api/payments/ride/create-intent` | rideshare_payments.py | 62 | NONE | per user ID |
| `POST /api/matchmaking/accept-bid` | matchmaking_routes.py | 377 | NONE | per user ID |
| `POST /api/erp/orders/{order_id}/confirm-payment` | order_flow.py | 1404 | NONE | per user ID |

**Excluded from rate limiting (by design):**
- `POST /api/webhooks/stripe-connect` (main_new.py:4911) -- server-to-server Stripe webhook
- `POST /api/webhooks/stripe` (stripe_integration.py:326) -- server-to-server Stripe webhook
- `POST /api/erp/payouts/{payout_id}/process` (order_flow.py:3346) -- admin-triggered, already protected by require_admin
- `POST /api/drivers/{driver_id}/payouts` (main_new.py:5355) -- driver payout request, already auth-gated
- `POST /api/matchmaking/driver/payment-info` (matchmaking_routes.py:491) -- info retrieval, not money movement

### Admin Mutation Endpoints (RATE-03) -- 18 endpoints
| Endpoint | File | Line | Current Rate Limit |
|----------|------|------|--------------------|
| `POST /api/admin/backfill-payouts` | main_new.py | 526 | NONE |
| `POST /api/admin/migrate` | main_new.py | 572 | NONE |
| `DELETE /api/admin/customers/by-email/{email}` | main_new.py | 3480 | NONE |
| `POST /api/admin/vendors/{vendor_id}/documents/{document_type}/approve` | main_new.py | 11423 | NONE |
| `POST /api/admin/vendors/{vendor_id}/documents/{document_type}/reject` | main_new.py | 11469 | NONE |
| `POST /api/admin/vendors/{vendor_id}/documents/upload` | main_new.py | 11512 | NONE |
| `POST /api/admin/set-document-status` | main_new.py | 11608 | NONE |
| `POST /api/admin/menu/{item_id}/approve` | main_new.py | 11863 | NONE |
| `POST /api/admin/menu/{item_id}/reject` | main_new.py | 11894 | NONE |
| `POST /api/admin/menu/{item_id}/flag` | main_new.py | 11928 | NONE |
| `POST /api/admin/vendors/{vendor_id}/verify-menu` | main_new.py | 12476 | NONE |
| `POST /api/admin/vendors/{vendor_id}/publish` | main_new.py | 12527 | NONE |
| `POST /api/admin/vendors/{vendor_id}/unpublish` | main_new.py | 12688 | NONE |
| `POST /api/admin/cleanup-expired-bids` | main_new.py | 19038 | NONE |
| `POST /api/admin/drivers/{driver_id}/set-documents` | main_new.py | 20290 | NONE |
| `POST /api/admin/drivers/{driver_id}/verify` | main_new.py | 20346 | NONE |
| `POST /api/admin/cleanup/pending-orders` | main_new.py | 20391 | NONE |
| `POST /api/admin/cleanup/all-incomplete` | main_new.py | 20452 | NONE |

**Excluded from admin rate limiting:**
- `POST /api/admin/login` (main_new.py:1658) -- already rate limited by `auth_rate_limiter`
- `POST /api/auth/admin/setup-production` (main_new.py:1592) -- one-time setup, not production
- `DELETE /api/auth/admin/legacy-cleanup` (main_new.py:1625) -- one-time cleanup
- `POST /api/auth/admin/demo-login` (main_new.py:1641) -- demo endpoint
- Admin GET endpoints -- reads don't need rate limiting

### Registration Endpoints (RATE-04) -- 10 endpoints
| Endpoint | File | Line | Current Rate Limit | Action |
|----------|------|------|--------------------|--------|
| `POST /register` | main_new.py | 1572 | NONE | Add registration_rate_limiter |
| `POST /api/auth/vendor/register` | main_new.py | 2041 | NONE | Add registration_rate_limiter |
| `POST /api/auth/vendor/google-auth` | main_new.py | 2198 | NONE | Add registration_rate_limiter |
| `POST /api/auth/vendor/apple-auth` | main_new.py | 2335 | NONE | Add registration_rate_limiter |
| `POST /api/auth/driver/register` | main_new.py | 2655 | NONE | Add registration_rate_limiter |
| `POST /api/auth/driver/google` | main_new.py | 2765 | NONE | Add registration_rate_limiter |
| `POST /api/auth/driver/apple-auth` | main_new.py | 2904 | NONE | Add registration_rate_limiter |
| `POST /api/auth/customer/register` | main_new.py | 3168 | YES (5/5min) | Update window to 3600s |
| `POST /api/auth/customer/google` | main_new.py | 3303 | NONE | Add registration_rate_limiter |
| `POST /api/customer/register` | main_new.py | 5963 | NONE | Add registration_rate_limiter |

**Note on OAuth endpoints:** Google/Apple auth endpoints handle BOTH login and registration. Rate limiting them at 5/hr is too aggressive for returning users logging in. **Recommendation:** Apply registration rate limiter only to the account-creation path (inside the function, after detecting "new user"), OR accept the 5/hr limit since the auth_rate_limiter (10/min) already covers the login frequency need and 5/hr is still generous for legitimate use.

**Simpler approach (recommended):** Apply `registration_rate_limiter` to all 10 endpoints uniformly. OAuth login users who hit the limit can use the dedicated login endpoints instead. This keeps the implementation simple and the security benefit clear.

## Threshold Recommendations

| Category | Threshold | Window | Scope | Rationale |
|----------|-----------|--------|-------|-----------|
| Password Reset | 5 requests | 1 hour (3600s) | Per email | Matches `PasswordResetService.max_attempts_per_hour=5`. More than 5 resets per hour per email is abuse. |
| Payment/Checkout | 10 requests | 1 minute (60s) | Per user ID | Normal checkout flow: 1-2 requests. 10/min prevents hammering without blocking legitimate retries. |
| Admin Mutations | 30 requests | 1 minute (60s) | Per IP | Admins do bulk operations. 30/min allows efficient work while preventing runaway scripts. |
| Registration | 5 requests | 1 hour (3600s) | Per IP | User-locked decision. Prevents bot signup floods. |

## Files That Need Changes

| File | Changes | Endpoints Affected |
|------|---------|-------------------|
| `main_new.py` | Update `check_rate_limit` signature, add 3 new `RateLimiter` instances, update `registration_rate_limiter` window, add `check_rate_limit` calls to ~36 endpoints | Password reset (8), admin (18), registration (9 + update 1), payment (6) |
| `cache.py` | Move `RateLimiter` class and `check_rate_limit()` here (or create importable wrapper) | Enables routers to import rate limiting |
| `stripe_integration.py` | Add `check_rate_limit` call to `/payments/create-intent` | 1 payment endpoint |
| `rideshare_payments.py` | Add `check_rate_limit` call to `/create-intent` | 1 payment endpoint |
| `matchmaking_routes.py` | Add `check_rate_limit` call to `/accept-bid` | 1 payment endpoint |
| `order_flow.py` | Add `check_rate_limit` call to `/orders/{id}/confirm-payment` | 1 payment endpoint |

## Testing Strategy

### Unit Tests for Rate Limiting
The existing test at `tests/api/test_endpoints.py:353` only checks health endpoint is not rate limited. New tests should:

1. **Test 429 response format:** Verify response has `status_code=429`, `Retry-After` header, and descriptive message
2. **Test per-category thresholds:** For each category, send N+1 requests and verify the last one returns 429
3. **Test key isolation:** Different emails/users/IPs should have independent rate limits
4. **Test Redis fallback:** When Redis is unavailable, rate limiting should fail-open (allow requests)

### Mocking Strategy
Since tests run without Redis, `rate_limit_check` in `cache.py` returns `(True, 0)` when Redis is unavailable. To test rate limiting:
- Mock `cache.rate_limit_check` to simulate hitting the limit
- Or mock `redis_client` to return controlled responses

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DB-backed rate limiting (`RateLimitEntry` model) | Redis sorted set sliding window | Phase v1.1 (Feb 2026) | 100x faster, shared across workers, auto-expiring keys |
| IP-only rate limiting | IP + email + user ID hybrid | Phase 03 (this phase) | Better abuse prevention for authenticated endpoints |

**Deprecated/outdated:**
- `RateLimitEntry` model in `models.py:1650`: Exists but is unused. Do NOT use it -- Redis is the correct backend for rate limiting.
- `verification_routes.py:88` has its own in-memory `check_rate_limit` function: This is a separate rate limiting implementation for document verification, not related to this phase. Leave it alone.

## Open Questions

1. **OAuth endpoint dual-purpose**
   - What we know: Google/Apple auth endpoints handle both login AND registration
   - What's unclear: Whether 5/hr limit on these endpoints would frustrate legitimate users who log in frequently via OAuth
   - Recommendation: Apply uniformly (5/hr). Users can use dedicated login endpoints if rate limited. Login endpoints have their own 10/min limit.

2. **Customer card endpoints**
   - What we know: Card management endpoints (`POST /api/customer/cards`) exist
   - What's unclear: Whether adding/removing cards should be rate limited as "payment" endpoints
   - Recommendation: Exclude card CRUD from payment rate limiting. These don't involve money movement.

3. **`/api/customer/apple-auth` (line 6085)**
   - What we know: This is a separate Apple auth endpoint for the customer food delivery flow
   - What's unclear: Whether it creates accounts (registration) or only logs in
   - Recommendation: Include it in registration rate limiting for safety -- the 5/hr limit won't affect normal login patterns

## Sources

### Primary (HIGH confidence)
- `cache.py` lines 98-134 -- Redis sorted set rate limiting implementation
- `main_new.py` lines 430-457 -- RateLimiter class, instances, and check_rate_limit helper
- `main_new.py` lines 1709, 1741, 2557, 3122, 3172 -- Existing rate limit call sites
- `password_reset_service.py` lines 93, 173-182 -- PasswordResetService built-in rate limiting

### Secondary (MEDIUM confidence)
- Redis sorted set sliding window is a well-documented pattern (Redis documentation: ZADD + ZRANGEBYSCORE + ZREMRANGEBYSCORE)
- FastAPI HTTPException supports custom headers (used for Retry-After)

### Tertiary (LOW confidence)
- None -- all findings verified against actual codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, everything already exists in codebase
- Architecture: HIGH -- extending existing pattern, not building new infrastructure
- Pitfalls: HIGH -- identified from direct code analysis of existing implementation
- Endpoint inventory: HIGH -- every endpoint verified with grep against actual code

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- rate limiting infrastructure won't change)
