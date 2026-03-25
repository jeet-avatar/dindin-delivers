# Prop 22 Driver Earnings Floor — Design Spec

**Date:** 2026-03-24
**Status:** Approved (all 4 sections) — rev 3 (spec-review round 2 fixes applied)
**Scope:** California-only. Arizona and Texas have no equivalent gig worker earnings floor laws.

---

## Background

California Proposition 22 (Ballot Measure, Nov 2020; upheld May 2021) requires app-based transportation network companies to guarantee drivers a minimum earnings floor. The floor is calculated per 14-day period and any shortfall must be paid within the following period close.

**Governing statutes:**
- BPC §7453 — earnings floor formula, tips exclusion
- BPC §7454 — disclosure requirements, earnings statements
- BPC §7463 — definitions: "engaged time", "engaged miles"
- UCL (Business & Professions Code §17200) — 4-year statute of limitations, $2,500/violation civil penalty

---

## Section 1: Data Model

### 1.1 RideRequest additions

New columns added to the existing `RideRequest` model (`models.py`). Verified field context:
- `driver_payout = Column(Float)` at `models.py:1379` — comment confirms: `fare - $1` (tips NOT included)
- `tip_amount = Column(Float, default=0.0)` at `models.py:1388` — tip tracked separately; 100% to driver

```python
# Prop 22 — set at matched_at (driver acceptance)
prop22_acceptance_lat  = Column(Float, nullable=True)   # driver GPS lat at acceptance
prop22_acceptance_lon  = Column(Float, nullable=True)   # driver GPS lon at acceptance

# Prop 22 — set at ride completion
prop22_engaged_hours   = Column(Float, nullable=True)   # (completed_at - matched_at) in hours
prop22_engaged_miles   = Column(Float, nullable=True)   # acceptance GPS → dropoff (road miles)
prop22_floor_amount    = Column(Float, nullable=True)   # floor for this ride (per-ride disclosure)
```

**Why pre-compute `prop22_engaged_hours` and `prop22_floor_amount` per ride:**
- Reconciliation job sums pre-computed values, avoiding timestamp recalculation in the batch
- Per-ride `prop22_floor_amount` is needed for driver-facing disclosure (BPC §7454) and is the authoritative source for period-level floor (handles mid-period city wage changes — see Section 3.3)

### 1.2 New tables

#### `prop22_config`
Stores the legally mandated rates. Never hardcoded in application logic.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `state` | String | e.g., `"CA"` |
| `effective_date` | Date | Rate effective date |
| `min_wage_multiplier` | Float | 1.20 (BPC §7453(a)(1) — never changes) |
| `mile_rate` | Float | $0.37 (2026, CA State Treasurer) |
| `healthcare_hours_threshold` | Float | 15.0 hrs/week |
| `healthcare_stipend_weekly` | Float | Phase 2; set to 0 initially |

#### `prop22_city_wages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `city` | String | e.g., `"SAN_FRANCISCO"`, `"LOS_ANGELES"`, `"CA"` (statewide fallback) |
| `effective_date` | Date | When this wage takes effect |
| `min_wage` | Float | Dollar value |

**2026 seed data (must be present before first migration):**

| City | Date | Wage |
|------|------|------|
| `CA` (statewide) | 2026-01-01 | $16.90 |
| `SAN_FRANCISCO` | 2026-01-01 | $18.67 |
| `SAN_FRANCISCO` | 2026-07-01 | $19.61 |
| `LOS_ANGELES` | 2026-01-01 | $17.87 |
| `LOS_ANGELES` | 2026-07-01 | $18.42 |

The `CA` row is the statewide fallback. Startup assertion must verify `city = "CA"` row exists to prevent silent stale-literal fallback.

