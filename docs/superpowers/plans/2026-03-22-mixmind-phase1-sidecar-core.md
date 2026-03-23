# MixMind Phase 1 — Python Sidecar Core

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python FastAPI sidecar that reads the Rekordbox library (DB-first, XML fallback), manages local state, and exposes a REST API for the Electron frontend to consume.

**Architecture:** PyInstaller `--onedir` binary runs as a subprocess inside `MixMind.app`. FastAPI listens on a free port in 8765–8775, writes the chosen port to `~/.mixmind-port`, then serves library data, playlists, and health check endpoints. Local state lives in `~/Library/Application Support/MixMind/state.db` (SQLite).

**Tech Stack:** Python 3.11+, FastAPI, uvicorn, pyrekordbox, SQLAlchemy (for state.db), pytest

---

## Chunk 1: Project scaffold + health endpoint

### File Structure

```
apps/mixmind/sidecar/
├── main.py          — FastAPI app, port scanning, startup sequence, CORS
├── health.py        — /health endpoint
├── state.py         — local state.db (SQLAlchemy models + session factory)
├── rekordbox.py     — pyrekordbox wrapper (DB-first, XML fallback)
├── requirements.txt
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   └── test_state.py
└── build.sh         — PyInstaller build script
```

---

### Task 1: Create project scaffold + requirements

**Files:**
- Create: `apps/mixmind/sidecar/requirements.txt`
- Create: `apps/mixmind/sidecar/main.py`

- [ ] **Step 1.1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pyrekordbox==0.3.5
sqlalchemy==2.0.35
rapidfuzz==3.9.7
anthropic==0.34.2
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
```

> **NOTE:** Before running `pip install`, verify `pyrekordbox` installs cleanly — it depends on `sqlcipher3-wheels` for Rekordbox 6.x DB access. If that fails on your machine, the XML fallback path will still work.

Run: `pip install pyrekordbox` and confirm it installs without error. If SQLCipher fails, note it — XML fallback is unaffected.

- [ ] **Step 1.2: Create virtual environment and install**

```bash
cd apps/mixmind/sidecar
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Expected: all packages install, `python -c "import fastapi; import pyrekordbox"` exits 0.

- [ ] **Step 1.3: Create main.py — minimal FastAPI app with port scanning**

```python
"""
MixMind sidecar — FastAPI backend for Electron frontend.
Scans ports 8765–8775 for a free one, writes chosen port to ~/.mixmind-port,
then starts uvicorn.
"""
import os
import socket
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from health import router as health_router

app = FastAPI(title="MixMind Sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer — no external access
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)


def find_free_port(start: int = 8765, end: int = 8775) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {start}-{end}")


def write_port_file(port: int) -> None:
    port_file = Path.home() / ".mixmind-port"
    port_file.write_text(str(port))


if __name__ == "__main__":
    port = find_free_port()
    write_port_file(port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
```

- [ ] **Step 1.4: Commit scaffold**

```bash
git add apps/mixmind/sidecar/requirements.txt apps/mixmind/sidecar/main.py
git commit -m "feat(mixmind): add sidecar scaffold with port scanning"
```

---

### Task 2: Health endpoint (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/health.py`
- Create: `apps/mixmind/sidecar/tests/conftest.py`
- Create: `apps/mixmind/sidecar/tests/test_health.py`

- [ ] **Step 2.1: Write failing test**

`apps/mixmind/sidecar/tests/conftest.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

`apps/mixmind/sidecar/tests/test_health.py`:
```python
import pytest

pytestmark = pytest.mark.asyncio


async def test_health_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200


async def test_health_returns_ok_status(client):
    response = await client.get("/health")
    data = response.json()
    assert data["status"] == "ok"


async def test_health_returns_version(client):
    response = await client.get("/health")
    data = response.json()
    assert "version" in data
