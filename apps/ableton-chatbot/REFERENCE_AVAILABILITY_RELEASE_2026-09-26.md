# Reference Processing Availability Release

## Deployed

- Source: `86796f6a48fe2ca49f22761a0bfa77e530b3f056`, pushed to `release/beatmind-audio-20260926`.
- ECS task definition: `beatmind-api:27`; task `00531ca561a645109a2be5ad2eb069d7`; rollout completed, one running, zero pending.
- Image digest: `sha256:4afc18ea6bef845b006bccb90b9131d51adec2e59c7b8a1280273cc2bd57affd`.
- Website archive: `s3://beatmind-frontend/releases/web/86796f6a/`.
- CloudFront invalidation: `IAMX4JH96P7ZG4PIDJM0RK8U4K`, completed.
- Original workspace source/test copies hash-verified against the release.
- Existing database path, DELETE journal mode, audio secrets, Bridge installer and service deployment limits preserved. Target drain timeout restored to 300 seconds.

## Diagnosis And Change

Production logs showed accepted uploads followed by a second upload rejected with 409 while reference operations were running. The user's Disconnection reference completed analysis. Warming Up was not present among saved references. No evidence established a leaked lease; no lock file was removed and no worker was forcibly interrupted.

The upload UI previously presented the busy response as a persistent error without indicating when processing became available. The API now reports availability by probing the same cross-worker lease used for writes. Upload contention returns a structured, retryable 409 before the file is persisted. The browser retains the selected file and its consent, shows a waiting state and polls availability. The user explicitly retries when available; files are not automatically uploaded or queued. Other users' job names are not disclosed.

## Verification

- 220 backend tests passed; 17 reference/lease tests also passed in the Linux release container.
- Tested exclusion across processes, successful/failed/cancelled task release, upload handoff retaining the lease, no saved duplicate after 409, availability recovery and owner privacy.
- Nine frontend unit suites and production build passed.
- Desktop (1440px) and mobile (390px) replacement tests passed locally and against deployed assets: file/consent preservation, waiting state, polling recovery, no automatic upload, attachment retry and navigation cancellation. These browser regression tests use controlled API responses, not real production contention.
- Song-project, first-command and sound-review workflow browser tests also passed locally on both viewports.
- Authenticated production GET returned HTTP 200, `processing.busy=false`, the 250 MB limit and both existing references unchanged. Production health returned OK. The original browser tab was not reloaded, preserving its selected file.
- No new production test uploads, paid listening requests or Ableton commands were sent during this fix.

## User Action

Refresh the dashboard once to load the new UI, then select Warming Up again and confirm upload permission. Its upload and analysis have not yet been verified. Only one reference operation runs at a time; this release improves truthful availability and retry behavior, not processing parallelism.

