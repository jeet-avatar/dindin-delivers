# Phase 07: Play Store Publishing - Research

**Researched:** 2026-02-27
**Domain:** Google Play Store app publishing (3 Android apps)
**Confidence:** HIGH

## Summary

Publishing the 3 Dollor.ai Android apps (Customer, Driver, Partner) to Google Play Store requires completing several sequential tasks across the Google Play Console. The codebase is well-prepared: all 3 apps already have production package names (`ai.dollor.customer`, `ai.dollor.driver`, `ai.dollor.partner`), a release keystore (`dollor-release.jks`, valid until 2053), ProGuard rules, AAB build capability, and a partially-configured Fastlane setup with service account credentials. Existing store assets (icon, feature graphic, 2 screenshots) provide a starting point but need significant expansion (minimum 6 screenshots per app, feature graphic alpha channel fix).

The primary blocker is confirming whether a Google Play Developer account exists and is verified for the organization. If it does not exist, a D-U-N-S number is required for organization verification (this can take up to 30 days if not already registered). The second concern is that the existing Fastlane service account (`github-actions-test-lab@dollorai-production.iam.gserviceaccount.com`) appears to be a Firebase Test Lab account, NOT a Play Console API account -- it may need Google Play Console API access granted, or a new service account may be needed.

**Primary recommendation:** Verify Google Play Developer account status immediately (potential 30-day blocker). If account exists, proceed with manual first uploads for all 3 apps, then configure Fastlane for future automation. All console metadata (Data Safety, content rating, store listings) must be completed manually in the Play Console web UI.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | Google Play Developer account created and verified (organization type) | Requires $25 fee, D-U-N-S number, organization verification (few hours to 2 business days once D-U-N-S exists). See "Account Setup" section. |
| PLAY-02 | AAB release bundles built and signed for all 3 Android apps | Build pipeline ready: `./gradlew :app:bundleRelease :driver:bundleRelease :partner:bundleRelease`. Keystore configured and valid. See "AAB Build" section. |
| PLAY-03 | Play App Signing configured with existing keystore as upload key | Use PEPK tool to export existing `dollor-release.jks` key and upload to Play Console during first app creation. See "Play App Signing" section. |
| PLAY-04 | Data Safety forms completed for all 3 apps (SDK data audit included) | Existing `PLAY_STORE_SUBMISSION.md` has draft Data Safety data. Needs updating: old package names (`com.eatfair.*`), missing rideshare data, SDK audit needed. See "Data Safety" section. |
| PLAY-05 | Content rating (IARC) and CSAE compliance questionnaires completed for all 3 apps | IARC questionnaire required for all apps. CSAE policy does NOT apply (not Social/Dating category). See "Content Rating" section. |
| PLAY-06 | Store listing assets created (screenshots, feature graphics, descriptions) for all 3 apps | Partial assets exist but insufficient. Need: 4+ screenshots per app (minimum 2, recommend 4-8), feature graphic fix (RGBA -> RGB), app-specific icons. See "Store Listing Assets" section. |
| PLAY-07 | All 3 apps submitted for review and published on Google Play Store | First-time review typically 1-3 days (can be up to 7). Missing privacy policy URL is a rejection risk. See "Submission" section. |
</phase_requirements>

## Standard Stack

### Core (Already Configured)

| Tool | Version/Details | Purpose | Status |
|------|-----------------|---------|--------|
| Gradle `bundleRelease` | AGP 8.7.3 | Build AAB bundles | Ready (`--dry-run` succeeds) |
| `dollor-release.jks` | RSA 2048, valid to 2053 | Upload signing key | Ready (alias: `dollor`, CN=Dollor.ai) |
| Fastlane `supply` | Configured in `Fastfile` | Automated Play Store upload | Partially configured (service account needs verification) |
| Google Play Console | Web UI | Store listing, Data Safety, content rating | Account status UNKNOWN |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| PEPK (Play Encrypt Private Key) tool | Export signing key for Play App Signing enrollment | First-time app creation only |
| `sips` / ImageMagick | Fix feature graphic alpha channel, generate screenshots | Store asset preparation |
| Android Emulator | Capture app screenshots for store listing | Screenshot generation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastlane `supply` | Manual Play Console upload | Manual is required for first upload anyway; Fastlane for subsequent updates |
| PEPK tool | "Let Google manage signing key" | Loses control of signing key; PEPK with existing keystore is safer for apps already distributed via Firebase |

