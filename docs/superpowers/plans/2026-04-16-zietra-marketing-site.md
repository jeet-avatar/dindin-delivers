# Zietra Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Zietra marketing site (zietra.com) — an Apple-style dark-mode single-page app showcasing the Zietra SMB platform (CRM + Social + Meetings).

**Architecture:** Standalone Vite 6 + React 19 + Tailwind CSS 4 app in `/apps/zietra/`. Pure frontend, no backend. All pages rendered client-side with React Router 7. Deploy to AWS — S3 bucket (`zietra-marketing`) + CloudFront distribution + ACM cert + Route53 hosted zone in account `134607809447`, region `us-east-1`. Fully separate hosting from techcloudpro.com (which stays on Hostinger). Design spec lives at `docs/superpowers/specs/2026-04-16-zietra-marketing-site-design.md`.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4 (via `@tailwindcss/vite`), Framer Motion 12, Lucide React, React Router 7, React Helmet Async, `@splinetool/react-spline` (lazy-loaded for Phase 2)

---

## File Map

Files to create (all relative to `/apps/zietra/`):

```
apps/zietra/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/
    │   └── globals.css          ← CSS custom properties (design tokens)
    ├── data/
    │   ├── stories.ts           ← Testimonial data (3 entries)
    │   └── pricing.ts           ← Pricing tier data (3 tiers)
    ├── hooks/
    │   └── useLocalStorage.ts   ← Generic localStorage hook (reactions + comments)
    ├── components/
    │   ├── NavBar.tsx            ← Sticky nav, scroll blur, logo, links, CTAs
    │   ├── HeroSection.tsx       ← Chip + headline + CTAs + DashboardMockup3D
    │   ├── DashboardMockup3D.tsx ← CSS 3D perspective floating dashboard mockup
    │   ├── StatsStrip.tsx        ← 4 social-proof stats bar
    │   ├── ProductReveal.tsx     ← Reusable scroll-reveal section (3 instances)
    │   ├── AutomationFlow.tsx    ← 5-step horizontal timeline
    │   ├── StoryCard.tsx         ← Testimonial card + reactions + comments
    │   ├── SuccessStories.tsx    ← 3-up grid of StoryCard
    │   ├── PricingSection.tsx    ← 3 glass pricing cards
    │   └── SiteFooter.tsx        ← 4-column Apple-style footer
    └── pages/
        ├── HomePage.tsx          ← Assembles all sections
        ├── PricingPage.tsx       ← Full pricing breakdown page
        ├── LoginPage.tsx         ← Stub login form (Phase 1: UI only)
        └── SignupPage.tsx        ← Stub signup form (Phase 1: UI only)
```

---

## Chunk 1: Scaffold + Design System + NavBar

### Task 1: Scaffold /apps/zietra/

**Files:**
- Create: `apps/zietra/package.json`
- Create: `apps/zietra/tsconfig.json`
- Create: `apps/zietra/tsconfig.app.json`
- Create: `apps/zietra/tsconfig.node.json`
- Create: `apps/zietra/vite.config.ts`
- Create: `apps/zietra/index.html`
- Create: `apps/zietra/public/favicon.svg`
- Create: `apps/zietra/src/main.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "zietra",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@splinetool/react-spline": "^2.2.6",
    "framer-motion": "^12.15.0",
    "lucide-react": "^0.460.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-helmet-async": "^3.0.0",
    "react-router": "^7.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.15.0",
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.15.0",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.6.2",
    "vite": "^6.0.5"
  }
}
```

Save to `apps/zietra/package.json`.

- [ ] **Step 2: Create tsconfig files**

`apps/zietra/tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`apps/zietra/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`apps/zietra/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zietra — One platform. Every SMB tool.</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create public/favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#2997ff"/>
  <text x="16" y="23" text-anchor="middle" font-family="system-ui,sans-serif"
        font-weight="700" font-size="20" fill="white">Z</text>
</svg>
```

- [ ] **Step 6: Create src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Create stub src/App.tsx (required before npm run dev)**

`main.tsx` imports `App.tsx` — it must exist before the dev server starts. This stub is replaced completely in Task 14.

```tsx
export default function App() {
  return (
    <div style={{ color: '#f5f5f7', padding: 40, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>Zietra</h1>
      <p style={{ color: '#a1a1a6', marginTop: 8 }}>Scaffolding complete ✓</p>
    </div>
  )
}
```

- [ ] **Step 8: Install dependencies**

```bash
cd apps/zietra
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit scaffold**

```bash
cd /Users/jeet/doordash-p2p
git add apps/zietra/
git commit -m "feat(zietra): scaffold Vite+React+Tailwind app"
```

---

### Task 2: Design system — globals.css

**Files:**
- Create: `apps/zietra/src/styles/globals.css`

- [ ] **Step 1: Create globals.css with design tokens and base styles**

```css
@import "tailwindcss";

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
:root {
  /* Backgrounds */
  --bg:          #000000;
  --bg-2:        #0a0a0a;
  --bg-card:     #1d1d1f;
  --glass:       rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.10);

  /* Text */
  --text:        #f5f5f7;
  --text-2:      #a1a1a6;
  --text-3:      #6e6e73;

  /* Brand */
  --zietra:      #2997ff;
  --zietra-dim:  rgba(41, 151, 255, 0.15);

  /* Module accents */
  --crm:         #ff6b35;
  --social:      #bf5af2;
  --meet:        #30d158;
  --video:       #ffd60a;
  --ai:          #64d2ff;
}

/* ============================================================
   ANIMATIONS
   ============================================================ */
