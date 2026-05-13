---
phase: 38-erp-auth-and-login
plan: 03
subsystem: erp-frontend-auth
tags: [auth, supabase, frontend, erp, migration, fetch-wrapper]
requires:
  - phase: 38-02
    provides: "window.erpAuth.requireSession() + window.erpApi.{get,post,patch,put,del} helpers loaded from /erp-auth.js + /erp-api.js"
provides:
  - "Every ERP frontend fetch site (61 + 3 bonus = 64 total) routes through window.erpApi.* — only 1 raw fetch survives (index.html → /api/notify/visit, pre-auth telemetry)"
  - "81 ERP HTML pages now auth-gate themselves: load the 4 helper scripts in locked order (turion-config → Supabase UMD → erp-auth → erp-api), then call window.erpAuth.requireSession() in an inline IIFE before any data fetch"
  - "erp-login.html + erp-auth-callback.html deliberately NOT injected (they handle their own auth flow — no infinite redirect)"
affects:
  - "Plan 38-04 (deploy + audit-script update): all migrations done locally, ready to ship. The audit script's raw-fetch counter will need an erpApi.* recognition pass so live-badge / edit-modal / quickbooks etc. stop showing up as raw fetches even though they're now wrapped."
tech-stack:
  added: []
  patterns:
    - "fetch(API_BASE + path) → window.erpApi.<verb>(path) — drops mode:'cors', Content-Type, response.ok check, and .json() since erpApi handles all of that + adds Bearer auth + 401-refresh-retry"
    - "501 stub-detection moved from `resp.status === 501` to `try/catch (apiErr) { if (apiErr.status === 501) ... }` — same UX, throws ApiError with status field on non-2xx"
    - "Auth-helper injection lives ABOVE every other script tag, between </title> and the page's own scripts, so requireSession() runs before data-loader.js or any inline IIFE"
key-files:
  created: []
  modified:
    - "5 shared helper JS files: data-loader.js, data-loader-sf.js, erp-lookups.js, arena-lookups.js, ns-editable.js"
    - "2 bonus JS files (Rule 1 auto-fix): live-badge.js, shells/edit-modal.js"
    - "32 HTML files migrated (Task 2): all 7 quickbooks-* + ramp.html, 9 sales-new-*, 6 arena-new-* + arena-qms, 4 netsuite-new-* + netsuite-setup, mes-shop-floor, agent-sales-cash, index.html (visit-pixel comment)"
    - "81 HTML files injected (Task 3): every root *.html EXCEPT erp-login.html + erp-auth-callback.html"
key-decisions:
  - "Preserve index.html:528 raw fetch to /api/notify/visit with an explanatory comment — pre-auth telemetry fires from DOMContentLoaded before any session exists; gating it would redirect all visitors to /erp-login.html"
  - "Move 501 stub-detection from response.status check to ApiError.status catch — erpApi throws on any non-2xx, so the QB wizard's 'still a stub' branch becomes a typed-exception check"
  - "Auto-fix 2 additional fetch sites missed by the plan inventory (live-badge.js × 2, shells/edit-modal.js × 2) — Rule 1 Bug, they would 401 in production once auth is live"
  - "Use a Node injection script (idempotent, marker-comment guarded) instead of per-file Edit for the 81 helper-block insertions — bulk mechanical change, every page gets the identical 6-line block after </title>"
patterns-established:
  - "erpApi.* call sites: const X = await window.erpApi.get('/api/...'); — single-line replacement for the 5-line raw-fetch boilerplate"
  - "ApiError.status check pattern for tolerating expected non-2xx responses (e.g. 501 stubs)"
  - "Auth-helper injection block placed between </title> and any other script — guarantees requireSession() runs before any inline IIFE or external script that issues fetches"
requirements-completed: [ErpFetchMigration]
duration: 8 min
completed: 2026-05-13
---

# Phase 38 Plan 03: ERP Fetch Migration + Auth Guard Injection Summary

