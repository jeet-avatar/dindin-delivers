# Habitat Condos — Marketing Website Design Spec

| Field | Value |
|---|---|
| **Date** | 2026-04-27 |
| **Status** | Draft v2 — reviewer round 2 ✅ approved; pending user review |
| **Project** | Habitat (standalone brand) · Tech by Zietra Technologies |
| **Domain** | `habitatcondos.com` (registered on GoDaddy, awaiting DNS update to Vercel) |
| **Phase 1 launch target** | 2026-05-01 (Friday) |
| **Property** | 50 flats × 4 beds = 200 beds, Undri, Pune, Maharashtra |
| **Audience** | Working men only, with mandatory police verification |
| **Operator** | Jithesh Manoharan |

---

## 1. Executive summary

A budget-tier marketing-and-lead-gen website for **Habitat**, a 200-bed men's PG accommodation in Undri, Pune. The site exists to capture qualified leads (working-male prospects looking for a verified, secure, kitchen-equipped PG), route them to a WhatsApp conversation with the manager, and accept their booking deposit + first month's rent through Razorpay payment links once a tour is converted.

Phase 1 ships **2026-05-01** as a marketing site with admin-driven Razorpay payments. Phase 2 (planned for 2026-06-01) adds tenant login + self-serve recurring payments. Phase 3 (2026-07+) wraps the same web experience as native iOS + Android apps.

The website is built on the same stack as `vishmed`, `pacific-premier`, `arthabuild`, and `zietra.com` — Next.js on Vercel — and reads all operator-specific data (price, phone, address, founding-spots-remaining) from Vercel Edge Config so a non-technical operator can update the site in seconds without redeploying.

---

## 2. Decisions locked during brainstorm

Reference: `.superpowers/brainstorm/43487-1777326954/` (mood-board files).

| # | Decision | Choice |
|---|---|---|
| Q1 | Site purpose | **D** — lead-gen marketing site now; live bed-availability map later; never a full booking engine |
| Q2 | Audience + gender | Working men only · police verification mandatory |
| Q3 | Tour-booking mechanism | **B** — form → backend → WhatsApp confirmation to tenant + alert to manager |
| Q3b | Lead destination | **BrandMonkz CRM** (existing infra at `brandmonkz.com`) |
| Q4 | Pricing display | Configurable formula, not hardcoded |
| Q4a | Pricing formula | `per_bed = flat_price / occupancy_n` where `n ∈ {1,2,3,4}` |
| Q4b | Default flat price | ₹15,000/flat → ₹3,750 quad / ₹5,000 triple / ₹7,500 twin / ₹15,000 single |
| Q4c | Pricing storage | **A** — Vercel Edge Config |
| Q5 | Brand identity | Habitat (standalone), "Technology by Zietra Technologies" footer credit |
| Q6 | Brand mood | **G** — soft slate `#2d3142` + butter `#f5d27a` + off-white `#f4f4f1`, DM Sans, lower-case wordmark, soft pill buttons, unhurried tone |
| Q7 | Information architecture | **C** — single landing page (10 sections) + `/tour` + `/founders` + `/privacy` + `/terms` |
| Q8 | Languages | **A** — English only |
| Q9 | Tech stack | **A** — Next.js 16 + Vercel + Tailwind + shadcn/ui + DM Sans |
| Q10 | Photography (Phase 1) | Dummy/stock + iPhone exteriors at launch; real professional photoshoot delivered after launch (provider: user) |
| Q11 | Payments | **Path 1B** — phased, payment portals only (Razorpay), zero cash, zero offline UPI-to-VPA |
| Q12 | Phase 1 scope | Marketing site + lead form + admin-generated Razorpay links |
| Q13 | Founder | Jithesh Manoharan |

---

## 3. Goals (Phase 1)

1. Capture qualified men-only PG leads in Undri starting **2026-05-01**.
2. Route each lead into BrandMonkz CRM with structured data (phone, employer, move-in date, room-tier interest).
3. Auto-fire a WhatsApp confirmation to the prospect within 5 seconds of submission.
4. Once a prospect tours and confirms, the manager generates a Razorpay link from the BrandMonkz CRM and sends it via WhatsApp; tenant pays online; payment is reconciled in BrandMonkz.
5. Operator-editable: phone, WhatsApp number, address, current price, founding-50-spots-remaining — all editable through Vercel Edge Config without code changes.
6. SEO-discoverable for "PG in Undri", "men's PG Undri", "PG near Magarpatta" within 30 days of launch.
7. Build the website in a way that is reusable for future Zietra-managed PGs (multi-tenant by configuration).

## 4. Non-goals (explicitly out of scope for Phase 1)

- Tenant login / Google OAuth (Phase 2)
- Self-serve recurring rent + electricity payments (Phase 2)
- Tenant dashboard, payment ledger, receipts, complaint tickets (Phase 2)
- Live bed-availability map (Phase 2 or 3)
- Native iOS / Android apps (Phase 3)
- Online e-signing of rent agreement (Phase 3)
- KYC / document upload on the website (always done in person — privacy + IT-Act-2000 cleaner)
- CCTV livestream to tenants (Phase 3)
- Visitor / gate pass (Phase 2)
- Multi-language UI (English-only; deferred indefinitely)
- Blog / content marketing (deferred — re-evaluate after 6 months of data)
- Tenant testimonials (you have none on day 1)

---

