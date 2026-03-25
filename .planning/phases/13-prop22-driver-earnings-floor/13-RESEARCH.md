# Phase 13: Prop 22 Driver Earnings Floor - Research

**Researched:** 2026-03-25
**Domain:** California Proposition 22 compliance — Python/FastAPI backend, SQLAlchemy ORM, APScheduler, Stripe Connect, SwiftUI iOS, React/Ant Design admin portal
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROP22-01 | Alembic migration: 5 new columns on `ride_requests`, 5 new columns on `orders`, 4 new tables (`prop22_config`, `prop22_city_wages`, `prop22_earning_periods`, `prop22_earnings_statement`) with seed data and unique constraint | Verified existing migration naming pattern; all new columns confirmed absent from current models.py; all 4 new tables confirmed absent |
| PROP22-02 | Per-ride/per-order Prop 22 floor computed at completion using acceptance-GPS engaged miles (not pickup→dropoff), correct GPS-based city wage (handles July 1 mid-year increases) | Ride completion hook confirmed: `bid_routes.py:2499-2546`; Order completion hook confirmed: `order_flow.py:3902-3961`; Driver acceptance hooks confirmed for both |
| PROP22-03 | 14-day reconciliation job runs at PT midnight on period boundaries for both rideshare and food delivery; tops up via Stripe or flags MANUAL_REVIEW | APScheduler file-lock pattern confirmed: `order_flow.py:2881`; `stripe.Transfer.create` confirmed: `bid_routes.py:2598`; `Driver.stripe_account_id` + `Driver.stripe_onboarded` confirmed: `models.py:796-797` |
| PROP22-04 | Earnings statements persisted to DB per BPC §7454(b)(2) with QTD engaged hours (calendar quarter) | `prop22_earnings_statement` table design fully specified in approved spec; statement row is the BPC §7454 "delivery" record |
| PROP22-05 | iOS PayoutDashboardView shows Prop 22 period cards, status badges, per-ride/delivery floor disclosure, QTD hours in statement detail | Existing `PayoutDashboardView.swift` structure confirmed; new section appended below `summaryCard`; API shape defined in spec |
| PROP22-06 | Admin portal `/admin/prop22` compliance table and MANUAL_REVIEW queue with deadline countdown and manual top-up trigger | Admin portal uses Ant Design + React; route pattern in `App.tsx:233-254`; sidebar pattern in `MainLayout.tsx:61-125`; `DriversAdmin.tsx` is the reference implementation |
| PROP22-07 | Tips excluded from net_earnings in all calculations (rideshare: `driver_payout` already excludes tips; food delivery: `delivery_fee` excludes `tip`) | Confirmed: `models.py:1379` `driver_payout = Column(Float)` = fare - $1 (tip NOT included); `models.py:1388` `tip_amount` separate; `Order.delivery_fee` at `models.py:438`, `Order.tip` at `models.py:439` |
| PROP22-08 | All period boundaries in America/Los_Angeles timezone; Driver.state never used for CA detection (GPS bounding box only) | Confirmed: CA bounding box approach specified in approved spec; `zoneinfo.ZoneInfo("America/Los_Angeles")` is the correct Python timezone method |
</phase_requirements>

---

## Summary

Phase 13 implements California Proposition 22 (BPC §§7453–7463) statutory earnings floor compliance for Dollor.ai's rideshare and food delivery drivers. The implementation has a fully approved design spec (`docs/superpowers/specs/2026-03-24-prop22-driver-payout-design.md`, Rev 3) that is the single source of truth. All code patterns, data model fields, and integration points have been verified against the actual codebase.

The core implementation pattern is: (1) capture Prop 22 data at the two existing completion hooks in `bid_routes.py` (rideshare) and `order_flow.py` (food delivery), (2) run a nightly APScheduler job at PT midnight on period boundaries that sums per-ride/order pre-computed values, creates `prop22_earning_periods` records, auto-pays via Stripe, and creates `prop22_earnings_statement` records for BPC §7454 compliance, (3) expose two driver API endpoints and two admin API endpoints, (4) extend the existing iOS `PayoutDashboardView.swift` with a Prop 22 section, and (5) add a new `/admin/prop22` React page to the existing admin portal.

