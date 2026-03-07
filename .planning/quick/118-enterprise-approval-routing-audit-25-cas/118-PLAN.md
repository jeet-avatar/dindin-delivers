---
phase: quick-118
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/project_tracker.py
  - apps/web/p2p-platform/backend/change_management.py
  - apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestForm.tsx
  - apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx
  - apps/web/p2p-platform/frontend/src/app/screens/changeManagement/ApprovalQueue.tsx
  - apps/web/p2p-platform/frontend/src/app/screens/changeManagement/Main.tsx
autonomous: true
requirements: [QUICK-118]

must_haves:
  truths:
    - "Each department has configurable approval chain rules (e.g., Engineering P1 needs dept lead + CTO)"
    - "CRs require multi-level approval when department rules demand it (not just single approve)"
    - "Approval delegation works — if dept lead is OOO, delegate approves instead"
    - "Department-specific required fields are enforced on CR creation (e.g., Engineering needs branch_name, Ops needs runbook_url)"
    - "Approval SLAs are tracked — overdue approvals are flagged in the queue"
    - "First 25 project cases have complete metadata with correct department assignments"
  artifacts:
    - path: "apps/web/p2p-platform/backend/change_management.py"
      provides: "ApprovalChainRule, ApprovalStep, ApprovalDelegation models, multi-level approval logic, delegation, SLAs"
      contains: "class ApprovalChainRule"
    - path: "apps/web/p2p-platform/backend/project_tracker.py"
      provides: "DepartmentRequiredField model for department-specific CR fields"
      contains: "class DepartmentRequiredField"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestForm.tsx"
      provides: "Department-specific required fields rendered dynamically"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/changeManagement/ApprovalQueue.tsx"
      provides: "Multi-step approval progress, SLA indicators, delegation badge"
    - path: "apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx"
      provides: "Approval chain progress visualization, step-by-step approval actions"
  key_links:
    - from: "RequestForm.tsx"
      to: "/api/admin/departments/{id}/required-fields"
      via: "fetch on department change"
      pattern: "required-fields"
    - from: "change_management.py submit"
      to: "ApprovalChainRule"
      via: "auto-generate approval steps from chain rules on submit"
      pattern: "generate_approval_steps"
    - from: "ApprovalQueue.tsx"
      to: "/api/admin/change-requests/"
      via: "fetch Under Review CRs with approval step data"
      pattern: "approval_steps"
---

<objective>
Build enterprise-grade approval routing for the change management system: multi-level approval chains per department, approval delegation, department-specific required fields, and SLA tracking. Also audit (read-only) the first 25 project tracker cases to document metadata completeness.

Purpose: Transform the single-approve system into a real enterprise approval workflow (think ServiceNow/Jira approval chains) where Engineering CRs need engineering lead sign-off, Critical CRs need additional CTO/VP review, and departments can define their own required fields.

Output: Backend models + APIs for approval chains, delegation, SLAs. Frontend UI for multi-step approval, department-specific CR form fields, SLA indicators.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/project_tracker.py
@apps/web/p2p-platform/backend/change_management.py
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/Main.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestForm.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/ApprovalQueue.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add DepartmentRequiredField model, CRUD endpoints, and seed data to project_tracker.py</name>
  <files>
    apps/web/p2p-platform/backend/project_tracker.py
  </files>
  <action>
**Add DepartmentRequiredField model to project_tracker.py.**

Add a new model `DepartmentRequiredField`:
```python
class DepartmentRequiredField(Base):
    __tablename__ = "department_required_fields"
    id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)  # e.g., "branch_name", "runbook_url", "rollback_plan", "test_plan"
    field_label = Column(String(200), nullable=False)  # e.g., "Branch Name", "Runbook URL"
    field_type = Column(String(50), nullable=False, default="text")  # text, textarea, url, select
    is_required = Column(Boolean, nullable=False, default=True)
    options_json = Column(Text, nullable=True)  # JSON array for select type
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    department = relationship("Department")
```

Add a relationship on Department: `required_fields = relationship("DepartmentRequiredField", ...)`.

Add CRUD endpoints:
- `GET /api/admin/departments/{dept_id}/required-fields` — list fields for a department
- `POST /api/admin/departments/{dept_id}/required-fields` — create a required field
- `DELETE /api/admin/departments/{dept_id}/required-fields/{field_id}` — delete a required field

Add a seed function `seed_default_required_fields(db)` that creates default fields if none exist:
- Engineering: "branch_name" (text, required), "test_plan" (textarea, required), "rollback_plan" (textarea, optional)
- DevOps/Infrastructure: "runbook_url" (url, required), "affected_services" (text, required)
- Security: "vulnerability_id" (text, optional), "cvss_score" (text, optional)
- QA: "test_coverage_impact" (textarea, optional)

