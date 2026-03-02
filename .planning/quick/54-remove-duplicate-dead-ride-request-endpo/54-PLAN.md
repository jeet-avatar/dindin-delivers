---
phase: quick-54
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [QUICK-54]

must_haves:
  truths:
    - "Dead /api/erp/rides/request endpoint no longer exists in main_new.py"
    - "Dead /api/erp/rides/request duplicate no longer exists in order_flow.py"
    - "Active /api/rides/request endpoint in bid_routes.py is untouched and working"
    - "All existing tests pass with zero regressions"
    - "All 6 apps (3 iOS + 3 Android) built and distributed with incremented versions"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Cleaned backend without dead ride request endpoint"
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Cleaned order_flow without duplicate ride request"
  key_links:
    - from: "bid_routes.py"
      to: "/api/rides/request"
      via: "router.post('/request') with prefix '/api/rides'"
      pattern: "@router\\.post\\(\"/request\"\\)"
---

<objective>
Remove two dead/duplicate ride request endpoint implementations and build all 6 apps with clean codebase.

Purpose: Eliminate dead code that creates confusion (3 implementations of ride request, only 1 active). Build and distribute updated apps.
Output: Clean backend code, passing tests, 3 iOS builds on TestFlight, 3 Android builds on Firebase.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 3679-3896: dead /api/erp/rides/request endpoint)
@apps/web/p2p-platform/backend/order_flow.py (lines 790-899: dead duplicate /api/erp/rides/request via router prefix)
@apps/web/p2p-platform/backend/bid_routes.py (line 330: ACTIVE /api/rides/request -- DO NOT TOUCH)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove dead ride request endpoints and verify tests</name>
  <files>
    apps/web/p2p-platform/backend/main_new.py
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
**main_new.py -- Remove the dead endpoint at lines 3679-3896:**
Delete the entire `@app.post("/api/erp/rides/request")` function (lines 3679 through 3896, ending just before `@app.get("/api/erp/rides/{ride_id}/status")` at line 3898). This is ~218 lines of dead code.

Also remove `/api/erp/rides/request` from the auth allowlist if present (check around line 320 in the `PUBLIC_PATHS` or middleware allowlist -- it was NOT found there, but double-check).

DO NOT touch any other `/api/erp/rides/*` endpoints (status, estimate-fare, estimate, full-tracking, rate, available, accept, picked-up, start, track, cancel, negotiate, accept-fare, customer-negotiate, customer-accept-fare, negotiation-status). These are ACTIVE endpoints used by iOS/Android apps.

**order_flow.py -- Remove the dead duplicate at lines 788-899:**
Delete the `# ==================== P2P RIDE REQUEST ====================` section (lines 788-899) containing `@router.post("/rides/request")` which maps to `/api/erp/rides/request` via the router prefix. This is an old Order-based ride implementation (~112 lines) that was superseded by the RideRequest-based flow in bid_routes.py.

DO NOT touch anything else in order_flow.py (especially `/rides/available` at line 902 and beyond -- those are still active).

**Why safe:** All iOS apps, Android apps, and tests use `/api/rides/request` (bid_routes.py:330). The `/api/erp/rides/request` path has been dead since Feb 20 when bid_routes became the canonical implementation. The E2E test files (rideshare_full_flow.py:236, rideshare_e2e_test.py:179, test_ride_checkout.py:62) reference `/api/erp/rides/request` but these are STANDALONE scripts (not pytest), so they won't break the test suite.

**Run full test suite:**
```bash
cd apps/web/p2p-platform/backend && source venv/bin/activate && pytest tests/ -v
```

Confirm ALL tests pass. If any test references `/api/erp/rides/request` and fails, update that test to use `/api/rides/request` instead.
  </action>
  <verify>
1. `grep -n "api/erp/rides/request" apps/web/p2p-platform/backend/main_new.py` returns NO matches
2. `grep -n "rides/request" apps/web/p2p-platform/backend/order_flow.py` returns NO matches
3. `grep -n "@router.post(\"/request\")" apps/web/p2p-platform/backend/bid_routes.py` still returns line 330 (untouched)
4. `pytest tests/ -v` passes with zero failures
  </verify>
  <done>