```

- [ ] **Step 2.1b: Create pytest.ini (required for async tests)**

`apps/mixmind/sidecar/pytest.ini`:
```ini
[pytest]
asyncio_mode = auto
```

Without this, `async def test_*` functions are silently skipped by pytest-asyncio — they appear to pass but never run.

- [ ] **Step 2.2: Run tests — expect FAIL (health router not defined yet)**

```bash
cd apps/mixmind/sidecar
source venv/bin/activate
pytest tests/test_health.py -v
```

Expected: `ImportError` or `404` — health module doesn't exist.

- [ ] **Step 2.3: Create health.py**

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

- [ ] **Step 2.4: Run tests — expect PASS**

```bash
pytest tests/test_health.py -v
```

Expected:
```
test_health_returns_200 PASSED
test_health_returns_ok_status PASSED
test_health_returns_version PASSED
3 passed
```

- [ ] **Step 2.5: Commit**

```bash
git add apps/mixmind/sidecar/health.py apps/mixmind/sidecar/tests/
git commit -m "feat(mixmind): health endpoint with tests"
```

---

### Task 3: Local state.db (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/state.py`
- Create: `apps/mixmind/sidecar/tests/test_state.py`

- [ ] **Step 3.1: Write failing tests**

`apps/mixmind/sidecar/tests/test_state.py`:
```python
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
```

- [ ] **Step 3.2: Run tests — expect FAIL**

```bash
pytest tests/test_state.py -v
```

Expected: `ModuleNotFoundError: No module named 'state'`

- [ ] **Step 3.3: Implement state.py**

