---
phase: quick-187
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/bid_routes.py
autonomous: true
requirements: [QT-187]
must_haves:
  truths:
    - "Accessibility rides show correct accessibility_requested=true and special_requests to drivers"
    - "WAV rides are only visible to drivers with accessibility_capable=True"
    - "DeliveryViewModel.myActiveRides dead variable is documented (rideshare UI uses RideBiddingViewModel.activeRides)"
    - "/api/rides/available response includes accessibility_requested and special_requests fields"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Fixed get_available_ride_requests at line 17175 — real fields instead of None"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "WAV filter in get_available_ride_requests — accessibility rides only to capable drivers"
  key_links:
    - from: "bid_routes.py get_available_ride_requests"
      to: "Driver.accessibility_capable"
      via: "filter WAV requests for non-capable drivers"
      pattern: "accessibility_requested.*accessibility_capable"
---

<objective>
Fix 4 wheelchair/accessibility ride flow bugs:

1. `main_new.py:17201` — `/api/rides/available` hardcodes `special_requests: None` and omits `accessibility_requested` / `accessibility_notes` entirely.
2. `bid_routes.py` `get_available_ride_requests` — no WAV filter, non-WAV-capable drivers see accessibility rides.
3. `DeliveryViewModel.myActiveRides` — declared but never populated; no `fetchMyActiveRides()` exists. However, the active rideshare UI (`RideshareDashboardView`) uses `RideBiddingViewModel.activeRides` (populated from bids with `status="accepted"` in `fetchMyBids()`). `DeliveryViewModel.myActiveRides` is a dead @Published variable — the live rideshare flow is not actually broken. Fix: add `fetchMyActiveRides()` to populate it for completeness, or document it as unused dead code and remove.
4. Audit ERP alias section for duplicate ride endpoints (lines 15561-15616 are correct — each has dual `/erp/` and `/api/erp/` decorators, which is intentional, not duplication).

Purpose: Accessibility riders need assurance only WAV-capable drivers receive their requests. Backend was silently stripping `accessibility_requested` and `special_requests` from the `/api/rides/available` response.

