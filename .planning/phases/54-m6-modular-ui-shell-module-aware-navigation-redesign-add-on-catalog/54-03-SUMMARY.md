---
phase: 54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog
plan: 03
subsystem: turion-space-demo · frontend · catalog · stubs
tags:
  - catalog-page
  - module-catalog
  - landing-stubs
  - bottom-rail
  - hash-routing
  - asc606-external-link
dependency-graph:
  requires:
    - phase-54-01/app-shell-js (window.__ZIETRA_TENANT, window.__ZIETRA_ICONS)
    - phase-53/api-tenants-current
    - phase-41/cognito-auth
  provides:
    - "/catalog.html (13-card MODULE_CATALOG + hash routing + CTA branching)"
    - "/team.html /settings.html /help.html (bottom-rail stubs)"
    - "/stubs/*.html (17 module-landing stubs)"
  affects:
    - downstream/phase-54-04 (CloudFront Function will rewrite /catalog → /catalog.html and /salesforce/customers → /stubs/salesforce-customers.html)
tech-stack:
  added: []
  patterns:
    - pre-baked-shell-marker (no migration needed for new files)
    - one-template-many-stubs (Node-based generator from JSON config)
    - poll-for-shell-globals (await window.__ZIETRA_TENANT up to 5s before fallback)
    - hash-routing-with-highlight (scrollIntoView + temporary is-target class)
key-files:
  created:
    - turion-space-demo/catalog.html (8,980 bytes, 229 LOC)
    - turion-space-demo/team.html (1,864 bytes)
    - turion-space-demo/settings.html (1,893 bytes)
    - turion-space-demo/help.html (1,859 bytes)
    - turion-space-demo/stubs/salesforce-customers.html (1,912 bytes)
    - turion-space-demo/stubs/salesforce-opportunities.html (1,850 bytes)
    - turion-space-demo/stubs/netsuite-invoices.html (1,863 bytes)
    - turion-space-demo/stubs/netsuite-journal-entries.html (1,897 bytes)
    - turion-space-demo/stubs/arena-parts.html (1,888 bytes)
    - turion-space-demo/stubs/arena-change-orders.html (1,857 bytes)
    - turion-space-demo/stubs/mes-work-orders.html (1,883 bytes)
    - turion-space-demo/stubs/mes-build-steps.html (1,837 bytes)
    - turion-space-demo/stubs/quality-ncrs.html (1,861 bytes)
    - turion-space-demo/stubs/quality-capas.html (1,839 bytes)
    - turion-space-demo/stubs/quality-audits.html (1,815 bytes)
    - turion-space-demo/stubs/royalty-agreements.html (1,832 bytes)
    - turion-space-demo/stubs/agents-ncr-capa.html (1,917 bytes)
    - turion-space-demo/stubs/agents-evms.html (1,905 bytes)
    - turion-space-demo/stubs/agents-integration.html (1,913 bytes)
    - turion-space-demo/stubs/marketing-coming-soon.html (1,872 bytes)
    - turion-space-demo/stubs/ramp-cards.html (1,884 bytes)
  modified: []
decisions:
  - "MODULE_CATALOG is the single source of truth for the catalog page — 13 entries, one per unique tenant_features.module_code"
  - "Hash routing /catalog#<code> uses scrollIntoView({behavior:smooth, block:center}) + temporary `is-target` highlight class (CONTEXT §Updates after research point 2)"
  - "ASC 606 entry is external (target=_blank rel=noopener) → https://asc606.zietra.com (CONTEXT §Updates after research point 1) — no clone, no iframe"
  - "Pre-baked ZIETRA-SHELL-INJECTED marker on all 21 new files — 54-02 migration script is idempotent and skips them"
  - "All 20 stubs share one HTML template + per-file JSON config via /tmp/54-03-generate-stubs.mjs — avoids copy-paste drift, all 20 <h1> values unique by construction"
  - "Disabled-module CTA = button with addEventListener (no onclick attribute) — passes audit-erp-buttons gate"
  - "Enabled-module CTA = anchor tag (no button needed) — works without JS for SEO/accessibility"
metrics:
  duration-seconds: 540
  completed-at: 2026-05-14T22:00Z
  tasks: 3
  files-created: 21
  files-modified: 0
  commits: 2
---

# Phase 54 Plan 03: Catalog Page + 17 Module-Landing Stubs + 3 Bottom-Rail Stubs Summary

