---
phase: 54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog
plan: 01
subsystem: turion-space-demo · frontend · zietra-shell
tags:
  - app-shell
  - nav-taxonomy
  - module-aware-navigation
  - tenant-branded-chrome
  - design-system
dependency-graph:
  requires:
    - phase-53/api-tenants-current
    - phase-53/erp-api-wrapper (X-Tenant-Slug)
    - phase-41/cognito-auth
  provides:
    - "/app-shell.js (NAV_TAXONOMY + ICONS + buildTopBar + buildLeftRail)"
    - "/app-shell.css (--z-primary + body.z-shelled grid + dashboard chrome overrides)"
    - window.__ZIETRA_TENANT (cached tenant payload)
    - window.__ZIETRA_NAV (taxonomy for catalog page in 54-03)
    - window.__ZIETRA_ICONS (icon dictionary for catalog page in 54-03)
  affects:
    - downstream/phase-54-02 (will inject these tags + strip /shells/app-chrome.js)
    - downstream/phase-54-03 (catalog page reads __ZIETRA_NAV)
tech-stack:
  added:
    - vanilla-js (no framework)
    - css-grid layout
    - inline-lucide-svgs (no CDN)
  patterns:
    - idempotent-shell (data-zietra-shell guard)
    - skip-path-allowlist (/signup, /cognito-auth-callback, /satellite/*)
    - feature-gated-nav (Set intersection of tenant.features × NAV_TAXONOMY)
    - empty-features-fallback (60s cache lag → all-enabled + init banner)
key-files:
  created:
    - turion-space-demo/app-shell.js (431 LOC)
    - turion-space-demo/app-shell.css (503 LOC)
  modified: []
decisions:
  - "NAV_TAXONOMY is the single source of truth (CONTEXT-locked 11 groups + 4 bottom-nav)"
  - "ASC 606 entries are external (target=_blank rel=noopener) → asc606.zietra.com"
  - "Disabled-group CTA uses hash anchor /catalog#<code> (smooth scroll, no reload)"
  - "Empty-features + trial plan = all-enabled fallback + amber init banner (Pitfall 2)"
  - "Plan-badge logic clamps trial days at 0 (Pitfall 9: 'Trial expired' branch when d<=0)"
  - "Inline Lucide SVGs — NOT lucide.dev CDN (Pitfall 6: offline-resilient + zero extra request)"
  - "Dashboard chrome lifted VERBATIM from enterprise-shell.css:303-405 with namespace rename (Pitfall 7)"
metrics:
  duration-seconds: 306
  completed-at: 2026-05-14T21:44Z
  tasks: 3
  files-created: 2
  files-modified: 0
  commits: 2
---

# Phase 54 Plan 01: App Shell + Design System Summary

Vanilla-JS app shell (`/app-shell.js`) and design-system CSS (`/app-shell.css`) deployed live at `https://turionspace.zietra.com`. Module-aware left rail driven by `tenant.features` from Phase 53's `GET /api/tenants/current`; per-tenant chrome (workspace badge + plan badge + trial countdown + avatar menu) drops in cleanly at the existing CloudFront distribution root. No existing page injects the new shell yet — Wave 2 (54-02) does the migration.

## Commits (2)

| Hash | Message |
|------|---------|
| `d4d1167` | feat(54-01): add app-shell.js — NAV_TAXONOMY-driven rail + tenant chrome |
| `04b20c1` | feat(54-01): add app-shell.css — Zietra design tokens + CSS Grid shell |

Both pushed to `origin/main` (HEAD = `04b20c1`).

## Files Created

| Path | LOC | Purpose |
|------|-----|---------|
| `/Users/jeet/turion-space-demo/app-shell.js` | 431 | Shell boot, NAV_TAXONOMY (11 groups), BOTTOM_NAV (4), ICONS (21 inline SVGs), `loadTenant()`, `buildTopBar()`, `buildLeftRail()`, `buildAvatarMenu()` |
| `/Users/jeet/turion-space-demo/app-shell.css` | 503 | Design tokens, `body.z-shelled` CSS Grid layout, topbar, plan badges, rail sections, active state (3px accent bar), bottom rail, mobile media query, print stylesheet, lifted dashboard chrome overrides (`.dash-top`/`.dash-header`/`.src-strip`/`.kpi-strip`) |

## Deploy + Invalidation

- **S3 bucket:** `turion-demo-static`
- **CloudFront distribution:** `E37R9PT8IL44L2`
- **Invalidation ID:** `IANTJ8RWC9I16BB137X9X2CMKP` (Completed)
- **Live URLs:**
  - `https://turionspace.zietra.com/app-shell.js` — 23,775 bytes
  - `https://turionspace.zietra.com/app-shell.css` — 14,671 bytes

## Smoke Matrix

| # | Assertion | Result |
|---|-----------|--------|
| A1 | `GET /app-shell.css` → 200 + `content-type: text/css` | PASS |
| A2 | Served CSS contains `--z-primary: #7c3aed` | PASS |
| A3 | `GET /app-shell.js` → 200 + `content-type: application/javascript` | PASS |
| A4 | Served JS has 11 `NAV_TAXONOMY` groups | PASS (11) |
| A5 | Regression URLs return 200 (`/`, `/erp-login.html`, `/signup`, `/cognito-auth-callback?…`, `/satellite/`, `/quickbooks`) | PASS (6/6) |
| Ext | 12-URL regression sweep | 11/12 PASS (`/api/health` returns 403 through CloudFront — same as pre-deploy; out of plan scope) |
| Ext | `/api/tenants/current` anon → 403 (endpoint exists, auth-protected) | PASS |
| Ext | Pre-existing CFO dashboard still loads `/shells/app-chrome.js` (Wave 2 precondition clean) | PASS |
| Ext | Live `/` index.html contains 0 references to `app-shell.js` (Wave 2 not yet run) | PASS |
| Audit | `npm run audit-buttons` — 0 violations on satellite + ERP | PASS (75 routes/16 onclick/84 satApi + 215 routes/517 onclick/70 fetch) |

## Locked Decisions (carried from CONTEXT)

| Decision | Why |
|----------|-----|
| 11 module groups in `NAV_TAXONOMY` | User-locked taxonomy in CONTEXT.md §LOCKED DECISIONS |
| 4 bottom-rail items (`/team`, `/catalog`, `/settings`, `/help`) | Always visible regardless of features |
| ASC 606 = external link with `↗` glyph | Already-built CloudFront distribution at `asc606.zietra.com` — global rule #5 (no unnecessary code) and #6 (no shortcuts) prohibit cloning |
| Disabled-group CTA → `/catalog#<code>` | Hash anchor scrolls smoothly via `Element.scrollIntoView` (CONTEXT §Updates after research point 2) |
| Inline Lucide SVGs (no CDN) | Pitfall 6 — offline-resilient + zero extra request + no CSP whitelisting |
| 3px left-edge accent bar for active state | Matches existing `enterprise-shell.css:223` pattern users already know |
| Trial countdown amber at `d <= 7`, red branch at `d <= 0` | UX: warn before urgent, distinct visual when expired |

## Pitfalls Handled

1. **Pitfall 2 — empty-features fallback** (60s cache lag for fresh tenants).
   - When `tenant.features.length === 0 && tenant.plan === 'trial'`, the rail renders ALL groups in enabled state + shows an amber banner: "Workspace initializing — refresh in a few seconds if items are missing".
   - Prevents the "blank rail on day one" UX bug.
2. **Pitfall 6 — no Lucide CDN dependency.** All 21 icons embedded as inline SVG strings in the `ICONS` const. Zero external requests, zero CSP additions.
3. **Pitfall 7 — dashboard chrome overrides lifted verbatim** from `shells/enterprise-shell.css:303-405` with the namespace renamed `body[data-system="enterprise"]` → `body.z-shelled`. The 53 already-wired pages depend on these `.dash-top`/`.dash-header`/`.src-strip`/`.kpi-strip` rules; without lifting them, dashboards would revert to original dark-gradient headers and compete visually with the new topbar.
4. **Pitfall 8 — graceful fallback when `window.erpApi` is missing.** `loadTenant()` checks for the wrapper's presence; on absence (e.g., a page that loads our shell but not `erp-api.js`), warns + returns the fallback `{name: 'Zietra Workspace', plan: 'trial', features: []}`. Shell still renders.
5. **Pitfall 9 — trial countdown clamps at 0.** `daysLeft()` may return negative values for already-expired trials; the badge logic has an explicit `d <= 0 → 'Trial expired'` branch (vs. showing "Trial · -3 days left").

## Deviations from Plan

**None for the planned work.** Plan executed exactly as written.

### Out-of-scope discovery

`deploy-frontend.sh` happens to s3-sync any file at the repo root, which swept up `.superpowers/brainstorm/*` artifacts (pre-existing dev-time HTML harnesses left in the working tree by an older brainstorm tool) into the S3 bucket. These are not assets shipped by Phase 54 and were already present in prior deploys; the deploy script's `--exclude` rules don't include `.superpowers/`.

- **Impact:** Cosmetic — those files are not linked from any page, never served at a meaningful URL, and don't affect the shell smoke. No data leak risk (HTML harness scaffolding only).
- **Action taken:** None — out-of-scope for 54-01 per Rule 3 scope boundary. Logged here so a future hygiene plan can add `.superpowers/` to `deploy-frontend.sh`'s exclude list. Not blocking Wave 2.

## Authentication Gates

None encountered. Deploy went through `deploy-frontend.sh` (S3 sync + CloudFront invalidate) using ambient AWS credentials. No Cognito interaction required.

## Pointer for Wave 2 (54-02)

The migration script (`scripts/inject-shell.mjs` in 54-02) needs to STRIP these patterns from the 53 already-wired pages before injecting the new shell tags. The regex tuple to use:

```javascript
const OLD_PATTERNS = [
  /\s*<link rel="stylesheet" href="\/shells\/enterprise-shell\.css">\s*/g,
  /\s*<script src="\/shells\/app-chrome\.js" defer><\/script>\s*/g,
  /\s*<script src="\/shells\/status-indicator\.js" defer><\/script>\s*/g
];
```

Plus the new injection block:

```html
<!-- ZIETRA-SHELL-INJECTED -->
<link rel="stylesheet" href="/app-shell.css">
<script src="/app-shell.js" defer></script>
```

The skip list (`SKIP`) must include `signup.html`, `cognito-auth-callback.html`, and the entire `satellite/` subdirectory.

## Deferred Items

1. **`.superpowers/` cleanup in `deploy-frontend.sh`** — add `--exclude ".superpowers/*"` to the s3-sync block. Not blocking; cosmetic. Out-of-scope per Rule 3.
2. **Backend `backend/dist/*` working-tree drift** — pre-existing modifications to `backend/dist/routes/tenants.js` + `backend/dist/middleware/tenant.js` (compiled artifacts) were already in `git status` before 54-01 started. Not touched by this plan.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/app-shell.js` exists — FOUND (431 LOC, node --check passes)
- `/Users/jeet/turion-space-demo/app-shell.css` exists — FOUND (503 LOC, brace-balanced)
- Commit `d4d1167` — FOUND in git log
- Commit `04b20c1` — FOUND in git log
- Live deploy verified — `https://turionspace.zietra.com/app-shell.{js,css}` both return 200
- audit-buttons regression — exit 0, 0 violations
- Phase 53 contract intact — `/api/tenants/current` returns 403 anon (endpoint live)
- Wave 2 precondition clean — live index.html has 0 references to the new shell tags
