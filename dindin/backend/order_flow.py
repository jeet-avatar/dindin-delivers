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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json

from database import get_db
from models import (
    Order, OrderStatus, Vendor, VendorMenuItem, Driver, DriverStatus,
    VendorPayout, DriverPayout, JournalEntry, JournalEntryLine
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

# Platform fee - $1 flat fee per order
PLATFORM_FEE = 1.00


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

    # Calculate fees
    TAX_RATE = 0.09  # 9% tax
    DELIVERY_FEE = 4.99

    tax_amount = subtotal * TAX_RATE
    total_amount = subtotal + tax_amount + DELIVERY_FEE + order_data.tip + PLATFORM_FEE

    # Generate order number
    order_count = db.query(Order).count()
    order_number = f"EF{datetime.now().strftime('%m%d')}{order_count + 1:05d}"

    # Create order
    new_order = Order(
        order_number=order_number,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        vendor_id=order_data.vendor_id,
        items=json.dumps(items_data),
        subtotal=subtotal,
        tax_rate=TAX_RATE,
        tax_amount=tax_amount,
        delivery_fee=DELIVERY_FEE,
        tip=order_data.tip,
        platform_fee=PLATFORM_FEE,
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
        "delivery_fee": DELIVERY_FEE,
        "tip": order_data.tip,
        "platform_fee": PLATFORM_FEE,
        "total": total_amount,
        "status": "Pending Payment",
        "processed_by": ai_employee["name"],
        "restaurant": vendor.restaurant_name or vendor.company_name
    }


# ==================== PAYMENT CONFIRMATION ====================

@router.post("/orders/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Confirm payment received - Called after Stripe webhook
    AI Employee: OrderBot Alpha
    """
    ai_employee = AI_EMPLOYEES["ORDER_PROCESSOR"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "succeeded"
    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.now()

    db.commit()

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
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.driver_id:
        raise HTTPException(status_code=400, detail="Order already has a driver")

    driver = db.query(Driver).filter(Driver.id == request.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if driver.status != DriverStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Driver is not active")

    order.driver_id = driver.id
    order.driver_name = f"{driver.first_name} {driver.last_name}"

    db.commit()

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
    """
    ai_employee = AI_EMPLOYEES["DELIVERY_DISPATCHER"]

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = OrderStatus.OUT_FOR_DELIVERY

    db.commit()

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

    # Calculate payouts
    restaurant_payout = order.subtotal - PLATFORM_FEE  # Subtotal minus $1 platform fee
    driver_payout = order.delivery_fee + order.tip  # Delivery fee + tip

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
            description=f"Payable to {vendor.restaurant_name if vendor else 'Restaurant'}"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2200",
            account_name="Driver Payable",
            debit=0,
            credit=driver_payout,
            description=f"Payable to {order.driver_name or 'Driver'}"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="4000",
            account_name="Platform Revenue",
            debit=0,
            credit=PLATFORM_FEE,
            description="Platform fee ($1.00)"
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
        platform_fee=PLATFORM_FEE,
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
            "platform_revenue": PLATFORM_FEE,
            "tax_collected": order.tax_amount
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
