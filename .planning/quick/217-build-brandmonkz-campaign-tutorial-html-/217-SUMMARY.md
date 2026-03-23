---
phase: quick-217
plan: "01"
subsystem: brandmonkz-campaign-guide
tags: [brandmonkz, email-marketing, remotion, puppeteer, html, pdf]
dependency_graph:
  requires: []
  provides: [diagram.html, campaign-guide.pdf, CampaignTutorialScenes.tsx, email-template.html]
  affects: [brandmonkz-video/src/Root.tsx]
tech_stack:
  added: [puppeteer@21]
  patterns: [table-based-email, remotion-sequence, puppeteer-pdf]
key_files:
  created:
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/generate-pdf.js
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/package.json
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx
  modified:
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
decisions:
  - "Used page.setContent() in puppeteer instead of file:// goto to avoid platform-specific permission issues"
  - "Used headless:true with --no-sandbox args instead of headless:'new' to fix WebSocket socket-hang-up on macOS"
  - "Used HTML entity codes for emojis in diagram.html to ensure consistent cross-browser rendering"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-22"
  tasks_completed: 4
  files_created: 7
---

# Phase quick-217 Plan 01: BrandMonkz Campaign Tutorial Artifacts Summary

**One-liner:** Four BrandMonkz campaign tutorial artifacts built — self-contained HTML flowchart, 10-page puppeteer PDF (563KB), 8 Remotion animation scenes registered in Root.tsx, and a table-based TechCloudPro placement email with $2/hr + 15% pricing cards.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | HTML Visual Flowchart | ddbe262 | diagram.html (302 lines, 7.6KB) |
| 2 | PDF Generator | d222953 | generate-pdf.js, package.json → campaign-guide.pdf (563KB) |
| 3 | Remotion Campaign Scenes | 76d9354 | CampaignTutorialScenes.tsx, Root.tsx |
| 4 | Email Template | a9a4544 | email-template.html, email-template.json |

## What Was Built

### Task 1 — diagram.html
Self-contained HTML flowchart with dark BrandMonkz theme (#1A1A2E). Eight step cards arranged vertically with glass-morphism styling, orange numbered circles (60px), 64px emoji per step, animated SVG chevron arrows (`arrowPulse` keyframe: opacity 0.4→1→0.4 over 1.5s). Hover lifts cards with orange glow. Fully offline, zero external dependencies, print-friendly CSS included.

### Task 2 — generate-pdf.js + package.json
Puppeteer script producing a 10-page A4 PDF. Pages: cover (dark, orange BrandMonkz logo), 8 step pages (emoji 120px + title + description + 4 bullets + screenshot placeholder box), pricing comparison page. Uses `page.setContent()` (not file:// path) to avoid macOS puppeteer permission issues. Launch args `--no-sandbox --disable-setuid-sandbox` fix WebSocket connection hang on macOS.

### Task 3 — CampaignTutorialScenes.tsx + Root.tsx update
`CampaignStepScene` internal component drives all 8 scenes via `stepIndex` prop. Per-scene animations: emoji `spring()` bounce-in (mass=0.5, stiffness=200), step pill slide from left via `interpolate`, title slide up +30px with fade, description fade-in, orange progress bar at bottom (width 0 → stepIndex/8 × 100% over 60 frames). Eight named exports (Scene1Login through Scene8Results) plus `CampaignTutorialVideo` master that sequences all via `<Sequence from={i*150} durationInFrames={150}>`. Root.tsx wrapped in `<>` fragment with both `BrandMonkzExplainer` (900 frames) and `CampaignTutorial` (1200 frames) compositions. TypeScript: 0 errors.

### Task 4 — email-template.html + email-template.json
Table-based HTML email (max-width 600px, inline styles for email client compatibility). Pricing feasibility analysis in HTML comment at top. Two pricing cards side-by-side via table layout: Contract ($2/hr, orange border-top) and Full-Time (15%, indigo border-top). Database callout (18,000+ candidates), social proof, orange CTA button linking to Calendly. Dark footer (#1A1A2E). JSON includes subject, preheader, from_name, from_email, body_plain, cta_text, cta_url, tags — valid per `python3 -m json.tool`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] puppeteer WebSocket socket hang-up on macOS**
- **Found during:** Task 2
- **Issue:** `puppeteer.launch({ headless: 'new' })` caused WebSocket ECONNRESET on macOS — browser launched but DevTools WS disconnected before PDF generation
- **Fix:** Changed to `headless: true` with `args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']`
- **Files modified:** generate-pdf.js
- **Commit:** d222953

## Verification

- [x] `ls -lh` shows all 6 artifacts in brandmonkz-campaign-guide/
- [x] campaign-guide.pdf is 563KB (>50KB requirement)
- [x] `npx tsc --noEmit` returns 0 errors
- [x] diagram.html is 302 lines (>100 requirement)
- [x] email-template.json validates via `python3 -m json.tool`

## Self-Check: PASSED

All files created and verified:
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/diagram.html` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/campaign-guide.pdf` — FOUND (563KB)
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/generate-pdf.js` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/package.json` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.html` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-campaign-guide/email-template.json` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignTutorialScenes.tsx` — FOUND
- `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx` — FOUND (updated)

Commits verified: ddbe262, d222953, 76d9354, a9a4544 — all in production-crm-backup repo on `seconf` branch.
