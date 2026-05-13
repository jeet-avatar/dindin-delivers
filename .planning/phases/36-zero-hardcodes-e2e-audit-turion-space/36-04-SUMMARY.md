---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 04
subsystem: turion-erp-demo
tags: [zero-hardcode, turion-erp, salesforce, netsuite, lookup-endpoints, data-loader]
requires:
  - "36-02: GET /api/{salesforce,netsuite}/lookups + window.TURION_CONFIG.API_BASE + confirmed /api/data/all completeness"
provides:
  - "erp-lookups.js — fetches GET /api/{salesforce,netsuite,arena,mes}/lookups, caches, ERPLookups.fill(selectId, listKey, {selected, placeholder}) populates a <select>"
  - "data-loader.js / data-loader-sf.js — on /api/data/all fetch failure show a visible dismissible 'Live data unavailable — [Retry]' banner (window.__turionShowOfflineBanner__) instead of a silent fall-through"
  - "All 13 SF/NS '+ New' forms (sales-new-*.html, netsuite-new-*.html) populate their dropdowns from the lookups API"
  - "turion-config.js wired onto the SF/NS view + index pages (salesforce-account, netsuite-*, sales/finance/procurement/projects-index, workflow-new-so)"
affects:
  - "/Users/jeet/turion-space-demo (new erp-lookups.js; data-loader.js + data-loader-sf.js hardened; 31 SF/NS HTML pages edited)"
tech-stack:
  added: []
  patterns:
    - "ERPLookups.fill(selectId, listKey, opts): replaces a <select>'s <option>s with the named lookup list from cache; if the list is unavailable the inline <option>s are left untouched (graceful degradation)"
    - "data-loader catch path: loud-not-broken — show the offline banner AND still let the static *-data.js snapshot populate globals (BUDGET/FORECAST/TAX_RATES/COA_CLASSES have no API source), so the demo stays usable"
key-files:
  created:
    - /Users/jeet/turion-space-demo/erp-lookups.js
  modified:
    - /Users/jeet/turion-space-demo/data-loader.js
    - /Users/jeet/turion-space-demo/data-loader-sf.js
    - /Users/jeet/turion-space-demo/sales-new-account.html
    - /Users/jeet/turion-space-demo/sales-new-contact.html
    - /Users/jeet/turion-space-demo/sales-new-opportunity.html
    - /Users/jeet/turion-space-demo/sales-new-quote.html
    - /Users/jeet/turion-space-demo/sales-new-contract.html
    - /Users/jeet/turion-space-demo/sales-new-case.html
    - /Users/jeet/turion-space-demo/sales-new-cdrl.html
    - /Users/jeet/turion-space-demo/sales-new-activity.html
    - /Users/jeet/turion-space-demo/sales-new-order.html
    - /Users/jeet/turion-space-demo/netsuite-new-item.html
    - /Users/jeet/turion-space-demo/netsuite-new-po.html
    - /Users/jeet/turion-space-demo/netsuite-new-project.html
    - /Users/jeet/turion-space-demo/netsuite-new-vendor.html
    - /Users/jeet/turion-space-demo/salesforce-account.html
    - /Users/jeet/turion-space-demo/netsuite-customer-so.html
    - /Users/jeet/turion-space-demo/netsuite-items.html
    - /Users/jeet/turion-space-demo/netsuite-coa.html
    - /Users/jeet/turion-space-demo/netsuite-tb.html
    - /Users/jeet/turion-space-demo/netsuite-bs.html
    - /Users/jeet/turion-space-demo/netsuite-fpa.html
    - /Users/jeet/turion-space-demo/netsuite-arm.html
    - /Users/jeet/turion-space-demo/netsuite-financials.html
    - /Users/jeet/turion-space-demo/netsuite-mrp.html
    - /Users/jeet/turion-space-demo/netsuite-procurement.html
    - /Users/jeet/turion-space-demo/netsuite-demand-planning.html
    - /Users/jeet/turion-space-demo/netsuite-project-evms.html
    - /Users/jeet/turion-space-demo/sales-index.html
    - /Users/jeet/turion-space-demo/finance-index.html
    - /Users/jeet/turion-space-demo/procurement-index.html
    - /Users/jeet/turion-space-demo/projects-index.html
    - /Users/jeet/turion-space-demo/workflow-new-so.html
