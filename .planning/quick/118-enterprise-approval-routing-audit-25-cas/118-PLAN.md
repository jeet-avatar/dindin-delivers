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
      provides: "ApprovalChainRule, ApprovalStep models, multi-level approval logic, delegation, SLAs"
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
Build enterprise-grade approval routing for the change management system: multi-level approval chains per department, approval delegation, department-specific required fields, and SLA tracking. Also audit and fix the first 25 project tracker cases to ensure complete metadata.

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
  <name>Task 1: Audit first 25 cases + build backend approval chain models and APIs</name>
  <files>
    apps/web/p2p-platform/backend/project_tracker.py
    apps/web/p2p-platform/backend/change_management.py
  </files>
  <action>
**Part A: Audit first 25 project cases on production.**

Query the first 25 cases from the production API (`curl https://api.dollor.ai/api/admin/project-cases?page=1&page_size=25` with admin auth header). Document what departments they belong to, whether metadata fields (reason, dependencies, impact_analysis, assigned_to, commit_ref) are populated. If any of the first 25 cases have empty/null critical fields, update them via the API or a migration script to fill reasonable values based on the case name and category. Ensure every case has a department_id assigned.

**Part B: Add DepartmentRequiredField model to project_tracker.py.**

Add a new model `DepartmentRequiredField` to `project_tracker.py`:
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
Add CRUD endpoints: `GET /api/admin/departments/{dept_id}/required-fields`, `POST`, `DELETE`.

**Part C: Add ApprovalChainRule and ApprovalStep models to change_management.py.**

`ApprovalChainRule` defines WHO must approve for a given department/priority combo:
```python
class ApprovalChainRule(Base):
    __tablename__ = "approval_chain_rules"
    id = Column(Integer, primary_key=True, autoincrement=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(String(20), nullable=True)  # NULL = all priorities, "Critical" = only Critical CRs
    step_order = Column(Integer, nullable=False, default=1)  # 1 = first approver, 2 = second, etc.
    approver_role = Column(String(50), nullable=False)  # "dept_lead", "cto", "vp_engineering", "security_lead", custom
    approver_email = Column(String(200), nullable=True)  # specific email, or NULL to use role-based lookup
    sla_hours = Column(Integer, nullable=False, default=24)  # hours before approval is overdue
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
    approver_email = Column(String(200), nullable=True)  # resolved email
    status = Column(String(20), nullable=False, default="pending")  # pending/approved/rejected/skipped
    decided_by = Column(String(200), nullable=True)  # actual person who approved (could be delegate)
    decided_at = Column(DateTime, nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    change_request = relationship("ChangeRequest")
```

