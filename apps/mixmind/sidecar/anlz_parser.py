"""
ANLZ parser — reads Pioneer Rekordbox analysis files for MixMind.

Returns structured data matching what the CDJ-3000 renders:
  - beat_grid: list of {time_ms, beat_number (1-4), bpm}
  - first_beat_ms: time of the first musical downbeat (beat_number == 1)
  - waveform_preview: list of amplitude bytes (0-255), one per column
  - waveform_3band: list of {low, mid, high} (0-255 each) or None
  - sections: list of {start_ms, end_ms, kind (int), name (str), color (hex)}
  - hot_cues: list of {slot, time_ms, color_hex, label, is_loop, loop_out_ms}
  - memory_cues: list of {time_ms, label, color_hex}
  - bpm: float — average BPM across the track
"""

from __future__ import annotations

import logging
import os
import struct
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CDJ-3000 canonical color tables
# ---------------------------------------------------------------------------

# Pioneer hot cue color palette (ColorTableIndex → hex)
_CDJ_CUE_COLORS: dict[int, str] = {
    0:  "#00E726",  # default / slot A — green
    1:  "#00D2FF",  # cyan   (slot B)
    2:  "#8000FF",  # violet (slot C)
    3:  "#FF8C00",  # orange (slot D)
    4:  "#FF00C0",  # pink   (slot E)
    5:  "#FF0000",  # red    (slot F)
    6:  "#FFE000",  # yellow (slot G)
    7:  "#00FF64",  # teal   (slot H)
    18: "#FF8C00",  # orange variant
    22: "#00D2FF",  # cyan variant
}
_CDJ_CUE_DEFAULT = "#00E726"
_MEMORY_CUE_COLOR = "#33FF9E"

# Section kind → (name, CDJ-3000 color hex)
_SECTION_KINDS: dict[int, tuple[str, str]] = {
    1: ("intro",   "#00B4FF"),
    2: ("up",      "#F5A623"),
    3: ("down",    "#7B68EE"),
    4: ("chorus",  "#FF2D55"),
    5: ("outro",   "#8E8E93"),
    6: ("verse",   "#34C759"),
    7: ("bridge",  "#AF52DE"),
    8: ("fill_in", "#FF9500"),
}

# Cue kind values in DjmdCue table
_KIND_HOT_CUE    = 6
_KIND_MEMORY_CUE = 1
_KIND_LOOP       = 5

# Slot letters A-H for hot cues
_SLOT_LETTERS = list("ABCDEFGH")

# Root directory for rekordbox ANLZ files
_ANLZ_BASE = Path.home() / "Library" / "Pioneer" / "rekordbox" / "share"


# ---------------------------------------------------------------------------
# 1a — resolve ANLZ file paths
# ---------------------------------------------------------------------------

def _resolve_anlz_paths(analysis_data_path: str) -> dict[str, Path | None]:
    """Resolve DB AnalysisDataPath to absolute .DAT and .EXT paths.

    Parameters
    ----------
    analysis_data_path:
        e.g. "/PIONEER/USBANLZ/{uuid}/ANLZ0000.DAT"

    Returns
    -------
    dict with keys "dat" (Path) and "ext" (Path | None)
    """
    # Strip leading slash so joinpath works correctly
    rel = analysis_data_path.lstrip("/")
    dat_path = _ANLZ_BASE / rel

    # EXT file is sibling with .EXT extension
    ext_path = dat_path.with_suffix(".EXT")

    return {
        "dat": dat_path,
        "ext": ext_path if ext_path.exists() else None,
    }


# ---------------------------------------------------------------------------
# 1b — parse beat grid
# ---------------------------------------------------------------------------