**Migrated 61 ERP frontend fetch sites (5 shared JS + 56 HTML) from raw `fetch(API_BASE + …)` to `window.erpApi.*`, auto-fixed 3 missed sites in 2 shared JS helpers (Rule 1), preserved 1 deliberate raw-fetch exception (index.html visit-pixel), and injected the 4-script auth-helper block + `requireSession()` guard into 81 ERP HTML pages.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-13T23:31:42Z
- **Completed:** 2026-05-13T23:40:31Z
- **Tasks:** 3 / 3
- **Files modified:** 88 (unique)
- **Commits ahead of origin/main:** 6 (38-01: 2 + 38-02: 1 + 38-03: 3) — **not pushed**

## Accomplishments

- **Task 1:** All 5 shared-JS helpers (`data-loader.js`, `data-loader-sf.js`, `erp-lookups.js`, `arena-lookups.js`, `ns-editable.js`) now use `window.erpApi.*` exclusively. Every ERP page imports at least one of these, so this fixes most of the auth-gating in a single commit.
- **Task 2:** All 56 HTML inline fetches migrated — quickbooks wizard pages (31), sales-new-* (9), arena-new-* + arena-qms (7), netsuite-new-* + netsuite-setup + mes-shop-floor + agent-sales-cash (11). The QB wizard's 501-stub detection branch was rewritten as a typed `ApiError.status === 501` catch.
- **Task 3:** 81 of 83 ERP root HTML pages now bootstrap the auth helpers in locked order (turion-config → Supabase UMD → erp-auth → erp-api) and call `await window.erpAuth.requireSession()` in an inline IIFE before any page-specific scripts run.
- **End-state:** `grep -rnE "fetch\(.*['\"\`].*api/" --include='*.html' --include='*.js' --exclude-dir=satellite .` returns ONLY the 1 deliberate exception (`/api/notify/visit` in index.html). ERP button audit: `pages:83 routes:213 onclick:517 fetch:5 violations:0`.

## Task Commits

1. **Task 1: Migrate 5 shared-JS helpers** — `03fdb14` (feat)
   - 5 files: data-loader.js, data-loader-sf.js, erp-lookups.js, arena-lookups.js, ns-editable.js
   - Net: 6 insertions, 20 deletions (erpApi.* is denser than raw fetch + status check + .json())

2. **Task 2: Migrate 56 HTML inline fetches** — `7ea7ac0` (feat)
   - 32 files: 8 QB/Ramp wizard pages, 9 sales-new-*, 7 arena-new-* + arena-qms, 4 netsuite-new-* + netsuite-setup + mes-shop-floor + agent-sales-cash + index.html (visit-pixel comment)
   - Net: 153 insertions, 267 deletions

3. **Task 3: Inject helper-block + requireSession() into 81 ERP HTML pages + auto-fix 2 missed JS** — `91711b8` (feat)
   - 83 files: 81 ERP HTML pages (helper-block injection) + live-badge.js + shells/edit-modal.js (Rule 1 auto-fix migrations)
   - Net: 497 insertions, 19 deletions

## Files Created / Modified

### Created
None — Plan 38-02 already created the helpers; this plan only consumes them.

### Modified (88 unique)

**Shared JS (7):**
- `/Users/jeet/turion-space-demo/data-loader.js`
- `/Users/jeet/turion-space-demo/data-loader-sf.js`
- `/Users/jeet/turion-space-demo/erp-lookups.js`
- `/Users/jeet/turion-space-demo/arena-lookups.js`
- `/Users/jeet/turion-space-demo/ns-editable.js`
- `/Users/jeet/turion-space-demo/live-badge.js` (Rule 1 auto-fix)
- `/Users/jeet/turion-space-demo/shells/edit-modal.js` (Rule 1 auto-fix)