```python
"""
Local state database for MixMind.
Stored at ~/Library/Application Support/MixMind/state.db
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Set

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


_DEFAULT_PATH = (
    Path.home()
    / "Library"
    / "Application Support"
    / "MixMind"
    / "state.db"
)


@dataclass
class LibraryCacheTrack:
    content_id: str
    source: str          # 'db' or 'xml'
    title: str
    artist: str
    bpm: float
    key_musical: str
    camelot: str
    rating: int          # 0-5
    duration_sec: int
    cue_count: int
    cue_colors: str      # JSON array string


@dataclass
class HiddenTrack:
    content_id: str
    source: str
    reason: str


class StateDB:
    def __init__(self, db_path: Path = _DEFAULT_PATH):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._engine = create_engine(f"sqlite:///{db_path}")
        self._create_tables()

    def _create_tables(self) -> None:
        with self._engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS hidden_tracks (
                    content_id TEXT NOT NULL,
                    source     TEXT NOT NULL,
                    hidden_at  TEXT DEFAULT (datetime('now')),
                    reason     TEXT,
                    PRIMARY KEY (content_id, source)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS library_cache (
                    content_id   TEXT NOT NULL,
                    source       TEXT NOT NULL,
                    title        TEXT,
                    artist       TEXT,
                    bpm          REAL,
                    key_musical  TEXT,
                    camelot      TEXT,
                    rating       INTEGER DEFAULT 0,
                    duration_sec INTEGER,
                    cue_count    INTEGER DEFAULT 0,
                    cue_colors   TEXT DEFAULT '[]',
                    updated_at   TEXT DEFAULT (datetime('now')),
                    PRIMARY KEY (content_id, source)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS preferences (
                    key   TEXT PRIMARY KEY,
                    value TEXT
                )
            """))
            conn.commit()

    def hide_track(self, content_id: str, source: str, reason: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "INSERT OR REPLACE INTO hidden_tracks (content_id, source, reason) "
                "VALUES (:cid, :src, :reason)"
            ), {"cid": content_id, "src": source, "reason": reason})
            conn.commit()

    def unhide_track(self, content_id: str, source: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "DELETE FROM hidden_tracks WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source})
            conn.commit()

    def is_hidden(self, content_id: str, source: str) -> bool:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT 1 FROM hidden_tracks WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source}).fetchone()
            return row is not None

    def hidden_ids(self, source: str) -> Set[str]:
        with self._engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT content_id FROM hidden_tracks WHERE source=:src"
            ), {"src": source}).fetchall()
            return {r[0] for r in rows}

    def upsert_track(self, track: LibraryCacheTrack) -> None:
        with self._engine.connect() as conn:
            conn.execute(text("""
                INSERT OR REPLACE INTO library_cache
                (content_id, source, title, artist, bpm, key_musical, camelot,
                 rating, duration_sec, cue_count, cue_colors, updated_at)
                VALUES (:cid, :src, :title, :artist, :bpm, :key, :cam,
                        :rating, :dur, :cues, :colors, datetime('now'))
            """), {
                "cid": track.content_id, "src": track.source,
                "title": track.title, "artist": track.artist,
                "bpm": track.bpm, "key": track.key_musical,
                "cam": track.camelot, "rating": track.rating,
                "dur": track.duration_sec, "cues": track.cue_count,
                "colors": track.cue_colors,
            })
            conn.commit()

    def get_track(self, content_id: str, source: str) -> Optional[LibraryCacheTrack]:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT * FROM library_cache WHERE content_id=:cid AND source=:src"
            ), {"cid": content_id, "src": source}).fetchone()
            if not row:
                return None
            return LibraryCacheTrack(
                content_id=row[0], source=row[1], title=row[2],
                artist=row[3], bpm=row[4], key_musical=row[5],
                camelot=row[6], rating=row[7], duration_sec=row[8],
                cue_count=row[9], cue_colors=row[10],
            )

    def all_tracks(self, source: str) -> list[LibraryCacheTrack]:
        with self._engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT * FROM library_cache WHERE source=:src"
            ), {"src": source}).fetchall()
            return [LibraryCacheTrack(
                content_id=r[0], source=r[1], title=r[2], artist=r[3],
                bpm=r[4], key_musical=r[5], camelot=r[6], rating=r[7],
                duration_sec=r[8], cue_count=r[9], cue_colors=r[10],
            ) for r in rows]

    def set_pref(self, key: str, value: str) -> None:
        with self._engine.connect() as conn:
            conn.execute(text(
                "INSERT OR REPLACE INTO preferences (key, value) VALUES (:k, :v)"
            ), {"k": key, "v": value})
            conn.commit()

    def get_pref(self, key: str, default: str = "") -> str:
        with self._engine.connect() as conn:
            row = conn.execute(text(
                "SELECT value FROM preferences WHERE key=:k"
            ), {"k": key}).fetchone()
            return row[0] if row else default

    def close(self) -> None:
        self._engine.dispose()
```

- [ ] **Step 3.4: Run tests — expect PASS**

```bash
pytest tests/test_state.py -v
```

Expected:
```
test_state_db_creates_file PASSED
test_hide_track PASSED
test_unhide_track PASSED
test_hidden_ids_by_source PASSED
test_upsert_cache_track PASSED
test_get_all_cached_tracks PASSED
6 passed
```

- [ ] **Step 3.5: Commit**

```bash
git add apps/mixmind/sidecar/state.py apps/mixmind/sidecar/tests/test_state.py
git commit -m "feat(mixmind): local state.db with hidden tracks and library cache"
```

---

## Chunk 2: Rekordbox library loader

### Task 4: Camelot key mapping utility (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/camelot.py`
- Create: `apps/mixmind/sidecar/tests/test_camelot.py`

- [ ] **Step 4.1: Write failing tests**

