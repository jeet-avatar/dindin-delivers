"""Unit tests for anlz_writer's internal tag builders."""
from __future__ import annotations

from pathlib import Path

import pytest

from anlz_structs import (
    AnlzFileHeader,
    PCO2Body,
    PCOBBody,
    PQTZBody,
    PSSIBody,
    PWAVBody,
    PWV3Body,
)
from anlz_writer import (
    BeatEntry,
    CueEntry,
    SectionEntry,
    Waveform3Band,
    _cue_pco2_dict,
    _cue_pcob_dict,
    write_2ex,
    write_dat,
    write_ext,
)


# ---------------------------------------------------------------------------
# File envelope
# ---------------------------------------------------------------------------


def test_header_magic_and_length(tmp_path: Path) -> None:
    """Every .DAT starts with PMAI and header.len_file matches actual size."""
    out = tmp_path / "ANLZ0000.DAT"
    write_dat(
        out,
        beats=[BeatEntry(0, 1, 120.0)],
        memory_cues=[],
        hot_cues=[],
        waveform_preview=b"\x00" * 400,
    )
    data = out.read_bytes()
    assert data[:4] == b"PMAI"
    header = AnlzFileHeader.parse(data[:28])
    assert header.len_file == len(data)


def test_ext_header_magic(tmp_path: Path) -> None:
    out = tmp_path / "ANLZ0000.EXT"
    wf = [Waveform3Band(0, 0, 0, 0)] * 100
    write_ext(out, wf)
    data = out.read_bytes()
    assert data[:4] == b"PMAI"


def test_2ex_header_magic(tmp_path: Path) -> None:
    out = tmp_path / "ANLZ0000.2EX"
    wf = [Waveform3Band(0, 0, 0, 0)] * 100
    write_2ex(out, wf, file_path="/Contents/test.aiff")
    data = out.read_bytes()
    assert data[:4] == b"PMAI"
    assert len(data) >= 28   # at least the file header


# ---------------------------------------------------------------------------
# PQTZ beat grid
# ---------------------------------------------------------------------------


def test_pqtz_beat_roundtrip() -> None:
    """16 beats at 128 BPM encode and decode losslessly."""
    beats_in = [
        BeatEntry(time_ms=i * 500, beat_number=(i % 4) + 1, bpm=128.0)
        for i in range(16)
    ]
    body = PQTZBody.build({
        "entry_count": len(beats_in),
        "entries": [
            {"beat": b.beat_number, "tempo": int(b.bpm * 100), "time_ms": b.time_ms}
            for b in beats_in
        ],
    })
    parsed = PQTZBody.parse(body)
    assert parsed.entry_count == 16
    assert parsed.entries[0].beat == 1
    assert parsed.entries[0].tempo == 12800
    for i in range(0, 16, 4):
        assert parsed.entries[i].beat == 1, f"downbeat missed at index {i}"


def test_pqtz_bpm_tempo_encoding() -> None:
    """BPM × 100 Int16ub encoding matches reference convention."""
    beats = [BeatEntry(0, 1, 117.99)]
    body = PQTZBody.build({
        "entry_count": 1,
        "entries": [
            {"beat": b.beat_number, "tempo": int(round(b.bpm * 100)), "time_ms": b.time_ms}
            for b in beats
        ],
    })
    parsed = PQTZBody.parse(body)
    # 117.99 × 100 = 11799 = 0x2E17 — matches real reference track 00000019
    assert parsed.entries[0].tempo == 11799


# ---------------------------------------------------------------------------
# PCOB / PCO2 cue lists
# ---------------------------------------------------------------------------


def test_pcob_empty_matches_reference() -> None:
    """An empty PCOB body matches the exact reference pattern byte-for-byte."""
    body = PCOBBody.build(_cue_pcob_dict([], cue_type=1))
    # Reference byte pattern (from /Volumes/Untitled/P001/00000019/.../ANLZ0000.DAT tail):
    #   50434f42 00000018 00000018 00000001 00000000 ffffffff
    # Body portion (past the 12-byte envelope) is:
    #   00000001 00000000 ffffffff
    assert body == bytes.fromhex("000000010000" + "0000" + "ffffffff")


def test_pcob_one_hot_cue_roundtrip() -> None:
    cues = [CueEntry(time_ms=5000, slot="A", label="Kick", color_id=0)]
    body = PCOBBody.build(_cue_pcob_dict(cues, cue_type=1))
    parsed = PCOBBody.parse(body)
    assert parsed.count == 1
    assert parsed.entries[0].hot_cue == 1
    assert parsed.entries[0].time_ms == 5000


def test_pco2_empty_matches_reference() -> None:
    """An empty PCO2 body matches the reference exactly: `0000000100000000`."""
    body = PCO2Body.build(_cue_pco2_dict([], cue_type=1))
    assert body == bytes.fromhex("00000001 0000 0000".replace(" ", ""))


