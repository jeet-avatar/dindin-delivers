---
id: CASE-034
title: "GRACE_PERIOD_HOURS hardcoded to 72 — not configurable"
phase: "07"
phase_name: "License System"
category: HARDCODED
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/license.py
    lines: "29"
---

## Why This Case Was Created
Configuration hardcode audit for the license grace period. The 72-hour grace period is the window during which the system continues to function when the license server is unreachable (air-gapped deployments, network outages, license server maintenance). This value is a business and operational policy decision — different enterprise customers may require different values (stricter SLAs wanting 24 hours, or more tolerant deployments wanting 168 hours for a week of offline operation). Hardcoding it as an integer literal prevents per-deployment configuration without a code change.

## What Is Wrong
`src/backend/routers/license.py:29`:
```python
GRACE_PERIOD_HOURS = 72
```

This integer literal is used in `validate_license()` at `license.py:121-125`:
```python
if cached and cached.last_checked:
    hours_elapsed = (now - cached.last_checked).total_seconds() / 3600
    if hours_elapsed < GRACE_PERIOD_HOURS:
        return {
            "valid": True, "plan": cached.plan, "mode": MODE_GRACE,
            "hours_remaining": round(GRACE_PERIOD_HOURS - hours_elapsed, 1),
            "source": "grace_period"
        }
```

The `GRACE_PERIOD_HOURS` variable is not read from any environment variable. It is a module-level constant set to `72` with no path for deployment-time configuration. An enterprise customer requiring a 24-hour strict grace period (for security compliance) or a 168-hour period (for weekly offline batch operations) cannot adjust this without modifying and redeploying the source code.

## Why It Was Done This Way (Root Cause)
72 hours was chosen as a reasonable default for the initial implementation. The variable name `GRACE_PERIOD_HOURS` suggests it was intended to be configurable, but the assignment `= 72` reads from a literal rather than from `os.getenv()`. The Phase 7 developer likely intended to add env var support but wrote the literal for the initial implementation and it was not caught in review.

## What Is Done Right
The variable is correctly named (`GRACE_PERIOD_HOURS`), correctly typed (integer), and used in the right place (the grace period check in `validate_license()`). The `hours_remaining` calculation in the response correctly computes fractional hours remaining. The grace period logic itself (using `last_checked` timestamp to compute elapsed time) is architecturally sound.

## How To Fix It
**Step 1 — Change `src/backend/routers/license.py:29`** to read from environment:

```python
GRACE_PERIOD_HOURS = int(os.getenv("GRACE_PERIOD_HOURS", "72"))
```

This is a one-line change. The default of `72` is preserved for all existing deployments that do not set the env var.

**Step 2 — Add validation for sensible bounds** (optional but recommended):

```python
GRACE_PERIOD_HOURS = int(os.getenv("GRACE_PERIOD_HOURS", "72"))
if GRACE_PERIOD_HOURS < 1 or GRACE_PERIOD_HOURS > 720:  # max 30 days
    logger.warning(
        f"GRACE_PERIOD_HOURS={GRACE_PERIOD_HOURS} is outside recommended range [1, 720]. "
        "Using default of 72."
    )
    GRACE_PERIOD_HOURS = 72
```

**Step 3 — Document in `.env.example`:**
```
# Hours the system operates without license server contact before entering restricted mode (default: 72)
# GRACE_PERIOD_HOURS=72
```

## Architecture Mapping

**Layer:** Backend Router (license.py — validate_license function)

**Flow:**

    [License server unreachable (network error)]
               ↓
    [validate_license() catches Exception]
               ↓
    [Check cached.last_checked vs now]
               ↓
    [hours_elapsed < GRACE_PERIOD_HOURS (72)]  ← HARDCODED HERE
               ↓ if true
    [Return mode="grace", hours_remaining=N]
               ↓ if false
    [Return mode="restricted", valid=False]

**Upstream:** `validate_license()` called from startup check and per-request chatbot license guard
**Downstream:** Grace period response returned to chatbot endpoint, `hours_remaining` displayed to admin UI

## Verification
- [ ] Grep proof: `grep -n "GRACE_PERIOD_HOURS\|= 72" src/backend/routers/license.py`
- [ ] Test proof: No existing test parameterizes the grace period — gap. After fix, test with `os.environ["GRACE_PERIOD_HOURS"] = "1"` to verify short grace period is respected.
- [ ] Runtime proof: Set `GRACE_PERIOD_HOURS=1` in `.env`, restart server, then simulate license server outage — system should enter restricted mode after 1 hour instead of 72

## Downstream Impact
**Impact if unfixed:** Cosmetic / Degraded UX

No functional impact for standard deployments using the default 72-hour window. Impact is confined to BYOC enterprise operators who need a different grace period for compliance or operational reasons. Without the env var, they must fork and modify source code — increasing maintenance burden and divergence from upstream.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-032, CASE-033, CASE-035