## 5. Architecture

```
                    Browser
                       │
                       ▼
            ┌──────────────────────┐
            │   Next.js 16 on      │
            │       Vercel         │
            │   (App Router)       │
            └──────────┬───────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
  ┌─────────┐              ┌──────────────────┐
  │  Edge   │              │   /api/lead      │
  │  Config │              │   (rate-limit +  │
  │ (read)  │              │    validate)     │
  └─────────┘              └─────────┬────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼ (fallback if BrandMonkz fails)
                   ┌──────────────┐      ┌──────────────┐
                   │  BrandMonkz  │      │  Vercel KV   │
                   │     CRM      │      │ lead-fallback│
                   └──────┬───────┘      │    queue     │
                          │              └──────┬───────┘
                          ▼                     │ retry every 5 min
                   ┌──────────────┐             │
                   │  WhatsApp    │◀────────────┘
                   │  Business    │
                   │ (wa.me link  │
                   │  Phase 1)    │
                   └──────────────┘

  Razorpay payment links are generated MANUALLY by manager from
  inside BrandMonkz CRM after tour conversion — no automated
  Razorpay webhook into Habitat website in Phase 1.
```

**Components:**

| Component | Purpose | Where it runs |
|---|---|---|
| `web` | Next.js App Router site | Vercel (auto-scaling) |
| `api/lead` | Lead intake endpoint, rate-limited | Vercel Functions (Node 20) |
| `siteConfig` | Edge Config blob | Vercel Edge Config (replicated globally) |
| `kv` | Vercel KV — lead-intake fallback queue | Vercel KV (Upstash) |
| `brandmonkz` | Lead store + CRM workflow | Existing EC2 `100.24.213.224` |
| `razorpay` | Payment portal | Razorpay (managed) |
| `whatsapp` | WhatsApp Business cloud API | Meta Business |

**Caching strategy:**
- Static pages prerendered at build time
- `siteConfig` read via Edge Config SDK on each request (cached at edge for ~10s)
- Pricing values revalidate via ISR every 60s on the `/` page

**Domain & DNS:**
- `habitatcondos.com` (root) → Vercel via apex A-record OR ALIAS-flatten if GoDaddy supports it; fallback CNAME `www.habitatcondos.com` → Vercel + 301 root → www
- TLS via Vercel auto-cert
- DNS update on launch day; current GoDaddy default record stays until then

---

## 6. Data model — Edge Config schema

Single Edge Config blob, key `siteConfig`. JSON. All fields hot-editable via Vercel dashboard.

```json
{
  "operator": {
    "founder_name": "Jithesh Manoharan",
    "company": "Zietra Technologies Pvt Ltd",
    "registered_address": "TBD"
  },
  "property": {
    "name": "Habitat Condos",
    "tagline": "A simple place to live well, in Undri.",
    "address_line_1": "TBD",
    "address_line_2": "Undri, Pune, Maharashtra 411060",
    "google_maps_embed_url": "TBD",
    "lat": 18.4760,
    "lng": 73.9230,
    "total_flats": 50,
    "total_beds": 200
  },
  "contact": {
    "phone_e164": "TBD",
    "phone_display": "TBD",
    "whatsapp_e164": "TBD",
    "whatsapp_business_id": "TBD",
    "email": "hello@habitatcondos.com"
  },
  "pricing": {
    "flat_price": 15000,
    "deposit": 5000,
    "currency": "INR",
    "currency_symbol": "₹"
  },
  "promos": {
    "founding_50_active": true,
    "founding_50_total": 50,
    "founding_50_remaining": 50,
    "founding_50_perks": [
      "Locked-in price for as long as you stay",
      "Zero brokerage",
      "First month at flat ₹4,999"
    ]
  },
  "tour": {
    "available_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "available_hours": "10:00–19:00 IST"
  },
  "integrations": {
    "razorpay_key_id": "rzp_test_TBD",
    "brandmonkz_intake_url": "TBD",
    "brandmonkz_account_id": "habitat_condos",
    "plausible_domain": "habitatcondos.com",
    "gsc_verification_token": "TBD"
  },
  "legal": {
    "data_fiduciary_name": "Habitat Condos (operated by Jithesh Manoharan)",
    "data_fiduciary_email": "hello@habitatcondos.com",
    "grievance_officer_name": "Jithesh Manoharan",
    "grievance_officer_email": "privacy@habitatcondos.com",
    "grievance_response_sla_days": 30
  },
  "social": {
    "instagram": "TBD",
    "youtube": "TBD",
    "google_business_profile_url": "TBD"
  },
  "tour_extra": {
    "blackout_dates": []
  },
  "feature_flags": {
    "show_pricing": true,
    "show_founding_50_banner": true,
    "show_marathi_tagline": false,
    "show_whatsapp_floating_button": true,
    "show_founders_link": false,
    "enable_rate_limit": true
  }
}
```

**Pricing formula** (computed client-side from `pricing.flat_price`):

```ts
function perBedPrice(flatPrice: number, occupancy: 1 | 2 | 3 | 4): number {
  return Math.round(flatPrice / occupancy);
}
// flat_price=15000 → quad ₹3,750, triple ₹5,000, twin ₹7,500, single ₹15,000
```

**Operator runbook:** to change price, open Vercel dashboard → Edge Config → edit `pricing.flat_price` → save. Site reflects within ~10s globally.

---

## 7. Routes

