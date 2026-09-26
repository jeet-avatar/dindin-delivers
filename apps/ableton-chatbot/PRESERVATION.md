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

## Fourth Part: Clap

- User approved the hat groove and requested another part. Preserved a
  before-clap set and used the confirmed empty fourth track for DS Clap.
- Created 16 hits across eight bars on beats two/four, delayed 0.012 beats
  (5.9 ms at 122 BPM), velocities 78-86. Existing three parts' MIDI read back
  unchanged. No reference samples or added delay/reverb were used.
- Readback settings: Decay 24%, Sloppy native 12, Spread 45%, Tail native 35,
  Tone 40%. Spread rounded a continuous setter to an integer and the strict
  native-value verifier rejected it. Inspected the applied value before resuming
  only remaining controls. No duplicate device or clip was created. This does
  not fix the general rounded-parameter mapping edge case in the bridge.
- Initial solo capture was too forward; retained it separately and reduced
  the clap device output to a read-back -14 dB. New solo capture passed,
  peak -19.82 dBFS; subjective clap level remains for user review.
- Combined four-part actual audio capture passed: 8.48 seconds, peak -6.18 dBFS,
  RMS -17.08 dBFS. All four clips were checked playing.
- Saved `Original Groove - Rhythm Section.als`. The earlier kick/bass/hat version
  remains. The current Arrangement is still empty; these are Session auditions.

## Fifth and Sixth Parts: Keys and Atmosphere

- User requested closer reference-inspired character, then requested a further
  part while keys verification was finishing. Model listening to Other and mix
  excerpts at 01:50-02:06 suggested plucked foreground and sustained background
  textures. These are uncertain interpretations, not recovered notes or plugins.
- Added track 5: Operator + Echo, 50 newly authored notes across eight bars.
  Four changing C-minor-compatible voicings support the existing bass. Saw 4,
  1.80 kHz filter, 6 ms attack, 420 ms decay, -40 dB sustain, 260 ms release.
  Dotted-eighth ping-pong echo, 24% feedback, 18% wet, 250 Hz-3.50 kHz filtering.
- Keys solo capture passed: 17.04 seconds, peak -14.31 dBFS. Five-part capture
  passed at peak -6.21 dBFS. Saved `Original Groove - Rhythm and Keys.als` and
  verified saved note counts [32, 30, 42, 16, 50] before proceeding to the pad.
- Added track 6: Drift + Reverb, 12 sustained notes in original supporting
  voicings. HP 180 Hz, LP 1.40 kHz, attack 420 ms, sustain 65%, release 1.80 s,
  spread 35%. Reverb predelay 25 ms, decay 3.20 s, wet 24%.
- Pad solo capture passed: peak -11.76 dBFS, RMS -24.36 dBFS. Six-part capture
  passed: 17.04 seconds, peak -4.95 dBFS, RMS -16.32 dBFS. Previous parts' MIDI
  was checked unchanged at each addition; effect controls independently read back.
- Saved `Original Groove - Keys and Atmosphere.als`. Reference and before-keys /
  before-pad checkpoints remain. All six parts are Session clips; no Arrangement
  clips, song completion or exact reference match is claimed. Subjective review
  remains pending for the two new parts. No application deployment occurred.

## Seventh Part: Lead

- Added YOUR Lead with Drift + Echo and 16 original notes across eight bars.
  Triangle oscillator; HP 150 Hz, LP 3.20 kHz; attack 18 ms, decay 899 ms,
  sustain 55%, release 450 ms. Quarter-note ping-pong Echo: feedback 22%,
  wet 14%, HP 400 Hz, LP 4.50 kHz. Controls independently read back.
- Earlier six parts' MIDI verified unchanged. Solo actual capture had signal,
  peak -27.96 dBFS / RMS -40.89 dBFS. Quiet lead balance needs subjective review.
- Seven-part capture passed: 17.02 seconds, peak -4.77 dBFS, RMS -16.30 dBFS.
  All seven clips checked playing. Saved Original Groove - Ensemble 01.als and
  parsed saved MIDI counts [32, 30, 42, 16, 50, 12, 16]; no audio clips.
- Previous reference and writing checkpoints retained. Kick delay and bass/pad
  sidechain were discussed, not applied. Session loops are not a full Arrangement.
- Archived local scripts as non-executable experimental text, not production
  automation. No application deployment or application regression test claimed.

## Kick Reverb and Delay

- Preserved the dry seven-part checkpoint and before-state data. Used existing
  unused A-Reverb and B-Delay returns; no other instruments feed these returns.
- Reverb: decay 400 ms, predelay 20 ms, low/high input cuts enabled, filter
  frequency 1 kHz / width 4.6. Delay: linked eighth notes, 12% feedback, zero
  offsets, enabled filter at 1 kHz / width 4. Both returns remain 100% wet.
