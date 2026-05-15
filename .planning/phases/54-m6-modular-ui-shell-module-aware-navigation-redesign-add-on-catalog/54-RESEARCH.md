# Phase 54: M6 — Modular UI shell + module-aware navigation redesign + add-on catalog — Research

**Researched:** 2026-05-14
**Domain:** Vanilla JS app-shell + module-aware navigation + add-on catalog + Playwright E2E
**Confidence:** HIGH (codebase fully inventoried; existing shell already partially built)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope (Phase 54 requirements — 8 IDs):**
- `AppShell` · `ModuleAwareNavigation` · `NavigationLandingPages` · `CatalogPage` · `AddOnCTAs` · `ShellWrapperForExistingPages` · `TenantBrandedChrome` · `PlaywrightE2EScaffold`

**Navigation taxonomy — module-aware labels (LOCKED, copy verbatim from CONTEXT.md §LOCKED DECISIONS):**

Top-level groups + landing pages (each label names its source system):

| Group | Module label | Source | Landing | feature code |
|---|---|---|---|---|
| **CRM & Sales** | `Salesforce • Customers` | Salesforce | `/salesforce/customers` | `crm` |
| | `Salesforce • Opportunities` | Salesforce | `/salesforce/opportunities` | `crm` |
| | `NetSuite • Sales Orders` | NetSuite | `/netsuite/sales-orders` | `sales` |
| | `NetSuite • Invoices` | NetSuite | `/netsuite/invoices` | `sales` |
| **Procure-to-Pay** | `NetSuite • Vendors` | NetSuite | `/netsuite/vendors` | `purchase` |
| | `NetSuite • Purchase Orders` | NetSuite | `/netsuite/purchase-orders` | `purchase` |
| | `Ramp • Card Operations` | Ramp | `/ramp/cards` | `dropship` (Ramp = P2P proxy) |
| **Inventory & Items** | `NetSuite • Items` | NetSuite | `/netsuite/items` | `items` |
| | `NetSuite • Inventory` | NetSuite | `/netsuite/inventory` | `items` |
| **PLM (Engineering)** | `Arena • Part Library` | Arena PLM | `/arena/parts` | `plm` |
| | `Arena • BOMs` | Arena PLM | `/arena/boms` | `plm` |
| | `Arena • Change Orders` | Arena PLM | `/arena/change-orders` | `plm` |
| | `Turion Satellite PLM` | Custom sub-app | `/satellite/` | `plm` (Turion-specific; other tenants stub) |
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
| **Revenue & Royalty** | `ASC 606 Revenue Recognition ↗` | ASC 606 sub-app | `https://asc606.zietra.com` (new tab) | `asc606` |
| | `ASC 606 • Performance Obligations ↗` | ASC 606 | `https://asc606.zietra.com/performance-obligations` (new tab) | `asc606` |
| | `Royalty Management` | Royalty Mgmt | `/royalty/agreements` (stub on this distro) | `royalty` |
| **AI Agents** | `AI Agent • NCR → CAPA Closure` | Anthropic Claude | `/agents/ncr-capa` | `ai-agents` |
| | `AI Agent • EVMS Watchdog` | Anthropic Claude | `/agents/evms` | `ai-agents` |
| | `AI Agent • Integration Sentinel` | Anthropic Claude | `/agents/integration` | `ai-agents` |
| **Migration Tools** | `QuickBooks → NetSuite` | QB-Migration | `/quickbooks` | `qb-migration` |
| | `Ramp → NetSuite` | Ramp-Migration | `/ramp` | `qb-migration` |
| **Marketing (M7)** | `Zietra Marketing` | Coming-soon | `/marketing/coming-soon` | `marketing` |

**Bottom rail (always visible):** `/team` · `/catalog` · `/settings` · `/help`

**Design system (LOCKED):**
- Palette: Zietra purple `#7c3aed`, slate `#0b1020`, white `#ffffff`, success `#10b981`, warning `#f59e0b`, error `#ef4444`
- Typography: `Inter` (fallback `system-ui, -apple-system, sans-serif`)
- Spacing: 4px base unit (8/12/16/24/32/48)
- Left rail: 240px expanded, 64px collapsed
- Top bar: 56px
- Icons: Lucide (CDN, no build step), 16-20px
- Density: comfortable
- References: Linear (rail), Notion (collapsible sections), Stripe Dashboard (top bar) — borrow patterns, do NOT clone

**Per-tenant chrome (LOCKED):** Left = workspace name (`Turion Space` / `Dollor`) + click → `/settings`. Middle = breadcrumb. Right = plan badge + trial countdown + avatar dropdown (Profile / Settings / Sign out).

**Shell wrapper for existing pages (LOCKED):** DO NOT rewrite pages. Inject script tag `<script src="/app-shell.js" defer>` + `<link rel="stylesheet" href="/app-shell.css">` into `<head>` of each page via idempotent migration script with marker comment `<!-- ZIETRA-SHELL-INJECTED -->`. Covers all ~96 ERP + satellite pages. Skip auth pages.

**Catalog page (LOCKED):** `/catalog` lists all 13 modules. Each card = icon + name + 1-line description + status (`Enabled` / `In your plan` / `+ Add to plan`) + CTA (`Open` / `Try free` / `Subscribe`). Detail pages at `/catalog/<module-code>`.

**Playwright (LOCKED):**
- `tests/e2e/` directory in `turion-space-demo/`
- `playwright.config.ts` targets `https://turionspace.zietra.com` + dynamic tenant URL
- 20+ baseline tests (signup → magic-link → land on tenant home → left rail → click each module → catalog → team stub → sign out)
- Run in CI-able single-shot mode

### Claude's Discretion

1. **Whether to greenfield `app-shell.js` OR evolve existing `shells/app-chrome.js`** — researcher recommends **EVOLVE**, see §Architecture Patterns
2. **CF Function rewrite additions** — researcher recommends adding rewrites for the NEW landing-page slugs that don't already exist (see §URL Inventory)
3. **Catalog data source** — researcher recommends **inline `MODULE_CATALOG` const** in `app-shell.js`, not separate JSON fetch
4. **Top bar inside `/satellite/*`** — recommend **hide shell chrome inside `/satellite/*`** (satellite has its own breadcrumb). Implement via skip-marker in injection script.
5. **Nav config storage** — recommend **inline in `app-shell.js`** (5 KB, avoids extra fetch)
6. **Lucide icons per group** — recommended map below (§Lucide Icon Picks)
7. **Catalog detail pages** — recommend **single `/catalog` SPA page with hash routing** (`#asc606`) rather than 13 separate HTML files (keeps deploy lean)
8. **Disabled-module CTA flow** — recommend **`/catalog#<code>`** (scrolls to the card on the catalog page)
9. **`/` root** for fresh tenant — recommend **redirect to `/salesforce/customers`** (first nav item) instead of rebuilding `index.html`; Turion's existing rich index.html stays for Turion only via tenant detection in the bootstrap

### Deferred Ideas (OUT OF SCOPE)

- Multi-user invites + RBAC (Phase 54.1)
- AI agents per-tenant scoping (Phase 54.2)
- Full test stack — vitest + axe + Lighthouse + CI (Phase 54.3)
- RLS isolation (M3)
- Stripe billing wiring (M4)
- RDS migration (M2)
- Marketing site `zietra.com` (M7)
- Any change to 4 `zietra-cognito-*` trigger Lambdas
- Touching apex `zietra.com` distribution
- Per-tenant cache-key in CloudFront
- Touching Phase 41 `cognitoAuth` helpers
- Touching Phase 52 `signup.html` (standalone)
- Touching `/cognito-auth-callback.html` (Phase 41 contract)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| `AppShell` | Single app shell with left rail + top bar + main slot, vanilla JS, no framework | §Architecture Patterns — evolve existing `shells/app-chrome.js`; existing CSS (`enterprise-shell.css`, 405 LOC) already implements rail + section collapse + filter; replace hardcoded `RAIL` const with `tenant_features`-driven config |
| `ModuleAwareNavigation` | Nav labels reference source systems ("NetSuite • Sales Orders" etc.); dynamic per `tenant_features` | §Nav Config Skeleton — `NAV_TAXONOMY` array of `{group, items[]}` mapping module label → URL → `feature_code`; runtime filter against `tenants/current.features[]` |
| `NavigationLandingPages` | Each nav item lands on a real work surface, not a dashboard | §URL Inventory — 12 existing URLs reuse via CF Function alias entries; ~17 NEW stubs needed for `/salesforce/customers`, `/netsuite/sales-orders`, `/arena/parts`, `/mes/shop-floor`, `/quality/ncrs`, `/royalty/*`, `/agents/ncr-capa` etc. |
| `CatalogPage` | `/catalog` lists all 13 modules with status + CTA + detail anchor | §Catalog Content — 13-entry `MODULE_CATALOG` const with name/description/screenshot/CTA |
| `AddOnCTAs` | Per-module CTAs (`Try free` / `Subscribe` / `Open`) | §Catalog Content — CTA function returns one of 3 buttons based on `tenant_features` + plan |
| `ShellWrapperForExistingPages` | Migration script injects shell into ~96 existing pages, idempotent | §Migration Script — extend existing `wire_shells.py` pattern; marker `<!-- ZIETRA-SHELL-INJECTED -->`; skip 4 auth pages + skip pages already injected with `shells/app-chrome.js` (53 pages — handle by replacing old injection) |
| `TenantBrandedChrome` | Top bar shows workspace name + plan badge + trial countdown + avatar | §Per-tenant Chrome — read from `GET /api/tenants/current` (Phase 53 contract); compute `daysLeft = ceil((trial_ends_at - now) / 86400000)` |
| `PlaywrightE2EScaffold` | `tests/e2e/` + `playwright.config.ts` + 20+ tests covering signup → nav → catalog | §Playwright Scaffold — `npm install -D @playwright/test`; `chromium` + `webkit` projects; storage state for auth; proposed test names listed |
</phase_requirements>

