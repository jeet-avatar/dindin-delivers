# MixMind Pro Analysis Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-stage analysis pipeline (beat grid, sections, auto-cues, genre ML) that matches or exceeds Rekordbox quality, with side-by-side comparison UI.

**Architecture:** Four independent detector modules (beat_detector.py, section_detector.py, cue_detector.py, genre classifier) orchestrated by analyzer.py. Results stored in analysis_cache with `_mm` suffix columns. Frontend shows dual RB/MM columns with source toggle.

**Tech Stack:** madmom (beat/downbeat), Demucs stems (section energy), Essentia Discogs400 (genre), msgpack (storage), React canvas (waveform)

**Spec:** `docs/superpowers/specs/2026-03-28-mixmind-pro-analysis-engine-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `sidecar/beat_detector.py` | CREATE | madmom beat grid + downbeat detection |
| `sidecar/section_detector.py` | CREATE | Stem-energy section classification |
| `sidecar/cue_detector.py` | CREATE | Auto-cue placement from sections + stems |
| `sidecar/analyzer.py` | MODIFY | Orchestrate all 4 stages, store new fields |
| `sidecar/state.py` | MODIFY | Add _mm columns to analysis_cache |
| `sidecar/library.py` | MODIFY | Restructure /anlz → {rekordbox, mixmind} |
| `sidecar/requirements.txt` | MODIFY | Add madmom |
| `sidecar/tests/test_beat_detector.py` | CREATE | Beat grid unit tests |
| `sidecar/tests/test_section_detector.py` | CREATE | Section detection tests |
| `sidecar/tests/test_cue_detector.py` | CREATE | Auto-cue tests |
| `frontend/src/types/track.ts` | MODIFY | Dual-source types |
| `frontend/src/components/DJWaveformView.tsx` | MODIFY | Source toggle, section overlays, cue markers |
| `frontend/src/components/TrackTable.tsx` | MODIFY | RB/MM status dots |

---

## Chunk 1: Beat Grid (madmom) — Stage 1

### Task 1: Install madmom + extend DB schema

**Files:**
- Modify: `apps/mixmind/sidecar/requirements.txt`
- Modify: `apps/mixmind/sidecar/state.py`
- Test: `apps/mixmind/sidecar/tests/test_state.py`

- [ ] **Step 1: Add madmom to requirements**

Append to `requirements.txt`:
```
madmom>=0.16.1
```

- [ ] **Step 2: Write failing test for new DB columns**

Add to `tests/test_state.py`:
```python
def test_save_analysis_with_mm_fields(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    db.save_analysis(
        content_id="1", source="db", status="complete", file_path="/a.mp3",
        bpm=128.0, beat_grid_mm=b"\x01", sections_mm=b"\x02",
        auto_cues_mm=b"\x03", beat_confidence=0.95, bpm_stable=True,
        genre_confidence=0.87, sub_genres='["Deep House","Tech House"]',
    )
    row = db.get_analysis("1", "db")
    assert row["beat_grid_mm"] == b"\x01"
    assert row["sections_mm"] == b"\x02"
    assert row["auto_cues_mm"] == b"\x03"
    assert row["beat_confidence"] == 0.95
    assert row["bpm_stable"] == 1
    assert row["genre_confidence"] == 0.87
    assert row["sub_genres"] == '["Deep House","Tech House"]'
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pytest tests/test_state.py::test_save_analysis_with_mm_fields -v
```

- [ ] **Step 4: Add columns to analysis_cache in state.py**

In `_create_tables`, after the existing `analysis_cache` CREATE TABLE, add migration:
```python
# Migrate: add _mm columns if missing
for col, col_type in [
    ("beat_grid_mm", "BLOB"),
    ("sections_mm", "BLOB"),
    ("auto_cues_mm", "BLOB"),
    ("beat_confidence", "REAL"),
    ("bpm_stable", "INTEGER"),
    ("genre_confidence", "REAL"),
    ("sub_genres", "TEXT"),
]:
    try:
        conn.execute(text(f"ALTER TABLE analysis_cache ADD COLUMN {col} {col_type}"))
    except Exception:
        pass  # column already exists
```

Update `save_analysis` signature to accept the new fields and include them in the INSERT.

- [ ] **Step 5: Run test — expect PASS**

```bash
pytest tests/test_state.py -v -k "analysis"
```

- [ ] **Step 6: Install madmom**

```bash
pip install madmom>=0.16.1
python -c "import madmom; print('madmom OK')"
```

- [ ] **Step 7: Commit**

```bash
git add apps/mixmind/sidecar/requirements.txt apps/mixmind/sidecar/state.py apps/mixmind/sidecar/tests/test_state.py
git commit -m "feat(mixmind): add madmom dep + analysis_cache _mm columns for pro analysis"
```

---

### Task 2: Create `beat_detector.py`

**Files:**
- Create: `apps/mixmind/sidecar/beat_detector.py`
- Create: `apps/mixmind/sidecar/tests/test_beat_detector.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_beat_detector.py
import pytest
import numpy as np


def test_detect_beats_returns_dataclass():
    from beat_detector import detect_beats_from_audio, BeatGrid
    # Generate a simple click track: 120 BPM = click every 0.5s
    sr = 44100
    duration = 10  # seconds
    audio = np.zeros(sr * duration, dtype=np.float32)
    # Place clicks at 120 BPM intervals
    interval = int(sr * 0.5)  # 0.5s = 120 BPM
    for i in range(0, len(audio), interval):
        audio[i:i+100] = 0.8  # short click
    result = detect_beats_from_audio(audio, sr)
    assert isinstance(result, BeatGrid)
    assert result.avg_bpm > 0
    assert len(result.beats) > 0


def test_beat_grid_has_downbeats():
    from beat_detector import detect_beats_from_audio
    sr = 44100
    audio = np.zeros(sr * 10, dtype=np.float32)
    interval = int(sr * 0.5)
    for i in range(0, len(audio), interval):
        audio[i:i+100] = 0.8
    result = detect_beats_from_audio(audio, sr)
    beat_numbers = [b["beat_number"] for b in result.beats]
    assert 1 in beat_numbers  # downbeat detected


def test_beat_grid_bpm_in_range():
    from beat_detector import detect_beats_from_audio
    sr = 44100
    audio = np.zeros(sr * 10, dtype=np.float32)
    # 128 BPM = 60/128 = 0.46875s per beat
    interval = int(sr * 60 / 128)
    for i in range(0, len(audio), interval):
        audio[i:i+100] = 0.8
    result = detect_beats_from_audio(audio, sr)
    assert 120 < result.avg_bpm < 136  # within ~5% of 128


def test_bpm_stable_flag():
    from beat_detector import detect_beats_from_audio
    sr = 44100
    audio = np.zeros(sr * 10, dtype=np.float32)
    interval = int(sr * 0.5)
    for i in range(0, len(audio), interval):
        audio[i:i+100] = 0.8
    result = detect_beats_from_audio(audio, sr)
    assert isinstance(result.bpm_stable, bool)


def test_confidence_between_0_and_1():
    from beat_detector import detect_beats_from_audio
    sr = 44100
    audio = np.random.rand(sr * 5).astype(np.float32) * 0.1  # noise
    result = detect_beats_from_audio(audio, sr)
    assert 0.0 <= result.confidence <= 1.0
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pytest tests/test_beat_detector.py -v
```

- [ ] **Step 3: Implement `beat_detector.py`**

```python
"""
Beat grid detection using madmom.

Public API:
  detect_beats(file_path) -> BeatGrid
  detect_beats_from_audio(audio_array, sr) -> BeatGrid
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class BeatGrid:
    beats: list[dict]           # [{time_ms, beat_number (1-4), bpm}]
    first_beat_ms: float        # first downbeat (beat_number == 1)
    avg_bpm: float              # weighted average BPM
    bpm_stable: bool            # True if BPM varies < 0.5%
    bpm_changes: list[dict] = field(default_factory=list)  # [{time_ms, bpm}]
    confidence: float = 0.0     # 0.0-1.0
    meter: int = 4              # beats per bar


def _local_bpm(beat_times: np.ndarray, time_sec: float, window: int = 4) -> float:
    """Compute local BPM around a given time from beat positions."""
    idx = np.searchsorted(beat_times, time_sec)
    start = max(0, idx - window)
    end = min(len(beat_times), idx + window)
    if end - start < 2:
        return 0.0
    intervals = np.diff(beat_times[start:end])
    if len(intervals) == 0:
        return 0.0
    avg_interval = np.mean(intervals)
    return 60.0 / avg_interval if avg_interval > 0 else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return (sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5


def detect_beats_from_audio(audio: np.ndarray, sr: int = 44100) -> BeatGrid:
    """Detect beats from a numpy audio array using madmom."""
    import madmom

    # Ensure mono float32
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = audio.astype(np.float32)

    # Create a madmom Signal object from array
    signal = madmom.audio.signal.Signal(audio, sample_rate=sr, num_channels=1)

    # Beat activation (neural network)
    try:
        beat_proc = madmom.features.beats.RNNBeatProcessor()(signal)
        beat_tracker = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
        beat_times = beat_tracker(beat_proc)
    except Exception as e:
        logger.error("Beat tracking failed: %s", e)
        return BeatGrid(beats=[], first_beat_ms=0, avg_bpm=0, bpm_stable=False, confidence=0)

    if len(beat_times) < 2:
        return BeatGrid(beats=[], first_beat_ms=0, avg_bpm=0, bpm_stable=False, confidence=0)

    # Downbeat detection
    try:
        downbeat_proc = madmom.features.downbeats.RNNDownBeatProcessor()(signal)
        downbeat_tracker = madmom.features.downbeats.DBNDownBeatTrackingProcessor(
            beats_per_bar=[4, 3], fps=100
        )
        downbeats = downbeat_tracker(downbeat_proc)  # [(time, beat_number), ...]
    except Exception as e:
        logger.warning("Downbeat detection failed, using beat positions only: %s", e)
        # Fallback: assign beat numbers cyclically
        downbeats = [(t, (i % 4) + 1) for i, t in enumerate(beat_times)]

    # Build beat grid
    beats = []
    for time_sec, beat_num in downbeats:
        beats.append({
            "time_ms": round(float(time_sec) * 1000, 1),
            "beat_number": int(beat_num),
            "bpm": round(_local_bpm(beat_times, float(time_sec)), 2),
        })

    # BPM stats
    bpms = [b["bpm"] for b in beats if b["bpm"] > 0]
    avg_bpm = sum(bpms) / len(bpms) if bpms else 0
    bpm_std_val = _std(bpms)
    bpm_stable = bpm_std_val < (avg_bpm * 0.005) if avg_bpm > 0 else False

    # First downbeat
    first_beat = next((b for b in beats if b["beat_number"] == 1), beats[0] if beats else None)
    first_beat_ms = first_beat["time_ms"] if first_beat else 0

    # Confidence: based on beat activation strength
    try:
        confidence = float(np.mean(beat_proc[beat_proc > 0.3])) if len(beat_proc[beat_proc > 0.3]) > 0 else 0.5
        confidence = min(1.0, max(0.0, confidence))
    except Exception:
        confidence = 0.5

    return BeatGrid(
        beats=beats,
        first_beat_ms=first_beat_ms,
        avg_bpm=round(avg_bpm, 2),
        bpm_stable=bpm_stable,
        bpm_changes=[],
        confidence=round(confidence, 3),
        meter=4,
    )


def detect_beats(file_path: str) -> BeatGrid:
    """Detect beats from an audio file path."""
    import subprocess
    # Load via ffmpeg (same approach as analyzer.py)
    sr = 44100
    cmd = [
        "ffmpeg", "-i", file_path, "-f", "f32le", "-acodec", "pcm_f32le",
        "-ar", str(sr), "-ac", "1", "-v", "quiet", "-"
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr[:200]}")
    audio = np.frombuffer(proc.stdout, dtype=np.float32)
    return detect_beats_from_audio(audio, sr)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pytest tests/test_beat_detector.py -v
```

- [ ] **Step 5: Commit**

```bash
git add apps/mixmind/sidecar/beat_detector.py apps/mixmind/sidecar/tests/test_beat_detector.py
git commit -m "feat(mixmind): add beat_detector.py — madmom beat grid + downbeat detection"
```

---

## Chunk 2: Section + Cue Detection — Stages 2 & 3

### Task 3: Create `section_detector.py`

**Files:**
- Create: `apps/mixmind/sidecar/section_detector.py`
- Create: `apps/mixmind/sidecar/tests/test_section_detector.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_section_detector.py
import pytest
import numpy as np
from beat_detector import BeatGrid


def _make_beat_grid(bpm=128, duration_sec=180) -> BeatGrid:
    """Create a synthetic beat grid for testing."""
    interval_ms = 60000 / bpm
    beats = []
    t = 0.0
    beat_num = 1
    while t < duration_sec * 1000:
        beats.append({"time_ms": round(t, 1), "beat_number": beat_num, "bpm": bpm})
        t += interval_ms
        beat_num = (beat_num % 4) + 1
    return BeatGrid(beats=beats, first_beat_ms=0, avg_bpm=bpm, bpm_stable=True)


def test_detect_sections_returns_list():
    from section_detector import detect_sections
    # Simulate: 30s silence, 60s drums+bass, 30s breakdown, 60s full
    sr = 44100
    stems = {
        "drums": np.concatenate([
            np.zeros(sr * 30),          # intro: silence
            np.random.rand(sr * 60) * 0.8,  # main: drums
            np.zeros(sr * 30),          # breakdown: no drums
            np.random.rand(sr * 60) * 0.8,  # drop: drums back
        ]).astype(np.float32),
        "bass": np.random.rand(sr * 180).astype(np.float32) * 0.5,
        "vocals": np.concatenate([
            np.zeros(sr * 60),
            np.random.rand(sr * 60) * 0.4,
            np.random.rand(sr * 30) * 0.6,
            np.zeros(sr * 30),
        ]).astype(np.float32),
        "other": np.random.rand(sr * 180).astype(np.float32) * 0.3,
    }
    grid = _make_beat_grid(128, 180)
    sections = detect_sections(stems, grid, sr)
    assert isinstance(sections, list)
    assert len(sections) >= 2  # at least intro + something


def test_sections_have_required_fields():
    from section_detector import detect_sections
    sr = 44100
    dur = 60
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_beat_grid(128, dur)
    sections = detect_sections(stems, grid, sr)
    if sections:
        s = sections[0]
        assert "start_ms" in s
        assert "end_ms" in s
        assert "kind" in s
        assert "name" in s
        assert "color_hex" in s


def test_sections_dont_overlap():
    from section_detector import detect_sections
    sr = 44100
    dur = 120
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_beat_grid(128, dur)
    sections = detect_sections(stems, grid, sr)
    for i in range(len(sections) - 1):
        assert sections[i]["end_ms"] <= sections[i + 1]["start_ms"]


def test_sections_cover_full_track():
    from section_detector import detect_sections
    sr = 44100
    dur = 120
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_beat_grid(128, dur)
    sections = detect_sections(stems, grid, sr)
    if sections:
        assert sections[0]["start_ms"] == 0
        assert sections[-1]["end_ms"] >= (dur - 5) * 1000  # within 5s of end
```

- [ ] **Step 2: Implement `section_detector.py`**

```python
"""
Section detection using Demucs stem energy analysis.

Public API:
  detect_sections(stems, beat_grid, sr) -> list[dict]
"""
from __future__ import annotations

import logging
from enum import IntEnum

import numpy as np

from beat_detector import BeatGrid

logger = logging.getLogger(__name__)


class SectionKind(IntEnum):
    INTRO = 1
    BUILDUP = 2
    DROP = 3
    BREAKDOWN = 4
    OUTRO = 5
    VERSE = 6
    CHORUS = 7


SECTION_COLORS = {
    SectionKind.INTRO:     "#00B4FF",
    SectionKind.BUILDUP:   "#F5A623",
    SectionKind.DROP:      "#FF2D55",
    SectionKind.BREAKDOWN: "#7B68EE",
    SectionKind.OUTRO:     "#8E8E93",
    SectionKind.VERSE:     "#34C759",
    SectionKind.CHORUS:    "#FF9500",
}

SECTION_NAMES = {k: k.name.lower() for k in SectionKind}


def _stem_energy_curve(audio: np.ndarray, sr: int, window_ms: int = 500) -> np.ndarray:
    """Compute RMS energy curve for a stem in fixed-size windows."""
    window_samples = int(sr * window_ms / 1000)
    n_windows = max(1, len(audio) // window_samples)
    energies = np.zeros(n_windows, dtype=np.float32)
    for i in range(n_windows):
        chunk = audio[i * window_samples:(i + 1) * window_samples]
        energies[i] = float(np.sqrt(np.mean(chunk ** 2))) if len(chunk) > 0 else 0.0
    # Normalize to 0-1
    mx = energies.max()
    if mx > 0:
        energies /= mx
    return energies


def _find_boundaries(total_energy: np.ndarray, min_windows: int = 16) -> list[int]:
    """Find section boundaries using energy novelty (first derivative peaks)."""
    if len(total_energy) < min_windows * 2:
        return [0, len(total_energy)]

    # Smooth energy
    kernel = np.ones(8) / 8
    smoothed = np.convolve(total_energy, kernel, mode="same")

    # Novelty = absolute change
    novelty = np.abs(np.diff(smoothed))

    # Find peaks above threshold
    threshold = np.mean(novelty) + np.std(novelty) * 0.8
    peaks = []
    for i in range(1, len(novelty) - 1):
        if novelty[i] > threshold and novelty[i] > novelty[i - 1] and novelty[i] > novelty[i + 1]:
            # Enforce minimum distance
            if not peaks or (i - peaks[-1]) >= min_windows:
                peaks.append(i)

    boundaries = [0] + peaks + [len(total_energy)]
    return sorted(set(boundaries))


def _snap_to_downbeat(time_ms: float, beat_grid: BeatGrid) -> float:
    """Snap a time to the nearest downbeat (beat 1)."""
    downbeats = [b["time_ms"] for b in beat_grid.beats if b["beat_number"] == 1]
    if not downbeats:
        return time_ms
    closest = min(downbeats, key=lambda d: abs(d - time_ms))
    return closest


def _classify_section(
    drums_energy: float, vocals_energy: float, total_energy: float,
    is_first: bool, is_last: bool,
) -> SectionKind:
    """Classify a section by its stem energy profile."""
    if is_first and total_energy < 0.3:
        return SectionKind.INTRO
    if is_last and total_energy < 0.3:
        return SectionKind.OUTRO
    if drums_energy < 0.15 and vocals_energy > 0.2:
        return SectionKind.BREAKDOWN
    if drums_energy > 0.5 and total_energy > 0.6:
        return SectionKind.DROP
    if total_energy > 0.35 and drums_energy > 0.25:
        if vocals_energy > 0.3:
            return SectionKind.CHORUS
        return SectionKind.BUILDUP
    if vocals_energy > 0.2:
        return SectionKind.VERSE
    if is_first:
        return SectionKind.INTRO
    if is_last:
        return SectionKind.OUTRO
    return SectionKind.VERSE


def detect_sections(stems: dict[str, np.ndarray], beat_grid: BeatGrid, sr: int = 44100) -> list[dict]:
    """Detect song sections from Demucs stems + beat grid."""
    window_ms = 500

    drum_e  = _stem_energy_curve(stems["drums"], sr, window_ms)
    bass_e  = _stem_energy_curve(stems["bass"], sr, window_ms)
    vocal_e = _stem_energy_curve(stems["vocals"], sr, window_ms)
    other_e = _stem_energy_curve(stems["other"], sr, window_ms)

    # Ensure all same length
    min_len = min(len(drum_e), len(bass_e), len(vocal_e), len(other_e))
    drum_e, bass_e, vocal_e, other_e = drum_e[:min_len], bass_e[:min_len], vocal_e[:min_len], other_e[:min_len]

    total_e = drum_e + bass_e + vocal_e + other_e
    # Normalize total
    mx = total_e.max()
    if mx > 0:
        total_e /= mx

    # Find boundaries (in window indices)
    boundaries_idx = _find_boundaries(total_e, min_windows=16)

    # Convert to ms and snap to downbeats
    boundaries_ms = [idx * window_ms for idx in boundaries_idx]
    duration_ms = min_len * window_ms
    boundaries_ms[-1] = duration_ms  # last boundary = end of track

    if beat_grid.beats:
        boundaries_ms = [
            _snap_to_downbeat(ms, beat_grid) if 0 < ms < duration_ms else ms
            for ms in boundaries_ms
        ]

    # Classify each segment
    sections = []
    for i in range(len(boundaries_ms) - 1):
        start_ms = boundaries_ms[i]
        end_ms = boundaries_ms[i + 1]
        if end_ms <= start_ms:
            continue

        # Get mean energies for this segment
        start_idx = int(start_ms / window_ms)
        end_idx = min(int(end_ms / window_ms), min_len)
        if end_idx <= start_idx:
            continue

        d_mean = float(drum_e[start_idx:end_idx].mean())
        v_mean = float(vocal_e[start_idx:end_idx].mean())
        t_mean = float(total_e[start_idx:end_idx].mean())

        kind = _classify_section(d_mean, v_mean, t_mean,
                                 is_first=(i == 0),
                                 is_last=(i == len(boundaries_ms) - 2))
        sections.append({
            "start_ms": round(start_ms, 1),
            "end_ms": round(end_ms, 1),
            "kind": int(kind),
            "name": SECTION_NAMES[kind],
            "color_hex": SECTION_COLORS[kind],
        })

    return sections
```

- [ ] **Step 3: Run tests**

```bash
pytest tests/test_section_detector.py -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/mixmind/sidecar/section_detector.py apps/mixmind/sidecar/tests/test_section_detector.py
git commit -m "feat(mixmind): add section_detector.py — stem-energy section classification"
```

---

### Task 4: Create `cue_detector.py`

**Files:**
- Create: `apps/mixmind/sidecar/cue_detector.py`
- Create: `apps/mixmind/sidecar/tests/test_cue_detector.py`

- [ ] **Step 1: Write failing tests**

```python
# tests/test_cue_detector.py
import pytest
import numpy as np
from beat_detector import BeatGrid


def _make_grid(bpm=128, dur=180):
    interval_ms = 60000 / bpm
    beats = []
    t, bn = 0.0, 1
    while t < dur * 1000:
        beats.append({"time_ms": round(t, 1), "beat_number": bn, "bpm": bpm})
        t += interval_ms
        bn = (bn % 4) + 1
    return BeatGrid(beats=beats, first_beat_ms=0, avg_bpm=bpm, bpm_stable=True)


def test_suggest_cues_returns_list():
    from cue_detector import suggest_cues
    sr = 44100
    dur = 120
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_grid(128, dur)
    sections = [
        {"start_ms": 0, "end_ms": 15000, "kind": 1, "name": "intro", "color_hex": "#00B4FF"},
        {"start_ms": 15000, "end_ms": 60000, "kind": 3, "name": "drop", "color_hex": "#FF2D55"},
        {"start_ms": 60000, "end_ms": 90000, "kind": 4, "name": "breakdown", "color_hex": "#7B68EE"},
        {"start_ms": 90000, "end_ms": 120000, "kind": 5, "name": "outro", "color_hex": "#8E8E93"},
    ]
    cues = suggest_cues(stems, grid, sections, sr)
    assert isinstance(cues, list)
    assert len(cues) <= 8


def test_cues_have_required_fields():
    from cue_detector import suggest_cues
    sr = 44100
    dur = 60
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_grid(128, dur)
    sections = [{"start_ms": 0, "end_ms": 60000, "kind": 3, "name": "drop", "color_hex": "#FF2D55"}]
    cues = suggest_cues(stems, grid, sections, sr)
    if cues:
        c = cues[0]
        assert "slot" in c
        assert "time_ms" in c
        assert "label" in c
        assert "color_hex" in c
        assert "reason" in c


def test_cues_unique_slots():
    from cue_detector import suggest_cues
    sr = 44100
    dur = 120
    stems = {k: np.random.rand(sr * dur).astype(np.float32) * 0.5 for k in ["drums", "bass", "vocals", "other"]}
    grid = _make_grid(128, dur)
    sections = [
        {"start_ms": 0, "end_ms": 30000, "kind": 1, "name": "intro", "color_hex": "#00B4FF"},
        {"start_ms": 30000, "end_ms": 120000, "kind": 3, "name": "drop", "color_hex": "#FF2D55"},
    ]
    cues = suggest_cues(stems, grid, sections, sr)
    slots = [c["slot"] for c in cues]
    assert len(slots) == len(set(slots))  # no duplicates
```

- [ ] **Step 2: Implement `cue_detector.py`**

```python
"""
Auto-cue point detection from stems + sections + beat grid.

Public API:
  suggest_cues(stems, beat_grid, sections, sr) -> list[dict]
"""
from __future__ import annotations

import logging

import numpy as np

from beat_detector import BeatGrid

logger = logging.getLogger(__name__)

# Cue slot definitions
CUE_SLOTS = [
    {"slot": "A", "label": "First Kick",  "color_hex": "#FF2D55"},
    {"slot": "B", "label": "Vocal In",    "color_hex": "#00E5FF"},
    {"slot": "C", "label": "Build",       "color_hex": "#F5A623"},
    {"slot": "D", "label": "Drop",        "color_hex": "#FF3D00"},
    {"slot": "E", "label": "Breakdown",   "color_hex": "#7B68EE"},
    {"slot": "F", "label": "Drop 2",      "color_hex": "#FF3D00"},
    {"slot": "G", "label": "Outro",       "color_hex": "#8E8E93"},
    {"slot": "H", "label": "Last Beat",   "color_hex": "#FFD600"},
]


def _first_transient(audio: np.ndarray, sr: int, threshold: float = 0.15) -> float | None:
    """Find the first significant transient in ms."""
    window = int(sr * 0.01)  # 10ms windows
    for i in range(0, len(audio) - window, window):
        rms = float(np.sqrt(np.mean(audio[i:i + window] ** 2)))
        if rms > threshold:
            return (i / sr) * 1000  # ms
    return None


def _first_sustained_energy(audio: np.ndarray, sr: int, min_duration_ms: float = 500, threshold: float = 0.1) -> float | None:
    """Find the first sustained energy region (not just a transient)."""
    window = int(sr * 0.05)  # 50ms windows
    min_windows = int(min_duration_ms / 50)
    count = 0
    start_ms = None
    for i in range(0, len(audio) - window, window):
        rms = float(np.sqrt(np.mean(audio[i:i + window] ** 2)))
        if rms > threshold:
            if count == 0:
                start_ms = (i / sr) * 1000
            count += 1
            if count >= min_windows:
                return start_ms
        else:
            count = 0
            start_ms = None
    return None


def _snap_to_beat(time_ms: float, beat_grid: BeatGrid) -> float:
    """Snap a time to the nearest beat."""
    if not beat_grid.beats:
        return time_ms
    closest = min(beat_grid.beats, key=lambda b: abs(b["time_ms"] - time_ms))
    return closest["time_ms"]


def suggest_cues(
    stems: dict[str, np.ndarray],
    beat_grid: BeatGrid,
    sections: list[dict],
    sr: int = 44100,
) -> list[dict]:
    """Suggest up to 8 hot cue points based on stems, beat grid, and sections."""
    cues: list[dict] = []
    used_slots: set[str] = set()

    def _add(slot: str, time_ms: float, reason: str):
        if slot in used_slots or time_ms is None:
            return
        info = next(s for s in CUE_SLOTS if s["slot"] == slot)
        cues.append({
            "slot": slot,
            "time_ms": round(_snap_to_beat(time_ms, beat_grid), 1),
            "label": info["label"],
            "color_hex": info["color_hex"],
            "reason": reason,
        })
        used_slots.add(slot)

    # A: First Kick — first drum transient
    drum_onset = _first_transient(stems["drums"], sr, threshold=0.15)
    if drum_onset is not None:
        _add("A", drum_onset, "First drum hit")

    # B: First Vocal — first sustained vocal energy
    vocal_onset = _first_sustained_energy(stems["vocals"], sr, min_duration_ms=500)
    if vocal_onset is not None:
        _add("B", vocal_onset, "First vocal entry")

    # C-G from sections
    drops_found = 0
    for section in sections:
        name = section["name"]
        start = section["start_ms"]
        if name == "buildup" and "C" not in used_slots:
            _add("C", start, "Buildup start")
        elif name == "drop":
            if drops_found == 0 and "D" not in used_slots:
                _add("D", start, "Main drop")
                drops_found += 1
            elif drops_found == 1 and "F" not in used_slots:
                _add("F", start, "Second drop")
                drops_found += 1
        elif name == "breakdown" and "E" not in used_slots:
            _add("E", start, "Breakdown start")
        elif name == "outro" and "G" not in used_slots:
            _add("G", start, "Outro start")

    # H: Last Beat
    if beat_grid.beats:
        _add("H", beat_grid.beats[-1]["time_ms"], "Final beat")

    return cues[:8]
```

- [ ] **Step 3: Run tests**

```bash
pytest tests/test_cue_detector.py -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/mixmind/sidecar/cue_detector.py apps/mixmind/sidecar/tests/test_cue_detector.py
git commit -m "feat(mixmind): add cue_detector.py — auto-cue placement from stems + sections"
```

---

## Chunk 3: Orchestration + Genre + API

### Task 5: Wire all 4 stages into `analyzer.py`

**Files:**
- Modify: `apps/mixmind/sidecar/analyzer.py`

- [ ] **Step 1: Add imports and new stages to `analyze_track`**

After Demucs + Essentia stages, add:

```python
# Stage 3: Beat grid (madmom)
beat_grid_data = None
beat_grid_blob = None
beat_confidence = None
bpm_stable_flag = None
try:
    from beat_detector import detect_beats
    bg = detect_beats(file_path)
    beat_grid_data = bg
    import msgpack
    beat_grid_blob = msgpack.packb(bg.beats, use_bin_type=True)
    beat_confidence = bg.confidence
    bpm_stable_flag = 1 if bg.bpm_stable else 0
    # Use madmom BPM if Essentia didn't get it
    if not essentia_result.get("bpm") and bg.avg_bpm > 0:
        essentia_result["bpm"] = bg.avg_bpm
except Exception as e:
    logger.error("Beat detection failed for %s: %s", content_id, e)

# Stage 4: Sections (needs stems + beat grid)
sections_blob = None
try:
    if demucs_ok and beat_grid_data:
        from section_detector import detect_sections
        sections = detect_sections(stems, beat_grid_data, sr=44100)
        import msgpack
        sections_blob = msgpack.packb(sections, use_bin_type=True)
except Exception as e:
    logger.error("Section detection failed for %s: %s", content_id, e)

# Stage 5: Auto-cues (needs stems + beat grid + sections)
auto_cues_blob = None
try:
    if demucs_ok and beat_grid_data and sections_blob:
        from cue_detector import suggest_cues
        auto_cues = suggest_cues(stems, beat_grid_data, sections, sr=44100)
        import msgpack
        auto_cues_blob = msgpack.packb(auto_cues, use_bin_type=True)
except Exception as e:
    logger.error("Auto-cue detection failed for %s: %s", content_id, e)
```

Then update `db.save_analysis()` call to include:
```python
beat_grid_mm=beat_grid_blob,
sections_mm=sections_blob,
auto_cues_mm=auto_cues_blob,
beat_confidence=beat_confidence,
bpm_stable=bpm_stable_flag,
genre_confidence=essentia_result.get("genre_confidence"),
sub_genres=json.dumps(essentia_result.get("sub_genres", [])),
```

Also replace `_classify_genre` heuristic with real Essentia model (graceful fallback if models not downloaded).

- [ ] **Step 2: Commit**

```bash
git add apps/mixmind/sidecar/analyzer.py
git commit -m "feat(mixmind): wire 4-stage analysis — beat grid + sections + auto-cues + genre"
```

---

### Task 6: Restructure `/api/tracks/{id}/anlz` for dual source

**Files:**
- Modify: `apps/mixmind/sidecar/library.py`

- [ ] **Step 1: Restructure response to `{rekordbox, mixmind}`**

The `/anlz` endpoint currently returns a flat dict. Change to:

```python
{
    "rekordbox": {
        "beat_grid": [...],
        "bpm": 128.0,
        "sections": [...],
        "hot_cues": [...],
        "memory_cues": [...],
        "waveform_preview": [...],
        "waveform_3band": [...],
    },
    "mixmind": {
        "beat_grid": [...],      # from beat_grid_mm
        "bpm": 128.3,
        "bpm_stable": true,
        "beat_confidence": 0.94,
        "sections": [...],       # from sections_mm
        "auto_cues": [...],      # from auto_cues_mm
        "waveform_4stem": [...],
        "essentia": {...},
    },
    "active_source": "auto"
}
```

When Rekordbox ANLZ is absent, `rekordbox` is `null`. When MixMind analysis is absent, `mixmind` is `null`. The frontend decides what to display based on `active_source`.

- [ ] **Step 2: Commit**

```bash
git add apps/mixmind/sidecar/library.py
git commit -m "feat(mixmind): restructure /anlz to dual-source {rekordbox, mixmind} response"
```

---

## Chunk 4: Frontend — Dual Source UI

### Task 7: Update TypeScript types

**Files:**
- Modify: `apps/mixmind/frontend/src/types/track.ts`

- [ ] **Step 1: Add dual-source types**

```typescript
// MixMind's own analysis result
export interface MixMindAnalysis {
  beat_grid: BeatGridEntry[];
  bpm: number;
  bpm_stable: boolean;
  beat_confidence: number;
  sections: SectionEntry[];
  auto_cues: AutoCueEntry[];
  waveform_4stem: Waveform4Stem[] | null;
  essentia: EssentiaResult | null;
}

export interface AutoCueEntry {
  slot: string;      // 'A'-'H'
  time_ms: number;
  label: string;
  color_hex: string;
  reason: string;
}

// Dual-source ANLZ response
export interface DualAnlzData {
  rekordbox: TrackAnlzData | null;
  mixmind: MixMindAnalysis | null;
  active_source: 'rekordbox' | 'mixmind' | 'auto';
}
```

- [ ] **Step 2: Build check**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/frontend/src/types/track.ts
git commit -m "feat(mixmind): add DualAnlzData + MixMindAnalysis + AutoCueEntry types"
```

---

### Task 8: Add source toggle + RB/MM status dots

**Files:**
- Modify: `apps/mixmind/frontend/src/components/DJWaveformView.tsx`
- Modify: `apps/mixmind/frontend/src/components/TrackTable.tsx`

- [ ] **Step 1: Add source toggle to DJWaveformView**

Add a 3-button toggle `[RB] [MM] [Auto]` in the waveform header. When toggled:
- RB: render Rekordbox beat grid, sections, cues, 3-band waveform
- MM: render MixMind beat grid, sections, auto-cues, 4-stem waveform
- Auto: use MixMind if analyzed, else Rekordbox

- [ ] **Step 2: Add RB/MM status dots to TrackTable**

Two 8px dots in the actions area:
- Green dot = Rekordbox analyzed (has beat_grid from ANLZ)
- Purple dot = MixMind analyzed (has beat_grid_mm in analysis_cache)
- Gray dot = not analyzed

- [ ] **Step 3: Build + commit**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit && npm run build
git add apps/mixmind/frontend/src/components/DJWaveformView.tsx apps/mixmind/frontend/src/components/TrackTable.tsx
git commit -m "feat(mixmind): add RB/MM source toggle + analysis status dots"
```

---

### Task 9: Integration test + DMG rebuild

- [ ] **Step 1: Run all backend tests**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pytest tests/ -v
```

- [ ] **Step 2: Run frontend build**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Smoke test — analyze a track with all 4 stages**

```bash
uvicorn main:app --port 7175 &
sleep 2
curl -s -X POST "http://localhost:7175/api/tracks/268425853/analyze?force=true" | python3 -m json.tool
kill %1
```

Verify response has: `beat_grid`, `sections`, `auto_cues`, `essentia.genre`.

- [ ] **Step 4: Rebuild DMG**

```bash
./apps/mixmind/rebuild-electron.sh
```

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat(mixmind): complete Pro Analysis Engine — beat grid, sections, auto-cues, genre ML"
```

---

## Summary

| Task | What | New Files | Tests |
|------|------|-----------|-------|
| 1 | madmom dep + DB columns | — | 1 |
| 2 | beat_detector.py | beat_detector.py | 5 |
| 3 | section_detector.py | section_detector.py | 4 |
| 4 | cue_detector.py | cue_detector.py | 3 |
| 5 | Wire 4 stages in analyzer.py | — | — |
| 6 | Dual-source /anlz API | — | — |
| 7 | TypeScript types | — | tsc |
| 8 | Source toggle + status dots | — | build |
| 9 | Integration + DMG | — | full suite |

**Execution order:** Tasks 1-4 are independent backend modules. Task 5 wires them together. Tasks 6-8 are frontend. Task 9 integrates everything.
