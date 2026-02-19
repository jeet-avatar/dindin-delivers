# Codebase Concerns

**Analysis Date:** 2026-02-18

---

## Tech Debt

### Backend Monolith (Critical Scale Risk)

**`main_new.py` - 22,343-line single file:**
- Issue: The entire FastAPI backend lives in one file. Routes, business logic, models, middleware, WebSocket handlers, tax tables, demo setup, admin endpoints, and AI insights are all co-located.
- Files: `apps/web/p2p-platform/backend/main_new.py`
- Impact: Any change to the file risks merge conflicts; pytest loads the entire file for every test; IDE indexing is slow; no module boundaries between rideshare, food delivery, vendor management, and admin layers
- Fix approach: Split by domain into routers — `routers/rideshare.py`, `routers/food.py`, `routers/admin.py`, `routers/vendor.py`, `routers/customer.py`. The pattern already exists for `bid_routes.py`, `order_flow.py`, `stripe_integration.py` — extend it.

### iOS API Client Monolith

**`P2PAPIService.swift` - 14,126-line single file:**
- Issue: All API calls, all response models, all Codable structs for every domain (food delivery, rideshare, vendor, driver, customer, admin) are in one Swift file.
- Files: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
- Impact: Long compile times; every iOS app that imports `EatFairShared` compiles all 14K lines including irrelevant models; naming collisions risk; hard to onboard new developers
- Fix approach: Split into `FoodDeliveryAPI.swift`, `RideshareAPI.swift`, `VendorAPI.swift`, `DriverAPI.swift`, and `SharedModels.swift` under the same Swift package target.

### Route Aliases Anti-Pattern

**`main_new.py` lines 21994-22061 — manual `app.add_api_route()` block:**
- Issue: ~70 route aliases added via `app.add_api_route()` at the bottom of the file because stacked `@app.decorator` patterns were failing. Multiple routes (`/api/driver/online/toggle` as both PUT and POST) point to the same handler.
- Files: `apps/web/p2p-platform/backend/main_new.py:21994-22061`
- Impact: OpenAPI docs show duplicate routes; unclear which URL clients should use; removing aliases requires auditing all iOS/Android callers
- Fix approach: Pick canonical URLs per endpoint and update mobile apps; delete duplicates; document the chosen URL in a route registry.

### Deployment: Two Dockerfiles, Wrong One in CI

**CI uses plain `Dockerfile`; optimized version is manual-only:**
- Issue: `.github/workflows/deploy-dollar-ai.yml` line 94 runs `docker build ... .` which picks up `Dockerfile` (single uvicorn worker, no uvloop, no httptools). The `Dockerfile.optimized` with 4 workers + uvloop is only used for manual production deploys.
- Files: `.github/workflows/deploy-dollar-ai.yml:94`, `apps/web/p2p-platform/backend/Dockerfile`, `apps/web/p2p-platform/backend/Dockerfile.optimized`
- Impact: Every CI-triggered deploy (on push to `main`) runs a single-worker server. Manual deploys with `Dockerfile.optimized --target production` run 4x more workers. Production behavior depends on who deployed.
- Fix approach: Update CI to use `docker build -f Dockerfile.optimized --target production ...` and retire the legacy `Dockerfile`.

---

## Security Considerations

### App Store Connect `.p8` Private Keys in Git

**Three copies of `AuthKey_JFVA7628SX.p8` committed:**
- Risk: The App Store Connect API key for `JFVA7628SX` is committed to the repository in three locations. Anyone with repo access can upload builds to App Store Connect, bypass TestFlight review, or revoke the key.
- Files:
  - `apps/ios/customer/fastlane/keys/AuthKey_JFVA7628SX.p8`
  - `apps/ios/delivery/fastlane/keys/AuthKey_JFVA7628SX.p8`
  - `apps/ios/restaurant/fastlane/keys/AuthKey_JFVA7628SX.p8`
- Current mitigation: None. `.gitignore` does not exclude `*.p8` files.
- Recommendations: Revoke key `JFVA7628SX` in App Store Connect immediately. Generate a new key. Store it only in CI secrets (`APP_STORE_CONNECT_API_KEY_KEY` env var as in `.github/workflows/ios-ci.yml.disabled`). Add `*.p8` to `.gitignore`. Clean git history with `git filter-repo`.

### Production DB Password in git History

- Risk: `apps/web/p2p-platform/backend/.env` was previously committed (now listed in `.gitignore`). Per MEMORY.md: "Production DB password in `backend/.env` — needs rotation + git history cleanup."
- Files: `apps/web/p2p-platform/backend/.env` (currently `.gitignore`d but present in git history)
- Current mitigation: File is gitignored. Password may still be in git history.
- Recommendations: Rotate the RDS password. Run `git filter-repo --path apps/web/p2p-platform/backend/.env --invert-paths` and force-push. Invalidate any sessions using the old password.

