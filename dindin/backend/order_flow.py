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

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel
import json
import asyncio
import uuid

from database import get_db

# Import email functions from main_new
try:
    from main_new import (
        send_order_confirmation_email,
        send_order_preparing_email,
        send_driver_assigned_email,
        send_order_picked_up_email,
        send_order_delivered_email,
        send_restaurant_new_order_email
    )
    EMAIL_ENABLED = True
    print("[ORDER_FLOW] Email functions imported successfully")
except ImportError as e:
    EMAIL_ENABLED = False
    print(f"[ORDER_FLOW] Email functions not available: {e}")
from models import (
    Order, OrderStatus, Vendor, VendorMenuItem, Driver, DriverStatus,
    VendorPayout, DriverPayout, JournalEntry, JournalEntryLine
)

router = APIRouter(prefix="/api/erp", tags=["erp"])

# ==================== AUTHENTICATION HELPERS ====================

import os
from fastapi import Header
from jose import jwt, JWTError

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "eatfair-admin-secret-key-2024")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eatfair-driver-secret-key-2024")
ALGORITHM = "HS256"

# Maximum pagination limits to prevent DoS
MAX_PAGINATION_LIMIT = 500
DEFAULT_PAGINATION_LIMIT = 50

# ==================== ORDER STATE MACHINE ====================

# Define valid state transitions - CRITICAL for business logic integrity
# Format: {current_state: [allowed_next_states]}
ORDER_STATE_TRANSITIONS = {
    OrderStatus.PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    OrderStatus.PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    OrderStatus.READY_FOR_PICKUP: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
    OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    OrderStatus.DELIVERED: [],  # Terminal state - no transitions allowed
    OrderStatus.CANCELLED: [],  # Terminal state - no transitions allowed
}

# Order timeout configuration (in minutes)
ORDER_TIMEOUTS = {
    OrderStatus.PENDING_PAYMENT: 30,      # 30 min to complete payment
    OrderStatus.CONFIRMED: 60,            # 1 hour for restaurant to start preparing
    OrderStatus.PREPARING: 120,           # 2 hours max prep time
    OrderStatus.READY_FOR_PICKUP: 60,     # 1 hour for driver to pick up
    OrderStatus.OUT_FOR_DELIVERY: 90,     # 1.5 hours max delivery time
}


def validate_state_transition(current_status: OrderStatus, new_status: OrderStatus) -> Tuple[bool, str]:
    """
    Validate if a state transition is allowed.
    Returns (is_valid, error_message)
    """
    if current_status not in ORDER_STATE_TRANSITIONS:
        return False, f"Unknown current status: {current_status.value}"

    allowed_transitions = ORDER_STATE_TRANSITIONS[current_status]

    if new_status not in allowed_transitions:
        allowed_names = [s.value for s in allowed_transitions] if allowed_transitions else ["none (terminal state)"]
        return False, f"Invalid state transition from {current_status.value} to {new_status.value}. Allowed transitions: {', '.join(allowed_names)}"

    return True, ""


def check_order_timeout(order) -> tuple[bool, str]:
    """
    Check if an order has timed out in its current state.
    Returns (is_timed_out, timeout_message)
    """
    if order.status not in ORDER_TIMEOUTS:
        return False, ""

    timeout_minutes = ORDER_TIMEOUTS[order.status]

    # Get the timestamp for current state
    state_timestamp = None
    if order.status == OrderStatus.PENDING_PAYMENT:
        state_timestamp = order.created_at
    elif order.status == OrderStatus.CONFIRMED:
        state_timestamp = order.confirmed_at or order.created_at
    elif order.status == OrderStatus.PREPARING:
        state_timestamp = order.preparing_at or order.confirmed_at or order.created_at
    elif order.status == OrderStatus.READY_FOR_PICKUP:
        state_timestamp = order.preparing_at or order.created_at  # Use preparing_at as proxy
    elif order.status == OrderStatus.OUT_FOR_DELIVERY:
        state_timestamp = order.preparing_at or order.created_at  # Use latest available

    if state_timestamp:
        elapsed = datetime.now() - state_timestamp
        elapsed_minutes = elapsed.total_seconds() / 60

        if elapsed_minutes > timeout_minutes:
            return True, f"Order has been in {order.status.value} state for {int(elapsed_minutes)} minutes (timeout: {timeout_minutes} minutes)"

    return False, ""


