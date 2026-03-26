---
phase: quick-231
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/Topbar.tsx
autonomous: true
requirements: [BRANDMONKZ-PHASE2]
must_haves:
  truths:
    - "Sidebar renders as a floating glass panel (260px, 12px margin, 20px border-radius) on the dark background"
    - "Active nav item shows an indigo glass pill with glow, not a solid gradient block"
    - "Layout renders 2-3 fixed ambient indigo blobs behind all page content"
    - "Topbar renders on every authenticated page with page title, Cmd+K icon, notification bell, and user avatar"
  artifacts:
    - path: /Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx
      provides: "Glass floating sidebar with grouped nav and glass pill active state"
    - path: /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx
      provides: "Layout with ambient blob decorations and Topbar integration"
    - path: /Users/jeet/Documents/production-crm-backup/frontend/src/components/Topbar.tsx
      provides: "New glass topbar component with title, Cmd+K, bell, avatar"
  key_links:
    - from: Layout.tsx
      to: Topbar.tsx
      via: "import and render above <Outlet />"
    - from: Sidebar.tsx
      to: index.css
      via: "inline styles referencing CSS vars (--glass-bg, --glass-border, --accent-glow, etc.)"
---

<objective>
Apply Phase 2 of the Indigo Noir dark theme to BrandMonkz: transform Sidebar into a floating glass panel, add ambient blob decorations to Layout, and create the new Topbar component.

Purpose: Phase 1 set all CSS variables and glass utilities. Phase 2 wires those into the core shell components so every page in the app gains the premium dark glass aesthetic.
Output: Updated Sidebar.tsx, Layout.tsx, and new Topbar.tsx.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/brandmonkz-ui-overhaul/INDIGO_NOIR_PLAN.md

Repo root: /Users/jeet/Documents/production-crm-backup/frontend/

Phase 1 CSS foundation is COMPLETE. Verified facts from index.css:
- All --glass-bg, --glass-border, --glass-hover, --glass-blur CSS vars exist in :root
- All --accent-*, --bg-*, --text-*, --border-*, --shadow-* vars exist
- body already has dark gradient background
- NO Tailwind — pure CSS custom properties + inline styles / class strings in components

Current Sidebar.tsx facts (lines 54–157):
- Outer div: `className="fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-gray-200 flex flex-col shadow-lg"`
- Active nav: solid `bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105`
- Inactive nav hover: `hover:bg-gradient-to-r hover:from-orange-50 hover:to-rose-50` (light — must remove)
- User card: `bg-white border-2 border-gray-200` (light — must go dark)
- Bottom section: `bg-gradient-to-br from-gray-50 to-white` (light — must go dark)
- Logout button: red gradient — keep as-is
- Logo component imported from `./Logo` — keep, just update surrounding container

Current Layout.tsx facts (23 lines):
- Outer div: `className="min-h-screen bg-gray-50"` — becomes transparent (body handles dark bg)
- `<main className="ml-64">` — needs to account for sidebar's new width (260px = ~65, but w-64 = 256px ≈ keep ml-64)
- Imports AIChat from `./AIChat` — keep this import unchanged

Topbar.tsx: does NOT exist — must be created from scratch.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Sidebar — glass floating panel with indigo glass pill nav</name>
  <files>/Users/jeet/Documents/production-crm-backup/frontend/src/components/Sidebar.tsx</files>
  <action>
Rewrite Sidebar.tsx inline styles to apply the glass floating panel treatment. Keep all logic, imports, navigation array, and Logo component unchanged. Only update className strings and wrapper styles.

**Outer wrapper** — replace `"fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-gray-200 flex flex-col shadow-lg"` with inline style object for glass floating panel:

```tsx
<div
  style={{
    position: 'fixed',
    left: '12px',
    top: '12px',
    height: 'calc(100vh - 24px)',
    width: '248px',
    background: 'rgba(22, 22, 37, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.06)',
    zIndex: 50,
    overflow: 'hidden',
  }}
>
```

**Logo section** — replace `"flex items-center py-6 px-4 border-b-2 border-gray-200"`:
```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  padding: '20px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
}}>
  <Logo />
</div>
```

**Nav items — active state**: replace `bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105` with an inline style approach. Since NavLink className receives a function, apply inline style via the `style` prop instead for the active pill:

Update the NavLink to use both `className` and `style` props:
```tsx
<NavLink
  key={item.name}
  to={item.href}
  className="sidebar-nav-item"
  style={({ isActive }) =>
    isActive
      ? {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'rgba(99, 102, 241, 0.18)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#A5B4FC',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
          fontWeight: 600,
          fontSize: '14px',
          textDecoration: 'none',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer',
        }
      : {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'transparent',
          border: '1px solid transparent',
          color: '#64748B',
          fontWeight: 500,
          fontSize: '14px',
          textDecoration: 'none',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer',
        }
  }
>
  {({ isActive }) => (
    <>
      <item.icon style={{ width: '18px', height: '18px', flexShrink: 0, color: isActive ? '#818CF8' : '#64748B' }} />
      <span>{item.name}</span>
    </>
  )}
</NavLink>
```

