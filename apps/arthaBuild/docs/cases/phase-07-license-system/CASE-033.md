---
id: CASE-033
title: "LICENSE_SERVER_URL hardcoded domain in env fallback"
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
    lines: "25"
---

## Why This Case Was Created
Hardcoded domain audit for the license validation URL. `LICENSE_SERVER_URL` has a hardcoded fallback to `https://license.arthaBuild.com` — a domain controlled by TechCloudPro. In a BYOC deployment where the operator forgets to set this environment variable, license validation silently contacts `https://license.arthaBuild.com`. If that domain does not exist or the operator intends to run a self-hosted license server, validation will fail every time and the system will enter grace period, then restricted mode — all silently, with no startup error indicating the misconfiguration.

## What Is Wrong
`src/backend/routers/license.py:25`:
```python
LICENSE_SERVER_URL = os.getenv("LICENSE_SERVER_URL", "https://license.arthaBuild.com")
```

This URL is used in `_call_license_server()` at `license.py:58-63`:
```python
async def _call_license_server(license_key: str, instance_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{LICENSE_SERVER_URL}/api/validate",
            json={"license_key": license_key, "instance_id": instance_id, "version": VERSION},
        )
        return resp.json()
```

If `LICENSE_SERVER_URL` is not set and `https://license.arthaBuild.com` does not exist or is unreachable, `_call_license_server` raises an `httpx.ConnectError`, caught at `validate_license:117`:
```python
except Exception as e:
    logger.warning(f"License server unreachable: {e}")
```
The system then enters grace period or restricted mode. The operator has no indication that the URL is wrong — the logs show "License server unreachable" which is ambiguous (could be a network issue, not a misconfiguration).

## Why It Was Done This Way (Root Cause)
`https://license.arthaBuild.com` is the planned production license validation server for TechCloudPro's managed ArthaBuild offering. For TechCloudPro's own deployment, this default is correct. The BYOC scenario was not the primary design target when the default was chosen.

## What Is Done Right
The env var pattern is correct — any operator can override `LICENSE_SERVER_URL`. The `LICENSE_KEY` check at `license.py:71-72` correctly skips license server calls when `LICENSE_KEY` is not set (dev mode), so a developer without a license key is unaffected. The grace period and cache logic provide resilience when the server is temporarily unreachable.

## How To Fix It
**Step 1 — Remove the hardcoded default and require explicit configuration when `LICENSE_KEY` is set.**

In `src/backend/routers/license.py:25`, change:
```python
LICENSE_SERVER_URL = os.getenv("LICENSE_SERVER_URL", "https://license.arthaBuild.com")
```
to:
```python
LICENSE_SERVER_URL = os.getenv("LICENSE_SERVER_URL", "")
```

**Step 2 — Add a guard in `validate_license()` when a LICENSE_KEY is set but LICENSE_SERVER_URL is not:**

```python
async def validate_license(db: AsyncSession) -> dict:
    if not LICENSE_KEY:
        return {"valid": True, "plan": MODE_DEV, "mode": MODE_DEV, "reason": "no LICENSE_KEY set"}

    if not LICENSE_SERVER_URL:
        logger.error(
            "LICENSE_KEY is set but LICENSE_SERVER_URL is not configured. "
            "Set LICENSE_SERVER_URL=https://your-license-server.com in .env"
        )
        return {
            "valid": False, "plan": None, "mode": MODE_RESTRICTED,
            "reason": "LICENSE_SERVER_URL not configured"
        }
    # ... rest of function
```

**Step 3 — Document in `.env.example`:**
```
# Required when LICENSE_KEY is set — URL of the license validation server
LICENSE_SERVER_URL=https://license.arthaBuild.com
```

For TechCloudPro's managed deployment, the default can be documented but not baked in as a code fallback.

## Architecture Mapping

**Layer:** Backend Router (license.py — validation function)

**Flow:**

    [startup_license_check()] → [validate_license(db)]
                                        ↓
                              [LICENSE_KEY present?]
                                        ↓ yes
                              [LICENSE_SERVER_URL = "https://license.arthaBuild.com" (hardcoded)]
                                        ↓
                              [_call_license_server() → POST https://license.arthaBuild.com/api/validate]
                                        ↑
                              IF URL DOESN'T EXIST → silent grace period → restricted mode

**Upstream:** `startup_license_check()` (rawapi.py:209), `POST /api/chatbot/process` per-request check
**Downstream:** `_call_license_server()`, `LicenseCache` table, grace period logic

## Verification
- [ ] Grep proof: `grep -n "LICENSE_SERVER_URL\|license.arthaBuild" src/backend/routers/license.py`
- [ ] Test proof: No existing test mocks the license server URL — gap
- [ ] Runtime proof: Set `LICENSE_KEY=test` but not `LICENSE_SERVER_URL`, start server, observe startup log: "License server unreachable" (ambiguous) vs after fix: "LICENSE_SERVER_URL not configured" (clear)

## Downstream Impact
**Impact if unfixed:** Degraded UX / System Failure (for BYOC)

BYOC operators who set a `LICENSE_KEY` but forget `LICENSE_SERVER_URL` will silently enter grace period (72 hours), then restricted mode where the chatbot returns 402 errors. The system is not broken but is non-functional after grace period. The operator has no clear indication from logs that the issue is a missing URL rather than a network problem.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-032, CASE-034, CASE-035
