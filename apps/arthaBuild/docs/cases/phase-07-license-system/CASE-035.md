---
id: CASE-035
title: "CACHE_TTL_DAYS hardcoded to 7 — not configurable"
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
    lines: "28"
---

## Why This Case Was Created
Configuration hardcode audit for the license validation cache TTL. The 7-day cache TTL determines how often the system contacts the license server. When the cache is valid, the server never calls `https://license.arthaBuild.com` — it returns the cached result. If a license is revoked mid-term (e.g., payment failure), the system will continue running for up to 7 days before detecting the revocation. For stricter enforcement deployments, a shorter TTL (e.g., 1 day) is needed. For air-gapped deployments, a longer TTL (e.g., 30 days) is needed. Hardcoding 7 days prevents per-deployment tuning.

## What Is Wrong
`src/backend/routers/license.py:28`:
```python
CACHE_TTL_DAYS = 7
```

This integer literal is used in `validate_license()` at `license.py:99-107`:
```python
if data.get("valid"):
    plan = data.get("plan", "starter")
    if cached:
        cached.valid_until = now + timedelta(days=CACHE_TTL_DAYS)   # ← hardcoded
        cached.last_checked = now
        cached.plan = plan
    else:
        db.add(LicenseCache(
            license_key=LICENSE_KEY, instance_id=instance_id,
            plan=plan, valid_until=now + timedelta(days=CACHE_TTL_DAYS),   # ← hardcoded
            last_checked=now,
        ))
```

And the cache validity check at `license.py:87`:
```python
if cached and cached.valid_until and cached.valid_until > now:
    return {"valid": True, "plan": cached.plan, "mode": MODE_ACTIVE, ...}
```

The `valid_until` stored in the DB is set to `now + timedelta(days=7)`. A revoked license is not detected for up to 7 days. The gap between the `GRACE_PERIOD_HOURS` (72h) and the `CACHE_TTL_DAYS` (168h) means a deployment with a revoked license continues in MODE_ACTIVE for the full 7-day cache window — the grace period never even activates because the cache appears valid.

## Why It Was Done This Way (Root Cause)
7 days was chosen as a balance between reducing license server load (fewer network calls) and timely revocation detection. The variable name `CACHE_TTL_DAYS` correctly signals configurability intent, but like `GRACE_PERIOD_HOURS` in CASE-034, the assignment reads from a literal rather than from `os.getenv()`. This is a parallel gap to CASE-034.

## What Is Done Right
The cache mechanism itself is correct — it stores `valid_until` as an absolute timestamp in the `LicenseCache` table, which is more reliable than storing a TTL duration and computing it on read. The cache check at `license.py:87` correctly compares `cached.valid_until > now`. The `last_checked` field is stored separately from `valid_until`, which allows the grace period logic to use a different time reference.

## How To Fix It
**Step 1 — Change `src/backend/routers/license.py:28`** to read from environment:

```python
CACHE_TTL_DAYS = int(os.getenv("CACHE_TTL_DAYS", "7"))
```

This is a one-line change. The default of `7` is preserved for all existing deployments.

**Step 2 — Add bounds validation** (optional):

```python
CACHE_TTL_DAYS = int(os.getenv("CACHE_TTL_DAYS", "7"))
if CACHE_TTL_DAYS < 1 or CACHE_TTL_DAYS > 90:  # max 3 months
    logger.warning(
        f"CACHE_TTL_DAYS={CACHE_TTL_DAYS} is outside recommended range [1, 90]. "
        "Using default of 7."
    )
    CACHE_TTL_DAYS = 7
```

**Step 3 — Document the relationship between TTL and grace period in `.env.example`:**
```
# Days to cache a valid license response before re-contacting the license server (default: 7)
# Note: revoked licenses are detected after at most CACHE_TTL_DAYS days
# For strict enforcement: set to 1. For air-gapped/offline: set to 30.
# CACHE_TTL_DAYS=7
```

**Step 4 — Note for reviewers:** `CACHE_TTL_DAYS` should always be >= 1 (never 0, which would disable caching entirely and hammer the license server on every request). The lower bound validation in Step 2 enforces this.

## Architecture Mapping

**Layer:** Backend Router (license.py — validate_license function)

**Flow:**

    [validate_license() called per chatbot request]
               ↓
    [Check LicenseCache: valid_until > now?]
               ↓ yes (cache valid)
    [Return {valid: true, mode: "active", source: "cache"}]  ← No license server call
               ↓
    [Cache expires after CACHE_TTL_DAYS (7)]  ← HARDCODED HERE
               ↓
    [Next call hits license server to refresh]

**Upstream:** `validate_license()` called from startup check (rawapi.py:215) and per-request chatbot guard (rawapi.py:239-241)
**Downstream:** `LicenseCache` table (`valid_until` column), grace period logic

## Verification
- [ ] Grep proof: `grep -n "CACHE_TTL_DAYS\|timedelta(days=7\|= 7" src/backend/routers/license.py`
- [ ] Test proof: No existing test parameterizes the cache TTL — gap. After fix, test with `os.environ["CACHE_TTL_DAYS"] = "1"` to verify 1-day TTL is written to DB.
- [ ] Runtime proof: Set `CACHE_TTL_DAYS=1`, connect to license server, then inspect `LicenseCache` table — `valid_until` should be `now + 1 day`

## Downstream Impact
**Impact if unfixed:** Cosmetic / Degraded UX

No functional impact for standard deployments using the default 7-day window. The key policy implication: a license revoked at the license server is not enforced for up to 7 days. For strict SaaS enforcement, this window is too large. For BYOC operators who need finer control over license enforcement timing, the fix is necessary.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-032, CASE-033, CASE-034
