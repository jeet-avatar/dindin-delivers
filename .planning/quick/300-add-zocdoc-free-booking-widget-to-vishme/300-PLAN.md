---
phase: 300-add-zocdoc-free-booking-widget-to-vishme
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx
  - /Users/jeet/vishmed/src/app/schedule/page.tsx
  - /Users/jeet/vishmed/src/components/layout/Header.tsx
  - /Users/jeet/vishmed/src/app/page.tsx
  - /Users/jeet/vishmed/src/app/contact/page.tsx
  - /Users/jeet/vishmed/src/app/sitemap.ts
autonomous: true
requirements:
  - VISHMED-ZOCDOC-01
user_setup: []

must_haves:
  truths:
    - "User can visit /schedule and see Dr. Pillay portrait + primary Book on Zocdoc CTA"
    - "Clicking Book on Zocdoc opens https://www.zocdoc.com/practice/vish-medical-174361?lock=true&isNewPatient=false&referrerType=widget in a new tab with rel=noopener noreferrer"
    - "Header Book Appointment button (desktop + mobile) routes to /schedule"
    - "Header nav includes a Schedule link"
    - "Homepage final CTA section shows Book on Zocdoc (Free) as primary, See Pricing as secondary"
    - "Contact page shows a Zocdoc card above the contact form"
    - "Sitemap includes /schedule entry"
    - "`npm run build` completes with zero errors"
  artifacts:
    - path: "/Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx"
      provides: "Reusable Zocdoc link component with ZOCDOC_URL constant"
      contains: "ZOCDOC_URL"
    - path: "/Users/jeet/vishmed/src/app/schedule/page.tsx"
      provides: "Standalone /schedule route with portrait, Zocdoc CTA, hours, phone fallback"
      contains: "Dr. Arpana Pillay"
    - path: "/Users/jeet/vishmed/src/components/layout/Header.tsx"
      provides: "Header with /schedule link in nav and Book Appointment pointing to /schedule"
      contains: "/schedule"
    - path: "/Users/jeet/vishmed/src/app/page.tsx"
      provides: "Homepage final CTA with Zocdoc primary button"
      contains: "ZocdocButton"
    - path: "/Users/jeet/vishmed/src/app/contact/page.tsx"
      provides: "Contact page with Zocdoc card above the contact form"
      contains: "ZocdocButton"
    - path: "/Users/jeet/vishmed/src/app/sitemap.ts"
      provides: "Sitemap including /schedule"
      contains: "/schedule"
  key_links:
    - from: "src/components/ui/ZocdocButton.tsx"
      to: "https://www.zocdoc.com/practice/vish-medical-174361"
      via: "anchor tag with target=_blank rel=noopener noreferrer"
      pattern: "zocdoc\\.com/practice/vish-medical-174361"
    - from: "Header.tsx Book Appointment button (desktop + mobile)"
      to: "/schedule"
      via: "Next Link href=/schedule"
      pattern: "href=[\"']/schedule[\"']"
    - from: "schedule/page.tsx"
      to: "ZocdocButton"
      via: "import and render as primary CTA"
      pattern: "ZocdocButton"
---

<objective>
Add a Zocdoc free-booking surface to the VishMed Next.js site (standalone repo at /Users/jeet/vishmed) without touching the existing paid /book, /telehealth, or /pricing flows.

Purpose: Funnel free-booking demand to Zocdoc's hosted widget (link-out, not iframe — Zocdoc sends X-Frame-Options) while keeping the paid flows intact. Placements: new /schedule page, Header "Book Appointment" CTA, homepage final CTA, and a card on the Contact page.

