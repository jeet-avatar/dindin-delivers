"""
Partial Order Management System
==============================
Handles the flow when a restaurant cannot fulfill all items in an order.

Flow:
1. Restaurant receives order with 3 items
2. Restaurant marks 1 item as unavailable
3. System calculates new pricing (still $1 platform fee)
4. Customer receives push notification
5. Customer can:
   - Accept partial order (proceed with available items + partial refund)
   - Reject order (full refund)
6. If no response in 10 minutes, auto-refund

AI Employee: OrderBot Omega
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import json
import asyncio

from database import get_db
from models import (
    Order, OrderStatus, OrderModification, Vendor, Refund, RefundStatus, RefundReason,
    JournalEntry, JournalEntryLine
)

router = APIRouter(prefix="/api", tags=["Partial Orders"])

# AI Employee handling partial orders
AI_EMPLOYEE_ORDER = {
    "id": "AI_EMP_007",
    "name": "OrderBot Omega",
    "role": "Order Modification Specialist",
    "specialization": "Partial order handling and customer communication"
}

# Platform fee is always $1
PLATFORM_FEE = 1.0

# Customer has 10 minutes to respond
MODIFICATION_EXPIRY_MINUTES = 10


# ==================== REQUEST/RESPONSE MODELS ====================

class UnavailableItem(BaseModel):
    """Item marked as unavailable by restaurant"""
    item_index: int  # Index in original order items array
    name: str
    price: float
    quantity: int
    reason: str = "out of stock"


class MarkItemsUnavailableRequest(BaseModel):
    """Restaurant marks items as unavailable"""
    unavailable_items: List[UnavailableItem]
    restaurant_note: Optional[str] = None


class CustomerResponseRequest(BaseModel):
    """Customer's response to partial order"""
    response: str  # "accept_partial" or "reject_full_refund"


# ==================== RESTAURANT API: MARK ITEMS UNAVAILABLE ====================

