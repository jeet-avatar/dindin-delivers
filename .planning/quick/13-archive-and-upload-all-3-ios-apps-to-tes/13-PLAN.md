---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [QUICK-13]

must_haves:
  truths:
    - "Customer app (build 1089) is uploaded to TestFlight"
    - "Driver app (build 197) is uploaded to TestFlight"
    - "Restaurant app (build 165) is uploaded to TestFlight"
  artifacts:
    - path: "/tmp/dollor-archives/customer.xcarchive"
      provides: "Customer app archive"
    - path: "/tmp/dollor-archives/driver.xcarchive"
      provides: "Driver app archive"
    - path: "/tmp/dollor-archives/restaurant.xcarchive"
      provides: "Restaurant app archive"
  key_links:
    - from: "xcarchive"
      to: "App Store Connect TestFlight"
      via: "xcrun altool --upload-app with API key 9K626GB728"
---

<objective>
Archive and upload all three iOS apps (Customer, Driver, Restaurant) to TestFlight using
xcodebuild automatic signing and App Store Connect API key 9K626GB728.

Purpose: Distribute build 1089 (Customer), build 197 (Driver), and build 165 (Restaurant)
to TestFlight for review and testing.

Output: Three .ipa files uploaded to App Store Connect TestFlight. No source files change.
No git commit.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/quick/12-bump-build-numbers-and-build-all-3-ios-a/12-SUMMARY.md

# App details
# Customer:   workspace=apps/ios/customer/eatfaircustomer.xcworkspace, scheme=eatfaircustomer,   build=1089
# Driver:     workspace=apps/ios/delivery/eatffairdelivery.xcworkspace, scheme=eatffairdelivery, build=197
# Restaurant: workspace=apps/ios/restaurant/eatffairrestaurant.xcworkspace, scheme=eatffairrestaurant, build=165
#             (fallback: -project apps/ios/restaurant/eatffairrestaurant.xcodeproj)
#
# API Key:  ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8
# Team ID:  PRKZ4UVCD7
# Issuer:   80d10e49-f379-462f-9668-5ea53016812e
</context>

<tasks>

<task type="auto">
  <name>Task 1: Setup — create output directories</name>
  <files>/tmp/dollor-archives/ /tmp/dollor-ipas/</files>
  <action>
    Create the archive and IPA output directories so subsequent tasks do not fail on missing
    paths:

    ```
    mkdir -p /tmp/dollor-archives
    mkdir -p /tmp/dollor-ipas/customer
    mkdir -p /tmp/dollor-ipas/driver
    mkdir -p /tmp/dollor-ipas/restaurant
    ```
  </action>
  <verify>
    `ls /tmp/dollor-archives /tmp/dollor-ipas/customer /tmp/dollor-ipas/driver /tmp/dollor-ipas/restaurant`
    — all four directories exist with no error.
  </verify>
  <done>All four output directories exist.</done>
</task>

