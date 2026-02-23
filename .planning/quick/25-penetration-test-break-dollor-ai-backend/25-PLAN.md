---
phase: quick-25
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/25-penetration-test-break-dollor-ai-backend/PENTEST_REPORT.md
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/rideshare_payments.py
  - apps/web/p2p-platform/backend/websocket_server.py
  - apps/web/p2p-platform/backend/stripe_integration.py
autonomous: true
requirements: [PENTEST-01, PENTEST-02, PENTEST-03]

must_haves:
  truths:
    - "All Critical and High severity vulnerabilities are identified with exploit POCs"
    - "All Critical and High findings are fixed in backend code"
    - "Existing unit tests still pass after fixes"
    - "Each finding includes file:line, description, exploit, severity, and fix"
  artifacts:
    - path: ".planning/quick/25-penetration-test-break-dollor-ai-backend/PENTEST_REPORT.md"
      provides: "Complete penetration test report with findings, POCs, and fix status"
      contains: "## Findings"
    - path: "apps/web/p2p-platform/backend/rideshare_payments.py"
      provides: "Fixed IDOR on driver earnings endpoint"
      contains: "driver.id != driver_id"
    - path: "apps/web/p2p-platform/backend/websocket_server.py"
      provides: "JWT auth on WebSocket connections"
      contains: "jwt.decode"
  key_links:
    - from: "PENTEST_REPORT.md"
      to: "backend source files"
      via: "file:line references"
      pattern: "main_new\\.py:\\d+"
    - from: "rideshare_payments.py"
      to: "auth_utils.py"
      via: "Depends(require_driver)"
      pattern: "require_driver"
---

<objective>
Authorized source-code penetration test on Dollor.ai backend and Android apps. Identify exploitable vulnerabilities across 7 categories (auth bypass, injection, IDOR, rate limiting, business logic, API abuse, Android-specific), produce a severity-rated report with exploit POCs, and fix all Critical/High findings.

Purpose: Find and fix real security vulnerabilities before production exploitation.
Output: PENTEST_REPORT.md with findings + fixed backend code + passing tests.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py
@apps/web/p2p-platform/backend/auth_utils.py
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/order_flow.py
@apps/web/p2p-platform/backend/stripe_integration.py
@apps/web/p2p-platform/backend/rideshare_payments.py
@apps/web/p2p-platform/backend/websocket_server.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Source Code Penetration Test Audit</name>
  <files>
    .planning/quick/25-penetration-test-break-dollor-ai-backend/PENTEST_REPORT.md
  </files>
  <action>
Read ALL backend source files and Android source code to find exploitable vulnerabilities across 7 categories. For each finding, document file:line, vulnerability, exploit POC (curl command or code snippet showing exploitation), severity (CRITICAL/HIGH/MEDIUM/LOW/INFO), and fix recommendation.

**CATEGORY 1: AUTH BYPASS**
Examine the public allowlist at main_new.py:280-333 (exact paths) and main_new.py:335-373 (prefixes + patterns). Check for:
- Endpoints in the public allowlist that should require auth
- The `/api/demo/` prefix at main_new.py:348 bypasses JWT middleware — verify every demo endpoint has its own `_require_admin_secret` check. Grep for `@app.(get|post|put|delete|patch).*"/api/demo` and verify each has `_require_admin_secret`.
- WebSocket endpoint at websocket_server.py:612 — `websocket_endpoint(websocket, client_id)` accepts ANY client_id with ZERO JWT verification. An attacker can connect as `customer_1` or `driver_5` and receive all real-time ride updates, bid notifications, and order status for that user. This is a CRITICAL auth bypass.
- `/api/websocket/stats` at main_new.py:326 is public — check if it leaks connection metadata.
- `/api/verification/{type}/{id}/status` regex at main_new.py:367 — check if it leaks PII or verification details.
- Password reset token logged to stdout at main_new.py:2464 — `print(f"Password reset token for {user.email}: {reset_token[:50]}...")` leaks tokens in production logs.
- Driver/Vendor password reset codes also printed: main_new.py:6337 and main_new.py:6415.

