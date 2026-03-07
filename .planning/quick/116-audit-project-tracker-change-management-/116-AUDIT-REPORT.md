# Project Tracker & Change Management Audit Report

**Date:** 2026-03-07
**Auditor:** AI Employee (Quick Task 116)
**Scope:** All UI screens, navigation, API alignment, workflow completeness

---

## 1. Project Tracker UI Screens

### 1.1 List View with Filters
**PASS** -- Main.tsx implements full list with filters:
- Status filter (Select with all statuses) -- line 243
- Priority filter -- present in params
- Category filter -- present in params
- Department filter -- present in params, fetched from `/admin/departments/`
- Platform filter -- present in params
- Search (Input with Search icon) -- present
- Pagination (antd Pagination component) -- present

### 1.2 Inline Editing
**PASS** -- Main.tsx supports inline editing:
- Status inline edit via `api.put(/admin/project-cases/${caseId})` -- line 297
- Priority inline edit -- same endpoint
- Department inline edit -- line 479 `onDeptChange`
- Assignee inline edit -- line 480 `onAssigneeChange`
- Bulk field edit via `editForm` -- line 305

### 1.3 CSV Export
**PASS** -- Export button calls `api.get('/admin/project-cases/export', { responseType: 'blob' })` -- line 282
- Backend route: `project_tracker_router.get("/export")` at project_tracker.py:1009

### 1.4 Seed Button
**PASS** -- Seed button calls `api.post('/admin/project-cases/seed')` -- line 290
- Backend route: `project_tracker_router.post("/seed")` at project_tracker.py:1162

### 1.5 Bulk Update
**PASS** -- Bulk update calls `api.put('/admin/project-cases/bulk-update', { case_ids, updates })` -- line 314
- Backend route: `project_tracker_router.put("/bulk-update")` at project_tracker.py:1053

### 1.6 Department Management Tab
**PASS** -- Full CRUD implemented in Main.tsx:
- List departments: `api.get('/admin/departments/')` -- line 526
- Create department: `api.post('/admin/departments/')` -- line 540
- Edit department: `api.put(/admin/departments/${id})` -- line 546
- Delete department: `api.delete(/admin/departments/${id})` -- line 551
- List members: `api.get(/admin/departments/${deptId}/members)` -- line 536
- Add member: `api.post(/admin/departments/${deptId}/members)` -- line 555
- Remove member: `api.delete(/admin/departments/members/${memberId})` -- line 560
- List rules: `api.get('/admin/departments/rules')` -- line 526
- Add rule: `api.post('/admin/departments/rules')` -- line 564
- Delete rule: `api.delete(/admin/departments/rules/${ruleId})` -- line 569
- Dashboard: `api.get('/admin/departments/dashboard')` -- line 737
- Auto-assign: `api.post('/admin/departments/auto-assign')` -- line 747

### 1.7 Activity Log / Stats Panel
**PASS** -- Stats fetched via `api.get('/admin/project-cases/stats')` -- line 254
- Backend route: `project_tracker_router.get("/stats")` at project_tracker.py:832

---

## 2. Change Management UI Screens

### 2.1 All Requests Tab
**PASS** -- Main.tsx tab `requests`:
- List with filters: status, department, change type, search, pagination -- lines 96-116
- Clickable rows navigate to detail view -- line 261
- Refresh button -- line 228

### 2.2 New Request Tab
**PASS** -- RequestForm.tsx:
- Title (required, max 500 chars) -- line 111-119
- Description (optional) -- line 122-123
- Change type selector (code/config/docs/infrastructure/manual) -- line 126-128
- Priority selector (Low/Medium/High/Critical) -- line 130-132
- Linked cases (multi-select, fetched from /admin/project-cases) -- line 134-149
- "Submit for Review" and "Save as Draft" buttons -- lines 153-167
- Backend: `change_management_router.post("/")` at change_management.py:407

### 2.3 Approvals Tab
**PASS** -- ApprovalQueue.tsx:
- Fetches "Under Review" CRs via `api.get('/admin/change-requests/', { params: { status: 'Under Review' } })` -- line 47
- Approve button with confirmation modal -- line 62-83
- Reject button with reason modal -- lines 86-104
- Expandable rows with description -- line 162
- Count badge -- line 122

### 2.4 Audit Log Tab
**PASS** -- AuditLog.tsx:
- Fetches all CRs then fetches detail for each (flattens audit entries) -- lines 67-111
- Search by CR ID -- line 183-189
- Search by actor email -- line 191-197
- Filter by action type -- line 199-206
- Export CSV button calls `api.get('/admin/change-requests/audit/export', { responseType: 'blob' })` -- line 120
- Timeline display with icons and colors -- lines 217-267
- Backend: `change_management_router.get("/audit/export")` at change_management.py:467