**HTML (81 — every ERP root page except erp-login.html + erp-auth-callback.html):**
About-this-demo, admin-index, agent-sales-cash, arena-bom, arena-new-{audit,capa,document,eco,ncr,part}, arena-qms, dashboard-{ceo,cfo,cio,cro,cto,dcma,mfg,president,procurement,programs,sfhead}, dashboards, executive-cockpit, finance-index, index, integration-{arena-ns,bank-siem,hub,mes-ns}, mes-shop-floor, netsuite-{new-item,new-po,new-project,new-vendor,setup}, quickbooks{,-bills,-coa,-customers,-invoices,-items,-vendors}, ramp, sales-new-{account,activity,case,cdrl,contact,contract,opportunity,order,quote}, vendor-{index,portal}, workflow-{e2e,new-so}, and the other ERP landing/detail pages.

## Decisions Made

1. **Preserve `index.html:528` raw fetch to `/api/notify/visit`** — added a 5-line comment block above the call explaining why. This is the pre-auth visit-pixel telemetry endpoint fired from `DOMContentLoaded` before any auth flow can establish a session. Migrating it to `erpApi.post` would redirect every unauthenticated visitor to `/erp-login.html` and break visit tracking. The backend route is intentionally NOT auth-gated.

2. **Rewrite 501-stub detection as `ApiError.status` check** — the QB wizard pages have a "Migrate endpoint is still a stub (HTTP 501)" branch that previously checked `resp.status === 501` from a raw response. With `erpApi.post` throwing `ApiError` on non-2xx, the same UX is preserved with `catch (apiErr) { if (apiErr.status === 501) ... }`. Repeats the pattern across 7 quickbooks-* pages + ramp.html.

3. **Auto-fix 2 missed shared-JS helpers (Rule 1)** — `live-badge.js` (GET /api/health + GET /api/activity) and `shells/edit-modal.js` (GET /api/extras/audit + PATCH meta.path) were not in the plan's research inventory. They use raw `fetch(API + …)` with `window.__TURION_API__` as base. Without migration they would 401 in production once Plan 38-04 deploys the global auth middleware. Migrated as part of Task 3 commit.

4. **Bulk Node script for 81-page injection** — used `/tmp/inject-erp-auth.mjs` (idempotent, marker-comment guarded) instead of 81 per-file Edits. Insertion point: `</title>` (every ERP page has one). The marker `<!-- ERP auth helpers (Phase 38) -->` lets future re-runs detect already-injected pages and skip them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migrated 2 additional shared-JS files missed by plan inventory**
- **Found during:** End-of-Task-3 verification (the `grep -rnE "fetch\(.*api/" --include='*.html' --include='*.js'` check found 3 leftover raw fetches not in the plan's 61-site list)
- **Issue:** `live-badge.js` makes 2 raw fetches (`/api/health`, `/api/activity?limit=3`); `shells/edit-modal.js` makes 2 raw fetches (`GET /api/extras/audit/...`, `PATCH meta.path/...`). Both use `window.__TURION_API__` as the base. Once Plan 38-04 deploys the global auth middleware these would return 401 because the requests don't carry a Bearer token.
- **Fix:** Migrated all 4 sites to `window.erpApi.{get,patch}`. Dropped the `API` / `api` local-base variables. Preserved the error fallbacks (`live-badge` shows "API unreachable" message; `edit-modal` falls back to `{ history: [] }` on audit failure).
- **Files modified:** `/Users/jeet/turion-space-demo/live-badge.js`, `/Users/jeet/turion-space-demo/shells/edit-modal.js`
- **Verification:** `node --check` passes on both; final grep confirms 0 raw API fetches remain except the intentional visit-pixel exception.
- **Committed in:** `91711b8` (Task 3 commit — folded in)

**2. [Rule 3 - Blocking] arena-qms.html + mes-shop-floor.html PATCH chains needed `.then` chain collapse**
- **Found during:** Task 2 (arena-qms.html + mes-shop-floor.html migration)
- **Issue:** Both files use a `.then(res => { if (!res.ok) throw ...; return res.json().catch(() => ({})); }).then(...)` chain on the PATCH. `erpApi.patch` returns the parsed JSON directly, so the intermediate `.then(res => ...)` step had to be dropped, not just the URL prefix.
- **Fix:** Collapsed both into `window.erpApi.patch(path, body).then(() => { ... }).catch(err => { ... });` — single layer of `.then`, error handling unchanged.
- **Files modified:** `arena-qms.html`, `mes-shop-floor.html`
- **Verification:** Inline scripts parse cleanly; the toast + button-state updates fire on the same code paths.
- **Committed in:** `7ea7ac0` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 Bug missed-inventory, 1 Rule 3 Blocking chain-collapse)
**Impact on plan:** Both deviations were necessary for the success criteria ("0 raw API fetches except visit-pixel"). No scope creep — the auto-fixes are 4 more migration sites of the exact same shape as the planned 56. Plan's 3-commit structure preserved (the auto-fixes fold into Task 3's commit because they were discovered during its verification step).

