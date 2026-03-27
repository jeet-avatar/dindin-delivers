---
phase: quick-246
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/sidecar/state.py
  - apps/mixmind/sidecar/requirements.txt
  - apps/mixmind/sidecar/analyzer.py
  - apps/mixmind/sidecar/tests/test_state.py
  - apps/mixmind/sidecar/tests/test_analyzer.py
autonomous: false
requirements: [STEM-01, STEM-02, STEM-03]

must_haves:
  truths:
    - "analysis_cache table exists in state.db with correct schema (15 columns, composite PK)"
    - "StateDB has save_analysis, get_analysis, unanalyzed_ids, update_analysis_status, analysis_counts methods"
    - "stems_to_waveform converts 4 numpy arrays to 800 column dicts with 0-255 values per stem"
    - "analyze_track runs Demucs + Essentia pipeline, caches results in DB, handles failures gracefully"
    - "AnalysisBatchRunner processes tracks in background thread with cancellation support"
    - "All new dependencies install cleanly and imports succeed"
  artifacts:
    - path: "apps/mixmind/sidecar/state.py"
      provides: "analysis_cache table + 5 CRUD methods"
      contains: "analysis_cache"
    - path: "apps/mixmind/sidecar/analyzer.py"
      provides: "Demucs + Essentia pipeline, stems_to_waveform, AnalysisBatchRunner"
      exports: ["stems_to_waveform", "analyze_track", "AnalysisBatchRunner"]
    - path: "apps/mixmind/sidecar/requirements.txt"
      provides: "numpy, demucs, essentia, msgpack, torch dependencies"
      contains: "demucs"
    - path: "apps/mixmind/sidecar/tests/test_state.py"
      provides: "5 tests for analysis_cache CRUD"
    - path: "apps/mixmind/sidecar/tests/test_analyzer.py"
      provides: "3 tests for stems_to_waveform"
  key_links:
    - from: "apps/mixmind/sidecar/analyzer.py"
      to: "apps/mixmind/sidecar/camelot.py"
      via: "import musical_key_to_camelot"
      pattern: "from camelot import musical_key_to_camelot"
    - from: "apps/mixmind/sidecar/analyzer.py"
      to: "apps/mixmind/sidecar/state.py"
      via: "db.save_analysis and db.update_analysis_status calls"
      pattern: "db\\.save_analysis|db\\.update_analysis_status"
---

<objective>
Implement the MixMind stem analysis pipeline foundation: database schema, dependency installation, and core analyzer module (Demucs stem separation + Essentia feature extraction + waveform conversion).

Purpose: Enable 4-stem waveform analysis for DJ tracks that Rekordbox missed, producing drums/bass/vocals/other separation with BPM/key/genre extraction.
Output: analysis_cache table in state.db, installed ML dependencies, analyzer.py with full pipeline + batch runner, passing tests.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/superpowers/plans/2026-03-27-mixmind-stem-analysis.md
@docs/superpowers/specs/2026-03-27-mixmind-stem-analysis-design.md
@apps/mixmind/sidecar/state.py
@apps/mixmind/sidecar/camelot.py
@apps/mixmind/sidecar/requirements.txt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add analysis_cache table + CRUD methods to state.py and install deps</name>
  <files>
    apps/mixmind/sidecar/state.py
    apps/mixmind/sidecar/requirements.txt
    apps/mixmind/sidecar/tests/test_state.py
  </files>
  <action>
**Part A — Database schema + methods:**

Add `analysis_cache` table creation to `StateDB._create_tables()` method, after the existing `preferences` table. Use raw SQL via `text()` matching the existing pattern:

```sql
CREATE TABLE IF NOT EXISTS analysis_cache (
    content_id       TEXT NOT NULL,
    source           TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    error_message    TEXT,
    file_path        TEXT,
    bpm              REAL,
    key_musical      TEXT,
    camelot          TEXT,
    genre            TEXT,
    energy           REAL,
    danceability     REAL,
    waveform_4stem   BLOB,
    analyzed_at      TEXT DEFAULT (datetime('now')),
    analyzer_version TEXT DEFAULT '1.0',
    duration_ms      INTEGER,
    PRIMARY KEY (content_id, source)
)
```

Add 5 methods to `StateDB` class — follow the exact same pattern as existing methods (use `text()`, named params, `conn.commit()`):