def _parse_beat_grid(dat_file: Any) -> dict:
    """Extract beat grid from ANLZ .DAT file.

    Returns dict with:
      - "beat_grid": list of {time_ms, beat, bpm}
      - "first_beat_ms": ms of first beat==1 entry
      - "avg_bpm": float
    """
    try:
        bg = dat_file.get("beat_grid")
        if bg is None:
            return {"beat_grid": [], "first_beat_ms": 0, "avg_bpm": 0.0}

        beats_arr, bpms_arr, times_arr = bg[0], bg[1], bg[2]
        # times_arr is in SECONDS from pyrekordbox — multiply by 1000 for ms
        beat_grid = [
            {
                "time_ms": round(float(times_arr[i]) * 1000),
                "beat": int(beats_arr[i]),
                "bpm": round(float(bpms_arr[i]), 2),
            }
            for i in range(len(times_arr))
        ]

        # First downbeat: first entry where beat == 1
        # Rekordbox sometimes prepends a phantom beat==1 at < 300ms before the true downbeat.
        # Find the first beat==1 entry that is at a plausible musical position.
        beat1_entries = [b["time_ms"] for b in beat_grid if b["beat"] == 1]
        if len(beat1_entries) >= 2 and beat1_entries[0] < 300:
            first_beat_ms = beat1_entries[1]
        elif beat1_entries:
            first_beat_ms = beat1_entries[0]
        else:
            first_beat_ms = beat_grid[0]["time_ms"] if beat_grid else 0

        avg_bpm = 0.0
        if beat_grid:
            bpms = [b["bpm"] for b in beat_grid if b["bpm"] > 0]
            avg_bpm = round(sum(bpms) / len(bpms), 2) if bpms else 0.0

        return {
            "beat_grid": beat_grid,
            "first_beat_ms": first_beat_ms,
            "avg_bpm": avg_bpm,
        }
    except Exception as exc:
        logger.warning("beat_grid parse error: %s", exc)
        return {"beat_grid": [], "first_beat_ms": 0, "avg_bpm": 0.0}


# ---------------------------------------------------------------------------
# 1c — parse waveform preview (mono)
# ---------------------------------------------------------------------------

def _parse_waveform_preview(dat_file: Any) -> list[int]:
    """Extract mono waveform preview amplitude bytes from .DAT file.

    Returns list of ints 0-255, ~400 columns.
    """
    try:
        wf_tag = dat_file.get("wf_preview")
        if wf_tag is None:
            return []

        # pyrekordbox returns wf_preview as a 2-tuple:
        #   wf_tag[0] = amplitude ndarray (dtype=int8, values 0-31, ~400 entries)
        #   wf_tag[1] = color hint ndarray (dtype=int8, values 0-5) — unused
        if isinstance(wf_tag, tuple) and len(wf_tag) >= 1:
            raw = wf_tag[0]
            if hasattr(raw, "tolist"):
                # Scale from Pioneer int8 range 0-31 to display range 0-255
                return [min(255, max(0, int(v) * 8)) for v in raw.tolist()]
            return []

        # pyrekordbox may return an ndarray or a tag object with .data / .content
        if hasattr(wf_tag, "tolist"):
            return [min(255, max(0, int(v))) for v in wf_tag.tolist()]

        # Tag object: try common attribute names
        for attr in ("data", "content", "entries"):
            raw = getattr(wf_tag, attr, None)
            if raw is not None:
                if hasattr(raw, "tolist"):
                    return [min(255, max(0, int(v))) for v in raw.tolist()]
                if isinstance(raw, (bytes, bytearray)):
                    return [min(255, max(0, int(b))) for b in raw]
                if isinstance(raw, (list, tuple)):
                    return [min(255, max(0, int(v))) for v in raw]

        logger.warning("wf_preview: unknown tag structure %r", type(wf_tag))
        return []
    except Exception as exc:
        logger.warning("wf_preview parse error: %s", exc)
        return []


# ---------------------------------------------------------------------------
# 1d — parse 3-band colored waveform (EXT file)
# ---------------------------------------------------------------------------