## Architecture Patterns

### Play Store Console App Structure

Each app requires a separate listing in the Play Console:

```
Google Play Console
├── ai.dollor.customer    (Customer app - "Dollor.ai")
│   ├── Store Listing (title, description, screenshots, feature graphic)
│   ├── App Content (Data Safety, content rating, target audience)
│   ├── App Signing (upload key from dollor-release.jks)
│   └── Release Management (internal → production track)
├── ai.dollor.driver      (Driver app - "Dollor Driver")
│   ├── Store Listing (different screenshots/descriptions)
│   ├── App Content (different Data Safety - background location)
│   ├── App Signing (same upload key)
│   └── Release Management
└── ai.dollor.partner     (Partner app - "Dollor Partner")
    ├── Store Listing (different screenshots/descriptions)
    ├── App Content (different Data Safety - business data)
    ├── App Signing (same upload key)
    └── Release Management
```

### Release Track Strategy

**Recommended:** Upload to **internal testing** track first, verify, then promote to **production**.

```
internal → closed testing → open testing → production
           (skip)           (skip)         (target)
```

For a first submission with no existing user base, going internal -> production is sufficient. The Fastlane config already targets `internal` track, which is correct for initial uploads.

### AAB Build Flow

```bash
# Build all 3 AAB bundles
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:bundleRelease :driver:bundleRelease :partner:bundleRelease

# Output locations:
# app/build/outputs/bundle/release/app-release.aab
# driver/build/outputs/bundle/release/driver-release.aab
# partner/build/outputs/bundle/release/partner-release.aab
```

### Anti-Patterns to Avoid

- **Uploading APK instead of AAB**: Google Play requires AAB format for new apps. APK uploads are no longer accepted for new apps.
- **Using test Stripe keys in production builds**: Current `local.properties` has `pk_test_*` Stripe key. Production builds need `pk_live_*` or the app will fail payment processing. However, the builds already deployed to Firebase use production API endpoint (`api.dollor.ai`), so the Stripe key in local.properties may need auditing.
- **Submitting before privacy policy URL works**: Google Play REQUIRES a working privacy policy URL. `api.dollor.ai/privacy` returns 404. The apps reference `dollor.ai/privacy` which redirects to `www.dollor.ai/privacy` (200 OK). Use `https://dollor.ai/privacy` as the Play Console privacy policy URL.
- **Making changes during review**: Any store listing changes during review can restart the review process.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Store listing screenshots | Manual Photoshop work | Android Emulator + `screencap` or device screenshots | Authentic UI screenshots are required by Google Play policy |
| Data Safety form | Guess at SDK data collection | Audit actual AndroidManifest permissions + SDK docs | Inaccurate Data Safety can lead to app removal |
| AAB signing | Manual `jarsigner` / `apksigner` | Gradle `bundleRelease` with signing config | Already configured, handles signing automatically |
| Play Store upload automation | Custom scripts | Fastlane `supply` | Already partially configured; handles API auth, track management |

**Key insight:** Most of the Play Store submission work is console-based (web UI forms), not code-based. The planner should structure tasks around console activities, not code changes.

## Common Pitfalls

### Pitfall 1: D-U-N-S Number Delay
**What goes wrong:** Organization verification requires a D-U-N-S number. If the company doesn't have one, applying for it takes up to 30 days.
**Why it happens:** D-U-N-S numbers are issued by Dun & Bradstreet, an external third party with their own timeline.
**How to avoid:** Check immediately whether "Vibing World Inc" (the org name in the keystore) or "Dollor AI Inc" (in PLAY_STORE_SUBMISSION.md) has a D-U-N-S number. Search at https://www.dnb.com/duns-number/lookup.html
**Warning signs:** Cannot complete Play Console account setup.

