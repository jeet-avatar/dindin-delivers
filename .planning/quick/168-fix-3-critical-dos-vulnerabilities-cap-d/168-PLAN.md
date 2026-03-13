---
phase: quick-168
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/websocket_server.py
  - apps/web/p2p-platform/backend/cache.py
autonomous: true
requirements: [QUICK-168]
must_haves:
  truths:
    - "Dashboard endpoint never loads more than 10000 orders or tickets in a single request"
    - "Vendor list endpoint never loads more than 1000 vendors in a single request"
    - "A single client_id cannot open more than 3 WebSocket connections simultaneously"
    - "Total WebSocket connections are capped at 10000 globally"
    - "In-memory rate limiter eviction does not rebuild the entire dict on every hot request"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Bounded .all() queries with .limit() guards"
    - path: "apps/web/p2p-platform/backend/websocket_server.py"
      provides: "Per-client and global WebSocket connection caps"
    - path: "apps/web/p2p-platform/backend/cache.py"
      provides: "Efficient in-memory rate limiter eviction"
  key_links:
    - from: "ConnectionManager.connect()"
      to: "MAX_CONNECTIONS_PER_CLIENT / MAX_TOTAL_CONNECTIONS"
      via: "guard check before websocket.accept()"
      pattern: "len.*active_connections.*MAX_TOTAL"
    - from: "get_vendors()"
      to: "query.limit(1000)"
      via: "SQLAlchemy query chain"
      pattern: "query\\.order_by.*\\.limit\\(1000\\)"
---

<objective>
Fix 3 critical DoS vulnerabilities: unbounded database queries on dashboard and vendor endpoints,
unbounded WebSocket connections, and expensive in-memory rate limiter eviction.

