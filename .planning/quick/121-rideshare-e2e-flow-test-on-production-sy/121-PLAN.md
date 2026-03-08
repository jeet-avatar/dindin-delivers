---
phase: quick-121
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/rideshare_e2e_test.py
autonomous: true
requirements: [QT-121]

must_haves:
  truths:
    - "Rideshare E2E test runs against production and reports PASS/FAIL per step"
    - "New quick tasks (114-122) are synced to project tracker on production"
    - "Departments are seeded on production with assignment rules applied"
  artifacts:
    - path: "apps/web/p2p-platform/backend/rideshare_e2e_test.py"
      provides: "Production rideshare E2E test with correct endpoints"
  key_links:
    - from: "rideshare_e2e_test.py"
      to: "api.dollor.ai"
      via: "HTTP requests to production API"
      pattern: "api.dollor.ai"
---

<objective>
Run the full rideshare E2E flow test against production (login, fare estimate, ride request,
bidding, negotiation, chat, tracking, rating), then sync new quick tasks (114+) to the
project tracker and seed departments on production.

Purpose: Verify the complete rideshare flow works on production after all recent deploys,
and keep the project tracker up to date with recent quick tasks and department assignments.

Output: E2E test results, updated project tracker with new quick tasks and departments seeded.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@apps/web/p2p-platform/backend/rideshare_e2e_test.py
@apps/web/p2p-platform/backend/scripts/seed_departments.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix rideshare E2E test endpoints and run against production</name>
  <files>apps/web/p2p-platform/backend/rideshare_e2e_test.py</files>
  <action>
The existing rideshare_e2e_test.py has a WRONG endpoint for ride creation:
- WRONG: `POST /api/erp/rides/request` (removed in Quick-54 dead endpoint cleanup)
- CORRECT: `POST /api/rides/request` (bid_routes.py:330, prefix="/api/rides")

Fix the `create_ride_request()` method to use `/api/rides/request` instead of
`/api/erp/rides/request`. The fare estimate endpoint `/api/erp/rides/estimate-fare`
is still correct (main_new.py:3725).

Also verify these endpoints are correct by grepping bid_routes.py and main_new.py:
- `/api/rides/available` (main_new.py:14488 as /api/erp/rides/available — check which is active)
- `/api/rides/request/{id}/bid` (bid_routes.py:1079)
- `/api/rides/request/{id}/bids` — grep to confirm
- `/api/rides/bid/{id}/respond` — grep to confirm
- `/api/rides/bid/{id}/accept-counter` — grep to confirm
- `/api/p2p/ride-requests/{id}/chat` — grep to confirm
- `/api/rides/{id}/track` — grep to confirm
- `/api/rides/{id}/rate` — check if this is `/api/erp/rides/{id}/rate` (main_new.py:4067)

For EACH endpoint used in the test, run: `grep -n "the/path" apps/web/p2p-platform/backend/*.py`
to confirm it exists. Fix any wrong paths.

After fixing, run: `cd apps/web/p2p-platform/backend && python rideshare_e2e_test.py`

Record all PASS/FAIL results. If auth steps fail (demo accounts not working), run the
`quick` mode: `python rideshare_e2e_test.py quick`

Expected: Auth (2 steps), Fare Estimate, Ride Request should PASS. Later steps (bidding,
negotiation) may FAIL if there's no matching ride — that's expected for a stateful flow
on production. Document which steps pass and which fail with reasons.
  </action>
  <verify>python rideshare_e2e_test.py runs to completion and prints summary with PASS/FAIL counts</verify>
  <done>Rideshare E2E test completed against production with documented results. All endpoint paths verified against backend code.</done>
</task>

<task type="auto">
  <name>Task 2: Sync new quick tasks to project tracker and seed departments on production</name>
  <files></files>
  <action>
Two sub-tasks, both run against production (https://api.dollor.ai):

A) Sync new quick tasks (114-122) to the project tracker:
   - The sync script was built in Quick-120: `scripts/sync-quick-tasks-to-tracker.py`
   - Run it against production: `python scripts/sync-quick-tasks-to-tracker.py --env production`
   - If the script parses STATE.md, it should pick up tasks 114-122 automatically
   - If it needs manual invocation of the endpoint, use curl:
     ```
     curl -X POST https://api.dollor.ai/api/admin/project-cases/seed-quick-tasks \
       -H "Authorization: Bearer $ADMIN_TOKEN" \
       -H "Content-Type: application/json" \
       -d '[{"quick_num": 114, "description": "Remove placeholder AI/voice features from iOS Customer app", ...}]'
     ```
   - Verify: search for QT-114 through QT-122 in the project tracker

B) Seed departments on production:
   - The seed script exists: `apps/web/p2p-platform/backend/scripts/seed_departments.py`
   - It needs DATABASE_URL to run directly against the DB, which we cannot do from local
   - Instead, check if there's an admin API endpoint for department seeding
   - If not, check if departments already exist on production by curling:
     `curl https://api.dollor.ai/api/admin/departments -H "Authorization: Bearer $ADMIN_TOKEN"`
   - If departments are already seeded (from Quick-113 deploy), just verify and report
   - If departments are NOT seeded, note this as a finding — the seed script needs to be
     run via a one-off ECS task or added as an admin endpoint

For admin auth, use: POST /api/admin/login with support@dollor.ai / AdminTest123
(or use ADMIN_SECRET_KEY header if available).

Document what was synced and what already existed.
  </action>
  <verify>curl https://api.dollor.ai/api/admin/project-cases/?search=QT-114 returns results; departments endpoint returns seeded departments</verify>
  <done>New quick tasks (114+) visible in production project tracker. Department status documented (seeded or already present).</done>
</task>

</tasks>

<verification>
- Rideshare E2E test ran against production with documented PASS/FAIL per step
- All endpoint paths in rideshare_e2e_test.py verified against actual backend routes
- Quick tasks 114-122 exist in production project tracker
- Department seeding status verified on production
</verification>

<success_criteria>
- rideshare_e2e_test.py uses correct endpoints (no dead /api/erp/rides/request path)
- E2E test auth steps (customer + driver login) PASS on production
- Fare estimate step PASS on production
- New quick tasks synced to project tracker
- Department status documented
</success_criteria>

<output>
After completion, create `.planning/quick/121-rideshare-e2e-flow-test-on-production-sy/121-SUMMARY.md`
</output>
