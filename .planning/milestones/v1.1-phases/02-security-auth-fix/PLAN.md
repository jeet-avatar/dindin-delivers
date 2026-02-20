# Phase 02: Security Auth Fix — Protect ~280 Unauthenticated Endpoints

## Goal
Add authentication to all unprotected API endpoints that handle financial operations, PII, or state mutation. Defense-in-depth: global middleware (safety net) + router/endpoint-level role auth.

## Evidence This Is a Must-Fix (NOT Assumptions)

### Proof 1: Verified Code — Zero Auth on Financial Endpoints
**Source**: `order_flow.py` router definition at line 370 — `APIRouter(prefix="/api/erp")` with NO `dependencies`.
- `POST /api/erp/orders/{id}/delivered` (line 2912) — triggers vendor payout, NO auth
- `POST /api/erp/payouts/{id}/process` (line 3320) — processes financial payouts, NO auth
- `DELETE /api/erp/orders/cleanup` (line 4626) — deletes orders, NO auth

### Proof 2: Verified Code — Stripe Payment Intent Without Auth
**Source**: `stripe_integration.py` line 111 — `create_simple_payment_intent(request: SimplePaymentIntentRequest)` — not even `Depends(get_db)`. Anyone on the internet can create Stripe PaymentIntents against our account.

### Proof 3: Verified Code — Full PII IDOR on Customer Addresses
**Source**: `main_new.py` lines 16058-16262 — 6 address CRUD endpoints accept `customer_id` as path param, no JWT check. Attacker enumerates IDs 1-1000 to harvest all customer home/work addresses.

### Proof 4: Verified Code — Push Notification Hijacking
**Source**: `main_new.py` lines 18224-18344 — `POST /api/erp/customers/{id}/fcm-token` registers any FCM token for any customer. Attacker receives all push notifications for that customer.

### Proof 5: Verified Code — GPS Spoofing
**Source**: `main_new.py` line 20264 — `update_driver_location_android(request: dict, db)` takes `driver_id` from body. No auth. Any caller can place any driver anywhere on the map.

### Proof 6: Auth Infrastructure Exists But Is Not Used
**Source**: `main_new.py` line 823 `get_current_user()`, line 888 `get_current_customer()`, line 196 `admin_auth_middleware` — all working, proven by 250+ endpoints that DO use them. The problem is the other 280 that don't.

### Industry Standards (OWASP)
- **OWASP API Security Top 10 (2023)** — API1: Broken Object Level Authorization (our IDOR), API2: Broken Authentication (our missing auth), API5: Broken Function Level Authorization (our missing role checks)
- **PCI DSS 4.0 Requirement 7** — "Restrict access to system components and cardholder data to only those individuals whose job requires such access" — our Stripe endpoints violate this
- **SOC 2 Trust Criteria CC6.1** — "Logical access security" requires auth on all data access

---

## Implementation Strategy (Hybrid — Option D from Research)

Based on verified research in `.planning/SECURITY_FIX_RESEARCH.md`:

**Layer 1 (Safety Net)**: Global auth middleware — requires valid JWT for all non-public routes. Catches any endpoint a developer forgets to protect.

**Layer 2 (Role Auth)**: Router-level and per-endpoint `Depends()` for role-specific checks (customer-only, driver-only, admin-only).

**Layer 3 (Ownership)**: IDOR protection — verify the authenticated user owns the resource they're accessing.

---

## Phase Breakdown

### Phase 2A: Create auth_utils.py + Router-Level Auth (P0 — Day 1)

**Task 2A.1**: Create `auth_utils.py` with standardized auth functions
- `require_any_auth()` — validates JWT, returns payload, any role
- `require_customer()` — validates JWT, returns Customer object
- `require_driver()` — validates JWT, returns Driver object
- `require_vendor()` — validates JWT, returns Vendor object
- `require_admin()` — validates JWT + admin role check
- File: `apps/web/p2p-platform/backend/auth_utils.py` (NEW)
- Done criteria: Import works from other files, unit test passes

**Task 2A.2**: Add router-level auth to 3 fully-protectable routers
- `realtime_events.py` — ALL endpoints need auth, no public exceptions
- `vibing_routes.py` — ALL endpoints need auth
- `menu_verification.py` — ALL endpoints need auth
- Change: `app.include_router(router, dependencies=[Depends(require_any_auth)])`
- Done criteria: All 25 endpoints return 401 without JWT

**Task 2A.3**: Add per-endpoint `Depends(require_any_auth)` to mixed routers
- `order_flow.py` — 45 of 49 endpoints (except login/register/health + fare estimate)
- `stripe_integration.py` — 7 of 8 endpoints (except Stripe webhook)
- `promotions.py` — 6 of 9 endpoints (except featured/active/apply)
- `matchmaking_routes.py` — 6 of 12 endpoints (except public info)
- `rideshare_payments.py` — 2 of 3 endpoints (except pricing-info)
- `verification_routes.py` — 5 of 9 endpoints (except webhooks/public info)
- `auto_onboarding.py` — 2 of 6 endpoints (invite + upload-menu)
- `investor_tracking.py` — 1 of 4 endpoints (views)
- Done criteria: Each endpoint returns 401 without JWT, 200 with valid JWT

