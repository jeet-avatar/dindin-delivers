"""exportExt.pdb writer — extension tables for CDJ-3000X forward-compat.

The reference file at /Volumes/Untitled/PIONEER/rekordbox/exportExt.pdb is
73,728 bytes (18 pages) with 9 tables (types 0..8). Most tables on the
reference ship 0 rows — the structure exists so CDJ-3000X firmware can
discover the file; actual row content is populated only for a subset of
tables (3, 4, 7 in the reference, holding references to extended beat
grid / cue colour / memory cue data).

This writer emits a minimally-conforming exportExt.pdb: 9 tables, each
with a "strange" header page (flag=0x64, strange_marker=0x03ec, 0 rows).
CDJ-3000 ignores this file entirely. CDJ-3000X reads it; with 0 rows,
it falls back to the legacy export.pdb data — which is what MixMind v1
wants for forward-compat without dual-maintaining two data sources.

A follow-up plan can populate extension rows once the row layout is
reverse-engineered byte-level against the reference.

License: MIT. No rbox.
"""
from __future__ import annotations

from pathlib import Path

from pdb_structs import (
    PageHeader,
    PdbHeader,
    TableInfo,
    pack_row_flags,
)

PAGE_SIZE = 4096
NUM_EXT_TABLES = 9          # reference has 9 tables (types 0..8)
STRANGE_PAGE_FLAGS = 0x64   # reference uses 0x64 for every header page
STRANGE_MARKER = 0x03EC     # reference value


def write_export_ext(out_path: Path) -> dict:
    """Write a minimally-structural ``exportExt.pdb``.

    Returns a dict with ``file_size`` and ``total_pages`` for the caller's
    progress/telemetry.
    """
    # Each of the 9 tables gets one "header page" plus one placeholder
    # "data page" reachable via empty_candidate. That matches the reference
    # pattern (pages 1/2 for table 0, 3/4 for table 1, etc.).
    pages: list[bytes] = []

    table_first: list[int] = []   # per-table first_page (1-indexed)
    for t in range(NUM_EXT_TABLES):
        first = len(pages) + 1                # +1 for header page 0
        table_first.append(first)

        # Header page: strange, 0 rows
        pages.append(_build_strange_header_page(
            page_type=t, page_index=first, next_page=first + 1,
        ))
        # Empty data page (ready for future rows)
        pages.append(_build_empty_data_page(
            page_type=t, page_index=first + 1,
        ))

    total_pages = len(pages) + 1

    # Header
    header_bytes = PdbHeader.build({
        "unknown1": 0,
        "len_page": PAGE_SIZE,
        "num_tables": NUM_EXT_TABLES,
        "next_unused_page": total_pages,
        "unknown2": 1,
        "sequence": 1,
        "gap": b"\x00" * 4,
    })

    table_info_blob = b""
    for t in range(NUM_EXT_TABLES):
        first = table_first[t]
        # last_page = first (only the header page is "primary"; data page
        # starts at first+1 and is owned by empty_candidate).
        table_info_blob += TableInfo.build({
            "type": t,
            "empty_candidate": first + 1,
            "first_page": first,
            "last_page": first,
        })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(header_bytes)
        f.write(table_info_blob)
        pad = PAGE_SIZE - (len(header_bytes) + len(table_info_blob))
        if pad < 0:
            raise ValueError(
                f"Header + table info exceed {PAGE_SIZE} bytes"
            )
        f.write(b"\x00" * pad)

        for p in pages:
            assert len(p) == PAGE_SIZE
            f.write(p)

    return {
        "file_size": out_path.stat().st_size,
        "total_pages": total_pages,
        "num_tables": NUM_EXT_TABLES,
    }


def _build_strange_header_page(
    page_type: int, page_index: int, next_page: int,
) -> bytes:
    """Build a 'strange' (0x64-flagged) table header page with 0 rows."""
    return PageHeader.build({
        "page_index": page_index,
        "page_type": page_type,
        "next_page": next_page,
        "sequence": 1,
        "reserved1": 0,
        "row_flags_packed": pack_row_flags(
            num_row_offsets=0, num_rows=0,
            page_flags=STRANGE_PAGE_FLAGS,
        ),
        "free_size": 0,
        "used_size": 0,
        "transaction_row_count": 0,
        "transaction_row_index": 0,
        "strange_marker": STRANGE_MARKER,
        "history_marker": 0,
    }) + b"\x00" * (PAGE_SIZE - 40)


def _build_empty_data_page(page_type: int, page_index: int) -> bytes:
    """Build a fully-empty data page (all zero post-header)."""
    return PageHeader.build({
        "page_index": page_index,
        # Reference uses page_type=0 for the follow-on empty pages
        # (see exportExt.pdb page 2/4/6/12/14 in the inventory).
        "page_type": 0,
        "next_page": 0,
        "sequence": 0,
        "reserved1": 0,
        "row_flags_packed": pack_row_flags(0, 0, 0),
        "free_size": 0,
        "used_size": 0,
        "transaction_row_count": 0,
        "transaction_row_index": 0,
        "strange_marker": 0,
        "history_marker": 0,
    }) + b"\x00" * (PAGE_SIZE - 40)
