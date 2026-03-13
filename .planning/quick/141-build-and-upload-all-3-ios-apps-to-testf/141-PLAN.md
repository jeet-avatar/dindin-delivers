---
phase: quick-141
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [BUILD-iOS]
must_haves:
  truths:
    - "All 3 iOS apps uploaded to TestFlight with combo+bestseller features"
    - "Build numbers incremented: Customer 1114, Driver 216, Restaurant 206"
    - "All 3 builds visible in App Store Connect / TestFlight"
  artifacts:
    - path: "apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj"
      provides: "Customer build number 1114"
      contains: "CURRENT_PROJECT_VERSION = 1114"
    - path: "apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj"
      provides: "Driver build number 216"
      contains: "CURRENT_PROJECT_VERSION = 216"
    - path: "apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj"
      provides: "Restaurant build number 206"
      contains: "CURRENT_PROJECT_VERSION = 206"
  key_links:
    - from: "project.pbxproj (all 3)"
      to: "TestFlight"
      via: "xcodebuild archive + exportArchive with ASC API key"
      pattern: "CURRENT_PROJECT_VERSION"
---

<objective>
Build and upload all 3 iOS apps (Customer, Driver, Restaurant) to TestFlight with the combo deals and bestseller features from Quick-164.

Purpose: Get latest code including combo+bestseller menu features onto TestFlight for testing.
Output: 3 builds on TestFlight — Customer 1114, Driver 216, Restaurant 206.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump build numbers and commit</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
    Bump CURRENT_PROJECT_VERSION in all 3 project.pbxproj files using sed:
    - Customer: 1113 -> 1114 (all occurrences)
    - Driver: 215 -> 216 (all occurrences)
    - Restaurant: 205 -> 206 (all occurrences)

    Use sed to replace ALL occurrences of CURRENT_PROJECT_VERSION in each file:
    ```
    sed -i '' 's/CURRENT_PROJECT_VERSION = 1113;/CURRENT_PROJECT_VERSION = 1114;/g' apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    sed -i '' 's/CURRENT_PROJECT_VERSION = 215;/CURRENT_PROJECT_VERSION = 216;/g' apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    sed -i '' 's/CURRENT_PROJECT_VERSION = 205;/CURRENT_PROJECT_VERSION = 206;/g' apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
    ```

    Create a Change Request ticket before committing (per ticketed-task skill).
    Commit with message: `build(quick-141): [CR-XXXX] bump iOS builds — Customer 1114, Driver 216, Restaurant 206`
  </action>
  <verify>
    grep -c "CURRENT_PROJECT_VERSION = 1114" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj (should be > 0)
    grep -c "CURRENT_PROJECT_VERSION = 216" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj (should be > 0)
    grep -c "CURRENT_PROJECT_VERSION = 206" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj (should be > 0)
    No old build numbers remain (grep for old values returns 0).
  </verify>
  <done>All 3 pbxproj files have bumped build numbers, committed to git.</done>
</task>

<task type="auto">
  <name>Task 2: Archive and upload all 3 iOS apps to TestFlight</name>
  <files>
    /tmp/dollor-archives/customer.xcarchive
    /tmp/dollor-archives/driver.xcarchive
    /tmp/dollor-archives/restaurant.xcarchive
  </files>
  <action>
    Archive and upload each app sequentially (resource-intensive, one at a time).

    For EACH app (Customer, Driver, Restaurant):

    **Step 1 — Archive:**
    ```
    xcodebuild archive \
      -workspace apps/ios/{workspace_dir}/{workspace}.xcworkspace \
      -scheme {scheme} -configuration Release \
      -archivePath /tmp/dollor-archives/{name}.xcarchive \
      -destination 'generic/platform=iOS' -allowProvisioningUpdates
    ```

    **Step 2 — Export + Upload (single command, ExportOptions has destination:upload):**
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/{name}.xcarchive \
      -exportOptionsPlist apps/ios/{app_dir}/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/{name} \
      -allowProvisioningUpdates \
      -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
      -authenticationKeyID 9K626GB728 \
      -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
    ```

    App values:
    | App | workspace_dir | workspace | scheme | app_dir | name |
    |-----|---------------|-----------|--------|---------|------|
    | Customer | customer | eatfaircustomer | eatfaircustomer | customer | customer |
    | Driver | delivery | eatffairdelivery | eatffairdelivery | delivery | driver |
    | Restaurant | restaurant | eatffairrestaurant | eatffairrestaurant | restaurant | restaurant |

    If ExportOptions.plist is not found per-app, check for shared one at apps/ios/ExportOptions.plist.

    Do NOT use separate `xcrun altool --upload-app` — the exportArchive step handles upload.

    After all 3 uploads succeed, update MEMORY.md build versions:
    - iOS Customer: 1114
    - iOS Driver: 216
    - iOS Restaurant: 206

    Transition the CR ticket through: In Progress -> Verified (since this is a build-only task, no staging/prod deploy needed).
  </action>
  <verify>
    Each exportArchive command exits 0 and logs show successful upload to App Store Connect.
    Look for "Upload Succeeded" or similar confirmation in xcodebuild output.
    All 3 archives exist at /tmp/dollor-archives/{name}.xcarchive.
  </verify>
  <done>All 3 iOS apps (Customer 1114, Driver 216, Restaurant 206) uploaded to TestFlight and visible in App Store Connect.</done>
</task>

</tasks>

<verification>
- grep confirms new build numbers in all 3 pbxproj files
- xcodebuild archive + exportArchive exits 0 for all 3 apps
- Upload confirmation in xcodebuild output for all 3 apps
</verification>

<success_criteria>
- Customer build 1114 on TestFlight
- Driver build 216 on TestFlight
- Restaurant build 206 on TestFlight
- All builds include combo deals + bestseller features from Quick-164
- Build number bump committed to git
</success_criteria>

<output>
After completion, create `.planning/quick/141-build-and-upload-all-3-ios-apps-to-testf/141-SUMMARY.md`
</output>
