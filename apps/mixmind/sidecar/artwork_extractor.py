"""Extract embedded album art from audio files for CDJ USB export.

Returns small (80×80) and medium (240×240) square JPEGs — CDJ-3000 uses both
sizes (80×80 on the browser list, 240×240 on the full-view / preview screen).

Supported formats
-----------------
- MP3 / AIFF : ID3v2 APIC frames
      * picture_type == 3 → primary ``a<slot>.jpg`` bucket
      * picture_type == 4 → alt ``b<slot>.jpg`` bucket
- FLAC       : native PICTURE blocks (same picture_type values)
- MP4 / M4A  : iTunes-style ``covr`` atoms (at most 2 covers)
- WAV        : best-effort ID3 chunk (rare)

Returns ``ExtractedArtwork()`` with all fields ``None`` when the file has no
embedded art — the caller then sets the PDB Track row ``artwork_id = 0``.

License posture
---------------
- ``Pillow`` — HPND (permissive, OK for closed-source distribution).
- ``mutagen`` — GPL-2.0-or-later. Already a ``requirements.txt`` dep from
  Plan 21-01; documented for a pre-distribution license audit in
  ``.planning/phases/21-.../deferred-items.md``.

Stdlib ``struct`` parsers are a viable fallback if mutagen's license ever
blocks commercial distribution — not implemented here because mutagen is
already shipping and rewriting the tag parsers is out of 21-06 scope.
"""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
except ImportError as e:     # pragma: no cover — hard dep guard
    raise RuntimeError(
        "Pillow is required for artwork extraction (pip install Pillow>=10)"
    ) from e


# ===========================================================================
# Public dataclass
# ===========================================================================


@dataclass
class ExtractedArtwork:
    """Four-variant artwork payload for one track.

    - ``primary_small`` / ``primary_medium``: 80×80 / 240×240 JPEGs for
      ``PIONEER/Artwork/<bucket>/a<slot>{,_m}.jpg``.
    - ``alt_small``     / ``alt_medium``    : same, for the ``b<slot>`` bucket.
      Populated only when the audio file carries a second APIC/COVR picture
      (picture_type 4 on ID3/FLAC, second ``covr`` entry on MP4).
    """

    primary_small: Optional[bytes] = None
    primary_medium: Optional[bytes] = None
    alt_small: Optional[bytes] = None
    alt_medium: Optional[bytes] = None

    def has_primary(self) -> bool:
        return self.primary_small is not None or self.primary_medium is not None

    def has_alt(self) -> bool:
        return self.alt_small is not None or self.alt_medium is not None


# ===========================================================================
# Public API
# ===========================================================================


def extract_from_audio(audio_path: Path) -> ExtractedArtwork:
    """Extract embedded artwork from an audio file.

    Dispatches by file extension. Any read / parse error yields an empty
    ``ExtractedArtwork()`` — no exceptions bubble out (the exporter must
    survive tag-less or corrupt files gracefully).
    """
    audio_path = Path(audio_path)
    if not audio_path.exists() or not audio_path.is_file():
        return ExtractedArtwork()

    ext = audio_path.suffix.lower()
    try:
        if ext in (".mp3", ".aiff", ".aif"):
            primary, alt = _extract_from_id3(audio_path)
        elif ext == ".flac":
            primary, alt = _extract_from_flac(audio_path)
        elif ext in (".m4a", ".mp4"):
            primary, alt = _extract_from_mp4(audio_path)
        elif ext == ".wav":
            primary, alt = _extract_from_wav(audio_path)
        else:
            return ExtractedArtwork()
    except Exception:       # noqa: BLE001 — extractor must never crash the export
        return ExtractedArtwork()

    result = ExtractedArtwork()
    if primary is not None:
        try:
            result.primary_small = _resize_to_jpeg(primary, size=80)
            result.primary_medium = _resize_to_jpeg(primary, size=240)
        except Exception:       # noqa: BLE001 — bad image data → skip track
            return ExtractedArtwork()
    if alt is not None:
        try:
            result.alt_small = _resize_to_jpeg(alt, size=80)
            result.alt_medium = _resize_to_jpeg(alt, size=240)
        except Exception:       # noqa: BLE001 — alt failures demote to primary-only
            result.alt_small = None
            result.alt_medium = None
    return result


# ===========================================================================
# Re-encoder
# ===========================================================================


