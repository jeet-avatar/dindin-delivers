---
phase: quick-327
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/asc606/apps/web/app/globals.css
  - /Users/jeet/asc606/apps/web/components/screen-frame.tsx
  - /Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx
autonomous: true
requirements: [MOBILE-01]
must_haves:
  truths:
    - "On mobile (<640px) the sidebar is hidden off-screen by default"
    - "A hamburger button is visible in the top bar on mobile"
    - "Tapping the hamburger slides the sidebar in as a drawer"
    - "Tapping the overlay or navigating to another route closes the drawer"
    - "On desktop (>640px) nothing changes — layout identical to before"
    - "All existing links and Next.js routes work without modification"
  artifacts:
    - path: "/Users/jeet/asc606/apps/web/app/globals.css"
      provides: "Mobile breakpoint CSS — grid collapses, sidebar becomes fixed drawer"
      contains: "@media (max-width: 640px)"
    - path: "/Users/jeet/asc606/apps/web/components/screen-frame.tsx"
      provides: "Client component with mobileNavOpen state, overlay, data-mobile-nav attr"
      contains: "use client"
    - path: "/Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx"
      provides: "Hamburger button wired to onMenuToggle prop"
      contains: "onMenuToggle"
  key_links:
    - from: "top-bar.tsx hamburger button"
      to: "screen-frame.tsx setMobileNavOpen"
      via: "onMenuToggle prop callback"
      pattern: "onMenuToggle"
    - from: "screen-frame.tsx data-mobile-nav attribute"
      to: "globals.css [data-mobile-nav=open] > aside"
      via: "CSS attribute selector"
      pattern: "data-mobile-nav"
    - from: "screen-frame.tsx usePathname"
      to: "setMobileNavOpen(false)"
      via: "useEffect on pathname change"
      pattern: "usePathname"
---

<objective>
Make the ASC606 app shell fully mobile-responsive by adding a hamburger drawer nav pattern for screens narrower than 640px. The sidebar collapses off-screen via CSS, a hamburger icon appears in the top bar, and tapping it slides the sidebar in as a drawer with a backdrop overlay. Route changes auto-close the drawer.

Purpose: The app is currently unusable on mobile — the 240px sidebar and 340px copilot rail leave no room for content. This ships the minimum viable mobile layout without touching any routes, links, or business logic.
Output: Three files modified. No new dependencies. All existing features preserved.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/asc606/apps/web/app/globals.css
@/Users/jeet/asc606/apps/web/components/screen-frame.tsx
@/Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx
@/Users/jeet/asc606/apps/web/components/app-shell/sidebar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket</name>
  <files></files>
  <action>
    Create a Change Request on the Dollor.ai admin portal before touching any code.

    ```bash
    CR=$(curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "quick-327: ASC606 mobile responsive — hamburger drawer nav",
        "description": "Add @media(max-width:640px) block to globals.css collapsing sidebar into fixed off-screen drawer, convert screen-frame to use client with mobileNavOpen state + overlay, add hamburger button to top-bar wired via onMenuToggle prop.",
        "change_type": "code",
        "priority": "Medium",
        "requested_by": "support@dollor.ai"
      }')
    echo $CR
    CR_ID=$(echo $CR | python3 -c "import sys,json; print(json.load(sys.stdin)['cr_id'])")
    echo "CR_ID=$CR_ID"

    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/${CR_ID}/submit?secret_key=$ADMIN_SECRET_KEY"
    ```

    Record the CR_ID — include it in all commit messages as `[CR-XXXX]`.
  </action>
  <verify>curl returns JSON with a `cr_id` field, submit returns success</verify>
  <done>CR ticket exists and is in Submitted/Approved state</done>
</task>

