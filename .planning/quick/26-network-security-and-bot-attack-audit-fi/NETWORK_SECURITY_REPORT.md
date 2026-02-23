# Dollor.ai Network Security Audit Report

**Date:** 2026-02-22
**Scope:** Backend Python API (all .py files in apps/web/p2p-platform/backend/)
**Auditor:** AI Security Audit (GSD Quick Task 26)
**Classification:** CONFIDENTIAL

---

## Executive Summary

| Severity | Count | Fixed | Deferred |
|----------|-------|-------|----------|
| CRITICAL | 3     | 3     | 0        |
| HIGH     | 7     | 7     | 0        |
| MEDIUM   | 8     | 0     | 8        |
| LOW      | 5     | 0     | 5        |
| INFO     | 4     | -     | -        |
| **Total** | **27** | **10** | **13** |

**Test Suite:** 1278 passed, 22 failed (all pre-existing), 10 skipped -- zero regressions from security fixes
**Baseline (before fixes):** 1245 passed, 36 failed, 19 errors -- security fixes actually improved results (+33 passing, -14 failures, -19 errors)

---

## Findings by Severity

### CRITICAL

#### NSA-001: WebSocket Endpoint Has Zero Authentication
- **File:** `main_new.py:18000-18010`, `websocket_server.py:612-664`
- **Code:**
  ```python
  @app.websocket("/ws/{client_id}")
  async def websocket_route(websocket: WebSocket, client_id: str):
      await websocket_endpoint(websocket, client_id)
  ```
- **Impact:** Any unauthenticated user can connect to `/ws/customer_123` or `/ws/driver_456` and receive real-time ride/order data including pickup/dropoff addresses, customer names, driver locations, fare amounts, and chat messages. An attacker can impersonate any user by guessing their client_id format (`customer_{id}`, `driver_{id}`). No JWT validation, no client_id ownership check.
- **Attack Vector:** `wscat -c wss://api.dollor.ai/ws/customer_1` -- immediately receives all ride updates for customer 1.
- **CVSS:** 9.1 (Critical) -- Confidentiality breach of PII for all users.
- **Fix:** Add JWT token validation via query parameter, validate client_id matches JWT claims.
- **Status:** FIXED

#### NSA-002: Swagger/OpenAPI Docs Exposed in Production
- **File:** `main_new.py:84`, `main_new.py:350`
- **Code:**
  ```python
  app = FastAPI(title="Invoice Management System")
  # ...
  "/docs", "/openapi",      # Swagger UI / OpenAPI docs
  "/redoc",                 # ReDoc
  ```
- **Impact:** The FastAPI app is created without conditionally disabling docs. In production, `/docs`, `/redoc`, and `/openapi.json` expose the entire API schema -- every endpoint path, all parameter names and types, all response models, and authentication schemes. This is a reconnaissance goldmine for attackers. Additionally, these paths are in `_PUBLIC_PREFIXES` (line 350), so the global auth middleware explicitly allows them.
- **CVSS:** 7.5 (High borderline Critical) -- Full API surface disclosure.
- **Fix:** Conditionally set `docs_url=None`, `redoc_url=None`, `openapi_url=None` in production. Remove from `_PUBLIC_PREFIXES`.
- **Status:** FIXED

#### NSA-003: X-Forwarded-For Header Spoofing Bypasses Rate Limiting
- **File:** `cache.py:160-161`
- **Code:**
  ```python
  forwarded = request.headers.get("X-Forwarded-For")
  client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
  ```
- **Impact:** The code takes the FIRST IP from X-Forwarded-For. In the CloudFront -> ALB -> ECS chain, CloudFront appends the real client IP to the existing header. An attacker can inject a fake IP by sending `X-Forwarded-For: 1.2.3.4` -- CloudFront appends the real IP, making it `1.2.3.4, <real_ip>`. The code reads `1.2.3.4`, so every request appears to come from a different IP. This bypasses ALL rate limiting: login brute force (10/min), registration (5/hour), password reset (5/hour), and admin mutation limits.
- **CVSS:** 9.0 (Critical) -- Complete rate limit bypass enables credential stuffing, account enumeration, and registration spam at scale.
- **Fix:** Use the second-to-last IP in the chain (the one CloudFront added), which is the real client IP.
- **Status:** FIXED

