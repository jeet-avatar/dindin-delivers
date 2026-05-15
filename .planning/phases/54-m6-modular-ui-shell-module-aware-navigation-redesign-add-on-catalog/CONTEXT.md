# Phase 54 CONTEXT — Modular UI shell + module-aware navigation redesign + add-on catalog (M6 P1)

> User strategy 2026-05-14: "left side sales / procurement / finance — let name the navigation more better more clear — because each one I open it goes to dashboard — plan this to make it the best looking UI and UX design". This phase is the visual transformation that makes `<tenant>.zietra.com` look like a real ERP SaaS instead of an obvious clone of `turionspace.zietra.com`.

---

## Phase 54 scope (from ROADMAP)

Single app shell at `<tenant>.zietra.com` with a redesigned LEFT-SIDE NAVIGATION that names each module by its source system. Each nav item clicks straight to a meaningful work-surface page (NOT a generic dashboard). Dynamic nav rendered from the tenant's `tenant_features` rows. `/catalog` page lists every add-on with description + "Try it free" CTA. Per-tenant chrome: header shows tenant name + plan badge + trial countdown. Playwright E2E scaffold + 20 nav-traversal tests bootstrapped here.

**Requirement IDs (8):**
- `AppShell`
- `ModuleAwareNavigation`
- `NavigationLandingPages`
- `CatalogPage`
- `AddOnCTAs`
- `ShellWrapperForExistingPages`
- `TenantBrandedChrome`
- `PlaywrightE2EScaffold`

---

## LOCKED DECISIONS

### Navigation taxonomy — module-aware labels

Current nav labels ("Sales", "Procurement", "Finance") are TOO GENERIC and all dump into the same dashboard. New taxonomy: **every label references the source system it represents**, so users see the cross-system interconnection. Each item lands on a real work surface, not a dashboard.

**Top-level groups (left rail) + landing pages:**

