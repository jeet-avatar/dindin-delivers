import pytest
from pathlib import Path
from rekordbox import load_library_xml, Track

FIXTURE_XML = Path(__file__).parent / "fixtures" / "sample_library.xml"


def test_load_xml_returns_tracks():
    tracks = load_library_xml(FIXTURE_XML)
    assert len(tracks) == 2


def test_track_has_required_fields():
    tracks = load_library_xml(FIXTURE_XML)
    t = tracks[0]
    assert t.content_id  # non-empty string
    assert t.source == "xml"
    assert t.title == "Afterlife"
    assert t.artist == "Tale Of Us"
    assert isinstance(t.bpm, float)
    assert t.bpm == 128.0


def test_track_duration_is_seconds():
    tracks = load_library_xml(FIXTURE_XML)
    t = tracks[0]
    assert t.duration_sec == 402


def test_track_camelot_derived_from_tonality():
    tracks = load_library_xml(FIXTURE_XML)
    t = tracks[0]
    assert t.key_musical == "Am"
    assert t.camelot == "8A"


def test_track_rating_normalised_to_0_5():
    """Rekordbox XML stores Rating as 0-255; we normalise to 0-5."""
    tracks = load_library_xml(FIXTURE_XML)
    t = tracks[0]  # Rating="255" → 5
    assert t.rating == 5


def test_track_cue_count():
    tracks = load_library_xml(FIXTURE_XML)
    t = tracks[0]
    # Track 1 fixture has 2 POSITION_MARK: Type=0 (memory cue) + Type=1 (hot cue)
    # We count only hot cues (Type=1) → expect exactly 1
    assert t.cue_count == 1


def test_missing_xml_raises_file_not_found():
    with pytest.raises(FileNotFoundError):
        load_library_xml(Path("/nonexistent/path.xml"))
