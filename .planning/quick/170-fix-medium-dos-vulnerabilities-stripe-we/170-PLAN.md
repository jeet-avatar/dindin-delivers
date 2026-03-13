---
phase: quick-170
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - backend/functions/src/index.ts
autonomous: true
requirements: [DOS-MEDIUM-01, DOS-MEDIUM-02, DOS-MEDIUM-03, DOS-MEDIUM-04]

must_haves:
  truths:
    - "Duplicate Stripe Connect webhook events are silently acknowledged and not reprocessed"
    - "Analytics .all() queries in Coupa dashboard endpoints are capped at 10000 rows"
    - "FastAPI rejects request bodies over 10MB with HTTP 413 before auth runs"
    - "Cloud Functions that call external Ollama AI have 540s timeout and 512MB memory"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Stripe webhook idempotency + request body limit middleware + analytics limits"
    - path: "backend/functions/src/index.ts"
      provides: "runWith timeout+memory config on AI-calling functions"
  key_links:
    - from: "stripe_connect_webhook"
      to: "redis_client"
      via: "dollor:stripe:event:{event_id} key check before processing"
      pattern: "redis.*stripe.*event"
    - from: "limit_request_size middleware"
      to: "main_new.py middleware stack"
      via: "registered after CORS, before require_auth_middleware"
      pattern: "limit_request_size"
---

<objective>
Fix four medium-severity DoS vulnerabilities in the backend and Cloud Functions.

Purpose: Prevent duplicate payouts from Stripe retries, OOM from unbounded analytics queries, memory exhaustion from oversized request bodies, and Cloud Function timeouts on AI calls.
Output: main_new.py with idempotency guard + body size limit + analytics caps; index.ts with runWith configs.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/main_new.py
@backend/functions/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stripe webhook idempotency + request body size limit in main_new.py</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
**Fix 1: Stripe Connect webhook idempotency (main_new.py:4888)**

Inside `stripe_connect_webhook` (after the `event = stripe.Webhook.construct_event(...)` block, before `event_type = event["type"]`), add Redis idempotency check:

```python
# Idempotency: prevent duplicate processing on Stripe retries
event_id = event.get("id")
if event_id:
    from cache import redis_client, REDIS_AVAILABLE
    if REDIS_AVAILABLE and redis_client:
        redis_key = f"dollor:stripe:event:{event_id}"
        if redis_client.get(redis_key):
            # Already processed — return 200 immediately (Stripe needs 2xx to stop retrying)
            return {"success": True, "event_type": event.get("type", "unknown"), "duplicate": True}
```

Then at the end of the function, BEFORE `return {"success": True, ...}` (currently line 4965), set the Redis key with 24h TTL:

```python
if event_id and REDIS_AVAILABLE and redis_client:
    redis_client.setex(f"dollor:stripe:event:{event_id}", 86400, "1")
```

Note: `redis_client` and `REDIS_AVAILABLE` imports are already used at line 2664 in the same file — use the same pattern. Import them inside the function body (consistent with existing style).

**Fix 2: Global request body size limit middleware (main_new.py)**

Add a new `@app.middleware("http")` function BETWEEN the `fix_cors_and_security_headers` middleware (line 161) and the `admin_auth_middleware` (line 203). Insert after line 182 (end of fix_cors_and_security_headers), before line 184:

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

FastAPI middleware runs in reverse-registration order (last registered runs first). Since `add_middleware(CORSMiddleware)` runs outermost, and `@app.middleware` decorators run in declaration order (top = outermost), placing this after CORS/security-headers but before admin/auth ensures CORS preflight passes through, then size check happens before any auth logic.

**Fix 3: Add .limit(10000) to unbounded analytics .all() queries**

In the Coupa dashboard analytics endpoints, the following `.all()` calls are unbounded. Add `.limit(10000)` before each `.all()`:

- Line 8314: `).all()` in `get_coupa_dashboard_metrics` (PO query) → `).limit(10000).all()`
- Line 8319: `).all()` in `get_coupa_dashboard_metrics` (Requisition query) → `).limit(10000).all()`
- Line 8363: `).all()` in `get_coupa_budget_overview` → `).limit(10000).all()`
- Line 8408: `).all()` in `get_coupa_status_distribution` → `).limit(10000).all()`
- Line 8451: `).all()` in `get_coupa_cost_center_distribution` (PO query) → `).limit(10000).all()`
- Line 8454: `db.query(CoupaCostCenter).all()` → `db.query(CoupaCostCenter).limit(10000).all()`
- Line 8499: `).all()` in `get_coupa_department_distribution` (PO query) → `).limit(10000).all()`
- Line 8502: `db.query(CoupaDepartment).all()` → `db.query(CoupaDepartment).limit(10000).all()`
- Line 8548: `).all()` in `get_coupa_commodity_distribution` (PO query) → `).limit(10000).all()`
- Line 8551: `db.query(CoupaCommodity).all()` → `db.query(CoupaCommodity).limit(10000).all()`

