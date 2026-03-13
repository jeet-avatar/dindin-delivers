---
phase: quick-169
plan: 01
subsystem: backend-security
tags: [dos, rate-limiting, redis, scheduler, db-pool, security]
dependency_graph:
  requires: []
  provides: [upload-rate-limiting, smtp-amplification-prevention, redis-scheduler-lock, db-pool-health]
  affects: [main_new.py, order_flow.py, database.py]
tech_stack:
  added: []
  patterns: [Redis SET NX PX distributed lock, per-user rate limiting, per-IP rate limiting, pool stats introspection]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/order_flow.py
    - apps/web/p2p-platform/backend/database.py
decisions:
  - global declaration moved to top of _should_run_scheduler() to satisfy Python scoping rules (cannot declare global after use in nested scope)
  - /api/health/db-pool added to _PUBLIC_EXACT_PATHS (consistent with all other /api/health/* endpoints)
  - upload_limiter uses identifier= for authenticated endpoints, falls back to IP for public vendor doc endpoint
  - Redis lock TTL 55s < 60s job interval ensures natural expiry before next cycle; 50s refresh job keeps leader alive
metrics:
  duration_minutes: 85
  completed_date: 2026-03-13
  tasks_completed: 3
  files_modified: 3
---

# Phase quick-169 Plan 01: Fix 4 High DoS Vulnerabilities Summary

**One-liner:** Per-user upload rate limiting (10/hr), per-IP SMTP-amplification prevention (5/hr), Redis SET NX PX distributed scheduler lock with auto-expiry, and /api/health/db-pool utilization endpoint deployed to production.

## What Was Built

### Fix 1 — Upload Rate Limiting

`upload_limiter = RateLimiter(max_requests=10, window_seconds=3600)` added to the rate limiter block in `main_new.py`. Applied with `check_rate_limit` to 5 upload endpoints:

| Endpoint | Auth type | Identifier |
|----------|-----------|------------|
| `POST /drivers/{driver_id}/documents` | JWT driver | `driver:{id}` |
| `POST /api/auth/driver/documents` | JWT driver | `driver:{id}` |
| `POST /api/vendors/public/{vendor_id}/documents` | Public (no JWT) | IP address |
| `POST /api/vendors/{vendor_id}/documents` | JWT vendor | `vendor:{id}` |
| `POST /api/vendors/{vendor_id}/upload-image` | JWT vendor | `vendor:{id}` |

Admin upload endpoint (`/api/admin/vendors/{vendor_id}/documents/upload`) intentionally excluded — admins are trusted.

### Fix 2 — Per-IP Password Reset Rate Limiting (SMTP Amplification Prevention)

`password_reset_ip_limiter = RateLimiter(max_requests=5, window_seconds=3600)` added. Applied as first check (before email-based check) on all 4 password reset endpoints:

- `POST /api/auth/password-reset/request`
- `POST /api/customer/password-reset/request`
- `POST /api/driver/password-reset/request`
- `POST /api/vendor/password-reset/request`

An attacker from one IP can now trigger at most 5 SMTP sends per hour regardless of how many different email addresses they use. Email-based check still applies on top.

### Fix 3 — Redis-backed Distributed Scheduler Lock

`_should_run_scheduler()` in `order_flow.py` replaced with a two-strategy implementation:

1. **Redis SET NX PX** (preferred): `redis_client.set("dollor:scheduler:lock", pid, nx=True, px=55000)` — atomic, only one process wins, lock auto-expires 55s after container crash (no stuck scheduler)
2. **fcntl file lock** (fallback): Original behavior, used when Redis unavailable

A lock-refresh APScheduler job (`scheduler_lock_refresh`) runs every 50s inside `start_timeout_scheduler()` to keep the leader's Redis key alive across job cycles. File lock is held indefinitely as before.

### Fix 4 — DB Connection Pool Health Endpoint

`get_pool_stats()` added to `database.py` — returns `pool_size`, `checked_out`, `overflow`, `total_capacity`, `utilization_pct`, `status`. Logs `WARNING` when utilization >= 90%.

`GET /api/health/db-pool` added to `main_new.py` — no auth required (consistent with all `/api/health/*` endpoints, added to `_PUBLIC_EXACT_PATHS`). Returns the stats dict directly for CloudWatch log parsing.

## Verification Results

```
upload_limiter occurrences in main_new.py: 6 (1 definition + 5 endpoints) ✓
password_reset_ip_limiter occurrences: 5 (1 definition + 4 endpoints) ✓
dollor:scheduler:lock in order_flow.py: 2 occurrences (SET NX + expire) ✓
get_pool_stats in database.py: exported ✓
/api/health/db-pool in main_new.py: endpoint + allowlist ✓
python -c "import main_new, order_flow; from database import get_pool_stats": OK ✓
pytest tests/: 1490 passed, 0 failed, 11 skipped ✓
Staging: curl /api/health/db-pool → {"utilization_pct": 0.0, "status": "ok"} ✓
Production: curl https://api.dollor.ai/api/health/db-pool → {"utilization_pct": 0.0, "status": "ok"} ✓
```

## Commits

| Hash | Description |
|------|-------------|
| `24f022d5` | fix(quick-169): 4 high DoS vulns — upload rate limit, IP pwd-reset limit, Redis scheduler lock, DB pool alert |

## CI/CD

| Run | Workflow | Result |
|-----|----------|--------|
| `23059751895` | deploy-staging.yml | success — all jobs green |
| `23061498436` | deploy-dollar-ai.yml | success — all jobs green |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Python global declaration scoping error in _should_run_scheduler()**
- **Found during:** Task 2 (import verification)
- **Issue:** Plan placed `global _scheduler_lock_fd` inside nested `if acquired:` block, but Python requires global declarations before any assignment to the name within the function. This caused `SyntaxError: name '_scheduler_lock_fd' is assigned to before global declaration` because the file-lock fallback path also writes to the same global.
- **Fix:** Moved `global _scheduler_lock_fd` to the top of `_should_run_scheduler()` (before any conditional branches)
- **Files modified:** `order_flow.py`
- **Commit:** `24f022d5`

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/main_new.py` — modified ✓
- `apps/web/p2p-platform/backend/order_flow.py` — modified ✓
- `apps/web/p2p-platform/backend/database.py` — modified ✓
- Commit `24f022d5` exists ✓
- Staging CI run `23059751895` — success ✓
- Production CI run `23061498436` — success ✓
- Production endpoint `/api/health/db-pool` returns valid JSON ✓
