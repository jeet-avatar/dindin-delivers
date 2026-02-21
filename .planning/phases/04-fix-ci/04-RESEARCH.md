# Phase 04: Fix CI - Research

**Researched:** 2026-02-20
**Domain:** Python test infrastructure (pytest, FastAPI TestClient, CI/CD workflows)
**Confidence:** HIGH

## Summary

The CI test suite has two independent layers of issues. **Layer 1 (blocking CI deploy):** The production deploy workflow (`deploy-dollar-ai.yml`) runs only `tests/unit/` -- these currently **pass** (1002/1002) when the correct environment variables are set (`JWT_SECRET_KEY`, `TESTING=true`). The deploy CI is green. **Layer 2 (non-blocking but failing nightly):** The integration test workflow (`integration-tests.yml`) fails because (a) `database.py` defaults `ENVIRONMENT` to `"production"`, adding `sslmode=require` to PostgreSQL connections, but CI's PostgreSQL service container doesn't support SSL; (b) tests outside `tests/unit/` were not updated after the Phase 02 security auth hardening -- 170+ endpoints now require JWT authentication, and many integration/e2e/cross-platform tests make unauthenticated requests.

The specific breakdown of failures across the full test suite is: **1002 passed** (unit), **1 failed** (api -- 404 test now gets 401 from auth middleware), **1 failed** (integration -- document count mismatch), **8 failed** (e2e -- auth required for rideshare endpoints), **8 failed** (cross-platform -- missing tables + auth required), **11 skipped** (e2e -- graceful auth skips). Total: 18 failures + 11 skips across non-unit test suites.

**Primary recommendation:** Fix the 18 test failures in 3 groups: (1) database.py SSL/environment default, (2) tests that need auth headers added, (3) the document count test assertion. Then update the integration-tests.yml workflow to set `ENVIRONMENT=testing` so the backend server starts correctly.

## Standard Stack

### Core
| Library | Version (requirements.txt) | Version (installed locally) | Purpose | Notes |
|---------|---------------------------|---------------------------|---------|-------|
| fastapi | 0.115.0 | 0.104.1 | Web framework | **Local venv is stale** -- CI installs from requirements.txt |
| pytest | 8.3.4 | 8.3.4 | Test runner | Matches |
| httpx | 0.27.2 | 0.25.2 | TestClient HTTP backend | **Local venv is stale** -- CI uses requirements.txt |
| redis | 5.0.1 | 7.2.0 (just installed) | Cache/rate-limiting | Needed for import chain |
| sqlalchemy | 2.0.36 | 2.0.36 | ORM | Matches |
| pytest-asyncio | 0.25.0 | 0.24.0 | Async test support | Local slightly behind |

### Key Observation: Version Mismatch
The local venv has FastAPI 0.104.1 (from Sept 2023) while requirements.txt specifies 0.115.0 (from Sept 2024). CI always installs from requirements.txt, so CI runs the newer version. This means local test results may differ from CI. **This is not the source of current failures** but should be noted.

## Architecture Patterns

### Test Directory Structure
```
tests/
├── conftest.py              # Shared fixtures: test_db, client, auth_headers, factories
├── test_cross_platform.py   # 20 tests -- has own conftest issues (missing tables)
├── unit/                    # 1002 tests -- ALL PASS (CI runs ONLY these for deploy)
│   ├── test_api_config.py
│   ├── test_auth_endpoints.py
│   ├── test_document_verification.py
│   ├── test_dollor_pricing_model.py
│   ├── test_driver_endpoints.py
│   ├── test_email_service.py
│   ├── test_file_upload_security.py
│   ├── test_image_service.py
│   ├── test_models.py
│   ├── test_order_flow.py
│   ├── test_promotions.py
│   ├── test_realtime_events.py
│   ├── test_security_helpers.py
│   ├── test_stripe_integration.py
│   └── test_vendor_endpoints.py   # 33 tests -- ALL PASS (was 112 errors, rewritten)
├── api/                     # 32 tests -- 1 failure
│   └── test_endpoints.py
├── integration/             # 43 tests -- 1 failure
│   ├── test_android_restaurant_e2e_workflow.py
│   ├── test_approval_to_publish_flow.py
│   ├── test_document_save_flow.py
│   └── test_ios_api_contracts.py
└── e2e/                     # 24 tests -- 8 failures, 11 skipped
    ├── test_critical_flows.py
    ├── test_rideshare_cross_platform.py
    └── test_rideshare_e2e_flow.py
```

