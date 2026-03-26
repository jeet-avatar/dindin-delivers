---
phase: quick
plan: 234
subsystem: mixmind
tags: [waveform, dj, cdj3000, pioneer, anlz, rekordbox, frontend, react, electron, python]
dependency_graph:
  requires: []
  provides: [mixmind-dj-waveform-view, anlz-parser, rekordbox-anlz-fields]
  affects: [mixmind-frontend, mixmind-sidecar]
tech_stack:
  added: [anlz_parser.py (new sidecar module), DJWaveformView.tsx (new React component)]
  patterns: [canvas-requestAnimationFrame, lifted-state, pyrekordbox-anlz-parsing]
key_files:
  created:
    - apps/mixmind/sidecar/anlz_parser.py
    - apps/mixmind/frontend/src/components/DJWaveformView.tsx
  modified:
    - apps/mixmind/sidecar/rekordbox.py
    - apps/mixmind/sidecar/library.py
    - apps/mixmind/frontend/src/types/track.ts
    - apps/mixmind/frontend/src/App.tsx
    - apps/mixmind/frontend/src/components/MiniPlayer.tsx
decisions:
  - "seekTo prop pattern for external seek: parent sets seekTo state, MiniPlayer watches via useEffect"
  - "MiniPlayer rewritten with onCurrentTimeChange/onDurationChange callbacks to lift state to App"
  - "3-band waveform drawn as stacked CDJ bars: low=bottom40%, mid=middle30%, high=top30%"
  - "EXT file errors caught and treated as empty sections/no 3-band (graceful degradation)"
metrics:
  duration: ~35min
  completed: "2026-03-26"
  tasks: 6
  files: 7
---

# Q-234: MixMind DJ Waveform View — Layout C, Pioneer CDJ-3000 Colors

**One-liner:** Pioneer CDJ-3000 split-pane waveform with beat grid, section overlays, hot/memory cues, and 3-band frequency coloring (Low=#FF2D55, Mid=#00E726, High=#00BFFF) from Rekordbox ANLZ binary analysis files.

---

## What Was Built

### `anlz_parser.py` (new sidecar module)
Parses Rekordbox binary ANLZ analysis files using pyrekordbox. Returns structured JSON:
- `beat_grid`: list of `{time_ms, beat (1-4), bpm}` — times_arr * 1000 for ms conversion
- `first_beat_ms`: first entry where beat==1 (true musical downbeat)
- `waveform_preview`: mono amplitude bytes (0-255) from .DAT `wf_preview` tag
- `waveform_3band`: CDJ 3-band `{low, mid, high}` from .EXT `PWV5` tag, or null
- `sections`: song structure from .EXT `PSSI` tag with CDJ-3000 section colors
- `hot_cues`: from `DjmdCue` table (Kind=6/5) with Pioneer ColorTableIndex → hex mapping
- `memory_cues`: from `DjmdCue` table (Kind=1), always `#33FF9E` mint green
- EXT parse errors (ConstError) caught gracefully; returns empty sections/null 3-band

### `rekordbox.py` changes
- `Track` dataclass: new `analysis_data_path: str = ""` field
- `to_cache()`: includes `analysis_data_path` in serialization
- DB loader: populates `analysis_data_path = t.AnalysisDataPath or ""`

### `library.py` changes
- `TrackOut`: new `analysis_data_path: str = ""` field
- `get_library()`: passes `analysis_data_path` through from Track
- New `GET /api/tracks/{content_id}/anlz` endpoint: opens Rekordbox DB, queries AnalysisDataPath, calls `parse_track_anlz()`, returns full ANLZ dict. Returns 404 if DB missing, track not found, or .DAT file absent.

### `track.ts` ANLZ types
Added 5 new interfaces: `BeatGridEntry`, `SectionEntry`, `HotCueEntry`, `MemoryCueEntry`, `TrackAnlzData`. Also added optional `analysis_data_path?: string` to `Track` interface.

### `DJWaveformView.tsx` (new React component)
Layout C split-pane (below TrackTable, above MiniPlayer):
- **Left pane (55%)**: Overview strip — full track waveform, section overlays, beat ticks (downbeat=2px/full, off-beat=1px/half), first-beat gold marker, hot cue triangles (top), memory cue triangles (bottom), playhead needle. Click to seek.
- **Right pane (45%)**: Zoomed view (±32 beats) — same data sliced to visible window; playhead always centered; initializes on `first_beat_ms` on load.
- **Transport bar**: Hot cue slot buttons (A–H) with CDJ palette colors; "Beat 1" gold button seeks to `first_beat_ms`; section kind legend on the right.
- **No vocals strip**: Single unified CDJ-style waveform only.
- Loading spinner and "No ANLZ data" graceful fallback states.

### `App.tsx` wiring
- Lifted `playerCurrentTime` and `playerDuration` state to App level
- `handleSeek(sec)` sets `seekTo` state → passed to MiniPlayer
- `DJWaveformView` rendered above `MiniPlayer` when `nowPlaying` is set
- Player state reset on track change

### `MiniPlayer.tsx` changes
- New props: `onCurrentTimeChange`, `onDurationChange`, `seekTo`
- `timeupdate` → calls `onCurrentTimeChange?.(audio.currentTime)`
- `loadedmetadata` → calls `onDurationChange?.(audio.duration)`
- `seekTo` prop: `useEffect` watches for non-null changes and sets `audioRef.current.currentTime`

---

## CDJ-3000 Color Spec (Exact Values Used)

| Element | Color | Hex |
|---------|-------|-----|
| Low band | Red | `#FF2D55` |
| Mid band | Green | `#00E726` |
| High band | Sky blue | `#00BFFF` |
| Mono fallback | Purple | `#6366f1` |
| First beat | Gold | `#FFD60A` |
| Memory cues | Mint | `#33FF9E` |
| Intro overlay | Bright blue | `#00B4FF` |
| Chorus overlay | Red-pink | `#FF2D55` |
| Verse overlay | Green | `#34C759` |
| Outro overlay | Grey | `#8E8E93` |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

### Files exist:
- FOUND: apps/mixmind/sidecar/anlz_parser.py
- FOUND: apps/mixmind/frontend/src/components/DJWaveformView.tsx
- FOUND: apps/mixmind/sidecar/rekordbox.py
- FOUND: apps/mixmind/sidecar/library.py
- FOUND: apps/mixmind/frontend/src/types/track.ts
- FOUND: apps/mixmind/frontend/src/App.tsx
- FOUND: apps/mixmind/frontend/src/components/MiniPlayer.tsx

### Commits exist:
- fbb46c19: feat(quick-234): add anlz_parser.py
- 1f4317f4: feat(quick-234): add analysis_data_path field to rekordbox.py
- 64586524: feat(quick-234): add analysis_data_path to TrackOut and ANLZ endpoint
- 19a360ee: feat(quick-234): add ANLZ type interfaces to track.ts
- f1775567: feat(quick-234): add DJWaveformView.tsx
- b7671dfd: feat(quick-234): wire DJWaveformView into App.tsx

### TypeScript: `npx tsc --noEmit` — PASSED (no output = no errors)
