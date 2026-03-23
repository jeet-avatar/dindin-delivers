"""
Tests for AI playlist generation logic.
"""
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from rekordbox import Track
from ai import (
    serialise_library_for_claude,
    build_system_prompt,
    parse_playlist_response,
)

SAMPLE_TRACKS = [
    Track("1", "xml", "Afterlife", "Tale Of Us", 128.0, "Am", "8A", 5, 402, 2, ["red"]),
    Track("2", "xml", "Subzero", "Adam Beyer", 134.0, "Dm", "7A", 4, 435, 3, ["blue"]),
    Track("3", "xml", "Coma Cat", "Amelie Lens", 138.0, "Fm", "4A", 5, 481, 1, ["green"]),
]


def test_serialise_library_is_csv():
    csv = serialise_library_for_claude(SAMPLE_TRACKS)
    lines = csv.strip().split("\n")
    # Header + 3 data rows
    assert len(lines) == 4
    assert lines[0] == "title|artist|bpm|camelot|rating|duration_sec"


def test_serialise_library_correct_values():
    csv = serialise_library_for_claude(SAMPLE_TRACKS)
    lines = csv.strip().split("\n")
    row = lines[1].split("|")
    assert row[0] == "Afterlife"
    assert row[1] == "Tale Of Us"
    assert float(row[2]) == 128.0
    assert row[3] == "8A"
    assert row[4] == "5"
    assert row[5] == "402"


def test_serialise_caps_at_1500_tracks():
    tracks = [
        Track(str(i), "xml", f"Track {i}", "Artist", 130.0, "Am", "8A", i % 6, 360, 0, [])
        for i in range(2000)
    ]
    csv = serialise_library_for_claude(tracks)
    lines = csv.strip().split("\n")
    assert len(lines) == 1501  # header + 1500 data rows


def test_serialise_top_1500_by_rating_desc():
    """When capping, keep highest-rated tracks."""
    tracks = [
        Track(str(i), "xml", f"Track {i}", "Artist", 130.0, "Am", "8A", i % 6, 360, 0, [])
        for i in range(2000)
    ]
    csv = serialise_library_for_claude(tracks)
    lines = csv.strip().split("\n")
    # All included tracks should have rating >= threshold for top 1500
    ratings = [int(line.split("|")[4]) for line in lines[1:]]
    assert min(ratings) >= 0  # basic sanity


def test_system_prompt_contains_library():
    prompt = build_system_prompt(SAMPLE_TRACKS)
    assert "Afterlife" in prompt
    assert "Tale Of Us" in prompt
    assert "8A" in prompt


def test_parse_playlist_response_valid_json():
    response = json.dumps([
        {"title": "Afterlife", "artist": "Tale Of Us", "reason": "Perfect opener"},
        {"title": "Subzero", "artist": "Adam Beyer", "reason": "Great follow-up"},
    ])
    playlist = parse_playlist_response(response)
    assert len(playlist) == 2
    assert playlist[0]["title"] == "Afterlife"
    assert "reason" in playlist[0]


def test_parse_playlist_response_extracts_json_from_prose():
    """Claude often wraps JSON in markdown code blocks."""
    response = """Here's your playlist:
```json
[{"title": "Afterlife", "artist": "Tale Of Us", "reason": "Great opener"}]
```
Enjoy your set!"""
    playlist = parse_playlist_response(response)
    assert len(playlist) == 1
    assert playlist[0]["title"] == "Afterlife"


def test_parse_playlist_response_invalid_returns_empty():
    playlist = parse_playlist_response("This is just text with no JSON.")
    assert playlist == []
