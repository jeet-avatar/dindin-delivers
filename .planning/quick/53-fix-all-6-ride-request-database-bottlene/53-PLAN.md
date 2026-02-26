---
phase: quick-53
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/bid_routes.py
  - apps/web/p2p-platform/backend/order_flow.py
autonomous: true
requirements: [DB-IDX-01, DB-GEO-02, DB-PUSH-03, DB-COMMIT-04, DB-DUP-05, DB-N1-06]
must_haves:
  truths:
    - "ride_requests.status, ride_requests.matched_driver_id, ride_bids.status, and drivers.is_online have database indexes"
    - "Driver push notifications are only sent to drivers within 25km of pickup location"
    - "Push notifications are sent concurrently via asyncio.gather, not in a serial for-loop"
    - "Ride creation and bid submission each use a single db.commit() instead of two"
    - "respond_to_bid queries ride_request only once, not twice"
    - "get_available_ride_requests uses a single batch query for bid-existence instead of N+1"
  artifacts:
    - path: "apps/web/p2p-platform/backend/models.py"
      provides: "Database indexes on hot-path columns"
      contains: "index=True"
    - path: "apps/web/p2p-platform/backend/bid_routes.py"
      provides: "Optimized ride request and bidding queries"
  key_links:
    - from: "models.py:RideRequest.status"
      to: "bid_routes.py status filter queries"
      via: "index=True on column definition"
      pattern: "status.*index.*True"
    - from: "bid_routes.py driver notification"
      to: "calculate_distance_km"
      via: "bounding box pre-filter + haversine post-filter"
      pattern: "current_latitude\\.between"
---

<objective>
Fix all 6 ride request database bottlenecks identified in the RIDE_DB_FLOW_REPORT.md investigation.

Purpose: Eliminate full table scans, N+1 queries, double commits, and synchronous push notification blocking that degrade ride request performance under load. A single ride with 20 bidders currently generates ~286 queries and ~43 commits -- these fixes reduce that significantly.

Output: Optimized models.py (with indexes) and bid_routes.py (with geo-filtering, async push, flush-then-commit, deduped queries, batch bid checks).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/52-investigate-ride-request-database-flow-w/RIDE_DB_FLOW_REPORT.md
@apps/web/p2p-platform/backend/bid_routes.py
@apps/web/p2p-platform/backend/models.py
@apps/web/p2p-platform/backend/order_flow.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing database indexes to models.py (Fix 1)</name>
  <files>apps/web/p2p-platform/backend/models.py</files>
  <action>
Add `index=True` to the following column definitions in models.py. These are hot-path columns used in WHERE/filter clauses with no existing index.

**RideRequest model** (class starts at models.py:1281):
- Line 1317: `matched_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)` -- add `index=True`
- Line 1321: `status = Column(SQLEnum(RideRequestStatus), default=RideRequestStatus.OPEN)` -- add `index=True`

**RideBid model** (class starts at models.py:1368):
- Line 1401: `status = Column(SQLEnum(BidStatus), default=BidStatus.PENDING)` -- add `index=True`

**Driver model** (class starts at models.py:712):
- Line 760: `is_online = Column(Boolean, default=False)` -- add `index=True`

NOTE: Do NOT add composite indexes via __table_args__ at this time. The simple column-level indexes cover the most critical full-table-scan cases. Composite indexes (customer_id+status, ride_request_id+driver_id+status) can be added later via Alembic migration if needed. The existing individual indexes on ride_bids.ride_request_id and ride_bids.driver_id already provide good coverage for the composite query patterns.

Do NOT change any model logic, relationships, or defaults. Only add `index=True` to the 4 specified columns.
  </action>
  <verify>
Run: `grep -n "index=True" apps/web/p2p-platform/backend/models.py | grep -E "(matched_driver_id|RideRequestStatus|BidStatus|is_online)"`
Expected: 4 lines, each showing `index=True` on the target columns.

Run: `cd apps/web/p2p-platform/backend && python -c "from models import RideRequest, RideBid, Driver; print('Models import OK')"`
Expected: "Models import OK" (no import errors)
  </verify>
  <done>
4 missing indexes added: ride_requests.status, ride_requests.matched_driver_id, ride_bids.status, drivers.is_online. All model imports succeed without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Geo-filter driver notifications + batch async push + double-commit fix (Fixes 2, 3, 4)</name>
  <files>apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
Three changes in bid_routes.py, all in ride creation and bid submission flows:

**Fix 2 -- Geolocation bounding-box filter (lines 389-392):**

Replace the full-table driver scan at bid_routes.py:389-392 with a bounding-box pre-filter + haversine post-filter. The ride request's `pickup_latitude` and `pickup_longitude` are available from the `data` Pydantic input (used at line 349-350).

Replace:
```python
online_drivers = db.query(Driver).filter(
    Driver.is_online == True,
    Driver.fcm_token.isnot(None)
).all()
```