## Issues Encountered

- **Linter touch-ups on already-edited files:** During Task 3 the bulk Node injection script ran after Task 2's edits, modifying 80 more HTML files. The system reported each as "modified by user/linter" which is just the script's writeFileSync surfacing. Verified content matches expected by re-running the audit + the layered-script-order check — all 81 pages have config@N < supabase@N+1 < erp-auth@N+2 < erp-api@N+3.

- **`arena-qms.html` retains an unused `ARENA_API_BASE` variable** at line 694. Could be deleted but kept per minimal-change rule (the unused variable doesn't cause any runtime issue, and removing it would touch a line outside the fetch migration scope).

## User Setup Required

None — this plan only migrates frontend calls and injects script tags. No new env vars, no new services, no new credentials. Plan 38-02 already provisioned the SUPABASE_URL + SUPABASE_ANON_KEY in the deploy-time `turion-config.js` generator.

## Next Phase Readiness

- **Ready for Plan 38-04 (deploy + audit-script update):** All frontend changes committed locally on `turion-space-demo` main, NOT pushed. 38-04 owns the staging deploy + audit-script update to recognize `window.erpApi.*` calls (so the audit's `fetch:N` counter stops counting wrapped calls).
- **No blockers.** Backend (38-01) is already deployed with auth middleware enabled. Frontend helpers (38-02) are local. This plan's migration is the last step before the system is end-to-end authed.
- **One follow-up note for 38-04:** The audit's raw-fetch counter currently shows `fetch:5` — that's 1 visit-pixel (intentional) + 4 references inside the `erpApi.*` wrapper itself (inside `erp-api.js`). The audit needs a one-line tweak to subtract the wrapper's own internal fetches, or just whitelist `erp-api.js` from the raw-fetch grep.

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/data-loader.js` — FOUND (uses erpApi)
- File `/Users/jeet/turion-space-demo/data-loader-sf.js` — FOUND (uses erpApi)
- File `/Users/jeet/turion-space-demo/erp-lookups.js` — FOUND (uses erpApi)
- File `/Users/jeet/turion-space-demo/arena-lookups.js` — FOUND (uses erpApi)
- File `/Users/jeet/turion-space-demo/ns-editable.js` — FOUND (uses erpApi)
- File `/Users/jeet/turion-space-demo/live-badge.js` — FOUND (uses erpApi, bonus migration)
- File `/Users/jeet/turion-space-demo/shells/edit-modal.js` — FOUND (uses erpApi, bonus migration)
- 81 ERP HTML pages have the `ERP auth helpers (Phase 38)` marker — VERIFIED (count == 81)
- `erp-login.html` and `erp-auth-callback.html` do NOT have the marker — VERIFIED (intentional, no infinite redirect)
- 0 raw API fetches outside the visit-pixel exception — VERIFIED (`grep -rnE "fetch\(.*['\"\`].*api/" --include='*.html' --include='*.js' --exclude-dir=satellite . | grep -v "/api/notify/visit" | wc -l` → 0)
- Commit `03fdb14` (Task 1) — FOUND in `turion-space-demo` git log
- Commit `7ea7ac0` (Task 2) — FOUND in `turion-space-demo` git log
- Commit `91711b8` (Task 3) — FOUND in `turion-space-demo` git log
- 6 commits ahead of origin/main, nothing pushed — VERIFIED

---
*Phase: 38-erp-auth-and-login*
*Plan: 03 of 04*
*Completed: 2026-05-13*
