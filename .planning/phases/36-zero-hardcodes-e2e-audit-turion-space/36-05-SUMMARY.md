---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 05
subsystem: turion-erp-demo
tags: [zero-hardcode, arena-plm, mes, integration-hub, data-loader, lookups]
requires:
  - "36-02: GET /api/{arena,mes}/lookups, GET /api/data/all completeness, turion-config.js / window.TURION_CONFIG.API_BASE"
provides:
  - "Arena PLM/QMS + MES shop-floor + integration-hub ERP pages render from GET /api/data/all (data-loader.js) — no static *-data.js fallback includes"
  - "data-loader.js now derives window.SAT_BOM_BY_PARENT from SAT_BOM (was inside the deleted bom-data.js)"
  - "arena-lookups.js — window.populateLookups(module, {selectId:lookupKey}) helper used by the arena-new-* forms"
affects:
  - "/Users/jeet/turion-space-demo (12 ERP HTML pages + data-loader.js edited; arena-lookups.js added; bom-data.js deleted)"
tech-stack:
  added: []
  patterns:
    - "Inline data literals (NCR_DATA / CAPA_DATA / AUDIT_DATA / PROCEDURE_DATA / QMS_DOC_DATA / STAGE_DATA / ECO_DATA) demoted from `const` to `let` + a `turion-data-ready` handler swaps in window.<NAME> when /api/data/all resolves — literal kept as the offline fallback"
    - "Integration pages render via a `render<Module>()` function: called once on parse (static/empty), then re-run on `window.__TURION_DATA_READY__` resolution + `turion-data-ready` event; bare-global fallbacks (ARENA_NS_INTEGRATIONS etc.) replaced with `window.<NAME> || []`"
    - "Connector lists derived from window.CONNECTOR_STACK_BY_SCOPE['<module>-ns'] (live API) with window.CONNECTOR_STACK / [] fallbacks"
    - "Form dropdowns: arena-lookups.js fetches GET /api/{arena,mes}/lookups and rebuilds each <select>'s options, preserving the previously-selected value; on fetch error the hardcoded <option>s are left untouched"
key-files:
  created:
    - /Users/jeet/turion-space-demo/arena-lookups.js
  modified:
    - /Users/jeet/turion-space-demo/arena-qms.html
    - /Users/jeet/turion-space-demo/arena-bom.html
    - /Users/jeet/turion-space-demo/arena-new-ncr.html
    - /Users/jeet/turion-space-demo/arena-new-part.html
    - /Users/jeet/turion-space-demo/arena-new-eco.html
    - /Users/jeet/turion-space-demo/arena-new-capa.html
    - /Users/jeet/turion-space-demo/arena-new-document.html
    - /Users/jeet/turion-space-demo/arena-new-audit.html
    - /Users/jeet/turion-space-demo/mes-shop-floor.html
    - /Users/jeet/turion-space-demo/integration-arena-ns.html
    - /Users/jeet/turion-space-demo/integration-mes-ns.html
    - /Users/jeet/turion-space-demo/integration-vendor-ns.html
    - /Users/jeet/turion-space-demo/integration-bank-siem.html
    - /Users/jeet/turion-space-demo/integration-sf-ns.html
    - /Users/jeet/turion-space-demo/integration-hub.html
    - /Users/jeet/turion-space-demo/netsuite-mrp.html
    - /Users/jeet/turion-space-demo/data-loader.js
  deleted:
    - /Users/jeet/turion-space-demo/bom-data.js
decisions:
  - "No new MES endpoint added — mes-shop-floor.html has no <select> dropdowns and renders entirely from STAGE_DATA (now from /api/data/all → turion.mes_stages) plus the existing GET/PATCH /api/mes/stages[/:num]. STAGE_DATA + the existing PATCH suffice. The satellite work-orders/build-steps app remains the real MES surface — the ERP MES domain model was deliberately not gold-plated. No backend/src or backend/dist change in this plan."
  - "SAT_BOM_BY_PARENT derivation moved into data-loader.js (5 lines) rather than duplicated inline into arena-bom.html + netsuite-mrp.html — additive, shared infra, working tree was clean. (data-loader.js is in 36-04's files_modified; 36-04 already committed it as 0231170 'fails loud' — this is a clean additive rebase, no conflict.)"
  - "arena-new-* forms keep their hardcoded <option> lists as the offline fallback; populateLookups('arena', …) rebuilds them from GET /api/arena/lookups on load. Same defensive pattern 36-02 used for the API base — a cold-start /lookups failure must not blank a form."
  - "Edited pages all got <script src=\"turion-config.js\"> before data-loader.js (per 36-02's contract for the dashboard pages that lacked it)."
