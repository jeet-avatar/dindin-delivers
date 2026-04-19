"""Pioneer artwork bucket/slot assignment and JPEG file writer.

File layout (observed on reference USB ``/Volumes/Untitled/PIONEER/Artwork/``)::

    PIONEER/Artwork/<5-digit-bucket>/
    ├── a1.jpg        # slot 1 (global), primary cover, 80x80 small
    ├── a1_m.jpg      # slot 1 (global), primary cover, 240x240 medium
    ├── a2.jpg, a2_m.jpg, ...
    ├── b1.jpg, b1_m.jpg, ...    # slot 1, alt (picture_type 4) art
    └── ...

CRITICAL — slot numbering is GLOBAL, not bucket-relative (verified Apr 2026
against ``/Volumes/Untitled/PIONEER/Artwork/`` by enumerating 46 buckets):

    Bucket 00001  →  slots  1..19   (19 slots — first bucket is irregular)
    Bucket 00002  →  slots 20..39   (20 slots, formula holds thereafter)
    Bucket 00003  →  slots 40..59
    ...
    Bucket 00046  →  slots 900..908 (9 slots — current tail, partial)

So the bucket/slot formula is::

    global_slot = track_index_with_art + 1     # 1-indexed global slot
    bucket      = global_slot // SLOTS_PER_BUCKET + 1
    (where SLOTS_PER_BUCKET = 20 per reference observation)

The plan's original assumption (38 slots per bucket, per-bucket slot reset)
was a misreading of the handoff — reference data shows 20 slots per bucket
with GLOBAL slot numbering. This module uses the verified-from-reference
convention so the PDB Track.artwork_id round-trips correctly.

Naming convention (21-REFERENCE-DATASET.md authoritative):
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


SLOTS_PER_BUCKET = 20
"""Reference USB observation (Apr 2026):

Bucket 00002..00045 each hold exactly 20 unique ``a<slot>`` pairs.
Bucket 00001 holds 19 slots (slot 0 reserved/unused on Pioneer).
Bucket 00046 holds 9 slots (current tail of a live 908-slot library).

This constant drives :func:`assign_bucket_slot` which uses a GLOBAL slot
numbering scheme — the plan's original "38 per bucket with per-bucket
reset" assumption was wrong (Rule 1 deviation).
"""

ArtGroup = Literal["a", "b"]


# ===========================================================================
# Assignment algorithm (deterministic, order-preserving)
# ===========================================================================


def assign_bucket_slot(track_index_with_art: int) -> tuple[int, int]:
    """Map a 0-based artwork-bearing track index to ``(bucket, global_slot)``.

    Slot numbering is GLOBAL (1..N across the whole library), not reset per
    bucket. Bucket number is derived from the slot::

        global_slot = track_index_with_art + 1
        bucket      = global_slot // SLOTS_PER_BUCKET + 1   # SLOTS_PER_BUCKET = 20

    This matches the Pioneer reference USB layout:

        track_index_with_art = 0   → (bucket=1, slot=1)    # file a1.jpg
        track_index_with_art = 18  → (bucket=1, slot=19)   # file a19.jpg
        track_index_with_art = 19  → (bucket=2, slot=20)   # file a20.jpg
        track_index_with_art = 38  → (bucket=2, slot=39)
        track_index_with_art = 39  → (bucket=3, slot=40)
        ...
        track_index_with_art = 907 → (bucket=46, slot=908)

    Only tracks that actually have embedded artwork should increment the
    counter — unartworked tracks keep ``artwork_id=0`` in their PDB row and
    the next artworked track takes the next global slot.
    """
    if track_index_with_art < 0:
        raise ValueError(
            f"track_index_with_art must be >= 0, got {track_index_with_art}"
        )
    global_slot = track_index_with_art + 1
    bucket = (global_slot // SLOTS_PER_BUCKET) + 1
    return bucket, global_slot


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

    Because reference USB uses GLOBAL slot numbering and bucket = slot // 20,
    the slot alone uniquely identifies the physical artwork file:
    ``PIONEER/Artwork/<slot//20 + 1 : 05d>/a<slot>.jpg``.

    Encoding::

        artwork_id = global_slot      # 1-indexed, 1..~65000 fits Int32ul

    The PDB Tracks table stores ``artwork_id`` as an ``Int32ul`` (see
    ``pdb_structs.TrackRow.artwork_id``). Using the global slot directly:

    - Fits easily in Int32ul (up to 4.29G slots; we're nowhere near that)
    - One-field key — no bit-packing ambiguity
    - Decode is trivial: ``bucket = slot // 20 + 1``
    - ``artwork_id = 0`` stays the "no artwork" sentinel (slot 0 never
      assigned because ``assign_bucket_slot(0)`` returns ``slot=1``)

    Matches what a PDB reader (21-05 acceptance) needs to locate the
    artwork file from just the Track row.
    """
    if bucket < 1 or slot < 1:
        raise ValueError(
            f"bucket and slot are 1-indexed; got bucket={bucket} slot={slot}"
        )
    expected_bucket = (slot // SLOTS_PER_BUCKET) + 1
    if bucket != expected_bucket:
        raise ValueError(
            f"bucket {bucket} inconsistent with slot {slot} "
            f"(expected bucket {expected_bucket})"
        )
    return slot


def decode_artwork_id(artwork_id: int) -> tuple[int, int]:
    """Inverse of :func:`artwork_id_for_pdb` — useful for the PDB reader
    and Phase 21-05 acceptance tests.

    Returns ``(0, 0)`` for the no-artwork sentinel.
    """
    if artwork_id <= 0:
        return 0, 0
    slot = artwork_id
    bucket = (slot // SLOTS_PER_BUCKET) + 1
    return bucket, slot