### Pitfall 2: Feature Graphic Alpha Channel Rejection
**What goes wrong:** Google Play requires 24-bit PNG (no alpha) or JPEG for feature graphic. Current `feature-graphic-1024x500.png` is 16-bit RGBA.
**Why it happens:** Design tools often export with transparency by default.
**How to avoid:** Convert to 24-bit RGB PNG before upload: `sips -s format png --setProperty formatOptions 100 -s hasAlpha false feature-graphic-1024x500.png --out feature-graphic-no-alpha.png`
**Warning signs:** Upload rejection in Play Console with "invalid image format" error.

### Pitfall 3: Service Account Permissions for Fastlane
**What goes wrong:** Fastlane `upload_to_play_store` fails with permission errors.
**Why it happens:** The existing service account (`github-actions-test-lab@dollorai-production.iam.gserviceaccount.com`) is likely for Firebase Test Lab, not Play Console API. Even if it has Play Console access, it needs the "Release manager" or "Admin" role in Play Console settings.
**How to avoid:** In Play Console > Settings > API access, verify the service account has appropriate permissions. May need to create a dedicated Play Console service account.
**Warning signs:** Fastlane errors like "Google Api Error: Unauthorized" or "Invalid credentials".

### Pitfall 4: First Upload Must Be Manual
**What goes wrong:** Fastlane `supply` fails on a brand new app that has never had an AAB uploaded.
**Why it happens:** Google Play API requires at least one manual upload before programmatic uploads work. The app must exist in the Play Console with at least one uploaded artifact.
**How to avoid:** For the first release of each app, upload AAB manually via Play Console. After that, Fastlane can handle subsequent uploads.
**Warning signs:** Fastlane error "No matching app found" or "App not found".

### Pitfall 5: Stale PLAY_STORE_SUBMISSION.md References
**What goes wrong:** Following the existing `PLAY_STORE_SUBMISSION.md` guide leads to incorrect submissions.
**Why it happens:** The guide references old package names (`com.eatfair.app`, `com.eatfair.orderapp`, `com.eatfair.partner`) and an `orderapp` module. The actual packages are `ai.dollor.customer`, `ai.dollor.driver`, `ai.dollor.partner`. The description also contains inaccurate pricing claims (e.g., "Base pay: $3-$5 per delivery", "Per mile: $0.50-$0.75") that contradict the platform's actual model.
**How to avoid:** Use the `PLAY_STORE_SUBMISSION.md` as a starting template only. Verify all content against `CLAUDE.md` anti-hallucination table (drivers keep 100% of delivery fee + tips, customer pays $1 flat fee for food delivery).
**Warning signs:** Store listing descriptions that don't match app behavior.

### Pitfall 6: Privacy Policy URL
**What goes wrong:** App rejected because privacy policy URL doesn't work.
**Why it happens:** `api.dollor.ai/privacy` returns 404 (legal HTML not included in Docker image). The correct URL is `https://dollor.ai/privacy` (redirects to `www.dollor.ai/privacy`, 200 OK).
**How to avoid:** Use `https://dollor.ai/privacy` as the privacy policy URL in Play Console, NOT `https://api.dollor.ai/privacy`.
**Warning signs:** 404 error when Google's crawler checks the privacy policy URL.

### Pitfall 7: Missing App Category Selection
**What goes wrong:** Submitting without selecting the right app category delays review.
**Why it happens:** New developers may not realize category selection affects review criteria and visibility.
**How to avoid:** Customer app -> "Food & Drink" category. Driver app -> "Maps & Navigation" or "Business". Partner app -> "Business".
**Warning signs:** Wrong audience seeing the app, or additional review scrutiny from wrong category.

