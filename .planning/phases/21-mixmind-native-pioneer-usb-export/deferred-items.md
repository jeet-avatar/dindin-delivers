# Deferred Items — Phase 21

Out-of-scope findings logged during plan execution. Not fixed in the originating
plan; to be triaged separately.

## tests/test_beat_detector.py::test_bpm_stable_flag fails on clean tree

- **Discovered during:** Plan 21-02 Task 2 integration-test run
- **Pre-existing:** Yes. Reproduced with `git stash` on `gsd/phase-21-mixmind-native-pioneer-usb-export`
  immediately after task-1 commit `15acf4a0`, with Task 2 changes removed.
- **Symptom:** `AssertionError: assert False` on `isinstance(result.bpm_stable, bool)`
  when `result.bpm_stable` prints as `True`. Indicates `bpm_stable` is a
  `numpy.bool_` (subclass of `int`), not Python `bool`. Ripple from numpy 2.x /
  madmom integration.
- **Scope:** Completely unrelated to the analyzer-pipeline wiring added in 21-02.
- **Action deferred to:** a follow-up quick task under `beat_detector.py` — cast
  `bpm_stable = bool(...)` explicitly before returning the BeatGrid. Fix is
  1 line; kept out of 21-02 to respect the scope boundary.

## License posture check — mutagen is GPL-2.0-or-later

- **Discovered during:** Plan 21-06 execution (Pillow + mutagen license review
  before adding `import mutagen` to `artwork_extractor.py`)
- **Status:** Already shipping — mutagen was added to `requirements.txt` in
  Plan 21-01 for folder-scan metadata reads. 21-06 only extends its usage
  (ID3 APIC, FLAC PICTURE, MP4 covr, WAV ID3) to extract album art.
- **License:** GPL-2.0-or-later (`pip show mutagen` →
  `License: GPL-2.0-or-later`, home https://github.com/quodlibet/mutagen).
- **Risk:** GPL-2.0 is strong copyleft. Distributing the sidecar binary as a
  closed-source bundle would put the whole executable at risk.
- **Not a 21-06 blocker:** mutagen is already in the tree; 21-06 does not
  introduce a new GPL surface. This note exists so the exposure is audited
  before first commercial distribution.
- **Options for future triage:**
  1. Replace mutagen calls (artwork_extractor + folder_scanner + rekordbox.py
     if any) with stdlib `struct`-based ID3 / MP4 / FLAC parsers.
  2. Ship the sidecar as open-source (MIT/Apache) with a GPL carve-out for
     the tag-reading layer, keeping mutagen behind a dynamic-import boundary.
  3. License a non-GPL equivalent (pytaglib / taglib has LGPL, which is lighter
     but still copyleft on the library boundary).
- **Action deferred to:** a dedicated license-posture audit phase before v1.0
  distribution. Pillow is already verified HPND (permissive) and added in
  21-06 only — no new license risk from this plan.

## Reference USB sentinel too strict about Spotlight metadata

- **Discovered during:** Plan 21-06 Task 4 full-suite run
- **Symptom:** `conftest._ref_usb_readonly_sentinel` teardown raises
  `RuntimeError: Reference USB at /Volumes/Untitled was mutated during tests`
  listing `.Spotlight-V100/Store-V2/.../psid.db` and `shutdown_time`.
- **Root cause:** macOS Spotlight indexer touches `.Spotlight-V100/` on
  mounted external volumes independently of pytest. Our tests do NOT mutate
  the USB — the sentinel is overly aggressive and flags macOS housekeeping.
- **Scope:** Pre-existing; observed on first Task 4 run even though 21-06
  code only READS from the reference artwork tree (oracle tests) and WRITES
  exclusively to `tmp_path`.
- **Action deferred to:** a quick task tweaking `_snapshot_ref_usb()` to
  exclude `.Spotlight-V100/`, `.Trashes/`, `.fseventsd/` etc. (same ignore
  list most filesystem diff tools use). 1-line change plus targeted test.

## Artwork table (PDB page_type 9) stays empty

- **Discovered during:** Plan 21-06 Task 4 wiring
- **Context:** The plan's Step 2 outline (21-06-PLAN.md:734-738) suggested
  populating an Artwork table row per assignment with a path like
  `/PIONEER/Artwork/00001/a1.jpg`. Inspecting the reference USB's
  `export.pdb` (`parsed.row_count(9) == 0`) shows Pioneer ships 0 artwork
  rows — the CDJ reconstructs the JPEG path directly from the Track row's
  `artwork_id` using the well-known directory convention
  (bucket = slot // 20 + 1, file = `a<slot>.jpg`).
- **Decision (Rule 1 deviation):** match the reference USB — do not emit
  Artwork table rows. Saves us from reverse-engineering a currently-undocumented
  row format AND keeps the PDB byte-for-byte closer to what CDJ firmware expects.
- **If a future CDJ firmware revision starts requiring Artwork rows:**
  add an `ArtworkRow` struct in `pdb_structs.py` and wire it through
  `pdb_writer._emit_table(PAGE_TYPE_ARTWORK, ...)`. Scaffolding already in
  place — `artwork_id_for_pdb` / `decode_artwork_id` give us the row data.
