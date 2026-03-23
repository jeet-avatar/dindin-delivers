# tests/test_duplicate_routes.py
import pytest
from pathlib import Path
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from main import app

pytestmark = pytest.mark.asyncio

FIXTURE_XML = Path(__file__).parent / "fixtures" / "sample_library.xml"


async def test_scan_returns_pairs_list(client):
    with patch("duplicate_routes.XML_PATH", FIXTURE_XML):
        response = await client.get("/api/duplicates/scan")
    assert response.status_code == 200
    data = response.json()
    assert "pairs" in data
    assert isinstance(data["pairs"], list)


async def test_scan_pair_shape(client):
    """Each pair has track_a, track_b, similarity_score."""
    from rekordbox import Track
    track_a = Track("x1", "xml", "Afterlife", "Tale Of Us", 128.0, "Am", "8A", 5, 402, 0, [])
    track_b = Track("x2", "xml", "Afterlife (Remix)", "Tale Of Us", 128.0, "Am", "8A", 5, 404, 0, [])
    with patch("duplicate_routes.load_library", return_value=[track_a, track_b]):
        response = await client.get("/api/duplicates/scan")
    data = response.json()
    if data["pairs"]:
        pair = data["pairs"][0]
        assert "track_a" in pair
        assert "track_b" in pair
        assert "similarity_score" in pair


async def test_hide_track(client, tmp_path):
    from state import StateDB
    db = StateDB(db_path=tmp_path / "state.db")
    with patch("duplicate_routes.get_state_db", return_value=db):
        response = await client.post("/api/duplicates/hide", json={
            "content_id": "42",
            "source": "xml",
        })
    assert response.status_code == 200
    assert db.is_hidden("42", "xml")
    db.close()


async def test_unhide_track(client, tmp_path):
    from state import StateDB
    db = StateDB(db_path=tmp_path / "state.db")
    db.hide_track("42", "xml", "duplicate")
    with patch("duplicate_routes.get_state_db", return_value=db):
        response = await client.delete("/api/duplicates/hide/42?source=xml")
    assert response.status_code == 200
    assert not db.is_hidden("42", "xml")
    db.close()
