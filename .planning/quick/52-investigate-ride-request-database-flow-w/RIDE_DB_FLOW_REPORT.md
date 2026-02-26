# Ride Request Database Flow Report

## Executive Summary

A full trace of the ride request lifecycle -- from customer request to driver assignment -- reveals **5 key findings**:

1. **Full table scan on drivers**: The nearby-driver query at `bid_routes.py:389` loads ALL online drivers with FCM tokens (`WHERE is_online = true AND fcm_token IS NOT NULL`). No geolocation filter. No index on `is_online` or `fcm_token`. Every driver on the platform gets notified regardless of distance.
2. **N+1 push notification loop**: The `send_push_notification` function (called per-driver in a synchronous for-loop at `bid_routes.py:394-412`) falls back to a raw SQL query per driver (`SELECT fcm_token FROM drivers WHERE id = :id` at `order_flow.py:210`) when the notification microservice is unavailable, despite the token already being loaded in the ORM object.
3. **Double commit on every write**: Both ride request creation (lines 369+374) and bid submission (lines 1209+1214) use a two-commit pattern -- INSERT then UPDATE the human-readable ID -- doubling transaction overhead.
4. **Missing critical indexes**: `ride_requests.status`, `ride_requests.matched_driver_id`, `drivers.is_online`, and `drivers.fcm_token` have no indexes despite being used in hot-path WHERE/filter clauses. The `(customer_id, status)` composite index on ride_requests is missing.
5. **O(n) bid submission checks**: Each bid submission runs 6+ sequential queries (ride lookup, self-bid check, driver status check, active ride check, active delivery check, existing bid check, expired bid cleanup, bid count) before the INSERT -- totaling ~8 queries per bid.

---

## Flow Diagram

```
Customer App                   Backend (bid_routes.py)                     Database (PostgreSQL)
     |                                  |                                         |
     |--- POST /api/rides/request ----->|                                         |
     |                                  |                                         |
     |                          [1] Concurrent request check                      |
     |                                  |--- SELECT COUNT(*) FROM ride_requests --|
     |                                  |    WHERE customer_id=X AND status       |
     |                                  |    IN ('open','bidding')                |
     |                                  |<-------- count -----------------------|
     |                                  |                                         |
     |                          [2] Demand multiplier                             |
     |                                  |--- SELECT COUNT(*) FROM ride_requests --|
     |                                  |    WHERE status IN ('open','bidding')   |
     |                                  |--- SELECT COUNT(*) FROM drivers --------|
     |                                  |    WHERE is_online = true               |
     |                                  |<-------- counts ----------------------|
     |                                  |                                         |
     |                          [3] INSERT ride_request                           |
     |                                  |--- INSERT INTO ride_requests (...) -----|
     |                                  |--- COMMIT #1 --------------------------|
     |                                  |                                         |
     |                          [4] UPDATE request_id                             |
     |                                  |--- UPDATE ride_requests SET            |
     |                                  |    request_id='RIDE2026000XXX'          |
     |                                  |    WHERE id=XXX                         |
     |                                  |--- COMMIT #2 --------------------------|
     |                                  |                                         |
     |                          [5] WebSocket broadcast (async)                   |
     |                                  |--- broadcast_new_ride_request() ------->|
     |                                  |    (no DB query)                        |
     |                                  |                                         |
     |                          [6] Driver notification loop                      |
     |                                  |--- SELECT * FROM drivers WHERE ---------|
     |                                  |    is_online=true AND fcm_token IS NOT  |
     |                                  |    NULL                                 |
     |                                  |<-------- ALL online drivers ----------|
     |                                  |                                         |
     |                                  | FOR EACH driver:                        |
     |                                  |   send_push_notification()              |
     |                                  |   (may query DB again per driver)       |
     |                                  |                                         |
     |                          [7] Confirmation email (no DB)                    |
     |                                  |                                         |
     |<-- 200 OK (ride_request JSON) ---|                                         |
     |                                  |                                         |
     ================================================================
     |                                  |                                         |
Driver App                              |                                         |
     |--- POST /request/{id}/bid ----->|                                         |
     |                                  |                                         |
     |                          [8] Ride lookup                                   |
     |                                  |--- SELECT * FROM ride_requests ---------|
     |                                  |    WHERE id=X                           |
     |                          [9] Self-bid check (NSA-008)                      |
     |                                  |--- SELECT * FROM customers -------------|
     |                                  |    WHERE id=customer_id                 |
     |                          [10] Driver re-lookup                             |
     |                                  |--- SELECT * FROM drivers WHERE id=X ----|
     |                          [11] Active ride check                            |
     |                                  |--- SELECT * FROM ride_requests ---------|
     |                                  |    WHERE matched_driver_id=X AND        |
     |                                  |    status IN ('matched','in_progress')  |
     |                          [12] Active delivery check                        |
     |                                  |--- SELECT * FROM orders WHERE           |
     |                                  |    driver_id=X AND status IN (...)      |
     |                          [13] Existing bid check                           |
     |                                  |--- SELECT * FROM ride_bids -------------|
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    driver_id=Y AND status='pending'     |
     |                          [14] Expired bid cleanup                          |
     |                                  |--- SELECT * FROM ride_bids -------------|
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    status='pending' AND expires_at<NOW  |
     |                                  |    (may UPDATE + COMMIT if found)       |
     |                          [15] Active bid count                             |
     |                                  |--- SELECT COUNT(*) FROM ride_bids ------|
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    status='pending' AND (expires_at>NOW |
     |                                  |    OR expires_at IS NULL)               |
     |                          [16] INSERT bid                                   |
     |                                  |--- INSERT INTO ride_bids (...) ---------|
     |                                  |--- COMMIT #1 --------------------------|
     |                          [17] UPDATE bid_id                                |
     |                                  |--- UPDATE ride_bids SET bid_id=... -----|
     |                                  |--- COMMIT #2 --------------------------|
     |                          [18] Status -> BIDDING (if first bid)             |
     |                                  |    (part of commit #1 or #2)            |
     |                          [19] Email: query Customer                        |
     |                                  |--- SELECT * FROM customers -------------|
     |                                  |    WHERE id=customer_id                 |
     |                          [20] Count total pending bids                     |
     |                                  |--- SELECT COUNT(*) FROM ride_bids ------|
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    status='pending'                     |
     |                                  |                                         |
     |<-- 200 OK (bid JSON) -----------|                                         |
     |                                  |                                         |
     ================================================================
     |                                  |                                         |
Customer App                            |                                         |
     |--- GET /request/{id}/bids ----->|                                         |
     |                          [21] Ride lookup                                  |
     |                                  |--- SELECT * FROM ride_requests ---------|
     |                          [22] Bids with driver join                        |
     |                                  |--- SELECT ride_bids.*, drivers.* -------|
     |                                  |    FROM ride_bids                       |
     |                                  |    LEFT JOIN drivers ON ...             |
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    status='pending' ORDER BY            |
     |                                  |    proposed_price ASC                   |
     |<-- bids JSON --------------------|                                         |
     |                                  |                                         |
     ================================================================
     |                                  |                                         |
     |--- POST /bid/{id}/respond ----->|  (action=accept)                        |
     |                          [23] Bid lookup                                   |
     |                                  |--- SELECT * FROM ride_bids WHERE id=X --|
     |                          [24] Ride lookup (x2 -- duplicate query)          |
     |                                  |--- SELECT * FROM ride_requests (x2) ----|
     |                          [25] UPDATE bid status -> ACCEPTED                |
     |                          [26] UPDATE ride_request (MATCHED, etc.)          |
     |                          [27] Reject other bids                            |
     |                                  |--- SELECT * FROM ride_bids -------------|
     |                                  |    WHERE ride_request_id=X AND          |
     |                                  |    id != bid_id AND status='pending'    |
     |                                  |    (UPDATE each to REJECTED)            |
     |                          [28] Driver lookup for notification               |
     |                                  |--- SELECT * FROM drivers WHERE id=X ----|
     |                          [29] Insert in-app notification                   |
     |                                  |--- INSERT INTO in_app_notifications ----|
     |                          [30] COMMIT (single transaction)                  |
     |                          [31] Customer lookup for email                    |
     |                                  |--- SELECT * FROM customers WHERE id=X --|
     |                                  |                                         |
     |<-- 200 OK (matched ride JSON) ---|                                         |
```

