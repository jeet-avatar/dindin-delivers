# Android App Parity Session Prompt

> Copy everything below this line into a new Claude Code session after `/clear`

---

## Mission

Build, verify, and upload all 3 Android apps to Firebase App Distribution — matching every iOS feature, screen, and design exactly. Production-based. No assumptions.

## Critical Rules

1. **NEVER assume a feature exists** — verify every screen against iOS source code
2. **Production only** — all builds point to `api.dollor.ai`, use release signing
3. **Reference last successful build** — Customer vC=23 (v1.0.22), Driver vC=20 (v1.0.19), Partner vC=16 (v1.0.15)
4. **Firebase App Distribution is NOT configured** — must be set up from scratch
5. **Firebase CLI needs re-auth** — run `firebase login --reauth` first
6. **All work goes through GSD** — `/gsd:quick`, `/gsd:plan-phase`, `/gsd:debug`

## Repositories

| Repo | Path | Purpose |
|------|------|---------|
| iOS (reference) | `/Users/jeet/doordash-p2p` | Feature reference — DO NOT modify |
| Android (target) | `/Users/jeet/StudioProjects/eatfair-android` | Build target |
| Backend | `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/` | API reference |

## Current Android State

### Build Versions (NEXT builds)

| App | Module | Package | Current vC | Next vC | Current vN | Next vN | Build File |
|-----|--------|---------|-----------|---------|-----------|---------|------------|
| Customer | `app/` | `ai.dollor.customer` | 23 | **24** | 1.0.22 | **1.0.23** | `app/build.gradle.kts:56-57` |
| Driver | `driver/` | `ai.dollor.driver` | 20 | **21** | 1.0.19 | **1.0.20** | `driver/build.gradle.kts:54-55` |
| Partner | `partner/` | `ai.dollor.partner` | 16 | **17** | 1.0.15 | **1.0.16** | `partner/build.gradle.kts:52-53` |

### Production Config (ALREADY SET)

