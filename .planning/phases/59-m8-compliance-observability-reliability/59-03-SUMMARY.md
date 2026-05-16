---
phase: 59-m8-compliance-observability-reliability
plan: 03
subsystem: marketing-site-developer-surfaces
tags: [openapi, swagger-ui, react-helmet-async, satori, resvg, og-images, cloudfront, vite, seo]

requires:
  - phase: 58-m7-marketing-site-completion
    provides: PageHelmet wrapper component, /og/default.png baseline, react-helmet-async setup, deploy.sh + CloudFront pipeline
  - phase: 59-02
    provides: requirements gate (depends_on)
provides:
  - "Public /docs/api page with locally-bundled Swagger UI v5.32.6 (CSP-safe — NOT CDN)"
  - "Hand-curated OpenAPI 3.1 spec at /docs/openapi.yaml — 31 paths, 35 operations across 14 tags, 23 schemas"
  - "PageHelmet wrapper retrofitted across all 17 page components (16 + ApiDocsPage), zero direct react-helmet-async imports remain"
  - "PageHelmet gained optional noindex prop for redirect stubs (login/signup/dashboard) and 404"
  - "13 per-module + 3 per-case-study 1200×630 PNG OG images (brand-purple gradient, Inter Bold via Satori + resvg)"
  - "scripts/gen-og-images.mjs one-time generator (NOT prebuild hook — regenerate manually when MODULES/CASE_STUDIES content changes)"
  - "ModulePage + CaseStudyPage now reference per-slug OG via PageHelmet ogImage prop"
  - "Sitemap grew to 27 URLs (added /docs/api)"
affects: [59-04, m9-api-coverage, m9-ssr]

tech-stack:
  added:
    - swagger-ui-dist@5.32.6 (devDependency — assets only, not runtime)
    - satori@latest (devDependency)
    - "@resvg/resvg-js@latest (devDependency)"
    - js-yaml@latest (devDependency — for spec validation)
    - Inter-Bold.ttf v4.0 (font asset for Satori, SHA-256 0cb1bc13...0bc1)
  patterns:
    - "Locally-host third-party UI assets (Swagger UI) instead of CDN to keep CSP strict (RESEARCH Pitfall 6)"
    - "PageHelmet wrapper as single source of truth for per-page <title>/canonical/OG — no inline <Helmet> in pages"
    - "One-shot OG image generation script (not prebuild hook) to avoid expensive deterministic work on every build"
    - "Hand-curated OpenAPI spec (top 30 endpoints) — auto-generation deferred to M9"

key-files:
  created:
    - /Users/jeet/zietra/marketing/public/docs/openapi.yaml
    - /Users/jeet/zietra/marketing/public/swagger-ui/swagger-ui.css
    - /Users/jeet/zietra/marketing/public/swagger-ui/swagger-ui-bundle.js
    - /Users/jeet/zietra/marketing/public/swagger-ui/swagger-ui-standalone-preset.js
    - /Users/jeet/zietra/marketing/src/pages/ApiDocsPage.tsx
    - /Users/jeet/zietra/marketing/scripts/gen-og-images.mjs
    - /Users/jeet/zietra/marketing/scripts/fonts/Inter-Bold.ttf
    - /Users/jeet/zietra/marketing/public/og/modules/{13 module slugs}.png
    - /Users/jeet/zietra/marketing/public/og/case-studies/{3 case-study slugs}.png
  modified:
    - /Users/jeet/zietra/marketing/src/App.tsx (+ApiDocsPage lazy route)
    - /Users/jeet/zietra/marketing/src/components/PageHelmet.tsx (+noindex prop)
    - /Users/jeet/zietra/marketing/scripts/gen-sitemap.mjs (+/docs/api)
    - /Users/jeet/zietra/marketing/package.json (+devDependencies)
    - 16 page components in src/pages/ (PageHelmet retrofit)

