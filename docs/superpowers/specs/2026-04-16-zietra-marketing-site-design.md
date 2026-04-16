# Zietra Marketing Site — Design Spec
**Date:** 2026-04-16  
**Status:** Approved by user  
**Sub-project:** A — zietra.com marketing site (marketing only; app dashboard is Sub-project B)

---

## 1. Overview

Build a standalone Apple-style marketing site for **Zietra** — the unified SMB platform (CRM + Social + Meetings + Video + AI Strategy). The site lives at **zietra.com** and is the primary customer acquisition surface. It is fully static — no backend required at launch.

**Goal:** Convert SMB owners visiting zietra.com into free-tier signups. The design must immediately communicate quality, trust, and product clarity at apple.com standard.

---

## 2. Repository

**Location:** `/apps/zietra/` — new standalone Vite + React + Tailwind app inside the monorepo.

Clean separation from techcloudpro. Zietra has its own brand identity, build pipeline, and deploy target.

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 19 + Vite 6 | Matches existing monorepo pattern |
| Styling | Tailwind CSS 4 | Utility-first, matches monorepo |
| Animations | Framer Motion 11 | `useScroll` / `useTransform` for scroll-linked reveals |
| 3D Hero | Spline (`@splinetool/react-spline`) | True WebGL floating dashboard — lazy loaded |
| Icons | Lucide React | Already used across monorepo |
| SEO | React Helmet Async | Meta tags, OG, structured data |
| Deployment | Hostinger (existing SSH key) | zietra.com DNS → Hostinger PHP host |

---

## 4. Design System

### 4.1 Color Tokens
```
--bg:           #000000        Page background (Apple black)
--bg-2:         #0a0a0a        Section alternate background
--bg-card:      #1d1d1f        Card surfaces
--glass:        rgba(255,255,255,0.05)   Glassmorphism fill
--glass-border: rgba(255,255,255,0.10)   Glassmorphism border
--text:         #f5f5f7        Primary text (Apple off-white)
--text-2:       #a1a1a6        Secondary text
--text-3:       #6e6e73        Muted text / timestamps
--zietra:       #2997ff        Brand primary (Apple blue)
--crm:          #ff6b35        CRM module accent
--social:       #bf5af2        Social module accent (Apple purple)
--meet:         #30d158        Meetings module accent (Apple green)
--video:        #ffd60a        Video module accent (Apple yellow)
--ai:           #64d2ff        AI Strategy accent (Apple teal)
```

### 4.2 Typography
```
font-family: "SF Pro Display", "SF Pro Text", -apple-system,
             BlinkMacSystemFont, "Inter", system-ui, sans-serif;
```

| Role | Size | Weight | Letter-spacing |
|---|---|---|---|
| Hero headline | clamp(52px, 7.5vw, 96px) | 700 | -0.035em |
| Section headline | clamp(36px, 4.5vw, 58px) | 700 | -0.03em |
| Subheadline | clamp(17px, 2vw, 21px) | 400 | -0.01em |
| Body | 17px | 400 | 0 |
| Caption / label | 12px | 600 | 0.06em uppercase |