| Setting | Value | File |
|---------|-------|------|
| API URL | `https://api.dollor.ai/api` | `app/build.gradle.kts:63`, `driver/:61`, `partner/:59` |
| IS_PRODUCTION | `true` | All 3 build.gradle.kts |
| Google Web Client ID | `65740760476-31o2a074qeh2nsc6hlbt8peqpmivmq32.apps.googleusercontent.com` | All 3 |
| Firebase Project | `dollorai-production` (#65740760476) | All google-services.json |

### Firebase App IDs

| App | Firebase App ID |
|-----|-----------------|
| Customer | `1:65740760476:android:535885ca28086e6242d459` |
| Driver | `1:65740760476:android:7d9bed1ee685434c42d459` |
| Partner | `1:65740760476:android:8591cc17fa4f8d4c42d459` |

### Signing

Release signing loads from `local.properties`:
- `RELEASE_KEYSTORE_PATH` → `dollor-release.jks`
- `RELEASE_KEYSTORE_PASSWORD`
- `RELEASE_KEY_ALIAS` (customer/driver) / `RELEASE_KEY_ALIAS_PARTNER` (partner)
- `RELEASE_KEY_PASSWORD`

### Tech Stack

| Component | Version |
|-----------|---------|
| Kotlin | 2.1.0 |
| Jetpack Compose | BOM 2025.10.01 |
| Retrofit | 2.9.0 |
| OkHttp | 4.12.0 |
| Gson | 2.10.1 |
| Hilt | 2.57.2 |
| Stripe | 21.29.0 |
| Google Maps Compose | 6.12.1 |
| Firebase BOM | 32.7.0 |
| Room | 2.8.3 |
| Coil | 2.7.0 |
| Min SDK | 24, Target SDK 35 |

### API Service

- **Main**: `shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt` (1395 lines, Retrofit)
- **Customer Rideshare**: `app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt` (OkHttp-based)
- **Repository**: `shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt`
- **DI**: `shared/src/main/java/ai/dollor/shared/di/SharedModule.kt` (Hilt)
- **Config**: `shared/src/main/java/ai/dollor/shared/config/AppConfig.kt` (585 lines)

## iOS Feature Reference (MUST MATCH)

### Customer App (59 Swift files)

**Auth & Onboarding**
- Login (email/password + Google Sign-In)
- Register
- Welcome/onboarding
- Legal acceptance
- Forgot password (email code flow)

**Food Delivery**
- Home feed (featured restaurants, categories, hot deals, AI recommendations, voice search)
- Restaurant search with filters (cuisine, sort: recommended/top-rated/fastest/nearest)
- AI Food Assistant (AI recommendations)
- Restaurant detail (menu, items, ratings, delivery info)
- Menu item customization (size, toppings, special requests)
- Multi-restaurant cart
- Checkout (address, payment, tip, fee breakdown, promo code, schedule delivery)
- Schedule delivery for later
- Order tracking with live map (driver location, ETA)
- Order success (confetti animation)
- Order history
- Partial orders
- Rate restaurant (1-5 stars + comment)
- Rate driver
- Tip driver (preset $2/$5/$10 + custom)
- Driver chat (real-time)

**Rideshare**
- Ride request (pickup/dropoff search, map, fare estimation)
- Live ride tracking (driver location, ETA)
- Ride receipt (fare breakdown)
- Rate driver
- Recurring rides
- Trip Board/Carpooling (post trips, browse, matches, safety info)
- Dispute ride charges

**Payment & Addresses**
- Payment methods (Stripe card add/delete)
- Saved addresses (CRUD)
- Location picker (map/search)

**Profile & Settings**
- Profile (edit name/email/phone)
- Favorites (restaurants)
- Settings (bug report, privacy policy, terms, logout)
- Refer & earn
- Help & support (FAQ)
- Notifications center

### Driver App (31 Swift files)

**Auth**
- Login (email/password + Google Sign-In)

**Dashboard (5 tabs)**
1. Delivery — available orders
2. Rideshare — ride bidding
3. Active — current delivery/ride
4. Messages — chats
5. Profile

**Food Delivery**
- Available orders (map + list view, filters: distance/payout/restaurant)
- Active delivery (step-by-step: pickup proof → deliver → OTP verify)
- Delivery map (real-time route)
- Delivery history (completed, earnings per delivery)
- Delivery proof (photo capture/upload)
- Chat with restaurant/customer
- Tip notification + thank you

**Rideshare**
- Available ride requests (map + list)
- Submit bid (set proposed fare)
- My bids (status: pending/accepted/rejected/counter-offered)
- Counter-offer response (accept/counter/decline)
- Active ride (arrive → pickup → drive → complete workflow)
- Rider chat
- Online/Offline toggle

**Earnings & Profile**
- Payout dashboard (food + rideshare, pending, history, ACH linking, weekly/monthly)
- Profile (vehicle info, documents, ratings, photo, location)
- Vehicle photo upload
- Terms & conditions
- Voice assistant (hands-free)

### Restaurant App (19 Swift files)

**Auth & Onboarding**
- Login (email/password + Google Sign-In)
- Multi-step registration (info → contact/location → operations → review)
- Document upload (business license, tax ID)

**Dashboard (5 tabs)**
1. Orders
2. Menu
3. Analytics
4. AI
5. Settings

**Orders**
- Real-time order list with status bar (new/preparing/ready/delivering)
- Quick stats
- AI suggestions banner
- Order actions (accept, mark ready, self-deliver, assign driver, mark delivered)
- Order invoice detail

**Menu Management**
- Browse/search menu items
- Add/edit/delete items (name, description, price, category, photo, availability toggle)

**Analytics**
- Revenue trends (daily/weekly/monthly)
- Order count trends
- Top-selling items
- Customer ratings trends
- Busy hours heatmap

**AI Features**
- AI Insights (pricing recommendations, slow-moving items, demand forecast, menu optimization)
- AI Employees (create chatbots, configure personality, task queue, audit log)

**KOT (Kitchen Order Ticket)**
- Printer settings (paper size, columns, auto-print)
- Bluetooth printer connection
- Test print

**Settings**
- Edit restaurant profile
- Operating hours
- Notification settings
- Payment settings (Stripe Connect)
- FAQ
- Legal documents

## Phase Plan

### Phase 1: Feature Parity Audit (audit only, no code changes)

For each Android app, compare screen-by-screen against the iOS feature list above:
1. Read every Activity/Fragment/Screen in the Android app
2. Check if the equivalent iOS feature exists
3. Document: PRESENT / MISSING / PARTIAL (with details)
4. Output: `ANDROID_PARITY_REPORT.md`

### Phase 2: Fix Missing Features

For each MISSING/PARTIAL feature, implement it in Android matching iOS exactly:
- Match screen layout and flow
- Match API calls (use DollorApiService endpoints)
- Match error handling
- Each fix requires user approval before implementing

### Phase 3: API Verification

Same as iOS Phase 02 — verify every Android API call against backend:
- DollorApiService.kt (1395 lines, Retrofit)
- CustomerRideshareApiService.kt
- Check: URL path, HTTP method, auth, request body, response model
- v1.2 already fixed 5 Android API paths — check if more are broken
- Known bug: `DELETE /api/rides/recurring/{id}` → backend expects `/rides/recurring-rides/{id}`

### Phase 4: Build & Upload

1. Bump version codes (Customer 24, Driver 21, Partner 17)
2. Set up Firebase App Distribution (add Gradle plugin, configure)
3. Re-auth Firebase CLI: `firebase login --reauth`
4. Build release APKs: `./gradlew :app:assembleRelease :driver:assembleRelease :partner:assembleRelease`
5. Upload to Firebase App Distribution
6. Verify builds are visible in Firebase console

## Build Commands

```bash
cd /Users/jeet/StudioProjects/eatfair-android

# Debug builds (for testing)
./gradlew :app:assembleDebug
./gradlew :driver:assembleDebug
./gradlew :partner:assembleDebug

# Release builds (for distribution)
./gradlew :app:assembleRelease
./gradlew :driver:assembleRelease
./gradlew :partner:assembleRelease

# All release at once
./gradlew assembleRelease

# Run tests
./gradlew :app:testDebugUnitTest :driver:testDebugUnitTest :partner:testDebugUnitTest
```

## Known Android Issues (from MEMORY.md)

1. **Gson response wrapper mismatches** (FIXED Feb 17): `getBidsForRide`, `getMyRideRequests`, `fetchChatMessages` needed wrapper classes
2. **Hardcoded customer name** (FIXED): `createRideRequest()` now reads `secureStorage.customerName`
3. **Wrong driver earnings** (FIXED): Uses tiered $1/$2/$3 fee calculation
4. **Rides/available 422** (FIXED): Made query params Optional
5. **Deliveries showing 0** (FIXED): Changed filter from assigned → available
6. **Driver login role mismatch** (FIXED): Now checks `driver_id` for Google Sign-In users
7. **Recurring rides path bug** (FOUND, NOT FIXED): Android calls `DELETE /api/rides/recurring/{id}`, backend expects `/rides/recurring-rides/{id}`

## Anti-Hallucination

- **NEVER invent API endpoints** — verify with `grep -rn "the/path" /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/*.py`
- **NEVER guess data model fields** — check actual backend response in `main_new.py`
- **Android package names differ from iOS**: `ai.dollor.*` (Android) vs `com.dollorai.*` (iOS)
- Check `.claude/docs/GROUND_TRUTH.md` for verified facts

## Start Command

```
/gsd:plan-phase 03
```

(Phase 03 in v1.4 roadmap = Android API Verification — or use `/gsd:quick` for targeted work)

---

*Generated: 2026-02-23*
*iOS TestFlight builds: Customer 1089, Driver 197, Restaurant 165*
*Context source: iOS feature audit + Android repo exploration + Firebase status check*
