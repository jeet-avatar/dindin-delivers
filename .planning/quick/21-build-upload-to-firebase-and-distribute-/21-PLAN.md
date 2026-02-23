---
phase: quick-21
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-21]

must_haves:
  truths:
    - "All 3 Android release APKs build successfully with rideshare fixes from quick-17"
    - "All 3 APKs are uploaded to Firebase App Distribution"
    - "Tester jeetnair.in@gmail.com receives distribution invite for all 3 apps"
    - "Release notes mention the rideshare API fixes"
  artifacts: []
  key_links:
    - from: "Gradle assembleRelease"
      to: "APK output files"
      via: "build system"
      pattern: "build/outputs/apk/release/.*-release.apk"
    - from: "Firebase CLI"
      to: "Firebase App Distribution console"
      via: "appdistribution:distribute command"
      pattern: "firebase appdistribution:distribute"
---

<objective>
Build all 3 Android release APKs (including rideshare fixes from quick-17) and upload them to Firebase App Distribution with tester distribution.

Purpose: Get the latest Android builds (with 12 rideshare field mismatch fixes) into testers' hands via Firebase App Distribution.
Output: 3 APKs built, uploaded, and distributed to jeetnair.in@gmail.com.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Android repo: /Users/jeet/StudioProjects/eatfair-android
Firebase project: dollorai-production (#65740760476)

Current versions (bumped in quick-14, do NOT bump again):
- Customer: versionCode=24, versionName=1.0.23, package=ai.dollor.customer
- Driver: versionCode=21, versionName=1.0.20, package=ai.dollor.driver
- Partner: versionCode=17, versionName=1.0.16, package=ai.dollor.partner

Firebase App IDs:
- Customer: 1:65740760476:android:535885ca28086e6242d459
- Driver: 1:65740760476:android:7d9bed1ee685434c42d459
- Partner: 1:65740760476:android:8591cc17fa4f8d4c42d459

APK output paths after build:
- /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
- /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
- /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build all 3 Android release APKs</name>
  <files></files>
  <action>
Build all 3 release APKs in a single Gradle invocation. Run from the Android repo directory:

  cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease

Use a 600000ms (10 minute) timeout -- Gradle builds can be slow.

Do NOT modify any source files. Do NOT bump version numbers (already done in quick-14).

After the build completes, verify all 3 APK files exist:
  ls -la /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
  ls -la /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
  ls -la /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk

If the build fails, check the error output. Common issues:
- Signing config: verify local.properties has RELEASE_KEYSTORE_PATH, RELEASE_KEYSTORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD
- Java version: ensure JAVA_HOME points to JDK 17+
  </action>
  <verify>All 3 APK files exist at their expected paths with non-zero file sizes. The Gradle build exits with BUILD SUCCESSFUL.</verify>
  <done>3 release APKs built successfully: app-release.apk (Customer), driver-release.apk (Driver), partner-release.apk (Partner).</done>
</task>

<task type="auto">
  <name>Task 2: Upload all 3 APKs to Firebase App Distribution and distribute to tester</name>
  <files></files>
  <action>
Step 1 -- Verify Firebase CLI auth is still valid:
  firebase projects:list
If auth fails or is expired, this becomes a checkpoint:human-action -- user must run `firebase login --reauth` interactively (OAuth browser flow).

Step 2 -- Upload and distribute Customer APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk \
    --app 1:65740760476:android:535885ca28086e6242d459 \
    --release-notes "Customer v1.0.23 (build 24) — Rideshare API fixes: 12 field mismatches corrected for ride request, tracking, estimation, and fare negotiation" \
    --testers jeetnair.in@gmail.com

Step 3 -- Upload and distribute Driver APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk \
    --app 1:65740760476:android:7d9bed1ee685434c42d459 \
    --release-notes "Driver v1.0.20 (build 21) — Rideshare API fixes: 12 field mismatches corrected for ride request, tracking, estimation, and fare negotiation" \
    --testers jeetnair.in@gmail.com

Step 4 -- Upload and distribute Partner APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk \
    --app 1:65740760476:android:8591cc17fa4f8d4c42d459 \
    --release-notes "Partner v1.0.16 (build 17) — Rideshare API fixes: 12 field mismatches corrected for ride request, tracking, estimation, and fare negotiation" \
    --testers jeetnair.in@gmail.com

Run each upload sequentially (not parallel). Each command should complete in under 2 minutes.

If any upload fails with a network/auth error, retry once. If it fails again, report the exact error message.

Do NOT modify any project files. This is purely CLI upload commands.
  </action>
  <verify>Each `firebase appdistribution:distribute` command outputs a success message. All 3 uploads complete without error. The --testers flag ensures jeetnair.in@gmail.com receives an invite email for each app.</verify>
  <done>All 3 APKs uploaded to Firebase App Distribution and distributed to jeetnair.in@gmail.com. Each release shows version info and rideshare fix notes.</done>
</task>

</tasks>

<verification>
- Gradle build completed with BUILD SUCCESSFUL for all 3 modules
- All 3 APK files exist at expected paths with reasonable file sizes (15-25 MB each)
- All 3 firebase appdistribution:distribute commands succeeded
- Tester jeetnair.in@gmail.com was included in distribution for all 3 apps
- No source files were modified (build + upload only)
</verification>

<success_criteria>
3 Android release APKs (Customer v1.0.23, Driver v1.0.20, Partner v1.0.16) built from current source (with rideshare fixes), uploaded to Firebase App Distribution, and distributed to jeetnair.in@gmail.com with release notes describing the rideshare API fixes.
</success_criteria>

<output>
After completion, create `.planning/quick/21-build-upload-to-firebase-and-distribute-/21-SUMMARY.md`
</output>