Dead /api/erp/rides/request removed from both main_new.py and order_flow.py. Active /api/rides/request in bid_routes.py untouched. All tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Build and distribute all 6 apps</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
**Step 1: Bump iOS build numbers in project.pbxproj files:**
- Customer: 1097 -> 1098 (all occurrences in `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj`)
- Driver: 205 -> 206 (all occurrences in `apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj`)
- Restaurant: 175 -> 176 (all occurrences in `apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj`)

Use `sed -i '' 's/CURRENT_PROJECT_VERSION = 1097/CURRENT_PROJECT_VERSION = 1098/g'` pattern for each.

**Step 2: Bump Android version codes in build.gradle.kts:**
- Customer (`/Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts`): versionCode 27 -> 28, versionName "1.0.26" -> "1.0.27"
- Driver (`/Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts`): versionCode 24 -> 25, versionName "1.0.23" -> "1.0.24"
- Partner (`/Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts`): versionCode 20 -> 21, versionName "1.0.19" -> "1.0.20"

**Step 3: Build iOS apps -- Archive and upload to TestFlight:**

For each app (Customer, Driver, Restaurant):
```bash
# Customer
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

# Driver
xcodebuild archive \
  -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/dollor-archives/delivery.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/delivery.xcarchive \
  -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/delivery \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

# Restaurant
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

Note: If restaurant scheme is not found in workspace, use `-project apps/ios/restaurant/eatffairrestaurant.xcodeproj` instead of `-workspace`.

**Step 4: Build Android apps:**
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew assembleRelease bundleRelease
```

**Step 5: Upload Android APKs to Firebase App Distribution:**
```bash
cd /Users/jeet/StudioProjects/eatfair-android

firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Customer v1.0.27 - dead code cleanup" --project dollorai-production

firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Driver v1.0.24 - dead code cleanup" --project dollorai-production

firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
  --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Partner v1.0.20 - dead code cleanup" --project dollorai-production
```

Developer shows as "Zierta Technologies" -- already configured at account level for both Apple and Google, no code changes needed.
  </action>
  <verify>
1. iOS: All 3 archives succeed (check for `.xcarchive` in `/tmp/dollor-archives/`)
2. iOS: All 3 uploads succeed (check `xcodebuild -exportArchive` exit code 0)
3. Android: `./gradlew assembleRelease bundleRelease` succeeds with BUILD SUCCESSFUL
4. Android: All 3 Firebase uploads complete with "Release created successfully"
5. Version numbers: iOS Customer=1098, Driver=206, Restaurant=176; Android Customer=28, Driver=25, Partner=21
  </verify>
  <done>
All 6 apps built with incremented version numbers and distributed: 3 iOS on TestFlight, 3 Android on Firebase App Distribution. Developer shows as Zierta Technologies.
  </done>
</task>

</tasks>

<verification>
1. No dead ride request endpoints remain: `grep -rn "api/erp/rides/request" apps/web/p2p-platform/backend/main_new.py apps/web/p2p-platform/backend/order_flow.py` returns nothing
2. Active endpoint untouched: `grep -n "@router.post.*request" apps/web/p2p-platform/backend/bid_routes.py` shows line 330
3. All pytest tests pass
4. All 6 apps built and distributed with correct version numbers
</verification>

<success_criteria>
- Dead /api/erp/rides/request removed from main_new.py (lines 3679-3896) and order_flow.py (lines 788-899)
- Active /api/rides/request in bid_routes.py completely untouched
- Full test suite passes with zero regressions
- iOS builds 1098/206/176 uploaded to TestFlight
- Android builds vC=28/25/21 uploaded to Firebase App Distribution
</success_criteria>

<output>
After completion, create `.planning/quick/54-remove-duplicate-dead-ride-request-endpo/54-SUMMARY.md`
</output>