key-decisions:
  - "ROADMAP scope correction: 25 → 16 page components (the 25 came from counting URLs; /modules/:slug × 13 and /case-studies/:slug × 3 are served by 2 components, not 16)"
  - "Hosted Swagger UI assets locally at public/swagger-ui/ instead of CDN (RESEARCH Pitfall 6: CSP strictness)"
  - "Extended PageHelmet with noindex prop instead of inline-Helmet exception for the 4 noindex pages (single source of truth; cleaner audit)"
  - "Hand-curated OpenAPI 3.1 spec for top 30 endpoints; auto-generation from backend ships with M9"
  - "Satori OG generator is a one-time script, NOT a prebuild hook (RESEARCH Anti-Pattern: don't auto-regenerate deterministic assets on every build)"
  - "Inter-Bold.ttf extracted from rsms/inter v4.0 zip release (HTML 404 page on the raw URL — extracted /tmp/inter.zip → extras/ttf/Inter-Bold.ttf, SHA-256 0cb1bc13...0bc1)"
  - "swagger-ui-dist installed as devDependency only — runtime loads via /swagger-ui/swagger-ui-bundle.js (no JS import; window.SwaggerUIBundle global)"

patterns-established:
  - "PageHelmet exclusivity audit: grep src/pages/*.tsx for 'from \\'react-helmet-async\\'' must return 0 (NotFoundPage exception removed — uses noindex prop instead)"
  - "OpenAPI spec served as static YAML at /docs/openapi.yaml; Swagger UI client-mounts via window.SwaggerUIBundle({url, dom_id, deepLinking, tryItOutEnabled})"
  - "Per-module/per-case-study OG image convention: /og/modules/<slug>.png and /og/case-studies/<slug>.png at 1200×630 brand-purple gradient"

requirements-completed:
  - ApiDocsLanding
  - PageHelmetRetrofit
  - PerModuleOgImages

duration: 13min
completed: 2026-05-16
---

# Phase 59 Plan 03: API docs, PageHelmet retrofit, per-module OG images

**Public /docs/api page with locally-bundled Swagger UI v5.32.6 + hand-curated OpenAPI 3.1 spec (31 paths, 35 operations) + PageHelmet retrofit across all 17 page components + 16 brand-purple 1200×630 OG PNGs generated via Satori**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-05-16T08:01:42Z
- **Completed:** 2026-05-16T08:14:37Z
- **Tasks:** 3 (auto)
- **Files modified:** 36 (20 new, 16 modified)

## Accomplishments
- `/docs/api` LIVE at https://zietra.com/docs/api with Swagger UI rendering 35 operations across 14 tags
- 16 OG PNGs LIVE at https://zietra.com/og/modules/<slug>.png and /og/case-studies/<slug>.png — all returning `content-type: image/png`
- Zero direct `react-helmet-async` imports remain in src/pages/ — all 17 page components use the PageHelmet wrapper exclusively
- Sitemap grew from 26 → 27 URLs (added /docs/api)
- 3 ROADMAP requirements closed: ApiDocsLanding, PageHelmetRetrofit, PerModuleOgImages

## Task Commits

Each task atomically committed in the marketing repo (`github.com/jeet-avatar/zietra` main):

1. **Task 1a: Hand-curated OpenAPI 3.1 spec** — `73b0db9` (feat) — 1178-line YAML at public/docs/openapi.yaml
2. **Task 1b: Swagger UI locally hosted + /docs/api page + route + sitemap** — `8f19a42` (feat) — 4 files in public/swagger-ui/ + ApiDocsPage.tsx + App.tsx + gen-sitemap.mjs
3. **Task 2: PageHelmet retrofit across 16 page components** — `b246b13` (feat) — 16 page file modifications + PageHelmet noindex prop
4. **Task 3: Satori OG generator + 16 PNGs** — `2e57561` (feat) — scripts/gen-og-images.mjs + scripts/fonts/Inter-Bold.ttf + 16 PNG assets

(No SUMMARY commit yet — handled by this file in /Users/jeet/doordash-p2p)

## Files Created/Modified

### Created (in /Users/jeet/zietra/marketing)
- `public/docs/openapi.yaml` — OpenAPI 3.1 spec, 31 paths, 35 operations, 23 schemas, 14 tags
- `public/swagger-ui/swagger-ui.css` (175K), `swagger-ui-bundle.js` (1.5M), `swagger-ui-standalone-preset.js` (246K)
- `src/pages/ApiDocsPage.tsx` (~95 LOC) — client-mounts Swagger UI
- `scripts/gen-og-images.mjs` (~140 LOC) — Satori + Resvg one-time generator
- `scripts/fonts/Inter-Bold.ttf` (405K) — SHA-256 `0cb1bc1335372d9e3a0cf6f5311c7cce87af90d2a777fdeec18be605a2a70bc1` (source: rsms/inter v4.0, extras/ttf/Inter-Bold.ttf)
- `public/og/modules/{crm,sales,purchase,items,plm,mes,quality,lean-erp-pro,asc606,royalty,dropship,ai-agents,qb-migration}.png` (13 × ~125-138 KB)
- `public/og/case-studies/{turion-space,marquee-anni,sample-saas-svc}.png` (3 × ~128-132 KB)

