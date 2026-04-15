---
id: CASE-032
title: "SALES_EMAIL hardcoded to sales@techcloudpro.com — wrong for other deployments"
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
    lines: "26"
  - path: src/backend/rawapi.py
    lines: "242"
---

## Why This Case Was Created
Hardcoded string audit for BYOC deployability. `SALES_EMAIL` is hardcoded to `sales@techcloudpro.com` as the fallback when the `SALES_EMAIL` env var is not set. This string appears in both the API response (returned to the frontend to display in the license-expired UI) and in the chatbot error message. For TechCloudPro's own deployment this is correct. For a BYOC customer who self-hosts ArthaBuild under their own brand, this hardcoded email is incorrect and would confuse their users.

## What Is Wrong
`src/backend/routers/license.py:26`:
```python
SALES_EMAIL = os.getenv("SALES_EMAIL", "sales@techcloudpro.com")
```

This fallback is used in two places:

**`license.py:160`:**
```python
result["sales_email"] = SALES_EMAIL
```
Returns `sales@techcloudpro.com` in the `/api/license/status` response whenever `SALES_EMAIL` is not configured.

**`rawapi.py:242`:**
```python
raise HTTPException(status_code=402, detail=f"License required. Contact {license_module.SALES_EMAIL}")
```
The 402 error message shown when the license is invalid contains the hardcoded email address.

A BYOC customer who has not set `SALES_EMAIL` will have their users see "Contact sales@techcloudpro.com" in the license error — directing users to TechCloudPro rather than to the actual operator's support team.

## Why It Was Done This Way (Root Cause)
The email was hardcoded with env var support (`os.getenv("SALES_EMAIL", "...")`) — the correct pattern for configurability. The fallback was set to TechCloudPro's email because ArthaBuild was originally designed as a TechCloudPro product. BYOC deployment scenarios were an afterthought and the default fallback was never considered from a white-label perspective.

## What Is Done Right
The `os.getenv()` pattern is correct — any deployment operator can override `SALES_EMAIL` in their `.env` file or Docker environment. The email appears in only two places, both controlled by the `SALES_EMAIL` constant. No other files hardcode this email address.

## How To Fix It
**Step 1 — Change the fallback in `src/backend/routers/license.py:26`** to a generic placeholder:

```python
SALES_EMAIL = os.getenv("SALES_EMAIL", "")
```

**Step 2 — Update `license.py:160` to omit the field when empty:**

```python
if SALES_EMAIL:
    result["sales_email"] = SALES_EMAIL
```

**Step 3 — Update `rawapi.py:242` to handle empty email gracefully:**

```python
contact_msg = f"Contact {license_module.SALES_EMAIL}" if license_module.SALES_EMAIL else "Please contact your administrator"
raise HTTPException(status_code=402, detail=f"License required. {contact_msg}")
```

**Step 4 — Document in `.env.example`:**
```
# Email address shown in license-expired UI (contact your sales/admin team)
SALES_EMAIL=sales@yourdomain.com
```

**Step 5 — Add a startup warning if `SALES_EMAIL` is not set** (optional — low severity):
```python
if not os.getenv("SALES_EMAIL"):
    logger.warning("SALES_EMAIL not set — license error messages will show generic contact instructions")
```

## Architecture Mapping

**Layer:** Backend Router (license.py) + Backend App (rawapi.py)

**Flow:**

    [License check fails at startup or per-request]
               ↓
    [_lic.get("valid") == False]
               ↓
    [raise HTTPException(402, detail=f"...Contact {SALES_EMAIL}")]
                                                      ↑
                                       HARDCODED "sales@techcloudpro.com"
                                       appears in error shown to end users

**Upstream:** `POST /api/chatbot/process` (rawapi.py:242), `GET /api/license/status` response body
**Downstream:** Frontend license-expired modal, any client that reads the 402 error detail

## Verification
- [ ] Grep proof: `grep -n "sales@techcloudpro\|SALES_EMAIL" src/backend/routers/license.py src/backend/rawapi.py`
- [ ] Test proof: No test currently asserts the `sales_email` field value (gap — no test to update)
- [ ] Runtime proof: Unset `SALES_EMAIL`, then `curl http://localhost:8000/api/license/status | python3 -m json.tool` — `sales_email` should NOT contain `techcloudpro.com` after the fix

## Downstream Impact
**Impact if unfixed:** Cosmetic / Degraded UX

BYOC customers who do not set `SALES_EMAIL` will have their users directed to `sales@techcloudpro.com` in license error messages. This is a white-label branding failure, not a functional failure. No data loss, no security risk. The fix is trivial and low risk.

## Links
- Phase SUMMARY: `.planning/phases/07-license-system/07-01-PLAN.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-033, CASE-034, CASE-035
