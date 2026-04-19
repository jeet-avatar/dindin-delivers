"""USB drive detection and export endpoints.

GET  /api/usb/status — scan /Volumes/ for Pioneer-formatted drives
POST /api/usb/export — stage + atomic-move a Pioneer USB tree for selected tracks
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from state import StateDB
from usb_exporter import ExportResult, export_to_usb, validate_filesystem

router = APIRouter(prefix="/api/usb")


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


def detect_pioneer_usb() -> dict:
    """Scan /Volumes/ for a directory containing a PIONEER/ subfolder."""
    volumes = Path("/Volumes")
    if not volumes.exists():
        return {"connected": False}
    for volume in volumes.iterdir():
        pioneer_dir = volume / "PIONEER"
        if pioneer_dir.exists() and pioneer_dir.is_dir():
            stat = os.statvfs(str(volume))
            total_gb = (stat.f_blocks * stat.f_frsize) / (1024 ** 3)
            return {
                "connected": True,
                "name": volume.name,
                "path": str(volume),
                "total_gb": round(total_gb, 1),
            }
    return {"connected": False}


@router.get("/status")
async def usb_status():
    return detect_pioneer_usb()


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


class ExportTrackInput(BaseModel):
    """One track to export.

    Either ``content_id + source`` (load from StateDB) or ``file_path`` (ad-hoc)
    must be provided.
    """

    content_id: Optional[str] = None
    source: Optional[str] = None
    file_path: Optional[str] = None
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None


class ExportPlaylist(BaseModel):
    id: int
    name: str
    parent_id: int = 0
    is_folder: bool = False
    track_ids: list[int] = []


class ExportRequest(BaseModel):
    usb_mount_path: str
    tracks: list[ExportTrackInput]
    playlists: Optional[list[ExportPlaylist]] = None


@router.post("/export")
def export_usb(req: ExportRequest):
    """Export selected tracks to a Pioneer-format USB.

    Two-phase: stage → validate → atomic move. Wipes existing PIONEER/ on target.
    """
    usb_path = Path(req.usb_mount_path).expanduser()
    if not usb_path.exists():
        raise HTTPException(400, f"USB path does not exist: {usb_path}")

    fs = validate_filesystem(usb_path)
    if fs["status"] == "rejected":
        raise HTTPException(400, fs["message"])

    # Resolve tracks: load from StateDB when content_id+source given;
    # otherwise use inline file_path + metadata.
    track_records: list[dict] = []
    db = StateDB()
    try:
        for t in req.tracks:
            if t.content_id and t.source:
                track = db.get_track(t.content_id, t.source)
                if track is None:
                    raise HTTPException(
                        404, f"Track not found: {t.source}/{t.content_id}"
                    )
                analysis = db.get_analysis(t.content_id, t.source) or {}
                rec: dict = {
                    "title": track.title,
                    "artist": track.artist,
                    "bpm": track.bpm,
                    "camelot": track.camelot,
                    "duration_sec": track.duration_sec,
                    "rating": track.rating,
                    **analysis,
                }
                if "file_path" not in rec or not rec["file_path"]:
                    rec["file_path"] = t.file_path or ""
                if t.title:
                    rec["title"] = t.title
                if t.artist:
                    rec["artist"] = t.artist
                if t.album:
                    rec["album"] = t.album
                if not rec.get("file_path"):
                    raise HTTPException(
                        400,
                        f"Track {t.content_id} has no file_path in analysis",
                    )
                track_records.append(rec)
            elif t.file_path:
                track_records.append({
                    "file_path": t.file_path,
                    "title": t.title,
                    "artist": t.artist,
                    "album": t.album,
                })
            else:
                raise HTTPException(
                    400,
                    "Each track needs content_id+source OR file_path",
                )
    finally:
        db.close()

    pl_dicts: Optional[list[dict]] = None
    if req.playlists:
        pl_dicts = [p.model_dump() for p in req.playlists]

    result: ExportResult = export_to_usb(
        track_records=track_records,
        usb_path=usb_path,
        playlists=pl_dicts,
    )

    return {
        "status": "ok",
        "exported_count": result.exported_count,
        "bytes_written": result.bytes_written,
        "validation_status": result.validation_status,
        "validation_messages": result.validation_messages,
        "filesystem": fs,
    }
