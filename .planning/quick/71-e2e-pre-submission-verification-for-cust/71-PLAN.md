---
phase: quick-71
plan: 01
type: execute
wave: 1
depends_on: [quick-70]
files_modified:
  - .planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md
autonomous: true
requirements: [E2E-VERIFY-01, E2E-VERIFY-02, E2E-VERIFY-03, E2E-VERIFY-04, E2E-VERIFY-05]

must_haves:
  truths:
    - "Demo account login works on production with correct credentials and returns a valid JWT"
    - "App Store Connect metadata is complete: build 1108 attached, version in PREPARE_FOR_SUBMISSION, privacy/support URLs return 200, screenshots present, demo creds configured"
    - "Production backend /health and key customer endpoints respond successfully"
    - "iOS Release xcconfig points to api.dollor.ai with no staging URLs, Info.plist has all usage descriptions, entitlements are correct"
    - "SUBMISSION_READINESS_REPORT.md exists with a clear GO or NO-GO recommendation and all 5 verification areas covered"
  artifacts:
    - path: ".planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md"
      provides: "Final gate check report with GO/NO-GO recommendation"
      min_lines: 100
  key_links:
    - from: "Production API (api.dollor.ai)"
      to: "Demo account credentials"
      via: "POST /api/auth/customer/login"
      pattern: "200.*access_token"
    - from: "App Store Connect API"
      to: "Build 1108"
      via: "GET /v1/apps/6758230264/appStoreVersions"
      pattern: "PREPARE_FOR_SUBMISSION.*1108"
    - from: "Production.xcconfig"
      to: "api.dollor.ai"
      via: "API_BASE_URL setting"
      pattern: "API_BASE_URL.*api\\.dollor\\.ai"
---

<objective>
End-to-end pre-submission verification for the iOS Customer app (build 1108) before App Store submission. This is the FINAL gate check -- verifying all 5 areas (demo account, ASC metadata, production backend, iOS code-level config, previous rejection resolution) are clean after quick-70 fixed the 4 blockers.

Purpose: Confirm with evidence that every submission prerequisite is satisfied, producing a definitive GO/NO-GO recommendation. DO NOT submit the app.
Output: SUBMISSION_READINESS_REPORT.md with structured findings across all 5 verification areas.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md
@.planning/quick/70-fix-4-app-store-blockers-for-customer-ap/70-SUMMARY.md
@apps/ios/Config/Production.xcconfig
@apps/ios/customer/eatfaircustomer/Info.plist
@apps/ios/customer/eatfaircustomer/eatfaircustomer.entitlements
@apps/ios/customer/eatfaircustomer/eatfaircustomerDebug.entitlements
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run all 5 verification checks and collect evidence</name>
  <files>.planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md</files>
  <action>
Execute all 5 verification areas sequentially, capturing raw evidence for the report.

**Area 1 -- Demo Account E2E Test (Production API):**
1. Call `POST https://api.dollor.ai/api/demo/setup` -- note: requires `?secret_key=<ADMIN_SECRET_KEY>`. Retrieve admin secret from AWS Secrets Manager: `aws secretsmanager get-secret-value --secret-id dollor/production/admin --query SecretString --output text` and parse the ADMIN_SECRET_KEY field. Call setup endpoint to ensure demo accounts are fresh.
2. Call `POST https://api.dollor.ai/api/auth/customer/login` with form-encoded body `username=demo.customer@dollor.ai&password=DemoCustomer2025!`. Expect HTTP 200 with `access_token` in response JSON. Record the token.
3. Use the token to call `GET https://api.dollor.ai/api/customer/profile` with `Authorization: Bearer <token>`. Expect 200 with customer profile data.
4. Call `GET https://api.dollor.ai/api/restaurants/public` with the Bearer token. Expect 200 with restaurant list.
5. Call a fare estimate endpoint -- verify with `grep -rn "fare.estimate\|fare_estimate\|/api/rides/estimate" apps/web/p2p-platform/backend/*.py` first to find the exact path. Call it with the Bearer token and sample coordinates (lat/lng for San Francisco area). Expect 200 or valid response.

**Area 2 -- App Store Connect Metadata (via API):**
Generate a JWT for App Store Connect API using:
```python
import jwt, time
key = open("/Users/jeet/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8").read()
token = jwt.encode(
    {"iss": "80d10e49-f379-462f-9668-5ea53016812e", "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    key, algorithm="ES256", headers={"kid": "9K626GB728"}
)
```

