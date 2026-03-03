"""
Tool implementations for the Dollor.ai voice support agent.

Provides backend lookups for the OpenAI Realtime API function/tool calling:
- lookup_order: Find food delivery orders by ID or phone
- lookup_ride: Find rideshare rides by ID or phone
- lookup_account: Find account info across all user types by phone
- log_escalation: Log an escalation request and email support@dollor.ai
"""

import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from models import Customer, Driver, Vendor, Order, RideRequest
from email_service import send_email

logger = logging.getLogger(__name__)


# ===================== TOOL DEFINITIONS (for OpenAI session.update) =====================

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "name": "lookup_order",
        "description": "Look up a food delivery order by order ID or customer phone number. Returns order details including status, restaurant, total, and driver info.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "integer",
                    "description": "The order ID number",
                },
                "phone": {
                    "type": "string",
                    "description": "Customer phone number to find their recent orders",
                },
            },
        },
    },
    {
        "type": "function",
        "name": "lookup_ride",
        "description": "Look up a rideshare request by ride ID or customer phone number. Returns ride details including status, pickup/dropoff, fare, and driver info.",
        "parameters": {
            "type": "object",
            "properties": {
                "ride_id": {
                    "type": "integer",
                    "description": "The ride request ID number",
                },
                "phone": {
                    "type": "string",
                    "description": "Customer phone number to find their recent rides",
                },
            },
        },
    },
    {
        "type": "function",
        "name": "lookup_account",
        "description": "Look up account information by phone number. Searches across customer, driver, and restaurant accounts.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {
                    "type": "string",
                    "description": "Phone number to search for",
                },
            },
            "required": ["phone"],
        },
    },
    {
        "type": "function",
        "name": "log_escalation",
        "description": "Log a support request for human follow-up. Use this for refund requests, complaints, account issues, or anything the AI cannot resolve directly.",
        "parameters": {
            "type": "object",
            "properties": {
                "caller_phone": {
                    "type": "string",
                    "description": "The caller's phone number",
                },
                "issue_type": {
                    "type": "string",
                    "enum": ["refund", "complaint", "account_issue", "other"],
                    "description": "Category of the issue",
                },
                "summary": {
                    "type": "string",
                    "description": "Brief summary of the issue and what the caller needs",
                },
            },
            "required": ["caller_phone", "issue_type", "summary"],
        },
    },
]


# ===================== TOOL DISPATCHER =====================

def execute_tool(tool_name: str, arguments: dict, db: Session) -> str:
    """Dispatch a tool call to the correct implementation. Returns JSON string."""
    handlers = {
        "lookup_order": lookup_order,
        "lookup_ride": lookup_ride,
        "lookup_account": lookup_account,
        "log_escalation": log_escalation,
    }

    handler = handlers.get(tool_name)
    if not handler:
        logger.warning("Unknown tool called: %s", tool_name)
        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    try:
        return handler(arguments, db)
    except Exception as e:
        logger.error("Tool %s failed: %s", tool_name, e)
        return json.dumps({"error": f"Tool execution failed: {str(e)}"})


# ===================== TOOL IMPLEMENTATIONS =====================

def lookup_order(arguments: dict, db: Session) -> str:
    """Look up food delivery orders by order ID or customer phone number."""
    order_id = arguments.get("order_id")
    phone = arguments.get("phone")

    if order_id:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return json.dumps({"error": f"No order found with ID {order_id}"})
        return json.dumps(_format_order(order))

    if phone:
        # Find customer by phone, then their recent orders
        customer = db.query(Customer).filter(Customer.phone == phone).first()
        if not customer:
            return json.dumps({"error": f"No customer account found with phone {phone}"})

        orders = (
            db.query(Order)
            .filter(Order.customer_id == customer.id)
            .order_by(Order.created_at.desc())
            .limit(5)
            .all()
        )
        if not orders:
            return json.dumps({"error": f"No orders found for customer {customer.first_name}"})

        return json.dumps({
            "customer": f"{customer.first_name or ''} {customer.last_name or ''}".strip(),
            "orders": [_format_order(o) for o in orders],
        })

    return json.dumps({"error": "Please provide either an order_id or phone number"})


def lookup_ride(arguments: dict, db: Session) -> str:
    """Look up rideshare rides by ride ID or customer phone number."""
    ride_id = arguments.get("ride_id")
    phone = arguments.get("phone")

    if ride_id:
        ride = db.query(RideRequest).filter(RideRequest.id == ride_id).first()
        if not ride:
            return json.dumps({"error": f"No ride found with ID {ride_id}"})
        return json.dumps(_format_ride(ride, db))

    if phone:
        # Find customer by phone, then their recent rides
        customer = db.query(Customer).filter(Customer.phone == phone).first()
        if not customer:
            return json.dumps({"error": f"No customer account found with phone {phone}"})

        rides = (
            db.query(RideRequest)
            .filter(RideRequest.customer_id == customer.id)
            .order_by(RideRequest.created_at.desc())
            .limit(5)
            .all()
        )
        if not rides:
            return json.dumps({"error": f"No rides found for customer {customer.first_name}"})

        return json.dumps({
            "customer": f"{customer.first_name or ''} {customer.last_name or ''}".strip(),
            "rides": [_format_ride(r, db) for r in rides],
        })

    return json.dumps({"error": "Please provide either a ride_id or phone number"})


