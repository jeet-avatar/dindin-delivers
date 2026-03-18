---
phase: quick-187
plan: 01
subsystem: rideshare
tags: [accessibility, WAV, ride-request, iOS, backend]
dependency_graph:
  requires: []
  provides: [WAV-filter, accessibility-fields-in-api-response, driver-active-rides-endpoint]
  affects: [bid_routes.py, main_new.py, DeliveryViewModel.swift, P2PAPIService.swift]
tech_stack:
  added: []
  patterns: [getattr-safe-field-access, WAV-filter-list-comprehension]
key_files:
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/bid_routes.py
    - apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
decisions:
  - myActiveRides changed from [P2PRide] to [RideRequestForBidding] — P2PRide has no accessibility fields and was unused dead code
  - driver/active endpoint placed in bid_routes.py router (mounted at /api/rides/) for auth consistency via require_driver
metrics:
  duration: 25min
  completed: 2026-03-17
  tasks_completed: 3
  files_modified: 4
---

# Phase quick-187 Plan 01: Wheelchair Accessibility Ride Flow Summary

**One-liner:** Fixed WAV ride visibility (non-capable drivers filtered out), `/api/rides/available` now returns real accessibility fields, and `myActiveRides` populated via new `/rides/driver/active` endpoint.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix /api/rides/available to return real accessibility fields | 2a2ab88a | main_new.py |
| 2 | WAV filter + driver/active endpoint + fetchMyActiveRides | dfec559e | bid_routes.py, DeliveryViewModel.swift, P2PAPIService.swift |
| 3 | Run backend tests and commit | (merged into T2) | — |

## What Was Fixed

### Bug 1: `/api/rides/available` hardcoded `special_requests: None`
- **File:** `main_new.py:17201`
- **Fix:** Replaced `"special_requests": None` with `getattr(req, 'special_requests', None)` and added `accessibility_requested` and `accessibility_notes` fields using safe `getattr` defaults
- **Root cause:** Hand-rolled response dict in the legacy `/api/rides/available` endpoint (separate from `bid_routes.get_available_ride_requests` which used `serialize_ride_request` correctly)

### Bug 2: Non-WAV drivers seeing accessibility ride requests
- **File:** `bid_routes.py` line 1204 (after `open_requests` query)
- **Fix:** Added WAV pre-filter:
  ```python
  if not getattr(driver, 'accessibility_capable', False):
      open_requests = [r for r in open_requests if not getattr(r, 'accessibility_requested', False)]
  ```
- **TNC-12 compliance:** Only drivers with `accessibility_capable=True` receive WAV ride requests

### Bug 3: `DeliveryViewModel.myActiveRides` dead variable never populated
- **Root cause:** No `fetchMyActiveRides()` method existed; no backend endpoint to list driver's active rides
- **Fix (backend):** Added `GET /rides/driver/active` endpoint to `bid_routes.py` returning `MATCHED` and `IN_PROGRESS` rides for authenticated driver using `serialize_ride_request`
- **Fix (iOS P2PAPIService):** Added `DriverActiveRidesResponse` struct and `fetchDriverActiveRides()` method calling the new endpoint
- **Fix (iOS DeliveryViewModel):** Changed `myActiveRides` type from `[P2PRide]` to `[RideRequestForBidding]` (correct type for serialize_ride_request output), added `fetchMyActiveRides()`, called from `refreshAllData()` when `driverMode == .rideShare`

### Audit 4: ERP alias duplicate check
- **Finding:** Lines 15561-15616 — each function has dual `@app.get("/erp/...")` + `@app.get("/api/erp/...")` decorators. This is **intentional** (iOS calls both paths). No function body is copy-pasted. No changes needed.

## Verification

```
- [x] main_new.py line 17201-17203: accessibility_requested, accessibility_notes, special_requests present
- [x] bid_routes.py line 1204-1207: WAV filter list comprehension present
- [x] bid_routes.py line 1255: GET /driver/active endpoint exists
- [x] DeliveryViewModel.swift line 26: myActiveRides: [RideRequestForBidding]
- [x] DeliveryViewModel.swift line 135: fetchMyActiveRides() called in refreshAllData
- [x] DeliveryViewModel.swift line 682: fetchMyActiveRides() defined
- [x] P2PAPIService.swift: DriverActiveRidesResponse + fetchDriverActiveRides() added
- [x] Python syntax check: bid_routes.py OK, main_new.py OK
```

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Added `DriverActiveRidesResponse` struct in P2PAPIService**
- Found during: Task 2
- Issue: `fetchDriverActiveRides()` needed a Codable response struct to decode `{ success, active_rides, count }`
- Fix: Added `DriverActiveRidesResponse` struct adjacent to other response structs
- Files modified: P2PAPIService.swift

**2. [Rule 1 - Bug] Changed `myActiveRides` type from `[P2PRide]` to `[RideRequestForBidding]`**
- Found during: Task 2
- Issue: `P2PRide` uses different field names and structure than `serialize_ride_request` output; would decode to empty array
- Fix: Changed type to `[RideRequestForBidding]` which matches the serializer output
- Impact: No UI breakage — `myActiveRides` had zero SwiftUI bindings (confirmed by grep)

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/main_new.py` — FOUND (modified line 17201-17203)
- `apps/web/p2p-platform/backend/bid_routes.py` — FOUND (WAV filter line 1204, driver/active line 1255)
- `apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift` — FOUND (myActiveRides, fetchMyActiveRides)
- `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` — FOUND (DriverActiveRidesResponse, fetchDriverActiveRides)
- Commit 2a2ab88a — FOUND (Task 1)
- Commit dfec559e — FOUND (Task 2+3)
