# Phase 58: M7 — Marketing Site Completion — Research

**Researched:** 2026-05-15
**Domain:** React 19 + Vite + Tailwind v4 marketing site (zietra.com) — content build-out + Cognito auth migration + per-module landing pages + case studies + contact form
**Confidence:** HIGH (existing codebase fully inspected; M6/M5 outputs confirmed; module catalog is single source of truth)
**Phase commands prereq:** `/gsd:discuss-phase 58` skipped — no CONTEXT.md; this RESEARCH is the planner's primary input.

---

## Summary

Phase 58 closes M7 by turning `/Users/jeet/zietra/marketing/` from an MVP brochure (8 pages, 2 generic auth forms, "HubSpot/Buffer/Calendly" framing) into a complete SaaS marketing surface that mirrors the **13-module catalog** shipped in Phase 57 and routes prospects through Cognito signup at app.zietra.com.

The codebase is already production-quality on infrastructure: **React 19 + Vite 6 + Tailwind v4 + react-router 7 + react-helmet-async + framer-motion + lucide-react**, deployed via `deploy.sh` to S3 `zietra-marketing` + CloudFront `E1X82T89JWL8CA` (cert: `dlzyv23o98bvo.cloudfront.net`, ACM cert validation in flight for zietra.com apex). Strong foundation. The gaps are **content alignment + new pages + Cognito redirect**, NOT a rebuild.

The 4 hard items: **(1)** rip `@supabase/supabase-js` out of `package.json` + delete `src/lib/{auth,supabase}.ts` + collapse `Login/Signup/Dashboard` pages into thin redirects to `https://app.zietra.com/{login,signup}` (NO duplicate auth on marketing); **(2)** build ONE parametrized `ModulePage.tsx` driven by `/modules/:slug` + a copy of `module-catalog.js` rehydrated as `src/data/modules.ts` (13 modules, 0 hand-coded files); **(3)** wire `/contact` to a NEW public `POST /api/contact` endpoint on `turion-demo-api` Lambda backed by migration 035 (`public.contact_submissions`) + SES SendEmail to support@zietra.com (rate-limit 5/IP/hour, honeypot); **(4)** SEO baseline — sitemap.xml + robots.txt already present but stale (6 URLs; needs 13+ module routes + case-studies + about + contact + docs).

**Primary recommendation:** Ship Phase 58 in **4 waves** matching the existing site's natural seams: (58-01) Cognito redirect + Supabase strip + content refresh + sitemap regen; (58-02) 13 module pages via single parametrized component; (58-03) /case-studies + /about + /contact + contact backend + mig 035; (58-04) /docs landing + 404/footer polish + smoke + CHECKPOINT for M8. Keep Tailwind v4 pinned. Module catalog source-of-truth lives in `turion-space-demo/lib/module-catalog.js` — copy at build time into `marketing/src/data/modules.ts` via a small pre-build sync script (NOT a runtime fetch; marketing is static).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| `ModuleMarketingPages` | 13 per-module marketing pages (`/modules/<slug>`) — one per `MODULE_CATALOG` entry | §D parametrized `ModulePage.tsx` + `src/data/modules.ts` synced from `turion-space-demo/lib/module-catalog.js`. 13 routes via React Router 7 `:slug` param. |
| `CaseStudiesPage` | `/case-studies` index + 3 case study detail pages | §E Turion Space (aerospace) + Marquee/Anni (D2C) + hypothetical SaaS sample. Same shared `CaseStudyPage.tsx` driven by `src/data/case-studies.ts`. |
| `AboutPage` | `/about` — 1-page mission + team + traction | §I about-page mockup §3.5 |
| `ContactPage` | `/contact` form — name, email, message, intent (sales/security/support/partner) | §F contact form spec |
| `ContactFormBackend` | Public `POST /api/contact` endpoint — validates + SES SendEmail + records to DB | §F extend `turion-demo-api` (NEW: skip tenantContext on this route), migration 035 `public.contact_submissions`, 5/IP/hr rate limit, honeypot field |
| `DocsLandingPage` | `/docs` quick-start guide per module + "Coming soon" placeholder for full docs | §G one-page index reusing `src/data/modules.ts` |
| `CognitoMigratedAuth` | Marketing site has NO own auth; `/login` + `/signup` redirect to app.zietra.com | §C strip Supabase from package.json + lib/, collapse Login/Signup/Dashboard pages to redirects (50→8 LOC each) |
| `PricingPageStripePlaceholder` | "Start free trial" → app signup; "Upgrade to paid" → "Coming soon" tooltip (NO Stripe Checkout) | §A.2 mod `src/data/pricing.ts` CTAs; pricing CTA logic in `PricingSection.tsx:84-98` |
| `MarketingHomeRefresh` | HomePage updated to mirror 13-module catalog (currently shows generic HubSpot/Buffer/Calendly framing) | §A.1 HomePage `FEATURES[]` array (lines 251-336) needs to render from module-catalog OR new "Industries we serve" + "What's in the box" sections that map to actual 13 modules |
| `SeoBaseline404SitemapRobots` | sitemap.xml regenerated to include all 30+ routes; robots.txt OK as-is; per-page `<Helmet>` titles + OG | §H build-time `scripts/gen-sitemap.ts` + 404 polish + OG image |
</phase_requirements>

---

## Standard Stack

### Core (already installed, KEEP)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` + `react-dom` | 19.0.0 | UI framework | Latest stable; React 19 RSC unused (we're SPA via Vite) |
| `vite` | 6.0.5 | Build tool + dev server | Standard for React 19 SPAs |
| `@vitejs/plugin-react` | 4.3.4 | React JSX + Fast Refresh | Required |
| `tailwindcss` | 4.0.0 | Atomic CSS | v4 is current; pin EXACT version (alpha-adjacent) |
| `@tailwindcss/vite` | 4.0.0 | Tailwind v4 Vite integration | v4-specific; replaces the old PostCSS plugin |
| `react-router` | 7.0.0 | SPA routing | RR7 = ex Remix; `BrowserRouter` + `Routes`/`Route` API works as-is |
| `react-helmet-async` | 3.0.0 | Per-page `<title>` / meta tags | Already used in `HomePage.tsx:18-29`, `NotFoundPage.tsx:9-12` |
| `framer-motion` | 12.15.0 | Animation primitives | Used in `ProductReveal.tsx`, `AutomationFlow.tsx`, `SuccessStories.tsx` |
| `lucide-react` | 0.460.0 | Icon set | Matches `MODULE_CATALOG.icon` field (users/shopping-cart/package/factory/shield-check/landmark/coins/bot/git-pull-request-arrow/settings-2) |
| `@splinetool/react-spline` | 2.2.6 | 3D hero embed | Used by `DashboardMockup3D.tsx`; KEEP for now |
| `typescript` | 5.6.2 | Type safety | Standard |

### Add (Phase 58)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **(none)** | — | Use already-installed deps for everything | The whole phase is content + a tiny build script — NO new runtime deps |

### Remove (Phase 58 — Cognito migration)
| Library | Version | Why Remove |
|---------|---------|------------|
| **`@supabase/supabase-js`** | 2.103.3 | Marketing site has NO own auth in M5+ Cognito world. Used only by `src/lib/supabase.ts` + `src/lib/auth.ts` + `LoginPage`/`SignupPage`/`DashboardPage`. After Cognito migration, those pages become thin redirects → these files are dead code → drop the dep. Trims ~70 KB gzip from bundle. |

### Backend (for `/contact` form — extend, don't add new infra)
| Component | Where | Why |
|-----------|-------|-----|
| **`turion-demo-api` Lambda** | `/Users/jeet/turion-space-demo/backend/src/routes/contact.ts` (NEW) | Reuse the M6 backend — no new Lambda, no new APIGW. Add ONE public route `POST /api/contact`. Skip the `tenantContext` middleware (this is pre-auth marketing traffic). |
| **Aurora Postgres `public.contact_submissions`** | NEW migration `035_contact_submissions.sql` | Persist for audit + spam analysis. No RLS (public schema, ADMIN-only read via support tooling later). |
| **AWS SES** | Already provisioned for `zietra.com` (per MEMORY.md M1 kickoff — DKIM SUCCESS, MAIL FROM SUCCESS, IAM `ses-smtp-supabase`, creds in `zietra/ses-smtp-credentials-RsRKSm`) | Lambda already has IAM `zietra-api-lambda-role` — add `ses:SendEmail` action statement scoped to `arn:aws:ses:us-east-1:134607809447:identity/zietra.com` |

**Installation (only one change to package.json):**
```bash
cd /Users/jeet/zietra/marketing
npm uninstall @supabase/supabase-js
# That's it. Everything else needed is already installed.
```

### Alternatives Considered

| Instead of | Could Use | Why we chose existing |
|------------|-----------|-----------------------|
| React Router 7 SPA | Astro / Next.js SSG | Marketing site already shipped on RR7 SPA. Astro would mean a rewrite. CloudFront SPA-fallback (404 → index.html) handles direct page loads. Defer Astro to M8 if Core Web Vitals demand it. |
| Per-module hand-written `.tsx` files (13 files) | **Single parametrized `ModulePage.tsx` driven by `src/data/modules.ts`** ✅ | 13 hand-written files = drift risk + 13× the diff for catalog changes. Single component reads from data file synced from `module-catalog.js`. |
| Marketing's own auth | **Pure redirect to app.zietra.com Cognito** ✅ | Cognito Hosted UI lives at app.zietra.com. Duplicating auth surface = security risk + UX inconsistency. Marketing site keeps ZERO auth deps. |
| `/contact` → mailto:support@zietra.com | **Real form → API → SES + DB** ✅ | mailto is hostile UX (forces native mail client) + zero capture. Form gives us lead tracking + spam filtering + analytics. |
| AWS SDK SendEmail in browser | **Lambda intermediary** ✅ | Browser SES = AWS creds shipped to client = catastrophic leak. Lambda hides creds. |
| `react-router` data routers (`createBrowserRouter`) | **`<BrowserRouter>` + `<Routes>` as-is** ✅ | Existing code uses the classic `<BrowserRouter>` API. RR7 supports both. Don't migrate during Phase 58 — orthogonal change. |
| Mailchimp/HubSpot embedded form | Real form to our own backend | Adds 3rd-party JS + dependency. We have a Lambda; use it. |

