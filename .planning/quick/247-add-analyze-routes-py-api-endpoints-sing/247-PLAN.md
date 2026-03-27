---
phase: quick-247
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/sidecar/analyze_routes.py
  - apps/mixmind/sidecar/main.py
  - apps/mixmind/sidecar/library.py
autonomous: true
requirements: [Q-247]

must_haves:
  truths:
    - "POST /api/tracks/{id}/analyze returns analysis result or already_complete"
    - "POST /api/analyze/batch starts background batch processing"
    - "DELETE /api/analyze/batch cancels running batch"
    - "GET /api/analyze/status returns batch progress dict"
    - "GET /api/tracks/{id}/anlz returns 200 with 4-stem+essentia when analysis_cache has data but Rekordbox ANLZ is absent"
    - "GET /api/tracks/{id}/anlz merges waveform_4stem+essentia into existing Rekordbox ANLZ response"
  artifacts:
    - path: "apps/mixmind/sidecar/analyze_routes.py"
      provides: "Analysis API routes"
      exports: ["router"]
    - path: "apps/mixmind/sidecar/main.py"
      provides: "Router registration for analyze_routes"
      contains: "analyze_router"
    - path: "apps/mixmind/sidecar/library.py"
      provides: "Enhanced /anlz endpoint with analysis_cache fallback"
      contains: "_enrich_with_analysis"
  key_links:
    - from: "apps/mixmind/sidecar/analyze_routes.py"
      to: "apps/mixmind/sidecar/analyzer.py"
      via: "import analyze_track, AnalysisBatchRunner"
      pattern: "from analyzer import"
    - from: "apps/mixmind/sidecar/analyze_routes.py"
      to: "apps/mixmind/sidecar/state.py"
      via: "StateDB for analysis persistence"
      pattern: "from state import StateDB"
    - from: "apps/mixmind/sidecar/main.py"
      to: "apps/mixmind/sidecar/analyze_routes.py"
      via: "app.include_router(analyze_router)"
      pattern: "include_router.*analyze"
    - from: "apps/mixmind/sidecar/library.py"
      to: "apps/mixmind/sidecar/state.py"
      via: "get_analysis for enrichment"
      pattern: "db\\.get_analysis"
---

<objective>
Create analyze_routes.py with 4 API endpoints (single/batch/cancel/status), register the router in main.py, and enhance the existing /api/tracks/{id}/anlz endpoint in library.py to return 4-stem waveform + essentia data from analysis_cache when available — including a 200 response when Rekordbox ANLZ is absent but analysis data exists.

Purpose: This wires up the analysis pipeline (Q-246 analyzer.py + state.py) to HTTP endpoints so the frontend can trigger and monitor analysis.
Output: analyze_routes.py, updated main.py, updated library.py
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/sidecar/main.py
@apps/mixmind/sidecar/library.py
@apps/mixmind/sidecar/analyzer.py
@apps/mixmind/sidecar/state.py
@apps/mixmind/sidecar/rekordbox.py
@docs/superpowers/specs/2026-03-27-mixmind-stem-analysis-design.md
@docs/superpowers/plans/2026-03-27-mixmind-stem-analysis.md (Tasks 4 and 5)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create analyze_routes.py + register router in main.py</name>
  <files>apps/mixmind/sidecar/analyze_routes.py, apps/mixmind/sidecar/main.py</files>
  <action>
Create `apps/mixmind/sidecar/analyze_routes.py` with EXACT code from implementation plan Task 4:

```python
"""Analysis API routes — single track, batch, cancel, status."""
from __future__ import annotations

from fastapi import APIRouter, Query

from analyzer import analyze_track, AnalysisBatchRunner
from rekordbox import try_load_library_db
from library import XML_PATH
from rekordbox import load_library_xml
from state import StateDB

router = APIRouter(prefix="/api")

_batch_runner: AnalysisBatchRunner | None = None


def _get_db() -> StateDB:
    return StateDB()


def _resolve_file_path(content_id: str) -> str | None:
    """Resolve content_id to audio file path from Rekordbox DB or XML."""
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if tracks:
        for t in tracks:
            if t.content_id == content_id and t.file_path:
                return t.file_path
    return None


@router.post("/tracks/{content_id}/analyze")
async def analyze_single(content_id: str, force: bool = Query(False)):
    db = _get_db()
    try:
        if not force:
            existing = db.get_analysis(content_id, "db")
            if existing and existing["status"] == "complete":
                return {"content_id": content_id, "status": "already_complete",
                        "message": "Use ?force=true to re-analyze"}

        file_path = _resolve_file_path(content_id)
        if not file_path:
            return {"content_id": content_id, "status": "failed",
                    "error": f"Cannot resolve file path for track {content_id}",
                    "stage": "pre-check"}

        result = analyze_track(file_path, content_id, "db", db)
        return result
    finally:
        db.close()


@router.post("/analyze/batch")
async def start_batch():
    global _batch_runner
    db = _get_db()

    if _batch_runner and _batch_runner.running:
        return {"status": "already_running", "progress": _batch_runner.status.to_dict()}

    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if not tracks:
        db.close()
        return {"status": "no_tracks", "total": 0}

    analyzed = set()
    for t in tracks:
        existing = db.get_analysis(t.content_id, t.source)
        if existing and existing["status"] == "complete":
            analyzed.add(t.content_id)

    pending = [
        {"content_id": t.content_id, "source": t.source,
         "file_path": t.file_path, "title": t.title, "artist": t.artist}
        for t in tracks
        if t.content_id not in analyzed and t.file_path
    ]

    if not pending:
        db.close()
        return {"status": "all_analyzed", "total": len(tracks)}

    _batch_runner = AnalysisBatchRunner(db)
    _batch_runner.start(pending)
    return {"status": "started", "total": len(pending)}


@router.delete("/analyze/batch")
async def cancel_batch():
    global _batch_runner
    if not _batch_runner or not _batch_runner.running:
        return {"status": "no_batch_running"}
    _batch_runner.cancel()
    return {"status": "cancelling"}


@router.get("/analyze/status")
async def batch_status():
    global _batch_runner
    if not _batch_runner:
        return {"total": 0, "analyzed": 0, "failed": 0, "pending": 0,
                "in_progress": False, "current_track": "", "current_index": 0,
                "eta_sec": 0, "avg_sec_per_track": 0, "failures": []}
    return _batch_runner.status.to_dict()
```

Then update `apps/mixmind/sidecar/main.py`:
- Add import at line 19 (after debug_routes): `from analyze_routes import router as analyze_router`
- Add registration at line 51 (after debug_router): `app.include_router(analyze_router)`

Follow the EXACT existing pattern in main.py for imports and registration.
  </action>
  <verify>
Run from sidecar directory:
```bash
cd apps/mixmind/sidecar && python -c "from analyze_routes import router; print('router OK, routes:', [r.path for r in router.routes])"
python -c "from main import app; routes = [r.path for r in app.routes]; assert '/api/tracks/{content_id}/analyze' in routes; assert '/api/analyze/batch' in routes; assert '/api/analyze/status' in routes; print('All 4 analyze routes registered')"
```
  </verify>
  <done>analyze_routes.py exists with 4 endpoints (POST /tracks/{id}/analyze, POST /analyze/batch, DELETE /analyze/batch, GET /analyze/status). Router registered in main.py. Python imports succeed without error.</done>
</task>

<task type="auto">
  <name>Task 2: Enhance /api/tracks/{id}/anlz to include 4-stem + essentia from analysis_cache</name>
  <files>apps/mixmind/sidecar/library.py</files>
  <action>
Modify `apps/mixmind/sidecar/library.py` following implementation plan Task 5:

1. Add helper function `_enrich_with_analysis` and `_get_analysis_db` ABOVE the `get_track_anlz` endpoint (after the `_DB_PATH` constant at line 146):

