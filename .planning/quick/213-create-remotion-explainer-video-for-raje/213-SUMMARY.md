---
phase: quick-213
plan: "01"
subsystem: brandmonkz-video
tags: [remotion, video, brandmonkz, explainer, crm]
dependency_graph:
  requires: []
  provides: [brandmonkz-explainer-video]
  affects: []
tech_stack:
  added: [remotion@4.0.237, react@18.3.1, typescript@5.4.5]
  patterns: [remotion-series-composition, spring-animations, scene-wrapper-pattern]
key_files:
  created:
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/package.json
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/remotion.config.ts
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/tsconfig.json
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/index.ts
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/BrandMonkzVideo.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/components/SceneWrapper.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/WelcomeScene.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/LoginScene.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ContactsScene.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignsScene.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ChatbotScene.tsx
    - /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/OutroScene.tsx
  modified: []
decisions:
  - "Used Remotion Series composition to sequence 6 scenes each at 150 frames (5s), totaling 900 frames at 30fps (30s)"
  - "SceneWrapper centralizes brand colors, fade-in animation, wordmark, and bottom accent bar for consistency"
  - "spring() with damping=200 used for all UI element animations to match Remotion best practices"
  - "TypeScript strict mode enabled with skipLibCheck for Remotion compatibility"
  - "Resolution 1280x720 (720p) for lightweight MP4 output"
metrics:
  duration: 5 minutes
  completed: "2026-03-21"
  tasks_completed: 2
  files_created: 13
---

# Phase quick-213 Plan 01: BrandMonkz Remotion Explainer Video Summary

**One-liner:** Remotion 4.x explainer video with 6 animated scenes (900 frames at 30fps) using BrandMonkz orange/indigo brand colors and spring-animated UI mockups for each CRM feature step.

## What Was Built

A fully scaffolded Remotion video project at `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/` that produces a 30-second MP4 walkthrough of BrandMonkz CRM for Rajesh.

**Project structure:**
```
brandmonkz-video/
├── package.json          — Remotion 4.0.237 + npm scripts
├── remotion.config.ts    — jpeg image format + overwrite enabled
├── tsconfig.json         — strict mode, commonjs, jsx:react
└── src/
    ├── index.ts          — Remotion entry: registerRoot(Root)
    ├── Root.tsx          — Composition: 900 frames, 30fps, 1280x720
    ├── BrandMonkzVideo.tsx — Series joining all 6 scenes
    ├── components/
    │   └── SceneWrapper.tsx — Shared layout: icon + title + subtitle + bottom bar
    └── scenes/
        ├── WelcomeScene.tsx   — Animated tagline slide-up
        ├── LoginScene.tsx     — Mock login card with email/password/button
        ├── ContactsScene.tsx  — 3 contact pills appearing one-by-one
        ├── CampaignsScene.tsx — Email preview card with campaign stats
        ├── ChatbotScene.tsx   — Chat bubbles: user question + AI response
        └── OutroScene.tsx     — Feature pills + CTA support email
```

## Video Scene Breakdown

| Scene | Duration | Content |
|-------|----------|---------|
| 1. Welcome | 5s (frames 0-149) | Logo, tagline slide-up with spring animation |
| 2. Login | 5s (frames 150-299) | Mock login card (email/password/button) |
| 3. Import Contacts | 5s (frames 300-449) | 3 contact pills appearing staggered (f30, f60, f90) |
| 4. Email Campaigns | 5s (frames 450-599) | Campaign card with subject, body preview, open/click stats |
| 5. AI Chatbot | 5s (frames 600-749) | Chat UI with user message (f20) + AI response (f55) |
| 6. Outro | 5s (frames 750-899) | Feature pills staggered + support CTA |

## Brand Colors Used

- Orange `#FF6B35` — titles, bottom accent bar, wordmark "Monkz", CTA text, badge
- Indigo `#4F46E5` — background `#1E1B4B` (deep indigo), avatar circles, user chat bubbles
- White `#FFFFFF` — subtitle text, mock UI card backgrounds, wordmark "Brand"

## How Rajesh Can Preview and Render

**Preview in Remotion Studio (browser-based, instant):**
```bash
cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video
npm start
# Opens localhost:3000 — scrub through 900 frames, live preview all 6 scenes
```

**Render to MP4:**
```bash
cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video
npm run render
# Output: out/brandmonkz-explainer.mp4
# (~30 seconds, 900 frames at 30fps, 1280x720 h264)
```

**TypeScript compilation check (verified clean):**
```bash
cd /Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video
npx tsc --noEmit
# Exit 0 — no errors
```

## Verification Proof

- `node_modules/remotion` exists: CONFIRMED (210 packages installed)
- `npx tsc --noEmit`: PASSED (zero errors, zero warnings)
- All 6 scene files present: CONFIRMED
- SceneWrapper + BrandMonkzVideo + Root.tsx + index.ts: CONFIRMED

## Deviations from Plan

None — plan executed exactly as written. The render step (producing the actual MP4) was not attempted per constraints since it requires a display/GPU environment, but the project compiles cleanly and is fully ready to render.

## Self-Check: PASSED

All files created:
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/package.json`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/remotion.config.ts`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/tsconfig.json`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/index.ts`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/Root.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/BrandMonkzVideo.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/components/SceneWrapper.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/WelcomeScene.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/LoginScene.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ContactsScene.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/CampaignsScene.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/ChatbotScene.tsx`
- [x] `/Users/jeet/Documents/production-crm-backup/apps/brandmonkz-video/src/scenes/OutroScene.tsx`
