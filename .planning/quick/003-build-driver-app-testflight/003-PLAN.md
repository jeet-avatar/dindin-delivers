---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
autonomous: true

must_haves:
  truths:
    - "Driver app build 146 is uploaded to TestFlight"
    - "Build number is incremented from 145 to 146"
  artifacts:
    - path: "apps/ios/delivery/build/export/Dollor Driver.ipa"
      provides: "Signed IPA for TestFlight"
    - path: "apps/ios/delivery/build/DollorDriver.xcarchive"
      provides: "Archived app bundle"
  key_links:
    - from: "project.pbxproj"
      to: "archive"
      via: "CURRENT_PROJECT_VERSION = 146"
---

<objective>
Build Driver app (build 146) and upload to TestFlight

Purpose: Deploy latest Driver app version for testing
Output: Build 146 available on TestFlight for testers
</objective>

<context>
@apps/ios/TESTFLIGHT_BUILD_GUIDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump build number and archive Driver app</name>
  <files>
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/delivery/build/DollorDriver.xcarchive
  </files>
  <action>
    1. Update CURRENT_PROJECT_VERSION from 145 to 146 in project.pbxproj (all 6 occurrences)
    2. Run pod install in apps/ios/delivery/
    3. Archive the app:
       ```
       cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
       xcodebuild -workspace eatffairdelivery.xcworkspace \
         -scheme eatffairdelivery \
         -configuration Release \
         -archivePath build/DollorDriver.xcarchive \
         archive \
         -allowProvisioningUpdates
       ```
  </action>
  <verify>Archive exists at apps/ios/delivery/build/DollorDriver.xcarchive</verify>
  <done>Driver app archived successfully with build 146</done>
</task>

<task type="auto">
  <name>Task 2: Export IPA and upload to TestFlight</name>
  <files>
    apps/ios/delivery/build/export/Dollor Driver.ipa
  </files>
  <action>
    1. Export IPA from archive:
       ```
       cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
       xcodebuild -exportArchive \
         -archivePath build/DollorDriver.xcarchive \
         -exportPath build/export \
         -exportOptionsPlist ../customer/ExportOptionsLocal.plist
       ```

    2. Upload to TestFlight using fastlane:
       ```
       fastlane run upload_to_testflight \
         ipa:"/Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/build/export/Dollor Driver.ipa" \
         api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
         skip_waiting_for_build_processing:true
       ```
  </action>
  <verify>Fastlane reports successful upload to App Store Connect</verify>
  <done>Driver app build 146 uploaded to TestFlight</done>
</task>

</tasks>

<verification>
- Build number shows 146 in project.pbxproj
- Archive created at apps/ios/delivery/build/DollorDriver.xcarchive
- IPA exported to apps/ios/delivery/build/export/Dollor Driver.ipa
- Fastlane upload completes successfully
</verification>

<success_criteria>
Driver app build 146 uploaded to TestFlight and processing in App Store Connect
</success_criteria>

<output>
After completion, update apps/ios/TESTFLIGHT_BUILD_GUIDE.md with new build number (146)
</output>
