---
phase: 21-mixmind-native-pioneer-usb-export
plan: 02
subsystem: sidecar-analyzer
tags: [fastapi, demucs, essentia, madmom, mixmind, sidecar, analyzer, pioneer-export]

# Dependency graph
requires: [21-01]
provides:
  - "POST /api/library/analyze endpoint queues every imported track
    (source='import') into the existing AnalysisBatchRunner without modifying
    the Rekordbox path (/api/analyze/batch)."
  - "End-to-end integration test proving the analyzer populates bpm,
    camelot, waveform_4stem, beat_grid_mm, sections_mm, auto_cues_mm in
    state.db for every imported track."
  - "Pytest marker 'slow' registered in pytest.ini so heavy
    Demucs + madmom tests can be filtered with `-m 'not slow'`."
affects: [21-03, 21-04, 21-05]

# Tech tracking
tech-stack:
  added: []  # zero new deps - allin1 deliberately NOT added per user decision
  patterns:
    - "Shared batch-runner re-use: /api/library/analyze instantiates the same
      AnalysisBatchRunner that /api/analyze/batch uses, with a new source
      ('import') and imported_tracks as the queue source. Both endpoints share
      _batch_runner so only one may run at a time."
    - "Idempotence via status check: before queueing, filter out rows already
      at status='complete' in analysis_cache (source='import') unless
      force=true is passed."

key-files:
  created:
    - apps/mixmind/sidecar/tests/test_analyze_imported.py
    - apps/mixmind/sidecar/tests/fixtures/audio/README.md
    - .planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md
  modified:
    - apps/mixmind/sidecar/analyze_routes.py
    - apps/mixmind/sidecar/pytest.ini

key-decisions:
  - "Zero new dependencies: user explicitly directed that `allin1` (recommended
    in 21-RESEARCH.md) NOT be added because of PyTorch-model bloat. Existing
    heuristic-based section_detector.py is sufficient for now. If section
    quality turns out to be a problem, that's a follow-up phase."
  - "analyzer.py unchanged: verified via grep that analyze_track() and
    AnalysisBatchRunner already accept an arbitrary `source` string, so
    passing 'import' works with no refactor."
  - "Pytest 'slow' marker added: each integration test takes ~22 s; default
    CI runs should skip them with `-m 'not slow'` while still running the
    fast unit suite. Registered the marker in pytest.ini so pytest doesn't
    emit UnknownMarkWarning."

patterns-established:
  - "Synthetic audio fixtures: tests generate 10 s sine + kick WAV files
    inline with numpy/soundfile. No binary audio is committed to the repo.
    The recipe is documented in tests/fixtures/audio/README.md."
  - "Status polling loop with 2 s interval and a hard timeout, to wait for
    the batch runner to transition in_progress true-to-false."

requirements-completed: [MM-EXP-02]

# Metrics
duration: 16min
completed: 2026-04-19
---

# Phase 21 Plan 02: Imported-Track Analyzer Summary

**POST /api/library/analyze runs the existing Demucs + Essentia + madmom
pipeline (no new deps) on every imported track, persists bpm / camelot /
beat_grid_mm / sections_mm / auto_cues_mm / waveform_4stem to state.db, and
passes a 3-file end-to-end integration test against synthetic WAVs.**

## Performance

- **Duration:** ~16 min (22:16 UTC → 22:33 UTC)
- **Started:** 2026-04-19T22:16:59Z
- **Completed:** 2026-04-19T22:33:16Z
- **Tasks:** 2
- **Files:** 3 created + 2 modified

## Accomplishments

- **New POST /api/library/analyze** added in `analyze_routes.py` — queues
  tracks from `imported_tracks` (source='import') into the shared
  `AnalysisBatchRunner`. Rekordbox path (`/api/analyze/batch`) is completely
  untouched.
- **Idempotent:** rows already at status='complete' are skipped; a second POST
  after completion returns `{"status": "all_analyzed"}` instead of re-queueing.