@router.post("/orders/{order_id}/mark-unavailable")
async def mark_items_unavailable(
    order_id: int,
    request: MarkItemsUnavailableRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Restaurant marks items as unavailable.
    Creates modification request for customer approval.

    Returns calculated new totals for customer to review.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Can only modify confirmed orders (not yet preparing)
    if order.status not in [OrderStatus.CONFIRMED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify order in {order.status.value} status. Order must be CONFIRMED."
        )

    # Check if there's already a pending modification
    existing = db.query(OrderModification).filter(
        OrderModification.order_id == order_id,
        OrderModification.status == "pending"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="There's already a pending modification request for this order"
        )

    # Parse original items
    try:
        original_items = json.loads(order.items) if isinstance(order.items, str) else order.items
    except:
        raise HTTPException(status_code=500, detail="Failed to parse order items")

    if not request.unavailable_items:
        raise HTTPException(status_code=400, detail="No items marked as unavailable")

    # Validate item indices
    for item in request.unavailable_items:
        if item.item_index < 0 or item.item_index >= len(original_items):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid item index: {item.item_index}"
            )

    # Calculate what's being removed
    unavailable_indices = {item.item_index for item in request.unavailable_items}
    unavailable_total = sum(
        item.price * item.quantity for item in request.unavailable_items
    )

    # Build modified items list
    modified_items = [
        item for i, item in enumerate(original_items)
        if i not in unavailable_indices
    ]

    if not modified_items:
        raise HTTPException(
            status_code=400,
            detail="Cannot mark all items as unavailable. Use reject order instead."
        )

    # Calculate new totals
    modified_subtotal = sum(
        item.get("total_price", item.get("price", 0) * item.get("quantity", 1))
        for item in modified_items
    )

    # Tax rate from original order
    tax_rate = order.tax_rate or 0.0625  # Default 6.25%
    modified_tax = round(modified_subtotal * tax_rate, 2)

    # Platform fee stays $1
    modified_platform_fee = PLATFORM_FEE

    # Delivery fee stays the same
    modified_delivery_fee = order.delivery_fee or 0.0

    # Tip proportionally adjusted based on subtotal ratio
    original_subtotal = order.subtotal or 1  # Avoid division by zero
    tip_ratio = modified_subtotal / original_subtotal if original_subtotal > 0 else 1
    modified_tip = round((order.tip or 0) * tip_ratio, 2)

    # New total
    modified_total = round(
        modified_subtotal + modified_tax + modified_delivery_fee +
        modified_platform_fee + modified_tip, 2
    )

    # Partial refund = original total - new total
    partial_refund = round(order.total_amount - modified_total, 2)

    # Create modification record
    mod_count = db.query(OrderModification).count()
    modification = OrderModification(
        modification_number=f"MOD-{datetime.now().strftime('%Y%m%d')}-{mod_count + 1:05d}",
        order_id=order.id,

        # Original order
        original_items=json.dumps(original_items),
        original_subtotal=order.subtotal,
        original_tax=order.tax_amount,
        original_total=order.total_amount,

        # Unavailable items
        unavailable_items=json.dumps([item.dict() for item in request.unavailable_items]),
        unavailable_count=len(request.unavailable_items),
        unavailable_total=unavailable_total,

        # Modified order
        modified_items=json.dumps(modified_items),
        modified_subtotal=modified_subtotal,
        modified_tax=modified_tax,
        modified_delivery_fee=modified_delivery_fee,
        modified_platform_fee=modified_platform_fee,
        modified_tip=modified_tip,
        modified_total=modified_total,

        # Refund
        partial_refund_amount=partial_refund,

        # Status
        status="pending",
        expires_at=datetime.utcnow() + timedelta(minutes=MODIFICATION_EXPIRY_MINUTES),

        # Restaurant info
        created_by_restaurant_id=order.vendor_id
    )

    # Get restaurant name
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    if vendor:
        modification.created_by_restaurant_name = vendor.restaurant_name

    db.add(modification)

    # Update order status
    order.status = OrderStatus.PENDING_MODIFICATION
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(modification)

    # Send push notification to customer (background task)
    background_tasks.add_task(
        send_partial_order_notification,
        order=order,
        modification=modification,
        restaurant_name=vendor.restaurant_name if vendor else "Restaurant"
    )

    # Build response
    unavailable_items_info = [
        {
            "name": item.name,
            "price": item.price,
            "quantity": item.quantity,
            "total": item.price * item.quantity,
            "reason": item.reason
        }
        for item in request.unavailable_items
    ]

    available_items_info = [
        {
            "name": item.get("name"),
            "price": item.get("unit_price", item.get("price", 0)),
            "quantity": item.get("quantity", 1),
            "total": item.get("total_price", item.get("price", 0) * item.get("quantity", 1))
        }
        for item in modified_items
    ]

    return {
        "success": True,
        "message": f"Customer notified about {len(request.unavailable_items)} unavailable item(s). Awaiting response.",
        "modification_number": modification.modification_number,
        "order_id": order.id,
        "order_number": order.order_number,

        "unavailable_items": unavailable_items_info,
        "available_items": available_items_info,

        "original_total": order.total_amount,
        "new_total": modified_total,
        "partial_refund_if_accepted": partial_refund,

        "pricing_breakdown": {
            "subtotal": modified_subtotal,
            "tax": modified_tax,
            "delivery_fee": modified_delivery_fee,
            "platform_fee": modified_platform_fee,  # Still $1
            "tip": modified_tip,
            "total": modified_total
        },

        "customer_options": [
            {
                "action": "accept_partial",
                "description": f"Accept order with {len(modified_items)} item(s) for ${modified_total:.2f}",
                "refund_amount": partial_refund
            },
            {
                "action": "reject_full_refund",
                "description": "Cancel entire order for full refund",
                "refund_amount": order.total_amount
            }
        ],

        "expires_at": modification.expires_at.isoformat(),
        "expires_in_minutes": MODIFICATION_EXPIRY_MINUTES,

        "processed_by": AI_EMPLOYEE_ORDER["name"]
    }


