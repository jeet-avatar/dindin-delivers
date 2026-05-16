---
phase: 58-m7-marketing-site-completion
plan: 04
subsystem: ui
tags: [marketing, docs, security, helmet, og, sitemap, smoke, checkpoint, phase-closure]

# Dependency graph
requires:
  - phase: 58-01
    provides: scripts/gen-sitemap.mjs STATIC_ROUTES + NavBar/SiteFooter shipping with /docs link + NotFoundPage popular-pages baseline + CloudFront SPA fallback
  - phase: 58-02
    provides: src/data/modules.ts MODULES (DocsLandingPage iterates over these for 13 quick-start cards) + ModulePage parametrized route (/modules/<slug> targets for "Learn more →")
  - phase: 58-03
    provides: src/data/case-studies.mjs slug list (gen-sitemap.mjs reads it) + working /case-studies routes (cross-linked from /docs and NotFoundPage popular pages)
provides:
  - /docs — landing page with 13 module quick-start cards
  - /security — Aurora-RLS + SOC2-in-progress trust page (per RESEARCH Open Question 2)
  - src/components/PageHelmet.tsx — DRY canonical + OG wrapper (provided; not retrofitted)
  - public/og/default.png — 1200×630 brand OG image (47 KB)
  - NotFoundPage polish — "Why are you seeing this?" + back-to-home CTA
  - Sitemap grew 25 → 26 URLs (+ /security; /docs was already in 58-01 STATIC_ROUTES as a stub)
  - CHECKPOINT.md — Phase 58 closure handoff for M8 with 3 hand-off prompts
  - ROADMAP.md — Phase 58 marked CLOSED; M7 row updated; last-updated footer rewritten
affects: [Phase 58 closed (M7 milestone), M8 (Phase 59) recommended as next, deferred-items.md inherited]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-page Helmet with title + description + og:* + canonical (used in DocsLandingPage + SecurityPage; PageHelmet wrapper provided for M8 retrofit across remaining 23 pages)"
    - "ImageMagick `magick -density 96 ... -resize 1200x630` for 47-KB OG PNG generation from inline SVG template (no Node sharp dep added)"
    - "Cross-cutting smoke matrix as bash for-loop (run function abstracts curl + count); 31 frontend assertions + 3 backend regression + 1 cross-origin audit"
  removed: []

key-files:
  created:
    - /Users/jeet/zietra/marketing/src/pages/DocsLandingPage.tsx
    - /Users/jeet/zietra/marketing/src/pages/SecurityPage.tsx
    - /Users/jeet/zietra/marketing/src/components/PageHelmet.tsx
    - /Users/jeet/zietra/marketing/public/og/default.png
    - /Users/jeet/doordash-p2p/.planning/phases/58-m7-marketing-site-completion/CHECKPOINT.md
  modified:
    - /Users/jeet/zietra/marketing/src/pages/NotFoundPage.tsx
    - /Users/jeet/zietra/marketing/src/App.tsx
    - /Users/jeet/zietra/marketing/scripts/gen-sitemap.mjs
    - /Users/jeet/zietra/marketing/public/sitemap.xml
    - /Users/jeet/doordash-p2p/.planning/ROADMAP.md

key-decisions:
  - "Used ImageMagick (`magick -density 96 -resize 1200x630`) over sharp/Node — ImageMagick is already installed at /opt/homebrew/bin/magick, sharp would add a build-time dep with native bindings. Generated 47-KB PNG from inline SVG template with Zietra brand purple gradient (#7c3aed → #4c1d95) + amber bottom strip."
  - "Sitemap settled at 26 URLs, not 30 as the plan expected. Plan math over-counted Wave-3 baseline (25 was correct, not 28). Real progression: 9 → 22 → 25 → 26. /docs was already in 58-01 STATIC_ROUTES from the original stub before 58-04 made it real."
  - "PageHelmet shipped but NOT retrofitted to existing pages — that would touch every page in Phase 58-04, expanding scope. Retrofit is M8 work and clearly documented in CHECKPOINT."
  - "Per-page <Helmet> canonical/OG renders client-side only (SPA Vite limitation). Google + Bing render JS, so they see correct metadata. LinkedIn / Twitter / iMessage previews fall back to the /og/default.png from dist/index.html shell. Default OG covers the no-JS case. M8 decision deferred between (a) Astro SSR migration vs (b) Lambda@Edge OG-injector."
  - "Aurora is private VPC — local psql can't clean up the regression test row (jeetnair.in+58-04-regression@gmail.com). Documented as a deferred ops cleanup item; doesn't block closure."

