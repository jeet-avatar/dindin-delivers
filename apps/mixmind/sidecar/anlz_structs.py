"""Binary struct definitions for Rekordbox ANLZ files (.DAT / .EXT / .2EX).

Written 2026-04-19 against Deep Symmetry's public ANLZ Kaitai spec:
  https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html
  https://github.com/Deep-Symmetry/crate-digger/blob/main/src/main/kaitai/rekordbox_anlz.ksy

**License posture (Phase 21 Option C):** construct is MIT. rbox is REJECTED due
to GPL-3.0 contamination. These structs are independent implementations of the
same public reverse-engineered spec that pyrekordbox uses internally.

Byte layouts VERIFIED against real Rekordbox 7 exported files on
/Volumes/Untitled/PIONEER/USBANLZ/ (91 tracks, 10 partition buckets).

All integers are big-endian (network byte order) per the spec.
"""
from __future__ import annotations

import construct as c


# ---------------------------------------------------------------------------
# File & tag envelope structs
# ---------------------------------------------------------------------------

# ANLZ file header (28 bytes).
# Verified against /Volumes/Untitled/PIONEER/USBANLZ/P001/00000019/ANLZ0000.DAT:
#   50 4d 41 49 00 00 00 1c 00 00 23 b4 00 00 00 01 00 01 00 00 00 01 00 00 00 00 00 00
# Field tail bytes are typically constants: u1=1, u2=1, u3=1, u4=0 on most
# tracks; a small minority (e.g. P071/0001B60B) contain what looks like a hash.
AnlzFileHeader = c.Struct(
    "magic" / c.Const(b"PMAI"),
    "len_header" / c.Int32ub,              # 0x1C (28)
    "len_file" / c.Int32ub,                # total file length incl. all tags
    "u1" / c.Int32ub,                      # typically 1
    "u2" / c.Int32ub,                      # typically 0x00010000
    "u3" / c.Int32ub,                      # typically 0x00010000
    "u4" / c.Int32ub,                      # typically 0
)
assert AnlzFileHeader.sizeof() == 28, "AnlzFileHeader must be 28 bytes"


# Generic tag header — every tag body starts with this 12-byte envelope.
# The real on-disk tag is `magic(4) + len_header(4) + len_tag(4) + body`.
# `len_header` varies per tag type: 20 for PWAV/PCO2, 24 for PQTZ/PCOB/PWV3,
# 16 for PPTH, 32 for PSSI. We expose this envelope as 12 bytes (the magic +
# the two length fields) — the per-tag-body header extras are part of the
# tag-specific body structs below.
AnlzTagEnvelope = c.Struct(
    "magic" / c.Bytes(4),
    "len_header" / c.Int32ub,
    "len_tag" / c.Int32ub,
)
assert AnlzTagEnvelope.sizeof() == 12, "AnlzTagEnvelope must be 12 bytes"


# ---------------------------------------------------------------------------
# PQTZ — Beat grid tag (DAT)
# ---------------------------------------------------------------------------
#
# Full tag layout: envelope(12) + body
# Tag len_header = 24 on disk -> body header = 24 - 12 = 12 bytes (u1, u2, entry_count).
# Then len_entries * 8 bytes of beat entries.

PQTZBeatEntry = c.Struct(
    "beat" / c.Int16ub,         # 1..4, where 1 == downbeat
    "tempo" / c.Int16ub,        # BPM × 100
    "time_ms" / c.Int32ub,      # ms offset from track start
)
assert PQTZBeatEntry.sizeof() == 8, "PQTZBeatEntry must be 8 bytes"

PQTZBody = c.Struct(
    "u1" / c.Default(c.Int32ub, 0),
    "u2" / c.Default(c.Int32ub, 0x80000),     # constant 0x80000 per spec
    "entry_count" / c.Int32ub,
    "entries" / PQTZBeatEntry[c.this.entry_count],
)


