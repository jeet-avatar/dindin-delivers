---
phase: quick-243
plan: 01
subsystem: mixmind-frontend
tags: [mixmind, ai-sidebar, transition-scoring, energy-arc, dj-tools]
dependency_graph:
  requires: [Q-242]
  provides: [transition-quality-ui, energy-arc-visualizer]
  affects: [AIChatSidebar, App]
tech_stack:
  added: []
  patterns: [pure-scoring-functions, camelot-wheel-distance, bpm-percentage-diff]
key_files:
  created: []
  modified:
    - apps/mixmind/frontend/src/components/AIChatSidebar.tsx
    - apps/mixmind/frontend/src/App.tsx
decisions:
  - "Used percentage of average BPM for jump calculation (symmetric)"
  - "Camelot relative major/minor treated as perfect (distance 0.5 rounds to 2)"
  - "Energy arc uses 3-tier coloring: purple(<33%), yellow(33-66%), red(>66%)"
metrics:
  duration: 113s
  completed: 2026-03-27T20:03:28Z
  tasks_completed: 1
  tasks_total: 1
---

# Quick Task 243: Add Transition Quality Scores and Energy Arc Summary

Camelot wheel transition scoring + BPM % jump badges + energy arc bar chart in MixMind AI sidebar playlist view.

## What Was Done

### Task 1: Add transition scoring, resolve tracks, render playlist with badges and energy arc

Added pure scoring functions and enriched playlist rendering to AIChatSidebar.tsx:

1. **`camelotScore(a, b)`** - Parses Camelot strings (e.g. "8A"), computes circular 12-position wheel distance. Same key / relative major-minor / +/-1 step = 2 (perfect). +/-2 steps = 1 (ok). Else 0 (clash). Unknown keys default to 1.

2. **`scoreTransition()`** - Combines key score + BPM % difference into overall rating: perfect (key=2 AND bpm<3%), clash (key=0 OR bpm>=6%), ok otherwise.

3. **Resolved tracks** - AI playlist items matched case-insensitively to full Track objects from library for metadata access (camelot, bpm).

4. **Transition badges** - Color-coded badges between each track pair: green (#34d399) = perfect, yellow (#fbbf24) = ok, red (#f87171) = clash. Shows key change arrow (e.g. "8A->9A") and BPM jump %.

5. **Energy arc** - BPM bar chart below playlist. Bar height proportional to BPM within set's min-max range. Colors: purple (low energy <33%), yellow (mid 33-66%), red (high >66%). BPM numbers shown below each bar.

6. **App.tsx** - Passes `tracks` prop from `useLibrary()` to `AIChatSidebar`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `ad8a818d` | feat(quick-243): add transition quality scores and energy arc to AI sidebar |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] TypeScript build passes: `built in 671ms` with 0 errors
- [x] `camelotScore` function exists (line 16)
- [x] `scoreTransition` function exists (line 53)
- [x] `Energy arc` section renders (line 200)
- [x] `tracks={tracks}` prop passed in App.tsx (line 182)

## Self-Check: PASSED

- [x] `apps/mixmind/frontend/src/components/AIChatSidebar.tsx` - FOUND (modified)
- [x] `apps/mixmind/frontend/src/App.tsx` - FOUND (modified)
- [x] Commit `ad8a818d` - FOUND
