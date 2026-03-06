# Quick Task 113: Department & Team Management — Zero Hardcoded Values

## must_haves
- truths:
  - Department, TeamMember, AssignmentRule models in project_tracker.py — ALL config in DB, zero hardcoded
  - department_id FK + assigned_to on ProjectCase
  - Full CRUD API for departments, team members, assignment rules
  - Auto-assign engine reads rules FROM DB (not from code)
  - Admin UI: department management, team members, rule editor, delegation dashboard
  - Department filter on case list, department badge on rows
- artifacts:
  - project_tracker.py (3 new models + 20+ API endpoints)
  - Main.tsx (department tabs, delegation dashboard, rule editor)
  - scripts/seed_departments.py (initial seed — reads nothing hardcoded at runtime)
- key_links:
  - project_tracker.py:31 — ProjectCase model
  - Main.tsx:114 — ProjectTracker component

## Design: Zero Hardcoded Values

**AssignmentRule model** stores matching rules in DB:
- `department_id` FK — which department to assign to
- `match_field` — which ProjectCase field to match (category, platform, test_type, name)
- `match_pattern` — regex or exact match pattern
- `priority` — rule evaluation order (lower = first)

The auto-assign engine reads ALL rules from DB, evaluates them in priority order, assigns cases.
Admin can add/edit/delete rules via UI — no code changes needed to change assignments.

## Task 1: Backend Models + Full CRUD API
- **files**: `project_tracker.py`
- **action**:
  1. Add Department model (id, code, name, description, lead_name, lead_email, color)
  2. Add TeamMember model (id, name, email, role, department_id FK)
  3. Add AssignmentRule model (id, department_id FK, match_field, match_pattern, priority)
  4. Add department_id FK + assigned_to on ProjectCase
  5. Department API: list, create, update, delete
  6. TeamMember API: list by dept, add, remove
  7. AssignmentRule API: list, create, update, delete
  8. Auto-assign endpoint: POST /auto-assign — reads rules from DB, assigns all unassigned cases
  9. Delegation dashboard: GET /departments/dashboard — per-dept stats
  10. Update case list to support department_id filter + return dept info
  11. Update case update to accept department_id + assigned_to
- **verify**: pytest tests pass, new endpoints return 200
- **done**: All models + API endpoints working

## Task 2: Seed Script — Initial departments + rules
- **files**: `scripts/seed_departments.py`
- **action**:
  1. Create script that seeds 10 departments + assignment rules via API/DB
  2. Rules map categories/platforms to departments (stored in DB, not hardcoded at runtime)
  3. Run auto-assign to populate all 2512 cases
  4. Verify zero orphans
- **verify**: All 2512 cases assigned, zero unassigned
- **done**: Departments seeded with rules, cases assigned

## Task 3: Frontend — Department management + delegation dashboard
- **files**: `Main.tsx`
- **action**:
  1. Add tab navigation: "Cases" (existing) | "Departments" | "Dashboard"
  2. Departments tab:
     - Department cards: name, code, lead, color badge, member count, case count
     - Create/Edit department modal
     - Team members list per department (add/remove)
     - Assignment Rules section: table of rules per dept with add/edit/delete
  3. Dashboard tab:
     - Per-department workload bars (case counts by status)
     - Unassigned cases count with "Auto-Assign" button
     - Summary table: dept | total | open | in-progress | verified | lead
  4. Cases tab updates:
     - Department filter dropdown
     - Department badge column on each row
     - "Assigned To" column (inline editable)
     - Bulk "Assign to Dept" action
- **verify**: TypeScript compiles clean
- **done**: Full department management UI accessible in admin portal