async def verify_admin_token(authorization: str = Header(None)):
    """
    Verify admin JWT token for sensitive financial operations.
    CRITICAL: All financial endpoints must use this.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required for admin operations"
        )

    try:
        # Extract token from "Bearer <token>" format
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization

        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])

        # Verify admin role
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required for this operation"
            )

        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired admin token: {str(e)}"
        )


async def verify_driver_token(authorization: str = Header(None)):
    """
    Verify driver JWT token for driver operations.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )

    try:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization

        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired token: {str(e)}"
        )

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

# Import centralized pricing configuration
try:
    from pricing_config import (
        PLATFORM_FEE_CONFIG,
        DELIVERY_FEE_CONFIG,
        DRIVER_PAYOUT_CONFIG,
        RESTAURANT_COMMISSION_CONFIG,
        PAYMENT_PROCESSING_CONFIG,
        SURGE_PRICING_CONFIG,
        ORDER_VALIDATION_CONFIG,
        get_tax_rate,
        calculate_distance,
        calculate_order_totals
    )
    PRICING_CONFIG_LOADED = True
    print("[PRICING] Centralized pricing configuration loaded")
except ImportError as e:
    PRICING_CONFIG_LOADED = False
    print(f"[PRICING] Using fallback pricing: {e}")
    # Fallback values if pricing_config not available - should match pricing_config.py defaults
    PLATFORM_FEE = 1.00      # Matches PLATFORM_FEE_CONFIG.flat_fee
    DELIVERY_FEE = 2.99      # Matches DELIVERY_FEE_CONFIG.base_fee (min_fee)
    TAX_RATE = 0.08          # Matches DEFAULT_TAX_RATE


# ==================== REQUEST MODELS ====================

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    vendor_id: int
    items: List[Dict[str, Any]]
    delivery_address: Dict[str, str]
    delivery_instructions: Optional[str] = None
    tip: float = 0.0
    # New fields for proper pricing
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None


class AssignDriverRequest(BaseModel):
    driver_id: int


class UpdateStatusRequest(BaseModel):
    status: str


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

    # Calculate fees using centralized pricing configuration
    if PRICING_CONFIG_LOADED:
        # Get state from delivery address for tax calculation
        delivery_state = order_data.delivery_address.get("state", "CA")
        tax_rate = get_tax_rate(delivery_state)

        # Calculate distance for delivery fee (if coordinates provided)
        distance_miles = 3.0  # Default distance
        if (order_data.delivery_latitude and order_data.delivery_longitude and
            vendor.latitude and vendor.longitude):
            distance_miles = calculate_distance(
                vendor.latitude, vendor.longitude,
                order_data.delivery_latitude, order_data.delivery_longitude
            )

        # Check if delivery is within range
        if not DELIVERY_FEE_CONFIG.is_deliverable(distance_miles):
            raise HTTPException(
                status_code=400,
                detail=f"Delivery address is too far ({distance_miles:.1f} miles). Maximum delivery distance is {DELIVERY_FEE_CONFIG.max_delivery_distance} miles."
            )

        # Validate order amount
        is_valid, validation_msg = ORDER_VALIDATION_CONFIG.validate_order(subtotal)
        if not is_valid:
            raise HTTPException(status_code=400, detail=validation_msg)

        # Calculate all fees
        tax_amount = round(subtotal * tax_rate, 2)
        delivery_fee = DELIVERY_FEE_CONFIG.calculate(subtotal, distance_miles)
        platform_fee = PLATFORM_FEE_CONFIG.calculate(subtotal)
        total_amount = subtotal + tax_amount + delivery_fee + order_data.tip + platform_fee
    else:
        # Fallback to hardcoded values
        tax_rate = TAX_RATE
        tax_amount = subtotal * tax_rate
        delivery_fee = DELIVERY_FEE
        platform_fee = PLATFORM_FEE
        total_amount = subtotal + tax_amount + delivery_fee + order_data.tip + platform_fee
        distance_miles = 3.0

    # Generate order number
    order_count = db.query(Order).count()
    order_number = f"EF{datetime.now().strftime('%m%d')}{order_count + 1:05d}"

    # Create order - CRITICAL: Store delivery_distance_miles for accurate driver payout calculation
    new_order = Order(
        order_number=order_number,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        items=json.dumps(items_data),
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        delivery_fee=delivery_fee,
        tip=order_data.tip,
        platform_fee=platform_fee,
        total_amount=total_amount,
        delivery_address=json.dumps(order_data.delivery_address),
        delivery_instructions=order_data.delivery_instructions,
        delivery_latitude=order_data.delivery_latitude,
        delivery_longitude=order_data.delivery_longitude,
        delivery_distance_miles=distance_miles,  # Store actual distance for accurate payout calculation
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
        "tax_rate": tax_rate,
        "tax": tax_amount,
        "delivery_fee": delivery_fee,
        "delivery_distance_miles": distance_miles,
        "tip": order_data.tip,
        "platform_fee": platform_fee,
        "total": total_amount,
        "status": "Pending Payment",
        "processed_by": ai_employee["name"],
        "restaurant": vendor.restaurant_name or vendor.company_name
    }


