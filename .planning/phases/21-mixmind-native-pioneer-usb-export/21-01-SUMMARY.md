---
phase: 21-mixmind-native-pioneer-usb-export
plan: 01
subsystem: api
tags: [fastapi, mutagen, sqlite, sqlalchemy, mixmind, sidecar, folder-import, pioneer]

# Dependency graph
requires: []
provides:
  - Folder-scan import: POST /api/library/import with {folder_path} recursively finds audio files, reads tags via mutagen, writes to imported_tracks.
  - Rekordbox import bridge: POST /api/library/import with {from_rekordbox: true} reuses existing try_load_library_db / load_library_xml (preservation rule).
  - imported_tracks SQLite table with content_id PRIMARY KEY + UNIQUE(file_path) idempotence.
  - GET /api/library merges imported tracks (source='import') with Rekordbox tracks.
  - WAVE_FORMAT_EXTENSIBLE detection surfaced as per-file warnings for CDJ-3000 compatibility.
affects: [21-02, 21-03, 21-04, 21-05]

# Tech tracking
tech-stack:
  added: [mutagen>=1.47]
  patterns:
    - "Import source prefixing in content_id: 'import_<sha1[:16]>' for folder scans, 'rbximport_<rb_content_id>' for Rekordbox bridge. Disambiguates origin without schema changes."
    - "INSERT OR IGNORE on UNIQUE(file_path) for row-level idempotence; rowcount drives the skipped_duplicates response field."
    - "Mutable module-level default for StateDB(_DEFAULT_PATH) — re-read at __init__ call time so tests can monkeypatch it."

key-files:
  created:
    - apps/mixmind/sidecar/folder_scanner.py
    - apps/mixmind/sidecar/import_routes.py
    - apps/mixmind/sidecar/tests/test_folder_scanner.py
    - apps/mixmind/sidecar/tests/test_import_routes.py
  modified:
    - apps/mixmind/sidecar/state.py
    - apps/mixmind/sidecar/library.py
    - apps/mixmind/sidecar/main.py
    - apps/mixmind/sidecar/requirements.txt

key-decisions:
  - "content_id convention: folder-scan rows use 'import_<sha1(abs_path)[:16]>' (deterministic, idempotent re-scan). Rekordbox-bridge rows use 'rbximport_<rb_content_id>' so they can coexist with folder imports without collision."
  - "WAVE_FORMAT_EXTENSIBLE handling: flag, don't drop. Warning is surfaced in the POST response so the UI can show 'CDJ may refuse' — user decides whether to re-encode."
  - "Preservation rule honored: pyrekordbox stays in requirements.txt, rekordbox.py untouched, library.py only appends imported tracks (never replaces the Rekordbox path). from_rekordbox=true mode calls the existing public functions unchanged."
  - "StateDB._DEFAULT_PATH made late-bound: previously captured as the function-default of __init__, which made monkeypatching impossible. Fixed as part of Task 2 (Rule 1 auto-fix) so tests can redirect state.db to a tmp file without touching ~/Library/Application Support/MixMind/state.db."

patterns-established:
  - "Folder-import content_id is deterministic from absolute path → rescanning the same folder is a no-op at the DB layer."
  - "Warnings are per-file and ride inside the POST response body; the endpoint itself is always 200 when imports succeed."
  - "Tests that exercise endpoints using StateDB() with no args redirect via `monkeypatch.setattr(state, '_DEFAULT_PATH', tmp_path)`."

requirements-completed: [MM-EXP-01]

# Metrics
duration: 12min
completed: 2026-04-19
---

# Phase 21 Plan 01: Folder Importer Summary

**POST /api/library/import with folder_path scans audio recursively via mutagen, idempotently writes to imported_tracks, and surfaces WAVE_FORMAT_EXTENSIBLE warnings; GET /api/library now merges import rows with Rekordbox rows — Rekordbox read path preserved unchanged.**

## Performance

- **Duration:** ~12 min (02:50 → 03:02 local, Task 1 + Task 2 + tests + E2E)
- **Started:** 2026-04-19T14:50:00Z
- **Completed:** 2026-04-19T15:02:00Z
- **Tasks:** 2
- **Files modified:** 4 created + 4 modified

