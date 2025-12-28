# Android Customer App Migration Report
**Date**: December 27, 2025
**App**: ai.dollor.customer
**Status**: READY FOR PRODUCTION

---

## OLLAMA ANTI-HALLUCINATION REFERENCE

**CRITICAL**: Before making ANY code changes, query the trained Ollama model:
```bash
ollama run dollor-customer "YOUR QUESTION HERE"
```

### Ollama Model Details
- **Model Name**: `dollor-customer`
- **Base Model**: qwen2.5:32b
- **Training Files**:
  - `/Users/jeet/StudioProjects/eatfair-ios/.claude/training/Modelfile`
  - `/Users/jeet/StudioProjects/eatfair-ios/.claude/training/customer-app-training.jsonl` (82 Q&A pairs)
  - `/Users/jeet/StudioProjects/eatfair-ios/.claude/training/customer-app-code.jsonl` (48 code snippets)

### Retrain Command (if needed)
```bash
cd /Users/jeet/StudioProjects/eatfair-ios/.claude/training
ollama create dollor-customer -f Modelfile
```

### Example Queries
```bash
ollama run dollor-customer "What is the source code package for Android customer app?"
# Answer: com.eatfair.app (NOT ai.dollor.customer)

ollama run dollor-customer "List all Screen routes in Navigation.kt"
# Answer: 35+ routes with correct package

ollama run dollor-customer "What is the production API URL?"
# Answer: https://api.dollor.ai/api
```

---

## 1. API ENDPOINTS

### Verified Count: 45+ customer-specific endpoints

| Category | Count | Status |
|----------|-------|--------|
| Authentication | 7 | ✅ |
| Restaurants | 3 | ✅ |
| Orders | 12 | ✅ |
| Addresses | 6 | ✅ |
| Favorites | 4 | ✅ |
| Rideshare | 8 | ✅ |
| Payment Cards | 4 | ✅ |
| Promotions | 3 | ✅ |

### API URLs (NO LOCAL HOSTING)
| Environment | URL |
|-------------|-----|
| Staging | `https://d3kuu45w6kl8hr.cloudfront.net/api` |
| Production | `https://api.dollor.ai/api` |

---

## 2. NAVIGATION/ROUTING

### Screen Routes: 35 total

| Category | Screens |
|----------|---------|
| Auth | Welcome, SignUp, Login, ForgotPassword, ResetCodeEntry, LegalAcceptance |
| Main | Main, Home, Search, Deals, Orders, Profile |
| Profile | MyOrders, EditProfile, ReferAndEarn, Notifications |
| Restaurant | RestaurantFlow, RestaurantList, Restaurant, Cart |
| Address | LocationMap, AddAddressDetailsScreen, SavedAddressesScreen |
| Order | OrderTrackingScreen, OrderSuccess |
| Settings | Settings, PrivacyPolicy, TermsConditions |
| Rideshare | RideRequest, RideTracking, DriverChat |
| Privacy | HelpSupport, WhatDriversSee, YourPrivacy, SafetyFeatures |

---

## 3. DATABASE/STORAGE

| Type | File | Purpose |
|------|------|---------|
| Room Database | `AppDatabase.kt` | Address caching (AddressDto) |
| DataStore | `SessionManager.kt` | Session state (is_logged_in, user_id, user_name, user_email) |
| EncryptedPrefs | `SecureStorage.kt` | Tokens, customer auth (AES256-GCM encrypted) |

### SecureStorage Keys
- `customer_token`, `customer_id`, `customer_name`, `customer_email`
- `accepted_terms`, `accepted_privacy`, `terms_date`

---

## 4. UI COMPONENTS

### Feature Modules: 27

```
address, auth, cart, chat, checkout, common, components, custom,
deals, delivery, favorites, help, home, main, navigation, notification,
order, payment, privacy, profile, rating, refer, restaurant, rideshare,
search, theme, tip
```

### ViewModels (Hilt Injected)
- AuthViewModel, CartViewModel, HomeViewModel, ProfileViewModel, SearchViewModel

---

## 5. NOTIFICATIONS

| Type | Implementation |
|------|----------------|
| Push | Firebase Cloud Messaging (FCM) |
| Token Storage | SecureStorage + Backend registration |
| Backend Endpoint | POST /api/notifications/register-token |

---

## 6. PRICING MODEL

### Food Delivery (FLAT $1)
| Party | Fee |
|-------|-----|
| Customer | $1 flat per order |
| Restaurant | $1 flat per restaurant |
| Driver | $0 (keeps 100% + tips) |

### Rideshare (TIERED)
| Fare Range | Platform Fee |
|------------|--------------|
| ≤$35 | $1 |
| $35.01-$70 | $2 |
| >$70 | $3 |

### Fare Calculation
```
BASE_FARE = $2.50
PER_MILE_RATE = $1.15
PER_MINUTE_RATE = $0.18
MINIMUM_FARE = $5.00
```

---

## 7. BUILD CONFIGURATION

### Staging
```kotlin
applicationIdSuffix = ".staging"
API_BASE_URL = "https://d3kuu45w6kl8hr.cloudfront.net/api"
IS_STAGING = true
isMinifyEnabled = false
```

### Production
```kotlin
applicationId = "ai.dollor.customer"
API_BASE_URL = "https://api.dollor.ai/api"
IS_STAGING = false
isMinifyEnabled = true
isShrinkResources = true
```

---

## 8. KEYSTORE

| Property | Value |
|----------|-------|
| File | `dollor-release.jks` |
| Size | 2760 bytes |
| Location | `/Users/jeet/StudioProjects/eatfair-android/` |

---

## 9. LEGAL URLS

| Page | URL |
|------|-----|
| Terms | https://dollor.ai/terms |
| Privacy | https://dollor.ai/privacy |
| Support | https://dollor.ai/support |
| Contact | support@dollor.ai |

