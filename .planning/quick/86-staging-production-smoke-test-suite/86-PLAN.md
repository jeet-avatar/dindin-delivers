# Quick Task 86: Staging + Production Smoke Test Suite

## Goal
Create automated smoke tests that hit real staging and production APIs to verify critical flows after deploys.

## Verified Endpoints (grep-confirmed)
- `/api/health` (main_new.py:20940)
- `/api/auth/customer/login` (main_new.py:3070) — OAuth2 form-encoded
- `/api/auth/driver/login` (main_new.py:2540)
- `/api/auth/vendor/login` (main_new.py:1770)
- `/api/vendors/published` (main_new.py:10051)
- `/api/rides/estimate` (bid_routes.py:2145) — requires auth
- `/api/rides/request` (bid_routes.py:330) — requires auth
- `/api/rides/available` (main_new.py:15555) — requires auth
- `/api/orders/create` (order_flow.py:1134) — requires auth
- `/api/payments/ride/create-intent` (rideshare_payments.py:65)
- `/ws/{client_id}` (main_new.py:17818)

## Tasks

### Task 1: Create smoke test file + conftest
**Files:** `tests/smoke/__init__.py`, `tests/smoke/conftest.py`, `tests/smoke/test_smoke.py`
**Action:**
- Create pytest smoke tests with `--env` flag (staging|production)
- Conftest provides `env_url` fixture based on `--env` flag
- Demo credential fixtures for all 3 roles
- Test categories:
  1. Health endpoints (both envs)
  2. Auth login for 3 roles (both envs)
  3. Browse vendors (both envs)
  4. Fare estimate with auth (both envs)
  5. Food order E2E flow (staging only)
  6. Rideshare E2E flow (staging only)
  7. Payment intent with demo bypass (staging only)
  8. WebSocket connectivity (both envs)
- Each test: 10s timeout, clear pass/fail, descriptive name
- Staging-only tests marked with `@pytest.mark.staging_only`

### Task 2: Create shell script wrapper
**Files:** `scripts/smoke-test.sh`
**Action:**
- Shell script: `scripts/smoke-test.sh staging|production`
- Runs pytest with correct `--env` flag
- For production: auto-excludes staging-only tests
- Prints summary table at end
- Exit code 0 = all pass, 1 = failures
