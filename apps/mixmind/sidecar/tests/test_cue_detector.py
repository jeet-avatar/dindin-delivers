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
