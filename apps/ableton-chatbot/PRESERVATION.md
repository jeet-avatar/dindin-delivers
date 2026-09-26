# BeatMind Development Checkpoint

Checkpoint date: September 25, 2026.

## What Is Preserved

This checkpoint includes the backend, frontend, bridge source, native audio
capture source, tests, dependency manifests and root deployment workflow.
Local session experiments are archived under `experiments/2026-09-25/` as
non-executable `.py.txt` files. They are evidence and development references,
not production entry points. They contain machine-specific paths and assumptions.
Do not execute them blindly or ship them as the application workflow.

Secrets, local databases, uploaded music, separated stems, virtual environments,
build outputs and installers are not source code and are not in this checkpoint.
Music projects remain separately under `~/Music/BeatMind Projects/`.

## Verified Versus Pending

- See `REFERENCE_AUDIO_TEST_RESULTS.md` for the prior local test results and
  their limitations. A source checkpoint is not a fresh test pass.
- The saved reference is `Leap of Faith - Wo-Core Project/Leap of Faith - Ready.als`.
  Its stem playback was captured and measured locally.
- A separate `Original Groove - 122 BPM Project/Original Groove - Writing Template.als`
  was created without reference audio and opened in Live.
- Operator loaded on its bass track. Triangle waveform, filter frequency,
  resonance, attack and decay were read back. The next sustain operation failed
  because the mapping did not support its display unit. That attempt stopped
  before MIDI creation or audio capture. The bass audition is NOT verified.
- `beatmind-leap-project.py.txt` is an earlier prototype with known media-path
  and cloned-ID problems; do not use it to create new sets. The native repaired
  reference was used for the later writing template.
- Native Arrangement construction performed in this session is not yet a
  general, end-to-end-tested chat feature. Preserve the learning; integrate it
  with session identity, review gates, provenance and readback before release.

## Release Requirements

1. Review the checkpoint diff and merge the intended application changes into
   the release branch. Include new source files, tests and lockfiles, not just
   modifications to files that were already tracked.
2. Run backend regression tests, frontend tests and the production build from
   that exact revision. Record the revision and results.
3. Replace the exposed test API key through secret configuration. Never commit
   an `.env`, credentials, authentication tokens or customer recordings.
4. Before enabling reference separation in production, build and test its ML
   dependencies, persistent storage and single-worker job behavior. The current
   API Dockerfile does not install `requirements-reference.txt`.
5. Test upload, analysis, timing review, fresh-set preservation, original sound
   creation, actual captured playback and user approval through the chat UI.
   Unsupported controls and partial writes must stop safely without duplication.
6. Build/sign/test the bridge separately when its source changes. The web/API
   workflow does not publish a new installed bridge automatically.
7. Deploy a reviewed immutable revision with a rollback reference. Confirm the
   browser, API and installed bridge versions and perform a production smoke test.

No deployment is performed by creating this checkpoint. Local Git references and
backup bundles are not off-machine backups until transferred to a private remote
or approved backup location. Do not push to `main` merely to back up work: the
root deployment workflow runs automatically for BeatMind changes on that branch.

## Continuation: First Bass Audition

- Initial checkpoint `9c86c6b8461c64a002b5eaa1e1cc74ed9322f25e` was pushed
  to `origin/checkpoint/beatmind-20260925-210546`, and the remote hash matched.
  This branch does not trigger the production workflow.
- The failed sustain adjustment was omitted, leaving the observed 0.0 dB
  sustain unchanged. Other listed patch controls, including 110 ms release,
  passed readback. This is not a fix for unsupported dB display conversion.
- The audition script now compares note tuples independently of Live's pitch
  ordering. Its `audition` mode verifies the existing named 32-beat clip and
  all 30 expected notes without creating a clip or adding notes again.
- Actual Live output capture passed: 17.04 seconds, stereo 48 kHz,
  peak -21.88 dBFS, RMS -31.21 dBFS. The captured file was played with `afplay`.
  Browser playback, subjective sound quality and user approval remain unverified.
- Native Save As created `Original Groove - Bass 01 Project/Original Groove - Bass 01.als`.
  Saved XML verification found one track MIDI clip with 30 notes, Operator,
  122 BPM, no AudioClips and no SampleRefs. The factory groove-pool clip is
  separate from the musical track clip.
- The bass is a Session audition. The Arrangement still has no musical clips;
  estimated section locators are retained, not a completed arrangement.
- This continuation did not rerun the application regression suite or deploy
  application/bridge changes. Human approval is still pending before the next part.

## Speaker Audibility Follow-up

