"""Unit tests for folder_scanner (Phase 21-01)."""
from __future__ import annotations

import struct
from pathlib import Path

import pytest

from folder_scanner import (
    AUDIO_EXTS,
    ScannedTrack,
    _mint_content_id,
    _probe_wav_extensible,
    scan_folder,
)


def _touch(path: Path, contents: bytes = b"") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(contents)


def _write_minimal_wav(path: Path, format_code: int = 0x0001) -> None:
    """Write a 44-byte canonical RIFF/WAVE header.

    format_code: 0x0001 = PCM, 0xFFFE = WAVE_FORMAT_EXTENSIBLE.
    """
    # Canonical 16-bit mono 44.1kHz PCM header, then 0 data bytes.
    num_channels = 1
    sample_rate = 44100
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    fmt_chunk_size = 16

    riff = b"RIFF"
    riff_size = struct.pack("<I", 36)  # chunk_size + 36 (8 RIFF + 8 fmt hdr + 16 fmt body + 8 data hdr - 8)
    wave = b"WAVE"
    fmt_hdr = b"fmt "
    fmt_body = struct.pack(
        "<IHHIIHH",
        fmt_chunk_size, format_code, num_channels,
        sample_rate, byte_rate, block_align, bits_per_sample,
    )
    data_hdr = b"data"
    data_size = struct.pack("<I", 0)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(riff)
        f.write(riff_size)
        f.write(wave)
        f.write(fmt_hdr)
        f.write(fmt_body)
        f.write(data_hdr)
        f.write(data_size)


def test_finds_all_audio_extensions(tmp_path: Path) -> None:
    """scan_folder returns ScannedTracks only for files in AUDIO_EXTS."""
    audio_files = [
        tmp_path / "a.mp3",
        tmp_path / "b.aiff",
        tmp_path / "c.aif",
        tmp_path / "d.flac",
        tmp_path / "e.m4a",
        tmp_path / "f.alac",
    ]
    for f in audio_files:
        _touch(f, b"fake audio")

    # Write a WAV with a real header so _probe_wav_extensible doesn't choke
    _write_minimal_wav(tmp_path / "g.wav", format_code=0x0001)

    # Non-audio files — MUST NOT appear in results
    _touch(tmp_path / "notes.txt", b"notes")
    _touch(tmp_path / "cover.jpg", b"jpg")
    _touch(tmp_path / "song.unknown", b"")

    scanned = scan_folder(tmp_path)
    got_suffixes = {Path(s.file_path).suffix.lower() for s in scanned}
    assert got_suffixes == AUDIO_EXTS - {".aif"} | {".aif"}  # sanity: all expected
    assert len(scanned) == 7  # 6 placeholders + 1 wav
    # No .txt / .jpg / .unknown
    assert all(Path(s.file_path).suffix.lower() in AUDIO_EXTS for s in scanned)


def test_skips_hidden_and_macos(tmp_path: Path) -> None:
    """Hidden dirs, __MACOSX, .DS_Store are skipped."""
    _touch(tmp_path / "good.mp3")
    _touch(tmp_path / ".DS_Store")
    _touch(tmp_path / "__MACOSX" / "bad.mp3")
    _touch(tmp_path / ".hidden" / "also_bad.mp3")
    _touch(tmp_path / ".Trash" / "deleted.mp3")

    scanned = scan_folder(tmp_path)
    paths = {Path(s.file_path).name for s in scanned}
    assert paths == {"good.mp3"}


def test_recursive_discovery(tmp_path: Path) -> None:
    """Nested subdirectories are descended into."""
    _touch(tmp_path / "top.mp3")
    _touch(tmp_path / "a" / "mid.mp3")
    _touch(tmp_path / "a" / "b" / "deep.mp3")
    _touch(tmp_path / "a" / "b" / "c" / "deepest.mp3")

    scanned = scan_folder(tmp_path)
    names = {Path(s.file_path).name for s in scanned}
    assert names == {"top.mp3", "mid.mp3", "deep.mp3", "deepest.mp3"}


def test_content_id_deterministic(tmp_path: Path) -> None:
    """Scanning the same folder twice produces identical content_ids."""
    _touch(tmp_path / "a.mp3")
    _touch(tmp_path / "sub" / "b.mp3")

    first = {s.file_path: s.content_id for s in scan_folder(tmp_path)}
    second = {s.file_path: s.content_id for s in scan_folder(tmp_path)}
    assert first == second
    assert all(cid.startswith("import_") for cid in first.values())
    # Length = "import_" (7) + 16 hex chars = 23
    assert all(len(cid) == 23 for cid in first.values())


def test_title_fallback_to_stem(tmp_path: Path) -> None:
    """Files with no readable tags fall back to title = path.stem."""
    # mutagen will fail to parse these fake-audio files; fall back kicks in.
    _touch(tmp_path / "MyFavoriteTrack.mp3", b"not real audio")

    scanned = scan_folder(tmp_path)
    assert len(scanned) == 1
    assert scanned[0].title == "MyFavoriteTrack"
    assert scanned[0].artist == ""
    assert scanned[0].duration_sec == 0


def test_wav_extensible_flagged(tmp_path: Path) -> None:
    """WAV files with WAVE_FORMAT_EXTENSIBLE (0xFFFE) are flagged."""
    pcm_wav = tmp_path / "pcm.wav"
    ext_wav = tmp_path / "extensible.wav"
    _write_minimal_wav(pcm_wav, format_code=0x0001)
    _write_minimal_wav(ext_wav, format_code=0xFFFE)

    assert _probe_wav_extensible(pcm_wav) is False
    assert _probe_wav_extensible(ext_wav) is True

    # End-to-end: scan_folder surfaces the flag
    scanned = {Path(s.file_path).name: s for s in scan_folder(tmp_path)}
    assert scanned["pcm.wav"].wav_extensible is False
    assert scanned["extensible.wav"].wav_extensible is True


def test_mint_content_id_stable() -> None:
    """Content id is deterministic for the same absolute path."""
    p = "/Users/jeet/Music/MixMind-Inbox/artist/track.mp3"
    assert _mint_content_id(p) == _mint_content_id(p)
    assert _mint_content_id(p).startswith("import_")
    # Different path → different id
    assert _mint_content_id(p) != _mint_content_id(p + "x")


def test_scan_folder_raises_on_non_directory(tmp_path: Path) -> None:
    """Passing a file (not a dir) raises NotADirectoryError."""
    target = tmp_path / "regular.txt"
    target.write_text("hi")
    with pytest.raises(NotADirectoryError):
        scan_folder(target)