# ---------------------------------------------------------------------------
# PCOB — Legacy cue list tag (DAT + EXT)
# ---------------------------------------------------------------------------
#
# Tag len_header = 24 on disk -> body header = 12 bytes (cue_type, unk, count, memory_count).
# Empty PCOB observed in reference: `00000001 00000000 ffffffff` —
#   cue_type=1, unk=0, count=0, memory_count=-1 (0xffffffff signed).
# AnlzCuePoint entries follow (each 56 bytes: 12-byte PCPT header + 44-byte body).

PCOBCuePoint = c.Struct(
    "magic" / c.Const(b"PCPT"),
    "len_header" / c.Default(c.Int32ub, 0x1c),
    "len_entry" / c.Default(c.Int32ub, 0x38),      # 56 total per entry
    "hot_cue" / c.Int32ub,                         # 0 for memory cue, 1..8 for A..H
    "status" / c.Default(c.Int32ub, 4),            # 4 = enabled, 0 = disabled
    "u1" / c.Default(c.Int32ub, 0x10000),
    "order_first" / c.Default(c.Int16ub, 0xffff),
    "order_last" / c.Default(c.Int16ub, 0xffff),
    "type" / c.Int8ub,                             # 1 = single, 2 = loop
    "u2_pad" / c.Default(c.Bytes(1), b"\x00"),
    "u3" / c.Default(c.Int16ub, 1000),
    "time_ms" / c.Int32ub,
    "loop_time_ms" / c.Default(c.Int32ub, 0xffffffff),
    "tail_pad" / c.Default(c.Bytes(16), b"\x00" * 16),
)
# 4 + 4 + 4 + 4 + 4 + 4 + 2 + 2 + 1 + 1 + 2 + 4 + 4 + 16 = 56
assert PCOBCuePoint.sizeof() == 56, "PCOBCuePoint must be 56 bytes"

PCOBBody = c.Struct(
    "cue_type" / c.Int32ub,                        # 0 = memory, 1 = hot
    "unk" / c.Default(c.Int16ub, 0),
    "count" / c.Int16ub,
    "memory_count" / c.Default(c.Int32sb, -1),     # -1 (0xffffffff) for empty
    "entries" / PCOBCuePoint[c.this.count],
)


# ---------------------------------------------------------------------------
# PCO2 — Extended (NXS2) cue list tag with color + label (EXT)
# ---------------------------------------------------------------------------
#
# Tag len_header = 20 on disk -> body header = 20 - 12 = 8 bytes (cue_type, count, unknown).
# Empty PCO2 in reference: `0000000100000000` -> cue_type=1, count=0, unknown=0.
# Each PCP2 entry has variable length depending on label UTF-16 length.

PCO2CuePoint = c.Struct(
    "magic" / c.Const(b"PCP2"),
    "len_header" / c.Default(c.Int32ub, 0x10),
    "len_entry" / c.Int32ub,                       # total entry size, variable
    "hot_cue" / c.Int32ub,                         # 0 for memory cue, 1..8 for A..H
    "cue_type" / c.Int8ub,                         # 1 = memory/single, 2 = loop
    "u1_pad" / c.Default(c.Bytes(3), b"\x00\x00\x00"),
    "time_ms" / c.Int32ub,
    "loop_time_ms" / c.Default(c.Int32ub, 0xffffffff),
    "color_id" / c.Int8ub,                         # 0..7 Pioneer palette
    "u2_pad" / c.Default(c.Bytes(7), b"\x00" * 7),
    "loop_numerator" / c.Default(c.Int16ub, 0),
    "loop_denominator" / c.Default(c.Int16ub, 0),
    "len_comment" / c.Int32ub,                     # char count × 2 (UTF-16 BE bytes), includes null
    "comment" / c.Bytes(c.this.len_comment),
    "color_code" / c.Default(c.Int8ub, 0),
    "color_red" / c.Default(c.Int8ub, 0),
    "color_green" / c.Default(c.Int8ub, 0),
    "color_blue" / c.Default(c.Int8ub, 0),
)

