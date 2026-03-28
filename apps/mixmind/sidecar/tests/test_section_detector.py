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