@keyframes float {
  0%,  100% { transform: translateY(0px); }
  50%       { transform: translateY(-14px); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ============================================================
   BASE
   ============================================================ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: "SF Pro Display", "SF Pro Text", -apple-system,
               BlinkMacSystemFont, "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* ============================================================
   TYPOGRAPHY UTILITIES
   ============================================================ */
.hero-headline {
  font-size: clamp(52px, 7.5vw, 96px);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.section-headline {
  font-size: clamp(36px, 4.5vw, 58px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.subheadline {
  font-size: clamp(17px, 2vw, 21px);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.5;
  color: var(--text-2);
}

.label-cap {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ============================================================
   GLASSMORPHISM CARD
   ============================================================ */
.glass-card {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 18px;
}

/* ============================================================
   GRADIENT TEXT
   ============================================================ */
.gradient-text {
  background: linear-gradient(135deg, var(--zietra) 0%, var(--social) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ============================================================
   SCROLL REVEAL (base state — JS adds .revealed)
   ============================================================ */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.9s ease, transform 0.9s ease;
}

.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 768px) {
  .nav-links { display: none; }
}

/* ============================================================
   LINKS
   ============================================================ */
a { text-decoration: none; color: inherit; }
```

- [ ] **Step 2: Verify CSS loads (create minimal App.tsx + check dev server)**

Create a stub `apps/zietra/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div style={{ color: 'var(--text)', padding: 40, fontFamily: 'inherit' }}>
      <h1 className="hero-headline">Zietra</h1>
      <p className="subheadline">Design system loaded ✓</p>
    </div>
  )
}
```

Run:
```bash
cd apps/zietra && npm run dev
```

Open `http://localhost:5173`. Expect: black background, large "Zietra" heading in `#f5f5f7`, subline in grey.

- [ ] **Step 3: Commit design tokens**

```bash
cd /Users/jeet/doordash-p2p
git add apps/zietra/src/styles/globals.css apps/zietra/src/App.tsx
git commit -m "feat(zietra): add design tokens and global styles"
```

---

### Task 3: NavBar

**Files:**
- Create: `apps/zietra/src/components/NavBar.tsx`

- [ ] **Step 1: Create NavBar.tsx**

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router'

export function NavBar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: scrolled ? 'rgba(0,0,0,0.72)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease',
    }}>

      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, background: 'var(--zietra)',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17,
          flexShrink: 0,
        }}>Z</div>
        <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Zietra</span>
      </Link>

      {/* Center links — hidden below 768px via className */}
      <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <a href="#features" style={{ color: 'var(--text-2)', fontSize: 14 }}>Features</a>
        <a href="#stories" style={{ color: 'var(--text-2)', fontSize: 14 }}>Success stories</a>
        <Link to="/pricing" style={{ color: 'var(--text-2)', fontSize: 14 }}>Pricing</Link>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/login" style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 400 }}>
          Sign in
        </Link>
        <Link to="/signup" style={{
          background: 'var(--zietra)', color: '#fff',
          padding: '8px 20px', borderRadius: 980,
          fontSize: 14, fontWeight: 500,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Start free
        </Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add NavBar to stub App.tsx and verify**

Update `apps/zietra/src/App.tsx`:
```tsx
import { BrowserRouter } from 'react-router'
import { NavBar } from './components/NavBar'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <div style={{ paddingTop: 100, padding: 60, color: 'var(--text)' }}>
        <h1 className="hero-headline">Zietra</h1>
      </div>
    </BrowserRouter>
  )
}
```

Start dev server and verify:
- Nav is transparent at top
- Scroll down → blurs glass
- "Start free" pill button renders in `#2997ff`
- "Sign in" and "Pricing" links render

- [ ] **Step 3: Commit NavBar**

```bash
cd /Users/jeet/doordash-p2p
git add apps/zietra/src/components/NavBar.tsx apps/zietra/src/App.tsx
git commit -m "feat(zietra): add NavBar with scroll blur effect"
```

---

## Chunk 2: Hero Section + Stats Strip

### Task 4: DashboardMockup3D

**Files:**
- Create: `apps/zietra/src/components/DashboardMockup3D.tsx`

This is a CSS-only 3D fake dashboard — no real data, no backend. It auto-floats and flattens on hover.

- [ ] **Step 1: Create DashboardMockup3D.tsx**

```tsx
const TABS = ['CRM', 'Social', 'Meet', 'Video', 'AI Strategy']

const SIDEBAR_ITEMS = [
  { label: 'Pipeline', color: 'var(--crm)' },
  { label: 'Contacts', color: 'var(--crm)' },
  { label: 'Campaigns', color: 'var(--zietra)' },
  { label: 'Social', color: 'var(--social)' },
  { label: 'Meetings', color: 'var(--meet)' },
  { label: 'Analytics', color: 'var(--text-3)' },
]

const STATS = [
  { label: 'Active Deals', value: '48', delta: '+12%', color: 'var(--crm)' },
  { label: 'Reply Rate', value: '31%', delta: '+8%', color: 'var(--meet)' },
  { label: 'Posts Today', value: '14', delta: '+3', color: 'var(--social)' },
  { label: 'Meetings', value: '7', delta: 'this week', color: 'var(--zietra)' },
]

const CONTACTS = [
  { name: 'Sarah Chen', role: 'VP Marketing', score: 92 },
  { name: 'Marcus Reid', role: 'CTO, Fintech', score: 87 },
  { name: 'Priya Sharma', role: 'Founder, SaaS', score: 79 },
]

export function DashboardMockup3D() {
  return (
    <div style={{ animation: 'float 7s ease-in-out infinite' }}>
      <div
        style={{
          transform: 'perspective(1400px) rotateX(14deg) rotateY(-7deg)',
          transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          width: 680, height: 420,
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e =>
          (e.currentTarget.style.transform =
            'perspective(1400px) rotateX(3deg) rotateY(0deg)')
        }
        onMouseLeave={e =>
          (e.currentTarget.style.transform =
            'perspective(1400px) rotateX(14deg) rotateY(-7deg)')
        }
      >
        {/* ── Titlebar ── */}
        <div style={{
          height: 36, background: 'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 16, flexShrink: 0,
        }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>

          {/* Module tabs */}
          <div style={{ display: 'flex', gap: 0, flex: 1 }}>
            {TABS.map((tab, i) => (
              <div key={tab} style={{
                padding: '0 12px', height: 36, display: 'flex', alignItems: 'center',
                fontSize: 11, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#fff' : 'rgba(255,255,255,0.35)',
                borderBottom: i === 0 ? '2px solid var(--zietra)' : '2px solid transparent',
              }}>{tab}</div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          <div style={{
            width: 140, background: 'rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 0', flexShrink: 0,
          }}>
            {SIDEBAR_ITEMS.map(item => (
              <div key={item.label} style={{
                padding: '7px 16px', fontSize: 11, color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {STATS.map(stat => (
                <div key={stat.label} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--meet)', marginTop: 2 }}>{stat.delta}</div>
                </div>
              ))}
            </div>

            {/* Fake bar chart */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 8 }}>Pipeline by stage</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48 }}>
                {[60, 45, 80, 35, 55, 70, 30].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`,
                    background: `rgba(41,151,255,${0.3 + i * 0.08})`,
                    borderRadius: '3px 3px 0 0',
                  }} />
                ))}
              </div>
            </div>

            {/* Contact rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONTACTS.map(c => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--zietra-dim)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--zietra)',
                    flexShrink: 0,
                  }}>
                    {c.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{c.role}</div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: c.score > 85 ? 'var(--meet)' : 'var(--crm)',
                  }}>
                    {c.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders — add to stub App.tsx temporarily**

```tsx
import { DashboardMockup3D } from './components/DashboardMockup3D'
// Add inside the div: <DashboardMockup3D />
```

Dev server: check the 3D floating card, hover to flatten. Should see titlebar with traffic lights, tabs, sidebar, stats grid, bar chart, contacts.

- [ ] **Step 3: Commit DashboardMockup3D**

```bash
git add apps/zietra/src/components/DashboardMockup3D.tsx
git commit -m "feat(zietra): add CSS 3D floating dashboard mockup"
```

---

### Task 5: HeroSection

**Files:**
- Create: `apps/zietra/src/components/HeroSection.tsx`

- [ ] **Step 1: Create HeroSection.tsx**

```tsx
import { Link } from 'react-router'
import { DashboardMockup3D } from './DashboardMockup3D'

export function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '120px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(41,151,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '60%', left: '30%',
        width: 300, height: 300,
        background: 'radial-gradient(ellipse, rgba(191,90,242,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Animated chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(41,151,255,0.12)',
        border: '1px solid rgba(41,151,255,0.25)',
        borderRadius: 980, padding: '6px 16px',
        marginBottom: 32,
        animation: 'fadeIn 0.6s ease',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--zietra)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--zietra)' }}>
          Public beta — CRM free to start
        </span>
      </div>

      {/* H1 */}
      <h1 className="hero-headline" style={{
        maxWidth: 800,
        marginBottom: 24,
        animation: 'fadeInUp 0.7s ease 0.1s both',
      }}>
        One platform.{' '}
        <span className="gradient-text">Every SMB tool.</span>
      </h1>

      {/* Subheadline */}
      <p className="subheadline" style={{
        maxWidth: 560,
        marginBottom: 40,
        animation: 'fadeInUp 0.7s ease 0.2s both',
      }}>
        CRM, social scheduling, video meetings, AI strategy — built together so nothing
        falls through the cracks.
      </p>

      {/* CTAs */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 80,
        animation: 'fadeInUp 0.7s ease 0.3s both',
      }}>
        <Link to="/signup" style={{
          background: 'var(--zietra)', color: '#fff',
          padding: '16px 32px', borderRadius: 980,
          fontSize: 17, fontWeight: 600,
          transition: 'opacity 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.03)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          Get started free
        </Link>
        <button
          onClick={() => document.getElementById('automation')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--zietra)', fontSize: 17, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          Watch demo ›
        </button>
      </div>

      {/* 3D Dashboard */}
      <div style={{
        animation: 'fadeInUp 0.9s ease 0.4s both',
        maxWidth: '100%', overflowX: 'hidden',
        display: 'flex', justifyContent: 'center',
      }}>
        <DashboardMockup3D />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify in dev server**

Add `<HeroSection />` to stub App.tsx and open dev server. Verify:
- Blue glow behind dashboard
- Animated "Public beta" chip
- Gradient text "Every SMB tool."
- Two CTAs inline
- Dashboard floats below

- [ ] **Step 3: Commit HeroSection**

```bash
git add apps/zietra/src/components/HeroSection.tsx
git commit -m "feat(zietra): add hero section with 3D dashboard and animated CTAs"
```

---

### Task 6: StatsStrip

**Files:**
- Create: `apps/zietra/src/components/StatsStrip.tsx`

- [ ] **Step 1: Create StatsStrip.tsx**

```tsx
const STATS = [
  { value: '500+',  label: 'SMBs growing on Zietra' },
  { value: '3.2×',  label: 'higher reply rate' },
  { value: '$93',   label: 'saved per month' },
  { value: '5',     label: 'tools replaced' },
]

export function StatsStrip() {
  return (
    <div style={{
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24, textAlign: 'center',
      }}>
        {STATS.map(stat => (
          <div key={stat.label}>
            <div style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--text)',
              marginBottom: 6,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in dev server — 4 stats centered, dark bg strip**

- [ ] **Step 3: Commit**

```bash
git add apps/zietra/src/components/StatsStrip.tsx
git commit -m "feat(zietra): add stats strip with 4 social-proof numbers"
```

---

## Chunk 3: Product Reveals + Automation Flow

### Task 7: ProductReveal (reusable)

**Files:**
- Create: `apps/zietra/src/components/ProductReveal.tsx`

This component is used 3 times on the homepage — CRM, Social, Meet. `flip` prop swaps text/card sides.

- [ ] **Step 1: Create ProductReveal.tsx**

```tsx
import { useEffect, useRef } from 'react'

interface ProductRevealProps {
  id?: string
  chip: string
  chipColor: string
  headline: string
  sub: string
  features: string[]
  card: React.ReactNode
  flip?: boolean
}

export function ProductReveal({ id, chip, chipColor, headline, sub, features, card, flip }: ProductRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const textSide = (
    <div style={{ flex: '0 0 420px', maxWidth: 420 }}>
      <div style={{
        display: 'inline-block', marginBottom: 20,
        background: `${chipColor}22`,
        border: `1px solid ${chipColor}44`,
        borderRadius: 980, padding: '5px 14px',
        fontSize: 12, fontWeight: 600, color: chipColor,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {chip}
      </div>
      <h2 className="section-headline" style={{ marginBottom: 16 }}>{headline}</h2>
      <p className="subheadline" style={{ marginBottom: 32 }}>{sub}</p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 16, color: 'var(--text)' }}>
            <span style={{ color: chipColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )

  const cardSide = (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {card}
    </div>
  )

  return (
    <section id={id} ref={ref} className="reveal" style={{
      padding: '100px 24px',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap',
        flexDirection: flip ? 'row-reverse' : 'row',
      }}>
        {textSide}
        {cardSide}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create the 3 card elements (inline in HomePage — see Task 13)**

The card content is passed as a `card` prop from HomePage. Cards are glass-card divs styled per module:

**CRM card** — pipeline board with 3 stage columns (To Contact, Qualified, Closed):
```tsx
const CRMCard = (
  <div className="glass-card" style={{ padding: 24, width: 340 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Pipeline — Q2</div>
    {[
      { stage: 'To Contact', deals: ['Sarah Chen — $12K', 'Global Tech — $8K'], color: 'var(--crm)' },
      { stage: 'Qualified', deals: ['Apex Labs — $21K'], color: 'var(--zietra)' },
      { stage: 'Closed ✓', deals: ['FreshBrew — $5K', 'NxtStep — $9K'], color: 'var(--meet)' },
    ].map(col => (
      <div key={col.stage} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: col.color, marginBottom: 6 }}>{col.stage}</div>
        {col.deals.map(d => (
          <div key={d} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6,
            padding: '6px 10px', fontSize: 12, color: 'var(--text)',
            marginBottom: 4, border: '1px solid rgba(255,255,255,0.06)',
          }}>{d}</div>
        ))}
      </div>
    ))}
  </div>
)
```

**Social card** — platform grid with scheduled post times:
```tsx
const SocialCard = (
  <div className="glass-card" style={{ padding: 24, width: 340 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Scheduled today</div>
    {[
      { platform: 'LinkedIn', time: '9:00 AM', preview: 'Q2 growth story — 3 slides', color: '#0A66C2' },
      { platform: 'Instagram', time: '12:30 PM', preview: 'Behind the scenes 🔥', color: 'var(--social)' },
      { platform: 'Twitter/X', time: '3:00 PM', preview: 'Product tip of the week', color: '#1DA1F2' },
      { platform: 'Facebook', time: '6:00 PM', preview: 'Customer spotlight — GlamCo', color: '#1877F2' },
    ].map(p => (
      <div key={p.platform} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.platform}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.preview}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.time}</div>
      </div>
    ))}
  </div>
)
```

**Meet card** — meeting summary with AI bullet points:
```tsx
const MeetCard = (
  <div className="glass-card" style={{ padding: 24, width: 340 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>AI Meeting Summary</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
      GlamCo — Discovery Call
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Key decisions:</div>
    {[
      'Expand to EU market by Q3',
      'Budget approved — $24K ARR',
      'Onboarding starts next Monday',
    ].map(point => (
      <div key={point} style={{
        display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text)',
      }}>
        <span style={{ color: 'var(--meet)', flexShrink: 0 }}>◆</span>
        {point}
      </div>
    ))}
    <div style={{
      marginTop: 16, padding: '10px 12px',
      background: 'rgba(48,209,88,0.08)', borderRadius: 8,
      border: '1px solid rgba(48,209,88,0.2)',
      fontSize: 12, color: 'var(--meet)',
    }}>
      Follow-up email drafted by AI — ready to send ›
    </div>
  </div>
)
```

These card definitions live in `HomePage.tsx` (Task 13) alongside their ProductReveal usage.

- [ ] **Step 3: Commit ProductReveal**

```bash
git add apps/zietra/src/components/ProductReveal.tsx
git commit -m "feat(zietra): add reusable ProductReveal scroll-reveal component"
```

---

### Task 8: AutomationFlow

**Files:**
- Create: `apps/zietra/src/components/AutomationFlow.tsx`

- [ ] **Step 1: Create AutomationFlow.tsx**

```tsx
import { useEffect, useRef } from 'react'

const STEPS = [
  {
    day: 'Day 1', icon: '🧭', title: 'Onboard',
    desc: 'Import contacts, connect social, invite team in 5 minutes.',
    color: 'var(--zietra)',
  },
  {
    day: 'Day 2', icon: '✍️', title: 'Create',
    desc: 'AI drafts your first week of social posts and email sequences.',
    color: 'var(--social)',
  },
  {
    day: 'Day 4', icon: '🚀', title: 'Launch',
    desc: 'Campaigns go live across LinkedIn, Instagram, and email.',
    color: 'var(--crm)',
  },
  {
    day: 'Day 7', icon: '🔁', title: 'Follow-Up',
    desc: 'AI surfaces warm leads, books meetings, and sends reminders.',
    color: 'var(--meet)',
  },
  {
    day: 'Day 14', icon: '🏆', title: 'Close',
    desc: 'Deals move through your pipeline with AI-written proposals.',
    color: 'var(--video)',
  },
]

export function AutomationFlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="automation" ref={ref} className="reveal" style={{
      padding: '100px 24px',
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            How it works
          </div>
          <h2 className="section-headline">From onboarding to closed deal in 14 days.</h2>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute', top: 28, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--zietra), var(--social), var(--crm), var(--meet), var(--video))',
            opacity: 0.3,
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 24 }}>
            {STEPS.map((step, i) => (
              <div key={step.title} style={{ textAlign: 'center' }}>
                {/* Icon circle */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `${step.color}22`,
                  border: `2px solid ${step.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, margin: '0 auto 16px',
                  transition: 'transform 0.2s',
                  cursor: 'default',
                  position: 'relative', zIndex: 1, background: 'var(--bg-2)',
                  boxShadow: `0 0 0 4px var(--bg-2)`,
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {step.icon}
                </div>
                <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{step.day}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: step.color, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify in dev server — 5 steps in row, gradient connecting line, icons scale on hover**

- [ ] **Step 3: Commit**

```bash
git add apps/zietra/src/components/AutomationFlow.tsx
git commit -m "feat(zietra): add automation flow timeline section"
```

---

## Chunk 4: Social Proof + Pricing + Footer

### Task 9: Data files + useLocalStorage hook

**Files:**
- Create: `apps/zietra/src/data/stories.ts`
- Create: `apps/zietra/src/data/pricing.ts`
- Create: `apps/zietra/src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Create src/data/stories.ts**

```ts
export interface Story {
  id: string
  quote: string
  name: string
  role: string
  company: string
  module: 'CRM' | 'Social' | 'Meet'
  moduleColor: string
  initials: string
  defaultReactions: { heart: number; hands: number; fire: number }
}

export const STORIES: Story[] = [
  {
    id: 'sarah-bloom',
    quote: "I replaced HubSpot, Buffer, and Calendly with Zietra. My reply rate went from 8% to 31% in the first month. The AI drafts are scary good.",
    name: 'Sarah Bloom',
    role: 'Founder',
    company: 'GlamCo Beauty',
    module: 'CRM',
    moduleColor: '#ff6b35',
    initials: 'SB',
    defaultReactions: { heart: 24, hands: 11, fire: 18 },
  },
  {
    id: 'marcus-osei',
    quote: "Our team books 3× more demo calls since switching. The AI meeting summaries save us 2 hours a week — I send follow-ups before the prospect closes their laptop.",
    name: 'Marcus Osei',
    role: 'Sales Lead',
    company: 'Apex Labs',
    module: 'Meet',
    moduleColor: '#30d158',
    initials: 'MO',
    defaultReactions: { heart: 31, hands: 15, fire: 22 },
  },
  {
    id: 'priya-nair',
    quote: "I was spending 4 hours a week on social. Now I do it in 20 minutes. Zietra schedules across all platforms and tells me exactly which posts drove leads.",
    name: 'Priya Nair',
    role: 'Marketing Director',
    company: 'NxtStep Finance',
    module: 'Social',
    moduleColor: '#bf5af2',
    initials: 'PN',
    defaultReactions: { heart: 19, hands: 8, fire: 14 },
  },
]
```

- [ ] **Step 2: Create src/data/pricing.ts**

```ts
export interface PricingTier {
  id: string
  name: string
  price: number | 'Custom'
  period?: string
  badge?: string
  featured?: boolean
  cta: string
  features: string[]
}

export const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    period: '/mo',
    cta: 'Start free',
    features: [
      'Full CRM — unlimited contacts',
      'Social scheduling — 3 platforms',
      'Zietra Meet — unlimited calls',
      '100 AI credits / month',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    period: '/mo',
    badge: 'Most Popular',
    featured: true,
    cta: 'Start free trial',
    features: [
      'Everything in Starter',
      'Social scheduling — all platforms',
      'Campaign email sends — 10K/mo',
      '2,000 AI credits / month',
      'Video recording (1 hour)',
      'AI Strategy Bot',
      'Priority support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 149,
    period: '/mo',
    cta: 'Contact sales',
    features: [
      'Everything in Growth',
      'Unlimited AI credits',
      'Campaign sends — unlimited',
      'Video recording — unlimited',
      'Multi-seat (up to 10 users)',
      'Custom integrations',
      'Dedicated onboarding',
      'SLA support',
    ],
  },
]
```

- [ ] **Step 3: Create src/hooks/useLocalStorage.ts**

```ts
import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage unavailable (private mode, quota exceeded)
    }
  }, [key, value])

  return [value, setValue]
}
```

- [ ] **Step 4: Commit data + hook**

```bash
git add apps/zietra/src/data/ apps/zietra/src/hooks/
git commit -m "feat(zietra): add testimonial data, pricing data, and useLocalStorage hook"
```

---

### Task 10: StoryCard + SuccessStories

**Files:**
- Create: `apps/zietra/src/components/StoryCard.tsx`
- Create: `apps/zietra/src/components/SuccessStories.tsx`

- [ ] **Step 1: Create StoryCard.tsx**

```tsx
import { useState } from 'react'
import type { Story } from '../data/stories'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Comment {
  id: string
  text: string
  time: string
}

export function StoryCard({ story }: { story: Story }) {
  const [reactions, setReactions] = useLocalStorage<{
    heart: number; hands: number; fire: number;
    myHeart: boolean; myHands: boolean; myFire: boolean;
  }>(`reactions-${story.id}`, {
    heart: story.defaultReactions.heart,
    hands: story.defaultReactions.hands,
    fire: story.defaultReactions.fire,
    myHeart: false, myHands: false, myFire: false,
  })

  const [comments, setComments] = useLocalStorage<Comment[]>(`comments-${story.id}`, [])
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)

  function toggleReaction(type: 'heart' | 'hands' | 'fire') {
    const myKey = `my${type.charAt(0).toUpperCase()}${type.slice(1)}` as 'myHeart' | 'myHands' | 'myFire'
    const wasOn = reactions[myKey]
    setReactions({
      ...reactions,
      [type]: reactions[type] + (wasOn ? -1 : 1),
      [myKey]: !wasOn,
    })
  }

  function submitComment() {
    const text = commentText.trim()
    if (!text) return
    const newComment: Comment = {
      id: Date.now().toString(),
      text,
      time: 'just now',
    }
    setComments([...comments, newComment])
    setCommentText('')
  }

  return (
    <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stars */}
      <div style={{ color: '#ffd60a', fontSize: 14, letterSpacing: 2 }}>★★★★★</div>

      {/* Quote */}
      <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text)', flex: 1 }}>
        "{story.quote}"
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${story.moduleColor}33`,
          border: `1px solid ${story.moduleColor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, color: story.moduleColor,
          flexShrink: 0,
        }}>
          {story.initials}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{story.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{story.role}, {story.company}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            background: `${story.moduleColor}22`,
            border: `1px solid ${story.moduleColor}44`,
            borderRadius: 980, padding: '3px 10px',
            fontSize: 11, fontWeight: 600, color: story.moduleColor,
          }}>
            {story.module}
          </span>
        </div>
      </div>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(
          [
            { key: 'heart' as const, emoji: '❤️', myKey: 'myHeart' as const },
            { key: 'hands' as const, emoji: '🙌', myKey: 'myHands' as const },
            { key: 'fire' as const, emoji: '🔥', myKey: 'myFire' as const },
          ]
        ).map(r => (
          <button
            key={r.key}
            onClick={() => toggleReaction(r.key)}
            style={{
              background: reactions[r.myKey] ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${reactions[r.myKey] ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 980, padding: '4px 10px',
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.2s, border 0.2s',
            }}
          >
            <span>{r.emoji}</span>
            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{reactions[r.key]}</span>
          </button>
        ))}

        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: 12,
          }}
        >
          💬 {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Add comment'}
        </button>
      </div>

      {/* Comments thread */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{c.text}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{c.time}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
              placeholder="Add a comment…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 12px',
                color: 'var(--text)', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={submitComment}
              style={{
                background: 'var(--zietra)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create SuccessStories.tsx**

```tsx
import { useEffect, useRef } from 'react'
import { StoryCard } from './StoryCard'
import { STORIES } from '../data/stories'

export function SuccessStories() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="stories" ref={ref} className="reveal" style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            Success stories
          </div>
          <h2 className="section-headline">Real SMBs. Real results.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {STORIES.map(story => <StoryCard key={story.id} story={story} />)}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verify — run dev server, check 3 cards with reactions**

Toggle reactions — count increments. Click "Add comment" → input appears → type → Enter or Post → comment shows. Refresh page → reactions and comments persist from localStorage.

- [ ] **Step 4: Commit**

```bash
git add apps/zietra/src/components/StoryCard.tsx apps/zietra/src/components/SuccessStories.tsx
git commit -m "feat(zietra): add testimonial cards with localStorage reactions and comments"
```

---

### Task 11: PricingSection

**Files:**
- Create: `apps/zietra/src/components/PricingSection.tsx`

- [ ] **Step 1: Create PricingSection.tsx**

```tsx
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { TIERS } from '../data/pricing'

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={ref} className="reveal" style={{
      padding: '100px 24px',
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            Pricing
          </div>
          <h2 className="section-headline">Simple pricing. Cancel anytime.</h2>
          <p className="subheadline" style={{ marginTop: 16 }}>
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className="glass-card"
              style={{
                padding: 32,
                border: tier.featured
                  ? '1px solid color-mix(in srgb, var(--zietra) 50%, transparent)'
                  : '1px solid var(--glass-border)',
                position: 'relative',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--zietra)', color: '#fff',
                  padding: '4px 14px', borderRadius: 980,
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {tier.badge}
                </div>
              )}

              {/* Tier name */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
                {tier.name}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                {tier.price === 'Custom' ? (
                  <span style={{ fontSize: 36, fontWeight: 700 }}>Custom</span>
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: 'var(--text-2)', alignSelf: 'flex-start', paddingTop: 6 }}>$</span>
                    <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>
                      {tier.price}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{tier.period}</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <Link to="/signup" style={{
                display: 'block', textAlign: 'center',
                background: tier.featured ? 'var(--zietra)' : 'rgba(255,255,255,0.08)',
                color: tier.featured ? '#fff' : 'var(--text)',
                border: tier.featured ? 'none' : '1px solid rgba(255,255,255,0.15)',
                padding: '14px 0', borderRadius: 12,
                fontSize: 15, fontWeight: 600, marginBottom: 28,
                transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {tier.cta}
              </Link>

              {/* Feature list */}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--meet)', flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify — 3 glass cards, Growth card has blue border + badge, hover lifts cards**

- [ ] **Step 3: Commit**

```bash
git add apps/zietra/src/components/PricingSection.tsx
git commit -m "feat(zietra): add pricing section with 3 glass tier cards"
```

---

### Task 12: SiteFooter

**Files:**
- Create: `apps/zietra/src/components/SiteFooter.tsx`

- [ ] **Step 1: Create SiteFooter.tsx**

```tsx
import { Link } from 'react-router'

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'CRM', href: '#features' },
      { label: 'Social', href: '#features' },
      { label: 'Meetings', href: '#features' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer style={{
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '64px 24px 32px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 48, marginBottom: 48,
        }}>
          {/* Brand col */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 30, height: 30, background: 'var(--zietra)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 17,
              }}>Z</div>
              <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Zietra</span>
            </Link>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 220 }}>
              One platform for every SMB tool. CRM, social, meetings, video, and AI strategy — built together.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
              A TechCloudPro product
            </p>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      style={{ fontSize: 14, color: 'var(--text-2)', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            © 2026 Zietra Technologies inc. All rights reserved.
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            The all-in-one SMB growth platform.
          </span>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify — 4-column grid footer, "A TechCloudPro product" attribution, copyright line**

- [ ] **Step 3: Commit**

```bash
git add apps/zietra/src/components/SiteFooter.tsx
git commit -m "feat(zietra): add Apple-style 4-column footer"
```

---

## Chunk 5: Pages + Router + Deploy

### Task 13: Pages

**Files:**
- Create: `apps/zietra/src/pages/HomePage.tsx`
- Create: `apps/zietra/src/pages/PricingPage.tsx`
- Create: `apps/zietra/src/pages/LoginPage.tsx`
- Create: `apps/zietra/src/pages/SignupPage.tsx`

- [ ] **Step 1: Create src/pages/HomePage.tsx**

This assembles all sections and defines the 3 card elements for ProductReveal.

```tsx
import { NavBar } from '../components/NavBar'
import { HeroSection } from '../components/HeroSection'
import { StatsStrip } from '../components/StatsStrip'
import { ProductReveal } from '../components/ProductReveal'
import { AutomationFlow } from '../components/AutomationFlow'
import { SuccessStories } from '../components/SuccessStories'
import { PricingSection } from '../components/PricingSection'
import { SiteFooter } from '../components/SiteFooter'

const CRMCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Pipeline — Q2</div>
    {[
      { stage: 'To Contact', deals: ['Sarah Chen — $12K', 'Global Tech — $8K'], color: 'var(--crm)' },
      { stage: 'Qualified', deals: ['Apex Labs — $21K'], color: 'var(--zietra)' },
      { stage: 'Closed ✓', deals: ['FreshBrew — $5K', 'NxtStep — $9K'], color: 'var(--meet)' },
    ].map(col => (
      <div key={col.stage} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: col.color, marginBottom: 6 }}>{col.stage}</div>
        {col.deals.map(d => (
          <div key={d} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 10px',
            fontSize: 12, color: 'var(--text)', marginBottom: 4, border: '1px solid rgba(255,255,255,0.06)',
          }}>{d}</div>
        ))}
      </div>
    ))}
  </div>
)

const SocialCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Scheduled today</div>
    {[
      { platform: 'LinkedIn', time: '9:00 AM', preview: 'Q2 growth story — 3 slides', color: '#0A66C2' },
      { platform: 'Instagram', time: '12:30 PM', preview: 'Behind the scenes 🔥', color: 'var(--social)' },
      { platform: 'Twitter / X', time: '3:00 PM', preview: 'Product tip of the week', color: '#1DA1F2' },
      { platform: 'Facebook', time: '6:00 PM', preview: 'Customer spotlight — GlamCo', color: '#1877F2' },
    ].map(p => (
      <div key={p.platform} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.platform}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.preview}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.time}</div>
      </div>
    ))}
  </div>
)

const MeetCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>AI Meeting Summary</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
      GlamCo — Discovery Call
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Key decisions:</div>
    {['Expand to EU market by Q3', 'Budget approved — $24K ARR', 'Onboarding starts next Monday'].map(p => (
      <div key={p} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text)' }}>
        <span style={{ color: 'var(--meet)', flexShrink: 0 }}>◆</span>
        {p}
      </div>
    ))}
    <div style={{
      marginTop: 16, padding: '10px 12px',
      background: 'rgba(48,209,88,0.08)', borderRadius: 8,
      border: '1px solid rgba(48,209,88,0.2)', fontSize: 12, color: 'var(--meet)',
    }}>
      Follow-up email drafted by AI — ready to send ›
    </div>
  </div>
)

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <StatsStrip />
        <div id="features">
          <ProductReveal
            chip="CRM"
            chipColor="var(--crm)"
            headline="Close more deals. With zero busywork."
            sub="Your full sales pipeline, contact database, and email sequences in one place. AI surfaces your hottest leads so you know exactly who to call next."
            features={[
              'Unlimited contacts and deals',
              'AI lead scoring — ranked by close probability',
              'Email sequences with open-rate tracking',
              'Pipeline board + forecasting',
            ]}
            card={CRMCard}
          />
          <ProductReveal
            flip
            chip="Social"
            chipColor="var(--social)"
            headline="Publish everywhere. In 20 minutes a week."
            sub="AI drafts your posts from a single brief. Schedule across LinkedIn, Instagram, Twitter, and Facebook. See exactly which posts drove pipeline."
            features={[
              'AI post drafts from a single topic',
              'Schedule across 4+ platforms at once',
              'Analytics tied to contact activity',
              'Content calendar with team approval flow',
            ]}
            card={SocialCard}
          />
          <ProductReveal
            chip="Meetings"
            chipColor="var(--meet)"
            headline="AI takes notes. You close the deal."
            sub="One-click video meetings, automatic transcription, and AI summaries delivered before the prospect closes their laptop. Follow-ups write themselves."
            features={[
              'Unlimited HD video meetings',
              'AI transcription + summary in seconds',
              'Auto-drafted follow-up emails',
              'Booking links synced to your calendar',
            ]}
            card={MeetCard}
          />
        </div>
        <AutomationFlow />
        <SuccessStories />
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 2: Create src/pages/PricingPage.tsx**