```python
# tests/test_camelot.py
from camelot import musical_key_to_camelot


def test_am_is_8a():
    assert musical_key_to_camelot("Am") == "8A"


def test_c_major_is_8b():
    assert musical_key_to_camelot("C") == "8B"


def test_fm_is_4a():
    assert musical_key_to_camelot("Fm") == "4A"


def test_d_minor_is_7a():
    assert musical_key_to_camelot("Dm") == "7A"


def test_fsharp_minor_is_11a():
    assert musical_key_to_camelot("F#m") == "11A"


def test_unknown_key_returns_unknown():
    assert musical_key_to_camelot("X") == "?"


def test_all_24_keys_covered():
    """Every key in the Camelot wheel must resolve."""
    keys = [
        "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F",
        "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Fm", "Cm", "Gm", "Dm",
    ]
    for key in keys:
        result = musical_key_to_camelot(key)
        assert result != "?", f"Missing Camelot mapping for key: {key}"
```

- [ ] **Step 4.2: Run — expect FAIL**

```bash
pytest tests/test_camelot.py -v
```

Expected: `ModuleNotFoundError: No module named 'camelot'`

- [ ] **Step 4.3: Implement camelot.py**

```python
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
```

- [ ] **Step 4.4: Run tests — expect PASS**

```bash
pytest tests/test_camelot.py -v
```

Expected: `7 passed`

- [ ] **Step 4.5: Commit**

```bash
git add apps/mixmind/sidecar/camelot.py apps/mixmind/sidecar/tests/test_camelot.py
git commit -m "feat(mixmind): Camelot wheel mapping utility with full 24-key coverage"
```

---

### Task 5: Rekordbox library loader — XML path (TDD)

> **IMPORTANT:** Do NOT assume pyrekordbox API shapes. Before writing code, run `python -c "import pyrekordbox; help(pyrekordbox.RekordboxXml)"` and verify the actual class and method names. Adjust the implementation to match real API, not assumed API.

**Files:**
- Create: `apps/mixmind/sidecar/rekordbox.py`
- Create: `apps/mixmind/sidecar/tests/test_rekordbox.py`
- Create: `apps/mixmind/sidecar/tests/fixtures/sample_library.xml` (minimal valid Rekordbox XML)

- [ ] **Step 5.1: Inspect pyrekordbox API before writing tests**

```bash
python -c "import pyrekordbox; help(pyrekordbox.RekordboxXml)"
python -c "from pyrekordbox import RekordboxXml; rb = RekordboxXml.__new__(RekordboxXml); print(dir(rb))"
```

Record the actual class name, constructor signature, and method names for reading tracks and playlists. **Write down the actual method names** — do not assume they match this plan exactly. Adjust Step 5.3 code accordingly.

- [ ] **Step 5.2: Create minimal Rekordbox XML fixture**

`apps/mixmind/sidecar/tests/fixtures/sample_library.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="2">
    <TRACK TrackID="1" Name="Afterlife" Artist="Tale Of Us"
           TotalTime="402" AverageBpm="128.00" Tonality="Am"
           Rating="255" Colour="#FF0000">
      <POSITION_MARK Name="" Type="0" Start="4.0" Num="-1"/>
      <POSITION_MARK Name="" Type="1" Start="32.0" Num="0" Red="255" Green="0" Blue="0"/>
    </TRACK>
    <TRACK TrackID="2" Name="Subzero" Artist="Adam Beyer"
           TotalTime="435" AverageBpm="134.00" Tonality="Dm"
           Rating="204" Colour="#0000FF">
    </TRACK>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="My Playlist" Type="1" KeyType="0" Entries="2">
        <TRACK Key="1"/>
        <TRACK Key="2"/>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>
```

> **NOTE:** The XML structure above is based on Rekordbox XML export format. Verify against actual exports — field names (Tonality, AverageBpm, TotalTime, Rating) may differ slightly in your Rekordbox version.

- [ ] **Step 5.3: Write failing tests**

`apps/mixmind/sidecar/tests/test_rekordbox.py`:
```python
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
```

- [ ] **Step 5.4: Run — expect FAIL**

```bash
pytest tests/test_rekordbox.py -v
```

Expected: `ModuleNotFoundError: No module named 'rekordbox'`

- [ ] **Step 5.5: Implement rekordbox.py (XML path only)**