# ==================== CUSTOMER API: GET MODIFICATION DETAILS ====================

@router.get("/orders/{order_id}/modification")
async def get_order_modification(
    order_id: int,
    db: Session = Depends(get_db)
):
    """
    Get pending modification details for an order.
    Used by customer app to show partial order options.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    modification = db.query(OrderModification).filter(
        OrderModification.order_id == order_id,
        OrderModification.status == "pending"
    ).first()

    if not modification:
        return {
            "has_pending_modification": False,
            "order_status": order.status.value
        }

    # Parse items
    unavailable_items = json.loads(modification.unavailable_items) if modification.unavailable_items else []
    available_items = json.loads(modification.modified_items) if modification.modified_items else []

    # Check if expired
    is_expired = datetime.utcnow() > modification.expires_at
    time_remaining = max(0, (modification.expires_at - datetime.utcnow()).total_seconds())

    return {
        "has_pending_modification": True,
        "is_expired": is_expired,
        "modification_number": modification.modification_number,

        "unavailable_items": unavailable_items,
        "unavailable_count": modification.unavailable_count,

        "available_items": available_items,
        "available_count": len(available_items),

        "original_total": modification.original_total,
        "new_total": modification.modified_total,
        "partial_refund_amount": modification.partial_refund_amount,

        "pricing": {
            "subtotal": modification.modified_subtotal,
            "tax": modification.modified_tax,
            "delivery_fee": modification.modified_delivery_fee,
            "platform_fee": modification.modified_platform_fee,
            "tip": modification.modified_tip,
            "total": modification.modified_total
        },

        "restaurant_name": modification.created_by_restaurant_name,

        "time_remaining_seconds": int(time_remaining),
        "expires_at": modification.expires_at.isoformat(),

        "actions": {
            "accept": {
                "endpoint": f"/api/orders/{order_id}/modification/respond",
                "body": {"response": "accept_partial"},
                "description": f"Accept partial order for ${modification.modified_total:.2f}"
            },
            "reject": {
                "endpoint": f"/api/orders/{order_id}/modification/respond",
                "body": {"response": "reject_full_refund"},
                "description": f"Reject and get full refund of ${modification.original_total:.2f}"
            }
        }
    }


# ==================== CUSTOMER API: RESPOND TO MODIFICATION ====================

@router.post("/orders/{order_id}/modification/respond")
async def respond_to_modification(
    order_id: int,
    request: CustomerResponseRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Customer responds to partial order modification.
    - accept_partial: Proceed with available items, get partial refund
    - reject_full_refund: Cancel order, get full refund
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.PENDING_MODIFICATION:
        raise HTTPException(
            status_code=400,
            detail=f"Order is not pending modification. Current status: {order.status.value}"
        )

    modification = db.query(OrderModification).filter(
        OrderModification.order_id == order_id,
        OrderModification.status == "pending"
    ).first()

    if not modification:
        raise HTTPException(status_code=404, detail="No pending modification found")

    # Check if expired
    if datetime.utcnow() > modification.expires_at:
        # Auto-process as rejection
        request.response = "reject_full_refund"

    if request.response not in ["accept_partial", "reject_full_refund"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid response. Use 'accept_partial' or 'reject_full_refund'"
        )

    if request.response == "accept_partial":
        return await _process_accept_partial(order, modification, db, background_tasks)
    else:
        return await _process_reject_full_refund(order, modification, db, background_tasks)


async def _process_accept_partial(
    order: Order,
    modification: OrderModification,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Process customer accepting partial order"""

    # Update order with modified values
    order.items = modification.modified_items
    order.subtotal = modification.modified_subtotal
    order.tax_amount = modification.modified_tax
    order.tip = modification.modified_tip
    order.total_amount = modification.modified_total
    order.status = OrderStatus.CONFIRMED  # Back to confirmed, restaurant can prepare
    order.updated_at = datetime.utcnow()

    # Update modification record
    modification.status = "accepted"
    modification.customer_response = "accept_partial"
    modification.customer_responded_at = datetime.utcnow()

    # Process partial refund for the difference
    partial_refund_amount = modification.partial_refund_amount

    if partial_refund_amount > 0:
        # Create refund record
        refund_count = db.query(Refund).count()
        refund = Refund(
            refund_number=f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_count + 1:05d}",
            order_id=order.id,
            reason=RefundReason.ITEM_UNAVAILABLE,
            reason_details=f"Partial refund for {modification.unavailable_count} unavailable item(s)",
            requested_by="system",
            original_amount=modification.original_total,
            refund_amount=partial_refund_amount,
            refund_type="partial",
            stripe_refund_id=f"PARTIAL-{order.id}",  # Would be actual Stripe refund in production
            stripe_status="succeeded",
            status=RefundStatus.COMPLETED,
            processed_by_ai=AI_EMPLOYEE_ORDER["name"],
            processed_at=datetime.utcnow()
        )
        db.add(refund)

    db.commit()

    # Notify restaurant that customer accepted
    background_tasks.add_task(
        send_acceptance_notification,
        order=order,
        modification=modification
    )

    available_items = json.loads(modification.modified_items) if modification.modified_items else []

    return {
        "success": True,
        "response": "accepted",
        "message": f"Order accepted with {len(available_items)} item(s). Restaurant will start preparing.",
        "order_id": order.id,
        "order_number": order.order_number,
        "order_status": order.status.value,

        "final_order": {
            "items": available_items,
            "subtotal": modification.modified_subtotal,
            "tax": modification.modified_tax,
            "delivery_fee": modification.modified_delivery_fee,
            "platform_fee": modification.modified_platform_fee,
            "tip": modification.modified_tip,
            "total": modification.modified_total
        },

        "refund_issued": partial_refund_amount > 0,
        "refund_amount": partial_refund_amount,

        "processed_by": AI_EMPLOYEE_ORDER["name"]
    }


