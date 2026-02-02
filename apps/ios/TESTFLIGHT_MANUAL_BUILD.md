# iOS TestFlight Manual Build Guide

Quick reference for building and uploading iOS apps to TestFlight.

---

## Prerequisites

- Xcode installed with valid signing certificates
- Team ID: `PRKZ4UVCD7`
- Logged into App Store Connect in Xcode

---

## 1. Dollor Customer App

**Location:** `apps/ios/customer/`

### Check Current Build Number
```bash
grep "CURRENT_PROJECT_VERSION" apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj | head -1
```

### Increment Build Number
```bash
# Replace OLD with current, NEW with next number
cd apps/ios/customer
sed -i '' 's/CURRENT_PROJECT_VERSION = OLD/CURRENT_PROJECT_VERSION = NEW/g' eatfaircustomer.xcodeproj/project.pbxproj
```

### Build & Upload
```bash
cd apps/ios/customer

# Archive
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -configuration Release \
  -archivePath /tmp/eatfaircustomer.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7

# Export & Upload to TestFlight
xcodebuild -exportArchive \
  -archivePath /tmp/eatfaircustomer.xcarchive \
  -exportPath /tmp/eatfaircustomer-export \
  -exportOptionsPlist apps/ios/ExportOptions.plist
```

---

## 2. Dollor Driver App

**Location:** `apps/ios/delivery/`

### Check Current Build Number
```bash
grep "CURRENT_PROJECT_VERSION" apps/ios/delivery/eatffairdelivery.xcodeproj/project.pbxproj | head -1
```

### Increment Build Number
```bash
cd apps/ios/delivery
sed -i '' 's/CURRENT_PROJECT_VERSION = OLD/CURRENT_PROJECT_VERSION = NEW/g' eatffairdelivery.xcodeproj/project.pbxproj
```

### Build & Upload
```bash
cd apps/ios/delivery

# Archive
xcodebuild -workspace eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery \
  -configuration Release \
  -archivePath /tmp/eatffairdelivery.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7

# Export & Upload to TestFlight
xcodebuild -exportArchive \
  -archivePath /tmp/eatffairdelivery.xcarchive \
  -exportPath /tmp/eatffairdelivery-export \
  -exportOptionsPlist apps/ios/ExportOptions.plist
```

---

## 3. Dollor Restaurant App

**Location:** `apps/ios/restaurant/`

### Check Current Build Number
```bash
grep "CURRENT_PROJECT_VERSION" apps/ios/restaurant/eatffairrestaurant.xcodeproj/project.pbxproj | head -1
```

### Increment Build Number
```bash
cd apps/ios/restaurant
sed -i '' 's/CURRENT_PROJECT_VERSION = OLD/CURRENT_PROJECT_VERSION = NEW/g' eatffairrestaurant.xcodeproj/project.pbxproj
```

### Build & Upload
```bash
cd apps/ios/restaurant

# Archive
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -configuration Release \
  -archivePath /tmp/eatffairrestaurant.xcarchive \
  archive DEVELOPMENT_TEAM=PRKZ4UVCD7

# Export & Upload to TestFlight
xcodebuild -exportArchive \
  -archivePath /tmp/eatffairrestaurant.xcarchive \
  -exportPath /tmp/eatffairrestaurant-export \
  -exportOptionsPlist apps/ios/ExportOptions.plist
```

---

## Export Options Plist

Already saved at `apps/ios/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>PRKZ4UVCD7</string>
    <key>uploadSymbols</key>
    <true/>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
```

---

## Quick Reference Table

| App | Workspace | Scheme | Bundle ID |
|-----|-----------|--------|-----------|
| Customer | `eatfaircustomer.xcworkspace` | `eatfaircustomer` | `com.dollorai.customer` |
| Driver | `eatffairdelivery.xcworkspace` | `eatffairdelivery` | `com.dollorai.delivery` |
| Restaurant | `eatffairrestaurant.xcworkspace` | `eatffairrestaurant` | `com.dollorai.restaurant` |

---

## Current Build Numbers (as of 2026-02-01)

| App | Build |
|-----|-------|
| Customer | 1027 |
| Driver | 101 |
| Restaurant | 102 |

---

## Troubleshooting

### Code Signing Error with Pods
Add `DEVELOPMENT_TEAM=PRKZ4UVCD7` to the archive command (already included above).

### "No such module" Error
Run `pod install` in the app directory first:
```bash
cd apps/ios/customer && pod install
```

### Upload Fails
Ensure you're logged into App Store Connect in Xcode:
- Xcode → Settings → Accounts → Add Apple ID

---

*Last updated: 2026-02-01*