---

## Step-by-Step SQL Trace

### Stage A: Ride Request Creation (`bid_routes.py:301-447`)

**Query A1 -- Concurrent request check** (`bid_routes.py:314-319`)
```python
# ORM Code:
db.query(RideRequest).filter(
    and_(
        RideRequest.customer_id == customer.id,
        RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING])
    )
).count()
```
```sql
-- Generated SQL:
SELECT COUNT(*) FROM ride_requests
WHERE customer_id = :customer_id
  AND status IN ('open', 'bidding')
```
- **Index used**: `customer_id` has `index=True` (`models.py:1289`)
- **Index missing**: `status` has NO index (`models.py:1321`)
- **Impact**: Partial index scan on `customer_id`, then filter scan on `status`. Low cardinality (few rows per customer), so acceptable.

**Query A2 -- Demand multiplier: open requests count** (`bid_routes.py:155-157`)
```python
# ORM Code:
open_requests = db.query(RideRequest).filter(
    RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING])
).count()
```
```sql
SELECT COUNT(*) FROM ride_requests
WHERE status IN ('open', 'bidding')
```
- **Index used**: NONE. Full table scan on `ride_requests`.
- **Impact**: Scans entire ride_requests table. Grows with historical data (completed/cancelled rides never pruned).

**Query A3 -- Demand multiplier: online drivers count** (`bid_routes.py:160`)
```python
online_drivers = db.query(Driver).filter(Driver.is_online == True).count()
```
```sql
SELECT COUNT(*) FROM drivers WHERE is_online = true
```
- **Index used**: NONE. `is_online` has no index (`models.py:760`).
- **Impact**: Full table scan on `drivers` table.