#### `prop22_earning_periods`

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `driver_id` | Integer FK → drivers | |
| `period_start` | DateTime | `America/Los_Angeles` midnight |
| `period_end` | DateTime | `America/Los_Angeles` midnight + 14 days |
| `status` | Enum | PENDING, RECONCILED, MANUAL_REVIEW, PAID, OVERDUE |
| `engaged_hours` | Float | Sum of `prop22_engaged_hours` for period's rides |
| `engaged_miles` | Float | Sum of `prop22_engaged_miles` for period's rides |
| `net_earnings` | Float | Sum of `driver_payout` (tips already excluded — see §2.3) |
| `prop22_floor` | Float | Sum of `prop22_floor_amount` per ride (handles mid-period wage changes) |
| `top_up_amount` | Float | `max(0, prop22_floor - net_earnings)` |
| `top_up_stripe_id` | String | nullable; Stripe Transfer ID or offline reference number |
| `deadline_at` | DateTime | Always set to next period close; shown in UI for MANUAL_REVIEW/OVERDUE only |
| `is_archived` | Boolean | Default False; never hard-delete (4-year UCL retention) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

**Unique constraint:** `UniqueConstraint("driver_id", "period_start", name="uq_prop22_period_driver_start")`

#### `prop22_earnings_statement`

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `driver_id` | Integer FK | |
| `period_id` | Integer FK → prop22_earning_periods | |
| `period_engaged_hours` | Float | This period only |
| `qtd_engaged_hours` | Float | Calendar quarter YTD — BPC §7454(b)(2) |
| `period_engaged_miles` | Float | |
| `net_earnings` | Float | Tips excluded (`driver_payout` sum) |
| `prop22_floor` | Float | |
| `top_up_amount` | Float | |
| `top_up_stripe_id` | String | nullable |
| `is_archived` | Boolean | Default False |
| `created_at` | DateTime | Statement creation = delivery timestamp per BPC §7454 |

**Note on statement delivery:** The persistent DB record satisfies BPC §7454(b)'s "provided" requirement. The push notification signals delivery. For push-disabled drivers, the operations team sends an email fallback with the statement data.

---

## Section 2: Calculation Logic

### 2.1 Per-ride floor calculation

Called at ride completion inside the existing completion flow (`bid_routes.py`):

