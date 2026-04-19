"""Minimal PDB reader — pure parser for symmetric round-trip validation.

This exists because pyrekordbox does NOT parse PDB files. pyrekordbox.db6
reads master.db (SQLCipher); ``anlz`` reads ANLZ0000.{DAT,EXT,2EX}; but
there is no PDB parser in the stack. The writer+reader pair form a matched
set validated by symmetry: the reader is the ONLY independent check of the
writer in our test suite.

Scope: structural sanity — page alignment, header fields, table info block,
per-table page chain traversal, row offset decoding. Full row-content
parsing is intentionally out of scope (that's what the reference oracle
test in Task 5 validates byte-for-byte against /Volumes/Untitled/).

Spec: https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/exports.html
License: MIT (uses only the ``construct`` library + Deep Symmetry public spec).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pdb_structs import (
    PageHeader,
    PdbHeader,
    TableInfo,
    unpack_row_flags,
)


PAGE_SIZE = 4096
NUM_TABLES = 20


@dataclass
class ParsedTable:
    """One TableInfo entry resolved against the page map."""

    type: int
    first_page: int
    last_page: int
    empty_candidate: int


@dataclass
class ParsedPage:
    """One 4096-byte page with its header + decoded row offsets."""

    page_index: int
    page_type: int
    next_page: int
    num_rows: int
    num_row_offsets: int
    page_flags: int
    used_size: int
    free_size: int
    row_offsets: list[int]   # absolute row-start offsets inside the page (post-header)


@dataclass
class ParsedPdb:
    """In-memory shape of a parsed export.pdb."""

    len_page: int
    num_tables: int
    next_unused_page: int
    sequence: int
    tables: list[ParsedTable]
    pages: dict[int, ParsedPage]    # page_index -> ParsedPage

    def pages_for_table(self, page_type: int) -> list[ParsedPage]:
        """Follow the next_page chain starting from TableInfo.first_page."""
        matches = [t for t in self.tables if t.type == page_type]
        if not matches:
            return []
        t = matches[0]
        out: list[ParsedPage] = []
        idx = t.first_page
        seen: set[int] = set()
        while idx and idx in self.pages and idx not in seen:
            seen.add(idx)
            p = self.pages[idx]
            out.append(p)
            if idx == t.last_page:
                break
            idx = p.next_page
        return out

    def row_count(self, page_type: int) -> int:
        """Sum of num_rows across all pages in the given table's chain."""
        return sum(p.num_rows for p in self.pages_for_table(page_type))


def read_pdb(path: Path) -> ParsedPdb:
    """Parse a PDB file into a ParsedPdb structure.

    Raises ValueError for any structural violation (bad page size, wrong
    number of tables, page overflow, etc.).
    """
    raw = Path(path).read_bytes()
    if len(raw) % PAGE_SIZE != 0:
        raise ValueError(f"File size {len(raw)} is not page-aligned ({PAGE_SIZE})")
    if len(raw) < PAGE_SIZE:
        raise ValueError("File smaller than one page — not a valid PDB")

    # ---- Header page (index 0) ----
    hdr = PdbHeader.parse(raw[:28])
    if hdr.len_page != PAGE_SIZE:
        raise ValueError(f"PdbHeader.len_page={hdr.len_page}, expected {PAGE_SIZE}")
    if hdr.num_tables != NUM_TABLES:
        raise ValueError(
            f"PdbHeader.num_tables={hdr.num_tables}, expected {NUM_TABLES}"
        )

    tables: list[ParsedTable] = []
    cursor = 28
    for _ in range(hdr.num_tables):
        ti = TableInfo.parse(raw[cursor:cursor + 16])
        tables.append(ParsedTable(
            type=ti.type, first_page=ti.first_page,
            last_page=ti.last_page, empty_candidate=ti.empty_candidate,
        ))
        cursor += 16

    # ---- Remaining pages ----
    pages: dict[int, ParsedPage] = {}
    total_pages = len(raw) // PAGE_SIZE
    for p_idx in range(1, total_pages):
        start = p_idx * PAGE_SIZE
        page_bytes = raw[start:start + PAGE_SIZE]
        ph = PageHeader.parse(page_bytes[:40])
        nro, nrows, pflags = unpack_row_flags(ph.row_flags_packed)

        # Row-group footer sits at END of page, growing backward.
        # Each group = 16 × Int16ul offsets + 2 × Int16ul flags = 36 bytes.
        num_groups = (nrows + 15) // 16 if nrows else 0
        row_offsets: list[int] = []
        for g in range(num_groups):
            # Group g's footer block start (from end of page)
            group_start = PAGE_SIZE - (g + 1) * 36
            group_bytes = page_bytes[group_start:group_start + 32]  # 16 × u16
            # Rows stored reversed (highest first) → un-reverse
            raw_offsets = [
                int.from_bytes(group_bytes[i * 2:i * 2 + 2], "little")
                for i in range(16)
            ]
            raw_offsets.reverse()   # lowest index first
            base = g * 16
            for i in range(16):
                row_idx = base + i
                if row_idx < nrows:
                    row_offsets.append(raw_offsets[i])

        pages[ph.page_index] = ParsedPage(
            page_index=ph.page_index,
            page_type=ph.page_type,
            next_page=ph.next_page,
            num_rows=nrows,
            num_row_offsets=nro,
            page_flags=pflags,
            used_size=ph.used_size,
            free_size=ph.free_size,
            row_offsets=row_offsets,
        )

    return ParsedPdb(
        len_page=hdr.len_page,
        num_tables=hdr.num_tables,
        next_unused_page=hdr.next_unused_page,
        sequence=hdr.sequence,
        tables=tables,
        pages=pages,
    )
