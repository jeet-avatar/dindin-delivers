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

from models import Customer, RideRequest, RideRequestStatus, Driver
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
    # Cancel must come before general "order"/"ride" keywords
    ({"cancel my order", "cancel order", "cancel my ride", "cancel ride", "cancel"}, "_handle_cancel"),
    # Refund
    ({"refund eligible", "refund request", "get refund", "money back", "refund"}, "_handle_refund"),
    # Ride status ("order" is kept as a synonym since customers still say "my order"
    # out of habit -- there's no separate food-order concept anymore)
    ({"order status", "where is my", "where's my", "track order", "track my", "my order",
      "where is", "status", "ride status", "my ride", "rideshare", "ride"}, "_handle_ride_status"),
    # Delivery/pickup issues
    ({"delivery issue", "delivery", "driver late", "late", "delayed", "taking long"}, "_handle_delivery_issue"),
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


_RIDE_TERMINAL_STATUSES = {
    RideRequestStatus.COMPLETED,
    RideRequestStatus.CANCELLED,
    RideRequestStatus.EXPIRED,
}

_RIDE_CANCELLABLE_STATUSES = {
    RideRequestStatus.OPEN,
    RideRequestStatus.BIDDING,
    RideRequestStatus.MATCHED,
}

_RIDE_FULL_REFUND_STATUSES = {
    RideRequestStatus.OPEN,
    RideRequestStatus.BIDDING,
    RideRequestStatus.MATCHED,
    RideRequestStatus.CANCELLED,
    RideRequestStatus.EXPIRED,
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

def _handle_cancel(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to cancel a ride. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    # Find most recent non-terminal ride
    active_ride = (
        db.query(RideRequest)
        .filter(
            RideRequest.customer_id == customer.id,
            ~RideRequest.status.in_(_RIDE_TERMINAL_STATUSES),
        )
        .order_by(RideRequest.created_at.desc())
        .first()
    )

    if not active_ride:
        return {
            "response": "You don't have any active rides to cancel.",
            "action": None,
            "data": None,
        }

    if active_ride.status in _RIDE_CANCELLABLE_STATUSES:
        return {
            "response": f"To cancel ride {active_ride.request_id}, use the 'Cancel Ride' button in the app. If you were charged, a refund will be processed within 1-3 business days.",
            "action": "cancel_instructions",
            "data": {"request_id": active_ride.request_id},
        }

    # Not cancellable (driver already en route or ride in progress)
    return {
        "response": f"Sorry, ride {active_ride.request_id} can't be cancelled because your driver is already on the way or the ride is in progress. You can request a refund by saying 'refund'.",
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

    recent_ride = (
        db.query(RideRequest)
        .filter(RideRequest.customer_id == customer.id)
        .order_by(RideRequest.created_at.desc())
        .first()
    )

    if not recent_ride:
        return {
            "response": "You don't have any rides to check for refund eligibility.",
            "action": None,
            "data": None,
        }

    # Full refund eligible (ride never started)
    if recent_ride.status in _RIDE_FULL_REFUND_STATUSES:
        return {
            "response": f"Ride {recent_ride.request_id} is eligible for a full refund. If you were charged, the refund will be processed within 1-3 business days.",
            "action": "refund_eligible",
            "data": {"request_id": recent_ride.request_id, "refund_type": "full"},
        }

    # Completed within 48 hours -- possible refund
    if recent_ride.status == RideRequestStatus.COMPLETED and recent_ride.completed_at:
        hours_since = (datetime.utcnow() - recent_ride.completed_at).total_seconds() / 3600
        if hours_since <= 48:
            return {
                "response": f"Ride {recent_ride.request_id} was completed {_relative_time(recent_ride.completed_at)}. For refund requests on completed rides, please email support@dollor.ai with your ride ID and reason. Our team will review within 24 hours.",
                "action": "refund_review",
                "data": {"request_id": recent_ride.request_id, "refund_type": "possible"},
            }

    # Ride issue -- stuck IN_PROGRESS for an unusually long time
    if recent_ride.status == RideRequestStatus.IN_PROGRESS and recent_ride.matched_at:
        hours_in_progress = (datetime.utcnow() - recent_ride.matched_at).total_seconds() / 3600
        if hours_in_progress > 3:
            _send_escalation_email(
                issue_type="Ride Issue",
                summary=f"Ride {recent_ride.request_id} has been in progress for over 3 hours. Customer requesting refund.",
                customer=customer,
                db=db,
            )
            return {
                "response": f"Your ride {recent_ride.request_id} appears to have an issue. You're eligible for a full refund. We've escalated this to our team.",
                "action": "refund_escalated",
                "data": {"request_id": recent_ride.request_id, "refund_type": "full"},
            }

    # Not eligible or past 48 hours
    return {
        "response": f"For refund requests on ride {recent_ride.request_id}, please email support@dollor.ai with your ride ID and reason. Our team will review within 24 hours.",
        "action": "refund_review",
        "data": {"request_id": recent_ride.request_id},
    }


def _handle_delivery_issue(message: str, customer: Optional[Customer], db: Session) -> dict:
    if not customer:
        return {
            "response": "Please log in to check your ride. You can log in through the app and try again.",
            "action": "require_login",
            "data": None,
        }

    # Find most recent active (non-terminal) ride
    active_ride = (
        db.query(RideRequest)
        .filter(
            RideRequest.customer_id == customer.id,
            ~RideRequest.status.in_(_RIDE_TERMINAL_STATUSES),
        )
        .order_by(RideRequest.created_at.desc())
        .first()
    )

    if not active_ride:
        return {
            "response": "You don't have any active rides right now.",
            "action": None,
            "data": None,
        }

    if active_ride.status == RideRequestStatus.IN_PROGRESS:
        driver_info = ""
        if active_ride.matched_driver_id:
            driver = db.query(Driver).filter(Driver.id == active_ride.matched_driver_id).first()
            if driver:
                driver_info = f" Your driver is {driver.first_name} {driver.last_name}.".rstrip()
        return {
            "response": f"Your ride {active_ride.request_id} is in progress.{driver_info}",
            "action": None,
            "data": {"request_id": active_ride.request_id},
        }

    if active_ride.status in {RideRequestStatus.OPEN, RideRequestStatus.BIDDING}:
        return {
            "response": f"Ride {active_ride.request_id} is still waiting for a driver to accept. We'll notify you as soon as one is matched.",
            "action": None,
            "data": {"request_id": active_ride.request_id},
        }

    return {
        "response": f"Your ride {active_ride.request_id} is currently '{_friendly_ride_status(active_ride.status)}'.",
        "action": None,
        "data": {"request_id": active_ride.request_id},
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
            "- Ride status\n"
            "- Cancel a ride\n"
            "- Refund eligibility\n"
            "- Ride/driver updates\n"
            "- Pricing info\n\n"
            "What would you like help with? For complex issues, I can connect you with our support team."
        ),
        "action": None,
        "data": None,
    }


# ===================== REGISTER ALL HANDLERS =====================

_register_handler("_handle_cancel", _handle_cancel)
_register_handler("_handle_refund", _handle_refund)
_register_handler("_handle_delivery_issue", _handle_delivery_issue)
_register_handler("_handle_ride_status", _handle_ride_status)
_register_handler("_handle_account", _handle_account)
_register_handler("_handle_pricing", _handle_pricing)
_register_handler("_handle_escalate", _handle_escalate)
_register_handler("_handle_general", _handle_general)
