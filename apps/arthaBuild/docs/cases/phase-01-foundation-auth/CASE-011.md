---
id: CASE-011
title: "Duplicate subprocess import in rawapi.py"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: DEAD_CODE
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/rawapi.py
    lines: "82, 196"
---

## Why This Case Was Created
Triggered by the DEAD_CODE audit dimension. `subprocess` is imported twice in `rawapi.py`: once at module scope as `import subprocess as _subprocess` (line 82) and once again inside an async function body as `import subprocess` (line 196). The inner import shadows the outer alias and is unnecessary — Python caches modules after first import, so the inner `import subprocess` simply re-binds the name locally. This is a code smell that indicates two developers or two phases added the same functionality independently.

## What Is Wrong
`src/backend/rawapi.py` has two separate subprocess imports:

**First import — line 82, module scope, aliased:**
```python
import subprocess as _subprocess
```
Used at lines 83–99 for the SuiteCloud CLI availability check:
```python
_sc_result = _subprocess.run(
    ["suitecloud", "--version"],
    capture_output=True,
    timeout=10,
)
```

**Second import — line 196, inside `startup_validation()` async function body:**
```python
async def startup_validation():
    """Fail fast if required configuration is missing."""
    if not os.getenv("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY is required but not set. Add it to .env")
    if not os.getenv("SMTP_HOST"):
        logger.warning("SMTP_HOST not configured — password reset emails will be disabled")
    # Run Alembic migrations on startup
    import subprocess            # ← second import, redundant
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        ...
    )
```

The module-scope alias uses `_subprocess` (with underscore prefix, indicating it is a private/internal import). The function-scope import uses the unaliased `subprocess`. They refer to the same module. The function-scope import inside `startup_validation` is redundant because `subprocess` is already imported at module scope (even under a different alias — Python's module cache means it's the same object).

## Why It Was Done This Way (Root Cause)
The Phase 2 startup code (SuiteCloud CLI check at line 82) imported subprocess as `_subprocess` following the convention of using underscore-prefixed names for startup-phase imports. When Phase 1 added `startup_validation()` (Alembic migration runner), the developer wrote `import subprocess` inside the function body following the inline-import pattern, without noticing the existing `_subprocess` alias at module scope.

## What Is Done Right
The SuiteCloud CLI check at lines 83–99 and the Alembic migration runner at lines 196–206 are both correct in terms of functionality. Only the import style is inconsistent.

## How To Fix It
Remove the inline `import subprocess` from inside `startup_validation()` at line 196, and update the `subprocess.run()` call on line 197 to use the existing `_subprocess` alias:

```python
# Before (rawapi.py:196-197)
import subprocess
result = subprocess.run(

# After
result = _subprocess.run(
```

No other changes needed.

**Step 2:** Confirm the fix does not break startup:
```bash
cd src/backend && python -c "import rawapi"
```
Expected: no import errors.

## Architecture Mapping

**Layer:** Backend Application Module (import section + startup event handler)

**Flow:**

    rawapi.py module load:
      line 82: import subprocess as _subprocess   ← first import (startup guard section)
        → used at lines 84-99 for SuiteCloud CLI check

      @app.on_event("startup") startup_validation():
        line 196: import subprocess   ← THIS CASE LIVES HERE (redundant second import)
          → used at line 197 for Alembic migration runner

**Upstream:** Python module system (no functional impact; module is cached after first import)

**Downstream:** None — both calls work correctly regardless of which name is used

## Verification
- [ ] Grep proof: `grep -n "import subprocess\|import subprocess as" src/backend/rawapi.py` → shows both line 82 and line 196
- [ ] Fix proof: after removing line 196 and updating line 197 to `_subprocess.run`, `grep -n "import subprocess" src/backend/rawapi.py` → shows only line 82
- [ ] Runtime proof: `python -c "import rawapi"` → no ImportError

## Downstream Impact
**Impact if unfixed:** Cosmetic

Python caches imported modules — the second `import subprocess` inside the function body does not cause a second module load or any performance impact. The only consequence is code confusion: a reader wonders why subprocess is being imported inside a function when it's already available at module scope.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-010 (adjacent dead code in rawapi.py)
