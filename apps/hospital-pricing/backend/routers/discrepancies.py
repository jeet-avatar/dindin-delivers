# apps/hospital-pricing/backend/routers/discrepancies.py
"""
Discrepancies router: list + resolve with immutable audit log.
Resolve creates an AuditLogEntry — this is the compliance evidence trail (DISC-03).
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from database import get_db
from auth.deps import require_procurement_officer, require_approver
from models.invoice import InvoiceLineItem, DiscrepancyStatus, Invoice
from models.audit import AuditLogEntry

router = APIRouter(prefix="/discrepancies", tags=["discrepancies"])

_VALID_RESOLUTIONS = {"approve", "request_credit", "dispute"}

_RESOLUTION_STATUS_MAP = {
    "approve": DiscrepancyStatus.resolved_approved,
    "request_credit": DiscrepancyStatus.resolved_credit,
    "dispute": DiscrepancyStatus.investigating,
}


class ResolveRequest(BaseModel):
    resolution: str  # "approve" | "request_credit" | "dispute"
    notes: Optional[str] = None


@router.get("/", response_model=list[dict])
async def list_discrepancies(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_procurement_officer),
) -> list[dict]:
    """List all flagged discrepancies for the current entity (tenant-scoped via invoice.entity_id)."""
    entity_id = uuid.UUID(payload["entity_id"])

    result = await db.execute(
        select(InvoiceLineItem)
        .options(joinedload(InvoiceLineItem.invoice))
        .join(Invoice, InvoiceLineItem.invoice_id == Invoice.invoice_id)
        .where(
            Invoice.entity_id == entity_id,
            InvoiceLineItem.discrepancy_type.isnot(None),
        )
    )
    items = result.scalars().all()
    return [
        {
            "line_id": str(item.line_id),
            "invoice_id": str(item.invoice_id),
            "item_name": item.supplier_item_number,
            "supplier_name": None,
            "contract_unit_price": float(item.expected_unit_price) if item.expected_unit_price is not None else None,
            "invoiced_unit_price": float(item.invoiced_unit_price),
            "delta": float(item.discrepancy_amount) if item.discrepancy_amount is not None else 0.0,
            "discrepancy_type": item.discrepancy_type.value if item.discrepancy_type else None,
            "status": item.discrepancy_status.value,
            "ai_reasoning": None,
            "created_at": item.invoice.created_at.isoformat() if item.invoice and item.invoice.created_at else None,
        }
        for item in items
    ]


@router.post("/{line_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_discrepancy(
    line_id: uuid.UUID = Path(...),
    body: ResolveRequest = ...,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_approver),
) -> dict:
    """
    Resolve a discrepancy. Creates an immutable AuditLogEntry.
    Requires procurement_approver role or higher (AUTH-05).
    """
    if body.resolution not in _VALID_RESOLUTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid resolution: {body.resolution}. Must be: approve | request_credit | dispute",
        )

    entity_id = uuid.UUID(payload["entity_id"])

    # Load line item with tenant isolation
    result = await db.execute(
        select(InvoiceLineItem)
        .join(Invoice, InvoiceLineItem.invoice_id == Invoice.invoice_id)
        .where(
            InvoiceLineItem.line_id == line_id,
            Invoice.entity_id == entity_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discrepancy not found",
        )

    before_status = item.discrepancy_status.value
    new_status = _RESOLUTION_STATUS_MAP[body.resolution]
    item.discrepancy_status = new_status

    # Write immutable audit log entry (DISC-03)
    audit_entry = AuditLogEntry(
        entity_id=entity_id,
        actor_user_id=uuid.UUID(payload["sub"]),
        event_type=f"discrepancy.{body.resolution}",
        resource_type="InvoiceLineItem",
        resource_id=line_id,
        payload={
            "line_id": str(line_id),
            "resolution": body.resolution,
            "notes": body.notes,
            "before_status": before_status,
            "after_status": new_status.value,
        },
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "line_id": str(line_id),
        "resolution": body.resolution,
        "new_status": new_status.value,
        "audit_log_id": str(audit_entry.log_id),
    }