### Phase 1 (May 1)

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Long landing page, 10 sections | SSG + ISR (60s) |
| `/tour` | Lead form on its own URL — used for WhatsApp / Insta bio deep links | SSG + client form |
| `/founders` | About Jithesh + Zietra Tech credit | SSG |
| `/privacy` | Privacy policy (DPDPA 2023 + IT Act 2000 compliant) | SSG |
| `/terms` | Booking T&Cs, deposit refund policy, cancellation | SSG |
| `/api/lead` | POST endpoint, validates + forwards to BrandMonkz (with KV fallback) + rate-limited | Edge function |
| `/sitemap.xml` | Auto-generated | Build-time |
| `/robots.txt` | `User-agent: * / Allow: /` + sitemap reference | Static |
| `/og-image.png` | 1200×630 social preview | Generated via @vercel/og or pre-baked |

### Phase 2 preview (NOT in this spec)

`/login` · `/dashboard` · `/dashboard/pay-rent` · `/dashboard/electricity` · `/dashboard/receipts` · `/dashboard/complaints` · `/api/auth/[...nextauth]` · `/api/payments/recurring` · etc.

---

## 8. Page-by-page — `/` landing page

10 sections, scrolled top-to-bottom. Each section is a separate React component for easy reuse and ui-ux-pro-max iteration.

### 8.1 Hero
- **Wordmark:** `habitat` (DM Sans Medium, 32px on mobile, 48px on desktop, slate)
- **Tagline (small caps):** `UNDRI · PUNE · VERIFIED MEN ONLY`
- **Headline (H1):** `Less to worry about.`
- **Sub:** `A quiet, verified PG for working men in Undri. Full kitchen, fast Wi-Fi, parking, secure.`
- **Marathi-friendly tagline (small, optional via `feature_flags.show_marathi_tagline`):** `पुण्यातलं तुमचं घर.` ("Your home in Pune.")
- **Primary CTA (pill button, butter background):** `Book a tour →` → scrolls to lead form
- **Secondary CTA (text link with WhatsApp icon):** `Talk on WhatsApp` → opens `wa.me/${whatsapp_e164}?text=Hi%20Habitat...`
- **Background:** dummy hero image at launch (Unsplash-licensed, building exterior style); replace with real Habitat exterior photo within 2 weeks. **Bottom-right of hero, small italic label: `Reference photo — actual building photos coming soon.`** This is non-negotiable per Consumer Protection Act 2019 § 2(28) on misleading advertisements.

### 8.2 Trust strip (5 icons in a row)
- Verified men only
- Police verification
- CCTV 24×7
- Full kitchen
- Secure parking

Single row on desktop, 2-column grid on mobile, icons from `lucide-react`.

### 8.3 What you get
Two-column grid on desktop, single column on mobile. 8 amenity cards, each with icon + name + 1-line description.

| Amenity | Description |
|---|---|
| Full kitchen | Gas, fridge, microwave, dishes — cook your own food |
| 100 Mbps Wi-Fi | Fibre internet in every flat, included |
| CCTV everywhere | 24×7 monitored entrances and corridors |
| 24×7 security | Trained guard at the gate, day and night |
| Parking | One bike + one car spot per flat, included |
| Cleaning | Common areas cleaned daily |
| Power backup | Backup for essentials |
| Maintenance | We fix things. You don't lift a finger. |

### 8.4 Rooms & pricing
4 cards (Quad, Triple, Twin, Single). Each shows: layout sketch (SVG), per-bed price (computed from `flat_price`), what's included, tier badge.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Quad       │  │   Triple     │  │   Twin       │  │   Single     │
│ 4 in flat    │  │ 3 in flat    │  │ 2 in flat    │  │  whole flat  │
│              │  │              │  │              │  │              │
│  ₹3,750/mo   │  │  ₹5,000/mo   │  │  ₹7,500/mo   │  │ ₹15,000/mo   │
│  per bed     │  │  per bed     │  │  per bed     │  │              │
│              │  │              │  │              │  │              │
│ [Book a tour]│  │ [Book a tour]│  │ [Book a tour]│  │ [Book a tour]│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

Footer copy: `All prices include Wi-Fi, electricity, security, parking, cleaning. Excludes food (kitchen-only). Refundable deposit ₹{pricing.deposit} (default ₹5,000).`

If `promos.founding_50_active === true`, show a "Founding 50" ribbon on each card with `${founding_50_remaining}/50 spots left`.

The `pricing.deposit` value is also referenced in `/terms` (refund clause) and rendered in the lead-form success state (`"You'll pay ₹{pricing.deposit} refundable deposit + first month's rent online after your tour."`).

### 8.5 Location
- Embedded Google Map (iframe via `google_maps_embed_url`)
- Commute strip: `12 min to Magarpatta · 18 min to Hadapsar · 25 min to Kharadi · 30 min to Pune Airport`
- Neighbourhood callouts: groceries · pharmacies · gym · ATMs · bus stops within 500m

### 8.6 Inside Habitat (gallery)
8–12 images, masonry grid. Phase 1 uses dummy stock with a small label: `Reference photos — your room may differ. Real photos coming soon.`

Image roles needed:
- Building exterior (3) — dummy at launch, real after photoshoot
- Sample room (3 — quad/triple/twin layouts)
- Kitchen (2)
- Common area (2)
- Parking + entrance + CCTV (2)

