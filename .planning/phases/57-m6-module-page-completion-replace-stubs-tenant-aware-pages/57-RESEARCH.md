# Phase 57: M6 — Module Page Completion (16 stubs → real pages + backend gap-fill + Turion-content tenant-aware verification)

**Researched:** 2026-05-15
**Domain:** Tenant-scoped multi-page CRUD UI on top of existing RLS-protected Express backend; vanilla HTML/JS in turion-space-demo; backend route gap-fill for LIST/DETAIL endpoints; Turion-content page tenant-awareness audit.
**Confidence:** HIGH — all backend surfaces, RLS patterns, page templates, and module catalog ground-truth verified file:line in the repo.

---

## Summary

Phase 57 is **execution-heavy, low-novelty**: every primitive needed already exists in the codebase. The 16 stub pages must be replaced with real list+detail+create pages following the **`team.html` pattern** (Phase 54.1) for shell+role-gating and the **`onboarding/migrate-salesforce.html` pattern** (Phase 54.4-02) for form+POST. Six existing Turion-content pages (`netsuite-items.html`, `netsuite-customer-so.html`, `netsuite-procurement.html`, `netsuite-financials.html`, `arena-bom.html`, `mes-shop-floor.html`) need a tenant-awareness audit — they call `erpApi.*` (good, RLS protects data) but contain hardcoded "Turion Space · TURION-PROD" branding strings in their JSX that must be parameterized via `/api/tenants/current.name`.

Backend gap-fill is the **only meaningful new code**: ~24 new GET routes (LIST + DETAIL pairs) across `netsuite.ts` (already done for most via `keyedEntity`), `arena.ts` (already done via `keyedEntity`), `mes.ts` (needs `/work-orders`, `/build-steps`), `agents.ts` (needs `/runs` history endpoints + `agent_runs` migration), and a brand-new `royalty.ts` route file with companion migration. **Most of the LIST/DETAIL endpoints already exist** — the gap-fill is far smaller than the original scope statement claims (see §F audit).

**Primary recommendation:** Extract `/lib/page-template.js` as a vanilla shared helper exposing `window.zPage.renderList({columns,fetchUrl,detailModal,createModal,roleGate})` to avoid 16× code duplication. Each new page becomes a ~80-line HTML file that wires in a per-page spec object. Backend: add migration 033 (royalty) + 034 (agent_runs); royalty must be created from scratch, agent_runs needs new schema + retrofit into existing `agents.ts` POST handlers to record run history.

---

## User Constraints

CONTEXT.md does not exist for Phase 57 (no `/gsd:discuss-phase 57` was run). However, the **global engineering rules** from MEMORY.md and the ROADMAP Phase 57 entry act as hard constraints:

### Locked Decisions (from ROADMAP Phase 57 + MEMORY.md global rules)

- **No hardcoded DB-derivable values** anywhere — extends prior satellite-frontend rule to ALL code. Tenant name, slug, module list, role enums, status enums — ALL from API/DB. No "Turion Space" string in HTML.
- **Every link leads somewhere useful** — no dead ends, no stubbed toasts. Every action persists to DB. Stub pages must become functional pages.
- **No shortcuts, no assumptions** — verify before writing code that depends on something. Smoke-test every endpoint with `grep` before plan-time.
- **All workflows work the same** — one shell (`app-shell.{css,js}` Phase 54.0), one nav (`/api/tenants/current.modules`), one breadcrumb pattern, one form idiom across modules. Phase 57 pages MUST honor this — reuse `team.html` chrome.
- **Remove dead code as you find it** — if a stub page has copy-pasted code that's now dead, delete it.
- **No unnecessary code** — no wrappers/flags/error-handling for cases that can't happen.
- **Replace 16 specific stub files** (verbatim from ROADMAP Phase 57): `salesforce-customers, salesforce-opportunities, netsuite-invoices, netsuite-journal-entries, arena-parts, arena-change-orders, mes-work-orders, mes-build-steps, quality-ncrs, quality-capas, quality-audits, royalty-agreements, agents-ncr-capa, agents-evms, agents-integration, ramp-cards`.
- **Verify 6 Turion-content pages** are tenant-aware: `netsuite-items.html, netsuite-customer-so.html, netsuite-procurement.html, netsuite-financials.html, arena-bom.html, mes-shop-floor.html`.
- **Build real `settings.html` + `help.html`** (currently 64-line stubs).
- **Marketing/coming-soon stays a stub** — intentional placeholder, do not touch.
- **Stripe checkout UI is out of scope** (M4 Phase 56 paused). Settings page should have a "Manage subscription (coming soon)" placeholder card only.

### Claude's Discretion

