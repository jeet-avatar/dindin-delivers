---
phase: quick-26
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/web/p2p-platform/backend/auth_utils.py
  - apps/web/p2p-platform/backend/cache.py
  - apps/web/p2p-platform/backend/websocket_server.py
autonomous: true
requirements: [SEC-NETWORK-AUDIT]

must_haves:
  truths:
    - "All CRITICAL and HIGH network security vulnerabilities are identified with file:line references"
    - "All CRITICAL findings have code fixes applied and verified"
    - "All HIGH findings have code fixes applied and verified"
    - "Backend test suite still passes after all fixes"
    - "WebSocket connections require authentication"
    - "Swagger/OpenAPI docs are disabled in production"
    - "No password-related endpoints accept empty or trivially short passwords"
    - "Rate limiting covers all sensitive endpoints including registration"
  artifacts:
    - path: ".planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md"
      provides: "Complete network security audit report with findings by severity"
      min_lines: 200
  key_links:
    - from: "NETWORK_SECURITY_REPORT.md"
      to: "backend *.py files"
      via: "file:line references for every finding"
      pattern: "main_new.py:\\d+|bid_routes.py:\\d+|auth_utils.py:\\d+"
---

<objective>
Deep network security audit of the Dollor.ai backend and infrastructure, identifying how remote attackers and bots can exploit the system, followed by fixing all CRITICAL and HIGH findings.

Purpose: The iOS and Android VAPT audits (quick tasks 22-23) covered client-side security. This audit covers the server-side attack surface: auth bypass, bot abuse, injection, rate limiting gaps, business logic attacks, and infrastructure exposure.

Output: NETWORK_SECURITY_REPORT.md with categorized findings, plus code fixes for CRITICAL/HIGH issues.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/auth_utils.py
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/order_flow.py
@apps/web/p2p-platform/backend/rideshare_payments.py
@apps/web/p2p-platform/backend/stripe_integration.py
@apps/web/p2p-platform/backend/cache.py
@apps/web/p2p-platform/backend/websocket_server.py
@apps/web/p2p-platform/backend/password_reset_service.py
@.planning/SECURITY_AUDIT_2026-02-20.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Deep Security Audit — Produce NETWORK_SECURITY_REPORT.md</name>
  <files>
    .planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md
  </files>
  <action>
Perform a comprehensive security audit of ALL backend Python files against the 6 categories below. For EVERY finding, include the exact file path, line number(s), a code snippet showing the vulnerability, the severity (CRITICAL/HIGH/MEDIUM/LOW/INFO), and a recommended fix.

Read each backend file fully:
- `apps/web/p2p-platform/backend/main_new.py` (all ~18,000+ lines — read in chunks)
- `apps/web/p2p-platform/backend/bid_routes.py`
- `apps/web/p2p-platform/backend/order_flow.py`
- `apps/web/p2p-platform/backend/stripe_integration.py`
- `apps/web/p2p-platform/backend/rideshare_payments.py`
- `apps/web/p2p-platform/backend/cache.py`
- `apps/web/p2p-platform/backend/websocket_server.py`
- `apps/web/p2p-platform/backend/password_reset_service.py`
- `apps/web/p2p-platform/backend/database.py`
- `apps/web/p2p-platform/backend/models.py`