---

## Summary

Phase 54 is the **visual transformation** that makes `<tenant>.zietra.com` look like a real ERP SaaS. The user's complaint — that "Sales/Procurement/Finance" all go to the same dashboard — is real: `shells/app-chrome.js:108-118` (existing code) literally hardcodes those generic labels and points them at `/sales`, `/finance`, `/inventory` index pages that are NetSuite-looking but module-blind dashboards.

**Critical asset discovered:** `/Users/jeet/turion-space-demo/shells/` already contains a working app shell — `app-chrome.js` (283 LOC) + `enterprise-shell.css` (405 LOC) + 53 pages already inject it (via head `<link>` + `<script>`). It implements all the structural pieces Phase 54 wants: left rail with collapsible sections, SVG icons, filter input, sticky workspace badge, operator chip at bottom, mobile media queries, and even fixes for nested dashboard chrome conflicts. **Phase 54 should EVOLVE this asset, not greenfield**, otherwise we double-maintain shell code and the migration script becomes destructive instead of additive.

**Primary recommendation:** Ship as `app-shell.js` + `app-shell.css` at the **distribution root** (not under `/shells/`) to signal Phase-54-era replacement; the new files reuse most of `enterprise-shell.css`'s rail/section CSS verbatim (lift it), replace the hardcoded `RAIL` const with a `NAV_TAXONOMY` driven by `tenant_features`, and replace the fake "M. Rodriguez" user with `GET /api/tenants/current` data. Migration script rewrites the 53 pages that already have `shells/app-chrome.js` → `app-shell.js` AND adds shell to the remaining ~36 ERP pages + 18 satellite pages (skipping `/satellite/*` chrome per CONTEXT.md Open Q 5).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (no framework) | ES2017+ | Shell rendering, nav, catalog | Locked by CONTEXT.md Rule 6; the existing 88 HTML pages are all vanilla; introducing React/Vue would force a 96-page rewrite |
| Lucide Icons | `lucide@0.460.0` pinned (latest = 1.16 redirects via unpkg) | Inline SVG icons | Industry standard for design systems (Linear, Vercel use Lucide variants); 24×24 viewbox; CSS-currentColor stroke; **CDN: `https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js`** (verified HTTP 200) OR `https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js`. Recommend **inline SVG strings** (the existing `shells/app-chrome.js:29-48` already does this — no CDN dependency, no FOUC) |
| Inter font | Google Fonts (already loaded by ASC606 distro; satellite uses Fira Sans) | Body text | CONTEXT.md design system locks this. Existing `enterprise-shell.css:23` already sets `font-family: "Inter", -apple-system, ...` |
| @playwright/test | `^1.45.0` | E2E browser automation | Industry standard for cross-browser; native auth-state reuse via `storageState` JSON; built-in trace viewer |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `audit-buttons` (existing) | local mjs script | Catch onclick-without-route violations | Already part of `npm run audit-buttons` — Phase 54 nav additions must pass |
| Python 3 stdlib | (system) | Idempotent migration script | `wire_shells.py` precedent uses Python; or port to mjs to match `audit-buttons.mjs` style |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lucide inline SVG | Lucide via CDN script tag | CDN saves bytes per page but adds network dep + FOUC; inline strings (current pattern) is faster and offline-safe — recommend keep inline |
| Vanilla shell | Preact 3 KB or Alpine.js | Would need build step; CONTEXT Rule 6 forbids |
| Separate `/catalog/<code>.html` files | Single SPA `/catalog` page with hash routing | 13 files = 13 deploys; hash routing keeps it one file |
| Read nav from `nav-config.json` over HTTP | Inline `NAV_TAXONOMY` const | Extra fetch + race vs shell render; inline is 5 KB and zero-RTT |

**Installation:**
```bash
cd /Users/jeet/turion-space-demo
npm install -D @playwright/test
npx playwright install chromium webkit  # webkit only on macOS; Linux CI add firefox if desired
```

No new runtime deps for the shell itself (vanilla JS).

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
turion-space-demo/
├── app-shell.js                  # NEW (Wave 1) — boot, nav render, tenant fetch, Lucide-inline SVGs
├── app-shell.css                 # NEW (Wave 1) — design system tokens + shell layout, lifted from enterprise-shell.css
├── catalog.html                  # NEW (Wave 2) — 13 module cards + hash detail
├── team.html                     # NEW stub (Wave 2) — placeholder, Phase 54.1 wires
├── settings.html                 # NEW stub (Wave 2) — placeholder, M4 wires
├── help.html                     # NEW stub (Wave 2) — link to /catalog + future M7 docs
├── stubs/                        # NEW (Wave 2) — landing-page stubs for new nav targets
│   ├── salesforce-customers.html
│   ├── salesforce-opportunities.html
│   ├── netsuite-sales-orders.html
│   ├── netsuite-invoices.html
│   ├── netsuite-vendors.html
│   ├── netsuite-purchase-orders.html
│   ├── netsuite-items.html
│   ├── netsuite-inventory.html
│   ├── netsuite-general-ledger.html
│   ├── netsuite-journal-entries.html
│   ├── netsuite-chart-of-accounts.html
│   ├── netsuite-fpa.html
│   ├── ramp-cards.html
│   ├── arena-parts.html
│   ├── arena-boms.html
│   ├── arena-change-orders.html
│   ├── mes-shop-floor-stub.html  # /mes/shop-floor existing canonical is /manufacturing/shop-floor
│   ├── mes-work-orders.html
│   ├── mes-build-steps.html
│   ├── quality-ncrs.html
│   ├── quality-capas.html
│   ├── quality-audits.html
│   ├── royalty-agreements.html
│   ├── agents-ncr-capa.html
│   ├── agents-evms.html
│   ├── agents-integration.html
│   └── marketing-coming-soon.html
├── cf-function-source/
│   └── turion-clean-urls.js      # EXTEND (Wave 2) — +27 R-map entries for new URLs
├── scripts/
│   └── inject-shell.mjs          # NEW (Wave 2) — idempotent injection across 96 pages
├── tests/e2e/                    # NEW (Wave 3)
│   ├── playwright.config.ts
│   ├── fixtures.ts               # storage state, tenant helpers
│   ├── auth.spec.ts              # signup → magic-link → land
│   ├── nav.spec.ts               # left rail traversal per group
│   ├── catalog.spec.ts           # /catalog renders 13 cards
│   └── shell.spec.ts             # chrome (workspace name, trial countdown, avatar)
└── package.json                  # update — add playwright scripts
```

### Pattern 1: Tenant-aware shell bootstrap

**What:** On every page load, `app-shell.js` fetches `GET /api/tenants/current` via `erp-api.js` (which already sends `X-Tenant-Slug` from Phase 53), caches the response in `window.__ZIETRA_TENANT`, builds the shell DOM, and filters nav items against `tenant.features[]`.

**When to use:** Every wrapped page. Single source of truth for tenant identity.

**Example:**
```javascript
// app-shell.js (skeleton)
(async function () {
  if (document.documentElement.dataset.shellInjected === '1') return;
  document.documentElement.dataset.shellInjected = '1';

  // 1. Skip auth pages (signup, callback) — they DON'T have erp-api.js loaded
  if (/^\/(signup|cognito-auth-callback)/.test(location.pathname)) return;

  // 2. Skip inside /satellite/* (it has its own header)
  if (location.pathname.startsWith('/satellite/')) return;

  // 3. Wait for cognito session (existing Phase 41 contract) — pages already gate this
  //    so by the time app-shell.js runs (deferred), cognito-auth.js has hydrated.

  // 4. Fetch tenant config via existing erpApi wrapper (sends X-Tenant-Slug)
  let tenant;
  try {
    tenant = await window.erpApi.get('/api/tenants/current');
  } catch (e) {
    // No tenant ⇒ render shell with workspace="Zietra Workspace" fallback
    tenant = { id: null, slug: '', name: 'Zietra Workspace', plan: 'trial',
               trial_ends_at: null, features: [] };
  }
  window.__ZIETRA_TENANT = tenant;

  // 5. Build chrome
  const enabled = new Set(tenant.features);
  document.body.insertBefore(buildTopBar(tenant), document.body.firstChild);
  document.body.insertBefore(buildLeftRail(NAV_TAXONOMY, enabled, location.pathname), document.body.firstChild.nextSibling);

  // 6. Optional: highlight active item, expand active group
})();
```

### Pattern 2: Module-aware NAV_TAXONOMY const

**What:** A `const NAV_TAXONOMY = [ {group, icon, items: [{label, href, code}]}, ... ]` array. Renders one collapsible section per group. Items filter by `tenant.features` (locked code → group lit; missing code → group greyed out + `+ Add to plan` CTA at the group header).

**When to use:** Once, at top of `app-shell.js`. Single source of truth for nav.

**Example:**
```javascript
const NAV_TAXONOMY = [
  { group: 'CRM & Sales', icon: 'users', items: [
    { label: 'Salesforce • Customers',       href: '/salesforce/customers',       code: 'crm' },
    { label: 'Salesforce • Opportunities',   href: '/salesforce/opportunities',   code: 'crm' },
    { label: 'NetSuite • Sales Orders',      href: '/netsuite/sales-orders',      code: 'sales' },
    { label: 'NetSuite • Invoices',          href: '/netsuite/invoices',          code: 'sales' }
  ]},
  { group: 'Procure-to-Pay', icon: 'shopping-cart', items: [
    { label: 'NetSuite • Vendors',           href: '/netsuite/vendors',           code: 'purchase' },
    { label: 'NetSuite • Purchase Orders',   href: '/netsuite/purchase-orders',   code: 'purchase' },
    { label: 'Ramp • Card Operations',       href: '/ramp/cards',                 code: 'dropship' }
  ]},
  // ...12 groups total
];