```tsx
import { NavBar } from '../components/NavBar'
import { PricingSection } from '../components/PricingSection'
import { SiteFooter } from '../components/SiteFooter'

export default function PricingPage() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: 52 }}>
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  )
}
```

- [ ] **Step 3: Create src/pages/LoginPage.tsx**

```tsx
import { Link } from 'react-router'
import { NavBar } from '../components/NavBar'

export default function LoginPage() {
  return (
    <>
      <NavBar />
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px',
      }}>
        <div className="glass-card" style={{ padding: 48, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--zietra)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20,
            }}>Z</div>
            <span style={{ fontWeight: 600, fontSize: 20 }}>Zietra</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 32 }}>Sign in to your Zietra account</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              placeholder="Email address"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <button style={{
              background: 'var(--zietra)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Sign in
            </button>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--zietra)', fontWeight: 500 }}>Sign up free</Link>
          </p>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 4: Create src/pages/SignupPage.tsx**

```tsx
import { Link } from 'react-router'
import { NavBar } from '../components/NavBar'

export default function SignupPage() {
  return (
    <>
      <NavBar />
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px',
      }}>
        <div className="glass-card" style={{ padding: 48, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--zietra)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20,
            }}>Z</div>
            <span style={{ fontWeight: 600, fontSize: 20 }}>Zietra</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Get started free</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 32 }}>
            Full CRM, no credit card required.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              placeholder="Full name"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="email"
              placeholder="Work email"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Password (min. 8 characters)"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <button style={{
              background: 'var(--zietra)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Create free account
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
            By signing up you agree to our{' '}
            <Link to="#" style={{ color: 'var(--text-2)' }}>Terms</Link> and{' '}
            <Link to="#" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>.
          </p>

          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 16 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--zietra)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 5: Commit pages**