> **Before implementing:** verify actual pyrekordbox XML API by running:
> `python -c "from pyrekordbox import RekordboxXml; help(RekordboxXml)"`
> Adjust method calls below to match the actual API.

```python
"""
Rekordbox library loader.
Primary path: reads master.db via pyrekordbox (Rekordbox < 6.6.5).
Fallback path: reads XML export via pyrekordbox.RekordboxXml (all versions).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from camelot import musical_key_to_camelot
from state import LibraryCacheTrack


@dataclass
class Track:
    """Normalised track representation (source-agnostic)."""
    content_id: str
    source: str          # 'db' or 'xml'
    title: str
    artist: str
    bpm: float
    key_musical: str     # e.g. 'Am', 'F#'
    camelot: str         # e.g. '8A', '10B'
    rating: int          # 0-5
    duration_sec: int
    cue_count: int
    cue_colors: list[str]

    def to_cache(self) -> LibraryCacheTrack:
        return LibraryCacheTrack(
            content_id=self.content_id,
            source=self.source,
            title=self.title,
            artist=self.artist,
            bpm=self.bpm,
            key_musical=self.key_musical,
            camelot=self.camelot,
            rating=self.rating,
            duration_sec=self.duration_sec,
            cue_count=self.cue_count,
            cue_colors=json.dumps(self.cue_colors),
        )


# Rekordbox XML Rating is 0–255; normalise to 0–5
def _normalise_rating(raw: int) -> int:
    if raw <= 0:
        return 0
    buckets = [(51, 1), (102, 2), (153, 3), (204, 4), (255, 5)]
    for threshold, stars in buckets:
        if raw <= threshold:
            return stars
    return 5


def load_library_xml(xml_path: Path) -> list[Track]:
    """Load Rekordbox library from XML export file."""
    if not xml_path.exists():
        raise FileNotFoundError(f"Rekordbox XML not found: {xml_path}")

    # IMPORTANT: verify this import and API against installed pyrekordbox version.
    # Run: python -c "from pyrekordbox import RekordboxXml; help(RekordboxXml)"
    from pyrekordbox import RekordboxXml

    rb = RekordboxXml(str(xml_path))

    tracks = []
    # NOTE: adjust `rb.get_tracks()` to the actual pyrekordbox API method name.
    for track in rb.get_tracks():
        # NOTE: adjust attribute names (Name, Artist, AverageBpm, TotalTime,
        # Tonality, Rating) to match actual pyrekordbox Track object attributes.
        # Verify with: print(dir(track)) after loading a real XML.
        title = getattr(track, "Name", "") or ""
        artist = getattr(track, "Artist", "") or ""
        bpm_raw = getattr(track, "AverageBpm", 0) or 0
        bpm = float(bpm_raw)
        duration = int(getattr(track, "TotalTime", 0) or 0)
        tonality = getattr(track, "Tonality", "") or ""
        rating_raw = int(getattr(track, "Rating", 0) or 0)
        track_id = str(getattr(track, "TrackID", id(track)))

        # Cue points — adjust attribute/method name to match pyrekordbox API
        cues = getattr(track, "position_marks", None) or []
        hot_cues = [c for c in cues if getattr(c, "type", -1) == 1]
        cue_colors = [
            f"rgb({getattr(c, 'red', 0)},{getattr(c, 'green', 0)},{getattr(c, 'blue', 0)})"
            for c in hot_cues
        ]

        tracks.append(Track(
            content_id=track_id,
            source="xml",
            title=title,
            artist=artist,
            bpm=bpm,
            key_musical=tonality,
            camelot=musical_key_to_camelot(tonality),
            rating=_normalise_rating(rating_raw),
            duration_sec=duration,
            cue_count=len(hot_cues),
            cue_colors=cue_colors,
        ))

    return tracks


def try_load_library_db() -> Optional[list[Track]]:
    """
    Attempt to load library from master.db (Rekordbox 6.x, pre-6.6.5).
    Returns None if DB is unavailable/encrypted.

    IMPORTANT: Before implementing this function, verify pyrekordbox DB API:
      python -c "from pyrekordbox import Rekordbox6; help(Rekordbox6)"
    The implementation below is a STUB — fill in actual API calls after verification.
    """
    db_path = (
        Path.home()
        / "Library"
        / "Pioneer"
        / "rekordbox"
        / "master.db"
    )
    if not db_path.exists():
        return None

    try:
        from pyrekordbox import Rekordbox6
        # NOTE: verify constructor signature and track access methods.
        # This is a stub — implement after inspecting actual API.
        rb = Rekordbox6(str(db_path))
        # TODO: implement DB track loading after verifying pyrekordbox.Rekordbox6 API
        # Return None for now to force XML fallback during development
        rb.close()
        return None  # Replace with actual implementation after API verification
    except Exception:
        return None
```