### Android Demo Credentials Mismatch

**`AppConfig.kt` uses wrong email addresses:**
- Issue: `AppConfig.DemoCredentials` in the shared Android module has wrong emails: `demo@dollor.ai` (customer), `demodriver@dollor.ai` (driver), `demobusiness@dollor.ai` (vendor). The canonical App Store review credentials are `demo.customer@dollor.ai`, `demo.driver@dollor.ai`, `demo.restaurant@dollor.ai`.
- Files: `apps/android/shared/src/main/java/com/eatfair/shared/config/AppConfig.kt:107-109`
- Impact: The Android demo login hints show wrong emails to App Store/Play Store reviewers, causing review failures.
- Fix approach: Update `CUSTOMER_EMAIL_HINT`, `DRIVER_EMAIL_HINT`, and `VENDOR_EMAIL_HINT` constants to match canonical credentials. Verify `POST /api/demo/setup` creates accounts with these exact emails.

### DEBUG `print()` Left in Demo Code

- Risk: `print(f"DEBUG create_demo_order: demo_customer.id = ...")` is in production code. CloudWatch logs will contain debug output during App Store review demo flows.
- Files: `apps/web/p2p-platform/backend/main_new.py:20051`
- Current mitigation: None — this logs in production.
- Recommendations: Replace with `logger.debug()` or remove entirely.

---

## Known Bugs

### `platform_fees_paid` Hardcodes $1/delivery for All Order Types

- Symptoms: The iOS Driver Dashboard v5 endpoint at `GET /api/drivers/{driver_id}/dashboard` returns `platform_fees_paid.today` as `deliveries * 1.0` for ALL order types. Rideshare platform fees are $1/$2/$3 (fare-tiered), not a flat $1.
- Files: `apps/web/p2p-platform/backend/main_new.py:6967-6970`
- Trigger: Any driver who completes rideshare rides — their platform fees dashboard will show $1 per ride regardless of fare tier.
- Workaround: None. The dashboard stat is purely informational but factually wrong for rideshare drivers.

### Health Check Build Tag Stale

- Symptoms: `GET /health` returns `"build": "2026-02-11-negotiation-round-fix"` even though many deployments have happened since then (current task-def is `dollor-api:343`).
- Files: `apps/web/p2p-platform/backend/main_new.py:314`
- Trigger: Every health check response. Monitoring and support can't distinguish deployment versions.
- Workaround: Use ECS task definition revision number from CloudWatch as a proxy.

### Hardcoded Demo Driver ID 48

- Symptoms: The `POST /api/demo/reset-driver` endpoint hardcodes `Driver.id == 48` for all queries. If the demo driver's ID changes (re-seeded DB, new staging environment), the reset silently does nothing.
- Files: `apps/web/p2p-platform/backend/main_new.py:19896, 19901, 19915, 19920, 19930`
- Trigger: Running demo reset in any environment where the demo driver isn't id=48.

### Vendor `is_open` Always Returns `True`

- Symptoms: `GET /api/vendors` returns `"is_open": True` for all vendors regardless of configured business hours.
- Files: `apps/web/p2p-platform/backend/main_new.py:13691`
- Trigger: Any customer app listing restaurants. Customers can order from "open" restaurants that are actually closed, leading to rejected/cancelled orders.
- Workaround: None currently implemented.

### Fake Tax EIN on Ride Receipts

- Symptoms: `GET /api/rides/{ride_id}/receipt` returns `"tax_id": "XX-XXXXXXX"` in the legal footer — a placeholder, not the real EIN.
- Files: `apps/web/p2p-platform/backend/order_flow.py:1219`
- Trigger: Any customer requesting a ride receipt. This is a compliance risk for tax/legal documentation.

### Fake Insurance Liability in Matchmaking

- Symptoms: `matchmaking_routes.py` hardcodes `insurance_liability=100000.0` with a comment "Placeholder - would come from driver's policy." No actual insurance verification occurs.
- Files: `apps/web/p2p-platform/backend/matchmaking_routes.py:541`
- Trigger: Any ride match creation event.

---

## Performance Bottlenecks

### DB Connection Ceiling at 2 ECS Tasks

