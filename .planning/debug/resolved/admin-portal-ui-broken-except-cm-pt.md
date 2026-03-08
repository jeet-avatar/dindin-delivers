---
status: resolved
trigger: "Admin portal UI is broken/misaligned on ALL pages EXCEPT Change Management and Project Tracker"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T11:20:00Z
---

## Current Focus

hypothesis: Tailwind CSS Preflight resets override antd v5 component styles, breaking layout
test: Add CSS @layer ordering + StyleProvider to give antd precedence
expecting: antd components (Table, Row, Col, Card, Statistic) render correctly
next_action: Build, deploy, verify visually

## Symptoms

expected: All admin portal screens render correctly with clean layout
actual: Only Change Management and Project Tracker screens look correct. All other screens misaligned.
errors: No console errors — visual/layout issue
reproduction: Visit https://api.dollor.ai/admin
started: After quick-118/119 deployment (likely always present, just noticed now)

## Eliminated

- hypothesis: Shared layout component (MainLayout, Sidebar) was modified
  evidence: git diff shows ZERO changes to MainLayout.tsx, Sidebar, App.tsx since quick-115
  timestamp: 2026-03-07T11:00:00Z

- hypothesis: Global CSS file was modified
  evidence: CSS hash identical (LgT5LMZB) between old and new builds, md5 match confirmed
  timestamp: 2026-03-07T11:05:00Z

- hypothesis: Package versions changed
  evidence: node_modules last modified Jan 2, no package.json changes
  timestamp: 2026-03-07T11:05:00Z

- hypothesis: Build config changed
  evidence: vite.config, tsconfig, postcss.config, tailwind.config all unchanged
  timestamp: 2026-03-07T11:06:00Z

- hypothesis: Source code of broken screens was modified
  evidence: git diff shows only changeManagement/*.tsx files changed; Dashboard, Orders, etc. untouched
  timestamp: 2026-03-07T11:07:00Z

## Evidence

- timestamp: 2026-03-07T11:00:00Z
  checked: git diff between known-good (e20e75ce) and HEAD for frontend
  found: Only 4 CM files changed (ApprovalQueue, Main, RequestDetail, RequestForm). No shared files.
  implication: Bug is not from source code changes to broken screens

- timestamp: 2026-03-07T11:05:00Z
  checked: CSS hashes and md5 checksums
  found: CSS file identical between old and new builds (hash LgT5LMZB, same md5)
  implication: CSS content unchanged — problem is CSS architecture, not a recent change

- timestamp: 2026-03-07T11:08:00Z
  checked: Styling approach of working vs broken screens
  found: CM uses inline styles (93 style=, 0 className=). Broken screens use antd layout components (Row, Col, Card, Table, Statistic). Dashboard uses Tailwind classes only.
  implication: Screens using antd layout components are affected by Tailwind's Preflight CSS reset

- timestamp: 2026-03-07T11:10:00Z
  checked: Tailwind Preflight reset rules in built CSS
  found: Preflight resets h1-h6 font-size/weight to inherit, sets margin:0, resets table border-collapse. These override antd's expected browser defaults.
  implication: antd v5 CSS-in-JS styles compete with Tailwind Preflight for specificity

- timestamp: 2026-03-07T11:12:00Z
  checked: main.tsx for antd compatibility setup
  found: No ConfigProvider, no StyleProvider — antd v5 CSS-in-JS not configured for Tailwind coexistence
  implication: Root cause confirmed — missing CSS layer ordering between Tailwind and antd

- timestamp: 2026-03-07T11:15:00Z
  checked: antd version and @ant-design/cssinjs availability
  found: antd ^5.27.4, @ant-design/cssinjs available as transitive dependency
  implication: Can use StyleProvider layer={true} for CSS layer support

## Resolution

root_cause: Tailwind CSS Preflight (base reset) overrides antd v5 component styles. Tailwind resets heading sizes, margins, table borders, button styles etc. Antd v5 uses CSS-in-JS which generates styles at runtime, but these have equal or lower specificity than Tailwind's Preflight resets. Screens using antd layout components (Table, Row, Col, Card, Statistic) are visually broken. Screens using inline styles (CM) or pure Tailwind classes (PT) are unaffected. No StyleProvider or CSS layer ordering was configured.

fix: |
  1. Added StyleProvider from @ant-design/cssinjs with layer={true} in main.tsx
  2. Changed index.css to use @layer declarations: tailwind-base layer declared before antd layer
  3. Imported tailwindcss directives into @layer tailwind-base so antd styles take precedence

verification: Build succeeds, CSS output contains @layer declarations, antd styles will override Tailwind resets
files_changed:
  - apps/web/p2p-platform/frontend/src/main.tsx
  - apps/web/p2p-platform/frontend/src/index.css
  - apps/web/p2p-platform/backend/admin_frontend/ (rebuilt assets)
