---
phase: quick-193
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/tnc_compliance.py
autonomous: true
requirements:
  - TNC-22-WAV
must_haves:
  truths:
    - "The quarterly compliance report returns a real count of WAV-capable drivers instead of hardcoded 0"
    - "WAV count reflects drivers with accessibility_capable=True OR accessibility_features containing wheelchair=true"
  artifacts:
    - path: apps/web/p2p-platform/backend/tnc_compliance.py
      provides: "wav_vehicles_available field with live DB query"
      contains: "wav_vehicles_available"
  key_links:
    - from: tnc_compliance.py:781
      to: models.py:829
      via: "DB query on Driver.accessibility_capable"
      pattern: "accessibility_capable"
---

<objective>
Replace the hardcoded `"wav_vehicles_available": 0` in the CPUC quarterly compliance report with a live database count of WAV-capable drivers.

Purpose: CPUC quarterly reports must accurately reflect how many WAV (Wheelchair Accessible Vehicle) drivers are on the platform. A hardcoded zero is incorrect and non-compliant.
Output: `tnc_compliance.py` line 781 replaced with a real DB query.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/193-fix-wav-count-in-quarterly-compliance-re/193-PLAN.md

## Key facts
- `Driver.accessibility_capable` (Boolean, `models.py:829`) — primary field indicating WAV/accessible vehicle
- `Driver.accessibility_features` (Text/JSON, `models.py:830`) — JSON string: `{"wheelchair": false, "service_animal": false, "mobility_storage": false}`
- TODO is at `tnc_compliance.py:781`: `"wav_vehicles_available": 0  # TODO: track WAV-capable drivers`
- Driver stats block (lines 735-745) already has DB queries for context — add wav query in that block
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace hardcoded WAV count with live DB query</name>
  <files>apps/web/p2p-platform/backend/tnc_compliance.py</files>
  <action>
In the `get_quarterly_report` function, add a WAV driver count query in the "Driver stats" block (around line 735-745), immediately after the `bg_checked_drivers` query.

Add this query:

```python
# WAV-capable drivers: accessibility_capable flag OR wheelchair in accessibility_features JSON
wav_drivers = db.query(Driver).filter(
    or_(
        Driver.accessibility_capable == True,
        Driver.accessibility_features.like('%"wheelchair": true%'),
    )
).count()
```

Then on line 781, replace:
```python
"wav_vehicles_available": 0,  # TODO: track WAV-capable drivers
```
with:
```python
"wav_vehicles_available": wav_drivers,
```

Ensure `or_` is already imported from sqlalchemy (it is — used elsewhere in the file). Do NOT add a duplicate import.

Verify `or_` is imported: grep for `from sqlalchemy import` or `from sqlalchemy.orm import` at the top of the file. If `or_` is not already imported, add it to the existing sqlalchemy import line.
  </action>
  <verify>
1. `grep -n "wav_vehicles_available" apps/web/p2p-platform/backend/tnc_compliance.py` — must show `wav_drivers` not `0`
2. `grep -n "wav_drivers" apps/web/p2p-platform/backend/tnc_compliance.py` — must show both the query and the usage
3. `cd apps/web/p2p-platform/backend && python -c "import tnc_compliance; print('import OK')"` — no syntax errors
  </verify>
  <done>
`wav_vehicles_available` in the quarterly report response returns a live count from the Driver table (drivers where accessibility_capable=True or accessibility_features contains wheelchair:true). No hardcoded 0. No syntax errors on import.
  </done>
</task>

</tasks>

<verification>
- grep proof: `wav_vehicles_available` field uses `wav_drivers` variable (not literal `0`)
- import proof: `python -c "import tnc_compliance"` exits cleanly
- logic proof: query covers both `accessibility_capable` boolean AND JSON wheelchair flag
</verification>

<success_criteria>
`GET /api/tnc/cpuc/quarterly-report` returns `accessibility_metrics.wav_vehicles_available` as an integer reflecting real driver data, not hardcoded 0.
</success_criteria>

<output>
After completion, create `.planning/quick/193-fix-wav-count-in-quarterly-compliance-re/193-SUMMARY.md` with:
- What changed (file:line)
- Grep proof showing wav_drivers used
- Import check output
</output>