### Modified (in /Users/jeet/zietra/marketing)
- `src/App.tsx` — lazy ApiDocsPage import + `<Route path="/docs/api">`
- `src/components/PageHelmet.tsx` — added optional `noindex?: boolean` prop
- `scripts/gen-sitemap.mjs` — `/docs/api` added to STATIC_ROUTES (priority 0.6, monthly)
- `package.json` — devDependencies: swagger-ui-dist@5.32.6, satori, @resvg/resvg-js, js-yaml
- 16 page components retrofitted (delete `from 'react-helmet-async'` import + `<Helmet>` block → use `<PageHelmet>`):
  - HomePage, PricingPage (gained Helmet — previously had none), AboutPage, ContactPage, DocsLandingPage, SecurityPage, PrivacyPage, TermsPage, ModulesIndexPage, ModulePage (ogImage=/og/modules/${slug}.png), CaseStudiesIndexPage, CaseStudyPage (ogImage=/og/case-studies/${slug}.png), LoginPage (noindex), SignupPage (noindex), DashboardPage (noindex), NotFoundPage (noindex)

## Decisions Made

| Decision | Rationale |
|---|---|
| Host Swagger UI assets locally (NOT CDN) | RESEARCH Pitfall 6 — CSP strictness; CDN `unpkg.com` would force `script-src` relaxation |
| Hand-curate OpenAPI 3.1 spec for top 30 | Auto-generation requires backend OpenAPI plugin (M9 work); 30 endpoints is enough for buyers to evaluate today |
| Extend PageHelmet with `noindex` prop | Cleaner than inline `<Helmet>` exception in NotFoundPage; single source of truth; audit is `grep -L PageHelmet src/pages/*.tsx` returns 0 lines |
| Make Satori script one-shot (not prebuild) | RESEARCH Anti-Pattern — OG images are deterministic per slug+content; regenerating on every build is wasted CPU |
| Use `windowSwaggerUIBundle` global (not import) | swagger-ui-dist is too large to bundle (1.5MB); client-side script tag injection only loads it on /docs/api visit |
| ROADMAP scope correction 25 → 16 components | ROADMAP counted URLs, not components. /modules/:slug × 13 and /case-studies/:slug × 3 are served by 2 dynamic components; total components retrofitted = 16 (+ ApiDocsPage = 17 with PageHelmet) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inter-Bold.ttf raw GitHub URL returned HTML 404 page, not TTF**
- **Found during:** Task 3 (Satori dependency setup)
- **Issue:** `curl https://github.com/rsms/inter/raw/v4.0/docs/font-files/Inter-Bold.ttf` returned an HTML 404 page (299KB), confirmed by `file` reporting "HTML document text"
- **Fix:** Downloaded the official `Inter-4.0.zip` release (27MB) and extracted `extras/ttf/Inter-Bold.ttf` (405KB, real TrueType, verified by `file` output)
- **Files modified:** scripts/fonts/Inter-Bold.ttf (correct file replaced wrong one)
- **Verification:** `file scripts/fonts/Inter-Bold.ttf` reports "TrueType Font data, 17 tables, …"; SHA-256 `0cb1bc1335372d9e3a0cf6f5311c7cce87af90d2a777fdeec18be605a2a70bc1` documented above
- **Committed in:** 2e57561 (Task 3 commit)

**2. [Rule 3 - Blocking] CloudFront invalidation only covered `/` and `/index.html` — new OG/docs/swagger-ui paths needed a second invalidation**
- **Found during:** Task 3 deploy
- **Issue:** `deploy.sh` invalidates only `/ /index.html`; new asset paths (`/og/*`, `/docs/*`, `/swagger-ui/*`, `/sitemap.xml`) would be missed
- **Fix:** Ran a manual second invalidation `aws cloudfront create-invalidation … --paths "/og/*" "/docs/*" "/swagger-ui/*" "/sitemap.xml"` (ID `I5JHVTL20174PV6H0XY58JB4OE`), waited for Completed
- **Files modified:** None (operational fix; future improvement could be patching deploy.sh)
- **Verification:** All 16 OG PNGs + /docs/api + /docs/openapi.yaml + /swagger-ui/swagger-ui-bundle.js return 200 via HTTPS
- **Committed in:** N/A (deploy operation, not a code change)

