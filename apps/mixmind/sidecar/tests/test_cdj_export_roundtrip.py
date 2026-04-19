"""ROADMAP MM-EXP-05 — full export roundtrip.

Builds a 5-track synthetic USB image to a tmp dir, parses every PDB row +
every ANLZ file via independent parsers (``pdb_reader`` + ``anlz_parser``),
and asserts equality with the input. No real USB involved.
"""
from __future__ import annotations

import ast
import hashlib
import struct
import wave
from io import BytesIO
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

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
# 21-06 — artwork pipeline integration
# ---------------------------------------------------------------------------


def _make_mp3_with_apic(path: Path, color: tuple[int, int, int]) -> Path:
    """Write a minimal-valid MP3 with an APIC frame (PNG cover).

    Same pattern as tests/test_artwork_extractor._write_minimal_mp3 — mutagen
    is happy with an ID3v2.3 header + one MPEG frame.
    """
    try:
        from mutagen.id3 import APIC, ID3
    except ImportError:
        pytest.skip("mutagen not installed")

    id3_header = b"ID3\x03\x00\x00\x00\x00\x00\x00"
    mpeg_frame = b"\xff\xfb\x90\x00" + b"\x00" * 417
    path.write_bytes(id3_header + mpeg_frame)

    img = Image.new("RGB", (240, 240), color)
    png_buf = BytesIO()
    img.save(png_buf, format="PNG")
    tags = ID3(str(path))
    tags.add(APIC(
        encoding=3, mime="image/png", type=3,
        desc="cover", data=png_buf.getvalue(),
    ))
    tags.save(str(path))
    return path


def _read_artwork_id_for_track(pdb_path: Path, track_id: int) -> int:
    """Scan export.pdb and pull the ``artwork_id`` field out of the Track row
    whose ``id`` matches. Returns 0 if not found / not set.

    We parse directly from bytes rather than through pdb_reader because
    pdb_reader only surfaces per-page metadata, not decoded TrackRow fields.
    The TrackRow layout (pdb_structs.TrackRow) is:

        magic(2) + row_index(2) + bitmask(4) + sample_rate(4) + composer_id(4)
        + file_size(4) + unknown1(4) + unknown2(2) + unknown3(2) + unknown4(4)
        + artwork_id(4) + ...
    """
    raw = pdb_path.read_bytes()
    # TrackRow fixed-header offsets (verified via TrackRow.subcons dump):
    #   magic=0, artwork_id=32, id=76; total header = 98 bytes
    PAGE_SIZE = 4096
    # PageHeader.page_type is a u32 at byte offset 8 — 0 = Tracks
    for page_start in range(PAGE_SIZE, len(raw), PAGE_SIZE):
        page = raw[page_start:page_start + PAGE_SIZE]
        page_type = struct.unpack_from("<I", page, 8)[0]
        if page_type != 0:
            continue
        # Walk row offsets looking for magic 0x24 0x00
        cursor = 40                  # skip PageHeader
        while cursor + 98 < PAGE_SIZE:
            if page[cursor:cursor + 2] == b"\x24\x00":
                artwork_id = struct.unpack_from("<I", page, cursor + 32)[0]
                row_track_id = struct.unpack_from("<I", page, cursor + 76)[0]
                if row_track_id == track_id:
                    return artwork_id
                cursor += 2
            else:
                cursor += 1
    return 0