Output:
- New reusable <ZocdocButton/> component (src/components/ui/ZocdocButton.tsx) with ZOCDOC_URL constant
- New /schedule route (src/app/schedule/page.tsx) with Dr. Pillay portrait + primary Zocdoc CTA + office hours + phone fallback
- Header.tsx updated: "Schedule" added to navLinks, Book Appointment CTA href changed from /contact to /schedule (both desktop and mobile menu)
- Homepage final CTA (src/app/page.tsx) updated: primary = Book on Zocdoc (Free), secondary = See Pricing (replaces current /contact + phone pair). DO NOT touch the rest of the homepage.
- Contact page (src/app/contact/page.tsx): add a Zocdoc card above the existing content (no changes to booking calendars / form)
- Sitemap (src/app/sitemap.ts): add /schedule entry
- `npm run build` passes in /Users/jeet/vishmed
- Commit + push to main in /Users/jeet/vishmed; Vercel auto-deploys; verify /schedule loads in production
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
# VishMed is a STANDALONE Next.js repo at /Users/jeet/vishmed. NOT a monorepo.
# Branch: main. Vercel auto-deploys on push.
# Do NOT write code under /Users/jeet/doordash-p2p/apps/vishmed (that is a stale copy).

# Reference files (already on disk — read before editing):
@/Users/jeet/vishmed/src/components/layout/Header.tsx
@/Users/jeet/vishmed/src/app/page.tsx
@/Users/jeet/vishmed/src/app/contact/page.tsx
@/Users/jeet/vishmed/src/app/sitemap.ts
@/Users/jeet/vishmed/src/lib/config.ts

# Design tokens already present in the site (reuse, do NOT invent new colors):
#   bg-brand-blue, text-primary, bg-primary, bg-primary-dark, bg-cta, bg-cta-dark
#   font-heading (headings), text-slate-* (body)
#   Buttons: min-h-[44px] inline-flex items-center px-6 py-3 rounded-lg font-semibold focus-visible:outline-[3px]

# Existing portrait: /Users/jeet/vishmed/public/photos/dr-pillay-portrait.jpg (confirmed present)

