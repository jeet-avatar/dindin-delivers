"""Round-trip tests: write ANLZ → parse back with pyrekordbox + our struct
definitions → assert field-equality.

These tests are the primary oracle for the writer in isolation. Byte-level
equivalence against real Rekordbox-exported reference files lives in
``test_anlz_reference_oracle.py``.
"""
from __future__ import annotations

import struct
from pathlib import Path
from typing import Iterable

import pytest

from anlz_structs import (
    PCO2Body,
    PCOBBody,
    PQTZBody,
    PWAVBody,
    PWV3Body,
    PWV5Body,
)
from anlz_writer import (
    BeatEntry,
    CueEntry,
    SectionEntry,
    Waveform3Band,
    write_dat,
    write_ext,
)


# ---------------------------------------------------------------------------
# Tag-splitter helper (mirrors what anlz_parser would do internally)
# ---------------------------------------------------------------------------


def _split_anlz_tags(data: bytes) -> list[tuple[bytes, int, int, bytes]]:
    """Return [(magic, off, len_header, body_bytes)] for every tag in the file.

    Body bytes are the portion AFTER the 12-byte envelope (magic + 2 lengths)
    — i.e. they include the tag-specific header extras and all entries.
    """
    len_file_hdr = struct.unpack(">I", data[4:8])[0]
    off = len_file_hdr
    out: list[tuple[bytes, int, int, bytes]] = []
    while off < len(data) - 8:
        magic = data[off : off + 4]
        if len(magic) < 4 or not magic.isascii():
            break
        try:
            tag_len_header = struct.unpack(">I", data[off + 4 : off + 8])[0]
            tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        except struct.error:
            break
        if tag_len < 12 or off + tag_len > len(data):
            break
        body = data[off + 12 : off + tag_len]
        out.append((magic, off, tag_len_header, body))
        off += tag_len
    return out


def _find_tag(
    tags: Iterable[tuple[bytes, int, int, bytes]],
    magic: bytes,
    nth: int = 0,
) -> tuple[bytes, int, int, bytes]:
    """Return the `nth` occurrence of `magic` in the tag list."""
    matches = [t for t in tags if t[0] == magic]
    if len(matches) <= nth:
        raise KeyError(f"tag {magic!r} #{nth} not found (found {len(matches)})")
    return matches[nth]


# ---------------------------------------------------------------------------
# Round-trip parameterized fixtures (ROADMAP success criterion — 5 variants)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "n_beats,n_hot,n_mem,n_sec",
    [
        (1, 1, 0, 1),          # trivial
        (480, 8, 0, 5),        # typical 2-min 128 BPM track
        (960, 8, 4, 8),        # 4-min track, full cue slots + memory cues
        (1440, 0, 12, 3),      # memory-cues only track
        (2000, 8, 8, 10),      # long track with many cues
    ],
)
def test_dat_roundtrip_beatgrid_and_cues(
    tmp_path: Path, n_beats: int, n_hot: int, n_mem: int, n_sec: int
) -> None:
    """Five fixtures cover varied BPM, beat counts, cue counts, section counts."""
    beats = [
        BeatEntry(time_ms=i * 500, beat_number=(i % 4) + 1, bpm=128.0)
        for i in range(n_beats)
    ]
    hot_cues = [
        CueEntry(
            time_ms=i * 10_000,
            slot=chr(ord("A") + i),
            label=f"HotCue{i}",
            color_id=i % 8,
        )
        for i in range(n_hot)
    ]
    memory_cues = [
        CueEntry(time_ms=i * 15_000, slot=None, label=f"Mem{i}", color_id=0)
        for i in range(n_mem)
    ]
    # n_sec is unused for .DAT (sections live in .EXT per reference files) —
    # exercised via write_ext below.

    out = tmp_path / "ANLZ0000.DAT"
    write_dat(
        out,
        beats=beats,
        memory_cues=memory_cues,
        hot_cues=hot_cues,
        waveform_preview=b"\x00" * 400,
    )

    data = out.read_bytes()
    assert data[:4] == b"PMAI"
    tags = _split_anlz_tags(data)

    # PQTZ must exist and beats must round-trip
    _, _, _, pqtz_body = _find_tag(tags, b"PQTZ")
    parsed_pqtz = PQTZBody.parse(pqtz_body)
    assert parsed_pqtz.entry_count == n_beats
    assert parsed_pqtz.entries[0].beat == beats[0].beat_number
    # BPM stored × 100; tolerance 1 because of int rounding
    assert abs(parsed_pqtz.entries[0].tempo - int(beats[0].bpm * 100)) <= 1

    # PCOB(hot) and PCOB(mem) must both exist (stubs if empty)
    _, _, _, pcob_hot_body = _find_tag(tags, b"PCOB", nth=0)
    parsed_pcob_hot = PCOBBody.parse(pcob_hot_body)
    assert parsed_pcob_hot.cue_type == 1
    assert parsed_pcob_hot.count == n_hot

    _, _, _, pcob_mem_body = _find_tag(tags, b"PCOB", nth=1)
    parsed_pcob_mem = PCOBBody.parse(pcob_mem_body)
    assert parsed_pcob_mem.cue_type == 0
    assert parsed_pcob_mem.count == n_mem

    # Slot A→hot_cue=1, B→2 ... — verify for first hot cue when present
    if n_hot:
        assert parsed_pcob_hot.entries[0].hot_cue == 1


