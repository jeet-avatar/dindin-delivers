---
phase: quick-24
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-24]
must_haves:
  truths:
    - "All 3 Android release APKs build successfully with VAPT security fixes"
    - "All 3 APKs are uploaded to Firebase App Distribution"
    - "jeetnair.in@gmail.com receives tester invitation for all 3 apps"
  artifacts:
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk"
      provides: "Customer app release APK"
    - path: "/Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk"
      provides: "Driver app release APK"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk"
      provides: "Partner/Restaurant app release APK"
  key_links:
    - from: "Gradle build"
      to: "Firebase App Distribution"
      via: "firebase appdistribution:distribute CLI"
      pattern: "firebase appdistribution:distribute"
---

<objective>
Build all 3 Android release APKs (Customer, Driver, Partner) with VAPT security fixes applied (quick-23), then upload to Firebase App Distribution and distribute to jeetnair.in@gmail.com.

Purpose: Distribute security-hardened Android builds to testers without bumping version numbers (same as quick-14: Customer vC=24, Driver vC=21, Partner vC=17).
Output: 3 APKs uploaded to Firebase App Distribution, tester notified.
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
  <name>Task 1: Build all 3 Android release APKs</name>
  <files>/Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
/Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
/Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk</files>
  <action>
    Run a single Gradle command to build all 3 release APKs in parallel from the Android repo root. Do NOT bump version codes or version names — keep them as-is from quick-14 (Customer vC=24, Driver vC=21, Partner vC=17). The VAPT security fixes (OkHttp logging disabled in release, PII redaction, ProGuard log stripping) were applied in quick-23 and are already committed.

    Command (timeout 600000ms):
    cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease

    If any module fails, check the error output for signing config issues (release builds require signing). If signing fails, check if a keystore is configured in the module's build.gradle. Do not attempt to create a new keystore — report the error.
  </action>
  <verify>
    Confirm all 3 APK files exist after the build:
    ls -lh /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
    ls -lh /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
    ls -lh /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk
  </verify>
  <done>All 3 APK files exist, each > 1MB, Gradle exits with BUILD SUCCESSFUL.</done>
</task>

<task type="auto">
  <name>Task 2: Upload and distribute all 3 APKs via Firebase App Distribution</name>
  <files></files>
  <action>
    Run 3 sequential firebase CLI commands from the Android repo directory. Firebase CLI is already authenticated. Release notes describe the VAPT security fixes applied in quick-23.

    Command 1 — Customer app:
    firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk --app 1:65740760476:android:535885ca28086e6242d459 --testers "jeetnair.in@gmail.com" --release-notes "Security hardened: OkHttp logging disabled in release, PII redacted from logs, ProGuard log stripping enabled"

    Command 2 — Driver app:
    firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk --app 1:65740760476:android:7d9bed1ee685434c42d459 --testers "jeetnair.in@gmail.com" --release-notes "Security hardened: OkHttp logging disabled in release, PII redacted from logs, ProGuard log stripping enabled"

    Command 3 — Partner/Restaurant app:
    firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk --app 1:65740760476:android:8591cc17fa4f8d4c42d459 --testers "jeetnair.in@gmail.com" --release-notes "Security hardened: OkHttp logging disabled in release, PII redacted from logs, ProGuard log stripping enabled"

    Run each command sequentially and capture output. Each should report a successful upload and tester distribution.
  </action>
  <verify>
    Each firebase command should output confirmation lines such as:
    - "uploaded successfully"
    - "distributed to X tester(s)"
    No authentication errors or app ID not found errors.
  </verify>
  <done>All 3 firebase distribute commands complete without errors. jeetnair.in@gmail.com is notified for all 3 apps.</done>
</task>

</tasks>

<verification>
After both tasks complete:
1. All 3 APK files exist on disk (Task 1 verify commands)
2. Firebase CLI reported success for all 3 uploads
3. No Gradle or Firebase errors in output
</verification>

<success_criteria>
- Customer, Driver, and Partner APKs built successfully (same version codes as quick-14)
- All 3 APKs uploaded to Firebase App Distribution
- jeetnair.in@gmail.com distributed as tester on all 3 apps
- Release notes reflect VAPT security hardening from quick-23
</success_criteria>

<output>
After completion, create `.planning/quick/24-build-and-distribute-security-fixed-andr/24-SUMMARY.md` with:
- Build result (success/failure per app)
- APK sizes
- Firebase upload confirmation for each app
- Any issues encountered
</output>
