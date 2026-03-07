---
phase: quick-120
plan: 01
subsystem: project-tracker
tags: [admin, project-tracker, sync, quick-tasks]
dependency-graph:
  requires: [project_tracker.py, STATE.md]
  provides: [seed-quick-tasks-endpoint, sync-script]
  affects: [admin-portal, project-tracker]
tech-stack:
  added: []
  patterns: [batch-seeding, keyword-classification, idempotent-sync]
key-files:
  created:
    - scripts/sync-quick-tasks-to-tracker.py
  modified:
    - apps/web/p2p-platform/backend/project_tracker.py
decisions:
  - Departments not seeded on staging/production yet -- cases created without department_id, can be assigned later via auto-assign
  - Classification uses keyword regex matching -- first match wins for category/priority
  - Batch size of 50 to avoid request timeouts
metrics:
  duration: 31m
  completed: 2026-03-07
---

# Quick Task 120: Sync All Quick Tasks into Project Tracker Summary

Seeded 63 quick tasks (QT-55 through QT-120) as Released project cases on both staging and production, with auto-classification by category, platform, and department.

## What Was Done

### Task 1: Add quick task seeder endpoint
- Added `POST /api/admin/project-cases/seed-quick-tasks` endpoint
- Accepts JSON array of quick task objects with classification data
- Creates Released ProjectCase entries with QT-{num} prefix naming
- Idempotent via full_path uniqueness (`quick-tasks/QT-{num}`)
- Graceful department lookup -- warns but continues if department not found
- Commit: `dcab7953`

### Task 2: Create sync script
- Created `scripts/sync-quick-tasks-to-tracker.py` with full STATE.md parser
- Auto-classifies each task by:
  - Category: bug-fix (21), feature (19), audit (11), deploy (9), research (2), refactor (1)
  - Platform: backend (43), cross-platform (12), android (3), ios (3), frontend (2)
  - Department: ENG (34), QA (13), OPS (9), PMO (7)
  - Priority: High (21), Medium (38), Critical (2), Low (2)
- Supports `--env staging/production` and `--dry-run` mode
- Batched API calls (50 per batch), admin login handled internally
- Commit: `2ccd124d`

### Task 3: Deploy and sync
- Deployed to staging via `gh workflow run deploy-staging.yml` (run 22804499514 -- success)
- Synced 63 tasks to staging (63 created, 0 skipped)
- Verified idempotency (re-run: 0 created, 63 skipped)
- Deployed to production via `gh workflow run deploy-dollar-ai.yml` (run 22804642981 -- success)
- Synced 63 tasks to production (63 created, 0 skipped)
- Verified on production: 63 QT- cases found (TC-2513 through TC-2575), all Released

## Deviations from Plan

### Non-deviation: Department warnings
- All 63 tasks show "department not found" warnings because departments (ENG, OPS, QA, SEC, PMO) are not yet seeded in staging/production databases
- Cases are still created successfully with department_id=NULL
- Once departments are created and auto-assign is run, the cases will be properly assigned
- This is expected behavior, not a bug

## Verification

- Production: 63 QT- cases confirmed via API search (`/api/admin/project-cases/?search=QT-`)
- Staging: 63 cases created, idempotency verified (second run creates 0)
- All cases have status=Released, version=v1.5, correct commit refs and dates

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dcab7953 | Add seed-quick-tasks endpoint to project tracker |
| 2 | 2ccd124d | Create sync script for quick tasks to project tracker |
| 3 | (deploy) | Deploy staging + production, sync 63 tasks to both |
