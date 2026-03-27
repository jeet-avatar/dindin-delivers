---
phase: quick-235
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mixmind/sidecar/anlz_parser.py
autonomous: true
requirements: [Q-235]
must_haves:
  truths:
    - "waveform_preview returns >0 amplitude entries for any track with a .DAT ANLZ file"
    - "3-band waveform (wf_color_preview) is also fixed if it returns tuple structure"
    - "Sidecar binary and DMG are rebuilt and uploaded to S3"
  artifacts:
    - path: "apps/mixmind/sidecar/anlz_parser.py"
      provides: "Tuple-aware waveform preview parsing"
      contains: "isinstance(wf_tag, tuple)"
  key_links:
    - from: "anlz_parser.py:_parse_waveform_preview"
      to: "wf_tag[0] ndarray"
      via: "isinstance(wf_tag, tuple) branch → scale int8 0-31 to 0-255"
      pattern: "isinstance.*tuple"
---

<objective>
Fix MixMind waveform preview returning empty for all 8213 tracks. `pyrekordbox` returns `wf_preview` as a 2-tuple `(amplitude_array, color_hint_array)` — current code only handles ndarray directly or tag objects, so it falls through to the warning and returns `[]`. After the code fix, rebuild the sidecar binary and the Electron DMG.

Purpose: Waveform display is core to MixMind's value — every track shows a flat line right now.
Output: Fixed `anlz_parser.py`, rebuilt sidecar binary, rebuilt + uploaded DMG.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix tuple parsing in _parse_waveform_preview and _parse_waveform_3band</name>
  <files>apps/mixmind/sidecar/anlz_parser.py</files>
  <action>
In `_parse_waveform_preview` (line 150), add a `isinstance(wf_tag, tuple)` branch BEFORE the existing `hasattr(wf_tag, "tolist")` check:

```python
# pyrekordbox returns wf_preview as a 2-tuple:
#   wf_tag[0] = amplitude ndarray (dtype=int8, values 0-31, ~400 entries)
#   wf_tag[1] = color hint ndarray (dtype=int8, values 0-5) — unused
if isinstance(wf_tag, tuple) and len(wf_tag) >= 1:
    raw = wf_tag[0]
    if hasattr(raw, "tolist"):
        # Scale from Pioneer int8 range 0-31 to display range 0-255
        return [min(255, max(0, int(v) * 8)) for v in raw.tolist()]
    return []
```

Insert this block at line 161, immediately after the `if wf_tag is None: return []` check.

For `_parse_waveform_3band` (line 186), after the `wf_tag is None` guard, add a tuple check before the `for attr in (...)` loop:

```python
# Handle tuple return from pyrekordbox (same pattern as wf_preview)
if isinstance(wf_tag, tuple):
    wf_tag = wf_tag[0]  # take the first array; 3-band may not apply, log and return None
    if not hasattr(wf_tag, "tolist"):
        logger.debug("3-band waveform: tuple[0] is not ndarray, skipping")
        return None
    # 3-band from a plain ndarray is ambiguous — skip rather than corrupt
    logger.debug("3-band waveform returned as tuple, cannot decompose into low/mid/high bands")
    return None
```

Insert this block at line 215, immediately after `if wf_tag is None: return None`.

These are the ONLY changes needed. Do not modify anything else.
  </action>
  <verify>
```bash
grep -n "isinstance(wf_tag, tuple)" apps/mixmind/sidecar/anlz_parser.py
```
Must show 2 matches — one in `_parse_waveform_preview`, one in `_parse_waveform_3band`.

