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
