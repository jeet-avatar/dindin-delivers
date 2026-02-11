# Dollor Restaurant App - Source of Truth

> **Last Updated:** 2026-01-28
> **Current Build:** 17 (Version 1.0)
> **Status:** TestFlight / Production
> **Account:** support@dollor.ai

---

## App Identity (Build 17 - VERIFIED FROM ARCHIVE)

| Property | Value |
|----------|-------|
| **App Name** | Dollor Business |
| **Display Name** | Dollor Business |
| **Bundle Name** | eatffairrestaurant |
| **Bundle ID** | `com.dollorai.restaurant` |
| **Version** | 1.0 |
| **Build Number** | 17 |
| **Minimum iOS** | 17.0 |
| **App Store Connect ID** | `6758357924` |

> **IMPORTANT:** Bundle ID is `com.dollorai.restaurant` (with "ai") - same pattern as Customer app

---

## Apple Developer Configuration (Build 17)

| Property | Value |
|----------|-------|
| **Team ID** | `PRKZ4UVCD7` |
| **Account** | support2dollorai (App Store submission account) |
| **Application Identifier** | `PRKZ4UVCD7.com.dollorai.restaurant` |
| **Code Sign Style** | Automatic |

> **IMPORTANT:** Uses same Team ID as Customer app (`PRKZ4UVCD7`), NOT `PRKZ4UVCD7`

---

## Google/Firebase Configuration (Build 17 - VERIFIED)

| Property | Value |
|----------|-------|
| **Firebase Project** | `dollorai-production` |
| **Google App ID** | `1:65740760476:ios:17093713b66b4d8e42d459` |
| **GCM Sender ID** | `65740760476` |
| **Storage Bucket** | `dollorai-production.firebasestorage.app` |

### Google OAuth (Build 17 - VERIFIED)

| Property | Value |
|----------|-------|
| **iOS Client ID** | `65740760476-notp45u35afmee902jqkrkqhkp9lo1t2.apps.googleusercontent.com` |
| **Reversed Client ID (URL Scheme)** | `com.googleusercontent.apps.65740760476-notp45u35afmee902jqkrkqhkp9lo1t2` |
| **Android Client ID** | `65740760476-7t1cvgv5h86s6qhncmgbori9a060no1u.apps.googleusercontent.com` |
| **API Key** | `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` |

> **IMPORTANT:** Restaurant app uses DIFFERENT Google Client ID than Customer app!

---

## Entitlements (Production)

```xml
<!-- eatffairrestaurant.entitlements -->
<key>aps-environment</key>
<string>production</string>

<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

> **Note:** Restaurant app does NOT have Apple Pay merchant capability (restaurants don't pay through the app).

---

## Info.plist Configuration (Build 17 - ACTUAL)

### App Identity Keys

```xml
<key>CFBundleDisplayName</key>
<string>Dollor Business</string>

<key>CFBundleName</key>
<string>eatffairrestaurant</string>

<key>CFBundleIdentifier</key>
<string>com.dollorai.restaurant</string>

<key>CFBundleVersion</key>
<string>17</string>

<key>CFBundleShortVersionString</key>
<string>1.0</string>

<key>MinimumOSVersion</key>
<string>17.0</string>
```

### Required Keys

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<key>LSRequiresIPhoneOS</key>
<true/>

<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>

<key>UIRequiresFullScreen</key>
<true/>
```

### Permission Descriptions (All Present in Build 17)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Dollor AI Restaurant needs your location to show your restaurant address and provide accurate delivery estimates.</string>

<key>NSCameraUsageDescription</key>
<string>Camera access allows you to take photos of menu items and restaurant interior.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access allows you to upload menu item photos and restaurant images.</string>
```

> **Note:** Restaurant app has FEWER permissions than Customer app (no microphone, speech, contacts).

### URL Schemes (Build 17)

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.65740760476-notp45u35afmee902jqkrkqhkp9lo1t2</string>
        </array>
    </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
    <string>tel</string>
    <string>sms</string>
</array>
```

### Orientation Support

```xml
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
</array>

<key>UISupportedInterfaceOrientations~ipad</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<key>UISupportedInterfaceOrientations~iphone</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

### Background Modes

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### App Transport Security

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>amazonaws.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
            <key>NSIncludesSubdomains</key>
            <true/>
        </dict>
    </dict>
</dict>
```

---

## GoogleService-Info.plist (Build 17 - ACTUAL)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>CLIENT_ID</key>
    <string>65740760476-notp45u35afmee902jqkrkqhkp9lo1t2.apps.googleusercontent.com</string>

    <key>REVERSED_CLIENT_ID</key>
    <string>com.googleusercontent.apps.65740760476-notp45u35afmee902jqkrkqhkp9lo1t2</string>

    <key>ANDROID_CLIENT_ID</key>
    <string>65740760476-7t1cvgv5h86s6qhncmgbori9a060no1u.apps.googleusercontent.com</string>

    <key>API_KEY</key>
    <string>AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4</string>

    <key>GCM_SENDER_ID</key>
    <string>65740760476</string>

    <key>BUNDLE_ID</key>
    <string>com.dollorai.restaurant</string>

    <key>PROJECT_ID</key>
    <string>dollorai-production</string>

    <key>STORAGE_BUCKET</key>
    <string>dollorai-production.firebasestorage.app</string>

    <key>GOOGLE_APP_ID</key>
    <string>1:65740760476:ios:17093713b66b4d8e42d459</string>

    <key>IS_ADS_ENABLED</key>
    <false/>

    <key>IS_ANALYTICS_ENABLED</key>
    <false/>

    <key>IS_APPINVITE_ENABLED</key>
    <true/>

    <key>IS_GCM_ENABLED</key>
    <true/>

    <key>IS_SIGNIN_ENABLED</key>
    <true/>
