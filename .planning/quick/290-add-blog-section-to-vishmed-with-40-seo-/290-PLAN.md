---
phase: quick-290
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/vishmed/src/data/blogPosts.ts
  - apps/vishmed/src/app/blog/page.tsx
  - apps/vishmed/src/app/blog/[slug]/page.tsx
  - apps/vishmed/src/components/layout/Header.tsx
  - apps/vishmed/src/app/page.tsx
autonomous: true
requirements: [Q-290]
must_haves:
  truths:
    - "Blog index at /blog shows all 40 posts with category filter tabs"
    - "Each post at /blog/[slug] renders full content, author, and related posts"
    - "Homepage shows a 'Latest from the Blog' section with 3 most recent posts"
    - "Header nav includes a Blog link (desktop + mobile)"
    - "Each post page has BlogPosting schema markup"
    - "All 40 posts have unique slugs and naturally spread dates (Feb 2025 – Mar 2026)"
  artifacts:
    - path: "apps/vishmed/src/data/blogPosts.ts"
      provides: "All 40 blog post definitions (slug, title, category, date, excerpt, readTime, content)"
      min_lines: 800
    - path: "apps/vishmed/src/app/blog/page.tsx"
      provides: "Blog index with category filter tabs and post grid"
      exports: ["default (BlogIndexPage)", "metadata"]
    - path: "apps/vishmed/src/app/blog/[slug]/page.tsx"
      provides: "Dynamic individual post page with full content + sidebar"
      exports: ["default (BlogPostPage)", "generateStaticParams", "generateMetadata"]
  key_links:
    - from: "apps/vishmed/src/app/blog/[slug]/page.tsx"
      to: "apps/vishmed/src/data/blogPosts.ts"
      via: "find by slug"
      pattern: "blogPosts\\.find"
    - from: "apps/vishmed/src/app/page.tsx"
      to: "apps/vishmed/src/data/blogPosts.ts"
      via: "slice(0,3) most recent"
      pattern: "blogPosts\\.slice"
---

<objective>
Add a complete blog system to the VishMed Next.js site: 40 SEO-optimized posts across 6 medical categories, a filterable blog index page, individual post pages with schema markup, a homepage blog preview section, and a Blog nav link.

Purpose: Drive organic search traffic via long-tail medical/weight-loss keywords targeting Orlando, FL and Central Florida patients.
Output: /blog (index), /blog/[slug] (40 post pages), updated homepage, updated header nav.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@apps/vishmed/src/lib/config.ts
@apps/vishmed/src/app/page.tsx
@apps/vishmed/src/components/layout/Header.tsx
@apps/vishmed/src/app/layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create blogPosts.ts data file with all 40 posts</name>
  <files>apps/vishmed/src/data/blogPosts.ts</files>
  <action>
Create `apps/vishmed/src/data/blogPosts.ts` (create `src/data/` directory too). Define and export the `BlogPost` TypeScript interface and the `blogPosts` array containing all 40 posts sorted newest-first.

TypeScript interface:
```ts
export type BlogCategory =
  | 'weight-loss'
  | 'primary-care'
  | 'telehealth'
  | 'chronic-conditions'
  | 'womens-mens-health'
  | 'local-orlando'

export interface BlogPost {
  slug: string
  title: string
  category: BlogCategory
  date: string          // ISO 8601, e.g. "2025-02-03"
  excerpt: string       // 1-2 sentences, 120-160 chars
  readTime: number      // minutes
  content: string       // Full HTML body, ~400-600 words per post
}
```