1. `save_analysis(self, content_id, source, status="pending", file_path="", bpm=None, key_musical=None, camelot=None, genre=None, energy=None, danceability=None, waveform_4stem=None, analyzer_version="1.0", duration_ms=None, error_message=None)` — INSERT OR REPLACE into analysis_cache
2. `get_analysis(self, content_id, source) -> dict | None` — SELECT * and return `dict(row._mapping)` or None
3. `unanalyzed_ids(self, source) -> set[str]` — SELECT content_id WHERE status IN ('pending', 'failed', 'failed_demucs', 'failed_essentia')
4. `update_analysis_status(self, content_id, source, status, error_message=None)` — UPDATE status and error_message
5. `analysis_counts(self, source) -> dict` — GROUP BY status with total count

Use the EXACT code from `docs/superpowers/plans/2026-03-27-mixmind-stem-analysis.md` Tasks 1 Step 3.

**Part B — Tests:**

Create `apps/mixmind/sidecar/tests/test_state.py` (or append if it exists) with 5 tests using `tmp_path` fixture: `test_save_analysis`, `test_get_analysis_missing`, `test_unanalyzed_ids`, `test_update_analysis_status`, `test_analysis_count`. Use the EXACT test code from the implementation plan Task 1 Step 1.

**Part C — Dependencies:**

Append to `apps/mixmind/sidecar/requirements.txt`:
```
numpy>=1.24.0,<2.0.0
demucs>=4.0.0
essentia>=2.1b6
msgpack>=1.0.0
torch>=2.0.0,<3.0.0
```

Then run: `cd apps/mixmind/sidecar && source venv/bin/activate && pip install -r requirements.txt`

If essentia fails on ARM64 macOS, try: `brew install fftw libyaml libsamplerate` then retry pip install.
  </action>
  <verify>
1. `cd apps/mixmind/sidecar && source venv/bin/activate && pytest tests/test_state.py -v -k "analysis"` — 5 tests pass
2. `python -c "import demucs; import essentia; import msgpack; import torch; print('All imports OK')"` — prints success
3. `grep "analysis_cache" apps/mixmind/sidecar/state.py` — table creation present
4. `grep "save_analysis\|get_analysis\|unanalyzed_ids\|update_analysis_status\|analysis_counts" apps/mixmind/sidecar/state.py` — all 5 methods present
  </verify>
  <done>
analysis_cache table created in state.db on init. All 5 CRUD methods work (5 tests pass). numpy, demucs, essentia, msgpack, torch installed and importable.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create analyzer.py — Demucs + Essentia pipeline with batch runner</name>
  <files>
    apps/mixmind/sidecar/analyzer.py
    apps/mixmind/sidecar/tests/test_analyzer.py
  </files>
  <action>
Create `apps/mixmind/sidecar/analyzer.py` with the EXACT code from `docs/superpowers/plans/2026-03-27-mixmind-stem-analysis.md` Task 3 Step 3. The file contains:

1. **`stems_to_waveform(stems, sr, n_columns=800)`** — Converts 4 Demucs stem numpy arrays to list of 800 column dicts. Each stem normalized independently to 0-255 via RMS in windows. Handles silent stems (zero audio) by returning 0s (divides by max_rms=1.0 when all zeros).

2. **`_run_demucs(file_path)`** — Lazy-imports torch/torchaudio/demucs. Loads `htdemucs` model. Uses MPS on Apple Silicon (`torch.backends.mps.is_available()`). Loads audio via torchaudio, applies model, extracts 4 mono stems from `model.sources` order (drums, bass, other, vocals). Returns dict of stem name -> float32 numpy array.

3. **`_run_essentia(file_path)`** — Lazy-imports `essentia.standard`. Uses MonoLoader, RhythmExtractor2013 for BPM, KeyExtractor for key (appends 'm' for minor), RMS for energy (normalized by /0.2 capped at 1.0), Danceability extractor. Genre via `_classify_genre` (spectral centroid heuristic fallback). Calls `musical_key_to_camelot` from camelot.py.

4. **`_classify_genre(audio)`** — SpectralCentroidTime heuristic: <1500=Ambient, <2500=House, <3500=Techno, else D&B. Returns "" on failure.

5. **`analyze_track(file_path, content_id, source, db)`** — Full pipeline: pre-checks (file exists, 1GB disk space), sets status to "analyzing", runs Demucs (catches failures independently), runs Essentia (catches failures independently), determines composite status (complete/failed_demucs/failed_essentia/failed), saves to DB via `db.save_analysis()`, cleans TMP_DIR in finally block. Returns result dict.

6. **`BatchStatus` dataclass** — Fields: total, analyzed, failed, in_progress, current_track, current_index, avg_sec_per_track, failures list. Properties: pending, eta_sec. Method: to_dict() (caps failures at last 20).

