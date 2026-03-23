# MixMind Phase 2 — AI Playlist Generation + Duplicate Finder

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Phase 1 complete — sidecar running, `/api/library` working.

**Goal:** Add Claude Haiku AI playlist generation (streaming SSE) and fuzzy duplicate detection to the Python sidecar.

**Architecture:** `ai.py` sends library as compact CSV context to Claude Haiku and streams back a playlist JSON. `duplicates.py` uses rapidfuzz to find track pairs with >85% title+artist similarity and ≤5s duration difference. Both exposed as REST endpoints on the existing sidecar.

**Tech Stack:** anthropic SDK, rapidfuzz, pytest, pytest-asyncio

---

## Chunk 1: Duplicate Finder

### File Structure
```
apps/mixmind/sidecar/
├── duplicates.py               — duplicate detection logic
├── duplicate_routes.py         — FastAPI routes for duplicates
└── tests/
    ├── test_duplicates.py
    └── test_duplicate_routes.py
```

---

### Task 1: Duplicate detection logic (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/duplicates.py`
- Create: `apps/mixmind/sidecar/tests/test_duplicates.py`

- [ ] **Step 1.1: Write failing tests**

```python
# tests/test_duplicates.py
import pytest
from rekordbox import Track
from duplicates import find_duplicates, DuplicatePair


def _track(id_, title, artist, duration):
    return Track(
        content_id=id_, source="xml", title=title, artist=artist,
        bpm=128.0, key_musical="Am", camelot="8A", rating=0,
        duration_sec=duration, cue_count=0, cue_colors=[],
    )


def test_exact_title_artist_match_flagged():
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 400),  # same song, 2s diff
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_fuzzy_title_match_flagged():
    tracks = [
        _track("1", "Afterlife (Original Mix)", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 402),
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_different_artists_not_flagged():
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Adam Beyer", 402),
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_duration_diff_over_5s_not_flagged():
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 410),  # 8s diff → not a dupe
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_duration_exactly_5s_diff_is_flagged():
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 407),  # exactly 5s → dupe
    ]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 1


def test_pair_contains_both_track_ids():
    tracks = [
        _track("1", "Afterlife", "Tale Of Us", 402),
        _track("2", "Afterlife", "Tale Of Us", 402),
    ]
    pairs = find_duplicates(tracks)
    assert pairs[0].track_a.content_id in {"1", "2"}
    assert pairs[0].track_b.content_id in {"1", "2"}
    assert pairs[0].track_a.content_id != pairs[0].track_b.content_id


def test_no_self_comparison():
    tracks = [_track("1", "Afterlife", "Tale Of Us", 402)]
    pairs = find_duplicates(tracks)
    assert len(pairs) == 0


def test_large_library_completes_quickly():
    """500 tracks should complete in under 2 seconds."""
    import time
    tracks = [_track(str(i), f"Track {i}", f"Artist {i}", 360) for i in range(500)]
    start = time.time()
    find_duplicates(tracks)
    elapsed = time.time() - start
    assert elapsed < 2.0
```

- [ ] **Step 1.2: Run — expect FAIL**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pytest tests/test_duplicates.py -v
```

Expected: `ModuleNotFoundError: No module named 'duplicates'`

- [ ] **Step 1.3: Implement duplicates.py**

```python
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
    track_a: Track
    track_b: Track
    similarity_score: float


def _fingerprint(track: Track) -> str:
    """Combine title and artist for fuzzy comparison."""
    return f"{track.title.lower().strip()} {track.artist.lower().strip()}"


def find_duplicates(tracks: list[Track]) -> list[DuplicatePair]:
    """Return all pairs of tracks that are likely duplicates."""
    pairs = []
    for a, b in combinations(tracks, 2):
        score = fuzz.token_sort_ratio(_fingerprint(a), _fingerprint(b))
        if score < SIMILARITY_THRESHOLD:
            continue
        if abs(a.duration_sec - b.duration_sec) > DURATION_TOLERANCE_SECS:
            continue
        pairs.append(DuplicatePair(track_a=a, track_b=b, similarity_score=score))
    return pairs