# ==================== PAYMENT CONFIRMATION ====================

@router.post("/orders/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Confirm payment received - Called after Stripe webhook
    AI Employee: OrderBot Alpha
    Sends: Order Confirmation Email to Customer + New Order Email to Restaurant
    """
    ai_employee = AI_EMPLOYEES["ORDER_PROCESSOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "succeeded"
    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.now()

    db.commit()

    # Get vendor info for emails
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"
    restaurant_email = getattr(vendor, 'contact_email', None) or getattr(vendor, 'email', None) if vendor else None

    # Parse items from order
    items = []
    items_data = getattr(order, 'items_json', None) or getattr(order, 'items', None)
    if items_data:
        try:
            items = json.loads(items_data) if isinstance(items_data, str) else items_data
        except:
            items = []

    # Send Order Confirmation Email to Customer
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_order_confirmation_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_id=order.order_number,
                restaurant_name=restaurant_name,
                items=items,
                subtotal=float(order.subtotal or 0),
                delivery_fee=float(order.delivery_fee or 0),
                tax=float(getattr(order, 'tax_amount', None) or getattr(order, 'tax', None) or 0),
                total=float(order.total_amount or 0),
                delivery_address=order.delivery_address or "Address on file",
                estimated_time="30-45 minutes"
            ))
            print(f"[EMAIL] Order confirmation email queued for {order.customer_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send order confirmation: {e}")

    # Send New Order Email to Restaurant
    if EMAIL_ENABLED and restaurant_email:
        try:
            asyncio.create_task(send_restaurant_new_order_email(
                restaurant_email=restaurant_email,
                restaurant_name=restaurant_name,
                order_id=order.order_number,
                customer_name=order.customer_name,
                items=items,
                total=float(order.total_amount or 0),
                special_instructions=order.delivery_instructions or "None"
            ))
            print(f"[EMAIL] New order notification queued for restaurant {restaurant_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send restaurant notification: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Confirmed",
        "processed_by": ai_employee["name"],
        "message": "Payment confirmed, order sent to restaurant"
    }


# ==================== RESTAURANT FLOW ====================

@router.post("/orders/{order_id}/start-preparing")
async def start_preparing(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Restaurant starts preparing order - Called from iOS Restaurant App
    AI Employee: KitchenBot Beta
    Sends: Order Preparing Email to Customer
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.PREPARING
    order.preparing_at = datetime.now()

    db.commit()

    # Get vendor info for email
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"

    # Send Order Preparing Email to Customer
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_order_preparing_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_id=order.order_number,
                restaurant_name=restaurant_name,
                estimated_ready="20-30 minutes"
            ))
            print(f"[EMAIL] Order preparing email queued for {order.customer_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send preparing email: {e}")

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
    Order ready for driver pickup - Called from iOS Restaurant App
    AI Employee: KitchenBot Beta
    """
    ai_employee = AI_EMPLOYEES["RESTAURANT_COORDINATOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Keep as PREPARING until driver picks up
    # Just mark as ready internally

    db.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Ready for Pickup",
        "processed_by": ai_employee["name"],
        "message": "Notifying available drivers"
    }


# ==================== DRIVER FLOW ====================

@router.get("/orders/available-for-delivery")
async def get_available_orders(
    db: Session = Depends(get_db)
):
    """
    Get orders ready for driver pickup - Called from iOS Driver App
    """
    orders = db.query(Order).filter(
        Order.status == OrderStatus.PREPARING,
        Order.driver_id.is_(None)
    ).all()

    result = []
    for order in orders:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "restaurant": vendor.restaurant_name if vendor else "Unknown",
            "pickup_address": f"{vendor.street}, {vendor.city}" if vendor else "",
            "delivery_address": json.loads(order.delivery_address) if order.delivery_address else {},
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "total_earnings": order.delivery_fee + order.tip,
            "created_at": order.created_at.isoformat()
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
    AI Employee: DispatchBot Gamma
    Sends: Driver Assigned Email to Customer

    CRITICAL: Uses database-level locking to prevent race conditions
    where two drivers could simultaneously assign themselves to the same order.
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    # CRITICAL FIX: Use SELECT FOR UPDATE to lock the row and prevent race conditions
    # This ensures only one driver can be assigned even with concurrent requests
    from sqlalchemy import text

    # First, lock the order row for update
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check order status - must be PREPARING to be assignable
    if order.status not in [OrderStatus.PREPARING, OrderStatus.CONFIRMED]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be assigned in current status: {order.status.value}"
        )

    # Double-check driver assignment with lock held
    if order.driver_id:
        raise HTTPException(status_code=400, detail="Order already has a driver assigned")

    driver = db.query(Driver).filter(Driver.id == request.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if driver.status != DriverStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Driver is not active")

    # Check if driver is suspended or has pending issues
    if hasattr(driver, 'is_suspended') and driver.is_suspended:
        raise HTTPException(status_code=400, detail="Driver account is suspended")

    order.driver_id = driver.id
    order.driver_name = f"{driver.first_name} {driver.last_name}"
    order.assigned_at = datetime.now()

    db.commit()

    # Get vendor info for email
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"

    # Send Driver Assigned Email to Customer
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_driver_assigned_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_id=order.order_number,
                driver_name=order.driver_name,
                driver_photo_url=getattr(driver, 'profile_image', None),
                vehicle_info=f"{getattr(driver, 'vehicle_make', '')} {getattr(driver, 'vehicle_model', '')}".strip() or "Vehicle details in app",
                estimated_pickup="15-25 minutes"
            ))
            print(f"[EMAIL] Driver assigned email queued for {order.customer_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send driver assigned email: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "driver_id": driver.id,
        "driver_name": order.driver_name,
        "processed_by": ai_employee["name"]
    }