# Zocdoc URL (use VERBATIM, do not alter any param):
#   https://www.zocdoc.com/practice/vish-medical-174361?lock=true&isNewPatient=false&referrerType=widget
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ZocdocButton component + /schedule page</name>
  <files>
    /Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx
    /Users/jeet/vishmed/src/app/schedule/page.tsx
  </files>
  <action>
    Step A — Create `/Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx`:

    Requirements:
    - Server component (no 'use client' — pure anchor, no state).
    - Export `ZOCDOC_URL` const at module top:
        export const ZOCDOC_URL = 'https://www.zocdoc.com/practice/vish-medical-174361?lock=true&isNewPatient=false&referrerType=widget'
    - Default export `ZocdocButton` (named export also acceptable) that accepts props:
        { variant?: 'primary' | 'secondary', size?: 'md' | 'lg', className?: string, children?: React.ReactNode, label?: string }
    - Render as a plain `<a href={ZOCDOC_URL} target="_blank" rel="noopener noreferrer">` (NOT Next `<Link>` — it's an external URL).
    - Primary variant classes (match existing site CTA): `min-h-[44px] inline-flex items-center justify-center bg-cta text-white hover:bg-cta-dark px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-cta-dark`
    - Secondary variant classes: `min-h-[44px] inline-flex items-center justify-center border-2 border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary`
    - Size 'lg' adds `text-lg px-8 py-4`.
    - Default label = `Book on Zocdoc (Free)`. If `children` provided, render children instead of label.
    - Include an `aria-label="Book a free appointment on Zocdoc (opens in new tab)"`.
    - Append `className` prop to computed classes so callers can tweak (e.g. full-width on mobile).

    Step B — Create `/Users/jeet/vishmed/src/app/schedule/page.tsx` (Server Component, follow the pattern of existing pages — see contact/page.tsx and pricing/page.tsx):

    Imports:
      import type { Metadata } from 'next'
      import Image from 'next/image'
      import Link from 'next/link'
      import { siteConfig } from '@/lib/config'
      import { ZocdocButton, ZOCDOC_URL } from '@/components/ui/ZocdocButton'

    Metadata:
      export const metadata: Metadata = {
        title: 'Book an Appointment | Vish Medical',
        description: 'Book your appointment with Dr. Arpana Pillay for free on Zocdoc. Primary care, weight loss, and telehealth in Central Florida.',
        openGraph: { title: 'Book an Appointment | Vish Medical', url: `${siteConfig.siteUrl}/schedule` },
        alternates: { canonical: `${siteConfig.siteUrl}/schedule` },
      }

    Layout (3 sections, reuse site aesthetic):

      1. Hero (bg-brand-blue text-white, py-12 lg:py-16):
         - h1 (font-heading text-3xl lg:text-4xl font-bold): "Book an Appointment"
         - Subhead: "Schedule online in under a minute — no account required."

      2. Main card (py-16 lg:py-20 px-4 bg-white, max-w-6xl mx-auto):
         Two-column grid (grid-cols-1 lg:grid-cols-2 gap-12 items-center) inside a `rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-10` card:
         - Left column: Dr. Pillay portrait (use Next/Image with src="/photos/dr-pillay-portrait.jpg", alt="Dr. Arpana Pillay, Internal Medicine Physician at Vish Medical", fill, unoptimized, inside a relative w-72 h-[380px] lg:w-full lg:h-[460px] rounded-2xl overflow-hidden shadow-lg, object-cover object-top)
         - Right column:
             - Eyebrow: `<p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Dr. Arpana Pillay</p>`
             - h2: "Free Online Booking via Zocdoc" (font-heading text-2xl lg:text-3xl font-bold text-slate-800 mb-4)
             - 1-2 sentences: "Pick a time that works for you — telehealth or in-person. Booking takes under a minute and is completely free."
             - Primary CTA: `<ZocdocButton variant="primary" size="lg" className="w-full sm:w-auto" />`
             - Secondary row: Phone fallback `<a href={`tel:${siteConfig.phone.replaceAll(/\\D/g, '')}`}>...</a>` styled as a text-style link (not a primary button) — text "Or call {siteConfig.phone}"
             - Small print below CTA: "Opens Zocdoc in a new tab. You'll return to vishmed.com when you're done."

      3. Hours section (py-12 bg-slate-50):
         - h2: "Office Hours" (center, font-heading text-2xl font-bold text-slate-800 mb-6)
         - Reuse the same table pattern from src/app/page.tsx lines 249-268 (Monday-Friday weekdays, Saturday saturday — pull values from siteConfig.hours.weekdays and siteConfig.hours.saturday).
         - Below the table, a muted paragraph: "Can't find a slot? Call us at {siteConfig.phone} and we'll get you in."

    Do NOT import or touch BookingGate / CalendlyWidget / GoogleCalendarBooking (those are for paid flows).

    Do NOT add any `fetch()` calls — /schedule is a pure static page.
  </action>
  <verify>
    cd /Users/jeet/vishmed && grep -q "ZOCDOC_URL = 'https://www.zocdoc.com/practice/vish-medical-174361?lock=true&isNewPatient=false&referrerType=widget'" src/components/ui/ZocdocButton.tsx && echo "ZOCDOC_URL OK"
    cd /Users/jeet/vishmed && grep -q "target=\"_blank\"" src/components/ui/ZocdocButton.tsx && grep -q "rel=\"noopener noreferrer\"" src/components/ui/ZocdocButton.tsx && echo "link attrs OK"
    cd /Users/jeet/vishmed && test -f src/app/schedule/page.tsx && echo "page exists"
    cd /Users/jeet/vishmed && grep -q "dr-pillay-portrait.jpg" src/app/schedule/page.tsx && echo "portrait wired"
    cd /Users/jeet/vishmed && grep -q "ZocdocButton" src/app/schedule/page.tsx && echo "button wired"
  </verify>
  <done>
    - src/components/ui/ZocdocButton.tsx exists, exports ZOCDOC_URL constant (verbatim Zocdoc URL) and ZocdocButton component rendering an anchor with target=_blank + rel=noopener noreferrer.
    - src/app/schedule/page.tsx exists with Dr. Pillay portrait, h1 "Book an Appointment", ZocdocButton primary CTA, phone fallback, and office hours section.
    - No imports from BookingGate / CalendlyWidget / GoogleCalendarBooking (paid flows untouched).
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire ZocdocButton into Header, Homepage, Contact page, and sitemap</name>
  <files>
    /Users/jeet/vishmed/src/components/layout/Header.tsx
    /Users/jeet/vishmed/src/app/page.tsx
    /Users/jeet/vishmed/src/app/contact/page.tsx
    /Users/jeet/vishmed/src/app/sitemap.ts
  </files>
  <action>
    Step A — Header.tsx (/Users/jeet/vishmed/src/components/layout/Header.tsx):
    - In the `navLinks` array (currently line 6), insert `{ href: '/schedule', label: 'Schedule' }` between `/telehealth` and `/patient-info`. Keep existing order for all other links.
    - Desktop Book Appointment Link (currently `<Link href="/contact">Book Appointment</Link>` around line 57): change `href="/contact"` to `href="/schedule"`. Leave classes and copy unchanged.
    - Mobile Book Appointment Link (currently `<Link href="/contact">Book Appointment</Link>` around line 103, inside the mobile menu block): change `href="/contact"` to `href="/schedule"`. Leave classes and copy unchanged.
    - DO NOT change the `use client` directive, logo, nav styling, or mobile hamburger. Edits should be 3 surgical changes total.

    Step B — Homepage (/Users/jeet/vishmed/src/app/page.tsx), Final CTA section ONLY (currently `{/* ── FINAL CTA ───── */}` around lines 326-348):
    - Add import at top (alongside existing imports): `import { ZocdocButton } from '@/components/ui/ZocdocButton'`
    - Replace the inner `<div className="flex flex-wrap justify-center gap-4">` children with:
        * Primary: `<ZocdocButton variant="primary" size="lg" />` — default label "Book on Zocdoc (Free)"
        * Secondary: a Next/Link to `/pricing` styled identically to the previous phone button (same border-2 border-white/70 text-white hover:bg-white/15 classes, text "See Pricing")
    - REMOVE the existing `<Link href="/contact">Book Your Appointment</Link>` and the `<a href={`tel:...`}>phone</a>` from this section. Replace in-place — do NOT restructure the section, heading, or copy above the button row.
    - Do NOT touch ANY other section of page.tsx (HeroBannerCarousel, stats strip, Meet Dr. Pillay, Services, Why Us, Hours, GoogleReviews, Latest Blog). Edit is confined to the FINAL CTA section only.

    Step C — Contact page (/Users/jeet/vishmed/src/app/contact/page.tsx):
    - Add import: `import { ZocdocButton } from '@/components/ui/ZocdocButton'`
    - Inject a new Zocdoc card section BETWEEN the existing Hero (`<section className="bg-brand-blue ...">`, line 20-27) and the existing "Schedule Online" section (line 30). Card layout:
        <section className="py-10 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-1">Fastest way to book</p>
              <h2 className="font-heading text-xl lg:text-2xl font-bold text-slate-800 mb-1">Prefer to book online?</h2>
              <p className="text-slate-600 text-sm">Pick a time on Zocdoc — free, no account needed.</p>
            </div>
            <ZocdocButton variant="primary" className="w-full sm:w-auto">Book free on Zocdoc →</ZocdocButton>
          </div>
        </section>
    - DO NOT modify the existing BookingGate sections or the contact form. Insertion is additive only.

    Step D — Sitemap (/Users/jeet/vishmed/src/app/sitemap.ts):
    - Add a new entry to the `staticPages` array (place it next to /contact, priority 0.9):
        { url: `${BASE}/schedule`, lastModified: '2026-04-23', changeFrequency: 'monthly', priority: 0.9 }
    - Do NOT reorder other entries.
  </action>
  <verify>
    cd /Users/jeet/vishmed && grep -c "/schedule" src/components/layout/Header.tsx | grep -qE "^[3-9]" && echo "Header has 3+ /schedule refs (navLink + desktop + mobile)"
    cd /Users/jeet/vishmed && ! grep -q 'href="/contact"' src/components/layout/Header.tsx && echo "Header no longer links Book Appointment to /contact"
    cd /Users/jeet/vishmed && grep -q "ZocdocButton" src/app/page.tsx && echo "Homepage uses ZocdocButton"
    cd /Users/jeet/vishmed && grep -q "/pricing" src/app/page.tsx && echo "Homepage secondary CTA to /pricing present"
    cd /Users/jeet/vishmed && grep -q "ZocdocButton" src/app/contact/page.tsx && echo "Contact page uses ZocdocButton"
    cd /Users/jeet/vishmed && grep -q "BookingGate" src/app/contact/page.tsx && echo "Contact page BookingGate still present (not removed)"
    cd /Users/jeet/vishmed && grep -q "/schedule" src/app/sitemap.ts && echo "Sitemap has /schedule"
  </verify>
  <done>
    - Header navLinks includes Schedule; both Book Appointment buttons (desktop + mobile) point to /schedule.
    - Homepage Final CTA shows ZocdocButton primary + /pricing secondary (no more /contact or phone button in that section).
    - Contact page shows a Zocdoc card above the Schedule Online / BookingGate section; BookingGate content untouched.
    - sitemap.ts includes a /schedule entry with priority 0.9.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build, commit, push, verify production</name>
  <files>
    /Users/jeet/vishmed
  </files>
  <action>
    Step A — Build:
    - `cd /Users/jeet/vishmed && npm run build`
    - Build MUST pass with zero errors. If Next complains about the new page.tsx, fix it before proceeding (typical issues: missing 'use client' if client hooks used — but /schedule should be server; missing import; sitemap type mismatch).

    Step B — Commit & push (in /Users/jeet/vishmed ONLY — NOT in /Users/jeet/doordash-p2p):
    - `cd /Users/jeet/vishmed && git status` (verify only the 6 expected files changed, no unrelated diffs)
    - `cd /Users/jeet/vishmed && git add src/components/ui/ZocdocButton.tsx src/app/schedule/page.tsx src/components/layout/Header.tsx src/app/page.tsx src/app/contact/page.tsx src/app/sitemap.ts`
    - Commit with HEREDOC:
        git commit -m "$(cat <<'EOF'
      feat(schedule): add free Zocdoc booking surface + /schedule route

      Introduces a reusable ZocdocButton component, a dedicated /schedule page
      with Dr. Pillay portrait and phone fallback, and wires it into Header
      (Book Appointment CTA + nav), homepage final CTA, and the contact page.
      Does not touch paid /book, /telehealth, or /pricing flows.

      Zocdoc links open in a new tab with rel=noopener noreferrer — iframe
      not used because Zocdoc sends X-Frame-Options.

      Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
      EOF
      )"
    - `cd /Users/jeet/vishmed && git push origin main`

    Step C — Verify Vercel production:
    - Wait ~60-90 seconds for Vercel auto-deploy.
    - `curl -sSI https://vishmed.com/schedule | head -5` — expect HTTP/2 200.
    - `curl -s https://vishmed.com/schedule | grep -o "zocdoc.com/practice/vish-medical-174361[^\"]*" | head -1` — expect the full Zocdoc URL in the HTML.
    - `curl -s https://vishmed.com/ | grep -c "zocdoc.com/practice/vish-medical-174361"` — expect >= 1 (homepage final CTA).
    - `curl -s https://vishmed.com/contact | grep -c "zocdoc.com/practice/vish-medical-174361"` — expect >= 1 (contact page card).
    - `curl -s https://vishmed.com/sitemap.xml | grep -q "/schedule"` && echo "sitemap has /schedule".

    If any curl returns non-200 or missing URL, check `vercel` deployment logs and fix. Do NOT declare done until all four curls succeed.
  </action>
  <verify>
    cd /Users/jeet/vishmed && npm run build 2>&1 | tail -20 | grep -qE "(Compiled successfully|Generating static pages|Build completed)"
    cd /Users/jeet/vishmed && git log --oneline -1 | grep -q "schedule"
    curl -sSI https://vishmed.com/schedule | head -1 | grep -q "200"
    curl -s https://vishmed.com/schedule | grep -q "zocdoc.com/practice/vish-medical-174361"
    curl -s https://vishmed.com/ | grep -q "zocdoc.com/practice/vish-medical-174361"
    curl -s https://vishmed.com/contact | grep -q "zocdoc.com/practice/vish-medical-174361"
    curl -s https://vishmed.com/sitemap.xml | grep -q "/schedule"
  </verify>
  <done>
    - `npm run build` passes locally.
    - Commit pushed to jeet-avatar/vishmed main.
    - https://vishmed.com/schedule returns 200 and contains the Zocdoc URL.
    - Homepage and /contact both contain at least one Zocdoc URL occurrence.
    - sitemap.xml includes /schedule.
  </done>
