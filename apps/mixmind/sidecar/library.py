"""Library endpoint — loads tracks, filters hidden ones, returns JSON."""
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rekordbox import load_library_xml, try_load_library_db
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


def get_state_db() -> StateDB:
    db = StateDB()
    try:
        yield db
    finally:
        db.close()


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
    file_path: str = ""
    analysis_data_path: str = ""
    genre: str = ""
    comment: str = ""
    color_hex: str = ""
    date_added: str = ""
    label: str = ""
    play_count: int = 0


@router.get("/library")
async def get_library(db: Annotated[StateDB, Depends(get_state_db)]):
    # Try DB first (stub returns None during Phase 1)
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
        "tracks": [TrackOut(
            content_id=t.content_id,
            source=t.source,
            title=t.title,
            artist=t.artist,
            bpm=t.bpm,
            key_musical=t.key_musical,
            camelot=t.camelot,
            rating=t.rating,
            duration_sec=t.duration_sec,
            cue_count=t.cue_count,
            cue_colors=t.cue_colors,
            file_path=t.file_path,
            analysis_data_path=t.analysis_data_path,
            genre=t.genre,
            comment=t.comment,
            color_hex=t.color_hex,
            date_added=t.date_added,
            label=t.label,
            play_count=t.play_count,
        ).model_dump() for t in visible],
        "source": source,
        "total": len(visible),
    }


# ---------------------------------------------------------------------------
# Genre list endpoint
# ---------------------------------------------------------------------------


@router.get("/library/genres")
async def get_library_genres():
    """Return sorted unique non-empty genre strings from the full library."""
    tracks = try_load_library_db()
    if tracks is None:
        if not XML_PATH.exists():
            return {"genres": []}
        tracks = load_library_xml(XML_PATH)
    genres = sorted({t.genre for t in tracks if t.genre})
    return {"genres": genres}


# ---------------------------------------------------------------------------
# Camelot compatibility endpoint
# ---------------------------------------------------------------------------


def _compatible_keys(camelot: str) -> list[str]:
    """Return list of Camelot keys harmonically compatible with the given key."""
    if not camelot or camelot == "?":
        return []
    letter = camelot[-1]          # 'A' or 'B'
    number = int(camelot[:-1])    # numeric part
    other = "B" if letter == "A" else "A"
    return [
        camelot,                                      # same key
        f"{(number % 12) + 1}{letter}",               # +1 clockwise
        f"{((number - 2) % 12) + 1}{letter}",         # -1 counter-clockwise
        f"{number}{other}",                            # relative major/minor
    ]


@router.get("/library/compatible/{camelot}")
async def get_compatible_keys(camelot: str):
    """Return list of Camelot keys harmonically compatible with the given key."""
    keys = _compatible_keys(camelot.upper())
    if not keys:
        raise HTTPException(status_code=400, detail=f"Invalid Camelot key: {camelot}")
    return {"input": camelot.upper(), "compatible": keys}


# ---------------------------------------------------------------------------
# ANLZ endpoint — beat grid, waveform, sections, cues for a single track
# ---------------------------------------------------------------------------

_DB_PATH = Path.home() / "Library" / "Pioneer" / "rekordbox" / "master.db"


def _get_analysis_db():
    """Get a StateDB instance for analysis cache lookups."""
    return StateDB()


def _enrich_with_analysis(data: dict, content_id: str) -> dict:
    """Add 4-stem waveform + essentia data from analysis_cache if available."""
    try:
        import msgpack
        db = _get_analysis_db()
        row = db.get_analysis(content_id, "db")
        db.close()
        if row and row["status"] in ("complete", "failed_demucs", "failed_essentia"):
            if row.get("waveform_4stem"):
                data["waveform_4stem"] = msgpack.unpackb(row["waveform_4stem"], raw=False)
            else:
                data["waveform_4stem"] = None

            if row.get("bpm"):
                data["essentia"] = {
                    "bpm": row["bpm"],
                    "key_musical": row["key_musical"],
                    "camelot": row["camelot"],
                    "genre": row["genre"],
                    "energy": row["energy"],
                    "danceability": row["danceability"],
                }
            else:
                data["essentia"] = None

            data["analyzer_version"] = row.get("analyzer_version")
    except Exception:
        data["waveform_4stem"] = None
        data["essentia"] = None
    return data


@router.get("/tracks/{content_id}/anlz")
async def get_track_anlz(content_id: str):
    """Return parsed ANLZ data for a track — beat grid, cues, sections, waveform.

    Data is read from the Rekordbox ANLZ binary analysis files on the local
    filesystem. Returns 404 if the Rekordbox DB is unavailable or the track
    has no ANLZ data.
    """
    from anlz_parser import parse_track_anlz  # noqa: PLC0415

    if not _DB_PATH.exists():
        # No Rekordbox DB — check if we have analysis_cache data
        fallback = {}
        fallback = _enrich_with_analysis(fallback, content_id)
        if fallback.get("waveform_4stem") or fallback.get("essentia"):
            return fallback
        raise HTTPException(status_code=404, detail="Rekordbox DB not found")

    try:
        from pyrekordbox import Rekordbox6Database  # type: ignore
        db = Rekordbox6Database(str(_DB_PATH))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Cannot open Rekordbox DB: {exc}") from exc

    # Resolve the track's AnalysisDataPath from DB
    try:
        from pyrekordbox.db6.tables import DjmdContent  # type: ignore
    except ImportError:
        try:
            from pyrekordbox.db6 import DjmdContent  # type: ignore
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="pyrekordbox not available") from exc

    try:
        row = db.session.query(DjmdContent).filter(DjmdContent.ID == content_id).first()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB query failed: {exc}") from exc

    if row is None or not row.AnalysisDataPath:
        # No Rekordbox ANLZ — check if we have analysis_cache data
        fallback = {}
        fallback = _enrich_with_analysis(fallback, content_id)
        if fallback.get("waveform_4stem") or fallback.get("essentia"):
            return fallback
        raise HTTPException(status_code=404, detail="No ANLZ data for this track")

    try:
        data = parse_track_anlz(row.AnalysisDataPath, content_id, db.session)
    except FileNotFoundError as exc:
        # ANLZ file missing — check if we have analysis_cache data
        fallback = {}
        fallback = _enrich_with_analysis(fallback, content_id)
        if fallback.get("waveform_4stem") or fallback.get("essentia"):
            return fallback
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ANLZ parse error: {exc}") from exc

    return _enrich_with_analysis(data, content_id)
