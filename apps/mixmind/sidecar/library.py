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
    mm_analyzed: bool = False
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

    # Check which tracks have MixMind analysis (single query)
    try:
        from sqlalchemy import text as _text
        analysis_db = _get_analysis_db()
        with analysis_db._engine.connect() as conn:
            rows = conn.execute(_text(
                "SELECT content_id FROM analysis_cache WHERE status='complete'"
            )).fetchall()
        mm_ids = {r[0] for r in rows}
        analysis_db.close()
    except Exception:
        mm_ids = set()

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
            mm_analyzed=t.content_id in mm_ids,
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


def _build_mixmind_dict(row: dict) -> dict | None:
    """Build the mixmind sub-dict from an analysis_cache row."""
    import msgpack

    if not row or row["status"] not in ("complete", "failed_demucs", "failed_essentia"):
        return None

    mm: dict = {}

    # 4-stem waveform
    if row.get("waveform_4stem"):
        mm["waveform_4stem"] = msgpack.unpackb(row["waveform_4stem"], raw=False)
    else:
        mm["waveform_4stem"] = None

    # Beat grid
    if row.get("beat_grid_mm"):
        mm["beat_grid"] = msgpack.unpackb(row["beat_grid_mm"], raw=False)
    else:
        mm["beat_grid"] = None

    # Sections
    if row.get("sections_mm"):
        mm["sections"] = msgpack.unpackb(row["sections_mm"], raw=False)
    else:
        mm["sections"] = None

    # Auto-cues
    if row.get("auto_cues_mm"):
        mm["auto_cues"] = msgpack.unpackb(row["auto_cues_mm"], raw=False)
    else:
        mm["auto_cues"] = None

    # Beat metadata
    mm["beat_confidence"] = row.get("beat_confidence")
    mm["bpm_stable"] = bool(row.get("bpm_stable")) if row.get("bpm_stable") is not None else None

    # Essentia features
    if row.get("bpm"):
        mm["essentia"] = {
            "bpm": row["bpm"],
            "key_musical": row["key_musical"],
            "camelot": row["camelot"],
            "genre": row["genre"],
            "energy": row["energy"],
            "danceability": row["danceability"],
        }
        mm["bpm"] = row["bpm"]
    else:
        mm["essentia"] = None
        mm["bpm"] = None

    mm["analyzer_version"] = row.get("analyzer_version")

    # Return None if there's nothing useful
    has_data = mm.get("waveform_4stem") or mm.get("essentia") or mm.get("beat_grid")
    return mm if has_data else None


def _enrich_with_analysis(data: dict, content_id: str) -> dict:
    """Add 4-stem waveform + essentia data from analysis_cache if available.

    BACKWARD COMPAT: Still populates flat fields (waveform_4stem, essentia,
    analyzer_version) for existing frontend consumers.
    """
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


def _get_mixmind_from_cache(content_id: str) -> dict | None:
    """Load mixmind analysis dict from analysis_cache, or None."""
    try:
        db = _get_analysis_db()
        row = db.get_analysis(content_id, "db")
        db.close()
        return _build_mixmind_dict(row) if row else None
    except Exception:
        return None


def _build_dual_response(rekordbox_data: dict | None, content_id: str) -> dict:
    """Build the dual-source {rekordbox, mixmind, active_source} response.

    Also includes backward-compat flat fields for existing frontend consumers.
    """
    mixmind = _get_mixmind_from_cache(content_id)

    response = {
        "rekordbox": rekordbox_data,
        "mixmind": mixmind,
        "active_source": "auto",
    }

    # Backward compat: flatten rekordbox data into top level
    if rekordbox_data:
        for k, v in rekordbox_data.items():
            response[k] = v

    # Backward compat: overlay analysis_cache flat fields
    if rekordbox_data:
        response = _enrich_with_analysis(response, content_id)
    elif mixmind:
        # No rekordbox — put mixmind flat fields for compat
        response["waveform_4stem"] = mixmind.get("waveform_4stem")
        response["essentia"] = mixmind.get("essentia")
        response["analyzer_version"] = mixmind.get("analyzer_version")

    return response


@router.get("/tracks/{content_id}/anlz")
async def get_track_anlz(content_id: str):
    """Return parsed ANLZ data for a track — beat grid, cues, sections, waveform.

    Returns dual-source response: {rekordbox: {...}, mixmind: {...}, active_source: "auto"}
    plus backward-compatible flat fields for existing frontend consumers.

    Data is read from the Rekordbox ANLZ binary analysis files on the local
    filesystem and the MixMind analysis_cache. Returns 404 if neither source
    has data for this track.
    """
    from anlz_parser import parse_track_anlz  # noqa: PLC0415

    if not _DB_PATH.exists():
        # No Rekordbox DB — check if we have MixMind analysis data
        mixmind = _get_mixmind_from_cache(content_id)
        if mixmind:
            return _build_dual_response(None, content_id)
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
        # No Rekordbox ANLZ — check MixMind analysis
        mixmind = _get_mixmind_from_cache(content_id)
        if mixmind:
            return _build_dual_response(None, content_id)
        raise HTTPException(status_code=404, detail="No ANLZ data for this track")

    try:
        rekordbox_data = parse_track_anlz(row.AnalysisDataPath, content_id, db.session)
    except FileNotFoundError as exc:
        # ANLZ file missing — check MixMind analysis
        mixmind = _get_mixmind_from_cache(content_id)
        if mixmind:
            return _build_dual_response(None, content_id)
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ANLZ parse error: {exc}") from exc

    return _build_dual_response(rekordbox_data, content_id)
