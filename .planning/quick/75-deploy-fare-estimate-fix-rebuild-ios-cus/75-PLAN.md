---
phase: quick-75
plan: 75
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
autonomous: false
requirements: [DEPLOY-FARE-FIX, IOS-REBUILD]

must_haves:
  truths:
    - "Fare estimate endpoint returns 200 without auth on both staging and production"
    - "iOS Customer app build 1109 is available on TestFlight"
    - "Fare estimate fix commit (2bec7fe7) is deployed to production"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Build number 1109"
      contains: "CURRENT_PROJECT_VERSION = 1109"
  key_links:
    - from: "main_new.py:321 (auth allowlist)"
      to: "/api/rides/estimate"
      via: "AUTH_EXEMPT_PATHS includes /api/rides/estimate"
      pattern: "/api/rides/estimate"
---

<objective>
Deploy the fare estimate 401 fix (commit 2bec7fe7) to staging and production via CI/CD, then rebuild the iOS Customer app (build 1109) and upload to TestFlight.

Purpose: The fare estimate endpoint was returning 401 to unauthenticated iOS requests, causing wrong fare amounts on ride request. Backend fix adds /api/rides/estimate to auth allowlist. iOS Customer app needs rebuild to pick up any related client-side auth header fix.
Output: Backend deployed to staging + production, iOS Customer build 1109 on TestFlight.
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
  <name>Task 1: Push and deploy backend to staging + production</name>
  <files>No file changes — deployment only</files>
  <action>
1. Push all unpushed commits to remote:
   ```
   git push origin main
   ```
   There are 4 unpushed commits including `2bec7fe7` (fare estimate fix).

2. Deploy to staging:
   ```
   gh workflow run deploy-staging.yml --ref main
   ```
   Monitor with `gh run list --workflow=deploy-staging.yml --limit 3` then `gh run watch <run-id>`.
   Wait for staging deploy to complete successfully.

3. Smoke test fare estimate on staging — endpoint MUST work without auth:
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST https://d34u5ixl0bulv4.cloudfront.net/api/rides/estimate \
     -H "Content-Type: application/json" \
     -d '{"pickup_lat":40.7128,"pickup_lng":-74.006,"dropoff_lat":40.758,"dropoff_lng":-73.9855}'
   ```
   Expected: HTTP 200 (not 401). If 422, that is also acceptable (means auth passed, validation issue).

4. Deploy to production:
   ```
   gh workflow run deploy-dollar-ai.yml
   ```
   Monitor with `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`.
   Wait for production deploy to complete successfully.

5. Smoke test fare estimate on production:
   ```
   curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dollor.ai/api/rides/estimate \
     -H "Content-Type: application/json" \
     -d '{"pickup_lat":40.7128,"pickup_lng":-74.006,"dropoff_lat":40.758,"dropoff_lng":-73.9855}'
   ```
   Expected: HTTP 200 or 422 (NOT 401 or 403).

CRITICAL: Use CI/CD workflows ONLY. NEVER run manual docker/ecs commands.
  </action>
  <verify>
- `gh run view <staging-run-id>` shows all jobs passed
- `gh run view <production-run-id>` shows all jobs passed
- Staging curl returns non-401 status
- Production curl returns non-401 status
  </verify>
  <done>Fare estimate fix deployed to both staging and production. Endpoint returns 200/422 without auth token.</done>
</task>

<task type="auto">
  <name>Task 2: Bump iOS Customer build and upload to TestFlight</name>
  <files>apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj</files>
  <action>
1. Bump build number from 1108 to 1109 in project.pbxproj:
   ```
   sed -i '' 's/CURRENT_PROJECT_VERSION = 1108/CURRENT_PROJECT_VERSION = 1109/g' \
     apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   ```
   Verify all 6 occurrences updated.

2. Commit the build bump:
   ```
   git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
   git commit -m "build(ios): bump customer build 1108 → 1109"
   git push origin main
   ```

3. Archive the Customer app:
   ```
   cd /Users/jeet/doordash-p2p
   xcodebuild archive \
     -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
     -scheme eatfaircustomer -configuration Release \
     -archivePath /tmp/dollor-archives/customer.xcarchive \
     -destination 'generic/platform=iOS' -allowProvisioningUpdates
   ```

4. Export + Upload to TestFlight (ExportOptions.plist handles upload):
   ```
   xcodebuild -exportArchive \
     -archivePath /tmp/dollor-archives/customer.xcarchive \
     -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
     -exportPath /tmp/dollor-ipas/customer \
     -allowProvisioningUpdates \
     -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
     -authenticationKeyID 9K626GB728 \
     -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
   ```
   Do NOT use separate `xcrun altool --upload-app` — the exportArchive step handles upload.

5. Update CLAUDE.md build version table: Customer build 1108 → 1109, date to current.
  </action>
  <verify>
- `grep "CURRENT_PROJECT_VERSION = 1109" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | wc -l` returns 6
- xcodebuild archive exits with code 0
- xcodebuild exportArchive exits with code 0 and shows "Upload Successful" or similar
  </verify>
  <done>iOS Customer build 1109 uploaded to TestFlight with fare estimate auth header fix included.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
  Backend fare estimate fix deployed to staging + production. iOS Customer build 1109 uploaded to TestFlight.
  </what-built>
  <how-to-verify>
  1. Open TestFlight on your iOS device
  2. Check that build 1109 for Dollor Customer appears
  3. Install build 1109
  4. Open app, request a ride — fare estimate should show correct amount (not $0 or error)
  5. Optionally verify staging endpoint directly:
     curl -X POST https://api.dollor.ai/api/rides/estimate -H "Content-Type: application/json" -d '{"pickup_lat":40.7128,"pickup_lng":-74.006,"dropoff_lat":40.758,"dropoff_lng":-73.9855}'
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Backend: Both staging and production return non-401 on POST /api/rides/estimate without auth
- iOS: Build 1109 visible in TestFlight / App Store Connect
- No regressions: Other ride endpoints still require auth as expected
</verification>

<success_criteria>
- Fare estimate endpoint works without auth on production (HTTP 200 or 422, not 401)
- iOS Customer build 1109 on TestFlight
- All CI/CD workflows completed successfully
</success_criteria>

<output>
After completion, create `.planning/quick/75-deploy-fare-estimate-fix-rebuild-ios-cus/75-SUMMARY.md`
</output>
