# Phase 11: Change Management Workflow - Research

**Researched:** 2026-03-07
**Domain:** Enterprise case management, approval workflows, CI/CD integration, audit logging
**Confidence:** HIGH

## Summary

This phase builds an enterprise change management system on top of the existing project tracker infrastructure (2,512+ cases, 10 departments, auto-assign engine). The existing codebase in `project_tracker.py` provides SQLAlchemy models for `ProjectCase`, `Department`, `TeamMember`, and `AssignmentRule`, all with CRUD APIs under `/api/admin/project-cases/*`. The admin portal React frontend (`projectTracker/Main.tsx`) already renders cases with department tabs, filtering, bulk actions, and CSV export using Ant Design + Lucide icons.

The core work is: (1) new `ChangeRequest` and `AuditLog` SQLAlchemy models, (2) a status state machine with the 11-state lifecycle, (3) approval routing via existing `Department.lead_email`, (4) email notifications using the established `email_service.py` pattern, (5) in-app dashboard notifications via the existing WebSocket `ConnectionManager`, and (6) a new React admin UI tab/page for change request submission, approval, and status tracking. CI/CD integration leverages the existing `ci-complete.yml` workflow (lint, SAST, tests, coverage, Docker build) and the `deploy-staging.yml` / `deploy-dollar-ai.yml` deploy workflows.

**Primary recommendation:** Extend `project_tracker.py` with new models and a new `change_management.py` module for the workflow engine. Keep all change management API routes under `/api/admin/change-requests/*` (protected by existing `admin_auth_middleware`). Build a new `changeManagement/` screen in the admin portal.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Change requests submitted via **both API endpoint + admin portal UI** -- API is source of truth, admin portal is primary consumer
- Requests **auto-route to department lead** assigned to the affected case(s) -- department lead approves/rejects in admin portal
- **No auto-approve** -- every change request needs department lead sign-off regardless of priority
- Scope covers **any tracked work** -- code, config, docs, infrastructure, manual tasks. Everything goes through the system.
- **GSD executor implements the change** -- approved cases trigger GSD to execute, commit code, and create PR on a feature branch
- Feature branch + PR for code changes (not direct to main) -- enterprise standard requires review cycle
- Non-code work (config, docs, manual tasks) updates status without PR
- **Enterprise-level checks required**: pytest full suite, TypeScript compilation (if frontend changed), staging smoke tests, approval record verification
- **Auto-deploy to staging** on green CI. **Production deploy requires manual trigger** -- human gate before production always.
- **Rollback = revert PR through same approval flow** -- auditable rollback trail, no shortcut buttons
- **Full enterprise lifecycle**: Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed
- **System-driven transitions with role-based override** -- most transitions happen automatically (approval->in-progress, CI green->staging, etc). Department leads can override within their dept. Super-admins can override across departments.
- **Full audit log** -- every status change, approval, comment, PR link, deploy event. Timestamped with who did it. Exportable.
- **Email + in-app notifications** -- dashboard notifications for everything, email for critical transitions (approval needed, deploy failed, rollback triggered)

### Claude's Discretion
- PR trigger timing (auto-immediate vs manual button) -- pick what works best with GSD executor flow
- Branch naming convention -- consistent with existing patterns
- Audit log detail granularity -- enterprise-appropriate level
- Notification email templates and frequency throttling
- How feature branches merge (squash, merge commit, rebase)
- Database schema for audit log, change requests, approval records