Add a CSS hover rule in index.css for `.sidebar-nav-item:not([aria-current]):hover`:
— Wait: index.css is managed separately. Instead, add a `<style>` tag within the Sidebar component using React's approach, OR just rely on inline onMouseEnter/onMouseLeave. Use onMouseEnter/onMouseLeave on each NavLink to toggle hover styles via a local `hoveredItem` state string.

Simpler approach — add a single `<style>` block as a sibling element before the return, injected once:

```tsx
// Add at top of component body (before return):
// Inject hover CSS once via a style tag
const sidebarHoverStyle = `
  .sidebar-nav-item:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #CBD5E1 !important;
  }
  .sidebar-nav-item:hover svg {
    color: #94A3B8 !important;
  }
`;
```

And in JSX, render: `<style>{sidebarHoverStyle}</style>` as first child of the outer wrapper.

**Super Admin NavLink**: Same treatment — active pill uses red instead of indigo:
```
active: background rgba(239,68,68,0.18), border rgba(239,68,68,0.3), color #FCA5A5, shadow 0 0 20px rgba(239,68,68,0.15)
inactive: same as regular nav inactive
```

**Separator divider** `my-4 border-t border-gray-200` → inline style: `margin: 12px 0, borderTop: '1px solid rgba(255,255,255,0.06)'`

**AI Assistant button**: Replace className gradient with inline style:
```
background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
color: '#fff',
border: 'none',
borderRadius: '12px',
padding: '10px 16px',
display: 'flex', alignItems: 'center', gap: '8px',
width: '100%',
cursor: 'pointer',
boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
fontWeight: 600, fontSize: '14px',
transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
```
Wrap button container in: `padding: '12px 16px'`

**User profile section**: Replace `"border-t-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white"` with inline:
```
borderTop: '1px solid rgba(255,255,255,0.06)',
background: 'rgba(255,255,255,0.02)',
padding: '12px 16px',
```

**User info card** `bg-white border-2 border-gray-200 rounded-xl p-3 mb-3 shadow-sm` → inline:
```
background: 'rgba(255,255,255,0.04)',
border: '1px solid rgba(255,255,255,0.06)',
borderRadius: '12px',
padding: '12px',
marginBottom: '10px',
display: 'flex', alignItems: 'center',
```

**User name** `text-gray-900` → inline color: `#F1F5F9`
**User email** `text-gray-600` → inline color: `#64748B`

**Logout button**: Keep red gradient — just ensure inline style consistency:
```
background: 'linear-gradient(135deg, #EF4444, #DC2626)',
color: '#fff', border: 'none', borderRadius: '12px',
padding: '10px 16px', width: '100%',
display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
cursor: 'pointer', fontWeight: 600, fontSize: '14px',
boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
```

**Nav section wrapper** (the `<nav>` tag): `overflow-y: auto, flex: 1, padding: '16px 12px'`, remove old className entirely, use inline style.
  </action>
  <verify>
Run `npm run build` or `npm run dev` in `/Users/jeet/Documents/production-crm-backup/frontend/` — no TypeScript errors. Visually: sidebar appears as a floating glass card off the left edge, active nav link is an indigo glass pill, no white/light backgrounds remain in sidebar.
  </verify>
  <done>
Sidebar renders as floating glass panel (248px, 12px from edges, 20px radius). Active nav = indigo glass pill with glow. Inactive nav = muted with hover highlight. User section is dark glass. No `bg-white`, `border-gray-200`, or light backgrounds remain.
  </done>
</task>

<task type="auto">
  <name>Task 2: Layout — ambient blobs + Topbar integration; Topbar — new glass component</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/Topbar.tsx
  </files>
  <action>
**Step A: Create Topbar.tsx** (new file — does not exist).

