"""
Camelot Wheel mapping from musical key string to alphanumeric code.
Source: verified from https://dj.studio/blog/camelot-wheel and Rekordbox conventions.
"""

_CAMELOT_MAP: dict[str, str] = {
    # Major keys (B suffix)
    "C":   "8B",
    "G":   "9B",
    "D":   "10B",
    "A":   "11B",
    "E":   "12B",
    "B":   "1B",
    "F#":  "2B",
    "C#":  "3B",
    "G#":  "4B",
    "D#":  "5B",
    "A#":  "6B",
    "F":   "7B",
    # Minor keys (A suffix)
    "Am":  "8A",
    "Em":  "9A",
    "Bm":  "10A",
    "F#m": "11A",
    "C#m": "12A",
    "G#m": "1A",
    "D#m": "2A",
    "A#m": "3A",
    "Fm":  "4A",
    "Cm":  "5A",
    "Gm":  "6A",
    "Dm":  "7A",
}


def musical_key_to_camelot(key: str) -> str:
    """Convert a musical key string (e.g. 'Am', 'F#') to Camelot notation (e.g. '8A', '2B').
    Returns '?' for unknown keys."""
    return _CAMELOT_MAP.get(key, "?")