`/catalog.html` LIVE at `https://turionspace.zietra.com/catalog.html` with a 13-card grid driven by `MODULE_CATALOG` + `window.__ZIETRA_TENANT.features` (Wave-1 shell). Hash routing (`/catalog#asc606`) scrolls to + highlights the matching card. ASC 606 card opens `https://asc606.zietra.com` in a new tab (external CloudFront distribution — not cloned). 17 module-landing stubs live under `/stubs/*.html` (CONTEXT Rule 2 — no dead ends; every nav target is a real page with content + a /catalog back-link). 3 bottom-rail stubs (`/team.html`, `/settings.html`, `/help.html`) at the repo root explain the upcoming phase each stub represents.

## Commits (2)

| Hash | Message |
|------|---------|
| `1863611` | feat(54-03): add /catalog.html — 13-module MODULE_CATALOG + hash routing + CTA branching |
| `6e6e83f` | feat(54-03): add 3 bottom-rail stubs + 17 module-landing stubs |

Both pushed to `origin/main` (interleaved with 54-02's `3e33dab` and `c8ebab3` — see "Wave 2 sequencing" below).

## Files Created (21 total)

### Catalog page (1)

| Path | Bytes | LOC | Purpose |
|------|-------|-----|---------|
| `turion-space-demo/catalog.html` | 8,980 | 229 | 13-card MODULE_CATALOG grid, hash routing, CTA branching, requireSession gate |

### Bottom-rail stubs (3, repo root)

| Path | Bytes | Heading |
|------|-------|---------|
| `turion-space-demo/team.html` | 1,864 | Team Members |
| `turion-space-demo/settings.html` | 1,893 | Workspace Settings |
| `turion-space-demo/help.html` | 1,859 | Zietra Help Center |

### Module-landing stubs (17, under `stubs/`)

| Path | Bytes | Heading |
|------|-------|---------|
| `stubs/salesforce-customers.html` | 1,912 | Salesforce — Customers |
| `stubs/salesforce-opportunities.html` | 1,850 | Salesforce — Opportunities |
| `stubs/netsuite-invoices.html` | 1,863 | NetSuite — Invoices |
| `stubs/netsuite-journal-entries.html` | 1,897 | NetSuite — Journal Entries |
| `stubs/arena-parts.html` | 1,888 | Arena PLM — Part Library |
| `stubs/arena-change-orders.html` | 1,857 | Arena PLM — Change Orders |
| `stubs/mes-work-orders.html` | 1,883 | MES — Work Orders |
| `stubs/mes-build-steps.html` | 1,837 | MES — Build Steps |
| `stubs/quality-ncrs.html` | 1,861 | Arena QMS — Non-Conformance Reports |
| `stubs/quality-capas.html` | 1,839 | Arena QMS — CAPAs |
| `stubs/quality-audits.html` | 1,815 | Arena QMS — Audits |
| `stubs/royalty-agreements.html` | 1,832 | Royalty Management — Agreements |
| `stubs/agents-ncr-capa.html` | 1,917 | AI Agent — NCR → CAPA Closure |
| `stubs/agents-evms.html` | 1,905 | AI Agent — EVMS Watchdog |
| `stubs/agents-integration.html` | 1,913 | AI Agent — Integration Sentinel |
| `stubs/marketing-coming-soon.html` | 1,872 | Zietra Marketing — Coming Soon |
| `stubs/ramp-cards.html` | 1,884 | Ramp — Card Operations |

Mean stub size: ~1,870 bytes (target was 1.5-2 KB per stub — within spec).

## MODULE_CATALOG taxonomy (13 entries)

| code | name | source | open URL |
|------|------|--------|----------|
| crm | Salesforce CRM | Salesforce | /salesforce/customers |
| sales | NetSuite • Sales | NetSuite | /netsuite/sales-orders |
| purchase | NetSuite • Procurement | NetSuite | /netsuite/purchase-orders |
| items | NetSuite • Items | NetSuite | /netsuite/items |
| plm | Arena PLM | Arena PLM | /arena/boms |
| mes | Manufacturing Execution | MES (custom) | /mes/shop-floor |
| quality | Arena QMS | Arena QMS | /quality/ncrs |
| lean-erp-pro | NetSuite Financials | NetSuite | /netsuite/general-ledger |
| asc606 | ASC 606 Revenue Recognition | Aperture (ASC 606) | https://asc606.zietra.com (external ↗) |
| royalty | Royalty Management | Royalty Mgmt | /royalty/agreements |
| dropship | Drop-ship + Ramp | Ramp | /ramp/cards |
| ai-agents | AI Agents | Anthropic Claude | /agents/ncr-capa |
| qb-migration | QuickBooks → NetSuite | Migration | /quickbooks |

## CTA branching matrix

| tenant.plan | module enabled? | CTA | Action |
|-------------|-----------------|-----|--------|
| paid | yes | `Open` anchor | Link to module landing |
| paid | no | `Subscribe` button | `alert('Stripe checkout ships in M4.')` |
| trial | yes | `Open` anchor | Link to module landing |
| trial | no | `Try free` button | `alert('Stripe checkout ships in M4.')` |
| any | yes + external | `Open ↗` anchor target=_blank | Open external URL in new tab |

## Deploy + Invalidation

- **S3 bucket:** `turion-demo-static`
- **CloudFront distribution:** `E37R9PT8IL44L2`
- **Invalidation ID:** `I4TVXRIXE7BQSB3WE4VQVZ1MK8` (Completed)
- **Live URLs verified:**
  - `https://turionspace.zietra.com/catalog.html` → 200 (8,980 bytes)
  - `https://turionspace.zietra.com/team.html` → 200
  - `https://turionspace.zietra.com/settings.html` → 200
  - `https://turionspace.zietra.com/help.html` → 200
  - All 17 `https://turionspace.zietra.com/stubs/*.html` → 200

## Smoke Matrix

| # | Assertion | Result |
|---|-----------|--------|
| A1 | `GET /catalog.html` → 200 | PASS |
| A2 | catalog body contains 13 `code:'` MODULE_CATALOG entries | PASS (13) |
| A3 | catalog body contains `asc606.zietra.com` external link | PASS |
| A4 | catalog body contains `location.hash` handler | PASS |
| A5 | `GET /team.html` → 200 | PASS |
| A6 | `GET /settings.html` → 200 | PASS |
| A7 | `GET /help.html` → 200 | PASS |
| A8 | all 17 `/stubs/*.html` → 200 | PASS (17/17) |
| A9 | served catalog HTML carries `ZIETRA-SHELL-INJECTED` marker | PASS |
| A10 | sample stub has `href="/catalog"` back-link | PASS |
| A11 | sample stub has `cognitoAuth.requireSession` gate | PASS |
| A12 | `npm run audit-buttons` exit 0 (satellite + ERP) | PASS (215 routes / 517 onclick / 70 fetch · 0 violations) |

12/12 smoke PASS.

## Pre-bake invariant (idempotency with 54-02)

All 21 new files carry `<!-- ZIETRA-SHELL-INJECTED -->` baked in at author time. Plan 54-02's migration script (`scripts/inject-shell.mjs`) is idempotent: it scans every HTML file for the marker and skips files that already have it. Verified after 54-02's `c8ebab3` ran:

```
catalog shell-marker count: 1
team   shell-marker count: 1
stubs/salesforce-customers.html marker count: 1
```

No double-injection. 54-02 wrapped 81 existing pages; our 21 new pages were untouched by the migration (idempotency intact).

## Wave 2 sequencing

This plan ran in parallel with **54-02 (migration script + page wrapping)**. Git history shows the interleave:

```
* 6e6e83f feat(54-03): add 3 bottom-rail stubs + 17 module-landing stubs   ← this plan, Task 2
* c8ebab3 feat(54-02): wrap 81 ERP pages with app-shell via migration script
* 1863611 feat(54-03): add /catalog.html — 13-module ...                   ← this plan, Task 1
* 3e33dab feat(54-02): add idempotent inject-shell.mjs migration script
* 04b20c1 feat(54-01): add app-shell.css                                   ← Wave 1
```

Both plans landed cleanly because:
1. 54-02's regex skip-list omits new files (no conflict on `catalog.html`, `team.html`, `settings.html`, `help.html`, or `stubs/*`).
2. 54-03's pre-baked marker means even if 54-02 re-runs, it's a no-op for our files.
3. Both plans deploy independently via `deploy-frontend.sh`; the second deploy's invalidation refreshes everything.

## Pretty URLs (deferred to 54-04)

Pretty URLs (`/catalog`, `/team`, `/salesforce/customers`, …) are NOT wired by this plan — they will be added in **54-04** via the CloudFront Function `turion-clean-urls.js`. Until 54-04 publishes:
- `/catalog` → 404 (only `/catalog.html` resolves)
- `/team` → 404 (only `/team.html` resolves)
- `/salesforce/customers` → 404 (only `/stubs/salesforce-customers.html` resolves)

The bottom-rail nav in `app-shell.js` (Wave 1) already uses the pretty URLs (`/team`, `/catalog`, `/settings`, `/help`). The transitional state until 54-04: the user sees the shell rail BUT clicking those links 404s. This is the documented Wave-2-before-Wave-3 sequencing — known and accepted.

## Tenant features hardening check

Verified Turion's tenant payload at the live API:

```bash
$ curl -s -H "X-Tenant-Slug: turion" \
    "https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current"
{
  "id":"00000000-0000-0000-0000-000000000001",
  "slug":"turion",
  "name":"Turion Space",
  "plan":"paid",
  "trial_ends_at":"2026-06-13T17:56:28.364Z",
  "features": [
    "ai-agents","asc606","crm","dropship","items","lean-erp-pro",
    "mes","plm","purchase","qb-migration","quality","royalty","sales"
  ]
}
```

13 features × paid plan ⇒ Turion's `/catalog.html` renders all 13 cards with `Enabled` pills + `Open` CTAs (the ASC 606 card gets `Open ↗` with target=_blank rel=noopener).

## Deviations from Plan

**None.** Plan executed exactly as written.

### Generator script note

Per Task 2 step 5, used a `/tmp/54-03-generate-stubs.mjs` Node script (with `/tmp/54-03-stub-template.html` + `/tmp/54-03-stubs.json`) to generate all 20 stub files from one template + JSON config. Files left in `/tmp/` for reproducibility; not committed to the repo (generator is one-shot).

## Authentication Gates

None encountered. Deploy went through `deploy-frontend.sh` (S3 sync + CloudFront invalidate) using ambient AWS credentials. No Cognito interaction required.

## Pointer for Wave 3 (54-04)

Plan 54-04 must update `cf-function-source/turion-clean-urls.js` to add these rewrites:

```javascript
// Pretty URLs → /<name>.html
// /catalog              → /catalog.html
// /team /settings /help → /team.html /settings.html /help.html

// Stub URLs → /stubs/<slug>.html
// /salesforce/customers          → /stubs/salesforce-customers.html
// /salesforce/opportunities      → /stubs/salesforce-opportunities.html
// /netsuite/invoices             → /stubs/netsuite-invoices.html
// /netsuite/journal-entries      → /stubs/netsuite-journal-entries.html
// /arena/parts                   → /stubs/arena-parts.html
// /arena/change-orders           → /stubs/arena-change-orders.html
// /mes/work-orders               → /stubs/mes-work-orders.html
// /mes/build-steps               → /stubs/mes-build-steps.html
// /quality/ncrs                  → /stubs/quality-ncrs.html
// /quality/capas                 → /stubs/quality-capas.html
// /quality/audits                → /stubs/quality-audits.html
// /royalty/agreements            → /stubs/royalty-agreements.html
// /agents/ncr-capa               → /stubs/agents-ncr-capa.html
// /agents/evms                   → /stubs/agents-evms.html
// /agents/integration            → /stubs/agents-integration.html
// /marketing/coming-soon         → /stubs/marketing-coming-soon.html
// /ramp/cards                    → /stubs/ramp-cards.html
```

After 54-04 publishes, the catalog's "Open" CTAs become functional for modules that don't already have a real landing page (e.g., `/sales/orders` exists today and works as-is; `/salesforce/customers` becomes a stub via the rewrite).

## Deferred Items

1. **Stripe checkout** — `Subscribe` and `Try free` CTAs currently fire `alert('Stripe checkout ships in M4.')`. Wires in M4 (Stripe billing milestone).
2. **Catalog detail pages** (`/catalog/<code>`) — plan only ships the single grid page; per-module detail pages with screenshots + pricing are a future enhancement (M7 marketing site).
3. **Pretty-URL rewrites** — deferred to 54-04 as designed.
4. **Backend `backend/dist/*` working-tree drift** — pre-existing modifications to `backend/dist/routes/tenants.js` + `backend/dist/middleware/tenant.js` were inherited from 54-01; not touched by this plan.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/catalog.html` exists — FOUND (8,980 bytes, 13 MODULE_CATALOG entries)
- `/Users/jeet/turion-space-demo/team.html` exists — FOUND (1,864 bytes)
- `/Users/jeet/turion-space-demo/settings.html` exists — FOUND (1,893 bytes)
- `/Users/jeet/turion-space-demo/help.html` exists — FOUND (1,859 bytes)
- 17 stub files in `/Users/jeet/turion-space-demo/stubs/` — FOUND (17/17)
- Commit `1863611` — FOUND in git log (`feat(54-03): add /catalog.html …`)
- Commit `6e6e83f` — FOUND in git log (`feat(54-03): add 3 bottom-rail stubs + 17 module-landing stubs`)
- CloudFront invalidation `I4TVXRIXE7BQSB3WE4VQVZ1MK8` — Completed
- Live smoke 12/12 — PASS (all stubs return 200, audit-buttons exit 0)
- Shell marker on all 21 new files — verified by grep (exactly 1 occurrence each)
- All 20 stub `<h1>` headings unique — verified (find + grep + sort -u = 20)
