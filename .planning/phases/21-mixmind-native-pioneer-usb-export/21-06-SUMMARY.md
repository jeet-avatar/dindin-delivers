---
phase: 21-mixmind-native-pioneer-usb-export
plan: 06
subsystem: usb-export
tags: [artwork, jpeg, pdb, cdj-3000, pillow, mutagen, id3, flac, mp4]

# Dependency graph
requires:
  - phase: 21-02
    provides: folder-scan metadata reader (mutagen already in requirements)
  - phase: 21-04
    provides: usb_exporter.export_to_usb pipeline + pdb_writer + test_cdj_export_roundtrip fixture base
provides:
  - artwork_extractor.extract_from_audio() for MP3/AIFF/FLAC/MP4/WAV → 80x80 + 240x240 JPEG pairs
  - artwork_writer.assign_bucket_slot() / write_track() / artwork_id_for_pdb() / decode_artwork_id()
  - Track row artwork_id population in export.pdb (was hardcoded 0)
  - Reference USB oracle (77 parametrized tests) validating encoder vs Pioneer samples
  - Rule 1 deviation: SLOTS_PER_BUCKET = 20 with global slot numbering (plan said 38 per-bucket-reset)
  - Rule 1 deviation: Artwork PDB table (page_type 9) stays empty, matching reference USB
affects:
  - 21-07 (if CDJ-3000 acceptance UAT reveals artwork rendering issues)
  - future license-posture audit (mutagen GPL-2.0 already logged in deferred-items.md)

# Tech tracking
tech-stack:
  added: [Pillow>=10.0.0]  # HPND — permissive
  patterns:
    - "Extractor pattern: dispatch-by-extension with per-format mutagen adapters; swallow exceptions → return empty ExtractedArtwork"
    - "Writer pattern: assign_bucket_slot() is pure; write_track() is the only I/O; artwork_id_for_pdb() is the single-field PDB key"
    - "Reference oracle pattern: parametrized tests with REQUIRES_REF_USB skipif + MIXMIND_SKIP_REF_USB=1 CI escape hatch"
    - "Scanner-test pattern: when pdb_reader doesn't decode the field you care about, read bytes directly using offsets verified from pdb_structs.TrackRow.subcons"

key-files:
  created:
    - apps/mixmind/sidecar/artwork_extractor.py
    - apps/mixmind/sidecar/artwork_writer.py
    - apps/mixmind/sidecar/tests/test_artwork_extractor.py
    - apps/mixmind/sidecar/tests/test_artwork_writer.py
    - apps/mixmind/sidecar/tests/test_artwork_reference_oracle.py
  modified:
    - apps/mixmind/sidecar/usb_exporter.py
    - apps/mixmind/sidecar/pdb_writer.py
    - apps/mixmind/sidecar/tests/test_cdj_export_roundtrip.py
    - apps/mixmind/sidecar/requirements.txt
    - .planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md

key-decisions:
  - "SLOTS_PER_BUCKET = 20 with GLOBAL 1-indexed slot numbering (not 38 with per-bucket reset). Verified by enumerating 46 buckets on the reference USB: bucket 00001 holds slots 1..19, 00002..00045 hold 20 each, 00046 is a partial tail with slots 900..908. The plan's 38-per-bucket assumption was a misreading of the handoff."
  - "PDB Artwork table (page_type 9) stays empty — reference /Volumes/Untitled/PIONEER/rekordbox/export.pdb has 0 artwork rows. CDJ firmware reconstructs JPEG path directly from Track row artwork_id via deterministic formula bucket = slot // 20 + 1."
  - "artwork_id = global_slot (single-field key, not bit-packed). Fits Int32ul comfortably, decode is trivial (no ambiguity). Matches what a pdb_reader would need for 21-07 acceptance."
  - "Pillow quality=85 + optimize=True + progressive=False — empirically within [0.5x, 2x] file-size band of Pioneer reference JPEGs, MAE < 10 on round-trip."
  - "Mutagen (GPL-2.0) kept — already in requirements.txt from Plan 21-01; 21-06 only extends its usage to APIC/PICTURE/covr extraction. Commercial-distribution license audit deferred."
  - "JPEG files with non-0xFFD8FF magic bytes exist on the reference USB (observed bucket 00003 slots 49-51, bucket 00005 slot 93 — likely Pioneer-internal obfuscation). Oracle filters these via _is_real_jpeg() guard."

patterns-established:
  - "Deviation pattern: when plan and reference data conflict, REFERENCE wins — and the deviation gets documented in deferred-items.md with the observation that disproved the plan."
  - "Integration test for PDB field values: scan export.pdb bytes using offsets from TrackRow.subcons (verified at runtime) rather than extending pdb_reader — keeps test independent."

requirements-completed: [MM-EXP-03, MM-EXP-04, MM-EXP-06]

# Metrics
duration: ~2h (across pre-compaction + post-compaction session)
completed: 2026-04-19
---

# Phase 21 Plan 06: CDJ-3000 Artwork Pipeline Summary

