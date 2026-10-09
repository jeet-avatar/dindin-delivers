# Reference Status Release

## Deployment

- Runtime frontend source: `912f976c0466836aac96d028bafb48521fc93635` (status implementation in `4a64929c`).
- Website archive: `s3://beatmind-frontend/releases/web/912f976c/`.
- CloudFront invalidation `I363NK5OH1MS03040ZGDZZYO05` completed; public manifest checked.
- Backend remains `beatmind-api:27`, source `86796f6a48fe2ca49f22761a0bfa77e530b3f056`. No restart or analysis interruption.
- Source and tests mirrored into the original workspace. Subsequent commits contain verification tests/documentation only.

## User-Facing Change

- Prominent file-specific status: Uploading audio, Confirming upload, Preparing audio, Separating stems, Analyzing your track, Ready to listen, Processing failed, or Current status not confirmed.
- Actual browser upload bytes and percentage through XMLHttpRequest upload events. Sending 100% does not mark the file accepted; the application waits for the server response.
- Processing steps, elapsed time and last successful server-check age. An active job whose status is over 30 seconds old or whose refresh failed is explicitly unconfirmed, not presented as confirmed progress.
- Ready state shows completed steps and a Listen to stems action. No autoplay or automatic approval.
- An observed job remains discoverable when it finishes, without automatically selecting a different reference. Replacing the selected file clears the previous completion notice.
- Lost upload confirmation is explicitly unknown. Automatic duplicate submission is blocked; saved references are exposed for inspection and the native picker permits deliberate reselection.
- Stage-level separation progress only. No invented worker percentage, ETA or assertion that a successful status GET proves the worker is advancing.

## Verification

- Production build and 12 frontend test suites passed, including native upload progress/confirmation separation, HTTP errors, navigation abort, stale status and failed/ready rendering.
- Desktop (1440px) and mobile (390px) browser status tests passed locally and against deployed assets: job discovery, named stages, elapsed/check time, refresh failure/recovery, completion CTA, failed analysis, held upload and lost confirmation without duplicate uploads.
- Reference replacement, song-project and polling regressions passed locally.
- Authenticated real production check of Full Moon (`083fdea186b140aa9ee6bd2c0eef66e0`) showed Ready to listen, four Done steps, no In progress step, and the server-check timestamp. Listen to stems opened the review view. Browser media metadata loaded: 397.377052 seconds, paused, no media error.
- Actual production screenshots inspected at desktop/mobile widths, with no horizontal overflow. Test made no mutating API requests, paid listening requests or Ableton changes.
- Existing Full Moon, Feel Inside, Disconnection and historical references were preserved. The previously inspected old browser tab was not reloaded or stripped of its file selection; already-open old tabs need a refresh to receive the new application code.