```python
from zoneinfo import ZoneInfo
CA_TZ = ZoneInfo("America/Los_Angeles")

# California lat/lon bounding box
CA_LAT_MIN, CA_LAT_MAX = 32.5, 42.0
CA_LON_MIN, CA_LON_MAX = -124.5, -114.1
# Note: bounding box intentionally includes a thin strip of western NV/AZ near border.
# False positives (NV/AZ rides) are preferable to false negatives (missing CA rides).
# Over-application gives drivers more protection; under-application creates legal risk.

def is_in_california(lat: float, lon: float) -> bool:
    return (CA_LAT_MIN <= lat <= CA_LAT_MAX) and (CA_LON_MIN <= lon <= CA_LON_MAX)

def gps_to_city(lat: float, lon: float) -> str:
    """
    Determine prop22_city_wages city key from GPS coordinates.
    Uses per-city bounding boxes for wage lookup — NOT driver home city.
    BPC §7463: the applicable wage is for where the ride was accepted, not where the driver lives.
    """
    # San Francisco bounding box (city + county)
    if 37.63 <= lat <= 37.83 and -122.55 <= lon <= -122.35:
        return "SAN_FRANCISCO"
    # Los Angeles city limits (approximate)
    if 33.70 <= lat <= 34.33 and -118.67 <= lon <= -118.16:
        return "LOS_ANGELES"
    # Default to statewide CA rate
    return "CA"

def get_city_min_wage(db: Session, city: str, ride_date: date) -> float:
    """Finds the applicable wage for city on ride_date. Falls back to CA statewide."""
    for lookup_city in [city, "CA"]:
        row = (
            db.query(Prop22CityWage)
            .filter(
                Prop22CityWage.city == lookup_city,
                Prop22CityWage.effective_date <= ride_date
            )
            .order_by(Prop22CityWage.effective_date.desc())
            .first()
        )
        if row:
            return row.min_wage
    raise RuntimeError("prop22_city_wages has no CA statewide row — seed data missing")

def calculate_prop22_ride_data(ride: RideRequest, db: Session) -> dict | None:
    """
    BPC §7463: engaged time = matched_at → completed_at
               engaged miles = acceptance GPS position → dropoff
    Returns None if ride acceptance was not in California.
    """
    if not ride.prop22_acceptance_lat or not ride.prop22_acceptance_lon:
        return None
    if not is_in_california(ride.prop22_acceptance_lat, ride.prop22_acceptance_lon):
        return None

    # Engaged time
    engaged_seconds = (ride.completed_at - ride.matched_at).total_seconds()
    engaged_hours = engaged_seconds / 3600

    # Engaged miles — acceptance GPS → dropoff (road miles)
    # Road miles used because haversine understates by 20–40% in urban grids.
    # If routing API unavailable: fall back to haversine × 1.25 correction factor.
    engaged_miles = road_miles(
        ride.prop22_acceptance_lat, ride.prop22_acceptance_lon,
        ride.dropoff_lat, ride.dropoff_lon,
        db
    )

    # City wage from acceptance GPS (not driver home city)
    ride_date_pt = ride.completed_at.astimezone(CA_TZ).date()
    ride_city = gps_to_city(ride.prop22_acceptance_lat, ride.prop22_acceptance_lon)
    min_wage = get_city_min_wage(db, ride_city, ride_date_pt)

    config = (
        db.query(Prop22Config)
        .filter(Prop22Config.state == "CA", Prop22Config.effective_date <= ride_date_pt)
        .order_by(Prop22Config.effective_date.desc())
        .first()
    )

    floor_rate = min_wage * config.min_wage_multiplier  # 120% × local min wage
    floor_amount = (engaged_hours * floor_rate) + (engaged_miles * config.mile_rate)

    return {
        "prop22_engaged_hours": engaged_hours,
        "prop22_engaged_miles": engaged_miles,
        "prop22_floor_amount": floor_amount,
    }
```

### 2.2 Engaged miles — critical correction

BPC §7463: engaged miles begin at the driver's GPS position **at the moment of acceptance** (`matched_at`), not from physical pickup. Using pickup→dropoff understates engaged miles and is the primary source of Prop 22 class action exposure industry-wide.

**Implementation:** When `matched_at` fires in `bid_routes.py`, capture driver GPS into `RideRequest.prop22_acceptance_lat/lon`. Set once, never updated.

**Miles method:** Road-routed miles (not haversine). Temporary fallback: haversine × 1.25. This over-counts rather than under-counts, which is legally safer.

### 2.3 Tips exclusion

Per BPC §7453, tips cannot offset the earnings floor.

**Verified at `models.py:1379-1388`:**
- `driver_payout = Column(Float)` — `fare - $1` (tip NOT included)
- `tip_amount = Column(Float, default=0.0)` — tracked separately; 100% to driver

Therefore:
```python
# Correct — driver_payout already excludes tips
net_earnings = sum(r.driver_payout or 0 for r in rides)

# WRONG — would double-subtract tips
# net_earnings = sum((r.driver_payout or 0) - (r.tip_amount or 0) for r in rides)
```

---

## Section 3: Reconciliation Job

### 3.1 Period boundaries

```python
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta, date
CA_TZ = ZoneInfo("America/Los_Angeles")
PERIOD_ANCHOR = datetime(2026, 1, 1, tzinfo=CA_TZ)

def get_period_bounds_for_date(dt: datetime) -> tuple[datetime, datetime]:
    days_since_anchor = (dt - PERIOD_ANCHOR).days
    period_num = days_since_anchor // 14
    start = PERIOD_ANCHOR + timedelta(days=period_num * 14)
    return start, start + timedelta(days=14)

def get_previous_period_bounds() -> tuple[datetime, datetime]:
    now = datetime.now(CA_TZ)
    start, _ = get_period_bounds_for_date(now)
    return start - timedelta(days=14), start

def get_next_period_end(period_end: datetime) -> datetime:
    """Top-up deadline = close of next period."""
    return period_end + timedelta(days=14)
```

