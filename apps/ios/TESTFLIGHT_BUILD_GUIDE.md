# Dollor.ai iOS TestFlight Build Guide

## Current Build Numbers (February 2, 2026)

| App | Bundle ID | Build | Version |
|-----|-----------|-------|---------|
| **Dollor (Customer)** | `com.dollorai.customer` | 1035 | 1.0 |
| **Dollor Driver** | `com.dollorai.delivery` | 111 | 1.0 |
| **Dollor Restaurant** | `com.dollorai.restaurant` | 111 | 1.0 |

---

## App Store Connect Configuration (VERIFIED WORKING)

| Setting | Value |
|---------|-------|
| **Team ID** | `PRKZ4UVCD7` |
| **API Key ID** | `9K626GB728` |
| **Issuer ID** | `80d10e49-f379-462f-9668-5ea53016812e` |
| **API Key File** | `~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8` |
| **API Key JSON** | `~/.appstoreconnect/private_keys/api_key.json` |

### API Key JSON Format
```json
{
  "key_id": "9K626GB728",
  "issuer_id": "80d10e49-f379-462f-9668-5ea53016812e",
  "key": "-----BEGIN PRIVATE KEY-----\n...(key content)...\n-----END PRIVATE KEY-----\n",
  "in_house": false
}
```

---

## App Locations

| App | Directory | Workspace | Scheme |
|-----|-----------|-----------|--------|
| **Customer** | `apps/ios/customer/` | `eatfaircustomer.xcworkspace` | `eatfaircustomer` |
| **Driver** | `apps/ios/delivery/` | `eatffairdelivery.xcworkspace` | `eatffairdelivery` |
| **Restaurant** | `apps/ios/restaurant/` | `eatffairrestaurant.xcworkspace` | `eatffairrestaurant` |

---

## Build & Upload Commands

### Step 1: Bump Build Numbers
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios

# Check current
grep "CURRENT_PROJECT_VERSION" customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -1
grep "CURRENT_PROJECT_VERSION" restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -1
```

### Step 2: Install Dependencies
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer && pod install
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery && pod install
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant && pod install
```

### Step 3: Archive All Apps
```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace -scheme eatfaircustomer -configuration Release -archivePath build/DollorCustomer.xcarchive archive -allowProvisioningUpdates

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace -scheme eatffairdelivery -configuration Release -archivePath build/DollorDriver.xcarchive archive -allowProvisioningUpdates

# Restaurant
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace -scheme eatffairrestaurant -configuration Release -archivePath build/DollorRestaurant.xcarchive archive -allowProvisioningUpdates
```

### Step 4: Export IPAs
```bash
# Customer
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -exportArchive -archivePath build/DollorCustomer.xcarchive -exportPath build/export -exportOptionsPlist ExportOptionsLocal.plist

# Driver
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
xcodebuild -exportArchive -archivePath build/DollorDriver.xcarchive -exportPath build/export -exportOptionsPlist ../customer/ExportOptionsLocal.plist

# Restaurant
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
xcodebuild -exportArchive -archivePath build/DollorRestaurant.xcarchive -exportPath build/export -exportOptionsPlist ../customer/ExportOptionsLocal.plist
```

### Step 5: Upload to TestFlight

**IMPORTANT:** Use absolute paths to avoid "file not found" errors from wrong directory.

```bash
# Customer
fastlane run upload_to_testflight \
  ipa:/Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer/build/export/Dollor.ipa \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true

# Driver
fastlane run upload_to_testflight \
  ipa:"/Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery/build/export/Dollor Driver.ipa" \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true

# Restaurant
fastlane run upload_to_testflight \
  ipa:/Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant/build/export/eatffairrestaurant.ipa \
  api_key_path:/Users/jeet/.appstoreconnect/private_keys/api_key.json \
  skip_waiting_for_build_processing:true
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Could not find ipa file at path" | Use absolute paths for IPA files, not relative paths |
| "Unable to find module dependency: GoogleMaps" | Use `.xcworkspace` not `.xcodeproj` |
| "Couldn't find app on the account" | Check `api_key.json` has key_id `9K626GB728` and issuer_id `80d10e49-f379-462f-9668-5ea53016812e` |
| "API key JSON is missing field: key" | JSON must contain actual key content, not filepath |
| "Build number already used" | Increment `CURRENT_PROJECT_VERSION` in project.pbxproj |

---

## Next Session Prompt

```
Continuing iOS TestFlight builds for Dollor.ai apps.

Build numbers:
- Customer: 1035
- Driver: 111
- Restaurant: 111

API Config (VERIFIED):
- Key ID: 9K626GB728
- Issuer ID: 80d10e49-f379-462f-9668-5ea53016812e
- Team ID: PRKZ4UVCD7

Reference: apps/ios/TESTFLIGHT_BUILD_GUIDE.md
```

---

*Last Updated: February 2, 2026*
