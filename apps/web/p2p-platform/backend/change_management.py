"""
Dollor.ai Change Management Workflow — Enterprise change request lifecycle.

Provides:
- ChangeRequest SQLAlchemy model (11-state lifecycle with state machine)
- AuditLog SQLAlchemy model (full audit trail on every mutation)
- Dict-based state machine with role-based transition validation
- CRUD API endpoints under /api/admin/change-requests (protected by admin_auth_middleware)
- Lifecycle endpoints: submit, approve, reject, transition, rollback
- Audit log export (CSV)
- Department lead auto-routing for approvals
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, desc
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json
import csv
import io

import logging

from models import Base
from database import get_db, engine
from project_tracker import Department, ProjectCase

logger = logging.getLogger(__name__)

# ==================== Notification Imports ====================

try:
    from email_service import (
        send_approval_needed_email,
        send_cr_rejected_email,
        send_ci_failed_email,
        send_deploy_complete_email,
        send_rollback_triggered_email,
        send_approval_digest_email,
    )
    from realtime_events import broadcast_cm_event
    _NOTIFICATIONS_AVAILABLE = True
except ImportError:
    _NOTIFICATIONS_AVAILABLE = False
    logger.warning("CM notification imports failed -- notifications disabled")


# ==================== Batch Approval Throttling ====================

# In-memory tracking for batch digest: lead_email -> list of (cr_dict, timestamp)
_pending_approvals: Dict[str, list] = {}
_BATCH_THRESHOLD = 3
_BATCH_WINDOW_SECONDS = 300  # 5 minutes


def _notify_approval_needed(cr, lead_email: Optional[str], lead_name: Optional[str], db: Session):
    """Send approval email with batch throttling. If 3+ CRs for same lead within 5 min, send digest."""
    if not _NOTIFICATIONS_AVAILABLE or not lead_email:
        return

    now = datetime.utcnow()
    # Clean stale entries (older than 5 minutes)
    if lead_email in _pending_approvals:
        _pending_approvals[lead_email] = [
            entry for entry in _pending_approvals[lead_email]
            if (now - entry[1]).total_seconds() < _BATCH_WINDOW_SECONDS
        ]

    # Add current CR to pending
    cr_info = {
        "cr_id": cr.cr_id,
        "title": cr.title,
        "priority": cr.priority,
        "requested_by": cr.requested_by,
    }
    if lead_email not in _pending_approvals:
        _pending_approvals[lead_email] = []
    _pending_approvals[lead_email].append((cr_info, now))

    pending_count = len(_pending_approvals[lead_email])
    display_name = lead_name or lead_email.split("@")[0]

    try:
        if pending_count >= _BATCH_THRESHOLD:
            # Send batch digest
            pending_crs = [entry[0] for entry in _pending_approvals[lead_email]]
            send_approval_digest_email(lead_email, display_name, pending_crs)
            # Clear after sending digest
            _pending_approvals[lead_email] = []
        else:
            # Send individual email
            send_approval_needed_email(
                lead_email, display_name, cr.cr_id, cr.title,
                cr.requested_by, cr.priority,
            )
    except Exception as e:
        logger.error(f"Failed to send approval notification for {cr.cr_id}: {e}")


def _safe_broadcast(event_type: str, cr_id: str, data: dict):
    """Broadcast a CM event, catching all errors."""
    if not _NOTIFICATIONS_AVAILABLE:
        return
    try:
        broadcast_cm_event(event_type, cr_id, data)
    except Exception as e:
        logger.error(f"Failed to broadcast CM event {event_type} for {cr_id}: {e}")


def _safe_email(fn, *args, **kwargs):
    """Call an email function, catching all errors so lifecycle is never broken."""
    if not _NOTIFICATIONS_AVAILABLE:
        return
    try:
        fn(*args, **kwargs)
    except Exception as e:
        logger.error(f"Failed to send CM email {fn.__name__}: {e}")


# ==================== SQLAlchemy Models ====================

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cr_id = Column(String(15), unique=True, nullable=False, index=True)  # CR-0001
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    change_type = Column(String(50), nullable=False, default="code")  # code/config/docs/infrastructure/manual
    status = Column(String(30), nullable=False, default="Draft")
    priority = Column(String(20), nullable=False, default="Medium")

    # Linked case(s)
    case_ids = Column(Text, nullable=True)  # comma-separated TC-XXXX IDs
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)

    # Approval tracking
    requested_by = Column(String(200), nullable=False)  # email
    approved_by = Column(String(200), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # PR/Deploy tracking
    branch_name = Column(String(200), nullable=True)
    pr_url = Column(String(500), nullable=True)
    pr_number = Column(Integer, nullable=True)
    ci_run_id = Column(String(100), nullable=True)
    ci_status = Column(String(50), nullable=True)  # pending/running/passed/failed
    deploy_staging_at = Column(DateTime, nullable=True)
    deploy_production_at = Column(DateTime, nullable=True)

    # Rollback reference
    rollback_of_cr_id = Column(String(15), nullable=True)  # CR-XXXX this reverts

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department")
    audit_entries = relationship("AuditLog", back_populates="change_request", order_by="AuditLog.created_at.desc()")


class AuditLog(Base):
    __tablename__ = "change_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    change_request_id = Column(Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # status_change, approval, rejection, comment, pr_created, ci_update, deployed, rollback
    actor_email = Column(String(200), nullable=False)
    old_value = Column(String(100), nullable=True)
    new_value = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON blob for extra context
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    change_request = relationship("ChangeRequest", back_populates="audit_entries")


# Create tables on import (following project_tracker.py pattern)
Base.metadata.create_all(bind=engine, checkfirst=True)


# ==================== State Machine ====================

CM_STATUSES = [
    "Draft", "Submitted", "Under Review", "Approved", "In Progress",
    "PR Created", "CI Running", "Staging", "Production", "Verified", "Closed",
    "Rejected",  # terminal state for rejected requests
]

# Valid transitions: current_status -> set of allowed next statuses
VALID_TRANSITIONS = {
    "Draft": {"Submitted"},
    "Submitted": {"Under Review", "Rejected"},
    "Under Review": {"Approved", "Rejected"},
    "Approved": {"In Progress"},
    "In Progress": {"PR Created"},
    "PR Created": {"CI Running"},
    "CI Running": {"Staging", "In Progress"},  # CI failure -> back to In Progress
    "Staging": {"Production"},  # manual trigger required
    "Production": {"Verified", "In Progress"},  # rollback -> back to In Progress
    "Verified": {"Closed"},
    "Rejected": {"Draft"},  # allow resubmission
}

# Non-code changes skip PR Created and CI Running states
NON_CODE_TRANSITIONS = {
    "In Progress": {"Staging"},  # direct to staging, no PR/CI
}

# Who can trigger transitions: (from_status, to_status) -> list of allowed roles
TRANSITION_ROLES = {
    ("Draft", "Submitted"): ["system", "dept_lead", "super_admin"],
    ("Submitted", "Under Review"): ["system", "dept_lead", "super_admin"],
    ("Under Review", "Approved"): ["dept_lead", "super_admin"],
    ("Under Review", "Rejected"): ["dept_lead", "super_admin"],
    ("Approved", "In Progress"): ["system", "dept_lead", "super_admin"],
    ("In Progress", "PR Created"): ["system", "super_admin"],
    ("In Progress", "Staging"): ["system", "super_admin"],  # non-code path
    ("PR Created", "CI Running"): ["system", "super_admin"],
    ("CI Running", "Staging"): ["system", "super_admin"],
    ("CI Running", "In Progress"): ["system", "dept_lead", "super_admin"],  # CI failure
    ("Staging", "Production"): ["super_admin"],  # human gate
    ("Production", "Verified"): ["system", "dept_lead", "super_admin"],
    ("Production", "In Progress"): ["system", "super_admin"],  # rollback
    ("Verified", "Closed"): ["system", "dept_lead", "super_admin"],
    ("Rejected", "Draft"): ["system", "dept_lead", "super_admin"],  # resubmission
}

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


# ==================== Pydantic Schemas ====================

class ChangeRequestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    change_type: str = "code"
    priority: str = "Medium"
    case_ids: Optional[List[str]] = None
    requested_by: str  # email of requester

class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None

class StatusTransition(BaseModel):
    new_status: str
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    actor_email: str = "system@dollor.ai"
    role: str = "system"

class ApprovalRequest(BaseModel):
    approver_email: str

class RejectionRequest(BaseModel):
    reason: str
    rejector_email: str


# ==================== Helper Functions ====================

def generate_cr_id(db: Session) -> str:
    """Generate next CR-XXXX id by querying max existing."""
    result = db.query(func.max(ChangeRequest.cr_id)).scalar()
    if result:
        # Extract number from CR-XXXX format
        num = int(result.replace("CR-", ""))
        return f"CR-{num + 1:04d}"
    return "CR-0001"


def log_audit(
    db: Session,
    change_request_id: int,
    action: str,
    actor_email: str,
    details: Optional[dict] = None,
) -> AuditLog:
    """Create an AuditLog entry. Flushes but does NOT commit (caller commits)."""
    entry = AuditLog(
        change_request_id=change_request_id,
        action=action,
        actor_email=actor_email,
        old_value=details.get("old_status") if details else None,
        new_value=details.get("new_status") if details else None,
        metadata_json=json.dumps(details) if details else None,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
    return entry


def get_approver_for_case(db: Session, case_ids: Optional[List[str]]) -> Optional[str]:
    """Look up department lead email via the first linked case's department."""
    if not case_ids:
        return None
    first_case_id = case_ids[0].strip()
    case = db.query(ProjectCase).filter(ProjectCase.case_id == first_case_id).first()
    if case and case.department_id:
        dept = db.query(Department).filter(Department.id == case.department_id).first()
        return dept.lead_email if dept else None
    return None


