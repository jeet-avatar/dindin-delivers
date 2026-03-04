---
phase: quick-70
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [APPSTORE-BLOCKERS]

must_haves:
  truths:
    - "Demo customer login returns 200 with JWT token on production"
    - "Privacy policy URL https://www.dollor.ai/privacy returns 200 in App Store Connect metadata"
    - "Support URL https://www.dollor.ai/support is set in App Store Connect metadata"
    - "Build 1108 is attached to the App Store version (not build 1037)"
    - "App Store version state allows editing/resubmission (no longer stuck in REJECTED with stale data)"
  artifacts: []
  key_links:
    - from: "App Store Connect version 30ad500d"
      to: "Build cf874071-d373-485d-b0db-ee1cce792a13"
      via: "PATCH appStoreVersions relationships/build"
      pattern: "build 1108 attached"
    - from: "Production /api/demo/setup"
      to: "Production /api/auth/customer/login"
      via: "Demo account created -> login succeeds"
      pattern: "200.*token"
---

<objective>
Fix all 4 App Store submission blockers for the iOS Customer app (build 1108) and verify all fixes with a rerun audit.

Purpose: Unblock App Store submission by resolving: (1) demo account 401 on production, (2) privacy policy URL SSL failure, (3) wrong build attached, (4) version in REJECTED state. DO NOT submit for review.
Output: All 4 blockers resolved and verified. Audit rerun confirms PASS on all previously-failing checks.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/69-pre-submission-app-store-rejection-audit/APP_STORE_AUDIT_REPORT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix all 4 App Store blockers</name>
  <files></files>
  <action>
Fix all 4 blockers in sequence. No code files are modified -- all fixes are API calls to production backend and App Store Connect.

**App Store Connect API auth pattern (use for all ASC calls):**
```python
import jwt, time
key = open("/Users/jeet/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8").read()
token = jwt.encode(
    {"iss": "80d10e49-f379-462f-9668-5ea53016812e", "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    key, algorithm="ES256", headers={"kid": "9K626GB728"}
)
```
API base: `https://api.appstoreconnect.apple.com/v1/`

**Blocker 1 -- Demo account 401 on production:**
1. Get the ADMIN_SECRET_KEY from AWS Secrets Manager: `aws secretsmanager get-secret-value --secret-id dollor/production/admin-yCDIFY --query SecretString --output text` (parse JSON for ADMIN_SECRET_KEY).
2. Call `POST https://api.dollor.ai/api/demo/setup?secret_key=<ADMIN_SECRET_KEY>` to create/reset demo accounts.
3. Verify: `POST https://api.dollor.ai/api/auth/customer/login` with form data `username=demo.customer@dollor.ai&password=DemoCustomer2025!` (it uses OAuth2PasswordRequestForm, so send as form-encoded, NOT JSON). Must return 200 with access_token.

**Blocker 2 -- Privacy policy URL SSL failure:**
1. First verify `https://www.dollor.ai/privacy` returns 200 (curl it).
2. Also verify `https://www.dollor.ai/support` returns 200.
3. Get the app info localizations: `GET /v1/apps/6758230264/appInfos` then follow the `appInfoLocalizations` relationship link to get the localization ID.
4. PATCH the localization to update `privacyPolicyUrl` to `https://www.dollor.ai/privacy` and `supportUrl` to `https://www.dollor.ai/support`.

**Blocker 3 -- Wrong build attached (1037 instead of 1108):**
1. Build 1108 ID is `cf874071-d373-485d-b0db-ee1cce792a13` (from audit report).
2. Version ID is `30ad500d-cdf6-47fb-98e2-314fe6fd68dc` (from audit report).
3. PATCH the version's build relationship: `PATCH /v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc/relationships/build` with body `{"data": {"type": "builds", "id": "cf874071-d373-485d-b0db-ee1cce792a13"}}`.
4. Verify by GET the version and checking the build relationship returns build 1108.