**Critical finding:** The ROADMAP specifies food delivery (Order) Prop 22 columns as well as rideshare (RideRequest) columns. The approved spec's data model section focuses on rideshare but the ROADMAP success criteria explicitly includes food delivery. The migration plan (13-01) must add 5 columns to both `ride_requests` AND `orders`. The reconciliation job (13-03) must query both `RideRequest` and `Order` records. Food delivery `driver_payout` equivalent is `Order.delivery_fee + Order.tip`, but **tips must be excluded**: use `Order.delivery_fee` alone as net earnings for Prop 22 (same principle as rideshare `driver_payout`).

**Primary recommendation:** Follow the approved spec (Rev 3) exactly. Do not deviate from the specified data model, calculation logic, or deployment ordering. The spec's pre-computed per-ride `prop22_floor_amount` approach is the correct architecture — do not attempt to recalculate floor values in the reconciliation job.

---

## Standard Stack

### Core (all already in the project — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SQLAlchemy | Existing | ORM for new models and 4 new tables | Already used throughout `models.py` |
| Alembic | Existing | DB migration for 5+5 new columns + 4 tables | Existing pattern in `alembic/versions/` |
| APScheduler | Existing | Nightly reconciliation cron job | Already used in `order_flow.py:2881` |
| Stripe Python SDK | Existing | `stripe.Transfer.create()` for top-ups | Already used: `bid_routes.py:2598` |
| `zoneinfo` | Python 3.9+ stdlib | PT timezone for all period boundaries | Already in Python stdlib; do NOT use pytz |
| FastAPI | Existing | 4 new API endpoints | All backend routes use FastAPI |
| React + Ant Design | Existing | Admin portal `/admin/prop22` page | `DriversAdmin.tsx` is the reference |
| SwiftUI | Existing | iOS PayoutDashboardView extension | Existing view in driver app |

### Supporting (road miles calculation)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `google_maps_service.get_traffic_eta` | Existing | Road miles via Google Maps Directions API | When `GOOGLE_MAPS_API_KEY` env var is set |
| `insurance.utils.haversine_miles` | Existing | Straight-line miles fallback | When Google Maps API unavailable |

**The `road_miles()` function must be written as a new helper in `bid_routes.py` or a new `prop22_utils.py` file.** It wraps `google_maps_service.get_traffic_eta()` (which returns `ETAResult.distance_miles`) for road miles, falling back to `haversine_miles() × 1.25` (correction factor per spec) when the Google Maps API is unavailable.

### No new package installs required

All required libraries are already installed in the backend virtualenv. No `pip install` or `npm install` needed.

---

## Architecture Patterns

### Recommended File Structure

```
backend/
├── prop22_utils.py             # NEW: gps_to_city(), get_city_min_wage(),
│                               #      road_miles(), calculate_prop22_ride_data(),
│                               #      get_period_bounds_for_date(), get_qtd_engaged_hours()
├── alembic/versions/
│   └── 20260325_add_prop22_tables.py   # NEW: migration (all 5+5 cols + 4 tables)
├── models.py                   # MODIFIED: 5 new cols on RideRequest, 5 on Order,
│                               #           4 new ORM classes
├── bid_routes.py               # MODIFIED: prop22 data captured at ride completion
├── order_flow.py               # MODIFIED: prop22 data captured at delivery completion;
│                               #           2 new APScheduler jobs added
├── main_new.py                 # MODIFIED: 4 new API endpoint functions registered

frontend/src/app/screens/
├── prop22/                     # NEW: Prop22Compliance.tsx admin page
└── ... (existing screens)

apps/ios/delivery/.../Views/
└── PayoutDashboardView.swift   # MODIFIED: Prop 22 section added
```

### Pattern 1: Alembic Migration Naming

**Verified naming convention from `alembic/versions/`:**

```
20260325_add_prop22_tables.py
```

File header pattern (from `20260320_add_driver_cancel_tracking.py`):
```python
"""Add Prop 22 compliance tables and columns

Revision ID: 20260325_prop22_tables
Revises: 20260321_add_ride_request_accessibility_columns
Create Date: 2026-03-25
"""
from alembic import op

revision = "20260325_prop22_tables"
down_revision = "20260321_accessibility"  # verify exact ID of latest migration
branch_labels = None
depends_on = None

def upgrade():
    # Use ALTER TABLE ... ADD COLUMN IF NOT EXISTS pattern (consistent with existing migrations)
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lat FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lon FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_hours FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_miles FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_floor_amount FLOAT")
    # ... orders columns ...
    # ... CREATE TABLE prop22_config ...
    # ... CREATE TABLE prop22_city_wages ...
    # ... CREATE TABLE prop22_earning_periods ...
    # ... CREATE TABLE prop22_earnings_statement ...
```