metrics:
  duration: ~75min
  completed: 2026-05-13
---

# Phase 36 Plan 05: De-hardcode Arena / MES / Integration ERP Pages Summary

The Arena PLM/QMS pages, the MES shop-floor page, and the integration-hub pages are now API-driven: the static `*-data.js` `<script>`-include fallbacks were removed from the pages this plan owns, `bom-data.js` (now fully orphaned) was deleted, and form dropdowns are fed from `GET /api/{arena,mes}/lookups`.

## What changed

| Page | Change |
| --- | --- |
| `arena-qms.html` | `NCR_DATA` / `CAPA_DATA` / `AUDIT_DATA` / `PROCEDURE_DATA` / `QMS_DOC_DATA` changed `const`→`let`; a `turion-data-ready` handler swaps in `window.<NAME>` (from `/api/data/all`) when it arrives. `turion-config.js` added before `data-loader.js`. (This page never `<script>`-included a `*-data.js` file — the literals were inline.) |
| `arena-bom.html` | Removed `<script src="bom-data.js">`; `buildTree()` now reads `window.SAT_BOM_BY_PARENT` (derived in `data-loader.js`); the initial `expandAll()` re-runs on `turion-data-ready`. `ECO_DATA` const→let + data-ready swap. `turion-config.js` added. |
| `arena-new-{ncr,part,eco,capa,document,audit}.html` | Added `<script src="arena-lookups.js">`; each form now calls `populateLookups('arena', {…})` on load, rebuilding its `<select>`s from `GET /api/arena/lookups` (NCR sources/severities/dispositions/statuses; part item-classes/phases/uoms/ITAR; ECO types/priorities/CCB/dispositions; CAPA types/risk/statuses; document types/statuses/distributions; audit types/severities/statuses). Hardcoded `<option>` lists retained as offline fallback. (`turion-config.js` + `data-loader.js` were already present from 36-02.) |
| `mes-shop-floor.html` | `STAGE_DATA` const→let + `turion-data-ready` handler swapping in `window.STAGE_DATA` (from `/api/data/all`). `turion-config.js` added. No `<select>` dropdowns exist on this page, so nothing to wire to `/api/mes/lookups`. |
| `integration-arena-ns.html` | Removed `<script src="integration-arena-data.js">`; rewrote the synchronous render into `renderArena()` reading `window.ARENA_NS_INTEGRATIONS` / `window.ARENA_SYNC_RUNS` and the connector list from `window.CONNECTOR_STACK_BY_SCOPE['arena-ns']`; called once on parse + on `__TURION_DATA_READY__` + `turion-data-ready`. `turion-config.js` added. |
| `integration-mes-ns.html` | Same treatment — removed `integration-mes-data.js`, `renderMes()`, scope key `mes-ns`. |
| `integration-vendor-ns.html` | Same — removed `integration-vendor-data.js`, `renderVendor()`, scope key `vendor-ns`. |
| `integration-bank-siem.html` | Same — removed `integration-bank-siem-data.js`, `renderBank()`, scope key `bank-ns`. |
| `integration-sf-ns.html` | Removed `<script src="integration-data.js">`; was already gated on `turion-data-ready` — just stripped the bare-global fallbacks (`|| SF_NS_INTEGRATIONS`, `CONNECTOR_STACK || CONNECTOR_STACK`, `|| SYNC_RUNS` → `|| []`). `turion-config.js` added. |
| `integration-hub.html` | Already API-driven (no `*-data.js` include, already gates on `turion-data-ready`) — only added `turion-config.js`. |
| `netsuite-mrp.html` | Removed `<script src="bom-data.js">`; wrapped the synchronous MRP/Gantt render in `renderMrp()` reading `window.SAT_BOM`; runs once on parse + on `turion-data-ready`. (`turion-config.js` already present.) |
| `data-loader.js` | When `SAT_BOM` arrives it now also builds `window.SAT_BOM_BY_PARENT` (`{parent → [rows]}`) — was previously hand-built inside `bom-data.js`. |
| `arena-lookups.js` (new) | `window.populateLookups(module, {selectId: lookupKey})` — fetches `GET /api/${module}/lookups`, rebuilds the named `<select>`s, preserving the prior selection; silent no-op on error. |

## Dropdowns wired to `/api/{arena,mes}/lookups`