### Deferred Ideas (OUT OF SCOPE)
- None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CM-01 | Change requests can be submitted via admin portal form AND API endpoint | Existing `project_tracker.py` API pattern under `/api/admin/*` with admin_auth_middleware; React admin portal with Ant Design forms |
| CM-02 | Requests auto-route to department lead for approval (no auto-approve -- everything needs sign-off) | `Department.lead_email` field exists; `AssignmentRule` engine maps cases to departments; approval routing uses department FK on ProjectCase |
| CM-03 | Approved cases trigger GSD executor to implement changes on feature branch with PR | GSD executor is external (Claude Code); API provides webhook/trigger endpoint; branch naming via convention |
| CM-04 | CI pipeline runs all checks before merge | Existing `ci-complete.yml` workflow: lint, Semgrep SAST, pytest, SonarCloud, Docker build; PR triggers automatically |
| CM-05 | Full enterprise status lifecycle with audit log | New `ChangeRequest` model with 11 status states; `AuditLog` model for every transition; exportable via CSV |
| CM-06 | Email + in-app notifications on key transitions | `email_service.py` with `send_email()` pattern; WebSocket `ConnectionManager` for real-time admin notifications |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | (existing) | API framework for all change management endpoints | Already powers entire backend (`main_new.py`) |
| SQLAlchemy | (existing) | ORM for ChangeRequest, AuditLog, ApprovalRecord models | Already used for all models in `models.py` and `project_tracker.py` |
| Pydantic | (existing) | Request/response validation for all API schemas | Already used for all API schemas |
| React 18 | ^18.3.1 | Admin portal UI for change management screens | Already used in frontend |
| Ant Design | ^5.27.4 | UI components (Form, Table, Select, Modal, Tag, Timeline) | Already used in project tracker UI |
| Lucide React | ^0.344.0 | Icons for status indicators and actions | Already used in project tracker UI |
| Axios | ^1.12.2 | API client for frontend-to-backend calls | Already configured with auth interceptor in `api.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| email_service.py | (internal) | Transactional emails for approval/deploy notifications | All email notifications (approval needed, deploy failed, rollback) |
| realtime_events.py | (internal) | WebSocket push for in-app notifications | Dashboard live updates on status changes |
| date-fns | ^2.30.0 | Date formatting in frontend | Audit log timestamps, relative time display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom state machine | python-statemachine library | Adds dependency for something achievable with a dict-based transition map; keep custom for simplicity |
| Separate microservice | Endpoint in main_new.py | Consistent with project pattern -- everything in monolith |
| WebSocket for notifications | Polling | WebSocket already implemented via ConnectionManager; use it |

**Installation:**
```bash
# No new packages needed -- everything uses existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/p2p-platform/backend/
    change_management.py        # New: models, schemas, state machine, API routes
    project_tracker.py          # Existing: ProjectCase, Department, TeamMember, AssignmentRule
    email_service.py            # Existing: add new email templates for CM notifications
    realtime_events.py          # Existing: add CM event types

apps/web/p2p-platform/frontend/src/app/screens/
    changeManagement/
        Main.tsx                # Tab container: Requests, Approvals, Audit Log
        RequestForm.tsx         # Submit new change request form
        RequestDetail.tsx       # Single request view with timeline + actions
        ApprovalQueue.tsx       # Department lead approval view
        AuditLog.tsx            # Searchable/exportable audit log
```

### Pattern 1: State Machine for Status Lifecycle
**What:** Dict-based state machine defining valid transitions and who can trigger them
**When to use:** For the 11-state lifecycle (Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed)
**Example:**
```python
# Source: project_tracker.py existing pattern (VALID_STATUSES)
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
    "In Progress": {"PR Created"},  # code changes; or direct to Staging for non-code
    "PR Created": {"CI Running"},
    "CI Running": {"Staging", "In Progress"},  # CI failure -> back to In Progress
    "Staging": {"Production"},  # manual trigger required
    "Production": {"Verified", "In Progress"},  # rollback -> back to In Progress
    "Verified": {"Closed"},
    "Rejected": {"Draft"},  # allow resubmission
}