**CATEGORY 2: INJECTION**
Examine SQL queries for injection vectors:
- main_new.py:704,728,744,762,779,797,820 — `text(f"ALTER TABLE ... {col_name} {col_type}")` in `_run_startup_migrations()`. These use hardcoded column names from Python arrays (NOT user input), so while the pattern is dangerous, these are NOT exploitable because `col_name` and `col_type` come from static Python lists. Document as INFO (code smell, not exploitable).
- main_new.py:18541 — `text(f"UPDATE {account['table']} SET password_hash = :hash WHERE email = :email")` — table name from hardcoded dict, params are bound. INFO level.
- Check for any raw SQL where user input reaches the query string (f-string interpolation with request data).
- XSS: `delivery_instructions` at stripe_integration.py:278 is stored WITHOUT sanitization (no `sanitize_text()` call). Compare with bid_routes.py:324-346 which DOES sanitize addresses. Also check `customer_name`, `customer_phone` in order creation.
- Check for `os.system()` or `subprocess` with user input — already confirmed only in test/migration scripts (not exploitable).

**CATEGORY 3: IDOR (Insecure Direct Object Reference)**
These are the most exploitable findings. Check each endpoint with `{id}` path params:
- rideshare_payments.py:157-181 — `GET /api/payments/ride/driver/{driver_id}/earnings` uses `require_any_auth` (not `require_driver`) and has NO ownership check. ANY authenticated user (customer, vendor, other driver) can read ANY driver's earnings. IDOR: HIGH.
- rideshare_payments.py:66 — `POST /api/payments/ride/create-intent` uses `require_any_auth` and does NOT verify the requesting user is the ride's customer. Any authenticated user can create payment for another user's ride. IDOR: HIGH.
- Check all `@app.(get|post|put|delete|patch).*/{driver_id}/` endpoints — compare those using `require_driver` + ownership check vs `require_any_auth` without check.
- Check `/api/orders/{order_id}` at main_new.py:8778 — has ownership check but verify edge cases (what if authorization header is present but `get_current_customer_from_token` returns None and role is empty?).

**CATEGORY 4: RATE LIMITING**
- Verify all auth endpoints have rate limits. Check: customer login, driver login, vendor login, admin login, Google auth, Apple auth, password reset.
- Check if rate limiting is per-IP or per-user — if per-IP, a distributed attack bypasses it.
- Registration endpoints: main_new.py:435 has `registration_rate_limiter` — verify it's applied to all 3 registration paths.

**CATEGORY 5: BUSINESS LOGIC**
- Password reset token reuse: main_new.py:2473-2495 — `confirm_password_reset` decodes the JWT and resets the password, but does NOT invalidate the token. The same JWT reset token can be used multiple times until it expires (1 hour). If an attacker intercepts the token, they can reset the password again even after the legitimate user already reset it.
- JWT tokens expire in 30 DAYS (main_new.py:844 — `ACCESS_TOKEN_EXPIRE_MINUTES = 43200`). No token rotation or refresh mechanism. A stolen token is valid for a month.
- Tip stacking on orders: main_new.py:15086 — `order.tip = (order.tip or 0) + tip_amount`. Multiple calls ADD tips, so a bug or replay could stack tips. Not necessarily a vuln but document as MEDIUM business logic concern.
- Check bidding_duration_minutes in bid_routes.py:86 — is there a max? Can a user set `bidding_duration_minutes: 999999` to keep a ride open indefinitely?

**CATEGORY 6: API ABUSE / INFO DISCLOSURE**
- Error responses leak internal details: main_new.py:2151 `detail=f"Registration failed: {str(e)}"` with `traceback.print_exc()` at lines 2147-2148, 2307-2308, 2438-2439, 2739-2740. Stack traces in production logs + error details in API responses.
- Production print() statements leaking sensitive data: main_new.py:2449 (`Password reset requested for: {email}`), main_new.py:2464 (reset token), main_new.py:2581 (password hash length), main_new.py:6337 (driver reset code), main_new.py:6415 (vendor reset code), main_new.py:9789 (vendor password existence).
- `/api/vendors/published` at main_new.py:303 is public — verify it doesn't leak contact_email, phone, or financial data.
- Pagination: most endpoints have limits. Check if any list endpoints lack limits (could dump entire DB).

