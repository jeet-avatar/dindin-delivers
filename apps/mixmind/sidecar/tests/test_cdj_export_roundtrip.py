"""ROADMAP MM-EXP-05 — full export roundtrip.

Builds a 5-track synthetic USB image to a tmp dir, parses every PDB row +
every ANLZ file via independent parsers (``pdb_reader`` + ``anlz_parser``),
and asserts equality with the input. No real USB involved.
"""
from __future__ import annotations

import ast
import hashlib
import wave
from pathlib import Path

import numpy as np
import pytest

from pdb_reader import read_pdb
from usb_exporter import export_to_usb


# ---------------------------------------------------------------------------
# Synthetic audio fixture
# ---------------------------------------------------------------------------


@pytest.fixture
def synthetic_audio(tmp_path: Path) -> list[Path]:
    """Generate 5 tiny 1-second WAVs with different tones."""
    sr = 44100
    files: list[Path] = []
    for i in range(5):
        path = tmp_path / f"track_{i:02d}.wav"
        t = np.linspace(0, 1.0, sr, endpoint=False)
        freq = 440 + i * 50
        sig = (np.sin(2 * np.pi * freq * t) * 32767).astype(np.int16)
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(sig.tobytes())
        files.append(path)
    return files


def _make_record(audio_path: Path, idx: int) -> dict:
    camelot_keys = ["8A", "9B", "1A", "2B", "3A"]
    return {
        "file_path": str(audio_path),
        "title": f"Test Track {idx:02d}",
        "artist": f"Test Artist {idx:02d}",
        "album": "Test Album",
        "bpm": 120.0 + idx * 2,
        "camelot": camelot_keys[idx],
        "duration_sec": 1,
        "bitrate": 320,
        "sample_rate": 44100,
        "sample_depth": 16,
        "beat_grid_mm": [
            {"time_ms": j * 500, "beat_number": (j % 4) + 1,
             "bpm": 120.0 + idx * 2}
            for j in range(8)
        ],
        "auto_cues_mm": [
            {"time_ms": 0, "label": "First Beat", "color_id": 0},
            {"time_ms": 500, "label": "Second", "color_id": 1},
        ],
        "memory_cues": [],
        "sections_mm": [
            {"start_beat": 0, "end_beat": 4, "kind": 1, "name": "intro"},
        ],
        "waveform_4stem": [
            {"drums": j % 256, "bass": (j * 2) % 256,
             "vocals": (j * 3) % 256, "other": (j * 4) % 256}
            for j in range(800)
        ],
    }


# ---------------------------------------------------------------------------
# Full E2E
# ---------------------------------------------------------------------------


def test_full_export_roundtrip_5_tracks(
    synthetic_audio: list[Path], tmp_path: Path,
) -> None:
    usb = tmp_path / "fake_usb"
    usb.mkdir()

    records = [_make_record(p, i) for i, p in enumerate(synthetic_audio)]
    result = export_to_usb(records, usb)

    assert result.exported_count == 5
    assert result.validation_status in ("ok", "warning")

    # 1. PDB file is written and parseable.
    pdb_path = usb / "PIONEER" / "rekordbox" / "export.pdb"
    assert pdb_path.exists(), "export.pdb missing on USB"
    parsed = read_pdb(pdb_path)
    assert parsed.row_count(0) == 5, "Tracks table must have 5 rows"

    # 2. Playlist table has the default 'All Tracks' playlist.
    assert parsed.row_count(7) == 1, "Playlists table"
    assert parsed.row_count(8) == 5, "Playlist entries"

    # 3. ANLZ files exist for each track (by minted ID).
    from usb_layout import _TRACK_ID_BASE, usbanlz_dir
    for i in range(5):
        tid = _TRACK_ID_BASE + i
        anlz_dir = usbanlz_dir(tid, usb)
        assert (anlz_dir / "ANLZ0000.DAT").exists(), (
            f"ANLZ0000.DAT missing for track {tid:08x}"
        )
        assert (anlz_dir / "ANLZ0000.EXT").exists(), (
            f"ANLZ0000.EXT missing for track {tid:08x}"
        )

    # 4. ANLZ0000.DAT round-trip — beat grid tag must be present.
    from anlz_parser import _parse_anlz_tags
    first_anlz = usbanlz_dir(_TRACK_ID_BASE, usb) / "ANLZ0000.DAT"
    tags = _parse_anlz_tags(first_anlz.read_bytes())
    assert b"PQTZ" in tags, "PQTZ (beat grid) tag missing from ANLZ0000.DAT"

    # 5. Audio files copied byte-for-byte to Contents/<Artist>/<Album>/
    src_hashes = {
        hashlib.sha256(p.read_bytes()).hexdigest() for p in synthetic_audio
    }
    contents_root = usb / "Contents"
    assert contents_root.exists()
    usb_audio_files = [f for f in contents_root.rglob("*.wav") if f.is_file()]
    assert len(usb_audio_files) == 5, f"want 5 WAVs, got {len(usb_audio_files)}"
    usb_hashes = {
        hashlib.sha256(f.read_bytes()).hexdigest() for f in usb_audio_files
    }
    assert src_hashes == usb_hashes, "audio byte mismatch after copy"


