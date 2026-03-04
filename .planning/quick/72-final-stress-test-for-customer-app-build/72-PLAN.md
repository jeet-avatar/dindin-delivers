---
phase: quick-72
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md
autonomous: true
requirements: [STRESS-01, STRESS-02, STRESS-03, STRESS-04, STRESS-05]

must_haves:
  truths:
    - "Every API endpoint an Apple reviewer would hit returns a valid response"
    - "App Store Connect metadata is complete with build 1108 attached"
    - "Production backend is stable (health, WebSocket, auth, Stripe)"
    - "Edge cases return graceful error responses, not 500s"
    - "No Apple Guideline violation risks identified in metadata or code"
  artifacts:
    - path: ".planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md"
      provides: "Comprehensive stress test results with pass/fail for all 5 areas"
      min_lines: 200
  key_links:
    - from: "Production API (api.dollor.ai)"
      to: "Demo customer account"
      via: "auth/customer/login -> Bearer token -> all customer endpoints"
      pattern: "POST /api/auth/customer/login.*200"
    - from: "App Store Connect API"
      to: "Build 1108 metadata"
      via: "JWT auth -> appStoreVersions -> build attachment"
      pattern: "PREPARE_FOR_SUBMISSION.*1108"
---

<objective>
Final pre-submission stress test for iOS Customer app build 1108. Simulate everything an Apple reviewer would encounter, test production stability under edge cases, verify App Store Connect completeness, and assess Apple Guidelines risk.

Purpose: Catch any remaining issues before submitting to App Store review. Quick-71 passed 30 checks -- this goes deeper into the full demo flow (menu, order history, rides), edge cases (empty states, invalid data), WebSocket connectivity, Stripe demo bypass, and Apple Guidelines risk assessment.

Output: FINAL_STRESS_TEST_REPORT.md with pass/fail for all 5 test areas.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Full Demo Flow + Production Stability + Edge Cases</name>
  <files>.planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md</files>
  <action>