---

### HIGH

#### NSA-004: Redis Unavailability Silently Disables All Rate Limiting
- **File:** `cache.py:101-108`
- **Code:**
  ```python
  def rate_limit_check(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
      if not redis_client:
          return True, 0  # Always allow
  ```
- **Impact:** If Redis goes down (ElastiCache restart, network partition, OOM), all rate limits are silently disabled. An attacker who can trigger Redis unavailability (e.g., via connection exhaustion) gets unlimited login attempts, registration spam, and payment abuse. Even a normal Redis maintenance window creates a vulnerability window.
- **CVSS:** 7.5 (High) -- Complete rate limit bypass during Redis outage.
- **Fix:** Add in-memory fallback rate limiter (per-worker, not shared, but still provides per-instance protection).
- **Status:** FIXED

#### NSA-005: Bidding Duration Uncapped -- Ride Requests Open Forever
- **File:** `bid_routes.py:86`, `bid_routes.py:348`
- **Code:**
  ```python
  bidding_duration_minutes: int = 5  # How long to accept bids
  # ...
  bidding_expires_at=datetime.utcnow() + timedelta(minutes=data.bidding_duration_minutes)
  ```
- **Impact:** A bot can set `bidding_duration_minutes` to 999999 (694 days), keeping ride requests open essentially forever. This pollutes the available rides list for drivers, wastes DB space, and could be used to manipulate surge pricing (many "open" requests = high demand multiplier = higher suggested prices for legitimate users).
- **CVSS:** 6.5 (High) -- Business logic abuse affecting pricing and UX.
- **Fix:** Validate range 1-30 minutes in `create_ride_request`.
- **Status:** FIXED

#### NSA-006: No Concurrent Ride Request Limit Per Customer
- **File:** `bid_routes.py:300-350`
- **Code:** No check for existing open/bidding requests before creating a new one.
- **Impact:** A bot can create thousands of simultaneous ride requests, inflating the surge multiplier (lines 146-178: `calculate_demand_multiplier` divides open requests by online drivers). With 100 fake requests and 10 real drivers, surge hits 1.5x maximum, forcing legitimate customers to pay 50% more. Also exhausts driver attention with spam rides.
- **CVSS:** 7.0 (High) -- Price manipulation attack + DoS of driver pool.
- **Fix:** Limit customers to 3 concurrent open/bidding ride requests.
- **Status:** FIXED

#### NSA-007: Account Enumeration via Registration Error Messages
- **File:** `main_new.py:1560,2075,2656,2664,3173,5972,5980`
- **Code:**
  ```python
  raise HTTPException(status_code=400, detail="Email already registered")
  ```
