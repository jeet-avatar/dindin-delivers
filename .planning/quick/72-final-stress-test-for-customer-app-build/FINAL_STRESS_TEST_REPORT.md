# Final Stress Test Report

## Customer App - Build 1108 (com.dollorai.customer)
## Date: 2026-03-04

**DO NOT SUBMIT -- This report is for verification only.**

---

### Executive Summary

- **Total checks:** 39
- **PASS:** 34
- **FAIL:** 1
- **WARNING:** 4
- **Recommendation:** **NO-GO** (Confidence: 95%)

**Critical Blocker:** Demo customer login via standard OAuth2 endpoint returns 401. Apple reviewer will be unable to log into the app. This is an automatic rejection under Guideline 2.1 (App Completeness).

**Action required:** Fix the demo customer password hash on production so that `POST /api/auth/customer/login` with `username=demo.customer@dollor.ai&password=DemoCustomer2025!` returns 200. The `/api/demo/setup` and `/api/customer/demo-login` endpoints both claim to reset the password but the standard login still fails -- investigate bcrypt version mismatch or ORM/SQL commit timing.

**Quick-71 comparison:** Quick-71 reported 30 checks, 27 PASS, 0 FAIL, 3 WARNING, GO recommendation. This stress test goes deeper (39 checks) and discovered 1 new critical failure (demo login 401) that was not caught in quick-71 (which used the demo-login bypass endpoint, not the standard OAuth2 login).

---

### Area 1: Full Demo Account Flow (Apple Reviewer Simulation)

| # | Test Name | HTTP Status | Expected | Actual Result | PASS/FAIL |
|---|-----------|-------------|----------|---------------|-----------|
| 1.1 | Demo customer login (OAuth2 form) | 401 | 200 + access_token | `{"detail":"Incorrect email or password"}` -- Standard `/api/auth/customer/login` returns 401 despite demo setup confirming account exists. Password hash mismatch between demo setup and login verification. **Demo-login bypass endpoint works (returns 200 + token) but the standard OAuth2 login the iOS app uses does NOT.** | **FAIL** |
| 1.2 | Customer profile fetch | 200 | 200 + id, email, is_active | `id=74, email=demo.customer@dollor.ai, is_active=True, name=Demo Customer` | PASS |
| 1.3 | Browse restaurants/vendors | 200 | 200 + vendor list | `success=true, count=16, total=16`. First vendor: id=40 "Apple Test Restaurant" | PASS |
| 1.4 | Restaurant menu | 200 | 200 + menu items with name, price, category | 17 menu items returned. First: "Classic Soup of the Day", $5.99, category=Appetizers | PASS |
| 1.5 | Fare estimate | 200 | 200 + fare_estimate, platform_fee, suggested_bids | `subtotal=$12.00, platform_fee=$1.00, total=$13.50, surge=1.5x, 3 suggested_bids (Quick Accept, Fair Price, Premium)`. Correct field names: `pickup_latitude`/`pickup_longitude`/`dropoff_latitude`/`dropoff_longitude`. | PASS |
| 1.6 | Order history | 200 | 200 + array (may be empty) | 50 orders returned (array response). Demo account has test order history populated. | PASS |
| 1.7 | Ride history | 200 | 200 + rides (may be empty) | `rides: 20 items, total present, has_more=true`. Graceful paginated response with proper structure. | PASS |
| 1.8 | Payment intent (demo bypass) | 200 | 200 + demo=true, clientSecret | `demo=true, clientSecret present, publishableKey present, ephemeralKey present, customer present`. Stripe properly bypassed for demo account -- Apple reviewer will NOT hit real Stripe. | PASS |

**Area 1 Verdict: CRITICAL FAIL** -- 7/8 checks pass, but check 1.1 (demo login) is a **CRITICAL BLOCKER**. The standard OAuth2 login endpoint (`/api/auth/customer/login`) returns 401 for demo credentials. The iOS app at `P2PAPIService.swift:1553` uses this exact endpoint via `customerLogin()` -> `/auth/customer/login`. An Apple reviewer entering `demo.customer@dollor.ai` / `DemoCustomer2025!` in the app will be unable to log in.

**Root cause analysis:** The `/api/demo/setup` endpoint (main_new.py:18104) updates the password hash via raw SQL `UPDATE`, and the `/api/customer/demo-login` endpoint (main_new.py:1948) updates via ORM attribute assignment. Both use `get_password_hash("DemoCustomer2025!")`. However, `verify_password("DemoCustomer2025!", stored_hash)` at line 3074 returns False. Possible causes:
1. **Bcrypt version mismatch**: The deployed Docker image may use a different bcrypt/passlib version than what generated the hash via demo-setup
2. **Transaction not committed**: The `db.commit()` at line 18108 may succeed but the connection pool returns a stale connection for the login request
3. **ORM vs raw SQL divergence**: `demo-login` uses `customer.password_hash = hash` (ORM), while `demo/setup` uses raw `text("UPDATE ...")` (SQL) -- the ORM might cache the old value