### 4.3 Glassmorphism Recipe
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border-radius: 18px;
```

### 4.4 Motion Principles
- Hero elements: `opacity 0→1, translateY 20px→0`, staggered 0.1s per element
- Scroll reveals: `IntersectionObserver` threshold 0.12, `opacity + translateY` transition 0.9s ease
- Product cards: `rotateY(-8deg) rotateX(4deg)` → `rotateY(0) rotateX(0)` on hover, 0.5s cubic
- 3D hero: CSS `rotateX(14deg) rotateY(-7deg)` + `animation: float 7s ease-in-out infinite`
- Nav: transparent → `backdrop-filter: blur(20px)` on `scrollY > 20`

---

## 5. Page Structure

Single-page marketing site. All sections on `/` (home). Additional routes: `/pricing`, `/login`, `/signup`.

### 5.1 Section Order (Home)

| # | Section | Height | Key element |
|---|---|---|---|
| 1 | Nav | 52px fixed | Logo + links + CTA |
| 2 | Hero | 100vh | Headline + Spline 3D dashboard + CTAs |
| 3 | Stats strip | ~160px | 4 social-proof numbers |
| 4 | CRM reveal | ~80vh | Scroll reveal, pipeline card right |
| 5 | Social reveal | ~80vh | Scroll reveal, platform grid left |
| 6 | Meet reveal | ~80vh | Scroll reveal, AI summary card right |
| 7 | Automation flow | ~60vh | 5-step horizontal timeline |
| 8 | Success stories | variable | 3-up testimonial grid + comments |
| 9 | Pricing | ~80vh | 3-tier glass cards |
| 10 | Footer | ~320px | 4-column Apple-style |

---

## 6. Component Breakdown

### 6.1 Nav (`<NavBar />`)
- Logo: `Z` mark (blue rounded square) + "Zietra" wordmark
- Links: Features · Success stories · Pricing · Blog
- CTA: `Sign in` ghost + `Start free` filled blue pill
- Behaviour: sticky, transparent at top → blur glass on scroll

### 6.2 Hero (`<HeroSection />`)
- Animated chip: "Public beta — CRM free to start"
- H1: "One platform. Every SMB tool." — gradient on "Every SMB tool."
- Sub: one-line value prop
- CTAs: "Get started free" (primary) + "Watch demo ›" (text link)
- 3D element: `<DashboardMockup3D />` — CSS 3D perspective stage with auto-float animation; Spline scene lazy-loads on top in production
- Glow orbs: radial-gradient blobs behind dashboard

### 6.3 DashboardMockup3D (`<DashboardMockup3D />`)
- MacBook-style titlebar with traffic-light dots
- Module tabs: CRM · Social · Meet · Video · AI Strategy
- Sidebar with icon nav items (one per module)
- Main panel: stats grid (4 metrics), bar chart, 3 contact rows with lead scores
- CSS `perspective: 1400px`, `rotateX(14deg) rotateY(-7deg)`, float animation
- Hover: flattens to `rotateX(3deg) rotateY(0)` — gives depth interaction

### 6.4 Stats Strip (`<StatsStrip />`)
- 4 stats: 500+ SMBs · 3.2× reply rate · $93 saved/mo · 5 tools replaced
- Dark bg, thin border top/bottom, centered flex

### 6.5 Product Reveal Sections (`<ProductReveal />`)
Reusable component. Props: `module`, `chip`, `headline`, `sub`, `features[]`, `card`, `flip`.
- Alternates text-left/card-right and text-right/card-left
- Scroll reveal via `useInView` (Framer Motion) or IntersectionObserver
- 3 instances: CRM, Social, Meet (Video and AI Strategy in Phase 2)

### 6.6 Automation Flow (`<AutomationFlow />`)
- Horizontal timeline, 5 steps: Onboard → Create → Launch → Follow-Up → Close
- Each step: circle icon (module color) + day label + title + description
- Connecting line: pseudo-element gradient between icons
- Hover: icon scales 1.12×

### 6.7 Success Stories (`<SuccessStories />`)
- 3-up grid of `<StoryCard />` components
- Each card: ★★★★★ rating, quote, avatar + name + role + module chip
- **Reactions:** ❤️ 🙌 🔥 — toggleable buttons with live count (localStorage-persisted)
- **Comments:** collapsible thread per story, `<CommentForm />` with Enter-to-submit
- Comment data: localStorage for MVP, API endpoint in Phase 2
- "Add a comment" input + Post button

### 6.8 Pricing (`<PricingSection />`)
3 cards: Starter ($0) · Growth ($79/mo) · Scale ($149/mo)
- Growth card: featured state (blue border + "Most Popular" badge)
- Each card: tier name, amount, period, CTA button, feature list with green checkmarks

### 6.9 Footer (`<SiteFooter />`)
- 4-column grid: brand (logo + desc) · Product links · Company links · Legal links
- Bottom bar: copyright + tagline
- Apple-style minimal, dark

---

## 7. Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `<HomePage />` | All sections |
| `/pricing` | `<PricingPage />` | Full pricing breakdown |
| `/login` | `<LoginPage />` | Phase 1: stub page only — form UI built, submission wired in Phase 2 when shared auth (22-07) is deployed |
| `/signup` | `<SignupPage />` | Phase 1: stub page only — form UI built, submission wired in Phase 2 |
| `/features/crm` | `<FeatureCRM />` | Deep-dive page (Phase 2) |
| `/features/social` | `<FeatureSocial />` | Deep-dive page (Phase 2) |
| `/features/meet` | `<FeatureMeet />` | Deep-dive page (Phase 2) |
| `/blog` | `<BlogIndex />` | Phase 2 |

---

## 8. Deployment

- **Build:** `npm run build` → `/apps/zietra/dist/`
- **Deploy:** `scp -P 65002 -r dist/* u350621741@147.93.101.51:/home/u350621741/domains/zietra.com/public_html/`
- **DNS:** A record `zietra.com → 147.93.101.51` (Hostinger shared IP — same as techcloudpro.com; CNAME cannot be used on apex domain)
- **HTTPS:** Hostinger provides Let's Encrypt SSL automatically

---

## 9. Success Criteria

- [ ] Lighthouse Performance ≥ 90 on mobile
- [ ] Lighthouse SEO ≥ 95
- [ ] LCP < 2.5s (hero 3D lazy-loaded, does not block)
- [ ] All 7 home sections render correctly at 375px, 768px, 1280px, 1440px
- [ ] Nav blur triggers on scroll
- [ ] Scroll reveals trigger on all 3 product sections
- [ ] Story reactions toggle and persist in localStorage
- [ ] Comments submit on Enter and on Post button click
- [ ] Pricing CTA buttons link to `/signup`
- [ ] "Start free" nav CTA links to `/signup`

---

## 10. Out of Scope (Phase 1)

- Video and AI Strategy product reveal sections (Phase 2)
- Blog index and individual post pages (Phase 2)
- Backend comment API (localStorage for MVP)
- Spline scene creation (CSS 3D mockup ships first; Spline replaces it Phase 2)
- App dashboard UI (Sub-project B, separate spec)
- ActiveCampaign importer (Phase 22-08)
- Entitlement / billing integration (Phase 22-01)