</task>

</tasks>

<verification>
End-to-end phase checks (run AFTER Task 3 push + Vercel deploy):

1. Route exists:
   `curl -sSI https://vishmed.com/schedule` returns 200.

2. Zocdoc URL is VERBATIM (no missing/extra params):
   `curl -s https://vishmed.com/schedule | grep -oE 'zocdoc\.com/practice/vish-medical-174361\?[^"'\'' ]*' | head -1`
   Expected exact output: `zocdoc.com/practice/vish-medical-174361?lock=true&isNewPatient=false&referrerType=widget`

3. Link safety: `target="_blank"` and `rel="noopener noreferrer"` present on every Zocdoc anchor:
   `curl -s https://vishmed.com/schedule | grep -B1 -A1 "zocdoc.com/practice" | grep -c "noopener noreferrer"` — expect >= 1.

4. Header wiring (desktop + mobile):
   `curl -s https://vishmed.com/ | grep -oE 'href="/schedule"' | wc -l` — expect >= 2 (nav link + Book Appointment button; mobile menu may render to same markup in SSR).

5. Paid flows untouched:
   `curl -sSI https://vishmed.com/book` returns 200.
   `curl -sSI https://vishmed.com/telehealth` returns 200.
   `curl -sSI https://vishmed.com/pricing` returns 200.