<task type="auto">
  <name>Task 2: Customer app — archive, export, upload (build 1089)</name>
  <files>/tmp/dollor-archives/customer.xcarchive /tmp/dollor-ipas/customer/</files>
  <action>
    Run all three steps sequentially for the Customer app. Use timeout 600000 per command.
    Working directory: /Users/jeet/doordash-p2p

    Step 1 — Archive:
    ```
    xcodebuild archive \
      -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
      -scheme eatfaircustomer \
      -configuration Release \
      -archivePath /tmp/dollor-archives/customer.xcarchive \
      -destination 'generic/platform=iOS' \
      -allowProvisioningUpdates \
      CODE_SIGN_STYLE=Automatic \
      DEVELOPMENT_TEAM=PRKZ4UVCD7
    ```

    Step 2 — Export IPA:
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/customer.xcarchive \
      -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/customer \
      -allowProvisioningUpdates
    ```

    Step 3 — Upload to TestFlight:
    ```
    xcrun altool --upload-app \
      -f /tmp/dollor-ipas/customer/*.ipa \
      --apiKey 9K626GB728 \
      --apiIssuer 80d10e49-f379-462f-9668-5ea53016812e \
      --type ios
    ```

    If archive fails with code signing errors, ensure CODE_SIGN_STYLE=Automatic and
    DEVELOPMENT_TEAM=PRKZ4UVCD7 are set (already included above).
  </action>
  <verify>
    - Step 1: xcodebuild exits 0, /tmp/dollor-archives/customer.xcarchive exists.
    - Step 2: xcodebuild exits 0, an .ipa file exists under /tmp/dollor-ipas/customer/.
    - Step 3: altool output contains "No errors uploading" or "successfully uploaded".
  </verify>
  <done>
    Customer app build 1089 is uploaded to App Store Connect TestFlight. altool reports
    no errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Driver app — archive, export, upload (build 197)</name>
  <files>/tmp/dollor-archives/driver.xcarchive /tmp/dollor-ipas/driver/</files>
  <action>
    Run all three steps sequentially for the Driver app. Use timeout 600000 per command.
    Working directory: /Users/jeet/doordash-p2p

    Step 1 — Archive:
    ```
    xcodebuild archive \
      -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
      -scheme eatffairdelivery \
      -configuration Release \
      -archivePath /tmp/dollor-archives/driver.xcarchive \
      -destination 'generic/platform=iOS' \
      -allowProvisioningUpdates \
      CODE_SIGN_STYLE=Automatic \
      DEVELOPMENT_TEAM=PRKZ4UVCD7
    ```

    Step 2 — Export IPA:
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/driver.xcarchive \
      -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/driver \
      -allowProvisioningUpdates
    ```

    Step 3 — Upload to TestFlight:
    ```
    xcrun altool --upload-app \
      -f /tmp/dollor-ipas/driver/*.ipa \
      --apiKey 9K626GB728 \
      --apiIssuer 80d10e49-f379-462f-9668-5ea53016812e \
      --type ios
    ```
  </action>
  <verify>
    - Step 1: xcodebuild exits 0, /tmp/dollor-archives/driver.xcarchive exists.
    - Step 2: xcodebuild exits 0, an .ipa file exists under /tmp/dollor-ipas/driver/.
    - Step 3: altool output contains "No errors uploading" or "successfully uploaded".
  </verify>
  <done>
    Driver app build 197 is uploaded to App Store Connect TestFlight. altool reports
    no errors.
  </done>
</task>

<task type="auto">
  <name>Task 4: Restaurant app — archive, export, upload (build 165)</name>
  <files>/tmp/dollor-archives/restaurant.xcarchive /tmp/dollor-ipas/restaurant/</files>
  <action>
    Run all three steps sequentially for the Restaurant app. Use timeout 600000 per command.
    Working directory: /Users/jeet/doordash-p2p

    Step 1 — Archive (try workspace first; if "scheme not found" error, fall back to -project):

    Primary:
    ```
    xcodebuild archive \
      -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
      -scheme eatffairrestaurant \
      -configuration Release \
      -archivePath /tmp/dollor-archives/restaurant.xcarchive \
      -destination 'generic/platform=iOS' \
      -allowProvisioningUpdates \
      CODE_SIGN_STYLE=Automatic \
      DEVELOPMENT_TEAM=PRKZ4UVCD7
    ```

    Fallback (if primary fails with "scheme not found"):
    ```
    xcodebuild archive \
      -project apps/ios/restaurant/eatffairrestaurant.xcodeproj \
      -scheme eatffairrestaurant \
      -configuration Release \
      -archivePath /tmp/dollor-archives/restaurant.xcarchive \
      -destination 'generic/platform=iOS' \
      -allowProvisioningUpdates \
      CODE_SIGN_STYLE=Automatic \
      DEVELOPMENT_TEAM=PRKZ4UVCD7
    ```

    Step 2 — Export IPA:
    ```
    xcodebuild -exportArchive \
      -archivePath /tmp/dollor-archives/restaurant.xcarchive \
      -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
      -exportPath /tmp/dollor-ipas/restaurant \
      -allowProvisioningUpdates
    ```

    Step 3 — Upload to TestFlight:
    ```
    xcrun altool --upload-app \
      -f /tmp/dollor-ipas/restaurant/*.ipa \
      --apiKey 9K626GB728 \
      --apiIssuer 80d10e49-f379-462f-9668-5ea53016812e \
      --type ios
    ```
  </action>
  <verify>
    - Step 1: xcodebuild exits 0, /tmp/dollor-archives/restaurant.xcarchive exists.
    - Step 2: xcodebuild exits 0, an .ipa file exists under /tmp/dollor-ipas/restaurant/.
    - Step 3: altool output contains "No errors uploading" or "successfully uploaded".
  </verify>
  <done>
    Restaurant app build 165 is uploaded to App Store Connect TestFlight. altool reports
    no errors.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. Confirm three xcarchives exist:
   `ls -la /tmp/dollor-archives/`

2. Confirm three IPA files exist:
   `ls /tmp/dollor-ipas/customer/*.ipa /tmp/dollor-ipas/driver/*.ipa /tmp/dollor-ipas/restaurant/*.ipa`

3. Review altool output from each upload step — all three must show "No errors uploading" or
   "successfully uploaded".

4. Optionally verify in App Store Connect:
   Log in to https://appstoreconnect.apple.com → My Apps → each app → TestFlight.
   Builds 1089, 197, and 165 should appear (processing may take 5-15 minutes).
</verification>

<success_criteria>
- All three apps archived with xcodebuild, exit code 0
- All three IPA files exported successfully
- All three altool uploads return "No errors uploading"
- Builds visible in App Store Connect TestFlight (after processing delay)
- No source files modified, no git commit created
</success_criteria>

<output>
After completion, create `.planning/quick/13-archive-and-upload-all-3-ios-apps-to-tes/13-SUMMARY.md`

Include:
- Upload results for each app (build number, success/failure, altool output excerpt)
- Any fallback used (e.g., restaurant used -project instead of -workspace)
- Any errors encountered and how resolved
- Timestamp of completion
</output>