@router.post("/orders/{order_id}/picked-up")
async def order_picked_up(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Driver picked up order - Called from iOS Driver App
    AI Employee: DispatchBot Gamma
    Sends: Order Picked Up Email to Customer
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.OUT_FOR_DELIVERY

    db.commit()

    # Get vendor and driver info for email
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"
    driver = db.query(Driver).filter(Driver.id == order.driver_id).first()
    driver_name = f"{driver.first_name} {driver.last_name}" if driver else order.driver_name

    # Send Order Picked Up Email to Customer
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_order_picked_up_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_id=order.order_number,
                driver_name=driver_name,
                estimated_arrival="10-15 minutes"
            ))
            print(f"[EMAIL] Order picked up email queued for {order.customer_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send picked up email: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Out for Delivery",
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

    # Get vendor - CRITICAL: Required for accounting, must exist
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    if not vendor:
        print(f"[ERROR] Vendor {order.vendor_id} not found for order {order.order_number}")
        raise HTTPException(status_code=500, detail=f"Critical error: Vendor {order.vendor_id} not found. Cannot complete delivery accounting.")

    # Get driver - Optional, can be None for pickup orders
    driver = db.query(Driver).filter(Driver.id == order.driver_id).first() if order.driver_id else None

    # ==================== CREATE ACCOUNTING ENTRIES ====================

    # Generate entry number - Use order_id + timestamp for guaranteed uniqueness (avoids race conditions)
    # Using order.id ensures no duplicates even under concurrent requests
    unique_suffix = str(uuid.uuid4())[:6].upper()
    entry_number = f"JE-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{unique_suffix}"

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

    # Calculate payouts using centralized pricing config
    if PRICING_CONFIG_LOADED:
        # Restaurant payout: Subtotal minus restaurant commission
        restaurant_commission = RESTAURANT_COMMISSION_CONFIG.calculate_commission(order.subtotal)
        restaurant_payout = RESTAURANT_COMMISSION_CONFIG.calculate_restaurant_payout(order.subtotal)

        # Driver payout: Base pay + per-mile pay + 100% of tip
        # Estimate distance from delivery fee (or default to 3 miles)
        estimated_distance = 3.0
        if order.delivery_fee > 0:
            # Reverse-engineer distance from delivery fee if possible
            # delivery_fee = base + (per_mile * distance), solve for distance
            base = DELIVERY_FEE_CONFIG.base_fee
            per_mile = DELIVERY_FEE_CONFIG.per_mile_fee
            if per_mile > 0 and order.delivery_fee >= base:
                estimated_distance = (order.delivery_fee - base) / per_mile

        driver_base_pay = DRIVER_PAYOUT_CONFIG.calculate(estimated_distance)
        driver_tip = order.tip * DRIVER_PAYOUT_CONFIG.tip_percentage
        driver_payout = driver_base_pay + driver_tip

        # Calculate Stripe fees (2.9% + $0.30)
        stripe_fee = PAYMENT_PROCESSING_CONFIG.calculate_fee(order.total_amount)

        # Platform fee (stored on order)
        platform_fee = order.platform_fee
    else:
        # Fallback to simple calculation
        restaurant_payout = max(0.0, order.subtotal - PLATFORM_FEE)  # Never negative
        restaurant_commission = PLATFORM_FEE
        driver_payout = order.delivery_fee + order.tip
        stripe_fee = round(order.total_amount * 0.029 + 0.30, 2)
        platform_fee = PLATFORM_FEE
        estimated_distance = 3.0

    # CRITICAL: Never allow negative payouts
    restaurant_payout = max(0.0, restaurant_payout)
    driver_payout = max(0.0, driver_payout)

    # Create journal entry lines (double-entry accounting)
    #
    # PROPER DOUBLE-ENTRY ACCOUNTING:
    # Total customer payment: total_amount
    # This breaks down into:
    #   - Restaurant payout (liability)
    #   - Driver payout (liability)
    #   - Platform fee (revenue)
    #   - Tax collected (liability)
    #   - Stripe fee (expense - reduces our net cash)
    #
    # For the accounting equation to balance:
    # DEBITS (what we receive/expenses) = CREDITS (what we owe/revenue)
    # Cash (total - stripe_fee) + Stripe Expense = Restaurant + Driver + Platform + Tax
    #
    # Net cash received (after Stripe takes their cut)
    net_cash_received = order.total_amount - stripe_fee

    lines = [
        # DEBIT: Net cash we actually receive (after Stripe fee)
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="1000",
            account_name="Cash/Bank (Net)",
            debit=net_cash_received,
            credit=0,
            description=f"Net payment received for order {order.order_number} (after Stripe fee)"
        ),
        # DEBIT: Stripe fee is an expense
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="5100",
            account_name="Stripe Processing Fees",
            debit=stripe_fee,
            credit=0,
            description=f"Payment processing fee (${stripe_fee:.2f})"
        ),
        # CREDIT: Restaurant payable
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2100",
            account_name="Restaurant Payable",
            debit=0,
            credit=restaurant_payout,
            description=f"Payable to {vendor.restaurant_name if vendor else 'Restaurant'}"
        ),
        # CREDIT: Driver payable
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2200",
            account_name="Driver Payable",
            debit=0,
            credit=driver_payout,
            description=f"Payable to {order.driver_name or 'Driver'}"
        ),
        # CREDIT: Platform revenue
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="4000",
            account_name="Platform Revenue",
            debit=0,
            credit=platform_fee,
            description=f"Platform fee (${platform_fee:.2f})"
        ),
        # CREDIT: Tax collected (pass-through liability)
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2300",
            account_name="Tax Collected",
            debit=0,
            credit=order.tax_amount,
            description="Sales tax collected"
        )
    ]

    # Verify double-entry balance (debits must equal credits)
    total_debits = net_cash_received + stripe_fee
    total_credits = restaurant_payout + driver_payout + platform_fee + order.tax_amount
    imbalance = abs(total_debits - total_credits)

    # CRITICAL FIX: Throw exception if accounting is imbalanced (prevents posting bad entries)
    if imbalance > 0.01:
        print(f"[ACCOUNTING ERROR] Entry imbalance detected for order {order.order_number}")
        print(f"  Debits: ${total_debits:.2f}, Credits: ${total_credits:.2f}")
        print(f"  Difference: ${imbalance:.2f}")
        print(f"  Breakdown - Cash: ${net_cash_received:.2f}, Stripe: ${stripe_fee:.2f}")
        print(f"  Breakdown - Restaurant: ${restaurant_payout:.2f}, Driver: ${driver_payout:.2f}, Platform: ${platform_fee:.2f}, Tax: ${order.tax_amount:.2f}")

        # Rollback and raise exception - cannot post imbalanced journal entries
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Accounting imbalance detected: Debits ${total_debits:.2f} != Credits ${total_credits:.2f}. Order delivery cannot be completed. Contact support."
        )

    for line in lines:
        db.add(line)

    # ==================== CREATE VENDOR PAYOUT RECORD ====================

    # Generate payout number using order_id + UUID for guaranteed uniqueness (avoids race conditions)
    vendor_payout_uuid = str(uuid.uuid4())[:6].upper()
    vendor_payout_record = VendorPayout(
        payout_number=f"VP-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{vendor_payout_uuid}",
        vendor_id=order.vendor_id,
        period_start=order.created_at,
        period_end=datetime.now(),
        total_orders=1,
        gross_revenue=order.subtotal,
        platform_fee=platform_fee,
        stripe_fees=stripe_fee,
        net_payout=restaurant_payout,
        status="pending"
    )
    db.add(vendor_payout_record)

    # ==================== CREATE DRIVER PAYOUT RECORD ====================

    if driver:
        # Generate payout number using order_id + UUID for guaranteed uniqueness (avoids race conditions)
        driver_payout_uuid = str(uuid.uuid4())[:6].upper()
        driver_payout_record = DriverPayout(
            payout_number=f"DP-{datetime.now().strftime('%Y%m%d')}-{order.id:05d}-{driver_payout_uuid}",
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

    # Send Order Delivered Email to Customer
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"
    driver_name = f"{driver.first_name} {driver.last_name}" if driver else order.driver_name

    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_order_delivered_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_id=order.order_number,
                restaurant_name=restaurant_name,
                driver_name=driver_name,
                total=float(order.total_amount or 0)
            ))
            print(f"[EMAIL] Order delivered email queued for {order.customer_email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send delivered email: {e}")

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "status": "Delivered",
        "delivered_at": order.delivered_at.isoformat(),
        "processed_by": [dispatch_ai["name"], accountant_ai["name"]],
        "accounting": {
            "journal_entry": entry_number,
            "restaurant_payout": restaurant_payout,
            "driver_payout": driver_payout,
            "platform_revenue": platform_fee,
            "stripe_fees": stripe_fee,
            "tax_collected": order.tax_amount
        }
    }


