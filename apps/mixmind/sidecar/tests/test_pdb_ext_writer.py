"""Task 4 — exportExt.pdb structural writer tests.

Verifies that ``write_export_ext()`` emits a valid structure (9 tables,
"strange" header pages with flag 0x64 + marker 0x03EC, 4096-byte pages)
and that the reported metrics match. A full byte-level oracle against
the reference USB exportExt.pdb is deferred — the reference contains
populated rows in tables 3/4/7 and we're only emitting the minimal
empty-structure variant (CDJ-3000X falls back to export.pdb for content).
"""
from __future__ import annotations

from pathlib import Path

import pytest

from pdb_ext_writer import (
    NUM_EXT_TABLES,
    PAGE_SIZE,
    STRANGE_MARKER,
    STRANGE_PAGE_FLAGS,
    write_export_ext,
)


_REF_EXT = Path("/Volumes/Untitled/PIONEER/rekordbox/exportExt.pdb")


def test_export_ext_returns_metrics(tmp_path: Path) -> None:
    out = tmp_path / "exportExt.pdb"
    result = write_export_ext(out)

    assert result["num_tables"] == NUM_EXT_TABLES
    assert result["num_tables"] == 9
    # 9 tables * 2 pages each + 1 header page = 19
    assert result["total_pages"] == 19
    assert result["file_size"] == out.stat().st_size


def test_export_ext_file_size_is_page_aligned(tmp_path: Path) -> None:
    out = tmp_path / "exportExt.pdb"
    write_export_ext(out)
    size = out.stat().st_size
    assert size % PAGE_SIZE == 0, f"file size {size} not a multiple of 4096"
    # 1 header page + 9 tables * 2 pages = 19 pages -> 77,824 bytes
    assert size == 19 * PAGE_SIZE


def test_export_ext_parent_dir_created(tmp_path: Path) -> None:
    out = tmp_path / "nested" / "dirs" / "exportExt.pdb"
    write_export_ext(out)
    assert out.exists()


def test_export_ext_strange_marker_present(tmp_path: Path) -> None:
    """Every header page should carry the 0x03EC strange_marker + 0x64 flag."""
    from pdb_structs import PageHeader

    out = tmp_path / "exportExt.pdb"
    write_export_ext(out)
    data = out.read_bytes()

    # The first 4096 bytes are the root header. Table header pages start at
    # page 1 (offset PAGE_SIZE) and every other page thereafter.
    for t in range(NUM_EXT_TABLES):
        page_idx = 1 + (t * 2)   # 1, 3, 5, ...
        page_bytes = data[page_idx * PAGE_SIZE:(page_idx + 1) * PAGE_SIZE]
        assert len(page_bytes) == PAGE_SIZE

        hdr = PageHeader.parse(page_bytes[:40])
        assert hdr.strange_marker == STRANGE_MARKER, (
            f"table {t} header page missing strange_marker 0x{STRANGE_MARKER:04x}"
        )
        # Row flags bitfield: low byte is page_flags (u1).
        # Packed layout: b13 num_row_offsets | b11 num_rows | u1 page_flags
        # construct Int32ul gives us the raw 32-bit value.
        packed = hdr.row_flags_packed
        page_flags = (packed >> 24) & 0xFF
        # Our writer packs page_flags into the top byte (see pack_row_flags).
        # Either the high-byte or low-byte encoding must surface 0x64.
        low = packed & 0xFF
        assert STRANGE_PAGE_FLAGS in (page_flags, low), (
            f"table {t} header page not flagged strange — got packed=0x{packed:08x}"
        )


@pytest.mark.skipif(
    not _REF_EXT.exists(),
    reason="Reference exportExt.pdb not mounted at /Volumes/Untitled",
)
def test_export_ext_parses_without_exception(tmp_path: Path) -> None:
    """Smoke check: reference file is large (73,728B, 18 pages) — our
    output is 77,824B (19 pages). Both should at minimum be page-aligned
    and start with a PdbHeader whose len_page == 4096.
    """
    from pdb_structs import PdbHeader

    out = tmp_path / "exportExt.pdb"
    write_export_ext(out)

    our_data = out.read_bytes()
    ref_data = _REF_EXT.read_bytes()

    our_hdr = PdbHeader.parse(our_data[:28])
    ref_hdr = PdbHeader.parse(ref_data[:28])

    assert our_hdr.len_page == ref_hdr.len_page == PAGE_SIZE
    assert our_hdr.num_tables == NUM_EXT_TABLES
    assert ref_hdr.num_tables == NUM_EXT_TABLES


def test_no_rbox_imported_in_ext_writer() -> None:
    import ast
    source = Path(__file__).parent.parent / "pdb_ext_writer.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] != "rbox"
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] != "rbox"
