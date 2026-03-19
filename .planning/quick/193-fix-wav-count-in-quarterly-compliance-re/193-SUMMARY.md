---
phase: quick-193
plan: 01
subsystem: backend-compliance
tags: [tnc, cpuc, accessibility, wav, compliance]
dependency_graph:
  requires: []
  provides: [wav_vehicles_available-live-count]
  affects: [tnc_compliance.py, quarterly-report-response]
tech_stack:
  added: []
  patterns: [sqlalchemy-or-filter, like-json-field-query]
key_files:
  modified:
    - apps/web/p2p-platform/backend/tnc_compliance.py
decisions:
  - Used Driver.accessibility_features.like('%"wheelchair": true%') for JSON field matching — avoids JSON_CONTAINS which requires MySQL; works on PostgreSQL TEXT column
  - Used or_ combining accessibility_capable boolean AND wheelchair JSON string match to cover both data entry paths
metrics:
  duration: "5 minutes"
  completed: "2026-03-18"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-193 Plan 01: Fix WAV Count in Quarterly Compliance Report Summary

**One-liner:** Replace hardcoded `wav_vehicles_available: 0` with live DB query counting WAV-capable drivers via `accessibility_capable` flag or wheelchair JSON field.

## What Changed

**File:** `apps/web/p2p-platform/backend/tnc_compliance.py`

| Location | Change |
|----------|--------|
| Line 26 | Added `or_` to `from sqlalchemy import` statement |
| Lines 745-751 (new) | Added `wav_drivers` count query using `or_(accessibility_capable == True, accessibility_features.like(...))`|
| Line 789 (was 781) | Replaced `0  # TODO: track WAV-capable drivers` with `wav_drivers` variable |

## Grep Proof

```
grep -n "wav_vehicles_available|wav_drivers|or_" tnc_compliance.py

26:  from sqlalchemy import and_, func, case, extract, or_
745:      wav_drivers = db.query(Driver).filter(
746:          or_(
789:          "wav_vehicles_available": wav_drivers,
```

`wav_vehicles_available` now references `wav_drivers` — not the literal `0`.

## Import / Syntax Check

```
python -m py_compile tnc_compliance.py
syntax OK
```

No syntax errors. The import check fails at DB setup (`DATABASE_URL` env var not set in dev), which is expected — not a code issue.

## Logic Coverage

The WAV query covers both data entry paths for WAV drivers:
1. `Driver.accessibility_capable == True` — the primary boolean flag (`models.py:829`)
2. `Driver.accessibility_features.like('%"wheelchair": true%')` — catches drivers who have the wheelchair feature enabled in the JSON column but whose `accessibility_capable` flag may not yet be set

## Commit

- `8e7b2100`: fix(quick-193): replace hardcoded WAV count with live DB query in quarterly compliance report

## Deviations from Plan

**1. [Rule 2 - Missing Import] Added `or_` to sqlalchemy import line**
- Found during: Task 1 (pre-edit verification)
- Issue: `or_` was required by the new query but not present in `from sqlalchemy import` line 26
- Fix: Added `or_` to the existing import statement
- Files modified: `tnc_compliance.py:26`
- Commit: `8e7b2100`

## Self-Check: PASSED

- [x] `tnc_compliance.py` modified and committed
- [x] `wav_vehicles_available` now uses `wav_drivers` (not literal `0`)
- [x] `wav_drivers` query exists with `or_` combining both detection paths
- [x] `or_` imported in sqlalchemy import line
- [x] Syntax check: `python -m py_compile` = OK
- [x] Commit `8e7b2100` exists: verified

## CR Note

ADMIN_SECRET_KEY not available in executor environment — CR ticket could not be created automatically. Log this as a manual follow-up if required for audit trail.
