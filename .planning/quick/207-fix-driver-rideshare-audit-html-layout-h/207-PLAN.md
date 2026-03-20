---
phase: quick-207
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .superpowers/brainstorm/driver-rideshare-audit.html
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  - /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
  - /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Audit HTML panels scroll independently without header overlap"
    - "iOS builds have bumped CURRENT_PROJECT_VERSION numbers"
    - "Android builds have bumped versionCode and versionName"
  artifacts:
    - path: ".superpowers/brainstorm/driver-rideshare-audit.html"
      provides: "Fixed layout with 116px header offset"
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "CURRENT_PROJECT_VERSION = 1121"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "CURRENT_PROJECT_VERSION = 227"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "CURRENT_PROJECT_VERSION = 218"
    - path: "/Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts"
      provides: "versionCode 39, versionName 1.0.38"
    - path: "/Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts"
      provides: "versionCode 35, versionName 1.0.34"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts"
      provides: "versionCode 34, versionName 1.0.33"
  key_links: []
---

<objective>
Fix the driver-rideshare-audit.html layout so left and main panels scroll independently below the actual header height (116px instead of 80px). Simultaneously bump build numbers for all 3 iOS apps and all 3 Android apps in preparation for the next distribution round.

Purpose: The audit HTML currently clips under the header due to wrong offset. Build bumps ensure the next TestFlight/Firebase uploads use correct sequential identifiers.
Output: Fixed HTML file + 6 updated project files ready for build.
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
  <name>Task 1: Fix audit HTML header offset (80px → 116px) and add main-panel scroll</name>
  <files>.superpowers/brainstorm/driver-rideshare-audit.html</files>
  <action>
    Read the file first, then make exactly these 4 CSS changes:

    1. `.container { min-height: calc(100vh - 80px) }` → `calc(100vh - 116px)`
    2. `.left-panel { top: 80px; height: calc(100vh - 80px) }` → `top: 116px; height: calc(100vh - 116px)`
    3. Any third occurrence of `80px` used as a header offset → `116px`
    4. On `.main-panel`, add `height: calc(100vh - 116px); overflow-y: auto;` so the right panel scrolls independently (same as left-panel pattern)

    Do NOT change any other values — colors, widths, padding, content are untouched.
  </action>
  <verify>
    grep -n "80px" .superpowers/brainstorm/driver-rideshare-audit.html
    # Must return 0 header-offset occurrences (non-header 80px values are OK if any exist elsewhere)
    grep -n "116px" .superpowers/brainstorm/driver-rideshare-audit.html
    # Must show the 3+ occurrences replacing the old offsets
  </verify>
  <done>All header-related 80px values replaced with 116px; .main-panel has height + overflow-y: auto.</done>
</task>

<task type="auto">
  <name>Task 2: Bump iOS build numbers (Customer 1120→1121, Driver 226→227, Restaurant 217→218)</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    In each project.pbxproj, replace ALL occurrences of CURRENT_PROJECT_VERSION (use replace_all / sed across all build configurations — Debug, Release, Staging if present):

    - eatfaircustomer.xcodeproj/project.pbxproj: `CURRENT_PROJECT_VERSION = 1120` → `CURRENT_PROJECT_VERSION = 1121`
    - eatffairdelivery.xcodeproj/project.pbxproj: `CURRENT_PROJECT_VERSION = 226` → `CURRENT_PROJECT_VERSION = 227`
    - eatffairrestaurant.xcodeproj/project.pbxproj: `CURRENT_PROJECT_VERSION = 217` → `CURRENT_PROJECT_VERSION = 218`

    Do NOT change MARKETING_VERSION, PRODUCT_BUNDLE_IDENTIFIER, or any other field.
    Signing is already Automatic — no signing changes needed.
  </action>
  <verify>
    grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | head -5
    grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -5
    grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -5
    # Must show 1121, 227, 218 respectively — no occurrences of old numbers remain
  </verify>
  <done>All 3 pbxproj files show the new build numbers across every build configuration.</done>
</task>

<task type="auto">
  <name>Task 3: Bump Android versionCode and versionName (Customer 38→39, Driver 34→35, Partner 33→34)</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
  </files>
  <action>
    In each build.gradle.kts, update versionCode and versionName together:

    app/build.gradle.kts:
      - `versionCode = 38` → `versionCode = 39`
      - `versionName = "1.0.37"` → `versionName = "1.0.38"`

    driver/build.gradle.kts:
      - `versionCode = 34` → `versionCode = 35`
      - `versionName = "1.0.33"` → `versionName = "1.0.34"`

    partner/build.gradle.kts:
      - `versionCode = 33` → `versionCode = 34`
      - `versionName = "1.0.32"` → `versionName = "1.0.33"`

    Do NOT change applicationId, compileSdk, minSdk, targetSdk, or any dependency versions.
  </action>
  <verify>
    grep -E "versionCode|versionName" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
    grep -E "versionCode|versionName" /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
    grep -E "versionCode|versionName" /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
    # Must show: 39/1.0.38, 35/1.0.34, 34/1.0.33 respectively
  </verify>
  <done>All 3 Android modules show the new versionCode and versionName values.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. HTML layout fix:
   grep -c "80px" .superpowers/brainstorm/driver-rideshare-audit.html
   # Expect 0 or only non-header occurrences

2. iOS build numbers:
   grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | grep -c "1121"
   grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | grep -c "227"
   grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | grep -c "218"

3. Android build numbers:
   grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/app/build.gradle.kts
   grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/driver/build.gradle.kts
   grep "versionCode" /Users/jeet/StudioProjects/eatfair-android/partner/build.gradle.kts
</verification>

<success_criteria>
- Audit HTML: left-panel and main-panel both use 116px header offset with independent overflow-y: auto scroll
- iOS: Customer=1121, Driver=227, Restaurant=218 in all build configurations
- Android: Customer=vC39/1.0.38, Driver=vC35/1.0.34, Partner=vC34/1.0.33
- All changes committed to git
</success_criteria>

<output>
After completion, create `.planning/quick/207-fix-driver-rideshare-audit-html-layout-h/207-SUMMARY.md` with:
- Files changed (7 total)
- Grep proof for each change
- Build number table showing before/after
Update STATE.md quick tasks table: add row 207 with description, date, commit hash.
</output>
