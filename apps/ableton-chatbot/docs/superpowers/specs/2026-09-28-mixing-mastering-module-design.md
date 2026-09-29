# Reference-Informed Mixing and Mastering — Design (v2)

**This replaces the 2026-09-28 draft of this spec (commits `f4d5dcb9`,
`e0de10b1`).** That draft was written against a stale checkout of `main`.
BeatMind ships from release branches, and
`origin/release/beatmind-launch-20260928` already has a full mastering
pipeline the draft didn't know about. Re-scoped below to extend that
pipeline instead of duplicating it.

## What already exists (verified against the release branch, not assumed)

- **`mix_check` tool** (`backend/mix_check.py`) — full engineering checklist
  on a bounced full-mix preview: integrated LUFS + true peak (FFmpeg's own
  `ebur128` filter), low-end %, low-end mono correlation (the mono/club-
  translation check), mud/harshness band %, section energy arc (Build→Drop
  LUFS progression), balance-vs-kick, session safety. Read-only, every item
  has a concrete fix.
- **`apply_master_chain` tool** (`backend/master_chain.py`) — loads Ableton's
  own native Limiter on the Main track and sets its Ceiling/Gain from
  `measured_lufs`, via the real `beatmind_master` AbletonOSC extension,
  verified by readback. No external mastering engine involved.
- **`audition_scene`** — already bounces a full mix (and can preview
  transitions between two scenes). Full-mix rendering is not a gap.
- **`producer_profile.py`** — per-user preferences that override rulebook
  defaults, including `loudness_target_lufs` and `ceiling_dbtp`. This is
  what "producer requirement" means in this codebase, confirmed by the user.
- **`sound_comparison.py`** — per-part vs. reference-layer diagnostic (RMS,
  crest, spectral centroid, 6-band energy %, stereo side-energy %). Already
  reads either the reference's full mix or a specific stem
  (`ROOT/reference_id/{mix,drums,bass,vocals,other}.wav` — confirmed from
  `references.py`), it just doesn't measure loudness.
- **Loudness/true-peak measurement itself** (`loudness()`, via FFmpeg
  `ebur128`) and band-energy measurement (`band_shares()`) are real,
  working functions today — but they're defined as plain top-level
  functions **inside `mix_check.py`** (`mix_check.py:19` and `:44`), not in
  a separate `mastering.py` module. Corrected below; an earlier draft of
  this spec wrongly assumed a standalone `mastering.py` already existed.
- **`engineering_rules.py` / `get_engineering_rules`** — rulebooks (vocal,
  human_feel, drama, entrances, **interactions**) including masking guidance
  (kick vs. bass, vocal vs. synth, etc.) as producer-legible detect/fix rules.

None of this needs to be rebuilt, and no GPL dependency (Matchering) or new
Bridge/OSC capability is needed anywhere in this design — everything reuses
FFmpeg `ebur128` (already how `mastering.loudness()` measures LUFS/true
peak) and Ableton's own Limiter (already how mastering is applied).

**Branch note for the implementation plan:** all of the above lives on
`release/beatmind-launch-20260928`, not `main` — this repo's working folder
intentionally stays on `main` while BeatMind ships from release branches.
Implementation should branch from (or target) the release branch, not
`main`, or the files this spec extends won't be there.

## What's actually missing

1. `mix_check` / `apply_master_chain` use fixed or producer-profile defaults
   — never informed by the **actual uploaded reference track's** measured
   loudness/tonal balance. The reference workflow and the mastering system
   don't talk to each other today.
2. `sound_comparison.py` has no LUFS/true-peak, only RMS/crest/spectral/
   stereo — so per-part Compare sounds can't judge loudness against the
   reference.
3. **No per-stem mastering.** The reference is already separated into
   drums/bass/vocals/other; nothing compares the corresponding group of the
   user's own tracks against it.
4. `mix_check.py` and `master_chain.py` have **zero test coverage** — every
   other backend module in this repo has a `test_*.py`, these two don't.

## Goals

