"""Unit tests for artwork_extractor.

Fixtures use in-memory PNG → mutagen to build MP3 files with APIC frames on
the fly, so no binary fixtures need to be committed to the repo.
"""
from __future__ import annotations

import ast
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from artwork_extractor import (
    ExtractedArtwork,
    _resize_to_jpeg,
    extract_from_audio,
)


# ---------------------------------------------------------------------------
# Pure re-encoder tests — no audio I/O
# ---------------------------------------------------------------------------


def test_resize_to_80x80_jpeg() -> None:
    src = Image.new("RGB", (500, 500), (255, 0, 0))
    buf = BytesIO()
    src.save(buf, format="PNG")
    out = _resize_to_jpeg(buf.getvalue(), size=80)

    dst = Image.open(BytesIO(out))
    assert dst.size == (80, 80)
    assert dst.format == "JPEG"


def test_resize_to_240x240_jpeg_from_non_square_source() -> None:
    # Non-square source must still yield a 240×240 square output.
    src = Image.new("RGB", (600, 400), (0, 255, 0))
    buf = BytesIO()
    src.save(buf, format="PNG")
    out = _resize_to_jpeg(buf.getvalue(), size=240)

    dst = Image.open(BytesIO(out))
    assert dst.size == (240, 240)
    assert dst.format == "JPEG"


def test_resize_accepts_rgba_source() -> None:
    """Many cover art JPEGs/PNGs carry alpha; our encoder flattens to RGB."""
    src = Image.new("RGBA", (256, 256), (128, 64, 32, 200))
    buf = BytesIO()
    src.save(buf, format="PNG")
    out = _resize_to_jpeg(buf.getvalue(), size=80)

    dst = Image.open(BytesIO(out))
    assert dst.size == (80, 80)
    assert dst.mode in ("RGB", "YCbCr")


def test_resize_output_size_tracks_quality_budget() -> None:
    """80×80 JPEG from a simple source should fit in a few KB."""
    src = Image.new("RGB", (80, 80), (128, 128, 128))
    buf = BytesIO()
    src.save(buf, format="PNG")
    out = _resize_to_jpeg(buf.getvalue(), size=80)
    # Pioneer reference 80×80 files are ~2-4 KB. Flat grey should be ≪.
    assert len(out) < 5000, f"flat-grey 80×80 is {len(out)}B, expected < 5 KB"


# ---------------------------------------------------------------------------
# Extractor dispatch + error handling
# ---------------------------------------------------------------------------


def test_extract_from_nonexistent_file_returns_empty(tmp_path: Path) -> None:
    result = extract_from_audio(tmp_path / "does-not-exist.mp3")
    assert isinstance(result, ExtractedArtwork)
    assert result.primary_small is None
    assert result.primary_medium is None
    assert result.alt_small is None
    assert result.alt_medium is None
    assert not result.has_primary()
    assert not result.has_alt()


def test_extract_from_unsupported_extension_returns_empty(tmp_path: Path) -> None:
    f = tmp_path / "random.txt"
    f.write_text("not audio")
    result = extract_from_audio(f)
    assert isinstance(result, ExtractedArtwork)
    assert not result.has_primary()


def test_extract_from_corrupt_mp3_does_not_raise(tmp_path: Path) -> None:
    """A zero-byte or garbage .mp3 must yield empty artwork, not an exception."""
    f = tmp_path / "garbage.mp3"
    f.write_bytes(b"\x00" * 128)      # not a valid MP3
    result = extract_from_audio(f)
    assert isinstance(result, ExtractedArtwork)
    assert not result.has_primary()


def test_extract_from_mp3_with_apic_primary(tmp_path: Path) -> None:
    """Build a silent MP3 with an APIC frame and confirm extraction."""
    try:
        from mutagen.id3 import ID3, APIC
    except ImportError:
        pytest.skip("mutagen not installed")

    # Minimal MPEG audio frame (1 silent frame) + ID3v2.3 header via mutagen.
    mp3_path = _write_minimal_mp3(tmp_path / "with_apic.mp3")

    # Attach a 200×200 red PNG as cover front (APIC type 3).
    img = Image.new("RGB", (200, 200), (220, 50, 50))
    png_buf = BytesIO()
    img.save(png_buf, format="PNG")
    tags = ID3(str(mp3_path))
    tags.add(
        APIC(
            encoding=3,             # UTF-8
            mime="image/png",
            type=3,                 # 3 = Cover (front)
            desc="cover",
            data=png_buf.getvalue(),
        )
    )
    tags.save(str(mp3_path))

    result = extract_from_audio(mp3_path)
    assert result.has_primary(), "expected primary cover art"
    small = Image.open(BytesIO(result.primary_small))
    medium = Image.open(BytesIO(result.primary_medium))
    assert small.size == (80, 80)
    assert medium.size == (240, 240)
    assert small.format == "JPEG"
    assert medium.format == "JPEG"
    # No alt — only picture_type=3 was embedded.
    assert not result.has_alt()


def test_extract_from_mp3_with_apic_primary_and_alt(tmp_path: Path) -> None:
    """APIC picture_type 3 → primary, picture_type 4 → alt (`b*` bucket)."""
    try:
        from mutagen.id3 import ID3, APIC
    except ImportError:
        pytest.skip("mutagen not installed")

    mp3_path = _write_minimal_mp3(tmp_path / "with_alt.mp3")

    # Cover front (type 3) — green
    front = Image.new("RGB", (180, 180), (50, 200, 80))
    front_buf = BytesIO()
    front.save(front_buf, format="PNG")
    # Cover back (type 4) — blue
    back = Image.new("RGB", (180, 180), (40, 60, 220))
    back_buf = BytesIO()
    back.save(back_buf, format="PNG")

    tags = ID3(str(mp3_path))
    tags.add(APIC(encoding=3, mime="image/png", type=3,
                  desc="front", data=front_buf.getvalue()))
    tags.add(APIC(encoding=3, mime="image/png", type=4,
                  desc="back", data=back_buf.getvalue()))
    tags.save(str(mp3_path))

    result = extract_from_audio(mp3_path)
    assert result.has_primary()
    assert result.has_alt()
    assert Image.open(BytesIO(result.primary_small)).size == (80, 80)
    assert Image.open(BytesIO(result.alt_medium)).size == (240, 240)


# ---------------------------------------------------------------------------
# License regression — artwork_extractor must NEVER import rbox (GPL-3.0)
# ---------------------------------------------------------------------------


def test_no_rbox_imported() -> None:
    src = (Path(__file__).parent.parent / "artwork_extractor.py").read_text()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] != "rbox", (
                    f"artwork_extractor imports {alias.name}"
                )
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] != "rbox", (
                f"artwork_extractor imports from {node.module}"
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_minimal_mp3(path: Path) -> Path:
    """Write a tiny valid-ish MP3 that mutagen's ID3() accepts.

    We don't need playable audio — only an ID3 container. A leading ID3v2.3
    header plus a single MPEG audio frame is enough for mutagen to save
    APIC tags without complaining.
    """
    # "ID3" v2.3 header, 10-byte; extended header off; size 0 (pad to make mutagen happy)
    id3_header = b"ID3\x03\x00\x00\x00\x00\x00\x00"
    # One MPEG-1 Layer 3 frame header (0xFFFB, 128kbps, 44.1kHz, mono stereo)
    # followed by zero payload — player won't decode but tag tools are happy.
    mpeg_frame = b"\xff\xfb\x90\x00" + b"\x00" * 417
    path.write_bytes(id3_header + mpeg_frame)
    return path
