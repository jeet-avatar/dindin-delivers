---
phase: quick-237
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/sidecar/audio_routes.py
  - apps/mixmind/sidecar/debug_routes.py
  - apps/mixmind/sidecar/main.py
autonomous: true
requirements: [Q-237]
must_haves:
  truths:
    - "HEAD /api/audio/stream returns 200 with Content-Length, no 405"
    - "GET /api/audio/stream with Range header returns 206 Partial Content with correct bytes"
    - "GET /api/debug/anlz-raw?path=<path> returns JSON with tag names and wf_color_preview/wf_color/PWV5 type/shape/len/first-5 diagnostic"
  artifacts:
    - path: "apps/mixmind/sidecar/audio_routes.py"
      provides: "Range-aware streaming + HEAD support"
    - path: "apps/mixmind/sidecar/debug_routes.py"
      provides: "ANLZ raw diagnostic endpoint"
    - path: "apps/mixmind/sidecar/main.py"
      provides: "debug_router registered"
  key_links:
    - from: "apps/mixmind/sidecar/main.py"
      to: "apps/mixmind/sidecar/debug_routes.py"
      via: "app.include_router(debug_router)"
      pattern: "include_router.*debug"
---

<objective>
Fix two Electron audio playback bugs and add a 3-band waveform diagnostic endpoint.

Purpose:
  1. Electron's <audio> element sends HEAD before playback to get Content-Length — currently
     returns 405. Seeking sends Range headers — currently ignored, causing full re-download per seek.
  2. `_parse_waveform_3band` always returns None because the pyrekordbox tuple shape is unknown.
     A raw diagnostic endpoint lets us see the real structure on a real library without guessing.

Output:
  - audio_routes.py: HEAD handler + Range-aware streaming (HTTP 206)
  - debug_routes.py: new GET /api/debug/anlz-raw diagnostic endpoint
  - main.py: debug_router registered
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/mixmind/sidecar/audio_routes.py
@apps/mixmind/sidecar/anlz_parser.py
@apps/mixmind/sidecar/main.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add HEAD support and HTTP 206 Range streaming to /api/audio/stream</name>
  <files>apps/mixmind/sidecar/audio_routes.py</files>
  <action>
Replace the current `audio_routes.py` entirely with a Range-aware implementation.

Key requirements:
- Keep existing `_ALLOWED_EXTS` set and path validation (404 / 403) logic unchanged.
- Add a `@router.head("/audio/stream")` handler that returns status 200 with headers:
  `Accept-Ranges: bytes`, `Content-Length: <file_size>`, `Content-Type: <media_type>`.
  No body. FastAPI HEAD responses must NOT include a body — return a plain `Response(status_code=200, headers={...})`.
- Replace the existing `@router.get("/audio/stream")` handler with a Range-aware version.
  Read the `Range` request header via `Request` parameter (import `Request` from fastapi).
  Parse `Range: bytes=start-end` (also handle `bytes=start-` with no end).
  If no Range header present: return `FileResponse` with `Accept-Ranges: bytes` (same as before — full 200).
  If Range header present:
    - Open the file, seek to `start`, read `(end - start + 1)` bytes.
    - Return a `Response` with:
        - `status_code=206`
        - `media_type` from mimetypes
        - Headers:
            `Content-Range: bytes {start}-{end}/{total}`
            `Accept-Ranges: bytes`
            `Content-Length: {length}`
    - `content` = the read bytes.
  Handle malformed Range headers gracefully by falling back to full FileResponse.

Use only stdlib + fastapi — no new pip dependencies.
Imports needed: `Request`, `Response` from fastapi; `os` for `os.path.getsize`.
  </action>
  <verify>
Run the rebuilt sidecar binary is not required for quick verification.
Verify by static inspection: grep the file for the HEAD route and 206 return:
  grep -n "router.head\|206\|Content-Range\|Range" apps/mixmind/sidecar/audio_routes.py
Expected: lines showing `@router.head`, `status_code=206`, `Content-Range`, and Range header parsing.
  </verify>
  <done>
HEAD route defined. GET route parses Range header and returns 206 with Content-Range on range requests, 200 FileResponse on no-range requests. File validates path/ext before either path.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create /api/debug/anlz-raw diagnostic endpoint</name>
  <files>apps/mixmind/sidecar/debug_routes.py</files>
  <action>
Create a new file `apps/mixmind/sidecar/debug_routes.py` with a single GET endpoint:
  GET /api/debug/anlz-raw?path=<analysis_data_path>

