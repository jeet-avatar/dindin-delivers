---
phase: quick-17
plan: 01
subsystem: api
tags: [android, retrofit, okhttp, gson, serializedname, rideshare]

requires:
  - phase: 02-security-auth-fix
    provides: "Backend auth middleware and endpoint definitions"
provides:
  - "Corrected Android Retrofit rideshare models matching backend JSON shapes"
  - "Verified 32 Android customer rideshare API paths against backend routes"
affects: [android-builds, rideshare-testing]

tech-stack:
  added: []
  patterns:
    - "Backward-compatible computed properties when changing @SerializedName fields"
    - "@Query params for backend Query() parameters instead of @Body"

key-files:
  created:
    - ".planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md"
  modified:
    - "shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt"
    - "shared/src/main/java/ai/dollor/shared/model/ApiModels.kt"

key-decisions:
  - "Keep backward-compatible computed property aliases (rideId, lat/lng, estimatedFare) to avoid breaking existing callers"
  - "CustomerFareOfferRequest marked @Deprecated since negotiate endpoint uses @Query not @Body"
  - "RideEstimateResponse mapped to main_new.py:19320 flat response (not bid_routes.py wrapped response)"

patterns-established:
  - "Android Retrofit @Query for backend Query() params: never use @Body for FastAPI Query parameters"
  - "Always add @SerializedName for every snake_case field from backend JSON responses"

requirements-completed: [QUICK-17]

duration: 6min
completed: 2026-02-23
---

# Quick Task 17: Android Customer Rideshare API Audit Summary

**Fixed 12 Retrofit model/endpoint mismatches (RideRequest coords, negotiate @Query params, 7 response model shapes) across DollorApiService.kt and ApiModels.kt -- all 4 Android modules compile clean**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T02:19:14Z
- **Completed:** 2026-02-23T02:25:18Z
- **Tasks:** 3
- **Files modified:** 2 (in Android repo) + 1 audit report (in main repo)

## Accomplishments
- Audited all 32 Android customer rideshare API calls (24 OkHttp + 8 Retrofit) against backend routes with grep verification
- Fixed 12 mismatches: 2 Retrofit method signatures + 7 model shapes + 3 field name corrections
- All 4 Android modules (app, shared, driver, partner) compile successfully with 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit all Android customer rideshare APIs** - `b29699d9` (docs) -- in doordash-p2p repo
2. **Task 2: Fix all mismatches found in audit** - `a9d2f42d` (fix) -- in eatfair-android repo
3. **Task 3: Full build verification** - verified via `./gradlew assembleDebug` for all modules

## Files Created/Modified

### Created (doordash-p2p repo)
- `.planning/quick/17-audit-and-fix-android-customer-rideshare/AUDIT_REPORT.md` -- Full audit with MATCH/MISMATCH per endpoint

### Modified (eatfair-android repo)
- `shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt` -- customerSubmitFareOffer and customerAcceptDriverFare now use @Query params
- `shared/src/main/java/ai/dollor/shared/model/ApiModels.kt` -- 7 model fixes with backward-compatible aliases

## Detailed Changes

### DollorApiService.kt (2 fixes)
| Method | Before | After |
|--------|--------|-------|
| `customerSubmitFareOffer` | `@Body CustomerFareOfferRequest` | `@Query("proposed_fare") Double` |
| `customerAcceptDriverFare` | No fare param | `@Query("accepted_fare") Double` |

### ApiModels.kt (10 fixes)
| Model | Field | Before | After |
|-------|-------|--------|-------|
| `RideRequest` | coordinates | `pickup_lat`/`pickup_lng` | `pickup_latitude`/`pickup_longitude` |
| `RideRequest` | new fields | -- | `ride_type`, `bidding_duration_minutes` |
| `RideResponse` | shape | `ride_id`, `status`, `estimated_fare` | `success`, `ride_request_id`, `ride_request` |
| `RideTrackingResponse` | shape | `ride_id`, `eta` | `ride_request_id`, `eta_minutes`, `pickup`, `dropoff`, `final_price` |
| `DriverLocation` | coords | `lat`, `lng` | `latitude`, `longitude` |
| `RideEstimateResponse` | shape | `estimated_fare`, `estimated_time` | `fare_estimate`, `total_fare`, `distance_miles`, `duration_minutes` etc. |
| `FareBreakdown` | fields | `base`, `distance` | `base_fare`, `distance_cost`, `time_cost` |
| `FareNegotiationResponse` | shape | `ride_id`, `negotiation_status`, `is_accepted` | `success`, `status`, `customer_offer`, `driver_offer` |
| `CustomerFareOfferRequest` | field + status | `offered_fare` | `proposed_fare`, marked `@Deprecated` |

## Decisions Made
- Kept backward-compatible computed property aliases (`rideId`, `lat`/`lng`, `estimatedFare`, `estimatedTime`, `negotiationStatus`, `isAccepted`, `base`, `distance`) so existing callers compile without changes
- Mapped `RideEstimateResponse` to the Android-specific endpoint at `main_new.py:19320` (flat response) rather than the bid_routes.py estimate (wrapped response), since that's what `POST /api/rides/estimate` returns
- Marked `CustomerFareOfferRequest` as `@Deprecated` since the negotiate endpoint now uses `@Query` -- model retained for backward compatibility

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Steps
- The Retrofit layer (`DollorApiService`) is now a backup; primary customer rideshare flow uses `CustomerRideshareApiService` (OkHttp) which was already correct
- Consider removing the deprecated `CustomerFareOfferRequest` in a future cleanup
- Build and distribute updated APKs via Firebase App Distribution

---
*Quick Task: 17*
*Completed: 2026-02-23*
