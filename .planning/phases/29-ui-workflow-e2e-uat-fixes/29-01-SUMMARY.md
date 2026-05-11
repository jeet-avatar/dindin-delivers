---
phase: 29-ui-workflow-e2e-uat-fixes
plan: 01
subsystem: ui
tags: [turion-satellite, turion-space-demo, button-audit, endpoint-coverage, static-analysis, vitest, vanilla-js, express]

# Dependency graph
requires:
  - phase: 28-full-bom-densification-data-coverage-drill-down-ui
    provides: "the satellite frontend pages (12 HTML) + cost.html parts.html?subsystem= link + instance.html siblings array + Phase 28 deferred-items #1 (instance_index>1 instances lack own WO/PR)"
  - phase: 27-cad-coverage-hotspots
    provides: "vitest.config.ts include glob (tests/**/*.test.ts) the new audit test slots into"
provides:
  - "turion-satellite/backend/scripts/audit-satellite-buttons.mjs — dependency-free static analyzer (route allowlist derived from app.ts mount tree, scans satellite/*.html, fails closed)"
  - "turion-satellite/backend/tests/audit-satellite-buttons.test.ts — Vitest case wrapping the audit (skips cleanly in CI when the sibling frontend repo is absent)"
  - "turion-space-demo/scripts/audit-satellite-buttons.mjs — thin re-export wrapper so `npm run audit-buttons` works in the frontend repo"
  - "parts.html honoring ?subsystem=/?search= URL params before the first load()"
  - "instance.html 'tracked on instance #1' hint when instance_index>1 and no WOs"
  - "auth/callback.html F4 review finding (no change needed)"