Add `ApprovalDelegation` model for OOO delegation:
```python
class ApprovalDelegation(Base):
    __tablename__ = "approval_delegations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    delegator_email = Column(String(200), nullable=False, index=True)
    delegate_email = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)  # NULL = all depts
    active_from = Column(DateTime, nullable=False)
    active_until = Column(DateTime, nullable=False)
    reason = Column(String(500), nullable=True)  # e.g., "PTO", "On leave"
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Part D: Update submit endpoint to generate approval steps.**

Modify the `submit_change_request` endpoint:
1. On submit, look up `ApprovalChainRule` rows matching the CR's department_id and priority (exact match OR NULL priority as fallback).
2. For each rule step, create an `ApprovalStep` record with `sla_deadline = now + sla_hours`.
3. If no chain rules exist for the department, use the existing single-approve behavior (create one step for dept_lead).
4. Store `custom_fields_json` on `ChangeRequest` model (new Text column) to hold department-specific field values.

**Part E: Update approve endpoint for multi-step.**

Modify `approve_change_request`:
1. Find the current pending step (lowest step_order with status="pending").
2. Check if the approver is the step's approver_email OR an active delegate (query `ApprovalDelegation` where `delegator_email = step.approver_email` and `active_from <= now <= active_until`).
3. Mark step as approved, set `decided_by` and `decided_at`.
4. If more pending steps remain, keep CR in "Under Review".
5. If all steps approved, transition CR to "Approved".

**Part F: Add new API endpoints.**

- `GET /api/admin/approval-chain-rules?department_id=X` - list rules for a department
- `POST /api/admin/approval-chain-rules` - create rule
- `PUT /api/admin/approval-chain-rules/{id}` - update rule
- `DELETE /api/admin/approval-chain-rules/{id}` - delete rule
- `GET /api/admin/approval-delegations` - list active delegations
- `POST /api/admin/approval-delegations` - create delegation
- `DELETE /api/admin/approval-delegations/{id}` - delete delegation
- `GET /api/admin/change-requests/{cr_id}/approval-steps` - get approval steps for a CR
- `GET /api/admin/change-requests/overdue` - CRs with any approval step past SLA deadline

Seed default approval chain rules for existing departments:
- Engineering: step 1 = dept_lead (24h SLA), step 2 = CTO for Critical priority (48h SLA)
- QA: step 1 = dept_lead (24h SLA)
- DevOps/Infrastructure: step 1 = dept_lead (12h SLA) -- faster SLA for ops
- Security: step 1 = dept_lead (24h SLA), step 2 = CTO for Critical (24h SLA)
- All others: step 1 = dept_lead (24h SLA)

Include `approval_steps` in `_cr_to_dict` response when `include_audit=True`.
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/backend && python -c "from change_management import ApprovalChainRule, ApprovalStep, ApprovalDelegation; print('Models OK')"`
    2. `cd apps/web/p2p-platform/backend && python -c "from project_tracker import DepartmentRequiredField; print('Model OK')"`
    3. `cd apps/web/p2p-platform/backend && pytest tests/ -v -k "change_management or approval" --tb=short 2>&1 | tail -20` -- no failures
    4. Start backend locally and test:
       - `curl localhost:8080/api/admin/approval-chain-rules?department_id=1` returns rules
       - `curl localhost:8080/api/admin/approval-delegations` returns empty list
       - Create a CR, submit it, verify approval_steps are generated in the response
  </verify>
  <done>
    - DepartmentRequiredField, ApprovalChainRule, ApprovalStep, ApprovalDelegation models exist and tables are created
    - Submit endpoint generates approval steps from chain rules
    - Approve endpoint handles multi-step approval (advances step, or approves CR when all steps done)
    - Delegation check works in approve flow
    - Default chain rules seeded for all departments
    - First 25 project cases have complete metadata
    - All CRUD endpoints for chain rules, delegations, and required fields work
  </done>
</task>

<task type="auto">
  <name>Task 2: Build frontend UI for approval chains, department-specific fields, and SLA tracking</name>
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
6. Add a "Delegation" section: if the current user is the approver for a pending step, show a "Set Delegate" button that opens a modal to create an ApprovalDelegation (POST /api/admin/approval-delegations with delegator_email, delegate_email, date range, reason).

**Part C: Enhanced ApprovalQueue.tsx.**

1. Fetch approval queue with approval step data included.
2. For each CR in the queue, show:
   - Current pending step info (step N of M, approver role)
   - SLA status: "Due in 4h" (green), "Due in 1h" (orange), "OVERDUE by 2h" (red)
   - If the CR has a delegate for the current step, show "Delegated to: delegate@email" badge
3. Sort queue by: overdue first, then by SLA deadline ascending (most urgent first).
4. Add a filter toggle: "My Approvals" (only CRs where current user is approver/delegate for pending step).

**Part D: Add Approval Rules tab on Main.tsx.**

1. Add a new tab "Approval Rules" to the change management tabs array (after Audit Log).
2. Create an inline component (or section within Main.tsx) that renders:
   - Department selector at the top
   - Table of approval chain rules for selected department: step_order, approver_role, approver_email, priority filter, sla_hours
   - Add/Edit/Delete buttons for rules
   - A separate section for active approval delegations: delegator, delegate, active period, reason, delete button
   - Add Delegation button opening a modal form