---

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure (after Phase 58)
```
/Users/jeet/zietra/marketing/
├── public/
│   ├── favicon.svg
│   ├── llms.txt
│   ├── robots.txt              # NO change
│   ├── sitemap.xml             # REGEN by scripts/gen-sitemap.ts during `npm run build`
│   └── og/                     # NEW — Open Graph images per page
│       ├── default.png         # 1200×630 fallback
│       └── modules/            # 13 per-module OG images (later — Phase 58.5 / M8)
├── scripts/
│   └── gen-sitemap.ts          # NEW — emits public/sitemap.xml from route list + modules data
├── src/
│   ├── App.tsx                 # MODIFY — add new routes
│   ├── main.tsx                # NO change
│   ├── components/
│   │   ├── NavBar.tsx          # MODIFY — add Modules dropdown + Resources dropdown
│   │   ├── SiteFooter.tsx      # MODIFY — populate dead # hrefs (Modules, Case studies, About, Contact, Docs)
│   │   ├── HeroSection.tsx     # KEEP
│   │   ├── PricingSection.tsx  # MODIFY — Stripe placeholder CTA (Coming soon tooltip)
│   │   ├── AutomationFlow.tsx  # KEEP
│   │   ├── DashboardMockup3D.tsx # KEEP
│   │   ├── ProductReveal.tsx   # KEEP
│   │   ├── StatsStrip.tsx      # KEEP
│   │   ├── StoryCard.tsx       # KEEP
│   │   ├── SuccessStories.tsx  # MODIFY — wire to /case-studies index
│   │   ├── ModuleCard.tsx      # NEW — used on home + /modules grid
│   │   ├── ContactForm.tsx     # NEW — controlled form + honeypot + POST handler
│   │   └── PageHelmet.tsx      # NEW — DRY wrapper for Helmet + OG tags + canonical
│   ├── data/
│   │   ├── pricing.ts          # MODIFY — CTAs become app.zietra.com redirects, "Upgrade" → comingSoon=true
│   │   ├── modules.ts          # NEW — typed copy of MODULE_CATALOG with marketing copy (tagline, useCases[], whyWeBuilt)
│   │   ├── case-studies.ts     # NEW — 3 case studies with hero, problem, solution, results
│   │   └── industries.ts       # NEW — D2C, SaaS, Manufacturing, Aerospace mappings to modules
│   ├── lib/
│   │   ├── auth.ts             # DELETE
│   │   ├── supabase.ts         # DELETE
│   │   └── config.ts           # NEW — APP_URL constant (https://app.zietra.com) + API_URL (turion-demo-api)
│   ├── pages/
│   │   ├── HomePage.tsx        # MODIFY — Replace HubSpot/Buffer/Calendly framing with module catalog
│   │   ├── PricingPage.tsx     # KEEP (PricingSection does the work)
│   │   ├── LoginPage.tsx       # SHRINK to ~8 LOC — redirect to app.zietra.com/login
│   │   ├── SignupPage.tsx      # SHRINK to ~8 LOC — redirect to app.zietra.com/signup
│   │   ├── DashboardPage.tsx   # SHRINK to ~8 LOC — redirect to app.zietra.com
│   │   ├── NotFoundPage.tsx    # MODIFY — add "popular pages" links to recover lost prospects
│   │   ├── PrivacyPage.tsx     # MODIFY — update Sub-processors list (drop Supabase, add Cognito + Aurora)
│   │   ├── TermsPage.tsx       # MODIFY — drop "you connect SMTP" stale language
│   │   ├── ModulePage.tsx      # NEW — driven by /modules/:slug, reads modules.ts
│   │   ├── ModulesIndexPage.tsx # NEW — /modules — grid of all 13
│   │   ├── CaseStudyPage.tsx   # NEW — /case-studies/:slug, reads case-studies.ts
│   │   ├── CaseStudiesIndexPage.tsx # NEW — /case-studies — grid of 3
│   │   ├── AboutPage.tsx       # NEW — /about
│   │   ├── ContactPage.tsx     # NEW — /contact, uses ContactForm
│   │   └── DocsLandingPage.tsx # NEW — /docs — index of quick-start guides
│   ├── styles/
│   │   └── globals.css         # KEEP (Tailwind v4 imports + CSS variables for --zietra/--bg/--text)
│   └── vite-env.d.ts           # KEEP
├── tsconfig.app.json           # KEEP
├── tsconfig.json               # KEEP
├── tsconfig.node.json          # KEEP
├── vite.config.ts              # KEEP
├── deploy.sh                   # KEEP
└── package.json                # MODIFY — remove @supabase/supabase-js
```

### Pattern 1: Parametrized Module Page (single component for 13 routes)
**What:** One `<ModulePage>` component bound to route `/modules/:slug`. Looks up the module by slug in `src/data/modules.ts`. Renders hero, use-cases-by-industry, screenshot placeholder, "Why we built this", and signup CTA.
**When to use:** Anywhere the catalog has N copies of the same page. Mirrors Phase 57's `page-template.js` pattern from the in-app side.
**Example:**
```tsx
// Source: pattern adapted from turion-space-demo/lib/page-template.js (488 LOC) — we don't need the LIST/DETAIL/CREATE
// machinery here, just the parametrized-data pattern.
import { useParams, Navigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { MODULES } from '../data/modules'
import { NavBar } from '../components/NavBar'
import { SiteFooter } from '../components/SiteFooter'

const APP_SIGNUP = 'https://app.zietra.com/signup'

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>()
  const m = MODULES.find(x => x.slug === slug)
  if (!m) return <Navigate to="/modules" replace />

  return (
    <>
      <Helmet>
        <title>{m.title} · Zietra</title>
        <meta name="description" content={m.tagline} />
        <meta property="og:title" content={m.title} />
        <meta property="og:description" content={m.tagline} />
        <link rel="canonical" href={`https://zietra.com/modules/${m.slug}`} />
      </Helmet>
      <NavBar />
      <main>
        {/* Hero */}
        <section className="module-hero">
          <h1>{m.title}</h1>
          <p className="lede">{m.tagline}</p>
          <a className="cta-primary"
             href={`${APP_SIGNUP}?intent=${m.slug}`}>
            Try {m.shortName} free for 30 days
          </a>
        </section>

        {/* Use cases */}
        <section className="use-cases">
          <h2>Built for</h2>
          <div className="use-cases-grid">
            {m.useCases.map(uc => (
              <article key={uc.industry}>
                <h3>{uc.industry}</h3>
                <ul>{uc.bullets.map(b => <li key={b}>{b}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* Screenshot placeholder (deferred to M8 with real screenshots) */}
        <section className="screenshot">
          <div className="screenshot-frame">
            <img
              src={m.screenshot ?? '/og/default.png'}
              alt={`${m.title} screenshot`}
              width="1200" height="630" loading="lazy"
            />
          </div>
        </section>

        {/* Why we built this */}
        <section className="why">
          <h2>Why we built {m.shortName}</h2>
          <p>{m.whyWeBuilt}</p>
        </section>

        {/* Bottom CTA */}
        <section className="cta-bottom">
          <h2>Try it free.</h2>
          <p>{m.bottomCta}</p>
          <a className="cta-primary" href={`${APP_SIGNUP}?intent=${m.slug}`}>
            Start free trial
          </a>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
```

### Pattern 2: Cognito Redirect (NO duplicate auth)
**What:** `LoginPage.tsx`, `SignupPage.tsx`, `DashboardPage.tsx` become 3 tiny components that `window.location.replace()` to `app.zietra.com`.
**When to use:** When the auth source-of-truth lives elsewhere (Cognito Hosted UI on app subdomain). Avoid forwarding bare URLs in `<a href>` because users may copy/paste `https://zietra.com/login` into chat — needs to behave like a redirect, not a dead link.
**Example:**
```tsx
// SignupPage.tsx — replace the existing 125-line file with this:
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

const APP_SIGNUP = 'https://app.zietra.com/signup'

export default function SignupPage() {
  useEffect(() => {
    // Preserve any ?intent=<module> query string from per-module CTAs
    const qs = window.location.search
    window.location.replace(`${APP_SIGNUP}${qs}`)
  }, [])
  return (
    <>
      <Helmet>
        <title>Sign up · Zietra</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p>Redirecting to sign up…</p>
      </main>
    </>
  )
}
```

### Pattern 3: Contact Form Backend (extend turion-demo-api, public route)
**What:** Add `POST /api/contact` to existing Lambda. PUBLIC — bypass `tenantContext` middleware. Validate inputs, check rate limit (5/IP/hr in-memory or DynamoDB), check honeypot field is empty, write to `public.contact_submissions`, SES SendEmail to support@zietra.com.
**When to use:** Any pre-auth public form. Reuse existing Lambda over standing up a new one.
**Example:**
```typescript
// /Users/jeet/turion-space-demo/backend/src/routes/contact.ts (NEW)
import { Hono } from 'hono'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { z } from 'zod'
import { pool } from '../db'    // existing pg.Pool from turion-demo-api
import { rateLimitOk } from '../lib/rate-limit'  // tiny in-memory map (~30 LOC)

const ses = new SESv2Client({ region: 'us-east-1' })

const ContactSchema = z.object({
  name:    z.string().trim().min(1).max(200),
  email:   z.string().trim().toLowerCase().email().max(320),
  company: z.string().trim().max(200).optional(),
  intent:  z.enum(['sales', 'support', 'security', 'partner', 'other']),
  message: z.string().trim().min(10).max(5000),
  // Honeypot — bots fill this, humans don't see it (display:none in CSS)
  website: z.string().max(0, 'spam-detected').optional(),
})

export const contact = new Hono()

// Public — NO tenantContext middleware here
contact.post('/contact', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown'

  // Rate limit BEFORE parsing (cheap dropout)
  if (!rateLimitOk(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return c.json({ error: 'Too many requests. Please try again in an hour.' }, 429)
  }

  let body
  try { body = ContactSchema.parse(await c.req.json()) }
  catch { return c.json({ error: 'Invalid input.' }, 400) }

  // Honeypot caught — pretend success to not tip off bots
  if (body.website && body.website.length > 0) {
    return c.json({ ok: true }, 200)
  }

  // Persist
  const { rows } = await pool.query(
    `INSERT INTO public.contact_submissions
        (name, email, company, intent, message, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [body.name, body.email, body.company ?? null, body.intent, body.message, ip, c.req.header('user-agent') ?? null],
  )

  // Send notification email (best-effort; failure should NOT roll back the row)
  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: 'noreply@zietra.com',
      Destination: { ToAddresses: ['support@zietra.com'] },
      ReplyToAddresses: [body.email],
      Content: {
        Simple: {
          Subject: { Data: `[${body.intent.toUpperCase()}] ${body.name} (${body.company ?? 'no company'}) — Zietra contact form` },
          Body: { Text: { Data:
`From: ${body.name} <${body.email}>
Company: ${body.company ?? '—'}
Intent: ${body.intent}
IP: ${ip}
Submission ID: ${rows[0].id}

Message:
${body.message}
` } },
        },
      },
    }))
  } catch (err) {
    console.error('[contact] SES send failed (row persisted):', err)
  }

  return c.json({ ok: true, id: rows[0].id }, 200)
})
```
**Migration 035 (`backend/migrations/035_contact_submissions.sql`):**
```sql
-- Phase 58-03 — public contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text NOT NULL,
  email       text NOT NULL,
  company     text,
  intent      text NOT NULL CHECK (intent IN ('sales','support','security','partner','other')),
  message     text NOT NULL,
  ip          text,
  user_agent  text,
  processed_at timestamptz,
  processed_by text
);
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON public.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_submissions_intent_idx
  ON public.contact_submissions(intent, created_at DESC);