Purpose: Prevent memory exhaustion and CPU spikes under adversarial or high-load conditions.
Output: 3 files patched with defensive caps; no functional behavior changes for normal usage.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Cap unbounded .all() queries in dashboard and vendor endpoints</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
    Fix 1 — Dashboard endpoint (line ~8191-8209):
    The queries `db.query(Order).filter(...).all()`, `db.query(Vendor).all()`,
    `db.query(Driver).all()`, and `db.query(SupportTicket).filter(...).all()` have no row cap.

    Change each `.all()` to `.limit(N).all()` with these limits:
    - Orders (date-filtered): `.limit(10000).all()`
    - Vendors (no filter): `.limit(10000).all()`
    - Drivers (no filter): `.limit(10000).all()`
    - Support tickets (date-filtered): `.limit(10000).all()`

    The limits go BEFORE `.all()` in the chain, e.g.:
    `db.query(Order).filter(Order.created_at >= start_date).limit(10000).all()`

    Fix 2 — Vendor list endpoint (line ~10255):
    `query.order_by(Vendor.created_at.desc()).all()` has no row cap.

    Add `offset` and `limit` query params to `get_vendors()` signature:
    ```python
    offset: int = 0,
    limit: int = 1000,
    ```
    Then change the query line to:
    `vendors = query.order_by(Vendor.created_at.desc()).offset(offset).limit(min(limit, 1000)).all()`

    The `min(limit, 1000)` ensures callers cannot request more than 1000 rows even if they pass a
    larger value. Also invalidate the "vendors:all" cache key when offset=0 (not limit, since
    limit is capped). The existing `if not status and not risk_rating:` cache block stays unchanged —
    it only caches unfiltered default requests, which is correct since offset/limit=defaults gives
    the same result.
  </action>
  <verify>
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
    grep -n "\.limit(10000)" main_new.py | head -5
    grep -n "offset(offset)" main_new.py
    grep -n "min(limit, 1000)" main_new.py
  </verify>
  <done>
    Four `.limit(10000)` caps appear in the dashboard block. Vendor list query includes
    `.offset(offset).limit(min(limit, 1000))`. Function signature includes `offset: int = 0,
    limit: int = 1000` params.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add per-client and global WebSocket connection caps</name>
  <files>apps/web/p2p-platform/backend/websocket_server.py</files>
  <action>
    Add two class-level constants to `ConnectionManager.__init__` (or as module-level constants):
    ```python
    MAX_CONNECTIONS_PER_CLIENT = 3
    MAX_TOTAL_CONNECTIONS = 10000
    ```

    In `ConnectionManager.connect()`, add enforcement BEFORE `await websocket.accept()`:

    ```python
    async def connect(self, websocket: WebSocket, client_id: str, metadata: Optional[Dict] = None):
        # Global cap
        if len(self.active_connections) >= MAX_TOTAL_CONNECTIONS:
            await websocket.close(code=1008, reason="Server at capacity")
            logger.warning(f"WebSocket rejected (global cap): {client_id}")
            return

        # Per-client cap: count connections with same base client_id prefix
        # client_id format is e.g. "customer:123" or "driver:456:{uuid}"
        # Extract entity prefix (first two colon-separated segments) for grouping
        base_id = ":".join(client_id.split(":")[:2]) if ":" in client_id else client_id
        existing_count = sum(
            1 for cid in self.active_connections
            if (":".join(cid.split(":")[:2]) if ":" in cid else cid) == base_id
        )
        if existing_count >= MAX_CONNECTIONS_PER_CLIENT:
            await websocket.close(code=1008, reason="Too many connections from this client")
            logger.warning(f"WebSocket rejected (per-client cap {existing_count}): {client_id}")
            return

        await websocket.accept()
        ...
    ```

    Keep the rest of `connect()` exactly as-is after the `await websocket.accept()` line.
    Do NOT change `disconnect()`, `subscribe()`, or any other methods.
  </action>
  <verify>
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
    grep -n "MAX_CONNECTIONS_PER_CLIENT\|MAX_TOTAL_CONNECTIONS" websocket_server.py
    grep -n "Server at capacity\|Too many connections" websocket_server.py
  </verify>
  <done>
    Both constants defined. `connect()` rejects with close code 1008 when global cap or per-client
    cap is exceeded. `websocket.accept()` is only called after both guards pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix expensive in-memory rate limiter eviction in cache.py</name>
  <files>apps/web/p2p-platform/backend/cache.py</files>
  <action>
    Current code (lines ~113-119) does a full dict rebuild when key count exceeds 10K.
    This is a O(n) stop-the-world rebuild that hits on every request once 10K keys accumulate.

    Replace the eviction block with a targeted eviction that removes only expired entries
    for the current request's key, plus a lightweight periodic full cleanup triggered by a
    probabilistic check (1% of calls) rather than a size check:

    ```python
    now = time.time()
    window_cutoff = now - window_seconds

    # Lightweight per-key cleanup: always trim expired timestamps for this key first
    if key in _memory_rate_limits:
        _memory_rate_limits[key] = [t for t in _memory_rate_limits[key] if t > window_cutoff]

    # Probabilistic full cleanup: ~1% of requests, only when dict is large
    import random
    if len(_memory_rate_limits) > _MEMORY_RL_MAX_KEYS and random.random() < 0.01:
        cutoff = now - 3600
        _memory_rate_limits = {
            k: v for k, v in _memory_rate_limits.items()
            if v and v[-1] > cutoff  # keep only keys with a recent timestamp
        }

    if key not in _memory_rate_limits:
        _memory_rate_limits[key] = []
    ```

    Then remove the duplicate per-key trim line that currently follows the eviction block
    (the existing `_memory_rate_limits[key] = [t for t in ...]` line at ~125) since we now
    do the trim above. Keep everything else (the append, the return logic) unchanged.

    The `import random` should go at the top of the file with other imports, not inline.
    Check if `random` is already imported at the top of cache.py before adding it.
  </action>
  <verify>
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
    grep -n "random.random\|0\.01\|window_cutoff" cache.py
    python3 -c "import cache; print('cache.py imports OK')"
  </verify>
  <done>
    Per-key trim happens before the size check. Full rebuild is probabilistic (1% of calls)
    and uses a cheaper single-pass filter. `cache.py` imports cleanly with no syntax errors.
  </done>
</task>

</tasks>

<verification>
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
source venv/bin/activate
pytest tests/ -v -k "rate_limit or dashboard or vendor or websocket" --tb=short 2>&1 | tail -20
</verification>

<success_criteria>
- Dashboard query lines contain `.limit(10000)` before `.all()`
- Vendor list endpoint has `offset`/`limit` params with `min(limit, 1000)` enforcement
- WebSocket `connect()` rejects with code 1008 when global (10K) or per-client (3) cap exceeded
- In-memory rate limiter uses per-key trim on every call + probabilistic full cleanup
- Backend imports cleanly (no syntax errors)
- Existing rate limit tests continue to pass
</success_criteria>

<output>
After completion, create `.planning/quick/168-fix-3-critical-dos-vulnerabilities-cap-d/168-SUMMARY.md`
</output>