> **DB stub note:** `try_load_library_db` returns `None` intentionally during Phase 1 — it forces the XML fallback path. The actual DB implementation will be verified and added in Phase 2.

- [ ] **Step 5.6: Run tests — expect PASS (may need to adjust pyrekordbox API calls based on Step 5.1)**

```bash
pytest tests/test_rekordbox.py -v
```

If tests fail due to pyrekordbox API mismatch, adjust the attribute names in `rekordbox.py` to match the actual API discovered in Step 5.1. Do NOT guess — run `print(dir(track))` on a real track object.

Expected once fixed: `7 passed`

- [ ] **Step 5.7: Commit**

```bash
git add apps/mixmind/sidecar/rekordbox.py apps/mixmind/sidecar/tests/test_rekordbox.py apps/mixmind/sidecar/tests/fixtures/
git commit -m "feat(mixmind): Rekordbox XML library loader with rating normalisation and Camelot derivation"
```

---

### Task 6: Library REST endpoint

**Files:**
- Create: `apps/mixmind/sidecar/library.py`
- Modify: `apps/mixmind/sidecar/main.py`
- Create: `apps/mixmind/sidecar/tests/test_library_endpoint.py`

- [ ] **Step 6.1: Write failing test**

```python
# tests/test_library_endpoint.py
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
    db = StateDB(db_path=tmp_path / "state.db")
    db.hide_track("1", "xml", "duplicate")
    with patch("library.XML_PATH", FIXTURE_XML), \
         patch("library.get_state_db", return_value=db):
        response = await client.get("/api/library")
    tracks = response.json()["tracks"]
    ids = [t["content_id"] for t in tracks]
    assert "1" not in ids
    db.close()
```

- [ ] **Step 6.2: Run — expect FAIL**

```bash
pytest tests/test_library_endpoint.py -v
```

- [ ] **Step 6.3: Implement library.py**

```python
"""Library endpoint — loads tracks, filters hidden ones, returns JSON."""
from pathlib import Path
from typing import Callable

from fastapi import APIRouter
from pydantic import BaseModel

from rekordbox import load_library_xml, Track
from state import StateDB

router = APIRouter(prefix="/api")

# Default XML path — overridden in tests via patch
XML_PATH = (
    Path.home()
    / "Library"
    / "Music"
    / "rekordbox"
    / "rekordbox.xml"
)

_state_db: StateDB = None


def get_state_db() -> StateDB:
    global _state_db
    if _state_db is None:
        _state_db = StateDB()
    return _state_db


class TrackOut(BaseModel):
    content_id: str
    source: str
    title: str
    artist: str
    bpm: float
    key_musical: str
    camelot: str
    rating: int
    duration_sec: int
    cue_count: int
    cue_colors: list[str]


@router.get("/library")
async def get_library():
    db = get_state_db()

    # Try DB first (stub returns None during Phase 1)
    from rekordbox import try_load_library_db
    tracks = try_load_library_db()
    source = "db"

    if tracks is None:
        # XML fallback
        if not XML_PATH.exists():
            return {"tracks": [], "source": "none", "error": "no_library_found"}
        tracks = load_library_xml(XML_PATH)
        source = "xml"

    hidden = db.hidden_ids(source=source)
    visible = [t for t in tracks if t.content_id not in hidden]

    return {
        "tracks": [TrackOut(**{
            "content_id": t.content_id,
            "source": t.source,
            "title": t.title,
            "artist": t.artist,
            "bpm": t.bpm,
            "key_musical": t.key_musical,
            "camelot": t.camelot,
            "rating": t.rating,
            "duration_sec": t.duration_sec,
            "cue_count": t.cue_count,
            "cue_colors": t.cue_colors,
        }).model_dump() for t in visible],
        "source": source,
        "total": len(visible),
    }
```

