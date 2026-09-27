# Polling Recovery And Feel Inside Verification

## Release

- Frontend source: `8cd92d7200107e3ecf9c9cf57197843c5629b0ee`, pushed to `release/beatmind-audio-20260926`.
- Website archive: `s3://beatmind-frontend/releases/web/8cd92d72/`.
- CloudFront invalidation `IAH10YN1TFXJX7OHDZV941BFTS` completed; public release manifest verified.
- Backend remains `beatmind-api:27`, source `86796f6a48fe2ca49f22761a0bfa77e530b3f056`. No service restart interrupted analysis.
- All seven changed/new source and test files mirrored into the original workspace and hash-verified.

## Findings And Fix

The earlier Feel Inside request returned HTTP 408 while receiving the upload, before stem separation. Its incomplete upload was removed by existing cleanup. This establishes an upload timeout, not its underlying network cause.

A fresh production browser upload of the same local MP3 succeeded in about 21 seconds. Subsequent monitoring encountered HTTP 429. Logs showed concurrent reference, recording and Bridge polling exhausting the shared IP request allowance. Hidden dashboard tabs previously continued polling every four or five seconds.

Hidden tabs now pause background polling and refresh when visible. A 429 establishes a shared cross-tab polling cooldown, honoring an exposed Retry-After header or using 60 seconds otherwise. Mutating requests are not automatically retried and server protections are unchanged. Reference polling errors are separate from upload errors and clear after a successful status refresh.

## Verification

- Ten frontend unit suites and production build passed.
- New browser checks passed locally and against deployed assets: hidden-tab silence, visibility resumption, coordinated 429 cooldown and recovery.
- Desktop/mobile reference replacement tests passed locally and against deployed assets. Song-project, first-command and sound-review browser regressions passed locally.
- Real source: `Downloads/Beatport/Feel.Inside..GMJ.Progressive.House.121.mp3`, 18,715,625 bytes.
- Saved production reference: `29dcdefe774c464a856d210a7c6e7cd7`, ready at 2026-09-27 05:34:23 UTC (Sep 26, 10:34 PM PDT).
- Full decoded duration: 452.2314 seconds. Original mix and all four stems loaded through the actual frontend, decoded and played for over one second each with no browser media error. RMS values: mix 0.335721, drums 0.302760, bass 0.078624, vocals 0.058181, other 0.070748.
- The reference was preserved, not deleted as a test fixture. Verification resumed the existing upload rather than creating a duplicate. Existing Disconnection and historical QA references were unchanged.
- A read-only one-off ECS diagnostic confirmed the separator completed in about ten minutes. Diagnostic task `4ef0bef27fc84ec7815cadab274c897b` stopped with exit 0. No diagnostic task remains running.
- No paid AI listening, stem approval, song reference reassignment or Ableton commands were performed.

## Next Step

Open References, expand Choose a saved reference when shown, and select Feel Inside. Listen to the estimated stems and review their quality before confirming timing or creating an original template. Successful decoding/playback does not certify perceptual separation quality, inferred tempo/key, or sound at the user's physical speakers.