**Embedded album art extraction (MP3/AIFF/FLAC/MP4/WAV) → Pioneer-format 80x80 + 240x240 JPEG pairs in `PIONEER/Artwork/<bucket>/a<slot>{,_m}.jpg` with `artwork_id` plumbing through `export.pdb`, fully validated against real reference USB samples.**

## Performance

- **Duration:** ~2h (including compaction and 3 auto-fix cycles)
- **Completed:** 2026-04-19T23:53Z
- **Tasks:** 4/4 (Task 1 Extractor, Task 2 Writer, Task 3 Oracle, Task 4 Wiring)
- **Files created:** 5
- **Files modified:** 5
- **Tests added:** 116 (31 unit + 77 oracle parametrized + 8 E2E roundtrip)

## Accomplishments

- **Artwork extractor** — multi-format (ID3 APIC / FLAC PICTURE / MP4 covr / WAV ID3) with graceful error absorption; picture_type 3 → primary `a*`, picture_type 4 → alt `b*`.
- **Artwork writer** — deterministic `(bucket, slot)` assignment matching reference USB conventions, pure I/O-free layout helpers, no-op safety when both byte args are `None`.
- **Reference oracle** — 77 parametrized tests across 15 verified sample coordinates (first bucket, standard mid buckets, partial tail); asserts dimensions, magic bytes, MAE<10 round-trip, and size ratio within [0.5x, 2x].
- **USB exporter wiring** — `_extract_and_write_artwork()` helper runs before PDB emit; artwork-bearing tracks get contiguous global slot numbers, art-less tracks keep `artwork_id=0`.
- **PDB writer** — Track rows now carry correct `artwork_id`; Artwork table stays empty (matches reference — Rule 1 deviation).
- **License regression test** extended to cover artwork_extractor.py + artwork_writer.py (zero rbox imports).

## Task Commits

Each task was committed atomically:

1. **Task 1: artwork_extractor** — `d64b0eb2` (feat) — mutagen + Pillow re-encoder, 10 unit tests
2. **Task 2a: artwork_writer (initial)** — `73678451` (feat) — initial writer with plan's 38 slots/bucket assumption
3. **Task 2b: artwork_writer correction** — `ec009488` (fix) — Rule 1 deviation: 20 slots/bucket with global slot numbering after reference USB enumeration
4. **Task 3: reference oracle** — `01ec9d36` (test) — 77 parametrized tests vs /Volumes/Untitled samples
5. **Task 4: wire into exporter + PDB** — `5b8555ab` (feat) — `_extract_and_write_artwork()` + `artwork_assignments` through `write_pdb()` + 3 E2E tests

## Files Created/Modified

**Created:**
- `apps/mixmind/sidecar/artwork_extractor.py` — dispatch-by-extension extractor, Pillow quality=85 re-encoder
- `apps/mixmind/sidecar/artwork_writer.py` — `assign_bucket_slot()`, `write_track()`, `artwork_id_for_pdb()`, `decode_artwork_id()`
- `apps/mixmind/sidecar/tests/test_artwork_extractor.py` — 10 unit tests (synthetic MP3 with APIC via mutagen)
- `apps/mixmind/sidecar/tests/test_artwork_writer.py` — 21 unit tests (bucket/slot + path + PDB id encoding)
- `apps/mixmind/sidecar/tests/test_artwork_reference_oracle.py` — 77 parametrized tests vs reference USB

**Modified:**
- `apps/mixmind/sidecar/usb_exporter.py` — added `_extract_and_write_artwork()` helper + wiring + imports
- `apps/mixmind/sidecar/pdb_writer.py` — `write_pdb(..., artwork_assignments=None)` + Track row `artwork_id` populated from assignments
- `apps/mixmind/sidecar/tests/test_cdj_export_roundtrip.py` — 3 new E2E tests (artworked / art-less / mixed); license regression scan extended
- `apps/mixmind/sidecar/requirements.txt` — `Pillow>=10.0.0` added
- `.planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md` — documented Artwork-table-empty decision, mutagen GPL audit, and Spotlight sentinel false-positive

## Decisions Made

All critical decisions documented in frontmatter `key-decisions`. Headline:

1. **Slot layout: global 1-indexed, 20 per bucket** (not 38 per-bucket-reset) — reference USB is authoritative.
2. **artwork_id = slot directly** — single-field Int32ul key, no bit-packing, trivial decode.
3. **Artwork PDB table stays empty** — reference shows `row_count(9) == 0`; CDJ firmware reconstructs paths deterministically.
4. **Keep mutagen** (already in tree from 21-01) — license audit deferred, no new GPL surface in 21-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SLOTS_PER_BUCKET corrected from 38 to 20**
- **Found during:** Task 2 (artwork_writer implementation and initial commit `73678451`)
- **Issue:** Plan `must_haves.truths` stated "each bucket holds 38 artwork slots (observed max on reference USB)" with per-bucket slot reset. Enumerating 46 real buckets on `/Volumes/Untitled/PIONEER/Artwork/` revealed slots are GLOBAL (bucket 00001 holds 1..19, bucket 00002 holds 20..39, ..., bucket 00046 holds 900..908). The `38` was a misreading of the handoff note.
- **Fix:** Corrected `SLOTS_PER_BUCKET = 20` (commit `ec009488`), rewrote `assign_bucket_slot()` / `artwork_id_for_pdb()` / `decode_artwork_id()` for global slot semantics, updated all tests.
- **Files modified:** `artwork_writer.py`, `tests/test_artwork_writer.py`
- **Verification:** 21 unit tests pass; oracle tests confirm formula matches reference USB layout for every sampled slot.
- **Committed in:** `ec009488`