**Why PT not UTC:** A ride at 11:45 PM Sunday PT = 6:45 AM Monday UTC. UTC periods misassign Sunday rides to the wrong window.

### 3.2 QTD hours helper

```python
def get_qtd_engaged_hours(db: Session, driver_id: int, as_of: datetime) -> float:
    """California calendar quarter (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec)."""
    as_of_pt = as_of.astimezone(CA_TZ)
    quarter_start_month = ((as_of_pt.month - 1) // 3) * 3 + 1
    quarter_start = datetime(as_of_pt.year, quarter_start_month, 1, tzinfo=CA_TZ)

    rides = db.query(RideRequest).filter(
        RideRequest.driver_id == driver_id,
        RideRequest.matched_at >= quarter_start,
        RideRequest.matched_at < as_of,
        RideRequest.status == "completed",
        RideRequest.prop22_engaged_hours.isnot(None),  # NOTE: prop22_engaged_hours (not "engagement")
    ).all()
    return sum(r.prop22_engaged_hours for r in rides)
```

### 3.3 Main reconciliation job

Runs every midnight PT (APScheduler). Period-boundary guard prevents processing on non-boundary nights. Double-insert protection via `SELECT before INSERT` + unique constraint (two layers).

```python
@scheduler.scheduled_job("cron", hour=0, minute=0, timezone="America/Los_Angeles")
def prop22_period_reconciliation_job():
    lock_path = "/tmp/prop22_reconciliation.lock"
    # ... acquire file lock (same pattern as order_flow.py:2881) ...

    now = datetime.now(CA_TZ)
    prev_start, prev_end = get_previous_period_bounds()

    # Period-boundary guard: only process on the 14th-day midnight
    if now.date() != prev_end.date():
        return

    db = SessionLocal()
    try:
        # Collect drivers with CA-accepted rides in this period
        # Filter by GPS bounds — NOT Driver.state (BPC §7463: acceptance location governs)
        ca_driver_ids = (
            db.query(RideRequest.driver_id)
            .filter(
                RideRequest.matched_at >= prev_start,
                RideRequest.matched_at < prev_end,
                RideRequest.status == "completed",
                RideRequest.prop22_acceptance_lat.isnot(None),
                RideRequest.prop22_acceptance_lat.between(CA_LAT_MIN, CA_LAT_MAX),
                RideRequest.prop22_acceptance_lon.between(CA_LON_MIN, CA_LON_MAX),
            )
            .distinct()
            .all()
        )

        for (driver_id,) in ca_driver_ids:
            # Double-insert guard: skip if already processed (job retry safety)
            existing = db.query(Prop22EarningPeriod).filter_by(
                driver_id=driver_id, period_start=prev_start
            ).first()
            if existing:
                continue

            rides = db.query(RideRequest).filter(
                RideRequest.driver_id == driver_id,
                RideRequest.matched_at >= prev_start,
                RideRequest.matched_at < prev_end,
                RideRequest.status == "completed",
                RideRequest.prop22_acceptance_lat.between(CA_LAT_MIN, CA_LAT_MAX),
                RideRequest.prop22_acceptance_lon.between(CA_LON_MIN, CA_LON_MAX),
            ).all()

            engaged_hours = sum(r.prop22_engaged_hours or 0 for r in rides)
            engaged_miles = sum(r.prop22_engaged_miles or 0 for r in rides)

            # Tips excluded: driver_payout is fare - $1, tip_amount is separate (models.py:1379-1388)
            net_earnings = sum(r.driver_payout or 0 for r in rides)

            # Period floor = sum of per-ride floors
            # This correctly handles mid-period city wage changes (e.g., SF Jul 1 increase)
            # because each ride's floor was computed at completion using the correct date's wage.
            prop22_floor = sum(r.prop22_floor_amount or 0 for r in rides)

            top_up = max(0.0, prop22_floor - net_earnings)
            qtd_hours = get_qtd_engaged_hours(db, driver_id, prev_end)
            driver = db.query(Driver).filter(Driver.id == driver_id).first()

            period = Prop22EarningPeriod(
                driver_id=driver_id,
                period_start=prev_start,
                period_end=prev_end,
                engaged_hours=engaged_hours,
                engaged_miles=engaged_miles,
                net_earnings=net_earnings,
                prop22_floor=prop22_floor,
                top_up_amount=top_up,
                status="PENDING",
                deadline_at=get_next_period_end(prev_end),
            )
            db.add(period)
            db.flush()  # get period.id

            statement = Prop22EarningsStatement(
                driver_id=driver_id,
                period_id=period.id,
                period_engaged_hours=engaged_hours,
                qtd_engaged_hours=qtd_hours,
                period_engaged_miles=engaged_miles,
                net_earnings=net_earnings,
                prop22_floor=prop22_floor,
                top_up_amount=top_up,
            )
            db.add(statement)

            if top_up <= 0:
                period.status = "RECONCILED"
                send_push_notification("driver", driver_id,
                    "Prop 22 — No Top-Up Needed",
                    f"Your earnings of ${net_earnings:.2f} exceeded the ${prop22_floor:.2f} floor.",
                    {"type": "prop22_statement", "period_id": period.id}, db)
            elif driver.stripe_onboarded:
                try:
                    transfer = stripe.Transfer.create(
                        amount=int(top_up * 100),
                        currency="usd",
                        destination=driver.stripe_account_id,
                        idempotency_key=f"prop22_topup_{driver_id}_{period.id}",
                    )
                    period.top_up_stripe_id = transfer.id
                    period.status = "PAID"
                    send_push_notification("driver", driver_id,
                        f"Prop 22 Top-Up: ${top_up:.2f}",
                        "Your Prop 22 earnings top-up has been sent.",
                        {"type": "prop22_topup", "period_id": period.id}, db)
                except stripe.error.StripeError:
                    period.status = "MANUAL_REVIEW"
            else:
                period.status = "MANUAL_REVIEW"

            db.commit()  # commit per driver — limits blast radius of single-driver failure

    finally:
        db.close()
        # release lock
```

