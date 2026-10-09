"""Query helpers for the Crum & Forster TNC insurance report (Wave 3).

These functions aggregate InsuranceEvent (UBI period mileage/time) and RideRequest
(trip + financial) data for a date range and optional operating state. State is resolved
through the Driver row (InsuranceEvent.driver_id / RideRequest.matched_driver_id -> Driver.state),
since neither InsuranceEvent nor RideRequest stores a state column directly.

All helpers are read-only and defensive — they must never raise into a report endpoint.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from insurance.models import InsuranceEvent
from models import Driver, Prop22EarningPeriod, RideRequest, RideRequestStatus

# UBI insurance periods (CA TNC):
#   P1 = app on, no match (available)   P2 = en route to pickup   P3 = passenger on board
_PERIODS = (1, 2, 3)


def _parse_dt(value) -> Optional[datetime]:
    """Accept a datetime, an ISO 8601 string, or None."""
    if value is None or isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def period_mileage_totals(
    db: Session,
    from_date=None,
    to_date=None,
    state: Optional[str] = None,
) -> dict:
    """Miles and hours by UBI period (P1/P2/P3).

    Segment stats are written on ``period_end`` InsuranceEvent rows, so we aggregate those.
    Returns {"1": {...}, "2": {...}, "3": {...}} plus totals.
    """
    q = db.query(InsuranceEvent).filter(InsuranceEvent.event_type == "period_end")

    fd, td = _parse_dt(from_date), _parse_dt(to_date)
    if fd:
        q = q.filter(InsuranceEvent.timestamp >= fd)
    if td:
        q = q.filter(InsuranceEvent.timestamp <= td)
    if state:
        q = q.join(Driver, Driver.id == InsuranceEvent.driver_id).filter(Driver.state == state)

    by_period = {str(p): {"miles": 0.0, "hours": 0.0, "events": 0} for p in _PERIODS}
    total_miles = 0.0
    total_seconds = 0

    for e in q.all():
        key = str(e.period)
        if key not in by_period:
            by_period[key] = {"miles": 0.0, "hours": 0.0, "events": 0}
        miles = float(e.segment_miles or 0.0)
        secs = int(e.segment_duration_seconds or 0)
        by_period[key]["miles"] += miles
        by_period[key]["hours"] += secs / 3600.0
        by_period[key]["events"] += 1
        total_miles += miles
        total_seconds += secs

    for key in by_period:
        by_period[key]["miles"] = round(by_period[key]["miles"], 4)
        by_period[key]["hours"] = round(by_period[key]["hours"], 4)

    return {
        "by_period": by_period,
        "total_miles": round(total_miles, 4),
        "total_hours": round(total_seconds / 3600.0, 4),
    }


def trip_driver_counts(
    db: Session,
    from_date=None,
    to_date=None,
    state: Optional[str] = None,
) -> dict:
    """Completed trip count and unique driver count for the period."""
    q = db.query(RideRequest).filter(RideRequest.status == RideRequestStatus.COMPLETED)

    fd, td = _parse_dt(from_date), _parse_dt(to_date)
    if fd:
        q = q.filter(RideRequest.completed_at >= fd)
    if td:
        q = q.filter(RideRequest.completed_at <= td)
    if state:
        q = q.join(Driver, Driver.id == RideRequest.matched_driver_id).filter(Driver.state == state)

    rides = q.all()
    driver_ids = {r.matched_driver_id for r in rides if r.matched_driver_id is not None}
    customer_ids = {r.customer_id for r in rides if r.customer_id is not None}
    return {
        "total_trips": len(rides),
        "unique_drivers": len(driver_ids),
        "unique_customers": len(customer_ids),
    }


def financial_allocation(
    db: Session,
    from_date=None,
    to_date=None,
    state: Optional[str] = None,
) -> dict:
    """Gross/revenue/cost allocation for the period.

    - gross_final_price:         Σ RideRequest.final_price
    - platform_fee_revenue:      Σ RideRequest.platform_fee
    - tips:                      Σ RideRequest.tip_amount
    - access_for_all_collected:  Σ RideRequest.access_for_all_fee
    - prop22_topups:             Σ Prop22EarningPeriod.top_up_amount (paid/reconciled periods)
    - driver_cost:               Σ driver_payout + tips + prop22 top-ups
    """
    q = db.query(RideRequest).filter(RideRequest.status == RideRequestStatus.COMPLETED)

    fd, td = _parse_dt(from_date), _parse_dt(to_date)
    if fd:
        q = q.filter(RideRequest.completed_at >= fd)
    if td:
        q = q.filter(RideRequest.completed_at <= td)
    if state:
        q = q.join(Driver, Driver.id == RideRequest.matched_driver_id).filter(Driver.state == state)

    gross = platform_fee = tips = access = driver_payout = 0.0
    for r in q.all():
        gross += float(r.final_price or 0.0)
        platform_fee += float(r.platform_fee or 0.0)
        tips += float(r.tip_amount or 0.0)
        access += float(r.access_for_all_fee or 0.0)
        driver_payout += float(r.driver_payout or 0.0)

    # Prop 22 top-ups for the same window (period model is independent of RideRequest).
    pq = db.query(Prop22EarningPeriod).filter(
        Prop22EarningPeriod.status.in_(("PAID", "RECONCILED"))
    )
    if fd:
        pq = pq.filter(Prop22EarningPeriod.period_end >= fd)
    if td:
        pq = pq.filter(Prop22EarningPeriod.period_end <= td)
    if state:
        pq = pq.join(Driver, Driver.id == Prop22EarningPeriod.driver_id).filter(Driver.state == state)
    prop22_topups = sum(float(p.top_up_amount or 0.0) for p in pq.all())

    driver_cost = driver_payout + tips + prop22_topups

    return {
        "gross_final_price": round(gross, 2),
        "platform_fee_revenue": round(platform_fee, 2),
        "tips": round(tips, 2),
        "access_for_all_collected": round(access, 2),
        "prop22_topups": round(prop22_topups, 2),
        "driver_payout": round(driver_payout, 2),
        "driver_cost": round(driver_cost, 2),
    }


def _age_from_dob(dob: Optional[str], as_of: datetime) -> Optional[int]:
    """Driver.date_of_birth is a 'YYYY-MM-DD' string. Return integer age, or None."""
    if not dob:
        return None
    parsed = _parse_dt(dob)
    if parsed is None:
        # Fall back to parsing just the year.
        try:
            parsed = datetime(int(str(dob)[:4]), 1, 1)
        except (ValueError, TypeError):
            return None
    age = as_of.year - parsed.year - ((as_of.month, as_of.day) < (parsed.month, parsed.day))
    return age if 0 <= age < 120 else None


def age_distribution(
    db: Session,
    state: Optional[str] = None,
    as_of: Optional[datetime] = None,
) -> dict:
    """Driver DOB buckets: 18-20 / 21-24 / 25-44 / 45-64 / 65+ (+ unknown)."""
    as_of = as_of or datetime.utcnow()
    q = db.query(Driver)
    if state:
        q = q.filter(Driver.state == state)

    buckets = {"18-20": 0, "21-24": 0, "25-44": 0, "45-64": 0, "65+": 0, "unknown": 0}
    for d in q.all():
        age = _age_from_dob(getattr(d, "date_of_birth", None), as_of)
        if age is None or age < 18:
            buckets["unknown"] += 1
        elif age <= 20:
            buckets["18-20"] += 1
        elif age <= 24:
            buckets["21-24"] += 1
        elif age <= 44:
            buckets["25-44"] += 1
        elif age <= 64:
            buckets["45-64"] += 1
        else:
            buckets["65+"] += 1
    return buckets


def build_cf_tnc_report(
    db: Session,
    from_date=None,
    to_date=None,
    state: Optional[str] = None,
) -> dict:
    """Assemble the full Crum & Forster TNC report payload."""
    return {
        "report": {
            "title": "Crum & Forster TNC Usage-Based Insurance Report",
            "tnc_operator": "Zietra Technologies inc (dba Dollor.ai)",
            "permit_number": "TNC0050982-N",
            "from_date": str(from_date) if from_date else None,
            "to_date": str(to_date) if to_date else None,
            "state": state,
            "generated_at": datetime.utcnow().isoformat(),
        },
        "mileage_by_period": period_mileage_totals(db, from_date, to_date, state),
        "trips_and_drivers": trip_driver_counts(db, from_date, to_date, state),
        "financial_allocation": financial_allocation(db, from_date, to_date, state),
        "driver_age_distribution": age_distribution(db, state),
    }