**CATEGORY 7: ANDROID-SPECIFIC**
Read Android source at `/Users/jeet/StudioProjects/eatfair-android/`:
- Check `app/src/main/res/xml/network_security_config.xml`, `driver/...`, `partner/...` for cleartext traffic settings. Already confirmed `cleartextTrafficPermitted="false"` on all 3 — good.
- Check for hardcoded API keys in Kotlin source. Grep for `sk_live`, `sk_test`, `pk_live`, `pk_test`, `Bearer`, hardcoded tokens in `*.kt` files.
- Check `exported="true"` components — all 3 manifests have only MainActivity exported with proper LAUNCHER intent-filter. Low risk.
- Check `BuildConfig` or `local.properties` for leaked secrets.
- Check if SSL certificate pinning is configured in network_security_config.xml (check for `<pin-set>` elements).
- Check SharedPreferences for sensitive data storage (grep for `getSharedPreferences` or `SecureStorage` patterns).

**OUTPUT FORMAT for PENTEST_REPORT.md:**

```markdown
# Dollor.ai Penetration Test Report
Date: 2026-02-22
Scope: Backend source code + Android apps (authorized)
Tester: Claude AI (authorized by Jeet)

## Executive Summary
- Total findings: N
- CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N | INFO: N

## Findings

### [SEVERITY] FINDING-NN: Title
**File:** `file.py:line`
**Category:** Auth Bypass | Injection | IDOR | Rate Limit | Business Logic | API Abuse | Android
**Description:** ...
**Exploit POC:**
```bash or python
# How to exploit this
```
**Impact:** What an attacker gains
**Fix:** Specific code change needed
**Status:** FIXED / OPEN / DEFERRED
```

Rate each finding honestly. Do NOT inflate severity. A finding is CRITICAL only if it allows unauthenticated data breach or account takeover. HIGH means authenticated users can access other users' sensitive data. MEDIUM means data leakage or business logic abuse with limited impact.
  </action>
  <verify>
PENTEST_REPORT.md exists with: Executive Summary section, numbered findings with severity ratings, each finding has all 7 fields (File, Category, Description, Exploit POC, Impact, Fix, Status). Verify at least 10 real findings documented. Grep for "CRITICAL\|HIGH" to confirm severity-rated findings exist.
  </verify>
  <done>
Complete pentest report at `.planning/quick/25-penetration-test-break-dollor-ai-backend/PENTEST_REPORT.md` with 10+ findings across multiple categories, each with file:line references, exploit POCs, and severity ratings. No hallucinated findings — every file:line reference verified with grep.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix All Critical and High Severity Findings</name>
  <files>
    apps/web/p2p-platform/backend/rideshare_payments.py
    apps/web/p2p-platform/backend/websocket_server.py
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/stripe_integration.py
  </files>
  <action>
Fix all CRITICAL and HIGH findings identified in Task 1. Based on pre-analysis, the expected fixes are:

**FIX 1 — CRITICAL: WebSocket Auth Bypass (websocket_server.py:612)**
The WebSocket endpoint accepts connections with zero authentication. Any client can connect as `customer_1`, `driver_5`, etc. and receive all real-time updates for that user (ride bids, order status, location).

Fix: Add JWT token verification to `websocket_endpoint()`. Require a `token` query parameter on WebSocket connect. Decode with `jose.jwt.decode(token, SECRET_KEY, algorithms=["HS256"])`. Extract the user's role and ID from the JWT payload. Verify the `client_id` matches the JWT identity (e.g., if JWT has `customer_id: 5`, only allow `client_id=customer_5`). Reject with `websocket.close(code=4001, reason="Authentication required")` if invalid. Import SECRET_KEY and ALGORITHM from main_new.py or use the same env var pattern as auth_utils.py.

**FIX 2 — HIGH: IDOR on Driver Rideshare Earnings (rideshare_payments.py:157-181)**
`GET /api/payments/ride/driver/{driver_id}/earnings` uses `require_any_auth` (accepts ANY role) and performs no ownership check. Any authenticated user can read any driver's earnings.

