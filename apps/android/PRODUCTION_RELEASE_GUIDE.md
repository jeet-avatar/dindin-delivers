# Dollor.ai Android Production Release Guide
## Complete Step-by-Step Instructions

**App Name:** Dollor.ai
**Company:** Vibing World Inc
**Package ID:** ai.dollor.customer
**Version:** 1.0.1 (versionCode 2)

---

## Pre-Release Checklist

### ✅ Already Completed
- [x] App branding updated (Dollor.ai)
- [x] Company name configured (Vibing World Inc)
- [x] Tagline set ("No Commission. Just $1.")
- [x] Theme renamed to Theme.Dollor
- [x] AppConfig supports production URLs
- [x] Provider authority uses ${applicationId}
- [x] ProGuard/R8 configured for release
- [x] Signing config ready (needs keystore)
- [x] App icons present (all densities)

### ⏳ Manual Steps Required
- [ ] Step 1: Configure Firebase for production package
- [ ] Step 2: Generate release keystore
- [ ] Step 3: Create legal web pages
- [ ] Step 4: Create Play Store listing
- [ ] Step 5: Build signed APK/AAB
- [ ] Step 6: Submit to Play Store

---

## Step 1: Configure Firebase (5 minutes)

### 1.1 Add Production Package to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **eatfair-app** (or create new "dollor-production")
3. Click ⚙️ **Project Settings**
4. Scroll to **Your apps** section
5. Click **Add app** → **Android**
6. Enter package name: `ai.dollor.customer`
7. App nickname: `Dollor.ai Customer (Production)`
8. Skip SHA-1 for now (add later for Google Sign-In)
9. Click **Register app**
10. Download `google-services.json`

### 1.2 Install the File

```bash
# Replace the production google-services.json
cp ~/Downloads/google-services.json \
   /Users/jeet/StudioProjects/eatfair-android/app/src/production/google-services.json
```

### 1.3 Add SHA-1 for Google Sign-In (After creating keystore)

```bash
# Get SHA-1 from your release keystore
keytool -list -v -keystore dollor-release.jks -alias dollor-customer
```

Add the SHA-1 fingerprint to Firebase Console → Project Settings → Your apps → ai.dollor.customer → Add fingerprint

---

## Step 2: Generate Release Keystore (5 minutes)

### 2.1 Generate Keystore

```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Generate release keystore
keytool -genkey -v \
  -keystore dollor-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias dollor-customer \
  -dname "CN=Dollor.ai, OU=Mobile, O=Vibing World Inc, L=Your City, ST=Your State, C=US"
```

**IMPORTANT:**
- Save the passwords securely (password manager)
- Back up the keystore file (cannot be regenerated!)
- Never commit to git

### 2.2 Configure local.properties

Add to `/Users/jeet/StudioProjects/eatfair-android/local.properties`:

```properties
# Release Signing Configuration
RELEASE_KEYSTORE_PATH=/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks
RELEASE_KEYSTORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=dollor-customer
RELEASE_KEY_PASSWORD=your_key_password

# API Keys (get from respective consoles)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
GOOGLE_WEB_CLIENT_ID=your_google_oauth_client_id
```

---

## Step 3: Create Legal Web Pages

### Required Pages

Host these at dollor.ai (or use a service like Termly, Iubenda):

#### 3.1 Privacy Policy (https://dollor.ai/privacy)

Must include:
- Company: Vibing World Inc
- App: Dollor.ai
- Contact: privacy@dollor.ai
- Data collected: Name, email, phone, location, payment info
- How data is used
- Third-party sharing (Stripe, Google Maps)
- CCPA/GDPR rights
- Data retention policy
- Children's privacy (not for under 13)

#### 3.2 Terms of Service (https://dollor.ai/terms)

Must include:
- Company: Vibing World Inc
- Service description: P2P food delivery & rideshare matchmaking
- User responsibilities
- Payment terms ($1 flat fee model)
- Cancellation/refund policy
- Limitation of liability
- Dispute resolution
- Governing law

#### 3.3 Support Page (https://dollor.ai/support)

- Contact email: support@dollor.ai
- FAQ section
- How to report issues

---

## Step 4: Play Store Listing Content

### 4.1 App Information

| Field | Value |
|-------|-------|
| **App name** | Dollor.ai |
| **Developer name** | Vibing World Inc |
| **Developer email** | support@dollor.ai |
| **Developer website** | https://dollor.ai |
| **Privacy policy URL** | https://dollor.ai/privacy |

### 4.2 Store Listing

**Title (30 chars max):**
```
Dollor.ai
```

**Short description (80 chars max):**
```
Food delivery & rideshare with just $1 fee. No commission. Drivers keep 100%.
```