- **Live-smoke verified** on one real `.mp3` from `~/Music/MixMind-Inbox`
  (1.43 MB): `bpm=155.8, camelot=10A, key=Bm`, with non-empty msgpack blobs
  for waveform (23,969 B), beat_grid (20,507 B), sections (1,043 B), auto_cues
  (621 B). All 6 MM-EXP-02 fields populated.
- **2 new tests** in `tests/test_analyze_imported.py`, both pass in ~22 s each:
  - `test_analyze_imported_populates_all_required_fields` — asserts every
    MM-EXP-02 field lands in state.db across 3 synthetic tracks.
  - `test_analyze_imported_idempotent` — proves re-triggering after completion
    does not re-queue.
- **153 pre-existing sidecar tests** still pass (0 regressions attributable
  to 21-02 changes).
- **Zero new dependencies** added. `allin1` deliberately left out per user
  decision to avoid PyTorch-model bloat. `rbox` GPL-3.0 remains locked out.

## Task Commits

1. **Task 1: POST /api/library/analyze endpoint + live smoke test** — `15acf4a0` (feat)
2. **Task 2: tests/test_analyze_imported.py + fixtures README + slow marker** — `05becdc5` (test)

## Files Created/Modified

- `apps/mixmind/sidecar/analyze_routes.py` — new `analyze_library` handler at
  POST /api/library/analyze. Global `_batch_runner` shared with the legacy
  `start_batch` so only one batch runs at a time.
- `apps/mixmind/sidecar/tests/test_analyze_imported.py` — 2 pytest.mark.slow
  integration tests using FastAPI TestClient + tmp state.db fixture + synthetic
  10 s WAV audio generator.
- `apps/mixmind/sidecar/tests/fixtures/audio/README.md` — explains the
  synthetic-audio recipe; no binary audio is committed.
- `apps/mixmind/sidecar/pytest.ini` — registered `slow` marker.
- `.planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md` —
  logged pre-existing `test_bpm_stable_flag` failure (out of scope).

## Decisions Made

- **No `allin1`.** Existing heuristic `section_detector.py` is retained per
  user decision. If section quality needs improving, schedule a follow-up
  phase — don't bloat requirements.txt now.
- **Share `_batch_runner` across endpoints.** The Rekordbox batch
  (`/api/analyze/batch`) and the imported-tracks batch
  (`/api/library/analyze`) both mutate the module-global `_batch_runner`, so
  only one can run at a time. Simpler than two runners.
- **Synthetic audio, not committed fixtures.** 10 s WAVs generated in
  `tmp_path` by numpy + soundfile — essentia finds BPM within the half/double
  tolerance band, key detection is stable on a 440 Hz carrier, and demucs
  still produces non-empty stems.
- **`slow` marker.** Full integration tests stay in the suite but are opt-in
  via `-m 'not slow'`. Ran both tests to prove they pass on a developer box.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] pytest-timeout not installed, plan's `--timeout=300` failed**
- **Found during:** Task 2 initial pytest invocation
- **Issue:** The plan's verify command uses `pytest --timeout=300`, but
  `pytest-timeout` is not in requirements.txt, and pytest aborts with
  `unrecognized arguments: --timeout=300`.
- **Fix:** Ran without `--timeout`. Each slow test completes in ~22 s
  anyway; the wall-clock timeout wasn't load-bearing. No plan change —
  just a runtime adjustment of how we invoked pytest.
- **Files modified:** none
- **Verification:** Both slow tests pass (22.43 s + 22.66 s) without the flag.

**2. [Out of scope] Pre-existing failure: `tests/test_beat_detector.py::test_bpm_stable_flag`**
- **Found during:** Final full-suite run
- **Issue:** The test asserts `isinstance(result.bpm_stable, bool)` but
  `bpm_stable` is a `numpy.bool_` (subclass of `int`, not of `bool`). The test
  reproduces identically on a stashed-clean tree — not caused by 21-02
  changes.