requirements-completed:
  - DocsLandingPage
  - SeoBaseline404SitemapRobots

# Metrics
duration: 22 min
completed: 2026-05-15
---

# Phase 58 Plan 04: m7-marketing-site-completion Wave 4 Summary

**Shipped /docs landing page with 13 per-module quick-start cards, /security trust page (per RESEARCH Open Question 2 — bonus deliverable), PageHelmet DRY wrapper for M8 retrofit, NotFoundPage polish (explainer + back-to-home CTA), 1200×630 default OG image, full 31/31 cross-cutting smoke matrix + 3/3 backend regression + 1/1 cross-origin link audit (all pass), and CHECKPOINT.md handing off to Phase 59 (M8 compliance + observability). 4 atomic marketing commits + Phase 58 ROADMAP closure. Phase 58 CLOSED — all 10 requirements addressed.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-16T04:16:50Z
- **Completed:** 2026-05-16T04:38:53Z
- **Tasks:** 2 (autonomous)
- **Files created:** 5 (4 in marketing repo + 1 in planning repo)
- **Files modified:** 5 (4 in marketing repo + 1 in planning repo)
- **Commits:** 4 atomic marketing commits (per-task) + further docs commit in planning repo

## Accomplishments

### Marketing (zietra)

- **DocsLandingPage.tsx** (167 LOC) — /docs route with hero, grid of 13 module quick-start cards (3 hand-authored steps per module), "Learn more →" deep-links to /modules/<slug>, footer note pointing to support@ for module deep-dives until M8 ships the full docs portal. Helmet has title + description + og:image + canonical.

- **SecurityPage.tsx** (96 LOC) — /security route addressing RESEARCH Open Question 2 (trust page). Sections: Trust model (Aurora RLS, 152 tables × 4 schemas, 459 CI isolation tests), Compliance (SOC2 in progress Q1 2027, GDPR/CCPA via /privacy, no HIPAA/PCI/FedRAMP today), Vulnerability reporting (security@zietra.com), Stack list (Aurora, Cognito, SES, CloudFront, Lambda, Secrets Manager). Bonus deliverable not strictly required by ROADMAP but recommended by RESEARCH.

- **PageHelmet.tsx** (30 LOC) — DRY Helmet wrapper. Accepts `{title, description, path, ogImage?}`. Auto-suffixes title with " · Zietra" unless already suffixed. Computes canonical from `https://zietra.com${path}`. Defaults og:image to /og/default.png. Renders all 7 meta tags (title, description, og:title, og:description, og:image, og:url, og:type=website, canonical) in one block.

- **NotFoundPage.tsx polish** — Added "Why are you seeing this?" section (above existing popular-pages list) with explainer text, and a prominent CTA button at the bottom ("← Back to home", styled like primary CTAs in brand purple). Retained `<meta name="robots" content="noindex">`.