### Phase 2B: App-Level Auth Middleware (P0 — Day 2)

**Task 2B.1**: Build public path allowlist
- Enumerate all intentionally public paths from security audit
- ~60 exact paths + ~15 prefix patterns
- Source: SECURITY_AUDIT section "Intentionally Public Endpoints"
- Done criteria: Allowlist covers all auth/register/public/webhook/legal/health paths

**Task 2B.2**: Implement global auth middleware
- Add `require_auth_middleware` in main_new.py after `admin_auth_middleware`
- Check exact paths → prefixes → regex patterns
- On no match: require valid JWT Bearer token
- Start in ENFORCEMENT mode (not shadow — endpoints are already proven vulnerable)
- Done criteria: Unauthenticated requests to non-public paths return 401

**Task 2B.3**: Add auth to remaining main_new.py endpoints
- Address CRUD (6 endpoints, lines 16058-16262): `Depends(get_current_customer)` + ownership
- Favorites (4 endpoints, lines 16284-16383): `Depends(get_current_customer)` + ownership
- FCM tokens (6 endpoints, lines 18224-18344): `Depends(require_any_auth)` + ID match
- Chat duplicates (8 endpoints): `Depends(require_any_auth)` + participant check
- Fare negotiation (9 endpoints, lines 14606-14723): `Depends(require_any_auth)` + ride ownership
- Driver location (1 endpoint, line 20264): `Depends(require_any_auth)` + driver_id match
- Ticket system (7 endpoints): `Depends(get_current_user)`
- Coupa dashboard (8 endpoints): `Depends(get_current_user)` (admin via middleware)
- Done criteria: All 49 endpoints require auth, ownership verified for PII endpoints

### Phase 2C: iOS Pre-requisite Fix (MUST DO BEFORE Phase 2A deploy)

**Task 2C.1**: Fix 4 iOS functions missing auth headers
- `P2PAPIService.swift` — `createOrder()`, `confirmOrderPayment()`, `fetchVendorOrders()`, `fetchAvailableDeliveryOrders()`
- These currently send NO Authorization header
- Change: Add `guard let token = ...` + `"Authorization": "Bearer \(token)"`
- Done criteria: Each function includes auth header, build succeeds

**Task 2C.2**: Verify Android interceptor adds auth globally
- Check `DollorApiService.kt` interceptor config in eatfair-android repo
- Android Retrofit interceptor should add Bearer header to ALL requests
- Done criteria: Confirm interceptor exists and is enabled, document findings

### Phase 2D: Deploy + Verify (Day 3)

**Task 2D.1**: Deploy to staging
- Build with `--target production --platform linux/amd64`
- Push to ECR, update `dollor-api-staging` task-def
- Done criteria: Staging service HEALTHY, 200 on /health

**Task 2D.2**: Test critical flows on staging
- Customer: login → browse → add to cart → create order → pay → track
- Driver: login → view available → accept → deliver → complete
- Vendor: login → view orders → accept → mark ready
- Rideshare: login → request ride → bid → negotiate → complete
- Done criteria: All 4 flows work with auth, fail without

**Task 2D.3**: Deploy to production
- Same build process, update `dollor-api` task-def
- Monitor CloudWatch for 401 spike
- Done criteria: 2/2 tasks HEALTHY, no abnormal 401 rate

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| iOS app breaks (no auth header) | Task 2C.1 fixes 4 functions BEFORE backend deploy |
| Android app breaks | Task 2C.2 verifies interceptor adds auth globally |
| Public endpoint accidentally blocked | Allowlist sourced from verified security audit |
| Middleware perf impact | jwt.decode ~0.1ms, negligible vs 1-5ms DB queries |
| Rollback needed | Phase 1: remove `dependencies=` from include_router. Phase 2: disable middleware |

## Files Modified

| File | Changes | Phase |
|------|---------|-------|
| `auth_utils.py` (NEW) | 5 auth functions | 2A |
| `main_new.py` | include_router deps + middleware + ~49 endpoints | 2A, 2B |
| `order_flow.py` | ~45 endpoints get Depends | 2A |
| `stripe_integration.py` | 7 endpoints get Depends | 2A |
| `promotions.py` | 6 endpoints get Depends | 2A |
| `matchmaking_routes.py` | 6 endpoints get Depends | 2A |
| `realtime_events.py` | router-level dep | 2A |
| `vibing_routes.py` | router-level dep | 2A |
| `menu_verification.py` | router-level dep | 2A |
| `rideshare_payments.py` | 2 endpoints get Depends | 2A |
| `verification_routes.py` | 5 endpoints get Depends | 2A |
| `auto_onboarding.py` | 2 endpoints get Depends | 2A |
| `investor_tracking.py` | 1 endpoint gets Depends | 2A |
| `P2PAPIService.swift` (iOS) | 4 functions add auth headers | 2C |

## Verification Criteria
1. `pytest tests/unit/` — no new failures (356+ pass)
2. All 280 previously-unprotected endpoints return 401 without JWT
3. All public endpoints still return 200 without JWT (no false positives)
4. Full E2E flow works for customer/driver/vendor/rideshare on staging
5. Zero regressions on production after deploy