- **Action:** Logged to `.planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md`
  per the executor scope-boundary rule. Fix is 1-line (`bpm_stable = bool(...)`)
  and will be scheduled separately so it doesn't bloat this plan.

**Total deviations:** 1 auto-fix (runtime flag), 1 out-of-scope deferral.

## Issues Encountered

- **madmom downbeat detection sometimes falls back to beat positions** on
  trivially simple synthetic audio (`Downbeat detection failed, using beat
  positions only: setting an array element with a sequence` warning from
  `beat_detector.py:83-95`). The fallback labels beats 1-4-1-4… synthetically,
  which still produces a valid `beat_grid_mm` blob. On real audio the
  downbeat processor converges normally (confirmed via the live-smoke MP3
  run).

## User Setup Required

None — backend-only plan. The analyze endpoint runs on whatever tracks are
already in `imported_tracks` (Plan 21-01 populates that).

## Next Phase Readiness

- **Plan 21-03 (ANLZ writer):** Now has a concrete `analysis_cache` source —
  every imported track has bpm, camelot, 800-column 4-stem waveform, beat
  grid with downbeats, ≥8 auto-cues, and section labels ready to serialize.
- **Plan 21-04 (PDB writer):** Same — `state.db.analysis_cache WHERE source='import'`
  is the go-to query for PDB row population.
- **Plan 21-05 (acceptance):** E2E flow is now
  `POST /api/library/import -> POST /api/library/analyze -> POST /api/library/export`.
  First two are green; only export is pending.

## Verification Checklist

- [x] **Grep proof:**
  - `grep -n "analyze_library\|imported_tracks" analyze_routes.py` → endpoint
    present, pulls from `get_imported_tracks()`.
  - `grep -n "RhythmExtractor2013\|KeyExtractor\|stems_to_waveform" analyzer.py`
    → all three primitives present.
  - `grep -n "DBNDownBeatTrackingProcessor" beat_detector.py` → downbeat
    tracker wired (with graceful fallback).
  - `grep -n "suggest_cues" cue_detector.py` → cue detector present.
  - `grep -n "detect_sections" section_detector.py` → section detector present.
  - `grep -n "allin1" requirements.txt` → 0 matches (deliberately excluded).
- [x] **Run proof:**
  - Live smoke on real `.mp3`: all 6 MM-EXP-02 fields populated; `bpm=155.8`,
    `camelot=10A`.
  - `pytest tests/test_analyze_imported.py -v -s` → 2/2 pass (~45 s total).
  - `pytest tests/ -m "not slow" -v` → 160 passed, 1 pre-existing failure
    (documented in deferred-items.md), 2 deselected (slow tests).
- [x] **Frontend proof:** N/A — plan is backend-only. Frontend wires in
  Plan 21-05.
- [x] **E2E proof:** Synthetic 3-track import → analyze → all 6 required
  fields populated for all 3 tracks → re-trigger returns all_analyzed.

## Self-Check: PASSED

All claimed files exist:
- `apps/mixmind/sidecar/analyze_routes.py` — FOUND, contains `analyze_library`
- `apps/mixmind/sidecar/tests/test_analyze_imported.py` — FOUND, 226 lines
- `apps/mixmind/sidecar/tests/fixtures/audio/README.md` — FOUND
- `apps/mixmind/sidecar/pytest.ini` — FOUND, contains `markers = slow`
- `.planning/phases/21-mixmind-native-pioneer-usb-export/deferred-items.md` — FOUND

Both commits exist in git log:
- `15acf4a0 feat(21-02): add POST /api/library/analyze for imported tracks`
- `05becdc5 test(21-02): end-to-end integration test for imported-track analysis`

Tests pass (new + existing): 162 passed, 1 pre-existing out-of-scope failure
(beat_detector bpm_stable bool cast).

---
*Phase: 21-mixmind-native-pioneer-usb-export*
*Completed: 2026-04-19*
