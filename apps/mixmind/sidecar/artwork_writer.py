"""Pioneer artwork bucket/slot assignment and JPEG file writer.

File layout (observed on reference USB ``/Volumes/Untitled/PIONEER/Artwork/``)::

    PIONEER/Artwork/<5-digit-bucket>/
    ├── a1.jpg        # slot 1, primary cover, 80x80 small
    ├── a1_m.jpg      # slot 1, primary cover, 240x240 medium
    ├── a2.jpg, a2_m.jpg, ...
    ├── b1.jpg, b1_m.jpg, ...    # slot 1, alt (picture_type 4) art
    └── ...
    (reference: 46 buckets, max 38 slots per bucket = 38 a-pairs + 38 b-pairs)

CRITICAL — naming convention (21-REFERENCE-DATASET.md authoritative):
- bare ``a<n>.jpg``  = 80x80 small
- ``a<n>_m.jpg``     = 240x240 medium   (NOT a thumbnail — ``_m`` = medium)
- ``b<n>``           = alt/secondary art bucket (picture_type 4)

License: MIT — no mutagen, no Pillow, no rbox. Pure stdlib I/O.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal, Optional


# ===========================================================================
# Constants
# ===========================================================================


SLOTS_PER_BUCKET = 38
"""Observed max on reference USB. Determines the bucket/slot wrap-over point."""

ArtGroup = Literal["a", "b"]


# ===========================================================================
# Assignment algorithm (deterministic, order-preserving)
# ===========================================================================


def assign_bucket_slot(track_index_with_art: int) -> tuple[int, int]:
    """Map a 0-based artwork-bearing track index to ``(bucket, slot)``.

    Both bucket and slot are 1-indexed. Only tracks that actually have
    embedded artwork should be counted — ``track_index_with_art=0`` maps to
    ``(1, 1)``; unartworked tracks skip the counter and get ``artwork_id=0``
    in their PDB row.

    Examples
    --------
    >>> assign_bucket_slot(0)
    (1, 1)
    >>> assign_bucket_slot(37)
    (1, 38)
    >>> assign_bucket_slot(38)
    (2, 1)
    """
    if track_index_with_art < 0:
        raise ValueError(
            f"track_index_with_art must be >= 0, got {track_index_with_art}"
        )
    bucket = (track_index_with_art // SLOTS_PER_BUCKET) + 1
    slot = (track_index_with_art % SLOTS_PER_BUCKET) + 1
    return bucket, slot


# ===========================================================================
# Path helpers
# ===========================================================================


def bucket_dir(artwork_root: Path, bucket: int) -> Path:
    """Directory for a given bucket under the staging / USB root.

    ``artwork_root`` is typically the staging dir or USB root — we append
    ``PIONEER/Artwork/<5-digit-bucket>`` ourselves.
    """
    return Path(artwork_root) / "PIONEER" / "Artwork" / f"{bucket:05d}"


def jpeg_path(
    artwork_root: Path,
    bucket: int,
    slot: int,
    group: ArtGroup = "a",
    medium: bool = False,
) -> Path:
    """Full path for a given slot variant.

    ``medium=False`` → ``a<slot>.jpg`` (80×80)
    ``medium=True``  → ``a<slot>_m.jpg`` (240×240)
    """
    suffix = "_m" if medium else ""
    return bucket_dir(artwork_root, bucket) / f"{group}{slot}{suffix}.jpg"


# ===========================================================================
# Writer
# ===========================================================================


def write_track(
    artwork_root: Path,
    bucket: int,
    slot: int,
    small_bytes: Optional[bytes],
    medium_bytes: Optional[bytes],
    group: ArtGroup = "a",
) -> list[Path]:
    """Write one track's artwork pair (small + medium) into a bucket slot.

    Either byte arg may be ``None`` (rare — the extractor always produces
    both when any art was found). If both are ``None``, this is a no-op and
    no bucket directory is created.

    Returns the list of paths that were written (possibly empty).
    """
    if small_bytes is None and medium_bytes is None:
        return []

    written: list[Path] = []
    d = bucket_dir(artwork_root, bucket)
    d.mkdir(parents=True, exist_ok=True)

    if small_bytes is not None:
        p = jpeg_path(artwork_root, bucket, slot, group, medium=False)
        p.write_bytes(small_bytes)
        written.append(p)
    if medium_bytes is not None:
        p = jpeg_path(artwork_root, bucket, slot, group, medium=True)
        p.write_bytes(medium_bytes)
        written.append(p)
    return written


# ===========================================================================
# PDB artwork_id encoding
# ===========================================================================


def artwork_id_for_pdb(bucket: int, slot: int) -> int:
    """Compute the Track-row ``artwork_id`` for the PDB Tracks table.

    Encoding rationale:
    The PDB Tracks table stores ``artwork_id`` as an ``Int32ul`` (see
    ``pdb_structs.TrackRow.artwork_id``). The Artwork table on the reference
    USB stores an ``id`` that, when non-zero, maps 1:1 to a file on disk
    under ``PIONEER/Artwork/<bucket>/a<slot>{,_m}.jpg``.

    There is no public documentation for the exact bucket/slot ↔ id bit
    layout. We pack ``(bucket, slot)`` into the low 24 bits as::

        artwork_id = (bucket << 8) | slot

    - Low byte = slot (1..38, well under 0xFF)
    - Next two bytes = bucket (up to 65535, observed 46 on reference)
    - High byte = 0

    This keeps the value unique per physical file AND lets the PDB reader
    (and Phase 21-05 QA) recover bucket/slot trivially:
    ``bucket = id >> 8``, ``slot = id & 0xFF``.
    ``artwork_id = 0`` stays the "no artwork" sentinel (bucket 0 / slot 0 is
    never assigned because ``assign_bucket_slot(0) == (1, 1)``).
    """
    if bucket < 1 or slot < 1:
        raise ValueError(
            f"bucket and slot are 1-indexed; got bucket={bucket} slot={slot}"
        )
    if slot > 0xFF:
        raise ValueError(f"slot {slot} overflows low byte (max 0xFF)")
    return (bucket << 8) | (slot & 0xFF)


def decode_artwork_id(artwork_id: int) -> tuple[int, int]:
    """Inverse of :func:`artwork_id_for_pdb` — useful for the PDB reader
    and Phase 21-05 acceptance tests."""
    if artwork_id <= 0:
        return 0, 0
    bucket = artwork_id >> 8
    slot = artwork_id & 0xFF
    return bucket, slot
