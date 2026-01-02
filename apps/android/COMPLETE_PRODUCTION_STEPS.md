# Complete Production Steps - Nothing Missed
## Dollor.ai Android Customer App

**App:** Dollor.ai
**Package:** ai.dollor.customer
**Company:** Vibing World Inc
**Version:** 1.0.1

---

## PHASE 1: PREREQUISITES

### 1.1 Accounts Required
| Account | URL | Status | Action |
|---------|-----|--------|--------|
| Google Play Developer | https://play.google.com/console | [ ] | $25 one-time fee, register as Vibing World Inc |
| Firebase Console | https://console.firebase.google.com | [ ] | Add ai.dollor.customer to project |
| Stripe Dashboard | https://dashboard.stripe.com | [ ] | Get production API keys |
| Google Cloud Console | https://console.cloud.google.com | [ ] | Get Maps API key & OAuth Client ID |
| Domain (dollor.ai) | Your registrar | [ ] | Ensure DNS is configured |
| Web Hosting | Your host | [ ] | For legal pages |

### 1.2 Email Accounts Required
| Email | Purpose |
|-------|---------|
| support@dollor.ai | Customer support, Play Store contact |
| privacy@dollor.ai | Privacy requests (CCPA/GDPR) |
| legal@dollor.ai | Legal inquiries |
| noreply@dollor.ai | Transactional emails |

---

## PHASE 2: FIREBASE CONFIGURATION

### 2.1 Add Production Package to Firebase

**Steps:**
1. Go to https://console.firebase.google.com
2. Select your project (eatfair-app or create new)
3. Click ⚙️ gear → **Project settings**
4. Scroll to **Your apps** section
5. Click **+ Add app** → Select **Android**
6. Fill in:
   - Package name: `ai.dollor.customer`
   - App nickname: `Dollor.ai Customer (Production)`
   - Debug signing certificate: Skip for now
7. Click **Register app**
8. Click **Download google-services.json**
9. Save to: `/Users/jeet/StudioProjects/eatfair-android/app/src/production/google-services.json`

### 2.2 Verify File
```bash
cat /Users/jeet/StudioProjects/eatfair-android/app/src/production/google-services.json | grep package_name
# Should show: "package_name": "ai.dollor.customer"
```

---

## PHASE 3: RELEASE KEYSTORE

### 3.1 Generate Keystore

**Run this command:**
```bash
cd /Users/jeet/StudioProjects/eatfair-android

keytool -genkey -v \
  -keystore dollor-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias dollor-customer \
  -storepass YOUR_SECURE_PASSWORD_HERE \
  -keypass YOUR_SECURE_PASSWORD_HERE \
  -dname "CN=Dollor.ai, OU=Mobile Development, O=Vibing World Inc, L=San Francisco, ST=California, C=US"
```

**Replace:**
- `YOUR_SECURE_PASSWORD_HERE` with a strong password (save it securely!)

### 3.2 Verify Keystore
```bash
keytool -list -v -keystore dollor-release.jks -alias dollor-customer
# Enter password when prompted
```

### 3.3 Get SHA-1 for Firebase
```bash
keytool -list -v -keystore dollor-release.jks -alias dollor-customer | grep SHA1
```
Add this SHA-1 to Firebase Console → Project Settings → Your apps → ai.dollor.customer → Add fingerprint

### 3.4 Backup Keystore
**CRITICAL:** Back up these files securely:
- `dollor-release.jks`
- Passwords (use password manager)
- This cannot be regenerated! If lost, you cannot update the app.

---

## PHASE 4: API KEYS CONFIGURATION

### 4.1 Update local.properties

Edit `/Users/jeet/StudioProjects/eatfair-android/local.properties`:

```properties
sdk.dir=/Users/jeet/Library/Android/sdk

# ============================================================
# Release Signing Configuration
# ============================================================
RELEASE_KEYSTORE_PATH=/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks
RELEASE_KEYSTORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=dollor-customer
RELEASE_KEY_PASSWORD=your_key_password

# ============================================================
# API Keys - PRODUCTION
# ============================================================
# Google Maps (from Google Cloud Console)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Stripe (from Stripe Dashboard → Developers → API keys)
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Google OAuth (from Google Cloud Console → Credentials)
GOOGLE_WEB_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com
```