The `path` query param is a Rekordbox AnalysisDataPath string, e.g.
`/PIONEER/USBANLZ/7f3a/0001/ANLZ0000.DAT`.

Implementation:

1. Resolve paths using the same logic as `anlz_parser._resolve_anlz_paths` — import and call it directly:
   `from anlz_parser import _resolve_anlz_paths`

2. Parse the .EXT file (if present) with `AnlzFile.parse_file` from pyrekordbox.
   `from pyrekordbox.anlz import AnlzFile`

3. Build response dict:
```python
{
  "ext_exists": bool,
  "ext_path": str | None,
  "dat_exists": bool,
  "dat_path": str,
  "tag_names": list[str],         # [t.name for t in ext_file.tags] or []
  "waveform_tags": {              # one entry per candidate name
    "<candidate>": {              # candidates: wf_color_preview, wf_color, PWV5
      "found": bool,
      "python_type": str,         # type(raw).__name__
      "is_tuple": bool,
      "tuple_len": int | None,    # len(raw) if tuple
      "tuple_element_types": list[str] | None,  # [type(x).__name__ for x in raw] if tuple
      "element_shape": str | None,    # str(raw[0].shape) if ndarray
      "element_dtype": str | None,    # str(raw[0].dtype) if ndarray
      "element_len": int | None,      # len(raw[0]) if tuple and has len
      "first_5_values": list | None,  # raw[0].tolist()[:5] if ndarray else None
      "error": str | None,
    }
  }
}
```

For each candidate (`wf_color_preview`, `wf_color`, `PWV5`):
- Call `ext_file.get(candidate)` in a try/except.
- If result is None: `found=False`, rest None.
- If result is a tuple:
  - `is_tuple=True`, `tuple_len=len(result)`
  - `tuple_element_types=[type(x).__name__ for x in result]`
  - For `result[0]`: if has `.shape` → `element_shape=str(result[0].shape)`, `element_dtype=str(result[0].dtype)`, `element_len=len(result[0])`, `first_5_values=result[0].tolist()[:5]`
- If result has `.shape` directly (ndarray): fill shape/dtype/len/first_5 directly.
- Wrap all per-candidate logic in try/except, store exception str in `error`.

Return `JSONResponse(content=result_dict)`.

If .EXT does not exist, return early with `ext_exists=False` and empty `waveform_tags`.

Router prefix: `/api`, no auth required.
  </action>
  <verify>
grep -n "debug_routes\|anlz-raw\|wf_color_preview\|tuple_len\|first_5" apps/mixmind/sidecar/debug_routes.py
Expected: endpoint definition, all three candidate names, tuple_len key, first_5_values key.
  </verify>
  <done>
`debug_routes.py` exists. Endpoint defined at `/api/debug/anlz-raw`. Returns structured JSON with tag_names, and per-candidate type/shape/len/first_5_values diagnostics. All wrapped in try/except so it never crashes on unexpected shapes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Register debug_router in main.py</name>
  <files>apps/mixmind/sidecar/main.py</files>
  <action>
Edit `apps/mixmind/sidecar/main.py`:

1. Add import after the existing router imports:
   `from debug_routes import router as debug_router`

2. Add after `app.include_router(audio_router)`:
   `app.include_router(debug_router)`

No other changes to main.py.
  </action>
  <verify>
grep -n "debug_router" apps/mixmind/sidecar/main.py
Expected: import line and include_router line both present.
  </verify>
  <done>
`debug_router` imported and registered. `/api/debug/anlz-raw` is reachable when sidecar runs.
  </done>
</task>

</tasks>

<verification>
After all tasks:
1. grep -n "router.head\|status_code=206\|Content-Range" apps/mixmind/sidecar/audio_routes.py
   — must show HEAD route, 206 status, Content-Range header construction
2. grep -n "anlz-raw\|wf_color_preview\|first_5_values" apps/mixmind/sidecar/debug_routes.py
   — must show endpoint + all diagnostic fields
3. grep -n "debug_router" apps/mixmind/sidecar/main.py
   — must show both import and include_router lines
</verification>

<success_criteria>
- HEAD /api/audio/stream: defined, returns Content-Length without body
- GET /api/audio/stream with Range header: returns 206 with Content-Range, correct byte slice
- GET /api/debug/anlz-raw: returns JSON exposing tag_names, wf_color_preview/wf_color/PWV5 python_type, is_tuple, tuple_len, element_shape, element_dtype, element_len, first_5_values
- main.py registers debug_router
</success_criteria>

<output>
After completion, create `.planning/quick/237-mixmind-sidecar-add-api-debug-anlz-raw-d/237-SUMMARY.md`
</output>