### 8.7 How it works
4 numbered steps, each with icon:
1. **Book a tour** — fill the form or WhatsApp us
2. **Visit & sign** — see the place, sign the agreement
3. **Police verification** — we coordinate the paperwork
4. **Move in** — pay deposit + first month online · move in same day

### 8.8 FAQ
Accordion. 10 questions:
1. What's the deposit?
2. What's the notice period?
3. Is food included?
4. Can I have visitors?
5. Is there a curfew?
6. What's the police verification process?
7. How do I pay rent?
8. What if I want to leave early?
9. Is parking really free?
10. Do you have girls' PG too? (No — men only)

Answers stored in `data/faq.ts` for easy edits.

### 8.9 Lead form
Embedded form (also lives on `/tour` standalone). Fields:

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | text | yes | min 2 chars, max 80 |
| `phone` | tel | yes | Indian format, 10 digits |
| `email` | email | no | RFC 5322 |
| `move_in_date` | date | yes | ≥ today |
| `employer_name` | text | yes | min 2 chars, max 100 |
| `room_tier_interest` | select | yes | Quad / Triple / Twin / Single / Not sure |
| `consent_this_enquiry` | checkbox | yes (DPDPA 2023) | must be true · label: "I agree to be contacted by Habitat (call/WhatsApp/email) about THIS enquiry" |
| `consent_marketing` | checkbox | no (optional) | label: "Send me future offers and updates from Habitat" — separate purpose, separate consent |
| `source` | hidden | yes | UTM-tracked or `direct` |

On submit:
1. Client-side validate
2. POST `/api/lead` with payload + Cloudflare Turnstile token (if added) for bot protection
3. Server-side: **rate-limit check** (`@upstash/ratelimit` backed by Vercel KV — 5 submissions per phone per hour, 30 per IP per hour, 200 per day global). 429 if exceeded.
4. Server-side: validate again with zod schema (Appendix B)
5. Server-side: try to write to BrandMonkz CRM → on success, fire WhatsApp confirmation to tenant via `wa.me/` deep-link in success-page redirect (Phase 1) or via WABA API if verified by Apr 28 EOD
6. Server-side: on BrandMonkz failure → enqueue payload to Vercel KV `lead-fallback-queue` + email manager alert (always)
7. Server-side: send email + WhatsApp alert to operator (always — independent of BrandMonkz status)
8. Return success → show success state with "We'll reach out within 2 hours during 10am–7pm IST" + auto-firing WhatsApp deep-link

Error states:
- Validation error → inline field errors
- Network/server error → toast + retry button + fallback "Or WhatsApp us directly: [link]"
- BrandMonkz down → still write to a file/Vercel KV fallback, alert manager via email

### 8.10 Footer
- Wordmark + tagline
- Address + phone + WhatsApp link
- Social: Instagram + Google Business Profile (when live)
- Links: Privacy · Terms · `/founders` (rendered only when `feature_flags.show_founders_link === true` — defaults `false` so we don't link to a stub-content page on launch day; user flips it to `true` once Jithesh's bio + photo are loaded into Edge Config)
- Copyright: `© 2026 Habitat Condos. Technology by Zietra Technologies.`
- Floating WhatsApp button (mobile only) sticky bottom-right, controlled by `feature_flags.show_whatsapp_floating_button`

---

## 9. `/tour` page

Identical to section 8.9 (lead form) but on its own URL with a small hero band above ("Book your tour at Habitat") and the form below. Designed for direct linking from WhatsApp Business profile, Instagram bio, paid ads.

## 10. `/founders` page

- Photo of Jithesh Manoharan (placeholder until provided)
- 2-paragraph bio (TBD content)
- "Why Habitat" story (TBD content)
- Section: "Technology by Zietra Technologies" with brief Zietra Tech credit
- CTA: "Book a tour"

All bio content stored in `data/founders.ts` for easy edits without redeploy.

## 11. `/privacy` and `/terms`

> ⚠️ **Engineering disclaimer:** the privacy and terms content described below is a *draft* assembled from sibling-project templates (Vishmed, Pacific Premier). It is **not legal advice**. Indian counsel review is required before launch. Engineering ships the page scaffolding + content stubs; legal copy is the operator's responsibility. This spec does not commit engineering to "DPDPA compliance" — it commits engineering to *implementing the controls* the lawyer specifies.

Privacy policy explicitly states (per DPDPA 2023 §§ 5–13 and IT Act 2000 § 43A):
- **Notice at point of collection** (DPDPA § 5): plain-English notice rendered above the lead form (not just in `/privacy`) — names purpose, fields collected, who receives the data, and how to withdraw consent.
- **Data Fiduciary** named (DPDPA § 2(i)): pulled from `legal.data_fiduciary_name` in Edge Config.
- **Grievance Officer** named (DPDPA § 13(2)): pulled from `legal.grievance_officer_name` and `legal.grievance_officer_email`. Response SLA: 30 days.
- Aadhaar, PAN, employer letter are NOT collected on the website — collected during in-person tour only.
- Lead data retention: 24 months from last interaction; auto-deletion job in BrandMonkz.
- Third parties: BrandMonkz CRM (data processor), Razorpay (payment processor when applicable), WhatsApp Business (communication channel).
- Data principal rights (DPDPA § 11): right to access / correction / erasure / consent withdrawal — exercise via `privacy@habitatcondos.com`.
- Cookie statement: only essential cookies in Phase 1 (Plausible analytics is cookieless; GA4 not used).
- Children's data: site explicitly not directed at minors; tenant minimum age 18.