**3. [Rule 1 - Bug] Plan stated "Expected: 31 URLs" for sitemap, actual is 27**
- **Found during:** Task 1 sitemap regen
- **Issue:** Plan arithmetic: 10 existing static + /docs/api = 11 static + 13 modules + 3 case studies = 27 (not 31)
- **Fix:** No code fix needed — the 27-URL outcome is correct. Documented here for SUMMARY accuracy.
- **Verification:** `curl -s https://zietra.com/sitemap.xml | grep -c "<loc>"` → 27
- **Committed in:** N/A (no code fix needed)

---

**Total deviations:** 3 (1 blocking dependency fix, 1 operational deploy fix, 1 plan-arithmetic correction)
**Impact on plan:** All 3 deviations resolved without scope changes. ROADMAP scope correction (25 → 16 components) was already planned for the SUMMARY per Task 2 instructions.

## Issues Encountered

None during planned work itself — all 3 deviations above were caught and auto-resolved within the relevant task.

## Smoke Test Results (post-deploy)

### /docs/api + OpenAPI
- `GET /docs/api` → 200
- `GET /docs/openapi.yaml` → 200, body starts with `openapi: 3.1.0`
- `GET /swagger-ui/swagger-ui-bundle.js` → 200
- OpenAPI spec contains 31 `/api/...` paths and 35 operations

### OG images (Pitfall 11 content-type verification)
All 16 PNGs return `200 image/png`:
```
modules:        crm sales purchase items plm mes quality lean-erp-pro asc606 royalty dropship ai-agents qb-migration
case-studies:   turion-space marquee-anni sample-saas-svc
```

### Sitemap
- 27 URLs (11 static + 13 modules + 3 case studies)
- `/docs/api` present in sitemap.xml

### All routes 200 (SPA — Pitfall 3 documented expectation)
```
/, /pricing, /privacy, /terms, /login, /signup, /not-a-real-page, /modules,
/modules/crm, /case-studies, /case-studies/turion-space, /about, /contact,
/docs, /docs/api, /security
```

### PageHelmet retrofit audit
17/17 page files use `PageHelmet`; 0 direct `react-helmet-async` imports; 0 inline `<Helmet>` blocks. Per-route `<title>` verification in `curl` source is INTENTIONALLY the SPA base title (RESEARCH Pitfall 3 — SPA hydration means the raw HTML has only the base index.html title; per-route titles render after JS execution). Authoritative check is the TSX source audit, which passes.

## User Setup Required

None — all changes deployed via CI-free `./deploy.sh` + CloudFront invalidation. No secrets rotated, no env vars added.

## Next Phase Readiness

- 3/4 plans of Phase 59 complete (59-04 still incomplete)
- ROADMAP requirements closed: ApiDocsLanding, PageHelmetRetrofit, PerModuleOgImages
- M9 candidates surfaced from this work: (a) auto-generate OpenAPI spec from backend (vs hand-curate top-30); (b) wire SSR / prerender so per-route `<title>` lands in initial HTML (currently SPA-only); (c) patch deploy.sh to invalidate `/og/*` + `/docs/*` paths automatically

## Self-Check: PASSED

- File existence verified:
  - FOUND: /Users/jeet/zietra/marketing/public/docs/openapi.yaml
  - FOUND: /Users/jeet/zietra/marketing/public/swagger-ui/swagger-ui-bundle.js
  - FOUND: /Users/jeet/zietra/marketing/src/pages/ApiDocsPage.tsx
  - FOUND: /Users/jeet/zietra/marketing/scripts/gen-og-images.mjs
  - FOUND: /Users/jeet/zietra/marketing/scripts/fonts/Inter-Bold.ttf
  - FOUND: 13 PNGs in public/og/modules/
  - FOUND: 3 PNGs in public/og/case-studies/
- Commits verified in `github.com/jeet-avatar/zietra` main:
  - FOUND: 73b0db9 (OpenAPI spec)
  - FOUND: 8f19a42 (Swagger UI + /docs/api page + route)
  - FOUND: b246b13 (PageHelmet retrofit)
  - FOUND: 2e57561 (Satori + 16 OG PNGs)
- Live HTTPS verified: /docs/api 200, /docs/openapi.yaml 200, all 16 OG PNGs 200 with image/png, all 16 routes 200

---
*Phase: 59-m8-compliance-observability-reliability*
*Completed: 2026-05-16*