- [ ] **Step 6.4: Add library router to main.py**

In `main.py`, add after existing imports:
```python
from library import router as library_router
app.include_router(library_router)
```

- [ ] **Step 6.5: Run tests — expect PASS**

```bash
pytest tests/test_library_endpoint.py -v
```

Expected: `3 passed`

- [ ] **Step 6.6: Run full test suite — no regressions**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 6.7: Manual smoke test**

```bash
# In one terminal — start the sidecar
python main.py &
sleep 3
PORT=$(cat ~/.mixmind-port)

# In another terminal
curl http://localhost:$PORT/health
# Expected: {"status":"ok","version":"1.0.0"}

curl http://localhost:$PORT/api/library
# Expected: {"tracks":[],"source":"none","error":"no_library_found"}
# (no XML at default path yet — correct behaviour)

kill %1
```

- [ ] **Step 6.8: Commit**

```bash
git add apps/mixmind/sidecar/library.py apps/mixmind/sidecar/main.py apps/mixmind/sidecar/tests/test_library_endpoint.py
git commit -m "feat(mixmind): /api/library endpoint with DB-first, XML fallback, hidden track filtering"
```

---

### Task 7: PyInstaller build script

**Files:**
- Create: `apps/mixmind/sidecar/build.sh`
- Create: `apps/mixmind/sidecar/mixmind-sidecar.spec` (PyInstaller spec)

- [ ] **Step 7.1: Create build.sh**

```bash
#!/bin/bash
# Build the MixMind Python sidecar as a PyInstaller --onedir bundle.
# Run from: apps/mixmind/sidecar/
# Output: dist/mixmind-sidecar/

set -euo pipefail

cd "$(dirname "$0")"

source venv/bin/activate

# Verify pyinstaller is installed
pip install pyinstaller --quiet

# Clean previous build
rm -rf build/ dist/

pyinstaller \
  --onedir \
  --name mixmind-sidecar \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.lifespan.on \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.websockets.auto \
  --hidden-import fastapi \
  --hidden-import sqlalchemy.dialects.sqlite \
  --collect-all pyrekordbox \
  --noconfirm \
  main.py

echo "Build complete: dist/mixmind-sidecar/"
echo "Test with: ./dist/mixmind-sidecar/mixmind-sidecar"
```

```bash
chmod +x apps/mixmind/sidecar/build.sh
```

- [ ] **Step 7.2: Run build and verify**

```bash
cd apps/mixmind/sidecar
./build.sh
```

Expected: `dist/mixmind-sidecar/` directory created with binary inside.

```bash
./dist/mixmind-sidecar/mixmind-sidecar &
sleep 5
PORT=$(cat ~/.mixmind-port)
curl http://localhost:$PORT/health
kill %1
```

Expected: `{"status":"ok","version":"1.0.0"}`

- [ ] **Step 7.3: Commit**

```bash
git add apps/mixmind/sidecar/build.sh
git commit -m "feat(mixmind): PyInstaller --onedir build script for sidecar binary"
```

---
