---
phase: 27-last-mile-cad-coverage
plan: 02
subsystem: ui
tags: [svg, vanilla-js, accessibility, frontend, callouts, hotspots, bom]

# Dependency graph
requires:
  - phase: pre-existing turion-space-demo frontend (part.html CAD inject + Promise.all children fetch)
    provides: window.satelliteCad, satellite-api.js, /api/parts/:id/children?sat= endpoint
provides:
  - window.satelliteCad.renderCalloutsOnSvg(svgEl, children, satId) — radial callout overlay
  - .cad-toggle button visible only when children exist
  - .callouts-hidden class fades callouts via CSS opacity (no DOM re-render)
  - <a xlink:href + href> wrapper enables SVG 1.1 + SVG 2 click navigation
affects: [Phase 27-01 (generator), Phase 27-04 (migration 016 + 017), Phase 27-05 (deploy)]

# Tech tracking
tech-stack:
  added: []     # no new deps — pure vanilla JS/CSS additions
  patterns:
    - "Inject SVG markup via insertAdjacentHTML on existing <g> to inherit namespace"
    - "Dual xlink:href + href attribute for cross-spec SVG anchor compat"
    - "CSS-only show/hide via class on outer frame (no DOM re-render)"
    - "Greedy radial layout with 2-tier ring fallback when n > 8"
    - "Idempotent JS wiring guarded by dataset.wired"

key-files:
  created: []
  modified:
    - /Users/jeet/turion-space-demo/satellite/satellite-cad.js
    - /Users/jeet/turion-space-demo/satellite/satellite-shell.css
    - /Users/jeet/turion-space-demo/satellite/part.html

key-decisions:
  - "Append callouts to the injected silhouette inner <g> so they live in 60×60 viewBox coords (simpler than re-computing parent-svg coords)"
  - "Dual xlink:href + href on the <a> wrapper for SVG 1.1 + SVG 2 compatibility"
  - "Toggle button display:none by default; JS shows inline-block only when children.length > 0"
  - "2-tier ring (inner r=22, outer r=26) when n > 8 to mitigate label overlap"
  - "try/catch around renderCalloutsOnSvg so a bad child cannot blank the CAD frame"
  - "No localStorage persistence on toggle — default on, click-per-visit (KISS per research §Open Q3)"

patterns-established:
  - "Inject markup into existing SVG element via insertAdjacentHTML('beforeend', …) — inherits namespace"
  - "renderCalloutsOnSvg signature: (svgEl, children, satId) → void, idempotent + early-return"
  - "CSS scoping via .cad-frame.callouts-hidden .callouts so multiple frames could toggle independently"

requirements-completed: ["Hotspots", "FrontendOverlay"]

# Metrics
duration: 2.1min
completed: 2026-05-11
---

# Phase 27 Plan 02: Interactive BOM-Child Callout Overlay Summary

**Vanilla-JS overlay layer that paints clickable radial callouts onto every part.html CAD silhouette when the part has SAT-003 BOM children, with CSS-only show/hide toggle and full keyboard/screen-reader accessibility.**

## Performance

- **Duration:** 2.1 min
- **Started:** 2026-05-11T01:58:10Z
- **Completed:** 2026-05-11T02:00:19Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `window.satelliteCad.renderCalloutsOnSvg(svgEl, children, satId)` — emits one `<a class="callout-link">` per BOM child, each wrapping a leader line, anchor dot, background rect, and centred label, all inside a single `<g class="callouts">` group appended to the injected silhouette's inner `<g>`.
- Radial layout in the 60×60 viewBox: callouts on a ring at r=22 around the centroid (30, 30), leader anchors on the body at r=12, 2-tier ring (r=22/26) when `n > 8` to mitigate overlap. Angles distributed top-first then clockwise.
- 71 new lines of CSS in `satellite-shell.css` covering 6 callout selectors + `.cad-toggle` chip + `.callouts-hidden` fade rule + hover/keyboard-focus states.
- 32 new lines of HTML+JS in `part.html`: toggle button injected inside `.cad-frame`, render-call hooked into the existing Promise.all post-inject block, click handler flips `.callouts-hidden` + updates `aria-pressed` + button text.
- Click navigation works via SVG-native `<a xlink:href + href>` — no JS click handlers on the callouts themselves.
- Accessibility: `tabindex=0`, `role="link"`, `aria-label`, visible keyboard focus ring via CSS `stroke` on the background rect.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add renderCalloutsOnSvg to satellite-cad.js** — `279cc3a` (feat)
2. **Task 2: Add callout + toggle CSS to satellite-shell.css** — `700b7b3` (feat)
3. **Task 3: Wire renderCalloutsOnSvg + toggle into part.html** — `11c6988` (feat)

## Files Created/Modified

