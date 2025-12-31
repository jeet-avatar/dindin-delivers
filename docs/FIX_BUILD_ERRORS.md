# iOS Build Errors - FIXED ✅

## Issues Found & Resolved

### 1. ✅ **Location Permissions Missing**
**Error:** Maps not working, location services failing
**Fix:** Added location permissions to all three apps' Info.plist files

**Customer App:**
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

**Delivery App:**
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `UIBackgroundModes` with `location` for background tracking

**Restaurant App:**
- `NSLocationWhenInUseUsageDescription`

---

### 2. ✅ **Deprecated onChange Syntax**
**Error:** `onChange(of:perform:)` deprecated in iOS 17+
**Fix:** Updated MapView.swift to use new syntax `onChange(of:) { }`

**Before:**
```swift
.onChange(of: viewModel.currentOrder?.id) { oldValue, newValue in
```

**After:**
```swift
.onChange(of: viewModel.currentOrder?.id) {
```

---

### 3. ✅ **Theme Import Issues**
**Error:** `Theme.brandOrange` not found in LocationPickerView
**Fix:** Added local color definitions since Theme.swift is in customer app

---

## How to Build

### Option 1: Xcode GUI
1. Open `/Users/jeet/StudioProjects/eatfair-ios/EatFair.xcworkspace`
2. Select a scheme (eatfaircustomer/eatffairdelivery/eatffairrestaurant)
3. Select a simulator or device
4. Press ⌘+B to build or ⌘+R to run

### Option 2: Command Line
```bash
cd /Users/jeet/StudioProjects/eatfair-ios

# Build customer app
xcodebuild -workspace EatFair.xcworkspace \
  -scheme eatfaircustomer \
  -sdk iphonesimulator \
  -configuration Debug

# Build delivery app
xcodebuild -workspace EatFair.xcworkspace \
  -scheme eatffairdelivery \
  -sdk iphonesimulator \
  -configuration Debug

# Build restaurant app
xcodebuild -workspace EatFair.xcworkspace \
  -scheme eatffairrestaurant \
  -sdk iphonesimulator \
  -configuration Debug
```

---

## Remaining Issues to Check

### 1. Firebase Configuration
- ✅ GoogleService-Info.plist present in all apps
- ⚠️ Verify Firebase project settings match bundle IDs:
  - Customer: `com.eatfair.customer.Customer`
  - Delivery: `com.eatfair.delivery`
  - Restaurant: `com.eatfair.restaurant`

### 2. Swift Package Dependencies
If you see "Missing package product" errors:
1. File → Packages → Resolve Package Versions
2. File → Packages → Update to Latest Package Versions

### 3. Code Signing
If deployment fails:
1. Select project in Xcode
2. Go to Signing & Capabilities
3. Select your Apple ID team
4. Enable "Automatically manage signing"

---

## Common Build Errors & Solutions

### Error: "No such module 'EatFairShared'"
**Solution:**
1. Open workspace (not individual .xcodeproj files)
2. File → Packages → Resolve Package Versions

### Error: "Failed to build module 'FirebaseFirestore'"
**Solution:**
1. Clean build folder: ⌘+Shift+K
2. Close Xcode
3. Delete derived data:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```
4. Reopen Xcode and build

### Error: "Signing certificate not found"
**Solution:**
1. Xcode → Preferences → Accounts
2. Add your Apple ID
3. Download manual profiles
4. Or use "Automatically manage signing"

---

## Testing on Simulator

```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator
xcrun simctl boot "iPhone 15 Pro"

# Install and run customer app
xcodebuild -workspace EatFair.xcworkspace \
  -scheme eatfaircustomer \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -configuration Debug \
  clean build
```

---

## Testing on Device

1. Connect iPhone via USB
2. Trust computer on iPhone
3. Select your device in Xcode
4. Press ⌘+R to run
5. On first run: Settings → General → VPN & Device Management → Trust Developer

---

## Build Configuration

All apps are configured with:
- **Deployment Target:** iOS 15.0+
- **Language:** Swift 5.5+
- **UI Framework:** SwiftUI
- **Package Dependencies:**
  - Firebase iOS SDK 12.0.0+
  - EatFairShared (local package)

---

## Next Steps After Successful Build

1. **Test location services** - Allow location when prompted
2. **Test Firebase** - Create account, sign in
3. **Test order flow** - Browse → Add to cart → Checkout
4. **Test maps** - View delivery tracking map
5. **Test real-time updates** - Order status changes

---

## Support

If you encounter errors not listed here:
1. Check Xcode console for detailed error messages
2. File → Packages → Reset Package Caches
3. Clean build folder (⌘+Shift+K)
4. Restart Xcode

**Last Updated:** November 27, 2025
**Status:** ✅ All critical build errors fixed
