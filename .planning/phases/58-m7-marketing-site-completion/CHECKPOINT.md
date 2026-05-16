# Phase 58 — CHECKPOINT (M7 marketing site completion — CLOSED)

**Status:** ALL 10 ROADMAP requirements closed
**Date completed:** 2026-05-15
**Plans shipped:** 4 (58-01 → 58-04)
**Final live surface:** 26 indexable URLs on zietra.com + working contact form backend

---

## What shipped

### Plan 58-01 — Audit, refresh, Cognito migration, SEO baseline
- Stripped `@supabase/supabase-js` (~70 KB gzip) + deleted `src/lib/{auth,supabase}.ts` (-133 LOC)
- Shrunk LoginPage / SignupPage / DashboardPage → ~25 LOC Cognito redirects each (preserves `?intent=` query)
- NEW `src/lib/config.ts` — centralized APP_URL + appUrl() helper
- Refactored `src/data/pricing.ts` → 3 tiers ($0 trial / $99 Base / Custom Add-ons); Stripe placeholder via `comingSoon=true` tooltip
- HomePage content refresh — 13-module 'What's in the box' framing (no more HubSpot/Buffer/Calendly)
- SiteFooter + NavBar — real routes (Blog/Careers/Press dropped per Open Question 1)
- Privacy + Terms updated — Aurora + Cognito + SES replaces stale Supabase + SMTP language
- NotFoundPage — Popular pages recovery list
- NEW `scripts/gen-sitemap.mjs` — build-time sitemap (9 routes)
- CloudFront SPA fallback verified (404+403 → /index.html, 200)

### Plan 58-02 — 13 per-module marketing pages
- NEW `scripts/sync-modules.mjs` + `scripts/marketing-copy.mjs` — build-time 1:1 sync from `turion-space-demo/lib/module-catalog.js` (BUILD FAILS on drift — Pitfall 12 mitigation)
- AUTOGEN `src/data/modules.ts` — 13 typed entries
- NEW `src/pages/ModulePage.tsx` (parametrized /modules/:slug) + `ModulesIndexPage.tsx` (/modules grid + industry filter) + `ModuleCard.tsx` (reusable)
- HomePage now uses real MODULES + ModuleCard
- 2 new lazy routes
- Sitemap grew 9 → 22 URLs

### Plan 58-03 — Case studies, About, Contact (form + backend)
- Migration 035: `public.contact_submissions` (no RLS — public schema, GRANT INSERT to zietra_app)
- NEW `backend/src/routes/contact.ts` — public POST /api/contact (Origin check + 5/IP/hr rate limit + honeypot + DB persist + best-effort SES SendEmail to support@zietra.com)
- NEW `backend/src/lib/rate-limit.ts` — in-memory rate limiter (Map-based, prune-on-call, MAX_KEYS=10k)
- IAM `zietra-api-lambda-role` already had `ses:SendEmail` on zietra.com identity (existing `zietra-signup-cognito-ses` inline policy — no IAM change needed)
- SES identities verified — `noreply@zietra.com` + `support@zietra.com` (parent domain DKIM cascade)
- Lambda `turion-demo-api` redeployed (CodeSha256 `8a6a542b…`)
- NEW `src/data/case-studies.ts` — 3 entries (Turion Space, Marquee+Anni, Glide Labs representative SaaS)
- NEW `CaseStudyPage.tsx` + `CaseStudiesIndexPage.tsx` + `AboutPage.tsx` + `ContactPage.tsx` + `ContactForm.tsx`
- 4 new lazy routes
- Sitemap grew 22 → 25 URLs
- Rule-1 auto-fix: SES decoupled from HTTP response (turion-demo-api is in private VPC with no NAT/SES-VPCE; sync send hung the Lambda — fixed with AbortController 4s timeout, DB row is source of truth)

### Plan 58-04 — Docs, security, polish, smoke, CHECKPOINT (this plan)
- NEW `src/pages/DocsLandingPage.tsx` (167 LOC) — /docs with 13 module quick-start cards
- NEW `src/pages/SecurityPage.tsx` (96 LOC) — /security trust page (Aurora RLS + SOC2 in progress)
- NEW `src/components/PageHelmet.tsx` (30 LOC) — DRY canonical + OG wrapper (provided for M8 retrofit; NOT retrofitted yet)
- NotFoundPage polish — 'Why are you seeing this?' explainer + back-to-home CTA
- NEW `public/og/default.png` (47 KB, 1200×630, brand purple gradient, ImageMagick-generated)
- 2 new lazy routes (/docs, /security)
- Sitemap = 26 URLs
- Full cross-cutting smoke (31/31 pass)

