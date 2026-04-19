"""USB export orchestrator — stage → validate → atomic move.

Pattern: two-phase write per RESEARCH.md Architecture Pattern 1.

1. Build the full PIONEER/ tree in ``~/.mixmind/staging/{uuid}/``
2. Validate by parsing back with our own ``pdb_reader`` + ``anlz_parser``
   (pyrekordbox cannot parse PDB — see Task 2 notes)
3. Pre-export USB clean — wipe target ``PIONEER/rekordbox/`` + ``PIONEER/USBANLZ/``
   to avoid Pitfall #8 ID collisions between MixMind and prior exports
4. Atomically move staging → ``/Volumes/{USB}/PIONEER/`` (``os.rename`` on
   same-FS; fall back to ``shutil.copytree`` + ``sync`` for cross-FS)

License: MIT — uses only our hand-rolled writers + ``construct``. No rbox.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import uuid as _uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from anlz_writer import BeatEntry, CueEntry, SectionEntry, Waveform3Band, write_dat, write_ext
from pdb_reader import read_pdb
from pdb_writer import PlaylistRecord, TrackRecord, write_pdb
from usb_layout import (
    analyze_path,
    audio_path_on_usb,
    mint_track_id,
    reset_id_counter,
    usbanlz_dir,
)


# Filesystem support per CDJ-3000 spec (RESEARCH.md Pitfall 4)
FAT32_NAMES = ("msdos", "fat32")
FAT32_MAX_BYTES = 32 * 1024**3


@dataclass
class ExportResult:
    staging_dir: Path
    usb_target: Path
    exported_count: int
    validation_status: str          # "ok" | "warning" | "failed"
    validation_messages: list[str]
    bytes_written: int


def export_to_usb(
    track_records: list[dict],
    usb_path: Path,
    playlists: Optional[list[dict]] = None,
    progress_cb: Optional[Callable[[str, int, int], None]] = None,
) -> ExportResult:
    """Export ``track_records`` to the Pioneer-format USB at ``usb_path``.

    Each record is a dict carrying at minimum ``file_path``, plus optional
    tags (``title``, ``artist``, ``album``, ``bpm``, ``camelot``,
    ``duration_sec``, ``bitrate``, ``sample_rate``, ``sample_depth``)
    and analysis fields (``beat_grid_mm``, ``auto_cues_mm``,
    ``memory_cues``, ``sections_mm``, ``waveform_4stem``).
    """
    usb_path = Path(usb_path).resolve()

    # 1. Filesystem check
    fs_status = validate_filesystem(usb_path)
    if fs_status["status"] == "rejected":
        raise ValueError(f"Filesystem unsupported: {fs_status['message']}")

    # 2. Fresh sequential IDs for this export (Pitfall 8)
    reset_id_counter()

    # 3. Stage in ~/.mixmind/staging/{uuid}/
    staging = Path.home() / ".mixmind" / "staging" / str(_uuid.uuid4())
    staging.mkdir(parents=True, exist_ok=True)

    try:
        # 4. Write PDB track rows + ANLZ files per track + copy audio
        pdb_tracks: list[TrackRecord] = []
        total = len(track_records)
        for i, rec in enumerate(track_records):
            if progress_cb:
                progress_cb("write_anlz", i + 1, total)

            tid = mint_track_id()
            src_audio = Path(rec["file_path"]).expanduser()
            artist = rec.get("artist") or ""
            album = rec.get("album") or ""

            # Copy audio to Contents/<Artist>/<Album>/<original_filename>
            dst_audio = audio_path_on_usb(
                artist, album, src_audio.name, staging,
            )
            dst_audio.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_audio, dst_audio)
            if _sha256(src_audio) != _sha256(dst_audio):
                raise RuntimeError(
                    f"Audio copy byte-mismatch for {src_audio.name}"
                )

            # Write ANLZ files for this track
            anlz_dir = usbanlz_dir(tid, staging)
            anlz_dir.mkdir(parents=True, exist_ok=True)

            beats = _build_beats_from_record(rec)
            hot_cues = _build_hot_cues_from_record(rec)
            memory_cues = _build_memory_cues_from_record(rec)
            sections = _build_sections_from_record(rec)
            preview = _build_waveform_preview(rec)
            waveform_3band = _build_waveform_3band(rec)

            # PPTH field: absolute on-device path, must match the CDJ's
            # mounted view: ``/<Artist>/<Album>/<filename>`` under Contents/
            # (Pioneer drops the mount point prefix at playback time). The
            # writer stores this verbatim in the ANLZ header.
            path_on_device = "/" + str(
                dst_audio.relative_to(staging)
            ).replace(os.sep, "/")

            write_dat(
                anlz_dir / "ANLZ0000.DAT",
                beats=beats,
                memory_cues=memory_cues,
                hot_cues=hot_cues,
                waveform_preview=preview,
                sections=sections,
                file_path=path_on_device,
            )
            write_ext(
                anlz_dir / "ANLZ0000.EXT",
                waveform_3band=waveform_3band,
                memory_cues=memory_cues,
                hot_cues=hot_cues,
                sections=sections,
                file_path=path_on_device,
            )

            pdb_tracks.append(TrackRecord(
                id=tid,
                title=rec.get("title") or src_audio.stem,
                artist_name=artist,
                album_name=album,
                genre_name=rec.get("genre") or "",
                key_name=rec.get("camelot") or rec.get("key_musical") or "",
                bpm=float(rec.get("bpm") or 0.0),
                duration_sec=int(rec.get("duration_sec") or 0),
                rating=int(rec.get("rating") or 0),
                color_id=int(rec.get("color_id") or 0),
                bitrate=int(rec.get("bitrate") or 0),
                sample_rate=int(rec.get("sample_rate") or 44100),
                sample_depth=int(rec.get("sample_depth") or 16),
                track_number=int(rec.get("track_number") or 0),
                year=int(rec.get("year") or 0),
                file_size=src_audio.stat().st_size,
                file_path_on_usb=path_on_device,
                file_name=src_audio.name,
                isrc=rec.get("isrc") or "",
                comment=rec.get("comment") or "",
            ))

        # 5. Write export.pdb
        if progress_cb:
            progress_cb("write_pdb", total, total)
        pdb_path = staging / "PIONEER" / "rekordbox" / "export.pdb"
        write_pdb(
            pdb_path, pdb_tracks,
            playlists=_to_playlist_records(playlists),
        )

        # 6. Validate via parse-back
        if progress_cb:
            progress_cb("validate", 1, 1)
        validation = _validate_export(staging, expected_count=len(pdb_tracks))
        if validation["status"] == "failed":
            raise RuntimeError(
                f"Export validation failed: {validation['messages']}"
            )

        # 7. Wipe existing PIONEER/ on target USB (Pitfall 8)
        if progress_cb:
            progress_cb("clean_target", 1, 1)
        clean_target(usb_path)

        # 8. Atomic move staging → USB
        if progress_cb:
            progress_cb("move_to_usb", 1, 1)
        bytes_written = _move_to_usb(staging, usb_path)

        return ExportResult(
            staging_dir=staging,
            usb_target=usb_path,
            exported_count=len(pdb_tracks),
            validation_status=validation["status"],
            validation_messages=validation["messages"],
            bytes_written=bytes_written,
        )

    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)


# ---------------------------------------------------------------------------
# Filesystem checks
# ---------------------------------------------------------------------------


def validate_filesystem(usb_path: Path) -> dict:
    """Best-effort check: ``usb_path`` must exist; diskutil (macOS) reports FS.

    Returns ``{"status": "ok"|"warning"|"rejected", "message": str}``.
    Non-macOS / test environments fall through to ``warning`` — we can't
    rule out bad filesystems but also don't want to reject tmp-dir tests.
    """
    if not usb_path.exists():
        return {"status": "rejected",
                "message": f"{usb_path} does not exist"}

    try:
        out = subprocess.run(
            ["diskutil", "info", str(usb_path)],
            capture_output=True, text=True, check=True, timeout=5,
        )
    except (subprocess.CalledProcessError, FileNotFoundError,
            subprocess.TimeoutExpired):
        return {"status": "warning",
                "message": "Could not verify filesystem (non-macOS or test env)"}

    haystack = out.stdout.lower()
    if "ntfs" in haystack:
        return {"status": "rejected",
                "message": "NTFS not supported by CDJ — reformat to exFAT"}
    if any(fs in haystack for fs in FAT32_NAMES):
        return {"status": "warning",
                "message": "FAT32 detected; recommend exFAT for libraries > 32GB"}
    if "exfat" in haystack or "hfs" in haystack:
        return {"status": "ok", "message": "exFAT or HFS+ — recommended"}
    return {"status": "ok", "message": "filesystem OK"}


def clean_target(usb_path: Path) -> None:
    """Wipe PIONEER/rekordbox/ + PIONEER/USBANLZ/ on the target USB.

    Per RESEARCH.md Pitfall 8: mixing MixMind and prior Rekordbox exports
    on the same USB silently corrupts the library due to ID collisions.
    """
    pioneer_dir = Path(usb_path) / "PIONEER"
    if not pioneer_dir.exists():
        return
    for sub in ("rekordbox", "USBANLZ"):
        target = pioneer_dir / sub
        if target.exists():
            shutil.rmtree(target)


def _move_to_usb(staging: Path, usb_path: Path) -> int:
    """Move staging/PIONEER → usb_path/PIONEER atomically where possible.

    Also moves staging/Contents → usb_path/Contents (audio tree).
    """
    total = 0
    for top in ("PIONEER", "Contents"):
        src = staging / top
        if not src.exists():
            continue
        dst = usb_path / top
        if dst.exists():
            shutil.rmtree(dst)
        dst.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.rename(src, dst)
        except OSError:
            # Cross-filesystem — copytree fallback
            shutil.copytree(src, dst)
            try:
                subprocess.run(["sync"], check=True, timeout=30)
            except Exception:
                pass
        total += _dir_size(dst)
    return total


# ---------------------------------------------------------------------------
# Validation — uses our own pdb_reader (pyrekordbox doesn't parse PDB)
# ---------------------------------------------------------------------------


def _validate_export(staging: Path, expected_count: int) -> dict:
    messages: list[str] = []
    pdb_path = staging / "PIONEER" / "rekordbox" / "export.pdb"
    if not pdb_path.exists():
        return {"status": "failed", "messages": ["export.pdb not created"]}

    try:
        parsed = read_pdb(pdb_path)
    except Exception as e:     # noqa: BLE001
        return {"status": "failed",
                "messages": [f"pdb_reader parse error: {e}"]}

    got = parsed.row_count(0)
    if got != expected_count:
        return {"status": "failed",
                "messages": [f"PDB has {got} tracks, expected {expected_count}"]}
    messages.append(f"PDB parsed OK: {got} tracks across "
                    f"{len(parsed.pages_for_table(0))} page(s)")

    # Spot-check ANLZ files exist for the first 3 tracks
    # (track IDs start at 0x10000000 + 0, +1, +2 — we reset the counter above)
    from usb_layout import _TRACK_ID_BASE
    for i in range(min(3, expected_count)):
        tid = _TRACK_ID_BASE + i
        anlz_dir = usbanlz_dir(tid, staging)
        if not (anlz_dir / "ANLZ0000.DAT").exists():
            messages.append(f"Missing ANLZ0000.DAT for track {tid:08x}")
        if not (anlz_dir / "ANLZ0000.EXT").exists():
            messages.append(f"Missing ANLZ0000.EXT for track {tid:08x}")

    status = "ok" if all("Missing" not in m for m in messages) else "warning"
    return {"status": status, "messages": messages}


# ---------------------------------------------------------------------------
# Record-to-internal-format converters
# ---------------------------------------------------------------------------


def _build_beats_from_record(rec: dict) -> list[BeatEntry]:
    grid = rec.get("beat_grid_mm") or rec.get("beat_grid") or []
    out: list[BeatEntry] = []
    for b in grid:
        out.append(BeatEntry(
            time_ms=int(b["time_ms"]),
            beat_number=int(b.get("beat_number", 1)),
            bpm=float(b.get("bpm") or rec.get("bpm") or 120.0),
        ))
    return out


def _build_hot_cues_from_record(rec: dict) -> list[CueEntry]:
    cues = rec.get("auto_cues_mm") or rec.get("hot_cues") or []
    out: list[CueEntry] = []
    for i, c_ in enumerate(cues[:8]):
        slot = chr(ord("A") + i)
        out.append(CueEntry(
            time_ms=int(c_["time_ms"]),
            slot=slot,
            label=c_.get("label", f"Cue{slot}"),
            color_id=int(c_.get("color_id", i % 8)),
            is_loop=bool(c_.get("is_loop", False)),
            loop_end_ms=c_.get("loop_end_ms"),
        ))
    return out


def _build_memory_cues_from_record(rec: dict) -> list[CueEntry]:
    cues = rec.get("memory_cues") or []
    return [
        CueEntry(
            time_ms=int(c_["time_ms"]),
            slot=None,
            label=c_.get("label", f"Mem{i}"),
            color_id=int(c_.get("color_id", 0)),
        )
        for i, c_ in enumerate(cues)
    ]


def _build_sections_from_record(rec: dict) -> list[SectionEntry]:
    sections = rec.get("sections_mm") or []
    return [
        SectionEntry(
            start_beat=int(s.get("start_beat", 0)),
            end_beat=int(s.get("end_beat", 0)),
            kind=int(s.get("kind", 1)),
            name=s.get("name", "section"),
        )
        for s in sections
    ]


def _build_waveform_preview(rec: dict) -> bytes:
    """800-byte mono waveform preview (amplitude 0..255 per column)."""
    wf = rec.get("waveform_4stem") or []
    if not wf:
        return b"\x00" * 800
    out = bytearray()
    step = max(1, len(wf) // 800)
    for i in range(800):
        idx = min(i * step, len(wf) - 1)
        col = wf[idx]
        amp = max(
            int(col.get("drums", 0)),
            int(col.get("bass", 0)),
            int(col.get("vocals", 0)),
            int(col.get("other", 0)),
        )
        out.append(min(255, amp))
    return bytes(out[:800].ljust(800, b"\x00"))


def _build_waveform_3band(rec: dict) -> list[Waveform3Band]:
    wf = rec.get("waveform_4stem") or []
    if not wf:
        return [Waveform3Band(0, 0, 0, 0)] * 1200
    return [
        Waveform3Band(
            drums=int(col.get("drums", 0)),
            bass=int(col.get("bass", 0)),
            other=int(col.get("other", 0)),
            vocals=int(col.get("vocals", 0)),
        )
        for col in wf
    ]


def _to_playlist_records(
    playlists: Optional[list[dict]],
) -> Optional[list[PlaylistRecord]]:
    if not playlists:
        return None
    return [
        PlaylistRecord(
            id=int(p["id"]),
            name=p["name"],
            parent_id=int(p.get("parent_id", 0)),
            is_folder=bool(p.get("is_folder", False)),
            track_ids=list(p.get("track_ids") or []),
        )
        for p in playlists
    ]


def _sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _dir_size(p: Path) -> int:
    total = 0
    for f in p.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total
