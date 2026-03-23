"""Tests for duplicate track detection."""
import pytest
from rekordbox import Track
from duplicates import find_duplicates, DuplicatePair


def _track(id_, title, artist, duration):
    """Helper to create a Track for testing."""
    return Track(
        content_id=id_, source="xml", title=title, artist=artist,
        bpm=128.0, key_musical="Am", camelot="8A", rating=0,
        duration_sec=duration, cue_count=0, cue_colors=[],
    )


def test_exact_title_artist_match_flagged():
    """Two tracks with identical title/artist and similar duration are flagged as duplicates."""
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 400),  # same song, 2s diff
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_fuzzy_title_match_flagged():
    """Tracks with slightly different titles but same artist and duration are flagged."""
    tracks = [
        _track("1", "Afterlife Remix", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 402),
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_different_artists_not_flagged():
    """Tracks with different artists are not flagged as duplicates."""
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Adam Beyer", 402),
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_duration_diff_over_5s_not_flagged():
    """Tracks with duration difference over 5 seconds are not flagged."""
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 410),  # 8s diff → not a dupe
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_duration_exactly_5s_diff_is_flagged():
    """Tracks with duration difference of exactly 5 seconds are flagged."""
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 407),  # exactly 5s → dupe
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_pair_contains_both_track_ids():
    """DuplicatePair contains both track IDs and they are different."""
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 402),
    ]
    pairs = find_duplicates(tracks)
    assert pairs[0].track_a.content_id in {"1", "2"}
    assert pairs[0].track_b.content_id in {"1", "2"}
    assert pairs[0].track_a.content_id != pairs[0].track_b.content_id


def test_no_self_comparison():
    """A single track does not match with itself."""
    tracks = [_track("1", "Afterlife", "Tale Of Us", 402)]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_large_library_no_crash():
    """500 unique tracks should complete without error."""
    # Use very distinct metadata and durations to avoid false positives
    import hashlib
    tracks = [
        _track(
            str(i),
            f"Song {hashlib.md5(str(i).encode()).hexdigest()[:8]}",
            f"Artist {hashlib.md5(str(i*999).encode()).hexdigest()[:8]}",
            240 + (i % 300)  # Vary duration to avoid accidental matches
        )
        for i in range(500)
    ]
    pairs = find_duplicates(tracks)
    # With hash-based titles and varied durations, expect no duplicates
    assert isinstance(pairs, list)
    assert len(pairs) == 0


def test_none_metadata_does_not_crash():
    """Tracks with None title or artist should not crash."""
    tracks = [
        _track("1", None, None, 402),
        _track("2", None, None, 402),
    ]
    pairs = find_duplicates(tracks)
    # Two tracks with identical (empty) metadata and same duration → flagged
    assert isinstance(pairs, list)
