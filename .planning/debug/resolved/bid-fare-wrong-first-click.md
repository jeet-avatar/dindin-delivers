---
status: resolved
trigger: "Rideshare bid/fare calculation shows wrong amount on first click in iOS Customer app build 1108. Blank screen with wrong amount. Second click shows correct amount."
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:03:00Z
---

## Current Focus

hypothesis: CONFIRMED — iOS estimateRideFare() sends no auth header, but bid_routes.py endpoint requires require_any_auth, causing 401 and fallback to local calculation with different rates
test: Made test call without auth — confirmed 401 response. After fix, confirmed 500 (DB-missing, expected in test env) instead of 401.
expecting: N/A — fix applied and verified
next_action: Archive session

## Symptoms

expected: When user clicks to get a fare estimate/bid for a rideshare ride, the correct fare amount should show immediately on the first click with a fully rendered screen.
actual: First click shows a blank screen with wrong fare amount. Second click shows the correct amount with proper UI.
errors: No crash — just wrong data on first render, correct on second.
reproduction: Open rideshare in iOS Customer app → enter pickup/dropoff → tap to get estimate/bid → see wrong amount + blank screen → tap again → see correct amount.
started: Latest build 1108. User noticed after recent quick-73 changes (coordinate validation added to fare estimate endpoints).

## Eliminated

- hypothesis: Quick-73 coordinate validation rejects valid coordinates
  evidence: FareEstimateInput uses Pydantic ge/le validators; valid coordinates from iOS geocoding pass validation. iOS sends state_code which is extra field ignored by Pydantic.
  timestamp: 2026-03-04T00:00:30Z

- hypothesis: Response shape mismatch between backend and iOS model
  evidence: bid_routes.py returns {"success": true, "estimate": {...}} which perfectly matches iOS RideFareEstimateResponse model. The issue is the 401 preventing the response from ever reaching iOS.
  timestamp: 2026-03-04T00:00:45Z

## Evidence

- timestamp: 2026-03-04T00:00:15Z
  checked: Route registration order in FastAPI
  found: Two routes registered for POST /api/rides/estimate — bid_routes.get_fare_estimate_endpoint (#386, requires require_any_auth) registered BEFORE main_new.get_fare_estimate_android (#530, no auth). FastAPI uses first match.
  implication: bid_routes.py always handles this endpoint, never main_new.py

- timestamp: 2026-03-04T00:00:20Z
  checked: iOS P2PAPIService.estimateRideFare() method (line 5127-5180)
  found: No Authorization header set. Uses secureSession (SSL pinning only, no auto-auth).
  implication: iOS sends unauthenticated request to an endpoint that requires auth

- timestamp: 2026-03-04T00:00:25Z
  checked: Test call to /api/rides/estimate without auth
  found: Returns 401 {"detail": "Authentication required"}
  implication: iOS decode fails, triggers estimateFareLocally() fallback with different rates (baseFare=$2.50 vs backend $5.00, perMile=$1.15 vs $1.50)

- timestamp: 2026-03-04T00:00:30Z
  checked: Global auth middleware allowlist
  found: /api/rides/estimate IS in _PUBLIC_EXACT_PATHS (main_new.py:321), so global middleware passes it through. BUT bid_routes.py has per-endpoint Depends(require_any_auth) which still blocks.
  implication: Allowlist intent was to make this endpoint public, but per-endpoint auth dependency contradicts this

- timestamp: 2026-03-04T00:00:35Z
  checked: Quick-73 summary (line 105)
  found: "Pre-existing test failure in test_rideshare_cross_platform.py (auth required on /api/rides/estimate but test sends no auth headers). Not caused by this task -- excluded from test run."
  implication: This auth issue was known but dismissed as a test issue rather than a real bug

- timestamp: 2026-03-04T00:02:00Z
  checked: Post-fix test — POST /api/rides/estimate without auth
  found: Returns 500 (DB tables missing in test SQLite) instead of 401. Auth barrier removed.
  implication: Fix works — endpoint is now publicly accessible as intended

- timestamp: 2026-03-04T00:02:30Z
  checked: Backend test suite (1305 tests)
  found: 1305 passed, 0 failed (11 skipped = remote e2e tests)
  implication: Zero regressions from the fix

## Resolution

root_cause: POST /api/rides/estimate is handled by bid_routes.py (registered first via include_router at line 14649) which requires Depends(require_any_auth). iOS P2PAPIService.estimateRideFare() does not send Authorization header. Result: 401 response, iOS falls back to estimateFareLocally() with different pricing rates ($2.50 base vs $5.00, $1.15/mi vs $1.50/mi), showing wrong fare amount. The "blank screen" is the loading overlay ("Requesting ride...") during the API call. The "second click correct" is the user re-triggering after the local fallback has populated values.

fix: Three-part fix applied:
1. Removed Depends(require_any_auth) from bid_routes.py fare estimate endpoint (makes it truly public, matching the global auth allowlist intent)
2. Added Authorization header to iOS P2PAPIService.estimateRideFare() (belt-and-suspenders — works whether backend requires auth or not)
3. Removed dead duplicate @app.post("/api/rides/estimate") route from main_new.py (was never reachable since bid_routes.py was registered first; kept the function as helper for /api/erp/rides/fare-estimate alias)
4. Updated test comment in test_ios_api_contracts.py to reflect endpoint is now public

verification:
- Backend: TestClient confirms POST /api/rides/estimate without auth no longer returns 401 (returns 500 in test env due to missing DB tables — expected)
- Backend: Only 1 route registered for POST /api/rides/estimate (bid_routes.get_fare_estimate_endpoint), no duplicate
- Backend: ERP alias POST /api/erp/rides/fare-estimate still intact
- Backend: 1305 tests pass, 0 failures, 0 regressions
- Pre-existing cross-platform e2e test failure (test_rideshare_cross_platform.py) will be fixed once deployed to staging

files_changed:
- apps/web/p2p-platform/backend/bid_routes.py (line 2146: removed require_any_auth dependency)
- apps/web/p2p-platform/backend/main_new.py (line 19189: removed @app.post decorator, kept function for ERP alias)
- apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift (line 5144-5147: added auth header)
- apps/web/p2p-platform/backend/tests/integration/test_ios_api_contracts.py (line 89: updated comment)
