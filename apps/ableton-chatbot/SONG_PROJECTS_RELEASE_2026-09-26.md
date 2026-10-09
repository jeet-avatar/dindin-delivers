# Song Projects Production Release

## Deployment

- Website: https://www.beatmind.io/dashboard
- Branch: `release/beatmind-audio-20260926`, pushed to origin.
- Project workflow: `a5009a7c658e1141fa6601b2b9aa514cc1d8bf14`.
- Backend/CORS correction: `d64d3ba201ce8a7fdbd12f3a82399fc3f6853a84`.
- Frontend/native permission guidance: `dd050d7cb8e2422a8e7a0f4b89ee55419d1551b5`.
- ECS: `beatmind-api:24`, task `83af5e9d65a34627807d4baa4f136fe4`, rollout completed.
- Image: `musai-api@sha256:70d81b4271a7a0c7802343d33b0300746c5d9bc25209487b4bf773904e2ff3f3`.
- Website archive: `s3://beatmind-frontend/releases/web/dd050d7c/`.
- CloudFront invalidation: `I8AMSKTITTBD277ZAR49NVG07`, completed.
- Existing bridge installer unchanged. Database path and DELETE journal mode preserved.
- Service deployment settings and target drain delay restored after rollout.
- Scoped source changes mirrored into the original workspace after checking file hashes.

## Behavior

- Durable, owner-scoped new-song records; saved history is visible on the left, with a mobile drawer.
- New songs restore their own name, reference, conversation and explicitly selected Live Set.
- Reference-first or own-idea choice. Reference selection retains explicit external audio-listening consent.
- Reference discussion precedes estimated-stem review, timing confirmation and original-template approval.
- New-song production is server-gated until an Ableton set is selected; reference projects also require their reviews.
- Set selection only inspects/binds. It does not automatically send a production command.
- New project recordings are session-scoped, without inheriting old song approvals.
- Historical conversations and audio remain accessible. Opening history does not open an Ableton file.

## Verification

- 212 backend tests; 12 project/CORS tests also passed in the Linux release container.
- Nine frontend regression suites and production build passed.
- Desktop/mobile browser tests passed for song history, reference consent/restoration, native-permission failure handling, bridge state and non-executing sound approval.
- Real-account production initially exposed missing PATCH CORS permission. Fixed, regression-tested and redeployed; actual preflight returns 200.
- Created `QA - Reference-first workflow`; attached the existing original six-second QA reference, restored listening notes after reload and received a preference question with zero music actions.
- Actual reference playback advanced, decoded non-silent audio (RMS 0.06490), and had no media error.
- Created separate `QA - Deep Minimal 123`; onboarding asked genre/mood and retained no prior reference.
- macOS initially denied bridge Accessibility access. User enabled it; subsequent bridge inspection succeeded.
- Saved `Peak Bites - Dark Current 123 - Ready 02.als`; file timestamp advanced and gzip integrity passed before new-set music changes.
- Opened and confirmed a separate Untitled set. The user default template contained 13 tracks; cleanup ultimately read back one QA Kick track at 123 BPM.
- Kick request: ten actions, all observed/verified; exact Peak Bites one-shot loaded, four MIDI notes read back, clip looping checked, actual Ableton audio captured.
- Preview: `06df5d25521a41eebab5648bad91eeb6`, Track 1 / Scene 1, 8.554667 seconds, peak -9.8 dBFS.
- Browser playback advanced to 1.536689 seconds, unmuted, with no media error; decoded RMS 0.075315.
- Accept sound is enabled. Decision remains pending for the user; no second musical part was generated.

## Remaining Limits

- The disposable set is still Untitled; its chat and audition are durable, but the new Ableton set has not yet been saved as a named file.
- Default-template cleanup retains historical warnings: a missing-brief attempt was blocked; group deletion removed child tracks and failed the old single-track count expectation. The model reinspected and reached the requested final state. These logs were not erased or falsely relabeled verified.
- The basic session snapshot does not inspect clip contents or Arrangement. A model inspection summary overclaimed empty scenes/Arrangement; that claim is not certified by this test.
- Live Set matching currently uses its observed window title, not a persistent file identity. Identically titled sets remain an ambiguity.
- Musical taste still requires user listening/approval. Full arrangement/export and every production path are not certified by this release.