PCO2Body = c.Struct(
    "cue_type" / c.Int32ub,                        # 0 = memory, 1 = hot
    "count" / c.Int16ub,
    "unknown" / c.Default(c.Int16ub, 0),
    "entries" / PCO2CuePoint[c.this.count],
)


# ---------------------------------------------------------------------------
# PWAV — Mono waveform preview (DAT)
# ---------------------------------------------------------------------------
#
# Tag len_header = 20 -> body header = 8 bytes: len_preview(4) + Const(0x10000).
# Reference shows 400 amplitude bytes (NOT 800 as earlier plan assumed).
# Values are 0..31 (5-bit amplitude per column, upper 3 bits may encode color hint).

PWAVBody = c.Struct(
    "len_preview" / c.Int32ub,
    "unknown" / c.Default(c.Int32ub, 0x10000),
    "data" / c.Bytes(c.this.len_preview),
)


# ---------------------------------------------------------------------------
# PWV2 — Tiny waveform preview (DAT) — same layout as PWAV but fewer bytes
# ---------------------------------------------------------------------------

PWV2Body = c.Struct(
    "len_preview" / c.Int32ub,
    "unknown" / c.Default(c.Int32ub, 0x10000),
    "data" / c.Bytes(c.this.len_preview),
)


# ---------------------------------------------------------------------------
# PWV3 — Detail waveform tag (EXT) — monochrome, 1 byte per column
# ---------------------------------------------------------------------------
#
# Tag len_header = 24 -> body header = 12 bytes.
# Reference: len_entry_bytes=1, len_entries=large (e.g. 63533), u1=0x00960000.

PWV3Body = c.Struct(
    "len_entry_bytes" / c.Default(c.Int32ub, 1),
    "len_entries" / c.Int32ub,
    "u1" / c.Default(c.Int32ub, 0x00960000),
    "data" / c.Bytes(c.this.len_entry_bytes * c.this.len_entries),
)


# ---------------------------------------------------------------------------
# PWV4 — Color preview (EXT) — 6 bytes per column (RGB × 2 halves)
# ---------------------------------------------------------------------------

PWV4Body = c.Struct(
    "len_entry_bytes" / c.Default(c.Int32ub, 6),
    "len_entries" / c.Int32ub,
    "unknown" / c.Default(c.Int32ub, 0),
    "data" / c.Bytes(c.this.len_entry_bytes * c.this.len_entries),
)


# ---------------------------------------------------------------------------
# PWV5 — Color detail waveform (EXT) — 2 bytes per column (packed 3-band RGB)
# ---------------------------------------------------------------------------
#
# Each 16-bit entry packs R/G/B into 5 bits each (15-bit color + 1 unused).
# Maps to the 3-band low/mid/high pioneer rendering.

PWV5Body = c.Struct(
    "len_entry_bytes" / c.Default(c.Int32ub, 2),
    "len_entries" / c.Int32ub,
    "unknown" / c.Default(c.Int32ub, 0),
    "entries" / c.Int16ub[c.this.len_entries],
)


# ---------------------------------------------------------------------------
# PPTH — File path tag (all 3 variants)
# ---------------------------------------------------------------------------
#
# Tag len_header = 16 -> body header = 4 bytes: len_path (byte count incl. NUL terminator).
# Path is UTF-16 BE with a trailing 0x0000 NUL.

PPTHBody = c.Struct(
    "len_path" / c.Int32ub,
    "path" / c.Bytes(c.this.len_path),
)


# ---------------------------------------------------------------------------
# PVBR — VBR seek table (DAT) — 400 × 4-byte entries + 2 unknown Int32
# ---------------------------------------------------------------------------

PVBRBody = c.Struct(
    "u1" / c.Default(c.Int32ub, 0),
    "idx" / c.Int32ub[400],
    "u2" / c.Default(c.Int32ub, 0),
)


