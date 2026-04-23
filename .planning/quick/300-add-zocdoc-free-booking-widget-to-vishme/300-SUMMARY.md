---
phase: 300-add-zocdoc-free-booking-widget-to-vishme
plan: 01
subsystem: vishmed-booking
tags: [vishmed, zocdoc, booking, conversion, seo]
status: complete
dependency_graph:
  requires:
    - standalone vishmed repo at /Users/jeet/vishmed
    - Next.js 16 app router
    - public/photos/dr-pillay-portrait.jpg (present, 401KB)
  provides:
    - Reusable <ZocdocButton/> component with verbatim ZOCDOC_URL constant
    - /schedule route — standalone free-booking surface
    - Zocdoc CTAs on header (desktop + mobile), homepage final CTA, contact page
    - /schedule sitemap entry
  affects:
    - Conversion funnel: Book Appointment CTA now routes to free Zocdoc booking instead of paid /contact calendars
    - /contact flow unchanged (BookingGate + ContactForm preserved)
tech_stack:
  added:
    - Zocdoc link-out widget (anchor pattern, NO iframe — X-Frame-Options-safe)
  patterns:
    - Server component for pure-static links
    - target="_blank" rel="noopener noreferrer" on every external CTA
key_files:
  created:
    - /Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx
    - /Users/jeet/vishmed/src/app/schedule/page.tsx
  modified:
    - /Users/jeet/vishmed/src/components/layout/Header.tsx
    - /Users/jeet/vishmed/src/app/page.tsx
    - /Users/jeet/vishmed/src/app/contact/page.tsx
    - /Users/jeet/vishmed/src/app/sitemap.ts
decisions:
  - Link-out to Zocdoc via anchor (NEVER iframe) — Zocdoc sends X-Frame-Options DENY
  - ZOCDOC_URL stored verbatim as a module-level constant, reused across all callers to prevent drift
  - Homepage final CTA swapped phone-call button for "See Pricing" to keep two-button symmetry while primary CTA becomes free Zocdoc booking
  - Contact page Zocdoc card inserted ABOVE the existing Schedule Online (BookingGate) section — additive, not replacing the paid flow
metrics:
  tasks_completed: 3
  files_created: 2
  files_modified: 4
  commits: 2
  completed_date: 2026-04-23
---

# Quick Task 300: Zocdoc Free-Booking Widget Summary

Shipped a free-booking surface to vishmed.com that link-outs to Zocdoc (verbatim URL, new tab, rel=noopener noreferrer) without touching the paid /book, /telehealth, or /pricing flows. New /schedule page + 4 entry points (header desktop + mobile, homepage final CTA, contact page card) + sitemap entry. `npm run build` passed; production deployed and verified via 11 curl checks.

## Tasks Completed

| Task | Name                                                                           | Commit    | Files                                                                                                       |
| ---- | ------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | Create ZocdocButton component + /schedule page                                 | `3367d8c` | `src/components/ui/ZocdocButton.tsx` (new), `src/app/schedule/page.tsx` (new)                               |
| 2    | Wire ZocdocButton into Header, Homepage, Contact page, Sitemap                 | `5f7166a` | `src/components/layout/Header.tsx`, `src/app/page.tsx`, `src/app/contact/page.tsx`, `src/app/sitemap.ts`    |
| 3    | Build, push, deploy, verify production (no additional commit — build + deploy) | —         | `npm run build` passed; `git push origin main`; `vercel --prod --yes` (aliased to vishmed.com)              |

## Commits (jeet-avatar/vishmed main)

```
5f7166a feat(schedule): wire Zocdoc into header, homepage, contact, sitemap
3367d8c feat(schedule): add ZocdocButton + /schedule route
```

Git push: `0e411ec..5f7166a  main -> main` (github.com/jeet-avatar/vishmed)

## Vercel Deployment

- **Deployment ID:** `dpl_GnDdPxjqhJ4Nactqy1Fj3Egnwc8M`
- **Production URL:** `https://vishmed-k0umgpace-jeetnairin-3837s-projects.vercel.app`
- **Aliased to:** `https://vishmed.com`
- **Inspector:** `https://vercel.com/jeetnairin-3837s-projects/vishmed/GnDdPxjqhJ4Nactqy1Fj3Egnwc8M`
- **Build duration:** 34s (20s compile + 14s deploy)
- **Status:** READY

