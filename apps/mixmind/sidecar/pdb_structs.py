"""PDB binary struct definitions — hand-rolled per Phase 21 Option C decision.

License: MIT (uses only `construct` library + Deep Symmetry public spec).
DO NOT import rbox. Phase 21 rejected rbox due to GPL-3.0 contamination.

Spec sources:
  https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/exports.html
  https://github.com/Deep-Symmetry/crate-digger/blob/main/src/main/kaitai/rekordbox_pdb.ksy

Byte layouts were sanity-checked against /Volumes/Untitled/PIONEER/rekordbox/export.pdb
(1,421,312 bytes, 20 tables — real Rekordbox 7 output, Apr 2026).
"""
from __future__ import annotations

import construct as c


# ===========================================================================
# File header — first 28 bytes of export.pdb and exportExt.pdb
# ===========================================================================

PdbHeader = c.Struct(
    "unknown1" / c.Int32ul,          # always 0 in the reference
    "len_page" / c.Int32ul,          # 4096 per reference
    "num_tables" / c.Int32ul,        # 20 in export.pdb, 9 in exportExt.pdb
    "next_unused_page" / c.Int32ul,
    "unknown2" / c.Int32ul,          # 1 in reference
    "sequence" / c.Int32ul,          # PDB sequence counter (e.g. 8277 in ref)
    "gap" / c.Bytes(4),              # zeros
)

# Table pointer — one per table, 16 bytes each
TableInfo = c.Struct(
    "type" / c.Int32ul,              # 0=tracks, 1=genres, 2=artists, 3=albums,
                                     # 4=labels, 5=keys, 6=colors, 7=playlists,
                                     # 8=playlist_entries, 9=artwork, 11/12=history,
                                     # 16=history_pl, 17=history_entries, 19=columns
    "empty_candidate" / c.Int32ul,   # page index where next insertion goes
    "first_page" / c.Int32ul,
    "last_page" / c.Int32ul,
)

# ===========================================================================
# Page header — first 40 bytes of every page
#
# Per Kaitai spec (rekordbox_pdb.ksy `page` type):
#   4  bytes — gap (always zeros)
#   4  bytes — page_index (matches look-up index)
#   4  bytes — type (page_type enum, matches TableInfo.type)
#   4  bytes — next_page (page_ref; 4 bytes — index of next page)
#   4  bytes — sequence (edit counter)
#   4  bytes — reserved
#   4  bytes — packed b13 num_row_offsets | b11 num_rows | u1 page_flags
#   2  bytes — free_size
#   2  bytes — used_size
#   2  bytes — transaction_row_count
#   2  bytes — transaction_row_index
#   2  bytes — unknown (1004 for strange blocks, 0 otherwise)
#   2  bytes — unknown (0 except 1 for history pages)
# Total = 40 bytes
#
# We keep the b13/b11/u1 field as an opaque 4-byte ``row_flags`` blob and
# expose helpers below to pack/unpack it — construct's BitStruct endian
# handling for <32-bit mixed fields is fiddly for LE bitfields.
# ===========================================================================

PageHeader = c.Struct(
    "gap" / c.Const(b"\x00\x00\x00\x00"),
    "page_index" / c.Int32ul,
    "page_type" / c.Int32ul,
    "next_page" / c.Int32ul,         # 0 (or index past EOF) = last page in chain
    "sequence" / c.Int32ul,
    "reserved1" / c.Int32ul,
    # Packed: b13 num_row_offsets | b11 num_rows | u1 page_flags. We model it
    # as an Int32ul and use pack_row_flags / unpack_row_flags to compose.
    "row_flags_packed" / c.Int32ul,
    "free_size" / c.Int16ul,
    "used_size" / c.Int16ul,
    "transaction_row_count" / c.Int16ul,
    "transaction_row_index" / c.Int16ul,
    "strange_marker" / c.Int16ul,    # 0x1004 for strange blocks, 0 otherwise
    "history_marker" / c.Int16ul,    # 0 except 1 for history pages
)


def pack_row_flags(num_row_offsets: int, num_rows: int, page_flags: int) -> int:
    """Compose the 32-bit row_flags_packed field.

    Bits (LE):
        [0..12]   num_row_offsets (13 bits, 0..8191)
        [13..23]  num_rows         (11 bits, 0..2047)
        [24..31]  page_flags       (8 bits; 0x24 for data, 0x44/0x64 strange)
    """
    assert 0 <= num_row_offsets < (1 << 13)
    assert 0 <= num_rows < (1 << 11)
    assert 0 <= page_flags < (1 << 8)
    return (num_row_offsets & 0x1FFF) | ((num_rows & 0x7FF) << 13) | ((page_flags & 0xFF) << 24)


