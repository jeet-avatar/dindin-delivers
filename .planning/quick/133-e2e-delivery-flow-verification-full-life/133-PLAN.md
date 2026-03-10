---
phase: quick-133
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/133-e2e-delivery-flow-verification-full-life/133-E2E-REPORT.md
  - .planning/quick/133-e2e-delivery-flow-verification-full-life/133-SUMMARY.md
autonomous: true
requirements: [VERIFY-CR0006]

must_haves:
  truths:
    - "All 4 CR-0006 bug fixes verified working on production"
    - "Full delivery lifecycle completes end-to-end without errors"
    - "Delivered endpoint returns 200 (not 500) with accounting records"
    - "Delivery photo upload endpoint returns 200 (not 404)"
    - "Driver sees customer address and navigation coordinates"
    - "CR ticket created with detailed step-by-step findings"
  artifacts:
    - path: ".planning/quick/133-e2e-delivery-flow-verification-full-life/133-E2E-REPORT.md"
      provides: "Step-by-step E2E verification results"
    - path: ".planning/quick/133-e2e-delivery-flow-verification-full-life/133-SUMMARY.md"
      provides: "Quick task summary"
  key_links:
    - from: "demo credentials"
      to: "https://api.dollor.ai"
      via: "login + JWT auth tokens"
      pattern: "Bearer token in Authorization header"
---

<objective>
E2E delivery flow verification on production (https://api.dollor.ai) to confirm all 4 CR-0006 bug fixes from Quick-132 are working correctly. Walk through the FULL order lifecycle from placement to delivery completion, testing each status transition and verifying the fixes.

Purpose: Verify CR-0006 fixes are live and working — delivered endpoint (was 500), photo upload (was 404), dropoff coordinates (were null), customer address (was empty).
Output: Detailed E2E test report with pass/fail for each step and each bug fix.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/132-fix-4-delivery-flow-bugs-delivered-500-p/132-SUMMARY.md
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket and execute full delivery lifecycle E2E test on production</name>
  <files>.planning/quick/133-e2e-delivery-flow-verification-full-life/133-E2E-REPORT.md</files>
  <action>
Create CR ticket (change_type: "docs", priority: "High", title: "E2E delivery flow verification for CR-0006 fixes") and submit it.

Then execute the full delivery lifecycle on production (https://api.dollor.ai) using curl commands. Each step MUST be documented with request/response details.

**Step 1 — Login all 3 demo accounts:**
- Customer: POST /api/customer/demo-login with {"email": "demo.customer@dollor.ai", "password": "DemoCustomer2025!"}
- Vendor: POST /api/auth/vendor/demo-login with {"email": "demo.restaurant@dollor.ai", "password": "DemoRestaurant2025!"}
- Driver: POST /api/auth/driver/demo-login with {"email": "demo.driver@dollor.ai", "password": "DemoDriver2025!"}
- Extract JWT tokens from each response

**Step 2 — Get vendor info and create order:**
- GET /api/vendors/published to find demo restaurant vendor_id
- POST /api/orders/create (or /erp/orders/create) with customer token:
  - Include `leave_at_door: true`
  - Include `delivery_instructions: "Ring doorbell, leave at front door"`
  - Include a delivery address with street, city, state, zip, latitude, longitude
  - Record the order_id from response

**Step 3 — Restaurant accepts order:**
- POST /erp/orders/{order_id}/restaurant-accept with vendor token
- Record response status

**Step 4 — Restaurant accepts delivery (self-delivery):**
- POST /erp/orders/{order_id}/restaurant-accept-delivery with vendor token
- Record response

**Step 5 — Update order status through lifecycle:**
- PUT /erp/orders/{order_id}/status?status=preparing (vendor token)
- PUT /erp/orders/{order_id}/status?status=ready_for_pickup (vendor token)
- POST /erp/orders/{order_id}/picked-up (driver token)
- At each step, check response for customer-visible data

**Step 6 — VERIFY BUG 3 & 4: Check driver active orders for address/coordinates:**
- GET /erp/orders/driver/{driver_id}/active (driver token)
- VERIFY: `dropoff_latitude` and `dropoff_longitude` are proper floats (not null, not 0.0)
- VERIFY: `customer_address` is a readable string (not empty, not ", ")
- VERIFY: `delivery_address` dict is present with structured fields

**Step 7 — VERIFY BUG 1: Mark order delivered:**
- POST /erp/orders/{order_id}/delivered (driver token)
- MUST return 200 (was returning 500 before CR-0006 fix)
- Check response body for order status = "delivered"
- Check that accounting/journal entries were created (response may include this info)

**Step 8 — VERIFY BUG 2: Upload delivery photo:**
- POST /erp/orders/{order_id}/delivery-photo (driver token) with JSON body containing photo_url or base64 data
- MUST return 200 (was returning 404 before CR-0006 fix)
- Record response

**Step 9 — Verify customer can see delivery:**
- GET /api/customer/{customer_id}/active-orders or similar customer order endpoint
- Check order shows as delivered with photo proof data

Write all findings to 133-E2E-REPORT.md with:
- Each step: endpoint, method, status code, key response fields
- Each CR-0006 bug: PASS/FAIL with evidence
- Overall verdict: ALL PASS or list failures
- Any unexpected findings

NOTE: If any step fails due to auth (401) or missing data, document it but try to continue testing remaining steps. Some steps may need to be adapted based on actual API responses (e.g., order create payload structure may vary). Use response data from each step to inform the next.

NOTE: The driver_id and customer_id needed for some endpoints should be extracted from the login response tokens or user profile endpoints.
  </action>
  <verify>
133-E2E-REPORT.md exists with all 9 steps documented. All 4 CR-0006 bugs have explicit PASS/FAIL verdict. CR ticket was created and ID recorded.
  </verify>
  <done>
Full delivery lifecycle executed on production. All 4 bug fixes verified: (1) /delivered returns 200, (2) /delivery-photo returns 200, (3) dropoff lat/lng are floats, (4) customer_address is readable. E2E report written with evidence.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write summary and update CR ticket with findings</name>
  <files>.planning/quick/133-e2e-delivery-flow-verification-full-life/133-SUMMARY.md</files>
  <action>
Write 133-SUMMARY.md following the standard summary template with:
- CR ticket ID and final status
- All 4 bug verification results (PASS/FAIL)
- Any unexpected findings or regressions discovered
- Metrics: duration, steps completed

Update the CR ticket description with the verification results summary. Transition CR to "Verified" status if all 4 bugs pass, or "In Progress" with notes if any fail.

If any bug FAILS: create a follow-up note in the summary describing what failed and what fix is needed. Do NOT attempt code fixes in this verification task — that would be a separate quick task.
  </action>
  <verify>
133-SUMMARY.md exists with standard frontmatter. CR ticket updated with findings.
  </verify>
  <done>
Summary written with verification verdicts for all 4 CR-0006 fixes. CR ticket closed or flagged with issues.
  </done>
</task>

</tasks>

<verification>
- 133-E2E-REPORT.md contains step-by-step curl results for full delivery lifecycle
- All 4 CR-0006 bugs have explicit PASS/FAIL with HTTP status code evidence
- CR ticket created and tracked through to completion
- No code changes made (verification only)
</verification>

<success_criteria>
All 4 CR-0006 bug fixes confirmed working on production with HTTP response evidence. Full delivery lifecycle (create -> accept -> prepare -> pickup -> deliver -> photo) completes without 500 errors. E2E report and summary committed.
</success_criteria>

<output>
After completion, create `.planning/quick/133-e2e-delivery-flow-verification-full-life/133-SUMMARY.md`
</output>