- Problem: `db.t3.micro` has ~112 max connections. Pool sizing is `pool_size=5, max_overflow=7` = 12 connections per process. With 4 workers × 2 ECS tasks = 8 processes × 12 = 96 connections, leaving only 16 headroom.
- Files: `apps/web/p2p-platform/backend/database.py:14-16`
- Cause: ECS auto-scaling is capped at `max=2` tasks because 3 tasks × 48 connections (4 workers × 12) = 144 > 112 limit.
- Improvement path: Upgrade to `db.t3.small` (~225 connections), which allows `max=4` ECS tasks. Or add PgBouncer for connection pooling.

### Redis Single-Node (No Failover)

- Problem: Redis is deployed as a single ElastiCache node (`dollor-redis.uwva3u.0001.use1.cache.amazonaws.com`). If it fails, rate limiting silently disables, password reset codes are lost, and response caching stops (though the app falls back gracefully).
- Files: `apps/web/p2p-platform/backend/cache.py:17`
- Cause: Single-node ElastiCache deployment (no replication group).
- Improvement path: Switch to ElastiCache Replication Group with 1 replica and automatic failover. Update `REDIS_URL` to use the cluster endpoint.

### N+1 Query Risk: Driver Dashboard

- Problem: The `calc_period_earnings` helper in `GET /api/drivers/{driver_id}/dashboard` calls `db.query(Order).all()` three times sequentially (today, week, month). Each call loads full `Order` objects into memory. As order volume grows, this degrades.
- Files: `apps/web/p2p-platform/backend/main_new.py:6900-6925`
- Cause: Three separate DB queries instead of one query with period aggregation.
- Improvement path: Replace with a single `GROUP BY` aggregation query using `CASE WHEN delivered_at >= :week_start THEN 1 ELSE 0 END` for period bucketing.

---

## Fragile Areas

### Stale Acceptance/Completion Rate Hardcodes

**Driver dashboard returns fabricated operational metrics:**
- Files: `apps/web/p2p-platform/backend/main_new.py:6951-6952`
- Why fragile: `"acceptance_rate": 95.0` and `"completion_rate": 98.0` are hardcoded for every driver. iOS displays these as real stats. If acceptance/completion tracking is ever added to the DB, this code will need to be identified and updated — there's no schema-level enforcement.
- Safe modification: Add `acceptance_rate` and `completion_rate` columns to `Driver` model, default them to `None`, and return `None` vs. a fake number.

### `on_time_percentage: 95` Placeholder

**Three separate locations return fake on-time data:**
- Files:
  - `apps/web/p2p-platform/backend/main_new.py:6961`
  - `apps/web/p2p-platform/backend/main_new.py:6990`
  - `apps/web/p2p-platform/backend/main_new.py:20751`
- Why fragile: Duplicate placeholder values with no test ensuring they match. If one is updated and others are not, drivers see inconsistent on-time percentages depending on which endpoint is called.

### `hasattr` Guards for Model Fields

**Driver dashboard defensively checks model attribute existence:**
- Files: `apps/web/p2p-platform/backend/main_new.py:6973-6976`
- Why fragile: `hasattr(driver, 'stripe_onboarded')` and `hasattr(driver, 'stripe_account_id')` suggest these fields were added to `Driver` model without updating all code paths. If fields are later renamed or removed, `hasattr` silently returns `False` instead of raising an error.
- Safe modification: Remove `hasattr` guards; rely on `driver.stripe_onboarded` directly (it will raise `AttributeError` if missing, which is detectable).

### Inline `from ... import` Inside Functions

**Deferred imports scattered through `main_new.py`:**
- Files: `apps/web/p2p-platform/backend/main_new.py:6361, 12914, 13017, 14435, 14574, 20869, 20890`
- Why fragile: `from order_flow import send_push_notification` inside function bodies means import errors are only caught at runtime when the code path executes. Circular import issues may be masked.
- Safe modification: Move all imports to the top of the file or the relevant module, resolving any circular dependencies explicitly.

---

## Scaling Limits

### ECS Task Count Hard-Capped at 2

- Current capacity: 2 ECS Fargate tasks × 4 uvicorn workers = 8 processes
- Limit: Adding a 3rd task would require 144 DB connections (3 × 4 workers × 12), which exceeds `db.t3.micro`'s 112-connection limit
- Scaling path: Upgrade to `db.t3.small` (225 connections), then set `max=4` in ECS auto-scaling. Alternatively, add PgBouncer sidecar to pool connections before they hit RDS.

### Single-Region Deployment

- Current: All infrastructure in `us-east-1` (ECS, RDS, ElastiCache, ECR)
- Limit: Any `us-east-1` AZ or regional outage takes the entire platform down
- Scaling path: Add CloudFront for static assets (already done for frontend). RDS Multi-AZ read replica for read-heavy queries. Long-term: Route 53 latency routing + second region.

---

## Dependencies at Risk

### No Pinned Python Package Versions (Minor Risk)