**Key changes from naive implementation:**
- `SELECT before INSERT` check prevents double-period rows even if unique constraint is bypassed by race
- `prop22_floor = sum(r.prop22_floor_amount)` — uses per-ride pre-computed values, handling July 1 mid-period wage changes correctly
- `db.commit()` per driver (not per batch) — a single driver's Stripe failure doesn't roll back others

### 3.4 Manual review escalation job

```python
@scheduler.scheduled_job("cron", hour=9, minute=0, timezone="America/Los_Angeles")
def prop22_manual_review_escalation_job():
    db = SessionLocal()
    now = datetime.now(CA_TZ)
    try:
        pending = db.query(Prop22EarningPeriod).filter(
            Prop22EarningPeriod.status == "MANUAL_REVIEW"
        ).all()

        for p in pending:
            days_remaining = (p.deadline_at - now).days
            if days_remaining < 0:
                p.status = "OVERDUE"
                # Log for legal review — each unresolved OVERDUE = UCL violation risk ($2,500)
                # Ops SLA: process within 48h via offline ACH/check
            elif days_remaining <= 3:
                # Send admin portal notification (internal alert, not driver-facing)
                # Mechanism: POST to admin notification table (same pattern as existing admin alerts)
                send_admin_alert(
                    title=f"Prop 22 Deadline Approaching: Driver {p.driver_id}",
                    body=f"Top-up of ${p.top_up_amount:.2f} due in {days_remaining} day(s).",
                    data={"type": "prop22_deadline", "period_id": p.id}
                )
        db.commit()
    finally:
        db.close()
```

