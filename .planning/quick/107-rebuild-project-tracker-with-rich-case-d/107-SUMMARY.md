---
phase: quick-107
plan: 01
subsystem: admin-portal
tags: [project-tracker, admin, ui, backend]
dependency_graph:
  requires: []
  provides: [rich-case-metadata, build-version-seeding]
  affects: [project_tracker.py, seed_project_cases.py, projectTracker/Main.tsx]
tech_stack:
  added: []
  patterns: [expanded-row-sections, cli-argparse, build-label-parsing]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/project_tracker.py
    - apps/web/p2p-platform/backend/scripts/seed_project_cases.py
    - apps/web/p2p-platform/frontend/src/app/screens/projectTracker/Main.tsx
decisions:
  - Used Text columns for reason/dependencies/impact_analysis to allow long-form content
  - Used String(200) for commit_ref to match typical hash/tag lengths
  - Kept build_label parsing in seed loop (formats on-the-fly per case)
metrics:
  duration: 185s
  completed: 2026-03-06T11:06:29Z
---

# Quick Task 107: Rebuild Project Tracker with Rich Case Detail Summary

Rich case metadata (reason, commit_ref, dependencies, impact_analysis) added to ProjectCase model, API, seeder, and React UI with 3-section expanded row layout.

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `99433f3f` | Add rich case metadata fields to ProjectCase model and API |
| 2 | `3cd7b417` | Fix seeder -qq flag and add build version seeding |
| 3 | `c4238ee3` | Add rich case detail UI with context, dependencies, and impact fields |

## What Changed

### Backend (project_tracker.py)
- **4 new SQLAlchemy columns**: `reason` (Text), `commit_ref` (String 200), `dependencies` (Text), `impact_analysis` (Text)
- **Pydantic schema updated**: `ProjectCaseUpdate` accepts all 4 new optional fields
- **GET /api/admin/project-cases/**: Returns all 4 new fields in item serialization
- **PUT /api/admin/project-cases/{case_id}**: Handles all 4 new fields in update logic + return dict
- **POST /api/admin/project-cases/seed**: Accepts `build_label` and `reason` query params
- **seed_project_cases()**: Now accepts `build_label` and `default_reason` params, applies them to new cases
- **pytest flag fix**: Changed from `-q --no-header` to `-qq` for clean nodeid collection

### Seeder Script (seed_project_cases.py)
- Added `argparse` with `--build` and `--reason` CLI arguments
- Build label is parsed and formatted (e.g. "iOS-Cust:1113 / iOS-Drv:215 / ...") on new cases
- When `--build` is provided, `version_introduced` is set to "1.0"

### Frontend (Main.tsx)
- **ProjectCase interface**: Added `reason`, `commit_ref`, `dependencies`, `impact_analysis` fields
- **editForm state**: Includes all 4 new fields with empty string defaults
- **toggleExpanded**: Populates all new fields from case data
- **Expanded row redesigned** with 3 sections:
  1. **Context & Lineage**: reason textarea, commit_ref input (monospace), full path display
  2. **Dependencies & Impact**: dependencies textarea, impact_analysis textarea
  3. **Release Info**: version, build number, save button, release notes
- **Lucide icons added**: `GitCommit`, `Link`, `AlertTriangle`, `FileText`
- No TypeScript compilation errors

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
