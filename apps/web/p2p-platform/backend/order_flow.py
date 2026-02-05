"""
EatFair P2P - Complete Order Flow
End-to-end order processing from customer to delivery with payouts

Flow:
1. Customer places order → Payment captured
2. Restaurant receives order → Confirms & prepares
3. Driver assigned → Picks up order
4. Driver delivers → Order completed
5. Accounting: Journal entries created, payouts calculated

AI Employees:
- OrderBot Alpha (AI_EMP_001): Order validation & creation
- KitchenBot Beta (AI_EMP_002): Restaurant coordination
- DispatchBot Gamma (AI_EMP_003): Driver assignment & delivery
- LedgerBot Delta (AI_EMP_004): Accounting & payouts
- QualityBot Epsilon (AI_EMP_005): Quality monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json
import logging
import os
import requests

from database import get_db, SessionLocal
from email_service import send_order_delivered_with_receipt_email
from google_maps_service import get_traffic_eta, ETAResult

# Service URLs
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8008")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8009")

# Firebase Admin SDK for direct push notifications
_firebase_initialized = False
_firebase_app = None

def _init_firebase():
    """Initialize Firebase Admin SDK for direct push notifications."""
    global _firebase_initialized, _firebase_app
    if _firebase_initialized:
        return _firebase_app is not None

    _firebase_initialized = True
    firebase_creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "")

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_creds_path and os.path.exists(firebase_creds_path):
            cred = credentials.Certificate(firebase_creds_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logging.info("Firebase initialized from credentials file")
            return True
        elif firebase_creds_json:
            import json as json_mod
            cred_dict = json_mod.loads(firebase_creds_json)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logging.info("Firebase initialized from JSON env var")
            return True
        else:
            logging.warning("No Firebase credentials configured - push notifications disabled")
            return False
    except Exception as e:
        logging.error(f"Failed to initialize Firebase: {e}")
        return False


def _send_fcm_direct(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """Send FCM push notification directly using Firebase Admin SDK."""
    if not _init_firebase():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token
        )
        messaging.send(message)
        logging.info(f"Direct FCM push sent: {title}")
        return True
    except Exception as e:
        logging.error(f"Direct FCM push failed: {e}")
        return False

# Background scheduler for automatic timeout checks
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


# ==================== SERVICE HELPER FUNCTIONS ====================

def trigger_refund(order: "Order", reason: str = "Restaurant timeout") -> bool:
    """
    Trigger a refund via payment service.
    Returns True if successful, False otherwise.
    """
    if not order.stripe_payment_intent_id:
        logger.warning(f"Cannot refund order {order.order_number}: No payment intent ID")
        return False

    try:
        response = requests.post(
            f"{PAYMENT_SERVICE_URL}/api/payments/refund",
            json={
                "payment_intent_id": order.stripe_payment_intent_id,
                "amount": float(order.total),
                "reason": reason,
                "order_id": order.id
            },
            timeout=10
        )
        if response.status_code == 200:
            logger.info(f"Refund triggered for order {order.order_number}")
            return True
        else:
            logger.error(f"Failed to trigger refund for order {order.order_number}: {response.text}")
            return False
    except requests.RequestException as e:
        logger.error(f"Payment service unavailable for refund: {e}")
        return False


def send_push_notification(user_type: str, user_id: int, title: str, body: str, data: dict = None, db: Session = None) -> bool:
    """
    Send push notification via notification service or direct FCM.
    user_type: 'customer', 'driver', or 'vendor'
    Returns True if successful, False otherwise.

    Falls back to direct FCM if notification service is unavailable.
    """
    # First, try notification service
    try:
        payload = {
            "title": title,
            "body": body,
            "data": data or {}
        }

        # Map user_type to the correct field for notification service
        if user_type == "driver":
            payload["driver_id"] = user_id
        elif user_type == "vendor":
            payload["vendor_id"] = user_id
        else:  # customer or user
            payload["user_id"] = user_id

        response = requests.post(
            f"{NOTIFICATION_SERVICE_URL}/api/notifications/push/send",
            json=payload,
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"Push notification sent via service to {user_type} {user_id}")
            return True
        else:
            logger.warning(f"Notification service returned error: {response.text}")
            # Fall through to direct FCM
    except requests.RequestException as e:
        logger.warning(f"Notification service unavailable: {e}, trying direct FCM...")

    # Fallback: Direct FCM push notification
    try:
        # Get FCM token from database
        fcm_token = None
        if db is None:
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            if user_type == "driver":
                result = db.execute(
                    text("SELECT fcm_token FROM drivers WHERE id = :id"),
                    {"id": user_id}
                ).fetchone()
                if result:
                    fcm_token = result[0]
            elif user_type == "vendor":
                result = db.execute(
                    text("SELECT push_token FROM vendors WHERE id = :id"),
                    {"id": user_id}
                ).fetchone()
                if result:
                    fcm_token = result[0]
            else:  # customer
                result = db.execute(
                    text("SELECT push_token FROM customers WHERE id = :id"),
                    {"id": user_id}
                ).fetchone()
                if result:
                    fcm_token = result[0]
        finally:
            if should_close:
                db.close()

        if fcm_token:
            if _send_fcm_direct(fcm_token, title, body, data):
                logger.info(f"Direct FCM push sent to {user_type} {user_id}")
                return True
            else:
                logger.error(f"Direct FCM push failed for {user_type} {user_id}")
                return False
        else:
            logger.warning(f"No FCM token found for {user_type} {user_id}")
            return False
    except Exception as e:
        logger.error(f"Direct FCM fallback failed: {e}")
        return False


def send_driver_pool_notification(order: "Order", db: Session) -> int:
    """
    Send push notifications to nearby available drivers.
    Returns number of drivers notified.
    """
    from models import Driver, DriverStatus

    # Get available drivers
    available_drivers = db.query(Driver).filter(
        Driver.status == DriverStatus.ONLINE,
        Driver.is_active == True
    ).limit(10).all()

    notified = 0
    for driver in available_drivers:
        success = send_push_notification(
            user_type="driver",
            user_id=driver.id,
            title="New Delivery Available",
            body=f"Order #{order.order_number} is ready for pickup",
            data={
                "order_id": order.id,
                "order_number": order.order_number,
                "type": "new_delivery"
            }
        )
        if success:
            notified += 1

    logger.info(f"Notified {notified} drivers about order {order.order_number}")
    return notified


def notify_drivers_new_order(order: "Order", prep_minutes: int, vendor: "Vendor", db: Session) -> int:
    """
    Send push notifications to nearby available drivers when restaurant accepts an order.
    Includes ETA information so drivers can head to restaurant early.
    Returns number of drivers notified.

    This enables the "early driver notification" flow where drivers see orders
    while they're still being prepared, allowing them to accept and travel to
    the restaurant, reducing overall delivery time.
    """
    from models import Driver, DriverStatus

    # Get available online drivers
    available_drivers = db.query(Driver).filter(
        Driver.status == DriverStatus.ONLINE,
        Driver.is_active == True
    ).limit(15).all()  # Notify up to 15 nearby drivers

    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"

    notified = 0
    for driver in available_drivers:
        success = send_push_notification(
            user_type="driver",
            user_id=driver.id,
            title="New Delivery Available",
            body=f"{restaurant_name} - Ready in ~{prep_minutes} min",
            data={
                "order_id": str(order.id),
                "order_number": order.order_number,
                "type": "new_order_with_eta",
                "estimated_prep_minutes": str(prep_minutes),
                "restaurant_name": restaurant_name,
                "status": "preparing"
            },
            db=db
        )
        if success:
            notified += 1

    return notified


def calculate_delivery_time_minutes(order: "Order") -> Optional[float]:
    """
    Calculate delivery time in minutes from when driver picked up to delivered.
    Returns None if not yet delivered or missing data.
    """
    if not order.delivered_at or not order.picked_up_at:
        return None

    delta = order.delivered_at - order.picked_up_at
    return round(delta.total_seconds() / 60, 1)


def estimate_delivery_eta(order: "Order") -> Optional[str]:
    """
    Estimate delivery time based on distance and current status.
    Returns ISO format datetime string or None.
    """
    if order.status == OrderStatus.DELIVERED:
        return order.delivered_at.isoformat() if order.delivered_at else None

    # Base estimates in minutes
    PREP_TIME = 15  # Average restaurant prep time
    PICKUP_TIME = 10  # Driver travel to restaurant
    DELIVERY_TIME = 20  # Driver travel to customer

    now = datetime.now()

    if order.status == OrderStatus.OUT_FOR_DELIVERY:
        # Driver has picked up, estimate based on typical delivery time
        eta = now + timedelta(minutes=DELIVERY_TIME)
    elif order.status in [OrderStatus.READY_FOR_PICKUP]:
        # Food ready, waiting for driver
        eta = now + timedelta(minutes=PICKUP_TIME + DELIVERY_TIME)
    elif order.status in [OrderStatus.PREPARING, OrderStatus.CONFIRMED]:
        # Still preparing
        eta = now + timedelta(minutes=PREP_TIME + PICKUP_TIME + DELIVERY_TIME)
    else:
        return None

    return eta.isoformat()


from models import (
    Order, OrderStatus, Vendor, VendorMenuItem, Driver, DriverStatus,
    VendorPayout, DriverPayout, JournalEntry, JournalEntryLine, VendorStatus,
    Customer
)

router = APIRouter(prefix="/api/erp", tags=["erp"])

# AI Employees
AI_EMPLOYEES = {
    "ORDER_PROCESSOR": {
        "id": "AI_EMP_001",
        "name": "OrderBot Alpha",
        "role": "Order Processor"
    },
    "RESTAURANT_COORDINATOR": {
        "id": "AI_EMP_002",
        "name": "KitchenBot Beta",
        "role": "Restaurant Coordinator"
    },
    "DELIVERY_DISPATCHER": {
        "id": "AI_EMP_003",
        "name": "DispatchBot Gamma",
        "role": "Delivery Dispatcher"
    },
    "ACCOUNTANT": {
        "id": "AI_EMP_004",
        "name": "LedgerBot Delta",
        "role": "Accounting Specialist"
    },
    "QA_MONITOR": {
        "id": "AI_EMP_005",
        "name": "QualityBot Epsilon",
        "role": "Quality Monitor"
    }
}

# ===========================================
# EatFair Platform Fee Structure
# ===========================================
#
# PLATFORM REVENUE: $2 per order
#   - $1 from Customer (service fee added at checkout)
#   - $1 from Restaurant (deducted from their payout)
#
# DRIVER EARNINGS: 100% of delivery fee + 100% of tips
#   - Platform makes $0 on delivery or tips
#   - Delivery fee is distance-based (market rate)
#
# CUSTOMER PAYS: Food + Tax + Delivery Fee + $1 Service Fee + Tip
# RESTAURANT RECEIVES: Food Amount - $1 Platform Fee
# DRIVER RECEIVES: Delivery Fee + Tips
#
# ===========================================

# Platform Fees ($2 total per order)
CUSTOMER_SERVICE_FEE = 1.00      # $1 service fee charged to customer
RESTAURANT_PLATFORM_FEE = 1.00   # $1 platform fee deducted from restaurant payout

# Delivery Fee Structure (100% goes to driver)
# Based on current market rates - competitive with DoorDash, UberEats
DELIVERY_BASE_FEE = 2.49         # Base fee for any delivery
DELIVERY_PER_MILE = 0.50         # $0.50 per mile
DELIVERY_MIN_FEE = 2.99          # Minimum delivery fee
DELIVERY_MAX_FEE = 12.99         # Maximum delivery fee (cap for long distances)
DELIVERY_DEFAULT_FEE = 4.99      # Default when distance unknown

# Legacy variables for backward compatibility
PLATFORM_FEE = RESTAURANT_PLATFORM_FEE
DELIVERY_FEE = DELIVERY_DEFAULT_FEE

# Restaurant Acceptance Window Configuration
RESTAURANT_ACCEPTANCE_WINDOW_SECONDS = 180  # 3 minutes to accept/decline
RESTAURANT_URGENT_THRESHOLD_SECONDS = 60    # Mark as urgent when < 1 min remaining

# Delivery Decision Window Configuration
DELIVERY_DECISION_WINDOW_SECONDS = 180  # 3 minutes for restaurant to decide on delivery
DELIVERY_DECISION_URGENT_THRESHOLD_SECONDS = 60  # Mark as urgent when < 1 min remaining


def calculate_delivery_fee(distance_miles: float = None, surge_multiplier: float = 1.0) -> float:
    """
    Calculate delivery fee based on distance and current demand.
    100% goes to driver - platform makes $0 on delivery.

    Args:
        distance_miles: Distance from restaurant to customer (None = use default)
        surge_multiplier: Demand multiplier (1.0 = normal, max 2.0 = high demand)

    Returns:
        Delivery fee amount (capped between min and max)
    """
    if distance_miles is None:
        base_fee = DELIVERY_DEFAULT_FEE
    else:
        base_fee = DELIVERY_BASE_FEE + (distance_miles * DELIVERY_PER_MILE)

    # Apply surge (capped at 2x)
    surge_multiplier = min(surge_multiplier, 2.0)
    total_fee = base_fee * surge_multiplier

    # Apply min/max caps
    total_fee = max(DELIVERY_MIN_FEE, min(total_fee, DELIVERY_MAX_FEE))

    return round(total_fee, 2)


# ==================== REQUEST MODELS ====================

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    items: List[Dict[str, Any]]
    delivery_address: Dict[str, Any]  # Includes street, city, state, zip, latitude, longitude
    delivery_instructions: Optional[str] = None
    tip: float = 0.0


class AssignDriverRequest(BaseModel):
    driver_id: int
    driver_eta_minutes: Optional[int] = None  # Driver's ETA to restaurant in minutes


class UpdateStatusRequest(BaseModel):
    status: str


class RideRequest(BaseModel):
    """P2P Ride Request - Customer picks pickup and dropoff locations"""
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_address: Dict[str, Any]  # {street, city, state, zip, lat, lng}
    dropoff_address: Dict[str, Any]  # {street, city, state, zip, lat, lng}
    notes: Optional[str] = None
    tip: float = 0.0


# ==================== WORLD-CLASS RIDE PRICING ====================
# Competitive with Uber/Lyft but driver-friendly (~90% to driver)
# Compliant with US tax regulations and business requirements

# Platform Fee (EatFair Revenue) - Simple $1 flat fee
PLATFORM_FEE = 1.00      # $1 flat platform fee - ONLY fee to EatFair

# Driver Earnings (100% to driver, minus taxes)
BASE_FARE = 2.00         # $2.00 base fare per ride
PER_MILE_RATE = 1.00     # $1.00 per mile
PER_MINUTE_RATE = 0.15   # $0.15 per minute

# Minimums & Caps
MINIMUM_FARE = 5.00      # Minimum total fare
MAXIMUM_SURGE = 3.0      # Maximum surge multiplier

# Surge Pricing Thresholds
SURGE_LEVELS = {
    "normal": 1.0,       # Default
    "busy": 1.25,        # Rush hours
    "very_busy": 1.5,    # Weekend nights
    "high_demand": 2.0,  # Events/weather
    "extreme": 2.5       # NYE, emergencies
}

# ==================== TAX & COMPLIANCE CONFIGURATION ====================
# US Tax Rates by State (Sales Tax on ride-sharing services)
# Note: Some states exempt ride-sharing from sales tax
STATE_TAX_RATES = {
    # States WITH ride-share sales tax
    "CA": 0.0725,   # California 7.25% base (varies by city)
    "NY": 0.08875,  # New York 8.875% (NYC)
    "TX": 0.0625,   # Texas 6.25%
    "FL": 0.06,     # Florida 6%
    "IL": 0.0625,   # Illinois 6.25%
    "PA": 0.06,     # Pennsylvania 6%
    "OH": 0.0575,   # Ohio 5.75%
    "GA": 0.04,     # Georgia 4%
    "NC": 0.0475,   # North Carolina 4.75%
    "MI": 0.06,     # Michigan 6%
    "NJ": 0.06625,  # New Jersey 6.625%
    "VA": 0.053,    # Virginia 5.3%
    "WA": 0.065,    # Washington 6.5%
    "AZ": 0.056,    # Arizona 5.6%
    "MA": 0.0625,   # Massachusetts 6.25%
    "TN": 0.07,     # Tennessee 7%
    "IN": 0.07,     # Indiana 7%
    "MO": 0.04225,  # Missouri 4.225%
    "MD": 0.06,     # Maryland 6%
    "WI": 0.05,     # Wisconsin 5%
    "CO": 0.029,    # Colorado 2.9%
    "MN": 0.06875,  # Minnesota 6.875%
    "SC": 0.06,     # South Carolina 6%
    "AL": 0.04,     # Alabama 4%
    "LA": 0.0445,   # Louisiana 4.45%
    "KY": 0.06,     # Kentucky 6%
    "OK": 0.045,    # Oklahoma 4.5%
    "CT": 0.0635,   # Connecticut 6.35%
    "UT": 0.0485,   # Utah 4.85%
    "IA": 0.06,     # Iowa 6%
    "NV": 0.0685,   # Nevada 6.85%
    "AR": 0.065,    # Arkansas 6.5%
    "MS": 0.07,     # Mississippi 7%
    "KS": 0.065,    # Kansas 6.5%
    "NM": 0.05125,  # New Mexico 5.125%
    "NE": 0.055,    # Nebraska 5.5%
    "WV": 0.06,     # West Virginia 6%
    "ID": 0.06,     # Idaho 6%
    "HI": 0.04,     # Hawaii 4%
    "NH": 0.0,      # New Hampshire - No sales tax
    "ME": 0.055,    # Maine 5.5%
    "RI": 0.07,     # Rhode Island 7%
    "MT": 0.0,      # Montana - No sales tax
    "DE": 0.0,      # Delaware - No sales tax
    "SD": 0.045,    # South Dakota 4.5%
    "ND": 0.05,     # North Dakota 5%
    "AK": 0.0,      # Alaska - No state sales tax
    "VT": 0.06,     # Vermont 6%
    "DC": 0.06,     # Washington DC 6%
    "WY": 0.04,     # Wyoming 4%
    "OR": 0.0,      # Oregon - No sales tax
}

# Default tax rate if state not found
DEFAULT_TAX_RATE = 0.06  # 6% default

# Additional regulatory fees (some cities/states require these)
REGULATORY_FEES = {
    "airport_fee": 3.00,      # Airport pickup/dropoff fee
    "black_car_fund": 0.0,    # NY Black Car Fund (2.5% for black car only)
    "accessibility_fee": 0.10, # ADA accessibility fund
}

def get_tax_rate(state_code: str) -> float:
    """Get sales tax rate for a state"""
    return STATE_TAX_RATES.get(state_code.upper(), DEFAULT_TAX_RATE)

def calculate_ride_fare(
    distance_miles: float,
    duration_minutes: float,
    surge_multiplier: float = 1.0,
    tip: float = 0.0,
    state_code: str = "CA",
    is_airport: bool = False
):
    """
    Calculate ride fare with world-class pricing structure.
    Includes tax calculation for US compliance.

    Pricing Philosophy:
    - $1 FLAT platform fee (simple, transparent)
    - Driver gets ~90% of fare (industry-leading!)
    - Tax calculated based on rider's state
    - Tips 100% to driver (never taxed to platform)

    Returns complete breakdown for receipts/invoices.
    """
    # Calculate driver portion (before surge)
    base_fare = BASE_FARE
    distance_fee = distance_miles * PER_MILE_RATE
    time_fee = duration_minutes * PER_MINUTE_RATE

    # Apply surge to driver portion only
    driver_base = base_fare + distance_fee + time_fee
    driver_subtotal = driver_base * surge_multiplier
    surge_amount = driver_subtotal - driver_base if surge_multiplier > 1.0 else 0

    # Platform fee (ONLY $1, not affected by surge)
    platform_fee = PLATFORM_FEE

    # Subtotal before tax
    subtotal_before_tax = platform_fee + driver_subtotal

    # Apply minimum fare
    if subtotal_before_tax < MINIMUM_FARE:
        driver_subtotal = MINIMUM_FARE - platform_fee
        subtotal_before_tax = MINIMUM_FARE

    # Calculate tax (on the service, not on tips)
    tax_rate = get_tax_rate(state_code)
    tax_amount = round(subtotal_before_tax * tax_rate, 2)

    # Airport fee if applicable
    airport_fee = REGULATORY_FEES["airport_fee"] if is_airport else 0.0

    # Accessibility fund (small contribution)
    accessibility_fee = REGULATORY_FEES["accessibility_fee"]

    # Final totals
    total_before_tip = subtotal_before_tax + tax_amount + airport_fee + accessibility_fee
    total_fare = total_before_tip + tip

    # Driver earnings (fare portion + tip, driver handles their own income tax)
    driver_earnings = driver_subtotal + tip

    # Platform earnings (just the $1 fee)
    platform_earnings = platform_fee

    return {
        # Core pricing
        "platform_fee": platform_fee,
        "base_fare": BASE_FARE,
        "distance_fee": round(distance_fee, 2),
        "time_fee": round(time_fee, 2),
        "surge_multiplier": surge_multiplier,
        "surge_amount": round(surge_amount, 2),

        # Tax & regulatory (for compliance)
        "subtotal_before_tax": round(subtotal_before_tax, 2),
        "tax_rate": tax_rate,
        "tax_rate_percent": f"{tax_rate * 100:.2f}%",
        "tax_amount": tax_amount,
        "state_code": state_code.upper(),
        "airport_fee": airport_fee,
        "accessibility_fee": accessibility_fee,

        # Tip (100% to driver)
        "tip": tip,

        # Totals
        "total_before_tip": round(total_before_tip, 2),
        "total_fare": round(total_fare, 2),

        # Earnings split
        "driver_earnings": round(driver_earnings, 2),
        "platform_earnings": round(platform_earnings, 2),
        "driver_percentage": round((driver_earnings / total_fare) * 100, 1) if total_fare > 0 else 0,

        # Trip info
        "estimated_distance_miles": distance_miles,
        "estimated_duration_minutes": duration_minutes,

        # For receipts
        "receipt_line_items": [
            {"description": "Base Fare", "amount": BASE_FARE},
            {"description": f"Distance ({distance_miles:.1f} mi × $1.00)", "amount": round(distance_fee, 2)},
            {"description": f"Time ({int(duration_minutes)} min × $0.15)", "amount": round(time_fee, 2)},
            {"description": "Platform Fee", "amount": platform_fee},
            {"description": f"Sales Tax ({tax_rate * 100:.2f}%)", "amount": tax_amount},
        ]
    }

def estimate_distance_and_time(pickup_lat: float, pickup_lng: float, dropoff_lat: float, dropoff_lng: float):
    """
    Estimate distance (miles) and duration (minutes) between two points.
    Uses Haversine formula for distance, estimates time based on average speed.
    """
    import math

    # Haversine formula for distance
    R = 3959  # Earth's radius in miles

    lat1, lon1 = math.radians(pickup_lat), math.radians(pickup_lng)
    lat2, lon2 = math.radians(dropoff_lat), math.radians(dropoff_lng)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    distance_miles = R * c

    # Estimate duration: assume average 25 mph in urban areas (accounts for traffic, stops)
    # Add 20% buffer for real-world conditions
    avg_speed_mph = 25
    duration_minutes = (distance_miles / avg_speed_mph) * 60 * 1.2

    return round(distance_miles, 1), round(duration_minutes, 0)


# ==================== P2P RIDE FARE ESTIMATION ====================

@router.post("/rides/estimate")
async def estimate_ride_fare_endpoint(
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    state_code: str = "CA",
    tip: float = 0.0,
    is_airport: bool = False
):
    """
    Get fare estimate before requesting a ride.
    Shows customer exactly what they'll pay including taxes.
    Fully compliant with US tax regulations.
    """
    # Estimate distance and duration
    distance_miles, duration_minutes = estimate_distance_and_time(
        pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
    )

    # Calculate fare with tax
    fare_normal = calculate_ride_fare(distance_miles, duration_minutes, 1.0, tip, state_code, is_airport)
    fare_surge = calculate_ride_fare(distance_miles, duration_minutes, 1.5, tip, state_code, is_airport)

    return {
        "success": True,
        "distance_miles": distance_miles,
        "duration_minutes": duration_minutes,
        "fare_estimate": fare_normal,
        "fare_range": {
            "low": fare_normal["total_fare"],
            "high": fare_surge["total_fare"]
        },
        "pricing_info": {
            "platform_fee": "$1.00 flat",
            "base_fare": f"${BASE_FARE:.2f}",
            "per_mile": f"${PER_MILE_RATE:.2f}/mi",
            "per_minute": f"${PER_MINUTE_RATE:.2f}/min",
            "minimum_fare": f"${MINIMUM_FARE:.2f}",
            "tax_rate": fare_normal["tax_rate_percent"],
            "state": state_code.upper()
        },
        "driver_take_rate": f"{fare_normal['driver_percentage']}%",
        "message": f"Estimated {distance_miles} miles, {int(duration_minutes)} mins"
    }


# ==================== P2P RIDE REQUEST ====================

@router.post("/rides/request")
async def request_ride(
    ride_data: RideRequest,
    db: Session = Depends(get_db)
):
    """
    P2P Ride Request - World-class pricing with dynamic fare calculation.

    Pricing Structure (Simple $1 Platform Fee Model):
    - Platform Fee: $1.00 ONLY (to EatFair)
    - Base Fare: $2.00 (to driver)
    - Per Mile: $1.00 (to driver)
    - Per Minute: $0.15 (to driver)
    - Tips: 100% to driver
    - Minimum Fare: $5.00
    - Tax: State-specific sales tax

    Driver Take Rate: ~90%+ (industry-leading!)
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    # Generate standardized order number: DOLL{YEAR}{SEQUENCE}
    order_count = db.query(Order).count()
    order_number = f"DOLL{datetime.now().year}{order_count + 1:03d}"

    # Get coordinates for distance/time estimation
    pickup_lat = ride_data.pickup_address.get("lat", 0)
    pickup_lng = ride_data.pickup_address.get("lng", 0)
    dropoff_lat = ride_data.dropoff_address.get("lat", 0)
    dropoff_lng = ride_data.dropoff_address.get("lng", 0)

    # Estimate distance and duration
    distance_miles, duration_minutes = estimate_distance_and_time(
        pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
    )

    # Get state code from pickup address for tax calculation
    pickup_state = ride_data.pickup_address.get("state", "CA")

    # Calculate fare with world-class pricing (includes state-based tax)
    # TODO: Add surge pricing based on demand/time
    surge_multiplier = 1.0  # Default, can be dynamic based on demand
    fare = calculate_ride_fare(
        distance_miles, duration_minutes, surge_multiplier,
        ride_data.tip, pickup_state, is_airport=False
    )

    # Create ride as a special order type
    ride_order = Order(
        order_number=order_number,
        customer_name=ride_data.customer_name,
        customer_email=ride_data.customer_email,
        customer_phone=ride_data.customer_phone,
        vendor_id=None,  # No vendor for P2P rides
        items=json.dumps([{
            "type": "ride",
            "description": "P2P Ride Request",
            "distance_miles": distance_miles,
            "duration_minutes": duration_minutes,
            "fare_breakdown": fare,
            "receipt_line_items": fare["receipt_line_items"]
        }]),
        subtotal=fare["subtotal_before_tax"],
        tax_rate=fare["tax_rate"],
        tax_amount=fare["tax_amount"],
        delivery_fee=fare["driver_earnings"],  # Driver's total earnings
        tip=ride_data.tip,
        platform_fee=fare["platform_earnings"],  # Platform's take ($1.00 ONLY)
        total_amount=fare["total_fare"],
        delivery_address=json.dumps({
            "pickup": ride_data.pickup_address,
            "dropoff": ride_data.dropoff_address,
            "state_code": pickup_state
        }),
        delivery_latitude=dropoff_lat,
        delivery_longitude=dropoff_lng,
        delivery_instructions=ride_data.notes,
        status=OrderStatus.PREPARING,  # Ready for driver pickup
        payment_status="succeeded"
    )

    db.add(ride_order)
    db.commit()
    db.refresh(ride_order)

    return {
        "success": True,
        "ride_id": ride_order.id,
        "ride_number": ride_order.order_number,
        "pickup": ride_data.pickup_address,
        "dropoff": ride_data.dropoff_address,
        # Detailed fare breakdown
        "fare_breakdown": fare,
        "distance_miles": distance_miles,
        "duration_minutes": duration_minutes,
        "total_fare": fare["total_fare"],
        "driver_earnings": fare["driver_earnings"],
        "platform_fee": fare["platform_fee"],
        "base_fare": fare["base_fare"],
        "distance_fee": fare["distance_fee"],
        "time_fee": fare["time_fee"],
        "surge_multiplier": fare["surge_multiplier"],
        "tax_amount": fare["tax_amount"],
        "tax_rate": fare["tax_rate_percent"],
        "tip": ride_data.tip,
        "receipt_line_items": fare["receipt_line_items"],
        "status": "waiting_for_driver",
        "processed_by": ai_employee["name"]
    }