**Query A4 -- INSERT ride request** (`bid_routes.py:344-370`)
```python
ride_request = RideRequest(
    request_id=generate_request_id(),  # temporary "RIDE2026000000"
    customer_id=data.customer_id,
    customer_name=...,
    customer_phone=...,
    pickup_address=..., pickup_latitude=..., pickup_longitude=..., pickup_place_name=...,
    dropoff_address=..., dropoff_latitude=..., dropoff_longitude=..., dropoff_place_name=...,
    estimated_distance_km=..., estimated_duration_minutes=...,
    ride_type=..., suggested_price=...,
    customer_max_price=..., customer_preferred_price=...,
    special_requests=...,
    status=RideRequestStatus.OPEN,
    bidding_expires_at=datetime.utcnow() + timedelta(minutes=data.bidding_duration_minutes)
)
db.add(ride_request)
db.commit()  # COMMIT #1
db.refresh(ride_request)
```
```sql
INSERT INTO ride_requests (request_id, customer_id, customer_name, customer_phone,
    pickup_address, pickup_latitude, pickup_longitude, pickup_place_name,
    dropoff_address, dropoff_latitude, dropoff_longitude, dropoff_place_name,
    estimated_distance_km, estimated_duration_minutes, ride_type,
    suggested_price, customer_max_price, customer_preferred_price,
    special_requests, status, bidding_expires_at)
VALUES (:request_id, :customer_id, ..., 'open', :bidding_expires_at)
RETURNING id;

-- refresh:
SELECT * FROM ride_requests WHERE id = :id
```
- Writes 20+ columns. `request_id` is a placeholder at this point.

**Query A5 -- UPDATE request_id** (`bid_routes.py:373-374`)
```python
ride_request.request_id = generate_clean_request_id(ride_request.id)
db.commit()  # COMMIT #2
```
```sql
UPDATE ride_requests SET request_id = 'RIDE2026000XXX', updated_at = NOW()
WHERE id = :id
```
- **Bottleneck**: Second round-trip to DB just to format the ID. Could be done in a single commit by generating the ID from a sequence or using RETURNING.

### Stage B: Nearby Driver Query (`bid_routes.py:388-392`)

**Query B1 -- All online drivers with FCM tokens** (`bid_routes.py:389-392`)
```python
online_drivers = db.query(Driver).filter(
    Driver.is_online == True,
    Driver.fcm_token.isnot(None)
).all()
```
```sql
SELECT * FROM drivers
WHERE is_online = true
  AND fcm_token IS NOT NULL
```
- **FULL TABLE SCAN**: Neither `is_online` nor `fcm_token` has an index (`models.py:760, 770`).
- **No geolocation filter**: ALL online drivers worldwide are loaded, not just those within 15 miles of the pickup.
- **Memory impact**: Loads entire Driver ORM objects (~50 columns each) for every online driver. With 1000 online drivers, this loads 50,000+ column values into Python memory.
- **The haversine function** at `bid_routes.py:131` (`calculate_distance_km`) is NOT used here. It is only used for: (a) fare estimation distance calc at line 327, and (b) driver-side filtering in `get_available_ride_requests` at line 1012. The ride creation path does ZERO geolocation filtering.

### Stage C: Push Notification Fan-Out (`bid_routes.py:394-412`)

```python
for driver in online_drivers:
    try:
        send_push_notification(
            user_type="driver",
            user_id=driver.id,
            title="New Ride Request!",
            body=f"Pickup: {data.pickup_address[:50]} -- ~{distance_miles} mi, est. ${suggested_price:.0f}",
            data={...},
            db=db
        )
    except Exception as driver_err:
        logger.warning(f"Failed to push to driver {driver.id}: {driver_err}")
```

**Push notification internals** (`order_flow.py:159-245`):

1. **Primary path** (line 183): HTTP POST to notification microservice. No DB query.
2. **Fallback path** (line 198-245): If microservice unavailable, queries DB AGAIN per driver:
   ```python
   result = db.execute(
       text("SELECT fcm_token FROM drivers WHERE id = :id"),
       {"id": user_id}
   ).fetchone()
   ```
   ```sql
   SELECT fcm_token FROM drivers WHERE id = :id  -- indexed (PK)
   ```
   - **N+1 pattern**: With 20 online drivers and notification service down, this executes 20 additional SELECT queries even though the `fcm_token` was already loaded in the ORM object at Stage B.

**Total push notification queries** (20 drivers, notification service unavailable):
- 1 SELECT all drivers (Stage B)
- 20 SELECT fcm_token per driver (Stage C fallback)
- = **21 queries** just for notifications

### Stage D: Bid Submission (`bid_routes.py:1049-1276`)

When a driver submits a bid, the following queries execute sequentially:

**Query D1 -- Ride request lookup** (`bid_routes.py:1063`)
```python
ride_request = db.query(RideRequest).filter(RideRequest.id == request_id).first()
```
```sql
SELECT * FROM ride_requests WHERE id = :id LIMIT 1
```
- **Index**: PK index on `id`. Fast.

**Query D2 -- Self-bidding prevention (NSA-008)** (`bid_routes.py:1069-1072`)
```python
customer_check = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
```
```sql
SELECT * FROM customers WHERE id = :customer_id LIMIT 1
```
- **Index**: PK index on `id`. Fast. Cross-checks `driver.email == customer.email`.

