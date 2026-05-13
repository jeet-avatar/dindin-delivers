---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 06
subsystem: turion-erp-demo
tags: [zero-hardcode, turion-erp, persistence, ns-editable, salesforce, netsuite, arena, mes]
requires:
  - "36-02: PATCH /api/{salesforce,netsuite,arena,mes}/<entity>/:id CRUD routes, window.TURION_CONFIG.API_BASE"
  - "36-04: salesforce-account.html / netsuite-*.html render from /api/data/all (data-loader.js, turion-data-ready)"
  - "36-05: arena-qms.html / mes-shop-floor.html render from /api/data/all; arena-lookups.js"
provides:
  - "ns-editable.js: in-place Edit-mode cells that carry data-edit-module/-entity/-id/-path PATCH /api/<module>/<entity>/:id; success → new baseline + toast, failure → revert + error toast; cells without the attrs keep the localStorage demo editor"
  - "netsuite-customer-so.html: SO-2026-0341 Order Date / Contract Type cells PATCH /api/netsuite/sales-orders/SO-2026-0341"
  - "netsuite-items.html: ADCS-RW-MEDIUM-A Description / Mass cells PATCH /api/netsuite/items/ADCS-RW-MEDIUM-A"
  - "mes-shop-floor.html: stage modal 'Mark Stage N in progress' button → PATCH /api/mes/stages/:num"
  - "arena-qms.html: NCR / CAPA detail modal 'Close <id>' button → PATCH /api/arena/{ncrs,capas}/:id (status=Closed)"
affects:
  - "/Users/jeet/turion-space-demo (ns-editable.js reworked; 4 view pages wired to PATCH)"
tech-stack:
  added: []
  patterns:
    - "Editable cell declares its backend record via data-edit-* on itself or the nearest ancestor (host = el.closest('[data-edit-module][data-edit-entity][data-edit-id]')); dotted data-edit-path builds a nested PATCH body so source_data deep keys merge; data-edit-type='number' coerces the typed string"
    - "Primary state-change buttons built inside innerHTML templates get an id + a post-render addEventListener (no inline onclick) + a disabled 'Saving…' → '✓ Saved' / revert-on-error lifecycle"
key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/ns-editable.js
    - /Users/jeet/turion-space-demo/netsuite-customer-so.html
    - /Users/jeet/turion-space-demo/netsuite-items.html
    - /Users/jeet/turion-space-demo/mes-shop-floor.html
    - /Users/jeet/turion-space-demo/arena-qms.html