1. When a reference track is attached, `mix_check`'s loudness target comes
   from the reference's own measured LUFS instead of the fixed -14
   default — **but a `producer_profile.py` override still wins.** This is
   a *new*, real precedence chain, not a preservation of an existing one:
   today, `producer_profile` is only consulted by the LLM (per a system-
   prompt instruction telling it to read producer preferences and pass
   the value as `target_lufs`), and `main.py`'s dispatcher
   (`apps/ableton-chatbot/backend/main.py:996-999`) already collapses "no
   explicit `target_lufs` in the tool call" into the hardcoded constant
   `mix_check.TARGET_LUFS` *before* `mix_check.run()` ever sees it — so
   there is no code-level way today to tell "the LLM relayed a saved
   preference" apart from "no preference exists." This spec makes the
   precedence a real, testable, code-level chain (see Architecture).
2. Add LUFS/true-peak to `sound_comparison.measure()`'s report, so per-part
   Compare sounds includes loudness alongside its existing metrics.
3. Add per-stem-bus mastering: group the user's own Ableton tracks into the
   same four buses the reference uses (drums/bass/vocals/other), bounce
   each bus, and compare it to the reference's corresponding stem.
4. Close the test gap on `mix_check.py` and `master_chain.py`.

## Non-goals

- No Matchering, no external mastering engine, no new native dependency —
  everything reuses `mastering.loudness()` (FFmpeg `ebur128`) and the
  existing native-Ableton Limiter chain.
- No new Bridge/OSC capability. Bus-level bounces are built entirely from
  existing primitives (track mute state + `audition_scene`), described
  below.
- No autonomous auto-apply. `apply_master_chain`'s own tool description
  already requires the user to agree before it runs; this design doesn't
  loosen that gate, and bus comparison results are advisory only, same as
  today's per-part Compare sounds.
- No new frequency-masking-across-simultaneous-tracks detector.
  `mix_check`'s mud/harsh %, balance-vs-kick, and the `interactions`
  rulebook already give producer-usable masking guidance today. Not adding
  a parallel STFT overlap tool speculatively — if real use shows this
  isn't enough, that's a follow-up phase, not something to build now.

## Architecture

Backend-only (Python). Two of these are small, behavior-preserving
refactors of existing files (call out explicitly since a previous draft of
this spec got their status wrong); the rest are additive.

- **`backend/mastering.py`** (**new** — extracted, not pre-existing).
  `loudness()` and `band_shares()` move here unchanged (same signature,
  same behavior) from `mix_check.py`, which then imports them from their
  new location — this is a relocation, not a rewrite, so
  `test_sound_comparison.py`/`mix_check`'s own behavior is unaffected. Add
  `reference_targets(reference_id)` here too, reading
  `ROOT/reference_id/mix.wav` through the now-shared `loudness()`. This
  gives `mix_check.py`, `sound_comparison.py`, and the new
  `bus_mastering.py` one shared home for loudness measurement instead of
  duplicating it (three copies would violate this repo's own
  code-simplifier rules).
- **`backend/main.py`** (existing — dispatcher, real change required).
  Its `mix_check`/`apply_master_chain` call sites currently pass
  `tool_input.get("target_lufs", mix_check.TARGET_LUFS)` — collapsing "not
  explicitly requested" into the hardcoded default *before* `mix_check.run()`
  is called, which is what makes real precedence impossible today. Change
  this to pass `tool_input.get("target_lufs")` (may be `None`) plus the new
  `reference_id` from the tool call, and let `mix_check.run()` resolve the
  precedence itself (next bullet).
- **`backend/mix_check.run()`** (existing — signature change). Change
  `target_lufs=TARGET_LUFS` to `target_lufs=None`, add `reference_id=None`,
  and resolve in this order inside the function: (1) explicit `target_lufs`
  if given, (2) `producer_profile.stored(user_id).get("loudness_target_lufs")`
  — looked up here in code, not relied on from the LLM, (3)
  `mastering.reference_targets(reference_id)` if a reference is attached,
  (4) the `TARGET_LUFS` constant. This is a new, real, testable chain, not
  a preservation of existing behavior.