def _parse_waveform_3band(ext_file: Any) -> list[dict] | None:
    """Extract 3-band CDJ colored waveform from ANLZ .EXT file.

    Returns list of {low, mid, high} dicts (values 0-255) or None if unavailable.
    """
    if ext_file is None:
        return None

    try:
        # Check which tags are available
        tag_names: list[str] = []
        try:
            tag_names = [t.name for t in ext_file.tags]
        except Exception:
            pass

        # Try common pyrekordbox tag names for PWV5 (3-band colored waveform)
        wf_tag = None
        for candidate in ("wf_color_preview", "wf_color", "PWV5"):
            try:
                wf_tag = ext_file.get(candidate)
                if wf_tag is not None:
                    break
            except Exception:
                continue

        if wf_tag is None:
            logger.debug("No 3-band waveform tag in EXT (available: %s)", tag_names)
            return None

        # Handle tuple return from pyrekordbox
        # wf_color returns 3-tuple: (amplitude (N,2), color_rgb (N,2,3), blue_variant (N,2,3))
        # wf_color_preview may return 2-tuple: (amplitude (N,3), ...)
        if isinstance(wf_tag, tuple):
            # Try each element to find one with usable shape
            for idx, arr in enumerate(wf_tag):
                if not hasattr(arr, "shape"):
                    continue

                # Shape (N, 3): direct low/mid/high amplitudes — scale 0-31 → 0-255
                if len(arr.shape) == 2 and arr.shape[1] == 3:
                    result = []
                    for row in arr.tolist():
                        result.append({
                            "low":  min(255, max(0, int(row[0]) * 8)),
                            "mid":  min(255, max(0, int(row[1]) * 8)),
                            "high": min(255, max(0, int(row[2]) * 8)),
                        })
                    if result:
                        logger.debug("3-band from tuple[%d] shape %s: %d entries", idx, arr.shape, len(result))
                        return result

                # Shape (N, 2, 3): RGB color data — each column has 2 halves × 3 RGB channels
                # In Pioneer's waveform, R corresponds to low-freq, G to mid, B to high.
                # The two halves represent top/bottom of the waveform bar.
                # We take the max of each half to get peak amplitude per band.
                if len(arr.shape) == 3 and arr.shape[1] == 2 and arr.shape[2] == 3:
                    result = []
                    for row in arr.tolist():
                        # row[0]=[R,G,B] top half, row[1]=[R,G,B] bottom half
                        # Take max of the two halves for each channel
                        r = max(abs(row[0][0]), abs(row[1][0]))
                        g = max(abs(row[0][1]), abs(row[1][1]))
                        b = max(abs(row[0][2]), abs(row[1][2]))
                        result.append({
                            "low":  min(255, max(0, r)),
                            "mid":  min(255, max(0, g)),
                            "high": min(255, max(0, b)),
                        })
                    if result:
                        logger.debug("3-band from tuple[%d] RGB shape %s: %d entries", idx, arr.shape, len(result))
                        return result

            logger.debug("3-band waveform: no usable array in tuple (shapes: %s)",
                        [getattr(a, "shape", "?") for a in wf_tag])
            return None

        # The tag holds columns of {low, mid, high} bytes
        # Try various attribute access patterns
        for attr in ("entries", "data", "content"):
            entries = getattr(wf_tag, attr, None)
            if entries is not None:
                result = []
                for entry in entries:
                    if hasattr(entry, "low") and hasattr(entry, "mid") and hasattr(entry, "high"):
                        result.append({
                            "low":  min(255, max(0, int(entry.low))),
                            "mid":  min(255, max(0, int(entry.mid))),
                            "high": min(255, max(0, int(entry.high))),
                        })
                    elif isinstance(entry, (list, tuple)) and len(entry) >= 3:
                        result.append({
                            "low":  min(255, max(0, int(entry[0]))),
                            "mid":  min(255, max(0, int(entry[1]))),
                            "high": min(255, max(0, int(entry[2]))),
                        })
                if result:
                    return result

        logger.debug("3-band waveform tag found but no parseable entries (type=%r)", type(wf_tag))
        return None

    except Exception as exc:
        logger.warning("wf_color_preview parse error: %s", exc)
        return None