### CI Workflow Architecture
```
deploy-dollar-ai.yml      (PRODUCTION DEPLOY -- gate: tests/unit/ only)
deploy-staging.yml         (STAGING DEPLOY -- gate: tests/unit/ + microservice tests)
integration-tests.yml      (NIGHTLY + push -- runs api/, integration/, e2e/, iOS builds)
```

**Critical insight:** The production deploy (`deploy-dollar-ai.yml`) only runs `pytest tests/unit/ -v --tb=short`. This means the deploy CI IS green. The failures are in the integration-tests.yml workflow which runs on push and nightly schedule.

### Auth Fixture Pattern (conftest.py)
```python
# conftest.py provides these fixtures:
auth_headers       # User JWT: {"sub": user.email}
admin_auth_headers # Admin JWT: {"sub": admin.email}
vendor_auth_headers # Vendor JWT: {"sub": vendor.email, "vendor_id": vendor.id}
driver_auth_headers # Driver JWT: {"sub": driver.email, "driver_id": driver.id}
```

Tests that need auth must use these fixtures AND pass the headers to `client.get/post/etc()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth tokens for tests | Manual JWT creation in each test | `auth_headers` / `admin_auth_headers` / `vendor_auth_headers` / `driver_auth_headers` fixtures from conftest.py | Already defined, consistent with app's `create_access_token` |
| Customer auth in e2e tests | Custom JWT payloads | Add `customer_auth_headers` fixture if missing, or use `create_access_token(data={"sub": customer.email, "customer_id": customer.id})` | Tests need customer_id in JWT for ride endpoints |

## Common Pitfalls

### Pitfall 1: database.py Defaults ENVIRONMENT to "production"
**What goes wrong:** In CI, `ENVIRONMENT` is not set, so `_is_prod` evaluates to `True`, and `sslmode=require` is added to PostgreSQL connect args. CI's PostgreSQL service container doesn't support SSL.
**Why it happens:** Line 18 of database.py: `_is_prod = os.getenv("ENVIRONMENT", "production").lower() in ("production", "prod")`
**How to avoid:** Set `ENVIRONMENT=testing` in CI workflow env vars, OR change the default from "production" to something neutral.
**Warning signs:** `psycopg2.OperationalError: server does not support SSL, but SSL was required`
**Confidence:** HIGH -- verified from CI logs (run 22249001231)

### Pitfall 2: Auth Middleware Intercepts Before Route Matching
**What goes wrong:** Tests that expect 404 for nonexistent endpoints now get 401 because the global auth middleware (`require_auth_middleware`) runs before FastAPI's route matching.
**Why it happens:** Phase 02 added middleware at `main_new.py:367` that blocks unauthenticated requests to non-allowlisted paths. `/nonexistent-endpoint-12345` is not in the allowlist, so middleware returns 401 before FastAPI returns 404.
**How to avoid:** Update test assertions: unauthenticated requests to unknown endpoints should expect 401, not 404. Or send with auth headers and then expect 404.
**Confidence:** HIGH -- directly observed in test output

### Pitfall 3: E2E Tests Don't Pass Auth Headers
**What goes wrong:** E2E rideshare tests create auth fixtures (`auth_headers`, `test_customer`) but never pass headers to `client.post("/api/rides/request", ...)`. The endpoints now require authentication.
**Why it happens:** These tests were written before Phase 02's auth hardening. The test_rideshare_e2e_flow.py accepts `auth_headers` as a fixture but doesn't use them in requests.
**How to avoid:** Add `headers=auth_headers` to all HTTP calls in e2e tests. For rides specifically, need customer JWT with `customer_id` claim.
**Confidence:** HIGH -- observed `401 Unauthorized` in test output and verified test code

### Pitfall 4: Cross-Platform Tests Miss conftest.py Fixtures
**What goes wrong:** `test_cross_platform.py` uses `client` fixture but gets `no such table: customers/users` SQLite errors.
**Why it happens:** The cross-platform tests don't use the `db_session` fixture path properly -- they use `client` directly but the SQLite in-memory database doesn't have all tables created. The `test_db` session-scoped fixture may not run if `db_session` is not requested.
**How to avoid:** Ensure these tests request `db_session` via the `client` fixture chain (they do -- the error is that some tables aren't in the SQLite schema due to import order). The real fix: ensure all models are imported before `Base.metadata.create_all()`.
**Confidence:** MEDIUM -- the table creation depends on import order in `database.py`/`conftest.py`

### Pitfall 5: Document Upload Sanitization Changes document_type
**What goes wrong:** Integration test uploads 5 documents with distinct `document_type` values, but only 4 are returned. The `business_license` upload shows `document_type: w9_form` in the response.
**Why it happens:** The document upload endpoint may be overwriting the document_type via sanitization logic, OR the first document uploaded (`w9_form`) shares the same DB slot as `business_license` due to how document types are stored/matched.
**How to avoid:** Debug the document upload endpoint to verify document_type storage logic. The test assertion `>= 5` is correct -- the backend behavior needs investigation.
**Confidence:** MEDIUM -- observed in test output but root cause in backend code not fully traced

## Detailed Failure Analysis

### Category A: Auth-related failures (10 tests)

All caused by Phase 02's auth hardening -- tests make unauthenticated requests to now-protected endpoints.

| Test File | Test | Expected | Got | Fix |
|-----------|------|----------|-----|-----|
| `api/test_endpoints.py` | `test_404_returns_json` | 404 | 401 | Change assertion to expect 401, or add auth headers and then expect 404 |
| `e2e/test_critical_flows.py` | `test_restaurant_application_flow` | 200/201/400/404/422 | 401 | Add 401 to acceptable responses, or add auth |
| `e2e/test_rideshare_e2e_flow.py` | `test_full_rideshare_flow` | 200 | 401 | Pass customer auth headers to `/api/rides/request` |
| `e2e/test_rideshare_e2e_flow.py` | 5 edge case tests | KeyError | 401 then KeyError | Same fix: pass auth headers |
| `test_cross_platform.py` | `test_get_menu_items_mobile` | 200/404 | 401 | Add auth headers or 401 to assertions |

### Category B: Database/fixture issues (9 tests)

| Test File | Test | Error | Root Cause | Fix |
|-----------|------|-------|------------|-----|
| `test_cross_platform.py` | 6 auth tests | `no such table: customers/users` | SQLite in-memory DB missing tables -- model imports not all triggered before `create_all` | Ensure `models_extended.py` and all models are imported in conftest before table creation |
| `test_cross_platform.py` | `test_get_menu_items_web` | 500 (no such table: vendor_menu_items) | Same root cause | Same fix |
| `integration/test_android_restaurant_e2e_workflow.py` | `test_complete_restaurant_workflow` | assert 4 >= 5 | Document upload stores only 4 of 5 docs (document_type collision) | Debug backend document_type storage logic |

### Category C: CI infrastructure (integration-tests.yml only)

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Backend server won't start | `database.py` defaults ENVIRONMENT to "production", adds `sslmode=require` | Set `ENVIRONMENT=testing` in workflow env |
| Backend server won't start | `JWT_SECRET_KEY` required at module import time | Already set in workflow -- not the issue |

## Code Examples

### Fix 1: database.py ENVIRONMENT default (Category C)

```python
# database.py line 18 -- CURRENT (broken in CI):
_is_prod = os.getenv("ENVIRONMENT", "production").lower() in ("production", "prod")