<task type="auto">
  <name>Task 2: Add mobile CSS breakpoint to globals.css</name>
  <files>/Users/jeet/asc606/apps/web/app/globals.css</files>
  <action>
    Append a `@media (max-width: 640px)` block to the end of globals.css (after all existing rules). Also add a `.mobile-menu-btn` utility class that is shown only below 640px.

    The block must:
    1. On `.app-shell`: override `grid-template-columns` to `0 minmax(0, 1fr)` so the sidebar column collapses to 0 width. The copilot rail is already hidden via the existing 1300px rule — no change needed there.
    2. On `.app-shell > aside`: make the sidebar a fixed-position off-screen drawer:
       ```css
       position: fixed !important;
       top: 0;
       left: 0;
       height: 100%;
       width: 260px;
       z-index: 200;
       transform: translateX(-100%);
       transition: transform 0.25s ease;
       overflow-y: auto;
       /* The !important overrides the inline style gridColumn/gridRow */
       grid-column: unset !important;
       grid-row: unset !important;
       ```
    3. On `.app-shell[data-mobile-nav="open"] > aside`:
       ```css
       transform: translateX(0);
       ```
    4. `.mobile-menu-btn` — shown on mobile, hidden on desktop:
       ```css
       .mobile-menu-btn {
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 6px;
         border-radius: 6px;
         cursor: pointer;
         background: transparent;
         border: none;
         color: inherit;
       }
       ```
    5. Add rule to hide `.mobile-menu-btn` above 640px:
       ```css
       @media (min-width: 641px) {
         .mobile-menu-btn { display: none !important; }
       }
       ```

    These two `@media` blocks (the main ≤640px block and the ≥641px hide-btn block) should both be appended to the end of globals.css.
  </action>
  <verify>
    `grep -c "mobile-nav" /Users/jeet/asc606/apps/web/app/globals.css` returns at least 1.
    `grep -c "mobile-menu-btn" /Users/jeet/asc606/apps/web/app/globals.css` returns at least 1.
    `grep "max-width: 640px" /Users/jeet/asc606/apps/web/app/globals.css` shows the breakpoint exists.
  </verify>
  <done>
    globals.css has a 640px breakpoint that collapses the grid sidebar column to 0 and converts aside to a fixed off-screen drawer; the open state selector and .mobile-menu-btn utility class are present.
  </done>
</task>