> **Note:** Vercel auto-deploy-on-push was NOT firing for the standalone `jeet-avatar/vishmed` repo — the latest Git-triggered deploy before this task was 1 day old. Re-pointing the Vercel Git integration is a pre-existing pending item (see MEMORY.md entry "VishMed = standalone repo"). For this task we deployed directly via `vercel --prod --yes` from the linked `.vercel/project.json`, which produced an identical production result aliased to vishmed.com.

## Production Verification (all PASS)

| # | Check                                                         | Command                                                                                            | Result                                                                          |
| - | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 | /schedule returns HTTP 200                                    | `curl -sSI https://vishmed.com/schedule \| head -1`                                                | `HTTP/2 200`                                                                    |
| 2 | Zocdoc URL verbatim in /schedule HTML                         | `grep -oE 'zocdoc\.com/practice/vish-medical-174361\?[^"'"'"' ]*'`                                 | `zocdoc.com/practice/vish-medical-174361?lock=true&amp;isNewPatient=false&amp;referrerType=widget` (`&amp;` is HTML-entity encoding; browsers decode back to `&` before navigation — URL delivered to Zocdoc is byte-identical to spec) |
| 3 | `rel="noopener noreferrer"` on Zocdoc anchor                  | `grep -c "noopener noreferrer"` near Zocdoc link                                                   | 1 (one match, as expected for the single anchor on /schedule)                   |
| 4 | Homepage contains Zocdoc URL                                  | `curl -s https://vishmed.com/ \| grep -c "zocdoc.com/practice/vish-medical-174361"`                | 1                                                                               |
| 5 | Contact page contains Zocdoc URL                              | `curl -s https://vishmed.com/contact \| grep -c "zocdoc.com/practice/vish-medical-174361"`         | 1                                                                               |
| 6 | Sitemap includes /schedule                                    | `curl -s https://vishmed.com/sitemap.xml \| grep -c "/schedule"`                                   | 1                                                                               |
| 7 | Homepage shows "See Pricing" secondary CTA                    | `curl -s https://vishmed.com/ \| grep -c "See Pricing"`                                            | 1                                                                               |
| 8 | aria-label on /schedule                                       | `grep -c 'aria-label="Book a free appointment on Zocdoc (opens in new tab)"'`                      | 1                                                                               |
| 9 | Header `/schedule` hrefs on homepage                          | `curl -s https://vishmed.com/ \| grep -oE 'href="/schedule"' \| wc -l`                             | 2 (navLink + Book Appointment CTA; mobile menu only renders on hamburger click) |
| 10 | Paid flows untouched — /book, /telehealth, /pricing all 200  | `curl -sSI` each                                                                                   | `HTTP/2 200`, `HTTP/2 200`, `HTTP/2 200`                                        |
| 11 | Zocdoc card renders BEFORE Schedule Online on /contact        | byte-offset compare                                                                                | Zocdoc at byte 7308 < Schedule Online at byte 8004 — ORDER OK                   |

## Files Touched (6 total)

**Created (2):**
1. `/Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx` — Reusable `<ZocdocButton/>` server component. Exports `ZOCDOC_URL` constant (verbatim Zocdoc URL), default export + named export. Variants: `primary|secondary`. Sizes: `md|lg`. Renders `<a href={ZOCDOC_URL} target="_blank" rel="noopener noreferrer" aria-label="Book a free appointment on Zocdoc (opens in new tab)">`.
2. `/Users/jeet/vishmed/src/app/schedule/page.tsx` — Server component standalone page. Hero (bg-brand-blue) + main card (Dr. Pillay portrait + primary ZocdocButton + phone fallback + new-tab small-print) + office hours table. Zero imports from BookingGate/CalendlyWidget/GoogleCalendarBooking.

