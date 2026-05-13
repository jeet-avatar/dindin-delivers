---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 02
subsystem: turion-erp-demo
tags: [lookup-endpoints, zero-hardcode, turion-erp, runtime-config]
requires: []
provides:
  - "GET /api/arena/lookups, /api/netsuite/lookups, /api/salesforce/lookups, /api/mes/lookups — dropdown enum lists for the ERP + New forms"
  - "window.TURION_CONFIG.API_BASE (from generated /turion-config.js) — single source of truth for the ERP APIGW base URL"
  - "Confirmed GET /api/data/all returns every turion.* table the ERP frontend reads via window.<NAME> globals"
affects:
  - "/Users/jeet/turion-space-demo/backend (new lookups router mounted in app.ts)"
  - "/Users/jeet/turion-space-demo (new scripts/generate-turion-config.sh, deploy-frontend.sh hook, .gitignore; 22 frontend files now read window.TURION_CONFIG.API_BASE)"
tech-stack:
  added: []
  patterns:
    - "lookups.ts holds canonical enum lists server-side + hydrates account/vendor/owner name lists via DISTINCT (hardened: DB hiccup degrades to canonical lists, no err.message leak)"
    - "turion-config.js generated at deploy time (mirrors satellite-config.js), gitignored, exposes window.TURION_CONFIG; frontend uses (window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || '<literal>' as a defensive fallback"
key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/src/routes/lookups.ts
    - /Users/jeet/turion-space-demo/backend/dist/routes/lookups.js
    - /Users/jeet/turion-space-demo/scripts/generate-turion-config.sh
    - /Users/jeet/turion-space-demo/turion-config.js (generated, gitignored — not committed)
  modified:
    - /Users/jeet/turion-space-demo/backend/src/app.ts
    - /Users/jeet/turion-space-demo/deploy-frontend.sh
    - /Users/jeet/turion-space-demo/.gitignore
    - /Users/jeet/turion-space-demo/data-loader.js
    - /Users/jeet/turion-space-demo/data-loader-sf.js
    - /Users/jeet/turion-space-demo/arena-new-part.html
    - /Users/jeet/turion-space-demo/arena-new-audit.html
    - /Users/jeet/turion-space-demo/arena-new-document.html
    - /Users/jeet/turion-space-demo/arena-new-capa.html
    - /Users/jeet/turion-space-demo/arena-new-ncr.html
    - /Users/jeet/turion-space-demo/arena-new-eco.html
    - /Users/jeet/turion-space-demo/netsuite-new-item.html
    - /Users/jeet/turion-space-demo/netsuite-new-po.html
    - /Users/jeet/turion-space-demo/netsuite-new-project.html
    - /Users/jeet/turion-space-demo/netsuite-new-vendor.html
    - /Users/jeet/turion-space-demo/netsuite-setup.html
    - /Users/jeet/turion-space-demo/sales-new-account.html
    - /Users/jeet/turion-space-demo/sales-new-contact.html
    - /Users/jeet/turion-space-demo/sales-new-opportunity.html
    - /Users/jeet/turion-space-demo/sales-new-quote.html
    - /Users/jeet/turion-space-demo/sales-new-contract.html
    - /Users/jeet/turion-space-demo/sales-new-case.html
    - /Users/jeet/turion-space-demo/sales-new-cdrl.html
    - /Users/jeet/turion-space-demo/sales-new-activity.html
    - /Users/jeet/turion-space-demo/sales-new-order.html
decisions:
  - "Lookup lists are canonical server-side data (the win is the frontend stops owning them, not that every value is row-derived); each route additionally hydrates account/vendor/owner name lists via SELECT DISTINCT source_data->>'name' — degrades to canonical-only on DB error."
  - "Mounted the lookups router at app.use('/api', lookups) AFTER the per-module routers — a GET /api/arena/lookups falls through arena's router (no /lookups route) to here; placed before the catch-all 404."
  - "Did NOT commit backend/dist/app.js — it's shared with plan 36-07's uncommitted WIP (agents.ts/notify.ts also compile into it). Committed only backend/dist/routes/lookups.js (a brand-new file, no conflict). 36-09's deploy build regenerates dist/app.js with all mounts."
  - "Used relative `<script src=\"turion-config.js\">` (matching the existing relative `data-loader.js` includes on these root-level pages) rather than `/turion-config.js`."
  - "Switched all 22 files that owned a `const API_BASE` literal (the plan's files_modified listed 15; the authoritative grep found 7 more — the 6 arena-new-* forms + netsuite-setup — included to truly zero the hardcode)."
metrics:
  duration: ~40min
  completed: 2026-05-12
---

# Phase 36 Plan 02: ERP Lookup Endpoints + Single-Source API Base Summary

Two prerequisites for the W2 ERP de-hardcode plans, both done:

