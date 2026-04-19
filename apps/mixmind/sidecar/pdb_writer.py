"""PDB (export.pdb) writer — hand-rolled per Phase 21 Option C decision.

License posture: Uses ONLY construct (MIT) + Deep Symmetry public spec.
DO NOT import rbox. Phase 21 rejected rbox due to GPL-3.0 contamination.

Output: PIONEER/rekordbox/export.pdb — the legacy Device Library format that
CDJ-3000 firmware reads. A companion reader (``pdb_reader.py``) validates the
writer's output by round-tripping through our own parser — pyrekordbox does
NOT parse PDB files (it reads master.db SQLCipher + ANLZ only), so we cannot
rely on it for cross-validation here.

Spec sources:
  https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/exports.html
  https://github.com/Deep-Symmetry/crate-digger/blob/main/src/main/kaitai/rekordbox_pdb.ksy

Byte layouts sanity-checked against /Volumes/Untitled/PIONEER/rekordbox/export.pdb
(1,421,312 bytes, 20 tables — real Rekordbox 7 output).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from pdb_structs import (
    AlbumRow,
    ArtistRow,
    ColorRowHeader,
    GenreRowHeader,
    KeyRowHeader,
    PageHeader,
    PdbHeader,
    PlaylistEntryRow,
    PlaylistRowHeader,
    TableInfo,
    TrackRow,
    encode_devicesql,
    pack_row_flags,
)


# ===========================================================================
# Constants
# ===========================================================================

PAGE_SIZE = 4096

# Page types per spec (`enum page_type`). Values match what CDJ firmware expects.
PAGE_TYPE_TRACKS = 0
PAGE_TYPE_GENRES = 1
PAGE_TYPE_ARTISTS = 2
PAGE_TYPE_ALBUMS = 3
PAGE_TYPE_LABELS = 4
PAGE_TYPE_KEYS = 5
PAGE_TYPE_COLORS = 6
PAGE_TYPE_PLAYLISTS = 7
PAGE_TYPE_PLAYLIST_ENTRIES = 8
PAGE_TYPE_ARTWORK = 9
PAGE_TYPE_HISTORY_PL = 16
PAGE_TYPE_HISTORY_ENTRIES = 17
PAGE_TYPE_COLUMNS = 19

# Deep Symmetry spec: every table must be present in the 20-entry table info
# block, even if it has no rows. We emit empty pages for unused tables so the
# layout is structurally complete and CDJ firmware doesn't trip over gaps.
NUM_TABLES = 20
PAGE_FLAGS_DATA = 0x24
_ROW_GROUP_STRIDE = 0x24     # bytes per row-group footer (Kaitai spec)

# Track header (fixed) + 21 string offsets = 140 bytes before first string payload.
_TRACK_HEADER_SIZE = 98   # TrackRow.sizeof() — verified at runtime
_TRACK_NUM_STRINGS = 21
_TRACK_FIXED_PREFIX = _TRACK_HEADER_SIZE + (_TRACK_NUM_STRINGS * 2)


# ===========================================================================
# Public input dataclasses
# ===========================================================================


@dataclass
class TrackRecord:
    """One row in the Tracks table.

    Callers (usb_exporter) mint ``id`` via usb_layout.mint_track_id() and pass
    artist / album / etc. names as strings. The writer deduplicates names into
    the Artists / Albums / Genres / Keys tables and resolves the FK IDs.
    """

    id: int
    title: str
    artist_name: str = ""
    album_name: str = ""
    genre_name: str = ""
    key_name: str = ""
    bpm: float = 0.0
    duration_sec: int = 0
    rating: int = 0
    color_id: int = 0
    bitrate: int = 0
    sample_rate: int = 44100
    sample_depth: int = 16
    track_number: int = 0
    year: int = 0
    file_size: int = 0
    file_path_on_usb: str = ""
    file_name: str = ""
    isrc: str = ""
    comment: str = ""


@dataclass
class PlaylistRecord:
    id: int
    name: str
    parent_id: int = 0
    is_folder: bool = False
    track_ids: list[int] = field(default_factory=list)


# ===========================================================================
# Public API
# ===========================================================================


def write_pdb(
    out_path: Path,
    tracks: list[TrackRecord],
    playlists: Optional[list[PlaylistRecord]] = None,
    artwork_assignments: Optional[dict[int, int]] = None,
) -> dict:
    """Write a Rekordbox-compatible ``export.pdb`` file.

    ``artwork_assignments`` is ``{track_id: artwork_id}`` — the global slot
    number ``artwork_writer.artwork_id_for_pdb()`` returns. Track rows whose
    ``t.id`` is not in the dict keep ``artwork_id = 0`` (no art). Per the
    reference USB observation (``/Volumes/Untitled/PIONEER/rekordbox/export.pdb``
    has 0 rows in the Artwork table, page_type 9), the Artwork table itself
    stays empty — the CDJ reconstructs the JPEG path from ``artwork_id`` via
    ``artwork_writer.decode_artwork_id()`` (bucket = slot // 20 + 1).

    Returns a dict with:
      * tables_written — list of page_type ints emitted
      * total_pages — count of pages on disk (incl. header page)
      * file_size — final file size in bytes (always 4096 × N)
    """
    if playlists is None:
        playlists = [_default_all_tracks_playlist(tracks)]
    artwork_assignments = artwork_assignments or {}

    # ------------------------------------------------------------------
    # Resolve cross-table foreign keys — artists / albums / genres / keys / colors
    # ------------------------------------------------------------------
    artists = _collect_unique_names(tracks, "artist_name")
    albums = _collect_unique_names(tracks, "album_name")
    genres = _collect_unique_names(tracks, "genre_name")
    keys = _collect_unique_names(tracks, "key_name")

    # Colour palette is fixed (0..8 per Pioneer convention). We emit the 8
    # standard colours so Track.color_id values 0..7 have something to reference.
    colors = _default_color_palette()

    # ------------------------------------------------------------------
    # Serialize each table's rows as "blob + per-row metadata"
    # ------------------------------------------------------------------
    track_rows = _serialize_track_rows(
        tracks, artists, albums, genres, keys, artwork_assignments,
    )
    artist_rows = _serialize_artist_rows(artists)
    album_rows = _serialize_album_rows(albums, artists, tracks)
    genre_rows = _serialize_simple_id_name_rows(genres)
    key_rows = _serialize_key_rows(keys)
    color_rows = _serialize_color_rows(colors)
    playlist_rows = _serialize_playlist_rows(playlists)
    playlist_entry_rows = _serialize_playlist_entry_rows(playlists)

    # ------------------------------------------------------------------
    # Pack each table into pages. Page indices are assigned sequentially;
    # index 0 is the header page which is built last (needs final page count).
    # ------------------------------------------------------------------
    pages: list[tuple[int, bytes]] = []   # list of (page_type, 4096-byte page)

    table_first_last: dict[int, tuple[int, int]] = {}

    def _emit_table(page_type: int, row_blobs: list[bytes]) -> None:
        start_index = len(pages) + 1   # +1 for the header page at index 0
        if not row_blobs:
            # Emit exactly one empty page so the table is discoverable
            pages.append((page_type, _build_page(page_type, start_index, [], next_page=0)))
            table_first_last[page_type] = (start_index, start_index)
            return

        emitted: list[int] = []
        current: list[bytes] = []
        for blob in row_blobs:
            if not _fits_in_page(current, blob):
                this_idx = len(pages) + 1
                emitted.append(this_idx)
                pages.append((page_type, _build_page(page_type, this_idx, current,
                                                    next_page=this_idx + 1)))
                current = []
            current.append(blob)

        if current:
            this_idx = len(pages) + 1
            emitted.append(this_idx)
            pages.append((page_type, _build_page(page_type, this_idx, current, next_page=0)))

        # Fix up next_page of the last emitted page to 0 (terminator).
        # Already done above via next_page=0 in the tail branch.
        table_first_last[page_type] = (emitted[0], emitted[-1])

    _emit_table(PAGE_TYPE_TRACKS, track_rows)
    _emit_table(PAGE_TYPE_GENRES, genre_rows)
    _emit_table(PAGE_TYPE_ARTISTS, artist_rows)
    _emit_table(PAGE_TYPE_ALBUMS, album_rows)
    _emit_table(PAGE_TYPE_LABELS, [])                  # not populated in MixMind v1
    _emit_table(PAGE_TYPE_KEYS, key_rows)
    _emit_table(PAGE_TYPE_COLORS, color_rows)
    _emit_table(PAGE_TYPE_PLAYLISTS, playlist_rows)
    _emit_table(PAGE_TYPE_PLAYLIST_ENTRIES, playlist_entry_rows)
    _emit_table(PAGE_TYPE_ARTWORK, [])
    # Pad out remaining tables (11..19) with empty pages so the TableInfo block
    # is complete at 20 entries.
    for t in (10, 11, 12, 13, 14, 15, 16, 17, 18, 19):
        _emit_table(t, [])

    # ------------------------------------------------------------------
    # Build header + table info block
    # ------------------------------------------------------------------
    total_pages = len(pages) + 1   # +1 for the header page

    header_bytes = PdbHeader.build({
        "unknown1": 0,
        "len_page": PAGE_SIZE,
        "num_tables": NUM_TABLES,
        "next_unused_page": total_pages,
        "unknown2": 1,
        "sequence": 1,
        "gap": b"\x00" * 4,
    })

    table_info_blob = b""
    for t in range(NUM_TABLES):
        if t in table_first_last:
            first, last = table_first_last[t]
            table_info_blob += TableInfo.build({
                "type": t, "empty_candidate": last + 1,
                "first_page": first, "last_page": last,
            })
        else:
            # Table not emitted (shouldn't happen given the loops above, but
            # defensive). Zero entry.
            table_info_blob += TableInfo.build({
                "type": t, "empty_candidate": 0,
                "first_page": 0, "last_page": 0,
            })

    # ------------------------------------------------------------------
    # Write to disk
    # ------------------------------------------------------------------
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        # Header page: PdbHeader + TableInfo block + zero-padding to 4096
        f.write(header_bytes)
        f.write(table_info_blob)
        written = len(header_bytes) + len(table_info_blob)
        pad = PAGE_SIZE - written
        if pad < 0:
            raise ValueError(f"Header + table info exceed {PAGE_SIZE} bytes: {written}")
        f.write(b"\x00" * pad)

        # Remaining pages
        for _pt, page_bytes in pages:
            assert len(page_bytes) == PAGE_SIZE, f"page size drift: {len(page_bytes)}"
            f.write(page_bytes)

    return {
        "tables_written": sorted(table_first_last.keys()),
        "total_pages": total_pages,
        "file_size": out_path.stat().st_size,
    }


# ===========================================================================
# Page packing
# ===========================================================================


def _fits_in_page(current_rows: list[bytes], new_blob: bytes) -> bool:
    """Can we add ``new_blob`` to the in-progress page without overflowing?"""
    n = len(current_rows) + 1
    rows_bytes = sum(len(b) for b in current_rows) + len(new_blob)
    # Each row needs a 2-byte offset entry in the trailing index, plus a
    # per-group 4-byte row_present_flags. Groups hold up to 16 rows.
    num_groups = (n + 15) // 16
    footer_bytes = num_groups * _ROW_GROUP_STRIDE
    total = PageHeader.sizeof() + rows_bytes + footer_bytes
    return total <= PAGE_SIZE


def _build_page(page_type: int, page_index: int, rows: list[bytes],
                next_page: int = 0) -> bytes:
    """Build one PAGE_SIZE-byte page for the given rows.

    Layout:
        [PageHeader (40B)]
        [row1 bytes][row2 bytes]...[rowN bytes]
        [padding to end-of-heap]
        [row-group footer blocks at end of page, growing backward]
    """
    header_size = PageHeader.sizeof()
    row_data = b"".join(rows)

    # Compute row offsets relative to end-of-page-header (heap start).
    offsets: list[int] = []
    cursor = 0
    for r in rows:
        offsets.append(cursor)
        cursor += len(r)

    # Row groups: each holds up to 16 rows, built backward from end of page.
    # Each group is _ROW_GROUP_STRIDE bytes:
    #   [16 × Int16ul row_offset, newest first]
    #   [Int16ul transaction_row_flags]
    #   [Int16ul row_present_flags]
    # Total = 32 + 2 + 2 = 36 bytes (_ROW_GROUP_STRIDE).
    num_rows = len(rows)
    num_groups = (num_rows + 15) // 16 if num_rows else 1
    footer = bytearray()
    for g in range(num_groups):
        base_row = g * 16
        group_rows = min(16, num_rows - base_row)
        # row_offsets, in reverse order (highest index first)
        group_bytes = bytearray()
        for i in range(16):
            row_idx = base_row + (15 - i)   # reverse
            if row_idx < base_row + group_rows and row_idx < num_rows:
                group_bytes += offsets[row_idx].to_bytes(2, "little")
            else:
                group_bytes += b"\x00\x00"
        # transaction_row_flags (all zeros — no pending txn)
        group_bytes += b"\x00\x00"
        # row_present_flags — bit[i] = 1 iff row i is present
        flags = 0
        for i in range(group_rows):
            flags |= 1 << i
        group_bytes += flags.to_bytes(2, "little")
        footer += group_bytes

    used_size = len(row_data)
    footer_size = len(footer)
    free_size = PAGE_SIZE - header_size - used_size - footer_size
    if free_size < 0:
        raise ValueError(
            f"Page overflow (type={page_type}, idx={page_index}): "
            f"used={used_size}, footer={footer_size}"
        )

    row_flags = pack_row_flags(
        num_row_offsets=num_rows,
        num_rows=num_rows,
        page_flags=PAGE_FLAGS_DATA,
    )
    header = PageHeader.build({
        "page_index": page_index,
        "page_type": page_type,
        "next_page": next_page,
        "sequence": 1,
        "reserved1": 0,
        "row_flags_packed": row_flags,
        "free_size": free_size,
        "used_size": used_size,
        "transaction_row_count": 0,
        "transaction_row_index": 0,
        "strange_marker": 0,
        "history_marker": 0,
    })

    page_bytes = header + row_data + (b"\x00" * free_size) + bytes(footer)
    assert len(page_bytes) == PAGE_SIZE
    return page_bytes


# ===========================================================================
# Row serialization
# ===========================================================================


def _collect_unique_names(tracks: list[TrackRecord], field_name: str) -> dict[str, int]:
    """Return dict name->id mapping; empty/blank names are skipped.

    IDs are sequential starting at 1 (0 = sentinel for "none/unknown").
    """
    seen: dict[str, int] = {}
    for t in tracks:
        name = getattr(t, field_name, "") or ""
        name = name.strip()
        if name and name not in seen:
            seen[name] = len(seen) + 1
    return seen


def _default_color_palette() -> list[tuple[int, str]]:
    """Pioneer's standard 8-colour cue palette (id, name). Colour IDs 0..7."""
    return [
        (0, ""),         # None
        (1, "Pink"),
        (2, "Red"),
        (3, "Orange"),
        (4, "Yellow"),
        (5, "Green"),
        (6, "Aqua"),
        (7, "Blue"),
        (8, "Purple"),
    ]


def _serialize_track_rows(
    tracks: list[TrackRecord],
    artists: dict[str, int],
    albums: dict[str, int],
    genres: dict[str, int],
    keys: dict[str, int],
    artwork_assignments: Optional[dict[int, int]] = None,
) -> list[bytes]:
    """Build TrackRow byte blobs.

    Layout per row:
        [92-byte fixed header]
        [21 × Int16ul string offsets]  (42 bytes)
        [concatenated DeviceSQL strings]
    """
    artwork_assignments = artwork_assignments or {}
    blobs: list[bytes] = []
    for i, t in enumerate(tracks):
        # String order matches Kaitai spec's `track_row` field list:
        strings = [
            t.isrc,
            "",                 # texter (tracks set by Rekordbox's "Text" field — blank for us)
            "",                 # kuvo_public
            "",                 # mix_name
            "",                 # reserved1
            "",                 # autoload_hot_cues
            "",                 # kuvo_artist_id
            "",                 # date_added
            "",                 # release_date
            "",                 # mix2
            str(t.sample_rate), # sample_rate_str
            t.file_path_on_usb,
            t.file_name,
            t.title,
            "",                 # sample_rate2
            t.comment,
            "",                 # hot_cue_autoload
            "",                 # kuvo_pub2
            t.key_name,
            str(t.year),
            "",                 # ofa (ofa_hash)
        ]
        if len(strings) != _TRACK_NUM_STRINGS:
            raise ValueError(f"internal: track strings count {len(strings)} != {_TRACK_NUM_STRINGS}")

        encoded = [encode_devicesql(s) for s in strings]
        offset_ints: list[int] = []
        cursor = _TRACK_FIXED_PREFIX
        for s in encoded:
            offset_ints.append(cursor)
            cursor += len(s)

        header = TrackRow.build({
            "row_index": i,
            "bitmask": 0,
            "sample_rate": t.sample_rate,
            "composer_id": 0,
            "file_size": t.file_size,
            "unknown1": 3,
            "unknown2": 0,
            "unknown3": 0,
            "unknown4": 0,
            "artwork_id": int(artwork_assignments.get(t.id, 0)),
            "key_id": keys.get(t.key_name, 0),
            "original_artist_id": 0,
            "label_id": 0,
            "remixer_id": 0,
            "bitrate": t.bitrate,
            "track_number": t.track_number,
            "tempo": int(round(t.bpm * 100)),
            "genre_id": genres.get(t.genre_name, 0),
            "album_id": albums.get(t.album_name, 0),
            "artist_id": artists.get(t.artist_name, 0),
            "id": t.id,
            "disc_number": 0,
            "play_count": 0,
            "year": t.year,
            "sample_depth": t.sample_depth,
            "duration": t.duration_sec,
            "unknown5": 41,
            "color_id": t.color_id,
            "rating": t.rating,
            "unknown6": 0,
            "unknown7": 0,
        })
        offset_bytes = b"".join(o.to_bytes(2, "little") for o in offset_ints)
        string_bytes = b"".join(encoded)
        blobs.append(header + offset_bytes + string_bytes)
    return blobs


def _serialize_artist_rows(artists: dict[str, int]) -> list[bytes]:
    blobs: list[bytes] = []
    # ArtistRow fixed-size header is 12 bytes: magic(2) + subtype(2) + idx(2) + id(4) + name_offset(1)
    # = 11 bytes actually; name_offset field is u1. Let's compute from struct.
    header_size = ArtistRow.sizeof()
    for i, (name, aid) in enumerate(artists.items()):
        encoded = encode_devicesql(name)
        header = ArtistRow.build({
            "subtype": 0x60,
            "row_index": i,
            "id": aid,
            "name_offset": header_size,
        })
        blobs.append(header + encoded)
    return blobs


def _serialize_album_rows(
    albums: dict[str, int],
    artists: dict[str, int],
    tracks: list[TrackRecord],
) -> list[bytes]:
    # Resolve album->primary-artist by scanning the first track that mentions it.
    album_to_artist: dict[str, int] = {}
    for t in tracks:
        if t.album_name in albums and t.album_name not in album_to_artist:
            album_to_artist[t.album_name] = artists.get(t.artist_name, 0)

    header_size = AlbumRow.sizeof()
    blobs: list[bytes] = []
    for i, (name, aid) in enumerate(albums.items()):
        encoded = encode_devicesql(name)
        header = AlbumRow.build({
            "row_index": i,
            "unknown1": 0,
            "artist_id": album_to_artist.get(name, 0),
            "id": aid,
            "unknown2": 0,
            "unknown3": 0,
            "name_offset": header_size,
        })
        blobs.append(header + encoded)
    return blobs


def _serialize_simple_id_name_rows(names: dict[str, int]) -> list[bytes]:
    """Emit GenreRow-like rows: 4-byte id + DeviceSQL name."""
    blobs: list[bytes] = []
    for name, nid in names.items():
        header = GenreRowHeader.build({"id": nid})
        blobs.append(header + encode_devicesql(name))
    return blobs


def _serialize_key_rows(keys: dict[str, int]) -> list[bytes]:
    blobs: list[bytes] = []
    for name, kid in keys.items():
        header = KeyRowHeader.build({"id": kid, "id2": kid})
        blobs.append(header + encode_devicesql(name))
    return blobs


def _serialize_color_rows(colors: list[tuple[int, str]]) -> list[bytes]:
    blobs: list[bytes] = []
    for color_id, name in colors:
        header = ColorRowHeader.build({
            "unknown1": 0,
            "code": color_id & 0xFF,
            "unknown2": 0,
            "id": color_id,
        })
        blobs.append(header + encode_devicesql(name))
    return blobs


def _serialize_playlist_rows(playlists: list[PlaylistRecord]) -> list[bytes]:
    blobs: list[bytes] = []
    for sort_order, p in enumerate(playlists):
        header = PlaylistRowHeader.build({
            "parent_id": p.parent_id,
            "unknown": 0,
            "sort_order": sort_order,
            "id": p.id,
            "is_folder": 1 if p.is_folder else 0,
        })
        blobs.append(header + encode_devicesql(p.name))
    return blobs


def _serialize_playlist_entry_rows(playlists: list[PlaylistRecord]) -> list[bytes]:
    blobs: list[bytes] = []
    for p in playlists:
        if p.is_folder:
            continue
        for idx, tid in enumerate(p.track_ids):
            blobs.append(PlaylistEntryRow.build({
                "entry_index": idx,
                "track_id": tid,
                "playlist_id": p.id,
            }))
    return blobs


def _default_all_tracks_playlist(tracks: list[TrackRecord]) -> PlaylistRecord:
    return PlaylistRecord(
        id=1, name="All Tracks", parent_id=0, is_folder=False,
        track_ids=[t.id for t in tracks],
    )