**Critical migration ordering:** Apply migration BEFORE deploying new code. Old code ignores new nullable columns. New code reads them.

### Pattern 2: Ride Completion Hook (bid_routes.py:2499)

The exact hook is `POST /request/{request_id}/complete` at `bid_routes.py:2499`. The Prop 22 data must be computed and written **after** `ride_request.completed_at = datetime.utcnow()` is set (line 2514) but **before** `db.commit()` at line 2546.

**Insertion point:**
```python
# bid_routes.py — inside complete_ride(), after line 2538 (driver_payout set)
# ADD HERE: compute and persist Prop 22 data
try:
    from prop22_utils import calculate_prop22_ride_data
    p22 = calculate_prop22_ride_data(ride_request, db)
    if p22:
        ride_request.prop22_engaged_hours = p22["prop22_engaged_hours"]
        ride_request.prop22_engaged_miles = p22["prop22_engaged_miles"]
        ride_request.prop22_floor_amount = p22["prop22_floor_amount"]
except Exception as e:
    logger.error(f"Prop 22 ride data calculation failed (non-blocking): {e}")
# THEN: existing db.commit() at line 2546
```

### Pattern 3: Driver Acceptance Hook (prop22_acceptance_lat/lon capture)

`prop22_acceptance_lat/lon` must be set at `matched_at` — the moment the customer accepts a bid. This is at `bid_routes.py:714` where `ride_request.matched_at = now`.

**The acceptance GPS must come from the bid.** The driver's GPS position at bid time needs to be stored in `RideBid`. Check if `RideBid` already has driver GPS fields; if not, the fallback is to use the request's `pickup_latitude/longitude` as a proxy (not ideal but legally safer than missing the field entirely). The spec says "capture driver GPS into `RideRequest.prop22_acceptance_lat/lon`" at `matched_at`. **This is an open question — see Section: Open Questions.**

### Pattern 4: Food Delivery Completion Hook (order_flow.py:3902)

The food delivery completion hook is `POST /orders/{order_id}/delivered` at `order_flow.py:3902`. The Prop 22 data must be computed **after** `order.delivered_at = datetime.now()` (line 3961) but before the accounting block.

Food delivery engaged time: `order.delivered_at - order.driver_accepted_at`
Food delivery acceptance GPS: new `prop22_acceptance_lat/lon` columns on `Order` — set at `order_flow.py:3639` (`order.driver_accepted_at = datetime.now()`) inside `assign_driver()` at `order_flow.py:3567`.

**The food delivery driver acceptance GPS capture hook is `order_flow.py:3567` (POST `/orders/{order_id}/assign-driver`), specifically at line 3639 where `order.driver_accepted_at = datetime.now()`.**

### Pattern 5: APScheduler File-Lock Pattern

**Source:** `order_flow.py:2881` — the existing `_should_run_scheduler()` function.

The Prop 22 reconciliation jobs use the SAME guard already implemented. They are added to `restaurant_timeout_scheduler` (or the same scheduler instance) via `@scheduler.scheduled_job` decorator. The existing `_should_run_scheduler()` function gates all job registration, so new jobs automatically inherit the single-worker guarantee.

Key scheduler pattern (from spec, verified against `order_flow.py:2881`):
```python
@scheduler.scheduled_job("cron", hour=0, minute=0, timezone="America/Los_Angeles")
def prop22_period_reconciliation_job():
    lock_path = "/tmp/prop22_reconciliation.lock"
    import fcntl
    try:
        lock_fd = os.open(lock_path, os.O_CREAT | os.O_WRONLY, 0o644)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return  # Another process is handling this
    # ... job body ...
```

Note: The existing `_should_run_scheduler()` already handles per-process deduplication at the scheduler level. The per-job file lock in the spec is belt-and-suspenders for the reconciliation job specifically (double protection for the financial operation).

### Pattern 6: Admin Portal React Page

**Reference implementation:** `DriversAdmin.tsx` (Ant Design Table, modal, Tabs, statistic cards).

**Route registration:** Add to `App.tsx` inside the `<Route path="/admin">` block (line 233):
```tsx
<Route path="prop22" element={<Prop22Compliance />} />
```

**Sidebar registration:** Add to `MainLayout.tsx` navigation array (line 61), under Finance section or as standalone:
```tsx
{ name: 'Prop 22', href: '/admin/prop22', icon: ClipboardCheck }
```