# ---------------------------------------------------------------------------
# 1e — parse song structure / sections (EXT file)
# ---------------------------------------------------------------------------

def _beat_index_to_ms(beat_index: int, beat_grid: list[dict]) -> int:
    """Convert a beat grid index to milliseconds.

    Rekordbox PSSI entries use a 0-based beat index into the beat grid array.
    If the index is out of range, interpolate/extrapolate from the last known BPM.
    """
    if not beat_grid:
        return 0
    if beat_index <= 0:
        return beat_grid[0]["time_ms"]
    if beat_index < len(beat_grid):
        return beat_grid[beat_index]["time_ms"]

    # Extrapolate: use last beat's BPM
    last = beat_grid[-1]
    extra_beats = beat_index - (len(beat_grid) - 1)
    bpm = last["bpm"] if last["bpm"] > 0 else 120.0
    ms_per_beat = 60_000.0 / bpm
    return round(last["time_ms"] + extra_beats * ms_per_beat)


def _parse_song_structure(ext_file: Any, beat_grid: list[dict]) -> list[dict]:
    """Extract song structure sections from ANLZ .EXT PSSI tag.

    Returns list of {start_ms, end_ms, kind, name, color_hex}.
    """
    if ext_file is None:
        return []

    try:
        # Try to get PSSI tag
        pssi_tag = None
        for candidate in ("song_structure", "PSSI"):
            try:
                pssi_tag = ext_file.get(candidate)
                if pssi_tag is not None:
                    break
            except Exception:
                continue

        if pssi_tag is None:
            return []

        # Entries are in pssi_tag.entries or pssi_tag.body.entries
        entries = None
        for attr in ("entries", "body"):
            raw = getattr(pssi_tag, attr, None)
            if raw is not None:
                if hasattr(raw, "entries"):
                    entries = raw.entries
                else:
                    entries = raw
                break

        if not entries:
            return []

        # Filter out kind=0 (none) entries and build sections
        sections: list[dict] = []
        valid = [e for e in entries if getattr(e, "kind", 0) != 0]

        for i, entry in enumerate(valid):
            kind = int(getattr(entry, "kind", 0))
            if kind == 0:
                continue

            beat_idx = int(getattr(entry, "beat", 0))
            start_ms = _beat_index_to_ms(beat_idx, beat_grid)

            # end_ms: start of next section, or extrapolate one section length
            if i + 1 < len(valid):
                next_beat_idx = int(getattr(valid[i + 1], "beat", beat_idx + 32))
                end_ms = _beat_index_to_ms(next_beat_idx, beat_grid)
            else:
                # Last section — extend by 32 beats
                end_ms = _beat_index_to_ms(beat_idx + 32, beat_grid)

            name, color_hex = _SECTION_KINDS.get(kind, ("unknown", "#666666"))
            sections.append({
                "start_ms":  start_ms,
                "end_ms":    end_ms,
                "kind":      kind,
                "name":      name,
                "color_hex": color_hex,
            })

        return sections

    except Exception as exc:
        logger.warning("song_structure parse error: %s", exc)
        return []


# ---------------------------------------------------------------------------
# 1f — parse cues from Rekordbox DB
# ---------------------------------------------------------------------------

def _cue_color(color_table_index: int) -> str:
    """Map a Pioneer ColorTableIndex to a CDJ-3000 hex color string."""
    if color_table_index == -1:
        return _CDJ_CUE_DEFAULT
    return _CDJ_CUE_COLORS.get(color_table_index, _CDJ_CUE_DEFAULT)


