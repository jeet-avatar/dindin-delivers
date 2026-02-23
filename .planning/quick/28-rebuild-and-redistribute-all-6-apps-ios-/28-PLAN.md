---
phase: quick-28
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: []
must_haves:
  truths:
    - "All 3 iOS build numbers bumped and committed"
    - "All 3 iOS apps archived and uploaded to TestFlight"
    - "All 3 Android APKs built and distributed via Firebase App Distribution"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Customer build number 1090"
      contains: "CURRENT_PROJECT_VERSION = 1090"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "Driver build number 198"
      contains: "CURRENT_PROJECT_VERSION = 198"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Restaurant build number 166"
      contains: "CURRENT_PROJECT_VERSION = 166"
  key_links:
    - from: "xcodebuild archive"
      to: "TestFlight"
      via: "xcodebuild -exportArchive with -authenticationKey* flags + ExportOptions.plist destination:upload"
      pattern: "destination.*upload"
    - from: "./gradlew assembleRelease"
      to: "Firebase App Distribution"
      via: "firebase appdistribution:distribute"
      pattern: "appdistribution:distribute"
---

<objective>
Rebuild and redistribute all 6 apps (3 iOS to TestFlight, 3 Android to Firebase App Distribution) with all security fixes from quick tasks 25, 26, and 27 baked in.

Purpose: Testers and App Store reviewers receive the latest security-hardened builds including pentest fixes (18 findings), network security audit fixes (27 findings), SSL pinning, and VAPT remediations.
Output: 3 new iOS builds on TestFlight (Customer 1090, Driver 198, Restaurant 166) and 3 Android APKs distributed via Firebase (Customer vC=24, Driver vC=21, Partner vC=17).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump iOS build numbers and commit</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    In each .pbxproj file, find every occurrence of CURRENT_PROJECT_VERSION and update to the next build number. MARKETING_VERSION must NOT change.

    Customer: change CURRENT_PROJECT_VERSION = 1089 → 1090
    Driver:   change CURRENT_PROJECT_VERSION = 197  → 198
    Restaurant: change CURRENT_PROJECT_VERSION = 165 → 166

    Each pbxproj typically has 2 occurrences of CURRENT_PROJECT_VERSION (Debug + Release build configurations). Update ALL occurrences in each file.

    After editing all 3 files, verify with grep:
      grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
      grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
      grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj

    Then commit:
      git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
      git add apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
      git add apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
      git commit -m "chore(quick-28): bump build numbers — customer 1090, driver 198, restaurant 166"
  </action>
  <verify>
    grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | grep -c "1090"
    grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | grep -c "198"
    grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | grep -c "166"

    Each command must return 2 (both Debug and Release configs updated).
  </verify>
  <done>All 3 pbxproj files show new build numbers in both Debug and Release configs. Committed as a single atomic commit.</done>
</task>

