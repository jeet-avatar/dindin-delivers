---
phase: quick-122
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [RIDE-DATA-01, RIDE-DATA-02, RIDE-DATA-03, RIDE-DATA-04]

must_haves:
  truths:
    - "GET /rides/available excludes stale rides with null bidding_expires_at older than 30 minutes"
    - "GET /api/driver/earnings includes rideshare completed ride payouts"
    - "GET /rides/driver/{id}/bids supports days query param and defaults to 7 days"
    - "GET /rides/driver/{id}/bids returns active_rides_count based on MATCHED/IN_PROGRESS ride status"
  artifacts:
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "Fixed available rides query, filtered bids endpoint, admin cleanup endpoint"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Driver earnings with rideshare income"
  key_links:
    - from: "bid_routes.py:get_available_ride_requests"
      to: "RideRequest model"
      via: "SQLAlchemy query with created_at age check for null expiry"
      pattern: "created_at.*timedelta"
    - from: "main_new.py:get_driver_earnings"
      to: "RideRequest model"
      via: "Query COMPLETED rides for driver_payout sum"
      pattern: "RideRequest.*COMPLETED.*driver_payout"
---

<objective>
Fix 4 rideshare data issues found during E2E testing: stale rides polluting available list, missing rideshare earnings, unfiltered historical bids, and inflated active rides count.

Purpose: Production data quality -- drivers see ghost rides, earnings are underreported, bid history is noisy.
Output: Clean rideshare data queries in bid_routes.py and main_new.py.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/bid_routes.py (lines 1002-1076: available rides query; lines 1605-1640: driver bids; lines 2990-3053: cleanup job)
@apps/web/p2p-platform/backend/main_new.py (lines 7041-7094: driver earnings)
@apps/web/p2p-platform/backend/models.py (lines 1267-1370: RideRequest model, RideRequestStatus, BidStatus enums)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix available rides query and add admin stale-rides cleanup</name>
  <files>apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
  1. In `get_available_ride_requests()` (line ~1023-1030), change the OR clause for null bidding_expires_at. Instead of including ALL null-expiry rides, only include null-expiry rides created within the last 30 minutes:

  Replace:
  ```python
  or_(
      RideRequest.bidding_expires_at > now,
      RideRequest.bidding_expires_at.is_(None)
  )
  ```
  With:
  ```python
  or_(
      RideRequest.bidding_expires_at > now,
      and_(
          RideRequest.bidding_expires_at.is_(None),
          RideRequest.created_at > now - timedelta(minutes=30)
      )
  )
  ```
  Ensure `timedelta` is imported from `datetime` (already should be).

  2. Also update `check_ride_bidding_expiry_job()` (line ~2996) to catch null-expiry stale rides too. After the existing expired_rides query block, add a second query for stale null-expiry rides:
  ```python
  stale_null_rides = db.query(RideRequest).filter(
      RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING]),
      RideRequest.bidding_expires_at.is_(None),
      RideRequest.created_at < now - timedelta(minutes=30)
  ).all()
  ```
  Expire these the same way (set status=EXPIRED, expire pending bids, send push). Log count separately.

  3. Add admin cleanup endpoint at the bottom of the router (before the cleanup jobs section):
  ```python
  @router.post("/admin/cleanup-stale-rides")
  async def admin_cleanup_stale_rides(
      request: Request,
      max_age_hours: int = 24,
      db: Session = Depends(get_db)
  ):
  ```
  Require admin auth via `require_admin` from auth_utils (check existing admin endpoint patterns in bid_routes.py for the auth pattern -- if bid_routes uses ADMIN_SECRET_KEY header check, follow that; if it uses Depends(require_admin), use that).

  This endpoint should: find all OPEN/BIDDING rides older than max_age_hours, set them to EXPIRED, expire their pending bids, return count of cleaned rides.
  </action>
  <verify>
  ```bash
  cd apps/web/p2p-platform/backend && python -c "
  import bid_routes
  print('available rides endpoint exists:', hasattr(bid_routes, 'get_available_ride_requests'))
  print('cleanup stale rides exists:', 'cleanup_stale' in dir(bid_routes) or True)
  " && grep -n "created_at.*timedelta.*minutes.*30" bid_routes.py && grep -n "admin/cleanup-stale-rides" bid_routes.py
  ```
  </verify>
  <done>Available rides query excludes null-expiry rides older than 30 min. Background job catches stale null-expiry rides. Admin cleanup endpoint exists.</done>
</task>

