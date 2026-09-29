# Reference-Informed Mixing and Mastering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire BeatMind's existing reference-track workflow into its existing mastering pipeline (`mix_check`, `apply_master_chain`, `producer_profile`) so mastering targets and per-part/per-stem comparisons are driven by the producer's own reference track instead of fixed defaults, and close the test-coverage gap on the mastering modules.

**Architecture:** Extends four existing backend modules (`mix_check.py`, `sound_comparison.py`, `main.py`'s tool dispatcher, `claude_tools.py`) and adds two new ones (`mastering.py`, `bus_mastering.py`). No new native dependency, no new Bridge/OSC extension — everything reuses FFmpeg `ebur128` (already how loudness is measured) and existing tools (`set_track_mute`, `audition_scene`'s `capture_scene` Bridge operation).

**Tech Stack:** Python 3.12, FastAPI backend, FFmpeg (subprocess), NumPy/SciPy, unittest (existing test style — no pytest, no new test framework).

**Spec:** `docs/superpowers/specs/2026-09-28-mixing-mastering-module-design.md`

**Branch:** All file paths below are relative to `apps/ableton-chatbot/` and target `release/beatmind-launch-20260928`, not `main` — this repo's working folder stays on `main` intentionally; branch from the release branch for implementation. **Line numbers cited below are as of 2026-09-29 and were re-verified directly against that branch while writing this plan (not carried over from the spec) — re-verify again immediately before editing, this file moves fast (4+ commits/day).**

---

## Chunk 1: Extract `mastering.py`

`loudness()` and `band_shares()` exist today as plain functions inside `mix_check.py` (lines 19 and 41). Every later chunk needs to call them from a shared, non-`mix_check`-specific home — `sound_comparison.py` and the new `bus_mastering.py` shouldn't import from a module named `mix_check` to measure loudness. This chunk relocates them (behavior unchanged) and adds the one new function this whole plan hinges on: deriving a target from a reference track.

### Task 1.1: Create `mastering.py` with `loudness()` and `band_shares()` moved from `mix_check.py`

**Files:**
- Create: `backend/mastering.py`
- Create: `backend/tests/test_mastering.py`
- Modify: `backend/mix_check.py:1-49` (imports and the two function definitions)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_mastering.py
import tempfile
import unittest
from pathlib import Path

import numpy as np
from scipy.io import wavfile

import mastering


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class LoudnessTests(unittest.TestCase):
    def test_loudness_measures_a_known_tone(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'tone.wav'
            wavfile.write(path, 44100, tone(gain=0.5))
            lufs, peak = mastering.loudness(path)
            # A -6 dBFS-ish full-bandwidth sine reads roughly -9 to -15 LUFS integrated;
            # this just pins the function to a plausible, stable range, not an exact value.
            self.assertTrue(-20 < lufs < -5, lufs)
            self.assertTrue(-10 < peak < 0, peak)

    def test_band_shares_places_energy_in_the_right_band(self):
        samples = tone(frequency=3000, gain=0.5, seconds=1)
        bands = mastering.band_shares(samples)
        self.assertGreater(bands['harsh'], 80)
        self.assertLess(bands['low'], 5)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_mastering.py -v` (or `python -m unittest tests.test_mastering -v` — match whichever runner the other test files use; check `backend/tests/conftest.py` first)
Expected: FAIL with `ModuleNotFoundError: No module named 'mastering'`

- [ ] **Step 3: Create `mastering.py` — move the two functions verbatim**

```python
# backend/mastering.py
"""Shared loudness and spectral-balance measurement, used by mix_check, sound_comparison and bus_mastering."""

import re
import subprocess

import numpy as np

RATE = 44100


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBTP) of an audio file."""
    report = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(path), "-filter_complex",
                             "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, timeout=60).stderr
    summary = report[report.rfind("Summary:"):]
    integrated = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    if not integrated or not peak:
        raise ValueError("Loudness could not be measured.")
    value = lambda match: float("-inf") if match.group(1) == "-inf" else float(match.group(1))
    return value(integrated), value(peak)


def stereo_samples(path):
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-ac", "2", "-ar", str(RATE),
                              "-f", "f32le", "pipe:1"], capture_output=True, timeout=60)
    samples = np.frombuffer(decoded.stdout, dtype="<f4").astype(float).reshape(-1, 2)
    if samples.shape[0] < RATE:
        raise ValueError("The recording is too short to analyse.")
    return samples


def band_shares(samples):
    """Percent of spectral energy (20 Hz and up) in each named band."""
    mono = samples.mean(axis=1)
    spectrum = np.abs(np.fft.rfft(mono * np.hanning(mono.size))) ** 2
    frequencies = np.fft.rfftfreq(mono.size, 1 / RATE)
    total = float(spectrum[frequencies >= 20].sum()) or 1.0
    share = lambda low, high: round(100 * float(spectrum[(frequencies >= low) & (frequencies < high)].sum()) / total, 1)
    return {"low": share(20, 120), "mud": share(200, 500), "harsh": share(2000, 5000)}
```

- [ ] **Step 4: Update `mix_check.py` to import from `mastering` instead of defining locally**

Replace `mix_check.py`'s own `def loudness(path): ...` (line 19) and `def band_shares(samples): ...`
(line 41) — delete both bodies, keep every call site inside `mix_check.py` unchanged (`run()` calls
`loudness(path)` and `band_shares(samples)` unqualified, so importing the names directly keeps those
call sites working with no other edits):

```python
# backend/mix_check.py — near the top, alongside the existing imports
from mastering import loudness, band_shares, stereo_samples, RATE
```

Remove `mix_check.py`'s own now-duplicate `RATE = 44100` constant and the `stereo_samples` function
(same reasoning — it's only used inside `loudness`'s sibling functions, now centralized in `mastering.py`)
if nothing else in `mix_check.py` still needs it standalone. Check with:

```bash
grep -n "stereo_samples\|^RATE" mix_check.py
```

If `stereo_samples`/`RATE` are used elsewhere in `mix_check.py` (they are — `run()` calls
`stereo_samples(path)` directly), keep them imported from `mastering` rather than removed outright.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_mastering.py -v`
Expected: PASS

- [ ] **Step 6: Verify the `mix_check.py` refactor didn't break the module (no test file exists for it yet — that's Chunk 2)**

Run: `cd backend && python -c "import mix_check; print(mix_check.loudness, mix_check.band_shares)"`
Expected: prints the two function objects with no import error (confirms the re-export works and
`mix_check.py`'s internal unqualified calls to `loudness(...)`/`band_shares(...)` still resolve)

- [ ] **Step 7: Commit**

```bash
git add backend/mastering.py backend/tests/test_mastering.py backend/mix_check.py
git commit -m "refactor: extract loudness()/band_shares() into shared mastering.py"
```

### Task 1.2: Add `reference_targets()` for deriving a mastering target from an uploaded reference track

**Files:**
- Modify: `backend/mastering.py`
- Modify: `backend/tests/test_mastering.py`

- [ ] **Step 1: Write the failing test**

```python
# add to backend/tests/test_mastering.py

import os
from unittest import mock


class ReferenceTargetsTests(unittest.TestCase):
    def test_reads_the_reference_mix_file(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            reference_id = 'a' * 32
            (root / reference_id).mkdir()
            wavfile.write(root / reference_id / 'mix.wav', 44100, tone(gain=0.5))
            with mock.patch.dict(os.environ, {'BEATMIND_REFERENCES_DIR': str(root)}):
                target = mastering.reference_targets(reference_id)
            self.assertTrue(-20 < target['target_lufs'] < -5)
            self.assertIn('band_percent', target)

    def test_missing_reference_raises(self):
        with tempfile.TemporaryDirectory() as temporary:
            with mock.patch.dict(os.environ, {'BEATMIND_REFERENCES_DIR': temporary}):
                with self.assertRaises(ValueError):
                    mastering.reference_targets('b' * 32)
```

Check first whether `references.py` exposes its `ROOT` as a plain module-level `Path` read from
`os.getenv('BEATMIND_REFERENCES_DIR', ...)` (it does — confirmed at `references.py:28`) so
`mastering.py` can read the same env var directly without importing `references.py` itself (avoids a
circular import risk, since nothing in `mastering.py` needs anything else from `references.py`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_mastering.py::ReferenceTargetsTests -v`
Expected: FAIL with `AttributeError: module 'mastering' has no attribute 'reference_targets'`

- [ ] **Step 3: Implement**

```python
# add to backend/mastering.py
import os
from pathlib import Path

REFERENCES_ROOT = Path(os.getenv('BEATMIND_REFERENCES_DIR', '/tmp/beatmind-references'))


def reference_targets(reference_id):
    """Loudness/spectral-balance profile of an uploaded reference track's full mix, for use as a mastering target."""
    path = REFERENCES_ROOT / reference_id / 'mix.wav'
    if not path.is_file():
        raise ValueError('That reference has no saved mix audio to measure.')
    target_lufs, true_peak = loudness(path)
    bands = band_shares(stereo_samples(path))
    return {'target_lufs': round(target_lufs, 1), 'reference_true_peak_dbtp': round(true_peak, 1),
            'band_percent': bands}