const BOTTOM_NAV = [
  { label: 'Team',     href: '/team',     icon: 'users-2' },
  { label: 'Catalog',  href: '/catalog',  icon: 'shopping-bag' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Help',     href: '/help',     icon: 'help-circle' }
];
```

### Pattern 3: Idempotent injection with marker comment

**What:** Migration script reads each HTML file, checks for `<!-- ZIETRA-SHELL-INJECTED -->`, skips if present. Otherwise inserts `<link>` + `<script>` tags into `<head>` and adds the marker. Re-runs are no-ops.

**When to use:** Once per Wave 2 deploy. Idempotency means safe re-runs after edits.

**Example:** mirrors the existing `wire_shells.py` pattern but with `<!-- ZIETRA-SHELL-INJECTED -->` marker and Phase-54 file paths.

### Pattern 4: Single-distribution stub vs. cross-domain link-out

**What:** Modules that have their own production sub-app (ASC 606 at `asc606.zietra.com`) open in a new tab via target="_blank" with the `↗` glyph in the label. Modules that don't (Royalty Management) ship as stubs on this distribution under `/royalty/agreements`.

**When to use:** Whenever the source system has its own subdomain. Verified live: `asc606.zietra.com` is a separate Next.js distribution (returns 307 → /marquee for default route, Next.js standalone). `royalty.zietra.com` does NOT exist as a separate distro — `curl royalty.zietra.com` returns 28921 B which is **byte-identical to the Turion index.html** — proves the wildcard `*.zietra.com` is catching it and serving Turion (which means a tenant could sign up with slug=`royalty`, oops — should add to RESERVED list as a P3 nice-to-have).

### Anti-Patterns to Avoid

- **Don't wrap `/signup` or `/cognito-auth-callback`** — they don't have `erp-api.js` loaded, so `GET /api/tenants/current` will fail; their UI is intentionally standalone (Phase 41/52 contracts).
- **Don't fetch nav config from a separate JSON file** — adds a network round-trip + race condition on render; inline the const.
- **Don't hardcode tenant name** — read from `tenant.name`; CONTEXT.md Rule 1 forbids.
- **Don't run shell injection inside `/satellite/*`** — satellite has its own `satellite-shell.css` + `nav-strip`; double-chrome is ugly. Skip-marker in injection script.
- **Don't shadow the existing `shells/app-chrome.js`** without retiring it — leaving both would double-inject. Migration script must REPLACE the old `<link href="/shells/enterprise-shell.css"><script src="/shells/app-chrome.js">` with the new `<link href="/app-shell.css"><script src="/app-shell.js">` on the 53 pages that already have it.
- **Don't break the "53 pages already in shell" contract** — those pages have CSS classes like `.dash-top` that get re-styled by `enterprise-shell.css`. The new `app-shell.css` must include the same `.dash-top` / `.dash-header` / `.src-strip` / `.kpi-strip` overrides (lift verbatim).
- **Don't use Lucide CDN with `latest` tag** — `https://unpkg.com/lucide@latest` returned `HTTP/2 302 → /lucide@1.16.0/...` — that's actually `1.16.0`, NOT a typo for `0.x`. Pin to `0.460.0` (current major) OR keep inline SVG strings (recommended — already used in existing `shells/app-chrome.js:29-48`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG icons | Custom icon font | Lucide inline SVG strings | 1000+ Lucide icons covered; the existing shell already inlines them |
| Auth state | Re-implement Cognito session | Use existing `window.cognitoAuth.requireSession()` (Phase 41) | Already gates 89 pages |
| Tenant fetch | Raw fetch with manual `X-Tenant-Slug` | `window.erpApi.get('/api/tenants/current')` | Phase 53 wrapper does header injection + 401-redirect |
| Browser auth state in tests | Re-login per test | Playwright `storageState` JSON | Native pattern; saves 5-10s per test |
| Idempotent file patching | Bespoke regex | Reuse `wire_shells.py` regex/marker pattern | Already battle-tested across 53 pages |
| URL routing | Hash-router lib | CloudFront Function R-map (existing) | Already serves 60+ clean URLs; just add new entries |
| Trial countdown | Heavy date lib | `Math.ceil((new Date(trial_ends_at) - Date.now()) / 86400000)` | 1 line |
| Workspace name fallback | API retries | Hardcoded `'Zietra Workspace'` if fetch fails | Aligns with CONTEXT.md Rule 1 — DB-driven where possible, sensible default otherwise |

**Key insight:** Phase 54 is 70% **assembly** of existing parts (shell DNA, CF rewrites, idempotent injection, `tenant_features` API) and 30% net-new (module-aware taxonomy, catalog page, Playwright). Greenfielding the shell would burn the existing 53-page chrome — don't.

---

## URL Inventory — proposed nav taxonomy vs reality

Below: every nav item in the locked taxonomy, cross-referenced against `ls /Users/jeet/turion-space-demo/*.html` (88 files) and the CF Function R-map (60+ rewrites).

### Status legend
- ✅ **EXISTS canonical** — URL is in CF Function R-map and HTML file exists; reuse as-is
- 🔄 **EXISTS at different URL** — file exists but the proposed Phase-54 URL doesn't map to it yet; either add CF rewrite OR change the taxonomy URL
- 🆕 **NEW STUB** — file doesn't exist; create in Wave 2 under `stubs/`
- ↗ **EXTERNAL** — separate sub-app, open in new tab

### CRM & Sales group

| Phase-54 URL | Status | Existing file (if any) | Action |
|---|---|---|---|
| `/salesforce/customers` | 🆕 NEW STUB | — | Wave 2: stub + CF rewrite |
| `/salesforce/opportunities` | 🆕 NEW STUB | (real SF data is in `salesforce-account.html` under `/sales/account`) | Wave 2: stub + CF rewrite |
| `/netsuite/sales-orders` | 🔄 EXISTS at `/sales/orders` → `netsuite-customer-so.html` | `netsuite-customer-so.html` | Wave 2: add `/netsuite/sales-orders` rewrite to **same file** |
| `/netsuite/invoices` | 🆕 NEW STUB | — | Wave 2: stub + CF rewrite |

### Procure-to-Pay group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/netsuite/vendors` | 🔄 EXISTS at `/vendor/new` → `netsuite-new-vendor.html` (form only); list lives in `vendor-index.html` at `/vendor` | `vendor-index.html` | Add `/netsuite/vendors` → `/vendor-index.html` rewrite |
| `/netsuite/purchase-orders` | 🔄 EXISTS at `/procurement/orders` → `netsuite-procurement.html` | `netsuite-procurement.html` | Add `/netsuite/purchase-orders` rewrite |
| `/ramp/cards` | 🔄 EXISTS at `/ramp` → `ramp.html` | `ramp.html` | Add `/ramp/cards` rewrite (same file) |

### Inventory & Items group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/netsuite/items` | 🔄 EXISTS at `/inventory/items` → `netsuite-items.html` | `netsuite-items.html` | Add `/netsuite/items` rewrite |
| `/netsuite/inventory` | 🔄 EXISTS at `/inventory` → `inventory-index.html` | `inventory-index.html` | Add `/netsuite/inventory` rewrite |

### PLM (Engineering) group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/arena/parts` | 🆕 NEW STUB | — (Arena pages are under `/quality/*`) | Wave 2 stub |
| `/arena/boms` | 🔄 EXISTS at `/quality/bom` → `arena-bom.html` | `arena-bom.html` | Add `/arena/boms` rewrite |
| `/arena/change-orders` | 🆕 NEW STUB | (ECO form at `/quality/new-eco`) | Wave 2 stub |
| `/satellite/` | ✅ EXISTS | `/satellite/index.html` | Open in new tab (satellite has own shell — skip injection inside) |

### Manufacturing group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/mes/shop-floor` | 🔄 EXISTS at `/manufacturing/shop-floor` → `mes-shop-floor.html` | `mes-shop-floor.html` | Add `/mes/shop-floor` rewrite |
| `/mes/work-orders` | 🆕 NEW STUB | (satellite has `/satellite/work-orders.html`) | Wave 2 stub on this distro |
| `/mes/build-steps` | 🆕 NEW STUB | — | Wave 2 stub |

### Quality group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/quality/ncrs` | 🆕 NEW STUB (CF rewrite goes to `arena-qms.html` ideally — that page has NCRs) | `arena-qms.html` (mounted at `/quality/qms`) | Add `/quality/ncrs` → `arena-qms.html` rewrite + scroll-anchor |
| `/quality/capas` | 🆕 NEW STUB | `arena-qms.html` | Same — rewrite + anchor |
| `/quality/audits` | 🆕 NEW STUB | `arena-qms.html` | Same — rewrite + anchor |

### Finance group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/netsuite/general-ledger` | 🔄 EXISTS at `/finance/general-ledger` → `netsuite-financials.html` | `netsuite-financials.html` | Add `/netsuite/general-ledger` rewrite |
| `/netsuite/journal-entries` | 🆕 NEW STUB | (referenced in `/records/journal/...`) | Wave 2 stub |
| `/netsuite/chart-of-accounts` | 🔄 EXISTS at `/finance/chart-of-accounts` → `netsuite-coa.html` | `netsuite-coa.html` | Add `/netsuite/chart-of-accounts` rewrite |
| `/netsuite/fpa` | 🔄 EXISTS at `/finance/fpa` → `netsuite-fpa.html` | `netsuite-fpa.html` | Add `/netsuite/fpa` rewrite |

### Revenue & Royalty group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `https://asc606.zietra.com` | ↗ EXTERNAL | (separate Next.js distro, verified 307 redirect) | Open in new tab; label "ASC 606 Revenue Recognition ↗" |
| `https://asc606.zietra.com/performance-obligations` | ↗ EXTERNAL | (same distro, deep link — verify URL exists in M7) | Open in new tab; label "ASC 606 • Performance Obligations ↗" |
| `/royalty/agreements` | 🆕 NEW STUB | (no royalty distro — `royalty.zietra.com` wildcard catches Turion) | Wave 2 stub on this distro |

### AI Agents group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/agents/ncr-capa` | 🆕 NEW STUB | (`agent-sales-cash.html` has 4 agents on ONE page at `/agent-sales-cash`) | Recommend split into 3 dedicated stub pages that POST to `/api/agents/ncr-capa`, `/api/agents/evms`, `/api/agents/integration-sentinel` (real endpoints, mounted on `turion-demo-api` at `/api/agents`) |
| `/agents/evms` | 🆕 NEW STUB | (in agent-sales-cash.html) | Wave 2 stub |
| `/agents/integration` | 🆕 NEW STUB | (in agent-sales-cash.html) | Wave 2 stub |

### Migration Tools group

| Phase-54 URL | Status | Existing file | Action |
|---|---|---|---|
| `/quickbooks` | ✅ EXISTS | `quickbooks.html` + 6 sub-wizards | Reuse as-is |
| `/ramp` | ✅ EXISTS | `ramp.html` | Reuse as-is |

### Marketing (M7) group

| Phase-54 URL | Status | Action |
|---|---|---|
| `/marketing/coming-soon` | 🆕 NEW STUB | Wave 2 stub — "Marketing module ships in M7" |

### Bottom rail

| Phase-54 URL | Status | Action |
|---|---|---|
| `/team` | 🆕 NEW STUB | Wave 2 — placeholder "Team members coming in Phase 54.1" |
| `/catalog` | 🆕 NEW BUILT | Wave 2 — full 13-card page (this is THE deliverable, not a stub) |
| `/settings` | 🆕 NEW STUB | Wave 2 — "Workspace settings coming in M4" |
| `/help` | 🆕 NEW STUB | Wave 2 — "Help center coming in M7 — try `/catalog`" |

### Summary

- **~12 existing pages** can be reused (just add new CF Function rewrites pointing to existing HTML).
- **~17 NEW stub pages** needed (plus 4 bottom-rail stubs + 1 catalog).
- **CF Function size budget:** current LIVE size = 7645 B; cap = 10240 B; **headroom = 2595 B**. Adding ~27 new R-map entries (avg ~50 B each) = ~1350 B. **Safely under cap.**

---

## Lucide Icon Picks (per nav group)

Verified at `https://lucide.dev/icons/` (icon names stable across versions). Existing shell uses inline SVG strings — Phase 54 follows the same pattern. Source ICONS const additions:

| Group | Icon name | Visual |
|---|---|---|
| CRM & Sales | `users` | Two-people silhouette |
| Procure-to-Pay | `shopping-cart` | Cart |
| Inventory & Items | `package` | Box |
| PLM (Engineering) | `settings-2` | Gear (industrial) |
| Manufacturing | `factory` | Factory |
| Quality | `shield-check` | Checked shield |
| Finance | `landmark` | Banking columns |
| Revenue & Royalty | `coins` | Stacked coins |
| AI Agents | `bot` or `sparkles` | Robot |
| Migration Tools | `git-pull-request-arrow` | Migration |
| Marketing | `megaphone` | Megaphone |

**Bottom rail:**
| Item | Icon |
|---|---|
| Team | `users-2` |
| Catalog | `shopping-bag` |
| Settings | `settings` |
| Help | `help-circle` |
| Sign out (in avatar dropdown) | `log-out` |

**Plan badge:**
- `trial` → `clock` icon + amber color
- `paid` → `check-circle` icon + green color
- `disabled` → `x-circle` icon + red color

**Active state cue (left rail):** `chevron-right` rotated 90° on active section (existing shell already does this — keep).

---

## Sample HTML / JS / CSS Skeletons

### `app-shell.js` (skeleton — ~400 LOC final)

```javascript
// /Users/jeet/turion-space-demo/app-shell.js
// Phase 54 · M6 app shell · vanilla JS · NO framework
// Reads tenant from GET /api/tenants/current (Phase 53), renders left rail + top bar.
// Pages append normal content; shell wraps via <main> insertion.
(function () {
  'use strict';
  if (document.documentElement.dataset.zietraShell === '1') return;
  document.documentElement.dataset.zietraShell = '1';

  // 1. Skip auth pages — they're standalone (Phase 41 + 52 contracts)
  const SKIP_PATHS = [/^\/signup/, /^\/cognito-auth-callback/, /^\/satellite\//];
  if (SKIP_PATHS.some(re => re.test(location.pathname))) return;

  // 2. NAV_TAXONOMY — single source of truth for module-aware nav
  const NAV_TAXONOMY = [
    { group: 'CRM & Sales', icon: 'users', items: [
      { label: 'Salesforce • Customers',     href: '/salesforce/customers',     code: 'crm'   },
      { label: 'Salesforce • Opportunities', href: '/salesforce/opportunities', code: 'crm'   },
      { label: 'NetSuite • Sales Orders',    href: '/netsuite/sales-orders',    code: 'sales' },
      { label: 'NetSuite • Invoices',        href: '/netsuite/invoices',        code: 'sales' }
    ]},
    // ... 11 more groups (lifted from CONTEXT.md taxonomy table)
  ];

  const BOTTOM_NAV = [
    { label: 'Team',     href: '/team',     icon: 'users-2' },
    { label: 'Catalog',  href: '/catalog',  icon: 'shopping-bag' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
    { label: 'Help',     href: '/help',     icon: 'help-circle' }
  ];

  const ICONS = {
    'users':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'shopping-cart':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
    // ... + 18 more (one per group + bottom + plan badges)
  };

  // 3. Fetch tenant (via Phase 53 erp-api wrapper that injects X-Tenant-Slug)
  async function loadTenant() {
    try {
      return await window.erpApi.get('/api/tenants/current');
    } catch (e) {
      console.warn('[app-shell] tenant fetch failed', e);
      return { name: 'Zietra Workspace', plan: 'trial', trial_ends_at: null, features: [] };
    }
  }

  // 4. Trial countdown
  function daysLeft(iso) {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  }

  // 5. Builders
  function el(t, a, c) { /* ... */ }
  function icon(n) { /* return <span class="z-icon" innerHTML=ICONS[n] /> */ }
  function buildTopBar(tenant) { /* logo + workspace name + breadcrumb + plan badge + avatar */ }
  function buildLeftRail(taxonomy, enabled, currentPath) { /* render groups with collapsible sections */ }
  function buildAvatarMenu(tenant) { /* Profile / Settings / Sign out */ }

  // 6. Boot
  (async function init() {
    const tenant = await loadTenant();
    window.__ZIETRA_TENANT = tenant;
    const enabled = new Set(tenant.features);

    // Wrap existing body content
    const main = el('main', { className: 'z-main' });
    while (document.body.firstChild) main.appendChild(document.body.firstChild);

    document.body.appendChild(buildTopBar(tenant));
    document.body.appendChild(buildLeftRail(NAV_TAXONOMY, enabled, location.pathname));
    document.body.appendChild(main);
  })();
})();
```

### `app-shell.css` (skeleton — ~500 LOC final, lifts most from `enterprise-shell.css`)

```css
/* /Users/jeet/turion-space-demo/app-shell.css — Phase 54 design system tokens */
:root {
  /* Palette (CONTEXT.md §Design System) */
  --z-primary:    #7c3aed;     /* Zietra purple */
  --z-primary-2:  #6d28d9;     /* hover */
  --z-bg-dark:    #0b1020;     /* slate-dark chrome bg */
  --z-bg-canvas:  #ffffff;
  --z-bg-rail:    #f9fafb;
  --z-success:    #10b981;
  --z-warning:    #f59e0b;
  --z-error:      #ef4444;
  --z-text-1:     #0f172a;
  --z-text-2:     #475569;
  --z-text-3:     #94a3b8;
  --z-border:     #e2e8f0;

  --z-header-h:   56px;
  --z-rail-w:     240px;
  --z-rail-w-min: 64px;

  --z-font: 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif;
}

