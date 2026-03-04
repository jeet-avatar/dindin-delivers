---
phase: quick-76
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
autonomous: false
must_haves:
  truths:
    - "Production /api/rides/estimate returns 401 without auth and 200 with valid Bearer token"
    - "iOS Customer build 1110 is on TestFlight"
    - "Build 1110 is attached to the App Store version (PREPARE_FOR_SUBMISSION)"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Build number 1110"
      contains: "CURRENT_PROJECT_VERSION = 1110"
  key_links:
    - from: "production backend"
      to: "/api/rides/estimate"
      via: "auth middleware"
      pattern: "401 without auth, 200 with Bearer"
---

<objective>
Deploy auth-restored fare estimate fix to production, smoke test, rebuild iOS Customer build 1110 to TestFlight, and attach to App Store version.

Purpose: The fare estimate endpoint had auth temporarily removed; commit 75df2aba restores it. Production deploy timed out (ECS stability wait) on runs 22671236161 and 22671228424 — need to re-trigger or verify service health, then rebuild iOS Customer with new build number and attach to pending App Store submission.

Output: Production verified with auth on /api/rides/estimate, iOS Customer build 1110 on TestFlight attached to ASC version.
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
  <name>Task 1: Re-deploy production and smoke test auth on /api/rides/estimate</name>
  <files></files>
  <action>
The previous production deploys (runs 22671236161 and 22671228424) both failed at the ECS stability wait step (timeout). The Docker image was pushed to ECR successfully. Steps:

1. Re-trigger production deploy via CI/CD:
   ```
   gh workflow run deploy-dollar-ai.yml
   ```

2. Monitor the deploy:
   ```
   gh run list --workflow=deploy-dollar-ai.yml --limit 3
   gh run watch <run-id>
   ```
   Wait for "Deploy Backend to ECS" job to succeed. If it times out again, check ECS service health directly (the container may have deployed fine but the waiter timed out).

3. Once production is deployed, smoke test the fare estimate endpoint:

   a. Verify 401 WITHOUT auth:
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/rides/estimate \
     -H "Content-Type: application/json" \
     -d '{"pickup_latitude":40.7128,"pickup_longitude":-74.0060,"dropoff_latitude":40.7580,"dropoff_longitude":-73.9855}'
   ```
   Expected: 401

   b. Get a demo customer JWT token:
   ```
   curl -s -X POST https://api.dollor.ai/api/auth/customer/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=demo.customer@dollor.ai&password=DemoCustomer2025!"
   ```
   Extract the access_token from the JSON response.

   c. Verify 200 WITH auth:
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/rides/estimate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"pickup_latitude":40.7128,"pickup_longitude":-74.0060,"dropoff_latitude":40.7580,"dropoff_longitude":-73.9855}'
   ```
   Expected: 200 (or 422 if field names differ — any non-401 confirms auth passes)

NOTE: If demo account doesn't exist on production, first run:
```
curl -X POST "https://api.dollor.ai/api/demo/setup?secret_key=<ADMIN_SECRET>"
```
Per STATE.md quick-70 decision, the admin secret is from AWS Secrets Manager `dollor/production/admin`.
  </action>
  <verify>
curl to /api/rides/estimate without auth returns HTTP 401; with valid Bearer token returns non-401 (200 or 422).
  </verify>
  <done>Production fare estimate endpoint requires authentication — 401 without token, success with valid token.</done>
</task>

<task type="auto">
  <name>Task 2: Bump iOS Customer build 1109 to 1110, archive, upload to TestFlight</name>
  <files>apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj</files>
  <action>
1. Bump CURRENT_PROJECT_VERSION from 1109 to 1110 in ALL occurrences in project.pbxproj:
   ```
   sed -i '' 's/CURRENT_PROJECT_VERSION = 1109;/CURRENT_PROJECT_VERSION = 1110;/g' \
     apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   ```

2. Commit and push:
   ```
   git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   git commit -m "chore: bump iOS Customer build to 1110"
   git push origin main
   ```

3. Archive the Customer app (Release configuration):
   ```
   cd /Users/jeet/doordash-p2p
   xcodebuild archive \
     -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
     -scheme eatfaircustomer -configuration Release \
     -archivePath /tmp/dollor-archives/eatfaircustomer.xcarchive \
     -destination 'generic/platform=iOS' -allowProvisioningUpdates
   ```

4. Export + Upload to TestFlight (ExportOptions.plist handles both export and upload):
   ```
   xcodebuild -exportArchive \
     -archivePath /tmp/dollor-archives/eatfaircustomer.xcarchive \
     -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
     -exportPath /tmp/dollor-ipas/eatfaircustomer \
     -allowProvisioningUpdates \
     -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
     -authenticationKeyID 9K626GB728 \
     -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
   ```

Do NOT use `xcrun altool --upload-app` — the exportArchive step handles upload when ExportOptions has `destination: upload`.
  </action>
  <verify>
grep "CURRENT_PROJECT_VERSION = 1110" in project.pbxproj returns 6 matches. xcodebuild exportArchive completes with "Upload Succeeded" or similar success message.
  </verify>
  <done>iOS Customer build 1110 uploaded to TestFlight successfully.</done>
</task>

<task type="auto">
  <name>Task 3: Attach build 1110 to App Store version via ASC API</name>
  <files></files>
  <action>
Wait for build 1110 to finish processing on App Store Connect (may take 5-15 minutes after upload).

1. Generate ASC JWT token using the App Store Connect API key:
   - Key ID: 9K626GB728
   - Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e
   - Key path: ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8

   Use a Python or shell one-liner to generate the JWT (ES256, 20-min expiry).

2. Poll for build 1110 to appear and finish processing:
   ```
   GET https://api.appstoreconnect.apple.com/v1/builds?filter[app]=<app-id>&filter[version]=1110&filter[processingState]=VALID
   ```
   Or list recent builds and find 1110.

3. Once build 1110 is VALID (processing complete), attach it to the App Store version:
   ```
   PATCH https://api.appstoreconnect.apple.com/v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc/relationships/build
   ```
   Body:
   ```json
   {
     "data": {
       "type": "builds",
       "id": "<build-1110-id>"
     }
   }
   ```

4. Verify the build is attached:
   ```
   GET https://api.appstoreconnect.apple.com/v1/appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc/build
   ```
   Should return build 1110 data.

NOTE: If build takes longer than expected to process, check with:
```
GET https://api.appstoreconnect.apple.com/v1/builds?filter[app]=<app-id>&sort=-uploadedDate&limit=5
```
  </action>
  <verify>
ASC API GET on appStoreVersions/30ad500d-cdf6-47fb-98e2-314fe6fd68dc/build returns build 1110 data.
  </verify>
  <done>Build 1110 is attached to the App Store version (PREPARE_FOR_SUBMISSION) and ready for submission.</done>
</task>

</tasks>

<verification>
1. Production: `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/rides/estimate -d '{...}'` returns 401 (no auth)
2. Production: Same request with valid Bearer token returns 200/422 (auth passes)
3. TestFlight: Build 1110 visible in App Store Connect under Customer app
4. App Store Version: Build 1110 attached to version 30ad500d-cdf6-47fb-98e2-314fe6fd68dc
</verification>

<success_criteria>
- Production /api/rides/estimate requires auth (401 without, 200 with)
- iOS Customer build 1110 on TestFlight
- Build 1110 attached to App Store version for submission
- CLAUDE.md build table updated to reflect 1110
</success_criteria>

<output>
After completion, create `.planning/quick/76-deploy-auth-restored-fare-estimate-fix-r/76-SUMMARY.md`
</output>
