"""Unit tests for artwork_writer — bucket/slot assignment + JPEG writer.

All tests use tmp_path — nothing under /Volumes/Untitled/ is touched
(that tree is the read-only reference oracle and is protected by the
session-scoped sentinel in conftest.py).
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

from artwork_writer import (
    SLOTS_PER_BUCKET,
    artwork_id_for_pdb,
    assign_bucket_slot,
    bucket_dir,
    decode_artwork_id,
    jpeg_path,
    write_track,
)


# ---------------------------------------------------------------------------
# Bucket / slot assignment
# ---------------------------------------------------------------------------


def test_assign_bucket_slot_first_slot_of_first_bucket() -> None:
    # track_index=0 → global slot 1, bucket 1 (file a1.jpg)
    assert assign_bucket_slot(0) == (1, 1)


def test_assign_bucket_slot_last_slot_of_first_bucket() -> None:
    # reference USB: bucket 00001 holds slots 1..19
    assert assign_bucket_slot(18) == (1, 19)


def test_assign_bucket_slot_rollover_to_second_bucket() -> None:
    # reference USB: bucket 00002 holds slots 20..39
    assert assign_bucket_slot(19) == (2, 20)
    assert assign_bucket_slot(38) == (2, 39)
    assert assign_bucket_slot(39) == (3, 40)


def test_assign_bucket_slot_matches_reference_last_bucket() -> None:
    # reference USB: bucket 00046 holds slots 900..908 (current tail)
    assert assign_bucket_slot(899) == (46, 900)
    assert assign_bucket_slot(907) == (46, 908)


def test_assign_bucket_slot_handles_high_track_counts() -> None:
    # 5000-track library (MixMind-Inbox) must not overflow.
    b, s = assign_bucket_slot(5000)
    assert s == 5001                              # global 1-indexed slot
    assert b == (5001 // SLOTS_PER_BUCKET) + 1    # 250 + 1 = 251


def test_assign_bucket_slot_rejects_negative() -> None:
    with pytest.raises(ValueError):
        assign_bucket_slot(-1)


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------


def test_bucket_dir_format(tmp_path: Path) -> None:
    assert bucket_dir(tmp_path, 1) == tmp_path / "PIONEER" / "Artwork" / "00001"
    assert bucket_dir(tmp_path, 46) == tmp_path / "PIONEER" / "Artwork" / "00046"
    assert bucket_dir(tmp_path, 12345) == tmp_path / "PIONEER" / "Artwork" / "12345"


def test_jpeg_path_primary_small(tmp_path: Path) -> None:
    assert (
        jpeg_path(tmp_path, bucket=1, slot=5, group="a", medium=False)
        == tmp_path / "PIONEER" / "Artwork" / "00001" / "a5.jpg"
    )


def test_jpeg_path_primary_medium(tmp_path: Path) -> None:
    assert (
        jpeg_path(tmp_path, bucket=1, slot=5, group="a", medium=True)
        == tmp_path / "PIONEER" / "Artwork" / "00001" / "a5_m.jpg"
    )


def test_jpeg_path_alt_bucket(tmp_path: Path) -> None:
    assert (
        jpeg_path(tmp_path, bucket=3, slot=12, group="b", medium=True)
        == tmp_path / "PIONEER" / "Artwork" / "00003" / "b12_m.jpg"
    )


# ---------------------------------------------------------------------------
# write_track behaviour
# ---------------------------------------------------------------------------


def test_write_track_creates_both_files(tmp_path: Path) -> None:
    small = b"\xff\xd8\xff\xe0" + b"\x00" * 100       # fake JPEG SOI marker
    medium = b"\xff\xd8\xff\xe0" + b"\x01" * 500
    written = write_track(
        tmp_path, bucket=1, slot=1,
        small_bytes=small, medium_bytes=medium, group="a",
    )

    assert len(written) == 2
    assert (tmp_path / "PIONEER/Artwork/00001/a1.jpg").read_bytes() == small
    assert (tmp_path / "PIONEER/Artwork/00001/a1_m.jpg").read_bytes() == medium


def test_write_track_to_alt_group(tmp_path: Path) -> None:
    small = b"\xff\xd8" + b"\x02" * 50
    medium = b"\xff\xd8" + b"\x03" * 200
    write_track(
        tmp_path, bucket=2, slot=7,
        small_bytes=small, medium_bytes=medium, group="b",
    )
    assert (tmp_path / "PIONEER/Artwork/00002/b7.jpg").read_bytes() == small
    assert (tmp_path / "PIONEER/Artwork/00002/b7_m.jpg").read_bytes() == medium


def test_write_track_with_both_none_is_noop(tmp_path: Path) -> None:
    written = write_track(
        tmp_path, bucket=1, slot=1,
        small_bytes=None, medium_bytes=None,
    )
    assert written == []
    # No PIONEER/ tree should be created for a no-op call.
    assert not (tmp_path / "PIONEER").exists()


def test_write_track_small_only(tmp_path: Path) -> None:
    """If only ``small_bytes`` is provided, medium file must NOT be created."""
    written = write_track(
        tmp_path, bucket=1, slot=9,
        small_bytes=b"\xff\xd8" + b"\x00" * 80,
        medium_bytes=None,
    )
    assert len(written) == 1
    assert (tmp_path / "PIONEER/Artwork/00001/a9.jpg").exists()
    assert not (tmp_path / "PIONEER/Artwork/00001/a9_m.jpg").exists()


def test_write_track_creates_intermediate_dirs(tmp_path: Path) -> None:
    """bucket_dir() via mkdir(parents=True) — deep paths must materialise."""
    nested = tmp_path / "sub" / "staging"
    nested.mkdir(parents=True)
    write_track(
        nested, bucket=5, slot=3,
        small_bytes=b"x" * 10, medium_bytes=b"y" * 50,
    )
    assert (nested / "PIONEER/Artwork/00005/a3.jpg").exists()


# ---------------------------------------------------------------------------
# PDB artwork_id encoding
# ---------------------------------------------------------------------------


def test_artwork_id_encoding_round_trips() -> None:
    """(bucket, slot) derived from assign_bucket_slot must round-trip.

    We must pair bucket and slot consistently — bucket = slot // 20 + 1.
    """
    for idx in [0, 18, 19, 38, 907, 5000]:
        bucket, slot = assign_bucket_slot(idx)
        aid = artwork_id_for_pdb(bucket, slot)
        got_bucket, got_slot = decode_artwork_id(aid)
        assert (got_bucket, got_slot) == (bucket, slot), (
            f"round-trip failed for idx={idx}: "
            f"({bucket}, {slot}) → {aid} → ({got_bucket}, {got_slot})"
        )


def test_artwork_id_equals_slot() -> None:
    """artwork_id = global_slot (single-field key)."""
    for idx in [0, 100, 5000]:
        bucket, slot = assign_bucket_slot(idx)
        assert artwork_id_for_pdb(bucket, slot) == slot


def test_artwork_id_never_collides_with_zero_sentinel() -> None:
    # slot is 1-indexed global — smallest id is 1.
    b, s = assign_bucket_slot(0)
    assert artwork_id_for_pdb(b, s) == 1
    assert artwork_id_for_pdb(b, s) != 0
    # decode(0) must return sentinel pair.
    assert decode_artwork_id(0) == (0, 0)


def test_artwork_id_rejects_invalid_inputs() -> None:
    with pytest.raises(ValueError):
        artwork_id_for_pdb(0, 5)
    with pytest.raises(ValueError):
        artwork_id_for_pdb(5, 0)
    with pytest.raises(ValueError):
        # bucket inconsistent with slot (slot 20 → bucket 2, not 1)
        artwork_id_for_pdb(1, 20)


# ---------------------------------------------------------------------------
# License regression
# ---------------------------------------------------------------------------


def test_no_rbox_imported() -> None:
    src = (Path(__file__).parent.parent / "artwork_writer.py").read_text()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] != "rbox", (
                    f"artwork_writer imports {alias.name}"
                )
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] != "rbox", (
                f"artwork_writer imports from {node.module}"
            )


def test_slots_per_bucket_constant() -> None:
    """Reference USB observation (Apr 2026): 20 slots per bucket with GLOBAL
    slot numbering (bucket 00001→slots 1..19, 00002→20..39, …, 00046→900..908).

    Regression guard — plan's original 38-per-bucket assumption was wrong;
    this constant drives assign_bucket_slot()/decode_artwork_id() consistency
    and must track the reference USB forever (or require a data migration).
    """
    assert SLOTS_PER_BUCKET == 20