1. **Per-module lookup endpoints** — `GET /api/{arena,netsuite,salesforce,mes}/lookups` added to `turion-space-demo/backend/` (`src/routes/lookups.ts`, mounted in `app.ts`). Each returns the small enum lists that module's `+ New` forms used to own as hardcoded `<option>` lists (NCR severities/dispositions/statuses, ECO types/priorities/CCB, CAPA types/risk, Audit types/severities, Document types/distributions, Part item-classes/phases/ITAR; NetSuite item types/UOMs/income-accounts, PO terms/statuses/FOB, Vendor tiers/categories/terms/DPAS/EDI/ASN, Project types/statuses; Salesforce opportunity stages/lead-sources, case types/priorities/statuses/origins, quote/contract/CDRL/activity/account/contact enums; MES stage statuses) **plus** DB-hydrated `accounts`/`contacts`/`vendors`/`projects`/`owners` name lists via `SELECT DISTINCT source_data->>'name'`. Hardened: a DB hiccup degrades to the canonical lists instead of a 500; no `err.message` leaked in the success path.
2. **Single source of truth for the ERP APIGW base URL** — new `scripts/generate-turion-config.sh` (mirrors `scripts/generate-satellite-config.sh`) emits `turion-config.js` (`window.TURION_CONFIG = Object.freeze({ API_BASE: 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com' })`, overridable via `TURION_API_BASE` env), wired into `deploy-frontend.sh` right next to the satellite-config generator (before the `aws s3 sync`); `turion-config.js` added to `.gitignore`. All 22 files that owned a copy-pasted `const API_BASE = 'https://lo254mvukl...'` literal now read `(window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || '<literal>'`, and each affected HTML page got a `<script src="turion-config.js"></script>` immediately before its `data-loader.js` include.

`npm run build` + `npx tsc --noEmit` green in `backend/`. Committed (not pushed, not deployed — plan 36-09 owns deploy + Lambda redeploy) in `turion-space-demo` as `99702da` under `jeet-avatar <jm@techcloudpro.com>`; plan 36-07's long-standing WIP left untouched.

## `/api/data/all` Completeness Diff

Method: grepped every `*.html`/`*.js` (excl. `satellite/`, `backend/`, `node_modules/`) for `window.<UPPER>` globals; compared against the keys `/api/data/all` (and `data-loader.js`) sets; cross-checked against the `turion.*` table list in `/api/health`.

**Result: no gap.** Every `turion.*` table is served by `/api/data/all`:

| Frontend global | Served by `/api/data/all`? | Notes |
| --- | --- | --- |
| CUSTOMER_DATA, OPP_DATA, CONTACT_DATA, CASE_DATA, SF_NS_INTEGRATIONS | yes | |
| ITEM_DATA, SO_DATA, CLIN_DATA, WO_DATA, PROJ_DATA, JE_DATA, INV_DATA, CONTRACT_DATA, MRP_RUN_DATA, RFQ_DATA, KPI_SCORECARD, BACKLOG | yes | |
| NCR_DATA, CAPA_DATA, AUDIT_DATA, PROCEDURE_DATA, PERSON_DATA, TOOL_DATA, QMS_DOC_DATA, DOC_DATA, SAT_BOM, STAGE_DATA, ECO_DATA, WBS_DETAIL, RISK_DETAIL, VARIANCE_DETAIL | yes | |
| PO_DATA, VENDOR_DATA, VENDOR_NS_INTEGRATIONS, VENDOR_SYNC_RUNS, ARENA_NS_INTEGRATIONS, ARENA_SYNC_RUNS, MES_NS_INTEGRATIONS, MES_SYNC_RUNS, BANK_NS_INTEGRATIONS, BANK_SYNC_RUNS, SYNC_RUNS, CONNECTOR_STACK, CONNECTOR_STACK_BY_SCOPE | yes | `CONNECTOR_STACK` = the `sf-ns` scope subset (back-compat); per-scope under `CONNECTOR_STACK_BY_SCOPE`. |
| OBLIGATION_DATA, ASN_DATA, QUOTE_DATA, BILL_DATA, COA_DATA, ARM_SCHEDULE, EVMS_CURVE, SETUP_CONFIG | yes | |
| RCV_DATA (read by `data-loader.js`, `ns-po-modal.js`, `ns-record.html`) | yes — mapped from `RECEIPT_DATA` (`turion.item_receipts`) in `data-loader.js:85` | |
| ARENA_/BANK_/MES_/VENDOR_CONNECTOR_STACK | derived client-side from `CONNECTOR_STACK_BY_SCOPE` | not a separate API key |
| SAT_BOM_BY_PARENT | derived client-side from `SAT_BOM` | not a separate API key |
| BUDGET, BUDGET_SUMMARY, FORECAST, ACTUALS, CASH_FLOW_13W, CAPEX_PLAN, HEADCOUNT_PLAN, FX_RATES, FX_EXPOSURE, REVAL_HISTORY, RATE_TRUEUP, INDIRECT_RATES, PROJECT_FORECAST, FY26_BUDGET_TOTALS, MONTHS, PERIODS, ROLES, USERS, LOGIN_AUDIT, LOCATIONS, CURRENCIES, SUBSIDIARIES, TAX_RATES, TAX_GOVT_EXEMPT_LOGIC, COA_CLASSES, COMPANY_INFO, EMP_TO_PERSON, SFC | **no — and no DB table backs them** | Pure static config from `enterprise-data.js` / `fpa-data.js` / `evms-data.js` / `setup-data.js` / `coa-data.js` etc. Out of scope for 36-02 (the `*-data.js` files stay; making these API-backed, if desired, is a 36-04/05 / future call — would need new `turion.*` tables first). |