**Query D3 -- Driver re-lookup** (`bid_routes.py:1083`)
```python
driver = db.query(Driver).filter(Driver.id == data.driver_id).first()
```
```sql
SELECT * FROM drivers WHERE id = :driver_id LIMIT 1
```
- **Redundancy**: The driver was already loaded by `require_driver` Depends() at line 1049. This is a duplicate query.

**Query D4 -- Active ride check** (`bid_routes.py:1106-1111`)
```python
active_ride = db.query(RideRequest).filter(
    and_(
        RideRequest.matched_driver_id == data.driver_id,
        RideRequest.status.in_([RideRequestStatus.MATCHED, RideRequestStatus.IN_PROGRESS])
    )
).first()
```
```sql
SELECT * FROM ride_requests
WHERE matched_driver_id = :driver_id
  AND status IN ('matched', 'in_progress')
LIMIT 1
```
- **Index missing**: `matched_driver_id` has NO index (`models.py:1317`). Full table scan.
- **Index missing**: `status` has NO index (`models.py:1321`). Double filter without indexes.

**Query D5 -- Active delivery check** (`bid_routes.py:1120-1125`)
```python
active_delivery = db.query(Order).filter(
    and_(
        Order.driver_id == data.driver_id,
        Order.status.in_([OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY])
    )
).first()
```
```sql
SELECT * FROM orders
WHERE driver_id = :driver_id
  AND status IN ('preparing', 'ready_for_pickup', 'out_for_delivery')
LIMIT 1
```
- **Scans orders table**. `Order.driver_id` and `Order.status` index status needs verification.

**Query D6 -- Existing bid check** (`bid_routes.py:1133-1139`)
```python
existing_bid = db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == request_id,
        RideBid.driver_id == data.driver_id,
        RideBid.status == BidStatus.PENDING
    )
).first()
```
```sql
SELECT * FROM ride_bids
WHERE ride_request_id = :request_id
  AND driver_id = :driver_id
  AND status = 'pending'
LIMIT 1
```
- **Indexes used**: `ride_request_id` (`models.py:1376`) and `driver_id` (`models.py:1379`) both have `index=True`.
- **Missing composite**: No composite `(ride_request_id, driver_id, status)` index.

**Query D7 -- Expired bid cleanup** (`bid_routes.py:1147-1158`)
```python
expired_bids = db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == request_id,
        RideBid.status == BidStatus.PENDING,
        RideBid.expires_at < now
    )
).all()
# UPDATE each to EXPIRED + COMMIT
```
```sql
SELECT * FROM ride_bids
WHERE ride_request_id = :request_id
  AND status = 'pending'
  AND expires_at < :now

-- For each expired bid:
UPDATE ride_bids SET status = 'expired', customer_response = '...' WHERE id = :id
```
- **Index used**: `ride_request_id` index.
- **Missing**: No index on `expires_at`. No composite index `(ride_request_id, status, expires_at)`.

**Query D8 -- Active bid count** (`bid_routes.py:1163-1172`)
```python
current_bid_count = db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == request_id,
        RideBid.status == BidStatus.PENDING,
        or_(
            RideBid.expires_at > now,
            RideBid.expires_at.is_(None)
        )
    )
).count()
```
```sql
SELECT COUNT(*) FROM ride_bids
WHERE ride_request_id = :request_id
  AND status = 'pending'
  AND (expires_at > :now OR expires_at IS NULL)
```

**Query D9 -- INSERT bid** (`bid_routes.py:1188-1210`)
```python
bid = RideBid(
    bid_id=generate_bid_id(),
    ride_request_id=request_id,
    driver_id=data.driver_id,
    driver_name=..., driver_rating=..., driver_photo_url=..., driver_vehicle=...,
    proposed_price=data.proposed_price,
    message=data.message,
    estimated_arrival_minutes=data.estimated_arrival_minutes,
    status=BidStatus.PENDING,
    expires_at=datetime.utcnow() + timedelta(minutes=10)
)
db.add(bid)
# Also: ride_request.status = RideRequestStatus.BIDDING (if first bid)
db.commit()  # COMMIT #1
db.refresh(bid)
```
```sql
INSERT INTO ride_bids (bid_id, ride_request_id, driver_id, driver_name,
    driver_rating, driver_photo_url, driver_vehicle, proposed_price,
    message, estimated_arrival_minutes, status, expires_at)
VALUES (:bid_id, :request_id, :driver_id, ..., 'pending', :expires_at)
RETURNING id;

-- If first bid:
UPDATE ride_requests SET status = 'bidding', updated_at = NOW() WHERE id = :request_id;

SELECT * FROM ride_bids WHERE id = :id;
```

**Query D10 -- UPDATE bid_id** (`bid_routes.py:1213-1214`)
```python
bid.bid_id = generate_clean_bid_id(bid.id)
db.commit()  # COMMIT #2
```
```sql
UPDATE ride_bids SET bid_id = 'BID2026000XXX', updated_at = NOW() WHERE id = :id
```
- **Same double-commit pattern as ride creation.**

**Query D11 -- Customer lookup for email** (`bid_routes.py:1228`)
```python
customer = db.query(Customer).filter(Customer.id == ride_request.customer_id).first()
```
```sql
SELECT * FROM customers WHERE id = :customer_id LIMIT 1
```

