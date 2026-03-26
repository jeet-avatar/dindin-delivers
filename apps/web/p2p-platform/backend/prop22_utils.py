"""
Prop 22 (California BPC §§7453-7463) calculation utilities.

All public functions are imported by bid_routes.py and order_flow.py at completion hooks.
The reconciliation job (plan 03) uses get_period_bounds_for_date(),
get_previous_period_bounds(), and get_qtd_engaged_hours().
"""
import logging
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Module-level import so tests can patch prop22_utils.get_traffic_eta_sync
try:
    from google_maps_service import get_traffic_eta_sync
except ImportError:
    get_traffic_eta_sync = None  # type: ignore[assignment]

CA_TZ = ZoneInfo("America/Los_Angeles")

# California GPS bounding box — intentionally generous at NV/AZ borders.
# BPC §7463: law applies based on acceptance location, not driver home state.
# False positives (NV/AZ drivers near border) benefit drivers; false negatives create legal risk.
CA_LAT_MIN, CA_LAT_MAX = 32.5, 42.0
CA_LON_MIN, CA_LON_MAX = -124.5, -114.1

# Period anchor: Jan 1, 2026 PT midnight = first period boundary
PERIOD_ANCHOR = datetime(2026, 1, 1, tzinfo=CA_TZ)

# Road-miles correction factor: haversine understates by 20-40% in urban grids
HAVERSINE_TO_ROAD_CORRECTION = 1.25


def is_in_california(lat: float, lon: float) -> bool:
    """Returns True if GPS coordinates are within California bounding box."""
    return (CA_LAT_MIN <= lat <= CA_LAT_MAX) and (CA_LON_MIN <= lon <= CA_LON_MAX)


def gps_to_city(lat: float, lon: float) -> str:
    """
    Map GPS coordinates to a prop22_city_wages city key.
    BPC §7463: applicable wage is determined by where the ride was ACCEPTED, not driver home city.
    """
    # San Francisco city + county bounding box
    if 37.63 <= lat <= 37.83 and -122.55 <= lon <= -122.35:
        return "SAN_FRANCISCO"
    # Los Angeles city limits (approximate)
    if 33.70 <= lat <= 34.33 and -118.67 <= lon <= -118.16:
        return "LOS_ANGELES"
    # Default to statewide CA rate
    return "CA"


def get_city_min_wage(db: Session, city: str, ride_date: date) -> float:
    """
    Returns the applicable minimum wage for city on ride_date.
    Falls back to statewide CA rate if city-specific row not found.
    Raises RuntimeError if CA statewide row is missing (seed data required).
    """
    from models import Prop22CityWage  # lazy import avoids circular dependency

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

    raise RuntimeError(
        "prop22_city_wages has no CA statewide row — seed data missing. "
        "Run: alembic upgrade head"
    )


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Module-level wrapper so tests can patch prop22_utils.haversine_miles.
    Delegates to insurance.utils.haversine_miles.
    """
    from insurance.utils import haversine_miles as _haversine
    return _haversine(lat1, lon1, lat2, lon2)


def road_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns road-routed miles between two GPS coordinates.
    Primary: Google Maps Directions API via get_traffic_eta_sync.
    Fallback: haversine x 1.25 correction factor (over-counts, legally safer).

    NOTE: get_traffic_eta_sync uses origin_lng (not origin_lon) — see google_maps_service.py:209.
    """
    try:
        if get_traffic_eta_sync is not None:
            result = get_traffic_eta_sync(lat1, lon1, lat2, lon2)
            if result and hasattr(result, "distance_miles") and result.distance_miles > 0:
                return result.distance_miles
    except Exception as e:
        logger.debug(f"road_miles: Google Maps unavailable, using haversine fallback: {e}")

    h = haversine_miles(lat1, lon1, lat2, lon2) or 0.0
    return h * HAVERSINE_TO_ROAD_CORRECTION


def calculate_prop22_ride_data(ride, db: Session) -> dict | None:
    """
    Compute Prop 22 fields for a completed rideshare ride.
    Called at ride completion (bid_routes.py), after driver_payout is set.
    Returns None if ride was not accepted in California.

    BPC §7463:
    - engaged_hours = matched_at -> completed_at
    - engaged_miles = acceptance GPS position -> dropoff (road miles)
    - floor = (engaged_hours x 120% x local_min_wage) + (engaged_miles x $0.37)
    """
    from models import Prop22Config

    # GPS check: only CA-accepted rides qualify
    lat = ride.prop22_acceptance_lat
    lon = ride.prop22_acceptance_lon
    if lat is None or lon is None:
        return None
    if not is_in_california(lat, lon):
        return None

    # Engaged time: matched_at -> completed_at (both stored as UTC in DB)
    if not ride.matched_at or not ride.completed_at:
        return None
    engaged_seconds = (ride.completed_at - ride.matched_at).total_seconds()
    if engaged_seconds <= 0:
        return None
    engaged_hours = engaged_seconds / 3600.0

    # Engaged miles: acceptance GPS -> dropoff (models.py:1335-1336 is pickup — dropoff is separate)
    if ride.dropoff_latitude is None or ride.dropoff_longitude is None:
        return None
    engaged_miles = road_miles(lat, lon, ride.dropoff_latitude, ride.dropoff_longitude)

    # City wage: from acceptance GPS (NOT driver home city)
    ride_date_pt = ride.completed_at.astimezone(CA_TZ).date()
    city = gps_to_city(lat, lon)
    try:
        min_wage = get_city_min_wage(db, city, ride_date_pt)
    except RuntimeError:
        logger.error("Prop 22: city wages seed missing — cannot compute floor")
        return None

    config = (
        db.query(Prop22Config)
        .filter(
            Prop22Config.state == "CA",
            Prop22Config.effective_date <= ride_date_pt
        )
        .order_by(Prop22Config.effective_date.desc())
        .first()
    )
    if not config:
        logger.error("Prop 22: prop22_config missing CA row")
        return None

    floor_rate = min_wage * config.min_wage_multiplier  # e.g., $18.67 x 1.20 = $22.40/hr
    floor_amount = (engaged_hours * floor_rate) + (engaged_miles * config.mile_rate)

    return {
        "prop22_engaged_hours": engaged_hours,
        "prop22_engaged_miles": engaged_miles,
        "prop22_floor_amount": floor_amount,
    }