With:
```python
NOTIFY_RADIUS_KM = 25  # ~15 miles + buffer
pickup_lat = data.pickup_latitude
pickup_lon = data.pickup_longitude
lat_delta = NOTIFY_RADIUS_KM / 111.0
lon_delta = NOTIFY_RADIUS_KM / (111.0 * max(math.cos(math.radians(pickup_lat)), 0.01))

online_drivers = db.query(Driver).filter(
    Driver.is_online == True,
    Driver.fcm_token.isnot(None),
    Driver.current_latitude.isnot(None),
    Driver.current_longitude.isnot(None),
    Driver.current_latitude.between(pickup_lat - lat_delta, pickup_lat + lat_delta),
    Driver.current_longitude.between(pickup_lon - lon_delta, pickup_lon + lon_delta)
).all()

# Haversine post-filter for precision (bounding box is a rough rectangle)
online_drivers = [
    d for d in online_drivers
    if calculate_distance_km(pickup_lat, pickup_lon, d.current_latitude, d.current_longitude) <= NOTIFY_RADIUS_KM
]
```

Use `max(..., 0.01)` to guard against division-by-zero at the poles (cos(90) = 0).

Also update the `drivers_notified` count on the ride_request object after sending, if it exists. The field is at models.py:1331. Add after the notification loop:
```python
ride_request.drivers_notified = len(online_drivers)
```

**Fix 3 -- Batch push notifications with asyncio.gather (lines 394-412):**

Replace the synchronous for-loop with an async fire-and-forget task using asyncio.gather. Since `send_push_notification` (from order_flow.py:159) is synchronous (uses `requests.post`), wrap it with `asyncio.to_thread` for true concurrency.

Replace the entire `for driver in online_drivers:` loop (lines 394-412) with:
```python
import asyncio

async def _send_push_batch(drivers_to_notify, ride_req, dist_miles, price):
    """Send push notifications concurrently to nearby drivers."""
    async def _send_one(drv):
        try:
            await asyncio.to_thread(
                send_push_notification,
                user_type="driver",
                user_id=drv.id,
                title="New Ride Request!",
                body=f"Pickup: {ride_req.pickup_address[:50]} — ~{dist_miles} mi, est. ${price:.0f}",
                data={
                    "type": "new_ride_request",
                    "ride_request_id": str(ride_req.id),
                    "request_id": ride_req.request_id,
                    "pickup_address": ride_req.pickup_address,
                    "dropoff_address": ride_req.dropoff_address,
                    "fare_estimate": str(round(price, 2))
                },
                db=None  # Don't pass db across threads -- let fallback create its own session
            )
            return True
        except Exception as err:
            logger.warning(f"Failed to push to driver {drv.id}: {err}")
            return False

    results = await asyncio.gather(*[_send_one(d) for d in drivers_to_notify], return_exceptions=True)
    sent = sum(1 for r in results if r is True)
    logger.info(f"Push sent to {sent}/{len(drivers_to_notify)} nearby drivers for ride {ride_req.request_id}")
```

Then in the ride creation function, replace the for-loop with:
```python
asyncio.create_task(_send_push_batch(online_drivers, ride_request, distance_miles, suggested_price))
```

IMPORTANT: Pass `db=None` to `send_push_notification` when called from threads. The `order_flow.py:201-203` fallback path creates its own `SessionLocal()` when `db is None`, which is thread-safe. Passing the request-scoped db session across threads would cause SQLAlchemy concurrency errors.

Define the `_send_push_batch` helper function INSIDE the module scope (not nested inside the endpoint), somewhere after the imports (e.g., around line 145, after the utility functions). This keeps it accessible and testable.

**Fix 4 -- Eliminate double-commit (lines 369+374 and 1209+1214):**

In ride creation (around lines 368-374), replace:
```python
db.add(ride_request)
db.commit()
db.refresh(ride_request)

ride_request.request_id = generate_clean_request_id(ride_request.id)
db.commit()
```

With:
```python
db.add(ride_request)
db.flush()  # Gets auto-incremented id without committing
ride_request.request_id = generate_clean_request_id(ride_request.id)
db.commit()
db.refresh(ride_request)
```

In bid submission (around lines 1203-1214), replace:
```python
db.add(bid)

if ride_request.status == RideRequestStatus.OPEN:
    ride_request.status = RideRequestStatus.BIDDING

db.commit()
db.refresh(bid)

bid.bid_id = generate_clean_bid_id(bid.id)
db.commit()
```

With:
```python
db.add(bid)

if ride_request.status == RideRequestStatus.OPEN:
    ride_request.status = RideRequestStatus.BIDDING

db.flush()  # Gets auto-incremented id without committing
bid.bid_id = generate_clean_bid_id(bid.id)
db.commit()
db.refresh(bid)
```

This collapses 2 commits into 1 by using `db.flush()` to get the auto-incremented ID, then setting the human-readable ID before the single `db.commit()`.
  </action>
  <verify>
Run: `grep -n "db.flush()" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 2 matches (ride creation and bid submission), confirming double-commit eliminated.

Run: `grep -n "NOTIFY_RADIUS_KM" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 1+ matches confirming geo-filter added.

