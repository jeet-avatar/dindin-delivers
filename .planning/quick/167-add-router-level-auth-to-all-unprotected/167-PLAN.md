---
phase: quick-167
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - backend/functions/src/index.ts
autonomous: true
requirements: [QUICK-167]

must_haves:
  truths:
    - "GET /api/erp/rides/available returns 401 without a valid JWT"
    - "POST /api/erp/drivers/login and /register still return 200 without a JWT (intentionally public)"
    - "Firebase Cloud Functions fail fast with a clear error message when STRIPE_WEBHOOK_SECRET or SENDGRID_API_KEY is missing"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Auth guard on get_available_rides endpoint"
      contains: "require_any_auth"
    - path: "backend/functions/src/index.ts"
      provides: "Startup env var validation"
      contains: "STRIPE_WEBHOOK_SECRET"
  key_links:
    - from: "order_flow.py:get_available_rides"
      to: "auth_utils.require_any_auth"
      via: "_auth: dict = Depends(require_any_auth)"
      pattern: "_auth.*require_any_auth"
---

<objective>
Close two P0 security gaps: (1) the `/api/erp/rides/available` route in order_flow.py is unauthenticated, exposing all open ride requests to anonymous callers; (2) Firebase Cloud Functions silently operate with empty `STRIPE_WEBHOOK_SECRET` and `SENDGRID_API_KEY`, making webhook signature verification a no-op when the env var is absent.

Purpose: Harden P0 endpoints without breaking intentionally public auth endpoints (login/register/fare-estimate).
Output: Auth guard on rides/available; startup validation in index.ts.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/auth_utils.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Change Request ticket</name>
  <files>.planning/quick/167-add-router-level-auth-to-all-unprotected/CR.json</files>
  <action>
    Create a Change Request before any code changes per the ticketed-task skill.

    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Quick-167: Add auth to unprotected P0 endpoints",
        "description": "Add require_any_auth to GET /api/erp/rides/available in order_flow.py; add startup env var validation for STRIPE_WEBHOOK_SECRET and SENDGRID_API_KEY in Firebase Cloud Functions index.ts",
        "change_type": "code",
        "priority": "High",
        "requested_by": "support@dollor.ai"
      }'
    ```

    Then submit it:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
    ```

    Save the cr_id for use in commit messages. Write it to CR.json:
    `{"cr_id": "<cr_id>"}`.

    If ADMIN_SECRET_KEY is not available, log a warning and continue.
  </action>
  <verify>CR.json exists with a cr_id value, or a warning log shows the key was unavailable.</verify>
  <done>Change Request created and submitted (or warning logged if key unavailable).</done>
</task>

<task type="auto">
  <name>Task 2: Auth-guard rides/available in order_flow.py</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
    The `get_available_rides` endpoint at line ~842 of order_flow.py currently has no auth.
    The alias in main_new.py (line ~14877) already has `_auth: dict = Depends(require_any_auth)`, but
    the canonical route in the router does not.

    The fix: add `_auth: dict = Depends(require_any_auth)` to `get_available_rides`.

    Current signature:
    ```python
    @router.get("/rides/available")
    async def get_available_rides(
        driver_lat: Optional[float] = None,
        driver_lng: Optional[float] = None,
        db: Session = Depends(get_db)
    ):
    ```

    New signature:
    ```python
    @router.get("/rides/available")
    async def get_available_rides(
        driver_lat: Optional[float] = None,
        driver_lng: Optional[float] = None,
        db: Session = Depends(get_db),
        _auth: dict = Depends(require_any_auth),
    ):
    ```

    `require_any_auth` is already imported at line 21 of order_flow.py — no new import needed.

    Do NOT add router-level `dependencies=` to the include_router call in main_new.py. That would
    break the intentionally public endpoints (`/api/erp/drivers/login`, `/api/erp/drivers/register`,
    `/api/erp/rides/estimate`). Per-endpoint auth on the single unprotected route is the correct approach.

    Do NOT touch `/api/erp/rides/estimate` (intentionally public, in allowlist line 322 of main_new.py).
    Do NOT touch `/api/erp/drivers/login` or `/api/erp/drivers/register` (auth endpoints, must stay public).
  </action>
  <verify>
    ```bash
    grep -n "_auth.*require_any_auth\|require_any_auth.*_auth" apps/web/p2p-platform/backend/order_flow.py | grep -n "available\|get_available_rides"
    # Should show the auth dep in the function near @router.get("/rides/available")

    # Quick smoke test — unauthenticated call should return 401
    curl -s -o /dev/null -w "%{http_code}" -X GET "https://d34u5ixl0bulv4.cloudfront.net/api/erp/rides/available"
    # Expected: 401
    ```
  </verify>
  <done>GET /api/erp/rides/available returns 401 without a JWT. Login/register/estimate routes still return 200/422 unauthenticated.</done>