- Risk: `requirements.txt` may allow `pip install` to upgrade packages unexpectedly in new Docker builds
- Files: `apps/web/p2p-platform/backend/requirements.txt`
- Impact: A minor upstream breaking change (e.g., SQLAlchemy 2.x behavior) could cause silent failures on the next build
- Migration plan: Run `pip freeze > requirements.txt` to pin all transitive dependencies, or use `pip-compile` with `pyproject.toml`

### KOT Integration: Clover/Toast Partially Implemented

- Risk: `kot_integrations.py` includes `CloverIntegration` and `ToastIntegration` classes, but `kot_integrations.py:528-540` has `# TODO: Update our order status based on Square status` and `# TODO: Fetch order details and update our status`. Status sync is one-way.
- Files: `apps/web/p2p-platform/backend/kot_integrations.py:528-540`
- Impact: Orders sent to POS systems don't sync status back. Operators must manually reconcile.

---

## Missing Critical Features

### On-Time Delivery Tracking

- Problem: No mechanism exists to track when a driver picked up or delivered an order vs. the estimated time. Three hardcoded `95` values are returned instead.
- Blocks: Accurate driver performance scoring, quality control, SLA monitoring.

### Real Business Hours Enforcement

- Problem: Vendor `is_open` status is hardcoded `True` in the listing endpoint (`main_new.py:13691`). The `Vendor` model has a `business_hours` JSON field but it's never evaluated against current time.
- Blocks: Customers can order from closed restaurants.

### Surge Pricing Implementation

- Problem: `order_flow.py:826` has `# TODO: Add surge pricing based on demand/time`. An endpoint `/api/rideshare/surge-pricing` exists in route definitions but returns 404 in test reports. `GET /api/erp/pricing/surge` is documented in `ENTERPRISE_PRODUCTION_AUDIT.md` but not implemented.
- Blocks: Revenue optimization during peak demand.

### Real EIN / Legal Entity Data

- Problem: `order_flow.py:1219` returns `"tax_id": "XX-XXXXXXX"` on all ride receipts. `"address": "123 Main Street, San Francisco, CA 94102"` is a placeholder address.
- Blocks: Legal compliance for tax documentation sent to customers.

### Driver Bonus Tracking

- Problem: `main_new.py:6913` — `bonuses = 0.0  # Future: add bonus tracking`. The bonus field is always zero in driver earnings.
- Blocks: Driver incentive programs.

---

## Test Coverage Gaps

### No Coverage Enforcement

- What's not tested: There is no `--cov-fail-under` threshold in `pytest.ini` or any CI gate requiring minimum coverage.
- Files: `apps/web/p2p-platform/backend/pytest.ini`
- Risk: Coverage can regress to zero without any automated alert.
- Priority: Medium

### `main_new.py` Largely Untested

- What's not tested: The 22K-line monolith lacks direct unit tests. Test files in `tests/unit/` target specific sub-modules (`test_order_flow.py`, `test_stripe_integration.py`, `test_promotions.py`) but none systematically test the route handlers defined directly in `main_new.py` — vendor management, customer address CRUD, admin endpoints, dashboard routes.
- Files: `apps/web/p2p-platform/backend/tests/unit/`, `apps/web/p2p-platform/backend/main_new.py`
- Risk: Regressions in vendor/customer/admin endpoints go undetected.
- Priority: High

### Test Assertions Accept 404/405 as "Pass"

- What's not tested: Multiple test methods in `test_vendor_endpoints.py` explicitly accept HTTP 404 or 405 as a passing condition: `"Accept 404/405 if endpoint not implemented yet"`.
- Files: `apps/web/p2p-platform/backend/tests/unit/test_vendor_endpoints.py:35, 43, 163, 214, 238`
- Risk: Endpoints can be missing entirely and the test suite still passes.
- Priority: High

### No iOS or Android Automated Tests

- What's not tested: `eatfaircustomerTests/eatfaircustomerTests.swift`, `eatffairdeliveryTests/eatffairdeliveryTests.swift`, and `eatffairrestaurantTests/eatffairrestaurantTests.swift` exist as Xcode test targets but contain only the default XCTest boilerplate. There are no test implementations.
- Files:
  - `apps/ios/customer/eatfaircustomerTests/eatfaircustomerTests.swift`
  - `apps/ios/delivery/eatffairdeliveryTests/eatffairdeliveryTests.swift`
  - `apps/ios/restaurant/eatffairrestaurantTests/eatffairrestaurantTests.swift`
- Risk: Any Swift regression that doesn't cause a compile error goes undetected until a human tests the app manually.
- Priority: High

---

*Concerns audit: 2026-02-18*