# FIX -- default to empty string, require explicit production opt-in:
_is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
```

### Fix 2: Integration workflow ENVIRONMENT variable

```yaml
# integration-tests.yml -- add ENVIRONMENT to all jobs that start the backend
env:
  DATABASE_URL: postgresql://test:test@localhost:5432/testdb
  JWT_SECRET_KEY: test-secret-key-for-ci
  TESTING: "true"
  ENVIRONMENT: "testing"  # <-- ADD THIS
```

### Fix 3: Auth headers in e2e rideshare tests

```python
# test_rideshare_e2e_flow.py -- need customer-specific auth headers
@pytest.fixture
def customer_headers(test_customer):
    from main_new import create_access_token
    token = create_access_token(data={
        "sub": test_customer.email,
        "customer_id": test_customer.id
    })
    return {"Authorization": f"Bearer {token}"}

# Then use in test methods:
resp = client.post("/api/rides/request", json={...}, headers=customer_headers)
```

### Fix 4: 404 test expects 401 now

```python
# test_endpoints.py -- update assertion
def test_404_returns_json(self, client):
    """Unauthenticated requests to unknown endpoints get 401 from middleware"""
    response = client.get("/nonexistent-endpoint-12345")
    assert response.status_code == 401  # Auth middleware intercepts first
