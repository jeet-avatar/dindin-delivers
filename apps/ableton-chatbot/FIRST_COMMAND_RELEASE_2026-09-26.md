# First Command Workflow Fix

## Production

- Source commit: `5f6e213f0f14dc36d9101c87c843dd714a3df9fa`, pushed to `release/beatmind-audio-20260926`.
- Website: https://www.beatmind.io/dashboard
- Backend: `beatmind-api:25`, task `06ea01a4518f40648111923e33d7e834`; rollout completed.
- Image: `musai-api@sha256:7aadd1cac415badef885904f774a1231d35b3ec63636e0bc98986a34ec19b928`.
- Frontend archive: `s3://beatmind-frontend/releases/web/5f6e213f/`.
- CloudFront invalidation: `I4XGKSPMWBPNMQM54CP6UJ3BM3`, completed.
- Existing secret references, database path, DELETE journal mode and bridge installer preserved.
- Service deployment limits and target drain timeout restored after rollout.

## Diagnosis And Fix

- Reported bass request `c16e366c-d9f9-42c5-a56f-68fb6346355a` was interrupted after 11 actions. No notes or audition were created. The logs do not establish what triggered cancellation.
- It had no project metadata. A direct first chat request could bypass POST /api/chats and the guided song setup.
- New sessions now receive project metadata and read-only onboarding on both preparation and locked execution paths. Existing saved legacy conversations are not reset.
- Stream responses include project metadata so the browser can display the starting choices.
- Whole-song home starters create separate saved projects; the session-inspection starter retains the current conversation.
- Request lifecycle is persisted and rendered independently from individual action verification. Successful setup actions no longer hide interrupted production.
- Setup-only MIDI creation without verified notes or preview is labeled Instrument setup only. Part summaries include Ableton track numbers to distinguish duplicate names.

## Verification

- 215 backend tests passed; 15 project tests also passed inside the Linux release container with tests mounted read-only.
- Nine frontend regression suites and production build passed.
- Desktop and mobile browser checks passed for first-command isolation, interrupted history/stream/reload, song/reference workflow and sound approval without automatic continuation.
- First-command browser fixtures passed again against the deployed website at 1440px and 390px.
- Actual signed-in frontend request: `560dcfaf-04a8-409e-9d03-f9e87949fd3a`, named QA - First command workflow. Exact reported prompt returned a reference-or-own-idea question, with zero actions and no selected Live Set.
- Actual direct API first request: `5f143ed4-1d0a-4513-b657-35d369827bce`, named QA - Direct first-command gate. Same question, zero actions and durable new project metadata.
- Original request still reports interrupted and retains all 11 actions. No original music was replayed, recreated, renamed or deleted during this fix.

## Remaining Limits

- The original request renamed both the existing kick and the newly created instrument Bass. These existing Ableton changes were not silently corrected; inspect before resuming that conversation.
- This release fixes onboarding and status reporting, not the unknown interruption trigger or all model targeting errors. Full-song generation is not certified by these tests.
- Production Bridge authentication was lost during backend restart. Bridge was reopened; the user must reconnect before live music testing continues. The two new production tests above were planning-only, not connected audio auditions.
