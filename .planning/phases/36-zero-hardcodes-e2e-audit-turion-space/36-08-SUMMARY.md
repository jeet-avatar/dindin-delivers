---
phase: 36-zero-hardcodes-e2e-audit-turion-space
plan: 08
subsystem: infra
tags: [turion-space-demo, audit, buttons, endpoints, ci-script]

requires:
  - phase: 36-02
    provides: ERP lookup endpoints + /api/agents router + /api/data/all + single-source-of-truth API base
  - phase: 36-03
    provides: de-hardcoded satellite frontend (audit-satellite-buttons.mjs kept clean)
  - phase: 36-05
    provides: de-hardcoded Arena/MES/integration ERP pages
  - phase: 36-07
    provides: in-tree agents/notify WIP finished + clean
provides:
  - "scripts/audit-erp-buttons.mjs — ERP-frontend button/endpoint static audit; allowlist DERIVED from the ERP backend (app.ts mount tree + routes/*.ts incl. keyed-CRUD helper expansion); fails closed"
  - "npm run audit-buttons now runs BOTH audits (satellite + ERP); both exit 0 / 0 violations"
  - "Button/endpoint audit is 0 violations on BOTH frontends"
affects: [36-09]

tech-stack:
  added: []
  patterns:
    - "Dependency-free static analyzer that derives its allowlist from the backend source (never hand-maintained, fail-closed) — same posture as turion-satellite/backend/scripts/audit-satellite-buttons.mjs"
    - "keyed-CRUD helper expansion: detect `function NAME(routePath, table){ r.get(routePath) ; r.get(`${routePath}/:id`) ; r.post(routePath) ; r.patch(`${routePath}/:id`) }`, then expand every `NAME('/items','items')` call to its registered routes (honoring `{ skipPost: true }`)"

key-files:
  created:
    - /Users/jeet/turion-space-demo/scripts/audit-erp-buttons.mjs
  modified:
    - /Users/jeet/turion-space-demo/package.json
  satellite-audit-reused:
    - /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs (re-run, still 0 violations)

decisions:
  - "ERP audit flags ONLY onclick→undefined-function (genuine dead buttons) — not all inline onclick — matching the plan's must_haves; resolves function names against inline <script> blocks AND every `<script src>`-included JS file the page references"
  - "ns-actions.js `confirm:`/`tab:`/`url:` 'More Actions' menu entries are DATA not onclick handlers — never flagged; only the (defined) function that opens the menu is checked"
  - "fetch() API-call scan covers HTML/inline-JS plus a fixed list of shared helper JS the pages include (data-loader.js, erp-lookups.js, arena-lookups.js, ns-editable.js, live-badge.js, shells/edit-modal.js, shells/status-indicator.js); `*-data.js` are pure data and excluded"
  - "onclick attributes built at runtime via `onclick=\"${var}\"` (JS template-string builders) are handled by resolving `${ident}` to the identifier's declared string-literal value(s) and checking those — avoids false positives on salesforce-account.html's `${onclickHandler}` / `${runUrl}`"
  - "No backend route added and no HTML changed — the ERP audit was clean on its first real run (all 37 fetch calls resolved to existing routes; all 516 onclick handlers call defined functions or builtins)"

metrics:
  duration: ~35min
  tasks: 2
  files: 2
  completed: 2026-05-12
---

# Phase 36 Plan 08: ERP-side button audit + 0 violations on both frontends — Summary

Added `scripts/audit-erp-buttons.mjs`, the ERP-frontend sibling of the existing satellite button audit, and wired `npm run audit-buttons` to run both. Result: **0 violations on both frontends**, no backend route or HTML fix required.

## What was built

**`scripts/audit-erp-buttons.mjs`** (~620 lines, no npm deps, Node 20+):

1. **Route allowlist — derived from the ERP backend, never hand-maintained:**
   - Parses `backend/src/app.ts`: direct `app.<method>('/api/...')` routes (e.g. `GET /api/health`, `GET /api/activity`, `GET /api/data/all`, `GET /api/data/sf`, `GET /api/data/ns`) + `app.use('/api/<prefix>', <router>)` mounts (resolving the router var via `import` statements).
   - Walks each mounted router file: direct `r.<method>('<path>')` definitions; **keyed-CRUD helper expansion** — detects helper functions like `keyedEntity(routePath, table)` whose body registers `r.get(routePath)` / `r.get(\`${routePath}/:id\`)` / `r.post(routePath)` / `r.patch(\`${routePath}/:id\`)`, then expands every call site (`keyedEntity('/items','items')` → `GET/POST /api/netsuite/items`, `GET/PATCH /api/netsuite/items/:id`), honoring `{ skipPost: true }`; also `arrayRoute`/`syncRunsRoute` style single-GET helpers; nested `router.use('/sub', subRouter)`.
   - **Fails closed:** a route def it can't parse is not silently allowed; template-literal route paths still containing `${...}` are skipped from the literal pass (they're the helper-definition bodies — covered by call-site expansion).
   - Final allowlist: **195 routes** across salesforce / netsuite / arena / mes / vendor / integration / extras / notify / agents / lookups + the inline `app.*` routes.