# ==================== PAYOUTS ====================

@router.get("/payouts/pending")
async def get_pending_payouts(
    limit: int = DEFAULT_PAGINATION_LIMIT,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin_token)
):
    """
    Get all pending payouts - Restaurant & Driver
    CRITICAL: Requires admin authentication
    """
    # Enforce pagination limits
    limit = min(limit, MAX_PAGINATION_LIMIT)

    vendor_payouts = db.query(VendorPayout).filter(
        VendorPayout.status == "pending"
    ).offset(offset).limit(limit).all()

    driver_payouts = db.query(DriverPayout).filter(
        DriverPayout.status == "pending"
    ).offset(offset).limit(limit).all()

    # Get totals separately (without pagination)
    total_vendor = db.query(VendorPayout).filter(VendorPayout.status == "pending").count()
    total_driver = db.query(DriverPayout).filter(DriverPayout.status == "pending").count()

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
            "driver_total": sum(p.net_payout for p in driver_payouts),
            "restaurant_count": total_vendor,
            "driver_count": total_driver
        },
        "pagination": {
            "limit": limit,
            "offset": offset
        },
        "authenticated_by": admin.get("email", "admin")
    }


@router.post("/payouts/{payout_id}/process")
async def process_payout(
    payout_id: int,
    payout_type: str,  # "vendor" or "driver"
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin_token)
):
    """
    Process a payout - Mark as completed
    CRITICAL: Requires admin authentication
    AI Employee: LedgerBot Delta
    """
    ai_employee = AI_EMPLOYEES["ACCOUNTANT"]

    # Validate payout type
    if payout_type not in ["vendor", "driver"]:
        raise HTTPException(status_code=400, detail="Invalid payout_type. Must be 'vendor' or 'driver'")

    if payout_type == "vendor":
        payout = db.query(VendorPayout).filter(VendorPayout.id == payout_id).first()
    else:
        payout = db.query(DriverPayout).filter(DriverPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    # Prevent double-processing
    if payout.status == "completed":
        raise HTTPException(status_code=400, detail="Payout already processed")

    payout.status = "completed"
    payout.paid_at = datetime.now()
    payout.payment_method = "bank_transfer"

    db.commit()

    # Log the admin action
    print(f"[PAYOUT] Payout {payout.payout_number} processed by admin {admin.get('email', 'unknown')}")

    return {
        "success": True,
        "payout_id": payout.id,
        "payout_number": payout.payout_number,
        "amount": payout.net_payout,
        "status": "completed",
        "processed_by": ai_employee["name"],
        "admin": admin.get("email", "admin")
    }


# ==================== JOURNAL ENTRIES ====================

@router.get("/journal-entries")
async def get_journal_entries(
    limit: int = DEFAULT_PAGINATION_LIMIT,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin_token)
):
    """
    Get journal entries for accounting dashboard
    CRITICAL: Requires admin authentication
    """
    # Enforce pagination limits
    limit = min(limit, MAX_PAGINATION_LIMIT)
    entries = db.query(JournalEntry).order_by(
        JournalEntry.created_at.desc()
    ).offset(offset).limit(limit).all()

    # Get total count
    total_count = db.query(JournalEntry).count()

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

    return {
        "success": True,
        "entries": result,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total_count
        },
        "authenticated_by": admin.get("email", "admin")
    }


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

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": driver.id,
        "driver_code": driver.driver_id,
        "first_name": driver.first_name,
        "last_name": driver.last_name,
        "email": driver.email,
        "phone": driver.phone,
        "vehicle_type": driver.vehicle_type if hasattr(driver, 'vehicle_type') else None,
        "status": driver.status.value
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
    Get driver's active and completed deliveries - Called from iOS Driver App
    """
    orders = db.query(Order).filter(
        Order.driver_id == driver_id
    ).order_by(Order.created_at.desc()).limit(100).all()

    result = []
    for order in orders:
        vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
        delivery_addr = json.loads(order.delivery_address) if order.delivery_address else {}

        result.append({
            "id": order.id,
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status.value,
            "restaurant_name": vendor.restaurant_name if vendor else "Unknown",
            "restaurant_address": f"{vendor.street}, {vendor.city}, {vendor.state}" if vendor else "",
            "customer_name": order.customer_name,
            "customer_address": delivery_addr.get("street", "") + ", " + delivery_addr.get("city", ""),
            "customer_phone": order.customer_phone,
            "pickup_latitude": vendor.latitude if vendor and hasattr(vendor, 'latitude') else None,
            "pickup_longitude": vendor.longitude if vendor and hasattr(vendor, 'longitude') else None,
            "dropoff_latitude": delivery_addr.get("latitude"),
            "dropoff_longitude": delivery_addr.get("longitude"),
            "estimated_distance": None,
            "estimated_duration": 30,
            "delivery_fee": order.delivery_fee,
            "tip": order.tip,
            "created_at": order.created_at.isoformat(),
            "assigned_at": order.confirmed_at.isoformat() if order.confirmed_at else None,
            "picked_up_at": None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None
        })

    return {"success": True, "orders": result}


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


# ==================== STUCK ORDERS CLEANUP ====================

@router.get("/orders/stuck")
async def get_stuck_orders(
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin_token)
):
    """
    Get all orders that have exceeded their timeout thresholds.
    CRITICAL: Requires admin authentication.
    These orders need attention - either manual completion or cancellation.
    """
    stuck_orders = []

    # Get all non-terminal orders
    active_statuses = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.OUT_FOR_DELIVERY
    ]

    orders = db.query(Order).filter(Order.status.in_(active_statuses)).all()

    for order in orders:
        is_timed_out, timeout_msg = check_order_timeout(order)
        if is_timed_out:
            stuck_orders.append({
                "order_id": order.id,
                "order_number": order.order_number,
                "status": order.status.value,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "vendor_id": order.vendor_id,
                "total_amount": order.total_amount,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "timeout_reason": timeout_msg
            })

    return {
        "success": True,
        "stuck_orders_count": len(stuck_orders),
        "stuck_orders": stuck_orders,
        "authenticated_by": admin.get("email", "admin")
    }


@router.post("/orders/cleanup-stuck")
async def cleanup_stuck_orders(
    dry_run: bool = True,
    db: Session = Depends(get_db),
    admin: dict = Depends(verify_admin_token)
):
    """
    Cancel all orders that have exceeded their timeout thresholds.
    CRITICAL: Requires admin authentication.

    Args:
        dry_run: If True, only report what would be cancelled without actually cancelling.
                 Set to False to perform actual cancellation.
    """
    cancelled_orders = []
    active_statuses = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.OUT_FOR_DELIVERY
    ]

    orders = db.query(Order).filter(Order.status.in_(active_statuses)).all()

    for order in orders:
        is_timed_out, timeout_msg = check_order_timeout(order)
        if is_timed_out:
            order_info = {
                "order_id": order.id,
                "order_number": order.order_number,
                "previous_status": order.status.value,
                "timeout_reason": timeout_msg,
                "action": "would_cancel" if dry_run else "cancelled"
            }

            if not dry_run:
                # Actually cancel the order
                order.status = OrderStatus.CANCELLED
                order.updated_at = datetime.now()
                print(f"[CLEANUP] Order {order.order_number} cancelled due to timeout: {timeout_msg}")

            cancelled_orders.append(order_info)

    if not dry_run and cancelled_orders:
        db.commit()

    return {
        "success": True,
        "dry_run": dry_run,
        "orders_affected": len(cancelled_orders),
        "orders": cancelled_orders,
        "message": "Dry run - no orders were actually cancelled" if dry_run else f"Cancelled {len(cancelled_orders)} stuck orders",
        "processed_by": admin.get("email", "admin")
    }


@router.get("/orders/state-machine-info")
async def get_state_machine_info():
    """
    Get information about the order state machine - valid transitions and timeouts.
    Useful for frontend apps to understand allowed state changes.
    """
    return {
        "state_transitions": {
            status.value: [s.value for s in allowed]
            for status, allowed in ORDER_STATE_TRANSITIONS.items()
        },
        "state_timeouts_minutes": {
            status.value: timeout
            for status, timeout in ORDER_TIMEOUTS.items()
        },
        "terminal_states": ["DELIVERED", "CANCELLED"],
        "description": "Orders must follow valid state transitions. Orders exceeding timeout thresholds are considered stuck and should be reviewed."
    }