Then verify each of these via the App Store Connect API (base: `https://api.appstoreconnect.apple.com`):
- GET `/v1/apps/6758230264/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&include=build,appStoreVersionLocalizations` -- confirm version state is `PREPARE_FOR_SUBMISSION`, build 1108 attached
- From the included `appStoreVersionLocalizations`: verify description is non-empty, check `keywords`, `promotionalText`
- GET `/v1/apps/6758230264/appInfos?include=appInfoLocalizations` -- verify privacy URL is `https://www.dollor.ai/privacy`, confirm category
- Curl `https://www.dollor.ai/privacy` -- expect HTTP 200
- Curl `https://www.dollor.ai/support` -- expect HTTP 200
- GET `/v1/appStoreVersions/{versionId}/appStoreVersionSubmission` or check version state for submission readiness
- Verify copyright = "2026 Zietra Technologies inc" from app info
- Verify age rating from the version response
- Check app review info for demo credentials: GET `/v1/appStoreVersions/{versionId}/appStoreReviewDetail` -- confirm `demoAccountName` and `demoAccountPassword` match `demo.customer@dollor.ai` / `DemoCustomer2025!`
- Check screenshots exist: GET `/v1/appStoreVersionLocalizations/{locId}/appScreenshotSets?include=appScreenshots` -- confirm at least iPhone 6.5" set has screenshots

**Area 3 -- Production Backend Health:**
- Call `GET https://api.dollor.ai/health` -- expect 200
- Call `GET https://api.dollor.ai/api/restaurants/public` -- expect 200 (confirms DB connectivity + core endpoint)
- Call `GET https://api.dollor.ai/api/promotions/featured` -- expect 200 (confirms another key customer endpoint)

**Area 4 -- iOS Code-Level Verification:**
- Read `apps/ios/Config/Production.xcconfig` and verify `API_BASE_URL = https://api.dollor.ai` (not staging)
- Grep customer app Swift source for `UIWebView` -- expect 0 matches
- Read `apps/ios/customer/eatfaircustomer/Info.plist` and verify all required usage descriptions present: NSLocationWhenInUseUsageDescription, NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSMicrophoneUsageDescription
- Grep customer app source for staging URLs (`d34u5ixl0bulv4`, `localhost`, `127.0.0.1`) -- expect 0 matches in non-test, non-Pods Swift files
- Read `apps/ios/customer/eatfaircustomer/eatfaircustomer.entitlements` and verify `aps-environment = production` and Apple Sign In entitlement present
- Verify `ITSAppUsesNonExemptEncryption = false` in Info.plist

**Area 5 -- Previous Rejection Resolution:**
- Confirm organization name from App Store Connect API copyright field = "2026 Zietra Technologies inc"
- Confirm version state is NOT `REJECTED` (should be `PREPARE_FOR_SUBMISSION` after quick-70 fixes)
- Cross-reference quick-70 SUMMARY to confirm all 4 blockers resolved

Record all results with PASS/FAIL/WARNING status and raw evidence (HTTP codes, response snippets).
  </action>
  <verify>
All 5 areas tested:
- Area 1: At least 4 curl/API calls with recorded HTTP status codes
- Area 2: At least 8 ASC metadata checks with evidence
- Area 3: At least 2 production health checks
- Area 4: At least 5 code-level checks via grep/file read
- Area 5: At least 2 rejection-resolution checks
  </verify>
  <done>All raw evidence collected. Every check has a definitive PASS, FAIL, or WARNING status with supporting data (HTTP codes, response bodies, file contents).</done>
</task>

<task type="auto">
  <name>Task 2: Generate SUBMISSION_READINESS_REPORT.md with GO/NO-GO recommendation</name>
  <files>.planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md</files>
  <action>
Using all evidence from Task 1, create the final report at `.planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md`.

The report MUST follow this structure:

```markdown
# Submission Readiness Report

## Customer App - Build 1108 (com.dollorai.customer)
## Date: 2026-03-04

---

### Executive Summary

- **Total checks:** {N}
- **PASS:** {N}
- **FAIL:** {N}
- **WARNING:** {N}
- **Recommendation:** {GO / NO-GO} -- {reason}

---

### 1. Demo Account E2E Test (Production API)

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1.1 | Demo setup endpoint | {status} | {HTTP code, response snippet} |
| 1.2 | Demo customer login | {status} | {HTTP code, token present?} |
| 1.3 | Customer profile fetch | {status} | {HTTP code, customer_id} |
| 1.4 | Browse restaurants | {status} | {HTTP code, count} |
| 1.5 | Fare estimate | {status} | {HTTP code, response} |

### 2. App Store Connect Metadata

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 2.1 | Version state | {status} | {actual state} |
| 2.2 | Build 1108 attached | {status} | {build number from API} |
| 2.3 | Privacy URL (www.dollor.ai/privacy) | {status} | {HTTP code} |
| 2.4 | Support URL (www.dollor.ai/support) | {status} | {HTTP code} |
| 2.5 | Description non-empty | {status} | {char count} |
| 2.6 | Screenshots (iPhone 6.5") | {status} | {count} |
| 2.7 | Screenshots (iPad Pro 12.9") | {status} | {count} |
| 2.8 | Age rating configured | {status} | {rating} |
| 2.9 | Copyright correct | {status} | {value} |
| 2.10 | Demo creds in review info | {status} | {match?} |
| 2.11 | Category set | {status} | {category} |
| 2.12 | Keywords present | {status} | {value} |

### 3. Production Backend Health

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 3.1 | /health endpoint | {status} | {HTTP code, response} |
| 3.2 | /api/restaurants/public | {status} | {HTTP code} |
| 3.3 | /api/promotions/featured | {status} | {HTTP code} |

### 4. iOS Code-Level Verification

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 4.1 | Production.xcconfig API_BASE_URL | {status} | {value} |
| 4.2 | No UIWebView | {status} | {grep count} |
| 4.3 | Info.plist usage descriptions | {status} | {list found} |
| 4.4 | No staging URLs in source | {status} | {grep count} |
| 4.5 | Push entitlement (production) | {status} | {value} |
| 4.6 | ITSAppUsesNonExemptEncryption | {status} | {value} |
| 4.7 | Apple Sign In entitlement | {status} | {present?} |

### 5. Previous Rejection Resolution

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 5.1 | Organization = Zietra Technologies inc | {status} | {copyright value} |
| 5.2 | Version NOT in REJECTED state | {status} | {actual state} |
| 5.3 | All 4 quick-70 blockers resolved | {status} | {cross-ref} |

---

### Remaining Warnings (Non-Blocking)

{List any WARNING items with brief description}

---

### Recommendation

**{GO / NO-GO}**

{If GO: "All critical checks pass. Build 1108 is ready for App Store review submission."}
{If NO-GO: List each FAIL item and required remediation steps.}

---

*Generated by E2E pre-submission verification on 2026-03-04*
*Reference: quick-69 (audit), quick-70 (blocker fixes)*
```

Decision rules for GO/NO-GO:
- Any FAIL in Areas 1-3 (demo, ASC metadata, backend health) = NO-GO
- Any FAIL in Area 4 (code-level) for release config or entitlements = NO-GO
- Any FAIL in Area 5 (rejection resolution) = NO-GO
- WARNINGs alone do NOT block GO -- list them as advisory

DO NOT include any submission step or recommendation to auto-submit. The report is the deliverable.
  </action>
  <verify>
1. File exists at `.planning/quick/71-e2e-pre-submission-verification-for-cust/SUBMISSION_READINESS_REPORT.md`
2. Report contains all 5 sections with check tables
3. Executive summary has total counts and GO/NO-GO recommendation
4. Every check row has Status (PASS/FAIL/WARNING) and Evidence column
5. Report has 100+ lines
  </verify>
  <done>SUBMISSION_READINESS_REPORT.md exists with definitive GO or NO-GO recommendation, all 5 verification areas have evidence-backed findings, and the report clearly states what (if anything) blocks submission.</done>
</task>

</tasks>

<verification>
1. All production API calls return expected HTTP codes (200 for health/demo/profile)
2. App Store Connect API confirms version state, build, metadata completeness
3. iOS source code has no staging leaks, all entitlements correct
4. Report file exists and is comprehensive (100+ lines, 5 sections, clear verdict)
</verification>

<success_criteria>
- SUBMISSION_READINESS_REPORT.md exists with GO or NO-GO verdict
- Every check in the report has raw evidence (not assumptions)
- Zero invented or hallucinated endpoint results -- only real curl/API output
- Report clearly identifies any remaining blockers (if NO-GO) or confirms clean slate (if GO)
</success_criteria>

<output>
After completion, create `.planning/quick/71-e2e-pre-submission-verification-for-cust/71-SUMMARY.md`
</output>