**Query D12 -- Total pending bid count for email** (`bid_routes.py:1231-1234`)
```python
total_bids = db.query(RideBid).filter(
    RideBid.ride_request_id == request_id,
    RideBid.status == BidStatus.PENDING
).count()
```
```sql
SELECT COUNT(*) FROM ride_bids
WHERE ride_request_id = :request_id AND status = 'pending'
```

**Total queries per bid submission: 12+ queries, 2 commits.**

### Stage E: Bid Listing (`bid_routes.py:521-548`)

**Query E1 -- Ride lookup** (`bid_routes.py:523`)
```sql
SELECT * FROM ride_requests WHERE id = :request_id LIMIT 1
```

**Query E2 -- Bids with eager-loaded driver** (`bid_routes.py:532-539`)
```python
bids = db.query(RideBid).options(
    joinedload(RideBid.driver)
).filter(
    and_(
        RideBid.ride_request_id == request_id,
        RideBid.status == BidStatus.PENDING
    )
).order_by(RideBid.proposed_price.asc()).all()
```
```sql
SELECT ride_bids.*, drivers.*
FROM ride_bids
LEFT OUTER JOIN drivers ON drivers.id = ride_bids.driver_id
WHERE ride_bids.ride_request_id = :request_id
  AND ride_bids.status = 'pending'
ORDER BY ride_bids.proposed_price ASC
```
- **Good**: Uses `joinedload` to avoid N+1 on driver details. Single query.
- **Index used**: `ride_request_id` index on `ride_bids`.

### Stage F: Bid Acceptance (`bid_routes.py:551-731`)

**Query F1 -- Bid lookup** (`bid_routes.py:557`)
```sql
SELECT * FROM ride_bids WHERE id = :bid_id LIMIT 1
```

**Query F2 -- Ride lookup (DUPLICATE)** (`bid_routes.py:562, 569`)
```python
ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
# ... auth check ...
ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()  # AGAIN
```
```sql
-- Executed TWICE:
SELECT * FROM ride_requests WHERE id = :ride_request_id LIMIT 1
```
- **Bug**: The ride request is queried twice (lines 562 and 569). Second query is redundant.

**Queries F3-F5 -- Accept bid transaction** (`bid_routes.py:580-613`)
```sql
-- In-memory updates, single commit:
UPDATE ride_bids SET status='accepted', accepted_at=NOW(), responded_at=NOW()
WHERE id = :bid_id;

UPDATE ride_requests SET status='matched', matched_bid_id=:bid_id,
    matched_driver_id=:driver_id, final_price=:price, matched_at=NOW()
WHERE id = :request_id;
```

**Query F6 -- Reject other bids** (`bid_routes.py:592-603`)
```python
other_bids = db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == ride_request.id,
        RideBid.id != bid.id,
        RideBid.status == BidStatus.PENDING
    )
).all()
for other_bid in other_bids:
    other_bid.status = BidStatus.REJECTED
    other_bid.rejected_at = now
    other_bid.customer_response = "Another bid was accepted"
```
```sql
SELECT * FROM ride_bids
WHERE ride_request_id = :request_id
  AND id != :bid_id
  AND status = 'pending';

-- For each remaining bid:
UPDATE ride_bids SET status='rejected', rejected_at=NOW(), customer_response='...'
WHERE id = :other_bid_id;
```
- **O(n)**: If 20 drivers bid, rejecting 19 bids = 19 individual UPDATE statements. Could be a single bulk UPDATE.

**Query F7 -- Driver lookup for notification** (`bid_routes.py:606`)
```sql
SELECT * FROM drivers WHERE id = :driver_id LIMIT 1
```

**Query F8 -- In-app notification INSERT** (`bid_routes.py:608-611`)
```sql
INSERT INTO in_app_notifications (customer_id, title, message, type, reference_id, reference_type)
VALUES (:customer_id, 'Driver Matched!', '...', 'ride', :ride_id, 'ride')
```

**Query F9 -- Customer lookup for email** (`bid_routes.py:645`)
```sql
SELECT * FROM customers WHERE id = :customer_id LIMIT 1
```

### Stage G: Driver-Side Ride Polling (`bid_routes.py:976-1045`)

When drivers poll for available rides, the `get_available_ride_requests` endpoint runs:

**Query G1 -- Open ride requests** (`bid_routes.py:997-1005`)
```python
open_requests = db.query(RideRequest).filter(
    and_(
        RideRequest.status.in_([RideRequestStatus.OPEN, RideRequestStatus.BIDDING]),
        or_(
            RideRequest.bidding_expires_at > now,
            RideRequest.bidding_expires_at.is_(None)
        )
    )
).all()
```
```sql
SELECT * FROM ride_requests
WHERE status IN ('open', 'bidding')
  AND (bidding_expires_at > :now OR bidding_expires_at IS NULL)
```
- **No index on `status`** or `bidding_expires_at`. Full table scan.
- Geolocation filtering happens IN PYTHON (`bid_routes.py:1012-1017`), not in SQL.

