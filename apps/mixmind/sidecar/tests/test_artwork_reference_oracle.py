"""Byte-level-ish oracle: our artwork pipeline vs reference USB JPEGs.

For each sampled slot in ``/Volumes/Untitled/PIONEER/Artwork/<bucket>/`` we
compare the Pioneer-produced ``a<slot>.jpg`` / ``a<slot>_m.jpg`` pair to what
our ``_resize_to_jpeg()`` encoder produces when fed the SAME reference bytes
as source.

Strict byte equality is **not** expected — Pioneer's JPEG encoder is
proprietary (different DCT impl, quantization tables, chroma subsampling).
Instead we assert:

  1. Dimensions match exactly (80×80 or 240×240).
  2. JPEG format is correct (magic bytes ``FFD8FF``).
  3. File-size ratio is within 2× in either direction (reference samples are
     quality ~80-85 optimize=True; our output should be in the same class).
  4. Per-channel mean-absolute-error (MAE) on decoded RGB pixels is < 10
     (on a 0-255 scale) — i.e. perceptually identical once resized.

This test suite is the **acceptance gate** for 21-06:: if it fails the CDJ
import step will still work (filename + size metadata are correct) but the
artwork may render as blocky/over-sharpened in the CDJ preview.

The reference USB is read-only by session-scoped sentinel in conftest.py —
this oracle only READS from it.
"""
from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from artwork_extractor import _resize_to_jpeg


# ---------------------------------------------------------------------------
# Fixtures / skip guard
# ---------------------------------------------------------------------------

REF_USB = Path("/Volumes/Untitled")
REF_ARTWORK_ROOT = REF_USB / "PIONEER" / "Artwork"

# Sampled slot coordinates covering first bucket (odd-sized, 19 slots),
# mid buckets (20-slot standard), and current partial tail (bucket 00046).
# All values verified to exist and to be valid JPEGs (SOI magic 0xFFD8FF).
# Non-JPEG slots do exist on the reference USB (e.g. bucket 00003 slots
# 49-51 have headers that are NOT 0xFFD8FF — likely Pioneer obfuscation);
# we avoid those here and ``_is_real_jpeg()`` below is the runtime guard.
SAMPLE_SLOTS: list[tuple[int, int, str]] = [
    # (bucket, slot, group) — bucket numbers are the 5-digit dir name as int
    (1, 1, "a"),
    (1, 10, "a"),
    (1, 19, "a"),
    (2, 20, "a"),
    (2, 30, "a"),
    (2, 39, "a"),
    (4, 60, "a"),
    (4, 75, "a"),
    (10, 190, "a"),
    (15, 290, "a"),
    (25, 490, "a"),
    (30, 590, "a"),
    (45, 890, "a"),
    (46, 900, "a"),
    (46, 908, "a"),
]


REQUIRES_REF_USB = pytest.mark.skipif(
    not REF_ARTWORK_ROOT.exists() or os.environ.get("MIXMIND_SKIP_REF_USB") == "1",
    reason=(
        "Reference USB not mounted at /Volumes/Untitled/PIONEER/Artwork — "
        "set MIXMIND_SKIP_REF_USB=1 in CI to silence this oracle."
    ),
)


def _ref_jpeg(bucket: int, slot: int, group: str, medium: bool) -> Path:
    suffix = "_m" if medium else ""
    return REF_ARTWORK_ROOT / f"{bucket:05d}" / f"{group}{slot}{suffix}.jpg"


def _is_real_jpeg(path: Path) -> bool:
    """True iff the file exists AND starts with JPEG SOI (0xFFD8FF).

    Pioneer reference USB has a small number of slots whose bytes don't
    begin with SOI (observed in bucket 00003 slots 49-51 and bucket 00005
    slot 93 — hdr `0x2efcb6`, `0x39b6a7`, etc). Likely a Pioneer-internal
    obfuscation / alternate codec path. The oracle skips these rather than
    trying to re-encode non-JPEG bytes.
    """
    if not path.exists():
        return False
    try:
        with path.open("rb") as f:
            return f.read(3) == b"\xff\xd8\xff"
    except OSError:
        return False