**Category 1: Auth Bypass and Session Attacks**
Audit for:
- JWT: 30-day token expiry (`ACCESS_TOKEN_EXPIRE_MINUTES = 43200` at main_new.py:844) — no refresh token rotation, no revocation mechanism. A stolen token is valid for 30 days.
- JWT algorithm: Verify `jose` library handles `alg:none` attacks properly (it does by default when algorithms list is explicit — confirm).
- WebSocket has NO auth: `/ws/{client_id}` at main_new.py:18000 accepts ANY client_id string with zero JWT verification. Anyone can connect as `customer_123` or `driver_456` and receive real-time ride/order data. This is CRITICAL.
- Swagger/OpenAPI docs exposed in production: `/docs`, `/openapi`, `/redoc` are in `_PUBLIC_PREFIXES` (main_new.py:350-351). These expose the entire API surface to attackers in production. CRITICAL.
- Admin setup endpoint with hardcoded password: `setup_production_admin` at main_new.py:1576-1606 hardcodes `DollorAdmin2026!`. While it checks `_is_production` to return 404, the staging environment would still expose this. HIGH.
- Public path allowlist review: Check if any prefix in `_PUBLIC_PREFIXES` is too broad (e.g., `/api/demo/` relies on own `_require_admin_secret` — but does every demo endpoint actually call it?).
- Role escalation: Can a customer JWT be used to access driver endpoints? The global middleware only checks JWT validity, not role. Per-endpoint `require_customer`/`require_driver` guards are the actual role check — but any endpoint using only `require_any_auth` accepts ANY role.

**Category 2: Bot Abuse Vectors**
Audit for:
- Registration rate limits: `registration_rate_limiter` is 5/hour (main_new.py:435). Verify ALL registration endpoints actually USE it (customer, driver, vendor registration).
- Registration endpoint grep: Check if `check_rate_limit(request, registration_rate_limiter, ...)` is called in customer registration (main_new.py around line 3100+), driver registration, vendor registration.
- Bid stuffing: Can a single driver submit multiple bids on the same ride? Check bid_routes.py `submit_bid` for duplicate-bid prevention.
- `bidding_duration_minutes` is user-controlled (bid_routes.py:86, default 5) — can a bot set this to 999999 to keep a ride request open forever?
- Ride request spam: Is there any limit on how many open ride requests a customer can have simultaneously?
- Account enumeration: Do registration endpoints reveal "Email already registered" (main_new.py:2072) vs generic error? This helps attackers enumerate valid emails.
- Credential stuffing: Login rate limit is 10/minute (main_new.py:434). No account lockout after repeated failures. A distributed botnet doing 9 attempts/min/IP bypasses this.

**Category 3: Injection and Data Manipulation**
Audit for:
- SQL injection via `text(f"...")` patterns: The migration endpoint uses `text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}")` (main_new.py:704+). These are admin-only and use hardcoded column names — safe. But verify ALL `text()` calls across all files.
- Any `text()` calls with user-supplied input in query parameters or request bodies.
- XSS: `sanitize_text()` (main_new.py:445) strips HTML tags. Verify it's applied to ALL user text inputs (names, addresses, messages, special_requests). Check bid messages in `submit_bid`, order delivery_instructions, etc.
- SSRF: `order_flow.py` uses `requests.post(PAYMENT_SERVICE_URL...)` and `requests.post(NOTIFICATION_SERVICE_URL...)`. Are these URLs from env vars only? Can any user input influence them?
- Check for any `eval()`, `exec()`, `os.system()`, `subprocess` calls with user input.

**Category 4: Rate Limiting and DoS**
Audit for:
- Which endpoints have NO rate limiting? List every endpoint that mutates data or does expensive DB queries without `check_rate_limit()`.
- Rate limit bypass: `check_rate_limit` in cache.py:147 uses `X-Forwarded-For` header (line 160-161). Attacker can spoof this header to bypass IP-based rate limiting. CRITICAL — CloudFront/ALB should be the only source of X-Forwarded-For, but the code trusts the first value which could be injected.
- Redis fallback: If Redis is unavailable, `rate_limit_check` returns `(True, 0)` — ALL rate limits are silently disabled (cache.py:107). This means a Redis outage = no rate limiting.
- WebSocket connection limit: No max connections per IP or per client_id. A bot can open thousands of WebSocket connections.
- DB connection exhaustion: Each request gets a new DB session. Can slow requests + high concurrency exhaust the connection pool (5+7 per worker)?