6. Homepage secondary CTA:
   `curl -s https://vishmed.com/ | grep -q 'See Pricing'` && echo "secondary CTA visible".

7. Contact card is ABOVE the booking gate (order check):
   `curl -s https://vishmed.com/contact > /tmp/contact.html`
   `ZOCDOC_POS=$(grep -b "zocdoc.com/practice" /tmp/contact.html | head -1 | cut -d: -f1)`
   `BOOKING_POS=$(grep -b "Schedule Online" /tmp/contact.html | head -1 | cut -d: -f1)`
   `[ "$ZOCDOC_POS" -lt "$BOOKING_POS" ]` && echo "Zocdoc card appears before Schedule Online section"

8. Accessibility smoke test:
   `curl -s https://vishmed.com/schedule | grep -q 'aria-label="Book a free appointment on Zocdoc (opens in new tab)"'` — expect match.
</verification>

<success_criteria>
All of the following must be TRUE:

- [ ] /Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx exists with verbatim ZOCDOC_URL constant
- [ ] /Users/jeet/vishmed/src/app/schedule/page.tsx exists and uses ZocdocButton + Dr. Pillay portrait + phone fallback
- [ ] Header.tsx: "Schedule" in navLinks + both Book Appointment CTAs → /schedule
- [ ] Homepage final CTA shows Book on Zocdoc (Free) primary and See Pricing secondary
- [ ] Contact page shows Zocdoc card above the Schedule Online section (BookingGate still intact)
- [ ] Sitemap includes /schedule
- [ ] Paid flows (/book, /telehealth, /pricing) untouched (no edits)
- [ ] `npm run build` passes in /Users/jeet/vishmed with zero errors
- [ ] Commit pushed to jeet-avatar/vishmed main
- [ ] https://vishmed.com/schedule returns HTTP 200 and contains verbatim Zocdoc URL with target=_blank + rel=noopener noreferrer
- [ ] https://vishmed.com/ and https://vishmed.com/contact both contain the Zocdoc URL
- [ ] https://vishmed.com/sitemap.xml contains /schedule
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/300-add-zocdoc-free-booking-widget-to-vishme/300-SUMMARY.md` with:
- Commit SHA(s) in jeet-avatar/vishmed
- Vercel deployment URL (if captured from push output)
- curl verification outputs proving /schedule, /, /contact, /sitemap.xml all contain the Zocdoc URL
- Screenshot references (if taken) of /schedule on desktop + mobile
- List of files touched (6 total)
- Confirmation paid flows (/book, /telehealth, /pricing) were NOT modified
</output>