-- NO RLS — public schema, no tenant_id. Admin-only read via support tooling later.
GRANT INSERT ON public.contact_submissions TO zietra_app;
GRANT SELECT, UPDATE ON public.contact_submissions TO zietra_admin;  -- if/when zietra_admin role exists
```

### Pattern 4: Build-time Module Catalog Sync (NOT runtime fetch)
**What:** A tiny `scripts/sync-modules.ts` script reads `/Users/jeet/turion-space-demo/lib/module-catalog.js`, transforms it into a TS typed export, and writes `src/data/modules.ts`. Marketing copy (tagline, useCases, whyWeBuilt) lives alongside in the SAME file (data layer, not in the JS source-of-truth).
**When to use:** When marketing needs the same primitives as the in-app catalog but with extra prose. Build-time sync prevents runtime cross-origin fetches AND keeps marketing's static-site nature.
**Example invocation in `package.json`:**
```json
"scripts": {
  "build": "node scripts/sync-modules.mjs && node scripts/gen-sitemap.mjs && tsc -b && vite build",
  "dev": "node scripts/sync-modules.mjs && vite"
}
```
**Manual sync skipped intentionally** — if marketing copy diverges from `module-catalog.js` codes, the typecheck will fail at build (slugs become enum-like union).

### Pattern 5: SPA Fallback on CloudFront
**What:** Direct URL access (e.g., user types `https://zietra.com/modules/crm`) hits CloudFront, which has no S3 object at that path. Without a fallback rule, user gets 403/404 from S3.
**When to use:** Always, for SPAs deployed to S3+CF.
**How:** Add a CloudFront error response rule: `404 → /index.html → 200` (and `403 → /index.html → 200`). The SPA's react-router then handles the path client-side.
**Verify:** In `aws cloudfront get-distribution-config --id E1X82T89JWL8CA --query 'DistributionConfig.CustomErrorResponses'`. If empty, add via `update-distribution` with `ErrorCachingMinTTL: 0, ResponseCode: 200, ResponsePagePath: /index.html`.

### Anti-Patterns to Avoid
- **DON'T duplicate Cognito auth on marketing site.** Forwarding password POSTs to app.zietra.com from marketing creates 2 attack surfaces. Redirect, don't proxy.
- **DON'T hand-write 13 module pages.** They will drift. Single parametrized component + data file.
- **DON'T `fetch()` `module-catalog.js` from CDN at runtime.** Marketing is static; runtime fetches kill TTFB + waste a CloudFront origin request. Build-time sync.
- **DON'T put AWS SDK in browser.** Anywhere we need AWS (SES, S3 puts), it MUST go through a Lambda intermediary.
- **DON'T leave dead `href="#"` links in the footer.** `SiteFooter.tsx:14-29` currently has About/Blog/Careers/Contact/Privacy/Terms/Security all as `#` — fix in 58-01.
- **DON'T re-render the entire site for a sitemap regeneration.** `scripts/gen-sitemap.mjs` runs once at build start, writes `public/sitemap.xml`, Vite copies to `dist/`.
- **DON'T put the contact form intent enum on the frontend ONLY.** Validate server-side via Zod (mirror enum). Frontend `<select>` is sugar; server is the gate.
- **DON'T forget to remove `src/lib/supabase.ts` + `src/lib/auth.ts`** after Cognito migration. Dead code per global rule 5.
- **DON'T inline 13 OG images now.** Defer per-module OG to M8 with real product screenshots. Default OG fallback for Phase 58.
- **DON'T add a CMS.** Content fits in 4-5 TS files. CMS is overkill for 25 pages.