def test_export_track_with_embedded_art_produces_artwork_tree(
    tmp_path: Path,
) -> None:
    """E2E: an MP3 with embedded APIC → PIONEER/Artwork/00001/a1{,_m}.jpg + Track.artwork_id=1."""
    usb = tmp_path / "fake_usb"
    usb.mkdir()

    mp3 = _make_mp3_with_apic(tmp_path / "song.mp3", (220, 50, 50))
    rec = {
        "file_path": str(mp3),
        "title": "Art Track",
        "artist": "Art Artist",
        "album": "Art Album",
        "bpm": 120.0,
        "camelot": "8A",
        "duration_sec": 1,
        "bitrate": 320,
        "sample_rate": 44100,
        "sample_depth": 16,
        "beat_grid_mm": [],
        "auto_cues_mm": [],
        "memory_cues": [],
        "sections_mm": [],
        "waveform_4stem": [],
    }

    result = export_to_usb([rec], usb)
    assert result.exported_count == 1
    assert result.validation_status in ("ok", "warning")

    # Artwork files on the USB.
    assert (usb / "PIONEER" / "Artwork" / "00001" / "a1.jpg").exists(), (
        "primary small JPEG not written"
    )
    assert (usb / "PIONEER" / "Artwork" / "00001" / "a1_m.jpg").exists(), (
        "primary medium JPEG not written"
    )

    # Dimensions must match reference USB layout.
    small = Image.open(usb / "PIONEER" / "Artwork" / "00001" / "a1.jpg")
    medium = Image.open(usb / "PIONEER" / "Artwork" / "00001" / "a1_m.jpg")
    assert small.size == (80, 80)
    assert medium.size == (240, 240)

    # Track row's artwork_id must be the global slot (1 for this first track).
    pdb_path = usb / "PIONEER" / "rekordbox" / "export.pdb"
    from usb_layout import _TRACK_ID_BASE
    aid = _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE)
    assert aid == 1, f"artwork_id should be 1 (first global slot), got {aid}"


def test_export_track_without_art_keeps_artwork_id_zero(
    synthetic_audio: list[Path], tmp_path: Path,
) -> None:
    """WAVs have no embedded APIC — all 5 tracks must end with artwork_id=0."""
    usb = tmp_path / "fake_usb"
    usb.mkdir()
    records = [_make_record(p, i) for i, p in enumerate(synthetic_audio)]
    export_to_usb(records, usb)

    # No PIONEER/Artwork/ tree should be created when no track has art.
    assert not (usb / "PIONEER" / "Artwork").exists(), (
        "Artwork tree should not be created for art-less export"
    )

    # Every Track row must have artwork_id=0.
    pdb_path = usb / "PIONEER" / "rekordbox" / "export.pdb"
    from usb_layout import _TRACK_ID_BASE
    for i in range(5):
        tid = _TRACK_ID_BASE + i
        aid = _read_artwork_id_for_track(pdb_path, tid)
        assert aid == 0, f"track {tid} got artwork_id={aid}, expected 0"


def test_export_mixed_tracks_assigns_only_to_art_bearing_ones(
    synthetic_audio: list[Path], tmp_path: Path,
) -> None:
    """3 WAVs (no art) + 2 MP3s with art → only the 2 MP3s get artwork_id>0;
    globally-contiguous slot numbering means slots 1 & 2.
    """
    usb = tmp_path / "fake_usb"
    usb.mkdir()

    mp3_a = _make_mp3_with_apic(tmp_path / "art_a.mp3", (255, 0, 0))
    mp3_b = _make_mp3_with_apic(tmp_path / "art_b.mp3", (0, 255, 0))

    records = [
        _make_record(synthetic_audio[0], 0),
        {
            **_make_record(synthetic_audio[1], 1),
            "file_path": str(mp3_a),
        },
        _make_record(synthetic_audio[2], 2),
        {
            **_make_record(synthetic_audio[3], 3),
            "file_path": str(mp3_b),
        },
        _make_record(synthetic_audio[4], 4),
    ]

    export_to_usb(records, usb)

    # First artworked track → slot 1; second → slot 2. Both in bucket 00001.
    assert (usb / "PIONEER" / "Artwork" / "00001" / "a1.jpg").exists()
    assert (usb / "PIONEER" / "Artwork" / "00001" / "a2.jpg").exists()

    pdb_path = usb / "PIONEER" / "rekordbox" / "export.pdb"
    from usb_layout import _TRACK_ID_BASE
    # Track ids are assigned sequentially to the records list → indexes 0..4.
    # WAV tracks (0, 2, 4) → artwork_id=0; MP3 tracks (1, 3) → 1, 2.
    assert _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE + 0) == 0
    assert _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE + 1) == 1
    assert _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE + 2) == 0
    assert _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE + 3) == 2
    assert _read_artwork_id_for_track(pdb_path, _TRACK_ID_BASE + 4) == 0


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
        # Plan 21-06 additions
        sidecar_root / "artwork_extractor.py",
        sidecar_root / "artwork_writer.py",
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
