---
status: diagnosed
trigger: "iOS Customer app shows wrong fare price on first screen with a visual flash, then shows correct price on second screen/tap"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — Three interacting root causes identified
test: Complete code trace of fare estimate flow from user tap through API to render
expecting: N/A — investigation complete
next_action: Report findings

## Symptoms

expected: When user requests a ride fare estimate, the correct fare should display immediately on the first screen without any flash or incorrect values.
actual: First screen shows wrong fare amount with a flash/flicker. Second screen (or second tap) shows the correct fare. The UI briefly renders incorrect data before correcting.
errors: No crash, no error message — just wrong data displayed briefly then corrected on retry.
reproduction: Open iOS Customer app → go to rideshare → enter pickup/dropoff → request fare estimate → observe wrong price + flash on first load → tap again → see correct price.
started: Noticed on build 1108/1109/1110. Fare estimate endpoint recently modified (quick-73 coordinate validation, auth changes).

## Eliminated

- hypothesis: Router conflict between bid_routes.py and order_flow.py for /rides/estimate
  evidence: order_flow.py has prefix /api/erp so its endpoint is /api/erp/rides/estimate. bid_routes.py has prefix /api/rides so it correctly handles /api/rides/estimate. No conflict.
  timestamp: 2026-03-04

- hypothesis: SSL pinning causing first-request failure
  evidence: SSL pinning uses root CA pins which never fail for valid certs. No evidence of connection-level failures.
  timestamp: 2026-03-04

- hypothesis: Token migration timing causing auth failure on first API call
  evidence: migrateFromUserDefaults() runs synchronously in P2PAPIService.init() before any API calls. Token is in Keychain by the time estimateRideFare is called.
  timestamp: 2026-03-04

- hypothesis: Pydantic validation error from extra state_code field
  evidence: Pydantic v2 default is extra='ignore', so state_code sent by iOS is silently discarded. No validation error.
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: RideRequestViewModel.swift @Published property initializations (lines 25-31)
  found: Default values are baseFare=$2.50, distanceFee=$0.0, timeFee=$0.0, surgeMultiplier=1.0, estimatedDistance=0.0, estimatedDuration=0.0
  implication: These defaults produce a computed estimatedFare of ~$6.00 (minimumFare $5.00 + $1.00 platform fee) which is WRONG for any real trip

- timestamp: 2026-03-04
  checked: setDropoffLocation() flow (ViewModel line 216-229)
  found: Sets dropoffAddress FIRST (line 217-224), then calls estimateFare() (line 228). The moment dropoffAddress is set, canRequestRide becomes true, and the fare section renders.
  implication: The View renders the fare section with DEFAULT values immediately, before the API call even starts.

- timestamp: 2026-03-04
  checked: RideBottomSheet fare section visibility (RideRequestView.swift line 401)
  found: `if viewModel.canRequestRide` gates the fare display. canRequestRide = true as soon as both addresses are set. No check for isLoading or "fare estimate received".
  implication: The fare section shows default/stale values the instant both addresses are set, regardless of whether the API has responded.

- timestamp: 2026-03-04
  checked: Loading overlay behavior (RideRequestView.swift lines 51-58)
  found: Overlay uses Color.black.opacity(0.3) — SEMI-TRANSPARENT. Text says "Requesting ride..." (misleading for fare estimate). Default values are visible THROUGH the overlay.
  implication: Even during loading, the user can see the wrong fare values through the translucent overlay.

- timestamp: 2026-03-04
  checked: Second-request behavior (no reset of @Published values before new estimate)
  found: estimateFare() does NOT reset baseFare/distanceFee/timeFee before making the API call. On second invocation, previous values persist.
  implication: Second tap shows PREVIOUS API response values (correct) while new API call is in flight, so no visible "wrong price" flash.