So `/api/data/all` is sufficient for W2 to delete the `*-data.js` files that *only* mirror DB-backed globals (the row-data files); the `*-data.js` files that hold the pure-config globals above must stay (or get their own tables) — flagged for 36-04/05.

## Files Switched to `window.TURION_CONFIG.API_BASE`

22 files (was `const API_BASE = 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com';` → `const API_BASE = (window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || 'https://lo254mvukl...';`):

- `data-loader.js`, `data-loader-sf.js` (no `<script>` tag — these *are* loaded by the pages)
- `sales-new-account.html`, `sales-new-contact.html`, `sales-new-opportunity.html`, `sales-new-quote.html`, `sales-new-contract.html`, `sales-new-case.html`, `sales-new-cdrl.html`, `sales-new-activity.html`, `sales-new-order.html`
- `netsuite-new-item.html`, `netsuite-new-po.html`, `netsuite-new-project.html`, `netsuite-new-vendor.html`, `netsuite-setup.html` (this one was already `window.__TURION_API__ || '<literal>'` → now `window.__TURION_API__ || (window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || '<literal>'`)
- `arena-new-part.html`, `arena-new-audit.html`, `arena-new-document.html`, `arena-new-capa.html`, `arena-new-ncr.html`, `arena-new-eco.html`

Each of the 20 HTML pages got `<script src="turion-config.js"></script>` inserted immediately before its `<script src="data-loader.js"></script>`.

## Defensive-Fallback Contract for 36-04 / 36-05

- `turion-config.js` is **generated at deploy** and **gitignored** — it does not exist in a fresh checkout. A page that includes `<script src="turion-config.js">` before the generated file exists (e.g. local `python -m http.server` against the repo) will get `window.TURION_CONFIG === undefined`.
- Therefore **every** consumer of the ERP API base **must** use the form `(window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com'` — keep the literal as the last-resort fallback. Do **not** assume `window.TURION_CONFIG` is defined.
- 36-04 also edits the same `sales-new-*.html` / `netsuite-new-*.html` form pages (to wire dropdowns to `/api/{module}/lookups`) — the `window.TURION_CONFIG`-aware `const API_BASE` line and the `<script src="turion-config.js">` tag are already in place; rebase on top, don't reintroduce a bare literal.
- The W2 plans should add `<script src="turion-config.js">` to the **other ~50 dashboard pages** that include `data-loader.js` but had no inline `const API_BASE` (so `data-loader.js`'s own `window.TURION_CONFIG` lookup resolves there too) — not done here (out of 36-02's named files); until then those pages' `data-loader.js` uses the literal fallback (still works).

## Deviations from Plan

- **[Rule 3 - Blocking] `backend/dist/app.js` left uncommitted.** The plan's Task 1 said to commit the freshly-built `dist/app.js` "since 36-07 touches different `dist/` files" — but `backend/dist/app.js` was *already* a working-tree modification (shared with 36-07's uncommitted WIP, which also recompiles `app.ts`). Committing it would have swallowed 36-07's changes. Committed only the brand-new `backend/dist/routes/lookups.js` (no conflict); `dist/app.js` left for 36-09's deploy build. Noted in decisions above.
- **[Scope] No backend test framework.** `turion-space-demo/backend` has no jest/mocha/`test` script (only `build`/`dev`/`start`); the repo-root `tests/cost-render.test.ts` is satellite, unrelated. So no tests added for the lookups router — verified instead via `npm run build` + `npx tsc --noEmit` clean. (Noted per the plan's "if the ERP backend has tests: green; otherwise noted".)
- **22 vs 15 files.** The plan's `files_modified` listed 15 frontend files; the authoritative `grep "const API_BASE"` found 22. Included all 22 (the extra 7 = `arena-new-{part,audit,document,capa,ncr,eco}.html` + `netsuite-setup.html`) — the phase's whole point is zero hardcodes. The plan anticipated "±2"; this is +7, all flagged here.

## Self-Check: PASSED

- `backend/src/routes/lookups.ts` — FOUND
- `backend/dist/routes/lookups.js` — FOUND
- `scripts/generate-turion-config.sh` — FOUND (executable)
- `turion-config.js` — FOUND (generated; gitignored, intentionally not committed)
- `backend/src/app.ts` mounts `/api` lookups router — FOUND (`grep -c lookups backend/dist/app.js` = 4)
- `deploy-frontend.sh` calls `generate-turion-config.sh` — FOUND
- `.gitignore` has `turion-config.js` — FOUND
- No bare `const API_BASE = 'https://lo254mvukl...'` remains (all are `||`-fallback) — VERIFIED
- Commit `99702da` in turion-space-demo, author `jeet-avatar <jm@techcloudpro.com>` — FOUND
- 36-07 WIP still dirty / untouched by the commit — VERIFIED
