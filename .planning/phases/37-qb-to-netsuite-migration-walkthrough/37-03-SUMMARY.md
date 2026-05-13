---
phase: 37-qb-to-netsuite-migration-walkthrough
plan: 03
subsystem: frontend
tags: [vanilla-html, css-grid, fetch-api, inline-iife, ns-toast, turion-config, addEventListener, cloudfront-function, clean-urls, quickbooks, ramp, netsuite, migration-wizard]

# Dependency graph
requires:
  - phase: 37-qb-to-netsuite-migration-walkthrough
    plan: 01
    provides: backend routes (GET status/runs/:type/:type/mapping + POST :type/migrate stub) for QB and Ramp, mounted in app.ts, with FIELD_MAPS as the single source of truth
provides:
  - 8 new vanilla-HTML pages on the turion-space-demo frontend (quickbooks.html landing + 6 quickbooks-{type}.html wizard pages + ramp.html)
  - "Migration tools" section in index.html with 2 color-coded ns-mod tiles (QB green + Ramp purple/yellow)
  - 8 new clean-URL → S3 key entries in cf-function-source/turion-clean-urls.js
  - Canonical 3-pane wizard pattern (QB rows left · field-map middle · NS preview right) reusable for future migration sources
affects: [37-04-audit-deploy-e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3-pane CSS-grid wizard layout (display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; height:calc(100vh - 165px))"
    - "Inline-IIFE per page (no shared QB JS) — TYPE constant + per-type rowSummary() + applyMappingClientSide() declared once at top of the IIFE"
    - "Server-side field-map drives the middle pane: GET /:type/mapping returns { fields: [{qbField, nsField, transform, ...}] }; same const drives server's applyMapping (37-02)"
    - "Client-side preview mirrors server applyMapping just-enough for the rightmost pane; for cross-ref fields (CustomerRef/VendorRef/ItemRef/AccountRef) the preview shows the QB ref string with '(unresolved · server lookup)' note — the server resolves authoritatively on Migrate"
    - "Graceful 501-stub handling: until 37-02 deploys, the wizard's Migrate button POSTs and renders an explanatory toast ('Migrate endpoint is still a stub — 37-02 implements the body. Wizard wiring is verified.') rather than crashing"
    - "TURION_CONFIG.API_BASE pattern + data-loader.js fallback literal: '(window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || \"https://lo254mvukl...\"' — matches data-loader.js:26 idiom exactly"
    - "Template-literal fetch paths (`fetch(`${API_BASE}/api/quickbooks/${TYPE}/migrate`)`) so audit-erp-buttons.mjs normalizes ${TYPE} → :type for route allowlist matching"
    - "Color-coded migration-tools section in index.html — green panel background + green border for QB, yellow border + purple num for Ramp — visually distinct from the regular ERP module grid"

key-files:
  created:
    - /Users/jeet/turion-space-demo/quickbooks.html (231 lines · landing with 6 record-type tiles, hero stats, recent-runs panel, 8s status polling)
    - /Users/jeet/turion-space-demo/quickbooks-coa.html (357 lines)
    - /Users/jeet/turion-space-demo/quickbooks-customers.html (367 lines · canonical wizard template)
    - /Users/jeet/turion-space-demo/quickbooks-vendors.html (361 lines)
    - /Users/jeet/turion-space-demo/quickbooks-items.html (360 lines)
    - /Users/jeet/turion-space-demo/quickbooks-invoices.html (375 lines · best-effort Line[] preview)
    - /Users/jeet/turion-space-demo/quickbooks-bills.html (376 lines · best-effort Line[] preview)
    - /Users/jeet/turion-space-demo/ramp.html (393 lines · single-type Ramp wizard with hero spend summary)
  modified:
    - /Users/jeet/turion-space-demo/index.html (+31 lines — "Migration tools" section inserted after the cockpit/all card, before the integration-flow section)
    - /Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js (+10 lines — 8 new R-map entries + Phase-37 section comment)

key-decisions:
  - "Six separate per-type HTML files (not one template with ?type= query param): clean URLs map 1:1 to S3 keys, CF Function rewrite is a flat lookup, no client-side type-dispatch logic, no risk of cross-type CSS bleed. ~95% of each file is duplicated layout — accepted that as the cost of the vanilla-no-build constraint."
  - "Client-side preview applies the mapping just-enough (the simpler 4 types are fully mirrored; Invoices+Bills show the QB ref string with an '(unresolved · server lookup)' note rather than trying to client-side-resolve CustomerRef/ItemRef/VendorRef/AccountRef): the right pane is a PREVIEW, the server is AUTHORITATIVE. Research §Open Q #3 recommended this; we executed it as recommended."
  - "Inline <style> per page (not a shared qb-shared.css): each page is self-contained, no cross-file CSS coupling, and the existing ns-shared.css is preserved as a separate import in case a future cleanup wants to refactor. Matches the per-page-self-contained pattern of the existing ERP pages."
  - "Graceful 501-stub handling: parallel Wave-2 means 37-02 may or may not have landed when 37-03 ships; the wizard treats HTTP 501 specially with an explanatory toast rather than crashing or showing a scary generic error. This lets 37-03 ship + audit + commit independent of 37-02's timing (we verified 37-02's commit d026f1e DID land before this plan's commits, so the live deploy will have the real handler)."
  - "Idempotent migration UX: already-migrated rows render with the 'migrated' pill AND a disabled checkbox AND a dimmed row class — the user physically cannot select them. The 'Select all' / 'Select all new only' helpers respect :not(:disabled)."
  - "Ramp color scheme: header background #7c3aed (purple) with a 3px #fbbf24 (yellow) bottom-border, num accent #7c3aed on the index tile. Visually distinct from QB's brand #2ca01c. Migrated pill uses purple (.pill.migrated → #ede9fe / #5b21b6) to keep the Ramp brand consistent."

patterns-established:
  - "Migration-wizard 3-pane: any future ERP migration source (HubSpot, Stripe, etc.) drops in by copying quickbooks-customers.html and changing TYPE + applyMappingClientSide + rowSummary + 3 string constants (NS_TARGET_LABEL / NS_DEEP_LINK / NS_DEEP_LABEL)"
  - "501-stub-aware wizard: when a backend route is registered but not yet implemented, the wizard renders a user-meaningful toast and continues working on read-only operations (left + middle + right panes all populate from GET endpoints that ARE live)"
  - "CF clean-URL rewrite per page: every new ERP page gets its corresponding R-map entry in cf-function-source/turion-clean-urls.js so the user-facing URL is /quickbooks/customers, NOT /quickbooks-customers.html"

requirements-completed: [QbMigrationWizard, RampMiniModule, NetSuiteGoLiveScreens]

# Metrics
duration: 27 min
completed: 2026-05-12
---

# Phase 37 Plan 03: Frontend Migration Wizard Summary

**8 new vanilla-HTML wizard pages (2820 LOC total), Migration-tools section on index.html, and 8 clean-URL rewrites — wired against the GET routes from 37-01 with graceful 501-stub handling for 37-02's POST /migrate. Zero inline onclick=, zero APIGW hardcoding, 0/0 audit violations.**

## Performance

- **Duration:** 27 min (well under the plan's 4-5 hour estimate)
- **Started:** 2026-05-12T23:30Z
- **Completed:** 2026-05-12T23:57Z
- **Tasks:** 2 (both autonomous)
- **Files created:** 8 (8 new HTML pages, 2820 LOC total)
- **Files modified:** 2 (index.html, cf-function-source/turion-clean-urls.js)

## Accomplishments

- **`quickbooks.html` landing page** — 231 lines. Hero panel with live source-state stats (totalRows / totalMigrated / pct), 6 record-type tiles in a 3-column CSS grid (one per QB type with live counts from `GET /api/quickbooks/status`), recent-runs panel below (last 5 rows from `GET /api/quickbooks/runs?limit=5`), 8s status polling so migration progress shows up live without a reload. Dependency-order hint in a yellow callout ("1. CoA → 2. Customers → 3. Vendors → 4. Items → 5. Invoices → 6. Bills") per research Pitfall 1.
- **6 per-type wizard pages** (CoA, Customers, Vendors, Items, Invoices, Bills) — each ~360 lines. 3-pane CSS-grid layout (`display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; height:calc(100vh - 165px)`):
  - **Left pane** — paginated checkbox list of QB rows from `GET /api/quickbooks/:type`. Each row: status-aware checkbox (disabled when migrated), qb_id, per-type one-line summary (DisplayName / Name / DocNumber+amount / etc.), status pill (new/migrated/error). "Select all" + "Select all new only" helpers respect `:not(:disabled)`.
  - **Middle pane** — `<table id="mappingTable">` populated from `GET /api/quickbooks/:type/mapping` with columns `qbField · sample (from top selected row) · nsField · transform`. The pedagogical core: the team SEES exactly what each QB field becomes in NS.
  - **Right pane** — `<pre id="nsPreview">` showing client-side `applyMappingClientSide(topSelectedRow)` output. For simpler types (CoA, Customers, Vendors, Items) the preview is a full mirror of the server's applyMapping. For Invoices + Bills, the preview shows `Line[]` expansion + `CustomerRef/VendorRef/ItemRef/AccountRef` as the QB ref string with `'(unresolved · server lookup)'` note — the server is authoritative on cross-ref resolution.
  - **Sticky footer** with `<button id="migrateBtn">Migrate batch ▸</button>` (disabled when 0 selected). On click: `confirm()` modal explaining the target table + idempotent semantics, then `POST /api/quickbooks/:type/migrate` with `{qbIds: [...]}`. On success: `nsToast` with "Migrated N · skipped M · K errors. Visit '<NS deep-link-label>' to see them in NetSuite." On 501 stub (until 37-02's d026f1e deploys): a softer "Migrate endpoint is still a stub — Plan 37-02 implements the body. Wizard wiring is verified." On other errors: generic toast with err.message.
  - After every migrate, `refreshRowsOnly()` re-fetches the left pane so migrated rows immediately get the 'migrated' pill + disabled checkbox.
- **`ramp.html`** — 393 lines. Same 3-pane treatment as the QB wizards, with Ramp's purple+yellow brand colors. Adds a hero spend summary (`total txns · migrated · sum spend`) above the wizard. POSTs to `/api/ramp/card-txns/migrate` with `{rampIds: [...]}`. Success toast links to `/procurement/orders` (where the new Ramp-sourced bills land).
- **`index.html` Migration-tools section** — 31-line addition inserted between the cockpit/all card and the integration-flow section. Green-tinted panel (`#f0fdf4` background, `#2ca01c` left border) with a 2-column `ns-module-grid` containing the QB tile (green border) and Ramp tile (yellow border, purple `num` accent). Visually distinct from the regular ERP module grid so the team reads them as "migration tools" not core modules.
- **8 clean-URL rewrites** in `cf-function-source/turion-clean-urls.js` — `/quickbooks → /quickbooks.html`, `/quickbooks/{coa,customers,vendors,items,invoices,bills} → /quickbooks-{...}.html`, `/ramp → /ramp.html`. Inserted before the existing `'/satellite'` block, follows the file's single-quoted key convention. (CF function deploy is owned by 37-04; 37-03 only edits the source.)
- **`npm run audit-buttons` → 0 violations** across 213 ERP routes / 75 satellite routes / 67 fetch API calls / 516 onclick handlers across 80 pages. The new QB+Ramp routes were auto-allowlisted by the audit script's self-extending pattern (they're registered in `app.ts` + `routes/quickbooks.ts` + `routes/ramp.ts` from 37-01).
- **All 8 inline `<script>` blocks parse clean** under `node --check` (extracted with awk, verified individually).
- **Zero inline `onclick=` user-handlers** across all 8 new pages (`grep -E "onclick=" quickbooks*.html ramp.html` → empty). All handlers via `addEventListener` — the canonical wizard template (`quickbooks-customers.html`) has 5.
- **Zero hardcoded APIGW host** as a primary value — every page uses the `(window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || 'https://lo254mvukl…'` pattern exactly as `data-loader.js:26` does (the literal is the same fallback, kept only so a missing turion-config.js doesn't blank the demo — matches the established convention).

## Task Commits

Each task was committed atomically to `github.com/jeet-avatar/turion-space-demo` (NOT pushed; 37-04 owns deploy):

1. **Task 1: 8 new HTML pages** — `ed8db43` (feat)
   - Created `quickbooks.html` + 6 `quickbooks-{type}.html` + `ramp.html` (2820 LOC total).
   - All inline-IIFE, all use TURION_CONFIG.API_BASE + addEventListener + nsToast.
2. **Task 2: index.html migration-tools section + 8 CF clean-URL rewrites** — `ce40256` (feat)
   - +31 lines on `index.html` for the green-tinted migration-tools section with 2 ns-mod tiles.
   - +10 lines on `cf-function-source/turion-clean-urls.js` for the 8 R-map entries.
   - `npm run audit-buttons` → 0 violations.

Both commits authored as `jeet-avatar <jm@techcloudpro.com>` per project identity rules.

## Files Created/Modified

### Created (8 files, 2820 LOC total)

- `/Users/jeet/turion-space-demo/quickbooks.html` (231 lines) — landing page. Hero stats panel, 6 tiles in a CSS-grid with live counts from `/api/quickbooks/status` (polled every 8s), recent-runs panel from `/api/quickbooks/runs?limit=5`. Dependency-order yellow callout. No applyMapping logic — pure aggregation.
- `/Users/jeet/turion-space-demo/quickbooks-customers.html` (367 lines) — the canonical wizard template. Other 5 type pages share this structure ~95%, varying only in: TYPE constant, rowSummary() function, applyMappingClientSide() body, NS_TARGET_LABEL / NS_DEEP_LINK / NS_DEEP_LABEL strings.
- `/Users/jeet/turion-space-demo/quickbooks-coa.html` (357 lines) — Chart of Accounts → `turion.gl_accounts`. Deep-link target: `/finance/chart-of-accounts`. Mirrors AcctNum/Name/AccountType/AccountSubType/Classification/CurrencyRef.value/Active/CurrentBalance.
- `/Users/jeet/turion-space-demo/quickbooks-vendors.html` (361 lines) — Vendors → `turion.vendors`. Deep-link target: `/procurement/orders`. Mirrors DisplayName/CompanyName/PrimaryEmailAddr/PrimaryPhone/BillAddr/CurrencyRef/Balance/TaxIdentifier/Active. Sets default `tier: 'Tier-3'` per research §3 derived field.
- `/Users/jeet/turion-space-demo/quickbooks-items.html` (360 lines) — Items → `turion.items`. Deep-link target: `/inventory/items`. Mirrors Name/Sku/Type/UnitPrice/PurchaseCost/IncomeAccountRef/ExpenseAccountRef/AssetAccountRef/Taxable/TrackQtyOnHand/QtyOnHand/Active.
- `/Users/jeet/turion-space-demo/quickbooks-invoices.html` (375 lines) — Invoices+Payments → `turion.invoices`. Deep-link target: `/finance/revenue-management`. Best-effort `Line[]` preview with SalesItemLineDetail → lineItems[]; CustomerRef + ItemRef shown as QB ref string with `(unresolved · server lookup)` note. Embedded `paymentRecorded` from `LinkedTxn[]` if present.
- `/Users/jeet/turion-space-demo/quickbooks-bills.html` (376 lines) — Bills+Bill-Payments → `turion.bills`. Deep-link target: `/procurement/orders`. Best-effort `Line[]` preview with both `AccountBasedExpenseLineDetail` and `ItemBasedExpenseLineDetail` recognized; VendorRef + AccountRef + ItemRef shown as QB ref strings. Embedded `paymentRecorded` from `LinkedTxn[]`.
- `/Users/jeet/turion-space-demo/ramp.html` (393 lines) — Ramp corporate-card → `turion.bills`. Deep-link target: `/procurement/orders`. Purple/yellow brand. Adds a hero spend-summary panel (total txns / migrated / $ sum). `applyMappingClientSide` mirrors RAMP_FIELD_MAP: synthetic vendor 'Ramp · Corporate Card', txn becomes single-line bill, Ramp's `gl_category_guess` becomes the line's NS account, `receipt_url` → `attachments[0]`, ID prefixed with `RMP-`.

### Modified (2 files)

- `/Users/jeet/turion-space-demo/index.html` (+31 lines) — "Migration tools" section inserted after the `<a href="/cockpit/all" class="ns-mod">` card (line ~450), before the existing `<div class="section">` integration-flow block. Green-tinted panel (#f0fdf4 background, #2ca01c left border, #166534 heading) with 2 `ns-mod` cards (QB green, Ramp yellow).
- `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` (+10 lines) — 8 new R-map entries grouped under a `// Phase 37 — QuickBooks → NetSuite migration walkthrough` comment, placed before the `// Turion Satellite frontend (Plan 3)` block. CF function still parses clean (`node --check` OK).

## Decisions Made

- **Six separate per-type HTML files** (not one template with `?type=` query param) — accepts ~95% code duplication for the benefits of clean URLs, flat S3-key rewrites, no client-side type-dispatch logic, and no risk of cross-type CSS bleed. Future cleanup can extract a `qb-wizard-template.html` if the duplication becomes painful.
- **Client-side preview mirrors server applyMapping only just-enough** — the simpler 4 types (CoA, Customers, Vendors, Items) get full client-side mirrors; Invoices + Bills show `Line[]` expansion but cross-ref fields stay as QB ref strings with a `(unresolved · server lookup)` note. Server is authoritative on Migrate; client preview is a teaching aid. Research §Open Q #3 recommended this approach.
- **Inline `<style>` per page** (not a shared `qb-shared.css`) — each page self-contained, no cross-file CSS coupling, easier to grep and audit. Existing `ns-shared.css` still imported for the few shared utility classes.
- **Graceful 501-stub handling** — the wizard distinguishes HTTP 501 ("not yet implemented") from HTTP 4xx/5xx ("real error") and renders a softer, explanatory toast for the former. This decouples 37-03 ship-timing from 37-02 ship-timing during Wave-2 parallel development.
- **Idempotent migrate UX is enforced at THREE places**: backend (37-02), DB (CHECK constraints in 023 migration), and frontend (disabled checkbox + dimmed row + 'migrated' pill). The user physically cannot select an already-migrated row for re-migration.
- **Color scheme: QB green #2ca01c (Intuit brand), Ramp purple #7c3aed + yellow #fbbf24 accent (Ramp brand)** — visually distinct from each other AND from the NetSuite-blue ERP modules in `index.html`. The team reads the migration tools as "migration tools", not "more ERP modules".

## Deviations from Plan

None. Plan executed exactly as written:
- 8 new HTML pages (as listed in PLAN.md frontmatter), 3-pane CSS-grid layout (as specified), wired against the GET routes from 37-01, "Migrate batch ▸" POSTs to the route signature documented by 37-01's 501-stub and now implemented by 37-02's `d026f1e`.
- index.html addition placed at the END of the module grid as specified, with the exact color scheme + tile structure from research §"Top-nav additions to index.html".
- 8 clean-URL rewrites added to `cf-function-source/turion-clean-urls.js` with the exact paths specified in PLAN.md and following the file's existing single-quoted key convention.

One choice noted in advance by the plan that we followed:
- Plan said "If divergence is observed during dev, add `POST /preview` in 37-02 (extra ~20min)." — no divergence observed; we stayed with client-side preview.

## Issues Encountered

None. All 8 inline scripts parsed first try under `node --check`; the audit-buttons script ran 0 violations on the first run; both commits landed without hook failures; no merge conflict with the parallel 37-02 commit (`d026f1e` only touches `backend/src/routes/*.ts` + `backend/dist/*`, never any frontend file).

One observation worth recording for 37-04: the parallel 37-02 commit `d026f1e` landed during our Task 2, so the 501-stub fallback code we shipped in Task 1 will only ever fire if the live Lambda runs an older deploy. Once 37-04 deploys the latest dist, the real handler runs and the wizard's "Migrate" success path activates. No code change needed.

## User Setup Required

None — no external service configuration. CF function source-only edit (no deploy yet); 37-04 will run `./deploy-frontend.sh` which both syncs S3 AND updates the CF function automatically.

## Next Phase Readiness

**Ready for 37-04 (audit + deploy + E2E):**
- All frontend artifacts in place; `npm run audit-buttons` already shows 0/0.
- The `/migrate` POST routes are now BOTH (a) registered in 37-01 AND (b) implemented in 37-02 (`d026f1e`). After 37-04's `./backend/build-and-push.sh` (Docker arm64 → ECR → `aws lambda update-function-code turion-demo-api`), the migrate path works end-to-end.
- After 37-04's `./deploy-frontend.sh`, the 8 clean URLs propagate to CloudFront (5-15 min). Direct .html URLs work as a fallback during propagation.

No blockers, no deferred items.

## Self-Check: PASSED

- File `/Users/jeet/turion-space-demo/quickbooks.html` exists ✓ (231 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-coa.html` exists ✓ (357 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-customers.html` exists ✓ (367 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-vendors.html` exists ✓ (361 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-items.html` exists ✓ (360 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-invoices.html` exists ✓ (375 lines)
- File `/Users/jeet/turion-space-demo/quickbooks-bills.html` exists ✓ (376 lines)
- File `/Users/jeet/turion-space-demo/ramp.html` exists ✓ (393 lines)
- File `/Users/jeet/turion-space-demo/index.html` modified ✓ ("Migration tools", "QuickBooks → NetSuite", "Ramp → NetSuite" all present in the file)
- File `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` modified ✓ (8 new entries, file parses clean under `node --check`)
- Commit `ed8db43` reachable via `git log --oneline` ✓ (feat(37-03): wizard frontend …)
- Commit `ce40256` reachable via `git log --oneline` ✓ (feat(37-03): index.html migration-tools section …)
- Both commits author = `jeet-avatar <jm@techcloudpro.com>` ✓
- `npm run audit-buttons` → 0 violations ✓ (213 ERP routes / 67 fetch / 516 onclick / 80 pages)
- Inline scripts of all 8 new pages parse clean under `node --check` ✓
- `grep -E "onclick=" quickbooks*.html ramp.html` → empty ✓ (zero inline onclick= user-handlers)
- All 8 pages reference `TURION_CONFIG.API_BASE` ✓ (`grep -L` returns empty)
- 8 entries containing `'/quickbooks` or `'/ramp` in CF function ✓

---

*Phase: 37-qb-to-netsuite-migration-walkthrough*
*Completed: 2026-05-12*