**Full description (4000 chars max):**
```
Dollor.ai - The People's Delivery & Rideshare Platform

No Commission. Just $1.

Finally, a delivery and rideshare app that puts YOU first. We charge a simple flat fee - just $1 for food delivery and $1-3 for rides. That's it. No hidden fees, no surge pricing, no commission.

🍔 FOOD DELIVERY
• $1 flat delivery fee per order
• Order from local restaurants
• Real-time order tracking
• Chat with your driver
• Tip goes 100% to driver

🚗 RIDESHARE
• $1-3 flat platform fee (based on distance)
• Transparent pricing upfront
• P2P matching with local drivers
• Real-time ride tracking
• Drivers keep 96%+ of every fare

💰 WHY DOLLOR.AI?
Traditional apps charge restaurants 15-30% commission and take 25%+ from drivers. We believe that's unfair.

At Dollor.ai:
• Restaurants pay just $1 per order
• Drivers keep almost everything they earn
• Customers pay less
• Everyone wins

🔒 SAFE & SECURE
• Secure payments via Stripe
• Real-time GPS tracking
• In-app messaging
• Driver verification
• 24/7 support

📍 HOW IT WORKS
1. Enter your address
2. Browse restaurants or request a ride
3. Place your order or accept a driver's bid
4. Track in real-time
5. Enjoy!

Download Dollor.ai today and join the fair economy.

Questions? Contact us at support@dollor.ai

© 2025 Vibing World Inc
```

### 4.3 Categorization

| Field | Value |
|-------|-------|
| **Category** | Food & Drink |
| **Content rating** | Everyone |
| **Target audience** | 18+ (financial transactions) |

### 4.4 Required Graphics

| Asset | Dimensions | Notes |
|-------|------------|-------|
| App icon | 512x512 PNG | Already have (export from mipmap) |
| Feature graphic | 1024x500 PNG/JPG | Create in Figma/Canva |
| Phone screenshots | 16:9 or 9:16 | Min 2, max 8 |
| Tablet screenshots | Optional | Recommended |

### 4.5 Data Safety Form Answers

| Question | Answer |
|----------|--------|
| Does your app collect data? | Yes |
| Is data encrypted in transit? | Yes (HTTPS) |
| Can users request data deletion? | Yes |
| **Data collected:** | |
| - Name | Yes - Account functionality |
| - Email | Yes - Account functionality |
| - Phone | Yes - Account functionality |
| - Location | Yes - App functionality (delivery/rides) |
| - Payment info | Yes - Collected by Stripe (not stored) |
| **Data shared:** | |
| - With drivers | Name, phone (for delivery) |
| - With Stripe | Payment processing |
| - With Google | Maps, analytics |

---

## Step 5: Build Signed Release

### 5.1 Clean and Build

```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Set Java 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Clean
./gradlew clean

# Build production release AAB (for Play Store)
./gradlew :app:bundleProductionRelease

# Or build APK (for direct distribution)
./gradlew :app:assembleProductionRelease
```

### 5.2 Output Locations

```
AAB: app/build/outputs/bundle/productionRelease/app-production-release.aab
APK: app/build/outputs/apk/production/release/app-production-release.apk
```

### 5.3 Verify the Build

```bash
# Check AAB contents
bundletool build-apks --bundle=app/build/outputs/bundle/productionRelease/app-production-release.aab \
  --output=test.apks --mode=universal

# Install and test
adb install test.apks
```

---

## Step 6: Submit to Play Store

### 6.1 Create Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Pay $25 registration fee
3. Complete developer profile:
   - Developer name: **Vibing World Inc**
   - Email: **support@dollor.ai**
   - Website: **https://dollor.ai**
   - Phone: Your business phone

### 6.2 Create App

1. Click **Create app**
2. App name: **Dollor.ai**
3. Default language: English (US)
4. App type: App
5. Free or paid: Free

### 6.3 Complete Store Listing

1. **Main store listing** - Use content from Step 4
2. **Graphics** - Upload all required assets
3. **Categorization** - Food & Drink

### 6.4 Complete App Content

1. **Privacy policy** - Add URL
2. **App access** - All functionality available (or provide test credentials)
3. **Ads** - No ads
4. **Content rating** - Complete questionnaire
5. **Target audience** - 18+
6. **News apps** - No
7. **COVID-19 apps** - No
8. **Data safety** - Complete form from Step 4.5
9. **Government apps** - No
10. **Financial features** - Yes (explain payment processing)

### 6.5 Upload App Bundle

1. Go to **Production** → **Create new release**
2. Upload `app-production-release.aab`
3. Add release notes:
```
Initial release of Dollor.ai

• Food delivery with $1 flat fee
• Rideshare with $1-3 platform fee
• Real-time order and ride tracking
• Secure payments via Stripe
• In-app driver chat
```

### 6.6 Submit for Review

1. Review all sections are complete (green checkmarks)
2. Click **Submit for review**
3. Wait 1-7 days for review

---

## Post-Submission Checklist

- [ ] Monitor Play Console for review status
- [ ] Respond to any policy issues within 7 days
- [ ] Test production app after approval
- [ ] Set up crash reporting monitoring
- [ ] Configure Play Console alerts

---

## Troubleshooting

### Build fails with Firebase error
Ensure `google-services.json` has `ai.dollor.customer` package.

### Build fails with signing error
Check `local.properties` has correct keystore path and passwords.

### App rejected for policy
Common issues:
- Privacy policy not accessible
- Missing contact info
- Incomplete data safety form
- Misleading description

---

## Support

- Developer: Vibing World Inc
- Email: support@dollor.ai
- Website: https://dollor.ai

---

*Document created: December 24, 2025*
*App version: 1.0.1 (versionCode 2)*