**Import pattern:** Add `import Prop22Compliance from './screens/prop22/Prop22Compliance';` to `App.tsx`.

**Page structure:** Two Ant Design `Tabs`: "All Periods" (Table with all statuses) + "Manual Review" (Table filtered to MANUAL_REVIEW + OVERDUE, sorted by deadline_at ASC). Action buttons in Manual Review tab: `POST /api/admin/prop22/manual-topup`.

### Pattern 7: iOS PayoutDashboardView Extension

**Existing structure:** `PayoutDashboardView.swift` is a `NavigationView` with `ScrollView` containing `summaryCard()` + `ridesList()` + period selector. The new Prop 22 section is a new `@ViewBuilder` function `prop22Section()` appended to the `ScrollView`'s `VStack`.

**New state variables needed:**
```swift
@State private var prop22Periods: [Prop22Period] = []
@State private var prop22Loading = true
@State private var prop22Error: String?
```

**New Codable structs:**
```swift
struct Prop22Period: Codable, Identifiable {
    let id: Int
    let periodStart: String
    let periodEnd: String
    let status: String
    let engagedHours: Double
    let engagedMiles: Double
    let netEarnings: Double
    let prop22Floor: Double
    let topUpAmount: Double
    let deadlineAt: String?
    let qtdEngagedHours: Double?
    // CodingKeys: snake_case → camelCase
}
```

**API call:** `GET /api/driver/prop22/periods` using the same `SecureStorage.shared.driverAccessToken` + `AppConfig.shared.p2pAPIBaseURL` pattern as `fetchPayoutHistory()`.

### Anti-Patterns to Avoid

- **Using `Driver.state` for CA detection:** Per BPC §7463, the applicable law is where the ride/delivery was accepted, not the driver's home state. The spec mandates GPS bounding box. Using `Driver.state == "CA"` is legally wrong and would be a class action vector.
- **Recalculating `prop22_floor` in the reconciliation job:** Use `sum(r.prop22_floor_amount)` from pre-computed per-ride values. Do NOT re-fetch `prop22_config` and recalculate in the batch — it fails to handle July 1 mid-period city wage changes.
- **Using `driver_payout - tip_amount` for net earnings:** `driver_payout` (`models.py:1379`) already excludes tips. Subtracting `tip_amount` again would double-subtract.
- **Using UTC midnight for period boundaries:** Use `America/Los_Angeles` midnight. A ride at 11:45 PM PT = 6:45 AM UTC Monday — UTC would assign it to the wrong period.
- **Single `db.commit()` for all drivers:** Commit per driver (`db.commit()` inside the driver loop). A Stripe failure for driver A should not roll back driver B's successfully processed period.
- **Batch `INSERT` for earning periods:** Use `SELECT before INSERT` guard + unique constraint — two layers of double-insert protection.

---

## Verified Field Names and File:Line References

**All fields verified by reading actual source files.**

### RideRequest model (models.py:1313)

| Field | Line | Value |
|-------|------|-------|
| `driver_payout` | 1379 | `fare - $1` (tips NOT included) |
| `tip_amount` | 1388 | tip tracked separately; 100% to driver |
| `matched_at` | 1399 | Set at bid acceptance (bid_routes.py:714) |
| `completed_at` | 1401 | Set at ride completion (bid_routes.py:2514) |
| `dropoff_latitude` | 1333 | Used as engaged miles end-point |
| `dropoff_longitude` | 1334 | Used as engaged miles end-point |
| `pickup_latitude` | 1327 | Fallback for acceptance lat if bid GPS unavailable |
| `pickup_longitude` | 1328 | Fallback for acceptance lon if bid GPS unavailable |

**New columns to add (all nullable):**
- `prop22_acceptance_lat` — Float nullable
- `prop22_acceptance_lon` — Float nullable
- `prop22_engaged_hours` — Float nullable
- `prop22_engaged_miles` — Float nullable
- `prop22_floor_amount` — Float nullable

### Order model (models.py:416)

| Field | Line | Value |
|-------|------|-------|
| `delivery_fee` | 438 | Driver's earnings base (tip excluded) |
| `tip` | 439 | Customer tip; excluded from Prop 22 net earnings |
| `driver_accepted_at` | 511 | Set at `assign_driver()`: order_flow.py:3639 |
| `delivered_at` | 493 | Set at `order_delivered()`: order_flow.py:3961 |
| `delivery_latitude` | 449 | Customer dropoff lat (NOT driver acceptance lat) |
| `delivery_longitude` | 450 | Customer dropoff lon |