Wire seed function to run on startup (same pattern as existing seed logic -- check if rows exist first, skip if already seeded).
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/backend && python -c "from project_tracker import DepartmentRequiredField; print('Model OK')"`
    2. Start backend locally, obtain admin token, then:
       - `curl localhost:8080/api/admin/departments/1/required-fields` returns seeded fields for Engineering
  </verify>
  <done>
    - DepartmentRequiredField model exists with CRUD endpoints
    - Default required fields seeded for Engineering, DevOps, Security, QA departments
  </done>
</task>

<task type="auto">
  <name>Task 2: Add ApprovalChainRule, ApprovalStep, ApprovalDelegation models and CRUD endpoints to change_management.py</name>
  <files>
    apps/web/p2p-platform/backend/change_management.py
  </files>
  <action>
**Add 3 new models to change_management.py.**

`ApprovalChainRule` defines WHO must approve for a given department/priority combo:
```python
class ApprovalChainRule(Base):
    __tablename__ = "approval_chain_rules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(String(20), nullable=True)  # NULL = all priorities, "Critical" = only Critical CRs
    step_order = Column(Integer, nullable=False, default=1)
    approver_role = Column(String(50), nullable=False)  # "dept_lead", "cto", "vp_engineering", "security_lead"
    approver_email = Column(String(200), nullable=True)  # specific email, or NULL for role-based lookup
    sla_hours = Column(Integer, nullable=False, default=24)
    created_at = Column(DateTime, default=datetime.utcnow)
    department = relationship("Department")