decisions:
  - "ns-editable.js stays a hybrid: a cell that declares data-edit-* PATCHes the DB; a cell without them keeps the original localStorage behavior. Reason — the vast majority of editable cells on these demo pages are static prose with no clean record-id binding (cells with <a> children aren't even made editable by ns-editable's children.length===0 guard). Forcing every cell to need a record id would break the no-markup-change generic editor that's load-bearing across ~10 pages."
  - "Wired a small, well-mapped set of data-edit-* cells rather than gold-plating: netsuite-customer-so.html SO ns-form (Order Date→soDate, Contract Type→contractType on sales-orders/SO-2026-0341) and netsuite-items.html spec ns-form (Description→description, Mass→mass[number] on items/ADCS-RW-MEDIUM-A). These ns-form cells are plain text, have no children, and map 1:1 to a known record id visible in the page."
  - "For Task 2 the genuinely primary, cleanly-wireable state changes were: MES stage status (PATCH /api/mes/stages/:num — added a 'Mark Stage N in progress' button to the stage modal) and Arena NCR/CAPA close (PATCH /api/arena/{ncrs,capas}/:id with {status:'Closed'} — added a 'Close <id>' button to the QMS detail modal). Both backend routes already exist (mes.ts r.patch('/stages/:num'); arena.ts keyedEntity('/ncrs'…) / ('/capas'…))."
  - "salesforce-account.html: NOT wired with new buttons or data-edit-* cells. Its 'Edit' / 'Follow' / 'Sharing' / 'Convert to NS SO' buttons are nsToast() demo simulations and its sf-field / meta-item value cells all contain <a> children (so they aren't editable, and they map to a single hardcoded USSF account, not a parameterized record). Left as-is per the plan's pragmatic 'no dead ends on PRIMARY actions, not every read-only cell is a DB write' mandate. (It does include ns-editable.js, so any future data-edit-* cells added there will Just Work.)"
  - "No ECO PATCH route exists (arena.ts has /ecos-create POST but ECOs are not a keyedEntity, so no PATCH /api/arena/ecos/:id). ECO submit/approve is therefore left as the existing arena-bom.html demo affordance — adding a /ecos keyedEntity + table is a backend follow-up, out of this plan's named scope (and 36-07 owns backend/* WIP)."
  - "No netsuite invoice/journal-entry 'post' button found on the netsuite-*.html view pages — the '+ New Invoice' / '+ Submit deliverable' buttons are nsToast() demos and there's no 'post this JE' control. PATCH /api/netsuite/{invoices,journal-entries}/:id exists (keyedEntity) but there's no UI surface to wire it to without inventing one. netsuite-setup.html's edit path (PATCH /api/extras/setup/:key etc.) was confirmed present from 36-02's prior wiring and not re-touched."
  - "ns-actions.js (the 'More Actions ▾' confirm:/tab:/url: simulated-confirm items) left completely untouched — those are intentional demo simulations per the plan."
  - "No backend/src or backend/dist change in this plan — every PATCH route used already existed. Nothing rebuilt; backend/dist/app.js (36-07's shared WIP) untouched."
metrics:
  duration: ~50min
  completed: 2026-05-12
---

# Phase 36 Plan 06: ERP View-Page Persistence Summary

The ERP demo's in-place "Edit mode" and a representative set of primary state-change buttons now persist to the live backend instead of localStorage / `nsToast()` simulations.

## What changed

### 1. `ns-editable.js` — Edit mode now PATCHes the DB

`ns-editable.js` was a generic, no-markup-change localStorage editor (every text cell got `contenteditable`, blur wrote `localStorage[editable:<page>:<label>:<idx>]`). It now also supports **backend persistence**:

- A cell (or its nearest ancestor — `host = el.closest('[data-edit-module][data-edit-entity][data-edit-id]')`) can declare:
  - `data-edit-module` — `salesforce | netsuite | arena | mes`
  - `data-edit-entity` — the route segment, e.g. `sales-orders`, `items`, `customers`, `opportunities`, `cases`, `ncrs`, `capas`, `stages`
  - `data-edit-id` — the record id (for `mes/stages` it's the stage number)
  - `data-edit-path` — the `source_data` key to set; **dotted paths supported** (`address.city`) → a nested `{address:{city:val}}` body so the backend's `{...before, ...req.body}` merge keeps deep keys
  - `data-edit-type="number"` — optional, coerces the typed string (strips non-numeric, `parseFloat`) before PATCH
- On blur, if the value changed and the cell has a backend target → `fetch(API_BASE + '/api/' + module + '/' + entity + '/' + id, {method:'PATCH', body: <nested body>})`. On success: keep the new value, set it as `data-edit-original` (the new baseline), `nsToast('Saved · …')`. On failure: **revert the cell to the original** (no silent edit loss), `nsToast('⚠ Could not save — … · change reverted')`.
- Cells **without** `data-edit-*` keep the original localStorage behavior — the generic demo editor still works on every page that includes the script, with zero markup changes.
- `restoreValues()` (page-load) skips backend-backed cells entirely — the DB (via `data-loader.js` / page re-render on `turion-data-ready`) is the source of truth, never shadowed by a stale localStorage entry.
- `API_BASE = (window.TURION_CONFIG && window.TURION_CONFIG.API_BASE) || '<literal>'` per 36-02's defensive-fallback contract.

### 2. `data-edit-*` cells added (the well-mapped handful)

| Page | ns-form (host) | Cell → `data-edit-path` | Backend route |
| --- | --- | --- | --- |
| `netsuite-customer-so.html` | "Active Sales Order · SO-2026-0341" (`netsuite` / `sales-orders` / `SO-2026-0341`) | Order Date → `soDate` · Contract Type → `contractType` | `PATCH /api/netsuite/sales-orders/SO-2026-0341` |
| `netsuite-items.html` | "Specification & description" (`netsuite` / `items` / `ADCS-RW-MEDIUM-A`) | Description → `description` · Mass → `mass` (number) | `PATCH /api/netsuite/items/ADCS-RW-MEDIUM-A` |

These ns-form `.value` cells are plain text (no child elements, so `ns-editable` makes them editable) and map 1:1 to a record id printed on the page. The keys (`soDate`, `contractType`, `description`, `mass`) match the `SO_DATA` / `ITEM_DATA` `source_data` shapes in `enterprise-data.js` (which is what `/api/data/all` serves).

### 3. Primary state-change buttons wired

| Module | Page | New control | Backend call |
| --- | --- | --- | --- |
| **MES** | `mes-shop-floor.html` | "▶ Mark Stage N in progress" in the stage modal foot (built in the `inner.innerHTML` template, attached via `addEventListener` after render — no inline `onclick`) | `PATCH /api/mes/stages/:num` `{status:'in_progress', statusLabel:'In progress'}` |
| **Arena** | `arena-qms.html` | "✓ Close NCR/CAPA <id>" in the QMS detail modal foot — `showQmsModal()` got an optional `recordRef` arg; `showNcr` passes `{entity:'ncrs',…}`, `showCapa` passes `{entity:'capas',…}`; button attached via `addEventListener` | `PATCH /api/arena/{ncrs,capas}/:id` `{status:'Closed'}` |

Each button: `disabled` + "Saving…" on click → "✓ Saved" / "✓ Closed" on success → revert + `nsToast` error on failure.

## What was deliberately LEFT read-only / simulated (pragmatic scope)

- **`salesforce-account.html`** — `Edit` / `Follow` / `Sharing` / `Convert to NS SO` buttons stay `nsToast()` demos; its `sf-field` / `meta-item` value cells all contain `<a>` children (not editable by `ns-editable`) and map to a single hardcoded USSF account, not a parameterized record. The page does include `ns-editable.js`, so any future `data-edit-*` cells there will work with no JS change. Convert-to-SO would need a real lead/opp→SO conversion endpoint.
- **ECO submit/approve** (`arena-bom.html` / `arena-qms.html`) — no `PATCH /api/arena/ecos/:id` exists (`ecos` is not a `keyedEntity`, only `ecos-create` POST). Left as the existing demo affordance; adding an `/ecos` keyedEntity + `turion.ecos` table is a backend follow-up (36-07 owns `backend/*` WIP).
- **NetSuite invoice / journal-entry "post"** — `PATCH /api/netsuite/{invoices,journal-entries}/:id` exists (keyedEntity) but there is no "post this JE" / "post this invoice" UI control on the `netsuite-*.html` view pages (`+ New Invoice` / `+ Submit deliverable` are `nsToast()` demos). No UI surface to wire without inventing one. `netsuite-setup.html`'s edit path (`PATCH /api/extras/setup/:key`, `POST .../entry`, `DELETE .../entry/:id`) was confirmed wired from 36-02 and not re-touched.
- **Financial-statement pages** (`netsuite-coa.html` / `-tb.html` / `-bs.html` / `-fpa.html`), KPI rollup cards, the MES stage *grid* cells (vs the stage modal), and `ns-actions.js`'s "More Actions ▾" `confirm:`/`tab:`/`url:` items — all intentionally read-only / simulated, untouched.

## Verification

- `node --check ns-editable.js` — clean.
- Inline `<script>` syntax check (`new Function(code)` over every non-`src` `<script>`): `arena-qms.html` (1), `mes-shop-floor.html` (1), `netsuite-items.html` (1), `netsuite-customer-so.html` (0) — all parse.
- `grep`: `ns-editable.js` contains the `fetch(... method:'PATCH' ...)` call; `netsuite-customer-so.html` + `netsuite-items.html` carry `data-edit-entity` / `data-edit-path`; `mes-shop-floor.html` + `arena-qms.html` carry `method:'PATCH'` to `/api/mes/stages/` and `/api/arena/`; `git diff --stat ns-actions.js` → empty (untouched); `git diff` on the 4 HTMLs shows no new inline `onclick=`.
- Local `python3 -m http.server` smoke: `ns-editable.js` + all 4 view pages return HTTP 200; each still references `data-loader.js` + `turion-config.js`; the 3 ns-editable pages reference `ns-editable.js` (mes-shop-floor never did — its button is self-contained).
- Real PATCH→DB round-trips are plan 36-09's deploy-walk job (the phase's established headless-substitute pattern).