### 4.2 Where to Get Each Key

**Google Maps API Key:**
1. Go to https://console.cloud.google.com
2. Select your project
3. APIs & Services → Credentials
4. Create Credentials → API Key
5. Restrict to: Maps SDK for Android
6. Add package: ai.dollor.customer + SHA-1

**Stripe Publishable Key:**
1. Go to https://dashboard.stripe.com
2. Developers → API keys
3. Toggle to "Live mode"
4. Copy "Publishable key" (starts with pk_live_)

**Google OAuth Client ID:**
1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials
3. Create Credentials → OAuth client ID
4. Application type: Web application
5. Copy the Client ID

---

## PHASE 5: LEGAL PAGES

### 5.1 Pages to Create on dollor.ai

| URL | Content Source | Status |
|-----|----------------|--------|
| https://dollor.ai/privacy | `docs/legal/PRIVACY_POLICY.md` | [ ] |
| https://dollor.ai/terms | `docs/legal/TERMS_OF_SERVICE.md` | [ ] |
| https://dollor.ai/support | Create FAQ/contact page | [ ] |

### 5.2 Verify Pages Are Live
```bash
curl -I https://dollor.ai/privacy
curl -I https://dollor.ai/terms
# Should return HTTP 200
```

---

## PHASE 6: PLAY STORE GRAPHICS

### 6.1 Required Graphics

| Asset | Dimensions | Format | Status |
|-------|------------|--------|--------|
| Hi-res icon | 512 x 512 | PNG (no alpha) | [ ] |
| Feature graphic | 1024 x 500 | PNG or JPG | [ ] |
| Phone screenshot 1 | 1080 x 1920 (or similar) | PNG or JPG | [ ] |
| Phone screenshot 2 | 1080 x 1920 (or similar) | PNG or JPG | [ ] |
| (Optional) More screenshots | 1080 x 1920 | PNG or JPG | [ ] |
| (Optional) Tablet screenshots | Various | PNG or JPG | [ ] |
| (Optional) Promo video | YouTube URL | Link | [ ] |

### 6.2 Create Hi-res Icon (512x512)

