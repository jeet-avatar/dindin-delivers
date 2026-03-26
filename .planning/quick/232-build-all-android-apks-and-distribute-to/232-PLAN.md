---
phase: quick-232
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
  - /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
  - /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk
autonomous: false
requirements:
  - ANDROID-BUILD-232
user_setup: []

must_haves:
  truths:
    - "All 3 Android release APKs build with zero errors"
    - "All 3 APKs are distributed to jeetnair.in@gmail.com via Firebase App Distribution"
    - "Build numbers are current (Customer vC=40, Driver vC=36, Partner vC=35)"
  artifacts:
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk"
      provides: "Customer release APK"
    - path: "/Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk"
      provides: "Driver release APK"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk"
      provides: "Partner/Restaurant release APK"
  key_links:
    - from: "Gradle release build"
      to: "Firebase App Distribution"
      via: "firebase appdistribution:distribute CLI"
      pattern: "firebase appdistribution:distribute"
---

<objective>
Build all 3 Android release APKs (Customer, Driver, Partner) and distribute them to the Firebase App Distribution tester account for pre-Play-Store verification.

Purpose: Verify builds are clean, signing works, and APKs are testable on a real device before Play Store submission.
Output: 3 signed release APKs uploaded to Firebase App Distribution, accessible to jeetnair.in@gmail.com.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md

Current versions:
- Customer: versionCode=40, versionName=1.0.39, package=ai.dollor.customer
- Driver: versionCode=36, versionName=1.0.35, package=ai.dollor.driver
- Partner: versionCode=35, versionName=1.0.34, package=ai.dollor.partner

Firebase App IDs:
- Customer: 1:65740760476:android:535885ca28086e6242d459
- Driver: 1:65740760476:android:7d9bed1ee685434c42d459
- Partner: 1:65740760476:android:8591cc17fa4f8d4c42d459
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Change Request and build all 3 Android release APKs</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk
    /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk
    /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk
  </files>
  <action>
    Step 1 — Create Change Request ticket (ticketed-task skill requirement):
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Quick-232: Build all Android APKs and distribute to Firebase",
        "description": "Build Customer vC=40, Driver vC=36, Partner vC=35 release APKs and distribute to jeetnair.in@gmail.com via Firebase App Distribution for pre-Play-Store verification.",
        "change_type": "infrastructure",
        "priority": "Medium",
        "requested_by": "support@dollor.ai"
      }'
    ```
    Extract CR ID from response, then submit:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
    ```

    Step 2 — Clean previous build artifacts to avoid stale APKs:
    ```bash
    cd /Users/jeet/StudioProjects/eatfair-android
    ./gradlew clean
    ```

    Step 3 — Build all 3 release APKs in one command:
    ```bash
    cd /Users/jeet/StudioProjects/eatfair-android
    ./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease
    ```

    If any module fails, build individually to isolate:
    ```bash
    ./gradlew :app:assembleRelease
    ./gradlew :driver:assembleRelease
    ./gradlew :partner:assembleRelease
    ```

    Step 4 — Verify APK files exist and have non-zero size:
    ```bash
    ls -lh app/build/outputs/apk/release/app-release.apk \
            driver/build/outputs/apk/release/driver-release.apk \
            partner/build/outputs/apk/release/partner-release.apk
    ```

    Do NOT increment version codes — current versions (vC=40/36/35) are the target for this distribution.
    Do NOT modify any source files. This is a pure build + distribute task.
  </action>
  <verify>
    All 3 APK files exist at their expected paths and are larger than 1 MB:
    - app/build/outputs/apk/release/app-release.apk
    - driver/build/outputs/apk/release/driver-release.apk
    - partner/build/outputs/apk/release/partner-release.apk

    `ls -lh` output shows sizes in MB range (typically 15-50 MB each).
    Gradle output shows "BUILD SUCCESSFUL" for all 3 modules.
  </verify>
  <done>
    3 signed release APKs built with no errors. Gradle reports BUILD SUCCESSFUL.
    APK sizes confirm they are real builds, not empty stubs.
  </done>