**Query G2 -- Per-request existing bid check** (`bid_routes.py:1022-1028`)
```python
# For EACH open request:
existing_bid = db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == request.id,
        RideBid.driver_id == driver_id,
        RideBid.status.in_([BidStatus.PENDING, BidStatus.COUNTERED])
    )
).first()
```
```sql
SELECT * FROM ride_bids
WHERE ride_request_id = :request_id
  AND driver_id = :driver_id
  AND status IN ('pending', 'countered')
LIMIT 1
```
- **N+1 pattern**: One query per open ride request. With 50 open requests, that is 50 additional queries.
- **Index used**: Individual indexes on `ride_request_id` and `driver_id`.

---

## Index Inventory

### Table: `ride_requests` (`models.py:1281-1365`)

| Column | Has Index | Used In Queries | Query Location |
|--------|-----------|-----------------|----------------|
| `id` | YES (PK) | Ride lookup by ID | `bid_routes.py:474,523,562,569,901,1063` |
| `request_id` | YES (unique) | Lookup by human-readable ID | Serialization, logs |
| `customer_id` | YES | Concurrent request check, customer rides | `bid_routes.py:314,503` |
| `status` | **NO** | Concurrent check, demand calc, available rides, active ride check | `bid_routes.py:316,156,999,1109` |
| `matched_driver_id` | **NO** | Active ride check per driver | `bid_routes.py:1108` |
| `matched_bid_id` | **NO** | Bid acceptance | `bid_routes.py:586` (write only) |
| `bidding_expires_at` | **NO** | Available rides filter | `bid_routes.py:1001` |
| `created_at` | **NO** | ORDER BY in customer rides | `bid_routes.py:512` |

### Table: `ride_bids` (`models.py:1368-1420`)

| Column | Has Index | Used In Queries | Query Location |
|--------|-----------|-----------------|----------------|
| `id` | YES (PK) | Bid lookup | `bid_routes.py:557` |
| `bid_id` | YES (unique) | Human-readable lookup | Serialization |
| `ride_request_id` | YES | Bid listing, existing check, cleanup | `bid_routes.py:536,1135,1149,1165` |
| `driver_id` | YES | Existing bid check, per-driver queries | `bid_routes.py:1136,1024` |
| `status` | **NO** | Pending bid filter, expired check | `bid_routes.py:537,1137,1150,1166` |
| `expires_at` | **NO** | Expired bid cleanup, active bid count | `bid_routes.py:1151,1168` |
| `proposed_price` | **NO** | ORDER BY in bid listing | `bid_routes.py:539` |

### Table: `drivers` (`models.py:712-806`)

| Column | Has Index | Used In Queries | Query Location |
|--------|-----------|-----------------|----------------|
| `id` | YES (PK) | Driver lookup | `bid_routes.py:606,1083` |
| `driver_id` | YES (unique) | Human-readable lookup | Registration |
| `email` | **NO** (unique only) | Self-bid email cross-check | `bid_routes.py:1071` |
| `is_online` | **NO** | Online driver query, demand calc | `bid_routes.py:160,390` |
| `fcm_token` | **NO** | Push notification filter | `bid_routes.py:391` |
| `status` | **NO** | Driver approval check | `bid_routes.py:1088` |
| `apple_id` | YES | Apple Sign-In | Auth flow |
| `activation_token` | YES | Email activation | Onboarding |

### Table: `in_app_notifications` (`models.py:1831-1850`)

| Column | Has Index | Used In Queries | Query Location |
|--------|-----------|-----------------|----------------|
| `id` | YES (PK) | -- | -- |
| `customer_id` | YES | Notification feed | `bid_routes.py:52` |

### Table: `customers` (`models.py:580-648`)

| Column | Has Index | Used In Queries | Query Location |
|--------|-----------|-----------------|----------------|
| `id` | YES (PK) | Self-bid check, email send | `bid_routes.py:1069,645,1228` |
| `email` | YES (unique) | Self-bid email compare | `bid_routes.py:1071` |

---

## Bottleneck Analysis (Ranked by Severity)

### SEVERITY 1: Full Table Scan on Drivers (CRITICAL)

**Location**: `bid_routes.py:389-392`
**Query**: `SELECT * FROM drivers WHERE is_online = true AND fcm_token IS NOT NULL`
**Impact**: Every ride request triggers a full scan of the `drivers` table. No geolocation filter means a driver in Los Angeles gets notified about a ride in New York.

**Scaling characteristics**:
- **O(D)** where D = total driver rows in database (not just online drivers)
- With 10,000 registered drivers, scans 10,000 rows to find 20 online ones
- Loads ~50 columns per driver into Python memory
- No spatial index or geolocation filter at ride creation time

**With 20 drivers in 15-mile radius** (realistic scenario):
- If there are also 180 online drivers outside 15 miles, all 200 get notified
- 200 push notifications sent (10x more than needed)
- 200 potential FCM API calls

### SEVERITY 2: Synchronous Push Notification Loop with N+1 Fallback (HIGH)

**Location**: `bid_routes.py:394-412`, fallback at `order_flow.py:198-245`
**Impact**: Push notifications are sent in a serial Python for-loop. Each iteration makes an HTTP request to the notification service (5-second timeout). If the service is down, each iteration makes an additional DB query.

