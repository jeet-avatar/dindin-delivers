---
phase: quick-241
plan: 01
subsystem: api
tags: [rekordbox, mixmind, sidecar, camelot, genre, metadata]

requires:
  - phase: none
    provides: existing MixMind sidecar with Track dataclass and library endpoint
provides:
  - 6 new metadata fields on Track dataclass (genre, comment, color_hex, date_added, label, play_count)
  - GET /api/library/genres endpoint
  - GET /api/library/compatible/{camelot} endpoint
  - Genre column in AI CSV serialization
affects: [mixmind-frontend, ai-playlist-generation]

tech-stack:
  added: []
  patterns: [COLOR_MAP lookup for Rekordbox ColorID-to-hex conversion]

key-files:
  created: []
  modified:
    - apps/mixmind/sidecar/rekordbox.py
    - apps/mixmind/sidecar/library.py
    - apps/mixmind/sidecar/ai.py

key-decisions:
  - "Used COLOR_MAP dict to translate Rekordbox integer ColorID to hex strings"
  - "Genre included in AI CSV for richer Claude context; other fields excluded to save tokens"

patterns-established:
  - "_compatible_keys helper computes Camelot wheel adjacency (same, +1, -1, relative major/minor)"

requirements-completed: [Q-241]

duration: 37min
completed: 2026-03-27
---

# Quick 241: Genre/Comment/Color/Date/Label/PlayCount Summary

**Extended MixMind Track with 6 Rekordbox metadata fields, added genre list and Camelot compatibility API endpoints, enriched AI CSV with genre column**

## Performance

- **Duration:** 37 min
- **Started:** 2026-03-27T19:00:12Z
- **Completed:** 2026-03-27T19:37:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Track dataclass carries genre, comment, color_hex, date_added, label, play_count with correct defaults
- DB loader reads from verified RB schema columns (GenreName, Commnt, ColorID, StockDate, LabelName, DJPlayCount)
- Both XML loaders (pyrekordbox + ElementTree fallback) read Genre, Comments, Colour, DateAdded, Label, PlayCount
- GET /api/library/genres returns sorted unique non-empty genre strings from full library
- GET /api/library/compatible/{camelot} returns 4 harmonically compatible Camelot keys
- AI CSV serialization includes genre column for richer playlist generation context

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Track dataclass and loaders with 6 new fields** - `ac268062` (feat)
2. **Task 2: Add genres/compatible endpoints, extend TrackOut + CSV** - `61af83b4` (feat)

## Files Created/Modified
- `apps/mixmind/sidecar/rekordbox.py` - Added COLOR_MAP, 6 new Track fields, to_cache extension, DB + XML loader updates
- `apps/mixmind/sidecar/library.py` - Extended TrackOut model, added /library/genres and /library/compatible/{camelot} endpoints
- `apps/mixmind/sidecar/ai.py` - Added genre column to CSV header, row serialization, and system prompt format comment

## Decisions Made
- Used COLOR_MAP dict for ColorID-to-hex conversion rather than inline ternary -- cleaner and matches Rekordbox's 8-color palette
- Only genre added to AI CSV (not all 6 fields) to avoid blowing up token usage in Claude context window
- _compatible_keys uses modular arithmetic for Camelot wheel wraparound (12->1 and 1->12)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend can now consume genre, comment, color_hex, date_added, label, play_count from /api/library
- Genre filter UI can call /api/library/genres for dropdown population
- Key compatibility UI can call /api/library/compatible/{camelot} for harmonic mixing suggestions

---
*Phase: quick-241*
*Completed: 2026-03-27*