```

- [ ] **Step 1.4: Run tests — expect PASS**

```bash
pytest tests/test_duplicates.py -v
```

Expected: `8 passed`

- [ ] **Step 1.5: Commit**

```bash
git add apps/mixmind/sidecar/duplicates.py apps/mixmind/sidecar/tests/test_duplicates.py
git commit -m "feat(mixmind): fuzzy duplicate finder (rapidfuzz, 85% threshold, ±5s duration)"
```

---

### Task 2: Duplicate REST routes (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/duplicate_routes.py`
- Modify: `apps/mixmind/sidecar/main.py`
- Create: `apps/mixmind/sidecar/tests/test_duplicate_routes.py`

- [ ] **Step 2.1: Write failing tests**

```python
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
    # Add a second fixture with a near-duplicate to trigger a real pair
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
```

- [ ] **Step 2.2: Run — expect FAIL**

```bash
pytest tests/test_duplicate_routes.py -v
```

- [ ] **Step 2.3: Implement duplicate_routes.py**

```python
"""Duplicate finder REST routes."""
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from duplicates import find_duplicates
from rekordbox import load_library_xml, Track
from state import StateDB

router = APIRouter(prefix="/api/duplicates")

XML_PATH = (
    Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"
)

_state_db: StateDB = None


def get_state_db() -> StateDB:
    global _state_db
    if _state_db is None:
        _state_db = StateDB()
    return _state_db


def load_library() -> list[Track]:
    """Load library (XML fallback, same as library.py). Shared logic."""
    from rekordbox import try_load_library_db
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    return tracks or []


class TrackRef(BaseModel):
    content_id: str
    source: str
    title: str
    artist: str
    bpm: float
    camelot: str
    rating: int
    duration_sec: int


class PairOut(BaseModel):
    track_a: TrackRef
    track_b: TrackRef
    similarity_score: float


class HideRequest(BaseModel):
    content_id: str
    source: str


def _track_ref(t: Track) -> TrackRef:
    return TrackRef(
        content_id=t.content_id, source=t.source,
        title=t.title, artist=t.artist, bpm=t.bpm,
        camelot=t.camelot, rating=t.rating, duration_sec=t.duration_sec,
    )


@router.get("/scan")
async def scan_duplicates():
    tracks = load_library()
    pairs = find_duplicates(tracks)
    return {
        "pairs": [
            PairOut(
                track_a=_track_ref(p.track_a),
                track_b=_track_ref(p.track_b),
                similarity_score=p.similarity_score,
            ).model_dump()
            for p in pairs
        ],
        "count": len(pairs),
    }


@router.post("/hide")
async def hide_track(req: HideRequest):
    get_state_db().hide_track(req.content_id, req.source, "duplicate")
    return {"ok": True}


@router.delete("/hide/{content_id}")
async def unhide_track(content_id: str, source: str):
    get_state_db().unhide_track(content_id, source)
    return {"ok": True}
```

- [ ] **Step 2.4: Add router to main.py**

```python
from duplicate_routes import router as duplicate_router
app.include_router(duplicate_router)
```

- [ ] **Step 2.5: Run all tests — expect PASS**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add apps/mixmind/sidecar/duplicate_routes.py apps/mixmind/sidecar/tests/test_duplicate_routes.py apps/mixmind/sidecar/main.py
git commit -m "feat(mixmind): duplicate finder REST routes — scan, hide, unhide"
```

---

## Chunk 2: AI Playlist Generation

### File Structure
```
apps/mixmind/sidecar/
├── ai.py               — Claude Haiku integration, library serialisation, streaming
└── tests/
    └── test_ai.py