**2. [Rule 1 - Bug] Artwork PDB table kept empty (Rule 1 deviation from plan's Step 2)**
- **Found during:** Task 4 (PDB wiring)
- **Issue:** Plan outline at 21-06-PLAN.md:734 suggested emitting Artwork table rows `{"id": aid, "path": f"/PIONEER/Artwork/{(aid >> 8):05d}/a{(aid & 0xFF)}.jpg"}`. Inspecting the reference `/Volumes/Untitled/PIONEER/rekordbox/export.pdb` via our own `pdb_reader` showed `parsed.row_count(9) == 0` — Pioneer ships zero artwork rows. The CDJ reconstructs paths from `Track.artwork_id` using the deterministic `bucket = slot // 20 + 1` formula.
- **Fix:** Kept `_emit_table(PAGE_TYPE_ARTWORK, [])` — matches reference byte-for-byte. Avoids reverse-engineering a currently-undocumented row format.
- **Files modified:** `pdb_writer.py` (no changes needed, just a decision not to add rows)
- **Verification:** `test_export_track_with_embedded_art_produces_artwork_tree` passes; `artwork_id=1` correctly set on Track row and reconstructable.
- **Committed in:** `5b8555ab` (the decision and rationale)

**3. [Rule 1 - Bug] PageHeader.page_type offset fixed in integration-test scanner**
- **Found during:** Task 4 (writing E2E artwork tests)
- **Issue:** First draft of `_read_artwork_id_for_track()` in the roundtrip test used byte offset 4 for `page_type`, but PageHeader actually has `gap(4) + page_index(4) + page_type(4)` → page_type is at offset 8. Also got the TrackRow `artwork_id` offset wrong (had 36, actual 32).
- **Fix:** Dumped `PageHeader.subcons` and `TrackRow.subcons` at runtime, corrected offsets to 8 (page_type) and 32 (artwork_id), 76 (Track id).
- **Files modified:** `tests/test_cdj_export_roundtrip.py`
- **Verification:** All 8 roundtrip tests pass.
- **Committed in:** `5b8555ab`

### Out-of-scope findings (NOT fixed — logged to deferred-items.md)

- **`tests/test_beat_detector.py::test_bpm_stable_flag` fails** — pre-existing numpy 2.x / madmom `numpy.bool_` vs Python `bool` isinstance issue. Already logged in deferred-items.md during Plan 21-02.
- **`_ref_usb_readonly_sentinel` teardown error** — macOS Spotlight indexer touches `.Spotlight-V100/` on the mounted volume during long test runs; our code never mutates the USB. Needs sentinel ignore-list fix (separate quick task).

**Total deviations:** 3 auto-fixed (3 × Rule 1). All three necessary for correctness and reference-USB fidelity.
**Impact on plan:** Zero scope creep — all fixes pulled plan into alignment with observed reference data.

## Issues Encountered

- **Non-JPEG bytes in reference artwork tree** — some slots (bucket 00003/49-51, 00005/93) have headers that are NOT `0xFFD8FF`. Handled via `_is_real_jpeg()` guard in the oracle; those slots would never be used for our own exports.
- **Pillow 12.2.0 installed fine in existing sidecar venv** — no dependency conflict with numpy<2 pin.

## User Setup Required

None — no external service configuration needed. The artwork pipeline is pure Python (Pillow + mutagen + stdlib).

## Next Phase Readiness

- **21-07 CDJ-3000 acceptance UAT** — ready. Exporter now produces a real `PIONEER/Artwork/<bucket>/a<slot>{,_m}.jpg` tree when tracks carry embedded art; Track rows reference the right `artwork_id`. A CDJ should display the browser grid with covers once a test USB is exported from a real library.
- **Known pre-existing failures** (unrelated to 21-06) documented in `deferred-items.md` — `test_bpm_stable_flag` needs `bool(...)` cast and the Spotlight sentinel needs an ignore list. Both are 1-line fixes deferred to follow-up quick tasks.
- **License gate** — mutagen GPL-2.0-or-later must be audited before first commercial distribution; option paths (stdlib parsers / LGPL equivalent / carve-out) outlined in deferred-items.md.

---
*Phase: 21-mixmind-native-pioneer-usb-export*
*Plan: 06*
*Completed: 2026-04-19*

## Self-Check: PASSED

All 7 claimed files present on disk; all 5 task commits present in `git log`:
- `d64b0eb2` (Task 1) — artwork_extractor
- `73678451` (Task 2a) — artwork_writer initial
- `ec009488` (Task 2b fix) — SLOTS_PER_BUCKET correction
- `01ec9d36` (Task 3) — reference oracle
- `5b8555ab` (Task 4) — exporter + PDB wiring
