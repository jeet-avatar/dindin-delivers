"""ANLZ (.DAT / .EXT / .2EX) file writer — hand-rolled per Phase 21 Option C.

**License posture:** Uses ONLY construct (MIT) + Deep Symmetry public spec.
rbox 0.1.7 was EVALUATED and REJECTED due to GPL-3.0 license contamination.
DO NOT import rbox here or anywhere else in MixMind.

**Round-trip oracle:** apps/mixmind/sidecar/anlz_parser.py is the reference
parser. Every byte this writer produces must parse back through pyrekordbox's
AnlzFile reader (independent parser cross-check).

**Written against spec:**
  https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html
  https://github.com/Deep-Symmetry/crate-digger/blob/main/src/main/kaitai/rekordbox_anlz.ksy

**Byte layouts verified against:** /Volumes/Untitled/PIONEER/USBANLZ/ (91 real
Rekordbox 7 exported tracks, Apr 2026).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import construct as c

from anlz_structs import (
    AnlzFileHeader,
    AnlzTagEnvelope,
    PQTZBody,
    PCOBBody,
    PCO2Body,
    PCO2CuePoint,
    PWAVBody,
    PWV2Body,
    PWV3Body,
    PWV5Body,
    PPTHBody,
    PVBRBody,
    PSSIBody,
)


# ===========================================================================
# Input dataclasses — what callers pass into the public API
# ===========================================================================


@dataclass
class BeatEntry:
    """Single beat on the grid."""

    time_ms: int
    beat_number: int   # 1..4, where 1 is a downbeat
    bpm: float         # BPM at this beat (will be stored × 100 as Int16ub)


@dataclass
class CueEntry:
    """Hot cue or memory cue point."""

    time_ms: int
    slot: Optional[str] = None   # 'A'..'H' for hot cues; None for memory cue
    label: str = ""
    color_id: int = 0            # 0..7 per Pioneer palette
    is_loop: bool = False
    loop_end_ms: Optional[int] = None


@dataclass
class SectionEntry:
    """Song structure section (intro/verse/chorus/etc.)."""

    start_beat: int
    end_beat: int
    kind: int = 1           # 1..8 per anlz_parser._SECTION_KINDS
    name: str = ""


@dataclass
class Waveform3Band:
    """Single column of 3-band waveform (drums+bass → low, other → mid, vocals → high)."""

    drums: int = 0
    bass: int = 0
    other: int = 0
    vocals: int = 0


# ===========================================================================
# Constants
# ===========================================================================

# File-header extras observed on the vast majority of Rekordbox 7 tracks.
# Verified from /Volumes/Untitled/PIONEER/USBANLZ/P001/00000019/ANLZ0000.DAT
# and ~90 other reference tracks. A small minority (P071/0001B60B) carry what
# looks like a hash instead — we emit the common pattern.
_FILE_HEADER_DEFAULTS = {
    "u1": 1,
    "u2": 0x00010000,
    "u3": 0x00010000,
    "u4": 0,
}

_PWAV_DEFAULT_BYTES = 400   # Reference files use 400, NOT 800 as early spec hinted.


# ===========================================================================
# Internal helpers
# ===========================================================================


def _build_tag(
    magic: bytes,
    body_struct: c.Construct,
    body_dict: dict,
    len_header: int,
) -> bytes:
    """Assemble a single ANLZ tag: 12-byte envelope + body.

    The envelope itself is 12 bytes (magic + len_header + len_tag). `len_header`
    is the total bytes of "tag header" per the Deep Symmetry spec — varies per
    tag type (16 for PPTH, 20 for PWAV/PCO2, 24 for PQTZ/PCOB/PWV3, 32 for PSSI).
    The `len_header - 12` bytes of "header extras" are part of the body struct
    in our layout (see anlz_structs.py for the per-tag breakdown).
    """
    body = body_struct.build(body_dict)
    envelope = AnlzTagEnvelope.build({
        "magic": magic,
        "len_header": len_header,
        "len_tag": 12 + len(body),
    })
    return envelope + body


def _write_anlz_file(
    out_path: Path,
    tags: list[bytes],
    header_overrides: Optional[dict] = None,
) -> None:
    """Concatenate the 28-byte file header + all tag bytes; write to disk."""
    body = b"".join(tags)
    hdr_fields = {**_FILE_HEADER_DEFAULTS}
    if header_overrides:
        hdr_fields.update(header_overrides)
    header = AnlzFileHeader.build({
        "len_header": 28,
        "len_file": 28 + len(body),
        **hdr_fields,
    })
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(header + body)


def _encode_utf16_be_with_nul(s: str) -> bytes:
    """UTF-16 BE encoding with a trailing U+0000 terminator (4-byte-safe)."""
    return s.encode("utf-16-be") + b"\x00\x00"


def _build_ppth_tag(file_path: str) -> bytes:
    """PPTH tag — Pioneer audio file path as UTF-16 BE with trailing NUL."""
    encoded = _encode_utf16_be_with_nul(file_path)
    return _build_tag(
        b"PPTH",
        PPTHBody,
        {"len_path": len(encoded), "path": encoded},
        len_header=16,
    )


def _build_pqtz_tag(beats: list[BeatEntry]) -> bytes:
    """PQTZ tag — beat grid (DAT only)."""
    entries = [
        {
            "beat": b.beat_number,
            "tempo": int(round(b.bpm * 100)),
            "time_ms": b.time_ms,
        }
        for b in beats
    ]
    return _build_tag(
        b"PQTZ",
        PQTZBody,
        {"entry_count": len(entries), "entries": entries},
        len_header=24,
    )


def _cue_pcob_dict(cues: list[CueEntry], cue_type: int) -> dict:
    """Build a PCOBBody dict. cue_type: 0 = memory, 1 = hot."""
    entries = []
    for c_entry in cues:
        slot_idx = 0 if c_entry.slot is None else (ord(c_entry.slot.upper()) - ord("A") + 1)
        entries.append({
            "hot_cue": slot_idx,
            "type": 2 if c_entry.is_loop else 1,
            "time_ms": c_entry.time_ms,
            "loop_time_ms": (
                c_entry.loop_end_ms
                if c_entry.is_loop and c_entry.loop_end_ms is not None
                else 0xFFFFFFFF
            ),
        })
    return {"cue_type": cue_type, "count": len(entries), "entries": entries}


def _build_pcob_tag(cues: list[CueEntry], cue_type: int) -> bytes:
    """PCOB tag — legacy uncolored cues."""
    return _build_tag(
        b"PCOB",
        PCOBBody,
        _cue_pcob_dict(cues, cue_type),
        len_header=24,
    )


def _cue_pco2_dict(cues: list[CueEntry], cue_type: int) -> dict:
    """Build a PCO2Body dict. cue_type: 0 = memory, 1 = hot."""
    entries = []
    for c_entry in cues:
        slot_idx = 0 if c_entry.slot is None else (ord(c_entry.slot.upper()) - ord("A") + 1)
        comment_bytes = _encode_utf16_be_with_nul(c_entry.label)
        # Per spec: len_entry counts whole entry including the 12-byte PCP2 envelope.
        # Fixed portion = 12 envelope + 4(hot_cue) + 1(cue_type) + 3(pad) + 4(time_ms)
        #               + 4(loop_time) + 1(color_id) + 7(pad) + 2(loop_num) + 2(loop_denom)
        #               + 4(len_comment) + 4(rgb_tail) = 48
        # Total entry = 48 + len(comment_bytes)
        entries.append({
            "len_entry": 48 + len(comment_bytes),
            "hot_cue": slot_idx,
            "cue_type": 2 if c_entry.is_loop else 1,
            "time_ms": c_entry.time_ms,
            "loop_time_ms": (
                c_entry.loop_end_ms
                if c_entry.is_loop and c_entry.loop_end_ms is not None
                else 0xFFFFFFFF
            ),
            "color_id": c_entry.color_id,
            "len_comment": len(comment_bytes),
            "comment": comment_bytes,
        })
    return {"cue_type": cue_type, "count": len(entries), "entries": entries}


def _build_pco2_tag(cues: list[CueEntry], cue_type: int) -> bytes:
    """PCO2 tag — NXS2 cues with color + UTF-16 label."""
    return _build_tag(
        b"PCO2",
        PCO2Body,
        _cue_pco2_dict(cues, cue_type),
        len_header=20,
    )


def _build_pwav_tag(preview: bytes) -> bytes:
    """PWAV tag — mono amplitude preview (typically 400 bytes)."""
    return _build_tag(
        b"PWAV",
        PWAVBody,
        {"len_preview": len(preview), "data": preview},
        len_header=20,
    )


def _build_pwv2_tag(preview: bytes) -> bytes:
    """PWV2 tag — tiny mono amplitude preview."""
    return _build_tag(
        b"PWV2",
        PWV2Body,
        {"len_preview": len(preview), "data": preview},
        len_header=20,
    )


def _build_pwv3_tag(data: bytes) -> bytes:
    """PWV3 tag — monochrome detail waveform (1 byte per column)."""
    return _build_tag(
        b"PWV3",
        PWV3Body,
        {"len_entries": len(data), "data": data},
        len_header=24,
    )


def _build_pwv5_tag(entries: list[int]) -> bytes:
    """PWV5 tag — color detail waveform (2 bytes per column, packed RGB15)."""
    return _build_tag(
        b"PWV5",
        PWV5Body,
        {"len_entries": len(entries), "entries": entries},
        len_header=24,
    )


def _pack_rgb15(r: int, g: int, b: int) -> int:
    """Pack 8-bit RGB into a 15-bit RGB value (5 bits per channel) as Int16ub."""
    r5 = (max(0, min(255, r)) >> 3) & 0x1F
    g5 = (max(0, min(255, g)) >> 3) & 0x1F
    b5 = (max(0, min(255, b)) >> 3) & 0x1F
    # Packing: high bit unused, then RRRRR GGGGG BBBBB
    return (r5 << 10) | (g5 << 5) | b5


def _build_pssi_tag(sections: list[SectionEntry]) -> bytes:
    """PSSI tag — song structure. Fragile per RESEARCH.md Pitfall 3."""
    entries = [
        {
            "index": i,
            "beat": s.start_beat,
            "kind": s.kind,
        }
        for i, s in enumerate(sections)
    ]
    end_beat = sections[-1].end_beat if sections else 0
    return _build_tag(
        b"PSSI",
        PSSIBody,
        {"len_entries": len(entries), "end_beat": end_beat, "entries": entries},
        len_header=32,
    )


# ===========================================================================
# Public API
# ===========================================================================


def write_dat(
    out_path: Path,
    beats: list[BeatEntry],
    memory_cues: list[CueEntry],
    hot_cues: list[CueEntry],
    waveform_preview: bytes,
    sections: Optional[list[SectionEntry]] = None,
    file_path: Optional[str] = None,
) -> None:
    """Write a Rekordbox-compatible ANLZ0000.DAT file.

    Tag order mirrors what reference files emit:
      PPTH (optional) → PQTZ → PWAV → PCOB(hot) → PCOB(mem)

    PSSI traditionally lives in .EXT (not .DAT) per reference file inventory;
    pass ``sections`` to :func:`write_ext` instead.

    Parameters
    ----------
    out_path:
        Destination path — typically ``.../Pxxx/<id>/ANLZ0000.DAT``.
    beats:
        Beat grid. Each BeatEntry sets (time_ms, beat_number, bpm).
    memory_cues:
        Memory cues (no slot). Empty list writes an empty PCOB stub.
    hot_cues:
        Hot cues with slot letters A..H.
    waveform_preview:
        Mono amplitude bytes. Reference files use 400; this is enforced as a
        soft default — callers may pass any length.
    sections:
        Ignored for .DAT — kept in signature for symmetry with write_ext.
    file_path:
        Pioneer-format audio file path for the PPTH tag. If None, PPTH is
        omitted (still produces a valid file; CDJ may fall back to PDB row).
    """
    tags: list[bytes] = []

    if file_path:
        tags.append(_build_ppth_tag(file_path))

    tags.append(_build_pqtz_tag(beats))
    tags.append(_build_pwav_tag(waveform_preview))

    # Always write PCOB stubs (even empty) — matches reference file pattern.
    tags.append(_build_pcob_tag(hot_cues, cue_type=1))
    tags.append(_build_pcob_tag(memory_cues, cue_type=0))

    _write_anlz_file(out_path, tags)


def write_ext(
    out_path: Path,
    waveform_3band: list[Waveform3Band],
    memory_cues: Optional[list[CueEntry]] = None,
    hot_cues: Optional[list[CueEntry]] = None,
    sections: Optional[list[SectionEntry]] = None,
    file_path: Optional[str] = None,
) -> None:
    """Write a Rekordbox-compatible ANLZ0000.EXT file.

    Emits: PPTH (optional) → PWV3 (monochrome detail) → PWV5 (color detail,
    3-band packed RGB15) → PCO2 stubs → PSSI (optional).

    Band mapping (same convention as analyzer.stems_to_waveform):
      low = drums+bass averaged, mid = other, high = vocals.
    """
    tags: list[bytes] = []

    if file_path:
        tags.append(_build_ppth_tag(file_path))

    # PWV3: monochrome detail (one brightness byte per column).
    pwv3_data = bytes(
        min(255, (c_col.drums + c_col.bass + c_col.other + c_col.vocals) // 4)
        for c_col in waveform_3band
    )
    tags.append(_build_pwv3_tag(pwv3_data))

    # PWV5: color detail (packed RGB15).
    pwv5_entries = [
        _pack_rgb15(
            r=min(255, (c_col.drums + c_col.bass) // 2),   # low -> red
            g=c_col.other,                                 # mid -> green
            b=c_col.vocals,                                # high -> blue
        )
        for c_col in waveform_3band
    ]
    tags.append(_build_pwv5_tag(pwv5_entries))

    # PCO2 stubs (usually empty in reference files, but always present).
    tags.append(_build_pco2_tag(hot_cues or [], cue_type=1))
    tags.append(_build_pco2_tag(memory_cues or [], cue_type=0))

    if sections:
        tags.append(_build_pssi_tag(sections))

    _write_anlz_file(out_path, tags)


def write_2ex(
    out_path: Path,
    waveform_3band: list[Waveform3Band],
    file_path: Optional[str] = None,
) -> None:
    """Write a Rekordbox-compatible ANLZ0000.2EX file (CDJ-3000+ variant).

    .2EX is the third ANLZ variant on CDJ-3000/OPUS-QUAD firmware. Reference
    files show it contains PPTH + PWV6/PWV7 + PWVC + XWVv tags. PWV6/PWV7 are
    documented in pyrekordbox but the XWVv tag is undocumented.

    For v1, we emit a minimal valid .2EX containing only PPTH to keep the
    file non-empty and CDJ-parseable as a stub. Full PWV6/PWV7/PWVC/XWVv
    support is tracked as a follow-up polish task — CDJ-3000 falls back to
    the .EXT waveform when .2EX is minimal.
    """
    tags: list[bytes] = []

    if file_path:
        tags.append(_build_ppth_tag(file_path))

    _write_anlz_file(out_path, tags)
