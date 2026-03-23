"""
Duplicate track detection using fuzzy string matching + duration check.

Both conditions required for a match:
  1. rapidfuzz token_sort_ratio(title+artist, title+artist) >= 85
  2. abs(duration_a - duration_b) <= 5 seconds
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

from rapidfuzz import fuzz

from rekordbox import Track

SIMILARITY_THRESHOLD = 85
DURATION_TOLERANCE_SECS = 5


@dataclass
class DuplicatePair:
    """Represents a pair of tracks detected as duplicates."""

    track_a: Track
    track_b: Track
    similarity_score: float


def _fingerprint(track: Track) -> str:
    """Combine title and artist for fuzzy comparison."""
    return f"{(track.title or '').lower().strip()} {(track.artist or '').lower().strip()}"


def find_duplicates(tracks: list[Track]) -> list[DuplicatePair]:
    """Return all pairs of tracks that are likely duplicates.

    Parameters
    ----------
    tracks : list[Track]
        List of Track objects to analyze.

    Returns
    -------
    list[DuplicatePair]
        All pairs matching both criteria:
        - Fuzzy title+artist similarity >= 85%
        - Duration difference <= 5 seconds
    """
    pairs = []
    for a, b in combinations(tracks, 2):
        score = fuzz.token_sort_ratio(_fingerprint(a), _fingerprint(b))
        if score < SIMILARITY_THRESHOLD:
            continue
        if abs(a.duration_sec - b.duration_sec) > DURATION_TOLERANCE_SECS:
            continue
        pairs.append(DuplicatePair(track_a=a, track_b=b, similarity_score=score))
    return pairs