affects: [29-03, phase-29-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static button/endpoint audit: parse app.ts (app.use('/api/...', router)) + each router file (router.{get,post,patch,put,delete} + nested router.use('/:x', sub)) into a normalized Set of 'METHOD /api/...' routes; regex-scan satellite/*.html for onclick attrs + satelliteApi.{get,post,patch} calls; fail closed"
    - "Path normalization (fail-closed): strip ?query + trailing /; template ${...} → :X segment; concat '/a/'+x+'/b' → :X segment-fragment, 2+ adjacent non-literals → unparseable; match candidate vs route segment-by-segment with :param wildcards on EITHER side AND exact segment-count"
    - "Identifier resolution in the audit: when a satelliteApi.* arg is a bare identifier, resolve `const NAME = <expr|ternary>` and `function NAME(NAME) { ... }`-wrapper call sites against the file text before declaring unparseable"
    - "Vitest case that skips when an out-of-repo sibling dir is absent: it.skipIf(!fs.existsSync(satelliteDir))(...)"
    - "parts.html pre-applies URL params (subsystem/search) AFTER the awaited GET /api/subsystems populates #subFilter <option>s, BEFORE the first load()"

key-files:
  created:
    - /Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs
    - /Users/jeet/turion-satellite/backend/tests/audit-satellite-buttons.test.ts
    - /Users/jeet/turion-space-demo/scripts/audit-satellite-buttons.mjs
  modified:
    - /Users/jeet/turion-satellite/backend/package.json
    - /Users/jeet/turion-space-demo/package.json
    - /Users/jeet/turion-space-demo/satellite/parts.html
    - /Users/jeet/turion-space-demo/satellite/instance.html

key-decisions:
  - "Audit allowlist is DERIVED from backend/src/app.ts's mount tree (parse app.use + router.use + router.{get,post,patch,put,delete}) — never hand-maintained. It found 61 routes against the current codebase."
  - "The audit FAILS CLOSED: query strings & trailing slashes stripped before normalizing; template ${...} collapses the whole segment to :X; string-concat boundaries become :X segment-fragments BUT 2+ adjacent non-literals (e.g. '/api/'+a+b) → `unparseable-path` violation; the candidate's segment count must EXACTLY match a route's (after :param wildcarding) or it's a `missing-endpoint` violation; a bare identifier that can't be resolved to a literal/ternary/wrapper-fn-param → `unparseable-path`. Better a false positive a human dismisses than a dead endpoint that ships."
  - "onclick allowlist (no in-file fn needed): location.reload()/.href=/.replace(), window.location.*, history.back(), window.satelliteAuth.signOut()/.signInWithMagicLink(), document.getElementById('...').remove()/.dispatchEvent()/.value=, dispatchEvent(new Event(...)), event.preventDefault(), this.style.*. Anything else must be a function defined in a <script> block in the SAME file (function NAME( / const NAME = ( / NAME = async ( / window.NAME =)."
  - "The Vitest case lives at tests/audit-satellite-buttons.test.ts (matching the repo's actual glob — vitest.config.ts includes `tests/**/*.test.ts`, NOT `test/**` as the plan prompt context guessed) and uses it.skipIf(!fs.existsSync(satelliteDir)) so CI (which doesn't vendor turion-space-demo) stays green while a local `npm test` exercises it."
  - "Frontend wrapper = re-export (option a), not a copy: turion-space-demo/scripts/audit-satellite-buttons.mjs dynamically imports ../../turion-satellite/backend/scripts/audit-satellite-buttons.mjs with satelliteDir/backendSrcDir pinned to this repo's satellite/ + the sibling backend's src/. SINGLE source of truth stays in turion-satellite/backend. If the sibling backend isn't checked out, the wrapper prints how to fix it and exits 2 (not a silent pass)."
  - "F4 (auth/callback.html): NO code change. It already (a) runs the Supabase magic-link exchange (createClient detectSessionInUrl:true + 300ms wait + getSession()), (b) redirects to /satellite/ on success (window.location.replace), (c) shows a readable error (error_description from the URL hash, or a 'Sign-in failed. The link may have expired.' fallback) and auto-redirects to login.html after 3s. login.html never carries a next/redirect_to param so there's nothing to preserve."
  - "F3 (parts.html): the pre-apply block reads r.getQueryParam('subsystem') and r.getQueryParam('search') AFTER the awaited GET /api/subsystems has populated #subFilter's <option>s (synchronously, in the same IIFE) and BEFORE the first await load(). It only sets sel.value if a matching <option> exists, so an unknown ?subsystem= is harmlessly ignored; the no-param path still defaults to '' = all. ?sat= is left alone (harmless on the URL — parts.html doesn't use it)."
  - "F5 (instance.html): the only change is the empty-WO branch. When inst.instance_index > 1 AND myWos.length === 0, the WO panel shows 'Manufacturing & procurement for this part are tracked on instance #1.' linked to the #1 sibling (found from the already-loaded allInstances by part_definition_id + instance_index===1) — or the plain text if no #1 sibling exists. instance #1 / instance_index===1 panels are byte-identical to before. Pure client-side, no backend call, no new onclick/satelliteApi. The cost panel, integrations panel, subtree-rollup panel and cost_breakdown source are untouched (per research Pitfall: don't 'fix' instance.html's lightweight cost estimate to use /api/make-costs — that's intentional per Phase 24)."

patterns-established:
  - "audit-satellite-buttons.mjs default-exports `async function auditSatelliteButtons({satelliteDir?, backendSrcDir?})` returning {routes, onclickCount, apiCallCount, violations}; violations carry kind ∈ {dead-onclick, missing-endpoint, unparseable-path}; also runs as a CLI (prints a summary, exits 1 on any violation, 2 if dirs missing)"
  - "Override the audit's input dirs via SATELLITE_DIR / BACKEND_SRC_DIR env vars (used for the fail-closed scratch-dir test)"

requirements-completed: [ButtonAudit, EndpointCoverage]

# Metrics
duration: ~75min
completed: 2026-05-11
---

# Phase 29 Plan 01: Static button/endpoint audit + parts.html URL params + auth/callback review + instance.html instance#1 hint Summary

**Built a dependency-free static analyzer (`audit-satellite-buttons.mjs`) that derives the API route allowlist from `app.ts`'s mount tree, scans every `satellite/*.html` for `onclick` handlers and `satelliteApi.{get,post,patch}` calls, fails closed on any ambiguity, and is wired as a Vitest case in `turion-satellite/backend` + an `npm run audit-buttons` script in both repos — plus closed the three backend-free Phase 29 polish gaps (F3 parts.html honors `?subsystem=`/`?search=`, F4 auth/callback.html reviewed sound, F5 instance.html explains the `instance_index>1` empty-WO state with a link to instance #1).**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 completed
- **Files created:** 3 (`audit-satellite-buttons.mjs` ×2, `audit-satellite-buttons.test.ts`)
- **Files modified:** 4 (`package.json` ×2, `parts.html`, `instance.html`)
- **Audit results against current codebase:** 61 routes parsed, 15 onclick handlers, 57 satelliteApi calls, **0 violations**
- **Backend test suite:** 326 passed, 1 skipped (pre-existing `supersede.integration.test.ts` skip), 0 regressions; the new `audit-satellite-buttons.test.ts` passes

## What Was Built

### Task 1 — `audit-satellite-buttons.mjs` (turion-satellite/backend/scripts) + Vitest case

**The script (`backend/scripts/audit-satellite-buttons.mjs`, ~430 lines, Node 20+, zero deps):**

1. **Locates the satellite HTML dir** — defaults to `path.resolve(import.meta.dirname, '../../../turion-space-demo/satellite')` (the two repos are siblings under `/Users/jeet/`); overridable via `SATELLITE_DIR`. Missing dir → clear message, exit 2.

2. **Builds the route allowlist FROM `backend/src/app.ts`** (never hand-maintained):
   - Parses `app.use('/api/...', someRouter)` lines → resolves `someRouter` to its `import ... from './routes/X'` file.
   - In each router file: `router.(get|post|patch|put|delete)('<path>', ...)` → a route at `<mountPrefix><path>`.
   - Nested mounts: `router.use('/:x', subRouter)` inside a router file → recurse with prefix `<mountPrefix>/:x` (resolves the sub-router via that file's imports).
   - Normalizes: collapse `//` → `/`, strip trailing `/` (except root), keep `:param` segments and case as-is.
   - Output: a `Set` of normalized `METHOD /api/...` strings (61 of them, e.g. `POST /api/satellites/:satId/instances`, `POST /api/satellites/:satId/instances/:instId/advance`, `PATCH /api/satellites/:satId/work-orders/:woId`, `POST /api/make-buy-decisions/:satId/:partDefId/re-evaluate`, `POST /api/work-orders/:woId/steps/:stepId/sign`).

3. **Scans each `satellite/*.html` (recursively, incl. `auth/`; skips `cad/` and `node_modules/`)** for:
   - **`onclick="..."` attributes** — splits the snippet on top-level `;` and asserts each statement is EITHER an allowlisted built-in/global (see key-decisions for the full list: `location.*`, `window.location.*`, `history.back()`, `window.satelliteAuth.signOut()/.signInWithMagicLink()`, `document.getElementById('...').remove()/.dispatchEvent()/.value=`, `dispatchEvent(new Event(...))`, `event.preventDefault()`, `this.style.*`) OR a call to a function whose definition (`function NAME(` / `const NAME = (` / `NAME = async (` / `window.NAME =`) appears in a `<script>` block in the SAME file. Anything else → `{file, kind:'dead-onclick', snippet}`.
   - **`satelliteApi.(get|post|patch)( <expr> ...)` calls** — extracts the first-arg expression (balanced-paren walk) and normalizes it **fail-closed**:
     1. Strip `?query`/`#hash`; strip trailing `/` (unless `/`).
     2. Template literal: each `${...}` collapses its WHOLE segment to `:X` (incl. mid-segment splices like `/api/foo${bar}baz` → `/api/:X`).
     3. String concat `'/api/foo/' + x + '/bar'`: each `+ ... +` boundary is a `:X` segment-fragment — BUT **2+ adjacent non-literals** (e.g. `'/api/' + a + b + c`) is genuinely ambiguous → `{file, kind:'unparseable-path', method, snippet}` (never a silent pass). A leading string literal carrying a `?` (e.g. `'/api/parts?' + params`) → the path is everything before the `?`.
     4. **Bare identifier** as the arg (e.g. `satelliteApi.get(url)` / `satelliteApi.get(path)`) → try to resolve it against the file text: `const/let/var NAME = <expr>` (splitting an outermost ternary into both branches) and the wrapper-fn pattern `function NAME(NAME) { ... }` / `const NAME = (NAME) =>` (collect every `NAME(<literal>)` call site, skipping the definition site). If nothing resolves → `unparseable-path`. (This is what kept the real `cost-detail.html` `safeGet(path)` wrapper and `part.html`'s `const url = isMake ? '...' : '...'` ternary clean.)
   - **Matching (fail-closed):** compare the candidate `METHOD path` against each route `METHOD path` segment-by-segment, treating any `:foo`/`:X` on EITHER side as a wildcard for that one segment, AND the segment count must match EXACTLY. A miss → `{file, kind:'missing-endpoint', method, path}`.

4. **Returns `{ routes, onclickCount, apiCallCount, violations }`** from a default-exported `async function auditSatelliteButtons({satelliteDir?, backendSrcDir?} = {})`. Also runs as a CLI (prints `routes:`/`onclick handlers scanned:`/`satelliteApi calls scanned:`/`violations:` + a by-kind breakdown, dumps the violations JSON to stderr, `process.exit(violations.length ? 1 : 0)`; exit 2 if a dir is missing).

5. **`package.json`:** added `"audit-buttons": "node scripts/audit-satellite-buttons.mjs"`.

**The Vitest case (`backend/tests/audit-satellite-buttons.test.ts`):** imports the default export, runs it, asserts `r.violations.length === 0`, `r.routes.length > 20`, `r.apiCallCount > 10`, `r.onclickCount > 0`. Wrapped in `it.skipIf(!fs.existsSync(satelliteDir))` so CI (which doesn't vendor `turion-space-demo`) stays green; a local `npm test` (where the sibling repo exists) runs it for real. It lives at `tests/...test.ts` because that's the repo's actual Vitest glob (`vitest.config.ts` → `include: ['tests/**/*.test.ts', ...]`), not `test/**` as the plan prompt context guessed.

**Fail-closed verification (scratch dir, `SATELLITE_DIR=/tmp/scratch`):** an injected `satelliteApi.post('/api/does-not-exist')` → exit 1 with a `missing-endpoint` violation; a wrong-segment-count path `satelliteApi.get(\`/api/satellites/${satId}/instances/${id}/extra\`)` → `missing-endpoint` (5 segments after `/api`, no route matches); an `onclick="totallyUndefinedFn()"` → `dead-onclick`; an ambiguous concat `const tangled = '/api/' + segA + foo + bar; satelliteApi.get(tangled)` → `unparseable-path`. A missing satellite dir → exit 2. All confirmed.

### Task 2 — F4 auth/callback.html review + F3 parts.html URL params + frontend audit wrapper

**F4 — `auth/callback.html` review:** read it; **no code change needed**. It already (a) runs the Supabase magic-link exchange (`window.supabase.createClient(...)` with `detectSessionInUrl: true`, then a 300 ms `setTimeout` → `window.satelliteAuth.getSession()`), (b) on success → `window.location.replace('/satellite/')`, (c) on a bad/expired link → renders `error_description` from the URL hash (or a `'Sign-in failed. The link may have expired.'` fallback) into `#error` and `window.location.replace('/satellite/login.html')` after 3 s. `login.html` always sets `emailRedirectTo = ${origin}/satellite/auth/callback.html` with no `next`/`redirect_to` param, so there's nothing to preserve. Finding recorded; file untouched.

**F3 — `parts.html` honors `?subsystem=`/`?search=`:** inserted a `{ ... }` block immediately AFTER the awaited `GET /api/subsystems` block (which synchronously appends the `#subFilter` `<option>`s) and BEFORE the first `await load()`:
```js
{
  const qSub = r.getQueryParam('subsystem');   // cost.html / cost-render.js emit this
  const qSearch = r.getQueryParam('search');
  if (qSub) {
    const sel = document.getElementById('subFilter');
    if ([...sel.options].some(o => o.value === qSub)) sel.value = qSub;
  }
  if (qSearch) document.getElementById('searchInput').value = qSearch;
}
```
`load()` reads `#subFilter.value` / `#searchInput.value`, so by setting them first the table loads pre-filtered. An unknown `?subsystem=` is harmlessly ignored (no matching `<option>`); the no-param path still defaults to `''` = all subsystems. Confirmed `cost-render.js`'s `renderRollupRow` emits `parts.html?subsystem=${encodeURIComponent(code)}&sat=${...}` — the param name `subsystem` matches what parts.html now reads. `node --check` on the extracted inline `<script>` passes.

**Frontend audit wrapper (`turion-space-demo/scripts/audit-satellite-buttons.mjs`):** dynamically `import()`s the turion-satellite source-of-truth script (`../../turion-satellite/backend/scripts/audit-satellite-buttons.mjs`) with `satelliteDir` pinned to this repo's `./satellite` and `backendSrcDir` pinned to `../turion-satellite/backend/src`; prints the same summary, exits non-zero on violations. If the sibling backend isn't checked out it prints how to fix it and exits 2 (not a silent pass). `turion-space-demo/package.json`: added `"audit-buttons": "node scripts/audit-satellite-buttons.mjs"`. `npm run audit-buttons` in turion-space-demo → 61 routes, 0 violations, exit 0.

### Task 3 — F5 instance.html instance_index>1 hint

In `instance.html`'s "Work orders" panel, the empty branch (`if (myWos.length === 0)`) now checks `inst.instance_index > 1`:
- If so AND a sibling with `instance_index === 1` for the same `part_definition_id` exists in the already-loaded `allInstances` array → render `Manufacturing & procurement for this part are tracked on instance #1.` plus a `<a href="/satellite/instance.html?sat=<satId>&id=<sibling.id>" ...>→ Open instance #1</a>` link (text via `r.escapeHtml`).
- If no `#1` sibling → just the plain hint text (no link).
- Otherwise (`instance_index === 1`, or there's no enclosing condition) → the original `<div class="empty"><p>No work orders</p></div>`, byte-identical.

This is a documented pre-existing data state (migrations 013/019 only backfill instance #1 — Phase 28 deferred-items #1), not a bug; the hint just explains it to the UAT walker / demo user. Pure client-side, no backend call, no new `onclick`/`satelliteApi` — the audit still reports 0 violations. Nothing else on the page changed (cost panel, integrations panel, subtree-rollup panel, `cost_breakdown` source all untouched). `node --check` on the extracted inline `<script>` passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest test location was `test/` in the plan prompt, `tests/` in the actual repo**
- **Found during:** Task 1
- **Issue:** The plan's prompt context said "the prompt context says `backend/test/` but VERIFY and use the actual glob". `vitest.config.ts` includes `tests/**/*.test.ts` (with an `s`), and every existing `*.test.ts` lives in `tests/`.
- **Fix:** Created the test at `backend/tests/audit-satellite-buttons.test.ts` so it's picked up by the existing glob (no config change).
- **Files modified:** `backend/tests/audit-satellite-buttons.test.ts` (created)
- **Commit:** `43f2875` (turion-satellite)

**2. [Rule 1 - Bug] First-pass audit flagged two legitimate `satelliteApi.get(<identifier>)` call sites as `unparseable-path`**
- **Found during:** Task 1 (running the audit against the real codebase)
- **Issue:** `cost-detail.html`'s `async function safeGet(path) { ... satelliteApi.get(path) ... }` wrapper (path comes from template literals at the call sites) and `part.html`'s `const url = isMake ? '/api/make-costs/...' : '/api/buy-costs/...'; satelliteApi.get(url)` ternary both pass a bare identifier — the initial extractor couldn't statically know the path and (correctly, per the fail-closed spec) reported `unparseable-path`. But the plan requires **0 violations today**.
- **Fix:** Added an identifier-resolution pass: when the arg is a bare identifier, resolve `const/let/var NAME = <expr>` (splitting an outermost ternary into both branches and normalizing each) and the wrapper-fn pattern `function NAME(NAME) { ... }` / arrow equivalent (collect every `NAME(<literal>)` call site, skipping the definition site `function NAME(` so the param name isn't read as an argument). Only if NOTHING resolves does it stay `unparseable-path`. Still fails closed: a genuinely tangled concat (`'/api/' + a + b + c`, 2+ adjacent non-literals) is `unparseable-path`.
- **Files modified:** `backend/scripts/audit-satellite-buttons.mjs`
- **Commit:** `43f2875` (turion-satellite)

**3. [Rule 1 - Bug] An ambiguous string concat with 2+ adjacent non-literal pieces was silently resolving to `/api/:X` and matching real routes**
- **Found during:** Task 1 (fail-closed scratch test)
- **Issue:** `'/api/' + segA + foo + bar` was collapsing to `/api/:X` (one segment), which then wildcard-matched `GET /api/satellites` etc. — a false negative for a genuinely un-knowable path.
- **Fix:** In the string-concat normalizer, track `prevWasNonLiteral`; if two non-literal `+ ... +` pieces are adjacent (no intervening string literal with a `/`), return `{ unparseable: true }` instead of `:X`. A single splice (`'/api/foo/' + id + '/bar'`) is still fine.
- **Files modified:** `backend/scripts/audit-satellite-buttons.mjs`
- **Commit:** `43f2875` (turion-satellite)

**4. [Decision recorded, not a code change] F4 auth/callback.html review — no fix needed**
- **Found during:** Task 2
- **Outcome:** All three conditions (Supabase exchange / redirect-to-`/satellite/` on success / readable error + redirect-to-`login.html` on a bad link) already hold. The plan says "If ALL three already hold → no code change; record the finding in the SUMMARY." Done. No `?next=` preservation added because `login.html` never carries such a param (nothing to preserve).

**5. [Rule 3 - Blocking, pre-existing tooling bug] `gsd-tools state add-decision` had bloated STATE.md to ~220k lines**
- **Found during:** state-update step (after `node gsd-tools.cjs state add-decision --phase 29 ...`)
- **Issue:** Each `state add-decision` run re-appends the entire `## Accumulated Context` block (Roadmap Evolution + Decisions + Performance Metrics + …) to the end of `.planning/STATE.md`, doubling the file every time. STATE.md was already 110,656 lines at Plan 29-02's commit; the 29-01 `add-decision` call took it to 219,798 lines / ≈38 MB. (Also `state advance-plan` / `state update-progress` / `state record-session` all fail against this STATE.md because it's free-form narrative, not the structured format those commands expect — the Current Position was updated manually.)
- **Fix:** Truncated STATE.md back to lines 1–130 + a single copy of each block (the legit Current Position narrative + the new `[Phase 29]` decision entry preserved); file now 131 lines / ≈40 KB. Logged the gsd-tools bug to `.planning/phases/29-ui-workflow-e2e-uat-fixes/deferred-items.md` (NOT fixing the tooling itself — out of scope).
- **Files modified:** `.planning/STATE.md`, `.planning/phases/29-ui-workflow-e2e-uat-fixes/deferred-items.md` (created)
- **Commits:** `301e3496`, `bdbac932` (doordash-p2p)

### Auth Gates

None.

## Self-Check: PASSED

- `/Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs` — FOUND
- `/Users/jeet/turion-satellite/backend/tests/audit-satellite-buttons.test.ts` — FOUND
- `/Users/jeet/turion-space-demo/scripts/audit-satellite-buttons.mjs` — FOUND
- `/Users/jeet/turion-space-demo/satellite/parts.html` contains `getQueryParam` — FOUND
- `/Users/jeet/turion-space-demo/satellite/instance.html` contains `instance_index` — FOUND
- Commit `43f2875` (turion-satellite, Task 1) — FOUND
- Commit `6223725` (turion-space-demo, Task 2) — FOUND
- Commit `e687591` (turion-space-demo, Task 3) — FOUND
- Backend audit: `node scripts/audit-satellite-buttons.mjs` → `routes: 61`, `violations: 0`, exit 0 — VERIFIED
- Frontend audit: `node scripts/audit-satellite-buttons.mjs` → `violations: 0`, exit 0 — VERIFIED
- Vitest: `npx vitest run tests/audit-satellite-buttons.test.ts` → 1 passed — VERIFIED
- Full backend suite: 326 passed, 1 skipped (pre-existing), 0 regressions — VERIFIED
