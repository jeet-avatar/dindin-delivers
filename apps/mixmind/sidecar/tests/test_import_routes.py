"""Integration tests for POST /api/library/import and GET /api/library merge.

Phase 21-01. Uses FastAPI TestClient + a tmp SQLite state.db so nothing
touches ~/Library/Application Support/MixMind/state.db.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

import import_routes
import library as library_module
from main import app
from state import StateDB


@pytest.fixture
def tmp_state_db(tmp_path, monkeypatch) -> Iterator[Path]:
    """Redirect StateDB() default path to a fresh tmp file for this test."""
    db_path = tmp_path / "state.db"
    # state.StateDB.__init__ takes db_path default = _DEFAULT_PATH — the
    # _get_state_db dep in both library.py and import_routes.py calls
    # StateDB() with no args. Monkeypatching _DEFAULT_PATH swaps the target.
    import state as state_module
    monkeypatch.setattr(state_module, "_DEFAULT_PATH", db_path)
    yield db_path


@pytest.fixture
def client(tmp_state_db) -> TestClient:
    return TestClient(app)


def _touch(p: Path, data: bytes = b"fake") -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


# ------------------------------------------------------------------
# Folder import happy path
# ------------------------------------------------------------------

def test_import_folder_happy_path(tmp_path, client):
    folder = tmp_path / "music"
    for name in ("a.mp3", "b.flac", "c.aiff"):
        _touch(folder / name)

    resp = client.post(
        "/api/library/import",
        json={"folder_path": str(folder)},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "folder"
    assert body["imported"] == 3
    assert body["skipped_duplicates"] == 0
    assert body["warnings"] == []
    assert len(body["batch_id"]) == 36  # UUID4


def test_import_folder_idempotent(tmp_path, client):
    folder = tmp_path / "music"
    for name in ("a.mp3", "b.flac"):
        _touch(folder / name)

    r1 = client.post("/api/library/import", json={"folder_path": str(folder)})
    assert r1.status_code == 200
    assert r1.json()["imported"] == 2

    # Second call: same files → zero imported, 2 duplicates skipped
    r2 = client.post("/api/library/import", json={"folder_path": str(folder)})
    assert r2.status_code == 200
    body = r2.json()
    assert body["imported"] == 0
    assert body["skipped_duplicates"] == 2


def test_import_folder_missing_path(client):
    resp = client.post(
        "/api/library/import",
        json={"folder_path": "/absolutely/does/not/exist/xyzzy"},
    )
    assert resp.status_code == 400
    assert "not a directory" in resp.json()["detail"].lower()


def test_import_folder_without_folder_path_400(client):
    resp = client.post(
        "/api/library/import",
        json={"from_rekordbox": False},
    )
    assert resp.status_code == 400
    assert "folder_path required" in resp.json()["detail"]


# ------------------------------------------------------------------
# Rekordbox bridge path (preservation rule)
# ------------------------------------------------------------------

def _patch_rekordbox_load(monkeypatch, returns):
    """Patch every name-binding of try_load_library_db across the app.

    library.py imported the symbol at module load via `from rekordbox import ...`,
    and import_routes.py imports it locally inside the handler. Patching both
    the source module and the library module covers both code paths.
    """
    import rekordbox as rekordbox_module
    monkeypatch.setattr(rekordbox_module, "try_load_library_db", lambda: returns)
    monkeypatch.setattr(library_module, "try_load_library_db", lambda: returns)


def test_import_rekordbox_missing_library(client, monkeypatch, tmp_path):
    """If neither master.db nor XML is available, endpoint returns 404."""
    # Point XML_PATH at a nonexistent file
    monkeypatch.setattr(library_module, "XML_PATH", tmp_path / "no_such.xml")
    _patch_rekordbox_load(monkeypatch, None)

    resp = client.post(
        "/api/library/import",
        json={"from_rekordbox": True},
    )
    assert resp.status_code == 404
    assert "No Rekordbox library found" in resp.json()["detail"]


def test_import_rekordbox_happy_path(client, monkeypatch, tmp_path):
    """When try_load_library_db returns a list, rows get copied into imported_tracks."""
    from rekordbox import Track

    fake_tracks = [
        Track(
            content_id="rb-001",
            source="db",
            title="Song One",
            artist="Artist A",
            bpm=128.0,
            key_musical="Am",
            camelot="8A",
            rating=4,
            duration_sec=200,
            cue_count=0,
            cue_colors=[],
            file_path=str(tmp_path / "song1.mp3"),
            genre="House",
        ),
        Track(
            content_id="rb-002",
            source="db",
            title="Song Two",
            artist="Artist B",
            bpm=124.0,
            key_musical="C",
            camelot="8B",
            rating=5,
            duration_sec=180,
            cue_count=0,
            cue_colors=[],
            file_path="",  # streaming track — should be skipped
            genre="Techno",
        ),
    ]
    _patch_rekordbox_load(monkeypatch, fake_tracks)

    resp = client.post("/api/library/import", json={"from_rekordbox": True})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["source"] == "rekordbox"
    # Only the track with a real file_path counts
    assert body["imported"] == 1
    assert body["skipped_duplicates"] == 0


# ------------------------------------------------------------------
# GET /api/library merges imported tracks
# ------------------------------------------------------------------

def test_library_includes_imported_tracks(tmp_path, client, monkeypatch):
    """After folder import, GET /api/library returns entries with source='import'."""
    # Force the DB path to return None and XML_PATH to be missing so we
    # get the pure-import path (no Rekordbox rows mixed in).
    _patch_rekordbox_load(monkeypatch, None)
    monkeypatch.setattr(library_module, "XML_PATH", tmp_path / "no_such.xml")

    folder = tmp_path / "music"
    for name in ("one.mp3", "two.flac"):
        _touch(folder / name)

    import_resp = client.post(
        "/api/library/import",
        json={"folder_path": str(folder)},
    )
    assert import_resp.status_code == 200
    assert import_resp.json()["imported"] == 2

    lib_resp = client.get("/api/library")
    assert lib_resp.status_code == 200
    body = lib_resp.json()
    assert body["total"] == 2
    sources = {t["source"] for t in body["tracks"]}
    assert sources == {"import"}


def test_library_merges_import_with_rekordbox(tmp_path, client, monkeypatch):
    """GET /api/library returns Rekordbox tracks AND imported tracks."""
    from rekordbox import Track

    fake_rb = [Track(
        content_id="rb-xyz",
        source="db",
        title="RB Track",
        artist="RB Artist",
        bpm=120.0,
        key_musical="Am",
        camelot="8A",
        rating=3,
        duration_sec=240,
        cue_count=0,
        cue_colors=[],
        file_path="/tmp/rb-xyz.mp3",
        genre="",
    )]
    _patch_rekordbox_load(monkeypatch, fake_rb)

    folder = tmp_path / "music"
    _touch(folder / "imp.mp3")
    client.post("/api/library/import", json={"folder_path": str(folder)})

    lib_resp = client.get("/api/library")
    assert lib_resp.status_code == 200
    body = lib_resp.json()
    sources = {t["source"] for t in body["tracks"]}
    assert "db" in sources
    assert "import" in sources
    assert body["total"] == 2
