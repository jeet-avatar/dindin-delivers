"""
ArthaBuild Compliance Router — GDPR Data Rights
=================================================
Provides GDPR Article 15 (data export) and Article 17 (erasure) endpoints.

All endpoints require a valid user JWT (Depends(require_user)).
Only the authenticated user can request their own data or erasure.

Architecture layer: API (routers)
Phase: 14 — Compliance & Data Governance
"""
import json
import logging
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from models import User, ChatSession, ChatMessage, AuditLog
from auth_utils import require_user
from audit_utils import write_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["compliance"])


@router.post("/export-data")
async def gdpr_export_data(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    GDPR Article 15 — Right of access / data portability.
    Returns a downloadable JSON file containing all personal data for the
    authenticated user: profile, chat sessions, chat messages, and audit rows.
    """
    # Query user profile
    user_data = {
        "id": current_user.id,
        "name": current_user.name,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "organization": current_user.organization,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

    # Query all chat sessions owned by user
    sess_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at)
    )
    sessions = sess_result.scalars().all()
    session_ids = [s.id for s in sessions]

    # Query all chat messages for those sessions
    messages_by_session: dict[int, list] = {s.id: [] for s in sessions}
    if session_ids:
        msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id.in_(session_ids))
            .order_by(ChatMessage.created_at)
        )
        for msg in msg_result.scalars().all():
            messages_by_session[msg.session_id].append({
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "intent": msg.intent,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            })

    chats_data = [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "messages": messages_by_session[s.id],
        }
        for s in sessions
    ]

    # Query audit log rows where actor_email matches user's email
    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.actor_email == current_user.email)
        .order_by(AuditLog.created_at)
    )
    audit_data = [
        {
            "id": row.id,
            "action": row.action,
            "result": row.result,
            "ip_address": row.ip_address,
            "target": row.target,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "row_hash": row.row_hash,
        }
        for row in audit_result.scalars().all()
    ]

    export_payload = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": user_data,
        "chats": chats_data,
        "audit": audit_data,
    }

    json_bytes = json.dumps(export_payload, indent=2, ensure_ascii=False).encode("utf-8")
    filename = f"data-export-{current_user.id}.json"

    return StreamingResponse(
        iter([json_bytes]),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(json_bytes)),
        },
    )


@router.post("/erase")
async def gdpr_erase_data(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    GDPR Article 17 — Right to erasure (right to be forgotten).

    Anonymises the user record and hard-deletes all chat data.
    The user row is kept (soft-delete) to maintain referential integrity,
    but all personal identifiers are replaced with irreversible placeholders.
    """
    original_email = current_user.email  # capture before anonymisation for audit

    # Hard-delete chat sessions + messages (CASCADE handles messages via FK ondelete)
    sess_result = await db.execute(
        select(ChatSession.id).where(ChatSession.user_id == current_user.id)
    )
    session_ids = list(sess_result.scalars().all())
    if session_ids:
        await db.execute(
            delete(ChatMessage).where(ChatMessage.session_id.in_(session_ids))
        )
        await db.execute(
            delete(ChatSession).where(ChatSession.user_id == current_user.id)
        )

    # Anonymise user fields — irreversible
    erased_email = f"erased-{current_user.id}@deleted.local"
    # Use sha256 of a random+id string as unusable password hash
    unusable_hash = "!" + hashlib.sha256(
        f"erased-{current_user.id}-{datetime.now(timezone.utc).isoformat()}".encode()
    ).hexdigest()

    current_user.email = erased_email
    current_user.name = "Deleted User"
    current_user.first_name = "Deleted"
    current_user.last_name = "User"
    current_user.organization = None
    current_user.password_hash = unusable_hash
    current_user.is_active = False
    current_user.erased_at = datetime.now(timezone.utc)

    # Write immutable audit event BEFORE commit (atomic with erasure)
    await write_audit_event(
        db,
        actor_email=original_email,
        actor_role=current_user.role,
        action="user.data_erased",
        result="success",
        target=str(current_user.id),
    )

    await db.commit()
    logger.info(f"GDPR erasure complete for user_id={current_user.id} (was {original_email})")
    return {"message": "Your data has been erased"}
