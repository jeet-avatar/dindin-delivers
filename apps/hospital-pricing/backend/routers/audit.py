# apps/hospital-pricing/backend/routers/audit.py
import uuid
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from pydantic import BaseModel, ConfigDict

from database import get_db
from auth.deps import require_procurement_officer
from models.audit import AuditLogEntry

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogEntryResponse(BaseModel):
    log_id: uuid.UUID
    entity_id: uuid.UUID
    actor_user_id: uuid.UUID
    event_type: str
    resource_type: str
    resource_id: uuid.UUID
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogPage(BaseModel):
    items: list[AuditLogEntryResponse]
    total: int
    page: int


@router.get("/", response_model=AuditLogPage)
async def list_audit_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    action_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_procurement_officer),
) -> AuditLogPage:
    """Paginated audit log for the current entity."""
    entity_id = uuid.UUID(payload["entity_id"])

    filters = [AuditLogEntry.entity_id == entity_id]

    if date_from:
        filters.append(
            AuditLogEntry.created_at >= datetime.combine(date_from, datetime.min.time())
        )
    if date_to:
        filters.append(
            AuditLogEntry.created_at <= datetime.combine(date_to, datetime.max.time())
        )
    if action_type:
        filters.append(AuditLogEntry.event_type == action_type)
    if search:
        filters.append(
            or_(
                AuditLogEntry.event_type.ilike(f"%{search}%"),
                AuditLogEntry.resource_type.ilike(f"%{search}%"),
            )
        )

    count_result = await db.execute(
        select(func.count()).select_from(AuditLogEntry).where(and_(*filters))
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(AuditLogEntry)
        .where(and_(*filters))
        .order_by(AuditLogEntry.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = result.scalars().all()

    return AuditLogPage(items=list(items), total=total, page=page)
