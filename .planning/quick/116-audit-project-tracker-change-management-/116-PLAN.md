---
phase: quick-116
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx
  - .planning/quick/116-audit-project-tracker-change-management-/116-AUDIT-REPORT.md
autonomous: true
requirements: [AUDIT-01]

must_haves:
  truths:
    - "All project tracker UI screens are complete and functional (list, detail, department, CSV export, activity log)"
    - "All change management UI screens are complete and functional (list, create, approval queue, detail, audit log)"
    - "The change management workflow has UI buttons for ALL status transitions in the lifecycle"
    - "All frontend API calls map to existing backend endpoints with correct data shapes"
  artifacts:
    - path: ".planning/quick/116-audit-project-tracker-change-management-/116-AUDIT-REPORT.md"
      provides: "Complete audit findings with pass/fail for every screen and endpoint"
  key_links:
    - from: "RequestDetail.tsx"
      to: "/api/admin/change-requests/{cr_id}/transition"
      via: "handleTransition with status buttons"
      pattern: "handleTransition.*new_status"
---

<objective>
Audit all Project Tracker and Change Management UI screens, navigation, API calls, and workflow completeness. Fix missing transition buttons in the CR detail view and produce a comprehensive audit report.

Purpose: Verify enterprise-grade admin features are complete E2E before production use.
Output: Audit report documenting all findings + fix for missing workflow transition buttons.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/frontend/src/App.tsx
@apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
@apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/Main.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestForm.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/ApprovalQueue.tsx
@apps/web/p2p-platform/frontend/src/app/screens/changeManagement/AuditLog.tsx
@apps/web/p2p-platform/backend/change_management.py
@apps/web/p2p-platform/backend/project_tracker.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Deep audit of all screens, buttons, API alignment, and workflow completeness</name>
  <files>.planning/quick/116-audit-project-tracker-change-management-/116-AUDIT-REPORT.md</files>
  <action>
Read every frontend file for project tracker and change management. Read every backend route in project_tracker.py and change_management.py. Produce a comprehensive audit report covering:

**1. Project Tracker UI Screens (verify each exists and is functional):**
- List view with filters (status, priority, category, department, platform, search)
- Inline editing (status, priority, department, assignee)
- CSV export button -> calls GET /admin/project-cases/export
- Seed button -> calls POST /admin/project-cases/seed
- Bulk update (select rows, update field)
- Department management tab (CRUD departments, members, rules, auto-assign, dashboard)
- Activity log / stats panel

**2. Change Management UI Screens:**
- All Requests tab (list with filters: status, department, change type, search, pagination)
- New Request tab (form with title, description, change type, priority, linked cases)
- Approvals tab (queue showing "Under Review" CRs with approve/reject)
- Audit Log tab (global timeline with search, filter by action, CSV export)
- CR Detail view (info grid, PR section, deploy section, audit timeline, action buttons)

**3. Navigation:**
- Sidebar has Project Tracker link -> /admin/project-tracker
- Sidebar has Change Management link -> /admin/change-management
- App.tsx has routes for /admin/project-tracker, /admin/change-management, /admin/change-management/:crId
- CR list rows are clickable and navigate to detail view
- Detail view has "Back to Change Management" button

**4. API Endpoint Alignment (verify EVERY frontend api.get/post/put/delete maps to a backend route):**

Project Tracker frontend calls:
- GET /admin/project-cases/ (list) -> project_tracker_router.get("/")
- GET /admin/project-cases/stats -> project_tracker_router.get("/stats")
- GET /admin/project-cases/export -> project_tracker_router.get("/export")
- PUT /admin/project-cases/{case_id} -> project_tracker_router.put("/{case_id}")
- PUT /admin/project-cases/bulk-update -> project_tracker_router.put("/bulk-update")
- POST /admin/project-cases/seed -> project_tracker_router.post("/seed")
- GET /admin/departments/ -> department_router.get("/")
- POST /admin/departments/ -> department_router.post("/")
- PUT /admin/departments/{dept_id} -> department_router.put("/{dept_id}")
- DELETE /admin/departments/{id} -> department_router.delete("/{dept_id}")
- GET /admin/departments/{dept_id}/members -> department_router.get("/{dept_id}/members")
- POST /admin/departments/{dept_id}/members -> department_router.post("/{dept_id}/members")
- DELETE /admin/departments/members/{memberId} -> department_router.delete("/members/{member_id}")
- GET /admin/departments/rules -> department_router.get("/rules")
- POST /admin/departments/rules -> department_router.post("/rules")
- DELETE /admin/departments/rules/{ruleId} -> department_router.delete("/rules/{rule_id}")
- GET /admin/departments/dashboard -> department_router.get("/dashboard")
- POST /admin/departments/auto-assign -> department_router.post("/auto-assign")

Change Management frontend calls:
- GET /admin/change-requests/ (list) -> change_management_router.get("/")
- POST /admin/change-requests/ (create) -> change_management_router.post("/")
- GET /admin/change-requests/{crId} (detail) -> change_management_router.get("/{cr_id}")
- POST /admin/change-requests/{cr_id}/submit -> change_management_router.post("/{cr_id}/submit")
- POST /admin/change-requests/{cr_id}/approve -> change_management_router.post("/{cr_id}/approve")
- POST /admin/change-requests/{cr_id}/reject -> change_management_router.post("/{cr_id}/reject")
- POST /admin/change-requests/{cr_id}/transition -> change_management_router.post("/{cr_id}/transition")
- POST /admin/change-requests/{cr_id}/rollback -> change_management_router.post("/{cr_id}/rollback")
- GET /admin/change-requests/audit/export -> change_management_router.get("/audit/export")