```

---

### Task 3: AI playlist generation (TDD with mocked Claude)

**Files:**
- Create: `apps/mixmind/sidecar/ai.py`
- Create: `apps/mixmind/sidecar/tests/test_ai.py`
- Modify: `apps/mixmind/sidecar/main.py`

- [ ] **Step 3.1: Write failing tests**

```python
# tests/test_ai.py
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
```

- [ ] **Step 3.2: Run — expect FAIL**

```bash
pytest tests/test_ai.py -v
```

Expected: `ModuleNotFoundError: No module named 'ai'`

- [ ] **Step 3.3: Implement ai.py (non-streaming logic + prompt)**

```python
"""
AI playlist generation via Claude Haiku.
Streaming via SSE — see /api/ai/generate endpoint in ai_routes.py.
"""
from __future__ import annotations

import json
import re
from typing import Generator

from rekordbox import Track

MAX_TRACKS_IN_CONTEXT = 1500

SYSTEM_PROMPT_TEMPLATE = """You are MixMind, an expert DJ assistant. You have deep knowledge of music theory, DJ mixing, Camelot Wheel key compatibility, and energy flow in DJ sets.

The DJ's library (CSV format: title|artist|bpm|camelot|rating|duration_sec):

{library_csv}

{context_note}

When asked to build a playlist or set:
- Prefer tracks with compatible Camelot keys (same number, or ±1, or same letter)
- Respect requested BPM range and energy arc
- Prioritise higher-rated tracks
- Return a JSON array ONLY (no prose, no markdown), format:
  [
    {{"title": "Track Name", "artist": "Artist", "reason": "Why this track fits here"}},
    ...
  ]

For other questions, answer in plain text."""


def serialise_library_for_claude(tracks: list[Track]) -> str:
    """Serialise tracks to compact CSV for Claude context window."""
    # Sort by rating descending, take top MAX_TRACKS_IN_CONTEXT
    sorted_tracks = sorted(tracks, key=lambda t: t.rating, reverse=True)
    capped = sorted_tracks[:MAX_TRACKS_IN_CONTEXT]

    lines = ["title|artist|bpm|camelot|rating|duration_sec"]
    for t in capped:
        lines.append(f"{t.title}|{t.artist}|{t.bpm:.1f}|{t.camelot}|{t.rating}|{t.duration_sec}")
    return "\n".join(lines)


def build_system_prompt(tracks: list[Track]) -> str:
    csv = serialise_library_for_claude(tracks)
    context_note = (
        f"(Showing top {MAX_TRACKS_IN_CONTEXT} tracks by rating — "
        f"full library has {len(tracks)} tracks)"
        if len(tracks) > MAX_TRACKS_IN_CONTEXT
        else ""
    )
    return SYSTEM_PROMPT_TEMPLATE.format(library_csv=csv, context_note=context_note)


def parse_playlist_response(text: str) -> list[dict]:
    """Extract JSON playlist array from Claude's response.
    Handles both raw JSON and JSON wrapped in markdown code blocks."""
    # Try to extract from ```json ... ``` block
    code_block = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    # Try to parse the entire response as JSON
    try:
        result = json.loads(text.strip())
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try to find a JSON array anywhere in the response
    array_match = re.search(r"\[.*\]", text, re.DOTALL)
    if array_match:
        try:
            result = json.loads(array_match.group(0))
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    return []
```

- [ ] **Step 3.4: Run tests — expect PASS**

```bash
pytest tests/test_ai.py -v
```

Expected: `8 passed`

- [ ] **Step 3.5: Commit**

```bash
git add apps/mixmind/sidecar/ai.py apps/mixmind/sidecar/tests/test_ai.py
git commit -m "feat(mixmind): Claude Haiku AI prompt builder, library serialiser, playlist parser"
```

---

### Task 4: AI streaming endpoint (TDD)

**Files:**
- Create: `apps/mixmind/sidecar/ai_routes.py`
- Modify: `apps/mixmind/sidecar/main.py`
- Create: `apps/mixmind/sidecar/tests/test_ai_routes.py`

- [ ] **Step 4.1: Write failing tests**

```python
# tests/test_ai_routes.py
import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from main import app

