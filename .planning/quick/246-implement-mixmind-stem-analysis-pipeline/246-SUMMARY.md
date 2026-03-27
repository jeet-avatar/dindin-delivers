---
phase: quick-246
plan: 01
subsystem: mixmind-sidecar
tags: [audio-analysis, demucs, essentia, stem-separation, waveform]
dependency-graph:
  requires: [camelot.py, state.py]
  provides: [analysis_cache-table, analyzer-pipeline, batch-runner]
  affects: [library.py, analyze_routes.py, DJWaveformView.tsx]
tech-stack:
  added: [demucs, essentia, msgpack, torch, numpy]
  patterns: [lazy-imports, background-thread-with-cancellation, rms-normalization]
key-files:
  created:
    - apps/mixmind/sidecar/analyzer.py
    - apps/mixmind/sidecar/tests/test_analyzer.py
  modified:
    - apps/mixmind/sidecar/state.py
    - apps/mixmind/sidecar/requirements.txt
    - apps/mixmind/sidecar/tests/test_state.py
decisions:
  - Lazy-import msgpack inside analyze_track to avoid ModuleNotFoundError before pip install
  - Keep numpy at top-level since already installed in venv
metrics:
  duration: 205s
  completed: 2026-03-27T22:09:00Z
  tasks: 2
  files: 5
---

# Quick Task 246: Implement MixMind Stem Analysis Pipeline Summary

MixMind 4-stem audio analysis foundation with Demucs separation, Essentia feature extraction, SQLite caching, and background batch runner.

## What Was Built

### analysis_cache table + 5 CRUD methods (state.py)
- 15-column SQLite table with composite PK (content_id, source)
- `save_analysis` — INSERT OR REPLACE with all analysis fields
- `get_analysis` — returns dict via `row._mapping` or None
- `unanalyzed_ids` — returns content_ids with pending/failed status
- `update_analysis_status` — status + error_message update
- `analysis_counts` — GROUP BY status with total

### analyzer.py — Full Pipeline
- `stems_to_waveform(stems, sr, n_columns=800)` — RMS-windowed normalization to 0-255 per stem
- `_run_demucs(file_path)` — htdemucs model, MPS acceleration on Apple Silicon, 4 mono stems
- `_run_essentia(file_path)` — BPM, key (with Camelot), genre heuristic, energy, danceability
- `_classify_genre(audio)` — spectral centroid heuristic fallback (Ambient/House/Techno/D&B)
- `analyze_track(file_path, content_id, source, db)` — full pipeline with independent Demucs/Essentia failure handling, pre-checks (file exists, 1GB disk), temp cleanup
- `BatchStatus` dataclass with pending/eta properties and to_dict()
- `AnalysisBatchRunner` — daemon thread with Event-based cancellation, rolling avg timing

### Dependencies (requirements.txt)
- numpy>=1.24.0, demucs>=4.0.0, essentia>=2.1b6, msgpack>=1.0.0, torch>=2.0.0

### Tests
- 5 tests for analysis_cache CRUD (test_state.py)
- 3 tests for stems_to_waveform (test_analyzer.py)
- All 8 passing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lazy-imported msgpack to fix ModuleNotFoundError**
- **Found during:** Task 2
- **Issue:** `import msgpack` at module top level caused ImportError since deps not yet pip-installed, blocking test collection for `test_analyzer.py`
- **Fix:** Moved `import msgpack` inside `analyze_track()` function where it's actually used. This matches the plan's pattern of lazy-importing heavy deps (torch, demucs, essentia) inside functions.
- **Files modified:** `apps/mixmind/sidecar/analyzer.py`
- **Commit:** 69a04430

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 03e4bd1b | analysis_cache table, 5 CRUD methods, ML deps in requirements.txt, 5 tests |
| 2 | 69a04430 | analyzer.py with full pipeline + batch runner, 3 tests |

## Next Steps

- Wire up `analyze_routes.py` (FastAPI endpoints for single/batch/cancel/status)
- Enhance `library.py` `/anlz` endpoint to serve 4-stem data
- Add 4-stem canvas rendering to `DJWaveformView.tsx`
- Run `pip install -r requirements.txt` to install demucs/essentia/msgpack/torch
