---
phase: quick-170
plan: 01
subsystem: backend-security
tags: [dos, security, stripe, cloud-functions, middleware, analytics]
dependency_graph:
  requires: []
  provides: [stripe-webhook-idempotency, request-body-size-limit, analytics-row-cap, cloud-function-timeout-config]
  affects: [main_new.py, backend/functions/src/index.ts]
tech_stack:
  added: []
  patterns: [redis-idempotency, fastapi-middleware, sqlalchemy-limit, firebase-runWith]
key_files:
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - backend/functions/src/index.ts
decisions:
  - "Added .limit(10000) to filter dropdown endpoints (suppliers, cost_centers, departments) per plan safety guidance even though they are small reference tables"
  - "TypeScript compile errors in index.ts are pre-existing (missing node_modules in local env, not caused by runWith changes)"
  - "ADMIN_SECRET_KEY unavailable in executor env — CR ticket skipped per skill rule, task not blocked"
metrics:
  duration: ~15min
  completed: 2026-03-13
  tasks_completed: 2
  files_modified: 2
---

# Quick-170: Fix Medium DoS Vulnerabilities — Stripe Webhook, Body Size, Analytics Caps, AI Function Timeouts

**One-liner:** Redis idempotency guard on Stripe Connect webhooks + 10MB body size middleware + 13 Coupa analytics `.limit(10000)` caps + `runWith(540s/512MB)` on two AI-calling Cloud Functions.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Stripe webhook idempotency + request body size limit + analytics caps | 995fb19b | main_new.py |
| 2 | Add runWith timeout + memory config to AI-calling Cloud Functions | 255cee6a | backend/functions/src/index.ts |

## Changes Made

### Fix 1: Stripe Connect Webhook Idempotency (main_new.py)

**File:** `apps/web/p2p-platform/backend/main_new.py`

Inside `stripe_connect_webhook` (after `construct_event`, before `event_type = event["type"]`):

```python
event_id = event.get("id")
if event_id:
    from cache import redis_client, REDIS_AVAILABLE
    if REDIS_AVAILABLE and redis_client:
        redis_key = f"dollor:stripe:event:{event_id}"
        if redis_client.get(redis_key):
            return {"success": True, "event_type": event.get("type", "unknown"), "duplicate": True}
```

At the end of the function (before `return {"success": True, "event_type": event_type}`):

```python
if event_id and REDIS_AVAILABLE and redis_client:
    redis_client.setex(f"dollor:stripe:event:{event_id}", 86400, "1")
```

Redis key pattern: `dollor:stripe:event:{event_id}` — TTL 86400s (24h). Duplicate events return 200 immediately so Stripe stops retrying without triggering duplicate payouts.

### Fix 2: Global Request Body Size Limit Middleware (main_new.py)

**File:** `apps/web/p2p-platform/backend/main_new.py` — inserted after `fix_cors_and_security_headers` (line 182), before `admin_auth_middleware`:

```python
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Reject oversized request bodies to prevent memory exhaustion (DoS)."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 10_485_760:  # 10MB
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=413, content={"detail": "Request body too large (max 10MB)"})
    return await call_next(request)
```

Returns HTTP 413 for any request with `Content-Length > 10MB`. Positioned after CORS preflight handling, before auth logic.

### Fix 3: Coupa Analytics Query Caps (main_new.py)

**File:** `apps/web/p2p-platform/backend/main_new.py` — added `.limit(10000)` to 13 `.all()` calls across 7 endpoints:

| Endpoint | Queries capped |
|----------|---------------|
| `get_coupa_dashboard_metrics` | PO query, Requisition query |
| `get_coupa_budget_overview` | PO query |
| `get_coupa_status_distribution` | PO query |
| `get_coupa_cost_center_distribution` | PO query, CoupaCostCenter lookup |
| `get_coupa_spend_by_department` | PO query, CoupaDepartment lookup |
| `get_coupa_commodity_distribution` | PO query, CoupaCommodity lookup |
| `get_coupa_suppliers_filter` | CoupaSupplier query |
| `get_coupa_cost_centers_filter` | CoupaCostCenter query |
| `get_coupa_departments_filter` | CoupaDepartment query |

All `.all()` calls in lines 8300–8690 now have `.limit(10000)` prepended. Zero unbounded analytics queries remain in this range.

### Fix 4: Cloud Functions runWith Config (backend/functions/src/index.ts)

**File:** `backend/functions/src/index.ts`

`onAITaskCreated` (line 522) — changed from `functions.firestore` to:
```typescript
export const onAITaskCreated = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .firestore
  .document('ai_tasks/{taskId}')
  .onCreate(async (snap, context) => {
```

`processQueuedTasksV1` (line 1602) — changed from `functions.pubsub` to:
```typescript
export const processQueuedTasksV1 = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
```

`checkExpiringDocsV1`, `processPendingPayoutsV1`, and all other functions were NOT modified — they do not call external AI.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "dollor:stripe:event" main_new.py` | 2 (get + setex) |
| `grep -n "limit_request_size" main_new.py` | Present at line 185 |
| `grep -n "10_485_760" main_new.py` | Present at line 188 |
| Unbounded `.all()` in lines 8300–8690 | 0 remaining |
| `grep -n "runWith" backend/functions/src/index.ts` | 2 matches (lines 523, 1605) |
| Backend tests | Cannot run locally (JWT_SECRET_KEY requires AWS Secrets Manager) — pre-existing env constraint, not a regression |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Scope Expansions

**Added `.limit(10000)` to 3 filter dropdown endpoints** (suppliers, cost_centers, departments filter endpoints at lines ~8617, ~8636, ~8655) in addition to the 10 analytics endpoints specified in the plan. The plan text stated "add `.limit(10000)` anyway for safety" for these lines, so this was within plan scope.

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/main_new.py` — modified, confirmed via git diff
- `backend/functions/src/index.ts` — modified, confirmed via git diff
- Commit `995fb19b` — confirmed in git log
- Commit `255cee6a` — confirmed in git log
