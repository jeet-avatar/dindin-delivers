# tests/test_analyzer.py
import numpy as np
import pytest
from analyzer import stems_to_waveform


def test_stems_to_waveform_shape():
    stems = {
        "drums": np.random.rand(44100 * 10).astype(np.float32),
        "bass": np.random.rand(44100 * 10).astype(np.float32),
        "vocals": np.random.rand(44100 * 10).astype(np.float32),
        "other": np.random.rand(44100 * 10).astype(np.float32),
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=800)
    assert len(result) == 800
    assert set(result[0].keys()) == {"drums", "bass", "vocals", "other"}


def test_stems_to_waveform_range():
    stems = {
        "drums": np.ones(44100 * 5, dtype=np.float32) * 0.5,
        "bass": np.zeros(44100 * 5, dtype=np.float32),
        "vocals": np.ones(44100 * 5, dtype=np.float32),
        "other": np.ones(44100 * 5, dtype=np.float32) * 0.25,
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=100)
    for col in result:
        for stem_name in ["drums", "bass", "vocals", "other"]:
            assert 0 <= col[stem_name] <= 255


def test_stems_to_waveform_silent_stem():
    stems = {
        "drums": np.zeros(44100 * 5, dtype=np.float32),
        "bass": np.zeros(44100 * 5, dtype=np.float32),
        "vocals": np.zeros(44100 * 5, dtype=np.float32),
        "other": np.zeros(44100 * 5, dtype=np.float32),
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=50)
    for col in result:
        assert col["drums"] == 0
        assert col["vocals"] == 0
