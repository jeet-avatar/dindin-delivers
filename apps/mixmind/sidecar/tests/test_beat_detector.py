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
