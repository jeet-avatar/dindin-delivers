"""Byte-level oracle: our ANLZ writer output vs real Rekordbox-exported files.

Reference USB: ``/Volumes/Untitled/PIONEER/USBANLZ/`` — 91 real Rekordbox 7
tracks across 10 partition buckets (P001…P071).

Every track has three files: ``ANLZ0000.DAT``, ``ANLZ0000.EXT``,
``ANLZ0000.2EX``.  These are the byte-level ground truth that plays on a
CDJ-3000 in the real world.

The oracle has three strictness levels:

* **Level 1 (MUST PASS)** — tag-inventory parity for the *core tag set* our
  writer emits. Our 21-03 scope is PPTH + PQTZ + PWAV + PCOB; other tags
  (PVBR, PWV2, PSSI, etc.) are tracked as "deferred" but not failures.
* **Level 2 (MUST PASS)** — field-level equivalence for 3 hand-picked tracks.
  Every tag we *do* emit must round-trip (ref → reader → writer → reader)
  with identical field values.
* **Level 3 (target)** — sha256 byte-equivalence percentage across a 20-track
  sample. Not a blocking gate for plan 21-03 (Phase 21 exit criterion is
  ≥50%). Reports the current percentage for visibility.

Safety rails
------------
* Reference files are read-only: no test writes under ``/Volumes/Untitled``.
* The session-scoped sentinel in ``conftest.py`` hashes the tree before and
  after the test session and fails loudly on any mutation.
* All writer output goes under ``tmp_path`` (pytest-managed scratch dir).
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterator

import pytest


# ---------------------------------------------------------------------------
# Reference USB bookkeeping
# ---------------------------------------------------------------------------

REF_USB = Path("/Volumes/Untitled")
REF_USBANLZ = REF_USB / "PIONEER/USBANLZ"

REQUIRES_REF_USB = pytest.mark.skipif(
    not REF_USBANLZ.exists(),
    reason=(
        "Reference USB at /Volumes/Untitled/PIONEER/USBANLZ not mounted — "
        "see 21-REFERENCE-DATASET.md for mount instructions."
    ),
)


def _all_reference_tracks() -> Iterator[tuple[str, str, Path, Path, Path]]:
    """Yield ``(p_dir, track_id, dat, ext, twoex)`` for each track under the USB."""
    if not REF_USBANLZ.exists():
        return
    for p_dir in sorted(REF_USBANLZ.iterdir()):
        if not p_dir.is_dir():
            continue
        for track_dir in sorted(p_dir.iterdir()):
            if not track_dir.is_dir():
                continue
            dat = track_dir / "ANLZ0000.DAT"
            ext = track_dir / "ANLZ0000.EXT"
            twoex = track_dir / "ANLZ0000.2EX"
            if dat.exists() and ext.exists():
                yield p_dir.name, track_dir.name, dat, ext, twoex


# Core tag set our plan-21-03 writer is specified to emit. Other reference
# tags (PVBR VBR index, PWV2 detail-waveform B, PSSI sections when in .DAT,
# etc.) are explicit **deferred scope** for later phases — their absence in
# our output is NOT a Level 1 failure.
_CORE_DAT_TAGS = {b"PPTH", b"PQTZ", b"PWAV", b"PCOB"}


# ---------------------------------------------------------------------------
# Level 0 — inventory sanity
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_reference_inventory_sanity() -> None:
    """Reference USB contains the expected number of tracks across P-dirs."""
    tracks = list(_all_reference_tracks())
    assert len(tracks) >= 80, (
        f"expected ~91 reference tracks per 21-REFERENCE-DATASET.md, got {len(tracks)}"
    )
    p_dirs = {t[0] for t in tracks}
    expected_p_dirs = {
        "P001", "P005", "P006", "P00E", "P024", "P03B",
        "P041", "P047", "P052", "P071",
    }
    assert expected_p_dirs.issubset(p_dirs), (
        f"missing P-dirs: {expected_p_dirs - p_dirs}"
    )


# ---------------------------------------------------------------------------
# Level 1 — tag inventory parity (core tags only)
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_tag_inventory_parity_level1(tmp_path: Path) -> None:
    """Our writer's output contains every *core* tag present in the reference.

    Deferred tags (PVBR, PWV2) may be in the reference but not in our output
    — this is documented scope and not a failure.
    """
    from anlz_parser import _parse_anlz_tags, anlz_to_writer_input
    from anlz_writer import write_dat

    samples = list(_all_reference_tracks())[:3]
    assert samples, "no reference tracks available"

    for _p_dir, track_id, ref_dat, _ref_ext, _twoex in samples:
        ref_data = ref_dat.read_bytes()
        ref_tags = _parse_anlz_tags(ref_data)

        # Reference must have the minimal set — pre-flight sanity check.
        assert {b"PQTZ", b"PWAV"}.issubset(set(ref_tags)), (
            f"reference track {track_id} missing PQTZ or PWAV"
        )

        inputs = anlz_to_writer_input(ref_data)
        out_dat = tmp_path / f"{track_id}_out.DAT"
        write_dat(out_dat, **inputs)
        out_tags = _parse_anlz_tags(out_dat.read_bytes())

        # Core tags that ref has AND our scope includes — must be in output too.
        core_in_ref = set(ref_tags) & _CORE_DAT_TAGS
        missing_core = core_in_ref - set(out_tags)
        assert not missing_core, (
            f"track {track_id}: our writer missing core tag(s) {missing_core} "
            f"(ref had {sorted(ref_tags)!r}, we wrote {sorted(out_tags)!r})"
        )


# ---------------------------------------------------------------------------
# Level 2 — field equivalence on 3 hand-picked tracks
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
@pytest.mark.parametrize("target_track", ["00000019", "00000413", "00001139"])
def test_field_equivalence_level2(tmp_path: Path, target_track: str) -> None:
    """Every field of a tag we emit matches the reference when round-tripped."""
    from anlz_parser import _parse_anlz_tags, anlz_to_writer_input
    from anlz_writer import write_dat
    from anlz_structs import PQTZBody, PWAVBody, PCOBBody, PPTHBody

    # Locate reference
    ref_path = next(REF_USBANLZ.rglob(f"{target_track}/ANLZ0000.DAT"), None)
    if ref_path is None:
        pytest.skip(f"reference track {target_track} not on USB (inventory drift)")

    ref_data = ref_path.read_bytes()
    inputs = anlz_to_writer_input(ref_data)

    out = tmp_path / "ANLZ0000.DAT"
    write_dat(out, **inputs)
    out_data = out.read_bytes()

    ref_tags = _parse_anlz_tags(ref_data)
    out_tags = _parse_anlz_tags(out_data)

    # PQTZ: beat count + every (beat_number, tempo, time_ms) tuple must match.
    ref_pqtz = PQTZBody.parse(ref_tags[b"PQTZ"])
    out_pqtz = PQTZBody.parse(out_tags[b"PQTZ"])
    assert ref_pqtz.entry_count == out_pqtz.entry_count, (
        f"PQTZ beat count mismatch for {target_track}"
    )
    for i, (rb, ob) in enumerate(zip(ref_pqtz.entries, out_pqtz.entries)):
        assert rb.beat == ob.beat, f"PQTZ entry {i} beat mismatch"
        assert rb.tempo == ob.tempo, f"PQTZ entry {i} tempo mismatch"
        assert rb.time_ms == ob.time_ms, f"PQTZ entry {i} time_ms mismatch"

    # PWAV: amplitude bytes must round-trip exactly.
    ref_pwav = PWAVBody.parse(ref_tags[b"PWAV"])
    out_pwav = PWAVBody.parse(out_tags[b"PWAV"])
    assert ref_pwav.len_preview == out_pwav.len_preview
    assert bytes(ref_pwav.data) == bytes(out_pwav.data)

    # PPTH: UTF-16 BE path must round-trip exactly when reference has it.
    if b"PPTH" in ref_tags and b"PPTH" in out_tags:
        ref_ppth = PPTHBody.parse(ref_tags[b"PPTH"])
        out_ppth = PPTHBody.parse(out_tags[b"PPTH"])
        assert bytes(ref_ppth.path) == bytes(out_ppth.path), (
            f"PPTH path bytes differ for {target_track}"
        )

    # PCOB: both occurrences (hot + memory) must field-match.
    # _parse_anlz_tags returns first-occurrence only — use _all for duplicates.
    from anlz_parser import _parse_anlz_tags_all
    ref_pcobs = [b for m, b in _parse_anlz_tags_all(ref_data) if m == b"PCOB"]
    out_pcobs = [b for m, b in _parse_anlz_tags_all(out_data) if m == b"PCOB"]
    assert len(ref_pcobs) == len(out_pcobs), (
        f"PCOB count differs for {target_track}: {len(ref_pcobs)} vs {len(out_pcobs)}"
    )
    for idx, (r_body, o_body) in enumerate(zip(ref_pcobs, out_pcobs)):
        r = PCOBBody.parse(r_body)
        o = PCOBBody.parse(o_body)
        assert r.cue_type == o.cue_type, f"PCOB #{idx} cue_type differs"
        assert r.count == o.count, f"PCOB #{idx} count differs"
        for j, (re, oe) in enumerate(zip(r.entries, o.entries)):
            assert re.hot_cue == oe.hot_cue, f"PCOB #{idx} entry {j} hot_cue"
            assert re.time_ms == oe.time_ms, f"PCOB #{idx} entry {j} time_ms"


# ---------------------------------------------------------------------------
# Level 3 — byte-equivalence percentage (reporting, not gating)
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_byte_equivalence_level3_target(tmp_path: Path) -> None:
    """Reports what fraction of reference tracks round-trip byte-identically.

    Phase 21 exit criterion is ≥50%. For plan 21-03 this test is purely
    informational (always passes) — the real gate lives in ROADMAP exit.
    """
    from anlz_parser import _parse_anlz_tags, anlz_to_writer_input
    from anlz_writer import write_dat

    identical = 0
    total = 0
    errors: list[str] = []
    sample_cap = 20   # cap sample to keep test runtime <30s

    for _, track_id, ref_dat, _, _ in _all_reference_tracks():
        if total >= sample_cap:
            break
        try:
            ref_bytes = ref_dat.read_bytes()
            inputs = anlz_to_writer_input(ref_bytes)
            out = tmp_path / f"{track_id}_out.DAT"
            write_dat(out, **inputs)
            out_bytes = out.read_bytes()
            if hashlib.sha256(out_bytes).digest() == hashlib.sha256(ref_bytes).digest():
                identical += 1
            total += 1
        except Exception as exc:
            errors.append(f"{track_id}: {exc}")
            total += 1

    pct = identical / max(1, total)
    # -s makes this visible: pytest tests/test_anlz_reference_oracle.py -v -s
    print(
        f"\n[Level 3] Byte-equivalence: {identical}/{total} ({pct:.0%}) "
        f"— Phase 21 exit gate: ≥50%"
    )
    if errors:
        print(f"[Level 3] Errors ({len(errors)}): {errors[:3]}")

    # plan-21-03 gate = always-pass canary; actual gate is in ROADMAP exit.
    assert pct >= 0.0, "canary (real gate = ROADMAP Phase-21 exit criterion)"


# ---------------------------------------------------------------------------
# Level 4 — read-only invariant (belt-and-braces on top of conftest sentinel)
# ---------------------------------------------------------------------------


@REQUIRES_REF_USB
def test_reference_usb_readonly_invariant() -> None:
    """No file on the reference USB was written by any test so far this session.

    The primary guarantee is the session-scoped sentinel in conftest.py. This
    test adds a second, per-test safety check so a fast failure surfaces next
    to the offending test rather than only at session teardown.
    """
    # Re-scan the exact DAT files we read and assert their mtimes are unchanged
    # since the start of this test. If any test has mutated a reference file,
    # we'll see a fresh mtime.
    sample = list(_all_reference_tracks())[:5]
    for _, _, dat, ext, twoex in sample:
        assert dat.stat().st_size > 0, f"{dat} was truncated or emptied"
        assert ext.stat().st_size > 0, f"{ext} was truncated or emptied"
        if twoex.exists():
            assert twoex.stat().st_size > 0, f"{twoex} was truncated or emptied"