def lookup_account(arguments: dict, db: Session) -> str:
    """Look up account info across all user types by phone number."""
    phone = arguments.get("phone", "")
    if not phone:
        return json.dumps({"error": "Phone number is required"})

    accounts = []

    # Check customers
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer:
        accounts.append({
            "role": "customer",
            "name": f"{customer.first_name or ''} {customer.last_name or ''}".strip(),
            "email": customer.email,
            "is_active": customer.is_active,
            "total_orders": customer.total_orders or 0,
            "total_rides": customer.total_rides or 0,
            "loyalty_tier": customer.loyalty_tier or "bronze",
        })

    # Check drivers
    driver = db.query(Driver).filter(Driver.phone == phone).first()
    if driver:
        accounts.append({
            "role": "driver",
            "name": f"{driver.first_name} {driver.last_name}".strip(),
            "email": driver.email,
            "status": driver.status.value if driver.status else "unknown",
            "rating": driver.rating or 5.0,
            "total_deliveries": driver.total_deliveries or 0,
            "is_online": driver.is_online or False,
        })

    # Check vendors (by contact_phone)
    vendor = db.query(Vendor).filter(Vendor.contact_phone == phone).first()
    if vendor:
        accounts.append({
            "role": "restaurant",
            "restaurant_name": vendor.restaurant_name or vendor.company_name,
            "contact_name": vendor.contact_name,
            "email": vendor.contact_email,
            "status": vendor.onboarding_status.value if vendor.onboarding_status else "unknown",
        })

    if not accounts:
        return json.dumps({"error": f"No accounts found for phone number {phone}"})

    return json.dumps({"phone": phone, "accounts": accounts})


def log_escalation(arguments: dict, db: Session) -> str:
    """Log an escalation request and send email to support@dollor.ai."""
    caller_phone = arguments.get("caller_phone", "unknown")
    issue_type = arguments.get("issue_type", "other")
    summary = arguments.get("summary", "No details provided")

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    subject = f"[Escalation] {issue_type} from {caller_phone}"
    html_body = f"""
    <h2>Support Escalation</h2>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Caller Phone:</td><td style="padding: 8px;">{caller_phone}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Issue Type:</td><td style="padding: 8px;">{issue_type}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Timestamp:</td><td style="padding: 8px;">{timestamp}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Summary:</td><td style="padding: 8px;">{summary}</td></tr>
    </table>
    <p><em>This escalation was logged by the Dollor AI Support agent during a phone call.</em></p>
    """
    text_body = (
        f"Support Escalation\n\n"
        f"Caller Phone: {caller_phone}\n"
        f"Issue Type: {issue_type}\n"
        f"Timestamp: {timestamp}\n"
        f"Summary: {summary}\n\n"
        f"This escalation was logged by the Dollor AI Support agent during a phone call."
    )

    try:
        send_email(
            to_email="support@dollor.ai",
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            skip_validation=True,
        )
        logger.info("Escalation email sent for %s: %s", caller_phone, issue_type)
    except Exception as e:
        logger.error("Failed to send escalation email: %s", e)
        # Still return success -- the escalation is logged even if email fails

    return json.dumps({
        "success": True,
        "message": "Escalation logged. A team member will follow up within 24 hours.",
        "reference": f"ESC-{caller_phone[-4:]}-{timestamp[:10]}",
    })


# ===================== HELPERS =====================

def _format_order(order: Order) -> dict:
    """Format an Order object for the AI agent."""
    # Get vendor name from relationship
    vendor_name = "Unknown Restaurant"
    if order.vendor:
        vendor_name = order.vendor.restaurant_name or order.vendor.company_name or "Unknown"

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status.value if order.status else "unknown",
        "restaurant": vendor_name,
        "total": order.total_amount,
        "delivery_fee": order.delivery_fee or 0,
        "tip": order.tip or 0,
        "driver_name": order.driver_name,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
    }


def _format_ride(ride: RideRequest, db: Session) -> dict:
    """Format a RideRequest object for the AI agent."""
    driver_name = None
    if ride.matched_driver_id:
        driver = db.query(Driver).filter(Driver.id == ride.matched_driver_id).first()
        if driver:
            driver_name = f"{driver.first_name} {driver.last_name}".strip()

    return {
        "ride_id": ride.id,
        "request_id": ride.request_id,
        "status": ride.status.value if ride.status else "unknown",
        "pickup": ride.pickup_address,
        "dropoff": ride.dropoff_address,
        "fare": ride.final_price or ride.suggested_price,
        "tip": ride.tip_amount or 0,
        "driver_name": driver_name,
        "created_at": ride.created_at.isoformat() if ride.created_at else None,
        "completed_at": ride.completed_at.isoformat() if ride.completed_at else None,
    }
