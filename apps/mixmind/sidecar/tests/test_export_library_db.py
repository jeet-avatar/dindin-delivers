"""Task 4 — exportLibrary.db deferral verification.

The reference OneLibrary file at
``/Volumes/Untitled/PIONEER/rekordbox/exportLibrary.db`` is
**SQLCipher-encrypted** (header: ``0d5ad2b9304f8768...``), NOT plain
SQLite as the original plan assumed. The decryption key is NOT the
pyrekordbox master.db key — all obvious candidates fail with
"file is not a database".

Until the key is reverse-engineered, we don't write the file.
CDJ-3000X firmware falls back to ``export.pdb`` when OneLibrary is
missing, and CDJ-3000 ignores the file entirely. These tests pin that
contract so the module stays demonstrably inert.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from export_library_db import write as write_export_library_db


_REF_ONELIB = Path("/Volumes/Untitled/PIONEER/rekordbox/exportLibrary.db")


def test_write_returns_deferred_status(tmp_path: Path) -> None:
    out = tmp_path / "exportLibrary.db"
    result = write_export_library_db(out)

    assert isinstance(result, dict)
    assert result["status"] == "deferred"
    assert "SQLCipher" in result["reason"]
    assert str(out) in result["path"]


def test_write_does_not_create_file(tmp_path: Path) -> None:
    """Critical invariant: until we have the encryption key, writing an
    empty or bogus exportLibrary.db would be WORSE than omitting it — a
    CDJ-3000X that encounters a malformed OneLibrary file may refuse to
    fall back to export.pdb.
    """
    out = tmp_path / "exportLibrary.db"
    write_export_library_db(out)
    assert not out.exists(), (
        "exportLibrary.db must NOT be written until SQLCipher key is known"
    )


def test_write_accepts_tracks_and_playlists_kwargs(tmp_path: Path) -> None:
    """Signature stability — callers can be migrated atomically later."""
    out = tmp_path / "exportLibrary.db"
    result = write_export_library_db(
        out,
        tracks=[{"id": 1}, {"id": 2}],
        playlists=[{"id": 10, "name": "test"}],
    )
    assert result["status"] == "deferred"
    assert not out.exists()


@pytest.mark.skipif(
    not _REF_ONELIB.exists(),
    reason="Reference exportLibrary.db not mounted at /Volumes/Untitled",
)
def test_reference_file_is_sqlcipher_not_sqlite() -> None:
    """Pin the discovery for future engineers.

    If Pioneer ever ships an unencrypted OneLibrary (they won't), this
    assertion will flip — which IS the signal to un-defer this module.
    """
    head = _REF_ONELIB.read_bytes()[:16]
    sqlite_magic = b"SQLite format 3\x00"
    assert head != sqlite_magic, (
        "exportLibrary.db appears to be plain SQLite — "
        "un-defer export_library_db.py and implement the writer"
    )
    # SQLCipher files start with an encrypted page; pyrekordbox's
    # attempt with the master.db key failed, so this byte pattern is
    # expected to remain opaque until a firmware-image key is extracted.
    assert head[:2] != b"SQ", "header looks too text-like — re-investigate"


def test_no_rbox_imported_in_export_library_db() -> None:
    import ast
    source = Path(__file__).parent.parent / "export_library_db.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] != "rbox"
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] != "rbox"
