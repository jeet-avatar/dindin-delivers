---
phase: quick
plan: 172
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [QUICK-172]
must_haves:
  truths:
    - "Driver pool notifications reach drivers who are ACTIVE or APPROVED and is_online=True"
    - "Driver login response includes is_online field so iOS toggle initializes correctly"
    - "vendors/published and public/restaurants return vendor.is_online instead of hardcoded True"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "Fixed driver filter in send_driver_pool_notification and notify_drivers_new_order"
      contains: "Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED])"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "is_online in driver login response + real is_open from vendor.is_online"
      contains: "is_online"
  key_links:
    - from: "order_flow.py:257-260"
      to: "Driver model"
      via: "DB filter"
      pattern: "Driver\\.status\\.in_"
    - from: "main_new.py:2840"
      to: "driver login response dict"
      via: "is_online field"
      pattern: "\"is_online\": driver\\.is_online"
    - from: "main_new.py:10692"
      to: "vendor.is_online"
      via: "vendors/published response"
      pattern: "getattr.*is_online"
---

<objective>
Fix 3 online/offline bugs: driver pool notifications filter on wrong status column causing zero drivers notified; driver login response missing is_online so iOS toggle always initializes to false; vendors/published and public/restaurants return hardcoded is_open:True so offline restaurants appear open.

Purpose: Correct runtime behavior that prevents drivers from receiving new-order notifications and causes customers to see all restaurants as open regardless of actual status.
Output: Fixed order_flow.py (2 filter blocks) and main_new.py (login response + 2 is_open fields).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix driver pool notification filter in order_flow.py</name>
  <files>apps/web/p2p-platform/backend/order_flow.py</files>
  <action>
    Fix two identical incorrect filter blocks in order_flow.py:

    **Block 1 — send_driver_pool_notification (lines 257-260):**
    Replace:
    ```python
    Driver.status == DriverStatus.ONLINE,
    Driver.is_active == True
    ```
    With:
    ```python
    Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]),
    Driver.is_online == True
    ```

    **Block 2 — notify_drivers_new_order (lines 295-298):**
    Replace identically:
    ```python
    Driver.status == DriverStatus.ONLINE,
    Driver.is_active == True
    ```
    With:
    ```python
    Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]),
    Driver.is_online == True
    ```

    The correct pattern already used elsewhere in the codebase is at main_new.py:5126-5127 and 5259-5260.
    `DriverStatus.ONLINE` does not exist as a production status. `is_active` does not exist on Driver model.
    No other changes to these functions.
  </action>
  <verify>grep -n "DriverStatus.ONLINE\|is_active" apps/web/p2p-platform/backend/order_flow.py — should return 0 results after fix. grep -n "status.in_\|is_online" apps/web/p2p-platform/backend/order_flow.py — should show both fixed blocks.</verify>
  <done>Both filter blocks use Driver.status.in_([DriverStatus.ACTIVE, DriverStatus.APPROVED]) and Driver.is_online == True. No remaining references to DriverStatus.ONLINE or is_active in the file's driver query filters.</done>
</task>

<task type="auto">
  <name>Task 2: Add is_online to driver login response + fix hardcoded is_open in vendor endpoints</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
    **Fix 1 — Driver login response (line ~2861, after is_approved field):**
    In the return dict of the driver login endpoint (the dict starting at line 2840), add after the `"is_approved"` line:
    ```python
    "is_online": driver.is_online,
    ```

    **Fix 2 — vendors/published (line 10692):**
    Change:
    ```python
    "is_open": True,
    ```
    To:
    ```python
    "is_open": getattr(v, 'is_online', False) or False,
    ```
    (Variable name in that scope is `v` — verify by reading surrounding context at line 10692 before making change.)

    **Fix 3 — public/restaurants (line 14285):**
    Change:
    ```python
    "is_open": True  # Placeholder - implement actual hours check
    ```
    To:
    ```python
    "is_open": getattr(v, 'is_online', False) or False,
    ```
    (Verify the variable name in scope at line 14285 before applying — use the same pattern as line 17266.)

    Do NOT touch any other fields in these responses.
  </action>
  <verify>
    grep -n '"is_online": driver.is_online' apps/web/p2p-platform/backend/main_new.py — should show the login response line.
    grep -n '"is_open": True' apps/web/p2p-platform/backend/main_new.py — should return 0 results (both hardcoded Trues removed).
    grep -n 'getattr.*is_online' apps/web/p2p-platform/backend/main_new.py — should show 3 occurrences (10692, 14285, 17266).
  </verify>
  <done>Driver login response includes is_online field. Both vendors/published and public/restaurants use getattr(v, 'is_online', False) or False for is_open. No hardcoded is_open:True remains in the file.</done>
</task>

<task type="auto">
  <name>Task 3: Run backend tests and commit</name>
  <files></files>
  <action>
    Run the backend test suite to verify no regressions:
    ```bash
    cd /Users/jeet/doordash-p2p/apps/web/p2p-platform/backend
    source venv/bin/activate
    pytest tests/ -x -q 2>&1 | tail -20
    ```

    If tests pass, commit:
    ```bash
    cd /Users/jeet/doordash-p2p
    git add apps/web/p2p-platform/backend/order_flow.py apps/web/p2p-platform/backend/main_new.py
    git commit -m "fix(online-offline): correct driver notification filter, add is_online to login, fix hardcoded is_open"
    ```

    Then create the SUMMARY.md file.
  </action>
  <verify>pytest exits 0. git log --oneline -1 shows the commit.</verify>
  <done>All tests pass, changes committed. No regressions introduced.</done>
</task>

</tasks>

<verification>
- order_flow.py has no references to DriverStatus.ONLINE or is_active in driver query filters
- Driver login response at main_new.py:~2851 includes "is_online": driver.is_online
- main_new.py has zero occurrences of hardcoded "is_open": True
- pytest test suite passes with 0 failures
</verification>

<success_criteria>
Drivers with ACTIVE or APPROVED status and is_online=True receive new-order push notifications. iOS Driver app reads is_online from login response and initializes toggle state correctly. Offline restaurants (is_online=False) appear closed in customer-facing endpoints.
</success_criteria>

<output>
After completion, create `.planning/quick/172-fix-3-online-offline-bugs-driver-notific/172-SUMMARY.md` with what was changed, file:line references for each fix, and test result.
</output>