- **Impact:** All 7 registration endpoints (user, vendor, driver x2, customer x3) return specific "Email already registered" error messages. An attacker can enumerate valid email addresses by attempting registration with target emails. This facilitates targeted credential stuffing and phishing attacks. Different endpoints can also reveal which role an email is registered as (if customer registration fails but driver doesn't, the email is a customer).
- **CVSS:** 5.3 (Medium borderline High) -- Account enumeration.
- **Fix:** Return generic error message on all registration endpoints.
- **Status:** FIXED

#### NSA-008: Self-Bidding Not Prevented (Driver Bids on Own Ride)
- **File:** `bid_routes.py:1031-1107`
- **Code:** No check comparing `ride_request.customer_id` against the driver's linked email/account.
- **Impact:** A user with both a customer and driver account (same email, different JWTs) can create a ride request as a customer, then bid on it as a driver. If they accept their own bid, they can trigger Stripe payouts to themselves (auto-payout on ride completion at `bid_routes.py` complete-and-pay). This is a form of financial fraud -- the platform pays the driver $1-$3 in fees for a ride that never happened.
- **CVSS:** 7.5 (High) -- Financial fraud via self-dealing.
- **Fix:** Check if driver's email matches the ride request customer's email before allowing bid submission.
- **Status:** FIXED

#### NSA-009: Driver/Vendor Registration Missing Password Policy
- **File:** `main_new.py:2064-2068` (vendor), `main_new.py:2644-2672` (driver)
- **Code (vendor):**
  ```python
  if not request.password or len(request.password.strip()) == 0:
      raise HTTPException(detail="Password is required and cannot be empty")
  ```
  **Code (driver):** No password validation at all -- password is hashed directly at line 2672.
- **Impact:** Vendor registration only checks for empty password -- accepts "a" or "1" as valid. Driver registration has ZERO password validation. Customer registration (line 3184-3203) correctly enforces 8+ chars, uppercase, lowercase, and digit requirements. This inconsistency means driver and vendor accounts can have trivially guessable passwords, making them easy targets for credential stuffing.
- **CVSS:** 6.5 (High) -- Weak credentials on driver/vendor accounts.
- **Fix:** Apply same password policy (8+ chars, mixed case, digit) to driver and vendor registration.
- **Status:** FIXED

#### NSA-010: Food Customer Registration Missing Password Policy
- **File:** `main_new.py:5983-5988`
- **Code:**
  ```python
  if not request.password or len(request.password.strip()) == 0:
      raise HTTPException(detail="Password is required and cannot be empty")
  ```
- **Impact:** The `/api/customer/register` (food delivery) endpoint at line 5960 only checks for empty password, unlike `/api/auth/customer/register` (rideshare) which enforces full policy. A customer registering via the food delivery flow can set password "a".
- **CVSS:** 6.5 (High) -- Same as NSA-009.
- **Fix:** Apply same password policy as rideshare customer registration.
- **Status:** FIXED

---

### MEDIUM

#### NSA-011: 30-Day JWT Token Lifetime With No Revocation
- **File:** `main_new.py:844`
- **Code:**
  ```python
  ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days - mobile apps need long-lived sessions
  ```
- **Impact:** A stolen JWT token (e.g., via device theft, malware, or network interception) is valid for 30 days. There is no token revocation mechanism, no refresh token rotation, and no way for a user to invalidate all sessions. A compromised token gives full account access for a month. Mobile apps commonly use 30-day tokens but pair them with refresh token rotation -- this app does not.
- **CVSS:** 5.9 (Medium) -- Long-lived tokens with no revocation.
- **Recommended Fix:** Implement refresh token rotation with short-lived access tokens (15 min) and longer-lived refresh tokens (30 days) that rotate on each use.
- **Status:** OPEN (Deferred -- requires architectural change, Rule 4)

#### NSA-012: Hardcoded Admin Password in Source Code
- **File:** `main_new.py:1583`, `main_new.py:18450`, `main_new.py:18531`
- **Code:**
  ```python
  admin_password = "DollorAdmin2026!"
  ```
- **Impact:** The admin password `DollorAdmin2026!` appears 3 times in source code. While the `setup_production_admin` endpoint (line 1576) is gated by `_require_admin_secret` and returns 404 in production, the password is visible in git history and to anyone with repo access. The demo setup endpoint (line 18450) also resets the admin password to this value. If ADMIN_SECRET_KEY is weak or leaked, an attacker can use the demo endpoint to set the admin password to a known value.
- **CVSS:** 5.1 (Medium) -- Known credentials in source control.
- **Recommended Fix:** Move admin password to environment variable. Use one-time setup tokens instead of hardcoded passwords.
- **Status:** OPEN (Deferred -- requires ops coordination)

#### NSA-013: No Account Lockout After Failed Login Attempts
- **File:** `main_new.py:434` (rate limiter definition), login endpoints throughout
- **Code:**
  ```python
  auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)  # 10 attempts per minute
  ```
- **Impact:** Rate limiting is 10 attempts per minute per IP. A distributed botnet with 100 IPs can make 1,000 login attempts per minute with no account lockout. Even a single IP can try 10 passwords per minute = 600 per hour. There is no progressive delay, no account lockout after N failed attempts, and no notification to the account owner on suspicious login activity.
- **CVSS:** 5.3 (Medium) -- Credential stuffing susceptibility.
- **Recommended Fix:** Add account-level lockout after 5 consecutive failures (15-minute lockout). Send email notification on 3+ failures.
- **Status:** OPEN (Deferred)

#### NSA-014: WebSocket No Max Connections Per IP
- **File:** `websocket_server.py:30-44`, `main_new.py:18000`
- **Code:** `ConnectionManager` has no limit on total connections or connections per IP.
- **Impact:** A bot can open thousands of WebSocket connections, exhausting server memory and file descriptors. Each WebSocket holds a persistent connection and a slot in `active_connections` dict. With enough connections, legitimate users cannot connect.
- **CVSS:** 5.3 (Medium) -- WebSocket resource exhaustion DoS.
- **Recommended Fix:** Add per-IP connection limit (e.g., 5) and global connection limit (e.g., 10,000).
- **Status:** OPEN (Deferred -- mitigated by NSA-001 fix requiring auth)

#### NSA-015: Static File Upload Directory Serves User Content
- **File:** `main_new.py:426-427`
- **Code:**
  ```python
  os.makedirs("uploads/vendor_documents", exist_ok=True)
  app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
  ```
- **Impact:** Uploaded vendor documents (driver licenses, insurance, etc.) are served as static files. If document upload endpoints don't validate file types strictly, an attacker could upload an HTML file with JavaScript that executes in the dollor.ai origin context (stored XSS via file upload). Current upload endpoints do validate extensions (line 55-62: `sanitize_file_extension`), but this remains a defense-in-depth concern.
- **CVSS:** 4.3 (Medium) -- Potential stored XSS via file upload.
- **Recommended Fix:** Serve uploads from a separate domain (e.g., uploads.dollor.ai) or set `Content-Disposition: attachment` header. Add `Content-Type: application/octet-stream` for all served files.
- **Status:** OPEN (Deferred)

#### NSA-016: Error Responses May Leak Internal Details
- **File:** Various locations across `main_new.py`, `bid_routes.py`, `order_flow.py`
- **Code (example):**
  ```python
  # main_new.py:486
  health_status["database"] = f"disconnected: {str(e)[:50]}"
  ```
- **Impact:** Several error handlers include `str(e)` which can leak database connection strings, SQL error details, or internal file paths. While most are truncated (`:50`), even partial error messages can reveal database engine type, table names, or host information. The health endpoint is public and includes DB error details.
- **CVSS:** 4.3 (Medium) -- Information disclosure via error messages.
- **Recommended Fix:** Return generic error messages in production. Log full details server-side only.
- **Status:** OPEN (Deferred)

#### NSA-017: Staging S3 Origin Uses HTTP (Not HTTPS)
- **File:** `main_new.py:109`
- **Code:**
  ```python
  "http://dollar-ai-staging-frontend.s3-website-us-east-1.amazonaws.com",
  ```
- **Impact:** The staging CORS origins include an HTTP (non-TLS) S3 website endpoint. While this is staging-only (not production), a network attacker on the same network as a staging user could MitM the frontend and steal staging JWT tokens.
- **CVSS:** 3.7 (Medium for staging) -- MitM on staging.
- **Recommended Fix:** Use HTTPS for all origins, or remove HTTP S3 origin from CORS.
- **Status:** OPEN (Deferred)

#### NSA-018: Print Statements Leak Registration Data to Logs
- **File:** `main_new.py:2028,2648,3165,5964` and more
- **Code:**
  ```python
  print(f"Vendor registration attempt for: {request.email}")
  print(f"Hash length: {len(user.password_hash) if user.password_hash else 0}")
  ```
- **Impact:** Registration and login endpoints use `print()` statements that log email addresses, password hash lengths, and registration status to stdout. In containerized environments (ECS), these go to CloudWatch Logs. While not a direct vulnerability, it increases the blast radius of a log access compromise and may violate data minimization principles.
- **CVSS:** 3.1 (Medium) -- PII in logs.
- **Recommended Fix:** Replace `print()` with structured `logger.info()` that excludes PII in production.
- **Status:** OPEN (Deferred)

---

### LOW

#### NSA-019: Demo Account Passwords Visible in Code
- **File:** `main_new.py:18527-18531`, `CLAUDE.md`
- **Code:**
  ```python
  demo_accounts = [
      {"type": "customer", "email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!", "table": "customers"},
      ...
  ]
  ```
- **Impact:** Demo account passwords are in source code. These are intentionally public (used for App Store review), but the admin password `DollorAdmin2026!` is in the same array. Demo endpoints are gated by `_require_admin_secret`, so exploitation requires knowing the admin secret key.
- **CVSS:** 2.4 (Low) -- Known credentials, but gated by admin secret.
- **Status:** OPEN (Deferred)

#### NSA-020: No CSRF Protection on State-Changing Endpoints
- **File:** All POST/PUT/DELETE endpoints
- **Impact:** FastAPI endpoints use JWT Bearer tokens (not cookies), so traditional CSRF attacks don't apply. However, if any endpoint accepts cookies for auth in the future, CSRF would be a concern. Current architecture is safe.
- **CVSS:** 2.0 (Low) -- Not currently exploitable.
- **Status:** OPEN (Informational)

#### NSA-021: SQL Injection in Migration Endpoint (Admin-Only)
- **File:** `main_new.py:597-704`
- **Code:**
  ```python
  db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
  ```
- **Impact:** The migration endpoint uses f-string interpolation in SQL `text()` calls. However, all column names and types are hardcoded in Python lists (lines 586-801) -- no user input reaches these queries. The endpoint itself is protected by `ADMIN_SECRET_KEY`. Risk is theoretical only.
- **CVSS:** 2.1 (Low) -- Hardcoded values, admin-only.
- **Status:** OPEN (Informational)

#### NSA-022: Stripe Error Details Exposed to Client
- **File:** `stripe_integration.py:157`
- **Code:**
  ```python
  except stripe.error.StripeError as e:
      raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")
  ```
- **Impact:** Stripe error messages are passed directly to the client. While Stripe errors are generally safe, they could reveal API version info or configuration details.
- **CVSS:** 2.0 (Low) -- Minor information disclosure.
- **Status:** OPEN (Deferred)

#### NSA-023: Password Reset Code Logged in Plaintext
- **File:** `password_reset_service.py:195`
- **Code:**
  ```python
  logger.info(f"{log_prefix} Generated code: {code} (hash: {code_hash[:16]}...)")
  ```
- **Impact:** The 6-digit password reset code is logged in plaintext before sending via email. Anyone with CloudWatch Logs access can see reset codes and use them to take over accounts.
- **CVSS:** 3.5 (Low) -- Requires log access.
- **Status:** OPEN (Deferred)

---

### INFO

#### NSA-024: jose Library Handles alg:none Correctly
- **File:** `main_new.py:992`, `auth_utils.py:60`
- **Code:**
  ```python
  payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
  ```
- **Impact:** The `python-jose` library, when called with an explicit `algorithms=["HS256"]` list, rejects tokens with `alg: none`. Verified safe.
- **Status:** CONFIRMED SAFE

#### NSA-025: CORS Configuration Is Tight
- **File:** `main_new.py:89-149`
- **Impact:** Production CORS only allows specific dollor.ai domains. Development/staging origins are only added in non-production environments. `allow_credentials=True` is correctly paired with specific origins (not `*`).
- **Status:** CONFIRMED SAFE

#### NSA-026: Security Headers Present (7/7)
- **File:** `main_new.py:164-171`
- **Impact:** All recommended security headers are set: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, Content-Security-Policy, Strict-Transport-Security. Server header is overwritten to "Dollor".
- **Status:** CONFIRMED SAFE

#### NSA-027: No eval/exec/os.system With User Input
- **File:** All backend .py files
- **Impact:** Searched all backend files for `eval()`, `exec()`, `os.system()`, and `subprocess` with user input. Only found `subprocess` in test runner scripts (not backend API code). No code injection vectors.
- **Status:** CONFIRMED SAFE

---

## Positive Findings (What's Already Good)

1. **Global auth middleware** (`main_new.py:377-420`) -- defense in depth, catches any endpoint missing explicit auth
2. **Admin auth middleware** (`main_new.py:196-243`) -- all `/api/admin/*` auto-secured
3. **Input sanitization** (`sanitize_text`, `sanitize_input`, `sanitize_file_extension`) applied to names, addresses, special_requests
4. **File upload path traversal protection** (`secure_file_path` at line 65-72, `sanitize_document_type` at line 75-81)
5. **Stripe webhook signature verification** (stripe_integration.py uses `stripe.Webhook.construct_event`)
6. **Customer ID spoofing prevention** in ride requests and bids (uses authenticated user's ID, not request body)
7. **Ride lifecycle status guards** -- completed/cancelled rides cannot be re-completed, cancelled, or tipped
8. **IDOR protection** on tip, rate, cancel endpoints (ownership + role verification)
9. **Idempotent payment** -- double payment creates single intent
10. **Database TLS** enforced in production (`sslmode=require` in database.py:28)
11. **DB connection pooling** with pre_ping, recycle, and timeout (database.py:29-37)
12. **Duplicate bid prevention** already exists in `bid_routes.py:1108-1118`
13. **Bid price validation** already validates >0 and <10000 (`bid_routes.py:1040-1043`)
14. **Counter-offer validation** with min/max checks and round limits (`bid_routes.py:759-821`)

---

## Recommendations (Priority Order)

1. **DONE** -- Fix all CRITICAL and HIGH findings (Task 2)
2. **Short-term** -- Implement refresh token rotation (NSA-011)
3. **Short-term** -- Move hardcoded admin password to env var (NSA-012)
4. **Short-term** -- Add account lockout after failed logins (NSA-013)
5. **Medium-term** -- Serve uploads from separate domain (NSA-015)
6. **Medium-term** -- Add WebSocket connection limits per IP (NSA-014)
7. **Medium-term** -- Sanitize all error responses in production (NSA-016)
8. **Low-priority** -- Remove print statements, use structured logging (NSA-018)
9. **Low-priority** -- Remove plaintext reset codes from logs (NSA-023)

---

## Appendix: Files Audited

| File | Lines | Findings |
|------|-------|----------|
| `main_new.py` | 21,351 | NSA-001,002,007,009,010,011,012,013,015,016,018,019,021 |
| `bid_routes.py` | ~1,500 | NSA-005,006,008 |
| `cache.py` | 199 | NSA-003,004 |
| `websocket_server.py` | 676 | NSA-001,014 |
| `auth_utils.py` | 266 | NSA-024 (confirmed safe) |
| `order_flow.py` | ~2,500 | NSA-016,026 (confirmed safe) |
| `stripe_integration.py` | ~800 | NSA-022,025 (confirmed safe) |
| `password_reset_service.py` | 620 | NSA-023 |
| `database.py` | 73 | NSA-027 (confirmed safe) |
| `models.py` | ~900 | No findings |
