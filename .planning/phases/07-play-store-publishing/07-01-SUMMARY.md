---
phase: 07-play-store-publishing
plan: 01
subsystem: android, store-assets
tags: [android, aab, play-store, data-safety, store-listing, gradle, imagemagick]

# Dependency graph
requires:
  - phase: none
    provides: "Android repo with build configs, keystore, and store-assets directory"
provides:
  - "3 signed AAB bundles (Customer, Driver, Partner) ready for Play Console upload"
  - "Alpha-corrected feature graphic (24-bit RGB PNG, 1024x500)"
  - "Accurate store listing descriptions for all 3 apps"
  - "SDK-audited Data Safety form responses for all 3 apps"
affects: [07-02-PLAN, 07-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ImageMagick for alpha channel stripping (sips failed with error 13)"
    - "Anti-hallucination verified store descriptions with checklist"

key-files:
  created:
    - "/Users/jeet/StudioProjects/eatfair-android/store-assets/feature-graphic-no-alpha.png"
    - "/Users/jeet/StudioProjects/eatfair-android/store-assets/STORE_LISTINGS.md"
    - "/Users/jeet/StudioProjects/eatfair-android/store-assets/DATA_SAFETY.md"
  modified: []

key-decisions:
  - "Used ImageMagick instead of sips for alpha stripping (sips failed with error 13 on hasAlpha property)"
  - "Proceeded with build despite pk_test_ Stripe key -- plan allows 'verified or user warned'"
  - "Confirmed no ACCESS_BACKGROUND_LOCATION in any app -- foreground-only location collection"
  - "Firebase Analytics and Crashlytics NOT included despite being in version catalog -- accurately reported as absent in Data Safety"

patterns-established:
  - "Anti-hallucination checklist in store listing docs for pricing accuracy verification"
  - "SDK audit methodology: shared module api() deps + per-module deps + manifest permissions"

requirements-completed: [PLAY-02, PLAY-04, PLAY-06]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 07 Plan 01: Play Store Build & Assets Summary

**3 signed AAB bundles built with dollor-release.jks, feature graphic alpha-stripped, store listings and Data Safety audit created for all 3 Android apps**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-27T23:15:30Z
- **Completed:** 2026-02-27T23:20:02Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- Built all 3 AAB bundles (Customer 42MB, Driver 31MB, Partner 31MB) signed with dollor-release.jks
- Converted feature graphic from RGBA to 24-bit RGB PNG (no alpha) for Play Console compliance
- Created STORE_LISTINGS.md with anti-hallucination-compliant descriptions for all 3 apps
- Created DATA_SAFETY.md with SDK-audited Data Safety form responses (Firebase Auth/Firestore/Storage/FCM, Maps, Stripe customer-only, no background location)

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify Stripe key, fix feature graphic, build AABs** - `ea1b67a1` (feat)
2. **Task 2: Create store listings and Data Safety audit** - `c207e1ff` (docs)

_Note: Commits are in the Android repo (`/Users/jeet/StudioProjects/eatfair-android`), not the iOS/backend repo._

## Files Created/Modified
- `store-assets/feature-graphic-no-alpha.png` - Alpha-stripped feature graphic (1024x500 RGB PNG)
- `store-assets/STORE_LISTINGS.md` - Store listing text for Customer, Driver, Partner apps
- `store-assets/DATA_SAFETY.md` - Data Safety form responses audited against manifests and SDKs

## Decisions Made
- **ImageMagick over sips:** `sips -s hasAlpha false` failed with error 13. Used `convert -alpha off` (ImageMagick) instead. Both produce valid 24-bit RGB PNG.
- **Stripe test key warning:** `local.properties` has `pk_test_*` Stripe key. User must update to `pk_live_*` from AWS Secrets Manager (`dollor/production/stripe-vT8WRA`) before final Play Store submission. AABs can be rebuilt quickly (`./gradlew bundleRelease` takes ~34s).
- **No background location:** Confirmed all 3 apps only use foreground location (`ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`). No `ACCESS_BACKGROUND_LOCATION` declared in any manifest. This simplifies Play Console Data Safety and avoids background location policy review.
- **Firebase Analytics/Crashlytics absent:** `firebase-analytics-ktx` and crashlytics are in the version catalog but NOT included as dependencies. Data Safety accurately reports no analytics or crash log collection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] sips alpha stripping failed, used ImageMagick**
- **Found during:** Task 1 (feature graphic fix)
- **Issue:** `sips -s hasAlpha false` returned error 13 "an unknown error occurred"
- **Fix:** Used ImageMagick `convert -alpha off` to strip alpha channel
- **Files modified:** `store-assets/feature-graphic-no-alpha.png`
- **Verification:** `sips -g hasAlpha` confirms `hasAlpha: no`, dimensions 1024x500
- **Committed in:** `ea1b67a1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking tool failure)
**Impact on plan:** Minimal -- alternate tool produced identical result.

## Issues Encountered
- **Stripe test key:** `local.properties` contains `pk_test_*` key. The plan allows proceeding with a warning. AABs were built with this key embedded. Before submitting to Play Store, the user must update to the production `pk_live_*` key and rebuild (`./gradlew :app:bundleRelease :driver:bundleRelease :partner:bundleRelease`). This is a ~34 second rebuild.

## User Setup Required

**Before Play Store submission, the user must:**
1. Update `STRIPE_PUBLISHABLE_KEY` in `/Users/jeet/StudioProjects/eatfair-android/local.properties` from `pk_test_*` to `pk_live_*` (from AWS Secrets Manager: `dollor/production/stripe-vT8WRA`)
2. Rebuild AABs: `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:bundleRelease :driver:bundleRelease :partner:bundleRelease`

## Next Phase Readiness
- AAB bundles ready for Play Console upload (after Stripe key fix and rebuild)
- Feature graphic ready for Play Console upload (no alpha channel)
- Store listing descriptions ready for copy-paste into Play Console
- Data Safety form responses ready for entry into Play Console
- Plan 02 (Play Console setup) and Plan 03 (submission) can proceed once Google Play Developer account is confirmed

## Self-Check: PASSED

All deliverables verified:
- [x] `feature-graphic-no-alpha.png` exists (24-bit RGB, 1024x500)
- [x] `STORE_LISTINGS.md` exists with all 3 app descriptions
- [x] `DATA_SAFETY.md` exists with all 3 app Data Safety responses
- [x] `app-release.aab` exists (42MB, jar verified)
- [x] `driver-release.aab` exists (31MB, jar verified)
- [x] `partner-release.aab` exists (31MB, jar verified)
- [x] Commit `ea1b67a1` exists (Task 1)
- [x] Commit `c207e1ff` exists (Task 2)

---
*Phase: 07-play-store-publishing*
*Completed: 2026-02-27*
