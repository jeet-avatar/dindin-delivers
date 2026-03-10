---
phase: quick-66
plan: 66
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [BUILD-66]
must_haves:
  truths:
    - "iOS Customer build 1107 is on TestFlight"
    - "iOS Driver build 212 is on TestFlight"
    - "iOS Restaurant build 182 is on TestFlight"
    - "Android Customer vC=32 (v1.0.31) is on Firebase"
    - "Android Driver vC=29 (v1.0.28) is on Firebase"
    - "Android Partner vC=25 (v1.0.24) is on Firebase"
    - "CI - Security & Quality workflow has been triggered"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Customer build 1107"
      contains: "CURRENT_PROJECT_VERSION = 1107"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "Driver build 212"
      contains: "CURRENT_PROJECT_VERSION = 212"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Restaurant build 182"
      contains: "CURRENT_PROJECT_VERSION = 182"
  key_links:
    - from: "project.pbxproj files"
      to: "TestFlight"
      via: "xcodebuild archive + exportArchive"
      pattern: "CURRENT_PROJECT_VERSION"
    - from: "build.gradle.kts files"
      to: "Firebase App Distribution"
      via: "gradlew assembleRelease + firebase appdistribution:distribute"
      pattern: "versionCode"
---

<objective>
Rebuild and distribute all 6 apps (3 iOS + 3 Android) with fresh builds. Bump iOS builds to 1107/212/182 and upload to TestFlight. Bump Android builds to vC=32/29/25 and distribute to Firebase. Trigger CI - Security & Quality workflow for fresh SonarQube/Semgrep results.

Purpose: Get all apps on latest codebase with new build numbers for testing.
Output: 6 fresh app builds distributed to testers, CI security scan triggered.
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
  <name>Task 1: Bump iOS build numbers, push code, trigger CI workflow</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    1. Bump iOS build numbers in project.pbxproj files:
       - Customer: CURRENT_PROJECT_VERSION from 1106 to 1107 (all occurrences)
       - Driver: CURRENT_PROJECT_VERSION from 211 to 212 (all occurrences)
       - Restaurant: CURRENT_PROJECT_VERSION from 181 to 182 (all occurrences)
       Use sed to replace all occurrences in each file. There are typically 2-4 occurrences per file (Debug + Release configs).

    2. Bump Android build numbers in build.gradle.kts files at /Users/jeet/StudioProjects/eatfair-android:
       - app/build.gradle.kts: versionCode from 31 to 32, versionName from "1.0.30" to "1.0.31"
       - driver/build.gradle.kts: versionCode from 28 to 29, versionName from "1.0.27" to "1.0.28"
       - partner/build.gradle.kts: versionCode from 24 to 25, versionName from "1.0.23" to "1.0.24"

    3. Commit iOS version bumps in doordash-p2p repo:
       ```
       git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj \
               apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj \
               apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
       git commit -m "build: bump iOS builds to 1107/212/182"
       git push origin main
       ```

    4. Commit Android version bumps in eatfair-android repo:
       ```
       cd /Users/jeet/StudioProjects/eatfair-android
       git add app/build.gradle.kts driver/build.gradle.kts partner/build.gradle.kts
       git commit -m "build: bump Android builds to vC=32/29/25"
       git push origin main
       ```

    5. Trigger CI - Security & Quality workflow:
       ```
       cd /Users/jeet/doordash-p2p
       gh workflow run "CI - Security & Quality" --ref main
       ```
       Verify workflow was triggered: `gh run list --workflow="CI - Security & Quality" --limit 1`
  </action>
  <verify>
    - grep "CURRENT_PROJECT_VERSION = 1107" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - grep "CURRENT_PROJECT_VERSION = 212" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - grep "CURRENT_PROJECT_VERSION = 182" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    - grep "versionCode = 32" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    - grep "versionCode = 29" /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    - grep "versionCode = 25" /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
    - git log --oneline -1 shows build bump commit
    - gh run list --workflow="CI - Security & Quality" --limit 1 shows "in_progress" or "queued"
  </verify>
  <done>All 6 build numbers bumped, both repos pushed to remote, CI security workflow triggered.</done>
</task>

