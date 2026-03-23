import pytest
from pathlib import Path
from state import StateDB, HiddenTrack, LibraryCacheTrack


@pytest.fixture
def db(tmp_path):
    """Use a temp path so tests don't touch real ~/Library state."""
    db = StateDB(db_path=tmp_path / "test_state.db")
    yield db
    db.close()


def test_state_db_creates_file(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    assert (tmp_path / "state.db").exists()
    db.close()


def test_hide_track(db):
    db.hide_track(content_id="123", source="db", reason="duplicate")
    assert db.is_hidden(content_id="123", source="db")


def test_unhide_track(db):
    db.hide_track(content_id="123", source="db", reason="duplicate")
    db.unhide_track(content_id="123", source="db")
    assert not db.is_hidden(content_id="123", source="db")


def test_hidden_ids_by_source(db):
    db.hide_track("10", "db", "duplicate")
    db.hide_track("20", "db", "duplicate")
    db.hide_track("xml-abc", "xml", "duplicate")
    ids = db.hidden_ids(source="db")
    assert ids == {"10", "20"}


def test_upsert_cache_track(db):
    track = LibraryCacheTrack(
        content_id="42",
        source="db",
        title="Afterlife",
        artist="Tale Of Us",
        bpm=128.0,
        key_musical="Am",
        camelot="8A",
        rating=5,
        duration_sec=402,
        cue_count=3,
        cue_colors='["red","blue","green"]',
    )
    db.upsert_track(track)
    result = db.get_track("42", source="db")
    assert result.title == "Afterlife"
    assert result.camelot == "8A"


def test_get_all_cached_tracks(db):
    for i in range(3):
        db.upsert_track(LibraryCacheTrack(
            content_id=str(i), source="db", title=f"Track {i}",
            artist="Artist", bpm=130.0, key_musical="Dm", camelot="7A",
            rating=0, duration_sec=360, cue_count=0, cue_colors="[]",
        ))
    tracks = db.all_tracks(source="db")
    assert len(tracks) == 3