**Scaling characteristics**:
- **O(D)** where D = online drivers (all of them, not just nearby)
- 20 drivers: 20 sequential HTTP calls = ~1-2 seconds (happy path)
- 200 drivers: 200 sequential HTTP calls = ~10-20 seconds blocking the response
- Notification service down: adds 200 DB queries on top

**The customer's ride creation request is blocked** until all push notifications complete. This is not async despite the endpoint being `async def`.

**Note**: The `asyncio.create_task(broadcast_new_ride_request(...))` WebSocket broadcast at line 378 IS async. But the FCM push loop at lines 394-412 is NOT wrapped in an async task.

### SEVERITY 3: O(n) Bid Submission Query Count (MEDIUM)

**Location**: `bid_routes.py:1049-1276`
**Impact**: Each bid submission runs 12+ queries. With 20 drivers bidding on the same ride within the 5-minute window:

**Total queries for 20 bids**: ~240 queries
- 20 x 12 queries per bid = 240 queries
- Plus: 20 x 2 commits per bid = 40 commits
- Plus: push notifications to customer per bid
- Plus: email to customer per bid

**Scaling characteristics**:
- **O(B x Q)** where B = bids and Q = queries per bid (~12)
- Missing indexes on `matched_driver_id` and `status` mean some of these are table scans

### SEVERITY 4: Double-Commit Pattern (MEDIUM)

**Location**: Ride creation `bid_routes.py:369+374`, Bid submission `bid_routes.py:1209+1214`
**Impact**: Every ride request and every bid triggers 2 database commits instead of 1. The second commit only updates the human-readable ID (e.g., `RIDE2026000123`).

**Root cause**: The human-readable ID requires the auto-incremented `id` from the first INSERT. This could be solved by:
- Using a database sequence to pre-allocate the ID
- Generating the ID from UUID (no DB dependency)
- Using RETURNING clause and building the ID before second commit

**Scaling**: 20 bids on 1 ride = 42 commits (2 for ride + 40 for bids) instead of 21.

### SEVERITY 5: Duplicate Queries in respond_to_bid (LOW)

**Location**: `bid_routes.py:562, 569`
**Impact**: The ride request is queried twice -- once for auth check and once for business logic. The second SELECT is identical and unnecessary.

**Fix**: Remove the second query at line 569 and reuse the result from line 562.

### SEVERITY 6: Driver-Side Polling N+1 (MEDIUM)

**Location**: `bid_routes.py:1022-1028`
**Impact**: `get_available_ride_requests` runs one `existing_bid` query per open ride request. With 50 open requests, that is 50 queries per poll.

**Scaling**: If 20 drivers poll every 10 seconds:
- 20 x 50 = 1,000 queries per 10 seconds = 6,000 queries/minute just for bid-existence checks
- Could be a single IN query or batch check

---

## Query Count Summary (Single Ride Lifecycle)

| Phase | Queries | Commits | Notes |
|-------|---------|---------|-------|
| Ride creation | 5 | 2 | Includes demand calc |
| Driver notification (20 drivers) | 1 + (0 to 20) | 0 | 1 SELECT all; +20 if fallback |
| Per bid submission (x20 drivers) | 12 each = 240 | 2 each = 40 | Includes email/push queries |
| Bid listing (customer polls x5) | 2 each = 10 | 0 | joinedload avoids N+1 |
| Bid acceptance | ~10 | 1 | Reject 19 bids = 19 UPDATEs |
| **TOTAL** | **~286** | **~43** | **Single ride with 20 bidders** |

---

## Recommendations

### R1: Add Missing Indexes (IMMEDIATE, ~10 minutes)

```sql
-- ride_requests: most impactful
CREATE INDEX ix_ride_requests_status ON ride_requests (status);
CREATE INDEX ix_ride_requests_matched_driver_id ON ride_requests (matched_driver_id);
CREATE INDEX ix_ride_requests_customer_status ON ride_requests (customer_id, status);
CREATE INDEX ix_ride_requests_bidding_expires ON ride_requests (bidding_expires_at) WHERE status IN ('open', 'bidding');

-- ride_bids
CREATE INDEX ix_ride_bids_status ON ride_bids (status);
CREATE INDEX ix_ride_bids_request_status ON ride_bids (ride_request_id, status);
CREATE INDEX ix_ride_bids_request_driver_status ON ride_bids (ride_request_id, driver_id, status);
CREATE INDEX ix_ride_bids_expires ON ride_bids (expires_at) WHERE status = 'pending';

-- drivers
CREATE INDEX ix_drivers_is_online ON drivers (is_online) WHERE is_online = true;
CREATE INDEX ix_drivers_online_fcm ON drivers (is_online, fcm_token) WHERE is_online = true AND fcm_token IS NOT NULL;
```

**ORM equivalent** (models.py):
```python
# RideRequest:
status = Column(SQLEnum(RideRequestStatus), default=RideRequestStatus.OPEN, index=True)
matched_driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True, index=True)

# Driver:
is_online = Column(Boolean, default=False, index=True)
```

### R2: Add Geolocation Filter to Driver Notification Query (HIGH PRIORITY)

Replace the full-table driver scan with a bounding-box pre-filter:

