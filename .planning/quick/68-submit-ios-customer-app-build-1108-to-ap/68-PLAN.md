---
phase: quick-68
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/asc_submit.py
autonomous: false
requirements: [SUBMIT-01]

must_haves:
  truths:
    - "Customer app build 1108 is submitted to App Store Review"
    - "Demo credentials are configured for App Review team"
    - "App version 1.0 is in 'Waiting for Review' or 'In Review' state"
  artifacts:
    - path: "scripts/asc_submit.py"
      provides: "App Store Connect API submission script"
  key_links:
    - from: "scripts/asc_submit.py"
      to: "App Store Connect API"
      via: "JWT-authenticated REST calls"
      pattern: "api.appstoreconnect.apple.com"
---

<objective>
Submit iOS Customer app (build 1108, version 1.0, bundle ID com.dollorai.customer) to App Store Connect for review and release.

Purpose: Get the Customer app approved and released on the App Store. Previous submission was rejected (Jan 23, 2026) because it was under a personal name -- now under Zietra Technologies inc org account.
Output: App in "Waiting for Review" state with demo credentials configured.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create App Store Connect submission script and submit build 1108 for review</name>
  <files>scripts/asc_submit.py</files>
  <action>
Create a Python script `scripts/asc_submit.py` that uses the App Store Connect REST API (v1) to submit the Customer app for review. The script uses PyJWT (already installed) to generate JWT tokens signed with the .p8 key.

**Authentication:**
- API Key ID: `9K626GB728`
- Issuer ID: `80d10e49-f379-462f-9668-5ea53016812e`
- Key path: `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8`
- JWT algorithm: ES256, audience: `appstoreconnect-v1`, expiry: 20 minutes
- Send as `Authorization: Bearer {token}` header

**Step-by-step API workflow:**

1. **Find the app** — `GET /v1/apps?filter[bundleId]=com.dollorai.customer` to get the app resource ID.

2. **List existing app store versions** — `GET /v1/apps/{appId}/appStoreVersions?filter[platform]=IOS` to check if a version "1.0" already exists (from previous rejected submission). Filter for versions in editable states: `PREPARE_FOR_SUBMISSION`, `DEVELOPER_REJECTED`, `REJECTED`, `METADATA_REJECTED`.

3. **Create or reuse version** — If no editable "1.0" version exists, create one: `POST /v1/appStoreVersions` with `{ type: "appStoreVersions", attributes: { platform: "IOS", versionString: "1.0" }, relationships: { app: { data: { type: "apps", id: appId } } } }`. If one exists, reuse its ID.

4. **Find build 1108** — `GET /v1/builds?filter[app]={appId}&filter[version]=1108&filter[processingState]=VALID` to get the build resource ID. If build not yet processed, wait and retry (up to 5 attempts, 30s apart).

5. **Select build for version** — `PATCH /v1/appStoreVersions/{versionId}` with relationships: `{ build: { data: { type: "builds", id: buildId } } }`.

6. **Set App Review information (demo credentials)** — First `GET /v1/appStoreVersions/{versionId}/appStoreReviewDetail` to check if review detail exists. If it returns data, `PATCH /v1/appStoreReviewDetails/{reviewDetailId}` with attributes: `{ contactEmail: "support@dollor.ai", contactFirstName: "Jithesh", contactLastName: "Manoharan", contactPhone: "+18003655671", demoAccountName: "demo.customer@dollor.ai", demoAccountPassword: "DemoCustomer2025!", demoAccountRequired: true, notes: "Demo account is pre-seeded. Tap 'Sign In' on the login screen, enter the demo credentials, and you can browse restaurants and view the food delivery flow. For rideshare, tap the 'Rides' tab to see the ride request interface. The app connects to our production API at api.dollor.ai." }`. If no review detail exists, `POST /v1/appStoreReviewDetails` with those attributes plus relationship to the version.

7. **Submit for review** — `POST /v1/appStoreVersionSubmissions` with `{ type: "appStoreVersionSubmissions", relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } } }`.

**Error handling:**
- Print each step clearly with status codes and response bodies on failure
- If version is already in `WAITING_FOR_REVIEW` or `IN_REVIEW`, print that and exit successfully
- If build is in `PROCESSING`, retry with backoff
- If submission fails with 409 (conflict), print the error detail -- likely missing required metadata (screenshots, description, etc.)

**Run the script after creating it:** `python3 scripts/asc_submit.py`

**IMPORTANT:** If the submission fails due to missing metadata (screenshots, description, keywords, etc.), print exactly what's missing from the error response so the user knows what to fill in via App Store Connect web UI. Do NOT try to upload screenshots programmatically -- that requires binary uploads and is best done in the web UI.

**If the submit-for-review step fails with a 409 about missing metadata**, instead try to just confirm the build is selected and review info is set, then create a checkpoint for the user to complete the remaining metadata in the App Store Connect web UI and submit manually.
  </action>
  <verify>
Run `python3 scripts/asc_submit.py` and confirm output shows:
- App found (prints app ID)
- Version 1.0 found or created (prints version ID)
- Build 1108 selected (prints build ID)
- Review info set with demo credentials
- Either "Submitted for Review" or clear error about what metadata is missing
  </verify>
  <done>Build 1108 is either submitted for App Store Review (ideal) or build is selected + review info is configured and user knows exactly what remaining metadata to add in App Store Connect web UI.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>App Store Connect submission of Customer app build 1108 for review. Demo credentials configured for the review team.</what-built>
  <how-to-verify>
    1. Go to https://appstoreconnect.apple.com
    2. Navigate to Apps > Dollor - Food & Rides (or the customer app)
    3. Check the iOS version 1.0 section
    4. Verify build 1108 is selected
    5. Verify App Review Information shows demo credentials (demo.customer@dollor.ai)
    6. Confirm the version status is "Waiting for Review" (or if metadata was missing, fill in remaining fields and submit manually)
  </how-to-verify>
  <resume-signal>Type "approved" if app is in review, or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- App Store Connect shows Customer app version 1.0 with build 1108
- Demo credentials are set in App Review Information
- Version status is "Waiting for Review" or "In Review"
</verification>

<success_criteria>
Customer app build 1108 is submitted to App Store for review with demo credentials configured, and is in "Waiting for Review" state. If metadata gaps prevent submission, user has clear instructions on what to complete.
</success_criteria>

<output>
After completion, create `.planning/quick/68-submit-ios-customer-app-build-1108-to-ap/68-SUMMARY.md`
</output>