# ---------------------------------------------------------------------------
# PSSI — Song Structure tag (EXT)
# ---------------------------------------------------------------------------
#
# Tag len_header = 32 -> body header = 20 bytes.
# Each entry is 24 bytes. Pyrekordbox describes PSSI as fragile in newer
# Rekordbox exports — the entries may be obfuscated/encrypted. For our writer
# we emit the documented Deep Symmetry layout; read-back may or may not work
# depending on firmware.

PSSIEntry = c.Struct(
    "index" / c.Int16ub,
    "beat" / c.Int16ub,
    "kind" / c.Int16ub,
    "u1" / c.Default(c.Int8ub, 0),
    "k1" / c.Default(c.Int8ub, 0),
    "u2" / c.Default(c.Int8ub, 0),
    "k2" / c.Default(c.Int8ub, 0),
    "u3" / c.Default(c.Int8ub, 0),
    "b" / c.Default(c.Int8ub, 0),
    "beat_2" / c.Default(c.Int16ub, 0),
    "beat_3" / c.Default(c.Int16ub, 0),
    "beat_4" / c.Default(c.Int16ub, 0),
    "u4" / c.Default(c.Int8ub, 0),
    "k3" / c.Default(c.Int8ub, 0),
    "u5" / c.Default(c.Int8ub, 0),
    "fill" / c.Default(c.Int8ub, 0),
    "beat_fill" / c.Default(c.Int16ub, 0),
)
assert PSSIEntry.sizeof() == 24, "PSSIEntry must be 24 bytes"

PSSIBody = c.Struct(
    "len_entry_bytes" / c.Default(c.Int32ub, 24),
    "len_entries" / c.Int16ub,
    "mood" / c.Default(c.Int16ub, 1),
    "u1" / c.Default(c.Bytes(6), b"\x00" * 6),
    "end_beat" / c.Int16ub,
    "u2" / c.Default(c.Bytes(2), b"\x00\x00"),
    "bank" / c.Default(c.Int8ub, 0),
    "u3" / c.Default(c.Bytes(1), b"\x00"),
    "entries" / PSSIEntry[c.this.len_entries],
)


# ---------------------------------------------------------------------------
# Self-test — parse-build round-trip
# ---------------------------------------------------------------------------