DATE ASSIGNMENTS (from constraints — do NOT deviate):
- Post 1 (semaglutide-vs-tirzepatide): 2025-02-03
- Post 2 (wegovy-vs-ozempic): 2025-02-11
- Post 3 (zepbound-vs-mounjaro): 2025-02-24
- Post 4 (how-glp1-works): 2025-03-07
- Post 5 (semaglutide-first-month): 2025-03-19
- Post 6 (glp1-side-effects): 2025-04-02
- Post 7 (compounded-semaglutide): 2025-04-14
- Post 8 (glp1-candidacy): 2025-04-28
- Post 9 (ozempic-weight-loss-timeline): 2025-05-05
- Post 10 (weight-loss-maintenance): 2025-05-16
- Post 11 (medical-weight-loss-vs-fad-diets): 2025-05-29
- Post 12 (semaglutide-microdosing): 2025-06-03
- Post 13 (why-annual-physical): 2025-06-17
- Post 14 (first-primary-care-visit): 2025-06-25
- Post 15 (primary-care-vs-urgent-care): 2025-07-08
- Post 16 (lower-blood-pressure-naturally): 2025-07-21
- Post 17 (cholesterol-numbers-explained): 2025-07-30
- Post 18 (diabetes-early-warning-signs): 2025-08-04
- Post 19 (thyroid-symptoms-treatment): 2025-08-18
- Post 20 (preventive-screenings-by-age): 2025-08-27
- Post 21 (how-telehealth-works): 2025-09-09
- Post 22 (conditions-treated-via-telehealth): 2025-09-22
- Post 23 (telehealth-vs-in-person): 2025-09-30
- Post 24 (prescription-refill-telehealth): 2025-10-06
- Post 25 (telehealth-insurance-coverage): 2025-10-15
- Post 26 (managing-type-2-diabetes): 2025-10-28
- Post 27 (hypertension-treatment): 2025-11-03
- Post 28 (insulin-resistance): 2025-11-17
- Post 29 (asthma-copd-management): 2025-11-26
- Post 30 (hypothyroidism-vs-hyperthyroidism): 2025-12-04
- Post 31 (womens-health-screenings): 2025-12-16
- Post 32 (mens-health-screenings): 2025-12-29
- Post 33 (hormonal-imbalance-signs): 2026-01-07
- Post 34 (mental-health-screening): 2026-01-20
- Post 35 (primary-care-doctor-orlando): 2026-01-30
- Post 36 (weight-loss-clinic-orlando): 2026-02-10
- Post 37 (glp1-doctor-orlando): 2026-02-24
- Post 38 (telehealth-orlando): 2026-03-05
- Post 39 (internal-medicine-vs-family-medicine): 2026-03-18
- Post 40 (new-to-orlando-healthcare): 2026-03-25

CATEGORY ASSIGNMENTS:
- weight-loss: posts 1–12 (slugs: semaglutide-vs-tirzepatide through semaglutide-microdosing)
- primary-care: posts 13–20 (slugs: why-annual-physical through preventive-screenings-by-age)
- telehealth: posts 21–25 (slugs: how-telehealth-works through telehealth-insurance-coverage)
- chronic-conditions: posts 26–30 (slugs: managing-type-2-diabetes through hypothyroidism-vs-hyperthyroidism)
- womens-mens-health: posts 31–34 (slugs: womens-health-screenings through mental-health-screening)
- local-orlando: posts 35–40 (slugs: primary-care-doctor-orlando through new-to-orlando-healthcare)

CONTENT REQUIREMENTS per post:
- excerpt: 1-2 sentences, 120–160 characters, keyword-rich, natural medical tone
- readTime: 3–5 minutes (compute from content length; 400-word posts = 3 min, 600-word posts = 5 min)
- content: Full HTML string (~400–600 words). Use `<h2>`, `<p>`, `<ul>/<li>` tags. Include:
  - Opening hook paragraph
  - 2–3 H2 subheadings with substantive paragraphs
  - Bullet list (where relevant)
  - Closing paragraph with a call to action mentioning "Vish Medical" or "Dr. Pillay" and linking to /contact or /pricing
  - Natural keyword usage — match title's primary keyword phrase 3–5 times across the post