def _parse_cues_from_db(content_id: str, db_session: Any) -> dict:
    """Query DjmdCue table and return hot_cues + memory_cues.

    Parameters
    ----------
    content_id:
        String form of DjmdContent.ID.
    db_session:
        SQLAlchemy session from Rekordbox6Database.

    Returns
    -------
    dict with "hot_cues" and "memory_cues" lists.
    """
    try:
        from pyrekordbox.db6.tables import DjmdCue  # type: ignore
    except ImportError:
        try:
            from pyrekordbox.db6 import DjmdCue  # type: ignore
        except ImportError:
            logger.warning("Cannot import DjmdCue — no cue data available")
            return {"hot_cues": [], "memory_cues": []}

    try:
        rows = db_session.query(DjmdCue).filter(DjmdCue.ContentID == content_id).all()
    except Exception as exc:
        logger.warning("DjmdCue query failed: %s", exc)
        return {"hot_cues": [], "memory_cues": []}

    hot_cues: list[dict] = []
    memory_cues: list[dict] = []
    hot_cue_slot_index = 0

    for row in rows:
        kind = int(getattr(row, "Kind", 0))
        time_ms = int(getattr(row, "InMsec", 0) or 0)
        label = str(getattr(row, "Comment", "") or "")
        color_idx = int(getattr(row, "ColorTableIndex", 0) or 0)

        if kind == _KIND_HOT_CUE or kind == _KIND_LOOP:
            slot = _SLOT_LETTERS[hot_cue_slot_index] if hot_cue_slot_index < len(_SLOT_LETTERS) else "?"
            hot_cue_slot_index += 1
            loop_out_ms = None
            is_loop = (kind == _KIND_LOOP)
            if is_loop:
                out_raw = getattr(row, "OutMsec", None)
                loop_out_ms = int(out_raw) if out_raw is not None else None

            hot_cues.append({
                "slot":       slot,
                "time_ms":    time_ms,
                "color_hex":  _cue_color(color_idx),
                "label":      label,
                "is_loop":    is_loop,
                "loop_out_ms": loop_out_ms,
            })

        elif kind == _KIND_MEMORY_CUE:
            memory_cues.append({
                "time_ms":   time_ms,
                "label":     label,
                "color_hex": _MEMORY_CUE_COLOR,
            })

    return {"hot_cues": hot_cues, "memory_cues": memory_cues}


# ---------------------------------------------------------------------------
# 1g — public entry point
# ---------------------------------------------------------------------------

def parse_track_anlz(
    analysis_data_path: str,
    content_id: str,
    db_session: Any,
) -> dict:
    """Parse all ANLZ data for a track and return structured dict.

    Parameters
    ----------
    analysis_data_path:
        Value of DjmdContent.AnalysisDataPath (e.g. "/PIONEER/USBANLZ/…/ANLZ0000.DAT").
    content_id:
        String track ID (DjmdContent.ID) for cue DB queries.
    db_session:
        Active SQLAlchemy session from Rekordbox6Database.

    Returns
    -------
    dict with beat_grid, first_beat_ms, waveform_preview, waveform_3band,
    sections, hot_cues, memory_cues, bpm.

    Raises
    ------
    FileNotFoundError:
        If the .DAT file cannot be found on disk.
    """
    from pyrekordbox.anlz import AnlzFile  # type: ignore

    paths = _resolve_anlz_paths(analysis_data_path)
    dat_path = paths["dat"]
    ext_path = paths["ext"]

    if not dat_path.exists():
        # DAT file absent — track was analyzed on a different machine / USB export target.
        # Return partial data (cues from DB, no waveform/beat-grid) so the view still renders.
        cues = _parse_cues_from_db(content_id, db_session)
        return {
            "beat_grid":        [],
            "first_beat_ms":    0,
            "waveform_preview": [],
            "waveform_3band":   None,
            "sections":         [],
            "hot_cues":         cues["hot_cues"],
            "memory_cues":      cues["memory_cues"],
            "bpm":              0.0,
            "partial":          True,   # flag so frontend can show softer fallback
        }

    # Parse .DAT file
    try:
        dat_file = AnlzFile.parse_file(str(dat_path))
    except Exception as exc:
        raise FileNotFoundError(f"Cannot parse ANLZ .DAT: {dat_path}: {exc}") from exc

    # Parse .EXT file (optional)
    ext_file = None
    if ext_path is not None:
        try:
            ext_file = AnlzFile.parse_file(str(ext_path))
        except Exception as exc:
            logger.warning("EXT parse error for %s: %s — skipping sections/3band", ext_path, exc)
            ext_file = None

    # Extract data from .DAT
    bg_result = _parse_beat_grid(dat_file)
    beat_grid = bg_result["beat_grid"]
    first_beat_ms = bg_result["first_beat_ms"]
    avg_bpm = bg_result["avg_bpm"]

    waveform_preview = _parse_waveform_preview(dat_file)

    # Extract data from .EXT
    waveform_3band = _parse_waveform_3band(ext_file)
    sections = _parse_song_structure(ext_file, beat_grid)

    # Cues from DB
    cues = _parse_cues_from_db(content_id, db_session)

    return {
        "beat_grid":       beat_grid,
        "first_beat_ms":   first_beat_ms,
        "waveform_preview": waveform_preview,
        "waveform_3band":  waveform_3band,
        "sections":        sections,
        "hot_cues":        cues["hot_cues"],
        "memory_cues":     cues["memory_cues"],
        "bpm":             avg_bpm,
    }