```python
# Instead of:
online_drivers = db.query(Driver).filter(
    Driver.is_online == True,
    Driver.fcm_token.isnot(None)
).all()

# Use bounding box + haversine:
RADIUS_KM = 25  # 15 miles ~= 24 km, add buffer
lat_delta = RADIUS_KM / 111.0  # 1 degree lat ~= 111 km
lon_delta = RADIUS_KM / (111.0 * math.cos(math.radians(pickup_lat)))

nearby_drivers = db.query(Driver).filter(
    Driver.is_online == True,
    Driver.fcm_token.isnot(None),
    Driver.current_latitude.isnot(None),
    Driver.current_latitude.between(pickup_lat - lat_delta, pickup_lat + lat_delta),
    Driver.current_longitude.between(pickup_lon - lon_delta, pickup_lon + lon_delta)
).all()

# Then filter with haversine in Python for precision
nearby_drivers = [d for d in nearby_drivers
    if calculate_distance_km(pickup_lat, pickup_lon,
                              d.current_latitude, d.current_longitude) <= RADIUS_KM]
```

For production scale, consider PostGIS extension with `ST_DWithin` for true spatial indexing.

### R3: Batch Push Notifications (HIGH PRIORITY)

Replace the synchronous for-loop with async batching:

```python
# Instead of:
for driver in online_drivers:
    send_push_notification(...)

# Use asyncio.gather for concurrent sends:
async def notify_drivers_batch(drivers, ride_data):
    tasks = [
        send_push_notification_async(driver.id, driver.fcm_token, ride_data)
        for driver in drivers
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return sum(1 for r in results if r is True)

# Or use Firebase batch messaging (up to 500 per batch):
# messaging.send_each([Message(token=d.fcm_token, ...) for d in drivers])
```

### R4: Eliminate Double-Commit Pattern (MEDIUM)

Use a pre-allocated sequence or generate the human-readable ID without the DB round-trip:

```python
# Option A: Use UUID-based IDs (no DB dependency)
request_id = f"RIDE{datetime.utcnow().strftime('%Y')}{uuid.uuid4().hex[:6].upper()}"

# Option B: Use PostgreSQL sequence
# CREATE SEQUENCE ride_request_id_seq;
# request_id = f"RIDE{year}{db.execute(text('SELECT nextval(...)').scalar():06d}"

# Option C: Single commit with RETURNING
ride_request = RideRequest(request_id="TEMP", ...)
db.add(ride_request)
db.flush()  # Gets the ID without committing
ride_request.request_id = generate_clean_request_id(ride_request.id)
db.commit()  # Single commit
```

### R5: Reduce Bid Submission Query Count (MEDIUM)

1. Remove duplicate driver lookup at `bid_routes.py:1083` (already loaded by `require_driver`).
2. Combine active-ride and active-delivery checks into a single query or use a cached "driver busy" flag.
3. Batch the expired bid cleanup into a periodic background job instead of per-bid-submission.

### R6: Fix Duplicate ride_request Query in respond_to_bid (LOW)

At `bid_routes.py:562-569`, remove the second identical query:

```python
# Line 562: query for auth check
ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
if ride_request and customer.id != ride_request.customer_id:
    raise HTTPException(status_code=403, ...)

# Line 569: REMOVE THIS - ride_request already loaded above
# ride_request = db.query(RideRequest).filter(RideRequest.id == bid.ride_request_id).first()
```

### R7: Batch Reject Other Bids on Acceptance (LOW)

Replace individual UPDATE per rejected bid with bulk UPDATE:

```python
# Instead of:
for other_bid in other_bids:
    other_bid.status = BidStatus.REJECTED

# Use bulk UPDATE:
db.query(RideBid).filter(
    and_(
        RideBid.ride_request_id == ride_request.id,
        RideBid.id != bid.id,
        RideBid.status == BidStatus.PENDING
    )
).update(
    {RideBid.status: BidStatus.REJECTED,
     RideBid.rejected_at: now,
     RideBid.customer_response: "Another bid was accepted"},
    synchronize_session='fetch'
)
```

---

## Appendix: Geolocation Gap Analysis

The system has two separate code paths for geolocation:

1. **Ride creation** (`bid_routes.py:327-330`): Uses `calculate_distance_km` to calculate pickup-to-dropoff distance for fare estimation. Does NOT filter drivers by distance.

2. **Driver polling** (`bid_routes.py:1008-1017`): The `get_available_ride_requests` endpoint accepts `latitude`, `longitude`, and `radius_km` parameters. Filters rides by driver-to-pickup distance IN PYTHON (not SQL). This means:
   - All open rides are loaded from DB first (full scan)
   - Haversine distance calculated per ride in Python
   - Rides outside radius filtered out

3. **Main_new.py haversine** (`main_new.py:3576`): Separate haversine implementation used for ERP/admin ride request endpoint. Not used in the bidding flow.

The result: **drivers receive push notifications for rides they cannot serve** (too far away), and **the ride listing endpoint loads all rides before filtering by distance**.

---

*Report generated: 2026-02-26*
*Source files: bid_routes.py (3147 lines), models.py (1850+ lines), order_flow.py, rideshare_payments.py, database.py, websocket_server.py*