---

## 10. DEMO CREDENTIALS

```
Customer: demo.customer@dollor.ai / DemoCustomer2025!
Driver:   demo.driver@dollor.ai / DemoDriver2025!
Vendor:   demo.restaurant@dollor.ai / DemoRestaurant2025!
```

---

## VERIFICATION CHECKLIST

- [x] API endpoints match staging backend
- [x] No localhost/local hosting references
- [x] Navigation routes complete (35)
- [x] Room database configured
- [x] Secure storage with encryption
- [x] FCM push notifications ready
- [x] Pricing model matches CLAUDE.md
- [x] Legal URLs valid
- [x] Keystore exists
- [x] Build variants configured

---

## NEXT STEPS

1. Build AAB: `./gradlew :app:bundleProductionRelease`
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

---

## 11. KEY FILE PATHS

### Android Customer App
```
/Users/jeet/StudioProjects/eatfair-android/
├── app/                                    # Customer App Module
│   ├── build.gradle.kts                    # Build config, signing, flavors
│   ├── src/main/java/com/eatfair/app/
│   │   ├── DollorApp.kt                    # Application class
│   │   ├── data/
│   │   │   ├── AppDatabase.kt              # Room database
│   │   │   └── CustomerRideshareApiService.kt  # Rideshare API
│   │   └── ui/
│   │       └── navigation/
│   │           ├── Navigation.kt           # 35 Screen routes
│   │           └── NavigationGraph.kt      # NavHost composable
├── shared/                                 # Shared Module
│   └── src/main/java/com/eatfair/shared/
│       ├── config/AppConfig.kt             # API URLs, pricing, fees
│       ├── data/
│       │   ├── local/
│       │   │   ├── SecureStorage.kt        # Encrypted preferences
│       │   │   └── SessionManager.kt       # DataStore session
│       │   ├── remote/DollorApiService.kt  # Retrofit API (115+ endpoints)
│       │   └── repository/DollorRepository.kt  # Repository pattern
│       └── model/ApiModels.kt              # Data classes
└── dollor-release.jks                      # Release keystore
```

### Ollama Training
```
/Users/jeet/StudioProjects/eatfair-ios/.claude/training/
├── Modelfile                               # Ollama model definition
├── customer-app-training.jsonl             # 82 Q&A pairs
├── customer-app-code.jsonl                 # 48 code snippets
└── README.md                               # Training instructions
```

---

## 12. BUILD COMMANDS

### Debug Builds
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:assembleStagingDebug         # Staging debug APK
./gradlew :app:assembleProductionDebug      # Production debug APK
```

### Release Builds (for Play Store)
```bash
./gradlew :app:assembleProductionRelease    # Production APK (~23MB)
./gradlew :app:bundleProductionRelease      # Production AAB (for Play Store)
```

### Output Locations
```
APK: app/build/outputs/apk/production/release/app-production-release.apk
AAB: app/build/outputs/bundle/productionRelease/app-production-release.aab
```

### Run Tests
```bash
./gradlew :app:testStagingDebugUnitTest     # Unit tests
```

---

## 13. PACKAGE STRUCTURE (CRITICAL - DO NOT CONFUSE)

| Type | Value |
|------|-------|
| **Application ID** (Play Store) | `ai.dollor.customer` |
| **Source Package** (Code) | `com.eatfair.app` |
| **Shared Module** | `com.eatfair.shared` |

**WARNING**: These are DIFFERENT! Ollama was previously hallucinating `ai.dollor.customer` as the source package.

---

## 14. COMMON HALLUCINATIONS TO AVOID

| Wrong | Correct |
|-------|---------|
| Package: `ai.dollor.customer` | Package: `com.eatfair.app` |
| Customer uses `CustomerStatus` enum | Customer uses `is_active` Boolean |
| Driver has `vehicle_registration` | Driver does NOT have this field |
| Platform fee is 15% | Platform fee is $1 flat or $1-$3 tiered |
| Backend expects `first_name/last_name` | Backend expects `name` field |
| 9 navigation routes | 35+ navigation routes |

---

## 15. ENVIRONMENT COMPARISON

| Setting | Staging | Production |
|---------|---------|------------|
| API URL | `https://d3kuu45w6kl8hr.cloudfront.net/api` | `https://api.dollor.ai/api` |
| App ID Suffix | `.staging` | (none) |
| IS_STAGING | `true` | `false` |
| Minify | `false` | `true` |
| Shrink Resources | `false` | `true` |
| Log Stripping | No | Yes |
| Debuggable | Yes | No |

---

## 16. SESSION CONTINUATION CONTEXT

Copy this to start your next Claude Code session:

```
Continue from previous session. Android customer app (ai.dollor.customer) migration report complete.

OLLAMA MODEL: dollor-customer (trained, verified)
- Query before any code changes: ollama run dollor-customer "YOUR QUESTION"

KEY PATHS:
- Android: /Users/jeet/StudioProjects/eatfair-android/
- iOS: /Users/jeet/StudioProjects/eatfair-ios/
- Training: /Users/jeet/StudioProjects/eatfair-ios/.claude/training/

VERIFIED:
- 45+ API endpoints (NO localhost)
- 35 navigation routes
- Room + DataStore + EncryptedPrefs storage
- FCM push notifications
- $1 flat (food) / $1-$3 tiered (rideshare) pricing
- Keystore: dollor-release.jks

NEXT STEPS:
1. Build AAB: ./gradlew :app:bundleProductionRelease
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

REPORT: .claude/memory/android-migration-report-2025-12-27.md
```

---

*Report generated by Claude Code*
*Ollama Model: dollor-customer*
*Last Updated: December 27, 2025*
