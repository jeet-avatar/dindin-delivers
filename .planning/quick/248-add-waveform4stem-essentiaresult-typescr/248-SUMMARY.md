---
phase: quick-248
plan: 01
subsystem: mixmind-frontend
tags: [stems, waveform, demucs, essentia, ui]
dependency_graph:
  requires: []
  provides: [Waveform4Stem-type, EssentiaResult-type, 4stem-canvas-rendering, analyze-button]
  affects: [track.ts, DJWaveformView.tsx, TrackTable.tsx, App.tsx]
tech_stack:
  added: []
  patterns: [4-stem-stacked-waveform, stem-color-palette]
key_files:
  created: []
  modified:
    - apps/mixmind/frontend/src/types/track.ts
    - apps/mixmind/frontend/src/components/DJWaveformView.tsx
    - apps/mixmind/frontend/src/components/TrackTable.tsx
    - apps/mixmind/frontend/src/App.tsx
decisions:
  - "4-stem priority: w4 > wb (3-band) > wp (mono) in both overview and zoomed canvases"
  - "Stem weights: drums 30%, bass 25%, vocals 25%, other 20% — stacked bottom-to-top"
  - "Analyze button uses text label (not emoji) for consistency with + Set button style"
metrics:
  duration: 186s
  completed: 2026-03-27T22:27:08Z
  tasks_completed: 3
  tasks_total: 3
---

# Quick Task 248: Add Waveform4Stem + EssentiaResult TypeScript Types and 4-Stem UI

Waveform4Stem/EssentiaResult types, 4-stem stacked canvas rendering in DJWaveformView with stem legend, Analyze button in TrackTable wired to sidecarPost /api/tracks/:id/analyze.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add Waveform4Stem + EssentiaResult types | `e75428e0` | New interfaces in track.ts, TrackAnlzData extended with 3 optional fields |
| 2 | 4-stem rendering in DJWaveformView | `44ea53eb` | Stem color constants, w4 priority path in overview + zoomed canvases, legend overlay |
| 3 | Analyze button + App.tsx handler | `8d86b7a4` | onAnalyze prop in TrackTable, handleAnalyze in App.tsx via sidecarPost |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] TypeScript compiles: `npx tsc --noEmit` passes with 0 errors
- [x] Vite build: `npm run build` succeeds (243.81 kB gzipped 70.80 kB)
- [x] Waveform4Stem + EssentiaResult exported from track.ts (lines 96, 103)
- [x] STEM_DRUMS + waveform_4stem in DJWaveformView.tsx (lines 29, 85, 249, 575)
- [x] onAnalyze in TrackTable.tsx (lines 17, 195, 726)
- [x] handleAnalyze + sidecarPost in App.tsx (lines 10, 61, 151)

## Self-Check: PASSED