Terms cover: deposit refund (within 30 days of vacating, after deductions for damages), notice period (1 month), cancellation (deposit refundable up to 7 days before move-in, ₹1,000 cancellation fee thereafter), liability disclaimers, governing law (Maharashtra), dispute resolution (Pune jurisdiction).

---

## 12. Brand & visual system

### Colors
| Token | Hex | Use |
|---|---|---|
| `slate` | `#2d3142` | Body text, headings, dark UI |
| `butter` | `#f5d27a` | Primary CTA, accents |
| `off-white` | `#f4f4f1` | Page background |
| `slate-light` | `#7a829a` | Secondary text |
| `border` | `#e5e7eb` | Hairline borders |
| `success` | `#10b981` | Form success |
| `error` | `#dc2626` | Form errors |

### Typography
- **Display:** DM Sans (variable) — weights 400, 500, 600, 700
- **Body:** DM Sans 400
- **Marketing pull-quotes (optional):** DM Serif Display

### Components (shadcn/ui base)
- `Button` — variants: primary (butter), secondary (slate-outline), ghost; all pill-shaped (`rounded-full`)
- `Input`, `Select`, `Checkbox` — soft borders, generous padding
- `Card` — 14px radius, subtle shadow
- `Accordion` — for FAQ
- `Toast` — for form feedback
- `Badge` — for "Founding 50" ribbon

### Tone
- No exclamation marks
- No "PUNE'S BEST" / "AMAZING" / "INCREDIBLE" superlatives
- Lower-case headlines preferred
- Direct, friendly, unhurried
- Acceptance of "we don't have it all yet" is on-brand (e.g. "Real photos coming soon.")

### UI-UX-Pro-Max integration
The implementation phase will invoke the `ui-ux-pro-max` skill to:
- Pull a complete component library matching the slate + butter palette
- Generate hero variants
- Validate accessibility (WCAG 2.1 AA contrast, focus rings, keyboard nav)
- Suggest micro-interactions (e.g. hover state on room cards)

This is a build-phase concern, not part of this spec.

---

## 13. Photography & assets

### Phase 1 launch assets (May 1)
- 4–6 iPhone exterior shots of the building, taken by user before May 1
- 8 carefully-curated stock photos (Unsplash, CC0 or paid Unsplash+ license) labelled `Reference photos — your room may differ`
- 1 founder placeholder portrait until real photo provided
- 1 OG image generated via `@vercel/og` from the wordmark + tagline + butter background

### Phase 1.1 (within 2 weeks of launch — by May 15)
Real photoshoot delivered by user. Asset spec:
- 30+ photos, edited
- Formats: WebP primary + JPG fallback
- Crops: 16:9 (hero) and 4:5 (cards)
- Color: sRGB
- Size: ≤500KB after Next.js Image optimization (we run the optimization)
- Shot list:
  - Building exterior: 3 angles, day + dusk = 6
  - Each room layout: 4 layouts × 2 angles = 8
  - Kitchen: 3
  - Parking: 2 (bike + car)
  - CCTV monitor at entry: 1
  - Security guard: 1 (signed model release)
  - Common areas + corridor: 4
  - Detail shots: 4 (a clean made bed, a coffee mug on a desk, a row of bikes, the front-door keypad)

Photographer brief, model release form, and shot list to be delivered alongside this spec.

### Image hosting
- Stored in `public/images/` in the repo
- Served via Next.js `<Image>` component for automatic AVIF/WebP, responsive, lazy
- Optionally migrated to Vercel Blob storage if `public/` size exceeds 50MB
- **Hero image (Section 8.1) carries a small italic "Reference photo" label** until real exterior photos are integrated (Consumer Protection Act 2019 § 2(28) on misleading advertisements)

---

## 14. SEO & metadata

### Per-page metadata
- `<title>` — `Habitat — Verified Men's PG in Undri, Pune` (varies per route)
- `<meta description>` — 155 chars, includes "PG", "Undri", "verified", "police verification", "₹3,750", "men only"
- `<meta keywords>` — modern Google ignores but Bing still uses
- Canonical link to root URL
- `og:title`, `og:description`, `og:image`, `og:url`, `og:type=website`
- `twitter:card=summary_large_image`

### Structured data (JSON-LD)
- `LocalBusiness` schema on `/`:
  - `@type`: `LodgingBusiness`
  - `name`, `address`, `geo`, `telephone`, `priceRange`
  - `openingHoursSpecification` (24×7 for occupancy; tour hours separately)
  - `image` (URL of OG image)
- `FAQPage` schema on `/` (from FAQ section)
- `BreadcrumbList` on each subroute

### Search engine pre-launch
- `robots.txt` allows all
- `sitemap.xml` with all 5 routes + lastmod
- Submitted to Google Search Console (TODAY — Apr 27 — kicks off verification)
- Submitted to Bing Webmaster
- Google Business Profile listing CREATED TODAY for "Habitat Condos PG · Undri Pune" (3–7 day verification)

### Local SEO targets (30-day post-launch)
- "PG in Undri" — top 10 on Google
- "men's PG Undri" — top 5
- "PG near Magarpatta" — top 10
- "verified PG Pune" — top 20