**Category 5: Business Logic Attacks**
Audit for:
- Driver bidding on own ride: A user with BOTH customer and driver accounts (different JWTs) could create a ride request and then bid on it. No check for `ride_request.customer_id != driver.id` in `submit_bid` (bid_routes.py:1031).
- Negative/zero fare manipulation: Bid price validated > 0 and < 10000 (bid_routes.py:1040-1043). Check counter-offer validation too.
- Tip amount: Previously capped at $500 (MEMORY.md). Verify this cap is still in place.
- Can a completed ride be re-completed? Check status guards on ride completion endpoints.
- Can a driver mark arrived/started/completed without being the matched driver? Check ownership validation in ride lifecycle endpoints.
- Order cancellation after pickup: Can a customer cancel an order after the driver has picked it up?
- Double-payout: Can `complete_ride` be called twice to trigger two Stripe payouts?

**Category 6: Infrastructure and Network**
Audit for:
- CORS: Production origins list is tight (main_new.py:89-100). Good. But staging includes S3 HTTP origin (main_new.py:109) — potential for MitM on staging.
- Security headers: All 7 present (main_new.py:165-171). Good.
- Error responses: Search for `except Exception as e: ... str(e)` patterns that might leak stack traces, SQL errors, or file paths to clients.
- Hardcoded passwords in code: `DollorAdmin2026!` at main_new.py:1583, main_new.py:18450, main_new.py:18531. Demo credentials visible in code.
- `/uploads/` directory served as static files (main_new.py:427). Can attackers upload malicious files via document upload endpoints and serve them?
- OpenAPI schema at `/openapi.json` exposes all endpoint schemas, parameter types, and response models — a reconnaissance goldmine.

**Report structure:**
```markdown
# Dollor.ai Network Security Audit Report
Date: 2026-02-22

## Executive Summary
| Severity | Count | Fixed |
|----------|-------|-------|
| CRITICAL | N | Y/N |
| HIGH     | N | Y/N |
| MEDIUM   | N | Y/N |
| LOW      | N | Y/N |
| INFO     | N | - |

## Findings by Severity

### CRITICAL
#### NSA-001: [Title]
- **File:** path:line
- **Code:** (snippet)
- **Impact:** ...
- **Fix:** ...
- **Status:** FIXED / OPEN

### HIGH
(same format)

### MEDIUM
(same format)

### LOW / INFO
(same format)

## Positive Findings (What's Already Good)

## Recommendations
```
  </action>
  <verify>
    - File exists: `.planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md`
    - File has 200+ lines covering all 6 categories
    - Every finding has file:line reference
    - Every finding has severity rating
  </verify>
  <done>
    Complete audit report exists with categorized findings, each with file:line references, severity ratings, code snippets, and recommended fixes. All 6 audit categories are covered.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix All CRITICAL and HIGH Findings</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/bid_routes.py
    apps/web/p2p-platform/backend/websocket_server.py
    apps/web/p2p-platform/backend/cache.py
    apps/web/p2p-platform/backend/auth_utils.py
  </files>
  <action>
Based on the audit report from Task 1, fix all CRITICAL and HIGH severity findings. Known fixes needed (from pre-audit analysis):

**CRITICAL fixes:**

1. **WebSocket authentication** (main_new.py:18000-18010, websocket_server.py):
   - Add JWT token validation to the WebSocket endpoint `/ws/{client_id}`
   - Require a `token` query parameter: `/ws/{client_id}?token=JWT_HERE`
   - In `websocket_route`, before calling `websocket_endpoint()`, decode and validate the JWT
   - If invalid/missing token, close the WebSocket with code 4001 (unauthorized)
   - Validate that the client_id matches the JWT claims (e.g., `customer_123` must have `customer_id=123` in JWT)
   - Keep the existing ConnectionManager logic unchanged