Fix: Change `_auth: dict = Depends(require_any_auth)` to `driver: Driver = Depends(require_driver)`. Add ownership check: `if driver.id != driver_id: raise HTTPException(status_code=403, detail="Access denied")`. Import `require_driver` from `auth_utils` (already imported at line 12).

**FIX 3 — HIGH: IDOR on Ride Payment Intent Creation (rideshare_payments.py:66)**
`POST /api/payments/ride/create-intent` uses `require_any_auth` and does NOT verify the requesting user is the ride's customer. Any authenticated user can trigger payment for another user's ride.

Fix: Change `_auth: dict = Depends(require_any_auth)` to `customer: Customer = Depends(require_customer)`. Add ownership check after loading the ride: `if ride.customer_id != customer.id: raise HTTPException(status_code=403, detail="You can only pay for your own rides")`. Update the rate limit identifier to use `customer.id`. Import `require_customer` from `auth_utils` (add to existing import at line 12). Also import `Customer` from models (add to existing import at line 23).

**FIX 4 — HIGH: Password Reset Token Logged to stdout (main_new.py:2464)**
`print(f"Password reset token for {user.email}: {reset_token[:50]}...")` logs the JWT reset token to production stdout (captured by CloudWatch). Also: main_new.py:6337 logs driver reset code, main_new.py:6415 logs vendor reset code.

Fix: Remove or wrap in `if os.getenv("IS_PRODUCTION") != "true":` guard. Better: replace ALL `print()` calls with `logger.debug()` which won't appear in production (production log level is INFO). Specifically:
- Line 2449: `print(f"Password reset requested for: {request.email}")` -> remove or `logger.debug()`
- Line 2464: `print(f"Password reset token for {user.email}: {reset_token[:50]}...")` -> DELETE this line entirely (never log tokens)
- Line 2491: `print(f"Password reset successful for: {email}")` -> `logger.info(f"Password reset successful for: {email}")`
- Line 2581: `print(f"Hash length: {len(user.password_hash)...")` -> DELETE (leaks hash metadata)
- Line 6337: `print(f"Driver password reset code for {request.email}: {code}")` -> DELETE
- Line 6415: `print(f"Vendor password reset code for {request.email}: {code}")` -> DELETE

**FIX 5 — HIGH: Unsanitized delivery_instructions (stripe_integration.py:278)**
`delivery_instructions=order_data.delivery_instructions` stores user input without HTML sanitization. XSS vector if rendered in admin portal or vendor dashboard.

Fix: Import `sanitize_text` from `main_new` (or inline the same regex). Apply: `delivery_instructions=sanitize_text(order_data.delivery_instructions)`. Also sanitize `customer_name` at line 266: `customer_name=sanitize_text(order_data.customer_name)`.

**FIX 6 — HIGH: Password Reset Token Reuse (main_new.py:2473-2495)**
The `confirm_password_reset` endpoint does not invalidate the token after use. A stolen token can reset the password repeatedly for 1 hour.