Skip lines 8617, 8636, 8655 (already have `.order_by()` + likely small reference tables, but add `.limit(10000)` anyway for safety).

Do NOT add limits to:
- Lines that already have `.limit(...)` (e.g., 8210, 8217, 8222)
- Aggregate count queries (they use `.count()` not `.all()`)
- Driver dashboard earnings helper at 7102 (scoped to single driver_id + date range, bounded by design)
  </action>
  <verify>
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
grep -n "dollor:stripe:event" main_new.py
grep -n "limit_request_size" main_new.py
grep -n "10_485_760" main_new.py
# Count unbounded .all() in Coupa analytics range (should be 0 remaining)
awk 'NR>=8300 && NR<=8660 && /\.all\(\)/ && !/\.limit\(/' main_new.py
```
All four greps should return matches; the awk should return no output.
  </verify>
  <done>
- `stripe_connect_webhook` checks Redis key `dollor:stripe:event:{event_id}` before processing; sets key with 86400s TTL after processing
- `limit_request_size` middleware registered in main_new.py; returns 413 for Content-Length > 10MB
- All Coupa analytics `.all()` calls in lines 8300-8660 have `.limit(10000)` prepended
  </done>
</task>

<task type="auto">
  <name>Task 2: Add runWith timeout + memory config to AI-calling Cloud Functions</name>
  <files>backend/functions/src/index.ts</files>
  <action>
The functions that call `callOllamaAI()` (external HTTP to `vibingticket.com`) are:
- `onAITaskCreated` (line 522) — Firestore onCreate trigger; calls processOrderTask, handleSupportTask, verifyDocumentTask which all call callOllamaAI
- `processQueuedTasksV1` (line 1602) — pubsub scheduler; dispatches to AI task processing
- `checkExpiringDocsV1` (line 1646) — pubsub; does NOT call callOllamaAI (just Firestore reads + push), skip
- `processPendingPayoutsV1` (line 1683) — pubsub; does NOT call callOllamaAI (just Firestore + Stripe), skip

Apply `runWith({ timeoutSeconds: 540, memory: "512MB" })` only to functions that call external AI:

**onAITaskCreated** — change from:
```typescript
export const onAITaskCreated = functions.firestore
  .document('ai_tasks/{taskId}')
  .onCreate(async (snap, context) => {
```
to:
```typescript
export const onAITaskCreated = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .firestore
  .document('ai_tasks/{taskId}')
  .onCreate(async (snap, context) => {
```

**processQueuedTasksV1** — change from:
```typescript
export const processQueuedTasksV1 = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
```
to:
```typescript
export const processQueuedTasksV1 = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
```

Do NOT modify: `checkExpiringDocsV1`, `processPendingPayoutsV1`, `processEmailQueueV1`, `retryDriverAssignmentsV1`, `onOrderCreated`, `onDriverLocationUpdated`, `onOrderNeedsDriver`, or any Stripe/HTTPS callable functions — those do not make external LLM calls.
  </action>
  <verify>
```bash
cd /Users/jeet/doordash-p2p/backend/functions
grep -n "runWith" src/index.ts
# Should show exactly 2 runWith lines (onAITaskCreated + processQueuedTasksV1)
# TypeScript compile check:
npx tsc --noEmit 2>&1 | head -20
```
  </verify>
  <done>
- `onAITaskCreated` and `processQueuedTasksV1` have `runWith({ timeoutSeconds: 540, memory: "512MB" })` chained before `.firestore` / `.pubsub`
- TypeScript compiles without errors
- No other functions modified
  </done>
</task>

</tasks>

<verification>
```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend

# 1. Stripe idempotency guard present
grep -c "dollor:stripe:event" main_new.py
# Expected: 2 (one for get check, one for setex)

# 2. Body size limit middleware
grep -A5 "limit_request_size" main_new.py | head -10

# 3. No unbounded .all() in analytics range
awk 'NR>=8300 && NR<=8660 && /\.all\(\)/ && !/\.limit\(/' main_new.py
# Expected: empty output

# 4. Cloud Functions runWith
grep -n "runWith" /Users/jeet/doordash-p2p/backend/functions/src/index.ts
# Expected: 2 matches

# 5. Backend tests still pass
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
python -m pytest tests/ -x -q --tb=short 2>&1 | tail -5
```
</verification>

<success_criteria>
- Duplicate Stripe Connect webhook events return 200 immediately without reprocessing
- POST requests with Content-Length > 10MB receive HTTP 413
- All Coupa analytics endpoints cap DB reads at 10,000 rows
- onAITaskCreated and processQueuedTasksV1 have 540s/512MB resource config
- Backend test suite passes (no regressions)
</success_criteria>

<output>
After completion, create `.planning/quick/170-fix-medium-dos-vulnerabilities-stripe-we/170-SUMMARY.md` with what was changed, file:line references for each fix, and test results.
</output>
