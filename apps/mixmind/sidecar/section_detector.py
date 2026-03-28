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
