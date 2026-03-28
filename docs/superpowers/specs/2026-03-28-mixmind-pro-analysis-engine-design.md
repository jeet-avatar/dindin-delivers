# MixMind Pro Analysis Engine — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** MixMind sidecar + frontend
**Depends on:** Q-246/247/248 (Demucs + Essentia foundation already built)

---

## Problem

MixMind currently depends on Rekordbox for beat grids, sections, and cue points. 1156 of 8213 tracks have zero analysis. Even analyzed tracks may have inaccurate beat grids (Rekordbox notoriously struggles with Afro House, broken beats, live recordings). DJs need an independent analysis engine that matches or exceeds Rekordbox quality.

## Solution

Build a 4-stage analysis pipeline that produces:
1. **Beat grid** with downbeat detection (madmom — state-of-the-art beat tracker)
2. **Phrase/section detection** (spectral flux + novelty curve → intro/verse/breakdown/drop/outro)
3. **Auto-cue suggestions** (AI places 8 hot cues at musically significant points using stem energy)
4. **Genre classification** (Essentia Discogs400 ML model — 400 genre labels)

All results shown **side-by-side with Rekordbox** so the DJ can compare and pick the better analysis per track.

## Architecture

```
Audio File
  ├── Stage 1: Beat Grid (madmom BeatTracker + DBNDownBeatTracker)
  │     → beat_grid: [{time_ms, beat_number, bpm}]
  │     → first_beat_ms, avg_bpm, bpm_changes[]
  │
  ├── Stage 2: Sections (spectral novelty + beat-aligned segmentation)
  │     → sections: [{start_ms, end_ms, kind, name, color_hex, confidence}]
  │     → Uses beat grid from Stage 1 to snap boundaries to downbeats
  │
  ├── Stage 3: Auto-Cue (stem energy analysis + section boundaries)
  │     → hot_cues: [{slot, time_ms, label, color_hex, reason}]
  │     → 8 cue points: first_kick, first_vocal, breakdown, drop, etc.
  │
  └── Stage 4: Genre (Essentia Discogs400 or MusiCNN)
        → genre: str, genre_confidence: float, sub_genres: [str]

Results cached in analysis_cache table (extends existing schema)
Frontend shows MixMind column alongside Rekordbox column
```

## Stage 1: Beat Grid — `beat_detector.py`

New file: `apps/mixmind/sidecar/beat_detector.py`

### Why madmom over Essentia

| Library | Beat accuracy | Downbeat detection | Variable BPM | DJ music |
|---------|--------------|-------------------|--------------|----------|
| **madmom** | 95.2% F-measure (MIREX) | Yes (DBNDownBeatTracker) | Yes (BPM changes) | Best for electronic |
| Essentia | 89% F-measure | No native downbeat | Basic | Decent |
| librosa | 87% F-measure | No | Basic | Weak on electronic |

madmom's `DBNDownBeatTracker` uses a Dynamic Bayesian Network that models meter (4/4, 3/4) explicitly — critical for dance music where the downbeat defines the phrase.

### Beat Grid Output Format

```python
@dataclass
class BeatGrid:
    beats: list[dict]          # [{time_ms, beat_number (1-4), bpm}]
    first_beat_ms: float       # first downbeat (beat 1)
    avg_bpm: float             # weighted average BPM
    bpm_stable: bool           # True if BPM varies < 0.5% (most DJ tracks)
    bpm_changes: list[dict]    # [{time_ms, bpm}] — for variable BPM tracks
    confidence: float          # 0.0-1.0 — how confident in the grid
    meter: int                 # 4 (4/4 time) or 3 (3/4 waltz) — from downbeat tracker
```

### Algorithm