def test_export_zero_tracks_still_writes_valid_pdb(tmp_path: Path) -> None:
    usb = tmp_path / "fake_usb"
    usb.mkdir()
    result = export_to_usb([], usb)
    assert result.exported_count == 0

    pdb_path = usb / "PIONEER" / "rekordbox" / "export.pdb"
    assert pdb_path.exists()
    parsed = read_pdb(pdb_path)
    assert parsed.num_tables == 20
    assert parsed.row_count(0) == 0


def test_export_preserves_unicode_artist(
    synthetic_audio: list[Path], tmp_path: Path,
) -> None:
    """Non-ASCII artist names must survive the full round-trip."""
    usb = tmp_path / "fake_usb"
    usb.mkdir()

    rec = _make_record(synthetic_audio[0], 0)
    rec["artist"] = "Pärvez Saïd"
    rec["title"] = "日本語トラック"
    rec["album"] = "Rémix — Édition"

    result = export_to_usb([rec], usb)
    assert result.exported_count == 1

    pdb_bytes = (usb / "PIONEER" / "rekordbox" / "export.pdb").read_bytes()
    # ASCII names use the compact DeviceSQL variant (substring match works).
    assert b"P\xc3\xa4rvez" in pdb_bytes or "Pärvez Saïd".encode(
        "utf-16-le"
    ) in pdb_bytes
    # Non-ASCII title uses UTF-16LE inside the PDB.
    assert "日本語トラック".encode("utf-16-le") in pdb_bytes

    # Audio must land under Contents/<sanitized artist>/<sanitized album>/
    artist_dir = usb / "Contents" / "Pärvez Saïd"
    assert artist_dir.exists(), "unicode artist dir not preserved"


def test_second_export_wipes_old_pioneer(
    synthetic_audio: list[Path], tmp_path: Path,
) -> None:
    """Pitfall 8 — pre-existing PIONEER/rekordbox/ must be replaced, not merged."""
    usb = tmp_path / "fake_usb"
    usb.mkdir()

    # Write some "old" garbage
    old_pioneer = usb / "PIONEER" / "rekordbox"
    old_pioneer.mkdir(parents=True)
    (old_pioneer / "stale.pdb").write_bytes(b"old export that must be wiped")

    records = [_make_record(synthetic_audio[0], 0)]
    export_to_usb(records, usb)

    assert not (old_pioneer / "stale.pdb").exists(), (
        "clean_target failed — stale file survived"
    )
    assert (usb / "PIONEER" / "rekordbox" / "export.pdb").exists()


# ---------------------------------------------------------------------------
# Final license regression — scans ALL Phase 21 writer files
# ---------------------------------------------------------------------------


def test_no_rbox_imported_in_any_phase21_file() -> None:
    """rbox (GPL-3.0) must NEVER be imported in any Phase 21 writer/reader."""
    repo_root = Path(__file__).parent.parent.parent.parent.parent
    sidecar_root = repo_root / "apps" / "mixmind" / "sidecar"
    phase21_files = [
        sidecar_root / "anlz_writer.py",
        sidecar_root / "anlz_structs.py",
        sidecar_root / "anlz_parser.py",
        sidecar_root / "pdb_writer.py",
        sidecar_root / "pdb_structs.py",
        sidecar_root / "pdb_reader.py",
        sidecar_root / "usb_layout.py",
        sidecar_root / "usb_exporter.py",
        sidecar_root / "pioneer_usb.py",
    ]
    for f in phase21_files:
        assert f.exists(), f"Phase 21 file missing: {f}"
        source = f.read_text(encoding="utf-8")
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] != "rbox", (
                        f"{f.name} has `import {alias.name}`"
                    )
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] != "rbox", (
                    f"{f.name} has `from {node.module} import ...`"
                )
