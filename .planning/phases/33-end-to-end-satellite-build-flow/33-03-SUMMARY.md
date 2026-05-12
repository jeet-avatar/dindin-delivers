---
phase: 33-end-to-end-satellite-build-flow
plan: 03
subsystem: turion-satellite-frontend
tags: [vanilla-html, wizard, satellite-spawn, sales-order, no-bundler]
requires:
  - "POST /api/sales-orders + POST /api/satellites backend routes (Phase 33-02)"
  - "satellite-config.js / satellite-auth.js / satellite-api.js / satellite-render.js shell (Phases 25-32)"
provides:
  - "/satellite/program-new.html — 3-step New satellite program wizard (program details → spawn → done)"
  - "'+ New satellite program' CTA on /satellite/ (nav-strip button always + hero CTA on empty constellation)"
affects:
  - "Phase 33-06 (Lambda + frontend deploy — must include ./deploy-frontend.sh so program-new.html ships to S3/CloudFront)"
  - "End-to-end walkable flow: this is the front door (start a program → land on sat.html)"
tech-stack:
  added: []
  patterns:
    - "Satellite-app page skeleton: config.js → supabase UMD → auth.js → api.js → render.js → inline IIFE; requireSession() + topbarHTML(email)"
    - "Multi-step wizard via .hidden section toggles (no router, no framework)"
    - "All API calls via window.satelliteApi.{get,post} (audit allowlist); zero bare fetch"
    - "All interactivity via addEventListener; zero inline onclick (Phase-29 audit clean)"
    - "Graceful spawn error handling: 409 dup designation → inline retry; generic failure → inline + retry; never half-navigate (server rolls back the spawn transaction)"
key-files:
  created:
    - /Users/jeet/turion-space-demo/satellite/program-new.html
  modified:
    - /Users/jeet/turion-space-demo/satellite/index.html
decisions:
  - "Satellite `name` defaults to the program name (optional 'Satellite name' field overrides) — POST /api/satellites requires `name`; reusing program_name keeps the form short."
  - "designation pre-fill: GET /api/satellites client-side, find max `SAT-(\\d+)`, suggest `SAT-00{N+1}` (zero-padded to 3); user-editable; client validates `/^SAT-\\d{3,}$/i` before submit; server still 409s on collision."
  - "Success → `sat.html?id=<newSatId>` (sat.html reads `getQueryParam('id')`) with a 3s countdown auto-redirect plus an explicit 'View the new satellite ▸' button."
  - "Index CTAs are plain `<a href=\"program-new.html\">` (no onclick, audit-safe) — nav-strip button (margin-left:auto, orange-outlined) always + hero btn-cta in the empty-constellation empty-state."
metrics:
  duration: ~25m
  completed: 2026-05-12
---

# Phase 33 Plan 03: New satellite program wizard Summary

Built the centerpiece front door: `/satellite/program-new.html`, a full-page 3-step "New satellite program" wizard following the established satellite-app page skeleton (`satellite-config.js` → supabase-js UMD → `satellite-auth.js` → `satellite-api.js` → `satellite-render.js` → inline IIFE; `requireSession()` + `topbarHTML(email)`). Step 1 collects program name, customer, satellite designation (pre-filled with the next free `SAT-00N` from `GET /api/satellites`), optional satellite name / target launch / contract value / notes, with client-side validation (≥3-char program name, ≥2-char customer, `SAT-###` designation, non-negative contract value) **before** any API call. Step 2 spawns: `POST /api/sales-orders` then `POST /api/satellites {name, designation, sales_order_id, template:'standard-bus'}`, both via `window.satelliteApi.post` — a spinner with a live status line. Step 3 shows "Program created ✓" with the seeded part-instance / BOM-line counts, a "View the new satellite ▸" button, and a 3-second countdown auto-redirect to `sat.html?id=<newSatId>`. Errors are handled inline without redirecting: a 409 on duplicate designation shows "pick another one" + highlights the field; a 400 surfaces the server message; anything else shows a generic retryable error — the user goes back to the (preserved) form and retries safely (the server rolls back the spawn transaction, so no half-created satellite). Plus a "+ New satellite program" CTA on `/satellite/`: a nav-strip button always visible + a hero `btn-cta` in the empty-constellation empty-state, both plain `<a href="program-new.html">`. Button audit: **0 violations / 66 routes / 63 satelliteApi calls** (+3 new), exit 0.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create satellite/program-new.html — the 3-step wizard | `fa22c50` (turion-space-demo) | `satellite/program-new.html` |
| 2 | Add "+ New satellite program" CTA to satellite/index.html + run frontend audit | `ab4c494` (turion-space-demo) | `satellite/index.html` |

