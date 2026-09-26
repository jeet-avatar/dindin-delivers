# Reference Listening and Template Test Results

Local verification: September 25, 2026 (Pacific time).

## Real Provider Tests

Reference: Night Breeze (Original Mix), Erdi Irmak; duration 180.044 seconds.

- Whole-track listening completed seven consecutive intervals, with 100% coverage.
- Every interval returned the required rhythm, bass, texture, changes and uncertainty fields.
- Earlier timestamp-only results do not count toward coverage.
- The closing interval measured a 51.09 dB RMS decrease between its first and final three seconds. The new response correctly labeled this interval falling and described the reduction toward silence.
- Every successful interval remains in the authenticated reference history. Reference chat receives bounded observations from the history rather than just the last result.

The model was given local energy evidence, so the improved fade description is an evidence-guided result, not an independent listening accuracy benchmark. Other timbral claims still require human review.

## Real Template Proposal

A test-account brief requested spacious deep minimal at 124 BPM, using Peak Bites, with no vocals, bright leads or long kick reverb.

The actual text-model response proposed Kick, Bass, Textural Atmosphere, Percussive Details and Ambient Fragments, over 88 bars: Intro 16, Build 8, Main 32, Breakdown 16 and Outro 16. These were proposals, not discovered sources. Explicit tempo, exclusions and source constraints were preserved.

The first attempt used the audio model for a text-only planning request and was rejected by the provider. Planning now uses the separately configurable text model with strict structured output; the subsequent live proposal succeeded. Existing Bedrock production chat was not migrated.

Browser tests passed draft generation, manual revision, approval, reload persistence, blocking stale approval after edits, and desktop/mobile layouts at 1280px and 390px. No Ableton writes occurred.

## Automated Checks

- 149 backend tests passed (including timing and review regression coverage).
- Five existing frontend regression tests passed.
- Type checking and production frontend build passed.
- New coverage includes malformed observations, energy contradictions, ownership/consent, coverage union, interrupted-job recovery, explicit resume, preference preservation, template validation and revision approval.

## Remaining Boundaries

- Checked output is not proof of perfect musical interpretation or user satisfaction.
- Template approval approves a blueprint, not sounds or effects. Actual source discovery, parameter mapping, clip creation and audition still run through the existing one-part production workflow.
- This local test backend has no production-chat model or Ableton bridge attached. Live Ableton construction from the new template has not been end-to-end verified.
- Session sections are not a written Arrangement timeline or a saved `.als` template.
- Not deployed to production. Persistent storage, single-worker operation and replacement of the exposed test key are deployment requirements.

## Confirmed Timing Workflow

- Refreshed the existing 180.044126984127-second reference without rerunning separation. All four stems passed frame-count, sample-rate, channel and finite-signal checks. This does not prove clean separation.
- Five contiguous structural intervals were estimated. Intro/Build/Main/Breakdown/Outro names were assigned by the QA script, not inferred or approved by the real user.
- A real model request produced original sound descriptions and optional effects. Server-enforced section names and timestamps exactly matched the QA-confirmed timing map, including the ending.
- Playwright played the real mix and all four stems; each player advanced and reported the full reference duration. This establishes browser playback, not audible output at the user's speakers or subjective approval.
- Browser review, cueing, draft approval, ZIP download, unsaved-edit blocking, tab-state retention and 1280px/390px overflow checks passed without React runtime errors.
- MIDI round-trip tests preserve duration within one millisecond, including non-Latin section names. The downloaded package contains a MIDI timing guide and JSON blueprint, not instruments, original musical notes, effects or an Ableton Live Set.
- Changing included stems or re-confirming timing invalidates existing template approval. Missing/failed stem checks, gaps, overlaps, incomplete coverage and stale revisions are rejected.

## Production Capacity

On September 25, 2026, the existing API was resized from 0.25 vCPU / 512 MiB to 2 vCPU / 8192 MiB (ECS task definition `beatmind-api:19`). Only task CPU and memory changed; image, credentials, volumes and networking were unchanged. The running task and load balancer were healthy and the public health endpoint returned `status: ok`. The health response reported zero connected bridges.

This was a capacity-only rollout. The new reference workflow and exposed test key were not deployed. Stem-separation throughput and peak RAM on Fargate still need load testing with an ML-enabled image before the feature is enabled.
