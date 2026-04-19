"""Pioneer auxiliary file writer — RBFLTR, DEVSETTING, MYSETTING*, DJMMYSETTING.

These small files sit alongside ``export.pdb`` on every Pioneer-formatted
USB. They hold device-level preferences and filter presets that CDJ-3000
firmware reads at mount time. The reference USB
(/Volumes/Untitled/PIONEER/) ships all of them — if any are missing the
CDJ may either fall back to built-in defaults or in edge cases refuse to
load user data.

First-pass strategy (documented as a deliberate narrow scope):

* Embed the **reference bytes verbatim** for each file. All of these
  contain default/factory settings — no PII — with one exception
  (``djprofile.nxs``, which contained the original user's name and is
  intentionally NOT written).
* Byte-exactness is the safest default: CDJ firmware parses these with
  fixed-size struct readers, so any layout drift risks a boot failure.
* A follow-up plan can add parameterisation (custom filter presets,
  DJ-mode preferences) once a UI exists for users to configure them.

License: MIT. No rbox.
"""
from __future__ import annotations

import base64
from pathlib import Path


# ---------------------------------------------------------------------------
# Reference bytes (captured Apr 19, 2026 from /Volumes/Untitled/PIONEER/)
#
# Provenance: these are the factory-default settings shipped with a
# Rekordbox 7.x export of an empty collection. No user-specific data
# appears in any of them — ``djprofile.nxs`` is excluded precisely
# because it DOES contain user PII.
#
# IMPORTANT: Keep each base64 constant on a SINGLE LINE. Python's
# string literal concatenation across lines is safe, but if any line
# accidentally loses a trailing space inside a base64 run, a byte is
# dropped on decode (seen during dev — a missing 0x20 at offset 111
# of RBFLTR.DAT caused a 231-byte output vs expected 232).
# ---------------------------------------------------------------------------


_RBFLTR_DAT_B64 = "Rk1BSQAAAHQAAADoAAAAAFBJT05FRVIgREogICAgICAgICAgICAgICAgICAgICAgQ0RKLTMwMDAgICAgICAgICAgICAgICAgICAgICAgICAzLjAxICAgICAgICAgICAgICAgICAgICAgICAgICAgIAAAAARGQ05EAAAAFAAAABwAAAAGAAYAAgAAL7wAADXURkNORAAAABQAAAAkAAAADAARAAQAAAAQAAAADwAAAA4AAAASRkNORAAAABQAAAAcAAAABwAAAAIAAAADAAAAAEZDTkQAAAAUAAAAGAAAAA8AEQABAAAAAA=="

_DEVSETTING_DAT_B64 = "YAAAAFBJT05FRVIgREoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcmVrb3JkYm94AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2LjguMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAB4VjQSAQAAAAECAwECAQAAAAAAAAAAAAAAAAAAAAAAAG76AAA="

_MYSETTING_DAT_B64 = "YAAAAFBJT05FRVIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcmVrb3JkYm94AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwLjAwMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAB4VjQSAgAAAIGDgYiBAYKBgQEBAYKAgIGAgYAAAIEAAICAgICBgAAAWsAAAA=="

_MYSETTING2_DAT_B64 = "YAAAAFBJT05FRVIgREoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQ0RKLTMwMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwLjAwMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAACBAACDgYCAAAAAgYCFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACDwAAA=="

_DJMMYSETTING_DAT_B64 = "YAAAAFBpb25lZXJESgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAREpNLVYxMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxLjAwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKQAAAB4VjQSAQAAACAAAACBgoCAgYGAgYCAhYKAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAIAAAAAQEBgYGBAAACAQGBgYEAAAMBAYGBgQAABAEBgYGBAAAFMgCBgYEAAAYBAYGBgQAABwQBgYGBAAAIBAGBgYEAAAkEAYGBgQAACs7/gYGBAAALMgCBgYEAAAwBAYGBgQAADQQBgYGBAAAOAQGBgYEAAP7oAAA="


# ---------------------------------------------------------------------------
# Public writers
# ---------------------------------------------------------------------------


def write_rbfltr(out_path: Path) -> None:
    """Write RBFLTR.DAT (exactly 232 bytes, filter presets)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blob = base64.b64decode(_RBFLTR_DAT_B64)
    assert len(blob) == 232, f"RBFLTR.DAT must be 232B, have {len(blob)}"
    out_path.write_bytes(blob)


def write_devsetting(out_path: Path) -> None:
    """Write DEVSETTING.DAT (140 bytes, device info)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blob = base64.b64decode(_DEVSETTING_DAT_B64)
    assert len(blob) == 140, f"DEVSETTING.DAT must be 140B, have {len(blob)}"
    out_path.write_bytes(blob)


def write_mysetting(out_path: Path) -> None:
    """Write MYSETTING.DAT (148 bytes, primary user preferences)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blob = base64.b64decode(_MYSETTING_DAT_B64)
    assert len(blob) == 148, f"MYSETTING.DAT must be 148B, have {len(blob)}"
    out_path.write_bytes(blob)


def write_mysetting2(out_path: Path) -> None:
    """Write MYSETTING2.DAT (148 bytes, extended user preferences)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blob = base64.b64decode(_MYSETTING2_DAT_B64)
    assert len(blob) == 148, f"MYSETTING2.DAT must be 148B, have {len(blob)}"
    out_path.write_bytes(blob)


def write_djmmysetting(out_path: Path) -> None:
    """Write DJMMYSETTING.DAT (272 bytes, cross-device DJ memory)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blob = base64.b64decode(_DJMMYSETTING_DAT_B64)
    assert len(blob) == 272, (
        f"DJMMYSETTING.DAT must be 272B, have {len(blob)}"
    )
    out_path.write_bytes(blob)


def write_all(usb_root: Path) -> list[Path]:
    """Convenience — write every aux file to its canonical location.

    Intentionally does NOT write ``djprofile.nxs`` (the reference file
    contains the original owner's name). Writing a blank/anonymised
    profile is deferred to a follow-up plan.
    """
    written: list[Path] = []

    rb_dir = usb_root / "PIONEER" / "rekordbox"
    rb_dir.mkdir(parents=True, exist_ok=True)

    pio_dir = usb_root / "PIONEER"

    pairs: list[tuple[Path, callable]] = [
        (rb_dir / "RBFLTR.DAT", write_rbfltr),
        (pio_dir / "DEVSETTING.DAT", write_devsetting),
        (pio_dir / "MYSETTING.DAT", write_mysetting),
        (pio_dir / "MYSETTING2.DAT", write_mysetting2),
        (pio_dir / "DJMMYSETTING.DAT", write_djmmysetting),
    ]
    for path, writer in pairs:
        writer(path)
        written.append(path)
    return written