**Blocker 4 -- Version in REJECTED state:**
The REJECTED version can be edited directly (Apple allows editing rejected versions). Attaching the new build (Blocker 3) and updating metadata (Blocker 2) already constitute the required edits. After those changes, verify the version state has changed from REJECTED to an editable state (e.g., PREPARE_FOR_SUBMISSION, READY_FOR_REVIEW, or DEVELOPER_REJECTED). If the state is still REJECTED after the build/metadata changes, check if we need to explicitly reset it -- GET the version and inspect `appStoreState`. If it shows DEVELOPER_ACTION_NEEDED or similar, the edits should have already moved it forward.

Note: DO NOT call any submit-for-review endpoint. Only fix blockers and leave the version in an editable state ready for future submission.
  </action>
  <verify>
- Demo login: `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/auth/customer/login -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!"` returns 200
- Privacy URL: `curl -s -o /dev/null -w "%{http_code}" https://www.dollor.ai/privacy` returns 200
- ASC version GET shows build 1108 attached and version state is no longer REJECTED
  </verify>
  <done>All 4 blockers resolved: demo login returns 200 with token, privacy/support URLs updated to www prefix, build 1108 attached to version, version state is editable.</done>
</task>

<task type="auto">
  <name>Task 2: Rerun audit to verify all blockers resolved</name>
  <files></files>
  <action>
Rerun the same checks from the original audit report (checks 1.4, 7.5, 8.4, 9.2) to confirm all 4 blockers now pass.

**Check 1.4 -- Demo credentials work:**
1. `POST https://api.dollor.ai/api/auth/customer/login` with form data `username=demo.customer@dollor.ai&password=DemoCustomer2025!`.
2. Must return HTTP 200 with JSON containing `access_token`.
3. Print token prefix to confirm (first 20 chars).

**Check 7.5 -- Privacy policy URL:**
1. Use ASC API to GET the app info localization and read `privacyPolicyUrl`.
2. Must be `https://www.dollor.ai/privacy`.
3. Curl the URL to confirm HTTP 200.

**Check 7.6 -- Support URL (bonus fix):**
1. Read `supportUrl` from same localization.
2. Must be `https://www.dollor.ai/support`.
3. Curl to confirm HTTP 200.

**Check 8.4 -- Build attached to version:**
1. GET `/v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc` with `include=build`.
2. Verify the included build has `version` = "1108".

**Check 9.2 -- Version state:**
1. From same GET response, read `attributes.appStoreState`.
2. Must NOT be `REJECTED`. Expected: `PREPARE_FOR_SUBMISSION` or `READY_FOR_REVIEW`.

Print a summary table:
```
| Check | Status | Details |
|-------|--------|---------|
| 1.4 Demo login | PASS/FAIL | ... |
| 7.5 Privacy URL | PASS/FAIL | ... |
| 7.6 Support URL | PASS/FAIL | ... |
| 8.4 Build 1108 | PASS/FAIL | ... |
| 9.2 Version state | PASS/FAIL | ... |
```

If any check fails, report the failure details clearly so it can be addressed manually.
  </action>
  <verify>All 5 checks (1.4, 7.5, 7.6, 8.4, 9.2) show PASS in the summary table.</verify>
  <done>Audit rerun confirms all 4 original blockers are resolved. Summary table shows PASS for all checks. App is ready for manual submission (not auto-submitted).</done>
</task>

</tasks>

<verification>
- Demo customer login on production returns 200 + access_token
- Privacy policy URL in ASC metadata is `https://www.dollor.ai/privacy` and returns HTTP 200
- Support URL in ASC metadata is `https://www.dollor.ai/support` and returns HTTP 200
- Build 1108 (ID cf874071-d373-485d-b0db-ee1cce792a13) is attached to version 30ad500d
- Version state is NOT REJECTED -- ready for future submission
- NO submission for review was triggered
</verification>

<success_criteria>
All 4 App Store blockers resolved and verified via audit rerun. Version is in an editable state ready for manual submission. No review submission was made.
</success_criteria>

<output>
After completion, create `.planning/quick/70-fix-4-app-store-blockers-for-customer-ap/70-SUMMARY.md`
</output>
