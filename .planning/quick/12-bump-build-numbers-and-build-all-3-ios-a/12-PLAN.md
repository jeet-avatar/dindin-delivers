---
phase: quick-12
plan: 12
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
    - "All 3 pbxproj files have new build numbers committed before any build starts"
    - "Customer app builds successfully with Production configuration (build 1089)"
    - "Driver app builds successfully with Production configuration (build 197)"
    - "Restaurant app builds successfully with Production configuration (build 165)"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Customer app project — CURRENT_PROJECT_VERSION = 1089 at lines 541 and 578"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "Driver app project — CURRENT_PROJECT_VERSION = 197 at lines 548 and 589"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Restaurant app project — CURRENT_PROJECT_VERSION = 165 at lines 546 and 581"
  key_links:
    - from: "pbxproj files"
      to: "xcodebuild Production builds"
      via: "CURRENT_PROJECT_VERSION embedded in binary"
      pattern: "CURRENT_PROJECT_VERSION = 1089"
---

<objective>
Bump build numbers for all 3 iOS apps and produce successful Production builds.

Purpose: Prepare new builds for App Store submission with incremented build numbers.
Output: 3 successful xcodebuild Production builds with new build numbers committed atomically first.
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
  <name>Task 1: Bump build numbers in all 3 pbxproj files and commit</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    Update CURRENT_PROJECT_VERSION in each pbxproj. Each file has TWO occurrences (Debug and Release targets) — both must be updated.

    Customer app (apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj):
    - Line 541: CURRENT_PROJECT_VERSION = 1088; → CURRENT_PROJECT_VERSION = 1089;
    - Line 578: CURRENT_PROJECT_VERSION = 1088; → CURRENT_PROJECT_VERSION = 1089;

    Driver app (apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj):
    - Line 548: CURRENT_PROJECT_VERSION = 196; → CURRENT_PROJECT_VERSION = 197;
    - Line 589: CURRENT_PROJECT_VERSION = 196; → CURRENT_PROJECT_VERSION = 197;

    Restaurant app (apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj):
    - Line 546: CURRENT_PROJECT_VERSION = 164; → CURRENT_PROJECT_VERSION = 165;
    - Line 581: CURRENT_PROJECT_VERSION = 164; → CURRENT_PROJECT_VERSION = 165;

    After editing all 3 files, verify with grep that old values are gone and new values are present:
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj

    Then commit atomically:
    git add apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj \
            apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj \
            apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    git commit -m "chore(ios): bump build numbers — customer 1089, driver 197, restaurant 165"
  </action>
  <verify>
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | grep 1089
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | grep 197
    grep -n "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | grep 165
    git log --oneline -1  # confirms commit exists
  </verify>
  <done>All 3 pbxproj files show new build numbers (2 occurrences each), and the commit is recorded in git log.</done>
</task>

<task type="auto">
  <name>Task 2: Build Customer app with Production configuration</name>
  <files></files>
  <action>
    Run xcodebuild for the Customer app using the Production configuration:

    xcodebuild \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatfaircustomer \
      -configuration Production \
      -destination 'generic/platform=iOS' \
      build \
      | tail -20

    If the build fails due to code signing, add CODE_SIGNING_ALLOWED=NO to get a clean build verification:
    xcodebuild \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatfaircustomer \
      -configuration Production \
      -destination 'generic/platform=iOS' \
      CODE_SIGNING_ALLOWED=NO \
      build \
      | tail -20
  </action>
  <verify>Output ends with "** BUILD SUCCEEDED **"</verify>
  <done>Customer app (build 1089) compiles successfully with Production configuration.</done>
</task>

<task type="auto">
  <name>Task 3: Build Driver and Restaurant apps with Production configuration</name>
  <files></files>
  <action>
    Build Driver app:
    xcodebuild \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatffairdelivery \
      -configuration Production \
      -destination 'generic/platform=iOS' \
      build \
      | tail -20

    If Driver build fails with code signing, add CODE_SIGNING_ALLOWED=NO.

    Build Restaurant app. First try via workspace:
    xcodebuild \
      -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatffairrestaurant \
      -configuration Production \
      -destination 'generic/platform=iOS' \
      build \
      | tail -20

    If Restaurant build fails with "scheme not found in workspace", fall back to direct project:
    xcodebuild \
      -project apps/ios/restaurant/eatffairrestaurant.xcodeproj \
      -scheme eatffairrestaurant \
      -configuration Production \
      -destination 'generic/platform=iOS' \
      build \
      | tail -20

    Apply CODE_SIGNING_ALLOWED=NO to Restaurant build if code signing errors occur.
  </action>
  <verify>
    Both build commands end with "** BUILD SUCCEEDED **".
  </verify>
  <done>Driver app (build 197) and Restaurant app (build 165) both compile successfully with Production configuration.</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. git log --oneline -3 shows the build number bump commit
2. All 3 grep checks confirm new build numbers (2 per file):
   - Customer: 1089 (×2)
   - Driver: 197 (×2)
   - Restaurant: 165 (×2)
3. All 3 xcodebuild runs exited with "** BUILD SUCCEEDED **"
</verification>

<success_criteria>
- Build number bump commit exists in git history before any build output
- Customer app build 1089: BUILD SUCCEEDED
- Driver app build 197: BUILD SUCCEEDED
- Restaurant app build 165: BUILD SUCCEEDED
</success_criteria>

<output>
After completion, create `.planning/quick/12-bump-build-numbers-and-build-all-3-ios-a/12-SUMMARY.md` with:
- Build numbers updated and confirmed
- Which workspace/project flags were used for each app
- Build success status for all 3 apps
- Git commit hash for the build number bump
</output>