2. **Scan — every ERP `*.html`** (recursive; excludes `satellite/`, `node_modules/`, `backend/`, `tests/`, `.superpowers/`, dot-dirs, `cf-function-source/`, `infra/`, `docs/`) **plus the shared helper JS** the pages `<script src>`-include:
   - **onclick handlers:** flags ONLY handlers calling an *undefined* function. "Defined" = function/var defined in an inline `<script>` of the same page, OR in any `<script src>`-included JS file (ns-toast.js, data-loader.js, ns-editable.js, ns-actions.js, ns-menu.js, live-badge.js, shells/*.js, …), OR an allowlisted built-in/global (`location.*`, `window.*`, `document.*`, `event.preventDefault/stopPropagation`, `print()`, `alert/confirm`, `console.*`, `this.*`, assignments, …). `ns-actions.js` `confirm:`/`tab:`/`url:` "More Actions" menu items are config data — never flagged; only the function that *opens* the menu matters (and `nsOpenActions`/etc. ARE defined in `ns-actions.js`). Runtime-built `onclick="${var}"` template-string handlers are resolved by substituting the identifier's declared string-literal value(s).
   - **fetch() API calls:** for each `fetch(<expr>, <opts>)`, reduces the first-arg expression to a normalized `/api/...` path (string literal, `BASE + '/api/...'` concatenation, or `\`${BASE}/api/...\`` template literal — `${...}` segments → `:X`), reads the HTTP method from `<opts>` (`method:'POST'` etc., default GET), and matches against the allowlist (`:param` wildcard segments either side, exact segment count). Bare-identifier first args (`fetch(url, …)`) are resolved against the file's `const/let/var url = …` declarations. Anything that references `/api/` but can't be confidently reduced → `unparseable-path` violation (fail closed).
   - Output: `pages: N`, `routes: N`, `onclick handlers scanned: N`, `fetch API calls scanned: N`, `violations: N (...)`; `process.exit(violations ? 1 : 0)`; exit 2 if the frontend dir / backend `app.ts` is missing.

3. **`package.json`:** `"audit-buttons"` now runs `node scripts/audit-satellite-buttons.mjs && node scripts/audit-erp-buttons.mjs`; added `"audit-buttons-satellite"` and `"audit-buttons-erp"` for running each alone.

## Violations surfaced & fixed

**None.** First real run of the ERP audit (after fixing two audit-logic bugs found during development — see below): `pages: 72, routes: 195, onclick handlers scanned: 516, fetch API calls scanned: 37, violations: 0`. All 37 ERP `fetch()` calls resolve to existing backend routes; all 516 onclick handlers call functions that are defined (inline or in an included JS file) or are builtins. The satellite audit (`audit-satellite-buttons.mjs`) was re-run and is still `violations: 0` (`routes: 75, onclick: 16, satelliteApi calls: 84`).

## Audit-logic refinements made during development

1. **Helper-function body extraction was grabbing the wrong `{`.** `function keyedEntity(routePath: string, table: string, opts: {...} = {})` — `src.indexOf('{', afterParamName)` landed on the `{}` *default value of `opts`*, not the function body, so `detectHelpers` saw a 22-char "body" and registered zero CRUD routes. Fixed by first advancing past the param-list `)` (balancing parens) before finding the body `{`. This is what made the `/:id` CRUD routes (e.g. `PATCH /api/netsuite/items/:id`, the `ns-editable.js` target) appear in the allowlist.
2. **Literal route-path pass picked up helper-definition template strings.** `r.get(\`${routePath}/:id\`, …)` inside a helper body matched the literal-route regex and produced a bogus `GET /api/arena/${routePath}/:id` entry. Fixed: skip captured route paths containing `${...}` (those come from call-site expansion, not the definition's text).
3. **False-positive dead-onclick on `salesforce-account.html`.** `onclick="${onclickHandler}"` and `onclick="event.preventDefault();${runUrl};"` are emitted by JS template-string row builders; the actual handler is `window.location='…'` / `nsToast('…')` / `toggleReportResults('…')`. Added `resolveTemplateOnclick()`: when an onclick value contains `${ident}`, substitute the identifier's declared string-literal value(s) (handling ternaries) and check those concrete strings instead.

## Verification (proof)

```
$ cd /Users/jeet/turion-space-demo && npm run audit-buttons
> node scripts/audit-satellite-buttons.mjs && node scripts/audit-erp-buttons.mjs
routes: 75
onclick handlers scanned: 16
satelliteApi calls scanned: 84
violations: 0
pages: 72
routes: 195
onclick handlers scanned: 516
fetch API calls scanned: 37
violations: 0
$ echo $?
0

$ node /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs
routes: 75 / onclick: 16 / satelliteApi calls: 84 / violations: 0   (exit 0)

$ node --check scripts/audit-erp-buttons.mjs        # clean
$ grep -n audit-erp-buttons package.json            # 2 hits (audit-buttons + audit-buttons-erp)
```

Negative test: temporarily renaming `/api/notify/visit` → `/api/notify/visit-FAKE` in `index.html` made the ERP audit report `violations: 1 ({"missing-endpoint":1})` and exit 1, confirming it isn't silently passing.

## Commit (not pushed — plan 36-09 owns deploy)

- `de0fac9` `feat(36-08): add ERP-frontend button/endpoint audit (0 violations both frontends)` — `scripts/audit-erp-buttons.mjs` (new), `package.json` (modified). Author: `jeet-avatar <jm@techcloudpro.com>`. In repo `/Users/jeet/turion-space-demo`.

## Deviations from Plan

None — plan executed as written. Tasks 1 and 2 were committed together in one commit because Task 2 surfaced zero violations to fix (no HTML or backend change), so there was nothing to add to a separate Task-2 commit beyond what Task 1 already produced.

## Self-Check: PASSED
- FOUND: /Users/jeet/turion-space-demo/scripts/audit-erp-buttons.mjs
- FOUND: /Users/jeet/turion-space-demo/package.json contains `audit-erp-buttons`
- FOUND: commit `de0fac9` in /Users/jeet/turion-space-demo
- VERIFIED: `npm run audit-buttons` → both audits `violations: 0`, exit 0
- VERIFIED: satellite audit re-run → `violations: 0`, exit 0
