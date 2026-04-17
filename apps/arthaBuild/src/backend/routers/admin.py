"""
ArthaBuild Admin Router
========================
Team management and admin-level chat visibility endpoints.

All endpoints require admin role (Depends(require_admin)).
Admins can only see/manage users on their own team.

Architecture layer: API (routers)
Phase: 9 — RBAC + Team Management + Chat Persistence
Phase: 10 — Admin Panel Enterprise Team Management UI (8 new endpoints)
"""
import csv
import io
import os
import secrets
import hashlib
import logging
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from database import get_db
from models import User, ChatSession, TeamInvite, Team, ScriptDeployment, AuditLog, SystemConfig, PasswordResetToken, WebhookEndpoint
from auth_utils import require_admin
from audit_utils import write_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/chats")
async def admin_list_team_chats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return all chat sessions for every user on the admin's team."""
    if admin.team_id is None:
        return []

    # Get all users on the same team
    user_result = await db.execute(
        select(User).where(User.team_id == admin.team_id)
    )
    team_users = user_result.scalars().all()
    team_user_ids = [u.id for u in team_users]
    team_user_map = {u.id: u for u in team_users}

    if not team_user_ids:
        return []

    # Get all chat sessions for team users
    sess_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id.in_(team_user_ids))
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = sess_result.scalars().all()

    return [
        {
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "user_email": team_user_map[s.user_id].email,
            "user_name": team_user_map[s.user_id].name,
        }
        for s in sessions
    ]


@router.get("/team")
async def admin_list_team_members(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return all users on the admin's team."""
    if admin.team_id is None:
        # Admin with no team — return just themselves
        return [
            {
                "id": admin.id,
                "name": admin.name,
                "email": admin.email,
                "role": admin.role,
                "created_at": admin.created_at.isoformat() if admin.created_at else None,
            }
        ]

    result = await db.execute(
        select(User).where(User.team_id == admin.team_id)
    )
    members = result.scalars().all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in members
    ]