Output: Fixed backend (both endpoints), WAV filter active, myActiveRides populated.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/187-fix-wheelchair-accessibility-ride-flow-e/187-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix /api/rides/available to return real accessibility fields</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
At `main_new.py:17175` (inside the `get_available_ride_requests` function's response dict inside the `for req in requests:` loop), replace the two hardcoded-None fields and add the missing accessibility fields:

Current (lines ~17201-17202):
```python
"special_requests": None,
```

Replace with (using getattr for safety, same pattern as bid_routes.py:352-354):
```python
"special_requests": getattr(req, 'special_requests', None),
"accessibility_requested": getattr(req, 'accessibility_requested', False),
"accessibility_notes": getattr(req, 'accessibility_notes', None),
```

Also note: The ERP alias at line 15561 (`/erp/rides/available`) already delegates to `bid_routes.get_available_ride_requests` which uses `serialize_ride_request` — those fields are already correct. This fix only targets the `/api/rides/available` endpoint at line 17115 which has its own hand-rolled response dict.

Verify the column exists: `grep -n "accessibility_requested" apps/web/p2p-platform/backend/models.py` — expected at `models.py:1365`.

ALSO: Audit the ERP alias section (lines 15561-15616) for true duplicates. The dual `@app.get("/erp/...")` + `@app.get("/api/erp/...")` decorators on each function are INTENTIONAL (iOS calls both paths). No removal needed — just confirm no function body is copy-pasted verbatim as a separate endpoint.
  </action>
  <verify>
```bash
grep -n "accessibility_requested\|accessibility_notes\|special_requests" apps/web/p2p-platform/backend/main_new.py | grep -A2 -B2 "17[12][0-9][0-9]"
```
Expected: all three fields appear in the response dict around line 17200.
  </verify>
  <done>
`/api/rides/available` response dict includes `accessibility_requested`, `accessibility_notes`, and the real `special_requests` value from the model instead of None.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add WAV filter in bid_routes get_available_ride_requests</name>
  <files>apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
In `bid_routes.py` `get_available_ride_requests` (line 1167), after the `open_requests` query (after line 1202) and before the `for request in open_requests:` loop (line 1219), add a WAV pre-filter:

```python
# WAV filter: if driver is not accessibility_capable, exclude accessibility_requested rides
# (TNC-12 compliance: only WAV-capable drivers see WAV ride requests)
if not getattr(driver, 'accessibility_capable', False):
    open_requests = [r for r in open_requests if not getattr(r, 'accessibility_requested', False)]
```

This uses `driver` (already the authenticated `Driver` ORM object from `Depends(require_driver)` at line 1173). The `accessibility_capable` column exists at `models.py:829`.

ALSO fix `DeliveryViewModel.myActiveRides`: this @Published var is declared at `DeliveryViewModel.swift:24` but `DeliveryViewModel` is not used by the rideshare UI (which uses `RideBiddingViewModel`). Add a `fetchMyActiveRides()` stub that reads matched rides from the backend. Use `GET /erp/rides/{ride_id}/track` pattern — but for listing the driver's MATCHED/IN_PROGRESS rides, query `GET /api/rides/request?driver_id=X&status=matched,in_progress`.

Wait — first verify this endpoint exists:
```bash
grep -n "rides/request.*driver_id\|driver.*rides.*request" apps/web/p2p-platform/backend/main_new.py | head -20
grep -n "rides/request.*driver_id\|driver.*rides.*request" apps/web/p2p-platform/backend/bid_routes.py | head -20
```

If no list-by-driver endpoint exists, add a simple one to `bid_routes.py`:

```python
@router.get("/driver/active")
async def get_driver_active_rides(
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db)
):
    """Get MATCHED and IN_PROGRESS rides for the authenticated driver."""
    active_statuses = [RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS]
    rides = db.query(RideRequest).filter(
        RideRequest.matched_driver_id == driver.id,
        RideRequest.status.in_(active_statuses)
    ).order_by(RideRequest.matched_at.desc()).limit(10).all()
    return {
        "success": True,
        "active_rides": [serialize_ride_request(r) for r in rides],
        "count": len(rides)
    }
```

Then in `DeliveryViewModel.swift`, add `fetchMyActiveRides()` calling `GET /api/rides/driver/active` and populating `self.myActiveRides`. Call it from `refreshAllData()` when `driverMode == .rideShare`.

The endpoint path must be added to the auth allowlist check — verify it requires driver auth via `require_driver` Depends (it does, so no allowlist entry needed).
  </action>
  <verify>
```bash
# WAV filter in bid_routes
grep -n "accessibility_capable\|accessibility_requested" apps/web/p2p-platform/backend/bid_routes.py

# New driver/active endpoint (if added)
grep -n "driver/active\|driver.*active.*rides" apps/web/p2p-platform/backend/bid_routes.py

# Swift: fetchMyActiveRides added
grep -n "fetchMyActiveRides\|myActiveRides" apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
```
  </verify>
  <done>
- WAV filter: non-WAV-capable drivers receive 0 accessibility_requested rides from `bid_routes.get_available_ride_requests`.
- `DeliveryViewModel.fetchMyActiveRides()` exists and is called from `refreshAllData()` when in rideShare mode.
- `myActiveRides` is populated with MATCHED/IN_PROGRESS rides for the driver.
  </done>
</task>

<task type="auto">
  <name>Task 3: Run backend tests and commit</name>
  <files></files>
  <action>
Run the rideshare-related backend tests to confirm no regressions:

```bash
cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
source venv/bin/activate
pytest tests/ -k "rideshare or ride or accessibility or bid" -v --tb=short 2>&1 | tail -40
```

If failures exist, fix them before committing. Then commit:

```bash
cd /Users/jeet/doordash-p2p
git add apps/web/p2p-platform/backend/main_new.py \
        apps/web/p2p-platform/backend/bid_routes.py \
        apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift \
        apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
git commit -m "fix(quick-187): wheelchair/accessibility ride flow — real fields, WAV filter, fetchMyActiveRides"
```
  </action>
  <verify>
```bash
git log --oneline -3
grep -n "accessibility_requested" apps/web/p2p-platform/backend/main_new.py | grep "1720[0-9]"
grep -n "accessibility_capable" apps/web/p2p-platform/backend/bid_routes.py
grep -n "fetchMyActiveRides" apps/ios/delivery/eatffairdelivery/ViewModels/DeliveryViewModel.swift
```
  </verify>
  <done>
All rideshare/accessibility tests pass. Commit exists. Three grep proofs confirm all fixes are in place.
  </done>
</task>

</tasks>

<verification>
- `main_new.py` `/api/rides/available` returns `accessibility_requested`, `accessibility_notes`, `special_requests` from real model fields
- `bid_routes.py` WAV filter: non-capable drivers cannot see WAV rides
- `DeliveryViewModel.fetchMyActiveRides()` exists and populates `myActiveRides`
- No ERP alias duplicates (dual decorators are intentional, not duplication)
- Backend tests pass with no regressions
</verification>

<success_criteria>
A driver without `accessibility_capable=True` calling `GET /api/rides/available` or the ERP alias receives zero WAV rides. A driver with `accessibility_capable=True` receives WAV rides with `accessibility_requested=true` and real `special_requests` text. iOS Driver app `myActiveRides` is populated after accepting a ride.
</success_criteria>

<output>
After completion, create `.planning/quick/187-fix-wheelchair-accessibility-ride-flow-e/187-SUMMARY.md`
</output>