### 2.5 CR Detail View
**PASS** -- RequestDetail.tsx:
- Info grid (change type, priority, department, requested by, created, updated, approved by, linked cases) -- lines 416-460
- PR section (PR URL with external link, branch name, CI status tag) -- lines 474-488
- Deploy section (staging and production timestamps) -- lines 491-504
- Audit timeline (icons, colors, relative timestamps, metadata expandable) -- lines 510-566
- Action buttons (see Section 5 for workflow analysis) -- lines 260-385
- Rollback link when applicable -- lines 463-471

---

## 3. Navigation

### 3.1 Sidebar Links
**PASS** -- MainLayout.tsx:
- "Project Tracker" -> `/admin/project-tracker` -- line 117
- "Change Management" -> `/admin/change-management` -- line 120

### 3.2 App.tsx Routes
**PASS** -- App.tsx:
- `/admin/project-tracker` -> `<ProjectTracker />` -- line 244
- `/admin/change-management` -> `<ChangeManagement />` -- line 245
- `/admin/change-management/:crId` -> `<ChangeRequestDetail />` -- line 246

### 3.3 Row Click Navigation
**PASS** -- Main.tsx line 261: `onClick={() => navigate(/admin/change-management/${cr.cr_id})`

### 3.4 Back Button
**PASS** -- RequestDetail.tsx line 395: "Back to Change Management" button navigates to `/admin/change-management`

---

## 4. API Endpoint Alignment

### 4.1 Project Tracker Frontend -> Backend

| Frontend Call | Backend Route | Status |
|---|---|---|
| `GET /admin/project-cases/` | `project_tracker_router.get("/")` :1009 -> actually line 931 | **PASS** |
| `GET /admin/project-cases/stats` | `project_tracker_router.get("/stats")` :832 | **PASS** |
| `GET /admin/project-cases/export` | `project_tracker_router.get("/export")` :1009 | **PASS** |
| `PUT /admin/project-cases/{case_id}` | `project_tracker_router.put("/{case_id}")` :1083 | **PASS** |
| `PUT /admin/project-cases/bulk-update` | `project_tracker_router.put("/bulk-update")` :1053 | **PASS** |
| `POST /admin/project-cases/seed` | `project_tracker_router.post("/seed")` :1162 | **PASS** |
| `GET /admin/departments/` | `department_router.get("/")` :1215 | **PASS** |
| `POST /admin/departments/` | `department_router.post("/")` :1221 | **PASS** |
| `PUT /admin/departments/{dept_id}` | `department_router.put("/{dept_id}")` :1236 | **PASS** |
| `DELETE /admin/departments/{id}` | `department_router.delete("/{dept_id}")` :1256 | **PASS** |
| `GET /admin/departments/{dept_id}/members` | `department_router.get("/{dept_id}/members")` :1308 | **PASS** |
| `POST /admin/departments/{dept_id}/members` | `department_router.post("/{dept_id}/members")` :1320 | **PASS** |
| `DELETE /admin/departments/members/{memberId}` | `department_router.delete("/members/{member_id}")` :1332 | **PASS** |
| `GET /admin/departments/rules` | `department_router.get("/rules")` :1344 | **PASS** |
| `POST /admin/departments/rules` | `department_router.post("/rules")` :1360 | **PASS** |
| `DELETE /admin/departments/rules/{ruleId}` | `department_router.delete("/rules/{rule_id}")` :1395 | **PASS** |
| `GET /admin/departments/dashboard` | `department_router.get("/dashboard")` :1269 | **PASS** |
| `POST /admin/departments/auto-assign` | `department_router.post("/auto-assign")` :1407 | **PASS** |

**Result: 18/18 PASS**

### 4.2 Change Management Frontend -> Backend

| Frontend Call | Backend Route | Status |
|---|---|---|
| `GET /admin/change-requests/` | `change_management_router.get("/")` :503 | **PASS** |
| `POST /admin/change-requests/` | `change_management_router.post("/")` :407 | **PASS** |
| `GET /admin/change-requests/{crId}` | `change_management_router.get("/{cr_id}")` :559 | **PASS** |
| `POST /admin/change-requests/{cr_id}/submit` | `change_management_router.post("/{cr_id}/submit")` :609 | **PASS** |
| `POST /admin/change-requests/{cr_id}/approve` | `change_management_router.post("/{cr_id}/approve")` :663 | **PASS** |
| `POST /admin/change-requests/{cr_id}/reject` | `change_management_router.post("/{cr_id}/reject")` :694 | **PASS** |
| `POST /admin/change-requests/{cr_id}/transition` | `change_management_router.post("/{cr_id}/transition")` :727 | **PASS** |
| `POST /admin/change-requests/{cr_id}/rollback` | `change_management_router.post("/{cr_id}/rollback")` :844 | **PASS** |
| `GET /admin/change-requests/audit/export` | `change_management_router.get("/audit/export")` :467 | **PASS** |