7. **`AnalysisBatchRunner` class** — init with db. `start(tracks)` launches daemon Thread. `cancel()` sets Event. `_run(tracks)` iterates tracks, checks cancel between each, calls analyze_track, updates status/failures/avg timing.

Key imports: `from camelot import musical_key_to_camelot`. Heavy deps (torch, demucs, essentia) lazy-imported inside functions.

Constants: `TMP_DIR = Path.home() / ".mixmind" / "tmp"`, `ANALYZER_VERSION = "1.0"`

Create `apps/mixmind/sidecar/tests/test_analyzer.py` with 3 tests from the implementation plan Task 3 Step 1:
- `test_stems_to_waveform_shape` — random 10s stems, verify 800 columns, correct keys
- `test_stems_to_waveform_range` — known-amplitude stems, all values 0-255
- `test_stems_to_waveform_silent_stem` — all-zero stems produce all-zero output
  </action>
  <verify>
1. `cd apps/mixmind/sidecar && source venv/bin/activate && pytest tests/test_analyzer.py -v -k "stems_to_waveform"` — 3 tests pass
2. `python -c "from analyzer import stems_to_waveform, analyze_track, AnalysisBatchRunner; print('Imports OK')"` — succeeds
3. `grep "def stems_to_waveform\|def _run_demucs\|def _run_essentia\|def analyze_track\|class AnalysisBatchRunner" apps/mixmind/sidecar/analyzer.py` — all 5 definitions present
4. `grep "from camelot import" apps/mixmind/sidecar/analyzer.py` — camelot import present
  </verify>
  <done>
analyzer.py created with stems_to_waveform (tested), _run_demucs, _run_essentia, analyze_track, and AnalysisBatchRunner. 3 unit tests pass for waveform conversion. Heavy ML imports are lazy-loaded to avoid startup cost.
  </done>
</task>

<task type="checkpoint:human-verify" gate="informational">
  <name>Task 3: Verify stem analysis foundation</name>
  <files>
    apps/mixmind/sidecar/state.py
    apps/mixmind/sidecar/analyzer.py
  </files>
  <action>
Verify the stem analysis pipeline foundation is complete and all tests pass.
  </action>
  <what-built>
MixMind stem analysis foundation:
- analysis_cache SQLite table with 5 CRUD methods in state.py
- ML dependencies installed (demucs, essentia, torch, numpy, msgpack)
- analyzer.py with full Demucs + Essentia pipeline, stems_to_waveform conversion, and AnalysisBatchRunner
- 8 passing unit tests (5 for DB CRUD, 3 for waveform conversion)
  </what-built>
  <how-to-verify>
1. Run full test suite: `cd apps/mixmind/sidecar && source venv/bin/activate && pytest tests/ -v`
2. Verify imports: `python -c "from analyzer import stems_to_waveform, analyze_track, AnalysisBatchRunner; from state import StateDB; print('All OK')"`
3. Verify table creation: `python -c "from state import StateDB; from pathlib import Path; db = StateDB(Path('/tmp/test_mixmind.db')); print(db.analysis_counts('db')); db.close()"`
4. [NEXT SESSION] Wire up analyze_routes.py (API endpoints), enhance library.py /anlz endpoint, and add frontend 4-stem rendering — these are Tasks 4-8 in the full implementation plan.
  </how-to-verify>
  <verify>All 8 tests pass, all imports succeed</verify>
  <done>Pipeline foundation verified and ready for API routes + frontend integration</done>
  <resume-signal>Type "approved" or describe issues. Next phase: API routes + frontend rendering.</resume-signal>
</task>

</tasks>

<verification>
- `pytest tests/test_state.py -v -k "analysis"` — 5 pass
- `pytest tests/test_analyzer.py -v -k "stems_to_waveform"` — 3 pass
- `python -c "import demucs; import essentia; import msgpack; import torch; import numpy; print('deps OK')"` — success
- `grep -c "def save_analysis\|def get_analysis\|def unanalyzed_ids\|def update_analysis_status\|def analysis_counts" apps/mixmind/sidecar/state.py` — returns 5
</verification>

<success_criteria>
- analysis_cache table auto-created in state.db with 15-column schema
- 5 StateDB CRUD methods functional (save, get, unanalyzed, update status, counts)
- analyzer.py exists with stems_to_waveform, _run_demucs, _run_essentia, analyze_track, AnalysisBatchRunner
- stems_to_waveform produces correct output shape (800 columns x 4 stems x 0-255 range)
- All ML dependencies installed and importable
- 8 unit tests passing
</success_criteria>

<output>
After completion, create `.planning/quick/246-implement-mixmind-stem-analysis-pipeline/246-SUMMARY.md`
</output>
