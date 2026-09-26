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