# Who can trigger transitions
TRANSITION_ROLES = {
    ("Submitted", "Under Review"): ["system", "dept_lead"],
    ("Under Review", "Approved"): ["dept_lead"],
    ("Under Review", "Rejected"): ["dept_lead"],
    ("Staging", "Production"): ["super_admin"],  # human gate
    # ... etc
}
```

### Pattern 2: Audit Log on Every Mutation
**What:** Every status change, approval, comment, PR link, or deploy event creates an AuditLog row
**When to use:** On every `ChangeRequest` mutation -- never update without logging
**Example:**
```python
def log_audit(db: Session, change_request_id: int, action: str,
              actor_email: str, details: dict = None):
    entry = AuditLog(
        change_request_id=change_request_id,
        action=action,  # "status_change", "approval", "comment", "pr_created", "deployed"
        actor_email=actor_email,
        old_value=details.get("old_status"),
        new_value=details.get("new_status"),
        metadata_json=json.dumps(details) if details else None,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
```

### Pattern 3: Department Lead Routing via Existing Models
**What:** Use `ProjectCase.department_id` -> `Department.lead_email` for auto-routing approvals
**When to use:** When a change request is submitted, look up the department lead
**Example:**
```python
# project_tracker.py already has:
# Department.lead_email (String 200)
# ProjectCase.department_id (FK to departments.id)
# AssignmentRule auto-assigns cases to departments

def get_approver_for_case(db: Session, case_id: str) -> Optional[str]:
    case = db.query(ProjectCase).filter(ProjectCase.case_id == case_id).first()
    if case and case.department_id:
        dept = db.query(Department).get(case.department_id)
        return dept.lead_email if dept else None
    return None
```

### Pattern 4: Non-Code Change Shortcut
**What:** Non-code changes (config, docs, manual tasks) skip PR/CI states
**When to use:** When `change_type` is not "code"
**Example:**
```python
# For non-code changes, valid transitions skip PR/CI:
NON_CODE_TRANSITIONS = {
    "Approved": {"In Progress"},
    "In Progress": {"Staging"},  # direct to staging, no PR
    "Staging": {"Production"},
    # ... rest same as code path
}
```

### Anti-Patterns to Avoid
- **Status update without audit log:** NEVER update ChangeRequest.status without creating an AuditLog entry. Wrap in a single transaction.
- **Direct main branch commits:** All code changes MUST go through feature branch + PR. The system must not provide any shortcut.
- **Auto-approve for any priority:** User explicitly locked "no auto-approve." Do not add priority-based auto-approve logic even for Low priority.
- **Separate database for audit:** Use the same PostgreSQL database -- no separate audit DB. Keep it simple.
- **Polling for status updates:** Use existing WebSocket ConnectionManager for real-time updates, not polling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP client | `email_service.py:send_email()` | Already handles retry, logging, validation, unsubscribe |
| Real-time notifications | Custom WebSocket server | `realtime_events.py:ConnectionManager` | Already manages connections, rooms, broadcast |
| Admin auth | Custom auth middleware | `admin_auth_middleware` (main_new.py:196) | Already protects all `/api/admin/*` routes |
| CSV export | Custom CSV generation | Follow `export_project_cases()` pattern in project_tracker.py | Already proven pattern with proper headers |
| Date/time formatting | Custom date utils | `date-fns` (frontend) / `datetime` (backend) | Already in dependency tree |

**Key insight:** This project has an unusually complete set of internal utilities. Nearly every infrastructure concern (email, WebSocket, auth, CSV export) already has a working implementation. The phase is about wiring new business logic, not building infrastructure.

## Common Pitfalls

### Pitfall 1: Orphaned Status Transitions
**What goes wrong:** ChangeRequest gets stuck in a status because the automatic transition trigger fails (e.g., CI webhook doesn't fire)
**Why it happens:** Distributed system -- GitHub Actions, ECS, and the backend are separate systems
**How to avoid:** Add a "stale check" background job (similar to existing APScheduler jobs) that flags requests stuck in CI Running/Staging for >30 minutes. Add manual override for dept leads and super-admins.
**Warning signs:** Requests sitting in "CI Running" or "Staging" for extended periods

### Pitfall 2: Race Conditions on Approval
**What goes wrong:** Two department leads approve the same request simultaneously, creating duplicate audit entries
**Why it happens:** No optimistic locking on status transitions
**How to avoid:** Use `SELECT FOR UPDATE` (SQLAlchemy `with_for_update()`) when transitioning status. Check current status before applying transition.
**Warning signs:** Duplicate audit log entries for the same transition

### Pitfall 3: Email Flooding
**What goes wrong:** Department lead gets 50 emails for 50 change requests submitted in batch
**Why it happens:** No notification throttling/batching
**How to avoid:** Batch notifications: if >3 requests need approval from same lead within 5 minutes, send a single digest email instead of individual emails.
**Warning signs:** User complaints about email volume

### Pitfall 4: Broken Audit Trail on Error
**What goes wrong:** Status changes but audit log entry fails to write (or vice versa)
**Why it happens:** Not using a single database transaction
**How to avoid:** ALWAYS wrap status change + audit log in a single `db.commit()`. Never commit status separately from audit.
**Warning signs:** Status changes without corresponding audit entries

### Pitfall 5: Missing Alembic Migration
**What goes wrong:** New tables not created on staging/production deployment
**Why it happens:** Project uses SQLAlchemy `create_all()` pattern (see `project_tracker.py` seed logic), not Alembic migrations
**How to avoid:** Follow the existing pattern -- add `Base.metadata.create_all(bind=engine)` call that includes new models. Verify tables exist on first API call.
**Warning signs:** 500 errors on first change management API call after deploy

### Pitfall 6: GSD Executor Coupling
**What goes wrong:** Tight coupling between the change management system and GSD executor makes the system brittle
**Why it happens:** Trying to programmatically invoke Claude Code from the backend
**How to avoid:** The API provides a "trigger" endpoint that records the intent. The GSD executor (external) polls or receives webhook for approved requests. Keep the boundary clean -- backend tracks status, external system does execution.
**Warning signs:** Backend trying to shell out to Claude Code or manage git operations directly

## Code Examples

### Backend: ChangeRequest Model
```python
# Source: Based on existing ProjectCase model pattern in project_tracker.py
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
    approved_by = Column(String(200), nullable=True)  # email of approver
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
```

### Backend: AuditLog Model
```python
class AuditLog(Base):
    __tablename__ = "change_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    change_request_id = Column(Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # status_change, approval, rejection, comment, pr_created, ci_update, deployed, rollback
    actor_email = Column(String(200), nullable=False)
    old_value = Column(String(100), nullable=True)
    new_value = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON blob for extra context (PR URL, CI run ID, etc.)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    change_request = relationship("ChangeRequest", back_populates="audit_entries")
```

### Backend: API Route Pattern
```python
# Source: Based on project_tracker.py route registration pattern
router = APIRouter(prefix="/api/admin/change-requests", tags=["change-management"])

@router.post("/")
def create_change_request(data: ChangeRequestCreate, db: Session = Depends(get_db)):
    ...

@router.get("/")
def list_change_requests(status: str = None, department_id: int = None,
                         page: int = 1, page_size: int = 50,
                         db: Session = Depends(get_db)):
    ...

@router.get("/{cr_id}")
def get_change_request(cr_id: str, db: Session = Depends(get_db)):
    ...

@router.post("/{cr_id}/submit")
def submit_change_request(cr_id: str, db: Session = Depends(get_db)):
    # Draft -> Submitted, auto-route to department lead
    ...

@router.post("/{cr_id}/approve")
def approve_change_request(cr_id: str, db: Session = Depends(get_db)):
    # Under Review -> Approved (dept lead only)
    ...

@router.post("/{cr_id}/reject")
def reject_change_request(cr_id: str, reason: str, db: Session = Depends(get_db)):
    ...

@router.post("/{cr_id}/transition")
def transition_status(cr_id: str, data: StatusTransition, db: Session = Depends(get_db)):
    # Generic transition endpoint for system/admin overrides
    ...

@router.get("/{cr_id}/audit")
def get_audit_log(cr_id: str, db: Session = Depends(get_db)):
    ...

@router.get("/audit/export")
def export_audit_log(db: Session = Depends(get_db)):
    # CSV export following project_tracker.py:export_project_cases() pattern
    ...

@router.post("/{cr_id}/rollback")
def create_rollback(cr_id: str, db: Session = Depends(get_db)):
    # Creates a new CR that is a revert of the given CR
    ...
```

### Frontend: Route Registration
```typescript
// Source: Based on App.tsx route pattern for ProjectTracker
// In App.tsx, add alongside existing admin routes:
<Route path="change-management" element={<ChangeManagement />} />
```

### Email Notification Pattern
```python
# Source: Based on email_service.py existing template pattern
def send_approval_needed_email(
    to_email: str,
    lead_name: str,
    cr_id: str,
    cr_title: str,
    requested_by: str,
    priority: str
) -> bool:
    subject = f"[Dollor.ai] Approval Needed: {cr_id} - {cr_title}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Approval Required</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 10px 10px;">
            <p>Hi {lead_name},</p>
            <p>A change request requires your approval:</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold;">Request:</td><td>{cr_id}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Title:</td><td>{cr_title}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Priority:</td><td>{priority}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Requested by:</td><td>{requested_by}</td></tr>
            </table>
            <p><a href="https://dollor.ai/admin/change-management" style="background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Review Request</a></p>
        </div>
    </div>
    """
    return send_email(to_email, subject, html_body, skip_validation=True)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ProjectCase with 4 statuses (Open/In Progress/Verified/Released) | ChangeRequest with 11 statuses + state machine | Phase 11 | Full enterprise lifecycle tracking |
| No approval workflow | Department lead approval routing | Phase 11 | All changes require sign-off |
| Manual deploy via GSD commands | System-tracked deploy with audit trail | Phase 11 | Auditable deployment history |
| No audit log | Full AuditLog table with actor, timestamp, details | Phase 11 | Enterprise compliance |

## Discretion Recommendations

### PR Trigger Timing
**Recommendation:** Manual button in admin portal ("Start Implementation") that transitions Approved -> In Progress. The GSD executor polls for "In Progress" requests or is triggered via a webhook endpoint. Rationale: auto-immediate would require the GSD executor to be always-on, which it is not (it runs in Claude Code sessions).

### Branch Naming Convention
**Recommendation:** `cm/{cr_id}/{slug}` (e.g., `cm/CR-0042/fix-fare-calculation`). This is consistent with GSD patterns and makes it easy to trace branches to change requests.

### Audit Log Granularity
**Recommendation:** Log every discrete action as a separate row: status changes, approvals, rejections, comments, PR creation, CI status updates, deploy events, rollback creation. Include `metadata_json` for structured extra data (PR URL, CI run ID, deploy timestamp). This is enterprise-appropriate and enables CSV export with full detail.

### Notification Email Frequency
**Recommendation:** Email for these critical transitions only: approval needed, request rejected, CI failed, deploy to staging complete, deploy to production complete, rollback triggered. Batch if >3 similar notifications for same recipient within 5 minutes. All other transitions are in-app (WebSocket) only.

### Merge Strategy
**Recommendation:** Squash merge. Keeps main branch history clean with one commit per change request. The full commit history is preserved on the feature branch and in the audit log.

## Open Questions

1. **GSD Executor Integration**
   - What we know: GSD executor runs in Claude Code sessions, not as a persistent service. It cannot be invoked programmatically from the backend.
   - What's unclear: How does the executor discover "In Progress" change requests? Polling? Manual trigger?
   - Recommendation: Provide a `/api/admin/change-requests/pending-execution` endpoint that returns approved CRs awaiting implementation. The human operator triggers GSD execution. The executor calls `/api/admin/change-requests/{cr_id}/transition` to update status as it progresses.

2. **GitHub Webhook for CI Status**
   - What we know: `ci-complete.yml` runs on PRs to main. It produces pass/fail results.
   - What's unclear: Whether GitHub webhooks are configured to call back to the Dollor.ai backend.
   - Recommendation: For v1, use polling -- the admin portal can check PR status via `gh` CLI or GitHub API. For v2, add a GitHub webhook endpoint. This avoids adding webhook infrastructure complexity in the first iteration.

3. **Database Migration Strategy**
   - What we know: Project uses `Base.metadata.create_all()` pattern, not Alembic.
   - What's unclear: Whether `create_all()` is called on startup or manually via seed endpoints.
   - Recommendation: Follow existing pattern. Add new models to the import chain so `create_all()` picks them up. Test on staging first.

## Sources

### Primary (HIGH confidence)
- `apps/web/p2p-platform/backend/project_tracker.py` -- Existing ProjectCase, Department, TeamMember, AssignmentRule models, all CRUD API endpoints, auto-assign engine
- `apps/web/p2p-platform/backend/email_service.py` -- Email sending pattern with `send_email()`, HTML templates, retry, validation
- `apps/web/p2p-platform/backend/realtime_events.py` -- WebSocket ConnectionManager for real-time notifications
- `apps/web/p2p-platform/backend/main_new.py:196` -- `admin_auth_middleware` protecting all `/api/admin/*` routes
- `apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx` -- Existing admin UI with Ant Design, Lucide icons, tabs, filters
- `.github/workflows/ci-complete.yml` -- Full CI pipeline: lint, SAST, pytest, SonarCloud, Docker build
- `.github/workflows/deploy-staging.yml` -- Staging deployment workflow
- `11-CONTEXT.md` -- User decisions from discuss phase

### Secondary (MEDIUM confidence)
- SQLAlchemy `with_for_update()` for optimistic locking -- standard SQLAlchemy feature, verified in documentation
- Squash merge strategy -- standard GitHub PR merge option

### Tertiary (LOW confidence)
- GitHub webhook integration for CI status callbacks -- would need to verify GitHub App/webhook setup exists; polling is safer for v1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 100% existing libraries, zero new dependencies
- Architecture: HIGH -- follows established patterns from project_tracker.py and email_service.py exactly
- Pitfalls: HIGH -- derived from real patterns observed in the codebase (APScheduler, transaction patterns, email service)
- GSD executor integration: MEDIUM -- external system boundary is less well-defined

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- stable domain, no external dependency changes expected)
