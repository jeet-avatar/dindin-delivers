import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from main import app

pytestmark = pytest.mark.asyncio

FIXTURE_XML = Path(__file__).parent / "fixtures" / "sample_library.xml"


async def test_get_library_returns_tracks(client):
    with patch("library.XML_PATH", FIXTURE_XML):
        response = await client.get("/api/library")
    assert response.status_code == 200
    data = response.json()
    assert "tracks" in data
    assert len(data["tracks"]) >= 1


async def test_track_shape(client):
    with patch("library.XML_PATH", FIXTURE_XML):
        response = await client.get("/api/library")
    tracks = response.json()["tracks"]
    t = tracks[0]
    required_keys = {"content_id", "source", "title", "artist", "bpm",
                     "key_musical", "camelot", "rating", "duration_sec",
                     "cue_count", "cue_colors"}
    assert required_keys.issubset(set(t.keys()))


async def test_library_excludes_hidden_tracks(client, tmp_path):
    from state import StateDB
    from library import get_state_db

    db = StateDB(db_path=tmp_path / "state.db")
    db.hide_track("1", "xml", "duplicate")

    def override_db():
        yield db

    app.dependency_overrides[get_state_db] = override_db
    try:
        with patch("library.XML_PATH", FIXTURE_XML):
            response = await client.get("/api/library")
    finally:
        app.dependency_overrides.pop(get_state_db, None)
        db.close()

    tracks = response.json()["tracks"]
    ids = [t["content_id"] for t in tracks]
    assert "1" not in ids
