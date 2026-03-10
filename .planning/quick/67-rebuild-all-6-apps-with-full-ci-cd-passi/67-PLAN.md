---
phase: quick-67
plan: 67
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [BUILD-67]
must_haves:
  truths:
    - "All 3 CI workflows pass (CI/CD Pipeline, CI - Security & Quality, Full-Stack Integration Tests)"
    - "iOS Customer build 1108 is on TestFlight"
    - "iOS Driver build 213 is on TestFlight"
    - "iOS Restaurant build 183 is on TestFlight"
    - "Android Customer vC=33 (v1.0.32) is on Firebase"
    - "Android Driver vC=30 (v1.0.29) is on Firebase"
    - "Android Partner vC=26 (v1.0.25) is on Firebase"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Customer build 1108"
      contains: "CURRENT_PROJECT_VERSION = 1108"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "Driver build 213"
      contains: "CURRENT_PROJECT_VERSION = 213"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Restaurant build 183"
      contains: "CURRENT_PROJECT_VERSION = 183"
  key_links:
    - from: "project.pbxproj files"
      to: "TestFlight"
      via: "xcodebuild archive + exportArchive"
      pattern: "CURRENT_PROJECT_VERSION"
    - from: "build.gradle.kts files"
      to: "Firebase App Distribution"
      via: "gradlew assembleRelease + firebase appdistribution:distribute"
      pattern: "versionCode"
    - from: "git push origin main"
      to: "CI workflows"
      via: "GitHub Actions triggers on push to main"
      pattern: "on: push: branches: [main]"
---

<objective>
Bump build numbers for all 6 apps (iOS to 1108/213/183, Android to vC=33/30/26), push both repos to remote, wait for all 3 CI workflows to pass, then build and distribute all apps (iOS to TestFlight, Android to Firebase).

Purpose: Full rebuild cycle with CI/CD gate -- no app distribution until CI passes.
Output: 6 fresh app builds distributed to testers, all CI workflows green.
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
  <name>Task 1: Bump versions in both repos, commit, push, trigger CI</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    1. Bump iOS build numbers in project.pbxproj files using sed (replace ALL occurrences):
       - Customer: CURRENT_PROJECT_VERSION from 1107 to 1108 (6 occurrences in file)
       - Driver: CURRENT_PROJECT_VERSION from 212 to 213 (6 occurrences in file)
       - Restaurant: CURRENT_PROJECT_VERSION from 182 to 183 (6 occurrences in file)

    2. Bump Android build numbers in build.gradle.kts files at /Users/jeet/StudioProjects/eatfair-android:
       - app/build.gradle.kts: versionCode from 32 to 33, versionName from "1.0.31" to "1.0.32"
       - driver/build.gradle.kts: versionCode from 29 to 30, versionName from "1.0.28" to "1.0.29"
       - partner/build.gradle.kts: versionCode from 25 to 26, versionName from "1.0.24" to "1.0.25"

    3. Commit and push iOS repo (doordash-p2p):
       ```
       cd /Users/jeet/doordash-p2p
       git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj \
               apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj \
               apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
       git commit -m "build: bump iOS builds to 1108/213/183"
       git push origin main
       ```
       The push to main triggers CI/CD Pipeline and Full-Stack Integration Tests workflows automatically.

    4. Commit and push Android repo (eatfair-android):
       ```
       cd /Users/jeet/StudioProjects/eatfair-android
       git add app/build.gradle.kts driver/build.gradle.kts partner/build.gradle.kts
       git commit -m "build: bump Android builds to vC=33/30/26"
       git push origin main
       ```

    5. Trigger CI - Security & Quality workflow manually (it lacks push-to-main trigger per quick-66 discovery):
       ```
       cd /Users/jeet/doordash-p2p
       gh workflow run "CI - Security & Quality" --ref main
       ```
       NOTE: Per STATE.md decision [Phase quick-66], this workflow lacks workflow_dispatch trigger and only fires on PR to main or push to develop. If `gh workflow run` fails, create a dummy PR to main or push to develop branch to trigger it. If that also fails, skip this specific workflow and proceed -- the other 2 CI workflows (CI/CD Pipeline + Full-Stack Integration Tests) fire automatically on push to main and cover the critical checks.
  </action>
  <verify>
    - grep "CURRENT_PROJECT_VERSION = 1108" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    - grep "CURRENT_PROJECT_VERSION = 213" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    - grep "CURRENT_PROJECT_VERSION = 183" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    - grep "versionCode = 33" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    - grep "versionCode = 30" /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    - grep "versionCode = 26" /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
    - git log --oneline -1 in both repos shows build bump commits
    - gh run list --limit 3 shows workflows triggered (in_progress or queued)
  </verify>
  <done>All 6 build numbers bumped, both repos pushed to remote, CI workflows triggered.</done>
</task>

