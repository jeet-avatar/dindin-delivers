"""USB drive detection — polls /Volumes/ for Pioneer-formatted drives."""
import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/usb")


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