## Accomplishments

- New `POST /api/library/import` endpoint. Handles folder_path mode (scan + insert) and from_rekordbox=true mode (bridge from pyrekordbox).
- Full mutagen-based metadata extraction across mp3/aiff/wav/flac/m4a/alac with fallback-to-filename on tag failures.
- Idempotent DB layer: deterministic content_id + UNIQUE(file_path) → re-imports report skipped_duplicates instead of dup rows.
- WAVE_FORMAT_EXTENSIBLE probe walks RIFF chunks to flag 0xFFFE format_code files (CDJ-3000 compatibility warning per RESEARCH.md Pitfall 3).
- GET /api/library now merges imported_tracks (source='import') after Rekordbox rows; also surfaces imports when no Rekordbox library exists at all.
- Rekordbox preservation rule honored: pyrekordbox stays in requirements.txt, rekordbox.py untouched, library.py only appends imported rows.
- 16 new tests (8 folder_scanner unit + 8 import_routes integration), all passing. 23 existing sidecar tests still pass → 39/39 green.
- Live E2E against `~/Music/MixMind-Inbox` (1458 files): first import → imported=1458, warnings=0; second import → imported=0, skipped_duplicates=1458 (fully idempotent).

## Task Commits

Each task was committed atomically:

1. **Task 1: folder_scanner + imported_tracks table + mutagen dep** — `fe787189` (feat)
2. **Task 2: POST /api/library/import + library merge** — `0c16b0d7` (feat)

## Files Created/Modified

- `apps/mixmind/sidecar/folder_scanner.py` — pure-function module; scan_folder, _extract_tags via mutagen, _probe_wav_extensible, ScannedTrack dataclass, AUDIO_EXTS constant.
- `apps/mixmind/sidecar/import_routes.py` — POST /api/library/import endpoint with ImportRequest / ImportResponse Pydantic models.
- `apps/mixmind/sidecar/tests/test_folder_scanner.py` — 8 unit tests (extensions, hidden/macos, recursion, determinism, stem fallback, WAV_EXTENSIBLE flagging, content id stability, non-directory error).
- `apps/mixmind/sidecar/tests/test_import_routes.py` — 8 integration tests using FastAPI TestClient + monkeypatched _DEFAULT_PATH fixture.
- `apps/mixmind/sidecar/state.py` — added imported_tracks table, idx_imported_batch index, ImportedTrack dataclass, add_imported_track / get_imported_track / get_imported_tracks methods; __init__ switched to late-bound _DEFAULT_PATH.
- `apps/mixmind/sidecar/library.py` — _build_track_from_imported helper; GET /api/library appends imported rows; fallback when no Rekordbox library exists returns source='import' instead of no_library_found.
- `apps/mixmind/sidecar/main.py` — include_router for import_router.
- `apps/mixmind/sidecar/requirements.txt` — added mutagen>=1.47 (pyrekordbox unchanged).

## Decisions Made

- **content_id scheme** uses source-prefixed sha1 hashes: `import_*` for folder scans, `rbximport_*` for Rekordbox-bridge rows. Two origins can coexist without schema extension.
- **Warnings don't fail the import.** WAVE_FORMAT_EXTENSIBLE is surfaced in the response's `warnings[]` list, but the file is still written to the DB — user can decide to re-encode.
- **Preservation over refactor.** rekordbox.py and the pyrekordbox import sites in library.py are not touched. from_rekordbox=true calls those functions unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] StateDB _DEFAULT_PATH not late-bound**
- **Found during:** Task 2 (test_library_includes_imported_tracks and test_library_merges_import_with_rekordbox initially failed with thousands of real-library rows leaking in)
- **Issue:** `StateDB.__init__(self, db_path: Path = _DEFAULT_PATH)` captured the module-level path as a function-default at class-definition time. `monkeypatch.setattr(state, '_DEFAULT_PATH', tmp)` had no effect — every test ran against `~/Library/Application Support/MixMind/state.db` with the user's real Rekordbox rows.
- **Fix:** Changed signature to `db_path: Path | None = None` and re-read `_DEFAULT_PATH` inside `__init__` at call time.
- **Files modified:** apps/mixmind/sidecar/state.py
- **Verification:** All 8 test_import_routes tests pass; all 12 test_state tests continue to pass.
- **Committed in:** 0c16b0d7 (part of Task 2 commit)

