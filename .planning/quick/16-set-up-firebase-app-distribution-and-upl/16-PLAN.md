---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-16]

must_haves:
  truths:
    - "All 3 Android APKs are uploaded to Firebase App Distribution"
    - "Each upload targets the correct Firebase App ID for the correct package"
    - "Release notes identify the build version for traceability"
  artifacts: []
  key_links:
    - from: "Firebase CLI"
      to: "Firebase App Distribution console"
      via: "appdistribution:distribute command"
      pattern: "firebase appdistribution:distribute"
---

<objective>
Upload all 3 pre-built Android release APKs to Firebase App Distribution using the Firebase CLI.

Purpose: Get Android builds distributed for testing without Play Store review delay.
Output: 3 APKs available in Firebase App Distribution console under dollorai-production project.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Firebase project: dollorai-production (#65740760476)
Firebase CLI: v14.26.0 installed at /opt/homebrew/bin/firebase

App IDs:
- Customer: 1:65740760476:android:535885ca28086e6242d459 (ai.dollor.customer)
- Driver: 1:65740760476:android:7d9bed1ee685434c42d459 (ai.dollor.driver)
- Partner: 1:65740760476:android:8591cc17fa4f8d4c42d459 (ai.dollor.partner)

APK paths (verified, already built):
- /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk (24.1 MB)
- /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk (15.6 MB)
- /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk (15.5 MB)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Authenticate Firebase CLI and upload all 3 APKs</name>
  <files></files>
  <action>
Step 1 -- Verify Firebase auth. Run:
  firebase projects:list
If auth fails or expired, this task becomes a checkpoint:human-action -- the user must run `firebase login --reauth` interactively (OAuth browser flow cannot be automated by Claude).

Step 2 -- Upload Customer APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/app/build/outputs/apk/release/app-release.apk \
    --app 1:65740760476:android:535885ca28086e6242d459 \
    --release-notes "Customer v24 release build - Feb 2026"

Step 3 -- Upload Driver APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/driver/build/outputs/apk/release/driver-release.apk \
    --app 1:65740760476:android:7d9bed1ee685434c42d459 \
    --release-notes "Driver v21 release build - Feb 2026"

Step 4 -- Upload Partner APK:
  firebase appdistribution:distribute /Users/jeet/StudioProjects/eatfair-android/partner/build/outputs/apk/release/partner-release.apk \
    --app 1:65740760476:android:8591cc17fa4f8d4c42d459 \
    --release-notes "Partner v17 release build - Feb 2026"

Build numbers from STATE.md quick task 14: Customer 24, Driver 21, Partner 17.

Do NOT rebuild the APKs. Do NOT modify any project files. This is purely CLI upload commands.

If any upload fails with a network/auth error, retry once. If it fails again, report the exact error message.
  </action>
  <verify>
Each `firebase appdistribution:distribute` command should output a success message with a release URL. Verify all 3 succeed. Optionally confirm with:
  firebase appdistribution:releases:list --app {APP_ID}
for each app to see the release listed.
  </verify>
  <done>
All 3 APKs (Customer, Driver, Partner) are uploaded and visible in Firebase App Distribution. Each upload returned a success message with a console URL.
  </done>
</task>

</tasks>

<verification>
- All 3 firebase appdistribution:distribute commands completed successfully
- Firebase console shows releases for all 3 Android apps
- No files in the codebase were modified
</verification>

<success_criteria>
3 Android APKs uploaded to Firebase App Distribution under project dollorai-production, each with release notes identifying the build version.
</success_criteria>

<output>
After completion, create `.planning/quick/16-set-up-firebase-app-distribution-and-upl/16-SUMMARY.md`
</output>