**Offline payment SLA:** OVERDUE status means top-up owed now. Operations team must process via ACH or check within 48 hours. Admin portal "Mark Paid Externally" button stores a `reference_number` in `top_up_stripe_id` — this serves as the BPC §7454 payment record.

### 3.5 Migration and deployment ordering

**New Alembic migration** (single file, applied before code deploy):
1. `ALTER TABLE ride_requests` — add 5 new columns
2. `CREATE TABLE prop22_config` — with initial row
3. `CREATE TABLE prop22_city_wages` — with 2026 seed data (all 5 rows)
4. `CREATE TABLE prop22_earning_periods` — with unique constraint
5. `CREATE TABLE prop22_earnings_statement`

**Deployment order:**
1. Apply migration → old code runs on new schema (new nullable columns ignored)
2. Deploy new code → rides now populate `prop22_acceptance_lat/lon` and `prop22_floor_amount`
3. First reconciliation job runs at next period boundary

Rides completed in the window between migration and code deploy will have `prop22_*` columns null. The reconciliation job skips these rides (their `prop22_floor_amount` is null, summing as 0). These rides are pre-deployment and excluded from Prop 22 calculations — acceptable for the first partial period.

---

## Section 4: UI Design

### 4A — iOS Driver App: `PayoutDashboardView.swift`

New "Prop 22 Compliance" section below existing earnings summary.

**Per-period card fields:**

| Display Label | Source | Notes |
|---------------|--------|-------|
| Period dates | `prop22_earning_periods.period_start/end` | Rendered in PT |
| Engaged Hours | `prop22_earning_periods.engaged_hours` | |
| Engaged Miles | `prop22_earning_periods.engaged_miles` | |
| Earnings Floor | `prop22_earning_periods.prop22_floor` | |
| Your Earnings | `prop22_earning_periods.net_earnings` | |
| Top-Up Paid/Owed | `prop22_earning_periods.top_up_amount` | |
| Payment by | `prop22_earning_periods.deadline_at` | Only shown for MANUAL_REVIEW and OVERDUE |

**Status badge mapping:**

| `status` | Badge |
|----------|-------|
| `PENDING` | ⏳ Calculating |
| `RECONCILED` | ✅ No top-up needed |
| `PAID` | ✅ Paid |
| `MANUAL_REVIEW` | ⚠️ Review (shows deadline) |
| `OVERDUE` | 🔴 Overdue |

**Per-ride disclosure** (inside existing ride history card, tap to expand):
- `prop22_floor_amount: null` → render "—" (pre-deployment ride)
- `prop22_floor_amount: 0.0` → render "$0.00" (cancelled ride, no floor owed)
- `prop22_floor_amount: 14.83` → render "$14.83"

**QTD hours** shown in statement detail view (tap into a period card):
- Source: `prop22_earnings_statement.qtd_engaged_hours`
- Required by BPC §7454(b)(2)

**New API endpoints:**

`GET /api/driver/prop22/periods` — returns all periods for the authenticated driver, most recent first:
```json
[{
  "id": 1,
  "period_start": "2026-01-01T00:00:00-08:00",
  "period_end": "2026-01-15T00:00:00-08:00",
  "status": "PAID",
  "engaged_hours": 12.4,
  "engaged_miles": 187.2,
  "net_earnings": 312.40,
  "prop22_floor": 279.55,
  "top_up_amount": 0.0,
  "deadline_at": "2026-01-29T00:00:00-08:00",
  "qtd_engaged_hours": 12.4
}]
```

`deadline_at` is always populated (set to next period close even for RECONCILED/PAID). iOS shows it only for `MANUAL_REVIEW` and `OVERDUE` statuses. `qtd_engaged_hours` is fetched via JOIN to `prop22_earnings_statement` on `period_id`.

`GET /api/driver/prop22/periods/{period_id}/rides` — rides for the period with floor data:
```json
[{
  "ride_id": 42,
  "completed_at": "2026-01-03T14:22:00-08:00",
  "prop22_engaged_hours": 0.48,
  "prop22_engaged_miles": 4.2,
  "prop22_floor_amount": 14.83
}]
```

