---
id: CASE-023
title: "CORS dev port range hardcoded (5173-5180) not in env var"
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
  - path: src/backend/rawapi.py
    lines: "113-117"
---

## Why This Case Was Created
CORS configuration hardcode audit. The backend's allowed-origins list has a dev branch that hardcodes a range of eight localhost ports (5173–5180). If a customer BYOC deployment adds a second frontend origin (e.g., an admin subdomain or a staging frontend), they must edit Python source code rather than setting an environment variable. Additionally, if Vite's default port ever changes (e.g., moves to 5174+ as default), developers will be confused about why CORS is failing.

## What Is Wrong
`src/backend/rawapi.py:113-117`:
```python
# CORS: In production, FRONTEND_BASE_URL must be set to the exact origin.
# In dev, allow all localhost ports (5173-5180) since Vite picks the first available.
_frontend_origin = os.getenv("FRONTEND_BASE_URL", "")
_dev_origins = [f"http://localhost:{p}" for p in range(5173, 5181)] + ["http://127.0.0.1:5173"]
_allowed_origins = [_frontend_origin] if _frontend_origin else _dev_origins
```

The port range `range(5173, 5181)` and the fallback `http://127.0.0.1:5173` are hardcoded integers in the application layer. When `FRONTEND_BASE_URL` is not set, the server allows 9 localhost origins (8 ports + 127.0.0.1) by default. There is no mechanism for a deployment operator to extend or replace this dev list without modifying source.

## Why It Was Done This Way (Root Cause)
Vite picks the next available port when the default (5173) is busy. During local development with multiple projects or multiple backend processes, the frontend might start on 5174, 5175, etc. The hardcoded range was added to avoid developers constantly editing `.env` when the Vite port changes. The `127.0.0.1:5173` entry was added separately to support a different network interface during testing.

## What Is Done Right
The production branch is correct — when `FRONTEND_BASE_URL` is set, only that exact origin is allowed (`[_frontend_origin]`), which is the right security posture. The comment is accurate and explains the design intent. The dev list is only active when `FRONTEND_BASE_URL` is absent, so production deployments are not affected.

## How To Fix It
**Step 1 — Add `CORS_EXTRA_ORIGINS` env var support in `rawapi.py:113-124`.**

Replace the current CORS block with:
```python
_frontend_origin = os.getenv("FRONTEND_BASE_URL", "")
_extra_origins_raw = os.getenv("CORS_EXTRA_ORIGINS", "")  # comma-separated extra origins
_extra_origins = [o.strip() for o in _extra_origins_raw.split(",") if o.strip()]

if _frontend_origin:
    _allowed_origins = [_frontend_origin] + _extra_origins
else:
    # Dev fallback: Vite picks first available port in 5173-5180
    _dev_origins = [f"http://localhost:{p}" for p in range(5173, 5181)] + ["http://127.0.0.1:5173"]
    _allowed_origins = _dev_origins + _extra_origins
```

**Step 2 — Document in `.env.example`:**
```
# Optional: comma-separated extra CORS origins (staging frontend, admin subdomain)
# CORS_EXTRA_ORIGINS=https://admin.yourdomain.com,https://staging.yourdomain.com
```

The dev port range remains for developer convenience. The new `CORS_EXTRA_ORIGINS` var allows extensibility without code changes. Production `FRONTEND_BASE_URL` continues to take priority.

## Architecture Mapping

**Layer:** Backend App Setup (FastAPI middleware)

**Flow:**

    [Browser preflight OPTIONS] → [FastAPI CORSMiddleware] → [_allowed_origins check]
                                                                        ↑
                                                            HARDCODED port range lives here
                                                            (rawapi.py:116 _dev_origins)

**Upstream:** All browser → backend API requests (every frontend component)
**Downstream:** Every CORS-restricted endpoint in the API — a misconfigured CORS policy silently blocks all requests

## Verification
- [ ] Grep proof: `grep -n "range(5173" src/backend/rawapi.py`
- [ ] Test proof: Not covered by existing tests (CORS is middleware-level, not route-level in test client)
- [ ] Runtime proof: Start backend without `FRONTEND_BASE_URL`, curl `OPTIONS http://localhost:8000/api/auth/login -H "Origin: http://localhost:5176"` — should get `Access-Control-Allow-Origin: http://localhost:5176`

## Downstream Impact
**Impact if unfixed:** Cosmetic / Degraded UX

No production security risk (prod uses `FRONTEND_BASE_URL`). In dev, the hardcoded range works for most scenarios. Risk is operational: a BYOC operator who wants to add a second legitimate origin (e.g., admin panel at port 5200) must edit Python source code. Low urgency but reduces configurability.

## Links
- Phase SUMMARY: `.planning/phases/04-frontend-integration/04-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-022