- **`backend/sound_comparison.measure()`** (existing) — add `lufs`/
  `true_peak_dbtp` to the returned dict via `mastering.loudness()` on the
  same decoded excerpt; extend `compare_arrays()`'s `next_checks` with one
  more note when the LUFS delta is large. Existing fields are unchanged, so
  this doesn't break `test_sound_comparison.py`'s current assertions.
- **`backend/bus_mastering.py`** (new — the one genuinely new module) —
  classifies the user's Ableton tracks into drums/bass/vocals/other by
  name (reusing the same substring-matching idiom `mix_check.py` already
  uses for kick/bass), mutes tracks outside the target bus via the
  existing `set_track_mute` tool, calls the existing `audition_scene` to
  bounce just that bus (`audition_scene`'s real implementation,
  `capture_scene()` in `bridge/audio_preview.py`, never touches mute state
  itself — it only clears solos and restores quantization/song-position —
  so this doesn't collide with `audition_scene`'s own restore logic),
  measures it with `mastering.loudness()` + `sound_comparison.measure()`,
  compares against `ROOT/reference_id/{bus}.wav`, and restores mute state.
  No new Bridge/OSC extension needed.
- **`backend/claude_tools.py`** — extend `mix_check`'s input schema with
  optional `reference_id`; add one new tool, `compare_bus_to_reference`,
  wrapping `bus_mastering.py`.

## Data flow

1. Reference track already uploaded and stem-separated (existing
   workflow) — `mix.wav` plus four stem files already on disk.
2. Per-part loop (unchanged): `describe_sound` → `audition_part` →
   Compare sounds, now reporting LUFS/true-peak delta alongside its
   existing metrics.
3. Once the arrangement is stable: for each bus, mute other tracks,
   `audition_scene`, measure, compare to the matching reference stem — a
   bus-level report (loudness delta, spectral band delta) surfaced in
   chat, advisory only.
4. Full mix: `audition_scene` → `mix_check(reference_id=...)` — loudness
   target now derived from the reference unless a producer-profile
   override or explicit value is set → address any fails → re-check.
5. `apply_master_chain(measured_lufs=..., target_lufs=<from step 4>)` —
   user-approved, unchanged from today.
6. Final `mix_check` re-run to confirm.

## Error handling

- Missing/incomplete reference stems (e.g., a stem review marked
  "needs-work" and never re-saved) — `bus_mastering.py` checks file
  existence the same way `sound_comparison.py` already does
  (`(directory / f'{layer}.wav').is_file()`) and fails clearly rather
  than guessing or substituting a different stem.
- A track name that matches no bus (e.g., "FX Riser") is reported as
  "unclassified" and excluded from bus comparison — never silently folded
  into the wrong bus.
- Mute-state restore follows the same before/after verification discipline
  `bridge/mixer_preview.py`/`bridge/audio_preview.py` already use on the
  Bridge side (genuine try/finally with readback-verified restore) —
  `mix_check.py` already proves backend code has direct OSC `query`/`send`
  access for mute state (`/live/track/get/mute`; `set_track_mute` maps to
  `/live/track/set/mute`), so `bus_mastering.py` doesn't need new Bridge
  code, just the same discipline applied from the backend side.

## Testing

- `test_mix_check.py`, `test_master_chain.py`: close the existing coverage
  gap, following `test_sound_comparison.py`'s existing style (fixture
  audio, bounded numeric assertions, not perceptual claims).
- `test_bus_mastering.py`: bus-classification correctness (track name →
  bus) as pure unit tests, plus mute/restore and measurement using the
  same fixture pattern as the other new tests.
- Regression: a reference track with a known LUFS/band profile produces a
  `mix_check` target within tolerance of that measured value.

## Open questions

- Bus classification by track name is a heuristic, the same one
  `mix_check.py`'s kick/bass detection already relies on — unusual or
  non-English track names may misclassify. A producer-facing manual bus
  override may be worth adding if this proves unreliable in practice; not
  building it preemptively.
