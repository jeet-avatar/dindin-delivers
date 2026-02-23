---
status: resolved
trigger: "Customer app (iOS TestFlight build 1089) shows 'Unable to request ride - please try again' when trying to request a ride. Fails immediately with no loading spinner."
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED - iOS requestRide() was missing Authorization header
test: Added Bearer token, verified build succeeds, verified all other ride methods already have auth
expecting: Ride requests will now authenticate and succeed
next_action: Archive session

## Symptoms

expected: User should be able to request a ride successfully after entering pickup/dropoff locations
actual: Shows "Unable to request ride - please try again" error immediately upon tapping request
errors: "Unable to request ride - please try again" (user-facing error message in the app)
reproduction: Open customer app -> enter ride details -> tap request -> immediate error
started: Discovered on latest TestFlight build 1089 (Feb 23, 2026). Previously worked.

## Eliminated

- hypothesis: Backend endpoint data model mismatch (iOS sends flat fields vs dict)
  evidence: CreateRideRequestInput (bid_routes.py:72) expects flat fields matching iOS payload exactly
  timestamp: 2026-02-22T00:00:30Z

- hypothesis: Wrong endpoint path (iOS calling non-existent route)
  evidence: iOS calls /api/rides/request which maps to bid_routes.py:300 (prefix /api/rides + /request). Endpoint exists.
  timestamp: 2026-02-22T00:00:35Z

## Evidence

- timestamp: 2026-02-22T00:00:10Z
  checked: P2PAPIService.swift:5034-5066 requestRide method
  found: No Authorization header set. Only sets Content-Type. Compare with trackMyRide (line 5110-5112) which sets "Bearer" token.
  implication: Request goes to backend without auth credentials

- timestamp: 2026-02-22T00:00:15Z
  checked: main_new.py:257-374 public path allowlists
  found: /api/rides/request is NOT in _PUBLIC_EXACT_PATHS, _PUBLIC_PREFIXES, or _PUBLIC_PATTERN_PATHS
  implication: Global auth middleware at line 377 requires JWT for this path

- timestamp: 2026-02-22T00:00:20Z
  checked: main_new.py:401-408 auth middleware rejection logic
  found: Returns {"detail":"Authentication required"} with 401 when no Bearer token present
  implication: iOS receives 401 JSON, fails to decode as RideRequestResponse, falls into error handler

- timestamp: 2026-02-22T00:00:25Z
  checked: bid_routes.py:300-301 create_ride_request endpoint
  found: Uses Depends(require_customer) - requires customer JWT even beyond global middleware
  implication: Double-layer auth: middleware + endpoint both require token

- timestamp: 2026-02-22T00:00:30Z
  checked: RideRequestViewModel.swift:375-384 error handling
  found: Error message "Unable to request ride. Please try again." is the else fallback when error doesn't contain "network"/"busy"/"unavailable"
  implication: Matches reported symptom exactly. Auth error message doesn't trigger specific handlers.

- timestamp: 2026-02-22T00:00:35Z
  checked: P2PAPIService.swift - all other ride methods
  found: All 12 other ride-related methods (cancelRide, trackMyRide, fetchBids, acceptBid, rejectBid, counterBid, createPayment, confirmPayment, submitFareOffer, acceptDriverFare, getNegotiationStatus, cancelRideRequest) already set Bearer token. requestRide was the ONLY one missing it.
  implication: Oversight - method was written before auth was added or was missed during auth hardening

- timestamp: 2026-02-22T00:01:30Z
  checked: iOS build after fix
  found: xcodebuild Debug build succeeded with zero errors
  implication: Fix compiles correctly

## Resolution

root_cause: P2PAPIService.swift requestRide() method (line 5039-5041) did NOT include the Authorization Bearer header with the customer's JWT token. The global auth middleware (main_new.py:377) and endpoint-level auth (bid_routes.py:301 Depends(require_customer)) both reject the unauthenticated request with 401 {"detail":"Authentication required"}. The iOS decode of RideRequestResponse fails, falls to error handler which shows generic "Unable to request ride. Please try again." This broke when Phase 02 security auth was deployed (Feb 20, 2026) adding the global middleware.
fix: Added `if let token = customerToken { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }` to the requestRide method at P2PAPIService.swift:5043-5045, matching the pattern used by all 12 other ride methods in the same file.
verification: Build succeeded (xcodebuild Debug eatfaircustomer). All other ride methods confirmed to already have auth headers. Fix is minimal (4 lines) and follows exact established pattern.
files_changed: [apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift]