### Plausible vs GA4
Recommend **Plausible** (privacy-friendly, no cookie banner needed, no DPDPA cookie-consent UX). GA4 only if user insists.

---

## 15. Privacy & compliance

### What's NOT collected on the website
- Aadhaar number
- PAN number
- Employer letter / salary slips
- Any financial document

These are collected exclusively during the in-person tour. Lower legal exposure, higher trust signal.

### What IS collected
- Name, phone, optional email — for lead follow-up
- Move-in date, employer name, room interest — for qualification
- **Two purpose-specific consents** (DPDPA 2023 § 6 — purpose-specific):
  - `consent_this_enquiry` (required, must be `true` to submit) — covers call / WhatsApp / email about THIS enquiry only
  - `consent_marketing` (optional, defaults `false`) — covers future offers and updates from Habitat
- IP address, user-agent — standard server log, retained 90 days
- Cookies — only essential (session, if any). No analytics cookies in Phase 1.

### Retention
- Lead data: 24 months from last interaction (BrandMonkz CRM)
- Server logs: 90 days
- Razorpay records: per Razorpay policy (typically 7 years for tax)

### Data protection officer
Email `privacy@habitatcondos.com` (forwarded to Jithesh). Responses within 30 days per DPDPA 2023.

---

## 16. Error handling & edge cases

| Scenario | Handling |
|---|---|
| Lead form submit fails (network) | Toast error + retry button + fallback "Or WhatsApp us: [link]" |
| BrandMonkz API down | Write to **Vercel KV** fallback queue (Vercel Functions filesystem is read-only — KV only) + email manager + Edge function retries every 5 min for 1 hour, then alerts |
| WhatsApp confirmation API fails | Lead is still saved; manager gets email alert; tenant receives no auto-message but manager can manually follow up |
| User submits bot/spam | Cloudflare Turnstile blocks; rate-limiter (`@upstash/ratelimit`) caps at 5/phone/hour, 30/IP/hour; BrandMonkz dedup catches duplicate phones within 48h |
| Edge Config read fails | Fall back to compiled-in defaults from `data/site-config.ts`; log error |
| User opens site in IE11 / very old browser | Show a "please use a modern browser" notice; site requires evergreen browser |
| Mobile on a 3G connection | Site loads in <3s LCP target; images lazy-load; fonts swap |
| User submits Indian phone with leading 0 | Strip leading 0 server-side, validate as 10-digit |
| User enters move-in date in past | Inline error: "Move-in must be in the future" |
| User declines WhatsApp consent | Submit blocked with explanation; alternative: "Email us at hello@..." |
| founding_50_remaining hits 0 | Hide ribbon, show normal price (no discount theatre) |

---

## 17. Testing strategy

### Automated
- Unit tests for `perBedPrice()` formula (Vitest)
- Unit tests for lead-form validation (Vitest + zod schema)
- Integration test for `/api/lead` end-to-end → mocked BrandMonkz
- Lighthouse CI run on every PR — performance ≥90, SEO ≥95, accessibility ≥95
- TypeScript strict mode, no `any`

### Manual pre-launch
- Form submission on real device (Android Chrome, iOS Safari)
- WhatsApp deep-link opens Business chat with prefilled message on real phone
- Razorpay test-mode payment end-to-end
- Page renders correctly on iPhone 13 / Pixel 7 / iPad / 1280px desktop / 1920px desktop
- Map embeds with real Habitat coordinates
- All Edge Config fields actually drive the UI
- 404 page renders
- Privacy + Terms readable, no Lorem Ipsum
- Test with actual 4G connection (not just Wi-Fi) for performance

### Smoke test on launch day
- Submit a test lead → confirm it arrives in BrandMonkz within 30s
- Click WhatsApp button → confirm chat opens with right number + prefill
- Generate a test Razorpay payment link → confirm payment flow works
- Check `siteConfig` change in Vercel dashboard → confirm propagation in <30s

---

## 18. Launch checklist (April 27 → May 1)

### Today (Apr 27 — Sunday) — ⚠️ CRITICAL DECISION GATES (must resolve EOD)
- [ ] **GATE 1 — BrandMonkz path lock-in:** decide by EOD whether (a) BrandMonkz intake endpoint is reachable with a working bearer token (test with `curl`), or (b) commit to **Vercel KV fallback queue + manual CSV import** as the primary Phase 1 path. The 403 issue history (memory note: "BrandMonkz CRM 403 on contact.php push still unresolved") makes this the single biggest launch risk. Spec defaults to (b) until (a) is proven.
- [ ] **GATE 2 — WhatsApp Business verification:** confirm whether Jithesh's number is already on **WhatsApp Business Cloud API** (verified WABA). If NOT verified, Meta verification typically takes 3–7 days → blocks May 1 automated confirmation. Fallback: ship with `wa.me/` deep links only (no automated server-side confirmation send), upgrade to WABA after May 1.
- [ ] User: take 4–6 iPhone exterior shots of the building
- [ ] User: kick off Google Business Profile listing creation (verify on `vercel.app` preview first; re-verify on apex post-launch)
- [ ] User: kick off Google Search Console verification (same approach: preview first, apex later)
- [ ] User: confirm Razorpay account (or create one) for Habitat
- [ ] User: provide Habitat building exact address + Google Maps share-link
- [ ] User: confirm CCTV is installed (or installation date) — Section 8.2 trust strip claim must be true on May 1
- [ ] User: confirm police-verification process is documented (Mundhwa or Hadapsar PS contact)
- [ ] Engineering: scaffold Next.js repo `github.com/jeet-avatar/habitatcondos`
- [ ] Engineering: copy DM Sans + shadcn boilerplate from `pacific-premier`

