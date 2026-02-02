# Dollor.ai iOS TestFlight Build Guide

## Build Summary - February 1, 2026

### Current Build Numbers
| App | Bundle ID | Build | Version |
|-----|-----------|-------|---------|
| **Dollor (Customer)** | `com.dollorai.customer` | 1030 | 1.0 |
| **Dollor Driver** | `com.dollorai.delivery` | 104 | 1.0 |
| **Dollor Restaurant** | `com.dollorai.restaurant` | 105 | 1.0 |

### Account Configuration
| Setting | Value |
|---------|-------|
| **Apple ID Account** | `support2dollorai` |
| **Team ID** | `PRKZ4UVCD7` |
| **Developer** | Jithesh Manoharan (GQ7PNUK7CZ) |
| **API Key ID** | `JFVA7628SX` |
| **Issuer ID** | `14d4d0a7-4fc9-4078-a8bc-e16f78e305a3` |

---

## How to Build Apps for TestFlight

### Prerequisites
1. Xcode installed with valid Apple Developer account
2. CocoaPods installed (`sudo gem install cocoapods`)
3. API Key at `/Users/jeet/.appstoreconnect/private_keys/AuthKey_JFVA7628SX.p8`

### Step 1: Bump Build Numbers
Update `CURRENT_PROJECT_VERSION` in each project's `project.pbxproj`:

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios

# Customer - check current and increment
grep "CURRENT_PROJECT_VERSION" customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1

# Use Edit tool or Xcode to increment all occurrences
```

### Step 2: Install Dependencies
```bash
# Customer App
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
pod install

# Driver App
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
pod install

# Restaurant App
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
pod install
```

### Step 3: Archive Apps (Use Workspace, NOT Project)

**IMPORTANT**: Must use `.xcworkspace` (not `.xcodeproj`) because apps use CocoaPods for GoogleMaps/GooglePlaces.

```bash
# Customer App (Build 1030)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -configuration Release \
  -archivePath build/DollorCustomer.xcarchive \
  archive -allowProvisioningUpdates

# Driver App (Build 104)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery \
  -configuration Release \
  -archivePath build/DollorDriver.xcarchive \
  archive -allowProvisioningUpdates

# Restaurant App (Build 105)
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -configuration Release \
  -archivePath build/DollorRestaurant.xcarchive \
  archive -allowProvisioningUpdates
```

### Step 4: Copy Archives to Xcode Organizer
```bash
ARCHIVE_DATE=$(date +%Y-%m-%d)
mkdir -p "/Users/jeet/Library/Developer/Xcode/Archives/$ARCHIVE_DATE"

cp -r apps/ios/customer/build/DollorCustomer.xcarchive \
  "/Users/jeet/Library/Developer/Xcode/Archives/$ARCHIVE_DATE/"

cp -r apps/ios/delivery/build/DollorDriver.xcarchive \
  "/Users/jeet/Library/Developer/Xcode/Archives/$ARCHIVE_DATE/"

cp -r apps/ios/restaurant/build/DollorRestaurant.xcarchive \
  "/Users/jeet/Library/Developer/Xcode/Archives/$ARCHIVE_DATE/"
```

### Step 5: Upload via Xcode Organizer
1. Open **Xcode → Window → Organizer** (Cmd+Shift+O)
2. Select the archive (e.g., "DollorCustomer")
3. Click **Distribute App**
4. Choose **TestFlight & App Store**
5. Select **Upload** (not Export)
6. Sign in with `support2dollorai` account when prompted
7. Wait for processing (~5-10 minutes)
8. Repeat for Driver and Restaurant apps

### Verification
After upload, check App Store Connect:
- https://appstoreconnect.apple.com → My Apps → [App Name] → TestFlight

---

## Recent Fixes (Build 1030)

### Map Tracking Blue Screen Fix
**Issue**: Customer saw blue screen (ocean at 0,0) when viewing order tracking if restaurant hadn't set GPS coordinates.

**Solution**: Added coordinate validation in `DeliveryTrackingView.swift`:
- Validates coordinates aren't at (0,0) or out of range
- Shows friendly placeholder with status message when no valid coordinates
- Falls back to showing any available valid location (restaurant, delivery address, or driver)

**File**: `apps/ios/customer/eatfaircustomer/Views/DeliveryTrackingView.swift`

---

## Troubleshooting

### "Unable to find module dependency: GoogleMaps"
**Cause**: Using `.xcodeproj` instead of `.xcworkspace`
**Fix**: Always use `-workspace *.xcworkspace` for archive commands

### "No accounts with App Store Connect"
**Cause**: Not signed in with correct Apple ID
**Fix**: In Xcode, go to Settings → Accounts → Add `support2dollorai`

### Build number already used
**Fix**: Increment `CURRENT_PROJECT_VERSION` in project.pbxproj (replace_all for all occurrences)

---

## Next Session Prompt

Copy and paste this to continue work in a new session:

```
I'm continuing iOS TestFlight builds for Dollor.ai apps.

Current build numbers (update if you built newer):
- Customer: 1030
- Driver: 104
- Restaurant: 105

Key info:
- Team ID: PRKZ4UVCD7
- Account: support2dollorai
- Bundle IDs: com.dollorai.customer, com.dollorai.delivery, com.dollorai.restaurant
- MUST use .xcworkspace (not .xcodeproj) due to CocoaPods

Reference: apps/ios/TESTFLIGHT_BUILD_GUIDE.md
Reference: apps/ios/CUSTOMER_APP_SOURCE_OF_TRUTH.md

[Describe what you need help with]
```

---

*Last Updated: February 1, 2026*