async def _process_reject_full_refund(
    order: Order,
    modification: OrderModification,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Process customer rejecting order (full refund)"""

    # Update order
    order.status = OrderStatus.CANCELLED
    order.payment_status = "refunded"
    order.updated_at = datetime.utcnow()

    # Update modification record
    modification.status = "rejected"
    modification.customer_response = "reject_full_refund"
    modification.customer_responded_at = datetime.utcnow()

    # Create full refund record
    refund_count = db.query(Refund).count()
    refund = Refund(
        refund_number=f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_count + 1:05d}",
        order_id=order.id,
        reason=RefundReason.ITEM_UNAVAILABLE,
        reason_details=f"Customer rejected partial order. {modification.unavailable_count} item(s) were unavailable.",
        requested_by="customer",
        original_amount=modification.original_total,
        refund_amount=modification.original_total,
        refund_type="full",
        refund_subtotal=order.subtotal,
        refund_tax=order.tax_amount,
        refund_delivery_fee=order.delivery_fee,
        refund_platform_fee=order.platform_fee,
        refund_tip=order.tip,
        stripe_refund_id=f"FULL-{order.id}",  # Would be actual Stripe refund in production
        stripe_status="succeeded",
        status=RefundStatus.COMPLETED,
        processed_by_ai=AI_EMPLOYEE_ORDER["name"],
        processed_at=datetime.utcnow()
    )
    db.add(refund)

    db.commit()

    # Notify restaurant that customer rejected
    background_tasks.add_task(
        send_rejection_notification,
        order=order,
        modification=modification
    )

    return {
        "success": True,
        "response": "rejected",
        "message": "Order cancelled. Full refund has been issued.",
        "order_id": order.id,
        "order_number": order.order_number,
        "order_status": order.status.value,

        "refund_amount": modification.original_total,
        "refund_number": refund.refund_number,

        "processed_by": AI_EMPLOYEE_ORDER["name"]
    }


# ==================== NOTIFICATION FUNCTIONS ====================

async def send_partial_order_notification(order: Order, modification: OrderModification, restaurant_name: str):
    """Send push notification to customer about partial order"""
    print(f"[PUSH] Sending partial order notification to customer for order {order.order_number}")
    print(f"[PUSH] Restaurant: {restaurant_name}")
    print(f"[PUSH] Unavailable items: {modification.unavailable_count}")
    print(f"[PUSH] New total: ${modification.modified_total:.2f}")
    # In production: Use Firebase/APNs to send actual push notification


async def send_acceptance_notification(order: Order, modification: OrderModification):
    """Notify restaurant that customer accepted partial order"""
    print(f"[PUSH] Customer accepted partial order {order.order_number}")
    print(f"[PUSH] Restaurant can start preparing")


async def send_rejection_notification(order: Order, modification: OrderModification):
    """Notify restaurant that customer rejected partial order"""
    print(f"[PUSH] Customer rejected partial order {order.order_number}")
    print(f"[PUSH] Order cancelled, full refund issued")


# ==================== BACKGROUND TASK: AUTO-EXPIRE MODIFICATIONS ====================

async def auto_expire_modifications(db: Session):
    """
    Background task to auto-expire modifications that weren't responded to.
    Should be run periodically (e.g., every minute).
    """
    expired = db.query(OrderModification).filter(
        OrderModification.status == "pending",
        OrderModification.expires_at < datetime.utcnow()
    ).all()

    for mod in expired:
        order = db.query(Order).filter(Order.id == mod.order_id).first()
        if order and order.status == OrderStatus.PENDING_MODIFICATION:
            # Auto-refund
            order.status = OrderStatus.CANCELLED
            order.payment_status = "refunded"
            order.updated_at = datetime.utcnow()

            mod.status = "expired"
            mod.customer_response = "auto_expired"
            mod.customer_responded_at = datetime.utcnow()

            # Create refund
            refund_count = db.query(Refund).count()
            refund = Refund(
                refund_number=f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_count + 1:05d}",
                order_id=order.id,
                reason=RefundReason.ITEM_UNAVAILABLE,
                reason_details="Modification request expired. Customer did not respond.",
                requested_by="system",
                original_amount=mod.original_total,
                refund_amount=mod.original_total,
                refund_type="full",
                stripe_refund_id=f"EXPIRED-{order.id}",
                stripe_status="succeeded",
                status=RefundStatus.COMPLETED,
                processed_by_ai=AI_EMPLOYEE_ORDER["name"],
                processed_at=datetime.utcnow()
            )
            db.add(refund)

            print(f"[AUTO-EXPIRE] Order {order.order_number} modification expired. Full refund issued.")

    db.commit()


# ==================== DATABASE MIGRATION ENDPOINT ====================

@router.post("/admin/migrate-order-status-enum")
async def migrate_order_status_enum(db: Session = Depends(get_db)):
    """
    ONE-TIME migration to add PENDING_MODIFICATION to PostgreSQL order status enum.
    Run this once after deploying the partial order feature.
    """
    from sqlalchemy import text

    try:
        # Check if the enum value already exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'PENDING_MODIFICATION'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'orderstatus')
            )
        """))
        exists = result.scalar()

        if exists:
            return {
                "success": True,
                "message": "PENDING_MODIFICATION status already exists in database enum",
                "action": "no_change"
            }

        # Add the new enum value after CONFIRMED
        db.execute(text("""
            ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PENDING_MODIFICATION' AFTER 'CONFIRMED'
        """))
        db.commit()

        return {
            "success": True,
            "message": "Successfully added PENDING_MODIFICATION to orderstatus enum",
            "action": "enum_updated"
        }

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": str(e),
            "hint": "If ALTER TYPE fails, try: ALTER TYPE orderstatus ADD VALUE 'PENDING_MODIFICATION'"
        }
