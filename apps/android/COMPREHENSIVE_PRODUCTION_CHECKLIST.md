# Comprehensive Production Checklist - Dollor.ai Android

**App:** Dollor.ai
**Company:** Vibing World Inc
**Package ID:** ai.dollor.customer
**Business Model:** P2P Matchmaking Service (NOT Delivery/TNC Company)
**Version:** 1.0.1
**Last Updated:** December 24, 2025

---

## CRITICAL BUSINESS CONTEXT

> **LEGAL POSITIONING:** Dollor.ai operates as a **MATCHMAKING SERVICE**, NOT a delivery company or transportation network company (TNC). This positioning provides legal protection and avoids extensive licensing requirements.

**Pricing Model:**
- Food Delivery: $1 flat customer fee + $1 per restaurant
- Rideshare: $1-3 tiered (up to $35 = $1, $35-$70 = $2, above $70 = $3)
- Drivers: $0 platform fee (keep 100% of delivery fees + tips)

---

## PHASE 1: INFRASTRUCTURE VERIFICATION

### 1.1 Backend Services (CRITICAL)

| Service | Port | Status | Production URL | Staging URL |
|---------|------|--------|----------------|-------------|
| API Gateway | 443 | [ ] | api.dollor.ai | d3kuu45w6kl8hr.cloudfront.net |
| auth-service | 8001 | [ ] | Via Gateway | Via Gateway |
| user-service | 8002 | [ ] | Via Gateway | Via Gateway |
| driver-service | 8003 | [ ] | Via Gateway | Via Gateway |
| restaurant-service | 8004 | [ ] | Via Gateway | Via Gateway |
| order-service | 8005 | [ ] | Via Gateway | Via Gateway |
| payment-service | 8006 | [ ] | Via Gateway | Via Gateway |
| location-service | 8007 | [ ] | Via Gateway | Via Gateway |
| menu-service | 8008 | [ ] | Via Gateway | Via Gateway |
| notification-service | 8009 | [ ] | Via Gateway | Via Gateway |
| ride-service | 8014 | [ ] | Via Gateway | Via Gateway |
| pricing-service | 8015 | [ ] | Via Gateway | Via Gateway |

**Verification Commands:**
```bash
# Check staging health
curl -s https://d3kuu45w6kl8hr.cloudfront.net/health | jq

# Check production health (when deployed)
curl -s https://api.dollor.ai/health | jq

# Verify all microservices
for service in auth user driver restaurant order payment location menu notification; do
  echo "Checking $service-service..."
  curl -s https://d3kuu45w6kl8hr.cloudfront.net/api/${service}/health | jq
done
```

### 1.2 Database Verification

| Database | Environment | Status | Notes |
|----------|-------------|--------|-------|
| PostgreSQL (RDS) | Staging | [ ] | Verify schema matches models.py |
| PostgreSQL (RDS) | Production | [ ] | Create separate production instance |
| Redis | Both | [ ] | For sessions, caching, real-time location |
| Elasticsearch | Both | [ ] | For menu search, order history |

**Verification:**
```bash
# Check database tables match expected schema
# Tables: customers, vendors, menu_items, orders, drivers, rides
psql -h <rds-endpoint> -U <user> -d dollor -c "\dt"
```

### 1.3 AWS Services

| Service | Purpose | Status | Notes |
|---------|---------|--------|-------|
| EKS Cluster | Kubernetes | [ ] | dollor-staging / dollor-production |
| ECR | Container Registry | [ ] | 134607809447.dkr.ecr.us-east-1.amazonaws.com |
| RDS | PostgreSQL | [ ] | Staging and Production databases |
| S3 | Email storage | [x] | dollor-emails bucket configured |
| SES | Email receiving | [x] | support@, privacy@ configured |
| CloudFront | CDN/API Gateway | [ ] | d3kuu45w6kl8hr.cloudfront.net |
| Route53 | DNS | [ ] | dollor.ai domain |
| Secrets Manager | API Keys | [ ] | Stripe, Maps, OAuth keys |

### 1.4 DNS Configuration

