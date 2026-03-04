---
phase: quick-77
plan: 1
subsystem: ui
tags: [ios, swiftui, fare-estimate, pricing, race-condition]

requires:
  - phase: quick-76
    provides: "Build 1110 on TestFlight with auth-restored fare estimate endpoint"
provides:
  - "Fare estimate flash/wrong-price bug fixed — 3 root causes resolved"
  - "Backend total/subtotal used directly for fare display (no client-side recalculation mismatch)"
  - "fareEstimateReceived gate prevents default value flash"
  - "Opaque estimation overlay prevents reading stale values"
  - "iOS rideMinFare aligned to backend $8.00"
  - "iOS Customer build 1111 on TestFlight, attached to ASC version"
affects: [ios-customer, app-store-submission, rideshare-pricing]

tech-stack:
  added: []
  patterns:
    - "Backend-first fare display: use estimate.total/subtotal directly, local calc as fallback only"
    - "fareEstimateReceived gating pattern: hide computed UI until API response arrives"
    - "Separate isEstimatingFare vs isLoading overlay for distinct loading states"

key-files:
  created: []
  modified:
    - apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift
    - apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
    - apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj

key-decisions:
  - "Use backend total/subtotal as primary display values with local-calc fallback (not client-side recalculation)"
  - "Gate fare section on fareEstimateReceived AND canRequestRide (not just canRequestRide)"
  - "Opaque white overlay (0.95 opacity) for fare estimation vs semi-transparent black for ride request"

patterns-established:
  - "Backend-first pricing: always prefer server-calculated totals over client-side recomputation"
  - "Two-phase loading states: isEstimatingFare (pre-request) vs isLoading (during request)"

requirements-completed: [FARE-FLASH-FIX]

duration: 13min
completed: 2026-03-04
---

# Quick Task 77: Fix Fare Estimate Flash + Wrong Price Summary

**Fixed 3 fare estimate root causes: race-condition gate, backend-total display, opaque overlay + min fare alignment (build 1111 on TestFlight)**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-04T15:35:57Z
- **Completed:** 2026-03-04T15:49:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Eliminated fare flash by gating fare section on `fareEstimateReceived` flag (no default $6.00 shown)
- Fixed fare total mismatch by using `backendTotal`/`backendSubtotal` directly from API (includes time_adjustment + long_distance_discount)
- Added opaque "Estimating fare..." overlay (white 0.95) separate from ride request loading overlay
- Corrected AppConfig.rideMinFare from $5.00 to $8.00 to match backend pricing_config.py
- Build 1111 archived, uploaded to TestFlight, and attached to ASC version (PREPARE_FOR_SUBMISSION)

## Task Commits

1. **Task 1: Fix all 3 fare estimate root causes** - `2bbec74d` (fix)
2. **Task 2: Bump build + archive + upload + ASC attach** - `d9a2a88b` (chore)

## Files Modified
- `apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift` - Added fareEstimateReceived, isEstimatingFare, backendTotal/backendSubtotal; modified fareBeforeTax/estimatedFare to use backend values; reset flags in estimateFare()
- `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift` - Gated fare section on fareEstimateReceived; added opaque estimation overlay
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` - Changed rideMinFare from $5.00 to $8.00
- `apps/ios/customer/eatfaircustomer.xcodeproj/project.pbxproj` - Bumped CURRENT_PROJECT_VERSION 1110 to 1111 (6 occurrences)

## Decisions Made
- Use backend total/subtotal as primary display values with local-calc fallback -- eliminates time_adjustment and long_distance_discount mismatch without changing breakdown line items
- Gate fare section on `fareEstimateReceived && canRequestRide` -- prevents rendering default values before API responds
- Separate `isEstimatingFare` from `isLoading` -- different loading states need different UI treatments (opaque vs semi-transparent)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ASC API query for build initially failed when using numeric app ID `6738976065` -- resolved by discovering correct app ID `6758230264` via bundle ID lookup
- dSYM warnings during export for FirebaseFirestoreInternal, absl, grpc frameworks -- non-blocking (third-party frameworks)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Build 1111 on TestFlight with fare flash fix, ready for App Store submission
- All 3 root causes addressed: race condition (gate), recalculation mismatch (backend values), visual leak (opaque overlay)
- Min fare aligned at $8.00 across iOS and backend

---
*Phase: quick-77*
*Completed: 2026-03-04*
