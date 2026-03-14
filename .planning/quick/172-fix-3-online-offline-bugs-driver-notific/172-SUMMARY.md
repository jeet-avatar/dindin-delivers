---
phase: quick
plan: 172
subsystem: backend
tags: [driver, notifications, vendor, online-offline, bug-fix]
dependency_graph:
  requires: []
  provides: [driver-pool-notifications-fixed, driver-login-is_online, vendor-is_open-real]
  affects: [order_flow.py, main_new.py]
tech_stack:
  added: []
  patterns: [Driver.status.in_(), Driver.is_online, getattr(vendor, 'is_online', False)]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
decisions:
  - "main_new.py fixes were already present in HEAD from prior commits; only order_flow.py required the fix"
metrics:
  duration: "20 min"
  completed: "2026-03-14"
  tasks_completed: 3
  files_changed: 1
---

# Quick Task 172: Fix 3 Online/Offline Bugs Summary

**One-liner:** Fixed driver pool notification filter using non-existent DriverStatus.ONLINE and is_active fields; is_online in login response and vendor is_open fixes were already applied.

## Changes Made

### Task 1: Fixed driver pool notification filter (commit 52d8dced)

**File:** apps/web/p2p-platform/backend/order_flow.py

Two filter blocks were using incorrect fields.

**Block 1 — send_driver_pool_notification (lines 257-260):**
- Before: Driver.status == DriverStatus.ONLINE + Driver.is_active == True
- After: Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]) + Driver.is_online == True
- DriverStatus.ONLINE does not exist as a production status value
- is_active does not exist on the Driver model

**Block 2 — notify_drivers_new_order (lines 295-298):**
- Same fix applied identically

Impact: Drivers with ACTIVE or APPROVED status and is_online=True now receive new-order push notifications. Previously, zero drivers were notified because the filter matched no records.

### Task 2: Driver login response + vendor is_open (pre-existing in HEAD)

All three main_new.py fixes were already present in the committed codebase:

- "is_online": driver.is_online in driver login response at main_new.py:2923
- "is_open": getattr(v, 'is_online', False) or False in vendors/published at main_new.py:10766
- "is_open": getattr(vendor, 'is_online', False) or False in public/restaurants at main_new.py:14361

## Deviations from Plan

**Task 2 pre-applied:** All three main_new.py fixes were already in HEAD before this task ran. No changes were required for main_new.py.

**Tests timed out:** Full pytest suite needs DB connection not available locally. Syntax validation passed for both files via python -m py_compile.

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 52d8dced | fix(quick-172): correct driver pool notification filter in order_flow.py | order_flow.py |

## Self-Check: PASSED

- order_flow.py fix committed at 52d8dced
- No DriverStatus.ONLINE or is_active in driver query filters: verified via grep
- is_online in driver login response at main_new.py:2923: confirmed
- getattr(v, 'is_online', False) at main_new.py:10766 and 14361: confirmed