```python
def detect_beats(file_path: str) -> BeatGrid:
    import madmom

    # Load audio at 44100Hz mono
    signal = madmom.audio.signal.Signal(file_path, sample_rate=44100, num_channels=1)

    # Stage A: Beat activation function (neural network)
    beat_proc = madmom.features.beats.RNNBeatProcessor()(signal)

    # Stage B: Beat tracking with DBN (handles tempo changes)
    beat_tracker = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
    beat_times = beat_tracker(beat_proc)  # array of beat times in seconds

    # Stage C: Downbeat detection (which beats are "1")
    downbeat_proc = madmom.features.downbeats.RNNDownBeatProcessor()(signal)
    downbeat_tracker = madmom.features.downbeats.DBNDownBeatTrackingProcessor(
        beats_per_bar=[4, 3], fps=100
    )
    downbeats = downbeat_tracker(downbeat_proc)  # [(time, beat_number), ...]

    # Build beat grid
    beats = []
    for time_sec, beat_num in downbeats:
        beats.append({
            "time_ms": round(time_sec * 1000, 1),
            "beat_number": int(beat_num),
            "bpm": _local_bpm(beat_times, time_sec),
        })

    # Calculate BPM stability
    bpms = [b["bpm"] for b in beats if b["bpm"] > 0]
    avg_bpm = sum(bpms) / len(bpms) if bpms else 0
    bpm_std = _std(bpms)
    bpm_stable = bpm_std < (avg_bpm * 0.005)  # < 0.5% variation

    first_beat = next((b for b in beats if b["beat_number"] == 1), beats[0] if beats else None)

    return BeatGrid(
        beats=beats,
        first_beat_ms=first_beat["time_ms"] if first_beat else 0,
        avg_bpm=round(avg_bpm, 2),
        bpm_stable=bpm_stable,
        bpm_changes=_detect_bpm_changes(beats) if not bpm_stable else [],
        confidence=_grid_confidence(beat_proc, beat_times),
        meter=4,  # from downbeat tracker
    )
```

### Comparison with Rekordbox

Rekordbox beat grid weaknesses MixMind will fix:
- **Off-by-one-beat**: Rekordbox often places beat 1 on beat 2 or 3 in Afro House
- **Variable BPM**: Rekordbox assumes constant BPM — live recordings drift
- **Broken beats**: Rekordbox fails on tracks with irregular patterns (UK Garage, Breakbeat)
- **Silence handling**: Rekordbox marks beats in silence — MixMind will skip silent sections

## Stage 2: Section Detection — `section_detector.py`

New file: `apps/mixmind/sidecar/section_detector.py`

### Section Types (CDJ-3000 compatible)

| Kind | Name | Color | Detection Signal |
|------|------|-------|-----------------|
| 1 | Intro | `#00B4FF` | Start → first energy rise |
| 2 | Build-up | `#F5A623` | Rising energy before drop |
| 3 | Drop | `#FF2D55` | Peak energy (all stems active) |
| 4 | Breakdown | `#7B68EE` | Energy dip (drums out, vocals/pads remain) |
| 5 | Outro | `#8E8E93` | Last energy decline → end |
| 6 | Verse | `#34C759` | Moderate energy, vocals present |
| 7 | Chorus | `#FF9500` | High energy, melodic peak |

### Algorithm