def _self_test() -> None:
    """Assert every Struct encodes and decodes its own sample dict."""
    # 1. File header
    hdr = {"len_header": 28, "len_file": 1024, "u1": 1, "u2": 0x10000, "u3": 0x10000, "u4": 0}
    built = AnlzFileHeader.build(hdr)
    assert len(built) == 28, f"AnlzFileHeader built {len(built)} bytes, expected 28"
    parsed = AnlzFileHeader.parse(built)
    assert parsed.len_file == 1024, f"len_file round-trip failed"

    # 2. Tag envelope
    env = {"magic": b"PQTZ", "len_header": 24, "len_tag": 100}
    AnlzTagEnvelope.build(env)

    # 3. PQTZ
    pqtz = {"entry_count": 2, "entries": [
        {"beat": 1, "tempo": 12800, "time_ms": 0},
        {"beat": 2, "tempo": 12800, "time_ms": 500},
    ]}
    body = PQTZBody.build(pqtz)
    assert len(body) == 12 + 2 * 8
    back = PQTZBody.parse(body)
    assert back.entry_count == 2
    assert back.entries[0].beat == 1
    assert back.entries[1].time_ms == 500

    # 4. PCOB (empty)
    pcob_empty = {"cue_type": 1, "count": 0, "entries": []}
    body = PCOBBody.build(pcob_empty)
    # empty body: cue_type(4) + unk(2) + count(2) + memory_count(4) = 12 bytes
    assert len(body) == 12
    # Compare against real reference empty PCOB body bytes
    # real: `00000001 00000000 ffffffff`
    assert body == bytes.fromhex("00000001 00000000 ffffffff".replace(" ", ""))

    # 5. PCOB (1 hot cue)
    pcob_one = {
        "cue_type": 1,
        "count": 1,
        "entries": [{"hot_cue": 1, "type": 1, "time_ms": 1000}],
    }
    body = PCOBBody.build(pcob_one)
    assert len(body) == 12 + 56
    back = PCOBBody.parse(body)
    assert back.count == 1
    assert back.entries[0].hot_cue == 1
    assert back.entries[0].time_ms == 1000

    # 6. PCO2 (empty) — reference empty body is `0000000100000000`
    pco2_empty = {"cue_type": 1, "count": 0, "entries": []}
    body = PCO2Body.build(pco2_empty)
    assert len(body) == 8
    assert body == bytes.fromhex("00000001 00000000".replace(" ", ""))

    # 7. PCO2 (1 cue with label)
    label_utf16 = "Kick".encode("utf-16-be") + b"\x00\x00"   # include NUL terminator
    pco2_one = {
        "cue_type": 1,
        "count": 1,
        "entries": [{
            "len_entry": 12 + 4 + 4 + 4 + 1 + 3 + 4 + 4 + 1 + 7 + 2 + 2 + 4 + len(label_utf16) + 4,
            "hot_cue": 1,
            "cue_type": 1,
            "time_ms": 5000,
            "color_id": 0,
            "len_comment": len(label_utf16),
            "comment": label_utf16,
        }],
    }
    body = PCO2Body.build(pco2_one)
    back = PCO2Body.parse(body)
    assert back.count == 1
    assert back.entries[0].time_ms == 5000
    assert back.entries[0].comment == label_utf16

    # 8. PWAV (400-byte preview)
    pwav = {"len_preview": 400, "data": b"\x00" * 400}
    body = PWAVBody.build(pwav)
    assert len(body) == 4 + 4 + 400
    back = PWAVBody.parse(body)
    assert back.len_preview == 400

    # 9. PWV3 (mono detail)
    pwv3 = {"len_entries": 100, "data": b"\x10" * 100}
    body = PWV3Body.build(pwv3)
    assert len(body) == 12 + 100
    back = PWV3Body.parse(body)
    assert back.len_entries == 100

    # 10. PWV5 (color detail — 2 bytes per column)
    pwv5 = {"len_entries": 50, "entries": [0x1234] * 50}
    body = PWV5Body.build(pwv5)
    assert len(body) == 12 + 2 * 50
    back = PWV5Body.parse(body)
    assert back.len_entries == 50
    assert back.entries[0] == 0x1234

    # 11. PPTH
    path_u16 = "/Contents/test.aiff".encode("utf-16-be") + b"\x00\x00"
    ppth = {"len_path": len(path_u16), "path": path_u16}
    body = PPTHBody.build(ppth)
    assert len(body) == 4 + len(path_u16)

    # 12. PVBR (400-entry seek table, all zero for CBR)
    pvbr = {"idx": [0] * 400}
    body = PVBRBody.build(pvbr)
    assert len(body) == 4 + 400 * 4 + 4

    # 13. PSSI (2 sections)
    pssi = {
        "len_entries": 2,
        "end_beat": 256,
        "entries": [
            {"index": 0, "beat": 0, "kind": 1},
            {"index": 1, "beat": 128, "kind": 4},
        ],
    }
    body = PSSIBody.build(pssi)
    # Header = 4 + 2 + 2 + 6 + 2 + 2 + 1 + 1 = 20 bytes; entries = 2 * 24 = 48
    assert len(body) == 20 + 48, f"PSSIBody size {len(body)} != 68"
    back = PSSIBody.parse(body)
    assert back.len_entries == 2
    assert back.entries[1].kind == 4

    print("OK: all 13 ANLZ struct self-tests passed")


if __name__ == "__main__":
    _self_test()
