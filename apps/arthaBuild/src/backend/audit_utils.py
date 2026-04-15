"""
audit_utils.py — Shared audit event writer for SOC2 CC7.2 compliance.

Imported by routers/auth.py, routers/admin.py, routers/user.py, routers/compliance.py.
Import chain: models.py → database.py (no circular risk).
DO NOT import from routers here.

Phase 14: hash chaining added — each AuditLog row records prev_hash (previous row's
row_hash) and computes its own row_hash = sha256(prev_hash|action|actor_email|created_at).
This creates a tamper-evident chain verifiable offline.
"""
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models import AuditLog


async def write_audit_event(
    db: AsyncSession,
    actor_email: str,
    actor_role: str,
    action: str,
    result: str,                    # "success" | "failure"
    ip_address: str | None = None,
    target: str | None = None,      # user_id, email, or config key as string
) -> None:
    """
    Append-only audit log write. Caller MUST commit the session.

    DO NOT call db.commit() here — audit writes must be atomic with the
    parent operation. If the parent rolls back, the audit entry also rolls back.

    Phase 14: fetches the prev row_hash to build the immutable chain before insert.
    """
    # Fetch the latest row_hash to use as prev_hash for this new row
    prev_result = await db.execute(
        select(AuditLog.row_hash)
        .order_by(desc(AuditLog.id))
        .limit(1)
    )
    prev_hash_row = prev_result.scalar_one_or_none()
    prev_hash: str | None = prev_hash_row  # None for the very first row

    # Compute row_hash = sha256(prev_hash|action|actor_email|created_at_iso)
    created_at = datetime.now(timezone.utc)
    raw = f"{prev_hash or ''}|{action}|{actor_email or ''}|{created_at.isoformat()}"
    row_hash = hashlib.sha256(raw.encode()).hexdigest()

    log = AuditLog(
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        result=result,
        ip_address=ip_address,
        target=target,
        created_at=created_at,
        prev_hash=prev_hash,
        row_hash=row_hash,
    )
    db.add(log)
