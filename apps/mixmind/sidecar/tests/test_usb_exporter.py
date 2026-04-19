"""Unit tests for the USB export orchestrator — no real USB required."""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

from usb_exporter import (
    _build_beats_from_record,
    _build_hot_cues_from_record,
    _build_memory_cues_from_record,
    _build_sections_from_record,
    _build_waveform_3band,
    _build_waveform_preview,
    _to_playlist_records,
    clean_target,
    validate_filesystem,
)


# ---------------------------------------------------------------------------
# validate_filesystem
# ---------------------------------------------------------------------------


def test_validate_filesystem_missing_path(tmp_path: Path) -> None:
    result = validate_filesystem(tmp_path / "nonexistent-subdir")
    assert result["status"] == "rejected"


def test_validate_filesystem_tmp_dir(tmp_path: Path) -> None:
    """In a test env we accept either ok or warning (not rejected)."""
    result = validate_filesystem(tmp_path)
    assert result["status"] in ("ok", "warning")


# ---------------------------------------------------------------------------
# clean_target — Pitfall 8 mitigation
# ---------------------------------------------------------------------------


def test_clean_target_wipes_rekordbox_and_usbanlz(tmp_path: Path) -> None:
    pioneer = tmp_path / "PIONEER"
    (pioneer / "rekordbox").mkdir(parents=True)
    (pioneer / "USBANLZ" / "P100").mkdir(parents=True)
    (pioneer / "rekordbox" / "export.pdb").write_bytes(b"old data")
    (pioneer / "USBANLZ" / "P100" / "10000000").mkdir()

    clean_target(tmp_path)

    assert not (pioneer / "rekordbox").exists()
    assert not (pioneer / "USBANLZ").exists()
    # PIONEER/ itself MAY remain (other vendor dirs in it)


def test_clean_target_no_pioneer_dir_is_noop(tmp_path: Path) -> None:
    # Calling on a fresh empty dir must not raise.
    clean_target(tmp_path)
    assert tmp_path.exists()


def test_clean_target_preserves_unrelated_files(tmp_path: Path) -> None:
    pioneer = tmp_path / "PIONEER"
    (pioneer / "rekordbox").mkdir(parents=True)
    (pioneer / "ANOTHER_VENDOR").mkdir(parents=True)
    (pioneer / "ANOTHER_VENDOR" / "thing.bin").write_bytes(b"keep me")

    clean_target(tmp_path)

    assert not (pioneer / "rekordbox").exists()
    assert (pioneer / "ANOTHER_VENDOR" / "thing.bin").exists()


# ---------------------------------------------------------------------------
# Record-to-internal-format converters
# ---------------------------------------------------------------------------


def test_build_beats_handles_missing_grid() -> None:
    assert _build_beats_from_record({"bpm": 128.0}) == []


def test_build_beats_uses_record_bpm_when_beat_missing() -> None:
    rec = {"bpm": 128.0, "beat_grid_mm": [{"time_ms": 500}]}
    out = _build_beats_from_record(rec)
    assert len(out) == 1
    assert out[0].bpm == 128.0
    assert out[0].time_ms == 500
    assert out[0].beat_number == 1


def test_build_hot_cues_caps_at_8() -> None:
    cues = [{"time_ms": i * 1000, "label": f"C{i}", "color_id": i % 8}
            for i in range(20)]
    out = _build_hot_cues_from_record({"auto_cues_mm": cues})
    assert len(out) == 8
    assert out[0].slot == "A"
    assert out[7].slot == "H"


def test_build_hot_cues_empty_ok() -> None:
    assert _build_hot_cues_from_record({}) == []


def test_build_memory_cues() -> None:
    rec = {"memory_cues": [{"time_ms": 1500, "label": "Drop"}]}
    out = _build_memory_cues_from_record(rec)
    assert len(out) == 1
    assert out[0].time_ms == 1500
    assert out[0].slot is None


def test_build_sections() -> None:
    rec = {"sections_mm": [
        {"start_beat": 0, "end_beat": 32, "kind": 1, "name": "intro"},
        {"start_beat": 32, "end_beat": 96, "kind": 2, "name": "verse"},
    ]}
    out = _build_sections_from_record(rec)
    assert len(out) == 2
    assert out[0].name == "intro"
    assert out[1].end_beat == 96


def test_build_waveform_preview_empty_returns_800_zero_bytes() -> None:
    out = _build_waveform_preview({})
    assert len(out) == 800
    assert out == b"\x00" * 800


def test_build_waveform_preview_downsamples_to_800() -> None:
    wf = [{"drums": 100, "bass": 50, "vocals": 30, "other": 10}] * 5000
    out = _build_waveform_preview({"waveform_4stem": wf})
    assert len(out) == 800
    assert out[0] == 100


def test_build_waveform_3band_empty_returns_1200_zeros() -> None:
    out = _build_waveform_3band({})
    assert len(out) == 1200
    assert out[0].drums == 0


def test_build_waveform_3band_maps_all_bands() -> None:
    wf = [{"drums": 1, "bass": 2, "vocals": 3, "other": 4}]
    out = _build_waveform_3band({"waveform_4stem": wf})
    assert len(out) == 1
    assert out[0].drums == 1
    assert out[0].bass == 2
    assert out[0].vocals == 3
    assert out[0].other == 4


def test_to_playlist_records_none() -> None:
    assert _to_playlist_records(None) is None
    assert _to_playlist_records([]) is None


def test_to_playlist_records_maps_fields() -> None:
    out = _to_playlist_records([
        {"id": 5, "name": "Set", "track_ids": [0x10000000, 0x10000001]},
    ])
    assert out is not None
    assert out[0].id == 5
    assert out[0].name == "Set"
    assert out[0].track_ids == [0x10000000, 0x10000001]


# ---------------------------------------------------------------------------
# License regression (Phase 21 Option C)
# ---------------------------------------------------------------------------


def test_no_rbox_imported_in_orchestrator() -> None:
    """rbox (GPL-3.0) must never be imported by usb_exporter or pioneer_usb."""
    import pioneer_usb
    import usb_exporter

    for mod in (usb_exporter, pioneer_usb):
        source = Path(mod.__file__).read_text(encoding="utf-8")
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] != "rbox", (
                        f"{mod.__name__} has `import {alias.name}`"
                    )
            elif isinstance(node, ast.ImportFrom):
                assert (node.module or "").split(".")[0] != "rbox", (
                    f"{mod.__name__} has `from {node.module} import ...`"
                )
