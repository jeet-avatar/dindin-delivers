---
phase: quick-247
plan: 01
subsystem: api
tags: [fastapi, mixmind, demucs, essentia, analysis, msgpack]

requires:
  - phase: quick-246
    provides: analyzer.py + state.py analysis pipeline
provides:
  - Analysis API endpoints (single/batch/cancel/status)
  - Enhanced /anlz endpoint with analysis_cache fallback
affects: [mixmind-frontend, mixmind-waveform]

tech-stack:
  added: []
  patterns: [analysis_cache fallback in /anlz, lazy msgpack import]

key-files:
  created:
    - apps/mixmind/sidecar/analyze_routes.py
  modified:
    - apps/mixmind/sidecar/main.py
    - apps/mixmind/sidecar/library.py

key-decisions:
  - "Lazy msgpack import inside _enrich_with_analysis to avoid top-level dependency"
  - "Three-point fallback in /anlz: DB not found, no ANLZ row, ANLZ file missing"

patterns-established:
  - "analysis_cache fallback: check analysis_cache before raising 404 on ANLZ endpoints"

requirements-completed: [Q-247]

duration: 2min
completed: 2026-03-27
---

# Quick 247: Analysis API Routes + ANLZ Enrichment Summary

**4 analysis API endpoints (single/batch/cancel/status) in analyze_routes.py, plus /anlz fallback to analysis_cache with 4-stem waveform + essentia data**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T22:17:22Z
- **Completed:** 2026-03-27T22:19:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created analyze_routes.py with POST /tracks/{id}/analyze, POST /analyze/batch, DELETE /analyze/batch, GET /analyze/status
- Enhanced /anlz endpoint to return 200 with analysis_cache data when Rekordbox ANLZ is absent
- Existing Rekordbox ANLZ responses enriched with waveform_4stem + essentia fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create analyze_routes.py + register router in main.py** - `c1c6037d` (feat)
2. **Task 2: Enhance /api/tracks/{id}/anlz with analysis_cache fallback** - `2c5a0ea5` (feat)

## Files Created/Modified
- `apps/mixmind/sidecar/analyze_routes.py` - 4 analysis API endpoints with batch runner management
- `apps/mixmind/sidecar/main.py` - Router registration for analyze_routes
- `apps/mixmind/sidecar/library.py` - _enrich_with_analysis helper + 3-point fallback in get_track_anlz

## Decisions Made
- Lazy msgpack import inside _enrich_with_analysis function body (not top-level) since it may not be installed
- Three fallback points in /anlz endpoint: Rekordbox DB missing, no ANLZ row for track, ANLZ file not found on disk -- all check analysis_cache before returning 404

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analysis pipeline fully wired: analyzer.py -> state.py -> analyze_routes.py -> main.py
- Frontend can now call POST /api/tracks/{id}/analyze and GET /api/analyze/status
- /anlz endpoint automatically includes 4-stem waveform data when available

---
*Phase: quick-247*
*Completed: 2026-03-27*
