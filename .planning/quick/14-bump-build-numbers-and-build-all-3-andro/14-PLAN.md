---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
autonomous: true
must_haves:
  truths:
    - "All 3 Android apps have bumped versionCode and versionName"
    - "All 3 Android release APKs build successfully"
  artifacts:
    - path: "app/build.gradle.kts"
      provides: "Customer versionCode=24, versionName=1.0.23"
    - path: "driver/build.gradle.kts"
      provides: "Driver versionCode=21, versionName=1.0.20"
    - path: "partner/build.gradle.kts"
      provides: "Partner versionCode=17, versionName=1.0.16"
---

<objective>
Bump build numbers for all 3 Android apps (Customer, Driver, Partner) and build release APKs.

Purpose: Prepare new Android release builds with incremented version codes.
Output: 3 updated build.gradle.kts files + 3 successful release APKs.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Android repo: /Users/jeet/StudioProjects/eatfair-android

Current versions (verified from build files):
- Customer (app/build.gradle.kts:56-57): versionCode=23, versionName="1.0.22"
- Driver (driver/build.gradle.kts:54-55): versionCode=20, versionName="1.0.19"
- Partner (partner/build.gradle.kts:52-53): versionCode=16, versionName="1.0.15"

Target versions:
- Customer: versionCode=24, versionName="1.0.23"
- Driver: versionCode=21, versionName="1.0.20"
- Partner: versionCode=17, versionName="1.0.16"
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump version codes and names in all 3 build files</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
  </files>
  <action>
    Edit each build.gradle.kts with these exact changes:

    1. app/build.gradle.kts (Customer):
       - Line 56: `versionCode = 23` -> `versionCode = 24`
       - Line 57: `versionName = "1.0.22"` -> `versionName = "1.0.23"`

    2. driver/build.gradle.kts (Driver):
       - Line 54: `versionCode = 20` -> `versionCode = 21`
       - Line 55: `versionName = "1.0.19"` -> `versionName = "1.0.20"`

    3. partner/build.gradle.kts (Partner):
       - Line 52: `versionCode = 16` -> `versionCode = 17`
       - Line 53: `versionName = "1.0.15"` -> `versionName = "1.0.16"`
  </action>
  <verify>
    grep -n "versionCode\|versionName" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts

    Expected output shows: Customer vC=24/vN=1.0.23, Driver vC=21/vN=1.0.20, Partner vC=17/vN=1.0.16
  </verify>
  <done>All 3 build.gradle.kts files have correct bumped version codes and names.</done>
</task>

<task type="auto">
  <name>Task 2: Build all 3 Android release APKs</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/
    /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/
    /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/
  </files>
  <action>
    Run from /Users/jeet/StudioProjects/eatfair-android:

    ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease

    This builds all 3 release APKs in a single Gradle invocation. If any module fails, investigate the error output and fix. Common issues: signing config missing (check local.properties for keystore path).
  </action>
  <verify>
    Confirm all 3 APKs exist:
    ls -la /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/*.apk
    ls -la /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/*.apk
    ls -la /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/*.apk

    All 3 should show recent timestamps matching current build time.
  </verify>
  <done>All 3 Android release APKs built successfully: Customer (v1.0.23/24), Driver (v1.0.20/21), Partner (v1.0.16/17).</done>
</task>

</tasks>

<verification>
- grep confirms all 3 files have correct versionCode and versionName
- All 3 release APKs exist with current timestamps
</verification>

<success_criteria>
- Customer app: versionCode=24, versionName="1.0.23", release APK built
- Driver app: versionCode=21, versionName="1.0.20", release APK built
- Partner app: versionCode=17, versionName="1.0.16", release APK built
</success_criteria>

<output>
After completion, create `.planning/quick/14-bump-build-numbers-and-build-all-3-andro/14-SUMMARY.md`
Commit version bumps in eatfair-android repo.
</output>