/* CSS Grid full-page layout — header spans col 2, rail spans both rows, main is row 2 col 2 */
body.z-shelled {
  margin: 0; padding: 0;
  display: grid;
  grid-template-columns: var(--z-rail-w) 1fr;
  grid-template-rows: var(--z-header-h) 1fr;
  min-height: 100vh;
  font-family: var(--z-font);
  background: #fafbfc;
  color: var(--z-text-1);
}

.z-topbar { grid-column: 2 / 3; grid-row: 1 / 2;
  display: flex; align-items: center; padding: 0 24px;
  background: var(--z-bg-canvas); border-bottom: 1px solid var(--z-border);
  z-index: 50; }

.z-rail { grid-column: 1 / 2; grid-row: 1 / 3;
  background: var(--z-bg-rail); border-right: 1px solid var(--z-border);
  overflow-y: auto; }

.z-main { grid-column: 2 / 3; grid-row: 2 / 3;
  overflow-y: auto; }

/* Active nav item — left accent bar + filled icon */
.z-nav-link.active {
  border-left: 3px solid var(--z-primary);
  background: rgba(124, 58, 237, 0.08);
  color: var(--z-primary);
  font-weight: 600;
}
.z-nav-link.active .z-icon { opacity: 1; }

/* Plan badge */
.z-plan-badge {
  padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
}
.z-plan-badge.trial { background: #fef3c7; color: #92400e; }
.z-plan-badge.paid  { background: #d1fae5; color: #065f46; }
.z-plan-badge.disabled { background: #fee2e2; color: #991b1b; }

/* Collapsed rail */
body.z-shelled.z-rail-collapsed {
  grid-template-columns: var(--z-rail-w-min) 1fr;
}

/* Mobile — hide rail */
@media (max-width: 768px) {
  body.z-shelled {
    grid-template-columns: 1fr;
    grid-template-rows: var(--z-header-h) 1fr;
  }
  .z-rail { display: none; }
  .z-topbar { grid-column: 1 / 2; }
  .z-main   { grid-column: 1 / 2; grid-row: 2 / 3; }
}

/* Lift the dashboard-page chrome overrides from enterprise-shell.css */
body.z-shelled .dash-top { background: #fff !important; /* etc */ }
body.z-shelled .dash-header { background: var(--z-bg-rail); /* etc */ }
/* ... etc — lift verbatim from /shells/enterprise-shell.css:305-405 */
```

### `inject-shell.mjs` (migration script — ~120 LOC)

```javascript
#!/usr/bin/env node
// /Users/jeet/turion-space-demo/scripts/inject-shell.mjs
// Phase 54 · Idempotent shell injection across ~96 HTML pages.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MARKER = '<!-- ZIETRA-SHELL-INJECTED -->';

// Pages that MUST NOT get the shell (auth / standalone / has own shell)
const SKIP = new Set([
  'signup.html',
  'cognito-auth-callback.html',
  // /satellite/* has its own shell; injected separately or skipped entirely
]);

// Old injection patterns to REMOVE before injecting new (these 53 pages)
const OLD_PATTERNS = [
  /\s*<link rel="stylesheet" href="\/shells\/enterprise-shell\.css">\s*/g,
  /\s*<script src="\/shells\/app-chrome\.js" defer><\/script>\s*/g,
  /\s*<script src="\/shells\/status-indicator\.js" defer><\/script>\s*/g,
  // keep others — sortable-tables, edit-modal, cmd-k-palette stay
];

const NEW_INJECTION = `
${MARKER}
<link rel="stylesheet" href="/app-shell.css">
<script src="/app-shell.js" defer></script>
`;

let touched = 0, skipped = 0, alreadyDone = 0;

for (const file of readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  if (SKIP.has(file)) { skipped++; continue; }

  const path = join(ROOT, file);
  let html = readFileSync(path, 'utf8');

  if (html.includes(MARKER)) { alreadyDone++; continue; }

  // Strip old shell injection if present
  for (const pat of OLD_PATTERNS) html = html.replace(pat, '');

  // Inject new shell into <head>
  html = html.replace('</head>', NEW_INJECTION + '</head>');

  writeFileSync(path, html);
  touched++;
}

console.log(`[inject-shell] touched=${touched} skipped=${skipped} already=${alreadyDone}`);
```

Re-run safety: marker check at line 31 makes the script a no-op on second run.

---

## Catalog Page Skeleton (`catalog.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Add-on Catalog · Zietra Workspace</title>
  <script src="/turion-config.js"></script>
  <script src="/cognito-auth.js"></script>
  <script src="/erp-api.js"></script>
  <script>(async () => { await window.cognitoAuth.requireSession(); })();</script>
  <!-- ZIETRA-SHELL-INJECTED -->
  <link rel="stylesheet" href="/app-shell.css">
  <script src="/app-shell.js" defer></script>
  <style>
    .z-catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 24px; }
    .z-catalog-card { background: #fff; border: 1px solid var(--z-border); border-radius: 8px; padding: 18px; }
    .z-catalog-card .z-icon { width: 28px; height: 28px; color: var(--z-primary); }
    .z-catalog-card h3 { font-size: 15px; font-weight: 600; margin: 10px 0 6px; }
    .z-catalog-card p { font-size: 13px; color: var(--z-text-2); line-height: 1.45; }
    .z-catalog-card .z-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .z-catalog-card .z-status.enabled  { background: #d1fae5; color: #065f46; }
    .z-catalog-card .z-status.disabled { background: #fef3c7; color: #92400e; }
    .z-catalog-card button { margin-top: 12px; padding: 7px 14px; border-radius: 6px;
      background: var(--z-primary); color: #fff; border: none; font-weight: 600; cursor: pointer; }
    .z-catalog-card button.secondary { background: transparent; border: 1px solid var(--z-primary); color: var(--z-primary); }
  </style>
</head>
<body>
  <div id="catalog-root">
    <h1 style="padding: 24px;">Add-on Catalog</h1>
    <div class="z-catalog-grid" id="catalog-grid"></div>
  </div>
  <script>
    const MODULE_CATALOG = [
      { code: 'crm',           name: 'Salesforce CRM',          icon: 'users',
        desc: 'Customer relationships, opportunities, and pipeline', source: 'Salesforce', open: '/salesforce/customers' },
      { code: 'sales',         name: 'NetSuite • Sales',        icon: 'receipt',
        desc: 'Sales orders, quotes, invoices', source: 'NetSuite', open: '/netsuite/sales-orders' },
      { code: 'purchase',      name: 'NetSuite • Procurement',  icon: 'shopping-cart',
        desc: 'Vendors, POs, AP', source: 'NetSuite', open: '/netsuite/purchase-orders' },
      { code: 'items',         name: 'NetSuite • Items',        icon: 'package',
        desc: 'Item master, inventory, valuation', source: 'NetSuite', open: '/netsuite/items' },
      { code: 'plm',           name: 'Arena PLM',               icon: 'settings-2',
        desc: 'Engineering BOMs, change orders, part lifecycle', source: 'Arena PLM', open: '/arena/boms' },
      { code: 'mes',           name: 'Manufacturing Execution', icon: 'factory',
        desc: 'Shop floor, work orders, build steps', source: 'MES (custom)', open: '/mes/shop-floor' },
      { code: 'quality',       name: 'Arena QMS',               icon: 'shield-check',
        desc: 'NCRs, CAPAs, audits', source: 'Arena QMS', open: '/quality/ncrs' },
      { code: 'lean-erp-pro',  name: 'NetSuite Financials',     icon: 'landmark',
        desc: 'General ledger, FP&A, financial close', source: 'NetSuite', open: '/netsuite/general-ledger' },
      { code: 'asc606',        name: 'ASC 606 Revenue Rec',     icon: 'coins',
        desc: 'Revenue recognition for multi-element contracts', source: 'Aperture', open: 'https://asc606.zietra.com', external: true },
      { code: 'royalty',       name: 'Royalty Management',      icon: 'percent',
        desc: 'License agreements, royalty calculations, payouts', source: 'Royalty Mgmt', open: '/royalty/agreements' },
      { code: 'dropship',      name: 'Drop-ship + Ramp',        icon: 'truck',
        desc: 'Drop-ship POs, vendor fulfillment, Ramp cards', source: 'Ramp', open: '/ramp/cards' },
      { code: 'ai-agents',     name: 'AI Agents',               icon: 'bot',
        desc: 'AI assistants: NCR→CAPA, EVMS, Integration Sentinel', source: 'Anthropic', open: '/agents/ncr-capa' },
      { code: 'qb-migration',  name: 'QuickBooks Migration',    icon: 'git-pull-request-arrow',
        desc: 'QuickBooks data import to NetSuite-style accounting', source: 'Migration', open: '/quickbooks' }
    ];

    (async () => {
      // Wait for shell to load tenant
      while (!window.__ZIETRA_TENANT) await new Promise(r => setTimeout(r, 50));
      const t = window.__ZIETRA_TENANT;
      const enabled = new Set(t.features);
      const grid = document.getElementById('catalog-grid');

      for (const m of MODULE_CATALOG) {
        const on = enabled.has(m.code);
        const card = document.createElement('article');
        card.className = 'z-catalog-card';
        card.id = m.code;
        card.innerHTML = `
          <div class="z-icon">${window.__ZIETRA_ICONS?.[m.icon] || ''}</div>
          <h3>${m.name}</h3>
          <p>${m.desc}</p>
          <div style="margin-top: 10px; font-size: 11px; color: var(--z-text-3);">${m.source}</div>
          <span class="z-status ${on ? 'enabled' : 'disabled'}">${on ? 'Enabled' : '+ Add to plan'}</span>
          <br>
          ${on
            ? `<button onclick="location.href='${m.open}'${m.external ? '+\\'\\';window.open(\\''+m.open+'\\',\\'_blank\\')' : ''}">${m.external ? 'Open ↗' : 'Open'}</button>`
            : `<button class="secondary" onclick="alert('Stripe checkout ships in M4 — currently you can Try free if on trial plan')">${t.plan === 'trial' ? 'Try free' : 'Subscribe'}</button>`}
        `;
        grid.appendChild(card);
      }

      // If URL has #<code>, scroll to that card
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    })();
  </script>
</body>
</html>
```

---

## Playwright E2E Scaffold

### `tests/e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://turionspace.zietra.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: 'setup.spec.ts' },  // signs in once, saves storageState
    { name: 'chromium', use: { ...devices['Desktop Chrome'],
                               storageState: 'playwright/.auth/turion.json' },
      dependencies: ['setup'] },
    { name: 'webkit',   use: { ...devices['Desktop Safari'],
                               storageState: 'playwright/.auth/turion.json' },
      dependencies: ['setup'] },
  ],
});
```

### Proposed 20+ tests

| File | Test | What it asserts |
|---|---|---|
| `setup.spec.ts` | "sign in jm@techcloudpro.com and save storageState" | Magic-link login flow → saves auth state |
| `auth.spec.ts` | "anonymous /catalog redirects to /erp-login.html" | Phase 41 requireSession contract |
| `auth.spec.ts` | "signup new tenant smoke54-NNN → magic-link arrives in CloudWatch → land on slug.zietra.com" | Phase 52 contract — 60s+ wait |
| `auth.spec.ts` | "signup with reserved slug 'admin' → 409" | Backend reserved-slug check |
| `auth.spec.ts` | "sign out → land on erp-login.html" | Cognito sign-out |
| `nav.spec.ts` | "left rail contains 11 module groups for Turion" | All groups visible (all features enabled) |
| `nav.spec.ts` | "click Salesforce • Customers → URL=/salesforce/customers" | Wave-2 stub renders |
| `nav.spec.ts` | "click NetSuite • Sales Orders → URL=/netsuite/sales-orders + page contains 'SAT-001'" | Existing canonical page reused |
| `nav.spec.ts` | "click NetSuite • Vendors → URL=/netsuite/vendors + page contains 'Vendor'" | CF rewrite to vendor-index.html works |
| `nav.spec.ts` | "click NetSuite • General Ledger → page contains 'Trial Balance' OR 'Period 2026'" | Existing canonical |
| `nav.spec.ts` | "click Arena • BOMs → URL=/arena/boms + page contains 'BOM'" | CF rewrite to arena-bom.html |
| `nav.spec.ts` | "click MES • Shop Floor → page contains '9 production stages'" | Existing canonical |
| `nav.spec.ts` | "click Turion Satellite PLM → URL=/satellite/ + page contains 'Constellation'" | Existing satellite app |
| `nav.spec.ts` | "click AI Agent • NCR → CAPA → URL=/agents/ncr-capa + stub renders" | New stub |
| `nav.spec.ts` | "click QuickBooks → NetSuite → URL=/quickbooks" | Existing canonical |
| `nav.spec.ts` | "click ASC 606 Revenue Recognition → opens https://asc606.zietra.com in new tab" | External link |
| `nav.spec.ts` | "click Royalty Management → URL=/royalty/agreements + stub renders" | New stub |
| `nav.spec.ts` | "left rail filter input 'sales' shows 2 matches" | Existing filter behavior preserved |
| `nav.spec.ts` | "left rail collapse button → grid-template-columns=64px" | Collapse toggle |
| `nav.spec.ts` | "no console errors on any navigation click" | Catch-all regression |
| `catalog.spec.ts` | "/catalog renders 13 module cards" | All features visible |
| `catalog.spec.ts` | "13 cards have status=Enabled for Turion (plan=paid)" | Turion has all 13 features in trial seed |
| `catalog.spec.ts` | "/catalog#asc606 scrolls to ASC 606 card" | Hash routing |
| `catalog.spec.ts` | "card 'Open' button opens module landing page" | CTA flow |
| `catalog.spec.ts` | "new tenant in trial: ASC 606 card shows 'Try free' button" | Add-on CTA branch |
| `shell.spec.ts` | "top bar contains 'Turion Space' workspace name" | Tenant chrome |
| `shell.spec.ts` | "top bar plan badge says 'Paid' (Turion plan=paid)" | Plan badge logic |
| `shell.spec.ts` | "new tenant trial: top bar plan badge says 'Trial · N days left'" | Trial countdown |
| `shell.spec.ts` | "avatar dropdown contains 'Profile', 'Settings', 'Sign out'" | Avatar menu |
| `shell.spec.ts` | "shell DOES NOT inject inside /satellite/* pages" | Skip logic |
| `shell.spec.ts` | "shell DOES NOT inject on /signup or /cognito-auth-callback" | Skip logic |

**Total: 31 tests** (well above the 20 minimum). All deterministic; depend only on Turion seed + Phase 52 signup endpoint.

### `tests/e2e/setup.spec.ts` (auth state seeding)

```typescript
import { test as setup } from '@playwright/test';

setup('authenticate as Turion admin', async ({ page }) => {
  // Trigger magic-link, then poll CloudWatch for the nonce — OR pre-seed a JWT in localStorage.
  // Recommend: pre-seed an IdToken from Cognito AdminInitiateAuth in a CI helper, write to localStorage.
  // For local dev: read existing browser localStorage token by hand.

  // Simplest robust pattern: run a tiny Node helper that calls AdminInitiateAuth with USER_PASSWORD_AUTH,
  // gets IdToken, writes to playwright/.auth/turion.json as storageState. Phase 54.3 hardens this.

  await page.goto('https://turionspace.zietra.com/');
  // ... attach pre-baked IdToken to localStorage:'cognito_id_token' (matches cognito-auth.js)
  await page.context().storageState({ path: 'playwright/.auth/turion.json' });
});
```

### `package.json` additions

```json
{
  "scripts": {
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:turion": "E2E_BASE_URL=https://turionspace.zietra.com playwright test",
    "test:e2e:tenant": "playwright test  # uses E2E_BASE_URL from caller",
    "audit-buttons": "node scripts/audit-satellite-buttons.mjs && node scripts/audit-erp-buttons.mjs"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@playwright/test": "^1.45.0"
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Double-injection on the 53 pages already wired
**What goes wrong:** Migration script blindly inserts new shell, leaving old `shells/app-chrome.js` also loaded → 2 left rails render.
**Why it happens:** 53 pages currently have `<link href="/shells/enterprise-shell.css">` + `<script src="/shells/app-chrome.js" defer>`. The new injection adds NEW tags without removing old ones.
**How to avoid:** Migration script MUST strip `OLD_PATTERNS` regex (see `inject-shell.mjs` skeleton) before adding new injection.
**Warning signs:** Two visible rails or doubled CSS variables in DevTools.

### Pitfall 2: `tenant_features` empty list → blank nav
**What goes wrong:** `GET /api/tenants/current` returns `features: []` (e.g., RDS migration moment, new tenant before seeding) → all groups grey out, user sees an empty rail.
**Why it happens:** Race between tenant signup (Phase 52 endpoint inserts 13 rows) and shell first render.
**How to avoid:** If `features.length === 0`, show all groups in muted state with a banner "Workspace is initializing — try refresh in a few seconds" OR fall back to a default plan list. Recommend the banner.
**Warning signs:** Empty rail or all groups greyed-out for a brand-new tenant.

### Pitfall 3: CloudFront Function size cap (10 KB)
**What goes wrong:** Adding 27 new R-map entries pushes the function past 10240 B → publish-function fails with "CodeSize exceeds limit".
**Why it happens:** Current LIVE size is 7645 B (headroom 2595 B). Each entry ~50-80 B.
**How to avoid:** Use tiny URL paths (e.g., key `'/ns/items'` not `'/netsuite/items'`) OR collapse `/netsuite/*` and `/salesforce/*` into a regex match block that maps to existing files via path parsing.
**Warning signs:** `aws cloudfront update-function` returns size error.
**Mitigation:** Compact the R-map manually using short keys + a `prefix-strip` helper:
```javascript
// Compress new Phase-54 entries — saves ~600 B
['/salesforce/customers','/salesforce-customers.html'],
['/netsuite/sales-orders','/netsuite-customer-so.html'],
// ... use array-of-tuples instead of object
```

### Pitfall 4: `/satellite/*` chrome conflict
**What goes wrong:** Shell injects into `/satellite/index.html` → satellite's own `nav-strip` + `topbar` render BELOW the new shell header → 2 headers.
**Why it happens:** Migration script doesn't skip `/satellite/*`.
**How to avoid:** Inject script's `SKIP` list MUST include all `satellite/*.html` files (or skip the entire `satellite/` subdirectory). Plus runtime guard in `app-shell.js`: `if (location.pathname.startsWith('/satellite/')) return;`.
**Warning signs:** Two header rows on `turionspace.zietra.com/satellite/`.

### Pitfall 5: `royalty` slug catches the wildcard
**What goes wrong:** A new tenant signs up with `slug=royalty` → their workspace IS the Royalty Management module page → confusion.
**Why it happens:** `royalty` is NOT in the 17-entry RESERVED list in `turion-clean-urls.js`. The wildcard cert covers it.
**How to avoid:** Add `royalty`, `salesforce`, `netsuite`, `arena`, `mes`, `quality`, `agents`, `catalog`, `team`, `settings`, `help`, `quickbooks`, `ramp`, `marketing` to the RESERVED list (in BOTH `cf-function-source/turion-clean-urls.js` AND `backend/src/routes/tenants.ts`). Mirror change.
**Warning signs:** Existing customer experience tests can't sign up a tenant with one of these slugs.

### Pitfall 6: Lucide CDN `latest` redirects unpredictably
**What goes wrong:** `https://unpkg.com/lucide@latest/dist/umd/lucide.js` resolves to `1.16.0` today, but tomorrow might be `2.0` with API change.
**Why it happens:** Floating-tag CDN URLs.
**How to avoid:** Inline SVG strings (recommended — existing pattern at `shells/app-chrome.js:29-48`) OR pin: `https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js`.
**Warning signs:** Icons disappear after a CDN bump.

### Pitfall 7: Existing 53 pages depend on `.dash-top`, `.dash-header`, `.src-strip` etc.
**What goes wrong:** New `app-shell.css` doesn't include the dashboard-overrides → dashboards look broken inside the new shell.
**Why it happens:** `enterprise-shell.css:303-405` has specific rules for `.dash-top` (CEO/CFO/etc. role banners), `.dash-header`, `.src-strip`, `.kpi-strip` that the dashboard pages rely on.
**How to avoid:** Lift those rules verbatim into `app-shell.css` (rename CSS namespace `body[data-system="enterprise"]` → `body.z-shelled`).
**Warning signs:** CEO/CFO dashboards have ugly gradient banners or oversized headers.

### Pitfall 8: Shell injects before `cognito-auth.js` runs → API calls fail
**What goes wrong:** `app-shell.js` calls `window.erpApi.get('/api/tenants/current')` but `erp-api.js` is not yet loaded.
**Why it happens:** Script load order.
**How to avoid:** `app-shell.js` uses `defer` (script tag attribute) so it runs after DOMContentLoaded. By then `turion-config.js` + `cognito-auth.js` + `erp-api.js` (all loaded earlier in `<head>`) are ready. ALSO guard with: `if (!window.erpApi) { console.warn('[app-shell] erpApi missing — skipping'); return; }`.
**Warning signs:** First-load shell shows fallback "Zietra Workspace" name even on Turion.

### Pitfall 9: Trial countdown wraps to negative
**What goes wrong:** `trial_ends_at` already passed → countdown shows "-3 days left".
**Why it happens:** No floor at 0.
**How to avoid:** `const d = daysLeft(t.trial_ends_at); if (d === null) { /* paid */ } else if (d <= 0) { showBanner('Trial expired') } else if (d <= 7) { red } else { green }`.
**Warning signs:** Negative number in plan badge.

### Pitfall 10: Test suite runs against live prod and pollutes Turion data
**What goes wrong:** Playwright nav.spec.ts clicks "Create NCR" link and the live Turion backend gets a junk NCR.
**Why it happens:** Read-only nav tests are safe, but any mutation test against `turionspace.zietra.com` writes to prod DB.
**How to avoid:** ALL E2E tests are READ-ONLY. Any create/update/delete tests run against a freshly-signed-up smoke tenant + cleanup in `afterAll`. Matches Phase 52 smoke pattern.
**Warning signs:** Turion DB grows orphan rows after each CI run.

---

## State of the Art

| Old Approach | Current Approach | Why |
|---|---|---|
| One mega CSS file (`shells/enterprise-shell.css` 405 LOC) | Scoped design tokens via CSS custom properties | Easier per-tenant theming in M4 |
| Static `RAIL` const | Dynamic from `tenant_features` | Single source of truth |
| Generic labels ("Sales", "Finance") | Source-system labels ("NetSuite • Sales Orders") | User's explicit request — module-aware nav |
| 23 separate HTML stub files | Single `/catalog` SPA + hash routing | Lean deploy, single source of truth for catalog copy |
| Per-page `<header>` chrome (53 different patterns) | Single injected shell from `app-shell.js` | Reduces drift |
| Hardcoded "M. Rodriguez" user | `tenant.name` from API + email from Cognito session | Multi-tenant |

**Deprecated/outdated (kill in Wave 2):**
- `/shells/app-chrome.js` (replaced by `/app-shell.js`)
- `/shells/enterprise-shell.css` (replaced by `/app-shell.css`)
- `/shells/landing.css` (still used by `index.html` — leave for Turion-only landing)
- Hardcoded "Sample data · M. Rodriguez · Production · live data" placeholders

---

## Code Examples

### Example 1: Top bar render with tenant chrome

```javascript
function buildTopBar(tenant) {
  const days = daysLeft(tenant.trial_ends_at);
  const planLabel = tenant.plan === 'paid' ? 'Paid'
                  : (days <= 0 ? 'Trial expired'
                              : `Trial · ${days} day${days===1?'':'s'} left`);
  const planClass = tenant.plan === 'paid' ? 'paid'
                  : (days <= 7 ? 'trial-amber' : 'trial');

  const bar = el('header', { className: 'z-topbar' });
  bar.appendChild(el('a', { className: 'z-workspace', href: '/settings' }, [
    el('span', { className: 'z-ws-name' }, [tenant.name || 'Zietra Workspace']),
    el('span', { className: 'z-ws-sub' }, ['Workspace'])
  ]));
  bar.appendChild(el('nav', { className: 'z-breadcrumb' }, [renderBreadcrumb(location.pathname)]));
  const right = el('div', { className: 'z-topbar-right' });
  right.appendChild(el('span', { className: `z-plan-badge ${planClass}` }, [planLabel]));
  right.appendChild(buildAvatarMenu(tenant));
  bar.appendChild(right);
  return bar;
}
```

### Example 2: Left rail render with feature gating

```javascript
function buildLeftRail(taxonomy, enabled, currentPath) {
  const rail = el('aside', { className: 'z-rail', 'aria-label': 'Primary navigation' });
  rail.appendChild(buildWorkspaceBadge());

  for (const grp of taxonomy) {
    const anyEnabled = grp.items.some(i => enabled.has(i.code));
    const section = el('div', {
      className: 'z-rail-section' + (anyEnabled ? '' : ' disabled')
    });
    const head = el('button', { className: 'z-rail-section-h', type: 'button' }, [
      icon(grp.icon), el('span', { className: 'z-rail-section-name' }, [grp.group]),
      icon('chevron-right')
    ]);
    section.appendChild(head);
    const list = el('div', { className: 'z-rail-section-body' });

    if (!anyEnabled) {
      // Disabled group → single CTA
      const cta = el('a', {
        className: 'z-nav-cta', href: '/catalog#' + grp.items[0].code
      }, ['+ Add to plan']);
      list.appendChild(cta);
    } else {
      for (const it of grp.items) {
        if (!enabled.has(it.code)) continue;  // hide items whose feature is off
        const a = el('a', {
          className: 'z-nav-link' + (currentPath === it.href ? ' active' : ''),
          href: it.href,
          ...(it.external ? { target: '_blank', rel: 'noopener' } : {})
        }, [icon(it.icon || grp.icon), el('span', null, [it.label])]);
        list.appendChild(a);
      }
    }
    section.appendChild(list);

    // Auto-expand the section containing the current path
    if (grp.items.some(i => i.href === currentPath)) section.classList.add('open');
    rail.appendChild(section);
  }

  // Bottom rail (always visible)
  const bottom = el('div', { className: 'z-rail-bottom' });
  for (const b of BOTTOM_NAV) {
    bottom.appendChild(el('a', {
      className: 'z-nav-link' + (currentPath === b.href ? ' active' : ''),
      href: b.href
    }, [icon(b.icon), el('span', null, [b.label])]));
  }
  rail.appendChild(bottom);
  return rail;
}
```

---

## Resources Phase 54 will use

| Resource | Identifier |
|---|---|
| ERP API base | `https://lo254mvukl.execute-api.us-east-1.amazonaws.com` |
| Sat API base | `https://rjydekliee.execute-api.us-east-1.amazonaws.com` |
| `GET /api/tenants/current` | both APIs — same JSON shape (Phase 53 contract) |
| S3 bucket | `turion-demo-static` |
| CF distribution | `E37R9PT8IL44L2` |
| CF Function | `turion-clean-urls` (LIVE 7645 B, headroom 2595 B) |
| Cognito user pool | `us-east-1_KQuNS85nP` |
| Cognito app client | `1tuq2a1eedd3hvdsl0kvtu55ih` |
| `public.tenants` (Turion) | id=`00000000-0000-0000-0000-000000000001`, slug=`turion`, plan=`paid`, 13 features |
| Existing shell (PRIOR ART) | `shells/app-chrome.js` 283 LOC + `shells/enterprise-shell.css` 405 LOC + 53 pages already wired |
| Family map (PRIOR ART) | `shells/family-map.json` — 5 system shells + 48 pages mapped |
| Existing CF rewrites | 60+ entries; need ~27 new for Phase-54 nav |
| Deploy script | `./deploy-frontend.sh` (s3 sync + CF invalidation) |
| Inject pattern (PRIOR ART) | `scripts/wire_shells.py` — proven idempotent on 48 pages |
| Audit script | `npm run audit-buttons` (must pass after nav additions) |
| Smoke pattern (PRIOR ART) | `scripts/smoke-phase-53.sh` (autonomous, anchor-guarded, re-runnable) |

---

## Recommended Wave Structure (refined for planner)

- **Wave 1 (1 plan, ~60 min):** **54-01 — Design system + `app-shell.js` + `app-shell.css` + `NAV_TAXONOMY` inline.** Vanilla shell renders left rail + top bar. Per-tenant chrome reads `GET /api/tenants/current`. NO page injection yet (just the new files at root). Manual smoke: open `/app-shell.css` returns 200, open existing page with `<script src="/app-shell.js">` injected by hand → shell renders.

- **Wave 2 (parallel, 3 plans, ~90 min):**
  - **54-02 — Migration script + injection into 96 pages.** Idempotent `inject-shell.mjs`. Skips `signup.html`, `cognito-auth-callback.html`, `/satellite/*`. Strips old `/shells/app-chrome.js` from the 53 already-wired pages and replaces with new path. CloudFront invalidation. **Mirror change to satellite** — none (satellite is skipped). **Smoke:** marker `<!-- ZIETRA-SHELL-INJECTED -->` count = 89 (96 minus 4 skips minus ~3 dynamic). Re-run is no-op.
  - **54-03 — Catalog page + 13 stub landing pages + bottom-nav stubs.** `catalog.html` with `MODULE_CATALOG` const + hash routing. All 17 NEW stub pages with shell wrapper, hard-coded "Coming soon" copy + screenshot placeholder. Plus `team.html`, `settings.html`, `help.html`. **Smoke:** `curl /catalog` returns 200; `/catalog#asc606` opens at right anchor; `/team` returns 200 stub.
  - **54-04 — CF Function update (27 new R-map entries) + RESERVED slug expansion.** Add new rewrites to `turion-clean-urls.js`. Add 14 module-namespace slugs to RESERVED (`royalty`, `salesforce`, `netsuite`, `arena`, `mes`, `quality`, `agents`, `catalog`, `team`, `settings`, `help`, `quickbooks`, `ramp`, `marketing`). Mirror RESERVED change in `backend/src/routes/tenants.ts`. **Smoke:** new URLs return 200; bogus tenant `royalty.zietra.com` returns 404.

- **Wave 3 (1 plan, ~90 min):** **54-05 — Playwright E2E scaffold + 31 tests + smoke + Phase 54.1 CHECKPOINT.md.** Bootstrap `tests/e2e/`, `playwright.config.ts`, `npm install -D @playwright/test`, `npx playwright install`. 31 tests (auth/nav/catalog/shell). All read-only against Turion + 1 fresh smoke tenant with cleanup. Run via `npm run test:e2e:turion`. **Phase 54.1 CHECKPOINT.md** documents `/team` stub contract for the team-invites phase.

**Total estimated time: ~4 hours of executor work** across 5 plans.

---

## Open Questions

1. **Storage state for E2E tests — how to obtain a Cognito IdToken in CI without magic-link?**
   - What we know: Phase 39 supports `AdminInitiateAuth USER_PASSWORD_AUTH` if a user has a permanent password. Phase 52 sets a temporary password on signup. Admin (`jm@techcloudpro.com`) does NOT have `USER_PASSWORD_AUTH` enabled on the app client.
   - What's unclear: Whether to add `USER_PASSWORD_AUTH` to the existing client OR add a CI-only client + IAM service-account flow OR poll CloudWatch for magic-link nonce (slow).
   - Recommendation: For Phase 54 — manual one-time IdToken capture committed to `playwright/.auth/turion.json` (gitignored), works for local dev. Phase 54.3 owns the CI hardening (could rotate the token in a GitHub Action via a Cognito service-account Lambda).

2. **Catalog "Subscribe" button — what does M4 wire to?**
   - What we know: M4 is Stripe Subscriptions. Phase 54 stubs the button.
   - What's unclear: Should the stub call a `POST /api/tenant-features/upgrade` endpoint that flips a boolean (mock), or just `alert()`?
   - Recommendation: `alert('Stripe checkout ships in M4')` — keeps the stub honest. Don't fake-enable features.

3. **`/agents/ncr-capa` etc. — split agent-sales-cash.html into 3 stubs OR rewire it?**
   - What we know: `agent-sales-cash.html` has 4 agent buttons (S2C, NCR, EVMS, Sentinel) on one page. The backend `/api/agents/ncr-capa`, `/api/agents/evms`, `/api/agents/integration-sentinel` endpoints all exist (verified `backend/src/app.ts:13,136`).
   - What's unclear: Whether splitting into 3 pages is "rewriting existing functionality" (CONTEXT.md OUT scope) or "creating stubs for new nav URLs".
   - Recommendation: Create 3 new stub pages (`stubs/agents-ncr-capa.html` etc.) that show a single agent runner card + history. Leave existing `agent-sales-cash.html` at `/agent-sales-cash` URL unchanged for backward compat. Wave 2 deliverable.

4. **Mobile nav?**
   - What we know: CONTEXT.md doesn't explicitly require mobile. Existing `enterprise-shell.css:277-286` hides rail at `max-width: 768px`.
   - What's unclear: Hamburger menu vs full hide.
   - Recommendation: Hide-the-rail (existing pattern). Full mobile is out-of-scope for Phase 54; document as M8 task.

5. **What about Turion's existing `index.html` (28 KB rich landing)?**
   - What we know: Turion's home page is a 4-panel architecture flow diagram, very specific to Turion's ETO + satellite story. Other tenants don't have this story.
   - What's unclear: Should `/` route differently per tenant?
   - Recommendation: KEEP `index.html` as-is (Turion gets the rich landing, other tenants get the same page with shell wrapper — looks fine; they can still navigate from the rail). Phase 54.1 or M7 may add `/` per-tenant variants.

---

## Sources

### Primary (HIGH confidence)

- `/Users/jeet/turion-space-demo/shells/app-chrome.js` (283 LOC) — existing app-shell DNA
- `/Users/jeet/turion-space-demo/shells/enterprise-shell.css` (405 LOC) — existing design tokens
- `/Users/jeet/turion-space-demo/shells/family-map.json` — 48-page family/shell mapping
- `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js` (179 LOC) — CF Function R-map
- `/Users/jeet/turion-space-demo/index.html` (28 KB) — Turion landing page reference
- `/Users/jeet/turion-space-demo/ns-shared.css` (512 LOC) — NetSuite palette reference
- `/Users/jeet/turion-space-demo/scripts/wire_shells.py` — idempotent injection precedent
- `/Users/jeet/turion-space-demo/package.json` — existing test deps (vitest)
- `/Users/jeet/doordash-p2p/.planning/phases/53-m5-…/CHECKPOINT.md` — `/api/tenants/current` contract
- `/Users/jeet/turion-space-demo/satellite/index.html` — satellite has own shell (`satellite-shell.css`)
- `/Users/jeet/turion-space-demo/agent-sales-cash.html` — 4 agents on one page (lines 318-510 verified)
- `/Users/jeet/turion-space-demo/backend/src/app.ts:136` — `/api/agents` route mount
- `ls /Users/jeet/turion-space-demo/*.html` — 88 HTML files inventoried
- `curl -sI https://unpkg.com/lucide@latest/dist/umd/lucide.js` → HTTP 302 → `1.16.0` (pin recommended)
- `curl -sI https://asc606.zietra.com` → HTTP 307 (separate Next.js distro confirmed)
- `curl -s https://royalty.zietra.com` → 28921 B = byte-identical Turion index (wildcard catch, no separate distro)
- `grep -c "shells/app-chrome.js"` → 53 pages already wired

### Secondary (MEDIUM confidence)

- [Playwright docs — storageState](https://playwright.dev/docs/auth#reuse-signed-in-state) — standard auth-state reuse pattern
- [Lucide GitHub releases](https://github.com/lucide-icons/lucide/releases) — 0.460+ semver
- WebSearch: "Linear left rail design" — confirms section-based collapsible pattern is industry standard

### Tertiary (LOW confidence)

- (none — every claim verified against codebase or live HTTP)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vanilla JS + Playwright pinned; existing infrastructure (CF Function, Lambda, Cognito) all stable
- Architecture: HIGH — evolving existing `/shells/app-chrome.js` is concrete; skeletons given
- URL inventory: HIGH — `ls` + R-map cross-referenced; ~17 new stubs identified
- Pitfalls: HIGH — drawn from prior phase patterns (Phase 41 shell injection, Phase 53 CF Function size, Phase 52 idempotent migration)
- Catalog content: MEDIUM — descriptions written by researcher (per CONTEXT.md §10); user may want to tweak
- E2E test names: MEDIUM — proposed; planner refines exact assertions

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (M6 in flight; revisit if CONTEXT changes)

---

## RESEARCH COMPLETE

**Phase:** 54 - M6 modular UI shell + module-aware navigation + add-on catalog
**Confidence:** HIGH

### Key Findings

1. **Existing shell asset to evolve, not greenfield.** `/Users/jeet/turion-space-demo/shells/app-chrome.js` (283 LOC) + `enterprise-shell.css` (405 LOC) already implement left rail, collapsible sections, SVG icons, filter input, workspace badge, dashboard-page chrome overrides. 53 pages already inject this shell. Phase 54 should LIFT this into `/app-shell.js` + `/app-shell.css`, replace the hardcoded `RAIL` const with a `NAV_TAXONOMY` driven by `tenant_features`, and replace the fake "M. Rodriguez" user with `GET /api/tenants/current` data. Don't double-maintain.

2. **URL inventory: ~12 reuse + 17 new stubs.** 12 of the proposed nav URLs map to existing HTML files via CF Function rewrites (e.g., `/netsuite/sales-orders` → `netsuite-customer-so.html` which is the same page as `/sales/orders`). 17 NEW stub pages needed (`salesforce/customers`, `netsuite/invoices`, `arena/parts`, `mes/work-orders`, `quality/ncrs/capas/audits`, `royalty/agreements`, 3 agent stubs, 1 marketing stub, plus 4 bottom-rail stubs). CF Function has 2595 B headroom — fits all ~27 new R-map entries.

3. **ASC 606 is external; Royalty is on-distribution stub.** `asc606.zietra.com` is a separate Next.js CloudFront distribution (verified 307 redirect to /marquee, Aperture brand). Nav opens in new tab. `royalty.zietra.com` does NOT exist as a separate distro — wildcard catches it and serves Turion (28921 B byte-identical). Phase 54 must ADD `royalty` (and 13 other module-namespace tokens) to the RESERVED slug list to prevent tenant-name collisions.

4. **Playwright scaffold straightforward but needs auth state strategy.** Standard `@playwright/test` install + `playwright.config.ts` with `storageState` for auth reuse. CI hardening (token rotation via Cognito service-account Lambda) deferred to Phase 54.3. Phase 54 ships 31 tests across `auth/nav/catalog/shell` spec files — all read-only on Turion + 1 fresh smoke tenant.

5. **`/agents/*` should split into 3 stub pages.** Current `agent-sales-cash.html` runs 4 agents on one page (S2C, NCR→CAPA, EVMS, Sentinel). Phase 54 nav wants 3 dedicated URLs. Create stubs that POST to existing `/api/agents/ncr-capa`, `/api/agents/evms`, `/api/agents/integration-sentinel` backend routes (verified in `backend/src/app.ts:13,136`). Leave existing combined page at `/agent-sales-cash` for backward compat.

### File Created

`/Users/jeet/doordash-p2p/.planning/phases/54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog/54-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All pinned + verified live (Playwright versions, Lucide CDN, existing CF Function size) |
| Architecture | HIGH | Concrete skeletons provided; evolution path from existing `/shells/` is unambiguous |
| URL Inventory | HIGH | `ls` + R-map verified; CF size budget checked |
| Pitfalls | HIGH | Drawn from prior phases (53 CF size, 52 idempotency, 41 injection, 36 nav audit) |
| Catalog Copy | MEDIUM | Researcher-drafted per CONTEXT.md §10; user may tweak |
| E2E Auth | MEDIUM | Pattern known but CI hardening deferred to 54.3 |

### Open Questions (carry to planner)

1. CI strategy for Playwright auth-state acquisition (deferred to Phase 54.3 — Phase 54 ships local-dev-only)
2. Catalog "Subscribe" button — recommend `alert()` stub, M4 wires Stripe
3. Whether to expand `/agent-sales-cash` into 3 dedicated pages (recommend YES per §Pattern 4)
4. Mobile nav strategy (recommend: keep existing hide-rail at 768px breakpoint; full mobile in M8)
5. `/` (root) per-tenant variation (recommend: keep Turion's rich `index.html` as fallback for all tenants for now)

### Ready for Planning

Research complete. Planner can now create PLAN.md files for the recommended 5-plan wave structure (54-01 shell · 54-02 inject · 54-03 catalog+stubs · 54-04 CF Function · 54-05 Playwright).