Fix: After successful password reset at line 2488, store a "password_changed_at" timestamp. In the confirmation flow, check that the token's `iat` (issued-at) is AFTER the user's last password change. Simpler approach: store the reset token hash in Redis with a TTL of 1 hour, and check `if used: reject`. Simplest approach: add a `password_changed_at` field check — after resetting password, update `user.password_changed_at = datetime.utcnow()`. In `confirm_password_reset`, after decoding the JWT, check: `if user.password_changed_at and user.password_changed_at > datetime.utcfromtimestamp(payload.get("iat", 0)): raise HTTPException(400, "Token already used")`. Since adding a DB column is heavy, use the simpler approach: after `user.password_hash = get_password_hash(request.new_password)` at line 2488, also update a field we already have or use Redis. The SIMPLEST fix that works now: check if the new password hash matches the current hash (it won't after first use because the password was already changed). Actually, the cleanest minimal fix: store used reset tokens in Redis (already available) with a 1-hour TTL. Before processing a reset, check Redis — if the token hash is there, reject as "already used". After successful reset, add the token hash to Redis.

After all fixes, update PENTEST_REPORT.md Status column from "OPEN" to "FIXED" for each fixed finding.
  </action>
  <verify>
For each fix, verify with grep:
1. WebSocket: `grep -n "jwt.decode\|JWT_SECRET_KEY\|token.*query\|4001" apps/web/p2p-platform/backend/websocket_server.py`
2. Earnings IDOR: `grep -n "require_driver\|driver.id != driver_id" apps/web/p2p-platform/backend/rideshare_payments.py`
3. Payment IDOR: `grep -n "require_customer\|customer.id\|ride.customer_id" apps/web/p2p-platform/backend/rideshare_payments.py`
4. Token logging: `grep -n "print.*reset_token\|print.*reset code\|print.*password" apps/web/p2p-platform/backend/main_new.py` should return ZERO results
5. Sanitization: `grep -n "sanitize_text.*delivery_instructions\|sanitize_text.*customer_name" apps/web/p2p-platform/backend/stripe_integration.py`
6. Token reuse: `grep -n "redis.*reset\|used.*token\|already.*used" apps/web/p2p-platform/backend/main_new.py`
  </verify>
  <done>
All CRITICAL and HIGH findings fixed: WebSocket requires JWT auth, rideshare earnings requires driver ownership, payment intent requires customer ownership, sensitive data removed from print statements, delivery instructions sanitized, password reset tokens single-use. PENTEST_REPORT.md updated with FIXED status.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify Fixes Pass Tests and Confirm with Grep</name>
  <files>
    .planning/quick/25-penetration-test-break-dollor-ai-backend/PENTEST_REPORT.md
  </files>
  <action>
Run the full backend test suite to confirm fixes don't break existing functionality:

```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -m pytest tests/ -v --timeout=120 2>&1 | tail -50
```

If any tests fail, examine the failure and fix. Common issues:
- WebSocket tests may need updated to pass a token. Check `tests/test_websocket*.py` or similar.
- Rideshare payment tests may expect `require_any_auth` — update to pass a driver/customer token.
- If tests import from modified files, ensure imports still work.

After tests pass, do a final verification sweep:

1. Confirm NO sensitive data in print statements:
   `grep -n "print.*token\|print.*password\|print.*secret\|print.*code.*reset" apps/web/p2p-platform/backend/main_new.py`
   Expected: 0 results (or only non-sensitive prints)

2. Confirm WebSocket auth is enforced:
   `grep -n "jwt.decode" apps/web/p2p-platform/backend/websocket_server.py`
   Expected: At least 1 result

3. Confirm IDOR fixes in rideshare_payments.py:
   `grep -n "require_driver\|require_customer\|driver.id != driver_id\|ride.customer_id != customer.id" apps/web/p2p-platform/backend/rideshare_payments.py`
   Expected: ownership checks present

4. Confirm sanitization in stripe_integration.py:
   `grep -n "sanitize_text" apps/web/p2p-platform/backend/stripe_integration.py`
   Expected: At least 1 result

5. Update PENTEST_REPORT.md final summary with test results and fix confirmation.
  </action>
  <verify>
`cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend && python -m pytest tests/ -v --timeout=120 2>&1 | tail -5` shows all tests passing (or same pass count as before fixes — 889/890). Grep checks all return expected results.
  </verify>
  <done>
All backend tests pass. All CRITICAL/HIGH fixes verified with grep. PENTEST_REPORT.md finalized with test confirmation. No regressions introduced.
  </done>
</task>

</tasks>

<verification>
1. PENTEST_REPORT.md exists with 10+ real findings, each with file:line, exploit POC, severity
2. All CRITICAL and HIGH findings have Status: FIXED
3. `pytest tests/ -v` passes (889+ tests)
4. No `print()` statements leaking tokens/passwords/codes in main_new.py
5. WebSocket endpoint requires JWT authentication
6. Rideshare earnings endpoint requires driver ownership
7. Payment intent creation requires customer ownership
8. Order delivery_instructions is sanitized
</verification>

<success_criteria>
- PENTEST_REPORT.md complete with honest severity ratings and real exploit POCs
- Zero CRITICAL findings remaining open
- Zero HIGH findings remaining open
- Backend test suite passes without regressions
- All fixes verified with grep to confirm code changes are in place
</success_criteria>

<output>
After completion, create `.planning/quick/25-penetration-test-break-dollor-ai-backend/25-SUMMARY.md`
</output>