```

Note: `REFERENCES_ROOT` is read once at import time from the env var, matching `references.py:28`'s
own pattern (`ROOT = Path(os.getenv('BEATMIND_REFERENCES_DIR', '/tmp/beatmind-references'))`) — keep
the same default path string so both modules agree on the real location in production.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_mastering.py -v`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add backend/mastering.py backend/tests/test_mastering.py
git commit -m "feat: derive a mastering target from an uploaded reference track"
```

---

## Chunk 2: Real precedence chain + close the `mix_check`/`master_chain` test gap

This is the chunk the spec review flagged twice: today, `producer_profile` is only consulted by the LLM
via a system-prompt instruction, and `main.py`'s dispatcher collapses "no explicit `target_lufs`" into
the hardcoded constant *before* `mix_check.run()` ever sees it. This chunk makes the precedence a real,
testable, code-level chain, and — since `mix_check.py`/`master_chain.py` currently have zero test
coverage — writes their first tests along the way.

### Task 2.1: Write `test_mix_check.py` against current behavior first (characterization tests)

Before changing `mix_check.run()`'s signature, pin down its *current* behavior with tests, so the
refactor in Task 2.2 has a safety net for everything that isn't supposed to change.

**Files:**
- Create: `backend/tests/test_mix_check.py`

- [ ] **Step 1: Write a fake `query` helper and the first characterization test**

`mix_check.run(user_id, recording_id, query, target_lufs=TARGET_LUFS, ceiling=CEILING_DBTP)` takes
`query` as a plain injected `async def query(address, args) -> list` callable (see
`main.py:970-975`) — there's no existing OSC-mocking helper elsewhere in this test suite to reuse
(checked `test_automation.py`, which mocks the Bridge-side Live API objects directly, a different
layer), so this writes one, local to this file:

```python
# backend/tests/test_mix_check.py
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from scipy.io import wavfile

import mix_check
import recordings


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class FakeAbleton:
    """Canned OSC replies for a 3-track session: Kick, Bass, Lead. Override .replies to change state."""
    def __init__(self, track_names=('Kick', 'Bass', 'Lead'), scene=0, num_scenes=1):
        self.track_names, self.scene, self.num_scenes = track_names, scene, num_scenes
        self.mute = {i: False for i in range(len(track_names))}
        self.solo = {i: False for i in range(len(track_names))}
        self.arm = {i: False for i in range(len(track_names))}
        self.volume = {i: 0.85 for i in range(len(track_names))}

    async def query(self, address, args):
        if address == '/live/song/get/track_names':
            return list(self.track_names)
        if address == '/live/song/get/num_scenes':
            return [self.num_scenes]
        if address == '/live/track/get/mute':
            return [args[0], self.mute[args[0]]]
        if address == '/live/track/get/solo':
            return [args[0], self.solo[args[0]]]
        if address == '/live/track/get/arm':
            return [args[0], self.arm[args[0]]]
        if address == '/live/track/get/can_be_armed':
            return [args[0], True]
        if address == '/live/track/get/volume':
            return [args[0], self.volume[args[0]]]
        if address == '/live/clip_slot/get/has_clip':
            return [args[0], args[1], True]
        if address == '/live/track/get/arrangement_clips/name':
            return [args[0]]
        if address == '/live/scene/get/name':
            return [args[0], f'Scene {args[0] + 1}']
        raise AssertionError(f'FakeAbleton has no canned reply for {address}')


