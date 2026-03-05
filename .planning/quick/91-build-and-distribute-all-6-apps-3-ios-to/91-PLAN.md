---
phase: quick-91
plan: 91
type: execute
wave: 1
depends_on: []
autonomous: true
---

<objective>
Build and distribute all 6 apps with Wave 1 Payment Safety changes. 3 iOS apps to TestFlight, 3 Android APKs to Firebase App Distribution. Do NOT submit for App Store review.

Current builds: iOS Customer 1110, Driver 213, Restaurant 183. Android Customer vC=33, Driver vC=30, Partner vC=26.
New builds: iOS Customer 1111, Driver 214, Restaurant 184. Android Customer vC=34, Driver vC=31, Partner vC=27.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Build and upload 3 iOS apps to TestFlight</name>
  <files>
    apps/ios/customer/
    apps/ios/delivery/
    apps/ios/restaurant/
  </files>
  <action>
First, push all code to origin/main so TestFlight builds include latest changes:
```bash
git push origin main
```

Then archive and upload each iOS app in sequence. Use CLAUDE.md build commands.

**Increment build numbers first:**
- Customer: Info.plist CFBundleVersion → 1111
- Driver: Info.plist CFBundleVersion → 214
- Restaurant: Info.plist CFBundleVersion → 184

**Customer App:**
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

**Driver App:**
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

**Restaurant App:**
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

Do NOT submit for App Store review. TestFlight upload only.
  </action>
  <verify>
    Check archive and export logs for "Export succeeded" or upload confirmation.
  </verify>
  <done>All 3 iOS apps archived and uploaded to TestFlight.</done>
</task>

<task type="auto">
  <name>Task 2: Build and upload 3 Android APKs to Firebase</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/app/
    /Users/jeet/StudioProjects/eatfair-android/driver/
    /Users/jeet/StudioProjects/eatfair-android/partner/
  </files>
  <action>
**Increment version codes first** in each module's build.gradle:
- Customer: versionCode → 34, versionName → "1.0.33"
- Driver: versionCode → 31, versionName → "1.0.30"
- Partner: versionCode → 27, versionName → "1.0.26"

**Build all 3 release APKs:**
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew assembleRelease
```

**Upload to Firebase App Distribution:**
```bash
firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Customer v1.0.33 — Wave 1 Payment Safety: price change detection, vendor offline handling" \
  --project dollorai-production

firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Driver v1.0.30 — Wave 1 Payment Safety updates" \
  --project dollorai-production

firebase appdistribution:distribute partner/build/outputs/apk/release/partner-release.apk \
  --app "1:65740760476:android:8591cc17fa4f8d4c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "Partner v1.0.26 — Wave 1 Payment Safety updates" \
  --project dollorai-production
```
  </action>
  <verify>
    Firebase CLI outputs release URLs for all 3 apps.
  </verify>
  <done>All 3 Android APKs built and uploaded to Firebase App Distribution.</done>
</task>

</tasks>

<success_criteria>
- All 3 iOS apps uploaded to TestFlight (Customer 1111, Driver 214, Restaurant 184)
- All 3 Android APKs uploaded to Firebase (Customer vC=34, Driver vC=31, Partner vC=27)
- NO App Store review submission
</success_criteria>
