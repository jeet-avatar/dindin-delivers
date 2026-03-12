---
phase: quick-161
plan: 01
subsystem: backend-api
tags: [promotions, ios-compatibility, json-fix]
dependency_graph:
  requires: []
  provides: [ios-compatible-promotion-suggestions]
  affects: [ios-restaurant-app, promotions-endpoint]
tech_stack:
  added: []
  patterns: [dual-field-backwards-compat]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/promotions.py
    - apps/web/p2p-platform/backend/main_new.py
decisions:
  - Keep original fields (type, reason, value) alongside new iOS fields for backwards compatibility
  - Comment out public prefix instead of deleting, with explanation
metrics:
  duration: 65s
  completed: 2026-03-12T23:20:25Z
  tasks_completed: 1
  tasks_total: 1
---

# Quick Task 161: Fix Promotion Suggestions JSON Mismatch Summary

Added iOS-compatible fields (suggestion_type, description, recommended_value) to all 5 promotion suggestion dicts in promotions.py, removed dead shadowed endpoint from main_new.py, and removed the public prefix bypass since the router already uses require_any_auth.

## What Changed

### promotions.py (lines 327-410)
Each of the 5 AI-generated suggestion dicts now includes 3 additional fields alongside the originals:
- `suggestion_type` (mirrors `type`) -- e.g., "percentage", "flat_amount", "free_delivery"
- `description` (mirrors `reason`) -- same f-string or static string
- `recommended_value` (mirrors `value` as float) -- e.g., 15.0, 25.0, 5.0, 0.0, 20.0

### main_new.py
- Removed lines 21629-21691: shadowed `@app.get("/api/promotions/suggestions/{vendor_id}")` endpoint that never executed because `promotions_router` (included at line 15058) handles the same route with higher priority
- Commented out `/api/promotions/suggestions/` from `_PUBLIC_PREFIXES` since the router-level endpoint uses `require_any_auth` dependency and iOS sends auth token

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2cc46b9a | Add iOS-compatible fields, remove shadowed endpoint and public prefix |