**5. Workflow Completeness (check which transitions have UI buttons):**

Full lifecycle: Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed

Current UI buttons in RequestDetail.tsx:
- Draft: "Submit for Review" (calls /submit) -- PRESENT
- Under Review: "Approve" / "Reject" -- PRESENT
- Approved: "Start Implementation" (transitions to In Progress) -- PRESENT
- In Progress: NO BUTTONS -- MISSING transitions to "PR Created"
- PR Created: NO BUTTONS -- MISSING transitions to "CI Running"
- CI Running: NO BUTTONS -- MISSING transitions to "Staging" or back to "In Progress"
- Staging: "Deploy to Production" -- PRESENT
- Production: "Mark Verified" / "Rollback" -- PRESENT
- Verified: "Close" / "Rollback" -- PRESENT
- Rejected: NO BUTTON to resubmit as Draft -- MISSING

**6. CI/CD Trigger Analysis:**
Document whether the CI/CD pipeline is automated or manual status tracking. The backend has:
- POST /pending-execution (lists CRs ready for execution)
- GET /{cr_id}/ci-check (CI approval check)
- GET /stale (flags stuck CRs)
These are API-only -- the frontend does NOT consume them. The CI/CD integration is designed for external tools (GitHub Actions) to call, not for UI buttons to trigger. The UI buttons should allow manual status tracking (moving through the pipeline states), while automated pipelines can also call the transition endpoint.

For each item, record PASS/FAIL/WARN with details. Write results to 116-AUDIT-REPORT.md.
  </action>
  <verify>File .planning/quick/116-audit-project-tracker-change-management-/116-AUDIT-REPORT.md exists and contains findings for all 6 audit categories</verify>
  <done>Comprehensive audit report produced with clear PASS/FAIL for every screen, button, API call, and workflow step</done>
</task>

<task type="auto">
  <name>Task 2: Fix missing workflow transition buttons in CR detail view</name>
  <files>apps/web/p2p-platform/frontend/src/app/screens/changeManagement/RequestDetail.tsx</files>
  <action>
Add missing action buttons to the `renderActions()` function in RequestDetail.tsx for the following states:

1. **"In Progress" status** -- Add two buttons:
   - "Mark PR Created" button: Opens a small modal/form asking for optional PR URL and branch name, then calls `handleTransition('PR Created')` with metadata `{ pr_url, branch_name }`. For non-code CRs, also show "Deploy to Staging" button that transitions directly to "Staging" (non-code path).
   - Implementation: Check `cr.change_type` -- if it's NOT "code", show "Deploy to Staging" alongside "Mark PR Created".

2. **"PR Created" status** -- Add button:
   - "Start CI" button: Calls `handleTransition('CI Running')`. Optional: small input for CI run ID in metadata.

3. **"CI Running" status** -- Add two buttons:
   - "CI Passed - Deploy to Staging" button: Calls `handleTransition('Staging')`.
   - "CI Failed - Back to In Progress" button (danger): Calls `handleTransition('In Progress')`.

4. **"Rejected" status** -- Add button:
   - "Resubmit as Draft" button: Calls `handleTransition('Draft')` so the CR can be edited and resubmitted.

For the "In Progress -> PR Created" transition, use a simple Modal.confirm with Input fields for PR URL and branch name. Pass these as metadata in the transition payload:
```
await api.post(`/admin/change-requests/${cr.cr_id}/transition`, {
  new_status: 'PR Created',
  actor_email: getAdminEmail(),
  metadata: { pr_url: prUrl, branch_name: branchName },
});
```

Keep the existing button styling pattern (antd Button with lucide icons). Use GitBranch for PR Created, Rocket for CI/Staging, RotateCcw for CI Failed/Resubmit.

Do NOT add buttons to trigger actual GitHub Actions deploys -- the buttons are for status tracking. The actual CI/CD is triggered externally.
  </action>
  <verify>
1. Run `cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/frontend && npx tsc --noEmit` -- no TypeScript errors
2. Manually verify RequestDetail.tsx renderActions() has cases for: Draft, Under Review, Approved, In Progress, PR Created, CI Running, Staging, Production, Verified, Rejected
  </verify>
  <done>All 12 CM lifecycle statuses have appropriate action buttons in the CR detail view. Every valid transition in the state machine is reachable from the UI.</done>
</task>

</tasks>

<verification>
1. All project tracker screens verified complete (list, filters, inline edit, CSV export, seed, bulk update, departments, dashboard)
2. All change management screens verified complete (list, create, approvals, audit log, detail)
3. All 18 project tracker API calls map to existing backend routes
4. All 9 change management API calls map to existing backend routes
5. All workflow transitions have UI buttons after Task 2 fix
6. No broken links or dead navigation in sidebar or routes
7. TypeScript compiles without errors
</verification>

<success_criteria>
- 116-AUDIT-REPORT.md exists with detailed findings for all 6 audit categories
- RequestDetail.tsx has action buttons for ALL lifecycle states (In Progress, PR Created, CI Running, Rejected were missing)
- TypeScript compiles clean
- CI/CD trigger documented as external-tool-driven (not UI-triggered)
</success_criteria>

<output>
After completion, create `.planning/quick/116-audit-project-tracker-change-management-/116-SUMMARY.md`
</output>
