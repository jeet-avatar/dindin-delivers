"""Unit tests for usb_layout.py (pure functions — no I/O)."""
from __future__ import annotations

from pathlib import Path

import pytest

from usb_layout import (
    _TRACK_ID_BASE,
    analyze_path,
    audio_path_on_usb,
    mint_track_id,
    reset_id_counter,
    usbanlz_dir,
)


@pytest.fixture(autouse=True)
def _reset_counter():
    """Each test gets a fresh minting counter."""
    reset_id_counter()


# ---------------------------------------------------------------------------
# mint_track_id
# ---------------------------------------------------------------------------


def test_mint_starts_at_base():
    assert mint_track_id() == _TRACK_ID_BASE
    assert mint_track_id() == _TRACK_ID_BASE + 1


def test_mint_is_unique_across_1500_calls():
    ids = [mint_track_id() for _ in range(1500)]
    assert len(set(ids)) == 1500
    assert ids[0] == _TRACK_ID_BASE
    assert ids[-1] == _TRACK_ID_BASE + 1499


def test_reset_resumes_at_custom_value():
    reset_id_counter(0x20000000)
    assert mint_track_id() == 0x20000000
    assert mint_track_id() == 0x20000001


def test_no_collision_at_high_ids():
    reset_id_counter(0xFFFFFFF0)
    ids = [mint_track_id() for _ in range(10)]
    assert len(set(ids)) == 10


# ---------------------------------------------------------------------------
# analyze_path
# ---------------------------------------------------------------------------


def test_analyze_path_known_ids():
    # 0x10000000: upper 12 bits = 0x100 -> "P100", full = "10000000"
    assert analyze_path(0x10000000) == "P100/10000000"
    # 0x12345678: upper 12 bits = 0x123 -> "P123"
    assert analyze_path(0x12345678) == "P123/12345678"
    # Low bits don't change bucket
    assert analyze_path(0x10000010) == "P100/10000010"


def test_analyze_path_uppercase_bucket_lowercase_full():
    p = analyze_path(0xDEADBEEF)
    bucket, full = p.split("/")
    assert bucket == "PDEA"
    assert full == "deadbeef"


def test_usbanlz_dir(tmp_path):
    d = usbanlz_dir(0x10000000, tmp_path)
    assert d == tmp_path / "PIONEER" / "USBANLZ" / "P100" / "10000000"


# ---------------------------------------------------------------------------
# audio_path_on_usb
# ---------------------------------------------------------------------------


def test_audio_path_on_usb_typical(tmp_path):
    p = audio_path_on_usb("Adam Beyer", "A-Sides, Vol.10", "track01.mp3", tmp_path)
    assert p == tmp_path / "Contents" / "Adam Beyer" / "A-Sides, Vol.10" / "track01.mp3"


def test_audio_path_on_usb_empty_tags_use_unknown_literals(tmp_path):
    assert audio_path_on_usb(None, None, "some.aiff", tmp_path) == (
        tmp_path / "Contents" / "UnknownArtist" / "UnknownAlbum" / "some.aiff"
    )
    assert audio_path_on_usb("", "", "x.mp3", tmp_path) == (
        tmp_path / "Contents" / "UnknownArtist" / "UnknownAlbum" / "x.mp3"
    )


def test_audio_path_on_usb_slash_only_sanitisation(tmp_path):
    p = audio_path_on_usb("Alex O'Rion", "Emergency / Luna", "Emergency.aiff", tmp_path)
    assert p == (
        tmp_path / "Contents" / "Alex O'Rion" / "Emergency _ Luna" / "Emergency.aiff"
    )


def test_audio_path_on_usb_unicode_preserved(tmp_path):
    p = audio_path_on_usb("Panjabi Hit Squad", "Remix 日本語", "song.mp3", tmp_path)
    assert "日本語" in str(p)
    # No hash-encoding / transliteration observed on the reference USB.
    assert str(p).endswith("Panjabi Hit Squad/Remix 日本語/song.mp3")


def test_audio_path_spaces_and_punctuation_preserved(tmp_path):
    p = audio_path_on_usb(
        "Adam Beyer & Cirez D",
        "Live @ Tomorrowland (2024)",
        "01 - Intro.mp3",
        tmp_path,
    )
    assert p.parts[-3] == "Adam Beyer & Cirez D"
    assert p.parts[-2] == "Live @ Tomorrowland (2024)"
    assert p.parts[-1] == "01 - Intro.mp3"
