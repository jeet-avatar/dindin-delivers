---
phase: quick-231
plan: 01
subsystem: brandmonkz-frontend
tags: [dark-theme, glass-ui, indigo-noir, sidebar, layout, topbar]
dependency_graph:
  requires: [quick-230-phase1-css-foundation]
  provides: [glass-sidebar, ambient-layout, glass-topbar]
  affects: [all-authenticated-pages]
tech_stack:
  added: []
  patterns: [glass-morphism, inline-styles-for-dark-theme, css-injection-via-style-tag]
key_files:
  created:
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Topbar.tsx
  modified:
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx
decisions:
  - "Used style prop function on NavLink (not className) for active/inactive glass pill — className string approach cannot set box-shadow/backdrop values"
  - "Injected hover CSS via <style> tag inside Sidebar component to avoid needing index.css edits for .sidebar-nav-item:hover overrides"
  - "marginLeft: 272px in Layout (248px sidebar + 12px left margin + 12px right gap) replaces old ml-64 (256px)"
metrics:
  duration: 114s
  completed: "2026-03-25"
  tasks_completed: 2
  files_changed: 3
---

# Phase quick-231 Plan 01: Indigo Noir Phase 2 — Shell Components Summary

**One-liner:** Glass floating sidebar (248px, 20px radius, blur backdrop) with indigo glass pill active nav, ambient blob Layout, and new sticky Topbar with page title / Cmd+K / bell / avatar.

## What Changed vs Before

### Sidebar.tsx
- **Before:** `fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-gray-200` — full-height white panel flush to viewport edge
- **After:** Floating glass card — `position: fixed, left: 12px, top: 12px, height: calc(100vh - 24px), width: 248px, borderRadius: 20px, background: rgba(22,22,37,0.85), backdropFilter: blur(20px)` — 12px off all edges with rounded corners
- **Active nav:** Before = `bg-gradient-to-r from-indigo-500 to-purple-600 text-white scale-105` (solid gradient). After = `rgba(99,102,241,0.18)` glass pill with `1px solid rgba(99,102,241,0.3)` border and `0 0 20px rgba(99,102,241,0.15)` glow shadow
- **Inactive nav hover:** Before = light orange-rose gradient hover. After = `.sidebar-nav-item:hover` CSS injection → `rgba(255,255,255,0.05)` glass hover
- **Super Admin active:** red glass pill `rgba(239,68,68,0.18)` + border `rgba(239,68,68,0.3)` + glow
- **User section:** Before = `bg-gradient-to-br from-gray-50 to-white` + `bg-white border-gray-200` card. After = dark glass `rgba(255,255,255,0.02)` background + `rgba(255,255,255,0.04)` card
- **All navigation logic, imports, and Logo component unchanged**

### Layout.tsx
- **Before:** 23 lines — `<div className="min-h-screen bg-gray-50">` with `<main className="ml-64">`
- **After:** 3 fixed ambient blob divs (pointer-events: none, z-index 0) behind all content; transparent outer container; Topbar imported and rendered above `<Outlet />`; `marginLeft: 272px` for correct floating sidebar offset

### Topbar.tsx (new file)
- Sticky glass header (height 60px, `rgba(15,15,26,0.8)` + `blur(16px)`)
- Page title: reads `useLocation().pathname`, maps via `PAGE_TITLES` (17 routes), prefix-matches detail pages (e.g. `/contacts/123` → "Contacts")
- Cmd+K search button: glass pill with MagnifyingGlassIcon + `⌘K` kbd badge
- Notification bell: 36x36 glass icon button with 8px indigo dot badge
- User avatar: 36x36 rounded square with indigo-purple gradient, shows initials

## Verification Output

```
npm run build — exit 0, no TypeScript errors

2728 modules transformed
dist/assets/index-Ce4pBpTx.js  1,339.79 kB (gzip: 315.62 kB)
built in 2.13s

grep -n "Topbar" Layout.tsx:
4: import { Topbar } from './Topbar';
74:        <Topbar user={user} />

grep -n "radial-gradient" Layout.tsx:
28: background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
43: background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
58: background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | caab133 | feat(quick-231): Sidebar glass floating panel with indigo glass pill nav |
| Task 2 | 8352307 | feat(quick-231): Layout ambient blobs + Topbar glass component |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `/Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx` — exists, modified
- [x] `/Users/jeet/Documents/production-crm-backup/frontend/src/components/Topbar.tsx` — created
- [x] `/Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx` — exists, modified
- [x] Commit caab133 — verified in git log
- [x] Commit 8352307 — verified in git log
- [x] `npm run build` — exit 0, zero TypeScript errors
