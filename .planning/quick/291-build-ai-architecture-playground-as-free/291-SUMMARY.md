---
phase: quick-291
plan: 01
subsystem: techcloudpro-website
tags: [lead-gen, ai-tools, free-tool, iframe, static-asset]
dependency_graph:
  requires: []
  provides: [/tools/ai-playground route, public/tools/ai-playground.html, public/tools/rag-study-guide.html]
  affects: [apps/techcloudpro nav, apps/techcloudpro routes]
tech_stack:
  added: [html2canvas CDN]
  patterns: [lazy route, iframe embed, inline style color tokens matching LaunchOS.tsx pattern]
key_files:
  created:
    - apps/techcloudpro/public/tools/ai-playground.html
    - apps/techcloudpro/public/tools/rag-study-guide.html
    - apps/techcloudpro/src/pages/AIPlayground.tsx
  modified:
    - apps/techcloudpro/src/App.tsx
    - apps/techcloudpro/src/data/navigation.ts
decisions:
  - "Used SEO path prop (not canonical) to match existing SEO component interface"
  - "Download PNG button injected into playground HTML itself — React page does not duplicate it"
  - "Study Guide href changed to absolute /tools/rag-study-guide.html so it works from any depth"
metrics:
  duration: ~8 minutes
  completed: 2026-04-16
  tasks_completed: 2
  files_changed: 5
---

# Quick Task 291: AI Architecture Playground — Free Lead-Gen Tool

**One-liner:** Interactive AI architecture playground served as static iframe at /tools/ai-playground with html2canvas PNG export, Study Guide download, and consulting CTA linking to /contact.

## What Was Built

### Task 1 — Static Assets (commit `0331d373`)

Copied `docs/ai-arch-playground.html` → `apps/techcloudpro/public/tools/ai-playground.html` and `docs/rag-study-guide.html` → `apps/techcloudpro/public/tools/rag-study-guide.html`.

Injected into ai-playground.html:
- html2canvas CDN (`1.4.1`) in `<head>` after Google Fonts link
- `📥 Download PNG` button in the `.hdr-btns` header div (after Clear button)
- JS handler: captures `.app` div via html2canvas at 2x scale, appends a 48px branded footer strip (`Built with TechCloudPro AI Tools · techcloudpro.com` in indigo), triggers PNG download as `ai-architecture-techcloudpro.png`
- Fixed Study Guide `href="rag-study-guide.html"` → `href="/tools/rag-study-guide.html"` (absolute path)

### Task 2 — React Page + Routing (commit `1f3810db`)

Created `apps/techcloudpro/src/pages/AIPlayground.tsx`:
- SEO component with title/description for /tools/ai-playground
- Hero strip: h1 + "Free Tool · No signup required" orange badge
- Full-width iframe at `height: calc(100vh - 200px)` / min-height 600px pointing to `/tools/ai-playground.html`
- Study Guide download anchor with `download="TechCloudPro-AI-Study-Guide.html"` attribute
- Consulting CTA card (dark `#0a0d16` background): "Need help building this?" heading + subtext + "Book a Free Call →" Link to /contact with orange (#FF6B35) fill

Updated `apps/techcloudpro/src/App.tsx`:
- Lazy import for AIPlayground
- Route `/tools/ai-playground` added before the `*` catch-all

Updated `apps/techcloudpro/src/data/navigation.ts`:
- `{ label: 'Tools', href: '/tools/ai-playground' }` added to mainNav between Blog and Careers
- `{ label: 'AI Playground', href: '/tools/ai-playground' }` added to footerSections Resources

## Build Verification

`npm run build` passed: TypeScript clean, Vite built `AIPlayground-Dt0ELkde.js` chunk, all existing routes pre-rendered without error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SEO component uses `path` prop, not `canonical`**
- **Found during:** Task 2 TypeScript build
- **Issue:** Plan specified `canonical="https://techcloudpro.com/tools/ai-playground"` but the SEO component interface (`SEOProps`) uses `path: string` and constructs canonical internally via `const url = path === '/' ? SITE+'/' : SITE+path+'/'`
- **Fix:** Changed to `path="/tools/ai-playground"` — the component builds the canonical URL automatically
- **Files modified:** apps/techcloudpro/src/pages/AIPlayground.tsx (also auto-fixed by linter)
- **Commit:** 1f3810db

## Self-Check: PASSED

- FOUND: apps/techcloudpro/public/tools/ai-playground.html
- FOUND: apps/techcloudpro/public/tools/rag-study-guide.html
- FOUND: apps/techcloudpro/src/pages/AIPlayground.tsx
- FOUND commit: 0331d373 (Task 1)
- FOUND commit: 1f3810db (Task 2)