Use Ant Design components (Table, Modal, Form, Steps, Tag, Badge) consistent with existing UI patterns. Follow the existing code style in these files (inline styles, lucide-react icons, api import pattern).
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/frontend && npx tsc --noEmit 2>&1 | tail -20` -- no TypeScript errors in changed files
    2. `cd apps/web/p2p-platform/frontend && npm run build 2>&1 | tail -10` -- builds successfully
    3. Manual check: Start frontend (`npm run dev`), navigate to /admin/change-management:
       - "Approval Rules" tab appears and loads department rules
       - New Request form shows department picker; selecting a department loads custom fields
       - Approval Queue shows step progress and SLA indicators
       - CR detail page shows approval chain steps with status indicators
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
  <name>Task 3: Seed default approval rules, test E2E flow, verify first 25 cases</name>
  <files>
    apps/web/p2p-platform/backend/change_management.py
    apps/web/p2p-platform/backend/project_tracker.py
  </files>
  <action>
1. Add a seed function `seed_default_approval_rules(db)` in change_management.py that creates default ApprovalChainRule entries for each department if none exist:
   - Engineering dept: [step 1: dept_lead, 24h SLA, all priorities], [step 2: approver_role="cto", 48h SLA, priority="Critical" only]
   - QA dept: [step 1: dept_lead, 24h SLA]
   - DevOps/Infrastructure dept: [step 1: dept_lead, 12h SLA], [step 2: approver_role="cto", 24h SLA, priority="Critical"]
   - Security dept: [step 1: dept_lead, 24h SLA], [step 2: approver_role="cto", 24h SLA, priority="Critical"]
   - Product dept: [step 1: dept_lead, 24h SLA]
   - All other depts: [step 1: dept_lead, 24h SLA]

2. Add seed function for `DepartmentRequiredField` entries:
   - Engineering: "branch_name" (text, required), "test_plan" (textarea, required), "rollback_plan" (textarea, optional)
   - DevOps/Infrastructure: "runbook_url" (url, required), "affected_services" (text, required)
   - Security: "vulnerability_id" (text, optional), "cvss_score" (text, optional)
   - QA: "test_coverage_impact" (textarea, optional)

3. Wire both seed functions to run on startup (same pattern as existing seed logic -- check if rows exist first, skip if already seeded).

4. Add a `/api/admin/change-requests/overdue` endpoint that returns CRs where any approval step has `sla_deadline < utcnow()` and `status = 'pending'`. Include the overdue step details and time overdue.

5. Write or update tests:
   - Test multi-step approval: create CR with department that has 2-step chain, submit, approve step 1, verify still Under Review, approve step 2, verify Approved.
   - Test delegation: create delegation, approve CR as delegate, verify decided_by shows delegate email.
   - Test SLA: create CR, verify sla_deadline is set on approval steps.
   - Test department required fields API: GET returns fields, POST creates field, DELETE removes.

6. Verify first 25 project cases have complete metadata by running a check query and logging any gaps.
  </action>
  <verify>
    1. `cd apps/web/p2p-platform/backend && pytest tests/ -v --tb=short 2>&1 | tail -30` -- all tests pass
    2. Start backend, hit `GET /api/admin/approval-chain-rules?department_id=1` -- returns seeded rules
    3. Create a test CR for Engineering dept with Critical priority, submit it, verify 2 approval steps are created (dept_lead + cto)
    4. Approve step 1, verify CR stays "Under Review"
    5. Approve step 2, verify CR transitions to "Approved"
    6. Hit `GET /api/admin/departments/1/required-fields` -- returns Engineering's required fields
    7. Query first 25 project cases -- all have department_id, reason, and impact_analysis populated
  </verify>
  <done>
    - Default approval chain rules seeded for all departments on startup
    - Default department required fields seeded for Engineering, DevOps, Security, QA
    - Multi-step approval E2E flow works: 2-step chain creates 2 steps, sequential approval transitions CR correctly
    - Delegation flow works: delegate can approve on behalf of approver
    - SLA deadlines set on approval steps, overdue endpoint returns overdue CRs
    - First 25 project cases verified to have complete metadata
    - All tests pass with no regressions
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
7. First 25 cases: All have department_id, reason, impact_analysis populated
</verification>

<success_criteria>
- Multi-level approval chains work per department (configurable step count, role, SLA per step)
- Approval delegation allows substitute approvers during OOO periods
- Department-specific required fields render dynamically on the CR form
- SLA tracking shows overdue approvals with visual indicators
- Approval Rules tab in admin UI allows managing chain rules and delegations
- First 25 project cases have complete, accurate metadata
- Zero test regressions
</success_criteria>

<output>
After completion, create `.planning/quick/118-enterprise-approval-routing-audit-25-cas/118-SUMMARY.md`
</output>