```bash
git add apps/zietra/src/pages/
git commit -m "feat(zietra): add HomePage, PricingPage, LoginPage, SignupPage"
```

---

### Task 14: App.tsx + wire everything

**Files:**
- Modify: `apps/zietra/src/App.tsx` (replace the stub)

- [ ] **Step 1: Replace stub App.tsx with router**

```tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'

const HomePage = lazy(() => import('./pages/HomePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))

function LoadingSpinner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 24, height: 24, border: '2px solid var(--zietra)',
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  )
}
```

- [ ] **Step 2: Full E2E dev-server verification**

```bash
cd apps/zietra && npm run dev
```

Open `http://localhost:5173` and verify ALL of:

| Check | Expected |
|-------|----------|
| Homepage loads | Black bg, hero with floating dashboard |
| Chip | "Public beta — CRM free to start" in blue |
| H1 gradient | "Every SMB tool." has blue→purple gradient |
| Nav at top | Transparent |
| Scroll 30px | Nav blurs glass |
| Scroll to stats | 4 numbers strip |
| Scroll to CRM reveal | Fades in from translateY(32px) |
| Social reveal | Flipped layout (text right) |
| Meet reveal | Text left |
| Automation flow | 5 steps, gradient line, icon scale on hover |
| Stories | 3 cards, reactions toggle, comments persist |
| Pricing | 3 cards, Growth has blue border + "Most Popular" badge |
| Footer | 4-column grid, copyright |
| Nav → Pricing | Routes to /pricing page |
| Nav → Sign in | Routes to /login |
| Start free | Routes to /signup |
| /login | Glass card form, "Sign up free" link |
| /signup | Glass card form, "Sign in" link |

