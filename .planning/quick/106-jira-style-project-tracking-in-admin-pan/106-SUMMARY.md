---
phase: quick-106
plan: 01
subsystem: admin-panel
tags: [project-tracker, admin, testing, jira-style]
dependency_graph:
  requires: []
  provides: [project-tracker-api, project-tracker-ui]
  affects: [admin-panel]
tech_stack:
  added: []
  patterns: [inline-editing, server-side-pagination, pytest-collection-seeder]
key_files:
  created:
    - apps/web/p2p-platform/backend/project_tracker.py
    - apps/web/p2p-platform/backend/scripts/seed_project_cases.py
    - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/database.py
    - apps/web/p2p-platform/frontend/src/App.tsx
    - apps/web/p2p-platform/frontend/src/app/components/layout/MainLayout.tsx
decisions:
  - Used same Base from models.py for ProjectCase table (shared DB)
  - Admin auth handled by existing admin_auth_middleware (no extra decorators needed)
  - Seed uses subprocess pytest --collect-only for test discovery
metrics:
  duration: 228s
  completed: 2026-03-06
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 106: Jira-Style Project Tracking in Admin Panel Summary

Jira-style project tracker board treating ~1495 backend test cases as individually tracked tickets with status, priority, version, build, and release notes.

## What Was Built

### Task 1: Backend API + Seeder (commit 2527f68d)

**ProjectCase SQLAlchemy model** with 14 fields: case_id (TC-NNNN), name, full_path, category, subcategory, test_type, status, priority, version_introduced, build_number, release_notes, created_at, updated_at.

**CRUD API** at `/api/admin/project-cases`:
- `GET /` — Paginated list with filters (status, priority, category, test_type, search ILIKE)
- `GET /stats` — Aggregate counts by status, priority, category, test_type
- `PUT /{case_id}` — Update individual case fields
- `PUT /bulk-update` — Bulk status/priority changes for multiple cases
- `POST /seed` — Trigger pytest collection and seed DB

**Seeder script** at `scripts/seed_project_cases.py` — runs `pytest --collect-only -q`, parses nodeids, extracts category/subcategory/test_type, generates TC-NNNN case IDs, upserts into DB.

### Task 2: Frontend UI (commit bdeb2556)

**Project Tracker screen** at `/admin/project-tracker`:
- Stats cards: Total Cases, Open, In Progress, Verified/Released
- Filter bar: search (debounced 300ms), status, priority, category, test type dropdowns
- Paginated table with checkbox selection, expandable rows
- Inline editing: click status/priority badge to get dropdown
- Expanded rows: edit version, build number, release notes with Save button
- Bulk actions bar: set status/priority for selected rows
- "Seed from Tests" button in header

**Sidebar nav**: "Project Tracker" entry with ClipboardList icon, above Invoices.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2527f68d | Backend model, CRUD API, seeder script, router registration |
| 2 | bdeb2556 | Frontend table UI, filters, inline editing, sidebar nav, route |