2. **Disable Swagger/OpenAPI in production** (main_new.py):
   - Change the FastAPI app initialization to conditionally disable docs:
   ```python
   app = FastAPI(
       title="Invoice Management System",
       docs_url="/docs" if not _is_production else None,
       redoc_url="/redoc" if not _is_production else None,
       openapi_url="/openapi.json" if not _is_production else None,
   )
   ```
   - Remove `/docs`, `/openapi`, `/redoc` from `_PUBLIC_PREFIXES` (they won't exist in production anyway, and for non-production they should still be accessible)

3. **X-Forwarded-For spoofing** (cache.py:160-161):
   - CloudFront/ALB prepends the real client IP to X-Forwarded-For. The rightmost IP before the known proxies is the real client IP.
   - For defense-in-depth, use the LAST IP in the X-Forwarded-For chain (the one added by ALB, which is the one CloudFront saw). Change from `split(",")[0]` to `split(",")[-2]` or use `request.client.host` which FastAPI sets from the direct connection (ALB's IP in production, but behind ALB this is reliable).
   - Simplest safe fix: If behind ALB/CF, use `split(",")[0]` is actually correct IF CloudFront is configured to overwrite (not append) X-Forwarded-For. But CloudFront appends. Safest: take the second-to-last entry (the real IP as seen by CloudFront). If only one entry, use it.
   - Implementation: `ips = forwarded.split(","); client_ip = ips[-2].strip() if len(ips) >= 2 else ips[0].strip()`
   - This ensures the attacker-injected first value is ignored.

**HIGH fixes:**

4. **No duplicate bid prevention** (bid_routes.py `submit_bid` around line 1031):
   - After getting the ride_request, check if this driver already has a PENDING bid:
   ```python
   existing_bid = db.query(RideBid).filter(
       and_(
           RideBid.ride_request_id == request_id,
           RideBid.driver_id == driver.id,
           RideBid.status == BidStatus.PENDING
       )
   ).first()
   if existing_bid:
       raise HTTPException(status_code=409, detail="You already have a pending bid on this ride")
   ```

5. **Bidding duration uncapped** (bid_routes.py:86, used at line 348):
   - Add validation in `create_ride_request` before using `data.bidding_duration_minutes`:
   ```python
   if data.bidding_duration_minutes < 1 or data.bidding_duration_minutes > 30:
       raise HTTPException(status_code=400, detail="Bidding duration must be between 1 and 30 minutes")
   ```

6. **No concurrent ride request limit** (bid_routes.py `create_ride_request`):
   - Before creating a new ride request, check how many OPEN/BIDDING requests the customer has:
   ```python
   open_requests = db.query(RideRequest).filter(
       and_(
           RideRequest.customer_id == customer.id,
           RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING])
       )
   ).count()
   if open_requests >= 3:
       raise HTTPException(status_code=429, detail="You already have 3 open ride requests. Please wait or cancel existing ones.")
   ```

7. **Registration rate limiting not applied to all registration endpoints** (main_new.py):
   - Grep for all registration endpoints (customer, driver, vendor) and verify each calls `check_rate_limit(request, registration_rate_limiter, "register")`.
   - For any that don't, add the call at the top of the function.

8. **Self-bidding prevention** (bid_routes.py `submit_bid`):
   - After getting ride_request, check if the driver is the ride requester:
   ```python
   # Prevent self-bidding (driver bidding on own ride request)
   if ride_request.customer_id and driver.id:
       # Check if the authenticated driver also has a customer account that created this ride
       from models import Customer
       customer_check = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
       if customer_check and customer_check.email:
           driver_check = db.query(Driver).filter(Driver.id == driver.id).first()
           if driver_check and driver_check.email and driver_check.email.lower() == customer_check.email.lower():
               raise HTTPException(status_code=403, detail="Cannot bid on your own ride request")
   ```

9. **Account enumeration on registration** (main_new.py):
   - Change "Email already registered" messages to a generic: "Registration failed. If you already have an account, please log in."
   - Apply to customer registration, driver registration, and vendor registration endpoints.

10. **Redis fallback disables all rate limiting** (cache.py:107):
    - Add an in-memory fallback rate limiter when Redis is unavailable. Use a simple dict with TTL:
    ```python
    _memory_rate_limits: dict = {}  # key -> [timestamps]

    def rate_limit_check(key, max_requests, window_seconds):
        if not redis_client:
            # In-memory fallback (per-worker, not shared, but better than nothing)
            now = time.time()
            if key not in _memory_rate_limits:
                _memory_rate_limits[key] = []
            _memory_rate_limits[key] = [t for t in _memory_rate_limits[key] if t > now - window_seconds]
            if len(_memory_rate_limits[key]) >= max_requests:
                return False, window_seconds
            _memory_rate_limits[key].append(now)
            return True, 0
        # ... existing Redis logic
    ```

After ALL fixes, update the NETWORK_SECURITY_REPORT.md to mark each fixed finding as "Status: FIXED" with the commit hash.
  </action>
  <verify>
    - `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import main_new; print('main_new imports OK')"` succeeds
    - `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import bid_routes; print('bid_routes imports OK')"` succeeds
    - `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import cache; print('cache imports OK')"` succeeds
    - `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -c "import websocket_server; print('ws imports OK')"` succeeds
    - Grep confirms WebSocket endpoint now has JWT validation
    - Grep confirms FastAPI docs_url is None in production
    - Grep confirms X-Forwarded-For uses safe extraction
    - Grep confirms duplicate bid check exists
    - Grep confirms bidding_duration_minutes is capped
  </verify>
  <done>
    All CRITICAL and HIGH findings from the audit are fixed in code. Each fix is verified to not break imports. The report is updated with fix status.
  </done>
</task>

<task type="auto">
  <name>Task 3: Run Full Test Suite and Verify No Regressions</name>
  <files>
    .planning/quick/26-network-security-and-bot-attack-audit-fi/NETWORK_SECURITY_REPORT.md
  </files>
  <action>
Run the full backend test suite to ensure no regressions from security fixes:

```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
source venv/bin/activate
pytest tests/ -v --tb=short 2>&1 | tail -50
```

If any tests fail that were passing before (baseline: 889/890 pass per MEMORY.md):
1. Analyze whether the failure is caused by a security fix
2. If so, update the test to work with the new security behavior (e.g., WebSocket tests may need a token parameter)
3. If not, note as a pre-existing failure

After tests pass, update the NETWORK_SECURITY_REPORT.md executive summary with:
- Total findings count by severity
- Which were fixed
- Which are deferred (MEDIUM/LOW) with justification
- Test suite result confirming no regressions
  </action>
  <verify>
    - `pytest tests/ -v` passes with >= 889 tests (same or better than baseline)
    - NETWORK_SECURITY_REPORT.md has updated executive summary with fix counts
  </verify>
  <done>
    Test suite passes with no new regressions. Report finalized with complete fix status. All CRITICAL and HIGH network security vulnerabilities are addressed.
  </done>
</task>

</tasks>

<verification>
1. NETWORK_SECURITY_REPORT.md exists with 200+ lines covering all 6 audit categories
2. Every CRITICAL finding has status: FIXED
3. Every HIGH finding has status: FIXED
4. Backend Python files import without errors
5. Test suite passes (>= 889 tests)
6. WebSocket endpoint requires JWT authentication
7. Swagger docs disabled in production mode
8. Rate limiting has in-memory fallback when Redis unavailable
</verification>

<success_criteria>
- Complete audit report with file:line references for every finding
- All CRITICAL vulnerabilities fixed (WebSocket auth, Swagger exposure, IP spoofing)
- All HIGH vulnerabilities fixed (bid stuffing, duration abuse, self-bidding, account enumeration, rate limit fallback)
- Backend test suite passes with no regressions
- Report updated with fix status for each finding
</success_criteria>

<output>
After completion, create `.planning/quick/26-network-security-and-bot-attack-audit-fi/26-SUMMARY.md`
</output>
