# MixMind Stem Analysis & Auto-Analyze — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** MixMind sidecar + frontend

---

## Problem

MixMind's waveform view currently shows Rekordbox's 3-band frequency split (low/mid/high) which cannot distinguish kicks from basslines, vocals from synths. Tracks missing Rekordbox ANLZ data show no waveform at all. DJs need real instrument separation and automatic analysis for unanalyzed tracks.

## Solution

Add a two-stage audio analysis pipeline using Demucs (Meta AI source separation) + Essentia (audio feature extraction) that:
1. Auto-analyzes tracks Rekordbox missed
2. Re-analyzes on demand
3. Produces 4-stem waveforms (drums/bass/vocals/other) with distinct RGB colors
4. Extracts BPM, key, genre, energy, danceability independently of Rekordbox

## Architecture

```
Audio File → Demucs (stem separation) → 4 stem arrays
           → Essentia (feature extraction) → BPM, key, genre, energy

Results cached in state.db → served via /api/tracks/{id}/anlz
Frontend renders 4-stem stacked waveform (priority over 3-band)
```

### Decision Flow Per Track

1. Track loads → check Rekordbox ANLZ data exists?
2. Yes → check analysis_cache for 4-stem? → serve cached or show "Analyze" button
3. No Rekordbox data → auto-trigger full analysis
4. Re-analyze → user triggers via `POST /api/tracks/{id}/analyze?force=true`

### File Path Resolution

The analysis endpoints resolve `content_id` → audio file path by:
1. First checking the Rekordbox DB (`DjmdContent.FolderPath`) if available
2. Falling back to `library_cache.file_path` in state.db
3. Returning 404 if no file path can be resolved

## Analysis Pipeline — `analyzer.py`

New file: `apps/mixmind/sidecar/analyzer.py`

### Stage 1: Demucs Source Separation (~30-60s on M1)

- Input: audio file path
- Model: `htdemucs` (default Demucs v4 model)
- Output: 4 raw audio stems as numpy arrays (drums, bass, vocals, other)
- Each stem → compute RMS energy in 10ms windows → normalize to 0-255
- Downsample to ~800 columns (matches Rekordbox preview resolution)
- Result per column: `{drums: 0-255, bass: 0-255, vocals: 0-255, other: 0-255}`
- Uses MPS (Metal Performance Shaders) on Apple Silicon for GPU acceleration
- Temp files written to `~/.mixmind/tmp/`, cleaned after each track
- Peak temp disk usage: ~300-500MB per track (4 stems × ~75MB WAV each)

### Stage 2: Essentia Feature Extraction (~5-10s)

- Input: audio file path
- Output:
  - `bpm`: float (beats per minute)
  - `key_musical`: str (e.g. "Am", "F#")
  - `camelot`: str (derived from key, e.g. "8A")
  - `genre`: str (e.g. "Techno", "House")
  - `energy`: float 0.0-1.0
  - `danceability`: float 0.0-1.0

### Error Handling

Each stage can fail independently. The pipeline handles:

| Failure | Behavior |
|---------|----------|
| Audio file missing/moved | Status `failed`, error stored in DB, skip to next in batch |
| Demucs OOM / crash | Status `failed_demucs`, Essentia still runs, partial result cached |
| Essentia failure | Status `failed_essentia`, Demucs waveform still cached if available |
| Corrupt/DRM audio | Status `failed`, error message stored, no retry |
| Model download interrupted | Retry on next analysis attempt, show download progress again |
| Tracks <5 seconds | Skip Demucs (too short for meaningful stems), Essentia only |
| Disk space <1GB free | Abort batch with warning, don't start new tracks |

Temp directory (`~/.mixmind/tmp/`) is cleaned in a `finally` block after each track regardless of success/failure.

### Stem-to-Waveform Conversion

```python
def stems_to_waveform(stems: dict[str, np.ndarray], sr: int, n_columns: int = 800) -> list[dict]:
    """Convert 4 Demucs stem arrays to display-ready waveform columns."""
    result = []
    for stem_name in ['drums', 'bass', 'vocals', 'other']:
        audio = stems[stem_name]
        # Compute RMS in windows
        window_size = len(audio) // n_columns
        rms = [np.sqrt(np.mean(audio[i*window_size:(i+1)*window_size]**2))
               for i in range(n_columns)]
        # Normalize to 0-255
        max_rms = max(rms) or 1.0
        normalized = [int(min(255, (v / max_rms) * 255)) for v in rms]
        result.append((stem_name, normalized))
    # Zip into column dicts
    return [
        {name: vals[i] for name, vals in result}
        for i in range(n_columns)
    ]
```

## 4-Stem Color Scheme

