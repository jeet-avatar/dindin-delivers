---
phase: quick-80
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ".planning/quick/80-rerun-39-check-stress-test-against-produ/FINAL_STRESS_TEST_REPORT_v2.md"
autonomous: true
requirements: [STRESS-RERUN-01]

must_haves:
  truths:
    - "All 39 checks from quick-72 are re-executed against production"
    - "Previous 1 FAIL (demo login 401) now returns PASS"
    - "Previous 4 WARNINGs now return PASS"
    - "Final verdict is GO with 0 FAIL and 0 WARNING"
  artifacts:
    - path: ".planning/quick/80-rerun-39-check-stress-test-against-produ/FINAL_STRESS_TEST_REPORT_v2.md"
      provides: "Complete 39-check stress test report v2 with all evidence"
      min_lines: 200
  key_links: []
---

<objective>
Re-run the exact same 39-check stress test from quick-72 against production (https://api.dollor.ai) to verify all fixes from quick-73 through quick-78 are deployed and working.

Purpose: Confirm the app is GO for App Store submission with 0 FAIL and 0 WARNING.
Output: FINAL_STRESS_TEST_REPORT_v2.md with all 39 checks showing PASS.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Execute all 39 checks against production and generate report</name>
  <files>.planning/quick/80-rerun-39-check-stress-test-against-produ/FINAL_STRESS_TEST_REPORT_v2.md</files>
  <action>
Run ALL 39 checks from the quick-72 FINAL_STRESS_TEST_REPORT.md against production (https://api.dollor.ai). Use curl for API checks, ASC API for App Store Connect checks. Record HTTP status, response body snippets, and PASS/FAIL for each.

**Authentication setup:**
1. Log in demo customer via `/api/customer/demo-login` with POST body `{"email": "demo.customer@dollor.ai", "secret_key": "DemoCustomer2025!"}` to get a valid JWT token (this is the correct demo login endpoint per quick-76 decision).
2. ALSO test standard OAuth2 login at `/api/auth/customer/login` with form data `username=demo.customer@dollor.ai&password=DemoCustomer2025!` — this MUST now return 200 (was the FAIL in quick-72, fixed in quick-73 demo rate limit + quick-76 password hash fixes).

**Area 1: Full Demo Account Flow (8 checks)**
- 1.1: `POST /api/auth/customer/login` with form data `username=demo.customer@dollor.ai&password=DemoCustomer2025!` — MUST return 200 + access_token (was FAIL, now fixed)
- 1.2: `GET /api/customer/profile` with Bearer token — expect 200 + id, email, is_active
- 1.3: `GET /api/vendors/published` with Bearer token — expect 200 + vendor list
- 1.4: `GET /api/vendors/40/menu` — expect 200 + menu items (if vendor 40 gone, use first vendor from 1.3)
- 1.5: `POST /api/rides/estimate` with Bearer + JSON `{"pickup_latitude": 40.7128, "pickup_longitude": -74.0060, "dropoff_latitude": 40.7580, "dropoff_longitude": -73.9855}` — expect 200 with subtotal, platform_fee, total, suggested_bids. Verify pricing is consistent (subtotal + platform_fee = total, or total = subtotal + platform_fee + surge adjustment). This was affected by quick-77/78 fare fixes.
- 1.6: `GET /api/customer/orders` with Bearer — expect 200 + array
- 1.7: `GET /api/customer/rides/history` with Bearer — expect 200 + rides array
- 1.8: `POST /api/erp/payments/intent` with Bearer + JSON `{"amount": 1500, "currency": "usd"}` — expect 200 + demo=true

**Area 2: App Store Connect Complete Check (12 checks)**
Use ASC API (`https://api.appstoreconnect.apple.com/v1/`) with JWT auth (key 9K626GB728, issuer 80d10e49-f379-462f-9668-5ea53016812e, key at ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8).
- 2.1: Version state = PREPARE_FOR_SUBMISSION (or WAITING_FOR_REVIEW if already submitted)
- 2.2: Build attached and processingState=VALID (build may now be 1110 or 1111 per quick-77; accept any valid build >= 1108)
- 2.3: Privacy URL reachable (HEAD https://www.dollor.ai/privacy returns 200)
- 2.4: Support URL — check `appStoreVersionLocalizations` (NOT appInfoLocalizations per quick-73 fix). Must be set to https://www.dollor.ai/support and reachable. Was WARNING in quick-72 (checked wrong ASC resource), fixed in quick-73.
- 2.5: Marketing URL (optional, null OK)
- 2.6: Description > 300 chars, mentions food delivery + rideshare
- 2.7: What's New (null OK for first submission)
- 2.8: Screenshots >= 3 for APP_IPHONE_65
- 2.9: App Review Info has correct demo creds
- 2.10: Copyright = "2026 Zietra Technologies inc"
- 2.11: Category = FOOD_AND_DRINK
- 2.12: Age rating appropriate

**Area 3: Production Stability (5 checks)**
- 3.1: `GET /health` — 200 + status=healthy
- 3.2: WebSocket `wss://api.dollor.ai/ws/customer_74?token={JWT}` — upgrade succeeds, receives connected message
- 3.3: `GET /api/customer/profile` with invalid Bearer — 401
- 3.4: `GET /api/customer/profile` with no auth — 401
- 3.5: `POST /api/auth/customer/login` with bad creds — 401

**Area 4: Apple Guidelines Risk Assessment (7 checks)**
- 4.1: Guideline 2.1 (App Completeness) — re-assess based on 1.1 result (was HIGH due to login fail, should be LOW now)
- 4.2: Guideline 2.3 (Accurate Metadata) — LOW
- 4.3: Guideline 3.1.1 (In-App Purchase) — LOW (physical goods exemption)
- 4.4: Guideline 4.0 (Minimum Functionality) — LOW
- 4.5: Guideline 5.1.1 (Data Collection) — LOW
- 4.6: Guideline 5.1.2 (Privacy Policy) — LOW
- 4.7: Guideline 3.1.1 IAP exception proof — LOW

**Area 5: Edge Cases (7 checks)**
- 5.1: `GET /api/vendors/published?search=zzzznonexistent` with Bearer — expect 200 with filtered results (0 or few vendors). Was WARNING (search ignored), fixed in quick-73.
- 5.2: `GET /api/vendors/999999/menu` — expect 404 or empty array (not 500)
- 5.3: `POST /api/rides/estimate` with coords (0,0) to (0,0) with Bearer — graceful response (not 500)
- 5.4: `POST /api/rides/estimate` with extreme coords (91/181/-91/-181) with Bearer — expect 400 or 422 rejection (was WARNING accepting impossible coords, fixed in quick-73 coordinate validation)
- 5.5: Ride history empty state — covered by 1.7
- 5.6: `GET /api/customer/orders/999999/track` with Bearer — expect 404
- 5.7: Double login — two sequential demo-logins, both tokens work for profile fetch

**Report generation:**
Create FINAL_STRESS_TEST_REPORT_v2.md with:
- Same structure as quick-72 report (executive summary, 5 areas with tables, summary, GO/NO-GO)
- For each check: test name, HTTP status, expected, actual result, PASS/FAIL
- Evidence traceability table at bottom
- Comparison with quick-72 results (was FAIL/WARNING -> now PASS)
- Highlight all 5 fixes verified: demo login, supportUrl, coord validation, vendor search, pricing consistency
- Final verdict: GO with confidence level
- Note: if ANY check fails, verdict is NO-GO with specific remediation

**IMPORTANT**: Do NOT invent responses. Run each curl command and record the ACTUAL response. If a check unexpectedly fails, mark it honestly as FAIL.
  </action>
  <verify>
- FINAL_STRESS_TEST_REPORT_v2.md exists and has 200+ lines
- Report shows 39 checks with individual PASS/FAIL verdicts
- Every curl command was actually executed (not fabricated)
- Final GO/NO-GO verdict is stated with confidence level
  </verify>
  <done>
All 39 checks executed against production with actual HTTP responses recorded. Report generated with GO verdict (0 FAIL, 0 WARNING) or honest NO-GO if any check fails.
  </done>
</task>

</tasks>

<verification>
- FINAL_STRESS_TEST_REPORT_v2.md exists at `.planning/quick/80-rerun-39-check-stress-test-against-produ/FINAL_STRESS_TEST_REPORT_v2.md`
- Report contains all 39 checks with evidence
- Report has comparison with quick-72 showing improvements
- Final verdict is clearly stated
</verification>

<success_criteria>
- 39/39 checks executed with real HTTP responses
- 0 FAIL, 0 WARNING = GO verdict
- Report documents all fixes verified (demo login, supportUrl, coord validation, vendor search, fare pricing)
- If any check fails, honest NO-GO with remediation steps
</success_criteria>

<output>
After completion, create `.planning/quick/80-rerun-39-check-stress-test-against-produ/80-SUMMARY.md`
</output>
