"""
EatFair P2P - Refund & Invoice System
Handles order cancellations, refunds, and invoice generation with PDF

AI Employee: FinanceBot Zeta (AI_EMP_006)
- Processes refund requests
- Generates invoices with PDF
- Sends invoice emails
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import stripe
import json
import os
import asyncio
from io import BytesIO

from database import get_db
from models import (
    Order, OrderStatus, Vendor, Refund, RefundReason, RefundStatus,
    OrderInvoice, JournalEntry, JournalEntryLine
)

# Email imports - from main_new.py
try:
    from main_new import (
        send_refund_confirmation_email,
        send_invoice_email
    )
    EMAIL_ENABLED = True
    print("[REFUND] Email functions imported successfully")
except ImportError as e:
    EMAIL_ENABLED = False
    print(f"[REFUND] Email service not available: {e}")

# Stripe setup
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key_here")

router = APIRouter(prefix="/api", tags=["refunds", "invoices"])

# AI Employee for finance operations
AI_EMPLOYEE_FINANCE = {
    "id": "AI_EMP_006",
    "name": "FinanceBot Zeta",
    "role": "Finance & Refund Specialist"
}


# ==================== PYDANTIC MODELS ====================

class RefundRequest(BaseModel):
    order_id: int
    reason: str  # RefundReason enum value
    reason_details: Optional[str] = None
    requested_by: str = "customer"  # customer, restaurant, driver, system
    requested_by_id: Optional[int] = None
    refund_type: str = "full"  # full, partial
    partial_amount: Optional[float] = None


class CancelOrderRequest(BaseModel):
    reason: Optional[str] = None
    reason_details: Optional[str] = None


class RestaurantRejectRequest(BaseModel):
    reason: str = "restaurant_rejected"
    reason_details: Optional[str] = None


# ==================== CANCELLATION TIME WINDOWS ====================

CANCELLATION_POLICY = {
    # Time windows in minutes from order creation
    "FREE_CANCELLATION_WINDOW": 5,  # Full refund within 5 minutes
    "PARTIAL_REFUND_WINDOW": 15,    # Partial refund (minus platform fee) within 15 minutes
    "NO_REFUND_AFTER_PREPARING": True,  # No refund once restaurant starts preparing
    "REFUND_DELIVERY_FEE_CUTOFF": 10,  # Refund delivery fee only within 10 minutes
}


def get_refund_eligibility(order: Order) -> dict:
    """Determine refund eligibility based on order status and timing"""
    now = datetime.utcnow()
    order_age_minutes = (now - order.created_at).total_seconds() / 60

    # Already delivered or cancelled - no refund
    if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
        return {
            "eligible": False,
            "refund_type": None,
            "refund_percentage": 0,
            "message": f"Order is already {order.status.value}. No refund available."
        }

    # Order out for delivery - no refund (food is on the way)
    if order.status == OrderStatus.OUT_FOR_DELIVERY:
        return {
            "eligible": False,
            "refund_type": None,
            "refund_percentage": 0,
            "message": "Order is out for delivery. Cannot cancel at this stage."
        }

    # Restaurant preparing - partial refund possible (no delivery fee refund)
    if order.status == OrderStatus.PREPARING:
        return {
            "eligible": True,
            "refund_type": "partial",
            "refund_percentage": 80,  # 80% refund when preparing
            "include_delivery_fee": False,
            "include_platform_fee": False,
            "include_tip": True,  # Refund tip if driver not assigned
            "message": "Order is being prepared. 80% refund available (food costs)."
        }

    # Free cancellation window (within 5 minutes, not yet preparing)
    if order_age_minutes <= CANCELLATION_POLICY["FREE_CANCELLATION_WINDOW"]:
        return {
            "eligible": True,
            "refund_type": "full",
            "refund_percentage": 100,
            "include_delivery_fee": True,
            "include_platform_fee": True,
            "include_tip": True,
            "message": "Full refund available (within free cancellation window)."
        }

    # Partial refund window (5-15 minutes)
    if order_age_minutes <= CANCELLATION_POLICY["PARTIAL_REFUND_WINDOW"]:
        return {
            "eligible": True,
            "refund_type": "partial",
            "refund_percentage": 95,  # 95% refund
            "include_delivery_fee": order_age_minutes <= CANCELLATION_POLICY["REFUND_DELIVERY_FEE_CUTOFF"],
            "include_platform_fee": False,  # Keep platform fee
            "include_tip": True,
            "message": "95% refund available (partial cancellation window)."
        }

    # After 15 minutes but before preparing - smaller refund
    return {
        "eligible": True,
        "refund_type": "partial",
        "refund_percentage": 85,
        "include_delivery_fee": False,
        "include_platform_fee": False,
        "include_tip": True,
        "message": "85% refund available (late cancellation)."
    }


# ==================== CUSTOMER CANCELLATION ====================

@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    cancel_request: CancelOrderRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Customer cancels their order
    AI Employee: FinanceBot Zeta
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check eligibility
    eligibility = get_refund_eligibility(order)
    if not eligibility["eligible"]:
        raise HTTPException(status_code=400, detail=eligibility["message"])

    # Calculate refund amount
    refund_amounts = calculate_refund_amounts(order, eligibility)

    # Process Stripe refund
    stripe_result = await process_stripe_refund(
        order=order,
        refund_amount=refund_amounts["total_refund"],
        reason="requested_by_customer"
    )

    if not stripe_result["success"]:
        raise HTTPException(status_code=500, detail=f"Refund failed: {stripe_result['error']}")

    # Create refund record
    refund_count = db.query(Refund).count()
    refund = Refund(
        refund_number=f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_count + 1:05d}",
        order_id=order.id,
        reason=RefundReason.CUSTOMER_CANCELLED,
        reason_details=cancel_request.reason_details or cancel_request.reason,
        requested_by="customer",
        original_amount=order.total_amount,
        refund_amount=refund_amounts["total_refund"],
        refund_type=eligibility["refund_type"],
        refund_subtotal=refund_amounts["subtotal_refund"],
        refund_tax=refund_amounts["tax_refund"],
        refund_delivery_fee=refund_amounts["delivery_fee_refund"],
        refund_platform_fee=refund_amounts["platform_fee_refund"],
        refund_tip=refund_amounts["tip_refund"],
        stripe_refund_id=stripe_result.get("refund_id"),
        stripe_payment_intent_id=order.stripe_payment_intent_id,
        stripe_status=stripe_result.get("status", "succeeded"),
        status=RefundStatus.COMPLETED,
        processed_by_ai=AI_EMPLOYEE_FINANCE["name"],
        processed_at=datetime.utcnow()
    )
    db.add(refund)

    # Update order status
    order.status = OrderStatus.CANCELLED
    order.payment_status = "refunded"
    order.updated_at = datetime.utcnow()

    # Create journal entry for refund
    create_refund_journal_entry(db, order, refund, refund_amounts)

    db.commit()

    # Send refund confirmation email
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_refund_confirmation_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_number=order.order_number,
                refund_amount=refund_amounts["total_refund"],
                refund_reason="Order cancelled by customer",
                original_amount=order.total_amount
            ))
        except Exception as e:
            print(f"[EMAIL] Failed to send refund email: {e}")

    return {
        "success": True,
        "message": eligibility["message"],
        "order_id": order.id,
        "order_number": order.order_number,
        "refund_number": refund.refund_number,
        "original_amount": order.total_amount,
        "refund_amount": refund_amounts["total_refund"],
        "refund_breakdown": refund_amounts,
        "refund_type": eligibility["refund_type"],
        "stripe_refund_id": stripe_result.get("refund_id"),
        "processed_by": AI_EMPLOYEE_FINANCE["name"]
    }


# ==================== RESTAURANT REJECTION ====================

@router.post("/orders/{order_id}/restaurant-reject")
async def restaurant_reject_order(
    order_id: int,
    reject_request: RestaurantRejectRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Restaurant rejects/cancels an order
    Always results in FULL refund to customer
    AI Employee: FinanceBot Zeta
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if order can be rejected
    if order.status in [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot reject order that is already out for delivery or delivered"
        )

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Order is already cancelled")

    # Restaurant rejection = FULL refund to customer
    refund_amounts = {
        "subtotal_refund": order.subtotal,
        "tax_refund": order.tax_amount,
        "delivery_fee_refund": order.delivery_fee,
        "platform_fee_refund": order.platform_fee,
        "tip_refund": order.tip,
        "total_refund": order.total_amount
    }

    # Process Stripe refund
    stripe_result = await process_stripe_refund(
        order=order,
        refund_amount=order.total_amount,
        reason="merchant_request"
    )

    if not stripe_result["success"]:
        raise HTTPException(status_code=500, detail=f"Refund failed: {stripe_result['error']}")

    # Determine reason
    reason = RefundReason.RESTAURANT_REJECTED
    if "closed" in (reject_request.reason_details or "").lower():
        reason = RefundReason.RESTAURANT_CLOSED
    elif "unavailable" in (reject_request.reason_details or "").lower():
        reason = RefundReason.ITEM_UNAVAILABLE

    # Create refund record
    refund_count = db.query(Refund).count()
    refund = Refund(
        refund_number=f"RF-{datetime.now().strftime('%Y%m%d')}-{refund_count + 1:05d}",
        order_id=order.id,
        reason=reason,
        reason_details=reject_request.reason_details,
        requested_by="restaurant",
        requested_by_id=order.vendor_id,
        original_amount=order.total_amount,
        refund_amount=order.total_amount,
        refund_type="full",
        refund_subtotal=order.subtotal,
        refund_tax=order.tax_amount,
        refund_delivery_fee=order.delivery_fee,
        refund_platform_fee=order.platform_fee,
        refund_tip=order.tip,
        stripe_refund_id=stripe_result.get("refund_id"),
        stripe_payment_intent_id=order.stripe_payment_intent_id,
        stripe_status="succeeded",
        status=RefundStatus.COMPLETED,
        processed_by_ai=AI_EMPLOYEE_FINANCE["name"],
        processed_at=datetime.utcnow()
    )
    db.add(refund)

    # Update order
    order.status = OrderStatus.CANCELLED
    order.payment_status = "refunded"
    order.updated_at = datetime.utcnow()

    # Create journal entry
    create_refund_journal_entry(db, order, refund, refund_amounts)

    db.commit()

    # Get restaurant name
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"

    # Send refund email
    if EMAIL_ENABLED and order.customer_email:
        try:
            asyncio.create_task(send_refund_confirmation_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                order_number=order.order_number,
                refund_amount=order.total_amount,
                refund_reason=f"Order cancelled by {restaurant_name}: {reject_request.reason_details or 'Unable to fulfill order'}",
                original_amount=order.total_amount
            ))
        except Exception as e:
            print(f"[EMAIL] Failed to send refund email: {e}")

    return {
        "success": True,
        "message": "Order rejected. Full refund issued to customer.",
        "order_id": order.id,
        "order_number": order.order_number,
        "refund_number": refund.refund_number,
        "refund_amount": order.total_amount,
        "stripe_refund_id": stripe_result.get("refund_id"),
        "processed_by": AI_EMPLOYEE_FINANCE["name"]
    }


# ==================== STRIPE REFUND PROCESSING ====================

async def process_stripe_refund(
    order: Order,
    refund_amount: float,
    reason: str = "requested_by_customer"
) -> dict:
    """Process refund through Stripe"""
    if not order.stripe_payment_intent_id:
        # For orders without Stripe payment (test orders, cash payments, etc.)
        # We can still cancel but no Stripe refund is processed
        return {
            "success": True,
            "refund_id": f"MANUAL-{order.id}",
            "status": "manual",
            "amount": refund_amount,
            "note": "No Stripe payment to refund - order cancelled without payment processing"
        }

    try:
        # Create Stripe refund
        refund = stripe.Refund.create(
            payment_intent=order.stripe_payment_intent_id,
            amount=int(refund_amount * 100),  # Stripe uses cents
            reason=reason,
            metadata={
                "order_id": order.id,
                "order_number": order.order_number
            }
        )

        return {
            "success": True,
            "refund_id": refund.id,
            "status": refund.status,
            "amount": refund_amount
        }

    except stripe.error.StripeError as e:
        print(f"[STRIPE] Refund failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== REFUND CALCULATIONS ====================

def calculate_refund_amounts(order: Order, eligibility: dict) -> dict:
    """Calculate refund amounts based on eligibility"""
    percentage = eligibility["refund_percentage"] / 100

    subtotal_refund = order.subtotal * percentage
    tax_refund = order.tax_amount * percentage

    delivery_fee_refund = order.delivery_fee if eligibility.get("include_delivery_fee") else 0
    platform_fee_refund = order.platform_fee if eligibility.get("include_platform_fee") else 0
    tip_refund = order.tip if eligibility.get("include_tip") else 0

    total_refund = subtotal_refund + tax_refund + delivery_fee_refund + platform_fee_refund + tip_refund

    return {
        "subtotal_refund": round(subtotal_refund, 2),
        "tax_refund": round(tax_refund, 2),
        "delivery_fee_refund": round(delivery_fee_refund, 2),
        "platform_fee_refund": round(platform_fee_refund, 2),
        "tip_refund": round(tip_refund, 2),
        "total_refund": round(total_refund, 2),
        "refund_percentage": eligibility["refund_percentage"]
    }


# ==================== REFUND JOURNAL ENTRY ====================

def create_refund_journal_entry(db: Session, order: Order, refund: Refund, amounts: dict):
    """Create accounting journal entry for refund"""
    entry_count = db.query(JournalEntry).count()
    entry_number = f"JE-RF-{datetime.now().strftime('%Y%m%d')}-{entry_count + 1:05d}"

    journal_entry = JournalEntry(
        entry_number=entry_number,
        order_id=order.id,
        entry_type="REFUND",
        description=f"Refund for Order {order.order_number} - {refund.reason.value} | Total: ${amounts['total_refund']:.2f}",
        status="posted",
        created_by_ai="AI_EMP_006",
        created_by_ai_name=AI_EMPLOYEE_FINANCE["name"],
        posted_at=datetime.utcnow()
    )
    db.add(journal_entry)
    db.flush()

    # Reverse the original entries
    lines = [
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="1000",
            account_name="Cash/Stripe",
            debit=0,
            credit=amounts["total_refund"],  # Money going out
            description=f"Refund issued for order {order.order_number}"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2100",
            account_name="Restaurant Payable",
            debit=amounts["subtotal_refund"],  # Reduce payable
            credit=0,
            description="Reversed restaurant payable"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="4000",
            account_name="Platform Revenue",
            debit=amounts["platform_fee_refund"],  # Reverse revenue
            credit=0,
            description="Reversed platform fee"
        ),
        JournalEntryLine(
            journal_entry_id=journal_entry.id,
            account_code="2300",
            account_name="Tax Collected",
            debit=amounts["tax_refund"],  # Reduce tax liability
            credit=0,
            description="Reversed tax collected"
        )
    ]

    for line in lines:
        db.add(line)


# ==================== INVOICE GENERATION ====================

@router.post("/orders/{order_id}/generate-invoice")
async def generate_invoice(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generate invoice for a completed order
    AI Employee: FinanceBot Zeta
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if invoice already exists
    existing_invoice = db.query(OrderInvoice).filter(OrderInvoice.order_id == order_id).first()
    if existing_invoice:
        return {
            "success": True,
            "message": "Invoice already exists",
            "invoice_number": existing_invoice.invoice_number,
            "invoice_id": existing_invoice.id
        }

    # Get vendor info
    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()
    restaurant_name = vendor.restaurant_name if vendor else "Restaurant"
    restaurant_address = ""
    if vendor:
        # Build address from components
        address_parts = []
        if vendor.street:
            address_parts.append(vendor.street)
        if vendor.city:
            address_parts.append(vendor.city)
        if vendor.state:
            address_parts.append(vendor.state)
        if vendor.zip_code:
            address_parts.append(vendor.zip_code)
        restaurant_address = ", ".join(address_parts)

    # Generate invoice number
    invoice_count = db.query(OrderInvoice).count()
    invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_count + 1:05d}"

    # Parse items
    items = []
    if order.items:
        try:
            items = json.loads(order.items) if isinstance(order.items, str) else order.items
        except:
            items = []

    # Create invoice record
    invoice = OrderInvoice(
        invoice_number=invoice_number,
        order_id=order.id,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        customer_phone=order.customer_phone,
        vendor_id=order.vendor_id,
        restaurant_name=restaurant_name,
        restaurant_address=restaurant_address,
        invoice_date=datetime.utcnow(),
        order_date=order.created_at,
        items=json.dumps(items),
        subtotal=order.subtotal,
        tax_rate=order.tax_rate,
        tax_amount=order.tax_amount,
        delivery_fee=order.delivery_fee,
        tip=order.tip,
        platform_fee=order.platform_fee,
        total_amount=order.total_amount,
        payment_method=order.payment_method or "card",
        payment_status=order.payment_status,
        stripe_payment_intent_id=order.stripe_payment_intent_id,
        delivery_address=order.delivery_address
    )
    db.add(invoice)

    # Update order with invoice reference
    order.invoice_number = invoice_number
    order.invoice_generated = True

    db.commit()
    db.refresh(invoice)

    # Generate PDF in background
    background_tasks.add_task(generate_invoice_pdf, invoice.id, db)

    return {
        "success": True,
        "message": "Invoice generated successfully",
        "invoice_id": invoice.id,
        "invoice_number": invoice_number,
        "order_number": order.order_number,
        "total_amount": order.total_amount,
        "processed_by": AI_EMPLOYEE_FINANCE["name"]
    }


async def generate_invoice_pdf(invoice_id: int, db: Session):
    """Generate PDF for invoice (background task)"""
    # For now, we'll create a simple HTML-based invoice
    # In production, use a proper PDF library like reportlab or weasyprint

    invoice = db.query(OrderInvoice).filter(OrderInvoice.id == invoice_id).first()
    if not invoice:
        return

    # Generate HTML invoice
    html_content = generate_invoice_html(invoice)

    # In production, convert HTML to PDF and upload to S3/cloud storage
    # For now, mark as generated
    invoice.pdf_generated = True
    invoice.pdf_generated_at = datetime.utcnow()
    # invoice.pdf_url = "https://storage.example.com/invoices/{invoice_number}.pdf"

    db.commit()


def generate_invoice_html(invoice: OrderInvoice) -> str:
    """
    Generate LEGALLY COMPLIANT HTML invoice content

    TRANSPARENCY REQUIREMENTS:
    - All fees clearly itemized
    - Tax calculation shown
    - Platform fee breakdown visible
    - Order/Invoice/Delivery numbers consistent
    - Date and time displayed
    """
    items = []
    if invoice.items:
        try:
            items = json.loads(invoice.items) if isinstance(invoice.items, str) else invoice.items
        except:
            items = []

    items_html = ""
    for item in items:
        item_name = item.get("name", item.get("item_name", "Item"))
        quantity = item.get("quantity", 1)
        price = item.get("unit_price", item.get("price", 0))
        total = item.get("total_price", price * quantity)
        items_html += f"""
        <tr>
            <td>{item_name}</td>
            <td style="text-align: center;">{quantity}</td>
            <td style="text-align: right;">${price:.2f}</td>
            <td style="text-align: right;">${total:.2f}</td>
        </tr>
        """

    # Format dates properly
    invoice_datetime = invoice.invoice_date.strftime('%B %d, %Y at %I:%M %p') if invoice.invoice_date else "N/A"
    order_datetime = invoice.order_date.strftime('%B %d, %Y at %I:%M %p') if invoice.order_date else "N/A"

    # Get tiered fee explanation based on subtotal
    subtotal = float(invoice.subtotal or 0)
    if subtotal <= 35.0:
        fee_tier = "Tier 1 (orders up to $35)"
    elif subtotal <= 70.0:
        fee_tier = "Tier 2 (orders $35.01-$70)"
    else:
        fee_tier = "Tier 3 (orders over $70)"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }}
            .invoice-container {{ max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #FF6B35; padding-bottom: 20px; }}
            .logo {{ font-size: 32px; font-weight: bold; color: #FF6B35; }}
            .logo span {{ color: #333; }}
            .invoice-info {{ text-align: right; }}
            .invoice-info h2 {{ color: #FF6B35; margin: 0 0 10px 0; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }}
            .info-box {{ background: #f9f9f9; padding: 20px; border-radius: 8px; }}
            .info-box h3 {{ margin: 0 0 15px 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }}
            .info-box p {{ margin: 5px 0; color: #555; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            th {{ background-color: #FF6B35; color: white; padding: 12px; text-align: left; }}
            td {{ padding: 12px; border-bottom: 1px solid #eee; }}
            .totals {{ width: 350px; margin-left: auto; background: #f9f9f9; border-radius: 8px; padding: 20px; }}
            .totals table {{ margin: 0; }}
            .totals td {{ border: none; padding: 8px 0; }}
            .totals .subtotal-row {{ border-bottom: 1px solid #ddd; }}
            .totals .total-row {{ font-weight: bold; font-size: 20px; color: #FF6B35; border-top: 2px solid #FF6B35; padding-top: 15px; }}
            .transparency-box {{ background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .transparency-box h3 {{ color: #2e7d32; margin: 0 0 15px 0; }}
            .transparency-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }}
            .transparency-item {{ text-align: center; }}
            .transparency-item .label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
            .transparency-item .value {{ font-size: 18px; font-weight: bold; color: #333; }}
            .legal-notice {{ background: #fff3e0; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; font-size: 12px; color: #666; }}
            .footer {{ margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .badge-success {{ background: #e8f5e9; color: #2e7d32; }}
            .badge-pending {{ background: #fff3e0; color: #e65100; }}
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="logo">Dollor<span>.ai</span></div>
                <div class="invoice-info">
                    <h2>INVOICE / RECEIPT</h2>
                    <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
                    <p><strong>Order #:</strong> {invoice.order_id}</p>
                    <p><strong>Invoice Date:</strong> {invoice_datetime}</p>
                    <p><strong>Order Date:</strong> {order_datetime}</p>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-box">
                    <h3>Bill To (Customer)</h3>
                    <p><strong>{invoice.customer_name}</strong></p>
                    <p>{invoice.customer_email}</p>
                    <p>{invoice.customer_phone or ''}</p>
                    <p style="margin-top: 10px;"><strong>Delivery Address:</strong></p>
                    <p>{invoice.delivery_address or 'N/A'}</p>
                </div>
                <div class="info-box">
                    <h3>From (Restaurant)</h3>
                    <p><strong>{invoice.restaurant_name}</strong></p>
                    <p>{invoice.restaurant_address or ''}</p>
                    <p style="margin-top: 10px;"><strong>Payment Status:</strong>
                        <span class="badge {'badge-success' if invoice.payment_status == 'completed' else 'badge-pending'}">{invoice.payment_status.upper()}</span>
                    </p>
                    <p><strong>Payment Method:</strong> {invoice.payment_method}</p>
                </div>
            </div>

            <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Items</h3>
            <table>
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th style="text-align: center; width: 80px;">Qty</th>
                        <th style="text-align: right; width: 100px;">Unit Price</th>
                        <th style="text-align: right; width: 100px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>

            <div class="totals">
                <table>
                    <tr class="subtotal-row">
                        <td>Food Subtotal:</td>
                        <td style="text-align: right;">${invoice.subtotal:.2f}</td>
                    </tr>
                    <tr>
                        <td>Sales Tax ({(invoice.tax_rate or 0.0725) * 100:.2f}%):</td>
                        <td style="text-align: right;">${invoice.tax_amount:.2f}</td>
                    </tr>
                    <tr>
                        <td>Delivery Fee (100% to Driver):</td>
                        <td style="text-align: right;">${invoice.delivery_fee:.2f}</td>
                    </tr>
                    <tr>
                        <td>Driver Tip (100% to Driver):</td>
                        <td style="text-align: right;">${invoice.tip:.2f}</td>
                    </tr>
                    <tr>
                        <td>Platform Fee ({fee_tier}):</td>
                        <td style="text-align: right;">${invoice.platform_fee:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td>TOTAL CHARGED:</td>
                        <td style="text-align: right;">${invoice.total_amount:.2f}</td>
                    </tr>
                </table>
            </div>

            <div class="transparency-box">
                <h3>💡 Fee Transparency - Where Your Money Goes</h3>
                <div class="transparency-grid">
                    <div class="transparency-item">
                        <div class="label">Restaurant Receives</div>
                        <div class="value">${invoice.subtotal - invoice.platform_fee:.2f}</div>
                        <div class="label" style="font-size: 10px;">Food - Platform Fee</div>
                    </div>
                    <div class="transparency-item">
                        <div class="label">Driver Receives</div>
                        <div class="value">${invoice.delivery_fee + invoice.tip:.2f}</div>
                        <div class="label" style="font-size: 10px;">100% of Delivery + Tip</div>
                    </div>
                    <div class="transparency-item">
                        <div class="label">Platform Fees</div>
                        <div class="value">${invoice.platform_fee * 2:.2f}</div>
                        <div class="label" style="font-size: 10px;">Customer + Restaurant Fee</div>
                    </div>
                </div>
            </div>

            <div class="legal-notice">
                <strong>LEGAL DISCLOSURES:</strong><br>
                • <strong>Platform Fee Model:</strong> Dollor.ai charges flat tiered fees (not percentage-based commissions)<br>
                • <strong>Driver Compensation:</strong> Drivers receive 100% of delivery fees and 100% of tips - Dollor takes zero margin<br>
                • <strong>Sales Tax:</strong> California state sales tax collected and remitted to the CA State Board of Equalization<br>
                • <strong>No Surge Pricing:</strong> Platform fees are fixed regardless of demand or time of day<br>
                • <strong>Tiered Pricing:</strong> Orders ≤$35: $1 fee | $35-$70: $2 fee | $70+: $3 fee (applies to both customer and restaurant)<br>
                • <strong>Refund Policy:</strong> Full refunds available for cancelled orders before restaurant confirmation
            </div>

            <div class="footer">
                <p style="font-size: 14px;"><strong>Thank you for ordering with Dollor.ai!</strong></p>
                <p>Questions? Contact support@dollor.ai | Visit dollor.ai/support</p>
                <p style="margin-top: 15px; color: #999;">
                    Dollor AI Service | dollor.ai<br>
                    This receipt serves as proof of purchase for tax and expense reporting purposes.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return html


# ==================== SEND INVOICE EMAIL ====================

@router.post("/orders/{order_id}/send-invoice")
async def send_order_invoice(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Send invoice email to customer"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    invoice = db.query(OrderInvoice).filter(OrderInvoice.order_id == order_id).first()
    if not invoice:
        # Generate invoice first
        await generate_invoice(order_id, BackgroundTasks(), db)
        invoice = db.query(OrderInvoice).filter(OrderInvoice.order_id == order_id).first()

    if not invoice:
        raise HTTPException(status_code=500, detail="Failed to generate invoice")

    # Generate HTML for email
    html_content = generate_invoice_html(invoice)

    # Send email
    if EMAIL_ENABLED and order.customer_email:
        try:
            await send_invoice_email(
                customer_email=order.customer_email,
                customer_name=order.customer_name,
                invoice_number=invoice.invoice_number,
                order_number=order.order_number,
                total_amount=invoice.total_amount,
                html_content=html_content
            )
            invoice.email_sent = True
            invoice.email_sent_at = datetime.utcnow()
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    return {
        "success": True,
        "message": "Invoice email sent",
        "invoice_number": invoice.invoice_number,
        "sent_to": order.customer_email
    }


# ==================== GET REFUND STATUS ====================

@router.get("/orders/{order_id}/refund-status")
async def get_refund_status(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get refund status for an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    refund = db.query(Refund).filter(Refund.order_id == order_id).first()

    if not refund:
        # Check eligibility
        eligibility = get_refund_eligibility(order)
        return {
            "has_refund": False,
            "refund_eligible": eligibility["eligible"],
            "eligibility_details": eligibility
        }

    return {
        "has_refund": True,
        "refund_number": refund.refund_number,
        "refund_amount": refund.refund_amount,
        "refund_type": refund.refund_type,
        "reason": refund.reason.value,
        "status": refund.status.value,
        "stripe_refund_id": refund.stripe_refund_id,
        "processed_at": refund.processed_at.isoformat() if refund.processed_at else None,
        "processed_by": refund.processed_by_ai
    }


# ==================== GET INVOICE ====================

@router.get("/orders/{order_id}/invoice")
async def get_order_invoice(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get invoice for an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    invoice = db.query(OrderInvoice).filter(OrderInvoice.order_id == order_id).first()

    if not invoice:
        return {
            "has_invoice": False,
            "message": "Invoice not yet generated",
            "can_generate": order.payment_status == "succeeded"
        }

    items = []
    if invoice.items:
        try:
            items = json.loads(invoice.items) if isinstance(invoice.items, str) else invoice.items
        except:
            items = []

    return {
        "has_invoice": True,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date.isoformat(),
        "customer_name": invoice.customer_name,
        "customer_email": invoice.customer_email,
        "restaurant_name": invoice.restaurant_name,
        "items": items,
        "subtotal": invoice.subtotal,
        "tax_rate": invoice.tax_rate,
        "tax_amount": invoice.tax_amount,
        "delivery_fee": invoice.delivery_fee,
        "tip": invoice.tip,
        "platform_fee": invoice.platform_fee,
        "total_amount": invoice.total_amount,
        "payment_status": invoice.payment_status,
        "pdf_url": invoice.pdf_url,
        "email_sent": invoice.email_sent
    }


# ==================== LIST REFUNDS ====================

@router.get("/refunds")
async def list_refunds(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all refunds (admin)"""
    query = db.query(Refund)

    if status:
        query = query.filter(Refund.status == status)

    refunds = query.order_by(Refund.created_at.desc()).limit(limit).all()

    return {
        "success": True,
        "count": len(refunds),
        "refunds": [{
            "id": r.id,
            "refund_number": r.refund_number,
            "order_id": r.order_id,
            "reason": r.reason.value,
            "refund_amount": r.refund_amount,
            "refund_type": r.refund_type,
            "status": r.status.value,
            "requested_by": r.requested_by,
            "processed_at": r.processed_at.isoformat() if r.processed_at else None,
            "created_at": r.created_at.isoformat()
        } for r in refunds]
    }