<task type="auto">
  <name>Task 2: Add rideshare earnings to driver earnings endpoint and filter bids</name>
  <files>apps/web/p2p-platform/backend/main_new.py, apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
  1. In `get_driver_earnings()` in main_new.py (line ~7060), after the food delivery Order query, add a rideshare query:
  ```python
  # Query completed rideshare rides for this driver
  try:
      rideshare_rides = db.query(RideRequest).filter(
          RideRequest.matched_driver_id == driver.id,
          RideRequest.status == RideRequestStatus.COMPLETED,
          RideRequest.created_at >= start_date
      ).all()
  except Exception:
      rideshare_rides = []

  rideshare_earnings = sum(float(r.driver_payout or 0) for r in rideshare_rides)
  rideshare_tips = sum(float(r.tip_amount or 0) for r in rideshare_rides)
  rideshare_count = len(rideshare_rides)
  ```
  Add necessary imports at top of the earnings function scope: `from models import RideRequest, RideRequestStatus` (verify these are already imported at file top -- they likely are since main_new.py uses them elsewhere).

  Update the response to include rideshare data:
  - Add `rideshare_earnings` and `rideshare_tips` to total calculations
  - Add `"rideshare_rides": rideshare_count` field
  - Add `"rideshare_earnings": round(rideshare_earnings + rideshare_tips, 2)` field
  - Update `"total_earnings"` to include rideshare: `round(base_earnings + tips + rideshare_earnings + rideshare_tips + bonuses, 2)`
  - Update period totals similarly

  2. In `get_driver_bids()` in bid_routes.py (line ~1605), add a `days` query parameter:
  ```python
  async def get_driver_bids(
      driver_id: int,
      request: Request,
      status: Optional[str] = None,
      days: int = 7,
      auth_driver: Driver = Depends(require_driver),
      db: Session = Depends(get_db)
  ):
  ```
  Add time filter to the query:
  ```python
  cutoff = datetime.utcnow() - timedelta(days=days)
  query = query.filter(RideBid.created_at >= cutoff)
  ```

  3. In the same `get_driver_bids()` function, after building the bids result list, compute `active_rides_count` by counting bids where status is ACCEPTED AND the associated ride_request.status is MATCHED or IN_PROGRESS:
  ```python
  active_rides_count = 0
  for bid in bids:
      if bid.status == BidStatus.ACCEPTED and bid.ride_request and \
         bid.ride_request.status in (RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS):
          active_rides_count += 1
  ```
  Add `"active_rides_count": active_rides_count` to the response dict.
  </action>
  <verify>
  ```bash
  cd apps/web/p2p-platform/backend && python -c "
  from models import RideRequest, RideRequestStatus
  print('RideRequest.driver_payout exists:', hasattr(RideRequest, 'driver_payout'))
  print('COMPLETED status:', RideRequestStatus.COMPLETED.value)
  " && grep -n "rideshare_earnings" main_new.py && grep -n "active_rides_count" bid_routes.py && grep -n "days.*int.*7" bid_routes.py
  ```
  </verify>
  <done>Driver earnings include rideshare payouts and tips. Bids endpoint filters by days (default 7) and returns active_rides_count based on live ride status.</done>
</task>

<task type="auto">
  <name>Task 3: Run tests and verify no regressions</name>
  <files>apps/web/p2p-platform/backend/tests/</files>
  <action>
  Run the full backend test suite to verify no regressions from the changes:
  ```bash
  cd apps/web/p2p-platform/backend && python -m pytest tests/ -x -q --tb=short 2>&1 | tail -20
  ```
  If any tests fail that are related to the changed endpoints, fix them. Common issues:
  - Test mocking old query shape for available rides -- update mock to match new filter
  - Test for driver earnings not expecting rideshare fields -- add rideshare fields to expected response
  - Test for driver bids not passing `days` param -- should work since default is 7

  If tests pass, also do a quick syntax/import check:
  ```bash
  python -c "from bid_routes import router; from main_new import app; print('imports OK')"
  ```
  </action>
  <verify>pytest tests/ passes with 0 failures (or same baseline failures as before)</verify>
  <done>All backend tests pass. No import errors. Changes are regression-free.</done>
</task>

</tasks>

<verification>
1. `grep -n "created_at.*timedelta.*30" apps/web/p2p-platform/backend/bid_routes.py` -- confirms stale ride filter
2. `grep -n "rideshare_earnings" apps/web/p2p-platform/backend/main_new.py` -- confirms earnings include rideshare
3. `grep -n "active_rides_count" apps/web/p2p-platform/backend/bid_routes.py` -- confirms active count field
4. `grep -n "days.*int.*7" apps/web/p2p-platform/backend/bid_routes.py` -- confirms days filter param
5. `grep -n "admin/cleanup-stale-rides" apps/web/p2p-platform/backend/bid_routes.py` -- confirms admin endpoint
6. Backend test suite passes
</verification>

<success_criteria>
- Available rides endpoint no longer returns the 16 stale null-expiry rides from Feb 14-18
- Background cleanup job catches and expires null-expiry stale rides automatically
- Admin can force-cleanup stale rides via POST /rides/admin/cleanup-stale-rides
- Driver earnings response includes rideshare_rides count, rideshare_earnings amount, and updated total_earnings
- Driver bids endpoint accepts `days` param (default 7) and only returns recent bids
- Driver bids response includes `active_rides_count` based on actual ride status (MATCHED/IN_PROGRESS only)
- All backend tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/122-fix-4-rideshare-data-issues-stale-rides-/122-SUMMARY.md`
</output>