</task>

<task type="auto">
  <name>Task 3: Add startup env var validation in Firebase Cloud Functions</name>
  <files>backend/functions/src/index.ts</files>
  <action>
    Two env vars silently default to empty string, creating security gaps:
    - `SENDGRID_API_KEY` (line 42): `|| ''` — emails silently fail if not set
    - `STRIPE_WEBHOOK_SECRET` (line 2026): `|| ''` — webhook signature verification becomes a no-op
      because `stripe.webhooks.constructEvent` with an empty secret accepts any payload

    Add a startup validation block after the `config` object (after line ~50) that throws at cold start
    if critical secrets are missing. Use `console.error` + `throw` to fail fast.

    Add this block immediately after the `config` object definition (~line 50):

    ```typescript
    // =============================================================================
    // STARTUP ENV VAR VALIDATION
    // =============================================================================

    function validateEnvVars(): void {
      const required: Array<{ key: string; description: string }> = [
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe payment processing' },
        { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signature verification' },
        { key: 'SENDGRID_API_KEY', description: 'Transactional email (SendGrid)' },
      ];

      const missing = required.filter(({ key }) => !process.env[key]);

      if (missing.length > 0) {
        const details = missing.map(({ key, description }) => `  - ${key}: ${description}`).join('\n');
        const message = `Cloud Functions startup failed — missing required env vars:\n${details}`;
        console.error(message);
        throw new Error(message);
      }
    }

    // Validate at module load time (cold start) — fails fast before any function runs
    validateEnvVars();
    ```

    Also update the `stripeWebhook` handler (line ~2026) to throw if the secret is empty rather
    than silently proceeding:

    Find this line:
    ```typescript
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    ```

    Replace with:
    ```typescript
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
      res.status(500).send('Webhook secret not configured');
      return;
    }
    ```

    Note: `STRIPE_SECRET_KEY` already has a proper guard via `getStripe()` (lines 22-24) — no change needed there.
    Note: `TECHCLOUDRPO_API_KEY` uses `|| ''` intentionally (it has a default URL fallback) — leave it.
  </action>
  <verify>
    ```bash
    # Check validation block is present
    grep -n "validateEnvVars\|STRIPE_WEBHOOK_SECRET not configured\|missing required env vars" backend/functions/src/index.ts

    # TypeScript compile check
    cd backend/functions && npx tsc --noEmit 2>&1 | head -20
    ```
  </verify>
  <done>validateEnvVars() is present and called at module load; stripeWebhook handler rejects with 500 if STRIPE_WEBHOOK_SECRET is absent. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
After all tasks:

```bash
# 1. Verify rides/available is now protected
curl -s -o /dev/null -w "%{http_code}" "https://d34u5ixl0bulv4.cloudfront.net/api/erp/rides/available"
# Expected: 401

# 2. Verify public endpoints are unaffected
curl -s -o /dev/null -w "%{http_code}" -X POST "https://d34u5ixl0bulv4.cloudfront.net/api/erp/drivers/login" \
  -H "Content-Type: application/json" -d '{"email":"x","password":"y"}'
# Expected: 401 (wrong credentials) or 422 (validation) — NOT 200, but proves endpoint is reachable without auth

# 3. TypeScript validation
cd backend/functions && npx tsc --noEmit

# 4. Backend syntax check
cd apps/web/p2p-platform/backend && python -c "import order_flow; print('OK')"
```
</verification>

<success_criteria>
- `GET /api/erp/rides/available` returns 401 without Authorization header
- `POST /api/erp/drivers/login` and `/register` remain reachable without auth (still return 401/422 on bad creds, not auth 401)
- `validateEnvVars()` exists in index.ts and is called at module load
- `stripeWebhook` no longer silently accepts empty webhook secret
- TypeScript compiles without errors
- `python -c "import order_flow"` succeeds (no syntax errors)
</success_criteria>

<output>
After completion, create `.planning/quick/167-add-router-level-auth-to-all-unprotected/167-SUMMARY.md` with:
- What was changed and why
- The CR ID
- Verification results
- Commit hash
</output>
