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
        return {
            "success": False,
            "error": "No payment intent found for this order"
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
        entry_date=datetime.utcnow(),
        description=f"Refund for Order {order.order_number} - {refund.reason.value}",
        reference_type="refund",
        reference_id=refund.id,
        total_debit=amounts["total_refund"],
        total_credit=amounts["total_refund"],
        status="posted",
        created_by_ai_id=6,  # FinanceBot
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
    """Generate HTML invoice content"""
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

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #e74c3c; }}
            .invoice-info {{ text-align: right; }}
            .customer-info {{ margin-bottom: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background-color: #f8f9fa; }}
            .totals {{ width: 300px; margin-left: auto; }}
            .totals td {{ border: none; }}
            .total-row {{ font-weight: bold; font-size: 18px; }}
            .footer {{ margin-top: 40px; text-align: center; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">EatFair</div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
                <p><strong>Date:</strong> {invoice.invoice_date.strftime('%B %d, %Y')}</p>
                <p><strong>Order #:</strong> {invoice.order_id}</p>
            </div>
        </div>

        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>{invoice.customer_name}</strong></p>
            <p>{invoice.customer_email}</p>
            <p>{invoice.customer_phone or ''}</p>
        </div>

        <div class="restaurant-info">
            <h3>From:</h3>
            <p><strong>{invoice.restaurant_name}</strong></p>
            <p>{invoice.restaurant_address or ''}</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <table class="totals">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">${invoice.subtotal:.2f}</td>
            </tr>
            <tr>
                <td>Tax ({invoice.tax_rate * 100:.1f}%):</td>
                <td style="text-align: right;">${invoice.tax_amount:.2f}</td>
            </tr>
            <tr>
                <td>Delivery Fee:</td>
                <td style="text-align: right;">${invoice.delivery_fee:.2f}</td>
            </tr>
            <tr>
                <td>Tip:</td>
                <td style="text-align: right;">${invoice.tip:.2f}</td>
            </tr>
            <tr>
                <td>Platform Fee:</td>
                <td style="text-align: right;">${invoice.platform_fee:.2f}</td>
            </tr>
            <tr class="total-row">
                <td>TOTAL:</td>
                <td style="text-align: right;">${invoice.total_amount:.2f}</td>
            </tr>
        </table>

        <div>
            <p><strong>Payment Status:</strong> {invoice.payment_status.upper()}</p>
            <p><strong>Payment Method:</strong> {invoice.payment_method}</p>
        </div>

        <div>
            <h3>Delivery Address:</h3>
            <p>{invoice.delivery_address or 'N/A'}</p>
        </div>

        <div class="footer">
            <p>Thank you for ordering with EatFair!</p>
            <p>Questions? Contact support@eatfair.com</p>
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