def _resize_to_jpeg(src: bytes, size: int) -> bytes:
    """Resize source image bytes to a square ``(size × size)`` JPEG.

    Pioneer reference JPEG characteristics (observed on
    ``/Volumes/Untitled/PIONEER/Artwork/00001/a1{,_m}.jpg``):
      - JFIF 1.01, baseline, 8-bit precision, 3 components (YCbCr)
      - 80×80 files: ~2-4 KB (quality ≈ 80-85)
      - 240×240 files: ~11-20 KB (quality ≈ 80-85)

    We use ``quality=85`` + ``optimize=True`` + ``progressive=False`` which
    tracks the reference within the ≤2× size tolerance asserted by the oracle
    in ``tests/test_artwork_reference_oracle.py``.
    """
    im = Image.open(BytesIO(src))
    im = im.convert("RGB")
    im = im.resize((size, size), Image.LANCZOS)
    buf = BytesIO()
    im.save(
        buf, format="JPEG",
        quality=85, optimize=True, progressive=False,
    )
    return buf.getvalue()


# ===========================================================================
# Per-format extractors — mutagen is optional at runtime
# ===========================================================================


def _extract_from_id3(path: Path) -> tuple[Optional[bytes], Optional[bytes]]:
    """MP3 / AIFF — ID3 APIC frames.

    picture_type 3 → primary cover
    picture_type 4 → back cover / alt art (``b*`` bucket)
    """
    try:
        import mutagen.id3
    except ImportError:
        return None, None

    try:
        # ID3() works for both MP3 and AIFF ID3 chunks. File() is more
        # permissive but returns FileType objects whose `tags` attribute
        # may be None; ID3() raises cleanly on no-tag files.
        tags = mutagen.id3.ID3(str(path))
    except Exception:
        return None, None

    primary: Optional[bytes] = None
    alt: Optional[bytes] = None
    for apic in tags.getall("APIC"):
        pt = getattr(apic, "type", None)
        data = bytes(apic.data) if apic.data else None
        if data is None:
            continue
        if pt == 3 and primary is None:
            primary = data
        elif pt == 4 and alt is None:
            alt = data
    # If no type-3 found but the tag set has any cover, use the first as primary.
    if primary is None:
        for apic in tags.getall("APIC"):
            if apic.data:
                primary = bytes(apic.data)
                break
    return primary, alt


def _extract_from_flac(path: Path) -> tuple[Optional[bytes], Optional[bytes]]:
    try:
        import mutagen.flac
    except ImportError:
        return None, None

    try:
        f = mutagen.flac.FLAC(str(path))
    except Exception:
        return None, None

    primary: Optional[bytes] = None
    alt: Optional[bytes] = None
    for pic in getattr(f, "pictures", []) or []:
        data = bytes(pic.data) if pic.data else None
        if data is None:
            continue
        if pic.type == 3 and primary is None:
            primary = data
        elif pic.type == 4 and alt is None:
            alt = data
    if primary is None:
        for pic in getattr(f, "pictures", []) or []:
            if pic.data:
                primary = bytes(pic.data)
                break
    return primary, alt


def _extract_from_mp4(path: Path) -> tuple[Optional[bytes], Optional[bytes]]:
    try:
        import mutagen.mp4
    except ImportError:
        return None, None

    try:
        f = mutagen.mp4.MP4(str(path))
    except Exception:
        return None, None

    covers = f.get("covr") or []
    if not covers:
        return None, None
    primary = bytes(covers[0]) if len(covers) >= 1 else None
    alt = bytes(covers[1]) if len(covers) >= 2 else None
    return primary, alt


def _extract_from_wav(path: Path) -> tuple[Optional[bytes], Optional[bytes]]:
    """WAV — best effort ID3 chunk. Most WAVs have no art; return empties."""
    try:
        import mutagen.wave
    except ImportError:
        return None, None

    try:
        f = mutagen.wave.WAVE(str(path))
    except Exception:
        return None, None

    tags = getattr(f, "tags", None)
    if tags is None or not hasattr(tags, "getall"):
        return None, None

    primary: Optional[bytes] = None
    alt: Optional[bytes] = None
    try:
        for apic in tags.getall("APIC"):
            data = bytes(apic.data) if apic.data else None
            if data is None:
                continue
            if getattr(apic, "type", None) == 3 and primary is None:
                primary = data
            elif getattr(apic, "type", None) == 4 and alt is None:
                alt = data
    except Exception:
        return None, None
    return primary, alt