| Record | Type | Value | Status |
|--------|------|-------|--------|
| dollor.ai | A | CloudFront | [ ] |
| api.dollor.ai | CNAME | CloudFront | [ ] |
| dollor.ai | MX | inbound-smtp.us-east-1.amazonaws.com | [x] |
| dollor.ai | TXT | v=spf1 include:amazonses.com ~all | [x] |

---

## PHASE 2: SECURITY AUDIT

### 2.1 API Security

| Check | Status | Notes |
|-------|--------|-------|
| All endpoints require authentication (except register/login) | [ ] | JWT Bearer token |
| Token refresh mechanism working | [ ] | TokenRefreshInterceptor.kt |
| Rate limiting configured | [ ] | API Gateway level |
| CORS properly configured | [ ] | Only allow app origins |
| SQL injection protection | [ ] | Parameterized queries |
| Input validation on all endpoints | [ ] | Server-side validation |

### 2.2 API Keys Audit

| Key | Location | Production Status | Notes |
|-----|----------|-------------------|-------|
| GOOGLE_MAPS_API_KEY | local.properties | [ ] | Restrict to ai.dollor.customer + SHA-1 |
| STRIPE_PUBLISHABLE_KEY | local.properties | [ ] | Must be pk_live_* for production |
| GOOGLE_WEB_CLIENT_ID | local.properties | [ ] | OAuth for Google Sign-In |
| Firebase API Key | google-services.json | [ ] | Auto-restricted by Firebase |

**Key Security Requirements:**
```
GOOGLE_MAPS_API_KEY:
  - API restrictions: Maps SDK for Android, Places API
  - Application restrictions: Android apps
  - Package: ai.dollor.customer
  - SHA-1: [Add from keystore]

STRIPE_PUBLISHABLE_KEY:
  - Must start with pk_live_ (NOT pk_test_)
  - Backend must have sk_live_ configured
  - Webhook secret must match production
```

### 2.3 Firebase Security

| Check | Status | Notes |
|-------|--------|-------|
| google-services.json has ai.dollor.customer | [ ] | Create new or add to existing |
| SHA-1 fingerprint added | [ ] | For Google Sign-In |
| FCM configured | [ ] | For push notifications |
| Analytics enabled | [ ] | Optional but recommended |

### 2.4 Code Security

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded API keys in source | [x] | All in local.properties |
| No hardcoded URLs in source | [x] | All in AppConfig.kt |
| ProGuard rules protect sensitive classes | [x] | proguard-rules.pro configured |
| No debug logging in production | [ ] | Check BuildConfig.DEBUG usage |
| SSL certificate pinning | [ ] | Optional but recommended |

---

## PHASE 3: APP CONFIGURATION

### 3.1 Build Configuration

**app/build.gradle.kts - Verify:**
```kotlin
productFlavors {
    create("production") {
        dimension = "environment"
        applicationId = "ai.dollor.customer"
        resValue("string", "app_name", "Dollor.ai")
        buildConfigField("String", "API_BASE_URL", "\"https://api.dollor.ai/api\"")
        buildConfigField("Boolean", "IS_STAGING", "false")
    }
}
```

| Check | Status | Notes |
|-------|--------|-------|
| applicationId = ai.dollor.customer | [x] | Production package |
| versionCode incremented | [x] | Currently 2 |
| versionName set | [x] | Currently 1.0.1 |
| minSdk = 26 | [x] | Android 8.0+ |
| targetSdk = 34 | [x] | Android 14 |
| Production API URL configured | [x] | api.dollor.ai |
| Signing config configured | [x] | Needs keystore |

### 3.2 AppConfig.kt Verification

| Check | Status | Notes |
|-------|--------|-------|
| STAGING_API_URL correct | [x] | d3kuu45w6kl8hr.cloudfront.net |
| PRODUCTION_API_URL correct | [x] | api.dollor.ai |
| Dynamic initialization working | [x] | initialize() called in DollorApp |
| Microservices URLs correct | [x] | All use same base URL |
| Food Delivery fee = $1 | [x] | CUSTOMER_FEE = 1.00 |
| Rideshare tiered fees correct | [x] | $1/$2/$3 tiers |

### 3.3 AndroidManifest.xml