- **public/og/default.png** (47 KB, 1200×630) — Generated via ImageMagick from inline SVG. Zietra brand purple gradient (#7c3aed → #4c1d95) background, "Zietra" headline, "13 Fortune-500 ERP modules" subhead, module list pill row, "$99/mo · zietra.com" CTA, amber bottom strip. Used as og:image fallback in DocsLandingPage + SecurityPage Helmets.

- **App.tsx** — 2 new lazy routes: `/docs` → DocsLandingPage, `/security` → SecurityPage. Both wrapped in existing Suspense.

- **scripts/gen-sitemap.mjs** — STATIC_ROUTES gains `/security` (priority 0.5, changefreq yearly). `/docs` was already there from 58-01 (stub previously, real now). Sitemap regenerated to 26 URLs.

- **Build + deploy** — `npm run build` (sync-modules + gen-sitemap + tsc + vite) → clean 0-error build, 5.58 KB DocsLandingPage chunk, 4.27 KB SecurityPage chunk. `./deploy.sh` → S3 sync + CF invalidation IBIAEX7PJISGCRAA4BYEFDEXO8 (Completed). Follow-up invalidation ICR6V41SA5IZ8877CICB8G82D2 for /sitemap.xml + /og/default.png + /robots.txt + /llms.txt (Completed).

### Planning (doordash-p2p)

- **CHECKPOINT.md** (~230 LOC) — Phase 58 closure handoff. Sections: What shipped (4 plans), Smoke results (35/35 PASS), Deferred items (15 entries with WHY-deferred + WHEN-to-do), Next milestone (M8 RECOMMENDED + M4 + polish + satellite cleanup options), 3 hand-off prompts (copy-paste for next session), Closure evidence (10/10 requirements with file:line refs), Deferred-items inherited from 58-03 (SES-VPC issue), Resources (S3 / CF / Lambda / DB / SES), Files M8 will touch, Open questions for M8 planner (5).

- **ROADMAP.md** — Phase 58 entry: Plans line updated to "4/4 plans executed", all 4 plan checkboxes marked `[x]`, **Status: CLOSED 2026-05-15** line added with all 10 requirements enumerated + 3 hand-off options listed + CHECKPOINT.md reference. Deferred milestones table M7 row updated to "COMPLETE 2026-05-15 — 26-URL surface live + contact backend; CHECKPOINT.md → /gsd:plan-phase 59 for M8". Last-updated footer rewritten with full Phase 58 closure narrative.

## Task Commits

**Marketing (zietra) — 4 atomic commits:**
1. `e379538` `feat(58-04): DocsLandingPage.tsx — /docs with 13 module quick-start cards`
2. `1446d73` `feat(58-04): SecurityPage.tsx + PageHelmet.tsx — /security trust page + DRY Helmet wrapper for M8 retrofit`
3. `1a7855a` `feat(58-04): NotFoundPage polish + default OG image + 2 new routes + sitemap = 26 URLs`
4. `160ab59` `chore(58-04): deploy Wave 4 — /docs + /security live, OG image baseline`

All 4 use `user.email='jm@techcloudpro.com', user.name='jeet-avatar'` per MEMORY rule.

**Planning (doordash-p2p):** SUMMARY + CHECKPOINT + ROADMAP final closure commit comes after this Summary writes (handled by gsd-tools `commit` in final wrap-up).

## Files Created / Modified

**Created (5):**
- `/Users/jeet/zietra/marketing/src/pages/DocsLandingPage.tsx` (167 LOC)
- `/Users/jeet/zietra/marketing/src/pages/SecurityPage.tsx` (96 LOC)
- `/Users/jeet/zietra/marketing/src/components/PageHelmet.tsx` (30 LOC)
- `/Users/jeet/zietra/marketing/public/og/default.png` (47 KB binary)
- `/Users/jeet/doordash-p2p/.planning/phases/58-m7-marketing-site-completion/CHECKPOINT.md` (~230 LOC)

**Modified (5):**
- `/Users/jeet/zietra/marketing/src/pages/NotFoundPage.tsx` (+ Why are you here? section + back-to-home CTA; ~30 LOC added)
- `/Users/jeet/zietra/marketing/src/App.tsx` (+2 lazy imports + 2 Route entries)
- `/Users/jeet/zietra/marketing/scripts/gen-sitemap.mjs` (+1 STATIC_ROUTES entry for /security)
- `/Users/jeet/zietra/marketing/public/sitemap.xml` (regenerated: 25 → 26 URLs)
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` (Phase 58 marked CLOSED + M7 deferred-table row updated + footer rewritten)

## Decisions Made

1. **ImageMagick for OG generation, not sharp.** Already installed; sharp would add a native build-time dep. Generated 47-KB 1200×630 PNG from inline SVG with Zietra brand purple gradient. Target was <100 KB; achieved 47 KB.
2. **Sitemap = 26 URLs (not 30 as plan expected).** Plan math over-counted Wave-3 baseline. Real progression: 9 → 22 → 25 → 26. `/docs` was already in 58-01 STATIC_ROUTES as a stub; this wave made it real. The +1 to 26 is `/security`.
3. **PageHelmet shipped but NOT retrofitted.** Adding it to all 25 pages would expand scope unnecessarily; retrofit is clearly logged as M8 work in CHECKPOINT.
4. **/security bonus deliverable.** RESEARCH Open Question 2 recommended it; the plan included it; shipped. Closes a credibility gap for SOC2-curious prospects without expanding Phase 58 scope materially.
5. **Per-page Helmet content renders client-side only.** SPA limitation. Google + Bing render JS so they see correct metadata. LinkedIn / Twitter previews fall back to default OG from dist/index.html shell. Default OG covers no-JS case. M8 will decide Astro vs Lambda@Edge OG-injector.
6. **Smoke matrix 35 assertions, not 30+.** Comprises 26 frontend HTTP 200s + /not-a-real-page + /llms.txt + /og/default.png + sitemap URL count + robots.txt Sitemap line + 3 backend regression cases (valid POST 200, wrong-origin 403, honeypot 200-silent) + cross-origin audit (src/ + dist/). All PASS.

## Deviations from Plan

### Auto-fixed Issues

None. All Rule-1/2/3 conditions held — no inline bugs, no missing critical functionality, no blockers.

### Plan over-counts

**Sitemap "30" expected.** Plan called for ≥30 URLs after this wave (28 baseline + /docs + /security). Real baseline was 25, and `/docs` was already counted from 58-01's stub, so actual result is 26 (25 + 1). Documented in commit `1a7855a` and CHECKPOINT.

**No code change needed.** This is plan math, not a code gap.

### Aurora cleanup not run

The contact form regression smoke inserted 1 row (`jeetnair.in+58-04-regression@gmail.com`). Plan recipe assumed local psql works, but Aurora is in private VPC (per 58-03 finding). Documented as a deferred ops cleanup item in CHECKPOINT; not blocking closure.

## Issues Encountered

- **First smoke iteration had bash word-splitting bug** — `for s in $SLUGS` collapsed the 13 module slugs into one path string `/modules/crm sales purchase ...`. Rewrote with `run()` helper function and explicit space-separated literals. Second iteration: 31/31 PASS.

- **PNG recompression with `-quality 90` blew up file size** to 835 KB (PNG quality semantics differ from JPEG). Re-generated fresh at `-density 96` (lower DPI) → 47 KB. Lesson: don't post-process PNGs with quality flags; control output size with density at generation time.

- **No build regressions.** Vite build clean (0 errors). All Phase 58-01/02/03 chunks intact. Sitemap regenerates to 26 URLs.

## Authentication Gates

None. Used existing AWS CLI credentials for account 134607809447. S3 + CloudFront + APIGW + Aurora all accessible via the standard credential chain. SES identities already verified (parent zietra.com domain DKIM cascade per 58-03).

## User Setup Required

**None for Phase 58 closure.** Marketing site is live; contact form persists DB rows reliably; sitemap registered with /robots.txt; OG default ships.

**For complete OG delivery to social previews** (M8 task per CHECKPOINT):
- Astro migration for SSR, OR
- Lambda@Edge OG-injector that rewrites `<head>` per route at the CDN edge

**For SES email delivery from contact form** (M8 task per CHECKPOINT — inherited from 58-03 deferred-items.md):
- NAT gateway on vpc-012ab4500dcd4ee41 (~$32/mo), OR
- SES VPCE (~$7/mo per AZ), OR
- Move turion-demo-api out of VPC

Until then: contact form DB persistence works 100%; SES is best-effort with 4s AbortController; support polls `SELECT * FROM public.contact_submissions WHERE processed_at IS NULL ORDER BY created_at` for new leads.

## Self-Check: PASSED

**Created files exist:**
- `/Users/jeet/zietra/marketing/src/pages/DocsLandingPage.tsx` — FOUND (167 LOC, contains "Quick start" + 13-entry QUICK_STARTS map)
- `/Users/jeet/zietra/marketing/src/pages/SecurityPage.tsx` — FOUND (96 LOC, contains "Row Level Security")
- `/Users/jeet/zietra/marketing/src/components/PageHelmet.tsx` — FOUND (30 LOC, contains "canonical")
- `/Users/jeet/zietra/marketing/public/og/default.png` — FOUND (1200×630 RGBA PNG, 47 KB)
- `/Users/jeet/doordash-p2p/.planning/phases/58-m7-marketing-site-completion/CHECKPOINT.md` — FOUND (~230 LOC, contains "M8" + "deferred" + 3 hand-off prompts)

**Modified files contain expected changes:**
- `marketing/src/pages/NotFoundPage.tsx` — contains "Why are you" string ✅
- `marketing/src/App.tsx` — contains `/docs` and `/security` route paths ✅
- `marketing/scripts/gen-sitemap.mjs` — contains `/security` STATIC_ROUTES entry ✅
- `marketing/public/sitemap.xml` — 26 `<loc>` entries, includes `https://zietra.com/security` and `https://zietra.com/docs` ✅
- `.planning/ROADMAP.md` — Phase 58 entry contains "CLOSED" line ✅

**Commits exist:**
- `e379538`, `1446d73`, `1a7855a`, `160ab59` — all 4 marketing commits present in `git log`

**Live smoke (verified on https://zietra.com):**
- 26 routes return 200 (10 static + 13 modules + 3 case studies)
- /not-a-real-page → 200 (SPA NotFoundPage hydrates)
- /llms.txt → 200
- /og/default.png → 200
- /sitemap.xml → 200 (26 `<loc>` entries)
- /robots.txt → 200 (1 Sitemap: line)

**Backend smoke (verified against https://lo254mvukl.execute-api.us-east-1.amazonaws.com):**
- Valid POST /api/contact → `{"ok":true,"id":"5992b523-..."}`
- Wrong-origin POST → 403
- Honeypot-filled POST → 200 silent `{"ok":true}`

**Cross-origin link audit:**
- `grep` for href/to="/{salesforce,netsuite,arena,mes,quality,royalty,agents,onboarding,catalog,team,settings,ramp,quickbooks}/" in src/ — 0 matches
- Same grep against dist/assets/*.js — 0 matches

**Build artifacts (dist/):**
- DocsLandingPage-B6yOkFZu.js — 5.58 KB
- SecurityPage-CtmvMvw3.js — 4.27 KB
- "Row Level Security" string present in SecurityPage chunk
- "Quick start" string present in DocsLandingPage chunk

**CloudFront invalidations:**
- `IBIAEX7PJISGCRAA4BYEFDEXO8` (default deploy paths) — Completed
- `ICR6V41SA5IZ8877CICB8G82D2` (sitemap.xml + og/default.png + robots.txt + llms.txt) — Completed

## Next Phase Readiness

**Phase 58 CLOSED.** All 4 plans executed, all 10 ROADMAP requirements addressed, CHECKPOINT.md handoff written.

**Recommended next milestone: M8 (Phase 59) — compliance + observability.**

Key reasons:
1. Marketing surface is complete (26 URLs, contact backend, 3 case studies, 13 module pages).
2. Next bottleneck is enterprise-readiness: SOC2 audit log + KMS at-rest + CloudWatch dashboards + per-tenant audit trail.
3. M8 also fixes the inherited 58-03 SES-VPC issue (NAT gateway OR SES VPCE) so the contact form actually delivers email.
4. PageHelmet retrofit + per-module OG image generation + Astro-vs-Lambda@Edge decision all fit M8 scope.

**Alternative: M4 (Stripe) resumption.** Can run in parallel with M8 if operator has Stripe API keys ready. Closes the billing loop; flips "Coming soon" tooltip on Base $99 tier to a real Checkout flow.

**No blockers for either path.**

---
*Phase: 58-m7-marketing-site-completion*
*Plan: 04*
*Completed: 2026-05-15*
*Phase 58 STATUS: CLOSED — 10/10 requirements addressed*
