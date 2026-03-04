"""
Dollor.ai - Deterministic Rule-Based Support Agent
====================================================

Provides ZERO-hallucination customer support through keyword-based intent
classification and direct database lookups. Every response is either a
hardcoded template string or a DB-field interpolation. No LLM calls.

Used by: POST /api/support/chat (wired via voice_agent.py)
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from models import Customer, Order, OrderStatus, RideRequest, RideRequestStatus, Driver
from email_service import send_email

logger = logging.getLogger(__name__)

# JWT config — same as auth_utils.py
import os
_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
_ALGORITHM = "HS256"


# ===================== INTENT CLASSIFICATION =====================

# Ordered list of (keywords, handler) tuples. First match wins.
# More specific keywords checked before general ones.
_INTENT_MAP = [
    # Cancel must come before general "order" keywords
    ({"cancel my order", "cancel order", "cancel"}, "_handle_cancel"),
    # Refund
    ({"refund eligible", "refund request", "get refund", "money back", "refund"}, "_handle_refund"),
    # Order status
    ({"order status", "where is my", "where's my", "track order", "track my", "my order", "where is", "status"}, "_handle_order_status"),
    # Delivery issues
    ({"delivery issue", "delivery", "driver late", "late", "delayed", "taking long"}, "_handle_delivery_issue"),
    # Ride status
    ({"ride status", "my ride", "rideshare", "ride"}, "_handle_ride_status"),
    # Account
    ({"reset password", "forgot password", "password", "login issue", "login", "account"}, "_handle_account"),
    # Pricing
    ({"pricing info", "pricing", "how much", "cost", "charge", "fee"}, "_handle_pricing"),
    # Escalation
    ({"talk to human", "speak to someone", "escalate", "contact support", "agent", "human"}, "_handle_escalate"),
    # Help / general
    ({"help", "support", "hi", "hello", "hey"}, "_handle_general"),
]

# Handler dispatch table
_HANDLERS = {}


def _register_handler(name, func):
    _HANDLERS[name] = func


def _classify_intent(message: str) -> str:
    """Classify user message into an intent handler name via keyword matching."""
    msg_lower = message.lower()
    for keywords, handler_name in _INTENT_MAP:
        for keyword in keywords:
            if keyword in msg_lower:
                return handler_name
    return "_handle_general"


# ===================== MAIN ENTRY POINT =====================

def handle_support_message(
    message: str,
    customer: Optional[Customer],
    db: Session,
) -> dict:
    """
    Process a support message deterministically. Returns:
    {"response": str, "action": Optional[str], "data": Optional[dict]}

    Every response string is a hardcoded template with DB field interpolation only.
    """
    handler_name = _classify_intent(message)
    handler = _HANDLERS.get(handler_name, _HANDLERS["_handle_general"])
    try:
        return handler(message, customer, db)
    except Exception as e:
        logger.error("Support agent handler error (%s): %s", handler_name, e)
        return {
            "response": "Something went wrong. Please try again or email support@dollor.ai for help.",
            "action": None,
            "data": None,
        }


# ===================== HELPER FUNCTIONS =====================

def _friendly_status(status: OrderStatus) -> str:
    """Map OrderStatus enum to human-readable text."""
    mapping = {
        OrderStatus.PENDING_PAYMENT: "Awaiting payment",
        OrderStatus.CONFIRMED: "Confirmed",
        OrderStatus.PENDING_RESTAURANT: "Waiting for restaurant",
        OrderStatus.DECLINED_BY_RESTAURANT: "Declined by restaurant",
        OrderStatus.RESTAURANT_TIMEOUT: "Restaurant didn't respond",
        OrderStatus.PREPARING: "Being prepared",
        OrderStatus.READY_FOR_PICKUP: "Ready for pickup",
        OrderStatus.PENDING_DELIVERY_DECISION: "Awaiting delivery assignment",
        OrderStatus.RESTAURANT_WILL_DELIVER: "Restaurant is delivering",
        OrderStatus.DELIVERY_DECISION_TIMEOUT: "Assigning driver",
        OrderStatus.OUT_FOR_DELIVERY: "Out for delivery",
        OrderStatus.PENDING_DELIVERY_PROOF: "Delivery being confirmed",
        OrderStatus.DELIVERED: "Delivered",
        OrderStatus.CANCELLED: "Cancelled",
    }
    return mapping.get(status, str(status.value).replace("_", " ").title())


def _friendly_ride_status(status: RideRequestStatus) -> str:
    """Map RideRequestStatus enum to human-readable text."""
    mapping = {
        RideRequestStatus.OPEN: "Waiting for drivers",
        RideRequestStatus.BIDDING: "Reviewing driver bids",
        RideRequestStatus.MATCHED: "Driver matched",
        RideRequestStatus.IN_PROGRESS: "Ride in progress",
        RideRequestStatus.COMPLETED: "Completed",
        RideRequestStatus.CANCELLED: "Cancelled",
        RideRequestStatus.EXPIRED: "Expired",
    }
    return mapping.get(status, str(status.value).replace("_", " ").title())


def _relative_time(dt: datetime) -> str:
    """Return human-readable relative time string."""
    if dt is None:
        return "unknown time"
    now = datetime.utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days == 1:
        return "yesterday"
    return f"{days} days ago"


def _send_escalation_email(
    issue_type: str,
    summary: str,
    customer: Optional[Customer],
    db: Session,
) -> bool:
    """Send escalation email to support@dollor.ai."""
    customer_info = "Unauthenticated user"
    if customer:
        name = f"{customer.first_name or ''} {customer.last_name or ''}".strip() or "Unknown"
        customer_info = f"Customer: {name} (email: {customer.email}, id: {customer.id})"

    html_body = f"""
    <h2>Support Escalation: {issue_type}</h2>
    <p><strong>Customer:</strong> {customer_info}</p>
    <p><strong>Summary:</strong> {summary}</p>
    <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
    <p>This was escalated automatically by the Dollor Support agent.</p>
    """

    try:
        send_email(
            to_email="support@dollor.ai",
            subject=f"[Support Escalation] {issue_type}",
            html_body=html_body,
            text_body=f"Escalation: {issue_type}\nCustomer: {customer_info}\nSummary: {summary}",
            skip_validation=True,
        )
        return True
    except Exception as e:
        logger.error("Failed to send escalation email: %s", e)
        return False


_TERMINAL_STATUSES = {
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.DECLINED_BY_RESTAURANT,
    OrderStatus.RESTAURANT_TIMEOUT,
}

_CANCELLABLE_STATUSES = {
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.CONFIRMED,
    OrderStatus.PENDING_RESTAURANT,
}

_FULL_REFUND_STATUSES = {
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.CONFIRMED,
    OrderStatus.PENDING_RESTAURANT,
    OrderStatus.DECLINED_BY_RESTAURANT,
    OrderStatus.RESTAURANT_TIMEOUT,
    OrderStatus.CANCELLED,
}


# ===================== JWT EXTRACTION =====================

def try_extract_customer(request: Request, db: Session) -> Optional[Customer]:
    """
    Extract customer from Authorization header if present.
    Returns None on any failure (no exception -- endpoint stays public).
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:]
        if not token or not _SECRET_KEY:
            return None
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
        email = payload.get("sub") or payload.get("email")
        if not email:
            return None
        customer = db.query(Customer).filter(Customer.email == email).first()
        return customer
    except (JWTError, Exception):
        return None