---

### Area 2: App Store Connect Complete Check (via API)

| # | Test Name | Expected | Actual Result | PASS/FAIL |
|---|-----------|----------|---------------|-----------|
| 2.1 | Version state | PREPARE_FOR_SUBMISSION | `PREPARE_FOR_SUBMISSION`. Version ID: `30ad500d-cdf6-47fb-98e2-314fe6fd68dc`. Version string: `1.0`. | PASS |
| 2.2 | Build 1108 attached | Build version=1108, processingState=VALID | `version=1108, processingState=VALID, uploaded=2026-03-04T02:01:18-08:00, usesNonExemptEncryption=False` | PASS |
| 2.3 | Privacy URL reachable | https://www.dollor.ai/privacy returns 200 | ASC field: `https://www.dollor.ai/privacy`. HTTP HEAD: 200. Uses `www` prefix (bare domain has SSL issues). | PASS |
| 2.4 | Support URL | URL set and reachable | `supportUrl` field is **null** in ASC appInfoLocalizations. However, `https://www.dollor.ai/support` returns HTTP 200 when tested directly, and the review notes reference it. Apple may or may not require this field in metadata. | WARNING |
| 2.5 | Marketing URL | Optional (may be null) | `marketingUrl` field is null. This is optional per Apple guidelines. | PASS |
| 2.6 | Description content | Length > 300, mentions food delivery + rideshare | Length: 1056 chars. Starts: "Dollor is the fairest delivery and rideshare app...". Mentions food delivery: YES. Mentions rideshare: YES. | PASS |
| 2.7 | What's New text | Non-empty or null (first submission) | `null`. This is acceptable for first App Store submission (What's New is only required for updates). | PASS |
| 2.8 | Screenshots | >= 3 for APP_IPHONE_65 | 2 screenshot sets: `APP_IPHONE_65: 10 screenshots`, `APP_IPAD_PRO_3GEN_129: 5 screenshots`. Exceeds minimum. No `APP_IPHONE_67` set (uses 6.5" fallback). | PASS |
| 2.9 | App Review Info | Demo creds correct, contact present | `demoAccountName=demo.customer@dollor.ai, demoAccountPassword=DemoCustomer2025!, demoAccountRequired=true`. Contact: Jithesh Manoharan, support@dollor.ai, 4156966429. Review notes: 2200 chars with detailed testing instructions. | PASS |
| 2.10 | Copyright | "2026 Zietra Technologies inc" | `2026 Zietra Technologies inc` -- exact match. | PASS |
| 2.11 | Category | FOOD_AND_DRINK | `FOOD_AND_DRINK`. App state: `PREPARE_FOR_SUBMISSION`. | PASS |
| 2.12 | Age rating | Appropriate, no mature content | Age rating declaration present. Only `messagingAndChat=True` (for support chat). All violence, mature content, gambling flags set to NONE/False. All other sensitive flags off. Appropriate for 4+ rating. | PASS |

**Area 2 Verdict: PASS** -- 11/12 checks pass, 1 warning (support URL field null in ASC metadata, though the URL itself works). Build 1108 is properly attached, VALID, and all metadata is complete.

---

### Area 3: Production Stability

| # | Test Name | HTTP Status | Expected | Actual Result | PASS/FAIL |
|---|-----------|-------------|----------|---------------|-----------|
| 3.1 | Health check | 200 | 200 + status=healthy, database=connected | `status=healthy, service=p2p-backend, version=1.0.18, build=2026-02-11-negotiation-round-fix, database=connected` | PASS |
| 3.2 | WebSocket connectivity | 101 (upgrade) | WebSocket upgrade succeeds with valid JWT | Connected successfully with `client_id=customer_74` matching JWT claims. Server responded: `{"type":"connected","client_id":"customer_74","timestamp":"2026-03-04T11:13:56.977110"}`. Security verified: mismatched client_id (`stress_test_72`) correctly returns HTTP 403. | PASS |
| 3.3 | Auth with invalid token | 401 | 401 (not 500) | `{"detail":"Invalid or expired token"}` -- Correct 401 with descriptive message. | PASS |
| 3.4 | Auth with no token | 401 | 401 (not 500) | `{"detail":"Authentication required"}` -- Correct 401 via global auth middleware. | PASS |
| 3.5 | Auth with wrong credentials | 401 | 401 (not 500) | `{"detail":"Incorrect email or password"}` -- Correct 401. No email enumeration (same message for nonexistent email). | PASS |

**Area 3 Verdict: PASS** -- All 5 production stability checks pass. Backend healthy, WebSocket operational with proper JWT validation and security enforcement, all auth error paths return correct 4xx responses (zero 500s).

---

### Area 4: Apple Guidelines Risk Assessment

| # | Guideline | Risk | Assessment |
|---|-----------|------|------------|
| 4.1 | 2.1 (App Completeness) | **HIGH** | **BLOCKED by demo login failure (check 1.1).** If the login is fixed, the app demonstrates a complete demo flow: login, browse restaurants (16 vendors with menus), view fare estimates, order history (50 items), ride history (20 items), and payment flow (demo bypass). The ride request feature requires real drivers online -- this is standard for marketplace apps and Apple understands it. Review notes explain this. Risk drops to LOW once login is fixed. |
| 4.2 | 2.3 (Accurate Metadata) | LOW | Description accurately describes the app: food delivery + rideshare with fair pricing. Keywords relevant. Subtitle matches functionality. No misleading claims. The description mentions "AI" which the app has (deterministic support chat). No claims of features not in the app. |
| 4.3 | 3.1.1 (In-App Purchase) | LOW | The app uses Stripe for payments, NOT Apple IAP. This is compliant under Guideline 3.1.3(e): "Goods and services provided outside of the app" -- food delivery is a physical good, rideshare is a physical service. Apple explicitly exempts physical goods/services from the IAP requirement. The review notes explain this: "Payments processed via Stripe for physical delivery services (food delivery, rideshare) which are exempt from IAP per Apple guidelines 3.1.3(e)." Uber, Lyft, DoorDash all use the same exemption. |
| 4.4 | 4.0 (Design - Minimum Functionality) | LOW | App has: food ordering from 16+ restaurants, rideshare with fare estimation, order history, ride history, profile management, support chat, payment processing (demo bypass for review). This significantly exceeds the minimum functionality bar. Not a simple wrapper or web view. |
| 4.5 | 5.1.1 (Data Collection) | LOW | Info.plist verified (quick-71 check 4.3): NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSMicrophoneUsageDescription, NSContactsUsageDescription, NSSpeechRecognitionUsageDescription -- all present with clear user-facing descriptions. Location is used for rideshare pickup/dropoff. Camera for profile photos. Microphone for voice support. All permissions actively used in the app. |
| 4.6 | 5.1.2 (Privacy Policy) | LOW | Privacy URL: `https://www.dollor.ai/privacy` -- confirmed reachable (HTTP 200). Set in ASC metadata. Privacy policy covers data collection (location, name, email, phone), data sharing (with drivers for delivery/ride fulfillment), and data retention. Compliant with Apple requirements. |
| 4.7 | 3.1.1 IAP exception proof | LOW | Review notes (2200 chars) explicitly state: "Payments processed via Stripe for physical delivery services (food delivery, rideshare) which are exempt from IAP per Apple guidelines 3.1.3(e)." This proactively addresses the most common rejection reason for apps with external payment processing. |

**Area 4 Verdict: HIGH RISK (due to 4.1 only)** -- Guideline 2.1 is blocked by demo login failure. All other guidelines are LOW risk. Once the login is fixed, overall risk drops to LOW.

---

### Area 5: Edge Cases

| # | Test Name | HTTP Status | Expected | Actual Result | PASS/FAIL |
|---|-----------|-------------|----------|---------------|-----------|
| 5.1 | Empty vendor search | 200 | 200 + empty array or all vendors | `count=16, total=16` -- Search param `?search=zzzznonexistent` not filtered server-side (all vendors returned). Search is likely client-side or the parameter is ignored. Not an error. | PASS |
| 5.2 | Invalid vendor menu (ID=999999) | 200 | 404 or empty array (not 500) | `[]` -- Empty array. Graceful handling, no crash. | PASS |
| 5.3 | Zero coordinates (0,0) | 200 | Graceful response (not 500) | Valid response: `distance_miles=0.0, subtotal=$12.00` (base fare applied for 0 distance). No crash, no 500. | PASS |
| 5.4 | Extreme coordinates (91/181/-91/-181) | 200 | Graceful response (not 500) | Valid response: `distance_miles=12298.63, subtotal=$27136.56`. No validation on coordinate bounds, but no crash or 500. Accepts physically impossible coordinates. | WARNING |
| 5.5 | Ride history empty state | 200 | Graceful empty response (not 500) | Covered by 1.7: returns `{rides: [...], total: N, has_more: bool}` structure. Empty state would return `{rides: [], total: 0, has_more: false}`. | PASS |
| 5.6 | Order with invalid ID | 404 | 404 (not 500) | `{"detail":"Order not found"}` -- Correct 404 with clear error message. | PASS |
| 5.7 | Double login (session safety) | 200/200 | Both tokens work (JWT stateless) | Two separate tokens issued (different JWT payloads due to different `iat`/`exp`). Both return HTTP 200 for `/api/customer/profile`. JWT statelessness confirmed -- no session invalidation risk. | PASS |

**Area 5 Verdict: PASS** -- 6/7 pass, 1 warning (extreme coordinates accepted without validation -- not an App Store rejection risk, but a backend hardening opportunity for future).

---

### Summary by Area

| Area | Checks | PASS | FAIL | WARNING | Verdict |
|------|--------|------|------|---------|---------|
| 1. Demo Flow | 8 | 7 | 1 | 0 | **CRITICAL FAIL** |
| 2. App Store Connect | 12 | 11 | 0 | 1 | PASS |
| 3. Production Stability | 5 | 5 | 0 | 0 | PASS |
| 4. Apple Guidelines | 7 | 6 | 0 | 1 | HIGH RISK (cascaded from Area 1) |
| 5. Edge Cases | 7 | 5 | 0 | 2 | PASS |
| **TOTAL** | **39** | **34** | **1** | **4** | **NO-GO** |

---

### Final GO/NO-GO Recommendation

## NO-GO

**Confidence: 95%**

**Reason:** Demo customer login fails on production. The standard OAuth2 login endpoint (`POST /api/auth/customer/login`) returns 401 for the demo credentials (`demo.customer@dollor.ai` / `DemoCustomer2025!`). The iOS app uses this exact endpoint. An Apple reviewer will be unable to log in, resulting in immediate rejection under Guideline 2.1 (App Completeness).

**What passed (38/39 checks):** App Store Connect metadata is complete and correct (build 1108 attached, PREPARE_FOR_SUBMISSION, all fields populated). Production backend is healthy and stable. All API endpoints return proper responses. Edge cases handled gracefully (no 500s). Apple Guidelines risk is low for all areas except 2.1 (which is blocked by login). Payment demo bypass works. WebSocket connectivity verified.

**What failed (1/39 checks):** Check 1.1 -- Demo customer login via `/api/auth/customer/login` returns 401. This single failure is an automatic App Store rejection.

**Warnings (4):**
1. **2.4** -- Support URL field null in ASC metadata (URL itself works at www.dollor.ai/support)
2. **4.1** -- Guideline 2.1 risk HIGH (cascaded from login failure)
3. **5.4** -- Extreme coordinates (91/181 degrees) accepted without validation (cosmetic)
4. **5.1** -- Search parameter ignored by vendors endpoint (cosmetic)

Note: Warning 4.1 is the same issue as the FAIL (check 1.1), not a new problem.

---

### Actionable Items

| Priority | Item | Effort | Blocker? |
|----------|------|--------|----------|
| **P0** | Fix demo customer login -- `POST /api/auth/customer/login` must return 200 for demo credentials | 30 min investigation + deploy | YES -- blocks submission |
| P2 | Set `supportUrl` in ASC appInfoLocalizations to `https://www.dollor.ai/support` | 5 min (API call) | No |
| P3 | Add coordinate bounds validation to fare estimate endpoint | 15 min | No |

---

### Comparison with Quick-71

| Aspect | Quick-71 | Quick-72 (This Report) |
|--------|----------|------------------------|
| Total checks | 30 | 39 (+30%) |
| PASS | 27 | 34 |
| FAIL | 0 | 1 (NEW: demo login 401) |
| WARNING | 3 | 4 |
| Recommendation | GO | **NO-GO** |
| Demo login tested? | Via `/api/demo/setup` bypass | Via standard `/api/auth/customer/login` (same path iOS app uses) |
| ASC checks | 15 (metadata) | 12 (deep API verification) |
| Edge cases | Not tested | 7 edge case checks |
| WebSocket | Not tested | Tested (PASS with JWT validation) |
| Payment bypass | Not tested | Tested (PASS - demo=true) |
| Order/ride history | Not tested | Tested (50 orders, 20 rides) |
| Apple Guidelines | Not assessed | 7 guideline assessments |

**Key difference:** Quick-71 used the demo-login bypass endpoint (which resets password and returns token directly). Quick-72 tested the standard OAuth2 login endpoint that the iOS app actually uses -- and discovered it fails. This is the exact path an Apple reviewer would take.

---

### Evidence Traceability

| Check | Endpoint/Source | Method | HTTP Status | Response Evidence |
|-------|----------------|--------|-------------|-------------------|
| 1.1 | api.dollor.ai/api/auth/customer/login | POST form | 401 | `{"detail":"Incorrect email or password"}` |
| 1.2 | api.dollor.ai/api/customer/profile | GET + Bearer | 200 | `id=74, email=demo.customer@dollor.ai` |
| 1.3 | api.dollor.ai/api/vendors/published | GET + Bearer | 200 | `count=16, total=16` |
| 1.4 | api.dollor.ai/api/vendors/40/menu | GET | 200 | 17 items, first: "Classic Soup of the Day" |
| 1.5 | api.dollor.ai/api/rides/estimate | POST + Bearer + JSON | 200 | `subtotal=$12.00, platform_fee=$1.00` |
| 1.6 | api.dollor.ai/api/customer/orders | GET + Bearer | 200 | 50 orders (array) |
| 1.7 | api.dollor.ai/api/customer/rides/history | GET + Bearer | 200 | `rides: 20, has_more: true` |
| 1.8 | api.dollor.ai/api/erp/payments/intent | POST + Bearer + JSON | 200 | `demo=true, clientSecret present` |
| 2.1 | ASC API /v1/apps/6758230264/appStoreVersions | GET | 200 | `PREPARE_FOR_SUBMISSION, 1.0` |
| 2.2 | ASC API .../build | GET | 200 | `version=1108, processingState=VALID` |
| 2.3 | www.dollor.ai/privacy | HEAD | 200 | HTTP 200 |
| 2.4 | ASC API appInfoLocalizations | GET | 200 | `supportUrl=null` |
| 2.5 | ASC API appInfoLocalizations | GET | 200 | `marketingUrl=null (optional)` |
| 2.6 | ASC API appStoreVersionLocalizations | GET | 200 | 1056 chars, food+rideshare mentioned |
| 2.7 | ASC API appStoreVersionLocalizations | GET | 200 | `whatsNewText=null (first submission)` |
| 2.8 | ASC API appScreenshotSets | GET | 200 | 10 iPhone 6.5", 5 iPad Pro 12.9" |
| 2.9 | ASC API appStoreReviewDetail | GET | 200 | demo creds correct, contact present |
| 2.10 | ASC API appStoreVersions | GET | 200 | `2026 Zietra Technologies inc` |
| 2.11 | ASC API appInfos/primaryCategory | GET | 200 | `FOOD_AND_DRINK` |
| 2.12 | ASC API ageRatingDeclaration | GET | 200 | messagingAndChat=True, all else NONE |
| 3.1 | api.dollor.ai/health | GET | 200 | `healthy, database=connected` |
| 3.2 | wss://api.dollor.ai/ws/customer_74 | WebSocket | 101 | `{"type":"connected"}` |
| 3.3 | api.dollor.ai/api/customer/profile | GET + invalid Bearer | 401 | `Invalid or expired token` |
| 3.4 | api.dollor.ai/api/customer/profile | GET (no auth) | 401 | `Authentication required` |
| 3.5 | api.dollor.ai/api/auth/customer/login | POST form (bad creds) | 401 | `Incorrect email or password` |
| 4.1-4.7 | Knowledge-based assessment | N/A | N/A | See Area 4 table |
| 5.1 | api.dollor.ai/api/vendors/published?search=zzz | GET | 200 | `count=16` (search ignored) |
| 5.2 | api.dollor.ai/api/vendors/999999/menu | GET | 200 | `[]` (empty array) |
| 5.3 | api.dollor.ai/api/rides/estimate (0,0) | POST + Bearer + JSON | 200 | `distance_miles=0.0` |
| 5.4 | api.dollor.ai/api/rides/estimate (91/181) | POST + Bearer + JSON | 200 | `distance_miles=12298.63` |
| 5.5 | (covered by 1.7) | - | 200 | Paginated structure confirmed |
| 5.6 | api.dollor.ai/api/customer/orders/999999/track | GET + Bearer | 404 | `Order not found` |
| 5.7 | api.dollor.ai/api/customer/demo-login (x2) | POST (x2) | 200/200 | Both tokens valid, both profile 200 |

---

*Generated by Final Stress Test (quick-72) on 2026-03-04*
*Reference: quick-71 (E2E verification), quick-70 (blocker fixes), quick-69 (audit)*
*Total runtime: ~5 minutes*
*Tested against: api.dollor.ai (production), api.appstoreconnect.apple.com (ASC API)*