- Used AX display-unit controls with independent value readback because the
  current unit-aware OSC mapper does not support return-track device paths.
  This local workaround is not a shipped return-track mapping feature.
- Initial sends were too low; captures preserved. Final sends read back at
  -10 dB reverb / -18 dB delay via AX linear amplitudes and OSC native 0.75/0.55.
  Dry kick level unchanged. Return-only captures verified both signal paths
  separately, restoring Main routing and all temporary mutes afterward.
- Final return-only peaks: reverb -45.70 dBFS, delay -32.89 dBFS. The room layer
  remains light; subjective musical improvement is not proven by these tests.
- Final full actual capture: 8.50 seconds, peak -4.80 dBFS, RMS -16.27 dBFS.
  All seven clips playing; notes, faders and other instruments' sends unchanged.
- Saved Original Groove - Kick Space 01.als and verified all 198 MIDI notes,
  seven Session clips, two return devices and zero audio clips in the saved set.
  No sidechain or additional Drum Rack added; those remain separate decisions.
- Archived script syntax checked. This was a local music experiment, not an
  application deployment, and application regression tests were not rerun.

## Eighth Part: Dub Percussion

- Added YOUR Dub Percussion with the exact discovered 64 Pads Dub Techno Kit
  from Drum Essentials. Preserved before-dub checkpoint and state snapshot.
- Full rack tree exceeded UDP response size after a successful load. Confirmed
  only one named instrument, then saved natively and parsed actual pad mappings
  from saved XML. No duplicate load, guessed GM mapping or claim of a general
  bridge fix. The production device-tree size limitation remains unresolved.
- Wood Dub / Stick Unv Dub / A-Shaker 1 receive MIDI 73 / 89 / 63. Created
  30 original notes over eight bars, velocities 35-61, small 5-9 ms offsets.
  No additional kick or chord loop. Macro readbacks: cutoff 6.50 kHz,
  Overdrive 3.00 dB (actual minimum), Glue 10 native, Comp 5%, Delay 6%,
  Reverb 12%. A 1 dB Overdrive request was rejected without writing, then
  inspected before using the observed minimum. Earlier seven parts unchanged.
- Solo actual audio: peak -15.10 dBFS, RMS -35.14 dBFS, 17.04 seconds.
  Eight-part actual audio: peak -4.84 dBFS, RMS -16.25 dBFS, 17.02 seconds.
- Saved Original Groove - Dub Percussion 01.als, native Collect All and Save
  including factory media. Verified all 64 referenced rack samples present
  inside the project, eight Session clips and 228 MIDI notes. All eight clips
  left playing. No full Arrangement, sidechain or subjective approval claimed.
- Experiment script syntax checked and archived. No application deployment or
  application regression test run; local Ableton recordings remain outside Git.

## Full Arrangement and Timing Verification

- Created separate Original Groove - Full Arrangement 02.als from the saved
  eight-part Session set: 92 Arrangement clips, 128 musical bars plus four-bar
  tail, 122 BPM, duration 259.672 seconds. Source Session clips retained.
- Added staggered entrances, sparse responses, two builds/main sections,
  breakdown, stripped outro, keys/pad filter automation, pad balance changes,
  and Main tail fade. No extracted reference music or new samples added.
- Found and corrected a real first-draft error: generation removed the source
  Swing 16ths 66 assignment. All arranged clips now preserve groove ID 4.
  Native OSC readback checks all clip starts and lengths; structured checks
  confirm shared loop origin, eight-bar alignment and non-overlap. Old draft
  renamed Superseded Draft 01; original Session and before-state files retained.
- Initial section auditions restarted/resumed at unintended positions. Those
  captures are invalid as section evidence. A later continuous live capture
  made no transport changes and verified beat 302.482 -> 337.293, actual audio,
  no Session override, and active keys/pad automation. Playback started from
  bar 1 for the user, loop off, no muted/soloed tracks, Arrangement visible.
- Full native Main export: stereo 44.1 kHz 16-bit WAV with triangular dither,
  normalize off, render-as-loop off, 132 bars. 320 kbps MP3 derived without
  gain changes. Audio files remain local, not committed.
- Full render audit: duration within one sample of 528 beats, zero clipping,
  peak -4.78 dBFS, true peak -4.7 dBTP, -17.6 LUFS, LRA 7.8 LU. Musical
  sections all have signal; final-second RMS -96.33 dBFS. 64 intro low-band
  kick attacks have max relative deviation 2.87 ms and measured drift -0.41 ms.
- Preserved generator, continuous-output test, structured audio-audit script,
  arrangement manifest and measured audit as experiments. This does not deploy
  Arrangement editing into BeatMind chat or fix the production bridge's large
  rack UDP limit. No application regression suite run. Subjective user approval
  and release mastering are not claimed.