| Check | Status | Notes |
|-------|--------|-------|
| android:name=".DollorApp" | [x] | Application class |
| Permissions appropriate | [x] | INTERNET, LOCATION, etc. |
| Provider authority = ${applicationId}.provider | [x] | Dynamic authority |
| Backup enabled | [x] | android:allowBackup="true" |
| Network security config | [ ] | For API security |

### 3.4 Branding Verification

| Element | Expected Value | Status |
|---------|----------------|--------|
| App name | Dollor.ai | [x] |
| Theme name | Theme.Dollor | [x] |
| Company name | Vibing World Inc | [x] |
| Tagline | No Commission. Just $1. | [x] |
| App icons | All densities present | [x] |

---

## PHASE 4: SIGNING & KEYSTORE

### 4.1 Keystore Generation

**Status:** [ ] Keystore exists: `/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks`

**Generate if not exists:**
```bash
keytool -genkey -v \
  -keystore dollor-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias dollor-customer \
  -storepass YOUR_SECURE_PASSWORD \
  -keypass YOUR_SECURE_PASSWORD \
  -dname "CN=Dollor.ai, OU=Mobile Development, O=Vibing World Inc, L=San Francisco, ST=California, C=US"
```

### 4.2 local.properties Configuration

```properties
# Release Signing Configuration
RELEASE_KEYSTORE_PATH=/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks
RELEASE_KEYSTORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=dollor-customer
RELEASE_KEY_PASSWORD=your_key_password

# Production API Keys
GOOGLE_MAPS_API_KEY=AIza...
STRIPE_PUBLISHABLE_KEY=pk_live_...
GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
```

### 4.3 SHA-1 Fingerprints

| Purpose | SHA-1 | Status |
|---------|-------|--------|
| Google Sign-In (Firebase) | [ ] | Add to Firebase Console |
| Google Maps API restriction | [ ] | Add to Cloud Console |

**Get SHA-1:**
```bash
keytool -list -v -keystore dollor-release.jks -alias dollor-customer | grep SHA1
```

### 4.4 Keystore Backup (CRITICAL)

| Backup Location | Status | Notes |
|-----------------|--------|-------|
| Password Manager | [ ] | Store passwords securely |
| Secure Cloud Storage | [ ] | Encrypted backup of .jks |
| Local Backup | [ ] | USB/External drive |

**WARNING:** If keystore is lost, you CANNOT update the app on Play Store!

---

## PHASE 5: FIREBASE CONFIGURATION

### 5.1 Firebase Project Setup

**Option A: Create New Project (Recommended)**
| Step | Status | Notes |
|------|--------|-------|
| Create project "dollor-ai" | [ ] | console.firebase.google.com |
| Add Android app | [ ] | Package: ai.dollor.customer |
| Download google-services.json | [ ] | Save to app/src/production/ |
| Add SHA-1 fingerprint | [ ] | For Google Sign-In |
| Enable Authentication | [ ] | Email/Password + Google |
| Enable Cloud Messaging | [ ] | For push notifications |

**Option B: Add to Existing Project**
| Step | Status | Notes |
|------|--------|-------|
| Select eatfair-app project | [ ] | |
| Add Android app | [ ] | Package: ai.dollor.customer |
| Download updated google-services.json | [ ] | |
| Add SHA-1 fingerprint | [ ] | |

### 5.2 google-services.json Verification

**Required content:**
```json
{
  "project_info": {
    "project_id": "dollor-ai"
  },
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "ai.dollor.customer"
      }
    }
  }]
}
```

| Check | Status |
|-------|--------|
| File exists at app/src/production/google-services.json | [ ] |
| package_name = ai.dollor.customer | [ ] |
| API key present | [ ] |

---

## PHASE 6: LEGAL & COMPLIANCE

### 6.1 Legal Documents

| Document | URL | Status | Notes |
|----------|-----|--------|-------|
| Privacy Policy | https://dollor.ai/privacy | [ ] | See docs/legal/PRIVACY_POLICY.md |
| Terms of Service | https://dollor.ai/terms | [ ] | See docs/legal/TERMS_OF_SERVICE.md |
| Driver Terms | https://dollor.ai/driver-terms | [ ] | Create if needed |
| Restaurant Terms | https://dollor.ai/restaurant-terms | [ ] | Create if needed |
| Support Page | https://dollor.ai/support | [ ] | FAQ + contact |