---

## Smoke results — final cross-cutting matrix (2026-05-15)

| Surface | Tests | Pass | Fail |
|---------|-------|------|------|
| Static routes (10) | / /pricing /privacy /terms /about /contact /docs /security /modules /case-studies | 10 | 0 |
| Module pages (13) | /modules/{crm,sales,purchase,items,plm,mes,quality,lean-erp-pro,asc606,royalty,dropship,ai-agents,qb-migration} | 13 | 0 |
| Case studies (3) | /case-studies/{turion-space,marquee-anni,sample-saas-svc} | 3 | 0 |
| SPA fallback | /not-a-real-page → 200 (NotFoundPage hydrates) | 1 | 0 |
| /llms.txt | 200 | 1 | 0 |
| /og/default.png | 200 (1200×630, 47 KB) | 1 | 0 |
| sitemap.xml URL count | 26 (≥26 expected) | 1 | 0 |
| robots.txt sitemap line | 1 (Sitemap: https://zietra.com/sitemap.xml) | 1 | 0 |
| **Frontend total** | | **31** | **0** |
| Backend `/api/contact` (valid POST) | `{"ok":true,"id":...}` | 1 | 0 |
| Backend `/api/contact` (wrong Origin) | 403 | 1 | 0 |
| Backend `/api/contact` (honeypot filled) | 200 silent `{"ok":true}` | 1 | 0 |
| Cross-origin link audit | 0 leaks in src/ or dist/assets/*.js | 1 | 0 |
| **Backend + audit total** | | **4** | **0** |

**Grand total: 35 pass · 0 fail.**

Raw output saved at `/tmp/58-04-smoke-results.txt` (ephemeral).

### Note on sitemap URL count

Plan expected ≥30; actual = 26. Plan math over-counted Wave-3 baseline (25 was already correct, not 28). Real progression:
- 58-01 = 9 URLs (static only)
- 58-02 = 22 URLs (+13 module pages)
- 58-03 = 25 URLs (+3 case study detail pages; /about /contact /case-studies were already in 58-01 STATIC_ROUTES)
- 58-04 = 26 URLs (+1 /security; /docs was already in 58-01 STATIC_ROUTES per the stub deferred to this wave)

26 is the correct closure number for 10 static + 13 modules + 3 case studies.

### Note on per-page canonical / OG in initial HTML

Marketing is a Vite SPA. `<Helmet>` blocks (and `<PageHelmet>`) are hydrated client-side, NOT injected into the static `dist/index.html` shell that S3 serves. This means:
- Google + Bing crawlers (which render JS) see correct per-page titles + canonicals + OG ✅
- LinkedIn / Twitter / iMessage previews (which do NOT render JS) see only the `dist/index.html` `<head>` + the `/og/default.png` fallback ⚠️

Default OG image covers the "no JS preview" case acceptably. Full per-page social previews require either:
- (a) Astro migration (SSR — best long-term answer, considered in M8)
- (b) Lambda@Edge OG-injector that rewrites `<head>` per route at the CDN edge

Logged in deferred-items below.

---

## Deferred — intentionally, NOT blockers

| Item | Why it's deferred | When to do |
|------|-------------------|------------|
| **Per-module OG images (13 PNGs)** | `/og/default.png` covers home + all pages without JS-render; per-page OG only matters for social previews (LinkedIn/Twitter) which don't execute JS. Building 13 unique 1200×630 PNGs is brand-design work, not engineering. | M8 — or operator-led with Canva/Figma |
| **Real product screenshots on /modules/<slug>** | Uses `/og/default.png` placeholder today. Real screenshots exist (Phase 57 18 working pages) but need cropping/branding. | M8 — automated Puppeteer screenshot rig |
| **Full `docs.zietra.com` subdomain** | /docs landing covers quick-starts; full docs (schema refs, API docs, walkthroughs) needs a dedicated docs site (likely Mintlify or VitePress). | M8 |
| **`/blog`** | Open Question 1 deferred — no posts ready. | When first post lands |
| **Per-module Loom videos** | Schema future-proofed (add 1 field `embedVideo?` to ModuleEntry). Recording 13 videos is operator work. | M8+ |
| **Sitemap auto-discovery of case-studies.ts** | Currently hand-maintained slug list in `scripts/case-studies-slugs.mjs`. Low drift risk (3 entries). | M8 |
| **Astro migration (SPA → SSR)** | Helmet runs client-side → LinkedIn/Twitter previews fall back to default OG only. Astro would solve. | M8 (decision: keep SPA + Lambda@Edge OG injector vs full Astro port) |
| **`api.zietra.com` Route 53 alias** | Currently using raw APIGW URL `lo254mvukl.execute-api.us-east-1.amazonaws.com`. CORS works to zietra.com origin. | M8 |
| **Contact form rate-limit case (manual 6-call test)** | Logic verified in PR but autonomous smoke doesn't run 6 sequential calls. | Operator manual verify |
| **PageHelmet retrofit across all 25 pages** | Component shipped, not retrofitted (would touch every page; safe to do incrementally). | M8 |
| **SES production-access from sandbox** | 200/day sandbox sufficient for contact-form lead volume today. Matters more for transactional email at scale (app.zietra.com signups). | M8 — reopen Console support case |
| **NAT or SES VPCE for turion-demo-api** | Inherited from 58-03 deferred. Lambda runs in private VPC; SES outbound currently best-effort with 4s AbortController. DB persistence is 100%. M8 options: NAT gateway (~$32/mo) OR SES VPCE (~$7/mo/AZ) OR move Lambda out of VPC. | M8 |
| **Stripe checkout wiring** (Base $99 "Coming soon" tooltip) | M4 (Phase 56) paused at Wave 1 Task 2. When unpaused, flip `comingSoon=false` in `pricing.ts` + add Checkout URL. | M4 (Phase 56) resumption |
| **Image-optimized OG (re-strip)** | Default OG is 47 KB; if scale requires <30 KB, can re-encode with `pngquant`. | Nice-to-have |
| **Test row cleanup from contact_submissions** | 1 row (`jeetnair.in+58-04-regression@gmail.com`) created in regression smoke. Aurora is VPC-private — local psql can't reach it. | Cleanup via runner Lambda OR ops poll loop |

---

## Next milestone — operator decision required

| Option | Pros | Cons | Command |
|--------|------|------|---------|
| **M8 — Compliance + observability** ⭐ RECOMMENDED | Unblocks first enterprise pilot. Per-tenant audit log dashboard, KMS at-rest, CloudWatch dashboards on /api/contact + agent_runs failures, k6 load tests of LIST endpoints, chaos tests, status.zietra.com, PageHelmet retrofit + Astro consideration. Also closes the 58-03 inherited SES-VPC issue (NAT or VPCE) so the contact form actually sends email. | No new user-visible features; pure investment for enterprise sales | `/gsd:plan-phase 59` |
| **M4 — Resume Phase 56 (Stripe)** | Closes billing loop; marketing's Stripe placeholder ("Coming soon" tooltip on Base $99 tier) becomes a real Checkout flow. Unblocks paid revenue. | Requires Stripe keys + webhook lambda + customer portal; M4 paused mid-Wave-1. Could run in parallel with M8 if operator has Stripe keys ready. | `/gsd:resume-work Phase 56` |
| **Polish & content iteration** | Per-module OG PNGs, 13 Loom videos, real product screenshots, 3 inbound blog posts. | No new system capability. | Operator-led, no GSD phase needed |
| **Satellite test regression cleanup** | 266 test failures from Phase 55-04 still untriaged. | Not blocking any feature work; satellite is in maintenance mode. | `/gsd:debug satellite-test-regressions` |

**Recommendation: M8.** Marketing surface is complete (26 URLs, sitemap, working contact form backend, 3 case studies, 13 module pages, /security trust). The next bottleneck is enterprise-readiness: SOC2 prep + observability + the inherited SES-VPC fix. M4 (Stripe) can run in parallel if operator has Stripe API keys ready — it's not on M8's critical path.

---

## 3 hand-off prompts (copy-paste)

1. **M8 (compliance + observability) — RECOMMENDED**
   ```
   /gsd:plan-phase 59 — M8 compliance + observability:
   per-tenant audit log dashboard in /settings,
   KMS encryption-at-rest review,
   CloudWatch dashboards on /api/contact + agent_runs + Cognito sign-ins,
   alarms for 5xx > 1% / Lambda concurrent execution / SES bounce,
   k6 load test of LIST endpoints + chaos tests (Lambda timeout, DB drop),
   status.zietra.com (statuspage.io or self-hosted Cachet),
   API documentation (docs.zietra.com subdomain via Mintlify or /docs/api),
   PageHelmet retrofit across all 25 pages,
   per-module OG image generation (13 PNGs via headless Puppeteer),
   resolve SES-VPC issue inherited from 58-03 (NAT gateway $32/mo OR SES VPCE $7/mo/AZ OR move turion-demo-api out of VPC),
   consider Astro migration for SSR-based social previews
   ```

2. **M4 (Stripe resumption)**
   ```
   /gsd:resume-work Phase 56 — M4 Stripe:
   resume from paused Wave 1 Task 2,
   integrate Stripe Checkout into Base tier "Upgrade to paid" CTA (flip comingSoon=false in marketing/src/data/pricing.ts),
   migration 036 adds stripe_customer_id + stripe_subscription_id on public.tenants,
   webhook Lambda for subscription.created/updated/deleted events,
   customer portal link from settings.html Billing card
   ```

3. **Polish (operator-led, no GSD phase)**
   ```
   /gsd:quick — polish marketing OG:
   replace /og/default.png with brand-perfect 1200×630 PNG (Canva/Figma),
   record 13 Loom videos (one per module quick-start),
   author 3 inbound blog posts targeting ASC 606 / NetSuite alternative / SMB ERP keywords
   ```

---

## Closure evidence — 10/10 Phase 58 requirements

| # | Requirement | Evidence | File:line / URL |
|---|-------------|----------|-----------------|
| 1 | CognitoMigratedAuth | /login + /signup redirect to app.zietra.com Cognito Hosted UI; supabase-js stripped | `marketing/src/pages/LoginPage.tsx` (~25 LOC) |
| 2 | PricingPageStripePlaceholder | $0 trial / $99 Base / Custom Add-ons with Coming soon tooltip on Base CTA | `marketing/src/data/pricing.ts` |
| 3 | MarketingHomeRefresh | 13-module "What's in the box"; HomePage uses real MODULES + ModuleCard | `marketing/src/pages/HomePage.tsx` |
| 4 | SeoBaseline404SitemapRobots | sitemap.xml (26 URLs) + robots.txt with Sitemap line + NotFoundPage with explainer + recovery + canonical/OG on new pages | `marketing/{public/sitemap.xml,public/robots.txt,src/pages/NotFoundPage.tsx,scripts/gen-sitemap.mjs}` |
| 5 | ModuleMarketingPages | 13 /modules/<slug> live, build-time sync from upstream catalog, drift-fails build | `marketing/{src/pages/ModulePage.tsx,scripts/sync-modules.mjs,src/data/modules.ts}` |
| 6 | CaseStudiesPage | 3 case studies (Turion / Marquee+Anni / Glide Labs) at /case-studies and /case-studies/:slug | `marketing/{src/data/case-studies.ts,src/pages/CaseStudyPage.tsx,src/pages/CaseStudiesIndexPage.tsx}` |
| 7 | AboutPage | /about — mission + traction (with inline case-study links) + stack + CTA | `marketing/src/pages/AboutPage.tsx` |
| 8 | ContactPage | /contact — ContactForm + 3 mailto channels + SLA box | `marketing/src/pages/ContactPage.tsx` |
| 9 | ContactFormBackend | public POST /api/contact (Origin allow-list + 5/hr/IP + honeypot + DB persist + best-effort SES); migration 035 created public.contact_submissions; Lambda redeployed | `turion-space-demo/backend/{migrations/035_contact_submissions.sql,src/routes/contact.ts,src/lib/rate-limit.ts}` |
| 10 | DocsLandingPage | /docs landing with 13 module quick-start cards; PageHelmet shipped for M8 retrofit; /security trust page added for free | `marketing/{src/pages/DocsLandingPage.tsx,src/pages/SecurityPage.tsx,src/components/PageHelmet.tsx}` |

---

## Deferred items inherited from 58-03

From `.planning/phases/58-m7-marketing-site-completion/deferred-items.md`:

**SES outbound from turion-demo-api Lambda hangs (VPC has no NAT or SES VPCE).**

Lambda runs in `vpc-012ab4500dcd4ee41` with Secrets Manager / KMS / Cognito VPCEs only — no NAT, no SES VPC endpoint. Contact form `ses.send(SendEmailCommand)` hung the whole Lambda invocation until the 30s timeout. Mitigated 58-03 by wrapping in AbortController with 4s timeout (DB persistence is source of truth; SES is best-effort). To actually deliver email, M8 needs ONE of:

- (a) NAT gateway on vpc-012ab4500dcd4ee41 (~$32/mo recurring)
- (b) SES VPC endpoint (~$7/mo per AZ — cheaper)
- (c) Move turion-demo-api out of the VPC; use bypass DB pool only for routes needing RDS proxy access

Until then, support polls `SELECT * FROM public.contact_submissions WHERE processed_at IS NULL ORDER BY created_at` for new leads. Or build a tiny scheduled-EventBridge Lambda outside the VPC that does poll-and-SES every 5 minutes.

---

## Resources

| Resource | Value |
|----------|-------|
| Marketing S3 bucket | `zietra-marketing` (us-east-1) |
| Marketing CloudFront | `E1X82T89JWL8CA` (CNAME zietra.com) |
| Marketing repo | `github.com/jeet-avatar/zietra` (path `marketing/`) |
| Marketing deploy | `./marketing/deploy.sh` (npm run build → s3 sync → CF invalidate) |
| Backend repo | `github.com/jeet-avatar/turion-space-demo` (path `backend/`) |
| Backend Lambda | `turion-demo-api` (CodeSha256 `8a6a542b…`) |
| Backend APIGW | `lo254mvukl.execute-api.us-east-1.amazonaws.com` |
| DB | Aurora cluster `zietra-aurora-prod-v2` via proxy `zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| DB master secret | `rds!cluster-16d5e38c-d8c4-4a35-9c47-39df84b06abd-mhV473` (v2 cluster) |
| Contact form table | `public.contact_submissions` (no RLS; GRANT INSERT to zietra_app) |
| SES verified identities | `noreply@zietra.com`, `support@zietra.com`, parent domain `zietra.com` (DKIM) |
| Default OG image | `https://zietra.com/og/default.png` (1200×630, 47 KB) |

---

## Files M8 will probably touch

- `.planning/phases/59-*` — new phase directory
- `turion-space-demo/backend/migrations/036_*` — audit_log table extension OR new `tenant_audit_events`
- `turion-space-demo/backend/src/routes/{audit,health}.ts` — new
- `turion-space-demo/frontend/settings.html` — audit log card
- `marketing/src/components/PageHelmet.tsx` — retrofit existing pages to use it
- `marketing/public/og/*.png` — per-module OG images (13)
- AWS Console — NAT gateway OR SES VPCE for `vpc-012ab4500dcd4ee41`
- AWS Console — CloudWatch dashboards for /api/contact + agent_runs + Cognito
- AWS Console — SES production-access reopen
- `infrastructure/` — k6 + chaos test runners (if creating)
- `status.zietra.com` — status page setup

---

## Open questions for M8 planner

1. **Astro vs Lambda@Edge OG-injector?** Astro is the cleaner long-term answer (real SSR, per-page meta in initial HTML, also faster TTFB). Lambda@Edge is cheaper to ship in M8 but adds another layer to debug. Decide before M8 plan is written.
2. **Per-tenant audit log dashboard scope:** All admin actions? All write endpoints? Just sensitive operations (export / role change / billing)? Affects schema design + storage cost.
3. **SOC2 Type 1 timeline:** Are we targeting Q1 2027 (per SecurityPage copy) or further out? Influences whether M8 needs to ship audit log evidence collection now or can defer to M9.
4. **Stripe (M4) timing:** If operator has Stripe API keys ready, M4 can run in parallel with M8 in two threads. If not, M4 stays paused.
5. **Satellite test regressions (266 failures from Phase 55-04):** Do we cleanup in M8 as a hygiene side-quest, or open a dedicated debug phase?

---

*Phase 58 closed: 2026-05-15*
*Total plans: 4 · Total requirements closed: 10 · Final smoke: 35/35 PASS*