def validate_transition(
    current_status: str,
    new_status: str,
    change_type: str = "code",
    role: str = "system",
) -> None:
    """Validate a status transition. Raises HTTPException 400 on invalid."""
    # Determine which transition map to use
    if change_type != "code" and current_status in NON_CODE_TRANSITIONS:
        allowed = NON_CODE_TRANSITIONS.get(current_status, set()) | VALID_TRANSITIONS.get(current_status, set())
    else:
        allowed = VALID_TRANSITIONS.get(current_status, set())

    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {current_status} -> {new_status}. "
                   f"Allowed: {sorted(allowed)}"
        )

    # Check role permission
    role_key = (current_status, new_status)
    allowed_roles = TRANSITION_ROLES.get(role_key)
    if allowed_roles and role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{role}' cannot trigger transition {current_status} -> {new_status}. "
                   f"Allowed roles: {allowed_roles}"
        )


def _get_cr_or_404(db: Session, cr_id: str, for_update: bool = False) -> ChangeRequest:
    """Fetch a ChangeRequest by cr_id or raise 404."""
    query = db.query(ChangeRequest).filter(ChangeRequest.cr_id == cr_id)
    if for_update:
        query = query.with_for_update()
    cr = query.first()
    if not cr:
        raise HTTPException(status_code=404, detail=f"Change request {cr_id} not found")
    return cr