Run: `grep -n "asyncio.gather" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 1 match in the _send_push_batch helper.

Run: `grep -n "_send_push_batch" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 2+ matches (definition + call site).

Run: `cd apps/web/p2p-platform/backend && python -c "from bid_routes import router; print('bid_routes import OK')"`
Expected: "bid_routes import OK" (no import errors).
  </verify>
  <done>
Three optimizations applied: (1) Driver notifications geo-filtered to 25km bounding box with haversine post-filter, (2) Push notifications sent concurrently via asyncio.gather with asyncio.to_thread wrapping the sync function, (3) Double-commit eliminated in both ride creation and bid submission using db.flush() pattern.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix duplicate query + N+1 batch bid check + run tests (Fixes 5, 6)</name>
  <files>apps/web/p2p-platform/backend/bid_routes.py</files>
  <action>
Two query-reduction fixes in bid_routes.py, plus full test suite run:

**Fix 5 -- Remove duplicate ride_request query in respond_to_bid (lines 562, 569):**

In `respond_to_bid` (starts at line 552), the ride_request is queried TWICE identically:
- Line 562: `ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()` (for auth check)
- Line 569: `ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()` (for business logic)

DELETE line 569 entirely. The `ride_request` variable from line 562 is already populated and is the same query. The auth check at line 563 does NOT raise if ride_request exists and customer matches, so flow continues with the valid object. Also move the "not found" check. Current code does auth check at 563 before the second query at 569 checks for existence. Restructure to:

```python
ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
if not ride_request:
    raise HTTPException(status_code=404, detail="Ride request not found")
if customer.id != ride_request.customer_id:
    raise HTTPException(status_code=403, detail="Only the ride's customer can respond to bids")
```

This replaces lines 562-571, combining the auth check and existence check using the single query result.

**Fix 6 -- Batch bid-existence check in get_available_ride_requests (lines 1019-1028):**

In `get_available_ride_requests` (starts at line 976), the inner loop at lines 1019-1028 runs one `existing_bid` query per open ride request (N+1 pattern). Replace with a single batch query before the loop.

Before the `for request in open_requests:` loop (line 1008), add:
```python
# Batch check: which of these rides does the driver already have an active bid on?
request_ids = [r.id for r in open_requests]
driver_existing_bids = {}
if driver_id is not None and request_ids:
    existing_bids = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id.in_(request_ids),
            RideBid.driver_id == driver_id,
            RideBid.status.in_([BidStatus.PENDING, BidStatus.COUNTERED])
        )
    ).all()
    for eb in existing_bids:
        driver_existing_bids[eb.ride_request_id] = eb
```

Then inside the loop, replace lines 1019-1028:
```python
# Old N+1 code:
existing_bid = None
if driver_id is not None:
    existing_bid = db.query(RideBid).filter(
        and_(
            RideBid.ride_request_id == request.id,
            RideBid.driver_id == driver_id,
            RideBid.status.in_([BidStatus.PENDING, BidStatus.COUNTERED])
        )
    ).first()
```

With:
```python
existing_bid = driver_existing_bids.get(request.id)
```

The rest of the loop (lines 1030-1036) stays the same since it already reads `existing_bid` and `existing_bid is not None`.

**Test suite run:**

After all changes, run the full backend test suite to confirm no regressions:
```bash
cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -50
```

If any tests fail, investigate and fix. The changes are purely performance optimizations -- no API contract changes, no response format changes, no new endpoints. All existing behavior should be preserved.
  </action>
  <verify>
Run: `grep -c "db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id)" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 1 (not 2), confirming duplicate removed from respond_to_bid.

Run: `grep -n "driver_existing_bids" apps/web/p2p-platform/backend/bid_routes.py`
Expected: 3+ matches (initialization, batch query population, .get() usage in loop).

Run: `cd apps/web/p2p-platform/backend && python -m pytest tests/ -v --tb=short`
Expected: All tests pass, 0 failures.
  </verify>
  <done>
Duplicate ride_request query removed from respond_to_bid (1 query instead of 2). N+1 bid-existence check in get_available_ride_requests replaced with single batch IN query (1 query instead of N). All backend tests pass with zero regressions.
  </done>
</task>

</tasks>

<verification>
1. All 4 index additions confirmed in models.py
2. Geo-filter present in driver notification query (bounding box + haversine)
3. Push notifications use asyncio.gather (not serial for-loop)
4. db.flush() used in both ride creation and bid submission (single commit each)
5. respond_to_bid has exactly 1 ride_request query (not 2)
6. get_available_ride_requests uses batch bid-existence check (not N+1)
7. Full test suite passes with zero regressions
8. All model and route imports succeed without errors
</verification>

<success_criteria>
- 6 database bottlenecks from RIDE_DB_FLOW_REPORT.md are fixed
- Backend test suite passes (zero regressions)
- No API contract changes (same request/response formats)
- Estimated query reduction per ride lifecycle: ~286 down to ~80-100 queries
</success_criteria>

<output>
After completion, create `.planning/quick/53-fix-all-6-ride-request-database-bottlene/53-SUMMARY.md`
</output>