| Stem | Color | Hex | Position | Rationale |
|------|-------|-----|----------|-----------|
| Drums/Kicks | Orange | `#FF9500` | Bottom | Warm punchy transients, anchored to baseline |
| Bass | Deep Purple | `#8B00FF` | Above drums | Sub energy, distinct from all others |
| Vocals | Cyan | `#00E5FF` | Above bass | Melodic content, bright and readable |
| Other (synths/FX) | Gold | `#FFD700` | Top | Pads, arps, FX — high luminance, distinct from orange under deuteranopia |

Stacked bottom-to-top: drums → bass → vocals → other. Heaviest at bottom, lightest at top.

**Colorblind note:** Orange (`#FF9500`) and Gold (`#FFD700`) have sufficient luminance contrast to be distinguishable under deuteranopia/protanopia. Purple and Cyan are safe for all CVD types. The stacking order also provides positional cues (drums always bottom, other always top).

## Database Schema

New table in `state.db`:

```sql
CREATE TABLE IF NOT EXISTS analysis_cache (
    content_id       TEXT NOT NULL,
    source           TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'analyzing', 'complete', 'failed', 'failed_demucs', 'failed_essentia'
    error_message    TEXT,
    file_path        TEXT,
    -- Essentia results
    bpm              REAL,
    key_musical      TEXT,
    camelot          TEXT,
    genre            TEXT,
    energy           REAL,
    danceability     REAL,
    -- Demucs 4-stem waveform (msgpack blob, ~3KB per track)
    waveform_4stem   BLOB,
    -- Metadata
    analyzed_at      TEXT DEFAULT (datetime('now')),
    analyzer_version TEXT DEFAULT '1.0',
    duration_ms      INTEGER,
    PRIMARY KEY (content_id, source)
);
```

Storage: msgpack serialization. ~800 columns × 4 stems × 1 byte = 3.2KB raw, ~2KB compressed. For 8000 tracks ≈ 16MB total.

## API Endpoints

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tracks/{id}/analyze` | POST | Analyze single track. `?force=true` to re-analyze. Returns result. |
| `/api/analyze/batch` | POST | Start background batch for all un-analyzed tracks. |
| `/api/analyze/batch` | DELETE | Cancel in-progress batch analysis. |
| `/api/analyze/status` | GET | Progress: `{total, analyzed, failed, in_progress, current_track, eta_sec}` |

**Note:** No separate DELETE endpoint for clearing cache. `POST ?force=true` handles re-analysis in a single request.

### Enhanced Existing Endpoint

`GET /api/tracks/{id}/anlz` — response adds:

```json
{
  "waveform_4stem": [
    {"drums": 180, "bass": 90, "vocals": 0, "other": 120}
  ],
  "essentia": {
    "bpm": 128.3,
    "key_musical": "Am",
    "camelot": "8A",
    "genre": "Techno",
    "energy": 0.82,
    "danceability": 0.91
  },
  "analyzer_version": "1.0"
}
```

Fields are `null` if track hasn't been analyzed yet. Rekordbox data still returned alongside.

**Important:** If Rekordbox ANLZ data is absent but `analysis_cache` has data, the endpoint returns 200 with the cached analysis (not 404). The 404 only triggers when BOTH Rekordbox ANLZ and analysis cache are empty.

### POST /api/tracks/{id}/analyze Response

```json
{
  "content_id": "12345",
  "status": "complete",
  "duration_sec": 42,
  "essentia": {
    "bpm": 128.3,
    "key_musical": "Am",
    "camelot": "8A",
    "genre": "Techno",
    "energy": 0.82,
    "danceability": 0.91
  },
  "waveform_columns": 800,
  "analyzer_version": "1.0"
}
```

**Error response:**
```json
{
  "content_id": "12345",
  "status": "failed",
  "error": "Audio file not found: /Volumes/USB/track.mp3",
  "stage": "pre-check"
}
```

### GET /api/analyze/status Response

```json
{
  "total": 8213,
  "analyzed": 3400,
  "failed": 12,
  "pending": 4801,
  "in_progress": true,
  "current_track": "Afterlife — Tale Of Us",
  "current_index": 3401,
  "eta_sec": 144390,
  "avg_sec_per_track": 30,
  "failures": [
    {"content_id": "456", "error": "File not found", "stage": "pre-check"},
    {"content_id": "789", "error": "Demucs OOM", "stage": "demucs"}
  ]
}
```

### Batch Processing

- Sequential processing (one track at a time)
- Single-track `POST /api/tracks/{id}/analyze` requests **preempt** the batch queue (priority queue)
- Batch checks a cancellation flag between tracks — `DELETE /api/analyze/batch` sets it
- Background thread with `threading.Event` for cancellation

## Auto-Analyze Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Library load | >0 tracks with no ANLZ AND no analysis_cache | Show prompt: "N tracks need analysis. Start batch?" (max 50 auto-queued) |
| Track select | User clicks track with no 4-stem | Show "Analyze for stem waveform" button |
| Manual | User clicks "Analyze" or "Re-analyze" | Immediate single-track analysis (preempts batch) |
| Batch | User clicks "Analyze All" in toolbar | Background queue, sequential processing |
| Idle | App idle >60s + un-analyzed tracks + user opted in | Start background analysis (low priority) |

**Note:** Library load does NOT silently queue all tracks. It shows a prompt with count and lets the user decide. The idle trigger only fires if the user opted in via a "Background analysis" toggle in preferences.

## Frontend Changes

### DJWaveformView.tsx

Rendering priority: `waveform_4stem > waveform_3band > waveform_preview`

4-stem rendering: stacked bars bottom-to-top per column. Each stem's amplitude (0-255) determines that color's bar height. Canvas rendering with alpha 0.85 per stem.

```typescript
// New type
interface Waveform4Stem {
  drums: number;   // 0-255
  bass: number;
  vocals: number;
  other: number;
}