- timestamp: 2026-03-04
  checked: Backend response vs iOS fare recalculation (pricing_config.py vs RideRequestViewModel.swift)
  found: SIGNIFICANT MISMATCH in fare calculation:
    (a) Backend applies time_adjustment (peak/off-peak: -5% to +20%) — iOS ignores this entirely
    (b) Backend applies long_distance_discount (5-15% off for 10+ mile trips) — iOS ignores this
    (c) Backend MINIMUM_FARE = $8.00 (pricing_config.py:21) vs iOS minimumFare = $5.00 (AppConfig.swift:268)
    (d) Backend subtotal includes adjustments, iOS recalculates from raw breakdown without adjustments
  implication: Even after API response, the iOS-displayed fare differs from backend's total. The "wrong price" may also include this persistent calculation mismatch.

- timestamp: 2026-03-04
  checked: Backend endpoint auth requirement (main_new.py:319, bid_routes.py:2146)
  found: /api/rides/estimate requires require_any_auth (Depends). NOT in global allowlist. If auth fails, iOS gets 401 JSON which fails to decode as RideFareEstimateResponse, triggering estimateFareLocally() fallback.
  implication: If token is somehow missing, local fallback uses different pricing (even more divergent from backend).

- timestamp: 2026-03-04
  checked: P2PAPIService.estimateRideFare response handling (line 5159-5183)
  found: No HTTP status code check. If backend returns 401/422/500, data is non-nil but decoding RideFareEstimateResponse fails, triggering fallback to estimateFareLocally().
  implication: Any non-200 response silently falls back to local calculation with different pricing constants.

- timestamp: 2026-03-04
  checked: bid_routes.py surge multiplier application (lines 2186-2192)
  found: Backend applies combined_multiplier to subtotal/total but NOT to breakdown components (base_fare, distance_cost, time_cost). Then sends surge_multiplier in response.
  implication: iOS correctly applies surge to raw breakdown values. The surge handling is architecturally sound.

## Resolution

root_cause: THREE interacting issues cause the "wrong fare + flash" behavior:

**ROOT CAUSE 1 (PRIMARY — causes the flash): Race condition between state update and API response**
File: `apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift:216-229`
When `setDropoffLocation()` is called, it sets `dropoffAddress` (making `canRequestRide = true`) BEFORE the fare estimate API call returns. The View immediately renders the fare section with DEFAULT values ($6.00 = min $5.00 + $1.00 fee) because `@Published var baseFare = 2.50`, `distanceFee = 0.0`, `timeFee = 0.0`. The API response arrives ~200-500ms later and overwrites these values, causing a visible flash/jump from $6.00 to the real fare.

**ROOT CAUSE 2 (SECONDARY — wrong fare even after API response): Fare recalculation mismatch**
Files: `RideRequestViewModel.swift:139-142` vs `pricing_config.py:127-138`
The iOS ViewModel recalculates fare from raw breakdown components (`baseFare + distanceFee + timeFee`) but ignores:
  - `time_adjustment` (peak/off-peak: -5% to +20% multiplier, applied by backend in pricing_config.py:131)
  - `long_distance_discount` (5-15% off for 10+ mile trips, applied by backend in pricing_config.py:134)
  - Different minimum fare: iOS uses $5.00 (AppConfig.swift:268), backend uses $8.00 (pricing_config.py:21)
This means even AFTER the API response populates the breakdown values, the iOS-computed total differs from the backend's `estimate.total`.

**ROOT CAUSE 3 (VISUAL — user sees wrong values during loading): Semi-transparent loading overlay**
File: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift:51-58`
The loading overlay uses `Color.black.opacity(0.3)` which is semi-transparent. The fare values underneath are visible through the overlay while the API call is in flight, making the default values clearly readable.

**Why second tap shows correct price:**
On second invocation, `estimateFare()` does NOT reset the @Published properties (RideRequestViewModel.swift:234-290). The previous API response values persist, so the fare section renders with the PREVIOUS correct values while the new API call is in flight.

fix: (investigation only — no changes made)
verification: (investigation only)
files_changed: []