@router.post("/team/invite")
async def admin_invite_team_member(
    body: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a team invite email to the specified email address."""
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    if admin.team_id is None:
        raise HTTPException(status_code=400, detail="Admin has no team assigned")

    # Generate invite token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invite = TeamInvite(
        team_id=admin.team_id,
        email=email,
        invited_by=admin.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(invite)

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.invite_sent", result="success", ip_address=ip,
                            target=email)
    await db.commit()

    # Send invite email via existing email_utils (SUPPRESS_SEND pattern — non-fatal if no SMTP)
    from email_utils import send_invite_email
    background_tasks.add_task(send_invite_email, email, raw_token)

    logger.info(f"Team invite created for {email} by admin {admin.email}")
    return {"message": "Invite sent", "email": email}


@router.delete("/team/{user_id}")
async def admin_remove_team_member(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a user from the team and deactivate their account."""
    if admin.team_id is None:
        raise HTTPException(status_code=400, detail="Admin has no team assigned")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.team_id != admin.team_id:
        raise HTTPException(status_code=403, detail="User is not on your team")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    user.team_id = None
    user.is_active = False
    await db.commit()
    return {"message": "removed"}


# ---------------------------------------------------------------------------
# Phase 10 — 8 new admin endpoints
# ---------------------------------------------------------------------------

async def _write_audit(
    db: AsyncSession,
    admin_id: int,
    action: str,
    target_user_id: int | None = None,
    detail: str | None = None,
) -> None:
    """Write an audit log entry. Caller must commit after this returns."""
    log = AuditLog(
        admin_id=admin_id,
        action=action,
        target_user_id=target_user_id,
        detail=detail,
    )
    db.add(log)


@router.get("/stats")
async def admin_get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Usage stats scoped to admin's team. (CASE-173)"""
    if admin.team_id is None:
        return {"total_users": 1, "total_chats": 0, "active_sessions": 0, "scripts_deployed": 0}

    users_result = await db.execute(select(User.id).where(User.team_id == admin.team_id))
    user_ids = list(users_result.scalars().all())
    total_users = len(user_ids)

    total_chats_result = await db.execute(
        select(func.count()).select_from(ChatSession).where(ChatSession.user_id.in_(user_ids))
    )
    total_chats = total_chats_result.scalar() or 0

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    active_result = await db.execute(
        select(func.count()).select_from(ChatSession)
        .where(ChatSession.user_id.in_(user_ids))
        .where(ChatSession.updated_at > cutoff)
    )
    active_sessions = active_result.scalar() or 0

    scripts_result = await db.execute(
        select(func.count()).select_from(ScriptDeployment)
        .where(ScriptDeployment.user_id.in_(user_ids))
    )
    scripts_deployed = scripts_result.scalar() or 0

    return {
        "total_users": total_users,
        "total_chats": total_chats,
        "active_sessions": active_sessions,
        "scripts_deployed": scripts_deployed,
    }


@router.get("/users")
async def admin_list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return all users on the admin's team. Alias for /api/admin/team. (CASE-174)"""
    return await admin_list_team_members(admin=admin, db=db)


@router.patch("/users/{user_id}/role")
async def admin_change_user_role(
    user_id: int,
    body: dict,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change a team member's role and write an audit log entry. (CASE-175)"""
    new_role = body.get("role")
    if new_role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'user'")
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.team_id != admin.team_id:
        raise HTTPException(status_code=403, detail="User is not on your team")

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    old_role = user.role
    user.role = new_role
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.role_changed", result="success", ip_address=ip,
                            target=str(user_id))
    await db.commit()
    return {"id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a user from the team and write an audit log entry. (CASE-176)"""
    if admin.team_id is None:
        raise HTTPException(status_code=400, detail="Admin has no team assigned")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.team_id != admin.team_id:
        raise HTTPException(status_code=403, detail="User is not on your team")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    user.team_id = None
    user.is_active = False
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.user_removed", result="success", ip_address=ip,
                            target=str(user_id))
    await db.commit()
    return {"message": "removed"}


@router.get("/audit")
async def admin_get_audit(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Return paginated audit log entries, newest first. Supports offset/limit. (CASE-177, Phase 12)"""
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "action": row.action,
            "actor_email": row.actor_email,
            "actor_role": row.actor_role,
            "result": row.result,
            "ip_address": row.ip_address,
            "target": row.target,
            "target_user_id": row.target_user_id,
            "detail": row.detail,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.put("/config")
async def admin_put_config(
    body: dict,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upsert a system config key-value pair. (CASE-178)"""
    key = body.get("key", "").strip()
    value = body.get("value")
    if not key:
        raise HTTPException(status_code=400, detail="key is required")
    if value is None:
        raise HTTPException(status_code=400, detail="value is required")

    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if config:
        config.value = str(value)
        config.updated_by = admin.id
    else:
        config = SystemConfig(key=key, value=str(value), updated_by=admin.id)
        db.add(config)

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.config_updated", result="success", ip_address=ip,
                            target=key)
    await db.commit()
    await db.refresh(config)
    return {
        "key": config.key,
        "value": config.value,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


@router.get("/license")
async def admin_get_license(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return current license status by delegating to validate_license(). (CASE-179)"""
    from routers.license import validate_license
    try:
        result = await validate_license(db=db)
        return result
    except Exception as exc:
        logger.warning(f"License check failed: {exc}")
        return {"valid": False, "error": str(exc)}


@router.post("/teams")
async def admin_create_team(
    body: dict,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new team and assign admin to it if they have no team. (CASE-180)"""
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    team = Team(name=name)
    db.add(team)
    await db.flush()  # get team.id

    # If admin has no team, assign them as this team's admin
    if admin.team_id is None:
        admin.team_id = team.id

    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.team_created", result="success", ip_address=ip,
                            target=name)
    await db.commit()
    return {"id": team.id, "name": team.name}


@router.get("/audit/export")
async def admin_export_audit_csv(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start: str | None = Query(None, description="ISO8601 start datetime for filtering"),
    end: str | None = Query(None, description="ISO8601 end datetime for filtering"),
):
    """
    Export audit log as downloadable CSV with optional date-range filter.
    Query params: ?start=ISO8601&end=ISO8601
    Columns: id, created_at, actor_email, actor_role, action, result, ip_address, prev_hash, row_hash
    """
    query = select(AuditLog).order_by(AuditLog.id)

    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            query = query.where(AuditLog.created_at >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'start' datetime — use ISO8601 format")

    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            query = query.where(AuditLog.created_at <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'end' datetime — use ISO8601 format")

    result = await db.execute(query)
    rows = result.scalars().all()

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "created_at", "actor_email", "actor_role",
        "action", "result", "ip_address", "prev_hash", "row_hash",
    ])
    for row in rows:
        writer.writerow([
            row.id,
            row.created_at.isoformat() if row.created_at else "",
            row.actor_email or "",
            row.actor_role or "",
            row.action or "",
            row.result or "",
            row.ip_address or "",
            row.prev_hash or "",
            row.row_hash or "",
        ])

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    csv_bytes = output.getvalue().encode("utf-8")

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="audit-export-{date_str}.csv"',
            "Content-Length": str(len(csv_bytes)),
        },
    )


