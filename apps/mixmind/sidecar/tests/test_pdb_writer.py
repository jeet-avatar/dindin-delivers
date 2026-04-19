"""PDB writer tests — symmetric round-trip via our own pdb_reader.

NOTE on validation strategy (Rule 1 deviation from plan):
The plan called for ``pyrekordbox.db6.Rekordbox6Database`` to parse our
export.pdb. That library does NOT parse PDB files — it reads master.db
(SQLCipher) only. Since no independent open-source PDB parser exists in
the Python ecosystem (other than crate-digger, which is JVM-only), we
validate the writer via a matched reader (``pdb_reader.read_pdb``) that
reverses the same spec. The byte-level reference oracle test in Task 5
provides the independent cross-check by diffing our output against the
real Rekordbox-produced /Volumes/Untitled/PIONEER/rekordbox/export.pdb.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from pdb_reader import read_pdb
from pdb_structs import encode_devicesql
from pdb_writer import PAGE_SIZE, PlaylistRecord, TrackRecord, write_pdb


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def trivial_track() -> TrackRecord:
    return TrackRecord(
        id=0x10000000,
        title="Test Track",
        artist_name="Test Artist",
        album_name="Test Album",
        genre_name="Techno",
        key_name="8A",
        bpm=128.0,
        duration_sec=180,
        color_id=0,
        bitrate=320,
        sample_rate=44100,
        sample_depth=16,
        file_path_on_usb="/Contents/Test Artist/Test Album/10000000.mp3",
        file_name="10000000.mp3",
        file_size=7_200_000,
    )


def _make_tracks(n: int) -> list[TrackRecord]:
    """Build N synthetic tracks for fuzz tests."""
    return [
        TrackRecord(
            id=0x10000000 + i,
            title=f"Track {i:04d}",
            artist_name=f"Artist {i % 50}",
            album_name=f"Album {i % 100}",
            genre_name="Techno" if i % 3 == 0 else "House",
            key_name=f"{(i % 12) + 1}A",
            bpm=120.0 + (i % 20),
            duration_sec=240 + (i % 180),
            bitrate=320,
            sample_rate=44100,
            sample_depth=16,
            file_path_on_usb=(
                f"/Contents/Artist {i%50}/Album {i%100}/{0x10000000+i:08x}.mp3"
            ),
            file_name=f"{0x10000000+i:08x}.mp3",
            file_size=7_200_000,
        )
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# Basic shape tests
# ---------------------------------------------------------------------------


def test_minimum_one_track(tmp_path: Path, trivial_track: TrackRecord) -> None:
    out = tmp_path / "export.pdb"
    result = write_pdb(out, [trivial_track])

    assert out.exists()
    assert result["file_size"] >= PAGE_SIZE, "at least one full page"
    assert result["file_size"] % PAGE_SIZE == 0, "must be page-aligned"

    # PdbHeader sanity — first 28 bytes.
    with open(out, "rb") as f:
        raw_header = f.read(28)
    assert int.from_bytes(raw_header[4:8], "little") == PAGE_SIZE, "len_page"
    assert int.from_bytes(raw_header[8:12], "little") == 20, "num_tables"


def test_page_alignment(tmp_path: Path, trivial_track: TrackRecord) -> None:
    """Pitfall 3 regression — size must always be 4096×N, never a partial tail."""
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    size = out.stat().st_size
    assert size % PAGE_SIZE == 0, f"PDB file must be page-aligned, got {size} bytes"


def test_all_20_tables_emitted(tmp_path: Path, trivial_track: TrackRecord) -> None:
    """Pitfall 4 — TableInfo block must have all 20 entries or CDJ firmware fails."""
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    parsed = read_pdb(out)
    assert parsed.num_tables == 20
    assert len(parsed.tables) == 20
    table_types = [t.type for t in parsed.tables]
    assert table_types == list(range(20))


# ---------------------------------------------------------------------------
# Symmetric round-trip (writer → reader) — the core validation
# ---------------------------------------------------------------------------


def test_roundtrip_single_track(tmp_path: Path, trivial_track: TrackRecord) -> None:
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    parsed = read_pdb(out)

    # One track = one row in the Tracks table.
    assert parsed.row_count(0) == 1
    # One artist, one album, one genre, one key.
    assert parsed.row_count(2) == 1      # Artists
    assert parsed.row_count(3) == 1      # Albums
    assert parsed.row_count(1) == 1      # Genres
    assert parsed.row_count(5) == 1      # Keys
    # Default playlist wraps the single track.
    assert parsed.row_count(7) == 1      # Playlists
    assert parsed.row_count(8) == 1      # Playlist entries


@pytest.mark.parametrize("n_tracks", [1, 10, 100, 500, 1500])
def test_track_count_roundtrip(tmp_path: Path, n_tracks: int) -> None:
    """Pitfall 6 — page-row arithmetic: parsed count must match written count."""
    tracks = _make_tracks(n_tracks)
    out = tmp_path / "export.pdb"
    write_pdb(out, tracks)

    parsed = read_pdb(out)
    got = parsed.row_count(0)
    assert got == n_tracks, (
        f"wrote {n_tracks} tracks, parser sees {got} — page-row drift (Pitfall 6)"
    )


def test_default_playlist_entry_count(tmp_path: Path) -> None:
    """Default 'All Tracks' playlist must contain one entry per track."""
    tracks = _make_tracks(25)
    out = tmp_path / "export.pdb"
    write_pdb(out, tracks)
    parsed = read_pdb(out)
    assert parsed.row_count(7) == 1, "one playlist (All Tracks)"
    assert parsed.row_count(8) == 25, "25 playlist entries"


def test_custom_playlist_with_multiple_tracks(tmp_path: Path) -> None:
    tracks = _make_tracks(5)
    pl = PlaylistRecord(id=1, name="My Set", track_ids=[t.id for t in tracks])
    out = tmp_path / "export.pdb"
    write_pdb(out, tracks, playlists=[pl])

    parsed = read_pdb(out)
    assert parsed.row_count(7) == 1
    assert parsed.row_count(8) == 5


# ---------------------------------------------------------------------------
# DeviceSQL encoding — UTF-16 for non-ASCII strings
# ---------------------------------------------------------------------------


def test_devicesql_utf16_in_output_bytes(tmp_path: Path) -> None:
    """Non-ASCII titles must be UTF-16LE-encoded inside the written file."""
    track = TrackRecord(
        id=0x10000000,
        title="日本語トラック",
        artist_name="アーティスト",
        album_name="Album",
        genre_name="Techno",
        key_name="8A",
        bpm=128.0,
        duration_sec=180,
        bitrate=320,
        sample_rate=44100,
        sample_depth=16,
        file_path_on_usb="/Contents/A/B/10000000.mp3",
        file_name="10000000.mp3",
        file_size=7_200_000,
    )
    out = tmp_path / "export.pdb"
    write_pdb(out, [track])
    blob = out.read_bytes()

    # Verify the DeviceSQL encoder chose UTF-16 and the payload is present.
    encoded_title = encode_devicesql("日本語トラック")
    assert encoded_title[0] == 0x90, "UTF-16 marker byte required"
    assert "日本語トラック".encode("utf-16-le") in blob, "UTF-16 title not in output"
    assert "アーティスト".encode("utf-16-le") in blob, "UTF-16 artist not in output"


def test_devicesql_short_ascii_in_output(tmp_path: Path, trivial_track: TrackRecord) -> None:
    """Short ASCII titles use the compact variant (flag byte, no 0x40/0x90 marker)."""
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    blob = out.read_bytes()
    # Title "Test Track" ASCII must be present as a substring.
    assert b"Test Track" in blob
    assert b"Test Artist" in blob


# ---------------------------------------------------------------------------
# Page structure invariants
# ---------------------------------------------------------------------------


def test_page_header_free_and_used_sizes_consistent(
    tmp_path: Path, trivial_track: TrackRecord
) -> None:
    """Every data page must satisfy: header(40) + used + free + footer = 4096."""
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    parsed = read_pdb(out)

    # Check the Tracks table's first page.
    tp = parsed.pages_for_table(0)[0]
    # footer = num_groups × 36
    num_groups = (tp.num_rows + 15) // 16 if tp.num_rows else 1
    footer = num_groups * 36
    assert 40 + tp.used_size + tp.free_size + footer == PAGE_SIZE, (
        f"page arithmetic: 40+{tp.used_size}+{tp.free_size}+{footer}"
        f" = {40 + tp.used_size + tp.free_size + footer}, want {PAGE_SIZE}"
    )


def test_row_offsets_ascend_within_page(
    tmp_path: Path, trivial_track: TrackRecord
) -> None:
    """Rows in a page must have strictly ascending offsets (Pitfall 6 regression)."""
    out = tmp_path / "export.pdb"
    # 50 tracks — stays in a single page typically, verifies offset ordering.
    tracks = _make_tracks(50)
    write_pdb(out, tracks)
    parsed = read_pdb(out)

    for page in parsed.pages_for_table(0):
        if len(page.row_offsets) < 2:
            continue
        for prev, cur in zip(page.row_offsets, page.row_offsets[1:]):
            assert cur > prev, f"non-ascending row offsets: {page.row_offsets}"


# ---------------------------------------------------------------------------
# License regression guard (Phase 21 Option C)
# ---------------------------------------------------------------------------


def test_no_rbox_imported() -> None:
    """rbox (GPL-3.0) must never be imported by pdb_writer / pdb_structs / pdb_reader.

    Inspects AST (not substring search) so we don't collide with prose in
    docstrings that reference ``rbox`` prohibitively.
    """
    import ast

    import pdb_reader
    import pdb_structs
    import pdb_writer

    for mod in (pdb_writer, pdb_structs, pdb_reader):
        source = Path(mod.__file__).read_text(encoding="utf-8")
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] != "rbox", (
                        f"{mod.__name__} has `import {alias.name}`"
                    )
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] != "rbox", (
                    f"{mod.__name__} has `from {node.module} import ...`"
                )


# ---------------------------------------------------------------------------
# Color palette — default 9 rows (0..8 per Pioneer spec)
# ---------------------------------------------------------------------------


def test_default_color_palette_present(
    tmp_path: Path, trivial_track: TrackRecord
) -> None:
    out = tmp_path / "export.pdb"
    write_pdb(out, [trivial_track])
    parsed = read_pdb(out)
    # 9 default colours (None + Pink..Purple).
    assert parsed.row_count(6) == 9
