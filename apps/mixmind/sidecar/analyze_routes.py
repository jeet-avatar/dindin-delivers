"""Analysis API routes — single track, batch, cancel, status."""
from __future__ import annotations

from fastapi import APIRouter, Query

from analyzer import analyze_track, AnalysisBatchRunner
from rekordbox import try_load_library_db
from library import XML_PATH
from rekordbox import load_library_xml
from state import StateDB

router = APIRouter(prefix="/api")

_batch_runner: AnalysisBatchRunner | None = None


def _get_db() -> StateDB:
    return StateDB()


def _resolve_file_path(content_id: str) -> str | None:
    """Resolve content_id to audio file path from Rekordbox DB or XML."""
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if tracks:
        for t in tracks:
            if t.content_id == content_id and t.file_path:
                return t.file_path
    return None


@router.post("/tracks/{content_id}/analyze")
async def analyze_single(content_id: str, force: bool = Query(False)):
    db = _get_db()
    try:
        if not force:
            existing = db.get_analysis(content_id, "db")
            if existing and existing["status"] == "complete":
                return {"content_id": content_id, "status": "already_complete",
                        "message": "Use ?force=true to re-analyze"}

        file_path = _resolve_file_path(content_id)
        if not file_path:
            return {"content_id": content_id, "status": "failed",
                    "error": f"Cannot resolve file path for track {content_id}",
                    "stage": "pre-check"}

        result = analyze_track(file_path, content_id, "db", db)
        return result
    finally:
        db.close()


@router.post("/analyze/batch")
async def start_batch():
    global _batch_runner
    db = _get_db()

    if _batch_runner and _batch_runner.running:
        return {"status": "already_running", "progress": _batch_runner.status.to_dict()}

    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if not tracks:
        db.close()
        return {"status": "no_tracks", "total": 0}

    analyzed = set()
    for t in tracks:
        existing = db.get_analysis(t.content_id, t.source)
        if existing and existing["status"] == "complete":
            analyzed.add(t.content_id)

    pending = [
        {"content_id": t.content_id, "source": t.source,
         "file_path": t.file_path, "title": t.title, "artist": t.artist}
        for t in tracks
        if t.content_id not in analyzed and t.file_path
    ]

    if not pending:
        db.close()
        return {"status": "all_analyzed", "total": len(tracks)}

    _batch_runner = AnalysisBatchRunner(db)
    _batch_runner.start(pending)
    return {"status": "started", "total": len(pending)}


@router.delete("/analyze/batch")
async def cancel_batch():
    global _batch_runner
    if not _batch_runner or not _batch_runner.running:
        return {"status": "no_batch_running"}
    _batch_runner.cancel()
    return {"status": "cancelling"}


@router.get("/analyze/status")
async def batch_status():
    global _batch_runner
    if not _batch_runner:
        return {"total": 0, "analyzed": 0, "failed": 0, "pending": 0,
                "in_progress": False, "current_track": "", "current_index": 0,
                "eta_sec": 0, "avg_sec_per_track": 0, "failures": []}
    return _batch_runner.status.to_dict()
