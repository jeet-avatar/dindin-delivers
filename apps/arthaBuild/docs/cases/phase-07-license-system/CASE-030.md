---
id: CASE-030
title: "/api/license/status requires no auth — leaks license state publicly"
phase: "07"
phase_name: "License System"
category: ARCH_VIOLATION
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-debugger"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/license.py
    lines: "156-161"
---

## Why This Case Was Created
Security audit of unauthenticated endpoints. The `/api/license/status` endpoint is publicly accessible with no authentication requirement. It returns the customer's license plan tier (`starter`, `growth`, `enterprise`), expiry information, validation mode, and `sales_email`. For a BYOC customer, this endpoint is reachable from the public internet if port 8000 is exposed (or via nginx). Any visitor can determine which license tier the customer is using, whether the license is valid or in grace period, and how many days remain — business-sensitive information.

## What Is Wrong
`src/backend/routers/license.py:156-161`:
```python
@router.get("/status")
async def get_license_status(db: AsyncSession = Depends(get_db)):
    """Get current license status. Does not require user auth — checked by frontend on load."""
    result = await validate_license(db)
    result["sales_email"] = SALES_EMAIL
    return result
```

The comment "Does not require user auth — checked by frontend on load" reveals the design intent: the frontend checks license status before the user logs in (to show a license-expired screen). However, this design choice makes the endpoint unauthenticated by default.

The response includes:
```json
{
  "valid": true,
  "plan": "growth",
  "mode": "active",
  "days_remaining": 14,
  "source": "cache",
  "sales_email": "sales@techcloudpro.com"
}
```

`plan` (tier), `days_remaining`, `mode` (`grace` reveals the license server was unreachable), and `source` (`cache` vs `server`) are all internal business state that should not be world-readable.

## Why It Was Done This Way (Root Cause)
The frontend needs to show a license-expired or license-invalid screen before the user even authenticates. If the license check required auth, the user could log in with expired credentials and only then see the error. The designer chose to make the check public so the app can fail fast at the login screen with a "contact sales" message. This is a valid UX goal but the wrong implementation.

## What Is Done Right
The endpoint correctly validates the license on every call (with cache) rather than trusting a static flag. The `sales_email` field in the response gives the frontend a contact point to display without hardcoding it in the frontend bundle. The license validation logic itself (`validate_license()`) is well-structured with grace period and cache fallback.

## How To Fix It
**Option A (recommended) — Split into two endpoints:**

**Public endpoint** (no auth, minimal data):
```python
@router.get("/check")
async def get_license_check(db: AsyncSession = Depends(get_db)):
    """Public endpoint: returns only whether the license is valid, for pre-login screen."""
    result = await validate_license(db)
    return {
        "valid": result["valid"],
        "sales_email": SALES_EMAIL,
    }
```

**Authenticated endpoint** (full details):
```python
@router.get("/status")
async def get_license_status(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Authenticated: returns full license details for admin dashboard."""
    result = await validate_license(db)
    result["sales_email"] = SALES_EMAIL
    return result
```

**Option B (simpler) — Add optional auth to the existing endpoint:**

Use `HTTPBearer(auto_error=False)` and return minimal data when unauthenticated, full data when authenticated.

**Step 1 — Update `src/backend/routers/license.py:156`** with Option A above.
**Step 2 — Update the frontend** to call `/api/license/check` before login and `/api/license/status` (with auth) in the admin dashboard.

## Architecture Mapping

**Layer:** Backend Router (license.py)

**Flow:**

    [Unauthenticated browser request]
           ↓
    [GET /api/license/status] ← NO AUTH REQUIRED
           ↓
    [Returns: plan, days_remaining, mode, source, sales_email]
           ↑
    ANYONE ON THE INTERNET CAN READ THIS
    (if port 8000 or nginx proxy is public)

**Upstream:** Frontend app load (pre-login), potential external scanners
**Downstream:** `validate_license()` — reads `LicenseCache` table, optionally calls license server

## Verification
- [ ] Grep proof: `grep -n "Depends(get_db)" src/backend/routers/license.py` — confirms no auth dependency
- [ ] Test proof: `pytest src/backend/tests/ -k "license" -v` — no test currently verifies auth requirement
- [ ] Runtime proof: `curl http://localhost:8000/api/license/status` (no Authorization header) — should return full response currently; after fix, should return only `{valid, sales_email}`

## Downstream Impact
**Impact if unfixed:** Security Risk (information disclosure)

Exposes the customer's license tier, days remaining, and whether the license server is reachable to any unauthenticated caller. For competitive intelligence or sales targeting, this reveals whether a customer is on starter/growth/enterprise and whether they are in grace period (suggesting financial difficulty). Not a data breach, but a business confidentiality violation.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-031