`prop22_floor_amount` is `float | null`. iOS null check: if null → "—", if 0.0 → "$0.00", else render dollar value.

### 4B — Admin Portal: `/admin/prop22`

**Compliance table** — all CA drivers with Prop 22 periods:

| Column | Source |
|--------|--------|
| Driver name | `Driver.first_name + last_name` (verify line in models.py before implementing) |
| Period | `prop22_earning_periods.period_start/end` |
| Engaged Hrs | `prop22_earning_periods.engaged_hours` |
| Engaged Miles | `prop22_earning_periods.engaged_miles` |
| Floor | `prop22_earning_periods.prop22_floor` |
| Earned | `prop22_earning_periods.net_earnings` |
| Top-Up | `prop22_earning_periods.top_up_amount` |
| Status | `prop22_earning_periods.status` |
| Due | `prop22_earning_periods.deadline_at` |
| Stripe Onboarded | `Driver.stripe_onboarded` (`models.py:797`) |

**MANUAL_REVIEW queue** (dedicated tab, sorted by `deadline_at` ASC):
- OVERDUE records shown in red with elapsed-since-deadline timestamp
- Action buttons: `Manual Top-Up via ACH`, `Mark Paid Externally`, `View Statement`

**Manual top-up trigger:**
- Endpoint: `POST /api/admin/prop22/manual-topup`
- Body: `{ driver_id, period_id, amount, method: "ACH" | "CHECK" | "STRIPE", reference_number }`
- `reference_number` stored in `top_up_stripe_id` — satisfies BPC §7454 audit requirement

**New admin API endpoints:**
- `GET /api/admin/prop22/periods` — all periods with driver info, paginated
- `POST /api/admin/prop22/manual-topup` — record manual payment, update period status to PAID

---

## Implementation Notes

### Record retention
All `prop22_earning_periods` and `prop22_earnings_statement` rows: retain 4 years (UCL SOL). Use `is_archived = True` flag only — never `DELETE`.

### Healthcare stipend (Phase 2)
Legally required per BPC §7453(b) for drivers averaging ≥15 hrs/week. Deferred from Phase 1 only if no CA driver crosses the threshold in Q1. QTD tracking exists from day one via `prop22_earnings_statement.qtd_engaged_hours`.

### Cancellation edge cases
- Driver cancels before pickup: all `prop22_*` columns = 0/null — no floor for this ride
- Customer no-show: `prop22_engaged_hours` = acceptance → cancellation time; `prop22_engaged_miles` = road miles from acceptance GPS to the driver's location at cancellation (not 0, unless driver did not move). If driver location at cancellation is unavailable, use acceptance location → engaged miles = 0.
- Ride cancelled after pickup started: use `cancelled_at` as end time

### State detection
Prop 22 applies based on acceptance GPS, not `Driver.state`. Bounding box intentionally includes thin NV/AZ border areas — false positives benefit drivers; false negatives create legal risk.

### Existing infrastructure reuse
- `stripe.Transfer.create()` — `bid_routes.py:2593`
- APScheduler + file-lock guard — `order_flow.py:2881`
- `send_push_notification("driver", driver_id, ...)` — confirmed signature
- `Driver.stripe_account_id` + `Driver.stripe_onboarded` — `models.py:796-797`

---

## Out of Scope (Phase 1)

- **Android driver app** — iOS only; Android parity in follow-on task
- **Healthcare stipend** — deferred to Phase 2; config fields present from day one
- **Arizona / Texas** — no equivalent laws
- **Offline ACH/check disbursement** — MANUAL_REVIEW handled offline via ops team; "Mark Paid Externally" button with reference_number is the official record

---

*Spec written: 2026-03-24 | Rev 3: spec-review round 2 fixes applied*
*tips exclusion verified: `models.py:1379-1388` — `driver_payout = fare - $1` (tip not included)*