</task>

<task type="auto">
  <name>Task 2: Distribute all 3 APKs to Firebase App Distribution</name>
  <files></files>
  <action>
    Distribute each APK to Firebase App Distribution using the Firebase CLI.
    Use the correct Firebase App IDs and project from CLAUDE.md.

    Customer APK:
    ```bash
    firebase appdistribution:distribute \
      /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk \
      --app "1:65740760476:android:535885ca28086e6242d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Customer v1.0.39 (vC=40) — pre-Play-Store verification build" \
      --project dollorai-production
    ```

    Driver APK:
    ```bash
    firebase appdistribution:distribute \
      /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk \
      --app "1:65740760476:android:7d9bed1ee685434c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Driver v1.0.35 (vC=36) — pre-Play-Store verification build" \
      --project dollorai-production
    ```

    Partner APK:
    ```bash
    firebase appdistribution:distribute \
      /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk \
      --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
      --testers "jeetnair.in@gmail.com" \
      --release-notes "Partner v1.0.34 (vC=35) — pre-Play-Store verification build" \
      --project dollorai-production
    ```

    If Firebase CLI reports authentication error (pending reauth noted in MEMORY.md):
    Run `firebase login` or `firebase login --reauth` first, then retry each distribute command.

    After all 3 succeed, close the Change Request:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/transition?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{"new_status": "Deployed", "comment": "All 3 Android APKs built and distributed to Firebase App Distribution"}'
    ```
  </action>
  <verify>
    Firebase CLI output for each app shows:
    - "✓ Uploaded APK" (or equivalent success message)
    - No authentication errors
    - Release notes attached

    Confirm with:
    ```bash
    firebase appdistribution:releases:list \
      --app "1:65740760476:android:535885ca28086e6242d459" \
      --project dollorai-production \
      --limit 1
    ```
    Should show the new Customer release at top.
  </verify>
  <done>
    All 3 APKs uploaded to Firebase App Distribution. jeetnair.in@gmail.com receives
    install links for Customer v1.0.39, Driver v1.0.35, and Partner v1.0.34.
    Change Request closed as Deployed.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    3 Android release APKs built from source and distributed to Firebase App Distribution:
    - Customer v1.0.39 (vC=40) — ai.dollor.customer
    - Driver v1.0.35 (vC=36) — ai.dollor.driver
    - Partner v1.0.34 (vC=35) — ai.dollor.partner
  </what-built>
  <how-to-verify>
    1. Check email at jeetnair.in@gmail.com for 3 Firebase App Distribution install invites
    2. Install at least one APK on a test device to confirm it launches
    3. Optionally open Firebase Console at https://console.firebase.google.com/project/dollorai-production/appdistribution
       and verify all 3 apps show the new release

    If any build failed: check the Gradle error output — most common issues are signing config
    missing from local.properties or a dependency resolution failure.

    If Firebase auth failed: `firebase login --reauth` and re-run Task 2.
  </how-to-verify>
  <resume-signal>Type "approved" if all 3 APKs distributed successfully, or describe any build/upload errors.</resume-signal>
</task>

</tasks>

<verification>
- All 3 Gradle modules build with no errors (BUILD SUCCESSFUL)
- APK files are present and have realistic file sizes (> 1 MB)
- Firebase CLI confirms upload for all 3 apps
- tester receives install notifications at jeetnair.in@gmail.com
- Change Request closed as Deployed
</verification>

<success_criteria>
3 signed Android release APKs (Customer vC=40, Driver vC=36, Partner vC=35) are built clean
and accessible via Firebase App Distribution to jeetnair.in@gmail.com for device verification
before Play Store submission.
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/232-build-all-android-apks-and-distribute-to/232-SUMMARY.md`
</output>