- `/Users/jeet/turion-space-demo/satellite/satellite-cad.js` — Added `renderCalloutsOnSvg(svgEl, children, satId)` inside the existing IIFE; extended the `window.satelliteCad` export object. +71 lines.
- `/Users/jeet/turion-space-demo/satellite/satellite-shell.css` — Appended Phase 27 section with `.cad-frame { position: relative }`, `.cad-toggle`, `.callouts`, `.cad-frame.callouts-hidden .callouts`, `.callout-link`, `.callout-bg`, `.callout-text`, `.leader-line`, `.leader-dot`. +71 lines.
- `/Users/jeet/turion-space-demo/satellite/part.html` — Toggle button markup inside `.cad-frame`; post-injection JS block that calls `renderCalloutsOnSvg` when children > 0, hides the button otherwise, then attaches the toggle click handler (guarded by `dataset.wired`). +32 lines.

## Decisions Made

- **Append to inner `<g>`, not the outer `<svg>`:** The injected silhouette wrapper at part.html:269-270 uses `<g transform="translate(-140,-140) scale(4.7)">` to place the 0-60 viewBox content. By inserting callouts into THAT group, the simple `cx=30, cy=30, r=22` math works directly with no need to convert to outer-svg pixel coordinates.
- **Dual `xlink:href` + `href` attributes:** SVG 2 (modern browsers) honours `href`; SVG 1.1 needs `xlink:href`. Emitting both costs nothing and survives any future namespace stripping in `satellite-render.js`.
- **`insertAdjacentHTML('beforeend', …)` over `createElementNS`:** Lets the inner `<a>`/`<line>`/`<rect>`/`<text>` elements inherit the parent SVG namespace automatically, with no per-tag `xmlns` plumbing. Equivalent in DOM result to `appendChild`, simpler in source.
- **Toggle hidden by default in CSS, shown by JS:** `.cad-toggle { display: none }` so parts without children never flash a useless button on first paint. JS sets `display: inline-block` only after a successful `renderCalloutsOnSvg` call.
- **No localStorage on toggle state:** Default ON, single click toggles per page-load. Research §Open-Q3 explicitly recommended KISS.
- **try/catch around `renderCalloutsOnSvg`:** Treats the callout layer as additive — a bad child object can warn to console but never break the CAD render. Matches research §Pitfall 4 ("Empty `/children` Response Breaks Callout Renderer").

## Deviations from Plan

None — plan executed exactly as written.

The plan correctly anticipated the existing `id="cadFrame"` on part.html line 76 (Region A's optional id-add was a no-op), and the existing Promise.all block at line 217 already destructured `children` and `satId` into scope — so the new code slotted in without refactoring.

## Issues Encountered

None.

The one item worth recording for future executors: `node -e` HTML balance check reports `svg-open: 7, svg-close: 2`, which looks alarming but is a **pre-existing** condition caused by JS template literals containing strings like `<svg viewBox="0 0 60 60">` (in the sub-parts gallery fallback at line ~732 and various inline-svg generator strings). Pre/post-edit counts are identical (7/2 → 7/2), proving no structural HTML was broken. The plan's verification step listed this as advisory, and matching counts is the correct pass criterion, not equal counts.

## User Setup Required

None — no external service configuration required. The frontend code is live-deployable but Plan 27-02 does NOT deploy. Wave 4 (Plan 27-05) is responsible for `deploy-frontend.sh`.

## Next Phase Readiness

- **Wave 1 parallel siblings (27-01):** Plan 27-01 generates parent-only SVGs; this overlay layer is now ready to paint callouts on top of whatever drawings 27-01 emits.
- **Wave 2/3 (27-03, 27-04):** SQL migration 016 (new drawings) + migration 017 (cross-system FK linkage) will populate the `/api/parts/:id/children` payloads the overlay consumes. No frontend code change needed between Wave 1 and Wave 4.
- **Wave 4 (27-05):** `bash /Users/jeet/turion-space-demo/deploy-frontend.sh` will publish the modified `satellite-cad.js`, `satellite-shell.css`, and `part.html` to S3 + invalidate CloudFront. After deploy: open `https://turionspace.zietra.com/satellite/part.html?id=<EPS-PCDU-uuid>&sat=<SAT-003-uuid>` and confirm 7 PCDU child callouts render radially with clickable navigation and the labels-on/off toggle.
- **Open follow-up (not blocking):** Visual QA on parts with >8 children will reveal whether the 2-tier ring is sufficient or whether Phase 28 needs a smarter placement algorithm. Research §Open-Q2 flagged this; max children per SAT-003 parent is unknown until 27-04 lands migration 017.

---
*Phase: 27-last-mile-cad-coverage*
*Plan: 02*
*Completed: 2026-05-11*

## Self-Check: PASSED

Verified 2026-05-11T02:00:19Z:
- FOUND: /Users/jeet/doordash-p2p/.planning/phases/27-last-mile-cad-coverage-.../27-02-SUMMARY.md
- FOUND: /Users/jeet/turion-space-demo/satellite/satellite-cad.js
- FOUND: /Users/jeet/turion-space-demo/satellite/satellite-shell.css
- FOUND: /Users/jeet/turion-space-demo/satellite/part.html
- FOUND commit 279cc3a (Task 1: satellite-cad.js)
- FOUND commit 700b7b3 (Task 2: satellite-shell.css)
- FOUND commit 11c6988 (Task 3: part.html)