**New columns to add (all nullable):**
- `prop22_acceptance_lat` — Float nullable (driver GPS at acceptance)
- `prop22_acceptance_lon` — Float nullable
- `prop22_engaged_hours` — Float nullable (`delivered_at - driver_accepted_at` in hours)
- `prop22_engaged_miles` — Float nullable (road miles from acceptance GPS → dropoff)
- `prop22_floor_amount` — Float nullable

### Driver model (models.py:~721)

| Field | Line | Value |
|-------|------|-------|
| `stripe_account_id` | 796 | Stripe Connect account ID |
| `stripe_onboarded` | 797 | Boolean — whether Stripe payout is active |
| `first_name` | Verified in DriversAdmin.tsx interface | Used for admin display |
| `last_name` | Verified in DriversAdmin.tsx interface | Used for admin display |

### Key completion hooks (verified by reading code)

| Hook | File | Line | When Called |
|------|------|------|------------|
| Ride completion | `bid_routes.py` | 2499 | Driver taps "Complete Ride" |
| `driver_payout` written | `bid_routes.py` | 2538 | Inside complete_ride() |
| First `db.commit()` | `bid_routes.py` | 2546 | After payout/status set |
| Bid acceptance (matched_at) | `bid_routes.py` | 714 | Customer accepts bid |
| Food delivery completion | `order_flow.py` | 3902 | Driver taps "Delivered" |
| Food delivery `delivered_at` set | `order_flow.py` | 3961 | Inside order_delivered() |
| Food delivery driver acceptance | `order_flow.py` | 3567 | `POST /orders/{id}/assign-driver` |
| `driver_accepted_at` written | `order_flow.py` | 3639 | Inside assign_driver() |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Road miles calculation | Custom routing algorithm | `google_maps_service.get_traffic_eta()` returning `ETAResult.distance_miles` | Already integrated with Google Maps API + caching + haversine fallback |
| Haversine fallback | Custom math | `insurance.utils.haversine_miles()` | Already exists, tested, and used in insurance module |
| Push notifications | Custom FCM/APNs | `send_push_notification("driver", driver_id, ...)` from `order_flow.py:160` | Already handles iOS + Android, FCM + APNS, logging |
| Stripe driver payout | Custom payment routing | `stripe.Transfer.create()` (pattern from `bid_routes.py:2598`) | Already integrated with idempotency keys and error handling |
| Scheduler deduplication | New Redis lock | `_should_run_scheduler()` from `order_flow.py:2881` | Already handles Redis primary + fcntl fallback |
| Admin auth | Custom middleware | `require_admin` from `auth_utils.py` | Existing admin auth dependency |

---

## Common Pitfalls

### Pitfall 1: Missing driver GPS at bid acceptance time

**What goes wrong:** `prop22_acceptance_lat/lon` is null for rides because no driver GPS was captured at `matched_at`.
**Why it happens:** The `RideBid` model may not store driver GPS coordinates at bid-creation time. The spec says to set `prop22_acceptance_lat/lon` at `matched_at` — but driver GPS must come from somewhere.
**How to avoid:** Check `RideBid` model for driver GPS fields. If absent, use `ride_request.pickup_latitude/longitude` as a legally safe fallback (slightly overstates engaged miles, which is compliant per "false positives benefit drivers" principle). The spec's `calculate_prop22_ride_data()` reads `ride.prop22_acceptance_lat` — so the value must be set at acceptance time, not computed later.
**Warning signs:** All `prop22_acceptance_lat` values are null after first rides complete.

### Pitfall 2: `prop22_earning_periods.service_type` column

**What goes wrong:** The reconciliation job processes both rideshare AND food delivery drivers. Without a `service_type` column on `prop22_earning_periods`, the UI cannot distinguish a rideshare period from a food delivery period in the admin compliance table.
**Why it happens:** The approved spec's `prop22_earning_periods` table definition does not include a `service_type` column — it was designed primarily for rideshare. However, the ROADMAP requires food delivery too.
**How to avoid:** Add a `service_type` column (`VARCHAR`, values `"RIDESHARE"` or `"FOOD_DELIVERY"`) to `prop22_earning_periods` in the migration. The reconciliation job sets it when creating each period record. This is an **open question** — confirm with spec owner or default to adding the column.
**Warning signs:** Admin portal shows mixed rideshare/delivery periods with no way to distinguish.

