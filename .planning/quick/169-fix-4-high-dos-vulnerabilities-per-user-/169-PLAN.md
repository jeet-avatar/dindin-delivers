---
phase: quick-169
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/database.py
autonomous: true
requirements: [DOS-01, DOS-02, DOS-03, DOS-04]

must_haves:
  truths:
    - "A user cannot exhaust SMTP quota by spamming password resets with different email addresses from one IP"
    - "A user cannot upload unlimited files per hour (upload endpoints enforce 10/hour per user)"
    - "Scheduler still starts correctly after a container crash (Redis lock auto-expires, not stuck on dead file)"
    - "DB pool saturation is detectable via /api/health/db-pool before it causes 500s"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "upload_limiter, IP-based password reset rate limiting added to 4 endpoints"
      contains: "upload_limiter"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Redis-backed scheduler lock with file-lock fallback"
      contains: "dollor:scheduler:lock"
    - path: "apps/web/p2p-platform/backend/database.py"
      provides: "/api/health/db-pool endpoint and 90% pool utilization warning"
      contains: "db-pool"
  key_links:
    - from: "main_new.py password reset endpoints"
      to: "check_rate_limit"
      via: "IP-based check (no identifier=) before email-based check"
      pattern: "check_rate_limit.*pwd_reset_ip"
    - from: "order_flow.py _should_run_scheduler"
      to: "redis_client.set"
      via: "SET NX PX command"
      pattern: "dollor:scheduler:lock"
---

<objective>
Fix 4 high-severity DoS vulnerabilities identified in the DoS audit: per-user upload rate limiting, per-IP password reset rate limiting (SMTP amplification prevention), Redis-backed distributed scheduler lock, and DB connection pool alerting.

Purpose: Prevent resource exhaustion attacks that could take down the platform (SMTP quota, S3 bandwidth, scheduler duplication, DB connection starvation).
Output: 4 hardening changes across 3 files, all tested.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/order_flow.py
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/database.py
@/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/cache.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upload rate limiting + per-IP password reset rate limiting</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
**Fix 1 — Upload rate limiting (main_new.py:~457)**

In the RATE LIMITING section (~line 457), after `payment_limiter`, add:

```python
upload_limiter = RateLimiter(max_requests=10, window_seconds=3600)  # 10 uploads per hour per user
```

Then add `check_rate_limit` calls at the top of each upload endpoint handler body (after auth but before any file processing):

- Line 5737: `@app.post("/drivers/{driver_id}/documents")` — add `check_rate_limit(request, upload_limiter, "upload", identifier=f"driver:{driver.id}")`. The function signature already has no `request` param — add `request: Request` to the signature params before `driver_id`.
- Line 5852: `@app.post("/api/auth/driver/documents")` — function signature has no Request; add `request: Request` param and add `check_rate_limit(request, upload_limiter, "upload", identifier=f"driver:{driver.id}")`.
- Line 9914: `@app.post("/api/vendors/public/{vendor_id}/documents")` — public endpoint (no JWT auth); use IP-based limit: add `request: Request` param and call `check_rate_limit(request, upload_limiter, "upload")` (no identifier — falls back to IP).
- Line 11390: `@app.post("/api/vendors/{vendor_id}/documents")` — add `request: Request` and `check_rate_limit(request, upload_limiter, "upload", identifier=f"vendor:{_auth_vendor.id}")`.
- Line 11613: `@app.post("/api/admin/vendors/{vendor_id}/documents/upload")` — admin endpoint; skip rate limit (admins are trusted). No change needed.
- Line 14537: `@app.post("/api/vendors/{vendor_id}/upload-image")` — add `request: Request` param and `check_rate_limit(request, upload_limiter, "upload", identifier=f"vendor:{_auth_vendor.id}")`.

Note: The `request: Request` parameter already exists in some signatures — check before adding to avoid duplicates.

**Fix 2 — Per-IP password reset rate limiting (main_new.py:~457)**

Add a separate IP rate limiter for password reset in the RATE LIMITING block:

```python
password_reset_ip_limiter = RateLimiter(max_requests=5, window_seconds=3600)  # 5 per hour per IP (anti-SMTP-amplification)
```

Then in each of the 4 password reset request endpoints, add the IP check BEFORE the existing email-based check. The IP check uses no `identifier` so it automatically falls back to extracting IP from X-Forwarded-For using the CloudFront-safe `ips[-2]` logic already in `check_rate_limit`.

The 4 endpoints to update (all have `http_request: Request` already):
- `main_new.py:2615` — `/api/auth/password-reset/request`
- `main_new.py:6185` — `/api/customer/password-reset/request`
- `main_new.py:6269` — `/api/driver/password-reset/request`
- `main_new.py:6350` — `/api/vendor/password-reset/request`

In each, add this line as the FIRST line of the function body (before the existing email-based check):
```python
check_rate_limit(http_request, password_reset_ip_limiter, "pwd_reset_ip")
```