### 6.2 Email Configuration

| Email | Purpose | Status |
|-------|---------|--------|
| support@dollor.ai | Customer support, Play Store contact | [x] |
| privacy@dollor.ai | Privacy requests (CCPA/GDPR) | [x] |
| legal@dollor.ai | Legal inquiries | [ ] |
| noreply@dollor.ai | Transactional emails | [ ] |

**AWS SES Verified:**
- [x] Domain: dollor.ai
- [x] MX Record: inbound-smtp.us-east-1.amazonaws.com
- [x] S3 Bucket: dollor-emails

### 6.3 Compliance Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| CCPA compliance | [ ] | Data deletion request handling |
| GDPR compliance | [ ] | If serving EU users |
| Data retention policy | [ ] | Define in Privacy Policy |
| Under 13 restriction | [x] | Terms state 18+ only |
| Location data disclosure | [x] | In Privacy Policy |
| Payment data handling | [x] | Stripe processes, we don't store |

---

## PHASE 7: PLAY STORE PREPARATION

### 7.1 Developer Account

| Check | Status | Notes |
|-------|--------|-------|
| Google Play Developer Account | [ ] | $25 registration |
| Developer name: Vibing World Inc | [ ] | |
| Contact email: support@dollor.ai | [ ] | |
| Website: https://dollor.ai | [ ] | |
| Physical address (optional) | [ ] | Required for some countries |

### 7.2 Store Listing Content

**Files ready:**
- [x] `app/src/main/play/listings/en-US/title.txt`
- [x] `app/src/main/play/listings/en-US/short-description.txt`
- [x] `app/src/main/play/listings/en-US/full-description.txt`
- [x] `app/src/main/play/release-notes/en-US/default.txt`
- [x] `app/src/main/play/contact-email.txt`
- [x] `app/src/main/play/contact-website.txt`

### 7.3 Graphics Assets

| Asset | Dimensions | Status | Location |
|-------|------------|--------|----------|
| Hi-res icon | 512x512 PNG | [ ] | graphics/icon/ |
| Feature graphic | 1024x500 PNG | [ ] | graphics/feature-graphic/ |
| Phone screenshot 1 | 1080x1920 | [ ] | graphics/phone-screenshots/ |
| Phone screenshot 2 | 1080x1920 | [ ] | graphics/phone-screenshots/ |
| Phone screenshot 3+ | 1080x1920 | [ ] | Optional but recommended |
| Tablet screenshots | Various | [ ] | Optional |

### 7.4 Data Safety Form

| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | Yes |
| Is all user data encrypted in transit? | Yes (HTTPS) |
| Do you provide a way for users to request data deletion? | Yes |

**Data Types Collected:**
| Data Type | Collected | Purpose | Shared |
|-----------|-----------|---------|--------|
| Name | Yes | Account | With drivers |
| Email | Yes | Account | No |
| Phone | Yes | Account | With drivers |
| Address | Yes | Delivery | With drivers |
| Precise location | Yes | Delivery/Rides | With drivers |
| Payment info | Yes | Processing | Via Stripe |
| Purchase history | Yes | Order history | No |

### 7.5 App Content Declaration

| Declaration | Answer | Notes |
|-------------|--------|-------|
| Contains ads | No | |
| Content rating | Everyone | Complete questionnaire |
| Target audience | 18+ | Financial transactions |
| News apps | No | |
| COVID-19 apps | No | |
| Government apps | No | |
| Financial features | Yes | Explain payment processing |
| App access | All functionality available | Or provide test credentials |

---

## PHASE 8: BUILD & RELEASE

### 8.1 Pre-Build Checklist

| Check | Status |
|-------|--------|
| Clean build succeeds | [ ] |
| All tests pass | [ ] |
| No lint errors | [ ] |
| google-services.json for production | [ ] |
| local.properties configured | [ ] |
| Version code incremented | [x] |

### 8.2 Build Commands

```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Set Java 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
# OR
export JAVA_HOME=/opt/homebrew/opt/openjdk@17

# Clean
./gradlew clean

# Build production AAB (for Play Store)
./gradlew :app:bundleProductionRelease

# Build production APK (for testing)
./gradlew :app:assembleProductionRelease
```