### Pitfall 3: Double-insert on job retry

**What goes wrong:** If the reconciliation job crashes mid-run and is retried (or if two container workers somehow both acquire the lock), a second `prop22_earning_periods` row is created for the same `(driver_id, period_start)`.
**Why it happens:** APScheduler can retry failed jobs; Redis lock TTL may expire.
**How to avoid:** Two-layer protection as spec specifies: (1) `SELECT before INSERT` check for existing record, (2) `UniqueConstraint("driver_id", "period_start")` at DB level. Both must be implemented.
**Warning signs:** `IntegrityError` in logs on period boundary nights.

### Pitfall 4: UTC vs PT period boundaries

**What goes wrong:** A ride completed at 11:45 PM PT (= 7:45 AM UTC next day) is assigned to the wrong 14-day period.
**Why it happens:** Using `datetime.utcnow()` for period boundary comparisons instead of converting to PT.
**How to avoid:** All `matched_at` and `driver_accepted_at` comparisons in the reconciliation job must use `CA_TZ = ZoneInfo("America/Los_Angeles")`. Use `PERIOD_ANCHOR = datetime(2026, 1, 1, tzinfo=CA_TZ)` as the fixed reference point.
**Warning signs:** Period summaries show fractional ride counts or rides from wrong months.

### Pitfall 5: Ordering constraint race condition on migration

**What goes wrong:** Deploying new code before running the migration causes `AttributeError: 'RideRequest' object has no attribute 'prop22_acceptance_lat'`.
**Why it happens:** Code references new ORM columns before they exist in DB.
**How to avoid:** Strict deployment order: (1) run migration, (2) deploy code. The spec's Section 3.5 deployment ordering is correct. CI/CD pipeline must run `alembic upgrade head` as a pre-deploy step.
**Warning signs:** ECS task crashes immediately after deployment.

### Pitfall 6: Admin `send_admin_alert` function does not exist

**What goes wrong:** Calling `send_admin_alert()` in the `prop22_manual_review_escalation_job` causes `NameError`.
**Why it happens:** The spec's `send_admin_alert()` call is a pseudocode stub — no such function exists in the current codebase. A search for `send_admin_alert` returned no results.
**How to avoid:** In the escalation job, use `logger.warning()` for internal alerts instead of a non-existent function. The admin portal UI is the primary visibility mechanism for MANUAL_REVIEW records — the job only needs to set `status = "OVERDUE"` and log. If admin push notifications are needed, use `send_push_notification("driver", ...)` pattern adapted for an admin user ID, or skip the in-app notification and rely on the portal table.

---

## Code Examples

### Example 1: Migration — using existing `IF NOT EXISTS` pattern

```python
# Source: verified from alembic/versions/20260320_add_driver_cancel_tracking.py
def upgrade():
    # ride_requests — 5 new columns
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lat FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lon FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_hours FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_miles FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_floor_amount FLOAT")

    # orders — 5 new columns (same names, parallel structure)
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_acceptance_lat FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_acceptance_lon FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_engaged_hours FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_engaged_miles FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_floor_amount FLOAT")

    # CREATE TABLE prop22_config (single row expected)
    op.execute("""
        CREATE TABLE IF NOT EXISTS prop22_config (
            id SERIAL PRIMARY KEY,
            state VARCHAR(10) NOT NULL,
            effective_date DATE NOT NULL,
            min_wage_multiplier FLOAT NOT NULL,
            mile_rate FLOAT NOT NULL,
            healthcare_hours_threshold FLOAT DEFAULT 15.0,
            healthcare_stipend_weekly FLOAT DEFAULT 0.0
        )
    """)
    op.execute("""
        INSERT INTO prop22_config (state, effective_date, min_wage_multiplier, mile_rate)
        VALUES ('CA', '2026-01-01', 1.20, 0.37)
        ON CONFLICT DO NOTHING
    """)
    # ... CREATE TABLE prop22_city_wages with 5 seed rows ...
    # ... CREATE TABLE prop22_earning_periods with UniqueConstraint ...
    # ... CREATE TABLE prop22_earnings_statement ...
```

### Example 2: `road_miles()` helper (prop22_utils.py)