```python
def _get_analysis_db():
    """Get a StateDB instance for analysis cache lookups."""
    return StateDB()


def _enrich_with_analysis(data: dict, content_id: str) -> dict:
    """Add 4-stem waveform + essentia data from analysis_cache if available."""
    try:
        import msgpack
        db = _get_analysis_db()
        row = db.get_analysis(content_id, "db")
        db.close()
        if row and row["status"] in ("complete", "failed_demucs", "failed_essentia"):
            if row.get("waveform_4stem"):
                data["waveform_4stem"] = msgpack.unpackb(row["waveform_4stem"], raw=False)
            else:
                data["waveform_4stem"] = None

            if row.get("bpm"):
                data["essentia"] = {
                    "bpm": row["bpm"],
                    "key_musical": row["key_musical"],
                    "camelot": row["camelot"],
                    "genre": row["genre"],
                    "energy": row["energy"],
                    "danceability": row["danceability"],
                }
            else:
                data["essentia"] = None

            data["analyzer_version"] = row.get("analyzer_version")
    except Exception:
        data["waveform_4stem"] = None
        data["essentia"] = None
    return data
```

NOTE: msgpack is imported lazily INSIDE the function (not at module top) because it may not be installed yet.

2. Modify the `get_track_anlz` endpoint (line 149-192) to:
   - At the EXISTING success return (line 192 `return data`): call `_enrich_with_analysis(data, content_id)` before returning
   - Change the TWO places that raise `HTTPException(status_code=404)` (line 183 "No ANLZ data for this track" and line 188 "FileNotFoundError"):
     - Before raising 404, check analysis_cache. If analysis data exists, return 200 with analysis-only response:

```python
# Replace the 404 at line 182-183 with:
if row is None or not row.AnalysisDataPath:
    # No Rekordbox ANLZ — check if we have analysis_cache data
    fallback = {}
    fallback = _enrich_with_analysis(fallback, content_id)
    if fallback.get("waveform_4stem") or fallback.get("essentia"):
        return fallback
    raise HTTPException(status_code=404, detail="No ANLZ data for this track")
```

   - Similarly for the FileNotFoundError except block — check analysis_cache before raising 404

3. For the normal success path, change line 192 from `return data` to:
```python
return _enrich_with_analysis(data, content_id)
```

CRITICAL: The endpoint must return 200 when analysis_cache has results even if Rekordbox ANLZ is completely absent. Only return 404 when BOTH Rekordbox ANLZ and analysis_cache are empty.
  </action>
  <verify>
Run from sidecar directory:
```bash
cd apps/mixmind/sidecar && python -c "
from library import _enrich_with_analysis, _get_analysis_db
print('_enrich_with_analysis imported OK')
# Test with empty data — should not crash
result = _enrich_with_analysis({}, 'nonexistent')
print('enrichment with missing track:', result)
assert 'waveform_4stem' in result or result == {}
print('PASS: enrichment function works')
"
```

Also verify no syntax errors in the full module:
```bash
python -c "import library; print('library module loads OK')"
```
  </verify>
  <done>/api/tracks/{id}/anlz returns 200 with waveform_4stem + essentia fields when analysis_cache has data. Returns 404 ONLY when both Rekordbox ANLZ and analysis_cache are empty. Existing Rekordbox ANLZ responses are enriched with analysis data when available.</done>
</task>

</tasks>

<verification>
1. All 4 analyze endpoints registered in main.py app
2. `python -c "from main import app"` succeeds without import errors
3. `/api/tracks/{id}/anlz` endpoint has fallback to analysis_cache when Rekordbox ANLZ absent
4. `_enrich_with_analysis` correctly deserializes msgpack waveform blobs
5. No circular imports between analyze_routes.py and library.py
</verification>

<success_criteria>
- analyze_routes.py created with POST /tracks/{id}/analyze, POST /analyze/batch, DELETE /analyze/batch, GET /analyze/status
- Router registered in main.py following existing pattern (import + include_router)
- /api/tracks/{id}/anlz returns 200 with analysis data when Rekordbox ANLZ is absent but analysis_cache has results
- /api/tracks/{id}/anlz merges waveform_4stem + essentia into existing responses
- All Python imports succeed without errors
</success_criteria>

<output>
After completion, create `.planning/quick/247-add-analyze-routes-py-api-endpoints-sing/247-SUMMARY.md`
</output>
