---
id: CASE-022
title: "Frontend base URL hardcoded fallback to localhost:5173 in multiple backend files"
phase: "04"
phase_name: "Frontend Integration"
category: HARDCODED
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Priya"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/routers/auth.py
    lines: "135"
  - path: src/backend/email_utils.py
    lines: "98"
---

## Why This Case Was Created
Hardcoded fallback URL audit across all backend files that reference `FRONTEND_BASE_URL`. Two separate files independently hardcode `http://localhost:5173` as a fallback. In a BYOC (bring-your-own-cloud) deployment where the customer runs ArthaBuild on their own infrastructure, if they forget to set `FRONTEND_BASE_URL`, password reset links and team invite links will silently point to `localhost:5173` instead of their production domain. Users receiving those emails will click broken links.

## What Is Wrong
Two files independently hardcode `http://localhost:5173` as the fallback value when `FRONTEND_BASE_URL` is not set.

**`src/backend/routers/auth.py:135`:**
```python
frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
reset_link = f"{frontend_base_url}/reset-password?token={raw_token}"
```

**`src/backend/email_utils.py:98`:**
```python
frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
invite_link = f"{frontend_base_url}/accept-invite?token={raw_token}"
```

Both callers independently read and fallback to localhost. If `FRONTEND_BASE_URL` is unset in production, password reset emails and team invite emails will contain `http://localhost:5173/...` links that are unreachable from the recipient's browser.

## Why It Was Done This Way (Root Cause)
The developers needed a working dev fallback so that password reset and invite flows work without a `.env` file during local development. The Phase 4 `.env.example` documents `FRONTEND_BASE_URL` but does not mark it as required. The fallback was reasonable for dev convenience but was not flagged as a production risk.

## What Is Done Right
The env var pattern itself is correct — both callers use `os.getenv("FRONTEND_BASE_URL", ...)` so the value is fully overridable. The comment in `auth.py:132-134` correctly explains the fallback intent: `# AB-004: Reset link MUST use FRONTEND_BASE_URL (React route)...`. The suppress-send pattern in `email_utils.py` means no emails fire without SMTP, providing a second implicit guard.

## How To Fix It
**Step 1 — Add startup validation in `rawapi.py`.**

In `startup_validation()` (`rawapi.py:188-206`), after the JWT_SECRET_KEY check, add:

```python
if not os.getenv("FRONTEND_BASE_URL"):
    logger.warning(
        "FRONTEND_BASE_URL is not set. "
        "Password reset and invite links will use localhost:5173 fallback. "
        "Set FRONTEND_BASE_URL=https://your-domain.com in production."
    )
```

This produces a visible warning at startup rather than silently using the wrong URL.

**Step 2 — Keep the fallback but document it in `.env.example`.**

In the project's `.env.example`, change:
```
# FRONTEND_BASE_URL=http://localhost:5173
```
to:
```
# REQUIRED in production — set to your deployed frontend URL
FRONTEND_BASE_URL=http://localhost:5173
```

No code change needed in `auth.py:135` or `email_utils.py:98` — the fallback is acceptable for dev. The fix is the startup warning and the env documentation.

## Architecture Mapping

**Layer:** Backend Router (auth) + Backend Utility (email_utils)

**Flow:**

    [User clicks "Forgot Password"] → [POST /api/auth/forgot-password] → [auth.py:135 builds reset_link]
                                                                                  ↑
                                                                      FRONTEND_BASE_URL hardcoded here
    [Admin sends team invite]        → [POST /api/admin/team/invite]  → [email_utils.py:98 builds invite_link]
                                                                                  ↑
                                                                      FRONTEND_BASE_URL hardcoded here

**Upstream:** `POST /api/auth/forgot-password` (auth.py), `POST /api/admin/team/invite` (admin.py)
**Downstream:** `send_reset_email()` in email_utils.py, `send_invite_email()` in email_utils.py

## Verification
- [ ] Grep proof: `grep -n "localhost:5173" src/backend/routers/auth.py src/backend/email_utils.py`
- [ ] Test proof: Not directly testable via pytest (email link is sent, not returned). Manual inspection required.
- [ ] Runtime proof: Unset `FRONTEND_BASE_URL`, POST `/api/auth/forgot-password`, observe `reset_link` in debug log containing `localhost:5173`

## Downstream Impact
**Impact if unfixed:** Degraded UX

In production deployments where `FRONTEND_BASE_URL` is not set, password reset emails and team invite emails will contain `http://localhost:5173/...` links. Recipients clicking those links will get a browser error. The ArthaBuild operator will receive user complaints about broken password reset. No data loss or security risk — emails simply do not function.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-023