```python
# Source: spec design + verified from google_maps_service.py:74-99 and insurance/utils.py:6-46
from google_maps_service import get_traffic_eta_sync   # sync wrapper
from insurance.utils import haversine_miles

HAVERSINE_TO_ROAD_CORRECTION = 1.25  # Per spec: haversine × 1.25 as fallback

def road_miles(lat1: float, lon1: float, lat2: float, lon2: float, db=None) -> float:
    """
    Returns road-routed miles between two GPS points.
    Primary: Google Maps Directions API via get_traffic_eta_sync (returns ETAResult.distance_miles).
    Fallback: haversine_miles × 1.25 correction factor.
    Over-counts rather than under-counts — legally safer per Prop 22 spec.
    """
    try:
        result = get_traffic_eta_sync(lat1, lon1, lat2, lon2)
        if result and result.distance_miles > 0:
            return result.distance_miles
    except Exception:
        pass
    # Fallback: haversine × 1.25
    h = haversine_miles(lat1, lon1, lat2, lon2) or 0.0
    return h * HAVERSINE_TO_ROAD_CORRECTION
```

Note: `get_traffic_eta_sync` exists at `google_maps_service.py:209`. It calls `get_traffic_eta` synchronously. Verify the signature includes `origin_lat, origin_lng, dest_lat, dest_lng` before using.

### Example 3: `send_push_notification` signature (verified)

```python
# Source: order_flow.py:160
# import from bid_routes.py:40: from order_flow import send_push_notification
send_push_notification(
    user_type="driver",          # "driver", "customer", or "vendor"
    user_id=driver_id,           # int
    title="Prop 22 Top-Up: $X",  # str
    body="Your Prop 22 earnings top-up has been sent.",  # str
    data={"type": "prop22_topup", "period_id": period.id},  # dict
    db=db                        # Session
)
```

### Example 4: iOS Prop 22 section (SwiftUI pattern)