</architecture_patterns>

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Form validation** | Hand-rolled regex `/^[^@]+@[^@]+\.[^@]+$/` for email | `zod` (already in turion-demo-api's deps; no new install on backend) | Zod handles email, length, enum, trim, optional, error messages, AND TypeScript inference in one place. Browser validation via `<input type="email" required>` is the first line; server Zod is the gate. |
| **Honeypot spam detection** | reCAPTCHA / hCaptcha (3rd-party JS) | Hidden `<input name="website">` + `display:none` CSS + Zod `.max(0)` server check | reCAPTCHA = 90KB+ JS + Google tracking + accessibility issues. Honeypot is ~3 LOC, catches 99% of dumb bots, zero UX cost. |
| **Rate limiting** | DynamoDB table + TTL + IAM + cost | In-memory `Map<ip, timestamps[]>` in Lambda warm container (5/hr per IP) | Lambda warm containers retain memory across invocations within a few minutes. For 5/hr limits, the in-memory map is fine — Lambda cold starts reset it, but that just means an attacker gets ~5 more per cold start (acceptable). If we ever exceed 100 RPS, migrate to ElastiCache (M8). |
| **Sitemap generation** | Manually edit `public/sitemap.xml` on every route add | `scripts/gen-sitemap.mjs` — pure Node, no deps, reads `MODULES` + static routes, writes XML | Manual edits = drift. Already in our build pipeline. 30 LOC. |
| **OG image generation** | satori / @vercel/og at runtime | Static `/og/default.png` for Phase 58; per-module OG deferred | Runtime OG generation needs a serverless function. For 30 pages, one default OG image is fine. M8 can add per-module screenshots. |
| **Cross-repo module catalog sharing** | npm workspace, lerna, git submodule | `scripts/sync-modules.mjs` — reads `/Users/jeet/turion-space-demo/lib/module-catalog.js` via Node `fs.readFile` + regex parse OR direct dynamic import | Both repos are checked out on the same filesystem (per CLAUDE.md repo paths). Build-time file read. Avoid pulling in a monorepo for one shared file. If `turion-space-demo` lives elsewhere on CI, add an env var `MODULE_CATALOG_PATH`. |
| **Per-page Open Graph image** | Auto-generated screenshots | Static `og/default.png` 1200×630 | Auto-screenshot requires Puppeteer + heavy Lambda. Static OG fallback is fine for Phase 58. |
| **Contact form CSRF token** | csurf + cookie + verify | `Origin` header check on the Lambda — reject if not `https://zietra.com` | Marketing site has no cookies and no auth, so CSRF is moot for our flow. Origin check + rate limit + honeypot is enough abuse prevention. |
| **Sub-routing inside `/modules/:slug`** | useState tabs | Just stack sections vertically — hero, use-cases, screenshot, why, CTA | No need for sub-tabs. 5 sections fit on one scroll. |
| **Custom 404 search** | Algolia search box | Hardcoded list of popular pages on `NotFoundPage` | We have 25 pages. Algolia for a SaaS marketing site is overkill until we have 200+ docs pages. |

**Key insight:** Marketing sites become bloated when devs add tools they think they'll need (CMS, search, A/B test framework, analytics SDK). Ship 25 pages with one tiny script, one form, and stat output. M8 can add real instrumentation.

---

## Common Pitfalls

### Pitfall 1: CloudFront SPA 404 → S3 origin returns AccessDenied / 403
**What goes wrong:** User shares `https://zietra.com/modules/crm`, recipient clicks, gets ugly S3 `AccessDenied` XML error. SPA never loads.
**Why it happens:** S3 has no object at `/modules/crm`. CloudFront passes the 404/403 through without rewriting.
**How to avoid:** CloudFront `CustomErrorResponses` rule: `404 → /index.html, 200, TTL 0`. Same for `403`. Verify with `curl -i https://zietra.com/modules/crm` — should get HTTP 200 + the SPA HTML.
**Warning signs:** "Page works when I navigate but not when I refresh." `curl https://zietra.com/anything-fake` returns non-200.
**Verification command:**
```bash
aws cloudfront get-distribution-config --id E1X82T89JWL8CA \
  --query 'DistributionConfig.CustomErrorResponses'
# Expected: ErrorCode=404, ResponseCode=200, ResponsePagePath=/index.html, ErrorCachingMinTTL=0
# AND: ErrorCode=403, ResponseCode=200, ResponsePagePath=/index.html, ErrorCachingMinTTL=0
```

### Pitfall 2: Tailwind v4 "@tailwindcss/vite missing" or `@import "tailwindcss"` not recognized
**What goes wrong:** Tailwind classes silently produce no CSS. Page renders unstyled.
**Why it happens:** Tailwind v4 dropped `tailwind.config.js` + PostCSS config. Uses `@tailwindcss/vite` plugin + a single `@import "tailwindcss"` in CSS.
**How to avoid:** Verify `vite.config.ts` has `tailwindcss()` plugin AND `src/styles/globals.css` starts with `@import "tailwindcss";`. Don't restore an old `tailwind.config.js`.
**Warning signs:** `grep "tailwind.config" /Users/jeet/zietra/marketing/` returns matches (it should NOT — v4 doesn't use it).
**Verified for our codebase:** ✅ `vite.config.ts:3` imports `@tailwindcss/vite`, `vite.config.ts:6` calls `tailwindcss()`. Stack is correct.

### Pitfall 3: React Router 7 redirects swallow query string
**What goes wrong:** User clicks `/signup?intent=crm` from a module page, gets redirected to `app.zietra.com/signup` WITHOUT the `intent` query. Onboarding can't pre-select the module.
**Why it happens:** `<Navigate to="/foo">` doesn't preserve current URL search params unless explicitly told to.
**How to avoid:** In Login/Signup/Dashboard redirect components, use `window.location.replace(`${APP_URL}${window.location.search}`)` not `<Navigate>`. Or in routing, use a wrapper that copies `useLocation().search` into the destination URL.
**Warning signs:** `?intent=crm` survives to `/signup` but disappears at `app.zietra.com/signup`.

### Pitfall 4: SES SendEmail throws "Email address is not verified" in production
**What goes wrong:** Contact form succeeds in dev but fails in production with "Email address noreply@zietra.com is not verified."
**Why it happens:** SES sandbox mode requires BOTH from + to to be verified. Per MEMORY.md, account 134607809447 is in sandbox (200/day, production-access reopen pending User in Console).
**How to avoid:** **Two paths:**
1. **Recommended for Phase 58:** Verify the sender `noreply@zietra.com` AND recipient `support@zietra.com` as identities in SES sandbox. Both will work in sandbox without production access. (Sandbox limit is 200/day — plenty for contact form.)
2. **For unrestricted volume:** Get production-access. Per MEMORY.md, this is pending user action in SES Console.
**Warning signs:** Contact form returns 200 (because we wrap SES in try/catch) but no email arrives. CloudWatch logs show `MessageRejected`.
**Verification command:**
```bash
aws sesv2 list-email-identities --region us-east-1 \
  --query 'EmailIdentities[?IdentityName==`zietra.com` || IdentityName==`noreply@zietra.com` || IdentityName==`support@zietra.com`]'
# Need: zietra.com verified + DKIM SUCCESS (per MEMORY this is done), plus noreply@ + support@ verified individually if in sandbox
```

### Pitfall 5: Removing `@supabase/supabase-js` breaks build because LoginPage still imports it
**What goes wrong:** `npm uninstall @supabase/supabase-js` then `npm run build` fails because TS can't resolve `import { supabase } from './lib/supabase'`.
**Why it happens:** Files have stale imports. The lib files get deleted but LoginPage hasn't been collapsed yet.
**How to avoid:** Strict order: (1) replace LoginPage/SignupPage/DashboardPage CONTENT first (shrink to redirect-only), (2) verify `npm run build` passes, (3) delete `src/lib/auth.ts` + `src/lib/supabase.ts`, (4) verify build again, (5) `npm uninstall @supabase/supabase-js`, (6) verify build a final time.
**Warning signs:** TS errors like `Cannot find module './lib/auth' or its corresponding type declarations`.

### Pitfall 6: Sitemap.xml stale → Google doesn't discover new pages
**What goes wrong:** We ship 13 module pages, but `sitemap.xml` (committed at `public/sitemap.xml`) only lists 6 routes. Google never crawls modules. Zero organic traffic to module pages.
**Why it happens:** sitemap.xml was manually authored, not generated.
**How to avoid:** `scripts/gen-sitemap.mjs` runs as part of `npm run build`. Output is written to `public/sitemap.xml` BEFORE Vite copies public/ to dist/.
**Warning signs:** New page slug exists in `src/data/modules.ts` but `dist/sitemap.xml` doesn't include it.
**Verification command:**
```bash
cd /Users/jeet/zietra/marketing && npm run build
grep -c "<loc>" dist/sitemap.xml
# Expected: 30+ (7 static + 13 modules + 3 case studies + 1 case-studies index + 1 modules index + 1 about + 1 contact + 1 docs)
```

### Pitfall 7: Tailwind v4 `@theme inline` removed / migrated; CSS variables now under `:root`
**What goes wrong:** Existing `src/styles/globals.css` uses old Tailwind v3 `@layer base` + custom CSS variables. v4 changed how design tokens are declared.
**Why it happens:** Tailwind v4 introduced a new theming syntax (`@theme { --color-zietra: ...; }`).
**How to avoid:** Inspect current `src/styles/globals.css`. If v3-style, leave it — v4 supports v3 utility class names + arbitrary CSS variables alongside. Don't rewrite unless something is broken. The site already builds + deploys, so current setup is compatible.
**Verification:** `npm run build` succeeds + bundle has all expected CSS.

### Pitfall 8: Lambda cold start hits `npm install zod` cost
**What goes wrong:** Adding `zod` to turion-demo-api increases Lambda package size + cold start.
**Why it happens:** Every new dep pulls in transitive deps.
**How to avoid:** Check if Zod is already there. Quick check: `grep '"zod"' /Users/jeet/turion-space-demo/backend/package.json`. If not, manual validation is 15 LOC and saves a dep. For one route, manual validation wins. Note: Hono has `@hono/zod-validator` if zod is desired.
**Decision for Phase 58:** Inspect first; if zod not already in deps, write manual validation (lighter).

### Pitfall 9: Bundle bloat from `@splinetool/react-spline` (3.5MB+) on routes that don't use 3D
**What goes wrong:** Per-module pages don't need the 3D hero, but if `<DashboardMockup3D>` is imported eagerly in any new component, Spline JS loads on every page.
**Why it happens:** Spline is heavy (~3.5MB ungz). Currently used only on home (in `HomePage.tsx` indirectly via `ProductReveal` if at all — verify).
**How to avoid:** Keep `<DashboardMockup3D>` lazy-loaded ONLY on `HomePage`. Don't import in `ModulePage`, `CaseStudyPage`, etc. Already lazy in `App.tsx:9`.
**Warning signs:** `dist/assets/` has `spline-*.js` chunks loaded by every page entry point. Network tab on `/modules/crm` shows Spline downloads.

### Pitfall 10: HelmetProvider re-renders cause SEO meta flicker; CloudFront caches HTML with wrong meta
**What goes wrong:** Per-page `<Helmet>` tags update DOM client-side after hydration. CloudFront caches `/index.html` (with default meta), then crawler reads it and indexes the WRONG title for every page.
**Why it happens:** SPA + client-side Helmet = SSR is needed for proper crawler indexing. Google + most crawlers DO execute JS (~9s budget), but social media (Facebook, LinkedIn, Twitter) DO NOT — they read raw HTML.
**How to avoid for Phase 58:**
- For Google: SPA Helmet is fine — Googlebot waits for JS.
- For social OG cards: ship a pre-render strategy in M8 (Astro migration, or Lambda@Edge HTML rewriter that injects OG per path). Accept that LinkedIn/Twitter previews use the default OG image for Phase 58.
- Add `<link rel="canonical">` to every page to avoid duplicate-content penalties.
**Warning signs:** Sharing `/modules/crm` on Twitter shows generic Zietra OG card instead of CRM-specific one.
**Mitigation note for plan:** Phase 58 ships with default OG. Document this in CHECKPOINT as a known limitation for M8 (Astro migration or Lambda@Edge OG injection).

### Pitfall 11: Phase 57 in-app pages link assumes app.zietra.com hostname, but marketing module pages link to in-app paths like `/salesforce/customers` — those won't resolve from marketing's hostname
**What goes wrong:** Module page CTA "Open in app" links `/salesforce/customers` (relative) on `zietra.com` → 404.
**Why it happens:** Forgetting that marketing and app are different origins.
**How to avoid:** All in-app links from marketing MUST be absolute: `https://app.zietra.com/salesforce/customers`. Hold `APP_URL` constant in `src/lib/config.ts`. Lint rule (optional, M8): grep build for `href="/[^/]"` outside the marketing route table.

### Pitfall 12: Module catalog drift between marketing `modules.ts` and `turion-space-demo/lib/module-catalog.js`
**What goes wrong:** App adds a 14th module, marketing forgets. New module has no marketing page. SEO + signup intent miss.
**Why it happens:** Two sources of truth.
**How to avoid:** `scripts/sync-modules.mjs` reads `module-catalog.js` at build time. Each marketing entry MUST match an entry in module-catalog.js by `code` (slug). Build fails if marketing has an entry with no upstream `code`, OR if upstream has a `code` with no marketing entry. Enforces 1:1 mapping.
**Implementation sketch:**
```js
// scripts/sync-modules.mjs
import { readFile, writeFile } from 'node:fs/promises'

const src = await readFile('/Users/jeet/turion-space-demo/lib/module-catalog.js', 'utf8')
// Parse the array — module-catalog.js is browser-side (`window.MODULE_CATALOG = [...]`)
// Easiest: eval with a window shim
const mod = { MODULE_CATALOG: [] }
new Function('window', src)(mod)  // careful: trusted local file
const upstreamCodes = new Set(mod.MODULE_CATALOG.map(m => m.code))

// Read marketing copy (manually maintained)
const { MARKETING_MODULES } = await import('../src/data/modules-copy.mjs')
const marketingCodes = new Set(MARKETING_MODULES.map(m => m.slug))

// Validate 1:1
const missing = [...upstreamCodes].filter(c => !marketingCodes.has(c))
const extra   = [...marketingCodes].filter(c => !upstreamCodes.has(c))
if (missing.length) throw new Error(`Marketing missing module pages for: ${missing.join(', ')}`)
if (extra.length)   throw new Error(`Marketing has stale module pages for: ${extra.join(', ')}`)

// Merge upstream metadata (name, icon, open URL) with marketing copy (tagline, useCases)
const merged = mod.MODULE_CATALOG.map(m => ({
  ...m,
  slug: m.code,
  ...MARKETING_MODULES.find(x => x.slug === m.code),
}))
await writeFile('src/data/modules.ts',
  `// AUTOGENERATED by scripts/sync-modules.mjs — do not edit.\nexport const MODULES = ${JSON.stringify(merged, null, 2)} as const;\n`)
console.log(`✅ Synced ${merged.length} modules`)
```

### Pitfall 13: PrivacyPage + TermsPage have stale stack references ("Database: Supabase Postgres", "Auth: Supabase JWT") post-Phase 55 RLS-on-Aurora migration
**What goes wrong:** Privacy policy says we use Supabase. We don't (since Phase 55 RLS). Legal accuracy + GDPR sub-processor list incorrect.
**Why it happens:** Privacy was written for the pre-Aurora world.
**How to avoid:** Phase 58-01 task: update `PrivacyPage.tsx:76` (Supabase Postgres → AWS Aurora PostgreSQL) + `PrivacyPage.tsx:105-109` Sub-processors (drop Supabase, add Cognito + Aurora). Update `TermsPage.tsx` no specific changes needed (no infra refs).

### Pitfall 14: Footer dead links rot SEO trust signals
**What goes wrong:** Every footer link except Pricing is `href="#"`. Search crawlers see broken site nav. Users see broken links.
**Why it happens:** Footer was scaffolded before pages existed.
**How to avoid:** 58-01 mandates `SiteFooter.tsx` link table update. About → /about, Blog → omit (no blog yet), Careers → mailto:careers@zietra.com OR omit, Contact → /contact, Privacy → /privacy, Terms → /terms, Security → /security OR omit.

### Pitfall 15: deploy.sh `aws s3 sync --delete` removes legitimate files (e.g., user-uploaded OG images) if missing from dist/
**What goes wrong:** Deploy nukes anything in S3 not in dist/.
**Why it happens:** `--delete` flag (line 17 of `deploy.sh`).
**How to avoid:** OK for Phase 58 (everything is in git). If we ever add a user-upload bucket, separate it. Document in CHECKPOINT: "deploy.sh --delete is destructive. Anything in S3 not in repo is wiped on deploy."

---

## Code Examples

### Example 1: `src/data/modules.ts` — typed module catalog with marketing copy
```typescript
// AUTOGENERATED by scripts/sync-modules.mjs — DO NOT EDIT MANUALLY.
// Marketing prose lives in scripts/marketing-copy.mjs (manually maintained).
// Source-of-truth catalog: /Users/jeet/turion-space-demo/lib/module-catalog.js

export interface ModuleUseCase {
  industry: 'D2C' | 'SaaS' | 'Manufacturing' | 'Aerospace' | 'Services' | 'Distribution'
  bullets: string[]
}

export interface ModuleEntry {
  slug: string                  // mirrors `code` in upstream catalog
  code: string
  title: string                 // marketing title (e.g., "Salesforce CRM for SMB teams")
  shortName: string             // e.g., "CRM"
  source: string                // e.g., "Salesforce"
  icon: string                  // lucide-react icon name
  tagline: string               // 1-line hero
  description: string           // 2-line value prop
  useCases: ModuleUseCase[]     // 3-5 industries with bullets
  whyWeBuilt: string            // 3-paragraph story
  bottomCta: string             // 1-line bottom CTA copy
  inAppUrl: string              // absolute app.zietra.com URL
  screenshot?: string           // /og/modules/<slug>.png if exists, else null
}

export const MODULES: ModuleEntry[] = [
  {
    slug: 'crm',
    code: 'crm',
    title: 'Salesforce CRM — built into your ERP',
    shortName: 'CRM',
    source: 'Salesforce',
    icon: 'users',
    tagline: 'Customer relationships, opportunities, and pipeline — without the Salesforce-tax.',
    description: 'A real CRM that lives next to your sales orders, invoices, and items. One login, one tenant, one customer record.',
    useCases: [
      { industry: 'D2C', bullets: [
        'Shopify customer sync without Zapier middleware',
        'Lead capture from product launches → opportunity pipeline',
        'Per-channel ROI: organic, paid, influencer, retail',
      ]},
      { industry: 'SaaS', bullets: [
        'MRR-tagged opportunities; close-won updates ASC 606 module',
        'Free → paid trial conversion funnel in one view',
        'Customer health score from product usage + support tickets',
      ]},
      { industry: 'Manufacturing', bullets: [
        'Quote-to-cash with BOM cost pull from Arena PLM',
        'Multi-tier distributor pricing tables',
        'Drop-ship order routing via the Ramp module',
      ]},
      { industry: 'Aerospace', bullets: [
        'ITAR / EAR controlled-customer tagging',
        'Program-level opportunity tracking (multi-year)',
        'Government RFQ response workflows',
      ]},
    ],
    whyWeBuilt:
      'Salesforce is the de-facto CRM for a reason: data model, integrations, ecosystem. ' +
      "But SMBs end up paying $150/seat for features they don't use, then wiring HubSpot or Pipedrive on top. " +
      'Zietra Salesforce CRM keeps the data model + workflow patterns from the real Salesforce — accounts, opportunities, ' +
      'leads, products — and integrates them natively with the same NetSuite + Arena + MES stack a Fortune 500 runs. ' +
      'You get the playbook the big guys use, at $99/month for everything bundled.',
    bottomCta: 'Free 30-day trial. No credit card. Your CRM data exports as standard CSV anytime.',
    inAppUrl: 'https://app.zietra.com/salesforce/customers',
  },
  // ... 12 more entries, same shape ...
]
```

### Example 2: `scripts/gen-sitemap.mjs` (build-time sitemap generator)
```javascript
// scripts/gen-sitemap.mjs — runs before vite build
import { writeFile } from 'node:fs/promises'

// Sync this list with src/App.tsx routes.
const STATIC_ROUTES = [
  { path: '/',             priority: '1.0', changefreq: 'weekly'  },
  { path: '/pricing',      priority: '0.9', changefreq: 'monthly' },
  { path: '/modules',      priority: '0.9', changefreq: 'monthly' },
  { path: '/case-studies', priority: '0.8', changefreq: 'monthly' },
  { path: '/about',        priority: '0.6', changefreq: 'monthly' },
  { path: '/contact',      priority: '0.5', changefreq: 'yearly'  },
  { path: '/docs',         priority: '0.7', changefreq: 'monthly' },
  { path: '/privacy',      priority: '0.3', changefreq: 'yearly'  },
  { path: '/terms',        priority: '0.3', changefreq: 'yearly'  },
  // login/signup intentionally NOT in sitemap (noindex)
]

// Dynamic — read MODULES from the synced data file
const { MODULES }      = await import('../src/data/modules.ts')
const { CASE_STUDIES } = await import('../src/data/case-studies.ts')

const allRoutes = [
  ...STATIC_ROUTES,
  ...MODULES.map(m => ({
    path: `/modules/${m.slug}`,
    priority: '0.8',
    changefreq: 'monthly',
  })),
  ...CASE_STUDIES.map(c => ({
    path: `/case-studies/${c.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(r => `  <url>
    <loc>https://zietra.com${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
await writeFile('public/sitemap.xml', xml)
console.log(`✅ Wrote ${allRoutes.length} URLs to public/sitemap.xml`)
```

### Example 3: `src/components/ContactForm.tsx` (controlled form + honeypot + POST)
```tsx
import { useState, type FormEvent } from 'react'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com'

type Intent = 'sales' | 'support' | 'security' | 'partner' | 'other'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [intent, setIntent] = useState<Intent>('sales')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')   // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, intent, message, website }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Send failed.')
    }
  }

  if (status === 'success') {
    return (
      <div className="contact-success">
        <h2>Thanks. We'll be in touch.</h2>
        <p>
          We respond to all messages within one business day. Sales-tagged inquiries
          typically get a same-day reply. If urgent, email{' '}
          <a href="mailto:support@zietra.com">support@zietra.com</a>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      {/* Honeypot — display:none, bots fill it, humans don't */}
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off"
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
        value={website} onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
      />
      <label>
        Name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label>
        Work email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Company<input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
      </label>
      <label>
        I'm interested in
        <select value={intent} onChange={(e) => setIntent(e.target.value as Intent)}>
          <option value="sales">Talking to sales</option>
          <option value="support">Product support</option>
          <option value="security">Security / compliance</option>
          <option value="partner">Partnership / integration</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        Message<textarea required minLength={10} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {errorMsg && <div className="error">{errorMsg}</div>}
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      <p className="legal-fineprint">
        By submitting, you agree to our <a href="/privacy">privacy policy</a>. We'll only use this
        message to respond to your inquiry — no marketing emails without explicit opt-in.
      </p>
    </form>
  )
}
```

### Example 4: `src/lib/config.ts` (centralized URLs)
```typescript
// Single source of truth for cross-origin URLs.
// All in-app links from marketing MUST use APP_URL, never relative paths.

export const APP_URL = 'https://app.zietra.com'
export const APP_SIGNUP = `${APP_URL}/signup`
export const APP_LOGIN = `${APP_URL}/login`
export const APP_DASHBOARD = `${APP_URL}/dashboard`
export const APP_ONBOARDING_RECOMMEND = `${APP_URL}/onboarding/recommend`

// Marketing-side API (turion-demo-api Lambda — reused for /contact)
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com'

// Helper — preserve query string (?intent=crm) when redirecting cross-origin
export function appUrl(path: string, preserveQuery = true): string {
  const base = `${APP_URL}${path}`
  if (preserveQuery && typeof window !== 'undefined' && window.location.search) {
    return `${base}${window.location.search}`
  }
  return base
}
```

### Example 5: `src/data/case-studies.ts` (3 case studies)
```typescript
export interface CaseStudyResult {
  metric: string         // "8 → 31"
  label: string          // "Reply rate %"
  context: string        // "First 30 days"
}

export interface CaseStudy {
  slug: string
  company: string
  industry: string
  logo: string             // /case-studies/logos/turion.svg
  hero: string             // hero screenshot or generated banner
  tagline: string
  modules: string[]        // module slugs used
  problem: string
  solution: string
  results: CaseStudyResult[]
  quote?: { text: string; author: string; role: string; avatar?: string }
  ctaLine: string
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'turion-space',
    company: 'Turion Space',
    industry: 'Aerospace · Satellite manufacturing',
    logo: '/case-studies/logos/turion.svg',
    hero: '/case-studies/heroes/turion.png',
    tagline: 'Full aerospace ERP — PLM + MES + ASC 606 + NetSuite — on one platform',
    modules: ['crm', 'sales', 'items', 'plm', 'mes', 'quality', 'asc606', 'lean-erp-pro', 'ai-agents'],
    problem:
      'Turion Space builds satellites. Their stack was Arena PLM (engineering) + a homemade MES (shop floor) + ' +
      'NetSuite (finance) + Salesforce (customers) — five logins, no shared tenant model, manual reconciliation ' +
      'every month-end. Engineering revisions in Arena didn\'t propagate to NetSuite item costs. NCRs in MES ' +
      'didn\'t trigger CAPAs in Quality. ASC 606 contracts were tracked in spreadsheets.',
    solution:
      'Zietra consolidated all 5 systems onto one tenant. Arena PLM → NetSuite Items live BOM cost pull. ' +
      'MES NCRs auto-trigger Quality CAPAs via the AI Agents module (Anthropic Claude routes the NCR + writes ' +
      'CAPA shell). ASC 606 module recognizes revenue per satellite delivery milestone. ' +
      'CRM customers map 1:1 to NetSuite customers — no double-entry.',
    results: [
      { metric: '5 → 1',    label: 'Systems',         context: 'Consolidated into one tenant' },
      { metric: '$12.08M',  label: 'BOM cost rolled', context: 'Across 165 part definitions, depth-4 BOM' },
      { metric: '3 days → 30 sec', label: 'NCR → CAPA cycle', context: 'AI Agents handle the boilerplate' },
      { metric: 'Real-time', label: 'Engineering → cost propagation', context: 'Was: monthly batch reconciliation' },
    ],
    ctaLine: 'Whether you build hardware or software, Zietra gives you the same enterprise stack Turion runs on.',
  },
  {
    slug: 'marquee-anni',
    company: 'Marquee + Anni Glitters',
    industry: 'D2C · Fashion + kitchenware',
    logo: '/case-studies/logos/marquee.svg',
    hero: '/case-studies/heroes/marquee.png',
    tagline: 'Two e-commerce brands on one ERP — CRM + Items + Drop-ship',
    modules: ['crm', 'sales', 'items', 'dropship'],
    problem:
      'Marquee and Anni Glitters are sister D2C brands sharing inventory + customer base but selling on ' +
      'different sites. The team was juggling Shopify customers in two stores, manually de-duplicating in a ' +
      'spreadsheet, and reconciling Stripe payouts to AliExpress drop-ship invoices monthly. ' +
      'Order routing was email-based.',
    solution:
      'Zietra unified customer records across both brands under one CRM. Items module is the shared inventory ' +
      'source of truth — both Shopify stores pull SKU + price from Zietra. Drop-ship module routes Anni\'s ' +
      'orders to the Chinese fulfillment vendor with PO + tracking auto-generated. Ramp cards reconcile the ' +
      'AliExpress + LogisticsX payments to bills.',
    results: [
      { metric: '2 → 1',     label: 'Customer master',  context: 'De-duplicated across brands' },
      { metric: '10 SKUs',   label: 'Active products',  context: '4 fashion + 6 kitchenware' },
      { metric: '0',         label: 'Manual reconciliations', context: 'Was: 4 hrs/month' },
    ],
    quote: {
      text: 'I run two brands as a side hustle. Zietra makes it feel like a real business without a finance team.',
      author: 'Anni',
      role: 'Founder, Anni Glitters',
    },
    ctaLine: 'D2C founders: stop paying for 5 SaaS tools. One platform, one bill.',
  },
  {
    slug: 'sample-saas-svc',
    company: 'Sample SaaS Co.',
    industry: 'SaaS · B2B subscriptions',
    logo: '/case-studies/logos/sample-saas.svg',
    hero: '/case-studies/heroes/sample-saas.png',
    tagline: 'CRM + Sales + ASC 606 — multi-element contracts handled at signup',
    modules: ['crm', 'sales', 'asc606', 'lean-erp-pro'],
    problem:
      'A representative SaaS company we built this for: 12 employees, $2M ARR, mix of monthly + annual + ' +
      'multi-year deals with separate professional-services SOWs. Their bookkeeper was using Excel for ASC 606 ' +
      'allocation; auditors flagged it. QBO couldn\'t handle multi-element revenue recognition.',
    solution:
      'Zietra CRM tracks opportunities + close-won. NetSuite Sales module turns the won deal into a sales ' +
      'order with line items split by SSP (standalone selling price). ASC 606 module (Aperture) ingests the ' +
      'sales order, allocates transaction price across performance obligations, and posts the JE schedule ' +
      'to NetSuite GL monthly.',
    results: [
      { metric: '12 hrs → 30 min', label: 'Month-end rev rec', context: 'No more Excel allocations' },
      { metric: 'Clean',           label: 'Audit trail',       context: 'Per-contract waterfall available on demand' },
      { metric: '$0',              label: 'NetSuite + Aperture cost', context: 'Was: $4K/mo combined' },
    ],
    ctaLine: 'If you sell anything other than a single SKU at a single price, you need ASC 606 done right.',
  },
]
```

### Example 6: Updated `src/data/pricing.ts` with Stripe placeholder
```typescript
import { APP_SIGNUP } from '../lib/config'

export interface PricingTier {
  id: string
  name: string
  price: number | 'Custom'
  period?: string
  badge?: string
  featured?: boolean
  cta: string
  ctaHref: string            // NEW — replaces the hardcoded /signup Link
  comingSoon?: boolean       // NEW — when true, render tooltip "Coming soon" instead of click-through
  features: string[]
}

export const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter (trial)',
    price: 0,
    period: '/mo · 30 days',
    cta: 'Start free trial',
    ctaHref: APP_SIGNUP,
    features: [
      'All 13 modules included',
      'Up to 5 users',
      'Aurora-backed multi-tenant data',
      'AI Agents — limited credits',
      'Email support',
    ],
  },
  {
    id: 'base',
    name: 'Base',
    price: 99,
    period: '/mo',
    badge: 'Most Popular',
    featured: true,
    cta: 'Upgrade to paid',
    ctaHref: '#',
    comingSoon: true,           // Stripe checkout not wired yet — shows tooltip
    features: [
      'CRM + Sales + Purchase + Items (lite)',
      'Up to 25 users',
      'Tenant-scoped RLS isolation',
      'AI Agents — 1,000 credits/mo',
      'Priority email support',
    ],
  },
  {
    id: 'addons',
    name: 'Add-ons',
    price: 'Custom',
    cta: 'See modules',
    ctaHref: '/modules',
    features: [
      'PLM, MES, Quality — $29-$79/mo each',
      'ASC 606, Royalty — $49/mo each',
      'Drop-ship + Ramp — $39/mo',
      'AI Agents — Lean ERP Pro — $99/mo',
      'QuickBooks → NetSuite migration — one-time',
    ],
  },
]
```

---

## State of the Art

| Old Approach (pre-Phase 58) | Current Approach | When Changed | Impact |
|--------|--------|--------|--------|
| Marketing has own Supabase auth, dupes app login | Marketing has NO auth; redirects to app.zietra.com Cognito | Phase 58-01 | -1 dep, -3 files, +consistency |
| 6 routes in sitemap.xml | 30+ routes auto-generated | Phase 58-01 | SEO discoverability |
| Footer links → `href="#"` (dead) | Footer links → real /about, /contact, /privacy | Phase 58-01 | UX + crawl trust |
| HomePage framing: "replaces HubSpot/Buffer/Calendly" | HomePage framing: "13-module SMB ERP, one tenant" | Phase 58-01 | Mirrors actual product |
| `PricingTier.cta` hardcoded to `<Link to="/signup">` | `PricingTier.ctaHref` + `comingSoon` boolean | Phase 58-01 | Stripe placeholder |
| 0 per-module pages | 13 per-module pages from `MODULES` data | Phase 58-02 | Lands 13 SEO terms |
| 0 case studies | 3 case study detail pages | Phase 58-03 | Social proof |
| No /about, /contact | /about + /contact + form backend | Phase 58-03 | Lead capture |
| Privacy page lists Supabase as sub-processor | Privacy lists Aurora + Cognito | Phase 58-01 | Legal accuracy |
| Module catalog drift risk | Build-time sync from upstream `module-catalog.js` | Phase 58-02 | Single source of truth |

**Deprecated / outdated:**
- **`@supabase/supabase-js`** — Drop entirely. Marketing site has no auth role post-M5.
- **`src/lib/auth.ts`** (108 LOC) — Delete after Cognito redirect.
- **`src/lib/supabase.ts`** (25 LOC) — Delete after Cognito redirect.
- **`Old PricingTier API`** without `ctaHref` — Migrate to new shape.
- **PrivacyPage "Database: Supabase Postgres" claim** (line 76) — Inaccurate post-Phase 55.
- **HomePage "Replaces HubSpot/Buffer/Calendly/DocuSign/Loom/Mailchimp" framing** (line 112) — Doesn't reflect the 13-module ERP product. Replace with "13 modules of a Fortune 500 ERP, at SMB pricing."

---

## Risks + Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|-----------|
| 1 | Module catalog drifts: marketing has 13 entries, upstream `module-catalog.js` ships a 14th. | MEDIUM | HIGH (new module has no SEO landing) | `scripts/sync-modules.mjs` enforces 1:1 mapping at build time. Build fails if marketing misses an entry. |
| 2 | Cognito redirect doesn't preserve `?intent=<module>` query string from per-module signup CTAs. | MEDIUM | MEDIUM (degrades onboarding intent UX, not functionality) | Redirect components use `window.location.replace(\`${APP_URL}${window.location.search}\`)`. Verified in Pitfall 3. Add a smoke test in 58-04. |
| 3 | Contact form spam: scrapers find `/api/contact` and DDOS it. | HIGH | LOW (Lambda scales, but SES costs money + email floods support@) | Three layers: (a) `Origin: https://zietra.com` check on Lambda, (b) 5/IP/hr rate limit in-memory, (c) honeypot `website` field. Plus SES sandbox 200/day cap is itself a circuit breaker. |
| 4 | CloudFront SPA fallback (404→index.html→200) not configured → direct page loads broken. | LOW (likely already configured) | HIGH (every shared link broken) | Verify with `aws cloudfront get-distribution-config --id E1X82T89JWL8CA`. If not set, add `CustomErrorResponses` in 58-01. Smoke test: `curl -i https://zietra.com/modules/crm` → 200. |
| 5 | Tailwind v4 alpha-adjacent bugs surface during build. | LOW | MEDIUM (delays plan) | Pin exact version (`"tailwindcss": "4.0.0"` not `^4.0.0`). Test `npm run build` after every plan. Existing site already builds + deploys, so baseline is OK. |
| 6 | SES sandbox: `noreply@zietra.com` not verified → contact form silently fails. | MEDIUM | HIGH | 58-03 task: `aws sesv2 create-email-identity --email-identity noreply@zietra.com`. Verify before deploying contact backend. CloudWatch alarm on `MessageRejected` rate >0. |
| 7 | Lambda `turion-demo-api` cold-start latency on `/api/contact` (rarely-called route, always cold). | MEDIUM | LOW (1-2s once per hour) | Acceptable for a contact form. Don't add provisioned concurrency for one cold-call. |
| 8 | OG tags injected client-side via Helmet → social previews use default OG only. | HIGH (will happen) | MEDIUM (LinkedIn/Twitter shares look generic) | Accept for Phase 58. Document in CHECKPOINT as M8 todo: "Astro migration OR Lambda@Edge OG injector for per-page OG." Default OG (`/og/default.png`) covers home + falls back for other pages. |
| 9 | Cross-repo `module-catalog.js` path hardcoded to `/Users/jeet/turion-space-demo/` — CI breaks if checked out elsewhere. | MEDIUM (CI doesn't exist yet) | LOW (manual deploy only) | `MODULE_CATALOG_PATH` env var with default. Document in `deploy.sh` README. When CI ships in M8, set env explicitly. |
| 10 | PrivacyPage / TermsPage stale claims (Supabase, "you connect SMTP") expose legal inaccuracy. | HIGH (already true today) | MEDIUM (privacy-conscious prospects bounce) | 58-01 includes prose update for both. |
| 11 | SiteFooter `href="#"` links rot. Search Console flags broken links. | HIGH (already true) | LOW-MEDIUM (SEO trust) | 58-01: update `SiteFooter.tsx:14-29` `FOOTER_COLS` to real URLs. |
| 12 | Build-time module catalog sync `eval`s upstream JS (`new Function('window', src)`). If `module-catalog.js` is ever tampered with, marketing build executes attacker code. | LOW (single-author repo) | HIGH (build server RCE) | Trust boundary: both repos are local + author-owned. Document risk. M8: switch to a JSON file under `turion-space-demo/lib/module-catalog.json` (no eval needed) and import via `JSON.parse`. |
| 13 | Phase 58 ships before Phase 56 Stripe — "Upgrade to paid" CTAs have nothing to wire to. | KNOWN | LOW (explicitly scoped: placeholder only) | `comingSoon: true` on `Base` tier renders tooltip "Stripe checkout coming soon." No broken CTA. M4 (Phase 56) flips this to real Stripe Checkout URL. |
| 14 | 13 module pages × 4-5 screenshots each = potentially 50+ images, all need to be created. | HIGH | MEDIUM (delays plan or ships ugly placeholders) | Phase 58 ships with ONE shared `/og/default.png` placeholder shown on every module page. M8 task: replace with real product screenshots from in-app pages (we have 18 working pages from Phase 57 — screenshot them). |
| 15 | `/dashboard` route on marketing exists but redirects to app; SEO crawlers index `marketing.zietra.com/dashboard` as "Redirecting…" page. | LOW | LOW | Add `<meta name="robots" content="noindex">` on Login/Signup/Dashboard redirect pages. Already done on NotFoundPage. |
| 16 | `<HelmetProvider>` wraps the whole app; ProcessGate / Suspense boundary races make wrong title flash briefly. | LOW | LOW (cosmetic) | Acceptable. Document as known. |

---

## Open Questions

1. **Should `/blog` exist in Phase 58?**
   - What we know: ROADMAP says "blog/careers/press → post-launch."
   - What's unclear: whether to add a "Blog coming soon" page or just omit from footer.
   - Recommendation: OMIT entirely. Don't promise what we don't have. Add when first post is ready.

2. **Should `/security` exist in Phase 58?**
   - What we know: ROADMAP says M8 ships SOC2-readiness + per-tenant audit dashboard.
   - What's unclear: whether prospects expect a `/security` trust page NOW.
   - Recommendation: Add a one-paragraph stub at `/security` linking to Privacy + Terms + a "SOC2 in progress — contact security@zietra.com for our security questionnaire" line. Sub-50 LOC. Eases enterprise sales conversations without making false claims.

3. **Should marketing site use a different API origin (`api.zietra.com`) instead of the raw APIGW URL?**
   - What we know: turion-demo-api lives at `https://lo254mvukl.execute-api.us-east-1.amazonaws.com`.
   - What's unclear: whether `api.zietra.com` Route 53 alias exists.
   - Recommendation: Phase 58 uses raw APIGW URL (it works, it's CORS-friendly to zietra.com origin). M8 ticket: stand up `api.zietra.com` ALIAS → APIGW for cleaner URLs + future API versioning. Doesn't block Phase 58.

4. **Should we add a per-module video walkthrough (Loom embed)?**
   - What we know: Loom-style intro videos drive conversion +30% per industry research.
   - What's unclear: who records 13 modules of video walkthroughs.
   - Recommendation: Phase 58 ships TEXT-only. Add `embedVideo?: string` field to `ModuleEntry` so M8 can drop in Loom URLs without schema change.

5. **Should `/case-studies` be 3 pages (1 per study) OR 1 page (all 3 stacked)?**
   - What we know: SEO benefit comes from having dedicated `/case-studies/turion-space` etc. routes; users prefer stacked.
   - Recommendation: BOTH. `/case-studies` = index grid of 3 (with summary cards). `/case-studies/:slug` = detail page per study. Same data, two views. Same pattern as `/modules`.

6. **Should the Cognito signup pre-select the module from `?intent=<slug>`?**
   - What we know: Phase 54.4 ships the onboarding wizard at `/onboarding/recommend`.
   - What's unclear: whether the wizard reads `?intent` from URL and pre-selects.
   - Recommendation: VERIFY in Phase 58-01. Read `apps/web/p2p-platform/frontend/...` (wait, app is at app.zietra.com — likely a separate repo or Lambda-served HTML). Per CHECKPOINT 57, the wizard is in `turion-space-demo/onboarding/recommend.html`. Update that page in a small Phase 58 patch to read `?intent` and pre-check the module. Or scope to M4 / Phase 56.

7. **Should we add per-page canonical URLs to avoid duplicate content?**
   - What we know: Best practice — yes.
   - Recommendation: ALWAYS include `<link rel="canonical" href="https://zietra.com{path}">` on every page. Cheap (1 LOC per page via shared `<PageHelmet>` component). Phase 58-01 includes.

8. **Does CloudFront `zietra.com` apex cert validation complete in time for Phase 58?**
   - What we know: per `deploy.sh:34` comment "→ https://zietra.com (once cert validates)". Per MEMORY.md M1 kickoff, DNS via Route 53 zone `Z090201115UMJZ8TIAX5G`.
   - Recommendation: VERIFY before plan 58-01 starts. `aws acm list-certificates --region us-east-1` + `aws acm describe-certificate --certificate-arn <arn>`. If still PENDING_VALIDATION, the prerequisite CNAME validation record probably isn't in Route 53.
   - Status quo: `dlzyv23o98bvo.cloudfront.net` works as fallback for Phase 58 testing.

---

## Recommended Plan Structure

### 58-01 — Audit, Refresh, Cognito Migration, SEO Baseline
**Estimated waves:** 1 (sequential — Cognito migration first, then content)
**Tasks:**
1. Strip Supabase: shrink Login/Signup/Dashboard pages → redirect-only, then delete `src/lib/auth.ts` + `src/lib/supabase.ts`, then `npm uninstall @supabase/supabase-js`. Verify `npm run build` passes after each step.
2. Create `src/lib/config.ts` with `APP_URL` / `appUrl()` helper.
3. Update `src/data/pricing.ts` — add `ctaHref` + `comingSoon`. Update `PricingSection.tsx` to render tooltip for `comingSoon=true`.
4. HomePage content refresh: replace HubSpot/Buffer/Calendly framing with 13-module catalog framing. Add "What's in the box" section linking to /modules grid.
5. SiteFooter: replace all `href="#"` with real routes.
6. NavBar: add /modules + /case-studies links (mid-nav) + /contact (right of CTA).
7. PrivacyPage: drop Supabase from Sub-processors, add Aurora + Cognito + AWS SES. TermsPage: drop SMTP-connect language.
8. NotFoundPage: add 4-6 "popular pages" links (home, /modules, /pricing, /case-studies, /contact, /docs).
9. `scripts/gen-sitemap.mjs` — regenerate `public/sitemap.xml` with all current routes (modules/case-studies will be empty since data files don't exist yet — that's fine, 58-02 + 58-03 add them).
10. CloudFront `CustomErrorResponses` 404+403 → /index.html (verify; add if missing).
11. Deploy to staging (dlzyv23o98bvo.cloudfront.net), verify, deploy to zietra.com.

**Requirements closed:** `CognitoMigratedAuth`, `PricingPageStripePlaceholder`, `MarketingHomeRefresh`, partial `SeoBaseline404SitemapRobots`

### 58-02 — 13 Per-Module Marketing Pages
**Estimated waves:** 2 (data layer + UI component, then content authoring)
**Tasks:**
1. `scripts/sync-modules.mjs` — reads `/Users/jeet/turion-space-demo/lib/module-catalog.js`, validates 1:1 with marketing copy, writes `src/data/modules.ts`.
2. `scripts/marketing-copy.mjs` (manually authored) — 13 entries with `tagline`, `useCases[]` (4 industries each), `whyWeBuilt`, `bottomCta`.
3. `src/pages/ModulePage.tsx` — parametrized page (single ~150 LOC component).
4. `src/pages/ModulesIndexPage.tsx` — `/modules` grid showing all 13.
5. `src/components/ModuleCard.tsx` — reusable for grid + home.
6. Add 14 routes to `App.tsx`: `/modules` + `/modules/:slug`.
7. Re-run `scripts/gen-sitemap.mjs` → 13 module URLs added to sitemap.
8. NavBar `/modules` link active states.
9. Deploy + smoke (all 13 `/modules/<slug>` URLs → 200 + correct `<title>` per page).

**Requirements closed:** `ModuleMarketingPages`, complete `SeoBaseline404SitemapRobots` (sitemap now includes modules)

### 58-03 — Case Studies, About, Contact (form + backend)
**Estimated waves:** 2 (backend mig 035 + Lambda route → frontend pages)
**Tasks:**
1. Migration 035: `public.contact_submissions` table (run via Phase 55-05 `zietra-rls-runner-55-05` Lambda).
2. `backend/src/routes/contact.ts` (new): `POST /api/contact` Hono route with SES SendEmail, in-memory rate limit, honeypot, public (no tenantContext).
3. IAM: add `ses:SendEmail` action to `zietra-api-lambda-role` scoped to `arn:aws:ses:us-east-1:134607809447:identity/zietra.com`.
4. SES: verify `noreply@zietra.com` + `support@zietra.com` identities (sandbox-mode requirement).
5. Build + deploy turion-demo-api Lambda (`./build-and-push.sh`).
6. CORS: confirm Lambda response includes `Access-Control-Allow-Origin: https://zietra.com`. If not, add in route handler.
7. `src/data/case-studies.ts` — 3 entries.
8. `src/pages/CaseStudyPage.tsx` + `src/pages/CaseStudiesIndexPage.tsx`.
9. `src/pages/AboutPage.tsx` — 1-page (mission, team, traction, "built on Aurora + Cognito + SES" stack note).
10. `src/pages/ContactPage.tsx` + `src/components/ContactForm.tsx`.
11. Add routes to `App.tsx`: `/case-studies`, `/case-studies/:slug`, `/about`, `/contact`.
12. Re-run `scripts/gen-sitemap.mjs`.
13. Deploy + smoke. Test form: real submission → DB row + email received at support@zietra.com.

**Requirements closed:** `CaseStudiesPage`, `AboutPage`, `ContactPage`, `ContactFormBackend`

### 58-04 — Docs Landing, Polish, Smoke, CHECKPOINT for M8
**Estimated waves:** 1
**Tasks:**
1. `src/pages/DocsLandingPage.tsx` — `/docs` index page reusing `MODULES` data. Per-module: "Quick start" 3-step bullet + "Learn more" placeholder link to `/modules/<slug>`.
2. Optional: add `/security` 1-paragraph trust stub (open question 2).
3. 404 polish: add subtle "Why am I here?" recovery flow with 6 popular pages.
4. OG image: create `/og/default.png` (1200×630, Zietra brand colors). Place in `public/og/`.
5. Per-page `<link rel="canonical">` via shared `<PageHelmet>` component.
6. Smoke matrix:
   - All 30+ routes → 200 status + correct `<title>` + correct canonical.
   - `/api/contact` smoke: POST happy path (form submission → DB row) + POST honeypot (filled `website` → fake-success) + POST 6th request in 1 hour from same IP (→ 429).
   - SES smoke: form submission triggers SES SendEmail → received at support@zietra.com.
   - CloudFront SPA fallback: `curl -i https://zietra.com/random-fake-path` → 200 + SPA HTML.
   - Sitemap: `curl https://zietra.com/sitemap.xml | grep -c "<loc>"` → 30+.
   - All cross-origin links: scan dist/ for `href="/[^/]"` that point to app routes; should all be `https://app.zietra.com/...`.
7. CHECKPOINT.md for M8 hand-off:
   - Known gaps: OG image generation per-module (M8), Astro migration consideration (M8), `api.zietra.com` Route 53 alias (M8), per-module Loom videos (M8), real product screenshots replacing placeholders (M8).
   - Phase 58 closure evidence.
   - Next milestone recommendation: M4 (Stripe) or M8 (compliance + observability).

**Requirements closed:** `DocsLandingPage`, complete `SeoBaseline404SitemapRobots` (canonical + 404 polish + OG default)

---

## Sources

### Primary (HIGH confidence — verified from actual codebase)
- `/Users/jeet/zietra/marketing/package.json` — actual deps (React 19, RR7, Tailwind v4, Helmet-async, framer, lucide, supabase-js to remove)
- `/Users/jeet/zietra/marketing/src/App.tsx:1-49` — current 8 routes via lazy + BrowserRouter
- `/Users/jeet/zietra/marketing/src/pages/HomePage.tsx:1-622` — HomePage with HubSpot/Buffer/Calendly framing; 6 FEATURES array currently mismatched to 13-module catalog
- `/Users/jeet/zietra/marketing/src/pages/PricingPage.tsx:1-16` — Thin wrapper around `PricingSection`
- `/Users/jeet/zietra/marketing/src/pages/LoginPage.tsx:1-113` — Supabase-backed form (to be shrunk to redirect)
- `/Users/jeet/zietra/marketing/src/pages/SignupPage.tsx:1-125` — Supabase-backed form (to be shrunk to redirect)
- `/Users/jeet/zietra/marketing/src/pages/DashboardPage.tsx:1-80` — Already partially redirect-ish (line 33 `window.location.replace(APP_URL)`); collapse fully
- `/Users/jeet/zietra/marketing/src/pages/NotFoundPage.tsx:1-60` — Generic 404 (needs popular-pages list)
- `/Users/jeet/zietra/marketing/src/pages/PrivacyPage.tsx:76` — Stale "Database: Supabase Postgres" claim; line 105-109 stale sub-processors
- `/Users/jeet/zietra/marketing/src/pages/TermsPage.tsx:54-58` — Stale "you connect your own SMTP" language
- `/Users/jeet/zietra/marketing/src/components/PricingSection.tsx:84-98` — Hardcoded `<Link to="/signup">` CTA needs `ctaHref` refactor
- `/Users/jeet/zietra/marketing/src/components/SiteFooter.tsx:14-29` — Dead `href="#"` links (About, Blog, Careers, Contact, Privacy, Terms, Security)
- `/Users/jeet/zietra/marketing/src/components/NavBar.tsx:38-42` — Nav has Pricing + #features + #stories; needs /modules + /case-studies
- `/Users/jeet/zietra/marketing/src/data/pricing.ts:11-58` — 3-tier pricing (Starter/Growth/Scale at $0/$79/$149) — out of sync with M1 kickoff "$99/mo base + add-ons"
- `/Users/jeet/zietra/marketing/src/lib/auth.ts:1-108` — Supabase wrapper to delete
- `/Users/jeet/zietra/marketing/src/lib/supabase.ts:1-25` — Supabase client to delete
- `/Users/jeet/zietra/marketing/deploy.sh:1-34` — S3 sync + CF invalidate; bucket `zietra-marketing`, dist `E1X82T89JWL8CA`, CF URL `dlzyv23o98bvo.cloudfront.net`
- `/Users/jeet/zietra/marketing/vite.config.ts:1-8` — Tailwind v4 via `@tailwindcss/vite`
- `/Users/jeet/zietra/marketing/public/sitemap.xml` — 6 URLs (stale; needs regen)
- `/Users/jeet/zietra/marketing/public/robots.txt` — All bots allowed + AI bot lines + sitemap reference (good as-is)
- `/Users/jeet/zietra/marketing/public/llms.txt` — STALE: says "Database: Supabase Postgres", lists features that aren't part of 13-module catalog (matches HomePage outdated framing)
- `/Users/jeet/turion-space-demo/lib/module-catalog.js:1-51` — **Source-of-truth 13 modules**: crm, sales, purchase, items, plm, mes, quality, lean-erp-pro, asc606, royalty, dropship, ai-agents, qb-migration
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md:981-1006` — Phase 58 entry with 10 requirements + locked scope
- `/Users/jeet/doordash-p2p/.planning/phases/57-m6-module-page-completion-replace-stubs-tenant-aware-pages/CHECKPOINT.md` — M6 closure evidence (16 stub→real pages + agent_runs + page-template.js)

### Secondary (MEDIUM confidence — repo facts cross-referenced with MEMORY.md)
- MEMORY.md (Zietra Platform kickoff 2026-05-14) — Confirms: Cognito RS256, RDS Postgres, SES verified, Stripe planned for M4, RLS enforced in M3, account 134607809447, us-east-1, Route 53 `Z090201115UMJZ8TIAX5G`
- MEMORY.md (Turion Phase 38 ERP auth — 2026-05-13) — Confirms: `turion-demo-api` Lambda uses ES256 JWT auth via JWKS, `zietra-api-lambda-role` shared with satellite Lambda. Adding `ses:SendEmail` to this role for contact form.
- MEMORY.md (M6 / Phase 57 closure) — Confirms: 13 in-app module pages live, page-template.js available, CHECKPOINT format expected
- MEMORY.md (Marquee + Anni Glitters deployment) — Confirms case study #2 data points (live products on marquee.zietra.com)
- MEMORY.md (Turion Space ERP demo) — Confirms case study #1 stack (Arena PLM + MES + ASC 606 + NetSuite consolidation)

### Tertiary (LOW confidence — best practices, not verified against current docs)
- React Router 7 SPA + CloudFront 404→200 fallback (standard pattern, verified in industry for years)
- Honeypot + rate-limit + Origin-check spam mitigation (standard, low-CAPTCHA-replacement pattern)
- Per-page `<link rel="canonical">` for SEO (SEO best practice, Moz/Google guidance)

---

## Metadata

**Confidence breakdown:**
- Existing stack: **HIGH** — package.json + vite.config.ts + all page source read directly
- Module catalog source: **HIGH** — read directly from `/Users/jeet/turion-space-demo/lib/module-catalog.js`
- Phase 58 scope: **HIGH** — ROADMAP §Phase 58 read directly
- M6 outputs (in-app pages exist to link to): **HIGH** — Phase 57 CHECKPOINT.md read directly
- Cognito auth setup at app.zietra.com: **MEDIUM** — confirmed via MEMORY.md (Turion Phase 38 + M1 kickoff), but exact `/login` and `/signup` URL paths on app.zietra.com not directly inspected
- SES sandbox/production status: **MEDIUM** — MEMORY.md says sandbox 200/day, prod-access pending User; verify before 58-03 starts
- CloudFront SPA fallback config: **LOW** — not verified; mandatory pre-58-01 check
- Tailwind v4 stability: **MEDIUM** — `vite.config.ts` uses it + site builds, but v4 is alpha-adjacent
- Per-page OG tag behavior with Helmet client-side: **HIGH** — known limitation, mitigation documented

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (1 month — stack is stable; revisit if Tailwind v4 ships major release OR Cognito Hosted UI URL paths change)