CONTENT GUIDANCE (key facts to weave in accurately):
- GLP-1 posts: semaglutide (Ozempic/Wegovy brand names), tirzepatide (Mounjaro/Zepbound). Average 15-20% body weight loss. Physician-supervised. Side effects: nausea, vomiting, constipation. Cost: mention $99 consultation fee where relevant.
- Primary care posts: Dr. Pillay is Internal Medicine physician, 10+ years experience. Hours: Mon-Fri 5pm-8pm, Sat 9am-4pm. Orlando, FL / Central Florida area.
- Telehealth posts: Mon-Fri evenings, virtual appointments, same-day possible, prescriptions available.
- Local Orlando posts: Address 9486 Narcoossee Rd, Orlando, FL 32827. Mention Lake Nona area. Accepting new patients.
- DO NOT invent stats, drug dosage specifics, or FDA approval dates — keep content accurate and general.

Sort `blogPosts` array newest-first (post 40 first, post 1 last) so `blogPosts.slice(0,3)` returns the 3 most recent.

Export `CATEGORY_LABELS` map for display names:
```ts
export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  'weight-loss': 'Weight Loss',
  'primary-care': 'Primary Care',
  'telehealth': 'Telehealth',
  'chronic-conditions': 'Chronic Conditions',
  'womens-mens-health': "Women's & Men's Health",
  'local-orlando': 'Local Orlando',
}
```
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/vishmed && npx tsc --noEmit 2>&1 | head -30`
Check: `wc -l /Users/jeet/doordash-p2p/apps/vishmed/src/data/blogPosts.ts` — should be 800+ lines
  </verify>
  <done>blogPosts.ts compiles with no TypeScript errors, contains 40 posts with unique slugs, unique dates matching the date distribution table, sorted newest-first, and full HTML content per post.</done>
</task>

<task type="auto">
  <name>Task 2: Build blog index page (/blog) and individual post page (/blog/[slug])</name>
  <files>
    apps/vishmed/src/app/blog/page.tsx
    apps/vishmed/src/app/blog/[slug]/page.tsx
  </files>
  <action>
**A. Blog Index: `apps/vishmed/src/app/blog/page.tsx`**

This is a Server Component (no 'use client'). It needs category filter tabs — use URL search params for filtering (searchParams prop) so it works without client JS and is crawlable.

```
export const metadata: Metadata = {
  title: 'Health & Wellness Blog | Vish Medical',
  description: 'Expert health articles from Dr. Arpana Pillay on weight loss, primary care, telehealth, and chronic conditions in Orlando, FL.',
}
```

Layout:
- Page header: "Health & Wellness Blog" h1, tagline "Evidence-based insights from Dr. Arpana Pillay"
- Category filter bar: "All" + one tab per category. Active tab = bg-primary text-white, inactive = bg-white border. Each tab is a `<Link href="/blog?category=weight-loss">` etc. so no JS needed.
- Post grid: 3-column on lg, 2-column on md, 1-column on sm
- Post card: Category badge (colored pill by category), date (formatted "Month DD, YYYY"), title as h2, excerpt, "Read More →" link to /blog/[slug], read time
- If no posts in filter: "No posts found" fallback

Category badge colors (Tailwind):
- weight-loss: bg-emerald-100 text-emerald-700
- primary-care: bg-blue-100 text-blue-700
- telehealth: bg-purple-100 text-purple-700
- chronic-conditions: bg-orange-100 text-orange-700
- womens-mens-health: bg-pink-100 text-pink-700
- local-orlando: bg-sky-100 text-sky-700

Filtering logic:
```ts
const category = searchParams?.category as BlogCategory | undefined
const filtered = category ? blogPosts.filter(p => p.category === category) : blogPosts
```

**B. Individual Post: `apps/vishmed/src/app/blog/[slug]/page.tsx`**

Server Component. Use `generateStaticParams` to pre-render all 40 slugs at build time.

```ts
export async function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}
export async function generateMetadata({ params }) {
  const post = blogPosts.find(p => p.slug === params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${siteConfig.siteUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Dr. Arpana Pillay'],
    },
  }
}
```

Layout (2-column on lg: main content left, sidebar right):
- Breadcrumb: Home > Blog > [Title]
- Category badge + date + read time row
- H1 = post.title (font-heading, text-3xl)
- Author row: "By Dr. Arpana Pillay, Internal Medicine Physician" with avatar placeholder (w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center "AP")
- Content area: `<article dangerouslySetInnerHTML={{ __html: post.content }} />` with prose styling class `prose prose-slate max-w-none`
- Sidebar (lg only, sticky top-24):
  - "Related Posts" card — find 3 posts with same category (excluding current), show title + date as links
  - "Book an Appointment" CTA card: bg-primary text-white, links to /contact

Add BlogPosting JSON-LD schema on each post page (use SchemaMarkup component already at `@/components/ui/SchemaMarkup`):
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{post.title}",
  "description": "{post.excerpt}",
  "datePublished": "{post.date}",
  "dateModified": "{post.date}",
  "author": {
    "@type": "Person",
    "name": "Dr. Arpana Pillay",
    "jobTitle": "Internal Medicine Physician",
    "worksFor": { "@type": "MedicalClinic", "name": "Vish Medical" }
  },
  "publisher": {
    "@type": "MedicalClinic",
    "name": "Vish Medical",
    "url": "https://vishmed.com"
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "{siteConfig.siteUrl}/blog/{post.slug}" }
}
```