The existing per-email check stays — both checks apply (IP limit + email limit).
  </action>
  <verify>
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -c "import main_new; print('Imports OK')"
grep -n "upload_limiter" main_new.py | head -20
grep -n "password_reset_ip_limiter" main_new.py | head -10
```
  </verify>
  <done>
- `upload_limiter` appears in rate limiter block and in each upload endpoint body (5 occurrences total)
- `password_reset_ip_limiter` defined in rate limiter block and called in all 4 password-reset/request endpoints
- `python -c "import main_new"` succeeds with no import errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Redis-backed scheduler lock + DB pool alerting endpoint</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
    apps/web/p2p-platform/backend/database.py
    apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
**Fix 3 — Redis-backed distributed scheduler lock (order_flow.py:2821-2849)**

Replace the `_should_run_scheduler()` function with a version that tries Redis first and falls back to file lock.

The Redis lock uses `SET NX PX` (atomic "set if not exists with millisecond expiry). Key: `dollor:scheduler:lock`, TTL: 55000ms (55 seconds — shorter than the 60s job interval so it auto-releases before the next cycle, preventing stuck state after container crash).

The Redis client is available in `order_flow.py` via import — check if `cache` is already imported. If not, add `from cache import redis_client, REDIS_AVAILABLE` at the top of the function or at module-level near other cache imports.

New `_should_run_scheduler()` logic:

```python
def _should_run_scheduler() -> bool:
    """
    Guard: Only ONE worker process per container should run the background scheduler.

    Strategy:
    1. Try Redis SET NX PX (distributed lock, auto-expires after 55s if container crashes)
    2. Fall back to fcntl file lock if Redis unavailable (single-host protection)
    """
    # Strategy 1: Redis distributed lock (preferred — survives container restarts)
    try:
        from cache import redis_client, REDIS_AVAILABLE
        if REDIS_AVAILABLE and redis_client:
            lock_key = "dollor:scheduler:lock"
            lock_value = str(os.getpid())
            # SET NX PX: set only if not exists, with 55-second expiry
            acquired = redis_client.set(lock_key, lock_value, nx=True, px=55000)
            if acquired:
                logger.info(f"Scheduler Redis lock acquired by PID {os.getpid()}")
                # Refresh lock periodically — store fd for keep-alive (handled by APScheduler job interval)
                global _scheduler_lock_fd
                _scheduler_lock_fd = None  # No fd needed for Redis lock
                return True
            else:
                current_holder = redis_client.get(lock_key)
                logger.info(f"Scheduler Redis lock NOT acquired by PID {os.getpid()} — held by PID {current_holder}")
                return False
    except Exception as e:
        logger.warning(f"Redis scheduler lock failed ({e}), falling back to file lock")

    # Strategy 2: File lock fallback (works on single host, not distributed)
    import fcntl
    lock_path = "/tmp/dollor-scheduler.lock"
    try:
        lock_fd = os.open(lock_path, os.O_CREAT | os.O_WRONLY, 0o644)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        os.write(lock_fd, f"{os.getpid()}\n".encode())
        os.fsync(lock_fd)
        global _scheduler_lock_fd
        _scheduler_lock_fd = lock_fd
        logger.info(f"Scheduler file lock acquired by PID {os.getpid()}")
        return True
    except (OSError, IOError):
        logger.info(f"Scheduler file lock NOT acquired by PID {os.getpid()} — another worker is the scheduler leader")
        return False
```

Note: The Redis TTL is 55s (shorter than the 60s check interval). This means each scheduler interval, the leader process must re-acquire the lock. Since `_should_run_scheduler()` is only called ONCE at startup (in `start_timeout_scheduler()`), the Redis key will naturally expire after 55s. To keep the scheduler running across multiple cycles, we need to refresh the lock. Add a lock-refresh APScheduler job that runs every 50 seconds:

Inside `start_timeout_scheduler()`, after the existing jobs are added, add:

```python
# Refresh Redis scheduler lock every 50s (lock TTL is 55s)
from cache import redis_client, REDIS_AVAILABLE
if REDIS_AVAILABLE and redis_client:
    def _refresh_scheduler_lock():
        try:
            redis_client.expire("dollor:scheduler:lock", 55)
        except Exception:
            pass
    restaurant_timeout_scheduler.add_job(
        _refresh_scheduler_lock,
        IntervalTrigger(seconds=50),
        id="scheduler_lock_refresh",
        name="Refresh Redis scheduler lock",
        replace_existing=True
    )