### Mon Apr 28
- [ ] Engineering: build hero, trust strip, what-you-get, rooms+pricing sections
- [ ] Engineering: integrate Edge Config
- [ ] Engineering: build lead form + `/api/lead` endpoint (mocked BrandMonkz)
- [ ] Engineering: deploy preview to `habitatcondos.vercel.app`

### Tue Apr 29
- [ ] Engineering: location, gallery, how-it-works, FAQ, lead form sections
- [ ] Engineering: footer + privacy + terms + founders pages
- [ ] Engineering: real BrandMonkz integration (resolve 403 issue or work around it)
- [ ] Engineering: WhatsApp Business confirmation message
- [ ] User: review the staging site, give feedback

### Wed Apr 30
- [ ] Engineering: implement feedback
- [ ] Engineering: SEO meta + JSON-LD + sitemap + robots
- [ ] Engineering: OG image
- [ ] Engineering: full Lighthouse pass + manual cross-device test
- [ ] User: review final preview
- [ ] DevOps: configure DNS for `habitatcondos.com` to Vercel

### Thu May 1 (LAUNCH)
- [ ] DevOps: flip DNS at GoDaddy
- [ ] Engineering: smoke test production
- [ ] User: post Google Business Profile if approved
- [ ] User: post Insta + WhatsApp Status with launch announcement
- [ ] All: monitor first 24h of leads

### Post-launch (May 2 → 15)
- [ ] User: book real photographer (week of May 4–8)
- [ ] User: collect Jithesh founder bio + photo
- [ ] Engineering: swap dummy photos for real photos
- [ ] Engineering: refine pricing config based on first leads' feedback
- [ ] Engineering: begin Phase 2 (tenant portal) brainstorm

---

## 19. Phase 2 preview (June 1, NOT in this spec)

- Google OAuth tenant login
- Tenant dashboard: my bed, my flat, my flatmates, my payments
- Recurring rent payment (Razorpay AutoPay)
- Electricity meter reading entry + per-flat splitting + payment
- Receipt history (downloadable PDF, GST invoice format)
- Complaint tickets
- Visitor pass / gate pass
- Notice board (operator-posted announcements)
- Live "Founding 50 spots remaining" tied to real bookings

This will be its own spec written in May after Phase 1 ships.

---

## 20. Deferred decisions / open questions

| # | Question | Owner | Deadline |
|---|---|---|---|
| D1 | Actual launch `flat_price` (default ₹15,000) | User | May 1 |
| D2 | Real Habitat phone number | User | Apr 28 |
| D3 | WhatsApp Business number (existing or new) | User | Apr 28 |
| D4 | Building exact address | User | Apr 28 |
| D5 | Google Maps embed URL | User | Apr 28 |
| D6 | Razorpay account creation + key | User | Apr 29 |
| D7 | BrandMonkz 403 fix or workaround | Engineering | Apr 29 |
| D8 | Jithesh founder bio + photo | User | May 8 |
| D9 | Real photoshoot scheduled | User | May 4–8 |
| D10 | Whether to add Plausible analytics | User | May 15 |
| D11 | Whether to publish a bilingual (Marathi) version | User | June |

---

## 21. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| BrandMonkz 403 not fixable in 4 days | Medium | High | **Decision gate Apr 27 EOD** — if path (a) not proven by EOD, commit to KV-fallback + manual CSV import as primary path; engineering does not block on BrandMonkz |
| WhatsApp Business API not verified by May 1 | High | Medium | **Decision gate Apr 27 EOD** — if WABA not already verified, fall back to `wa.me/` deep links only; no automated server-side WhatsApp send; upgrade post-launch |
| CCTV not installed by May 1 | Medium | High (legal) | Section 8.2 trust strip claim must be true on launch — operator gate; if CCTV install slips, replace icon with "Coming May" or remove until installed |
| Privacy/Terms not lawyer-reviewed | Medium | High (legal) | Engineering ships content stubs from sibling-project templates; explicit disclaimer in Section 11; operator must engage Indian counsel before May 1 — not engineering scope |
| Real photoshoot delayed past May 15 | Medium | Medium | Site stays live with stock photos; replace asynchronously |
| Razorpay account approval delayed | Low | Medium | Razorpay test mode works for layout; flip to prod when approved |
| GBP listing rejected (insufficient verification) | Medium | Medium | Have a postcard delivery address ready; manual review fallback |
| User's iPhone exterior shots are unusably poor | Medium | Low | Use stock-only on May 1; replace as soon as photoshoot delivers |
| Phone number changes between brainstorm and launch | Low | Low | Edge Config update — 10 second fix |
| First 50 booking rate is below expectations | Medium | High (commercial) | Founding-50 mechanic + paid social + listings on NoBroker/IndiaMart — separate marketing task |
| Maharashtra PG license not in place by May 1 | Out of engineering scope | Critical | Operator concern — flagged but not blocking website |

---

## 22. Success criteria (Phase 1)

By **May 31, 2026** (30 days post-launch). Each criterion has a measurement source.