```

### Fix 5: Cross-platform tests -- import all models in conftest

```python
# conftest.py -- add before Base.metadata.create_all:
from models_extended import (
    Promotion, PromotionRedemption, RestaurantInvitation,
    OnboardingLog, ScrapedMenuItem, RealTimeEvent,
    Communication, CustomerFavorite, VendorAnalytics,
    EmailTemplate, EmailSchedule, EmailABTest
)
```

## State of the Art

| Old State | Current State | When Changed | Impact |
|-----------|--------------|--------------|--------|
| No auth on most endpoints | Global auth middleware + per-endpoint Depends() | Phase 02 (Feb 2026) | All tests hitting non-public endpoints need auth headers |
| `test_vendor_endpoints.py` had 112 errors | Rewritten to 33 tests, all pass | Phase 01 v1.1 | **Resolved** -- no longer an issue |
| SMTP test ordering issue | Passes in isolation and in full suite | Verified 2026-02-20 | **Resolved** -- no longer an issue |
| Redis not in local venv | `cache.py` imports redis at module load | Phase vertical scaling | Tests fail to import without redis installed |

## Open Questions

1. **Document type collision in integration test**
   - What we know: 5 documents uploaded, only 4 returned. The `business_license` upload shows `document_type: w9_form`.
   - What's unclear: Whether this is a backend bug (document_type sanitization overwriting) or a test issue (document overwrite logic in the endpoint).
   - Recommendation: Debug the vendor document upload endpoint to trace how `document_type` is stored. This may be a real backend bug worth fixing, not just a test fix.

2. **Local venv version drift**
   - What we know: Local FastAPI is 0.104.1 vs requirements.txt 0.115.0. Local httpx is 0.25.2 vs 0.27.2.
   - What's unclear: Whether any tests behave differently between these versions.
   - Recommendation: Run `pip install -r requirements.txt` in the local venv to align. Not urgent for this phase since CI installs from requirements.txt.

3. **Scope of "Fix CI" -- which workflows?**
   - Deploy CI (`deploy-dollar-ai.yml`): Already green (only runs unit tests).
   - Integration CI (`integration-tests.yml`): Failing -- needs fixes.
   - Recommendation: Focus on making integration-tests.yml green since deploy is already working.

## Sources

### Primary (HIGH confidence)
- Direct test execution: `pytest tests/unit/` -- 1002 passed (local run 2026-02-20)
- Direct test execution: `pytest tests/` -- 18 failed, 1099 passed, 11 skipped (local run 2026-02-20)
- CI run logs: `gh run view 22249001231` -- SSL error in backend startup
- Source code: `database.py` line 18 (ENVIRONMENT default)
- Source code: `conftest.py` (fixture definitions and table creation)
- Source code: `deploy-dollar-ai.yml` line 48 (runs only `tests/unit/`)
- Source code: `integration-tests.yml` (full workflow definition)

### Secondary (MEDIUM confidence)
- Error pattern analysis from test output (auth 401 vs expected status codes)
- Document count mismatch analysis (4 returned instead of 5)

## Metadata

**Confidence breakdown:**
- Unit test status: HIGH -- directly verified by running full suite
- Auth-related failures: HIGH -- clear 401 pattern from auth middleware, confirmed by code inspection
- Database SSL issue: HIGH -- confirmed from CI logs (psycopg2 SSL error)
- Cross-platform table issues: MEDIUM -- observed error but import order root cause needs verification
- Document count issue: MEDIUM -- observed but backend root cause not fully traced
- SMTP test issue: HIGH -- confirmed resolved (passes both in isolation and full suite)
- Vendor endpoint 112 errors: HIGH -- confirmed resolved (test file rewritten, 33/33 pass)

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable -- test infrastructure doesn't change rapidly)
