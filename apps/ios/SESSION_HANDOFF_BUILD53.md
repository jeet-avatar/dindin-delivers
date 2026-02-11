# SESSION HANDOFF - Restaurant App Build 53

## GSD PRIORITY: Fix Login Issues

### Current Status
- **Build 52** uploaded to TestFlight but **LOGINS NOT WORKING**
- KOT (Kitchen Order Ticket) integration code added but needs testing after login fix
- Build 53 archive in progress when session ended

---

## CRITICAL ISSUES TO FIX

### 1. Restaurant App Login Not Working

**Symptoms:**
- Google Sign-In not working
- Apple Sign-In not working
- Demo password (`demo.restaurant@dollor.ai` / `DemoRestaurant2025!`) not working

**Previous Fixes Applied (verify these are in Build 52):**

1. **URL Encoding Fix** (`P2PAPIService.swift:vendorLogin`):
   ```swift
   // Must use custom CharacterSet - .urlQueryAllowed does NOT encode !
   var allowedCharacters = CharacterSet.alphanumerics
   allowedCharacters.insert(charactersIn: "-._~")
   let encodedEmail = email.addingPercentEncoding(withAllowedCharacters: allowedCharacters) ?? email
   let encodedPassword = password.addingPercentEncoding(withAllowedCharacters: allowedCharacters) ?? password
   ```

2. **Apple Sign-In Identity Token** (`LoginView.swift`):
   - Must extract and send `identityToken` for returning users
   - Apple only provides email on FIRST sign-in

3. **Backend Apple Auth** (`main_new.py`):
   - Must decode JWT identity_token to extract email

**Files to Check:**
- `apps/ios/restaurant/eatffairrestaurant/Views/LoginView.swift`
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift`
- `apps/web/p2p-platform/backend/main_new.py`

---

## VERIFICATION STEPS

### 1. Test Backend Endpoints Directly
```bash
# Test demo login
curl -X POST "https://api.dollor.ai/api/auth/vendor/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo.restaurant%40dollor.ai&password=DemoRestaurant2025%21"

# Check vendor Google auth endpoint exists
curl -X POST "https://api.dollor.ai/api/auth/vendor/google-auth" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","google_id":"123"}'

# Check vendor Apple auth endpoint exists
curl -X POST "https://api.dollor.ai/api/auth/vendor/apple-auth" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","apple_id":"123"}'
```

### 2. Check Source of Truth
```
apps/ios/RESTAURANT_APP_SOURCE_OF_TRUTH.md
```

**Required Config:**
- Bundle ID: `com.dollorai.restaurant`
- Google OAuth Client ID: `65740760476-notp45u35afmee902jqkrkqhkp9lo1t2.apps.googleusercontent.com`
- URL Scheme: `com.googleusercontent.apps.65740760476-notp45u35afmee902jqkrkqhkp9lo1t2`

---

## BUILD & UPLOAD COMMANDS

```bash
cd /Users/jeet/StudioProjects/eatfair-ios/apps/ios/restaurant

# Bump build number (currently 53)
sed -i '' 's/CURRENT_PROJECT_VERSION = 53;/CURRENT_PROJECT_VERSION = 54;/g' eatffairrestaurant.xcodeproj/project.pbxproj

# Build archive (use workspace for CocoaPods)
xcodebuild archive \
  -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -configuration Release \
  -archivePath ~/Desktop/eatffairrestaurant_build54.xcarchive \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=PRKZ4UVCD7

# Open in Xcode Organizer for upload
open ~/Desktop/eatffairrestaurant_build54.xcarchive
```

**Upload Steps:**
1. Click "Distribute App"
2. Select "App Store Connect"
3. **UNCHECK** "Manage Version and Build Number"
4. Upload

---

## DEMO CREDENTIALS

```
Email: demo.restaurant@dollor.ai
Password: DemoRestaurant2025!
```

**Note:** The `!` character must be URL-encoded as `%21` in form-urlencoded requests.

---

## GIT STATUS

- KOT integration committed but P2PAPIService.swift had merge conflicts
- Need to verify KOT methods are present after conflict resolution
- Current build number: 53

---

## NEXT SESSION START PROMPT

```
GSD MODE: Fix Restaurant App Login

Build 52 is on TestFlight but logins don't work:
1. Demo password not authenticating
2. Google Sign-In failing
3. Apple Sign-In failing

Priority tasks:
1. Verify backend endpoints work via curl
2. Check P2PAPIService.swift has URL encoding fix for ! character
3. Check LoginView.swift sends identity token for Apple Sign-In
4. Rebuild as Build 54 and upload to TestFlight

Source of truth: apps/ios/RESTAURANT_APP_SOURCE_OF_TRUTH.md
```
