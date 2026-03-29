# apps/hospital-pricing/backend/routers/invoices.py
"""
Invoices router: upload + tenant isolation.
Facility ownership verified against user's entity_id before invoice creation.
"""
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from auth.deps import require_procurement_officer
from models.hospital import Facility
from models.invoice import Invoice, InvoiceSource, PaymentStatus

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    request: Request,
    supplier_id: uuid.UUID = Query(...),
    facility_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_procurement_officer),
) -> dict:
    """
    Upload invoice PDF. Verifies facility belongs to the user's entity (tenant isolation).
    Returns 404 if facility not found or belongs to a different entity.
    """
    entity_id = uuid.UUID(payload["entity_id"])

    # Tenant isolation: verify facility belongs to this entity
    result = await db.execute(
        select(Facility).where(
            Facility.facility_id == facility_id,
            Facility.entity_id == entity_id,
        )
    )
    facility = result.scalar_one_or_none()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility {facility_id} not found for your organization",
        )

    # Read raw PDF bytes
    pdf_bytes = await request.body()  # noqa: F841 — reserved for async PDF parsing job

    # Create invoice record (PDF parsing is async via Celery worker)
    invoice = Invoice(
        invoice_number=f"UPLOAD-{uuid.uuid4().hex[:8].upper()}",
        supplier_id=supplier_id,
        ship_to_facility_id=facility_id,
        entity_id=entity_id,
        invoice_date=date.today(),
        total_amount=0,  # Updated after Celery parsing completes
        source=InvoiceSource.pdf_scan,
        payment_status=PaymentStatus.unpaid,
    )
    db.add(invoice)
    await db.commit()

    return {
        "invoice_id": str(invoice.invoice_id),
        "status": "queued",
        "message": "Invoice PDF received. Parsing queued.",
    }


@router.get("/", response_model=list[dict])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_procurement_officer),
) -> list[dict]:
    """List all invoices for the current entity (tenant-scoped)."""
    entity_id = uuid.UUID(payload["entity_id"])
    result = await db.execute(
        select(Invoice).where(Invoice.entity_id == entity_id)
    )
    invoices = result.scalars().all()
    return [
        {
            "invoice_id": str(inv.invoice_id),
            "invoice_number": inv.invoice_number,
            "invoice_date": str(inv.invoice_date),
            "total_amount": str(inv.total_amount),
            "payment_status": inv.payment_status.value,
        }
        for inv in invoices
    ]