| # | Criterion | Measurement source |
|---|---|---|
| 1 | Website serves >500 unique visitors | Plausible Analytics dashboard (or Vercel Analytics if no Plausible) |
| 2 | ≥30 leads in BrandMonkz CRM | BrandMonkz `leads` filtered by `account_id=habitat_condos` and `created_at` between May 1 – May 31 |
| 3 | ≥10 tours conducted | BrandMonkz lead `status=tour_completed` count |
| 4 | ≥5 tenants with status `moved_in` AND first-payment `paid` in BrandMonkz | BrandMonkz `tenants` table where `status='moved_in'` AND any linked Razorpay `payment.status='captured'` |
| 5 | Lighthouse scores: Performance ≥90, SEO ≥95, Accessibility ≥95 | Vercel Lighthouse CI on `/` and `/tour` (any 1 production run within May 31) |
| 6 | Zero unplanned downtime | Vercel uptime metric — `vercel inspect` or status page |
| 7 | Lead-intake success rate ≥99% | Counter `lead_intake_success / lead_intake_total` from `/api/lead` logs; KV fallback queue drained to 0 within 1 hour of any BrandMonkz outage |
| 8 | Google Business Profile published and showing on Maps for "Habitat Condos Undri" | Manual check on Google Maps |
| 9 | Site ranks in top 20 for "PG in Undri" | Manual SERP check from a Pune-IP-based proxy / GSC position data |
| 10 | Real photos integrated | Visual diff: 0 stock photos labelled "Reference" remaining on `/` |

---

## Appendix A — Pricing formula reference

```ts
// data/pricing.ts
export type Occupancy = 1 | 2 | 3 | 4;

export interface PricingTier {
  occupancy: Occupancy;
  label: string;
  pricePerBed: number;
  totalPerFlat: number;
}

export function computeTiers(flatPrice: number): PricingTier[] {
  return [
    { occupancy: 4, label: 'Quad sharing', pricePerBed: Math.round(flatPrice / 4), totalPerFlat: flatPrice },
    { occupancy: 3, label: 'Triple sharing', pricePerBed: Math.round(flatPrice / 3), totalPerFlat: flatPrice },
    { occupancy: 2, label: 'Twin sharing', pricePerBed: Math.round(flatPrice / 2), totalPerFlat: flatPrice },
    { occupancy: 1, label: 'Single (whole flat)', pricePerBed: flatPrice, totalPerFlat: flatPrice },
  ];
}
```

## Appendix B — Lead form zod schema

```ts
import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Indian 10-digit mobile required'),
  // Empty string from form is normalized to undefined to keep storage clean
  email: z
    .union([z.string().email(), z.literal('').transform(() => undefined)])
    .optional(),
  move_in_date: z
    .string()
    .refine(
      (s) => new Date(s) >= new Date(new Date().toDateString()),
      'Move-in must be today or later',
    ),
  employer_name: z.string().min(2).max(100),
  room_tier_interest: z.enum(['Quad', 'Triple', 'Twin', 'Single', 'Not sure']),
  // DPDPA 2023: purpose-specific consent. Two checkboxes, two consents.
  consent_this_enquiry: z.literal(true, {
    errorMap: () => ({ message: 'Consent to be contacted about this enquiry is required' }),
  }),
  consent_marketing: z.boolean().default(false),
  source: z.string().default('direct'),
});

export type LeadInput = z.infer<typeof leadSchema>;
```

## Appendix C — BrandMonkz integration contract

POST `https://brandmonkz.com/api/external/leads/intake` (target — actual URL TBD pending the 403 resolution)

Headers:
```
Authorization: Bearer ${BRANDMONKZ_INTAKE_TOKEN}
Content-Type: application/json
X-Source: habitatcondos.com
```

Body:
```json
{
  "account_id": "habitat_condos",
  "lead": {
    "name": "...",
    "phone": "+91...",
    "email": "...",
    "tags": ["habitat", "men-only", "undri"],
    "custom_fields": {
      "move_in_date": "2026-05-15",
      "employer_name": "...",
      "room_tier_interest": "Quad",
      "source": "website",
      "utm_source": "...",
      "utm_campaign": "..."
    }
  }
}
```

Response: `{ "ok": true, "lead_id": "..." }`

If 403 / 5xx → enqueue to Vercel KV `lead-fallback-queue`, email manager. Background job retries every 5 min for 1 hour, then alerts.

**Token rotation runbook:** `BRANDMONKZ_INTAKE_TOKEN` lives as a Vercel env var (Production + Preview). To rotate: (1) generate new token in BrandMonkz CRM admin, (2) update Vercel env var, (3) trigger redeploy (or `vercel env pull` then redeploy if using Vercel CLI), (4) revoke old token in BrandMonkz only after redeploy is confirmed live. Never commit tokens to git; `.env.local` is gitignored.

## Appendix D — UI-UX-Pro-Max plan

When the build phase begins, invoke `ui-ux-pro-max` with the brand spec (colors + DM Sans + soft pill + lower-case wordmark + unhurried tone) to generate:
1. Component library (Button variants, Card, Input, Select, Accordion, Badge)
2. Hero variants (3 options for review)
3. Room card variants (3 options)
4. Footer variants (2 options)
5. Mobile breakpoint adjustments
6. Accessibility audit (WCAG 2.1 AA)

Output: a `components/` folder of production-ready React components matching the brand. This is a build-time, not spec-time, concern.

---

**End of design spec.**
