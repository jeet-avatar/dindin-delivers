---
phase: quick-115
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/admin-smoke-test.sh
autonomous: true
requirements: [ADMIN-AUDIT-01]
must_haves:
  truths:
    - "Every admin sidebar route loads without errors on production"
    - "Every admin API endpoint returns 200 or valid data on production"
    - "Broken endpoints are identified with exact error codes"
    - "A reusable smoke test script exists for future admin audits"
  artifacts:
    - path: "scripts/admin-smoke-test.sh"
      provides: "Comprehensive admin endpoint smoke test"
      min_lines: 100
  key_links:
    - from: "scripts/admin-smoke-test.sh"
      to: "https://api.dollor.ai"
      via: "curl with admin JWT"
      pattern: "curl.*api.dollor.ai"
---

<objective>
Full admin portal UI audit -- verify every screen, every endpoint works on production.
Map all admin sidebar routes to their backend API endpoints, curl every endpoint on production
with a valid admin JWT, identify any broken screens or failed API calls, fix issues, and
produce a reusable smoke test script.

Purpose: Ensure the admin portal is fully functional after Phase 12 cleanup and recent
project tracker / change management additions.
Output: Audit report + reusable `scripts/admin-smoke-test.sh`
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/frontend/src/App.tsx
@apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
@apps/web/p2p-platform/frontend/src/app/api/api.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Audit all admin API endpoints on production</name>
  <files>scripts/admin-smoke-test.sh</files>
  <action>
1. First, obtain an admin JWT token by curling `POST https://api.dollor.ai/api/admin/login`
   with credentials `{"email": "support@dollor.ai", "password": "DollorAdmin2026!"}`.
   Extract the JWT token from the response.