- [ ] **Step 3: Commit wired App**

```bash
cd /Users/jeet/doordash-p2p
git add apps/zietra/src/App.tsx
git commit -m "feat(zietra): wire React Router with lazy-loaded pages"
```

---

### Task 15: TypeScript check + build verify

- [ ] **Step 1: Run TypeScript compiler**

```bash
cd apps/zietra
npx tsc -b --noEmit
```

Expected: zero errors. If TypeScript errors appear, fix them before proceeding. Common fixes:
- `onMouseEnter` inline event handlers: ensure `e.currentTarget` is typed. Inline style setter `e.currentTarget.style.xxx` is fine on `HTMLDivElement` events.
- Missing `React` import is NOT needed with `react-jsx` transform.
- `noUnusedLocals` / `noUnusedParameters` are strict — remove any unused vars.

- [ ] **Step 2: Run production build**

```bash
cd apps/zietra
npm run build
```

Expected output similar to:
```
✓ 1234 modules transformed.
dist/index.html                   0.4 kB
dist/assets/index-[hash].css      8.2 kB │ gzip:  2.1 kB
dist/assets/index-[hash].js      18.3 kB │ gzip:  6.4 kB
dist/assets/HomePage-[hash].js   42.1 kB │ gzip: 13.2 kB
...
✓ built in 4.23s
```

