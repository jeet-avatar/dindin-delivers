---
phase: 38-erp-auth-and-login
plan: 02
subsystem: erp-frontend-auth
tags: [auth, supabase, magic-link, frontend, erp]
requires:
  - turion-satellite/production/supabase-anon-key (AWS Secrets Manager — pre-existing, shared with satellite app)
  - aws cli credentials at deploy time
provides:
  - "/Users/jeet/turion-space-demo/erp-auth.js — window.erpAuth.{client,getSession,refreshSession,signInWithMagicLink,signOut,requireSession,getCurrentUser}"
  - "/Users/jeet/turion-space-demo/erp-api.js — window.erpApi.{get,post,patch,put,del,raw,ApiError} with auto Bearer header + 401-refresh-retry"
  - "/Users/jeet/turion-space-demo/erp-login.html — magic-link sign-in page (ns-shared.css styled)"
  - "/Users/jeet/turion-space-demo/erp-auth-callback.html — magic-link return target; honors ?redirect="
  - "/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh — now also emits SUPABASE_URL + SUPABASE_ANON_KEY"
affects:
  - turion-config.js generation pipeline (deploy-time): adds two new fields, all consumers (38-03) read them
tech-stack:
  added:
    - "@supabase/supabase-js@2 UMD (CDN-loaded by login + callback pages; no bundler)"
  patterns:
    - "Two-script frontend auth (auth helper + api wrapper) with shared window.TURION_CONFIG"
    - "401-refresh-retry-once-then-redirect (copied exactly from satellite-api.js; do not 'improve')"
    - "Distinct localStorage storageKey (turion-erp-auth) prevents satellite/erp session collisions in same browser"
key-files:
  created:
    - "/Users/jeet/turion-space-demo/erp-auth.js (74 lines)"
    - "/Users/jeet/turion-space-demo/erp-api.js (67 lines)"
    - "/Users/jeet/turion-space-demo/erp-login.html (105 lines)"
    - "/Users/jeet/turion-space-demo/erp-auth-callback.html (55 lines)"
  modified:
    - "/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh (34 lines, +22/-8 vs prior)"
decisions:
  - "Reuse the satellite Supabase project (SAME anon key) — no new ARN; both apps share auth"
  - "Distinct storageKey 'turion-erp-auth' (vs satellite's 'turion-satellite-auth') so sessions don't collide"
  - "Style login + callback with /ns-shared.css (the NetSuite-style ERP theme) NOT /satellite/satellite-shell.css (the satellite's dark aerospace theme), per critical context"
  - "?redirect= flows through login page → callback page → final destination, so deep-link bookmarks survive a re-auth"
  - "401-refresh-retry logic copied verbatim from satellite-api.js per research §'Pitfall 4'"
metrics:
  duration_seconds: 135
  files_created: 4
  files_modified: 1
  tasks_completed: 2
  commits: 1
  completed: "2026-05-13"
---

# Phase 38 Plan 02: ERP Frontend Auth Helpers + Magic-Link Login Summary

Cloned the satellite app's three frontend auth primitives (`satellite-auth.js`, `satellite-api.js`, `login.html`/`callback.html`) into the ERP demo's root directory under the `erp-*` namespace, and extended the deploy-time config generator so `window.TURION_CONFIG` now carries `SUPABASE_URL` + `SUPABASE_ANON_KEY` alongside `API_BASE`. Frontend primitives are in place but no existing ERP page is wired to use them yet — that's Plan 38-03.

## What Shipped

| File | Lines | Status | Purpose |
| ---- | ----- | ------ | ------- |
| `erp-auth.js` | 74 | NEW | `window.erpAuth.{getSession,refreshSession,signInWithMagicLink,signOut,requireSession,getCurrentUser}` |
| `erp-api.js` | 67 | NEW | `window.erpApi.{get,post,patch,put,del,raw}` — auto Bearer header + 401-refresh-retry-once-then-redirect |
| `erp-login.html` | 105 | NEW | Magic-link email form, styled with `ns-shared.css` to match the ERP demo theme |
| `erp-auth-callback.html` | 55 | NEW | Post-magic-link landing — calls `getSession()` then redirects to `?redirect=` (or `/`) |
| `scripts/generate-turion-config.sh` | 34 | MODIFIED | Also reads `turion-satellite/production/supabase-anon-key` and emits `SUPABASE_URL` + `SUPABASE_ANON_KEY` into `turion-config.js` |

## Diff vs Satellite Originals (Renames Only)

`erp-auth.js` vs `satellite/satellite-auth.js`:
- `SATELLITE_CONFIG` → `TURION_CONFIG`
- `window.satelliteAuth` → `window.erpAuth`
- storageKey `'turion-satellite-auth'` → `'turion-erp-auth'`
- Redirect target `/satellite/login.html` → `/erp-login.html?redirect=<here>`
- Log prefix `[satellite-auth]` → `[erp-auth]`

`erp-api.js` vs `satellite/satellite-api.js`:
- `SATELLITE_CONFIG` → `TURION_CONFIG`
- `window.satelliteAuth` → `window.erpAuth`
- `window.satelliteApi` → `window.erpApi`
- Redirect target `/satellite/login.html` → `/erp-login.html?redirect=<here>`
- Log prefix `[satellite-api]` → `[erp-api]`
- Added `put: (path, body)` method (not present on satellite — plan requires `.put()`)