# ---------------------------------------------------------------------------
# 2 — Round-trip adapters between reader and writer (Phase 21 Task 21-03 Task 4)
#
# These helpers let the test suite parse a real Rekordbox-exported ANLZ file
# back into the shape that ``anlz_writer.write_dat`` consumes, so we can round-
# trip reference → writer → output and diff output vs reference byte-for-byte.
# ---------------------------------------------------------------------------


def _parse_anlz_tags(data: bytes) -> dict[bytes, bytes]:
    """Split an ANLZ file into ``{tag_magic: tag_body_bytes}`` for the FIRST
    occurrence of each magic.

    The "body" is the portion of each tag past the 12-byte envelope
    (``magic + len_header + tag_len``). This matches the slicing convention
    used by our ``construct``-based structs in ``anlz_structs.py``.

    If the same magic appears multiple times (e.g. .DAT has two PCOB tags —
    hot and memory), only the first is returned. Use :func:`_parse_anlz_tags_all`
    when all occurrences are needed.

    Returns
    -------
    Mapping ``magic -> body_bytes`` for every valid tag walked up to EOF.
    """
    tags: dict[bytes, bytes] = {}
    if len(data) < 28:
        return tags
    off = struct.unpack(">I", data[4:8])[0]  # file-header len (usually 0x1C)
    while off < len(data) - 8:
        magic = data[off : off + 4]
        if len(magic) < 4 or not magic.isascii():
            break
        try:
            tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        except struct.error:
            break
        if tag_len < 12 or off + tag_len > len(data):
            break
        body = data[off + 12 : off + tag_len]
        # Only record FIRST occurrence — callers that need duplicates use _all.
        tags.setdefault(magic, body)
        off += tag_len
    return tags


def _parse_anlz_tags_all(data: bytes) -> list[tuple[bytes, bytes]]:
    """Like :func:`_parse_anlz_tags` but returns every occurrence in order.

    This is needed for .DAT files that carry two PCOB tags (hot then memory).
    """
    out: list[tuple[bytes, bytes]] = []
    if len(data) < 28:
        return out
    off = struct.unpack(">I", data[4:8])[0]
    while off < len(data) - 8:
        magic = data[off : off + 4]
        if len(magic) < 4 or not magic.isascii():
            break
        try:
            tag_len = struct.unpack(">I", data[off + 8 : off + 12])[0]
        except struct.error:
            break
        if tag_len < 12 or off + tag_len > len(data):
            break
        out.append((magic, data[off + 12 : off + tag_len]))
        off += tag_len
    return out