def calculate_prop22_order_data(order, db: Session) -> dict | None:
    """
    Compute Prop 22 fields for a completed food delivery order.
    Called at order completion (order_flow.py), after delivered_at is set.
    Returns None if order was not accepted in California.

    Engaged time: driver_accepted_at -> delivered_at
    Engaged miles: prop22_acceptance_lat/lon -> Order.delivery_latitude/longitude (models.py:457-458)
    Net earnings: Order.delivery_fee (models.py:439) — tip (models.py:440) is EXCLUDED per BPC §7453
    """
    from models import Prop22Config

    lat = order.prop22_acceptance_lat
    lon = order.prop22_acceptance_lon
    if lat is None or lon is None:
        return None
    if not is_in_california(lat, lon):
        return None

    if not order.driver_accepted_at or not order.delivered_at:
        return None
    engaged_seconds = (order.delivered_at - order.driver_accepted_at).total_seconds()
    if engaged_seconds <= 0:
        return None
    engaged_hours = engaged_seconds / 3600.0

    # Engaged miles: acceptance GPS -> delivery address (Order.delivery_latitude/longitude)
    if order.delivery_latitude is None or order.delivery_longitude is None:
        return None
    engaged_miles = road_miles(lat, lon, order.delivery_latitude, order.delivery_longitude)

    delivery_date_pt = order.delivered_at.astimezone(CA_TZ).date()
    city = gps_to_city(lat, lon)
    try:
        min_wage = get_city_min_wage(db, city, delivery_date_pt)
    except RuntimeError:
        logger.error("Prop 22 order: city wages seed missing")
        return None

    config = (
        db.query(Prop22Config)
        .filter(
            Prop22Config.state == "CA",
            Prop22Config.effective_date <= delivery_date_pt
        )
        .order_by(Prop22Config.effective_date.desc())
        .first()
    )
    if not config:
        return None

    floor_rate = min_wage * config.min_wage_multiplier
    floor_amount = (engaged_hours * floor_rate) + (engaged_miles * config.mile_rate)

    return {
        "prop22_engaged_hours": engaged_hours,
        "prop22_engaged_miles": engaged_miles,
        "prop22_floor_amount": floor_amount,
    }


def get_period_bounds_for_date(dt: datetime) -> tuple[datetime, datetime]:
    """
    Returns (period_start, period_end) for the 14-day period containing dt.
    PERIOD_ANCHOR = Jan 1, 2026 PT midnight. All boundaries are PT midnight.
    """
    # Ensure dt is PT-aware for correct period calculation
    dt_pt = dt.astimezone(CA_TZ)
    days_since_anchor = (dt_pt - PERIOD_ANCHOR).days
    period_num = days_since_anchor // 14
    start = PERIOD_ANCHOR + timedelta(days=period_num * 14)
    return start, start + timedelta(days=14)


def get_previous_period_bounds() -> tuple[datetime, datetime]:
    """Returns (start, end) of the period that just closed (yesterday's period)."""
    now = datetime.now(CA_TZ)
    start, _ = get_period_bounds_for_date(now)
    return start - timedelta(days=14), start


def get_next_period_end(period_end: datetime) -> datetime:
    """Returns the deadline for top-up: close of the NEXT period after period_end."""
    return period_end + timedelta(days=14)


def get_qtd_engaged_hours(db: Session, driver_id: int, as_of: datetime) -> float:
    """
    Returns calendar-quarter-to-date engaged hours for the driver.
    BPC §7454(b)(2): earnings statement must include QTD hours.
    Quarter = CA calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec) in PT.
    Queries BOTH RideRequest AND Order prop22_engaged_hours.
    """
    from models import RideRequest, Order

    as_of_pt = as_of.astimezone(CA_TZ)
    quarter_start_month = ((as_of_pt.month - 1) // 3) * 3 + 1
    quarter_start = datetime(as_of_pt.year, quarter_start_month, 1, tzinfo=CA_TZ)

    rideshare_rides = (
        db.query(RideRequest)
        .filter(
            RideRequest.driver_id == driver_id,
            RideRequest.matched_at >= quarter_start,
            RideRequest.matched_at < as_of,
            RideRequest.status == "completed",
            RideRequest.prop22_engaged_hours.isnot(None),
        )
        .all()
    )
    food_orders = (
        db.query(Order)
        .filter(
            Order.driver_id == driver_id,
            Order.driver_accepted_at >= quarter_start,
            Order.driver_accepted_at < as_of,
            Order.prop22_engaged_hours.isnot(None),
        )
        .all()
    )
    total = sum(r.prop22_engaged_hours for r in rideshare_rides)
    total += sum(o.prop22_engaged_hours for o in food_orders)
    return total