def unpack_row_flags(packed: int) -> tuple[int, int, int]:
    """Inverse of pack_row_flags — returns (num_row_offsets, num_rows, page_flags)."""
    return (packed & 0x1FFF, (packed >> 13) & 0x7FF, (packed >> 24) & 0xFF)


# ===========================================================================
# Row types — fixed-layout headers; string data follows via offset tables
# ===========================================================================
#
# Pattern (shared with all rows that contain DeviceSQL strings):
#   <magic 2-byte> <row_index u16> <fixed-size header> <string offsets> <strings>
#
# TrackRow carries 21 string references (title, artist name cache, file_path,
# filename, ISRC, comment, etc.). ArtistRow / AlbumRow carry 1 string each.
# ===========================================================================


# TrackRow fixed-size header. 92 bytes total per Kaitai spec (v9+).
# Offset table of 21 × Int16ul = 42 bytes follows; then the string payloads.
TrackRow = c.Struct(
    "magic" / c.Const(b"\x24\x00"),     # 0x0024 row marker
    "row_index" / c.Int16ul,            # row position inside page
    "bitmask" / c.Int32ul,              # presence flags
    "sample_rate" / c.Int32ul,
    "composer_id" / c.Int32ul,
    "file_size" / c.Int32ul,
    "unknown1" / c.Int32ul,
    "unknown2" / c.Int16ul,
    "unknown3" / c.Int16ul,
    "unknown4" / c.Int32ul,
    "artwork_id" / c.Int32ul,
    "key_id" / c.Int32ul,
    "original_artist_id" / c.Int32ul,
    "label_id" / c.Int32ul,
    "remixer_id" / c.Int32ul,
    "bitrate" / c.Int32ul,
    "track_number" / c.Int32ul,
    "tempo" / c.Int32ul,                # BPM × 100
    "genre_id" / c.Int32ul,
    "album_id" / c.Int32ul,
    "artist_id" / c.Int32ul,
    "id" / c.Int32ul,                   # primary key
    "disc_number" / c.Int16ul,
    "play_count" / c.Int16ul,
    "year" / c.Int16ul,
    "sample_depth" / c.Int16ul,
    "duration" / c.Int16ul,             # seconds
    "unknown5" / c.Int16ul,
    "color_id" / c.Int8ul,
    "rating" / c.Int8ul,
    "unknown6" / c.Int16ul,
    "unknown7" / c.Int16ul,
)

# Artist: 2-byte magic + subtype u16 + row_index u16 + id u32 + name_offset u8
# then the DeviceSQL-encoded name payload (see encode_devicesql below).
ArtistRow = c.Struct(
    "magic" / c.Const(b"\x60\x00"),
    "subtype" / c.Int16ul,              # 0x60 (simple) or 0x64 (with subtype offsets)
    "row_index" / c.Int16ul,
    "id" / c.Int32ul,
    "name_offset" / c.Int8ul,           # byte offset from row start to name
)

# Album: 2-byte magic + row_index + unknown + artist_id + id + unknown + name_offset
AlbumRow = c.Struct(
    "magic" / c.Const(b"\x80\x00"),
    "row_index" / c.Int16ul,
    "unknown1" / c.Int32ul,
    "artist_id" / c.Int32ul,
    "id" / c.Int32ul,
    "unknown2" / c.Int32ul,
    "unknown3" / c.Int8ul,
    "name_offset" / c.Int8ul,
)

# Simple id+name rows — exact header layout matches Rekordbox's flat format.
GenreRowHeader = c.Struct(
    "id" / c.Int32ul,
    # DeviceSQL-encoded name follows immediately.
)

# Keys carry an alternate id2 (some Pioneer variants use it for case-insensitive joins)
KeyRowHeader = c.Struct(
    "id" / c.Int32ul,
    "id2" / c.Int32ul,
)

# Colors: 4 bytes unknown, 1 byte code, 1 byte unknown, 2 bytes id, then name
ColorRowHeader = c.Struct(
    "unknown1" / c.Int32ul,
    "code" / c.Int8ul,
    "unknown2" / c.Int8ul,
    "id" / c.Int16ul,
)

# Playlist row: parent_id, unknown, sort_order, id, is_folder, then name
PlaylistRowHeader = c.Struct(
    "parent_id" / c.Int32ul,
    "unknown" / c.Int32ul,
    "sort_order" / c.Int32ul,
    "id" / c.Int32ul,
    "is_folder" / c.Int32ul,            # 1 = folder, 0 = leaf playlist
)