<task type="auto">
  <name>Task 2: Archive and upload all 3 iOS apps to TestFlight</name>
  <files></files>
  <action>
    Run all 3 iOS archives in parallel (each takes ~10 min). Use the exact commands from CLAUDE.md.

    Clean archive directory first:
    ```
    rm -rf /tmp/dollor-archives /tmp/dollor-ipas
    mkdir -p /tmp/dollor-archives /tmp/dollor-ipas
    ```

    **Customer App (build 1107):**
    ```
    cd /Users/jeet/doordash-p2p
    xcodebuild archive \
      -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
      -scheme eatfaircustomer -configuration Release \
      -archivePath /tmp/dollor-archives/customer.xcarchive \
      -destination 'generic/platform=iOS' -allowProvisioningUpdates
    ```
    Then export+upload:
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

    **Driver App (build 212):**
    ```
    xcodebuild archive \
      -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
      -scheme eatffairdelivery -configuration Release \
      -archivePath /tmp/dollor-archives/driver.xcarchive \
      -destination 'generic/platform=iOS' -allowProvisioningUpdates
    ```
    Then export+upload:
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/driver.xcarchive \
      -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/driver \
      -allowProvisioningUpdates \
      -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
      -authenticationKeyID 9K626GB728 \
      -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
    ```

    **Restaurant App (build 182):**
    ```
    xcodebuild archive \
      -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
      -scheme eatffairrestaurant -configuration Release \
      -archivePath /tmp/dollor-archives/restaurant.xcarchive \
      -destination 'generic/platform=iOS' -allowProvisioningUpdates
    ```
    Then export+upload:
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/restaurant.xcarchive \
      -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/restaurant \
      -allowProvisioningUpdates \
      -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
      -authenticationKeyID 9K626GB728 \
      -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
    ```

    Run the 3 archive commands in parallel using background processes. The export+upload for each app must wait for its archive to complete.

    NOTE: Do NOT use separate `xcrun altool --upload-app` -- ExportOptions.plist has `destination: upload` which handles both export and upload in one step.
  </action>
  <verify>
    - Each exportArchive command exits with status 0
    - Output includes "Package Approved" or "Successfully uploaded" for each app
    - /tmp/dollor-ipas/customer/, /tmp/dollor-ipas/driver/, /tmp/dollor-ipas/restaurant/ directories exist with IPA files
  </verify>
  <done>All 3 iOS apps (Customer 1107, Driver 212, Restaurant 182) uploaded to TestFlight.</done>
</task>

<task type="auto">
  <name>Task 3: Build and distribute all 3 Android apps to Firebase</name>
  <files></files>
  <action>
    This task can run IN PARALLEL with Task 2 (iOS builds).

    1. Build all 3 Android release APKs:
    ```
    cd /Users/jeet/StudioProjects/eatfair-android
    ./gradlew assembleRelease
    ```
    This builds all 3 APKs at once: app-release.apk, driver-release.apk, partner-release.apk.

    2. Distribute all 3 APKs to Firebase App Distribution:

    **Customer (vC=32, v1.0.31):**
    ```
    firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
      --app "1:65740760476:android:535885ca28086e6242d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Customer v1.0.31 (build 32) - Fresh rebuild Mar 4" \
      --project dollorai-production
    ```

    **Driver (vC=29, v1.0.28):**
    ```
    firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
      --app "1:65740760476:android:7d9bed1ee685434c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Driver v1.0.28 (build 29) - Fresh rebuild Mar 4" \
      --project dollorai-production
    ```

    **Partner (vC=25, v1.0.24):**
    ```
    firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
      --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Partner v1.0.24 (build 25) - Fresh rebuild Mar 4" \
      --project dollorai-production
    ```
  </action>
  <verify>
    - ./gradlew assembleRelease exits with BUILD SUCCESSFUL
    - All 3 firebase appdistribution:distribute commands succeed
    - APK files exist at expected output paths
  </verify>
  <done>All 3 Android apps (Customer vC=32, Driver vC=29, Partner vC=25) distributed to Firebase.</done>
</task>

</tasks>

<verification>
- All 6 apps have bumped build numbers
- 3 iOS apps uploaded to TestFlight (builds 1107/212/182)
- 3 Android apps distributed to Firebase (vC=32/29/25)
- CI - Security & Quality workflow running or completed
- Both repos pushed to remote
</verification>

<success_criteria>
All 6 apps rebuilt and distributed with new build numbers. CI security workflow triggered. MEMORY.md updated with new build versions.
</success_criteria>

<output>
After completion, create `.planning/quick/66-rebuild-all-6-apps-fresh-trigger-ci-secu/66-SUMMARY.md`

Update MEMORY.md build versions:
| iOS | Customer | 1107 | 1.0 | TestFlight 2026-03-04 |
| iOS | Driver | 212 | 1.0 | TestFlight 2026-03-04 |
| iOS | Restaurant | 182 | 1.0 | TestFlight 2026-03-04 |
| Android | Customer APK | vC=32 | 1.0.31 | Firebase 2026-03-04 |
| Android | Driver APK | vC=29 | 1.0.28 | Firebase 2026-03-04 |
| Android | Partner APK | vC=25 | 1.0.24 | Firebase 2026-03-04 |
</output>
