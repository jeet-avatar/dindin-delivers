# Mixing and Mastering Module — Design

## Summary

BeatMind can already produce a track (MIDI + instruments, driven by Claude over
AbletonOSC) and already has a mature **Reference-to-Track workflow**: upload a
reference song, separate it into four stems (Demucs `htdemucs`), analyze
tempo/key/energy (librosa), review/approve stems, map its structure, optionally
get a paid third-party listening description, and build a creative template
from it. It also has a **Compare sounds** stage (`backend/sound_comparison.py`)
that takes one real Ableton audition recording and one reference layer,
level-matches them, and reports bounded DSP measurements (RMS, peak, crest,
spectral centroid, 6-band energy split, stereo side-energy) plus plain-language
notes — explicitly diagnostic, explicitly not a quality score, explicitly never
touching Ableton.

**What doesn't exist yet, and what this module adds:**

1. **Loudness/true-peak/phase measurement** — Compare sounds has no LUFS,
   no true-peak, no mono-compatibility check. Needed both per-part and,
   critically, at the final mix.
2. **Frequency-masking detection across simultaneously-sounding tracks** — no
   existing tool (in this repo or in open source) checks whether two tracks
   are fighting for the same frequency band at the same time.
3. **A final mastering pass** — nothing bounces the master bus, matches it to
   the reference track, or checks it against release-readiness thresholds.
   The reference workflow explicitly stops short of this ("the reference
   workflow alone is not a finished song").

This design covers those three additions. It deliberately does **not** touch
or replace the existing reference upload/stem/timing/template/compare code —
it extends the same measurement style and reuses the same reference audio
already on disk, and it does not introduce any new form of Claude "listening":
the existing rule stands — no tool lets Claude hear audio, only measure it.

## Terminology (precise, to avoid the overclaiming this codebase is careful about)

- **Per-track measurement** (not "mixing"): extending Compare sounds with more
  metrics. Still diagnostic-only, still human/Claude-reviewed before any
  device parameter changes, applied the same way today's fader edits are
  (`bridge/mixer_preview.py`): an explicit value, verified before and after.
- **Mastering**: the new final-mix stage — bounce, match to reference, gate
  against release-readiness thresholds. This is the only stage that produces
  a deliverable file.
- **"Release ready"** is never an unconditional claim. Every report in this
  module carries a `limitations` array and a `status`, the same pattern
  `sound_comparison.py` already uses. A passing QA gate means "no measured
  problem found," not "this sounds good."

## Non-goals

- No autonomous auto-correction loop. Nothing in this module computes a
  correction and silently applies it to an Ableton device. Every apply is an
  explicit value change through the existing tool-call pattern, verified
  before/after, exactly like current fader edits.
- No new "Claude listens to audio" capability. Perceptual judgment stays with
  the human, via existing audition players.
- No change to the reference upload/stem/timing/template pipeline.
- No Windows support (Bridge mastering deps are macOS-first, matching the
  rest of Bridge's current scope).

## Architecture

Same split as the rest of BeatMind: measurement and rendering that touch real
audio files happen in the **Bridge** (local, on the user's Mac); Claude drives
it through new tool calls over the existing WebSocket/OSC channel, the same
way it drives `audition_part` today.

```
Claude (cloud)
   │ tool calls: measure_track, detect_masking, bounce_master, master_track, check_release
   ▼
Bridge (local)
   ├─ backend/loudness_measurement.py   (new: extends sound_comparison's bounded-measurement
   │                                     style with LUFS/LRA/true-peak, subprocess-isolated)
   ├─ backend/masking_detector.py       (new: STFT energy-overlap across simultaneous tracks)
   ├─ bridge/master_bounce.py           (new: renders the full master bus to a WAV,
   │                                     same solo/mute/transport-restore discipline as audio_preview.py)
   ├─ backend/mastering.py              (new: shells out to an isolated Matchering process,
   │                                     target = bounced master, reference = the same
   │                                     reference track already on disk from the reference
   │                                     workflow)
   └─ backend/release_gate.py           (new: FFmpeg loudnorm two-pass + aphasemeter,
                                          streaming-normalization preview, structured pass/fail)
```

Matchering is GPL-3.0. It runs as an isolated subprocess in its own venv
(mirroring how `sound_comparison.run()` already shells out to a subprocess
with a hard timeout and its own env) — never imported into BeatMind's own
process, so BeatMind's own license posture is unaffected.

## Components

### 1. Loudness/true-peak/phase measurement (`loudness_measurement.py`)

Extends the existing `measure()`/`compare_arrays()` pattern in
`sound_comparison.py` — same bounded style (numpy/scipy, no ML, explicit
`limitations`), adding:
- Integrated LUFS and LRA (ITU-R BS.1770-4, via `pyloudnorm` — MIT, pure
  Python, no new native dependency risk).
- True-peak (inter-sample peak) via 4x oversampling, the same check
  `libebur128` and FFmpeg's own `ebur128` implement, done directly in numpy
  to avoid adding a second native dependency alongside Matchering.
- Phase/mono correlation via FFmpeg's `aphasemeter` filter, invoked the same
  subprocess-with-timeout way `render_comparison()` already invokes `ffmpeg`.

Called on: each part's audition recording (per-track measurement, surfaced in
the same Compare sounds report), and on the bounced master (mastering stage).

### 2. Masking detector (`masking_detector.py`)

New — no maintained open-source equivalent exists (confirmed by research: only
unrelated ML-training "frequency masking augmentation" tools surfaced).
Takes N simultaneous track recordings for the same time window (capturing all
non-muted tracks unsoloed, reusing `audio_preview.py`'s capture path), computes
per-critical-band energy via STFT (same `scipy.signal.stft` already used in
`sound_comparison.measure()`), and flags any band where two or more tracks
each hold >X% of the total energy in that band at the same time — a genuine
gap this module has to fill itself rather than adopt.

Output is advisory notes only ("Bass and kick both dominate 60-120Hz during
bars 9-16"), not an automatic EQ change.

### 3. Master bounce (`bridge/master_bounce.py`)

New Bridge capability. No full-mixdown render exists today — `audio_preview.py`
only solos and captures one track/scene. This renders the master bus across a
requested arrangement range, with the same safety discipline
`mixer_preview.py`/`audio_preview.py` already use: verify transport stopped,
verify no unexpected mute/solo state, restore all track states afterward,
refuse (not guess) on a silent render.

### 4. Mastering pass (`mastering.py`)

Input: the bounced master, plus the reference track's audio file (the one
already uploaded and stem-separated in the reference workflow — no new upload
step). Runs the isolated Matchering subprocess (target=master, reference=that
file), returns the matched master plus Matchering's own reported gain/EQ
delta. This is explicitly presented as one candidate, not a final artifact —
it still has to pass the release gate.

### 5. Release gate (`release_gate.py`)

Pass/fail, not advisory, on:
- Integrated LUFS within a configurable target band (streaming default: -14
  LUFS ±1) and true-peak ≤ -1 dBTP — via FFmpeg two-pass `loudnorm`.
- No inter-sample clipping, no DC offset.
- Mono compatibility (phase correlation via `aphasemeter` doesn't fall below
  a configurable threshold).
- **Streaming-normalization preview**: simulate each platform's own turn-down
  (Spotify/YouTube/Apple each renormalize toward roughly -14 LUFS) and
  re-check true-peak after that gain change — the one check no open-source
  tool provides, implemented as straightforward gain math on top of the LUFS
  figure already measured, not a new dependency.

A failing gate reports which specific metric failed, its measured value, and
its target — never a vague "needs work." A passing gate still ships with the
same `limitations` framing as the rest of this module: it did not judge
tone, arrangement, or creative quality.

## Data flow

```
1. Reference track already uploaded & stem-separated (existing workflow) — reused as-is.
2. Per-track loop (existing "build a part" loop, extended):
   describe_sound → audition_part → [NEW] measure_track (loudness_measurement)
   → Compare sounds report now includes LUFS/true-peak/phase alongside
     existing RMS/crest/spectrum → Claude/user decide on an explicit device
     value change → applied via existing automate_parameter/mixer_preview,
     re-verified, same as today.
3. [NEW] detect_masking across all built tracks once arrangement is stable →
   advisory notes surfaced in chat, same non-blocking pattern.
4. [NEW] bounce_master → master_track (Matchering vs. reference) →
   check_release (release gate).
5. Pass → deliverable master file handed back with its full measurement
   report. Fail → specific failing metric(s) reported; loop back to step 2
   (per-track) or step 4 (re-master) as appropriate — never auto-retried
   silently.
```

## Error handling

- Every new subprocess call (Matchering, ffmpeg loudnorm/aphasemeter) follows
  `sound_comparison.run()`'s existing pattern exactly: hard timeout,
  process-group kill on timeout, structured error surfaced (never silent
  fallback), "no Ableton/file changes were made" stated explicitly on
  failure where relevant.
- Master bounce failure (silent render, transport not stopped, unexpected
  mute/solo state) refuses rather than guesses, same as `audio_preview.py`.
- Matchering subprocess isolation means a Matchering crash/bad-install can
  never take down the main Bridge process.
- Missing or incompatible reference audio (wrong channel count, too short)
  is validated before any processing starts, reusing `reference_limits.py`'s
  existing bounds where applicable.

## Testing

- Extend the existing `sound_comparison` test style (bounded numeric
  assertions, not perceptual claims) to the new loudness/true-peak/phase
  functions, validated against the **EBU Tech 3341** conformance test vectors
  — the actual standard test suite for loudness meters — so the LUFS/true-peak
  numbers are provably correct, not just "looks plausible."
- Golden fixture: one reference track + one set of built stems with
  hand-verified expected loudness/masking output, regression-tested the same
  way MixMind's "Clean-key golden test" pins expected output.
- Packaging: Matchering's dependencies (scipy/numpy/soundfile) and the
  bundled `ffmpeg` binary must be verified in the **packaged** Bridge
  installer, not just dev env — this class of bug (native/audio deps missing
  from a packaged build) has already bitten this account once (MixMind's
  libSDL2/Demucs bundling gap).

## Open dependencies / risks

- Matchering must be packaged in its own isolated venv inside the Bridge
  installer; this is new packaging surface, flagged for the implementation
  plan to size properly.
- No maintained open-source library exists for masking detection or
  streaming-normalization preview — both are small custom builds on
  primitives already in this codebase (STFT, LUFS), not external
  dependencies, but they are net-new logic with no reference implementation
  to lean on.
