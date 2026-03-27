---
phase: quick-245
plan: 01
subsystem: mixmind-frontend
tags: [dj-tools, camelot, harmonic-mixing, ui]
dependency_graph:
  requires: [/api/library/compatible/{camelot}]
  provides: [compatible-track-highlighting, session-played-tracking, camelot-wheel-popup]
  affects: [App.tsx, TrackTable.tsx, MiniPlayer.tsx]
tech_stack:
  added: []
  patterns: [sidecarGet-for-compatible-keys, Set-based-session-tracking, SVG-polar-arc-wheel]
key_files:
  created:
    - apps/mixmind/frontend/src/components/CamelotWheel.tsx
  modified:
    - apps/mixmind/frontend/src/App.tsx
    - apps/mixmind/frontend/src/components/TrackTable.tsx
    - apps/mixmind/frontend/src/components/MiniPlayer.tsx
decisions:
  - Used Set<string> for playedIds (session-only, no persistence) for simplicity
  - CamelotWheel uses polar arc SVG paths with 0.5-degree gaps between slices
  - Compatible keys fetched via existing sidecar endpoint on nowPlaying change
metrics:
  duration: 192s
  completed: 2026-03-27
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 245: Compatible Track Highlighting + Session Played + Camelot Wheel

SVG Camelot wheel popup from MiniPlayer badge, green row highlights for harmonically compatible tracks, and session-based played track dimming in TrackTable.

## Commits

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | 0ccdb43d | feat(quick-245): add playedIds/compatibleKeys state, CamelotWheel component, MiniPlayer trigger | App.tsx, CamelotWheel.tsx, MiniPlayer.tsx, TrackTable.tsx |
| 2 | 74459ef2 | feat(quick-245): add compatible track highlighting, played dimming, and compat info bar to TrackTable | TrackTable.tsx |

## What Was Built

### 1. Compatible Track Highlighting (TrackTable)
- When a track is playing, rows with compatible Camelot keys show a green left border and subtle green background
- Green checkmark appears next to the Key badge on compatible rows
- A green info bar above column headers shows: "Showing N compatible tracks for XY"

### 2. Session Played Tracking (App.tsx -> TrackTable)
- `playedIds` Set in App state tracks every track played during the session
- Played rows are dimmed to 0.45 opacity with a "played" label in the actions column
- Now-playing row is excluded from dimming

### 3. CamelotWheel SVG Popup (CamelotWheel.tsx)
- 162-line component rendering a 12x2 SVG wheel (inner ring = A/minor, outer ring = B/major)
- Current key slice is bright (full color), compatible keys are semi-transparent, others are dim gray
- Center circle shows current Camelot key + "now playing" label
- Fixed overlay with dark backdrop; clicking outside closes the wheel
- Triggered by clicking the Camelot key badge in MiniPlayer

### 4. API Wiring (App.tsx)
- `useEffect` on `nowPlaying.content_id` fetches `/api/library/compatible/{camelot}` via `sidecarGet`
- Adds content_id to playedIds Set on each track change
- Passes `playedIds`, `compatibleKeys`, `nowPlayingId` down to TrackTable

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] TypeScript compiles with 0 errors (`npx tsc --noEmit`)
- [x] Vite production build succeeds (`npm run build`)
- [x] `sidecarGet` call to `/api/library/compatible/` confirmed in App.tsx:49
- [x] `playedIds` flows from App.tsx state to TrackTable prop (confirmed via grep)
- [x] `CamelotWheel` imported in App.tsx, rendered conditionally
- [x] `onOpenCamelotWheel` wired from App.tsx through MiniPlayer to camelot badge onClick
- [x] CamelotWheel.tsx is 162 lines (exceeds 80-line minimum)
