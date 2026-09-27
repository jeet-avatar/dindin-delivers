# Reference Replacement Release

## Deployed

- Backend source: `a2d49f496f9a890b867798b6188572592907b5e1`.
- Frontend source: `9d2bb9e21f65f6d346a292cbb20c1ffd1791572e`.
- ECS: `beatmind-api:26`, task `b25c3339d7c84cf289c5a243adf376af`, rollout completed.
- Image: `musai-api@sha256:372ad415196e1d8a16ed7e46222bec24a82a1250983e3b906ff7442924cebc3e`.
- Website archive: `s3://beatmind-frontend/releases/web/9d2bb9e2/`.
- CloudFront invalidation: `I27CKOBUFQ3MQT6N0Y7YYMDAHR`, completed.
- Database path, DELETE journal mode, secret references and Bridge installer preserved. Service deployment limits and drain timeout restored.

## Actual Failure

The old frontend rejected files above 50 MB before uploading, but left the previous reference selected. Its waveform, listening notes and approval controls remained visible beneath the error. Browser restoration could also restore an obsolete reference ID without checking the server. Earlier empty-upload tests did not cover this replacement case.

## Fixes

- Choosing a replacement clears the song's prior reference before upload, resets file-specific consent and hides the prior analysis/audio. Upload rejection does not fall back to the old reference.
- Upload and attachment are separate stages. A failed attachment can be retried without sending the file twice.
- Leaving the reference view cancels an in-flight upload request and prevents its late response attaching to another view.
- Saved song startup refreshes reference metadata from the server before enabling production. Stale local QA selections cannot override a cleared server reference.
- Shared backend ingress/stream limits increased to 250 MB, with a five-minute upload timeout. The frontend reads capability limits from the server. The 5-second to 10-minute audio duration bounds remain unchanged.
- Cleared only the QA reference links in two empty, unbound New song drafts: `2ec59a62-89d3-4466-8e5b-526cd5e71cfb` and `892d98b4-4d37-4194-8c1e-8bcb3814283f`. Their messages and Ableton bindings were empty. Existing songs and the historical reference file were preserved.

## Verification

- 217 backend tests, including an actual 51 MB request body and unchanged chat/auth/body restrictions. Eleven reference tests also passed in the Linux release container.
- Nine frontend suites, production build, desktop/mobile song workflows, approval and first-command tests passed.
- New replacement browser tests passed at 1440px and 390px locally and against deployed assets: selected QA followed by oversize rejection, stale local cache after reload, failed upload, failed attachment/retry, consent reset and navigation during upload.
- Actual signed-in production test confirmed a stale local QA ID is replaced by the cleared server reference, with zero audio players.
- Two temporary 54,535,828-byte WAV uploads reached production and completed real server analysis. The fixture contains six seconds of original synthesized audio plus a valid RIFF JUNK chunk to exercise the >50 MB transport boundary; this does not certify analysis of a full ten-minute song.
- Final fixture `b2b5ccd529ee4d82815888eb3e15a8f7` produced drums/bass/vocals/other estimated stems. Browser-decoded mix duration: 6 seconds; RMS: 0.0363905962. No paid AI listening or Ableton commands were sent.
- Initial automation hit Playwright's remote-file transfer cap, then Chrome inspector response eviction. The test now uses local CDP file selection and durable API metadata. A later observer interfered with an isolated browser context; verification resumed from the already-completed upload instead of recreating it.
- Both temporary test references (`11e54de80c4b4eacbb984dd34ed00c9a`, `b2b5ccd529ee4d82815888eb3e15a8f7`) were deleted after identity/status checks. No temporary upload was attached to a production song.
- The user's oversized source file was not available in the inspected browser. The user must refresh and select it again. This release does not claim their particular song was uploaded or analyzed.