</dict>
</plist>
```

---

## API Configuration

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.dollor.ai` |
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` |
| **Development** | `https://dev-api.dollor.ai` |

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/vendors/google-auth` | Google Sign-In authentication |
| `/api/vendors/apple-auth` | Apple Sign-In authentication |
| `/api/vendors/orders` | Vendor orders management |
| `/api/vendors/menu` | Menu management |
| `/api/vendors/{id}/analytics` | Vendor analytics |
| `/api/vendors/{id}/ai-insights` | AI insights |
| `/api/config` | App configuration |

---

## Build Commands

### TestFlight Upload (Fastlane)

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant
bundle exec fastlane beta
```

### Manual Build

```bash
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -configuration Release \
  -archivePath build/DollorRestaurant.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/DollorRestaurant.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist
```

---

## Project Structure

| Component | Path |
|-----------|------|
| **Xcode Project** | `eatffairrestaurant.xcodeproj` |
| **Workspace** | `eatffairrestaurant.xcworkspace` |
| **Source Files** | `eatffairrestaurant/` |
| **Entitlements** | `eatffairrestaurant/eatffairrestaurant.entitlements` |
| **Info.plist** | `eatffairrestaurant/Info.plist` |
| **GoogleService-Info** | `eatffairrestaurant/GoogleService-Info.plist` |

> **Note:** Project uses double 'f' in name: `eatffairrestaurant` (typo from original setup).

---

## Version History

| Build | Version | Date | Status | Notes |
|-------|---------|------|--------|-------|
| 17 | 1.0 | 2026-01-28 | Current | Production TestFlight |
| 15 | 1.0 | 2026-01-28 | Archived | Previous upload |
| 14 | 1.0 | 2026-01-28 | Archived | Archive exists |

---

## Legal URLs (Required for App Store)

| Document | URL |
|----------|-----|
| **Terms of Service** | `https://api.dollor.ai/terms` |
| **Restaurant Terms** | `https://dollor.ai/restaurant-terms` |
| **Privacy Policy** | `https://api.dollor.ai/privacy` |
| **Support** | `https://api.dollor.ai/support` |
| **Support Email** | `support@dollor.ai` |

---

## Restaurant Platform Fee

- Restaurant Fee: **$1 flat** per order received
- All payments processed through Stripe Connect
- Restaurants receive payouts minus $1 platform fee

---

## Key Differences from Customer App

| Feature | Customer App | Restaurant App |
|---------|--------------|----------------|
| Bundle ID | `com.dollorai.customer` | `com.dollorai.restaurant` |
| Team ID | `PRKZ4UVCD7` | `PRKZ4UVCD7` (SAME) |
| Google Client ID | `...0cnsrucn1tvadbf193cgio2siosnjg02` | `...notp45u35afmee902jqkrkqhkp9lo1t2` |
| Google App ID | `...973eaffa167f09b142d459` | `...17093713b66b4d8e42d459` |
| API Key | `AIzaSyCELfWMuckt-Bbx5tyuiOSS3sYNywxVTXc` | `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` |
| Apple Pay | Yes (`merchant.com.dollorai.customer`) | No |
| Location Permission | Always + When In Use | When In Use only |
| Microphone | Yes | No |
| Speech Recognition | Yes | No |
| Contacts | Yes | No |
| Google Maps Query | Yes | No |

---

## Checklist Before Submitting New Build

- [ ] Bundle ID is `com.dollorai.restaurant` (with "ai")
- [ ] Team ID is `PRKZ4UVCD7` (support2dollorai account)
- [ ] Google Client ID is `65740760476-notp45u35afmee902jqkrkqhkp9lo1t2`
- [ ] All Info.plist permission descriptions present
- [ ] GoogleService-Info.plist matches this document
- [ ] URL Scheme matches Reversed Client ID
- [ ] ITSAppUsesNonExemptEncryption = false
- [ ] Increment build number (18 for next submission)

---

## Critical Notes

1. **Bundle ID**: `com.dollorai.restaurant` (with "ai") - NOT `com.dollor.restaurant`
2. **Team ID**: `PRKZ4UVCD7` - NOT `PRKZ4UVCD7`
3. **Google Client ID**: `65740760476-notp45u35afmee902jqkrkqhkp9lo1t2` - Different from Customer app
4. **API Key**: `AIzaSyA0j4nKeV5N9UKpNFCDTcMVxtBfR9BI8Z4` - Different from Customer app

---

## Project Files Sync Warning

The project files in the repo may be OUT OF SYNC with the actual production build. Before building, ensure:

1. `project.pbxproj` has correct Bundle ID: `com.dollorai.restaurant`
2. `project.pbxproj` has correct Team ID: `PRKZ4UVCD7`
3. `GoogleService-Info.plist` matches this document exactly
4. `Info.plist` URL Scheme matches: `com.googleusercontent.apps.65740760476-notp45u35afmee902jqkrkqhkp9lo1t2`

---

**VERIFIED FROM ACTUAL BUILD 17 ARCHIVE**
**Archive Path:** `~/Library/Developer/Xcode/Archives/2026-01-28/`

---

**END OF DOCUMENT**