- User confirmed the test tone was audible but the bass was not. Session clip
  playback, Main routing and MacBook speaker selection were verified; switching
  views was not the observed cause.
- The first level-check recording had 99.985% of mono spectral energy below
  120 Hz. Operator volume was independently read back at -14 dB. Signal presence
  alone had not established speaker audibility.
- Saved `Original Groove - Bass 01 - Before Audibility.als` before patch changes.
  Changed the discovered waveform to Saw 6, filter slope to 12 dB and cutoff to
  899 Hz (900 Hz requested). MIDI notes and rhythm were unchanged.
- New actual Live capture: 8.52 seconds, stereo 48 kHz, peak -12.08 dBFS,
  RMS -22.11 dBFS; 14.361% of mono spectral energy above 120 Hz.
  These are recording measurements, not a guarantee of perceived speaker loudness.
- Saved the revised set and left its Session bass clip playing for user review.
  The one-off procedure is archived as `beatmind-bass-audibility.py.txt`;
  no automatic app-level speaker compensation has been implemented or deployed.

## Kick and Bass Continuation

- User confirmed the revised bass could be heard and asked to build the song
  one part at a time, following the previously selected reference's template
  with original sounds. Added only a DS Kick part, using the discovered installed
  synth. No extracted reference sample or loop was used.
- Eight-bar quarter-note pattern: 32 hits with repeating 104/99/102/98 velocity.
  Verified exposed Decay 28%, Env 42%, overdrive 8.01%, Overtone 12%, Click On.
  Native track fader 0.75 was independently read back; it is not a dB value.
- First solo capture had signal but returned partial because restoring a long
  Session playback position exceeded Live's song length. The error remains in
  `kick-01-first-audition-partial.json`. Reset the stopped playhead to zero and
  re-auditioned the existing clip without recreating notes. The repeat passed,
  peak -10.48 dBFS and RMS -22.50 dBFS. The general restoration edge case is not
  fixed in application code by this manual recovery.
- Combined actual Live recording passed: 8.5 seconds, peak -9.09 dBFS,
  RMS -19.24 dBFS. Both Session clips were checked playing.
- Saved `Original Groove - Kick and Bass.als` in the existing writing project.
  The original bass checkpoint and before-kick backup remain preserved.
- `TRACK-PLAN.md` records the one-part review sequence. Kick approval is pending;
  hats, other percussion, chords, lead, transitions and Arrangement are not built.

## Reference Effects Study 01

- User said the kick/bass sounded good and requested reference-guided effects
  comparison. Audio-capable listening completed drums and bass at 00:32-00:44
  and the reference mix at 01:10-01:22. Observations are model interpretations,
  not verified effect identities or whole-track coverage.
- Backed up the current writing set and added one Saturator after Operator:
  Soft Sine, 4.0 dB drive, 35% wet, Color Off, default output 0.0 dB.
  Changed controls were independently read back. Kick and MIDI were untouched.
- Captured fresh dry and processed kick/bass playback from Live. Constant-gain
  listening copies and the reference drums+bass excerpt measured -23.00 LUFS.
  All three true peaks remained below -12 dBTP. No comparison limiter was used.
- Saved the writing set with saturation active, pending the user's A/B choice.
  Before-effect set and recordings remain available. The effects notes explicitly
  separate observations, uncertain explanations and the proposed experiment.
- This remains a manual local study; no automatic effect-detection feature or
  application deployment was performed.

## Third Part: Closed Hat

- User requested the third musical part. Preserved a before-hats set, then
  loaded the discovered DS HH synth into the previously empty third track.
- New eight-bar pattern has 42 notes: accented offbeats, quiet pickups and
  selected offbeats delayed 0.016 beats (7.87 ms at 122 BPM). All notes read back;
  existing kick/bass MIDI was independently checked unchanged.
- Verified Pink noise, Decay 8.99%, Pitch 45%, Tone native 75. Track fader native
  0.72 was read back; no inferred dB conversion. No new sends/effects added.
- Solo actual audio capture passed: peak -13.68 dBFS, RMS -38.57 dBFS. Short
  high-frequency transients are not a sustained signal; user audibility and
  tone approval remain distinct from those measurements.
- Combined kick/bass/hat capture passed: 8.5 seconds, peak -6.58 dBFS,
  RMS -17.09 dBFS. The fourth synth placeholder remains empty.
- Saved `Original Groove - Kick Bass Hats.als` as a new working version. Previous
  writing/reference checkpoints remain. Bass saturation was left unchanged,
  not marked approved merely because the user requested the next part.
- Full Arrangement construction remains pending; these are Session clips.
