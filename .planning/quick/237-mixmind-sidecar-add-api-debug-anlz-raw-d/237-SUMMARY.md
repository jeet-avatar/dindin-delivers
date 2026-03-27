---
phase: quick-237
plan: "01"
subsystem: mixmind-sidecar
tags: [mixmind, audio, streaming, debug, anlz, pioneer, pyrekordbox]
dependency_graph:
  requires: []
  provides: [audio-range-streaming, anlz-raw-diagnostic]
  affects: [apps/mixmind/sidecar/audio_routes.py, apps/mixmind/sidecar/debug_routes.py, apps/mixmind/sidecar/main.py]
tech_stack:
  added: []
  patterns: [HTTP-206-partial-content, fastapi-head-handler, pyrekordbox-anlz-inspection]
key_files:
  created:
    - apps/mixmind/sidecar/debug_routes.py
  modified:
    - apps/mixmind/sidecar/audio_routes.py
    - apps/mixmind/sidecar/main.py
decisions:
  - Shared _validate_audio_path() helper DRYs path/ext validation across HEAD and GET handlers
  - Malformed Range header falls back to full 200 FileResponse rather than returning 400
  - debug_routes.py inspects candidates in try/except per-field so it never crashes on unknown pyrekordbox shapes
metrics:
  duration: 82s
  completed: "2026-03-27"
  tasks_completed: 3
  files_changed: 3
---

# Phase quick-237 Plan 01: MixMind Sidecar — Audio Range Streaming + ANLZ Debug Endpoint Summary

**One-liner:** Range-aware HTTP 206 audio streaming + ANLZ .EXT raw diagnostic endpoint to unblock 3-band waveform parsing.

## What Was Built

### Task 1 — HEAD + HTTP 206 Range streaming (audio_routes.py)

Replaced the single `@router.get` with three components:
- `_validate_audio_path()` helper — shared path existence and extension check, returns `(Path, media_type)`
- `@router.head("/audio/stream")` — returns `Accept-Ranges: bytes`, `Content-Length`, `Content-Type` with no body (Electron's `<audio>` element sends HEAD before playback)
- `@router.get("/audio/stream")` — reads the `Range` request header; if absent returns full `FileResponse` (200); if present parses `bytes=start-end` / `bytes=start-`, reads the exact byte slice, returns `Response(status_code=206)` with `Content-Range` + `Content-Length` headers

### Task 2 — /api/debug/anlz-raw diagnostic endpoint (debug_routes.py)

New file. Single endpoint: `GET /api/debug/anlz-raw?path=<analysis_data_path>`

Uses `_resolve_anlz_paths()` from `anlz_parser` to locate .EXT file. Parses it with `AnlzFile.parse_file`. Returns:
```json
{
  "ext_exists": true,
  "ext_path": "/…/ANLZ0000.EXT",
  "dat_exists": true,
  "dat_path": "/…/ANLZ0000.DAT",
  "tag_names": ["PWV5", "PSSI", "…"],
  "waveform_tags": {
    "wf_color_preview": {
      "found": false, "python_type": null, "is_tuple": false,
      "tuple_len": null, "tuple_element_types": null,
      "element_shape": null, "element_dtype": null,
      "element_len": null, "first_5_values": null, "error": null
    },
    "wf_color": { "…": "…" },
    "PWV5": {
      "found": true, "python_type": "tuple", "is_tuple": true,
      "tuple_len": 2, "tuple_element_types": ["ndarray", "ndarray"],
      "element_shape": "(1626,)", "element_dtype": "uint8",
      "element_len": 1626, "first_5_values": [12, 0, 45, 0, 100], "error": null
    }
  }
}
```
All per-candidate logic wrapped in try/except so it never crashes on unexpected shapes.

### Task 3 — debug_router registered in main.py

Added `from debug_routes import router as debug_router` and `app.include_router(debug_router)`.

## Verification

All three grep checks pass:

```
# audio_routes.py: HEAD route, 206, Content-Range
@router.head("/audio/stream")  ← line 33
status_code=206                ← line 100
Content-Range: f"bytes …"      ← line 103

# debug_routes.py: endpoint, candidates, diagnostic fields
@router.get("/debug/anlz-raw") ← line 78
wf_color_preview               ← line 18
first_5_values                 ← lines 32, 73

# main.py: both import and include_router
from debug_routes import router as debug_router  ← line 20
app.include_router(debug_router)                 ← line 50
```

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 35fec73a | feat(quick-237): add HEAD handler and HTTP 206 Range streaming to /api/audio/stream |
| 2 | 67f7ed69 | feat(quick-237): create /api/debug/anlz-raw diagnostic endpoint |
| 3 | ec2fc863 | feat(quick-237): register debug_router in main.py |

## Self-Check: PASSED

- [x] `apps/mixmind/sidecar/audio_routes.py` exists and contains HEAD route + 206 logic
- [x] `apps/mixmind/sidecar/debug_routes.py` exists with `/debug/anlz-raw` endpoint
- [x] `apps/mixmind/sidecar/main.py` imports and registers debug_router
- [x] All 3 commits present in git log