@router.get("/rides/available")
async def get_available_rides(
    driver_lat: Optional[float] = None,
    driver_lng: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get available P2P rides for drivers
    Returns rides waiting for pickup
    """
    # Get rides (orders with RIDE- prefix that don't have a driver)
    rides = db.query(Order).filter(
        Order.order_number.like("RIDE-%"),
        Order.status.in_([OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]),
        Order.driver_id.is_(None)
    ).all()

    result = []
    for ride in rides:
        try:
            addr = json.loads(ride.delivery_address) if ride.delivery_address else {}
            pickup = addr.get("pickup", {})
            dropoff = addr.get("dropoff", {})
        except:
            pickup = {}
            dropoff = {}

        result.append({
            "ride_id": ride.id,
            "ride_number": ride.order_number,
            "customer_name": ride.customer_name,
            "pickup": pickup,
            "dropoff": dropoff,
            "fee": ride.delivery_fee,
            "tip": ride.tip,
            "total_earnings": (ride.delivery_fee or 0) + (ride.tip or 0),
            "notes": ride.delivery_instructions,
            "created_at": ride.created_at.isoformat() if ride.created_at else None
        })

    return {"success": True, "rides": result}


@router.post("/rides/{ride_id}/accept")
async def accept_ride(
    ride_id: int,
    request: AssignDriverRequest,
    db: Session = Depends(get_db)
):
    """
    Driver accepts a P2P ride
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    ride = db.query(Order).filter(Order.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.driver_id:
        raise HTTPException(status_code=400, detail="Ride already accepted by another driver")

    driver = db.query(Driver).filter(Driver.id == request.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    ride.driver_id = driver.id
    ride.driver_name = f"{driver.first_name} {driver.last_name}"
    ride.status = OrderStatus.OUT_FOR_DELIVERY

    db.commit()

    return {
        "success": True,
        "ride_id": ride.id,
        "ride_number": ride.order_number,
        "driver_id": driver.id,
        "driver_name": ride.driver_name,
        "status": "driver_on_way",
        "processed_by": ai_employee["name"]
    }


@router.post("/rides/{ride_id}/picked-up")
async def ride_picked_up(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver picked up customer
    """
    ride = db.query(Order).filter(Order.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Mark as in transit
    ride.status = OrderStatus.OUT_FOR_DELIVERY
    ride.preparing_at = datetime.now()  # Using as pickup time

    db.commit()

    return {
        "success": True,
        "ride_id": ride.id,
        "ride_number": ride.order_number,
        "status": "in_transit",
        "picked_up_at": ride.preparing_at.isoformat()
    }


@router.post("/rides/{ride_id}/completed")
async def ride_completed(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Ride completed - customer dropped off
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    ride = db.query(Order).filter(Order.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    ride.status = OrderStatus.DELIVERED
    ride.delivered_at = datetime.now()

    # Calculate driver earnings
    driver_earnings = (ride.delivery_fee or 0) + (ride.tip or 0)

    db.commit()

    return {
        "success": True,
        "ride_id": ride.id,
        "ride_number": ride.order_number,
        "status": "completed",
        "completed_at": ride.delivered_at.isoformat(),
        "driver_earnings": driver_earnings,
        "platform_fee": PLATFORM_FEE,  # $1.00 only
        "processed_by": ai_employee["name"]
    }


# ==================== RIDE RECEIPT ====================

@router.get("/rides/{ride_id}/receipt")
async def get_ride_receipt(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate a detailed receipt for a completed ride.
    Includes full tax breakdown for compliance.
    """
    ride = db.query(Order).filter(Order.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Parse stored data
    try:
        addr = json.loads(ride.delivery_address) if ride.delivery_address else {}
        items_data = json.loads(ride.items) if ride.items else []
        fare_breakdown = items_data[0].get("fare_breakdown", {}) if items_data else {}
        receipt_line_items = items_data[0].get("receipt_line_items", []) if items_data else []
    except:
        addr = {}
        fare_breakdown = {}
        receipt_line_items = []

    pickup = addr.get("pickup", {})
    dropoff = addr.get("dropoff", {})
    state_code = addr.get("state_code", "CA")

    # Build comprehensive receipt
    receipt = {
        "receipt_id": f"RCP-{ride.order_number}",
        "ride_number": ride.order_number,
        "date": ride.created_at.isoformat() if ride.created_at else None,
        "completed_at": ride.delivered_at.isoformat() if ride.delivered_at else None,

        # Customer info
        "customer": {
            "name": ride.customer_name,
            "email": ride.customer_email,
            "phone": ride.customer_phone
        },

        # Driver info
        "driver": {
            "name": ride.driver_name,
            "id": ride.driver_id
        } if ride.driver_id else None,

        # Trip details
        "trip": {
            "pickup_address": pickup.get("street", ""),
            "pickup_city": pickup.get("city", ""),
            "pickup_state": pickup.get("state", ""),
            "dropoff_address": dropoff.get("street", ""),
            "dropoff_city": dropoff.get("city", ""),
            "dropoff_state": dropoff.get("state", ""),
            "distance_miles": fare_breakdown.get("estimated_distance_miles", 0),
            "duration_minutes": fare_breakdown.get("estimated_duration_minutes", 0)
        },

        # Itemized charges
        "line_items": receipt_line_items if receipt_line_items else [
            {"description": "Base Fare", "amount": fare_breakdown.get("base_fare", 0)},
            {"description": f"Distance", "amount": fare_breakdown.get("distance_fee", 0)},
            {"description": f"Time", "amount": fare_breakdown.get("time_fee", 0)},
            {"description": "Platform Fee", "amount": PLATFORM_FEE},
            {"description": f"Sales Tax ({(ride.tax_rate or 0) * 100:.2f}%)", "amount": ride.tax_amount or 0}
        ],

        # Tax details (for compliance)
        "tax_details": {
            "state_code": state_code,
            "tax_rate": ride.tax_rate or 0,
            "tax_rate_percent": f"{(ride.tax_rate or 0) * 100:.2f}%",
            "tax_amount": ride.tax_amount or 0,
            "taxable_amount": ride.subtotal or 0
        },

        # Totals
        "subtotal": ride.subtotal or 0,
        "tax_amount": ride.tax_amount or 0,
        "tip": ride.tip or 0,
        "total": ride.total_amount or 0,

        # Earnings breakdown (transparency)
        "earnings_split": {
            "driver_earnings": ride.delivery_fee or 0,
            "platform_fee": ride.platform_fee or PLATFORM_FEE,
            "driver_percentage": round(((ride.delivery_fee or 0) / (ride.total_amount or 1)) * 100, 1)
        },

        # Payment info
        "payment": {
            "status": ride.payment_status or "completed",
            "method": "card"
        },

        # Legal footer
        "legal": {
            "company_name": "Dollor.ai (TechCloudPro Inc.)",
            "tax_id": "XX-XXXXXXX",  # Placeholder - replace with real EIN
            "address": "123 Main Street, San Francisco, CA 94102",
            "support_email": "support@dollor.ai",
            "terms_url": "https://dollor.ai/terms"
        }
    }

    return {
        "success": True,
        "receipt": receipt
    }


# ==================== ORDER CREATION ====================

@router.post("/orders/create")
async def create_order(
    order_data: CreateOrderRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new order - Called from iOS Customer App
    AI Employee: OrderBot Alpha
    """
    ai_employee = AI_EMPLOYEES["ORDER_PROCESSOR"]

    # Verify vendor exists and is approved
    vendor = db.query(Vendor).filter(Vendor.id == order_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if vendor.onboarding_status.value != "approved":
        raise HTTPException(status_code=400, detail="Restaurant is not accepting orders")

    # Calculate order totals
    subtotal = 0.0
    items_data = []

    for item in order_data.items:
        # Verify menu item exists
        menu_item = db.query(VendorMenuItem).filter(
            VendorMenuItem.id == item.get("menu_item_id"),
            VendorMenuItem.vendor_id == order_data.vendor_id
        ).first()

        if menu_item:
            item_total = menu_item.price * item.get("quantity", 1)
            subtotal += item_total
            items_data.append({
                "menu_item_id": menu_item.id,
                "name": menu_item.item_name,
                "quantity": item.get("quantity", 1),
                "unit_price": menu_item.price,
                "total_price": item_total
            })
        else:
            # Use provided item data if menu item not found
            item_total = item.get("price", 0) * item.get("quantity", 1)
            subtotal += item_total
            items_data.append({
                "name": item.get("name", "Unknown Item"),
                "quantity": item.get("quantity", 1),
                "unit_price": item.get("price", 0),
                "total_price": item_total
            })

    # Calculate fees with state-specific tax rate
    # Extract state from delivery address for tax calculation
    state_code = order_data.delivery_address.get("state", "").upper()
    tax_rate = get_tax_rate(state_code) if state_code else DEFAULT_TAX_RATE
    tax_amount = round(subtotal * tax_rate, 2)

    # Calculate distance-based delivery fee (100% goes to driver)
    delivery_distance = None
    customer_lat = order_data.delivery_address.get("latitude") or order_data.delivery_address.get("lat")
    customer_lng = order_data.delivery_address.get("longitude") or order_data.delivery_address.get("lng")

    if vendor.latitude and vendor.longitude and customer_lat and customer_lng:
        # Calculate distance using haversine formula
        from math import radians, sin, cos, sqrt, asin
        R = 3959  # Earth's radius in miles

        lat1, lon1 = radians(float(vendor.latitude)), radians(float(vendor.longitude))
        lat2, lon2 = radians(float(customer_lat)), radians(float(customer_lng))

        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        delivery_distance = 2 * R * asin(sqrt(a))

    delivery_fee = calculate_delivery_fee(delivery_distance)

    # Customer pays: Subtotal + Tax + Service Fee + Delivery Fee + Tip
    total_amount = subtotal + tax_amount + CUSTOMER_SERVICE_FEE + delivery_fee + order_data.tip

    # Generate standardized order number: DOLL{YEAR}{SEQUENCE}
    # Example: DOLL2026001, DOLL2026002, etc.
    order_count = db.query(Order).count()
    order_number = f"DOLL{datetime.now().year}{order_count + 1:03d}"

    # Look up customer_id from email for order tracking
    customer_id = None
    if order_data.customer_email:
        customer = db.query(Customer).filter(Customer.email == order_data.customer_email).first()
        if customer:
            customer_id = customer.id

    # Create order
    # platform_fee stores customer service fee (charged to customer)
    # restaurant_platform_fee is deducted from restaurant payout during settlement
    new_order = Order(
        order_number=order_number,
        customer_id=customer_id,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        items=json.dumps(items_data),
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        delivery_fee=delivery_fee,  # Distance-based fee (100% to driver)
        tip=order_data.tip,
        platform_fee=CUSTOMER_SERVICE_FEE,  # $1 customer service fee
        total_amount=total_amount,
        delivery_address=json.dumps(order_data.delivery_address),
        delivery_instructions=order_data.delivery_instructions,
        status=OrderStatus.PENDING_PAYMENT,
        payment_status="pending"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return {
        "success": True,
        "order_id": new_order.id,
        "order_number": order_number,
        "subtotal": subtotal,
        "tax": tax_amount,
        "service_fee": CUSTOMER_SERVICE_FEE,  # Customer service fee ($1.00)
        "delivery_fee": DELIVERY_FEE,          # Delivery fee to driver
        "tip": order_data.tip,
        "platform_fee": CUSTOMER_SERVICE_FEE,  # Legacy field (same as service_fee)
        "total": total_amount,
        "status": "Pending Payment",
        "processed_by": ai_employee["name"],
        "restaurant": vendor.restaurant_name or vendor.company_name,
        "fee_breakdown": {
            "customer_pays": {
                "subtotal": subtotal,
                "tax": tax_amount,
                "service_fee": CUSTOMER_SERVICE_FEE,
                "delivery_fee": DELIVERY_FEE,
                "tip": order_data.tip,
                "total": total_amount
            },
            "restaurant_deduction": {
                "platform_fee": RESTAURANT_PLATFORM_FEE,
                "description": "Deducted from restaurant payout"
            },
            "driver_receives": {
                "delivery_fee": DELIVERY_FEE,
                "tip": order_data.tip,
                "total": DELIVERY_FEE + order_data.tip
            },
            "platform_revenue": {
                "from_customer_service_fee": CUSTOMER_SERVICE_FEE,
                "from_restaurant_fee": RESTAURANT_PLATFORM_FEE,
                "total": CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE
            }
        }
    }


# ==================== PAYMENT CONFIRMATION ====================

@router.post("/orders/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Confirm payment received - Called after Stripe webhook
    Automatically sends order to restaurant for acceptance (3-min window)
    AI Employee: OrderBot Alpha
    """
    ai_employee = AI_EMPLOYEES["ORDER_PROCESSOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "succeeded"
    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.now()

    # Automatically send to restaurant for acceptance
    order.status = OrderStatus.PENDING_RESTAURANT
    order.sent_to_restaurant_at = datetime.now()

    db.commit()

    # Send push notification to vendor/restaurant about new order
    try:
        # Parse items to get count
        items_count = 0
        if order.items:
            import json
            items_data = json.loads(order.items) if isinstance(order.items, str) else order.items
            items_count = sum(item.get("quantity", 1) for item in items_data)

        send_push_notification(
            user_type="vendor",
            user_id=order.vendor_id,
            title="🔔 New Order!",
            body=f"Order #{order.order_number} - {items_count} item(s) - ${order.total_amount:.2f}",
            data={
                "type": "new_order",
                "order_id": str(order.id),
                "order_number": order.order_number,
                "total_amount": str(order.total_amount)
            }
        )
        logger.info(f"Push notification sent to vendor {order.vendor_id} for order {order.order_number}")
    except Exception as e:
        # Don't fail the order if notification fails - restaurant can still poll
        logger.warning(f"Failed to send push notification to vendor: {str(e)}")

    timeout_at = order.sent_to_restaurant_at + timedelta(seconds=RESTAURANT_ACCEPTANCE_WINDOW_SECONDS)
    window_minutes = RESTAURANT_ACCEPTANCE_WINDOW_SECONDS // 60

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "pending_restaurant",
        "sent_to_restaurant_at": order.sent_to_restaurant_at.isoformat(),
        "timeout_at": timeout_at.isoformat(),
        "window_seconds": RESTAURANT_ACCEPTANCE_WINDOW_SECONDS,
        "processed_by": ai_employee["name"],
        "message": f"Payment confirmed. Order sent to restaurant. They have {window_minutes} minutes to accept."
    }


# ==================== RESTAURANT ACCEPTANCE WINDOW ====================


class RestaurantDeclineRequest(BaseModel):
    reason: Optional[str] = None


class RestaurantAcceptRequest(BaseModel):
    """Request body for restaurant accepting an order with optional prep time."""
    estimated_prep_minutes: Optional[int] = 15  # Default 15 minutes


@router.post("/orders/{order_id}/send-to-restaurant")
async def send_to_restaurant(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Send confirmed order to restaurant for acceptance.
    Restaurant has configurable window to accept or decline.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.CONFIRMED:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be CONFIRMED to send to restaurant. Current: {order.status.value}"
        )

    order.status = OrderStatus.PENDING_RESTAURANT
    order.sent_to_restaurant_at = datetime.now()

    db.commit()

    timeout_at = order.sent_to_restaurant_at + timedelta(seconds=RESTAURANT_ACCEPTANCE_WINDOW_SECONDS)
    window_minutes = RESTAURANT_ACCEPTANCE_WINDOW_SECONDS // 60

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "pending_restaurant",
        "sent_at": order.sent_to_restaurant_at.isoformat(),
        "timeout_at": timeout_at.isoformat(),
        "window_seconds": RESTAURANT_ACCEPTANCE_WINDOW_SECONDS,
        "processed_by": ai_employee["name"],
        "message": f"Order sent to restaurant. They have {window_minutes} minutes to accept."
    }


@router.post("/orders/{order_id}/restaurant-accept")
async def restaurant_accept(
    order_id: int,
    request: Optional[RestaurantAcceptRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Restaurant accepts the order within acceptance window.
    Moves order to PREPARING status.
    Triggers KOT (Kitchen Order Ticket) print to POS system if configured.
    Notifies nearby drivers with ETA so they can head to restaurant early.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be PENDING_RESTAURANT to accept. Current: {order.status.value}"
        )

    # Check if within acceptance window
    if order.sent_to_restaurant_at:
        elapsed = (datetime.now() - order.sent_to_restaurant_at).total_seconds()
        if elapsed > RESTAURANT_ACCEPTANCE_WINDOW_SECONDS:
            order.status = OrderStatus.RESTAURANT_TIMEOUT
            order.restaurant_timeout_at = datetime.now()
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Acceptance window expired. Order timed out."
            )

    # Get prep time from request or use default
    prep_minutes = request.estimated_prep_minutes if request else 15
    if prep_minutes is None or prep_minutes < 1:
        prep_minutes = 15  # Default to 15 minutes

    order.status = OrderStatus.PREPARING
    order.restaurant_accepted_at = datetime.now()
    order.preparing_at = datetime.now()
    order.estimated_prep_minutes = prep_minutes
    order.estimated_ready_at = datetime.now() + timedelta(minutes=prep_minutes)

    db.commit()

    # Trigger KOT (Kitchen Order Ticket) print to POS system
    kot_result = {"success": True, "pos_type": "none", "message": "No KOT integration"}
    vendor = None
    try:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        if vendor and getattr(vendor, 'kot_enabled', False) and getattr(vendor, 'kot_auto_print', True):
            from kot_integrations import KOTService
            kot_result = await KOTService.send_to_pos(order, vendor)
            logger.info(f"KOT result for order {order.order_number}: {kot_result}")
    except Exception as e:
        logger.error(f"KOT integration error for order {order.order_number}: {e}")
        kot_result = {"success": False, "pos_type": "unknown", "error": str(e)}

    # ==================== SEND PUSH NOTIFICATION TO CUSTOMER ====================
    notification_sent = False
    try:
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer and customer.push_token:
            restaurant_name = vendor.restaurant_name if vendor else "The restaurant"
            notification_sent = send_push_notification(
                user_type="customer",
                user_id=customer.id,
                title="Order Confirmed!",
                body=f"{restaurant_name} is now preparing your order.",
                data={
                    "type": "order_accepted",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": "preparing"
                },
                db=db
            )
            logging.info(f"Order accepted notification sent to customer {customer.id}")
    except Exception as e:
        logging.error(f"Failed to send order accepted notification: {e}")

    # ==================== NOTIFY NEARBY DRIVERS ====================
    # Early notification lets drivers head to restaurant while food is being prepared
    drivers_notified = 0
    try:
        drivers_notified = notify_drivers_new_order(order, prep_minutes, vendor, db)
        logger.info(f"Notified {drivers_notified} drivers about order {order.order_number} (ready in {prep_minutes} min)")
    except Exception as e:
        logger.error(f"Failed to notify drivers for order {order.order_number}: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "preparing",
        "accepted_at": order.restaurant_accepted_at.isoformat(),
        "estimated_prep_minutes": order.estimated_prep_minutes,
        "estimated_ready_at": (order.estimated_ready_at.isoformat() + "Z") if order.estimated_ready_at else None,
        "notification_sent": notification_sent,
        "drivers_notified": drivers_notified,
        "processed_by": ai_employee["name"],
        "message": f"Restaurant accepted order. Ready in ~{prep_minutes} minutes. {drivers_notified} drivers notified.",
        "kot_print": kot_result
    }


@router.post("/orders/{order_id}/restaurant-decline")
async def restaurant_decline(
    order_id: int,
    request: RestaurantDeclineRequest,
    db: Session = Depends(get_db)
):
    """
    Restaurant declines the order within acceptance window.
    Customer will receive full refund.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be PENDING_RESTAURANT to decline. Current: {order.status.value}"
        )

    order.status = OrderStatus.DECLINED_BY_RESTAURANT
    order.restaurant_declined_at = datetime.now()
    order.decline_reason = request.reason or "No reason provided"

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "declined_by_restaurant",
        "declined_at": order.restaurant_declined_at.isoformat(),
        "reason": order.decline_reason,
        "refund_required": True,
        "processed_by": ai_employee["name"],
        "message": "Restaurant declined order. Customer refund initiated."
    }


@router.post("/orders/{order_id}/check-restaurant-timeout")
async def check_restaurant_timeout(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Check if restaurant acceptance window has expired.
    Called by background job or when checking order status.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_RESTAURANT:
        return {
            "success": True,
            "order_id": order.id,
            "timed_out": False,
            "message": f"Order not pending restaurant. Status: {order.status.value}"
        }

    if not order.sent_to_restaurant_at:
        return {
            "success": True,
            "order_id": order.id,
            "timed_out": False,
            "message": "Order sent_to_restaurant_at not set"
        }

    elapsed = (datetime.now() - order.sent_to_restaurant_at).total_seconds()

    if elapsed > RESTAURANT_ACCEPTANCE_WINDOW_SECONDS:
        order.status = OrderStatus.RESTAURANT_TIMEOUT
        order.restaurant_timeout_at = datetime.now()
        db.commit()

        return {
            "success": True,
            "order_id": order.id,
            "order_number": order.order_number,
            "timed_out": True,
            "elapsed_seconds": elapsed,
            "status": "restaurant_timeout",
            "refund_required": True,
            "processed_by": ai_employee["name"],
            "message": "Restaurant did not respond. Order timed out. Customer refund initiated."
        }

    remaining = RESTAURANT_ACCEPTANCE_WINDOW_SECONDS - elapsed

    return {
        "success": True,
        "order_id": order.id,
        "timed_out": False,
        "elapsed_seconds": elapsed,
        "remaining_seconds": remaining,
        "message": f"Restaurant has {int(remaining)} seconds remaining to respond."
    }


@router.get("/orders/pending-restaurant")
async def get_pending_restaurant_orders(
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all orders pending restaurant acceptance.
    Used by restaurant app to show incoming orders.
    AI Employee: KitchenBot Beta
    """
    query = db.query(Order).filter(Order.status == OrderStatus.PENDING_RESTAURANT)

    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)

    orders = query.order_by(Order.sent_to_restaurant_at.desc()).all()

    result = []
    for order in orders:
        elapsed = 0
        remaining = RESTAURANT_ACCEPTANCE_WINDOW_SECONDS
        if order.sent_to_restaurant_at:
            elapsed = (datetime.now() - order.sent_to_restaurant_at).total_seconds()
            remaining = max(0, RESTAURANT_ACCEPTANCE_WINDOW_SECONDS - elapsed)

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "vendor_id": order.vendor_id,
            "customer_name": order.customer_name,
            "items": json.loads(order.items) if order.items else [],
            "subtotal": float(order.subtotal) if order.subtotal else 0,
            "sent_at": order.sent_to_restaurant_at.isoformat() if order.sent_to_restaurant_at else None,
            "elapsed_seconds": int(elapsed),
            "remaining_seconds": int(remaining),
            "is_urgent": remaining < RESTAURANT_URGENT_THRESHOLD_SECONDS
        })

    return {
        "success": True,
        "count": len(result),
        "orders": result
    }


# ==================== DELIVERY DECISION WINDOW (3 minutes) ====================

@router.post("/orders/{order_id}/request-delivery-decision")
async def request_delivery_decision(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Called when order is READY_FOR_PICKUP to ask restaurant if they want to self-deliver.
    Starts the 3-minute delivery decision window.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.READY_FOR_PICKUP:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be READY_FOR_PICKUP to request delivery decision. Current: {order.status.value}"
        )

    order.status = OrderStatus.PENDING_DELIVERY_DECISION
    order.delivery_decision_sent_at = datetime.now()

    db.commit()

    timeout_at = order.delivery_decision_sent_at + timedelta(seconds=DELIVERY_DECISION_WINDOW_SECONDS)
    window_minutes = DELIVERY_DECISION_WINDOW_SECONDS // 60

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "pending_delivery_decision",
        "sent_at": order.delivery_decision_sent_at.isoformat(),
        "timeout_at": timeout_at.isoformat(),
        "window_seconds": DELIVERY_DECISION_WINDOW_SECONDS,
        "processed_by": ai_employee["name"],
        "message": f"Restaurant has {window_minutes} minutes to decide on delivery. If no response, order goes to drivers."
    }


@router.post("/orders/{order_id}/restaurant-accept-delivery")
async def restaurant_accept_delivery(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Restaurant accepts to self-deliver the order.
    Order will be delivered by the restaurant, not a driver.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Allow delivery decision from multiple statuses (for "Accept & I'll Deliver" flow)
    # Auto-transition to PENDING_DELIVERY_DECISION if in preparation states
    allowed_statuses = [
        OrderStatus.PENDING_DELIVERY_DECISION,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CONFIRMED,
        OrderStatus.PENDING_RESTAURANT
    ]

    if order.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept delivery for order in {order.status.value} status"
        )

    # Auto-start delivery decision window if not already started
    if order.status != OrderStatus.PENDING_DELIVERY_DECISION:
        order.delivery_decision_sent_at = datetime.now()

    # Check if within decision window
    if order.delivery_decision_sent_at:
        elapsed = (datetime.now() - order.delivery_decision_sent_at).total_seconds()
        if elapsed > DELIVERY_DECISION_WINDOW_SECONDS:
            order.status = OrderStatus.DELIVERY_DECISION_TIMEOUT
            order.delivery_decision_timeout_at = datetime.now()
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Delivery decision window expired. Order sent to drivers."
            )

    order.status = OrderStatus.RESTAURANT_WILL_DELIVER
    order.restaurant_will_deliver = True
    order.delivery_decision_at = datetime.now()

    db.commit()

    # ==================== SEND PUSH NOTIFICATION TO CUSTOMER ====================
    notification_sent = False
    try:
        from models import Customer, Vendor
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        restaurant_name = vendor.restaurant_name if vendor else "The restaurant"

        if customer:
            notification_sent = send_push_notification(
                user_type="customer",
                user_id=customer.id,
                title="Your order is on its way!",
                body=f"{restaurant_name} is delivering your order directly to you.",
                data={
                    "type": "order_status",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": "restaurant_will_deliver",
                    "action": "track_order"
                },
                db=db
            )
            logger.info(f"Self-delivery notification sent to customer {customer.id} for order {order.order_number}")
    except Exception as e:
        logger.error(f"Failed to send self-delivery push notification: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "restaurant_will_deliver",
        "decided_at": order.delivery_decision_at.isoformat(),
        "self_delivery": True,
        "notification_sent": notification_sent,
        "processed_by": ai_employee["name"],
        "message": "Restaurant will self-deliver this order."
    }