```python
def detect_sections(file_path: str, beat_grid: BeatGrid, stems: dict) -> list[dict]:
    """Detect song sections using stem energy + spectral novelty.

    Uses the Demucs stems (already computed) to measure per-stem energy
    over time, then finds boundaries where the energy profile changes
    significantly (e.g., drums drop out = breakdown, drums come back = drop).
    """
    # 1. Compute per-stem energy curves (RMS in 500ms windows)
    drum_energy  = _stem_energy_curve(stems["drums"], window_ms=500)
    bass_energy  = _stem_energy_curve(stems["bass"], window_ms=500)
    vocal_energy = _stem_energy_curve(stems["vocals"], window_ms=500)
    other_energy = _stem_energy_curve(stems["other"], window_ms=500)

    # 2. Compute combined energy + novelty (rate of change)
    total_energy = drum_energy + bass_energy + vocal_energy + other_energy
    novelty = _spectral_novelty(total_energy)

    # 3. Find segment boundaries at novelty peaks, snap to nearest downbeat
    boundaries = _find_boundaries(novelty, min_section_bars=8)
    boundaries = _snap_to_downbeats(boundaries, beat_grid)

    # 4. Classify each segment by stem energy profile
    sections = []
    for i, (start_ms, end_ms) in enumerate(zip(boundaries, boundaries[1:])):
        drums_active  = _mean_energy(drum_energy, start_ms, end_ms) > 0.3
        vocals_active = _mean_energy(vocal_energy, start_ms, end_ms) > 0.2
        energy_level  = _mean_energy(total_energy, start_ms, end_ms)

        kind = _classify_section(
            drums_active, vocals_active, energy_level,
            is_first=(i == 0),
            is_last=(i == len(boundaries) - 2),
        )
        sections.append({
            "start_ms": start_ms,
            "end_ms": end_ms,
            "kind": kind.value,
            "name": kind.name.lower(),
            "color_hex": SECTION_COLORS[kind],
            "confidence": _section_confidence(novelty, start_ms, end_ms),
        })
    return sections
```

### Section Classification Logic

```
if is_first and energy < 0.3:           → INTRO
if is_last and energy declining:         → OUTRO
if drums OFF and vocals ON:              → BREAKDOWN
if drums ON and energy > 0.7:            → DROP
if energy rising and drums intensifying: → BUILDUP
if vocals ON and energy moderate:        → VERSE
if energy high and melodic content:      → CHORUS
```

## Stage 3: Auto-Cue Suggestions — `cue_detector.py`

New file: `apps/mixmind/sidecar/cue_detector.py`

### 8 Auto-Cue Points

| Slot | Label | Color | Detection |
|------|-------|-------|-----------|
| A | First Kick | `#FF2D55` | First drum transient > threshold |
| B | First Vocal | `#00E5FF` | First vocal energy peak |
| C | Build Start | `#F5A623` | Start of first buildup section |
| D | Drop | `#FF3D00` | Start of first drop section |
| E | Breakdown | `#7B68EE` | Start of main breakdown |
| F | Drop 2 | `#FF3D00` | Start of second drop (if exists) |
| G | Outro Start | `#8E8E93` | Start of outro section |
| H | Last Beat | `#FFD600` | Last beat before silence |

### Algorithm

```python
def suggest_cues(beat_grid: BeatGrid, sections: list[dict], stems: dict) -> list[dict]:
    cues = []

    # A: First Kick — first drum transient in the track
    drum_onset = _first_transient(stems["drums"], threshold=0.3)
    drum_beat = _snap_to_beat(drum_onset, beat_grid)
    cues.append({"slot": "A", "time_ms": drum_beat, "label": "First Kick",
                 "color_hex": "#FF2D55", "reason": "First drum hit"})

    # B: First Vocal — first significant vocal energy
    vocal_onset = _first_sustained_energy(stems["vocals"], min_duration_ms=500)
    if vocal_onset:
        cues.append({"slot": "B", "time_ms": _snap_to_beat(vocal_onset, beat_grid),
                     "label": "Vocal In", "color_hex": "#00E5FF",
                     "reason": "First vocal entry"})

    # C-G: From section boundaries
    for section in sections:
        if section["name"] == "buildup" and "C" not in [c["slot"] for c in cues]:
            cues.append({"slot": "C", "time_ms": section["start_ms"],
                         "label": "Build", "color_hex": "#F5A623",
                         "reason": "Buildup start"})
        # ... similar for D (drop), E (breakdown), F (drop 2), G (outro)

    # H: Last Beat
    last_beat = beat_grid.beats[-1]["time_ms"] if beat_grid.beats else 0
    cues.append({"slot": "H", "time_ms": last_beat, "label": "Last Beat",
                 "color_hex": "#FFD600", "reason": "Final beat"})

    return cues[:8]  # max 8 hot cue slots
```

## Stage 4: Genre Classification

