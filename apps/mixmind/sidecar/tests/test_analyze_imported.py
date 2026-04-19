"""End-to-end integration test: imported track -> analyze -> state.db populated.

Phase 21-02. Verifies that POST /api/library/analyze runs the full
Demucs + Essentia + madmom + cue_detector + section_detector pipeline on
tracks created by Plan 21-01's folder importer, and that every
MM-EXP-02-required field lands in `analysis_cache`:

    bpm / camelot / waveform_4stem / beat_grid_mm / sections_mm / auto_cues_mm

These tests are marked `slow` because each 10 s synthetic track takes
~20-60 s to analyse (htdemucs stem separation is the hot loop). Run the
faster part of the suite with `pytest -m "not slow"`.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Iterator

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from main import app
from state import StateDB

SAMPLE_RATE = 44100
BPM = 128
BEAT_INTERVAL_SEC = 60.0 / BPM     # ~0.46875 s
DURATION_SEC = 10                  # 10 s => ~21 beats


# ---------------------------------------------------------------------------
# Synthetic track generator
# ---------------------------------------------------------------------------

def _synth_track(path: Path) -> None:
    """Write a 10 s WAV: 440 Hz sine tone + 80 Hz kick at every beat (128 BPM).

    Intentionally simple; BPM and key should be trivially recoverable by
    essentia/madmom, but demucs may still produce weakly-populated stems.
    """
    n_samples = SAMPLE_RATE * DURATION_SEC
    t = np.linspace(0, DURATION_SEC, n_samples, endpoint=False, dtype=np.float64)
    # Musical tone at A4 (440 Hz) -- steady sine so essentia's KeyExtractor
    # converges fast.
    tone = 0.2 * np.sin(2 * np.pi * 440.0 * t)
    # Kick: 50 ms 80 Hz sine burst at every beat position.
    kick = np.zeros_like(t)
    kick_len = int(0.05 * SAMPLE_RATE)
    kick_env = np.linspace(1.0, 0.0, kick_len)          # quick decay
    kick_tone = np.sin(2 * np.pi * 80.0 * np.arange(kick_len) / SAMPLE_RATE)
    kick_sample = 0.9 * kick_env * kick_tone
    for beat_idx, beat_t in enumerate(np.arange(0.0, DURATION_SEC, BEAT_INTERVAL_SEC)):
        start = int(beat_t * SAMPLE_RATE)
        end = min(start + kick_len, n_samples)
        kick[start:end] += kick_sample[: end - start]
    audio = np.clip(tone + kick, -1.0, 1.0).astype(np.float32)
    sf.write(str(path), audio, SAMPLE_RATE)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_state_db(tmp_path, monkeypatch) -> Iterator[Path]:
    """Redirect StateDB() default path so we don't touch the real state.db."""
    db_path = tmp_path / "state.db"
    import state as state_module
    monkeypatch.setattr(state_module, "_DEFAULT_PATH", db_path)
    yield db_path


@pytest.fixture
def client(tmp_state_db) -> TestClient:
    return TestClient(app)


@pytest.fixture
def tmp_audio_folder(tmp_path) -> Path:
    folder = tmp_path / "music"
    folder.mkdir()
    for i in range(3):
        _synth_track(folder / f"track_{i:02d}.wav")
    return folder


def _wait_for_batch(client: TestClient, expected_total: int, timeout_sec: int = 600) -> dict:
    """Poll /api/analyze/status until the batch finishes or timeout expires."""
    deadline = time.time() + timeout_sec
    status: dict = {}
    while time.time() < deadline:
        status = client.get("/api/analyze/status").json()
        done = (status.get("analyzed", 0) + status.get("failed", 0)) >= expected_total
        if done and not status.get("in_progress", False):
            return status
        time.sleep(2)
    pytest.fail(f"Analysis timed out after {timeout_sec}s. Status: {status}")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_analyze_imported_populates_all_required_fields(
    tmp_audio_folder: Path, client: TestClient
) -> None:
    # 1. Import the synthetic folder
    r = client.post(
        "/api/library/import",
        json={"folder_path": str(tmp_audio_folder)},
    )
    assert r.status_code == 200, r.text
    assert r.json()["imported"] == 3

    # 2. Kick off analysis
    r = client.post("/api/library/analyze")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] in {"started", "already_running"}, body
    assert body.get("total") == 3 or body.get("progress", {}).get("total") == 3

    # 3. Wait for completion
    _wait_for_batch(client, expected_total=3, timeout_sec=600)

    # 4. Verify every MM-EXP-02 field landed in state.db for every track
    db = StateDB()
    try:
        imported = db.get_imported_tracks()
        assert len(imported) == 3
        for t in imported:
            row = db.get_analysis(t.content_id, "import")
            assert row is not None, f"no analysis row for {t.content_id}"
            assert row["status"] == "complete", (
                f"{t.content_id}: status={row['status']}, "
                f"err={row.get('error_message')}"
            )

            # BPM -- essentia RhythmExtractor2013 can half/double; accept
            # 128, 64, or 256 within +-10.
            assert row["bpm"], "bpm missing"
            bpm = float(row["bpm"])
            assert any(
                abs(bpm - candidate) <= 10
                for candidate in (BPM, BPM / 2, BPM * 2)
            ), f"BPM {bpm} not within +-10 of 128/64/256"

            # Camelot key (essentia KeyExtractor + camelot.musical_key_to_camelot)
            assert row["camelot"], "camelot missing"

            # 3-band waveform (drums/bass/vocals/other RMS via demucs)
            assert row["waveform_4stem"], "waveform_4stem missing"
            assert len(row["waveform_4stem"]) > 0

            # Beat grid (madmom RNNBeatProcessor + DBNBeatTrackingProcessor,
            # with downbeat labelling via DBNDownBeatTrackingProcessor or a
            # 4-on-the-floor fallback)
            assert row["beat_grid_mm"], "beat_grid_mm missing"

            # Auto cues (cue_detector.suggest_cues)
            assert row["auto_cues_mm"], "auto_cues_mm missing"

            # Sections (section_detector.detect_sections)
            assert row["sections_mm"], "sections_mm missing"
    finally:
        db.close()


@pytest.mark.slow
def test_analyze_imported_idempotent(
    tmp_audio_folder: Path, client: TestClient
) -> None:
    """Second /api/library/analyze after completion must not re-queue."""
    client.post(
        "/api/library/import",
        json={"folder_path": str(tmp_audio_folder)},
    )
    r1 = client.post("/api/library/analyze")
    assert r1.status_code == 200
    _wait_for_batch(client, expected_total=3, timeout_sec=600)

    # Re-trigger -- all rows are status='complete', so pending=0
    r2 = client.post("/api/library/analyze")
    assert r2.status_code == 200
    body = r2.json()
    # Either the runner says "all_analyzed" (fresh POST sees nothing to do)
    # or (if it raced us) it reports "started" with already_done=3.
    assert (
        body.get("status") == "all_analyzed"
        or body.get("already_done", 0) == 3
    ), body