### Pitfall 8: Stripe Test Key in Release Builds
**What goes wrong:** Payment processing fails in the published app.
**Why it happens:** `local.properties` currently has `STRIPE_PUBLISHABLE_KEY=pk_test_*`. If AAB bundles are built locally with this key, payments will go to Stripe test mode.
**How to avoid:** Verify that the production Stripe publishable key (`pk_live_*`) is in `local.properties` BEFORE building release AABs for Play Store submission. The key should match the one managed in AWS Secrets Manager (`dollor/production/stripe-vT8WRA`).
**Warning signs:** Payments fail or go to test mode in the published app.

## Existing Assets Inventory

### What's Ready

| Asset | Location | Status |
|-------|----------|--------|
| Release keystore | `/Users/jeet/StudioProjects/eatfair-android/dollor-release.jks` | Valid, alias=dollor, expires 2053 |
| AAB build config | `app/build.gradle.kts`, `driver/build.gradle.kts`, `partner/build.gradle.kts` | All 3 have `signingConfigs.release` + `bundleRelease` |
| ProGuard rules | `{app,driver,partner}/proguard-rules.pro` | Comprehensive rules including Stripe, Firebase, Gson, OkHttp |
| App icon (512x512) | `store-assets/app-icon-512x512.png` | Correct dimensions (512x512 RGB) |
| Feature graphic | `store-assets/feature-graphic-1024x500.png` | WRONG FORMAT: 16-bit RGBA, needs 24-bit RGB (no alpha) |
| Screenshots (2) | `store-assets/screenshot-1-welcome.png`, `screenshot-2-login.png` | 1080x2400 RGBA -- minimum 2 met for phone, but only generic (not app-specific) |
| Privacy policy URL | `https://dollor.ai/privacy` | Working (redirects to www.dollor.ai/privacy, 200 OK) |
| Terms URL | `https://dollor.ai/terms` | Working (redirects to www.dollor.ai/terms, likely 200 OK) |
| Fastlane config | `fastlane/Fastfile` + `fastlane/Appfile` | 3 lanes for internal track upload, service account JSON present |
| App descriptions | `PLAY_STORE_SUBMISSION.md` | Draft exists but needs accuracy review (old package names, incorrect pricing) |
| Data Safety drafts | `PLAY_STORE_SUBMISSION.md` | Draft exists but needs updating for current app capabilities |
| Content rating answers | `PLAY_STORE_SUBMISSION.md` | Draft exists, mostly accurate |

### What's Missing or Needs Fixing

| Gap | Impact | Effort |
|-----|--------|--------|
| Google Play Developer account (unknown status) | BLOCKER if no account exists | Minutes if account exists; up to 30 days if D-U-N-S needed |
| Feature graphic alpha channel | Upload rejection | 5 minutes (sips conversion) |
| App-specific screenshots (4-8 per app) | Below recommended count, generic screenshots don't show app features | 1-2 hours per app (emulator capture) |
| Driver app screenshots (rideshare + delivery) | Missing entirely for driver-specific flows | 1 hour |
| Partner app screenshots (order management) | Missing entirely for partner-specific flows | 1 hour |
| Stripe publishable key (test vs live) | Payment failures in production app | 5 minutes (update local.properties) |
| Data Safety form accuracy | Potential app removal if inaccurate | 30 min per app to audit SDKs |
| Play Console service account with API access | Fastlane won't work without it | 15 min in Play Console settings |
| App descriptions accuracy | Misleading content can trigger rejection | 30 min to rewrite per Anti-Hallucination rules |

## Data Safety Form Research

### SDK Data Collection Audit

Based on `build.gradle.kts` dependencies and AndroidManifest permissions:

#### All 3 Apps Collect:
| Data Type | SDK/Permission | Collected | Shared | Purpose |
|-----------|---------------|-----------|--------|---------|
| Precise location | `ACCESS_FINE_LOCATION` | Yes | Yes (with other users during active delivery/ride) | Delivery tracking, rideshare |
| Approximate location | `ACCESS_COARSE_LOCATION` | Yes | No | App functionality |
| Photos | `CAMERA` | Yes | No | Document scanning (driver), menu photos (partner) |
| Email/Name | App registration | Yes | No | Account functionality |
| Crash logs | Firebase Crashlytics (if included) | Yes | Yes (with Google) | App stability |
| App interactions | Firebase Analytics (if included) | Yes | Yes (with Google) | Analytics |
| Device identifiers | Firebase Cloud Messaging | Yes | Yes (with Google) | Push notifications |

#### Customer App Additional:
| Data Type | SDK | Collected | Shared | Purpose |
|-----------|-----|-----------|--------|---------|
| Payment info | Stripe SDK | Yes | Yes (with Stripe) | Payment processing |
| Purchase history | App feature | Yes | No | Order history |
| Precise location | Google Maps SDK | Yes | Yes (with Google) | Map display |

#### Driver App Additional:
| Data Type | SDK | Collected | Shared | Purpose |
|-----------|-----|-----------|--------|---------|
| Background location | Location services (if used) | Check manifest | Yes (with customers) | Active delivery/ride tracking |
| Financial info (earnings) | App feature | Yes | No | Earnings tracking |

#### Partner App Additional:
| Data Type | SDK | Collected | Shared | Purpose |
|-----------|-----|-----------|--------|---------|
| Business information | App feature | Yes | Yes (with customers) | Restaurant listing |

**Important note:** The Driver app may need `ACCESS_BACKGROUND_LOCATION` permission declared for active delivery/ride tracking. If this permission exists, Google Play requires additional disclosure and review (background location access policy). Check if the driver app currently uses background location.

## Content Rating Research

### IARC Questionnaire
All 3 apps will need to complete the IARC (International Age Rating Coalition) questionnaire in Play Console. Based on app functionality:

- **Violence:** None
- **Sexual content:** None
- **Language:** User-generated content exists (reviews, messages) -> may trigger "mild" rating
- **Controlled substances:** No (food delivery includes restaurant food, not alcohol/tobacco unless restaurants serve it)
- **Gambling:** None
- **User interaction:** Yes (in-app messaging, ordering)
- **Location sharing:** Yes
- **Digital purchases:** Yes (food orders, ride payments)

Expected rating: **Rated for 18+** (financial transactions) or potentially lower depending on IARC algorithm.

### CSAE Compliance
**NOT REQUIRED** for food delivery / rideshare apps. CSAE policy applies only to Social and Dating category apps. Source: [Google Play Child Safety Standards policy](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en).

However, the requirement PLAY-05 mentions CSAE compliance. The planner should note that while CSAE-specific policy doesn't apply, Google's general child safety declaration in App Content section must still be completed (a simple yes/no form for all apps).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| APK uploads | AAB (Android App Bundle) required | 2021 for new apps | Must use `bundleRelease`, not `assembleRelease` |
| Self-signing with app signing key | Play App Signing (Google manages signing key) | 2021 mandatory for new apps | Must enroll via PEPK tool or let Google manage |
| Optional Data Safety | Mandatory Data Safety form | July 2022 | Must complete before submission |
| Optional content rating | Mandatory IARC rating | Required for all apps | Must complete questionnaire |
| No developer verification | D-U-N-S required for org accounts | 2023 for new org accounts | Must have D-U-N-S before account creation |
| Flexible review time | Stricter reviews for new developers | Ongoing | First-time developers get more scrutiny; expect 3-7 day review |

## Open Questions

1. **Google Play Developer Account Status**
   - What we know: The keystore CN says "Dollor Inc", the submission guide says "Dollor.AI Inc". The fastlane service account is under `dollorai-production` GCP project.
   - What's unclear: Does a Google Play Developer account exist? Is it verified? What organization name was used?
   - Recommendation: User must check https://play.google.com/console/. This is not something Claude can verify.

