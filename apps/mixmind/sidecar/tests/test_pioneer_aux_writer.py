"""Task 4 — Pioneer aux file writer byte-equivalence tests.

Verifies each aux writer emits the exact reference bytes (size + SHA256)
and that ``write_all()`` materialises the expected layout under the USB
root. Reference USB comparison tests skip cleanly when the USB isn't
mounted (read-only sentinel in conftest guards against any mutation).
"""
from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from pioneer_aux_writer import (
    write_all,
    write_devsetting,
    write_djmmysetting,
    write_mysetting,
    write_mysetting2,
    write_rbfltr,
)


_REF_USB = Path("/Volumes/Untitled")
_REF_PIONEER = _REF_USB / "PIONEER"
_REF_RBOX = _REF_PIONEER / "rekordbox"


# ---------------------------------------------------------------------------
# Expected sizes (per CDJ-3000 firmware parsers — single-byte drift = boot fail)
# ---------------------------------------------------------------------------


EXPECTED_SIZES = {
    "RBFLTR.DAT": 232,
    "DEVSETTING.DAT": 140,
    "MYSETTING.DAT": 148,
    "MYSETTING2.DAT": 148,
    "DJMMYSETTING.DAT": 272,
}


def _sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


# ---------------------------------------------------------------------------
# Size invariants — always runnable, no USB required
# ---------------------------------------------------------------------------


def test_rbfltr_size(tmp_path: Path) -> None:
    out = tmp_path / "RBFLTR.DAT"
    write_rbfltr(out)
    assert out.stat().st_size == 232


def test_devsetting_size(tmp_path: Path) -> None:
    out = tmp_path / "DEVSETTING.DAT"
    write_devsetting(out)
    assert out.stat().st_size == 140


def test_mysetting_size(tmp_path: Path) -> None:
    out = tmp_path / "MYSETTING.DAT"
    write_mysetting(out)
    assert out.stat().st_size == 148


def test_mysetting2_size(tmp_path: Path) -> None:
    out = tmp_path / "MYSETTING2.DAT"
    write_mysetting2(out)
    assert out.stat().st_size == 148


def test_djmmysetting_size(tmp_path: Path) -> None:
    out = tmp_path / "DJMMYSETTING.DAT"
    write_djmmysetting(out)
    assert out.stat().st_size == 272


# ---------------------------------------------------------------------------
# write_all() layout — creates canonical Pioneer paths
# ---------------------------------------------------------------------------


def test_write_all_produces_canonical_layout(tmp_path: Path) -> None:
    written = write_all(tmp_path)
    assert len(written) == 5

    by_name = {p.name: p for p in written}
    # RBFLTR sits under rekordbox/; the other four sit at PIONEER/
    assert by_name["RBFLTR.DAT"].parent == tmp_path / "PIONEER" / "rekordbox"
    for name in ("DEVSETTING.DAT", "MYSETTING.DAT",
                 "MYSETTING2.DAT", "DJMMYSETTING.DAT"):
        assert by_name[name].parent == tmp_path / "PIONEER", (
            f"{name} should live at PIONEER/, not {by_name[name].parent}"
        )

    for name, expected_size in EXPECTED_SIZES.items():
        assert by_name[name].stat().st_size == expected_size


def test_write_all_omits_djprofile_nxs(tmp_path: Path) -> None:
    """djprofile.nxs contains owner PII — must NEVER be written."""
    write_all(tmp_path)
    forbidden = tmp_path / "PIONEER" / "djprofile.nxs"
    assert not forbidden.exists(), (
        "djprofile.nxs must not be written — it contains user PII"
    )


# ---------------------------------------------------------------------------
# Reference byte-equivalence — skips cleanly when USB is unmounted
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    not _REF_USB.exists(),
    reason="Reference USB /Volumes/Untitled not mounted",
)
def test_rbfltr_bytes_match_reference(tmp_path: Path) -> None:
    ref = _REF_RBOX / "RBFLTR.DAT"
    out = tmp_path / "RBFLTR.DAT"
    write_rbfltr(out)
    assert _sha256(out) == _sha256(ref), "RBFLTR.DAT SHA mismatch vs reference"
    assert out.read_bytes() == ref.read_bytes()


@pytest.mark.skipif(
    not _REF_USB.exists(),
    reason="Reference USB /Volumes/Untitled not mounted",
)
def test_devsetting_bytes_match_reference(tmp_path: Path) -> None:
    ref = _REF_PIONEER / "DEVSETTING.DAT"
    out = tmp_path / "DEVSETTING.DAT"
    write_devsetting(out)
    assert _sha256(out) == _sha256(ref)
    assert out.read_bytes() == ref.read_bytes()


@pytest.mark.skipif(
    not _REF_USB.exists(),
    reason="Reference USB /Volumes/Untitled not mounted",
)
def test_mysetting_bytes_match_reference(tmp_path: Path) -> None:
    ref = _REF_PIONEER / "MYSETTING.DAT"
    out = tmp_path / "MYSETTING.DAT"
    write_mysetting(out)
    assert _sha256(out) == _sha256(ref)
    assert out.read_bytes() == ref.read_bytes()


@pytest.mark.skipif(
    not _REF_USB.exists(),
    reason="Reference USB /Volumes/Untitled not mounted",
)
def test_mysetting2_bytes_match_reference(tmp_path: Path) -> None:
    ref = _REF_PIONEER / "MYSETTING2.DAT"
    out = tmp_path / "MYSETTING2.DAT"
    write_mysetting2(out)
    assert _sha256(out) == _sha256(ref)
    assert out.read_bytes() == ref.read_bytes()


@pytest.mark.skipif(
    not _REF_USB.exists(),
    reason="Reference USB /Volumes/Untitled not mounted",
)
def test_djmmysetting_bytes_match_reference(tmp_path: Path) -> None:
    ref = _REF_PIONEER / "DJMMYSETTING.DAT"
    out = tmp_path / "DJMMYSETTING.DAT"
    write_djmmysetting(out)
    assert _sha256(out) == _sha256(ref)
    assert out.read_bytes() == ref.read_bytes()


# ---------------------------------------------------------------------------
# License regression — pioneer_aux_writer.py must not import rbox
# ---------------------------------------------------------------------------


def test_no_rbox_imported_in_aux_writer() -> None:
    import ast
    source = Path(__file__).parent.parent / "pioneer_aux_writer.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] != "rbox"
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] != "rbox"