decisions:
  - "Did NOT delete the 6 *-data.js files (enterprise/coa/fpa/evms/arm/setup) the plan's Task 2 said to `git rm`, and did NOT make data-loader.js fail-blank. Rationale: 36-02's own SUMMARY documents that these files hold globals (BUDGET, BUDGET_SUMMARY, FORECAST, ACTUALS, CASH_FLOW_13W, CAPEX_PLAN, HEADCOUNT_PLAN, MONTHS, COA_CLASSES, INDIRECT_RATES, COMPANY_INFO, CURRENCIES, SUBSIDIARIES, TAX_RATES, TAX_GOVT_EXEMPT_LOGIC, FX_RATES, FX_EXPOSURE, REVAL_HISTORY, USERS, ROLES, LOGIN_AUDIT, PERIODS, LOCATIONS, RATE_TRUEUP, PROJECT_FORECAST, EMP_TO_PERSON) that are NOT served by /api/data/all and have NO turion.* table backing them — they are pure static config. Deleting them would (a) blank the NetSuite COA / Trial-Balance / Balance-Sheet / FP&A / Setup pages, (b) blank ~10 exec dashboard pages (which are 36-05/other plans' scope, not this plan's), with no API to replace the data. The plan's stated premise ('/api/data/all is complete — done in 36-02') is contradicted by 36-02's findings. The orchestrator's critical-context brief also explicitly said to keep the static files as the offline fallback. So: hardened data-loader.js to fail LOUD (visible retry banner) but not BROKEN (static snapshot still populates globals)."
  - "netsuite-items.html DID drop its <script src=\"enterprise-data.js\"> include — it reads only ITEM_DATA (served by /api/data/all) and re-renders on the turion-data-ready event, and does not read EMP_TO_PERSON (the one config-only global enterprise-data.js carries; grep -rln EMP_TO_PERSON *.html → only ns-record.html)."
  - "Built a shared erp-lookups.js helper (load+cache+fill) rather than copy-pasting a fetch into 13 forms. ERPLookups.fill leaves the inline <option>s in place when the API is unreachable — so the forms still work offline."
  - "Did NOT touch ns-record.html — it's a generic record viewer shared by SF/NS AND Arena/MES records and pulls in 36-05-owned static files (arena-doc-data.js, mes-data.js); reverted a turion-config.js insertion to avoid colliding with 36-05's concurrent run."
  - "Left genuinely non-lookup-backed <select> lists inline (the lookups endpoint has no key for them): the account `industry` select on sales-new-account.html; the order-specific `paymentTerms`/`status`/`newCustomerTerms` selects on sales-new-order.html (they carry extra values like 'Net 30 from milestone acceptance' / 'Active · in build' not in netsuite_lookups); the CLIN pricing-type select (FFP/CPFF/T&M/Cost milestones) created per-row in the line-item tables of sales-new-opportunity.html / sales-new-quote.html / sales-new-order.html. Adding backend keys for these is a future call, not in scope."
metrics:
  duration: ~50min
  completed: 2026-05-12
---

# Phase 36 Plan 04: ERP Salesforce + NetSuite De-Hardcode (forms → /lookups, loud data-loader) Summary

The Salesforce CRM + NetSuite finance demo pages now pull their dropdown enums from the live API and surface a visible retry banner when the data API is unreachable — they no longer carry the dropdown lists in HTML, and `data-loader.js` no longer fails silent.

## What changed

1. **`erp-lookups.js` (new)** — fetches `GET /api/{salesforce,netsuite,arena,mes}/lookups` (the endpoints 36-02 added), caches per module, exposes `ERPLookups.load(module)` and `ERPLookups.fill(selectId, listKey, {selected, placeholder})`. `fill` replaces a `<select>`'s `<option>`s with the named lookup list; if the list isn't loaded (API down), the select's existing inline options are left in place. Uses the `window.TURION_CONFIG.API_BASE || '<literal>'` pattern from 36-02.

2. **`data-loader.js` / `data-loader-sf.js` hardened** — added `window.__turionShowOfflineBanner__(retryFn)`: a fixed, dark-red, `role="status"` banner ("⚠ Live data unavailable — showing the last-known offline snapshot. Records may be stale.") with a **Retry** button (re-runs via `location.reload()`) and a **Dismiss** button, both wired with `addEventListener` (no inline `onclick`). The `catch` paths of both loaders now call it. The static `*-data.js` snapshot still populates the globals afterwards (so config-only globals — `BUDGET`/`FORECAST`/`TAX_RATES`/`COA_CLASSES`/… — that have no API source keep working): **fail loud, not broken.** `turion-data-ready` still fires in both the success and the fallback path so pages that gate render on it still render.