## Deviations from Plan

- **[Scope — pragmatic, per the plan's own mandate] `ns-editable.js` kept as a hybrid (backend when `data-edit-*` present, localStorage otherwise) rather than wholesale "edits PATCH the backend".** The plan's must-have phrasing implies every Edit-mode cell PATCHes; in practice almost every editable cell on these pages is static prose with no record binding (and cells with `<a>` children aren't editable at all). The plan explicitly says "be PRAGMATIC — 'no dead ends on PRIMARY actions', NOT 'every read-only cell is a DB write'; don't gold-plate" — so the mechanism is fully real and a representative, well-mapped set of cells use it; the generic localStorage editor stays for the unmapped majority.
- **[Scope] No new backend route, no rebuild.** Every PATCH route used (`/api/netsuite/sales-orders/:id`, `/api/netsuite/items/:id`, `/api/mes/stages/:num`, `/api/arena/{ncrs,capas}/:id`) already existed in `salesforce.ts` / `netsuite.ts` / `arena.ts` / `mes.ts`. So `backend/src` / `backend/dist` untouched — and `backend/dist/app.js` (36-07's shared WIP) deliberately left alone.
- **[Scope] ECO PATCH + NetSuite JE/invoice "post" + Salesforce convert-to-SO not wired** — the first has no backend route + the others have no UI surface; documented above as backend/UI follow-ups. No bugs found, no auth gates, no architectural changes, no fix-attempt retries.

## Commit

`turion-space-demo` `1cca9b0` — `feat(36-06): ERP view-page edits + primary actions persist to backend` — 5 files (155 insertions, 20 deletions) — author `jeet-avatar <jm@techcloudpro.com>`. **Not pushed, not deployed** — plan 36-09 owns deploy + Lambda redeploy. 36-07's long-standing WIP (`about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*`) left dirty and untouched.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/ns-editable.js` contains `method: 'PATCH'` + `data-edit-module` handling — VERIFIED
- `netsuite-customer-so.html` contains `data-edit-entity="sales-orders"` + `data-edit-path="soDate"` — FOUND
- `netsuite-items.html` contains `data-edit-entity="items"` + `data-edit-path="description"` — FOUND
- `mes-shop-floor.html` contains `PATCH` to `/api/mes/stages/` + `addEventListener('click', () => advanceStage` — FOUND
- `arena-qms.html` contains `PATCH` to `/api/arena/` + `closeQmsRecord` + `recordRef` passed from `showNcr`/`showCapa` — FOUND
- `git diff --stat ns-actions.js` empty (untouched) — VERIFIED
- Commit `1cca9b0` in `turion-space-demo`, author `jeet-avatar <jm@techcloudpro.com>` — FOUND
- 36-07 WIP (`backend/*`, `about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`) still dirty / untouched by the commit — VERIFIED