// Color constants
const STEM_COLORS = {
  drums:  '#FF9500',
  bass:   '#8B00FF',
  vocals: '#00E5FF',
  other:  '#FFD700',
};

// Render order (bottom to top)
const STEM_ORDER: (keyof Waveform4Stem)[] = ['drums', 'bass', 'vocals', 'other'];
```

### TrackTable.tsx

- "Analyze" button in row actions (next to "+ Set") for tracks without 4-stem data
- "Re-analyze" option (same button, different label if already analyzed)
- Small indicator dot: green = analyzed, yellow = analyzing, red = failed, gray = not analyzed

### New UI Elements

- Stem legend in waveform view (4 colored dots with labels, top-right corner)
- Progress toast during batch analysis (% complete, current track name, failures count)
- First-run model download dialog: "Downloading AI models... (200MB, one-time)"
- Batch prompt on library load: "N tracks need stem analysis. Start?" with Yes/Later buttons

### track.ts Type Updates

```typescript
interface EssentiaResult {
  bpm: number;
  key_musical: string;
  camelot: string;
  genre: string;
  energy: number;
  danceability: number;
}

interface TrackAnlzData {
  // ... existing fields ...
  waveform_4stem?: { drums: number; bass: number; vocals: number; other: number }[];
  essentia?: EssentiaResult;
  analyzer_version?: string;
}
```

## Dependencies

```
# New additions to requirements.txt
numpy>=1.24.0,<2.0.0     # Array operations for waveform processing
demucs>=4.0.0             # Meta AI source separation (~200MB model on first run)
essentia>=2.1b6           # Audio analysis (BPM, key, genre, energy)
msgpack>=1.0.0            # Compact binary serialization for waveform blobs
torch>=2.0.0,<3.0.0      # Required by Demucs (MPS on Apple Silicon)
```

**Install note:** On macOS Apple Silicon, default `pip install torch` includes MPS support. Do NOT install CUDA variant. Essentia may need `brew install fftw libyaml libsamplerate` if no pre-built wheel is available for ARM64.

**Size impact:** Virtual environment grows from ~200MB to ~2.5GB (torch is the bulk). The Demucs `htdemucs` model (~200MB) downloads on first analysis run, cached at `~/.cache/torch/hub/`.

First-run: Demucs downloads `htdemucs` model (~200MB). One-time only.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `sidecar/analyzer.py` | **NEW** | Demucs + Essentia pipeline, batch processing, cancellation |
| `sidecar/analyze_routes.py` | **NEW** | API routes for /analyze endpoints |
| `sidecar/state.py` | MODIFY | Add analysis_cache table + CRUD methods |
| `sidecar/main.py` | MODIFY | Register analyze_routes router |
| `sidecar/library.py` | MODIFY | Enhance /anlz to return 4-stem + essentia when Rekordbox ANLZ absent |
| `sidecar/requirements.txt` | MODIFY | Add numpy, demucs, essentia, msgpack, torch |
| `frontend/src/types/track.ts` | MODIFY | Add Waveform4Stem, EssentiaResult types |
| `frontend/src/components/DJWaveformView.tsx` | MODIFY | 4-stem rendering path + stem legend |
| `frontend/src/components/TrackTable.tsx` | MODIFY | Analyze button + status dot in row actions |
| `frontend/src/App.tsx` | MODIFY | Batch analysis state, progress toast, library load prompt |
| `sidecar/tests/test_analyzer.py` | **NEW** | Unit tests for analysis pipeline |

## Success Criteria

- Tracks with no Rekordbox ANLZ get prompted for analysis on library load
- Single-track analysis completes in <60s on Apple Silicon
- 4-stem waveform renders in DJWaveformView with correct colors
- Batch analysis processes all un-analyzed tracks with progress reporting
- Batch can be cancelled mid-run
- Failed analyses are tracked with error messages and don't block the queue
- Re-analyze via `?force=true` overwrites cached results
- Essentia BPM/key/genre shown alongside Rekordbox values for comparison
- `/api/tracks/{id}/anlz` returns 200 when analysis exists but Rekordbox ANLZ doesn't
- All existing tests pass (no regressions)
- TypeScript + Vite build clean