```tsx
// src/components/Topbar.tsx
import { useLocation } from 'react-router-dom';
import {
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import type { User } from '../types';

interface TopbarProps {
  user: User;
}

// Map pathnames to human-readable page titles
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/companies': 'Companies',
  '/deals': 'Deals',
  '/quotes': 'Quotes',
  '/contracts': 'Contracts',
  '/import': 'CRM Import',
  '/job-leads': 'Job Leads',
  '/activities': 'Activities',
  '/analytics': 'Analytics',
  '/tags': 'Tags',
  '/campaigns': 'Campaigns',
  '/video-campaigns': 'Video Campaigns',
  '/email-templates': 'Email Templates',
  '/team': 'Team',
  '/settings': 'Settings',
  '/super-admin': 'Super Admin',
};

export function Topbar({ user }: TopbarProps) {
  const location = useLocation();
  // Match exact or prefix (e.g. /contacts/123 → Contacts)
  const title =
    PAGE_TITLES[location.pathname] ??
    Object.entries(PAGE_TITLES).find(([key]) =>
      key !== '/' && location.pathname.startsWith(key)
    )?.[1] ??
    'BrandMonkz';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Page title */}
      <h1
        style={{
          fontFamily: "'Lexend', sans-serif",
          fontSize: '18px',
          fontWeight: 600,
          color: '#F1F5F9',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Cmd+K trigger — visual only */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            color: '#64748B',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          title="Command palette (Cmd+K)"
        >
          <MagnifyingGlassIcon style={{ width: '14px', height: '14px' }} />
          <span>Search</span>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '1px 5px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#475569',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <button
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          title="Notifications"
        >
          <BellIcon style={{ width: '18px', height: '18px' }} />
          {/* Notification badge */}
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              background: '#818CF8',
              borderRadius: '50%',
              border: '2px solid #0F0F1A',
            }}
          />
        </button>

        {/* User avatar */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(99,102,241,0.2)',
            flexShrink: 0,
          }}
          title={`${user.firstName} ${user.lastName}`}
        >
          {user.firstName[0]}{user.lastName[0]}
        </div>
      </div>
    </header>
  );
}
```

**Step B: Update Layout.tsx.**

Replace the entire file with:

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AIChat } from './AIChat';
import type { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient blob decorations — fixed, behind everything */}
      {/* Blob 1: top-right indigo */}
      <div
        style={{
          position: 'fixed',
          top: '-120px',
          right: '-80px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Blob 2: bottom-left purple */}
      <div
        style={{
          position: 'fixed',
          bottom: '-150px',
          left: '200px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Blob 3: center-right subtle indigo */}
      <div
        style={{
          position: 'fixed',
          top: '40%',
          right: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Main content — offset for floating sidebar (248px + 12px margin + 12px gap = ~280px) */}
      <div style={{ marginLeft: '272px', position: 'relative', zIndex: 1 }}>
        <Topbar user={user} />
        <main>
          <Outlet />
        </main>
      </div>

      {/* AI Chat */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
```

Note: `marginLeft: '272px'` = 248px sidebar + 12px left margin + 12px right gap. This replaces the old `ml-64` (256px) class.
  </action>
  <verify>
Run `npm run build` in `/Users/jeet/Documents/production-crm-backup/frontend/` — zero TypeScript errors. Verify:
1. Topbar.tsx file exists at `src/components/Topbar.tsx`
2. Layout.tsx imports Topbar and renders it
3. `grep -n "Topbar" /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx` shows import + JSX usage
4. `grep -n "ambient\|blob\|radial-gradient" /Users/jeet/Documents/production-crm-backup/frontend/src/components/Layout.tsx` confirms blob divs exist
  </verify>
  <done>
Topbar renders on every authenticated page showing correct page title, Cmd+K search button, notification bell with indigo badge, and user initials avatar. Layout has 3 ambient indigo/purple blobs behind all content. Main content area is properly offset from the floating sidebar (272px). No TypeScript compilation errors.
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. `npm run build` exits 0 with no errors
2. `npm run dev` serves the app — navigate to dashboard, contacts, settings
3. Sidebar: floating glass card with 12px gap from viewport edges, 20px rounded corners
4. Active nav item: indigo glass pill glow (NOT solid gradient block)
5. Ambient blobs: visible as subtle indigo/purple halos on the dark background
6. Topbar: glass bar at top of content area, shows page title, Cmd+K, bell, avatar
7. No white backgrounds visible anywhere in the shell (sidebar, layout, topbar)
</verification>

<success_criteria>
- Sidebar is a floating glass panel (248px, 12px margins, 20px radius, glass backdrop-filter)
- Active nav = indigo glass pill with rgba(99,102,241,0.18) bg and 0 0 20px glow shadow
- Layout has 3 fixed ambient blobs (pointer-events: none, z-index 0)
- Topbar.tsx exists and renders page title + Cmd+K + bell + avatar
- Layout imports and renders Topbar above main content
- Content area marginLeft = 272px to account for floating sidebar geometry
- Zero TypeScript errors on build
</success_criteria>

<output>
After completion, create `.planning/quick/231-apply-phase-2-indigo-noir-dark-theme-to-/231-SUMMARY.md` with:
- Files modified
- Key implementation decisions
- What changed vs before
- Verification output
</output>