No TypeScript or Vite errors. `dist/` directory created.

- [ ] **Step 3: Preview built output**

```bash
cd apps/zietra
npm run preview
```

Open `http://localhost:4173`. Verify homepage loads correctly from built files. Test `/pricing`, `/login`, `/signup` routes.

- [ ] **Step 4: Commit build confirmation (no dist/ — gitignored)**

```bash
cd /Users/jeet/doordash-p2p
# Confirm dist/ is not tracked
echo "dist/" >> apps/zietra/.gitignore
git add apps/zietra/.gitignore
git commit -m "chore(zietra): add .gitignore excluding dist/"
```

---

### Task 16: Deploy to zietra.com (AWS S3 + CloudFront)

> **Hosting decision:** Zietra is AWS-hosted, not Hostinger. All other Zietra services (Meet, entitlement, video server) already live on AWS us-east-1. The marketing site follows the same pattern: S3 static bucket + CloudFront distribution + ACM cert + Route53 hosted zone.

Pre-flight checklist:
- `zietra.com` registered (registrar: Route53 or GoDaddy — confirm nameservers point to AWS Route53 once hosted zone is created)
- AWS CLI logged in to account `134607809447` (same as dollor-production)
- Region: `us-east-1` for S3/CloudFront/Route53. ACM cert MUST be in `us-east-1` (CloudFront requirement)

- [ ] **Step 1: Create S3 bucket for static site**

```bash
aws s3api create-bucket \
  --bucket zietra-marketing \
  --region us-east-1

aws s3api put-public-access-block \
  --bucket zietra-marketing \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

Bucket stays private — CloudFront Origin Access Control (OAC) reads objects. No direct public S3 access.

- [ ] **Step 2: Create Route53 hosted zone for zietra.com**

```bash
aws route53 create-hosted-zone \
  --name zietra.com \
  --caller-reference "zietra-$(date +%s)" \
  --query 'HostedZone.Id'
