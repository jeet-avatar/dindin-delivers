---
phase: quick-20
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
  - apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
  - apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
autonomous: true
requirements: [QUICK-20]
---

<objective>
Bump build numbers for all 3 iOS apps, archive them with Release configuration, and upload to TestFlight via xcodebuild -exportArchive.

Current builds: Customer 1089→1090, Driver 197→198, Restaurant 165→166.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Bump build numbers for all 3 iOS apps</name>
  <files>
    apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj
    apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj
    apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj
  </files>
  <action>
Replace CURRENT_PROJECT_VERSION in all 3 pbxproj files:
- Customer: 1089 → 1090 (all 6 occurrences)
- Driver: 197 → 198 (all 6 occurrences)
- Restaurant: 165 → 166 (all 6 occurrences)
  </action>
  <verify>
grep -c "CURRENT_PROJECT_VERSION = 1090" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj  # expect 6
grep -c "CURRENT_PROJECT_VERSION = 198" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj  # expect 6
grep -c "CURRENT_PROJECT_VERSION = 166" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj  # expect 6
  </verify>
  <done>All 3 apps have bumped build numbers.</done>
</task>

<task type="auto">
  <name>Task 2: Archive and upload Customer app to TestFlight</name>
  <files>None (build artifacts only)</files>
  <action>
```bash
xcodebuild archive \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/customer \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```
  </action>
  <verify>Check for EXPORT SUCCEEDED and upload confirmation in output.</verify>
  <done>Customer app 1090 uploaded to TestFlight.</done>
</task>

<task type="auto">
  <name>Task 3: Archive and upload Driver app to TestFlight</name>
  <files>None (build artifacts only)</files>
  <action>
```bash
xcodebuild archive \
  -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/driver \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```
  </action>
  <verify>Check for EXPORT SUCCEEDED and upload confirmation in output.</verify>
  <done>Driver app 198 uploaded to TestFlight.</done>
</task>

<task type="auto">
  <name>Task 4: Archive and upload Restaurant app to TestFlight</name>
  <files>None (build artifacts only)</files>
  <action>
```bash
xcodebuild archive \
  -workspace apps/ios/restaurant/eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant -configuration Release \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/restaurant.xcarchive \
  -exportOptionsPlist apps/ios/restaurant/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/restaurant \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```
  </action>
  <verify>Check for EXPORT SUCCEEDED and upload confirmation in output.</verify>
  <done>Restaurant app 166 uploaded to TestFlight.</done>
</task>

</tasks>

<output>
After completion, create .planning/quick/20-bump-build-numbers-archive-and-upload-al/20-SUMMARY.md
</output>
