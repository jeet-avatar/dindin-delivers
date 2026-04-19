"""Recursive folder scanner — finds audio files, reads tags via mutagen.

Phase 21-01: Folder importer foundation. Pure-function module, no FastAPI
dependency so it can be unit-tested without spinning up the app.

Design notes
------------
- AUDIO_EXTS is explicit; unknown extensions are silently skipped.
- content_id = f"import_{sha1(abs_path)[:16]}" — deterministic, so re-scanning
  the same folder produces the same ids and UNIQUE(file_path) handles dedupe
  at the DB layer.
- mutagen is used in "easy" mode for tag extraction so MP3/FLAC/M4A all
  return a uniform dict-of-lists. AIFF has no easy mode; we fall back to
  non-easy and pull ID3 frames (TIT2/TPE1/TALB/TCON) if present.
- _probe_wav_extensible walks the RIFF chunks looking for the fmt chunk's
  format_code. 0xFFFE == WAVE_FORMAT_EXTENSIBLE, which CDJ-3000 firmware
  has been observed to refuse on certain USB exports (RESEARCH.md Pitfall 3).
  We flag but don't drop — the user can re-encode if the CDJ refuses.
"""
from __future__ import annotations

import hashlib
import logging
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from mutagen import File as MutagenFile  # type: ignore

logger = logging.getLogger(__name__)

AUDIO_EXTS = {".mp3", ".aiff", ".aif", ".wav", ".flac", ".m4a", ".alac"}

# Directory names that should never be descended into.
_SKIP_DIR_NAMES = {"__MACOSX", ".Trash", ".Spotlight-V100", ".fseventsd"}

# Files to skip regardless of extension match
_SKIP_FILENAMES = {".DS_Store"}


@dataclass
class ScannedTrack:
    """A single audio file discovered during scan_folder()."""
    content_id: str
    file_path: str       # absolute path, resolved
    title: str
    artist: str
    album: str
    genre: str
    duration_sec: int
    bitrate_kbps: int
    sample_rate_hz: int
    file_size_bytes: int
    wav_extensible: bool


def _mint_content_id(abs_path: str) -> str:
    return f"import_{hashlib.sha1(abs_path.encode('utf-8')).hexdigest()[:16]}"


def _is_hidden_path(path: Path) -> bool:
    """True if any path part starts with '.' or is in _SKIP_DIR_NAMES."""
    for part in path.parts:
        if part in _SKIP_DIR_NAMES:
            return True
        if part.startswith(".") and part not in ("/", ""):
            return True
    return False


def _first(value) -> str:
    """mutagen easy-mode returns list[str]. Take [0] or return ''."""
    if value is None:
        return ""
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value)


def _extract_tags(path: Path) -> dict:
    """Read title/artist/album/genre/duration/bitrate/sample_rate via mutagen.

    Fallback strategy: title → path.stem, everything else → '' or 0. Any
    exception from mutagen is logged at WARNING and treated as a tag-less file.
    """
    default = {
        "title": path.stem, "artist": "", "album": "", "genre": "",
        "duration_sec": 0, "bitrate_kbps": 0, "sample_rate_hz": 0,
    }
    try:
        mf = MutagenFile(str(path), easy=True)
        if mf is None:
            # Try non-easy for formats mutagen can't easy-load (some AIFFs)
            mf = MutagenFile(str(path))
            if mf is None:
                return default

        tags = getattr(mf, "tags", None) or {}

        def get(key: str) -> str:
            if hasattr(tags, "get"):
                return _first(tags.get(key))
            return ""

        # easy-mode keys are lowercase; non-easy ID3 frames have TXX codes.
        title = get("title") or get("TIT2")
        artist = get("artist") or get("TPE1")
        album = get("album") or get("TALB")
        genre = get("genre") or get("TCON")

        info = getattr(mf, "info", None)
        duration_sec = int(getattr(info, "length", 0) or 0)
        bitrate_kbps = int((getattr(info, "bitrate", 0) or 0) / 1000)
        sample_rate_hz = int(getattr(info, "sample_rate", 0) or 0)

        return {
            "title": title or path.stem,
            "artist": artist or "",
            "album": album or "",
            "genre": genre or "",
            "duration_sec": duration_sec,
            "bitrate_kbps": bitrate_kbps,
            "sample_rate_hz": sample_rate_hz,
        }
    except Exception as exc:  # noqa: BLE001 — never let a bad file kill the scan
        logger.warning("mutagen failed on %s: %s", path, exc)
        return default


def _probe_wav_extensible(path: Path) -> bool:
    """Return True if the WAV's fmt chunk has format_code 0xFFFE.

    0xFFFE == WAVE_FORMAT_EXTENSIBLE. CDJ-3000 firmware sometimes refuses
    these; callers surface a warning but still import the file.
    Non-WAV files return False unconditionally.
    """
    if path.suffix.lower() not in (".wav", ".wave"):
        return False
    try:
        with open(path, "rb") as f:
            header = f.read(12)
            if len(header) < 12 or header[:4] != b"RIFF" or header[8:12] != b"WAVE":
                return False
            # Walk chunks looking for 'fmt '
            while True:
                hdr = f.read(8)
                if len(hdr) < 8:
                    return False
                chunk_id = hdr[:4]
                chunk_size = struct.unpack("<I", hdr[4:8])[0]
                if chunk_id == b"fmt ":
                    fmt_bytes = f.read(min(chunk_size, 2))
                    if len(fmt_bytes) < 2:
                        return False
                    format_code = struct.unpack("<H", fmt_bytes)[0]
                    return format_code == 0xFFFE
                # Skip past chunk body; chunks are word-aligned
                f.seek(chunk_size + (chunk_size & 1), 1)
    except Exception as exc:  # noqa: BLE001
        logger.debug("WAV probe failed on %s: %s", path, exc)
        return False


def scan_folder(folder: Path) -> list[ScannedTrack]:
    """Recursively scan *folder* for audio files.

    - Skips symlinks, hidden paths, __MACOSX, .DS_Store.
    - Only files whose suffix (case-insensitive) is in AUDIO_EXTS are included.
    - Each file's metadata is extracted via mutagen; failures do not abort
      the scan — those files get their title fallback from path.stem.
    """
    folder = Path(folder).expanduser().resolve()
    if not folder.is_dir():
        raise NotADirectoryError(f"scan_folder: not a directory: {folder}")

    out: list[ScannedTrack] = []
    for path in folder.rglob("*"):
        try:
            if path.is_symlink():
                continue
            if not path.is_file():
                continue
            if path.name in _SKIP_FILENAMES:
                continue
            if _is_hidden_path(path.relative_to(folder)):
                continue
            if path.suffix.lower() not in AUDIO_EXTS:
                continue
        except OSError:
            continue

        abs_path = str(path.resolve())
        try:
            size = path.stat().st_size
        except OSError:
            size = 0

        tags = _extract_tags(path)
        wav_ext = _probe_wav_extensible(path)

        out.append(ScannedTrack(
            content_id=_mint_content_id(abs_path),
            file_path=abs_path,
            title=tags["title"],
            artist=tags["artist"],
            album=tags["album"],
            genre=tags["genre"],
            duration_sec=tags["duration_sec"],
            bitrate_kbps=tags["bitrate_kbps"],
            sample_rate_hz=tags["sample_rate_hz"],
            file_size_bytes=size,
            wav_extensible=wav_ext,
        ))

    return out
