"""Audio streaming endpoint — serves local audio files to the renderer.

Supports:
  HEAD /api/audio/stream?path=… — returns Content-Length + Accept-Ranges, no body
  GET  /api/audio/stream?path=… — full 200 FileResponse (no Range) or 206 partial (Range header)
"""
import mimetypes
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, Response

router = APIRouter(prefix="/api")

_ALLOWED_EXTS = {".mp3", ".m4a", ".m4p", ".flac", ".wav", ".aif", ".aiff", ".ogg", ".mp4"}


def _validate_audio_path(path: str) -> tuple[Path, str]:
    """Validate path and return (Path, media_type). Raises HTTPException on failure."""
    file_path = Path(path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")

    if file_path.suffix.lower() not in _ALLOWED_EXTS:
        raise HTTPException(status_code=403, detail="Not a supported audio format")

    media_type, _ = mimetypes.guess_type(str(file_path))
    return file_path, (media_type or "audio/mpeg")


@router.head("/audio/stream")
async def head_audio(path: str) -> Response:
    """Return file metadata so Electron's <audio> element knows Content-Length.

    FastAPI HEAD responses must NOT include a body — return a plain Response with headers only.
    """
    file_path, media_type = _validate_audio_path(path)
    file_size = os.path.getsize(str(file_path))
    return Response(
        status_code=200,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": media_type,
        },
    )


@router.get("/audio/stream")
async def stream_audio(path: str, request: Request) -> Response:
    """Stream a local audio file by absolute path.

    If no Range header: returns full FileResponse (HTTP 200).
    If Range header present: returns partial content (HTTP 206).

    Only files with recognised audio extensions are served.
    """
    file_path, media_type = _validate_audio_path(path)
    file_size = os.path.getsize(str(file_path))

    range_header = request.headers.get("range")

    if not range_header:
        # Full response — no Range requested
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            headers={"Accept-Ranges": "bytes"},
        )

    # Parse "Range: bytes=start-end" or "bytes=start-"
    try:
        unit, ranges = range_header.split("=", 1)
        if unit.strip().lower() != "bytes":
            raise ValueError("unsupported range unit")
        start_str, _, end_str = ranges.strip().partition("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        # Clamp to valid range
        start = max(0, min(start, file_size - 1))
        end = max(start, min(end, file_size - 1))
    except (ValueError, AttributeError):
        # Malformed Range header — fall back to full response
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            headers={"Accept-Ranges": "bytes"},
        )

    length = end - start + 1

    with open(str(file_path), "rb") as f:
        f.seek(start)
        chunk = f.read(length)

    return Response(
        content=chunk,
        status_code=206,
        media_type=media_type,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
        },
    )