**Result: 9/9 PASS**

### 4.3 Backend-Only Endpoints (No UI Consumer)

| Backend Route | Purpose | UI Needed? |
|---|---|---|
| `GET /admin/change-requests/pending-execution` :454 | Lists CRs ready for execution | No -- for external CI/CD tools |
| `GET /admin/change-requests/stale` :541 | Flags stuck CRs | No -- for monitoring/alerting |
| `GET /admin/change-requests/{cr_id}/audit` :816 | Per-CR audit entries | No -- detail view embeds audit_entries |
| `GET /admin/change-requests/{cr_id}/ci-check` :905 | CI approval check | No -- for GitHub Actions |
| `PUT /admin/change-requests/{cr_id}` :574 | Update CR fields | WARN -- could be useful for editing title/description |
| `PUT /admin/departments/rules/{rule_id}` :1377 | Update rule | WARN -- frontend only creates/deletes rules, no edit |

**Result: 4 correctly API-only, 2 WARN (minor -- edit capabilities exist but are not surfaced in UI)**

---

## 5. Workflow Completeness (Pre-Fix)

### Full Lifecycle
```
Draft -> Submitted -> Under Review -> Approved -> In Progress -> PR Created -> CI Running -> Staging -> Production -> Verified -> Closed
                                  \-> Rejected
```

### Status -> UI Button Mapping

| Status | Button(s) | Status |
|---|---|---|
| Draft | "Submit for Review" (calls /submit) | **PASS** |
| Submitted | (auto-transitions to Under Review) | **PASS** (by design) |
| Under Review | "Approve" / "Reject" | **PASS** |
| Approved | "Start Implementation" -> In Progress | **PASS** |
| In Progress | (none) | **FAIL -- MISSING** |
| PR Created | (none) | **FAIL -- MISSING** |
| CI Running | (none) | **FAIL -- MISSING** |
| Staging | "Deploy to Production" | **PASS** |
| Production | "Mark Verified" / "Rollback" | **PASS** |
| Verified | "Close" / "Rollback" | **PASS** |
| Closed | (none -- terminal state) | **PASS** |
| Rejected | (none) | **FAIL -- MISSING** |

### Missing Transitions (to be fixed in Task 2)

1. **In Progress** -- needs "Mark PR Created" (with optional PR URL/branch) and "Deploy to Staging" (for non-code CRs)
2. **PR Created** -- needs "Start CI" button
3. **CI Running** -- needs "CI Passed - Deploy to Staging" and "CI Failed - Back to In Progress"
4. **Rejected** -- needs "Resubmit as Draft" button

---

## 6. CI/CD Trigger Analysis

The backend exposes 3 CI/CD integration endpoints:

| Endpoint | Purpose | UI Consumer |
|---|---|---|
| `POST /admin/change-requests/pending-execution` | Lists CRs ready for CI execution | None (external tools) |
| `GET /admin/change-requests/{cr_id}/ci-check` | Checks if CI has passed | None (GitHub Actions) |
| `GET /admin/change-requests/stale` | Flags CRs stuck in a status too long | None (monitoring) |

**Assessment:** These endpoints are correctly designed for external CI/CD pipeline consumption (e.g., GitHub Actions calling `/ci-check` after a build). The UI buttons (Task 2 fix) are for **manual status tracking** -- allowing admins to move CRs through the pipeline when CI/CD is not fully automated, or to record manual deployments. This dual-track design (automated + manual) is correct.

The `transition` endpoint (change_management.py:727) validates state machine transitions and supports metadata (PR URL, branch name, CI status). Non-code CRs use `NON_CODE_TRANSITIONS` to skip PR Created and CI Running states.

---

## Summary

| Category | Items | Pass | Fail | Warn |
|---|---|---|---|---|
| 1. Project Tracker Screens | 7 | 7 | 0 | 0 |
| 2. Change Management Screens | 5 | 5 | 0 | 0 |
| 3. Navigation | 4 | 4 | 0 | 0 |
| 4. API Alignment (PT) | 18 | 18 | 0 | 0 |
| 4. API Alignment (CM) | 9 | 9 | 0 | 0 |
| 4. Backend-only endpoints | 6 | 4 | 0 | 2 |
| 5. Workflow Buttons | 12 | 8 | 4 | 0 |
| 6. CI/CD Triggers | 3 | 3 | 0 | 0 |
| **Total** | **64** | **58** | **4** | **2** |

**4 FAIL items** are all missing workflow transition buttons (In Progress, PR Created, CI Running, Rejected). These will be fixed in Task 2.

**2 WARN items** are minor: CR field editing and rule editing endpoints exist in the backend but have no UI surface. These are non-blocking.