Handle 404: if `blogPosts.find(...)` returns undefined, call `notFound()` from next/navigation.

Prose styling: The `<article>` tag needs prose classes. Add these Tailwind utilities to content styling — if @tailwindcss/typography is not installed, use manual prose styles via a wrapper className with custom CSS in a `<style jsx>` block or inline Tailwind (check if typography plugin is in tailwind config first via `cat apps/vishmed/tailwind.config.ts` or similar, and fall back to manual styles if not present).
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/vishmed && npx tsc --noEmit 2>&1 | head -30`
Run: `cd /Users/jeet/doordash-p2p/apps/vishmed && npm run build 2>&1 | tail -20`
  </verify>
  <done>
- /blog builds with no errors and shows 40 posts
- /blog?category=weight-loss filters to 12 posts
- /blog/semaglutide-vs-tirzepatide builds successfully with BlogPosting schema in head
- All 40 generateStaticParams slugs pre-render without errors
  </done>
</task>

<task type="auto">
  <name>Task 3: Add Blog nav link to Header + "Latest from the Blog" section to homepage</name>
  <files>
    apps/vishmed/src/components/layout/Header.tsx
    apps/vishmed/src/app/page.tsx
  </files>
  <action>
**A. Header.tsx — Add Blog to navLinks**

In `apps/vishmed/src/components/layout/Header.tsx`, find the `navLinks` array and add `{ href: '/blog', label: 'Blog' }` after the `{ href: '/patient-info', label: 'Patient Info' }` entry (before Contact):

```ts
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/telehealth', label: 'Telehealth' },
  { href: '/patient-info', label: 'Patient Info' },
  { href: '/blog', label: 'Blog' },      // ADD THIS
  { href: '/contact', label: 'Contact' },
]
```

The Header already renders both desktop nav and mobile nav from this single array, so this one change covers both. No other changes needed in Header.tsx.

**B. page.tsx — Add "Latest from the Blog" section**

In `apps/vishmed/src/app/page.tsx`:

1. Add import at top:
```ts
import { blogPosts, CATEGORY_LABELS } from '@/data/blogPosts'
```

2. Add a "Latest from the Blog" section between the Google Reviews section (`<GoogleReviews />`) and the Final CTA section. Insert:

```tsx
{/* ── LATEST FROM THE BLOG ─────────────────────────── */}
<section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
  <div className="max-w-6xl mx-auto">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="font-heading text-2xl lg:text-3xl font-bold text-slate-800">Latest from the Blog</h2>
        <p className="text-slate-500 mt-1 text-sm">Evidence-based health insights from Dr. Pillay</p>
      </div>
      <Link
        href="/blog"
        className="hidden sm:inline-flex items-center text-primary font-semibold hover:underline focus-visible:outline-[3px] focus-visible:outline-primary rounded"
      >
        View All Posts →
      </Link>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {blogPosts.slice(0, 3).map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 cursor-pointer focus-visible:outline-[3px] focus-visible:outline-primary"
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-slate-800 mb-2 group-hover:text-primary motion-safe:transition-colors leading-snug">
              {post.title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
            <p className="mt-4 text-primary text-sm font-semibold group-hover:underline">{post.readTime} min read →</p>
          </div>
        </Link>
      ))}
    </div>
    <div className="text-center mt-8 sm:hidden">
      <Link
        href="/blog"
        className="min-h-[44px] inline-flex items-center border-2 border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary"
      >
        View All Blog Posts
      </Link>
    </div>
  </div>