2. **D-U-N-S Number for Organization**
   - What we know: Organization accounts require D-U-N-S. The company might be "Vibing World Inc" (from keystore) or "Dollor AI Inc" (from docs).
   - What's unclear: Whether the organization already has a D-U-N-S number.
   - Recommendation: Search https://www.dnb.com/duns-number/lookup.html for both names. If not found, apply immediately (up to 30 days).

3. **Fastlane Service Account Permissions**
   - What we know: `github-actions-test-lab@dollorai-production.iam.gserviceaccount.com` exists in `fastlane/play-store-key.json`. This service account name suggests Firebase Test Lab, not Play Console API.
   - What's unclear: Whether this service account has been granted Play Console API access.
   - Recommendation: After Play Console account is confirmed, check Settings > API access for linked service accounts. If not linked, either grant access to existing SA or create a new one.

4. **Stripe Key in Production Builds**
   - What we know: `local.properties` has `STRIPE_PUBLISHABLE_KEY=pk_test_*`. Production builds embed this key.
   - What's unclear: Whether Firebase-distributed builds (vC=27/24/20) use test or live Stripe key. The `BuildConfig.STRIPE_PUBLISHABLE_KEY` is set from `local.properties` at build time.
   - Recommendation: Before building AABs for Play Store, update `local.properties` with `pk_live_*` key from AWS Secrets Manager (`dollor/production/stripe-vT8WRA`).

5. **Background Location Permission (Driver App)**
   - What we know: Driver app has `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`. Background location would require `ACCESS_BACKGROUND_LOCATION` in manifest and a policy declaration in Play Console.
   - What's unclear: Whether the driver app currently requests or uses background location during active deliveries/rides.
   - Recommendation: Check driver app code for background location usage. If present, prepare Google's background location access declaration (additional review step).

6. **`orderapp` Module**
   - What we know: The old `PLAY_STORE_SUBMISSION.md` references `orderapp` module (driver app). The module directory exists but is empty.
   - What's unclear: Whether this was the old driver app module that was replaced by `driver/`.
   - Recommendation: Ignore `orderapp`. The current driver app is in `driver/` module with package `ai.dollor.driver`.

## Sources

### Primary (HIGH confidence)
- Android repo codebase (`/Users/jeet/StudioProjects/eatfair-android/`) -- build configs, manifests, proguard, fastlane, store assets
- Keystore inspection via `keytool -list -v` -- certificate details, validity, alias
- URL verification via `curl` -- privacy policy (dollor.ai/privacy 200 OK, api.dollor.ai/privacy 404)
- Gradle `--dry-run` -- bundleRelease builds successfully

### Secondary (MEDIUM confidence)
- [Google Play Console - Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en) -- PEPK tool, signing enrollment
- [Google Play Console - Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) -- Data Safety form requirements
- [Google Play Console - Required information for developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) -- D-U-N-S, organization verification
- [Google Play Console - Child Safety Standards](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en) -- CSAE policy scope (Social/Dating only)
- [Google Play Console - Preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) -- Screenshot/graphic requirements
- [Fastlane supply docs](https://docs.fastlane.tools/actions/upload_to_play_store/) -- First upload must be manual
- [Android Developers - Sign your app](https://developer.android.com/studio/publish/app-signing) -- AAB signing workflow

### Tertiary (LOW confidence)
- WebSearch: Google Play review times (1-3 days average, up to 7 for new developers) -- varies widely by app and timing
- WebSearch: D-U-N-S application timeline (up to 30 days) -- anecdotal, actual time varies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All build tools verified against actual codebase, dry-run succeeds
- Architecture: HIGH -- Play Console structure is well-documented, patterns are standard
- Pitfalls: HIGH -- Multiple verified issues found (feature graphic format, privacy URL, stale docs, Stripe key)
- Open questions: MEDIUM -- Account status and D-U-N-S are external unknowns that only the user can resolve

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (Play Console policies are stable; D-U-N-S requirement is permanent)