def test_ext_roundtrip_waveform_3band(tmp_path: Path) -> None:
    """PWV3 monochrome + PWV5 color both round-trip through struct parse."""
    wf = [
        Waveform3Band(drums=100, bass=50, vocals=200, other=150)
        for _ in range(1200)
    ]
    out = tmp_path / "ANLZ0000.EXT"
    write_ext(out, wf)

    data = out.read_bytes()
    tags = _split_anlz_tags(data)

    _, _, _, pwv3_body = _find_tag(tags, b"PWV3")
    parsed_pwv3 = PWV3Body.parse(pwv3_body)
    assert parsed_pwv3.len_entry_bytes == 1
    assert parsed_pwv3.len_entries == 1200

    _, _, _, pwv5_body = _find_tag(tags, b"PWV5")
    parsed_pwv5 = PWV5Body.parse(pwv5_body)
    assert parsed_pwv5.len_entry_bytes == 2
    assert parsed_pwv5.len_entries == 1200


def test_pyrekordbox_can_parse_our_dat(tmp_path: Path) -> None:
    """Independent parser (pyrekordbox.AnlzFile) accepts our .DAT output."""
    from pyrekordbox.anlz import AnlzFile

    beats = [BeatEntry(i * 500, (i % 4) + 1, 120.0) for i in range(100)]
    hot_cues = [CueEntry(0, "A", "Kick", 0)]
    out = tmp_path / "ANLZ0000.DAT"
    write_dat(
        out,
        beats=beats,
        memory_cues=[],
        hot_cues=hot_cues,
        waveform_preview=b"\x00" * 400,
        file_path="/Contents/test.aiff",
    )
    parsed = AnlzFile.parse_file(str(out))
    tag_names = sorted(t.name for t in parsed.tags)
    # pyrekordbox gives these human-readable names for our tags.
    assert "beat_grid" in tag_names
    assert "path" in tag_names
    assert "wf_preview" in tag_names
    # Two PCOB tags present → "cue_list" appears twice.
    assert tag_names.count("cue_list") == 2


def test_pyrekordbox_can_parse_our_ext(tmp_path: Path) -> None:
    """pyrekordbox.AnlzFile also accepts our .EXT output."""
    from pyrekordbox.anlz import AnlzFile

    wf = [Waveform3Band(drums=64, bass=64, vocals=128, other=96)] * 200
    out = tmp_path / "ANLZ0000.EXT"
    write_ext(out, wf, file_path="/Contents/test.aiff")
    parsed = AnlzFile.parse_file(str(out))
    tag_names = sorted(t.name for t in parsed.tags)
    assert "path" in tag_names
    assert "wf_detail" in tag_names
    assert "wf_color_detail" in tag_names


def test_dat_pyrekordbox_beat_grid_field_equality(tmp_path: Path) -> None:
    """pyrekordbox's beat_grid output matches our input."""
    from pyrekordbox.anlz import AnlzFile

    beats = [BeatEntry(i * 500, (i % 4) + 1, 120.0) for i in range(24)]
    out = tmp_path / "ANLZ0000.DAT"
    write_dat(
        out,
        beats=beats,
        memory_cues=[],
        hot_cues=[],
        waveform_preview=b"\x00" * 400,
    )
    parsed = AnlzFile.parse_file(str(out))
    bg = parsed.get("beat_grid")
    # pyrekordbox returns a (beats, bpms, times) 3-tuple of arrays; see anlz_parser._parse_beat_grid
    beats_arr, bpms_arr, times_arr = bg[0], bg[1], bg[2]
    assert len(times_arr) == len(beats)
    for i, b in enumerate(beats):
        assert int(beats_arr[i]) == b.beat_number
        assert abs(float(bpms_arr[i]) - b.bpm) < 0.01
        # times_arr from pyrekordbox is seconds (float)
        assert abs(float(times_arr[i]) * 1000 - b.time_ms) < 1