```

Capture the zone ID (e.g. `/hostedzone/ZXXXXXXXXXX`). Grab nameservers:

```bash
aws route53 get-hosted-zone --id <ZONE_ID> \
  --query 'DelegationSet.NameServers'
```

**Manual step:** Update the registrar (GoDaddy/Route53 registrar) nameservers to point at those 4 NS records. Propagation: 5 min – 48 h.

- [ ] **Step 3: Request ACM cert (us-east-1 mandatory for CloudFront)**

```bash
aws acm request-certificate \
  --domain-name zietra.com \
  --subject-alternative-names www.zietra.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn'
```

Capture the ARN. Then fetch the DNS validation CNAME records:

```bash
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

Add those CNAME records into the Route53 hosted zone. ACM auto-issues within 5–30 min once DNS is validated.

- [ ] **Step 4: Build site locally**

```bash
cd apps/zietra
npm run build
ls dist/
```

No `.htaccess` needed on S3 — CloudFront handles SPA fallback via Function/custom error response (step 6).

- [ ] **Step 5: Upload to S3**

```bash
cd apps/zietra
aws s3 sync dist/ s3://zietra-marketing/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

aws s3 cp dist/index.html s3://zietra-marketing/index.html \
  --cache-control "public, max-age=0, must-revalidate"
```

Hashed asset files get long cache; `index.html` stays uncached so deploys take effect immediately.

- [ ] **Step 6: Create CloudFront distribution with SPA routing**

```bash
cat > /tmp/zietra-cf-config.json <<EOF
{
  "CallerReference": "zietra-$(date +%s)",
  "Aliases": { "Quantity": 2, "Items": ["zietra.com", "www.zietra.com"] },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-zietra-marketing",
      "DomainName": "zietra-marketing.s3.us-east-1.amazonaws.com",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "OriginAccessControlId": "<OAC_ID>"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-zietra-marketing",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 },
      { "ErrorCode": 404, "ResponseCode": "200", "ResponsePagePath": "/index.html", "ErrorCachingMinTTL": 10 }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "<CERT_ARN>",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Enabled": true,
  "Comment": "Zietra marketing site",
  "PriceClass": "PriceClass_100"
}
EOF
```

First create the Origin Access Control:

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "zietra-marketing-oac",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
  }' \
  --query 'OriginAccessControl.Id'
```

Substitute `<OAC_ID>` and `<CERT_ARN>` into `/tmp/zietra-cf-config.json`, then:

```bash
aws cloudfront create-distribution --distribution-config file:///tmp/zietra-cf-config.json \
  --query '{id:Distribution.Id,domain:Distribution.DomainName}'
```

Capture the CloudFront distribution domain (e.g. `dXXXXX.cloudfront.net`).

- [ ] **Step 7: Attach S3 bucket policy allowing CloudFront OAC**

```bash
DIST_ARN="arn:aws:cloudfront::134607809447:distribution/<DIST_ID>"
cat > /tmp/zietra-s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::zietra-marketing/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "${DIST_ARN}" } }
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket zietra-marketing \
  --policy file:///tmp/zietra-s3-policy.json
```

- [ ] **Step 8: Point Route53 at CloudFront**

```bash
cat > /tmp/zietra-dns.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "zietra.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "<CLOUDFRONT_DOMAIN>",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.zietra.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "<CLOUDFRONT_DOMAIN>",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file:///tmp/zietra-dns.json
```

`Z2FDTNDATAQYW2` is the fixed CloudFront alias-target zone ID (AWS constant — do NOT change).

- [ ] **Step 9: Create deploy script**

Create `apps/zietra/deploy.sh`:
```bash
#!/bin/bash
set -e

DIST_ID="<CLOUDFRONT_DIST_ID>"   # from step 6

echo "Building Zietra..."
npm run build

echo "Syncing to S3..."
aws s3 sync dist/ s3://zietra-marketing/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

aws s3 cp dist/index.html s3://zietra-marketing/index.html \
  --cache-control "public, max-age=0, must-revalidate"

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/index.html" "/"

echo "Deployed! → https://zietra.com"
```

```bash
chmod +x apps/zietra/deploy.sh
```

- [ ] **Step 10: Verify live site**

Wait 5–10 min after first CloudFront distribution creation (status must be `Deployed`, not `InProgress`):

```bash
aws cloudfront get-distribution --id <DIST_ID> --query 'Distribution.Status'
```

Then:
```bash
curl -sI https://zietra.com | head -3        # expect HTTP/2 200
curl -sI https://zietra.com/pricing | head -3 # expect 200 (SPA fallback)
```

Manually verify in browser:
- Homepage renders (hero, scroll reveals, pricing, footer)
- Nav blur on scroll > 20px
- DashboardMockup3D floats, flattens on hover
- Reactions persist after refresh (localStorage)
- Direct URL to `/pricing`, `/login`, `/signup` works (no 404 — CloudFront custom error → index.html)
- HTTPS padlock active

- [ ] **Step 11: Commit deploy script**

```bash
cd /Users/jeet/doordash-p2p
git add apps/zietra/deploy.sh
git commit -m "feat(zietra): add S3+CloudFront deploy script"
```

---

## Success Criteria

Before declaring complete, verify ALL of the following:

```
## Verification
- [ ] `npm run build` exits 0 in apps/zietra/
- [ ] `tsc -b --noEmit` exits 0 (zero TypeScript errors)
- [ ] `curl https://zietra.com` returns 200
- [ ] Homepage: hero, stats, 3 product reveals, automation flow, stories, pricing, footer all render
- [ ] Nav: transparent at top, blurs glass on scroll > 20px
- [ ] Scroll reveals: CRM, Social, Meet sections fade in from below on scroll
- [ ] DashboardMockup3D: auto-floats, flattens on hover
- [ ] Reactions: toggle ❤️ 🙌 🔥, counts change, persist after page refresh
- [ ] Comments: Enter key and Post button both submit, comment appears in thread, persists after refresh
- [ ] Pricing: Growth card has blue border + "Most Popular" badge
- [ ] All CTA "Start free" / "Get started free" links go to /signup
- [ ] /login and /signup pages render (stub forms, no submission logic)
- [ ] /pricing direct URL works (no 404, SPA routing via .htaccess)
- [ ] HTTPS active on zietra.com
```

---

## DNS Note (if zietra.com still shows placeholder after deploy)

DNS changes take up to 48h to propagate. Verify A record in GoDaddy:
- `zietra.com` → A → `147.93.101.51` (Hostinger)

Check current propagation:
```bash
dig zietra.com A +short
```

Expected: `147.93.101.51`. If different, update in GoDaddy DNS Management.