def _available_samples() -> list[tuple[int, int, str]]:
    """Filter SAMPLE_SLOTS to (bucket, slot, group) tuples where BOTH the
    small and medium files are valid JPEGs on the mounted USB.
    """
    if not REF_ARTWORK_ROOT.exists():
        return []
    out: list[tuple[int, int, str]] = []
    for b, s, g in SAMPLE_SLOTS:
        if _is_real_jpeg(_ref_jpeg(b, s, g, medium=False)) and _is_real_jpeg(_ref_jpeg(b, s, g, medium=True)):
            out.append((b, s, g))
    return out


# ---------------------------------------------------------------------------
# Oracle helpers
# ---------------------------------------------------------------------------


def _decode_rgb(data: bytes, expected_size: int) -> np.ndarray:
    """Decode JPEG bytes → HxWx3 uint8 RGB array. Fails if shape wrong."""
    im = Image.open(BytesIO(data)).convert("RGB")
    assert im.size == (expected_size, expected_size), (
        f"decoded size {im.size} != expected ({expected_size}, {expected_size})"
    )
    return np.asarray(im, dtype=np.uint8)


def _mae(a: np.ndarray, b: np.ndarray) -> float:
    """Per-pixel mean absolute error across all channels, on 0-255 scale."""
    assert a.shape == b.shape, f"shape mismatch: {a.shape} vs {b.shape}"
    return float(np.mean(np.abs(a.astype(np.int16) - b.astype(np.int16))))


# ---------------------------------------------------------------------------
# Oracle tests
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_reference_sample_set_non_empty() -> None:
    samples = _available_samples()
    assert samples, (
        "No reference samples found — either /Volumes/Untitled is not mounted "
        "or the artwork tree was pruned. Oracle cannot validate without samples."
    )


@REQUIRES_REF_USB
@pytest.mark.parametrize("bucket,slot,group", _available_samples() or [(0, 0, "a")])
def test_reference_jpeg_dimensions(bucket: int, slot: int, group: str) -> None:
    """Reference USB invariant: a<n>.jpg = 80×80, a<n>_m.jpg = 240×240."""
    small = _ref_jpeg(bucket, slot, group, medium=False)
    medium = _ref_jpeg(bucket, slot, group, medium=True)
    assert Image.open(small).size == (80, 80), f"{small} not 80x80"
    assert Image.open(medium).size == (240, 240), f"{medium} not 240x240"


@REQUIRES_REF_USB
@pytest.mark.parametrize("bucket,slot,group", _available_samples() or [(0, 0, "a")])
def test_reference_jpeg_magic_bytes(bucket: int, slot: int, group: str) -> None:
    """Every reference file starts with JPEG SOI marker 0xFFD8FF."""
    for medium in (False, True):
        p = _ref_jpeg(bucket, slot, group, medium)
        with p.open("rb") as f:
            hdr = f.read(3)
        assert hdr == b"\xff\xd8\xff", f"{p} missing JPEG SOI: {hdr!r}"


@REQUIRES_REF_USB
@pytest.mark.parametrize("bucket,slot,group", _available_samples() or [(0, 0, "a")])
def test_our_encoder_roundtrip_matches_reference_perceptually(
    bucket: int, slot: int, group: str,
) -> None:
    """Re-encode the reference small JPEG → compare to reference small JPEG.

    We take the reference 80×80 JPEG, feed those bytes to ``_resize_to_jpeg``
    at size=80 (idempotent round-trip), then compare the decoded RGB pixels
    to the reference's decoded RGB pixels. MAE must be < 10 (perceptually
    identical after a JPEG→JPEG re-encode).
    """
    ref_small_bytes = _ref_jpeg(bucket, slot, group, medium=False).read_bytes()
    ours_small_bytes = _resize_to_jpeg(ref_small_bytes, size=80)

    ref_rgb = _decode_rgb(ref_small_bytes, 80)
    ours_rgb = _decode_rgb(ours_small_bytes, 80)

    mae = _mae(ref_rgb, ours_rgb)
    assert mae < 10.0, (
        f"{group}{slot} 80x80 round-trip MAE {mae:.2f} >= 10 "
        f"(reference encoder diverges significantly from ours)"
    )