<task type="auto">
  <name>Task 3: Convert screen-frame to client component with drawer state</name>
  <files>/Users/jeet/asc606/apps/web/components/screen-frame.tsx</files>
  <action>
    Read the current screen-frame.tsx in full first, then rewrite it as a `'use client'` component.

    Changes:
    1. Add `'use client';` directive at the top.
    2. Add imports:
       ```ts
       import { useState, useEffect } from 'react';
       import { usePathname } from 'next/navigation';
       ```
    3. Inside the component body, add state and auto-close on route change:
       ```ts
       const [mobileNavOpen, setMobileNavOpen] = useState(false);
       const pathname = usePathname();
       useEffect(() => {
         setMobileNavOpen(false);
       }, [pathname]);
       ```
    4. On the `.app-shell` wrapper div, add the data attribute:
       ```tsx
       data-mobile-nav={mobileNavOpen ? 'open' : 'closed'}
       ```
    5. When `mobileNavOpen` is true, render a backdrop overlay div immediately before the `<Sidebar>` (or as a sibling inside the shell div). It must be positioned fixed, cover the full viewport, sit at z-index 199 (just under the sidebar's 200), and close the drawer on click:
       ```tsx
       {mobileNavOpen && (
         <div
           className="fixed inset-0 bg-black/40 z-[199]"
           onClick={() => setMobileNavOpen(false)}
           aria-hidden="true"
         />
       )}
       ```
    6. Pass `onMenuToggle={() => setMobileNavOpen(v => !v)}` as a prop to `<TopBar>`.

    Safety note: screen-frame.tsx is currently a server component but uses no server-only APIs (no `fs`, no `headers()`, no `cookies()`). Converting to client is safe. The child components (Sidebar, StatusBar, CopilotRail) that are already server components will simply render as React children — Next.js allows server components as children of client components.
  </action>
  <verify>
    `grep "'use client'" /Users/jeet/asc606/apps/web/components/screen-frame.tsx` returns the directive.
    `grep "mobileNavOpen" /Users/jeet/asc606/apps/web/components/screen-frame.tsx` shows state and usage.
    `grep "data-mobile-nav" /Users/jeet/asc606/apps/web/components/screen-frame.tsx` shows the attribute.
    `grep "onMenuToggle" /Users/jeet/asc606/apps/web/components/screen-frame.tsx` shows the prop being passed.
    `cd /Users/jeet/asc606 && npx tsc --noEmit 2>&1 | head -20` — no new TypeScript errors introduced.
  </verify>
  <done>
    screen-frame.tsx is a client component with useState for mobileNavOpen, usePathname-based auto-close, data-mobile-nav attribute on the shell div, a conditional overlay div, and onMenuToggle prop passed to TopBar.
  </done>
</task>

<task type="auto">
  <name>Task 4: Add hamburger button to top-bar</name>
  <files>/Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx</files>
  <action>
    Read the current top-bar.tsx in full first.

    Changes:
    1. Add optional prop: `onMenuToggle?: () => void`
    2. Add import for the Menu icon from lucide-react:
       ```ts
       import { Menu } from 'lucide-react';
       ```
       (lucide-react is already a dependency — it's used in sidebar.tsx and copilot-rail.tsx)
    3. Render the hamburger button as the FIRST child inside the top-bar element, before any existing content:
       ```tsx
       {onMenuToggle && (
         <button
           className="mobile-menu-btn"
           onClick={onMenuToggle}
           aria-label="Open navigation menu"
         >
           <Menu size={20} />
         </button>
       )}
       ```
       The `mobile-menu-btn` class (defined in globals.css) hides the button above 641px, so desktop layout is unaffected.

    Do NOT change the existing `style={{ gridColumn: '2 / 4', gridRow: 1 }}` inline style or any other existing content in the top bar.
  </action>
  <verify>
    `grep "onMenuToggle" /Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx` shows both the prop type and usage.
    `grep "Menu" /Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx` shows the lucide import.
    `grep "mobile-menu-btn" /Users/jeet/asc606/apps/web/components/app-shell/top-bar.tsx` shows the className.
    `cd /Users/jeet/asc606 && npx tsc --noEmit 2>&1 | head -20` — zero TypeScript errors.
    `cd /Users/jeet/asc606 && npm run build 2>&1 | tail -20` — build succeeds with no errors.
  </verify>
  <done>
    top-bar.tsx accepts optional onMenuToggle prop and renders a hamburger Menu button (hidden via CSS above 641px) that invokes the callback. Build passes cleanly.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Three files modified: globals.css (mobile breakpoint + drawer CSS), screen-frame.tsx (client component with drawer state + overlay), top-bar.tsx (hamburger button). No routes, links, or other components touched.
  </what-built>
  <how-to-verify>
    1. Start the dev server: `cd /Users/jeet/asc606/apps/web && npm run dev`
    2. Open http://localhost:3000 in a browser
    3. Open DevTools → toggle device toolbar → select a mobile preset (e.g. iPhone 14, 390px wide)
    4. Confirm: sidebar is NOT visible, main content fills the full width
    5. Confirm: a hamburger icon (three lines) appears in the top bar
    6. Tap the hamburger: sidebar should slide in from the left with a dark overlay behind it
    7. Tap the overlay: sidebar should slide back out
    8. Navigate to a different page (click any sidebar link while drawer is open): drawer should auto-close
    9. Switch back to desktop width (>641px): hamburger is hidden, sidebar is visible in its fixed position, layout identical to before
    10. Confirm all existing links still work (no broken navigation)
  </how-to-verify>
  <resume-signal>Type "approved" if mobile layout works correctly, or describe any issues observed</resume-signal>
</task>

</tasks>

<verification>
- `grep "'use client'" /Users/jeet/asc606/apps/web/components/screen-frame.tsx` returns the directive
- `grep "data-mobile-nav" /Users/jeet/asc606/apps/web/app/globals.css` returns the CSS selector
- `grep "mobile-menu-btn" /Users/jeet/asc606/apps/web/app/globals.css` returns the utility class
- `cd /Users/jeet/asc606 && npm run build` exits 0 with no errors
- Human verification: hamburger appears on mobile, drawer slides in/out, overlay closes drawer, route change closes drawer, desktop unchanged
</verification>

<success_criteria>
- Mobile screens (<640px): sidebar hidden by default, hamburger button visible in top bar, drawer slides in on tap, overlay tap + route change both close drawer
- Desktop screens (>640px): layout pixel-identical to before — hamburger hidden, sidebar visible, all breakpoints preserved
- Build: `npm run build` exits 0, zero TypeScript errors
- Zero regressions: all existing routes, links, and features work without modification
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/327-make-asc606-fully-mobile-responsive-hamb/327-SUMMARY.md` following the summary template.
</output>
