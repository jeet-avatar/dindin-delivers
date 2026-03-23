"""Duplicate finder REST routes."""
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from duplicates import find_duplicates
from rekordbox import load_library_xml, Track, try_load_library_db
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
    """Load library — DB first, XML fallback."""
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
        title=t.title or "", artist=t.artist or "", bpm=t.bpm,
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