**Modified (4):**
3. `/Users/jeet/vishmed/src/components/layout/Header.tsx` — `Schedule` link inserted into navLinks (between Telehealth and Patient Info). Desktop `Book Appointment` CTA href `/contact → /schedule`. Mobile `Book Appointment` CTA href `/contact → /schedule`. Three surgical edits — logo/hamburger/styling unchanged. Note: the Contact navLink (`{ href: '/contact', label: 'Contact' }`) is preserved.
4. `/Users/jeet/vishmed/src/app/page.tsx` — Added `ZocdocButton` import. Final CTA section replaced the `Book Your Appointment` → `/contact` + `tel:` phone button with `<ZocdocButton variant="primary" size="lg"/>` + `See Pricing` → `/pricing`. Zero edits to HeroBannerCarousel, stats, Meet Dr. Pillay, Services, Why Us, Hours, GoogleReviews, Blog sections.
5. `/Users/jeet/vishmed/src/app/contact/page.tsx` — Added `ZocdocButton` import. New Zocdoc card section inserted between the existing Hero and `Schedule Online` (BookingGate) section. BookingGate, ContactForm, Contact Information, Google Maps — all untouched.
6. `/Users/jeet/vishmed/src/app/sitemap.ts` — Added `{ url: `${BASE}/schedule`, lastModified: '2026-04-23', changeFrequency: 'monthly', priority: 0.9 }` next to the `/contact` entry.

## Paid Flows — NOT Modified (confirmed)

- `/book` — HTTP/2 200 in production (smoke test)
- `/telehealth` — HTTP/2 200 in production (smoke test)
- `/pricing` — HTTP/2 200 in production (smoke test)
- `BookingGate` import + two usages on `/contact` — unchanged (3 occurrences confirmed post-edit)
- `/api/checkout` + Stripe webhooks — not touched
- Calendly / Google Calendar embed URLs in `siteConfig` — not touched

## Deviations from Plan

**None for code** — plan executed exactly as written.

**One environmental deviation (operational, not code):** Vercel's Git-integration auto-deploy was not firing for the standalone `jeet-avatar/vishmed` repo (latest prior Git-triggered deploy was 1 day old, from before this task's push). Per Rule 3 (auto-fix blocking issues), I used `vercel --prod --yes` from the already-linked `.vercel/project.json` to deploy. The pre-existing re-point-Vercel-to-standalone-repo task is tracked in MEMORY.md ("VishMed = standalone repo") and is out-of-scope for this quick task.

## Accessibility & Safety Checks

- [x] `aria-label="Book a free appointment on Zocdoc (opens in new tab)"` on every ZocdocButton
- [x] `target="_blank"` + `rel="noopener noreferrer"` on every Zocdoc anchor (1 on /schedule, 1 on /, 1 on /contact confirmed in HTML)
- [x] min-h-[44px] on all ZocdocButton instances (WCAG 2.5.5 touch-target size)
- [x] `focus-visible:outline-[3px]` tokens preserved (matching existing site CTA pattern)
- [x] Zocdoc URL is HTML-entity encoded by React (`&` → `&amp;`) which browsers auto-decode before navigation — delivered URL is byte-identical to the spec

## Build Output (local)

```
✓ Compiled successfully
✓ Generating static pages (62/62)
Route (app)
├ ○ /schedule                    (static, prerendered)
├ ○ /                            (static)
├ ○ /contact                     (static)
└ [...60 other routes unchanged]
```

Zero errors, zero warnings, `/schedule` classified as static (optimal — pure link-out page with no runtime fetches).

## Self-Check: PASSED

- [x] `/Users/jeet/vishmed/src/components/ui/ZocdocButton.tsx` exists — FOUND
- [x] `/Users/jeet/vishmed/src/app/schedule/page.tsx` exists — FOUND
- [x] Commit `3367d8c` exists in `/Users/jeet/vishmed` — FOUND
- [x] Commit `5f7166a` exists in `/Users/jeet/vishmed` — FOUND
- [x] Commits pushed to `jeet-avatar/vishmed` main — confirmed by `git push` output `0e411ec..5f7166a  main -> main`
- [x] `https://vishmed.com/schedule` returns 200 and contains verbatim Zocdoc URL
- [x] `https://vishmed.com/` and `https://vishmed.com/contact` both contain the Zocdoc URL
- [x] `https://vishmed.com/sitemap.xml` contains `/schedule`
- [x] Paid flows `/book`, `/telehealth`, `/pricing` all still return 200