| Group | Module label | Source system | Landing page | tenant_features.module_code |
|-------|--------------|---------------|--------------|------------------------------|
| **CRM & Sales** | `Salesforce • Customers` | Salesforce | `/salesforce/customers` (customer list) | `crm` |
| | `Salesforce • Opportunities` | Salesforce | `/salesforce/opportunities` | `crm` |
| | `NetSuite • Sales Orders` | NetSuite | `/netsuite/sales-orders` | `sales` |
| | `NetSuite • Invoices` | NetSuite | `/netsuite/invoices` | `sales` |
| **Procure-to-Pay** | `NetSuite • Vendors` | NetSuite | `/netsuite/vendors` | `purchase` |
| | `NetSuite • Purchase Orders` | NetSuite | `/netsuite/purchase-orders` | `purchase` |
| | `Ramp • Card Operations` | Ramp | `/ramp/cards` | `dropship` (proxy — Ramp is part of P2P) |
| **Inventory & Items** | `NetSuite • Items` | NetSuite | `/netsuite/items` | `items` |
| | `NetSuite • Inventory` | NetSuite | `/netsuite/inventory` | `items` |
| **PLM (Engineering)** | `Arena • Part Library` | Arena PLM | `/arena/parts` | `plm` |
| | `Arena • BOMs` | Arena PLM | `/arena/boms` | `plm` |
| | `Arena • Change Orders` | Arena PLM | `/arena/change-orders` | `plm` |
| | `Turion Satellite PLM` | Custom satellite app | `/satellite/` | `plm` (Turion-specific; other tenants get a stub if they don't have satellite domain) |
| **Manufacturing** | `MES • Shop Floor` | MES | `/mes/shop-floor` | `mes` |
| | `MES • Work Orders` | MES | `/mes/work-orders` | `mes` |
| | `MES • Build Steps` | MES | `/mes/build-steps` | `mes` |
| **Quality** | `Arena • NCRs` | Arena QMS | `/quality/ncrs` | `quality` |
| | `Arena • CAPAs` | Arena QMS | `/quality/capas` | `quality` |
| | `Arena • Audits` | Arena QMS | `/quality/audits` | `quality` |
| **Finance** | `NetSuite • General Ledger` | NetSuite | `/netsuite/general-ledger` | `lean-erp-pro` |
| | `NetSuite • Journal Entries` | NetSuite | `/netsuite/journal-entries` | `lean-erp-pro` |
| | `NetSuite • Chart of Accounts` | NetSuite | `/netsuite/chart-of-accounts` | `lean-erp-pro` |
| | `NetSuite • FP&A` | NetSuite | `/netsuite/fpa` | `lean-erp-pro` |
| **Revenue & Royalty** | `ASC 606 Revenue Recognition ↗` | ASC 606 module | `https://asc606.zietra.com ↗` (external) | `asc606` |
| | `ASC 606 • Performance Obligations ↗` | ASC 606 | `https://asc606.zietra.com/performance-obligations ↗` (external) | `asc606` |
| | `Royalty Management` | Royalty Mgmt | `/royalty/agreements` | `royalty` |

> **ASC 606 note:** asc606.zietra.com is a separate, real, running CloudFront distribution (Aperture standalone — see MEMORY: "ASC606 (Aperture) demo · LIVE on AWS at asc606.zietra.com"). The nav opens this in a new tab (`target="_blank" rel="noopener"`); we DO NOT clone, stub, or iframe it. Treated as `external:true` in `NAV_TAXONOMY`. See §"Updates after research".
| **AI Agents** | `AI Agent • NCR → CAPA Closure` | Anthropic Claude | `/agents/ncr-capa` | `ai-agents` |
| | `AI Agent • EVMS Watchdog` | Anthropic Claude | `/agents/evms` | `ai-agents` |
| | `AI Agent • Integration Sentinel` | Anthropic Claude | `/agents/integration` | `ai-agents` |
| **Migration Tools** | `QuickBooks → NetSuite` | QB-Migration | `/quickbooks` | `qb-migration` |
| | `Ramp → NetSuite` | Ramp-Migration | `/ramp` | `qb-migration` (bundled) |
| **Marketing (M7)** | `Zietra Marketing` | Coming-soon stub | `/marketing/coming-soon` | `marketing` (NEW module_code) |

**Bottom rail (always visible, regardless of features):**
- `/team` — Team members + invites (Phase 54.1)
- `/catalog` — Add-on catalog
- `/settings` — Tenant settings (plan, trial countdown, billing — M4 wires)
- `/help` — Help center / docs (M7)

**Module groups collapse/expand:** each top-level group ("CRM & Sales", "Procure-to-Pay", etc.) is a collapsible section header. By default the user's current section is expanded; others collapsed.

**Disabled modules** (`tenant_features.enabled = false`): grey out the entire group + show single "+ Add to plan" CTA that opens `/catalog#<code>` (hash anchor — see §"Updates after research").

**Active module module is highlighted**: full-color icon + bold label + left-edge accent bar.

### Design system

- **Palette:** Zietra purple `#7c3aed` (primary), slate dark `#0b1020` (chrome bg), white `#ffffff` (canvas), accent green `#10b981` (success/active), warning amber `#f59e0b` (trial countdown), error red `#ef4444`
- **Typography:** `Inter` (system fallback `system-ui, -apple-system, sans-serif`) — same as existing Zietra pages
- **Spacing:** 4px base unit, 8/12/16/24/32/48 standard
- **Left rail width:** 240px (collapsed: 64px icon-only)
- **Top bar height:** 56px — contains tenant name, plan badge, trial countdown, user avatar+menu
- **Reference design systems** (research these for inspiration): **Linear** (clean left rail + module groups), **Notion** (collapsible sections), **Stripe Dashboard** (top bar pattern + chrome). DO NOT clone — borrow patterns.
- **Icons:** Lucide icons (CDN, no build step) — small (16-20px) inline with labels
- **Density:** Comfortable (not compact) — this is an admin tool, readability > density

### Per-tenant chrome (header)

Top bar shows:
- **Left:** Workspace name (`Turion Space` / `Dollor`) + small "Workspace" label. Click → `/settings`.
- **Middle:** breadcrumb (e.g., `Procure-to-Pay › NetSuite • Purchase Orders`)
- **Right:** Plan badge (`Trial` / `Paid`) + trial countdown ("12 days left" if trial) + user avatar with dropdown (Profile, Settings, Sign out)

### Shell wrapper for existing pages

DO NOT rewrite existing HTML pages. Inject a shell wrapper script at the top of each page:
```html
<!-- ZIETRA-SHELL: injected by migration script — Phase 54 -->
<script src="/app-shell.js" defer></script>
<link rel="stylesheet" href="/app-shell.css">
```
`app-shell.js` runs after DOM ready, wraps `<body>` content in shell chrome, renders left rail + top bar, intercepts no clicks (pages keep their own behavior).

Migration script: idempotent injection (marker comment), covers all 96 ERP + satellite pages.

### Catalog page

`/catalog` — full-page list of all 13 modules (+ marketing future stub). Each card:
- Icon + module name (e.g., `Arena • PLM`)
- One-line description ("Engineering BOM management and change orders")
- Status: `Enabled` / `In your plan` / `+ Add to plan`
- CTA: `Open` (if enabled) / `Try free` (in trial, if disabled) / `Subscribe` (stub for M4)
- Detail page `/catalog/<module-code>` shows screenshots, key features, pricing placeholder

### Playwright E2E scaffold

- `tests/e2e/` directory in `turion-space-demo/`
- `playwright.config.ts` targeting `https://turionspace.zietra.com` (Turion) + dynamic tenant URL (smoke creates fresh tenant)
- Baseline tests (20+):
  - signup → magic-link → land on tenant home (4 tests)
  - left rail renders all enabled module groups (1 test per group = 11 tests)
  - each top-level click → correct landing URL + no console errors (one assertion per module = ~13 tests)
  - catalog page renders all 13 cards with correct CTAs
  - team page renders + invite form visible (stub for 54.1)
  - sign out → returns to login

---

## Updates after research (post-2026-05-14)

Two prior "LOCKED" items were demoted to **Claude's Discretion** after research surfaced better answers. The intent of both items is preserved; only the implementation form changed.

1. **ASC 606 nav URLs → external link-out to `https://asc606.zietra.com`** (was: on-distribution `/asc606/contracts` + `/asc606/performance-obligations`). Rationale: asc606.zietra.com is already a separate, fully built, LIVE CloudFront distribution running the Aperture ASC 606 demo (see MEMORY: "ASC606 (Aperture) demo · LIVE on AWS at asc606.zietra.com (May 6, 2026)"). Cloning or stubbing it onto the Turion distribution would be redundant work that violates Global Rule #5 (no unnecessary code) and Rule #6 (no shortcuts). The nav opens it in a new tab with the `↗` link-out glyph. Plans 54-01 + 54-04 already use this treatment.

2. **Catalog deep-link → hash anchor `/catalog#<module-code>`** (was: query param `/catalog?module=<code>`). Rationale: research recommended the hash anchor because it scrolls smoothly to the target card via `Element.scrollIntoView({behavior:'smooth'})` without a page reload, and it preserves browser-back behavior between cards. Implementation handled in 54-03 (`catalog.html` reads `location.hash`).

Both items remain governed by all Global Engineering Rules (#1 no hardcoded values, #2 no dead ends, #3 verify before assuming, #4 consistent workflows, #5 dead-code removal, #6 no unnecessary code).

---

## Critical scope boundaries

**IN:**
- New shared `app-shell.js` + `app-shell.css` (vanilla JS — no React, no build step)
- New `catalog.html` + per-module detail pages (`catalog/<code>.html` or single SPA-style)
- New `team.html` (stub — populated by 54.1)
- New `settings.html` (stub — populated by M4)
- Module-aware nav data file (`nav-config.json` or inline in app-shell.js)
- Migration script that injects shell into 96 pages
- 20+ new landing-page stubs for new nav targets (e.g., `/salesforce/customers` if it doesn't already exist as a turion-demo page)
- CloudFront rewrites for new URLs
- Playwright suite at `tests/e2e/`

**OUT:**
- Multi-user invites (Phase 54.1)
- AI agents per-tenant (Phase 54.2)
- Full test stack (Phase 54.3)
- RLS (M3)
- Stripe billing (M4)
- RDS migration (M2)

**ABSOLUTELY OUT:**
- Touching the 4 `zietra-cognito-*` Lambdas
- Modifying any existing HTML page's body content (only wrap with shell injection)
- Removing Phase 41 cognitoAuth helpers
- Touching the apex `zietra.com` distribution

---

## New landing-page URL inventory (vs. existing turion-demo paths)

Existing turion-demo pages I can confirm from prior phases:
- `/sales/customers`, `/sales/orders`, `/sales-index.html` (NetSuite UI in disguise)
- `/finance/general-ledger`, `/finance/journal-entries`, `/finance/chart-of-accounts`, `/finance/fpa`, `/finance/revenue-management`
- `/inventory/items`, `/inventory-index.html`
- `/procurement/orders`, `/procurement/vendors`
- `/quality/ncrs`, `/quality/capas` (may exist or stub)
- `/quickbooks` + 6 sub-wizards
- `/ramp`
- `/satellite/` (full sub-app)
- `/agents.html` (3 agents on one page)

New URLs to introduce (researcher confirms which already exist via grep):
- `/salesforce/customers`, `/salesforce/opportunities` — likely don't exist yet (SF data is in `/api/data/sf` payload but no dedicated page)
- `/netsuite/...` — likely exists under `/sales/`, `/finance/`, etc. — researcher checks
- `/asc606/...` — currently a separate sub-app at `asc606.zietra.com` (different distribution!) — Phase 54 should LINK to it externally OR embed it via iframe
- `/royalty/...` — does NOT exist yet — stub landing
- `/agents/ncr-capa` etc. — currently a single `agents.html` page; split into 3 dedicated pages OR keep one with anchor links

**Pragmatic approach:**
- For URLs that exist: shell wrapper points at them
- For new URLs: ship as stubs with "Coming soon" + a screenshot + link to the source-system page (e.g., royalty stub links to ASC 606 sub-app)
- Researcher dumps the actual file inventory before planning

---

## Engineering rules (PERMANENT)

- **Rule 1:** No hardcoded tenant data. Tenant name + plan + features all from `/api/tenants/current`.
- **Rule 2:** Every nav link works — no dead ends. If a module is enabled but the landing page is a stub, the stub is still a real page with content.
- **Rule 3:** Each nav item ships with a Playwright test asserting click → URL + no console errors.
- **Rule 4:** Mirror change — both turion-space-demo + turion-satellite get the shell. (Or — since satellite is `/satellite/*` under the same domain, the same shell renders for satellite pages.)
- **Rule 5:** Remove dead code — if a nav rename obsoletes the old `/sales-index.html` route, redirect it to the new URL or delete.
- **Rule 6:** No new framework. Vanilla JS + CSS. The existing pages use vanilla HTML — keep consistent.

---

## Autonomous mode

User authorized full autonomy through end-of-project. No human-action checkpoints in any of the M5+M6 phases.

---

## Open questions for the researcher

1. **Existing URL inventory:** ls + grep all `.html` files in turion-space-demo to enumerate the actual routes. Match against the proposed nav taxonomy table. Flag any URL that's in the taxonomy but doesn't exist as a file/route → that's a new stub.
2. **ASC 606 / royalty integration:** **RESOLVED in §"Updates after research" point 1** → external link-out to `https://asc606.zietra.com` (it's a fully built, LIVE, separate CloudFront distribution; do NOT clone or stub). Nav label: "ASC 606 Revenue Recognition ↗" with the link-out glyph. Royalty stays on-distribution at `/royalty/agreements`.
3. **Catalog data source:** is the catalog hardcoded or driven by an API? For Phase 54, hardcode in `nav-config.json` (no DB). M4 may move it to a `modules` DB table.
4. **Migration script idempotency:** marker comment `<!-- ZIETRA-SHELL-INJECTED -->` at top of injected script block. Re-run skips files with marker. Mirrors Phase 41's `inject-erp-auth.mjs` pattern.
5. **Top bar behavior on the satellite app:** `/satellite/*` pages already have their own header. Decision: hide the shell top bar inside `/satellite/*` to avoid double headers? OR keep both? Recommend: hide shell chrome inside `/satellite/*` (satellite has its own breadcrumb).
6. **Trial countdown:** read from `/api/tenants/current.trial_ends_at` and compute days remaining. If `plan === 'paid'`, hide the badge.
7. **Nav config storage:** inline in `app-shell.js` as a const, OR as a separate `nav-config.json` fetched at boot? Recommend inline (avoids extra fetch). Total nav config ~5 KB.
8. **Disabled-module CTA flow:** ~~clicking "+ Add to plan" → `/catalog?module=<code>`~~ → **RESOLVED in §"Updates after research" point 2** → `/catalog#<module-code>` hash anchor → catalog page scrolls smoothly to the matching card via `Element.scrollIntoView({behavior:'smooth'})`.
9. **What happens at /` (root)** when a user lands fresh? Currently it serves an ERP dashboard-ish page. Should it become a tenant home page with "welcome to <tenant>" + active module shortcuts? Recommend YES — make `/` a real welcome page (not the existing dashboard).

---

## Recommended wave structure

- **Wave 1 (1 plan):** **54-01 — Design system + app-shell.js + app-shell.css + nav-config inline.** Vanilla JS shell that renders left rail + top bar. Per-tenant chrome reads `/api/tenants/current`. NO page injection yet (just the shell file).
- **Wave 2 (parallel, 2 plans):**
  - **54-02 — Migration script + injection into 96 pages.** Idempotent `inject-shell.mjs` runs across all ERP + satellite HTML files. CloudFront invalidation.
  - **54-03 — Catalog page + 13 module detail pages + new landing-page stubs.** All HTML, hard-coded copy/screenshots. Bottom nav items (`/team`, `/settings`, `/help`, `/catalog`) get stub pages too.
- **Wave 3 (1 plan):** **54-04 — Playwright E2E scaffold + 20 tests + Phase 54.1 CHECKPOINT.md.** Bootstrap `tests/e2e/`, `playwright.config.ts`, package.json scripts. 20 tests covering signup, nav, catalog. Run in CI-able mode (single-shot). Write CHECKPOINT for 54.1 (multi-user invites).

---

## Reference paths

- Existing nav reference: ERP pages under `/Users/jeet/turion-space-demo/*.html` (lots) and `/Users/jeet/turion-space-demo/satellite/*.html`
- Existing CSS: `/Users/jeet/turion-space-demo/ns-shared.css` (Zietra palette already in use)
- Frontend deploy: `/Users/jeet/turion-space-demo/deploy-frontend.sh`
- CloudFront Function: `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js`
- Phase 53 CHECKPOINT (input contract): `.planning/phases/53-m5-wildcard-subdomain-routing-tenant-zietra-com/CHECKPOINT.md`
- `/api/tenants/current` shape: `{id, slug, name, plan, trial_ends_at, features: [module_code]}`
- Global engineering rules: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_global_engineering_rules.md`

---

*Written 2026-05-14 for the autonomous M6 build. Researcher: read this, then inventory existing pages, then write 54-RESEARCH.md with the URL-existence audit + Lucide icon picks per nav item + sample HTML for the shell + screenshot URLs for the catalog cards.*