def _cr_to_dict(cr: ChangeRequest, include_audit: bool = False) -> dict:
    """Convert ChangeRequest to response dict."""
    result = {
        "id": cr.id,
        "cr_id": cr.cr_id,
        "title": cr.title,
        "description": cr.description,
        "change_type": cr.change_type,
        "status": cr.status,
        "priority": cr.priority,
        "case_ids": cr.case_ids,
        "department_id": cr.department_id,
        "department_name": cr.department.name if cr.department else None,
        "requested_by": cr.requested_by,
        "approved_by": cr.approved_by,
        "approved_at": cr.approved_at.isoformat() if cr.approved_at else None,
        "rejection_reason": cr.rejection_reason,
        "branch_name": cr.branch_name,
        "pr_url": cr.pr_url,
        "pr_number": cr.pr_number,
        "ci_run_id": cr.ci_run_id,
        "ci_status": cr.ci_status,
        "deploy_staging_at": cr.deploy_staging_at.isoformat() if cr.deploy_staging_at else None,
        "deploy_production_at": cr.deploy_production_at.isoformat() if cr.deploy_production_at else None,
        "rollback_of_cr_id": cr.rollback_of_cr_id,
        "created_at": cr.created_at.isoformat() if cr.created_at else None,
        "updated_at": cr.updated_at.isoformat() if cr.updated_at else None,
    }
    if include_audit:
        result["audit_entries"] = [
            {
                "id": a.id,
                "action": a.action,
                "actor_email": a.actor_email,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "metadata_json": a.metadata_json,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in (cr.audit_entries or [])
        ]
    return result


# ==================== API Routes ====================

change_management_router = APIRouter(
    prefix="/api/admin/change-requests",
    tags=["change-management"],
)


# --- CRUD Routes ---

@change_management_router.post("/")
def create_change_request(data: ChangeRequestCreate, db: Session = Depends(get_db)):
    """Create a new change request. Auto-resolves department from linked cases."""
    # Validate change_type
    valid_types = {"code", "config", "docs", "infrastructure", "manual"}
    if data.change_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid change_type. Must be one of: {sorted(valid_types)}")

    # Validate priority
    if data.priority not in PRIORITY_ORDER:
        raise HTTPException(status_code=400, detail=f"Invalid priority. Must be one of: {sorted(PRIORITY_ORDER.keys())}")

    cr_id = generate_cr_id(db)

    # Auto-resolve department from first linked case
    department_id = None
    if data.case_ids:
        first_case_id = data.case_ids[0].strip()
        case = db.query(ProjectCase).filter(ProjectCase.case_id == first_case_id).first()
        if case and case.department_id:
            department_id = case.department_id

    cr = ChangeRequest(
        cr_id=cr_id,
        title=data.title,
        description=data.description,
        change_type=data.change_type,
        priority=data.priority,
        case_ids=",".join(data.case_ids) if data.case_ids else None,
        department_id=department_id,
        requested_by=data.requested_by,
        status="Draft",
    )
    db.add(cr)
    db.flush()

    log_audit(db, cr.id, "created", data.requested_by, {
        "new_status": "Draft",
        "change_type": data.change_type,
        "title": data.title,
    })
    db.commit()
    db.refresh(cr)

    return _cr_to_dict(cr, include_audit=True)


@change_management_router.get("/pending-execution")
def list_pending_execution(db: Session = Depends(get_db)):
    """Returns change requests with status Approved or In Progress (for GSD executor polling)."""
    crs = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.status.in_(["Approved", "In Progress"]))
        .all()
    )
    # Sort by priority then created_at
    crs.sort(key=lambda c: (PRIORITY_ORDER.get(c.priority, 99), c.created_at or datetime.min))
    return [_cr_to_dict(c) for c in crs]