def test_pco2_hot_cue_label_utf16() -> None:
    cues = [CueEntry(time_ms=5000, slot="A", label="First Kick", color_id=0)]
    body = PCO2Body.build(_cue_pco2_dict(cues, cue_type=1))
    parsed = PCO2Body.parse(body)
    assert parsed.count == 1
    entry = parsed.entries[0]
    assert entry.time_ms == 5000
    assert entry.hot_cue == 1
    # Comment bytes include UTF-16 BE "First Kick" + trailing NUL (2 bytes).
    expected_comment = "First Kick".encode("utf-16-be") + b"\x00\x00"
    assert bytes(entry.comment) == expected_comment


def test_pco2_memory_cue_slot_is_zero() -> None:
    """Memory cues (slot=None) serialize as hot_cue=0."""
    cues = [CueEntry(time_ms=1000, slot=None, label="Intro", color_id=0)]
    body = PCO2Body.build(_cue_pco2_dict(cues, cue_type=0))
    parsed = PCO2Body.parse(body)
    assert parsed.entries[0].hot_cue == 0


# ---------------------------------------------------------------------------
# Waveform tags
# ---------------------------------------------------------------------------


def test_pwav_preview_400_bytes(tmp_path: Path) -> None:
    """PWAV in reference uses 400 amplitude bytes (not 800)."""
    out = tmp_path / "ANLZ0000.DAT"
    write_dat(
        out,
        beats=[BeatEntry(0, 1, 120.0)],
        memory_cues=[],
        hot_cues=[],
        waveform_preview=b"\x10" * 400,
    )
    data = out.read_bytes()
    # Walk tags until we find PWAV
    import struct
    off = struct.unpack(">I", data[4:8])[0]
    pwav_found = False
    while off < len(data) - 8:
        magic = data[off : off + 4]
        tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        if magic == b"PWAV":
            pwav_found = True
            # body starts at off + 20 (len_header)
            pwav_body = data[off + 12 : off + tag_len]
            parsed = PWAVBody.parse(pwav_body)
            assert parsed.len_preview == 400
            assert bytes(parsed.data) == b"\x10" * 400
            break
        off += tag_len
    assert pwav_found


def test_pwv3_one_byte_per_column(tmp_path: Path) -> None:
    """PWV3 stores exactly 1 byte per column (mono detail)."""
    out = tmp_path / "ANLZ0000.EXT"
    wf = [Waveform3Band(drums=64, bass=64, vocals=64, other=64)] * 100
    write_ext(out, wf)
    data = out.read_bytes()
    assert data[:4] == b"PMAI"

    import struct
    off = struct.unpack(">I", data[4:8])[0]
    while off < len(data) - 8:
        magic = data[off : off + 4]
        tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        if magic == b"PWV3":
            body = data[off + 12 : off + tag_len]
            parsed = PWV3Body.parse(body)
            assert parsed.len_entry_bytes == 1
            assert parsed.len_entries == 100
            assert len(bytes(parsed.data)) == 100
            return
        off += tag_len
    pytest.fail("PWV3 not found in .EXT")


def test_pwv5_two_bytes_per_column(tmp_path: Path) -> None:
    """PWV5 stores 2 bytes per column (packed RGB15 for color detail)."""
    out = tmp_path / "ANLZ0000.EXT"
    wf = [Waveform3Band(drums=200, bass=100, vocals=250, other=150)] * 50
    write_ext(out, wf)
    data = out.read_bytes()

    import struct
    off = struct.unpack(">I", data[4:8])[0]
    while off < len(data) - 8:
        magic = data[off : off + 4]
        tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        if magic == b"PWV5":
            from anlz_structs import PWV5Body
            body = data[off + 12 : off + tag_len]
            parsed = PWV5Body.parse(body)
            assert parsed.len_entry_bytes == 2
            assert parsed.len_entries == 50
            return
        off += tag_len
    pytest.fail("PWV5 not found in .EXT")


# ---------------------------------------------------------------------------
# PSSI
# ---------------------------------------------------------------------------


def test_pssi_basic_build_parse() -> None:
    sections = [
        SectionEntry(start_beat=0, end_beat=32, kind=1, name="intro"),
        SectionEntry(start_beat=32, end_beat=64, kind=4, name="chorus"),
    ]
    from anlz_writer import _build_pssi_tag
    tag_bytes = _build_pssi_tag(sections)
    # Tag envelope (12) + body header (20) + 2 entries (48) = 80 bytes
    assert len(tag_bytes) == 12 + 20 + 48
    body = tag_bytes[12:]
    parsed = PSSIBody.parse(body)
    assert parsed.len_entries == 2
    assert parsed.entries[0].kind == 1
    assert parsed.entries[1].kind == 4
    assert parsed.end_beat == 64


# ---------------------------------------------------------------------------
# License regression guard
# ---------------------------------------------------------------------------


def test_no_rbox_imported() -> None:
    """Regression guard: rbox must never be imported per Phase 21 Option C."""
    import anlz_structs
    import anlz_writer
    for mod in (anlz_writer, anlz_structs):
        source = Path(mod.__file__).read_text()
        # Only our rejection-notice docstrings may mention rbox.
        # No actual import lines.
        for line in source.splitlines():
            stripped = line.strip()
            if stripped.startswith("import rbox") or stripped.startswith("from rbox"):
                pytest.fail(f"{mod.__name__} imports rbox: {line!r}")