# ===================== INTENT HANDLERS =====================

def _handle_order_status(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to check your order status. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    orders = (
        db.query(Order)
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(3)
        .all()
    )

    if not orders:
        return {
            "response": "You don't have any recent orders.",
            "action": None,
            "data": None,
        }

    lines = []
    for order in orders:
        status_text = _friendly_status(order.status)
        time_text = _relative_time(order.created_at)
        lines.append(f"Order #{order.order_number} -- {status_text} (placed {time_text})")

    response = "Here are your recent orders:\n" + "\n".join(lines)
    return {"response": response, "action": None, "data": None}


def _handle_cancel(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to cancel an order. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    # Find most recent non-terminal order
    active_order = (
        db.query(Order)
        .filter(
            Order.customer_id == customer.id,
            ~Order.status.in_(_TERMINAL_STATUSES),
        )
        .order_by(Order.created_at.desc())
        .first()
    )

    if not active_order:
        return {
            "response": "You don't have any active orders to cancel.",
            "action": None,
            "data": None,
        }

    if active_order.status in _CANCELLABLE_STATUSES:
        active_order.status = OrderStatus.CANCELLED
        active_order.cancelled_at = datetime.utcnow()
        db.commit()
        return {
            "response": f"Your order #{active_order.order_number} has been cancelled. If you were charged, a refund will be processed within 1-3 business days.",
            "action": "order_cancelled",
            "data": {"order_number": active_order.order_number},
        }

    # Not cancellable (PREPARING or later)
    return {
        "response": f"Sorry, order #{active_order.order_number} cannot be cancelled because the restaurant has already started preparing it. You can request a refund by saying 'refund'.",
        "action": None,
        "data": None,
    }


def _handle_refund(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to check refund eligibility. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    recent_order = (
        db.query(Order)
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .first()
    )

    if not recent_order:
        return {
            "response": "You don't have any orders to check for refund eligibility.",
            "action": None,
            "data": None,
        }

    # Full refund eligible
    if recent_order.status in _FULL_REFUND_STATUSES:
        return {
            "response": f"Order #{recent_order.order_number} is eligible for a full refund. If you were charged, the refund will be processed within 1-3 business days.",
            "action": "refund_eligible",
            "data": {"order_number": recent_order.order_number, "refund_type": "full"},
        }

    # Delivered within 48 hours -- possible refund
    if recent_order.status == OrderStatus.DELIVERED and recent_order.delivered_at:
        hours_since = (datetime.utcnow() - recent_order.delivered_at).total_seconds() / 3600
        if hours_since <= 48:
            return {
                "response": f"Order #{recent_order.order_number} was delivered {_relative_time(recent_order.delivered_at)}. For refund requests on delivered orders, please email support@dollor.ai with your order number and reason. Our team will review within 24 hours.",
                "action": "refund_review",
                "data": {"order_number": recent_order.order_number, "refund_type": "possible"},
            }

    # Delivery issue -- stuck at OUT_FOR_DELIVERY for >2 hours
    if recent_order.status == OrderStatus.OUT_FOR_DELIVERY and recent_order.dispatched_at:
        hours_out = (datetime.utcnow() - recent_order.dispatched_at).total_seconds() / 3600
        if hours_out > 2:
            _send_escalation_email(
                issue_type="Delivery Failure",
                summary=f"Order #{recent_order.order_number} has been out for delivery for over 2 hours. Customer requesting refund.",
                customer=customer,
                db=db,
            )
            return {
                "response": f"Your order #{recent_order.order_number} appears to have a delivery issue. You're eligible for a full refund. We've escalated this to our team.",
                "action": "refund_escalated",
                "data": {"order_number": recent_order.order_number, "refund_type": "full"},
            }

    # Not eligible or past 48 hours
    return {
        "response": f"For refund requests on order #{recent_order.order_number}, please email support@dollor.ai with your order number and reason. Our team will review within 24 hours.",
        "action": "refund_review",
        "data": {"order_number": recent_order.order_number},
    }


def _handle_delivery_issue(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to check your delivery. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    # Find most recent active (non-terminal) order
    active_order = (
        db.query(Order)
        .filter(
            Order.customer_id == customer.id,
            ~Order.status.in_(_TERMINAL_STATUSES),
        )
        .order_by(Order.created_at.desc())
        .first()
    )

    if not active_order:
        return {
            "response": "You don't have any active deliveries right now.",
            "action": None,
            "data": None,
        }

    if active_order.status == OrderStatus.OUT_FOR_DELIVERY:
        driver_info = ""
        if active_order.driver_name:
            driver_info = f" Your driver is {active_order.driver_name}."
        return {
            "response": f"Your order #{active_order.order_number} is out for delivery.{driver_info}",
            "action": None,
            "data": {"order_number": active_order.order_number},
        }

    if active_order.status in {OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP}:
        return {
            "response": f"Your order #{active_order.order_number} is being prepared by the restaurant. The driver will be assigned once it's ready.",
            "action": None,
            "data": {"order_number": active_order.order_number},
        }

    return {
        "response": f"Your order #{active_order.order_number} is currently in '{_friendly_status(active_order.status)}' status.",
        "action": None,
        "data": {"order_number": active_order.order_number},
    }


def _handle_ride_status(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to check your ride. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    rides = (
        db.query(RideRequest)
        .filter(RideRequest.customer_id == customer.id)
        .order_by(RideRequest.created_at.desc())
        .limit(3)
        .all()
    )

    if not rides:
        return {
            "response": "You don't have any recent rides.",
            "action": None,
            "data": None,
        }

    lines = []
    for ride in rides:
        status_text = _friendly_ride_status(ride.status)
        time_text = _relative_time(ride.created_at)
        pickup = ride.pickup_place_name or ride.pickup_address or "Unknown"
        dropoff = ride.dropoff_place_name or ride.dropoff_address or "Unknown"
        lines.append(f"Ride {ride.request_id} -- {status_text}: {pickup} to {dropoff} ({time_text})")

    response = "Here are your recent rides:\n" + "\n".join(lines)
    return {"response": response, "action": None, "data": None}


def _handle_account(message: str, customer: Optional[Customer], db: Session) -> dict:
    return {
        "response": "For password reset, use the 'Forgot Password' option in the app. For other account issues, email support@dollor.ai.",
        "action": None,
        "data": None,
    }


def _handle_pricing(message: str, customer: Optional[Customer], db: Session) -> dict:
    return {
        "response": (
            "Dollor.ai charges a flat matchmaking fee:\n"
            "- Food delivery: $1 service fee for customers, $1 per order for restaurants. Drivers keep 100% of delivery fees and tips.\n"
            "- Rideshare: $1 fee for fares up to $35, $2 for $35-70, $3 for over $70. Drivers keep the rest plus 100% of tips.\n\n"
            "We never take a percentage commission."
        ),
        "action": None,
        "data": None,
    }


def _handle_escalate(message: str, customer: Optional[Customer], db: Session) -> dict:
    _send_escalation_email(
        issue_type="Customer Escalation Request",
        summary=f"Customer requested human support. Original message: {message[:200]}",
        customer=customer,
        db=db,
    )
    return {
        "response": "I've escalated your request to our support team at support@dollor.ai. They'll follow up within 24 hours. You can also email them directly.",
        "action": "escalated",
        "data": None,
    }


def _handle_general(message: str, customer: Optional[Customer], db: Session) -> dict:
    return {
        "response": (
            "I can help you with:\n"
            "- Check order status\n"
            "- Cancel an order\n"
            "- Refund eligibility\n"
            "- Delivery updates\n"
            "- Ride status\n"
            "- Pricing info\n\n"
            "What would you like help with? For complex issues, I can connect you with our support team."
        ),
        "action": None,
        "data": None,
    }


# ===================== REGISTER ALL HANDLERS =====================

_register_handler("_handle_order_status", _handle_order_status)
_register_handler("_handle_cancel", _handle_cancel)
_register_handler("_handle_refund", _handle_refund)
_register_handler("_handle_delivery_issue", _handle_delivery_issue)
_register_handler("_handle_ride_status", _handle_ride_status)
_register_handler("_handle_account", _handle_account)
_register_handler("_handle_pricing", _handle_pricing)
_register_handler("_handle_escalate", _handle_escalate)
_register_handler("_handle_general", _handle_general)