@change_management_router.get("/audit/export")
def export_audit_log(db: Session = Depends(get_db)):
    """CSV export of all audit log entries."""
    entries = (
        db.query(AuditLog)
        .join(ChangeRequest, AuditLog.change_request_id == ChangeRequest.id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    headers = ["cr_id", "action", "actor_email", "old_value", "new_value", "metadata", "timestamp"]
    writer.writerow(headers)

    for e in entries:
        # Look up cr_id from the relationship
        cr_id = e.change_request.cr_id if e.change_request else "unknown"
        writer.writerow([
            cr_id,
            e.action,
            e.actor_email,
            e.old_value or "",
            e.new_value or "",
            e.metadata_json or "",
            e.created_at.isoformat() if e.created_at else "",
        ])

    csv_string = output.getvalue()
    return Response(
        content=csv_string,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=change-audit-log.csv"},
    )


@change_management_router.get("/")
def list_change_requests(
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    change_type: Optional[str] = None,
    requested_by: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List change requests with filtering and pagination."""
    query = db.query(ChangeRequest)

    if status:
        query = query.filter(ChangeRequest.status == status)
    if department_id:
        query = query.filter(ChangeRequest.department_id == department_id)
    if change_type:
        query = query.filter(ChangeRequest.change_type == change_type)
    if requested_by:
        query = query.filter(ChangeRequest.requested_by == requested_by)

    total = query.count()
    crs = (
        query.order_by(ChangeRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [_cr_to_dict(c) for c in crs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@change_management_router.get("/stale", response_model=None)
def list_stale_requests(
    timeout_minutes: int = Query(default=30, ge=1, le=1440),
    db: Session = Depends(get_db),
):
    """
    Return change requests stuck in CI Running or Staging for longer than timeout.

    Used by admin dashboard for monitoring stuck requests.
    """
    stale = get_stale_requests(db, timeout_minutes)
    return {
        "items": [_cr_to_dict(c) for c in stale],
        "total": len(stale),
        "timeout_minutes": timeout_minutes,
    }


@change_management_router.get("/{cr_id}")
def get_change_request(cr_id: str, db: Session = Depends(get_db)):
    """Get a single change request with all audit entries."""
    cr = (
        db.query(ChangeRequest)
        .options(joinedload(ChangeRequest.audit_entries))
        .options(joinedload(ChangeRequest.department))
        .filter(ChangeRequest.cr_id == cr_id)
        .first()
    )
    if not cr:
        raise HTTPException(status_code=404, detail=f"Change request {cr_id} not found")
    return _cr_to_dict(cr, include_audit=True)


@change_management_router.put("/{cr_id}")
def update_change_request(cr_id: str, data: ChangeRequestUpdate, db: Session = Depends(get_db)):
    """Update a change request (title, description, priority). Only allowed in Draft status."""
    cr = _get_cr_or_404(db, cr_id)

    if cr.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail=f"Can only update change requests in Draft status. Current: {cr.status}"
        )

    changes = {}
    if data.title is not None:
        changes["title"] = {"old": cr.title, "new": data.title}
        cr.title = data.title
    if data.description is not None:
        changes["description"] = {"old": cr.description, "new": data.description}
        cr.description = data.description
    if data.priority is not None:
        if data.priority not in PRIORITY_ORDER:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {data.priority}")
        changes["priority"] = {"old": cr.priority, "new": data.priority}
        cr.priority = data.priority

    if changes:
        cr.updated_at = datetime.utcnow()
        log_audit(db, cr.id, "updated", cr.requested_by, {"changes": changes})
        db.commit()
        db.refresh(cr)

    return _cr_to_dict(cr)


# --- Lifecycle Routes ---

@change_management_router.post("/{cr_id}/submit")
def submit_change_request(cr_id: str, db: Session = Depends(get_db)):
    """Submit a draft change request. Transitions: Draft -> Submitted -> Under Review."""
    cr = _get_cr_or_404(db, cr_id, for_update=True)

    # Validate Draft -> Submitted
    validate_transition(cr.status, "Submitted", cr.change_type, "system")

    old_status = cr.status
    cr.status = "Submitted"
    cr.updated_at = datetime.utcnow()

    log_audit(db, cr.id, "status_change", cr.requested_by, {
        "old_status": old_status,
        "new_status": "Submitted",
    })

    # Auto-transition: Submitted -> Under Review (system transition)
    validate_transition("Submitted", "Under Review", cr.change_type, "system")
    cr.status = "Under Review"
    cr.updated_at = datetime.utcnow()

    log_audit(db, cr.id, "status_change", "system@dollor.ai", {
        "old_status": "Submitted",
        "new_status": "Under Review",
        "auto_transition": True,
    })

    db.commit()
    db.refresh(cr)

    # Notifications AFTER commit
    _safe_broadcast("cm_status_change", cr.cr_id, {
        "new_status": "Under Review",
        "old_status": old_status,
        "actor": cr.requested_by,
    })

    # Send approval email to department lead
    lead_email = None
    lead_name = None
    if cr.department:
        lead_email = cr.department.lead_email
        lead_name = cr.department.lead_name if hasattr(cr.department, "lead_name") else None
    _notify_approval_needed(cr, lead_email, lead_name, db)
    _safe_broadcast("cm_approval_needed", cr.cr_id, {
        "new_status": "Under Review",
        "requested_by": cr.requested_by,
        "priority": cr.priority,
    })

    return _cr_to_dict(cr, include_audit=True)


@change_management_router.post("/{cr_id}/approve")
def approve_change_request(cr_id: str, data: ApprovalRequest, db: Session = Depends(get_db)):
    """Approve a change request. Under Review -> Approved."""
    cr = _get_cr_or_404(db, cr_id, for_update=True)

    validate_transition(cr.status, "Approved", cr.change_type, "dept_lead")

    old_status = cr.status
    cr.status = "Approved"
    cr.approved_by = data.approver_email
    cr.approved_at = datetime.utcnow()
    cr.updated_at = datetime.utcnow()

    log_audit(db, cr.id, "approval", data.approver_email, {
        "old_status": old_status,
        "new_status": "Approved",
    })

    db.commit()
    db.refresh(cr)

    # Notifications AFTER commit
    _safe_broadcast("cm_status_change", cr.cr_id, {
        "new_status": "Approved",
        "old_status": old_status,
        "actor": data.approver_email,
    })

    return _cr_to_dict(cr, include_audit=True)


@change_management_router.post("/{cr_id}/reject")
def reject_change_request(cr_id: str, data: RejectionRequest, db: Session = Depends(get_db)):
    """Reject a change request. Under Review -> Rejected."""
    cr = _get_cr_or_404(db, cr_id, for_update=True)

    validate_transition(cr.status, "Rejected", cr.change_type, "dept_lead")

    old_status = cr.status
    cr.status = "Rejected"
    cr.rejection_reason = data.reason
    cr.updated_at = datetime.utcnow()

    log_audit(db, cr.id, "rejection", data.rejector_email, {
        "old_status": old_status,
        "new_status": "Rejected",
        "reason": data.reason,
    })

    db.commit()
    db.refresh(cr)

    # Notifications AFTER commit
    _safe_email(send_cr_rejected_email, cr.requested_by, cr.cr_id, cr.title,
                data.rejector_email, data.reason)
    _safe_broadcast("cm_status_change", cr.cr_id, {
        "new_status": "Rejected",
        "old_status": old_status,
        "actor": data.rejector_email,
    })

    return _cr_to_dict(cr, include_audit=True)


@change_management_router.post("/{cr_id}/transition")
def transition_status(cr_id: str, data: StatusTransition, db: Session = Depends(get_db)):
    """Generic transition endpoint. Validates via state machine. Uses SELECT FOR UPDATE."""
    cr = _get_cr_or_404(db, cr_id, for_update=True)

    validate_transition(cr.status, data.new_status, cr.change_type, data.role)

    old_status = cr.status
    cr.status = data.new_status
    cr.updated_at = datetime.utcnow()

    # Handle metadata for specific transitions
    metadata = data.metadata or {}
    if data.new_status == "PR Created":
        if "pr_url" in metadata:
            cr.pr_url = metadata["pr_url"]
        if "branch_name" in metadata:
            cr.branch_name = metadata["branch_name"]
        if "pr_number" in metadata:
            cr.pr_number = metadata["pr_number"]
    elif data.new_status == "CI Running":
        if "ci_run_id" in metadata:
            cr.ci_run_id = metadata["ci_run_id"]
        cr.ci_status = "running"
    elif data.new_status == "Staging":
        cr.deploy_staging_at = datetime.utcnow()
        cr.ci_status = "passed"
    elif data.new_status == "Production":
        cr.deploy_production_at = datetime.utcnow()

    audit_details = {
        "old_status": old_status,
        "new_status": data.new_status,
    }
    if data.reason:
        audit_details["reason"] = data.reason
    if metadata:
        audit_details["metadata"] = metadata

    log_audit(db, cr.id, "status_change", data.actor_email, audit_details)

    db.commit()
    db.refresh(cr)

    # Notifications AFTER commit
    _safe_broadcast("cm_status_change", cr.cr_id, {
        "new_status": data.new_status,
        "old_status": old_status,
        "actor": data.actor_email,
    })

    # Email notifications for critical transitions
    if data.new_status == "CI Running" and metadata.get("ci_status") == "failed":
        _safe_email(send_ci_failed_email, cr.requested_by, cr.cr_id, cr.title,
                    cr.ci_run_id or "", cr.branch_name or "")
        _safe_broadcast("cm_ci_update", cr.cr_id, {
            "ci_status": "failed",
            "ci_run_id": cr.ci_run_id,
        })
    elif data.new_status == "In Progress" and old_status == "CI Running":
        # CI failure transition back to In Progress
        _safe_email(send_ci_failed_email, cr.requested_by, cr.cr_id, cr.title,
                    cr.ci_run_id or "", cr.branch_name or "")
        _safe_broadcast("cm_ci_update", cr.cr_id, {
            "ci_status": "failed",
            "ci_run_id": cr.ci_run_id,
        })
    elif data.new_status == "Staging":
        deploy_time = cr.deploy_staging_at.isoformat() if cr.deploy_staging_at else datetime.utcnow().isoformat()
        _safe_email(send_deploy_complete_email, cr.requested_by, cr.cr_id, cr.title,
                    "staging", deploy_time)
        _safe_broadcast("cm_deployed", cr.cr_id, {
            "environment": "staging",
            "deploy_time": deploy_time,
        })
    elif data.new_status == "Production":
        deploy_time = cr.deploy_production_at.isoformat() if cr.deploy_production_at else datetime.utcnow().isoformat()
        _safe_email(send_deploy_complete_email, cr.requested_by, cr.cr_id, cr.title,
                    "production", deploy_time)
        _safe_broadcast("cm_deployed", cr.cr_id, {
            "environment": "production",
            "deploy_time": deploy_time,
        })

    return _cr_to_dict(cr, include_audit=True)


# --- Audit Routes ---

@change_management_router.get("/{cr_id}/audit")
def get_audit_log(cr_id: str, db: Session = Depends(get_db)):
    """Get audit log for a specific change request."""
    cr = _get_cr_or_404(db, cr_id)

    entries = (
        db.query(AuditLog)
        .filter(AuditLog.change_request_id == cr.id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    return [
        {
            "id": e.id,
            "action": e.action,
            "actor_email": e.actor_email,
            "old_value": e.old_value,
            "new_value": e.new_value,
            "metadata_json": e.metadata_json,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


# --- Rollback Route ---

@change_management_router.post("/{cr_id}/rollback")
def create_rollback(cr_id: str, db: Session = Depends(get_db)):
    """Create a new ChangeRequest that is a revert of the given CR.

    The rollback CR starts at Draft and must go through the full approval flow.
    """
    original = _get_cr_or_404(db, cr_id)

    # Only allow rollback of CRs that have reached Production or later
    if original.status not in ("Production", "Verified", "Closed"):
        raise HTTPException(
            status_code=400,
            detail=f"Can only rollback change requests in Production/Verified/Closed status. Current: {original.status}"
        )

    new_cr_id = generate_cr_id(db)

    rollback_cr = ChangeRequest(
        cr_id=new_cr_id,
        title=f"Rollback: {original.title}",
        description=f"Revert of {original.cr_id}: {original.description or 'No description'}",
        change_type="code",
        priority=original.priority,
        case_ids=original.case_ids,
        department_id=original.department_id,
        requested_by="system@dollor.ai",
        rollback_of_cr_id=original.cr_id,
        status="Draft",
    )
    db.add(rollback_cr)
    db.flush()

    # Log on the rollback CR
    log_audit(db, rollback_cr.id, "created", "system@dollor.ai", {
        "new_status": "Draft",
        "rollback_of": original.cr_id,
    })

    # Log on the original CR
    log_audit(db, original.id, "rollback_created", "system@dollor.ai", {
        "rollback_cr_id": new_cr_id,
        "original_cr_id": original.cr_id,
    })

    db.commit()
    db.refresh(rollback_cr)

    # Notifications AFTER commit
    _safe_email(send_rollback_triggered_email, original.requested_by,
                original.cr_id, original.title, new_cr_id, "system@dollor.ai")
    _safe_broadcast("cm_status_change", original.cr_id, {
        "new_status": "rollback_created",
        "rollback_cr_id": new_cr_id,
        "actor": "system@dollor.ai",
    })

    return _cr_to_dict(rollback_cr, include_audit=True)


# --- CI Approval Check & Monitoring Routes ---

@change_management_router.get("/{cr_id}/ci-check")
def ci_approval_check(cr_id: str, db: Session = Depends(get_db)):
    """
    CI pipeline check: verify a CR was properly approved before allowing merge.

    Returns approval status for CI/CD gate verification.
    Called by CI pipeline to ensure PR's associated CR has been approved.
    """
    cr = db.query(ChangeRequest).filter(ChangeRequest.cr_id == cr_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail=f"Change request {cr_id} not found")

    return {
        "approved": cr.approved_by is not None,
        "approved_by": cr.approved_by,
        "approved_at": cr.approved_at.isoformat() if cr.approved_at else None,
        "cr_id": cr.cr_id,
        "status": cr.status,
    }


def get_stale_requests(db: Session, timeout_minutes: int = 30) -> list:
    """
    Return CRs stuck in 'CI Running' or 'Staging' for longer than timeout_minutes.

    Used for monitoring -- flags requests that might need manual intervention.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    stale = (
        db.query(ChangeRequest)
        .filter(
            ChangeRequest.status.in_(["CI Running", "Staging"]),
            ChangeRequest.updated_at < cutoff,
        )
        .order_by(ChangeRequest.updated_at.asc())
        .all()
    )
    return stale