2. Using that JWT, curl every admin API endpoint on production (`https://api.dollor.ai`).
   Record HTTP status code + first 200 chars of response for each. The complete endpoint map
   (derived from frontend source code -- VERIFIED via grep, not hallucinated):

   **Dashboard (Main.tsx uses `api` axios with baseURL `/api`):**
   - GET /api/dashboard/stats
   - GET /api/dashboard/recent-activity

   **Orders (orders/Main.tsx uses `getOrders` + `getOrderStats` from api.ts):**
   - GET /api/orders
   - GET /api/orders (stats derived client-side)

   **Vendor Management (vendorManagement/Main.tsx):**
   - GET /api/vendors
   - GET /api/vendors/{id}/publish-checklist (use any vendor_id from vendors list)
   - POST /api/admin/vendors/{id}/publish (skip -- mutating)

   **Document Review (vendorManagement/DocumentReview.tsx):**
   - GET /api/vendors (reused)
   - GET /api/admin/vendors/all-documents

   **Menu Review (vendorManagement/MenuReview.tsx):**
   - GET /api/vendors (reused)
   - GET /api/vendors/{id}/menu (use first vendor_id)

   **Rideshare (rideshare/*.tsx):**
   - GET /api/admin/rideshare/requests
   - GET /api/admin/rideshare/active

   **Drivers (drivers/DriversAdmin.tsx):**
   - GET /api/admin/drivers
   - NOTE: Fallback to GET /api/erp/drivers -- this endpoint DOES NOT EXIST on backend.
     Verify whether DriversAdmin handles the 404 gracefully.

   **Accounting - Platform Revenue (accounting/PlatformRevenue.tsx):**
   - GET /api/accounting/platform-revenue

   **Accounting - Vendor Payouts (accounting/VendorPayouts.tsx uses api.ts functions):**
   - GET /api/accounting/vendor-payouts

   **Accounting - Reports (accounting/Main.tsx):**
   - GET /api/admin/accounting/balance-sheet
   - GET /api/admin/accounting/income-statement
   - GET /api/admin/accounting/trial-balance
   - GET /api/admin/accounting/cash-flow
   - GET /api/admin/accounting/chart-of-accounts

   **Invoices (invoices/Invoices.tsx):**
   - GET /api/invoices
   - GET /api/invoices/stats

   **Clients (clients/Clients.tsx):**
   - GET /api/clients

   **Project Tracker (projectTracker/Main.tsx):**
   - GET /api/admin/project-cases/
   - GET /api/admin/project-cases/stats
   - GET /api/admin/departments/
   - GET /api/admin/departments/dashboard

   **Change Management (changeManagement/Main.tsx):**
   - GET /api/admin/change-requests/
   - GET /api/admin/departments (reused)

   **Coupa Dashboard (coupaDashboard/Main.tsx -- route exists, removed from sidebar):**
   - GET /api/dashboard/coupa

   **ZIP Dashboard (zipDashboard/Main.tsx -- sidebar: Partners > Onboarding):**
   - Verify it renders (it may use the same vendors data or have its own endpoints)

   **Activity/Notifications (MainLayout calls Bridge.notifications -> GET /api/activity):**
   - GET /api/activity -- NOTE: This endpoint DOES NOT EXIST. Verify error is silenced.

3. Create `scripts/admin-smoke-test.sh` that:
   - Accepts env arg (`staging` or `production`, default `production`)
   - Auto-logs in to get JWT
   - Curls all endpoints above with Bearer token
   - Prints PASS/FAIL table with HTTP status codes
   - Exits with code 1 if any critical endpoint fails (exclude known-missing like /api/activity, /api/erp/drivers)
   - Uses color output (green PASS, red FAIL, yellow WARN for known issues)

4. Run the script against production. Capture full output.

5. If any endpoints fail unexpectedly, document the failures clearly with:
   - Endpoint path
   - HTTP status code
   - Error message from response body
   - Which admin screen is affected
  </action>
  <verify>
Run `bash scripts/admin-smoke-test.sh production` and confirm it completes.
All critical endpoints should return 200. Known-missing endpoints (/api/activity, /api/erp/drivers)
should be marked as WARN, not FAIL.
  </verify>
  <done>
Smoke test script exists at `scripts/admin-smoke-test.sh`, runs successfully against production,
and produces a clear PASS/FAIL/WARN report for all admin API endpoints. Any broken endpoints
are documented with exact error details.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix any broken admin endpoints or frontend issues found in audit</name>
  <files>
apps/web/p2p-platform/frontend/src/app/screens/drivers/DriversAdmin.tsx
apps/web/p2p-platform/backend/main_new.py
  </files>
  <action>
Based on Task 1 audit results, fix any broken endpoints or frontend issues found.

Known potential issues to investigate and fix if confirmed:
1. **DriversAdmin /erp/drivers fallback**: Line 107 falls back to `api.get('/erp/drivers')` which
   does NOT exist on backend. If `/admin/drivers` works, this fallback should be removed or the
   catch should be silenced. Fix: Remove the `/erp/drivers` fallback or wrap in try/catch that
   doesn't show error to user.

2. **MainLayout /api/activity**: Bridge.notifications calls `/api/activity` which doesn't exist.
   This is already caught by `.catch()` in MainLayout:51-53, so it's silent. No fix needed unless
   console errors are appearing.

3. **Any other failures** found in Task 1: Fix the root cause -- whether it's a backend 500,
   a missing auth header, or a frontend typo in the API path.

For each fix:
- Verify the endpoint exists on backend with `grep -n` before making changes
- Test the fix by re-running the relevant curl command
- Do NOT introduce new endpoints -- only fix broken connections

If NO fixes are needed (all endpoints pass), skip this task and document "All endpoints healthy"
in the summary.
  </action>
  <verify>
Re-run `bash scripts/admin-smoke-test.sh production` after fixes. All critical endpoints
should return 200. No new regressions introduced.
  </verify>
  <done>
All admin API endpoints return valid responses. Any broken screens are fixed and verified.
The smoke test script shows all PASS (with only known WARNs for intentionally missing endpoints).
  </done>
</task>

</tasks>

<verification>
- `bash scripts/admin-smoke-test.sh production` exits with code 0
- All admin sidebar screens have working backend endpoints
- No 500 errors on any admin API endpoint
- Smoke test script is reusable for future audits
</verification>

<success_criteria>
- Complete audit report of all admin API endpoints with status codes
- Reusable smoke test script at `scripts/admin-smoke-test.sh`
- All critical admin endpoints return 200 on production
- Any broken screens fixed and verified
</success_criteria>

<output>
After completion, create `.planning/quick/115-full-admin-portal-ui-audit-verify-every-/115-SUMMARY.md`
</output>