### 8.3 Build Outputs

| File | Path | Purpose |
|------|------|---------|
| AAB | app/build/outputs/bundle/productionRelease/app-production-release.aab | Play Store upload |
| APK | app/build/outputs/apk/production/release/app-production-release.apk | Direct installation |

### 8.4 Pre-Upload Testing

| Test | Status | Notes |
|------|--------|-------|
| Install APK on device | [ ] | adb install ... |
| Login flow works | [ ] | Email + Google |
| Restaurant browsing works | [ ] | |
| Cart and checkout work | [ ] | Test with Stripe test mode first |
| Order tracking works | [ ] | |
| Rideshare flow works | [ ] | |
| Push notifications work | [ ] | |
| All screens render correctly | [ ] | |
| No crashes | [ ] | |

---

## PHASE 9: MONITORING & ANALYTICS

### 9.1 Crash Reporting

| Service | Status | Notes |
|---------|--------|-------|
| Firebase Crashlytics | [ ] | Enable in Firebase Console |
| ProGuard mapping upload | [ ] | For readable stack traces |

### 9.2 Analytics

| Service | Status | Notes |
|---------|--------|-------|
| Firebase Analytics | [ ] | Enable in Firebase Console |
| Custom events defined | [ ] | Order placed, ride requested, etc. |

### 9.3 Performance Monitoring

| Check | Status | Notes |
|-------|--------|-------|
| Firebase Performance | [ ] | Optional but recommended |
| API latency tracking | [ ] | Backend monitoring |
| Error rate tracking | [ ] | Backend monitoring |

---

## PHASE 10: POST-LAUNCH

### 10.1 Immediate Post-Launch

| Task | Status | Notes |
|------|--------|-------|
| Download production app from Play Store | [ ] | Verify it works |
| Test all features end-to-end | [ ] | Real user flow |
| Monitor crash reports | [ ] | Firebase Crashlytics |
| Monitor Play Console reviews | [ ] | Respond within 24h |

### 10.2 Ongoing Monitoring

| Task | Frequency | Notes |
|------|-----------|-------|
| Check crash reports | Daily | First 2 weeks |
| Review user feedback | Daily | First 2 weeks |
| Monitor API health | Continuous | CloudWatch alarms |
| Check Play Store status | Daily | Policy violations |

### 10.3 If App is Rejected

**Common Issues:**
1. Privacy policy not accessible → Verify https://dollor.ai/privacy works
2. Missing contact info → Add to store listing
3. Incomplete data safety → Complete all sections
4. Misleading description → Revise text
5. App functionality issues → Test and fix

---

## QUICK REFERENCE

### Key URLs
| Purpose | URL |
|---------|-----|
| Staging API | https://d3kuu45w6kl8hr.cloudfront.net |
| Production API | https://api.dollor.ai |
| Firebase Console | https://console.firebase.google.com |
| Google Cloud Console | https://console.cloud.google.com |
| Play Console | https://play.google.com/console |
| Stripe Dashboard | https://dashboard.stripe.com |
| AWS Console | https://console.aws.amazon.com |

### Key Files
| Purpose | Path |
|---------|------|
| App Config | shared/src/main/java/com/eatfair/shared/config/AppConfig.kt |
| Build Config | app/build.gradle.kts |
| Manifest | app/src/main/AndroidManifest.xml |
| Firebase (Production) | app/src/production/google-services.json |
| Firebase (Staging) | app/src/staging/google-services.json |
| ProGuard | app/proguard-rules.pro |
| Legal Docs | docs/legal/ |
| Play Store Content | app/src/main/play/ |

### Support Contacts
| Role | Email |
|------|-------|
| General Support | support@dollor.ai |
| Privacy | privacy@dollor.ai |
| Legal | legal@dollor.ai |

---

## SIGN-OFF

| Phase | Reviewer | Date | Signature |
|-------|----------|------|-----------|
| Infrastructure | | | |
| Security | | | |
| App Configuration | | | |
| Legal/Compliance | | | |
| Store Listing | | | |
| Final Build | | | |

---

*Document Version: 1.0*
*Last Updated: December 24, 2025*
*App: Dollor.ai v1.0.1 (ai.dollor.customer)*
*Company: Vibing World Inc*
