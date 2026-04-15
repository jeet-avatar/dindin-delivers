---
id: CASE-001
title: "Vite proxy target defaults to wrong port (8080 vs 8000)"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: HARDCODED
severity: MEDIUM
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/frontend/vite.config.ts
    lines: "16-18"
---

## Why This Case Was Created
Triggered by the HARDCODED audit dimension. During local development, any developer who runs `npm run dev` without a `.env` configured, or whose `.env` is missing the `VITE_API_URL`, will have the Vite dev server proxy all `/api` requests to `localhost:8080` instead of the backend's actual port `8000`. Every single API call silently fails with "Connection Refused" or a network error, with no obvious explanation pointing to the misconfigured port.

## What Is Wrong
`src/frontend/vite.config.ts` lines 16–18 set the Vite dev server proxy target to `localhost:8080`:

```ts
proxy: {
  '/api': {
    target: 'http://localhost:8080',  // ← WRONG: backend runs on 8000
    changeOrigin: true,
    secure: false,
  },
},
```

The backend is documented in CLAUDE.md as running on port 8000 (`uvicorn app, host="0.0.0.0", port=8000`), confirmed by `rawapi.py:352`. The frozen interface table in CLAUDE.md states "Backend port: 8000". The `src/frontend/.env` file correctly sets `VITE_API_URL=http://localhost:8000`, but the Vite proxy configuration is what routes `/api` requests during `npm run dev` — the `VITE_API_URL` env var is not used for proxying; it is the proxy target that matters. Since `api.ts` makes all calls to relative path `/api/...` (no hardcoded host), the proxy target is the only place where the backend port is resolved during development.

## Why It Was Done This Way (Root Cause)
The Vite proxy was likely configured before the backend port was finalized, or copied from a template that used 8080. When the backend port was settled at 8000 (documented in CLAUDE.md), the `vite.config.ts` proxy target was not updated to match.

## What Is Done Right
- `api.ts` correctly uses relative paths (`/api/chatbot/process`, `/api/chats`, etc.) with no hardcoded host or port — correct approach for a proxied dev setup.
- `src/frontend/.env` correctly documents `VITE_API_URL=http://localhost:8000` as the intended backend address.
- The proxy itself is the right architectural pattern; only the target port value is wrong.

## How To Fix It
Open `src/frontend/vite.config.ts` and change line 17:

```ts
// Before
target: 'http://localhost:8080',

// After
target: 'http://localhost:8000',
```

No other files need changes. After the fix, `npm run dev` will correctly proxy `/api/*` requests to the FastAPI backend on port 8000.

## Architecture Mapping

**Layer:** Frontend Service (Vite dev server proxy configuration)

**Flow:**

    Browser fetch('/api/chatbot/process')
      → Vite dev proxy (vite.config.ts:17)  ← THIS CASE LIVES HERE
        → http://localhost:8080/api/chatbot/process  (WRONG — connection refused)
        should be → http://localhost:8000/api/chatbot/process  (FastAPI rawapi.py)

**Upstream:** Any frontend component calling `fetch('/api/...')` via `src/frontend/src/services/api.ts`

**Downstream:** FastAPI backend running on port 8000 (`rawapi.py:352`)

## Verification
- [ ] Grep proof: `grep -n "8080" src/frontend/vite.config.ts`
- [ ] Fix proof: `grep -n "target" src/frontend/vite.config.ts` → should show `localhost:8000`
- [ ] Runtime proof: `npm run dev` then `curl http://localhost:5173/api/health` → should return `{"status":"ok"}`

## Downstream Impact
**Impact if unfixed:** Degraded UX

Every developer who runs `npm run dev` without noticing the misconfigured proxy will see all API calls fail with network errors. Login, chat, NetSuite auth — all broken. Only developers who happen to run the backend on port 8080 (non-standard) are unaffected.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-auth/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: None