`erp-login.html` differs from `satellite/login.html` in:
- Title and brand text reflect "Turion Space ERP" not "Turion Satellite"
- Stylesheet `/ns-shared.css` (light, NetSuite blue/white) replaces `/satellite/satellite-shell.css` (dark aerospace)
- Inline CSS uses `var(--ns-blue)`, `var(--ns-border)` etc. for theme parity
- Script src `/satellite/satellite-config.js` → `/turion-config.js`; `/satellite/satellite-auth.js` → `/erp-auth.js`
- `signInWithMagicLink` callback URL points at `/erp-auth-callback.html?redirect=<encoded>` (carries the `?redirect=` from the URL forward)

`erp-auth-callback.html` differs from `satellite/auth/callback.html`:
- ERP-themed spinner + card (ns-shared.css)
- Redirects to `?redirect=` target on success (or `/` fallback), not hardcoded `/satellite/`
- On error, redirects back to `/erp-login.html` (not `/satellite/login.html`)

`scripts/generate-turion-config.sh` change:
- Added `SUPABASE_URL` literal (`https://lbpkbpfwdpnwlccmlfxn.supabase.co` — same project as satellite)
- Added `aws secretsmanager get-secret-value --secret-id turion-satellite/production/supabase-anon-key` (mirrors `generate-satellite-config.sh`)
- Emits both new fields into `window.TURION_CONFIG` alongside the pre-existing `API_BASE`

## Verification

```
node --check /Users/jeet/turion-space-demo/erp-auth.js          → OK
node --check /Users/jeet/turion-space-demo/erp-api.js           → OK
bash -n      /Users/jeet/turion-space-demo/scripts/generate-turion-config.sh → OK

erp-auth.js — no leftover satellite refs (grep SATELLITE_CONFIG|satelliteAuth|satellite-auth) → NONE
erp-api.js  — no leftover satellite refs (grep SATELLITE_CONFIG|satelliteAuth|satelliteApi|satellite-auth|satellite-api) → NONE

erp-auth.js  contains: TURION_CONFIG, window.erpAuth, storageKey 'turion-erp-auth'
erp-api.js   contains: window.erpApi
generate-turion-config.sh contains: SUPABASE_URL, SUPABASE_ANON_KEY, supabase-anon-key
```

Script load order verified in both HTML pages (config → Supabase UMD → erp-auth):
```
erp-login.html:            config@73 → supabase@74 → erpauth@75
erp-auth-callback.html:    config@32 → supabase@33 → erpauth@34
```

Generator dry-run against real AWS credentials succeeded — `turion-config.js` emitted with all three keys (API_BASE, SUPABASE_URL, SUPABASE_ANON_KEY); file is `.gitignore`'d and not committed.

Local file-server smoke test (python3 http.server :8765):
```
GET /erp-login.html              → HTTP/1.0 200 OK
GET /erp-auth-callback.html      → HTTP/1.0 200 OK
GET /erp-auth.js                 → HTTP/1.0 200 OK
GET /erp-api.js                  → HTTP/1.0 200 OK
GET /turion-config.js            → HTTP/1.0 200 OK
GET /ns-shared.css               → HTTP/1.0 200 OK
```

`scripts/audit-erp-buttons.mjs` — `pages:83 routes:213 onclick:517 fetch:67 violations:0` (no regression; we added new files only, didn't change any existing pages).

## Deviations from Plan

**One scope addition (Rule 2 — missing critical functionality):** added `.put()` method to `window.erpApi`. The plan's success-criteria + must_haves list `erpApi.{get,post,patch,put,del}` (PUT included), but the source `satellite/satellite-api.js` has only `{get,post,patch,del}` — no `put`. I added a `put(path, body)` that mirrors `patch`'s shape, since the spec requires it and adding it now is cheaper than leaving 38-03 to discover it. Treated as Rule 2 (correctness — required by spec) not Rule 4 (architectural). Two lines, no behavior change to existing satellite code.

Otherwise: plan executed exactly as written.

## Authentication Gates

None — the generator's `aws secretsmanager get-secret-value` call against `turion-satellite/production/supabase-anon-key` succeeded with the local AWS credentials. (At production deploy time, the deploy pipeline carries the same credentials.)

## Out of Scope (Per Plan)

- No HTML page migration — none of the 79 existing ERP pages were modified. Plan 38-03 owns that.
- No deploy, no push to origin. Plan 38-04 owns staging + production deploy.
- No backend changes. Plan 38-01 (parallel Wave 1) owned `backend/src/*` and shipped as commit `90efba6`.

## Commit

| SHA | Message | Files |
| --- | ------- | ----- |
| `f7ad0b0` | `feat(38-02): add ERP frontend auth helpers + magic-link login page` | erp-auth.js, erp-api.js, erp-login.html, erp-auth-callback.html, scripts/generate-turion-config.sh |

Identity: `jeet-avatar <jm@techcloudpro.com>` (per CLAUDE.md MEMORY rule).
Commits ahead of `origin/main`: 2 (38-01's `90efba6` + 38-02's `f7ad0b0`).
**Not pushed** — Plan 38-04 owns push + deploy.

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/erp-auth.js` — FOUND
- File `/Users/jeet/turion-space-demo/erp-api.js` — FOUND
- File `/Users/jeet/turion-space-demo/erp-login.html` — FOUND
- File `/Users/jeet/turion-space-demo/erp-auth-callback.html` — FOUND
- File `/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh` — FOUND (modified)
- Commit `f7ad0b0` — FOUND in `turion-space-demo` git log