# Playlist entries are pure id references — no strings
PlaylistEntryRow = c.Struct(
    "entry_index" / c.Int32ul,
    "track_id" / c.Int32ul,
    "playlist_id" / c.Int32ul,
)


# ===========================================================================
# DeviceSQL string encoder (3 variants)
# ===========================================================================


_EMPTY_SHORT = b"\x03"      # empty short string: length 1 shifted left + 1 flag


def encode_devicesql(s: str) -> bytes:
    """Encode a Python string as a DeviceSQL string.

    Three variants per Deep Symmetry spec:

    * **Short ASCII** — length flag byte ``(len << 1) | 1`` (high bit clear),
      then payload bytes, then a single NUL terminator.
      Capacity: ``<= 126`` bytes (flag value 0xFD when len=126).
    * **Long ASCII** — marker byte ``0x40``, Int32ul total byte length
      (flag + length + payload + NUL), then payload, then NUL.
    * **UTF-16LE** — marker byte ``0x90``, Int32ul total byte length,
      then UTF-16LE payload, then double-NUL terminator (two 0x00 bytes).
    """
    if not s:
        return _EMPTY_SHORT

    try:
        ascii_bytes = s.encode("ascii")
        if len(ascii_bytes) <= 126:
            flag = (len(ascii_bytes) << 1) | 1
            return bytes([flag]) + ascii_bytes + b"\x00"
        # Long ASCII path
        total = 1 + 4 + len(ascii_bytes) + 1     # marker + length + payload + NUL
        return b"\x40" + total.to_bytes(4, "little") + ascii_bytes + b"\x00"
    except UnicodeEncodeError:
        utf16 = s.encode("utf-16-le")
        total = 1 + 4 + len(utf16) + 2           # marker + length + payload + 2 NUL
        return b"\x90" + total.to_bytes(4, "little") + utf16 + b"\x00\x00"


# ===========================================================================
# Self-test (imports should be side-effect-free — gated by __main__)
# ===========================================================================


def _self_test_strings() -> None:
    cases = ["", "Track Title", "A" * 200, "ñoño", "日本語", "Aphex Twin"]
    for s in cases:
        encoded = encode_devicesql(s)
        first = encoded[0]
        if first == 0x90:
            assert s.encode("utf-16-le") in encoded, f"UTF-16 miss: {s!r}"
            variant = "utf16"
        elif first == 0x40:
            assert s.encode("ascii") in encoded, f"long-ascii miss: {s!r}"
            variant = "long"
        else:
            if s:
                assert s.encode("ascii") in encoded, f"short miss: {s!r}"
            variant = "short"
        print(f"OK: {s!r} -> {len(encoded)} bytes (variant={variant}, flag=0x{first:02x})")


def _self_test_structs() -> None:
    # Build a minimal header and roundtrip via parse
    hdr_bytes = PdbHeader.build({
        "unknown1": 0,
        "len_page": 4096,
        "num_tables": 20,
        "next_unused_page": 348,
        "unknown2": 1,
        "sequence": 1,
        "gap": b"\x00" * 4,
    })
    assert len(hdr_bytes) == 28
    parsed = PdbHeader.parse(hdr_bytes)
    assert parsed.len_page == 4096
    assert parsed.num_tables == 20
    print(f"OK: PdbHeader round-trips to {len(hdr_bytes)} bytes")

    ti_bytes = TableInfo.build({"type": 0, "empty_candidate": 347,
                                "first_page": 1, "last_page": 346})
    assert len(ti_bytes) == 16
    print(f"OK: TableInfo is {len(ti_bytes)} bytes")

    ph_bytes = PageHeader.build({
        "page_index": 1, "page_type": 0, "next_page": 2,
        "sequence": 1, "reserved1": 0,
        "row_flags_packed": pack_row_flags(0, 0, 0x24),
        "free_size": 4056, "used_size": 0,
        "transaction_row_count": 0, "transaction_row_index": 0,
        "strange_marker": 0, "history_marker": 0,
    })
    assert len(ph_bytes) == 40, f"PageHeader is {len(ph_bytes)} bytes, want 40"
    parsed = PageHeader.parse(ph_bytes)
    nro, nr, pf = unpack_row_flags(parsed.row_flags_packed)
    assert (nro, nr, pf) == (0, 0, 0x24)
    print(f"OK: PageHeader is {len(ph_bytes)} bytes, bitfields round-trip")


if __name__ == "__main__":
    _self_test_strings()
    _self_test_structs()
