"""
Rekordbox library loader.

Loads tracks from a Rekordbox XML export (DJ_PLAYLISTS format) using
pyrekordbox. Falls back to xml.etree.ElementTree if pyrekordbox cannot
parse the file.

Public API
----------
load_library_xml(xml_path) -> list[Track]
try_load_library_db()       -> None  (stub; DB implementation deferred)
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from camelot import musical_key_to_camelot

# ---------------------------------------------------------------------------
# Rating normalisation: Rekordbox XML 0-255 scale → 0-5 stars
# pyrekordbox's bidict already maps the exact values, but we implement our
# own bucketed version so we don't depend on the bidict internals.
# Bucket edges (inclusive upper bound): 0→0, ≤51→1, ≤102→2, ≤153→3,
# ≤204→4, ≤255→5.
# ---------------------------------------------------------------------------

_RATING_BUCKETS = [
    (0, 0),
    (51, 1),
    (102, 2),
    (153, 3),
    (204, 4),
    (255, 5),
]


def _normalise_rating(raw: int) -> int:
    """Map a Rekordbox raw rating (0-255) to a 0-5 star value."""
    if raw == 0:
        return 0
    for threshold, stars in _RATING_BUCKETS:
        if threshold == 0:
            continue
        if raw <= threshold:
            return stars
    return 5  # safety net for values > 255


# ---------------------------------------------------------------------------
# Track dataclass
# ---------------------------------------------------------------------------

@dataclass
class Track:
    """Normalised track record used throughout MixMind."""

    content_id: str
    """Unique identifier — TrackID from XML (as string)."""

    source: str
    """Origin of the record: 'xml' or 'db'."""

    title: str
    artist: str
    bpm: float
    key_musical: str
    """Raw musical key from Rekordbox (e.g. 'Am', 'F#')."""

    camelot: str
    """Camelot wheel code derived from key_musical (e.g. '8A', '2B')."""

    rating: int
    """Star rating 0-5 (normalised from Rekordbox 0-255 scale)."""

    duration_sec: int
    """Track duration in whole seconds (TotalTime attribute)."""

    cue_count: int
    """Number of hot cue points (POSITION_MARK elements with raw Type=1)."""

    cue_colors: list[str] = field(default_factory=list)
    """Hex colour strings for each hot cue (same length as cue_count, defaults to #000000 if no color data)."""

    def to_cache(self) -> dict:
        """Serialise to a plain dict suitable for JSON caching."""
        return {
            "content_id": self.content_id,
            "source": self.source,
            "title": self.title,
            "artist": self.artist,
            "bpm": self.bpm,
            "key_musical": self.key_musical,
            "camelot": self.camelot,
            "rating": self.rating,
            "duration_sec": self.duration_sec,
            "cue_count": self.cue_count,
            "cue_colors": self.cue_colors,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _rgb_to_hex(red: str, green: str, blue: str) -> str:
    """Convert Red/Green/Blue string attributes to '#rrggbb' hex."""
    try:
        r, g, b = int(red), int(green), int(blue)
    except (ValueError, TypeError):
        return "#000000"
    return f"#{r:02x}{g:02x}{b:02x}"


def _track_from_xml_element(el: ET.Element) -> Track:
    """Build a Track from a raw <TRACK> ElementTree element."""
    track_id = el.attrib.get("TrackID", "")
    title = el.attrib.get("Name", "")
    artist = el.attrib.get("Artist", "")

    try:
        bpm = float(el.attrib.get("AverageBpm", 0))
    except ValueError:
        bpm = 0.0

    try:
        duration_sec = int(el.attrib.get("TotalTime", 0))
    except ValueError:
        duration_sec = 0

    key_musical = el.attrib.get("Tonality", "")
    camelot = musical_key_to_camelot(key_musical)

    try:
        raw_rating = int(el.attrib.get("Rating", 0))
    except ValueError:
        raw_rating = 0
    rating = _normalise_rating(raw_rating)

    # Hot cues: POSITION_MARK elements where the raw XML Type attribute == "1"
    # (Type="0" is a memory cue; Num >= 0 confirms it is a numbered hot cue,
    #  but we follow the test spec which identifies hot cues purely by Type="1")
    hot_cues = [
        pm for pm in el.findall("POSITION_MARK")
        if pm.attrib.get("Type") == "1"
    ]
    cue_count = len(hot_cues)
    cue_colors = [
        _rgb_to_hex(
            pm.attrib.get("Red", "0"),
            pm.attrib.get("Green", "0"),
            pm.attrib.get("Blue", "0"),
        )
        for pm in hot_cues
    ]

    return Track(
        content_id=str(track_id),
        source="xml",
        title=title,
        artist=artist,
        bpm=bpm,
        key_musical=key_musical,
        camelot=camelot,
        rating=rating,
        duration_sec=duration_sec,
        cue_count=cue_count,
        cue_colors=cue_colors,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_library_xml(xml_path: Path) -> list[Track]:
    """Load tracks from a Rekordbox XML export file.

    Parameters
    ----------
    xml_path:
        Path to the ``DJ_PLAYLISTS`` XML file exported by Rekordbox.

    Returns
    -------
    list[Track]
        One Track per <TRACK> element in the <COLLECTION>.

    Raises
    ------
    FileNotFoundError
        If *xml_path* does not exist on disk.
    """
    xml_path = Path(xml_path)
    if not xml_path.exists():
        raise FileNotFoundError(f"Rekordbox XML not found: {xml_path}")

    # Primary path: use pyrekordbox for parsing.
    # pyrekordbox validates the format and provides typed attribute access.
    # We still read POSITION_MARK colours via the raw _element to access
    # Red/Green/Blue attributes that pyrekordbox doesn't expose as typed getters.
    #
    # Only the import and initial file parse are wrapped in the broad except —
    # programming errors in the per-track loop should raise naturally.
    try:
        from pyrekordbox import RekordboxXml  # type: ignore

        rb_db = RekordboxXml(str(xml_path))
        rb_tracks = rb_db.get_tracks()
    except (ImportError, Exception) as exc:  # noqa: BLE001
        # Fallback: ElementTree parsing when pyrekordbox is not installed or
        # cannot parse the file.
        import warnings
        warnings.warn(
            f"pyrekordbox failed ({exc!r}); falling back to ElementTree parser.",
            RuntimeWarning,
            stacklevel=2,
        )
        return _load_library_xml_elementtree(xml_path)

    # Per-track processing is OUTSIDE the except block so programming errors
    # here raise naturally instead of being silently swallowed.
    tracks: list[Track] = []
    for rb_track in rb_tracks:
        track_id = str(rb_track.get("TrackID", ""))
        title = rb_track.get("Name") or ""
        artist = rb_track.get("Artist") or ""

        bpm_raw = rb_track.get("AverageBpm")
        bpm = float(bpm_raw) if bpm_raw is not None else 0.0

        dur_raw = rb_track.get("TotalTime")
        duration_sec = int(dur_raw) if dur_raw is not None else 0

        key_musical = rb_track.get("Tonality") or ""
        camelot = musical_key_to_camelot(key_musical)

        # pyrekordbox Rating getter maps 255→5 already via its bidict,
        # but only for the exact values. We normalise via our bucketed
        # function for safety (handles non-standard values too).
        raw_rating_str = rb_track._element.attrib.get("Rating", "0")
        try:
            raw_rating_int = int(raw_rating_str)
        except ValueError:
            raw_rating_int = 0
        rating = _normalise_rating(raw_rating_int)

        # Hot cues via raw element (Type attribute "1" in the XML)
        hot_cue_elements = [
            el for el in rb_track._element.findall("POSITION_MARK")
            if el.attrib.get("Type") == "1"
        ]
        cue_count = len(hot_cue_elements)
        # Always emit one color per hot cue — fall back to #000000 if no
        # Red/Green/Blue attributes are present.
        cue_colors = [
            _rgb_to_hex(
                el.attrib.get("Red", "0"),
                el.attrib.get("Green", "0"),
                el.attrib.get("Blue", "0"),
            )
            for el in hot_cue_elements
        ]

        tracks.append(Track(
            content_id=track_id,
            source="xml",
            title=title,
            artist=artist,
            bpm=bpm,
            key_musical=key_musical,
            camelot=camelot,
            rating=rating,
            duration_sec=duration_sec,
            cue_count=cue_count,
            cue_colors=cue_colors,
        ))

    return tracks


def _load_library_xml_elementtree(xml_path: Path) -> list[Track]:
    """ElementTree fallback parser for Rekordbox XML files."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    collection = root.find("COLLECTION")
    if collection is None:
        return []

    return [
        _track_from_xml_element(el)
        for el in collection.findall("TRACK")
    ]


_DB_PATH = Path.home() / "Library" / "Pioneer" / "rekordbox" / "master.db"

# Rekordbox DB stores keys in Camelot notation already — reverse map to musical key
_CAMELOT_TO_MUSICAL: dict[str, str] = {
    "8A": "Am", "9A": "Em", "10A": "Bm", "11A": "F#m", "12A": "C#m",
    "1A": "G#m", "2A": "D#m", "3A": "A#m", "4A": "Fm", "5A": "Cm",
    "6A": "Gm", "7A": "Dm",
    "8B": "C", "9B": "G", "10B": "D", "11B": "A", "12B": "E",
    "1B": "B", "2B": "F#", "3B": "C#", "4B": "G#", "5B": "D#",
    "6B": "A#", "7B": "F",
}

# Pioneer hot cue color palette (ColorTableIndex → hex)
_CUE_COLORS = {
    1: "#EF2B2B", 2: "#F56300", 3: "#F5BE00", 4: "#00C23C",
    5: "#00C2C2", 6: "#0064F5", 7: "#7800C8", 8: "#F500C8",
}


def try_load_library_db() -> Optional[list[Track]]:
    """Load tracks from the local Rekordbox 6/7 master.db.

    Requires pyrekordbox >= 0.4.0 and sqlcipher3.
    Returns None if the DB is unavailable or cannot be decrypted.
    """
    if not _DB_PATH.exists():
        return None

    try:
        from pyrekordbox import Rekordbox6Database
        # Key auto-detected from pyrekordbox cache (run: python -m pyrekordbox download-key)
        db = Rekordbox6Database(str(_DB_PATH))
    except (ImportError, Exception):
        return None

    try:
        raw_tracks = list(db.get_content())
    except Exception:
        return None

    tracks: list[Track] = []
    for t in raw_tracks:
        try:
            camelot = t.KeyName or ""
            key_musical = _CAMELOT_TO_MUSICAL.get(camelot, "")
            bpm = round(t.BPM / 100, 1) if t.BPM else 0.0
            rating = _normalise_rating(t.Rating or 0)
            duration = int(t.Length or 0)
            track_id = str(t.ID)

            hot_cues = [c for c in (t.Cues or []) if c.is_hot_cue]
            cue_colors = [
                _CUE_COLORS.get(c.ColorTableIndex, "#000000")
                for c in hot_cues
            ]

            tracks.append(Track(
                content_id=track_id,
                source="db",
                title=t.Title or "",
                artist=t.ArtistName or "",
                bpm=bpm,
                key_musical=key_musical,
                camelot=camelot,
                rating=rating,
                duration_sec=duration,
                cue_count=len(hot_cues),
                cue_colors=cue_colors,
            ))
        except Exception:
            continue

    return tracks if tracks else None