```

**Fix 4 — DB pool alerting (database.py + main_new.py)**

In `database.py`, add a helper function after `get_db()` that returns pool stats:

```python
def get_pool_stats() -> dict:
    """Return connection pool utilization stats."""
    if _is_sqlite:
        return {"pool_type": "StaticPool (sqlite)", "checked_out": 0, "overflow": 0, "total": 0, "utilization_pct": 0}
    try:
        pool = engine.pool
        checked_out = pool.checkedout()
        overflow = pool.overflow()
        pool_size = pool.size()
        total_capacity = pool_size + engine.pool._max_overflow
        utilization_pct = round((checked_out / total_capacity) * 100, 1) if total_capacity > 0 else 0

        if utilization_pct >= 90:
            import logging
            logging.getLogger(__name__).warning(
                f"DB pool HIGH UTILIZATION: {checked_out}/{total_capacity} connections ({utilization_pct}%)"
            )

        return {
            "pool_size": pool_size,
            "checked_out": checked_out,
            "overflow": overflow,
            "total_capacity": total_capacity,
            "utilization_pct": utilization_pct,
            "status": "warning" if utilization_pct >= 90 else "ok"
        }
    except Exception as e:
        return {"error": str(e), "status": "unknown"}
```

In `main_new.py`, add a new health endpoint after the existing `/api/health/live` endpoint (~line 568):

```python
@app.get("/api/health/db-pool")
async def health_db_pool():
    """DB connection pool utilization stats. Returns warning status when >= 90% utilized."""
    from database import get_pool_stats
    stats = get_pool_stats()
    status_code = 200
    if stats.get("status") == "warning":
        status_code = 200  # Still return 200 but include warning in body for CloudWatch parsing
    return stats
```

This endpoint requires no auth (consistent with `/health` and `/api/health/ready`). Add it to the auth allowlist in the global middleware if needed (check `NON_AUTH_PATHS` or equivalent in `main_new.py`).
  </action>
  <verify>
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -c "import order_flow; print('order_flow OK')"
python -c "from database import get_pool_stats; print(get_pool_stats())"
grep -n "dollor:scheduler:lock" order_flow.py
grep -n "db-pool" main_new.py
grep -n "get_pool_stats" database.py main_new.py
```
  </verify>
  <done>
- `order_flow.py` contains `dollor:scheduler:lock` Redis SET NX PX logic with file-lock fallback
- `database.py` exports `get_pool_stats()` that returns utilization_pct and logs WARNING at 90%+
- `main_new.py` has `/api/health/db-pool` endpoint returning pool stats
- All Python imports succeed without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Run backend tests + deploy</name>
  <files></files>
  <action>
Run the full test suite to verify no regressions:

```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
source venv/bin/activate
pytest tests/ -x -q 2>&1 | tail -20
```

If all tests pass (expect ~1490 passed), commit and deploy:

```bash
cd /Users/jeet/doordash-p2p
git add apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/order_flow.py apps/web/p2p-platform/backend/database.py
git commit -m "fix(quick-169): 4 high DoS vulns — upload rate limit, IP pwd-reset limit, Redis scheduler lock, DB pool alert"
git push origin main
gh workflow run deploy-staging.yml --ref main
```

Monitor staging deploy:
```bash
gh run list --workflow=deploy-staging.yml --limit 3
# then:
gh run watch <run-id>
```

After staging passes, deploy to production:
```bash
gh workflow run deploy-dollar-ai.yml
gh run list --workflow=deploy-dollar-ai.yml --limit 3
gh run watch <run-id>
```
  </action>
  <verify>
```bash
# Verify staging endpoint is live
curl -s https://d34u5ixl0bulv4.cloudfront.net/api/health/db-pool | python3 -m json.tool
```
  </verify>
  <done>
- Test suite passes with 0 failures (regressions)
- Staging deploy CI/CD run shows all jobs green
- Production deploy CI/CD run shows all jobs green
- `curl https://d34u5ixl0bulv4.cloudfront.net/api/health/db-pool` returns JSON with `utilization_pct` field
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. Import check: `python -c "import main_new, order_flow; from database import get_pool_stats; print('OK')"` — no errors
2. Upload limiter present: `grep -c "upload_limiter" main_new.py` — at least 6 occurrences (definition + 5 endpoints)
3. IP pwd reset limiter: `grep -c "password_reset_ip_limiter" main_new.py` — at least 5 occurrences (definition + 4 endpoints)
4. Redis lock: `grep -n "dollor:scheduler:lock" order_flow.py` — at least 2 occurrences (SET NX and refresh)
5. Pool stats: `curl https://api.dollor.ai/api/health/db-pool` — returns JSON with `checked_out`, `utilization_pct` fields
</verification>

<success_criteria>
- Per-user upload rate limit: 10 uploads/hour enforced on all 5 upload endpoints (4 with user identity, 1 public by IP)
- Per-IP password reset rate limit: 5/hour IP check applied before email check on all 4 password-reset/request endpoints
- Scheduler lock: Redis SET NX PX with 55s TTL + 50s refresh job; file lock fallback when Redis unavailable
- DB pool health: `/api/health/db-pool` returns pool stats; WARNING logged when >= 90% utilized
- 0 test regressions; staging and production CI/CD green
</success_criteria>

<output>
After completion, create `.planning/quick/169-fix-4-high-dos-vulnerabilities-per-user-/169-SUMMARY.md`
</output>