```swift
// Appended to PayoutDashboardView ScrollView VStack
// Source: existing summaryCard() and ridesList() patterns in PayoutDashboardView.swift
@ViewBuilder
private func prop22Section() -> some View {
    VStack(alignment: .leading, spacing: 12) {
        Text("Prop 22 Compliance")
            .font(.headline)
            .padding(.top, 8)

        if prop22Loading {
            ProgressView("Loading Prop 22 periods...")
        } else if let error = prop22Error {
            Text(error).foregroundColor(.red).font(.caption)
        } else if prop22Periods.isEmpty {
            Text("No Prop 22 periods yet.")
                .foregroundColor(.secondary)
                .font(.caption)
        } else {
            ForEach(prop22Periods) { period in
                prop22PeriodCard(period)
            }
        }
    }
    .onAppear { fetchProp22Periods() }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No Prop 22 tracking | Per-ride/order computation + 14-day reconciliation | Required for CA legal compliance |
| `pytz` timezone handling | `zoneinfo.ZoneInfo("America/Los_Angeles")` (Python 3.9+ stdlib) | Use `zoneinfo`, not pytz, in all new code |
| `haversine` only for distance | Road-routed miles with `haversine × 1.25` fallback | BPC §7463 engaged miles; haversine understates 20-40% in urban grids |

---

## Open Questions

1. **Driver GPS at bid acceptance time — where does it come from?**
   - What we know: `matched_at` is set at `bid_routes.py:714`. The spec says to capture driver GPS at this moment into `prop22_acceptance_lat/lon`.
   - What's unclear: `RideBid` may or may not have driver GPS fields stored at bid-creation time. If the bid was placed while the driver was at location X, but the customer accepts 10 minutes later, the current GPS may differ.
   - Recommendation: Check `RideBid` model fields for driver GPS. If absent (HIGH probability), use `ride_request.pickup_latitude/longitude` as fallback — it slightly overstates engaged miles, which is legally safer. Alternatively, require the iOS app to send driver GPS in the `POST /request/{id}/complete` body, but this is a larger change.

2. **`service_type` column on `prop22_earning_periods`?**
   - What we know: The approved spec does not include this column. The ROADMAP says both rideshare and food delivery are in scope.
   - What's unclear: Whether admin portal and iOS UI need to distinguish rideshare periods from food delivery periods.
   - Recommendation: Add `service_type VARCHAR(20)` to the migration. Values: `"RIDESHARE"` or `"FOOD_DELIVERY"`. Cost is one column; benefit is full auditability. Adding it later requires another migration.

3. **`get_traffic_eta_sync` function signature**
   - What we know: `get_traffic_eta_sync` exists at `google_maps_service.py:209`. `get_traffic_eta` is async and takes `origin_lat, origin_lng, dest_lat, dest_lng`.
   - What's unclear: Exact signature of `get_traffic_eta_sync` (may wrap async version with `asyncio.run()`).
   - Recommendation: Read `google_maps_service.py:209-230` before implementing `road_miles()`. If sync wrapper is not suitable for a sync context (scheduler job), use `haversine_miles × 1.25` as the primary for scheduler jobs, and call the Google Maps API only in the per-ride completion hook (which is in an async FastAPI context).

4. **Food delivery acceptance GPS — driver GPS vs vendor GPS**
   - What we know: `order.driver_accepted_at` is set at `order_flow.py:3639`. At this moment, the driver's GPS position should be captured into `Order.prop22_acceptance_lat/lon`.
   - What's unclear: Whether the `assign_driver` request body includes driver GPS coordinates.
   - Recommendation: Check `AssignDriverRequest` Pydantic model for GPS fields. If absent, use vendor GPS (`order.vendor.latitude/longitude` or pickup coordinates) as fallback.

---

## Sources

### Primary (HIGH confidence — directly read from source files)

- `docs/superpowers/specs/2026-03-24-prop22-driver-payout-design.md` — approved design spec Rev 3; all calculation logic, data models, API shapes
- `apps/web/p2p-platform/backend/models.py:1313-1408` — RideRequest model; verified all field names and line numbers
- `apps/web/p2p-platform/backend/models.py:416-521` — Order model; verified delivery_fee:438, tip:439, driver_accepted_at:511, delivered_at:493
- `apps/web/p2p-platform/backend/models.py:785-814` — Driver model; verified stripe_account_id:796, stripe_onboarded:797
- `apps/web/p2p-platform/backend/bid_routes.py:2499-2610` — complete_ride(); verified completion flow, matched_at:714, driver_payout:2538, stripe.Transfer.create:2598
- `apps/web/p2p-platform/backend/order_flow.py:3567-3660` — assign_driver(); verified driver_accepted_at:3639
- `apps/web/p2p-platform/backend/order_flow.py:3902-3961` — order_delivered(); verified completion hook
- `apps/web/p2p-platform/backend/order_flow.py:2881-2930` — `_should_run_scheduler()` file-lock pattern; verified Redis + fcntl dual strategy
- `apps/web/p2p-platform/backend/rideshare_payments.py:1-60` — platform fee tiers; verified Tier 1/2/3 structure
- `apps/web/p2p-platform/backend/google_maps_service.py:1-230` — verified get_traffic_eta_sync, haversine fallback, ETAResult structure
- `apps/web/p2p-platform/backend/insurance/utils.py:1-35` — verified haversine_miles() function signature
- `apps/web/p2p-platform/backend/alembic/versions/20260320_add_driver_cancel_tracking.py` — verified migration naming pattern and `ADD COLUMN IF NOT EXISTS` idiom
- `apps/ios/delivery/eatffairdelivery/Views/PayoutDashboardView.swift` — verified existing iOS structure, API call pattern, SecureStorage.shared.driverAccessToken, AppConfig.shared.p2pAPIBaseURL
- `apps/web/p2p-platform/frontend/src/App.tsx:230-260` — verified admin route structure, all existing routes
- `apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx:61-125` — verified sidebar navigation pattern and icon imports
- `apps/web/p2p-platform/frontend/src/app/screens/drivers/DriversAdmin.tsx:1-60` — verified Ant Design components used (Table, Tag, Tabs, Modal, Descriptions, Popconfirm)
- `.planning/ROADMAP.md:201-222` — verified Phase 13 goals, success criteria, and 6-plan structure

### Secondary (MEDIUM confidence — derived/inferred)

- California BPC §§7453-7454-7463 — cited in approved spec; not independently read but spec Rev 3 is treated as authoritative legal interpretation
- Prop 22 2026 wage rates ($16.90 CA statewide, $18.67 SF, $17.87 LA) — from approved spec seed data table; should be verified against official CA State Treasurer publication before migration

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified to exist in the codebase; no new dependencies
- Architecture patterns: HIGH — all hook locations verified by reading actual code at specified line numbers
- Data model fields: HIGH — every field name verified by reading models.py
- Pitfalls: HIGH — code-verified (send_admin_alert non-existence confirmed by grep returning empty)
- Open questions: MEDIUM — driver GPS availability at acceptance time not yet verified (requires reading RideBid model fully)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain; only risk is a schema change to models.py before planning completes)
