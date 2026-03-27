---
phase: quick-240
plan: 01
subsystem: mixmind-sidecar
tags: [mixmind, anlz-parser, waveform, beat-grid, tracktable, dj-tools]
dependency_graph:
  requires: []
  provides: [beat-grid-phantom-fix, 3band-waveform-ndarray-decompose, tracktable-badge-render]
  affects: [anlz_parser.py, TrackTable.tsx]
tech_stack:
  added: []
  patterns: [pyrekordbox-tuple-ndarray-decompose, phantom-beat-skip]
key_files:
  created: []
  modified:
    - apps/mixmind/sidecar/anlz_parser.py
    - apps/mixmind/frontend/src/components/TrackTable.tsx
decisions:
  - Phantom beat threshold set to 300ms — covers Rekordbox pre-roll ticks (~0ms) while preserving legitimate early downbeats (e.g. 200ms intros are valid musical starts)
  - 3-band scale factor 8x (same as mono wf_preview) — Pioneer stores values 0-31 in byte columns; *8 maps cleanly to 0-248 display range
  - TrackTable required no code changes — badges already wired at lines 502/507 from prior uncommitted work
metrics:
  duration: 8m
  completed: 2026-03-26
  tasks: 3
  files: 2
---

# Phase quick-240: Fix MixMind BPM/Key Display, Beat Grid Offset, 3-Band Waveform

Beat-grid first-beat phantom skip + PWV5 3-band waveform ndarray decomposition in anlz_parser.py; BpmBadge/KeyBadge confirmed rendering in TrackTable virtual rows.

## What Was Fixed

### Fix 1 — Beat Grid First-Beat Off-by-One (`anlz_parser.py:125-134`)

**Problem:** `_parse_beat_grid` used `next()` to find the first `beat==1` entry. Rekordbox prepends a phantom beat==1 at ~0ms for some tracks as a pre-roll tick, causing the gold "1" downbeat marker on the CDJ waveform overlay to land one beat early.

**Fix:** Collect all `beat==1` timestamps into `beat1_entries`. If there are 2+ entries and the first is `< 300ms`, skip it and use the second. Otherwise fall back to the first valid entry.

```python
beat1_entries = [b["time_ms"] for b in beat_grid if b["beat"] == 1]
if len(beat1_entries) >= 2 and beat1_entries[0] < 300:
    first_beat_ms = beat1_entries[1]
elif beat1_entries:
    first_beat_ms = beat1_entries[0]
else:
    first_beat_ms = beat_grid[0]["time_ms"] if beat_grid else 0
```

**File:** `apps/mixmind/sidecar/anlz_parser.py:125-134`

---

### Fix 2 — 3-Band Waveform Tuple Decomposition (`anlz_parser.py:227-251`)

**Problem:** `_parse_waveform_3band` bailed out with `return None` when `wf_color_preview` returned a tuple (the common pyrekordbox PWV5 path). The tuple's `wf_tag[0]` is a valid `(N, 3)` ndarray where columns are `[low, mid, high]` amplitudes (0-31 range), but the old code treated any tuple return as undecomposable.

**Fix:** Extract `color_arr = wf_tag[0]`, verify it has `.shape`, and if shape is `(N, 3)` decompose each row into `{low, mid, high}` scaled by `*8` (0→255). Fall through to `return None` only for unexpected shapes (logged at debug level).

**File:** `apps/mixmind/sidecar/anlz_parser.py:227-251`

**Known limitation:** If pyrekordbox returns a non-(N,3) shape (e.g. 1D or (N,4)), the parser logs a debug message and returns `None` — the overview strip falls back to mono waveform preview without crashing.

---

### Fix 3 — TrackTable BPM/Key Badges (confirmation, no code change)

**Verified:** `BpmBadge` and `KeyBadge` are defined at lines 46-74 and already rendered inside the virtual row template at lines 502 and 507. No layout clipping — row height is `estimateSize: 44` with `alignItems: 'center'`, sufficient for the 20px-tall badges.

**File:** `apps/mixmind/frontend/src/components/TrackTable.tsx:502,507`

---

## Verification Output

```
# Python import check
$ python3 -c "from anlz_parser import _parse_beat_grid, _parse_waveform_3band; print('all ok')"
all ok

# beat1_entries logic present
$ grep -n "beat1_entries" apps/mixmind/sidecar/anlz_parser.py
128:        beat1_entries = [b["time_ms"] for b in beat_grid if b["beat"] == 1]
129:        if len(beat1_entries) >= 2 and beat1_entries[0] < 300:
130:            first_beat_ms = beat1_entries[1]
131:        elif beat1_entries:
132:            first_beat_ms = beat1_entries[0]

# arr.shape check present
$ grep -n "arr.shape" apps/mixmind/sidecar/anlz_parser.py
241:            if len(arr.shape) == 2 and arr.shape[1] >= 3:
250:                    logger.debug("3-band waveform decoded from tuple ndarray shape %s: %d entries", ...)

# TrackTable badges in JSX
$ grep -n "BpmBadge\|KeyBadge" apps/mixmind/frontend/src/components/TrackTable.tsx
46:function KeyBadge({ camelot }: { camelot: string }) {
61:function BpmBadge({ bpm }: { bpm: number }) {
502:                    <BpmBadge bpm={t.bpm} />
507:                    <KeyBadge camelot={t.camelot} />

# TypeScript check: no output = no errors
$ npx tsc --noEmit
(no output)
```

## Deviations from Plan

None — plan executed exactly as written. TrackTable required no code changes as badges were already wired from prior session work.

## Commits

- `3dba8a7a` — fix(quick-240): beat-grid first-beat phantom skip, 3-band ndarray decompose, TrackTable badge render

## Self-Check: PASSED

- [x] `apps/mixmind/sidecar/anlz_parser.py` modified — beat1_entries logic at line 128, arr.shape check at line 241
- [x] `apps/mixmind/frontend/src/components/TrackTable.tsx` — BpmBadge at line 502, KeyBadge at line 507
- [x] Commit `3dba8a7a` exists in git log
- [x] TypeScript: no errors introduced
- [x] Python import: clean