- **Arena** — all six `arena-new-*.html` forms (16 distinct `<select>`s, keys listed in the table above) → `GET /api/arena/lookups`.
- **MES** — `mes-shop-floor.html` has **no** `<select>` controls (the stage cells are static `<div>`s navigating to `/records/stage/N`); nothing to wire. The page's `STAGE_DATA` does come from `/api/data/all` (turion.mes_stages) after this plan.

## New MES endpoint?

**None.** RESEARCH's expectation held: `STAGE_DATA` from `/api/data/all` (+ the existing `GET /api/mes/stages[/:num]` and `PATCH /api/mes/stages/:num`) is everything `mes-shop-floor.html` needs to render and operate. No `backend/src/routes/mes.ts` / `backend/src/app.ts` / `backend/dist/*` change in this plan — the satellite `work-orders`/`build-steps` app is the real manufacturing-execution surface; the ERP MES module is intentionally shallow.

## Deleted files

- `bom-data.js` — now referenced by zero `*.html` pages (it was only `arena-bom.html` + `netsuite-mrp.html`, both de-hardcoded here).

## Files NOT in this plan's scope — flagged for follow-up

The other Arena/MES/integration `*-data.js` files could not be deleted because pages outside this plan's scope still `<script>`-include them:

| File | Still referenced by | Owning plan |
| --- | --- | --- |
| `integration-arena-data.js` | `dashboard-cio.html` only | 36-07 (owns dashboard-cio.html WIP) |
| `integration-mes-data.js` | `dashboard-cio.html` only | 36-07 |
| `integration-vendor-data.js` | `dashboard-cio.html` only | 36-07 |
| `integration-bank-siem-data.js` | `dashboard-cio.html` only | 36-07 |
| `mes-data.js` | `dashboard-cto.html`, `dashboard-mfg.html`, `ns-record.html` | (exec dashboards / ns-record — unclaimed) |
| `qms-data.js` | `dashboard-{cto,mfg,president,dcma}.html`, `ns-record.html` | (exec dashboards / ns-record) |
| `arena-doc-data.js` | `ns-record.html` | (ns-record) |
| `integration-data.js` | `dashboard-{cio,cro,president,sfhead}.html` | 36-07 (cio) + exec dashboards |

Recommendation: 36-07 should strip the `*-data.js` includes from `dashboard-cio.html` (it's editing that file anyway), then delete the four `integration-*-data.js` files. The exec-dashboard pages (`dashboard-cto/mfg/dcma/president/cro/sfhead`) and `ns-record.html` render synchronously from these globals and would need `turion-data-ready` gating before their includes can be safely removed — a small follow-up plan, out of 36-05's named scope.

## Verification

- `node --check arena-lookups.js data-loader.js` — OK.
- Inline-`<script>` syntax check (a `new Function(code)` over every non-`src` script tag) — all 15 edited pages parse clean.
- Local `python3 -m http.server` smoke: all 16 edited pages return HTTP 200; `bom-data.js` returns 404 (deleted).
- `grep 'src="*-data.js"'` over the 16 edited pages → zero references to any Arena/MES/integration static-data file.
- `grep` over the 5 integration pages → zero bare (`window.`-less) `*_NS_INTEGRATIONS` / `*_SYNC_RUNS` / `*_CONNECTOR_STACK` references that would `ReferenceError`.
- Live-data verification (the `/api/data/all` payload actually populating these pages in a browser) is deferred to plan 36-09's deploy walk per the phase's established headless-substitute pattern.

## Commit

`turion-space-demo` `76d8f38` — `feat(36-05): de-hardcode Arena/MES/integration ERP pages` — 19 files (17 modified + `arena-lookups.js` added + `bom-data.js` deleted) — author `jeet-avatar <jm@techcloudpro.com>`. Not pushed, not deployed (plan 36-09 owns deploy + Lambda redeploy). 36-07's long-standing WIP (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*`) left dirty and untouched.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/arena-lookups.js` — FOUND
- `/Users/jeet/turion-space-demo/bom-data.js` — confirmed DELETED (HTTP 404, `git rm`)
- `data-loader.js` derives `SAT_BOM_BY_PARENT` — FOUND (`grep SAT_BOM_BY_PARENT data-loader.js`)
- `arena-new-*.html` call `populateLookups('arena', …)` — FOUND in all 6
- Commit `76d8f38` in `turion-space-demo`, author `jeet-avatar <jm@techcloudpro.com>` — FOUND
- 36-07 WIP still dirty / untouched by the commit — VERIFIED
