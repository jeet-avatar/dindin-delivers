---
phase: quick-235
plan: 01
subsystem: mixmind-sidecar
tags: [bug-fix, anlz-parser, waveform, pyrekordbox]
dependency_graph:
  requires: []
  provides: [waveform-preview-data]
  affects: [anlz_parser.py, sidecar-binary, mixmind-dmg]
tech_stack:
  patterns: [isinstance-tuple-guard, int8-to-uint8-scaling]
key_files:
  modified:
    - apps/mixmind/sidecar/anlz_parser.py
decisions:
  - "Scale int8 values 0-31 by factor of 8 (not 255/31) to map to 0-248 display range — simpler and visually equivalent"
  - "3-band waveform tuple: return None rather than guessing band decomposition — safer than potentially corrupted data"
metrics:
  duration: ~12min
  completed: 2026-03-26
  tasks_completed: 2
  files_modified: 1
---

# Quick-235: Fix MixMind Waveform Preview Tuple Parsing

**One-liner:** Fixed pyrekordbox tuple return (`(amplitude_ndarray, color_ndarray)`) in `_parse_waveform_preview` with int8 0-31 scaling to 0-248 display range, rebuilt sidecar + DMG.

## What Was Done

### Task 1: anlz_parser.py — Tuple Branch Added

`_parse_waveform_preview` (`anlz_parser.py:163`) now handles pyrekordbox returning `wf_preview` as a 2-tuple before the existing ndarray path:

```python
if isinstance(wf_tag, tuple) and len(wf_tag) >= 1:
    raw = wf_tag[0]
    if hasattr(raw, "tolist"):
        return [min(255, max(0, int(v) * 8)) for v in raw.tolist()]
    return []
```

`_parse_waveform_3band` (`anlz_parser.py:227`) also gets a tuple guard — returns `None` since 3-band decomposition from a flat ndarray is ambiguous.

Unit test confirmed: mock tuple with 10 int8 entries returns correctly scaled ints (5→40, 25→200, 31→248).

### Task 2: Sidecar + DMG Rebuilt

- PyInstaller binary rebuilt: `apps/mixmind/sidecar/dist/mixmind-sidecar/mixmind-sidecar` (14MB, arm64)
- Electron DMG rebuilt: `MixMind-1.0.0-arm64.dmg` (125MB)
- S3 upload: `s3://beatmind-frontend/MixMind-mac.dmg` (2026-03-26 20:05)
- CloudFront invalidation: `I9RPPIDDVG5DODTM2NK2K5XBNY`
- Download URL: `https://www.beatmind.io/MixMind-mac.dmg`

## Verification

- `isinstance(wf_tag, tuple)` at `anlz_parser.py:163` (wf_preview) and `anlz_parser.py:227` (3-band)
- Unit test: 10-entry mock tuple → 10 scaled ints, all assertions pass
- Sidecar binary: `-rwxr-xr-x 14M` at `dist/mixmind-sidecar/mixmind-sidecar`
- DMG on S3: `2026-03-26 20:05:43  131114192 MixMind-mac.dmg`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `18bfae94` | fix(quick-235): handle tuple return from pyrekordbox in waveform preview parsing |
| Task 2 | `de6a45ef` | chore(quick-235): rebuild sidecar binary and upload MixMind DMG to S3 |

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint

**Type:** `checkpoint:human-verify`

Now that the binary and DMG are rebuilt, verify waveform data works:

1. Start the sidecar: `apps/mixmind/sidecar/dist/mixmind-sidecar/mixmind-sidecar`
2. In another terminal, pick a track ID and hit:
   ```
   curl -s http://localhost:11337/api/tracks/{track_id}/anlz | python3 -m json.tool | grep -A3 waveform_preview
   ```
3. Confirm `waveform_preview` has ~400 entries with values 0-255 (was `[]` before fix).
4. Open MixMind.app from the new DMG (`https://www.beatmind.io/MixMind-mac.dmg`) and verify the waveform strip renders visually.

## Self-Check: PASSED

- `anlz_parser.py:163` — `isinstance(wf_tag, tuple)` confirmed present
- `anlz_parser.py:227` — second `isinstance(wf_tag, tuple)` confirmed present
- Commit `18bfae94` exists in git log
- Commit `de6a45ef` exists in git log
- S3 object `MixMind-mac.dmg` updated 2026-03-26
