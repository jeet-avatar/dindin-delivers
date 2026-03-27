---
phase: quick-239
plan: "01"
subsystem: mixmind-frontend-sidecar
tags: [mixmind, ui, ai, playlist, file_path]
dependency_graph:
  requires: []
  provides: [greyed-out-unavailable-tracks, ai-playlist-filter]
  affects: [apps/mixmind/frontend/src/App.tsx, apps/mixmind/sidecar/ai.py]
tech_stack:
  added: []
  patterns: [conditional-opacity-badge, list-comprehension-filter]
key_files:
  created: []
  modified:
    - apps/mixmind/frontend/src/App.tsx
    - apps/mixmind/sidecar/ai.py
    - apps/mixmind/sidecar/tests/test_ai.py
decisions:
  - "Filter applied in serialise_library_for_claude (single correct gate) rather than in chat endpoint"
  - "Test fixture updated with explicit file_path= kwargs — plan claim that existing tests had non-empty paths was incorrect"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-27T05:50:18Z"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 239: Grey Out Unplayable Playlist Tracks — Summary

**One-liner:** Greyed-out opacity 0.35 + UNAVAILABLE badge for file_path-null playlist rows; AI serialiser pre-filters playable tracks before Claude context.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Grey out unplayable tracks in playlist panel (App.tsx) | 7297417e | `apps/mixmind/frontend/src/App.tsx` |
| 2 | Filter unplayable tracks from AI context in ai.py | 71bf88e2 | `apps/mixmind/sidecar/ai.py`, `tests/test_ai.py` |

## What Was Built

**Task 1 — UI greying (App.tsx:146-169):**
- Added `opacity: t.file_path ? 1 : 0.35` to the playlist track row style object
- Added conditional UNAVAILABLE badge (grey pill, 9px, 0.03em letter-spacing) rendered after the camelot badge when `!t.file_path`
- Existing `onMouseEnter` guard already prevented hover highlight for no-file tracks — no change needed there

**Task 2 — AI filter (ai.py:39):**
- Added `playable = [t for t in tracks if t.file_path]` before the sort in `serialise_library_for_claude`
- `sorted_tracks` now operates on playable-only list — the AI can never suggest a file_path-null track
- This is the single correct gate: `build_system_prompt` → `serialise_library_for_claude` → CSV to Claude

## Verification

```
grep -n "UNAVAILABLE\|opacity" apps/mixmind/frontend/src/App.tsx
  152: opacity: t.file_path ? 1 : 0.35,
  166: UNAVAILABLE

grep -n "playable.*file_path" apps/mixmind/sidecar/ai.py
  39: playable = [t for t in tracks if t.file_path]

cd apps/mixmind/sidecar && python -m pytest tests/test_ai.py -v
  8 passed in 0.03s
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture tracks lacked file_path values**
- **Found during:** Task 2 test run (5/8 failures)
- **Issue:** Plan stated "SAMPLE_TRACKS in the test fixture already have non-empty file_path values" but the Track dataclass `file_path` defaults to `""` (falsy). All test fixture tracks were filtered out, making the serialiser return only the header row.
- **Fix:** Added `file_path="/music/xxx.mp3"` keyword arg to all 3 SAMPLE_TRACKS and to the 2 large-set test generators (cap test, rating-desc test).
- **Files modified:** `apps/mixmind/sidecar/tests/test_ai.py`
- **Commit:** 71bf88e2

## Self-Check: PASSED

- FOUND: apps/mixmind/frontend/src/App.tsx
- FOUND: apps/mixmind/sidecar/ai.py
- FOUND: apps/mixmind/sidecar/tests/test_ai.py
- FOUND: commit 7297417e (Task 1)
- FOUND: commit 71bf88e2 (Task 2)