Run the complete Apple reviewer simulation against production (https://api.dollor.ai). Use curl for all HTTP calls. Record every response status and key fields.

**1. DEMO ACCOUNT FULL FLOW (Apple reviewer simulation):**

1.1 Login: `POST /api/auth/customer/login` with form data `username=demo.customer@dollor.ai&password=DemoCustomer2025!`. Save the access_token as DEMO_TOKEN.

1.2 Profile: `GET /api/customer/profile` with `Authorization: Bearer $DEMO_TOKEN`. Verify response contains id, name, email, is_active=true.

1.3 Browse restaurants: `GET /api/vendors/published` with Bearer token. Record count and total. Extract first vendor ID.

1.4 Restaurant menu: `GET /api/vendors/{first_vendor_id}/menu` (no auth required per allowlist at main_new.py:371). Verify menu items returned with name, price, category. Record item count.

1.5 Fare estimate: `POST /api/rides/estimate` with Bearer token and JSON body:
```json
{"pickup_lat": 37.7749, "pickup_lng": -122.4194, "dropoff_lat": 37.7849, "dropoff_lng": -122.4094}
```
Verify fare_estimate, platform_fee, suggested_bids returned.

1.6 Order history: `GET /api/customer/orders` with Bearer token. Verify response (may be empty array for demo account -- that is OK, verify it does not 500).

1.7 Ride history: `GET /api/customer/rides/history` with Bearer token. Verify response (may be empty -- OK if graceful).

1.8 Payment intent (demo bypass): `POST /api/erp/payments/intent` with Bearer token and JSON body `{"amount": 1000, "currency": "usd"}`. Verify response includes `"demo": true` flag and simulated keys (clientSecret, publishableKey, ephemeralKey). This confirms Apple reviewer will not hit real Stripe.

**3. PRODUCTION STABILITY:**

3.1 Health check: `GET /health`. Verify status=healthy, database=connected.

3.2 WebSocket test: Use curl or python to attempt `wss://api.dollor.ai/ws/test_stress?token=$DEMO_TOKEN`. Note: WebSocket upgrade may not complete via curl -- test the HTTP upgrade handshake. If curl cannot do WS, use python websockets library or just verify the upgrade response headers. Record whether connection upgrades successfully or returns 101.

3.3 Auth with invalid token: `GET /api/customer/profile` with `Authorization: Bearer invalid_token_12345`. Must return 401 (not 500).

3.4 Auth with no token: `GET /api/customer/profile` with no Authorization header. Must return 401 (not 500).

3.5 Auth with wrong credentials: `POST /api/auth/customer/login` with `username=nonexistent@test.com&password=wrongpassword`. Must return 401 or similar (not 500).

**5. EDGE CASES:**

5.1 Empty vendor search (if applicable): `GET /api/vendors/published?search=zzzznonexistent`. If search param supported, verify empty array response. If not supported, note that.

5.2 Invalid vendor menu: `GET /api/vendors/999999/menu`. Verify 404 or empty array (not 500).

5.3 Invalid coordinates for fare estimate: `POST /api/rides/estimate` with Bearer token and body `{"pickup_lat": 0, "pickup_lng": 0, "dropoff_lat": 0, "dropoff_lng": 0}`. Verify graceful error or valid response (not 500).

5.4 Extreme coordinates: `POST /api/rides/estimate` with `{"pickup_lat": 91, "pickup_lng": 181, "dropoff_lat": -91, "dropoff_lng": -181}`. Verify does not 500.

5.5 Ride history empty state: Already covered in 1.7 above. Confirm graceful empty response.

5.6 Order with invalid ID: `GET /api/customer/orders/999999/track` with Bearer token. Verify 404 (not 500).

5.7 Double login (session safety): Login again with same demo creds. Verify new token works. Old token should still work too (JWT is stateless). Both `GET /api/customer/profile` calls with respective tokens return 200.

**Record all results in a structured table format with columns: #, Test Name, HTTP Status, Expected, Actual Result, PASS/FAIL.**

Start writing FINAL_STRESS_TEST_REPORT.md with Areas 1, 3, and 5 results.
  </action>
  <verify>
All curl commands executed against api.dollor.ai. FINAL_STRESS_TEST_REPORT.md exists with Areas 1, 3, and 5 populated. Zero 500 responses. Demo login returns 200. Edge cases return 4xx (not 5xx).
  </verify>
  <done>
Areas 1 (Demo Flow - 8 checks), 3 (Production Stability - 5 checks), and 5 (Edge Cases - 7 checks) = 20 checks completed with pass/fail status and evidence.
  </done>
</task>

<task type="auto">
  <name>Task 2: App Store Connect Check + Apple Guidelines Risk Assessment + Final Report</name>
  <files>.planning/quick/72-final-stress-test-for-customer-app-build/FINAL_STRESS_TEST_REPORT.md</files>
  <action>
Complete the stress test with App Store Connect deep verification and Apple Guidelines risk assessment. Append to the existing FINAL_STRESS_TEST_REPORT.md.

**2. APP STORE CONNECT COMPLETE CHECK (via API):**

Generate ASC JWT using:
```python
import jwt, time
key = open("/Users/jeet/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8").read()
token = jwt.encode({"iss": "80d10e49-f379-462f-9668-5ea53016812e", "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"}, key, algorithm="ES256", headers={"kid": "9K626GB728"})
```

App ID: 6758230264. Use curl with `Authorization: Bearer $ASC_TOKEN`.

2.1 Version state: `GET /v1/appStoreVersions?filter[app]=6758230264&filter[platform]=IOS`. Verify state = PREPARE_FOR_SUBMISSION. Record version string and ID.

2.2 Build attached: From version response, follow `relationships.build.links.related`. Verify build version = 1108, processingState = VALID.

2.3 Privacy URL: Extract `privacyPolicyUrl` from appStoreVersion. Verify it is `https://www.dollor.ai/privacy` (www prefix). Then `curl -sI` the URL and confirm HTTP 200.

2.4 Support URL: From app info, get supportUrl. Verify `https://www.dollor.ai/support`. Then `curl -sI` the URL and confirm HTTP 200.

2.5 Marketing URL: Check if marketingUrl is set. Note value (may be null -- that is OK, it is optional).

2.6 Description: Get appStoreVersionLocalizations for en-US. Verify description length > 300 chars. Verify it mentions food delivery AND rideshare.

2.7 What's New: Check `whatsNewText` field from localization. Verify non-empty (required for updates, may be null for first submission -- note which).

2.8 Screenshots: Get `appScreenshotSets` from localization. Count screenshots per display type. Verify at minimum APP_IPHONE_65 has >= 3 screenshots.

2.9 App Review Info: `GET /v1/appStoreVersions/{versionId}/appStoreReviewDetail`. Verify demoAccountName = demo.customer@dollor.ai, demoAccountPassword = DemoCustomer2025!, demoAccountRequired = true. Verify contactEmail present.

2.10 Copyright: From version, verify copyright = "2026 Zietra Technologies inc" (exact match).

2.11 Category: From app info, verify primaryCategory = FOOD_AND_DRINK.

2.12 Age rating: Verify age rating declaration present and appropriate (no mature content flags).

**4. APPLE GUIDELINES RISK ASSESSMENT:**

Do NOT call APIs for this. Assess based on knowledge from quick-71 report, codebase context, and ASC metadata already retrieved.

4.1 Guideline 2.1 (App Completeness): Demo account allows full flow (login, browse, estimate). Note if any feature requires real driver to be online (ride request would fail without drivers -- assess if this is a risk or if Apple understands marketplace apps).

4.2 Guideline 2.3 (Accurate Metadata): Cross-check description keywords against actual app features. Flag any claim in description not supported by the app.

4.3 Guideline 3.1.1 (In-App Purchase): The app uses Stripe for payments, NOT Apple IAP. Assess risk: food delivery/rideshare is a physical service (Apple exempts physical goods/services from IAP requirement per guideline 3.1.3(e)). Document this reasoning.

4.4 Guideline 4.0 (Design Minimum Functionality): App has food ordering, rideshare, order history, profile, support chat. Assess if this meets minimum functionality bar.

4.5 Guideline 5.1.1 (Data Collection): Check Info.plist permission descriptions (already verified in quick-71 4.3). Verify they match what the app actually collects. Flag any permission requested but not visibly used.

4.6 Guideline 5.1.2 (Privacy Policy): Privacy URL already verified in 2.3. Confirm it loads and contains relevant sections (data collection, sharing, retention).

4.7 Guideline 3.1.1 IAP exception proof: The App Store Review Notes field (check 2.9) should explain the app facilitates physical delivery/ride services. Verify the reviewNotes text mentions this exemption.

**FINAL REPORT ASSEMBLY:**

After all checks, append to FINAL_STRESS_TEST_REPORT.md:
- Executive Summary with total checks, pass/fail/warning counts
- Risk assessment summary (LOW/MEDIUM/HIGH per guideline)
- Final GO/NO-GO recommendation
- Comparison with quick-71 (what is new, what was re-verified deeper)
- Any actionable items discovered

Format: structured markdown with tables per area, evidence column showing actual response data.
  </action>
  <verify>
FINAL_STRESS_TEST_REPORT.md contains all 5 areas (1-5). Area 2 has 12 ASC checks with evidence from API responses. Area 4 has 7 guideline assessments. Executive summary present with total check count and recommendation.
  </verify>
  <done>
Complete FINAL_STRESS_TEST_REPORT.md with all 5 areas: Area 1 (8 demo flow checks), Area 2 (12 ASC checks), Area 3 (5 stability checks), Area 4 (7 guidelines assessments), Area 5 (7 edge cases) = 39 total checks. Executive summary with GO/NO-GO. No submission action taken.
  </done>
</task>

</tasks>

<verification>
- All 39 checks executed and recorded with pass/fail status
- Zero 500 responses from production API
- App Store Connect metadata verified via API (not assumed from quick-71)
- Edge cases all return graceful responses
- Apple Guidelines risk assessed with reasoning
- FINAL_STRESS_TEST_REPORT.md exists and is comprehensive
</verification>

<success_criteria>
- FINAL_STRESS_TEST_REPORT.md contains 39 checks across 5 areas
- Every check has: test name, expected result, actual result, HTTP status (where applicable), and PASS/FAIL/WARNING
- Executive summary with GO/NO-GO recommendation
- No new blockers discovered (or blockers clearly documented if found)
- Report explicitly states "DO NOT SUBMIT" -- this is verification only
</success_criteria>

<output>
After completion, create `.planning/quick/72-final-stress-test-for-customer-app-build/72-SUMMARY.md`
</output>