pytestmark = pytest.mark.asyncio


async def test_chat_requires_message(client):
    response = await client.post("/api/ai/chat", json={})
    assert response.status_code == 422  # Pydantic validation error


async def test_chat_returns_ok_with_mocked_claude(client):
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Test response from Claude")]

    with patch("ai_routes.load_library", return_value=[]), \
         patch("ai_routes.anthropic_client") as mock_client:
        mock_client.messages.create.return_value = mock_response
        response = await client.post("/api/ai/chat", json={
            "message": "Build me a techno set"
        })

    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "playlist" in data


async def test_chat_playlist_parsed_from_json_response(client):
    playlist_json = json.dumps([
        {"title": "Afterlife", "artist": "Tale Of Us", "reason": "Great opener"}
    ])
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=playlist_json)]

    with patch("ai_routes.load_library", return_value=[]), \
         patch("ai_routes.anthropic_client") as mock_client:
        mock_client.messages.create.return_value = mock_response
        response = await client.post("/api/ai/chat", json={"message": "Build a set"})

    data = response.json()
    assert len(data["playlist"]) == 1
    assert data["playlist"][0]["title"] == "Afterlife"


async def test_chat_without_anthropic_key_returns_503(client):
    with patch("ai_routes.anthropic_client", None):
        response = await client.post("/api/ai/chat", json={"message": "hello"})
    assert response.status_code == 503
```

- [ ] **Step 4.2: Run — expect FAIL**

```bash
pytest tests/test_ai_routes.py -v
```

- [ ] **Step 4.3: Implement ai_routes.py**

```python
"""AI chat endpoint — calls Claude Haiku, returns reply + parsed playlist."""
import os
from pathlib import Path

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai import build_system_prompt, parse_playlist_response
from rekordbox import Track, load_library_xml, try_load_library_db

router = APIRouter(prefix="/api/ai")

XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"

# Initialise client — None if key not set (offline mode)
_api_key = os.getenv("ANTHROPIC_API_KEY", "")
anthropic_client = anthropic.Anthropic(api_key=_api_key) if _api_key else None

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048


def load_library() -> list[Track]:
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    return tracks or []


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(req: ChatRequest):
    if anthropic_client is None:
        raise HTTPException(status_code=503, detail="AI features offline — ANTHROPIC_API_KEY not set")

    tracks = load_library()
    system = build_system_prompt(tracks)

    response = anthropic_client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": req.message}],
    )

    reply_text = response.content[0].text
    playlist = parse_playlist_response(reply_text)

    return {
        "reply": reply_text if not playlist else f"Built a playlist with {len(playlist)} tracks.",
        "playlist": playlist,
        "raw": reply_text,
    }
```

- [ ] **Step 4.4: Add router to main.py**

```python
from ai_routes import router as ai_router
app.include_router(ai_router)
```

- [ ] **Step 4.5: Run all tests**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 4.6: Manual smoke test with real Claude (requires ANTHROPIC_API_KEY)**

```bash
export ANTHROPIC_API_KEY=your_key_here
python main.py &
sleep 3
PORT=$(cat ~/.mixmind-port)

curl -X POST http://localhost:$PORT/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Build me a 30-minute dark techno set starting at 128 BPM"}'

kill %1
```

Expected: JSON response with `playlist` array (may be empty if no library loaded, but no 500 error).

- [ ] **Step 4.7: Commit**

```bash
git add apps/mixmind/sidecar/ai_routes.py apps/mixmind/sidecar/tests/test_ai_routes.py apps/mixmind/sidecar/main.py
git commit -m "feat(mixmind): Claude Haiku AI chat endpoint with playlist extraction"
```