3. **13 "+ New" forms wired to `/lookups`** — `sales-new-{account,contact,opportunity,quote,contract,case,cdrl,activity,order}.html` and `netsuite-new-{item,po,project,vendor}.html` now `<script src="erp-lookups.js">` and, in their `init()` (after the existing `await __TURION_DATA_READY__`), call `ERPLookups.load('salesforce'|'netsuite')` + `ERPLookups.fill(...)` for every DB-derivable enum select. Mapping used:

   | Page | select id → lookup key |
   | --- | --- |
   | sales-new-account | dpas→dpas_ratings · itarTier→account_itar_tiers · paymentTerms→account_payment_terms (selected Net 30) · priceLevel→account_price_levels |
   | sales-new-contact | preferredContact→contact_preferred_contact |
   | sales-new-opportunity | stage→opportunity_stages (selected Qualification) · leadSource→opportunity_lead_sources · dpas→dpas_ratings |
   | sales-new-quote | status→quote_statuses (selected Submitted) · currency→quote_currencies · terms→quote_terms |
   | sales-new-contract | type→contract_types · dpas→dpas_ratings · itar→contract_itar_cats · flowdownTo→contract_flowdown |
   | sales-new-case | type→case_types · priority→case_priorities (selected P2·Medium) · status→case_statuses (selected New) · origin→case_origins |
   | sales-new-cdrl | type→cdrl_types · frequency→cdrl_frequencies · distribution→cdrl_distributions |
   | sales-new-activity | type→activity_types · status→activity_statuses |
   | sales-new-order | currency→order_currencies · dpas→dpas_ratings · newContractType→contract_types · newContractDpas→dpas_ratings |
   | netsuite-new-item | type→item_types · uom→item_uoms · incomeAccount→item_income_accounts |
   | netsuite-new-po | currency→po_currencies · paymentTerms→po_payment_terms · status→po_statuses (selected Issued) · fob→po_fob |
   | netsuite-new-project | type→project_types · status→project_statuses (selected Planning) |
   | netsuite-new-vendor | tier→vendor_tiers · category→vendor_categories · paymentTerms→vendor_payment_terms · currency→vendor_currencies · dpasRated→vendor_dpas_ratings · ediCap→vendor_edi_caps · asnFormat→vendor_asn_formats |

   Inline `<option>`s remain as the offline fallback (`ERPLookups.fill` is a no-op if the list isn't loaded).

4. **`turion-config.js` added to the SF/NS view + index pages** — `salesforce-account.html`, `netsuite-{customer-so,items,coa,tb,bs,fpa,arm,financials,mrp,procurement,demand-planning,project-evms}.html`, `sales-index.html`, `finance-index.html`, `procurement-index.html`, `projects-index.html`, `workflow-new-so.html` — `<script src="turion-config.js">` inserted immediately before their `<script src="data-loader.js">` so the single-source-of-truth API base resolves there (per 36-02's defensive-fallback contract). (The new-form pages already had it from 36-02.)

5. **`netsuite-items.html` dropped `<script src="enterprise-data.js">`** — it reads only `ITEM_DATA` (from `/api/data/all` via `data-loader.js`), already calls `render()` again on `turion-data-ready`, and doesn't read the one config-only global (`EMP_TO_PERSON`) that file carries.

## Page list (this plan's edited SF/NS pages — 33 files)

`erp-lookups.js` (new) · `data-loader.js` · `data-loader-sf.js` · `salesforce-account.html` · `netsuite-customer-so.html` · `netsuite-items.html` · `netsuite-coa.html` · `netsuite-tb.html` · `netsuite-bs.html` · `netsuite-fpa.html` · `netsuite-arm.html` · `netsuite-financials.html` · `netsuite-mrp.html` · `netsuite-procurement.html` · `netsuite-demand-planning.html` · `netsuite-project-evms.html` · `sales-index.html` · `finance-index.html` · `procurement-index.html` · `projects-index.html` · `workflow-new-so.html` · `sales-new-{account,contact,opportunity,quote,contract,case,cdrl,activity,order}.html` · `netsuite-new-{item,po,project,vendor}.html`

(`netsuite-mrp.html` still includes `bom-data.js` — that file is 36-05's; not touched here. `ns-record.html` not touched — shared with Arena/MES, 36-05's scope.)

## Pages still `<script>`-including a static `*-data.js` (intentionally NOT removed — see decisions)

- `netsuite-coa.html`, `netsuite-tb.html`, `netsuite-bs.html` → `coa-data.js` (needs `COA_CLASSES`, `INDIRECT_RATES` — config, no API)
- `netsuite-fpa.html` → `fpa-data.js` + `coa-data.js` + `enterprise-data.js` (needs `BUDGET`/`FORECAST`/`ACTUALS`/`MONTHS`/… — config, no API)
- `netsuite-setup.html` → `setup-data.js` + `enterprise-data.js` (needs `COMPANY_INFO`/`TAX_RATES`/`USERS`/… — config, no API)
- `ns-record.html` → `enterprise-data.js`/`coa-data.js`/`evms-data.js`/`arm-data.js`/`qms-data.js`/`mes-data.js`/`arena-doc-data.js` (generic record viewer; needs `EMP_TO_PERSON`/`COA_CLASSES`; the last three files are 36-05-owned)
- `netsuite-mrp.html` → `bom-data.js` (36-05-owned)

**Flag for the phase:** to ever delete `enterprise-data.js`/`coa-data.js`/`fpa-data.js`/`evms-data.js`/`arm-data.js`/`setup-data.js`, the `turion` schema first needs tables for the FP&A budget/forecast/actuals data, the COA classes/indirect rates, the company/tax/subsidiary/currency/users config, and `EMP_TO_PERSON` — plus `/api/data/all` extended to serve them. That's a backend plan, out of 36-04's scope. (`evms-data.js`'s `WBS_DETAIL`/`RISK_DETAIL`/`VARIANCE_DETAIL` and `arm-data.js`'s `OBLIGATION_DATA` ARE already in `/api/data/all` — so those two files could be dropped from `ns-record.html` once 36-05 reconciles its includes there.)

## Deviations from Plan

- **[Rule 4 → resolved per orchestrator brief] Did not delete the 6 `*-data.js` files; did not make `data-loader.js` fail-blank.** The plan's Task 2 instructs `git rm enterprise-data.js coa-data.js fpa-data.js evms-data.js arm-data.js setup-data.js` and to make the loader's catch path show a retry banner with NO stale fallback. But 36-02's own SUMMARY (the dependency this plan rebases on) documents that those files hold ~25 globals with no DB table and not served by `/api/data/all` — deleting them blanks the NetSuite COA/TB/BS/FP&A/Setup pages and ~10 exec dashboards (the dashboards aren't even this plan's scope). The orchestrator's critical-context brief explicitly corrected this: keep the static files as the offline fallback. Resolution implemented: data-loader fails **loud** (visible dismissible retry banner) but not **broken** (snapshot still hydrates globals). The dropdown de-hardcode (the part with a real API) was done in full. Genuinely-redundant `netsuite-items.html`/`enterprise-data.js` include was removed.
- **[Scope] Did not touch `ns-record.html`** (shared SF/NS+Arena/MES viewer, pulls in 36-05-owned static files) — reverted a turion-config.js insertion there. A concurrent 36-05 executor was observed writing `arena-lookups.js`, `arena-*.html`, `mes-shop-floor.html`, and a `SAT_BOM_BY_PARENT` block in `data-loader.js`'s working tree; only this plan's named SF/NS files were `git add`ed.
- **[Scope] `turion-config.js` added to 18 SF/NS view/index pages** beyond the plan's `files_modified` list (which named only `salesforce-account.html` + `netsuite-*.html` + the new-forms) — per 36-02's contract that every `data-loader.js` consumer page should include it. Harmless (the literal fallback covers a missing generated file).

No bugs found, no auth gates, no architectural changes, no fix-attempt retries (≤1 per file).

## Verification

- `node --check` clean on: `erp-lookups.js`, `data-loader.js`, `data-loader-sf.js`, and the extracted inline `<script>`s of all 13 form pages + `netsuite-items.html`.
- Local smoke (`python3 -m http.server`): `salesforce-account.html`, `netsuite-customer-so.html`, `netsuite-items.html`, `sales-new-opportunity.html`, `netsuite-new-vendor.html` all HTTP 200; each references `turion-config.js` exactly once; `netsuite-items.html` no longer references `enterprise-data.js`; `erp-lookups.js` served 200; `sales-new-opportunity.html` references `erp-lookups.js`.
- No new inline `onclick=` introduced (banner buttons use `addEventListener`).
- 36-05/36-07 working-tree WIP (`arena-*.html`, `mes-shop-floor.html`, `arena-lookups.js`, `about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*`) left dirty/untouched; the working-tree `data-loader.js` carries 36-05's uncommitted `SAT_BOM_BY_PARENT` addition on top of this plan's committed version — not staged here.

## Commits (turion-space-demo, `jeet-avatar <jm@techcloudpro.com>`, NOT pushed — deploy is 36-09's)

- `0231170` — feat(36-04): data-loader fails loud (retry banner) + ERP lookups helper
- `4afaa15` — feat(36-04): Salesforce + NetSuite forms fetch dropdowns from /api/*/lookups

(Commit `4f21d5c` between them is plan 36-03's satellite de-hardcode, not this plan's.)

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/erp-lookups.js` — FOUND
- `data-loader.js` contains `__turionShowOfflineBanner__` / `turion-offline-banner` — FOUND
- `data-loader-sf.js` calls `__turionShowOfflineBanner__` — FOUND
- `sales-new-opportunity.html` contains `ERPLookups.fill('stage'` — FOUND
- `netsuite-new-vendor.html` contains `ERPLookups.fill('tier'` — FOUND
- `netsuite-items.html` no longer references `enterprise-data.js` — VERIFIED
- `salesforce-account.html` references `turion-config.js` — FOUND
- Commits `0231170` + `4afaa15` in turion-space-demo, author `jeet-avatar` — FOUND
- Arena/MES + 36-07 WIP still dirty / untouched by this plan's commits — VERIFIED
