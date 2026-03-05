---
phase: quick-86
plan: staging-production-smoke-test-suite
subsystem: testing
tags: [smoke-tests, staging, production, pytest, ci]
key-files:
  created:
    - apps/web/p2p-platform/backend/tests/smoke/__init__.py
    - apps/web/p2p-platform/backend/tests/smoke/conftest.py
    - apps/web/p2p-platform/backend/tests/smoke/test_smoke.py
    - scripts/smoke-test.sh
decisions:
  - Single test file with --env flag instead of separate staging/production test files
  - OAuth2 form-encoded login (data= not json=) matching backend auth endpoints
  - WebSocket test with websockets library fallback to HTTP upgrade check
  - staging_only marker auto-deselects in production mode via conftest hook
metrics:
  duration: 145s
  completed: 2026-03-05
  tasks: 2/2
---

# Quick Task 86: Staging + Production Smoke Test Suite Summary

Pytest smoke test suite with 7 test classes covering health, auth (3 roles), vendors, rideshare, food orders, payments, and WebSocket connectivity against staging/production via --env flag.

## What Was Built

### Task 1: Smoke Test Files (d677a227)

**conftest.py** -- Standalone pytest configuration:
- `--env` CLI option (staging|production) with `env_url` fixture
- `staging_only` marker with auto-skip in production mode
- Demo credential fixtures for customer, driver, vendor roles
- Session-scoped JWT token fixtures (login once, reuse across tests)
- `auth_header()` helper for Authorization Bearer headers

**test_smoke.py** -- 7 test classes, 13 test functions:

| Class | Tests | Environments | Purpose |
|-------|-------|-------------|---------|
| TestHealthEndpoints | 2 | both | /api/health 200 + JSON body |
| TestAuthEndpoints | 6 | both | Login success (3 roles) + bad password rejection (3 roles) |
| TestVendorEndpoints | 1 | both | /api/vendors/published returns list |
| TestRideshareFlow | 3 | both + staging | Fare estimate, ride request, rides available |
| TestFoodOrderFlow | 1 | staging | Order creation with test data |
| TestPaymentEndpoints | 1 | staging | Ride payment intent creation |
| TestWebSocket | 1 | both | WebSocket upgrade handshake verification |

### Task 2: Shell Script Wrapper (5246c358)

**scripts/smoke-test.sh** -- CLI wrapper:
- Usage: `scripts/smoke-test.sh staging` or `scripts/smoke-test.sh production`
- Auto-activates venv if present
- Prints environment info header and summary table with duration
- Proper exit codes (0=pass, 1=fail)

## Test Inventory

**Production-safe tests (always run):** 10
- Health (2), Auth login/reject (6), Vendors (1), Fare estimate (1), Rides available (1), WebSocket (1) -- wait, that's 12. Let me recount.

Actually: Health (2) + Auth (6 parametrized: 3 success + 3 bad password) + Vendors (1) + Fare estimate (1) + Rides available (1) + WebSocket (1) = 12 in production mode.

**Staging-only tests (destructive/write operations):** 3
- Ride request, Order create, Payment intent

**Total:** 15 test cases (12 production-safe + 3 staging-only)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

All files verified:
- Python syntax validated via `py_compile.compile(doraise=True)` -- 3/3 pass
- Shell syntax validated via `bash -n` -- pass
- Tests NOT executed (they hit live APIs -- run manually with `scripts/smoke-test.sh staging`)