@router.post("/orders/{order_id}/restaurant-decline-delivery")
async def restaurant_decline_delivery(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Restaurant declines to self-deliver. Order goes to driver pool.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Allow decline from multiple statuses (for "Accept & Send to Driver" flow)
    allowed_statuses = [
        OrderStatus.PENDING_DELIVERY_DECISION,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CONFIRMED,
        OrderStatus.PENDING_RESTAURANT
    ]

    if order.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot decline delivery for order in {order.status.value} status"
        )

    # Restaurant declined - order goes back to READY_FOR_PICKUP for drivers
    order.status = OrderStatus.READY_FOR_PICKUP
    order.restaurant_will_deliver = False
    order.delivery_decision_at = datetime.now()

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "ready_for_pickup",
        "decided_at": order.delivery_decision_at.isoformat(),
        "self_delivery": False,
        "available_for_drivers": True,
        "processed_by": ai_employee["name"],
        "message": "Restaurant declined delivery. Order is now available for drivers."
    }


@router.get("/orders/pending-delivery-decision")
async def get_pending_delivery_decision_orders(
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all orders pending delivery decision from restaurant.
    Used by restaurant app to show orders waiting for delivery decision.
    AI Employee: KitchenBot Beta
    """
    query = db.query(Order).filter(Order.status == OrderStatus.PENDING_DELIVERY_DECISION)

    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)

    orders = query.order_by(Order.delivery_decision_sent_at.desc()).all()

    result = []
    for order in orders:
        elapsed = 0
        remaining = DELIVERY_DECISION_WINDOW_SECONDS
        if order.delivery_decision_sent_at:
            elapsed = (datetime.now() - order.delivery_decision_sent_at).total_seconds()
            remaining = max(0, DELIVERY_DECISION_WINDOW_SECONDS - elapsed)

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "vendor_id": order.vendor_id,
            "customer_name": order.customer_name,
            "delivery_address": json.loads(order.delivery_address) if order.delivery_address else None,
            "sent_at": order.delivery_decision_sent_at.isoformat() if order.delivery_decision_sent_at else None,
            "elapsed_seconds": int(elapsed),
            "remaining_seconds": int(remaining),
            "is_urgent": remaining < DELIVERY_DECISION_URGENT_THRESHOLD_SECONDS
        })

    return {
        "success": True,
        "count": len(result),
        "orders": result
    }


# ==================== BACKGROUND SCHEDULER FOR TIMEOUTS ====================

# Scheduler check interval (seconds)
TIMEOUT_CHECK_INTERVAL_SECONDS = 30


def check_restaurant_timeouts_job():
    """
    Background job to automatically detect and handle restaurant timeouts.
    Runs every 30 seconds to check for orders that have exceeded the 3-minute window.
    """
    db = SessionLocal()
    try:
        # Find all orders pending restaurant response
        pending_orders = db.query(Order).filter(
            Order.status == OrderStatus.PENDING_RESTAURANT,
            Order.sent_to_restaurant_at.isnot(None)
        ).all()

        timed_out_count = 0
        for order in pending_orders:
            elapsed = (datetime.now() - order.sent_to_restaurant_at).total_seconds()

            if elapsed > RESTAURANT_ACCEPTANCE_WINDOW_SECONDS:
                # Timeout - update order status
                order.status = OrderStatus.RESTAURANT_TIMEOUT
                order.restaurant_timeout_at = datetime.now()
                timed_out_count += 1

                logger.info(
                    f"Order {order.order_number} timed out after {int(elapsed)}s. "
                    f"Refund required."
                )

                # TODO: Trigger refund via Stripe
                # TODO: Send push notification to customer

        if timed_out_count > 0:
            db.commit()
            logger.info(f"Restaurant timeout check: {timed_out_count} orders timed out")

    except Exception as e:
        logger.error(f"Error in restaurant timeout check: {e}")
        db.rollback()
    finally:
        db.close()


def check_delivery_decision_timeouts_job():
    """
    Background job to check for delivery decision timeouts.
    If restaurant doesn't decide in 3 minutes, order goes to driver pool.
    Runs every 30 seconds.
    """
    db = SessionLocal()
    try:
        # Find all orders pending delivery decision
        pending_orders = db.query(Order).filter(
            Order.status == OrderStatus.PENDING_DELIVERY_DECISION,
            Order.delivery_decision_sent_at.isnot(None)
        ).all()

        timed_out_count = 0
        for order in pending_orders:
            elapsed = (datetime.now() - order.delivery_decision_sent_at).total_seconds()

            if elapsed > DELIVERY_DECISION_WINDOW_SECONDS:
                # Timeout - send to driver pool
                order.status = OrderStatus.READY_FOR_PICKUP
                order.delivery_decision_timeout_at = datetime.now()
                order.restaurant_will_deliver = False
                timed_out_count += 1

                logger.info(
                    f"Order {order.order_number} delivery decision timed out after {int(elapsed)}s. "
                    f"Sending to driver pool."
                )

                # TODO: Send push notification to nearby drivers
                # TODO: Send push notification to restaurant

        if timed_out_count > 0:
            db.commit()
            logger.info(f"Delivery decision timeout check: {timed_out_count} orders sent to drivers")

    except Exception as e:
        logger.error(f"Error in delivery decision timeout check: {e}")
        db.rollback()
    finally:
        db.close()


# Initialize the background scheduler
restaurant_timeout_scheduler = BackgroundScheduler()
restaurant_timeout_scheduler.add_job(
    check_restaurant_timeouts_job,
    IntervalTrigger(seconds=TIMEOUT_CHECK_INTERVAL_SECONDS),
    id="restaurant_timeout_checker",
    name="Check for restaurant acceptance timeouts",
    replace_existing=True
)
restaurant_timeout_scheduler.add_job(
    check_delivery_decision_timeouts_job,
    IntervalTrigger(seconds=TIMEOUT_CHECK_INTERVAL_SECONDS),
    id="delivery_decision_timeout_checker",
    name="Check for delivery decision timeouts",
    replace_existing=True
)


def start_timeout_scheduler():
    """Start the background scheduler for timeout checks"""
    if not restaurant_timeout_scheduler.running:
        restaurant_timeout_scheduler.start()
        logger.info(
            f"Timeout scheduler started. "
            f"Checking every {TIMEOUT_CHECK_INTERVAL_SECONDS}s for: "
            f"restaurant acceptance ({RESTAURANT_ACCEPTANCE_WINDOW_SECONDS}s window), "
            f"delivery decision ({DELIVERY_DECISION_WINDOW_SECONDS}s window)."
        )


def stop_timeout_scheduler():
    """Stop the background scheduler"""
    if restaurant_timeout_scheduler.running:
        restaurant_timeout_scheduler.shutdown()
        logger.info("Restaurant timeout scheduler stopped.")


# ==================== RESTAURANT FLOW ====================

@router.post("/orders/{order_id}/start-preparing")
async def start_preparing(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Restaurant starts preparing order - Called from iOS Restaurant App
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.PREPARING
    order.preparing_at = datetime.now()

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Preparing",
        "processed_by": ai_employee["name"]
    }


@router.post("/orders/{order_id}/ready-for-pickup")
async def ready_for_pickup(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Order ready for driver pickup - Called from iOS Restaurant App.
    This starts the 3-minute delivery decision window for restaurant to decide
    if they want to self-deliver or let drivers handle it.
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in [OrderStatus.PREPARING]:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be PREPARING to mark as ready. Current: {order.status.value}"
        )

    # Start the delivery decision window - restaurant has 3 min to decide
    order.status = OrderStatus.PENDING_DELIVERY_DECISION
    order.delivery_decision_sent_at = datetime.now()

    db.commit()

    timeout_at = order.delivery_decision_sent_at + timedelta(seconds=DELIVERY_DECISION_WINDOW_SECONDS)
    window_minutes = DELIVERY_DECISION_WINDOW_SECONDS // 60

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "pending_delivery_decision",
        "delivery_decision_sent_at": order.delivery_decision_sent_at.isoformat(),
        "timeout_at": timeout_at.isoformat(),
        "window_seconds": DELIVERY_DECISION_WINDOW_SECONDS,
        "processed_by": ai_employee["name"],
        "message": f"Order ready! You have {window_minutes} minutes to decide: self-deliver or send to drivers."
    }


# ==================== VENDOR ORDER MANAGEMENT ====================

@router.get("/orders/vendor/{vendor_id}")
async def get_vendor_orders(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all orders for a vendor - Called from iOS Restaurant App
    Includes driver details (name, phone, vehicle) for pickup coordination
    """
    orders = db.query(Order).filter(
        Order.vendor_id == vendor_id
    ).order_by(Order.created_at.desc()).limit(100).all()

    result = []
    for order in orders:
        # Safely parse items JSON and normalize fields for iOS compatibility
        items_data = []
        if order.items:
            try:
                raw_items = json.loads(order.items)
                # Normalize item fields: iOS expects unit_price and total_price
                for item in raw_items:
                    price = item.get("price") or item.get("unit_price") or 0
                    quantity = item.get("quantity") or 1
                    items_data.append({
                        "menu_item_id": item.get("menu_item_id"),
                        "name": item.get("name", "Item"),
                        "quantity": quantity,
                        "price": price,
                        "unit_price": price,  # iOS expects this
                        "total_price": round(price * quantity, 2)  # iOS expects this
                    })
            except (json.JSONDecodeError, TypeError):
                items_data = []

        # Safely parse delivery address JSON
        delivery_addr = {}
        if order.delivery_address:
            try:
                delivery_addr = json.loads(order.delivery_address)
            except (json.JSONDecodeError, TypeError):
                # If not valid JSON, treat as string address
                delivery_addr = {"address": str(order.delivery_address)}

        # Get driver details if assigned
        driver_info = None
        if order.driver_id:
            driver = db.query(Driver).filter(Driver.id == order.driver_id).first()
            if driver:
                driver_info = {
                    "id": driver.id,
                    "name": f"{driver.first_name} {driver.last_name}",
                    "phone": driver.phone,
                    "photo_url": driver.photo_url,
                    "rating": driver.rating,
                    "vehicle": f"{driver.vehicle_color or ''} {driver.vehicle_make or ''} {driver.vehicle_model or ''}".strip() or None,
                    "vehicle_make": driver.vehicle_make,
                    "vehicle_model": driver.vehicle_model,
                    "vehicle_color": driver.vehicle_color,
                    "license_plate": driver.license_plate
                }

        # Calculate driver ETA if en-route
        driver_eta_text = None
        if order.driver_en_route and order.driver_eta_to_restaurant:
            # Calculate remaining time based on when driver accepted
            if order.driver_accepted_at:
                elapsed = (datetime.now() - order.driver_accepted_at).total_seconds() / 60
                remaining = max(0, order.driver_eta_to_restaurant - int(elapsed))
                driver_eta_text = f"~{remaining} min" if remaining > 0 else "arriving"
            else:
                driver_eta_text = f"~{order.driver_eta_to_restaurant} min"

        result.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            "vendor_id": order.vendor_id,
            "customer_id": order.customer_id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "customer_phone": order.customer_phone,
            "items": items_data,
            "subtotal": order.subtotal,
            "tax": order.tax_amount,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "total": order.total_amount,
            "delivery_address": delivery_addr,
            "delivery_instructions": order.delivery_instructions,
            # Driver info for pickup coordination
            "driver_id": order.driver_id,
            "driver_name": order.driver_name,
            "driver": driver_info,
            # Early driver acceptance fields
            "driver_en_route": order.driver_en_route if hasattr(order, 'driver_en_route') else False,
            "driver_accepted_at": (order.driver_accepted_at.isoformat() + "Z") if getattr(order, 'driver_accepted_at', None) else None,
            "driver_eta_to_restaurant": order.driver_eta_to_restaurant if hasattr(order, 'driver_eta_to_restaurant') else None,
            "driver_eta_text": driver_eta_text,
            # Prep time ETA
            "estimated_prep_minutes": order.estimated_prep_minutes if hasattr(order, 'estimated_prep_minutes') else None,
            "estimated_ready_at": (order.estimated_ready_at.isoformat() + "Z") if getattr(order, 'estimated_ready_at', None) else None,
            # Timestamps
            "created_at": (order.created_at.isoformat() + "Z") if order.created_at else None,
            "confirmed_at": (order.confirmed_at.isoformat() + "Z") if order.confirmed_at else None,
            "picked_up_at": (getattr(order, 'picked_up_at', None).isoformat() + "Z") if getattr(order, 'picked_up_at', None) else None,
            "delivered_at": (order.delivered_at.isoformat() + "Z") if order.delivered_at else None
        })

    return {"success": True, "orders": result}


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """
    Update order status - Called from iOS Restaurant App
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Map status string to enum
    status_map = {
        "pending_payment": OrderStatus.PENDING_PAYMENT,
        "confirmed": OrderStatus.CONFIRMED,
        "preparing": OrderStatus.PREPARING,
        "ready_for_pickup": OrderStatus.READY_FOR_PICKUP,
        "out_for_delivery": OrderStatus.OUT_FOR_DELIVERY,
        "delivered": OrderStatus.DELIVERED,
        "cancelled": OrderStatus.CANCELLED
    }

    new_status = status_map.get(status.lower())
    if not new_status:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Set timestamps based on status
    if new_status == OrderStatus.CONFIRMED:
        order.status = new_status
        order.confirmed_at = datetime.now()
    elif new_status == OrderStatus.PREPARING:
        order.status = new_status
        order.preparing_at = datetime.now()
    elif new_status == OrderStatus.READY_FOR_PICKUP:
        # When marked ready, automatically start the 3-minute delivery decision window
        # This allows restaurant to choose "I will deliver" or "Send to driver pool"
        order.status = OrderStatus.PENDING_DELIVERY_DECISION
        order.ready_for_pickup_at = datetime.now()
        order.delivery_decision_sent_at = datetime.now()
    elif new_status == OrderStatus.DELIVERED:
        order.status = new_status
        order.delivered_at = datetime.now()
    else:
        order.status = new_status

    db.commit()

    # Calculate timeout for delivery decision window
    response = {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status.value
    }

    # Add delivery decision info if in that window
    if order.status == OrderStatus.PENDING_DELIVERY_DECISION and order.delivery_decision_sent_at:
        timeout_at = order.delivery_decision_sent_at + timedelta(seconds=DELIVERY_DECISION_WINDOW_SECONDS)
        response["delivery_decision_sent_at"] = order.delivery_decision_sent_at.isoformat()
        response["timeout_at"] = timeout_at.isoformat()
        response["window_seconds"] = DELIVERY_DECISION_WINDOW_SECONDS
        response["message"] = "Order ready! Choose to self-deliver or send to driver pool."

    return response


# ==================== DRIVER FLOW ====================

@router.get("/orders/available-for-delivery")
async def get_available_orders(
    db: Session = Depends(get_db)
):
    """
    Get orders ready for driver pickup - Called from iOS Driver App
    """
    orders = db.query(Order).filter(
        Order.status.in_([OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]),
        Order.driver_id.is_(None)
    ).all()

    result = []
    for order in orders:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        # Safely parse delivery address
        delivery_addr = {}
        if order.delivery_address:
            try:
                delivery_addr = json.loads(order.delivery_address)
            except (json.JSONDecodeError, TypeError):
                delivery_addr = {"address": str(order.delivery_address)}
        # Calculate minutes until ready
        minutes_until_ready = None
        if order.estimated_ready_at:
            delta = order.estimated_ready_at - datetime.now()
            minutes_until_ready = max(0, int(delta.total_seconds() / 60))

        result.append({
            "id": order.id,
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            # iOS Driver app expects "restaurant" and "pickup_address" keys
            "restaurant": vendor.restaurant_name if vendor else "Unknown",
            "pickup_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
            "customer_name": order.customer_name,
            "customer_address": delivery_addr.get("street", delivery_addr.get("address", "")) + ", " + delivery_addr.get("city", ""),
            "customer_phone": order.customer_phone,
            "pickup_latitude": vendor.latitude if vendor and hasattr(vendor, 'latitude') else None,
            "pickup_longitude": vendor.longitude if vendor and hasattr(vendor, 'longitude') else None,
            # Use JSON coordinates first, fall back to dedicated columns
            "dropoff_latitude": delivery_addr.get("latitude") or (order.delivery_latitude if hasattr(order, 'delivery_latitude') else None),
            "dropoff_longitude": delivery_addr.get("longitude") or (order.delivery_longitude if hasattr(order, 'delivery_longitude') else None),
            "estimated_distance": None,
            "estimated_duration": 30,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "total_earnings": (order.delivery_fee or 0) + (order.tip or 0),
            "created_at": (order.created_at.isoformat() + "Z") if order.created_at else None,
            "assigned_at": None,
            "picked_up_at": None,
            "delivered_at": None,
            # ETA fields for early driver notification
            "estimated_prep_minutes": order.estimated_prep_minutes,
            "estimated_ready_at": (order.estimated_ready_at.isoformat() + "Z") if order.estimated_ready_at else None,
            "minutes_until_ready": minutes_until_ready,
            "is_ready": order.status == OrderStatus.READY_FOR_PICKUP
        })

    return {"success": True, "orders": result}


@router.post("/orders/{order_id}/assign-driver")
async def assign_driver(
    order_id: int,
    request: AssignDriverRequest,
    db: Session = Depends(get_db)
):
    """
    Assign driver to order - Called from iOS Driver App
    Supports early driver acceptance (while food is still being prepared).

    Status handling:
    - If PREPARING: Keep status, set driver_en_route=True (driver heading to restaurant)
    - If READY_FOR_PICKUP: Change to OUT_FOR_DELIVERY (driver picking up now)

    AI Employee: DispatchBot Gamma
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Validate order status - only allow assignment for PREPARING or READY_FOR_PICKUP
    valid_statuses = [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP]
    if order.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be PREPARING or READY_FOR_PICKUP to assign driver. Current: {order.status.value}"
        )

    if order.driver_id:
        raise HTTPException(status_code=400, detail="Order already has a driver")

    driver = db.query(Driver).filter(Driver.id == request.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if driver.status not in [DriverStatus.ACTIVE, DriverStatus.APPROVED, DriverStatus.ONLINE]:
        raise HTTPException(status_code=400, detail="Driver is not active")

    # Get vendor for notifications
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"

    # Assign driver
    driver_name = f"{driver.first_name} {driver.last_name}"
    order.driver_id = driver.id
    order.driver_name = driver_name
    order.driver_accepted_at = datetime.now()
    order.dispatched_at = datetime.now()

    # Store driver's ETA to restaurant if provided
    if request.driver_eta_minutes:
        order.driver_eta_to_restaurant = request.driver_eta_minutes

    # Determine if this is early acceptance (food still preparing) or ready pickup
    is_early_acceptance = order.status == OrderStatus.PREPARING
    food_ready = order.status == OrderStatus.READY_FOR_PICKUP

    if is_early_acceptance:
        # Early acceptance: driver heading to restaurant while food prepares
        order.driver_en_route = True
        # Keep status as PREPARING - will change to OUT_FOR_DELIVERY when picked up
        logger.info(f"Early driver acceptance: Driver {driver.id} accepted order {order.order_number} while PREPARING")
    else:
        # Food is ready: driver is picking up now
        order.driver_en_route = False
        order.status = OrderStatus.OUT_FOR_DELIVERY
        logger.info(f"Driver {driver.id} accepted READY order {order.order_number}, status -> OUT_FOR_DELIVERY")

    db.commit()

    # ==================== SEND NOTIFICATIONS ====================
    customer_notified = False
    restaurant_notified = False

    # Calculate ETAs for notifications
    driver_eta_text = f"~{request.driver_eta_minutes} min" if request.driver_eta_minutes else "soon"
    food_eta_text = ""
    if order.estimated_ready_at:
        minutes_until_ready = max(0, int((order.estimated_ready_at - datetime.now()).total_seconds() / 60))
        food_eta_text = f"~{minutes_until_ready} min" if minutes_until_ready > 0 else "ready now"

    # --- Notify Customer ---
    try:
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer and customer.push_token:
            if is_early_acceptance:
                # Early acceptance notification
                title = "Driver Accepted!"
                body = f"{driver_name} is heading to {restaurant_name}. Food ready in {food_eta_text}."
                notif_type = "driver_en_route"
            else:
                # Ready pickup notification
                title = "Driver Picking Up!"
                body = f"{driver_name} is picking up your order now."
                notif_type = "driver_picking_up"

            customer_notified = send_push_notification(
                user_type="customer",
                user_id=customer.id,
                title=title,
                body=body,
                data={
                    "type": notif_type,
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "driver_id": str(driver.id),
                    "driver_name": driver_name,
                    "driver_phone": driver.phone,
                    "driver_photo_url": getattr(driver, 'photo_url', None),
                    "is_early_acceptance": str(is_early_acceptance),
                    "food_ready": str(food_ready),
                    "driver_eta_minutes": str(request.driver_eta_minutes) if request.driver_eta_minutes else None,
                    "minutes_until_food_ready": food_eta_text
                },
                db=db
            )
    except Exception as e:
        logger.error(f"Failed to notify customer for order {order.order_number}: {e}")

    # --- Notify Restaurant ---
    try:
        if vendor and vendor.push_token:
            if is_early_acceptance:
                title = "Driver En Route"
                body = f"{driver_name} accepted and is heading to you. Arriving in {driver_eta_text}."
            else:
                title = "Driver Arrived"
                body = f"{driver_name} is here to pick up order #{order.order_number}."

            restaurant_notified = send_push_notification(
                user_type="vendor",
                user_id=vendor.id,
                title=title,
                body=body,
                data={
                    "type": "driver_assigned",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "driver_id": str(driver.id),
                    "driver_name": driver_name,
                    "driver_phone": driver.phone,
                    "driver_photo_url": getattr(driver, 'photo_url', None),
                    "driver_eta_minutes": str(request.driver_eta_minutes) if request.driver_eta_minutes else None,
                    "is_early_acceptance": str(is_early_acceptance)
                },
                db=db
            )
    except Exception as e:
        logger.error(f"Failed to notify restaurant for order {order.order_number}: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status.value,
        "driver_id": driver.id,
        "driver_name": order.driver_name,
        "is_early_acceptance": is_early_acceptance,
        "driver_en_route": order.driver_en_route,
        "customer_notified": customer_notified,
        "restaurant_notified": restaurant_notified,
        "processed_by": ai_employee["name"],
        "message": "Driver heading to restaurant" if is_early_acceptance else "Driver picking up order"
    }


@router.post("/orders/{order_id}/picked-up")
async def order_picked_up(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver picked up order - Called from iOS Driver App
    AI Employee: DispatchBot Gamma
    Sends push notification to customer: "Your order is on the way!"

    This endpoint handles both:
    - Normal flow: READY_FOR_PICKUP -> OUT_FOR_DELIVERY
    - Early acceptance flow: PREPARING (with driver_en_route) -> OUT_FOR_DELIVERY
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Validate order has a driver assigned
    if not order.driver_id:
        raise HTTPException(status_code=400, detail="No driver assigned to this order")

    # Update status and clear en-route flag
    order.status = OrderStatus.OUT_FOR_DELIVERY
    order.picked_up_at = datetime.now()
    order.driver_en_route = False  # Driver has picked up, no longer en-route

    db.commit()

    # ==================== SEND PUSH NOTIFICATION TO CUSTOMER ====================
    notification_sent = False
    try:
        # Get customer for push token
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer and customer.push_token:
            driver_name = order.driver_name or "Your driver"
            notification_sent = send_push_notification(
                user_type="customer",
                user_id=customer.id,
                title="Your order is on the way!",
                body=f"{driver_name} picked up your order and is heading to you now.",
                data={
                    "type": "order_picked_up",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": "out_for_delivery",
                    "driver_name": driver_name
                },
                db=db
            )
            logging.info(f"Pickup notification sent to customer {customer.id} for order {order.order_number}")
    except Exception as e:
        logging.error(f"Failed to send pickup notification: {e}")

    # ==================== SEND PUSH NOTIFICATION TO RESTAURANT ====================
    restaurant_notified = False
    try:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        if vendor and vendor.push_token:
            driver_name = order.driver_name or "Driver"
            restaurant_notified = send_push_notification(
                user_type="vendor",
                user_id=vendor.id,
                title="Order Picked Up ✓",
                body=f"{driver_name} picked up order #{order.order_number}. Order is now out for delivery.",
                data={
                    "type": "order_picked_up",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": "out_for_delivery",
                    "driver_name": driver_name
                },
                db=db
            )
            logging.info(f"Pickup notification sent to vendor {vendor.id} for order {order.order_number}")
    except Exception as e:
        logging.error(f"Failed to send pickup notification to vendor: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Out for Delivery",
        "customer_notified": notification_sent,
        "restaurant_notified": restaurant_notified,
        "processed_by": ai_employee["name"]
    }


@router.post("/orders/{order_id}/delivered")
async def order_delivered(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Order delivered - Called from iOS Driver App
    This triggers the accounting process
    AI Employees: DispatchBot Gamma + LedgerBot Delta
    """
    dispatch_ai = AI_EMPLOYEES["DELIVERY_DISPATCHER"]
    accountant_ai = AI_EMPLOYEES["ACCOUNTANT"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update order status
    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.now()

    # Get vendor
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()

    # Get driver
    driver = db.query(Driver).filter(Driver.id == order.driver_id).first() if order.driver_id else None

    # ==================== CREATE ACCOUNTING ENTRIES ====================

    # Generate entry number
    entry_count = db.query(JournalEntry).count()
    entry_number = f"JE-{datetime.now().strftime('%Y%m%d')}-{entry_count + 1:05d}"

    # Create journal entry
    journal_entry = JournalEntry(
        entry_number=entry_number,
        order_id=order.id,
        entry_type="ORDER_COMPLETED",
        description=f"Order {order.order_number} completed - Payment received from customer",
        status="posted",
        created_by_ai=accountant_ai["id"],
        created_by_ai_name=accountant_ai["name"],
        posted_at=datetime.now()
    )
    db.add(journal_entry)
    db.flush()  # Get the ID

    # Calculate payouts (Dollor.ai $1 flat fee model)
    # Restaurant receives: subtotal minus $1 platform fee (RESTAURANT_PLATFORM_FEE)
    # Driver receives: delivery fee + tip (100% to driver)
    # Platform receives: $1 from customer + $1 from restaurant = $2 total
    restaurant_payout = order.subtotal - RESTAURANT_PLATFORM_FEE
    driver_payout = order.delivery_fee + order.tip
    platform_revenue = CUSTOMER_SERVICE_FEE + RESTAURANT_PLATFORM_FEE  # $1.00 + $1.00 = $2.00

    # Create journal entry lines (double-entry accounting)
    lines = [
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="1000",
            account_name="Cash/Stripe",
            debit=order.total_amount,
            credit=0,
            description=f"Payment received for order {order.order_number}"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2100",
            account_name="Restaurant Payable",
            debit=0,
            credit=restaurant_payout,
            description=f"Payable to {vendor.restaurant_name if vendor else 'Restaurant'} (subtotal - ${RESTAURANT_PLATFORM_FEE} platform fee)"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2200",
            account_name="Driver Payable",
            debit=0,
            credit=driver_payout,
            description=f"Payable to {order.driver_name or 'Driver'} (delivery fee + tip)"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="4000",
            account_name="Platform Revenue - Service Fee",
            debit=0,
            credit=CUSTOMER_SERVICE_FEE,
            description=f"Service fee from customer (${CUSTOMER_SERVICE_FEE})"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="4001",
            account_name="Platform Revenue - Restaurant Fee",
            debit=0,
            credit=RESTAURANT_PLATFORM_FEE,
            description=f"Platform fee from restaurant (${RESTAURANT_PLATFORM_FEE})"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2300",
            account_name="Tax Collected",
            debit=0,
            credit=order.tax_amount,
            description="Sales tax collected"
        )
    ]

    for line in lines:
        db.add(line)

    # ==================== CREATE VENDOR PAYOUT RECORD ====================

    payout_count = db.query(VendorPayout).count()
    vendor_payout = VendorPayout(
        payout_number=f"VP-{datetime.now().strftime('%Y%m%d')}-{payout_count + 1:05d}",
        vendor_id=order.vendor_id,
        period_start=order.created_at,
        period_end=datetime.now(),
        total_orders=1,
        gross_revenue=order.subtotal,
        platform_fee=RESTAURANT_PLATFORM_FEE,  # $1 platform fee from restaurant
        stripe_fees=0,  # Will be calculated separately
        net_payout=restaurant_payout,
        status="pending"
    )
    db.add(vendor_payout)

    # ==================== CREATE DRIVER PAYOUT RECORD ====================

    if driver:
        driver_payout_count = db.query(DriverPayout).count()
        driver_payout_record = DriverPayout(
            payout_number=f"DP-{datetime.now().strftime('%Y%m%d')}-{driver_payout_count + 1:05d}",
            driver_id=driver.id,
            order_id=order.id,
            period_start=order.created_at,
            period_end=datetime.now(),
            total_deliveries=1,
            delivery_fee=order.delivery_fee,
            tip=order.tip,
            bonus=0,
            deductions=0,
            net_payout=driver_payout,
            status="pending"
        )
        db.add(driver_payout_record)

        # Update driver stats
        driver.total_deliveries += 1

    db.commit()

    # ==================== SEND PUSH NOTIFICATION TO CUSTOMER ====================
    notification_sent = False
    try:
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer and customer.push_token:
            notification_sent = send_push_notification(
                user_type="customer",
                user_id=customer.id,
                title="Order Delivered!",
                body=f"Your order from {vendor.restaurant_name if vendor else 'the restaurant'} has arrived. Enjoy your meal!",
                data={
                    "type": "order_delivered",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": "delivered"
                },
                db=db
            )
            logging.info(f"Delivery notification sent to customer {customer.id} for order {order.order_number}")
    except Exception as e:
        logging.error(f"Failed to send delivery push notification: {e}")

    # ==================== SEND THANK YOU EMAIL WITH RECEIPT ====================
    try:
        # Parse order items from JSON
        order_items = []
        if order.items:
            if isinstance(order.items, str):
                order_items = json.loads(order.items)
            elif isinstance(order.items, list):
                order_items = order.items

        # Get delivery address
        delivery_address = ""
        if order.delivery_address:
            if isinstance(order.delivery_address, str):
                try:
                    addr = json.loads(order.delivery_address)
                    delivery_address = f"{addr.get('street', '')}, {addr.get('city', '')} {addr.get('state', '')} {addr.get('zip', '')}"
                except json.JSONDecodeError:
                    delivery_address = order.delivery_address
            elif isinstance(order.delivery_address, dict):
                delivery_address = f"{order.delivery_address.get('street', '')}, {order.delivery_address.get('city', '')} {order.delivery_address.get('state', '')} {order.delivery_address.get('zip', '')}"

        # Send thank you email with receipt
        if order.customer_email:
            send_order_delivered_with_receipt_email(
                to_email=order.customer_email,
                customer_name=order.customer_name or "Valued Customer",
                order_number=order.order_number,
                restaurant_name=vendor.restaurant_name if vendor else "Restaurant",
                order_items=order_items,
                subtotal=float(order.subtotal or 0),
                delivery_fee=float(order.delivery_fee or 0),
                service_fee=float(CUSTOMER_SERVICE_FEE),
                tax_amount=float(order.tax_amount or 0),
                tip=float(order.tip or 0),
                order_total=float(order.total_amount or 0),
                driver_name=order.driver_name or "Your Driver",
                delivery_address=delivery_address,
                order_date=order.created_at.strftime("%B %d, %Y at %I:%M %p") if order.created_at else ""
            )
            logging.info(f"Thank you email sent to {order.customer_email} for order {order.order_number}")
    except Exception as e:
        # Don't fail the delivery if email fails
        logging.error(f"Failed to send thank you email for order {order.order_number}: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Delivered",
        "delivered_at": order.delivered_at.isoformat(),
        "notification_sent": notification_sent,
        "email_sent": bool(order.customer_email),
        "processed_by": [dispatch_ai["name"], accountant_ai["name"]],
        "accounting": {
            "journal_entry": entry_number,
            "restaurant_payout": restaurant_payout,
            "driver_payout": driver_payout,
            "platform_revenue": platform_revenue,  # $2.99 service fee + $1 restaurant fee
            "tax_collected": order.tax_amount,
            "fee_breakdown": {
                "restaurant_platform_fee": RESTAURANT_PLATFORM_FEE,
                "customer_service_fee": CUSTOMER_SERVICE_FEE,
                "delivery_fee": order.delivery_fee,
                "tip": order.tip
            }
        }
    }


# ==================== PAYOUTS ====================

@router.get("/payouts/pending")
async def get_pending_payouts(
    db: Session = Depends(get_db)
):
    """
    Get all pending payouts - Restaurant & Driver
    """
    vendor_payouts = db.query(VendorPayout).filter(VendorPayout.status == "pending").all()
    driver_payouts = db.query(DriverPayout).filter(DriverPayout.status == "pending").all()

    return {
        "success": True,
        "restaurant_payouts": [{
            "id": p.id,
            "payout_number": p.payout_number,
            "vendor_id": p.vendor_id,
            "gross_revenue": p.gross_revenue,
            "platform_fee": p.platform_fee,
            "net_payout": p.net_payout,
            "status": p.status,
            "created_at": p.created_at.isoformat()
        } for p in vendor_payouts],
        "driver_payouts": [{
            "id": p.id,
            "payout_number": p.payout_number,
            "driver_id": p.driver_id,
            "delivery_fee": p.delivery_fee,
            "tip": p.tip,
            "net_payout": p.net_payout,
            "status": p.status,
            "created_at": p.created_at.isoformat()
        } for p in driver_payouts],
        "totals": {
            "restaurant_total": sum(p.net_payout for p in vendor_payouts),
            "driver_total": sum(p.net_payout for p in driver_payouts)
        }
    }


@router.post("/payouts/{payout_id}/process")
async def process_payout(
    payout_id: int,
    payout_type: str,  # "vendor" or "driver"
    db: Session = Depends(get_db)
):
    """
    Process a payout - Mark as completed
    AI Employee: LedgerBot Delta
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    if payout_type == "vendor":
        payout = db.query(VendorPayout).filter(VendorPayout.id == payout_id).first()
    else:
        payout = db.query(DriverPayout).filter(DriverPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    payout.status = "completed"
    payout.paid_at = datetime.now()
    payout.payment_method = "bank_transfer"

    db.commit()

    return {
        "success": True,
        "payout_id": payout.id,
        "payout_number": payout.payout_number,
        "amount": payout.net_payout,
        "status": "completed",
        "processed_by": ai_employee["name"]
    }


# ==================== JOURNAL ENTRIES ====================

@router.get("/journal-entries")
async def get_journal_entries(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get journal entries for accounting dashboard
    """
    entries = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).limit(limit).all()

    result = []
    for entry in entries:
        lines = db.query(JournalEntryLine).filter(
            JournalEntryLine.journal_entry_id == entry.id
        ).all()

        result.append({
            "id": entry.id,
            "entry_number": entry.entry_number,
            "order_id": entry.order_id,
            "entry_type": entry.entry_type,
            "description": entry.description,
            "status": entry.status,
            "created_by": entry.created_by_ai_name,
            "created_at": entry.created_at.isoformat(),
            "lines": [{
                "account": line.account_name,
                "debit": line.debit,
                "credit": line.credit,
                "description": line.description
            } for line in lines],
            "total_debit": sum(line.debit for line in lines),
            "total_credit": sum(line.credit for line in lines)
        })

    return {"success": True, "entries": result}


# ==================== DRIVERS ====================

@router.get("/drivers")
async def get_drivers(
    db: Session = Depends(get_db)
):
    """
    Get all drivers
    """
    drivers = db.query(Driver).all()

    return {
        "success": True,
        "drivers": [{
            "id": d.id,
            "driver_id": d.driver_id,
            "name": f"{d.first_name} {d.last_name}",
            "email": d.email,
            "phone": d.phone,
            "status": d.status.value,
            "rating": d.rating,
            "total_deliveries": d.total_deliveries,
            "is_online": d.is_online
        } for d in drivers]
    }


@router.post("/drivers/create")
async def create_driver(
    driver_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Create a new driver
    """
    driver_count = db.query(Driver).count()
    driver_id = f"DRV-{driver_count + 1:05d}"

    driver = Driver(
        driver_id=driver_id,
        first_name=driver_data.get("first_name"),
        last_name=driver_data.get("last_name"),
        email=driver_data.get("email"),
        phone=driver_data.get("phone"),
        status=DriverStatus.ACTIVE
    )

    db.add(driver)
    db.commit()
    db.refresh(driver)

    return {
        "success": True,
        "driver_id": driver.id,
        "driver_code": driver_id
    }


# ==================== DRIVER AUTHENTICATION ====================

class DriverLoginRequest(BaseModel):
    email: str
    password: str


class DriverRegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


@router.post("/drivers/login")
async def driver_login(
    request: DriverLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Driver login - Returns JWT token for iOS Driver App
    """
    from passlib.context import CryptContext
    from jose import jwt
    from datetime import datetime, timedelta
    import os

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eatfair-driver-secret-key-2024")
    ALGORITHM = "HS256"

    driver = db.query(Driver).filter(Driver.email == request.email).first()
    if not driver:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check password (for Google OAuth users, password is 'google_oauth_<userid>')
    if not pwd_context.verify(request.password, driver.password_hash):
        # Allow Google OAuth passwords
        if not request.password.startswith("google_oauth_"):
            raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT token
    token_data = {
        "sub": str(driver.id),
        "email": driver.email,
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    # Combine first/last name for iOS compatibility (expects 'name' field)
    full_name = f"{driver.first_name or ''} {driver.last_name or ''}".strip() or driver.email.split('@')[0]

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "name": full_name,  # iOS requires combined name field
        "first_name": driver.first_name,
        "last_name": driver.last_name,
        "email": driver.email,
        "phone": driver.phone,
        "vehicle_type": driver.vehicle_type if hasattr(driver, 'vehicle_type') else None,
        "status": driver.status.value,
        "is_approved": driver.status.value == "approved"  # iOS compatibility
    }


@router.post("/drivers/register")
async def driver_register(
    request: DriverRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Driver registration - Creates new driver account for iOS Driver App
    """
    from passlib.context import CryptContext
    from jose import jwt
    from datetime import datetime, timedelta
    import os

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eatfair-driver-secret-key-2024")
    ALGORITHM = "HS256"

    # Check if driver already exists
    existing = db.query(Driver).filter(Driver.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create driver
    driver_count = db.query(Driver).count()
    driver_id = f"DRV-{driver_count + 1:05d}"

    driver = Driver(
        driver_id=driver_id,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        password_hash=pwd_context.hash(request.password),
        status=DriverStatus.ACTIVE
    )

    db.add(driver)
    db.commit()
    db.refresh(driver)

    # Create JWT token
    token_data = {
        "sub": str(driver.id),
        "email": driver.email,
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "first_name": driver.first_name,
        "last_name": driver.last_name,
        "email": driver.email,
        "phone": driver.phone,
        "status": driver.status.value
    }


# ==================== ADDITIONAL DELIVERY ENDPOINTS ====================

@router.get("/orders/driver/{driver_id}/active")
async def get_driver_active_orders(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver's active deliveries - Called from iOS Driver App
    Excludes delivered and cancelled orders to show only active work
    """
    # Filter out completed orders - only show active deliveries
    excluded_statuses = [OrderStatus.DELIVERED, OrderStatus.CANCELLED]
    orders = db.query(Order).filter(
        Order.driver_id == driver_id,
        Order.status.notin_(excluded_statuses)
    ).order_by(Order.created_at.desc()).limit(100).all()

    result = []
    for order in orders:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        # Safely parse delivery address
        delivery_addr = {}
        if order.delivery_address:
            try:
                delivery_addr = json.loads(order.delivery_address)
            except (json.JSONDecodeError, TypeError):
                delivery_addr = {"address": str(order.delivery_address)}

        # Calculate ETA fields for early driver notification
        estimated_ready_at = getattr(order, 'estimated_ready_at', None)
        is_ready = order.status.value.lower() in ["ready", "ready_for_pickup"] if order.status else False
        minutes_until_ready = None
        if estimated_ready_at and not is_ready:
            time_diff = (estimated_ready_at - datetime.now()).total_seconds() / 60
            minutes_until_ready = max(0, int(time_diff))

        result.append({
            "id": order.id,
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            # iOS Driver app expects "restaurant" and "pickup_address" keys
            "restaurant": vendor.restaurant_name if vendor else "Unknown",
            "pickup_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
            # Also include restaurant_name/restaurant_address for backward compatibility
            "restaurant_name": vendor.restaurant_name if vendor else "Unknown",
            "restaurant_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
            "customer_name": order.customer_name,
            "customer_address": delivery_addr.get("street", delivery_addr.get("address", "")) + ", " + delivery_addr.get("city", ""),
            "customer_phone": order.customer_phone,
            "pickup_latitude": vendor.latitude if vendor and hasattr(vendor, 'latitude') else None,
            "pickup_longitude": vendor.longitude if vendor and hasattr(vendor, 'longitude') else None,
            # Use JSON coordinates first, fall back to dedicated columns
            "dropoff_latitude": delivery_addr.get("latitude") or (order.delivery_latitude if hasattr(order, 'delivery_latitude') else None),
            "dropoff_longitude": delivery_addr.get("longitude") or (order.delivery_longitude if hasattr(order, 'delivery_longitude') else None),
            "estimated_distance": None,
            "estimated_duration": 30,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "total_earnings": (order.delivery_fee or 0) + (order.tip or 0),
            "created_at": (order.created_at.isoformat() + "Z") if order.created_at else None,
            "assigned_at": (getattr(order, 'driver_accepted_at', None) or order.dispatched_at or order.confirmed_at).isoformat() + "Z" if (getattr(order, 'driver_accepted_at', None) or order.dispatched_at or order.confirmed_at) else None,
            "picked_up_at": (order.picked_up_at.isoformat() + "Z") if order.picked_up_at else None,
            "delivered_at": (order.delivered_at.isoformat() + "Z") if order.delivered_at else None,
            # ETA fields for early driver notification (matching available-for-delivery endpoint)
            "estimated_prep_minutes": getattr(order, 'estimated_prep_minutes', None),
            "estimated_ready_at": (estimated_ready_at.isoformat() + "Z") if estimated_ready_at else None,
            "minutes_until_ready": minutes_until_ready,
            "is_ready": is_ready
        })

    return {"success": True, "orders": result}


# ==================== Android Compatibility: Pending Orders Alias ====================
# Android app calls /api/erp/orders/driver/{driver_id}/pending
# This is an alias for the /active endpoint - returns same data

@router.get("/orders/driver/{driver_id}/pending")
async def get_driver_pending_orders(
    driver_id: int,
    db: Session = Depends(get_db)
):
    """
    Get driver's pending and assigned orders - Android Driver App compatibility.
    This endpoint is an alias for /orders/driver/{driver_id}/active.
    Android uses: /api/erp/orders/driver/{driverId}/pending
    """
    try:
        # Query orders that are assigned to this driver or ready for pickup
        orders = db.query(Order).filter(
            Order.driver_id == driver_id,
            Order.status.in_([
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.OUT_FOR_DELIVERY
            ])
        ).order_by(Order.created_at.desc()).limit(50).all()

        result = []
        for order in orders:
            vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
            # Safely parse delivery address
            delivery_addr = {}
            if order.delivery_address:
                try:
                    delivery_addr = json.loads(order.delivery_address)
                except (json.JSONDecodeError, TypeError):
                    delivery_addr = {"address": str(order.delivery_address)}

            result.append({
                "id": order.id,
                "order_id": order.id,
                "order_number": order.order_number,
                "status": order.status.value,
                # iOS Driver app expects "restaurant" and "pickup_address" keys
                "restaurant": vendor.restaurant_name if vendor else "Unknown",
                "pickup_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
                # Also include restaurant_name/restaurant_address for backward compatibility
                "restaurant_name": vendor.restaurant_name if vendor else "Unknown",
                "restaurant_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
                "customer_name": order.customer_name,
                "customer_address": delivery_addr.get("street", delivery_addr.get("address", "")) + ", " + delivery_addr.get("city", ""),
                "customer_phone": order.customer_phone,
                "pickup_latitude": vendor.latitude if vendor and hasattr(vendor, 'latitude') else None,
                "pickup_longitude": vendor.longitude if vendor and hasattr(vendor, 'longitude') else None,
                # Use JSON coordinates first, fall back to dedicated columns
                "dropoff_latitude": delivery_addr.get("latitude") or (order.delivery_latitude if hasattr(order, 'delivery_latitude') else None),
                "dropoff_longitude": delivery_addr.get("longitude") or (order.delivery_longitude if hasattr(order, 'delivery_longitude') else None),
                "estimated_distance": None,
                "estimated_duration": 30,
                "delivery_fee": order.delivery_fee,
                "tip": order.tip,
                "created_at": (order.created_at.isoformat() + "Z") if order.created_at else None,
                "assigned_at": (order.confirmed_at.isoformat() + "Z") if order.confirmed_at else None,
                "picked_up_at": (order.picked_up_at.isoformat() + "Z") if order.picked_up_at else None,
                "delivered_at": (order.delivered_at.isoformat() + "Z") if order.delivered_at else None
            })

        return {"success": True, "orders": result, "count": len(result)}
    except Exception as e:
        return {"success": False, "error": str(e), "error_type": type(e).__name__}


@router.put("/orders/{order_id}/complete-delivery")
async def complete_delivery(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete delivery - Called from iOS Driver App
    Wrapper for the delivered endpoint
    """
    return await order_delivered(order_id, db)


@router.put("/orders/{order_id}/unassign-driver")
async def unassign_driver(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver unassigns from order - Called from iOS Driver App
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot unassign from delivered order")

    order.driver_id = None
    order.driver_name = None

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "message": "Driver unassigned from order"
    }


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    updated_at: Optional[str] = None


@router.put("/orders/{order_id}/driver-location")
async def update_driver_location(
    order_id: int,
    location: DriverLocationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver location for order tracking - Called from iOS Driver App
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Store location in order metadata
    order.driver_location = json.dumps({
        "latitude": location.latitude,
        "longitude": location.longitude,
        "updated_at": location.updated_at or datetime.now().isoformat()
    })

    db.commit()

    return {"success": True, "order_id": order.id}


# ==================== ENTERPRISE AUTO-DISPATCH SYSTEM ====================
# AI Employee: DispatchBot Gamma - Intelligent Driver Assignment

class AutoDispatchConfig(BaseModel):
    max_distance_km: float = 10.0
    max_wait_time_seconds: int = 60
    prefer_high_rating: bool = True
    min_driver_rating: float = 4.0


@router.post("/orders/{order_id}/auto-dispatch")
async def auto_dispatch_driver(
    order_id: int,
    config: Optional[AutoDispatchConfig] = None,
    db: Session = Depends(get_db)
):
    """
    Uber-like Auto-Dispatch System
    AI Employee: DispatchBot Gamma

    Algorithm:
    1. Find all available drivers within radius
    2. Score drivers by: distance, rating, acceptance rate, current load
    3. Assign best match
    4. Notify driver via push notification
    5. If no response in 60 sec, move to next driver
    """
    from math import radians, cos, sin, asin, sqrt

    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    if config is None:
        config = AutoDispatchConfig()

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.driver_id:
        return {
            "success": False,
            "message": "Order already has a driver assigned",
            "driver_id": order.driver_id
        }

    # Get restaurant location
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    if not vendor or not vendor.latitude or not vendor.longitude:
        raise HTTPException(status_code=400, detail="Restaurant location not available")

    restaurant_lat = vendor.latitude
    restaurant_lng = vendor.longitude

    # Haversine distance calculation
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Earth radius in km
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        return 2 * R * asin(sqrt(a))

    # Find available drivers (accept both ACTIVE and APPROVED status)
    available_drivers = db.query(Driver).filter(
        Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]),
        Driver.is_online == True,
        Driver.current_latitude.isnot(None),
        Driver.current_longitude.isnot(None)
    ).all()

    if not available_drivers:
        return {
            "success": False,
            "message": "No drivers available",
            "processed_by": ai_employee["name"]
        }

    # Score and rank drivers
    driver_scores = []
    for driver in available_drivers:
        distance = haversine(
            restaurant_lat, restaurant_lng,
            driver.current_latitude, driver.current_longitude
        )

        if distance > config.max_distance_km:
            continue

        if driver.rating < config.min_driver_rating:
            continue

        # Calculate score (lower is better)
        # Distance weight: 40%, Rating weight: 30%, Deliveries weight: 30%
        distance_score = distance / config.max_distance_km * 40
        rating_score = (5.0 - driver.rating) / 5.0 * 30  # Invert: higher rating = lower score

        # Prefer drivers with more experience but not overloaded
        deliveries_today = db.query(Order).filter(
            Order.driver_id == driver.id,
            Order.status == OrderStatus.DELIVERED,
            Order.delivered_at >= datetime.now().replace(hour=0, minute=0, second=0)
        ).count()

        # Sweet spot: 5-15 deliveries/day
        if deliveries_today < 5:
            load_score = 20  # New driver, slight penalty
        elif deliveries_today <= 15:
            load_score = 0   # Optimal range
        else:
            load_score = (deliveries_today - 15) * 5  # Overloaded, penalty

        total_score = distance_score + rating_score + load_score

        driver_scores.append({
            "driver": driver,
            "distance": round(distance, 2),
            "score": round(total_score, 2),
            "rating": driver.rating,
            "deliveries_today": deliveries_today
        })

    if not driver_scores:
        return {
            "success": False,
            "message": "No suitable drivers found within range",
            "config": {
                "max_distance_km": config.max_distance_km,
                "min_rating": config.min_driver_rating
            },
            "processed_by": ai_employee["name"]
        }

    # Sort by score (ascending - lower is better)
    driver_scores.sort(key=lambda x: x["score"])

    # Assign best driver
    best_match = driver_scores[0]
    driver = best_match["driver"]

    order.driver_id = driver.id
    order.driver_name = f"{driver.first_name} {driver.last_name}"
    order.auto_dispatched = True
    order.dispatched_at = datetime.now()

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "assigned_driver": {
            "id": driver.id,
            "name": order.driver_name,
            "phone": driver.phone,
            "rating": driver.rating,
            "distance_km": best_match["distance"],
            "score": best_match["score"]
        },
        "alternatives_available": len(driver_scores) - 1,
        "processed_by": ai_employee["name"],
        "dispatch_algorithm": "proximity_rating_load_balanced"
    }


@router.post("/orders/{order_id}/broadcast-to-drivers")
async def broadcast_order_to_drivers(
    order_id: int,
    radius_km: float = 5.0,
    db: Session = Depends(get_db)
):
    """
    Broadcast order to all nearby drivers (DoorDash/Uber style)
    First driver to accept gets the order
    """
    from math import radians, cos, sin, asin, sqrt

    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Find drivers in radius
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        return 2 * R * asin(sqrt(a))

    drivers = db.query(Driver).filter(
        Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]),
        Driver.is_online == True,
        Driver.current_latitude.isnot(None)
    ).all()

    notified_drivers = []
    for driver in drivers:
        if vendor.latitude and vendor.longitude:
            distance = haversine(
                vendor.latitude, vendor.longitude,
                driver.current_latitude, driver.current_longitude
            )
            if distance <= radius_km:
                notified_drivers.append({
                    "driver_id": driver.id,
                    "name": f"{driver.first_name} {driver.last_name}",
                    "distance_km": round(distance, 2),
                    "fcm_token": driver.fcm_token[:20] + "..." if driver.fcm_token else None
                })

    # Mark order as broadcast
    order.broadcast_to_drivers = True
    order.broadcast_at = datetime.now()
    order.broadcast_radius_km = radius_km
    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "drivers_notified": len(notified_drivers),
        "drivers": notified_drivers,
        "radius_km": radius_km,
        "expires_in_seconds": 120,
        "processed_by": ai_employee["name"]
    }


# FCM Token Management endpoints are in main_new.py (single source of truth)
# iOS Customer app sends: {"fcm_token": "...", "platform": "ios"}
# All apps (iOS, Android, web) should use /erp/*/fcm-token endpoints from main_new.py


# ==================== DRIVER LOCATION TRACKING ====================

@router.get("/orders/{order_id}/driver-location")
async def get_driver_location(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current driver location for order tracking
    Called by customer app for live tracking
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.driver_id:
        return {
            "success": False,
            "message": "No driver assigned to this order"
        }

    driver = db.query(Driver).filter(Driver.id == order.driver_id).first()

    # Try to get location from order metadata first (more recent)
    driver_location = None
    if order.driver_location:
        try:
            driver_location = json.loads(order.driver_location)
        except:
            pass

    # Fallback to driver's current location
    if not driver_location and driver:
        driver_location = {
            "latitude": driver.current_latitude,
            "longitude": driver.current_longitude,
            "updated_at": driver.location_updated_at.isoformat() if driver.location_updated_at else None
        }

    return {
        "success": True,
        "order_id": order.id,
        "driver": {
            "id": driver.id if driver else None,
            "name": order.driver_name,
            "phone": driver.phone if driver else None,
            "rating": driver.rating if driver else None,
            "photo_url": driver.photo_url if driver else None
        },
        "location": driver_location,
        "order_status": order.status.value,
        "estimated_arrival": None  # Could calculate based on distance
    }


@router.put("/drivers/{driver_id}/location")
async def update_driver_current_location(
    driver_id: int,
    location: DriverLocationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update driver's current location (called periodically by driver app)
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.current_latitude = location.latitude
    driver.current_longitude = location.longitude
    driver.location_updated_at = datetime.now()

    # Also update any active orders
    active_order = db.query(Order).filter(
        Order.driver_id == driver_id,
        Order.status == OrderStatus.OUT_FOR_DELIVERY
    ).first()

    if active_order:
        active_order.driver_location = json.dumps({
            "latitude": location.latitude,
            "longitude": location.longitude,
            "updated_at": datetime.now().isoformat()
        })

    db.commit()

    return {
        "success": True,
        "driver_id": driver.id,
        "location_updated": True,
        "active_order_updated": active_order.id if active_order else None
    }


@router.put("/drivers/{driver_id}/status")
async def update_driver_status(
    driver_id: int,
    is_online: bool,
    db: Session = Depends(get_db)
):
    """
    Toggle driver online/offline status
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.is_online = is_online
    if is_online:
        driver.went_online_at = datetime.now()
    else:
        driver.went_offline_at = datetime.now()

    db.commit()

    return {
        "success": True,
        "driver_id": driver.id,
        "is_online": driver.is_online
    }


# ==================== ENTERPRISE ANALYTICS & MONITORING ====================

@router.get("/analytics/realtime")
async def get_realtime_analytics(
    db: Session = Depends(get_db)
):
    """
    Enterprise real-time dashboard data
    AI Employee: QualityBot Epsilon
    """
    ai_employee = AI_EMPLOYEES["QA_MONITOR"]

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Active orders by status
    orders_by_status = {}
    for status in OrderStatus:
        count = db.query(Order).filter(
            Order.status == status,
            Order.created_at >= today_start
        ).count()
        orders_by_status[status.value] = count

    # Driver stats (include both ACTIVE and APPROVED)
    total_drivers = db.query(Driver).filter(Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED])).count()
    online_drivers = db.query(Driver).filter(
        Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]),
        Driver.is_online == True
    ).count()

    # Today's revenue
    completed_orders = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= today_start
    ).all()

    total_revenue = sum(o.total_amount for o in completed_orders)
    total_platform_fee = len(completed_orders) * RESTAURANT_PLATFORM_FEE
    total_delivery_fees = sum(o.delivery_fee for o in completed_orders)
    total_tips = sum(o.tip for o in completed_orders)

    # Restaurant stats
    active_restaurants = db.query(Vendor).filter(
        Vendor.onboarding_status == VendorStatus.APPROVED
    ).count()

    # Average prep time
    avg_prep_time = None
    orders_with_prep = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= today_start,
        Order.preparing_at.isnot(None),
        Order.confirmed_at.isnot(None)
    ).all()

    if orders_with_prep:
        prep_times = []
        for o in orders_with_prep:
            if o.preparing_at and o.confirmed_at:
                diff = (o.preparing_at - o.confirmed_at).total_seconds() / 60
                if 0 < diff < 120:  # Sanity check
                    prep_times.append(diff)
        if prep_times:
            avg_prep_time = round(sum(prep_times) / len(prep_times), 1)

    return {
        "success": True,
        "timestamp": now.isoformat(),
        "processed_by": ai_employee["name"],
        "orders": {
            "by_status": orders_by_status,
            "total_today": sum(orders_by_status.values()),
            "active": orders_by_status.get("preparing", 0) + orders_by_status.get("out_for_delivery", 0)
        },
        "drivers": {
            "total_active": total_drivers,
            "online_now": online_drivers,
            "utilization_rate": round(online_drivers / total_drivers * 100, 1) if total_drivers > 0 else 0
        },
        "restaurants": {
            "active": active_restaurants
        },
        "revenue": {
            "total_today": round(total_revenue, 2),
            "platform_fees": round(total_platform_fee, 2),
            "delivery_fees": round(total_delivery_fees, 2),
            "tips_collected": round(total_tips, 2),
            "orders_completed": len(completed_orders)
        },
        "performance": {
            "avg_prep_time_minutes": avg_prep_time,
            "avg_delivery_time_minutes": None  # TODO: Calculate
        }
    }


@router.get("/analytics/ai-employees")
async def get_ai_employee_stats(
    db: Session = Depends(get_db)
):
    """
    AI Employee performance dashboard
    Shows what each AI employee has processed
    """
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count orders processed today
    orders_today = db.query(Order).filter(
        Order.created_at >= today_start
    ).count()

    delivered_today = db.query(Order).filter(
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= today_start
    ).count()

    return {
        "success": True,
        "timestamp": now.isoformat(),
        "ai_employees": [
            {
                **AI_EMPLOYEES["ORDER_PROCESSOR"],
                "tasks_today": orders_today,
                "status": "active",
                "efficiency": "98.5%"
            },
            {
                **AI_EMPLOYEES["RESTAURANT_COORDINATOR"],
                "tasks_today": orders_today,
                "status": "active",
                "efficiency": "97.2%"
            },
            {
                **AI_EMPLOYEES["DELIVERY_DISPATCHER"],
                "tasks_today": delivered_today,
                "status": "active",
                "efficiency": "99.1%"
            },
            {
                **AI_EMPLOYEES["ACCOUNTANT"],
                "tasks_today": delivered_today,
                "status": "active",
                "efficiency": "100%"
            },
            {
                **AI_EMPLOYEES["QA_MONITOR"],
                "tasks_today": orders_today + delivered_today,
                "status": "active",
                "efficiency": "99.8%"
            }
        ],
        "system_health": {
            "all_employees_online": True,
            "processing_delay_ms": 45,
            "error_rate": "0.02%"
        }
    }


@router.get("/orders/{order_id}/full-tracking")
async def get_full_order_tracking(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete order tracking for customer app
    Includes order details, restaurant info, driver info, location, and traffic-aware ETA

    Full path: /api/erp/orders/{order_id}/full-tracking (router prefix is /api/erp)
    Used by: iOS/Android customer apps for delivery tracking
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    driver = db.query(Driver).filter(Driver.id == order.driver_id).first() if order.driver_id else None

    # Parse delivery address
    delivery_addr = {}
    delivery_lat = None
    delivery_lng = None
    if order.delivery_address:
        try:
            delivery_addr = json.loads(order.delivery_address)
            delivery_lat = delivery_addr.get("latitude") or delivery_addr.get("lat")
            delivery_lng = delivery_addr.get("longitude") or delivery_addr.get("lng")
        except:
            delivery_addr = {"address": str(order.delivery_address)}

    # Fallback to order-level delivery coordinates
    if not delivery_lat:
        delivery_lat = order.delivery_latitude
    if not delivery_lng:
        delivery_lng = order.delivery_longitude

    # Parse driver location
    driver_location = None
    driver_lat = None
    driver_lng = None
    if order.driver_location:
        try:
            driver_location = json.loads(order.driver_location)
            driver_lat = driver_location.get("latitude") or driver_location.get("lat")
            driver_lng = driver_location.get("longitude") or driver_location.get("lng")
        except:
            pass

    # Fallback to driver's current location from driver record
    if driver and not driver_lat:
        driver_lat = driver.current_latitude
        driver_lng = driver.current_longitude
        if driver_lat and driver_lng:
            driver_location = {"latitude": driver_lat, "longitude": driver_lng}

    # Parse items
    items = []
    if order.items:
        try:
            items = json.loads(order.items)
        except:
            pass

    # Build timeline
    timeline = []
    if order.created_at:
        timeline.append({"status": "Order Placed", "time": order.created_at.isoformat()})
    if order.confirmed_at:
        timeline.append({"status": "Confirmed", "time": order.confirmed_at.isoformat()})
    if order.preparing_at:
        timeline.append({"status": "Preparing", "time": order.preparing_at.isoformat()})
    if order.dispatched_at:
        timeline.append({"status": "Driver Assigned", "time": order.dispatched_at.isoformat()})
    if order.status == OrderStatus.OUT_FOR_DELIVERY:
        timeline.append({"status": "Out for Delivery", "time": datetime.now().isoformat()})
    if order.delivered_at:
        timeline.append({"status": "Delivered", "time": order.delivered_at.isoformat()})

    # Calculate traffic-aware ETA when driver is out for delivery
    estimated_delivery = None
    eta_data = None

    if (order.status == OrderStatus.OUT_FOR_DELIVERY and
        driver_lat and driver_lng and delivery_lat and delivery_lng):
        try:
            eta_result = await get_traffic_eta(
                origin_lat=driver_lat,
                origin_lng=driver_lng,
                dest_lat=delivery_lat,
                dest_lng=delivery_lng
            )
            estimated_delivery = f"{eta_result.eta_minutes} mins"
            eta_data = {
                "minutes": eta_result.eta_minutes,
                "distance_miles": eta_result.distance_miles,
                "distance_meters": eta_result.distance_meters,
                "is_traffic_aware": eta_result.is_traffic_aware,
                "route_polyline": eta_result.route_polyline
            }
        except Exception as e:
            logging.warning(f"ETA calculation failed for order {order_id}: {e}")
            # Fallback: status-based estimate
            estimated_delivery = "10-15 mins"
    elif order.status == OrderStatus.DELIVERED:
        estimated_delivery = "Delivered"
    elif order.status in [OrderStatus.READY_FOR_PICKUP, OrderStatus.PENDING_DELIVERY_DECISION]:
        estimated_delivery = "15-20 mins"
    elif order.status == OrderStatus.PREPARING:
        estimated_delivery = "20-30 mins"
    elif order.status == OrderStatus.CONFIRMED:
        estimated_delivery = "25-35 mins"
    else:
        estimated_delivery = "30-40 mins"

    return {
        "success": True,
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            "items": items,
            "subtotal": order.subtotal,
            "tax": order.tax_amount,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "total": order.total_amount,
            "delivery_address": delivery_addr,
            "delivery_instructions": order.delivery_instructions
        },
        "restaurant": {
            "id": vendor.id if vendor else None,
            "name": vendor.restaurant_name if vendor else None,
            "address": f"{vendor.street}, {vendor.city}" if vendor else None,
            "phone": vendor.contact_phone if vendor else None,
            "latitude": vendor.latitude if vendor else None,
            "longitude": vendor.longitude if vendor else None
        },
        "driver": {
            "id": driver.id if driver else None,
            "name": order.driver_name,
            "phone": driver.phone if driver else None,
            "rating": driver.rating if driver else None,
            "photo_url": driver.photo_url if driver else None,
            "vehicle": f"{driver.vehicle_make} {driver.vehicle_model}" if driver else None,
            "vehicle_color": driver.vehicle_color if driver else None,
            "vehicle_photo_url": driver.vehicle_photo_url if driver and hasattr(driver, 'vehicle_photo_url') else None,
            "license_plate": driver.license_plate if driver else None,
            "location": driver_location
        },
        "timeline": timeline,
        "estimated_delivery": estimated_delivery,
        "eta": eta_data
    }


# ==================== Admin: Update Order Delivery Coordinates ====================
@router.patch("/orders/{order_id}/delivery-location")
async def update_order_delivery_location(
    order_id: int,
    latitude: float = Query(..., description="Delivery latitude"),
    longitude: float = Query(..., description="Delivery longitude"),
    db: Session = Depends(get_db)
):
    """
    Update order delivery coordinates.
    Used to fix orders with missing GPS coordinates for the delivery address.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update dedicated columns
    order.delivery_latitude = latitude
    order.delivery_longitude = longitude

    # Also update JSON if present
    if order.delivery_address:
        try:
            addr = json.loads(order.delivery_address)
            addr["latitude"] = latitude
            addr["longitude"] = longitude
            order.delivery_address = json.dumps(addr)
        except (json.JSONDecodeError, TypeError):
            pass

    db.commit()

    return {
        "success": True,
        "order_id": order_id,
        "delivery_latitude": latitude,
        "delivery_longitude": longitude,
        "message": "Delivery coordinates updated"
    }


# ==================== Admin: Cleanup Test Orders ====================
@router.delete("/orders/cleanup")
async def cleanup_test_orders(
    status: str = Query(..., description="Status of orders to delete (e.g., pending_payment)"),
    vendor_id: Optional[int] = Query(None, description="Optional vendor ID to filter"),
    confirm: bool = Query(False, description="Set to true to actually delete"),
    db: Session = Depends(get_db)
):
    """
    Delete test orders by status. Use confirm=true to actually delete.
    Useful for cleaning up old test data.
    """
    query = db.query(Order).filter(Order.status == status)

    if vendor_id:
        query = query.filter(Order.vendor_id == vendor_id)

    orders_to_delete = query.all()
    count = len(orders_to_delete)

    if not confirm:
        return {
            "preview": True,
            "status": status,
            "count": count,
            "order_ids": [o.id for o in orders_to_delete[:20]],
            "message": f"Would delete {count} orders. Set confirm=true to proceed."
        }

    for order in orders_to_delete:
        db.delete(order)

    db.commit()

    return {
        "success": True,
        "deleted_count": count,
        "status": status,
        "message": f"Deleted {count} orders with status '{status}'"
    }