```bash
cd /Users/jeet/doordash-p2p/apps/mixmind/sidecar && source venv/bin/activate && python -c "
from anlz_parser import _parse_waveform_preview
import numpy as np

# Simulate the pyrekordbox tuple structure
mock_amp = np.array([5, 10, 15, 20, 25, 31, 28, 22, 18, 12], dtype='int8')
mock_color = np.array([0, 1, 2, 3, 0, 1, 2, 3, 0, 1], dtype='int8')
mock_tuple = (mock_amp, mock_color)

class MockDat:
    def get(self, key):
        return mock_tuple

result = _parse_waveform_preview(MockDat())
print('Result:', result)
assert len(result) == 10, f'Expected 10, got {len(result)}'
assert result[0] == 40, f'Expected 40 (5*8), got {result[0]}'
assert result[4] == 200, f'Expected 200 (25*8), got {result[4]}'
assert result[5] == 248, f'Expected 248 (31*8), got {result[5]}'
print('All assertions passed')
"
```
  </verify>
  <done>
`isinstance(wf_tag, tuple)` present in both functions. Unit test passes: mock tuple with 10 entries returns 10 scaled ints where value 5 maps to 40, value 31 maps to 248 (capped at 255).
  </done>
</task>

<task type="auto">
  <name>Task 2: Rebuild sidecar binary and Electron DMG</name>
  <files>apps/mixmind/sidecar/dist/mixmind-sidecar (binary)</files>
  <action>
Run the sidecar PyInstaller build, then the full Electron + DMG rebuild + S3 upload:

```bash
cd /Users/jeet/doordash-p2p/apps/mixmind/sidecar
source venv/bin/activate
rm -rf build dist
pyinstaller mixmind-sidecar.spec --noconfirm
```

Wait for PyInstaller to complete. Verify the binary exists:
```bash
ls -lh /Users/jeet/doordash-p2p/apps/mixmind/sidecar/dist/mixmind-sidecar
```

Then rebuild Electron DMG and upload to S3:
```bash
cd /Users/jeet/doordash-p2p/apps/mixmind
bash rebuild-electron.sh
```

This script handles: npm install, electron-builder DMG build, S3 upload, and latest.yml update.
  </action>
  <verify>
```bash
# Sidecar binary exists and is executable
ls -lh /Users/jeet/doordash-p2p/apps/mixmind/sidecar/dist/mixmind-sidecar

# DMG was uploaded — check rebuild-electron.sh output for S3 upload confirmation line
# or check S3 directly:
aws s3 ls s3://mixmind-releases/ --region us-east-1 | sort | tail -5
```
  </verify>
  <done>
Sidecar binary exists at `apps/mixmind/sidecar/dist/mixmind-sidecar`. DMG uploaded to S3 (confirmed by `aws s3 ls` output showing new `.dmg` file with today's timestamp).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Fixed tuple parsing in anlz_parser.py (both wf_preview and wf_color_preview), rebuilt sidecar binary, rebuilt and uploaded DMG to S3.
  </what-built>
  <how-to-verify>
1. Start the sidecar binary directly: `/Users/jeet/doordash-p2p/apps/mixmind/sidecar/dist/mixmind-sidecar`
2. In another terminal, pick any track ID from your Rekordbox library and hit the ANLZ endpoint:
   ```
   curl -s http://localhost:11337/api/tracks/{track_id}/anlz | python3 -m json.tool | grep -A3 waveform_preview
   ```
3. Confirm `waveform_preview` array has >0 entries (should be ~400) with values in range 0-255.
4. Open MixMind.app (from new DMG) and verify the waveform strip renders visually for a loaded track.
  </how-to-verify>
  <resume-signal>Type "approved" if waveform data is present, or describe what you see</resume-signal>
</task>

</tasks>

<verification>
- `isinstance(wf_tag, tuple)` appears in both `_parse_waveform_preview` and `_parse_waveform_3band`
- Unit test confirms scaling: int8 value 5 → 40, value 31 → 248
- Sidecar binary rebuilt from patched source
- DMG rebuilt and on S3
- Live curl to `/api/tracks/{id}/anlz` returns non-empty `waveform_preview`
</verification>

<success_criteria>
All 8213 tracks return waveform_preview with ~400 amplitude entries (0-255) instead of empty arrays. MixMind waveform strip renders visually in the app.
</success_criteria>

<output>
After completion, create `.planning/quick/235-fix-mixmind-wf-preview-tuple-parsing-and/235-SUMMARY.md`
</output>