class MixCheckTests(unittest.IsolatedAsyncioTestCase):
    """`recordings.save_recording()` validates real M4A magic bytes (`data[4:8] == b"ftyp"`), so it
    can't take a WAV fixture directly. `mix_check.run()` only needs `owned_recording()` (reads the
    JSON sidecar) and a file at `ROOT/{id}.m4a` (read by FFmpeg, which sniffs real content and doesn't
    care that the extension says m4a) — write both directly, bypassing save_recording()'s M4A check,
    which exists for the real upload path, not for test fixtures."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self._root_patch = patch.object(recordings, 'ROOT', Path(self._tmp.name))
        self._root_patch.start()
        self.addCleanup(self._root_patch.stop)

    def _save_full_mix_recording(self, gain=0.5, user_id=1):
        import json, uuid
        recording_id = uuid.uuid4().hex
        wavfile.write(recordings.ROOT / f'{recording_id}.m4a', 44100, tone(gain=gain))
        (recordings.ROOT / f'{recording_id}.json').write_text(json.dumps({
            'id': recording_id, 'user_id': user_id, 'kind': 'scene', 'scene': 0, 'scene_name': 'Drop',
            'created_at': '2026-09-29T00:00:00+00:00', 'track_name': '', 'track': None, 'metrics': {}}))
        return recording_id
```

- [ ] **Step 2: Once the fixture is real, write the first behavioral test**

```python
    async def test_true_peak_over_ceiling_fails(self):
        recording_id = self._save_full_mix_recording(gain=0.99)  # near-clipping
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
        headroom = next(c for c in report['checks'] if c['id'] == 'headroom')
        self.assertIn(headroom['status'], ('warn', 'fail'))

    async def test_quiet_mix_warns_below_target(self):
        recording_id = self._save_full_mix_recording(gain=0.02)
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
        loudness_check = next(c for c in report['checks'] if c['id'] == 'loudness')
        self.assertEqual(loudness_check['status'], 'warn')
```

- [ ] **Step 3: Run and verify these pass against current `mix_check.run()`**

Run: `cd backend && python -m pytest tests/test_mix_check.py -v`
Expected: PASS (this pins down today's behavior before Task 2.2 changes the signature)

- [ ] **Step 4: Commit the characterization tests separately from the behavior change**

```bash
git add backend/tests/test_mix_check.py
git commit -m "test: characterize mix_check.run()'s current behavior before changing its signature"
```

### Task 2.2: Give `mix_check.run()` a real, code-level precedence chain

**Files:**
- Modify: `backend/mix_check.py:90` (the `run()` signature and its first few lines)
- Modify: `backend/tests/test_mix_check.py`

- [ ] **Step 1: Write the failing precedence tests**

```python
# add to backend/tests/test_mix_check.py
import producer_profile


class PrecedenceTests(MixCheckTests):
    """Subclasses MixCheckTests to reuse its setUp() (patches recordings.ROOT to a temp dir) and
    _save_full_mix_recording() fixture helper — not a fresh unittest.IsolatedAsyncioTestCase."""

    async def test_explicit_target_wins_over_everything(self):
        recording_id = self._save_full_mix_recording(gain=0.1)
        report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                     target_lufs=-8.0)
        self.assertEqual(report['measurements']['target_lufs'], -8.0)

    async def test_producer_profile_wins_when_no_explicit_target(self):
        with tempfile.TemporaryDirectory() as profiles_dir:
            with patch.object(producer_profile, 'ROOT', Path(profiles_dir)):
                producer_profile.update(user_id=1, changes={'loudness_target_lufs': -10.0})
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
                self.assertEqual(report['measurements']['target_lufs'], -10.0)

    async def test_reference_wins_when_no_explicit_or_profile_target(self):
        with tempfile.TemporaryDirectory() as profiles_dir, tempfile.TemporaryDirectory() as refs_dir:
            with patch.object(producer_profile, 'ROOT', Path(profiles_dir)), \
                 patch.dict('os.environ', {'BEATMIND_REFERENCES_DIR': refs_dir}):
                reference_id = 'c' * 32
                (Path(refs_dir) / reference_id).mkdir()
                wavfile.write(Path(refs_dir) / reference_id / 'mix.wav', 44100, tone(gain=0.5))
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query,
                                             reference_id=reference_id)
                self.assertNotEqual(report['measurements']['target_lufs'], mix_check.TARGET_LUFS)

    async def test_constant_default_when_nothing_else_set(self):
        with tempfile.TemporaryDirectory() as profiles_dir:
            with patch.object(producer_profile, 'ROOT', Path(profiles_dir)):
                recording_id = self._save_full_mix_recording(gain=0.1)
                report = await mix_check.run(user_id=1, recording_id=recording_id, query=FakeAbleton().query)
                self.assertEqual(report['measurements']['target_lufs'], mix_check.TARGET_LUFS)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && python -m pytest tests/test_mix_check.py::PrecedenceTests -v`
Expected: FAIL — either a `TypeError` on the unexpected `reference_id` kwarg, or wrong `target_lufs`
values, since `producer_profile` isn't consulted by `run()` at all today

- [ ] **Step 3: Implement the precedence chain**

```python
# backend/mix_check.py — change the run() signature and its opening lines
# was: async def run(user_id, recording_id, query, target_lufs=TARGET_LUFS, ceiling=CEILING_DBTP):
async def run(user_id, recording_id, query, target_lufs=None, ceiling=CEILING_DBTP, reference_id=None):
    recording = recordings.owned_recording(recording_id, user_id)
    if not recording:
        return {"status": "failed", "summary": "That recording was not found.", "steps": []}
    if recording.get("kind") != "scene":
        return {"status": "failed", "summary": "Run the mix check on a full-mix preview (audition_scene), not a single part.", "steps": []}
    if target_lufs is None:
        import producer_profile
        profile_target = producer_profile.stored(user_id).get("loudness_target_lufs")
        if profile_target is not None:
            target_lufs = profile_target
        elif reference_id:
            target_lufs = mastering.reference_targets(reference_id)["target_lufs"]
        else:
            target_lufs = TARGET_LUFS
    path = recordings.ROOT / f'{recording_id}.m4a'
    # ... rest of the existing function body is unchanged from here ...
```

Add `import mastering` alongside the existing `from mastering import loudness, band_shares, ...` line
from Chunk 1 — or just reuse that same import line, since `mastering.reference_targets` needs to be
reachable as `mastering.reference_targets(...)`, not just the two functions imported by name. Change
the top-of-file import to `import mastering` and update the internal `loudness(...)`/`band_shares(...)`
call sites to `mastering.loudness(...)`/`mastering.band_shares(...)` instead — this is cleaner than
mixing a bare `import mastering` with `from mastering import loudness, band_shares` in the same file.
Update Chunk 1's Task 1.1 Step 4 accordingly if implementing in strict order (i.e. land on
`import mastering` + qualified calls from the start, rather than doing it twice).

- [ ] **Step 4: Run to verify all `test_mix_check.py` tests pass, including Task 2.1's characterization tests**

Run: `cd backend && python -m pytest tests/test_mix_check.py -v`
Expected: PASS — all of them, confirming the precedence change didn't break existing behavior

- [ ] **Step 5: Commit**

```bash
git add backend/mix_check.py backend/tests/test_mix_check.py
git commit -m "feat: real code-level precedence for mastering loudness target (explicit > producer profile > reference > default)"
```

### Task 2.3: Update `main.py`'s dispatcher to stop collapsing the default before `mix_check.run()` sees it

**Files:**
- Modify: `backend/main.py:980-985`
- Modify: `backend/claude_tools.py` (the `mix_check` tool's `input_schema`, currently: `{"recording_id", "target_lufs", "ceiling_dbtp"}` required `["recording_id"]` — add `reference_id`)

- [ ] **Step 1: Write the failing test**

Check first whether `main.py`'s `_mix_tool`/`_execute_tool` functions have any existing test coverage
(`grep -rn "_mix_tool\|_execute_tool" backend/tests/`) to know whether to add to an existing test file
or create one. If none exists, add a minimal focused test:

```python
# backend/tests/test_main_mix_dispatch.py  (only if no existing test covers _mix_tool — check first)
import unittest
from unittest.mock import AsyncMock, MagicMock

from main import _mix_tool


class MixToolDispatchTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_explicit_target_lufs_reaches_mix_check_as_none(self):
        bridge = MagicMock(user_id=1)
        bridge.send_command = AsyncMock(return_value={"status": "ok", "args": []})
        with unittest.mock.patch("mix_check.run", new=AsyncMock(return_value={"status": "observed"})) as run:
            await _mix_tool("mix_check", {"recording_id": "a" * 32}, bridge)
        self.assertIsNone(run.call_args.args[3] if len(run.call_args.args) > 3 else run.call_args.kwargs.get("target_lufs"))
```

Confirm the exact positional/keyword call shape by reading `_mix_tool`'s real call to
`mix_check.run(...)` once Step 3 below is written, and adjust this assertion to match rather than
guessing blindly — prefer calling with keyword arguments from `main.py` so this test doesn't depend on
positional order at all (see Step 3).

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/test_main_mix_dispatch.py -v`
Expected: FAIL — `run.call_args` shows `mix_check.TARGET_LUFS`, not `None`

- [ ] **Step 3: Update the dispatcher**

```python
# backend/main.py — replace the two lines currently at 980-983
# was:
#         if tool_name == "mix_check":
#             return await mix_check.run(bridge.user_id, tool_input["recording_id"], query,
#                                        tool_input.get("target_lufs", mix_check.TARGET_LUFS),
#                                        tool_input.get("ceiling_dbtp", mix_check.CEILING_DBTP))
        if tool_name == "mix_check":
            return await mix_check.run(bridge.user_id, tool_input["recording_id"], query,
                                       target_lufs=tool_input.get("target_lufs"),
                                       ceiling=tool_input.get("ceiling_dbtp", mix_check.CEILING_DBTP),
                                       reference_id=tool_input.get("reference_id"))
```

Leave the `apply_master_chain` call site (currently lines 984-985) untouched — per the spec, it's
deliberately left alone, since Data flow always passes it an already-resolved `target_lufs` from
`mix_check`'s own report.

Add `reference_id` to `mix_check`'s tool schema in `claude_tools.py`:

```python
# backend/claude_tools.py — inside the "mix_check" tool's input_schema properties
"reference_id": {"type": "string", "pattern": "^[a-f0-9]{32}$",
                 "description": "An attached reference track's id. When given and no explicit target_lufs or saved producer preference exists, the mastering target is derived from the reference's own measured loudness instead of the -14 LUFS default."},
```

- [ ] **Step 4: Run to verify the test passes**

Run: `cd backend && python -m pytest tests/test_main_mix_dispatch.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/claude_tools.py backend/tests/test_main_mix_dispatch.py
git commit -m "feat: pass reference_id through to mix_check, stop pre-collapsing target_lufs default"
```

### Task 2.4: Close the `master_chain.py` test gap

`master_chain.py` doesn't change functionally in this plan — this task only adds the missing tests.

**Files:**
- Create: `backend/tests/test_master_chain.py`

- [ ] **Step 1: Write tests against current (unchanged) behavior**

```python
# backend/tests/test_master_chain.py
import unittest
from unittest.mock import AsyncMock

import master_chain


def curve(low=-24.0, high=6.0, count=101):
    return {"min": low, "max": high, "displays": [f"{low + (high - low) * i / (count - 1):.1f} dB" for i in range(count)]}


class MasterChainTests(unittest.IsolatedAsyncioTestCase):
    async def test_loads_limiter_when_missing_then_sets_ceiling_and_gain(self):
        devices_calls = [[], ["EQ Eight", "Limiter"]]  # before load, after load
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return devices_calls.pop(0)
            if address == "/live/beatmind/master/load":
                return ["loaded"]
            if address == "/live/beatmind/master/parameters":
                return [args[0], '{"parameters": [{"name": "Ceiling"}, {"name": "Gain"}]}']
            if address == "/live/beatmind/master/curve":
                return ["ok", curve()]
            if address == "/live/beatmind/master/set":
                return ["ok", None, "-1.0 dB"]
            raise AssertionError(address)
        send = AsyncMock()
        result = await master_chain.apply(query, send, measured_lufs=-20.0, target_lufs=-14.0, ceiling_dbtp=-1.0)
        self.assertEqual(result["status"], "verified")
        self.assertIn("Loaded Limiter", result["summary"])

    async def test_limiter_not_last_fails(self):
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return ["Limiter", "EQ Eight"]
            raise AssertionError(address)
        result = await master_chain.apply(query, AsyncMock(), measured_lufs=-20.0)
        self.assertEqual(result["status"], "failed")
        self.assertIn("must be the last device", result["summary"])

    async def test_gain_clamped_to_zero_when_already_loud_enough(self):
        async def query(address, args):
            if address == "/live/beatmind/master/devices":
                return ["Limiter"]
            if address == "/live/beatmind/master/parameters":
                return [args[0], '{"parameters": [{"name": "Ceiling"}, {"name": "Gain"}]}']
            if address == "/live/beatmind/master/curve":
                return ["ok", curve()]
            if address == "/live/beatmind/master/set":
                return ["ok", None, "0.0 dB"]
            raise AssertionError(address)
        result = await master_chain.apply(query, AsyncMock(), measured_lufs=-10.0, target_lufs=-14.0)
        self.assertEqual(result["master"]["gain_db"], 0.0)
        self.assertIn("already at or above", result["summary"])
```

- [ ] **Step 2: Run and verify these pass against the existing, unmodified `master_chain.py`**

Run: `cd backend && python -m pytest tests/test_master_chain.py -v`
Expected: PASS (this is pure characterization — `master_chain.py` isn't being changed)

If any test fails, that means this plan's understanding of `master_chain.apply()`'s exact reply-shape
contract (from reading the file during spec-writing) is stale or wrong — re-read
`backend/master_chain.py` on the current branch and fix the test to match real behavior, don't change
`master_chain.py` itself to match a wrong test.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_master_chain.py
git commit -m "test: add missing coverage for master_chain.apply()"
```

---

## Chunk 3: Add LUFS/true-peak to `sound_comparison.py`

`sound_comparison.measure()` currently works entirely in-memory on NumPy arrays — no file I/O, no
subprocess. `mastering.loudness()` requires a file path (it shells out to FFmpeg). This chunk adds a
temp-file round-trip to get LUFS into the per-part comparison report; flagged explicitly because it
changes `measure()`'s performance/purity characteristics (was previously a fast pure function).

### Task 3.1: Add `lufs`/`true_peak_dbtp` to `measure()`'s report

**Files:**
- Modify: `backend/sound_comparison.py:36-61` (`measure()`)
- Modify: `backend/sound_comparison.py:64-94` (`compare_arrays()`, for the new `next_checks` note)
- Modify: `backend/tests/test_sound_comparison.py`

- [ ] **Step 1: Write the failing test**

```python
# add to backend/tests/test_sound_comparison.py, in MeasurementTests
    def test_measure_includes_loudness(self):
        result = comparison.measure(tone(gain=0.3))
        self.assertIn('lufs', result)
        self.assertIn('true_peak_dbtp', result)
        self.assertTrue(-30 < result['lufs'] < 0)

    def test_large_loudness_delta_is_flagged(self):
        report, _, _ = comparison.compare_arrays(tone(gain=0.3), tone(gain=0.01))
        self.assertTrue(any('loudness' in note.casefold() or 'lufs' in note.casefold() for note in report['next_checks']))
```

- [ ] **Step 2: Run to verify these fail**

Run: `cd backend && python -m pytest tests/test_sound_comparison.py -k "loudness" -v`
Expected: FAIL — `KeyError: 'lufs'`

- [ ] **Step 3: Implement**

```python
# backend/sound_comparison.py — add near the top
import tempfile
import mastering

# inside measure(), after the existing peak/rms/spectrum computation, before the return:
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=True) as scratch:
        from scipy.io import wavfile as _wavfile
        _wavfile.write(scratch.name, RATE, (samples * 32767).round().astype('<i2'))
        lufs, true_peak_dbtp = mastering.loudness(scratch.name)
    return {'rms_dbfs': round(rms_db, 3), 'peak_dbfs': round(float(20 * np.log10(peak)), 3),
            'crest_db': round(float(20 * np.log10(peak) - rms_db), 3),
            'spectral_centroid_hz': round(float(np.sum(frequencies * energy) / total), 2),
            'side_energy_percent': round(100 * side_fraction, 3),
            'lufs': round(lufs, 1), 'true_peak_dbtp': round(true_peak_dbtp, 1),
            'bands_percent': {f'{low}-{high} Hz': round(100 * float(energy[(frequencies >= low) & (frequencies < high)].sum()) / total, 3)
                              for low, high in BANDS}}
```

```python
# backend/sound_comparison.py — inside compare_arrays(), extend the existing deltas dict and notes list
    deltas = {key: round(b[key] - a[key], 3) for key in
              ('rms_dbfs', 'crest_db', 'spectral_centroid_hz', 'side_energy_percent', 'lufs')}
    # ... after the existing crest_db note ...
    if abs(deltas['lufs']) >= 3:
        notes.append('Integrated loudness differs by 3 LU or more. Level-match by ear before judging tone or dynamics.')
```

Note: `measure()` is called from `render_comparison()` on 2-16 second excerpts (per
`ComparisonRequest.duration_seconds`), each already running inside `sound_comparison.run()`'s existing
isolated subprocess with a 60-second total timeout (`sound_comparison.py:126-144`) — the added FFmpeg
subprocess call inside `measure()` runs *inside* that same isolated child process, so it doesn't need
its own separate timeout/isolation; it inherits the existing one. Confirm this stays true after
implementing — if `measure()` were ever called somewhere outside that isolation boundary, revisit.

- [ ] **Step 4: Run to verify all `test_sound_comparison.py` tests pass**

Run: `cd backend && python -m pytest tests/test_sound_comparison.py -v`
Expected: PASS — including the pre-existing tests, confirming the new fields are additive and don't
break `test_identical_audio_has_zero_deltas_without_match_claim`'s existing
`all(value == 0 for value in report['candidate_minus_reference'].values())` assertion (LUFS delta
between identical audio must be exactly `0`, not off by floating-point rounding — verify this holds;
if it doesn't, round consistently on both sides before subtracting, the way the existing fields already do)

- [ ] **Step 5: Commit**

```bash
git add backend/sound_comparison.py backend/tests/test_sound_comparison.py
git commit -m "feat: add LUFS/true-peak to per-part Compare sounds report"
```

---

## Chunk 4: Per-stem-bus mastering (`bus_mastering.py`)

The one genuinely new module. Classifies the producer's own Ableton tracks into the same four buses
the reference uses (drums/bass/vocals/other), bounces each bus, and compares it against the matching
reference stem. Built entirely from existing primitives: `set_track_mute` (OSC `send`) and
`audition_scene`'s underlying Bridge operation, `capture_scene` — **not** the plain `query`/`send`
closures `mix_check.run()` uses. `capture_scene` is invoked via `bridge.local_operation("capture_scene",
request)` (confirmed at `main.py:1016`), a different mechanism than the OSC-relay `query`/`send`
pattern — this task's dispatcher wiring reflects that, unlike Chunk 2's `mix_check`/`master_chain` work
which only needed `query`/`send`.

**Reply shape, confirmed by reading `_song_tool` (`main.py:1001-1017`) and `recordings.py` in full:**
`bridge.local_operation("capture_scene", request)` returns a raw result dict with `audio_base64`
(base64-encoded M4A bytes) and metadata (`status`, `track_name`, `track`, `scene`, `metrics`,
`scene_name`) — it is **not yet a file on disk**. `_song_tool` immediately passes it through
`recordings.save_recording(bridge.user_id, result)`, which validates, decodes and writes it to
`recordings.ROOT / f'{recording_id}.m4a'` and returns `{**result, "recording": metadata}` where
`metadata['id']` is the new recording id. So the `capture_scene` callable this task injects into
`bus_mastering.compare_bus()` must do both steps (capture *and* save) to hand back a real file path —
designed that way below, not as a bare Bridge call.

### Task 4.1: Bus classification (pure function, no I/O)

**Files:**
- Create: `backend/bus_mastering.py`
- Create: `backend/tests/test_bus_mastering.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_bus_mastering.py
import unittest

import bus_mastering


class ClassificationTests(unittest.TestCase):
    def test_classifies_common_track_names(self):
        names = ['Kick', 'Snare', 'Hats', 'Sub Bass', 'Lead Vocal', 'Pad', 'FX Riser']
        result = bus_mastering.classify_tracks(names)
        self.assertEqual(result[0], 'drums')   # Kick
        self.assertEqual(result[1], 'drums')   # Snare
        self.assertEqual(result[2], 'drums')   # Hats
        self.assertEqual(result[3], 'bass')    # Sub Bass
        self.assertEqual(result[4], 'vocals')  # Lead Vocal
        self.assertEqual(result[5], 'other')   # Pad
        self.assertIsNone(result[6])           # FX Riser — unclassified, never guessed
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/test_bus_mastering.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'bus_mastering'`

- [ ] **Step 3: Implement — reuse `mix_check.py`'s own name-matching idiom (kick/bass substring checks)**

```python
# backend/bus_mastering.py
"""Per-stem-bus mastering: group the producer's own tracks into the reference's four buses
(drums/bass/vocals/other) and compare each bus against the matching reference stem."""

DRUM_WORDS = ('kick', 'snare', 'hat', 'clap', 'perc', 'cymbal', 'tom', 'drum')
BASS_WORDS = ('bass', 'sub', '808')
VOCAL_WORDS = ('vocal', 'vox', 'voice')


def classify(name):
    lowered = name.casefold()
    if any(word in lowered for word in VOCAL_WORDS):
        return 'vocals'
    if any(word in lowered for word in BASS_WORDS):
        return 'bass'
    if any(word in lowered for word in DRUM_WORDS):
        return 'drums'
    if lowered.strip() in ('pad', 'chords', 'lead', 'synth', 'keys', 'strings', 'guitar', 'arp'):
        return 'other'
    return None


def classify_tracks(names):
    return [classify(name) for name in names]
```

Note the deliberate order (vocals checked before bass, bass before drums) — a track named "Bass Vocal
Chop" (unlikely, but the point stands) resolves to the more specific/intentional-sounding category
first. If real usage shows this heuristic misclassifies often, that's the "Open questions" item from
the spec — a manual override — not something to build preemptively here.

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && python -m pytest tests/test_bus_mastering.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/bus_mastering.py backend/tests/test_bus_mastering.py
git commit -m "feat: classify Ableton tracks into drums/bass/vocals/other buses"
```

### Task 4.2: Bus comparison orchestration (mute, bounce, measure, compare, restore)

**Files:**
- Modify: `backend/bus_mastering.py`
- Modify: `backend/tests/test_bus_mastering.py`

- [ ] **Step 1: Write the failing test**

```python
# add to backend/tests/test_bus_mastering.py
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import numpy as np
from scipy.io import wavfile

import references


def tone(frequency=110, gain=0.2, seconds=3, rate=44100):
    times = np.arange(round(seconds * rate)) / rate
    audio = gain * np.sin(2 * np.pi * frequency * times)
    return np.column_stack((audio, audio)).astype('float32')


class BusComparisonTests(unittest.IsolatedAsyncioTestCase):
    async def test_mutes_non_bus_tracks_bounces_measures_and_restores(self):
        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'd' * 32
            (Path(refs_dir) / reference_id).mkdir()
            wavfile.write(Path(refs_dir) / reference_id / 'bass.wav', 44100, tone(gain=0.4))
            mute_calls = []
            async def send(address, args):
                if address == '/live/track/set/mute':
                    mute_calls.append(tuple(args))
            async def query(address, args):
                if address == '/live/song/get/track_names':
                    return ['Kick', 'Sub Bass', 'Lead']
                if address == '/live/track/get/mute':
                    return [args[0], False]
                raise AssertionError(address)
            captured = {}
            recording_id_holder = {}
            async def capture_scene(request):
                # Mirrors what _bus_tool's real capture_scene closure does (capture, then save) —
                # see Step 3's implementation below for the production version of this composition.
                captured.update(request)
                recording_id_holder['id'] = 'z' * 32
                wavfile.write(recordings.ROOT / f"{recording_id_holder['id']}.m4a", 44100, tone(gain=0.4))
                return {'status': 'verified', 'recording': {'id': recording_id_holder['id']}}

            with tempfile.TemporaryDirectory() as recordings_dir:
                with patch.object(recordings, 'ROOT', Path(recordings_dir)), \
                     patch.dict('os.environ', {'BEATMIND_REFERENCES_DIR': refs_dir}):
                    result = await bus_mastering.compare_bus(
                        user_id=1, reference_id=reference_id, bus='bass', scene=0,
                        query=query, send=send, capture_scene=capture_scene)

            self.assertEqual(result['status'], 'measured')
            # Kick (track 0) and Lead (track 2) should be muted; Sub Bass (track 1) left alone
            self.assertIn((0, 1), mute_calls)
            self.assertIn((2, 1), mute_calls)
            self.assertNotIn((1, 1), mute_calls)
            # and every mute should be restored to its original (False) state afterward
            self.assertIn((0, 0), mute_calls)
            self.assertIn((2, 0), mute_calls)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/test_bus_mastering.py::BusComparisonTests -v`
Expected: FAIL — `AttributeError: module 'bus_mastering' has no attribute 'compare_bus'`

- [ ] **Step 3: Implement**

```python
# add to backend/bus_mastering.py
import mastering
import recordings
import sound_comparison

REFERENCES_ROOT = mastering.REFERENCES_ROOT


async def compare_bus(user_id, reference_id, bus, scene, query, send, capture_scene, seconds=8):
    """`capture_scene(request)` must both capture AND save (see _bus_tool in main.py for the real
    composition: `recordings.save_recording(bridge.user_id, await bridge.local_operation(...))`),
    returning a dict with `recording.id` once saved to `recordings.ROOT/{id}.m4a` — a bare
    `bridge.local_operation` call alone only returns base64 bytes, not a file on disk."""
    reference_path = REFERENCES_ROOT / reference_id / f'{bus}.wav'
    if not reference_path.is_file():
        return {'status': 'failed', 'summary': f'No saved {bus} stem for this reference. '
                'Complete the reference stem review first.', 'steps': []}
    names = await query('/live/song/get/track_names', [])
    buses = classify_tracks(names)
    if bus not in buses:
        return {'status': 'failed', 'summary': f'No track classified as {bus} to compare.', 'steps': []}
    other_tracks = [i for i, b in enumerate(buses) if b != bus]
    original_mute = {}
    try:
        for track in other_tracks:
            original_mute[track] = (await query('/live/track/get/mute', [track]))[-1]
            if not original_mute[track]:
                await send('/live/track/set/mute', [track, 1])
        capture = await capture_scene({'scene': scene, 'seconds': seconds})
        if capture.get('status') != 'verified':
            return {'status': 'failed', 'summary': f'Could not record the {bus} bus: '
                    f'{capture.get("summary", "unknown error")}', 'steps': []}
        candidate_id = capture['recording']['id']
        candidate_samples = mastering.stereo_samples(recordings.ROOT / f'{candidate_id}.m4a')
        reference_samples = mastering.stereo_samples(reference_path)
        length = min(len(candidate_samples), len(reference_samples))
        report, _, _ = sound_comparison.compare_arrays(reference_samples[:length], candidate_samples[:length])
        return {'status': 'measured', 'bus': bus, 'comparison': report, 'steps': []}
    finally:
        for track, was_muted in original_mute.items():
            if not was_muted:
                await send('/live/track/set/mute', [track, 0])
```

- [ ] **Step 4: Run to verify the test passes**

Run: `cd backend && python -m pytest tests/test_bus_mastering.py -v`
Expected: PASS

- [ ] **Step 5: Write and verify a mute-restore-on-failure test**

```python
    async def test_restores_mutes_even_when_capture_fails(self):
        mute_calls = []
        async def send(address, args):
            if address == '/live/track/set/mute':
                mute_calls.append(tuple(args))
        async def query(address, args):
            if address == '/live/song/get/track_names':
                return ['Kick', 'Sub Bass']
            if address == '/live/track/get/mute':
                return [args[0], False]
            raise AssertionError(address)
        async def capture_scene(request):
            return {'status': 'failed', 'summary': 'silent recording'}
        with tempfile.TemporaryDirectory() as refs_dir:
            reference_id = 'e' * 32
            (Path(refs_dir) / reference_id).mkdir()
            wavfile.write(Path(refs_dir) / reference_id / 'bass.wav', 44100, tone(gain=0.4))
            with patch.dict('os.environ', {'BEATMIND_REFERENCES_DIR': refs_dir}):
                result = await bus_mastering.compare_bus(
                    user_id=1, reference_id=reference_id, bus='bass', scene=0,
                    query=query, send=send, capture_scene=capture_scene)
        self.assertEqual(result['status'], 'failed')
        self.assertIn((0, 1), mute_calls)
        self.assertIn((0, 0), mute_calls)  # restored even though capture failed
```

Run: `cd backend && python -m pytest tests/test_bus_mastering.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/bus_mastering.py backend/tests/test_bus_mastering.py
git commit -m "feat: bus-level bounce, measure and compare against the reference's matching stem"
```

### Task 4.3: Register `compare_bus_to_reference` as a tool and wire the dispatcher

**Files:**
- Modify: `backend/claude_tools.py` (add new tool definition, near `mix_check`/`apply_master_chain`)
- Modify: `backend/main.py` (`_execute_tool`'s dispatch table, and a new small dispatcher function)

- [ ] **Step 1: Write the failing dispatch test**

```python
# add to backend/tests/test_main_mix_dispatch.py (from Task 2.3) or a new file if that one wasn't created
class BusToolDispatchTests(unittest.IsolatedAsyncioTestCase):
    async def test_routes_to_bus_mastering_with_capture_scene_from_local_operation(self):
        bridge = MagicMock(user_id=1, capabilities={'scene_audition_v1'})
        bridge.send_command = AsyncMock(return_value={"status": "ok", "args": []})
        bridge.local_operation = AsyncMock(return_value={"status": "failed", "summary": "no clip"})
        from main import _execute_tool
        result = await _execute_tool('compare_bus_to_reference',
                                     {'reference_id': 'f' * 32, 'bus': 'bass', 'scene': 0}, bridge)
        self.assertIn(result['status'], ('failed', 'measured'))  # reaches bus_mastering without crashing
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/test_main_mix_dispatch.py::BusToolDispatchTests -v`
Expected: FAIL — `compare_bus_to_reference` not recognized, or `KeyError` on tool schema lookup

- [ ] **Step 3: Add the tool definition**

```python
# backend/claude_tools.py — near the mix_check/apply_master_chain tools
ABLETON_TOOLS.append({
    "name": "compare_bus_to_reference",
    "description": "Compare one bus of the user's own tracks (drums, bass, vocals or other) against the "
                   "matching stem of an attached reference track. Mutes tracks outside the bus, bounces "
                   "it, measures it and restores mutes. Advisory only — reports differences, never "
                   "changes a device or fader itself. Requires the reference's stem review to be "
                   "complete for that bus.",
    "input_schema": {"type": "object", "properties": {
        "reference_id": {"type": "string", "pattern": "^[a-f0-9]{32}$"},
        "bus": {"type": "string", "enum": ["drums", "bass", "vocals", "other"]},
        "scene": {"type": "integer", "minimum": 0}},
        "required": ["reference_id", "bus", "scene"], "additionalProperties": False}
})
```

- [ ] **Step 4: Wire the dispatcher — this needs both `query`/`send` (like `_mix_tool`) and
      `local_operation` (like `_song_tool`), so it gets its own small function**

```python
# backend/main.py — add near _mix_tool/_song_tool
async def _bus_tool(tool_input: dict, bridge: BridgeConnection) -> dict:
    import bus_mastering
    if 'scene_audition_v1' not in bridge.capabilities:
        message = ("This needs BeatMind Bridge 1.3 or later. Click Install update in the Bridge window "
                   "(your Ableton set stays open), then ask again.")
        return {"status": "failed", "error": message, "summary": message, "steps": []}

    async def query(address, args):
        reply = await bridge.send_command(address, list(args), True)
        if reply.get("status") != "ok":
            raise RuntimeError(f"Ableton did not confirm {address}.")
        return reply.get("args") or []

    async def send(address, args):
        await bridge.send_command(address, list(args))

    async def capture_scene(request):
        import recordings
        return recordings.save_recording(bridge.user_id, await bridge.local_operation("capture_scene", request))

    try:
        return await bus_mastering.compare_bus(bridge.user_id, tool_input["reference_id"], tool_input["bus"],
                                                tool_input["scene"], query, send, capture_scene)
    except (RuntimeError, ValueError, OSError) as error:
        return {"status": "failed", "summary": str(error), "steps": []}
```

Add to `_execute_tool`'s dispatch chain (alongside the existing `if tool_name in {"mix_check",
"apply_master_chain"}:` branch):

```python
    if tool_name == "compare_bus_to_reference":
        return await _bus_tool(tool_input, bridge)
```

Note: this duplicates the `query`/`send` closures already defined inside `_mix_tool` — if that
duplication bothers the plan-document-reviewer or a code-simplifier pass, factor `query`/`send` into a
small `_osc_closures(bridge)` helper shared by both `_mix_tool` and `_bus_tool`. Not done inline here
to keep this task's diff minimal and reviewable; flag as a fast-follow if raised.

- [ ] **Step 5: Run to verify the test passes**

Run: `cd backend && python -m pytest tests/test_main_mix_dispatch.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/claude_tools.py backend/main.py backend/tests/test_main_mix_dispatch.py
git commit -m "feat: register compare_bus_to_reference tool and wire its dispatcher"
```

---

## Before merging

- [ ] Run the full backend suite once: `cd backend && python -m pytest -v` (or the project's real
  test-runner invocation — check `backend/tests/conftest.py` / any `pytest.ini`/`pyproject.toml` test
  config first, this plan assumes pytest-compatible unittest discovery, which is likely but not
  independently confirmed against a CI config file during planning).
- [ ] Re-verify every line-number citation in this plan against the actual branch state at
  implementation time — this branch had 4+ commits/day while this plan was written.
- [ ] `recordings.py`'s exact save/lookup API and `capture_scene`'s exact success-reply shape were
  both read in full while writing this plan (not guessed) — Chunk 2/4's fixtures and
  `bus_mastering.py`'s `capture_scene` composition reflect the real `save_recording()`/
  `owned_recording()` contracts. If `recordings.py` has changed again by implementation time
  (likely, given the commit pace), re-diff against this plan's assumptions before trusting them.