@router.post("/users/{user_id}/send-reset")
async def admin_send_password_reset(
    user_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin triggers a password reset for a team member. Writes audit log. (Phase 11)"""
    # Verify target is on admin's team (prevent cross-tenant data exposure)
    result = await db.execute(select(User).where(User.id == user_id, User.team_id == admin.team_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Invalidate all existing reset tokens for target
    old_result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == target.id,
            PasswordResetToken.used == False
        )
    )
    for old in old_result.scalars().all():
        old.used = True

    # Create new reset token
    from email_utils import generate_reset_token, token_expiry, send_admin_reset_email
    raw_token, token_hash = generate_reset_token()
    db.add(PasswordResetToken(user_id=target.id, token_hash=token_hash, expires_at=token_expiry()))

    # Write audit log
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=admin.email, actor_role=admin.role,
                            action="admin.password_reset_sent", result="success", ip_address=ip,
                            target=target.email)
    await db.commit()

    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    reset_link = f"{frontend_base}/reset-password/{raw_token}"
    admin_name = f"{admin.first_name or ''} {admin.last_name or ''}".strip() or admin.email
    background_tasks.add_task(send_admin_reset_email, target.email, reset_link, admin_name)
    return {"message": f"Password reset email sent to {target.email}"}


# ---------------------------------------------------------------------------
# Phase 16: Webhook endpoint registration
# ---------------------------------------------------------------------------

_VALID_WEBHOOK_EVENTS = {"chat.completed", "script.deployed", "user.registered"}


class RegisterWebhookRequest(__import__("pydantic", fromlist=["BaseModel"]).BaseModel):
    event: str
    url: str
    secret: str


@router.post("/webhooks", status_code=201)
async def register_webhook_endpoint(
    body: RegisterWebhookRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a webhook URL for a named event.
    Only admins can register webhooks on behalf of their team.

    Valid events: chat.completed, script.deployed, user.registered
    The secret is used to sign payloads with HMAC-SHA256.
    """
    if body.event not in _VALID_WEBHOOK_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event {body.event!r}. Must be one of: {sorted(_VALID_WEBHOOK_EVENTS)}",
        )

    from webhook_worker import register_webhook
    endpoint = await register_webhook(
        db=db,
        user_id=admin.id,
        event=body.event,
        url=body.url,
        secret=body.secret,
    )
    logger.info(f"Admin {admin.email!r} registered webhook id={endpoint.id} event={body.event!r} url={body.url!r}")
    return {
        "id": endpoint.id,
        "event": endpoint.event,
        "url": endpoint.url,
        "is_active": endpoint.is_active,
        "created_at": endpoint.created_at.isoformat() if endpoint.created_at else None,
    }


# ---------------------------------------------------------------------------
# Phase 17: Onboarding + License key validation
# ---------------------------------------------------------------------------

@router.get("/user/me/onboarding")
async def get_onboarding_status(
    current_user: User = Depends(require_admin),
):
    """Return whether the current admin has completed the onboarding wizard."""
    return {"onboarding_completed": bool(current_user.onboarding_completed)}


@router.post("/onboarding/complete")
async def complete_onboarding(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark the current admin's onboarding as completed."""
    current_user.onboarding_completed = True
    await db.commit()
    return {"done": True}


class LicenseKeyRequest(__import__("pydantic", fromlist=["BaseModel"]).BaseModel):
    license_key: str


@router.post("/license/validate-key")
async def admin_validate_license_key(
    body: LicenseKeyRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a license key entered via the AdminPanel License tab.
    Calls the license server directly with the provided key (not the env-var key).
    Returns {valid, plan, expiry} so the UI can display the result immediately.
    """
    from routers.license import get_or_create_instance_id, _call_license_server, LICENSE_SERVER_URL
    import httpx

    if not body.license_key.strip():
        raise HTTPException(status_code=400, detail="license_key is required")

    if not LICENSE_SERVER_URL:
        # No license server configured — accept any key in dev mode
        return {"valid": True, "plan": "dev", "expiry": None, "message": "Dev mode: no license server configured"}

    instance_id = get_or_create_instance_id()
    try:
        data = await _call_license_server(body.license_key.strip(), instance_id)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"License server unreachable: {exc}")

    if data.get("valid"):
        expiry = data.get("valid_until") or data.get("expiry")
        return {
            "valid": True,
            "plan": data.get("plan", "starter"),
            "expiry": expiry,
        }
    else:
        return {
            "valid": False,
            "plan": None,
            "expiry": None,
            "message": data.get("message", "Invalid license key"),
        }