Replace the spectral heuristic in `analyzer.py:_classify_genre()` with Essentia's Discogs400 model.

```python
def classify_genre(file_path: str) -> dict:
    """Classify genre using Essentia's pre-trained Discogs400 model."""
    import essentia.standard as es

    audio = es.MonoLoader(filename=file_path, sampleRate=16000)()

    # Discogs400 model — 400 genre/style labels
    model_path = _ensure_model("discogs-effnet-bs64-1.pb")
    embeddings = es.TensorflowPredictEffnetDiscogs(
        graphFilename=model_path, output="PartitionedCall:1"
    )(audio)

    predictions = es.TensorflowPredict2D(
        graphFilename=_ensure_model("genre_discogs400-discogs-effnet-bs64-1.pb"),
        output="activations"
    )(embeddings)

    # Top 3 genres
    labels = _load_genre_labels()  # 400 labels from metadata file
    top_indices = predictions.mean(axis=0).argsort()[-3:][::-1]

    return {
        "genre": labels[top_indices[0]],
        "genre_confidence": float(predictions.mean(axis=0)[top_indices[0]]),
        "sub_genres": [labels[i] for i in top_indices[1:]],
    }
```

Model files (~20MB each) download on first use to `~/.mixmind/models/`.

## Database Schema — Extended `analysis_cache`

Add new columns to existing `analysis_cache` table:

```sql
ALTER TABLE analysis_cache ADD COLUMN beat_grid_mm     BLOB;  -- msgpack: MixMind beat grid
ALTER TABLE analysis_cache ADD COLUMN sections_mm      BLOB;  -- msgpack: MixMind sections
ALTER TABLE analysis_cache ADD COLUMN auto_cues_mm     BLOB;  -- msgpack: MixMind suggested cues
ALTER TABLE analysis_cache ADD COLUMN genre_confidence  REAL;
ALTER TABLE analysis_cache ADD COLUMN sub_genres        TEXT;  -- JSON array
ALTER TABLE analysis_cache ADD COLUMN beat_confidence   REAL;
ALTER TABLE analysis_cache ADD COLUMN bpm_stable        INTEGER;  -- 0/1
```

Column naming convention: `_mm` suffix = MixMind's own analysis (vs Rekordbox data from ANLZ files).

## API Changes

### Enhanced `/api/tracks/{id}/anlz` Response

```json
{
  "rekordbox": {
    "beat_grid": [...],
    "bpm": 128.0,
    "sections": [...],
    "hot_cues": [...],
    "waveform_3band": [...],
    "waveform_preview": [...]
  },
  "mixmind": {
    "beat_grid": [...],
    "bpm": 128.3,
    "bpm_stable": true,
    "beat_confidence": 0.94,
    "sections": [...],
    "auto_cues": [...],
    "waveform_4stem": [...],
    "essentia": {
      "bpm": 128.3,
      "key_musical": "Am",
      "camelot": "8A",
      "genre": "Afro House",
      "genre_confidence": 0.87,
      "sub_genres": ["Deep House", "Tech House"],
      "energy": 0.82,
      "danceability": 0.91
    }
  },
  "active_source": "auto"
}
```

`active_source`: `"rekordbox"` | `"mixmind"` | `"auto"` — auto means use Rekordbox when available, MixMind when not. User can override per track.

### New Endpoint

`POST /api/tracks/{id}/analyze` enhanced — now runs all 4 stages:
- Stage 1: Beat grid (madmom) — ~10s
- Stage 2: Sections (stem energy) — ~2s (uses Demucs stems from existing pipeline)
- Stage 3: Auto-cues — ~1s (uses beat grid + sections + stems)
- Stage 4: Genre (Discogs400) — ~5s
- Total: ~50-80s per track (Demucs ~30s + madmom ~10s + rest ~10s)

## Frontend — Side-by-Side Comparison

### TrackTable New Columns

Add two narrow columns between Key and Genre:

| Column | Width | Content |
|--------|-------|---------|
| RB | 30px | Green dot if Rekordbox analyzed, gray if not |
| MM | 30px | Purple dot if MixMind analyzed, yellow if analyzing, gray if not |

### DJWaveformView — Dual Source

Add a source toggle button in the waveform view header:

```
[RB] [MM] [Auto]
```

- **RB**: Show Rekordbox beat grid, sections, cues (existing behavior)
- **MM**: Show MixMind beat grid, sections, auto-cues, 4-stem waveform
- **Auto**: Show best available (MixMind if analyzed, else Rekordbox)

When in MM mode, beat grid ticks use MixMind's downbeat detection. Sections use MixMind's section boundaries. Hot cues show MixMind's auto-suggestions (user can still add manual cues).

### Waveform View — Section Overlay

Sections render as semi-transparent colored bands behind the waveform:
- Each section type has a distinct color (matching CDJ-3000 palette)
- Section name label appears at the start of each section
- Transition points marked with vertical dotted lines

### Auto-Cue Display

MixMind auto-cues appear as:
- Diamond markers (vs Rekordbox triangles) below the waveform
- Color-coded per slot (A-H)
- Tooltip shows the cue label + reason ("First Kick", "Drop start — drums peak")
- User can accept (converts to permanent cue) or dismiss

## Dependencies

```
# Add to requirements.txt
madmom>=0.16.1       # Beat tracking + downbeat detection (state-of-the-art)
```

Essentia models (~40MB total) download on first use:
- `discogs-effnet-bs64-1.pb` (~20MB)
- `genre_discogs400-discogs-effnet-bs64-1.pb` (~20MB)
- Cached at `~/.mixmind/models/`

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `sidecar/beat_detector.py` | **NEW** | madmom beat grid + downbeat detection |
| `sidecar/section_detector.py` | **NEW** | Stem-energy section detection |
| `sidecar/cue_detector.py` | **NEW** | Auto-cue placement from sections + stems |
| `sidecar/analyzer.py` | MODIFY | Orchestrate all 4 stages, replace genre heuristic |
| `sidecar/state.py` | MODIFY | Add new columns to analysis_cache |
| `sidecar/library.py` | MODIFY | Restructure /anlz to return rekordbox + mixmind side-by-side |
| `sidecar/requirements.txt` | MODIFY | Add madmom |
| `sidecar/tests/test_beat_detector.py` | **NEW** | Beat grid accuracy tests |
| `sidecar/tests/test_section_detector.py` | **NEW** | Section detection tests |
| `sidecar/tests/test_cue_detector.py` | **NEW** | Auto-cue placement tests |
| `frontend/src/types/track.ts` | MODIFY | Add MixMind analysis types, dual source |
| `frontend/src/components/DJWaveformView.tsx` | MODIFY | Source toggle, section overlays, auto-cue markers |
| `frontend/src/components/TrackTable.tsx` | MODIFY | RB/MM status dots |

## Performance Budget

| Stage | Time | Resource |
|-------|------|----------|
| Demucs stems | ~30s | CPU/MPS (already done) |
| madmom beats | ~10s | CPU |
| Sections | ~2s | CPU (uses cached stems) |
| Auto-cues | ~1s | CPU (uses beat grid + sections) |
| Genre (Discogs400) | ~5s | CPU |
| **Total per track** | **~50s** | Apple Silicon M1+ |

Batch: ~8000 tracks × 50s = ~111 hours. Recommend analyzing in background over multiple sessions. Progress persists across restarts.

## Success Criteria

- madmom beat grid accuracy > 95% on test set of 20 DJ tracks
- Downbeat detection correct on 90%+ of 4/4 electronic tracks
- Section boundaries within 1 bar of human-labeled ground truth
- Auto-cues land on musically meaningful points (not silence, not mid-phrase)
- Genre top-1 accuracy matches Beatport categorization for 80%+ of tracks
- Side-by-side RB/MM toggle works in waveform view
- TrackTable shows RB + MM analysis status dots
- All existing tests pass
- Frontend builds clean
