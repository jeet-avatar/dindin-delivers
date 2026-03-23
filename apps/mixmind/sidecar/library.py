"""Library endpoint — loads tracks, filters hidden ones, returns JSON."""
from pathlib import Path

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