Export from existing icon or recreate:
- Dark circle background (#1A1A1A)
- Gold dollar sign (#FFD700)
- No transparency
- No rounded corners (Play Store adds them)

### 6.3 Create Feature Graphic (1024x500)

Design elements:
- Background: Dark or orange gradient
- Logo: Dollor.ai icon
- Text: "No Commission. Just $1."
- Subtitle: "Food Delivery & Rideshare"

### 6.4 Capture Screenshots

Screens to capture:
1. Home screen with restaurants
2. Restaurant menu with items
3. Cart showing $1 fee
4. Order tracking with map
5. Rideshare request screen
6. Profile screen

Tips:
- Use staging app with good demo data
- Clean status bar or use device frame mockup
- Add text overlays highlighting features

### 6.5 Save Graphics

Save to:
```
app/src/main/play/listings/en-US/graphics/
├── icon/icon.png                    (512x512)
├── feature-graphic/feature.png      (1024x500)
└── phone-screenshots/
    ├── 1.png
    ├── 2.png
    └── ...
```

---

## PHASE 7: BUILD RELEASE

### 7.1 Clean Build
```bash
cd /Users/jeet/StudioProjects/eatfair-android
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

./gradlew clean
```

### 7.2 Build Production AAB (for Play Store)
```bash
./gradlew :app:bundleProductionRelease
```

Output: `app/build/outputs/bundle/productionRelease/app-production-release.aab`

### 7.3 Build Production APK (for direct testing)
```bash
./gradlew :app:assembleProductionRelease
```

Output: `app/build/outputs/apk/production/release/app-production-release.apk`

### 7.4 Verify Build
```bash
# Check AAB exists
ls -la app/build/outputs/bundle/productionRelease/

# Check APK exists
ls -la app/build/outputs/apk/production/release/
```

### 7.5 Test on Device
```bash
adb install app/build/outputs/apk/production/release/app-production-release.apk
```

---

## PHASE 8: PLAY STORE SUBMISSION

### 8.1 Create Developer Account (if not done)
1. Go to https://play.google.com/console
2. Sign in with Google account
3. Pay $25 registration fee
4. Fill developer profile:
   - Developer name: **Vibing World Inc**
   - Contact email: **support@dollor.ai**
   - Website: **https://dollor.ai**
   - Phone: Your business phone

### 8.2 Create New App
1. Click **Create app**
2. App name: **Dollor.ai**
3. Default language: **English (United States)**
4. App or game: **App**
5. Free or paid: **Free**
6. Accept declarations

### 8.3 Complete Dashboard Sections

**Main store listing:**
- [ ] App name: Dollor.ai
- [ ] Short description (from short-description.txt)
- [ ] Full description (from full-description.txt)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (min 2)

**App content:**
- [ ] Privacy policy: https://dollor.ai/privacy
- [ ] App access: All functionality available without login / Provide test account
- [ ] Ads: Contains no ads
- [ ] Content rating: Complete questionnaire
- [ ] Target audience: 18 and over
- [ ] News apps: Not a news app
- [ ] COVID-19 apps: Not a COVID app
- [ ] Data safety: Complete form
- [ ] Government apps: Not a government app
- [ ] Financial features: App facilitates purchases (explain payment flow)

**Store settings:**
- [ ] App category: Food & Drink
- [ ] Contact email: support@dollor.ai
- [ ] External marketing: Yes/No (your choice)

### 8.4 Data Safety Form Answers

| Section | Answer |
|---------|--------|
| Does your app collect or share user data? | Yes |
| Is all user data encrypted in transit? | Yes |
| Do you provide a way for users to request data deletion? | Yes |
| **Data types collected:** | |
| Name | Yes - Required for account |
| Email address | Yes - Required for account |
| Phone number | Yes - Required for delivery contact |
| Address | Yes - Required for delivery |
| Precise location | Yes - Required for delivery/rides |
| Photos | Optional - Profile photo |
| Purchase history | Yes - Order history |
| **Data types shared:** | |
| Name | Shared with drivers for delivery |
| Phone number | Shared with drivers for contact |
| Address | Shared with drivers for delivery |
| Purchase history | Not shared |

### 8.5 Upload App Bundle
1. Go to **Release** → **Production**
2. Click **Create new release**
3. Upload `app-production-release.aab`
4. Add release notes (from release-notes/en-US/default.txt)
5. Click **Save**
6. Click **Review release**

### 8.6 Submit for Review
1. Verify all sections show green checkmarks
2. Click **Start rollout to Production**
3. Confirm

---

## PHASE 9: POST-SUBMISSION

### 9.1 Monitor Review
- Review typically takes 1-7 days
- Check Play Console for status updates
- Respond to any policy issues within 7 days

### 9.2 If Rejected
Common issues and fixes:
- Privacy policy not accessible → Verify URL works
- Missing contact info → Add to store listing
- Incomplete data safety → Complete all sections
- Misleading description → Revise text

### 9.3 After Approval
- [ ] Download and test production app from Play Store
- [ ] Verify all features work
- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews

---

## QUICK REFERENCE

| Item | Value |
|------|-------|
| Package ID | ai.dollor.customer |
| Company | Vibing World Inc |
| Support Email | support@dollor.ai |
| Privacy URL | https://dollor.ai/privacy |
| Terms URL | https://dollor.ai/terms |
| Play Console | https://play.google.com/console |
| Firebase | https://console.firebase.google.com |

---

## ESTIMATED TIME

| Phase | Time |
|-------|------|
| Prerequisites (accounts) | 1-2 hours |
| Firebase config | 10 min |
| Keystore generation | 10 min |
| API keys config | 30 min |
| Legal pages hosting | 1-2 hours |
| Graphics creation | 2-4 hours |
| Build & test | 30 min |
| Play Store submission | 1-2 hours |
| **Total** | **6-12 hours** |

---

*Last updated: December 24, 2025*
