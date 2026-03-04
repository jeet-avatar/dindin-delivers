---
phase: quick-65
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [DEPLOY-BACKEND, DISTRIBUTE-ANDROID, REBUILD-IOS]

must_haves:
  truths:
    - "Backend is deployed to staging and production with latest code (d9a8c701)"
    - "All 3 Android APKs distributed to Firebase App Distribution"
    - "All 3 iOS apps rebuilt with bumped build numbers and uploaded to TestFlight"
  artifacts: []
  key_links:
    - from: "gh workflow (staging)"
      to: "ECS staging service"
      via: "deploy-staging.yml"
      pattern: "deploy-staging"
    - from: "gh workflow (production)"
      to: "ECS production service"
      via: "deploy-dollar-ai.yml"
      pattern: "deploy-dollar-ai"
---

<objective>
Deploy backend to staging + production, distribute 3 pre-built Android APKs to Firebase, and rebuild + upload all 3 iOS apps to TestFlight.

Purpose: Ship all recent code changes (quick-60 through quick-64) to all platforms.
Output: Backend live on staging+production, Android APKs on Firebase, iOS builds on TestFlight.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Deploy backend to staging and production via CI/CD</name>
  <action>
Code is already pushed to main (commit d9a8c701). Deploy using CI/CD only (NEVER manual docker/aws commands).

Step 1 -- Deploy to staging:
```bash
gh workflow run deploy-staging.yml --ref main
```
Monitor with `gh run list --workflow=deploy-staging.yml --limit 3` then `gh run watch <run-id>`.
Wait for staging deploy to succeed.

Step 2 -- Smoke test staging:
```bash
curl -s https://d34u5ixl0bulv4.cloudfront.net/health | head -20
curl -s -o /dev/null -w "%{http_code}" https://d34u5ixl0bulv4.cloudfront.net/api/vendors/published
```
Both should return 200.

Step 3 -- Deploy to production:
```bash
gh workflow run deploy-dollar-ai.yml
```
Monitor with `gh run list --workflow=deploy-dollar-ai.yml --limit 3` then `gh run watch <run-id>`.
Wait for production deploy to succeed.

Step 4 -- Verify production:
```bash
curl -s https://api.dollor.ai/health | head -20
curl -s -o /dev/null -w "%{http_code}" https://api.dollor.ai/api/vendors/published
```
  </action>
  <verify>Both staging and production health checks return 200. Both CI/CD workflow runs show success.</verify>
  <done>Backend deployed to staging and production with commit d9a8c701.</done>
</task>

<task type="auto">
  <name>Task 2: Distribute Android APKs to Firebase App Distribution</name>
  <action>
APKs already built at:
- `/Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk` (Customer vC=31, v1.0.30)
- `/Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk` (Driver vC=28, v1.0.27)
- `/Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk` (Partner vC=24, v1.0.23)

Firebase login is freshly re-authenticated. Distribute all 3:

```bash
cd /Users/jeet/StudioProjects/eatfair-android

firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Customer v1.0.30 (vC=31) - ride availability fixes, delivery timeout safety net, vendor doc upload, deterministic support chat" \
  --project dollorai-production

firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Driver v1.0.27 (vC=28) - ride availability fixes, delivery timeout safety net" \
  --project dollorai-production

firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
  --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Partner v1.0.23 (vC=24) - delivery button error handling, vendor doc upload fix" \
  --project dollorai-production
```

All 3 should output success with a Firebase link.
  </action>
  <verify>All 3 firebase appdistribution:distribute commands succeed. Output shows "View this release in the Firebase console" for each.</verify>
  <done>All 3 Android APKs distributed to Firebase App Distribution for jeetnair.in@gmail.com.</done>
</task>

<task type="auto">
  <name>Task 3: Bump iOS build numbers, archive, and upload all 3 apps to TestFlight</name>
  <action>
Current builds (from quick-64): Customer 1105, Driver 210, Restaurant 180.
Bump to: Customer 1106, Driver 211, Restaurant 181.

Step 1 -- Bump build numbers in Info.plist files:
Use agvtool or PlistBuddy to increment CURRENT_PROJECT_VERSION in each app's project.pbxproj.

For Customer:
```bash
cd /Users/jeet/doordash-p2p/apps/ios/customer
agvtool new-version -all 1106
```

For Driver:
```bash
cd /Users/jeet/doordash-p2p/apps/ios/delivery
agvtool new-version -all 211
```

For Restaurant:
```bash
cd /Users/jeet/doordash-p2p/apps/ios/restaurant
agvtool new-version -all 181
```

Step 2 -- Archive and upload each app. For each app, run archive then exportArchive (which also uploads since ExportOptions.plist has destination:upload). Do NOT use separate xcrun altool.

**Customer (build 1106):**
```bash
cd /Users/jeet/doordash-p2p
xcodebuild archive \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/customer \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

**Driver (build 211):**
```bash
xcodebuild archive \
  -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/driver \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

**Restaurant (build 181):**
```bash
xcodebuild archive \
  -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant -configuration Release \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/restaurant \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

Step 3 -- If Restaurant scheme not found in workspace, use -project instead:
```bash
xcodebuild archive \
  -project apps/ios/restaurant/eatffairrestaurant.xcodeproj \
  -scheme eatffairrestaurant -configuration Release \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates
```

Step 4 -- Commit the build number bump:
```bash
cd /Users/jeet/doordash-p2p
git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
git add apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
git add apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
git commit -m "chore: bump iOS builds to 1106/211/181"
git push origin main
```

Step 5 -- Update MEMORY.md build versions table to reflect new builds:
- iOS Customer: 1106
- iOS Driver: 211
- iOS Restaurant: 181
- Android Customer: vC=31 (v1.0.30)
- Android Driver: vC=28 (v1.0.27)
- Android Partner: vC=24 (v1.0.23)
  </action>
  <verify>All 3 xcodebuild archive commands succeed. All 3 exportArchive commands succeed and upload to App Store Connect. TestFlight shows builds 1106/211/181.</verify>
  <done>All 3 iOS apps rebuilt with bumped build numbers (1106/211/181) and uploaded to TestFlight.</done>
</task>

</tasks>

<verification>
1. Backend: `curl -s https://api.dollor.ai/health` returns 200
2. Backend: `curl -s https://d34u5ixl0bulv4.cloudfront.net/health` returns 200
3. Android: All 3 Firebase distribution commands succeeded
4. iOS: All 3 apps archived and uploaded to TestFlight (builds 1106/211/181)
</verification>

<success_criteria>
- Backend deployed to both staging and production via CI/CD (no manual docker/aws commands)
- All 3 Android APKs distributed to Firebase for jeetnair.in@gmail.com
- All 3 iOS apps uploaded to TestFlight with build numbers 1106/211/181
- Build version table in MEMORY.md updated
</success_criteria>

<output>
After completion, create `.planning/quick/65-deploy-backend-distribute-android-apks-r/65-SUMMARY.md`
</output>