## Verification / Proof

- `grep -n "satelliteApi.post('/api/sales-orders'" satellite/program-new.html` → present (line ~251); `grep -n "satelliteApi.post('/api/satellites'" satellite/program-new.html` → present (line ~260); `grep -n "satelliteApi.get('/api/satellites')" satellite/program-new.html` → present (designation pre-fill).
- `grep -n "onclick=" satellite/program-new.html` → empty (zero inline onclick). `grep -n "addEventListener" satellite/program-new.html` → present (form submit, back-to-form button, live field-clear listeners).
- `grep -n "program-new.html" satellite/index.html` → 2 references: nav-strip `<a id="newProgramNav">` + empty-state hero `<a class="btn-cta" id="heroNewProgram">`. `grep -n "onclick=" satellite/index.html` → only the pre-existing `onclick="location.reload()"` retry button (allowlisted built-in; unchanged).
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 66 / onclick handlers scanned: 16 / satelliteApi calls scanned: 63 / violations: 0`, exit 0. (satelliteApi count rose 60→63: the wizard's 3 new calls; all paths — `/api/satellites`, `/api/sales-orders` — resolve against `app.ts`'s mount tree since Phase 33-02 mounted the routers.)
- Page skeleton confirmed: `<head>` loads `satellite-shell.css`; script order config → supabase UMD (`cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js`) → auth → api → render → inline `<script>`; the IIFE does `await window.satelliteAuth.requireSession()` then `document.getElementById('topbar').innerHTML = r.topbarHTML(session.user.email)` and renders the breadcrumb — identical to `sat.html` / `index.html`.
- `git log --oneline -2` in `/Users/jeet/turion-space-demo` → `ab4c494 feat(33-03): add "+ New satellite program" CTA …` / `fa22c50 feat(33-03): add satellite/program-new.html …`, both authored `jeet-avatar <jm@techcloudpro.com>`.

## Deviations from Plan

None — plan executed as written. (Index CTAs are plain `<a href>` rather than `addEventListener`-wired clicks; the plan explicitly notes "an `<a href>` is fine and audit-safe" — no onclick attribute, audit clean.)

## Notes for downstream plans

- **33-06 (deploy):** must run `cd /Users/jeet/turion-space-demo && ./deploy-frontend.sh` (s3 sync + CloudFront `E37R9PT8IL44L2` invalidate `/*`) so `program-new.html` + the `index.html` change reach `turionspace.zietra.com/satellite/`. The backend routes the wizard calls also need the Lambda redeploy (`cd /Users/jeet/turion-satellite && ./build-and-push.sh`) — flagged by 33-02 too. Migration 021 is already on prod.
- The wizard's full flow is only end-to-end-walkable once both deploys land; until then `program-new.html` is committed but not live.
- Clean-URL note: the page is `program-new.html` (the CF Function `turion-clean-urls` would also serve it at `/satellite/program-new` — but all internal links use the `.html` form, matching the rest of the satellite app).

## Self-Check: PASSED

- FOUND: `/Users/jeet/turion-space-demo/satellite/program-new.html`
- FOUND: `program-new.html` x2 in `/Users/jeet/turion-space-demo/satellite/index.html`
- FOUND: commits `fa22c50`, `ab4c494` in `/Users/jeet/turion-space-demo` (`git log --oneline | grep`)
- VERIFIED: `audit-satellite-buttons.mjs` → 0 violations, exit 0; `grep` confirms the two `satelliteApi.post('/api/sales-orders' | '/api/satellites')` calls + zero inline `onclick` in `program-new.html`; page follows the satellite-app shell skeleton.
