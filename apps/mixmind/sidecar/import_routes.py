"""Library import — folder scan OR existing Rekordbox read path.

Phase 21-01 — entry point for the native USB-export pipeline.

Two modes:
  1. folder_path  — scan a directory, read tags via mutagen, register rows
                    in imported_tracks with source-neutral content_ids.
  2. from_rekordbox=true — reuse the existing pyrekordbox read path
     (`try_load_library_db` → `load_library_xml` XML fallback) and copy
     those tracks into imported_tracks with prefix `rbximport_`. The
     existing rekordbox.py and library.py code is NOT refactored; this
     module only calls the public functions already shipping.

Idempotence: re-running the same folder produces zero new rows — INSERT OR
IGNORE on UNIQUE(file_path) handles the dedupe. Response reports
`skipped_duplicates` so the caller can surface it.
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from folder_scanner import ScannedTrack, scan_folder
from state import ImportedTrack, StateDB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/library")


class ImportRequest(BaseModel):
    folder_path: str | None = None
    """Absolute or ~/-prefixed path to a directory of audio files.
    Required when from_rekordbox is False."""

    from_rekordbox: bool = False
    """If True, bypass folder_path and pull tracks from the existing
    Rekordbox master.db / rekordbox.xml via pyrekordbox."""


class ImportResponse(BaseModel):
    batch_id: str
    imported: int
    skipped_duplicates: int
    warnings: list[str]
    source: str  # "folder" or "rekordbox"


def _get_state_db() -> StateDB:
    db = StateDB()
    try:
        yield db
    finally:
        db.close()


@router.post("/import", response_model=ImportResponse)
async def import_library(
    req: ImportRequest,
    db: Annotated[StateDB, Depends(_get_state_db)],
) -> ImportResponse:
    batch_id = str(uuid.uuid4())
    warnings: list[str] = []

    if req.from_rekordbox:
        # PRESERVATION: existing pyrekordbox code path, unchanged.
        from library import XML_PATH  # local import avoids cycle at module load
        from rekordbox import load_library_xml, try_load_library_db

        tracks = try_load_library_db()
        if tracks is None and XML_PATH.exists():
            try:
                tracks = load_library_xml(XML_PATH)
            except Exception as exc:  # noqa: BLE001
                logger.warning("load_library_xml failed: %s", exc)
                tracks = None
        if not tracks:
            raise HTTPException(
                status_code=404,
                detail="No Rekordbox library found (master.db or rekordbox.xml)",
            )

        imported = 0
        skipped = 0
        for t in tracks:
            if not t.file_path:
                # Skip streaming-only tracks (no local file)
                continue
            cid = f"rbximport_{t.content_id}"
            wrote = db.add_imported_track(ImportedTrack(
                content_id=cid,
                file_path=t.file_path,
                title=t.title,
                artist=t.artist,
                album="",
                genre=t.genre or "",
                duration_sec=int(t.duration_sec or 0),
                bitrate_kbps=0,
                sample_rate_hz=0,
                file_size_bytes=0,
                import_batch_id=batch_id,
                wav_extensible=False,
            ))
            if wrote:
                imported += 1
            else:
                skipped += 1
        return ImportResponse(
            batch_id=batch_id,
            imported=imported,
            skipped_duplicates=skipped,
            warnings=warnings,
            source="rekordbox",
        )

    # Folder-scan path
    if not req.folder_path:
        raise HTTPException(
            status_code=400,
            detail="folder_path required when from_rekordbox=false",
        )
    folder = Path(req.folder_path).expanduser()
    try:
        folder = folder.resolve()
    except OSError as exc:
        raise HTTPException(
            status_code=400, detail=f"Cannot resolve folder: {exc}",
        ) from exc
    if not folder.is_dir():
        raise HTTPException(
            status_code=400, detail=f"Not a directory: {folder}",
        )

    try:
        scanned: list[ScannedTrack] = scan_folder(folder)
    except NotADirectoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    imported = 0
    skipped = 0
    for s in scanned:
        wrote = db.add_imported_track(ImportedTrack(
            content_id=s.content_id,
            file_path=s.file_path,
            title=s.title,
            artist=s.artist,
            album=s.album,
            genre=s.genre,
            duration_sec=s.duration_sec,
            bitrate_kbps=s.bitrate_kbps,
            sample_rate_hz=s.sample_rate_hz,
            file_size_bytes=s.file_size_bytes,
            import_batch_id=batch_id,
            wav_extensible=s.wav_extensible,
        ))
        if wrote:
            imported += 1
            if s.wav_extensible:
                warnings.append(
                    f"WAVE_FORMAT_EXTENSIBLE detected (CDJ-3000 may refuse): "
                    f"{s.file_path}"
                )
        else:
            skipped += 1

    return ImportResponse(
        batch_id=batch_id,
        imported=imported,
        skipped_duplicates=skipped,
        warnings=warnings,
        source="folder",
    )
