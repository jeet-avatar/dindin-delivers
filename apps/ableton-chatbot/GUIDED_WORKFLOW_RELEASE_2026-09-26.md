# Guided workflow release

Runtime backend: `c3d622d5f5c3dcd84981eeb4e7d372671b78b2a8`.
Frontend: `56a28271d7209984bf6900002b5fe9d89a280ecc`.
Both pushed on `release/beatmind-audio-20260926` and deployed.
ECS task: `beatmind-api:22`; image digest:
`sha256:91b7ed2f073edab9922ba523dff52d92b98369bb123ba19859d9663ac4c65b52`.
Website artifact: `s3://beatmind-frontend/releases/web/56a28271/`.
CloudFront invalidation `I4AF0O8A9TGJBA2V22W043YULA` completed.
Rollback: backend task 21 and website artifact `releases/web/5b1ee20b/`.
Temporary ECS deployment and target-drain settings were restored.

## Changes

- Acceptance persists a decision without requesting another model turn, pauses
  the preview and presents explicit keep/groove/tone choices in the current chat.
- Pending previews claim automatic playback once; accepted, revised and superseded
  recordings do not auto-play after remount. Manual playback remains available.
- New chats offer reference-track and original-idea routes. The model is instructed
  to guide reference intent, estimated stems, consented listening, timing and an
  original sound template one question at a time, preserving supplied preferences.
- Discussion requests offer only read-only tools and enforce the same restriction
  in execution. Approval itself is not a playback, effects or next-part command.
- New refinement captures link their preceding recording and explicitly identify
  the updated preview. Earlier audio and decisions are not overwritten.
- Existing user recordings, review decisions and Ableton music were not altered
  for verification. No historical revision relationships were guessed/backfilled.

## Evidence

- 200 backend tests and eight frontend test files passed.
- Eight focused discussion/review tests passed inside the exact non-root Linux
  image with networking disabled. Production build and TypeScript passed.
- Desktop 1440px/mobile 390px fixtures passed both locally and on deployed assets:
  preview once, acceptance pauses without chat, silent remount/reload, explicit
  discussion-only next choice and reference/idea routing. Fixture APIs were mocked.
- Two bounded real Bedrock onboarding probes asked a question without tool calls.
- A real authenticated production frontend test selected the reference route,
  then started an original idea. The response asked one style/mood question,
  returned zero tool actions and produced no browser errors. The bridge reconnected.

## Findings and limits

Read-only investigation found the reported later kick preview followed an explicit
effects choice, not an unsolicited capture immediately on acceptance. Its UI did
not clearly identify the revision. The historical log also showed normalized Drive
0.08 reading back as -30 dB; successful parameter readback does not validate the
intended musical treatment. No live effect correction was performed in this release.
The updated prompt prefers mapped musical units and avoids default bundled FX, but
an execution-level musical-intent/unit validation improvement remains outstanding.

Existing historical screens may still lack a saved follow-up question or revision
link. This release does not retroactively invent those decisions. Full new-song
creation, musical quality, exact stems and Arrangement/export are not certified by
these tests. See the earlier production receipt for reference/audio smoke results.
