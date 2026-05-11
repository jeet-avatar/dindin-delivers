---
phase: 28-full-bom-densification-data-coverage-drill-down-ui
plan: 04
subsystem: ui
tags: [vanilla-js, html-details, bom-tree, accessibility, aria, drill-down, turion-satellite-frontend]

# Dependency graph
requires:
  - phase: 28-03
    provides: "GET /api/satellites/:satId/bom/tree — recursive hierarchical BOM tree (drawing_svg inline per node, cycle-guarded CTE)"
  - phase: turion-satellite-frontend-live
    provides: "satellite/ static pages (satellite-shell.css, satellite-render.js, satellite-api.js, satellite-auth.js, instance.html idiom)"
provides:
  - "bom.html — recursive HTML <details>/<summary> BOM tree, replaces the flat 3-level SVG org-chart"
  - "window.satelliteRender.renderIntegrationsPanel(inst, opts?) — shared 4-slot cross-system FK panel for Plan 28-05"
affects: [28-05, 28-06, drill-down-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native <details>/<summary> recursive tree — keyboard nav + screen-reader semantics for free, no JS clickables, no framework"
    - "Inline drawing SVG straight from the /bom/tree response (no per-node refetch) — RESEARCH Pitfall 8"
    - "Default expansion gated on node.depth (≤ 2 expanded, ≥ 3 collapsed) computed during render"
    - "breadcrumb() post-processing to inject aria-current=page on the terminal crumb (shared helper does not take an aria option)"
    - "Dual instance link params (?inst= AND ?id=) so navigation works whether or not Plan 28-05 has renamed the instance.html query param"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-space-demo/satellite/satellite-render.js

key-decisions:
  - "Followed the live turion-space-demo /satellite/ idiom (dark theme, nav-strip, <main class=main>, #crumb, r.topbarHTML(session.user.email), r.getQueryParam('sat')) rather than the plan's light-Apple sample HTML — the plan said 'match the project's HTML idiom' and the sample was a template, not the contract"
  - "Tree endpoint path is /bom/tree (route /tree, :satId inherited via mergeParams) — matches Plan 28-03 SUMMARY deviation #1; bom.html calls /api/satellites/<satId>/bom/tree"
  - "instance.html link carries both ?inst=<id> and ?id=<id> — satisfies the Plan 28-04 must_have (instance.html?inst=) AND keeps the existing instance.html getQueryParam('id') working until Plan 28-05 migrates it"
  - "renderIntegrationsPanel uses inline style= for the FK rows (mirrors instance.html .cost-row look) instead of adding .cost-row* to satellite-shell.css — the CSS file is owned by Plan 28-05"

patterns-established:
  - "Pattern: recursive renderNodeClean(node) → <li><details open?><summary>row</summary><ul>children…</ul></details></li>, leaves render as <li><div class=tree-leaf-row>row</div></li>"
  - "Pattern: expand-all / collapse-all = querySelectorAll('details.tree-node').forEach(d => d.open = …)"

requirements-completed: [DrillDownUI]

# Metrics
duration: 8min
completed: 2026-05-11
---

# Phase 28 Plan 04: Recursive BOM tree page + shared integrations panel Summary

**`bom.html` rebuilt as a recursive native-`<details>`/`<summary>` BOM tree powered by `GET /api/satellites/:satId/bom/tree` — every node shows its inline drawing thumbnail (straight from the API, never re-fetched), part number, description, qty, ref-designator and subsystem/make-buy/ITAR badges, and is a click-through link to `instance.html`; depth ≤ 2 is expanded by default, expand-all / collapse-all controls carry `aria-label`s, and the terminal breadcrumb crumb gets `aria-current="page"`. Plus `window.satelliteRender.renderIntegrationsPanel(inst, opts?)` — a shared 4-slot (Salesforce SO / NetSuite invoice / Arena doc / MES WO) cross-system FK panel, empty FK → "—", deep-linking to `turionspace.zietra.com` — ready for Plan 28-05 to drop into `cost-detail.html` and `instance.html`.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-11T05:30Z (approx)
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 2 (`satellite/bom.html` rewritten, `satellite/satellite-render.js` extended)

## Accomplishments

- **`satellite-render.js` extended (80 → 132 lines, +52):** appended `_linkPath(kind, id)` (maps `sales`→`/sales/account/:id`, `netsuite`→`/finance/invoice/:id`, `arena`→`/records/arena-doc/:id`, `mes`→`/manufacturing/work-order/:id`) and `renderIntegrationsPanel(inst, opts?)` — always renders 4 rows, empty FK → `<span class="subtitle">—</span>`, IDs >18 chars truncated with `…`, links open in a new tab with `rel="noopener"`, header shows `updated <date>` / `never synced` from `inst.cross_links_updated_at`. Exported on `window.satelliteRender` alongside the existing helpers.
- **`bom.html` rebuilt (150 → 204 lines):** removed the hand-laid 3-level SVG org-chart (which showed only the first 5 instances per subsystem and could not drill) and replaced it with a recursive `<details>`/`<summary>` tree. New page:
  - Loads modules in the standard order (`satellite-config` → supabase UMD → `satellite-auth` → `satellite-api` → `satellite-render`), `requireSession()`, mounts `topbarHTML(session.user.email)`, preserves the `nav-strip` (Constellation / Parts / Work Orders / **BOM** / Kanban / Cost).
  - Reads `?sat=<id>` (handles missing → empty-state, no crash). Best-effort `GET /api/satellites/:satId` for the breadcrumb label; breadcrumb = Constellation → `<satellite>` → BOM tree, with `aria-current="page"` post-injected onto the terminal crumb.
  - `GET /api/satellites/:satId/bom/tree` → renders `tree.node_count` / `tree.root_count` / `tree.max_depth` into the panel meta. Empty `roots[]` → empty-state message; fetch error → error-state message (no infinite spinner).
  - `renderNodeClean(node)` recursion: `<li><details class="tree-node"[ open]><summary class="tree-summary">…</summary><ul class="tree-children">…children…</ul></details></li>`; leaf nodes render `<li><div class="tree-leaf-row">…</div></li>`. `open` set when `node.depth <= 2`. Drawing = `node.drawing_svg` (with `preserveAspectRatio="xMidYMid meet"` patched in) or an inline `no dwg` placeholder; **never** re-fetched. Each row's link → `instance.html?inst=<instId>&id=<instId>&sat=<satId>`.
  - Badges per node: subsystem code (purple, `title` = subsystem label), `make`/`buy` (green/blue), `ITAR` (red, if `itar_flag`), `<n> children` (if non-leaf). Description line = `description · qty <n> · <ref_designator>` (only the present parts).
  - Expand-all / collapse-all buttons (`aria-label="Expand all BOM tree levels"` / `"Collapse all BOM tree levels to roots only"`) toggle `d.open` on every `details.tree-node`.
  - Tree-specific CSS is page-local (`<style>` block) using the shared `--bg-*` / `--border*` / `--text-*` / `--green` / `--blue-1` / `--red` / `--purple` variables; only `.panel` / `.panel-header` / `.subtitle` / `.skeleton` / `.crumb` / `.mono` come from `satellite-shell.css`.
- **Zero hardcoded subsystem labels / status enums / vendor names** — all node fields come from the `/bom/tree` payload (honors `feedback_turion_no_frontend_hardcoding.md`). `grep -E "'(EPS|ADCS|PROP|PAY|COMM|CDH|TCS|STR|released|ordered)'" satellite/bom.html` → 0.
- **No dead code** — only `renderNodeClean` exists (3 occurrences: definition + 2 recursion call sites); the buggy regex-renderer the plan warned about (`function renderNode`) was never written → `grep -c "function renderNode\b"` = 0.

## Task Commits

1. **Task 1: `renderIntegrationsPanel` helper in `satellite-render.js`** — `6b5a0d8` (feat)
2. **Task 2: replace `bom.html` with recursive `<details>` tree** — `1360908` (feat)

**Plan metadata:** _(see final docs commit in this repo's `.planning/`)_

## Sample rendered tree HTML (one parent node)

For a parent node with two children (illustrative — actual `drawing_svg` is the part's real CAD silhouette):

```html
<li class="tree-li">
  <details class="tree-node" open>
    <summary class="tree-summary">
      <span class="row-thumb"><svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">…bus structure silhouette…</svg></span>
      <a class="row-link" href="instance.html?inst=9f3a…&id=9f3a…&sat=SAT-003" title="Open TUR-STR-0001 · instance #1">
        <span class="row-meta">
          <span class="row-pn">TUR-STR-0001</span>
          <span class="row-desc">Primary bus structure · 2 children</span>
        </span>
        <span class="row-badges">
          <span class="badge subsys" title="Structures">STR</span>
          <span class="badge make">make</span>
          <span class="badge">2 children</span>
        </span>
      </a>
    </summary>
    <ul class="tree-children">
      <li class="tree-li"><div class="tree-leaf-row">
        <span class="row-thumb"><svg …bracket…/></span>
        <a class="row-link" href="instance.html?inst=…&id=…&sat=SAT-003" title="Open TUR-STR-0044 · instance #1">
          <span class="row-meta"><span class="row-pn">TUR-STR-0044</span>
            <span class="row-desc">Mounting bracket · qty 4 · BRK-A1</span></span>
          <span class="row-badges"><span class="badge subsys" title="Structures">STR</span><span class="badge buy">buy</span></span>
        </a>
      </div></li>
      <li class="tree-li"><div class="tree-leaf-row">
        <span class="row-thumb"><svg …fastener…/></span>
        <a class="row-link" href="instance.html?inst=…&id=…&sat=SAT-003" title="Open TUR-FST-0009 · instance #1">
          <span class="row-meta"><span class="row-pn">TUR-FST-0009</span>
            <span class="row-desc">M4×12 socket-head cap screw · qty 16</span></span>
          <span class="row-badges"><span class="badge buy">buy</span></span>
        </a>
      </div></li>
    </ul>
  </details>
</li>
```

## Smoke test results

- `node --check satellite/satellite-render.js` → exit 0 (clean parse).
- Inline page JS extracted (`python3` regex grab of the inline `<script>` block) → `node --check` → exit 0.
- Static structural checks (all pass):
  - `wc -l satellite/bom.html` → 204 (≥ 100 ✓)
  - `grep -c "/bom/tree" satellite/bom.html` → 1
  - `grep -E "<details|<summary" satellite/bom.html | wc -l` → 3 (≥ 2 ✓)
  - `grep -c "drawing_svg" satellite/bom.html` → 2; `grep -c "loadPartCad" satellite/bom.html` → 0
  - `grep -c "expandAll\|collapseAll" satellite/bom.html` → 4 (≥ 2 ✓)
  - `grep -E "'(EPS|ADCS|PROP|PAY|COMM|CDH|TCS|STR|released|ordered)'" satellite/bom.html | wc -l` → 0
  - `grep -c "function renderNode\b" satellite/bom.html` → 0; `grep -c "renderNodeClean" satellite/bom.html` → 3
  - `grep -c "aria-label=" satellite/bom.html` → 2; `grep -c "aria-current\|aria_current" satellite/bom.html` → 2
  - `grep -c "satelliteApi.get" satellite/bom.html` → 2; `grep -c "instance\.html?inst=" satellite/bom.html` → 1
  - `grep -c "renderIntegrationsPanel" satellite/satellite-render.js` → 2; `grep -E "case '(sales|netsuite|arena|mes)':" satellite/satellite-render.js | wc -l` → 4
- **Live browser smoke not run.** The `/bom/tree` route is not yet deployed to the Lambda (Plan 28-03 SUMMARY: routes committed on `turion-satellite` `main`, deploy is Plan 28-06). Against the currently-deployed Lambda the page renders shell + nav + breadcrumb + an error-state message ("Failed to load BOM tree: HTTP 404") rather than the tree — by design (graceful degradation). Full visual verification belongs to Plan 28-06 after deploy. No local backend was stood up.

## Decisions Made

See `key-decisions` in frontmatter. Most consequential: (1) followed the live `/satellite/` dark-theme idiom rather than the plan's light-Apple sample markup; (2) `bom.html` links carry **both** `?inst=` and `?id=` so navigation survives whether or not Plan 28-05 has renamed the instance.html param; (3) `renderIntegrationsPanel` uses inline `style=` for FK rows rather than adding classes to the shared `satellite-shell.css` (owned by Plan 28-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's sample HTML idiom does not exist in this codebase — used the live `/satellite/` idiom instead**
- **Found during:** Task 2
- **Issue:** The plan's suggested `bom.html` skeleton used `topbarHTML(session)`, `<main class="page">`, a separate `<div id="breadcrumb">`, `bc-current`, `index.html`, `sat.html?sat=`, and a light-Apple colour palette. The actual `/satellite/` pages (`instance.html`, `part.html`, the old `bom.html`) use `r.topbarHTML(session.user.email)`, `<main class="main">`, `<div id="crumb" class="crumb">`, a `nav-strip`, dark-theme CSS variables, `sat.html?id=`, and `r.getQueryParam('sat')` for the satellite param. The plan explicitly said "match the project's HTML idiom" and labelled its sample "Suggested structure", so the codebase idiom wins.
- **Fix:** Wrote `bom.html` against the real idiom — dark theme, `nav-strip` preserved, `#crumb`, `topbarHTML(session.user.email)`, `getQueryParam('sat')`, breadcrumb via the shared `r.breadcrumb([...])` helper. The plan's `aria-current` requirement is met by post-processing the breadcrumb HTML (the shared helper has no aria option, exactly as the plan's inline comment anticipated).
- **Files modified:** `satellite/bom.html`
- **Verification:** Page loads modules in the same order as `instance.html`; all 10 of the plan's Task-2 grep checks pass; inline JS parses clean.
- **Committed in:** `1360908` (Task 2 commit)

**2. [Rule 1 - Bug] instance.html link param: plan says `?inst=`, the existing instance.html reads `?id=` — emit both**
- **Found during:** Task 2
- **Issue:** The plan's `must_haves` / `key_links` require `instance.html?inst=<instance_id>&sat=<satId>`. But `satellite/instance.html` line 176 reads `r.getQueryParam('id')`, not `'inst'`. Linking only with `?inst=` would satisfy the plan's grep check but produce a dead navigation (instance.html would redirect to `/satellite/` on missing `id`). Linking only with `?id=` would break the plan's contract / Plan 28-05's expectation.
- **Fix:** Each tree row links to `instance.html?inst=<instId>&id=<instId>&sat=<satId>` — `grep -c "instance\.html?inst="` is 1 (plan check passes) and the existing `getQueryParam('id')` still resolves. When Plan 28-05 migrates instance.html to read `inst`, the `id=` param is harmless.
- **Files modified:** `satellite/bom.html`
- **Verification:** `grep -c "instance\.html?inst=" satellite/bom.html` → 1; the URL also contains `&id=` for back-compat.
- **Committed in:** `1360908`

**3. [Rule 3 - Blocking] `/bom/tree` endpoint path — plan body implied `/:satId/tree`; actual route is `/tree`**
- **Found during:** Task 2 (cross-checked against Plan 28-03 SUMMARY)
- **Issue:** Some of the plan's prose referenced the route as if registered at `/:satId/tree`. Plan 28-03's executor corrected this: the bom router is mounted at `/api/satellites/:satId/bom` with `mergeParams`, so the live path is `GET /api/satellites/:satId/bom/tree` (route string `/tree`).
- **Fix:** `bom.html` calls `satelliteApi.get('/api/satellites/' + encodeURIComponent(satId) + '/bom/tree')` — the documented, working path.
- **Files modified:** `satellite/bom.html`
- **Verification:** `grep -c "/bom/tree" satellite/bom.html` → 1; matches the path Plan 28-03's `bom-tree.test.ts` exercises.
- **Committed in:** `1360908`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking) — all about reconciling the plan's illustrative sample with the actual codebase. No scope creep; both deliverables match the plan's `must_haves` truths.
**Impact on plan:** The plan's Task-2 grep check `grep -E "<details|<summary"` ≥ 2 passes (3 hits); all other checks pass as written.

## Issues Encountered

- The plan's Step-4 lint command (`node --check <(awk '/<script>/,/<\/script>/' bom.html | sed '/<\/\?script>/d')`) over-captures: it grabs the `<script src=…>` tags too, so `node --check` chokes on the literal `<`. Worked around by extracting only the inline `<script>…</script>` block (Python regex) before linting — that parses clean.
- No live tree verification: `/bom/tree` isn't deployed yet (Plan 28-06 owns deploy), and no local backend instance was available. Static + lint coverage only. Plan 28-06's deploy-verify step should `GET /api/satellites/<SAT-003-id>/bom/tree` then load `bom.html?sat=<SAT-003-id>` in a browser.

## User Setup Required

None — no external service configuration. Both files are committed locally on `turion-space-demo` `main`; deploy (S3 sync + CloudFront invalidate) is Plan 28-06.

## Next Phase Readiness

- **Plan 28-05** can `import` `window.satelliteRender.renderIntegrationsPanel(inst, opts?)` into `cost-detail.html` and `instance.html` — it's exported and lint-clean. (If 28-05 also adds `.cost-row*` classes to `satellite-shell.css`, the inline-styled FK rows here will keep working — no conflict.)
- **Plan 28-05** should rename `instance.html`'s `getQueryParam('id')` → also accept `inst` (or just `inst`) — `bom.html` already passes both params.
- **Plan 28-06** must `cd /Users/jeet/turion-space-demo && git push origin main` then `./deploy-frontend.sh` (S3 sync + CF invalidate `/*`), and ensure the `turion-satellite` backend Lambda has the `/bom/tree` route deployed first (Plan 28-03 left it committed-but-not-live). Then verify: `bom.html?sat=<SAT-003-id>` renders the recursive tree (~309 nodes, < 3s), expand/collapse work, rows click through to `instance.html`.

---
*Phase: 28-full-bom-densification-data-coverage-drill-down-ui*
*Completed: 2026-05-11*

## Self-Check: PASSED

- FOUND: /Users/jeet/turion-space-demo/satellite/bom.html
- FOUND: /Users/jeet/turion-space-demo/satellite/satellite-render.js
- FOUND: .planning/phases/28-full-bom-densification-data-coverage-drill-down-ui/28-04-SUMMARY.md
- FOUND commit: 6b5a0d8 (Task 1 — renderIntegrationsPanel)
- FOUND commit: 1360908 (Task 2 — bom.html recursive tree)