**2. [Rule 1 - Bug] Test monkeypatch didn't reach library.py's `try_load_library_db` reference**
- **Found during:** Task 2 (test_library_* tests)
- **Issue:** library.py does `from rekordbox import try_load_library_db`, which binds the symbol at module-load time. Patching `rekordbox.try_load_library_db` doesn't update library.py's already-captured reference, so tests that tried to stub out the real DB read path had the real function run and return live data from `~/Library/Pioneer/rekordbox/master.db`.
- **Fix:** Added `_patch_rekordbox_load(monkeypatch, returns)` helper in the test file that patches both `rekordbox.try_load_library_db` AND `library.try_load_library_db`. No production code change — this was a test-only fix.
- **Files modified:** apps/mixmind/sidecar/tests/test_import_routes.py
- **Verification:** Tests now run hermetically without touching the user's Rekordbox library.
- **Committed in:** 0c16b0d7 (part of Task 2 commit)

**Total deviations:** 2 auto-fixed (both Rule 1 bugs caught during test execution).
**Impact on plan:** Neither affected the plan's scope. Both bugs were test-hygiene issues surfaced by monkeypatch limitations — the fix was in the code being tested (for #1) and the test helper (for #2), not the endpoint's behavior.

## Issues Encountered

- **mutagen logged WARNING on fake test audio** (files with fake bytes, not real MP3s). This is expected — mutagen can't parse `b"fake audio"` but the fallback to `path.stem` correctly kicked in. Logs are noisy in test output but don't affect pass/fail. Not addressed; the fallback path is exactly what was spec'd.

## User Setup Required

None — this is a backend-only change, mutagen is a pure-Python dep installed via requirements.txt.

## Next Phase Readiness

- **Plan 21-02 (analyzer)** now has a concrete source of tracks to analyze: rows in `imported_tracks` with known file paths. The analyzer can read `StateDB.get_imported_tracks()` to get the work queue.
- **Plan 21-05 (acceptance)** can use `~/Music/MixMind-Inbox` as the staging dataset — E2E already proves the importer handles all 1458 files idempotently.
- **Plan 21-03 (ANLZ writer)** reads from `imported_tracks` + `analysis_cache`, both now in place.
- No blockers. Rekordbox read path verified still functional (39/39 tests green including the existing test_library_endpoint and test_rekordbox suites).

## Verification Checklist

- [x] **Grep proof:** `imported_tracks`, `scan_folder`, `from_rekordbox`, `import_router` all present in state.py, folder_scanner.py, import_routes.py, library.py, main.py. `mutagen>=1.47` + `pyrekordbox==0.4.4` both in requirements.txt (preservation intact).
- [x] **Run proof:** `pytest tests/test_folder_scanner.py tests/test_import_routes.py -v` → 16/16 passed. `pytest tests/` (62 tests incl. heavy ML) → 62/62 passed.
- [x] **Frontend proof:** N/A — backend-only plan.
- [x] **E2E proof:** Live sidecar smoke tested against 1458-file `~/Music/MixMind-Inbox`: 200 / imported=1458 / warnings=0; re-import imported=0, skipped_duplicates=1458. 400 returned for missing folder_path and nonexistent folder; 404 returned for from_rekordbox=true with no library.
- [x] **Rekordbox preservation proof:** `grep "from pyrekordbox|try_load_library_db|load_library_xml" rekordbox.py library.py` shows all 9 original call sites intact.

## Self-Check: PASSED

All claimed files exist (folder_scanner.py, import_routes.py, test_folder_scanner.py, test_import_routes.py created; state.py, library.py, main.py, requirements.txt modified). Both commits exist in git log (`fe787189`, `0c16b0d7`). All 39 Phase 21-01 + related tests pass; full 62-test sidecar suite passes with no regressions.

---
*Phase: 21-mixmind-native-pioneer-usb-export*
*Completed: 2026-04-19*