<task type="auto">
  <name>Task 2: Wait for all CI workflows to pass</name>
  <files></files>
  <action>
    Poll all 3 CI workflows until completion. Check every 60 seconds.

    1. Get the latest run IDs for each workflow:
       ```
       gh run list --workflow="CI/CD Pipeline" --limit 1 --json databaseId,status,conclusion
       gh run list --workflow="CI - Security & Quality" --limit 1 --json databaseId,status,conclusion
       gh run list --workflow="Full-Stack Integration Tests" --limit 1 --json databaseId,status,conclusion
       ```

    2. For each workflow that is still "in_progress" or "queued", poll with:
       ```
       gh run watch <run-id>
       ```
       Or check periodically:
       ```
       gh run view <run-id> --json status,conclusion
       ```

    3. If CI - Security & Quality was not triggered (no workflow_dispatch), note it and verify the other 2 pass.

    4. If any workflow FAILS:
       - Run `gh run view <run-id> --log-failed` to get the failure logs
       - Report the exact failure to the user with the failing job name, step, and error message
       - Do NOT proceed to Task 3 until failures are investigated
       - Common fixable issues: flaky tests (re-run), SonarCloud timeout (re-run), Semgrep config (check .semgrep.yml)

    5. Once all triggered workflows show conclusion="success", proceed to Task 3.
  </action>
  <verify>
    - gh run view <cicd-run-id> --json conclusion shows "success"
    - gh run view <integration-run-id> --json conclusion shows "success"
    - gh run view <security-run-id> --json conclusion shows "success" (if triggered)
    - All checks green on the latest commit
  </verify>
  <done>All CI workflows pass. Green light for app builds.</done>
</task>

<task type="auto">
  <name>Task 3: Build and distribute all 6 apps (iOS to TestFlight, Android to Firebase)</name>
  <files></files>
  <action>
    Run iOS and Android builds in parallel.

    **--- iOS: Archive + Upload to TestFlight ---**

    Clean archive directory first:
    ```
    rm -rf /tmp/dollor-archives /tmp/dollor-ipas
    mkdir -p /tmp/dollor-archives /tmp/dollor-ipas
    ```

    **Customer App (build 1108):**
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

    **Driver App (build 213):**
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

    **Restaurant App (build 183):**
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

    Run the 3 iOS archive commands in parallel (background processes). Each export+upload must wait for its archive to complete.

    NOTE: Do NOT use separate `xcrun altool --upload-app` -- ExportOptions.plist has `destination: upload` which handles both export and upload in one step.

    **--- Android: Build + Firebase Distribute ---**

    Run in parallel with iOS builds:

    1. Build all 3 Android release APKs:
    ```
    cd /Users/jeet/StudioProjects/eatfair-android
    ./gradlew assembleRelease
    ```

    2. Distribute all 3 APKs to Firebase App Distribution:

    **Customer (vC=33, v1.0.32):**
    ```
    firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
      --app "1:65740760476:android:535885ca28086e6242d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Customer v1.0.32 (build 33) - CI-verified rebuild Mar 4" \
      --project dollorai-production
    ```

    **Driver (vC=30, v1.0.29):**
    ```
    firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
      --app "1:65740760476:android:7d9bed1ee685434c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Driver v1.0.29 (build 30) - CI-verified rebuild Mar 4" \
      --project dollorai-production
    ```

    **Partner (vC=26, v1.0.25):**
    ```
    firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
      --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Partner v1.0.25 (build 26) - CI-verified rebuild Mar 4" \
      --project dollorai-production
    ```
  </action>
  <verify>
    - Each xcodebuild exportArchive exits with status 0 and output includes "Package Approved" or "Successfully uploaded"
    - /tmp/dollor-ipas/customer/, /tmp/dollor-ipas/driver/, /tmp/dollor-ipas/restaurant/ directories exist
    - ./gradlew assembleRelease exits with BUILD SUCCESSFUL
    - All 3 firebase appdistribution:distribute commands succeed
    - APK files exist at expected output paths
  </verify>
  <done>All 6 apps built and distributed: iOS 1108/213/183 on TestFlight, Android vC=33/30/26 on Firebase.</done>
</task>

</tasks>

<verification>
- All 6 apps have bumped build numbers committed and pushed
- All CI workflows pass (CI/CD Pipeline, Full-Stack Integration Tests, CI - Security & Quality if triggerable)
- 3 iOS apps uploaded to TestFlight (builds 1108/213/183)
- 3 Android apps distributed to Firebase (vC=33/30/26)
- Both repos pushed to remote
</verification>

<success_criteria>
All 3 CI workflows green. All 6 apps rebuilt and distributed with new build numbers. No CI failures blocking distribution.
</success_criteria>

<output>
After completion, create `.planning/quick/67-rebuild-all-6-apps-with-full-ci-cd-passi/67-SUMMARY.md`

Update MEMORY.md build versions:
| iOS | Customer | 1108 | 1.0 | TestFlight 2026-03-04 |
| iOS | Driver | 213 | 1.0 | TestFlight 2026-03-04 |
| iOS | Restaurant | 183 | 1.0 | TestFlight 2026-03-04 |
| Android | Customer APK | vC=33 | 1.0.32 | Firebase 2026-03-04 |
| Android | Driver APK | vC=30 | 1.0.29 | Firebase 2026-03-04 |
| Android | Partner APK | vC=26 | 1.0.25 | Firebase 2026-03-04 |

Update STATE.md:
- Last activity: 2026-03-04 - Rebuilt all 6 apps with CI gate (iOS 1108/213/183, Android vC=33/30/26)
- Quick tasks: 67
</output>