def anlz_to_writer_input(data: bytes) -> dict:
    """Inverse of ``anlz_writer.write_dat`` input shape.

    Parses a raw ANLZ .DAT byte-string through our construct-based structs
    and returns a kwargs dict compatible with ``write_dat(**result)``.

    Parameters
    ----------
    data:
        Raw .DAT file bytes (starts with ``PMAI`` magic).

    Returns
    -------
    Dict with keys ``beats``, ``memory_cues``, ``hot_cues``, ``waveform_preview``,
    and optionally ``file_path``. Ready for ``write_dat(out_path, **result)``.

    Raises
    ------
    ValueError
        If required tags (PQTZ or PWAV) are missing.

    Notes
    -----
    PCOB tags appear twice in .DAT (hot then memory) — distinguished by
    ``cue_type`` field (``1`` = hot, ``0`` = memory). We walk all occurrences
    and route by cue_type so ordering doesn't matter.
    """
    # Defer struct imports so callers that only need _parse_anlz_tags pay no cost.
    from anlz_structs import PQTZBody, PWAVBody, PCOBBody, PPTHBody  # type: ignore
    from anlz_writer import BeatEntry, CueEntry  # type: ignore

    all_tags = _parse_anlz_tags_all(data)
    by_magic: dict[bytes, list[bytes]] = {}
    for magic, body in all_tags:
        by_magic.setdefault(magic, []).append(body)

    # --- PQTZ: beat grid (required) ---
    pqtz_bodies = by_magic.get(b"PQTZ")
    if not pqtz_bodies:
        raise ValueError("ANLZ missing required PQTZ (beat grid) tag")
    pqtz = PQTZBody.parse(pqtz_bodies[0])
    beats = [
        BeatEntry(
            time_ms=int(e.time_ms),
            beat_number=int(e.beat),
            bpm=float(e.tempo) / 100.0,
        )
        for e in pqtz.entries
    ]

    # --- PWAV: mono preview waveform (required) ---
    pwav_bodies = by_magic.get(b"PWAV")
    if not pwav_bodies:
        raise ValueError("ANLZ missing required PWAV (waveform preview) tag")
    pwav = PWAVBody.parse(pwav_bodies[0])
    waveform_preview = bytes(pwav.data)

    # --- PCOB: hot + memory cues (optional — may be empty stubs) ---
    hot_cues: list[CueEntry] = []
    memory_cues: list[CueEntry] = []
    for body in by_magic.get(b"PCOB", []):
        pcob = PCOBBody.parse(body)
        target = hot_cues if pcob.cue_type == 1 else memory_cues
        for i, entry in enumerate(pcob.entries):
            slot: Optional[str]
            if pcob.cue_type == 1:
                # hot_cue is 1-indexed (A=1, B=2, ..., H=8)
                hc = int(entry.hot_cue)
                slot = chr(ord("A") + hc - 1) if 1 <= hc <= 8 else None
            else:
                slot = None
            target.append(
                CueEntry(
                    time_ms=int(entry.time_ms),
                    slot=slot,
                    label="",            # PCOB has no label (labels live in PCO2)
                    color_id=0,          # PCOB has no color_id either
                )
            )

    # --- PPTH: file path (optional) ---
    file_path = None
    ppth_bodies = by_magic.get(b"PPTH")
    if ppth_bodies:
        try:
            ppth = PPTHBody.parse(ppth_bodies[0])
            # PPTH.path is UTF-16 BE with trailing NUL — strip and decode
            raw = bytes(ppth.path)
            if raw.endswith(b"\x00\x00"):
                raw = raw[:-2]
            file_path = raw.decode("utf-16-be", errors="replace") or None
        except Exception as exc:
            logger.debug("PPTH parse failed, skipping file_path: %s", exc)

    result = {
        "beats": beats,
        "memory_cues": memory_cues,
        "hot_cues": hot_cues,
        "waveform_preview": waveform_preview,
    }
    if file_path:
        result["file_path"] = file_path
    return result
