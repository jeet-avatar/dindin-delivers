---
phase: quick-168
plan: 01
subsystem: backend
tags: [dos, security, performance, websocket, rate-limiting, database]
dependency_graph:
  requires: []
  provides: [bounded-db-queries, ws-connection-caps, efficient-rate-limiter]
  affects: [main_new.py, websocket_server.py, cache.py]
tech_stack:
  added: []
  patterns: [sliding-window-rate-limit, per-key-trim, probabilistic-eviction, ws-connection-guard]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/websocket_server.py
    - apps/web/p2p-platform/backend/cache.py
decisions:
  - Used min(limit, 1000) in vendor list endpoint so callers cannot bypass the cap via query params
  - Used base_id prefix matching (first two colon-separated segments) for per-client WS grouping
  - Probabilistic eviction at 1% of calls avoids synchronizing on every hot request
  - Full dict rebuild kept but now only runs ~1% of the time instead of on every request past 10K keys
metrics:
  duration: ~10 minutes
  completed: 2026-03-13
  tasks_completed: 3
  files_modified: 3
---

# Quick Task 168: Fix 3 Critical DoS Vulnerabilities Summary

**One-liner:** Bounded all unbounded DB queries (10K row caps), added per-client (3) and global (10K) WebSocket connection guards, and replaced stop-the-world rate limiter eviction with per-key trim + 1% probabilistic full cleanup.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Cap unbounded dashboard and vendor list queries | `4786346c` | `main_new.py` |
| 2 | Add per-client and global WebSocket connection caps | `a46d258c` | `websocket_server.py` |
| 3 | Fix expensive in-memory rate limiter eviction | `67826bbb` | `cache.py` |

## What Was Changed

### Task 1 — Bounded DB Queries (main_new.py)

Dashboard endpoint (line ~8191-8209): Added `.limit(10000)` before `.all()` on four queries:
- `db.query(Order).filter(...).limit(10000).all()`
- `db.query(Vendor).limit(10000).all()`
- `db.query(Driver).limit(10000).all()`
- `db.query(SupportTicket).filter(...).limit(10000).all()`

Vendor list endpoint (`GET /api/vendors`, line ~10223): Added `offset: int = 0` and `limit: int = 1000` query params. Query now uses `.offset(offset).limit(min(limit, 1000))` — callers cannot bypass the 1000-row cap by passing a larger value.

### Task 2 — WebSocket Connection Caps (websocket_server.py)

Added two module-level constants:
- `MAX_CONNECTIONS_PER_CLIENT = 3`
- `MAX_TOTAL_CONNECTIONS = 10000`

In `ConnectionManager.connect()`, added two guards BEFORE `websocket.accept()`:
1. Global cap: if `len(self.active_connections) >= MAX_TOTAL_CONNECTIONS` → close with code 1008, reason "Server at capacity"
2. Per-client cap: counts connections sharing the same entity prefix (e.g. `customer:123`) → close with code 1008, reason "Too many connections from this client"

`websocket.accept()` is only called after both guards pass.

### Task 3 — Efficient Rate Limiter Eviction (cache.py)

**Before:** Full O(n) dict rebuild triggered on every call once key count exceeded 10K — meaning every hot request paid the full rebuild cost indefinitely.

**After:**
1. Per-key trim runs on every call (O(1) per key, only trims this key's timestamps).
2. Full rebuild is probabilistic: triggered at ~1% of calls AND only when dict size > 10K.
3. Added `import random` at top of file.

## Verification

206 tests passed (rate_limit, dashboard, vendor, websocket keyword filter), 0 failures.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/main_new.py` — modified (verified with grep)
- `apps/web/p2p-platform/backend/websocket_server.py` — modified (verified with grep)
- `apps/web/p2p-platform/backend/cache.py` — modified (verified with grep + python3 import test)
- Commits `4786346c`, `a46d258c`, `67826bbb` — all present in git log