```

`ApprovalStep` tracks actual approval progress per CR:
```python
class ApprovalStep(Base):
    __tablename__ = "approval_steps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    change_request_id = Column(Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    approver_role = Column(String(50), nullable=False)
    approver_email = Column(String(200), nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending/approved/rejected/skipped
    decided_by = Column(String(200), nullable=True)  # actual person (could be delegate)
    decided_at = Column(DateTime, nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    change_request = relationship("ChangeRequest")
```

`ApprovalDelegation` for OOO delegation:
```python
class ApprovalDelegation(Base):
    __tablename__ = "approval_delegations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    delegator_email = Column(String(200), nullable=False, index=True)
    delegate_email = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    active_from = Column(DateTime, nullable=False)
    active_until = Column(DateTime, nullable=False)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Add CRUD API endpoints (models and read/write only — no submit/approve modification yet):**

- `GET /api/admin/approval-chain-rules?department_id=X` — list rules for a department
- `POST /api/admin/approval-chain-rules` — create rule
- `PUT /api/admin/approval-chain-rules/{id}` — update rule
- `DELETE /api/admin/approval-chain-rules/{id}` — delete rule
- `GET /api/admin/approval-delegations` — list active delegations
- `POST /api/admin/approval-delegations` — create delegation
- `DELETE /api/admin/approval-delegations/{id}` — delete delegation
- `GET /api/admin/change-requests/{cr_id}/approval-steps` — get approval steps for a CR

**Seed default approval chain rules** via `seed_default_approval_rules(db)`:
- Engineering: step 1 = dept_lead (24h SLA), step 2 = CTO for Critical priority (48h SLA)
- QA: step 1 = dept_lead (24h SLA)
- DevOps/Infrastructure: step 1 = dept_lead (12h SLA), step 2 = CTO for Critical (24h SLA)
- Security: step 1 = dept_lead (24h SLA), step 2 = CTO for Critical (24h SLA)
- All other depts: step 1 = dept_lead (24h SLA)

Wire seed to run on startup (check if rows exist first).
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/backend && python -c "from change_management import ApprovalChainRule, ApprovalStep, ApprovalDelegation; print('Models OK')"`
    2. Start backend locally, obtain admin token, then:
       - `curl localhost:8080/api/admin/approval-chain-rules?department_id=1` returns seeded rules
       - `curl localhost:8080/api/admin/approval-delegations` returns empty list
  </verify>
  <done>
    - ApprovalChainRule, ApprovalStep, ApprovalDelegation models exist and tables are created
    - All 8 CRUD endpoints for chain rules, delegations, and approval steps work
    - Default chain rules seeded for all departments
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire multi-step approval into submit/approve flow with delegation check and overdue endpoint</name>
  <files>
    apps/web/p2p-platform/backend/change_management.py
  </files>
  <action>
**Update submit endpoint to generate approval steps.**

Modify `submit_change_request`:
1. On submit, look up `ApprovalChainRule` rows matching the CR's department_id and priority (exact match OR NULL priority as fallback).
2. For each rule step, create an `ApprovalStep` record with `sla_deadline = now + sla_hours`.
3. If no chain rules exist for the department, fall back to existing single-approve behavior (create one step for dept_lead).
4. Add `custom_fields_json` Text column on `ChangeRequest` to hold department-specific field values.

**Update approve endpoint for multi-step.**

Modify `approve_change_request`:
1. Find the current pending step (lowest step_order with status="pending").
2. Check if approver is the step's approver_email OR an active delegate (query `ApprovalDelegation` where `delegator_email = step.approver_email` and `active_from <= now <= active_until`).
3. Mark step as approved, set `decided_by` and `decided_at`.
4. If more pending steps remain, keep CR in "Under Review".
5. If all steps approved, transition CR to "Approved".

**Add overdue endpoint:**

- `GET /api/admin/change-requests/overdue` — CRs with any step past SLA deadline (status=pending and sla_deadline < now)

**Update _cr_to_dict:**

Include `approval_steps` in `_cr_to_dict` response when `include_audit=True`.
  </action>
  <verify>
    1. Start backend locally, obtain admin token, then:
       - Create a CR for Engineering dept with Critical priority, submit it, verify 2 approval_steps in the response
       - Approve step 1, verify CR stays "Under Review"
       - Approve step 2, verify CR transitions to "Approved"
       - `curl localhost:8080/api/admin/change-requests/overdue` returns valid response
  </verify>
  <done>
    - Submit endpoint generates approval steps from chain rules
    - Approve endpoint handles multi-step approval (advances step, or approves CR when all steps done)
    - Delegation check works in approve flow
    - Overdue endpoint returns CRs with past-due approval steps
    - _cr_to_dict includes approval_steps when include_audit=True
  </done>
</task>

<task type="auto">
  <name>Task 4: Build frontend UI for approval chains, department-specific fields, and SLA tracking</name>
  <files>
    apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestForm.tsx
    apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx
    apps/web/p2p-platform/frontend/src/app/screens/changeManagement/ApprovalQueue.tsx
    apps/web/p2p-platform/frontend/src/app/screens/changeManagement/Main.tsx
  </files>
  <action>
**Part A: Department-specific required fields on RequestForm.tsx.**

1. Add a `department_id` selector to the CR form (currently department is auto-resolved from linked cases only -- add explicit department picker too).
2. When a department is selected (either via picker or auto-resolved from linked case), fetch `GET /api/admin/departments/{dept_id}/required-fields`.
3. Dynamically render additional form fields based on the response: text inputs, textareas, URL inputs, select dropdowns.
4. On submit, collect the custom field values into a `custom_fields` object and send as part of the CR creation payload.
5. Mark fields as required/optional per the `is_required` flag from the API.

**Part B: Multi-step approval progress on RequestDetail.tsx.**

1. When loading CR detail, the response now includes `approval_steps` array.
2. Render a horizontal step progress indicator (Ant Design `Steps` component or custom) showing each approval step:
   - Step label: approver_role (e.g., "Dept Lead", "CTO Review")
   - Step status: pending (gray), approved (green check), rejected (red X), overdue (orange warning)
   - Below each step: approver email, decided_by (if different from approver = delegate), decided_at timestamp
3. If a step is overdue (sla_deadline < now and status = pending), show an orange "OVERDUE" badge.
4. The Approve button should only be visible if the currently logged-in user's email matches the current pending step's approver_email OR they are a delegate.
5. Show custom_fields in the info grid if they exist (parse from custom_fields_json).
6. Add a "Set Delegate" button that opens a modal to create an ApprovalDelegation (POST /api/admin/approval-delegations).

**Part C: Enhanced ApprovalQueue.tsx.**

1. For each CR in the queue, show: current pending step info (step N of M), SLA status ("Due in 4h" green, "Due in 1h" orange, "OVERDUE by 2h" red), delegate badge if applicable.
2. Sort queue by: overdue first, then by SLA deadline ascending.
3. Add filter toggle: "My Approvals" (only CRs where current user is approver/delegate for pending step).

**Part D: Approval Rules tab on Main.tsx.**

1. Add a new tab "Approval Rules" to the change management tabs (after Audit Log).
2. Render: department selector, table of approval chain rules (step_order, approver_role, approver_email, priority filter, sla_hours), Add/Edit/Delete for rules.
3. Separate section for active approval delegations with CRUD.

Use Ant Design components (Table, Modal, Form, Steps, Tag, Badge) consistent with existing UI patterns.
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/frontend && npx tsc --noEmit 2>&1 | tail -20` -- no TypeScript errors
    2. `cd apps/web/p2p-platform/frontend && npm run build 2>&1 | tail -10` -- builds successfully
  </verify>
  <done>
    - RequestForm renders department-specific required fields dynamically on department selection
    - RequestDetail shows multi-step approval progress with step indicators, delegate badges, SLA status
    - ApprovalQueue sorts by urgency, shows SLA countdown, supports "My Approvals" filter
    - Approval Rules tab allows CRUD of chain rules and delegations per department
    - All UI compiles without TypeScript errors and builds successfully
  </done>
</task>

<task type="auto">
  <name>Task 5: E2E verification and read-only audit of first 25 project cases</name>
  <files>
    apps/web/p2p-platform/backend/change_management.py
  </files>
  <action>
**E2E verification of the complete approval routing system.**

Start the backend locally and test via curl:

1. **Auth**: Obtain admin token via `curl -X POST localhost:8080/api/admin/login -H "Content-Type: application/json" -d '{"email":"support@dollor.ai","password":"AdminTest123"}'`.

2. **Verify seeded data**: Check that approval chain rules and required fields are seeded:
   - `GET /api/admin/approval-chain-rules?department_id=1` returns Engineering rules (2 steps for Critical)
   - `GET /api/admin/departments/1/required-fields` returns branch_name, test_plan, rollback_plan

3. **Multi-step approval E2E**: Create a CR for Engineering dept with Critical priority, submit it. Verify 2 approval steps (dept_lead + cto). Approve step 1, verify CR stays "Under Review". Approve step 2, verify CR transitions to "Approved".

4. **Delegation E2E**: Create an approval delegation. Create and submit a new CR. Attempt approval as the delegate — verify it succeeds and `decided_by` shows the delegate email.

5. **SLA E2E**: Verify that approval steps have `sla_deadline` set. Hit `GET /api/admin/change-requests/overdue` — should return empty (or CRs with past-due steps if any exist).

6. **Run test suite**: `cd apps/web/p2p-platform/backend && pytest tests/ -v --tb=short` — all tests pass, no regressions.

**Read-only audit of first 25 project cases.**

Query the first 25 cases from the LOCAL backend (do NOT hit production). Use `curl http://localhost:8080/api/admin/project-cases?page=1&page_size=25` with the admin auth token. Log findings (which cases have empty department_id, reason, impact_analysis) to a markdown table in the SUMMARY. Do NOT mutate any data — this is a read-only audit to inform future cleanup.

If any test failures are found, fix them in change_management.py before marking done.
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/backend && pytest tests/ -v --tb=short 2>&1 | tail -30` -- all tests pass
    2. Multi-step approval flow completes successfully (2-step chain for Engineering Critical)
    3. Delegation approval succeeds with correct decided_by
    4. SLA deadlines present on all approval steps
    5. First 25 project cases queried and findings documented
  </verify>
  <done>
    - Multi-step approval E2E verified: 2-step chain creates 2 steps, sequential approval works
    - Delegation E2E verified: delegate can approve, decided_by recorded correctly
    - SLA deadlines set on all approval steps, overdue endpoint works
    - All backend tests pass with zero regressions
    - First 25 project cases audited (read-only) with findings documented in SUMMARY
  </done>
</task>

</tasks>

<verification>
1. Backend starts without errors: `cd apps/web/p2p-platform/backend && python -c "from change_management import *; from project_tracker import *; print('All imports OK')"`
2. Frontend builds: `cd apps/web/p2p-platform/frontend && npm run build`
3. All backend tests pass: `cd apps/web/p2p-platform/backend && pytest tests/ -v --tb=short`
4. E2E approval flow: Create CR for Engineering Critical -> submit -> 2 approval steps generated -> approve step 1 (stays Under Review) -> approve step 2 (transitions to Approved)
5. Department required fields: Select Engineering dept on CR form -> branch_name and test_plan fields appear as required
6. SLA tracking: Overdue endpoint returns CRs with past-due approval steps
</verification>

<success_criteria>
- Multi-level approval chains work per department (configurable step count, role, SLA per step)
- Approval delegation allows substitute approvers during OOO periods
- Department-specific required fields render dynamically on the CR form
- SLA tracking shows overdue approvals with visual indicators
- Approval Rules tab in admin UI allows managing chain rules and delegations
- First 25 project cases audited (read-only findings documented in SUMMARY)
- Zero test regressions
</success_criteria>

<output>
After completion, create `.planning/quick/118-enterprise-approval-routing-audit-25-cas/118-SUMMARY.md`
</output>