- Page template implementation approach: shared `/lib/page-template.js` helper (RECOMMENDED) vs per-page repetition (rejected — violates DRY + "one shell" rule). Detail viewer modal-vs-new-page choice — modal is faster, no route required.
- Wave/plan grouping (proposed in §K — 4 plans).
- Pagination strategy: client-side (≤500 rows) vs backend cursor (>500 rows). Recommend client-side for V1; backend cursor deferred to M8 (load testing phase).
- Detail modal vs detail page: modal preferred (no new route, no CF Function R-map entry, no extra HTTP).
- Migration numbering (033 for royalty, 034 for agent_runs — Phase 56 takes 033 per their plan if it ever runs; we assume Phase 56 is paused so we take 033 first; safe because if Phase 56 resumes they'll see ours and bump to 035).
- The Turion-page audit: scope is "verify tenant-awareness + empty-state path works" not "full refactor". If a Turion page crashes for a brand-new tenant with zero data, fix the empty-state ONLY; do not rebuild the page.

### Deferred Ideas (OUT OF SCOPE)

- Stripe checkout UI (`/billing/upgrade`, `/billing` portal — M4 Phase 56)
- AI Agents Anthropic integration changes (just expose existing endpoints in UI; don't add new tools)
- ASC 606 page in-app (already external link to `https://asc606.zietra.com` — no in-app page)
- New backend business logic — only LIST/DETAIL/CREATE endpoints to mirror what already exists
- Performance optimization (deferred to M8 — pages can be slow on first load)
- Mobile responsive audit (best-effort matching existing patterns)
- Salesforce OAuth pull, Excel `.xlsx` parsing (Phase 54.4 deferrals — still deferred)
- Cross-tenant onboarding PATCH probe in RLS tests (Phase 55 deferral)
- Logo upload on settings (defer to M7/M8 polish)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| `SalesforceCrmRealPages` | Real `salesforce/customers` + `salesforce/opportunities` pages with list+detail+create | §C backend already has full CRUD in `routes/salesforce.ts`; §D page specs P1+P2; §K Wave 1 |
| `NetSuiteListPages` | Real list+detail pages for `netsuite/invoices`, `netsuite/journal-entries`; verify items/SO/procurement/financials are tenant-aware | §C backend has invoices/journal-entries LIST+DETAIL via `keyedEntity` (already exists); §D P3+P4; §E Turion-page audit; §K Wave 1+Wave 2 |
| `ArenaListPages` | Real `arena/parts` + `arena/change-orders` (= ECOs) pages | §C backend has parts/ecos LIST+DETAIL via `keyedEntity` (already exists); §D P5+P6; §K Wave 2 |
| `MesListPages` | Real `mes/work-orders` + `mes/build-steps` pages + backend GET routes | §C BACKEND GAP: `mes.ts` only has `/stages` — needs `/work-orders` and `/build-steps`. Tables exist in `turion.work_orders` (per `netsuite.ts:83`) but no MES route. §D P7+P8; §K Wave 3 |
| `QualityListPages` | Real `quality/ncrs` + `quality/capas` + `quality/audits` pages | §C backend has ncrs/capas/audits LIST+DETAIL via `keyedEntity` (already exists); §D P9+P10+P11; §K Wave 3 |
| `RoyaltyMgmtPages` | Real `royalty/agreements` page + entire new backend route file + schema migration | §C BACKEND GAP: no `royalty.ts` exists; no `turion.royalty_*` tables. Need migration 033 + new `routes/royalty.ts`. §D P12; §K Wave 3 |
| `AiAgentsUi` | Real UI for `agents/ncr-capa`, `agents/evms`, `agents/integration` showing run history + manual trigger + view output | §C BACKEND GAP: agents.ts has 4 POST trigger endpoints but NO run-history persistence. Need migration 034 `agent_runs` table + retrofit POST handlers to record runs + new GET `/api/agents/runs` endpoint. §D P13+P14+P15; §K Wave 4 |
| `RampDropshipPages` | Real `ramp/cards` page showing Ramp card transactions | §C backend has `/api/ramp/card-txns` LIST (already exists, returns full rows). §D P16; §K Wave 2 |
| `SettingsHelpPages` | Real `settings.html` + `help.html` pages (currently 64-line stubs) | §C `/api/tenants/current` returns name/slug/plan/features/onboarding_state. §F new Settings spec + Help spec; §K Wave 4 |
| `BackendListEndpointsGapFill` | Add missing GET list/detail endpoints | §C exhaustive endpoint audit. Real gaps: `mes /work-orders`+`/build-steps`, `royalty/*`, `agents/runs`. §K Wave 1-3 + Wave 4 (agents) |
| `TurionPagesTenantAwarenessVerified` | Verify 6 large Turion-content pages query tenant-scoped data and render empty-state for new tenants without crashing | §E full audit protocol; §K Wave 2 |

---

## Standard Stack

### Core (already in repo — DO NOT introduce new libraries)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla HTML/CSS/JS | — | All frontend pages | Project convention (Phase 27+); no bundler; deploys directly to S3 |
| `papaparse` | 5.4.1 | CSV import (only when needed; Phase 57 mostly uses JSON forms) | Already at `/lib/papaparse-5.4.1.min.js` (19,469 bytes) |
| `express` | ^4 | Backend router | Existing `backend/src/app.ts` |
| `pg` (`Pool`, `PoolClient`) | ^8 | Postgres client | Existing `backend/src/db.ts` |
| `@anthropic-ai/sdk` | ^0 | AI Agents (already imported in `routes/agents.ts`) | Existing — only Run-history extension, not new tools |
| `cognito-auth.js` | — | Frontend session gate | Every page does `await window.cognitoAuth.requireSession()` |
| `erp-api.js` | — | Frontend HTTP wrapper | Exposes `window.erpApi.{get, post, patch, put, del}` (see `erp-api.js:76-81`) |
| `app-shell.{js,css}` | — | Shell wrapper (Phase 54.0) | Auto-injected via `<!-- ZIETRA-SHELL-INJECTED -->` marker; provides nav rail + top bar |

### Supporting (already loaded by app-shell)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `turion-config.js` | API base URL config | Every page loads it first |
| `ns-toast.js` | Existing toast notification (NetSuite skin) | Reuse on existing Turion-content pages; for new pages use simple `<div role="alert">` or `dialog#errModal` |
| `shells/sortable-tables.js` | Auto-sortable `<table>` | Wire into new list pages (`<table data-sortable>`) |
| `shells/edit-modal.js` | Modal helper | Reuse for detail modal on new pages |
| `shells/cmd-k-palette.js` | Command palette | Already global; no per-page wiring |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla `<table>` + JS render loop | DataTables, AG Grid, TanStack Table | Adds 50-200 KB dep; violates "vanilla HTML/JS" rule; SortableTables already in shell |
| Plain HTML form for create | React Hook Form, Vue + Vuetify | Major framework intro; rejected per project convention |
| Backend cursor pagination (offset/limit) | Keyset pagination | Premature optimization for V1 (avg tenant <500 rows); defer to M8 |
| Real-time updates (WebSocket / SSE) | None | Defer — list pages refresh on user action; not real-time use case |
| Detail page (`/salesforce/customers/CUST-001.html`) | Detail modal in-place | Detail page = 1 extra HTTP + new CF R-map entry per detail view × 16 pages = 16 more R-map entries (each costs bytes against the 10,240-byte cap). Modal = zero extra routes. |

**Installation:** None. Phase 57 introduces ZERO new dependencies.

---

## Architecture Patterns

### Recommended File Structure (additions only — no folder reorganization)

```
turion-space-demo/
├── lib/
│   └── page-template.js          (NEW — 1 shared helper, ~300 lines)
├── stubs/                        (EMPTY at end of phase — 16 files removed)
├── salesforce/                   (NEW dir)
│   ├── customers.html
│   └── opportunities.html
├── netsuite/                     (NEW dir; existing top-level pages stay)
│   ├── invoices.html
│   └── journal-entries.html
├── arena/                        (NEW dir; existing arena-*.html stay for now)
│   ├── parts.html
│   └── change-orders.html
├── mes/                          (NEW dir)
│   ├── work-orders.html
│   └── build-steps.html
├── quality/                      (NEW dir)
│   ├── ncrs.html
│   ├── capas.html
│   └── audits.html
├── royalty/                      (NEW dir)
│   └── agreements.html
├── agents/                       (NEW dir)
│   ├── ncr-capa.html
│   ├── evms.html
│   └── integration.html
├── ramp/                         (NEW dir; existing ramp.html stays)
│   └── cards.html
├── settings.html                 (REPLACED — was 64-line stub)
├── help.html                     (REPLACED — was 64-line stub)
└── backend/
    ├── migrations/
    │   ├── 033_royalty.sql       (NEW)
    │   └── 034_agent_runs.sql    (NEW)
    └── src/routes/
        ├── royalty.ts            (NEW)
        ├── mes.ts                (MODIFY — add /work-orders + /build-steps)
        └── agents.ts             (MODIFY — wrap POST handlers to record runs, add GET /runs)
```

**Decision:** Directory-per-module pattern (`/salesforce/customers.html`) over flat (`/salesforce-customers.html`) because:
1. Matches existing nav rail link structure (`/sales/account`, `/finance/general-ledger` in `index.html`)
2. CF Function R-map already prefers prefix-based routing
3. Future per-module sub-pages (settings, drill-downs) land cleanly

### Pattern 1: Shared `page-template.js` (THE central new pattern)

**What:** Single vanilla-JS helper exposing `window.zPage.{renderList, renderDetailModal, renderCreateModal}` that takes a per-page spec object and renders the full list/detail/create flow.

**When to use:** Every one of the 16 new list pages. Settings + Help do NOT use it (they're configuration, not list-of-records).

**Example:**

```javascript
// /lib/page-template.js (NEW)
// Single source-of-truth for list+detail+create across all 16 new module pages.
// Consumed by: every */{name}.html file added in Phase 57.

(function () {
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // spec = {
  //   title:        string,               // "Salesforce — Customers"
  //   icon:         string,               // optional shell icon
  //   fetchUrl:     string,               // "/api/salesforce/customers" — returns {id: source_data} object OR array
  //   listColumns:  [{key, label, fmt?}], // 5-7 columns max
  //   searchKeys:   [string],             // client-side substring search
  //   detailFields: [{key, label, fmt?}], // 15-25 fields for modal
  //   createForm:   [{key, label, type, required, placeholder, options?}],
  //   createUrl:    string,               // "/api/salesforce/customers" — POST
  //   createIdKey:  string | fn,          // body field used as id, OR fn(values) -> id
  //   roleGate:     [string],             // ['admin','manager'] roles allowed to create
  //   emptyState:   {title, body, ctaLabel?, ctaHref?},
  //   detailIdKey:  string,               // default 'id'
  // }
  async function renderList(spec) {
    await window.cognitoAuth.requireSession();
    const me = window.cognitoAuth.getCurrentUser?.() || {};
    const tenant = await window.erpApi.get('/api/tenants/current');
    const myRole = await loadMyRole(tenant.id, me.sub);
    const canCreate = spec.roleGate.includes(myRole);

    // Render shell
    document.body.insertAdjacentHTML('beforeend', `
      <main class="z-list" style="max-width:1100px;margin:32px auto;padding:24px;">
        <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h1 id="z-title">${escapeHtml(spec.title)}</h1>
          <div>
            <input id="z-search" placeholder="Search…" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;margin-right:8px;">
            ${canCreate ? `<button id="z-create" class="z-cta-btn">+ New</button>` : ''}
          </div>
        </header>
        <table id="z-table" data-sortable style="width:100%;border-collapse:collapse;">
          <thead><tr>${spec.listColumns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
          <tbody id="z-rows"><tr><td colspan="${spec.listColumns.length}" style="text-align:center;padding:24px;">Loading…</td></tr></tbody>
        </table>
        <div id="z-pagination" style="margin-top:16px;display:flex;gap:8px;justify-content:center;"></div>
        <div id="z-empty" style="display:none;text-align:center;padding:48px;"></div>
      </main>
      <dialog id="z-detail-modal"></dialog>
      ${canCreate ? `<dialog id="z-create-modal"></dialog>` : ''}
    `);

    // Fetch + filter + paginate
    let rows = [];
    try {
      const data = await window.erpApi.get(spec.fetchUrl);
      // Normalize: backend returns either object-keyed-by-id OR array OR {rows:[]}
      if (Array.isArray(data)) rows = data;
      else if (Array.isArray(data?.rows)) rows = data.rows;
      else rows = Object.entries(data || {}).map(([id, v]) => ({ id, ...v }));
    } catch (err) {
      document.querySelector('#z-rows').innerHTML = `<tr><td colspan="${spec.listColumns.length}" style="color:#dc2626;padding:24px;">Failed to load: ${escapeHtml(err.message)}. <button onclick="location.reload()">Retry</button></td></tr>`;
      return;
    }

    if (rows.length === 0) {
      document.querySelector('#z-table').style.display = 'none';
      document.querySelector('#z-empty').style.display = 'block';
      document.querySelector('#z-empty').innerHTML = `
        <h2>${escapeHtml(spec.emptyState.title)}</h2>
        <p>${escapeHtml(spec.emptyState.body)}</p>
        ${spec.emptyState.ctaHref ? `<a href="${spec.emptyState.ctaHref}" class="z-cta-btn">${escapeHtml(spec.emptyState.ctaLabel)}</a>` : ''}
        ${canCreate ? `<button onclick="window.zPage._openCreate()" class="z-cta-btn" style="margin-left:8px;">+ Create first</button>` : ''}
      `;
      return;
    }

    let filtered = rows, page = 0;
    const PAGE_SIZE = 25;
    function renderPage() {
      const start = page * PAGE_SIZE;
      const slice = filtered.slice(start, start + PAGE_SIZE);
      document.querySelector('#z-rows').innerHTML = slice.map(r => `
        <tr style="cursor:pointer" data-id="${escapeHtml(r[spec.detailIdKey || 'id'])}">
          ${spec.listColumns.map(c => `<td>${c.fmt ? c.fmt(r) : escapeHtml(r[c.key] ?? '—')}</td>`).join('')}
        </tr>
      `).join('');
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      document.querySelector('#z-pagination').innerHTML =
        Array.from({length: totalPages}, (_, i) =>
          `<button data-page="${i}" style="padding:4px 10px;${i===page?'background:#7c3aed;color:#fff;':''}">${i+1}</button>`
        ).join('');
    }
    renderPage();

    // Search
    document.querySelector('#z-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      filtered = rows.filter(r => spec.searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
      page = 0; renderPage();
    });

    // Pagination
    document.querySelector('#z-pagination').addEventListener('click', (e) => {
      const p = e.target.dataset.page;
      if (p != null) { page = Number(p); renderPage(); }
    });

    // Detail modal on row click
    document.querySelector('#z-rows').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const row = filtered.find(r => String(r[spec.detailIdKey||'id']) === tr.dataset.id);
      _openDetail(row, spec);
    });

    // Create modal
    if (canCreate) {
      document.querySelector('#z-create').addEventListener('click', () => _openCreate(spec));
      window.zPage._openCreate = () => _openCreate(spec);
    }
  }

  function _openDetail(row, spec) {
    const dlg = document.querySelector('#z-detail-modal');
    dlg.innerHTML = `
      <form method="dialog" style="min-width:520px;max-width:760px;padding:24px;">
        <h2 style="margin:0 0 16px;">${escapeHtml(row[spec.detailIdKey||'id'])}</h2>
        <dl style="display:grid;grid-template-columns:160px 1fr;gap:8px 16px;">
          ${spec.detailFields.map(f => `
            <dt style="font-weight:600;color:#6b7280;">${escapeHtml(f.label)}</dt>
            <dd style="margin:0;">${f.fmt ? f.fmt(row) : escapeHtml(row[f.key] ?? '—')}</dd>
          `).join('')}
        </dl>
        <menu style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button type="submit">Close</button>
        </menu>
      </form>`;
    dlg.showModal();
  }

  function _openCreate(spec) {
    const dlg = document.querySelector('#z-create-modal');
    dlg.innerHTML = `
      <form id="z-create-form" style="min-width:480px;padding:24px;">
        <h2 style="margin:0 0 16px;">New ${escapeHtml(spec.title.replace(/^.*— /,''))}</h2>
        ${spec.createForm.map(f => `
          <label style="display:block;margin:8px 0;">
            <span style="display:block;font-weight:600;font-size:13px;">${escapeHtml(f.label)}${f.required?' *':''}</span>
            ${f.type === 'select'
              ? `<select name="${escapeHtml(f.key)}" ${f.required?'required':''}>${f.options.map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select>`
              : f.type === 'textarea'
              ? `<textarea name="${escapeHtml(f.key)}" placeholder="${escapeHtml(f.placeholder||'')}" ${f.required?'required':''} style="width:100%;min-height:80px;"></textarea>`
              : `<input name="${escapeHtml(f.key)}" type="${escapeHtml(f.type||'text')}" placeholder="${escapeHtml(f.placeholder||'')}" ${f.required?'required':''} style="width:100%;padding:6px;">`
            }
          </label>
        `).join('')}
        <p id="z-create-err" style="color:#dc2626;min-height:1.2em;"></p>
        <menu style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" onclick="document.querySelector('#z-create-modal').close()">Cancel</button>
          <button type="submit" class="z-cta-btn">Create</button>
        </menu>
      </form>`;
    dlg.showModal();
    dlg.querySelector('#z-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const values = Object.fromEntries(fd);
      const id = typeof spec.createIdKey === 'function' ? spec.createIdKey(values) : values[spec.createIdKey];
      try {
        await window.erpApi.post(spec.createUrl, { id, ...values });
        window.location.reload();
      } catch (err) {
        document.querySelector('#z-create-err').textContent = err.message || 'Create failed';
      }
    });
  }

  async function loadMyRole(tenantId, sub) {
    try {
      const team = await window.erpApi.get('/api/team');
      const me = (team.members || []).find(m => m.cognito_sub === sub);
      return me?.role || 'viewer';
    } catch { return 'viewer'; }
  }

  window.zPage = { renderList };
})();
```

**Per-page consumer (example: `salesforce/customers.html` ~80 lines):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Salesforce • Customers · Zietra</title>
  <script src="/turion-config.js"></script>
  <script src="/cognito-auth.js"></script>
  <script src="/erp-api.js"></script>
  <script>(async () => { await window.cognitoAuth.requireSession(); })();</script>
  <!-- ZIETRA-SHELL-INJECTED -->
  <link rel="stylesheet" href="/app-shell.css">
  <script src="/app-shell.js" defer></script>
  <script src="/lib/page-template.js"></script>
  <style>.z-cta-btn{padding:8px 16px;border-radius:6px;background:#7c3aed;color:#fff;border:0;cursor:pointer;font-weight:600;}</style>
</head>
<body>
<script>
(async () => {
  await window.zPage.renderList({
    title: 'Salesforce — Customers',
    fetchUrl: '/api/salesforce/customers',
    listColumns: [
      { key: 'name',     label: 'Name' },
      { key: 'email',    label: 'Email' },
      { key: 'industry', label: 'Industry' },
      { key: 'phone',    label: 'Phone' },
      { key: '_imported_at', label: 'Imported', fmt: r => r._imported_at ? new Date(r._imported_at).toLocaleDateString() : '—' },
    ],
    searchKeys: ['name', 'email', 'industry'],
    detailFields: [
      { key: 'id', label: 'Account ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'industry', label: 'Industry' },
      { key: 'annual_revenue', label: 'Annual revenue' },
      { key: 'description', label: 'Description' },
      { key: '_origin', label: 'Origin' },
      { key: '_imported_via', label: 'Imported via' },
    ],
    createForm: [
      { key: 'id', label: 'Account ID', type: 'text', required: true, placeholder: 'CUST-001' },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'annual_revenue', label: 'Annual revenue (USD)', type: 'number' },
      { key: 'description', label: 'Notes', type: 'textarea' },
    ],
    createUrl: '/api/salesforce/customers',
    createIdKey: 'id',
    roleGate: ['admin', 'manager'],
    emptyState: {
      title: "You haven't created any customers yet.",
      body: 'Import from Salesforce or create one manually.',
      ctaLabel: 'Migrate from Salesforce →',
      ctaHref: '/onboarding/migrate/salesforce',
    },
  });
})();
</script>
</body>
</html>
```

### Pattern 2: Turion-content page tenant-name parameterization

**What:** Existing pages like `netsuite-items.html` have hardcoded `Turion Space · TURION-PROD` strings in `<header>` HTML (verified line 39: `<span style="opacity: 0.85;">Turion Space · TURION-PROD</span>`).

**Fix:** Replace with `<span data-z-tenant-name></span>` and let `app-shell.js` populate it from `/api/tenants/current.name + ' · ' + .slug.toUpperCase() + '-PROD'`.

```javascript
// add to app-shell.js (or new /lib/tenant-chrome.js)
window.addEventListener('zietra-shell-ready', async () => {
  const tenant = await window.erpApi.get('/api/tenants/current').catch(() => null);
  if (!tenant) return;
  document.querySelectorAll('[data-z-tenant-name]').forEach(el => {
    el.textContent = `${tenant.name} · ${tenant.slug.toUpperCase()}-PROD`;
  });
});
```

The 3 grep-confirmed Turion-branding hits (per Bash check above) are:
- `netsuite-items.html:39` — top bar
- `arena-bom.html` — at least one occurrence
- `mes-shop-floor.html` — at least one occurrence

Audit each of the 6 pages exhaustively in plan 57-02.

### Pattern 3: Backend LIST + DETAIL with RLS (already exists)

All existing LIST + DETAIL endpoints follow this pattern (see `netsuite.ts:24-77` `keyedEntity` and `arena.ts:14-65` `keyedEntity`). For the new royalty + agent-runs + MES gap-fill, reuse THIS pattern verbatim:

```typescript
// New routes/mes.ts additions (sketch)
// Source: pattern from /Users/jeet/turion-space-demo/backend/src/routes/netsuite.ts:24-77

r.get('/work-orders', async (req, res) => {
  const out = await withTenantClient(req, async (client) => {
    const r = await client.query(`SELECT id, source_data FROM turion.work_orders ORDER BY id`);
    return r.rows.map(row => ({ id: row.id, ...row.source_data }));
  });
  res.json(out);
});
r.get('/work-orders/:id', async (req, res) => {
  const data = await withTenantClient(req, async (client) => {
    const r = await client.query(`SELECT source_data FROM turion.work_orders WHERE id = $1`, [String(req.params.id)]);
    return r.rows[0]?.source_data ?? null;
  });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
});
```

NOTE: `turion.work_orders` already exists — `netsuite.ts:83` registers `keyedEntity('/work-orders', 'work_orders')` so `/api/netsuite/work-orders` already works. The MES page should call THAT endpoint, OR we add an MES-namespaced clone. **Recommendation: have `mes/work-orders.html` call `/api/netsuite/work-orders` (no new backend code needed for work-orders)**. Only `/api/mes/build-steps` needs to be added if there's a `turion.build_steps` table.

### Anti-Patterns to Avoid

- **DON'T duplicate the list+detail+create UI 16 times.** Use the shared helper.
- **DON'T hardcode "Turion" / "TURION-PROD" anywhere.** Use `data-z-tenant-name` + chrome populator.
- **DON'T add a new backend endpoint without checking if the table already has `keyedEntity` registered** — most do. The list/detail GAP is much smaller than the original Phase 57 scope claims.
- **DON'T add a new route file per module** (e.g., per-page `salesforce-customers.ts`). Existing per-system route file (`salesforce.ts`, `netsuite.ts`, `arena.ts`, `mes.ts`) is the right shape.
- **DON'T introduce a framework** (React, Vue, Svelte). The project is vanilla; nav rail + shell expect plain DOM.
- **DON'T build new pagination middleware on backend.** Client-side filter+page in `page-template.js` is sufficient for V1 (current scale 3 tenants × ~3,070 rows).
- **DON'T add a detail page per record.** Modals only (avoids 16+ CF R-map entries).
- **DON'T add a global "create new" floating button.** Per-page button is gate-able by role.
- **DON'T set `role` from JWT directly** — always go through `requireRole` middleware or `loadMyRole` in `page-template.js`, both of which hit `public.tenant_users` (Phase 54.1 pattern). JWT role is fallback only.
- **DON'T forget to honor `tenant_features.enabled`** — if the user's tenant has the module DISABLED, the page should redirect to `/catalog` (nav rail already hides disabled modules, but direct URL nav bypasses nav).
- **DON'T touch `marketing-coming-soon.html` stub** — it's intentional per Phase 57 scope.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML-escape user content | Custom `htmlEscape()` per page | `escapeHtml()` from `page-template.js` (or copy the proven 1-liner from `team.html:147`) | Already proven in production (Phase 54.1+); centralized once |
| Modal dialog | Custom `<div>` + show/hide | Native `<dialog>` with `.showModal()` / `<form method="dialog">` close | Native, ESC-key close for free, `team.html` already uses this pattern |
| Table sort | Custom click-handler per page | `<table data-sortable>` (Phase 54.0 shell loads `shells/sortable-tables.js` globally) | Free in shell |
| Toast / banner | Custom CSS+animation | `nsToast(...)` for NetSuite-skinned pages; `<p class="z-err">` + aria-live for new pages | Already loaded |
| Role check | Read `req.user.role` from JWT | `requireRole('admin','manager')` middleware | JWT can be stale (60s TTL on `tenant_users` change); Phase 54.1 invalidates cache on PATCH |
| Tenant context in DB | Hand-build `WHERE tenant_id = ?` | `withTenantClient(req, async client => …)` (RLS auto-enforces via `app.tenant_id` GUC) | Phase 55 makes this MANDATORY — RLS denies cross-tenant reads even if you forget |
| CSV import | Custom row parser | `papaparse` 5.4.1 (already at `/lib/papaparse-5.4.1.min.js`) | Phase 57 mostly doesn't need CSV — JSON forms via `erpApi.post` |
| Audit log | Custom `INSERT INTO audit_log` per route | Existing `AUDIT_SQL` pattern in each route file (`turion.audit_log` with `current_setting('app.tenant_id')`) | All existing routes follow this; new routes should too |
| Run-history persistence for AI agents | New `agent_run_log` table per agent | Single shared `turion.agent_runs` table keyed by `agent_kind` enum (`ncr-capa`/`evms`/`integration`/`sales-cash`) | Avoids 4× tables; uniform UI query |
| Pagination | Backend cursor / Postgres `LIMIT`/`OFFSET` for V1 | Client-side `Array.slice(page*25, page*25+25)` in `page-template.js` | Scale is tiny (~3K rows max); offload to client; deferred backend cursor → M8 |

**Key insight:** The entire Phase 57 surface is built on top of patterns that already exist for `team.html`, `onboarding/migrate-*.html`, and `keyedEntity` in `netsuite.ts`/`arena.ts`. Hand-rolling ANY of these creates drift; reuse aggressively.

---

## Common Pitfalls

### Pitfall 1: Backend endpoint already exists → planner adds a duplicate

**What goes wrong:** Original scope statement says "add LIST + DETAIL for arena/parts" — but `arena.ts:67-74` already has `keyedEntity('/ncrs', 'ncrs')` etc. and `keyedEntity` registers LIST + DETAIL + POST + PATCH for `parts` is missing from the `keyedEntity()` calls list (only `ncrs/capas/audits/procedures/persons/tools/qms_docs/arena_docs` are registered there). The `parts-create` route exists but no `/api/arena/parts` LIST.

**Why it happens:** The `arena.ts` file has BOTH `keyedEntity` calls AND bespoke `parts-create`/`ecos-create`/`ncrs-create` POST routes — confusing scope.

**How to avoid:** Per-endpoint `grep` audit. Planner MUST run `grep -n "r.get.*parts\|r.get.*ecos" /Users/jeet/turion-space-demo/backend/src/routes/arena.ts` before scoping. (See §C for completed audit.)

**Warning signs:** Plan task description says "add backend endpoint X" without a "verified missing via grep" annotation.

### Pitfall 2: `turion.work_orders` LIST exists but at `/api/netsuite/work-orders`, NOT `/api/mes/work-orders`

**What goes wrong:** Frontend asks "where do MES work orders live?" — answer is `/api/netsuite/work-orders` (registered at `netsuite.ts:83`). Adding `/api/mes/work-orders` creates 2 endpoints querying the same table.

**Why it happens:** Turion's data model is single-system (NetSuite is system-of-record); MES is a "view" over the same data. The catalog says `open: '/mes/shop-floor'` but underlying data is `turion.work_orders`.

**How to avoid:** `mes/work-orders.html` should call `/api/netsuite/work-orders` (the existing route). Document this explicitly in `page-template.js` spec comment. Do NOT add `mes.ts` `/work-orders` route. Same for `mes/build-steps.html` — check if `turion.build_steps` exists; if not, may need to inspect `turion.mes_stages` columns to see what represents "build steps".

**Warning signs:** Planner proposes adding `/api/mes/work-orders` without checking `netsuite.ts` first.

### Pitfall 3: Royalty schema doesn't exist — migration 033 must come FIRST in any task chain

**What goes wrong:** `royalty/agreements.html` calls `/api/royalty/agreements` but the table doesn't exist → 500 error. The frontend page can't be deployed before the backend route + migration.

**Why it happens:** Royalty is the only module with ZERO existing backend (per Bash grep: only mentioned in tenants.ts allow-list and recommend-rules.json scoring).

**How to avoid:** Plan 57-03 must order: (a) migration 033 → (b) route file `routes/royalty.ts` → (c) frontend page. Or: build frontend page first against a stub backend that returns `[]`, then wire real backend.

**Warning signs:** Plan attempts to build `royalty/agreements.html` and `routes/royalty.ts` in parallel without the migration as dep.

### Pitfall 4: AI Agent run history requires retrofit, not just add

**What goes wrong:** Plan says "add GET /api/agents/runs" — but the 4 existing POST handlers (`/run`, `/ncr-capa`, `/evms`, `/integration-sentinel`) don't persist their `trace` to a `turion.agent_runs` table. Adding a GET endpoint that returns from a never-populated table gives empty results.

**Why it happens:** Existing handlers return `{trace, soId, …}` to the client and that's it; the trace lives in the response body only.

**How to avoid:** Migration 034 creates `turion.agent_runs (id uuid PK, tenant_id uuid, agent_kind text, started_at timestamptz, completed_at timestamptz, status text, trace jsonb, output jsonb)`. Wrap each existing POST handler at end:
```ts
await client.query(
  `INSERT INTO turion.agent_runs (id, agent_kind, started_at, completed_at, status, trace, output, tenant_id)
   VALUES ($1,$2,$3,$4,$5,$6,$7,current_setting('app.tenant_id')::uuid)`,
  [runId, 'ncr-capa', startTs, new Date(), 'success', trace, {capaId: ids.capaId}]
);
```
Then GET `/api/agents/runs?kind=ncr-capa` is satisfiable.

**Warning signs:** Plan task for "GET /api/agents/runs" doesn't mention modifying the 4 existing POST handlers.

### Pitfall 5: Turion-content page has hardcoded sample data in client JS

**What goes wrong:** `netsuite-items.html` may have `<script>const items = [{id:'ADCS-RW-MEDIUM-A',...}];</script>` blocks that bypass `erpApi`. Even though RLS is enforced on the backend, the page renders the hardcoded data unconditionally → leaks Turion data to other tenants visually.

**Why it happens:** Phase 27-36 pages were built with seed-data-as-JS-constants before tenant scoping was a concern (Phase 36 partially de-hardcoded but not completely audited per `mes-shop-floor.html` / `arena-bom.html`).

**How to avoid:** Plan 57-02 audit task: for each of the 6 Turion-content pages, grep for inline `const`/`var`/`let` blocks that look like data arrays. Replace with `await erpApi.get('/api/…')` call. Test as a brand-new tenant (slug = `qa-empty`) and confirm page renders empty-state, not Turion data.

**Warning signs:** Page works for `turion` tenant but shows Turion data when logged in as a different tenant.

### Pitfall 6: CloudFront R-map size cap (10,240 bytes)

**What goes wrong:** Phase 54.4 left CF Function `turion-clean-urls.js` at 10,024 bytes — only 216 bytes of headroom. Phase 57 adds ~22 new clean URLs (16 stub replacements + 6 directory-pattern routes). Each entry is ~50 bytes → ~1,100 bytes. **Hard breach.**

**Why it happens:** The CF Function inlines a R-map literal; each `['/foo', '/foo/index.html']` is a string in source.

**How to avoid:** TWO mitigations in Plan 57-04:
1. **Compress the R-map** by using directory-fallback pattern: `if (path.startsWith('/salesforce/')) return path + '.html'` — collapses N customer entries to 1 prefix rule
2. **Delete the 16 obsolete stub entries** (they map to `/stubs/*.html` which no longer exist). Net: -800 bytes (16 entries × ~50 bytes).

Test new size with `wc -c cf-function-source/turion-clean-urls.js` before `aws cloudfront update-function`. Hard cap is **10,240 bytes** — must be under.

**Warning signs:** Plan adds CF entries one-by-one without size accounting; no task to delete old `/stubs/*` entries.

### Pitfall 7: `tenant_features.enabled=false` lets user nav-rail-bypass-load disabled modules

**What goes wrong:** Phase 54.4 wizard disables modules; nav rail hides disabled modules; BUT direct URL `/salesforce/customers` still loads the HTML page → which calls `/api/salesforce/customers` → backend responds with the data (RLS allows it because it's tenant-scoped). User sees data for a module they "don't have".

**Why it happens:** Backend doesn't currently gate by `tenant_features.enabled`. The wizard is a UX gate, not an enforcement gate.

**How to avoid:** TWO options:
- **Frontend:** Each page checks `tenant.features[code].enabled` after loading `/api/tenants/current`; if false, redirect to `/catalog?upgrade=<code>`.
- **Backend:** Add `requireFeature('crm')` middleware analogous to `requireRole`. M4 (Phase 56) will need this anyway for paid-add-on enforcement.

**Recommendation:** Frontend-only check in Phase 57 (lightweight, sub-100 LOC). Backend feature gating is M4 (Phase 56) territory. Document the gap explicitly in CHECKPOINT.

**Warning signs:** Plan does NOT mention `tenant_features.enabled` check in `page-template.js`.

### Pitfall 8: Backend LIST endpoints return huge JSON for big tenants

**What goes wrong:** `/api/netsuite/items` returns ALL items as a single JSON object. For a tenant with 5K items, that's ~5MB JSON. APIGW has a 6MB cap on Lambda response (actually 10MB for proxy integrations, but base64-encoded so effectively 6MB). Beyond that → silent 502.

**Why it happens:** Current `keyedEntity` does `SELECT * ORDER BY id` with no LIMIT.

**How to avoid:** For V1, do not introduce backend pagination (scale is 3 tenants × ~3K rows total). Add a `LIMIT 1000` safety net to `keyedEntity` LIST and a console.warn if rowCount === 1000. Document for M8 to add real cursor pagination.

**Warning signs:** Plan adds backend cursor pagination — REJECT; defer.

### Pitfall 9: Settings page `delete tenant` is dangerous + hard to undo

**What goes wrong:** Admin clicks "Delete tenant" → cascade deletes all tenant data + Cognito users. No undo. One misclick = catastrophe.

**Why it happens:** "Danger zone" in spec.

**How to avoid:** Either (a) defer Delete to M8 (mark as "Coming soon — contact support to delete tenant" link to `mailto:security@zietra.com`), or (b) require typing tenant slug to confirm + 7-day grace-period soft-delete (set `tenants.deleted_at` and run nightly cron). **Recommend (a) for Phase 57** — out of scope per "no backend business logic" rule.

**Warning signs:** Plan implements live tenant delete with `DELETE FROM tenants WHERE id = ?`.

### Pitfall 10: New page CF deploy + invalidation but stale `app-shell.js` clients keep old nav

**What goes wrong:** New `salesforce/customers.html` deployed; nav rail still shows "Salesforce — Customers (coming soon)" from cached `app-shell.js`.

**Why it happens:** `app-shell.js` has 5-min browser cache + CF cache; `inject-shell.mjs` populates nav from `/lib/module-catalog.js` (also cached).

**How to avoid:** Per-deploy CF invalidation `aws cloudfront create-invalidation --paths "/*"` (already standard in `./deploy-frontend.sh`). Document in Plan 57-04 deploy task. If `module-catalog.js` is edited (to remove "stub" markers), include it in invalidation path explicitly.

**Warning signs:** Plan deploys without CF invalidation step.

---

## Code Examples

Verified patterns from official sources:

### Backend GET LIST endpoint (RLS-aware, exists in 8+ files)

```typescript
// Source: /Users/jeet/turion-space-demo/backend/src/routes/netsuite.ts:25-32
r.get(routePath, async (req, res) => {
  const out = await withTenantClient(req, async (client) => {
    const rows = await client.query(`SELECT id, source_data FROM turion.${table} ORDER BY id`);
    const o: Record<string, any> = {};
    for (const row of rows.rows) o[row.id] = row.source_data;
    return o;
  });
  res.json(out);
});
```

### Backend POST CREATE with audit_log (existing pattern)

```typescript
// Source: /Users/jeet/turion-space-demo/backend/src/routes/netsuite.ts:44-62
r.post(routePath, async (req, res) => {
  const newRecord = req.body || {};
  const id = newRecord.id;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required (string)' });
  const result = await withTenantClient<{kind:'err'}|{kind:'ok'}>(req, async (client) => {
    const existing = await client.query(`SELECT id FROM turion.${table} WHERE id = $1`, [id]);
    if (existing.rows.length) return { kind: 'err' };
    await client.query(
      `INSERT INTO turion.${table} (id, source_data, tenant_id) VALUES ($1, $2, current_setting('app.tenant_id')::uuid)`,
      [id, newRecord]
    );
    await client.query(AUDIT_SQL, [table, id, 'CREATE', null, newRecord]);
    return { kind: 'ok' };
  });
  if (result.kind === 'err') return res.status(409).json({ error: 'id already exists' });
  res.status(201).json({ ok: true, id, source_data: newRecord });
});
```

### Frontend page (full minimal page consuming `page-template.js`) — see §"Pattern 1 example" above

### Migration 033 sketch — Royalty schema

```sql
-- backend/migrations/033_royalty.sql (NEW)
-- Phase 57 plan 03 — Royalty Management module
-- Pattern: copy from migration 023_qb_ramp.sql for table shape; copy RLS pattern from migration 030_rls_policies.sql.

CREATE TABLE turion.royalty_agreements (
  id text PRIMARY KEY,
  licensor text,
  licensee text,
  product_line text,
  rate_pct numeric(5,2),
  effective_date date,
  expires_date date,
  status text DEFAULT 'active',  -- active|expired|terminated
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_royalty_agreements_tenant_id ON turion.royalty_agreements(tenant_id);

CREATE TABLE turion.royalty_payouts (
  id text PRIMARY KEY,
  agreement_id text NOT NULL REFERENCES turion.royalty_agreements(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  revenue_basis numeric(14,2),
  payout_amount numeric(14,2),
  status text DEFAULT 'pending',  -- pending|paid|disputed
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_royalty_payouts_tenant_id ON turion.royalty_payouts(tenant_id);
CREATE INDEX idx_royalty_payouts_agreement ON turion.royalty_payouts(agreement_id);

-- RLS — copied from migration 030_rls_policies.sql pattern
ALTER TABLE turion.royalty_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion.royalty_agreements FORCE ROW LEVEL SECURITY;
CREATE POLICY royalty_agreements_tenant_isolation ON turion.royalty_agreements
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE turion.royalty_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion.royalty_payouts FORCE ROW LEVEL SECURITY;
CREATE POLICY royalty_payouts_tenant_isolation ON turion.royalty_payouts
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON turion.royalty_agreements TO zietra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON turion.royalty_payouts TO zietra_app;
```

### Migration 034 sketch — Agent Runs

```sql
-- backend/migrations/034_agent_runs.sql (NEW)
-- Phase 57 plan 04 — AI Agents run-history persistence
CREATE TABLE turion.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_kind text NOT NULL CHECK (agent_kind IN ('sales-cash','ncr-capa','evms','integration-sentinel')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',  -- running|success|failed
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by_sub text,  -- cognito sub
  error_message text,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_agent_runs_tenant_kind ON turion.agent_runs(tenant_id, agent_kind, started_at DESC);

ALTER TABLE turion.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion.agent_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_runs_tenant_isolation ON turion.agent_runs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE ON turion.agent_runs TO zietra_app;
```

### New routes/royalty.ts skeleton

```typescript
// backend/src/routes/royalty.ts (NEW)
// Phase 57 plan 03 — copy patterns from routes/arena.ts:14-65 (keyedEntity)
import { Router } from 'express';
import { withTenantClient } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { tenantContext } from '../middleware/tenant';

const r = Router();
r.use(tenantContext, requireAuth);

const AUDIT_SQL = `INSERT INTO turion.audit_log (entity, entity_id, action, before_data, after_data, tenant_id)
   VALUES ($1, $2, $3, $4, $5, current_setting('app.tenant_id')::uuid)`;

// LIST agreements
r.get('/agreements', async (req, res) => {
  const rows = await withTenantClient(req, async (client) => {
    const r = await client.query(
      `SELECT id, licensor, licensee, product_line, rate_pct, effective_date, expires_date, status, source_data
       FROM turion.royalty_agreements ORDER BY id`
    );
    return r.rows;
  });
  res.json(rows);
});

// DETAIL
r.get('/agreements/:id', async (req, res) => {
  const data = await withTenantClient(req, async (client) => {
    const r = await client.query(`SELECT * FROM turion.royalty_agreements WHERE id = $1`, [req.params.id]);
    return r.rows[0] ?? null;
  });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
});

// CREATE (admin/manager)
r.post('/agreements', requireRole('admin','manager'), async (req, res) => {
  const body = req.body || {};
  const { id, licensor, licensee, product_line, rate_pct, effective_date, expires_date } = body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const result = await withTenantClient<{kind:'err'}|{kind:'ok'}>(req, async (client) => {
    const existing = await client.query(`SELECT id FROM turion.royalty_agreements WHERE id = $1`, [id]);
    if (existing.rows.length) return { kind: 'err' };
    await client.query(
      `INSERT INTO turion.royalty_agreements (id, licensor, licensee, product_line, rate_pct, effective_date, expires_date, source_data, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,current_setting('app.tenant_id')::uuid)`,
      [id, licensor, licensee, product_line, rate_pct, effective_date, expires_date, body]
    );
    await client.query(AUDIT_SQL, ['royalty_agreements', id, 'CREATE', null, body]);
    return { kind: 'ok' };
  });
  if (result.kind === 'err') return res.status(409).json({ error: 'id already exists' });
  res.status(201).json({ ok: true, id });
});

// Payouts (LIST + DETAIL only for V1)
r.get('/payouts', async (req, res) => {
  const rows = await withTenantClient(req, async (client) => {
    const r = await client.query(
      `SELECT id, agreement_id, period_start, period_end, revenue_basis, payout_amount, status, source_data
       FROM turion.royalty_payouts ORDER BY period_start DESC, id`
    );
    return r.rows;
  });
  res.json(rows);
});
r.get('/payouts/:id', async (req, res) => {
  const data = await withTenantClient(req, async (client) => {
    const r = await client.query(`SELECT * FROM turion.royalty_payouts WHERE id = $1`, [req.params.id]);
    return r.rows[0] ?? null;
  });
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
});

export default r;
```

Then mount in `app.ts:105`-ish:
```typescript
import royalty from './routes/royalty';
// …
app.use('/api/royalty', royalty);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-page hand-rolled list/detail in 16 stubs | Shared `/lib/page-template.js` helper consumed by each page spec | Phase 57 (NEW) | -80% code per page; one bug-fix point; uniform UX |
| Hardcoded "Turion Space · TURION-PROD" in HTML | `<span data-z-tenant-name>` populated by app-shell from `/api/tenants/current` | Phase 57 (this is Rule-4 enforcement extending Phase 36's de-hardcoding work) | Tenant-correct branding everywhere; no per-page leak |
| 4× per-agent run history (would-be) tables | Single `turion.agent_runs` table with `agent_kind` enum | Phase 57 migration 034 (new) | Uniform UI query; consistent retention/cleanup |
| Detail page per record (`customers/CUST-001.html`) | Detail modal in-page | Phase 57 (NEW pattern) | Zero CF R-map cost; no extra route per detail; faster UX (no full page load) |
| Backend pagination via cursor | Client-side `Array.slice(page*25, page*25+25)` for V1 | Phase 57 (V1 only) | Sub-100ms detail-modal-open; defer real pagination to M8 |
| Frontend reads role from JWT directly | Frontend asks `/api/team`, finds own row, uses that role | Phase 54.1 → extended in Phase 57 `page-template.js` | Role mutations propagate in 60s without forcing logout |

**Deprecated/outdated:**
- **Stub pages (`/stubs/*.html`)** — 16 of 17 to be deleted; only `marketing-coming-soon.html` survives. Update `cf-function-source/turion-clean-urls.js` to remove stub-mapping entries (frees ~800 bytes against 10,240 cap).
- **`requireRole` from JWT only** — Phase 54.1 already moved to DB lookup; new pages MUST follow same pattern.
- **Detail-page routing** — anywhere code currently does `window.location.href = '/foo/' + id` for "view detail", convert to modal (Phase 57 uniform UX rule). Existing Turion-content pages can keep their drill-down routes (they're feature-rich pages, not modals).

---

## Open Questions

1. **`turion.build_steps` table existence — does it exist or do we need migration 035?**
   - What we know: `mes.ts:10-50` only handles `/stages` against `turion.mes_stages`. The catalog says `open: '/mes/shop-floor'` for MES. `mes-shop-floor.html` exists (71 KB rich page).
   - What's unclear: Whether `turion.build_steps` is a real table or whether "build steps" data lives nested inside `mes_stages.source_data->steps[]`.
   - Recommendation: Plan 57-03 first task = `\dt turion.*` against Aurora to confirm. If no `build_steps` table, either (a) shape `mes/build-steps.html` to read `mes_stages.source_data->steps` aggregated across stages, or (b) add migration to extract steps to dedicated table. Prefer (a) — defer schema change.

2. **What "data" does `mes-work-orders` show vs `arena-bom`?**
   - What we know: Both work-orders and BOM share `turion.work_orders` table (per `netsuite.ts:83` `keyedEntity` registration).
   - What's unclear: Which fields are the "work-order view" vs the "BOM view".
   - Recommendation: Plan 57-03 first task = sample 5 rows from `turion.work_orders` and decide column subset for MES vs BOM views.

3. **`royalty_agreements` schema — what fields do real licensors need?**
   - What we know: Module is generic — D2C "license your brand to a reseller", aerospace "patent licensing royalty", SaaS "white-label royalty". All want: licensor, licensee, rate%, period, payout.
   - What's unclear: Per-unit vs per-revenue royalty calc. Tiered rates. Minimum guarantees. Reporting cadence.
   - Recommendation: Phase 57 ships flat schema (per migration 033 sketch above) with `source_data jsonb` overflow. Per-unit, tiered, minimums → defer to "Royalty v2" in M8.

4. **Backend feature gating: `tenant_features.enabled=false` enforcement at API layer?**
   - What we know: Phase 56 (M4 Stripe) is paused. Phase 54.4 wizard sets enabled flags; nav rail hides disabled modules; backend doesn't enforce.
   - What's unclear: Whether Phase 57 should add `requireFeature(...)` middleware now or defer to M4.
   - Recommendation: Defer to M4 (Phase 56). Phase 57 adds frontend-only check in `page-template.js` (redirect to `/catalog` if `!tenant.features[code].enabled`). Document the API-layer enforcement gap in CHECKPOINT.

5. **AI Agents UI: trigger button or auto-poll?**
   - What we know: 4 POST handlers (sales-cash, ncr-capa, evms, integration-sentinel) take ~5-30s due to Anthropic API roundtrips.
   - What's unclear: Should `agents/ncr-capa.html` show a "Run agent" button + spin until done, or auto-poll `/api/agents/runs` for new runs?
   - Recommendation: Run-button + spinner + show last 10 runs from history. NO auto-poll (waste of Anthropic credits). User clicks "Run again" to trigger fresh.

6. **Settings page: what's the "danger zone" actually?**
   - What we know: Phase 57 scope says "delete tenant (admin only)".
   - What's unclear: Is deletion actually feasible without losing the Cognito user? Soft-delete vs hard-delete?
   - Recommendation: Plan 57-04 implements ONLY "Coming soon — contact support@zietra.com to delete tenant" link. No active delete endpoint. Tenant lifecycle = M8 territory.

7. **CRM customers — where do imports land vs where does `/api/salesforce/customers` read?**
   - What we know: `onboarding/migrate/salesforce` inserts into `turion.customers` via `sf-csv-import.ts:78` (target table not shown in research yet but inferable from pattern).
   - Wait — let me check: in `csv-import.ts` `importItems` writes to `turion.items` (line ~70 in research). Importers write to `turion.*`. `salesforce.ts:14-22` reads from `turion.customers`. **CONFIRMED: they share `turion.customers` table.** Good.
   - But — there is a `crm.*` schema (37 tables per migration 027) — is `crm.customers` separate from `turion.customers`?
   - Recommendation: Plan 57-01 first task = `\dt crm.*` to confirm. If `crm.customers` is distinct (Prisma-managed), decide which is source-of-truth. Likely `turion.customers` for the demo backend; `crm.*` may be unused legacy or future-state.

8. **Per-page CSS reuse — should `page-template.js` ship CSS too?**
   - What we know: Each new page is 80 lines; including page-specific CSS makes it 120.
   - What's unclear: Whether to add `/lib/page-template.css` or inline.
   - Recommendation: Inline minimal CSS in `page-template.js` via injected `<style>` block. Single helper, no extra file. Total ship size +5 KB once.

---

## Sources

### Primary (HIGH confidence — file:line verified in this repo)

- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md:940-973` — Phase 57 scope, 11 requirements, plan breakdown
- `/Users/jeet/doordash-p2p/.planning/phases/55-m3-multi-tenancy-rls-tenant-isolation/55-05-SUMMARY.md:64-247` — RLS+withTenantClient enforced on 152 tables
- `/Users/jeet/doordash-p2p/.planning/phases/54.4-m6-module-selection-wizard-and-migration-onboarding-the-selling-point/CHECKPOINT.md:1-238` — onboarding state, wizard, migration, M4 handoff
- `/Users/jeet/turion-space-demo/lib/module-catalog.js:1-51` — 13 modules with `open` URLs (sources of truth for nav)
- `/Users/jeet/turion-space-demo/backend/src/routes/salesforce.ts:1-191` — full CRM CRUD (customers, opportunities, sync-points, contacts, cases) — LIST + DETAIL + POST + PATCH ALREADY EXIST
- `/Users/jeet/turion-space-demo/backend/src/routes/netsuite.ts:24-91` — `keyedEntity` helper + LIST + DETAIL ALREADY EXIST for items/sales-orders/clins/work-orders/projects/journal-entries/invoices/contracts/mrp-runs/rfqs/bills/gl-accounts
- `/Users/jeet/turion-space-demo/backend/src/routes/arena.ts:67-74` — `keyedEntity('/ncrs', 'ncrs')` + capas/audits/procedures/persons/tools/qms_docs/arena_docs — LIST + DETAIL ALREADY EXIST (BUT NO `parts` / `ecos` keyedEntity — only `parts-create` POST exists; LIST + DETAIL ABSENT)
- `/Users/jeet/turion-space-demo/backend/src/routes/mes.ts:1-52` — ONLY `/stages` LIST + DETAIL + PATCH; NO `/work-orders` or `/build-steps` (work-orders already accessible via `/api/netsuite/work-orders`)
- `/Users/jeet/turion-space-demo/backend/src/routes/agents.ts:247,489,618,757` — 4 POST trigger endpoints; NO run-history persistence/read endpoints
- `/Users/jeet/turion-space-demo/backend/src/routes/ramp.ts:90-104` — `/api/ramp/card-txns` LIST already exists
- `/Users/jeet/turion-space-demo/team.html:1-153` — REFERENCE for shell+role-gated page pattern (Phase 54.1)
- `/Users/jeet/turion-space-demo/onboarding/migrate-salesforce.html:1-151` — REFERENCE for form+POST+CSV pattern (Phase 54.4-02)
- `/Users/jeet/turion-space-demo/backend/src/db.ts:55-80` — `withTenantClient` signature (Phase 55-03)
- `/Users/jeet/turion-space-demo/backend/src/middleware/role.ts:49-76` — `requireRole` middleware (Phase 54.1)
- `/Users/jeet/turion-space-demo/erp-api.js:76-81` — `window.erpApi.{get,post,patch,put,del}` exposed methods
- `/Users/jeet/turion-space-demo/backend/src/app.ts:32-110` — route mount order (insert royalty AFTER ramp at line 106)
- `/Users/jeet/turion-space-demo/cf-function-source/turion-clean-urls.js:168-170` — current stub R-map entries (~800 bytes to delete)
- `/Users/jeet/turion-space-demo/backend/migrations/030_rls_policies.sql` — RLS pattern (template for 033/034)
- `/Users/jeet/turion-space-demo/backend/src/onboarding/csv-import.ts:50-79` — `importItems` writes to `turion.items` (NOT `crm.items`)
- `/Users/jeet/turion-space-demo/backend/src/onboarding/sf-csv-import.ts:63-92` — `importSalesforceAccounts` writes to `turion.*`
- `/Users/jeet/turion-space-demo/netsuite-items.html:39` — verified hardcoded "Turion Space · TURION-PROD" leak

### Secondary (MEDIUM confidence)

- Native `<dialog>` modal pattern — used in `team.html:59-70`; supported in all modern browsers (no polyfill needed for Chromium/Safari/Firefox)
- `papaparse` 5.4.1 CSV chunking pattern — used in `onboarding/migrate-salesforce.html:130-140` (CHUNK=100 rows/POST)

### Tertiary (LOW confidence — verify in plan-time)

- `turion.build_steps` table existence — needs `\dt turion.*` verification (open question 1)
- `crm.customers` vs `turion.customers` distinction — needs `\dt crm.*` + Prisma migration check (open question 7)
- Royalty schema field set — derived from generic SMB use-cases; verify with target customer if known (open question 3)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs already in repo, file:line verified
- Architecture: HIGH — extends 3 existing patterns (Phase 54.1 team page, Phase 54.4 migration wizard, Phase 55 RLS)
- Backend endpoint audit: HIGH — `grep` verified every claim against actual route files
- Royalty/agent-runs schema: MEDIUM — schemas are domain-reasonable but unverified with target customer
- Turion-content page audit: MEDIUM — `grep` found 3 hardcoded "Turion Space" hits but full audit requires line-by-line review of 6 pages totalling ~400 KB
- Pitfalls: HIGH — all 10 are project-history-based (Phase 27-36 patterns, CF R-map cap from Phase 54.4 CHECKPOINT, Phase 55 RLS, Phase 54.1 role middleware)

**Research date:** 2026-05-15
**Valid until:** 2026-06-14 (30 days — pages are stable; underlying RLS/auth/role won't shift until M4 Stripe lands)

---

## Phase 57 Implementation Reference: 16-Stub × Per-Page Spec + 6 Turion-Content Audit + Settings/Help

> Below: condensed per-page specs the planner can convert directly to plan tasks. Each spec maps 1:1 to a HTML file consuming `/lib/page-template.js`.

### §D — Per-page specs for the 16 new pages

#### P1 — `salesforce/customers.html` (replaces `stubs/salesforce-customers.html`)
- **Use case:** D2C/SaaS user browses imported Salesforce accounts; aerospace user browses imported customer entities.
- **Backend:** `GET /api/salesforce/customers` (EXISTS, salesforce.ts:14-22) returns `{id: source_data}`; `POST /api/salesforce/customers` (EXISTS, lines 44-62) creates with id required.
- **List columns (5):** name, email, industry, phone, _imported_at
- **Detail fields (9):** id, name, email, phone, industry, annual_revenue, description, _origin, _imported_via
- **Create form (7):** id*, name*, email, phone, industry, annual_revenue, description (textarea)
- **Empty state:** "You haven't imported any customers yet. → Migrate from Salesforce or create one manually." CTA → `/onboarding/migrate/salesforce`
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P2 — `salesforce/opportunities.html`
- **Use case:** Sales pipeline browsing; SaaS user browses deal stages.
- **Backend:** `GET /api/salesforce/opportunities` (EXISTS, salesforce.ts:65-72); `POST` exists.
- **List columns (6):** id, account, stage, value, owner, close_date
- **Detail fields:** all `source_data` keys
- **Create form (6):** id*, account*, stage* (select: Prospecting/Qualification/Proposal/Negotiation/Closed Won/Closed Lost), value (number), close_date (date), description (textarea)
- **Empty state:** "No opportunities yet. → Create one or import from Salesforce."
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P3 — `netsuite/invoices.html`
- **Use case:** Browse invoices issued to customers; CFO sees revenue pipeline.
- **Backend:** `GET /api/netsuite/invoices` (EXISTS, netsuite.ts:86 via `keyedEntity('/invoices','invoices')`); `POST` exists.
- **List columns (6):** id, customer, amount, due_date, status, balance
- **Detail fields:** ~15 from `source_data` (id, soId, customer, amount, lines, taxes, payment terms, etc.)
- **Create form (5):** id*, soId, customer*, amount* (number), dueDate* (date)
- **Empty state:** "No invoices yet. → Create one or import from NetSuite."
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P4 — `netsuite/journal-entries.html`
- **Use case:** CFO/Controller browses GL entries; auditor reviews postings.
- **Backend:** `GET /api/netsuite/journal-entries` (EXISTS, netsuite.ts:85 via `keyedEntity('/journal-entries','journal_entries')`); `POST` exists.
- **List columns (5):** id, type, date, debit_account, credit_account, amount
- **Detail fields:** type, invoiceId, amount, referenceNumber, debit, credit, memo, ts, createdByAgent flag
- **Create form (6):** id*, type* (select: cash_receipt/adjustment/accrual), debit_account*, credit_account*, amount*, memo (textarea)
- **Empty state:** "No journal entries yet. → Generated via Sales Order workflow or AI Agents."
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P5 — `arena/parts.html`
- **Use case:** Engineering browses Arena PLM parts; manufacturing checks part status.
- **Backend GAP:** NO `GET /api/arena/parts` LIST or DETAIL exists. `POST /api/arena/parts-create` exists (arena.ts:133). NEED: register `keyedEntity('/parts', 'parts')` in arena.ts after line 74 (1-line add).
- **List columns (6):** id, name, revision, status, lifecycle_stage, owner
- **Detail fields:** id, name, revision, description, amlRows (vendors), bomRows (children), drawingUrl
- **Create form (5):** id*, name*, revision (default 'A'), description (textarea), category (select)
- **Empty state:** "No parts yet. → Import from Arena or create."
- **Complexity:** SIMPLE (40 min, +1 backend line).

#### P6 — `arena/change-orders.html`
- **Use case:** Browse ECOs (Engineering Change Orders); approve/release.
- **Backend GAP:** NO `GET /api/arena/ecos` LIST. NEED: register `keyedEntity('/ecos', 'ecos')` (1-line add).
- **List columns (5):** id, title, status (Draft/Pending/Released/Withdrawn), severity, affected_count
- **Detail fields:** id, title, description, ccbRequired, affectedItems[], bumpRev, bumpBom
- **Create form (5):** id*, title*, description (textarea), ccbRequired (select Yes/No), affectedItems (textarea comma-separated)
- **Empty state:** "No change orders yet. → File an ECO."
- **Complexity:** SIMPLE (40 min, +1 backend line).

#### P7 — `mes/work-orders.html`
- **Use case:** Manufacturing browses WIP work orders; shop floor sees what's being built.
- **Backend:** Use `GET /api/netsuite/work-orders` (EXISTS, netsuite.ts:83). NO need for `/api/mes/work-orders` — sharing endpoint with NS.
- **List columns (6):** id, item_built, qty, status, scheduled_start, completed
- **Detail fields:** id, item, qty, scheduled_start, scheduled_end, completed_qty, operations[], routing_code
- **Create form (4):** id*, item* (select from items list — fetch `/api/netsuite/items`), qty* (number), scheduled_start (date)
- **Empty state:** "No work orders yet. → Create a WO or check MRP runs."
- **Complexity:** MEDIUM (1 hr — needs item dropdown population from another endpoint).

#### P8 — `mes/build-steps.html`
- **Use case:** Operator sees step-by-step build instructions for a work order.
- **Backend OPEN QUESTION:** Does `turion.build_steps` exist? If yes, add LIST endpoint. If no, aggregate `mes_stages.source_data->steps[]` (currently a JSONB sub-field).
- **List columns (5):** stage_num, step_num, description, station, est_minutes
- **Detail fields:** stage, step, description, tools_required[], qa_checks[], operator_signature_required
- **Create form:** Defer to V2 (step authoring is engineering-managed, not user-managed).
- **Empty state:** "No build steps configured. → Each work-order routing has its own steps."
- **Complexity:** MEDIUM (1 hr — schema verification + data-shape decision).

#### P9 — `quality/ncrs.html`
- **Use case:** QM browses Non-Conformance Reports; assigns CAPAs.
- **Backend:** `GET /api/arena/ncrs` (EXISTS via `keyedEntity('/ncrs','ncrs')` arena.ts:67); `POST /api/arena/ncrs-create` (arena.ts:169).
- **List columns (6):** id, title, severity, status, part_number, detected_date
- **Detail fields:** id, title, description, severity (Major/Minor/Critical), status (Open/Closed/In Review), part_number, detected_by, detected_date, capaId (if any)
- **Create form (6):** id*, title*, severity* (select), partNumber*, description* (textarea), detectedBy
- **Empty state:** "No NCRs reported yet. → File an NCR."
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P10 — `quality/capas.html`
- **Use case:** QM browses CAPAs (Corrective and Preventive Actions); assigns owners.
- **Backend:** `GET /api/arena/capas` (EXISTS via `keyedEntity`); `POST /api/arena/capas-create` (arena.ts:178).
- **List columns (6):** id, ncrId, rootCause (truncated), correctiveAction (truncated), assignee, status
- **Detail fields:** id, ncrId, rootCause, correctiveAction, assignee, status (In Progress/Verified/Closed), riskLevel, dueDate, notes
- **Create form (6):** id*, ncrId* (select from ncrs list), rootCause* (textarea), correctiveAction* (textarea), assignee*, riskLevel (select: Low/Medium/High)
- **Empty state:** "No CAPAs yet. → File one in response to an NCR."
- **Complexity:** MEDIUM (45 min — needs NCR dropdown).

#### P11 — `quality/audits.html`
- **Use case:** QM browses internal/external audits and findings.
- **Backend:** `GET /api/arena/audits` (EXISTS); `POST /api/arena/audits-create` (arena.ts:187).
- **List columns (5):** id, type (Internal/External/Customer), audit_date, severity, finding_count
- **Detail fields:** id, type, audit_date, severity, findings[], auditor, customer_ref, closure_date
- **Create form (5):** id*, type* (select), audit_date* (date), severity (select: Minor finding/Major finding/Observation), auditor
- **Empty state:** "No audits logged yet."
- **Complexity:** SIMPLE (30 min). Backend complete.

#### P12 — `royalty/agreements.html`
- **Use case:** D2C licensor browses license agreements; aerospace IP licensor tracks royalty obligations.
- **Backend GAP:** ENTIRE module missing — needs migration 033 + new `routes/royalty.ts`.
- **List columns (6):** id, licensor, licensee, product_line, rate_pct, status
- **Detail fields:** id, licensor, licensee, product_line, rate_pct, effective_date, expires_date, status, payout_history (link to /royalty/payouts?agreement=id)
- **Create form (7):** id*, licensor*, licensee*, product_line*, rate_pct* (number, 0-100), effective_date* (date), expires_date (date)
- **Empty state:** "No royalty agreements yet. → Create your first agreement."
- **Complexity:** HIGH (2 hr — migration 033, new route file, new page).

#### P13 — `agents/ncr-capa.html`
- **Use case:** QM clicks "Run agent" to auto-triage an open NCR; views past run history.
- **Backend GAP:** POST `/api/agents/ncr-capa` exists (agents.ts:489). NEEDS: migration 034 (`agent_runs`), retrofit handler to write to `agent_runs`, NEW `GET /api/agents/runs?kind=ncr-capa` LIST endpoint, NEW `GET /api/agents/runs/:id` DETAIL.
- **List columns (5):** id (short), started_at, completed_at, status, output_summary (e.g. "CAPA-AGT-001 created")
- **Detail:** Full trace[] rendered as collapsible JSON viewer; output JSON; error_message (if failed)
- **Create form:** None — single "Run agent" button (admin/manager only)
- **Empty state:** "No agent runs yet. → Click 'Run agent' to triage an open NCR."
- **Complexity:** HIGH (2.5 hr — migration 034, retrofit handler, new GET routes, agent-specific UI for trace rendering).

#### P14 — `agents/evms.html`
- Same shape as P13. Backend: POST `/api/agents/evms` (agents.ts:618) + same migration 034 + same new GET routes.
- **List columns:** id, started_at, status, output_summary (e.g. "VAR-AGT-001 flagged on WBS-1.2.3, CPI=0.87")
- **Complexity:** SIMPLE if P13 done (15 min — just spec object differs).

#### P15 — `agents/integration.html`
- Same shape. Backend: POST `/api/agents/integration-sentinel` (agents.ts:757) + same migration 034.
- **List columns:** id, started_at, status, output_summary (e.g. "RETRY-AGT-001 triggered on arena-ns pipeline")
- **Complexity:** SIMPLE if P13 done (15 min).

#### P16 — `ramp/cards.html`
- **Use case:** Finance browses Ramp corporate card transactions; CFO sees spend.
- **Backend:** `GET /api/ramp/card-txns` (EXISTS, ramp.ts:90-104) returns `{rampType, nsTable, rows: [{ramp_id, source_data, status, migrated_at, migration_run_id}]}`.
- **List columns (6):** ramp_id, transaction_date, merchant_name, amount, cardholder_name, status (new/migrated/error)
- **Detail fields:** ALL `source_data` keys (transaction_date, posted_date, merchant_name, merchant_category, amount, currency, cardholder_name, card_last4, project_tag, gl_category_guess, receipt_url, migrated_at, migration_run_id)
- **Create form:** NONE — Ramp card txns are imported from Ramp API only, not user-created. Show "Import from Ramp →" CTA → `/ramp` (existing landing page).
- **Empty state:** "No Ramp transactions yet. → Import from Ramp."
- **Complexity:** SIMPLE (40 min — note: response shape needs `.rows` normalization in `page-template.js`).

### §E — Turion-content page audit (6 pages)

For EACH of the 6 pages, audit task:
1. **Grep for "Turion Space" / "TURION-PROD"** — replace with `<span data-z-tenant-name></span>`.
2. **Grep for inline `const X = [...]` or `var X = {...}` data arrays** — if found, replace with `await window.erpApi.get('/api/...')`.
3. **Load as `qa-empty` tenant** (no seeded data) and confirm:
   - Page returns HTTP 200 (no 500)
   - Empty-state renders or page degrades gracefully (no JS console errors)
   - No Turion-specific data leaks visually

| Page | Size | Existing API calls | Verified hardcoded "Turion" hits | Action |
|------|------|--------------------|----------------------------------|--------|
| netsuite-items.html | 48 KB / 666 lines | Uses `erpApi.*` (verified) | YES — line 39 top bar | Replace top bar + audit |
| netsuite-customer-so.html | 62 KB | Uses `erpApi.*` (assume yes) | UNKNOWN — audit | Full audit |
| netsuite-procurement.html | 74 KB | Uses `erpApi.*` (assume yes) | UNKNOWN | Full audit |
| netsuite-financials.html | 44 KB | Uses `erpApi.*` (assume yes) | UNKNOWN | Full audit |
| arena-bom.html | 99 KB | Uses `erpApi.*` (assume yes) | YES — at least 1 | Full audit; the 99 KB size suggests heavy CAD-rendering JS to leave alone |
| mes-shop-floor.html | 71 KB | Uses `erpApi.*` (assume yes) | YES — at least 1 | Full audit |

**Scope rule:** If audit finds a Turion page works correctly (no hardcoded data, calls `erpApi`, renders empty-state) — leave it alone. Only fix what's broken.

### §F — Settings + Help page specs

#### `settings.html` (REPLACE 64-line stub)
- **Sections:**
  1. **Tenant info card** (read-only): name, slug, plan, signup_date, wizard_completed_at, current trial days remaining (if applicable)
  2. **Branding card** (placeholder): "Logo upload coming in M7. Workspace name: <input disabled>"
  3. **Members** (link card): "Manage members → /team" with current count badge
  4. **Modules** (link card): "Enabled modules → /catalog" with current enabled count badge
  5. **Billing card** (placeholder, M4 coming-soon): "Manage subscription — Coming in M4. Current plan: <plan>"
  6. **Danger zone card**: "Delete tenant — Contact support@zietra.com" (NO active endpoint per pitfall 9 + open question 6)
- **Backend:** ONLY uses `GET /api/tenants/current` (exists, Phase 53-03)
- **Complexity:** SIMPLE (1 hr)

#### `help.html` (REPLACE 64-line stub)
- **Sections:**
  1. **Getting started**: 4 cards linking to `/onboarding/recommend`, `/onboarding/migrate`, `/team`, `/catalog`
  2. **Module guides**: 13 cards, one per module from `/lib/module-catalog.js`, each links to a help anchor (initially: `#crm-help` etc., placeholders for M7 marketing site)
  3. **Contact**: card with `security@zietra.com` (incident response) and `support@zietra.com` (general)
  4. **API docs**: placeholder "Coming with M7 marketing site"
- **Backend:** NONE — pure static page consuming `/lib/module-catalog.js` for the 13 cards
- **Complexity:** SIMPLE (45 min — just rendering)

### §G — Risks + mitigations summary

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Backend LIST query slow for big tenants (>5K rows) | LOW (current scale 3K total) | Hard-cap `LIMIT 1000` + warn-log + defer cursor pagination to M8 |
| 2 | 16 pages duplicate UI code | MEDIUM | Shared `/lib/page-template.js` helper (THIS phase's key infra) |
| 3 | Turion-content pages have hardcoded data overriding RLS | MEDIUM | Per-page audit task in Plan 57-02 |
| 4 | `agent_runs` table doesn't exist | HIGH (if not surfaced) | Migration 034 in Plan 57-04 BEFORE page work |
| 5 | `royalty.*` schema entirely new | HIGH | Migration 033 + new route file in Plan 57-03 as FIRST task |
| 6 | Long deploy times for 16 frontend files + CF invalidation | LOW | Single batch deploy + one `/*` invalidation |
| 7 | CF Function R-map size cap (10,240 bytes) breach | HIGH | Delete 16 stub entries + use directory-prefix routing; verify size before publish (Plan 57-04) |
| 8 | `tenant_features.enabled=false` URL-bypass | MEDIUM | Frontend check in `page-template.js`; backend gating deferred to M4 |
| 9 | Settings danger-zone delete tenant misclick | HIGH (if implemented live) | Defer to M8; ship "contact support" link only |
| 10 | Stale `app-shell.js` clients see "coming soon" for replaced stubs | LOW | CF `/*` invalidation in deploy script (existing) |

### §H — Per-stub complexity rating (for parallel wave grouping)

| Stub → New Page | Complexity | Time | Wave |
|-----------------|------------|------|------|
| salesforce/customers | SIMPLE | 30m | 1 |
| salesforce/opportunities | SIMPLE | 30m | 1 |
| netsuite/invoices | SIMPLE | 30m | 1 |
| netsuite/journal-entries | SIMPLE | 30m | 1 |
| arena/parts | SIMPLE (1 backend line) | 40m | 2 |
| arena/change-orders | SIMPLE (1 backend line) | 40m | 2 |
| ramp/cards | SIMPLE | 40m | 2 |
| mes/work-orders | MEDIUM (item dropdown) | 60m | 3 |
| mes/build-steps | MEDIUM (schema verification) | 60m | 3 |
| quality/ncrs | SIMPLE | 30m | 3 |
| quality/capas | MEDIUM (NCR dropdown) | 45m | 3 |
| quality/audits | SIMPLE | 30m | 3 |
| royalty/agreements | HIGH (mig + route + page) | 120m | 3 |
| agents/ncr-capa | HIGH (mig + retrofit + new routes) | 150m | 4 |
| agents/evms | SIMPLE (if P13 done) | 15m | 4 |
| agents/integration | SIMPLE (if P13 done) | 15m | 4 |
| settings.html | SIMPLE | 60m | 4 |
| help.html | SIMPLE | 45m | 4 |
| 6× Turion-content audit | MEDIUM | 90m total | 2 |
| `/lib/page-template.js` | KEY INFRA | 120m | 1 (Plan 57-01 first task) |
| CF R-map cleanup + deploy + smoke + CHECKPOINT | DEPLOY | 60m | 4 |

**Total time estimate:** ~16 hours engineering across 4 sequential plans.

### §K — Recommended 4-plan structure (revised from ROADMAP)

#### 57-01 — Sales + CRM frontend + shared infra (~3.5 hr)
- **Task 1 (1st & critical):** Author `/lib/page-template.js` (~300 LOC) + inline CSS
- **Task 2-5:** Build 4 pages — `salesforce/customers`, `salesforce/opportunities`, `netsuite/invoices`, `netsuite/journal-entries`
- **Task 6:** Update `cf-function-source/turion-clean-urls.js` (add 4 directory mappings, do NOT yet delete stub entries — kept until Plan 57-04 to avoid 404 during phase)
- **Task 7:** Deploy frontend; spot-check 4 pages render lists, modals open, create form works
- **Deps:** None (all backend endpoints already exist)
- **Wave parallelism:** Task 1 must finish before 2-5; tasks 2-5 can be parallel after page-template.js exists

#### 57-02 — Operations + Turion-content audit (~3 hr)
- **Task 1:** Add `keyedEntity('/parts','parts')` + `keyedEntity('/ecos','ecos')` to `arena.ts` (2 lines + redeploy)
- **Task 2-4:** Build pages `arena/parts`, `arena/change-orders`, `ramp/cards`
- **Task 5:** Audit + fix 6 Turion-content pages (per §E — `data-z-tenant-name` swap, sample-data removal verification)
- **Task 6:** Add `app-shell.js` (or new `/lib/tenant-chrome.js`) populator for `data-z-tenant-name`
- **Task 7:** Deploy backend + frontend; smoke 7 pages
- **Deps:** 57-01 (uses `page-template.js`)

#### 57-03 — Manufacturing + Quality + Royalty (~5 hr)
- **Task 1 (FIRST):** Migration 033 (royalty schema) — apply via one-shot Lambda (`zietra-rls-runner-55-05` pattern from Phase 55)
- **Task 2:** Create `backend/src/routes/royalty.ts` + mount in `app.ts`
- **Task 3:** Verify `turion.build_steps` table (or decide aggregation strategy per open Q 1)
- **Task 4-7:** Build `mes/work-orders`, `mes/build-steps`, `quality/ncrs`, `quality/capas`, `quality/audits`
- **Task 8:** Build `royalty/agreements`
- **Task 9:** Deploy backend + frontend; smoke 6 pages
- **Deps:** 57-01 (page-template), 57-02 (does not strictly depend but ordering keeps deploy waves clean)

#### 57-04 — AI Agents UI + Settings/Help + cross-cutting + CHECKPOINT (~4.5 hr)
- **Task 1:** Migration 034 (agent_runs)
- **Task 2:** Retrofit 4 POST handlers in `agents.ts` to record `agent_runs` rows + add `GET /api/agents/runs?kind=...` + `GET /api/agents/runs/:id`
- **Task 3-5:** Build `agents/ncr-capa`, `agents/evms`, `agents/integration` (P13 first, then P14+P15 are cheap copies)
- **Task 6:** Build real `settings.html`
- **Task 7:** Build real `help.html`
- **Task 8 (CRITICAL):** Update `cf-function-source/turion-clean-urls.js`:
  - DELETE 16 stub entries (frees ~800 bytes)
  - ADD directory mappings for new paths if not already covered
  - Verify total size < 10,240 bytes via `wc -c`
  - Publish + invalidate
- **Task 9:** Delete `stubs/*.html` except `marketing-coming-soon.html` from S3 + git
- **Task 10:** Cross-cutting smoke test: 16 new pages return 200 + 6 Turion pages 200 + 401-without-bearer on new endpoints
- **Task 11:** CHECKPOINT.md for Phase 58 handoff (next milestone TBD — possibly M4 Phase 56 resumption or M7 marketing)
- **Deps:** 57-01 (page-template), 57-02 (chrome populator), 57-03 (independent but ordering)

---

## Backend Endpoint Audit (Complete Reference — §C)

| Module | Endpoint | EXISTS? | File:line | Action needed |
|--------|----------|---------|-----------|---------------|
| salesforce | GET /customers (LIST) | YES | salesforce.ts:14-22 | None |
| salesforce | GET /customers/:id | YES | salesforce.ts:23-30 | None |
| salesforce | POST /customers | YES | salesforce.ts:44-62 | None |
| salesforce | GET /opportunities (LIST) | YES | salesforce.ts:65-72 | None |
| salesforce | GET /opportunities/:id | YES | salesforce.ts:74-80 | None |
| salesforce | POST /opportunities | YES | salesforce.ts:98-115 | None |
| netsuite | GET /items (LIST + DETAIL) | YES | netsuite.ts:80 via keyedEntity | None |
| netsuite | GET /invoices (LIST + DETAIL) | YES | netsuite.ts:86 via keyedEntity | None |
| netsuite | GET /journal-entries (LIST + DETAIL) | YES | netsuite.ts:85 via keyedEntity | None |
| netsuite | GET /work-orders (LIST + DETAIL) | YES | netsuite.ts:83 via keyedEntity | None — reuse for `/mes/work-orders.html` |
| netsuite | GET /sales-orders (LIST + DETAIL) | YES | netsuite.ts:81 via keyedEntity | None |
| arena | GET /ncrs (LIST + DETAIL) | YES | arena.ts:67 via keyedEntity | None |
| arena | GET /capas (LIST + DETAIL) | YES | arena.ts:68 via keyedEntity | None |
| arena | GET /audits (LIST + DETAIL) | YES | arena.ts:69 via keyedEntity | None |
| arena | GET /parts (LIST + DETAIL) | **NO** | — | **ADD** `keyedEntity('/parts','parts')` after line 74 |
| arena | GET /ecos (LIST + DETAIL) | **NO** | — | **ADD** `keyedEntity('/ecos','ecos')` after line 74 |
| arena | POST /parts-create | YES | arena.ts:133 (with fan-out audit + sync_runs) | None — but new page may POST to plain `/parts` instead of fan-out; decide per scope |
| arena | POST /ecos-create | YES | arena.ts:151 | Same as above |
| mes | GET /stages | YES | mes.ts:11-19 | None |
| mes | GET /work-orders | **NO** in mes.ts; YES via /netsuite/work-orders | — | Decision: reuse netsuite endpoint or add mes alias. **REUSE** (avoid drift) |
| mes | GET /build-steps | **OPEN Q** | — | Verify table existence first (open Q 1) |
| ramp | GET /card-txns (LIST) | YES | ramp.ts:90-104 | None |
| ramp | GET /card-txns/:id | **NO** | — | Optional — page can do detail from list payload (response includes full source_data) |
| royalty | ALL | **NO** | — | **NEW** route file + migration 033 |
| agents | POST /ncr-capa, /evms, /integration-sentinel, /run | YES | agents.ts:247,489,618,757 | **MODIFY** to write `agent_runs` |
| agents | GET /runs | **NO** | — | **ADD** new route after migration 034 |
| agents | GET /runs/:id | **NO** | — | **ADD** new route after migration 034 |

**Summary of true gaps:**
- arena.ts: +2 lines (keyedEntity for parts + ecos)
- mes.ts: 0 new routes (reuse netsuite for work-orders; build-steps TBD pending schema verification)
- royalty.ts: ENTIRE new file + migration 033 + 5 routes (LIST/DETAIL agreements + POST agreements + LIST/DETAIL payouts)
- agents.ts: migration 034 + retrofit 4 POST handlers + 2 new GET routes

**Real backend work:** ~150-200 LOC total across 2 migrations + 1 new route file + ~30 LOC of modifications to existing files. Far less than the original Phase 57 scope statement implied.