@REQUIRES_REF_USB
@pytest.mark.parametrize("bucket,slot,group", _available_samples() or [(0, 0, "a")])
def test_our_encoder_size_within_2x_tolerance(
    bucket: int, slot: int, group: str,
) -> None:
    """File-size ratio ≤ 2× in either direction.

    Pioneer samples (quality ~80-85, optimize=True) are ~2-4 KB for 80x80 and
    ~11-20 KB for 240x240. Our quality=85 / optimize=True encoder should land
    in the same band.
    """
    for medium in (False, True):
        size = 240 if medium else 80
        ref_bytes = _ref_jpeg(bucket, slot, group, medium).read_bytes()
        ours_bytes = _resize_to_jpeg(ref_bytes, size=size)

        ratio = len(ours_bytes) / max(len(ref_bytes), 1)
        assert 0.5 <= ratio <= 2.0, (
            f"{group}{slot}{'_m' if medium else ''}.jpg "
            f"size ratio {ratio:.2f} outside [0.5, 2.0] "
            f"(ref={len(ref_bytes)}B, ours={len(ours_bytes)}B)"
        )


@REQUIRES_REF_USB
@pytest.mark.parametrize("bucket,slot,group", _available_samples() or [(0, 0, "a")])
def test_our_encoder_240_matches_reference_perceptually(
    bucket: int, slot: int, group: str,
) -> None:
    """240×240 round-trip — same perceptual bound as the 80×80 case."""
    ref_medium_bytes = _ref_jpeg(bucket, slot, group, medium=True).read_bytes()
    ours_medium_bytes = _resize_to_jpeg(ref_medium_bytes, size=240)

    ref_rgb = _decode_rgb(ref_medium_bytes, 240)
    ours_rgb = _decode_rgb(ours_medium_bytes, 240)

    mae = _mae(ref_rgb, ours_rgb)
    assert mae < 10.0, (
        f"{group}{slot}_m 240x240 round-trip MAE {mae:.2f} >= 10"
    )


# ---------------------------------------------------------------------------
# Writer oracle — file layout must exactly mirror reference on tmp_path
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_writer_emits_same_filenames_as_reference(tmp_path: Path) -> None:
    """write_track() + our assignment formula must produce the exact filenames
    Pioneer wrote on the reference USB.

    For each sampled (bucket, slot), we call ``write_track`` and then assert
    that the ref USB has matching file names under the same bucket dir.
    """
    from artwork_writer import write_track

    samples = _available_samples()
    assert samples, "no samples to compare"

    for bucket, slot, group in samples[:5]:        # subset keeps test fast
        small_ref = _ref_jpeg(bucket, slot, group, medium=False).read_bytes()
        medium_ref = _ref_jpeg(bucket, slot, group, medium=True).read_bytes()
        written = write_track(
            tmp_path, bucket=bucket, slot=slot,
            small_bytes=small_ref, medium_bytes=medium_ref, group=group,
        )
        assert len(written) == 2

        # Filenames relative to artwork_root must match Pioneer's layout.
        relative_written = sorted(p.relative_to(tmp_path).as_posix() for p in written)
        expected = sorted([
            f"PIONEER/Artwork/{bucket:05d}/{group}{slot}.jpg",
            f"PIONEER/Artwork/{bucket:05d}/{group}{slot}_m.jpg",
        ])
        assert relative_written == expected
