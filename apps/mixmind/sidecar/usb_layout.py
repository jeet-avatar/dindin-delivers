"""USB filesystem layout: sequential ID minting + ANLZ path + audio path.

Pioneer-ready USB layout (verified against /Volumes/Untitled/):

    PIONEER/USBANLZ/<Pxxx>/<yyyyyyyy>/ANLZ0000.{DAT,EXT,2EX}
    Contents/<Artist>/<Album>/<original-filename>

where
    Pxxx       = 'P' + upper 12 bits of the track ID as 3-char upper-case hex
    yyyyyyyy   = full 32-bit track ID as 8-char lower-case hex

Track IDs are sequential 32-bit unsigned integers minted starting at
``0x10000000`` to stay well clear of any IDs the user's local Rekordbox library
might have assigned (which starts at 0). See RESEARCH.md Pitfall 8 —
ID collisions between MixMind exports and a prior Rekordbox export on the same
USB silently corrupt the track database.

No I/O here. Pure functions only — easy to unit-test.
"""
from __future__ import annotations

from pathlib import Path
from threading import Lock


_TRACK_ID_BASE = 0x10000000
_id_counter = _TRACK_ID_BASE
_id_lock = Lock()


def reset_id_counter(start: int = _TRACK_ID_BASE) -> None:
    """Reset the in-process counter.

    Used by tests to get deterministic IDs and by ``export_to_usb`` at the
    start of a fresh export so successive exports don't drift.
    """
    global _id_counter
    with _id_lock:
        _id_counter = start


def mint_track_id() -> int:
    """Mint the next sequential track ID. Thread-safe."""
    global _id_counter
    with _id_lock:
        tid = _id_counter
        _id_counter += 1
    return tid


def analyze_path(track_id: int) -> str:
    """Convert a track ID to its CDJ analyze path ``'Pxxx/yyyyyyyy'``.

    * ``Pxxx`` = 'P' + upper 12 bits of ``track_id`` as 3-char UPPER hex
    * ``yyyyyyyy`` = full 32-bit ``track_id`` as 8-char LOWER hex
    """
    bucket = f"P{(track_id >> 20):03X}"
    full = f"{track_id:08x}"
    return f"{bucket}/{full}"


def usbanlz_dir(track_id: int, usb_root: Path) -> Path:
    """Directory containing ANLZ0000.{DAT,EXT,2EX} for one track."""
    return usb_root / "PIONEER" / "USBANLZ" / analyze_path(track_id)


# ---------------------------------------------------------------------------
# Audio path convention (LOCK in 21-04 — see 21-REFERENCE-DATASET.md §"Audio path")
# ---------------------------------------------------------------------------

_UNKNOWN_ARTIST = "UnknownArtist"
_UNKNOWN_ALBUM = "UnknownAlbum"


def _sanitize_path_segment(s: str | None) -> str:
    """Apply Pioneer sanitisation to one path segment.

    Only `/` is substituted with `_` — all other characters (apostrophes,
    spaces, unicode, mix/em-dash/etc.) are preserved verbatim. Observed on
    real reference USB entries like ``"Alex O'Rion/Emergency _ Luna"``.
    """
    if not s:
        return ""
    return s.replace("/", "_")


def audio_path_on_usb(
    artist: str | None,
    album: str | None,
    original_filename: str,
    usb_root: Path,
) -> Path:
    """Return the on-USB destination for one audio file.

    Layout: ``<usb_root>/Contents/<Artist>/<Album>/<original_filename>``.

    * Missing / empty artist tag → ``UnknownArtist`` literal (matches the
      reference USB's ``Contents/UnknownArtist/`` folder).
    * Missing / empty album tag → ``UnknownAlbum`` literal.
    * Original filename is preserved verbatim — the PDB Track row's file_path
      field points here, so any rename breaks CDJ playback.
    * ``/`` → ``_`` substitution only; every other char (apostrophe, space,
      unicode) is kept as-is.
    """
    artist_seg = _sanitize_path_segment(artist) or _UNKNOWN_ARTIST
    album_seg = _sanitize_path_segment(album) or _UNKNOWN_ALBUM
    return usb_root / "Contents" / artist_seg / album_seg / original_filename
