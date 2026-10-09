# BeatMind production deployment

This supersedes the local-only status in `RELEASE_CHECKPOINT_2026-09-26.md`.
Release branch: `release/beatmind-audio-20260926` (pushed to origin).

## Artifacts

- Initial website source: `1f38615100e3b87f032b1da549577d9d07c9bc6b`.
- Latest website source: `5b1ee20b98b584751f5e4a90757395964ff20738`:
  local/server chat entries are matched by session identity, not title; saved
  copies are preserved. Legacy browser indexes recover identity from snapshots.
- Backend correction: `9f45942c` (database journaling and regression tests).
- Backend image: `musai-api:beatmind-9f45942c`, digest
  `sha256:4a021487eb73d32cf0a1234843c7997bef939b66e489d0fca948131e6edb6b89`.
- ECS service: `dollor-production/beatmind-api-service`; task definition 21.
- Frontend: `s3://beatmind-frontend/`, CloudFront `E3F24X4TEVJ9X2`.
- Website invalidation: `IATK8GAA15ULQPULROYJYJ15EX` (completed).
- Final website invalidation: `I216TEMG8MUVA1KCNAPFJ7SAT5` (completed).
- Signed/notarized bridge remains at runtime commit `c60f22a6`.
- Audio listening is enabled; the rotated key is injected by Secrets Manager.
  Secret values were not printed or added to source.

## Backups

- Previous website: `s3://beatmind-frontend/releases/web-before-1f386151/`.
- Immutable website: `s3://beatmind-frontend/releases/web/1f386151/`.
- Latest immutable website: `s3://beatmind-frontend/releases/web/5b1ee20b/`.
- EFS backup: `/data/release-backups/20260926-1f386151/`.
  `beatmind.db` is a SQLite backup of the production `/data/musai.db`;
  restore to the production path, not the backup's filename.
  `user-content.tar.gz` contains other application data (not prior backups).
- Previous backend definition: `beatmind-api:19`. Do not blindly roll back its
  database code: it re-enables WAL on EFS. Stop writers and assess journal
  compatibility before a data or backend rollback.

## Verification

- 195 backend tests passed in a fresh declared-dependency environment.
- All five database migration/concurrency/rollback tests passed inside the exact
  non-root Linux amd64 release image, with networking disabled.
- Seven frontend regression test files passed; the latest production build
  passed TypeScript and exported 13 pages.
- Production assets passed isolated browser fixtures at 1440x1000 and 390x844:
  checking, connected, disconnected, launch timeout, errors/retry and signed-out.
  These fixtures mock API responses and are not real bridge verification.
- The browser fixture's accelerated-clock timeout was corrected by allowing
  mocked network responses to settle between ticks. No runtime UI was changed
  to conceal that test failure.
- Earlier committed image checks passed cached four-stem separation, non-silent
  comparison previews, account-owned chat storage and application startup.
- Four bounded real Bedrock prompt checks made no Ableton writes. These do not
  prove creative quality or a complete song-generation workflow.

## Production issue and correction

After the first rollout (task 20), health checks stayed green and the bridge
connected, but authenticated requests intermittently stalled beyond eight
seconds. Isolated database probes remained fast. The application nevertheless
configured WAL on an EFS database for every account lookup, an unsupported
network-filesystem configuration: https://www.sqlite.org/wal.html .

Task 21 changes the production database to DELETE journaling once at startup
and no longer sets journal mode for each request. The old application process
and diagnostic tasks were stopped before the migration. This removes the
unsupported configuration; production latency must be verified, not inferred
from health or unit tests alone.

## Live production results

- Task 21 reached COMPLETED rollout with one running task and no pending tasks.
  Temporary deployment/drain settings were restored to their previous values.
- After the database correction, ten real authenticated browser status requests
  returned HTTP 200 in 130-225 ms with no timeout. The bridge subsequently
  reauthenticated and returned `bridge_connected: true` for the signed-in user.
- Ten further real browser checks after audio/chat testing all returned connected
  in 123-509 ms. No timeout was observed in either post-correction sample.
- Actual signed-in browser checks passed Home, Downloads and chat at 1440x1000
  and 390x844: connected state, no visible installer prompt, no horizontal
  overflow and no browser page errors. These checks used the real API/bridge.
- A generated original six-second WAV was uploaded through the production
  References UI (HTTP 202). Four aligned estimated stems completed with signal
  integrity checks passed; quiet residual layers were identified as such.
- The frontend's audio player advanced to 1.14 seconds, unmuted at volume 1,
  with no media error. Decoded mix RMS was 0.06490 (non-silent). This verifies
  browser playback, not the listener's physical speaker setup or taste.
- One consented production `gpt-audio-1.5` request completed with 100% coverage,
  one of one six-second intervals passing validation. The notes described the
  repeated pulse and low bass, and explicitly expressed effect uncertainty.
- A new frontend chat made one read-only `get_session_state` action at 17:37
  PDT: 123 BPM, 4/4, 17 named tracks, eight unnamed scenes, stopped transport.
  Conversation and action history survived browser reload. No music writes ran.
- The final production refresh showed the QA conversation exactly once, while
  retaining both earlier conversations. Draft typing/restoration produced no
  React update-depth errors. Final desktop/mobile bridge fixtures passed against
  the newly published assets. `release.json` matches frontend `5b1ee20b` and
  backend `9f45942c` / task 21.

## Safety and outstanding verification

The finished Ableton set was not modified during deployment. A six-second
original synthetic fixture is available for production reference/audio tests;
it is not a commercial reference recording. The production QA reference remains
available in the signed-in user's References view. A new-part creation -> Live
audition -> acceptance test in a disposable set has not been completed in this
deployment. Do not describe the read-only inspection as that full write test.

Chat tools do not implement Arrangement timeline writing or full-song export.
Successful reference analysis cannot establish exact effect chains, perfect
stems, musical originality or user approval of the resulting sound.