<task type="auto">
  <name>Task 2: Archive and upload all 3 iOS apps to TestFlight</name>
  <files>/tmp/dollor-archives/ (intermediate, not committed)</files>
  <action>
    Run all commands from /Users/jeet/doordash-p2p.

    Create archive directory:
      mkdir -p /tmp/dollor-archives /tmp/dollor-ipas

    --- CUSTOMER APP ---

    Archive (timeout 600000):
      xcodebuild archive \
        -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
        -scheme eatfaircustomer \
        -configuration Release \
        -archivePath /tmp/dollor-archives/customer.xcarchive \
        -destination 'generic/platform=iOS' \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=PRKZ4UVCD7

    Export + Upload (timeout 600000):
      xcodebuild -exportArchive \
        -archivePath /tmp/dollor-archives/customer.xcarchive \
        -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
        -exportPath /tmp/dollor-ipas/customer \
        -allowProvisioningUpdates \
        -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
        -authenticationKeyID 9K626GB728 \
        -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

    --- DRIVER APP ---

    Archive (timeout 600000):
      xcodebuild archive \
        -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
        -scheme eatffairdelivery \
        -configuration Release \
        -archivePath /tmp/dollor-archives/driver.xcarchive \
        -destination 'generic/platform=iOS' \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=PRKZ4UVCD7

    Export + Upload (timeout 600000):
      xcodebuild -exportArchive \
        -archivePath /tmp/dollor-archives/driver.xcarchive \
        -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
        -exportPath /tmp/dollor-ipas/driver \
        -allowProvisioningUpdates \
        -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
        -authenticationKeyID 9K626GB728 \
        -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

    --- RESTAURANT APP ---

    Archive (timeout 600000):
      xcodebuild archive \
        -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
        -scheme eatffairrestaurant \
        -configuration Release \
        -archivePath /tmp/dollor-archives/restaurant.xcarchive \
        -destination 'generic/platform=iOS' \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=PRKZ4UVCD7

    Export + Upload (timeout 600000):
      xcodebuild -exportArchive \
        -archivePath /tmp/dollor-archives/restaurant.xcarchive \
        -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
        -exportPath /tmp/dollor-ipas/restaurant \
        -allowProvisioningUpdates \
        -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
        -authenticationKeyID 9K626GB728 \
        -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e

    If any ExportOptions.plist is missing for an app, check the pattern from a sibling app's ExportOptions.plist. Key content: method=app-store, destination=upload, teamID=PRKZ4UVCD7, signingStyle=automatic.

    On success, xcodebuild -exportArchive prints "EXPORT SUCCEEDED" and then uploads. Look for "Upload complete" or similar in stdout to confirm TestFlight delivery.
  </action>
  <verify>
    Check archive existence:
      ls /tmp/dollor-archives/customer.xcarchive
      ls /tmp/dollor-archives/driver.xcarchive
      ls /tmp/dollor-archives/restaurant.xcarchive

    Check IPA export:
      ls /tmp/dollor-ipas/customer/*.ipa
      ls /tmp/dollor-ipas/driver/*.ipa
      ls /tmp/dollor-ipas/restaurant/*.ipa

    Upload success is confirmed by xcodebuild exit code 0 and "Upload complete" / "Package Approved" in stdout.
  </verify>
  <done>All 3 .xcarchive files exist. All 3 .ipa files exported. All 3 uploads returned exit code 0. TestFlight will process builds within ~30 minutes of upload.</done>
</task>

<task type="auto">
  <name>Task 3: Build and distribute all 3 Android APKs via Firebase</name>
  <files>/Users/jeet/StudioProjects/eatfair-android (separate repo, no commit needed)</files>
  <action>
    Run Gradle build from /Users/jeet/StudioProjects/eatfair-android (timeout 600000 — building all 3 in one command):
      cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease

    If build fails, run individually to isolate:
      ./gradlew :app:assembleRelease
      ./gradlew :driver:assembleRelease
      ./gradlew :partner:assembleRelease

    APK paths after build:
      Customer: app/build/outputs/apk/release/app-release.apk
      Driver:   driver/build/outputs/apk/release/driver-release.apk
      Partner:  partner/build/outputs/apk/release/partner-release.apk

    Upload to Firebase App Distribution (timeout 300000 each, run sequentially):

    Customer (timeout 300000):
      firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
        --app 1:65740760476:android:535885ca28086e6242d459 \
        --testers "jeetnair.in@gmail.com" \
        --release-notes "Security hardened: pentest fixes, SSL pinning, auth improvements"

    Driver (timeout 300000):
      firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
        --app 1:65740760476:android:7d9bed1ee685434c42d459 \
        --testers "jeetnair.in@gmail.com" \
        --release-notes "Security hardened: pentest fixes, SSL pinning, auth improvements"

    Partner (timeout 300000):
      firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
        --app 1:65740760476:android:8591cc17fa4f8d4c42d459 \
        --testers "jeetnair.in@gmail.com" \
        --release-notes "Security hardened: pentest fixes, SSL pinning, auth improvements"

    Note: No version bump needed — already at Customer vC=24, Driver vC=21, Partner vC=17.
    Note: If firebase CLI is not authenticated, run `firebase login` first.
  </action>
  <verify>
    APKs exist after build:
      ls /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
      ls /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
      ls /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk

    Firebase CLI prints a release URL on success, e.g.:
      "View this release in the Firebase console: https://console.firebase.google.com/..."

    Each firebase distribute command must exit 0.
  </verify>
  <done>All 3 APKs built successfully (Gradle exit 0). All 3 firebase appdistribution:distribute commands exit 0. Testers receive distribution email at jeetnair.in@gmail.com.</done>
</task>

</tasks>

<verification>
After all tasks complete:

1. iOS: 3 new builds visible in App Store Connect > TestFlight (may take up to 30 min to process)
2. Android: 3 new releases visible in Firebase Console > App Distribution
3. git log shows commit "chore(quick-28): bump build numbers — customer 1090, driver 198, restaurant 166"
</verification>

<success_criteria>
- iOS Customer build 1090 uploaded to TestFlight
- iOS Driver build 198 uploaded to TestFlight
- iOS Restaurant build 166 uploaded to TestFlight
- Android Customer APK (vC=24) distributed to jeetnair.in@gmail.com
- Android Driver APK (vC=21) distributed to jeetnair.in@gmail.com
- Android Partner APK (vC=17) distributed to jeetnair.in@gmail.com
- All security fixes from quick-25, quick-26, quick-27 included in these builds
</success_criteria>

<output>
After completion, create `.planning/quick/28-rebuild-and-redistribute-all-6-apps-ios-/28-SUMMARY.md` with:
- Build numbers confirmed for each iOS app
- TestFlight upload status per app
- Firebase distribution status per app (with release URLs if available)
- Any errors encountered and how they were resolved
</output>