</section>
```

Note: `line-clamp-3` requires Tailwind CSS v3 or the @tailwindcss/line-clamp plugin. If not available, replace with `overflow-hidden` and a fixed min-height, or check `apps/vishmed/tailwind.config.ts` first — Next.js 15 + Tailwind v3 includes it by default.

IMPORTANT: page.tsx uses JSX with SVG icons inline. The import for blogPosts must be added at the top alongside the other imports. Do NOT accidentally remove the `'use client'` directive if it exists (it does not in page.tsx — it's a server component, so no directive needed, just add the import).
  </action>
  <verify>
Run: `cd /Users/jeet/doordash-p2p/apps/vishmed && npx tsc --noEmit 2>&1 | head -30`
Run: `cd /Users/jeet/doordash-p2p/apps/vishmed && npm run build 2>&1 | tail -30`
Check Header: `grep "Blog" /Users/jeet/doordash-p2p/apps/vishmed/src/components/layout/Header.tsx`
Check homepage: `grep "Latest from the Blog" /Users/jeet/doordash-p2p/apps/vishmed/src/app/page.tsx`
  </verify>
  <done>
- Header.tsx navLinks includes { href: '/blog', label: 'Blog' } — visible in desktop and mobile nav
- Homepage shows "Latest from the Blog" section displaying the 3 newest posts (new-to-orlando-healthcare, internal-medicine-vs-family-medicine, telehealth-orlando)
- Full build (`npm run build`) completes with no errors and all 40 blog post routes listed in the output
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
1. `cd /Users/jeet/doordash-p2p/apps/vishmed && npm run build` — must succeed with 0 errors, 40+ blog routes listed
2. `grep -c "slug:" apps/vishmed/src/data/blogPosts.ts` — must return 40
3. `grep "/blog" apps/vishmed/src/components/layout/Header.tsx` — must show Blog nav entry
4. `grep "Latest from the Blog" apps/vishmed/src/app/page.tsx` — must show section exists
5. Spot-check: `grep "2025-02-03\|2026-03-25" apps/vishmed/src/data/blogPosts.ts` — oldest and newest dates present
6. `grep "BlogPosting" apps/vishmed/src/app/blog/\[slug\]/page.tsx` — schema present
</verification>

<success_criteria>
- All 40 blog posts defined in blogPosts.ts with correct dates, unique slugs, typed categories, full HTML content
- /blog renders a filterable post grid (server-side filtering via URL params)
- /blog/[slug] renders individual posts with BlogPosting schema, author, related posts sidebar
- Homepage displays 3 most recent posts in a "Latest from the Blog" card grid
- Header nav includes Blog link in both desktop and mobile menus
- `npm run build` passes with zero errors and all 42+ pages (existing + 40 blog) generated
</success_criteria>

<output>
After completion, commit changes:
`git add apps/vishmed/src/data/blogPosts.ts apps/vishmed/src/app/blog/ apps/vishmed/src/components/layout/Header.tsx apps/vishmed/src/app/page.tsx`
`git commit -m "feat(vishmed): add blog section with 40 SEO-optimized posts across 6 categories"`
</output>
