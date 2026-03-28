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
